/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],

    function (search, record) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {

        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            var oldrec = scriptContext.oldRecord;
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {
            log.audit("scriptContext.type", scriptContext.type);
            var rec = scriptContext.newRecord;
            var oldrec = scriptContext.oldRecord;
            if (scriptContext.type == 'edit'
                && rec.getValue("custitem_dps_approval_status") == 6) {
                var skuId = false;
                search.create({
                    type: 'customrecord_product_sku',
                    filters: [
                        { name: 'custrecord_product_sku', operator: 'is', values: rec.getValue("itemid") }
                    ],
                    columns: [
                        { name: 'internalid' }
                    ]
                }).run().each(function (rec) {
                    skuId = rec.id;
                    log.audit("skuId", skuId);
                    return false;
                });
                if (!skuId) {
                    var customrecord_product_sku = record.create({
                        type: 'customrecord_product_sku'
                    });
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_sku_product_code',
                        value: rec.getValue('custitem_dps_spucoding')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku',
                        value: rec.getValue('itemid')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_name',
                        value: rec.getValue('custitem_dps_skuchiense')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_name_en',
                        value: rec.getValue('custitem_dps_spuenglishnames')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_abbr',
                        value: rec.getValue('custitem_dps_skureferred')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_delivery_date',
                        value: rec.getValue('custitem_dps_deliverydate')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_describe',
                        value: rec.getValue('custitem_dps_describe')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_packing_weight',
                        value: rec.getValue('custitem_dps_packing_weight')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_billing_weight',
                        value: rec.getValue('custitem_dps_heavy1')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_weight',
                        value: rec.getValue('custitem_dps_heavy2')
                    })
                    // 体积重(g)	custrecord_product_sku_volume_weight
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_long',
                        value: rec.getValue('custitem_dps_long')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_width',
                        value: rec.getValue('custitem_dps_wide')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_height',
                        value: rec.getValue('custitem_dps_high')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_logistics_cycle',
                        value: rec.getValue('custitem_dps_logistics_cycle')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_mpq',
                        value: rec.getValue('custitem_dps_mpq')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_single_volume',
                        value: rec.getValue('custitem_dps_single_volume')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_transport',
                        value: rec.getValue('custitem_dps_transport')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_warehouse_check',
                        value: rec.getValue('custitem_dps_warehouse_check')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_factory_check',
                        value: rec.getValue('custitem_dps_factory_inspe')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecord_product_sku_grading',
                        value: rec.getValue('custitem_product_grading')
                    })
                    customrecord_product_sku.setValue({
                        fieldId: 'custrecordproduct_init_grading',
                        value: rec.getValue('custitemf_product_grading')
                    })
                    customrecord_product_sku.save();
                } else {
                    record.submitFields({
                        type: 'customrecord_product_sku',
                        id: skuId,
                        values: {
                            custrecord_product_sku_name: rec.getValue('custitem_dps_skuchiense')
                            , custrecord_product_sku_name_en: rec.getValue('custitem_dps_spuenglishnames')
                            , custrecord_product_sku_abbr: rec.getValue('custitem_dps_skureferred')
                            , custrecord_product_delivery_date: rec.getValue('custitem_dps_deliverydate')
                            , custrecord_product_sku_describe: rec.getValue('custitem_dps_describe')
                            , custrecord_product_sku_packing_weight: rec.getValue('custitem_dps_packing_weight')
                            , custrecord_product_sku_billing_weight: rec.getValue('custitem_dps_heavy1')
                            , custrecord_product_sku_weight: rec.getValue('custitem_dps_heavy2')
                            , custrecord_product_sku_long: rec.getValue('custitem_dps_long')
                            , custrecord_product_sku_width: rec.getValue('custitem_dps_wide')
                            , custrecord_product_sku_height: rec.getValue('custitem_dps_high')
                            , custrecord_product_sku_logistics_cycle: rec.getValue('custitem_dps_logistics_cycle')
                            , custrecord_product_sku_mpq: rec.getValue('custitem_dps_mpq')
                            , custrecord_product_sku_single_volume: rec.getValue('custitem_dps_single_volume')
                            , custrecord_product_sku_transport: rec.getValue('custitem_dps_transport')
                            , custrecord_product_sku_warehouse_check: rec.getValue('custitem_dps_warehouse_check')
                            , custrecord_product_sku_factory_check: rec.getValue('custitem_dps_factory_inspe')
                            , custrecord_product_sku_grading: rec.getValue('custitem_product_grading')
                            , custrecordproduct_init_grading: rec.getValue('custitemf_product_grading')
                        }
                    });
                }
            }
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
