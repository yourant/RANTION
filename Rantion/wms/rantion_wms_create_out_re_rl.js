/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-09-08 17:07:00
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\wms\rantion_wms_create_out_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../common/request_record', '../Helper/tool.li'], function(record, search, requestRecord, tool) {


    // OutMasterResultNsDto: {
    //     delivery(boolean, optional),
    //     deliveryTime(string, optional): 发货时间,
    //     skuList(Array[string], optional): 发运失败时SKU集合,
    //     sourceNo(string, optional): 来源单号,
    //     sourceType(integer, optional): 来源类型,
    //     storageList(Array[StorageResultNsDto], optional): 发货SKU库存明细,
    //     weight(number, optional): 发货包裹重量
    // }
    // StorageResultNsDto: {
    //     barcode(string): 条码 装箱条码 / SKU,
    //     positionCode(string): 库位编号,
    //     qty(integer): 数量,
    //     sku(string): SKU,
    //     type(integer): 类型 1: 已装箱 2: 未装箱
    // }


    function _post(context) {
        log.debug('context', JSON.stringify(context));
        var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "outMaster");
        var retjson = {};
        if (requestRecordInfo) {
            retjson.code = 1;
            retjson.data = null;
            retjson.msg = 'failure: WMS 请求重复处理'
        } else {
            var j_context = context.requestBody;
            retjson.code = 0;
            retjson.data = {};
            retjson.msg = 'string';
            var sourceType = j_context.sourceType;
            if (sourceType == 10) { // 销售订单
                var sourceNo = j_context.sourceNo;
                var weight = j_context.weight ? Number(j_context.weight) : 0;
                var recId, redSo;
                search.create({
                    type: 'customrecord_dps_shipping_small_record',
                    filters: [{
                        name: 'custrecord_dps_ship_order_number',
                        operator: 'startswith',
                        values: sourceNo
                    }],
                    columns: ['custrecord_dps_ship_small_salers_order']
                }).run().each(function(rec) {
                    recId = rec.id;
                    redSo = rec.getValue('custrecord_dps_ship_small_salers_order');
                });
                if (redSo && recId) { // 存在对应的发运记录和关联的销售订单


                    var storageList = j_context.storageList;

                    log.debug('storageList length ', storageList);

                    var getArr = tool.judgmentBinBox('search', storageList);

                    if (getArr && getArr.length > 0) { // 出货的库位或者箱号处在不存在, 返回报错信息
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'unknown: ' + getArr;

                        log.debug('不存在库位 : ', retjson);

                        return retjson;
                    }

                    try {

                        var creId = createItemFulfillment(redSo, storageList);
                        log.debug('creId', creId);

                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: recId,
                            values: {
                                custrecord_dps_ship_small_status: 6,
                                custrecord_dps_ship_small_wms_info: JSON.stringify(context.requestBody),
                                custrecord_dps_ship_small_real_weight: weight
                            }
                        });

                        retjson.code = 0;
                        retjson.data = null;
                        retjson.msg = 'success';
                        // requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "outMaster");
                    } catch (error) {

                        log.error('销售订单出库回传处理出错', error);
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'error';
                        // requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "outMaster");
                    }
                }
            }

            if (sourceType == 20) { // 采购退货
                //  获取对应退货授权单
                var sourceNo = j_context.sourceNo;
                var v_id = sourceNo.split('-')[0];
                var w_code = sourceNo.split('-')[1];

                //  出库成功
                if (j_context.delivery) {

                    var storageList = j_context.storageList;

                    log.debug('storageList length ', storageList);

                    var getArr = tool.judgmentBinBox('search', storageList);

                    if (getArr && getArr.length > 0) { // 出货的库位或者箱号处在不存在, 返回报错信息
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'unknown: ' + getArr;
                        log.debug('不存在库位 : ', retjson);

                        return retjson;
                    }


                    var vLimit = 3999,
                        vRecId,
                        vItemArr = [];
                    // 搜索对应的供应商退货授权的货品信息
                    search.create({
                        type: 'vendorreturnauthorization',
                        filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: v_id
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
                            'quantity'
                        ]
                    }).run().each(function(rec) {
                        vRecId = rec.id;
                        var it = {
                            itemId: rec.getValue('item'),
                            itemName: rec.getText('item')
                        };
                        vItemArr.push(it);
                        return --vLimit > 0;
                    });

                    if (vRecId) {
                        var ifm_record_item = record.transform({
                            fromType: 'vendorreturnauthorization',
                            fromId: vRecId,
                            toType: 'itemfulfillment'
                        });

                        storageList.map(function(stoItem) {
                            var sku = stoItem.sku,
                                positionCode = stoItem.positionCode,
                                barcode = stoItem.barcode,
                                qty = stoItem.qty,
                                type = stoItem.type;

                            for (var i = 0, iLen = vItemArr.length; i < iLen; i++) {
                                var v_temp = vItemArr[i];

                                log.debug('v_temp.itemName == sku', v_temp.itemName == sku);
                                if (v_temp.itemName == sku) {

                                    var linItem = ifm_record_item.findSublistLineWithValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: v_temp.itemId
                                    });

                                    log.debug('供应商退货授权 货品行号： ' + linItem, v_temp);
                                    ifm_record_item.setSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: linItem,
                                        value: qty
                                    });

                                    if (type == 1) {
                                        ifm_record_item.setSublistText({
                                            sublistId: 'item',
                                            fieldId: 'custcol_location_bin',
                                            text: positionCode,
                                            line: linItem
                                        }); // 仓库编号

                                        ifm_record_item.setSublistText({
                                            sublistId: 'item',
                                            fieldId: 'custcol_case_number',
                                            text: barcode,
                                            line: linItem
                                        }); // 箱号

                                    } else {
                                        ifm_record_item.setSublistText({
                                            sublistId: 'item',
                                            fieldId: 'custcol_location_bin',
                                            text: positionCode,
                                            line: linItem
                                        }); // 仓库编号
                                    }
                                }
                            }

                        });

                        // 保存货品履行单
                        var ifm_record_item_id;
                        ifm_record_item_id = ifm_record_item.save();
                        log.debug('ifm_record_item_id', ifm_record_item_id);

                        if (ifm_record_item_id) {

                            record.submitFields({
                                type: 'vendorreturnauthorization',
                                id: vRecId,
                                values: {
                                    custbody_po_return_status: 3
                                }
                            });

                            retjson.code = 0;
                            retjson.data = null;
                            retjson.msg = "NS 处理成功";
                        } else {
                            retjson.code = 5;
                            retjson.data = null;
                            retjson.msg = "NS 处理异常";
                        }

                    } else {
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'unknown: ' + sourceNo;
                    }

                }
                //出库失败
                else {
                    retjson.code = 2;
                    retjson.data = null;
                    retjson.msg = "传入的数据异常";
                }
                // retjson.msg = '操作成功';
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "outMaster");
            }

            if (sourceType == 40) {
                //创建库存调整
                var subsidiary_type, account_type, location_use, bill_id;
                search.create({
                    type: 'customrecord_sample_use_return',
                    filters: [
                        { name: 'name', operator: 'is', values: j_context.sourceNo }
                    ],
                    columns: [
                        'custrecord_subsidiary_type_1',
                        'custrecord_account_type1',
                        'custrecord_location_use_back'
                    ]
                }).run().each(function(rec) {
                    bill_id = rec.id;
                    subsidiary_type = rec.getValue('custrecord_subsidiary_type_1');
                    account_type = rec.getValue('custrecord_account_type1');
                    location_use = rec.getValue('custrecord_location_use_back');
                });
                var Inventory_adjustment = createInventoryadjustment(subsidiary_type, account_type, location_use, j_context.storageList);
                if (Inventory_adjustment) {
                    retjson.code = 0;
                    retjson.data = null;
                    retjson.msg = "NS 处理成功";

                    record.submitFields({
                        type: 'customrecord_sample_use_return',
                        id: bill_id,
                        values: {
                            custrecord_stauts_wms: 3,
                            custrecord_related_adjust_inventory: Inventory_adjustment
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
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "outMaster");
            }
        }
        return JSON.stringify(retjson);
    }


    /**
     * 创建库存调整
     *
     */
    function createInventoryadjustment(subsidiary_type, account_type, location_use, item_list) {
        var inventory_ord = record.create({ type: 'inventoryadjustment', isDynamic: true });
        inventory_ord.setValue({ fieldId: 'subsidiary', value: subsidiary_type });
        inventory_ord.setValue({ fieldId: 'account', value: account_type });
        inventory_ord.setValue({ fieldId: 'custbody_stock_use_type', value: 36 });

        item_list.map(function(lia) {
            inventory_ord.selectNewLine({ sublistId: 'inventory' });
            var item_id;
            search.create({
                type: 'item',
                filters: [
                    { name: 'itemid', operator: 'is', values: lia.sku }
                ]
            }).run().each(function(rec) {
                item_id = rec.id;
            });
            inventory_ord.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: item_id });
            inventory_ord.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: location_use });
            inventory_ord.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: lia.qty });

            inventory_ord.setCurrentSublistText({ sublistId: 'inventory', fieldId: 'custcol_location_bin', text: lia.positionCode });
            // 其他字段
            try {
                inventory_ord.commitLine({ sublistId: 'inventory' })
            } catch (err) {
                throw (
                    'Error inserting item line: ' +
                    lia.sku +
                    ', abort operation!' +
                    err
                );
            }
        });
        return inventory_ord.save();
    }


    /**
     * 创建货品履行
     * @param {Number} recId
     * @param {Array} itemList
     */
    function createItemFulfillment(recId, itemList) {

        var itemArr = [],
            limit = 3999;

        search.create({
            type: record.Type.SALES_ORDER,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recId
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
                'item',
                'quantity'
            ]
        }).run().each(function(rec) {
            var it = {
                itemId: rec.getValue('item'),
                itemName: rec.getText('item')
            }
            itemArr.push(it);

            return --limit > 0;
        });


        var f = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: recId
        });
        f.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });

        itemList.map(function(item) {

            log.debug('item', item);
            for (var i = 0, iLen = itemArr.length; i < iLen; i++) {
                var i_temp = itemArr[i];

                if (i_temp.itemName == item.sku) {

                    log.debug('i_temp.itemName', i_temp.itemName);
                    log.debug('item.sku', item.sku);
                    var lin = f.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: i_temp.itemId
                    });

                    log.debug('货品行号', lin);
                    f.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: item.qty,
                        line: lin
                    });

                    if (item.type == 1) {
                        f.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: item.positionCode,
                            line: lin
                        }); // 仓库编号

                        f.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_case_number',
                            text: item.barcode,
                            line: lin
                        }); // 箱号

                    } else {
                        f.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: item.positionCode,
                            line: lin
                        }); // 仓库编号
                    }
                }
            }
        })

        var f_id = f.save();

        log.debug('货品履行 f_id', f_id);

        if (f_id) {
            var invId = createInvoice(recId);
            log.debug('invId', invId);
        }


        return f_id || false;
    }

    /**
     * 创建发票
     * @param {Number} recId
     */
    function createInvoice(recId) {
        var inv = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.INVOICE,
            fromId: recId
        });
        var invId = inv.save();
        return invId || false;
    }


    var SO_STATUS = ["billed", "blosed", "partiallyFulfilled", "pendingApproval",
        "pendingBilling", "pendingBilling/partiallyFulfilled", "pendingFulfillment"]

        ["SalesOrd:G","SalesOrd:H","SalesOrd:D","SalesOrd:A","SalesOrd:F","SalesOrd:E","SalesOrd:B"]

    function searchSOStatus(_soId, _recordType) {
        var status;
        search.create({
            type: _recordType,
            filters: [
                { name: "internalid", operator: "anyof", values: _soId },
                { name: 'mainline', operator: 'is', values: true }
            ],
            columns: [
                "statusref"
            ]
        }).run().each(function(_re) {
            status = _re.getValue('statusref')
        });


        return status;

    }


    return {
        post: _post,
    }

});