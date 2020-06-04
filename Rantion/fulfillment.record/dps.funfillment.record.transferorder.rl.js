/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-03 20:27:59
 * @LastEditTime   : 2020-06-04 13:40:23
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.transferorder.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../../douples_amazon/Helper/core.min', 'N/record', 'N/search', 'N/log'], function (core, record, search, log) {

    function _get(context) {

    }

    function _post(context) {

        log.debug('context', context);
        var action = context.action;
        log.debug('action', action);
        var reJson = {};

        try {
            switch (action) {
                case "getPalletLabels":
                    reJson.msg = getPalletLabels(context.recordID);
                    break;
                case "fulfillment":
                    reJson.msg = fulfillment(context.recordID);
                    break;
                default:

            }
        } catch (error) {
            log.error('error', error);
            reJson.msg = 'error: ' + JSON.stringify(error);
        }

        return reJson || false;

    }

    function _put(context) {

    }

    function _delete(context) {

    }



    function getPalletLabels(id) {

        var recType = "customrecord_dps_shipping_record";
        var fileObj_id;

        return recType;

        var shipmentId, total_number, getRe, recId, rec_account;
        search.create({
            type: recType,
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'anyof',
                values: id
            }],
            columns: [
                'custrecord_dps_shipping_rec_shipmentsid', 'custrecord_dps_total_number', 'custrecord_dps_shipping_rec_account'
            ]
        }).run().each(function (rec) {
            shipmentId = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
            total_number = rec.getValue('custrecord_dps_total_number');
            recId = rec.id;
            rec_account = rec.getValue('custrecord_dps_shipping_rec_account');
        });

        log.debug('获取箱外标签', 'start');


        shipmentId = shipmentId ? shipmentId : "FBA15MXP4H6D"
        total_number = total_number ? total_number : 2;

        getRe = core.amazon.getPalletLabels(rec_account, total_number, shipmentId);

        log.debug('getRe', getRe);

        log.debug('获取箱外标签', 'end');
        if (getRe) {
            var fileObj = file.create({
                name: rec_shipmentsid + '.ZIP',
                fileType: file.Type.ZIP,
                contents: getRe,
                folder: -15,
                isOnline: true
            });

            fileObj_id = fileObj.save();

            log.debug('fileObj_id', fileObj_id);

            var rec_id = record.submitFields({
                type: recType,
                id: recId,
                values: {
                    custrecord_dps_shipping_rec_status: 17,
                }
            });

            log.debug('submitFields', rec_id);

            var attach_id = record.attach({
                record: {
                    type: 'file',
                    id: fileId
                },
                to: {
                    type: recType,
                    id: recId
                }
            });
            log.debug('record.attach', attach_id);
        }
        return fileObj_id || false;
    }


    function fulfillment(id) {

        var reId = itemfulfillment(id);

        return reId || false;
    }


    /**
     * 履行库存转移单
     * @param {*} rec 
     */
    function itemfulfillment(link) {

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

        var objRecord_id = objRecord.save();
        log.debug('objRecord_id', objRecord_id);

        var itemreceipt_id = itemreceipt(link);
        var reJson = {
            fulId: objRecord_id,
            itemRec: itemreceipt_id
        }

        return reJson || false;
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
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});