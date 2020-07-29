/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-28 19:42:02
 * @LastEditTime   : 2020-07-28 19:46:49
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.auto.update.number.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function getInputData() {

        search.create({
            type: 'customrecord_dps_transferorder_tranid',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 1
            }]
        }).run().each(function (r) {
            record.submitFields({
                type: 'customrecord_dps_transferorder_tranid',
                id: 1,
                values: {
                    custrecord_dps_to_serial_number: 1
                }
            })
        })

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