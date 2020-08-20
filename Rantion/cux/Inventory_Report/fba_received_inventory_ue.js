/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../../Helper/config.js', 'N/search', 'N/record', 'N/url', 'N/https'],
function(config, search, record, url, https) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            var sellersku = newRecord.getValue('custrecord_dps_fba_received_inven_sku');
            var skuid;
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: [
                    { name: 'name', operator: 'is', values: sellersku }
                ],
                columns: [ 'custrecord_ass_sku' ]
            }).run().each(function (result) {
                skuid = result.getValue('custrecord_ass_sku');
                return false;
            });
            if (skuid) {
                var to_id;
                var shipment_id = newRecord.getValue('custrecord_dps_fba_received_shipment_id');
                search.create({
                    type: 'transferorder',
                    filters: [
                        { name: 'custbody_shipment_id', operator: 'is', values: shipment_id },
                        { name: 'custbody_dps_transferor_type', operator: 'is', values: 5 }
                    ]
                }).run().each(function (result) {
                    to_id = result.id;
                    return false;
                });
                // 公司间调拨
                if (to_id) {
                    adjustmentInventroyQuantiy(to_id, skuid, newRecord, 1);
                }
                // 同一主体下
                else {
                    var shipping_id, transfer_id, to_id, from_location, to1_location, subsidiary;
                    log.debug('shipment_id', 'shipment_id:'+shipment_id);
                    search.create({
                        type: 'customrecord_dps_shipping_record',
                        filters: [
                            { name: 'custrecord_dps_shipping_rec_shipmentsid', operator: 'is', values: shipment_id }
                        ],
                        columns: [
                            'custrecord_transfer_order3', 'custrecord_dps_shipping_rec_order_num',
                            { name: 'subsidiary', join: 'custrecord_dps_shipping_rec_order_num' },
                            { name: 'custbody_dps_end_location', join: 'custrecord_dps_shipping_rec_order_num' },
                            { name: 'custbody_actual_target_warehouse', join: 'custrecord_dps_shipping_rec_order_num' }
                        ]
                    }).run().each(function (result) {
                        shipping_id = result.id;
                        to_id = result.getValue('custrecord_transfer_order3');
                        transfer_id = result.getValue('custrecord_dps_shipping_rec_order_num');
                        from_location = result.getValue({ name: 'custbody_dps_end_location', join: 'custrecord_dps_shipping_rec_order_num' });
                        to1_location = result.getValue({ name: 'custbody_actual_target_warehouse', join: 'custrecord_dps_shipping_rec_order_num' });
                        subsidiary = result.getValue({ name: 'subsidiary', join: 'custrecord_dps_shipping_rec_order_num' });
                        return false;
                    });
                    if (!to_id && transfer_id) {
                        var SKUs = [];
                        search.create({
                            type: 'transferorder',
                            filters: [
                                { name: 'internalid', operator: 'is', values: transfer_id },
                                { name: 'mainline', operator: 'is', values: ['F'] },
                                { name: 'taxline', operator: 'is', values: ['F'] }
                            ],
                            columns: [ 'item', 'quantity', 'rate' ]
                        }).run().each(function (result) {
                            if (Number(result.getValue('quantity')) > 0) {
                                SKUs.push({
                                    'item': result.getValue('item'),
                                    'qty': result.getValue('quantity'),
                                    'price': result.getValue('rate')
                                });
                            }
                            return true;
                        });
                        // 创建NO.3库存转移订单
                        var transferorder_c_rec = record.create({ type : 'transferorder', isDynamic : true });
                        transferorder_c_rec.setValue({ fieldId: 'subsidiary', value: subsidiary });
                        transferorder_c_rec.setValue({ fieldId: 'custbody_dps_start_location', value: from_location });
                        transferorder_c_rec.setValue({ fieldId: 'location', value: from_location });
                        transferorder_c_rec.setValue({ fieldId: 'custbody_dps_end_location', value: to1_location });
                        transferorder_c_rec.setValue({ fieldId: 'transferlocation', value: to1_location });
                        transferorder_c_rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                        transferorder_c_rec.setValue({ fieldId: 'custbody_dps_transferor_type', value: '7' });
                        transferorder_c_rec.setValue({ fieldId: 'custbody_dps_fu_rec_link', value: shipping_id });
                        if (shipment_id) {
                            transferorder_c_rec.setValue({ fieldId: 'custbody_shipment_id', value: shipment_id });
                        }
                        for (var index = 0; index < SKUs.length; index++) {
                            transferorder_c_rec.selectNewLine({ sublistId : 'item' });
                            transferorder_c_rec.setCurrentSublistValue({ sublistId : 'item', fieldId : 'item', value : SKUs[index].item });
                            transferorder_c_rec.setCurrentSublistValue({ sublistId : 'item', fieldId : 'quantity', value : SKUs[index].qty });
                            transferorder_c_rec.setCurrentSublistValue({ sublistId : 'item', fieldId : 'rate', value : SKUs[index].price });
                            transferorder_c_rec.commitLine({ sublistId : 'item' });
                        }
                        var transferorder_c_id = transferorder_c_rec.save();
                        to_id = transferorder_c_id;

                        // 修改发运记录
                        var shipping_rec = record.load({ type: 'customrecord_dps_shipping_record', id: shipping_id });
                        shipping_rec.setValue({ fieldId: 'custrecord_transfer_order3', value: transferorder_c_id });
                        shipping_rec.save();

                        // NO.3库存转移订单生成货品履行
                        var itemFulfillment = record.transform({
                            fromType: 'transferorder',
                            toType: record.Type.ITEM_FULFILLMENT,
                            fromId: Number(transferorder_c_id),
                        });
                        itemFulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });
                        var lineIF = itemFulfillment.getLineCount({ sublistId: 'item' });
                        for (var i = 0; i < lineIF; i++) {
                            var quantity = itemFulfillment.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                            itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'location', value: from_location, line: i });
                            itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity, line: i });
                        }
                        itemFulfillment.save();
                    }
                    if (shipping_id && to_id && from_location && to1_location && subsidiary) {
                        adjustmentInventroyQuantiy(to_id, skuid, newRecord, 2);
                    }
                }
            }
        }
    }

    function adjustmentInventroyQuantiy(to_id, skuid, newRecord, type) {
        var location, subsidiary;
        var qty = 0;
        search.create({
            type: 'transferorder',
            filters: [
                { name: 'type', operator: 'anyof', values: ['TrnfrOrd'] },
                { name: 'internalid', operator: 'anyof', values: to_id },
                { name: 'item', operator: 'anyof', values: skuid },
                { name: 'transferorderquantityreceived', operator: 'greaterthan', values: ['0'] },
                { name: 'mainline', operator: 'is', values: ['F'] }
            ],
            columns: [ 'item', 'transferorderquantityreceived', 'transferlocation', 'subsidiary', 'custbody_dps_transferor_type' ]
        }).run().each(function (result) {
            qty = qty + Number(result.getValue('transferorderquantityreceived'));
            location = result.getValue('transferlocation');
            subsidiary = result.getValue('subsidiary');
            return true;
        });
        var lastQty = Number(newRecord.getValue('custrecord_dps_fba_received_inv_quantity'));
        var difference = lastQty;
        if (qty == 0) {
            var itemReceipt = record.transform({
                fromType: 'transferorder',
                toType: record.Type.ITEM_RECEIPT,
                fromId: Number(to_id),
            });
            itemReceipt.setValue({ fieldId: 'shipstatus', value: 'C' });
            var lineIR = itemReceipt.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lineIR; i++) {
                var itemre = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                if (itemre != skuid) {
                    itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                    continue;
                }
                qty = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
            }
            var url_finish_fba = url.resolveScript({
                scriptId: 'customscript_dps_wms_finish_fba_rl',
                deploymentId: 'customdeploy_dps_wms_finish_fba_rl'
            });
            if (type == 1) {
                https.post({
                    url: config.service_url + url_finish_fba,
                    body: {
                        transferOrderNO: to_id
                    },
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                });
            }
            itemReceipt.save();
            difference = lastQty - qty;
        }
        if (difference != 0) {
            if (!location || !subsidiary) {
                search.create({
                    type: 'transferorder',
                    filters: [
                        { name: 'type', operator: 'anyof', values: ['TrnfrOrd'] },
                        { name: 'internalid', operator: 'anyof', values: to_id },
                        { name: 'mainline', operator: 'is', values: ['T'] }
                    ],
                    columns: [ 'transferlocation', 'subsidiary' ]
                }).run().each(function (result) {
                    location = result.getValue('transferlocation');
                    subsidiary = result.getValue('subsidiary');
                    return true;
                });
            }
            var rec = record.create({ type: 'inventoryadjustment', isDynamic: false });
            rec.setValue({ fieldId: 'subsidiary', value: subsidiary });
            // type 2 盘亏出库，1 盘盈入库
            var type = difference > 0 ? config.panying_transfer_type : config.deficit_transfer_type;
            rec.setValue({ fieldId: 'custbody_stock_use_type', value: type });
            rec.setValue({ fieldId: 'account', value: getAccount(type) });
            rec.setValue({ fieldId: 'custbody_related_transfer_order', value: to_id });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: skuid, line: 0 });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: location, line: 0 });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: difference, line: 0 });
            rec.save();
        }
    }

    /**
     * 查询科目
     * @param {*} type 
     */
    function getAccount(type) {
        var account
        search.create({
            type: "customrecord_adjustment_account",
            filters: [
                { name: 'custrecord_inventory_types', operator: 'is', values: type }
            ],
            columns: [{ name: 'custrecord_adjustment_accounts' }]
        }).run().each(function (e) {
            account = e.getValue('custrecord_adjustment_accounts')
        })
        return account
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
