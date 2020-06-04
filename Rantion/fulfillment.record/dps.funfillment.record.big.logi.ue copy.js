/*
 * @Author         : Li
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-06-03 19:23:15
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

        // throw 'error'

        var type = context.type;

        var action_type = context.type;
        log.debug('action_type', action_type);
        // if (action_type == 'view') {
        var form = context.form;
        var bf_cur = context.newRecord;

        var bigRec_status = bf_cur.getValue('custrecord_dps_shipping_rec_status');
        log.debug('bigRec_status', bigRec_status);
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
        if (type == 'view' && bigRec_status == 8) {
            form.addButton({
                id: 'custpage_dps_li_sales_button',
                label: '重新WMS发运',
                functionName: "WMSShipping(" + bf_cur.id + ")"
            });
        }
        var tracking_number = bf_cur.getValue('custrecord_dps_ship_trackingnumber_dh');
        if (!tracking_number && bigRec_status == 3)
            form.addButton({
                id: 'custpage_dps_li_traking_button',
                label: '获取物流跟踪号',
                functionName: "getTrackingNumber(" + bf_cur.id + ")"
            });
        form.clientScriptModulePath = './dps.funfillment.record.big.logi.cs.js';
        // }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var af_rec = context.newRecord;

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


        var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');

        log.audit('rec_status', rec_status);

        // 1 FBA调拨
        // 2 自营仓调拨
        // 3 跨仓调拨
        // 4 移库

        var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type');


        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
        var type = 10;
        if (rec_status == 9 && tranor_type == 2) {
            type = 20;

            // 创建入库装运计划     createInboundShipmentPlan
            // TODO      货品信息 、 发出地点暂无

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
                        name: "custrecord_dps_ship_box_quantity",
                        join: "custrecord_dps_ship_box_fa_record_link"
                    },
                    {
                        name: "custrecord_dps_ship_box_item",
                        join: "custrecord_dps_ship_box_fa_record_link"
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
                                name: "custrecord_dps_ship_box_item",
                                join: "custrecord_dps_ship_box_fa_record_link"
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
                    SellerSKU = rec.getValue('custrecord_dps_amazon_sku_number');
                });

                var info = {
                    SellerSKU: SellerSKU,
                    ASIN: '',
                    Condition: '',
                    Quantity: Number(rec.getValue({
                        name: "custrecord_dps_ship_box_quantity",
                        join: "custrecord_dps_ship_box_fa_record_link"
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

                    // var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
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
                    var DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
                    reItem = rep[0].Items;
                    // log.audit('shipmentid1', shipmentid1);
                    // log.audit('DestinationFulfillmentCenterId', DestinationFulfillmentCenterId);
                    var id = record.submitFields({
                        type: af_rec.type,
                        id: af_rec.id,
                        values: {
                            custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                            custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                            custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                        }
                    });

                    var shipmentArr = [];
                    rep.map(function (arr, key) {
                        // var response1 = core.amazon.createInboundShipment(rec_account, address_id, arr.ShipmentId, arr.ShipmentId, arr.DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, arr.DestinationFulfillmentCenterId);
                        shipmentArr.push(response1);
                        log.debug(key + ' response1: ' + response1, arr);
                    });

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 10,
                            custrecord_dps_shipping_rec_shipmentsid: JSON.stringify(shipmentArr)
                        }
                    });

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

            }

        } else if (rec_status == 12) {


            log.debug('获取箱外标签', 'start');
            var shipmentId = 'FBA15MXJ31NX';

            var total_number = af_rec.getValue('custrecord_dps_total_number');
            var getRe
            try {
                getRe = core.amazon.getPalletLabels(rec_account, total_number, shipmentId);

            } catch (error) {
                log.error('获取箱唛出错了', error);
            }

            log.debug('getRe', getRe);
            // getRe

            log.debug('获取箱外标签', 'end');
            if (getRe) {
                var fileObj = file.create({
                    name: shipmentId + '.ZIP',
                    fileType: file.Type.ZIP,
                    contents: getRe,
                    // description: 'This is a plain text file.',
                    // encoding: file.Encoding.MAC_ROMAN,
                    folder: -15,
                    isOnline: true
                });

                var fileObj_id = fileObj.save();

                log.debug('fileObj_id', fileObj_id);
            }
        }

        var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

        try {
            if (rec_status == 1) {
                // 推送物流商, 获取追踪号
                // TODO
                pushOrder(af_rec);
            } else if (rec_status == 6 || rec_status == 7) {
                // recmachcustrecord_dps_ship_box_fa_record_link

                itemfulfillment(af_rec, tra_order_link);

            } else if (rec_status == 11 && tranor_type == 2) {
                // 11	未发运，等待获取Shipment

                // 直接上传Amazon, 获取 shipment
                // TODO Amazon 物流接口为完成

            } else if (rec_status == 3) {
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
            } else if (rec_status == 12) {

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


    function updateInboundShipment(account_id, recId, recType, shipment_id, shipment_status, order_contact) {
        var auth = core.getAuthByAccountId(account_id),
            bg_rec = record.load({
                type: recType,
                id: recId,
                isDynamic: true
            }),
            addr = core.getAddressById(Number(order_contact));
        var result_data = {};
        var inbound_shipment_name = bg_rec.getValue('custrecord_bulky_shipment_number');
        var shipment_status = bg_rec.getText('custrecord_bg_inbound_shipment_status');
        var inbound_dest_center_id = bg_rec.getValue('custrecord_bg_inbound_dest_center_id');
        var inbound_label_prep_type = bg_rec.getText('custrecord_bg_inbound_label_prep_type');
        if (auth && addr) {
            var params = {
                "ShipmentId": shipment_id,
                "InboundShipmentHeader.ShipmentName": inbound_shipment_name, //Yes

                "InboundShipmentHeader.ShipFromAddress.Name": addr.Name, //Yes
                "InboundShipmentHeader.ShipFromAddress.AddressLine1": addr.AddressLine1, //Yes
                "InboundShipmentHeader.ShipFromAddress.AddressLine2": addr.AddressLine2, //No
                "InboundShipmentHeader.ShipFromAddress.City": addr.City, //Yes
                "InboundShipmentHeader.ShipFromAddress.DistrictOrCounty": addr.DistrictOrCounty, //No
                "InboundShipmentHeader.ShipFromAddress.StateOrProvinceCode": addr.StateOrProvinceCode, //No
                "InboundShipmentHeader.ShipFromAddress.CountryCode": addr.CountryCode, //Yes
                "InboundShipmentHeader.ShipFromAddress.PostalCode": addr.PostalCode, //No

                "InboundShipmentHeader.DestinationFulfillmentCenterId": inbound_dest_center_id, //Yes
                "InboundShipmentHeader.ShipmentStatus": shipment_status, //Yes   WORKING SHIPPED CANCELLED

                "InboundShipmentHeader.IntendedBoxContentsSource": 'FEED', //No    NONE, FEED, 2D_BARCODE
                "InboundShipmentHeader.LabelPrepPreference": inbound_label_prep_type, //Yes   SELLER_LABEL AMAZON_LABEL_ONLY AMAZON_LABEL_PREFERRED 
            };
            var line_count = bg_rec.getLineCount({
                sublistId: 'recmachcustrecord_bulky_relative_shipping_rec'
            });
            for (var key = 0; key < line_count; key++) {
                params["InboundShipmentItems.member." + (key + 1) + ".QuantityShipped"] = bg_rec.getSublistValue({
                    sublistId: 'recmachcustrecord_bulky_relative_shipping_rec',
                    fieldId: 'custrecord_bulky_quantity',
                    line: key
                });
                params["InboundShipmentItems.member." + (key + 1) + ".SellerSKU"] = bg_rec.getSublistValue({
                    sublistId: 'recmachcustrecord_bulky_relative_shipping_rec',
                    fieldId: 'custrecord_bulky_platform_sku',
                    line: key
                });
            }
            log.debug('params', params);
            var response = core.mwsRequestMaker(auth, 'UpdateInboundShipment', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01');
            log.debug('response', response);
            var res = xml.Parser.fromString({
                text: response
            });
            var rtn_shipment_id = xml.XPath.select({
                node: res,
                xpath: "//nlapi:UpdateInboundShipmentResult/nlapi:ShipmentId"
            }).map(function (_) {
                return _.textContent;
            }).join('');
            if (rtn_shipment_id) {
                bg_rec.setText({
                    fieldId: 'custrecord_bg_inbound_shipment_status',
                    text: core.listInboundShipments(auth, null, [rtn_shipment_id]).shift().shipment_status
                });
                bg_rec.save();
                result_data.status = 'success';
                result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + rtn_shipment_id + "]\u6210\u529f";
                return result_data;
                return rtn_shipment_id;
            } else {
                result_data.status = 'error';
                result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + response;
                return result_data;
                throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + response;
            }
        } else {
            result_data.status = 'error';
            result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u65E0\u6CD5\u4ECE\u7CFB\u7EDF\u4E2D\u83B7\u53D6\u539F\u59CB SG Order\u7684\u57FA\u7840\u4FE1\u606F\uFF01";
            return result_data;
            throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u65E0\u6CD5\u4ECE\u7CFB\u7EDF\u4E2D\u83B7\u53D6\u539F\u59CB SG Order\u7684\u57FA\u7840\u4FE1\u606F\uFF01";
        }
    }

    function submitCartonContent(account_id, recId, recType, shipment_id) {
        var auth = core.getAuthByAccountId(account_id),
            bg_rec = record.load({
                type: recType,
                id: recId,
                isDynamic: true
            });

        var result_data = {};
        if (auth) {
            var params = {},
                carton_infos_1 = {};
            search.create({
                type: recType,
                filters: [{
                    name: 'custrecord_dps_shipping_rec_shipmentsid',
                    operator: 'is',
                    values: shipment_id
                }],
                columns: [{
                        name: 'internalid',
                        sort: search.Sort.ASC
                    },
                    {
                        join: "CUSTRECORD_DPS_SHIP_BOX_FA_RECORD_LINK",
                        name: "custrecord_dps_ship_box_sku"
                    },
                    {
                        join: "CUSTRECORD_DPS_SHIP_BOX_FA_RECORD_LINK",
                        name: "custrecord_dps_ship_box_quantity"
                    },
                    {
                        name: 'custrecord_dps_ship_box_box_number',
                        join: 'CUSTRECORD_DPS_SHIP_BOX_FA_RECORD_LINK'
                    }
                ]
            }).run().each(function (b) {

                var boxinfo = {
                    sku: b.getValue({
                        join: "CUSTRECORD_DPS_SHIP_BOX_FA_RECORD_LINK",
                        name: "custrecord_dps_ship_box_sku"
                    }),
                    qty: b.getValue({
                        join: "CUSTRECORD_DPS_SHIP_BOX_FA_RECORD_LINK",
                        name: "custrecord_dps_ship_box_quantity"
                    }),
                    qty_in_case: 1,
                }
                if (carton_infos_1.hasOwnProperty("box_" + b.getValue(b.columns[3]))) {
                    carton_infos_1["box_" + b.getValue(b.columns[3])].push(boxinfo);
                } else {
                    carton_infos_1["box_" + b.getValue(b.columns[3])] = [boxinfo];
                }
                return true;
            });
            log.audit('carton_infos', carton_infos_1);
            // 提交装箱单信息
            var body_1 = '<?xml version="1.0" encoding="utf-8"?>' +
                '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">' +
                '<Header>' +
                '<DocumentVersion>1.01</DocumentVersion>' +
                '<MerchantIdentifier>' + auth.seller_id + '</MerchantIdentifier>' +
                '</Header>' +
                '<MessageType>CartonContentsRequest</MessageType>' +
                '<Message>' +
                '<MessageID>1</MessageID>' +
                '<CartonContentsRequest>' +
                '<ShipmentId>' + shipment_id + '</ShipmentId>' +
                '<NumCartons>' + Object.keys(carton_infos_1).length + '</NumCartons>';
            Object.keys(carton_infos_1).map(function (carton_id) {
                body_1 += "<Carton><CartonId>" + carton_id.replace('box_', '') + "</CartonId>";
                carton_infos_1["" + carton_id].map(function (item) {
                    body_1 += "<Item><SKU>" + item.sku + "</SKU><QuantityShipped>" + item.qty + "</QuantityShipped><QuantityInCase>" + item.qty_in_case + "</QuantityInCase></Item>";
                });
                body_1 += "</Carton>";
            });
            body_1 += '</CartonContentsRequest></Message></AmazonEnvelope>';
            params['FeedType'] = "_POST_FBA_INBOUND_CARTON_CONTENTS_";
            params['PurgeAndReplace'] = 'true';
            params['ContentMD5Value'] = encode.convert({
                string: core.md5(body_1),
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            });
            log.audit('md5', core.md5(body_1));
            log.audit('params', params);
            log.audit('body', body_1);
            var content = core.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', params, '/', body_1);
            var res = xml.Parser.fromString({
                text: content
            });
            if (res.getElementsByTagName({
                    tagName: 'FeedProcessingStatus'
                }).length > 0) {
                var feed = record.create({
                    type: 'customrecord_aio_amazon_feed',
                    isDynamic: true
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_account',
                    value: account_id
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_submission_id',
                    value: core.getTextContentSafe(res, 'FeedSubmissionId')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_type',
                    value: core.getTextContentSafe(res, 'FeedType')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_submitted_date',
                    value: core.getTextContentSafe(res, 'SubmittedDate')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_processing_status',
                    value: core.getTextContentSafe(res, 'FeedProcessingStatus')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_started_processing_date',
                    value: core.getTextContentSafe(res, 'StartedProcessingDate')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_completed_processing_date',
                    value: core.getTextContentSafe(res, 'CompletedProcessingDate')
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_body',
                    value: body_1
                });
                feed.setValue({
                    fieldId: 'custrecord_aio_feed_bg',
                    value: recId
                });
                feed.save();

                bg_rec.setValue({
                    fieldId: 'custrecord_bg_feed_submission_id',
                    value: core.getTextContentSafe(res, 'FeedSubmissionId')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_feed_type',
                    value: core.getTextContentSafe(res, 'FeedType')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_submitted_date',
                    value: core.getTextContentSafe(res, 'SubmittedDate')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_feed_processing_status',
                    value: core.getTextContentSafe(res, 'FeedProcessingStatus')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_started_processing_date',
                    value: core.getTextContentSafe(res, 'StartedProcessingDate')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_completed_processing_date',
                    value: core.getTextContentSafe(res, 'CompletedProcessingDate')
                });
                bg_rec.setValue({
                    fieldId: 'custrecord_bg_feed_body',
                    value: body_1
                });

                result_data.status = 'success';
                result_data.message = res.getElementsByTagName({
                    tagName: 'FeedProcessingStatus'
                })[0].textContent;
                return result_data
                return res.getElementsByTagName({
                    tagName: 'FeedProcessingStatus'
                })[0].textContent;
            } else {
                result_data.status = 'error';
                result_data.message = "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                return result_data
                throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
            }
        } else {
            result_data.status = 'error';
            result_data.message = "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            return result_data
            throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
        }
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
                        submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber)
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


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});