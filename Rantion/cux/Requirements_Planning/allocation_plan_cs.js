/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/Moment.min','N/currentRecord', 'N/url', 'N/https', 'N/ui/dialog', 'N/format',"N/runtime","N/search","N/record"], 
function(moment,currentRecord, url, https, dialog, format,runtime,search,record) {
    var sublistId = 'custpage_sublist';
    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        var cur = context.currentRecord;
        var fieldId = context.fieldId;
        var data_type_id = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id'});                                    
        if(fieldId != 'custpage_week_date' && fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to'
         && data_type_id != 6){ //不等于修改调拨计划量   
            function success(result) { console.log('Success with value: ' + result); window.location.reload(true);}
            function failure(reason) { console.log('Failure: ' + reason) }
    
            dialog.alert({
                title: '提示',
                message: '不允许进行修改！' 
            }).then(success).catch(failure);
            return;
        }else if(data_type_id ==6){
            //记录差异情况
            return
           
           
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

    function createTransferOrders(){
        var sublistId = 'custpage_sublist';
        var curr = currentRecord.get();
        var week_date = curr.getValue('custpage_week_date').toString();
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var week_from = weekofday(date_from);
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var week_to = weekofday(date_to);
        var week_arr = week_date.split(',');
        var item_arr = [];
        var number1,number2
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            number1=0
            number2=0
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            var quantity = 0;
            if(data_type == 6){ //修改调拨计划量
                week_arr.map(function(line){
                    for(var a = week_from; a < week_to + 1; a++){
                        if(a == line){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        }
                    }
                    if(quantity){
                        number2 = Math.abs(quantity)
                        item_arr.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: line,
                            item_quantity: Math.abs(quantity)
                        })
                    }
                })
            }else if(data_type == 5){
                week_arr.map(function(line){
                    for(var a = week_from; a < week_to + 1; a++){
                        if(a == line){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        }
                    }
                    if(quantity){
                        number1 = Math.abs(quantity)
                    }
                })
            }
        }
        console.log(item_arr);
        function success(result) { 
            console.log("Success with value " + result);
        }

        function success1(result) {
            console.log("Success1 with value " + result);
            if(result == true){
                var link = url.resolveScript({
                    scriptId : 'customscript_allocation_plan_rl',
                    deploymentId:'customdeploy_allocation_plan_rl'
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

        if(item_arr.length == 0) {
            var options = {
                title: "生成库存转移单",
                message: "未选择生成周或生成周下面的调拨计划量为空不能进行生成库存转移单操作！"
            };
            dialog.confirm(options).then(success).catch(failure);
        }else{
            var options = {
                title: "生成库存转移单",
                message: '是否确认生成库存转移单？'
            };
            dialog.confirm(options).then(success1).catch(failure);
        }
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
        log.debug("today:",today)
        var item_arr6 =[] ,item_arr5=[]
        var quantity 
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            if(data_type == 6){ //修改调拨计划量
                quantity = 0
                    for(var a = week_from; a < week_to + 1; a++){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        item_arr6.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: a,
                            line:i,
                            data_type:22,  // 需求预测数据类型 中的22 -修改调拨计划量
                            item_quantity: quantity
                        })
                    }
            }
            if(data_type == 5){ //调拨计划量
                quantity = 0
                for(var a = week_from; a < week_to + 1; a++){
                        quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                            item_arr5.push({
                                item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                                account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                                week_date: a,
                                line:i+1,
                                data_type: 6,  // 需求预测数据类型 中的6 -调拨计划量
                                item_quantity: quantity
                            })
                }
               
        }
        }
        var bill_id
        log.debug("item_arr6:",item_arr6)
        log.debug("item_arr5:",item_arr5)
       
        item_arr6.map(function(itls){
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
                log.debug("need_today:",need_today)
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
                log.debug("itls.line:"+itls.line,"item_arr5[i].line:"+item_arr5[i].line)
                log.debug("itls.week_date:"+itls.week_date,"item_arr5[i].week_date:"+item_arr5[i].week_date)
               if(itls.line == item_arr5[i].line  && itls.week_date ==item_arr5[i].week_date){
                        //差异情况，修改调拨计划量 - 调拨计划量
                var fs = Number(itls.item_quantity) - Number(item_arr5[i].item_quantity)
                log.debug("差异数量:"+fs,Number(itls.item_quantity) +" - "+Number(item_arr5[i].item_quantity))
                if(Number(fs)!=0){
                    log.debug("差异数量 !=0:"+fs)
                    //记录差异情况
                    // 19 调拨计划建议处理情况
                    try {
                        SetDeferRec(itls,today,'custrecord_quantity_week' + itls.week_date,fs,19)
                    } catch (error) {
                        log.error("错误",error)
                    }
                    
                }
                break
               }
        
            }

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
        sublistChanged: sublistChanged,
        createTransferOrders: createTransferOrders,
        updateData:updateData
    }
});
