/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-28 16:40:42
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_transfer_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log', '../common/request_record',
    '../Helper/tool.li'
], function (search, record, log, requestRecord, tool) {


    function _post(context) {


        // AllocationMasterResultNsDto {
        //     abno(string, optional): 调拨批次号,
        //     aono(string, optional): 调拨单号,
        //     boxQty(integer, optional): 箱数,
        //     containerNo(string, optional): 货柜号,
        //     delivery(boolean, optional),
        //     deliveryTime(string, optional): 发货时间,
        //     skuList(Array[string], optional): 发运失败时SKU集合,
        //     storageList(Array[StorageResultNsDto], optional): 发货SKU库存明细,
        //     volume(number, optional): 体积,
        //     weight(number, optional): 发货包裹重量
        // }
        // StorageResultNsDto {
        //     barcode(string): 条码 装箱条码 / SKU,
        //     positionCode(string): 库位编号,
        //     qty(integer): 数量,
        //     sku(string): SKU,
        //     type(integer): 类型 1: 已装箱 2: 未装箱
        // }


        // {
        //     "deliveryTime": "2020-06-01 19:01:44",
        //     "abno": "AB200601000002",
        //     "aono": "103411",
        //     "containerNo": "123",
        //     "boxQty": 1,
        //     "volume": 1000.00,
        //     "weight": 321.00,
        //     "storageList": [{
        //         "sku": "1101",
        //         "type": 2,
        //         "barcode": "1101",
        //         "positionCode": "AAAD6610101",
        //         "qty": 1
        //     }],
        //     "delivery": true
        // }


        log.debug('context', context);
        var data = context.requestBody;

        var retjson = {};

        try {
            var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "transfer");
            if (requestRecordInfo) {
                retjson.code = 1;
                retjson.data = null;
                retjson.msg = 'failure:WMS 请求重复处理';
            } else {
                var temp = data;
                var containerNo = temp.containerNo,
                    boxQty = temp.boxQty,
                    aono = temp.aono,
                    deliveryTime = temp.deliveryTime,
                    dono = temp.dono,
                    pickno = temp.pickno,
                    status = temp.status,
                    volume = temp.volume,
                    weight = temp.weight,
                    storageList = temp.storageList,
                    abno = temp.abno;
                var aono_id = searchFulRec(aono); // 查找对应的调拨单

                var val = {};
                if (aono_id) { // 存在对应的调拨单

                    // tool.wmsRetInfo(aono_id, data, "调拨单-发运记录", "调拨单回传");

                    // 找到调拨单号, 查找对应的库位和箱信息
                    var itemObj = SummaryBinBox(storageList);

                    var boxObj = itemObj.BoxObj,
                        binObj = itemObj.BinObj;

                    var BoxObjKey = Object.keys(boxObj);
                    log.debug('箱号的值', BoxObjKey);
                    var BinObjKey = Object.keys(binObj);
                    log.debug('库位的值', BinObjKey);

                    var a = 0,
                        binType = "customlist_location_bin",
                        boxType = "customlist_case_number",
                        a_arr = [];

                    if (BoxObjKey && BoxObjKey.length > 0) {
                        for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) {
                            var s_a = searchLocationBin(boxType, BoxObjKey[i]);
                            a += iLen;
                            if (!s_a) {
                                a_arr.push("箱号：" + BoxObjKey[i]);
                            }
                        }
                    }

                    if (BinObjKey && BinObjKey.length > 0) {
                        for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) {
                            var s_a = searchLocationBin(binType, BinObjKey[i]);
                            if (!s_a) {
                                a_arr.push("库位：" + BinObjKey[i]);
                            }
                            a += iLen;
                        }
                    }

                    if (a_arr && a_arr.length > 0) {
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'unknown: ' + a_arr;

                        log.debug('retjson: aono: ' + aono, retjson);

                        return retjson;
                    }

                    var l_rec = record.load({
                        type: 'customrecord_dps_shipping_record',
                        id: aono_id
                    });
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_total_number',
                        value: boxQty
                    });
                    val.custrecord_dps_total_number = boxQty;
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_tran_abno',
                        value: abno
                    });
                    val.custrecord_dps_ship_tran_abno = abno;
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_small_weight',
                        value: weight
                    });
                    val.custrecord_dps_ship_small_weight = weight;
                    var tranNO = l_rec.getValue('custrecord_dps_shipping_rec_order_num');
                    var LoId, positionCode;


                    if (containerNo) {
                        var cn_no = searchLoadingInformation(containerNo);
                        log.debug('装柜记录内部ID', cn_no);
                        if (cn_no) { // 存在对应的装柜记录, 更新装柜记录
                            l_rec.setValue({
                                fieldId: 'custrecord_dps_ship_rec_load_links',
                                value: cn_no
                            });
                            val.custrecord_dps_ship_rec_load_links = cn_no;

                            var conVolume = 0;
                            search.create({
                                type: 'customrecord_dps_cabinet_record',
                                filters: [{
                                    name: 'internalid',
                                    operator: 'anyof',
                                    values: cn_no
                                }],
                                columns: [
                                    "custrecord_dps_cabinet_rec_volume"
                                ]
                            }).run().each(function (rec) {
                                conVolume += Number(rec.getValue('custrecord_dps_cabinet_rec_volume'));
                            })

                            var l_con_id = record.submitFields({ // 改用 这种方式报错, 之前使用 load-save 方式报错 (记录已经被更改)
                                type: 'customrecord_dps_cabinet_record',
                                id: cn_no,
                                values: {
                                    custrecord_dps_cabinet_rec_remai_volume: Number(conVolume) - Number(volume)
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            /*
                            var l_con = record.load({
                                type: 'customrecord_dps_cabinet_record',
                                id: cn_no
                            });
                            var conVolume = l_con.getValue("custrecord_dps_cabinet_rec_volume");
                            l_con.setValue({
                                fieldId: 'custrecord_dps_cabinet_rec_remai_volume',
                                value: Number(conVolume) - Number(volume)
                            });
                            var l_con_id = l_con.save();
                            */

                            log.debug('更新装柜里成功', l_con_id);
                        }

                    }

                    // 设置调拨单的状态
                    if (status) {
                        l_rec.setValue({
                            fieldId: 'custrecord_dps_ship_rec_transfer_status',
                            value: status / 10
                        });
                        val.custrecord_dps_ship_rec_transfer_status = status / 10;
                    }
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_rec_dono',
                        value: dono
                    });
                    val.custrecord_dps_ship_rec_dono = dono;

                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_rec_pickno',
                        value: pickno
                    });
                    val.custrecord_dps_ship_rec_pickno = pickno;
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_shipping_rec_status',
                        value: 6
                    }); // 设置发运记录的状态 为 WMS 已发运
                    val.custrecord_dps_shipping_rec_status = 6;

                    // itemfulfillment(l_rec, tranNO, storageList);
                    var id = itemFulfillment(l_rec, tranNO, storageList);

                    // var l_rec_id = l_rec.save({
                    //     enableSourcing: true,
                    //     ignoreMandatoryFields: true
                    // });

                    /**
                     * 这里采用 submitFields 的方式保存, 之前采用 save 保存报错 (记录已经被更改)
                     */
                    var l_rec_id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: aono_id,
                        values: val,
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    })

                    log.audit('发运记录更新完成', l_rec_id);

                    retjson.code = 0;
                    retjson.data = null;
                    retjson.msg = 'success';
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "transfer");
                } else { // 找不到对应的调拨单
                    retjson.code = 3;
                    retjson.data = null;
                    retjson.msg = 'unknown: 找不到对应的调拨单 ' + aono;
                }
            }
        } catch (error) {
            log.debug('调拨单回传处理出错 error', error);
            retjson.code = 5;
            retjson.data = null;
            retjson.msg = 'error';
            requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "transfer");
        }
        return JSON.stringify(retjson);
    }


    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemfulfillment(rec, link, itemList) {

        // 转换单据为 货品履行
        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemfulfillment',
            // isDynamic: true,
        });

        var poItem = [],
            limit = 3999,
            itendup;

        // 搜索对应库存转移订单的货品信息
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: link
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
                },
            ],
            columns: ['item', 'quantity']
        }).run().each(function (rec) {
            for (var i = 0, leni = itemList.length; i < leni; i++) {
                var a = itemList[i],
                    asku = a.sku;
                if (asku == rec.getText('item') && rec.getValue('quantity') > 0) {
                    var it = {
                        itemId: rec.getValue('item'),
                        itemName: rec.getText('item'),
                        qty: a.qty,
                        type: a.type,
                        barcode: a.barcode,
                        positionCode: a.positionCode,
                    }
                    poItem.push(it);
                }
            }
            return --limit > 0;
        });
        objRecord.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });
        var item_ful = objRecord.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0, iLen = poItem.length; i < iLen; i++) {
            var a = poItem[i];
            for (var j = 0, jLen = item_ful.length; j < jLen; j++) {

            }
        }

        for (var i = 0; i < item_ful; i++) {
            var totalQty = 0;
            var treItem = objRecord.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i,
            }); //  获取货品ID
            for (var j = 0, len = poItem.length; j < len; j++) {
                var a = poItem[j];
                if (treItem == a.itemId) {
                    var qty = a.qty;
                    totalQty += qty;
                }
            }
            if (totalQty > 0) {
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: totalQty
                });
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: true,
                    line: i
                });

                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_location_bin',
                    value: true,
                    line: i
                });
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: true,
                    line: i
                });

                // custcol_location_bin  仓库库位
                // custcol_case_number  箱号
            }
        }
        var objRecord_id = objRecord.save();
        var itemreceipt_id;
        if (objRecord_id /* && tranor_type == 3 */ ) {
            itemreceipt_id = itemreceipt(link);
        }
        return itemreceipt_id || false;
    }
    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemFulfillment(rec, link, itemList) {

        var limit1 = 3999,
            limit2 = 3999;

        var toItemArr = [],
            toItemObj = {}

        search.create({
            type: 'transferorder',
            filters: [{
                    name: "internalid",
                    operator: 'anyof',
                    values: link
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: ["F"]
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: ["F"]
                }
            ],
            columns: [
                "item", "quantity"
            ]
        }).run().each(function (rec) {
            var qty = rec.getValue('quantity');
            if (qty > 0) {
                toItemObj[rec.getText('item')] = rec.getValue('item');
                var it = {
                    itemId: rec.getValue('item'),
                    itemName: rec.getText('item'),
                    qty: rec.getValue('quantity')
                }
                toItemArr.push(it)
            }
            return --limit1 > 0;
        });


        var itemObj = SummaryBinBox(itemList);

        var boxObj = itemObj.BoxObj,
            binObj = itemObj.BinObj;
        log.debug('库位 箱号 itemObj', itemObj);
        var BoxObjKey = Object.keys(boxObj);
        log.debug('箱号的值', BoxObjKey);
        var BinObjKey = Object.keys(binObj);
        log.debug('库位的值', BinObjKey);

        var itemreceipt_id;

        if (BoxObjKey && BoxObjKey.length > 0) {
            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) {
                var boxId = BoxObjKey[i];
                var boxList = boxObj[boxId];
                // 转换单据为 货品履行
                var objRecord = record.transform({
                    fromType: 'transferorder',
                    fromId: link,
                    toType: 'itemfulfillment',
                });

                objRecord.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                for (var j = 0, jLen = boxList.length; j < jLen; j++) {
                    var a_box_sku = boxList[j].sku,
                        a_box_pocode = boxList[j].positionCode,
                        a_box_qty = boxList[j].qty;
                    for (var z = 0, zLen = toItemArr.length; z < zLen; z++) {
                        var z_temp_name = toItemArr[z].itemName,
                            z_temp_itemId = toItemArr[z].itemId;


                        log.debug('z_temp_name', z_temp_name)
                        log.debug('a_box_sku', a_box_sku)
                        if (z_temp_name == a_box_sku) {

                            var lineNumber = objRecord.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: z_temp_itemId
                            });

                            if (lineNumber > -1) {
                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: a_box_qty,
                                    line: lineNumber
                                }); // 收货数量

                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_location_bin',
                                    text: a_box_pocode,
                                    line: lineNumber
                                }); // 仓库编号

                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_case_number',
                                    text: boxId,
                                    line: lineNumber
                                }); // 箱号

                            }

                        }
                    }
                }

                var objRecord_id = objRecord.save();
                if (objRecord_id) {
                    itemreceipt_id = itemreceipt(link);
                }
            }
        }

        if (BinObjKey && BinObjKey.length > 0) {
            for (var bin = 0, binLen = BinObjKey.length; bin < binLen; bin++) {
                var binId = BinObjKey[bin];
                var binList = binObj[binId];

                log.debug("库位对应的货品: " + BinObjKey[bin], binObj[binId])

                log.debug('库位列表 binList', binList);
                // 转换单据为 货品履行
                var objRecord = record.transform({
                    fromType: 'transferorder',
                    fromId: link,
                    toType: 'itemfulfillment',
                });

                objRecord.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                var saveFlag = false;

                for (var j = 0, jLen = binList.length; j < jLen; j++) {
                    var a_bin_sku = binList[j].sku,
                        a_bin_qty = binList[j].qty,
                        a_bin_pos = binList[j].positionCode;

                    for (var z = 0, zLen = toItemArr.length; z < zLen; z++) {
                        var z_temp_name = toItemArr[z].itemName,
                            z_temp_itemId = toItemArr[z].itemId;

                        log.debug('z_temp_name', z_temp_name)
                        log.debug('a_bin_sku', a_bin_sku)
                        if (z_temp_name == a_bin_sku) {
                            var lineNumber = objRecord.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: z_temp_itemId
                            });

                            log.debug('lineNumber: z_temp_itemId', lineNumber + "  " + z_temp_itemId)

                            if (lineNumber > -1) {
                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: a_bin_qty,
                                    line: lineNumber
                                }); // 收货数量

                                objRecord.setSublistText({
                                    sublistId: 'item',
                                    fieldId: 'custcol_location_bin',
                                    text: binId,
                                    line: lineNumber
                                }); // 仓库编号

                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'itemreceive',
                                    value: true,
                                    line: lineNumber
                                });

                                saveFlag = true;
                            }
                        }
                    }
                }

                log.debug('报错标记 saveFlag', saveFlag);
                var objRecord_id;
                objRecord_id = objRecord.save();

                log.debug('objRecord_id', objRecord_id);
                if (objRecord_id) {
                    itemreceipt_id = itemreceipt(link);
                }
            }
        }
        return itemreceipt_id || false;
    }


    /**
     * 处理出库货品数组, 根据 库位 和 箱号 进行分组
     * @param {Array} itemList 
     * @returns {Object} itemObj{BoxObj(箱号对象), BinObj(库位对象)}  || false
     */
    function SummaryBinBox(itemList) {

        var BinArr = [],
            BoxArr = [],
            sBinBox = [];

        itemList.forEach(function (item) {
            var type = item.type;
            if (type == 2) { // 未装箱, 从库位出
                BinArr.push(item)
            } else { // 已装箱, 从箱号出
                BoxArr.push(item)
            }
        });

        var BinObj = {},
            sunBinArr = [];
        // 同库位合并
        for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {

            var bin_temp = BinArr[i_bin];
            sunBinArr.push(bin_temp);
            for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {

                var j_bin_temp = BinArr[j_bin];
                if (bin_temp.positionCode == j_bin_temp.positionCode) {
                    sunBinArr.push(j_bin_temp);
                }
            }
            BinObj[bin_temp.positionCode] = sunBinArr;
        }

        var BoxObj = {},
            sunBoxArr = [];
        // 同箱号合并
        for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
            var box_temp = BoxArr[i_box];
            sunBoxArr.push(box_temp);
            for (var j_box = i_box + 1; j_box < binLen; j_box++) {

                var j_box_temp = BoxArr[j_box];
                if (box_temp.barcode == j_box_temp.barcode) {
                    sunBoxArr.push(j_box_temp);
                }
            }
            BoxObj[box_temp.barcode] = sunBoxArr;
        }

        var itemObj = {
            BoxObj: BoxObj,
            BinObj: BinObj
        }

        return itemObj || false;

    }



    /**
     * 接受库存转移单的货品
     * @param {*} rec 
     */
    function itemreceipt(link) {
        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemreceipt',
            // isDynamic: true,
        });
        var obj_id = objRecord.save();
        return obj_id || false;
    }


    /**
     * 根据柜号搜索对应的装柜记录
     * @param {Number} containerNo 
     * @returns {Number || Boolean} con_no (装柜记录ID) || false
     */
    function searchLoadingInformation(containerNo) {
        var con_no;
        search.create({
            type: 'customrecord_dps_cabinet_record',
            filters: [{
                name: 'custrecord_dps_cabinet_rec_no',
                operator: 'is',
                values: containerNo
            }]
        }).run().each(function (rec) {
            con_no = rec.id;
        });
        return con_no || false;
    }

    /**
     * 根据调拨单号, 获取对应的调拨单
     * @param {String} aono 
     */
    function searchFulRec(aono) {
        var ful_id;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'tranid',
                join: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: aono
            }]
        }).run().each(function (rec) {
            ful_id = rec.id;
        });
        return ful_id || false;
    }


    /**
     * 搜索库存对应的列表, 通过库存名称, 获取库位ID
     * @param {String} BinName  库位名称
     * @returns {Number || Boolean} BinId - 库位对应的内部ID  || false
     */
    function searchLocationBin(listType, BinName) {

        var BinId;
        search.create({
            type: listType,
            filters: [{
                name: 'name',
                operator: 'is',
                values: BinName
            }]
        }).run().each(function (rec) {
            BinId = rec.id
        });

        return BinId || false;
    }



    return {
        post: _post,
    }
});