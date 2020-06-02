/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define([], function() {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true
    }

    function validateField(context) {
        if (context.fieldId == 'custrecord_johnny_test_a') {
            var rec = context.currentRecord;
            var id = rec.getValue('custrecord_johnny_test_a');
            if (id) {
                var formula = rec.getValue('custrecord_johnny_test_b');
                var key = '{' + rec.getText('custrecord_johnny_test_a') + '}';
                formula = formula + key;
                rec.setValue({ fieldId: 'custrecord_johnny_test_b', value: formula });
            }
        }
        return true
    }

    function fieldChanged(context) {
        
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {
        return true
    }

    function validateInsert(context) {
        return true
    }

    function validateLine(context) {
        return true
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
