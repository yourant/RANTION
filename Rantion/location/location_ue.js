/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search'], function(search) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        var newRecord = context.newRecord;
        var parent = newRecord.getValue('parent');
        if (parent) {
            newRecord.setValue({ fieldId: 'custrecord_dps_parent_location', value: parent });
        }
        var type = newRecord.getValue('custrecord_wms_location_type');
        if (type == 1) {
            var code = newRecord.getValue('custrecord_dps_wms_location');
            var name = newRecord.getValue('custrecord_dps_wms_location_name');
            if (code) {
                newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_code', value: code });
            }
            if (name) {
                newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_name', value: name });
            }
        }
        if (type == 2 && parent) {
            search.create({
                type: 'location',
                filters: [{ name: 'internalid', operator: 'is', values: parent }],
                columns: [ 'custrecord_dps_wms_location', 'custrecord_dps_wms_location_name' ]
            }).run().each(function(result) {
                var code = result.getValue('custrecord_dps_wms_location');
                var name = result.getValue('custrecord_dps_wms_location_name');
                if (code) {
                    newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_code', value: code });
                }
                if (name) {
                    newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_name', value: name });
                }
                return false;
            });
        }
        if (type == 3 && parent) {
            search.create({
                type: 'location',
                filters: [{ name: 'internalid', operator: 'is', values: parent }],
                columns: [ 
                    { name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' },
                    { name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' }
                ]
            }).run().each(function(result) {
                var code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' });
                var name = result.getValue({ name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' });
                if (code) {
                    newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_code', value: code });
                }
                if (name) {
                    newRecord.setValue({ fieldId: 'custrecord_dps_warehouse_name', value: name });
                }
                return false;
            });
        }
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
