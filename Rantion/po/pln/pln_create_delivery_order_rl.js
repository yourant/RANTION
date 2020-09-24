/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/record", "N/log", 'N/search', "./../../Helper/core.min", "N/format"],
    function (record, log, search, aio, format) {
        function _get(context) {
            log.error('get', "get");
            return _post(context);
        }

        function _post(context) {
            log.error('post', context);
            var order_ids = context.order_ids; //po订单id
            log.debug("order_ids", order_ids);
            var pln_json = context.pln_json;
            var po_line = context.po_line;
            var message = {};
            var status = 'error';
            var lnNumber = '';
            var data = '创建失败';
            try {
                //生成交货单
                var result = deliveryOrders(order_ids, po_line, pln_json);
                status = result.status;
                data = result.data;
                lnNumber = result.lnNumber
            } catch (e) {
                message.data = e.message;
                log.debug('error', e);
            }
            message.status = status;
            message.data = data;
            message.lnNumber = lnNumber;
            return message;
        }

        //获取采购订单信息
        function deliveryOrders(line, po_line, pln_json) {
            var result_list = {};
            var item_list = [];
            var list_json = {};
            var amount_num = 0;
            list_json.po_id = line;
            var purchaseorder_data = record.load({
                type: 'purchaseorder',
                id: line,
                isDynamic: true
            });
            list_json.entity = purchaseorder_data.getValue('entity');
            list_json.dps_type = purchaseorder_data.getValue('custbody_dps_type');
            var count = purchaseorder_data.getLineCount({
                sublistId: 'item'
            });

            var skuzzzs = {};
            var skuzzzids = [];
            for (var i = 0; i < count; i++) {
                var item = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                skuzzzids.push(item);
            }
            search.create({
                type: 'item',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: skuzzzids
                }],
                columns: [
                    'internalid', 'custitem_dps_box_long', 'custitem_dps_box_high', 'custitem_dps_box_wide', 'custitem_dps_mpq'
                ]
            }).run().each(function (result) {
                var item = result.getValue('internalid');
                var json = {};
                json.long = Number(result.getValue('custitem_dps_box_long'));
                json.width = Number(result.getValue('custitem_dps_box_wide'));
                json.high = Number(result.getValue('custitem_dps_box_high'));
                json.mpq = Number(result.getValue('custitem_dps_mpq'));
                skuzzzs[item] = json;
                return true;
            });

            for (var i = 0; i < count; i++) {
                amount_num += purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                });
                var item = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                var quantity = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });
                var rate = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });
                var quantity_delivered = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_dps_quantity_delivered',
                    line: i
                });
                var undelivered_quantity = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_dps_undelivered_quantity',
                    line: i
                });
                var lineFlag = true;
                for (var count in po_line) {
                    if (i == po_line[count].line) {
                        var delivery_quantity = po_line[count].num;
                        lineFlag = false;
                    }
                }
                if (lineFlag) {
                    var delivery_quantity = purchaseorder_data.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        line: i
                    });
                }
                var long_m = skuzzzs[item].long / 100;
                var width_m = skuzzzs[item].width / 100;
                var high_m = skuzzzs[item].high / 100;
                var volume = long_m * high_m * width_m;
                var box_volume = volume.toFixed(2);
                var packingqty = skuzzzs[item].mpq;
                var packqty = 0;
                if (quantity > 0 && packingqty > 0) {
                    packqty = quantity / packingqty;
                    packqty = Math.ceil(packqty);
                }
                var volumest = volume * packqty;
                var total_volume = volumest.toFixed(2);
                item_list.push({
                    item: item,
                    quantity: quantity,
                    long: skuzzzs[item].long,
                    width: skuzzzs[item].width,
                    high: skuzzzs[item].high,
                    box_volume: box_volume,
                    total_volume: total_volume,
                    boxes_number: packqty,
                    rate: rate,
                    quantity_delivered: quantity_delivered,
                    undelivered_quantity: undelivered_quantity ? undelivered_quantity : 0,
                    delivery_quantity: delivery_quantity
                });
            }
            list_json.amount = amount_num;
            list_json.item = item_list;
            try {
                result_list.lnNumber = createDelivery(list_json, pln_json);
                result_list.status = 'success';
                result_list.data = '生成交货单成功';
            } catch (e) {
                result_list.status = 'error';
                result_list.data = e.message;
                log.debug('error ------', e);
            }
            return result_list;
        }
        //生成交货单
        function createDelivery(line, pln_json) {
            var location = pln_json.location; //交货单的地点,从批量交货单中获取
            var delivery_data = format.parse({
                value: pln_json.delivery_date,
                type: format.Type.DATE
            }); //交期
            var pln_quantity = pln_json.quantity; //是否质检
            //生成po编号(流水号)
            var need_date = aio.Moment.utc(new Date()).format('YYYYMMDD');
            var recid, existPoNumber, extRecord;
            var poNumber = 'LN' + need_date;
            search.create({
                type: 'customrecord_dps_delivery_schedule',
                filters: [{
                    name: 'custrecord_delivery_schedule_date',
                    operator: 'is',
                    values: need_date
                }]
            }).run().each(function (result) {
                recid = result.id;
            });
            if (!recid) {
                existPoNumber = 1;
                extRecord = record.create({
                    type: 'customrecord_dps_delivery_schedule'
                });
                extRecord.setValue({
                    fieldId: 'custrecord_delivery_schedule_date',
                    value: need_date
                });
                extRecord.setValue({
                    fieldId: 'custrecord_delivery_schedule_num',
                    value: existPoNumber
                });
                //extRecord.save();
                poNumber = poNumber + '000' + existPoNumber;
            } else {
                extRecord = record.load({
                    type: 'customrecord_dps_delivery_schedule',
                    id: recid
                });
                existPoNumber = Number(extRecord.getValue('custrecord_delivery_schedule_num')) + 1;
                if (existPoNumber < 10) {
                    poNumber = poNumber + '000' + existPoNumber;
                } else if (existPoNumber >= 10 && existPoNumber < 100) {
                    poNumber = poNumber + '00' + existPoNumber;
                } else if (existPoNumber >= 100 && existPoNumber < 1000) {
                    poNumber = poNumber + '0' + existPoNumber;
                } else {
                    poNumber = poNumber + existPoNumber;
                }
                extRecord.setValue({
                    fieldId: 'custrecord_delivery_schedule_num',
                    value: existPoNumber
                });
                //extRecord.save(); 
            };
            var delivery_ord = record.create({
                type: 'customrecord_dps_delivery_order',
                isDynamic: true
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_supplier',
                value: line.entity
            });
            delivery_ord.setValue({
                fieldId: 'name',
                value: poNumber
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_purchase_order_no',
                value: line.po_id
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_delivery_amount',
                value: line.amount
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_delivery_date',
                value: delivery_data
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_dsp_delivery_order_location',
                value: location
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_if_quantity',
                value: pln_quantity
            });
            delivery_ord.setValue({
                fieldId: 'custrecord_delivery_order_type',
                value: line.dps_type
            });
            var flag = false;
            var totalAmount = 0;
            //产品
            for (var i = 0; i < line.item.length; i++) {
                var li = line.item[i];
                if (li.delivery_quantity > 0 || (li.quantity - li.quantity_delivered) > 0) {
                    delivery_ord.selectNewLine({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });
                    //默认交货
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_dps_delivery_order_check',
                        value: true
                    })
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_item_sku',
                        value: li.item
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_purchase_quantity',
                        value: li.quantity
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_ddoi_long',
                        value: li.long
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_ddoi_width',
                        value: li.width
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_ddoi_high',
                        value: li.high
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_ddoi_single_box_volume',
                        value: li.box_volume
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_ddoi_dps_total_volume',
                        value: li.total_volume
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_line_boxes_number',
                        value: li.boxes_number
                    });

                    var outQty = li.quantity - li.quantity_delivered - li.delivery_quantity;
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_dps_dev_undelivered_quantity',
                        value: 0
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_item_quantity',
                        value: li.delivery_quantity > 0 ? li.delivery_quantity : outQty
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_unit_price',
                        value: li.rate
                    });
                    delivery_ord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_outstanding_quantity',
                        value: 0
                    });
                    var qu = li.delivery_quantity > 0 ? li.delivery_quantity : outQty;
                    totalAmount += Number(qu) * Number(li.rate);
                    try {
                        delivery_ord.commitLine({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id'
                        });
                        if (i == line.item.length - 1) {
                            flag = true;
                        }
                    } catch (err) {
                        throw err;
                    }
                }
                delivery_ord.setValue({
                    fieldId: 'custrecord_delivery_amount',
                    value: totalAmount
                });
                var res_id;
                if (flag) {
                    // 交货单存在货品行信息, 则保存
                    res_id = delivery_ord.save();
                }
                if (res_id) {
                    extRecord.save();
                    log.debug('po_id', line.po_id);
                    // record.submitFields({
                    //     type: 'purchaseorder',
                    //     id: line.po_id,
                    //     values: {
                    //         custbody_dps_delivery_id: res_id
                    //     }
                    // });
                    var purchase_data = record.load({
                        type: 'purchaseorder',
                        id: line.po_id
                    });
                    // var delivery_id_arr = [];
                    // delivery_id_arr = purchase_data.getValue('custbody_dps_delivery_id');
                    // delivery_id_arr.push(res_id);
                    // purchase_data.setValue({
                    //     fieldId: 'custbody_dps_delivery_id',
                    //     value: delivery_id_arr
                    // });

                    line.item.map(function (li) {
                        var lineNumber = purchase_data.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: li.item
                        });
                        // 设置当前行的未交货数量
                        purchase_data.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_undelivered_quantity',
                            value: Number(li.quantity) - Number(li.quantity_delivered) - Number(li.delivery_quantity),
                            line: lineNumber
                        });
                        // 设置当前行的已交货数量
                        purchase_data.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_quantity_delivered',
                            value: Number(li.quantity_delivered) + Number(li.delivery_quantity),
                            line: lineNumber
                        });
                        // 设置当前行的交货数量
                        purchase_data.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_delivery_quantity',
                            value: Number(li.quantity) - Number(li.quantity_delivered) - Number(li.delivery_quantity),
                            line: lineNumber
                        });
                    });
                }
            }
            return poNumber;
        }
        return {
            get: _get,
            post: _post,
        }
    });