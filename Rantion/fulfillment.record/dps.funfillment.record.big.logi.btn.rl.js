/*
 * @Author         : Li
 * @Date           : 2020-05-11 14:59:25
 * @LastEditTime   : 2020-08-20 18:08:58
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
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml", "../Helper/config", "../Helper/tool.li"
], function (http, https, log, record, search, jetstar, openapi, yanwen, endicia, Moment, file, xml, config, tool) {

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
    /**
     * 完成出库履行
     * @param {*} rec_id
     */
    function confirmOut(rec_id) {
        var result
        try {
            var to_id, to_2_id_rec, to_2_status_rec, wms_info = '', financia_warehous;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: rec_id
                }],
                columns: ['custrecord_dps_shipping_rec_order_num', "custrecord_transfer_order3",
                    {
                        name: 'statusref',
                        join: 'custrecord_transfer_order3'
                    },
                    "custrecord_dps_shipping_rec_wms_info",
                    {
                        name: "custrecord_dps_financia_warehous",
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 财务分仓
                ]
            }).run().each(function (rec) {
                to_id = rec.getValue('custrecord_dps_shipping_rec_order_num');
                to_2_id_rec = rec.getValue('custrecord_transfer_order3');
                to_2_status_rec = rec.getValue({
                    name: 'statusref',
                    join: 'custrecord_transfer_order3'
                });
                wms_info = rec.getValue('custrecord_dps_shipping_rec_wms_info');
                financia_warehous = rec.getValue({
                    name: "custrecord_dps_financia_warehous",
                    join: 'custrecord_dps_shipping_rec_location'
                });
                return false;
            });
            if (to_id) {

                var transferlocation, target_warehouse, transferor_type, to_status;
                search.create({
                    type: 'transferorder',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: to_id
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                    ],
                    columns: [
                        "statusref", // 单据状态
                        "transferlocation", // to location
                        "custbody_actual_target_warehouse", // 实际目标仓库
                        "custbody_dps_transferor_type", // 调拨单类型
                    ]
                }).run().each(function (rec) {
                    to_status = rec.getValue('statusref');
                    transferor_type = rec.getValue('custbody_dps_transferor_type');
                    transferlocation = rec.getValue('transferlocation');
                    target_warehouse = rec.getValue('custbody_actual_target_warehouse');
                });

                log.debug('to_status   ' + typeof (to_status), to_status);
                log.debug('transferor_type   ' + typeof (transferor_type), transferor_type);
                log.debug('transferlocation    ' + typeof (transferlocation), transferlocation);
                log.debug('target_warehouse     ' + typeof (target_warehouse), target_warehouse);

                if ((financia_warehous == 3) && (transferlocation == target_warehouse)) { // 不存在虚拟在途

                    log.debug('不存在虚拟在途', "不存在虚拟在途");

                    var objRecord_id;
                    if (to_status == "pendingFulfillment" || to_status == "等待发货") {

                        var objRecord = record.transform({
                            fromType: 'transferorder',
                            fromId: to_id,
                            toType: 'itemfulfillment'
                        });
                        objRecord.setValue({
                            fieldId: 'shipstatus',
                            value: 'C'
                        });

                        var objRecord_id = objRecord.save();

                        log.debug('to 货品履行', objRecord_id);
                    }
                    if (!objRecord_id || objRecord_id) {

                        var url = config.WMS_Debugging_URL + '/inMaster';

                        var to_wms_message = tool.tranferOrderToWMS(to_id, url);

                        if (to_wms_message.data.code == 0 || to_wms_message.date.code == 8) {

                            var new_str = to_wms_message.data.msg ? to_wms_message.data.msg : to_wms_message.data
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: rec_id,
                                values: {
                                    // custrecord_transfer_order3: to_2_id,
                                    custrecord_dps_shipping_rec_status: 30,
                                    custrecord_dps_shipping_rec_wms_info: wms_info + '\n' + JSON.stringify(new_str)
                                }
                            });
                        } else {

                            var new_str = to_wms_message.data.msg ? to_wms_message.data.msg : to_wms_message.data
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: rec_id,
                                values: {
                                    // custrecord_transfer_order3: to_2_id,
                                    // custrecord_dps_shipping_rec_status: 30,
                                    custrecord_dps_shipping_rec_wms_info: wms_info + '\n' + JSON.stringify(new_str)
                                }
                            });
                        }


                        return result = {
                            code: 200,
                            msg: '发运成功'
                        }

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
                                    custrecord_dps_shipping_rec_status: 30
                                }
                            });
                            result = {
                                code: 200
                            }
                        } else {
                            result = {
                                code: 500,
                                msg: '收货失败了'
                            }
                        }
                    } else {
                        result = {
                            code: 500,
                            msg: '履行失败了'
                        }
                    }
                } else if (financia_warehous == 3) { // 存在虚拟在途

                    log.debug('存在虚拟在途', "存在虚拟在途");

                    var objRecord_id;
                    if (to_status == "pendingFulfillment" || to_status == "等待发货") {

                        log.debug('to_status', to_status);

                        var objRecord = record.transform({ // 履行 TO 1
                            fromType: 'transferorder',
                            fromId: to_id,
                            toType: 'itemfulfillment'
                        });
                        objRecord.setValue({
                            fieldId: 'shipstatus',
                            value: 'C'
                        });
                        objRecord_id = objRecord.save();

                        log.debug('if to 1 货品履行', objRecord_id);

                        var itemReceipt = record.transform({ // 接受TO 1
                            fromType: 'transferorder',
                            toType: record.Type.ITEM_RECEIPT,
                            fromId: to_id,
                        });
                        var irId = itemReceipt.save();
                        log.debug('if to 1 货品收据', irId);
                    } else {
                        if (to_status == "pendingReceipt" || to_status == "等待收货") {
                            var itemReceipt = record.transform({ // 接受TO 1
                                fromType: 'transferorder',
                                toType: record.Type.ITEM_RECEIPT,
                                fromId: to_id,
                            });
                            var irId = itemReceipt.save();
                            log.debug('else to 1 货品收据', irId);
                        }
                    }


                    var to_2_id;
                    if (!to_2_id_rec) {

                        var get = tool.copyRecordType("transferorder", to_id, {}, false, false);

                        get.setValue({
                            fieldId: 'location',
                            value: transferlocation
                        });
                        get.setValue({
                            fieldId: 'transferlocation',
                            value: target_warehouse
                        });
                        get.setValue({
                            fieldId: 'custbody_dps_transferor_type',
                            value: 6
                        }); // 设置调拨单类型

                        get.setValue({
                            fieldId: 'orderstatus',
                            value: 'B'
                        }); // 设置调拨单审批状态

                        to_2_id = get.save();

                        log.debug('复制记录ID', to_2_id);

                        var objRecord = record.transform({ // 履行 to 2
                            fromType: 'transferorder',
                            fromId: to_2_id,
                            toType: 'itemfulfillment'
                        });
                        objRecord.setValue({
                            fieldId: 'shipstatus',
                            value: 'C'
                        });
                        var objRecord_id = objRecord.save();

                        log.debug('to 2 货品履行', objRecord_id);
                    } else if (to_2_status_rec == "pendingFulfillment" || to_2_status_rec == "等待发货") {

                        to_2_id = to_2_id_rec;
                        var objRecord = record.transform({ // 履行 to 2
                            fromType: 'transferorder',
                            fromId: to_2_id,
                            toType: 'itemfulfillment'
                        });
                        objRecord.setValue({
                            fieldId: 'shipstatus',
                            value: 'C'
                        });
                        var objRecord_id = objRecord.save();

                        log.debug('to 2 货品履行', objRecord_id);
                    }

                    if (!to_2_id) {
                        to_2_id = to_2_id_rec;
                    }

                    var url = config.WMS_Debugging_URL + '/inMaster';
                    var to_wms_message = tool.tranferOrderToWMS(to_2_id, url);

                    log.debug('推送WMS 调拨入库', to_wms_message);

                    if (to_wms_message.code == 0) {

                        var new_str = to_wms_message.data.msg ? to_wms_message.data.msg : to_wms_message.data

                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: rec_id,
                            values: {
                                custrecord_transfer_order3: to_2_id,
                                custrecord_dps_shipping_rec_status: 30,
                                custrecord_dps_shipping_rec_wms_info: wms_info + '\n' + JSON.stringify(new_str)
                            }
                        });

                        result = {
                            code: 200,
                            msg: '处理成功'
                        }
                    } else {

                        var new_str = to_wms_message.data.msg ? to_wms_message.data.msg : to_wms_message.data
                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: rec_id,
                            values: {
                                custrecord_transfer_order3: to_2_id,
                                // custrecord_dps_shipping_rec_status: 30,
                                custrecord_dps_shipping_rec_wms_info: wms_info + '\n' + JSON.stringify(new_str)
                            }
                        });

                        result = {
                            code: 500,
                            msg: '推送WMS 调拨入库 失败'
                        }
                    }
                }

            } else {
                result = {
                    code: 500,
                    msg: '未知错误'
                }
            }
        } catch (error) {

            log.error('confirmOut  error', error);
            result = {
                code: 500,
                msg: error.message
            }
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
                    custrecord_dps_shipping_rec_status: 29,
                    custrecord_dps_box_return_flag: true
                }
            });
            result = {
                code: 200,
                msg: '已完成装箱, 等待发运'
            }
        } catch (error) {
            log.error('finishPackage error', error);
            result = {
                code: 500,
                msg: "出错了"
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