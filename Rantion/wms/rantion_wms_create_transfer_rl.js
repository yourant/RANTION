/*
 * @Author         : Li
 * @Date           : 2020-06-01 09:38:43
 * @LastEditTime   : 2020-07-28 17:40:20
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_transfer_rl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record', '../Helper/config', '../Helper/tool.li'], function (search, http, record, config, tool) {

    function _get(context) {

    }

    function _post(context) {

    }

    function _put(context) {


        log.debug('context', context);
        var message = {};
        // 获取token

        var token = getToken();
        if (token) {

            var tranOrder;
            var data = {};
            var tranType, fbaAccount;
            var ful_to_link;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: context.recordID
                }],
                columns: [
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_dps_shipping_rec_transport',
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

                    "custrecord_dps_shipping_rec_destinationf", // 仓库中心
                    "custrecord_dps_ship_remark", // 备注

                    {
                        name: "tranid",
                        join: "custrecord_dps_shipping_rec_order_num"
                    }, // 调拨单号
                    "custrecord_dps_to_shipment_name", // shipment name 
                    "custrecord_dps_to_reference_id", // reference id
                ]
            }).run().each(function (rec) {

                tranOrder = rec.getValue('custrecord_dps_shipping_rec_order_num')

                ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
                var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

                var shippingType;
                // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
                // 1	空运   2	海运   3	铁路    4   快船
                if (rec_transport == 1) {
                    shippingType = 10;
                } else if (rec_transport == 4) {
                    shippingType = 30;
                } else if (rec_transport == 2) {
                    shippingType = 20;
                } else if (rec_transport == 3) {
                    shippingType = 40
                }

                data["remark"] = rec.getValue('custrecord_dps_ship_remark') ? rec.getValue('custrecord_dps_ship_remark') : ''; // 备注字段

                data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");
                data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment name

                data["shippingType"] = shippingType;
                data["aono"] = rec.getValue({
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                });

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
                fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
                data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

                data["countBubbleBase"] = Number(rec.getValue({
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }));
                data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
                data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
                data["logisticsLabelPath"] = 'logisticsLabelPath';

                data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

                // data["logisticsProviderCode"] = rec.getValue({
                //     name: 'custrecord_ls_service_code',
                //     join: 'custrecord_dps_shipping_r_channelservice'
                // });

                var channel_dealer = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                var channel_dealerText = rec.getText('custrecord_dps_shipping_r_channel_dealer');

                var logiFlag = 1;
                if (channel_dealer == 6 || channel_dealerText == "Amazon龙舟") {
                    logiFlag = 0;
                }

                // logisticsFlag (integer): 是否需要物流面单 0:否 1:是 
                // FIXME 需要判断物流渠道是否存在面单文件, 
                data["logisticsFlag"] = logiFlag;


                data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

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
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                data["taxFlag"] = 1;
                data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                var b = a.split(':');
                data["tradeCompanyName"] = b[b.length - 1];
                // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

                var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

                tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

                var type = 10;
                // 1 FBA调拨    2 自营仓调拨   3 跨仓调拨   4 移库

                var waybillNo;

                if (type1 == 1) {
                    type = 20;
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                } else {
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
                }

                data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
                data["type"] = type;
                data["waybillNo"] = waybillNo; // 运单号
            });



            var createdBy, to_aono;
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: ful_to_link
                }],
                columns: [
                    "createdby",
                    // {
                    //     name: "tranid",
                    //     join: "custrecord_dps_shipping_rec_order_num"
                    // }, // 调拨单号
                ]
            }).run().each(function (rec) {
                createdBy = rec.getText('createdby');
                // to_aono = rec.getValue({
                //     name: "tranid",
                //     join: "custrecord_dps_shipping_rec_order_num"
                // });
            });


            // data["aono"] = to_aono;

            data["createBy"] = createdBy; // 设置调拨单创建者

            var taxamount;
            var item_info = [];
            var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
            // var numLines = af_rec.getLineCount({
            //     sublistId: subli_id
            // });


            var itemArr = [];
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: context.recordID
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
                        name: 'custitem_dps_heavy2',
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
                    },
                    'custrecord_dps_shipping_record_item', // 货品

                    // {
                    //     name: 'taxamount',
                    //     join: 'custrecord_dps_trans_order_link'
                    // }

                    {
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 材质  material
                    {
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 物流分组 logisticsGroup
                    {
                        name: "cost",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 采购成本  purchaseCost
                    {
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 英文标题/描述 englishTitle
                ]
            }).run().each(function (rec) {

                // AllocationDetailCreateRequestDto{
                //     asin(string): ASIN,
                //     brandName(string): 品牌名称,
                //     englishTitle(string): 产品英文标题,
                //     fnsku(string): FNSKU,
                //     msku(string): MSKU,
                //     productCode(string, optional): 产品编号,
                //     productHeight(number): 产品高(cm),
                //     productImageUrl(string): 图片路径,
                //     productLength(number): 产品长(cm),
                //     productTitle(string): 产品标题,
                //     productWeight(number): 产品重量(g),
                //     productWidth(number): 产品宽(cm),
                //     purpose(string): 用途,
                //     qty(integer): 数量,
                //     sku(string): SKU,
                //   }

                itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
                var purchaseCost = rec.getValue({
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                });
                var it = {
                    englishTitle: rec.getValue({
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    purchaseCost: Number(purchaseCost),
                    logisticsGroup: rec.getText({
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    material: rec.getText({
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    itemId: rec.getValue('custrecord_dps_shipping_record_item'),
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

                    msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                    englishTitle: rec.getValue({
                        name: 'custitem_dps_declaration_us',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productImageUrl: rec.getValue({
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productTitle: rec.getValue({
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productHeight: Number(rec.getValue({
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productLength: Number(rec.getValue({
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productWeight: Number(rec.getValue({
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productWidth: Number(rec.getValue({
                        name: 'custitem_dps_wide',
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

                return true;

            });

            log.debug('itemArr', itemArr);

            // 2020/7/18 13：44 改动 
            var fils = [],
                add_fils = []; //过滤
            var len = item_info.length,
                num = 0;
            var checkArr = [];
            item_info.map(function (ld) {
                num++;
                if (ld.msku) { // 存在 msku
                    add_fils.push([
                        ["name", "is", ld.msku],
                        "and",
                        ["custrecord_ass_sku", "anyof", ld.itemId]
                    ]);
                } else { // 不存在 msku
                    add_fils.push([
                        ["custrecord_ass_sku", "anyof", ld.itemId]
                    ]);
                }
                if (num < len)
                    add_fils.push("or");
            });
            fils.push(add_fils);
            fils.push("and",
                ["custrecord_ass_account", "anyof", fbaAccount]
            );
            fils.push("and",
                ["isinactive", "is", false]
            );
            log.debug('fils', fils);
            log.debug('item_info', item_info);
            var newItemInfo = [];

            if (tranType == 1) {
                var new_limit = 3999;
                log.debug("fils:::::", fils)
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: fils,
                    columns: [
                        "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                    ]
                }).run().each(function (rec) {
                    log.debug("rec.id ::::::: ", rec.id)
                    var it = rec.getValue('custrecord_ass_sku');
                    item_info.forEach(function (item, key) {

                        log.debug('item.itemId: ' + item.itemId, "it: " + it);

                        if (item.itemId == it) {
                            item.asin = rec.getValue("custrecord_ass_asin");
                            item.fnsku = rec.getValue("custrecord_ass_fnsku")
                            item.msku = rec.getValue('name');
                            newItemInfo.push(item);
                        }
                    });
                    return --new_limit > 0;
                });

                log.debug('newItemInfo', newItemInfo);

                if (newItemInfo && newItemInfo.length == 0) {

                    message.code = 3;
                    message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: context.recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 8,
                            custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                        }
                    });

                    return message;
                }

                // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
                var juArr = tool.judgmentFlag(context.recordID, newItemInfo);

                log.audit('存在差异数组', juArr);

                if (juArr.length > 0) {

                    message.code = 3;
                    message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: context.recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 8,
                            custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                        }
                    });

                    return message;
                }


                var getPoObj = tool.searchToLinkPO(itemArr, ful_to_link)

                newItemInfo.map(function (newItem) {
                    var itemId = newItem.itemId;
                    newItem.pono = getPoObj[itemId]
                });

                data['allocationDetailCreateRequestDtos'] = newItemInfo;
            } else {
                data['allocationDetailCreateRequestDtos'] = item_info;
            }

            log.audit('newItemInfo', newItemInfo);
            if (Number(taxamount) > 0) {
                data["taxFlag"] = 1;
            } else {
                data["taxFlag"] = 0;
            }
            // log.error('item_info', item_info);
            // data['allocationDetailCreateRequestDtos'] = newItemInfo;


            try {
                // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
                tool.wmsInfo(tranferOrder, data, 1, '推送面单文件');

            } catch (error) {
                log.audit('创建推送WMS数据记录出错', error);
            }
            // 发送请求
            message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }


        if (message.data.code == 0) {
            flag = 14;
        } else {
            flag = 8;
        }
        var id = record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: context.recordID,
            values: {
                custrecord_dps_shipping_rec_status: flag,
                custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
            }
        });
        return message;
    }

    function _delete(context) {

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
            url: config.WMS_Debugging_URL + "/allocationMaster",
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) {
            retdata = JSON.parse(response.body);
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

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});


/*

AllocationMasterCreateRequestDto {
    address(string, optional): 地址,
        allocationDetailCreateRequestDtos(Array[AllocationDetailCreateRequestDto]): 调拨单明细,
        aono(string): 调拨单号,
        city(string, optional): 城市,
        countBubbleBase(integer): 计泡基数,
        country(string, optional): 国家,
        countryCode(string, optional): 国家简码,
        createBy(string): 创建人,
        declareCurrency(string): 申报币种,
        declarePrice(number): 申报价格,
        email(string, optional): 邮箱地址,
        fbaAccount(string): FBA账号,
        logisticsChannelCode(string): 物流渠道服务编号,
        logisticsChannelName(string): 物流渠道服务名称,
        logisticsLabelPath(string): 物流面单文件路径,
        logisticsProviderCode(string): 物流渠道商编号,
        logisticsProviderName(string): 物流渠道商名称,
        marketplaces(string): 站点 / 市场,
        mobilePhone(string, optional): 移动电话,
        postcode(string, optional): 邮编,
        province(string, optional): 省份,
        recipient(string, optional): 收件人,
        shipment(string): shipment,
        shippingType(integer): 运输方式： 10 空运， 20 海运， 30 快船,
        sourceWarehouseCode(string): 来源仓库编号,
        sourceWarehouseName(string): 来源仓库名称,
        targetWarehouseCode(string): 目标仓库编号,
        targetWarehouseName(string): 目标仓库名称,
        taxFlag(integer): 是否含税 0: 否1: 是,
        telephone(string, optional): 固定电话,
        tradeCompanyCode(string): 交易主体编号,
        tradeCompanyName(string): 交易主体名称,
        type(integer): 调拨类型： 10 普通调拨， 20 FBA调拨,
        waybillNo(string): 运单号
}
AllocationDetailCreateRequestDto {
    asin(string): ASIN,
        brandName(string): 品牌名称,
        englishTitle(string): 产品英文标题,
        fnsku(string): FNSKU,
        msku(string): MSKU,
        productCode(string, optional): 产品编号,
        productHeight(number): 产品高(cm),
        productImageUrl(string): 图片路径,
        productLength(number): 产品长(cm),
        productTitle(string): 产品标题,
        productType(integer, optional): 产品类型 10: 成品 20: 半成品 30: 组合产品 40: 包装材料,
        productWeight(number): 产品重量(g),
        productWidth(number): 产品宽(cm),
        purpose(string): 用途,
        qty(integer): 数量,
        sku(string): SKU,
        variants(string, optional): 变体规格
}
*/