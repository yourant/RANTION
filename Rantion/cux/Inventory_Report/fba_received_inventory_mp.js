/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record'], function (search, log, record) {

    function getInputData() {
        var data = [], limit = 3999;
        search.create({
            type: 'customrecord_dps_fba_received_inventory',
            filters: [
                { name: 'custrecord_dps_fba_received_is_checked', operator: 'is', values: false },
                { name: 'custrecord_dps_fba_received_inv_quantity', operator: 'greaterthan', values: ["0"] }
            ],
            columns: [
                { name: 'custrecord_dps_fba_received_times', sort: search.Sort.ASC },
                { name: 'custrecord_dps_fba_received_inve_account' },
                { name: 'custrecord_dps_fba_received_receiveddate' },
                { name: 'custrecord_dps_fba_received_inven_fnsku' },
                { name: 'custrecord_dps_fba_received_inven_sku' },
                { name: 'custrecord_dps_fba_received_product_name' },
                { name: 'custrecord_dps_fba_received_inv_quantity' },
                { name: 'custrecord_dps_fba_received_shipment_id' },
                { name: 'custrecord_dps_fba_received_ful_centerid' }
            ]
        }).run().each(function (rec) {
            data.push({
                received_id: rec.id,
                received_type: rec.recordType,
                received_times: rec.getValue(rec.columns[0]),
                account: rec.getValue(rec.columns[1]),
                received_date: rec.getValue(rec.columns[2]),
                fnsku: rec.getValue(rec.columns[3]),
                seller_sku: rec.getValue(rec.columns[4]),
                product_name: rec.getValue(rec.columns[5]),
                quantity: rec.getValue(rec.columns[6]),
                shipment_id: rec.getValue(rec.columns[7]),
                ful_centerid: rec.getValue(rec.columns[8])
            });
            return --limit > 0;
        });
        log.audit('获取数据总数data total', data.length);
        return data;
    }

    function map(context) {
        var obj = JSON.parse(context.value), received_id = obj.received_id, received_type = obj.received_type, account = obj.account, received_date = obj.received_date,
            seller_sku = obj.seller_sku, quantity = obj.quantity, shipment_id = obj.shipment_id, received_times = obj.received_times;
        try {
            //查询第一段to是否存在(并且是否生成第二段to)
            var to_id, target_warehouse_id, order_status, rec_link_id, transfer_order3;
            search.create({
                type: 'transferorder',
                filters: [
                    { name: 'custbody_shipment_id', operator: 'is', values: shipment_id },
                    { name: 'mainline', operator: 'is', values: false },
                    { name: 'taxline', operator: 'is', values: false },
                    { name: 'shipping', operator: 'is', values: false },
                ],
                columns: [
                    { name: 'custbody_actual_target_warehouse' },
                    { name: 'statusref' },
                    { name: 'custbody_dps_fu_rec_link' },
                    { name: 'custrecord_transfer_order3', join: 'custbody_dps_fu_rec_link' }
                ]
            }).run().each(function (rec) {
                to_id = rec.id;
                //实际目标仓
                target_warehouse_id = rec.getValue(rec.columns[0]);
                //状态
                order_status = rec.getValue(rec.columns[1]);
                //发运记录Id
                rec_link_id = rec.getValue(rec.columns[2]);
                //第二段to ID
                transfer_order3 = rec.getValue(rec.columns[3]);
                return false;
            });
            if (to_id && order_status == 'received') {
                var sku_id;
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: [
                        { name: 'custrecord_ass_account', operator: 'is', values: account },
                        { name: 'name', operator: 'is', values: seller_sku },
                    ],
                    columns: [
                        'custrecord_ass_sku'
                    ]
                }).run().each(function (rec) {
                    sku_id = rec.getValue(rec.columns[0]);
                    return false;
                });
                var date = received_date.split('T');
                //判断是否存在第二段to
                if (!transfer_order3) {
                    log.debug('shipment_id', shipment_id);
                    var to2_id = createTO(to_id, target_warehouse_id, rec_link_id);
                    // var transferorder_data = record.load({type: 'transferorder', id: to2_id.id});
                    // var transferorder_count = transferorder_data.getLineCount({ sublistId: 'item' });
                    // var quantity_backordered;
                    // for(var a = 0; a < transferorder_count; a++){
                    //     var item_id = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'item', line: a });
                    //     if(item_id == sku_id){
                    //         quantity_backordered = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered', line: a });
                    //     }
                    // }
                    // if(quantity_backordered){
                    //     record.submitFields({
                    //         type: received_type,
                    //         id: received_id,
                    //         values: {
                    //             custrecord_dps_fba_received_times: Number(received_times) + 1,
                    //             custrecord_dps_fba_unreceived_reason: '该货品缺货，数量：' + quantity_backordered + ',不能进行履行。'
                    //         }
                    //     }); 
                    //     return;
                    // }
                    if (to2_id.status == '1') {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: rec_link_id,
                            values: {
                                custrecord_transfer_order3: to2_id.id,
                            }
                        });
                        log.debug('创建第二段TO', '成功' + to2_id.id);
                        //创建货品履行
                        var item_fulfillment = createTOItemFulfillment(to2_id.id, sku_id, quantity, date[0]);
                        if (item_fulfillment.status == '1') {
                            log.debug('创建履行单', '成功' + item_fulfillment.id);
                            //创建货品收据
                            var item_receipt = createTOItemReceipt(to2_id.id, date[0]);
                            if (item_receipt) {
                                if (item_fulfillment.reqty == 0) {
                                    record.submitFields({
                                        type: received_type,
                                        id: received_id,
                                        values: {
                                            custrecord_dps_fba_received_is_checked: true,
                                            custrecord_dps_fba_unreceived_quantity: item_fulfillment.reqty,
                                        }
                                    });
                                } else{
                                    record.submitFields({
                                        type: received_type,
                                        id: received_id,
                                        values: {
                                            custrecord_dps_fba_unreceived_quantity: item_fulfillment.reqty,
                                        }
                                    });
                                }
                                log.debug('创建货品收据', '成功' + item_receipt);
                            } else {
                                record.submitFields({
                                    type: received_type,
                                    id: received_id,
                                    values: {
                                        custrecord_dps_fba_received_times: Number(received_times) + 1,
                                        custrecord_dps_fba_unreceived_reason: item_receipt.reason
                                    }
                                });

                                record.delete({
                                    type: 'itemfulfillment',
                                    id: item_fulfillment.id
                                });
                                log.debug('创建货品收据', '失败');
                            }
                        } else {
                            record.submitFields({
                                type: received_type,
                                id: received_id,
                                values: {
                                    custrecord_dps_fba_received_times: Number(received_times) + 1,
                                    custrecord_dps_fba_unreceived_reason: item_fulfillment.reason
                                }
                            });
                            log.debug('创建履行单', '失败');
                        }
                    }else{
                        record.submitFields({
                            type: received_type,
                            id: received_id,
                            values: {
                                custrecord_dps_fba_received_times: Number(received_times) + 1,
                                custrecord_dps_fba_unreceived_reason: to2_id.reason
                            }
                        });
                        log.debug('创建第二段to', '失败');
                    }
                } else {
                    log.debug('第二段to', '存在');
                    log.debug('shipment_id', shipment_id);
                    var transferorder_data = record.load({type: 'transferorder', id: transfer_order3});
                    var transfer_status = transferorder_data.getValue('orderstatus');
                    if(transfer_status == 'G'){
                        var transferorder_count = transferorder_data.getLineCount({ sublistId: 'item' });
                        var quantity_received = 0;
                        for(var a = 0; a < transferorder_count; a++){
                            var item_id = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'item', line: a });
                            if(item_id == sku_id){
                                quantity_received = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: a });
                            }
                        }
                        var quan = quantity - quantity_received;
                        record.submitFields({
                            type: received_type,
                            id: received_id,
                            values: {
                                custrecord_dps_fba_received_is_checked: true,
                                custrecord_dps_fba_unreceived_quantity: quan,
                            }
                        }); 
                        return;
                    }
                    // var transferorder_count = transferorder_data.getLineCount({ sublistId: 'item' });
                    // var quantity_backordered;
                    // for(var a = 0; a < transferorder_count; a++){
                    //     var item_id = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'item', line: a });
                    //     if(item_id == sku_id){
                    //         quantity_backordered = transferorder_data.getSublistValue({ sublistId: 'item', fieldId: 'quantitybackordered', line: a });
                    //     }
                    // }
                    // if(quantity_backordered){
                        // record.submitFields({
                        //     type: received_type,
                        //     id: received_id,
                        //     values: {
                        //         custrecord_dps_fba_received_times: Number(received_times) + 1,
                        //         custrecord_dps_fba_unreceived_reason: '该货品缺货，数量：' + quantity_backordered + ',不能进行履行。'
                        //     }
                        // }); 
                        // return;
                    // }
                    //创建货品履行
                    var item_fulfillment = createTOItemFulfillment(transfer_order3, sku_id, quantity, date[0]);
                    if (item_fulfillment.status == '1') {
                        log.debug('创建履行单', '成功' + item_fulfillment.id);
                        //创建货品收据
                        var item_receipt = createTOItemReceipt(transfer_order3, date[0]);
                        if (item_receipt.status == '1') {
                            if (item_fulfillment.reqty == 0) {
                                record.submitFields({
                                    type: received_type,
                                    id: received_id,
                                    values: {
                                        custrecord_dps_fba_received_is_checked: true,
                                        custrecord_dps_fba_unreceived_quantity: item_fulfillment.reqty,
                                    }
                                });
                            } else{
                                record.submitFields({
                                    type: received_type,
                                    id: received_id,
                                    values: {
                                        custrecord_dps_fba_unreceived_quantity: item_fulfillment.reqty,
                                    }
                                });
                            }
                            log.debug('创建货品收据', '成功' + item_receipt.id);
                        } else {
                            record.submitFields({
                                type: received_type,
                                id: received_id,
                                values: {
                                    custrecord_dps_fba_received_times: Number(received_times) + 1,
                                    custrecord_dps_fba_unreceived_reason: item_receipt.reason
                                }
                            });

                            record.delete({
                                type: 'itemfulfillment',
                                id: item_fulfillment.id
                            });
                            log.debug('创建货品收据', '失败');
                        }
                    } else {
                        record.submitFields({
                            type: received_type,
                            id: received_id,
                            values: {
                                custrecord_dps_fba_received_times: Number(received_times) + 1,
                                custrecord_dps_fba_unreceived_reason: item_fulfillment.reason
                            }
                        });
                        log.debug('创建履行单', '失败');
                    }
                }
            } else {
                log.debug('error', '不存在第一段to或第一段to没有进行收货');
            }
        } catch (e) {
            log.debug('e', e);
            record.submitFields({
                type: received_type,
                id: received_id,
                values: {
                    custrecord_dps_fba_received_times: Number(received_times) + 1,
                    custrecord_dps_fba_unreceived_reason: e.message
                }
            });
        }
    }

    //创建第二段TO
    function createTO(id, target_warehouse_id, rec_link_id) {
        var result={};
        try {
            var transfer_order = record.copy({
                type: 'transferorder',
                id: id,
                isDynamic: true
            });
            //表单
            transfer_order.setValue({ fieldId: 'customform', value: 103 });
            //交易主体
            transfer_order.setValue({ fieldId: 'subsidiary', value: 5 });
            //发货仓库 
            transfer_order.setValue({ fieldId: 'custbody_dps_start_location', value: 2505 });
            //来源仓
            transfer_order.setValue({ fieldId: 'location', value: 2505 });
            //目标仓库
            transfer_order.setValue({ fieldId: 'custbody_actual_target_warehouse', value: target_warehouse_id });
            //在途仓
            transfer_order.setValue({ fieldId: 'transferlocation', value: target_warehouse_id });
            //关联相应的发运记录
            transfer_order.setValue({ fieldId: 'custbody_dps_fu_rec_link', value: rec_link_id });
            //状态
            transfer_order.setValue({ fieldId: 'orderstatus', value: 'B' });
            var t_id = transfer_order.save();
            result.status = '1';
            result.id = t_id;
            return result;
        } catch (e) {
            log.debug('e', e);
            result.status = '2';
            result.reason = e.message;
            return result;
        }
    }

    //TO单生成ITEM_FULFILLMENT
    function createTOItemFulfillment(id, skuid, quantity, date) {
        var result={};
        try {
            var f = record.transform({
                fromType: 'transferorder',
                toType: 'itemfulfillment',
                fromId: Number(id),
            });
            var reqty;
            f.setValue({ fieldId: 'shipstatus', value: 'C' });
            f.setText({ fieldId: 'trandate', text: date }); //日期
            var lineCount = f.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lineCount; i++) {
                var item_id = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var qua = f.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                if (item_id == skuid) {
                    if (quantity >= qua) {
                        f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qua, line: i });
                        reqty = quantity - qua;
                    } else if (quantity < qua) {
                        f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity, line: i });
                        reqty = 0;
                    }
                    f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
                } else {
                    f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                }
            }
            var f_id = f.save();
            result.status = '1';
            result.id = f_id;
            result.reqty = reqty;
            return result;
            // return f.save();
        } catch (e) {
            log.debug('e', e);
            result.status = '2';
            result.reason = e.message;
            return result;
        }
    }

    //TO单生成ItemReceipt(货品收据)
    function createTOItemReceipt(id, date) {
        var result={};
        try {
            var ire = record.transform({
                fromType: 'transferorder',
                toType: 'itemreceipt',
                fromId: Number(id)
            });
            ire.setText({ fieldId: 'trandate', text: date }); //日期
            var r_id = ire.save();
            result.status = '1';
            result.id = r_id;
            return result;
            // return ire.save();
        } catch (e) {
            log.debug('e', e);
            result.status = '2';
            result.reason = e.message;
            return result;
        }
    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
