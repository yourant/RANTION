/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget','../../Helper/Moment.min', 'N/format', 'N/runtime', 'N/record'], 
function(search, ui, moment, format, runtime, record) {
    var SKUIds = [],func_type ,week_rs,acc_skus = {},sku_arrys = [];
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
    function initUI(params) {
        var form = ui.createForm({ title: '调拨计划查询' });
        form.addSubmitButton({ label: '查询' });
        form.addButton({
            id:'button_transfer',
            label : '生成库存转移订单',
            functionName:'createTransferOrders'
        });
        form.addButton({
            id:'button_save',
            label :"保 存",
            functionName:'updateData'
        });
        form.addButton({ 
            id:'button_export',
            label : '导出Excel',
            functionName:'ExportDemandPlan'  
        });
        form.addTab({ id: 'custpage_tab', label: '查询结果' });
        form.addFieldGroup({ id: 'custpage_search_group', tab: 'custpage_tab', label: '查询条件' });
        // form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'item', label: '店铺', container: 'custpage_search_group' });
        form.addField({ id: 'custpage_account_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '所属店铺', container: 'custpage_search_group' });
        // form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customlist9', label: '站点', container: 'custpage_search_group' });
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
            var date_to = format.parse({ value:params.custpage_date_to, type: format.Type.DATE});
            var today = new Date(+new Date()+8*3600*1000);
            var week_objs = weekofday(today, date_from, date_to);
            func_type =week_objs.func_type;
            week_rs =week_objs.weeks;
            log.audit('week_rs', week_rs);
            var today_week = getWeek(today,func_type);
            var md = week_rs[0] - today_week ;
            var abs = Math.abs(md),num=0;
            week_rs.map(function(wek){
                var ff = wek;
                if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                        ff=wek -1;
                var Label = 'W' + ff;
                var der =new Date().getFullYear().toString() +wek;
                var check=true
                search.create({
                    type:"transferorder",
                    filters:[
                        {name:"custbody_replace_demand_bj",operator:"is",values:[der]},
                    ]
                }).run().each(function(dd){
                    check =false
                })
                if( !(md <0 && num <abs) && check)
                week_date.addSelectOption({
                    value : wek,
                    text : Label
                });
                num++
            });
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
            form.addField({ id: 'custpage_select_page', type: ui.FieldType.SELECT, label: '数据选择', container: 'custpage_page_group' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        }
        form.addField({ id: 'custpage_total_count', type: ui.FieldType.TEXT, label: '总sku数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }) .updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
        form.addField({ id: 'custpage_total_page', type: ui.FieldType.INTEGER, label: '总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        form.addField({ id: 'custpage_page_size', type: ui.FieldType.SELECT, label: '选择页数', container: 'custpage_page_group' }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL });
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
        // var nowPage = params.custpage_now_page ? params.custpage_now_page : 1;
        // var pageSize = params.custpage_page_size ? params.custpage_page_size : 50; // 每页数量
        var pageSize = 10; // 每页数量
        var item = params.custpage_item;
        var date_from_p = params.custpage_date_from;
        var date_to_p = params.custpage_date_to;
        if (!date_from_p || !date_to_p) {
            throw "请先输入正确的时间范围";
        }
        var date_from = format.parse({ value:params.custpage_date_from, type: format.Type.DATE});
        var date_to = format.parse({ value:params.custpage_date_to, type: format.Type.DATE});
        if (date_from > date_to) {
            throw "请先输入正确的时间范围";
        }
        var site = params.custpage_site;
        var account = params.custpage_account_store;
        // format.parse({ value:params.custpage_date_from, type: format.Type.DATE});
        // format.parse({ value:params.custpage_date_to, type: format.Type.DATE});
        
        var rsJson = getResult(item, pageSize, nowPage,site,account,date_from,date_to,form); //查询结果
        if(rsJson){
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
        }
       
        return form;
    }

    //保存或更新数据
    function createOrUpdateData(need_result, date_from, date_to){
        try{
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
                        { name: 'custrecord_demand_forecast_l_data_type', operator: 'anyof', values: line.data_type}
                    ]
                }).run().each(function (rec) {
                    bill_id = rec.id;
                });
                var child_bill_data;
                if(bill_id){
                    child_bill_data = record.load({type: 'customrecord_demand_forecast_child',id: bill_id});
                    week_rs.map(function(wek){
                        line.item.map(function(li){
                            if(wek == li.week){
                                var field_name = 'custrecord_quantity_week' + wek;
                                child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity });
                            }
                        })   
                    })
                    var ss = child_bill_data.save();
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
                    child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: line.data_type});
                    child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id});
                    week_rs.map(function(wek){
                        line.item.map(function(li){
                            if(wek == li.week){
                                var field_name = 'custrecord_quantity_week' + wek;
                                child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity });
                            }
                        })   
                    })
                    var ss = child_bill_data.save();
                }
            })
        }catch(e){
            log.debug('e',e);
        }
        
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
        form.getField({ id: 'custpage_page_size' }).defaultValue = nowPage
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
       
    }

    /**
    * 查询结果
    * @param {*} item 
    */
    function getResult(item, pageSize, nowPage, site, account,date_from,date_to,form){
        var rsJson = {} ,limit = 4000,item_data = [];
        var filters_sku = [],skuids = [],location = [];
        var cols= [
            { name:'custrecord_demand_forecast_account'},
            { name:'custrecord_demand_forecast_site'},
            { name:'custrecord_demand_forecast_item_sku'},
            { name: 'custitem_dps_skuchiense',join:"custrecord_demand_forecast_item_sku"},
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
            { name: 'custitem_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品分级
            { name: 'custitemf_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品初始分级
            { name:'custrecord_quantity_week53' , join: 'custrecord_demand_forecast_parent'},
        ],markect_arrys=[];
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
                { name: 'custitem_dps_skuchiense',join:"custrecord_demand_forecast_item_sku"},
                { name: 'custrecord_demand_forecast_site'},
                { name: 'custitem_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品分级
                { name: 'custitemf_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品初始分级
                { name: 'custrecord_market_area',join:"custrecord_demand_forecast_account"}, //产品初始分级
                { name: 'custrecord_aio_fbaorder_location' ,join:"custrecord_demand_forecast_account"},
            ]
        }).run().each(function (rec) {
            SKUIds.push({
                item_sku : rec.getValue(rec.columns[0]),
                forecast_account : rec.getValue(rec.columns[1]),
                item_sku_name : rec.getText(rec.columns[0]),
                forecast_account_name : rec.getText(rec.columns[1]),
                item_name : rec.getValue(rec.columns[2]),
                forecast_site : rec.getValue(rec.columns[3]),
                item_leve : rec.getValue(rec.columns[4]),//产品分级
                itemf_leve : rec.getValue(rec.columns[5]),//产品初始分级
                markect : rec.getValue(rec.columns[6]),//市场
                location : rec.getValue(rec.columns[7])
            });
            location.push(rec.getValue(rec.columns[7]));
            markect_arrys.push(rec.getValue(rec.columns[6]));
            skuids.push(rec.getValue(rec.columns[0]));
            return --limit > 0;
        });
        if(skuids.length ==0)  return false;
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
       
        /** 
         * 1.需求预测
         * 2.店铺库存量
         * 11.调拨在途量
         * 23.修改店铺净需求量
         * 5.调拨计划量
         * 6/22.修改调拨计划量
         */
        // item_data=GetPredictionData (item_data, 1, today, account, skuids, SKUIds, {data_type: '1',data_type_text: '需求预测'},week_rs);
      
    

          // 需求量 - > 销售预测
          var filters = [
            { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: 1 },
            { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
          ];
          if (account) {
            filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
          }
      
          filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids });
      
          if (site) {
            filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site });
          }
          var mySearch_demand_forecast = search.create({
            type: 'customrecord_demand_forecast',
            filters: filters,
            columns: cols
          });
          var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
            pageSize: pageSize
          });
          var totalCount = pageData_demand_forecast.count; // 总数
          var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
          if (totalCount == 0 && pageCount == 0) {
            rsJson.result = [];
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
            log.debug('item_data', item_data);
            return rsJson;
          } else {
            pageData_demand_forecast.fetch({
              index: Number(nowPage - 1)
            }).data.forEach(function (rs) {
              item_data.push({
                item_sku: rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
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
                quantity_week53: rs.getValue(rs.columns[59]) ? rs.getValue(rs.columns[59]) : '',
                item_leve: rs.getValue(rs.columns[57]), // 产品分级
                itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
              });
              sku_arrys.push(rs.getValue(rs.columns[2]));
              acc_skus[rs.getValue(rs.columns[2])+"."+rs.getValue(rs.columns[0])] = rs.getValue(rs.columns[0]);  // sku +acc 
            });
          }
          log.debug("sku_arrys",sku_arrys)
          var pageSizeField = form.getField({ id: 'custpage_page_size' })
          for(var i=1;i<=pageCount;i++){
              pageSizeField.addSelectOption({ value: i, text: i, isSelected: pageSize == i ? true : false })
          }
        //库存量
        var location_quantity = [],temporary_arr = [];
        search.create({
            type: 'item', 
            filters: [
                { name: 'inventorylocation', operator: 'anyof', values: location },
                { name: 'internalid', operator: 'anyof', values: sku_arrys }
            ],
            columns : [
                {name : 'inventorylocation'},
                {name : 'locationquantityavailable'}
            ]
        }).run().each(function (rec) {
            SKUIds.map(function(line){
                var fs = true;
                if (line.item_sku == rec.id && line.location == rec.getValue('inventorylocation')) {
                    location_quantity.map(function(ld){
                        if(ld.item_id == line.item_sku){
                            ld["difference_qt"]  += rec.getValue('locationquantityavailable') * 1
                            fs = false;
                        }
                    });
                    if(fs)
                  location_quantity.push({
                    item_id: rec.id,
                    difference_qt: rec.getValue('locationquantityavailable') * 1
                  });
                }
                temporary_arr.push(rec.id);
            });
            return true;
        });

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
                            data_type: '2',
                            data_type_text: '店铺库存量',
                            item_leve : SKUIds[i]['item_leve'],//产品分级
                            itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级
                            location_no: location_quantity[a]['difference_qt']
                        });
                    }else{
                        if(temporary_arr.indexOf(SKUIds[i]['item_sku']) == -1){
                            item_data.push({
                                item_sku: SKUIds[i]['item_sku'],
                                item_sku_text: SKUIds[i]['item_sku_name'],
                                item_name: SKUIds[i]['item_name'],
                                account: SKUIds[i]['forecast_account'],
                                account_text: SKUIds[i]['forecast_account_name'],
                                site: SKUIds[i]['forecast_site'],
                                data_type: '2',
                                data_type_text: '店铺库存量',
                                item_leve : SKUIds[i]['item_leve'],//产品分级
                                itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级
                                location_no: 0
                            });
                            temporary_arr.push(SKUIds[i]['item_sku']);
                        }
                    }
                }
            }
        }else{
            for(var i = 0; i < SKUIds.length; i++){
                    item_data.push({
                        item_sku: SKUIds[i]['item_sku'],
                        item_sku_text: SKUIds[i]['item_sku_name'],
                        item_name: SKUIds[i]['item_name'],
                        account: SKUIds[i]['forecast_account'],
                        account_text: SKUIds[i]['forecast_account_name'],
                        site: SKUIds[i]['forecast_site'],
                        data_type: '2',
                        data_type_text: '店铺库存量',
                        item_leve : SKUIds[i]['item_leve'],//产品分级
                        itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级
                        location_no: 0
                    });
                    temporary_arr.push(SKUIds[i]['item_sku']);
            }
        }
             //在途量
        // item_data=GetPredictionData (item_data, 11, today, account, skuids, SKUIds, {data_type: '11',data_type_text: '调拨在途量'},week_rs,func_type);
         //调拨在途量 (数据源：to单)
         var transit_num = [];
         search.create({
             type: 'transferorder',
             filters: [
                 { join: 'item', name: 'internalid', operator: 'is', values: sku_arrys },
                 { name: 'custbody_actual_target_warehouse', operator: 'anyof', values: location },  //FBA仓，实际目标仓
                 { name: 'mainline', operator: 'is', values: ['F'] },
                 { name: 'taxline', operator: 'is', values: ['F'] },
                 { name: 'shipping', operator: 'is', values: ['F'] },
                 { name: 'transactionlinetype', operator: 'is', values: 'RECEIVING' }
             ],
             columns: [
                 'item',
                 'custbodyexpected_arrival_time',
                 'quantity',
                 'custbody_actual_target_warehouse'
             ]
         }).run().each(function (result) {
   
             SKUIds.map(function (line) {
                 var kf= true;
                 if (line.item_sku == result.getValue('item') && line.location == result.getValue('custbody_actual_target_warehouse') 
                 ){ 
                    for(var key in acc_skus){
                        if (line.item_sku ==key.split(".")[0]  && line.forecast_account == acc_skus [key] 
                        ){
                            if (result.getValue('custbodyexpected_arrival_time')) {
                                 var item_date = format.parse({ value: result.getValue('custbodyexpected_arrival_time'), type: format.Type.DATE });
                                 var item_time = getWeek(item_date,func_type);
                                 for(var i=0;i<transit_num.length;i++){
                                     if(transit_num[i].item_id ==result.getValue('item') && transit_num[i].item_time == item_time ){
                                        transit_num[i].item_quantity = (transit_num[i].item_quantity * 1 + result.getValue('quantity')* 1).toString();
                                        kf = false;
                                        break;
                                     }
                                 }
                                 if(kf){
                                    transit_num.push({
                                        item_id: result.getValue('item'),
                                        item_time: item_time,
                                        item_quantity: result.getValue('quantity')
                                    });
                                 }
                                 
                             }
                        }
                    }
                    
                 }
             });
             return true;
         });
 
         var need_transit_num = [];
         var po_no = [];
         if (transit_num.length > 0) {
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
 
         if (need_transit_num.length > 0) {
             for (var a = 0; a < need_transit_num.length; a++) {
                 for (var i = 0; i < SKUIds.length; i++) {
                     if (SKUIds[i]['item_sku'] == need_transit_num[a]['item_id']) {
                         item_data.push({
                             item_sku: SKUIds[i]['item_sku'],
                             item_sku_text: SKUIds[i]['item_sku_name'],
                             item_name: SKUIds[i]['item_name'],
                             account: SKUIds[i]['forecast_account'],
                             account_text: SKUIds[i]['forecast_account_name'],
                             site: SKUIds[i]['forecast_site'],
                             data_type: '11',
                             data_type_text: '调拨在途量',
                             item_leve: SKUIds[i]['item_leve'],//产品分级
                             itemf_leve: SKUIds[i]['itemf_leve'],//产品初始分级
                             transit_no: need_transit_num[a]['lineItems']
                         });
                     } else {
                         if (po_no.indexOf(SKUIds[i]['item_sku']) == -1) {
                             item_data.push({
                                 item_sku: SKUIds[i]['item_sku'],
                                 item_sku_text: SKUIds[i]['item_sku_name'],
                                 item_name: SKUIds[i]['item_name'],
                                 account: SKUIds[i]['forecast_account'],
                                 account_text: SKUIds[i]['forecast_account_name'],
                                 site: SKUIds[i]['forecast_site'],
                                 data_type: '11',
                                 data_type_text: '调拨在途量',
                                 item_leve: SKUIds[i]['item_leve'],//产品分级
                                 itemf_leve: SKUIds[i]['itemf_leve'],//产品初始分级
                                 transit_no: 0
                             });
                             po_no.push(SKUIds[i]['item_sku']);
                         }
                     }
                 }
             }
         } else {
             SKUIds.map(function (line) {
                 item_data.push({
                     item_sku: line.item_sku,
                     item_sku_text: line.item_sku_name,
                     item_name: line.item_name,
                     account: line.forecast_account,
                     account_text: line.forecast_account_name,
                     site: line.forecast_site,
                     data_type: '11',
                     data_type_text: '调拨在途量',
                     item_leve: line['item_leve'],//产品分级
                     itemf_leve: line['itemf_leve'],//产品初始分级
                     transit_no: 0
                 });
             })
         }
           
         log.debug("nowPage",nowPage)
        item_data=GetPredictionData (item_data, 23, today, account, sku_arrys, SKUIds, {data_type: '3',data_type_text: '店铺净需求'},week_rs,true,nowPage,acc_skus);

   
          var transport,presT,itm,mar;
          var tansWays = [],trans_arrys = [],presT_arrys = [];
             //查找默认运输方式
          search
          .create({
            type: 'customrecord_sku_site_default_ship',
            filters: [
              { name: 'custrecord_marker', operator: 'anyof', values:markect_arrys },
              { name: 'custrecord_sku_num', operator: 'anyof', values:sku_arrys},
            ],
            columns: [
              { name: 'custrecord_ship' },
              { name: 'custrecord_marker' },
              { name: 'custrecord_sku_num' },
            ]
          })
          .run()
          .each(function (rec) {
            transport = rec.getValue('custrecord_ship');
            mar = rec.getValue('custrecord_marker');
            itm = rec.getValue('custrecord_sku_num');
            tansWays.push(transport)
            var ks = false;
            SKUIds.map(function(li){
                if(ks) return;
                if(li.item_sku == itm && li.markect == mar) {
                    trans_arrys.push({
                        "itms":itm,
                        "acc":li.forecast_account,
                        "transport":transport,
                        "mar":mar,
                    })
                    ks=true;
                } 
            })
            return true;
          });
          if(tansWays.length >0)
            //运输时效
            search
            .create({
            type: 'customrecord_logistics_cycle',
            filters: [
                { name: 'custrecord_market', operator: 'anyof', values:markect_arrys },
                { name: 'custrecord_default_type_shipping', operator: 'anyof', values:tansWays},
            ],
            columns: [
                { name: 'custrecord_prescription' },
                { name: 'custrecord_default_type_shipping' },
                { name: 'custrecord_market' },
            ]
            })
            .run()
            .each(function (rec) {
                mar = rec.getValue('custrecord_market');
                transport = rec.getValue('custrecord_prescription');
                presT = rec.getValue('custrecord_prescription');
            
                trans_arrys.map(function(lt){
                    var ls=true;
                    if( lt.transport ==  transport && lt.mar  == mar){
                        presT_arrys.map(function(lds){
                            if(lds.itms == lt.itm){
                                ls = false;
                            } 
                        })
                        if(ls)
                        presT_arrys.push({
                            "itms":lt.itm,
                            "acc":lt.acc,
                            "transport":transport,
                            "mar":mar,
                            "presT":presT,
                        })
                    }
                });
                return true;
            });
           
        
                SKUIds.map(function(li){
                    var fs =  true;
                    presT_arrys.map(function(dd){
                    if(dd.acc == li.forecast_account && dd.itms == li.item_sku){
                        item_data.push({
                            item_sku: li.item_sku,
                            item_sku_text: li.item_sku_name,
                            item_name: li.item_name,
                            account: li.forecast_account,
                            account_text: li.forecast_account_name,
                            site: li.forecast_site,
                            data_type: '5',
                            data_type_text: '调拨计划量',
                            item_leve : li['item_leve'],//产品分级
                            itemf_leve :  li['itemf_leve'],//产品初始分级
                            need_time: dd.presT
                        });
                        fs = false;
                    }
                    });  
                    if(fs)
                    item_data.push({
                        item_sku: li.item_sku,
                        item_sku_text: li.item_sku_name,
                        item_name: li.item_name,
                        account: li.forecast_account,
                        account_text: li.forecast_account_name,
                        site: li.forecast_site,
                        data_type: '5',
                        data_type_text: '调拨计划量',
                        item_leve : li['item_leve'],//产品分级
                        itemf_leve :  li['itemf_leve'],//产品初始分级
                        need_time: ''
                    });
            })
          
          
         log.debug("调拨计划",item_data)
         // 先查有没有修改的调拨计划量，没有就等于计划量
         item_data=GetPredictionData (item_data, 22, today, account, sku_arrys, SKUIds, {data_type: '6',data_type_text: '修改调拨计划量'},week_rs,true,nowPage,acc_skus);

        // log.debug("11111111111111111111item_data",item_data)
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
        var week_objs = weekofday(today, date_from, date_to);
        func_type =week_objs.func_type;
        week_rs =week_objs.weeks;
        log.audit('week_rs', week_rs);
        var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '调拨计划', tab: 'custpage_tab' });
        sublist.helpText = "调拨计划结果";
        sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_store_name_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_item_sku_id', label: 'sku_id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_item_leve', label: '产品分级', type: ui.FieldType.SELECT , source: 'customlist_product_grading'}).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sublist.addField({ id: 'custpage_item_start_leve', label: '产品初始分级', type: ui.FieldType.SELECT, source: 'customlist_product_grading' }).updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
        sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT });
        sublist.addField({ id: 'custpage_data_type_id', label: '数据类型id', type: ui.FieldType.TEXT }).updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        var today_week = getWeek(today,func_type);
        var md = week_rs[0] - today_week ;
        var abs = Math.abs(md),num=0;
        week_rs.map(function(wek){
            var sub_filed = 'custpage_quantity_week' + wek;
            var ff = wek;
            if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
            var Label = 'W' + ff;
            week_ = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER });  //INTEGER
            week_.defaultValue = '0';
            if(md <0 && num <abs)
            week_.updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
            else
            week_.updateDisplayType({displayType:ui.FieldDisplayType.ENTRY});
            week[wek] = week_;
            var der =new Date().getFullYear().toString() +wek;
            search.create({
                type:"transferorder",
                filters:[
                    {name:"custbody_replace_demand_bj",operator:"is",values:[der]},
                ]
            }).run().each(function(dd){
                week_.updateDisplayType({displayType:ui.FieldDisplayType.INLINE});
            })
            num++;
        });
        for (var s = 1; s < 54; s++) {
            var sub_filed = 'custpage_quantity_weekhi' + s;
            var Label = 'Whi' + s;
            var week_hi = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER });  //INTEGER
            week_hi.defaultValue = '0';
            week_hi.updateDisplayType({displayType:ui.FieldDisplayType.HIDDEN});
        }
        var zl = 0,data_arr = [];
        log.debug("最后拿到的数据::::",acc_skus)
        for(var key in acc_skus){
        for (var z = 0; z < SKUIds.length; z++) {
            if (result.length > 0) {
                var need1_zl, need2_zl, need3_zl,need4_zl,need5_zl;
                for(var a = 0; a < result.length; a++){
                    if(SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']
                    && key.split(".")[0]  == SKUIds[z]['item_sku'] 
                    && acc_skus[key] == SKUIds[z]['forecast_account']
                    ){ 
                        sublist.setSublistValue({ id: 'custpage_store_name', value: result[a]['account_text'], line: zl });   
                        sublist.setSublistValue({ id: 'custpage_store_name_id', value: result[a]['account'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_item_sku', value: result[a]['item_sku_text'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_item_sku_id', value: result[a]['item_sku'], line: zl });  
                        if(result[a]['item_name'])  
                        sublist.setSublistValue({ id: 'custpage_item_name', value: result[a]['item_name'], line: zl });
                        sublist.setSublistValue({ id: 'custpage_data_type', value: result[a]['data_type_text'], line: zl }); 
                        sublist.setSublistValue({ id: 'custpage_data_type_id', value: result[a]['data_type'], line: zl }); 
                        if(result[a]['item_leve'])
                        sublist.setSublistValue({ id: 'custpage_item_leve', value: result[a]['item_leve'], line: zl }); 
                        if(result[a]['itemf_leve'])
                        sublist.setSublistValue({ id: 'custpage_item_start_leve', value: result[a]['itemf_leve'], line: zl }); 

                        if(result[a]['data_type'] == 1){//店铺需求量  -> 销售预测
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                 sublist.setSublistValue({ id: sub_filed, value: result[a]['quantity_week'+wek]?result[a]['quantity_week'+wek].split(" ")[1]:"0", line: zl}); 
                            });
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                sublist.setSublistValue({ id: sub_filed, value: result[a]['quantity_week'+s]?result[a]['quantity_week'+s].split(" ")[1]:"0", line: zl}); 
                            }
                            need1_zl = zl;
                        }
                        var need_no = 0
                        if(result[a]['data_type'] == 2){ //店铺库存量 = >
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                if(wek == week_rs[0]){
                                    if(result[a]['location_no']){
                                        need_no = result[a]['location_no'];
                                        sublist.setSublistValue({ id: sub_filed, value: result[a]['location_no'].toString(), line: zl});
                                    }else{
                                        need_no = 0;
                                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl});
                                    }
                                }else{
                                    var need_sub_filed = 'custpage_quantity_weekhi' + (wek - 1);
                                    var x1 = need_no;
                                    var x2 = need3_zl || need3_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need3_zl }) : 0;
                                    var x3 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need1_zl }) : 0;
                                    need_no = -(Number(x3) - (Number(x1) + Number(x2)));//需求预测 - (在途+ 库存)
                                    sublist.setSublistValue({ id: sub_filed, value: need_no.toString() ? need_no.toString() : '0', line: zl });
                                }
                            });
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                if(s == 1){
                                    if(result[a]['location_no']){
                                        sublist.setSublistValue({ id: sub_filed, value: result[a]['location_no'].toString(), line: zl});
                                    }else{
                                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl});
                                    }
                                }else{
                                    var need_sub_filed = 'custpage_quantity_weekhi' + (s - 1);
                                    var x1 = need_no;
                                    var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need3_zl }) : 0;
                                    var x3 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need1_zl }) : 0;
                                    need_no = -(Number(x3) - (Number(x1) + Number(x2)));
                                    sublist.setSublistValue({ id: sub_filed, value: need_no.toString() ? need_no.toString() : '0', line: zl });
                                }
                            }
                            need2_zl = zl;
                        }
                        if (result[a]['data_type'] == 11) {//调拨在途量
                            var arr_list = [], data_josn = {};
                            data_josn.item_sku = result[a]['item_sku'];
                            data_josn.account_id = result[a]['account'];
                            data_josn.data_type = result[a]['data_type'];
                            var transit_no = result[a]['transit_no'];
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                if (transit_no.length > 0) {
                                    var line_arr = [];
                                    var quan_item = 0;
                                    transit_no.map(function (l) {
                                     
                                        if (l.item_time == wek) {
                                            quan_item = l.item_quantity;
                                            sublist.setSublistValue({ id: sub_filed, value: l.item_quantity.toString(), line: zl });
                                        }
                                        line_arr.push(l.item_time);
                                    })
                                    if (line_arr.indexOf(wek) == -1) {
                                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                                    }
                                    arr_list.push({
                                        week:wek,
                                        item_quantity: quan_item
                                    });
                                } else {
                                    sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                                    arr_list.push({
                                        week: wek,
                                        item_quantity: 0
                                    });
                                }
                            })
                            
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                if (transit_no.length > 0) {
                                    var line_arr = [];
                                    var quan_item = 0;
                                    transit_no.map(function (l) {
                                        if (l.item_time == s) {
                                            quan_item = l.item_quantity;
                                            sublist.setSublistValue({ id: sub_filed, value: l.item_quantity.toString(), line: zl });
                                        }
                                        line_arr.push(l.item_time);
                                    })
                                    if (line_arr.indexOf(s) == -1) {
                                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                                    }
                                    arr_list.push({
                                        week:s,
                                        item_quantity: quan_item
                                    });
                                } else {
                                    sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                                    arr_list.push({
                                        week: s,
                                        item_quantity: 0
                                    });
                                }
                            }
                            data_josn.item = arr_list;
                            data_arr.push(data_josn);
                            need3_zl = zl;
                        }
                        
                        if(result[a]['data_type'] == 3){//  店铺净需求量 = 1需求 - 2库存 - 3在途
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                    var x1 =  sublist.getSublistValue({ id: sub_filed, line: need1_zl}); //需求预测 
                                    var x2 =  sublist.getSublistValue({ id: sub_filed, line: need2_zl}); //店铺库存 
                                    var x3 =  sublist.getSublistValue({ id: sub_filed, line: need3_zl}); //需求预测 
                                    var x4 = Math.round(x1 - x2 - x3);
                                    sublist.setSublistValue({ id: sub_filed, value:Math.round(x4) ?Math.round(x4).toFixed(0)  :"0", line: zl}); 
                                // var dk = sublist.getSublistValue({ id: sub_filed, line: zl-2}); 
                                // //查看店铺库存量是否为0，为零则需要设置净需求的负数
                                // if(dk==0){
                                //     sublist.setSublistValue({ id: sub_filed, value:(Math.round(result[a]['quantity_week'+(wek-1)] ?- Math.round(result[a]['quantity_week'+(wek-1)]) :0)).toFixed(0), line: zl-2}); 
                                // }
                            })
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                    var x1 =  sublist.getSublistValue({ id: sub_filed, line: need1_zl}); //需求预测 
                                    var x2 =  sublist.getSublistValue({ id: sub_filed, line: need2_zl}); //店铺库存 
                                    var x3 =  sublist.getSublistValue({ id: sub_filed, line: need3_zl}); //需求预测 
                                    var x4 = Math.round(x1 - x2 - x3);
                                    sublist.setSublistValue({ id: sub_filed, value:Math.round(x4) ?Math.round(x4).toFixed(0)  :"0", line: zl}); 
                            }
                            need4_zl = zl;
                        }
                        if(result[a]['data_type'] == 23){//  修改净需求量
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                var x4  = result[a]['quantity_week'+wek]
                                    sublist.setSublistValue({ id: sub_filed, value:Math.round(x4) ?Math.round(x4).toFixed(0)  :"0", line: zl}); 
                            })
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                var x4  = result[a]['quantity_week'+s]
                                    sublist.setSublistValue({ id: sub_filed, value:Math.round(x4) ?Math.round(x4).toFixed(0)  :"0", line: zl}); 
                            }
                            need4_zl = zl;
                        }
                         
                        
                        if(result[a]['data_type'] == 5){//调拨计划量5 ，根据店铺净需求进行物流周期倒排
                            var need_today = new Date(+new Date()+8*3600*1000 - result[a]['need_time']*24*3600*1000);
                            var need_week_today = getWeek(need_today,func_type);
                            var week_today = getWeek(new Date(+new Date()+8*3600*1000),func_type);
                            var cc = week_today - need_week_today; 
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                var sum  = Number(wek) + Number(cc);
                                if(sum >53)  sum = sum -53;
                                var sub_need =  'custpage_quantity_weekhi' + sum; //店铺净需求量 物流周期对应的周
                                //店铺净需求量 物流周期对应的周的量
                                var x1 = need4_zl || need4_zl == 0 ? sublist.getSublistValue({ id : sub_need, line: need4_zl}) : 0; 
                                sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl});
                            })
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                var sum  = Number(s) + Number(cc);
                                if(sum >53)  sum = sum -53;
                                var sub_need =  'custpage_quantity_weekhi' + sum; //店铺净需求量 物流周期对应的周
                                var x1 = need4_zl || need4_zl == 0 ? sublist.getSublistValue({ id : sub_need, line: need4_zl}) : 0; 
                                sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl});
                            }
                            need5_zl = zl;
                        }

                        if(result[a]['data_type'] == 6 ){ //修改调拨计划量6或者22
                            var arr_list = [], data_josn = {};
                            data_josn.item_sku = result[a]['item_sku'];
                            data_josn.account_id = result[a]['account'];
                            data_josn.data_type = result[a]['data_type'];
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                var x1 = need5_zl || need5_zl == 0 ? sublist.getSublistValue({ id : 'custpage_quantity_weekhi'+wek, line: need5_zl}) : 0;
                                sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl});
                                arr_list.push({
                                    week: wek,
                                    item_quantity: x1 ? x1 : 0
                                });
                            })
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                var x1 = need5_zl || need5_zl == 0 ? sublist.getSublistValue({ id : sub_filed, line: need5_zl}) : 0;
                                sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl});
                            }
                            data_josn.item = arr_list;
                            data_arr.push(data_josn);
                        }
                        if( result[a]['data_type'] == 22){//修改调拨计划量6或者22
                            var arr_list = [], data_josn = {};
                            data_josn.item_sku = result[a]['item_sku'];
                            data_josn.account_id = result[a]['account'];
                            data_josn.data_type = result[a]['data_type'];
                            week_rs.map(function(wek){
                                var sub_filed = 'custpage_quantity_week' + wek;
                                sublist.setSublistValue({ id: sub_filed, value:result[a]['quantity_week'+wek] ?result[a]['quantity_week'+wek] :"0", line: zl}); 
                                arr_list.push({
                                    week: wek,
                                    item_quantity:result[a]['quantity_week'+wek]? result[a]['quantity_week'+wek] :"0"
                                });
                            });
                            for (var s = 1; s < 54; s++) {
                                var sub_filed = 'custpage_quantity_weekhi' + s;
                                sublist.setSublistValue({ id: sub_filed, value:result[a]['quantity_week'+s] ?result[a]['quantity_week'+s] :"0", line: zl});
                            }
                            data_josn.item = arr_list;
                            data_arr.push(data_josn);
                        }
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
    function weekofday(data, date_from, date_to) {
        var weeks = [],dat_from,dat_to ,func_type;
        // //获取年份
        var YearDer_to = date_to.getFullYear() - data.getFullYear();
        if (YearDer_to > 0) {//跨明年
            log.debug("跨明年");
            //如果跨年了，判断明年的第一天是星期几
            //是周 5、6、7，这几天，归为今年的是最后一周
            var y = date_to.getFullYear();
            var dd = "1/1/" + y;
            dd = new Date(dd);
            if(dd.getDay() > 4|| dd.getDay() == 0){
                //并且 明年的 第一周归为去年的 最后一周 ，就是明年的第一周不要了
                dat_from = getWeek(date_from)
                for(var i=dat_from;i<=53;i++){
                    weeks.push(i) 
                }
  
                dat_to = getWeek(date_to);
                for(var i=2;i<=dat_to;i++){
                    weeks.push(i) 
                }
                func_type = "B"
            }else{
                //否则 去年的最后一周归为明年的第一周，就是去年的最后一周不要了
                dat_from = getWeek(date_from)
                for(var i=dat_from;i<=52;i++){
                    weeks.push(i) 
                }
  
                dat_to = getWeek(date_to);
                for(var i=1;i<=dat_to;i++){
                    weeks.push(i) 
                }
                func_type = "C"
            }
  
        } else {
            dat_to = getWeek(date_to);
            dat_from = getWeek(date_from);
            for(var i=dat_from;i<=dat_to;i++){
                weeks.push(i) 
            }
            func_type = "A"
        }
        return {"weeks":weeks,"func_type":func_type} ;
    }
  
    function getWeek(day,func_type) {
        var d1 = new Date(day);
        var d2 = new Date(day);
        d2.setMonth(0);
        d2.setDate(1);
        var numweekf = d2.getDay();
        var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
        var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
        var num = Math.ceil(days / 7);
        if(func_type == "B" && num == 1){
            num = 53
        }else if(func_type == "C" && num == 53){
            num = 1
        }
        return num;
    }
    /**  
   * 搜索销售预测数据
   */
  function GetPredictionData (item_data, datatype, today, account, skuids, SKUIds, params,week_rs,Double,nowPage,acc_skus) {
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: datatype },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }
    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids })
    var cols= [
        { name:'custrecord_demand_forecast_account'},
        { name:'custrecord_demand_forecast_site'},
        { name:'custrecord_demand_forecast_item_sku'},
        { name: 'custitem_dps_skuchiense',join:"custrecord_demand_forecast_item_sku"},
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
        { name: 'custitem_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品分级
        { name: 'custitemf_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品初始分级
        { name:'custrecord_quantity_week53' , join: 'custrecord_demand_forecast_parent'},
    ]
    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    });
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: 10
    });
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
  
    log.audit("pageCount",pageCount)
    log.audit("totalCount",totalCount)
    log.audit("skuids",skuids)
    var item_data16 = [];
    if (totalCount == 0 && pageCount == 0) {
        SKUIds.map(function (line) {
          item_data.push({
            item_sku: line.item_sku,
            item_sku_text: line.item_sku_name,
            item_name: line.item_name,
            account: line.forecast_account,
            account_text: line.forecast_account_name,
            site: line.forecast_site,
            data_type: params.data_type,
            data_type_text: params.data_type_text,
            item_leve: line.item_leve,
            itemf_leve: line.itemf_leve,
          });
        });
    } else {
      pageData_demand_forecast.fetch({
        index: Number(nowPage - 1 ) 
      }).data.forEach(function (rs) {
        for(var key_acc in acc_skus){
            if(rs.getValue(rs.columns[2]) == key_acc.split(".")[0] && rs.getValue(rs.columns[0]) == key_acc.split(".")[1]){
                item_data.push({
                    item_sku:rs.getValue(rs.columns[2]),
                    item_sku_text: rs.getText(rs.columns[2]),
                    item_name: rs.getValue(rs.columns[3]),
                    account: rs.getValue(rs.columns[0]),
                    account_text: rs.getText(rs.columns[0]),
                    site: rs.getValue(rs.columns[1]),
                    data_type: rs.getValue(rs.columns[4]),
                    data_type_text: rs.getText(rs.columns[4]),
                    item_leve : rs.getValue(rs.columns[57]),//产品分级
                    itemf_leve : rs.getValue(rs.columns[58]),//产品初始分级
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
                    quantity_week53: rs.getValue(rs.columns[59]),
                    
                });
                item_data16.push(key_acc);
            }
        }
        
      })
      log.debug("item_data16",item_data16)
      for(var key_acc in acc_skus){
      if(item_data16.indexOf(key_acc) == -1 ){
          SKUIds.map(function(li){
              if(li.item_sku == key_acc.split(".")[0] && li.forecast_account == key_acc.split(".")[1]){
                  var objs =  {
                      item_sku: li.item_sku,
                      item_sku_text: li.item_sku_name,
                      item_name: li.item_name,
                      account: li.forecast_account,
                      account_text: li.forecast_account_name,
                      site: li.forecast_site,
                      data_type: params.data_type,
                      data_type_text:params.data_type_text,
                      item_leve : li['item_leve'],//产品分级
                      itemf_leve : li['itemf_leve'],//产品初始分级
                  };
                  for(var i=1;i<54;i++){
                      objs["quantity_week"+i] = "0";
                  }
                  item_data.push(objs);
              }
             
          });
       }
      }
    }
    
    return item_data;
  }

    return {
        onRequest: onRequest
    }
});
