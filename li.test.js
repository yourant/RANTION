function sub(context) {

    var af_rec = context;

    var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');
    var shipId = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

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

        if (rec_account) { // 若存在店铺
            var lim2 = 3999,
                limit = 3999;
            var ship_to_country_code = "",
                address_id = {},
                label_prep_preference = "SELLER_LABEL",
                items = [],
                sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

            var fulItemArr = [],
                itemObj = {},
                FItemA = [],
                fLim = 3999
            // 先获取发运记录对应的所有货品信息
            search.create({
                type: af_rec.type,
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
                    }
                ]
            }).run().each(function (rec) {

                itemObj[rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                })] = Number(rec.getValue({
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: "custrecord_dps_shipping_record_parentrec"
                }))
                var it = {
                    neItem: rec.getValue({
                        name: "custrecord_dps_shipping_record_item",
                        join: "custrecord_dps_shipping_record_parentrec"
                    }),
                    Qty: Number(rec.getValue({
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    }))
                }

                FItemA.push(rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                }));

                fulItemArr.push(it);

                var nsItem = rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                });

                var info = {
                    nsItem: nsItem,
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

                return --limit > 0;
            });


            var amItem = [];
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: [{
                        name: 'custrecord_ass_sku',
                        operator: 'anyof',
                        values: FItemA
                    },
                    {
                        name: 'custrecord_ass_account',
                        operator: 'anyof',
                        values: rec_account
                    }
                ],
                columns: [
                    'name', "custrecord_ass_sku"
                ]
            }).run().each(function (rec) {
                var nsItem = rec.getValue('custrecord_ass_sku');

                if (itemObj[nsItem]) {

                    var it = {
                        nsItem: nsItem,
                        SellerSKU: rec.getValue('name'),
                        ASIN: '',
                        Condition: '',
                        Quantity: Number(itemObj[nsItem]),
                        QuantityInCase: '',
                    }
                    amItem.push(it);
                }
                return --lim2 > 0;
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
                        // 计算预估运费

                    } catch (error) {

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



{
    requestId: '13131',
    requestBody:{
        "deliveryTime": "2020-07-14 20:07:44",
        "abno": "AB200601000002",
        "aono": "585591",
        "containerNo": "123",
        "boxQty": 1,
        "volume": 1000.00,
        "weight": 321.00,
        "storageList": [{
                "sku": "101030",
                "type": 2,
                "barcode": "101030",
                "positionCode": "HD2A2306",
                "qty": 50
            },
            {
                "sku": "101030",
                "type": 1,
                "barcode": "DPSLI02",
                "positionCode": "HD2A2306",
                "qty": 50
            }
        ],
        "delivery": true
    }
}
