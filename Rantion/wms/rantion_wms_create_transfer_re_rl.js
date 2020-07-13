/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log', '../common/request_record'],
function (search, record, log, requestRecord) {

    function _get(context) {

    }

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

        // try {
        //     data = JSON.parse(context.requestBody);
        // } catch (error) {
        //     data = context.requestBody;
        //     log.audit('尝试转换为 JSON 对象出错', error);
        // }
        // var data = context.requestBody;
        // for (var i = 0, len = date.length; i < len; i++) {

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
                var aono_id = searchFulRec(aono);

                var val = {};
                if (aono_id) {
                    var l_rec = record.load({ type: 'customrecord_dps_shipping_record', id: aono_id });
                    l_rec.setValue({ fieldId: 'custrecord_dps_total_number', value: boxQty });
                    val.custrecord_dps_total_number = boxQty;
                    l_rec.setValue({ fieldId: 'custrecord_dps_ship_tran_abno', value: abno });
                    val.custrecord_dps_ship_tran_abno = abno;
                    l_rec.setValue({ fieldId: 'custrecord_dps_ship_small_weight', value: weight });
                    val.custrecord_dps_ship_small_weight = weight;
                    var tranNO = l_rec.getValue('custrecord_dps_shipping_rec_order_num');
                    var LoId, positionCode;
                    for (var i = 0, len = storageList.length; i < len; i++) {
                        if (storageList[i].type == 1) {
                            positionCode = storageList[i].barcode;
                        } else {
                            positionCode = storageList[i].positionCode;
                        }
                        LoId = searchLocationCode(positionCode, aono_id); // 只能修改一次,不可修改多次,履行多次出错
                        if (LoId) {
                            break;
                        }
                    }

                    if (LoId) {
                        var transferorderId = record.submitFields({
                            type: 'transferorder',
                            id: tranNO,
                            values: {
                                location: LoId
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    } else {
                        log.debug('调拨单回传处理出错了', 'NS找不到对应的库位' + positionCode);
                        retjson.code = 3;
                        retjson.data = null;
                        retjson.msg = 'error';
                        return JSON.stringify(retjson);
                    }

                    var cn_no = searchLoadingInformation(containerNo);
                    if (cn_no) {
                        l_rec.setValue({ fieldId: 'custrecord_dps_ship_rec_load_links', value: cn_no });
                        val.custrecord_dps_ship_rec_load_links = cn_no;

                        var l_con = record.load({ type: 'customrecord_dps_cabinet_record', id: cn_no });
                        var conVolume = l_con.getValue("custrecord_dps_cabinet_rec_volume");
                        l_con.setValue({ fieldId: 'custrecord_dps_cabinet_rec_remai_volume', value: Number(conVolume) - Number(volume) });
                        l_con.save();
                    }

                    // 设置调拨单的状态
                    if (status) {
                        l_rec.setValue({ fieldId: 'custrecord_dps_ship_rec_transfer_status', value: status / 10 });
                        val.custrecord_dps_ship_rec_transfer_status = status / 10;
                    }
                    l_rec.setValue({ fieldId: 'custrecord_dps_ship_rec_dono', value: dono });
                    val.custrecord_dps_ship_rec_dono = dono;

                    l_rec.setValue({ fieldId: 'custrecord_dps_ship_rec_pickno', value: pickno });
                    val.custrecord_dps_ship_rec_pickno = pickno;
                    l_rec.setValue({ fieldId: 'custrecord_dps_shipping_rec_status', value: 6 });
                    val.custrecord_dps_shipping_rec_status = 6;
                    itemfulfillment(l_rec, tranNO, storageList);
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
                }
            }
        } catch (error) {
            log.debug('调拨单回传处理出错 error', error);
            retjson.code = 3;
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

        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemfulfillment',
            // isDynamic: true,
        });

        var poItem = [],
            limit = 3999,
            itendup;

        search.create({
            type: 'transferorder',
            filters: [
                { name: 'internalid', operator: 'anyof', values: link },
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false },
            ],
            columns: [ 'item', 'quantity' ]
        }).run().each(function (rec) {
            for (var i = 0, leni = itemList.length; i < leni; i++) {
                var a = itemList[i],
                    asku = a.sku;
                if (asku == rec.getText('item') && rec.getValue('quantity') > 0) {
                    var it = {
                        itemId: rec.getValue('item'),
                        itemName: rec.getText('item'),
                        qty: a.qty
                    }
                    poItem.push(it);
                }
            }
            return --limit > 0;
        });
        objRecord.setValue({ fieldId: 'shipstatus', value: 'C' });
        var item_ful = objRecord.getLineCount({ sublistId: 'item' });
        for (var i = 0; i < item_ful; i++) {
            var totalQty = 0;
            var treItem = objRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i, }); //  获取货品ID
            for (var j = 0, len = poItem.length; j < len; j++) {
                var a = poItem[j];
                if (treItem == a.itemId) {
                    var qty = a.qty;
                    totalQty += qty;
                }
            }
            if (totalQty > 0) {
                objRecord.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: totalQty });
                objRecord.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: true, line: i });
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
     * @param {*} containerNo 
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
     * @param {*} aono 
     */
    function searchFulRec(aono) {
        var ful_id;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [
                { name: 'custrecord_dps_shipping_rec_order_num', operator: 'is', values: aono }
            ]
        }).run().each(function (rec) {
            ful_id = rec.id;
        });
        return ful_id || false;
    }

    /**
     * 根据仓库编号搜索对应的地点
     * @param {*} LoCode 
     */
    function searchLocationCode(LoCode, recId) {
        var locationId;
        var subsidiaryId;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [
                { name: 'internalid', operator: 'anyof', values: recId }
            ],
            columns: [ 'custrecord_dps_shipping_rec_transa_subje' ]
        }).run().each(function (rec) {
            subsidiaryId = rec.getValue('custrecord_dps_shipping_rec_transa_subje');
        });
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_wms_location', operator: 'startswith', values: LoCode },
                { name: 'subsidiary', operator: 'anyof', values: subsidiaryId },
                { name: 'isinactive', operator: 'is', values: false }
            ]
        }).run().each(function (rec) {
            locationId = rec.id;
        });
        return locationId || false;
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