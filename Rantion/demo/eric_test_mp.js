/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/core.min.js'], function (search, log, record, core) {

    function getInputData() {
        log.error("begin mp")
        accountList = core.amazon.getReportAccountList();
        accountList.forEach(function (account) {
            log.error("account", JSON.stringify(account));
            core.amazon.requestReport(account, core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_, {
                'MarketplaceIdList.Id.1': account.marketplace
            });
            var report = core.amazon.getRequestingReportList(account, core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_);
            log.error("report", JSON.stringify(report));
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
            filters: [
                { name: 'name', operator: 'is', values: type },
            ],
            columns: [
                { name: 'internalId' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //保存数据
    function saveInventoryAdjust(company, item, location, diffCount, type) {
        var rec = record.create({ type: 'inventoryadjustment', isDynamic: false });
        //科目
        rec.setValue({ fieldId: 'subsidiary', value: company })
        rec.setValue({ fieldId: 'custbody_stock_use_type', value: type })
        var account = getAccount(type)
        rec.setValue({ fieldId: 'account', value: account })
        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: item, line: 0 });
        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: location, line: 0 });
        rec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: diffCount, line: 0 });
        var id = rec.save();
        return id
    }

    //获取子公司的ID 
    function getLocationId(companyId, positionCode) {
        log.audit('companyId', companyId);
        var result
        search.create({
            type: 'location',
            filters: [
                { name: 'subsidiary', operator: 'is', values: companyId },
                { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode }
            ],
            columns: [
                { name: 'internalId' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取公司的ID 
    function getCompanyId(companyName) {
        var result
        search.create({
            type: 'subsidiary',
            filters: [
                { name: 'namenohierarchy', operator: 'is', values: companyName },
            ],
            columns: [
                { name: 'internalId' }
            ]
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
