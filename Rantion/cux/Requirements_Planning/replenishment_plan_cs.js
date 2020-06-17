/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/Moment.min','N/currentRecord', 'N/url', 'N/https', 'N/ui/dialog', 'N/format',"N/runtime","N/search","N/record"],
 function(moment,currentRecord, url, https, dialog, format,runtime,search,record) {

    var sublistId = 'custpage_sublist'
    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        console.log('fieldId',context.fieldId);
        var cur = context.currentRecord;
        var count = cur.getLineCount({sublistId: sublistId}); //获取列表总行数
        console.log('count----------',count);
        var currIndex = cur.getCurrentSublistIndex({sublistId: sublistId}); //获取当前的行数
        console.log('currIndex-----------',currIndex);
        //获取当前行所需的数据
        var data_type_id = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id'});
        console.log('data_type_id---------',data_type_id);
        var qualifiedNumber = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: context.fieldId});
            console.log('qualifiedNumber-----------',qualifiedNumber);
        if(data_type_id == 2){  //补货修改量
            
            var store_name = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name', line: currIndex});
            console.log('store_name-----------',store_name);
            var item_sku = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku', line: currIndex});
            console.log('item_sku------------',item_sku);
            //获取下一行的数据
            for(var i = 0; i < count; i++){
                var data_type_id1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id', line: i});
                var store_name1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name', line: i});
                var item_sku1 = cur.getSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku', line: i});
                if(data_type_id1 == 4 && store_name1 == store_name && item_sku == item_sku1){
                    console.log('i-----------',i);
                    cur.selectLine({ sublistId: sublistId, line: i });
                    console.log('2222222222-----------',i);
                    cur.setCurrentSublistValue({ sublistId: sublistId, fieldId: context.fieldId, value: qualifiedNumber });
                    console.log('23333333-----------',i);
                    cur.commitLine({ sublistId: sublistId });
                    console.log('444444-----------',i);
                    return;
                }
            }
        }
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

    function createRequisitionOrders(){
        var sublistId = 'custpage_sublist';
        var curr = currentRecord.get();
        var week_date = curr.getValue('custpage_week_date').toString();
        console.log(week_date + '---------------week_date');
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var week_from = weekofday(date_from);
        console.log(week_from + '---------------week_from');
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var week_to = weekofday(date_to);
        console.log(week_to + '------------------------week_to');
        var week_arr = week_date.split(',');
        console.log(week_arr + '------------------------week_arr');
        var item_arr = [],item_arr5=[];
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            var quantity = 0;
            if(data_type == 4){  //补货量
                week_arr.map(function(line){
                    for(var a = week_from; a < week_to + 1; a++){
                        if(a == line){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        }
                    }
                    log.debug("quatity",quantity)
                   
                    if(quantity>0){
                        item_arr.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: line,
                            item_quantity: quantity
                        })
                    }
                })
                
            }
            if(data_type == 1){  //倒排补货量
                week_arr.map(function(line){
                    for(var a = week_from; a < week_to + 1; a++){
                        if(a == line){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        }
                    }
                    log.debug("quatity",quantity)
                   
                    if(quantity>0){
                        item_arr5.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: line,
                            item_quantity: quantity
                        })
                    }
                })
                
            }
        }


        console.log(item_arr);
        if(item_arr.length == 0) {
            var options = {
                title: "生成库存转移单",
                message: "数据错误"
            };
            dialog.confirm(options).then(success).catch(failure);
        }else{
            var bill_id
            item_arr.map(function(itls){
                search.create({
                    type: 'customrecord_demand_forecast_child',
                    filters: [
                        { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: itls.item_id },
                        { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_account', operator: 'anyof', values: itls.account_id },
                        { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: today},
                        { name: 'custrecord_demand_forecast_l_data_type', operator: 'anyof', values: itls.data_type}
                    ]
                }).run().each(function (rec) {
                    bill_id = rec.id;
                });
                log.debug('bill_id',bill_id);
                var child_bill_data;
                if(bill_id){
                    child_bill_data = record.load({type: 'customrecord_demand_forecast_child',id: bill_id});
                    var field_name = 'custrecord_quantity_week' + itls.week_date;
                    child_bill_data.setValue({ fieldId: field_name, value: itls.item_quantity });
                    child_bill_data.save();
                }else{
                    var need_today = new Date();
                    var forecast_id;
                    search.create({
                        type: 'customrecord_demand_forecast',
                        filters: [
                            { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: itls.item_id },
                            { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: itls.account_id }
                        ]
                    }).run().each(function (rec) {
                        forecast_id = rec.id;
                    });
                    log.debug('forecast_id',forecast_id);
                    child_bill_data = record.create({ type: 'customrecord_demand_forecast_child' });
                    child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: need_today });
                    child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: itls.data_type});
                    child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id});
                    var field_name = 'custrecord_quantity_week' + itls.week_date;
                    child_bill_data.setValue({ fieldId: field_name, value: itls.item_quantity });
                    child_bill_data.save();
                }
                  
                for(var i =0;i<item_arr5.length;i++){
                    //属于同一行，并且同一周
                   if(itls.line == item_arr5[i].line  && itls.week_date ==item_arr5[i].week_date){
                            //差异情况，修改调拨计划量 - 调拨计划量
                    var fs = Number(itls.item_quantity) - Number(item_arr5[i].item_quantity) 
                    if(fs!=0){
                        //记录差异情况
                        // 21 交货计划建议处理情况
                        SetDeferRec(itls,today,'custrecord_quantity_week' + itls.week_date,fs,21)
                    }
                   }
            
                }
    
            })
            var options = {
                title: "生成库存转移单",
                message: '是否确认生成请购单？'
            };
            dialog.confirm(options).then(success1).catch(failure);
        }
        function success(result) { 
            console.log("Success with value " + result);
        }

        function success1(result) {
            console.log("Success1 with value " + result);
            if(result == true){
                var link = url.resolveScript({
                    scriptId : 'customscript_replenishment_plan_rl',
                    deploymentId:'customdeploy_replenishment_plan_rl'
                });
                var header = {
                    "Content-Type":"application/json;charset=utf-8",
                    "Accept":"application/json"
                }
                var body = {
                    items : item_arr,
                    week : week_arr
                }
        
                var response = https.post({
                    url : link,
                    body : body,
                    headers : header
                })
                dialog.alert({
                    title: JSON.parse(response.body).status,
                    message: JSON.parse(response.body).data 
                }).then(success2).catch(failure);
            }
        }

        function success2(reason) { 
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) { 
            console.log("Failure: " + reason); 
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
        sublistChanged: sublistChanged,
        createRequisitionOrders: createRequisitionOrders
    }
});
