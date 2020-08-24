/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record'], function(record) {

    function beforeLoad(context) {
        log.debug("context:",context)
        if (context.type == 'create') {
            
            var newRecord = context.newRecord;
            var numberRecord = record.load({ type: 'customrecord_dps_po_number', id: 1, isDynamic: true });
            var pr_last_number = Number(numberRecord.getValue('custrecord_ppn_pr_number')) + 1;
            var number_date = numberRecord.getValue('custrecord_ppn_date');
            var new_pr_number = '0001';
            var now_date = new Date(new Date().getTime() + (1000 * 60 * 60 * 8));
            var nowYStr = now_date.getFullYear();
            var nowMStr = now_date.getMonth();
            var nowDStr = now_date.getDate();
            var nowDateStr = (nowYStr - 2000) + (Array(2).join('0') + (nowMStr + 1)).slice(-2) + (Array(2).join('0') + nowDStr).slice(-2);
            var numberYStr = number_date.getFullYear();
            var numberMStr = number_date.getMonth();
            var numberDStr = number_date.getDate();
            var numberDateStr = (numberYStr - 2000) + (Array(2).join('0') + (numberMStr + 1)).slice(-2) + (Array(2).join('0') + numberDStr).slice(-2);
            var dateStr = nowDateStr;
            if (nowDateStr == numberDateStr) {
                new_pr_number = (Array(4).join('0') + pr_last_number).slice(-4);
            } else {
                pr_last_number = 0;
                numberRecord.setValue({ fieldId: 'custrecord_ppn_date', value: now_date });
            }
            numberRecord.setValue({ fieldId: 'custrecord_ppn_pr_number', value: pr_last_number });
            numberRecord.save();
            newRecord.setValue({fieldId:"tranid",value:'PR' + dateStr + new_pr_number})
        }
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            var numberRecord = record.load({ type: 'customrecord_dps_po_number', id: 1, isDynamic: true });
            var pr_last_number = Number(numberRecord.getValue('custrecord_ppn_pr_number')) + 1;
            var number_date = numberRecord.getValue('custrecord_ppn_date');
            var new_pr_number = '0001';
            var now_date = new Date(new Date().getTime() + (1000 * 60 * 60 * 8));
            var nowYStr = now_date.getFullYear();
            var nowMStr = now_date.getMonth();
            var nowDStr = now_date.getDate();
            var nowDateStr = (nowYStr - 2000) + (Array(2).join('0') + (nowMStr + 1)).slice(-2) + (Array(2).join('0') + nowDStr).slice(-2);
            var numberYStr = number_date.getFullYear();
            var numberMStr = number_date.getMonth();
            var numberDStr = number_date.getDate();
            var numberDateStr = (numberYStr - 2000) + (Array(2).join('0') + (numberMStr + 1)).slice(-2) + (Array(2).join('0') + numberDStr).slice(-2);
            var dateStr = nowDateStr;
            if (nowDateStr == numberDateStr) {
                new_pr_number = (Array(4).join('0') + pr_last_number).slice(-4);
            } else {
                pr_last_number = 0;
                numberRecord.setValue({ fieldId: 'custrecord_ppn_date', value: now_date });
            }
            numberRecord.setValue({ fieldId: 'custrecord_ppn_pr_number', value: pr_last_number });
            numberRecord.save();
            record.submitFields({
                type: 'purchaserequisition',
                id: newRecord.id,
                values: {
                    'tranid': 'PR' + dateStr + new_pr_number
                }
            });
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
