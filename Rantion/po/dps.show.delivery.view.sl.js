/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-02 14:49:38
 * @LastEditTime   : 2020-07-02 15:18:54
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\po\dps.show.delivery.view.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/log', 'N/runtime'], function (search, serverWidget, log, runtime) {

    function onRequest(context) {

        var userId = runtime.get

        var userId = runtime.getCurrentUser().id;
        log.debug('userId', userId);


    }


    function InitUI(vendorId) {



        search.create({
            type: "customrecord_dps_delivery_order",
            filters: [{
                name: 'custrecord_supplier',
                operator: 'anyof',
                values: [vendorId]
            }],
            columns: [
                "custrecord_supplier", // 供应商
                "custrecord_purchase_order_no", // 采购订单
                "custrecord_dsp_delivery_order_location", // 交货地点
                "custrecord_delivery_date", // 交期
                "custrecord_tracking_number", // 运单号
                "custrecord_delivery_order_type", // 交货单类型
                "custrecord_supplier", // 供应商

            ]
        }).run().each(function (rec) {

        })
    }
    return {
        onRequest: onRequest
    }
});