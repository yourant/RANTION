/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function _get(context) {

    }

    function _post(context) {

        // [
        //     {
        //       "aono": "aono202003",
        //       "boxNo": "1",
        //       "detailModels": [
        //         {
        //           "asin": "",
        //           "boxNo": "1",
        //           "fnsku": "",
        //           "msku": "",
        //           "productCode": "",
        //           "productImageUrl": "",
        //           "productTitle": "",
        //           "productType": 10,
        //           "qty": 1,
        //           "sku": "SKU0520"
        //         },
        //         {
        //           "asin": "",
        //           "boxNo": "1",
        //           "fnsku": "",
        //           "msku": "",
        //           "productCode": "",
        //           "productImageUrl": "",
        //           "productTitle": "",
        //           "productType": 10,
        //           "qty": 1,
        //           "sku": "SKU666"
        //         }
        //       ],
        //       "height": 20.00,
        //       "length": 10.00,
        //       "weight": 10.00,
        //       "width": 30.00
        //     }
        //   ]

        var data = context;

        log.audit('data', data);

        var retjson = {};

        var item_box = [];
        var aono, ord = [];

        try {

            // 用于标记当前发运记录是否发运完成, 默认 为 false
            var flag = false;
            for (var i = 0, len = data.length; i < len; i++) {
                var temp = data[i];
                var detailModels = temp.detailModels;

                var bigRec = searchTranRec(aono);

                var load_big_rec = record.load({
                    type: 'customrecord_dps_shipping_record',
                    id: bigRec
                });

                // 若存在分箱明细
                if (detailModels) {

                    


                    /*
                    if (temp.aono != aono) {
                        // 若调拨单号不一样, 搜索对应的发运记录
                        aono = temp.aono;
                        ord = searchRecord(aono);
                    }
                    for (var j = 0, l = detailModels.length; j < l; j++) {
                        var det_temp = detailModels[i];
                        for (var a = 0, t_l = ord.length; a < t_l; a++) {
                            var a_temp = ord[a];
                            if (det_temp.sku == a_temp.sku) {
                                item_box.push({
                                    itemid: a_temp[a].itemId,
                                    quantity: det_temp[j].qty,
                                    boxNo: det_temp[j].boxNo,
                                    height: temp.height,
                                    length: temp.length,
                                    weight: temp.weight,
                                    width: temp.width
                                });
                                if (a_temp.quantity != det_temp[j].qty) {
                                    flag = false;
                                }
                            }
                        }

                    }

                    var rec_id = ord[0].recId;
                    var objRecord = record.load({
                        type: 'customrecord_dps_shipping_record',
                        id: rec_id
                    });

                    var sub_id = 'recmachcustrecord_dps_ship_box_fa_record_link';
                    // 获取当前记录的装箱信息
                    var numLines = objRecord.getLineCount({
                        sublistId: sub_id
                    });

                    for (var z = 0, z_len = item_box.length; z < z_len; z++) {
                        var new_line = z;
                        if (numLines == -1) {
                            new_line = z;
                        } else {
                            new_line = z + numLines;
                        }

                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ship_box_item',
                            line: new_line,
                            value: item_box.itemid
                        });
                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ship_box_box_number',
                            line: new_line,
                            value: item_box.boxNo
                        });
                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ful_rec_box_length',
                            line: new_line,
                            value: item_box.length
                        });
                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ship_box_weight',
                            line: new_line,
                            value: item_box.weight
                        });
                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ful_rec_big_box_width',
                            line: new_line,
                            value: item_box.width
                        });
                        objRecord.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_ful_rec_big_box_hight',
                            line: new_line,
                            value: item_box.height
                        });
                    }

                    if (flag == false) {

                        objRecord.setValue({
                            fieldId: 'custrecord_dps_shipping_rec_status',
                            value: 13
                        });
                    } else {
                        objRecord.setValue({
                            fieldId: 'custrecord_dps_shipping_rec_status',
                            value: 12
                        });
                    }

                    */

                    var objRecord_id = objRecord.save();
                    log.audit('objRecord_id', objRecord_id);

                } else {
                    ord = searchRecord(aono);
                    // ord = JSON.parse(ord);
                    var rec_id = ord[0].recId;
                    var objRecord = record.load({
                        type: 'customrecord_dps_shipping_record',
                        id: rec_id
                    });

                    var sub_id = 'recmachcustrecord_dps_ship_box_fa_record_link';

                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ship_box_box_number',
                        line: 0,
                        value: temp.boxNo
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_box_length',
                        line: 0,
                        value: temp.length
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ship_box_weight',
                        line: 0,
                        value: temp.weight
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_big_box_width',
                        line: 0,
                        value: temp.width
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_big_box_hight',
                        line: 0,
                        value: temp.height
                    });

                    objRecord.setValue({
                        fieldId: 'custrecord_dps_shipping_rec_status',
                        value: 12
                    });

                    var objRecord_id = objRecord.save();

                    log.audit('objRecord_id', objRecord_id);
                }

            }

            retjson.code = 0;
            retjson.data = {
                msg: 'NS 处理成功'
            };
            retjson.msg = 'success';
        } catch (error) {

            log.error('error', error);
            retjson.code = 3;
            retjson.data = {
                msg: 'NS 处理失败, 请稍后重试'
            };
            retjson.msg = 'error';
        }

        // retjson.code = 0;
        // retjson.data = {};
        // retjson.msg = 'string';
        return JSON.stringify(retjson);
    }

    /**
     * 根据 调拨单号 搜索对应的发运记录, 获取相关的货品信息
     * @param {*} aono 
     */
    function searchRecord(aono) {

        var ord = [];
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'anyof',
                values: aono
            }],
            columns: [{
                    name: "custrecord_dps_ship_record_sku_item",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                },
                {
                    name: "custrecord_dps_shipping_record_item",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                },
                {
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                }
            ]
        }).run().each(function (rec) {
            var it = {
                recId: rec.id,
                sku: rec.getValue({
                    name: "custrecord_dps_ship_record_sku_item",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                }),
                itemId: rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                }),
                quantity: rec.getValue({
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: "CUSTRECORD_DPS_SHIPPING_RECORD_PARENTREC"
                })
            };

            ord.push(it);

            return true;
        });

        return ord;
    }


    /**
     * 搜索对应的调拨单
     * @param {*} aono 
     */
    function searchTranRec(aono) {

        var bigRec;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'anyof',
                values: aono
            }]
        }).run().each(function (rec) {

            bigRec = rec.id;
        });

        return bigRec || false;

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