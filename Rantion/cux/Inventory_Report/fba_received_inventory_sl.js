/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/log'], function (search, ui, log) {

    function onRequest(context) {
        var response = context.response;
        var request = context.request;
        var method = request.method;
        var params = request.parameters; //参数
        log.debug('method', method);
        if (method == 'GET') {
            //首次进入工作台渲染
            var form = initUI(); //渲染查询条件UI界面
            var nowPage = params.custpage_now_page ? params.custpage_now_page : 1;
            var pageSize = params.custpage_page_size ? params.custpage_page_size : 5; // 每页数量
            var rsJson = getSearchData(nowPage, pageSize)
            var retData = rsJson.result;
            var totalCount = rsJson.totalCount;
            var pageCount = rsJson.pageCount;
            setDataFromResult(form, retData);

            // 设置数据选择列表、当前页、总页数到界面
            setPageInfo(form, nowPage, totalCount, pageCount, pageSize, retData);
            response.writePage(form);
        } else {
            //查询
            showResult(params, response);
        }
    }

    function initUI() {
        var form = ui.createForm({
            title: 'Amazon&NS调拨入库差异表'
        });

        form.addSubmitButton({ label: '查 询', });
        form.addButton({
            id: 'button_create',
            label: '生成库存调整',
            functionName: 'CreateInventoryAdjustment'
        });
        
        form.addFieldGroup({ id: 'custpage_filter', label: '查询条件' });
        form.addField({id : 'custpage_shipment_id', type : ui.FieldType.TEXT,label : 'ShipmentID', container : 'custpage_filter'});
        form.addField({id : 'custpage_seller_sku', type : ui.FieldType.TEXT,label : 'SellerSKU', container : 'custpage_filter'});
        initPageChoose(form);

        var sub = form.addSublist({ id: 'custpage_line', type: ui.SublistType.LIST, label: '差异信息' });
        sub.addMarkAllButtons();
        sub.addField({ id: 'store_line_checkbox', type: ui.FieldType.CHECKBOX, label: '勾选框' });
        sub.addField({ id: 'store_linenum', type: ui.FieldType.TEXT, label: '序号' });
        sub.addField({ id: 'store_line_billnum', type: ui.FieldType.SELECT, label: '调拨单号', source:'transaction' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_billnum_name', type: ui.FieldType.TEXT, label: '调拨单号' }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sub.addField({ id: 'store_line_shipment_id', type: ui.FieldType.TEXT, label: 'shipmentID' });
        sub.addField({ id: 'store_line_warehouse', type: ui.FieldType.SELECT, label: '仓库', source:'location' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_store', type: ui.FieldType.SELECT, label: '店铺', source:'customrecord_aio_account' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_date', type: ui.FieldType.DATE, label: '调拨日期' });
        sub.addField({ id: 'store_line_sku', type: ui.FieldType.SELECT, label: 'SKU', source:'item' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_sku_name', type: ui.FieldType.TEXT, label: 'SKU名称' }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sub.addField({ id: 'store_line_seller_sku', type: ui.FieldType.TEXT, label: 'SellerSKU' }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sub.addField({ id: 'store_line_brand', type: ui.FieldType.SELECT, label: '品牌', source:'customlist_dps_brandbrand' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_department', type: ui.FieldType.SELECT, label: '部门', source:'department' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_class', type: ui.FieldType.SELECT, label: '品类', source:'classification' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sub.addField({ id: 'store_line_amazon_total', type: ui.FieldType.INTEGER, label: 'Amazon总入库量' });
        sub.addField({ id: 'store_line_ns_total', type: ui.FieldType.INTEGER, label: 'NS总入库量' });
        sub.addField({ id: 'store_line_difference_qua', type: ui.FieldType.INTEGER, label: '入库差异数量' });
        sub.addField({ id: 'store_line_original_cost', type: ui.FieldType.FLOAT, label: '入库差异集团成本' });
        sub.addField({ id: 'store_line_lastpurchaseprice', type: ui.FieldType.FLOAT, label: '入库差异单体成本' });

        form.clientScriptModulePath = './fba_received_inventory_cs.js';
        return form;
    } 
    

    function showResult(params, response) {
        var nowPage = params.custpage_now_page ? params.custpage_now_page : 1;
        var pageSize = params.custpage_page_size ? params.custpage_page_size : 5; // 每页数量
        var filters = {
            "shipment_id": params.custpage_shipment_id,
            "seller_sku": params.custpage_seller_sku
        }
        var form = initUI(); //渲染查询条件UI界面
        var rsJson = getSearchData(nowPage, pageSize, filters);
        var retData = rsJson.result;
        var totalCount = rsJson.totalCount;
        var pageCount = rsJson.pageCount;
        form.updateDefaultValues({
            custpage_seller_sku: filters.seller_sku,
            custpage_shipment_id: filters.shipment_id
        });
        setDataFromResult(form, retData); //渲染查询结果至页面
        // 设置数据选择列表、当前页、总页数到界面
        setPageInfo(form, nowPage, totalCount, pageCount, pageSize, retData);
        response.writePage(form);
    }

    function setDataFromResult(form, retData) {
        var line = form.getSublist({ id: 'custpage_line' });
        var l = 0;
        retData.map(function (data) {
            line.setSublistValue({ id: 'store_linenum', value: Number(l + 1).toFixed(0), line: l });
            data.billid ? line.setSublistValue({ id: 'store_line_billnum', value: data.billid, line: l }) : '';
            data.billnum_name ? line.setSublistValue({ id: 'store_line_billnum_name', value: data.billnum_name, line: l }) : '';
            data.shipment_id ? line.setSublistValue({ id: 'store_line_shipment_id', value: data.shipment_id, line: l }) : '';
            data.warehouse ? line.setSublistValue({ id: 'store_line_warehouse', value: data.warehouse, line: l }) : '';
            data.store ? line.setSublistValue({ id: 'store_line_store', value: data.store, line: l }) : '';
            data.date ? line.setSublistValue({ id: 'store_line_date', value: data.date, line: l }) : '';
            data.sku ? line.setSublistValue({ id: 'store_line_sku', value: data.sku, line: l }) : '';
            data.sku_name ? line.setSublistValue({ id: 'store_line_sku_name', value: data.sku_name, line: l }) : '';
            data.seller_sku ? line.setSublistValue({ id: 'store_line_seller_sku', value: data.seller_sku, line: l }) : '';
            data.brand ? line.setSublistValue({ id: 'store_line_brand', value: data.brand, line: l }) : '';
            data.department ? line.setSublistValue({ id: 'store_line_department', value: data.department, line: l }) : '';
            data.class ? line.setSublistValue({ id: 'store_line_class', value: data.class, line: l }) : '';
            data.amazon_total ? line.setSublistValue({ id: 'store_line_amazon_total', value: data.amazon_total, line: l }) : '';
            data.ns_total ? line.setSublistValue({ id: 'store_line_ns_total', value: data.ns_total, line: l }) : '';
            data.difference_qua ? line.setSublistValue({ id: 'store_line_difference_qua', value: data.difference_qua, line: l }) : ''; 
            data.original_cost ? line.setSublistValue({ id: 'store_line_original_cost', value: data.original_cost, line: l }) : '';
            data.lastpurchaseprice ? line.setSublistValue({ id: 'store_line_lastpurchaseprice', value: data.lastpurchaseprice, line: l }) : '';
            l++;
        });
    }

    function getSearchData(nowPage, pageSize, filter) {
        log.debug('nowPage',nowPage );
        log.debug('pageSize',pageSize );
        var rsJson = {};
        var DateFromSO = [];
        var filters = [];
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
                { name: 'custrecord_dps_fba_received_inv_quantity', summary: 'SUM'}
            ]
        });
        var pageData = mySearch.runPaged({
            pageSize: pageSize
        });
        log.debug('pageData', pageData);
        var totalCount = pageData.count; //总数
        var pageCount = pageData.pageRanges.length; //页数

        if (totalCount == 0 && pageCount == 0) {
            rsJson.result = DateFromSO;
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
            return rsJson;
        } else {
            pageData.fetch({
                index: Number(nowPage - 1)
            }).data.forEach(function (e) {
                var sku_id, sku_name;
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: [
                        { name: 'custrecord_ass_account', operator: 'is', values: e.getValue(e.columns[1]) },
                        { name: 'name', operator: 'is', values: e.getValue(e.columns[2]) },
                    ],
                    columns: [
                        'custrecord_ass_sku'
                    ]
                }).run().each(function (rec) {
                    sku_id = rec.getValue(rec.columns[0]);
                    sku_name = rec.getText(rec.columns[0]);
                    return false;
                });
                var filters1 = [];
                filters1.push({ name: 'item', operator: search.Operator.IS, values: sku_id });
                filters1.push({ name: 'custbody_shipment_id', operator: search.Operator.IS, values: e.getValue(e.columns[0]) });
                filters1.push({ name: 'mainline', operator: search.Operator.IS, values: false });
                filters1.push({ name: 'type', operator: search.Operator.ANYOF, values: ["TrnfrOrd"] });
                filters1.push({ name: 'transactionlinetype', operator: search.Operator.ANYOF, values: ["ITEM"] });
                filters1.push({ name: 'name', operator: search.Operator.CONTAINS, join: 'tolocation', values: ["FBA"] });
                search.create({
                    type: "transferorder",
                    filters: filters1,
                    columns: [
                        { name: 'trandate', sortdir: 'ASC'}, //0
                        { name: 'tranid', sortdir: 'ASC'}, //1
                        { name: 'custbody_shipment_id'}, //2
                        { name: 'custbody_order_locaiton'}, //3
                        { name: 'transferlocation'}, //4
                        { name: 'item'}, //5
                        { name: 'transferorderquantityreceived'}, //6
                        { name: 'departmentnohierarchy', join: 'item'}, //7
                        { name: 'class', join: 'item'}, //8
                        { name: 'custitem_dps_brand', join: 'item'}, //9
                        { name: 'custitem_vp_cost_original_cost', join: 'item'}, //10
                        { name: 'lastpurchaseprice', join: 'item'} //11
                    ]
                }).run().each(function (rec) {
                    var diff_qua = parseInt(Number(e.getValue(e.columns[3])) - Number(rec.getValue(rec.columns[6]))).toFixed(0);
                    // if(diff_qua != 0){
                        DateFromSO.push({
                            billid: rec.id,
                            billnum_name: rec.getValue(rec.columns[1]),
                            shipment_id: rec.getValue(rec.columns[2]),
                            warehouse: rec.getValue(rec.columns[4]),
                            store: rec.getValue(rec.columns[3]),
                            date: rec.getValue(rec.columns[0]),
                            sku: sku_id,
                            sku_name: sku_name,
                            seller_sku: e.getValue(e.columns[2]),
                            brand: rec.getValue(rec.columns[9]), 
                            department: rec.getValue(rec.columns[7]),
                            class: rec.getValue(rec.columns[8]),
                            amazon_total: e.getValue(e.columns[3]),
                            ns_total: rec.getValue(rec.columns[6]),
                            difference_qua: diff_qua,
                            original_cost: (diff_qua * rec.getValue(rec.columns[10])).toFixed(7),
                            lastpurchaseprice: (diff_qua * rec.getValue(rec.columns[11])).toFixed(2)
                        })
                    // }
                    return false;
                });
            });
            log.debug('DateFromSO',DateFromSO);
            log.debug('DateFromSO.length',DateFromSO.length);
            rsJson.result = DateFromSO;
            rsJson.totalCount = DateFromSO.length;
            rsJson.pageCount = pageCount;
            return rsJson
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

    function setPageInfo(form, nowPage, totalCount, pageCount, pageSize, hidePageSelect) {
        form.getField({ id: 'custpage_total_page' }).defaultValue = pageCount;
        form.getField({ id: 'custpage_now_page' }).defaultValue = nowPage;
        form.getField({ id: 'custpage_now_total_page' }).defaultValue = (nowPage == 0 ? 1 : nowPage) + '/' + pageCount;
        form.getField({ id: 'custpage_total_count' }).defaultValue = totalCount;
        if (hidePageSelect != 'Y') {
            var selectPageField = form.getField({ id: 'custpage_select_page' })
            for (var i = 1; i <= pageCount; i++) {
                var selectedFlag;
                var startStr = (i - 1) * pageSize + 1;
                var endStr = i == pageCount ? totalCount : (i - 1) * pageSize + Number(pageSize);
                if (nowPage == i) {
                    selectedFlag = true;
                } else {
                    selectedFlag = false;
                }
                selectPageField.addSelectOption({
                    value: i,
                    text: startStr + '-' + endStr + '行',
                    isSelected: selectedFlag
                });
            }
        }

        var pageSizeField = form.getField({ id: 'custpage_page_size' });
        pageSizeField.addSelectOption({ value: 5, text: 5, isSelected: pageSize == 5 ? true : false });
        pageSizeField.addSelectOption({ value: 10, text: 10, isSelected: pageSize == 10 ? true : false });
        pageSizeField.addSelectOption({ value: 15, text: 15, isSelected: pageSize == 15 ? true : false });
        pageSizeField.addSelectOption({ value: 20, text: 20, isSelected: pageSize == 20 ? true : false });
        pageSizeField.addSelectOption({ value: 25, text: 25, isSelected: pageSize == 25 ? true : false });
    }

    return {
        onRequest: onRequest
    }
});
