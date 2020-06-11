/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-06-10 21:00:50
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.transferorder.ue.js
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
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml", 'N/runtime', 'N/redirect', 'N/https', 'N/http'
], function (record, search, core, log, http, jetstar, openapi, yanwen, endicia, Moment, file, xml, runtime, redirect, https, http) {

    //  大货发运记录字段 - 地点需要带出的收件人信息字段   config
    const receiptInfo_corr = {
        "custrecord_dps_contact_phone": "custrecord_aio_contact_information", //收件人联系方式
        "custrecord_dps_street1_dh": "custrecord_aio_sender_address", //收件人地址
        "custrecord_dps_recipient_city_dh": "custrecord_aio_sender_city", //城市
        "custrecord_dps_recipient_country_dh": "custrecord_aio_country_sender", //国家
        "custrecord_dps_recipien_code_dh": "custrecord_aio_sender_address_code", //邮编
        "custrecord_dps_ship_small_recipient_dh": "custrecord_aio_sender_name", //收件人名称
        "custrecord_dps_state_dh": "custrecord_aio_sender_state" //州
    }

    function beforeLoad(context) {
        var type = context.type;
        var bl_rec = context.newRecord;
        var link = bl_rec.getValue('custbody_dps_fu_rec_link');
        var link_status;
        if (link) {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: link
                }],
                columns: ['custrecord_dps_shipping_rec_status']
            }).run().each(function (rec) {
                link_status = rec.getValue('custrecord_dps_shipping_rec_status');
            });
            /*
            if (type == 'edit' && (link_status == 14 || link_status == 10 || link_status == 3)) {
                // 这些状态下,  不允许更改库存转移订单
                redirect.toRecord({
                    type: bl_rec.type,
                    id: bl_rec.id
                });
            }
            */
            if (type == 'view') {

                var transferor_type = bl_rec.getValue('custbody_dps_transferor_type');
                if (transferor_type == 7) {
                    var form = context.form;
                    form.addButton({
                        id: 'custpage_dps_li_get_label_button',
                        label: '获取标签',
                        functionName: "getPalletLabels(" + bl_rec.id + ")"
                    });

                    form.addButton({
                        id: 'custpage_dps_li_get_label_button',
                        label: '调拨单发运',
                        functionName: "fulfillment(" + bl_rec.id + ")"
                    });

                    form.clientScriptModulePath = './dps.funfillment.record.transferorder.cs.js';
                }
            }
        }
    }

    function beforeSubmit(context) {
        var bsRec = context.newRecord;
        bsRec.setValue({
            fieldId: 'orderstatus',
            value: 'B'
        });

    }

    function afterSubmit(context) {
        var af_rec = context.newRecord;
        var orderstatus = af_rec.getValue('orderstatus');
        if (orderstatus == 'B') {
            try {
                // 创建大货发运记录
                var rec_id = createFulRecord(af_rec);

                if (rec_id) {
                    record.submitFields({
                        type: af_rec.type,
                        id: af_rec.id,
                        values: {
                            'custbody_dps_fu_rec_link': rec_id
                        }
                    });

                    if (rec_id && context.type == 'create') {
                        var con = record.load({
                            type: 'customrecord_dps_shipping_record',
                            id: rec_id
                        });
                        sub(con);
                    }
                    log.debug('context.type', context.type);

                }
            } catch (error) {
                log.error('error', error);
            }
        } else {
            log.debug('else status', orderstatus);
        }
    }


    function sub(context) {

        var af_rec = context;

        log.audit('af_rec', af_rec);

        var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');

        log.audit('rec_status', rec_status);

        // 1 FBA调拨
        // 2 自营仓调拨
        // 3 跨仓调拨
        // 4 移库

        var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type');
        log.debug('tranor_type', tranor_type);


        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
        var type = 10;


        var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

        try {
            // if (rec_status == 1) {
            if (rec_status == 12) {
                // WMS 分箱回传, 推送物流
                pushOrder(af_rec);

            }
            if (rec_status == 3 || rec_status == 10) {
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


                            // {
                            //     name: 'taxamount',
                            //     join: 'custrecord_dps_trans_order_link'
                            // }
                        ]
                    }).run().each(function (rec) {

                        var it = {
                            purpose: rec.getValue({
                                name: 'custrecord_dps_f_b_purpose',
                                join: 'custrecord_dps_shipping_record_parentrec'
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
                    // log.error('item_info', item_info);
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

            }
            if (rec_status == 9 && tranor_type == 1) {
                type = 20;

                // 创建入库装运计划     createInboundShipmentPlan

                var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

                var ship_to_country_code = "",
                    address_id = {},
                    label_prep_preference = "SELLER_LABEL",
                    items = [],
                    sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

                // var numLines = af_rec.getLineCount({
                //     sublistId: sub_id
                // });

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
                            // },
                            // {
                            //     name: 'custrecord_dps_store',
                            //     operator: 'anyof',
                            //     values: rec_account
                        }],
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

                if (rec_account) {
                    var shipping_rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                    var DestinationFulfillmentCenterId = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
                    log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

                    var reItem = [],
                        recordID = af_rec.id,
                        upresp;

                    var str = '';
                    if (!shipping_rec_shipmentsid) {
                        try {

                            log.debug('申请shipmentID', '申请shipmentID');
                            // 创建入库计划, 获取 shipment

                            log.error('createInboundShipmentPlan items', items);

                            var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
                            var rep;
                            try {
                                rep = JSON.parse(response);
                            } catch (error) {
                                rep = response;
                            }


                            if (util.isArray(response)) {
                                log.debug('createInboundShipmentPlan response', response);
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
                                    id: recordID,
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

                                // var id = record.submitFields({
                                //     type: 'customrecord_dps_shipping_record',
                                //     id: af_rec.id,
                                //     values: {
                                //         custrecord_dps_shipping_rec_status: 15,
                                //         custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                                //         custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                                //         custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                                //     }
                                // });

                                var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                                if (util.isObject(response1)) {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: af_rec.id,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 16,
                                            custrecord_dps_shipment_info: JSON.stringify(response1)
                                        }
                                    });
                                } else {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: af_rec.id,
                                        values: {
                                            // custrecord_dps_shipping_rec_status: 16,
                                            custrecord_dps_shipment_info: '创建入库件成功'
                                        }
                                    });
                                }

                                log.debug('response1', response1);

                                try {

                                    upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                                    log.debug('upresp', upresp);

                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: af_rec.id,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 10,
                                            custrecord_dps_shipment_info: '更新入库件成功'
                                        }
                                    });
                                } catch (error) {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: af_rec.id,
                                        values: {
                                            // custrecord_dps_shipping_rec_status: 18,
                                            custrecord_dps_shipment_info: JSON.stringify(error)
                                        }
                                    });
                                }
                            } else {
                                log.audit('不属于数组', rep);

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        // custrecord_dps_shipping_rec_status: 18,
                                        custrecord_dps_shipment_info: JSON.stringify(rep)
                                    }
                                });
                            }


                        } catch (error) {

                            log.error('创建入库计划,获取shipment失败了', error);

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: af_rec.id,
                                values: {
                                    custrecord_dps_shipping_rec_status: 11,
                                    custrecord_dps_shipment_info: JSON.stringify(error)
                                }
                            });

                        }

                        try {
                            if (upresp) {
                                wms(af_rec);
                            }
                        } catch (error) {
                            log.error('推送 WMS 失败', error);
                        }

                    }

                } else {
                    var id = record.submitFields({
                        type: af_rec.type,
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 11,
                            custrecord_dps_shipment_info: '店铺为空'
                        }
                    });
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
                var result = jetstarApi.Create(rec, "big")
                log.audit('result', result);
                if (result.code == 200) {
                    var shipment_id = result.data.shipment_id
                    var labelresult = jetstarApi.GetLabels(shipment_id, '')
                    if (labelresult.code == 200) {
                        var trackingNumber = labelresult.data.shipment.tracking_number
                        submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber);
                        wms(af_rec);
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


    function wms(af_rec) {
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
                } else {
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_order_num');
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
            // log.error('item_info', item_info);
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

    }

    function submitIdAndTackingNumber(id, shipment_id, trackingNumber) {
        var values = {
            custrecord_dps_push_state: "成功",
            custrecord_dps_push_result: "",
            custrecord_dps_shipping_rec_status: 3
        }
        if (shipment_id) values.custrecord_dps_shipping_rec_logistics_no = shipment_id
        if (trackingNumber) values.custrecord_dps_ship_small_trackingnumber = trackingNumber
        record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: id,
            values: values
        });
    }


    /**
     * 创建大货发运记录
     * @param {*} rec 
     */
    function createFulRecord(rec) {
        var objRecord;
        var link = rec.getValue('custbody_dps_fu_rec_link');
        var link_status;
        if (link) {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: link
                }]
            }).run().each(function (rec) {
                link_status = rec.getValue('custrecord_dps_shipping_rec_status');
            });
            objRecord = record.load({
                type: 'customrecord_dps_shipping_record',
                id: link
            });

            // 若对应的发运记录为 "WMS已发运" 或者 "WMS一部分发运" 直接退出,不做任何修改
            var rec_status = objRecord.getValue('custrecord_dps_shipping_rec_status');
            if (rec_status == 6 || rec_status == 7) {
                return;
            }
        } else {
            objRecord = record.create({
                type: 'customrecord_dps_shipping_record'
            });
        }
        if (link_status == 1 || link_status == 4 || link_status == 9 || link_status == 11) {

        }
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_location',
            value: rec.getValue('location')
        });

        // 1 FBA调拨
        // 2 自营仓调拨
        // 3 跨仓调拨
        var tran_type = rec.getValue('custbody_dps_transferor_type');
        log.audit('tran_type', tran_type);
        // 调拨单类型
        objRecord.setValue({
            fieldId: 'custrecord_dps_ship_record_tranor_type',
            value: Number(tran_type)
        });
        var s;
        if (tran_type) {
            if (tran_type == 2) { // 2	自营仓调拨
                s = 3;
            } else if (tran_type == 1) { // 1	FBA调拨
                s = 9;
            } else if (tran_type == 3) { // 3	跨仓调拨
                s = 3;
            }
            log.debug('s', s);
            if (!link_status) {
                objRecord.setValue({
                    fieldId: 'custrecord_dps_shipping_rec_status',
                    value: s
                });
            }
        }

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_department',
            value: rec.getValue('department')
        });
        // 渠道商
        var channel_dealer = rec.getValue('custbody_dps_transferor_channel_dealer');
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_r_channel_dealer',
            text: channel_dealer
        });
        var channelservice = rec.getValue('custbody_dps_transferor_channelservice');
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_r_channelservice',
            text: channelservice
        });
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_transa_subje',
            value: rec.getValue('subsidiary')
        });
        objRecord.setValue({
            fieldId: 'custrecord_dps_trans_order_link',
            value: rec.id
        });

        // 2020.6.10 16:50
        var target_loca = rec.getValue('custbody_actual_target_warehouse')
        search.create({
            type: "location",
            filters: [{
                name: "internalidnumber",
                operator: "equalto",
                values: target_loca
            }],
            columns: [{
                    name: "custrecord_aio_contact_information"
                },
                {
                    name: "custrecord_aio_sender_address"
                },
                {
                    name: "custrecord_aio_sender_city"
                },
                {
                    name: "custrecord_aio_country_sender"
                },
                {
                    name: "custrecord_aio_sender_address_code"
                },
                {
                    name: "custrecord_aio_sender_name"
                },
                {
                    name: "custrecord_aio_sender_state"
                }
            ]
        }).run().each(function (e) {
            for (key in receiptInfo_corr) {
                objRecord.setValue({
                    fieldId: key,
                    value: e.getValue(receiptInfo_corr[key])
                });
            }
        })
        // ===============================================
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_to_location',
            value: target_loca
        });
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_create_date',
            value: rec.getValue('trandate')
        });
        var account = rec.getValue('custbody_aio_account');
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_account',
            value: account
        });
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_order_num',
            value: rec.id
        });
        var weight = getItemWeight(rec);
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_weight',
            value: weight
        });
        var employee = rec.getValue('employee');
        var numLines = rec.getLineCount({
            sublistId: 'item'
        });
        // 渠道商
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_r_channel_dealer',
            value: rec.getValue('custbody_dps_transferor_channel_dealer')
        });
        // 渠道服务
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_r_channelservice',
            value: rec.getValue('custbody_dps_transferor_channelservice')
        });
        for (var i = 0; i < numLines; i++) {
            var item_sku = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_dps_trans_order_item_sku',
                line: i
            });
            var item = rec.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            // if (account) {
            //     try {
            //         item_sku = searchItemSku(item, account);
            //     } catch (error) {
            //         log.error('获取货品对应的SKU出错了', error);
            //     }
            // }
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_sku_item',
                line: i,
                value: item_sku
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_shipping_record_item',
                line: i,
                value: item
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_item_location',
                line: i,
                value: rec.getValue('transferlocation')
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_rec_item_account',
                line: i,
                value: rec.getValue('custbody_aio_account')
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_item_quantity',
                line: i,
                value: rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                })
            });
        }
        var objRecord_id;
        objRecord_id = objRecord.save();

        var la_rec = record.load({
            type: 'customrecord_dps_shipping_record',
            id: objRecord_id
        });
        var la_rec_id = la_rec.save();
        log.debug('la_rec_id', la_rec_id);
        log.debug('objRecord_id', objRecord_id);
        return objRecord_id || false;
    }

    /**
     * 获取货品的所有重量
     * @param {*} rec 
     */
    function getItemWeight(rec) {
        var weight = 0;
        var limit = 3999;
        search.create({
            type: rec.type,
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: rec.id
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
                name: 'weight',
                join: 'item'
            }]
        }).run().each(function (rec) {
            weight = rec.getValue({
                name: 'weight',
                join: 'item'
            });
            return --limit > 0;
        });
        return weight || 0;
    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});