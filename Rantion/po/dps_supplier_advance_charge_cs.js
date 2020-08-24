/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/record', 'N/search', 'N/ui/dialog', 'N/https', 'N/url'], function (record, search, dialog, https, url) {

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
        if (fieldId == 'custrecord_dps_amount') {
            var collection_amount = cur.getValue('custrecord_dps_collection_amount');//预付款金额
            var amount_paid = cur.getValue('custrecord_amount_paid');//已付款金额
            var amount = cur.getValue('custrecord_dps_amount');//本次预付款金额
            if(amount > (collection_amount - amount_paid)){
                function success(result) { console.log('Success with value: ' + result); window.location.reload(true); }
                function failure(reason) { console.log('Failure: ' + reason) }
                dialog.alert({
                    title: '提示',
                    message: '超出剩余预付款金额！'
                }).then(success).catch(failure);
            }

            // var po_id = cur.getValue('custrecord_dps_purchase_order');
            // var purchaseorder_data = record.load({ type: 'purchaseorder', id: po_id });
            // var total = purchaseorder_data.getValue('total');
            // var other_total = 0;
            // search.create({
            //     type: 'customrecord_supplier_advance_charge',
            //     filters: [
            //         { name: 'custrecord_dps_purchase_order', operator: 'anyof', values: po_id }
            //     ],
            //     columns: [
            //         'custrecord_dps_collection_amount'
            //     ]
            // }).run().each(function (result) {
            //     other_total += Number(result.getValue('custrecord_dps_collection_amount'));
            //     return true;
            // });
            // var total_qua = total - other_total;
            // if (total_qua < cur.getValue(fieldId)) {
            //     function success(result) { console.log('Success with value: ' + result); window.location.reload(true); }
            //     function failure(reason) { console.log('Failure: ' + reason) }
            //     dialog.alert({
            //         title: '提示',
            //         message: '超出采购单总金额！'
            //     }).then(success).catch(failure);
            // }
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

    function cashierPayment(bill_id){
        function success(result) {
            if (result) {
                var link = url.resolveScript({
                    scriptId: 'customscript_create_supplier_advance_rl',
                    deploymentId: 'customdeploy_create_supplier_advance_rl'
                });
                
                var header = {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': 'application/json'
                }
                var body = {
                    id: bill_id
                }
                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })

                dialog.alert({
                    title: JSON.parse(response.body).code,
                    message: JSON.parse(response.body).msg
                }).then(success1).catch(failure);
            }
        }
        function success1(reason) {
            window.location.reload(true);
        }
        function failure(reason) {
            console.log('Failure: ' + reason);
        }
        var options = {
            title: '出纳付款',
            message: '是否进行付款？'
        };
        dialog.confirm(options).then(success).catch(failure);
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
        createBills: createBills,
        cashierPayment: cashierPayment
    }
});
