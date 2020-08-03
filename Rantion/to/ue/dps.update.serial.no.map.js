/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-30 19:09:23
 * @LastEditTime   : 2020-07-30 19:14:32
 * @LastEditors    : Li
 * @Description    : 用于更新TO单的流水号
 * @FilePath       : \Rantion\to\ue\dps.update.serial.no.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function getInputData() {


        var str = 1
        var rec_Id = record.submitFields({
            type: 'customrecord_dps_transferorder_tranid',
            id: 1,
            values: {
                name: Number(str),
                custrecord_dps_to_serial_number: Number(str),
                custrecord_dps_to_serial_no_updatedate: new Date().toISOString()
            }
        });

        log.audit('更新TO流水号', rec_Id)

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