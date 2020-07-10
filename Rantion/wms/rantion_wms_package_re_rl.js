/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-22 17:01:38
 * @LastEditTime   : 2020-07-10 11:05:23
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_package_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/task', '../Helper/logistics_cost_calculation'], function (search, record, log, runtime, task, costCal) {

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


        // WMS 装柜回传
        // {
        //     "containerNo": "123",
        //     "shippingType": 10,
        //     "sourceWarehouseCode": "gzhdc",
        //     "sourceWarehouseName": "gzhdc",
        //     "targetWarehouseCode": "TEST",
        //     "targetWarehouseName": "TEST",
        //     "containerVolume": 100,
        //     "createBy": "徐玉立"
        // }


        log.debug("测试数据开始时间, Starts", new Date().toISOString());
        var data = context;


        var fulRecArr = [];

        log.audit('data typeof(): ' + typeof (data), data);

        try {
            data = JSON.parse(data);
        } catch (error) {
            log.debug('转成对象 error', error);
            data = data;
        }

        var retjson = {};

        var item_box = [];
        var aono, ord = [];


        var scriptObj = runtime.getCurrentScript();

        try {

            log.debug('data length', data.length);


            // 用于标记当前发运记录是否发运完成, 默认 为 false
            var flag = false;
            var totalWeight = 0;
            // serverID = 'custrecord_dps_shipping_r_channelservice'
            // rec_country = 'custrecord_dps_recipient_country_dh';
            // zip = 'custrecord_dps_recipien_code_dh';
            // tLocation = 'custrecord_dps_shipping_rec_to_location';
            var serverID;
            var rec_country;
            var zip;
            var tLocation;
            var city;
            var rid = searchTranRec(data[0].aono);
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalId',
                    operator: 'anyof',
                    values: rid
                }, ],
                columns: [{
                        name: 'custrecord_dps_shipping_r_channelservice'
                    },
                    {
                        name: 'custrecord_cc_country_code',
                        join: 'custrecord_dps_recipient_country_dh'
                    },
                    {
                        name: 'custrecord_dps_recipien_code_dh'
                    },
                    {
                        name: 'custrecord_dps_shipping_rec_to_location'
                    },
                    {
                        name: 'custrecord_dps_recipient_city_dh'
                    }
                ]
            }).run().each(function (info) {
                serverID = info.getValue('custrecord_dps_shipping_r_channelservice');
                zip = info.getValue('custrecord_dps_recipien_code_dh');
                tLocation = info.getValue('custrecord_dps_shipping_rec_to_location');
                city = info.getValue('custrecord_dps_recipient_city_dh');
                rec_country = info.getValue({
                    name: 'custrecord_cc_country_code',
                    join: 'custrecord_dps_recipient_country_dh'
                });
            });
            log.audit("serverID rec_country city location", serverID + '-' + rec_country + '-' + city + '-' + tLocation);

            for (var i = 0, len = data.length; i < len; i++) {

                var temp = data[i];
                totalWeight += temp.weight;
                var detailModels = temp.detailModels;
                aono = temp.aono;
                var bigRec = searchTranRec(aono);

                var objRecord;
                if (bigRec) {
                    var objRecord = record.load({
                        type: 'customrecord_dps_shipping_record',
                        id: bigRec
                    });

                    fulRecArr.push(bigRec);

                    var sub_id = 'recmachcustrecord_dps_ship_box_fa_record_link';

                    var status = objRecord.getValue("custrecord_dps_shipping_rec_status");
                    var numLines = objRecord.getLineCount({
                        sublistId: sub_id
                    });
                    log.debug('objRecord', JSON.stringify(objRecord));
                    log.debug('发运记录装箱明细行数 status', numLines + '-' + status);
                    if (status != 14 && numLines > -1) {
                        var it = {

                            code: 1,
                            data: null,
                            msg: '非法操作'
                        }
                        log.debug('单据状态不是 已推送WMS, 直接返回', new Date().toISOString());
                        return it;
                    }

                    var boxNum = objRecord.getValue('custrecord_dps_total_number'),
                        addNum = 1;

                    var numLines = objRecord.getLineCount({
                        sublistId: sub_id
                    });

                    var add = 0;

                    log.debug('numLines', numLines);
                    // 若存在分箱明细
                    if (detailModels) {

                        log.debug('detailModels.length', detailModels.length)
                        for (var j = 0, j_len = detailModels.length; j < j_len; j++) {

                            // addNum++;

                            add++;

                            if (add > 10) {
                                break;
                            }
                            var a = j;
                            var arrTemp = detailModels[j];
                            // var itemID = searchItem(arrTemp.sku);

                            if (numLines > -1) {
                                a += numLines;
                            }

                            objRecord.setSublistText({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_item',
                                line: a,
                                text: arrTemp.sku
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_box_number',
                                line: a,
                                value: arrTemp.boxNo
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ful_rec_box_length',
                                line: a,
                                value: temp.length
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_weight',
                                line: a,
                                value: temp.weight
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ful_rec_big_box_width',
                                line: a,
                                value: temp.width
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ful_rec_big_box_hight',
                                line: a,
                                value: temp.height
                            });

                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_quantity',
                                line: a,
                                value: arrTemp.qty
                            });

                            log.debug("Remaining governance units: " + scriptObj.getRemainingUsage());
                        }

                        log.debug('Number(addNum) + Number(boxNum)', Number(addNum) + Number(boxNum));
                        objRecord.setValue({
                            fieldId: 'custrecord_dps_total_number',
                            value: Number(addNum) + Number(boxNum)
                        });
                        // 更改发运记录的状态为 WMS已装箱
                        // objRecord.setValue({
                        //     fieldId: 'custrecord_dps_shipping_rec_status',
                        //     value: 12
                        // });

                        var objRecord_id = objRecord.save();
                        log.audit('objRecord_id', objRecord_id);

                        // try {
                        //     log.debug('启用调度任务', "Starts");
                        //     submitMapReduceDeployment(bigRec);
                        // } catch (error) {
                        //     log.debug('启用调度任务失败', error);
                        // }

                        retjson.code = 0;
                        retjson.data = null;
                        retjson.msg = 'success';

                    } else {

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

                        // objRecord.setValue({
                        //     fieldId: 'custrecord_dps_shipping_rec_status',
                        //     value: 12
                        // });

                        var objRecord_id = objRecord.save();
                        log.audit('objRecord_id', objRecord_id);

                        retjson.code = 0;
                        retjson.data = null;
                        retjson.msg = 'success';
                    }

                } else {
                    ord.push({
                        aono: aono,
                        msg: 'NS 找不到对应的调拨单'
                    });
                    retjson.code = 5;
                    retjson.data = null;
                    retjson.msg = 'unknown';
                }

            }
            var cost = costCal.calculation(serverID, rec_country, zip, totalWeight, '', '', '', city, '', tLocation, '', '');
            log.audit("cost", cost);
            record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: rid,
                values: {
                    'custrecord_dps_shipping_rec_estimatedfre': cost
                }
            });
        } catch (error) {

            log.error('error', error);
            retjson.code = 3;
            retjson.data = null;
            retjson.msg = 'error';
        }

        // retjson.code = 0;
        // retjson.data = {};
        // retjson.msg = 'string';

        log.debug("测试数据开始时间, End", new Date().toISOString());

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


    /**
     * 搜索货品
     * @param {*} itemId 
     */
    function searchItem(itemId) {

        var item;
        search.create({
            type: 'item',
            filters: [{
                name: 'itemid',
                operator: 'is',
                values: itemId
            }]
        }).run().each(function (rec) {
            item = rec.id;
        });

        return item || false;
    }


    function Deduplication(arr) {
        var newArr = [],
            newData = [];
        var len = arr.length;
        for (var i = 0; i < len; i++) {
            var temp = arr[i];

            var aono_i = temp.aono;
            for (var j = i + 1; j < len; j++) {
                var aono_j = arr[j].aono;
                if (aono_i == aono_j) {
                    newData.push(arr[j]);
                }
            }

            newData.push(arr[i]);
            var it = {
                aono: arr[i].aono,
                data: newData
            }

            newArr.push(it);

        }

        return newArr || false;

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


/**
 * aono  作为KEY，其他作为数组返回一个obj
 * @param {*} data 
 */
function getDataObj(data) {
    var data_obj = {},
        data_arrays = [],
        newArr = [],
        f = true
    data.map(function (ob) {
        f = true
        for (var key in data_obj) {
            if (key == ob.aono) {
                f = false
                delete ob.aono;
                data_obj[key].push(ob)
            }
        }
        if (f) {
            data_arrays = []
            var ao = ob.aono
            delete ob.aono;
            data_arrays.push(ob)
            data_obj[ao] = data_arrays
        }
    });

    var keys1 = [];
    for (var p1 in data_obj) {
        if (data_obj.hasOwnProperty(p1))
            keys1.push(p1);
    }

    for (var ki = 0, len = keys1.length; ki < len; ki++) {
        var it = {
            key: keys1[ki],
            data: data_obj[keys1[ki]]
        };
        newArr.push(it);
    }
    return newArr;
    return data_obj
}