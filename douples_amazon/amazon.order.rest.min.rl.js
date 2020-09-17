/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 *
 * @desccription 导入 Amazon 订单
 * @scriptname DPS | MP | AMAZON ORDER INIT
 * @scriptid _amazon_order_init
 * @deploymentid _amazon_order_init
 * @url /app/site/hosting/restlet.nl?script=27&deploy=1
 * @EXTERNAL https://5674556.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=27&deploy=1
 */
define(["require", "exports", "N/log", "N/file", "N/search", "N/record", "N/runtime", "N/email", "N/encode", "N/file", "N/https", "N/xml", "./Helper/CryptoJS.min", "./Helper/Moment.min"], function(require, exports, log, file, search, record, runtime, email, encode, file, https, xml, cryptoJS, moment) {
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.get = function(ctx) {
        switch (ctx.op) {
            case 'go':
                var orders_1 = [];
                var status_1 = [];
                var group = ctx.group;
                var accArr = ctx.accArr;
                search.create({
                    type: 'customrecord_aio_account',
                    filters: [
                        { name: 'custrecord_aio_marketplace', operator: search.Operator.ANYOF, values: 1 },
                        // { name: 'custrecord_aio_getorder_group', operator: search.Operator.ANYOF, values: group },
                        { name: 'internalid', operator: "anyof", values: accArr },
                        { name: 'isinactive', operator: 'is', values: false }
                    ]
                }).run().each(function(rec) {
                    log.audit('customrecord_aio_account', rec.id);
                    try {
                        var result = core.handleit(Number(rec.id));
                        result.orders.map(function(order) {
                            orders_1.push(order);
                        });
                        status_1.push(result.status);
                        // log.audit('return order:',orders_1);
                        // log.audit('return status:',status_1);
                    } catch (e) {
                        //
                        log.error('core.handleit', {
                            id: rec.id,
                            err: e
                        });
                    }
                    return true;
                });
                log.audit('orders_1 length', 'orders_1 group:' + group + ':::::orders_1 length:' + orders_1.length)
                return {
                    orders: orders_1,
                        status: status_1
                };
                break;
            case 'insert':
                log.audit('prm', ctx.body);
                return 'OK';
                break;
            case 'duplicate':
                var ods_1 = [];
                var limit_1 = 4000;
                search.create({
                    type: 'customrecord_aio_order_import_cache',
                    filters: [
                        { name: 'internalid', summary: search.Summary.COUNT, operator: search.Operator.GREATERTHAN, values: 1 }
                    ],
                    columns: [
                        { name: 'internalid', summary: search.Summary.COUNT, sort: search.Sort.DESC },
                        { name: 'custrecord_aio_cache_order_id', summary: search.Summary.GROUP }
                    ]
                }).run().each(function(rec) {
                    ods_1.push({
                        count: Number(rec.getValue(rec.columns[0])),
                        oid: rec.getValue(rec.columns[1]),
                    });
                    return --limit_1 > 0;
                });
                return ods_1;
            case 'delete':
                var to_delete_orders_1 = [];
                try {
                    search.create({
                        type: 'customrecord_aio_order_import_cache',
                        filters: [
                            { name: 'custrecord_aio_cache_order_id', operator: search.Operator.IS, values: ctx.amazon_order_id }
                        ],
                        columns: [
                            { name: 'created', sort: search.Sort.DESC }
                        ]
                    }).run().each(function(rec) {
                        to_delete_orders_1.push(rec.id);
                        return true;
                    });
                } catch (e) {
                    log.error('删除 import cache 出错', e);
                }
                to_delete_orders_1.map(function(id, key) {
                    if (key != 0) {
                        record.delete({ type: 'customrecord_aio_order_import_cache', id: id });
                    }
                });
                return ctx.amazon_order_id + "\u5220\u9664\u4E86" + (to_delete_orders_1.length - 1) + "\u6761\u8BB0\u5F55\u3002";
        }
        throw "_UN_EXCEPT_OP_REQUEST_";
    };
    exports.post = function(httpbody) {

        if (httpbody.type == 'order') {
            var body = httpbody.body;
            var r;
            search.create({
                type: 'customrecord_aio_order_import_cache',
                filters: [
                    { name: 'custrecord_aio_cache_acc_id', operator: search.Operator.ANYOF, values: body.AccID },
                    { name: 'custrecord_aio_cache_order_id', operator: search.Operator.IS, values: body.amazon_order_id }
                ]
            }).run().each(function(rec) {
                r = record.load({ type: 'customrecord_aio_order_import_cache', id: rec.id });
                return false;
            });
            if (!r) {
                r = record.create({ type: 'customrecord_aio_order_import_cache' });
            }
            log.debug('body-order_status-amazon_order_id', body.amazon_order_id + ":::" + body.order_status);
            r.setValue({ fieldId: 'custrecord_aio_cache_acc_id', value: body.AccID });
            r.setValue({ fieldId: 'custrecord_aio_cache_body', value: JSON.stringify(body) });
            r.setValue({ fieldId: 'custrecord_aio_cache_order_id', value: body.amazon_order_id });
            // r.setValue({ fieldId: 'custrecord_aio_cache_resolved', value: false });
            r.setValue({ fieldId: 'custrecord_aio_cache_status', value: body.order_status || '' });
            r.setValue({ fieldId: 'custrecord_aio_cache_version', value: 1 });
            return r.save();
        } else if (httpbody.type == 'status') {
            var body = httpbody.body;

            var h, hid;
            search.create({
                type: 'customrecord_aio_order_import_status',
                filters: [
                    { name: 'custrecord_aio_importer_acc_id', operator: search.Operator.ANYOF, values: body.acc_id }
                ]
            }).run().each(function(rec) {
                h = record.load({ type: 'customrecord_aio_order_import_status', id: rec.id });
                return false;
            });
            if (!h) {
                h = record.create({ type: 'customrecord_aio_order_import_status' });
                h.setValue({ fieldId: 'custrecord_aio_importer_acc_id', value: body.acc_id });
            }
            if (body.last_updated_af) {
                h.setValue({ fieldId: 'custrecord_aio_importer_last_updated_af', value: moment.utc(body.last_updated_af).toDate() });
            }
            if (body.last_updated_bf) {
                h.setValue({ fieldId: 'custrecord_aio_importer_last_updated_bf', value: moment.utc(body.last_updated_bf).toDate() });
            }
            h.setValue({ fieldId: 'custrecord_aio_importer_next_token', value: body.next_token });

            return h.save();
        }
        return {};

    };
    var core = {
        handleit: function(acc_id) {
            var hid, last_update_date, nextToken, h, orders;
            var status = {};
            search.create({
                type: 'customrecord_aio_order_import_status',
                filters: [
                    { name: 'custrecord_aio_importer_acc_id', operator: search.Operator.ANYOF, values: acc_id },
                ],
                columns: [
                    /** token */
                    { name: 'custrecord_aio_importer_next_token' },
                    /** Last Updated After */
                    { name: 'custrecord_aio_importer_last_updated_af' },
                    /** Last Updated Before */
                    { name: 'custrecord_aio_importer_last_updated_bf' },
                ]
            }).run().each(function(rec) {
                hid = rec.id;
                nextToken = rec.getValue(rec.columns[0]);
                last_update_date = rec.getValue(rec.columns[2]);
                // log.audit('last_update_date search result', last_update_date);
                if (last_update_date) {
                    var time = last_update_date.split(" ")[1];
                    var hour = time.split(":")[0];
                    if (hour.length == 1) {
                        hour = "0" + hour;
                        var date = last_update_date.split(" ")[0];
                        var min = time.split(":")[1];
                        var sec = time.split(":")[2];
                        last_update_date = date + " " + hour + ":" + min + ":" + sec;
                        // log.audit('last_update_date search result formated', last_update_date);
                    }
                }
                return false;
            });
            if (!last_update_date) {
                last_update_date = '2020/01/01 08:00:00'; //moment('2020/1/1 0:00:00').utc().toDate();
                log.audit('last_update_date defualt', last_update_date);
            }
            if (hid && nextToken) {
                if (nextToken == '-1') {
                    // log.audit('last_update_date1', last_update_date);
                    var rtn_1 = core.listOrders(acc_id, moment.utc(last_update_date).subtract(8, 'h').toISOString());
                    status['acc_id'] = acc_id;
                    if (rtn_1.orders.length > 0) {
                        status['last_updated_af'] = moment.utc(last_update_date).subtract(8, 'h');
                        status['last_updated_bf'] = rtn_1.last_updated_before;
                    }
                    if (acc_id == '1753') {
                        log.error('acc_id为1753拉单时间', moment.utc(last_update_date).subtract(8, 'h').toISOString() + '--------' + rtn_1.last_updated_before);
                    }

                    status['next_token'] = rtn_1.token;

                    return {
                        orders: rtn_1.orders,
                        status: status
                    };
                }
                // log.audit('last_update_date3', last_update_date);
                // log.audit('date3', moment.utc(last_update_date).toISOString());
                var rtn = core.listOrders(acc_id, moment.utc(last_update_date).subtract(8, 'h').toISOString(), nextToken);

                if (acc_id == '1753') {
                    log.error('acc_id为1753拉单时间', moment.utc(last_update_date).subtract(8, 'h').toISOString() + '--------' + rtn.last_updated_before);
                }

                status['acc_id'] = acc_id;
                status['next_token'] = rtn.token;

                return {
                    orders: rtn.orders,
                    status: status
                };
            } else {

                // log.audit('last_update_date2', last_update_date);
                // log.audit('date2', moment.utc(last_update_date).toISOString());
                var rtn = core.listOrders(acc_id, moment.utc(last_update_date).subtract(8, 'h').toISOString());
                if (rtn.orders.length > 0) {
                    status['last_updated_af'] = moment.utc(last_update_date).subtract(8, 'h');
                    status['last_updated_bf'] = rtn.last_updated_before;
                }


                status['acc_id'] = acc_id;
                status['next_token'] = rtn.token;

                return {
                    orders: rtn.orders,
                    status: status
                };
            }
        },
        listOrders: function(acc_id, last_updated_after, nextToken) {
            var orders = [],
                auth = core.getAuthByAccountId(acc_id);
            log.audit('listOrder-->auth', acc_id + JSON.stringify(auth));
            log.audit('listOrder-->last_updated_after', last_updated_after);
            if (auth) {
                var content = void 0;
                if (nextToken) {
                    content = core.mwsRequestMaker(auth, 'ListOrdersByNextToken', '2013-09-01', {
                        NextToken: nextToken
                    }, '/Orders/2013-09-01');
                } else {
                    content = core.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                        'MarketplaceId.Id.1': auth.marketplace_id,
                        'LastUpdatedAfter': last_updated_after,
                    }, '/Orders/2013-09-01');
                }
                var res = xml.Parser.fromString({
                    text: content
                });
                res.getElementsByTagName({ tagName: 'Order' }).map(function(node) {
                    orders.push({
                        AccID: acc_id,
                        latest_delivery_date: node.getElementsByTagName({ tagName: 'LatestDeliveryDate' }).length ? node.getElementsByTagName({ tagName: 'LatestDeliveryDate' })[0].textContent : '',
                        latest_ship_date: node.getElementsByTagName({ tagName: 'LatestShipDate' }).length ? node.getElementsByTagName({ tagName: 'LatestShipDate' })[0].textContent : '',
                        order_type: node.getElementsByTagName({ tagName: 'OrderType' }).length ? node.getElementsByTagName({ tagName: 'OrderType' })[0].textContent : '',
                        purchase_date: node.getElementsByTagName({ tagName: 'PurchaseDate' }).length ? node.getElementsByTagName({ tagName: 'PurchaseDate' })[0].textContent : '',
                        is_replacement_order: node.getElementsByTagName({ tagName: 'IsReplacementOrder' }).length ? node.getElementsByTagName({ tagName: 'IsReplacementOrder' })[0].textContent == 'true' : false,
                        last_update_date: node.getElementsByTagName({ tagName: 'LastUpdateDate' }).length ? node.getElementsByTagName({ tagName: 'LastUpdateDate' })[0].textContent : '',
                        buyer_email: node.getElementsByTagName({ tagName: 'BuyerEmail' }).length ? node.getElementsByTagName({ tagName: 'BuyerEmail' })[0].textContent : '',
                        amazon_order_id: node.getElementsByTagName({ tagName: 'AmazonOrderId' }).length ? node.getElementsByTagName({ tagName: 'AmazonOrderId' })[0].textContent : '',
                        number_of_items_shipped: node.getElementsByTagName({ tagName: 'NumberOfItemsShipped' }).length ? node.getElementsByTagName({ tagName: 'NumberOfItemsShipped' })[0].textContent : '',
                        ship_service_level: node.getElementsByTagName({ tagName: 'ShipServiceLevel' }).length ? node.getElementsByTagName({ tagName: 'ShipServiceLevel' })[0].textContent : '',
                        order_status: node.getElementsByTagName({ tagName: 'OrderStatus' }).length ? node.getElementsByTagName({ tagName: 'OrderStatus' })[0].textContent : '',
                        sales_channel: node.getElementsByTagName({ tagName: 'SalesChannel' }).length ? node.getElementsByTagName({ tagName: 'SalesChannel' })[0].textContent : '',
                        is_business_order: node.getElementsByTagName({ tagName: 'IsBusinessOrder' }).length ? node.getElementsByTagName({ tagName: 'IsBusinessOrder' })[0].textContent == 'true' : false,
                        number_of_items_unshipped: node.getElementsByTagName({ tagName: 'NumberOfItemsUnshipped' }).length ? node.getElementsByTagName({ tagName: 'NumberOfItemsUnshipped' })[0].textContent : '',
                        buyer_name: node.getElementsByTagName({ tagName: 'BuyerName' }).length ? node.getElementsByTagName({ tagName: 'BuyerName' })[0].textContent : '',
                        is_premium_order: node.getElementsByTagName({ tagName: 'IsPremiumOrder' }).length ? node.getElementsByTagName({ tagName: 'IsPremiumOrder' })[0].textContent == 'true' : false,
                        earliest_delivery_date: node.getElementsByTagName({ tagName: 'EarliestDeliveryDate' }).length ? node.getElementsByTagName({ tagName: 'EarliestDeliveryDate' })[0].textContent : '',
                        earliest_ship_date: node.getElementsByTagName({ tagName: 'EarliestShipDate' }).length ? node.getElementsByTagName({ tagName: 'EarliestShipDate' })[0].textContent : '',
                        marketplace_id: node.getElementsByTagName({ tagName: 'MarketplaceId' }).length ? node.getElementsByTagName({ tagName: 'MarketplaceId' })[0].textContent : '',
                        fulfillment_channel: node.getElementsByTagName({ tagName: 'FulfillmentChannel' }).length ? node.getElementsByTagName({ tagName: 'FulfillmentChannel' })[0].textContent : '',
                        payment_method: node.getElementsByTagName({ tagName: 'PaymentMethod' }).length ? node.getElementsByTagName({ tagName: 'PaymentMethod' })[0].textContent : '',
                        is_prime: node.getElementsByTagName({ tagName: 'IsPrime' }).length ? node.getElementsByTagName({ tagName: 'IsPrime' })[0].textContent == 'true' : false,
                        shipment_service_level_category: node.getElementsByTagName({ tagName: 'ShipmentServiceLevelCategory' }).length ? node.getElementsByTagName({ tagName: 'ShipmentServiceLevelCategory' })[0].textContent : '',
                        seller_order_id: node.getElementsByTagName({ tagName: 'SellerOrderId' }).length ? node.getElementsByTagName({ tagName: 'SellerOrderId' })[0].textContent : '',
                        shipped_byamazont_fm: node.getElementsByTagName({ tagName: 'ShippedByAmazonTFM' }).length ? node.getElementsByTagName({ tagName: 'ShippedByAmazonTFM' })[0].textContent == 'true' : false,
                        tfm_shipment_status: node.getElementsByTagName({ tagName: 'TFMShipmentStatus' }).length ? node.getElementsByTagName({ tagName: 'TFMShipmentStatus' })[0].textContent : '',
                        promise_response_due_date: node.getElementsByTagName({ tagName: 'PromiseResponseDueDate' }).length ? node.getElementsByTagName({ tagName: 'PromiseResponseDueDate' })[0].textContent : '',
                        is_estimated_ship_date_set: node.getElementsByTagName({ tagName: 'IsEstimatedShipDateSet' }).length ? node.getElementsByTagName({ tagName: 'IsEstimatedShipDateSet' })[0].textContent == 'true' : false,
                        payment_method_detail: node.getElementsByTagName({ tagName: 'PaymentMethodDetail' }).length ? node.getElementsByTagName({ tagName: 'PaymentMethodDetail' })[0].textContent : '',
                        payment_execution_detail: node.getElementsByTagName({ tagName: 'PaymentExecutionDetail' }).length ? node.getElementsByTagName({ tagName: 'PaymentExecutionDetail' })[0].textContent : '',
                        order_total: node.getElementsByTagName({ tagName: 'OrderTotal' }).length ? {
                            currency_code: node.getElementsByTagName({ tagName: 'OrderTotal' })[0].getElementsByTagName({ tagName: 'CurrencyCode' }).length ? node.getElementsByTagName({ tagName: 'OrderTotal' })[0].getElementsByTagName({ tagName: 'CurrencyCode' })[0].textContent : '',
                            amount: node.getElementsByTagName({ tagName: 'OrderTotal' })[0].getElementsByTagName({ tagName: 'Amount' }).length ? Number(node.getElementsByTagName({ tagName: 'OrderTotal' })[0].getElementsByTagName({ tagName: 'Amount' })[0].textContent) : 0,
                        } : {
                            currency_code: '_UNKNOW_',
                            amount: 0
                        },
                        shipping_address: node.getElementsByTagName({ tagName: 'ShippingAddress' }).length ? {
                            city: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'City' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'City' })[0].textContent : '',
                            postal_code: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'PostalCode' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'PostalCode' })[0].textContent : '',
                            state_or_oegion: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'StateOrRegion' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'StateOrRegion' })[0].textContent : '',
                            country_code: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'CountryCode' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'CountryCode' })[0].textContent : '',
                            name: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'Name' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'Name' })[0].textContent : '',
                            address_line1: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'AddressLine1' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'AddressLine1' })[0].textContent : '',
                            address_line2: node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'AddressLine2' }).length ? node.getElementsByTagName({ tagName: 'ShippingAddress' })[0].getElementsByTagName({ tagName: 'AddressLine2' })[0].textContent : ''
                        } : null,
                    });
                });
                if (res.getElementsByTagName({ tagName: 'NextToken' }).length > 0) {
                    return {
                        acc_id: acc_id,
                        orders: orders,
                        token: res.getElementsByTagName({ tagName: 'NextToken' })[0].textContent,
                        last_updated_before: res.getElementsByTagName({ tagName: 'LastUpdatedBefore' })[0].textContent
                    };
                } else {
                    // email.send({
                    //     author: -5,
                    //     recipients: ['18650801765@126.com'],
                    //     bcc: ['mars.zhou@icloud.com'],
                    //     subject: `璁㈠崟瀵煎叆璺戝畬浜哷,
                    //     body: `Account: ${runtime.accountId}<br /><br />Seller ID: ${auth.seller_id}<br /><br />ACC ID: ${acc_id}<br /><br />Last Updated After: ${last_updated_after}`,
                    // });
                    return {
                        acc_id: acc_id,
                        orders: orders,
                        token: '-1',
                        last_updated_before: res.getElementsByTagName({ tagName: 'LastUpdatedBefore' })[0].textContent
                    };
                }
            } else {
                throw "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[" + acc_id + "].";
            }
        },
        getAuthByAccountId: function(account_id) {
            var auth;
            log.audit('account_id', account_id);
            search.create({
                type: 'customrecord_aio_account',
                filters: [
                    { name: 'internalid', operator: 'is', values: account_id },
                ],
                columns: [
                    { name: 'custrecord_aio_seller_id' },
                    { name: 'custrecord_aio_mws_auth_token' },
                    { name: 'custrecord_aio_aws_access_key_id', join: 'custrecord_aio_dev_account' },
                    { name: 'custrecord_aio_secret_key_guid', join: 'custrecord_aio_dev_account' },
                    { name: 'custrecord_aio_amazon_mws_endpoint', join: 'custrecord_aio_enabled_sites' },
                    { name: 'custrecord_aio_amazon_marketplace_id', join: 'custrecord_aio_enabled_sites' },
                ]
            }).run().each(function(rec) {
                auth = {
                    seller_id: rec.getValue(rec.columns[0]),
                    auth_token: rec.getValue(rec.columns[1]),
                    access_id: rec.getValue(rec.columns[2]),
                    sec_key: rec.getValue(rec.columns[3]),
                    end_point: rec.getValue(rec.columns[4]),
                    marketplace_id: rec.getValue(rec.columns[5]),
                };
                return false;
            });
            return auth || false;
        },
        mwsRequestMaker: function(auth, action, version, params, resource, body) {
            if (resource === void 0) {
                resource = '/';
            }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = {
                SellerId: encodeURIComponent(auth.seller_id),
                AWSAccessKeyId: encodeURIComponent(auth.access_id),
                Action: encodeURIComponent(action),
                SignatureMethod: encodeURIComponent('HmacSHA256'),
                SignatureVersion: encodeURIComponent('2'),
                Timestamp: timestamp,
                Version: encodeURIComponent(version)
            };
            if (auth.auth_token) {
                query['MWSAuthToken'] = encodeURIComponent(auth.auth_token);
            }
            for (var key in params) {
                if (params[key] != '') {
                    query[key] = encodeURIComponent(params[key]);
                }
            }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function(key) {
                return key + "=" + query[key];
            }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({
                string: hash,
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            }));
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? { 'Content-Type': 'text/xml', } : {}
            });
            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            log.debug('headers', body ? { 'Content-Type': 'text/xml', } : {});
            log.debug('hashInBase64', hashInBase64);
            log.debug('response', response);

            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    /** MWS閿欒淇℃伅鍗曠嫭鍙????/
                    /*email.send({
                        author: -5,
                        recipients: ['mars.zhou@icloud.com'],
                        subject: 'MWS Request Error',
                        body: "Account: " + runtime.accountId + "<br /><br />Seller ID: " + auth.seller_id + "<br /><br />Action: " + action + "<br /><br />Params: <pre>" + JSON.stringify(params, null, 2) + "</pre><br /><br />Response: " + response.body + "<br /><br />",
                        attachments: body ? [file.create({ name: 'request.payload.xml', fileType: file.Type.XMLDOC, contents: body })] : [],
                    });*/
                    throw "MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            log.debug('mwsRequestMaker.response.body', response.body);
            return response.body;
        },
    };
});