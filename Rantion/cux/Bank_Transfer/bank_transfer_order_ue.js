/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/format'], function(search, record, format) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            var subsidiary_id = newRecord.getValue('custrecord_bto_company');
            var base_account_id, expense_account_id;
            search.create({
                type: 'customrecord_bank_transfer_configuration',
                filters: [
                    { name: 'custrecord_btc_company', operator: 'anyof', values: subsidiary_id }
                ],
                columns: [ 'custrecord_btc_base_account', 'custrecord_btc_expense_account' ]
            }).run().each(function (result) {
                base_account_id = result.getValue('custrecord_btc_base_account');
                expense_account_id = result.getValue('custrecord_btc_expense_account');
                return false;
            });
            if (base_account_id && expense_account_id) {
                var from_account = newRecord.getValue('custrecord_bto_from_account');
                var base_account = newRecord.getValue('custrecord_bto_base_account');
                var from_amount = newRecord.getValue('custrecord_bto_from_amount');
                var base_amount = newRecord.getValue('custrecord_bto_base_amount');
                var to_account = newRecord.getValue('custrecord_bto_to_account');
                var to_amount = newRecord.getValue('custrecord_bto_to_amount');
                var trandate = newRecord.getValue('custrecord_bto_tran_date');
                log.debug('mmm', 'from_account:' + from_account + ',base_account:' + base_account + ',from_amount:' + from_amount + 
                    ',base_amount:' + base_amount + ',to_account:' + to_account + ',to_amount:' + to_amount + '.trandate:' + trandate);
                if (from_account && base_account && from_amount && base_amount && to_account && to_amount && trandate) {
                    var bt_base_record = record.create({ type: 'transaction', isDynamic: true });
                    bt_base_record.setValue({ fieldId: 'type', value: 'Transfer' });
                    bt_base_record.setValue({ fieldId: 'fromaccount', value: from_account });
                    bt_base_record.setValue({ fieldId: 'toaccount', value: base_account });
                    bt_base_record.setValue({ fieldId: 'fromamount', value: from_amount });
                    bt_base_record.setValue({ fieldId: 'toamount', value: base_amount });
                    bt_base_record.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: format.Type.DATE }) });
                    bt_base_record.save();
                    var bt_to_record = record.create({ type: 'transaction', isDynamic: true });
                    bt_to_record.setValue({ fieldId: 'type', value: 'Transfer' });
                    bt_to_record.setValue({ fieldId: 'fromaccount', value: base_account });
                    bt_to_record.setValue({ fieldId: 'toaccount', value: to_account });
                    bt_to_record.setValue({ fieldId: 'fromamount', value: base_amount });
                    bt_to_record.setValue({ fieldId: 'toamount', value: to_amount });
                    bt_to_record.setValue({ fieldId: 'trandate', value: format.parse({ value: trandate, type: format.Type.DATE }) });
                    bt_to_record.save();
                }
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
