/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-27 17:29:27
 * @LastEditTime   : 2020-06-20 14:02:04
 * @LastEditors    : Li
 * @Description    :  应用于采购订单,增加按钮
 * @FilePath       : \Rantion\po\dps_delivery_order_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../Helper/config.js', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    function (config, record, runtime, search, url) {

        var roleId = runtime.getCurrentUser().role;

        function beforeLoad(context) {
            var newRecord = context.newRecord;
            var flag = true;
            var add = 0;
            if (newRecord.type == 'purchaseorder' && context.type == 'view') {
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
                            name: 'formulanumeric',
                            formula: '{quantity}-{custcol_dps_quantity_delivered}'
                        }]
                    }).run().each(function (rec) {
                        var it = rec.getValue({
                            name: 'formulanumeric',
                            formula: '{quantity}-{custcol_dps_quantity_delivered}'
                        });
                        log.debug('it ', it);
                        if (it && it > 0) {
                            flag = false;
                        }
                        ++add;
                        return flag;
                    });
                } catch (error) {
                    log.debug('beforeLoad 搜索出错了', error);
                }
            }
            log.debug('roleId ', roleId);
            log.debug('flag ', flag);
            log.debug('vendorRoleId ', config.vendorRoleId);
            if (context.type == 'view' && newRecord.type == 'purchaseorder' && !flag && roleId != config.vendorRoleId) {
                var output = url.resolveRecord({
                    recordType: 'customrecord_dps_delivery_order',
                    recordId: 6,
                    isEditMode: true
                });
                var a = output.split("&id=");
                var path_url = a[0];
                var form = context.form
                form.clientScriptModulePath = './dps_purchase_order_cs.js';
                form.addButton({
                    id: 'custpage_bills',
                    label: '生成交货单',
                    functionName: 'createDeliveryBills("' + path_url + '", "' + newRecord.id + '")'
                });
            }

            // if (context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order' && newRecord.getValue('custrecord_delivery_order_status') == 1 && roleId == config.vendorRoleId) {
            //     // var need_data = [];
            //     // need_data.push({
            //     //     delivery_date: newRecord.getValue('custrecord_delivery_date'),
            //     //     order_location: newRecord.getValue('custrecord_dsp_delivery_order_location')
            //     // })
            //     // log.debug('need_data',need_data);
            //     var form = context.form
            //     form.clientScriptModulePath = './dps_purchase_order_cs.js';
            //     form.addButton({
            //         id: 'custpage_determine',
            //         label: '供应商确定',
            //         functionName: 'supplierDetermination("' + newRecord.getValue('custrecord_delivery_date') + '", "' + newRecord.getValue('custrecord_dsp_delivery_order_location') + '")'
            //     });
            // }

            if (context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order' && newRecord.getValue('custrecord_delivery_order_status') == 5 && roleId != config.vendorRoleId) {
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

            log.debug('bf_rec type', bf_rec.type)
            log.debug('context type', context.type)
            try {
                if (type == 'create' && bf_rec.type == 'purchaseorder') {
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
                        if (!deQty) {
                            deQty = 0;
                        }
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
                        bf_rec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_delivery_quantity',
                            line: i,
                            value: qty
                        });
                    }
                }

                if (bf_rec.type == "customrecord_dps_delivery_order" && type != 'delete') {
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
                            // 未入库的数量
                            var outstanding_quantity = bf_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_dps_dev_undelivered_quantity',
                                line: i
                            });
                            bf_rec.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_dps_dev_undelivered_quantity',
                                line: i,
                                value: Number(item_quantity) + Number(outstanding_quantity) - Number(stock_quantity)
                            });
                        }
                    }


                }
                if (bf_rec.type == "customrecord_dps_delivery_order" && context.type == "delete") {
                    log.debug('开始反写数据, 删除记录', "Starts");
                    var load_rec = record.load({
                        type: bf_rec.type,
                        id: bf_rec.id
                    });
                    var purchase_order_no = load_rec.getValue('custrecord_purchase_order_no');
                    var flag = false;
                    var l_po = record.load({
                        type: 'purchaseorder',
                        id: purchase_order_no
                    });

                    var len = load_rec.getLineCount({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });
                    for (var i = 0; i < len; i++) {
                        var item_sku = load_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_sku',
                            line: i
                        });
                        // 交货单 交货数量
                        var item_quantity = load_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_quantity',
                            line: i
                        });
                        // 交货单 原交货数量
                        var hide_quantity = load_rec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_hide_quantity',
                            line: i
                        });

                        log.debug('hide_quantity', hide_quantity);
                        if (hide_quantity) {
                            var lineNumber = l_po.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: item_sku
                            });
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
                            if (hide_quantity == item_quantity) {
                                diffQty = hide_quantity;
                            } else {
                                diffQty = hide_quantity - item_quantity
                            }
                            log.debug('diffQty', diffQty);
                            var y_qty = Number(quantity_delivered) - Number(diffQty);
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
                            flag = true;
                        }
                    }
                    log.debug('flag', flag);
                    if (flag) {

                        var limit = 3999;
                        var l_po_id = l_po.save();
                        log.debug('l_po_id', l_po_id);

                        search.create({
                            type: 'customrecord_dps_delivery_order_item',
                            filters: [{
                                name: 'custrecord_dps_delivery_order_id',
                                operator: 'anyof',
                                values: load_rec.id
                            }]
                        }).run().each(function (rec) {
                            record.delete({
                                type: 'customrecord_dps_delivery_order_item',
                                id: rec.id
                            });

                            return --limit > 0;
                        });
                    }

                    log.debug('开始反写数据, 删除记录', "End");
                }
            } catch (error) {
                log.error('beforeSubmit 设置交货单的值, 出错了', error);
            }
        }

        function afterSubmit(context) {
            try {
                var newRecord = context.newRecord;
                if (newRecord.type == 'customrecord_dps_delivery_order' && context.type != 'delete') {
                    var load_rec = record.load({
                        type: newRecord.type,
                        id: newRecord.id
                    });
                    var delivery_order_status = load_rec.getValue('custrecord_delivery_order_status');
                    var purchase_order_no = load_rec.getValue('custrecord_purchase_order_no');
                    var len = load_rec.getLineCount({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });
                    if (delivery_order_status == 2 && purchase_order_no && !load_rec.getValue('custrecord_dps_supplier_end')) {
                        var flag = false;
                        var l_po = record.load({
                            type: 'purchaseorder',
                            id: purchase_order_no
                        });
                        for (var i = 0; i < len; i++) {
                            var item_sku = load_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_sku',
                                line: i
                            });
                            // 交货单 交货数量
                            var item_quantity = load_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_quantity',
                                line: i
                            });

                            // 交货单 原交货数量
                            var hide_quantity = load_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_hide_quantity',
                                line: i
                            });

                            if (item_quantity) {
                                var lineNumber = l_po.findSublistLineWithValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: item_sku
                                });
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
                                var y_qty = Number(quantity_delivered) - Number(hide_quantity) + Number(item_quantity);
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
                                flag = true;
                            }
                        }
                        if (flag) {
                            l_po.save();

                            record.submitFields({
                                type: "customrecord_dps_delivery_order",
                                id: newRecord.id,
                                values: {
                                    custrecord_dps_supplier_end: true
                                }
                            })
                        }
                    } else if (delivery_order_status == 4 && purchase_order_no && !load_rec.getValue('custrecord_dps_warehousing_end')) {
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
                            if (diff > 0) {
                                var lineNumber = l_po.findSublistLineWithValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: item_sku
                                });
                                var quantity_delivered = l_po.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_dps_quantity_delivered',
                                    line: lineNumber
                                });

                                var poQty = l_po.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: lineNumber
                                })
                                // 已交货数量
                                l_po.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_dps_quantity_delivered',
                                    line: lineNumber,
                                    value: quantity_delivered - diff
                                });
                                // 本次交货数量
                                l_po.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_dps_delivery_quantity',
                                    line: lineNumber,
                                    value: poQty - (quantity_delivered - diff)
                                });
                                // 未交货数量
                                l_po.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_dps_undelivered_quantity',
                                    line: lineNumber,
                                    value: poQty - (quantity_delivered - diff)
                                });
                                flag = true;
                            }
                        }
                        if (flag) {
                            l_po.save();
                            record.submitFields({
                                type: "customrecord_dps_delivery_order",
                                id: newRecord.id,
                                values: {
                                    custrecord_dps_warehousing_end: true
                                }
                            })
                        }
                    } else {

                        // 交货数量	custrecord_item_quantity	Integer Number	 	 	Yes
                        // 原交货数量	custrecord_hide_quantity	Integer Number	 	 	Yes

                        if (context.type == "create") { //  交货单的事件类型为 create
                            var flag = false;
                            var l_po = record.load({
                                type: 'purchaseorder',
                                id: purchase_order_no
                            });
                            for (var i = 0; i < len; i++) {
                                var item_sku = load_rec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_item_sku',
                                    line: i
                                });
                                // 交货单 交货数量
                                var item_quantity = load_rec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_item_quantity',
                                    line: i
                                });
                                // 交货单 原交货数量
                                var hide_quantity = load_rec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_hide_quantity',
                                    line: i
                                });
                                if (hide_quantity) {
                                    var lineNumber = l_po.findSublistLineWithValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: item_sku
                                    });
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
                                    var y_qty = Number(quantity_delivered) + Number(hide_quantity);
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
                                    flag = true;
                                }
                            }
                            if (flag) {
                                l_po.save();
                            }
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