/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-24 14:08:29
 * @LastEditTime   : 2020-09-24 20:57:02
 * @LastEditors    : Li
 * @Description    : 导入 日记账 关联结算报告
 * @FilePath       : \douples_amazon\dps.relation.bank.journal.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'], function(search, record, log, runtime) {

    function getInputData() {

        try {

            var limit = 3999,
                jour_arr = [];

            var runPaged = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_bank_journal_runpage' });
            log.debug("runPaged", runPaged);
            var data_length = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_bank_length' });
            log.debug("data_length", data_length);
            var jour_internal_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_bank_journal_m' });
            log.debug("jour_internal_id", jour_internal_id);
            var filter = [];
            filter.push({ name: "memomain", operator: "startswith", values: "银行" });
            filter.push({ name: "custbody_curr_voucher", operator: "startswith", values: "银行结算凭证" });
            filter.push({ name: 'custbody_amazon_settlementid', operator: "isnotempty" });
            filter.push({ name: 'custbody_dps_jiesuan', operator: "anyof", values: "@NONE@" });
            filter.push({ name: 'custbody_dps_jour_link_settlement_repo', operator: "is", values: false });

            if (jour_internal_id) {
                filter.push({ name: 'internalid', operator: "anyof", values: jour_internal_id });
            }

            var mySearch = search.create({
                type: "journalentry",
                filters: filter,
                columns: [
                    { name: 'internalid', summary: "GROUP" }, // 内部ID
                    { name: 'custbody_amazon_settlementid', summary: 'GROUP' }, // settlement id
                ]
            });

            if (runPaged) {
                var pageSize = 1000; // 每页条数
                var pageData = mySearch.runPaged({ pageSize: pageSize })
                var totalCount = pageData.count; // 总数
                log.error('总数据量', totalCount);
                var pageCount = pageData.pageRanges.length; // 页数
                log.error('总页数', pageCount);

                if (totalCount > 0) { // 存在数据, 直接获取全部数据
                    for (var i = 0; i < pageCount; i++) {
                        pageData.fetch({
                            index: i
                        }).data.forEach(function(rec) {
                            var it = {
                                jour_id: rec.getValue(rec.columns[0]),
                                settlement_id: rec.getValue(rec.columns[1])
                            }
                            jour_arr.push(it);
                        })
                    }
                }

            } else {


                if (data_length && data_length <= 3999) {
                    limit = data_length;
                }
                mySearch.run().each(function(rec) {
                    var it = {
                        jour_id: rec.getValue(rec.columns[0]),
                        settlement_id: rec.getValue(rec.columns[1])
                    }
                    jour_arr.push(it);

                    return --limit > 0;
                });

            }
            log.audit("获取数据长度", jour_arr.length);
            return jour_arr;
        } catch (error) {
            log.error("搜索对应的日记账出错了", error);
        }

    }

    function reduce(context) {

        try {

            var retrun_reduce = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_bank_journ_retrun_reduce' });

            if (retrun_reduce && retrun_reduce == "reduce") {
                log.debug("结束 阶段", "reduce");
                return;
            }

            var con_val = JSON.parse(context.values[0]);
            log.debug("con_val", con_val);

            var settlement_arr = [];

            var mySearch = search.load({ id: 441 });

            var myFilter = mySearch.filters;
            myFilter.push({ name: 'custrecord_aio_sett_id', operator: 'is', values: con_val.settlement_id });

            mySearch.filters = null;

            mySearch.filters = myFilter;

            mySearch.run().each(function(_r) {
                settlement_arr.push(_r.id);
                return true;
            });

            log.debug("结算报告", settlement_arr);

            log.audit("开始关联日记账", con_val.jour_id);

            var id = record.submitFields({
                type: "journalentry",
                id: con_val.jour_id,
                values: {
                    // custbody_dps_jiesuan: settlement_arr,
                    custbody_dps_jour_link_settlement_repo: true
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            settlement_arr.map(function(set) {

                record.submitFields({
                    type: "customrecord_aio_amazon_settlement",
                    id: set,
                    values: {
                        custrecord_aio_sett_deposit_journal: con_val.jour_id
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            });
        } catch (error) {
            log.error("关联银行日记账出错了", error);
        }

    }

    function summarize(summary) {
        log.audit("处理完成", "处理完成了");

    }

    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    }
});