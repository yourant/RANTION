/*
 * @Date           : 2020-03-30 10:32:17
 * @LastEditors    : Li
 * @LastEditTime   : 2020-08-18 11:31:23
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
        var order = [],
            limit = 3999;

        // var userObj = runtime.getCurrentUser();

        log.debug('userObj', userObj);

        var record_type = runtime.getCurrentScript().getParameter({
            name: 'custscript_dps_delete_recordtype'
        })
        var run_action = runtime.getCurrentScript().getParameter({
            name: 'custscript_dps_li_run_action'
        })
        log.debug('record_type', record_type)

        if (record_type) {
            log.audit('需要删除记录的ID', record_type)
            try {

                if (run_action == "runeach") {
                    // 传入参数, 删除记录
                    search.create({
                        type: record_type,
                        filters: []
                    }).run().each(function (rec) {
                        order.push(rec.id)
                        return --limit > 0;
                    })

                    log.audit('order length', order.length)
                } else if (run_action == "runPage") {
                    var myRunPage = search.create({
                        type: record_type,
                        filters: []
                    });
                    var pageSize = 1000; //每页条数
                    var pageData = myRunPage.runPaged({
                        pageSize: pageSize
                    });
                    var totalCount = pageData.count; //总数
                    var pageCount = pageData.pageRanges.length; //页数

                    log.debug('数据总量', totalCount);
                    log.debug('总页数', pageCount);

                    for (var i = 0; i < pageCount; i++) {
                        pageData.fetch({
                            index: i
                        }).data.forEach(function (rs) {
                            order.push(rs.id)
                        });
                    }
                }
            } catch (error) {
                log.error('getInputData error', error)
            }

        } else {
            log.audit('请输入需要删除记录的ID', '请输入需要删除记录的ID')
        }

        // return order;
    }

    function map(context) {
        try {

            var record_type = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_delete_recordtype'
            })
            var deleid = record.delete({
                type: record_type,
                id: context.value
            })

            // log.debug('deleid', deleid)
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