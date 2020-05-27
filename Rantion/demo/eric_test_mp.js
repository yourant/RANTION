/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/core.min.js'], function (search, log, record, core) {

    function getInputData() {
        log.error("begin mp")
        accountList = core.amazon.getReportAccountList();
        accountList.forEach(function (account) {
            if (account.id < 9) {
                log.error("account", JSON.stringify(account));
                core.amazon.requestReport(account, core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_, {
                    'MarketplaceIdList.Id.1': account.marketplace
                });
                var report = core.amazon.getRequestingReportList(account, core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_);
                log.error("report", JSON.stringify(report));
            }

        });
        return accountList;
    }

    function map(context) {
        log.error("begin context.value:", JSON.stringify(context.value));

        // log.error("report:", core.amazon.requestReport(context.value, 18, {
        //     'MarketplaceIdList.Id.1': context.value.marketplace,
        // }));
        return;
    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    function stockUseType(type) {
        var result
        search.create({
            type: "customlist88",
            filters: [{
                name: 'name',
                operator: 'is',
                values: type
            }, ],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }



});