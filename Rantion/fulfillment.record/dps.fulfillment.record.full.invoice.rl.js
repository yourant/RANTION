/*
 * @Author         : Li
 * @Date           : 2020-05-11 14:59:25
 * @LastEditTime   : 2020-05-11 16:58:14
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.record.full.invoice.rl.js
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
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml"],
    function (http, https, log, record, search, jetstar, openapi, yanwen, endicia, Moment, file, xml) {

        function _post(context) {
            log.debug('context', context);
            var info = context;
            var action = context.action;
            var recordID = context.recordID;
            log.debug('action: ' + action, 'recordID: ' + recordID);
            switch (action) {
                case 'WMS':
                    log.debug('WMS: ', action);
                    // TODO 重新WMS发运
                    return action;
                case 'Logistics':
                    log.debug('Logistics', action);
                    return reacquireLogistics(recordID);
                case 'TrackingNumber':
                    log.debug('TrackingNumber', action);
                    return trakingNumber(recordID);

                default:
                    return false;
            }

            return info || false;
        }




        /**
         * 重新匹配物流供应商
         * @param {*} rec_id 
         */
        function reacquireLogistics(rec_id) {
            var rec = record.load({
                type: "customrecord_dps_shipping_small_record",
                id: rec_id
            });
            var channel = rec.getText("custrecord_dps_ship_small_channel_dealer")
            var result
            log.audit('channel', channel);
            switch (channel) {
                case "捷士":
                    jetstarApi.init(http, search)
                    var result = jetstarApi.Create(rec, "small")
                    log.audit('result', result);
                    if (result.code == 200) {
                        var shipment_id = result.data.shipment_id
                        var labelresult = jetstarApi.GetLabels(shipment_id, '')
                        if (labelresult.code == 200) {
                            var trackingNumber = labelresult.data.shipment.tracking_number
                            submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber)
                        }
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_ship_small_status: 4,
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
                case "出口易":
                    openApi.init(http, search, record)
                    var result = openApi.CreateOrders(rec, "small")
                    if (result.code == 200) {
                        var orderId = rec.getValue("custrecord_dps_ship_platform_order_numbe")
                        var infoResult = openApi.GetInfo(orderId)
                        log.audit('infoResult', infoResult);
                        if (infoResult.code == 200) {
                            var trackingNumber = infoResult.data.TrackingNumber
                            var shipment_id = infoResult.data.Ck1PackageId
                            submitIdAndTackingNumber(rec.id, shipment_id, trackingNumber)
                        }
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_ship_small_status: 4,
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
                case "燕文物流":
                    yanwenApi.init(http, xml, file, search)
                    var shipdate = rec.getValue("custrecord_dps_ship_small_shipping_date")
                    var now
                    //发运时间  工具类不方便处理 所以在这里
                    if (shipdate) now = Moment(shipdate).toSimpleISOString()
                    var result = yanwenApi.Create(rec, now)
                    log.audit('result', result);
                    if (result.code == 200) {
                        var shipment_id = result.data.Epcode
                        log.audit('shipment_id', shipment_id);
                        submitIdAndTackingNumber(rec.id, shipment_id, shipment_id)
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_ship_small_status: 4,
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
                case "Endicia":
                    endiciaApi.init(http, xml, search)
                    var now
                    //发运时间  工具类不方便处理 所以在这里
                    var result = endiciaApi.GetPostageLabel(rec)
                    log.audit('result', result);
                    if (result.code == 200) {
                        var shipment_id = result.data.PIC
                        var TrackingNumber = result.data.TrackingNumber
                        log.audit('shipment_id', shipment_id);
                        submitIdAndTackingNumber(rec.id, shipment_id, TrackingNumber)
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_shipping_small_record',
                            id: rec.id,
                            values: {
                                custrecord_dps_ship_small_status: 4,
                                custrecord_dps_push_state_xh: "失败",
                                custrecord_dps_push_result_xh: result.msg
                            }
                        });
                    }
                    break
            }
            if (!result) result = { code: 500, msg: "未知错误" }
            return result
        }


        /**
         * 获取物流跟踪号
         * @param {*} rec_id 
         */
        function trakingNumber(rec_id) {
            var rec = record.load({
                type: "customrecord_dps_shipping_small_record",
                id: rec_id
            });
            var channel = rec.getText("custrecord_dps_ship_small_channel_dealer")
            var result
            var shipment_id = rec.getValue("custrecord_dps_ship_small_logistics_orde")
            switch (channel) {
                case "捷士":
                    jetstarApi.init(http, search)
                    result = jetstarApi.GetLabels(shipment_id, '')
                    if (result.code == 200) {
                        var trackingNumber = result.data.shipment.tracking_number
                        updateTrackingNumber(rec_id, trackingNumber)
                    }
                    break
                case "出口易":
                    openApi.init(http, search, record)
                    var orderId = rec.getValue("custrecord_dps_ship_platform_order_numbe")
                    result = openApi.GetInfo(orderId)
                    log.audit('infoResult', result);
                    if (result.code == 200) {
                        var trackingNumber = result.data.TrackingNumber
                        updateTrackingNumber(rec_id, trackingNumber)
                    }
                    break
                // case "燕文物流":
                //     yanwenApi.init(http, xml, file, search)
                //     var shipdate = rec.getValue("custrecord_dps_ship_small_shipping_date")
                //     var now
                //     //发运时间  工具类不方便处理 所以在这里
                //     if (shipdate) now = Moment(shipdate).toSimpleISOString()
                //     var result = yanwenApi.Create(rec, now)
                //     log.audit('result', result);
                //     if (result.code == 200) {
                //         var shipment_id = result.data.Epcode
                //         log.audit('shipment_id', shipment_id,YanwenNumber);
                //         submitIdAndTackingNumber(rec.id, shipment_id)
                //     } else {
                //         record.submitFields({
                //             type: 'customrecord_dps_shipping_small_record',
                //             id: rec.id,
                //             values: {
                //                 custrecord_dps_ship_small_status: 4,
                //                 custrecord_dps_push_state_xh: "失败",
                //                 custrecord_dps_push_result_xh: result.msg
                //             }
                //         });
                //     }
                //     break
            }
            if (!result) result = { code: 500, msg: "未知错误" }
            return result
        }

        function submitIdAndTackingNumber(id, shipment_id, trackingNumber) {
            var values = {
                custrecord_dps_ship_small_status: 3,
                custrecord_dps_push_state_xh: "成功",
                custrecord_dps_push_result_xh: ""
            }
            if (shipment_id) values.custrecord_dps_ship_small_logistics_orde = shipment_id
            if (trackingNumber) values.custrecord_dps_ship_small_trackingnumber = trackingNumber
            record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
                id: id,
                values: values
            });
        }

        function updateTrackingNumber(id, trackingNumber) {
            record.submitFields({
                type: 'customrecord_dps_shipping_small_record',
                id: id,
                values: {
                    custrecord_dps_ship_small_trackingnumber: trackingNumber
                }
            });
        }


        /**
         * 重新推送WMS
         * @param {*} rec_id 
         */
        function WMSShipping(rec_id) {


            // 发运仓库 custrecord_dps_ship_samll_location 列表 / 记录 地点 是
            // 订单号 custrecord_dps_ship_order_number Free - Form文本 是
            // 平台订单号 custrecord_dps_ship_platform_order_numbe Free - Form文本 是
            // 物流运单号 custrecord_dps_ship_small_logistics_orde Free - Form文本 是
            // 物流跟踪单号 custrecord_dps_ship_small_trackingnumber Free - Form文本 是
            // 状态 custrecord_dps_ship_small_status 列表 / 记录 发运记录发运状态 是
            // 销售平台 custrecord_dps_ship_small_sales_platform Free - Form文本 是
            // 销售店铺 custrecord_dps_ship_small_account 列表 / 记录 DPS | Connector Account 是
            // SKU custrecord_dps_ship_small_sku Free - Form文本 是
            // 数量 custrecord_dps_ship_small_quantity 整数 是
            // 目的地 custrecord_dps_ship_small_destination 全文 是
            // 收件人 custrecord_dps_ship_small_recipient Free - Form文本 是
            // 联系电话 custrecord_dps_ship_small_phone Free - Form文本 是
            // 发货重量 custrecord_dps_ship_small_ship_weight 小数 是
            // 预估运费 custrecord_dps_ship_small_estimatedfreig 小数 是
            // 发运时间 custrecord_dps_ship_small_shipping_date 日期 是
            // 妥投时间 custrecord_dps_ship_small_due_date 日期 是
            // 渠道商 custrecord_dps_ship_small_channel_dealer 列表 / 记录 发运方式 是
            // 渠道服务 custrecord_dps_ship_small_channelservice Free - Form文本 是

            var limit = 3999,
                sku;
            search.create({
                type: 'customrecord_dps_shipping_small_record',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: rec_id
                }],
                columns: ['custrecord_dps_ship_small_sku', 'custrecord_dps_ship_small_account', 'custrecord_dps_ship_small_quantity']
            }).run().each(function (rec) {
                sku = rec.getValue('custrecord_dps_ship_small_sku');
                return --limit > 0;
            });

        }

        return {
            post: _post
        }
    });