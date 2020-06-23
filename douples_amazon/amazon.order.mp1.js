/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 amazon.order.mp.js
 *@author Doris
 *@description 亚马逊抓单脚本/使用MP直接抓单
 */
define(["N/format", "N/runtime", "./Helper/core.min", "./Helper/CryptoJS.min",
    "./Helper/Moment.min", "N/log", "N/search", "N/record",  "N/encode", "N/https", "N/xml","./Helper/interfunction.min"
], function (format, runtime, core, cryptoJS, moment, log, search, record, encode, https, xml,interfun) {
    var tz = new Date().getTimezoneOffset()
    function getInputData() {
        var orders = [];
        try {
            var req = runtime.getCurrentScript().getParameter({
                name: 'custscript_listorder_date'
            });
            var request_acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_amazon_ord_store'
            });
            var request_start= runtime.getCurrentScript().getParameter({
                name: 'custscript_start_date'
            });
            var request_end = runtime.getCurrentScript().getParameter({
                name: 'custscript_end_date'
            });
            request_start = new Date(request_start.getTime() - tz*60*1000).toISOString()
            request_end = new Date(request_end.getTime() - tz*60*1000).toISOString()
            log.debug("店铺L:"+request_acc,"date end:"+request_end+",date request_start:"+request_start );
            core.amazon.getAccountList().map(function (account) {
                if(account.id != request_acc && request_acc ) return 
                last_updated_after = "2020-06-01T00:00:00.000Z";
                // last_updated_before = "2020-03-10T23:59:59.999Z";
                if (account.enabled_sites == 'AmazonUS') {
                    // 美国站点
                    log.audit("account.id " + account.id, "美国站点");
                    last_updated_after = "2020-05-31T16:00:00.000Z";
                    // last_updated_before = "2020-03-19T23:59:59.999Z";

                } else if (account.enabled_sites == 'AmazonUK') {
                    // 英国站点
                    log.audit("account.id " + account.id, "英国站点");

                    last_updated_after = "2020-06-01T00:00:00.000Z";
                    // last_updated_before = "2020-03-20T08:00:00.000Z";

                } else if (account.enabled_sites == 'AmazonDE' || account.enabled_sites == 'AmazonES' || account.enabled_sites == 'AmazonFR' || account.enabled_sites == 'AmazonIT') {
                    // 欧洲站点
                    log.audit("account.id " + account.id, "欧洲站点");

                    last_updated_after = "2020-06-01T01:00:00.000Z";
                    // last_updated_before = "2020-03-20T09:00:00.000Z";

                } else {
                    // 其他站点
                    log.audit("account.id " + account.id, "其他站点");
                    last_updated_after = "2020-06-01T00:00:00.000Z";
                    // last_updated_before = "2020-03-19T23:59:59.999Z";
                }


                // last_updated_before = "2020-03-19T23:59:59.999Z";
                if (req) {

                    // // 设置统一时间
                    // last_updated_after ="2020-06-01T00:00:00.000Z";
                    // last_updated_before = "2020-06-12T00:00:00.000Z";
                    var ssd = core1.handleit(account.id, request_start, request_end)
                    if (ssd)
                        ssd.map(function (order) {
                            orders.push(order);
                        })
                } else {

                    log.audit(' !request', account.id)
                    core1.handleit(account.id).map(function (order) {
                        orders.push(order);
                    })

                }

            })

        } catch (e) {
            log.error('getinput error 出错了', e);
        }
        log.audit("orders 总数：", orders.length)
        return orders;
    }

    function map(context) {
        var order = JSON.parse(context.value)
        log.debug("order:", context.value)
        // ====================进cache==============
       
        try {
            var r;
            search.create({
                type: 'customrecord_aio_order_import_cache',
                filters: [
                    {
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
            var ss = r.save();
            log.debug("11cache save success：", ss)
        } catch (e) {
            log.error("import cache error", e)
        }
        // =======================进cache==============end

    }

    function reduce(context) {

    }

    function summarize(summary) {
             log.debug('处理完成',summary)
    }

    var core1 = {
        handleit: function (acc_id, last_after, last_before) {
            var hid, last_update_date, nextToken, h, orders, cut_token;

            var enabled_sites;
            if (last_after || last_before) {
                log.debug("是自定义时间")
                search.create({
                    type: 'customrecord_aio_order_import_status',
                    filters: [{
                        name: 'custrecord_aio_importer_acc_id',
                        operator: search.Operator.ANYOF,
                        values: acc_id
                    }, ],
                    columns: [
                        /** token */
                        {
                            name: 'custrecord_aio_importer_next_token'
                        },
                        /** Last Updated After */
                        {
                            name: 'custrecord_aio_importer_last_updated_af'
                        },
                        /** Last Updated Before */
                        {
                            name: 'custrecord_aio_importer_last_updated_bf'
                        },
                        {
                            name: "custrecord_aio_enabled_sites",
                            join: "CUSTRECORD_AIO_IMPORTER_ACC_ID"
                        }
                    ]
                }).run().each(function (rec) {
                    hid = rec.id;
                    h = record.load({
                        type: 'customrecord_aio_order_import_status',
                        id: rec.id
                    });
                    nextToken = rec.getValue(rec.columns[0]);
                    last_update_date = last_after;
                    enabled_sites = rec.getText({
                        name: "custrecord_aio_enabled_sites",
                        join: "CUSTRECORD_AIO_IMPORTER_ACC_ID"
                    })
                    return false;
                });

                // last_update_date = last_after;
            } else {
                log.debug("不是自定义时间")
                search.create({
                    type: 'customrecord_aio_order_import_status',
                    filters: [{
                        name: 'custrecord_aio_importer_acc_id',
                        operator: search.Operator.ANYOF,
                        values: acc_id
                    }, ],
                    columns: [
                        /** token */
                        {
                            name: 'custrecord_aio_importer_next_token'
                        },
                        /** Last Updated After */
                        {
                            name: 'custrecord_aio_importer_last_updated_af'
                        },
                        /** Last Updated Before */
                        {
                            name: 'custrecord_aio_importer_last_updated_bf'
                        },
                        {
                            name: 'custrecord_dps_amazon_status_order_bf'
                        }
                    ]
                }).run().each(function (rec) {
                    hid = rec.id;
                    h = record.load({
                        type: 'customrecord_aio_order_import_status',
                        id: rec.id
                    });
                    nextToken = rec.getValue(rec.columns[0]);
                    last_update_date = rec.getValue('custrecord_dps_amazon_status_order_bf');
                    return false;
                });
            }

            log.error('last_update_date')
            var field_token = cut_token ? 'custrecord_nexttoken_cust' : 'custrecord_aio_importer_next_token';
            log.debug("field_token", field_token)

            if (!last_update_date) {
                last_update_date = "2020-06-12T00:00:00.000Z";
            }
            if (hid && nextToken) {
                if (nextToken == '-1') {
                    /** 寮?1?7鍚?鏂扮殑鍗曟嵁鑾峰弰1?7 */
                    log.debug("nextToken::::", nextToken + ",account: " + acc_id)
                    // return false;
                    var rtn_1 = core1.listOrders(acc_id, moment().utc(last_update_date).toISOString(), '', last_after, last_before);
                    log.audit('listOrders222');
                    log.error('rtn LastUpdatedBefore', moment(last_update_date).toISOString() + "------------------" + rtn_1.LastUpdatedBefore)
                    h.setValue({
                        // fieldId: 'custrecord_aio_importer_next_token',
                        fieldId: field_token,
                        value: rtn_1.token
                    });
                    // h.setValue({
                    //     fieldId: 'custrecord_aio_importer_last_updated_af',
                    //     value: last_update_date
                    // });
                    log.debug("1111111")
                    if(last_after)
                    h.setText({
                        fieldId: 'custrecord_aio_importer_last_updated_af',
                        text: moment(last_after).toDate()
                    });
                    if(last_before)
                    h.setText({
                        fieldId: 'custrecord_aio_importer_last_updated_bf',
                        text: moment(last_before).toDate()
                    });

                    if(last_after)
                    // 文本形式时间
                    h.setValue({
                        fieldId: 'custrecord_dps_amazon_status_order_af',
                        value: last_after
                    })
                    else
                    h.setValue({
                        fieldId: 'custrecord_dps_amazon_status_order_af',
                        value: last_update_date
                    })
                    h.setValue({
                        fieldId: 'custrecord_dps_amazon_status_order_bf',
                        value: rtn_1.LastUpdatedBefore
                    })

                    hid = h.save();
                    log.debug("123new Date()=====save()", hid)
                    return rtn_1.orders;
                } else {
                    log.audit('last_update_date3', last_update_date);
                    log.audit('date3', moment(last_update_date).toISOString());
                    // var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), nextToken);
                    var rtn = core1.listOrders(acc_id, last_update_date, nextToken);
                    log.audit('listOrders111');
                    log.error('rtn LastUpdatedBefore', last_update_date + "------------------" + rtn.LastUpdatedBefore)
                    h.setValue({
                        // fieldId: 'custrecord_aio_importer_next_token',
                        fieldId: field_token,
                        value: rtn.token
                    });

                    // 文本形式时间
                    // h.setValue({
                    //     fieldId: 'custrecord_dps_amazon_status_order_af',
                    //     value: last_update_date
                    // })
                    // h.setValue({
                    //     fieldId: 'custrecord_dps_amazon_status_order_bf',
                    //     value: rtn.LastUpdatedBefore
                    // })

                    hid = h.save();
                    log.debug("456new Date()=====save()", hid)
                    return rtn.orders;
                }

            } else {

                if (!hid) {
                    h = record.create({
                        type: 'customrecord_aio_order_import_status'
                    });
                    h.setValue({
                        fieldId: 'custrecord_aio_importer_acc_id',
                        value: acc_id
                    });
                }
                log.debug("当前店铺不存在转单状态, create", h)
                log.audit('else ! nextToken', last_update_date)
                log.audit('last_after, last_before', last_after + ' ' + last_before)
                // var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), '', last_after, last_before);
                var rtn = core1.listOrders(acc_id, last_update_date, '', last_after, last_before);

                log.error('rtn LastUpdatedBefore', moment(last_update_date).toISOString() + "------------------" + rtn.LastUpdatedBefore)

                log.audit('last_update_date2', last_update_date);

               if(last_after)
                // 文本形式时间
                h.setValue({
                    fieldId: 'custrecord_dps_amazon_status_order_af',
                    value: last_after
                })
                else
                h.setValue({
                    fieldId: 'custrecord_dps_amazon_status_order_af',
                    value: last_update_date
                })
                h.setValue({
                    fieldId: 'custrecord_dps_amazon_status_order_bf',
                    value: rtn.LastUpdatedBefore
                })

                if(last_update_date)
                h.setText({
                    fieldId: 'custrecord_aio_importer_last_updated_af',
                    // text: last_update_date
                    text: moment(last_update_date).toDate()
                });


                h.setValue({
                    fieldId: 'custrecord_aio_importer_last_updated_bf',
                    value: new Date()
                });

                // h.setText({
                //     fieldId: 'custrecord_aio_importer_last_updated_bf',
                //     // value: new Date()
                //     value: moment.utc(last_before).toDate()
                // });

                h.setValue({
                    // fieldId: 'custrecord_aio_importer_next_token',
                    fieldId: field_token,
                    value: rtn.token
                });
                hid = h.save();
                log.debug("new Date()=====save()", hid)
                return rtn.orders;
            }
        },

        listOrders: function (acc_id, last_updated_after, nextToken, last_after, last_before) {
            var orders = [],
                auth = core1.getAuthByAccountId(acc_id);

            // log.debug("last_after inlist:",last_after)
            // log.debug("last_before inlist:",last_before)
            // log.debug("last_update_date inlist:",last_updated_after)
            // log.audit('listOrder-->auth锛?1?7', auth);
            log.audit('listOrder-->last_updated_after', last_updated_after);

            // last_updated_after = "2020-03-05T00:00:00.000Z"

            if (auth) {
                try {
                    log.debug("authauthauthauth  =====", JSON.stringify(auth))
                    var content = void 0;
                    if (nextToken) {
                        content = core.amazon.mwsRequestMaker(auth, 'ListOrdersByNextToken', '2013-09-01', {
                            NextToken: nextToken,
                        }, '/Orders/2013-09-01');
                    } else {
                        if (last_after || last_before) {
                            log.debug("last_after:" + last_after, "last_before:" + last_before + ",marketplace_id：" + auth.marketplace_id)
                            content = core.amazon.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                                'MarketplaceId.Id.1': auth.marketplace_id,
                                // 'FulfillmentChannel.Channel.1': "MFN",
                                'LastUpdatedAfter': last_after,
                                'LastUpdatedBefore': last_before
                                // 'CreatedAfter': last_after,
                                // 'CreatedBefore': last_before
                            }, '/Orders/2013-09-01');
                        } else {
                            log.debug("auth", auth)
                            content = core.amazon.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                                'MarketplaceId.Id.1': auth.marketplace_id,
                                // 'FulfillmentChannel.Channel.1': "MFN",
                                'LastUpdatedAfter': last_updated_after,
                                // 'LastUpdatedAfter': "2019-12-20T18:33:09.806Z",
                                // 'CreatedAfter': "2019-12-20T18:33:09.806Z",
                            }, '/Orders/2013-09-01');
                        }
                    }

                } catch (e) {
                    log.error("mwsRequestMaker eororooror:", e)
                }
                log.audit('listOrder-->content', content);
                var res = xml.Parser.fromString({
                    text: content
                });
                res.getElementsByTagName({
                    tagName: 'Order'
                }).map(function (node) {
                    orders.push({
                        AccID: acc_id,
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
                        // 娉ㄦ剰锛岃繖閲岀洿鎺ュ彇鐨勪笅涓?1?7灞傦紝鎵?1?7浠ュ彧浼氬彇涓?1?7涓?1?7
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
                if (res.getElementsByTagName({
                        tagName: 'NextToken'
                    }).length > 0) {
                    return {
                        acc_id: acc_id,
                        orders: orders,
                        token: res.getElementsByTagName({
                            tagName: 'NextToken'
                        })[0].textContent,
                        LastUpdatedBefore: res.getElementsByTagName({
                            tagName: 'LastUpdatedBefore'
                        })[0].textContent
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
                        LastUpdatedBefore: res.getElementsByTagName({
                            tagName: 'LastUpdatedBefore'
                        })[0].textContent
                    };
                }
            } else {
                throw "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[" + acc_id + "].";
            }
        },
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
                    }
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
        },
        mwsRequestMaker: function (acc_id, auth, action, version, params, resource, body) {
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
            var queryString = keys.map(function (key) {
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
            log.debug('response', response);
            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    /** MWS閿欒??淇℃伅鍗曠嫭鍙戦?1?7?1?7 */
                    /*email.send({
                        author: -5,
                        recipients: ['mars.zhou@icloud.com'],
                        subject: 'MWS Request Error',
                        body: "Account: " + runtime.accountId + "<br /><br />Seller ID: " + auth.seller_id + "<br /><br />Action: " + action + "<br /><br />Params: <pre>" + JSON.stringify(params, null, 2) + "</pre><br /><br />Response: " + response.body + "<br /><br />",
                        attachments: body ? [file.create({ name: 'request.payload.xml', fileType: file.Type.XMLDOC, contents: body })] : [],
                    });*/
                    throw acc_id + " MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            return response.body;
        },
    };

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});