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
                && rec.getValue("custrecord_product_approval_status") == 6) {
                var product = {
                    custrecord_product_code: rec.getValue("custrecord_product_code")
                    , custrecord_product_name_cn: rec.getValue("custrecord_product_name_cn")
                    , custrecord_product_name_en: rec.getValue("custrecord_product_name_en")
                    , custrecord_product_abbr: rec.getValue("custrecord_product_abbr")
                    , custrecord_product_brand: rec.getValue("custrecord_product_brand")
                    , custrecord_product_category: rec.getValue("custrecord_product_category")
                    , custrecord_product_status: rec.getValue("custrecord_product_status")
                    , custrecord_product_class: rec.getValue("custrecord_product_class")
                    , custrecord_product_name_cn: rec.getValue("custrecord_product_name_cn")
                    , custrecord_product_type: rec.getValue("custrecord_product_type")
                    , custrecord_product_department: rec.getValue("custrecord_product_department")
                    , custrecord_product_line: rec.getValue("custrecord_product_line")
                    , custrecord_product_owner: rec.getValue("custrecord_product_owner")
                    , custrecord_product_owner2: rec.getValue("custrecord_product_owner2")
                    , custrecord_product_purchaser: rec.getValue("custrecord_product_purchaser")
                    , custrecord_product_planner: rec.getValue("custrecord_product_planner")
                    , custrecord_product_declare_cn: rec.getValue("custrecord_product_declare_cn")
                    , custrecord_product_declare_en: rec.getValue("custrecord_product_declare_en")
                    , custrecord_product_added_tax: rec.getValue("custrecord_product_added_tax")
                    , custrecord_product_taxrebates: rec.getValue("custrecord_product_taxrebates")
                    , custrecord_product_declare_memo: rec.getValue("custrecord_product_declare_memo")
                    , custrecord_product_hscode_cn: rec.getValue("custrecord_product_hscode_cn")
                    , custrecord_product_hscode_en: rec.getValue("custrecord_product_hscode_en")
                    , custrecord_product_use: rec.getValue("custrecord_product_use")
                    , custrecord_product_made_country: rec.getValue("custrecord_product_made_country")
                    , custrecord_product_expirydate: rec.getValue("custrecord_product_expirydate")
                    , custrecord_logistics_group: rec.getValue("custrecord_logistics_group")
                    , custrecord_product_nature: rec.getValue("custrecord_product_nature")
                };
                // var productId = saveProduct(product);
                var skuCount = rec.getLineCount({
                    sublistId: 'recmachcustrecord_sku_product_code'
                });
                for (var index = 0; index < skuCount; index++) {
                    var sku = {
                        custrecord_sku_product_code: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_sku_product_code',
                            line: index
                        })
                        , name: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'name',
                            line: index
                        })
                        , custrecord_product_sku_name: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_name',
                            line: index
                        })
                        , custrecord_product_sku_name_en: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_name_en',
                            line: index
                        })
                        , custrecord_product_sku_abbr: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_abbr',
                            line: index
                        })
                        , custrecord_product_delivery_date: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_delivery_date',
                            line: index
                        })
                        , custrecord_product_sku_describe: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_describe',
                            line: index
                        })
                        , custrecord_product_sku_packing_weight: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_packing_weight',
                            line: index
                        })
                        , custrecord_product_sku_billing_weight: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_billing_weight',
                            line: index
                        })
                        , custrecord_product_sku_weight: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_weight',
                            line: index
                        })
                        , custrecord_product_sku_volume_weight: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_volume_weight',
                            line: index
                        })
                        , custrecord_product_sku_long: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_long',
                            line: index
                        })
                        , custrecord_product_sku_width: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_width',
                            line: index
                        })
                        , custrecord_product_sku_height: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_height',
                            line: index
                        })
                        , custrecord_product_sku_logistics_cycle: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_logistics_cycle',
                            line: index
                        })
                        , custrecord_product_sku_mpq: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_mpq',
                            line: index
                        })
                        , custrecord_product_sku_single_volume: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_single_volume',
                            line: index
                        })
                        , custrecord_product_sku_transport: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_transport',
                            line: index
                        })
                        , custrecord_product_sku_warehouse_check: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_warehouse_check',
                            line: index
                        })
                        , custrecord_product_sku_factory_check: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_factory_check',
                            line: index
                        })
                        , custrecord_product_sku_grading: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_grading',
                            line: index
                        })
                        , custrecord_product_init_grading: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_init_grading',
                            line: index
                        })
                        , custrecord_product_sku_default_vendor: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_default_vendor',
                            line: index
                        })
                        , custrecord_product_sku_image_url: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_image_url',
                            line: index
                        })
                        , custrecord_product_sku_box_long: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_box_long',
                            line: index
                        })
                        , custrecord_product_sku_box_width: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_box_width',
                            line: index
                        })
                        , custrecord_product_sku_box_height: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'custrecord_product_sku_box_height',
                            line: index
                        })
                        , custrecord_product_code: rec.getValue("custrecord_product_code")
                        , custrecord_product_name_cn: rec.getValue("custrecord_product_name_cn")
                        , custrecord_product_name_en: rec.getValue("custrecord_product_name_en")
                        , custrecord_product_abbr: rec.getValue("custrecord_product_abbr")
                        , custrecord_product_brand: rec.getValue("custrecord_product_brand")
                        , custrecord_product_category: rec.getValue("custrecord_product_category")
                        , custrecord_product_status: rec.getValue("custrecord_product_status")
                        , custrecord_product_class: rec.getValue("custrecord_product_class")
                        , custrecord_product_name_cn: rec.getValue("custrecord_product_name_cn")
                        , custrecord_product_type: rec.getValue("custrecord_product_type")
                        , custrecord_product_department: rec.getValue("custrecord_product_department")
                        , custrecord_product_line: rec.getValue("custrecord_product_line")
                        , custrecord_product_owner: rec.getValue("custrecord_product_owner")
                        , custrecord_product_owner2: rec.getValue("custrecord_product_owner2")
                        , custrecord_product_purchaser: rec.getValue("custrecord_product_purchaser")
                        , custrecord_product_planner: rec.getValue("custrecord_product_planner")
                        , custrecord_product_declare_cn: rec.getValue("custrecord_product_declare_cn")
                        , custrecord_product_declare_en: rec.getValue("custrecord_product_declare_en")
                        , custrecord_product_added_tax: rec.getValue("custrecord_product_added_tax")
                        , custrecord_product_taxrebates: rec.getValue("custrecord_product_taxrebates")
                        , custrecord_product_declare_memo: rec.getValue("custrecord_product_declare_memo")
                        , custrecord_product_hscode_cn: rec.getValue("custrecord_product_hscode_cn")
                        , custrecord_product_hscode_en: rec.getValue("custrecord_product_hscode_en")
                        , custrecord_product_use: rec.getValue("custrecord_product_use")
                        , custrecord_product_made_country: rec.getValue("custrecord_product_made_country")
                        , custrecord_product_expirydate: rec.getValue("custrecord_product_expirydate")
                        , custrecord_logistics_group: rec.getValue("custrecord_logistics_group")
                        , custrecord_product_nature: rec.getValue("custrecord_product_nature")
                    }
                    // record.submitFields({
                    //     type: 'customrecord_product_sku',
                    //     id: rec.getSublistValue({
                    //         sublistId: 'recmachcustrecord_sku_product_code',
                    //         fieldId: 'id',
                    //         line: index
                    //     }),
                    //     ignoreMandatoryFields: true,
                    //     values: {
                    //         custrecord_product_sku_department: rec.getValue("custrecord_product_department"),
                    //         custrecord_product_sku_category: rec.getValue("custrecord_product_category")
                    //     }
                    // });
                    var skuId = saveSku(rec.id, sku);
                    if (oldrec.getValue("custrecord_product_approval_status") != 6) {
                        record.submitFields({
                            type: 'customrecord_product_sku',
                            id: rec.getSublistValue({
                                sublistId: 'recmachcustrecord_sku_product_code',
                                fieldId: 'id',
                                line: index
                            }),
                            values: {
                                custrecord_product_sku_approval_status: 6
                            }
                        });
                    }
                }
            }
        }

        function setProduct(inventoryitem, body) {
            inventoryitem.setValue({
                fieldId: 'itemid',
                value: body.custrecord_product_code
            })
            inventoryitem.setValue({
                fieldId: 'displayname',
                value: body.custrecord_product_name_cn
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_spuenglishnames',
                value: body.custrecord_product_name_en
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_spureferred',
                value: body.custrecord_product_abbr
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_brand',
                value: body.custrecord_product_brand
            })
            inventoryitem.setValue({
                fieldId: 'class',
                value: body.custrecord_product_category
            })
            inventoryitem.setValue({
                fieldId: 'taxschedule',
                value: 1
            })
            // 状态	custrecord_product_status	列表/记录	产品状态	 	是
            // 产品性质	custrecord_product_class	多项选择	产品性质	 	是
            inventoryitem.setValue({
                fieldId: 'custitem_dps_ctype',
                value: body.custrecord_product_type
            })
            inventoryitem.setValue({
                fieldId: 'department',
                value: body.custrecord_product_department
            })
            // 产品线	custrecord_product_line	列表/记录	产品线	 	否
            inventoryitem.setValue({
                fieldId: 'custitem_dps_product_owner',
                value: body.custrecord_product_owner
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_byproduct_owner',
                value: body.custrecord_product_owner2
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_purchasing_manager',
                value: body.custrecord_product_purchaser
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_planner',
                value: body.custrecord_product_planner
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_declaration_cn',
                value: body.custrecord_product_declare_cn
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_declaration_us',
                value: body.custrecord_product_declare_en
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_added_tax',
                value: body.custrecord_product_added_tax
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_taxrebates',
                value: body.custrecord_product_taxrebates
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_declare',
                value: body.custrecord_product_declare_memo
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_hscode1',
                value: body.custrecord_product_hscode_cn
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_hscode2',
                value: body.custrecord_product_hscode_en
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_use',
                value: body.custrecord_product_use
            })
            // 制造国家	custrecord_product_made_country	列表/记录	DPS | Country Code	 	否
            inventoryitem.setValue({
                fieldId: 'custitem_dps_quality',
                value: body.custrecord_product_expirydate
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_group',
                value: body.custrecord_logistics_group
            })
            inventoryitem.setValue({
                fieldId: 'custitem_dps_nature',
                value: body.custrecord_product_nature
            })
        }

        function saveProduct(body) {
            var inventoryitem = record.create({
                type: 'inventoryitem'
            });
            inventoryitem.setValue({
                fieldId: 'customform',
                value: 32
            })
            setProduct(inventoryitem, body);
            return inventoryitem.save();
        }



        function saveSku(parent, body) {
            var skuId = false;
            search.create({
                type: 'inventoryitem',
                filters: [
                    { name: 'itemid', operator: 'is', values: body.name }
                ],
                columns: [
                    { name: 'internalid' }
                ]
            }).run().each(function (rec) {
                skuId = rec.id;
                return false;
            });
            if (!skuId) {
                var inventoryitem = record.create({
                    type: 'inventoryitem'
                });
                inventoryitem.setValue({
                    fieldId: 'customform',
                    value: -200
                })
                inventoryitem.setValue({
                    fieldId: 'includechildren',
                    value: true
                })
                setProduct(inventoryitem, body);
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_spucoding',
                    value: parent
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_approval_status',
                    value: 6
                })
                inventoryitem.setValue({
                    fieldId: 'itemid',
                    value: body.name
                })
                inventoryitem.setValue({
                    fieldId: 'taxschedule',
                    value: 1
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_skuchiense',
                    value: body.custrecord_product_sku_name
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_skuenglish',
                    value: body.custrecord_product_sku_name_en
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_skureferred',
                    value: body.custrecord_product_sku_abbr
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_deliverydate',
                    value: body.custrecord_product_delivery_date
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_describe',
                    value: body.custrecord_product_sku_describe
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_packing_weight',
                    value: body.custrecord_product_sku_packing_weight
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_heavy1',
                    value: body.custrecord_product_sku_billing_weight
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_heavy2',
                    value: body.custrecord_product_sku_weight
                })
                // 体积重(g)	custrecord_product_sku_volume_weight
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_long',
                    value: body.custrecord_product_sku_long
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_wide',
                    value: body.custrecord_product_sku_width
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_high',
                    value: body.custrecord_product_sku_height
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_logistics_cycle',
                    value: body.custrecord_product_sku_logistics_cycle
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_mpq',
                    value: body.custrecord_product_sku_mpq
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_single_volume',
                    value: body.custrecord_product_sku_single_volume
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_transport',
                    value: body.custrecord_product_sku_transport
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_warehouse_check',
                    value: body.custrecord_product_sku_warehouse_check
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_factory_inspe',
                    value: body.custrecord_product_sku_factory_check
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_product_grading',
                    value: body.custrecord_product_sku_grading
                })
                inventoryitem.setValue({
                    fieldId: 'custitemf_product_grading',
                    value: body.custrecord_product_init_grading
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_picture',
                    value: body.custrecord_product_sku_image_url
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_box_long',
                    value: body.custrecord_product_sku_box_long
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_box_wide',
                    value: body.custrecord_product_sku_box_width
                })
                inventoryitem.setValue({
                    fieldId: 'custitem_dps_box_high',
                    value: body.custrecord_product_sku_box_height
                })

                if (body.custrecord_product_sku_default_vendor) {
                    inventoryitem.setSublistValue({
                        sublistId: 'itemvendor',
                        fieldId: 'vendor',
                        value: body.custrecord_product_sku_default_vendor,
                        line: 0
                    });
                    inventoryitem.setSublistValue({
                        sublistId: 'itemvendor',
                        fieldId: 'preferredvendor',
                        value: true,
                        line: 0
                    });
                }

                skuId = inventoryitem.save();
            } else {
                log.audit("inventoryitem edit", skuId);
                record.submitFields({
                    type: 'inventoryitem',
                    id: skuId,
                    ignoreMandatoryFields: true,
                    values: {
                        customform: -200,
                        includechildren: true,
                        custitem_dps_skuchiense: body.custrecord_product_sku_name,
                        custitem_dps_skuenglish: body.custrecord_product_sku_name_en,
                        custitem_dps_skureferred: body.custrecord_product_sku_abbr,
                        custitem_dps_deliverydate: body.custrecord_product_delivery_date,
                        custitem_dps_describe: body.custrecord_product_sku_describe,
                        custitem_dps_packing_weight: body.custrecord_product_sku_packing_weight,
                        custitem_dps_heavy1: body.custrecord_product_sku_billing_weight,
                        custitem_dps_heavy2: body.custrecord_product_sku_weight,
                        custitem_dps_long: body.custrecord_product_sku_long,
                        custitem_dps_wide: body.custrecord_product_sku_width,
                        custitem_dps_high: body.custrecord_product_sku_height,
                        custitem_dps_logistics_cycle: body.custrecord_product_sku_logistics_cycle,
                        custitem_dps_mpq: body.custrecord_product_sku_mpq,
                        custitem_dps_single_volume: body.custrecord_product_sku_single_volume,
                        custitem_dps_transport: body.custrecord_product_sku_transport,
                        custitem_dps_warehouse_check: body.custrecord_product_sku_warehouse_check,
                        custitem_dps_factory_inspe: body.custrecord_product_sku_factory_check,
                        custitem_product_grading: body.custrecord_product_sku_grading,
                        custitemf_product_grading: body.custrecord_product_init_grading,
                        custitem_dps_picture: body.custrecord_product_sku_image_url,
                        custitem_dps_box_long: body.custrecord_product_sku_box_long,
                        custitem_dps_box_wide: body.custrecord_product_sku_box_width,
                        custitem_dps_box_high: body.custrecord_product_sku_box_height,
                        //SPU
                        displayname: body.custrecord_product_name_cn,
                        custitem_dps_spuenglishnames: body.custrecord_product_name_en,
                        custitem_dps_spureferred: body.custrecord_product_abbr,
                        custitem_dps_brand: body.custrecord_product_brand,
                        class: body.custrecord_product_category,
                        taxschedule: 1,
                        custitem_dps_ctype: body.custrecord_product_type,
                        department: body.custrecord_product_department,
                        custitem_dps_product_owner: body.custrecord_product_owner,
                        custitem_dps_byproduct_owner: body.custrecord_product_owner2,
                        custitem_dps_purchasing_manager: body.custrecord_product_purchaser,
                        custitem_dps_planner: body.custrecord_product_planner,
                        custitem_dps_declaration_cn: body.custrecord_product_declare_cn,
                        custitem_dps_declaration_us: body.custrecord_product_declare_en,
                        custitem_dps_added_tax: body.custrecord_product_added_tax,
                        custitem_dps_taxrebates: body.custrecord_product_taxrebates,
                        custitem_dps_declare: body.custrecord_product_declare_memo,
                        custitem_dps_hscode1: body.custrecord_product_hscode_cn,
                        custitem_dps_hscode2: body.custrecord_product_hscode_en,
                        custitem_dps_use: body.custrecord_product_use,
                        custitem_dps_quality: body.custrecord_product_expirydate,
                        custitem_dps_group: body.custrecord_logistics_group,
                        custitem_dps_nature: body.custrecord_product_nature
                    }
                })
                if (body.custrecord_product_sku_default_vendor) {
                    var itemInfo = record.load({
                        type: 'InventoryItem',
                        id: skuId
                    })
                    var itemvendorCount = itemInfo.getLineCount({
                        sublistId: 'itemvendor'
                    })

                    var vendorSet = false;
                    for (var index = 0; index < itemvendorCount; index++) {
                        var vendorId = itemInfo.getSublistValue({
                            sublistId: 'itemvendor',
                            fieldId: 'vendor',
                            line: index
                        })
                        if (vendorId == body.custrecord_product_sku_default_vendor) {
                            itemInfo.setSublistValue({
                                sublistId: 'itemvendor',
                                fieldId: 'preferredvendor',
                                line: index,
                                value: true
                            });
                            vendorSet = true;
                        }
                    }
                    if (!vendorSet) {
                        itemInfo.setSublistValue({
                            sublistId: 'itemvendor',
                            fieldId: 'vendor',
                            value: body.custrecord_product_sku_default_vendor,
                            line: itemvendorCount
                        });
                        itemInfo.setSublistValue({
                            sublistId: 'itemvendor',
                            fieldId: 'preferredvendor',
                            value: true,
                            line: itemvendorCount
                        });
                    }
                    itemInfo.save({
                        ignoreMandatoryFields: true
                    });
                }
            }
            return skuId;
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
