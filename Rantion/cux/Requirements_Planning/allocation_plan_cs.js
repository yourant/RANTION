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
        console.log("data_type_id:"+data_type_id)                               
        if(fieldId != 'custpage_week_date' && fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to'
         && data_type_id != 6 &&data_type_id != 22){ //不等于修改调拨计划量   
            function success(result) { console.log('Success with value: ' + result); window.location.reload(true);}
            function failure(reason) { console.log('Failure: ' + reason) }
    
            dialog.alert({
                title: '提示',
                message: '不允许进行修改！' 
            }).then(success).catch(failure);
            return;
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
        console.log("len:",curr.getLineCount({sublistId:sublistId}));
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            var quantity = 0;
            console.log("data_type:"+data_type);
            if(data_type == 6 || data_type == 22){ //修改调拨计划量
                week_arr.map(function(line){
                 
                    for(var a = week_from; a < week_to + 1; a++){
                        if(a == line){
                            console.log("line:"+line);
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        }
                    }
                    console.log("quantity:"+quantity);
                    if(quantity){
                        item_arr.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: line,
                            item_quantity: Math.abs(quantity)
                        })
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
            if(data_type == 6 || data_type == 22){ //修改调拨计划量
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
       
        log.debug("item_arr6:",item_arr6)
        log.debug("item_arr5:",item_arr5)
          
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
            PlanType : ["19","20","21"],  //调拨计划 , 交货计划，补货计划 例外信息类型
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
