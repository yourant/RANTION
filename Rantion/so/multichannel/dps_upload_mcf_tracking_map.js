/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-20 17:41:02
 * @LastEditTime   : 2020-07-29 15:27:35
 * @LastEditors    : Li
 * @Description    : 用于上传追踪号至
 * @FilePath       : \Rantion\so\multichannel\dps_upload_mcf_tracking_map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', "./Helper/core.min"], function (record, search, core) {

    function getInputData() {
        var orders = [];
        var limit = 100;
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'custbody_order_type_fulfillment',
                    operator: 'is',
                    values: 3
                },
                {
                    name: 'custbody_dps_waybill_no',
                    operator: 'isnotempty',
                    values: []
                },
                {
                    name: 'custbodyfulfillment_stock_so',
                    operator: 'isnotempty',
                    values: []
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
                },
                {
                    name: 'custbody_dps_create_mcf_order',
                    operator: 'is',
                    values: true
                },
                {
                    name: 'custbody_dps_amazon_mcf_tracking_no',
                    operator: 'is',
                    values: false
                }

            ],
            columns: [
                "otherrefnum", // 原订单号
                "custbodyfulfillment_stock_so", // 履行订单号
                "custbody_sotck_account", // 店铺
                "custbody_dps_waybill_no", // 追踪号
                "custbody_dps_mcf_shippingdatetime", // 发货时间
                "custbody_dps_mcf_carrier_code", // 承运商编码
                "custbody_mcf_delivery_method", // 履行的方式
                "item", "quantity"
            ]
        }).run().each(function (rec) {

            orders.push({
                recId: rec.id,
                ful_order_id: rec.getValue('custbodyfulfillment_stock_so'),
                order_id: rec.getValue('otherrefnum'),
                tracking_number: rec.getValue('custbody_dps_waybill_no'),
                shipment_date: rec.getValue('custbody_dps_mcf_shippingdatetime'), // 发货日期
                shipment_method: rec.getValue('custbody_mcf_delivery_method'), // 发货方式
                carrier_code: rec.getValue('custbody_dps_mcf_carrier_code'), // 承运商 编码
                order_item_id: "", // 订单货品id
                item_qty: rec.getValue('quantity'), // 货品数量
                acc_id: rec.getValue('custbody_sotck_account')
            });
            return --limit > 0;
        });
        log.debug('orders数量', orders.length);

        orders.map(function (ord) {
            var itemInfo;
            search.create({
                type: 'customrecord_aio_order_import_cache',
                filters: [{
                        name: 'custrecord_aio_cache_order_id',
                        operator: 'is',
                        values: ord.order_id
                    },
                    {
                        name: 'custrecord_aio_cache_acc_id',
                        operator: 'anyof',
                        values: ord.acc_id
                    }
                ],
                columns: [
                    "custrecord_amazonorder_iteminfo"
                ]
            }).run().each(function (rec) {
                itemInfo = rec.getValue('custrecord_amazonorder_iteminfo')
            });
            itemInfo = JSON.parse(itemInfo)
            ord.order_item_id = itemInfo[0].order_item_id
        });

        return orders;
    }

    function map(context) {

        var order = JSON.parse(context.value);
        var po_num = order.order_id;
        var carrier_code = order.carrier_code;
        var tracking_number = order.tracking_number;
        var shipment_date = order.shipment_date;
        var shipment_method = order.shipment_method;
        var quantity = order.item_qty;
        var fulfillment_id = order.ful_order_id;
        var account_id = order.acc_id;
        var order_item_id = order.order_item_id;
        var so_id = order.recId;

        if (so_id) {
            var rows = [];
            rows.push({
                tran_id: po_num,
                tracking_num: tracking_number,
                tran_date: shipment_date,
                carrier_method: shipment_method,
                carrier_name: carrier_code,
                order_item_id: order_item_id,
                item_qty: quantity,
            });

            var uploadTracking = core.amazon.uploadTracking(account_id, rows, so_id);

            log.debug('uploadTracking', uploadTracking);


        }


    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});