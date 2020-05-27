/*
 * @Author         : Li
 * @Date           : 2020-05-14 15:42:03
 * @LastEditTime   : 2020-05-14 15:49:55
 * @LastEditors    : Li
 * @Description    : 定时查询已推送WMS的退货授权单, 获取相关信息
 * @FilePath       : \Rantion\so\dps.li.itemreceipt.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function getInputData() {

        var limit = 3999,
            info = [];
        search.create({
            type: 'returnauthorization',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: true
                },

                {
                    name: 'custbody_dps_push_wms',
                    operator: 'is',
                    values: true
                }
            ]
        }).run().each(function (rec) {
            info.push(rec.id);
            return --limit>0;
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