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
        var form = initUI(params); //渲染查询条件UI界面
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
    * 渲染查询结果至页面
    */
    function initUI(params) {
        var form = ui.createForm({ title: '调拨计划查询' });
        form.addSubmitButton({ label: '查询' });
        form.addButton({
            id:'button_transfer',
            label : '生成库存转移订单',
            functionName:'createTransferOrders'
        });
        form.addTab({ id: 'custpage_tab', label: '查询结果' });
        form.addFieldGroup({ id: 'custpage_search_group', tab: 'custpage_tab', label: '查询条件' });
        // form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'item', label: '店铺', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_account_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '所属店铺', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customlist9', label: '站点', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_date_from', type: ui.FieldType.DATE, label: '日期从', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_date_to', type: ui.FieldType.DATE, label: '日期至', container: 'custpage_search_group' });
        var week_date = form.addField({ id: 'custpage_week_date', type: ui.FieldType.MULTISELECT, label: '选择生成周'});
        week_date.addSelectOption({
            value : '',
            text : ''
        });
        if(params.custpage_date_from && params.custpage_date_to){
            var date_from = format.parse({ value:params.custpage_date_from, type: format.Type.DATE});
            var week_from = weekofday(date_from);
            log.audit('week_from',week_from);
            var date_to = format.parse({ value:params.custpage_date_to, type: format.Type.DATE});
            var week_to = weekofday(date_to);
            log.audit('week_to',week_to);
            for (var i = week_from; i < week_to + 1; i++) {
                week_date.addSelectOption({
                    value : i,
                    text : 'W' + i
                });
            }
        }else{
            for (var i = 1; i < 53; i++) {
                week_date.addSelectOption({
                    value : i,
                    text : 'W' + i
                });
            }
        }
        initPageChoose(form);
        form.clientScriptModulePath = './allocation_plan_cs';
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
        var rsJson = {} ,limit = 4000,item_data = [];
        var filters_sku = [],skuids = [],location = [];
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
            //获取仓库
            var need_location;
            search.create({
                type: 'customrecord_aio_account',
                filters: [
                    { name: 'internalId', operator: 'is', values: rec.getValue(rec.columns[1]) },
                ],
                columns: [
                    { name: 'custrecord_aio_fbaorder_location'}
                ]
            }).run().each(function (r) {
                need_location = r.getValue('custrecord_aio_fbaorder_location');
                location.push(r.getValue('custrecord_aio_fbaorder_location'));
            });
            SKUIds.push({
                item_sku : rec.getValue(rec.columns[0]),
                forecast_account : rec.getValue(rec.columns[1]),
                item_sku_name : rec.getText(rec.columns[0]),
                forecast_account_name : rec.getText(rec.columns[1]),
                item_name : rec.getValue(rec.columns[2]),
                forecast_site : rec.getValue(rec.columns[3]),
                location : need_location ? need_location : ''
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
            { name : 'custrecord_demand_forecast_l_data_type', join:'custrecord_demand_forecast_parent', operator:'anyof', values: ["1"] },
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

        //在途量 (数据源：to单)
        var transit_num = [];
        search.create({
            type: 'transferorder',
            filters: [
                { join: 'item', name: 'internalid', operator: 'is', values: skuids },
                { name: 'transferlocation', operator: 'anyof', values: location },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'taxline', operator: 'is', values: ['F'] },
                { name: 'shipping', operator: 'is', values: ['F'] }
            ],
            columns: [
                //'custbodyexpected_arrival_time',
                'item',
                'expectedreceiptdate',
                'quantity'
                // { name: 'internalid', join: 'item', summary: 'GROUP' },
                // { name: 'formulanumeric', formula: 'quantity', summary: 'SUM' }
            ]
        }).run().each(function (result) {
            if(result.getValue('expectedreceiptdate')){
                var item_date = format.parse({ value:result.getValue('expectedreceiptdate'), type: format.Type.DATE});
                var item_time = weekofday(item_date);
                transit_num.push({
                    item_id : result.getValue('item'),
                    item_time : item_time,
                    item_quantity: result.getValue('quantity')
                });
            }
            return true;
        });
        log.debug('transit_num',transit_num);
        var need_transit_num = [];
        if(transit_num.length > 0){
            var po_no = [];
            for (var i = 0; i < transit_num.length; i++) {
                if (po_no.indexOf(transit_num[i]['item_id']) === -1) {
                    need_transit_num.push({
                        item_id: transit_num[i]['item_id'],
                        lineItems: [{
                            item_time: transit_num[i].item_time,
                            item_quantity: transit_num[i].item_quantity
                        }]
                    });
                } else {
                    for (var j = 0; j < need_transit_num.length; j++) {
                        if (need_transit_num[j].item_id == transit_num[i].item_id) {
                            need_transit_num[j].lineItems.push({
                                item_time: transit_num[i].item_time,
                                item_quantity: transit_num[i].item_quantity
                            });
                            break;
                        }
                    }
                }
                po_no.push(transit_num[i]['item_id']);
            }
        }
        log.debug('need_transit_num',need_transit_num);

        if(need_transit_num.length > 0){
            for(var i = 0; i < SKUIds.length; i++){
                for(var a = 0; a < need_transit_num.length; a++){
                    if(SKUIds[i]['item_sku'] == need_transit_num[a]['item_id']){
                        item_data.push({
                            item_sku: SKUIds[i]['item_sku'],
                            item_sku_text: SKUIds[i]['item_sku_name'],
                            item_name: SKUIds[i]['item_name'],
                            account: SKUIds[i]['forecast_account'],
                            account_text: SKUIds[i]['forecast_account_name'],
                            site: SKUIds[i]['forecast_site'],
                            data_type: '2',
                            data_type_text: '在途量',
                            transit_no: need_transit_num[a]['lineItems']
                        });
                    }
                }
            }
        }

        //库存量
        var location_quantity = [];
        search.create({
            type: 'item', 
            filters: [
                { name: 'inventorylocation', operator: 'anyof', values: location },
                { name: 'internalid', operator: 'anyof', values: skuids }
            ],
            columns : [
                {name : 'inventorylocation'},
                {name : 'locationquantityavailable'}
            ]
        }).run().each(function (rec) {
            SKUIds.map(function(line){
                if(line.item_sku == rec.id && line.location == rec.getValue('inventorylocation')){
                    location_quantity.push({
                        item_id : rec.id,
                        difference_qt : rec.getValue('locationquantityavailable')*1,
                    })
                }
            });
            return true;
        });
        log.debug('location_quantity',location_quantity);

        if(location_quantity.length > 0){
            for(var i = 0; i < SKUIds.length; i++){
                for(var a = 0; a < location_quantity.length; a++){
                    if(SKUIds[i]['item_sku'] == location_quantity[a]['item_id']){
                        item_data.push({
                            item_sku: SKUIds[i]['item_sku'],
                            item_sku_text: SKUIds[i]['item_sku_name'],
                            item_name: SKUIds[i]['item_name'],
                            account: SKUIds[i]['forecast_account'],
                            account_text: SKUIds[i]['forecast_account_name'],
                            site: SKUIds[i]['forecast_site'],
                            data_type: '3',
                            data_type_text: '库存量',
                            location_no: location_quantity[a]['difference_qt']
                        });
                    }
                }
            }
        }

        //店铺净需求
        SKUIds.map(function(line){
            item_data.push({
                item_sku: line.item_sku,
                item_sku_text: line.item_sku_name,
                item_name: line.item_name,
                account: line.forecast_account,
                account_text: line.forecast_account_name,
                site: line.forecast_site,
                data_type: '4',
                data_type_text: '店铺净需求'
            });
        })

        //调拨计划量
        if(SKUIds.length > 0){
            var logistics_cycle = 0, procurement_cycle = 0, other_lead_time = 0;
            SKUIds.map(function(line){
                search.create({
                    type: 'customrecord_supply_chain_lead_time',
                    filters: [
                        { name: 'custrecord_aio_sku', operator: 'is', values: line.item_sku },//line.item_sku 
                    ],
                    columns: [
                        { name: 'custrecord_aio_logistics_cycle'},//物流周期
                        { name: 'custrecord_aio_procurement_cycle'},//采购周期
                        { name: 'custrecord_aio_other_lead_time'}//其他提前周期
                    ]
                }).run().each(function (rec) {
                    logistics_cycle = rec.getValue('custrecord_aio_logistics_cycle');
                    procurement_cycle = rec.getValue('custrecord_aio_procurement_cycle');
                    other_lead_time = rec.getValue('custrecord_aio_other_lead_time');
                    log.debug('other_lead_time',other_lead_time);
                    var need_time = Number(logistics_cycle) + Number(other_lead_time);
                    item_data.push({
                        item_sku: line.item_sku,
                        item_sku_text: line.item_sku_name,
                        item_name: line.item_name,
                        account: line.forecast_account,
                        account_text: line.forecast_account_name,
                        site: line.forecast_site,
                        data_type: '5',
                        data_type_text: '调拨计划量',
                        need_time: need_time
                    });
                });
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
        log.audit('date_from',date_from);
        log.audit('date_to',date_to);
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

        var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '调拨计划', tab: 'custpage_tab' });
        sublist.helpText = "调拨计划结果";
        sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_store_name_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_item_sku_id', label: 'sku_id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_data_type_id', label: '数据类型id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
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
                var need1_zl = 0 , need2_zl = 0, need3_zl = 0,need4_zl = 0;
                var arr_list = {}, arr_data = [];
                for(var a = 0; a < result.length; a++){
                    if(SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']){
                        sublist.setSublistValue({ id: 'custpage_store_name', value: result[a]['account_text'], line: zl });   
                        sublist.setSublistValue({ id: 'custpage_store_name_id', value: result[a]['account'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_item_sku', value: result[a]['item_sku_text'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_item_sku_id', value: result[a]['item_sku'], line: zl });    
                        sublist.setSublistValue({ id: 'custpage_item_name', value: result[a]['item_name'], line: zl });
                        sublist.setSublistValue({ id: 'custpage_data_type', value: result[a]['data_type_text'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_data_type_id', value: result[a]['data_type'], line: zl }); 

                        if(result[a]['data_type'] == 1){//需求量
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

                        if(result[a]['data_type'] == 2){//在途量
                            var transit_no = result[a]['transit_no'];
                            for (var i = week_start; i <= week_end; i++) { 
                                if(transit_no.length > 0){
                                    transit_no.map(function(l){
                                        if(l.item_time == i){
                                            var sub_filed = 'custpage_quantity_week' + i;
                                            sublist.setSublistValue({ id: sub_filed, value: l.item_quantity.toString(), line: zl});  
                                        }
                                    })
                                }
                                
                            }
                            need2_zl = zl;
                            zl++;
                        }

                        var need_no = 0;
                        if(result[a]['data_type'] == 3){//库存量
                            for (var i = week_start; i <= week_end; i++) {
                                var sub_filed = 'custpage_quantity_week' + i;
                                if(i == week_start){
                                    if(result[a]['location_no']){
                                        sublist.setSublistValue({ id: sub_filed, value: result[a]['location_no'].toString(), line: zl});
                                        need_no = result[a]['location_no'];
                                    }
                                }else{
                                    if(result[a]['location_no']){
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

                        if(result[a]['data_type'] == 4){//店铺净需求
                            for (var i = week_start; i <= week_end; i++) { 
                                var sub_filed = 'custpage_quantity_week' + i;
                                var x1 = sublist.getSublistValue({ id : sub_filed, line: need1_zl});
                                var x2 = sublist.getSublistValue({ id : sub_filed, line: need2_zl});
                                var x3 = sublist.getSublistValue({ id : sub_filed, line: need3_zl});
                                var x4 = Number(x3)+Number(x2)-x1;
                                sublist.setSublistValue({ id: sub_filed, value: x4.toString(), line: zl});
                                // arr_list.item_sku = result[a]['item_sku'];
                                // arr_list.account_id = result[a]['account'];
                                // arr_data.push(x4.toString());
                                // arr_list.arr_data = arr_data;
                            }
                            need4_zl = zl;
                            zl++;
                        }
                        
                        if(result[a]['data_type'] == 5){
                            var need_today = new Date(+new Date()+8*3600*1000 - result[a]['need_time']*24*3600*1000);
                            var need_week_today = weekofday(need_today);
                            log.debug('need_week_today',need_week_today);
                            log.debug('arr_list',arr_list);
                            var cc = week_today - need_week_today;
                            for (var index = week_start; index <= week_end; index++) {
                                var sub_filed = 'custpage_quantity_week' + index;
                                var sub_need =  'custpage_quantity_week' + (Number(index) + Number(cc));
                                var x1 = sublist.getSublistValue({ id : sub_need, line: need4_zl});
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
        log.debug('dt',dt);
        var y = dt.getFullYear();
        log.debug('y',y);
        var start = "1/1/" + y;

        log.debug('start',start);

        start = new Date(start);
        
        log.debug('start_1',start);

        starts = start.valueOf();

        log.debug('starts',starts);

        startweek = start.getDay();

        log.debug('startweek',startweek);

        dtweek = dt.getDay();

        log.debug('dtweek',dtweek);

        var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1 ;
        
        log.debug('days',days);

        days = Math.floor(days / 7);

        log.debug('days_1',days);

        return (days + 2);
    }

    return {
        onRequest: onRequest
    }
});
