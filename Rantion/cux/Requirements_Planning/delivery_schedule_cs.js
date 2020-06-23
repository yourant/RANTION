/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-09 11:41:53
 * @LastEditTime: 2020-05-09 16:10:05
 * @FilePath: \Rantion_sandbox\Rantion\cux\Requirements_Planning\delivery_schedule_cs.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/Moment.min','N/url', 'N/ui/dialog', 'N/https',"N/runtime","N/search","N/record","N/currentRecord","N/format"], 
function(moment,url, dialog, https,runtime,search,record,currentRecord ,format ) {
    var rec;
    // var report_Suitelet;
    var sublistId = 'custpage_sublist';
    function pageInit(context) {
        // rec = context.currentRecord; //当前记录
        // // report_Suitelet = url.resolveScript({
        // //     scriptId: 'customscript_delivery_schedule_sl',
        // //     deploymentId: 'customdeploy_delivery_schedule_sl'
        // // });
        // var count = rec.getLineCount({
        //     sublistId: sublistId
        // });
        // console.log('count',count);
    }

    function saveRecord(context) {
        return true
    }

    function validateField(context) {
        if (context.fieldId == 'custpage_select_page') {
            selectPage();
        } else if (context.fieldId == 'custpage_page_size') {
            pigeSizeChange();
        }
        return true
    }

    function fieldChanged(context) {
        var cur = context.currentRecord;
        var fieldId = context.fieldId;

        var data_type_id = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id'});
        console.log("data_type_id:"+data_type_id)
        if(fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to' && data_type_id != 8  && data_type_id != 9){    
            function success(result) { console.log('Success with value: ' + result); window.location.reload(true);}
            function failure(reason) { console.log('Failure: ' + reason) }
    
            dialog.alert({
                title: '提示',
                message: '不允许进行修改！' 
            }).then(success).catch(failure);
            return;
        }else{
            var count = cur.getLineCount({sublistId: sublistId}); //获取列表总行数
            var currIndex = cur.getCurrentSublistIndex({sublistId: sublistId}); //获取当前的行数
            //获取当前行所需的数据
            if(data_type_id == 8){    // x修改交货量
                var data = [];
                var item_week = fieldId.replace(/custpage_quantity_week/, "custrecord_quantity_week");
                // data.push({
                //     item_id: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku_id'}),
                //     item_account: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name_id'}),
                //     item_quantity: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: fieldId}),
                //     item_type: data_type_id,
                //     item_week: item_week
                // })
                // var link = url.resolveScript({
                //     scriptId : 'customscript_modified_quantity_rl',
                //     deploymentId:'customdeploy_modified_quantity_rl'
                // });
                // var header = {
                //     "Content-Type":"application/json;charset=utf-8",
                //     "Accept":"application/json"
                // }
                // var body = {
                //     data : data
                // }
                // https.post({
                //     url : link,
                //     body : body,
                //     headers : header
                // })
                var qualifiedNumber = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: context.fieldId});
                var store_name = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name', line: currIndex});
                var item_sku = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku', line: currIndex});
                //获取下一行的数据
                for(var i = 0; i < count; i++){
                    var data_type_id1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id', line: i});
                    var store_name1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name', line: i});
                    var item_sku1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku', line: i});
                    if(data_type_id1 == 9 && store_name1 == store_name && item_sku == item_sku1){
                        cur.selectLine({ sublistId: sublistId, line: i });
                        cur.setCurrentSublistValue({ sublistId: sublistId, fieldId: context.fieldId, value: qualifiedNumber });
                        cur.commitLine({ sublistId: sublistId });
                        return;
                    }
                }
            }
        }
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {
        return true
    }

    function validateInsert(context) {
        return true
    }

    function validateLine(context) {
        return true
    }

    function sublistChanged(context) {
        
    }

    /**
     * 数据选择
     * 
     * @returns
     */
    function selectPage() {
        var custpage_item = rec.getValue('custpage_item');
        var custpage_date_from = rec.getText('custpage_date_from');
        var custpage_date_to = rec.getText('custpage_date_to');
        var custpage_now_page = rec.getValue('custpage_now_page');
        var custpage_total_page = rec.getValue('custpage_total_page');
        var custpage_select_page = rec.getValue('custpage_select_page');
        var custpage_page_size = rec.getValue('custpage_page_size');

        if (custpage_total_page != null && custpage_total_page != '') {

            window.location = reportSuitelet + '&' + serializeURL({
                action: 'search',
                custpage_item: custpage_item,
                custpage_date_from: custpage_date_from,
                custpage_date_to: custpage_date_to,
                custpage_now_page: custpage_select_page,
                custpage_page_size: custpage_page_size
            });

        }
    }

    function pigeSizeChange() {

        var custpage_item = rec.getValue('custpage_item');
        var custpage_date_from = rec.getText('custpage_date_from');
        var custpage_date_to = rec.getText('custpage_date_to');
        var custpage_now_page = rec.getValue('custpage_now_page');
        var custpage_total_page = rec.getValue('custpage_total_page');
        var custpage_select_page = rec.getValue('custpage_select_page');
        var custpage_page_size = rec.getValue('custpage_page_size');

        if (custpage_total_page != null && custpage_total_page != '') {
            if (parseInt(custpage_now_page) - 1 > 0) {
                window.location = url + '&' + serializeURL({
                    action: 'search',
                    custpage_item: custpage_item,
                    custpage_date_from: custpage_date_from,
                    custpage_date_to: custpage_date_to,
                    custpage_now_page: 1,
                    custpage_page_size: custpage_page_size
                });
            }
        }

    }

    /**
     * 序列化url参数
     * 
     * @param obj
     * @returns
     */
    function serializeURL(obj) {
        var str = [];
        for (var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        return str.join("&");
    }
    function updateData(){
        var sublistId = 'custpage_sublist';
        var curr = currentRecord.get();
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var week_from = weekofday(date_from);
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var week_to = weekofday(date_to);
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat);
        var item_arr6 =[] ,item_arr5=[]
        var quantity = 0;
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            if(data_type == 8){ //修改交货量
                quantity = 0
                    for(var a = week_from; a < week_to + 1; a++){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        item_arr6.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: a,
                            line:i-1, //修改量在计划的下一行
                            data_type:16,  // 需求预测数据类型 中的16 -确认交货量
                            item_quantity: quantity
                        })
                        item_arr6.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: a,
                            line:i, 
                            data_type:15,  //需求预测数据类型 中的15 - 修改量
                            item_quantity: quantity
                        })
                    }
            }
            if(data_type == 7){ //计划量
                quantity = 0
                for(var a = week_from; a < week_to + 1; a++){
                        quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                            item_arr5.push({
                                item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                                account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                                week_date: a,
                                line:i,
                                data_type: 14,  // 需求预测数据类型 中的14 -交货计划量
                                item_quantity: quantity
                            })
                }
               
        }
        }
        var link = url.resolveScript({
            scriptId : 'customscript_allocation_plan_rl',
            deploymentId:'customdeploy_allocation_plan_rl'
        });
        var header = {
            "Content-Type":"application/json;charset=utf-8",
            "Accept":"application/json"
        }
        var body = {
            item_arr5 : item_arr5,
            item_arr6 : item_arr6,
            today : today,
            PlanType : ["20","21"],  //交货计划，补货计划 例外信息类型
        }

        https.post({
            url : link,
            body : body,
            headers : header
        })
     
      
       alert("保存成功")
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

 /**
    * 记录建议处理情况
    * @param {*} line 
    * @param {*} today 
    * @param {*} field_name 
    * @param {*} defer 
    */
   function SetDeferRec(line,today,field_name,defer,suggestionType){
    var forecast_id;
    search.create({
        type: 'customrecord_demand_forecast',
        filters: [
            { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_id },
            { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id }
        ]
    }).run().each(function (rec) {
        forecast_id = rec.id;
    });
//创建建议处理情况记录
    var defer_id
    search.create({
        type: 'customrecord_demand_forecast_child',
        filters: [
            { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_id },
            { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id },
            { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: today},
            { name: 'custrecord_demand_forecast_l_data_type', operator: 'anyof', values: suggestionType}  
        ]
    }).run().each(function (rec) {
        defer_id = record.load({type:"customrecord_demand_forecast_child",id:rec.id});
    });
    if(!defer_id)
        defer_id = record.create({type:"customrecord_demand_forecast_child"})
        var need_today = new Date();
        defer_id.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: need_today });
        defer_id.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: suggestionType});
        defer_id.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id});
        defer_id.setValue({ fieldId: field_name, value:defer});
        var ss = defer_id.save()
        console.log("建议处理情记录成功:"+ ss)
        log.debug("建议处理情记录成功 "+ss,"suggestionType:"+suggestionType+",defer："+defer+",field_name："+field_name)
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
        updateData:updateData,
        sublistChanged: sublistChanged
    }
});