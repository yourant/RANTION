/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/core.min.js'], function (search, log, record, core) {



    function getInputData() {

        var skuId = [
        ];

        for (var index = 0; index < skuId.length; index++) {
            var id = skuId[index];
            log.audit({
                title: 'id1',
                details: id
            })
             record.delete({
                 type: 'customrecord_product_sku',
                 id: id
             });
            log.audit({
                title: 'id2',
                details: id
            })
        }
        return;
    }

    function map(context) {
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
    function saveInventoryAdjust(company, items, type) {
        console.info(12);
        var rec = record.create({ type: 'inventoryadjustment', isDynamic: false });
        //科目
        rec.setValue({ fieldId: 'subsidiary', value: company })
        rec.setValue({ fieldId: 'custbody_stock_use_type', value: type })
        console.info(321);
        var account = getAccount(type)
        console.info(331);
        rec.setValue({ fieldId: 'account', value: account })
        console.info(1);
        for (var i = 0; i < items.length; i++) {
            console.info(2);
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'itemreceive',
                line: i,
                value: true
            });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: items[i].item, line: i });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: items[i].location, line: i });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: items[i].diffCount, line: i });
        }
        console.info("3", JSON.stringify(rec));
        var id = rec.save();
        return id
    }

    function getAccount(type) {
        var account
        search.create({
            type: "customrecord_adjustment_account",
            filters: [
                { name: 'custrecord_inventory_types', operator: 'is', values: type }
            ],
            columns: [{ name: 'custrecord_adjustment_accounts' }]
        }).run().each(function (e) {
            account = e.getValue('custrecord_adjustment_accounts')
        })
        return account
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
