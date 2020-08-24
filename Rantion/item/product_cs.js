/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/record', 'N/ui/dialog'], function (search, record, dialog) {

    function pageInit(context) {

    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        var rec = context.currentRecord;
        var repeat = false;
        if (context.fieldId == 'name' && rec.getValue('name')) {
            repeat = checkRepeat(rec);
            if (repeat) {
                dialog.alert({ title: '提示', message: 'SPU编码[' + rec.getValue('name') + ']重复' });
                rec.setValue({
                    fieldId: 'name',
                    value: ""
                });
                return false;
            }
        }
        if (context.sublistId == 'recmachcustrecord_sku_product_code'
            && context.fieldId == 'name') {
            var currentSku = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_sku_product_code',
                fieldId: 'name'
            })
            if (currentSku) {
                var skuArr = [];
                var skuCount = rec.getLineCount({
                    sublistId: 'recmachcustrecord_sku_product_code'
                });
                for (var index = 0; index < skuCount; index++) {
                    if (context.line != index) {
                        var sku = rec.getSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'name',
                            line: index
                        })
                        skuArr.push(sku);
                    }
                }
                skuArr.push(currentSku);
                if ((new Set(skuArr)).size != skuArr.length) {
                    dialog.alert({ title: '提示', message: 'SKU编码[' + sku + ']重复' });
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_sku_product_code',
                        fieldId: 'name',
                        value: ''
                    })
                    return false;
                }

                search.create({
                    type: 'customrecord_product_sku',
                    filters: [
                        { name: 'name', operator: 'is', values: currentSku }
                    ],
                    columns: [
                        { name: 'internalid' }
                    ]
                }).run().each(function (result) {
                    var skuId = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_sku_product_code',
                        fieldId: 'id',
                        line: index
                    })
                    if (result.id != skuId) {
                        dialog.alert({ title: '提示', message: 'SKU编码[' + currentSku + ']重复' });
                        rec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_sku_product_code',
                            fieldId: 'name',
                            value: ''
                        })
                    }
                    return true;
                });
            }
        }
        return true;
    }


    function checkRepeat(rec) {
        var repeat = false;
        search.create({
            type: rec.type,
            filters: [
                { name: 'name', operator: 'is', values: rec.getValue('name') }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (result) {
            if (result.id != rec.id) {
                repeat = true;
            }
            return true;
        });
        return repeat;
    }


    function checkSublistRepeat(rec) {
        var repeat = false;
        var skuCount = rec.getLineCount({
            sublistId: 'recmachcustrecord_sku_product_code'
        });
        var skuArr = [];
        for (var index = 0; index < skuCount; index++) {
            var sku = rec.getSublistValue({
                sublistId: 'recmachcustrecord_sku_product_code',
                fieldId: 'name',
                line: index
            })
            skuArr.push(sku);
        }
        if ((new Set(skuArr)).size != skuArr.length) {
            return true;
        }
        for (var index = 0; index < skuCount; index++) {
            var sku = rec.getSublistValue({
                sublistId: 'recmachcustrecord_sku_product_code',
                fieldId: 'name',
                line: index
            })
            skuArr.push(sku);
            search.create({
                type: 'customrecord_product_sku',
                filters: [
                    { name: 'name', operator: 'is', values: sku }
                ],
                columns: [
                    { name: 'internalid' }
                ]
            }).run().each(function (result) {
                var skuId = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_sku_product_code',
                    fieldId: 'id',
                    line: index
                })
                if (result.id != skuId) {
                    repeat = true;
                }
                return true;
            });
        }
        return repeat;
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
        // var result = checkSublistRepeat(context.currentRecord);
        // if (result) {
        //     dialog.alert({ title: '提示', message: 'SKU编码重复' });
        //     return false;
        // }
        return true;
    }

    function sublistChanged(context) {
        // var result = checkSublistRepeat(context.currentRecord);
        // if (result) {
        //     dialog.alert({ title: '提示', message: 'SKU编码重复' });
        //     return false;
        // }
        return true;
    }

    function saveRecord(context) {
        var result = checkRepeat(context.currentRecord);
        if (result) {
            dialog.alert({ title: '提示', message: 'SPU编码重复' });
            return false;
        }
        // if (checkSublistRepeat(context.currentRecord)) {
        //     dialog.alert({ title: '提示', message: 'SKU编码重复' });
        //     return false;
        // }
        return true;
    }

    return {
        pageInit: pageInit,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        saveRecord: saveRecord,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }
});
