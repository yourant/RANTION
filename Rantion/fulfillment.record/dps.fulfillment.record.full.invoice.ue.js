/*
 * @Author         : Li
 * @Date           : 2020-05-09 12:04:27
 * @LastEditTime   : 2020-05-28 16:14:25
 * @LastEditors    : Li
 * @Description    : FBM发货平台发运处理功能(小包)
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.record.full.invoice.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log',
        'SuiteScripts/dps/logistics/jetstar/dps_logistics_request.js',
        'SuiteScripts/dps/logistics/openapi/dps_openapi_request.js',
        'SuiteScripts/dps/logistics/yanwen/dps_yanwen_request.js',
        'SuiteScripts/dps/logistics/endicia/dps_endicia_request.js',
        'SuiteScripts/dps/logistics/common/Moment.min', 'N/http', 'N/file', "N/xml"
    ],
    function (record, search, log, jetstar, openapi, yanwen, endicia, Moment, http, file, xml) {

        function beforeLoad(context) {

            var action_type = context.type;
            if (action_type == 'view') {
                var form = context.form;
                var bf_cur = context.newRecord;

                var small_status = bf_cur.getValue('custrecord_dps_ship_small_status');
                if (small_status == 2) {
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
                form.clientScriptModulePath = './dps.fulfillment.record.full.invoice.cs.js';
            }

        }

        function beforeSubmit(context) {

        }

        function afterSubmit(context) {
            log.debug('type', context.type);

            // 1 未发运， 等待获取物流单号
            // 3 匹配物流失败， 手动处理
            // 5 已获取物流单号， 等待发运
            // 6 获取物流信息失败
            // 7 已获取物流跟踪单号
            // 8 WMS已发运
            // 9 WMS已部分发运
            // 10 WMS发运失败

            var af_rec = context.newRecord;
            var type = context.type;
            var rec_status = af_rec.getValue('custrecord_dps_ship_small_status');

            log.audit('rec_status: typeof: ' + typeof (rec_status), rec_status);

            if (type == 'create') {
                // 发运记录创建完成之后, 直接推送物流供应商

                // 获取渠道商
                var channel_dealer = af_rec.getValue('custrecord_dps_ship_small_channel_dealer');
                var l_af_rec = record.load({
                    type: af_rec.type,
                    id: af_rec.id
                });
                // TODO 根据渠道商来判断推送哪一个物流接口
                pushOrder(l_af_rec);
            }

            if (rec_status == 6 || rec_status == 7) {

                try {

                    // 系统订单号
                    var order_number = af_rec.getValue('custrecord_dps_ship_order_number');

                    // 平台订单号
                    var platform_order_numbe = af_rec.getValue('custrecord_dps_ship_platform_order_numbe');

                    // SKU
                    var sku = af_rec.getValue('custrecord_dps_ship_small_sku');

                    // quantity
                    var quantity = af_rec.getValue('custrecord_dps_ship_small_quantity');

                    // 发运 quantity
                    var shipment_quantity = rec.getValue('custrecord_dps_shipment_quantity');

                    log.debug('quantity: ' + quantity, 'SKU: ' + sku);

                    var sku_item = getItemBySku(sku);
                    var so_arr = searchCreate(platform_order_numbe);

                    log.debug('sku_item: ', sku_item);
                    log.debug('so_arr: ', so_arr);
                    if ((sku_item && sku_item != false) && (so_arr && so_arr != false)) {
                        var fi_id = createItemFulfillment(so_arr[0].id, shipment_quantity, sku_item, so_arr[0].location);
                        var in_id = createInvoice(so_arr[0].id);
                        log.debug('fi_id: ' + fi_id, 'in_id: ' + in_id);
                    }
                } catch (error) {
                    log.error('出错了', error);
                }
            } else if (rec_status == 3) {
                // 已获取物流跟踪单号, 直接推送 WMS
                // TODO

                // 已获取物流跟踪单号, 直接推送 WMS
                // TODO

                var message = {};
                // 获取token
                var token = getToken();
                if (token) {
                    var data = {};
                    // 业务数据填写至data即可
                    // 参数模板 (参数类型，是否必填)
                    // OutMasterCreateRequestDto {

                    //     detailCreateRequestDtos(Array[OutDetailCreateRequestDto]): 出库单明细,
                    //     logisticsChannelCode(string): 物流渠道服务编号,
                    //     logisticsChannelName(string): 物流渠道服务名称,
                    //     logisticsProviderCode(string): 物流渠道商编号,
                    //     logisticsProviderName(string): 物流渠道商名称,
                    //     shopCode(string, optional): 平台编号,
                    //     shopName(string, optional): 店铺名称,
                    //     sourceNo(string): 来源单号,
                    //     sourceType(integer): 来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整,
                    //     warehouseCode(string): 仓库编号,
                    //     warehouseName(string): 仓库名称,
                    //     waybillNo(string, optional): 运单号
                    // }
                    // OutDetailCreateRequestDto {
                    //         productImageUrl(string): 图片路径,
                    //         productTitle(string): 产品标题,
                    //         qty(integer): 出库数量,
                    //         sku(string): sku,
                    // }

                    data['logisticsChannelCode'] = af_rec.getValue('custrecord_dps_ship_small_channel_dealer');
                    data['logisticsChannelName'] = af_rec.getText('custrecord_dps_ship_small_channel_dealer');
                    data['logisticsProviderCode'] = af_rec.getValue('custrecord_dps_ship_small_channelservice');
                    data['logisticsProviderName'] = af_rec.getText('custrecord_dps_ship_small_channelservice');

                    data['shopName'] = af_rec.getText('custrecord_dps_ship_small_account');
                    data['sourceNo'] = af_rec.getText('custrecord_dps_ship_platform_order_numbe');
                    data['sourceType'] = 10;

                    data['warehouseCode'] = af_rec.getValue('custrecord_dps_ship_samll_location');
                    data['warehouseName'] = af_rec.getText('custrecord_dps_ship_samll_location');

                    var item_info = [];

                    var numlines = af_rec.getLineCount({
                        sublistId: 'recmachcustrecord_dps_ship_small_links'
                    });

                    for (var i = 0; i < numlines; i++) {
                        var it = {
                            productImageUrl: 'productImageUrl' + i,
                            productTitle: 'productTitle' + i,
                            qty: af_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_ship_small_links',
                                fieldId: 'custrecord_dps_ship_small_item_quantity',
                                line: i
                            }),
                            sku: af_rec.getSublistValue({
                                sublistId: 'recmachcustrecord_dps_ship_small_links',
                                fieldId: 'custrecord_dps_ship_small_sku_line',
                                line: i
                            })
                        }
                        item_info.push(it);
                    }

                    data["detailCreateRequestDtos"] = item_info;

                    // 发送请求
                    message = sendRequest(token, data);
                } else {
                    message.code = 1;
                    message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
                }
                var flag;
                var temp;
                try {
                    temp = JSON.parse(message);
                } catch (error) {
                    temp = message;
                }
                if (temp.data.code != 0) {
                    flag = 8
                } else {
                    flag = 14
                }
                var id = record.submitFields({
                    type: af_rec.type,
                    id: af_rec.id,
                    values: {
                        custrecord_dps_ship_small_status: flag,
                        custrecord_dps_ship_small_wms_info: message
                    }
                });
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

            log.debug('data20:', data);
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
            var channel = rec.getText("custrecord_dps_ship_small_channel_dealer")
            var result
            log.audit('channel', channel);
            switch (channel) {
                case "捷士":
                    jetstarApi.init(http, search)
                    var result = jetstarApi.Create(rec, "small")
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
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
                case "出口易":
                    openApi.init(http, search, record)
                    var result = openApi.CreateOrders(rec, "small")
                    if (result.code == 200) {
                        var orderId = rec.getValue("custrecord_dps_ship_platform_order_numbe")
                        var infoResult = openApi.GetInfo(orderId)
                        log.audit('infoResult', infoResult);
                        if (infoResult.code == 200) {
                            var trackingNumber = infoResult.data.TrackingNumber
                            var shipment_id = infoResult.data.Ck1PackageId
                            submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber)
                        }
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
                case "燕文物流":
                    yanwenApi.init(http, xml, file, search)
                    var shipdate = rec.getValue("custrecord_dps_ship_small_shipping_date")
                    var now
                    //发运时间  工具类不方便处理 所以在这里
                    if (shipdate) now = Moment(shipdate).toSimpleISOString()
                    var result = yanwenApi.Create(rec, now)
                    log.audit('result', result);
                    if (result.code == 200) {
                        var shipment_id = result.data.Epcode
                        log.audit('shipment_id', shipment_id);
                        submitIdAndTackingNumber(rec.id, shipment_id)
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
            }
        }

        function submitIdAndTackingNumber(id, shipment_id, trackingNumber) {
            var values = {
                custrecord_dps_push_state_xh: "成功",
                custrecord_dps_push_result_xh: ""
            }
            if (shipment_id) values.custrecord_dps_ship_small_logistics_orde = shipment_id
            if (trackingNumber) values.custrecord_dps_ship_small_trackingnumber = trackingNumber
            record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
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