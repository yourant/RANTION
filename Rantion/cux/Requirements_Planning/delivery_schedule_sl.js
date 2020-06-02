/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-09 11:41:34
 * @LastEditTime: 2020-05-09 16:03:20
 * @FilePath: \Rantion_sandbox\Rantion\cux\Requirements_Planning\delivery_schedule_sl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget','../../Helper/Moment.min', 'N/format', 'N/runtime', 'N/record'], function(search, ui, moment, format, runtime, record) {

    var SKUIds = [];
    function onRequest(context) {
        var response = context.response;
        var request = context.request;
        var method = request.method;
        var params = request.parameters; //参数
    
        //在方法中去做UI的初始化并判断GET/POST
        showResult(method, params, response);
    }

    function showResult(method, params, response) {

        var form = initUI(); //渲染查询条件UI界面
    
        //设置查询参数默认值
        form.updateDefaultValues({
            custpage_item: params.custpage_item,
            custpage_date_from: params.custpage_date_from,
            custpage_date_to: params.custpage_date_to
        });
    
        var action = params.action;
        if (method == 'POST') {
            params.custpage_now_page = 1;
            form = getSearchData(form, params, response);
        } else {
            if (action == "search") {
                form = getSearchData(form, params, response);
            }
        }
        response.writePage(form);
    }

        /**
    * 查询逻辑
    * 
    * @param form
    * @param status 状态
    * @param serialNumber   个案序列号
    * @returns
    */
    function getSearchData(form, params) {
        var nowPage = params.custpage_now_page ? params.custpage_now_page : 1;
        var pageSize = params.custpage_page_size ? params.custpage_page_size : 50; // 每页数量
        var item = params.custpage_item;
        var date_from_p = params.custpage_date_from;
        var date_to_p = params.custpage_date_to;
        if (!date_from_p || !date_to_p) {// || (date_from_p > date_to_p)
            throw "请先输入正确的时间范围";
        }
        var date_from = format.parse({ value:params.custpage_date_from, type: format.Type.DATE});
        var date_to = format.parse({ value:params.custpage_date_to, type: format.Type.DATE});
        log.debug('getSearchData date_from',date_from);
        log.debug('getSearchData date_to',date_to);
        if (date_from > date_to) {
            throw "请先输入正确的时间范围";
        }
        var site = params.custpage_site;
        var account = params.custpage_account_store;
        // format.parse({ value:params.custpage_date_from, type: format.Type.DATE});
        // format.parse({ value:params.custpage_date_to, type: format.Type.DATE});

        var rsJson = getResult(item, date_from, date_to, pageSize, nowPage,site,account); //查询结果
        var result = rsJson.result;
        var totalCount = rsJson.totalCount;
        var pageCount = rsJson.pageCount;
        var need_result = createLineData(form, result, date_from, date_to); //创建行数据
        log.debug('need_result ',need_result);
        if(need_result){
            try{
                createOrUpdateData(need_result, date_from, date_to)
            }catch(e){
                log.debug('e',e);
            }
        }
        // 设置数据选择列表、当前页、总页数到界面
        setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result);
        return form;
    }

    //保存或更新确认交货量
    function createOrUpdateData(need_result, date_from, date_to){
        var week_start = weekofday(date_from);
        var week_end = weekofday(date_to);
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
        need_result.map(function(line){
            var bill_id;
            search.create({
                type: 'customrecord_demand_forecast_child',
                filters: [
                    { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_sku },
                    { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id },
                    { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: today},
                    { name: 'custrecord_demand_forecast_l_data_type', operator: 'anyof', values: 16}
                ]
            }).run().each(function (rec) {
                bill_id = rec.id;
            });
            log.debug('bill_id',bill_id);
            var child_bill_data;
            if(bill_id){
                child_bill_data = record.load({type: 'customrecord_demand_forecast_child',id: bill_id});
                for(var i = week_start; i < week_end+1; i++){
                    line.item.map(function(li){
                        if(i == li.week){
                            var field_name = 'custrecord_quantity_week' + i;
                            child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity });
                        }
                    })   
                }
                child_bill_data.save();
            }else{
                var need_today = new Date(+new Date()+8*3600*1000);
                var forecast_id;
                search.create({
                    type: 'customrecord_demand_forecast',
                    filters: [
                        { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_sku },
                        { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id }
                    ]
                }).run().each(function (rec) {
                    forecast_id = rec.id;
                });
                log.debug('forecast_id',forecast_id);
                child_bill_data = record.create({ type: 'customrecord_demand_forecast_child' });
                child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: need_today });
                child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: 16});
                child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id});
                for(var i = week_start; i < week_end+1; i++){
                    line.item.map(function(li){
                        if(i == li.week){
                            var field_name = 'custrecord_quantity_week' + i;
                            child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity });
                        }
                    })   
                }
                child_bill_data.save();
            }
        })
    }

    /**
    * 渲染查询结果至页面
    */
    function initUI() {
        var form = ui.createForm({ title: '交货计划查询' });
        form.addSubmitButton({ label: '查询' });
        form.addTab({ id: 'custpage_tab', label: '查询结果' });
        form.addFieldGroup({ id: 'custpage_search_group', tab: 'custpage_tab', label: '查询条件' });
        // form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'item', label: '店铺', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_account_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '所属店铺', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customlist9', label: '站点', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_date_from', type: ui.FieldType.DATE, label: '日期从', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_date_to', type: ui.FieldType.DATE, label: '日期至', container: 'custpage_search_group' });
        initPageChoose(form);
        form.clientScriptModulePath = './delivery_schedule_cs';
        return form;
    }

    /**
    * 在界面显示：数据选择数据组（包括数据选择列表、当前页/总页数）
    * 
    * @param form
    * @param hidePageSelect 是否隐藏数据选择select
    * @returns
    */
    function initPageChoose(form, hidePageSelect) {
        form.addFieldGroup({ id: 'custpage_page_group', tab: 'custpage_tab', label: '数据选择' });
        if (hidePageSelect != 'Y') {
            form.addField({ id: 'custpage_select_page', type: ui.FieldType.SELECT, label: '数据选择', container: 'custpage_page_group' });
        }
        form.addField({ id: 'custpage_total_count', type: ui.FieldType.TEXT, label: '总行数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }) .updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
        form.addField({ id: 'custpage_total_page', type: ui.FieldType.INTEGER, label: '总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        form.addField({ id: 'custpage_page_size', type: ui.FieldType.SELECT, label: '每页条数', container: 'custpage_page_group' }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
        form.addField({ id: 'custpage_now_page', type: ui.FieldType.INTEGER, label: '当前页', container: 'custpage_page_group' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        form.addField({ id: 'custpage_now_total_page', type: ui.FieldType.TEXT, label: '当前页/总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 10, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }) .updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
    }

    /**
    * 设置数据选择列表、当前页、总页数到界面
    * 
    * @param form
    * @param nowPage
    * @param totalCount
    * @param pageSize
    * @param hidePageSelect 是否隐藏数据选择select
    * @returns
    */
    function setPageInfo(form, nowPage, totalCount, pageCount, pageSize, hidePageSelect) {
        form.getField({ id: 'custpage_total_page' }).defaultValue = pageCount;
        form.getField({ id: 'custpage_now_page' }).defaultValue = nowPage;
        form.getField({ id: 'custpage_now_total_page' }).defaultValue = (nowPage == 0 ? 1 : nowPage) + '/' + pageCount;
        form.getField({ id: 'custpage_total_count' }).defaultValue = totalCount;
        if (hidePageSelect != 'Y') {
            var selectPageField = form.getField({ id: 'custpage_select_page' });
            for (var i = 1; i <= pageCount; i++) {
                var selectedFlag;
                var startStr = (i - 1) * pageSize + 1;
                var endStr = i == pageCount ? totalCount : (i - 1) * pageSize + Number(pageSize);
                if (nowPage == i) {
                    selectedFlag = true;
                } else {
                    selectedFlag = false;
                }
                selectPageField.addSelectOption({ value: i, text: startStr + '-' + endStr + '行', isSelected: selectedFlag });
            }
        }
        var pageSizeField = form.getField({ id: 'custpage_page_size' });
        pageSizeField.addSelectOption({ value: 50, text: 50, isSelected: pageSize == 50 ? true : false });
        pageSizeField.addSelectOption({ value: 100, text: 100, isSelected: pageSize == 100 ? true : false });
        pageSizeField.addSelectOption({ value: 200, text: 200, isSelected: pageSize == 200 ? true : false });
        pageSizeField.addSelectOption({ value: 500, text: 500, isSelected: pageSize == 500 ? true : false });
        pageSizeField.addSelectOption({ value: 1000, text: 1000, isSelected: pageSize == 1000 ? true : false });
    }

    /**
    * 查询结果
    * @param {*} item 
    * @param {*} date_from 
    * @param {*} date_to 
    */
    function getResult(item, date_from, date_to, pageSize, nowPage,site,account) {

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        log.debug('dateFormat',dateFormat);
        var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
        log.debug('today',today);

        var rsJson = {} , limit = 4000;
        var filters_sku = [],skuids = [];;
        if (item) {
            // item = true;
            filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }];
        }
        search.create({
            type: 'customrecord_demand_forecast',
            filters: filters_sku,
            columns: [
                { name: 'custrecord_demand_forecast_item_sku',sort: search.Sort.ASC},
                { name: 'custrecord_demand_forecast_account'},
                { name: 'custrecord_demand_forecast_item_name'},
                { name: 'custrecord_demand_forecast_site'},
            ]
        }).run().each(function (rec) {
            SKUIds.push({
                item_sku : rec.getValue(rec.columns[0]),
                forecast_account : rec.getValue(rec.columns[1]),
                item_sku_name : rec.getText(rec.columns[0]),
                forecast_account_name : rec.getText(rec.columns[1]),
                item_name : rec.getValue(rec.columns[2]),
                forecast_site : rec.getValue(rec.columns[3]),
            });
            skuids.push(rec.getValue(rec.columns[0]))
            return --limit > 0;
        });
        log.debug('SKUIds',SKUIds);
        
        var filters = [
            { name : 'custrecord_demand_forecast_l_data_type', join:'custrecord_demand_forecast_parent', operator:'anyof', values: ["3"] },
            { name : 'custrecord_demand_forecast_l_date', join:'custrecord_demand_forecast_parent', operator:'on', values: today },
        ];
        
        if (account) {
            filters.push({ name: "custrecord_demand_forecast_account", operator: "anyof", values: account });
        }
        
        filters.push({ name: "custrecord_demand_forecast_item_sku", operator: "anyof", values: skuids });
            
        if (site) {
            filters.push({ name: "custrecord_demand_forecast_site", operator: "anyof", values: site });
        }
        log.debug('filters',filters);
        //店铺净需求量
        var mySearch_delivery_schedule = search.create({
            type: "customrecord_demand_forecast",
            filters: filters,
            columns: [
                { name:'custrecord_demand_forecast_account'},
                { name:'custrecord_demand_forecast_site'},
                { name:'custrecord_demand_forecast_item_sku'},
                { name:'custrecord_demand_forecast_item_name'},
                { name:'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week1' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week2' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week3' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week4' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week5' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week6' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week7' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week8' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week9' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week10' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week11' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week12' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week13' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week14' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week15' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week16' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week17' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week18' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week19' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week20' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week21' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week22' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week23' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week24' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week25' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week26' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week27' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week28' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week29' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week30' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week31' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week32' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week33' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week34' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week35' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week36' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week37' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week38' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week39' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week40' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week41' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week42' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week43' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week44' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week45' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week46' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week47' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week48' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week49' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week50' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week51' , join: 'custrecord_demand_forecast_parent'},
                { name:'custrecord_quantity_week52' , join: 'custrecord_demand_forecast_parent'},
            ]
        });
        var pageSize = pageSize; //每页条数
        var pageData_delivery_schedule = mySearch_delivery_schedule.runPaged({
            pageSize: pageSize
        });
        var totalCount = pageData_delivery_schedule.count; //总数
        var pageCount = pageData_delivery_schedule.pageRanges.length; //页数

        var item_data = [];
        if (totalCount == 0 && pageCount ==0) {
            rsJson.result = [];
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
        } else {
            pageData_delivery_schedule.fetch({
                index: Number(nowPage-1)
            }).data.forEach(function (rs) {
                item_data.push({
                    item_sku:rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
                    item_sku_text: rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : '',
                    item_name: rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : '',
                    account: rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : '',
                    account_text: rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : '',
                    site: rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : '',
                    data_type: rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : '',
                    data_type_text: rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : '',
                    quantity_week1: rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : '',
                    quantity_week2: rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : '',
                    quantity_week3: rs.getValue(rs.columns[7]) ? rs.getValue(rs.columns[7]) : '',
                    quantity_week4: rs.getValue(rs.columns[8]) ? rs.getValue(rs.columns[8]) : '',
                    quantity_week5: rs.getValue(rs.columns[9]) ? rs.getValue(rs.columns[9]) : '',
                    quantity_week6: rs.getValue(rs.columns[10]) ? rs.getValue(rs.columns[10]) : '',
                    quantity_week7: rs.getValue(rs.columns[11]) ? rs.getValue(rs.columns[11]) : '',
                    quantity_week8: rs.getValue(rs.columns[12]) ? rs.getValue(rs.columns[12]) : '',
                    quantity_week9: rs.getValue(rs.columns[13]) ? rs.getValue(rs.columns[13]) : '',
                    quantity_week10: rs.getValue(rs.columns[14]) ? rs.getValue(rs.columns[14]) : '',
                    quantity_week11: rs.getValue(rs.columns[15]) ? rs.getValue(rs.columns[15]) : '',
                    quantity_week12: rs.getValue(rs.columns[16]) ? rs.getValue(rs.columns[16]) : '',
                    quantity_week13: rs.getValue(rs.columns[17]) ? rs.getValue(rs.columns[17]) : '',
                    quantity_week14: rs.getValue(rs.columns[18]) ? rs.getValue(rs.columns[18]) : '',
                    quantity_week15: rs.getValue(rs.columns[19]) ? rs.getValue(rs.columns[19]) : '',
                    quantity_week16: rs.getValue(rs.columns[20]) ? rs.getValue(rs.columns[20]) : '',
                    quantity_week17: rs.getValue(rs.columns[21]) ? rs.getValue(rs.columns[21]) : '',
                    quantity_week18: rs.getValue(rs.columns[22]) ? rs.getValue(rs.columns[22]) : '',
                    quantity_week19: rs.getValue(rs.columns[23]) ? rs.getValue(rs.columns[23]) : '',
                    quantity_week20: rs.getValue(rs.columns[24]) ? rs.getValue(rs.columns[24]) : '',
                    quantity_week21: rs.getValue(rs.columns[25]) ? rs.getValue(rs.columns[25]) : '',
                    quantity_week22: rs.getValue(rs.columns[26]) ? rs.getValue(rs.columns[26]) : '',
                    quantity_week23: rs.getValue(rs.columns[27]) ? rs.getValue(rs.columns[27]) : '',
                    quantity_week24: rs.getValue(rs.columns[28]) ? rs.getValue(rs.columns[28]) : '',
                    quantity_week25: rs.getValue(rs.columns[29]) ? rs.getValue(rs.columns[29]) : '',
                    quantity_week26: rs.getValue(rs.columns[30]) ? rs.getValue(rs.columns[30]) : '',
                    quantity_week27: rs.getValue(rs.columns[31]) ? rs.getValue(rs.columns[31]) : '',
                    quantity_week28: rs.getValue(rs.columns[32]) ? rs.getValue(rs.columns[32]) : '',
                    quantity_week29: rs.getValue(rs.columns[33]) ? rs.getValue(rs.columns[33]) : '',
                    quantity_week30: rs.getValue(rs.columns[34]) ? rs.getValue(rs.columns[34]) : '',
                    quantity_week31: rs.getValue(rs.columns[35]) ? rs.getValue(rs.columns[35]) : '',
                    quantity_week32: rs.getValue(rs.columns[36]) ? rs.getValue(rs.columns[36]) : '',
                    quantity_week33: rs.getValue(rs.columns[37]) ? rs.getValue(rs.columns[37]) : '',
                    quantity_week34: rs.getValue(rs.columns[38]) ? rs.getValue(rs.columns[38]) : '',
                    quantity_week35: rs.getValue(rs.columns[39]) ? rs.getValue(rs.columns[39]) : '',
                    quantity_week36: rs.getValue(rs.columns[40]) ? rs.getValue(rs.columns[40]) : '',
                    quantity_week37: rs.getValue(rs.columns[41]) ? rs.getValue(rs.columns[41]) : '',
                    quantity_week38: rs.getValue(rs.columns[42]) ? rs.getValue(rs.columns[42]) : '',
                    quantity_week39: rs.getValue(rs.columns[43]) ? rs.getValue(rs.columns[43]) : '',
                    quantity_week40: rs.getValue(rs.columns[44]) ? rs.getValue(rs.columns[44]) : '',
                    quantity_week41: rs.getValue(rs.columns[45]) ? rs.getValue(rs.columns[45]) : '',
                    quantity_week42: rs.getValue(rs.columns[46]) ? rs.getValue(rs.columns[46]) : '',
                    quantity_week43: rs.getValue(rs.columns[47]) ? rs.getValue(rs.columns[47]) : '',
                    quantity_week44: rs.getValue(rs.columns[48]) ? rs.getValue(rs.columns[48]) : '',
                    quantity_week45: rs.getValue(rs.columns[49]) ? rs.getValue(rs.columns[49]) : '',
                    quantity_week46: rs.getValue(rs.columns[50]) ? rs.getValue(rs.columns[50]) : '',
                    quantity_week47: rs.getValue(rs.columns[51]) ? rs.getValue(rs.columns[51]) : '',
                    quantity_week48: rs.getValue(rs.columns[52]) ? rs.getValue(rs.columns[52]) : '',
                    quantity_week49: rs.getValue(rs.columns[53]) ? rs.getValue(rs.columns[53]) : '',
                    quantity_week50: rs.getValue(rs.columns[54]) ? rs.getValue(rs.columns[54]) : '',
                    quantity_week51: rs.getValue(rs.columns[55]) ? rs.getValue(rs.columns[55]) : '',
                    quantity_week52: rs.getValue(rs.columns[56]) ? rs.getValue(rs.columns[56]) : '',
                });
            });
        }



        var filters_locationquantityavailable =[];
        var location=[],warehouse_stock = [];
        //获取所有自营仓
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_financia_warehous', operator: 'is', values: 2 },
            ],
            columns: [
                { name: 'internalId'}
            ]
        }).run().each(function (rec) {
            location.push(rec.id);
            return true
        });
        log.debug('location',location);
        //自营仓在途量 数据来源采购单
        var operated_warehouse = [];
        search.create({
            type: 'purchaseorder',
            filters: [
                { join: 'item', name: 'internalid', operator: 'is', values: skuids },
                { name: 'location', operator: 'anyof', values: location },
                { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'taxline', operator: 'is', values: ['F'] }
            ],
            columns: [
                { join: 'item', name: 'internalid', summary: 'GROUP' },
                { name: 'expectedreceiptdate', summary: 'GROUP' },
                { formula: '{quantity}-{quantityshiprecv}', name: 'formulanumeric', summary: 'SUM' }
            ]
        }).run().each(function (result) {
            log.debug('item',result.getValue({ join: 'item', name: 'internalid', summary: 'GROUP' }));
            log.debug('expectedreceiptdate',result.getValue({ name: 'expectedreceiptdate', summary: 'GROUP' }));
            log.debug('SUM',result.getValue({ formula: '{quantity}-{quantityshiprecv}', name: 'formulanumeric', summary: 'SUM' }));
            if(result.getValue({ name: 'expectedreceiptdate', summary: 'GROUP' })){
                var item_date = format.parse({ value:result.getValue({ name: 'expectedreceiptdate', summary: 'GROUP' }), type: format.Type.DATE});
                var item_time = weekofday(item_date);
                operated_warehouse.push({
                    item_id : result.getValue({ join: 'item', name: 'internalid', summary: 'GROUP' }),
                    item_date : item_time,
                    item_quantity : result.getValue({ formula: '{quantity}-{quantityshiprecv}', name: 'formulanumeric', summary: 'SUM' })
                })
            }
            return true;
        });
        log.debug('operated_warehouse',operated_warehouse);
        if(operated_warehouse.length > 0){
            SKUIds.map(function(line){
                operated_warehouse.map(function(li){
                    if(line.item_sku == li.item_id){
                        item_data.push({
                            item_sku: line.item_sku,
                            item_sku_text: line.item_sku_name,
                            item_name: line.item_name,
                            account: line.forecast_account,
                            account_text: line.forecast_account_name,
                            site: line.forecast_site,
                            data_type: '4',
                            data_type_text: '自营仓在途量',
                            operated_warehouse: operated_warehouse[i]
                        });
                    }
                })
            })
        }else{
            SKUIds.map(function(line){
                item_data.push({
                    item_sku: line.item_sku,
                    item_sku_text: line.item_sku_name,
                    item_name: line.item_name,
                    account: line.forecast_account,
                    account_text: line.forecast_account_name,
                    site: line.forecast_site,
                    data_type: '4',
                    data_type_text: '自营仓在途量',
                    operated_warehouse: ''
                });
            })
        }


        //自营仓库存量
        filters_locationquantityavailable.push({ name: 'inventorylocation', operator: 'anyof', values: location });
        filters_locationquantityavailable.push({ name: 'internalid', operator: 'anyof', values: skuids });
        search.create({
            type: 'item',
            filters: filters_locationquantityavailable,
            columns : [
                {name : 'internalid', summary: 'GROUP' },
                {name : 'locationquantityavailable', summary: 'SUM'},
            ]
        }).run().each(function (rec) {
            log.debug('rec',rec.getValue({name : 'internalid', summary: 'GROUP' }));
            log.debug('locationquantityavailable',rec.getValue({name : 'locationquantityavailable', summary: 'SUM'}));
            warehouse_stock.push({
                item_id : rec.getValue({name : 'internalid', summary: 'GROUP' }),
                item_quantity : rec.getValue({name : 'locationquantityavailable', summary: 'SUM'})
            });
            return true;
        });

        if(warehouse_stock.length > 0){
            SKUIds.map(function(line){
                warehouse_stock.map(function(li){
                    if(line.item_sku == li.item_id){
                        item_data.push({
                            item_sku: line.item_sku,
                            item_sku_text: line.item_sku_name,
                            item_name: line.item_name,
                            account: line.forecast_account,
                            account_text: line.forecast_account_name,
                            site: line.forecast_site,
                            data_type: '5',
                            data_type_text: '自营仓库存量',
                            warehouse_quantity: li.item_quantity
                        });
                    }
                })
            })
        }else{
            SKUIds.map(function(line){
                item_data.push({
                    item_sku: line.item_sku,
                    item_sku_text: line.item_sku_name,
                    item_name: line.item_name,
                    account: line.forecast_account,
                    account_text: line.forecast_account_name,
                    site: line.forecast_site,
                    data_type: '5',
                    data_type_text: '自营仓库存量',
                    warehouse_quantity: ''
                });
            })
        }

        SKUIds.map(function(line){
            item_data.push({
                item_sku: line.item_sku,
                item_sku_text: line.item_sku_name,
                item_name: line.item_name,
                account: line.forecast_account,
                account_text: line.forecast_account_name,
                site: line.forecast_site,
                data_type: '6',
                data_type_text: '计算交货量',
            });

            item_data.push({
                item_sku: line.item_sku,
                item_sku_text: line.item_sku_name,
                item_name: line.item_name,
                account: line.forecast_account,
                account_text: line.forecast_account_name,
                site: line.forecast_site,
                data_type: '7',
                data_type_text: '修改交货量',
            });

            item_data.push({
                item_sku: line.item_sku,
                item_sku_text: line.item_sku_name,
                item_name: line.item_name,
                account: line.forecast_account,
                account_text: line.forecast_account_name,
                site: line.forecast_site,
                data_type: '8',
                data_type_text: '确认交货量',
            });
        })
        
        rsJson.result = item_data;
        rsJson.totalCount = totalCount;
        rsJson.pageCount = pageCount;
        log.debug('rsJson.result',rsJson.result);
        return rsJson;
    }

    /**
    * 创建行数据
    * @param {*} data 
    */
    function createLineData(form, result, date_from, date_to) {
        var week = {};

        var today = new Date(+new Date()+8*3600*1000);
        var week_today = weekofday(today);
        log.debug('week_today',week_today);
        var week_start = weekofday(date_from);
        log.audit('week_start',week_start);
        var week_end = weekofday(date_to);
        log.audit('week_end',week_end);
        
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today_l = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
        log.debug('today_l',today_l);

        var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '交货计划', tab: 'custpage_tab' });
        sublist.helpText = "交货计划结果";
        sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT });
        for (var index = 1; index <= 52; index++) {
            var sub_filed = 'custpage_quantity_week' + index;
            var Label = 'W' + index;
            week_ = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER });
            week[index] = week_;
        }
        var zl = 0, data_arr = [];
        for (var z = 0; z < SKUIds.length; z++) {
            if (result.length > 0) {
                var need1_zl, need2_zl, need3_zl,need4_zl;
                var arr_list = {}, arr_data = [];
                for(var a = 0; a < result.length; a++){
                    if(SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']){
                        sublist.setSublistValue({ id: 'custpage_store_name', value: result[a]['account_text'], line: zl });   
                        sublist.setSublistValue({ id: 'custpage_item_sku', value: result[a]['item_sku_text'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_item_name', value: result[a]['item_name'], line: zl });
                        sublist.setSublistValue({ id: 'custpage_data_type', value: result[a]['data_type_text'], line: zl }); 

                        if(result[a]['data_type'] == 3){//需求量
                            for (var index = 1; index <= 52; index++) {
                                var sub_filed = 'custpage_quantity_week' + index;
                                if(result[a]['quantity_week'+index]){
                                    sublist.setSublistValue({ id: sub_filed, value: result[a]['quantity_week'+index], line: zl});  //data_type_text  //净需求量
                                }
                            }
                            need1_zl = zl;
                            zl++;
                        }
                        
                        
                        for (var i = 1; i < week_start; i++) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
                        }
                        for (var i = 52; i > week_end; i--) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
                        }
                        for (var i = week_start; i <= week_end; i++) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.ENTRY});
                        }

                        if(result[a]['data_type'] == 4){//店铺在途量 
                            var operated_no = result[a]['operated_warehouse'];
                            if(operated_no){
                                for (var i = week_start; i <= week_end; i++) { 
                                    if(operated_no.length > 0){
                                        operated_no.map(function(l){
                                            if(l.item_date == i){
                                                var sub_filed = 'custpage_quantity_week' + i;
                                                sublist.setSublistValue({ id: sub_filed, value: l.item_quantity.toString(), line: zl});  
                                            }
                                        })
                                    }
                                }
                            }
                            
                            need2_zl = zl;
                            zl++;
                        }

                        if(result[a]['data_type'] == 5){//店铺库存量
                            for (var i = week_start; i <= week_end; i++) {
                                var sub_filed = 'custpage_quantity_week' + i;
                                if(i == week_start){
                                    if(result[a]['warehouse_quantity']){
                                        sublist.setSublistValue({ id: sub_filed, value: result[a]['warehouse_quantity'].toString(), line: zl});
                                        need_no = result[a]['warehouse_quantity'];
                                    }
                                }else{
                                    if(result[a]['warehouse_quantity']){
                                        var need_sub_filed = 'custpage_quantity_week' + (i - 1);
                                        var x1 = need_no;
                                        var x2 = sublist.getSublistValue({ id : need_sub_filed, line: need2_zl});
                                        var x3 = sublist.getSublistValue({ id : need_sub_filed, line: need1_zl});
                                        need_no = Number(x1)+Number(x2)-x3;
                                        sublist.setSublistValue({ id: sub_filed, value: need_no.toString(), line: zl});
                                    }
                                }
                            }
                            need3_zl = zl;
                            zl++;
                        }

                        if(result[a]['data_type'] == 6 || result[a]['data_type'] == 7 || result[a]['data_type'] == 8){//店铺净需求
                            var arr_list = [], data_josn = {};
                            data_josn.item_sku = result[a]['item_sku'];
                            data_josn.account_id = result[a]['account'];
                            for (var i = week_start; i <= week_end; i++) { 
                                var sub_filed = 'custpage_quantity_week' + i;
                                var x1 = sublist.getSublistValue({ id : sub_filed, line: need1_zl});
                                var x2 = sublist.getSublistValue({ id : sub_filed, line: need2_zl});
                                var x3 = sublist.getSublistValue({ id : sub_filed, line: need3_zl});
                                var x4 = Number(x3)+Number(x2)-x1;
                                sublist.setSublistValue({ id: sub_filed, value: x4.toString(), line: zl});
                                arr_list.push({
                                    week: i,
                                    item_quantity: x4
                                });
                            }
                            data_josn.item = arr_list;
                            if(result[a]['data_type'] == 8){
                                data_arr.push(data_josn);
                            }
                            need4_zl = zl;
                            zl++;
                        }
                    }
                }
            }
        }
        return data_arr;
    }

    /**
     * 判断某一日属于这一年的第几周
     * @param {*} data 
     */
    function weekofday(data) {
        // log.debug('data',data);
        // var value = format.parse({value:data, type: format.Type.DATE});
        // log.debug('value',value);
        // var value = moment(value1).format('YYYY/MM/DD');
        // log.debug('value',value);
        // var dt = new Date(value);
        var dt = data;
        // log.debug('dt',dt);
        var y = dt.getFullYear();
        // log.debug('y',y);
        var start = "1/1/" + y;

        // log.debug('start',start);

        start = new Date(start);
        
        // log.debug('start_1',start);

        starts = start.valueOf();

        // log.debug('starts',starts);

        startweek = start.getDay();

        // log.debug('startweek',startweek);

        dtweek = dt.getDay();

        // log.debug('dtweek',dtweek);

        var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1 ;
        
        // log.debug('days',days);

        days = Math.floor(days / 7);

        // log.debug('days_1',days);

        return (days + 2);
    }

    return {
        onRequest: onRequest
    }
});
