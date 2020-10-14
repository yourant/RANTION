/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/log'], function (search, ui, log) {

    function onRequest(context) {
        try{
            var response = context.response;
            var request = context.request;
            var method = request.method;
            var params = request.parameters; //参数
            log.debug('method', method);
            if (method == 'GET') {
                //首次进入工作台渲染
                var form = initUI(); //渲染查询条件UI界面
                var rsJson = getSearchData()
                var retData = rsJson.result;
                setDataFromResult(form, retData);
                response.writePage(form);
            } else {
                //查询
                showResult(params, response);
            }
        }catch(e){
            log.debug('e',e);
        }
        
    }

    function initUI() {
        var form = ui.createForm({
            title: 'Amazon接收差异对比表'
        });

        // form.addSubmitButton({ label: '查 询', });
        
        // form.addFieldGroup({ id: 'custpage_filter', label: '查询条件' });
        // form.addField({id : 'custpage_shipment_id', type : ui.FieldType.TEXT,label : 'ShipmentID', container : 'custpage_filter'});
        // form.addField({id : 'custpage_seller_sku', type : ui.FieldType.TEXT,label : 'SellerSKU', container : 'custpage_filter'});
        // initPageChoose(form);

        var sub = form.addSublist({ id: 'custpage_line', type: ui.SublistType.LIST, label: '差异信息' });
        // sub.addMarkAllButtons();
        // sub.addField({ id: 'store_line_checkbox', type: ui.FieldType.CHECKBOX, label: '勾选框' });
        sub.addField({ id: 'store_linenum', type: ui.FieldType.TEXT, label: '序号' });
        sub.addField({ id: 'store_line_billnum', type: ui.FieldType.SELECT, label: '调拨单号', source:'transaction' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        // sub.addField({ id: 'store_line_billnum_name', type: ui.FieldType.TEXT, label: '调拨单号' }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sub.addField({ id: 'store_line_store', type: ui.FieldType.SELECT, label: '店铺', source:'customrecord_aio_account' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_shipment_id', type: ui.FieldType.TEXT, label: 'shipmentID' });
        sub.addField({ id: 'store_line_sku', type: ui.FieldType.SELECT, label: 'SKU', source:'item' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        // sub.addField({ id: 'store_line_sku_name', type: ui.FieldType.TEXT, label: 'SKU名称' }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sub.addField({ id: 'store_line_msku', type: ui.FieldType.TEXT, label: 'MSKU' });
        sub.addField({ id: 'store_line_fnsku', type: ui.FieldType.TEXT, label: 'FNSKU' });
        sub.addField({ id: 'store_line_delivery_volume', type: ui.FieldType.INTEGER, label: '出库量' });
        sub.addField({ id: 'store_line_date', type: ui.FieldType.DATE, label: '出库时间' });
        sub.addField({ id: 'store_line_quantity_received', type: ui.FieldType.INTEGER, label: 'AMZ接收数量' });
        sub.addField({ id: 'store_line_start_date', type: ui.FieldType.TEXT, label: '开始接收时间' });
        sub.addField({ id: 'store_line_update_date', type: ui.FieldType.TEXT, label: '更新接收时间' });
        sub.addField({ id: 'store_line_difference_qua', type: ui.FieldType.INTEGER, label: '差异数量' });
        sub.addField({ id: 'store_line_status', type: ui.FieldType.TEXT, label: '状态' });
        // form.clientScriptModulePath = './fba_received_inventory_cs.js';
        return form;
    } 
    

    function showResult(params, response) {
        var filters = {
            "shipment_id": params.custpage_shipment_id,
            "seller_sku": params.custpage_seller_sku
        }
        var form = initUI(); //渲染查询条件UI界面
        var rsJson = getSearchData(filters);
        var retData = rsJson.result;
        form.updateDefaultValues({
            custpage_seller_sku: filters.seller_sku,
            custpage_shipment_id: filters.shipment_id
        });
        setDataFromResult(form, retData); //渲染查询结果至页面
        response.writePage(form);
    }

    function setDataFromResult(form, retData) {
        var line = form.getSublist({ id: 'custpage_line' });
        var l = 0;
        retData.map(function (data) {
            line.setSublistValue({ id: 'store_linenum', value: Number(l + 1).toFixed(0), line: l });
            data.billid ? line.setSublistValue({ id: 'store_line_billnum', value: data.billid, line: l }) : '';
            data.store ? line.setSublistValue({ id: 'store_line_store', value: data.store, line: l }) : '';
            data.shipment_id ? line.setSublistValue({ id: 'store_line_shipment_id', value: data.shipment_id, line: l }) : '';
            data.sku ? line.setSublistValue({ id: 'store_line_sku', value: data.sku, line: l }) : '';
            data.msku ? line.setSublistValue({ id: 'store_line_msku', value: data.msku, line: l }) : '';
            data.fnsku ? line.setSublistValue({ id: 'store_line_fnsku', value: data.fnsku, line: l }) : '';
            data.delivery_volume ? line.setSublistValue({ id: 'store_line_delivery_volume', value: data.delivery_volume, line: l }) : '';
            data.date ? line.setSublistValue({ id: 'store_line_date', value: data.date, line: l }) : '';
            data.quantity_received ? line.setSublistValue({ id: 'store_line_quantity_received', value: data.quantity_received, line: l }) : '';
            data.start_date ? line.setSublistValue({ id: 'store_line_start_date', value: data.start_date, line: l }) : '';
            data.update_date ? line.setSublistValue({ id: 'store_line_update_date', value: data.update_date, line: l }) : '';
            data.difference_qua ? line.setSublistValue({ id: 'store_line_difference_qua', value: data.difference_qua, line: l }) : ''; 
            data.status ? line.setSublistValue({ id: 'store_line_status', value: data.status, line: l }) : '';
            l++;
        });
    }

    function getSearchData(filter) {
        var rsJson = {};
        var DateFromSO = [];
        var filters = [], limit = 4000;
        if(filter){
            filter.seller_sku ? filters.push({ name: 'custrecord_dps_fba_received_inven_sku', operator: search.Operator.IS, values: filter.seller_sku }) : '';
            filter.shipment_id ? filters.push({ name: 'custrecord_dps_fba_received_shipment_id', operator: search.Operator.IS, values: filter.shipment_id }) : '';
        }
        filters.push({ name: 'custrecord_dps_fba_received_iscreate', operator: search.Operator.IS, values: false })
        var mySearch = search.create({
            type: "customrecord_dps_fba_received_inventory",
            filters: filters,
            columns: [
                { name: 'custrecord_dps_fba_received_shipment_id', summary: 'GROUP'},
                { name: 'custrecord_dps_fba_received_inve_account', summary: 'GROUP'},
                { name: 'custrecord_dps_fba_received_inven_sku', summary: 'GROUP'},
                { name: 'custrecord_dps_fba_received_inv_quantity', summary: 'SUM'},
                { name: 'custrecord_dps_fba_received_receiveddate', summary: 'MIN'}
            ]
        });
        var pageData = mySearch.runPaged({
            pageSize: 1000
        });
        log.debug('pageData', pageData);
        var totalCount = pageData.count; //总数
        var pageCount = pageData.pageRanges.length; //页数
        log.debug('totalCount', totalCount);
        log.debug('pageCount', pageCount);
        if (totalCount == 0 && pageCount == 0) {
            rsJson.result = DateFromSO;
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
            return rsJson;
        } else {
            for(var i = 0; i < pageCount; i++){
                pageData.fetch({
                    index: i
                }).data.forEach(function (e) {
                    var sku_id, sku_name, fnsku;
                    search.create({
                        type: 'customrecord_aio_amazon_seller_sku',
                        filters: [
                            { name: 'custrecord_ass_account', operator: 'is', values: e.getValue(e.columns[1]) },
                            { name: 'name', operator: 'is', values: e.getValue(e.columns[2]) },
                        ],
                        columns: [
                            'custrecord_ass_sku',
                            'custrecord_ass_fnsku'
                        ]
                    }).run().each(function (rec) {
                        sku_id = rec.getValue(rec.columns[0]);
                        sku_name = rec.getText(rec.columns[0]);
                        fnsku = rec.getValue(rec.columns[1]);
                        return false;
                    });
                    
                    var filters1 = [];
                    filters1.push({ name: 'item', operator: search.Operator.IS, values: sku_id });
                    filters1.push({ name: 'custbody_shipment_id', operator: search.Operator.IS, values: e.getValue(e.columns[0]) });
                    filters1.push({ name: 'mainline', operator: search.Operator.IS, values: false });
                    filters1.push({ name: 'type', operator: search.Operator.ANYOF, values: ["TrnfrOrd"] });
                    filters1.push({ name: 'transferlocation', operator: search.Operator.ANYOF, values: ['2506', '2504', '2505'] });
                    filters1.push({ name: 'location', operator: search.Operator.NONEOF, values: ['2506', '2504', '2505'] });
                    search.create({
                        type: "transferorder",
                        filters: filters1,
                        columns: [
                            { name: 'custbody_order_locaiton'},
                            { name: 'custbody_shipment_id'},
                            { name: 'item'},
                            { name: 'transferorderquantityshipped'},
                            { name: 'trandate'}
                        ]
                    }).run().each(function (rec) {
                        var diff_qua = parseInt(Number(e.getValue(e.columns[3])) - Number(rec.getValue(rec.columns[3]))).toFixed(0);
                        if(diff_qua != 0){
                            DateFromSO.push({
                                billid: rec.id,
                                store: rec.getValue(rec.columns[0]),
                                shipment_id: rec.getValue(rec.columns[1]),
                                sku: rec.getValue(rec.columns[2]),
                                msku: e.getValue(e.columns[2]),
                                fnsku: fnsku,
                                delivery_volume: rec.getValue(rec.columns[3]),
                                date: rec.getValue(rec.columns[4]),
                                quantity_received: e.getValue(e.columns[3]),
                                start_date: e.getValue(e.columns[4]),
                                update_date: e.getValue(e.columns[4]),
                                difference_qua: diff_qua,
                                status: 'received'
                            })
                        }
                        return false;
                    });
                });
            }
            
            log.debug('DateFromSO',DateFromSO);
            log.debug('DateFromSO.length',DateFromSO.length);
            rsJson.result = DateFromSO;
            rsJson.totalCount = DateFromSO.length;
            rsJson.pageCount = pageCount;
            return rsJson;
        }
    }

    function initPageChoose(form, hidePageSelect) {
        form.addFieldGroup({ id: 'custpage_page_group', label: '数据选择' });
        if (hidePageSelect != 'Y') {
            form.addField({ id: 'custpage_select_page', type: ui.FieldType.SELECT, label: '数据选择', container: 'custpage_page_group' });
        }
        form.addField({ id: 'custpage_total_count', type: ui.FieldType.TEXT, label: '总行数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
        form.addField({ id: 'custpage_total_page', type: ui.FieldType.INTEGER, label: '总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
        form.addField({ id: 'custpage_page_size', type: ui.FieldType.SELECT, label: '每页条数', container: 'custpage_page_group' }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
        form.addField({ id: 'custpage_now_page', type: ui.FieldType.INTEGER, label: '当前页', container: 'custpage_page_group' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
        form.addField({ id: 'custpage_now_total_page', type: ui.FieldType.TEXT, label: '当前页/总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 10, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
    }

    // function setPageInfo(form, nowPage, totalCount, pageCount, pageSize, hidePageSelect) {
    //     form.getField({ id: 'custpage_total_page' }).defaultValue = pageCount;
    //     form.getField({ id: 'custpage_now_page' }).defaultValue = nowPage;
    //     form.getField({ id: 'custpage_now_total_page' }).defaultValue = (nowPage == 0 ? 1 : nowPage) + '/' + pageCount;
    //     form.getField({ id: 'custpage_total_count' }).defaultValue = totalCount;
    //     if (hidePageSelect != 'Y') {
    //         var selectPageField = form.getField({ id: 'custpage_select_page' })
    //         for (var i = 1; i <= pageCount; i++) {
    //             var selectedFlag;
    //             var startStr = (i - 1) * pageSize + 1;
    //             var endStr = i == pageCount ? totalCount : (i - 1) * pageSize + Number(pageSize);
    //             if (nowPage == i) {
    //                 selectedFlag = true;
    //             } else {
    //                 selectedFlag = false;
    //             }
    //             selectPageField.addSelectOption({
    //                 value: i,
    //                 text: startStr + '-' + endStr + '行',
    //                 isSelected: selectedFlag
    //             });
    //         }
    //     }

    //     var pageSizeField = form.getField({ id: 'custpage_page_size' });
    //     pageSizeField.addSelectOption({ value: 5, text: 5, isSelected: pageSize == 5 ? true : false });
    //     pageSizeField.addSelectOption({ value: 10, text: 10, isSelected: pageSize == 10 ? true : false });
    //     pageSizeField.addSelectOption({ value: 15, text: 15, isSelected: pageSize == 15 ? true : false });
    //     pageSizeField.addSelectOption({ value: 20, text: 20, isSelected: pageSize == 20 ? true : false });
    //     pageSizeField.addSelectOption({ value: 25, text: 25, isSelected: pageSize == 25 ? true : false });
    // }

    return {
        onRequest: onRequest
    }
});
