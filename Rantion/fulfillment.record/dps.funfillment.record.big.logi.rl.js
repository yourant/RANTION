/*
 * @Author         : Li
 * @Date           : 2020-05-21 11:00:39
 * @LastEditTime   : 2020-05-25 17:44:21
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

        var limit = 3999;

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recordID
            }],
            columns: [{
                    name: 'custrecord_dps_shipping_rec_account'
                },
                {
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: 'custrecord_dps_shipping_record_parentrec'
                },
                {
                    name: "custrecord_dps_ship_record_sku_item",
                    join: 'custrecord_dps_shipping_record_parentrec'
                }
            ]
        }).run().each(function (rec) {

            var info = {
                SellerSKU: rec.getValue({
                    name: "custrecord_dps_ship_record_sku_item",
                    join: 'custrecord_dps_shipping_record_parentrec'
                }),
                Quantity: rec.getValue({
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: 'custrecord_dps_shipping_record_parentrec'
                })
            };

            items.push(info);
            return --limit > 0;
        });


        try {
            // 创建入库计划, 获取 shipment
            var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
            var rep = JSON.parse(response);
            var shipmentid1 = rep[0].ShipmentId;
            var DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
            var id = record.submitFields({
                type: af_rec.type,
                id: af_rec.id,
                values: {
                    custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                    custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                }
            });
        } catch (error) {
            log.error('创建入库计划,获取shipment失败了', error);
        }
        var destination_fulfillment_center_id = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
        var shipment_id = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
        if (destination_fulfillment_center_id && shipment_id) {

            try {

                var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipment_id, shipment_name, destination_fulfillment_center_id, status, intended_box_contents_source, label_prep_preference, items);

            } catch (error) {
                log.error('创建入库货品出错了', error);
            }

        }

        var result;
        if (shipment_id) {
            try {
                // 上传装箱信息
                result = submitCartonContent(rec_account, af_rec.recId, af_rec.type, shipment_id);
            } catch (error) {
                log.error('上传装箱信息出错了', error);
            }
        }

        return result || false;

        return context;
        // 创建入库装运计划     createInboundShipmentPlan
        // TODO      货品信息 、 发出地点暂无

        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

        var ship_to_country_code = "",
            address_id = "",
            label_prep_preference = "",
            items = [],
            sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';
        var numLines = af_rec.getLineCount({
            sublistId: sub_id
        });

        for (var i = 0; i < numLines; i++) {
            var sku = af_rec.getSublistValue({
                sublistId: sub_id,
                fieldId: 'custrecord_dps_ship_record_sku_item',
                line: i
            });
            var quantity = af_rec.getSublistValue({
                sublistId: sub_id,
                fieldId: 'custrecord_dps_ship_record_item_quantity',
                line: i
            });

            var info = {
                SellerSKU: sku,
                Quantity: quantity
            }

            items.push(info);
        }

        try {
            // 创建入库计划, 获取 shipment
            var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
            var rep = JSON.parse(response);
            var shipmentid1 = rep[0].ShipmentId;
            var DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
            var id = record.submitFields({
                type: af_rec.type,
                id: af_rec.id,
                values: {
                    custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                    custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                }
            });
        } catch (error) {
            log.error('创建入库计划,获取shipment失败了', error);
        }
        var destination_fulfillment_center_id = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
        var shipment_id = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
        if (destination_fulfillment_center_id && shipment_id) {

            try {

                var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipment_id, shipment_name, destination_fulfillment_center_id, status, intended_box_contents_source, label_prep_preference, items);

            } catch (error) {
                log.error('创建入库货品出错了', error);
            }

        }

        var result;
        if (shipment_id) {
            try {
                // 上传装箱信息
                result = submitCartonContent(rec_account, af_rec.recId, af_rec.type, shipment_id);
            } catch (error) {
                log.error('上传装箱信息出错了', error);
            }
        }

        return result || false;
    }


    return {
        post: _post
    }
});