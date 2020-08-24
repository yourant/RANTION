/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        if (context.type == 'view') {
            var form = context.form
            var po_id = newRecord.id;
            var subsidiary = newRecord.getValue('subsidiary');
            form.clientScriptModulePath = './po_report_cs.js';
            form.addButton({
                id: 'custpage_po_report',
                label: '采购订单模板',
                functionName: 'report_po(+"' + po_id + '", "' + subsidiary + '")'
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
