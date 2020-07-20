/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-20 17:48:46
 * @LastEditTime   : 2020-07-20 17:52:08
 * @LastEditors    : Li
 * @Description    : 获取上传追踪号到Amazon的状态
 * @FilePath       : \Rantion\so\multichannel\dps_getfeed_mcf_status_map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', "./Helper/core.min", "N/xml"], function (record, search, core, xml) {

    function getInputData() {
        var feeds = [];
        core.amazon.getAccountList().map(function (acc) {
            var limit = 5;
            search.create({
                type: 'customrecord_aio_amazon_feed',
                filters: [
                    // { name: 'internalid', operator: 'is', values: '15689' },
                    {
                        name: 'custrecord_aio_feed_account',
                        operator: 'anyof',
                        values: acc.id
                    },
                    {
                        name: 'custrecord_hf_fulfillment_id',
                        operator: 'noneof',
                        values: ["@NONE@"]
                    },
                    {
                        name: "custrecord_aio_feed_response",
                        operator: search.Operator.ISEMPTY
                    },
                    {
                        name: 'custrecord_aio_feed_processing_status',
                        operator: 'isnot',
                        values: '_DONE_'
                    },
                    {
                        name: 'custrecord_aio_feed_processing_status',
                        operator: 'isnot',
                        values: '_CANCELLED_'
                    },
                    {
                        name: 'custrecord_aio_feed_type',
                        operator: 'is',
                        values: '_POST_ORDER_FULFILLMENT_DATA_'
                    },
                    {
                        name: "custrecord_aio_feed_resolved",
                        operator: "is",
                        values: false
                    },
                ],
                columns: [{
                        name: 'custrecord_hf_fulfillment_id'
                    },
                    {
                        name: 'custrecord_aio_feed_submission_id'
                    },
                    {
                        name: 'custrecord_aio_feed_account'
                    },
                ]
            }).run().each(function (result) {
                feeds.push({
                    id: result.id,
                    fulfillment_id: result.getValue("custrecord_hf_fulfillment_id"),
                    feed_submission_id: result.getValue("custrecord_aio_feed_submission_id"),
                    account: result.getValue("custrecord_aio_feed_account")
                });
                return --limit > 0;
            });
        });
        log.debug('get total', feeds.length);
        return feeds;
    }

    function map(context) {
        var feeds = JSON.parse(context.value);
        var feed_id = feeds.id;
        var fulfillment_id = feeds.fulfillment_id;
        var feed_submission_id = feeds.feed_submission_id;
        var account_id = feeds.account;
        log.debug("feeds", {
            feed_id: feed_id,
            fulfillment_id: fulfillment_id,
            feed_submission_id: feed_submission_id,
            account_id: account_id
        })

        var auth = core.amazon.getAuthByAccountId(account_id);
        log.debug("feed_submission_id-->auth", auth);
        if (auth) {
            core.amazon.getFeedSubmissionList(account_id, auth, feed_submission_id);
            var response = [];
            search.create({
                type: 'customrecord_aio_amazon_feed',
                filters: [{
                        name: 'custrecord_hf_fulfillment_id',
                        operator: 'is',
                        values: fulfillment_id
                    },
                    {
                        name: "custrecord_aio_feed_response",
                        operator: "isnotempty"
                    },
                    {
                        name: "custrecord_aio_feed_resolved",
                        operator: "is",
                        values: false
                    },
                ],
                columns: [{
                    name: 'custrecord_aio_feed_response'
                }, ]
            }).run().each(function (result) {
                // response.push(result.getValue("custrecord_aio_feed_response"));
                response.push({
                    feed_id: result.id,
                    re: result.getValue("custrecord_aio_feed_response")
                });
                return true;
            });
            log.debug("response", response);
            log.debug("response.length", response.length)

            log.debug('feed_id', response[0].feed_id);
            log.debug('re1', response[0].re);
            var xmlDocument = xml.Parser.fromString({
                text: response[0].re
            });
            log.debug('re2', response[0].re);
            var messages_successful = xmlDocument.getElementsByTagName({
                tagName: 'MessagesSuccessful'
            }).length ? xmlDocument.getElementsByTagName({
                tagName: 'MessagesSuccessful'
            })[0].textContent : '';
            var result_description = xmlDocument.getElementsByTagName({
                tagName: 'ResultDescription'
            }).length ? xmlDocument.getElementsByTagName({
                tagName: 'ResultDescription'
            })[0].textContent : '';
            log.debug("MessagesSuccessful", messages_successful);
            log.debug("result_description", result_description);

            if (result_description) {
                // var feed_rec = record.load({ type:'customrecord_aio_amazon_feed', id: response[i].feed_id });
                // feed_rec.setValue({ fieldId: 'custrecord_aio_feed_resolved', value: false });
                // var feed_rec_id = feed_rec.save();
                // log.debug("feed_rec_id",feed_rec_id);
                var deliveryorder_id = '';
                search.create({
                    type: 'customrecord_wms_deliveryorders',
                    filters: [{
                        name: 'custrecord_mcf_record_id',
                        operator: 'is',
                        values: fulfillment_id
                    }, ],
                }).run().each(function (result) {
                    deliveryorder_id = result.id;
                    log.debug("deliveryorder_id", deliveryorder_id);
                });
                if (deliveryorder_id) {
                    var full_order_rec = record.load({
                        type: 'customrecord_wms_deliveryorders',
                        id: deliveryorder_id
                    });
                    log.debug("full_order_rec", full_order_rec);
                    // full_order_rec.setValue({ fieldId: 'custrecord_deliveryorders_resolved', value: false });
                    full_order_rec.setValue({
                        fieldId: 'custrecord_upload_tracking_info',
                        value: result_description
                    });
                    var full_order_rec_id = full_order_rec.save();
                    log.debug("full_order_rec_id", full_order_rec_id);
                }
            } else {
                log.debug("Successful", "Successful");
                var feed_rec = record.load({
                    type: 'customrecord_aio_amazon_feed',
                    id: response[0].feed_id
                });
                feed_rec.setValue({
                    fieldId: 'custrecord_aio_feed_resolved',
                    value: true
                });
                var feed_rec_id = feed_rec.save();
                log.debug("feed_rec_id", feed_rec_id);

                log.debug("fulfillment_id", fulfillment_id);
                var deliveryorder_id = '';
                search.create({
                    type: 'customrecord_wms_deliveryorders',
                    filters: [{
                        name: 'custrecord_mcf_record_id',
                        operator: 'is',
                        values: fulfillment_id
                    }, ],
                }).run().each(function (result) {
                    deliveryorder_id = result.id;
                    log.debug("deliveryorder_id", deliveryorder_id);
                });
                if (deliveryorder_id) {
                    var full_order_rec = record.load({
                        type: 'customrecord_wms_deliveryorders',
                        id: deliveryorder_id
                    });
                    log.debug("full_order_rec", full_order_rec);
                    full_order_rec.setValue({
                        fieldId: 'custrecord_deliveryorders_resolved',
                        value: true
                    });
                    full_order_rec.setValue({
                        fieldId: 'custrecord_upload_tracking_info',
                        value: "Upload Tracking Number Successful"
                    });
                    var full_order_rec_id = full_order_rec.save();
                    log.debug("full_order_rec_id", full_order_rec_id);
                }
            }

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