/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/ui/dialog'], function(dialog) {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        var rec = context.currentRecord;
        var item_type = rec.getValue('custitem_dps_ctype');
        if (item_type == 2) {
            var combination = rec.getValue('custitem_dps_combination');
            if (!combination) {
                dialog.alert({
                    title: '操作错误',
                    message: '产品类型为“组合产品”，请选择组合规则。'
                });
                return false;
            }
        }
        return true;
    }

    function validateField(context) {
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
