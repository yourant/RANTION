/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        if (context.type != 'delete') {
            try {
                var purchaseorder_data = record.load({ type: 'purchaseorder', id: newRecord.getValue('purchaseorder') });
                var count = purchaseorder_data.getLineCount({sublistId: 'links'});
                var total = 0;
                for(var i = 0; i < count; i++){
                    var bill_type = purchaseorder_data.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                    if(bill_type == '供应商预付款'){
                        total += Number(purchaseorder_data.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i }));
                    }
                }
                purchaseorder_data.setValue({ fieldId: 'custbody_dps_actualprepaidamount', value: total });
                purchaseorder_data.save();
            } catch (e) {
                log.debug('e', e);
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
