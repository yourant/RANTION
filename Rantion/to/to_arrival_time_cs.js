/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/runtime'], function (search, runtime) {

    function pageInit(context) {
        if (context.mode == 'create') {
            var curr = context.currentRecord;
            curr.setValue({
                fieldId: 'employee',
                value: runtime.getCurrentUser().id
            })
        }
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        var rec = context.currentRecord;
        if (context.fieldId == 'custbody_dps_transferor_channelservice') {
            var logistics_id = rec.getValue('custbody_dps_transferor_channelservice');
            if (logistics_id) {
                var days = 0;
                search.create({
                    type: 'customrecord_logistics_service',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: logistics_id
                    }],
                    columns: ['custrecord_ls_average_aging_days']
                }).run().each(function (rec) {
                    days = rec.getValue('custrecord_ls_average_aging_days');
                    return false;
                });
                var nowDate = new Date();
                if (days > 0) {
                    nowDate = new Date(nowDate.getTime() - (Number(days) * 24 * 60 * 60 * 1000));
                }
                rec.setValue({
                    fieldId: 'custbodyexpected_arrival_time',
                    value: nowDate
                });
            }
        }
        // if (context.fieldId == 'item') {
        if (context.fieldId == 'commitinventory') {
            var item = rec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            var location = rec.getValue('location');
            if (location) {
                var price;
                search.create({
                    type: 'item',
                    filters: [{
                            name: 'internalid',
                            operator: 'is',
                            values: item
                        },
                        // { name: 'inventorylocation', operator: 'anyof', values: location }
                    ],
                    columns: ['locationaveragecost', "averagecost"]
                }).run().each(function (rec) {
                    price = rec.getValue('averagecost');
                });
                if (price) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: price
                    });
                }
            }
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