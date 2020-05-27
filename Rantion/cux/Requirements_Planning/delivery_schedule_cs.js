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
define(['N/url'], function(url) {
    var rec;
    var report_Suitelet;
    var sublistId = 'custpage_sublist'
    function pageInit(context) {
        rec = context.currentRecord; //当前记录

        report_Suitelet = url.resolveScript({
            scriptId: 'customscript_delivery_schedule_sl',
            deploymentId: 'customdeploy_delivery_schedule_sl'
        });
        var line = rec.getLineCount({
            sublistId: sublistId
        });
        console.log('line',line);
        
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
        var line2 = cur.getLineCount({
            sublistId: sublistId
        });
        console.log('line2',line2);
        var currIndex = cur.getCurrentSublistIndex({
            sublistId: sublistId
        });
        for (var i = 0; i < 52; i++) {
            var sub_filed =  'custpage_quantity_week' + (i+1);
            if (context.fieldId == sub_filed) {
                console.log('currIndex',currIndex);
                if (currIndex == 4) {
                    alert('允许修改');
                    return true
                }else{
                    alert('不允许修改');
                    return false
                }
            }
        }

        // for (var i = 0; i < line2; i++) {
        //     var data_type_i = cur.getSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_data_type',line: i });
        //     console.log('data_type_i',data_type_i);
        //     if (data_type_i == '修改交货量') {
        //         alert('可修改');
        //     }
            
        // }
        
        // var store_name = cur.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_store_name'});
        // console.log('store_name',store_name);
        // var item_sku = cur.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_item_sku'});
        // console.log('item_sku',item_sku);
        // var item_name = cur.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_item_name'});
        // console.log('item_name',item_name);
        // var data_type = cur.getCurrentSublistValue({ sublistId: 'custpage_sublist', fieldId: 'custpage_data_type'});
        // console.log('data_type',data_type);
        // for (var i = 0; i < 52; i++) {
        //     var sub_filed =  'custpage_quantity_week' + (i+1);
        //     if (context.fieldId == sub_filed) {
                
        //     }
        // }
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
