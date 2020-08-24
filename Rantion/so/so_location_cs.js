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
        var rec = context.currentRecord;
        var location = rec.getValue('location');
        var location_mcf = rec.getValue('custbody_dps_mcf_ship_location');
        if (context.fieldId == 'location') {
            if (location && location != location_mcf) {
                rec.setValue({ fieldId: 'custbody_dps_mcf_ship_location', value: location });
            }
        }
        if (context.fieldId == 'custbody_dps_mcf_ship_location') {
            if (location_mcf && location != location_mcf) {
                rec.setValue({ fieldId: 'location', value: location_mcf });
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
