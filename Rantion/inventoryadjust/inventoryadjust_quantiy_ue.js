/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        var newRec = context.newRecord;
        if (context.type == 'view') {
            var type = newRec.getValue('custbody_stock_use_type');
            if (type == 37 || type == 36) {
                var form = context.form
                form.clientScriptModulePath = './inventoryadjust_cs.js';
                form.addButton({
                    id: 'custpage_send_wms_button',
                    label: '推送WMS',
                    functionName: "sendButton(+" + type + ", " + newRec.id + ")"
                });
            }
        }
    }

    function beforeSubmit(context) {
        var newRec = context.newRecord;
        if (context.type == 'create') {
            var type = newRec.getValue('custbody_stock_use_type');
            if (type == 33 || type == 35 || type == 36) {
                var len = newRec.getLineCount({ sublistId: 'inventory' });
                for (var i = 0; i < len; i++) {
                    var qty = newRec.getSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', line: i });
                    if (qty > 0) {
                        qty = 0 - Math.abs(qty);
                        newRec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: qty, line: i });
                    }
                }
            }
        }
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
