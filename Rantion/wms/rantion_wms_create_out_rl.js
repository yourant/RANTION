/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-07-06 18:43:23
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_out_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function _get(context) {

    }

    function _post(context) {
        var message = {};
        var SOFlag = true;
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};

            // 业务数据填写至data即可
            // 参数模板 (参数类型，是否必填)

            // Array[OutMasterCreateRequestDto {
            //         address(string, optional): 地址,
            //             city(string, optional): 城市,
            //             country(string, optional): 国家,
            //             countryCode(string, optional): 国家简码,
            //             detailCreateRequestDtos(Array[OutDetailCreateRequestDto]): 出库单明细,
            //             email(string, optional): 邮箱地址,
            //             logisticsChannelCode(string): 物流渠道服务编号,
            //             logisticsChannelName(string): 物流渠道服务名称,
            //             logisticsLabelPath(string, optional): 物流面单文件路径,
            //             logisticsProviderCode(string): 物流渠道商编号,
            //             logisticsProviderName(string): 物流渠道商名称,
            //             mobilePhone(string, optional): 移动电话,
            //             platformCode(string, optional): 平台编号,
            //             platformName(string, optional): 平台名称,
            //             postcode(string, optional): 邮编,
            //             province(string, optional): 省份,
            //             qty(integer, optional): 数量,
            //             recipient(string, optional): 收件人,
            //             remark(string, optional): 备注,
            //             shopCode(string, optional): 平台编号,
            //             shopName(string, optional): 店铺名称,
            //             sourceNo(string): 来源单号,
            //             sourceType(integer): 来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整,
            //             telephone(string, optional): 固定电话,
            //             trackingNo(string, optional): 最终跟踪号,
            //             warehouseCode(string): 仓库编号,
            //             warehouseName(string): 仓库名称,
            //             waybillNo(string, optional): 运单号
            //     }
            //     OutDetailCreateRequestDto {
            //         productCode(string, optional): 产品编号,
            //             productImageUrl(string): 图片路径,
            //             productTitle(string): 产品标题,
            //             productType(integer, optional): 产品类型 10: 成品 20: 半成品 30: 组合产品 40: 包装材料,
            //             qty(integer): 出库数量,
            //             sku(string): sku,
            //             variants(string, optional): 变体规格
            //     }]


            log.audit('context', context);
            var sourceType = Number(context.sourceType);
            // 销售订单
            if (sourceType == 10) {

                var soLink;

                // 业务数据填写至data即可
                // 参数模板 (参数类型，是否必填)


                log.audit('sourceType: ' + sourceType, 'recordID: ' + context.recordID);

                // var af_rec = record.load({
                //     type: 'customrecord_dps_shipping_small_record',
                //     id: context.recordID
                // });

                search.create({
                    type: 'customrecord_dps_shipping_small_record',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: context.recordID
                    }],
                    columns: [

                        'custrecord_record_fulfill_xh_label_addr', // 面单路径URL

                        'custrecord_dps_ship_samll_location', // 发运仓库	
                        {
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_dps_ship_samll_location'
                        },
                        {
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_dps_ship_samll_location'
                        },

                        'custrecord_dps_ship_order_number', //订单号	
                        'custrecord_dps_ship_platform_order_numbe', //平台订单号
                        'custrecord_dps_ship_small_logistics_orde', //物流运单号
                        'custrecord_dps_ship_small_trackingnumber', // 物流跟踪单号
                        'custrecord_dps_ship_small_sales_platform', //销售平台
                        'custrecord_dps_ship_small_account', //销售店铺
                        'custrecord_dps_ship_small_destination', //目的地
                        'custrecord_dps_ship_small_recipient', //收件人
                        'custrecord_dps_ship_small_phone', //联系电话
                        'custrecord_dps_ship_small_ship_weight', //发货重量
                        'custrecord_dps_ship_small_estimatedfreig', //预估运费
                        'custrecord_dps_ship_small_shipping_date', //发运时间
                        'custrecord_dps_ship_small_due_date', // 妥投时间
                        'custrecord_dps_ship_small_channel_dealer', //渠道商
                        'custrecord_dps_ship_small_channelservice', //渠道服务

                        {
                            name: 'custrecord_ls_service_code',
                            join: 'custrecord_dps_ship_small_channelservice'
                        },

                        'custrecord_dps_ship_small_salers_order', //关联的销售订单
                        'custrecord_dps_addressee_address', //收件人地址
                        'custrecord_dps_recipient_city', // 收件人城市
                        'custrecord_dps_recipient_country', //收件人国家
                        'custrecord_dps_recipien_code', //收件人地址编码
                        'custrecord_dps_length', //长度
                        'custrecord_dps_width', //宽度
                        'custrecord_dps_highly', //高度
                        'custrecord_dps_carton_no', //箱号
                        'custrecord_dps_s_state', //收货人 - 州
                        'custrecord_dps_street1', //街道1
                        'custrecord_dps_street2', //街道2 
                        'custrecord_dps_declared_value', //申报价值
                        'custrecord_dps_declare_currency', //申报币种
                        {
                            name: 'custrecord_cc_country_code',
                            join: 'custrecord_dps_recipient_country'
                        }, // 国家编码
                    ]
                }).run().each(function (rec) {

                    soLink = rec.getValue('custrecord_dps_ship_small_salers_order');

                    // data["address"] =    //'地址';
                    data["city"] = rec.getValue('custrecord_dps_recipient_city'); // '城市';
                    data["country"] = rec.getText('custrecord_dps_recipient_country'); // '国家';
                    data["countryCode"] = rec.getValue({
                        name: 'custrecord_cc_country_code',
                        join: 'custrecord_dps_recipient_country'
                    }); //   '国家简码';
                    // data["detailCreateRequestDtos"] = '出库单明细';
                    // data["email"] = '邮箱地址';

                    data["logisticsChannelCode"] = rec.getValue('custrecord_dps_ship_small_channelservice'); //  '物流渠道服务编号';
                    data["logisticsChannelName"] = rec.getText('custrecord_dps_ship_small_channelservice'); // '物流渠道服务名称';

                    data["logisticsLabelPath"] = rec.getValue('custrecord_record_fulfill_xh_label_addr'); // 物流面单文件路径 ,
                    data["logisticsProviderCode"] = rec.getValue('custrecord_dps_ship_small_channel_dealer'); //'物流渠道商编号';
                    data["logisticsProviderName"] = rec.getText('custrecord_dps_ship_small_channel_dealer'); //'物流渠道商名称';
                    data["mobilePhone"] = rec.getValue('custrecord_dps_ship_small_phone'); //'移动电话';


                    // data["platformCode"] = '平台编号';
                    data["platformName"] = rec.getText('custrecord_dps_ship_small_sales_platform'); // '平台名称';
                    data["postcode"] = rec.getValue('custrecord_dps_recipien_code'); //'邮编';
                    data["province"] = rec.getValue('custrecord_dps_s_state'); //'省份';
                    // data["qty"] = '数量';
                    data["recipient"] = rec.getValue('custrecord_dps_ship_small_recipient'); //'收件人';
                    // data["remark"] = '备注';
                    // data["shopCode"] = '平台编号';

                    data["shopName"] = rec.getValue('custrecord_dps_ship_small_account'); //'店铺名称';
                    data["sourceNo"] = rec.getValue('custrecord_dps_ship_order_number'); //'来源单号';
                    data["sourceType"] = 10; //'来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整';
                    // data["telephone"] = '固定电话';
                    // data["trackingNo"] = '最终跟踪号';

                    data["warehouseCode"] = rec.getValue({
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_ship_samll_location'
                    }); //'仓库编号';
                    data["warehouseName"] = rec.getValue({
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_ship_samll_location'
                    }); //'仓库名称';
                    data["waybillNo"] = rec.getValue('custrecord_dps_ship_small_logistics_orde');

                });


                SOFlag = qtyBackOrdered(soLink)

                log.debug('SOFlag', SOFlag);


                var limit = 3999,
                    itemInfo = [];
                search.create({
                    type: 'customrecord_dps_ship_samll_sku',
                    filters: [{
                        name: 'custrecord_dps_ship_small_links',
                        operator: 'anyof',
                        values: context.recordID
                    }],
                    columns: [
                        'custrecord_dps_ship_small_item_quantity', // 数量
                        'custrecord_dps_ship_small_sku_line', // SKU
                        'custrecord_dps_ship_small_item_item', // 货品
                        {
                            name: 'itemid',
                            join: 'custrecord_dps_ship_small_item_item'
                        }, // 货品名称/编号
                        {
                            name: 'custitem_dps_declaration_cn',
                            join: 'custrecord_dps_ship_small_item_item'
                        }, // 报关中文名称
                        {
                            name: 'custitem_dps_picture',
                            join: 'custrecord_dps_ship_small_item_item'
                        }, // 货品图片

                    ]
                }).run().each(function (rec) {

                    var it = {
                        productCode: rec.getValue({
                            name: 'itemid',
                            join: 'custrecord_dps_ship_small_item_item'
                        }),
                        productImageUrl: rec.getValue({
                            name: 'custitem_dps_picture',
                            join: 'custrecord_dps_ship_small_item_item'
                        }),
                        productTitle: rec.getValue({
                            name: 'custitem_dps_declaration_cn',
                            join: 'custrecord_dps_ship_small_item_item'
                        }),
                        // productType: '',
                        qty: Number(rec.getValue('custrecord_dps_ship_small_item_quantity')),
                        sku: rec.getValue({
                            name: 'itemid',
                            join: 'custrecord_dps_ship_small_item_item'
                        })
                    };

                    itemInfo.push(it);

                    return --limit > 0;

                });

                data["detailCreateRequestDtos"] = itemInfo; //'出库单明细';

                log.audit('no data', data);

                for (var key in data) {
                    if (data[key] === '') {
                        delete data[key]
                    }
                }

                log.debug('delete data[key]', data);

            }
            // 采购退货单
            else if (sourceType == 20) {

                data = JSON.parse(context.data);
                log.debug('data20:', data);
            }
            // 调拨单
            else if (sourceType == 30) {

            }
            // 移库单
            else if (sourceType == 40) {

            }
            // 库存调整
            else if (sourceType == 50) {

            }


            log.debug('SOFlag', SOFlag)
            if (sourceType == 10) {

                log.debug('属于销售订单' + SOFlag, sourceType);
                // 发送请求
                if (SOFlag) {
                    message = sendRequest(token, [data]);
                }
            } else {
                log.debug('属于不销售订单属于其他类型', sourceType);
                // 发送请求
                message = sendRequest(token, data);
            }

        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }

        if (sourceType == 10) {
            var flag, str;

            if (SOFlag) {

                log.debug('message.data.code', message.data.code);
                if (message.data.code != 0) {
                    flag = 8;
                    str = JSON.stringify(message.data);
                } else {
                    flag = 14;
                    str = JSON.stringify(message.data);
                }

            } else {
                str = '库存不足,无法发运';
                flag = 8;

                message.code = 5;
                message.data = {
                    msg: '库存不足,无法发运'
                };
            }


            log.debug('推送WMS flag', flag);
            var id = record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
                id: context.recordID,
                values: {
                    custrecord_dps_ship_small_status: flag,
                    custrecord_dps_ship_small_wms_info: str
                }
            });

            log.audit('sourceType == 10  ID', id);
        }

        return message;
    }

    function _put(context) {

    }

    function _delete(context) {

    }


    /**
     * 获取当前订单的延交订单的货品数量, 若存在延交订单数量大于 0, 返回 true; 否则返回 false;
     * @param {*} soId 
     * @returns {Boolean} true || false
     */
    function qtyBackOrdered(soId) {
        var flag = true;
        var backOrder = 0;

        var soObj = record.load({
            type: 'salesorder',
            id: soId
        });
        var numLines = soObj.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0; i < numLines; i++) {

            var backQty = soObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantitybackordered',
                line: i
            });
            backOrder += Number(backQty);
        }
        log.debug('backOrder', backOrder);

        if (backOrder > 0) {
            flag = false;
        }

        return flag;
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
            url: 'http://47.107.254.110:18082/rantion-wms/outMaster',
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