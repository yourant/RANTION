/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-03 09:48:23
 * @LastEditTime   : 2020-09-03 10:05:52
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \douples_amazon\dps.li.request.report.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/format', './Helper/core.min', 'N/log', 'N/record', 'N/runtime', './Helper/Moment.min', 'N/search',
    './Helper/interfunction.min'
], function(format, core, log, record, runtime, moment, search, interfun) {


    function _post(context) {

        var _start_date = context._start_date,
            _end_date = context._end_date,
            report_type = context._report_type,
            accountId = context._account;

        if (report_type == core.enums.report_type._GET_MERCHANT_LISTINGS_ALL_DATA_) {
            acc_arrys = core.amazon.getAccountList(group_req)
        } else {
            acc_arrys = core.amazon.getReportAccountList(group_req)
        }

        log.debug(report_type, '店铺数量:' + acc_arrys.length)
        acc_arrys.map(function(account) {
            if (account.id != accountId && accountId) return
            var marketplace = account.marketplace

            log.audit('account:' + account.id, marketplace)
            // if (is_request) {
            /** Settlement Report 结算报告 Request */
            if (report_type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                sum++
                core.amazon.requestReportFake(account, report_type, startDate, endDate)
                log.audit('requestReportFake', 'requestReportFake')
            } else if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) {
                core.amazon.requestReport(account, report_type, {})
            } else if (report_type == core.enums.report_type._GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA_) {
                core.amazon.requestReport(account, report_type, {
                    'StartDate': '2020-05-31T00:00:00.000Z',
                    'EndDate': endDate,
                    'MarketplaceIdList.Id.1': account.marketplace,
                    'ReportOptions': 'ShowSalesChannel'
                });
            } else {
                core.amazon.requestReport(account, report_type, {
                    'StartDate': startDate,
                    'EndDate': endDate,
                    'MarketplaceIdList.Id.1': account.marketplace,
                    'ReportOptions': 'ShowSalesChannel'
                })
            }
            // }

        })


    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});