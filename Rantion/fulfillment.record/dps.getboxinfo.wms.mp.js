/*
 * @Author         : Li
 * @Date           : 2020-05-14 09:57:18
 * @LastEditTime   : 2020-05-14 09:59:31
 * @LastEditors    : Li
 * @Description    : 用于定时查询 WMS 装箱信息
 * @FilePath       : \Rantion\fulfillment.record\dps.getboxinfo.wms.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function getInputData() {

        var box_arr = [],
            limit = 3999;

        search.create({
            type: ''

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