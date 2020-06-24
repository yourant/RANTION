/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-14 16:29:26
 * @LastEditTime   : 2020-06-23 20:13:41
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\multichannel\dps_return_tracking_number_mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(["N/log", 'N/search', "N/record", "N/encode", 'N/https', 'N/xml'],
    function (log, search, record, encode, https, xml) {

        function getInputData() {
            var orders = [];
            var limit = 3999;
            var num = 0;
            try {
                search.create({
                    type: 'salesorder',
                    filters: [{
                            name: 'custbody_order_type',
                            operator: 'is',
                            values: 5
                        },
                        {
                            name: 'custbody_dps_waybill_no',
                            operator: 'isempty',
                            values: []
                        },
                        {
                            name: 'custbody_dps_fulfillment_order_id',
                            operator: 'isnotempty',
                            values: []
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: 'true'
                        }
                    ],
                    columns: [{
                            name: 'custbody_dps_fulfillment_order_id'
                        },
                        {
                            name: 'custbody_sotck_account'
                        }
                    ]
                }).run().each(function (rec) {
                    num++;
                    orders.push({
                        id: rec.id,
                        SellerFulfillmentOrderId: rec.getValue('custbody_dps_fulfillment_order_id'),
                        acc_id: rec.getValue('custbody_sotck_account')
                    });
                    return --limit > 0;
                });
                log.debug('orders数量', orders.length);
                log.debug('orders', orders);
            } catch (e) {
                log.debug('error', e);
            }
            return;
        }

        function map(context) {
            var obj = JSON.parse(context.value),
                acc_id = obj.acc_id,
                SellerFulfillmentOrderId = obj.SellerFulfillmentOrderId,
                delivery_order_id = obj.id;
            try {
                var getFulfillmentOrder_result = GetFulfillmentOrder(acc_id, SellerFulfillmentOrderId, delivery_order_id);
            } catch (err) {
                log.debug('err ', err);
            }
        }

        function GetFulfillmentOrder(acc_id, SellerFulfillmentOrderId, delivery_order_id) {
            log.debug('GetFulfillmentOrder begein', SellerFulfillmentOrderId);
            var param = {};
            var result = {};
            param['SellerFulfillmentOrderId'] = SellerFulfillmentOrderId;
            var auth = core1.getAuthByAccountId(acc_id);
            if (auth) {
                log.debug('auth', auth);
                var response = core1.mwsRequestMaker(auth, 'GetFulfillmentOrder', '2010-10-01', param, '/FulfillmentOutboundShipment/2010-10-01/');
                log.debug('response', response.replace('xmlns', 'aaa'));
                var res = xml.Parser.fromString({
                    text: response.replace('xmlns', 'aaa')
                });
                log.debug('xml res', res);
                if (response.indexOf('</ErrorResponse>') != -1) {
                    var code_ = xml.XPath.select({
                        node: res,
                        xpath: '//Code'
                    });
                    result.code = code_[0].textContent;
                    var message_ = xml.XPath.select({
                        node: res,
                        xpath: '//Message'
                    });
                    result.message = message_[0].textContent;
                    result.SellerFulfillmentOrderId = param.SellerFulfillmentOrderId;
                    log.debug('if result GetFulfillmentOrder err', result);
                } else {
                    var mcfTrackNum = xml.XPath.select({
                        node: res,
                        xpath: '//TrackingNumber'
                    });
                    var shipstatus = xml.XPath.select({
                        node: res,
                        xpath: '//FulfillmentShipmentStatus'
                    });


                    // 1 PENDING
                    // 2 SHIPPED
                    // 3 CANCELLED_BY_FULFILLER
                    // 4 CANCELLED_BY_SELLER


                    var sta = '';
                    if (shipstatus == "PENDING") {
                        sta = 1;
                    }
                    if (shipstatus == "SHIPPED") {
                        sta = 2;
                    }
                    if (shipstatus == "CANCELLED_BY_FULFILLER") {
                        sta = 3;
                    }
                    if (shipstatus == "CANCELLED_BY_SELLER") {
                        sta = 4;
                    }


                    if (mcfTrackNum) {
                        record.submitFields({
                            type: 'salesorder',
                            id: delivery_order_id,
                            values: {
                                'custbody_dps_waybill_no': mcfTrackNum,
                                custbody_dps_mcf_order_status: sta
                            }
                        });
                    }
                }
            }
            log.debug('MCF result', result);
            return result;
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