/*
 * @Author         : Li
 * @Date           : 2020-05-12 14:14:35
 * @LastEditTime   : 2020-05-13 20:32:37
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search'], function (record, search) {

    function beforeLoad(context) {

        var action_type = context.type;
        if (action_type == 'view') {
            var form = context.form;
            var bf_cur = context.newRecord;


            var small_status = bf_cur.getValue('custrecord_dps_shipping_rec_status');
            if (small_status == 3) {
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '重新获取物流渠道',
                    functionName: "reacquireLogistics(" + bf_cur.id + ")"
                });
            } else if (small_status == 10) {
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '重新WMS发运',
                    functionName: "WMSShipping(" + bf_cur.id + ")"
                });
            }
            // form.clientScriptModulePath = './dps.fulfillment.record.full.invoice.cs.js';
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var af_rec = context.newRecord;

        // 1 未发运， 等待获取物流单号
        // 3 匹配物流失败， 手动处理
        // 5 已获取物流单号， 等待发运
        // 6 获取物流信息失败
        // 7 已获取物流跟踪单号
        // 8 WMS已发运
        // 9 WMS已部分发运
        // 10 WMS发运失败
        // 11 未发运， 等待获取Shipment
        // 12 已获取Shipment号， 等待装箱
        // 13 申请Shipment失败
        // 14 WMS已装箱
        // 15 WMS已部分装箱

        var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');

        log.audit('rec_status', rec_status);

        // 1	自营仓调拨
        // 2	FBA调拨
        // 3	跨仓调拨

        var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

        try {
            if (rec_status == 1) {
                // 推送物流商, 获取追踪号

                // 推送 WMS, 获取装箱信息
                // TODO
            } else if (rec_status == 9 || rec_status == 8) {
                // recmachcustrecord_dps_ship_box_fa_record_link

                itemfulfillment(af_rec, tra_order_link);

            } else if (rec_status == 11) {
                // 11	未发运，等待获取Shipment

                // 直接上传Amazon, 获取 shipment
                // TODO Amazon 物流接口为完成

            }
        } catch (error) {
            log.error('出错了', error);
        }

    }

    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemfulfillment(rec, link) {

        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemfulfillment',
            // isDynamic: true,
        });

        objRecord.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });

        var numLines = rec.getLineCount({
            sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link'
        });
        var item_ful = objRecord.getLineCount({
            sublistId: 'item'
        });

        log.audit('numLines: ' + numLines, 'item_ful: ' + item_ful);

        var line_num = [];
        for (var i = 0; i < numLines; i++) {

            var ful_item = rec.getSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_item',
                line: i,
            });

            log.debug('ful_item', ful_item);
            for (var j = 0; j < item_ful; j++) {

                var obj_item = objRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: j,
                });
                log.debug('obj_item', obj_item);
                if (obj_item == ful_item) {

                    log.debug('obj_item == ful_item', obj_item == ful_item);
                    var ful_quantity = rec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                        fieldId: 'custrecord_dps_ship_box_quantity',
                        line: i,
                    });

                    log.debug('ful_quantity', ful_quantity);

                    line_num.push(i);
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: j,
                        value: ful_quantity
                    });

                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: true,
                        line: j
                    });
                }
            }
        }
        var objRecord_id = objRecord.save();
        log.debug('objRecord_id', objRecord_id);
        var itemreceipt_id;

        var tranor_type = rec.getValue('custrecord_dps_ship_record_tranor_type');
        if (objRecord_id && tranor_type == 3) {
            itemreceipt_id = itemreceipt(link);
            log.debug('itemreceipt_id', itemreceipt_id);
        }

        var load_af_rec = record.load({
            type: rec.type,
            id: rec.id
        });

        for (var z = 0; z < line_num.length; z++) {
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_itemfulfillment',
                value: objRecord_id,
                line: line_num[z]
            });
            if (itemreceipt_id) {
                load_af_rec.setSublistValue({
                    sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                    fieldId: 'custrecord_dps_ship_box_itemreceipt',
                    value: itemreceipt_id,
                    line: line_num[z]
                });
            }
            load_af_rec.setSublistValue({
                sublistId: 'recmachcustrecord_dps_ship_box_fa_record_link',
                fieldId: 'custrecord_dps_ship_box_ship_ns',
                value: true,
                line: line_num[z]
            });
        }
        var load_af_rec_id = load_af_rec.save();
        log.debug('load_af_rec_id', load_af_rec_id);

        return
    }

    /**
     * 接受库存转移单的货品
     * @param {*} rec 
     */
    function itemreceipt(link) {
        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: link,
            toType: 'itemreceipt',
            // isDynamic: true,
        });

        var obj_id = objRecord.save();

        return obj_id || false;
    }
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});