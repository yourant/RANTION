/*
 * @Author         : Li
 * @Date           : 2020-05-09 12:04:27
 * @LastEditTime   : 2020-06-24 17:09:23
 * @LastEditors    : Li
 * @Description    : FBM发货平台发运处理功能(小包)
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.record.full.invoice.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../Helper/config.js', 'N/record', 'N/search', 'N/log',
    'SuiteScripts/dps/logistics/jetstar/dps_logistics_request.js',
    'SuiteScripts/dps/logistics/openapi/dps_openapi_request.js',
    'SuiteScripts/dps/logistics/yanwen/dps_yanwen_request.js',
    'SuiteScripts/dps/logistics/endicia/dps_endicia_request.js',
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/http', 'N/file', "N/xml", 'N/runtime'
], function (config, record, search, log, jetstar, openapi, yanwen, endicia, Moment, http, file, xml, runtime) {

    function beforeLoad(context) {

        var action_type = context.type;
        if (action_type == 'view') {
            var form = context.form;
            var bf_cur = context.newRecord;

            var small_status = bf_cur.getValue('custrecord_dps_ship_small_status');
            if (small_status == 4 || small_status == 2) {
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '重新获取物流渠道',
                    functionName: "reacquireLogistics(" + bf_cur.id + ")"
                });
            } else if (small_status == 8) {
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '重新WMS发运',
                    functionName: "WMSShipping(" + bf_cur.id + ")"
                });
            }
            var tracking_number = bf_cur.getValue('custrecord_dps_ship_small_trackingnumber');
            var logistStatus = bf_cur.getValue('custrecord_dps_push_state_xh')
            if (!tracking_number && logistStatus == "成功")
                form.addButton({
                    id: 'custpage_dps_li_traking_button',
                    label: '获取物流跟踪号',
                    functionName: "getTrackingNumber(" + bf_cur.id + ")"
                });
            var img = bf_cur.getValue("custrecord_dps_fulfill_record_xh_img")
            if (img) {
                form.addButton({
                    id: 'custpage_dps_li_showimg_button',
                    label: '查看标签',
                    functionName: "showImg(" + bf_cur.id + ")"
                });
            }
            if (bf_cur.id) {
                var label = bf_cur.getValue('custrecord_record_fulfill_xh_label_addr')
                var channel = bf_cur.getValue("custrecord_dps_ship_small_channel_dealer")
                if (!label && logistStatus == "成功" && (channel == "1" || channel == "2")) {
                    form.addButton({
                        id: 'custpage_dps_li_get_label',
                        label: '获取面单',
                        functionName: "getLabel(" + bf_cur.id + ")"
                    });
                }
            }
            form.clientScriptModulePath = './dps.fulfillment.record.full.invoice.cs.js';
        }

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        log.debug('type', context.type);
        // 1	未发运，等待获取物流单号	2	匹配物流失败，手动处理		3	已获取物流单号，等待发运
        // 4	获取物流信息失败			6	WMS已发运					7	WMS已部分发运
        // 8	WMS发运失败					9	未发运，等待获取Shipment	10	已获取Shipment，等待装箱
        // 11	申请Shipment失败			12	WMS已装箱					13	WMS已部分装箱
        // 14	已推送WMS					15	已创建入库计划				16	已创建入库件
        // 17	已获取标签					18	已更新入库件				19	已推送 标签文件
        // 20	推送标签文件至 WMS 失败		21	等待获取物流面单			22	获取标签文件失败

        var af_rec = context.newRecord;
        var type = context.type;
        log.debug('type', type);

        if (type != 'delete') {

            var rec_status = af_rec.getValue('custrecord_dps_ship_small_status');

            log.audit('rec_status: typeof: ' + typeof (rec_status), rec_status);

            if (rec_status == 1) {
                // 发运记录创建完成之后, 直接推送物流供应商

                var l_af_rec = record.load({
                    type: af_rec.type,
                    id: af_rec.id
                });

                // 获取渠道商
                var channel_dealer = l_af_rec.getValue('custrecord_dps_ship_small_channel_dealer');
                // 获取渠道服务
                var small_channelservice = l_af_rec.getValue('custrecord_dps_ship_small_channelservice');

                // 根据渠道商来判断推送哪一个物流接口
                if (channel_dealer && small_channelservice) {
                    pushOrder(l_af_rec);
                }
            }

            if (rec_status == 6 || rec_status == 7) {

                try {

                    var Laf_rec = record.load({
                        type: af_rec.type,
                        id: af_rec.id
                    });

                    var small_salers_order = Laf_rec.getValue('custrecord_dps_ship_small_salers_order');

                    log.error('small_salers_order', small_salers_order);

                    var fi_id = createItemFulfillment(small_salers_order);

                    log.audit('fi_id', fi_id);
                    var in_id = createInvoice(small_salers_order);
                    log.audit('in_id', in_id);

                } catch (error) {
                    log.error('出错了', error);
                }
            }
            if (rec_status == 3) {

                // var Laf_rec = record.load({
                //     type: af_rec.type,
                //     id: af_rec.id
                // });


                var soId;
                soId = af_rec.getValue('custrecord_dps_ship_small_salers_order');
                search.create({
                    type: af_rec.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: af_rec.id
                    }],
                    columns: [
                        'custrecord_dps_ship_small_salers_order'
                    ]
                }).run().each(function (rec) {
                    soId = rec.getValue('custrecord_dps_ship_small_salers_order');
                })


                log.debug('soId', soId);

                var fla = qtyBackOrdered(soId);

                log.debug('fla', fla);

                // 已获取物流跟踪单号, 直接推送 WMS

                var message = {};
                // 获取token
                var token = getToken();
                if (token && fla) {
                    var data = {};
                    // 业务数据填写至data即可
                    // 参数模板 (参数类型，是否必填)

                    search.create({
                        type: 'customrecord_dps_shipping_small_record',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: af_rec.id
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

                        // data["address"] =    //'地址';
                        data["city"] = rec.getValue('custrecord_dps_recipient_city'); // '城市';
                        data["country"] = rec.getText('custrecord_dps_recipient_country'); // '国家';
                        data["countryCode"] = rec.getValue({
                            name: 'custrecord_cc_country_code',
                            join: 'custrecord_dps_recipient_country'
                        }); //   '国家简码';
                        // data["detailCreateRequestDtos"] = '出库单明细';
                        // data["email"] = '邮箱地址';
                        data["logisticsChannelCode"] = rec.getValue({
                            name: 'custrecord_ls_service_code',
                            join: 'custrecord_dps_ship_small_channelservice'
                        }); //  '物流渠道服务编号';

                        data["logisticsChannelCode"] = rec.getValue('custrecord_dps_ship_small_channelservice');
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


                    var limit = 3999,
                        itemInfo = [];
                    search.create({
                        type: 'customrecord_dps_ship_samll_sku',
                        filters: [{
                            name: 'custrecord_dps_ship_small_links',
                            operator: 'anyof',
                            values: af_rec.id
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


                    for (var key in data) {
                        if (data[key] === '') {
                            delete data[key]
                        }
                    }

                    log.debug('delete data[key]', data);

                    // 发送请求
                    message = sendRequest(token, [data]);
                } else {
                    if (!fla) {
                        message.code = 3;
                        message.data = {
                            msg: '库存不足,无法发运'
                        }
                    } else {
                        message.code = 1;
                        message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
                    }
                }
                var flag, temp;

                log.debug('typeof(message): ' + typeof (message), message);
                try {
                    temp = JSON.s(message.data);
                } catch (error) {
                    log.audit('转换对象出错了', error);
                    temp = message.data;
                }

                log.audit('temp', temp);
                log.audit('temp.code', temp.code);
                if (temp.code == 0) {
                    flag = 14;
                } else {
                    flag = 8;
                }

                log.audit('推送 WMS flag', flag);
                var id = record.submitFields({
                    type: af_rec.type,
                    id: af_rec.id,
                    values: {
                        custrecord_dps_ship_small_status: flag,
                        custrecord_dps_ship_small_wms_info: JSON.stringify(temp)
                    }
                });
            }
        }


    }



    /**
     * 
     * @param {*} af_rec 
     */
    function TOWMS(af_rec) {

        // var Laf_rec = record.load({
        //     type: af_rec.type,
        //     id: af_rec.id
        // });


        var soId;
        soId = af_rec.getValue('custrecord_dps_ship_small_salers_order');
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [
                'custrecord_dps_ship_small_salers_order'
            ]
        }).run().each(function (rec) {
            soId = rec.getValue('custrecord_dps_ship_small_salers_order');
        })


        log.debug('soId', soId);

        var fla = qtyBackOrdered(soId);

        log.debug('fla', fla);

        // 已获取物流跟踪单号, 直接推送 WMS

        var message = {};
        // 获取token
        var token = getToken();
        if (token && fla) {
            var data = {};
            // 业务数据填写至data即可
            // 参数模板 (参数类型，是否必填)

            search.create({
                type: 'customrecord_dps_shipping_small_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
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

                // data["address"] =    //'地址';
                data["city"] = rec.getValue('custrecord_dps_recipient_city'); // '城市';
                data["country"] = rec.getText('custrecord_dps_recipient_country'); // '国家';
                data["countryCode"] = rec.getValue({
                    name: 'custrecord_cc_country_code',
                    join: 'custrecord_dps_recipient_country'
                }); //   '国家简码';
                // data["detailCreateRequestDtos"] = '出库单明细';
                // data["email"] = '邮箱地址';
                data["logisticsChannelCode"] = rec.getValue({
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_ship_small_channelservice'
                }); //  '物流渠道服务编号';

                data["logisticsChannelCode"] = rec.getValue('custrecord_dps_ship_small_channelservice');
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


            var limit = 3999,
                itemInfo = [];
            search.create({
                type: 'customrecord_dps_ship_samll_sku',
                filters: [{
                    name: 'custrecord_dps_ship_small_links',
                    operator: 'anyof',
                    values: af_rec.id
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


            for (var key in data) {
                if (data[key] === '') {
                    delete data[key]
                }
            }

            log.debug('delete data[key]', data);

            // 发送请求
            message = sendRequest(token, [data]);
        } else {
            if (!fla) {
                message.code = 3;
                message.data = {
                    msg: '库存不足,无法发运'
                }
            } else {
                message.code = 1;
                message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
            }
        }
        var flag, temp;

        log.debug('typeof(message): ' + typeof (message), message);
        try {
            temp = JSON.s(message.data);
        } catch (error) {
            log.audit('转换对象出错了', error);
            temp = message.data;
        }

        log.audit('temp', temp);
        log.audit('temp.code', temp.code);
        if (temp.code == 0) {
            flag = 14;
        } else {
            flag = 8;
        }

        log.audit('推送 WMS flag', flag);
        var id = record.submitFields({
            type: af_rec.type,
            id: af_rec.id,
            values: {
                custrecord_dps_ship_small_status: flag,
                custrecord_dps_ship_small_wms_info: JSON.stringify(temp)
            }
        });
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
            // url: config.WMS_Debugging_URL + '/outMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });

        log.debug('data20:', data);
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

    /**
     * 
     * @param {*} recordType 记录类型
     * @param {*} filters1 过滤条件
     * @param {*} columns1 结果字段
     * @param {*} flag 标志  true ? false
     */
    function createSearch(recordType, filters1, columns1, flag) {
        var temp = columns1;
        var info = {};
        for (var j = 0; j < columns1.length; j++) {
            info[columns1[j]] = columns1[j]
        }
        var result = [];
        search.create({
            type: recordType,
            filters: filters1,
            columns: columns1
        }).run().each(function (rec) {

            // for (var i = 0; i < columns1.length; i++) {
            //     var it = temp[i];
            //     log.debug('it', it);
            //     info[it] = rec.getValue(rec.columns[i]);
            //     info[internalid] = rec.id;
            // }
            result.push(rec);
            return flag;
        });

        return result || false;
    }

    function searchCreate(poastext) {
        var info = [];

        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'poastext',
                    operator: 'is',
                    values: poastext
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: [
                'location'
            ]
        }).run().each(function (rec) {
            var it = {
                id: rec.id,
                location: rec.getValue('location')
            }
            info.push(it);
        });

        return info || false;

    }

    /**
     * 
     * @param {*} sku 
     */
    function getItemBySku(sku) {
        var skuid;
        search.create({
            type: 'customrecord_dps_amazon_seller_sku',
            filters: [{
                    name: 'custrecord_dps_amazon_sku_number',
                    operator: 'is',
                    values: sku
                } //sku
                , { // 存在货品非活动的情况
                    name: 'isinactive',
                    join: 'custrecord_dps_amazon_ns_sku',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                'custrecord_dps_amazon_ns_sku'
            ]
        }).run().each(function (rec) {
            skuid = rec.getValue('custrecord_dps_amazon_ns_sku');
            return false;
        });
        return skuid || false;
    }

    /**
     * SO单生成 ITEM_FULFILLMENT
     * @param {*} id 
     * @param {*} shipment_number 
     * @param {*} bill_id 
     * @param {*} itemLNQt 
     */
    function createItemFulfillment(id, quantity, itemId, location) {
        var f = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: Number(id)
        });
        f.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });

        /*
        var numlines = f.getLineCount({
            sublistId: 'item'
        });

        for (var z = 0; z < numlines; z++) {
            var f_item = f.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: z
            })

            if (f_item == itemId) {
                //相同的货品  打勾
                f.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: quantity,
                    line: z
                });

                f.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    value: location,
                    line: z
                });

                f.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: true,
                    line: z
                });
            } else {
                f.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: z
                });
            }
        }
        */
        return f.save() || false;
    }

    /**
     * SO单生成INVOICE
     * @param {*} id 
     * @param {*} shipment_number 
     */
    function createInvoice(id) {
        var inv = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.INVOICE,
            fromId: Number(id)
        });
        return inv.save() || false;

    }


    /**
     * 推送发运记录给渠道商
     * @param {*} rec 
     */
    function pushOrder(rec) {
        rec = record.load({
            type: "customrecord_dps_shipping_small_record",
            id: rec.id
        });
        var channel = rec.getValue("custrecord_dps_ship_small_channel_dealer")
        var result
        log.audit('channel', channel);
        switch (channel) {
            case "1":
                jetstarApi.init(http, search)
                var result = jetstarApi.Create(rec, "small")
                log.audit('result', result);
                if (result.code == 200) {
                    var trackingNumber, single_pdf;
                    var shipment_id = result.data.shipment_id
                    var labelresult = jetstarApi.GetLabels(shipment_id, '')
                    if (labelresult.code == 200) {
                        trackingNumber = labelresult.data.shipment.tracking_number
                        single_pdf = labelresult.data.shipment.single_pdf
                    }
                    submitIdAndTackingNumber(rec, rec.id, shipment_id, trackingNumber, '', '', single_pdf)
                } else {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_small_record',
                        id: rec.id,
                        values: {
                            custrecord_dps_ship_small_status: 4,
                            custrecord_dps_push_state_xh: "失败",
                            custrecord_dps_push_result_xh: result.msg
                        }
                    });
                }
                break
            case "2":
                openApi.init(http, search, record)
                var result = openApi.CreateOrders(rec, "small")
                if (result.code == 200) {
                    var orderId = rec.getValue("custrecord_dps_ship_order_number")
                    submitIdAndTackingNumber(rec, rec.id, orderId)
                    result = openApi.GetInfo(orderId)
                    log.audit('infoResult', result);
                    if (result.code == 200) {
                        var data = result.data;
                        var Status = data.Status
                        if (Status == 'Created') {
                            var trackingNumber = data.TrackingNumber
                            updateTrackingNumber(rec_id, trackingNumber)
                        } else if (Status == 'CreateFailed') {
                            var CreateFailedReason = data.CreateFailedReason.ExtendMessage
                            record.submitFields({
                                type: 'customrecord_dps_shipping_small_record',
                                id: rec.id,
                                values: {
                                    custrecord_dps_ship_small_status: 4,
                                    custrecord_dps_push_state_xh: "失败",
                                    custrecord_dps_push_result_xh: CreateFailedReason
                                }
                            });
                        }
                    }
                } else {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_small_record',
                        id: rec.id,
                        values: {
                            custrecord_dps_ship_small_status: 4,
                            custrecord_dps_push_state_xh: "失败",
                            custrecord_dps_push_result_xh: result.msg
                        }
                    });
                }
                break
            case "5":
                yanwenApi.init(http, xml, file, search)
                var shipdate = rec.getValue("custrecord_dps_ship_small_shipping_date")
                var now
                //发运时间  工具类不方便处理 所以在这里
                if (shipdate) now = Moment(shipdate).toSimpleISOString()
                var result = yanwenApi.Create(rec, now)
                log.audit('result', result);
                if (result.code == 200) {
                    var shipment_id = result.data.Epcode
                    var YanwenNumber = result.data.YanwenNumber
                    log.audit('shipment_id', shipment_id);
                    submitIdAndTackingNumber(rec, rec.id, shipment_id, YanwenNumber)
                } else {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_small_record',
                        id: rec.id,
                        values: {
                            custrecord_dps_ship_small_status: 4,
                            custrecord_dps_push_state_xh: "失败",
                            custrecord_dps_push_result_xh: result.msg
                        }
                    });
                }
                break
            case "3":
                endiciaApi.init(http, xml, search)
                var now
                //发运时间  工具类不方便处理 所以在这里
                var result = endiciaApi.GetPostageLabel(rec)
                log.audit('result', result);
                if (result.code == 200) {
                    var shipment_id = result.data.PIC
                    var TrackingNumber = result.data.TrackingNumber
                    var Base64LabelImage = result.data.Base64LabelImage
                    var fileObj = file.create({
                        name: Moment().format("YYYYMMDDHHmmssSSS") + ".png",
                        fileType: file.Type.PNGIMAGE,
                        contents: Base64LabelImage,
                        description: 'Endicia面单',
                        encoding: file.Encoding.UTF8,
                        isOnline: true
                    });
                    // 保存文件 folder表示文件柜里面的文件夹的id
                    fileObj.folder = 2078;
                    var fileId = fileObj.save();
                    fileObj = file.load({
                        id: fileId
                    });

                    var url = 'https://';
                    var account = runtime.accountId;
                    log.debug("Account ID for the current user: ", runtime.accountId);
                    if (account.indexOf('_SB1') > -1) {
                        var ac = account.replace('_SB1', '');
                        url += ac + '-sb1.app.netsuite.com';
                    } else {
                        url += account + '.app.netsuite.com';
                    }
                    url += fileObj.url;


                    log.debug('url', url);

                    submitIdAndTackingNumber(rec, rec.id, shipment_id, TrackingNumber, Base64LabelImage, fileId, url)
                } else {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_small_record',
                        id: rec.id,
                        values: {
                            custrecord_dps_ship_small_status: 4,
                            custrecord_dps_push_state_xh: "失败",
                            custrecord_dps_push_result_xh: result.msg
                        }
                    });
                }
                break
        }
    }

    function submitIdAndTackingNumber(rec, id, shipment_id, trackingNumber, image, labelId, labelAddr) {
        var values = {
            // custrecord_dps_ship_small_status: 3,
            custrecord_dps_push_state_xh: "成功",
            custrecord_dps_push_result_xh: ""
        }
        if (shipment_id) {
            values.custrecord_dps_ship_small_logistics_orde = shipment_id
            values.custrecord_dps_ship_small_status = 3
        }
        if (trackingNumber) values.custrecord_dps_ship_small_trackingnumber = trackingNumber
        if (image) values.custrecord_dps_fulfill_record_xh_img = image
        if (labelId) values.custrecord_record_fulfill_xh_label_id = labelId
        if (labelAddr) {
            values.custrecord_record_fulfill_xh_label_addr = labelAddr
            values.custrecord_dps_ship_small_status = 3
        }
        record.submitFields({
            type: 'customrecord_dps_shipping_small_record',
            id: id,
            values: values
        });

        TOWMS(rec);
    }



    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});