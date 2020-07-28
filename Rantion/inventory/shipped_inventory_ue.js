/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function(search, record) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        if (context.type == 'create' || context.type == 'delete') {
            var newRecord = context.newRecord;
            var lineNum = newRecord.getLineCount({ sublistId: 'item' });
            var locations = {};
            for (var i = 0; i < lineNum; i++) {
                var sku = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var quantiy = Number(newRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }));
                var location_id = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                if (location_id) {
                    var location = locations[location_id];
                    var flad = true;
                    if (location) {
                        flad = location.flad;
                    } else {
                        search.create({
                            type: 'location',
                            filters: [
                                { name: 'internalid', operator: 'is', values: location_id }
                            ],
                            columns: [ 'custrecord_wms_location_type', 'custrecord_dps_financia_warehous' ]
                        }).run().each(function (rec) {
                            var type = rec.getValue('custrecord_wms_location_type');
                            var ware = rec.getValue('custrecord_dps_financia_warehous');
                            if (type == 1 && ware == 2) {
                                flad = false;
                            }
                            return false;
                        });
                        var json = {};
                        json.flad = flad;
                        locations[location_id] = json;
                    }
                    if (flad) {
                        break;
                    }
                    var location_bin = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_location_bin', line: i });
                    var location_box = newRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_case_number', line: i });
                    var filters = [];
                    filters.push({ name: 'custrecord_id_sku', operator: 'is', values: sku });
                    filters.push({ name: 'custrecord_id_location', operator: 'is', values: location_id });
                    var wmstype = 1;
                    if (location_box) {
                        filters.push({ name: 'custrecord_id_location_box', operator: 'is', values: location_box });
                        wmstype = 3;
                    } else if (location_bin) {
                        filters.push({ name: 'custrecord_id_location_detail', operator: 'is', values: location_bin });
                        wmstype = 2;
                    }
                    filters.push({ name: 'custrecord_id_type', operator: 'is', values: wmstype });
                    setQuantiy(filters, sku, quantiy, location_id, location_bin, location_box, wmstype, context.type);
                }
            }
        }
    }

    function setQuantiy(filters, sku, quantiy, location, location_bin, location_box, wmstype, type) {
        var old_quantiy, detail_id;
        search.create({
            type: 'customrecord_inventory_detail',
            filters: filters,
            columns: [ 'custrecord_id_quantiy' ]
        }).run().each(function (rec) {
            detail_id = rec.id;
            old_quantiy = Number(rec.getValue('custrecord_id_quantiy'));
            return false;
        });
        quantiy = 0 - Math.abs(quantiy);
        if (type == 'delete') {
            quantiy = 0 - quantiy;
        }
        if (!detail_id) {
            var detail_rec = record.create({ type: 'customrecord_inventory_detail', isDynamic: true });
            detail_rec.setValue({ fieldId: 'custrecord_id_sku', value: sku });
            detail_rec.setValue({ fieldId: 'custrecord_id_location', value: location });
            detail_rec.setValue({ fieldId: 'custrecord_id_location_detail', value: location_bin });
            detail_rec.setValue({ fieldId: 'custrecord_id_location_box', value: location_box });
            detail_rec.setValue({ fieldId: 'custrecord_id_quantiy', value: quantiy });
            detail_rec.setValue({ fieldId: 'custrecord_id_type', value: wmstype });
            detail_rec.save();
        } else {
            var qty = old_quantiy + quantiy;
            record.submitFields({
                type: 'customrecord_inventory_detail',
                id: detail_id,
                values: {
                    custrecord_id_quantiy: qty
                }
            });
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
