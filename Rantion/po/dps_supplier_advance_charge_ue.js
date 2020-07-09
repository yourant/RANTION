/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/url', 'N/record', 'N/search'], function(url, record, search) {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        if (context.type == 'view' && newRecord.getValue('orderstatus') == 'B') {
            var output = url.resolveRecord({
                recordType: 'customrecord_supplier_advance_charge',
                recordId: 6,
                isEditMode: true
            });
            var a = output.split('&id=');
            var path_url = a[0];
            var form = context.form
            form.clientScriptModulePath = './dps_supplier_advance_charge_cs.js';
            form.addButton({
                id: 'custpage_bills',
                label: '生成待审批预付款单',
                functionName: 'createBills("' + path_url + '", "' + newRecord.id + '")'
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
