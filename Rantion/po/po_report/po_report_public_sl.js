/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['../../Helper/config.js', 'SuiteScripts/douples_amazon/Helper/handlebars-v4.1.1', '../../Helper/Moment.min.js', 'N/file', 'N/encode', 'N/search', 'N/record', 'N/format', 'N/runtime'],
function(config, Handlebars, moment, file, encode, search, record, format, runtime) {

    function onRequest(context) {
        var request = context.request;
        var params = request.parameters;
        var response = context.response;
        var action = params.action;
        var po_id = params.id;
        try {
            printExcel(po_id, action, response);
        } catch (error) {
            log.debug('printExcelError', JSON.stringify(error));
        }
    }

    /**
     * 导出输出数据
     * @param {*} po_id 
     * @param {*} action 
     * @param {*} response 
     */
    function printExcel(po_id, action, response) {
        var resultExcel = {};
        var items = [];
        var i_no = 1;
        var sku_quantity = 0;
        var sku_amount = 0;
        var po_date;
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'internalid', operator: 'anyof', values: po_id },
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false }
            ],
            columns: [ 'tranid', 'rate', 'quantity', 'amount', 'trandate', 'subsidiary',
                { name: 'internalid', join: 'vendor' },
                { name: 'custentity_vendor_code', join: 'vendor' },
                { name: 'entityid', join: 'vendor' },
                { name: 'companyname', join: 'vendor' },
                { name: 'custentityaddress', join: 'vendor' },
                { name: 'custentity_dps_collectionaccountpublic', join: 'vendor' },
                { name: 'custentity_dps_accountnamepublic', join: 'vendor' },
                { name: 'custentity_dps_receivingbankpublic', join: 'vendor' },
                { name: 'custentity_dps_collectionaccountprivate', join: 'vendor' },
                { name: 'custentity_dps_accountnameprivate', join: 'vendor' },
                { name: 'custentity_dps_receivingbankprivate', join: 'vendor' },
                { name: 'custentity1', join: 'vendor' },
                { name: 'itemid', join: 'item' },
                { name: 'custitem_dps_declaration_cn', join: 'item' },
                { name: 'custitem_dps_unit', join: 'item' },
                { name: 'custitem_dps_skuchiense', join: 'item' },
                { name: 'custitem_dps_deliverydate', join: 'item' }
            ]
        }).run().each(function (result) {
            if (i_no == 1) {
                var purchaseorder_record = record.load({ type: 'purchaseorder', id: po_id });
                var employee_id = purchaseorder_record.getValue('employee');
                if (employee_id) {
                    search.create({
                        type: 'employee',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: employee_id }
                        ],
                        columns: [ 'entityid', 'phone' ]
                    }).run().each(function (result) {
                        resultExcel.PURCHASE_PHONE = result.getValue('phone');
                        resultExcel.PURCHASE_NAME = result.getValue('entityid');
                        return false;
                    });
                }
                var subsidiary_name = result.getText('subsidiary');
                var names = subsidiary_name.split(':');
                resultExcel.PO_SUBSIDIARY_NAME = names[names.length - 1].trim();
                resultExcel.SUPPLIER_CODE = result.getValue({ name: 'custentity_vendor_code', join: 'vendor'});
                resultExcel.PO_CODE = result.getValue('tranid');
                resultExcel.SUPPLIER_NAME = result.getValue({ name: 'companyname', join: 'vendor' });
                resultExcel.SUPPLIER_FILE_NAME = result.getValue({ name: 'entityid', join: 'vendor'});
                resultExcel.SUPPLIER_ADDR = result.getValue({ name: 'custentityaddress', join: 'vendor'});
                resultExcel.SUPPLIER_PAY_TYPE = result.getText({ name: 'custentity1', join: 'vendor' });
               
                var vendor_id = result.getValue({ name: 'internalid', join: 'vendor' });
                if (vendor_id) {
                    search.create({
                        type: 'vendor',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: vendor_id }
                        ],
                        columns: [
                            { name: 'entityid', join: 'contact' },
                            { name: 'phone', join: 'contact' }
                        ]
                    }).run().each(function (result) {
                        resultExcel.SUPPLIER_CONTACT = result.getValue({ name: 'entityid', join: 'contact' });
                        resultExcel.SUPPLIER_PHONE = result.getValue({ name: 'phone', join: 'contact' });
                        return false;
                    });
                }
                if (action == 'public') {
                    resultExcel.VENDOR_USERNAME = result.getValue({ name: 'custentity_dps_collectionaccountpublic', join: 'vendor' });
                    resultExcel.VENDOR_NAME = result.getValue({ name: 'custentity_dps_accountnamepublic', join: 'vendor' });
                    resultExcel.VENDOR_BANK = result.getValue({ name: 'custentity_dps_receivingbankpublic', join: 'vendor' });
                }
                if (action == 'private') {
                    resultExcel.VENDOR_USERNAME = result.getValue({ name: 'custentity_dps_collectionaccountprivate', join: 'vendor' });
                    resultExcel.VENDOR_NAME = result.getValue({ name: 'custentity_dps_accountnameprivate', join: 'vendor' });
                    resultExcel.VENDOR_BANK = result.getValue({ name: 'custentity_dps_receivingbankprivate', join: 'vendor' });
                }
                po_date = result.getValue('trandate');
                resultExcel.PO_DATE = po_date;
                resultExcel.items = [];
            }
            var itemjson = {};
            itemjson.P_NUMBER = i_no;
            itemjson.P_SELLER_SKU = result.getValue({ name: 'itemid', join: 'item' });
            itemjson.P_PRODUCT_NAME = result.getValue({ name: 'custitem_dps_skuchiense', join: 'item' });
            var p_p_price = Number(result.getValue('rate'));
            if (action == 'public') {
                itemjson.P_PRODUCT_PRICE = Number((p_p_price * 113) / 100).toFixed(2);
            }
            if (action == 'private') {
                itemjson.P_PRODUCT_PRICE = Number(p_p_price).toFixed(2);
            }
            itemjson.P_ORDER_QUANTITY = result.getValue('quantity');
            sku_quantity = sku_quantity + Number(result.getValue('quantity'));
            // itemjson.P_PRODUCT_MONEY = result.getValue('amount');
            itemjson.P_PRODUCT_MONEY = Number(itemjson.P_PRODUCT_PRICE) * Number(itemjson.P_ORDER_QUANTITY);
            sku_amount = sku_amount + Number(itemjson.P_PRODUCT_MONEY);
            var po_date_str = moment(format.parse({ value: po_date, type: format.Type.DATE })).format('YYYY/MM/DD');
            var po_date_time = new Date(po_date_str).getTime();
            var sku_delivery_days = Number(result.getValue({ name: 'custitem_dps_deliverydate', join: 'item' }));
            po_date_time = +po_date_time + 1000 * 60 * 60 * 24 * sku_delivery_days;
            itemjson.P_DELIVERY_DATE = moment(po_date_time).format(dateFormat);;
            itemjson.P_INVOICE_NAME = result.getValue({ name: 'custitem_dps_declaration_cn', join: 'item' });
            itemjson.P_INVOICE_UNIT = result.getText({ name: 'custitem_dps_unit', join: 'item' });
            items.push(itemjson);
            i_no++;
            return true;
        });
        resultExcel.P_TOTAL_QUANTITY = sku_quantity;
        resultExcel.P_TOTAL_MONEY = sku_amount.toFixed(2);
        resultExcel.items = items;

        // 输出
        var file_id;
        var file_name = resultExcel.SUPPLIER_FILE_NAME + '-' + resultExcel.PO_CODE + '.xls';
        if (action == 'public') {
            file_id = config.po_report_public_file_id;
        }
        if (action == 'private') {
            file_id = config.po_report_private_file_id;
        }
        writeExcel(file_id, resultExcel, file_name, response);
    }

    /**
     * 加载、赋值、转码、输出
     * @param {*} file_id 
     * @param {*} result 
     * @param {*} file_name 
     * @param {*} response 
     */
    function writeExcel(file_id, result, file_name, response) {
        var model = file.load({
            id: file_id
        }).getContents();
        var template = Handlebars.compile(model);
        var xml = template(result);
        var excelFile = file.create({
            name: file_name,
            fileType: file.Type.EXCEL,
            contents: encode.convert({
                string: xml,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            }),
            encoding: file.Encoding.UTF8,
            isOnline: true
        });
        response.writeFile({
            file: excelFile,
            isInline: true
        });
    }

    return {
        onRequest: onRequest
    }
});
