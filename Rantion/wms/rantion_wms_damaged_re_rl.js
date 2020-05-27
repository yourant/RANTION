/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record'], function (search, apiUtil, record) {

    function _get(context) {

    }

    // params：{
    //     auditTime (string): 审核时间 ,
    //     auditor (string): 审核人 ,
    //     barcode (string): 条码 装箱条码/SKU ,
    //     createBy (string): 创建人 ,
    //     createTime (string): 创建时间 ,
    //     fono (string): 报损单号 ,
    //     num (integer): 数量 ,
    //     positionCode (string): 库位编号 ,
    //     sku (string): sku ,
    //     type (integer): 类型 1:已装箱 2:未装箱 ,
    //     warehouseCode (string): 仓库编号 ,
    //     warehouseName (string): 仓库名称
    //     }
    function _post(context) {
        try {
            var firstCompany = getCompanyId("蓝深贸易有限公司")
            var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司")
            var thirdCompany = getCompanyId("广州蓝深科技有限公司")

            var damageedLocation = "damageLocation"
            var item = getItemId(context.sku)
            log.audit('item', item);
            if (!item) throw new Error('该SKU不存在NS系统')

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
            var inventoryQty = Number(context.num)
            //盘盈的情况 当前数量 小于 WMS转移数量  
            if (allAccount < inventoryQty) {
                throw new Error("当前可用库存小于报损数量，当前库存：" + allAccount + " 报损数量：" + inventoryQty)
            }
            //盘亏的情况 当前数量 大于 WMS库存数量
            if (allAccount > inventoryQty) {
                //剩余待调整数量
                var remainCount = inventoryQty
                var idArray = new Array()
                //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                if (firstCount > 0) {
                    var diffCount = firstCount
                    if (!firstLocation) throw new Error("蓝深贸易有限公司 对应旧库位不存在 库位编号：" + context.positionCode)
                    var toLocation = getLocationId(firstCompany, damageedLocation)
                    if (!toLocation) throw new Error("蓝深贸易有限公司 对应新库位不存在 库位编号：" + damageedLocation)
                    if (firstCount < remainCount) {
                        remainCount = remainCount - firstCount
                    } else {
                        diffCount = remainCount
                        remainCount = 0
                    }
                    var id = saveTransferOrder(firstCompany, item, firstLocation, toLocation, diffCount, context.fono)
                    idArray.push(id)
                }
                if (secondCount > 0 && remainCount > 0) {
                    var diffCount = secondCount
                    if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应旧库位不存在 库位编号：" + context.positionCode)
                    var toLocation = getLocationId(secondCompany, damageedLocation)
                    if (!toLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应新库位不存在 库位编号：" + damageedLocation)
                    if (secondCount < remainCount) {
                        remainCount = remainCount - secondCount
                    } else {
                        diffCount = remainCount
                        remainCount = 0
                    }
                    var id = saveTransferOrder(secondCompany, item, secondLocation, toLocation, diffCount, context.fono)
                    idArray.push(id)
                }
                if (remainCount > 0) {
                    var diffCount = remainCount
                    if (!thirdLocation) throw new Error("广州蓝深科技有限公司 对应库位不存在 库位编号：" + context.positionCode)
                    var toLocation = getLocationId(thirdCompany, damageedLocation)
                    if (!toLocation) throw new Error("广州蓝深科技有限公司 对应新库位不存在 库位编号：" + damageedLocation)
                    var id = saveTransferOrder(thirdCompany, item, thirdLocation, toLocation, diffCount, context.fono)
                    idArray.push(id)
                }
                var retjson = {
                    code: 0,
                    data: {}
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
    function saveTransferOrder(company, item, location, toLocation, diffCount, fono) {
        var rec = record.create({ type: 'transferorder', isDynamic: false });
        rec.setValue({ fieldId: 'subsidiary', value: company })
        rec.setValue({ fieldId: 'orderstatus', value: 'B' })
        rec.setValue({ fieldId: 'location', value: location })
        rec.setValue({ fieldId: 'transferlocation', value: toLocation })
        rec.setValue({ fieldId: 'custbody_dps_wms_damage_num', value: fono })
        rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: item, line: 0 });
        rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: diffCount, line: 0 });
        var id = rec.save();
        var itemf = record.transform({
            fromType: 'transferorder',
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: id
        });
        itemf.setValue({ fieldId: 'shipstatus', value: 'C' })
        itemf.save()
        var itemr = record.transform({
            fromType: 'transferorder',
            toType: 'itemreceipt',
            fromId: id
        });
        itemr.save()
        return id
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
