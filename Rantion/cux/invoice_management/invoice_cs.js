/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define([], function() {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        if (context.fieldId == 'custrecord_isl_sku_quantity') {
            var sblId = 'recmachcustrecord_isl_invoice_link';
            var rec = context.currentRecord;
            var lineNum = rec.getLineCount({ sublistId: sblId });
            var curQty = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity' });
            var curPrice = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_price' });
            rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', value: curQty * curPrice });
            var invoiceAmount = 0;
            for (var i = 0; i < lineNum; i++) {
                invoiceAmount = invoiceAmount + Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', line: i }));
            }
            rec.setValue({ fieldId: 'custrecord_invoice_amount', value: invoiceAmount });
        }
        return true;
    }

    function fieldChanged(context) {
        
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {
        return true;
    }

    function validateInsert(context) {
        return true;
    }

    function validateLine(context) {
        return true;
    }

    function sublistChanged(context) {
        
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }
});
