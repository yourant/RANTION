/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-13 13:52:41
 * @LastEditTime   : 2020-07-10 13:44:06
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\multichannel\dps_sales_multichannel_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/record", "N/log", 'N/search', '../../Helper/md5', '../../Helper/CryptoJS.min', 'N/encode', 'N/https', 'N/xml'],
    function (record, log, search, md5, cryptoJS, encode, https, xml) {

        function _get(context) {

        }

        function _post(context) {
            log.debug('context', context);

            var action = context.action;


            try {
                if (action == 'CreateFulfillmentOrder') {

                    var result = {},
                        id = context.recId,
                        params = {},
                        items = [],
                        delivery_shop, order_contact_id,
                        date_time, order_num,
                        order_comment, fulfillment_action,
                        delivery_method;
                    search.create({
                        type: 'salesorder',
                        filters: [{
                            name: 'internalid',
                            operator: 'is',
                            values: id
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: false
                        },
                        {
                            name: 'taxline',
                            operator: 'is',
                            values: false
                        }
                        ],
                        columns: [{
                            name: 'item'
                        }, //0
                        {
                            name: 'custbody_sotck_account'
                        }, //1 发货店铺
                        {
                            name: 'custbody_dps_order_contact'
                        }, //2 订单联系人
                        {
                            name: 'custcol_aio_amazon_msku'
                        },
                        {
                            name: 'quantity'
                        },
                        {
                            name: 'trandate'
                        },
                        {
                            name: 'tranid'
                        }, //订单号
                        {
                            name: 'custbody_mcf_displayable_order_comment'
                        },
                        {
                            name: 'custbody_mcf_fulfillment_action'
                        },
                        {
                            name: 'custbody_mcf_delivery_method'
                        },
                        {
                            name: 'custbodyfulfillment_stock_so'
                        }, // MCF fulfillment Order Id
                        {
                            name: 'custbody_reason_type'
                        }, //原因类型
                        {
                            name: 'custentity_store_number',
                            join: "customer"
                        }, //12店铺编号
                        {
                            name: 'otherrefnum'
                        }, //原订单号
                        ]
                    }).run().each(function (rec) {
                        delivery_shop = rec.getValue('custbody_sotck_account');
                        order_contact_id = rec.getValue('custbody_dps_order_contact');
                        date_time = rec.getValue('trandate');
                        order_comment = rec.getValue('custbody_mcf_displayable_order_comment');
                        fulfillment_action = rec.getText('custbody_mcf_fulfillment_action');
                        delivery_method = rec.getText('custbody_mcf_delivery_method');
                        items.push({
                            SellerSKU: rec.getValue('custcol_aio_amazon_msku') ? rec.getValue('custcol_aio_amazon_msku') : '',
                            SellerFulfillmentOrderItemId: rec.getValue('custcol_aio_amazon_msku') ? rec.getValue('custcol_aio_amazon_msku') : '',
                            Quantity: rec.getValue('quantity') ? rec.getValue('quantity') : ''
                        });
                        order_num = rec.getValue('custbodyfulfillment_stock_so');
                        reason_type = rec.getValue('custbody_reason_type');
                        store_num = rec.getValue(rec.columns[12]);
                        order_id = rec.getValue(rec.columns[13]);

                        return true;
                    });
                    log.debug('items', items);

                    /* 
                    if (!reason_type) {
                        return {
                            code: '失败',
                            message: "操作失败，请先选择原因类型"
                        };
                    }
                    */
                    if (!store_num) {
                        return {
                            code: '失败',
                            message: "操作失败，客户信息中的店铺编号不存在"
                        };
                    }
                    if (!order_num) {
                        //如果多渠道订单编号不存在，就根据规则生成 ：店铺编号 - 原订单号 - 原因类型
                        var corr = {
                            "1": "BF",
                            "2": "CF"
                        }
                        order_num = store_num + "-" + order_id + "-" + corr[reason_type]
                    }
                    log.error("order_num:", order_num)
                    //获取订单联系人地址 
                    var addr = record.load({
                        type: 'customrecord_customer_contact',
                        id: order_contact_id,
                        isDynamic: true
                    });

                    //获取收货地址
                    var receipt_name = addr.getValue('name');
                    var receipt_addr1 = addr.getValue('custrecord_cc_addr1');
                    var receipt_addr2 = addr.getValue('custrecord_cc_addr2');
                    var receipt_addr3 = addr.getValue('custrecord6');
                    var receipt_mobile = addr.getValue('custrecord_cc_phone_number');
                    var receipt_country = addr.getValue('custrecord_cc_country').toUpperCase();
                    var receipt_province = addr.getValue('custrecord_cc_state');
                    var receipt_city = addr.getValue('custrecord_cc_ctiy');
                    var receipt_postal_code = addr.getValue('custrecord_cc_zip');
                    var receipt_notification_email = addr.getValue('custrecord_cc_email');

                    //日期取值不确定
                    var date_time = new Date();
                    var displayable_order_date = date_time.toISOString(); //  created创建日期   ISO 8601时间格式.

                    var sArr = ['SellerFulfillmentOrderId', 'DisplayableOrderId', 'DisplayableOrderDateTime', 'DisplayableOrderComment', 'ShippingSpeedCategory'];

                    params['SellerFulfillmentOrderId'] = order_num; //发货单号
                    params['DisplayableOrderId'] = order_num; //显示订单编号

                    params['DisplayableOrderDateTime'] = displayable_order_date; //moment(displayableorderdate).toISOString();  //配送订单日期，格式为 ISO 8601。在面向买家的材料（如出库货件装箱单）中显示为订单日期。

                    params['DisplayableOrderComment'] = order_comment ? order_comment : 'Thanks'; //在面向买家的材料（如出库货件装箱单）中出现的订单详情文本。
                    params['FulfillmentAction'] = fulfillment_action; //指定配送订单应立即配送还是暂缓配送:Ship - 立即配送。Hold - 暂缓配送。
                    params['ShippingSpeedCategory'] = delivery_method; // 配送订单的配送方式


                    var addr = ['DestinationAddress.Name', 'DestinationAddress.Line1', 'DestinationAddress.CountryCode', 'DestinationAddress.StateOrProvinceCode'];
                    //配送地址
                    params['DestinationAddress.Name'] = receipt_name.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.Line1'] = receipt_addr1.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.Line2'] = receipt_addr2.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.Line3'] = receipt_addr3.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.CountryCode'] = receipt_country.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.StateOrProvinceCode'] = receipt_province.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.City'] = receipt_city.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.PostalCode'] = receipt_postal_code.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['DestinationAddress.PhoneNumber'] = receipt_mobile.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
                    params['NotificationEmailList.member.1'] = receipt_notification_email.replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');

                    var ite = ['.SellerSKU', '.SellerFulfillmentOrderItemId', '.Quantity']
                    items.map(function (item, i) {
                        params['Items.member.' + (i + 1) + '.SellerSKU'] = item.SellerSKU;
                        params['Items.member.' + (i + 1) + '.SellerFulfillmentOrderItemId'] = item.SellerFulfillmentOrderItemId;
                        params['Items.member.' + (i + 1) + '.Quantity'] = item.Quantity;
                    });
                    log.debug('params', params);

                    var flag = true;
                    var lAddr = [];
                    for (var a = 0, len = addr.length; a < len; a++) {
                        var temp = addr[a];
                        if (!params[temp]) {
                            lAddr.push(temp);
                            flag = false;
                        }
                    }

                    for (var c = 0, len1 = sArr.length; c < len1; c++) {
                        var temp = sArr[c];
                        if (!params[temp]) {
                            lAddr.push(temp);
                            flag = false;
                        }
                    }

                    for (var b = 0, len2 = ite.length; b < len2; b++) {
                        var temp = ite[b];
                        for (var z = 0, len3 = items.length; z < len3; z++) {
                            var s = 'Items.member.' + (z + 1) + temp;
                            if (!params[s]) {
                                lAddr.push(s);
                                flag = false;
                            }
                        }
                    }

                    log.debug('flag', flag);
                    log.debug('lAddr', lAddr);
                    // return {
                    //     code: 'test',
                    //     message: '测试通过'
                    // };

                    if (flag) {
                        var auth = core1.getAuthByAccountId(delivery_shop);
                        if (auth) {

                            var response = core1.mwsRequestMaker(auth, 'CreateFulfillmentOrder', '2010-10-01', params, '/FulfillmentOutboundShipment/2010-10-01/');

                            log.debug('请求返回的数据 MCF response', response);

                            // var res = xml.Parser.fromString({
                            //     text: response
                            // });

                            log.debug('response', response.replace('xmlns', 'aaa'));
                            var res = xml.Parser.fromString({
                                text: response.replace('xmlns', 'aaa')
                            });
                            if (response.indexOf('</ErrorResponse>') != -1) {
                                var code_ = xml.XPath.select({
                                    node: res,
                                    xpath: '//Code'
                                });

                                log.debug('code_', code_);
                                result.code = code_[0].textContent;
                                var message_ = xml.XPath.select({
                                    node: res,
                                    xpath: '//Message'
                                });

                                log.debug('message_', message_);
                                result.message = message_[0].textContent;
                                log.debug("result", JSON.stringify(result));

                                var id = record.submitFields({
                                    type: record.Type.SALES_ORDER,
                                    id: id,
                                    values: {
                                        custbody_dps_mcf_info: message_[0].textContent
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            } else {
                                var requestId_ = xml.XPath.select({
                                    node: res,
                                    xpath: '//RequestId'
                                });

                                result.code = 'Success';
                                result.message = '创建mcf订单成功。RequestId：' + requestId_[0].textContent;
                                var id = record.submitFields({
                                    type: record.Type.SALES_ORDER,
                                    id: id,
                                    values: {
                                        custbody_dps_mcf_info: '创建mcf订单成功。RequestId：' + requestId_[0].textContent,
                                        custbodyfulfillment_stock_so: order_num,
                                        custbody_dps_create_mcf_order: true
                                    },
                                    options: {
                                        enableSourcing: false,
                                        ignoreMandatoryFields: true
                                    }
                                });
                            }
                        }
                    } else {
                        var msg = [],
                            str = '';
                        lAddr.forEach(function (la, key) {
                            var chex = ['.SellerSKU', '.Quantity', 'DestinationAddress.Name', 'DestinationAddress.Line1',
                                'DestinationAddress.CountryCode', 'DestinationAddress.StateOrProvinceCode',
                                'SellerFulfillmentOrderId', 'DisplayableOrderDateTime', 'DisplayableOrderComment', 'ShippingSpeedCategory'
                            ];

                            if (la.indexOf('.SellerSKU') != -1) {
                                str += 'SellerSKU 为空；';
                            }
                            if (la.indexOf('.Quantity') != -1) {
                                str += '货品数量 为空；';
                            }
                            if (la.indexOf('DestinationAddress.Name') != -1) {
                                str += '收件人 为空；';
                            }
                            if (la.indexOf('DestinationAddress.Line1') != -1) {
                                str += '收件人地址1 为空；';
                            }
                            if (la.indexOf('DestinationAddress.CountryCode') != -1) {
                                str += '收件人国家 为空；';
                            }
                            if (la.indexOf('DestinationAddress.StateOrProvinceCode') != -1) {
                                str += '收件人州编码 为空；';
                            }
                            if (la.indexOf('SellerFulfillmentOrderId') != -1) {
                                str += '履行订单号 为空；';
                            }
                            if (la.indexOf('ShippingSpeedCategory') != -1) {
                                str += '配送等级 为空；';
                            }

                        });

                        result.code = '缺少参数';
                        result.message = str;
                    }
                } else {

                    var fulPo, delivery_shop, fulInfo, result = {};
                    search.create({
                        type: 'salesorder',
                        filters: [{
                            name: 'internalid',
                            operator: 'is',
                            values: context.recId
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: true
                        }
                        ],
                        columns: [
                            "custbodyfulfillment_stock_so", "custbody_sotck_account", 'custbody_dps_mcf_info'
                        ]
                    }).run().each(function (rec) {
                        delivery_shop = rec.getValue('custbody_sotck_account');
                        fulPo = rec.getValue('custbodyfulfillment_stock_so');
                        fulInfo = rec.getValue('custbody_dps_mcf_info');
                    });
                    var params = {};
                    params["SellerFulfillmentOrderId"] = fulPo;
                    var auth = core1.getAuthByAccountId(delivery_shop);
                    if (auth) {
                        var response = core1.mwsRequestMaker(auth, 'CancelFulfillmentOrder', '2010-10-01', params, '/FulfillmentOutboundShipment/2010-10-01/');


                        log.debug('response', response.replace('xmlns', 'aaa'));
                        var res = xml.Parser.fromString({
                            text: response.replace('xmlns', 'aaa')
                        });
                        if (response.indexOf('</ErrorResponse>') != -1) {
                            var code_ = xml.XPath.select({
                                node: res,
                                xpath: '//Code'
                            });

                            log.debug('code_', code_);
                            result.code = code_[0].textContent;
                            var message_ = xml.XPath.select({
                                node: res,
                                xpath: '//Message'
                            });

                            log.debug('message_', message_);
                            result.message = message_[0].textContent;
                            log.debug("result", JSON.stringify(result));

                            var id = record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: context.recId,
                                values: {
                                    custbody_dps_mcf_info: fulInfo + '\n' + message_[0].textContent
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        } else {
                            var requestId_ = xml.XPath.select({
                                node: res,
                                xpath: '//RequestId'
                            });

                            result.code = 'Success';
                            result.message = '取消mcf订单成功。RequestId：' + requestId_[0].textContent;
                            var id = record.submitFields({
                                type: record.Type.SALES_ORDER,
                                id: context.recId,
                                values: {
                                    custbody_dps_mcf_info: fulInfo + '\n取消mcf订单成功。RequestId：' + requestId_[0].textContent,
                                    custbody_dps_create_mcf_order: false
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });

                            // 取消mcf订单成功。RequestId：3ddb350c-4df2-41d5-a2a0-87bdbca97aed
                        }

                    }
                }

            } catch (error) {

                result.code = '失败';
                result.message = error.message;
            }

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

        function _put(context) {

        }

        function _delete(context) {

        }

        return {
            get: _get,
            post: _post,
            put: _put,
            delete: _delete
        }
    });