/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-27 17:29:27
 * @LastEditTime   : 2020-05-29 00:09:39
 * @LastEditors    : Li
 * @Description    :  应用于采购订单,增加按钮
 * @FilePath       : \Rantion\po\dps_delivery_order_ue copy 2.js
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
                    filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: newRecord.id
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: false
                        },
                        {
                            name: 'taxline',
                            operator: 'is',
                            values: false
                        }
                    ],
                    columns: [{
                        name: "formulanumeric",
                        formula: "{quantity}-{custcol_dps_quantity_delivered}"
                    }]

                }).run().each(function (rec) {

                    var it = rec.getValue({
                        name: "formulanumeric",
                        formula: "{quantity}-{custcol_dps_quantity_delivered}"
                    });

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

        log.debug('type: ' + type, 'cur type : ' + bf_rec.type);
        try {
            if (type == 'create' && bf_rec.type == "purchaseorder") {

                log.debug('bf purchaseorder', bf_rec.type);
                var len = bf_rec.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < len; i++) {


                    var deQty = bf_rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        line: i
                    });

                    log.error('deQty', deQty);
                    var qty = bf_rec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });

                    if (!deQty) {
                        deQty = 0;
                    }
                    log.error('deQty', deQty);

                    log.error('qty', qty);
                    bf_rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_quantity_delivered',
                        line: i,
                        value: deQty
                    });

                    bf_rec.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_undelivered_quantity',
                        line: i,
                        value: qty
                    });

                    if (deQty) {
                        qty = qty - deQty;
                    }
                    log.error('qty - deQty', qty);
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

                    var item_sku = bf_rec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_item_sku',
                        line: i
                    })
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


                        // 未入库的数量
                        var outstanding_quantity = bf_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_dps_dev_undelivered_quantity',
                            line: i,
                        });

                        log.debug('Number(item_quantity)', Number(item_quantity));
                        log.debug('Number(outstanding_quantity)', Number(outstanding_quantity));
                        log.debug('Number(stock_quantity)', Number(stock_quantity));

                        var lineNumber = bf_rec.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: item_sku
                        });

                        log.debug('total', Number(item_quantity) + Number(outstanding_quantity) - Number(stock_quantity))

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


            if (newRecord.type == 'customrecord_dps_delivery_order' && context.type != 'delete') {

                var delivery_order_status = newRecord.getValue('custrecord_delivery_order_status');

                var purchase_order_no = newRecord.getValue('custrecord_purchase_order_no');

                var len = newRecord.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });

                if (delivery_order_status == 2 && purchase_order_no) {

                    var flag = false;

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

                        // 交货单 交货数量
                        var item_quantity = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_quantity',
                            line: i
                        });

                        log.debug('afterSubmit item_quantity', item_quantity);
                        if (item_quantity) {

                            var lineNumber = l_po.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: item_sku
                            });

                            log.audit('lineNumber', lineNumber);

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

                            log.debug('quantity', quantity);

                            log.debug('quantity_delivered', quantity_delivered);

                            var y_qty = Number(quantity_delivered) + Number(item_quantity);

                            log.error('y_qty', y_qty);
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

                            flag = true;
                        }
                    }

                    log.debug('flag', flag);
                    if (flag) {
                        var l_po_id = l_po.save();
                        log.audit('l_po_id', l_po_id);
                    } else {
                        log.debug('flag');
                    }

                } else if (delivery_order_status == 4 && purchase_order_no) {

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

                        // 交货单 交货数量
                        var item_quantity = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_quantity',
                            line: i
                        });

                        // 交货单 入库数量
                        var stock_quantity = newRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_stock_quantity',
                            line: i
                        });


                        var diff = item_quantity - stock_quantity;
                        log.debug('item_quantity - stock_quantity', diff);

                        log.debug('afterSubmit stock_quantity', item_quantity);
                        if (diff > 0) {

                            var lineNumber = l_po.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: item_sku
                            });

                            log.audit('lineNumber', lineNumber);

                            var quantity_delivered = l_po.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_quantity_delivered',
                                line: lineNumber
                            });

                            log.debug('quantity_delivered', quantity_delivered);

                            // 已交货数量
                            l_po.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_quantity_delivered',
                                line: lineNumber,
                                value: quantity_delivered - diff
                            });

                            flag = true;
                        }
                    }

                    log.debug('flag', flag);
                    if (flag) {
                        var l_po_id = l_po.save();
                        log.audit('l_po_id', l_po_id);
                    } else {
                        log.debug('flag');
                    }
                }


            }


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