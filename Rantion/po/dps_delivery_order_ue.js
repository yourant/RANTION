/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-27 17:29:27
 * @LastEditTime   : 2020-05-28 19:06:13
 * @LastEditors    : Li
 * @Description    :  应用于采购订单,增加按钮
 * @FilePath       : \Rantion\po\dps_delivery_order_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime', 'N/search'], function (log, record, runtime, search) {

    var roleId = runtime.getCurrentUser().role;

    function beforeLoad(context) {
        log.debug('roleId', roleId);
        var newRecord = context.newRecord;
        var flag = true;
        var add = 0;
        if (newRecord.type == "purchaseorder") {
            try {
                search.create({
                    type: newRecord.type,
                    filters: [
                        { name: 'internalid', operator: 'anyof', values: newRecord.id },
                        { name: 'mainline', operator: 'is', values: false },
                        { name: 'taxline', operator: 'is', values: false }
                    ],
                    columns: [{ name: 'formulanumeric', formula: '{quantity}-{custcol_dps_quantity_delivered}' }]
                }).run().each(function (rec) {
                    var it = rec.getValue({ name: 'formulanumeric', formula: '{quantity}-{custcol_dps_quantity_delivered}' });
                    log.debug('it', it);
                    if (it && it > 0) {
                        flag = false;
                    }
                    ++add;
                    return flag;
                });
            } catch (error) {
                log.debug('搜索出错了', error);
            }
            log.debug('flag', flag);
            log.debug('add', add);
        }

        if (context.type == 'view' && newRecord.type == 'purchaseorder' && !flag && roleId != 16) {
            var form = context.form
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id: 'custpage_bills',
                label: '生成交货单',
                functionName: 'createDeliveryBills'
            });
        }

        if (context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order' && newRecord.getValue('custrecord_delivery_order_status') == 1 && roleId == 16) { // && roleId == 16
            var form = context.form
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id: 'custpage_determine',
                label: '供应商确定',
                functionName: 'supplierDetermination'
            });
        }

        if (context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order' && newRecord.getValue('custrecord_delivery_order_status') == 2 && roleId != 16) { // && newRecord.getValue('custrecord_delivery_order_status') == 2 && roleId != 16
            var form = context.form
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id: 'custpage_push_to_wms',
                label: '推送WMS',
                functionName: 'pushToWms'
            });
        }
    }

    function beforeSubmit(context) {
        var bf_rec = context.newRecord;
        var type = context.type;
        try {
            if (type == 'create' && bf_rec.type == "purchaseorder") {
                var len = bf_rec.getLineCount({
                    sublistId: 'item'
                });
                for (var i = 0; i < len; i++) {
                    var deQty = bf_rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        line: i
                    });
                    var qty = bf_rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    bf_rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_quantity_delivered',
                        line: i,
                        value: 0
                    });
                    bf_rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_undelivered_quantity',
                        line: i,
                        value: qty
                    });
                    if (deQty) {
                        qty = deQty;
                    }
                    bf_rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        line: i,
                        value: qty
                    });
                }
            }

            if (bf_rec.type == "customrecord_dps_delivery_order") {
                var len = bf_rec.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                for (var i = 0; i < len; i++) {
                    var stock_quantity = bf_rec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_stock_quantity',
                        line: i
                    });
                    if (stock_quantity) {
                        // 交货的数量
                        var item_quantity = bf_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_quantity',
                            line: i
                        });
                        // 未交货的数量
                        var outstanding_quantity = bf_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_dps_dev_undelivered_quantity',
                            line: i,
                        });
                        log.debug('Number(item_quantity)', Number(item_quantity));
                        log.debug('Number(outstanding_quantity)', Number(outstanding_quantity));
                        log.debug('Number(stock_quantity)', Number(stock_quantity));
                        bf_rec.setSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_dps_dev_undelivered_quantity',
                            line: i,
                            value: Number(item_quantity) + Number(outstanding_quantity) - Number(stock_quantity)
                        });
                    }
                }
            }
        } catch (error) {
            log.error('beforeSubmit 设置交货单的值, 出错了', error);
        }
    }

    function afterSubmit(context) {
        try {
            var newRecord = context.newRecord;
            if (newRecord.type == 'customrecord_dps_delivery_order') {
                var purchase_order_no = newRecord.getValue('custrecord_purchase_order_no');
                // var setArr = [],
                //     limit = 3999;
                // search.create({
                //     type: 'customrecord_dps_delivery_order_item',
                //     filters: [{
                //         name: 'custrecord_purchase_order_no',
                //         join: 'custrecord_dps_delivery_order_id',
                //         operator: 'anyof',
                //         values: purchase_order_no
                //     }],
                //     columns: [
                //         'custrecord_item_sku'
                //     ]
                // }).run().each(function (rec) {
                //     var it = {
                //         id: rec.id,
                //         itemId: rec.getValue('custrecord_item_sku')
                //     };
                //     setArr.push(it);
                //     return --limit > 0;
                // });
                var len = newRecord.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                if (purchase_order_no) {
                    var l_po = record.load({
                        type: 'purchaseorder',
                        id: purchase_order_no
                    });
                    for (var i = 0; i < len; i++) {
                        var item_sku = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_sku',
                            line: i
                        });
                        var stock_quantity = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_stock_quantity',
                            line: i
                        });
                        var item_quantity = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_quantity',
                            line: i
                        });
                        log.debug('afterSubmit stock_quantity', stock_quantity);
                        if (stock_quantity) {

                            var dif = Number(item_quantity) - Number(stock_quantity);
                            log.debug('afterSubmit dif', dif);

                            var lineNumber = l_po.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: item_sku
                            });

                            var quantity_delivered = l_po.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_quantity_delivered',
                                line: i
                            });
                            var undelivered_quantity = l_po.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_undelivered_quantity',
                                line: i
                            });
                            var delivery_quantity = l_po.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_delivery_quantity',
                                line: i
                            });

                            l_po.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_quantity_delivered',
                                line: lineNumber,
                                value: Number(quantity_delivered) - Number(dif)
                            });

                            l_po.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_undelivered_quantity',
                                line: lineNumber,
                                value: Number(undelivered_quantity) + Number(dif)
                            });

                            l_po.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_delivery_quantity',
                                line: lineNumber,
                                value: Number(undelivered_quantity) + Number(dif)
                            });

                        }
                    }
                    var l_po_id = l_po.save();
                    log.audit('l_po_id', l_po_id);
                }
            }

            /*
            if (newRecord.type == 'customrecord_dps_delivery_order') {
                var data = record.load({
                    type: 'customrecord_dps_delivery_order',
                    id: newRecord.id,
                    isDynamic: true
                });
                var count = data.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                var total_itemQuantity = 0,
                    total_packingQuantity = 0,
                    total_boxesNumber = 0;
                for (var i = 0; i < count; i++) {
                    var item_quantity = data.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        line: i,
                        fieldId: 'custrecord_item_quantity'
                    }); //交货数量
                    total_itemQuantity += Number(item_quantity);
                    var packing_quantity = data.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        line: i,
                        fieldId: 'custrecord_line_packing_quantity'
                    }); //装箱数量
                    total_packingQuantity += Number(packing_quantity);
                    var boxes_number = data.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        line: i,
                        fieldId: 'custrecord_line_boxes_number'
                    }); //箱数
                    total_boxesNumber += Number(boxes_number);
                }
                data.setValue({
                    fieldId: 'custrecord_delivery_item_quantity',
                    value: total_itemQuantity
                });
                data.setValue({
                    fieldId: 'custrecord_packing_quantity',
                    value: total_packingQuantity
                });
                data.setValue({
                    fieldId: 'custrecord_boxes_number',
                    value: total_boxesNumber
                });
                data.save();
            }
            */

        } catch (e) {
            log.debug('e', e);
        }

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});