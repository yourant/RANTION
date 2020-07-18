/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-18 11:38:08
 * @LastEditTime   : 2020-07-18 14:32:27
 * @LastEditors    : Li
 * @Description    : 用于定时获取装箱信息上传的情况
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.feed.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', '../../douples_amazon/Helper/core.min'], function (search, record, log) {

    function getInputData() {

        var limit = 3999,
            recArr = [];

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                    name: 'custrecord_dps_amazon_box_flag',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'custrecord_dps_upload_packing_rec',
                    operator: 'noneof',
                    values: '@NONE@'
                }
            ]
        }).run().each(function (rec) {

            recArr.push(rec.id);

            return --limit > 0;
        });

        log.debug('recArr', recArr);
    }

    function map(context) {

        var val = context.value;

        var account, box_flag, feedIds = [],
            shipInfo;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: val
            }],
            columns: [
                "custrecord_dps_amazon_box_flag", // 装箱信息上传成功标记
                "custrecord_dps_shipping_rec_account", // 店铺
                {
                    name: 'custrecord_aio_feed_submission_id',
                    join: 'custrecord_dps_upload_packing_rec'
                }, // feed ID 
                "custrecord_dps_shipment_info", // amazon 装运信息
            ]
        }).run().each(function (rec) {
            account = rec.getValue('custrecord_dps_shipping_rec_account'); // 店铺
            box_flag = rec.getValue('custrecord_dps_amazon_box_flag'); // 标记
            feedIds.push(rec.getValue({
                name: 'custrecord_aio_feed_submission_id',
                join: 'custrecord_dps_upload_packing_rec'
            }));
            shipInfo = rec.getValue('custrecord_dps_shipment_info');
        });

        if (account && !box_flag) {
            getFeedResult(account, val, shipInfo, feedIds);
        }

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    /**
     * 获取装箱信息处理状态
     * @param {Number} accountId 
     * @param {Number} recordID 
     * @param {String} amazon_info 
     * @param {Array} submission_ids 
     */
    function getFeedResult(accountId, recordID, amazon_info, submission_ids) {

        var a = core.amazon.getFeedSubmissionList(accountId, submission_ids);
        log.debug('装箱信息处理情况', a);

        var shipRec = record.load({
            type: 'customrecord_dps_shipping_record',
            id: recordID
        });

        shipRec.setValue({
            fieldId: "custrecord_dps_amazon_box_flag",
            value: true
        });

        log.debug('a[0].ResultMessageCode', a[0].ResultDescription);
        if (a[0].MessagesWithError != 0) {
            var s = a[0].ResultDescription,
                str;
            if (amazon_info) {
                str = amazon_info + '\n' + s;
            }
            shipRec.setValue({
                fieldId: "custrecord_dps_shipment_info",
                value: str ? str : s
            });
        }
        shipRec.setText({
            fieldId: "custrecord_dps_amazon_press_status",
            text: a[0].feed_processing_status
        });
        var shipRec_id = shipRec.save();

        log.debug('更新发运记录', shipRec_id);

        //  _AWAITING_ASYNCHRONOUS_REPLY_  等待异步答复    _CANCELLED_		取消     _DONE_		完成
        // _IN_PROGRESS_	进行中       _IN_SAFETY_NET_      _SUBMITTED_  已提交      _UNCONFIRMED_   未确认

        var str = "Amazon 未处理完成";
        if (a[0].feed_processing_status == "_DONE_") {
            str = "Amazon 已处理完成";
        } else if (a[0].feed_processing_status == "_CANCELLED_") {
            str = "Amazon 已取消";
        }
        ret.msg = "装箱信息处理状态：" + str;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});