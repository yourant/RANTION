/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-07-17 10:44:12
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_inmaster_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../Helper/config.js', 'N/search', 'N/record', 'N/log', '../common/request_record',
    '../Helper/tool.li'
], function (config, search, record, log, requestRecord, tool) {

    // 回传报文
    // InMasterResultDto {
    //     detailList (Array[InDetailResultDto]): 入库明细 ,
    //     sourceNo (string): 来源单号 ,
    //     sourceType (integer): 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库,
    //     remark:备注
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
        var re_id;
        var retjson = {};
        var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "putOn");
        if (requestRecordInfo) {
            retjson.code = 1;
            retjson.data = null;
            retjson.msg = 'failure: WMS请求重复处理';
        } else {
            var sourceType = context.requestBody.sourceType;
            log.debug('context', context);
            log.debug('sourceType', sourceType);

            try {
                if (sourceType == 10) { // 交货单
                    re_id = returnDelivery(context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(re_id), 1, "putOn");
                    return re_id;
                } else if (sourceType == 20) { // 退货入库
                    re_id = returnInfo(context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(re_id), 1, "putOn");
                    return re_id;
                } else if (sourceType == 30) { // 调拨入库
                    re_id = returnTransfer(context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "putOn");
                    return re_id;
                } else if (sourceType == 40) {
                    returnSubsidiaryTransfer(context.requestBody);
                } else if (sourceType == 50) { // 渠道退件 小包
                    //小包
                    logisticsReturnItemReceipt(context.requestBody);
                } else if (sourceType == 60) { // 渠道退件 调拨
                    //大包
                    logisticsReturnTransfer(context.requestBody);
                }
                retjson.code = 0;
                retjson.data = null;
                retjson.msg = 'success'
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "putOn");
            } catch (error) {
                log.error('error', error);
                retjson.code = 3;
                retjson.data = null;
                retjson.msg = 'failure';
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "putOn");
            }
        }
        return JSON.stringify(retjson);
    }

    // 单主体调拨 —— 
    function returnSubsidiaryTransfer(context) {

        var retObj = {};
        // try {
        // NO.1 调拨单的内部ID
        var sourceNo = context.sourceNo;
        // 大货发运记录
        var shipping_id, to_id, from_location, to_location, subsidiary;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: sourceNo
            }],
            columns: [
                'custrecord_transfer_order3',
                {
                    name: 'subsidiary',
                    join: 'custrecord_dps_shipping_rec_order_num'
                },
                {
                    name: 'transferlocation',
                    join: 'custrecord_dps_shipping_rec_order_num'
                },
                {
                    name: 'custbody_actual_target_warehouse',
                    join: 'custrecord_dps_shipping_rec_order_num'
                }
            ]
        }).run().each(function (result) {
            shipping_id = result.id;
            to_id = result.getValue('custrecord_transfer_order3');
            from_location = result.getValue({
                name: 'transferlocation',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            to_location = result.getValue({
                name: 'custbody_actual_target_warehouse',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            subsidiary = result.getValue({
                name: 'subsidiary',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            return false;
        });

        if (!to_id) {
            var SKUs = [];
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: shipping_id
                }],
                columns: [
                    'custrecord_dps_shipping_record_item', 'custrecord_dps_ship_record_item_quantity'
                ]
            }).run().each(function (result) {
                SKUs.push({
                    'item': result.getValue('custrecord_dps_shipping_record_item'),
                    'qty': result.getValue('custrecord_dps_ship_record_item_quantity'),
                    'price': 0
                });
                return true;
            });
            log.debug('SKUs', JSON.stringify(SKUs));
            // 创建NO.3库存转移订单
            var transferorder_c_rec = record.create({
                type: 'transferorder',
                isDynamic: true
            });
            transferorder_c_rec.setValue({
                fieldId: 'subsidiary',
                value: subsidiary
            });
            transferorder_c_rec.setValue({
                fieldId: 'custbody_dps_start_location',
                value: from_location
            });
            transferorder_c_rec.setValue({
                fieldId: 'location',
                value: from_location
            });
            transferorder_c_rec.setValue({
                fieldId: 'custbody_dps_end_location',
                value: to_location
            });
            transferorder_c_rec.setValue({
                fieldId: 'transferlocation',
                value: to_location
            });
            transferorder_c_rec.setValue({
                fieldId: 'orderstatus',
                value: 'B'
            });
            transferorder_c_rec.setValue({
                fieldId: 'custbody_dps_transferor_type',
                value: '7'
            });
            transferorder_c_rec.setValue({
                fieldId: 'custbody_dps_fu_rec_link',
                value: shipping_id
            });
            if (shipment_id) {
                transferorder_c_rec.setValue({
                    fieldId: 'custbody_shipment_id',
                    value: shipment_id
                });
            }
            for (var index = 0; index < SKUs.length; index++) {
                transferorder_c_rec.selectNewLine({
                    sublistId: 'item'
                });
                transferorder_c_rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: SKUs[index].item
                });
                transferorder_c_rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: SKUs[index].qty
                });
                transferorder_c_rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: SKUs[index].price
                });
                transferorder_c_rec.commitLine({
                    sublistId: 'item'
                });
            }
            var transferorder_c_id = transferorder_c_rec.save();
            to_id = transferorder_c_id;
            log.debug('创建NO.3库存转移订单', transferorder_c_id);

            // 修改发运记录
            var shipping_rec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: shipping_id
            });
            shipping_rec.setValue({
                fieldId: 'custrecord_transfer_order3',
                value: transferorder_c_id
            });
            shipping_rec.save();

            // NO.3库存转移订单生成货品履行
            var itemFulfillment = record.transform({
                fromType: 'transferorder',
                toType: record.Type.ITEM_FULFILLMENT,
                fromId: Number(transferorder_c_id),
            });
            itemFulfillment.setValue({
                fieldId: 'shipstatus',
                value: 'C'
            });
            var lineIF = itemFulfillment.getLineCount({
                sublistId: 'item'
            });
            for (var i = 0; i < lineIF; i++) {
                var quantity = itemFulfillment.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantityremaining',
                    line: i
                });
                itemFulfillment.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: from_location,
                    line: i
                });
                itemFulfillment.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: quantity,
                    line: i
                });
            }
            var ifId = itemFulfillment.save();
            log.debug('库存转移订单if生成成功', ifId);
        }
        context.detailList.map(function (line) {
            var sku = line.sku;
            var qty = line.shelvesQty;
            if (shipping_id && to_id && from_location && to_location && subsidiary) {
                adjustmentInventroyQuantiy(to_id, sku, qty);
            }
        });

        retObj.code = 0;
        retObj.data = null;
        retObj.msg = "NS 处理成功"

        // } catch (error) {
        //     log.debug('单主体调拨入库 error', error);
        // }
    }

    function adjustmentInventroyQuantiy(to_id, sku, qty) {
        var skuid;
        search.create({
            type: 'item',
            filters: [{
                name: 'itemid',
                operator: 'is',
                values: sku
            }]
        }).run().each(function (result) {
            skuid = result.id
            return false;
        });
        var location, subsidiary;
        var qty = 0;
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'type',
                    operator: 'anyof',
                    values: ['TrnfrOrd']
                },
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: to_id
                },
                {
                    name: 'item',
                    operator: 'anyof',
                    values: skuid
                },
                {
                    name: 'transferorderquantityreceived',
                    operator: 'greaterthan',
                    values: ['0']
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: ['F']
                }
            ],
            columns: ['item', 'transferorderquantityreceived', 'transferlocation', 'subsidiary', 'custbody_dps_transferor_type']
        }).run().each(function (result) {
            qty = qty + Number(result.getValue('transferorderquantityreceived'));
            location = result.getValue('transferlocation');
            subsidiary = result.getValue('subsidiary');
            return true;
        });
        var lastQty = qty;
        var difference = lastQty;
        if (qty == 0) {
            var itemReceipt = record.transform({
                fromType: 'transferorder',
                toType: record.Type.ITEM_RECEIPT,
                fromId: Number(to_id),
            });
            itemReceipt.setValue({
                fieldId: 'shipstatus',
                value: 'C'
            });
            var lineIR = itemReceipt.getLineCount({
                sublistId: 'item'
            });
            for (var i = 0; i < lineIR; i++) {
                var itemre = itemReceipt.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                if (itemre != skuid) {
                    itemReceipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: false,
                        line: i
                    });
                    continue;
                }
                qty = itemReceipt.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });
            }
            itemReceipt.save();
            difference = lastQty - qty;
        }
        if (difference != 0) {
            if (!location || !subsidiary) {
                search.create({
                    type: 'transferorder',
                    filters: [{
                            name: 'type',
                            operator: 'anyof',
                            values: ['TrnfrOrd']
                        },
                        {
                            name: 'internalid',
                            operator: 'anyof',
                            values: to_id
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: ['T']
                        }
                    ],
                    columns: ['transferlocation', 'subsidiary']
                }).run().each(function (result) {
                    location = result.getValue('transferlocation');
                    subsidiary = result.getValue('subsidiary');
                    return true;
                });
            }
            var rec = record.create({
                type: 'inventoryadjustment',
                isDynamic: false
            });
            rec.setValue({
                fieldId: 'subsidiary',
                value: subsidiary
            });
            // type 2 盘亏出库，1 盘盈入库
            var type = difference > 0 ? config.panying_transfer_type : config.deficit_transfer_type;
            rec.setValue({
                fieldId: 'custbody_stock_use_type',
                value: type
            });
            rec.setValue({
                fieldId: 'account',
                value: getAccount(type)
            });
            rec.setValue({
                fieldId: 'custbody_related_transfer_order',
                value: to_id
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'item',
                value: skuid,
                line: 0
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'location',
                value: location,
                line: 0
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'adjustqtyby',
                value: difference,
                line: 0
            });
            rec.save();
        }
    }

    /**
     * 自营仓调拨入库
     * @param {Object} context 
     */
    function returnTransfer(context) {
        // NO.1 调拨单的内部ID
        var sourceNo = context.sourceNo;
        var to_id, retObj = {};
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: sourceNo
            }],
            columns: ['custrecord_transfer_order3']
        }).run().each(function (result) {
            to_id = result.getValue('custrecord_transfer_order3');
            return false;
        });
        if (to_id) {

            var detailList = context.detailList; // 入库明细
            log.debug('detailList', detailList);
            var getBinArr = tool.getAllBinBox(detailList); // 获取所有的库位和箱号信息
            var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retObj.code = 3;
                retObj.data = null;
                retObj.msg = 'unknown: ' + getArr;
                log.debug('不存在库位 : ', retObj);
                return retObj;
            }

            var itemGroup = tool.SummaryBinBox(getBinArr);
            var boxObj = itemGroup.BoxObj,
                binObj = itemGroup.BinObj;

            var BoxObjKey = Object.keys(boxObj),
                BinObjKey = Object.keys(binObj);

            var recType = "transferorder";

            var toItemArr = tool.searchTransactionItemInfo(recType, to_id);
            BoxObjKey.map(function (boxKey) { // 直接按箱号履行

                var irObj = record.transform({
                    fromType: 'transferorder',
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: Number(to_id)
                });
                irObj.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                var temp_obj = boxObj[boxKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    for (var i_t = 0, i_t_len = toItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = toItemArr[i_t];
                        log.debug('货品收据 fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('货品行号', lineNumber);

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        if (dl_sku.sku == fi_temp.itemName) {
                            var getLoca = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                line: lineNumber
                            })
                            log.debug('地点 getLoca', getLoca);
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: dl_sku.shelvesQty,
                                line: lineNumber
                            }); // 设置数量

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_location_bin',
                                text: dl_sku.positionCode,
                                line: lineNumber
                            }); // 仓库编号

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_case_number',
                                text: boxKey,
                                line: lineNumber
                            }); // 箱号

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            }); // 设置为收货
                        } else {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: false,
                                line: lineNumber
                            }); // 设置为不收货
                        }
                    }
                }
                var irObj_id = irObj.save();
                log.debug('irObj_id', irObj_id);
            })
            BinObjKey.map(function (binKey) { // 直接按库位履行

                var irObj = record.transform({
                    fromType: 'transferorder',
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: Number(to_id)
                });
                irObj.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                var temp_obj = binObj[binKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    for (var i_t = 0, i_t_len = toItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = toItemArr[i_t];
                        log.debug('货品收据 fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('货品行号', lineNumber);

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        if (dl_sku.sku == fi_temp.itemName) {
                            var getLoca = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                line: lineNumber
                            })
                            log.debug('地点 getLoca', getLoca);
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: dl_sku.shelvesQty,
                                line: lineNumber
                            }); // 设置数量

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_location_bin',
                                text: dl_sku.positionCode,
                                line: lineNumber
                            }); // 仓库编号

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_case_number',
                                text: boxKey,
                                line: lineNumber
                            }); // 箱号

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            }); // 设置为收货
                        } else {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: false,
                                line: lineNumber
                            }); // 设置为不收货
                        }
                    }
                }
                var irObj_id = irObj.save();
                log.debug('irObj_id', irObj_id);
            })


            // 回传数据存在差额
            var detailList = context.detailList;
            var differQty = [];
            detailList.map(function (detail) {

                var receivedQty = detail.receivedQty, // 实收数量
                    sku1 = detail.sku, // 货品
                    detailRecordList = detail.detailRecordList; // 上架明细

                detailRecordList.map(function (item) {
                    var barcode = item.barcode, // 箱号
                        positionCode = item.positionCode, // 库位
                        sku = item.sku, // 货品
                        shelvesQty = item.shelvesQty, // 上架数量
                        type = item.type; // 类型

                    toItemArr.map(function (toItem) {
                        var toQty = toItem.itemQty, // 货品收货数量
                            toItemName = toItem.itemName, // 货品名称
                            toitemId = toItem.itemId; // 货品ID

                        if (toItemName == sku) {
                            if (toQty - shelvesQty > 0) { // 存在差额, 存入数组
                                var it = {
                                    itemId: toitemId,
                                    diffQty: toQty - shelvesQty,
                                    barcode: barcode,
                                    positionCode: positionCode,
                                    type: type
                                }
                                differQty.push(it);
                            }
                        }
                    });
                });
            });

            log.debug('存在差额的货品', differQty);


            var location, subsidiary;
            search.create({
                type: 'transferorder',
                filters: [{
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    },
                    {
                        name: 'internalid',
                        operator: 'is',
                        values: to_id
                    },
                ],
                columns: [
                    "transferlocation", "subsidiary"
                ]
            }).run().each(function (rec) {
                location = result.getValue('transferlocation');
                subsidiary = result.getValue('subsidiary');
            });


            diffQty.map(function (diffQ) {

                var difference = diffQ.diffQty;
                var rec = record.create({
                    type: 'inventoryadjustment',
                    isDynamic: false
                });
                rec.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiary
                });
                // type 2 盘亏出库，1 盘盈入库
                var type = difference > 0 ? config.panying_transfer_type : config.deficit_transfer_type;
                rec.setValue({
                    fieldId: 'custbody_stock_use_type',
                    value: type
                });
                rec.setValue({
                    fieldId: 'account',
                    value: getAccount(type)
                });
                rec.setValue({
                    fieldId: 'custbody_related_transfer_order',
                    value: to_id
                });
                rec.setSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: skuid,
                    line: 0
                });
                rec.setSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: location,
                    line: 0
                });
                rec.setSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'custcol_location_bin',
                    value: diffQ.positionCode,
                    line: 0
                }); // 库位

                if (diffQ.type == 1) {
                    rec.setSublistValue({
                        sublistId: 'inventory',
                        fieldId: 'custcol_case_number',
                        value: diffQ.barcode,
                        line: 0
                    }); // 箱号
                }

                rec.setSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    value: difference,
                    line: 0
                });
                var recId = rec.save();
                log.debug('库存调整 recId', recId);

            });


            retObj.code = 0;
            retObj.data = null;
            retObj.msg = "NS 处理成功"

            return;

            var retskus = {};
            var rettrues = {};
            var skucodes = [];
            var skuids = [];
            context.detailList.map(function (line) {
                var sku = line.sku;
                var qty = line.shelvesQty;
                var detailRecordList = line.detailRecordList;
                retskus[sku] = qty;
                skucodes.push(sku);
            });
            search.create({
                type: 'item',
                filters: [{
                    name: 'name',
                    operator: 'is',
                    values: skucodes
                }],
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
                    filters: [{
                            name: 'type',
                            operator: 'anyof',
                            values: ['TrnfrOrd']
                        },
                        {
                            name: 'internalid',
                            operator: 'is',
                            values: to_id
                        },
                        {
                            name: 'item',
                            operator: 'anyof',
                            values: skuids
                        },
                        {
                            name: 'transferorderquantityreceived',
                            operator: 'greaterthan',
                            values: ['0']
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: ['F']
                        }
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
                        itemReceipt.setValue({
                            fieldId: 'shipstatus',
                            value: 'C'
                        });
                        var lineIR = itemReceipt.getLineCount({
                            sublistId: 'item'
                        });
                        for (var i = 0; i < lineIR; i++) {
                            var itemre = itemReceipt.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i
                            });
                            if (itemre != skuid) {
                                itemReceipt.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemreceive',
                                    value: false,
                                    line: i
                                });
                                continue;
                            }
                            qty = itemReceipt.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i
                            });
                        }
                        var itemReceipt_id = itemReceipt.save();
                        log.debug('货品收据 itemReceipt_id', itemReceipt_id);
                        difference = lastQty - qty;
                    }
                    if (difference != 0) {
                        if (!location || !subsidiary) {
                            search.create({
                                type: 'transferorder',
                                filters: [{
                                        name: 'type',
                                        operator: 'anyof',
                                        values: ['TrnfrOrd']
                                    },
                                    {
                                        name: 'internalid',
                                        operator: 'anyof',
                                        values: to_id
                                    },
                                    {
                                        name: 'mainline',
                                        operator: 'is',
                                        values: ['T']
                                    }
                                ],
                                columns: ['transferlocation', 'subsidiary']
                            }).run().each(function (result) {
                                location = result.getValue('transferlocation');
                                subsidiary = result.getValue('subsidiary');
                                return true;
                            });
                        }
                        var rec = record.create({
                            type: 'inventoryadjustment',
                            isDynamic: false
                        });
                        rec.setValue({
                            fieldId: 'subsidiary',
                            value: subsidiary
                        });
                        // type 2 盘亏出库，1 盘盈入库
                        var type = difference > 0 ? config.panying_transfer_type : config.deficit_transfer_type;
                        rec.setValue({
                            fieldId: 'custbody_stock_use_type',
                            value: type
                        });
                        rec.setValue({
                            fieldId: 'account',
                            value: getAccount(type)
                        });
                        rec.setValue({
                            fieldId: 'custbody_related_transfer_order',
                            value: to_id
                        });
                        rec.setSublistValue({
                            sublistId: 'inventory',
                            fieldId: 'item',
                            value: skuid,
                            line: 0
                        });
                        rec.setSublistValue({
                            sublistId: 'inventory',
                            fieldId: 'location',
                            value: location,
                            line: 0
                        });
                        rec.setSublistValue({
                            sublistId: 'inventory',
                            fieldId: 'adjustqtyby',
                            value: difference,
                            line: 0
                        });
                        var recId = rec.save();
                        log.debug('库存调整 recId', recId);
                    }
                }
            }
        } else { // 不存在对应的第二段调拨单
            retObj.code = 3;
            retObj.data = null;
            retObj.msg = 'unknown: ' + sourceNo
        }

        return retObj || false;
    }

    //大包退件入库
    function logisticsReturnTransfer(body) {
        try {
            var sourceNo = body.sourceNo;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'custrecord_dps_shipping_rec_order_num',
                    operator: 'is',
                    values: sourceNo
                }],
                columns: [
                    'custrecord_transfer_order3',
                    {
                        name: 'subsidiary',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    },
                    {
                        name: 'transferlocation',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    },
                    {
                        name: 'custbody_actual_target_warehouse',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    }
                ]
            }).run().each(function (result) {
                shipping_id = result.id;
                to_id = result.getValue('custrecord_transfer_order3');
                from_location = result.getValue({
                    name: 'transferlocation',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });
                to_location = result.getValue({
                    name: 'custbody_actual_target_warehouse',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });
                subsidiary = result.getValue({
                    name: 'subsidiary',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });

                var transferorder = record.copy({
                    type: record.Type.TRANSFER_ORDER,
                    id: shipping_id,
                    isDynamic: true
                });

                var custbody_dps_start_location = transferorder.getValue("custbody_dps_start_location");
                var custbody_actual_target_warehouse = transferorder.getValue("custbody_actual_target_warehouse");
                var transferlocation = transferorder.getValue("transferlocation");
                var location = transferorder.getValue("location");
                transferorder.setValue({
                    fieldId: custbody_dps_start_location,
                    value: custbody_actual_target_warehouse
                });
                transferorder.setValue({
                    fieldId: custbody_actual_target_warehouse,
                    value: custbody_dps_start_location
                });
                transferorder.setValue({
                    fieldId: transferlocation,
                    value: location
                });
                transferorder.setValue({
                    fieldId: location,
                    value: transferlocation
                });

                var transferorderId = transferorder.save();

                var itemreceipt = record.transform({
                    fromType: record.Type.TRANSFER_ORDER,
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: Number(transferorderId),
                });

                var i = 0;
                for (var index = 0; index < body.detailList.length; index++) {
                    var line = body.detailList[index];
                    for (var ss = 0, ssLen = line.detailRecordList.length; ss < ssLen; ss++) {
                        var positionCode = line.detailRecordList[ss].positionCode;
                        var type = line.detailRecordList[ss].type;
                        var locationid, searchLocation;
                        searchLocation = positionCode;
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
                        var skuId;
                        search.create({
                            type: 'item',
                            filters: [{
                                name: 'itemid',
                                operator: 'is',
                                values: line.sku
                            }, ],
                            columns: ['itemid']
                        }).run().each(function (rectiem) {
                            skuId = rectiem.id;
                        });
                        itemreceipt.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: locationid,
                            line: i
                        });
                        itemreceipt.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: skuId,
                            line: i
                        });
                        itemreceipt.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: line.detailRecordList[ss].shelvesQty,
                            line: i
                        });
                        i++;
                    }
                }
                itemreceipt.save();

                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: shipping_id,
                    values: {
                        custrecord_dps_shipping_rec_status: 23
                    }
                });
                return false;
            });
        } catch (error) {
            log.debug('大包渠道退件 error', error);
        }
    }

    /**
     * 小包退件入库
     * @param {*} body 
     */
    function logisticsReturnItemReceipt(body) {
        var sourceNo = body.sourceNo;
        var custbody_dps_small_fulfillment_record;
        search.create({
            type: 'salesorder',
            filters: [{
                name: 'tranid',
                operator: 'is',
                values: sourceNo
            }],
            columns: [
                'custbody_dps_small_fulfillment_record', 'subsidiary'
            ]
        }).run().each(function (rec) {
            custbody_dps_small_fulfillment_record = rec.getValue('custbody_dps_small_fulfillment_record');
            log.audit('custbody_dps_small_fulfillment_record', custbody_dps_small_fulfillment_record);

            var returnauthorization = record.transform({
                fromType: 'salesorder',
                toType: record.Type.RETURN_AUTHORIZATION,
                fromId: Number(rec.id),
            });
            var returnauthorizationId = returnauthorization.save();

            var itemreceipt = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                toType: record.Type.ITEM_RECEIPT,
                fromId: Number(returnauthorizationId),
            });

            var i = 0;
            for (var index = 0; index < body.detailList.length; index++) {
                var line = body.detailList[index];
                for (var ss = 0, ssLen = line.detailRecordList.length; ss < ssLen; ss++) {
                    var positionCode = line.detailRecordList[ss].positionCode;
                    var type = line.detailRecordList[ss].type;
                    var locationid, searchLocation;
                    searchLocation = positionCode;
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
                    var skuId;
                    search.create({
                        type: 'item',
                        filters: [{
                            name: 'itemid',
                            operator: 'is',
                            values: line.sku
                        }, ],
                        columns: ['itemid']
                    }).run().each(function (rectiem) {
                        skuId = rectiem.id;
                    });
                    itemreceipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: locationid,
                        line: i
                    });
                    itemreceipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: skuId,
                        line: i
                    });
                    itemreceipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: line.detailRecordList[ss].shelvesQty,
                        line: i
                    });
                    i++;
                }
            }
            itemreceipt.save();
            record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
                id: custbody_dps_small_fulfillment_record,
                values: {
                    custrecord_dps_ship_small_status: 23
                }
            });
        });
    }

    /**
     * 查询科目
     * @param {*} type 
     */
    function getAccount(type) {
        var account
        search.create({
            type: 'customrecord_adjustment_account',
            filters: [{
                name: 'custrecord_inventory_types',
                operator: 'is',
                values: type
            }],
            columns: ['custrecord_adjustment_accounts']
        }).run().each(function (e) {
            account = e.getValue('custrecord_adjustment_accounts')
        })
        return account
    }

    /**
     * 交货单入库回传
     * @param {Object} context 
     */
    function returnDelivery(context) {
        var ret = {};
        var sourceNo = context.sourceNo;
        var ret_id;
        search.create({
            type: 'customrecord_dps_delivery_order',
            filters: [{
                name: 'name',
                operator: 'is',
                values: sourceNo
            }],
        }).run().each(function (rec) {
            ret_id = rec.id;
        });

        if (ret_id) {

            var detailList = context.detailList; // 入库明细
            log.debug('detailList', detailList);
            var getBinArr = tool.getAllBinBox(detailList);
            var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retjson.code = 3;
                retjson.data = null;
                retjson.msg = 'unknown: ' + getArr;
                log.debug('不存在库位 : ', retjson);
                return retjson;
            }

            log.debug('开始加载 交货单记录', "load")
            var objRecord = record.load({
                type: 'customrecord_dps_delivery_order',
                id: ret_id
            });

            objRecord.setValue({
                fieldId: 'custrecord_delivery_order_status',
                value: 4
            });

            objRecord.setValue({
                fieldId: 'custrecord_dps_warehousing_end',
                value: true
            });

            var count = objRecord.getLineCount({
                sublistId: 'recmachcustrecord_dps_delivery_order_id'
            });
            log.debug('开始修改交货单', '货品行上的值');
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

            var devLocation = objRecord.getValue('custrecord_dsp_delivery_order_location'); // 获取交货单的地点
            var poId = objRecord.getValue('custrecord_purchase_order_no'); // 关联的采购订单
            log.debug('履行采购订单', 'Starts');
            var receipt_id = createItemReceipt(poId, context.detailList, devLocation);
            log.debug('履行采购订单', 'End');
            if (receipt_id && receipt_id.length > 0) { // 存在货品收据

                var objRecord_id = objRecord.save();

                log.debug('更新交货单成功 objRecord_id', objRecord_id);

                log.debug('NS 处理成功', "NS 处理成功");
                ret.code = 0;
                ret.data = null;
                ret.msg = 'NS 处理成功';
                return ret;
            } else {
                log.debug('NS 处理异常', "NS 处理异常");
                ret.code = 6;
                ret.data = null;
                ret.msg = 'NS 处理异常';
                return ret;
            }
        } else {
            log.debug('未知单号', sourceNo)
            ret.code = 3;
            ret.data = null;
            ret.msg = 'unknown: ' + sourceNo;
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
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [po_id]
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: ['statusref']
        }).run().each(function (rec) {
            recStatus = rec.getValue('statusref');
        });

        if (recStatus == '1') {

        }
    }

    /**
     * 
     * @param {Number} po_id 采购订单ID
     * @param {Array} itemList 货品数组
     * @param {Number} location 地点ID
     */
    function createItemReceipt(po_id, itemList, location) {

        log.debug('交货单地点', location);
        log.debug('开始生成货品收据: ' + po_id, JSON.stringify(itemList));

        var cLimit = 3999,
            fItemArr = [];
        search.create({
            type: 'purchaseorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [po_id]
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
            columns: [
                "item",
                "quantity"
            ]
        }).run().each(function (rec) {
            var it = {
                itemId: rec.getValue('item'),
                itemName: rec.getText('item')
            }
            fItemArr.push(it)
            return --cLimit > 0;
        })

        var irArr = [];
        var getABox = tool.getAllBinBox(itemList);
        log.debug('库位 箱号 ', getABox);
        var binBoxObj = tool.SummaryBinBox(getABox);

        log.debug('库位箱号分组 ', binBoxObj);

        var boxObj = binBoxObj.BoxObj,
            binObj = binBoxObj.BinObj

        var BoxObjKey = Object.keys(boxObj);
        log.debug('箱号的值', BoxObjKey);
        var BinObjKey = Object.keys(binObj);
        log.debug('库位的值', BinObjKey);

        log.debug('库位 BinObjKey', BinObjKey);
        log.debug('箱号 BoxObjKey', BoxObjKey);

        if (BoxObjKey && BoxObjKey.length > 0) {

            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt'
            }); //转换为货品收据

            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 每个箱号履行

                var boxKey = BoxObjKey[i];
                var temp_obj = boxObj[boxKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    for (var i_t = 0, i_t_len = fItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = fItemArr[i_t];
                        log.debug('货品收据 fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('货品行号', lineNumber);

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        if (dl_sku.sku == fi_temp.itemName) {
                            var getLoca = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                line: lineNumber
                            })
                            log.debug('地点 getLoca', getLoca);
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: dl_sku.shelvesQty,
                                line: lineNumber
                            }); // 设置数量

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_location_bin',
                                text: dl_sku.positionCode,
                                line: lineNumber
                            }); // 仓库编号

                            irObj.setSublistText({
                                sublistId: 'item',
                                fieldId: 'custcol_case_number',
                                text: boxKey,
                                line: lineNumber
                            }); // 箱号

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            }); // 设置为收货
                        } else {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: false,
                                line: lineNumber
                            }); // 设置为不收货
                        }
                    }
                }

            }
            var irObj_id = irObj.save();

            irArr.push(irObj_id);

            log.debug("货品收据 irObj_id", irObj_id);
        }

        if (BinObjKey && BinObjKey.length > 0) {
            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt'
            }); //转换为货品收据

            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 每个库位履行

                var binKey = BinObjKey[i];
                var temp_obj = binObj[binKey];

                log.debug('temp_obj', temp_obj);
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[j];

                    log.debug('dl_sku: ' + j, dl_sku)
                    for (var i_t = 0, i_t_len = fItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = fItemArr[i_t];
                        log.debug('货品收据 fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('货品行号', lineNumber);
                        if (lineNumber > -1) {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: location,
                                line: lineNumber
                            }); // 设置地点

                            if (dl_sku.sku == fi_temp.itemName) {
                                var getLoca = irObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'location',
                                    line: lineNumber
                                })
                                log.debug('地点 getLoca', getLoca);
                                irObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: dl_sku.shelvesQty,
                                    line: lineNumber
                                }); // 设置数量

                                irObj.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_location_bin',
                                    text: binKey,
                                    line: lineNumber
                                }); // 仓库编号

                                irObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemreceive',
                                    value: true,
                                    line: lineNumber
                                }); // 设置为收货
                            } else {
                                irObj.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemreceive',
                                    value: false,
                                    line: lineNumber
                                }); // 设置为不收货
                            }
                        }
                    }
                }
            }
            var irObj_id = irObj.save();
            irArr.push(irObj_id);
            log.debug("货品收据 irObj_id", irObj_id);
        }

        return irArr || false;
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
            filters: [{
                    name: 'custrecord_dps_wms_location',
                    operator: 'is',
                    values: warCode
                },
                {
                    name: 'subsidiary',
                    operator: 'anyof',
                    values: Subsidiary
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }
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

        var locObj = record.create({
            type: 'location'
        });
        locObj.setValue({
            fieldId: 'name',
            value: boxName
        });
        locObj.setValue({
            fieldId: 'parent',
            value: fLocation
        });
        locObj.setValue({
            fieldId: 'subsidiary',
            value: Subsidiary
        });
        locObj.setValue({
            fieldId: 'custrecord_dps_wms_location',
            value: boxName
        });
        locObj.setValue({
            fieldId: 'custrecord_dps_wms_location_name',
            value: boxName
        });
        locObj.setValue({
            fieldId: 'custrecord_wms_location_type',
            value: 3
        });
        search.create({
            type: 'location',
            filters: [{
                name: 'internalid',
                operator: 'is',
                values: fLocation
            }],
            columns: [{
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_parent_location'
                },
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_parent_location'
                }
            ]
        }).run().each(function (result) {
            var code = result.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_parent_location'
            });
            var name = result.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_parent_location'
            });
            if (code) {
                locObj.setValue({
                    fieldId: 'custrecord_dps_warehouse_code',
                    value: code
                });
            }
            if (name) {
                locObj.setValue({
                    fieldId: 'custrecord_dps_warehouse_name',
                    value: name
                });
            }
            return false;
        });
        var locObjId = locObj.save();
        var rec = record.load({
            type: 'location',
            id: locObjId
        });
        rec.setValue({
            fieldId: 'parent',
            value: fLocation
        });
        rec.save();
    }


    /**
     * 退货入库
     * @param {Object} context 
     */
    function returnInfo(context) {
        var limit = 3999;
        var ret_id;
        var sku = [];
        var sourceNo = context.sourceNo;
        search.create({
            type: 'returnauthorization',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                },
                // { name: 'poastext', operator: 'is', values: sourceNo }
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: sourceNo
                }
            ],
            columns: ['item', 'custcol_dps_trans_order_item_sku']
        }).run().each(function (rec) {
            ret_id = rec.id;
            var it = {
                itemId: rec.getValue('item'),
                itemName: rec.getText('item')
            }
            sku.push(it);
            return --limit > 0;
        });



        if (ret_id) { // 存在对应的退货授权记录
            // add 获取所有库位和箱号

            var detailList = context.detailList; // 入库明细

            var getBinArr = tool.getAllBinBox(detailList);
            var getArr = tool.judgmentBinBox('create', getBinArr);

            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retjson.code = 3;
                retjson.data = null;
                retjson.msg = 'unknown: ' + getArr;

                log.debug('不存在库位 : ', retjson);

                return retjson;
            }

            var objRecord = record.load({
                type: 'returnauthorization',
                id: ret_id
            });
            var detailList = context.detailList;
            for (var i = 0, length = detailList.length; i < length; i++) {
                var re_sku = detailList[i].sku;
                var receivedQty = detailList[i].receivedQty;
                var unreceivedQty = detailList[i].planQty - receivedQty

                var detailRecordList = detailList[i].detailRecordList;

                log.debug('上架明细 detailRecordList： ' + detailRecordList.length, detailRecordList)

                log.debug('sku[j] ' + sku.length, sku);
                for (var j = 0, len = sku.length; j < len; j++) {
                    var t_item = sku[j].itemName,
                        t_itemId = sku[j].itemId;
                    if (re_sku == t_item) {
                        var lin = objRecord.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: t_itemId
                        });
                        objRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_quantity_in_stock',
                            line: lin,
                            value: receivedQty
                        });
                        objRecord.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_unstocked_quantity',
                            line: lin,
                            value: unreceivedQty
                        });

                        log.debug("上架明细 ", detailRecordList.length);
                        // 上架明细, 设置库位和箱子信息
                        for (var de = 0, deLen = detailRecordList.length; de < deLen; de++) {
                            var temp = detailRecordList[de];

                            log.debug('temp 上架明细', temp);

                            log.debug('temp.positionCode', temp.positionCode);
                            log.debug('temp.type', temp.type);
                            log.debug('temp.barcode', temp.barcode);

                            log.debug('lin', lin);
                            if (temp.type == 1) {
                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_location_bin',
                                    text: temp.positionCode,
                                    line: lin
                                }); // 仓库编号

                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_case_number',
                                    text: temp.barcode,
                                    line: lin
                                }); // 箱号

                            } else {
                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_location_bin',
                                    text: temp.positionCode,
                                    line: lin
                                }); // 仓库编号
                            }
                        }
                    }
                }
            }
            objRecord.setValue({
                fieldId: 'orderstatus',
                value: 'B'
            });

            // return {
            //     code: 6,
            //     msg: '测试中'
            // }
            var objRecord_id = objRecord.save();
            var it = record.transform({
                fromType: 'returnauthorization',
                fromId: ret_id,
                toType: 'itemreceipt'
            });
            var itId = it.save();

            var retDate = {}
            if (objRecord_id && itId) {

                retDate.code = 0;
                retDate.data = {
                    msg: 'NS 处理成功'
                };
                retDate.msg = 'NS 处理成功';
            } else {
                retDate.code = 3;
                retDate.data = {
                    msg: 'NS 处理异常'
                };
                retDate.msg = 'NS 处理异常';
            }
        } else { // 不存在对应的退货授权记录
            retDate.code = 3;
            retDate.data = null;
            retDate.msg = 'unknown: 单号 ' + sourceNo;
        }

        return retDate;
    }


    return {
        post: _post,
    }
});