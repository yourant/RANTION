/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        if (context.type == 'view') {
            var newRecord = context.newRecord;
            var poId = newRecord.getValue('custrecord_inter_po_report');
            if (!poId) {
                var transferId = newRecord.getValue('custrecord_transfer_order');
                var shippingId = newRecord.getValue('custrecord_fulfillment_record');
                var informationId = newRecord.id;
                var recordForm = context.form;
                recordForm.clientScriptModulePath = './declaration_information_cs.js';
                recordForm.addButton({
                    id : 'custpage_dps_create_po',
                    label : '生成公司间采购订单',
                    functionName : 'createInterPO("' + transferId + '_' + shippingId + '_' + informationId + '")',
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
