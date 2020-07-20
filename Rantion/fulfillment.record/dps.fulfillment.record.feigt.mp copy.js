/*
 * @Author         : Li
 * @Date           : 2020-05-20 10:34:25
 * @LastEditTime   : 2020-06-05 13:48:27
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
                    }, //  已发运的才分摊运费
                    {
                        name: 'custrecord_dps_shipping_rec_transa_subje',
                        operator: 'anyof',
                        values: 5
                    }, // 子公司 蓝深贸易
                ]
            }).run().each(function (rec) {
                recArr.push(rec.id);
                return --limit > 0;
            });

        } catch (error) {
            log.error('搜索出错了', error);
        }

        log.debug('recArr', recArr);
        log.audit('recArr length', recArr.length);

        return recArr;
    }

    function map(context) {
        var value = context.value;
        log.debug('value', value);
        var limit = 3999,
            item_weight, total_weight = 0;

        // try {

        var item_info = [];
        var rec_country, serverID, cost = 0,
            location, city, estimatedfre, channel_dealer;

        try {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: value
                }],
                columns: [
                    'custrecord_dps_shipping_rec_estimatedfre', // 预估运费
                    'custrecord_dps_shipping_r_channel_dealer', // 渠道商 
                    'custrecord_dps_container_type', // 货柜类型
                    {
                        name: 'custrecord_aio_sender_city',
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 城市 仓库

                    'custrecord_dps_shipping_r_channelservice', // 渠道服务 ID
                    'custrecord_dps_shipping_rec_to_location', // 目的仓
                    'custrecord_dps_shipping_rec_country_regi', // 目标国家
                ]
            }).run().each(function (rec) {
                estimatedfre = rec.getValue('custrecord_dps_shipping_rec_estimatedfre');

                channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');

                rec_country = rec.getValue('custrecord_dps_shipping_rec_country_regi');
                serverID = rec.getValue('custrecord_dps_shipping_r_channelservice');

                city = rec.getValue({
                    name: 'custrecord_aio_sender_city',
                    join: 'custrecord_dps_shipping_rec_location'
                });

                location = rec.getValue('custrecord_dps_shipping_rec_to_location');

                return --limit > 0;
            });

            /**
             * 根据渠道服务、shipto信息及包裹信息，计算预估运费
             * @param {*} servicesId (小包、大货)渠道服务ID
             * @param {*} country (小包、大货)目标国家简码，例：'US'
             * @param {*} zip (小包)目标地区邮编
             * @param {*} weight (小包)包裹重量g
             * @param {*} long (小包)包裹长度cm
             * @param {*} wide (小包)包裹宽度cm
             * @param {*} high (小包)包裹高度cm
             * @param {*} city (大货)始发地
             * @param {*} departure (大货)始发港
             * @param {*} location (大货)仓库，大货目标仓库--亚马逊仓库
             * @param {*} destination (大货)目的港
             * @param {*} containerType (大货)装柜类型，20GP、40GP、40HQ、45HQ
             */
            // calculation(serverID, rec_country, '', '', '', '', '', city, departure, location, destination, containerType);

            log.debug('channel_dealer', channel_dealer);
            log.debug('estimatedfre', estimatedfre);
            if (channel_dealer == '捷士') {
                cost = estimatedfre; // 捷士 预估运费未手工输入
            } else {
                cost = costCal.calculation(serverID, rec_country, '', '', '', '', '', city, '', location, '', '');
            }
            log.debug('cost', cost);

            if (cost > 0) {
                log.debug('设置费用分摊', cost);
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

                search.create({
                    type: 'customrecord_dps_shipping_record_item',
                    filters: [{
                        name: 'custrecord_dps_shipping_record_parentrec',
                        operator: 'anyof',
                        values: value
                    }],
                    columns: [
                        'custrecord_dps_shipping_record_item', // 货品
                        {
                            name: 'custitem_dps_heavy1',
                            join: 'custrecord_dps_shipping_record_item'
                        }
                    ]
                }).run().each(function (rec) {

                    var it = {
                        itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                        heavy: rec.getValue({
                            name: 'custitem_dps_heavy1',
                            join: 'custrecord_dps_shipping_record_item'
                        })
                    }
                    item_info.push(it);
                });


                var subId = 'recmachcustrecord_dps_shipping_record_parentrec';
                for (var a = 0, len = item_info.length; a < len; a++) {
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
                            value: item_info[a].heavy * cost
                        });
                    }

                }

                var bigRec_id = bigRec.save();
                log.audit('bigRec_id', bigRec_id);
            }

        } catch (error) {
            log.error('费用分摊出错了', error);
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