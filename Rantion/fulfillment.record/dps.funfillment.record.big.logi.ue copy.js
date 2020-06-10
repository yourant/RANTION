/*
 * @Author         : Li
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-06-09 17:33:09
 * @LastEditors    : Li
 * @Description    : 发运记录 大包
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.ue copy.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', '../../douples_amazon/Helper/core.min', 'N/log', 'N/http',
    'SuiteScripts/dps/logistics/jetstar/dps_logistics_request.js',
    'SuiteScripts/dps/logistics/openapi/dps_openapi_request.js',
    'SuiteScripts/dps/logistics/yanwen/dps_yanwen_request.js',
    'SuiteScripts/dps/logistics/endicia/dps_endicia_request.js',
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml", 'N/runtime'
], function (record, search, core, log, http, jetstar, openapi, yanwen, endicia, Moment, file, xml, runtime) {


    function beforeLoad(context) {

        var type = context.type;

        var action_type = context.type;
        log.debug('action_type', action_type);
        var form = context.form;
        var bf_cur = context.newRecord;

        var bigRec_status = bf_cur.getValue('custrecord_dps_shipping_rec_status');
        log.debug('beforeLoad bigRec_status', bigRec_status);
        if (type == 'view' && bigRec_status == 4) {
            form.addButton({
                id: 'custpage_dps_li_sales_button',
                label: '重新获取物流信息',
                functionName: "reacquireLogistics(" + bf_cur.id + ")"
            });
        }
        if (type == 'view' && bigRec_status == 11) {
            form.addButton({
                id: 'custpage_dps_li_sales_button',
                label: '重新获取Shipment',
                functionName: "amazonShipment(" + bf_cur.id + ")"
            });
        }
        if (type == 'view' && bigRec_status == 8 || bigRec_status == 9) {
            form.addButton({
                id: 'custpage_dps_li_sales_button',
                label: 'WMS发运',
                functionName: "WMSShipping(" + bf_cur.id + ")"
            });
        }
        var tracking_number = bf_cur.getValue('custrecord_dps_ship_trackingnumber_dh');
        if (!tracking_number && bigRec_status == 3) {
            form.addButton({
                id: 'custpage_dps_li_traking_button',
                label: '获取物流跟踪号',
                functionName: "getTrackingNumber(" + bf_cur.id + ")"
            });
        }
        var label = bf_cur.getValue('custrecord_fulfill_dh_label_addr')
        var channel = bf_cur.getText("custrecord_dps_shipping_r_channel_dealer")
        var logistStatus = bf_cur.getValue('custrecord_dps_push_state');
        if (!label && logistStatus == "成功" && channel == "捷士") {
            form.addButton({
                id: 'custpage_dps_li_get_label',
                label: '获取面单',
                functionName: "getLabel(" + bf_cur.id + ")"
            });
        }
        form.clientScriptModulePath = './dps.funfillment.record.big.logi.cs.js';
    }

    function beforeSubmit(context) {
        log.debug('beforeSubmit', context.newRecord);
    }

    function afterSubmit(context) {

        var af_rec1 = context.newRecord;

        log.audit('af_rec1', af_rec1);

        af_rec = record.load({
            type: af_rec1.type,
            id: af_rec1.id
        });


        var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');

        log.audit('rec_status', rec_status);

        // 1 FBA调拨
        // 2 自营仓调拨
        // 3 跨仓调拨
        // 4 移库

        var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type'); // 调拨单类型
        log.debug('tranor_type', tranor_type);


        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account'); // 店铺
        var type = 10;


        var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

        try {

            if (rec_status == 6 || rec_status == 7) {
                // recmachcustrecord_dps_ship_box_fa_record_link

                itemfulfillment(af_rec, tra_order_link);

            } else if (rec_status == 3 || rec_status == 10) {
                // 推送 WMS, 获取装箱信息

                var rec_transport = af_rec.getValue('custrecord_dps_shipping_rec_transport');
                var shippingType;

                if (rec_transport == 1) {
                    shippingType = 10;
                } else if (rec_transport == 3) {
                    shippingType = 30;
                } else {
                    shippingType = 20;
                }


                var numLines = af_rec.getLineCount({
                    sublistId: 'item'
                });

                var owner = af_rec.getValue('owner');

                var message = {};
                // 获取token
                var token = getToken();
                if (token) {
                    var data = {};

                    search.create({
                        type: 'customrecord_dps_shipping_record',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: af_rec.id
                        }],
                        columns: [
                            'custrecord_dps_shipping_rec_order_num',
                            // 'owner',
                            'custrecord_dps_shipping_rec_currency',
                            'custrecord_dps_declared_value_dh',
                            'custrecord_dps_shipping_rec_account',
                            'custrecord_dps_shipping_r_channelservice',
                            'custrecord_dps_shipping_r_channel_dealer',
                            'custrecord_dps_shipping_rec_shipments',
                            'custrecord_dps_shipping_rec_location',
                            'custrecord_dps_shipping_rec_to_location',
                            'custrecord_dps_shipping_rec_transa_subje',
                            'custrecord_dps_shipping_rec_logistics_no',
                            'custrecord_dps_f_b_purpose', // 用途
                            'custrecord_dps_declare_currency_dh', // 申报币种
                            'custrecord_dps_shipping_rec_shipmentsid', // shipmentId
                            'custrecord_dps_ship_record_tranor_type', // 状态
                            {
                                name: 'custrecord_dps_wms_location',
                                join: 'custrecord_dps_shipping_rec_location'
                            }, // 仓库编号
                            {
                                name: 'custrecord_dps_wms_location_name',
                                join: 'custrecord_dps_shipping_rec_location'
                            }, // 仓库名称
                            {
                                name: 'custrecord_dps_wms_location',
                                join: 'custrecord_dps_shipping_rec_to_location'
                            }, // 目标仓库编号
                            {
                                name: 'custrecord_dps_wms_location_name',
                                join: 'custrecord_dps_shipping_rec_to_location'
                            }, // 目标仓库名称
                            {
                                name: 'custrecord_ls_service_code',
                                join: 'custrecord_dps_shipping_r_channelservice'
                            }, // 渠道服务代码

                            {
                                name: 'custrecord_ls_bubble_count',
                                join: 'custrecord_dps_shipping_r_channelservice'
                            }, // 计泡基数
                            {
                                name: "entityid",
                                join: "owner"
                            }, // 拥有者

                            {
                                name: 'custrecord_aio_marketplace',
                                join: 'custrecord_dps_shipping_rec_account'
                            }, // 站点 / 市场
                        ]
                    }).run().each(function (rec) {

                        data["shippingType"] = shippingType;
                        data["aono"] = rec.getValue('custrecord_dps_shipping_rec_order_num');
                        data["createBy"] = rec.getValue({
                            name: "entityid",
                            join: "owner"
                        });

                        data["marketplaces"] = rec.getText({
                            name: 'custrecord_aio_marketplace',
                            join: 'custrecord_dps_shipping_rec_account'
                        });
                        data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

                        data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));

                        // data["declarePrice"] = rec.getValue('custrecord_dps_declared_value_dh');
                        data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

                        data["countBubbleBase"] = Number(rec.getValue({
                            name: 'custrecord_ls_bubble_count',
                            join: 'custrecord_dps_shipping_r_channelservice'
                        }));
                        data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                        data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer');
                        data["logisticsLabelPath"] = 'logisticsLabelPath';

                        data["logisticsProviderCode"] = rec.getValue({
                            name: 'custrecord_ls_service_code',
                            join: 'custrecord_dps_shipping_r_channelservice'
                        });

                        data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
                        data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                        data["sourceWarehouseCode"] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_dps_shipping_rec_location'
                        });
                        data["sourceWarehouseName"] = rec.getValue({
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_dps_shipping_rec_location'
                        });

                        data["targetWarehouseCode"] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_dps_shipping_rec_to_location'
                        });
                        data["targetWarehouseName"] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_dps_shipping_rec_to_location'
                        });
                        data["taxFlag"] = 1;
                        data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                        var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                        var b = a.split(':');
                        data["tradeCompanyName"] = b[b.length - 1];

                        if (rec.getValue('custrecord_dps_ship_record_tranor_type') == 1) {
                            type = 20;
                            data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                        }
                        data["type"] = type;
                        // data["type"] = af_rec.getText('custrecord_dps_ship_record_tranor_type');
                        data["waybillNo"] = rec.id; // 运单号
                    });

                    var taxamount;
                    var item_info = [];
                    var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
                    var numLines = af_rec.getLineCount({
                        sublistId: subli_id
                    });

                    search.create({
                        type: 'customrecord_dps_shipping_record_item',
                        filters: [{
                            name: 'custrecord_dps_shipping_record_parentrec',
                            operator: 'anyof',
                            values: af_rec.id
                        }],
                        columns: [{
                                join: 'custrecord_dps_shipping_record_item',
                                name: 'custitem_dps_msku'
                            },
                            {
                                name: 'custrecord_dps_f_b_purpose',
                                join: 'custrecord_dps_shipping_record_parentrec'
                            },
                            {
                                join: 'custrecord_dps_shipping_record_item',
                                name: 'custitem_dps_fnsku'
                            },
                            {
                                name: 'custitem_aio_asin',
                                join: 'custrecord_dps_shipping_record_item'
                            },
                            {
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_dps_shipping_record_item'
                            },
                            {
                                name: 'custitem_dps_picture',
                                join: 'custrecord_dps_shipping_record_item'
                            },
                            {
                                name: 'itemid',
                                join: 'custrecord_dps_shipping_record_item'
                            },
                            {
                                name: 'custrecord_dps_ship_record_sku_item'
                            },
                            {
                                name: 'custrecord_dps_ship_record_item_quantity'
                            },

                            {
                                name: 'custitem_dps_weight',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 产品重量(cm),
                            {
                                name: 'custitem_dps_high',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 产品高(cm),
                            {
                                name: 'custitem_dps_long',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 产品长(cm),
                            {
                                name: 'custitem_dps_wide',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 产品宽(cm),
                            {
                                name: 'custitem_dps_brand',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 品牌名称,
                            {
                                name: 'custitem_dps_declaration_us',
                                join: 'custrecord_dps_shipping_record_item'
                            }, // 产品英文标题,

                            {
                                name: 'custitem_dps_use',
                                join: 'custrecord_dps_shipping_record_item'
                            }

                        ]
                    }).run().each(function (rec) {

                        var it = {
                            purpose: rec.getValue({
                                name: 'custitem_dps_use',
                                join: 'custrecord_dps_shipping_record_item'
                            }),
                            brandName: rec.getText({
                                name: 'custitem_dps_brand',
                                join: 'custrecord_dps_shipping_record_item'
                            }),
                            asin: rec.getValue({
                                name: 'custitem_aio_asin',
                                join: 'custrecord_dps_shipping_record_item'
                            }),
                            fnsku: rec.getValue({
                                join: 'custrecord_dps_shipping_record_item',
                                name: 'custitem_dps_fnsku'
                            }),
                            msku: rec.getValue({
                                join: 'custrecord_dps_shipping_record_item',
                                name: 'custitem_dps_msku'
                            }),
                            englishTitle: rec.getValue({
                                name: 'custitem_dps_declaration_us',
                                join: 'custrecord_dps_shipping_record_item'
                            }),
                            productImageUrl: rec.getValue({
                                name: 'custitem_dps_picture',
                                join: 'custrecord_dps_shipping_record_item'
                            }) ? rec.getValue({
                                name: 'custitem_dps_picture',
                                join: 'custrecord_dps_shipping_record_item'
                            }) : 'productImageUrl',
                            productTitle: rec.getValue({
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_dps_shipping_record_item'
                            }) ? rec.getValue({
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_dps_shipping_record_item'
                            }) : 'productTitle',
                            productHeight: Number(rec.getValue({
                                name: 'custitem_dps_high',
                                join: 'custrecord_dps_shipping_record_item'
                            })),

                            productLength: Number(rec.getValue({
                                name: 'custitem_dps_weight',
                                join: 'custrecord_dps_shipping_record_item'
                            })),

                            productWeight: Number(rec.getValue({
                                name: 'custitem_dps_weight',
                                join: 'custrecord_dps_shipping_record_item'
                            })),
                            productWidth: Number(rec.getValue({
                                name: 'custitem_dps_weight',
                                join: 'custrecord_dps_shipping_record_item'
                            })),

                            sku: rec.getValue({
                                name: 'itemid',
                                join: 'custrecord_dps_shipping_record_item'
                            }),
                            qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
                        };
                        taxamount = rec.getValue({
                            name: 'taxamount',
                            join: 'custrecord_dps_trans_order_link'
                        });
                        item_info.push(it);

                    });

                    if (Number(taxamount) > 0) {
                        data["taxFlag"] = 1;
                    } else {
                        data["taxFlag"] = 0;
                    }
                    data['allocationDetailCreateRequestDtos'] = item_info

                    // 发送请求
                    message = sendRequest(token, data);
                } else {
                    message.code = 1;
                    message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
                }

                log.debug('message', message);
                var flag;
                if (message.data.code == 0) {
                    flag = 14;
                } else {
                    flag = 8;
                }

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: flag,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    }
                });

            } else if (rec_status == 9 && tranor_type == 1) {
                type = 20;

                // 创建入库装运计划     createInboundShipmentPlan

                var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

                var ship_to_country_code = "",
                    address_id = {},
                    label_prep_preference = "SELLER_LABEL",
                    items = [],
                    sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

                search.create({
                    type: af_rec.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: af_rec.id
                    }],
                    columns: [{
                            name: "custrecord_dps_shipping_record_item",
                            join: "custrecord_dps_shipping_record_parentrec"
                        },
                        {
                            name: "custrecord_dps_ship_record_item_quantity",
                            join: "custrecord_dps_shipping_record_parentrec"
                        },
                        {
                            name: 'custrecord_cc_country_code',
                            join: 'custrecord_dps_recipient_country_dh'
                        }
                    ]
                }).run().each(function (rec) {

                    ship_to_country_code = rec.getValue({
                        name: 'custrecord_cc_country_code',
                        join: 'custrecord_dps_recipient_country_dh'
                    });
                    var SellerSKU;
                    search.create({
                        type: 'customrecord_dps_amazon_seller_sku',
                        filters: [{
                                name: 'custrecord_dps_amazon_ns_sku',
                                operator: 'anyof',
                                values: rec.getValue({
                                    name: "custrecord_dps_shipping_record_item",
                                    join: "custrecord_dps_shipping_record_parentrec"
                                })
                            },
                            {
                                name: 'custrecord_dps_store',
                                operator: 'anyof',
                                values: rec_account
                            }
                        ],
                        columns: [
                            'custrecord_dps_amazon_sku_number'
                        ]
                    }).run().each(function (rec) {
                        SellerSKU = rec.getText('custrecord_dps_amazon_sku_number');
                    });

                    var info = {
                        SellerSKU: SellerSKU ? SellerSKU : 'EC1197-FH-FBA', // 这里使用固定 seller SKU 替代一下
                        ASIN: '',
                        Condition: '',
                        Quantity: Number(rec.getValue({
                            name: "custrecord_dps_ship_record_item_quantity",
                            join: "custrecord_dps_shipping_record_parentrec"
                        })),
                        QuantityInCase: '',
                    }
                    items.push(info);

                });

                log.debug('items', items);

                var shipping_rec_location = af_rec.getValue('custrecord_dps_shipping_rec_location');

                if (shipping_rec_location) {

                    search.create({
                        type: 'location',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: shipping_rec_location
                        }],
                        columns: [
                            'custrecord_aio_country_sender', // 国家
                            'custrecord_aio_sender_state', // 州
                            'custrecord_aio_sender_city', // 城市
                            // 'custrecord_aio_country_sender', // 地址2
                            'custrecord_aio_sender_address', // 地址1
                            'custrecord_aio_sender_name', // 发件人
                            'custrecord_aio_sender_address_code', // 邮编

                            {
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_aio_country_sender'
                            }

                        ]
                    }).run().each(function (rec) {
                        address_id = {
                            Name: rec.getValue('custrecord_aio_sender_name'),
                            AddressLine1: rec.getValue('custrecord_aio_sender_address'),
                            AddressLine2: '', //其他街道地址信息（ 如果需要）。 否,
                            City: rec.getText('custrecord_aio_sender_city'),
                            DistrictOrCounty: '', //  区或县。 否,
                            StateOrProvinceCode: rec.getValue('custrecord_aio_sender_state'),
                            CountryCode: rec.getValue({
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_aio_country_sender'
                            }),
                            PostalCode: rec.getValue('custrecord_aio_sender_address_code'),
                        };

                    });
                }

                var shipping_rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                var DestinationFulfillmentCenterId = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
                log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

                var reItem = [];
                if (!shipping_rec_shipmentsid) {
                    try {

                        log.debug('申请shipmentID', '申请shipmentID');
                        // 创建入库计划, 获取 shipment

                        log.error('createInboundShipmentPlan items', items);
                        ship_to_country_code = '';

                        var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
                        var rep;
                        try {
                            rep = JSON.parse(response);
                        } catch (error) {
                            rep = response;
                        }

                        log.debug('response', response);
                        log.debug('rep', rep);
                        var shipmentid1 = rep[0].ShipmentId;
                        shipping_rec_shipmentsid = shipmentid1;
                        DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
                        reItem = rep[0].Items;


                        var ShipToAddress = rep[0].ShipToAddress;

                        log.debug('ShipToAddress', JSON.stringify(ShipToAddress));
                        var Name = ShipToAddress.Name,
                            AddressLine1 = ShipToAddress.AddressLine1,
                            AddressLine2 = ShipToAddress.AddressLine2,
                            City = ShipToAddress.City,
                            DistrictOrCounty = ShipToAddress.DistrictOrCounty,
                            StateOrProvinceCode = ShipToAddress.StateOrProvinceCode,

                            CountryCode = ShipToAddress.CountryCode,
                            PostalCode = ShipToAddress.PostalCode;

                        var cityId, countryId;
                        if (City) {

                            search.create({
                                type: 'customrecord_dps_port',
                                filters: [{
                                    name: 'name',
                                    operator: 'is',
                                    values: City
                                }]
                            }).run().each(function (rec) {
                                cityId = rec.id;
                            });

                            if (!cityId) {
                                var newCi = record.create({
                                    type: 'customrecord_dps_port'
                                });

                                newCi.setValue({
                                    fieldId: 'name',
                                    value: City
                                });

                                cityId = newCi.save();
                                log.debug('cityId', cityId);
                            }
                        }

                        if (CountryCode) {
                            search.create({
                                type: 'customrecord_country_code',
                                filters: [{
                                    name: 'custrecord_cc_country_code',
                                    operator: 'is',
                                    values: CountryCode
                                }]
                            }).run().each(function (rec) {
                                countryId = rec.id;
                            });

                            if (!countryId) {
                                var newCode = record.create({
                                    type: 'customrecord_country_code'
                                });

                                newCode.setValue({
                                    fieldId: 'name',
                                    value: CountryCode
                                });

                                newCode.setValue({
                                    fieldId: 'custrecord_cc_country_code',
                                    value: CountryCode
                                });

                                countryId = newCode.save();

                                log.debug('countryId', countryId);
                            }
                        }


                        // "ShipToAddress": {
                        //     "id": "",
                        //     "Name": "LGB3",
                        //     "AddressLine1": "4950 Goodman Way",
                        //     "AddressLine2": "",
                        //     "City": "Eastvale",
                        //     "DistrictOrCounty": "",
                        //     "StateOrProvinceCode": "CA",
                        //     "CountryCode": "US",
                        //     "PostalCode": "91752-5087"
                        // }

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_country_regi: CountryCode,
                                custrecord_dps_ship_small_recipient_dh: Name, // 收件人
                                custrecord_dps_street2_dh: AddressLine2, // 收件人地址2
                                custrecord_dps_street1_dh: AddressLine1, // 收件地址1
                                custrecord_dps_state_dh: StateOrProvinceCode, // 收件州
                                custrecord_dps_recipient_city_dh: cityId, // 收件城市
                                custrecord_dps_recipien_code_dh: PostalCode, // 收件邮编
                                custrecord_dps_recipient_country_dh: countryId, // 收件国家

                                custrecord_dps_shipping_rec_status: 15,
                                custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                                custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                                custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });

                        var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 16,
                            }
                        });

                        log.debug('response1', response1);

                        var upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                        log.debug('upresp', upresp);

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 10,
                            }
                        });

                        // 10 已获取Shipment号， 等待装箱

                    } catch (error) {
                        log.error('创建入库计划,获取shipment失败了', error);

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 11,
                                // custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                            }
                        });

                    }

                    // 1 未发运， 等待获取物流单号
                    // 2 匹配物流失败， 手动处理
                    // 3 已获取物流单号， 等待发运
                    // 4 获取物流信息失败
                    // 6 WMS已发运
                    // 7 WMS已部分发运
                    // 8 WMS发运失败
                    // 9 未发运， 等待获取Shipment
                    // 10 已获取Shipment号， 等待装箱
                    // 11 申请Shipment失败
                    // 12 WMS已装箱
                    // 13 WMS已部分装箱
                    // 14 已推送WMS
                    // 15 已创建入库计划
                    // 16 已创建入库件
                    // 17 已获取标签
                    // 18 已更新入库件
                    // 19 已推送 标签文件

                }

            } else if (rec_status == 12) {

                var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

                log.debug('rec_account', rec_account);

                var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                log.debug('rec_shipmentsid', rec_shipmentsid);

                var total_number = af_rec.getValue('custrecord_dps_total_number');
                log.debug('total_number', total_number);
                var getRe;

                log.debug('获取箱外标签', 'start');

                try {
                    getRe = core.amazon.getPalletLabels(rec_account, total_number, rec_shipmentsid);

                } catch (error) {
                    log.error('获取箱唛出错了', error);
                }

                log.debug('getRe', getRe);

                log.debug('获取箱外标签', 'end');
                if (getRe) {
                    var fileObj = file.create({
                        name: rec_shipmentsid + '.ZIP',
                        fileType: file.Type.ZIP,
                        contents: getRe,
                        // description: 'This is a plain text file.',
                        // encoding: file.Encoding.MAC_ROMAN,
                        folder: -15,
                        isOnline: true
                    });

                    var fileObj_id = fileObj.save();

                    log.debug('fileObj_id', fileObj_id);

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 17,
                            custrecord_dps_shipment_label_file: fileObj_id
                            // custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                        }
                    });

                    var id = record.attach({
                        record: {
                            type: 'file',
                            id: fileObj_id
                        },
                        to: {
                            type: af_rec.type,
                            id: af_rec.id
                        }
                    });
                    log.debug('id', id);
                }

                pushOrder(af_rec);
            } else if (rec_status == 17) {


                // NsCallbackForUpdateBoxRequestDto {
                //     aono(string): 调拨单号,
                //     boxLabelPath(string): 箱外标签文件路径,
                //     logisticsChannelCode(string): 物流渠道服务编号,
                //     logisticsChannelName(string): 物流渠道服务名称,
                //     logisticsLabelPath(string): 物流面单文件路径,
                //     logisticsProviderCode(string): 物流渠道商编号,
                //     logisticsProviderName(string): 物流渠道商名称
                // }

                var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label;
                search.create({
                    type: af_rec.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: af_rec.id
                    }],
                    columns: [{
                            name: "url",
                            join: "file"
                        },
                        {
                            name: 'custrecord_ls_service_code',
                            join: 'custrecord_dps_shipping_r_channelservice'
                        }, // 渠道服务代码
                        'custrecord_dps_shipping_r_channelservice', // 渠道服务
                        'custrecord_dps_shipping_r_channel_dealer', //渠道商
                        'custrecord_dps_shipping_rec_order_num', // 调拨单号
                    ]
                }).run().each(function (rec) {
                    aono = rec.getValue('custrecord_dps_shipping_rec_order_num');
                    fileId = rec.getValue({
                        name: "url",
                        join: "file"
                    });
                    service_code = rec.getValue({
                        name: 'custrecord_ls_service_code',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    });
                    channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
                    channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
                    channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                    Label = rec.getValue('custrecord_fulfill_dh_label_addr'); // 面单地址
                })

                if (fileId) {

                    var account = runtime.accountId;
                    log.debug("Account ID for the current user: ", runtime.accountId);

                    var url = 'https://';
                    if (account.indexOf('_SB1') > -1) {
                        var ac = account.replace('_SB1', '');
                        url += ac + '-sb1.app.netsuite.com';
                    } else {
                        url += account;
                    }
                    url += fileId;

                    log.debug('url', url);

                    var data = {
                        aono: aono, // 调拨单号
                        boxLabelPath: url, // 箱外标签文件路径,
                        logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                        logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                        logisticsLabelPath: Label, //(string): 物流面单文件路径,
                        logisticsProviderCode: channel_dealer, //(string): 物流渠道商编号,
                        logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                    };

                    var token = getToken();
                    if (token) {
                        var headerInfo = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'access_token': token
                        };
                        var response = http.post({
                            url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster/callbackForBox',
                            headers: headerInfo,
                            body: JSON.stringify(data)
                        });
                        log.debug('response', JSON.stringify(response));
                        retdata = JSON.parse(response.body);
                        var code;
                        log.audit('retdata', retdata);
                        if (response.code == 200) {
                            // 调用成功
                            if (retdata.code == 0) {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 19,
                                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(retdata.data)
                                    }
                                });
                            } else {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 20,
                                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(retdata.data)
                                    }
                                });
                            }
                            code = retdata.code;
                        } else {
                            code = -1;
                            // 调用失败

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: af_rec.id,
                                values: {
                                    // custrecord_dps_shipping_rec_status: 19,
                                    custrecord_dps_shipping_rec_wms_info: 'Token 失效了'
                                }
                            });
                        }

                        log.debug('code', code);
                    }
                }
            }
        } catch (error) {
            log.error('出错了', error);
        }

    }


    /**
     * 获取token
     */
    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 1
            }],
            columns: ['custrecord_wtr_token']
        }).run().each(function (result) {
            token = result.getValue('custrecord_wtr_token');
        });
        return token;
    }

    /**
     * 发送请求
     * @param {*} token 
     * @param {*} data 
     */
    function sendRequest(token, data) {

        log.debug('sendRequest data', data);
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        retdata = JSON.parse(response.body);
        if (response.code == 0) {
            // 调用成功
            code = retdata.code;
        } else {
            code = 1;
            // 调用失败
        }
        message.code = code;
        message.data = retdata;
        return message;
    }


    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemfulfillment(rec, link) {

        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemfulfillment',
            // isDynamic: true,
        });

        objRecord.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });

        var numLines = rec.getLineCount({
            sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link'
        });
        var item_ful = objRecord.getLineCount({
            sublistId: 'item'
        });

        log.audit('numLines: ' + numLines, 'item_ful: ' + item_ful);

        var line_num = [];
        for (var i = 0; i < numLines; i++) {

            var ful_item = rec.getSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_item',
                line: i,
            });

            log.debug('ful_item', ful_item);
            for (var j = 0; j < item_ful; j++) {
                var ful_quantity = 0;

                var obj_item = objRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: j,
                });

                log.debug('obj_item == ful_item', obj_item == ful_item);
                ful_quantity = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                    fieldId: 'custrecord_dps_ship_box_quantity',
                    line: i,
                });


                log.debug('obj_item', obj_item);
                if (obj_item == ful_item) {

                    log.debug('obj_item == ful_item', obj_item == ful_item);
                    ful_quantity = rec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                        fieldId: 'custrecord_dps_ship_box_quantity',
                        line: i,
                    });

                    ful_quantity += ful_quantity;
                    log.debug('ful_quantity', ful_quantity);

                    line_num.push(i);
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: j,
                        value: ful_quantity
                    });

                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: true,
                        line: j
                    });
                }
            }
        }
        var objRecord_id = objRecord.save();
        log.debug('objRecord_id', objRecord_id);
        var itemreceipt_id;

        var tranor_type = rec.getValue('custrecord_dps_ship_record_tranor_type');
        if (objRecord_id /* && tranor_type == 3 */ ) {
            itemreceipt_id = itemreceipt(link);
            log.debug('itemreceipt_id', itemreceipt_id);
        }

        var load_af_rec = record.load({
            type: rec.type,
            id: rec.id
        });

        for (var z = 0; z < line_num.length; z++) {
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_itemfulfillment',
                value: objRecord_id,
                line: line_num[z]
            });
            if (itemreceipt_id) {
                load_af_rec.setSublistValue({
                    sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                    fieldId: 'custrecord_dps_ship_box_itemreceipt',
                    value: itemreceipt_id,
                    line: line_num[z]
                });
            }
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_ship_ns',
                value: true,
                line: line_num[z]
            });
        }
        var load_af_rec_id = load_af_rec.save();
        log.debug('load_af_rec_id', load_af_rec_id);

        return
    }

    /**
     * 接受库存转移单的货品
     * @param {*} rec 
     */
    function itemreceipt(link) {
        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemreceipt',
            // isDynamic: true,
        });

        var obj_id = objRecord.save();

        return obj_id || false;
    }


    /**
     * 推送发运记录给渠道商
     * @param {*} rec 
     */
    function pushOrder(rec) {
        var channel = rec.getText("custrecord_dps_shipping_r_channel_dealer")
        var result
        log.audit('channel', channel);
        switch (channel) {
            case "捷士":
                jetstarApi.init(http, search)
                var result = jetstarApi.Create(rec, "big");
                log.audit('result', result);
                if (result.code == 200) {
                    var shipment_id = result.data.shipment_id;
                    var labelresult = jetstarApi.GetLabels(shipment_id, '');
                    if (labelresult.code == 200) {
                        var trackingNumber = labelresult.data.shipment.tracking_number;
                        var single_pdf = labelresult.data.shipment.single_pdf
                        // var custrecord_dps_store
                        submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber, single_pdf);
                    }
                } else {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: rec.id,
                        values: {
                            custrecord_dps_push_state: "失败",
                            custrecord_dps_shipping_rec_status: 4,
                            custrecord_dps_push_result: result.msg
                        }
                    });
                }
                break
        }
    }

    // 获取到物流追踪号, 不需要推送 WMS
    function submitIdAndTackingNumber(id, shipment_id, trackingNumber, labeladdr) {
        var values = {
            custrecord_dps_push_state: "成功",
            custrecord_dps_push_result: "",
            // custrecord_dps_shipping_rec_status: 3
        }
        if (shipment_id) values.custrecord_dps_shipping_rec_logistics_no = shipment_id
        if (trackingNumber) values.custrecord_dps_ship_small_trackingnumber = trackingNumber
        if (labeladdr) values.custrecord_fulfill_dh_label_addr = labeladdr
        record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: id,
            values: values
        });
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});