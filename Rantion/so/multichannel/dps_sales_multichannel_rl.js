/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/record","N/log",'N/search'], 
function(record,log,search) {

    function _get(context) {
        
    }

    function _post(context) {
        log.debug('context',context);
        var result = {},id = context.recId,
            params = {},items = [],
            delivery_shop,order_contact_id,
            date_time,order_num,
            order_comment,fulfillment_action,
            delivery_method;
        search.create({
            type:'salesorder',
            filters:[
                { name: 'internalid', operator: 'is', values: id},
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false }
            ],
            columns:[
                { name: 'item'}, //0
                { name: 'custbody_sotck_account' }, //1 发货店铺
                { name: 'custbody_dps_order_contact'},//2 订单联系人
                { name: 'custcol_aio_amazon_msku'},
                { name: 'quantity'},
                { name: 'trandate'},
                { name: 'tranid'},//订单号
                { name: 'custbody_mcf_displayable_order_comment'},
                { name: 'custbody_mcf_fulfillment_action'},
                { name: 'custbody_mcf_delivery_method'}
            ]
        }).run().each(function(rec){
            delivery_shop = rec.getValue('custbody_sotck_account');
            order_contact_id = rec.getValue('custbody_dps_order_contact');
            date_time = rec.getValue('trandate');
            order_num = rec.getValue('tranid');
            order_comment = rec.getValue('custbody_mcf_displayable_order_comment');
            fulfillment_action = rec.getText('custbody_mcf_fulfillment_action');
            delivery_method = rec.getText('custbody_mcf_delivery_method');
            items.push({
                SellerSKU: rec.getValue('custcol_aio_amazon_msku') ? rec.getValue('custcol_aio_amazon_msku') : '',
                SellerFulfillmentOrderItemId: rec.getValue('custcol_aio_amazon_msku') ? rec.getValue('custcol_aio_amazon_msku') : '',
                Quantity: rec.getValue('quantity') ? rec.getValue('quantity') : ''
            });
            return true;
        });
        log.debug('items',items);

        //获取订单联系人地址 
        var addr = record.load({ type: 'customrecord_customer_contact', id: order_contact_id, isDynamic: true });

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
        var displayable_order_date = date_time; //  created创建日期   ISO 8601时间格式.

        params['SellerFulfillmentOrderId'] = order_num;   //发货单号
        params['DisplayableOrderId'] = order_num;   //显示订单编号
        params['DisplayableOrderDateTime'] = displayable_order_date//moment(displayableorderdate).toISOString();  //配送订单日期，格式为 ISO 8601。在面向买家的材料（如出库货件装箱单）中显示为订单日期。
        params['DisplayableOrderComment'] = order_comment ? order_comment : 'Thanks';    //在面向买家的材料（如出库货件装箱单）中出现的订单详情文本。
        params['FulfillmentAction'] = fulfillment_action; //指定配送订单应立即配送还是暂缓配送:Ship - 立即配送。Hold - 暂缓配送。
        params['ShippingSpeedCategory'] = delivery_method; // 配送订单的配送方式

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

        items.map(function (item,i) {
            params['Items.member.' + (i + 1) + '.SellerSKU'] = item.SellerSKU;
            params['Items.member.' + (i + 1) + '.SellerFulfillmentOrderItemId'] = item.SellerFulfillmentOrderItemId;
            params['Items.member.' + (i + 1) + '.Quantity'] = item.Quantity;
        });
        log.debug('params',params);
        return;
        var auth = core1.getAuthByAccountId(delivery_shop);
        if (auth) {
            var response = core1.mwsRequestMaker(auth, 'CreateFulfillmentOrder', '2010-10-01', params, '/FulfillmentOutboundShipment/2010-10-01/');
            var res = xml.Parser.fromString({ text: response });
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
                log.debug("result", JSON.stringify(result));
            }
            else{
                var requestId_ = xml.XPath.select({
                    node: res,
                    xpath: '//RequestId'
                });

                result.code = 'Success';
                result.message = '创建mcf订单成功。RequestId：'+requestId_[0].textContent;
            }
        }

        return result;
    }

    var core1 = {
        getAuthByAccountId: function (account_id) {
            var auth;
            log.audit('account_id', account_id);
            search.create({
                type: 'customrecord_aio_account',
                filters: [
                    { name: 'internalid', operator: 'is', values: account_id } 
                ],
                columns: [
                    { name: 'custrecord_aio_seller_id' },
                    { name: 'custrecord_aio_mws_auth_token' },
                    { name: 'custrecord_aio_aws_access_key_id', join: 'custrecord_aio_dev_account' },
                    { name: 'custrecord_aio_secret_key_guid', join: 'custrecord_aio_dev_account' },
                    { name: 'custrecord_aio_amazon_mws_endpoint', join: 'custrecord_aio_enabled_sites' },
                    { name: 'custrecord_aio_amazon_marketplace_id', join: 'custrecord_aio_enabled_sites' },
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
