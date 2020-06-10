/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-06-08 21:47:05
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
            if (type == 'edit' && (link_status == 14 || link_status == 10 || link_status == 3)) {
                // 这些状态下,  不允许更改库存转移订单
                redirect.toRecord({
                    type: bl_rec.type,
                    id: bl_rec.id
                });
            }

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
                // var rec_id = '1034';
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
                    /*
                    if (context.type == 'create') {
                        var info = searchItemInfo(af_rec.id);
                        var subsidiary = af_rec.getValue('subsidiary');
                        if (info && info.length) {
                            // 创建报关资料
                            var informaId = createInformation(rec_id, af_rec.id);
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: rec_id,
                                values: {
                                    custrecord_dps_shipping_rec_information: informaId
                                }
                            });
                            log.debug('informaId', informaId);
                            if (informaId) {
                                // 创建报关发票
                                createCusInv(info, informaId);

                                // 创建报关装箱
                                var boxId = createBoxRec(info, informaId);
                                log.debug('boxId', boxId);

                                // 创建报关合同
                                var conId = createContract(info, informaId, subsidiary);
                                log.debug('conId', conId);

                                // 创建报关单
                                var decId = createDeclaration(info, informaId);
                                log.debug('decId', decId);

                                // 创建报关要素
                                var eleArr = CreateElementsOfDeclaration(info, informaId);
                                log.debug('eleArr', eleArr);

                                // 创建 US 开票资料
                                var usbArr = createUSBillInformation(info, informaId);
                                log.debug('usbArr', usbArr);
                            }
                        }


                    }

                    */
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

        // af_rec = record.load({
        //     type: af_rec1.type,
        //     id: af_rec1.id
        // });

        // 1	未发运，等待获取物流单号
        // 2	匹配物流失败，手动处理
        // 3	已获取物流单号，等待发运
        // 4	获取物流信息失败
        // 6	WMS已发运
        // 7	WMS已部分发运
        // 8	WMS发运失败
        // 9	未发运，等待获取Shipment
        // 10	已获取Shipment号，等待装箱
        // 11	申请Shipment失败
        // 12	WMS已装箱
        // 13	WMS已部分装箱
        // 14	已推送WMS
        // 15	已创建入库计划
        // 16	已创建入库件
        // 17	已获取标签


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
                // 推送物流商, 获取追踪号
                // TODO
                pushOrder(af_rec);
            } else if (rec_status == 6 || rec_status == 7) {
                // recmachcustrecord_dps_ship_box_fa_record_link

                itemfulfillment(af_rec, tra_order_link);

            } else if (rec_status == 11 && tranor_type == 1) {
                // 11	未发运，等待获取Shipment

                // 直接上传Amazon, 获取 shipment
                // TODO Amazon 物流接口为完成

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

            } else if (rec_status == 9 && tranor_type == 1) {
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
                        upresp;
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

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: recordID,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 15,
                                        custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                                        custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                                        custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                                    }
                                });

                                var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                                if (util.isObject(response1)) {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 16,
                                            custrecord_dps_shipment_info: str + '\n' + JSON.stringify(response1)
                                        }
                                    });
                                } else {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            // custrecord_dps_shipping_rec_status: 16,
                                            custrecord_dps_shipment_info: str + '\n' + '创建入库件成功'
                                        }
                                    });
                                }

                                log.debug('response1', response1);

                                try {

                                    upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                                    log.debug('upresp', upresp);

                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 18,
                                            custrecord_dps_shipment_info: str + '\n' + '更新入库件成功'
                                        }
                                    });
                                } catch (error) {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            // custrecord_dps_shipping_rec_status: 18,
                                            custrecord_dps_shipment_info: str + '\n' + JSON.stringify(error)
                                        }
                                    });
                                }
                            } else {
                                log.audit('不属于数组', rep);

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: recordID,
                                    values: {
                                        // custrecord_dps_shipping_rec_status: 18,
                                        custrecord_dps_shipment_info: str + '\n' + JSON.stringify(rep)
                                    }
                                });
                            }

                            /*
                            log.debug('response', response);
                            log.debug('rep', rep);
                            var shipmentid1 = rep[0].ShipmentId;
                            shipping_rec_shipmentsid = shipmentid1;
                            DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
                            reItem = rep[0].Items;
                            // log.audit('shipmentid1', shipmentid1);
                            // log.audit('DestinationFulfillmentCenterId', DestinationFulfillmentCenterId);
                            var id = record.submitFields({
                                type: af_rec.type,
                                id: af_rec.id,
                                values: {
                                    custrecord_dps_shipping_rec_status: 15,
                                    custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                                    custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                                    custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
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

                            upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                            log.debug('upresp', upresp);

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: af_rec.id,
                                values: {
                                    custrecord_dps_shipping_rec_status: 18,
                                }
                            });

                            */

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

                        // } else {
                        //     var upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                        //     log.debug('upresp', upresp);
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



            } else if (rec_status == 12) {


                var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                // try {
                //     rec_shipmentsid = JSON.parse(rec_shipmentsid);
                // } catch (error) {
                //     log.audit('装换数据出错了', error);

                // }
                var total_number = af_rec.getValue('custrecord_dps_total_number');
                var getRe;
                /*
                rec_shipmentsid.map(function (shipmentId) {

                    getRe = core.amazon.getPalletLabels(rec_account, total_number, shipmentId);

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

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 11,
                                // custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                            }
                        });

                        var id = record.attach({
                            record: {
                                type: 'file',
                                id: fileId
                            },
                            to: {
                                type: af_rec.type,
                                id: af_rec.id
                            }
                        });
                        log.debug('id', id);
                    }
                });
                */

                log.debug('获取箱外标签', 'start');
                var shipmentId = 'FBA15MXJ31NX';

                // var total_number = af_rec.getValue('custrecord_dps_total_number');
                // var getRe
                try {
                    getRe = core.amazon.getPalletLabels(rec_account, total_number, rec_shipmentsid);

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

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 11,
                            // custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                        }
                    });

                    var id = record.attach({
                        record: {
                            type: 'file',
                            id: fileId
                        },
                        to: {
                            type: af_rec.type,
                            id: af_rec.id
                        }
                    });
                    log.debug('id', id);
                }
            } else if (rec_status == 17) {

                var fileId;
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
                    }]
                }).run().each(function (rec) {
                    fileId = rec.getValue({
                        name: "url",
                        join: "file"
                    });
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
                        aono: af_rec.getValue('custrecord_dps_shipping_rec_order_num'),
                        boxLabelPath: url
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
                            code = retdata.code;
                        } else {
                            code = -1;
                            // 调用失败
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
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_to_location',
            value: rec.getValue('custbody_actual_target_warehouse')
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
        // if (link && (link_status == 1 || link_status == 4 || link_status == 9 || link_status == 11)) {
        //     objRecord_id = objRecord.save();
        // } else if (!link) {
        //     objRecord_id = objRecord.save();
        // }

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

    /**
     * 根据 货品ID, 获取对应的 SKU
     * @param {*} itemId 
     * @param {*} account 
     */
    function searchItemSku(itemId, account) {
        var info;
        search.create({
            type: 'customrecord_dps_amazon_seller_sku',
            filters: [{
                    name: 'custrecord_dps_amazon_ns_sku',
                    operator: 'anyof',
                    values: itemId
                },
                {
                    name: 'custrecord_dps_store',
                    operator: 'anyof',
                    values: account
                }
            ],
            columns: [
                'custrecord_dps_amazon_sku_number',
                {
                    name: 'weight',
                    join: 'custrecord_dps_amazon_ns_sku'
                }
            ]
        }).run().each(function (rec) {
            info = rec.getValue('custrecord_dps_amazon_sku_number');
            return false;
        });
        return info || false;
    }

    /**
     * 获取对应的库存转移订单的信息
     * @param {*} t_o_id 
     */
    function searchItemInfo(t_o_id) {
        var info = [];
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: t_o_id
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
            columns: [
                'rate', 'item', 'quantity', "taxamount",
                {
                    name: 'custitem_dps_declaration_cn',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_brand',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_unit',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_declare',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_customs_code',
                    join: 'item'
                },

            ]
        }).run().each(function (rec) {
            if (rec.getValue('quantity') > 0) {
                var it = {
                    itemId: rec.getValue('item'),
                    name: rec.getValue({
                        name: 'custitem_dps_declaration_cn',
                        join: 'item'
                    }),
                    rate: rec.getValue('rate'),
                    qty: rec.getValue('quantity'),
                    brand: rec.getValue({
                        name: 'custitem_dps_brand',
                        join: 'item'
                    }),
                    brandName: rec.getText({
                        name: 'custitem_dps_brand',
                        join: 'item'
                    }),
                    taxamount: rec.getValue("taxamount"),
                    util: rec.getValue({
                        name: 'custitem_dps_unit',
                        join: 'item'
                    }),
                    declare: rec.getValue({
                        name: 'custitem_dps_declare',
                        join: 'item'
                    }),
                    code: rec.getValue({
                        name: 'custitem_dps_customs_code',
                        join: 'item'
                    }),

                }
                info.push(it);
            }
            return true;
        });
        return info || false;
    }

    /**
     * 创建报关发票
     * @param {*} itemInfo 
     * @param {*} informaId 
     */
    function createCusInv(itemInfo, informaId) {
        var inv = record.create({
            type: 'customrecord_dps_customs_invoice'
        });
        inv.setValue({
            fieldId: 'custrecord_dps_cus_inv_information',
            value: informaId
        });
        var subId = 'recmachcustrecord_dps_c_i_item_link';
        for (var i = 0, len = itemInfo.length; i < len; i++) {
            var temp = itemInfo[i];
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_qty',
                line: i,
                value: temp.qty
            });
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_name',
                line: i,
                value: temp.name
            });
            // FIXME 发票的单价, 有待处理
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_pric',
                line: i,
                value: temp.rate
            });
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_inv_item_amount',
                line: i,
                value: Number(temp.rate) * Number(temp.qty)
            });
        }
        var inv_id = inv.save();
        return inv_id || false;
    }

    /**
     * 创建报关装箱单
     * @param {*} info 
     */
    function createBoxRec(info, informaId) {
        var boxRec = record.create({
            type: 'customrecord_dps_packing_documents'
        });
        boxRec.setValue({
            fieldId: 'custrecord_dps_p_declaration_informa',
            value: informaId
        });
        var subId = 'recmachcustrecord_dps_z_b_l_links';
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docu_item_id',
                value: temp.itemId,
                line: i
            });
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docu_item_name',
                value: temp.name,
                line: i
            });
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docum_item_qty',
                value: temp.qty,
                line: i
            });
        }
        var boxRecId = boxRec.save();
        return boxRecId || false;
    }

    /**
     * 创建报关合同
     * @param {*} info 
     */
    function createContract(info, informId, sub) {
        var con = record.create({
            type: 'customrecord_dps_customs_contract'
        });
        con.setValue({
            fieldId: 'custrecord_dps_c_c_seller',
            value: sub
        });
        con.setValue({
            fieldId: 'custrecord_dps_c_c_information',
            value: informId
        });
        var subId = 'recmachcustrecord_dps_c_c_li_links';
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_i_item_name',
                line: i,
                value: temp.name
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_qty',
                line: i,
                value: temp.qty
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_util_price',
                line: i,
                value: temp.rate
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_amount',
                line: i,
                value: Number(temp.rate) * Number(temp.qty)
            });
        }
        var conId = con.save();
        return conId || false;
    }


    /**
     * 创建报关单
     * @param {*} info 
     */
    function createDeclaration(info, informaId) {
        var dec = record.create({
            type: 'customrecord_dps_customs_declaration'
        });
        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_infomation_link',
            value: informaId
        });
        var subId = 'recmachcustrecord_dps_customs_decla_item_link'
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_declara_item_num',
                value: temp.code,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_name',
                value: temp.name,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_qty',
                value: temp.qty,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item',
                value: temp.itemId,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custom_decl_item_un_price',
                value: temp.rate,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custo_decl_total_amount',
                value: Number(temp.rate) * Number(temp.qty),
                line: i
            });
        }
        var decId = dec.save();
        return decId || false;
    }

    /**
     * 创建申报要素
     * @param {*} info 
     */
    function CreateElementsOfDeclaration(info, informaId) {
        var recArr = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var elem = record.create({
                type: 'customrecord_dps_elements_declaration'
            });
            var temp = info[i];
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_name',
                value: temp.name
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_total_number',
                value: temp.qty
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_brand',
                value: temp.brandName
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_other_reporti',
                value: temp.declare
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_information',
                value: informaId
            });
            var elemId = elem.save();
            if (elemId) {
                recArr.push(elemId);
            }
        }
        return recArr || false;
    }

    /**
     * 创建US开票资料
     * @param {*} info 
     * @param {*} invId 
     */
    function createUSBillInformation(info, informaId) {
        var USBil = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            var usbil = record.create({
                type: 'customrecord_dps_us_billing_information'
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_item_name',
                value: temp.name
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_qty',
                value: temp.qty
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price',
                value: temp.rate
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_amount',
                value: Number(temp.qty) * Number(temp.rate)
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price_includ',
                value: temp.qty
            });

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_tax_included_amoun',
                value: temp.taxamount
            });

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit',
                value: temp.util
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_elements_declarati',
                value: temp.declare
            });

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_informa',
                value: informaId
            });
            var usbilId = usbil.save();
            if (usbilId) {
                USBil.push(usbil);
            }
        }
        return USBil || false;
    }

    /**
     * 创建报关资料
     * @param {*} recordId 
     * @param {*} transferorderId 
     */
    function createInformation(recordId, transferorderId) {
        var information = record.create({
            type: 'customrecord_customs_declaration_informa'
        });
        information.setValue({
            fieldId: 'custrecord_fulfillment_record',
            value: recordId
        });
        information.setValue({
            fieldId: 'custrecord_transfer_order',
            value: transferorderId
        });
        var id = information.save();
        return id;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});