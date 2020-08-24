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
        var oldRecord = context.oldRecord;
        try {
            if (context.type != 'delete') {
                var purchaseorder_data = record.load({ type: 'purchaseorder', id: newRecord.getValue('purchaseorder') });
                var count = purchaseorder_data.getLineCount({ sublistId: 'links' });
                var total = 0;
                for (var i = 0; i < count; i++) {
                    var bill_type = purchaseorder_data.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i });
                    if (bill_type == '供应商预付款') {
                        total += Number(purchaseorder_data.getSublistValue({ sublistId: 'links', fieldId: 'total', line: i }));
                    }
                }
                purchaseorder_data.setValue({ fieldId: 'custbody_dps_actualprepaidamount', value: total });
                purchaseorder_data.save();
            }

            if (context.type == 'delete') {
                var custom_bill = oldRecord.getValue('custbody_custom_bill');
                if (custom_bill) {
                    var payment = oldRecord.getValue('payment');//系统单据的付款金额
                    var advance_charge = record.load({ type: 'customrecord_supplier_advance_charge', id: custom_bill });
                    var amount_paid = advance_charge.getValue('custrecord_amount_paid');//自定义单据的已付款金额
                    if(amount_paid && amount_paid > 0){
                        var new_amount_paid = amount_paid - payment;
                        advance_charge.setValue({ fieldId: 'custrecord_amount_paid', value: new_amount_paid });
                        var amount = advance_charge.getValue('custrecord_dps_amount');//自定义单据的本次已付款金额
                        var new_amount = Number(amount) + Number(payment);
                        advance_charge.setValue({ fieldId: 'custrecord_dps_amount', value: new_amount });
                    }
                    advance_charge.save();
                }
            }
        } catch (e) {
            log.debug('e', e);
        }

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
