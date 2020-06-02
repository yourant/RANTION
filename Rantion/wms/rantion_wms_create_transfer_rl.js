/*
 * @Author         : Li
 * @Date           : 2020-06-01 09:38:43
 * @LastEditTime   : 2020-06-01 15:50:05
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_transfer_rl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

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
            var data = {};

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
                var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

                if (rec_transport == 1) {
                    shippingType = 10;
                } else if (rec_transport == 3) {
                    shippingType = 30;
                } else {
                    shippingType = 20;
                }

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
                // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

                var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

                var type = 10;
                // 1 FBA调拨
                // 2 自营仓调拨
                // 3 跨仓调拨
                // 4 移库

                if (type1 == 1) {
                    type = 20
                }
                data["type"] = type;
                // data["type"] = af_rec.getText('custrecord_dps_ship_record_tranor_type');
                data["waybillNo"] = rec.id; // 运单号
            });
            /*

            data["shippingType"] = shippingType;
            data["aono"] = af_rec.getValue('custrecord_dps_shipping_rec_order_num');
            data["createBy"] = af_rec.getText('owner');

            data["declareCurrency"] = af_rec.getText('custrecord_dps_shipping_rec_currency');
            // data["declareCurrency"] = af_rec.getValue('custrecord_dps_shipping_rec_order_num');

            // data["declarePrice"] = 1;
            data["declarePrice"] = af_rec.getValue('custrecord_dps_declared_value_dh');
            data["fbaAccount"] = af_rec.getValue('custrecord_dps_shipping_rec_account');

            data["logisticsChannelCode"] = af_rec.getValue('custrecord_dps_shipping_r_channelservice');
            data["logisticsChannelName"] = af_rec.getText('custrecord_dps_shipping_r_channelservice');
            // data["logisticsLabelPath"] = af_rec.getValue('custrecord_dps_shipping_rec_order_num');

            data["logisticsProviderCode"] = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            data["logisticsProviderName"] = af_rec.getText('custrecord_dps_shipping_r_channelservice');
            data["shipment"] = af_rec.getValue('custrecord_dps_shipping_rec_shipments');
            data["sourceWarehouseCode"] = af_rec.getValue('custrecord_dps_shipping_rec_location');
            data["sourceWarehouseName"] = af_rec.getText('custrecord_dps_shipping_rec_location');

            data["targetWarehouseCode"] = af_rec.getValue('custrecord_dps_shipping_rec_to_location');
            data["targetWarehouseName"] = af_rec.getText('custrecord_dps_shipping_rec_to_location');
            data["taxFlag"] = 1;
            data["tradeCompanyCode"] = af_rec.getValue('custrecord_dps_shipping_rec_transa_subje');
            data["tradeCompanyName"] = af_rec.getText('custrecord_dps_shipping_rec_transa_subje');

            data["type"] = type;
            // data["type"] = af_rec.getText('custrecord_dps_ship_record_tranor_type');
            data["waybillNo"] = af_rec.getText('custrecord_dps_shipping_rec_logistics_no');
            */
            var taxamount;
            var item_info = [];
            var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
            // var numLines = af_rec.getLineCount({
            //     sublistId: subli_id
            // });

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
                    }) : productTitle,
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
            url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        retdata = JSON.parse(response.body);
        if (response.code == 200) {
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