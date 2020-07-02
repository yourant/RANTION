/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../Helper/config.js', 'N/search', 'N/record', 'N/log'],
function (config, search, record, log) {

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
        log.debug('sourceType', sourceType);
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
            retjson.data = {
                msg: 'NS 请稍后重试'
            };
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
                columns: ['custrecord_transfer_order3']
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
                    columns: ['name', 'internalid']
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
                        columns: ['item', 'transferorderquantityreceived', 'transferlocation', 'subsidiary']
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
                                    columns: ['transferlocation', 'subsidiary']
                                }).run().each(function (result) {
                                    location = result.getValue('transferlocation');
                                    subsidiary = result.getValue('subsidiary');
                                    return true;
                                });
                            }
                            var rec = record.create({ type: 'inventoryadjustment', isDynamic: false });
                            rec.setValue({ fieldId: 'subsidiary', value: subsidiary });
                            // type 33 盘亏出库，32 盘盈入库
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
            type: 'customrecord_adjustment_account',
            filters: [
                { name: 'custrecord_inventory_types', operator: 'is', values: type }
            ],
            columns: [ 'custrecord_adjustment_accounts' ]
        }).run().each(function (e) {
            account = e.getValue('custrecord_adjustment_accounts')
        })
        return account
    }

    //交货单返回
    function returnDelivery(context) {
        var ret = {};
        try {
            var sourceNo = context.sourceNo;
            var ret_id;
            search.create({
                type: 'customrecord_dps_delivery_order',
                filters: [
                    { name: 'name', operator: 'is', values: sourceNo }
                ]
            }).run().each(function (rec) {
                ret_id = rec.id;
            });

            if (ret_id) {
                var objRecord = record.load({
                    type: 'customrecord_dps_delivery_order',
                    id: ret_id
                });
                var count = objRecord.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
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
                objRecord.setValue({
                    fieldId: 'custrecord_delivery_order_status',
                    value: 4
                });
                var objRecord_id = objRecord.save();
                if (objRecord_id) {
                    record.submitFields({
                        type: 'customrecord_dps_delivery_order',
                        id: ret_id,
                        values: {
                            custrecord_delivery_order_status: 4,
                            custrecord_dps_warehousing_end: true
                        }
                    });
                    //生成货品收据
                    var receipt_id = createItemReceipt(objRecord.getValue('custrecord_purchase_order_no'), context.detailList);
                    if (receipt_id) {
                        log.debug('创建货品收据', '成功');
                    }
                }
                ret.code = 0;
                ret.data = {
                    msg: 'NS 处理成功'
                };
                ret.msg = 'NS 处理成功';
                return ret;
            }
        } catch (e) {
            log.debug('error', e);
            ret.code = 5;
            ret.data = {
                msg: 'NS 处理失败：' + e.message
            };
            ret.msg = 'NS 处理失败：' + e.message;
            return ret;
        }
        return ret;
    }

    /**
     * 检查单据的状态, 属于等待审批的, 直接设置为等待收货
     * @param {*} po_id 
     */
    function checkStatusPO(po_id) {
        var recStatus;
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'internalid', operator: 'anyof', values: [po_id] },
                { name: 'mainline', operator: 'is', values: true }
            ],
            columns: [ 'statusref' ]
        }).run().each(function (rec) {
            recStatus = rec.getValue('statusref');
        });

        if (recStatus == '1') {

        }
    }

    //生成货品收据
    function createItemReceipt(po_id, item) {
        log.debug('生成货品收据', po_id + '_' + JSON.stringify(item));
        var objRecord_id, msg;
        item.forEach(function (line) {
            for (var ss = 0, ssLen = line.detailRecordList.length; ss < ssLen; ss++) {
                var objRecord = record.transform({
                    fromType: 'purchaseorder',
                    fromId: po_id,
                    toType: 'itemreceipt'
                });
                var subsidiary = objRecord.getValue('subsidiary');
                var count = objRecord.getLineCount({ sublistId: 'item' });
                var positionCode = line.detailRecordList[ss].positionCode;
                var type = line.detailRecordList[ss].type;
                var locationid, searchLocation;
                searchLocation = positionCode;
                // type (integer): 类型 1:已装箱 2:未装箱
                if (type == 1) { // 装箱搜索箱号
                    searchLocation = line.detailRecordList[ss].barcode;
                }
                locationid = searchLocationCode(searchLocation, subsidiary);
                if (!locationid && type == 1) { // 库位下的箱子, 不存在则创建
                    var fLocation = searchLocationCode(positionCode, subsidiary);
                    createBoxLocation(searchLocation, subsidiary, fLocation);
                    locationid = searchLocationCode(searchLocation, subsidiary);
                }

                if (!locationid && type == 2) { // 属于库存, 但库位不存在
                    msg = '对应的库位不存在： ' + searchLocation;
                    // retFlag = false;
                    // return '对应的库位不存在： ' + searchLocation;
                }

                var itemId;
                var itemName;

                var skuskus = [];
                var skusss = line.sku;
                skuskus.push(skusss.toString());
                search.create({
                    type: 'item',
                    filters: [
                        { name: 'itemid', operator: 'is', values: skuskus },
                    ],
                    columns: [ 'itemid' ]
                }).run().each(function (rectiem) {
                    itemId = rectiem.id;
                    itemName = rectiem.getValue('itemid');
                });
                var lineNumber = objRecord.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: itemId });
                objRecord.setSublistValue({ sublistId: 'item', fieldId: 'location', value: locationid, line: lineNumber });
                if (itemName == line.sku) {
                    objRecord.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.detailRecordList[ss].shelvesQty, line: lineNumber });
                    objRecord.setSublistValue({ sublistId: 'item', fieldId: 'location', value: locationid, line: lineNumber });
                    objRecord.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: lineNumber });
                    objRecord_id = objRecord.save();
                }
            }
        });
        return objRecord_id;
    }

    /**
     * 搜索对应的地点
     * @param {s} warCode 
     * @param {*} Subsidiary 
     */
    function searchLocationCode(warCode, Subsidiary) {
        var locationId;
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_wms_location', operator: 'is', values: warCode },
                { name: 'subsidiary', operator: 'anyof', values: Subsidiary },
                { name: 'isinactive', operator: 'is', values: false }
            ],
        }).run().each(function (rec) {
            locationId = rec.id;
        });
        return locationId || false;
    }

    /**
     * 创建箱子
     * @param {*} boxName 
     */
    function createBoxLocation(boxName, Subsidiary, fLocation) {

        // 2 广州蓝深科技有限公司
        // 3 广州蓝图创拓进出口贸易有限公司
        // 5 蓝深贸易有限公司

        var subArr = [2, 3, 5];

        var locObj = record.create({ type: 'location' });
        locObj.setValue({ fieldId: 'name', value: boxName });
        locObj.setValue({ fieldId: 'parent', value: fLocation });
        locObj.setValue({ fieldId: 'subsidiary', value: Subsidiary });
        locObj.setValue({ fieldId: 'custrecord_dps_wms_location', value: boxName });
        locObj.setValue({ fieldId: 'custrecord_dps_wms_location_name', value: boxName });
        locObj.setValue({ fieldId: 'custrecord_wms_location_type', value: 3 });
        search.create({
            type: 'location',
            filters: [{ name: 'internalid', operator: 'is', values: fLocation }],
            columns: [ 
                { name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' },
                { name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' }
            ]
        }).run().each(function(result) {
            var code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' });
            var name = result.getValue({ name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' });
            if (code) {
                locObj.setValue({ fieldId: 'custrecord_dps_warehouse_code', value: code });
            }
            if (name) {
                locObj.setValue({ fieldId: 'custrecord_dps_warehouse_name', value: name });
            }
            return false;
        });
        var locObjId = locObj.save();
        var rec = record.load({ type: 'location', id: locObjId });
        rec.setValue({ fieldId: 'parent', value: fLocation });
        rec.save();
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
            columns: ['item', 'custcol_dps_trans_order_item_sku']
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
                        sublistId: 'item', fieldId: 'custcol_dps_trans_order_item_sku', value: re_sku
                    });
                    objRecord.setSublistValue({
                        sublistId: 'item', fieldId: 'custcol_dps_quantity_in_stock',
                        line: lin, value: receivedQty
                    });
                    objRecord.setSublistValue({
                        sublistId: 'item', fieldId: 'custcol_dps_unstocked_quantity',
                        line: lin, value: unreceivedQty
                    });
                }
            }
        }
        objRecord.setValue({ fieldId: 'orderstatus', value: 'B' });
        var objRecord_id = objRecord.save();
        var it = record.transform({ fromType: 'returnauthorization', fromId: ret_id, toType: 'itemreceipt' });
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