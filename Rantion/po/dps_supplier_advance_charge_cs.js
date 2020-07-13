/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/record', 'N/search', 'N/ui/dialog'], function (record, search, dialog) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        var cur = context.currentRecord;
        var fieldId = context.fieldId;
        if (fieldId == 'custrecord_dps_collection_amount') {
            var po_id = cur.getValue('custrecord_dps_purchase_order');
            var purchaseorder_data = record.load({ type: 'purchaseorder', id: po_id });
            var total = purchaseorder_data.getValue('total');
            var other_total = 0;
            search.create({
                type: 'customrecord_supplier_advance_charge',
                filters: [
                    { name: 'custrecord_dps_purchase_order', operator: 'anyof', values: po_id }
                ],
                columns: [
                    'custrecord_dps_collection_amount'
                ]
            }).run().each(function (result) {
                other_total += Number(result.getValue('custrecord_dps_collection_amount'));
                return true;
            });
            var total_qua = total - other_total;
            if (total_qua < cur.getValue(fieldId)) {
                function success(result) { console.log('Success with value: ' + result); window.location.reload(true); }
                function failure(reason) { console.log('Failure: ' + reason) }
                dialog.alert({
                    title: '提示',
                    message: '超出采购单总金额！'
                }).then(success).catch(failure);
            }
        }
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

    function createBills(url, bill_id) {
        window.open(url + '&bill_id=' + bill_id);
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
        sublistChanged: sublistChanged,
        createBills: createBills
    }
});
