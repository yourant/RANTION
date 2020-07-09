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
    var sublistId = 'custpage_sublist',week_rs,func_type;
    function pageInit(context) {
        rec = context.currentRecord; //当前记录
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
        if(fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to' &&
         data_type_id != 8  && data_type_id != 9  &&  data_type_id != 15 &&  data_type_id != 16
         &&fieldId != 'custpage_page_size'
         ){    
            function success(result) { console.log('Success with value: ' + result); window.location.reload(true);}
            function failure(reason) { console.log('Failure: ' + reason) }
    
            dialog.alert({
                title: '提示',
                message: '不允许进行修改！' 
            }).then(success).catch(failure);
            return;
        }else{
            if(fieldId == "custpage_date_from" || fieldId == "custpage_date_to" ){
                var D = cur.getValue(fieldId);
                var now_date =getWeek(new Date());
                var fo_date =getWeek(D);
                console.log("错误的")
                if(D < new Date() && now_date > fo_date){
                    function success(result) { console.log('Success with value: ' + result); }
                    function failure(reason) { console.log('Failure: ' + reason); }
                    dialog.alert({
                        title: '提示',message: '不能选择旧数据' 
                    }).then(success).catch(failure);
                    cur.setValue({fieldId:fieldId,value:new Date()});
                }
            }
            var count = cur.getLineCount({sublistId: sublistId}); //获取列表总行数
            var currIndex = cur.getCurrentSublistIndex({sublistId: sublistId}); //获取当前的行数
            //获取当前行所需的数据
            if(data_type_id == 8||data_type_id == 15){    // x修改交货量
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
                    if((data_type_id1 == 9 || data_type_id1 == 16) && store_name1 == store_name && item_sku == item_sku1){
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
                var link = url.resolveScript({
                    scriptId : 'customscript_allocation_plan_sl',
                    deploymentId:'customdeploy_allocation_plan_sl'
                });
             
                link = link + '&' + serializeURL({
                    action: 'search',
                    custpage_item: custpage_item,
                    custpage_date_from: custpage_date_from,
                    custpage_date_to: custpage_date_to,
                    custpage_now_page: custpage_select_page,
                    custpage_page_size: custpage_page_size
                });
                console.log("link : ",link);
                window.location =link;
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
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var week_objs = weekofday(new Date(), date_from, date_to);
        func_type =week_objs.func_type;
        week_rs =week_objs.weeks;
       console.log('week_rs', week_rs);
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat);
        var item_arr6 =[] ,item_arr5=[]
        var quantity ,item_objs6 = {},item_objs5={},sku_id,account,key_str,CH = true,data_t;
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            if(data_type == 8){ //修改交货量
                quantity = 0
                   //  key_str => sku_id+"-"+ account+"-6-"+i;
                week_rs.map(function(wek){
                    data_t=16;
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + wek,line:i});
                            CH = true;
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + wek,line:i});
                            sku_id = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i});
                            account = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i});
                            key_str = sku_id+"-"+ account+"-"+data_t+"-"+i;
                            for(var key in item_objs6){
                                if(key ==  key_str){
                                    item_objs6[key].push({
                                        item_id: sku_id,
                                        account_id: account,
                                        week_date: wek,
                                        line:i-1,
                                        data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                        item_quantity: quantity.toString()
                                    });
                                    CH = false;
                                }
                            }
                            if(CH){
                                item_arr6=[];
                                item_arr6.push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: wek,
                                    line:i-1,
                                    data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                    item_quantity: quantity.toString()
                                })
                                item_objs6[key_str] = item_arr6;
                            }
                            CH = true,data_t=15;
                            key_str = sku_id+"-"+ account+"-"+data_t+"-"+i;
                            for(var key in item_objs6){
                                if(key ==  key_str){
                                    item_objs6[key].push({
                                        item_id: sku_id,
                                        account_id: account,
                                        week_date: wek,
                                        line:i,
                                        data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                        item_quantity: quantity.toString()
                                    });
                                    CH = false;
                                }
                            }
                            if(CH){
                                item_arr6=[];
                                item_arr6.push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: wek,
                                    line:i,
                                    data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                    item_quantity: quantity.toString()
                                })
                                item_objs6[key_str] = item_arr6;
                            }

                });
                for(var l=1;l<54;l++){
                    CH = true,data_t=16;
                    if(week_rs.indexOf(l)== -1){
                        quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_weekhi' + l,line:i});
                        sku_id = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i});
                        account = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i});
                        key_str = sku_id+"-"+ account+"-"+data_t+"-"+i;
                        for(var key in item_objs6){
                            if(key ==  key_str){
                                item_objs6[key].push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: l,
                                    line:i,
                                    data_type:data_t,  // 需求预测数据类型 中的6 调拨计划量
                                    item_quantity: quantity.toString()
                                });
                                CH = false;
                            }
                        }
                        if(CH){
                            item_arr6=[];
                            item_arr6.push({
                                item_id:sku_id,
                                account_id:account,
                                week_date: l,
                                line:i,
                                data_type:data_t,  // 需求预测数据类型 中的6 调拨计划量
                                item_quantity: quantity.toString()
                            });
                            item_objs6[key_str] = item_arr6;
                        }
                        CH = true,data_t=15;
                        key_str = sku_id+"-"+ account+"-"+data_t+"-"+i;
                        for(var key in item_objs6){
                            if(key ==  key_str){
                                item_objs6[key].push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: l,
                                    line:i,
                                    data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                    item_quantity: quantity.toString()
                                });
                                CH = false;
                            }
                        }
                        if(CH){
                            item_arr6=[];
                            item_arr6.push({
                                item_id: sku_id,
                                account_id: account,
                                week_date: l,
                                line:i,
                                data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                item_quantity: quantity.toString()
                            })
                            item_objs6[key_str] = item_arr6;
                        }
                    }
                 }
               
            }
            // if(data_type == 7){ //计划量
            //     quantity = 0
            //     week_rs.map(function(wek){
            //             quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + wek,line:i});
            //                 item_arr5.push({
            //                     item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
            //                     account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
            //                     week_date: wek,
            //                     line:i,
            //                     data_type: 14,  // 需求预测数据类型 中的14 -交货计划量
            //                     item_quantity: quantity
            //                 })
            //     })
               
          // }
        }for(var key in item_objs6){
            console.log("item_objs6  key:  ", JSON.stringify(key));
        }
        console.log("item_objs5:  ", JSON.stringify(item_objs5));
        console.log("item_objs6:  " ,JSON.stringify(item_objs6));
        var link = url.resolveScript({
            scriptId : 'customscript_allocation_plan_rl',
            deploymentId:'customdeploy_allocation_plan_rl'
        });
        var header = {
            "Content-Type":"application/json;charset=utf-8",
            "Accept":"application/json"
        }
        var body = {
            item_objs5 : item_objs5,
            item_objs6 : item_objs6,
            today : today,
            PlanType : ["20","21"],  //交货计划，补货计划 例外信息类型
        }

        https.post.promise({
            header: header,
            url: link,
            body: body
         }).then(function(response){
          alert("保存成功");
        }).catch(function onRejected(reason) {
          console.log("报错了，look:  " + reason);
         })
     
      
    }

  /**
     * 判断某一日属于这一年的第几周
     * @param {*} data 
     */
    function weekofday(data, date_from, date_to) {
        log.debug("date_from:" + date_from, date_to);
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
            log.debug("不跨明年？0,", YearDer_to);
            dat_to = getWeek(date_to);
            dat_from = getWeek(date_from);
            for(var i=dat_from;i<=dat_to;i++){
                weeks.push(i) 
            }
            func_type = "A"
        }
        log.debug("weeks ",weeks);
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


 /**  
      * 导出Excel
      */
     function ExportDemandPlan(){
        var sublistId = 'custpage_sublist';
        var curr = currentRecord.get();
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat),quantity;
        //传入开始时间和结束时
        var week_objs = weekofday(new Date(), date_from, date_to);
        func_type =week_objs.func_type;
        week_rs =week_objs.weeks;
        log.audit('week_rs', week_rs);
        var fils = new Array();
        var len = curr.getLineCount({sublistId:sublistId});
        console.log("子列表长度: "+len,today);
        if(len >0){           
            fils = {
              "acc": curr.getValue("custpage_account_store"),
              "sku": curr.getValue("custpage_item"),
              "TT": "Delivery",
              "week_rs": week_rs,
              "func_type": func_type
            }
            console.log("week:: "+week_rs,func_type);
         
            console.log("fils: ",JSON.stringify(fils));
            var link = url.resolveScript({
                scriptId : 'customscript_store_demand_print_sl',
                deploymentId:'customdeploy_store_demand_print_sl',
                params:{
                  fils:JSON.stringify(fils)
                },
                returnExternalUrl: true
            });				            
            window.open(link)
        }else{
            alert("无数据")
        }
        
        
       
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
        ExportDemandPlan:ExportDemandPlan,
        sublistChanged: sublistChanged
    }
});