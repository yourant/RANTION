/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-07-18 12:22:02
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_out_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record', '../Helper/config.js', ], function (search, http, record, config) {

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
            // 移库单 (库存领用)
            else if (sourceType == 40) {
                search.create({
                    type: 'customrecord_sample_use_return',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: context.id
                    }],
                    columns: [
                        'custrecord_logistics_channel_ser_num',
                        'custrecord_logistics_channel_server',
                        'custrecord_logistics_channel_pro_num',
                        'custrecord_logistics_channel_provider',
                        'name',
                        {
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_location_use_back'
                        },
                        {
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_location_use_back'
                        }
                    ]
                }).run().each(function (rec) {
                    data["logisticsChannelCode"] = rec.getValue('custrecord_logistics_channel_ser_num'); //  '物流渠道服务编号';
                    data["logisticsChannelName"] = rec.getText('custrecord_logistics_channel_server'); // '物流渠道服务名称';
                    data["logisticsProviderCode"] = rec.getValue('custrecord_logistics_channel_pro_num'); //'物流渠道商编号';
                    data["logisticsProviderName"] = rec.getText('custrecord_logistics_channel_provider'); //'物流渠道商名称';
                    data["sourceNo"] = rec.getValue('name'); //'来源单号';
                    data["sourceType"] = sourceType; //'来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整';
                    data["warehouseCode"] = rec.getValue({
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_location_use_back'
                    }); //'仓库编号';
                    data["warehouseName"] = rec.getValue({
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_location_use_back'
                    }); //'仓库名称';
                });

                //货品行
                var item_info = [];
                search.create({
                    type: 'customrecord_sample_useret_transfer_item',
                    filters: [{
                        name: 'custrecord_suti_link',
                        operator: 'anyof',
                        values: context.id
                    }],
                    columns: [
                        'custrecord_suti_item',
                        'custrecord_suti_quantiy',
                        {
                            name: 'custitem_dps_picture',
                            join: 'custrecord_suti_item'
                        },
                        {
                            name: 'custitem_dps_skuchiense',
                            join: 'custrecord_suti_item'
                        }
                    ]
                }).run().each(function (rec) {
                    item_info.push({
                        productImageUrl: rec.getValue({
                            name: 'custitem_dps_picture',
                            join: 'custrecord_suti_item'
                        }),
                        productTitle: rec.getValue({
                            name: 'custitem_dps_skuchiense',
                            join: 'custrecord_suti_item'
                        }),
                        qty: rec.getValue('custrecord_suti_quantiy'),
                        sku: rec.getText('custrecord_suti_item'),
                    });
                    return true;
                });
                data['detailCreateRequestDtos'] = item_info;
                log.debug('data', data);
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
            } else if (sourceType == 40) {
                // 发送请求
                message = sendRequest(token, [data]);
            } else {
                log.debug('属于不销售订单属于其他类型', sourceType);
                // 发送请求
                message = sendRequest(token, data);
            }

        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }

        if (sourceType == 40) {
            log.debug('message', message);
            if (message.code != 0) {
                record.submitFields({
                    type: 'customrecord_sample_use_return',
                    id: context.id,
                    values: {
                        custrecord_stauts_wms: 5,
                        custrecord_wms_info_t: message.data.msg
                    }
                });
            } else {
                record.submitFields({
                    type: 'customrecord_sample_use_return',
                    id: context.id,
                    values: {
                        custrecord_stauts_wms: 2,
                        custrecord_wms_info_t: message.data.msg
                    }
                });
            }
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


    function vendorReturn(context) {

        var v_record = record.load({
            id: context.id,
            type: "vendorreturnauthorization"
        });

        var p_record = record.load({
            id: context.poId,
            type: "purchaseorder"
        });

        var datas = [];
        var locations = [];

        var OutDetailCreateRequestDtos = [];
        var item_count = v_record.getLineCount({
            sublistId: 'item'
        });
        var all_qty = [];
        var location = '';
        var wms_location_names = [];
        for (var i = 0; i < item_count; i++) {

            var OutDetailCreateRequestDto = {};
            var itemid = v_record.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            var sku = itemid;
            var productCode, productImageUrl, productType, productTitle, qty, variants = '';

            search.create({
                type: 'item',
                filters: [{
                    name: 'itemid',
                    operator: 'is',
                    values: itemid
                }],
                columns: [
                    'custitem_dps_spucoding', //产品编号
                    'custitem_dps_picture', //图片路径
                    'custitem_dps_ctype', //产品类型 10:成品 20:半成品 30:组合产品 40:包装材料 ,
                    'custitem_dps_skuchiense', //产品标题
                    //'custitem_dps_skuenglish', //sku
                    'custitem_dps_specifications', //变体规格
                ]
            }).run().each(function (res) {
                productCode = res.getValue('custitem_dps_spucoding');
                productImageUrl = res.getValue('custitem_dps_picture');
                productTitle = res.getValue('custitem_dps_skuchiense');
                productType = res.getValue('custitem_dps_ctype');
                variants = res.getValue('custitem_dps_specifications');
            });


            if (productImageUrl == '') {
                productImageUrl = 'https://cdn.shopify.com/s/files/1/1384/9629/files/ACOUSTIC-GUITAR.jpg';
            }

            if (productType == '') {
                productType = 10;
            }

            var qty = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });

            var location = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: i
            });

            var location_display = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location_display',
                line: i
            });

            var v_location = record.load({
                type: 'location',
                id: location
            });

            var wms_location = v_location.getValue('custrecord_dps_wms_location');
            var wms_location_name = v_location.getValue('custrecord_dps_wms_location_name');

            var wms_location_o = {
                wms_location: wms_location,
                wms_location_name: wms_location_name
            };

            if (locations.indexOf(wms_location) < 0) {
                locations.push(wms_location);
                wms_location_names[wms_location] = wms_location_name;
            }

            //设置默认总数
            if (typeof (all_qty[wms_location]) == 'undefined') {
                all_qty[wms_location] = 0;
            }

            all_qty[wms_location] += qty;
            OutDetailCreateRequestDto.productCode = productCode;
            OutDetailCreateRequestDto.productImageUrl = productImageUrl;
            OutDetailCreateRequestDto.productTitle = productTitle;
            OutDetailCreateRequestDto.productType = productType;
            OutDetailCreateRequestDto.qty = qty;
            OutDetailCreateRequestDto.sku = sku;
            if (variants != '')
                OutDetailCreateRequestDto.variants = variants;

            if (typeof (OutDetailCreateRequestDtos[wms_location]) == 'undefined')
                OutDetailCreateRequestDtos[wms_location] = [];
            OutDetailCreateRequestDtos[wms_location].push(OutDetailCreateRequestDto);
        }

        //获取供应商信息
        var entity_id = v_record.getValue('entity');
        var entity = record.load({
            type: 'vendor',
            id: entity_id
        });


        var address = entity.getSublistValue({
            sublistId: 'addressbook',
            fieldId: 'addressbookaddress_text',
            line: 0
        });

        //获取供应商邮箱
        var email = entity.getValue('email');

        //供应商移动电话
        var telphone = entity.getValue('altphone');

        //供应商手机
        var mobilePhone = entity.getValue('phone');

        //获取平台信息
        var platformCode = p_record.getValue('custitem_dps_platformcode');
        var platformName = p_record.getValue('custitem_dps_platformname');

        //获取店铺信息
        var shopCode = p_record.getValue('custitem_dps_shopCode');
        var shopName = p_record.getValue('custitem_dps_shopName');
        if (shopCode == '') {
            shopCode = '';
            shopName = '';
            log.debug('shopInfo:', 'unset');
        }


        //获取备注信息
        var sourceNo = v_record.getValue('tranid');
        var remark = v_record.getValue('memo');

        var customrecord_logistics_service_id;
        var customrecord_logistics_company_id;

        //获取渠道信息

        search.create({
            type: 'customrecord_logistics_service',
            filters: [{
                name: 'name',
                operator: 'is',
                values: '货拉拉渠道服务'
            }],
            columns: [
                'custrecord_ls_logistics_company'
            ]
        }).run().each(function (res) {
            customrecord_logistics_service_id = res.id;
            customrecord_logistics_company_id = res.getValue('custrecord_ls_logistics_company');
        });


        //根据wms仓库合并数据生成出库单
        locations.forEach(function (location) {


            OutMasterCreateRequestDto = {
                sourceType: 20, //来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整,

                address: address, // '地址', // (string)
                email: email, //'邮箱地址', //(string, optional)
                mobilePhone: mobilePhone, //'移动电话', //(string)
                telephone: telphone, //'固定电话', //(string, optional)

                logisticsChannelCode: customrecord_logistics_service_id, //'物流渠道服务编号', //(string)
                logisticsChannelName: '货拉拉渠道服务', //'物流渠道服务名称', //(string)
                //logisticsLabelPath: logisticsLabelPath, //' 物流面单文件路径', //(string)
                logisticsProviderCode: customrecord_logistics_company_id, //'物流渠道商编号', //(string)
                logisticsProviderName: '货拉拉', //'物流渠道商名称', //(string)

                sourceNo: sourceNo, //'来源单号', //(string)
                remark: remark, //'备注', //(string, optional)

                warehouseCode: location, //'仓库编号', //(string)
                warehouseName: wms_location_names[location], //'仓库名称', //(string)

                /*不确定，可以没有*/
                shopCode: shopCode, //'店铺编号', //(string, optional)
                shopName: shopName, //'店铺名称', //(string, optional)
                platformCode: platformCode, //'平台编号', //(string, optional)
                platformName: platformName, //'平台名称', //(string, optional)

                //#region  /*没有*/
                /*
                waybillNo: '没有', //'运单号' //(string)
                city: '没有', //'城市', // (string)
                country: '没有', //'国家', //(string)
                countryCode: '没有', //'国家简码', //(string)
                postcode: '没有', //'邮编', //(string)
                province: '没有', //'省份', //(string)
                recipient: '没有', //'收件人', //(string)
                trackingNo: '没有', //'最终跟踪号', //(string, optional)
                */
                //#endregion

                detailCreateRequestDtos: OutDetailCreateRequestDtos[wms_location], //出库单明细 ,(Array[OutDetailCreateRequestDto])
                qty: all_qty[wms_location], //'数量', //(integer, optional)
            }

            datas.push(OutMasterCreateRequestDto);

            log.debug('datas', datas);
        });

        return datas;
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
            url: config.WMS_Debugging_URL + "/outMaster",
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
            retdata = "请求失败"
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