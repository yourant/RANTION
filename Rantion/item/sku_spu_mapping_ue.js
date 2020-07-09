/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {

    function beforeLoad(context) {
        try {
            var rec = context.newRecord;
            if (rec.id) {
                var data = record.load({ type: rec.type, id: rec.id });
                if (data.getValue('matrixtype') != 'PARENT') {
                    return;
                }
                var spu_code = data.getText('itemid');
                var items = data.getLineCount({ sublistId: 'matrixmach' });
                if (items) {
                    var sku_list = [];
                    for (var i = 0; i < items; i++) {
                        var sku_code = data.getSublistValue({
                            sublistId: 'matrixmach',
                            fieldId: 'mtrxname',
                            line: i,
                        });
                        sku_list.push(sku_code);
                    }
                    for (var i = 0; i < sku_list.length; i++) {
                        var mapping;
                        search.create({
                            type: 'customrecord_dps_spu_sku_mapping',
                            filters: [
                                { name: 'custrecord_dps_spu_code', operator: search.Operator.IS, values: spu_code },
                                { name: 'custrecord_dps_sku_code', operator: search.Operator.IS, values: sku_list[i] }
                            ]
                        }).run().each(function (rec) {
                            mapping = record.load({ type: 'customrecord_dps_spu_sku_mapping', id: rec.id, isDynamic: true });
                            return false;
                        });
                        if (!mapping) {
                            mapping = record.create({ type: 'customrecord_dps_spu_sku_mapping' });
                        }
                        mapping.setValue({ fieldId: 'custrecord_dps_spu_code', value: spu_code });
                        mapping.setValue({ fieldId: 'custrecord_dps_sku_code', value: sku_list[i] });
                        mapping.save();
                    }
                }
            }
        } catch (e) {
            log.debug('e', e);
        }

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var rec = context.newRecord;
        if (context.type == 'edit') {
            var old_rec = context.oldRecord;
            var old_spu_code = old_rec.getText('parent');
            var old_sku_code = old_rec.getText('itemid');
            var spu_code = rec.getText('parent');
            var sku_code = rec.getText('itemid');
            if (spu_code && sku_code) {
                try {
                    var mapping;
                    if (old_spu_code && old_sku_code) {
                        search.create({
                            type: 'customrecord_dps_spu_sku_mapping',
                            filters: [
                                { name: 'custrecord_dps_spu_code', operator: search.Operator.IS, values: old_spu_code },
                                { name: 'custrecord_dps_sku_code', operator: search.Operator.IS, values: old_sku_code }
                            ]
                        }).run().each(function (rec) {
                            mapping = record.load({ type: 'customrecord_dps_spu_sku_mapping', id: rec.id, isDynamic: true });
                            return false;
                        });
                    }
                    if (!mapping) {
                        mapping = record.create({ type: 'customrecord_dps_spu_sku_mapping' });
                    }
                    mapping.setValue({ fieldId: 'custrecord_dps_spu_code', value: spu_code });
                    mapping.setValue({ fieldId: 'custrecord_dps_sku_code', value: sku_code });
                    mapping.save();
                } catch (e) {
                    log.debug('e', e);
                }
            } else if (old_spu_code && old_sku_code && (!sku_code || !spu_code)) {
                var bill_id;
                try {
                    search.create({
                        type: 'customrecord_dps_spu_sku_mapping',
                        filters: [
                            { name: 'custrecord_dps_spu_code', operator: search.Operator.IS, values: old_spu_code },
                            { name: 'custrecord_dps_sku_code', operator: search.Operator.IS, values: old_sku_code }
                        ]
                    }).run().each(function (rec) {
                        bill_id = rec.id;
                        return false;
                    });
                    if (bill_id) {
                        record.delete({
                            type: 'customrecord_dps_spu_sku_mapping',
                            id: bill_id
                        });
                    }
                } catch (e) {
                    log.debug('e', e);
                }
            }
        }
        // else if(context.type == 'create'){
        //     var rec = context.newRecord;
        //     var spu_code = rec.getValue('parent');
        //     var sku_code = rec.getValue('itemid');
        //     if (spu_code && sku_code) {
        //         try {
        //             var mapping;
        //             search.create({
        //                 type: 'customrecord_dps_spu_sku_mapping',
        //                 filters: [
        //                     { name: 'custrecord_dps_spu_code', operator: search.Operator.IS, values: spu_code },
        //                     { name: 'custrecord_dps_sku_code', operator: search.Operator.IS, values: sku_code }
        //                 ]
        //             }).run().each(function (rec) {
        //                 mapping = record.load({ type: 'customrecord_dps_spu_sku_mapping', id: rec.id, isDynamic: true });
        //                 return false;
        //             });
        //             if (!mapping) {
        //                 mapping = record.create({ type: 'customrecord_dps_spu_sku_mapping' });
        //             }
        //             mapping.setValue({ fieldId: 'custrecord_dps_spu_code', value: spu_code });
        //             mapping.setValue({ fieldId: 'custrecord_dps_sku_code', value: sku_code });
        //             mapping.save();
        //         } catch (e) {
        //             log.debug('e', e);
        //         }
        //     }
        // }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
