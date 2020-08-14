/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-08-13 20:20:00
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
                    // re_id = returnSubsidiaryTransfer(context.requestBody);
                    // requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "putOn");
                    // return re_id;
                    var subsidiary_type, account_type, location_use, bill_id;
                    search.create({
                        type: 'customrecord_sample_use_return',
                        filters: [{
                            name: 'name',
                            operator: 'is',
                            values: context.requestBody.sourceNo
                        }],
                        columns: [
                            'custrecord_subsidiary_type_1',
                            'custrecord_account_type1',
                            'custrecord_location_use_back'
                        ]
                    }).run().each(function (rec) {
                        bill_id = rec.id;
                        subsidiary_type = rec.getValue('custrecord_subsidiary_type_1');
                        account_type = rec.getValue('custrecord_account_type1');
                        location_use = rec.getValue('custrecord_location_use_back');
                    });

                    re_id = createInventoryadjustment(subsidiary_type, account_type, location_use, context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(re_id), 1, "putOn");
                    if (re_id) {
                        retjson.code = 0;
                        retjson.data = null;
                        retjson.msg = "NS 处理成功";

                        record.submitFields({
                            type: 'customrecord_sample_use_return',
                            id: bill_id,
                            values: {
                                custrecord_stauts_wms: 3,
                                custrecord_related_adjust_inventory: re_id
                            }
                        });
                    } else {
                        retjson.code = 5;
                        retjson.data = null;
                        retjson.msg = "NS 处理异常";

                        record.submitFields({
                            type: 'customrecord_sample_use_return',
                            id: bill_id,
                            values: {
                                custrecord_stauts_wms: 4
                            }
                        });
                    }
                    return JSON.stringify(retjson);
                } else if (sourceType == 50) { // 渠道退件 小包
                    //小包
                    re_id = logisticsReturnItemReceipt(context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "putOn");
                    return re_id;
                } else if (sourceType == 60) { // 渠道退件 调拨
                    //大包
                    re_id = logisticsReturnTransfer(context.requestBody);
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "putOn");
                    return re_id;
                }
                retjson.code = 0;
                retjson.data = null;
                retjson.msg = 'success'
            } catch (error) {
                log.error('error', error);
                retjson.code = 5;
                retjson.data = null;
                retjson.msg = 'failure';
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "putOn");
            }
        }
        return JSON.stringify(retjson);
    }

    //库存归还
    function createInventoryadjustment(subsidiary_type, account_type, location_use, data) {
        var inventory_ord = record.create({
            type: 'inventoryadjustment',
            isDynamic: true
        });
        inventory_ord.setValue({
            fieldId: 'subsidiary',
            value: subsidiary_type
        });
        inventory_ord.setValue({
            fieldId: 'account',
            value: account_type
        });
        inventory_ord.setValue({
            fieldId: 'custbody_stock_use_type',
            value: 37
        });

        data.detailList.map(function (lia) {
            lia.detailRecordList.map(function (line) {
                inventory_ord.selectNewLine({
                    sublistId: 'inventory'
                });
                var item_id;
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'itemid',
                        operator: 'is',
                        values: line.sku
                    }]
                }).run().each(function (rec) {
                    item_id = rec.id;
                });
                inventory_ord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'item',
                    value: item_id
                });
                inventory_ord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'location',
                    value: location_use
                });
                inventory_ord.setCurrentSublistValue({
                    sublistId: 'inventory',
                    fieldId: 'adjustqtyby',
                    value: line.shelvesQty
                });
                inventory_ord.setCurrentSublistText({
                    sublistId: 'inventory',
                    fieldId: 'custcol_location_bin',
                    text: line.positionCode
                });
                // 其他字段
                try {
                    inventory_ord.commitLine({
                        sublistId: 'inventory'
                    })
                } catch (err) {
                    throw (
                        'Error inserting item line: ' +
                        lia.sku +
                        ', abort operation!' +
                        err
                    );
                }
            })
        });
        return inventory_ord.save();
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

        return retObj || false;

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
        var location;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: sourceNo
            }],
            columns: ['custrecord_transfer_order3', {
                name: 'transferlocation',
                join: 'custrecord_transfer_order3'
            }]
        }).run().each(function (result) {
            to_id = result.getValue('custrecord_transfer_order3');
            location = rec.getValue({
                name: 'transferlocation',
                join: 'custrecord_transfer_order3'
            })
            return false;
        });


        if (!to_id) {
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'tranid',
                    operator: 'is',
                    values: context.sourceNo
                }],
                columns: [
                    "transferlocation", // 仓库
                ]
            }).run().each(function (rec) {
                to_id = rec.id;
                location = rec.getValue('transferlocation')
            });

        }
        if (to_id) {

            var detailList = context.detailList; // 入库明细
            log.debug('detailList', detailList);
            var getBinArr = tool.getAllBinBox(detailList); // 获取所有的库位和箱号信息
            log.audit('getBinArr', getBinArr);
            var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)
            log.audit('getArr', getArr);
            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retObj.code = 3;
                retObj.data = null;
                retObj.msg = 'unknown: ' + getArr;
                log.debug('不存在库位 : ', retObj);
                return retObj;
            }

            var itemGroup = tool.SummaryBinBox(getBinArr);

            log.audit('itemGroup', itemGroup);
            var boxObj = itemGroup.BoxObj,
                binObj = itemGroup.BinObj;

            var BoxObjKey = Object.keys(boxObj),
                BinObjKey = Object.keys(binObj);

            log.audit('BoxObjKey', BoxObjKey);
            log.audit('BinObjKey', BinObjKey);

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
                log.audit('temp_obj', temp_obj);
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    for (var i_t = 0, i_t_len = toItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = toItemArr[i_t];
                        log.debug('货品收据  box fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('box 货品行号', lineNumber);

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

                            log.audit("boxKey", boxKey);

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
                log.audit('bin temp_obj', temp_obj);
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[j];

                    log.debug('dl_sku', dl_sku);

                    for (var i_t = 0, i_t_len = toItemArr.length; i_t < i_t_len; i_t++) {
                        var fi_temp = toItemArr[i_t];
                        log.debug('货品收据  bin fi_temp: ' + i_t, fi_temp);
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fi_temp.itemId
                        });

                        log.debug('bin 货品行号', lineNumber);

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



            if (differQty && differQty.length > 0) {

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
                    location = rec.getValue('transferlocation');
                    subsidiary = rec.getValue('subsidiary');
                });

                differQty.map(function (diffQ) {
                    log.debug('diffQ', diffQ);

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
            }

            retObj.code = 0;
            retObj.data = null;
            retObj.msg = "NS 处理成功"

            return retObj;

        } else { // 不存在对应的第二段调拨单
            retObj.code = 3;
            retObj.data = null;
            retObj.msg = 'unknown: ' + sourceNo
        }

        return retObj || false;
    }


    /**
     * 大包退件入库
     * @param {Object} body 
     */
    function logisticsReturnTransfer(body) {

        var limit = 3999,
            shipping_id, to_id, from_location, to_location, subsidiary, retObj = {},
            sourceNo = body.sourceNo;

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
        }).run().each(function (rec) {
            shipping_id = rec.id;
            to_id = rec.getValue('custrecord_transfer_order3');
            from_location = rec.getValue({
                name: 'transferlocation',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            to_location = rec.getValue({
                name: 'custbody_actual_target_warehouse',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            subsidiary = rec.getValue({
                name: 'subsidiary',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
        });

        if (shipping_id) {

            var detailList = body.detailList; // 入库明细
            log.debug('detailList', detailList);
            var getBinArr = tool.getAllBinBox(detailList);
            var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retObj.code = 3;
                retObj.data = null;
                retObj.msg = 'unknown: ' + getArr;
                log.debug('不存在库位 : ', retjson);
                return retjson;
            }

            var transferorder = record.copy({
                type: record.Type.TRANSFER_ORDER,
                id: shipping_id,
                isDynamic: true
            }); // 复制调拨单

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

            var itemfulfillment = record.transform({
                fromType: record.Type.TRANSFER_ORDER,
                toType: "itemfulfillment",
                fromId: transferorderId,
            }); // 直接货品履行, 不需要考虑库位箱号

            var itemfulfillment_id = itemfulfillment.save();

            log.debug('itemfulfillment_id', itemfulfillment_id);

            var irArr = [];
            var binBoxObj = tool.SummaryBinBox(getBinArr);

            log.debug('库位箱号分组 ', binBoxObj);

            var boxObj = binBoxObj.BoxObj,
                binObj = binBoxObj.BinObj;

            var BoxObjKey = Object.keys(boxObj);
            log.debug('箱号的值', BoxObjKey);
            var BinObjKey = Object.keys(binObj);
            log.debug('库位的值', BinObjKey);

            log.debug('库位 BinObjKey', BinObjKey);
            log.debug('箱号 BoxObjKey', BoxObjKey);

            if (BoxObjKey && BoxObjKey.length > 0) { // 按箱号收货

                var irObj = record.transform({
                    fromType: 'transferorder',
                    fromId: transferorderId,
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

            if (BinObjKey && BinObjKey.length > 0) { // 按库位收货
                var irObj = record.transform({
                    fromType: 'transferorder',
                    fromId: transferorderId,
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

            log.debug('NS 处理成功', "NS 处理成功");
            retObj.code = 0;
            retObj.data = null;
            retObj.msg = 'NS 处理成功';

        } else {
            retObj.code = 3;
            retObj.data = null;
            retObj.msg = "unknown: " + sourceNo;
            log.debug('不存在对应的调拨单据', sourceNo);

            return retObj || false
        }

    }

    /**
     * 小包退件入库
     * @param {Object} body 
     */
    function logisticsReturnItemReceipt(body) {
        var sourceNo = body.sourceNo;

        var subsidiary, soId, recId, retObj = {};
        var custbody_dps_small_fulfillment_record;


        search.create({
            type: 'customrecord_dps_shipping_small_record',
            filters: [{
                name: 'custrecord_dps_ship_order_number',
                operator: 'is',
                values: sourceNo
            }],
            columns: [{
                    name: 'subsidiary',
                    join: 'custrecord_dps_ship_small_salers_order'
                },
                "custrecord_dps_ship_small_salers_order"
            ]
        }).run().each(function (rec) {
            subsidiary = rec.getValue({
                name: 'subsidiary',
                join: 'custrecord_dps_ship_small_salers_order'
            });
            soId = rec.getValue('custrecord_dps_ship_small_salers_order');
            recId = rec.id;
        });

        if (recId && soId) { // 发运记录和销售订单同时存在

            var detailList = body.detailList; // 入库明细
            log.debug('detailList', detailList);
            var getBinArr = tool.getAllBinBox(detailList);
            var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

            if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                retObj.code = 3;
                retObj.data = null;
                retObj.msg = 'unknown: ' + getArr;
                log.debug('不存在库位 : ', retObj);
                return retObj;
            }


            var returnauthorization = record.transform({
                fromType: 'salesorder',
                toType: record.Type.RETURN_AUTHORIZATION,
                fromId: soId,
            }); // 创建退货授权
            var returnauthorizationId = returnauthorization.save();
            log.debug('创建退货授权', returnauthorizationId);


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

            var fItemArr = tool.searchTransactionItemInfo("salesorder", soId);

            if (BoxObjKey && BoxObjKey.length > 0) {

                var irObj = record.transform({
                    fromType: record.Type.RETURN_AUTHORIZATION,
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: returnauthorizationId,
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
                    fromType: record.Type.RETURN_AUTHORIZATION,
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: returnauthorizationId,
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

            retObj.code = 0;
            retObj.data = null;
            retObj.msg = 'NS 处理成功';

            // 更改发运记录状态
            record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
                id: custbody_dps_small_fulfillment_record,
                values: {
                    custrecord_dps_ship_small_status: 23
                }
            });

        } else {
            retObj.code = 3;
            retObj.data = null;
            retObj.msg = 'unknown: 单号 ' + sourceNo
        }

        return retObj || false;

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
        var ret_id, wmsLocCode;
        search.create({
            type: 'customrecord_dps_delivery_order',
            filters: [{
                name: 'name',
                operator: 'is',
                values: sourceNo
            }],
            columns: [{
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dsp_delivery_order_location'
                }, // WMS仓库编码
            ]
        }).run().each(function (rec) {
            ret_id = rec.id;
            wmsLocCode = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dsp_delivery_order_location'
            })
        });


        // GC

        if (ret_id) {

            if (wmsLocCode == "GC") {

                var de_ord = [],
                    poNo, Loca,
                    limit = 3999;

                search.create({
                    type: 'customrecord_dps_delivery_order',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: ret_id
                    }],
                    columns: [{
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货货品
                        {
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货数量
                        "custrecord_dsp_delivery_order_location", // 地点
                        "custrecord_purchase_order_no", // 采购订单
                    ]
                }).run().each(function (r) {
                    poNo = r.getValue('custrecord_purchase_order_no');
                    Loca = r.getValue('custrecord_dsp_delivery_order_location');

                    var it = {
                        itemId: r.getValue({
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }),
                        qty: r.getValue({
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        })
                    }
                    de_ord.push(it);
                    return --limit > 0;
                });

                log.debug('地点', Loca);
                log.debug('采购订单', poNo);

                log.debug('de_ord', de_ord);
                if (poNo) {
                    var irObj = record.transform({
                        fromType: 'purchaseorder',
                        fromId: poNo,
                        toType: 'itemreceipt'
                    }); //转换为货品收据

                    var numLines = irObj.getLineCount({
                        sublistId: 'item'
                    });

                    for (var nu = 0; nu < numLines; nu++) {
                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: false,
                            line: nu
                        });
                    }


                    var irObj_id;
                    for (var i = 0, iLen = de_ord.length; i < iLen; i++) {
                        var temp = de_ord[i];
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: temp.itemId
                        });

                        log.debug('lineNumber', lineNumber);

                        if (lineNumber > -1) {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: temp.qty,
                                line: lineNumber
                            });
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: Loca,
                                line: lineNumber
                            });

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            });


                            var lo = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                // value: Loca,
                                line: lineNumber
                            });

                            log.debug('货品行地点', lo)

                        }
                    }

                    var irObj_id = irObj.save();

                    var dec_objRecord = record.load({
                        type: 'customrecord_dps_delivery_order',
                        id: ret_id
                    });
                    dec_objRecord.setValue({
                        fieldId: 'custrecord_delivery_order_status',
                        value: 4
                    });

                    var count = dec_objRecord.getLineCount({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });


                    if (context.detailList.length > 0) {
                        context.detailList.map(function (line) {
                            for (var i = 0; i < count; i++) {
                                var item_sku = dec_objRecord.getSublistText({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_item_sku',
                                    line: i
                                });
                                if (line.sku == item_sku) {
                                    dec_objRecord.setSublistValue({
                                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                        fieldId: 'custrecord_stock_quantity',
                                        value: line.planQty,
                                        line: i
                                    })
                                }
                            }
                        });
                    }


                    var dec_objRecord_id = dec_objRecord.save();
                    log.audit('dec_objRecord_id', dec_objRecord_id);

                    log.debug('工厂直发生成货品收据', irObj_id);

                    ret.code = 0;
                    ret.data = null;
                    ret.msg = 'NS 收货成功';
                    return ret;
                } else {

                    log.debug('交货单不存在对应的采购订单', "数据异常");
                    ret.code = 3;
                    ret.data = null;
                    ret.msg = 'unknown';
                    return ret;
                }

            } else {

                var detailList = context.detailList; // 入库明细
                log.debug('detailList', detailList);
                if (!detailList) {
                    log.debug('数据异常', "数据异常");
                    ret.code = 7;
                    ret.data = null;
                    ret.msg = '传入的数据异常';
                    return ret;
                }

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

                // objRecord.setValue({
                //     fieldId: 'custrecord_dps_warehousing_end',
                //     value: true
                // });

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
                                });
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

        log.audit('交货单地点', location);
        log.debug('开始生成货品收据: ' + po_id, JSON.stringify(itemList));

        var cLimit = 3999,
            fItemArr = [];
        var fiObj = {};
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
            fiObj[rec.getText('item')] = rec.getValue('item')
            fItemArr.push(it)
            return --cLimit > 0;
        })

        log.audit('采购订单的货品', fItemArr);

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
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 每个箱号履行

                var boxKey = BoxObjKey[i];
                var temp_obj = boxObj[boxKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

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
                        // }
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
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 每个库位履行

                var binKey = BinObjKey[i];
                var temp_obj = binObj[binKey];

                // log.debug('temp_obj', temp_obj);

                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[j];

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

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

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: true,
                            line: lineNumber
                        }); // 设置为收货

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
                retDate.data = null;
                retDate.msg = 'NS 处理成功';
            } else {
                retDate.code = 3;
                retDate.data = null;
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