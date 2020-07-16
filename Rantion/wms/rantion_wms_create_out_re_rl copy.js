/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-15 15:07:20
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_out_re_rl copy.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../common/request_record', '../Helper/tool.li'], function (record, search, requestRecord, tool) {


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
                }).run().each(function (rec) {
                    recId = rec.id;
                    redSo = rec.getValue('custrecord_dps_ship_small_salers_order');
                });
                if (redSo && recId) { // 存在对应的发运记录和关联的销售订单


                    var storageList = j_context.storageList;

                    log.debug('storageList length ', storageList);

                    var itemObj = tool.SummaryBinBox(storageList);

                    var boxObj = itemObj.BoxObj,
                        binObj = itemObj.BinObj;

                    log.debug('itemObj', itemObj);
                    var BoxObjKey = Object.keys(boxObj);
                    log.debug('箱号的值', BoxObjKey);
                    var BinObjKey = Object.keys(binObj);
                    log.debug('库位的值', BinObjKey);

                    var binType = "customlist_location_bin",
                        boxType = "customlist_case_number",
                        a_arr = [];

                    if (BoxObjKey && BoxObjKey.length > 0) {
                        for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) {
                            var s_a = tool.searchLocationBin(boxType, BoxObjKey[i]);
                            if (!s_a) {
                                a_arr.push("箱号" + BinObjKey[i]);
                            }
                        }
                    }

                    if (BinObjKey && BinObjKey.length > 0) {
                        for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) {
                            var s_a = tool.searchLocationBin(binType, BinObjKey[i]);
                            if (!s_a) {
                                a_arr.push("库位：" + BinObjKey[i]);
                            }
                        }
                    }

                    if (a_arr && a_arr.length > 0) { // 出货的库位或者箱号处在不存在, 返回报错信息
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'unknown: ' + a_arr;

                        log.debug('不存在库位 : aono: ' + aono, retjson);

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
                        requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "outMaster");
                    } catch (error) {

                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'error';
                        requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "outMaster");
                    }
                }
            }

            if (sourceType == 20) { // 采购退货
                //  获取对应退货授权单
                var sourceNo = j_context.sourceNo;
                var v_id = sourceNo.split('-')[0];
                var w_code = sourceNo.split('-')[1];
                //  获取对应供应商退货审批单
                var v_record = record.load({
                    id: v_id,
                    type: 'vendorreturnauthorization'
                });
                var item_count = v_record.getLineCount({
                    sublistId: 'item'
                });
                //  出库成功
                if (j_context.delivery) {
                    //  根据来源单号后的物理仓库与退货单行上对应location匹配出原退货授权单中的ns_item        
                    var item_wms = [];
                    for (var i = 0; i < item_count; i++) {
                        //  获取item的NS location
                        var ns_location = v_record.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            line: i
                        });
                        //  获取ns location对应记录的wms location
                        var wms_location;
                        search.create({
                            type: 'location',
                            filters: [{
                                name: 'internalid',
                                operator: 'is',
                                values: ns_location
                            }],
                            columns: ['custrecord_dps_wms_location'],
                        }).run().each(function (res) {
                            wms_location = res.getValue('custrecord_dps_wms_location');
                        });
                        if (w_code == wms_location) {
                            item_wms.push(i);
                        }
                    }
                    //获取退货授权单交易主体
                    var subsidiary = v_record.getValue('subsidiary');
                    //根据交易主体与回传地点获取对应location
                    var storageList = j_context.storageList;
                    var locations = [];
                    storageList.forEach(function (item) {
                        //根据装箱类型获取WMS仓库编码
                        var custrecord_dps_wms_location = item.type == 1 ? item.barcode : item.positionCode;
                        search.create({
                            type: 'location',
                            filters: [{
                                    name: 'subsidiary',
                                    operator: 'is',
                                    values: subsidiary
                                },
                                {
                                    name: 'custrecord_dps_wms_location',
                                    operator: 'is',
                                    values: custrecord_dps_wms_location
                                }
                            ],
                        }).run().each(function (res) {
                            locations.push({
                                item: item,
                                location: res.id
                            });
                        });
                    });
                    //根据location合并item
                    var _locations = [];
                    locations.forEach(function (item) {
                        if (typeof (_locations[item.location]) == 'undefined') {
                            _locations[item.location] = [];
                        }
                        _locations[item.location].push(item.item);
                    });

                    //根据合并后得loction转换对应得出库单
                    var ifm_record = [];
                    for (var _location in _locations) {
                        var ifm_record_item = record.transform({
                            fromType: 'vendorreturnauthorization',
                            fromId: Number(v_id),
                            toType: 'itemfulfillment'
                        });
                        //将转换出库单中所有提交项设置为false
                        for (var i = 0; i < item_count; i++) {
                            ifm_record_item.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                line: i,
                                value: false
                            });
                        }
                        //将出库单中的所有出库地点设置成子项地点
                        for (var i = 0; i < item_count; i++) {
                            ifm_record_item.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                line: i,
                                value: _location
                            });
                        }
                        ifm_record.push({
                            record: ifm_record_item,
                            location: _location
                        });
                    }
                    //设置货品实施单的提交项并提交保存
                    ifm_record.forEach(function (item_ifm_record) {
                        for (var i = 0; i < item_count; i++) {
                            //限定提交项属于改物理仓库
                            if (item_wms.indexOf(i) > -1) {
                                //获取该行的sku
                                var sku = item_ifm_record.record.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });
                                var itemid;
                                search.create({
                                    type: 'item',
                                    filters: [{
                                        name: 'internalid',
                                        operator: 'is',
                                        values: sku
                                    }],
                                    columns: ['itemid']
                                }).run().each(function (res) {
                                    itemid = res.getValue('itemid');
                                });
                                var items = _locations[item_ifm_record.location];
                                items.forEach(function (item) {
                                    if (item.sku == itemid) {
                                        //设置提交项
                                        item_ifm_record.record.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'itemreceive',
                                            line: i,
                                            value: true
                                        });
                                        item_ifm_record.record.setSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'quantity',
                                            line: i,
                                            value: Number(item.qty)
                                        });
                                    }
                                });
                            }
                        }
                        item_ifm_record.record.save();
                    });
                    var v_re = record.load({
                        id: v_id,
                        type: 'vendorreturnauthorization'
                    });
                    v_re.setValue({
                        fieldId: 'custbody_po_return_status',
                        value: 3
                    });
                    v_re.save();
                }
                //出库失败
                else {
                    for (var i = 0; i < item_count; i++) {
                        //获取item的NS location
                        var ns_location = v_record.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            line: i
                        });
                        //获取ns location对应记录的wms location
                        var wms_location;
                        search.create({
                            type: 'location',
                            filters: [{
                                name: 'internalid',
                                operator: 'is',
                                values: ns_location
                            }],
                            columns: ['custrecord_dps_wms_location']
                        }).run().each(function (res) {
                            wms_location = res.getValue('custrecord_dps_wms_location');
                        });
                        if (w_code == wms_location) {
                            //设置备注
                            v_record.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                line: i,
                                value: '库存异常'
                            });
                        }
                    }
                    v_record.save();
                }
                retjson.msg = '操作成功';
                requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "outMaster");
            }
        }
        return JSON.stringify(retjson);
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
        }).run().each(function (rec) {
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

        itemList.forEach(function (item) {

            for (var i = 0, iLen = itemArr.length; i < iLen; i++) {
                var i_temp = itemArr[i];
                if (i_temp.itemName == item.sku) {
                    var lin = f.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: i_temp.itemId
                    });
                    f.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        text: item.positionCode,
                        line: lin
                    }); // 仓库编号

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
                        objRecord.setSublistText({
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


    return {
        post: _post,
    }

});