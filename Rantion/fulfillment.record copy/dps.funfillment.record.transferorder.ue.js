/*
 * @Author         : Li
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-05-20 10:35:04
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.transferorder.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log, costCal) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var af_rec = context.newRecord;

        var orderstatus = af_rec.getValue('orderstatus');
        log.debug('orderstatus', orderstatus);

        // 若订单状态为 等待发货  / 部分发货
        // if (orderstatus == "B" || orderstatus == 'E') {
        if (orderstatus == "B") {

            try {
                var rec_id = createFulRecord(af_rec);
                log.debug('rec_id', rec_id);
                if (rec_id) {
                    var otherId = record.submitFields({
                        type: af_rec.type,
                        id: af_rec.id,
                        values: {
                            'custbody_dps_fu_rec_link': rec_id
                        }
                    });
                }
            } catch (error) {
                log.error('error', error);
            }

        } else {
            log.debug('else status', orderstatus);
        }

    }

    /**
     * 创建大货发运记录
     * @param {*} rec 
     */
    function createFulRecord(rec) {
        var objRecord;

        var link = rec.getValue('custbody_dps_fu_rec_link');

        if (link) {
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

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_location',
            value: rec.getValue('location')
        });

        var tran_type = rec.getValue('custbody_dps_transferor_type');
        log.audit('tran_type', tran_type);
        // 调拨单类型
        objRecord.setValue({
            fieldId: 'custrecord_dps_ship_record_tranor_type',
            value: tran_type
        });

        var s;

        if (!tran_type) {
            if (tran_type == 1) { // 1	自营仓调拨
                s = 1;
                // 直接物流匹配
                // TODO

            } else if (tran_type == 2) { // 2	FBA调拨
                s = 11;

            } else if (tran_type == 3) { // 3	跨仓调拨
                s = 1;
            }
            log.debug('s', s);
            objRecord.setValue({
                fieldId: 'custrecord_dps_shipping_rec_status',
                value: s
            });
        }

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_department',
            value: rec.getValue('department')
        });

        log.debug('shipcarrier', rec.getValue('shipcarrier'));
        objRecord.setText({
            fieldId: 'custrecord_dps_shipping_rec_transport',
            text: rec.getValue('shipcarrier')
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
            value: rec.getValue('transferlocation')
        });

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_create_date',
            value: rec.getValue('trandate')
        });

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_account',
            value: rec.getValue('custbody_aio_account')
        });

        var weight = getItemWeight(rec);

        log.debug('weight', weight);

        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_weight',
            value: weight
        });
        var employee = rec.getValue('employee');

        var numLines = rec.getLineCount({
            sublistId: 'item'
        });

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

        log.debug('numLines', numLines);
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
            log.debug('item_sku', item_sku);

            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_sku_item',
                line: i,
                value: item_sku
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
                value: rec.getValue('custbody_aio_account')
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

        var objRecord_id = objRecord.save();

        return objRecord_id || false;

    }


    /**
     * 获取货品的所有重量
     * @param {*} rec 
     */
    function getItemWeight(rec) {

        log.debug('rec.id', rec.id);
        var weight = 0,
            limit = 3999;
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
            log.debug('getItemWeight weight', rec.getValue({
                name: 'weight',
                join: 'item'
            }));
            return --limit > 0;
        });

        return weight || 0;
    }

    /**
     * 根据 货品ID, 获取对应的 SKU
     * @param {*} itemId 
     */
    function searchItemSku(itemId) {

        var info;

        search.create({
            type: 'customrecord_dps_amazon_seller_sku',
            filters: [{
                name: 'custrecord_dps_amazon_ns_sku',
                operator: 'anyof',
                values: itemId
            }],
            columns: [
                'custrecord_dps_amazon_sku_number', {
                    name: 'weight',
                    join: 'custrecord_dps_amazon_ns_sku'
                }
            ]
        }).run().each(function (rec) {
            info = rec.getValue('custrecord_dps_amazon_sku_number');
            return false;
        });

        return info || false;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});