/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-26 10:36:57
 * @LastEditTime   : 2020-09-26 14:58:21
 * @LastEditors    : Li
 * @Description    : 根据客户分组, 打标记, 客户,4000
 * @FilePath       : \douples_amazon\dps.invoice.group.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'], function(search, record, log, runtime) {


    const fmt = "yyyy-M-d";

    function getInputData() {

        log.audit("开始处理数据", "阶段 getInputData");


        var fils = [];

        fils.push({ name: 'mainline', operator: 'is', values: true });
        fils.push({ name: 'custbody_dps_batch', operator: 'isempty' });

        var customer = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoice_group_mp_customer' }); //  客户
        var data_length = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoice_group_data_length' }); //  数据长度

        var invoice_group_flag = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoice_group_flag' }); //  数据长度

        var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoice_group_start_date' }); // 开始时间
        var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoice_group_end_date' }); //  结束时间


        if (_start_date && _end_date) {
            fils.push({ name: 'trandate', operator: 'within', values: [_li_dateFormat(_start_date, fmt), _li_dateFormat(_end_date, fmt)] }); // end date从2月份开始
        }
        if (_start_date && !_end_date) {
            fils.push({ name: 'trandate', operator: 'onorafter', values: [_li_dateFormat(_start_date, fmt)] }); // end date从2月份开始
        }
        if (!_start_date && _end_date) {
            fils.push({ name: 'trandate', operator: 'onorbefore', values: [_li_dateFormat(_end_date, fmt)] }); // end date从2月份开始
        }

        if (customer) {
            fils.push({ name: "name", operator: "anyof", values: [customer] });
        }

        var flag_date = new Date().getTime(); // 用时间作为标记, 避免重复

        var limit = 4000;

        if (data_length && data_length <= 4000) {
            limit = data_length;
        }

        log.debug("limit", limit);


        // return [];

        var invArr = [];
        search.create({
            type: "invoice",
            filters: fils,
            columns: [
                { label: "Name", name: "entity", sortdir: "ASC" },
                { label: "Internal ID", name: "internalid", sortdir: "ASC" }
            ]
        }).run().each(function(rec) {

            var temp_name_id = rec.getValue(rec.columns[0]);
            var temp_name_text = rec.getText(rec.columns[0]);

            var temp_flag = temp_name_text + "-" + flag_date;

            var it = {
                invId: rec.id,
                invFlag: invoice_group_flag ? invoice_group_flag : temp_flag,
                customer: temp_name_id
            }

            invArr.push(it);

            return --limit > 0;
        })

        log.audit('获取数据的长度 invArr', invArr.length);

        return invArr;

    }


    function map(context) {


        try {
            var val = JSON.parse(context.value);

            log.debug("val   invId:   invFlag:   customer", val.invId + ":   " + val.invFlag + ":   " + val.customer);
            var recId = record.submitFields({
                type: 'invoice',
                id: val.invId,
                values: {
                    custbody_dps_batch: val.invFlag
                }
            });

            log.debug("recId", recId);
        } catch (error) {
            log.error("出错了", error);
        }

    }

    function reduce(context) {

    }

    function summarize(summary) {

        log.audit("处理完成", "阶段 summary")

    }



    function _li_dateFormat(date, fmt) {
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        }
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
            }
        }
        return fmt;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});