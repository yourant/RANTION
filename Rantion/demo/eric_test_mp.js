/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/core.min.js'], function (search, log, record, core) {



    function getInputData() {

        core.amazon.getReportAccountList().map(function (account) {
            log.debug("account:", account);
        });


        //盘盈
        var surplus = [];
        //盘亏
        var losses = [];

        var updateList = [];
        log.debug("updateList begin");
        search.create({
            type: 'customrecord_fba_update_inventory',
            columns: [
                'custrecord_fba_update_inventory_account',
                'custrecord_salesorder_location',
                'custrecord_fba_update_inventory_rid',
                'custrecord_fba_update_status'
            ],
            filters: [{ name: 'custrecord_fba_update_status', operator: 'is', values: 2 }]
        }).run().each(function (e) {
            var result = JSON.parse(JSON.stringify(e));
            log.debug("updateList begin", JSON.stringify(e));
            var isC = false;
            var custrecord_salesorder_location = result.values.custrecord_salesorder_location;
            updateList.map(function (v) {
                log.debug("updateList v", JSON.stringify(v));
                if (v.salesorder_location == custrecord_salesorder_location) {
                    isC = true;
                }
            });
            if (!false) {
                var item = {
                    account: result.values.custrecord_fba_update_inventory_account,
                    salesorder_location: result.values.custrecord_salesorder_location,
                    rid: result.values.custrecord_fba_update_inventory_rid
                }
                updateList.push(item);
            }
        });

        log.debug("updateList ", JSON.stringify(updateList));

        updateList.map(function (update) {
            var i = 1;
            log.debug("updateList item ", update);
            var nowPage = Number(0); // 查询页
            var pageSize = Number(100); // 每页数量
            log.debug('update.rid ', update.rid);
            var inventoryitem = search.create({
                type: 'customrecord_fba_myi_all_inventory_data',
                columns: [
                    'custrecord_fba_sku', 'custrecord_fba_afn_total_quantity', 'custrecord_fba_inventory_rid', 'custrecord_fba_account', 'custrecord_all_salesorder_location'
                ],
                filters: [
                    { name: 'custrecord_fba_inventory_rid', operator: 'EQUALTO', values: Number(update.rid) },
                    { name: 'custrecord_fba_account', operator: 'is', values: update.account },
                    { name: 'custrecord_all_salesorder_location', operator: 'EQUALTO', values: Number(update.salesorder_location) }
                ]
            });
            var pageData = inventoryitem.runPaged({
                // pageSize: pageSize
                pageSize: 10
            });
            var totalCount = pageData.count; // 总数
            // var pageCount = pageData.pageRanges.length; // 页数
            var pageCount = 1; // 页数
            log.debug('totalCount', JSON.stringify(totalCount));
            while (pageCount > 0) {
                pageData.fetch({
                    index: Number(nowPage++)
                }).data.forEach(function (result) {
                    var resultJSON = result.toJSON();
                    log.debug("resultJSON.values.custrecord_fba_sku+type", resultJSON.values.custrecord_fba_sku + "-" + typeof (resultJSON.values.custrecord_fba_sku))
                    // if (resultJSON.custrecord_fba_sku &&
                    //     resultJSON.custrecord_fba_afn_total_quantity &&
                    //     resultJSON.custrecord_fba_inventory_rid &&
                    //     resultJSON.custrecord_fba_account &&
                    //     resultJSON.custrecord_all_salesorder_location) {
                    //获取映射关系sku customrecord_dps_amazon_seller_sku
                    // log.debug('customrecord_dps_amazon_seller_sku', JSON.stringify(record.load({
                    //     type: "customrecord_dps_amazon_seller_sku",
                    //     id: ++i
                    // })));
                    search.create({
                        type: 'customrecord_dps_amazon_seller_sku',
                        columns: [
                            'custrecord_dps_amazon_sku_number',
                            'custrecord_dps_amazon_ns_sku'
                        ]

                        // name: "name",
                        // join: 'custrecord_dps_amazon_sku_number',
                        // operator: 'is',
                        // values: sellersku
                        , filters: [
                            { name: 'name', join: 'custrecord_dps_amazon_sku_number', operator: 'is', values: resultJSON.values.custrecord_fba_sku }
                            , { name: 'isinactive', join: 'custrecord_dps_amazon_ns_sku', operator: 'is', values: false }
                        ]
                    }).run().each(function (seller) {
                        var sellerJSON = JSON.parse(JSON.stringify(seller));
                        log.debug('sellerJSON', sellerJSON)
                        var skuId = sellerJSON.values.custrecord_dps_amazon_ns_sku[0].value;
                        var inventoryitem = record.load({
                            type: "inventoryitem",
                            id: skuId
                        });
                        var inventoryitemJSON = JSON.parse(JSON.stringify(inventoryitem));
                        log.debug('inventoryitemJSON', inventoryitemJSON)

                        var item_count = inventoryitem.getLineCount({ sublistId: 'locations' });
                        for (var i = 0; i < item_count; i++) {
                            var locationid = inventoryitem.getSublistValue({
                                sublistId: 'locations',
                                fieldId: 'locationid',
                                line: i,
                            });
                            if (locationid == update.salesorder_location) {
                                //库存对比
                                var quantityavailable = inventoryitem.getSublistValue({
                                    sublistId: 'locations',
                                    fieldId: 'quantityavailable',
                                    line: i,
                                });
                                var qty = resultJSON.values.custrecord_fba_afn_total_quantity;
                                log.debug("库存对比 ", qty + "-" + quantityavailable)
                                if (qty > quantityavailable) {
                                    surplus.push({
                                        item: skuId,
                                        location: update.salesorder_location,
                                        diffCount: qty - quantityavailable
                                    });
                                }
                                if (qty < quantityavailable) {
                                    losses.push({
                                        item: skuId,
                                        location: update.salesorder_location,
                                        diffCount: qty - quantityavailable
                                    });
                                }
                            }
                        }
                        return false;
                    });
                });
                pageCount--;
            }

            log.debug('i', i);
        });
        log.debug('surplus', surplus);

        // var firstCompany = getCompanyId("蓝深贸易有限公司")
        // if (surplus.length > 0) {
        //     var useType = stockUseType('盘盈入库')
        //     saveInventoryAdjust(firstCompany, surplus, useType);
        // }
        log.debug('losses', losses);
        // if (losses.length > 0) {
        //     var useType = stockUseType('盘亏出库')
        //     saveInventoryAdjust(firstCompany, losses, useType);
        // }
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
