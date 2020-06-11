/*
 * @Author         : Li
 * @Date           : 2020-05-18 12:00:00
 * @LastEditTime   : 2020-06-11 12:10:19
 * @LastEditors    : Li
 * @Description    : 调拨单 回传 NS, 回写信息至相关单据
 * @FilePath       : \Rantion\wms\rantion_wms_create_transfer_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function _get(context) {

    }

    function _post(context) {


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


        log.audit('context', context);
        var data = context;
        // for (var i = 0, len = date.length; i < len; i++) {

        var retjson = {};

        try {

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
                abno = temp.abno,
                storageList = temp.storageList;
            var aono_id = searchFulRec(aono);
            if (aono_id) {
                var l_rec = record.load({
                    type: 'customrecord_dps_shipping_record',
                    id: aono_id
                });

                var tranNo = l_rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号

                var subsidiary = l_rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                for (var i = 0, len = storageList.length; i < len; i++) {
                    // StorageResultNsDto {
                    //     barcode(string): 条码 装箱条码 / SKU,
                    //     positionCode(string): 库位编号,
                    //     qty(integer): 数量,
                    //     sku(string): SKU,
                    //     type(integer): 类型 1: 已装箱 2: 未装箱
                    // }

                    var temp = storageList[i];
                    var locationId = searchLocationCode(temp.positionCode, subsidiary)
                }

                l_rec.setValue({
                    fieldId: 'custrecord_dps_total_number',
                    value: boxQty
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_tran_abno',
                    value: abno
                });
                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_small_weight',
                    value: weight
                });

                var cn_no = searchLoadingInformation(containerNo);
                if (cn_no) {
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_rec_load_links',
                        value: cn_no
                    });

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
                    log.audit('更新装柜信息成功', l_con_id);
                }

                // 设置调拨单的状态

                if (status) {
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_rec_transfer_status',
                        value: status / 10
                    });
                }

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_rec_dono',
                    value: dono
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_rec_pickno',
                    value: pickno
                });


                l_rec.setValue({
                    fieldId: 'custrecord_dps_shipping_rec_status',
                    value: 6
                });

                var l_rec_id = l_rec.save();



                log.audit('发运记录更新完成', l_rec_id);

                retjson.code = 0;
                retjson.data = {
                    msg: 'NS 处理成功'
                };
                retjson.msg = 'success';
            }
        } catch (error) {

            retjson.code = 3;
            retjson.data = {
                msg: 'NS error'
            };
            retjson.msg = 'error';
        }

        // }




        return JSON.stringify(retjson);
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
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: aono
            }]
        }).run().each(function (rec) {
            ful_id = rec.id;
        });

        return ful_id || false;
    }



    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemfulfillment(rec, link, itemList, subsidiary) {


        var locationArr = [];
        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemfulfillment',
            // isDynamic: true,
        });

        objRecord.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });

        // StorageResultNsDto {
        //     barcode(string): 条码 装箱条码 / SKU,
        //     positionCode(string): 库位编号,
        //     qty(integer): 数量,
        //     sku(string): SKU,
        //     type(integer): 类型 1: 已装箱 2: 未装箱
        // }

        var len = itemList.length;
        for (var i = 0; i < len; i++) {
            var temp = itemList[i];
            var loId = searchLocationCode(locationCode, subsidiary);

            if (loId) {

            } else {

            }



        }

        var numLines = rec.getLineCount({
            sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link'
        });
        var item_ful = objRecord.getLineCount({
            sublistId: 'item'
        });

        log.audit('numLines: ' + numLines, 'item_ful: ' + item_ful);

        var line_num = [];
        for (var i = 0; i < numLines; i++) {

            var ful_item = rec.getSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_item',
                line: i,
            });

            log.debug('ful_item', ful_item);
            for (var j = 0; j < item_ful; j++) {
                var ful_quantity = 0;

                var obj_item = objRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: j,
                });

                log.debug('obj_item == ful_item', obj_item == ful_item);
                ful_quantity = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                    fieldId: 'custrecord_dps_ship_box_quantity',
                    line: i,
                });


                log.debug('obj_item', obj_item);
                if (obj_item == ful_item) {

                    log.debug('obj_item == ful_item', obj_item == ful_item);
                    ful_quantity = rec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                        fieldId: 'custrecord_dps_ship_box_quantity',
                        line: i,
                    });

                    ful_quantity += ful_quantity;
                    log.debug('ful_quantity', ful_quantity);

                    line_num.push(i);
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: j,
                        value: ful_quantity
                    });

                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: true,
                        line: j
                    });
                }
            }
        }
        var objRecord_id = objRecord.save();
        log.debug('objRecord_id', objRecord_id);
        var itemreceipt_id;

        var tranor_type = rec.getValue('custrecord_dps_ship_record_tranor_type');
        if (objRecord_id /* && tranor_type == 3 */ ) {
            itemreceipt_id = itemreceipt(link);
            log.debug('itemreceipt_id', itemreceipt_id);
        }

        var load_af_rec = record.load({
            type: rec.type,
            id: rec.id
        });

        for (var z = 0; z < line_num.length; z++) {
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_itemfulfillment',
                value: objRecord_id,
                line: line_num[z]
            });
            if (itemreceipt_id) {
                load_af_rec.setSublistValue({
                    sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                    fieldId: 'custrecord_dps_ship_box_itemreceipt',
                    value: itemreceipt_id,
                    line: line_num[z]
                });
            }
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_ship_ns',
                value: true,
                line: line_num[z]
            });
        }
        var load_af_rec_id = load_af_rec.save();
        log.debug('load_af_rec_id', load_af_rec_id);

        return
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
     * 根据仓库编号搜索NS对应的地点
     * @param {*} locationCode 
     * @param {*} subsidiary 
     */
    function searchLocationCode(locationCode, subsidiary) {

        var locationId;
        if (locationCode && subsidiary) {
            search.create({
                type: 'location',
                filters: [{
                        name: 'custrecord_dps_wms_location',
                        operator: 'is',
                        values: locationCode
                    },
                    {
                        name: 'subsidiary',
                        operator: 'anyof',
                        values: subsidiary
                    }
                ]
            }).run().each(function (rec) {
                locationId = rec.id;
            });
        }

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