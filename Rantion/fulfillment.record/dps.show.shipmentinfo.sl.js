/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-24 13:16:42
 * @LastEditTime   : 2020-07-24 13:30:19
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.show.shipmentinfo.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/ui/serverWidget', 'N/log'], function (serverWidget, log) {

    function searchShipmentInfo(context) {


        var form = serverWidget.createForm({
            title: '查询shipment'
        });

        var field = form.addField({
            id: 'custpage_dps_account',
            type: serverWidget.FieldType.SELECT,
            source: 'customrecord_aio_account',
            label: '店铺'
        });


        context.response.writePage({
            pageObject: form
        });

    }

    return {
        onRequest: onRequest
    }
});