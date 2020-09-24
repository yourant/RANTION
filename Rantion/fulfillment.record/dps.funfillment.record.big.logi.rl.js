/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-08-21 09:33:23
 * @LastEditors    : Bong
 * @Description    :
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../../douples_amazon/Helper/core.min', 'N/log', 'N/http',
    './dps.information.values', '../Helper/config', 'N/runtime', 'N/file'
], function (record, search, core, log, http, informationValue, config, runtime, file) {

    function _post(context) {
        var userObj = runtime.getCurrentUser();
        log.debug('context', context);
        var recordID = context.recordID,
            action = context.action;
        var ret = {};
        type = 20;
        if (action == "amazonShipment") {
            if (recordID) {
                var rec_account;
                search.create({
                    type: 'customrecord_dps_shipping_record',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: recordID
                    }],
                    columns: ["custrecord_dps_shipping_rec_account"]
                }).run().each(function (rec) {
                    rec_account = rec.getValue('custrecord_dps_shipping_rec_account');
                });

                // 创建入库装运计划     createInboundShipmentPlan
                var skuFlag = false;
                if (rec_account) { // 存在店铺
                    var ship_to_country_code = "",
                        address_id = {},
                        label_prep_preference = "SELLER_LABEL",
                        items = [],
                        shipping_rec_location,
                        channel_dealer,
                        lim = 3999,
                        lim2 = 3999,
                        sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

                    search.create({
                        type: 'customrecord_dps_shipping_record',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: recordID
                        }],
                        columns: [
                            'custrecord_dps_shipping_rec_location', // 仓库
                            'custrecord_dps_shipping_rec_account', // 店铺
                            {
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
                                name: "custrecord_dps_ship_record_sku_item",
                                join: "custrecord_dps_shipping_record_parentrec"
                            }, // sleller sku
                            "custrecord_dps_shipping_r_channel_dealer", // 渠道商
                        ]
                    }).run().each(function (rec) {
                        channel_dealer = rec.getValue("custrecord_dps_shipping_r_channel_dealer");
                        shipping_rec_location = rec.getValue('custrecord_dps_shipping_rec_location');
                        rec_account = rec.getValue('custrecord_dps_shipping_rec_account');

                        // var nsItem = rec.getValue({
                        //     name: "custrecord_dps_shipping_record_item",
                        //     join: "custrecord_dps_shipping_record_parentrec"
                        // });
                        // log.debug('nsItem', nsItem);
                        ship_to_country_code = rec.getValue({
                            name: 'custrecord_cc_country_code',
                            join: 'custrecord_dps_recipient_country_dh'
                        });
                        //直接取MSKU
                        // 直接获取发运记录货品行的 SellerSKU
                        var SellerSKU = rec.getValue({
                            name: "custrecord_dps_ship_record_sku_item",
                            join: "custrecord_dps_shipping_record_parentrec"
                        });

                        if (SellerSKU) {
                            skuFlag = true;
                        } else {
                            skuFlag = false;
                        }
                        var info = {
                            "SellerSKU": SellerSKU ? SellerSKU : '', // 这里使用固定 seller SKU 替代一下
                            ASIN: '',
                            Condition: '',
                            Quantity: Number(rec.getValue({
                                name: "custrecord_dps_ship_record_item_quantity",
                                join: "custrecord_dps_shipping_record_parentrec"
                            })),
                            QuantityInCase: '',
                        }
                        items.push(info);
                        return --lim > 0;
                    });

                    log.debug('items', items);

                    var str = '';
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
                    } else {
                        str += '没有仓库';
                    }

                    log.debug('rec_account', rec_account);

                    var reItem = [],
                        upresp;

                    if (skuFlag && channel_dealer == 1) { // shipmentId 不存在, 并且渠道服务为捷仕, 才申请 shipmentId
                        try {

                            log.debug('申请shipmentID', '申请shipmentID');
                            // 创建入库计划, 获取 shipment

                            log.audit('createInboundShipmentPlan items', items);

                            ship_to_country_code = '';
                            var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
                            var rep;
                            try {
                                rep = JSON.parse(response);
                            } catch (error) {
                                rep = response;
                            }

                            log.debug('createInboundShipmentPlan response', response);
                            if (util.isArray(response)) {
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


                                // "ShipToAddress": {
                                //     "id": "",
                                //     "Name": "LGB3",
                                //     "AddressLine1": "4950 Goodman Way",
                                //     "AddressLine2": "",
                                //     "City": "Eastvale",
                                //     "DistrictOrCounty": "",
                                //     "StateOrProvinceCode": "CA",
                                //     "CountryCode": "US",
                                //     "PostalCode": "91752-5087"
                                // }

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
                                        id: recordID,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 11,
                                            custrecord_dps_shipment_info: JSON.stringify(response1)
                                        }
                                    });
                                } else {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
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
                                        id: recordID,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 18,
                                            custrecord_dps_shipment_info: '更新入库件成功'
                                        }
                                    });
                                    ret.msg = "创建shipmentId 成功";

                                } catch (error) {
                                    log.error('更新入库件处理', error);
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            custrecord_dps_shipping_rec_status: 11,
                                            custrecord_dps_shipment_info: JSON.stringify(error)
                                        }
                                    });

                                    ret.msg = error.message;
                                }
                            } else {
                                log.audit('不属于数组', rep);

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: recordID,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 11,
                                        custrecord_dps_shipment_info: JSON.stringify(rep.message)
                                    }
                                });

                                ret.msg = rep;

                            }


                        } catch (error) {
                            log.error('创建入库计划,获取shipment失败了', error);

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordID,
                                values: {
                                    custrecord_dps_shipping_rec_status: 11,
                                    custrecord_dps_shipment_info: JSON.stringify(error.message)
                                }
                            });

                            ret.msg = error.message;
                        }
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: recordID,
                            values: {
                                custrecord_dps_shipping_rec_status: 11,
                                custrecord_dps_shipment_info: '货品存在 SellerSKU 为空, 请检查'
                            }
                        });

                        ret.msg = '货品存在 SellerSKU 为空, 请检查'
                    }

                } else {
                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 11,
                            custrecord_dps_shipment_info: '\n店铺为空'
                        }
                    });

                    ret.msg = '店铺为空'
                }
            } else {
                ret.msg = '出错了'
            }
        }

        if (action == 'createInformation') {
            try {
                var order_num, recordId, statusText,
                    statusId, subText, subId,
                    ship_tran_abno, af_rec = context.newRecord,
                    information, type = context.type,
                    legalname, gross_margin

                search.create({
                    type: 'customrecord_dps_shipping_record',
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: recordID
                    }],
                    columns: [
                        'custrecord_dps_shipping_rec_status', 'custrecord_dps_shipping_rec_transa_subje', 'custrecord_dps_shipping_rec_order_num',
                        'custrecord_dps_ship_tran_abno', 'custrecord_dps_shipping_rec_information', 'custrecord_dps_shipping_rec_transa_subje',
                        {
                            name: 'custrecord_gross_margin',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        }, // 交易主体的毛利率
                        {
                            name: 'legalname',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        } // 交易主体 法定名称
                    ]
                }).run().each(function (rec) {
                    legalname = rec.getValue({
                        name: 'legalname',
                        join: 'custrecord_dps_shipping_rec_transa_subje'
                    });
                    gross_margin = rec.getValue({
                        name: 'custrecord_gross_margin',
                        join: 'custrecord_dps_shipping_rec_transa_subje'
                    });
                    recordId = rec.id;
                    statusText = rec.getText('custrecord_dps_shipping_rec_status');
                    statusId = rec.getValue('custrecord_dps_shipping_rec_status');
                    subText = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                    subId = rec.getValue('custrecord_dps_shipping_rec_transa_subje');
                    order_num = rec.getValue('custrecord_dps_shipping_rec_order_num');
                    ship_tran_abno = rec.getValue('custrecord_dps_ship_tran_abno');
                    information = rec.getValue('custrecord_dps_shipping_rec_information');
                });
                if (!information) {
                    // if ((statusId == 6 || statusText == 'WMS已发运' ||
                    //         statusId == 12 || statusText == 'WMS已装箱' ||
                    //         statusId == 10 || statusText == '已获取Shipment，等待装箱' ||
                    //         statusId == 8 || statusText == 'WMS发运失败') &&
                    //     !information) { // 状态为 WMS已发运 并且 关联的报关资料

                    // var a = Math.floor(Math.random() * Math.floor(6));
                    // gross_margin = Number((0.3 + (a / 100)).toFixed(2));
                    log.audit('毛利率', gross_margin);

                    gross_margin = gross_margin.toString();
                    gross_margin = gross_margin.replace('%', "");
                    gross_margin = gross_margin / 100;
                    log.audit('毛利率  已处理', gross_margin);
                    var info = informationValue.searchPOItem(order_num);
                    // var info = informationValue.searchItemReceiptItem(order_num);
                    if (info && info.length > 0) {
                        log.debug('存在对应的货品', info.length);
                        // 创建报关资料
                        var informaId = informationValue.createInformation(recordId, order_num);
                        log.debug('informaId', informaId);
                        if (informaId) {
                            // 创建报关发票
                            var invId = informationValue.createCusInv(info, informaId, gross_margin, order_num);
                            log.debug('invId', invId);
                            // 创建报关装箱
                            var boxId = informationValue.createBoxRec(info, informaId, order_num);
                            log.debug('boxId', boxId);
                            // 创建报关合同
                            var conId = informationValue.createContract(info, informaId, subId, '', '', order_num);
                            log.debug('conId', conId);
                            // 创建报关单
                            var decId = informationValue.createDeclaration(info, informaId, gross_margin, legalname, order_num);
                            log.debug('decId', decId);
                            // 创建报关要素
                            var eleArr = informationValue.CreateElementsOfDeclaration(info, informaId, order_num);
                            log.debug('eleArr', eleArr);
                            // 创建 开票资料
                            var usbArr = informationValue.createBillInformation(info, informaId, ship_tran_abno, order_num);
                            log.debug('usbArr', usbArr);
                            // 关联报关资料, 需要全部报关资料产生之后再关联
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    custrecord_dps_shipping_rec_information: informaId,
                                    custrecord_dps_customs_information: '创建报关资料成功',
                                    custrecord_dps_declared_value_dh: invId.total_amount,
                                    custrecord_dps_declare_currency_dh: invId.currency
                                }
                            });
                            ret.msg = '创建报关资料成功';
                        } else {
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    // custrecord_dps_shipping_rec_information: informaId,
                                    custrecord_dps_customs_information: '创建报关资料失败'
                                }
                            });
                            ret.msg = '创建报关资料失败';
                        }
                    } else {
                        log.debug('不存在对应的货品', '搜索到的货品信息为空');
                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: recordId,
                            values: {
                                // custrecord_dps_shipping_rec_information: informaId,
                                custrecord_dps_customs_information: '创建报关资料失败,映射关系中找不到关联的采购订单'
                            }
                        });
                        ret.msg = "创建报关资料失败,映射关系中找不到关联的采购订单";
                    }
                }
            } catch (error) {
                log.error('生成报关资料,出错了', error);
                ret.msg = error;
                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: recordId,
                    values: {
                        // custrecord_dps_shipping_rec_information: informaId,
                        custrecord_dps_customs_information: JSON.stringify(error)
                    }
                });
            }
        }

        if (action == "LabelDocument") {


            // NsCallbackForUpdateBoxRequestDto {
            //     aono(string): 调拨单号,
            //     boxLabelPath(string): 箱外标签文件路径,
            //     logisticsChannelCode(string): 物流渠道服务编号,
            //     logisticsChannelName(string): 物流渠道服务名称,
            //     logisticsLabelPath(string): 物流面单文件路径,
            //     logisticsProviderCode(string): 物流渠道商编号,
            //     logisticsProviderName(string): 物流渠道商名称
            // }

            var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label, tranType, waybillNo;
            search.create({
                type: "customrecord_dps_shipping_record",
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recordId
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
                    {
                        name: "tranid",
                        join: "custrecord_dps_shipping_rec_order_num"
                    }, // 调拨单号
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_fulfill_dh_label_addr', // 面单地址,
                    'custrecord_dps_shipping_rec_logistics_no', // 物流运单号
                ]
            }).run().each(function (rec) {

                waybillNo = rec.getValue('custrecord_dps_shipping_rec_logistics_no');

                tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');
                aono = rec.getValue({
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                });
                fileId = rec.getValue('custrecord_dps_shipment_label_file');

                service_code = rec.getValue("custrecord_dps_shipping_r_channelservice");
                channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
                channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
                channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                Label = rec.getValue('custrecord_fulfill_dh_label_addr'); // 面单地址
            });

            log.debug('Label: ', Label);

            // 属于FBA调拨
            if (Label && tranType == 1) {
                // 存在面单文件
                var url;
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
                    if (response.code == 200) {
                        // 调用成功
                        if (retdata.code == 0) {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    custrecord_dps_shipping_rec_status: 19,
                                    custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                                }
                            });
                        } else {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
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
                            id: recordId,
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
                        id: recordId,
                        values: {
                            custrecord_dps_shipping_rec_status: 20,
                            custrecord_dps_shipping_rec_wms_info: '无面单文件'
                        }
                    });
                }

            }
            // 属于自营仓调拨
            if (Label && tranType == 2) {
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
                    var code;
                    log.audit('retdata', retdata);
                    if (response.code == 200) {
                        // 调用成功
                        if (retdata.code == 0) {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    custrecord_dps_shipping_rec_status: 19,
                                    custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                                }
                            });
                        } else {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
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
                            id: recordId,
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

            }
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
                    if (response.code == 200) {
                        // 调用成功
                        if (retdata.code == 0) {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    custrecord_dps_shipping_rec_status: 19,
                                    custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                                }
                            });
                        } else {
                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
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
                            id: recordId,
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


        if (action == "amazonFeedStatus") {

            ret = amazonFeedStatus(recordID);

        }

        if (action == "amazonBoxInfo") {

            ret = amazonBoxInfo(recordID);

        }

        if (action == "toWMSReferenceId") {

            var data = {};
            var token = getToken();


            // NsUpdateReferenceIdRequestDto {
            //     aono(string): 调拨单号,
            //     referenceId(string): referenceId
            // }

            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recordID
                }],
                columns: [{
                        name: 'tranid',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    }, // 调拨单号
                    "custrecord_dps_to_reference_id", // REFERENCE ID
                ]
            }).run().each(function (re) {
                data["aono"] = re.getValue({
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });
                data["referenceId"] = re.getValue("custrecord_dps_to_reference_id");
            })

            if (token) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/allocationMaster/updateReferenceId",
                    headers: headerInfo,
                    body: JSON.stringify(data)
                });
                log.debug('response', JSON.stringify(response));
                var code;
                if (response.code == 200) {
                    retdata = JSON.parse(response.body);
                    log.audit('retdata', retdata);
                    code = retdata.code;
                    ret.msg = retdata.msg;
                } else {
                    code = 1;
                    ret.msg = "请求失败"
                }


                // return ret.msg = "请求失败"
                if (code == 0) {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_ful_reference_id: true
                        }
                    })
                }

            } else {
                ret.msg = "授权秘钥缺失"
            }

        }

        return ret || false;
    }


    /**
     * 获取装箱信息处理情况, 若处理成功, 则推送标签文件给 WMS
     * @param {Number} recordID
     */
    function amazonFeedStatus(recordID) {

        var ret = {};
        var accountId, amazon_info, submission_ids = [];
        search.create({
            type: "customrecord_dps_shipping_record",
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recordID
            }],
            columns: [
                "custrecord_dps_shipping_rec_account", // 账号
                {
                    name: 'custrecord_aio_feed_submission_id',
                    join: 'custrecord_dps_upload_packing_rec'
                }, // feed ID
                "custrecord_dps_shipment_info", // amazon 装运信息
            ]
        }).run().each(function (rec) {
            amazon_info = rec.getValue('custrecord_dps_shipment_info');
            submission_ids.push(rec.getValue({
                name: 'custrecord_aio_feed_submission_id',
                join: 'custrecord_dps_upload_packing_rec'
            }));
            accountId = rec.getValue('custrecord_dps_shipping_rec_account');
        })

        var a = core.amazon.getFeedSubmissionList(accountId, submission_ids);
        log.debug('装箱信息处理情况', a);

        var shipRec = record.load({
            type: 'customrecord_dps_shipping_record',
            id: recordID
        });

        var feed_processing_status = a[0].feed_processing_status;
        if (feed_processing_status == "_DONE_" && a[0].MessagesWithError == 0 && !a[0].ResultDescription) {
            shipRec.setValue({
                fieldId: "custrecord_dps_amazon_box_flag",
                value: true
            });
            // subFlag = false;
        }

        log.debug('a[0].ResultMessageCode', a[0].ResultDescription);
        if (a[0].MessagesWithError != 0) {
            var s = a[0].ResultDescription,
                str;
            if (amazon_info) {
                str = amazon_info + '\n' + s;
            }
            shipRec.setValue({
                fieldId: "custrecord_dps_shipment_info",
                value: str ? str : s
            });
        }
        shipRec.setValue({
            fieldId: "custrecord_dps_shipment_info",
            value: a[0].ResultDescription
        });

        shipRec.setText({
            fieldId: "custrecord_dps_amazon_press_status",
            text: a[0].feed_processing_status
        });


        var shipRec_id = shipRec.save();

        log.debug('更新发运记录', shipRec_id);

        //  _AWAITING_ASYNCHRONOUS_REPLY_  等待异步答复    _CANCELLED_		取消     _DONE_		完成
        // _IN_PROGRESS_	进行中       _IN_SAFETY_NET_      _SUBMITTED_  已提交      _UNCONFIRMED_   未确认

        var str = "Amazon 未处理完成";
        if (a[0].feed_processing_status == "_DONE_") {
            str = "Amazon 已处理完成";
        } else if (a[0].feed_processing_status == "_CANCELLED_") {
            str = "Amazon 已取消";
        }
        ret.msg = "装箱信息处理状态：" + str;


        if (feed_processing_status == "_DONE_" && a[0].MessagesWithError == 0 && !a[0].ResultDescription) {
            var af_rec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: recordID
            });

            var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
            var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

            var total_number = af_rec.getValue('custrecord_dps_total_number');
            log.debug('total_number', total_number);

            var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商
            var getRe;
            // if (rec_shipmentsid) {
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
                        log.audit('开始解析 PDF', channel_dealer);
                        add = getShipAddByContent({
                            "base64": getRe
                        });
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


                log.audit('add', add);
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

                // recValue.custrecord_dps_amazon_box_flag = true;

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

        } else if (feed_processing_status == "_CANCELLED_") {
            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: recordID,
                values: {
                    custrecord_dps_shipping_rec_status: 31,
                    custrecord_dps_shipment_info: a[0].ResultDescription
                }
            });
        } else {
            var st = 26;
            if (feed_processing_status == "_DONE_") {
                st = 28
            }
            ret.msg = "装箱信息处理状态：" + str;

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: recordID,
                values: {
                    custrecord_dps_shipping_rec_status: st,
                    custrecord_dps_shipment_info: a[0].ResultDescription
                }
            });
        }


        return ret;
    }


    /**
     * 重新上传装箱信息, 若已完成, 且无报错信息, 则获取标签文件并推送 WMS
     * @param {Number} recId
     */
    function amazonBoxInfo(recId) {

        var retObj = {};
        var rec_account, rec_shipmentsid;
        search.create({
            type: "customrecord_dps_shipping_record",
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [
                "custrecord_dps_shipping_rec_account", // 账号
                "custrecord_dps_shipping_rec_shipmentsid", // shipmentId
            ]
        }).run().each(function (rec) {
            rec_account = rec.getValue('custrecord_dps_shipping_rec_account');
            rec_shipmentsid = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

        })

        // 上传装箱信息
        var gerep = core.amazon.submitCartonContent(rec_account, recId, rec_shipmentsid);

        if (gerep == "_SUBMITTED_") {
            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: recId,
                values: {
                    custrecord_dps_shipping_rec_status: 24,
                    custrecord_dps_shipment_info: "装箱信息已经上传Amazon",
                    custrecord_dps_amazon_box_flag: false
                }
            });

            retObj.msg = "装箱信息已经上传Amazon"
            return retObj;
        }


        retObj = amazonFeedStatus(recId);

        return retObj;

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
            retdata = "请求失败"
        }
        message.code = code;
        message.data = retdata;
        return message;
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
        log.debug('getShipAddByContent response', JSON.stringify(response));
        retdata = JSON.parse(response.body);

        if (retdata.code == 0) {
            var jsonRep = retdata.data;
            str = getShipToAddr(jsonRep);
        }

        return str || false;

    }



    /**
     * 标签文件推送 WMS
     * @param {Object} af_rec
     */
    function labelToWMS(af_rec) {

        var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label, tranType, waybillNo, location_financia;
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
        if (Label && (tranType == 1 || tranType == 3) && channel_dealer_id == 1) { // 跨仓调拨至 FBA、FAB调拨
            // 存在面单文件
            var url;
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
        if (Label && (tranType == 2 || tranType == 3)) {
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

        } else if (channel_dealer_id == 6 || channel_dealer_id == "Amazon龙舟") {

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

    return {
        post: _post
    }
});