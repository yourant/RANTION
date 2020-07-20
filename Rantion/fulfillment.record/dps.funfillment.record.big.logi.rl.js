/*
 * @Author         : Li
 * @Date           : 2020-05-21 11:00:39
 * @LastEditTime   : 2020-07-20 14:28:39
 * @LastEditors    : Li
 * @Description    : 获取 shipmentID, 生成报关资料, 推送 标签面单文件
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../../douples_amazon/Helper/core.min', 'N/log', 'N/http',
    './dps.information.values', '../Helper/config'
], function (record, search, core, log, http, informationValue, config) {

    function _post(context) {

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
                    columns: [
                        "custrecord_dps_shipping_rec_account", // 店铺
                    ]
                }).run().each(function (rec) {
                    rec_account = rec.getValue('custrecord_dps_shipping_rec_account');
                });

                // 创建入库装运计划     createInboundShipmentPlan


                var skuFlag = false;
                if (rec_account) {

                    // }

                    var ship_to_country_code = "",
                        address_id = {},
                        label_prep_preference = "SELLER_LABEL",
                        items = [],
                        shipping_rec_location,
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
                            'custrecord_dps_shipping_rec_location', // 仓库
                            'custrecord_dps_shipping_rec_account', // 店铺
                            {
                                name: "custrecord_dps_ship_record_sku_item", // sleller sku
                                join: "custrecord_dps_shipping_record_parentrec"
                            },
                        ]
                    }).run().each(function (rec) {
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
                        var SellerSKU = rec.getValue({
                            name: "custrecord_dps_ship_record_sku_item",
                            join: "custrecord_dps_shipping_record_parentrec"
                        });
                        // search.create({
                        //     type: 'customrecord_aio_amazon_seller_sku',
                        //     filters: [{
                        //             name: 'custrecord_ass_sku',
                        //             operator: 'anyof',
                        //             values: nsItem
                        //         },
                        //         {
                        //             name: 'custrecord_ass_account',
                        //             operator: 'anyof',
                        //             values: rec_account
                        //         }
                        //     ],
                        //     columns: [
                        //         'name'
                        //     ]
                        // }).run().each(function (rec) {
                        //     SellerSKU = rec.getValue('name');
                        //     return --lim2 > 0;
                        // });


                        // log.debug('SellerSKU', SellerSKU);

                        // if (SellerSKU) {
                        //     skuFlag = true;
                        // }
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
                    // if (rec_account) {

                    // log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

                    var reItem = [],
                        upresp;


                    if (skuFlag) {
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
                                            custrecord_dps_shipping_rec_status: 10,
                                            custrecord_dps_shipment_info: '更新入库件成功'
                                        }
                                    });
                                    ret.msg = "创建shipmentId 成功";

                                } catch (error) {
                                    var id = record.submitFields({
                                        type: 'customrecord_dps_shipping_record',
                                        id: recordID,
                                        values: {
                                            // custrecord_dps_shipping_rec_status: 18,
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
                                    custrecord_dps_shipment_info: JSON.stringify(error)
                                }
                            });

                            ret.msg = error;
                        }
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: recordID,
                            values: {
                                custrecord_dps_shipping_rec_status: 11,
                                custrecord_dps_shipment_info: 'SellerSKU 为空, 请检查映射关系'
                            }
                        });

                        ret.msg = 'SellerSKU 为空, 请检查映射关系'
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
                    type: "customrecord_dps_shipping_record",
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: recordID
                    }],
                    columns: [
                        'custrecord_dps_shipping_rec_status', 'custrecord_dps_shipping_rec_transa_subje',
                        'custrecord_dps_shipping_rec_order_num', 'custrecord_dps_ship_tran_abno',
                        'custrecord_dps_shipping_rec_information',
                        'custrecord_dps_shipping_rec_order_num', 'custrecord_dps_shipping_rec_transa_subje',
                        {
                            name: 'custrecord_gross_margin',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        }, // 交易主体的毛利率
                        {
                            name: 'legalname',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        }, // 交易主体 法定名称
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

                log.debug('statusId: ' + statusId, 'statusText: ' + statusText);

                if (!information) {
                    // if ((statusId == 6 || statusText == 'WMS已发运' ||
                    //         statusId == 12 || statusText == 'WMS已装箱' ||
                    //         statusId == 10 || statusText == "已获取Shipment，等待装箱" ||
                    //         statusId == 8 || statusText == "WMS发运失败") &&
                    //     !information) { // 状态为 WMS已发运 并且 关联的报关资料

                    var a = Math.floor(Math.random() * Math.floor(6));
                    gross_margin = Number((0.3 + (a / 100)).toFixed(2));

                    var info = informationValue.searchPOItem(order_num);
                    log.debug('info', info);
                    if (info && info.length > 0) {
                        log.debug('存在对应的货品', info.length);
                        // 创建报关资料
                        var informaId = informationValue.createInformation(recordId, order_num);
                        log.debug('informaId', informaId);

                        if (informaId) {
                            // 创建报关发票
                            var invId = informationValue.createCusInv(info, informaId, gross_margin);

                            log.debug('invId', invId);

                            // 创建报关装箱
                            var boxId = informationValue.createBoxRec(info, informaId);
                            log.debug('boxId', boxId);

                            // 创建报关合同
                            var conId = informationValue.createContract(info, informaId, subId);
                            log.debug('conId', conId);

                            // 创建报关单
                            var decId = informationValue.createDeclaration(info, informaId, gross_margin, legalname);
                            log.debug('decId', decId);

                            // 创建报关要素
                            var eleArr = informationValue.CreateElementsOfDeclaration(info, informaId);
                            log.debug('eleArr', eleArr);

                            // 创建 开票资料
                            var usbArr = informationValue.createBillInformation(info, informaId, ship_tran_abno);
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
                            ret.msg = "创建报关资料成功";
                        } else {
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    // custrecord_dps_shipping_rec_information: informaId,
                                    custrecord_dps_customs_information: '创建报关资料失败'
                                }
                            });
                            ret.msg = "创建报关资料失败";
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
                    'custrecord_dps_shipping_rec_order_num', // 调拨单号
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_fulfill_dh_label_addr', // 面单地址,
                    'custrecord_dps_shipping_rec_logistics_no', // 物流运单号
                ]
            }).run().each(function (rec) {

                waybillNo = rec.getValue('custrecord_dps_shipping_rec_logistics_no');

                tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');
                aono = rec.getValue('custrecord_dps_shipping_rec_order_num');
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

            shipRec.setValue({
                fieldId: "custrecord_dps_amazon_box_flag",
                value: true
            });

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
        }

        return ret || false;
    }


    return {
        post: _post
    }
});