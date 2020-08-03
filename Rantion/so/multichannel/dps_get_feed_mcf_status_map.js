/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-20 17:48:46
 * @LastEditTime   : 2020-07-29 15:47:22
 * @LastEditors    : Li
 * @Description    : 获取上传追踪号到Amazon的状态, 更新多渠道订单追踪号的上传情况
 * @FilePath       : \Rantion\so\multichannel\dps_get_feed_mcf_status_map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', "./Helper/core.min", "N/xml"], function (record, search, core, xml) {

    function getInputData() {
        var orders = [];

        var limit = 1000;
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'custbody_order_type_fulfillment',
                    operator: 'is',
                    values: 3
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                },
                {
                    name: 'custbody_dps_link_feed_rec_id',
                    operator: 'noneof',
                    values: ["@NONE@"]
                },
                {
                    name: 'custbody_dps_create_mcf_order',
                    operator: 'is',
                    values: true
                },
                {
                    name: 'custbody_dps_amazon_mcf_tracking_no',
                    operator: 'is',
                    values: false
                }

            ],
            columns: [{
                    name: 'custrecord_aio_feed_submission_id',
                    join: 'custbody_dps_link_feed_rec_id'
                },
                {
                    name: 'custbody_sotck_account'
                }
            ]
        }).run().each(function (rec) {

            orders.push({
                recId: rec.id,
                feed_submission_id: rec.getValue({
                    name: 'custrecord_aio_feed_submission_id',
                    join: 'custbody_dps_link_feed_rec_id'
                }),
                acc_id: rec.getValue('custbody_sotck_account')
            });
            return --limit > 0;
        });
        log.debug('orders数量', orders.length);
        return orders;
    }

    function map(context) {
        var feeds = JSON.parse(context.value);
        var feed_id = feeds.id;
        var fulfillment_id = feeds.fulfillment_id;
        var feed_submission_id = feeds.feed_submission_id;
        var account_id = feeds.acc_id;
        log.debug("feeds", {
            feed_id: feed_id,
            fulfillment_id: fulfillment_id,
            feed_submission_id: feed_submission_id,
            account_id: account_id
        })

        var auth = core.amazon.getAuthByAccountId(account_id);
        log.debug("feed_submission_id-->auth", auth);
        if (auth) {
            var getFeedList = core.amazon.getFeedSubmissionList(account_id, auth, feed_submission_id);

            // if (getFeedList)


            var MessagesWithError = a[0].MessagesWithError;
            log.debug('上传装箱信息错误 MessagesWithError', MessagesWithError);
            var subFlag = true;
            if (MessagesWithError > 0) {
                subFlag = false;
                log.debug('上传装箱信息报错', '上传信息有误');
            }

            var feed_processing_status = a[0].feed_processing_status;
            if (feed_processing_status != "_DONE_") {
                subFlag = false;
            }

            log.debug('feed_processing_status', feed_processing_status);


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
    };

});