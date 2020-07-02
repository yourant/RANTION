/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-01 11:06:39
 * @LastEditTime   : 2020-07-01 11:12:52
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.shipaddr.pdf.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/file'], function (search, record, file) {

    function getInputData() {
        var limit = 3999,
            recArr = [];
        search.create({
            type: '',
            filters: [{
                    name: 'custrecord_dps_recpir_flag',
                    operator: "isempty"
                },
                {
                    name: 'custrecord_dps_shipping_r_channel_dealer',
                    operator: 'anyof',
                    values: [6]
                }
            ]
        }).run().each(function (rec) {
            recArr.push(rec.id);
            return --limit > 0;
        });

        log.debug('recArr length: ' + recArr.length, recArr);
    }

    function map(context) {

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});