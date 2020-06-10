/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-07 10:11:07
 * @LastEditTime: 2020-05-07 10:23:28
 * @FilePath: \Rantion_sandbox\Rantion\demo\zjg_demo_sl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["N/format", "N/runtime", 'N/search', 'N/record',"../../douples_amazon/Helper/interfunction.min","N/xml",
        "../../douples_amazon/Helper/core.min","../../douples_amazon/Helper/CryptoJS.min","N/encode","N/https"],
  function (format, runtime, search, record,interfun,xml,core,cryptoJS,encode,https) {
    

// 已知格林威治时间，换算本地正确时间
// 本地时间 = 格林威治时间 - 时差
// 已知本地时间，换算对应格林威治时间：
// 格林威治时间 = 本地时间 + 时差

  //  大货发运记录字段 - 地点需要带出的收件人信息字段   config
  const receiptInfo_corr = {
    "custrecord_dps_contact_phone":"custrecord_aio_contact_information",  //收件人联系方式
    "custrecord_dps_street1_dh":"custrecord_aio_sender_address",   //收件人地址
    "custrecord_dps_recipient_city_dh":"custrecord_aio_sender_city",     //城市
    "custrecord_dps_recipient_country_dh":"custrecord_aio_country_sender",   //国家
    "custrecord_dps_recipien_code_dh":"custrecord_aio_sender_address_code",   //邮编
    "custrecord_dps_ship_small_recipient_dh":"custrecord_aio_sender_name",      //收件人名称
    "custrecord_dps_state_dh":"custrecord_aio_sender_state"   //州
}
    function onRequest(context) {
        var response = context.response;
        var request = context.request;
        var St = new Date().getTime()
         
        // var rs = getOrderAndCreateCache(4,4, "206-1383689-3656328")
        var rec_id
        // rec_id = record.load({type:"location",id:652})
        search.create({
            type:"location",
            filters:[
                {name:"internalidnumber",operator:"equalto",values:652}
            ],columns:[
                {name:"custrecord_aio_contact_information"},
                {name:"custrecord_aio_sender_address"},
                {name:"custrecord_aio_sender_city"},
                {name:"custrecord_aio_country_sender"},
                {name:"custrecord_aio_sender_address_code"},
                {name:"custrecord_aio_sender_name"},
                {name:"custrecord_aio_sender_state"}
            ]
        }).run().each(function(e){
            for(key in receiptInfo_corr){
                response.write(JSON.stringify(e.getValue(receiptInfo_corr[key])) +", ================="+receiptInfo_corr[key] +"\n")
            }
            rec_id = e.id
        })
        response.write(JSON.stringify(rec_id))
        log.debug("耗时：",new Date().getTime() - St)
    }



    function getSubmitList(feedId,auth){
        log.error('检查参数typeof(feedId)','---'+typeof(feedId));
        var param = {};
        param['FeedSubmissionId']=feedId;
       var response;                // auth, action, version, params, resource, body,newrec_id)
       response = mwsRequestMaker(auth, 'GetFeedSubmissionResult', '2009-01-01',param , '/Feeds/2009-01-01/','');
           log.error('检查是否成功哦 response',''+response);
           return response;
    }
    function getAuthByAccountId(account_id) {
        var auth;
        search.create({
            type: 'customrecord_aio_account',
            filters: [{ name: 'internalid', operator: 'is', values: account_id }],
            columns: [
                { name: 'custrecord_aio_seller_id' },
                { name: 'custrecord_aio_mws_auth_token' },
                { name: 'custrecord_aio_aws_access_key_id', 	join: 'custrecord_aio_dev_account'   },
                { name: 'custrecord_aio_secret_key_guid', 		join: 'custrecord_aio_dev_account'   },
                { name: 'custrecord_aio_amazon_mws_endpoint', 	join: 'custrecord_aio_enabled_sites' },  
                { name: 'custrecord_aio_amazon_marketplace_id', join: 'custrecord_aio_enabled_sites' },
            ]
        }).run().each(function (rec) {
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
}
    function  mwsRequestMaker(auth, action, version, params, resource, body) {
        try{
        if (resource === void 0) { resource = '/'; }
        var timestamp = encodeURIComponent(new Date().toISOString());
            log.audit("action:",action)
            log.audit("paramssss:",action)
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
        var queryString = keys.map(function (key) { return key + "=" + query[key]; }).join('&');
        var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
        var hashInBase64 = encodeURIComponent(encode.convert({ string: hash, inputEncoding: encode.Encoding.HEX, outputEncoding: encode.Encoding.BASE_64 }));
        var response = https.post({
            url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
            body: body ? body : queryString + "&Signature=" + hashInBase64,
            headers: body ? { 'Content-Type': 'text/xml', } : {}
        });
        log.error('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
        log.error('body', body ? body : queryString + "&Signature=" + hashInBase64);
        log.error('headers', body ? { 'Content-Type': 'text/xml', } : {});
        log.error('hashInBase64', hashInBase64);
        log.error('response', response);
            log.error('response.body', response.body);
        if (response.body.indexOf('</ErrorResponse>') != -1) {
                log.error('response.indexOf</ErrorResponse>', response.body.indexOf('</ErrorResponse>'))
            return '2'
        }
        }catch(e){log.error("error:",e)}
        return response.body;
    }

      /**
     * 调用亚马逊的接口拉取订单并创建cache表
     * @param {*} acc 
     * @param {*} orderid 
     */
    function getOrderAndCreateCache(acc,accountid, orderid) {

        var orders = [];
        var ss = "";
        log.debug("acc", acc);
        var auth = core.amazon.getAuthByAccountId(accountid);

        var params_1 = {};
        params_1["AmazonOrderId.Id.1"] = orderid;

        var content = core.amazon.mwsRequestMaker(auth, 'GetOrder', '2013-09-01', params_1, '/Orders/2013-09-01');
        log.debug('GetOrder-->content', content);
        //获取订单并解析成对象
        if (auth) {
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'Order'
            }).map(function (node) {
                orders.push({
                    AccID: acc,
                    latest_delivery_date: node.getElementsByTagName({
                        tagName: 'LatestDeliveryDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LatestDeliveryDate'
                    })[0].textContent : '',
                    latest_ship_date: node.getElementsByTagName({
                        tagName: 'LatestShipDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LatestShipDate'
                    })[0].textContent : '',
                    order_type: node.getElementsByTagName({
                        tagName: 'OrderType'
                    }).length ? node.getElementsByTagName({
                        tagName: 'OrderType'
                    })[0].textContent : '',
                    purchase_date: node.getElementsByTagName({
                        tagName: 'PurchaseDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PurchaseDate'
                    })[0].textContent : '',
                    is_replacement_order: node.getElementsByTagName({
                        tagName: 'IsReplacementOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsReplacementOrder'
                    })[0].textContent == 'true' : false,
                    last_update_date: node.getElementsByTagName({
                        tagName: 'LastUpdateDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LastUpdateDate'
                    })[0].textContent : '',
                    buyer_email: node.getElementsByTagName({
                        tagName: 'BuyerEmail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'BuyerEmail'
                    })[0].textContent : '',
                    amazon_order_id: node.getElementsByTagName({
                        tagName: 'AmazonOrderId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'AmazonOrderId'
                    })[0].textContent : '',
                    number_of_items_shipped: node.getElementsByTagName({
                        tagName: 'NumberOfItemsShipped'
                    }).length ? node.getElementsByTagName({
                        tagName: 'NumberOfItemsShipped'
                    })[0].textContent : '',
                    ship_service_level: node.getElementsByTagName({
                        tagName: 'ShipServiceLevel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShipServiceLevel'
                    })[0].textContent : '',
                    order_status: node.getElementsByTagName({
                        tagName: 'OrderStatus'
                    }).length ? node.getElementsByTagName({
                        tagName: 'OrderStatus'
                    })[0].textContent : '',
                    sales_channel: node.getElementsByTagName({
                        tagName: 'SalesChannel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'SalesChannel'
                    })[0].textContent : '',
                    is_business_order: node.getElementsByTagName({
                        tagName: 'IsBusinessOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsBusinessOrder'
                    })[0].textContent == 'true' : false,
                    number_of_items_unshipped: node.getElementsByTagName({
                        tagName: 'NumberOfItemsUnshipped'
                    }).length ? node.getElementsByTagName({
                        tagName: 'NumberOfItemsUnshipped'
                    })[0].textContent : '',
                    buyer_name: node.getElementsByTagName({
                        tagName: 'BuyerName'
                    }).length ? node.getElementsByTagName({
                        tagName: 'BuyerName'
                    })[0].textContent : '',
                    is_premium_order: node.getElementsByTagName({
                        tagName: 'IsPremiumOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsPremiumOrder'
                    })[0].textContent == 'true' : false,
                    earliest_delivery_date: node.getElementsByTagName({
                        tagName: 'EarliestDeliveryDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'EarliestDeliveryDate'
                    })[0].textContent : '',
                    earliest_ship_date: node.getElementsByTagName({
                        tagName: 'EarliestShipDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'EarliestShipDate'
                    })[0].textContent : '',
                    marketplace_id: node.getElementsByTagName({
                        tagName: 'MarketplaceId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'MarketplaceId'
                    })[0].textContent : '',
                    fulfillment_channel: node.getElementsByTagName({
                        tagName: 'FulfillmentChannel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'FulfillmentChannel'
                    })[0].textContent : '',
                    payment_method: node.getElementsByTagName({
                        tagName: 'PaymentMethod'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentMethod'
                    })[0].textContent : '',
                    is_prime: node.getElementsByTagName({
                        tagName: 'IsPrime'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsPrime'
                    })[0].textContent == 'true' : false,
                    shipment_service_level_category: node.getElementsByTagName({
                        tagName: 'ShipmentServiceLevelCategory'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShipmentServiceLevelCategory'
                    })[0].textContent : '',
                    seller_order_id: node.getElementsByTagName({
                        tagName: 'SellerOrderId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'SellerOrderId'
                    })[0].textContent : '',
                    shipped_byamazont_fm: node.getElementsByTagName({
                        tagName: 'ShippedByAmazonTFM'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShippedByAmazonTFM'
                    })[0].textContent == 'true' : false,
                    tfm_shipment_status: node.getElementsByTagName({
                        tagName: 'TFMShipmentStatus'
                    }).length ? node.getElementsByTagName({
                        tagName: 'TFMShipmentStatus'
                    })[0].textContent : '',
                    promise_response_due_date: node.getElementsByTagName({
                        tagName: 'PromiseResponseDueDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PromiseResponseDueDate'
                    })[0].textContent : '',
                    is_estimated_ship_date_set: node.getElementsByTagName({
                        tagName: 'IsEstimatedShipDateSet'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsEstimatedShipDateSet'
                    })[0].textContent == 'true' : false,
                    // 娉ㄦ剰锛岃繖閲岀洿鎺ュ彇鐨勪笅涓�灞傦紝鎵�浠ュ彧浼氬彇涓�涓�
                    payment_method_detail: node.getElementsByTagName({
                        tagName: 'PaymentMethodDetail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentMethodDetail'
                    })[0].textContent : '',
                    payment_execution_detail: node.getElementsByTagName({
                        tagName: 'PaymentExecutionDetail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentExecutionDetail'
                    })[0].textContent : '',
                    order_total: node.getElementsByTagName({
                        tagName: 'OrderTotal'
                    }).length ? {
                        currency_code: node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'CurrencyCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'CurrencyCode'
                        })[0].textContent : '',
                        amount: node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'Amount'
                        }).length ? Number(node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'Amount'
                        })[0].textContent) : 0,
                    } : {
                        currency_code: '_UNKNOW_',
                        amount: 0
                    },
                    shipping_address: node.getElementsByTagName({
                        tagName: 'ShippingAddress'
                    }).length ? {
                        city: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'City'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'City'
                        })[0].textContent : '',
                        postal_code: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'PostalCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'PostalCode'
                        })[0].textContent : '',
                        state_or_oegion: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'StateOrRegion'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'StateOrRegion'
                        })[0].textContent : '',
                        country_code: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'CountryCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'CountryCode'
                        })[0].textContent : '',
                        name: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'Name'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'Name'
                        })[0].textContent : '',
                        address_line1: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine1'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine1'
                        })[0].textContent : '',
                        address_line2: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine2'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine2'
                        })[0].textContent : ''
                    } : null,
                });
            });

        } else {
            throw "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[" + acc_id + "].";
        }
        log.debug("orders=", JSON.stringify(orders));

        //创建cache,实际上只会有一条数据
        for (var i = 0; i < orders.length; i++) {
            var order = orders[i];
            try {
                var r;
                search.create({
                    type: 'customrecord_aio_order_import_cache',
                    filters: [{
                            name: 'custrecord_aio_cache_acc_id',
                            operator: search.Operator.ANYOF,
                            values: order.AccID
                        },
                        {
                            name: 'custrecord_aio_cache_order_id',
                            operator: search.Operator.IS,
                            values: order.amazon_order_id
                        }
                    ]
                }).run().each(function (rec) {
                    r = record.load({
                        type: 'customrecord_aio_order_import_cache',
                        id: rec.id
                    });
                    return false;
                });
                if (!r) {
                    r = record.create({
                        type: 'customrecord_aio_order_import_cache'
                    });
                }
                var order_trandate = interfun.getFormatedDate("","",order.purchase_date).date
                var last_update_date =interfun.getFormatedDate("","",order.last_update_date).date
                r.setValue({
                  fieldId: 'custrecord_aio_cache_acc_id',
                  value: order.AccID
              });
              r.setValue({
                  fieldId: 'custrecord_aio_cache_body',
                  value: JSON.stringify(order)
              });
              r.setValue({
                  fieldId: 'custrecord_aio_cache_order_id',
                  value: order.amazon_order_id
              });
              r.setValue({
                  fieldId: 'custrecord_aio_cache_resolved',
                  value: false
              });
              r.setValue({
                  fieldId: 'custrecord_aio_cache_status',
                  value: order.order_status || ''
              });
              r.setValue({
                  fieldId: 'custrecord_aio_cache_version',
                  value: 1
              });
              r.setText({
                  fieldId: 'custrecord_trandate_amazonorder',
                  text: order_trandate
              });
              r.setValue({
                  fieldId: 'custrecord_text_trandate',
                  value: order.purchase_date
              });
              r.setText({
                  fieldId: 'custrecord_amazon_last_update_date',
                  text: last_update_date
              });
              r.setValue({
                  fieldId: 'custrecord_dps_cache_fulfillment_channel',
                  value:  order.fulfillment_channel
              });
                ss = r.save();
                log.debug("cache save success：", ss)
            } catch (e) {
                log.error("import cache error", e)
            }
        }

        return ss;
    }
    return {
        onRequest: onRequest
    }
});
