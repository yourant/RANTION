/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-12 14:15:18
 * @LastEditTime   : 2020-06-12 14:53:15
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.LogisticsDocuments.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/http', 'N/https', 'N/log', 'N/record', 'N/search',
    'SuiteScripts/dps/logistics/jetstar/dps_logistics_request.js',
    'SuiteScripts/dps/logistics/openapi/dps_openapi_request.js',
    'SuiteScripts/dps/logistics/yanwen/dps_yanwen_request.js',
    'SuiteScripts/dps/logistics/endicia/dps_endicia_request.js',
    'SuiteScripts/dps/logistics/common/Moment.min', 'N/file', "N/xml"
], function (http, https, log, record, search, jetstar, openapi, yanwen, endicia, Moment, file, xml) {

    function getInputData() {
        var bigArr = [],
            limit = 3999

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                    name: 'custrecord_dps_shipping_rec_logistics_no',
                    operator: 'ISNOTEMPTY'
                },
                {
                    name: 'custrecord_fulfill_dh_label_addr',
                    operator: 'ISEMPTY'
                }
            ]
        }).run().each(function (rec) {
            bigArr.push(rec.id);

            return --limit > 0;
        });

        log.debug('bigArr length', bigArr.length);

        return bigArr;
    }

    function map(context) {

        var val = context.value;

        GetLabel(val);


    }

    function reduce(context) {

    }

    function summarize(summary) {

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
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});