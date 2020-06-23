/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-20 10:21:53
 * @LastEditTime   : 2020-06-20 15:16:22
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.test.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {

    function beforeLoad(context) {
        log.debug('beforeLoad context type', context.type);
    }

    function beforeSubmit(context) {

        var actionType = context.type,
            newRecord = context.newRecord,
            oldRecord = context.oldRecord;

        log.debug('actionType', actionType);
        log.debug('newRecord', newRecord);
        log.debug('oldRecord', oldRecord);

        /*

        var oldDelId = oldRecord.getValue('custrecord_dps_delivery_order_id'),
            newDelId = newRecord.getValue('custrecord_dps_delivery_order_id');

        // 交货数量 custrecord_item_quantity
        // 原交货数量 custrecord_hide_quantity

        // 直接在交货单详情页面移除货品行, 获取旧记录的原交货数量,货品 以及交货数量
        if (oldDelId && !newDelId) {

            log.debug('oldDelId', oldDelId)

            var oldItemQty = oldRecord.getValue('custrecord_item_quantity'),
                oldHideQty = oldRecord.getValue('custrecord_hide_quantity'),
                oldItemId = oldRecord.getValue('custrecord_item_sku');


            log.debug('oldItemQty', oldItemQty);
            log.debug('oldHideQty', oldHideQty);
            log.debug('oldItemId', oldItemId);

            search.create({
                type: 'customrecord_dps_delivery_order',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: oldDelId
                }],
                columns: [
                    "custrecord_purchase_order_no"
                ]
            }).run().each(function (rec) {

                var flag = false;
                var l_po = record.load({
                    type: 'purchaseorder',
                    id: rec.getValue('custrecord_purchase_order_no')
                });

                if (oldHideQty) {
                    var lineNumber = l_po.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: oldItemId
                    });
                    log.debug('lineNumber', lineNumber);
                    var quantity_delivered = l_po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_quantity_delivered',
                        line: lineNumber
                    });
                    var quantity = l_po.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: lineNumber
                    });

                    var diffQty = 0;
                    if (oldHideQty == oldItemQty) {
                        diffQty = oldHideQty;
                    } else {
                        diffQty = oldHideQty - oldItemQty;
                    }
                    var y_qty = Number(quantity_delivered) - Number(diffQty);
                    log.debug('y_qty', y_qty);
                    // 已交货数量
                    l_po.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_quantity_delivered',
                        line: lineNumber,
                        value: y_qty
                    });
                    // 本次提交数量
                    l_po.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        line: lineNumber,
                        value: quantity - y_qty
                    });
                    // 未提交数量
                    l_po.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_undelivered_quantity',
                        line: lineNumber,
                        value: quantity - y_qty
                    });

                    log.debug('quantity - y_qty', quantity - y_qty);
                    flag = true;

                    var l_po_id = l_po.save();
                    log.debug('l_po_id', l_po_id);
                }
            });

            
        }
           */

    }

    function afterSubmit(context) {
        log.debug('afterSubmit context type', context.type);
        var afRec = context.newRecord;


        log.debug('afRec.id', afRec.id);
        var itemArr = [];
        try {
            search.create({
                type: 'item',
                filters: [{
                    name: 'parent',
                    operator: 'anyof',
                    values: afRec.id
                }]
            }).run().each(function (rec) {
                itemArr.push(rec.id);
                return true;
            });

        } catch (error) {
            log.error('error', error)
        }

        log.debug('itemArr', itemArr);
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});