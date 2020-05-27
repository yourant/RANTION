/*
 * @Author         : Li
 * @Date           : 2020-05-20 10:34:25
 * @LastEditTime   : 2020-05-22 16:59:42
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.record.feigt.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['../Helper/logistics_cost_calculation', 'N/search', 'N/record', 'N/log'], function (costCal, search, record, log) {

    function getInputData() {
        var limit = 3999,
            recArr = [];
        try {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                        name: 'custrecord_dps_ful_rec_cost_sharing',
                        operator: 'is',
                        values: false
                    },
                    {
                        name: 'custrecord_dps_shipping_rec_status',
                        operator: 'anyof',
                        values: [6, 7]
                    },
                    {
                        name: 'custrecord_dps_shipping_rec_transa_subje',
                        operator: 'anyof',
                        values: 5
                    }
                ]
            }).run().each(function (rec) {
                recArr.push(rec.id);
                return --limit > 0;
            });

        } catch (error) {
            log.error('搜索出错了', error);
        }

        log.audit('recArr length', recArr.length);

        return recArr;
    }

    function map(context) {
        var value = context.value;
        var limit = 3999,
            item_weight, total_weight = 0;

        // try {

        var item_info = [];
        var rec_country, serverID, cost;
        search.create({
            type: 'customrecord_dps_shipping_record_box',
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: value
            }],
            columns: [{
                    name: 'custrecord_dps_ful_rec_box_length',
                },
                {
                    name: 'custrecord_dps_ful_rec_big_box_width'
                },
                {
                    name: 'custrecord_dps_ful_rec_big_box_hight'
                },
                {
                    name: 'custrecord_dps_ship_box_weight'
                },
                // 国家简码
                {
                    name: 'custrecord_dps_shipping_rec_country_regi',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                },
                // 服务ID
                {
                    name: 'custrecord_dps_shipping_r_channelservice',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                },
                {
                    name: 'custrecord_dps_ship_box_item'
                },
                {
                    name: 'custitem_dps_weight',
                    join: 'custrecord_dps_ship_box_item'
                }, // 重量
                {
                    name: 'custitem_dps_heavy1',
                    join: 'custrecord_dps_ship_box_item'
                }, // 计费重
                {
                    name: 'weight',
                    join: 'custrecord_dps_ship_box_item'
                } // 货品重量
            ]
        }).run().each(function (rec) {
            rec_country = rec.getValue({
                name: 'custrecord_dps_shipping_rec_country_regi',
                join: 'custrecord_dps_ship_box_fa_record_link'
            });
            serverID = rec.getValue({
                name: 'custrecord_dps_shipping_r_channelservice',
                join: 'custrecord_dps_ship_box_fa_record_link'
            });

            var temp_w = rec.getValue({
                name: 'weight',
                join: 'custrecord_dps_ship_box_item'
            });
            temp_w = Number(temp_w);
            total_weight += temp_w;
            var it = {
                itemId: rec.getValue('custrecord_dps_ship_box_item'),
                length: rec.getValue('custrecord_dps_ful_rec_box_length'),
                width: rec.getValue('custrecord_dps_ful_rec_big_box_width'),
                hight: rec.getValue('custrecord_dps_ful_rec_big_box_hight'),
                box_weight: rec.getValue('custrecord_dps_ship_box_weight'),
                item_weight: temp_w
            }
            item_info.push(it);
            return --limit > 0;
        });

        log.debug('item_info', item_info);

        var b_l, b_w, b_h, box_weight;
        var len = item_info.length;
        for (var i = 0; i < len; i++) {
            log.debug('i', i);
            if (len == 1) {
                b_l = item_info[i].length;
                b_w = item_info[i].width;
                b_h = item_info[i].hight;
                box_weight = item_info[i].hight;
            } else {
                var l = item_info[i].length;
                var w = item_info[i].width;
                var h = item_info[i].hight;
                var box_w = item_info[i].box_weight
                for (var j = i + 1; j < len; j < len) {
                    l > item_info[j].length ? b_l = l : b_l = item_info[i].length;
                    w > item_info[j].width ? b_w = w : b_w = item_info[i].width;
                    h > item_info[j].hight ? b_h = h : b_h = item_info[i].hight;
                    box_w > item_info[j].hight ? box_weight = box_w : box_weight = item_info[i].hight;
                }
            }
        }

        try {
            log.debug('serverID, rec_country, box_weight, b_l, b_w, b_h', serverID + ": " + rec_country + ': ' + box_weight + ': ' + b_l + ': ' + b_w + ": " + b_h);
            cost = costCal.calculation(serverID, rec_country, '', box_weight, b_l, b_w, b_h);

        } catch (error) {
            log.error('费用分摊出错了', error);
        }

        if (cost) {
            var bigRec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: value
            });

            bigRec.setValue({
                fieldId: 'custrecord_dps_shipping_rec_estimatedfre',
                value: cost
            });

            bigRec.setValue({
                fieldId: 'custrecord_dps_ful_rec_cost_sharing',
                value: true
            });

            var subId = 'recmachcustrecord_dps_shipping_record_parentrec'
            for (var a = 0; a < len; a++) {
                var lineNumber = bigRec.findSublistLineWithValue({
                    sublistId: subId,
                    fieldId: 'custrecord_dps_shipping_record_item',
                    value: item_info[a].itemId
                });
                if (lineNumber > -1) {
                    bigRec.setSublistValue({
                        sublistId: subId,
                        fieldId: 'custrecord_dps_ful_rec_big_cost_sharing',
                        line: lineNumber,
                        value: (item_info[a].item_weight / total_weight) * cost
                    });
                }

            }

            var bigRec_id = bigRec.save();
            log.audit('bigRec_id', bigRec_id);
        }


    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});