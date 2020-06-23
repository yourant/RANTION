
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'], function (search, record) {

    function pageInit(scriptContext) {
        var curr = scriptContext.currentRecord;
        var location = curr.getValue('location');
        if (location) {
            curr.setValue({ fieldId: 'custbody_dps_ship_location', value: location });
        }
    }

    function fieldChanged(scriptContext) {
        var curr = scriptContext.currentRecord;  
        // 如果更改字段是参数 
        if (scriptContext.fieldId == 'entity') {
            var entity = curr.getValue('entity');
            var loca, acc; 
            search.create({
                type: 'customrecord_aio_account',
                filters: [ 'custrecord_aio_customer', 'anyof', entity ],
                columns: [ 'custrecord_aio_fbaorder_location' ]
            }).run().each(function(e) {
                acc = e.id;
                loca = e.getValue(e.columns[0]);
            });
            if (acc) {
                curr.setValue({ fieldId: 'custbody_sotck_account', value: acc });
            }
            if (loca) {
                curr.setValue({ fieldId: 'location', value: Number(loca) });
                curr.setValue({ fieldId: 'custbody_dps_ship_location', value: Number(loca) });
            }
        }
    }

    function postSourcing(scriptContext) {
        
    }

    function sublistChanged(scriptContext) {
        
    }

    function lineInit(scriptContext) {
        
    }

    function validateField(scriptContext) {
        var curr = scriptContext.currentRecord;  
        if (scriptContext.fieldId == 'custbody_dps_ship_location') {
            var location_custom = curr.getValue('custbody_dps_ship_location');
            if (location_custom) {
                curr.setValue({ fieldId: 'location', value: location_custom });
            }
        }
        return true;
    }

    function validateLine(scriptContext) {
        return true;
    }

    function validateInsert(scriptContext) {
        return true;
    }

    function validateDelete(scriptContext) {
        return true;
    }

    function saveRecord(scriptContext) {
        return true;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord,
    };

});