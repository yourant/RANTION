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
        createLineData(form, result, date_from, date_to); //创建行数据
        // 设置数据选择列表、当前页、总页数到界面
        setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result);
        return form;
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

        var rsJson = {} , SKUs = {} , limit = 4000;
        var filters_sku = [];
        if (item) {
            // item = true;
            filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }];
        }
        search.create({
            type: 'customrecord_demand_forecast',
            filters: filters_sku,
            columns: [
                { name: 'custrecord_demand_forecast_item_sku',sort: search.Sort.ASC}
            ]
        }).run().each(function (rec) {
            SKUIds.push(rec.getValue(rec.columns[0]))
            return --limit > 0;
        });
        log.debug('SKUIds',SKUIds);
        
        var filters = [
            { name : 'custrecord_demand_forecast_l_data_type', join:'custrecord_demand_forecast_parent', operator:'anyof', values: ["3"] },
            { name : 'custrecord_demand_forecast_l_date', join:'custrecord_demand_forecast_parent', operator:'on', values: today },
        ];
        var filters_locationquantityavailable =[];
        var location=[];
        if (account) {
            filters.push({ name: "custrecord_demand_forecast_account", operator: "anyof", values: account });
        }
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_location_type', operator: 'is', values: 2 },
            ],
            columns: [
                { name: 'internalId'}
            ]
        }).run().each(function (rec) {
            location.push(rec.id);
            return true
        });
        log.debug('location',location);
        filters_locationquantityavailable.push({ name: 'inventorylocation', operator: 'anyof', values: location });

        filters.push({ name: "custrecord_demand_forecast_item_sku", operator: "anyof", values: SKUIds });
        filters_locationquantityavailable.push({ name: 'internalid', operator: 'anyof', values: SKUIds });
            
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
        var delivery_schedule = [], quantity_week=[], transfer_order = []; //结果

        log.debug('pageData_delivery_schedule',pageData_delivery_schedule);

        if (totalCount == 0 && pageCount ==0) {
            rsJson.result = [];
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
        } else {
            pageData_delivery_schedule.fetch({
                index: Number(nowPage-1)
            }).data.forEach(function (rs) {
                var jsonstr = {};
                jsonstr.df_id = rs.id;
                var item_sku = rs.getValue(rs.columns[2]);
                jsonstr.account= rs.getValue(rs.columns[0]),
                jsonstr.account_text= rs.getText(rs.columns[0]),
                jsonstr.site= rs.getValue(rs.columns[1]),
                jsonstr.item_sku= rs.getValue(rs.columns[2]),
                jsonstr.item_sku_text= rs.getText(rs.columns[2]),
                jsonstr.item_name= rs.getValue(rs.columns[3]),
                jsonstr.data_type= rs.getValue(rs.columns[4]),
                jsonstr.data_type_text= rs.getText(rs.columns[4]),
                jsonstr.skuid = item_sku;
                jsonstr.locationquantityavailable = 0;
                // jsonstr.totalTransportMake = 0;
                jsonstr.inventory_id = 10;
                jsonstr.inventory = '库存量';
                jsonstr.in_transit = '在途量';
                jsonstr.self_inventory = '自营仓库存量';
                jsonstr.self_in_transit = '自营仓在途量';
                jsonstr.transfer_order = transfer_order;
                SKUs[jsonstr.skuid] = jsonstr;
                if (item_sku == SKUs[jsonstr.skuid].item_sku) {
                    // log.debug('item_sku',item_sku+'----'+SKUs[jsonstr.skuid].item_sku);
                    quantity_week.push({
                        item_sku:item_sku,
                        account: rs.getValue(rs.columns[0]),
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
                }
                jsonstr.delivery_schedule = quantity_week;
                // demand.push({
                //     // account: rs.getValue(rs.columns[0]),
                //     // account_text: rs.getText(rs.columns[0]),
                //     // site: rs.getValue(rs.columns[1]),
                //     // item_sku: rs.getValue(rs.columns[2]),
                //     // item_sku_text: rs.getText(rs.columns[2]),
                //     // item_name: rs.getValue(rs.columns[3]),
                //     // data_type: rs.getValue(rs.columns[4]),
                //     // data_type_text: rs.getText(rs.columns[4]),
                //     quantity_week: quantity_week,
                // });
            });
            rsJson.result = SKUs;
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
        }

        //自营仓库存量
        // log.debug('filters_locationquantityavailable',filters_locationquantityavailable);
        var mySearch_locationquantityavailable = search.create({
            type: 'item',
            filters: filters_locationquantityavailable,
            columns : [
                {name : 'internalid', summary: 'GROUP' },
                {name : 'locationquantityavailable', summary: 'SUM'},
            ]
        });
        // log.debug('mySearch_locationquantityavailable',mySearch_locationquantityavailable);

        var pageData_locationquantityavailable = mySearch_locationquantityavailable.runPaged({
            pageSize: pageSize
        });
        var totalCount_locationquantityavailable = pageData_locationquantityavailable.count; //总数
        var pageCount_locationquantityavailable = pageData_locationquantityavailable.pageRanges.length; //页数

        if (totalCount_locationquantityavailable == 0 && pageCount_locationquantityavailable ==0) {
            rsJson.result = result;
            rsJson.totalCount = totalCount_locationquantityavailable;
            rsJson.pageCount = pageCount_locationquantityavailable;
        } else{
            pageData_locationquantityavailable.fetch({
                index: Number(nowPage-1)
            }).data.forEach(function (rs) {
                var skuid = Number(rs.getValue(rs.columns[0]));
                // log.debug('skuid',skuid);
                var json = SKUs[skuid];
                // log.debug('json',json);
                if (json) {
                    var locationquantityavailable = Number(json.locationquantityavailable) + Number(rs.getValue(rs.columns[1]));
                    if (locationquantityavailable > 0) {
                        json.locationquantityavailable = locationquantityavailable;
                    }
                }
                // log.debug('rs',rs);
                return true;
            });
            rsJson.result = SKUs;
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
            
        }
        log.debug('rsJson',rsJson);
        var week_ =[],quantity=0;
        //自营仓在途量 查发调拨单（库存转移订单）
        search.create({
            type: 'transferorder',
            filters: [
                { name: 'transferlocation', operator: 'anyof', values: location },
                { join: 'item', name: 'internalid', operator: 'anyof', values: SKUIds },
                { name: 'type', operator: 'anyof', values: ["TrnfrOrd"] },
                { name: 'status', operator: 'anyof', values: ["TrnfrOrd:F"] },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'transferorderquantityshipped', operator: 'isnotempty'},
                { name: 'tosubsidiary', operator: 'anyof', values: ["@NONE@"]},
            ],
            columns: [
                { name: 'item' },
                { name: 'transferorderquantityshipped' },
                { name: 'expectedreceiptdate' },
            ]
        }).run().each(function (result) {
            var rsid = result.getValue(result.columns[0]);
            log.debug('rsid',rsid);
            log.debug('SKUs',SKUs);
            var quantity_shipped = Number(result.getValue(result.columns[1]));
            var week = weekofday(format.parse({ value:result.getValue(result.columns[2]), type: format.Type.DATE}));
            // log.debug('SKUs[rsid].item_sku',SKUs[rsid].item_sku)
            if (rsid == SKUs[rsid].item_sku) {
                // log.debug('rsid',rsid+ '------' +SKUs[rsid].item_sku)
                transfer_order.push({
                    rsid: rsid,
                    // account:in_transit_account,
                    week : week,
                    quantity : quantity_shipped,
                });
            }
            
            
            var json = SKUs[rsid];
            if (json) {
                json.transfer_order = transfer_order;
            }
            return true;
        });

        log.debug('rsJson.result',rsJson.result);
        return rsJson;
    }

    /**
    * 创建行数据
    * @param {*} data 
    */
    function createLineData(form, result, date_from, date_to) {
        var num=0;
        var week = {} , quantity_week={},  qw = [];

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
            // quantity_week_ = 'quantity_week' + index;
            week_ = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER });
            week[index] = week_;
            // quantity_week[index] = quantity_week_;
        }
        // log.debug('week',week);
        // log.debug('quantity_week',quantity_week);
        // var week1 = sublist.addField({ id: 'custpage_quantity_week1', label: 'W1', type: ui.FieldType.INTEGER }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        log.debug('createLineData result',result);
        for (var z = 0; z < SKUIds.length; z++) {
            // log.debug('result[SKUIds[i]]',result[SKUIds[i]]);
            log.debug('z1',z);
            if (result[SKUIds[z]]) {
                if (z != 0) {
                    zl = Number(Number(z) + 5);
                }else{
                    zl = z;
                }
                log.debug('z2',zl);
                var inventory_quantity;
                log.debug('result[SKUIds[i]]',result[SKUIds[z]].skuid);
                var df_id = result[SKUIds[z]].df_id;
                var skuid = result[SKUIds[z]].skuid;
                var locationquantityavailable = result[SKUIds[z]].locationquantityavailable;
                var account = result[SKUIds[z]].account;
                var account_text = result[SKUIds[z]].account_text;
                var item_sku_text = result[SKUIds[z]].item_sku_text;
                var item_name = result[SKUIds[z]].item_name;
                var data_type_text = result[SKUIds[z]].data_type_text;
                var self_inventory = result[SKUIds[z]].self_inventory;
                // var inventory_id = result[SKUIds[z]].inventory_id;
                var delivery_schedule = result[SKUIds[z]].delivery_schedule;
                var transfer_order = result[SKUIds[z]].transfer_order;
                var in_transit = result[SKUIds[z]].in_transit;
                var self_in_transit = result[SKUIds[z]].self_in_transit;
                log.debug('transfer_order',transfer_order);
                sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl });   //account_text
                sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl });    //item_sku_text
                sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl });
                sublist.setSublistValue({ id: 'custpage_data_type', value: data_type_text, line: zl });  //data_type_text
                log.debug('delivery_schedule',delivery_schedule);

                var dfc_rec;
                
                for (var j = 0; j < delivery_schedule.length; j++) {
                    // var d_quantity_week = demand.quantity_week[0];
                    if ((delivery_schedule[j].item_sku == skuid) && (delivery_schedule[j].account == account)) {
                        log.debug('delivery_schedule.sku',skuid+'---'+delivery_schedule[j].item_sku);
                        for (var index = 1; index <= 52; index++) {
                            var sub_filed = 'custpage_quantity_week' + index;
                            sublist.setSublistValue({ id: sub_filed, value: delivery_schedule[j]['quantity_week'+index], line: zl});  //data_type_text  //净需求量
                        }
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
                }
                
                for (var i = week_today; i <= week_end; i++) {
                    var sub_filed = 'custpage_quantity_week' + i;
                    // var dfc_filed ='custrecord_quantity_week' + i;
                    sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl+1 });   //account_text
                    sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl+1 });    //item_sku_text
                    sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl+1 });
                    sublist.setSublistValue({ id: 'custpage_data_type', value: self_inventory,  line: zl+1 });  //data_type_text

                    inventory_quantity = locationquantityavailable - delivery_schedule[0]['quantity_week'+i];
                    locationquantityavailable = inventory_quantity;
                    sublist.setSublistValue({ id: sub_filed, value: inventory_quantity.toString(), line: zl+1 });  //data_type_text     自营仓库存量
                }
                var result_1={} ;
                for (var j = 0; j < transfer_order.length; j++) {
                    if ((transfer_order[j].rsid == skuid) ) {    //&& (purchaseorder[j].account == account)  发运记录上需要用
                        if(result_1[transfer_order[j].week]){
                            result_1[transfer_order[j].week]+=transfer_order[j].quantity;
                        }else{
                            result_1[transfer_order[j].week] = transfer_order[j].quantity;
                        }
                    }
                }
                log.debug('result_1',result_1);
                for (var index = 1; index <= 52; index++) {
                    var sub_filed = 'custpage_quantity_week' + index;
                    sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl+2 });   //account_text
                    sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl+2 });    //item_sku_text
                    sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl+2 });
                    sublist.setSublistValue({ id: 'custpage_data_type', value: self_in_transit,  line: zl+2 });  //data_type_text
                    sublist.setSublistValue({ id: sub_filed, value: (result_1[index] || 0).toString(), line: zl+2 });  //data_type_text     自营仓在途量
                }
                for (var index = 1; index <= 52; index++) {
                    var sub_filed = 'custpage_quantity_week' + index;
                    sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl+3 });   //account_text
                    sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl+3 });    //item_sku_text
                    sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl+3 });
                    sublist.setSublistValue({ id: 'custpage_data_type', value: '计算交货量',  line: zl+3 });  //data_type_text
                    
                    var x1 = sublist.getSublistValue({ id : sub_filed, line: zl});
                    var x2 = sublist.getSublistValue({ id : sub_filed, line: zl+1});
                    var x3 = sublist.getSublistValue({ id : sub_filed, line: zl+2});
                    var x4 = Number(x3||0) + Number(x2||0) - Number(x1)
                    sublist.setSublistValue({ id: sub_filed, value: x4.toString(),line: zl+3 });  //data_type_text
                }
                for (var index = 1; index <= 52; index++) {
                    var sub_filed = 'custpage_quantity_week' + index;
                    sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl+4 });   //account_text
                    sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl+4 });    //item_sku_text
                    sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl+4 });
                    sublist.setSublistValue({ id: 'custpage_data_type', value: '修改交货量',  line: zl+4 });  //data_type_text
                    
                    var x = sublist.getSublistValue({ id : sub_filed, line: zl+3});
                    sublist.setSublistValue({ id: sub_filed, value: x.toString(),line: zl+4 });  //data_type_text
                }
                for (var index = 1; index <= 52; index++) {
                    var sub_filed = 'custpage_quantity_week' + index;
                    sublist.setSublistValue({ id: 'custpage_store_name', value: account_text, line: zl+5 });   //account_text
                    sublist.setSublistValue({ id: 'custpage_item_sku', value: item_sku_text, line: zl+5 });    //item_sku_text
                    sublist.setSublistValue({ id: 'custpage_item_name', value: item_name, line: zl+5 });
                    sublist.setSublistValue({ id: 'custpage_data_type', value: '确认交货量',  line: zl+5 });  //data_type_text
                    
                    var x = sublist.getSublistValue({ id : sub_filed, line: zl+3});
                    sublist.setSublistValue({ id: sub_filed, value: x.toString(),line: zl+5 });  //data_type_text
                }
            }
        }

        // result.map(function (d, line) {
        //     log.debug('result_mp',d + '---'+ line)

        //     sublist.setSublistValue({ id: 'custpage_store_name', value: d.account_text, line: line });   //account_text
        //     sublist.setSublistValue({ id: 'custpage_item_sku', value: d.item_sku_text, line: line });    //item_sku_text
        //     sublist.setSublistValue({ id: 'custpage_item_name', value: d.item_name, line: line });
        //     sublist.setSublistValue({ id: 'custpage_data_type', value: d.data_type_text, line: line });  //data_type_text
        //     var d_quantity_week = d.quantity_week[0];
        //     for (var index = 1; index <= 52; index++) {
        //         var sub_filed = 'custpage_quantity_week' + index;
        //         sublist.setSublistValue({ id: sub_filed, value: d_quantity_week['quantity_week'+index], line: line });  //data_type_text
        //     }
            
        //     for (var i = 1; i < week_start; i++) {
        //         week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        //     }
        //     for (var i = 52; i > week_end; i--) {
        //         week[i].updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        //     }
        //     for (var i = week_start; i <= week_end; i++) {

        //     }
        //     // week[week_start].updateDisplayType({displayType:ui.FieldDisplayType.NORMAL});
        // });
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
