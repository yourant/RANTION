/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/Moment.min','N/currentRecord', 'N/url', 'N/https', 'N/ui/dialog', 'N/format',"N/runtime","N/search","N/record"],
 function(moment,currentRecord, url, https, dialog, format,runtime,search,record) {

    var rec,sublistId = 'custpage_sublist',week_rs,func_type;
    function pageInit(context) {
        rec = context.currentRecord; //当前记录
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        if (context.fieldId == 'custpage_page_size') {
            console.log("改变了吗",context.fieldId)
            pigeSizeChange();
        }
        return true;
    }
    function pigeSizeChange() {
        var custpage_item = rec.getValue('custpage_item');  //货品
        var custpage_date_from = rec.getText('custpage_date_from'); 
        var custpage_date_to = rec.getText('custpage_date_to');
        var custpage_now_page = rec.getValue('custpage_now_page'); 
        var custpage_total_page = rec.getValue('custpage_total_page'); 
        var custpage_select_page = rec.getText('custpage_page_size');
        var custpage_page_size = rec.getValue('custpage_page_size');
            console.log("所选货品:",custpage_item)
        if (custpage_total_page != null && custpage_total_page != '') {
            console.log("选择的页数",custpage_select_page)
            console.log("页面大小",custpage_page_size)
            if (parseInt(custpage_select_page) - 1 > 0) {
                var link = url.resolveScript({
                    scriptId : 'customscript_replenishment_plan_sl',
                    deploymentId:'customdeploy_replenishment_plan_sl'
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
    function fieldChanged(context) {
     
        var cur = context.currentRecord;
        var fieldId = context.fieldId;
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
        console.log('fieldId',context.fieldId);
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
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat);
        var week_objs = weekofday(new Date(), date_from, date_to);
        func_type =week_objs.func_type;
        week_rs =week_objs.weeks;
        log.audit('week_rs', week_rs);
        var week_arr = week_date.split(',');
        if(week_arr.length == 0){
            dialog.alert({
                title: "错误",
                message:"请先选择生成周。"
            }).then(success2).catch(failure);
        }
        var item_arr6 = [],item_arr5=[],item_arr=[],item_objs={};
        var quantity ,item_objs6 = {},item_objs5={},sku_id,account,key_str,CH = true;
        for(var i = 0; i < curr.getLineCount({sublistId:sublistId}); i++){
            var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type_id',line:i});
            var quantity = 0;
            if(data_type == 4){  //补货量
                week_arr.map(function(line){
                    week_rs.map(function(wek){
                        if(wek == line){
                            CH = true;
                            sku_id = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i});
                            account = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i});
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + wek,line:i});
                            if(quantity >0){
                                key_str = sku_id+"-"+wek;
                                for(var key in item_objs){
                                    if(key ==  key_str){
                                        item_objs[key].push({
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
                                    item_arr=[];
                                    item_arr.push({
                                        item_id: sku_id,
                                        account_id: account,
                                        week_date: wek,
                                        line:i-1,
                                        data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                        item_quantity: quantity.toString()
                                    })
                                    item_objs[key_str] = item_arr;
                                }
                            }
                        }
                      
                    })
               
                })
                week_rs.map(function(wek){
                    data_t=9;
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
                })

                  for(var l=1;l<54;l++){
                    CH = true;
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
                                    data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
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
                                data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                item_quantity: quantity.toString()
                            })
                            item_objs6[key_str] = item_arr6;
                        }
                    }
                 }
                
            }
            if(data_type == 1){  //倒排补货量
                week_arr.map(function(line){
                    week_rs.map(function(wek){
                        if(wek == line){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + wek,line:i});
                        }
                    })
                    log.debug("quatity",quantity)
                   
                    if(quantity>0){
                        item_arr5.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: line,
                            item_quantity: quantity,
                            data_type: 7
                        })
                    }
                })
                data_t=7;
                week_rs.map(function(wek){
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
                })
                for(var l=1;l<54;l++){
                    CH = true;
                    if(week_rs.indexOf(l)== -1){
                        quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_weekhi' + l,line:i});
                        sku_id = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i});
                        account = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i});
                        key_str = sku_id+"-"+ account+"-"+data_t+"-"+i;
                        for(var key in item_objs5){
                            if(key ==  key_str){
                                item_objs5[key].push({
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
                            item_arr5=[];
                            item_arr5.push({
                                item_id:sku_id,
                                account_id:account,
                                week_date: l,
                                line:i,
                                data_type:data_t,  // 需求预测数据类型 中的22 -修改调拨计划量
                                item_quantity: quantity.toString()
                            })
                            item_objs5[key_str] = item_arr5;
                        }
                    }
                 }
                
            }
        }


        console.log("item_objs6:",JSON.stringify(item_objs6));
        console.log("item_arr:",JSON.stringify(item_arr6));
        if(item_arr.length == 0) {
            var options = {
                title: "生成请购单",
                message: "选择周不需要生成补货"
            };
            dialog.confirm(options).then(success).catch(failure);
        }else{
            var link = url.resolveScript({
                scriptId : 'customscript_replenishment_plan_rl',
                deploymentId:'customdeploy_replenishment_plan_rl'
            });
            var header = {
                "Content-Type":"application/json;charset=utf-8",
                "Accept":"application/json"
            }
            var body = {
                item_objs5 : item_objs5,  //计划量
                item_objs6 : item_objs6, //修改量
                item_objs : item_objs, //修改量
                today : today,
                PlanType : ["21"],  //调拨计划 , 交货计划，补货计划 例外信息类型
            }
    
         
            https.post.promise({
                header: header,
                url: link,
                body: body
             }).then(function(response){
            //   console.log("更新数据耗时：" + (new Date().getTime() - ST)); 
            }).catch(function onRejected(reason) {
              console.log("报错了，look:  " + reason);
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
            // window.close();
        }

        function failure(reason) { 
            console.log("Failure: " + reason); 
        }

        
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
              "pageSize": curr.getText('custpage_page_size'),
              "nowPage": curr.getValue("custpage_page_size"),
              "TT": "Replen",
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
        sublistChanged: sublistChanged,
        ExportDemandPlan: ExportDemandPlan,
        createRequisitionOrders: createRequisitionOrders
    }
});
