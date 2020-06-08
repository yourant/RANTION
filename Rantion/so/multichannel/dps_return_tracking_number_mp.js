/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(["N/log", 'N/search', "N/record", "N/encode", 'N/https', 'N/xml'], function (log, search, record, encode, https, xml) {

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
        return orders;
    }

    function map(context) {
        var obj = JSON.parse(context.value),
            acc_id = obj.acc_id,
            SellerFulfillmentOrderId = obj.SellerFulfillmentOrderId,
            delivery_order_id = obj.id;
        try {
            var getFulfillmentOrder_result = GetFulfillmentOrder(acc_id, SellerFulfillmentOrderId, delivery_order_id);

            log.debug('getFulfillmentOrder_result', getFulfillmentOrder_result);

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
                if (mcfTrackNum) {
                    record.submitFields({
                        type: 'salesorder',
                        id: delivery_order_id,
                        values: {
                            'custbody_dps_waybill_no': mcfTrackNum,
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