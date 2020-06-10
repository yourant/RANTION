/*
 * @Author         : Li
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-06-04 15:09:10
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_inmaster_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    // 回传报文
    // InMasterResultDto {
    //     detailList (Array[InDetailResultDto]): 入库明细 ,
    //     sourceNo (string): 来源单号 ,
    //     sourceType (integer): 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库
    // }
    // InDetailResultDto {
    //     detailRecordList (Array[InDetailRecordResultDto]): sku上架明细 ,
    //     planQty (integer): 计划入库数 ,
    //     receivedQty (integer): 实收数量 ,
    //     shelvesQty (integer): 上架数量 ,
    //     sku (string): sku ,
    //     unqualifiedQty (integer): 质检不合格数
    // }
    // InDetailRecordResultDto {
    //     barcode (string): 条码 装箱条码/SKU ,
    //     positionCode (string): 库位编号 ,
    //     shelvesQty (integer): 上架数量 ,
    //     sku (string): sku ,
    //     type (integer): 类型 1:已装箱 2:未装箱
    // }
    function _post(context) {
        var sourceType = context.sourceType;
        log.debug('context', context);
        var re_id;
        var retjson = {};
        try {
            if (sourceType == 10) {
                re_id = returnDelivery(context);
            } else if (sourceType == 20) {
                re_id = returnInfo(context);
            } else if (sourceType == 30) {
                returnTransfer(context);
            }
            retjson.code = 0;
            retjson.data = {
                msg: 'NS 处理成功'
            }
            retjson.msg = 'success'
        } catch (error) {
            log.error('error', error);
            retjson.code = 3;
            retjson.data = { msg: 'NS 请稍后重试' };
            retjson.msg = 'failure';
        }
        return JSON.stringify(retjson);
    }

    // 自营仓调拨入库
    function returnTransfer(context) {
        try {
            // NO.1 调拨单的内部ID
            var sourceNo = context.sourceNo;
            var to_id;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [
                    { name: 'custrecord_dps_shipping_rec_order_num', operator: 'is', values: sourceNo }
                ],
                columns: [ 'custrecord_transfer_order3' ]
            }).run().each(function (result) {
                to_id = result.getValue('custrecord_transfer_order3');
                return false;
            });
            if (to_id) {
                var retskus = {};
                var rettrues = {};
                var skucodes = [];
                var skuids = [];
                context.detailList.map(function (line) {
                    var sku = line.sku;
                    var qty = line.shelvesQty;
                    retskus[sku] = qty;
                    skucodes.push(sku);
                });
                search.create({
                    type: 'item',
                    filters: [
                        { name: 'name', operator: 'is', values: skucodes }
                    ],
                    columns: [ 'name', 'internalid' ]
                }).run().each(function (result) {
                    var code = result.getValue('name');
                    var id = result.getValue('internalid');
                    var json = {};
                    json.qty = retskus[code];
                    rettrues[id] = json;
                    skuids.push(id);
                });
                if (skuids.length > 0) {
                    var trueskus = {};
                    var location, subsidiary;
                    search.create({
                        type: 'transferorder',
                        filters: [
                            { name: 'type', operator: 'anyof', values: ['TrnfrOrd'] },
                            { name: 'internalid', operator: 'is', values: to_id },
                            { name: 'item', operator: 'anyof', values: skuids },
                            { name: 'transferorderquantityreceived', operator: 'greaterthan', values: ['0'] },
                            { name: 'mainline', operator: 'is', values: ['F'] }
                        ],
                        columns: [ 'item', 'transferorderquantityreceived', 'transferlocation', 'subsidiary' ]
                    }).run().each(function (result) {
                        var skuid = result.getValue('item');
                        var sku = trueskus[skuid];
                        var qty = Number(result.getValue('transferorderquantityreceived'));
                        if (sku) {
                            sku.qty = sku.qty + qty;
                        } else {
                            var json = {};
                            sku.qty = qty;
                            trueskus[skuid] = json;
                        }
                        location = result.getValue('transferlocation');
                        subsidiary = result.getValue('subsidiary');
                        return true;
                    });
                    for (var index = 0; index < skuids.length; index++) {
                        var skuid = skuids[index];
                        var retsku = rettrues[skuid];
                        var truesku = trueskus[skuid];
                        var qty = 0;
                        if (truesku) {
                            var qty = Number(truesku.qty);
                        }
                        var lastQty = retsku.qty;
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
        } catch (error) {
            log.debug('自营仓调拨入库 error', error);
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

    //交货单返回
    function returnDelivery(context) {
        try {
            var sourceNo = context.sourceNo;
            var ret_id;
            search.create({
                type: 'customrecord_dps_delivery_order',
                filters: [{ name: 'name', operator: 'is', values: sourceNo }]
            }).run().each(function (rec) {
                ret_id = rec.id;
            });

            if (ret_id) {
                var objRecord = record.load({ type: 'customrecord_dps_delivery_order', id: ret_id });
                var count = objRecord.getLineCount({ sublistId: 'recmachcustrecord_dps_delivery_order_id' });
                if (context.detailList.length > 0) {
                    context.detailList.map(function (line) {
                        for (var i = 0; i < count; i++) {
                            var item_sku = objRecord.getSublistText({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_sku',
                                line: i
                            });
                            if (line.sku == item_sku) {
                                objRecord.setSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_stock_quantity',
                                    value: line.shelvesQty,
                                    line: i
                                })
                            }
                        }
                    });
                }
                objRecord.setValue({ fieldId: 'custrecord_delivery_order_status', value: 4 });
                var objRecord_id = objRecord.save();
                if (objRecord_id) {
                    // record.submitFields({
                    //     type: "customrecord_dps_delivery_order",
                    //     id: ret_id,
                    //     values: {
                    //         custrecord_delivery_order_status: 4
                    //     }
                    // });

                    //生成货品收据
                    var receipt_id = createItemReceipt(objRecord.getValue('custrecord_purchase_order_no'), context.detailList);
                    if (receipt_id) {
                        log.debug('创建货品收据', '成功');
                    }
                }
                return objRecord_id;
            }
        } catch (e) {
            log.debug('error', e);
        }
    }

    //生成货品收据
    function createItemReceipt(po_id, item) {
        var objRecord = record.transform({
            fromType: 'purchaseorder',
            fromId: po_id,
            toType: 'itemreceipt'
        });
        var subsidiary = objRecord.getValue('subsidiary');
        var count = objRecord.getLineCount({ sublistId: 'item' });
        item.map(function (line) {
            for (var i = 0; i < count; i++) {
                var item_id = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var item_sku;
                var positionCode = line.detailRecordList[0].positionCode;
                var locationid;
                search.create({
                    type: 'location',
                    filters: [
                        { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode },
                        { name: 'subsidiary', operator: 'is', values: subsidiary }
                    ],
                    columns: ['internalid']
                }).run().each(function (result) {
                    locationid = result.getValue('internalid');
                    return false;
                });
                search.create({
                    type: 'item',
                    filters: [{ name: 'internalid', operator: 'is', values: item_id }],
                    columns: [ 'itemid' ]
                }).run().each(function (rec) {
                    item_sku = rec.getValue('itemid');
                });
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: locationid,
                    line: i
                });
                if (item_sku == line.sku) {
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: line.shelvesQty,
                        line: i
                    });
                }
            }
        });
        return objRecord.save();
    }

    function returnInfo(context) {
        var limit = 3999;
        var ret_id;
        var sku = [];
        var sourceNo = context.sourceNo;
        search.create({
            type: 'returnauthorization',
            filters: [
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false },
                { name: 'poastext', operator: 'is', values: sourceNo }
            ],
            columns: [ 'item', 'custcol_dps_trans_order_item_sku' ]
        }).run().each(function (rec) {
            ret_id = rec.id;
            sku.push(rec.getValue('custcol_dps_trans_order_item_sku'));
            return --limit > 0;
        });

        var objRecord = record.load({ type: 'returnauthorization', id: ret_id });
        var detailList = context.detailList;
        for (var i = 0, length = detailList.length; i < length; i++) {
            var re_sku = detailList[i].sku;
            var receivedQty = detailList[i].receivedQty;
            var unreceivedQty = detailList[i].planQty - receivedQty
            for (var j = 0, len = sku.length; j < len; j++) {
                if (re_sku == sku[j]) {
                    var lin = objRecord.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_trans_order_item_sku',
                        value: re_sku
                    })
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: "custcol_dps_quantity_in_stock",
                        line: lin,
                        value: receivedQty
                    });
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: "custcol_dps_unstocked_quantity",
                        line: lin,
                        value: unreceivedQty
                    });
                }
            }
        }
        objRecord.setValue({ fieldId: 'orderstatus', value: 'B' });
        var objRecord_id = objRecord.save();
        var it = record.transform({
            fromType: 'returnauthorization',
            fromId: ret_id,
            toType: 'itemreceipt'
        });
        it.save();
        return objRecord_id;
    }

    function _get(context) {

    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});