/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-06 11:55:51
 * @LastEditTime   : 2020-06-06 17:49:19
 * @LastEditors    : Li
 * @Description    : 装柜费用分摊 FBA
 * @FilePath       : \Rantion\fulfillment.record\dps.full.record.feigt.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function getInputData() {

        log.audit('getInputData', 'getInputData');
        var limit = 3999,
            cabinetArr = [];
        search.create({
            type: 'customrecord_dps_cabinet_record',
            filters: [{
                name: 'custrecord_dps_cabinet_cost_sharing',
                operator: 'is',
                values: false
            }],
            columns: [
                'custrecord_dps_cabinet_estimated_freight'
            ]
        }).run().each(function (rec) {
            var it = {
                key: rec.id,
                value: rec.getValue('custrecord_dps_cabinet_estimated_freight')
            };
            // it[rec.id] = rec.getValue('custrecord_dps_cabinet_estimated_freight');
            cabinetArr.push(it);
            return --limit > 0;
        });

        log.audit('cabinetArr length', cabinetArr.length);

        return cabinetArr;
    }

    function map(context) {

        log.audit('map', 'map');
        var value = JSON.parse(context.value),

            key = value.key,
            val = value.value;

        log.debug('key: val', +key + ' : ' + val);
        var limit = 3999,
            bigArr = [],
            itemTotal = 0,
            flag = false;

        // 1	未发运，等待获取物流单号      // 2	匹配物流失败，手动处理          // 3	已获取物流单号，等待发运
        // 4	获取物流信息失败            // 6	WMS已发运                     // 7	WMS已部分发运
        // 8	WMS发运失败                 // 9	未发运，等待获取Shipment      // 10	已获取Shipment号，等待装箱
        // 11	申请Shipment失败            // 12	WMS已装箱                    // 13	WMS已部分装箱
        // 14	已推送WMS                   // 15	已创建入库计划
        // 16	已创建入库件                // 17	已获取标签                    // 18	已更新入库件

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_ship_rec_load_links',
                operator: 'anyof',
                values: key
            }],
            columns: [
                'custrecord_dps_shipping_rec_status'
            ]
        }).run().each(function (rec) {

            var status = rec.getValue('custrecord_dps_shipping_rec_status');
            log.debug('status', status);

            if (status == 6) {
                flag = true;
            } else {
                flag = false;
            }

            bigArr.push(rec.id);

            return --limit > 0;
        });

        log.debug('bigArr', bigArr);
        log.audit('map flag', flag);
        if (flag == true) {
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_ship_rec_load_links',
                    join: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: key
                }],
                columns: [{
                    name: 'custitem_dps_heavy1',
                    join: 'custrecord_dps_shipping_record_item'
                }]
            }).run().each(function (rec) {
                itemTotal += Number(rec.getValue({
                    name: 'custitem_dps_heavy1',
                    join: 'custrecord_dps_shipping_record_item'
                }));

                return --limit > 0;
            });

            log.debug('itemTotal', itemTotal);


            log.debug('forEach bigArr', bigArr);
            // 关联的发运记录均已出库了, 进行费用分摊
            bigArr.forEach(function (rec) {
                context.write({
                    key: rec,
                    value: itemTotal
                });
            });
        }

    }

    function reduce(context) {

        log.audit('reduce', reduce);

        log.debug('context', context);

        var bigArr = context.values,

            key = context.key,
            limit = 3999;

        log.debug('bigArr[0]', bigArr[0]);
        log.debug('key', key);

        var bigRec = record.load({
            type: 'customrecord_dps_shipping_record',
            id: key
        });

        var effe = 0;
        var subId = 'recmachcustrecord_dps_shipping_record_parentrec';

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: key
            }],
            columns: [{
                name: "custrecord_dps_cabinet_estimated_freight",
                join: "custrecord_dps_ship_rec_load_links",
            }]
        }).run().each(function (rec) {
            effe = rec.getValue({
                name: 'custrecord_dps_cabinet_estimated_freight',
                join: 'custrecord_dps_ship_rec_load_links',
            });
        });


        log.debug('effe', effe);
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: key
            }],
            columns: [
                'custrecord_dps_shipping_record_item', // 货品
                {
                    name: 'custitem_dps_heavy1',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 货品计费重
            ]
        }).run().each(function (rec) {

            var itemId = rec.getValue('custrecord_dps_shipping_record_item');

            log.debug('itemId', itemId);

            var heavy = rec.getValue({
                name: 'custitem_dps_heavy1',
                join: 'custrecord_dps_shipping_record_item'
            });

            log.debug('heavy', heavy);
            var lineNumber = bigRec.findSublistLineWithValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_shipping_record_item',
                value: itemId
            });

            log.debug('lineNumber', lineNumber);

            if (lineNumber > -1) {

                var cost_sharing = Number(effe) * Number(heavy) / Number(bigArr[0]);
                log.audit('cost_sharing', cost_sharing);
                bigRec.setSublistValue({
                    sublistId: subId,
                    fieldId: 'custrecord_dps_ful_rec_big_cost_sharing',
                    line: lineNumber,
                    value: cost_sharing
                });
            }

            return --limit > 0;
        });

        var bigRec_id = bigRec.save();

        log.debug('bigRec_id', bigRec_id);

    }

    function summarize(summary) {

        log.audit('summarize', 'Start');
        handleErrorIfAny(summary);
        log.audit('summarize', 'End');

    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        if (inputSummary.error) {
            log.debug('getInputData', inputSummary.error)
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            errorMsg.push(JSON.parse(value).message);
            return true;
        });
        if (errorMsg.length > 0) {
            log.debug(stage, errorMsg);
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});