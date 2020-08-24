/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/record', 'N/ui/dialog'], function (search, record, dialog) {

    function pageInit(context) {

    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        var rec = context.currentRecord;

        var repeat = false;
        if (context.fieldId == 'name' && rec.getValue('name')) {
            repeat = checkRepeat(rec);
        }
        if (repeat) {
            dialog.alert({ title: '提示', message: 'SKU编码[' + rec.getValue('name') + ']重复' });
            rec.setValue({
                fieldId: 'name',
                value: ""
            });
            return false;
        }
        return true;
    }


    function checkRepeat(rec) {
        var repeat = false;
        search.create({
            type: 'customrecord_product_sku',
            filters: [
                { name: 'name', operator: 'is', values: rec.getValue('name') }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (result) {
            if (result.id != rec.id) {
                repeat = true;
            }
            return true;
        });
        return repeat;
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

    function saveRecord(context) {
        var result = checkRepeat(context.currentRecord);
        if (result) {
            dialog.alert({ title: '提示', message: 'SKU编码重复' });
            return false;
        }
        return true;
    }

    return {
        pageInit: pageInit,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        saveRecord: saveRecord,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }
});
