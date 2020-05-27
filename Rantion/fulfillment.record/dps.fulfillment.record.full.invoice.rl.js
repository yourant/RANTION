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
define(['N/http', 'N/https', 'N/log', 'N/record', 'N/search'], function (http, https, log, record, search) {

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
                // TODO 重新获取物流渠道
                return action;

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