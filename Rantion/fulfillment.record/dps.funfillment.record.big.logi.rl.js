/*
 * @Author         : Li
 * @Date           : 2020-05-21 11:00:39
 * @LastEditTime   : 2020-06-04 16:42:44
 * @LastEditors    : Li
 * @Description    : 获取 shipmentID
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../../douples_amazon/Helper/core.min', 'N/log', 'N/http'], function (record, search, core, log, http) {

    function _post(context) {

        log.debug('context', context);
        var recordID = context.recordID;

        if (rec_status == 9 && tranor_type == 1) {
            type = 20;

            // 创建入库装运计划     createInboundShipmentPlan

            var af_rec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: recordID
            })

            var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

            var ship_to_country_code = "",
                address_id = {},
                label_prep_preference = "SELLER_LABEL",
                items = [];

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
                    }
                ]
            }).run().each(function (rec) {

                ship_to_country_code = rec.getValue({
                    name: 'custrecord_cc_country_code',
                    join: 'custrecord_dps_recipient_country_dh'
                });
                var SellerSKU;
                search.create({
                    type: 'customrecord_dps_amazon_seller_sku',
                    filters: [{
                            name: 'custrecord_dps_amazon_ns_sku',
                            operator: 'anyof',
                            values: rec.getValue({
                                name: "custrecord_dps_shipping_record_item",
                                join: "custrecord_dps_shipping_record_parentrec"
                            })
                        },
                        {
                            name: 'custrecord_dps_store',
                            operator: 'anyof',
                            values: rec_account
                        }
                    ],
                    columns: [
                        'custrecord_dps_amazon_sku_number'
                    ]
                }).run().each(function (rec) {
                    SellerSKU = rec.getText('custrecord_dps_amazon_sku_number');
                });

                var info = {
                    SellerSKU: SellerSKU ? SellerSKU : 'EC1197-FH-FBA', // 这里使用固定 seller SKU 替代一下
                    ASIN: '',
                    Condition: '',
                    Quantity: Number(rec.getValue({
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    })),
                    QuantityInCase: '',
                }
                items.push(info);

            });


            log.debug('items', items);


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


            var shipping_rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

            var DestinationFulfillmentCenterId = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
            log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

            var reItem = [];
            if (!shipping_rec_shipmentsid) {
                try {

                    log.debug('申请shipmentID', '申请shipmentID');
                    // 创建入库计划, 获取 shipment

                    log.error('createInboundShipmentPlan items', items);

                    var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
                    var rep;
                    try {
                        rep = JSON.parse(response);
                    } catch (error) {
                        rep = response;
                    }

                    log.debug('response', response);
                    log.debug('rep', rep);
                    var shipmentid1 = rep[0].ShipmentId;
                    shipping_rec_shipmentsid = shipmentid1;
                    DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
                    reItem = rep[0].Items;
                    // log.audit('shipmentid1', shipmentid1);
                    // log.audit('DestinationFulfillmentCenterId', DestinationFulfillmentCenterId);
                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 15,
                            custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                            custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                            custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                        }
                    });

                    var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 16,
                        }
                    });


                    log.debug('response1', response1);

                    var upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                    log.debug('upresp', upresp);

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 10,
                        }
                    });

                } catch (error) {
                    log.error('创建入库计划,获取shipment失败了', error);

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: recordID,
                        values: {
                            custrecord_dps_shipping_rec_status: 11,
                            // custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                        }
                    });

                }
            }

        }
    }


    return {
        post: _post
    }
});