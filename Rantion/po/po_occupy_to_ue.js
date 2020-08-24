/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        var newRec = context.newRecord;
        var type = context.type;
        if (type == 'create') {
            //可调拨数量汇总
            var allNeed = 0;
            var allInvoiceAmount = 0;
            var line = newRec.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < line; i++) {
                //总数量
                var quantity = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                //剩余开票金额
                var needInvoiceAmount = newRec.getSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: i });
                //设置可调拨数量
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', value: 0, line: i });
                //设置已调拨数量
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', value: 0, line: i });
                //初始化关联单号
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_realted_transfer_detail', value: '', line: i });
                //设置已开票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', value: '0', line: i });
                //设置剩余开票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_open', value: needInvoiceAmount, line: i });
                //设置已使用发票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_used_invoice_amount', value: '0', line: i });
                //设置可使用发票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', value: '0', line: i });
                allNeed += Number(quantity);
                allInvoiceAmount += Number(needInvoiceAmount);
            }
            newRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: allNeed });
            newRec.setValue({ fieldId: 'custbody_transferred_quantity', value: 0 });
            newRec.setValue({ fieldId: 'custbody_available_invoice_amount', value: 0 });
            newRec.setValue({ fieldId: 'custbody_used_invoice_amount', value: 0 });
            newRec.setValue({ fieldId: 'custbody_invoiced_amount', value: 0 });
            newRec.setValue({ fieldId: 'custbody_invoice_number', value: 0 });
            newRec.setValue({ fieldId: 'custbody_remaining_invoiced_amount', value: allInvoiceAmount });
        }
        if (type == 'edit') {
            var allNeed = 0;
            var allInvoiceAmount = 0;
            var line = newRec.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < line; i++) {
                var quantity = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                var needInvoiceAmount = newRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_open', line: i });
                allNeed += Number(quantity);
                allInvoiceAmount += Number(needInvoiceAmount);
            }
            newRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: allNeed });
            newRec.setValue({ fieldId: 'custbody_remaining_invoiced_amount', value: allInvoiceAmount });
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
