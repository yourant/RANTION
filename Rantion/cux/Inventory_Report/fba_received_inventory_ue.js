/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function(search, record) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            var shipment_id = newRecord.getValue('custrecord_dps_fba_received_shipment_id');
            var to_id;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [
                    { name: 'custrecord_dps_shipping_rec_shipmentsid', operator: 'is', values: shipment_id }
                ],
                columns: [ 'custrecord_transfer_order3' ]
            }).run().each(function (result) {
                to_id = result.getValue('custrecord_transfer_order3');
                return false;
            });
            if (to_id) {
                var sellersku = newRecord.getValue('custrecord_dps_fba_received_inven_sku');
                var skuid;
                search.create({
                    type: 'customrecord_dps_amazon_seller_sku',
                    filters: [
                        { name: 'name', join: 'custrecord_dps_amazon_sku_number', operator: 'is', values: sellersku },
                        { name: 'isinactive', join: 'custrecord_dps_amazon_ns_sku', operator: 'is', values: false }
                    ],
                    columns: [ 'custrecord_dps_amazon_ns_sku' ]
                }).run().each(function (result) {
                    skuid = result.getValue('custrecord_dps_amazon_ns_sku');
                    return false;
                });
                if (skuid) {
                    var qty = 0;
                    var location, subsidiary;
                    search.create({
                        type: 'transferorder',
                        filters: [
                            { name: 'type', operator: 'anyof', values: ['TrnfrOrd'] },
                            { name: 'internalid', operator: 'anyof', values: to_id },
                            { name: 'item', operator: 'anyof', values: skuid },
                            { name: 'transferorderquantityreceived', operator: 'greaterthan', values: ['0'] },
                            { name: 'mainline', operator: 'is', values: ['F'] }
                        ],
                        columns: [ 'item', 'transferorderquantityreceived', 'transferlocation', 'subsidiary' ]
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
                        // type 33 盘亏出库，32 盘盈入库
                        var type = difference > 0 ? 32 : 33;
                        rec.setValue({ fieldId: 'custbody_stock_use_type', value: type });
                        rec.setValue({ fieldId: 'account', value: getAccount(type) });
                        rec.setValue({ fieldId: 'custbody_related_transfer_order', value: to_id });
                        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: skuid, line: 0 });
                        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: location, line: 0 });
                        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: difference, line: 0 });
                        rec.save();
                    }
                }
            }
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
