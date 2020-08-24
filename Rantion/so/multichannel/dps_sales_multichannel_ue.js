/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        if (context.type == 'view') {
            var form = context.form
            form.clientScriptModulePath = './dps_sales_multichannel_cs.js';
            if (newRecord.getValue('custbody_order_type_fulfillment') != 3 && newRecord.getValue('orderstatus') != 'H') {
                form.addButton({
                    id: 'custpage_update_so_mcf_type',
                    label: '变更为多渠道订单',
                    functionName: 'updateMCFType(' + newRecord.id + ')'
                });
            }
            if ((newRecord.getValue('custbody_order_type_fulfillment') == 3) && (newRecord.getValue('custbody_dps_create_mcf_order') == false)) {
                form.addButton({
                    id: 'custpage_sync_to_amazon',
                    label: '创建多渠道订单',
                    functionName: 'syncToAmazon(' + newRecord.id + ')'
                });
            }
            if ((newRecord.getValue('custbody_order_type_fulfillment') == 3) && (newRecord.getValue('custbody_dps_create_mcf_order') == true)) {
                form.addButton({
                    id: 'custpage_sync_to_amazon_cel',
                    label: '取消多渠道订单',
                    functionName: 'syncCelAmazon(' + newRecord.id + ')'
                });
            }
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