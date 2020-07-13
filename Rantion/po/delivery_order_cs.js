/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/ui/dialog', 'N/record', 'N/search', 'N/url', '../Helper/config.js', 'N/http'],
    function (currentRecord, https, dialog, record, search, url, config, http) {

        function pageInit(context) {

        }

        function saveRecord(context) {
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {

        }

        function postSourcing(context) {

        }

        function lineInit(context) {

        }

        function validateDelete(context) {
            return true;
        }

        function validateInsert(context) {
            return true;
        }

        function validateLine(context) {
            return true;
        }

        function sublistChanged(context) {

        }

        function getDelivery(deliveryId) {
            log.audit('deliveryId', deliveryId);
            var filters = [];
            filters.push({ name: 'internalid', operator: 'anyof', values: deliveryId });
            var rs;
            search.create({
                type: 'customrecord_dps_delivery_order',
                filters: filters,
                columns: [
                    'name'//交货单号
                    , { name: 'companyname', join: 'custrecord_supplier' }//供应商名称
                    , 'custrecord_delivery_date'//送货日期
                    , { name: 'custrecord_aio_sender_address', join: 'custrecord_dsp_delivery_order_location' }//收货地址
                    , { name: 'custrecord_aio_contact_information', join: 'custrecord_dsp_delivery_order_location' }//收货联系方式
                    , { name: 'custrecord_aio_sender_name', join: 'custrecord_dsp_delivery_order_location' }//收货姓名
                    , { name: 'custentityaddress', join: 'custrecord_supplier' }//供应商地址
                    , { name: 'tranid', join: 'custrecord_purchase_order_no' } //PO
                    , { name: 'subsidiary', join: 'custrecord_purchase_order_no' } //subsidiary
                ]
            }).run().each(function (result) {

                var item = [];
                rs = {
                    deliveryNo: result.getValue('name'),
                    supplierName: result.getValue({ name: 'companyname', join: 'custrecord_supplier' }),
                    deliveryDate: result.getValue('custrecord_delivery_date'),
                    deliveryAddress: result.getValue({ name: 'custrecord_aio_sender_address', join: 'custrecord_dsp_delivery_order_location' }),
                    deliveryAddressInformation: result.getValue({ name: 'custrecord_aio_contact_information', join: 'custrecord_dsp_delivery_order_location' }),
                    deliveryRecipient: result.getValue({ name: 'custrecord_aio_sender_name', join: 'custrecord_dsp_delivery_order_location' }),
                    supplierAddress: result.getValue({ name: 'custentityaddress', join: 'custrecord_supplier' }),
                    pono: result.getValue({ name: 'tranid', join: 'custrecord_purchase_order_no' }),
                    tradeCompany: result.getText({ name: 'subsidiary', join: 'custrecord_purchase_order_no' }),
                    data: item
                }
                search.create({
                    type: 'customrecord_dps_delivery_order_item',
                    filters: { name: 'custrecord_dps_delivery_order_id', operator: 'anyof', values: deliveryId },
                    columns: [
                        { name: 'itemid', join: 'custrecord_item_sku' }//sku
                        , 'custrecord_item_name'
                        , 'custrecord_item_quantity'
                        , 'custrecord_line_packing_quantity'
                        , 'custrecord_line_boxes_number'
                        , 'custrecord_ddoi_long'
                        , 'custrecord_ddoi_width'
                        , 'custrecord_ddoi_high'
                        , 'custrecord_ddoi_single_box_volume'
                        , 'custrecord_ddoi_dps_total_volume'
                    ]
                }).run().each(function (result) {
                    var size = result.getValue('custrecord_ddoi_long') + ' * ' + result.getValue('custrecord_ddoi_width') + ' * ' + result.getValue('custrecord_ddoi_high');
                    item.push({
                        pono: rs.pono,
                        sku: result.getValue({ name: 'itemid', join: 'custrecord_item_sku' }),
                        productName: result.getValue('custrecord_item_name'),
                        qty: result.getValue('custrecord_item_quantity'),
                        boxSumQty: result.getValue('custrecord_line_packing_quantity'),
                        boxQty: result.getValue('custrecord_line_boxes_number'),
                        size: size,
                        custrecord_ddoi_long: result.getValue('custrecord_ddoi_long'),
                        custrecord_ddoi_width: result.getValue('custrecord_ddoi_width'),
                        custrecord_ddoi_high: result.getValue('custrecord_ddoi_high'),
                        boxVolume: result.getValue('custrecord_ddoi_single_box_volume'),
                        sumVolume: result.getValue('custrecord_ddoi_dps_total_volume')
                    })
                    return true;
                });
            });
            return rs;
        }

        function reportDelivery(deliveryId) {
            var body = getDelivery(deliveryId);
            var id = (new Date()).valueOf();
            sendRequest(id, body);
            window.open(config.WMS_Debugging_URL + '/common/export/getDeliveryNoteExcel/' + id);
        }

        /**
     * 获取token
     */
        function getToken() {
            var token;
            search.create({
                type: 'customrecord_wms_token',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: 1
                }],
                columns: ['custrecord_wtr_token']
            }).run().each(function (result) {
                token = result.getValue('custrecord_wtr_token');
            });
            return token;
        }

        /**
         * 发送请求
         * @param {*} token 
         * @param {*} data 
         */
        function sendRequest(id, data) {
            var message = {};
            var code = 0;
            var body;
            var headerInfo = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'access_token': getToken()
            };
            var response = http.post({
                url: config.WMS_Debugging_URL + '/common/setDeliveryBodyByRedis/' + id,
                headers: headerInfo,
                body: JSON.stringify(data)
            });
            log.audit('response', JSON.stringify(response) + '*' + JSON.stringify(data));
            if (response.code == 200) {
                retdata = JSON.parse(response.body);
            } else {
                retdata = '请求被拒'
            }
            if (response.code == 200) {
                // 调用成功
            } else {
                code = 1;
                // 调用失败
            }
            message.code = code;
            message.data = retdata;
            return message;
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,
            validateField: validateField,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            lineInit: lineInit,
            validateDelete: validateDelete,
            validateInsert: validateInsert,
            validateLine: validateLine,
            sublistChanged: sublistChanged,
            reportDelivery: reportDelivery
        }
    });