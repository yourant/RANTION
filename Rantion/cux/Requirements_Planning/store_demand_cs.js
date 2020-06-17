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
define(['N/url', 'N/ui/dialog', 'N/https'], function(url, dialog, https) {
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
        sublistChanged: sublistChanged
    }
});
