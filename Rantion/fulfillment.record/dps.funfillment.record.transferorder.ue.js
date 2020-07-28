/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-07-28 11:41:19
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
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml",
    'N/runtime', 'N/redirect', 'N/https', 'N/http', '../Helper/logistics_cost_calculation',
    '../Helper/config', '../Helper/tool.li'
], function (record, search, core, log, http, jetstar, openapi, yanwen, endicia, Moment, file, xml, runtime, redirect, https, http, costCal, config, tool) {

    //  大货发运记录字段 - 地点需要带出的收件人信息字段   config.WMS_Debugging_URL
    const receiptInfo_corr = {
        "custrecord_dps_contact_phone": "custrecord_aio_contact_information", //收件人联系方式
        "custrecord_dps_street1_dh": "custrecord_aio_sender_address", //收件人地址
        "custrecord_dps_recipient_city_dh": "custrecord_aio_sender_city", //城市
        "custrecord_dps_recipient_country_dh": "custrecord_aio_country_sender", //国家
        "custrecord_dps_recipien_code_dh": "custrecord_aio_sender_address_code", //邮编
        "custrecord_dps_ship_small_recipient_dh": "custrecord_aio_sender_name", //收件人名称
        "custrecord_dps_state_dh": "custrecord_aio_sender_state" //州
    }

    function beforeLoad(context) {
        var type = context.type;

        if (type == "view") {
            var bl_rec = context.newRecord;
            var link, tranType;
            search.create({
                type: bl_rec.type,
                filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: bl_rec.id
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [
                    "custbody_dps_fu_rec_link", // 关联的发运记录
                    "custbody_dps_transferor_type", // 调拨单类型
                ]
            }).run().each(function (rec) {
                link = rec.getValue('custbody_dps_fu_rec_link');
                tranType = rec.getValue('custbody_dps_transferor_type');
            })

            log.debug('关联的发运记录', link);
            log.debug('调拨单类型', tranType);
            var link_status;
            if (link) {
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
            } else {

                var orderstatus = bl_rec.getValue('orderstatus');
                if (orderstatus == 'B' && !link && (tranType == 1 || tranType == 2 || tranType == 3 || tranType == 7)) { // 库存转移订单的状态为 等待履行, 并且不存在关联的发运记录
                    // log.debug('status', status);
                    try {
                        var form = context.form;
                        form.addButton({
                            id: 'custpage_dps_li_create_rec_button',
                            label: '生成发运记录',
                            functionName: "CreateFulRec(" + bl_rec.id + ")"
                        });

                        form.clientScriptModulePath = './dps.funfillment.record.transferorder.cs.js';

                    } catch (error) {
                        log.audit('error', error);
                    }
                }
            }
        }
        if (type == "copy") { // 复制调拨单时,置空关联的发运记录, 生成发运记录信息

            var bl_rec = context.newRecord;
            bl_rec.setValue({
                fieldId: 'custbody_dps_fu_rec_link',
                value: ''
            });
            bl_rec.setValue({
                fieldId: 'custbody_dps_to_create_fulrec_info',
                value: ''
            });
        }
    }

    function beforeSubmit(context) {
        // var bsRec = context.newRecord;
        // bsRec.setValue({
        //     fieldId: 'orderstatus',
        //     value: 'B'
        // });

    }

    function afterSubmit(context) {

        var actionType = context.type;

        if (actionType != "delete") {
            var afRec = context.newRecord;
            var af_rec = record.load({
                type: afRec.type,
                id: afRec.id
            });
            var tranType = af_rec.getValue('custbody_dps_transferor_type');
            log.debug('tranType', tranType);
            var orderstatus = af_rec.getValue('orderstatus');
            var traArr = [1, 2, 3, 7];
            // 1 FBA调拨    2 自营仓调拨    3 跨仓调拨  4 移库  5 公司间交易    6 报损  7 供应商直发
            if (orderstatus == 'B' && (tranType == 1 || tranType == 2 || tranType == 3 || tranType == 7)) {
                try {

                    var link = af_rec.getValue('custbody_dps_fu_rec_link');
                    if (!link) {
                        var ck = false;
                        search.create({
                            type: "location",
                            filters: ["internalidnumber", "equalto", af_rec.getValue('custbody_actual_target_warehouse')],
                            columns: ["custrecord_dps_financia_warehous", "name"]
                        }).run().each(function (sf) {
                            if (sf.getValue("custrecord_dps_financia_warehous") == 1 || sf.getValue("name").indexOf("FBA") > -1) {
                                ck == true;
                            }
                        })
                        // var flag = judgmentItemInventory(af_rec.type, af_rec.id);
                        var flag = qtyBackOrdered(af_rec.id); // 判断是否存在延交订单
                        if (flag) { // 不存在延交订单, 允许创建发运记录
                            // 创建大货发运记录
                            var rec_id = createFulRecord(af_rec, ck);
                            if (JSON.stringify(rec_id).indexOf("error") == -1) {
                                record.submitFields({
                                    type: af_rec.type,
                                    id: af_rec.id,
                                    values: {
                                        'custbody_dps_fu_rec_link': rec_id,
                                        custbody_dps_to_create_fulrec_info: "已创建调拨单发运记录"
                                    }
                                });

                                var con = record.load({
                                    type: 'customrecord_dps_shipping_record',
                                    id: rec_id
                                });
                                sub(con);

                                log.debug('context.type', context.type);

                            } else {
                                record.submitFields({
                                    type: af_rec.type,
                                    id: af_rec.id,
                                    values: {
                                        // 'custbody_dps_fu_rec_link': rec_id,
                                        custbody_dps_to_create_fulrec_info: rec_id ? rec_id : ""
                                    }
                                });
                            }
                        } else {
                            record.submitFields({
                                type: af_rec.type,
                                id: af_rec.id,
                                values: {
                                    // 'custbody_dps_fu_rec_link': rec_id,
                                    custbody_dps_to_create_fulrec_info: "库存不足,无法创建发运记录"
                                }
                            });
                        }

                    }
                } catch (error) {
                    log.error('error', error);
                }
            } else {
                log.debug('else status', orderstatus);
            }

        }


    }

    /**
     * 创建完发运记录, 根据类型,进行 shipmentID的申请 或者 推送 WMS
     * @param {Object} context 
     */
    function sub(context) {

        var af_rec = context;

        var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');
        var shipId = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');


        log.debug("判断是否存在 shipmentId", shipId)
        if (shipId) { // 若已经输入 shipmentID, 则直接推送 WMS装箱
            wms(af_rec);

            return;
        }

        log.audit('rec_status', rec_status);

        var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type');
        log.debug('tranor_type', tranor_type);

        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
        var type = 10;

        var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

        if ((tranor_type == 2 || tranor_type == 3) && rec_status == 3) { // 调拨单类型   2 自营仓调拨 3 跨仓调拨
            wms(af_rec);
        }

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

                    if (!shipping_rec_shipmentsid) {
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
                                            custrecord_dps_shipping_rec_status: 18,
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

        if (rec_status == 5 && (tranor_type == 1 || tranor_type == 3) && shipId) { // 渠道商为龙舟, 存在shipmentId, 直接推送 WMS
            wms(af_rec);
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
            retdata = "请求失败";
        }
        message.code = code;
        message.data = retdata;
        return message;
    }


    /**
     * 推送WMS
     * @param {*} af_rec
     */
    function wms(af_rec) {
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
            }); // 仓库的财务分仓
        });

        log.audit('仓库类型 flagLocation', flagLocation);
        if (flagLocation == 3) { // 属于财务分仓属于 工厂仓

            // 27	等待录入装箱信息
            log.debug('发出仓库属于工厂仓', "直接退出, 不推送WMS")

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: af_rec.id,
                values: {
                    custrecord_dps_shipping_rec_status: 27,
                    custrecord_dps_shipping_rec_wms_info: '发出仓为工厂仓, 不推送WMS '
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

                data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment
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

                    var it = rec.getValue('custrecord_ass_sku');
                    item_info.forEach(function (item, key) {
                        if (item.itemId == it && fls_skus.indexOf(it) == -1) {
                            item.asin = rec.getValue("custrecord_ass_asin");
                            item.fnsku = rec.getValue("custrecord_ass_fnsku")
                            item.msku = rec.getValue('name');
                            newItemInfo.push(item);
                            fls_skus.push(it);
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
                message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

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
     * 搜索当前记录是否关联有发运记录
     * @param {Number} toId 
     */
    function searchFulRec(toId) {
        var fulId;
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'mainline',
                    operator: "is",
                    values: true
                },
                {
                    name: 'internalid',
                    operator: 'is',
                    values: toId
                }
            ],
            columns: [
                "custbody_dps_fu_rec_link", // 发运记录
            ]
        }).run().each(function (rec) {
            fulId = rec.id;
        });
        return fulId || false;

    }


    /**
     * 创建大货发运记录
     * @param {*} rec
     * ck , 判断是否属于FBA 仓
     */
    function createFulRecord(rec, ck) {
        try {
            var rec_account = rec.getValue('custbody_order_locaiton');
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
            objRecord.setValue({
                fieldId: 'custrecord_dps_ship_remark',
                value: rec.getValue('memo')
            });
            objRecord.setValue({
                fieldId: 'custrecord_dps_to_reference_id',
                value: rec.getValue('custbody_dps_to_reference_id')
            }); // reference ID
            objRecord.setValue({
                fieldId: 'custrecord_dps_to_shipment_name',
                value: rec.getValue('custbody_dps_to_shipment_name')
            }); // SHIPMENTNAME

            // 1	空运   2	海运   3	铁路    4   快船
            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_transport',
                value: rec.getValue('custbody_shipment_method')
            }); // 运输方式

            objRecord.setValue({
                fieldId: 'custrecord_dps_ns_upload_packing_informa',
                value: rec.getValue('custbody_dps_ns_upload_packing_informa')
            }); // 设置 NS 是否上传装箱信息, 获取箱唛

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
            // 渠道商
            var channel_dealer = rec.getValue('custbody_dps_transferor_channel_dealer');
            var channelservice = rec.getValue('custbody_dps_transferor_channelservice');
            var target_loca = rec.getValue('custbody_actual_target_warehouse')
            var city;
            var location = target_loca;

            var shipment_id = rec.getValue('custbody_shipment_id'); // shipmentId

            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_shipmentsid',
                value: shipment_id
            }); // 设置shipmentID

            var locationNO = rec.getValue('custbody_dps_ama_location_centerid');
            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_destinationf',
                value: locationNO
            }); // 设置仓库中心编码

            var numLines = rec.getLineCount({
                sublistId: 'item'
            });
            var allWeight = 0;
            for (var i = 0; i < numLines; i++) {
                var item = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                var quantity = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                })
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'internalId',
                        operator: 'anyof',
                        values: item
                    }, ],
                    columns: [{
                        name: 'custitem_dps_heavy2'
                    }]
                }).run().each(function (skurec) {
                    var weight = skurec.getValue("custitem_dps_heavy2")
                    if (quantity) allWeight += Number(weight) * Number(quantity)
                    return true;
                });
            }

            if (tran_type) {
                if (tran_type == 2 && channelservice) { // 2	自营仓调拨
                    var limit = 3999;
                    var rec_country, serverID = channelservice,
                        cost = 0;
                    var zip;
                    log.audit("serverID rec_country city location allWeight", serverID + '-' + rec_country + '-' + city + '-' + location + '-' + allWeight);

                    search.create({
                        type: 'location',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: target_loca
                        }],
                        columns: [{
                                name: "custrecord_aio_sender_city"
                            },
                            {
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_aio_country_sender'
                            }, 'custrecord_aio_sender_address_code'
                        ]
                    }).run().each(function (e) {
                        // city = e.getValue('custrecord_aio_sender_city');
                        city = e.getValue('custrecord_aio_sender_city');
                        zip = e.getValue('custrecord_aio_sender_address_code');
                        rec_country = e.getValue({
                            name: 'custrecord_cc_country_code',
                            join: 'custrecord_aio_country_sender'
                        });
                        return true;
                    })

                    log.audit("serverID rec_country city location", serverID + '-' + rec_country + '-' + city + '-' + location);
                    cost = costCal.calculation(serverID, rec_country, zip, allWeight, '', '', '', city, '', location, '', '');
                    log.audit("cost", cost);
                    objRecord.setValue({
                        fieldId: 'custrecord_dps_shipping_rec_estimatedfre',
                        value: cost
                    });
                    s = 3;
                } else if (tran_type == 1) { // 1	FBA调拨
                    s = 9;
                } else if (tran_type == 3) { // 3	跨仓调拨
                    s = 3;

                    var lofba;

                    try {
                        search.create({
                            type: rec.type,
                            filters: [{
                                    name: 'internalid',
                                    operator: 'anyof',
                                    values: [rec.id]
                                },
                                {
                                    name: 'mainline',
                                    operator: 'is',
                                    values: true
                                }
                            ],
                            columns: [{
                                name: 'custrecord_dps_financia_warehous',
                                join: "custbody_actual_target_warehouse"
                            }]
                        }).run().each(function (rec) {
                            lofba = rec.getValue({
                                name: 'custrecord_dps_financia_warehous',
                                join: "custbody_actual_target_warehouse"
                            })
                        });
                    } catch (error) {
                        log.debug('获取目标仓的财务分仓出错了', error)
                    }

                    if (lofba == 1) {
                        s = 9;
                    }
                }

                // 渠道商
                var channel_dealer = rec.getValue('custbody_dps_transferor_channel_dealer');
                // 6 Amazon龙舟     1	捷仕
                if (channel_dealer == 6) {
                    s = 5;
                    // objRecord.setValue({
                    //     fieldId: 'custrecord_dps_shipping_rec_logisticsfla',
                    //     value: false
                    // });
                }
                var location = rec.getValue('custbody_dps_start_location');
                if (location) {
                    search.create({
                        type: 'location',
                        filters: [{
                            name: 'internalid',
                            operator: 'is',
                            values: location
                        }],
                        columns: ['custrecord_dps_financia_warehous']
                    }).run().each(function (rec) {
                        var tttppp = rec.getValue('custrecord_dps_financia_warehous');
                        if (tttppp == 3) {
                            s = 27;
                        }
                        return false;
                    });
                }

                if (rec.getValue('custbody_shipment_id')) { // 若存在shipmentId, 则设置
                    s = 5;
                }

                log.debug('s', s);
                if (!link_status) {
                    objRecord.setValue({
                        fieldId: 'custrecord_dps_shipping_rec_status',
                        value: s
                    });
                }
            }

            if (tran_type == 2 || tran_type == 3) {
                // 2020.6.10 16:50

                search.create({
                    type: "location",
                    filters: [{
                        name: "internalidnumber",
                        operator: "equalto",
                        values: target_loca
                    }],
                    columns: [{
                            name: "custrecord_aio_contact_information"
                        },
                        {
                            name: "custrecord_aio_sender_address"
                        },
                        {
                            name: "custrecord_aio_sender_city"
                        },
                        {
                            name: "custrecord_aio_country_sender"
                        },
                        {
                            name: "custrecord_aio_sender_address_code"
                        },
                        {
                            name: "custrecord_aio_sender_name"
                        },
                        {
                            name: "custrecord_aio_sender_state"
                        }
                    ]
                }).run().each(function (e) {
                    for (key in receiptInfo_corr) {
                        objRecord.setValue({
                            fieldId: key,
                            value: e.getValue(receiptInfo_corr[key])
                        });
                    }
                })
                // ===============================================
            }

            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_department',
                value: rec.getValue('department')
            });


            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_r_channel_dealer',
                text: channel_dealer
            });

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
                value: target_loca
            });
            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_create_date',
                value: rec.getValue('trandate')
            });
            var account = rec.getValue('custbody_order_locaiton');
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


            var itemToArr = [],
                ToLimit = 3999,
                itemObj = {},
                itemToObj = {};
            // search.create({
            //     type: rec.type,
            //     filters: [{
            //             name: 'internalid',
            //             operator: 'anyof',
            //             values: rec.id
            //         },
            //         {
            //             name: 'mainline',
            //             operator: 'is',
            //             values: false
            //         },
            //         {
            //             name: 'taxline',
            //             operator: 'is',
            //             values: false
            //         }
            //     ],
            //     columns: [
            //         "item",
            //     ]
            // }).run().each(function (rec) {
            //     itemToArr.push(rec.getValue('item'));
            //     itemObj[rec.getValue('item')] = rec.getValue('item');
            //     return --ToLimit > 0;
            // });
            // var skuLimit = 3999;
            // if (rec_account) {
            //     search.create({
            //         type: 'customrecord_aio_amazon_seller_sku',
            //         filters: [{
            //                 name: 'custrecord_ass_sku',
            //                 operator: 'anyof',
            //                 values: itemToArr
            //             },
            //             {
            //                 name: 'custrecord_ass_account',
            //                 operator: 'anyof',
            //                 values: rec_account
            //             }
            //         ],
            //         columns: [
            //             'name', "custrecord_ass_sku"
            //         ]
            //     }).run().each(function (rec) {
            //         var nsItem = rec.getValue('custrecord_ass_sku');
            //         itemToObj[nsItem] = rec.getValue('name'); //seller sku
            //         return --skuLimit > 0;
            //     });
            // }


            // 设置发运记录的货品行
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
                //2020/7/18  lc
                var msku = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_aio_amazon_msku',
                    line: i
                });
                if (!msku && ck) {
                    //需要选择MSKU ，在生成发运记录
                    return "error: 货品缺少MSKU";
                }
                objRecord.setSublistValue({
                    sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                    fieldId: 'custrecord_dps_ship_record_sku_item', //seller sku msku
                    line: i,
                    value: msku
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
                    value: rec.getValue('custbody_order_locaiton')
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

            var custrecord_dps_declare_currency_dh;
            var custrecord_dps_declared_value_dh = 0;
            search.create({
                type: 'customrecord_transfer_order_details',
                filters: [{
                    name: 'custrecord_transfer_code',
                    operator: 'anyof',
                    values: rec.id
                }],
                columns: [{
                        name: 'custrecord__realted_transfer_head'
                    },
                    {
                        name: 'custrecord_transfer_quantity'
                    }
                ]
            }).run().each(function (rec1) {
                var custrecord__realted_transfer_head = rec1.getValue('custrecord__realted_transfer_head');
                var custrecord_transfer_quantity = rec1.getValue('custrecord_transfer_quantity');
                log.debug('custrecord__realted_transfer_head', custrecord__realted_transfer_head);
                log.debug('custrecord_transfer_quantity', custrecord_transfer_quantity);

                search.create({
                    type: 'purchaseorder',
                    filters: [{
                            name: "mainline",
                            operator: "is",
                            values: ["F"]
                        },
                        {
                            name: "taxline",
                            operator: "is",
                            values: ["F"]
                        },
                        {
                            name: "item",
                            operator: "noneof",
                            values: ["@NONE@"]
                        },
                        {
                            name: "type",
                            operator: "anyof",
                            values: ["PurchOrd"]
                        },
                        {
                            name: "custbody_dps_type",
                            operator: "anyof",
                            values: ["2"]
                        },
                        // { name: "subsidiary", operator: "is", values: [subsidiary] },
                        // { name: "item", operator: "anyof", values: itemArray },
                        {
                            name: 'custcol_realted_transfer_detail',
                            operator: "anyof",
                            values: custrecord__realted_transfer_head
                        }
                    ],
                    columns: [{
                            name: "quantity",
                            label: "采购数量",
                            type: "float"
                        },
                        {
                            name: "custcol_realted_transfer_detail",
                            label: "关联调拨单号",
                            type: "select"
                        },
                        {
                            name: "rate"
                        },
                        {
                            name: 'currency'
                        }
                    ]
                }).run().each(function (result) {
                    log.debug("testest1 ", JSON.stringify(result));
                    custrecord_dps_declare_currency_dh = result.getValue('currency');
                    var value = {
                        quantity: result.getValue('quantity'),
                        link: result.getValue('custcol_realted_transfer_detail')
                    }
                    custrecord_dps_declared_value_dh = custrecord_dps_declared_value_dh + result.getValue('rate') * custrecord_transfer_quantity;
                    log.debug("testest ", JSON.stringify(value));
                    return true;
                });
                return true;
            });
            objRecord.setValue({
                fieldId: 'custrecord_dps_declare_currency_dh',
                value: custrecord_dps_declare_currency_dh
            });
            objRecord.setValue({
                fieldId: 'custrecord_dps_declared_value_dh',
                value: custrecord_dps_declared_value_dh
            });

            var objRecord_id;
            objRecord_id = objRecord.save();

            var la_rec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: objRecord_id
            });
            var la_rec_id = la_rec.save();
            log.debug('la_rec_id', la_rec_id);
            log.debug('objRecord_id', objRecord_id);
            return objRecord_id || false;
        } catch (error) {
            log.debug("error:", error);
            return "error:" + JSON.stringify(error.message);
        }
    }


    /**
     * 获取当前订单的延交订单的货品数量, 若存在延交订单数量大于 0, 返回 false; 否则返回 true;
     * @param {Number} toId 
     * @returns {Boolean} true || false
     */
    function qtyBackOrdered(toId) {
        var flag = true;
        var backOrder = 0;

        var toObj = record.load({
            type: 'transferorder',
            id: toId
        });
        var numLines = toObj.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0; i < numLines; i++) {

            var backQty = toObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantitybackordered',
                line: i
            });
            backOrder += Number(backQty);
            // backOrder += Math.abs(Number(backQty));
        }
        log.debug('backOrder', backOrder);

        if (backOrder != 0) {
            flag = false;
        }

        return flag;
    }


    // 获取订单对应的库存
    /**
     * 搜索单据的货品、地点、子公司
     * @param {String} recType 
     * @param {number} recId 
     * @returns {Object} {subsidiary: subs,itemArr: itemArr,location: loca,totalQty: totalQty};
     */
    function searchToLocationItem(recType, recId) {

        log.debug('recId: ' + recId, "recType: " + recType);
        var limit = 3999,
            itemArr = [],
            totalQty = 0,
            loca, subs;
        search.create({
            type: recType,
            filters: [{
                    name: "internalid",
                    operator: 'anyof',
                    values: [recId]
                },
                {
                    name: "mainline",
                    operator: 'is',
                    values: false
                },
                {
                    name: "taxline",
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "item",
                "quantity"
            ]
        }).run().each(function (rec) {
            var it = rec.getValue('item')
            if (itemArr.indexOf(it) == -1) {
                itemArr.push(rec.getValue('item'));
                totalQty += Math.abs(Number(rec.getValue('quantity')))
            }
            return --limit > 0;
        });


        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recId
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: [
                "location", "subsidiary"
            ]
        }).run().each(function (r) {
            subs = r.getValue('subsidiary');
            loca = r.getValue('location');
        })

        var it = {
            subsidiary: subs,
            itemArr: itemArr,
            location: loca,
            totalQty: totalQty
        };

        return it || false;

    }


    /**
     * 搜索货品对应的所有地点,限制于子公司
     * @param {String} sub 子公司
     * @param {number} loca 一级地点
     * @param {Array} locaArr 货品地点数组
     * @returns {Array} loArr 货品对应的地点数组
     */
    function searchSecLoca(sub, loca, locaArr) {
        var loArr = [],
            limit = 3999

        log.debug('sub: ' + sub + " loca: " + loca, "locaArr  typeof  " + typeof (locaArr) + "    " + locaArr)
        search.create({
            type: "location",
            filters: [{
                    name: 'custrecord_dps_parent_location',
                    operator: 'anyof',
                    values: [loca]
                }, // 父级地点
                {
                    name: "subsidiary",
                    operator: 'anyof',
                    values: [sub]
                }, // 子公司
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: locaArr
                }, // 地点
            ]
        }).run().each(function (rec) {

            // log.debug('locaArr.indexOf(rec.id) ', locaArr.indexOf(rec.id))
            if (locaArr.indexOf(rec.id) > -1) {
                log.debug('地点的内部ID', rec.id)
                loArr.push(rec.id);
            }
            return --limit > 0;
        });
        return loArr || false;
    }


    /**
     * 搜索对应的地点 并返回
     * @param {Array} secArr  地点数组
     * @param {Array} loca 一级地点
     * @returns {Array} thrArr 地点数组
     */
    function searchThrLoca(secArr, loca) {
        var limit = 3999,
            thrArr = secArr;

        log.debug('thrArr', thrArr);
        log.debug('secArr', secArr);
        search.create({
            type: 'location',
            filters: [{
                name: 'custrecord_dps_parent_location',
                operator: 'anyof',
                values: secArr
            }]
        }).run().each(function (rec) {
            thrArr.push(rec.id);
            return --limit > 0;
        });

        thrArr.push(loca);
        return thrArr || false;

    }

    /**
     * 搜索对应货品、地点的库存量与延交订单量
     * @param {Array} itemArr 货品数组
     * @param {Array} LocaArr 地点数组
     * @returns {Object} { totalQty (库存总量): totalQty, backOrderQty(延交订单总量): backOrderQty }
     */
    function searchItemQty(itemArr, LocaArr) {


        log.debug('itemArr length: ' + itemArr.length, "LocaArr length: " + LocaArr.length)
        var limit = 3999,
            locationquantityonhand,
            backOrderQty = 0,
            totalQty = 0,
            loca;
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
                    values: LocaArr
                }
            ],
            columns: [
                "locationquantityonhand", // 库存量 Location On Hand
                "inventorylocation", // 库存地点    Inventory Location
                "locationquantitybackordered", // 延交订单 LOCATION BACK ORDERED
            ]
        }).run().each(function (rec) {

            log.debug('locationquantityonhand: ' + rec.getValue('locationquantityonhand'), "loca: " + rec.getValue('inventorylocation'))
            totalQty += Number(rec.getValue('locationquantityonhand'));
            backOrderQty += Number(rec.getValue('locationquantitybackordered'));
            return --limit > 0;
        });

        var it = {
            totalQty: totalQty,
            backOrderQty: backOrderQty
        }

        return it || false;
    }



    /**
     * 搜索货品对应的地点
     * @param {Array} itemArr 货品数组
     * @param {Number} sub 子公司ID
     * @returns {Array} locaArr 地点数组
     */
    function searchItemLocation(itemArr, sub) {

        var limit = 3999,
            locaArr = [];
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: itemArr
                },
                {
                    name: 'subsidiary',
                    join: 'inventorylocation',
                    operator: 'anyof',
                    values: sub
                }
            ],
            columns: [
                "inventorylocation"
            ]
        }).run().each(function (rec) {
            locaArr.push(rec.getValue('inventorylocation'));
            return --limit > 0;
        });

        return locaArr || false;

    }



    /**
     * 判断库存是否充足
     * @param {String} recType 
     * @param {Number} recId 
     * @returns{Boolean} flag
     */
    function judgmentItemInventory(recType, recId) {

        var flag = false;

        // 获取单据对应的货品,子公司,地点,总数量
        var a = searchToLocationItem(recType, recId);
        log.debug('一级地点 a', a);

        //  获取货品对应的地点
        var al = searchItemLocation(a.itemArr, a.subsidiary);
        log.debug("al", al);

        // 搜索货品地点的库存
        var bl = searchSecLoca(a.subsidiary, a.location, al)
        log.debug('bl length' + bl.length, bl);
        var cl, fl

        if (bl && bl.length > 0) { // 存在库位, 则进行箱的搜索
            // 搜索库存对应的箱
            cl = searchThrLoca(bl, a.location)
            log.debug('cl length: ' + cl.length, cl);
        } else { // 不存在库存, 直接获取一级地点
            cl = [a.location]
        }
        // 搜索货品对应的库存数量和延交订单数量
        var dl = searchItemQty(a.itemArr, cl);
        var fl = dl.totalQty - dl.backOrderQty - a.totalQty;
        log.debug('fl', fl);
        if (fl >= 0) {
            log.debug('库存充足', "可以发货");
            flag = true;
        } else {
            log.debug('库存不足', "无法发货");
            flag = false;
        }
        log.debug('dl', dl);

        return flag;
    }



    /**
     * 计算预估运费
     * @param {*} Rec 
     */
    function getCost(Rec) {

        var limit = 3999;
        var rec_country, serverID = channelservice,
            cost = 0,
            allWeight,
            city,
            to_location,
            zip;

        log.audit("serverID rec_country city to_location allWeight", serverID + '-' + rec_country + '-' + city + '-' + to_location + '-' + allWeight);


        search.create({
            type: Rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: [Rec.id]
            }],
            columns: [
                "custrecord_dps_recipient_country_dh", // country
                "custrecord_dps_recipient_city_dh", // City
                "custrecord_dps_recipien_code_dh", // zip
                "custrecord_dps_shipping_rec_country_regi", // Country Code
                "custrecord_dps_shipping_rec_to_location", // 目标仓库
            ]
        }).run().each(function (rec) {
            rec_country = rec.getValue("custrecord_dps_shipping_rec_country_regi");
            city = rec.getValue('custrecord_dps_recipient_city_dh');
            zip = rec.getValue('custrecord_dps_recipien_code_dh');
            to_location = rec.getValue('custrecord_dps_shipping_rec_to_location');
        });



        var numLines = Rec.getLineCount({
            sublistId: 'recmachcustrecord_dps_shipping_record_parentrec'
        });
        var allWeight = 0;
        for (var i = 0; i < numLines; i++) {
            var item = rec.getSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_shipping_record_item',
                line: i
            });
            var quantity = rec.getSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'quantity',
                line: i
            })
            search.create({
                type: 'item',
                filters: [{
                    name: 'internalId',
                    operator: 'anyof',
                    values: item
                }, ],
                columns: [{
                    name: 'custitem_dps_heavy2'
                }]
            }).run().each(function (skurec) {
                var weight = skurec.getValue("custitem_dps_heavy2")
                if (quantity) allWeight += Number(weight) * Number(quantity)
                return true;
            });
        }


        log.audit("serverID rec_country city to_location", serverID + '-' + rec_country + '-' + city + '-' + to_location);
        cost = costCal.calculation(serverID, rec_country, zip, allWeight, '', '', '', city, '', to_location, '', '');
        log.audit("cost", cost);

        // 设置预估运费
        var id = record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: Rec.id,
            values: {
                custrecord_dps_shipping_rec_estimatedfre: cost,
            }
        });
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


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});