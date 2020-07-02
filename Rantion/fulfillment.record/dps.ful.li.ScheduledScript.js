/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-01 20:18:11
 * @LastEditTime   : 2020-07-01 20:19:57
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.ful.li.ScheduledScript.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript
 */
define(['N/record', 'N/runtime', 'N/log'], function (record, runtime, log) {

    function execute(context) {

        var resFileId2 = runtime.getCurrentScript().getParameter({
            name: 'custscript_dps_li_setvalue_id'
        });

    }

    return {
        execute: execute
    }
});