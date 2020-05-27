/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(["N/log"], function(log) {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        log.debug('id',newRecord.id);
        if(context.type == 'view' && (newRecord.getValue('custbody_order_type') == 5)){
            var form = context.form 
            form.clientScriptModulePath = './dps_sales_multichannel_cs.js';
            form.addButton({
                id : 'custpage_sync_to_amazon',
                label : '同步至Amazon平台',
                functionName : 'syncToAmazon(' + newRecord.id + ')'
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
