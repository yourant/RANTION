define(['N/search', 'N/record'], function (search, record) {

    function productHandle(requestBody) {
        var productSkuList = [];
        for (var index = 0; index < requestBody.productSkuList.length; index++) {
            var skuInfo = requestBody.productSkuList[index];
            var skuDto = productSkuHandle(skuInfo);
            productSkuList.push(skuDto);
        }
        var product = {
            name: requestBody.productCode,
            custrecord_product_name_cn: requestBody.productNameCn,
            custrecord_product_name_en: requestBody.productNameEn,
            custrecord_product_abbr: requestBody.productAbbr,
            custrecord_product_brand: requestBody.productBrand,
            custrecord_product_category: requestBody.productCategory,
            custrecord_product_type: requestBody.productType,
            custrecord_product_department: requestBody.productDepartment,
            custrecord_product_status: requestBody.productStatus,
            custrecord_product_owner: requestBody.productOwner,
            custrecord_product_owner2: requestBody.productOwner2,
            custrecord_product_purchaser: requestBody.productPurchaser,
            custrecord_product_planner: requestBody.productPlanner,
            custrecord_product_declare_cn: requestBody.productDeclareCn,
            custrecord_product_declare_en: requestBody.productDeclareEn,
            custrecord_product_hscode_cn: requestBody.productHscodeCn,
            custrecord_product_hscode_en: requestBody.productHscodeEn,
            custrecord_product_added_tax: requestBody.productAddedTax,
            custrecord_product_taxrebates: requestBody.productTaxrebates,
            custrecord_product_declare_memo: requestBody.productDeclareMemo,
            custrecord_product_use: requestBody.productUse,
            custrecord_product_made_country: requestBody.productMadeCountry,
            custrecord_product_expirydate: requestBody.productExpirydate,
            custrecord_logistics_group: requestBody.logisticsGroup,
            custrecord_product_nature: requestBody.productNature,
            productSkuList: productSkuList
        }
        return product;
    }

    function productSkuHandle(requestBody) {
        var sku = {
            custrecord_sku_product_code: requestBody.productCode,
            name: requestBody.productSku,
            custrecord_product_sku_name: requestBody.productSkuName,
            custrecord_product_sku_name_en: requestBody.productSkuNameEn,
            custrecord_product_sku_abbr: requestBody.productSkuAbbr,
            custrecord_product_delivery_date: requestBody.deliveryDay,
            custrecord_product_sku_describe: requestBody.productSkuDescribe,
            custrecord_product_sku_transport: requestBody.productSkuTransport,
            custrecord_product_sku_warehouse_check: requestBody.productSkuWarehouseCheck,
            custrecord_product_sku_factory_check: requestBody.productSkuFactoryCheck,
            custrecord_product_sku_packing_weight: requestBody.productSkuPackingWeight,
            custrecord_product_sku_billing_weight: requestBody.productSkuBillingWeight,
            custrecord_product_sku_single_volume: requestBody.productSkuSingleVolume,
            custrecord_product_sku_weight: requestBody.productSkuWeight,
            custrecordproduct_sku_volume_weight: requestBody.productSkuVolumeWeight,
            custrecord_product_sku_long: requestBody.productSkuLong,
            custrecord_product_sku_width: requestBody.productSkuWidth,
            custrecord_product_sku_height: requestBody.productSkuHeight,
            custrecord_product_sku_box_long: requestBody.productSkuBoxLong,
            custrecord_product_sku_box_width: requestBody.productSkuBoxWidth,
            custrecord_product_sku_box_height: requestBody.productSkuBoxHeight,
            custrecord_product_sku_default_vendor: requestBody.productSkuVendor,
            custrecord_product_sku_logistics_cycle: requestBody.productSkuLogisticsCycle,
            custrecord_product_sku_mpq: requestBody.productSkuMpq,
            custrecord_product_sku_grading: requestBody.productSkuGrading,
            custrecord_product_init_grading: requestBody.productInitGrading,
            custrecord_product_sku_image_url: requestBody.productSkuImageUrl
        }
        return sku;
    }

    function saveProduct(requestBody) {
        var productCode = requestBody.name;
        var productId = false;
        search.create({
            type: 'customrecord_product',
            filters: [
                { name: 'name', operator: 'is', values: productCode }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (result) {
            productId = result.id;
            log.audit("productId", productId)
            return true;
        });
        var productRecord;
        if (productId) {
            productRecord = record.load({
                type: 'customrecord_product',
                id: productId
            })
        } else {
            productRecord = record.create({
                type: 'customrecord_product'
            })
        }
        productRecord.setValue({
            fieldId: 'customform',
            value: -1494
        })
        productRecord.setValue({
            fieldId: 'name',
            value: requestBody.name
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_name_cn',
            value: requestBody.custrecord_product_name_cn
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_name_en',
            value: requestBody.custrecord_product_name_en
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_abbr',
            value: requestBody.custrecord_product_abbr
        })
        productRecord.setText({
            fieldId: 'custrecord_product_brand',
            text: requestBody.custrecord_product_brand
        })
        productRecord.setText({
            fieldId: 'custrecord_product_category',
            text: requestBody.custrecord_product_category
        })
        productRecord.setText({
            fieldId: 'custrecord_product_type',
            text: requestBody.custrecord_product_type
        })
        productRecord.setText({
            fieldId: 'custrecord_product_department',
            text: requestBody.custrecord_product_department
        })
        productRecord.setText({
            fieldId: 'custrecord_product_owner',
            text: requestBody.custrecord_product_owner
        })
        productRecord.setText({
            fieldId: 'custrecord_product_owner2',
            text: requestBody.custrecord_product_owner2
        })
        productRecord.setText({
            fieldId: 'custrecord_product_purchaser',
            text: requestBody.custrecord_product_purchaser
        })
        productRecord.setText({
            fieldId: 'custrecord_product_planner',
            text: requestBody.custrecord_product_planner
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_declare_cn',
            value: requestBody.custrecord_product_declare_cn
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_declare_en',
            value: requestBody.custrecord_product_declare_en
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_hscode_cn',
            value: requestBody.custrecord_product_hscode_cn
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_hscode_en',
            value: requestBody.custrecord_product_hscode_en
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_added_tax',
            value: requestBody.custrecord_product_added_tax
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_taxrebates',
            value: requestBody.custrecord_product_taxrebates
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_declare_memo',
            value: requestBody.custrecord_product_declare_memo
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_use',
            value: requestBody.custrecord_product_use
        })
        productRecord.setText({
            fieldId: 'custrecord_product_made_country',
            text: requestBody.custrecord_product_made_country
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_expirydate',
            value: requestBody.custrecord_product_expirydate
        })
        productRecord.setText({
            fieldId: 'custrecord_logistics_group',
            text: requestBody.custrecord_logistics_group
        })
        productRecord.setText({
            fieldId: 'custrecord_product_nature',
            text: requestBody.custrecord_product_nature
        })
        productRecord.setValue({
            fieldId: 'custrecord_product_approval_status',
            value: 6
        })
        // var productSkuList = requestBody.productSkuList;
        // var skuCount = productRecord.getLineCount({
        //     sublistId: 'recmachcustrecord_sku_product_code'
        // });
        // var initCount = skuCount;
        // for (var index = 0; index < productSkuList.length; index++) {
        //     var skuInfo = productSkuList[index];
        //     if (skuCount > 0) {
        //         var rep = false;
        //         var repIndex = -1;
        //         for (var subIndex = 0; subIndex < skuCount; subIndex++) {
        //             var subSku = productRecord.getSublistValue({
        //                 sublistId: 'recmachcustrecord_sku_product_code',
        //                 fieldId: 'name',
        //                 line: subIndex
        //             })
        //             if (subSku == skuInfo.name) {
        //                 rep = true;
        //                 repIndex = subIndex;
        //             }
        //         }
        //         if (rep) {
        //             log.error('rep', repIndex)
        //             saveSubProductSku(productRecord, skuInfo, repIndex);
        //         } else {
        //             log.error('rep else', initCount)
        //             saveSubProductSku(productRecord, skuInfo, initCount);
        //             initCount++;
        //         }
        //     }
        // }
        var id = productRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        record.submitFields({
            type: 'customrecord_product',
            id: id,
            ignoreMandatoryFields: true,
            values: {
                customform: -1494,
                custrecord_product_approval_status: 6
            }
        })
        return id;
    }

    function saveSubProductSku(productRecord, skuInfo, count) {
        log.error('saveSubProductSku' + count, JSON.stringify(skuInfo))
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_sku_product_code',
            text: skuInfo.custrecord_sku_product_code,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'name',
            value: skuInfo.name,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_name',
            value: skuInfo.custrecord_product_sku_name,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_name_en',
            value: skuInfo.custrecord_product_sku_name_en,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_abbr',
            value: skuInfo.custrecord_product_sku_abbr,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_delivery_date',
            value: skuInfo.custrecord_product_delivery_date,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_describe',
            value: skuInfo.custrecord_product_sku_describe,
            line: count
        });
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_transport',
            text: skuInfo.custrecord_product_sku_transport,
            line: count
        });
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_warehouse_check',
            text: skuInfo.custrecord_product_sku_warehouse_check,
            line: count
        });
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_factory_check',
            text: skuInfo.custrecord_product_sku_factory_check,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_packing_weight',
            value: skuInfo.custrecord_product_sku_packing_weight,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_billing_weight',
            value: skuInfo.custrecord_product_sku_billing_weight,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_single_volume',
            value: skuInfo.custrecord_product_sku_single_volume,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_weight',
            value: skuInfo.custrecord_product_sku_weight,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecordproduct_sku_volume_weight',
            value: skuInfo.custrecordproduct_sku_volume_weight,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_long',
            value: skuInfo.custrecord_product_sku_long,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_width',
            value: skuInfo.custrecord_product_sku_width,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_height',
            value: skuInfo.custrecord_product_sku_height,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_box_long',
            value: skuInfo.custrecord_product_sku_box_long,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_box_width',
            value: skuInfo.custrecord_product_sku_box_width,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_box_height',
            value: skuInfo.custrecord_product_sku_box_height,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_logistics_cycle',
            value: skuInfo.custrecord_product_sku_logistics_cycle,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_mpq',
            value: skuInfo.custrecord_product_sku_mpq,
            line: count
        });
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_grading',
            text: skuInfo.custrecord_product_sku_grading,
            line: count
        });
        productRecord.setSublistText({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_init_grading',
            text: skuInfo.custrecord_product_init_grading,
            line: count
        });
        productRecord.setSublistValue({
            sublistId: 'recmachcustrecord_sku_product_code',
            fieldId: 'custrecord_product_sku_image_url',
            value: skuInfo.custrecord_product_sku_image_url,
            line: count
        });
    }

    function saveProductSku(requestBody) {
        var sku = requestBody.name;
        var skuId = false;
        search.create({
            type: 'customrecord_product_sku',
            filters: [
                { name: 'name', operator: 'is', values: sku }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (result) {
            skuId = result.id;
            return true;
        });
        var skuRecord;
        if (skuId) {
            skuRecord = record.load({
                type: 'customrecord_product_sku',
                id: skuId
            })
        } else {
            skuRecord = record.create({
                type: 'customrecord_product_sku'
            })
        }
        skuRecord.setValue({
            fieldId: 'customform',
            value: -1495
        })
        skuRecord.setText({
            fieldId: 'custrecord_sku_product_code',
            text: requestBody.custrecord_sku_product_code
        });
        skuRecord.setValue({
            fieldId: 'name',
            value: requestBody.name
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_name',
            value: requestBody.custrecord_product_sku_name
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_name_en',
            value: requestBody.custrecord_product_sku_name_en
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_abbr',
            value: requestBody.custrecord_product_sku_abbr
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_delivery_date',
            value: requestBody.custrecord_product_delivery_date
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_describe',
            value: requestBody.custrecord_product_sku_describe
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_sku_transport',
            text: requestBody.custrecord_product_sku_transport
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_sku_warehouse_check',
            text: requestBody.custrecord_product_sku_warehouse_check
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_sku_factory_check',
            text: requestBody.custrecord_product_sku_factory_check
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_packing_weight',
            value: requestBody.custrecord_product_sku_packing_weight
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_billing_weight',
            value: requestBody.custrecord_product_sku_billing_weight
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_single_volume',
            value: requestBody.custrecord_product_sku_single_volume
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_weight',
            value: requestBody.custrecord_product_sku_weight
        });
        skuRecord.setValue({
            fieldId: 'custrecordproduct_sku_volume_weight',
            value: requestBody.custrecordproduct_sku_volume_weight
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_long',
            value: requestBody.custrecord_product_sku_long
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_width',
            value: requestBody.custrecord_product_sku_width
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_height',
            value: requestBody.custrecord_product_sku_height
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_box_long',
            value: requestBody.custrecord_product_sku_box_long
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_box_width',
            value: requestBody.custrecord_product_sku_box_width
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_box_height',
            value: requestBody.custrecord_product_sku_box_height
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_logistics_cycle',
            value: requestBody.custrecord_product_sku_logistics_cycle
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_mpq',
            value: requestBody.custrecord_product_sku_mpq
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_sku_grading',
            text: requestBody.custrecord_product_sku_grading
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_init_grading',
            text: requestBody.custrecord_product_init_grading
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_image_url',
            value: requestBody.custrecord_product_sku_image_url
        });
        skuRecord.setText({
            fieldId: 'custrecord_product_sku_default_vendor',
            text: requestBody.custrecord_product_sku_default_vendor
        });
        skuRecord.setValue({
            fieldId: 'custrecord_product_sku_approval_status',
            value: 6
        });
        skuRecord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
    }

    return {
        productHandle: productHandle,
        productSkuHandle: productSkuHandle,
        saveProduct: saveProduct,
        saveProductSku: saveProductSku
    }

});