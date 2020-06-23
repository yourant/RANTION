/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search'], function(search) {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        var rec = context.currentRecord;
        if (context.fieldId == 'custbody_dps_start_location') {
            var s_lcation = rec.getValue('custbody_dps_start_location');
            rec.setValue({ fieldId: 'location', value: s_lcation });
        }
        if (context.fieldId == 'custbody_dps_end_location') {
            var e_lcation = rec.getValue('custbody_dps_end_location');
            rec.setValue({ fieldId: 'transferlocation', value: e_lcation });
        }
        if (context.fieldId == 'custbody_dps_transferor_type' || context.fieldId == 'subsidiary') {
            var transferor_type = rec.getValue('custbody_dps_transferor_type');
            if (transferor_type == '1' || transferor_type == '2') {
                var subsidiary = rec.getValue('subsidiary');
                var to_location;
                if (subsidiary) {
                    search.create({
                        type: 'location',
                        filters: [
                            { name: 'subsidiary', operator: 'anyof', values: subsidiary },
                            { name: 'custrecord_wms_location_type', operator: 'anyof', values: 4 }
                        ]
                    }).run().each(function (rec) {
                        to_location = rec.id;
                    });
                }
                if (to_location) {
                    rec.setValue({ fieldId: 'transferlocation', value: to_location });
                    rec.setValue({ fieldId: 'custbody_dps_end_location', value: to_location });
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
