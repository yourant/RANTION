/*
 * @Author         : Li
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-08-07 19:59:43
 * @LastEditors    : Li
 * @Description    : 发运记录 大包
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.ue.js
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
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml", 'N/runtime',
    '../Helper/config', '../Helper/tool.li', 'N/runtime'
], function (record, search, core, log, http, jetstar, openapi, yanwen, endicia, Moment, file, xml, runtime, config, tool, runtime) {

    function beforeLoad(context) {

        var type = context.type;

        var action_type = context.type;
        log.debug('action_type', action_type);
        var form = context.form;
        var bf_cur = context.newRecord;

        if (action_type == 'view') {

            var customs_information, bigRec_status, tracking_number, logistics_no, label, channel, logistStatus, amazon_box_flag, upload_packing_rec, location_type;

            var rec_shipmentsid, reference_id, ful_reference_id;

            search.create({
                type: bf_cur.type,
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: bf_cur.id
                }],
                columns: [
                    'custrecord_dps_shipping_rec_information', 'custrecord_dps_shipping_rec_status',
                    'custrecord_dps_ship_trackingnumber_dh', 'custrecord_dps_shipping_rec_logistics_no',
                    'custrecord_fulfill_dh_label_addr', 'custrecord_dps_shipping_r_channel_dealer',
                    'custrecord_dps_push_state', "custrecord_dps_amazon_box_flag", // 装箱信息处理成功
                    "custrecord_dps_upload_packing_rec", // 上传装箱信息处理记录
                    {
                        name: 'custrecord_dps_financia_warehous',
                        join: 'custrecord_dps_shipping_rec_location'
                    },

                    "custrecord_dps_shipping_rec_shipmentsid", // shipmentId
                    "custrecord_dps_to_reference_id", // REFERENCE ID
                    "custrecord_dps_ful_reference_id", // 标记已经推送 REFERENCE ID
                ]
            }).run().each(function (rec) {
                ful_reference_id = rec.getValue('custrecord_dps_ful_reference_id');
                reference_id = rec.getValue('custrecord_dps_to_reference_id'); // REFERENCE ID
                rec_shipmentsid = rec.getValue("custrecord_dps_shipping_rec_shipmentsid"); // shipmentId
                upload_packing_rec = rec.getValue('custrecord_dps_upload_packing_rec'); // 关联的上传记录
                amazon_box_flag = rec.getValue('custrecord_dps_amazon_box_flag'); // 装箱信息处理标记
                customs_information = rec.getValue('custrecord_dps_shipping_rec_information');
                bigRec_status = rec.getValue('custrecord_dps_shipping_rec_status');
                tracking_number = rec.getValue('custrecord_dps_ship_trackingnumber_dh');
                logistics_no = rec.getValue('custrecord_dps_shipping_rec_logistics_no');
                label = rec.getValue('custrecord_fulfill_dh_label_addr');
                channel = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                logistStatus = rec.getValue('custrecord_dps_push_state');
                location_type = rec.getValue({
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                });
            });

            log.debug('customs_information', customs_information);

            log.debug('beforeLoad bigRec_status', bigRec_status);
            // if (type == 'view' && (bigRec_status == 4 || bigRec_status == 12) && !logistics_no && channel == 1) {
            //     form.addButton({
            //         id: 'custpage_dps_li_sales_button',
            //         label: '重新获取物流信息',
            //         functionName: "reacquireLogistics(" + bf_cur.id + ")"
            //     });
            // }
            if (type == 'view' && (bigRec_status == 11 || bigRec_status == 9)) { // 不存在shipmentId
                // if (type == 'view' && (bigRec_status == 11 || bigRec_status == 9) && !rec_shipmentsid) { // 不存在shipmentId
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '重新获取Shipment',
                    functionName: "amazonShipment(" + bf_cur.id + ")"
                });
            }
            if (type == 'view' && bigRec_status == 27) {
                form.addButton({
                    id: 'custpage_dps_li_box_button',
                    label: '已完成录入装箱信息',
                    functionName: "finishPackage(" + bf_cur.id + ")"
                });
            }
            if (type == 'view' && bigRec_status == 29 && location_type == 3) {
                form.addButton({
                    id: 'custpage_dps_li_out_button',
                    label: '发运出库',
                    functionName: "confirmOut(" + bf_cur.id + ")"
                });
            }
            if (type == 'view' && !customs_information) {
                // if (type == 'view' && bigRec_status == 6 && !customs_information) {
                form.addButton({
                    id: 'custpage_dps_li_customs_information',
                    label: '生成报关资料',
                    functionName: "createInformation(" + bf_cur.id + ")"
                });
            }
            if (type == 'view' && bigRec_status == 8 /*|| bigRec_status == 9*/ ) {
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '推送WMS装箱',
                    functionName: "WMSShipping(" + bf_cur.id + ")"
                });
            }

            if (!amazon_box_flag && upload_packing_rec && (bigRec_status != 28)) {
                form.addButton({
                    id: 'custpage_dps_li_feed_info',
                    label: '获取装箱信息处理情况',
                    functionName: "amazonFeedStatus(" + bf_cur.id + ")"
                });
            }
            if (bigRec_status == 28) { //原有的装箱信息已上传, 并且存在错误
                form.addButton({
                    id: 'custpage_dps_li_up_feed_info',
                    label: '重新上传装箱信息',
                    functionName: "amazonBoxInfo(" + bf_cur.id + ")"
                });
            }

            if (reference_id && !ful_reference_id && (bigRec_status == 6 || bigRec_status == 7 || bigRec_status == 12 || bigRec_status == 13)) {
                form.addButton({
                    id: 'custpage_dps_li_refer_id',
                    label: '推送 reference Id 至 WMS',
                    functionName: "toWMSReferenceId(" + bf_cur.id + ")"
                });
            }
            // var tracking_number = bf_cur.getValue('custrecord_dps_ship_trackingnumber_dh');
            // var logistics_no = bf_cur.getValue('custrecord_dps_shipping_rec_logistics_no');
            // if (!tracking_number && bigRec_status == 3) {

            /* HACK
            if (!tracking_number && type == 'view' && logistics_no) {
                form.addButton({
                    id: 'custpage_dps_li_traking_button',
                    label: '获取物流跟踪号',
                    functionName: "getTrackingNumber(" + bf_cur.id + ")"
                });
            }
            */

            // var label = bf_cur.getValue('custrecord_fulfill_dh_label_addr')
            // if (bf_cur.id) {
            //     // var channel = bf_cur.getValue("custrecord_dps_shipping_r_channel_dealer")
            //     // var logistStatus = bf_cur.getValue('custrecord_dps_push_state');
            //     if (!label && logistStatus == "成功" && channel == "1") {
            //         form.addButton({
            //             id: 'custpage_dps_li_get_label',
            //             label: '获取面单',
            //             functionName: "getLabel(" + bf_cur.id + ")"
            //         });
            //     }
            // }
            // if (!label && logistStatus == "成功" && channel == "1") {
            //     form.addButton({
            //         id: 'custpage_dps_li_get_label',
            //         label: '获取面单',
            //         functionName: "getLabel(" + bf_cur.id + ")"
            //     });
            // }

            if (type == 'view' && bigRec_status == 20) {
                form.addButton({
                    id: 'custpage_dps_li_get_label',
                    label: '推送标签面单文件',
                    functionName: "LabelDocument(" + bf_cur.id + ")"
                });
            }
            form.clientScriptModulePath = './dps.funfillment.record.big.logi.cs.js';
        } else if (action_type == "copy") {
            bf_cur.setValue({
                fieldId: 'custrecord_dps_shipping_rec_order_num',
                value: ''
            }); // 置空关联的调拨单
            bf_cur.setValue({
                fieldId: 'custrecord_dps_shipping_rec_status',
                value: ''
            }); // 设置相关状态为空
            bf_cur.setValue({
                fieldId: 'custrecord_dps_shipping_rec_wms_info',
                value: '属于复制发运记录,置空相关字段'
            }); // 设置提示信息

        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var af_rec1 = context.newRecord;
        var actionType = context.type;

        if (actionType != 'delete') { // 删除动作, 不执行

            af_rec = record.load({
                type: af_rec1.type,
                id: af_rec1.id
            });

            // 1 未发运， 等待获取物流单号      2 匹配物流失败， 手动处理       3 等待推送WMS发运
            // 4 获取物流信息失败       5 请输入 shipmentId     6 WMS已发运
            // 7 WMS已部分发运      8 WMS发运失败       9 未发运， 等待获取Shipment
            // 10 已获取Shipment号， 等待装箱       11 申请Shipment失败     12 WMS已装箱
            // 13 WMS已部分装箱     14 已推送WMS        15 已创建入库计划
            // 16 已创建入库件      17 已获取标签       18 已更新入库件
            // 19 已推送 标签文件       20 推送标签文件至 WMS 失败      21 等待获取物流面单
            // 22 获取标签文件失败      23 渠道退件已入库       24 已上传装箱信息        25 上传装箱信息成功

            var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
            log.audit('rec_status', rec_status);

            // 1 FBA调拨    2 自营仓调拨    3 跨仓调拨  4  移库  5  公司间交易   6  报损  7  供应商直发
            var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type'); // 调拨单类型
            log.debug('tranor_type', tranor_type);

            var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account'); // 店铺
            var type = 10;

            var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');
            try {
                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                if (rec_status == 6 || rec_status == 7) { // 陆行对应的库存转移订单  6	WMS已发运  7	WMS已部分发运

                    var toId = af_rec.getValue('custrecord_dps_shipping_rec_order_num');
                    try {
                        if (toId) {
                            log.debug('toId: ' + toId, "存在调拨单")
                            var it = searchItemTo(toId);
                            var a = searchItemAver(it.ItemArr, it.Location);
                            setToValue(toId, a);
                        } else {
                            log.debug('不存在调拨单', "不取库存平均成本");
                        }

                    } catch (error) {
                        log.error('设置库存成本出错了', error);
                    }

                }
                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                if (rec_status == 3 || rec_status == 10) { //3	已获取物流单号，等待发运    10	已获取Shipment，等待装箱
                    // 推送 WMS, 获取装箱信息
                    orderToWMS(af_rec);
                }

                var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                log.audit("是否存在 shipment Id", rec_shipmentsid)
                if (rec_status == 5 && /* channel_dealer == 6 &&  */ rec_shipmentsid) { // 状态为 请输入 shipmentId , 渠道商为 龙舟, 并且 存在 shipmentId

                    orderToWMS(af_rec);
                }


                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                if (rec_status == 9 && (tranor_type == 1 || tranor_type == 3)) { // 发运记录的状态为 9	未发运，等待获取Shipment 时, 可能是FBA调拨, 也可能是 跨仓调拨
                    type = 20;

                    // 创建入库装运计划     createInboundShipmentPlan
                    var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
                    var SellerSKU;
                    if (rec_account) {
                        var lim2 = 3999;
                        // }
                        var ship_to_country_code = "",
                            address_id = {},
                            label_prep_preference = "SELLER_LABEL",
                            items = [],
                            sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

                        var Lim = 3999;
                        search.create({
                            type: af_rec.type, //发运记录，大货
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
                                },
                                {
                                    name: "custrecord_dps_ship_record_sku_item", // sleller sku
                                    join: "custrecord_dps_shipping_record_parentrec"
                                },
                            ]
                        }).run().each(function (rec) {
                            var nsItem = rec.getValue({
                                name: "custrecord_dps_shipping_record_item",
                                join: "custrecord_dps_shipping_record_parentrec"
                            });
                            log.debug('nsItem', nsItem);
                            ship_to_country_code = rec.getValue({
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_dps_recipient_country_dh'
                            });
                            SellerSKU = rec.getValue({
                                name: "custrecord_dps_ship_record_sku_item", // sleller sku
                                join: "custrecord_dps_shipping_record_parentrec"
                            });

                            var info = {
                                SellerSKU: SellerSKU,
                                ASIN: '',
                                Condition: '',
                                Quantity: Number(rec.getValue({
                                    name: "custrecord_dps_ship_record_item_quantity",
                                    join: "custrecord_dps_shipping_record_parentrec"
                                })),
                                QuantityInCase: '',
                            }
                            items.push(info);

                            return --Lim > 0;
                        });

                        log.debug('items', items);

                        if (SellerSKU) {
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

                            // if (rec_account) {
                            var shipping_rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                            var DestinationFulfillmentCenterId = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
                            log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

                            var reItem = [],
                                recordID = af_rec.id,
                                upresp;

                            var str = '';

                            var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer')
                            if (!shipping_rec_shipmentsid && channel_dealer == 1) { // shipmentId 不存在, 并且渠道服务为捷仕, 才申请 shipmentId
                                try {
                                    log.debug('申请shipmentID', '申请shipmentID');
                                    // 创建入库计划, 获取 shipment
                                    log.error('createInboundShipmentPlan items', items);
                                    ship_to_country_code = '';
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

                                        // "ShipToAddress": { "id": "", "Name": "LGB3", "AddressLine1": "4950 Goodman Way", "AddressLine2": "", "City": "Eastvale","DistrictOrCounty": "","StateOrProvinceCode": "CA", "CountryCode": "US","PostalCode": "91752-5087"}

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

                                        var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                                        if (util.isObject(response1)) {
                                            var id = record.submitFields({
                                                type: 'customrecord_dps_shipping_record',
                                                id: af_rec.id,
                                                values: {
                                                    custrecord_dps_shipping_rec_status: 11,
                                                    custrecord_dps_shipment_info: JSON.stringify(response1)
                                                }
                                            });
                                        } else {
                                            var id = record.submitFields({
                                                type: 'customrecord_dps_shipping_record',
                                                id: af_rec.id,
                                                values: {
                                                    custrecord_dps_shipping_rec_status: 16,
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
                                                    custrecord_dps_shipping_rec_status: 11,
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
                                                custrecord_dps_shipping_rec_status: 11,
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
                                        // 推送 WMS
                                        wms(af_rec);
                                    }
                                } catch (error) {
                                    log.error('推送 WMS 失败', error);
                                }
                            }

                        } else {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: af_rec.id,
                                values: {
                                    custrecord_dps_shipping_rec_status: 11,
                                    custrecord_dps_shipment_info: "找不到对应关系,请检查对应关系"
                                }
                            });
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
                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                var logistics_no = af_rec.getValue('custrecord_dps_shipping_rec_logistics_no');
                log.debug('logistics_no', logistics_no);

                // 获取 NS 上传装箱信息状态

                var upload_packing_informa = af_rec.getValue('custrecord_dps_ns_upload_packing_informa');

                log.debug('获取 NS 上传装箱信息状态', upload_packing_informa);

                if (rec_status == 12 && upload_packing_informa) { // 12	WMS已装箱, 并且需要 NS 上传装箱信息
                    var shipment_label_file = af_rec.getValue('custrecord_dps_shipment_label_file');
                    log.debug('shipment_label_file', shipment_label_file);

                    var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
                    var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                    // 上传装箱信息
                    var gerep = core.amazon.submitCartonContent(rec_account, af_rec.id, rec_shipmentsid);

                    log.audit('上传装箱信息提交状态 gerep', gerep);

                    if (gerep == "_SUBMITTED_") {

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 24
                            }
                        });

                        return;

                    }
                    var submission_ids = [];

                    search.create({
                        type: af_rec.type,
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: af_rec.id
                        }],
                        columns: [{
                            name: 'custrecord_aio_feed_submission_id',
                            join: 'custrecord_dps_upload_packing_rec'
                        }]
                    }).run().each(function (rec) {
                        submission_ids.push(rec.getValue({
                            name: 'custrecord_aio_feed_submission_id',
                            join: 'custrecord_dps_upload_packing_rec'
                        }))
                    })

                    log.debug('feed提交ID submission_id', submission_ids);
                    // 获取本次装箱信息提交的状态
                    var a = core.amazon.getFeedSubmissionList(rec_account, submission_ids);

                    log.debug('获取上传装箱信息处理结果', a);

                    var MessagesWithError = a[0].MessagesWithError;
                    log.debug('上传装箱信息错误 MessagesWithError', MessagesWithError);
                    var subFlag = true;
                    if (MessagesWithError > 0) {
                        subFlag = false;
                        log.debug('上传装箱信息报错', '上传信息有误');
                    }

                    var feed_processing_status = a[0].feed_processing_status;
                    if (feed_processing_status != "_DONE_") {
                        subFlag = false;
                    }

                    log.debug('feed_processing_status', feed_processing_status);
                    log.debug('subFlag', subFlag);

                    // 装箱信息上传处理成功标记
                    var amazon_box_flag = af_rec.getValue('custrecord_dps_amazon_box_flag');

                    if ((tranor_type == 1 || tranor_type == 3) && !shipment_label_file && (subFlag || amazon_box_flag)) { // 不存在标签文件, 并且上传装箱信息返回无报错, 获取箱唛标签

                        log.debug('rec_account', rec_account);
                        log.debug('rec_shipmentsid', rec_shipmentsid);
                        var total_number = af_rec.getValue('custrecord_dps_total_number');
                        log.debug('total_number', total_number);
                        var getRe;
                        log.debug('获取箱外标签', 'start');

                        if (rec_shipmentsid) {
                            try {
                                getRe = core.amazon.GetPackageLabels(rec_account, total_number, rec_shipmentsid);
                            } catch (error) {
                                log.error('获取箱唛出错了', error);
                            }
                            log.debug('getRe', getRe);
                            log.debug('获取箱外标签', 'end');
                            if (getRe) {
                                var add;
                                if (channel_dealer == 6) {
                                    try {
                                        add = getShipAddByContent({
                                            "base64": getRe
                                        });

                                        log.audit('返回解析PDF的文本', add);
                                    } catch (error) {
                                        log.audit('解析PDF error', error);
                                    }
                                }
                                var fileObj = file.create({
                                    name: rec_shipmentsid + '.ZIP',
                                    fileType: file.Type.ZIP,
                                    contents: getRe,
                                    // description: 'This is a plain text file.',
                                    // encoding: file.Encoding.MAC_ROMAN,
                                    folder: 36,
                                    isOnline: true
                                });

                                var fileObj_id = fileObj.save();
                                log.debug('fileObj_id', fileObj_id);
                                var recValue = {};
                                recValue.custrecord_dps_shipping_rec_status = 17;
                                recValue.custrecord_dps_shipment_label_file = fileObj_id;
                                if (add && add.length > 0) {
                                    recValue.custrecord_dps_recpir_flag = add ? add : '';
                                    var addLen = add.length;
                                    recValue.custrecord_dps_ship_small_recipient_dh = add[0]; // 收件人 
                                    recValue.custrecord_dps_street1_dh = add[1]; // 街道1
                                    if (addLen > 6) {
                                        recValue.custrecord_dps_street2_dh = add[2]; // 街道2
                                    }
                                    recValue.custrecord_dps_state_dh = add[addLen - 3]; // 州
                                    var temp1 = add[addLen - 1],
                                        temp2 = '',
                                        temp3 = temp1.split(" ");
                                    if (temp3.length > 1) {
                                        temp2 = temp3[temp3.length - 1];
                                        recValue.custrecord_dps_recipien_code_dh = temp3[0] + ' ' + temp3[1]; // 邮编
                                    }
                                    var seaCout;

                                    try {
                                        seaCout = searchCreateCountry(temp2);
                                    } catch (error) {
                                        log.debug('搜索创建国家 error', error);
                                    }
                                    if (seaCout) {
                                        recValue.custrecord_dps_recipient_country_dh = seaCout; // 国家
                                    }
                                    var searCity;
                                    try {
                                        searCity = searchCreateCity(add[addLen - 2]);
                                    } catch (error) {
                                        log.debug('搜索创建城市 error', error);
                                    }
                                    if (searCity) {
                                        recValue.custrecord_dps_recipient_city_dh = searCity; // 城市
                                    }
                                }

                                recValue.custrecord_dps_amazon_box_flag = true;

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: recValue
                                });
                                log.debug('id', id);
                                var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                                // if (channel_dealer == 6) { // 渠道为龙舟的, 获取到标签文件之后, 直接推送标签文件给WMS
                                // }
                                labelToWMS(af_rec);
                            }
                        }

                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 25,
                                // custrecord_dps_amazon_box_flag: false
                                // custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                            }
                        });
                    }

                    if (shipment_label_file) {
                        labelToWMS(af_rec);
                    }
                    var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                    if (!logistics_no && channel_dealer == 1) {
                        log.debug('pushOrder Start', '不存在物流运单号');
                        // pushOrder(af_rec);   // HACK  暂不推送给捷仕
                        log.debug('pushOrder End', '不存在物流运单号');
                    }
                }
                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                var logistics_no = af_rec.getValue('custrecord_dps_shipping_rec_logistics_no');
                if ((rec_status == 12 || rec_status == 17 || rec_status == 22) && !logistics_no && channel_dealer == 1) {
                    log.debug('不存在物流运单号', '不存在物流运单号');
                    // pushOrder(af_rec);   // HACK  暂不推送给捷仕
                }
                var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status'); // 调拨单的状态
                if (rec_status == 17) {
                    labelToWMS(af_rec);
                }
            } catch (error) {
                log.error('出错了', error);
            }

        }

    }


    /**
     * 搜索 TO 的货品和地点
     * @param {*} toId 
     */
    function searchItemTo(toId) {

        var itemArr = [],
            Loca,
            limit = 3999;
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: toId
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
                },

            ],
            columns: [
                "item", "location"
            ]
        }).run().each(function (rec) {
            itemArr.push(rec.getValue('item'));
            Loca = rec.getValue('location');
            return --limit > 0
        });

        var retObj = {
            Location: Loca,
            ItemArr: itemArr
        }

        return retObj || false;
    }

    /**
     * 搜索货品对应店铺的库存平均成本
     * @param {*} itemArr 
     * @param {*} Location 
     */
    function searchItemAver(itemArr, Location) {
        var priceArr = [];
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: itemArr
                },
                {
                    name: 'inventorylocation',
                    operator: 'anyof',
                    values: Location
                }
            ],
            columns: ['locationaveragecost', "averagecost", ]
        }).run().each(function (rec) {
            var it = {
                itemId: rec.id,
                averagecost: rec.getValue('averagecost')
            }
            priceArr.push(it);

            return true;
        });

        return priceArr || false;

    }

    /**
     * 设置 TO 货品行的 转让价格
     * @param {*} toId 
     * @param {*} valArr 
     */
    function setToValue(toId, valArr) {

        var toRec = record.load({
            type: 'transferorder',
            id: toId,
            isDynamic: false,
        });

        var cLine = toRec.getLineCount({
            sublistId: "item"
        });

        for (var i = 0, len = valArr.length; i < len; i++) {

            var t = valArr[i];

            var lineNumber = toRec.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: t.itemId
            });
            toRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: t.averagecost,
                line: lineNumber
            });
        }

        var toRec_id = toRec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
        log.debug('toRec_id', toRec_id);
    }


    /**
     * 搜索并创建城市记录
     * @param {*} City 
     */
    function searchCreateCity(City) {

        var cityId;
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

        return cityId || false;
    }



    /**
     * 搜索或创建国家记录
     * @param {*} CountryCode 
     */
    function searchCreateCountry(CountryCode) {
        var countryId;
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
            search.create({
                type: 'customrecord_country_code',
                filters: [{
                    name: "custrecord_cc_country_name_en",
                    operator: 'is',
                    values: CountryCode
                }]
            }).run().each(function (rec) {
                countryId = rec.id;
            });
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
            newCode.setValue({
                fieldId: 'custrecord_cc_country_name_en',
                value: CountryCode
            });

            countryId = newCode.save();

            log.debug('countryId', countryId);
        }

        return countryId || false;
    }


    function setRecValue(newArr) {



    }



    function getShipAddByContent(data) {

        var str;
        log.debug('sendRequest data', data);
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': getToken()
        };
        var response = http.post({
            // url: 'http://47.107.254.110:8066/swagger-ui.html#!/36890299922604127861/pdfParseToTextUsingPOST',
            // url: 'http://47.107.254.110:18082/rantion-wms/common/pdfParseToText',
            url: config.WMS_Debugging_URL + '/common/pdfParseToText',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        retdata = JSON.parse(response.body);

        if (retdata.code == 0) {
            var jsonRep = retdata.data;
            str = getShipToAddr(jsonRep);
        }

        return str || false;

    }



    function getShipToAddr(str) {

        var newArr = [];
        var a = str.split("FBA");
        var b = a[1];
        var c = b.toString().split("发货地");

        var d = c[0].split("\n");

        for (var i = 0, len = d.length; i < len; i++) {
            if (d[i] == "" || d[i] == undefined || d[i] == null || d[i].indexOf('目的地') > -1 || d[i].indexOf('发货地') > -1 || d[i].indexOf("Declarant") > -1) {
                continue;
            }
            newArr.push(d[i].trim());
        }

        return newArr || false;
    }




    /**
     * 推送WMS
     * @param {Object} af_rec
     */
    function orderToWMS(af_rec) {
        // 推送 WMS, 获取装箱信息

        var flagLocation;

        //     1 FBA仓   2 自营仓   3 工厂仓   4 虚拟仓    5 虚拟在途仓
        // 先判断起始仓库是否为工厂仓
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [{
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 财务分仓 类型
            ]
        }).run().each(function (rec) {
            flagLocation = rec.getValue({
                name: 'custrecord_dps_financia_warehous',
                join: 'custrecord_dps_shipping_rec_location'
            });
        });

        if (flagLocation == 3) { // 属于财务分仓属于 工厂仓


            // 27	等待录入装箱信息
            log.debug('发出仓库属于工厂仓', "直接退出, 不推送WMS")

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: af_rec.id,
                values: {
                    custrecord_dps_shipping_rec_status: 27,
                    custrecord_dps_shipping_rec_wms_info: '发出仓为工厂仓, 推送WMS '
                }
            });

            return;
        }

        var rec_transport = af_rec.getValue('custrecord_dps_shipping_rec_transport');
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


        var message = {};
        // 获取token
        // var token = getToken();

        var token = getToken();
        if (token) {
            var data = {};
            var tranType, fbaAccount, logisticsFlag = 0;

            var ful_to_link;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_dps_shipping_rec_transport',
                    'custrecord_dps_shipping_rec_order_num', // 调拨单号
                    {
                        name: 'tranid',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    },
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
                    "custrecord_dps_shipping_rec_destinationf", // 仓库中心编号

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
                        name: 'custrecord_ls_is_face',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 渠道服务存在面单文件

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
                    {
                        name: 'custrecord_dps_ship_remark'
                    }, // 备注

                    "custrecord_dps_to_shipment_name", // shipment name
                    "custrecord_dps_to_reference_id", // reference id
                ]
            }).run().each(function (rec) {

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

                data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");

                data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment name

                data["shippingType"] = shippingType;
                data["aono"] = rec.getValue({
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
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

                logisticsFlag = rec.getValue({
                    name: 'custrecord_ls_is_face',
                    join: 'custrecord_dps_shipping_r_channelservice'
                })

                if (logisticsFlag) {
                    data["logisticsFlag"] = 1;
                } else {
                    data["logisticsFlag"] = 0;
                }
                // logisticsFlag (integer): 是否需要物流面单 0:否 1:是 

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
                // 1 FBA调拨         2 自营仓调拨             3 跨仓调拨            4 移库

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
                data["remark"] = rec.getValue('custrecord_dps_ship_remark'); // 备注字段
                data["waybillNo"] = waybillNo; // 运单号
            });

            var createdBy;
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: ful_to_link
                }],
                columns: [
                    "createdby"
                ]
            }).run().each(function (rec) {
                createdBy = rec.getText('createdby');
            });

            data["createBy"] = createdBy; // 设置调拨单创建者

            var taxamount;
            var item_info = [];
            var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
            // var numLines = af_rec.getLineCount({
            //     sublistId: subli_id
            // });


            var itemArr = [];
            var ful_limit = 3999;
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
                    'custrecord_dps_ship_record_sku_item', //seller sku
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

                return --ful_limit > 0;
            });

            log.debug('itemArr', itemArr);
            // 2020/7/18 13：44 改动 
            var fils = [],
                add_fils = []; //过滤
            var len = item_info.length,
                num = 0;
            item_info.map(function (ld) {
                num++;
                add_fils.push([
                    ["name", "is", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
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
                var fls_skus = [];
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: fils,
                    columns: [
                        "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                    ]
                }).run().each(function (rec) {
                    var temp_name = rec.getValue('name');
                    var it = rec.getValue('custrecord_ass_sku');
                    item_info.forEach(function (item, key) {
                        if (item.itemId == it && item.msku == temp_name && fls_skus.indexOf(temp_name) == -1) {
                            item.asin = rec.getValue("custrecord_ass_asin");
                            item.fnsku = rec.getValue("custrecord_ass_fnsku");
                            item.msku = rec.getValue('name');
                            newItemInfo.push(item);
                            fls_skus.push(temp_name);
                        }
                    });
                    return --new_limit > 0;
                });
                log.debug('newItemInfo', newItemInfo);

                if (newItemInfo && newItemInfo.length == 0) {

                    log.audit('Amazon Seller SKU 中找不到对应的映射关系', "Amazon Seller SKU 中找不到对应的映射关系");
                    message.code = 3;
                    message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 8,
                            custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
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


            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(af_rec.id, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0) {

                message.code = 3;
                message.data = juArr + ': Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                    }
                });

                return message;
            }

            try {
                // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
                tool.wmsInfo(ful_to_link, data, 1, '创建调拨单');

            } catch (error) {
                log.audit('创建推送WMS数据记录出错', error);
            }
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
                custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
            }
        });

    }



    /**
     * 标签文件推送 WMS
     * @param {Object} af_rec 
     */
    function labelToWMS(af_rec) {

        var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label, tranType, waybillNo, location_financia;

        var tranferOrder;
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
                },
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码
                'custrecord_dps_shipment_label_file', // 装运标签文件
                'custrecord_dps_shipping_r_channelservice', // 渠道服务
                'custrecord_dps_shipping_r_channel_dealer', //渠道商
                'custrecord_dps_shipping_rec_order_num', // 调拨单号
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                'custrecord_fulfill_dh_label_addr', // 面单地址,
                'custrecord_dps_shipping_rec_logistics_no', // 物流运单号
                {
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                },
                {
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
                }
            ]
        }).run().each(function (rec) {

            tranferOrder = rec.getValue('custrecord_dps_shipping_rec_order_num');
            waybillNo = rec.getValue('custrecord_dps_shipping_rec_logistics_no');

            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');
            aono = rec.getValue({
                name: 'tranid',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            fileId = rec.getValue('custrecord_dps_shipment_label_file');

            location_financia = rec.getValue({
                name: 'custrecord_dps_financia_warehous',
                join: 'custrecord_dps_shipping_rec_location'
            });
            service_code = rec.getValue("custrecord_dps_shipping_r_channelservice");
            channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
            channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
            channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            Label = rec.getValue('custrecord_fulfill_dh_label_addr'); // 面单地址
        });

        log.debug('Label: ', Label);
        if (location_financia == 3) {
            return;
        }
        // 属于FBA调拨
        if ((tranType == 1 || tranType == 3) && channel_dealer_id == 1) { // 跨仓调拨至 FBA、FAB调拨   捷仕渠道 暂不对接
            // if (Label && (tranType == 1 || tranType == 3) && channel_dealer_id == 1) { // 跨仓调拨至 FBA、FAB调拨   捷仕渠道 暂不对接
            // 存在面单文件
            var url;
            url = 'https://'
            if ((tranType == 1 || tranType == 3) && fileId) {
                var fileObj = file.load({
                    id: fileId
                });
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : "", // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };

            var token = getToken();
            if (token && url) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + '/allocationMaster/callbackForBox',
                    headers: headerInfo,
                    body: JSON.stringify(data)
                });
                log.debug('response', JSON.stringify(response));
                retdata = JSON.parse(response.body);

                try {
                    // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
                    tool.wmsInfo(tranferOrder, data, 1, '推送面单文件');

                } catch (error) {
                    log.audit('创建推送WMS数据记录出错', error);
                }
                var code;
                log.audit('retdata', retdata);
                if (response.code == 200) {
                    // 调用成功
                    if (retdata.code == 0) {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 19,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 20,
                            custrecord_dps_shipping_rec_wms_info: '请求失败'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 20,
                        custrecord_dps_shipping_rec_wms_info: '无面单文件'
                    }
                });
            }

        }
        /*
        if (tranType == 2 || tranType == 3) {
            // if (Label && (tranType == 2 || tranType == 3)) {
            // 存在面单文件
            var url = 'https://';
            if (tranType == 1 && fileId) {
                var fileObj = file.load({
                    id: fileId
                });
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : "", // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };

            var token = getToken();
            if (token) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/allocationMaster/callbackForBox",
                    headers: headerInfo,
                    body: JSON.stringify(data)
                });
                log.debug('response', JSON.stringify(response));
                retdata = JSON.parse(response.body);

                // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
                tool.wmsInfo(tranferOrder, data, 1, '推送面单文件');

                var code;
                log.audit('retdata', retdata);
                if (response.code == 200) {
                    // 调用成功
                    if (retdata.code == 0) {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 19,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            // custrecord_dps_shipping_rec_status: 19,
                            custrecord_dps_shipping_rec_wms_info: 'Token 失效了'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
            }

            // } else if (channel_dealer_id == 6 || channel_dealer_id == "Amazon龙舟") {
        }
        */
        if (channel_dealer_id == 6 || channel_dealer_id == "Amazon龙舟") {

            var url;
            if (fileId) {
                var fileObj = file.load({
                    id: fileId
                });

                url = 'https://'
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : '', // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };

            log.debug('data', data);
            var token = getToken();
            if (token && url) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/allocationMaster/callbackForBox",
                    headers: headerInfo,
                    body: JSON.stringify(data)
                });
                log.debug('response', JSON.stringify(response));
                retdata = JSON.parse(response.body);
                var code;
                log.audit('retdata', retdata);

                try {
                    // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
                    tool.wmsInfo(tranferOrder, data, 1, '推送面单文件');

                } catch (error) {
                    log.audit('创建推送WMS数据记录出错', error);
                }
                if (response.code == 200) {
                    // 调用成功
                    if (retdata.code == 0) {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 19,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            // custrecord_dps_shipping_rec_status: 19,
                            custrecord_dps_shipping_rec_wms_info: 'Token 失效了'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
            }

        } else {
            log.debug('物流面单不存在', '物流面单不存在');
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
            url: config.WMS_Debugging_URL + '/allocationMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) {
            // 调用成功
            retdata = JSON.parse(response.body);
            code = retdata.code;
        } else {
            code = 1;
            // 调用失败
            // retdata = "请求失败"
            retdata = {
                code: 1,
                msg: "请求失败"
            }
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
        rec = record.load({
            type: "customrecord_dps_shipping_record",
            id: rec.id
        });
        var channel = rec.getValue("custrecord_dps_shipping_r_channel_dealer")
        var result
        log.audit('channel', channel);
        switch (channel) {
            case "1":
                jetstarApi.init(http, search)
                var result = jetstarApi.Create(rec, "big");
                log.audit('result', result);
                if (result.code == 200) {
                    var shipment_id = result.data.shipment_id;
                    var labelresult = jetstarApi.GetLabels(shipment_id, '');
                    var trackingNumber, single_pdf
                    if (labelresult.code == 200) {
                        trackingNumber = labelresult.data.shipment.tracking_number;
                        single_pdf = labelresult.data.shipment.single_pdf
                        // var custrecord_dps_store
                    }
                    submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber, single_pdf, rec);
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

    // 获取到物流追踪号, 不需要推送 WMS
    function submitIdAndTackingNumber(id, shipment_id, trackingNumber, labeladdr, af_rec) {

        var flag = false;
        var values = {
            custrecord_dps_push_state: "成功",
            custrecord_dps_push_result: ""
        }
        if (shipment_id) {
            flag = false;
            values.custrecord_dps_shipping_rec_logistics_no = shipment_id; // 物流运单号
            values.custrecord_dps_ship_trackingnumber_dh = shipment_id; // 物流跟踪单号

            values.custrecord_dps_shipping_rec_status = 21; // 推送物流成功, 状态更改为 等待获取面单文件
        }
        if (trackingNumber) {
            values.custrecord_dps_ship_trackingnumber_dh = trackingNumber;
        }
        if (labeladdr) {
            flag = true;
            values.custrecord_fulfill_dh_label_addr = labeladdr;
            values.custrecord_dps_shipping_rec_status = 17; // 获取到了面单文件, 状态更改为 已获取标签
        }
        record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: id,
            values: values
        });

        log.debug('flag', flag);
        if (flag) {
            labelToWMS(af_rec);
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});