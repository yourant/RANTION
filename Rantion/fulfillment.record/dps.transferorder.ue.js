/*
 * @Author         : Bong
 * @Version        : 1.0
 * @Date           : 2020-08-31 11:24:26
 * @LastEditTime   : 2020-08-31 11:24:26
 * @LastEditors    : Bong
 * @Description    :
 * @FilePath       : \Rantion\fulfillment.record\dps.transferorder.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/ui/dialog'],
    function (record, search, dialog) {
        function beforeLoad(context) {

        }

        function beforeSubmit(context) {

        }

        function afterSubmit(context) {
            var ToId = context.newRecord.getValue('id');
            var toRec = record.load({
                type: 'transferorder',
                id: ToId
            });
            log.audit("toRec",toRec);
            var line = toRec.getLineCount({
                sublistId: 'item'
            });
            var totalWeight = 0,
                totalVolume = 0;
            //获取子列表行数并获取各自的重量体积
            for (var i = 0; i < line; i++) {
                var lineWeight = toRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_item_product_weight',
                    line: i
                });
                totalWeight += Number(lineWeight);
                var lineVolume = toRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_item_product_volume',
                    line: i
                });
                totalVolume += Number(lineVolume);
            }
            toRec.setValue({
                fieldId: 'custbody_products_total_weight',
                value: parseFloat((totalWeight).toFixed(10))
            });
            toRec.setValue({
                fieldId: 'custbody_products_total_volume',
                value: parseFloat((totalVolume).toFixed(10))
            });
            toRec.save({});
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }
    });