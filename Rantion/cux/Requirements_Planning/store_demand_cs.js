/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-06 17:36:22
 * @LastEditTime: 2020-05-06 17:46:45
 * @FilePath: \Rantion_sandbox\Rantion\cux\Requirements_Planning\store_demand_cs.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/ui/dialog', 'N/https',"N/currentRecord","N/runtime","N/format",'../../Helper/Moment.min'], 
function(url, dialog, https,currentRecord,runtime,format,moment) {
    var rec,sublistId = 'custpage_sublist';

    function pageInit(context) {
        rec = context.currentRecord; //当前记录
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
        if(fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to' && data_type_id != 5){    
            function success(result) { console.log('Success with value: ' + result); window.location.reload(true);}
            function failure(reason) { console.log('Failure: ' + reason) }
    
            dialog.alert({
                title: '提示',
                message: '不允许进行修改！' 
            }).then(success).catch(failure);
            return;
        }else{
            var data = [];
            var item_week = fieldId.replace(/custpage_quantity_week/, "custrecord_quantity_week");
            data.push({
                item_id: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_item_sku_id'}),
                item_account: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_store_name_id'}),
                item_quantity: cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: fieldId}),
                item_type: data_type_id,
                item_week: item_week
            })
            var link = url.resolveScript({
                scriptId : 'customscript_modified_quantity_rl',
                deploymentId:'customdeploy_modified_quantity_rl'
            });
            var header = {
                "Content-Type":"application/json;charset=utf-8",
                "Accept":"application/json"
            }
            var body = {
                data : data
            }
            https.post({
                url : link,
                body : body,
                headers : header
            })
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
  






    function ExportDemandPlan(){
        var sublistId = 'custpage_sublist';
        var curr = currentRecord.get();
        var date_from = format.parse({ value:curr.getValue('custpage_date_from'), type: format.Type.DATE});
        var week_from = weekofday(date_from);
        var date_to = format.parse({ value:curr.getValue('custpage_date_to'), type: format.Type.DATE});
        var week_to = weekofday(date_to);
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat),quantity;
        // var weekArray=new Array(),lines=new Array(), lineComObj =new Object(),dataObjs = new Object();
        var fils = new Array();
        var len = curr.getLineCount({sublistId:sublistId});
        console.log("子列表长度: "+len,today);
        if(len >0){
           
            // fils["acc"] = curr.getValue("custpage_account_store");
            // fils["sku"] = curr.getValue("custpage_item");
            // fils["dateFrom"] = week_from;
            // fils["dateTo"] = week_to;
            fils = {
              "acc": curr.getValue("custpage_account_store"),
              "sku": curr.getValue("custpage_item"),
              "dateFrom": week_from,
              "dateTo": week_to
            }
            console.log("week:: "+week_to,week_from);
            // var week;
            // for(var i = 0; i < len; i++){
            //     var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type',line:i});
            //     weekArray =[],dataObjs = {};
            //     store_name = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name',line:i});
            //     sku = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku',line:i});
            //     item_name = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_name',line:i});
            //     data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type',line:i});
            //     for(var a = week_from; a < week_to + 1; a++){
            //         week ="W"+ a;
            //         weekArray.push({week : week,qty:curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week'+a,line:i})});
            //     }
            //     lines.push({ store_name:store_name, sku:sku, item_name:item_name,data_type:data_type,weekArray:weekArray});
            // }
            // console.log("+ItemDatas: ",JSON.stringify(lines));
            // lineComObj["lines"] = lines;    
            // lineComObj["weekArrayHead"] = weekArray;
            console.log("fils: ",JSON.stringify(fils));
            var link = url.resolveScript({
                scriptId : 'customscript_store_demand_print_sl',
                deploymentId:'customdeploy_store_demand_print_sl',
                params:{
                  fils:JSON.stringify(fils)
                },
                returnExternalUrl: true
            });
        
       
  
          // https.post({
          //     url : link,
          //     body : JSON.stringify(lineComObj),
          //     headers : header
          // })
            window.open(link)
        }else{
            alert("无数据")
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
            if(data_type == 5 || data_type == 23){ //修改净需求量
                quantity = 0
                    for(var a = week_from; a < week_to + 1; a++){
                            quantity = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week' + a,line:i});
                        item_arr6.push({
                            item_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku_id',line:i}),
                            account_id: curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_store_name_id',line:i}),
                            week_date: a,
                            line:i,
                            data_type:23,  
                            item_quantity: quantity
                        })
                    }
            }
        }
       
       // 设置例外信息处理情况
    var bill_id
    item_arr6.map(function (itls) {
      search
        .create({
          type: 'customrecord_demand_forecast_child',
          filters: [
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_item_sku',
              operator: 'anyof',
              values: itls.item_id
            },
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_account',
              operator: 'anyof',
              values: itls.account_id
            },
            {
              name: 'custrecord_demand_forecast_l_date',
              operator: 'on',
              values: today
            },
            {
              name: 'custrecord_demand_forecast_l_data_type',
              operator: 'anyof',
              values: itls.data_type
            }
          ]
        })
        .run()
        .each(function (rec) {
          bill_id = rec.id
        })
      log.debug('bill_id', bill_id)
      var child_bill_data
      if (bill_id) {
        child_bill_data = record.load({
          type: 'customrecord_demand_forecast_child',
          id: bill_id
        })
        var field_name = 'custrecord_quantity_week' + itls.week_date
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        })
        child_bill_data.save()
      } else {
        var forecast_id
        search
          .create({
            type: 'customrecord_demand_forecast',
            filters: [
              {
                name: 'custrecord_demand_forecast_item_sku',
                operator: 'anyof',
                values: itls.item_id
              },
              {
                name: 'custrecord_demand_forecast_account',
                operator: 'anyof',
                values: itls.account_id
              }
            ]
          })
          .run()
          .each(function (rec) {
            forecast_id = rec.id
          })
        log.debug('forecast_id', forecast_id)
        child_bill_data = record.create({
          type: 'customrecord_demand_forecast_child'
        })
        child_bill_data.setText({
          fieldId: 'custrecord_demand_forecast_l_date',
          text: today
        })
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_l_data_type',
          value: itls.data_type
        })
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_parent',
          value: forecast_id
        })
        var field_name = 'custrecord_quantity_week' + itls.week_date
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        })
        child_bill_data.save()
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
        updateData: updateData
    }
});
