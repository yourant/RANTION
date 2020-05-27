/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record'], function (search, apiUtil, record) {

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
        try {
            var item = getItemId(context.sku)
            if (!item) throw new Error('该SKU不存在NS系统')

            var firstCompany = getCompanyId("蓝深贸易有限公司")
            var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司")
            var thirdCompany = getCompanyId("广州蓝深科技有限公司")

            var firstLocation = getLocationId(firstCompany, context.positionCode)
            var secondLocation = getLocationId(secondCompany, context.positionCode)
            var thirdLocation = getLocationId(thirdCompany, context.positionCode)

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
            var inventoryQty = Number(context.inventoryQty)
            //盘盈的情况 当前数量 小于 WMS库存数量  所有库存调整走 蓝深贸易有限公司
            if (allAccount < inventoryQty) {
                var useType = stockUseType('盘盈入库')
                if (!firstLocation) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + context.positionCode)
                var diffCount = inventoryQty - allAccount
                var id = saveInventoryAdjust(firstCompany, item, firstLocation, diffCount, useType)
                var retjson = {
                    code: 0,
                    data: {
                        icno: context.icno,
                        barcode: context.barcode,
                        surplusQty: diffCount,
                        lossesQty: 0,
                        positionCode: context.positionCode,
                        sku: context.sku,
                        type: context.type
                    }
                }
                return JSON.stringify(retjson);
            }
            //盘亏的情况 当前数量 大于 WMS库存数量
            if (allAccount > inventoryQty) {
                var useType = stockUseType('盘亏出库')
                //剩余待调整数量
                var remainCount = allAccount - inventoryQty
                var idArray = new Array()
                //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                if (firstCount > 0) {
                    var diffCount = firstCount * -1
                    if (!firstLocation) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + context.positionCode)
                    if (firstCount < remainCount) {
                        remainCount = remainCount - firstCount
                    } else {
                        diffCount = remainCount
                        remainCount = 0
                    }
                    var id = saveInventoryAdjust(firstCompany, item, firstLocation, diffCount, useType)
                    idArray.push(id)
                }
                if (secondCount > 0 && remainCount > 0) {
                    var diffCount = secondCount * -1
                    if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应库位不存在 库位编号：" + context.positionCode)
                    if (secondCount < remainCount) {
                        remainCount = remainCount - secondCount
                    } else {
                        diffCount = remainCount
                        remainCount = 0
                    }
                    var id = saveInventoryAdjust(secondCompany, item, secondLocation, diffCount, useType)
                    idArray.push(id)
                }
                if (remainCount > 0) {
                    var diffCount = remainCount * -1
                    if (!thirdLocation) throw new Error("广州蓝深科技有限公司 对应库位不存在 库位编号：" + context.positionCode)
                    var id = saveInventoryAdjust(thirdCompany, item, thirdLocation, diffCount, useType)
                    idArray.push(id)
                }
                var retjson = {
                    code: 0,
                    data: {
                        icno: context.icno,
                        barcode: context.barcode,
                        surplusQty: 0,
                        lossesQty: allAccount - inventoryQty,
                        positionCode: context.positionCode,
                        sku: context.sku,
                        type: context.type
                    }
                }
                return JSON.stringify(retjson);
            }
        } catch (e) {
            var retjson = {
                code: 1,
                msg: e.message
            }
            return JSON.stringify(retjson);
        }
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

    //根据wms的SKU获取NS对应的ID 
    function getItemId(sku) {
        var result
        search.create({
            type: 'customrecord_dps_amazon_seller_sku',
            filters: [
                { name: 'custrecord_dps_amazon_sku_number', operator: 'is', values: sku },
            ],
            columns: [
                { name: 'custrecord_dps_amazon_ns_sku' }
            ]
        }).run().each(function (rec) {
            result = rec.getValue('custrecord_dps_amazon_ns_sku')
            return false;
        });
        return result
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
