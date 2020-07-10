/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record', '../common/request_record'], function (search, apiUtil, record, requestRecord) {

    function _get(context) {

    }

    // params：{
    // icno (string):盘点单单号 ,
    // barcode (string):条码 装箱条码/SKU ,
    // inventoryQty (integer):盘点数 ,
    // operator (string):操作人 ,
    // positionCode (string):库位编号 ,
    // sku (string):sku ,
    // type (integer):类型 1:已装箱 2:未装箱 ,
    // }
    // result：{
    // icno (string):盘点单单号 ,
    // barcode (string):条码 装箱条码/SKU ,
    // surplusQty (integer):盘盈数量 ,
    // lossesQty (integer):盘亏数量 ,
    // positionCode (string):库位编号 ,
    // sku (string):sku ,
    // type (integer):类型 1:已装箱 2:未装箱 ,
    // }
    function _post(context) {
        if (!context.requestBody || context.requestBody.length == 0) throw new Error('请求数据不合法')
        log.audit('context', context);
        try {
            var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "库存盘点");
            if (requestRecordInfo) {
                retjson.code = 1;
                retjson.data = {
                    msg: 'NS 请求重复处理'
                }
                retjson.msg = 'failure'
            } else {
                var resultArray = new Array()
                var firstCompany = getCompanyId("蓝深贸易有限公司")
                var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司")
                var thirdCompany = getCompanyId("广州蓝深科技有限公司")

                var surplus = new Array();

                var firstCompanyData = new Array();
                var secondCompanyData = new Array();
                var thirdCompanyData = new Array();

                for (var i in context.requestBody) {
                    var parami = context.requestBody[i]
                    var item = getItemId(parami.sku)
                    var line = Number(i) + 1
                    if (!item) throw new Error('第' + line + '行SKU不存在NS系统')
                    var firstLocation;
                    var secondLocation;
                    var thirdLocation;
                    if (parami.type == 1) {
                        firstLocation = getLocationId(firstCompany, parami.barcode)
                        if (!firstLocation) {
                            var fLocation = searchLocationCode(parami.positionCode, firstCompany);
                            createBoxLocation(parami.barcode, firstCompany, fLocation);
                            firstLocation = searchLocationCode(parami.barcode, firstCompany);
                        }
                        secondLocation = getLocationId(secondCompany, parami.barcode)
                        if (!secondLocation) {
                            var fLocation = searchLocationCode(parami.positionCode, secondCompany);
                            createBoxLocation(parami.barcode, secondCompany, fLocation);
                            secondLocation = searchLocationCode(parami.barcode, secondCompany);
                        }
                        thirdLocation = getLocationId(thirdCompany, parami.barcode)
                        if (!thirdLocation) {
                            var fLocation = searchLocationCode(parami.positionCode, thirdCompany);
                            createBoxLocation(parami.barcode, thirdCompany, fLocation);
                            thirdLocation = searchLocationCode(parami.barcode, thirdCompany);
                        }
                    } else {
                        firstLocation = getLocationId(firstCompany, parami.positionCode)
                        secondLocation = getLocationId(secondCompany, parami.positionCode)
                        thirdLocation = getLocationId(thirdCompany, parami.positionCode)
                    }

                    var firstParentLocationId = getParentLocationId(firstCompany, parami.positionCode);
                    var secondParentLocationId = getParentLocationId(secondCompany, parami.positionCode);
                    var thirdParentLocationId = getParentLocationId(thirdCompany, parami.positionCode);

                    var firstCount = 0
                    var secondCount = 0
                    var thirdCount = 0

                    if (firstLocation) {
                        firstCount = getCount(item, firstLocation)
                    }
                    if (secondLocation) {
                        secondCount = getCount(item, secondLocation)
                    }
                    if (thirdLocation) {
                        thirdCount = getCount(item, thirdLocation)
                    }

                    var allAccount = firstCount + secondCount + thirdCount
                    var inventoryQty = Number(parami.inventoryQty)
                    log.audit('allAccount', allAccount);
                    log.audit('inventoryQty', inventoryQty);
                    //盘盈的情况 当前数量 小于 WMS库存数量  所有库存调整走 蓝深贸易有限公司
                    if (allAccount < inventoryQty) {
                        var useType = stockUseType('盘盈入库')
                        if (!firstLocation) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                        var diffCount = inventoryQty - allAccount
                        surplus.push({
                            company: firstCompany,
                            item: item,
                            location: firstLocation,
                            diffCount: diffCount,
                            useType: useType,
                            icno: parami.icno,
                            parentLocation: firstParentLocationId
                        })
                        resultArray.push({
                            icno: parami.icno,
                            barcode: parami.barcode,
                            surplusQty: diffCount,
                            lossesQty: 0,
                            positionCode: parami.positionCode,
                            sku: parami.sku,
                            type: parami.type
                        })
                    }
                    //盘亏的情况 当前数量 大于 WMS库存数量
                    if (allAccount > inventoryQty) {
                        var useType = stockUseType('盘亏出库')
                        //剩余待调整数量
                        var remainCount = allAccount - inventoryQty
                        //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                        if (firstCount > 0) {
                            var diffCount = firstCount * -1
                            if (!firstLocation) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            if (firstCount < remainCount) {
                                remainCount = (remainCount - Math.abs(firstCount))
                            } else {
                                diffCount = remainCount * -1
                                remainCount = 0
                            }
                            firstCompanyData.push({
                                company: firstCompany,
                                item: item,
                                location: firstLocation,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                parentLocation: firstParentLocationId
                            })
                        }
                        if (secondCount > 0 && remainCount > 0) {
                            var diffCount = secondCount * -1
                            if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            if (secondCount < remainCount) {
                                remainCount = (remainCount - Math.abs(secondCount))
                            } else {
                                diffCount = remainCount * -1
                                remainCount = 0
                            }
                            secondCompanyData.push({
                                company: secondCompany,
                                item: item,
                                location: secondLocation,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                parentLocation: secondParentLocationId
                            })
                        }
                        if (remainCount > 0) {
                            var diffCount = remainCount * -1
                            if (!thirdLocation) throw new Error("广州蓝深科技有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            thirdCompanyData.push({
                                company: thirdCompany,
                                item: item,
                                location: thirdLocation,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                parentLocation: thirdParentLocationId
                            })
                        }
                        resultArray.push({
                            icno: parami.icno,
                            barcode: parami.barcode,
                            surplusQty: 0,
                            lossesQty: allAccount - inventoryQty,
                            positionCode: parami.positionCode,
                            sku: parami.sku,
                            type: parami.type
                        })
                    }
                    if (allAccount == inventoryQty) {
                        resultArray.push({
                            icno: parami.icno,
                            barcode: parami.barcode,
                            surplusQty: 0,
                            lossesQty: 0,
                            positionCode: parami.positionCode,
                            sku: parami.sku,
                            type: parami.type
                        })
                    }

                }

                if (surplus.length > 0) {
                    var surplusDataArray = new Array()
                    for (var i in surplus) {
                        var surplusData = surplus[i]
                        surplusDataArray.push({
                            item: surplusData.item,
                            location: surplusData.location,
                            diffCount: surplusData.diffCount
                        })
                    }
                    saveInventoryAdjust(surplus[0].company, surplus[0].useType, surplus[0].icno, surplusDataArray, surplus[0].parentLocation)
                }

                if (firstCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in firstCompanyData) {
                        var lossData = firstCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount
                        })
                    }
                    saveInventoryAdjust(firstCompanyData[0].company, firstCompanyData[0].useType, firstCompanyData[0].icno, lossDataArray, firstCompanyData[0].parentLocation)
                }
                if (secondCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in secondCompanyData) {
                        var lossData = secondCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount
                        })
                    }
                    saveInventoryAdjust(secondCompanyData[0].company, secondCompanyData[0].useType, secondCompanyData[0].icno, lossDataArray, secondCompanyData[0].parentLocation)
                }
                if (thirdCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in thirdCompanyData) {
                        var lossData = thirdCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount
                        })
                    }
                    saveInventoryAdjust(thirdCompanyData[0].company, thirdCompanyData[0].useType, thirdCompanyData[0].icno, lossDataArray, thirdCompanyData[0].parentLocation)
                }
                var retjson = {
                    code: 0,
                    data: resultArray
                }
            }
            requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "库存盘点");
            return JSON.stringify(retjson);
        } catch (e) {
            var retjson = {
                code: 1,
                msg: e.message
            }
            requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "库存盘点");
            return JSON.stringify(retjson);
        }
    }

    //保存数据
    function saveInventoryAdjust(company, type, icno, data, parentLocation) {
        log.audit('saveInventoryAdjust', company + '-' + type + '-' + icno + '-' + JSON.stringify(data) + '-' + parentLocation);
        var rec = record.create({ type: 'inventoryadjustment', isDynamic: false });
        //科目
        rec.setValue({ fieldId: 'subsidiary', value: company })
        rec.setValue({ fieldId: 'custbody_stock_use_type', value: type })
        rec.setValue({ fieldId: 'custbody_dps_check_inventory_no', value: icno })
        var account = getAccount(type)
        rec.setValue({ fieldId: 'account', value: account })
        for (var i in data) {
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: data[i].item, line: i });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: data[i].location, line: i });
            rec.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: data[i].diffCount, line: i });
            if (data[i].diffCount > 0) {
                var price;
                search.create({
                    type: 'item',
                    filters: [
                        { name: 'internalid', operator: 'is', values: data[i].item },
                        { name: 'inventorylocation', operator: 'anyof', values: data[i].location }
                    ],
                    columns: ['locationaveragecost']
                }).run().each(function (rec) {
                    price = rec.getValue('locationaveragecost');
                });
                if (price) {
                    log.audit('saveInventoryAdjust price', price);
                    rec.setSublistValue({ sublistId: 'inventory', fieldId: 'unitcost', value: price, line: i });
                }
            }
        }
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

    function getItemId(sku) {
        var result = false;
        search.create({
            type: 'item',
            filters: [
                { name: 'itemid', operator: 'is', values: sku },
            ],
            columns: [
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取子公司的ID 
    function getLocationId(companyId, positionCode) {
        log.audit('getLocationId', companyId + '-' + positionCode);
        var result = false;
        search.create({
            type: 'location',
            filters: [
                { name: 'subsidiary', operator: 'is', values: companyId },
                { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode },
                { name: 'isinactive', operator: 'is', values: 'F' }
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

    //获取货品对应库位的当前数量
    function getCount(item, location) {
        var count = 0
        search.create({
            type: 'item',
            filters: [
                { name: 'internalId', operator: 'is', values: item },
                { name: 'inventorylocation', operator: 'is', values: location }
            ],
            columns: [
                { name: 'locationquantityonhand' }
            ]
        }).run().each(function (rec) {
            var nowCount = rec.getValue('locationquantityonhand')
            count = nowCount ? Number(nowCount) : 0
            return true;
        });
        return count
    }

    //获取子公司的ParentLocationId
    function getParentLocationId(companyId, positionCode) {
        log.audit('getParentLocationId', companyId + '-' + positionCode)
        var result
        search.create({
            type: 'location',
            filters: [
                { name: 'subsidiary', operator: 'is', values: companyId },
                { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode },
                { name: 'custrecord_wms_location_type', operator: 'is', values: '2' }
            ],
            columns: [
                { name: 'custrecord_dps_parent_location' }
            ]
        }).run().each(function (rec) {
            log.audit('getParentLocationId result', JSON.stringify(rec))
            result = rec.getValue('custrecord_dps_parent_location')
            return false;
        });

        return result
    }

    /**
     * 创建箱子
     * @param {*} boxName 
     */
    function createBoxLocation(boxName, Subsidiary, fLocation) {

        // 2 广州蓝深科技有限公司
        // 3 广州蓝图创拓进出口贸易有限公司
        // 5 蓝深贸易有限公司

        var subArr = [2, 3, 5];

        var locObj = record.create({ type: 'location' });
        locObj.setValue({ fieldId: 'name', value: boxName });
        locObj.setValue({ fieldId: 'parent', value: fLocation });
        locObj.setValue({ fieldId: 'subsidiary', value: Subsidiary });
        locObj.setValue({ fieldId: 'custrecord_dps_wms_location', value: boxName });
        locObj.setValue({ fieldId: 'custrecord_dps_wms_location_name', value: boxName });
        locObj.setValue({ fieldId: 'custrecord_wms_location_type', value: 3 });
        search.create({
            type: 'location',
            filters: [{ name: 'internalid', operator: 'is', values: fLocation }],
            columns: [
                { name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' },
                { name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' }
            ]
        }).run().each(function (result) {
            var code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' });
            var name = result.getValue({ name: 'custrecord_dps_wms_location_name', join: 'custrecord_dps_parent_location' });
            if (code) {
                locObj.setValue({ fieldId: 'custrecord_dps_warehouse_code', value: code });
            }
            if (name) {
                locObj.setValue({ fieldId: 'custrecord_dps_warehouse_name', value: name });
            }
            return false;
        });
        var locObjId = locObj.save();
        var rec = record.load({ type: 'location', id: locObjId });
        rec.setValue({ fieldId: 'parent', value: fLocation });
        rec.save();
    }

    /**
     * 搜索对应的地点
     * @param {s} warCode 
     * @param {*} Subsidiary 
     */
    function searchLocationCode(warCode, Subsidiary) {
        var locationId;
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_wms_location', operator: 'is', values: warCode },
                { name: 'subsidiary', operator: 'anyof', values: Subsidiary },
                { name: 'isinactive', operator: 'is', values: false }
            ],
        }).run().each(function (rec) {
            locationId = rec.id;
        });
        return locationId || false;
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
