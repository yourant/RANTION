/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-22 17:01:38
 * @LastEditTime   : 2020-07-22 16:38:49
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_package_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime', 'N/task', '../Helper/logistics_cost_calculation',
    'N/runtime'
], function (search, record, log, runtime, task, costCal, runtime) {

    function _post(context) {

        // [
        //     {
        //       "aono": "aono202003",
        //       "boxNo": "1",
        //       "detailModels": [ { "asin": "", "boxNo": "1", "fnsku": "", "msku": "", "productCode": "", "productImageUrl": "", "productTitle": "", "productType": 10, "qty": 1, "sku": "SKU0520" },
        //         { "asin": "", "boxNo": "1", "fnsku": "", "msku": "", "productCode": "", "productImageUrl": "", "productTitle": "", "productType": 10, "qty": 1, "sku": "SKU666" }
        //       ],
        //       "height": 20.00,
        //       "length": 10.00,
        //       "weight": 10.00,
        //       "width": 30.00
        //     }
        //   ]

        var a_start_time = new Date().getTime();
        log.audit("处理数据开始时间, Starts", new Date().toISOString());
        var data = context;

        log.audit('data typeof(): ' + typeof (data), data);

        var retjson = {},
            item_box = [],
            aono, ord = [];
        var scriptObj = runtime.getCurrentScript();

        try {
            log.audit('data length', data.length);

            var totalWeight = 0,
                serverID, rec_country, zip, tLocation, city;
            var rid = searchTranRec(data[0].aono);
            if (rid) {
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

                var objRecord = record.load({
                    type: 'customrecord_dps_shipping_record',
                    id: rid
                });

                var sub_id = 'recmachcustrecord_dps_ship_box_fa_record_link';
                var status = objRecord.getValue("custrecord_dps_shipping_rec_status");
                var numLines = objRecord.getLineCount({
                    sublistId: sub_id
                });

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

                for (var i = 0, len = data.length; i < len; i++) {
                    log.audit('存在明细: ' + i, detailModels);
                    var temp = data[i];
                    totalWeight += temp.weight;
                    var detailModels = temp.detailModels;
                    aono = temp.aono;

                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_box_length',
                        line: i,
                        value: temp.length
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ship_box_weight',
                        line: i,
                        value: temp.weight
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_big_box_width',
                        line: i,
                        value: temp.width
                    });
                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ful_rec_big_box_hight',
                        line: i,
                        value: temp.height
                    });

                    objRecord.setSublistValue({
                        sublistId: sub_id,
                        fieldId: 'custrecord_dps_ship_box_box_number',
                        line: i,
                        value: temp.boxNo
                    });

                    // 若存在分箱明细
                    if (detailModels) {

                        log.debug('detailModels.length', detailModels.length)
                        for (var j = 0, j_len = detailModels.length; j < j_len; j++) {

                            var a = i;
                            var arrTemp = detailModels[j];
                            if (numLines > -1) {
                                a += numLines;
                            }

                            objRecord.setSublistText({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_item',
                                line: i,
                                text: arrTemp.sku
                            });
                            objRecord.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_ship_box_quantity',
                                line: i,
                                value: arrTemp.qty
                            });
                        }
                    } else {
                        log.audit('不存在明细')
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
                    }
                }

                objRecord.setValue({
                    fieldId: 'custrecord_dps_total_number',
                    value: data.length
                });
                var objRecord_id = objRecord.save();
                log.audit('objRecord_id', objRecord_id);

                retjson.code = 0;
                retjson.data = null;
                retjson.msg = 'success';

                var cost = costCal.calculation(serverID, rec_country, zip, totalWeight, '', '', '', city, '', tLocation, '', '');
                log.audit("cost", cost);
                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: rid,
                    values: {
                        'custrecord_dps_shipping_rec_estimatedfre': cost
                    }
                });
                log.audit("执行总共使用量: " + scriptObj.getRemainingUsage());
            } else {
                log.error('找不到对应的发运记录', "找不到对应的发运记录");
                retjson.code = 3;
                retjson.data = null;
                retjson.msg = 'unknown ' + data[0].aono;
            }
        } catch (error) {
            log.error('error', error);
            retjson.code = 5;
            retjson.data = null;
            retjson.msg = 'error';
        }

        log.audit("处理时间, End", new Date().toISOString());
        var a_end_time = new Date().getTime();

        log.audit('处理数据总共耗时： ', (a_end_time - a_start_time) / 1000 + " s");
        return JSON.stringify(retjson);
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
                name: 'tranid',
                join: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: aono
            }]
        }).run().each(function (rec) {
            bigRec = rec.id;
        });

        return bigRec || false;

    }


    return {
        post: _post,
    }
});