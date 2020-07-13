/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-10 14:49:27
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\multichannel\dps_return_tracking_number_mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */

define(["N/record", "N/log", 'N/search', '../../Helper/md5', '../../Helper/CryptoJS.min', 'N/encode',
    'N/https', 'N/xml'
], function (record, log, search, md5, cryptoJS, encode, https, xml) {

    function getInputData() {
        var orders = [];
        var limit = 3999;
        var num = 0;
        try {
            search.create({
                type: 'salesorder',
                filters: [{
                        name: 'custbody_order_type_fulfillment',
                        operator: 'is',
                        values: 3
                    },
                    {
                        name: 'custbody_dps_waybill_no',
                        operator: 'isempty',
                        values: []
                    },
                    {
                        name: 'custbodyfulfillment_stock_so',
                        operator: 'isnotempty',
                        values: []
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: 'true'
                    },
                    {
                        name: 'custbody_dps_create_mcf_order',
                        operator: 'is',
                        values: true
                    }

                ],
                columns: [{
                        name: 'custbodyfulfillment_stock_so'
                    },
                    {
                        name: 'custbody_sotck_account'
                    }
                ]
            }).run().each(function (rec) {
                num++;
                orders.push({
                    id: rec.id,
                    SellerFulfillmentOrderId: rec.getValue('custbodyfulfillment_stock_so'),
                    acc_id: rec.getValue('custbody_sotck_account')
                });
                return --limit > 0;
            });
            log.debug('orders数量', orders.length);
            log.debug('orders', orders);
        } catch (e) {
            log.debug('error', e);
        }
        a = [{
            "id": "334519",
            "SellerFulfillmentOrderId": "111-0989610-7085036-test",
            "acc_id": "21"
        }]
        return orders;
    }

    function map(context) {
        try {
            var obj = JSON.parse(context.value),
                acc_id = obj.acc_id,
                SellerFulfillmentOrderId = obj.SellerFulfillmentOrderId,
                delivery_order_id = obj.id;
            var getFulfillmentOrder_result = GetFulfillmentOrder(acc_id, SellerFulfillmentOrderId, delivery_order_id);
            log.audit('getFulfillmentOrder_result', getFulfillmentOrder_result);
        } catch (err) {
            log.error('err ', err);
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


                log.debug('mcfTrackNum', mcfTrackNum);
                log.debug('shipstatus', shipstatus);

                // 1 PENDING
                // 2 SHIPPED
                // 3 CANCELLED_BY_FULFILLER
                // 4 CANCELLED_BY_SELLER


                result.TrackingNumber = mcfTrackNum;
                result.FulfillmentShipmentStatus = shipstatus;


                var sta;
                if (shipstatus && shipstatus.length > 0) {
                    if (shipstatus[0].textContent == "PENDING") {
                        sta = 1;
                    }
                    if (shipstatus[0].textContent == "SHIPPED") {
                        sta = 2;
                    }
                    if (shipstatus[0].textContent == "CANCELLED_BY_FULFILLER") {
                        sta = 3;
                    }
                    if (shipstatus[0].textContent == "CANCELLED_BY_SELLER") {
                        sta = 4;
                    }
                }

                var traNo;
                if (mcfTrackNum && mcfTrackNum.length > 0) {

                    traNo = mcfTrackNum[0].textContent
                }


                if (sta) {
                    record.submitFields({
                        type: 'salesorder',
                        id: delivery_order_id,
                        values: {
                            'custbody_dps_waybill_no': traNo ? traNo : "",
                            custbody_dps_mcf_order_status: sta
                        }
                    });
                }
            }
        }
        log.debug('MCF result', result);
        return result;
    }


    var core1 = {
        getAuthByAccountId: function (account_id) {
            var auth;
            log.audit('account_id', account_id);
            search.create({
                type: 'customrecord_aio_account',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: account_id
                }],
                columns: [{
                        name: 'custrecord_aio_seller_id'
                    },
                    {
                        name: 'custrecord_aio_mws_auth_token'
                    },
                    {
                        name: 'custrecord_aio_aws_access_key_id',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_secret_key_guid',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_amazon_mws_endpoint',
                        join: 'custrecord_aio_enabled_sites'
                    },
                    {
                        name: 'custrecord_aio_amazon_marketplace_id',
                        join: 'custrecord_aio_enabled_sites'
                    },
                ]
            }).run().each(function (rec) {
                auth = {
                    seller_id: rec.getValue(rec.columns[0]),
                    auth_token: rec.getValue(rec.columns[1]),
                    access_id: rec.getValue(rec.columns[2]),
                    sec_key: rec.getValue(rec.columns[3]),
                    end_point: rec.getValue(rec.columns[4]),
                    marketplace_id: rec.getValue(rec.columns[5])
                };
                return false;
            });
            return auth || false;
        },
        mwsRequestMaker: function (auth, action, version, params, resource, body) {
            if (resource === void 0) {
                resource = '/';
            }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = {
                SellerId: encodeURIComponent(auth.seller_id),
                AWSAccessKeyId: encodeURIComponent(auth.access_id),
                MarketplaceId: encodeURIComponent(auth.marketplace_id),
                Action: encodeURIComponent(action),
                SignatureMethod: encodeURIComponent('HmacSHA256'),
                SignatureVersion: encodeURIComponent('2'),
                Timestamp: timestamp,
                Version: encodeURIComponent(version)
            };
            if (auth.auth_token) {
                query['MWSAuthToken'] = encodeURIComponent(auth.auth_token);
            }

            log.debug('mwsRequestMaker', params);
            for (var key in params) {
                if (params[key] != '') {
                    query[key] = encodeURIComponent(params[key]);
                }
            }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function (key) {
                return key + "=" + query[key];
            }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({
                string: hash,
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            }));

            /** 用于MCF发货 */
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? {
                    'Content-Type': 'text/xml',
                } : {}
            });

            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            log.debug('headers', body ? {
                'Content-Type': 'text/xml',
            } : {});
            log.debug('hashInBase64', hashInBase64);
            log.debug('mwsRequestMaker.response', response);

            log.debug('mwsRequestMaker.response.header', response.headers);
            return response.body;
        }

    };

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