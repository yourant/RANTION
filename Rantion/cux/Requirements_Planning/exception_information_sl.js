/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget','../../Helper/Moment.min', 'N/format', 'N/runtime', 'N/record'], 
function(search, ui, moment, format, runtime, record) {
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
            custpage_account_store: params.custpage_account_store,
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
    * 渲染查询结果至页面
    */
    function initUI() {
        var form = ui.createForm({ title: '例外信息查询' });
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
        //form.clientScriptModulePath = './delivery_schedule_cs';
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
        if (!date_from_p || !date_to_p) {
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

        var rsJson = getResult(item, pageSize, nowPage,site,account); //查询结果
        var result = rsJson.result;
        var totalCount = rsJson.totalCount;
        var pageCount = rsJson.pageCount;
        createLineData(form, result, date_from, date_to); //创建行数据
        // 设置数据选择列表、当前页、总页数到界面
        setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result);
        return form;
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
    */
    function getResult(item, pageSize, nowPage, site, account){
        var rsJson = {} ,limit = 4000;
        var filters_sku = [],skuids = [];
        if (item) {
            // item = true;
            filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }];
        }
        if(account){
            filters_sku .push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account }) 
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

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        log.debug('dateFormat',dateFormat);
        var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
        log.debug('today',today);

        var filters = [
            { name : 'custrecord_demand_forecast_l_data_type', join:'custrecord_demand_forecast_parent', operator:'anyof', values: ["16","3"] },
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
                    item_sku:rs.getValue(rs.columns[2]),
                    item_sku_text: rs.getText(rs.columns[2]),
                    item_name: rs.getValue(rs.columns[3]),
                    account: rs.getValue(rs.columns[0]),
                    account_text: rs.getText(rs.columns[0]),
                    site: rs.getValue(rs.columns[1]),
                    data_type: rs.getValue(rs.columns[4]),
                    data_type_text: rs.getText(rs.columns[4]),
                    quantity_week1: rs.getValue(rs.columns[5]),
                    quantity_week2: rs.getValue(rs.columns[6]),
                    quantity_week3: rs.getValue(rs.columns[7]),
                    quantity_week4: rs.getValue(rs.columns[8]),
                    quantity_week5: rs.getValue(rs.columns[9]),
                    quantity_week6: rs.getValue(rs.columns[10]),
                    quantity_week7: rs.getValue(rs.columns[11]),
                    quantity_week8: rs.getValue(rs.columns[12]),
                    quantity_week9: rs.getValue(rs.columns[13]),
                    quantity_week10: rs.getValue(rs.columns[14]),
                    quantity_week11: rs.getValue(rs.columns[15]),
                    quantity_week12: rs.getValue(rs.columns[16]),
                    quantity_week13: rs.getValue(rs.columns[17]),
                    quantity_week14: rs.getValue(rs.columns[18]),
                    quantity_week15: rs.getValue(rs.columns[19]),
                    quantity_week16: rs.getValue(rs.columns[20]),
                    quantity_week17: rs.getValue(rs.columns[21]),
                    quantity_week18: rs.getValue(rs.columns[22]),
                    quantity_week19: rs.getValue(rs.columns[23]),
                    quantity_week20: rs.getValue(rs.columns[24]),
                    quantity_week21: rs.getValue(rs.columns[25]),
                    quantity_week22: rs.getValue(rs.columns[26]),
                    quantity_week23: rs.getValue(rs.columns[27]),
                    quantity_week24: rs.getValue(rs.columns[28]),
                    quantity_week25: rs.getValue(rs.columns[29]),
                    quantity_week26: rs.getValue(rs.columns[30]),
                    quantity_week27: rs.getValue(rs.columns[31]),
                    quantity_week28: rs.getValue(rs.columns[32]),
                    quantity_week29: rs.getValue(rs.columns[33]),
                    quantity_week30: rs.getValue(rs.columns[34]),
                    quantity_week31: rs.getValue(rs.columns[35]),
                    quantity_week32: rs.getValue(rs.columns[36]),
                    quantity_week33: rs.getValue(rs.columns[37]),
                    quantity_week34: rs.getValue(rs.columns[38]),
                    quantity_week35: rs.getValue(rs.columns[39]),
                    quantity_week36: rs.getValue(rs.columns[40]),
                    quantity_week37: rs.getValue(rs.columns[41]),
                    quantity_week38: rs.getValue(rs.columns[42]),
                    quantity_week39: rs.getValue(rs.columns[43]),
                    quantity_week40: rs.getValue(rs.columns[44]),
                    quantity_week41: rs.getValue(rs.columns[45]),
                    quantity_week42: rs.getValue(rs.columns[46]),
                    quantity_week43: rs.getValue(rs.columns[47]),
                    quantity_week44: rs.getValue(rs.columns[48]),
                    quantity_week45: rs.getValue(rs.columns[49]),
                    quantity_week46: rs.getValue(rs.columns[50]),
                    quantity_week47: rs.getValue(rs.columns[51]),
                    quantity_week48: rs.getValue(rs.columns[52]),
                    quantity_week49: rs.getValue(rs.columns[53]),
                    quantity_week50: rs.getValue(rs.columns[54]),
                    quantity_week51: rs.getValue(rs.columns[55]),
                    quantity_week52: rs.getValue(rs.columns[56]),
                });
            });
        }

        //实际采购订单交货量
        //获取所有自营仓
        var location=[];
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
        var operated_warehouse = [];
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'location', operator: 'anyof', values: location },
                { name: 'item', operator: 'anyof', values: skuids },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'taxline', operator: 'is', values: ['F'] }
            ],
            columns: [
                'item',
                'expectedreceiptdate',
                'quantity',
                'location'
            ]
        }).run().each(function (result) {
            var need_quantity = result.getValue('quantity');
            if(need_quantity != 0){
                SKUIds.map(function(line){
                    if(line.item_sku == result.getValue('item')){
                        if(result.getValue('expectedreceiptdate')){
                            var item_date = format.parse({ value:result.getValue('expectedreceiptdate'), type: format.Type.DATE});
                            var item_time = weekofday(item_date);
                            operated_warehouse.push({
                                item_id : result.getValue('item'),
                                item_date : item_time,
                                item_quantity : need_quantity,
                                week_date: 'quantity_week'+item_time
                            })
                        }
                    }
                })
            }
            return true;
        });
        log.debug('operated_warehouse',operated_warehouse);

        var b = [];//记录数组a中的id 相同的下标
        if(operated_warehouse.length > 0){
            for(var i = 0; i < operated_warehouse.length;i++){
                for(var j = operated_warehouse.length-1;j>i;j--){
                    if(operated_warehouse[i].item_id == operated_warehouse[j].item_id && operated_warehouse[i].item_date == operated_warehouse[j].item_date){
                        operated_warehouse[i].item_quantity = (operated_warehouse[i].item_quantity*1 + operated_warehouse[j].item_quantity*1).toString()
                        b.push(j)
                    }
                }
            }
            for(var k = 0; k<b.length;k++){
                operated_warehouse.splice(b[k],1)
            }
        }
        log.debug('operated_warehouse1',operated_warehouse);

        for(var i = 0; i < item_data.length; i++){
            if(item_data[i]['data_type'] == 16){
                var key_text;
                var need_num;
                for(var property in item_data[i]){
                    if(operated_warehouse.length > 0){
                        for(var a = 0; a < operated_warehouse.length; a++){
                            if(operated_warehouse[a]['item_id'] == item_data[i]['item_sku']){
                                if(operated_warehouse[a]['week_date'] == property){
                                    key_text = property;
                                    need_num = operated_warehouse[a]['item_quantity'] - item_data[i][property];
                                    if(need_num){
                                        item_data[i][key_text] = need_num.toString();
                                    }
                                }
                            }
                        }
                    }
                }
            }else if(item_data[i]['data_type'] == 3){
                if(operated_warehouse.length > 0){
                    var need_arr = [];
                    for(var a = 0; a < operated_warehouse.length; a++){
                        if(operated_warehouse[a]['item_id'] == item_data[i]['item_sku']){
                            need_arr.push(operated_warehouse[a]);
                        }
                    }
                    item_data[i]['need_arr'] = need_arr;
                }
            }
        }
        log.debug('item_data',item_data);

        var item_arr = []
        search.create({
            type: 'item',
            filters: [
                { name: 'internalid', operator: 'is', values: skuids },
            ],
            columns: [
                { name: 'othervendor'}
            ]
        }).run().each(function (rec) {
            item_arr.push({
                item_id: rec.id,
                vendor_id: rec.getValue('othervendor')
            })
            return true;
        });
        log.debug('item_arr',item_arr);

        if(item_arr.length > 0){
            item_arr.map(function(line){
                SKUIds.map(function(li){
                    if(line.vendor_id){
                        search.create({
                            type: 'customrecordpurchasing_cycle_record',
                            filters: [
                                { name: 'custrecordsku_number', operator: 'is', values: line.item_id },
                                { name: 'custrecord_vendor', operator: 'is', values: line.vendor_id },
                            ],
                            columns: [
                                'custrecord_purchasing_cycle'
                            ]
                        }).run().each(function (rec) {
                            var need_time = Number(rec.getValue('custrecord_purchasing_cycle'));
                            if(li.item_sku == line.item_id){
                                item_data.push({
                                    item_sku: li.item_sku,
                                    item_sku_text: li.item_sku_name,
                                    item_name: li.item_name,
                                    account: li.forecast_account,
                                    account_text: li.forecast_account_name,
                                    site: li.forecast_site,
                                    data_type: '2',
                                    need_time: need_time
                                });
                            }
                        });
                    } 
                })
                
            })
        }

        

        rsJson.result = item_data;
        rsJson.totalCount = totalCount;
        rsJson.pageCount = pageCount;
        log.debug('rsJson',rsJson);
        return rsJson;
    }

    /**
    * 创建行数据
    * @param {*} data 
    */
    function createLineData(form, result, date_from, date_to) {
        var week = {};
        var today = new Date(+new Date()+8*3600*1000);
        log.debug('today',today);
        var week_today = weekofday(today);
        log.debug('week_today',week_today);
        var week_start = weekofday(date_from);
        log.audit('week_start',week_start);
        var week_end = weekofday(date_to);
        log.audit('week_end',week_end);
        
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today_l = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
        log.debug('today_l',today_l);

        var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '例外信息', tab: 'custpage_tab' });
        sublist.helpText = "例外信息结果";
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
        log.debug('createLineData result',result);
        log.debug('SKUIds',SKUIds);
        var zl = 0;
        for (var z = 0; z < SKUIds.length; z++) {
            if (result.length > 0) {
                var need1_zl = 0;
                for(var a = 0; a < result.length; a++){
                    if(SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']){
                        sublist.setSublistValue({ id: 'custpage_store_name', value: result[a]['account_text'], line: zl });   
                        sublist.setSublistValue({ id: 'custpage_item_sku', value: result[a]['item_sku_text'], line: zl });    
                        sublist.setSublistValue({ id: 'custpage_item_name', value: result[a]['item_name'], line: zl });
                         
                        for (var i = 1; i < week_start; i++) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
                        }
                        for (var i = 52; i > week_end; i--) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
                        }
                        for (var i = week_start; i <= week_end; i++) {
                            week[i].updateDisplayType({displayType:ui.FieldDisplayType.ENTRY});
                        }

                        if(result[a]['data_type'] == 16){
                            sublist.setSublistValue({ id: 'custpage_data_type', value: '交货情况', line: zl });//result[a]['data_type_text']
                            for (var index = week_start; index <= week_end; index++) { 
                                var sub_filed = 'custpage_quantity_week' + index;
                                if(result[a]['quantity_week'+index]){
                                    sublist.setSublistValue({ id: sub_filed, value: result[a]['quantity_week'+index], line: zl});  
                                }
                            }
                            zl++;
                        }

                        var need_no = 0;
                        if(result[a]['data_type'] == 3){
                            sublist.setSublistValue({ id: 'custpage_data_type', value: '变动最终情况', line: zl });
                            for (var index = week_start; index <= week_end; index++) { 
                                var sub_filed = 'custpage_quantity_week' + index;
                                if(index == week_start){
                                    var s1 = result[a]['quantity_week'+index];
                                    var s2 = 0;
                                    if(result[a]['need_arr'].length > 0){
                                        for(var d = 0; d < result[a]['need_arr'].length; d++){
                                            if(index == result[a]['need_arr'][d]['item_date']){
                                                s2 = result[a]['need_arr'][d]['item_quantity'];
                                            }
                                        }
                                    }
                                    need_no = s2 - s1;
                                    sublist.setSublistValue({ id: sub_filed, value: need_no.toString(), line: zl});
                                }else{
                                    var s1 = result[a]['quantity_week'+index];
                                    var s2 = 0;
                                    if(result[a]['need_arr'].length > 0){
                                        for(var d = 0; d < result[a]['need_arr'].length; d++){
                                            if(index == result[a]['need_arr'][d]['item_date']){
                                                s2 = result[a]['need_arr'][d]['item_quantity'];
                                            }
                                        }
                                    }
                                    need_no = Number(need_no) + Number(s2) - s1;
                                    sublist.setSublistValue({ id: sub_filed, value: need_no.toString(), line: zl});
                                }
                            }
                            need1_zl = zl;
                            zl++;
                        }

                        if(result[a]['data_type'] == 2){
                            sublist.setSublistValue({ id: 'custpage_data_type', value: '建议处理情况', line: zl });
                            var need_today = new Date(+new Date()+8*3600*1000 - result[a]['need_time']*24*3600*1000);
                            log.debug('need_today',need_today);
                            var need_week_today = weekofday(need_today);
                            log.debug('need_week_today',need_week_today);
                            var cc = week_today - need_week_today;
                            for (var index = week_start; index <= week_end; index++) {
                                var sub_filed = 'custpage_quantity_week' + index;
                                var sub_need =  'custpage_quantity_week' + (Number(index) + Number(cc));
                                var x1 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id : sub_need, line: need1_zl}) : 0;
                                sublist.setSublistValue({ id: sub_filed, value: x1, line: zl});
                            }
                            zl++;
                        }
                    }
                }
            }
        }
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
