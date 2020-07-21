/*
 * @Author         : Li
 * @Date           : 2020-05-11 14:59:25
 * @LastEditTime   : 2020-07-04 15:19:25
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.btn.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/http', 'N/https', 'N/log', 'N/record', 'N/search',
    'SuiteScripts/dps/logistics/jetstar/dps_logistics_request.js',
    'SuiteScripts/dps/logistics/openapi/dps_openapi_request.js',
    'SuiteScripts/dps/logistics/yanwen/dps_yanwen_request.js',
    'SuiteScripts/dps/logistics/endicia/dps_endicia_request.js',
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml"
], function (http, https, log, record, search, jetstar, openapi, yanwen, endicia, Moment, file, xml) {

    function _post(context) {
        log.debug('context', context);
        var info = context;
        var action = context.action;
        var recordID = context.recordID;
        log.debug('action: ' + action, 'recordID: ' + recordID);
        switch (action) {
            case 'WMS':
                log.debug('WMS: ', action);

                return action;
            case 'Logistics':
                log.debug('Logistics', action);
                return reacquireLogistics(recordID);

            case 'TrackingNumber':
                log.debug('TrackingNumber', action);
                return trakingNumber(recordID);

            case 'GetLabel':
                log.debug('GetLabel', action);
                return GetLabel(recordID);

            case 'finishPackage':
                log.debug('finishPackage', action);
                return finishPackage(recordID);

            case 'confirmOut':
                log.debug('confirmOut', action);
                return confirmOut(recordID);

            default:
                return false;
        }

        return info || false;
    }

    /**
     * 完成出库履行
     * @param {*} rec_id 
     */
    function confirmOut(rec_id) {
        var result
        try {
            var to_id;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [
                    { name: 'internalid', operator: 'is', values: rec_id }
                ],
                columns: [ 'custrecord_dps_shipping_rec_order_num' ]
            }).run().each(function (rec) {
                to_id = rec.getValue('custrecord_dps_shipping_rec_order_num');
                return false;
            });
            if (to_id) {
                var objRecord = record.transform({
                    fromType: 'transferorder',
                    fromId: to_id,
                    toType: 'itemfulfillment'
                });
                objRecord.setValue({ fieldId: 'shipstatus', value: 'C' });
                var objRecord_id = objRecord.save();
                if (objRecord_id) {
                    var itemReceipt = record.transform({
                        fromType: 'transferorder',
                        toType: record.Type.ITEM_RECEIPT,
                        fromId: to_id,
                    });
                    var irId = itemReceipt.save();
                    if (irId) {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: rec_id,
                            values: {
                                custrecord_dps_shipping_rec_status: 6
                            }
                        });
                        result = { code: 200 }
                    } else {
                        result = { code: 500 }
                    }
                } else {
                    result = { code: 500 }
                }
            } else {
                result = { code: 500 }
            }
        } catch (error) {
            result = { code: 500 }
        }
        if (!result) result = {
            code: 500,
            msg: "未知错误"
        }
        return result;
    }

    /**
     * 完成录入装箱信息
     * @param {*} rec_id 
     */
    function finishPackage(rec_id) {
        var result
        try {
            record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: rec_id,
                values: {
                    custrecord_dps_shipping_rec_status: 12
                }
            });
            result = {
                code: 200
            }
        } catch (error) {
            result = {
                code: 500
            }
        }
        if (!result) result = {
            code: 500,
            msg: "未知错误"
        }
        return result;
    }

    /**
     * 重新匹配物流供应商
     * @param {*} rec_id 
     */
    function reacquireLogistics(rec_id) {
        var rec = record.load({
            type: "customrecord_dps_shipping_record",
            id: rec_id
        });
        var channel = rec.getValue("custrecord_dps_shipping_r_channel_dealer")
        var result
        log.audit('channel', channel);
        try {
            switch (channel) {
                case "1":
                    jetstarApi.init(http, search)
                    var result = jetstarApi.Create(rec, "big")
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
                        submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber, single_pdf);
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

        } catch (error) {
            log.error('error', error);
            result = {
                code: 500
            }
        }
        if (!result) result = {
            code: 500,
            msg: "未知错误"
        }
        return result
    }

    function trakingNumber(rec_id) {
        var rec = record.load({
            type: "customrecord_dps_shipping_record",
            id: rec_id
        });
        var channel = rec.getValue("custrecord_dps_shipping_r_channel_dealer")
        var result
        var shipment_id = rec.getValue("custrecord_dps_ship_platform_order_dh")
        switch (channel) {
            case "1":
                jetstarApi.init(http, search)
                result = jetstarApi.GetLabels(shipment_id, '')
                if (result.code == 200) {
                    var trackingNumber = result.data.shipment.tracking_number
                    updateTrackingNumber(rec_id, trackingNumber)
                }
                break
        }
        if (!result) result = {
            code: 500,
            msg: "未知错误"
        }
        return result
    }

    function submitIdAndTackingNumber(id, shipment_id, trackingNumber, labeladdr) {
        // var values = { custrecord_dps_push_state: "成功", custrecord_dps_push_result: "", custrecord_dps_shipping_rec_status: 3 }
        var values = {
            custrecord_dps_push_state: "成功",
            custrecord_dps_push_result: ""
        }
        if (shipment_id) {
            values.custrecord_dps_shipping_rec_logistics_no = shipment_id;
            values.custrecord_dps_ship_trackingnumber_dh = shipment_id;
            values.custrecord_dps_shipping_rec_status = 21; // 推送物流成功, 状态更改为 等待获取面单文件
        }
        if (trackingNumber) {
            values.custrecord_dps_ship_trackingnumber_dh = trackingNumber;
        }
        if (labeladdr) {
            values.custrecord_fulfill_dh_label_addr = labeladdr;
            values.custrecord_dps_shipping_rec_status = 17; // 获取到了面单文件, 状态更改为 已获取标签
        }
        record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: id,
            values: values
        });
    }


    function GetLabel(rec_id) {
        var rec = record.load({
            type: "customrecord_dps_shipping_record",
            id: rec_id
        });
        var channel = rec.getValue("custrecord_dps_shipping_r_channel_dealer")
        var result
        var shipment_id = rec.getValue("custrecord_dps_shipping_rec_logistics_no")
        switch (channel) {
            case "1":
                jetstarApi.init(http, search)
                result = jetstarApi.GetLabels(shipment_id, '')
                if (result.code == 200) {
                    var single_pdf = result.data.shipment.single_pdf
                    updateLabel(rec_id, '', single_pdf)
                }
                break
        }
        if (!result) result = {
            code: 500,
            msg: "未知错误"
        }
        return result
    }

    function updateLabel(id, labelId, labelAddr) {
        var flag = 21;
        if (labelAddr) {
            flag = 17;
        }
        record.submitFields({
            type: 'customrecord_dps_shipping_record',
            id: id,
            values: {
                custrecord_fulfill_dh_label_addr: labelAddr,
                custrecord_dps_shipping_rec_status: flag
            }
        });
    }

    return {
        post: _post
    }
});