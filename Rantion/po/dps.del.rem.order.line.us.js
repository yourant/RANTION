/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-20 11:42:12
 * @LastEditTime   : 2020-06-20 11:52:28
 * @LastEditors    : Li
 * @Description    : 应用于交货单的货品行, 用于处理交货单货品行删除或者取消关联的记录
 * @FilePath       : \Rantion\po\dps.del.rem.order.line.us.js
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

        log.audit('actionType', actionType);

        var oldDelId = oldRecord.getValue('custrecord_dps_delivery_order_id'),
            newDelId = newRecord.getValue('custrecord_dps_delivery_order_id');

        log.debug("oldDelId", oldDelId);
        log.debug("newDelId", newDelId);

        // 交货数量 custrecord_item_quantity
        // 原交货数量 custrecord_hide_quantity

        // 直接在交货单详情页面移除货品行, 获取旧记录的原交货数量,货品 以及交货数量
        if ((oldDelId && !newDelId && actionType == "edit") || (oldDelId == newDelId && actionType == "delete")) {

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

        log.debug('beforeSubmit context type', context.type);
        log.debug('newRecord', context.newRecord);
        log.debug('oldRecord', context.oldRecord);

        log.debug('custrecord_dps_delivery_order_id', context.oldRecord.getValue('custrecord_dps_delivery_order_id'))
    }

    function afterSubmit(context) {
        log.debug('afterSubmit context type', context.type);
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});