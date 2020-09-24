/*
 * @Author         : Bong
 * @Version        : 1.0
 * @Date           : 2020-08-27 15:11:35
 * @LastEditTime   : 2020-08-31 11:24:49
 * @LastEditors    : Bong
 * @Description    :
 * @FilePath       : \Rantion\fulfillment.record\dps.transferorder.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog'],
    function (currentRecord, record, search, dialog) {
        function pageInit(context) {

        }

        function saveRecord(context) {
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {
            return true;
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
            // 获得当前修改行的field的Text值
            var sku = context.currentRecord.getCurrentSublistText({
                sublistId: 'item',
                fieldId: 'item'
            });

            //获得当前修改行的field的Value值
            var num = context.currentRecord.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity'
            });

            if (sku && num) {
                var weight = 0,
                    volume = 0;
                //查找sku对应的大小重量，并写入
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'itemid',
                        operator: 'is',
                        values: sku
                    }],
                    columns: [
                        'custitem_dps_packing_weight',
                        'custitem_dps_single_volume'
                    ]
                }).run().each(function (rec) {
                    weight = Number(rec.getValue('custitem_dps_packing_weight'));
                    volume = Number(rec.getValue('custitem_dps_single_volume'));
                });
                context.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_item_product_weight',
                    value: parseFloat((num * weight).toFixed(10))
                });

                context.currentRecord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_item_product_volume',
                    value: parseFloat((num * volume).toFixed(10))
                });
            }
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