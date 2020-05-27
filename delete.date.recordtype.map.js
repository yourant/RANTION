/*
 * @Date           : 2020-03-30 10:32:17
 * @LastEditors    : Li
 * @LastEditTime   : 2020-03-30 11:05:32
 * @Description    : 
 * @FilePath       : \delete.date.recordtype.map.js
 * @Author         : Li
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function (record, search, log, runtime) {

    function getInputData() {
        var order = [], limit = 3999;
        var record_type = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_delete_recordtype' })
        log.debug('record_type', record_type)

        if (record_type) {
            log.audit('需要删除记录的ID', record_type)
            try {

                // 传入参数, 删除记录
                search.create({
                    type: record_type,
                    filters: []
                }).run().each(function (rec) {
                    order.push(rec.id)
                    return -- limit > 0;
                })

                log.audit('order length', order.length)
            } catch (error) {
                log.error('getInputData error', error)
            }

        }
        else {
            log.audit('请输入需要删除记录的ID', '请输入需要删除记录的ID')
        }


        return order
    }

    function map(context) {
        try {

            var record_type = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_delete_recordtype' })
            var deleid = record.delete({ type: record_type, id: context.value })

            log.debug('deleid', deleid)
        } catch (error) {
            log.audit('error', error)
        }

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