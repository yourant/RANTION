/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-13 13:52:41
 * @LastEditTime   : 2020-06-07 14:04:10
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\multichannel\dps_sales_multichannel_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(["N/log"], function (log) {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        log.debug('id', newRecord.id);
        if (context.type == 'view' && (newRecord.getValue('custbody_order_type') == 5) && (newRecord.getValue('custbody_dps_create_mcf_order') == false)) {
            var form = context.form
            form.clientScriptModulePath = './dps_sales_multichannel_cs.js';
            form.addButton({
                id: 'custpage_sync_to_amazon',
                label: '创建多渠道订单',
                functionName: 'syncToAmazon(' + newRecord.id + ')'
            });
        }
        if (context.type == 'view' && (newRecord.getValue('custbody_order_type') == 5) && (newRecord.getValue('custbody_dps_create_mcf_order') == true)) {
            var form = context.form
            form.clientScriptModulePath = './dps_sales_multichannel_cs.js';
            form.addButton({
                id: 'custpage_sync_to_amazon_cel',
                label: '取消多渠道订单',
                functionName: 'syncCelAmazon(' + newRecord.id + ')'
            });
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});