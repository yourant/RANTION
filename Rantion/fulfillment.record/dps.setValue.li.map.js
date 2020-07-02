/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-01 19:56:29
 * @LastEditTime   : 2020-07-01 20:51:54
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.setValue.li.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/runtime'], function (record, runtime) {

    function getInputData() {
        log.debug('getInputData new Date', new Date().toISOString())
        var recId = runtime.getCurrentScript().getParameter({
            name: 'custscript_dps_ful_rec_id'
        });

        log.debug('recId', recId);

        return [recId];
    }

    function map(context) {

        try {

            log.debug('map new Date', new Date().toISOString());
            log.debug('map', context);

            var val = context.value;
            log.debug('val', val);

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: val,
                values: {
                    custrecord_dps_shipping_rec_status: 12
                }
            });

            log.debug('更改发运记录状态成功, id', id);

        } catch (error) {
            log.audit("error", error);
        }

    }

    function reduce(context) {
        // log.debug('reduce new Date', new Date().toISOString());
        // try {
        //     log.debug('context key', context.key);
        //     log.debug('reduce', context);
        //     var val = context.values[0];
        //     log.debug('val', val);

        //     var id = record.submitFields({
        //         type: 'customrecord_dps_shipping_record',
        //         id: val,
        //         values: {
        //             custrecord_dps_shipping_rec_status: 12
        //         }
        //     });

        //     log.debug('更改发运记录状态成功, id', id);

        // } catch (error) {
        //     log.audit("error", error);
        // }
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