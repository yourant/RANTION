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
        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};
            // AllocationMasterCreateRequestDto {
            //     address (string): 地址 ,
            //     allocationDetailCreateRequestDtos (Array[AllocationDetailCreateRequestDto]): 调拨单明细 ,
            //     aono (string): 调拨单号 ,
            //     city (string): 城市 ,
            //     country (string): 国家 ,
            //     countryCode (string): 国家简码 ,
            //     createBy (string): 创建人 ,
            //     declareCurrency (string): 申报币种 ,
            //     declarePrice (number): 申报价格 ,
            //     email (string): 邮箱地址 ,
            //     fbaAccount (string): FBA账号 ,
            //     logisticsChannelCode (string): 物流渠道服务编号 ,
            //     logisticsChannelName (string): 物流渠道服务名称 ,
            //     logisticsLabelPath (string): 物流面单文件路径 ,
            //     logisticsProviderCode (string): 物流渠道商编号 ,
            //     logisticsProviderName (string): 物流渠道商名称 ,
            //     mobilePhone (string): 移动电话 ,
            //     postcode (string): 邮编 ,
            //     province (string): 省份 ,
            //     recipient (string): 收件人 ,
            //     shipment (string): shipment ,
            //     shippingType (integer): 运输方式：10 sea-普通，20 air-快递-红单，30 air-专线-红单 ,
            //     sourceWarehouseCode (string): 来源仓库编号 ,
            //     sourceWarehouseName (string): 来源仓库名称 ,
            //     targetWarehouseCode (string): 目标仓库编号 ,
            //     targetWarehouseName (string): 目标仓库名称 ,
            //     taxFlag (integer): 是否含税 0:否1:是 ,
            //     telephone (string): 固定电话 ,
            //     tradeCompanyCode (string): 交易主体编号 ,
            //     tradeCompanyName (string): 交易主体名称 ,
            //     type (integer): 调拨类型：10 普通调拨，20 FBA调拨 ,
            //     waybillNo (string): 运单号
            // }
            // AllocationDetailCreateRequestDto {
            //     asin (string): ASIN ,
            //     barcode (string): 条码 装箱条码/SKU ,
            //     fnsku (string): FNSKU ,
            //     msku (string): MSKU ,
            //     positionCode (string): 库位编号 ,
            //     productCode (string): 产品编号 ,
            //     productImageUrl (string): 图片路径 ,
            //     productTitle (string): 产品标题 ,
            //     productType (integer): 产品类型 10:成品 20:半成品 30:组合产品 40:包装材料 ,
            //     qty (integer): 数量 ,
            //     sku (string): SKU ,
            //     type (integer): 类型 1:已装箱 2:未装箱 ,
            //     variants (string): 变体规格
            // }

            var recId = context.recordID;

            var transport, order_num, estimatedfre, currency, channel_dealer, channel_dealer_id, channelservice, bubble_count,
                service_code, f_wms_location, f_wms_location_name, t_wms_location, t_wms_location_name, f_b_purpose,
                tranor_type, shipment, transa_subje, transa_subje_id, owner, account, tax_amount, tra_id;


            var item_info = [];

            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recId
                }],
                columns: [
                    'owner', // 拥有者
                    'custrecord_dps_shipping_rec_transport', // 运输方式
                    'custrecord_dps_shipping_rec_order_num', //调拨单号
                    'custrecord_dps_shipping_rec_estimatedfre', // 预估运费

                    'custrecord_dps_shipping_rec_currency', // 货币
                    'custrecord_dps_shipping_r_channel_dealer', // 渠道商

                    'custrecord_dps_shipping_r_channelservice', // 渠道服务
                    'custrecord_dps_f_b_purpose', // 用途
                    'custrecord_dps_ship_record_tranor_type', // 调拨类型
                    'custrecord_dps_shipping_rec_shipments', // shipment 
                    'custrecord_dps_shipping_rec_transa_subje', // 交易主体
                    'custrecord_dps_shipping_rec_account', // 账号
                    // 计泡基数
                    {
                        name: 'custrecord_ls_bubble_count',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    },
                    // 渠道编码
                    {
                        name: 'custrecord_ls_service_code',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    },
                    // 仓库编号
                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_location'
                    },
                    // 仓库名称
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_location'
                    },
                    // 目标仓库编号
                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    },
                    // 目标仓库名称
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    },
                    {
                        join: "CUSTRECORD_DPS_TRANS_ORDER_LINK",
                        name: "taxamount"
                    }
                ]
            }).run().each(function (rec) {
                tra_id = rec.id;
                tax_amount = rec.getValue({
                    join: "CUSTRECORD_DPS_TRANS_ORDER_LINK",
                    name: "taxamount"
                });
                account = rec.getText('custrecord_dps_shipping_rec_account');
                owner = rec.getText('owner');
                transa_subje = rec.getValue('custrecord_dps_shipping_rec_transa_subje');
                transa_subje_id = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                shipment = rec.getValue('custrecord_dps_shipping_rec_shipments');
                transport = rec.getValue('custrecord_dps_shipping_rec_transport');
                order_num = rec.getValue('custrecord_dps_shipping_rec_order_num');
                estimatedfre = rec.getValue('custrecord_dps_shipping_rec_estimatedfre');
                currency = rec.getValue('custrecord_dps_shipping_rec_currency');

                channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
                channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
                bubble_count = rec.getValue({
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                });
                service_code = rec.getValue({
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                });
                f_wms_location = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                });
                f_wms_location_name = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                });
                t_wms_location = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                t_wms_location_name = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                f_b_purpose = rec.getValue('custrecord_dps_f_b_purpose');
                tranor_type = rec.getValue('custrecord_dps_ship_record_tranor_type');
            });

            var type = 10;
            if (tranor_type == 1) {
                type = 20;
            }

            var shippingType = 10;
            if (transport == 1) {
                shippingType = 10;
            } else if (transport == 2) {
                shippingType = 20;
            } else {
                shippingType = 30;
            }

            var taxFlag = 0;
            if (Number(tax_amount) > 0) {
                taxFlag = 1;
            }
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: recId
                }],
                columns: [
                    'custrecord_dps_ship_record_sku_item', // sku
                    'custrecord_dps_ship_record_item_quantity', // qty
                    {
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_msku',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_fnsku',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 产品的英文标题
                    {
                        name: 'custitem_dps_skuenglish',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 产品的标题
                    {
                        name: 'custitem_dps_declaration_cn',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 高
                    {
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 长
                    {
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 宽
                    {
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 图片 URL
                    {
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    // 重量
                    {
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    }
                ]
            }).run().each(function (rec) {

                var it = {
                    asin: rec.getValue({
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    brandName: rec.getValue({
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    englishTitle: rec.getValue({
                        name: 'custitem_dps_skuenglish',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    fnsku: rec.getValue({
                        name: 'custitem_dps_fnsku',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    msku: rec.getValue({
                        name: 'custitem_dps_msku',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productHeight: Number(rec.getValue({
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productImageUrl: rec.getValue({
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productLength: Number(rec.getValue({
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productTitle: rec.getValue({
                        name: 'custitem_dps_declaration_cn',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productWeight: Number(rec.getValue({
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productWidth: Number(rec.getValue({
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    purpose: rec.getValue('custrecord_dps_f_b_purpose'),
                    qty: rec.getValue('custrecord_dps_ship_record_item_quantity'),
                    sku: rec.getValue({
                        name: 'custitem_dps_msku',
                        join: 'custrecord_dps_shipping_record_item'
                    })
                };

                item_info.push(it);

                return true;
            });


            data["countBubbleBase"] = bubble_count; // 计泡基数
            data["shippingType"] = shippingType;
            data["aono"] = order_num;
            data["createBy"] = owner;

            data["declareCurrency"] = currency;

            data["declarePrice"] = estimatedfre;
            data["fbaAccount"] = account;

            data["logisticsChannelCode"] = channel_dealer_id;
            data["logisticsChannelName"] = channel_dealer;
            data["logisticsLabelPath"] = ' ';

            data["logisticsProviderCode"] = service_code;
            data["logisticsProviderName"] = channelservice;
            data["shipment"] = shipment;
            data["sourceWarehouseCode"] = f_wms_location;
            data["sourceWarehouseName"] = f_wms_location_name;

            data["targetWarehouseCode"] = t_wms_location;
            data["targetWarehouseName"] = t_wms_location_name;
            data["taxFlag"] = taxFlag;
            data["tradeCompanyCode"] = transa_subje_id;
            data["tradeCompanyName"] = transa_subje;

            data["type"] = type;

            data["waybillNo"] = tra_id;

            data['allocationDetailCreateRequestDtos'] = item_info


            // 发送请求
            message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
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
        retdata = JSON.stringify(response.body);
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