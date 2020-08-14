/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record', '../common/request_record'], function (search, apiUtil, record, requestRecord) {

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
    function _post(requestData) {
        var context = requestData.requestBody;
        try {
            var requestRecordInfo = requestRecord.findRequestRecord(requestData.requestId, 1, "库存报损");
            if (requestRecordInfo) {
                retjson.code = 1;
                retjson.data = {
                    msg: 'NS 请求重复处理'
                }
                retjson.msg = 'failure'
            } else {


                var firstCompany = getCompanyId("蓝深贸易有限公司")
                var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司")
                var thirdCompany = getCompanyId("广州蓝深科技有限公司")

                if (!context.fono) throw new Error('请传递单号fono')
                //存在相应单号不做任何处理 返回成功信息给客户
                var exist = checkExist(context.fono)
                if (exist) return JSON.stringify({
                    code: 0,
                    data: {}
                });


                var damageedLocation = "damageLocation"
                var item = getItemId(context.sku)
                log.audit('item', item);
                if (!item) throw new Error('该SKU不存在NS系统')
                var firstLocation = getLocationId(firstCompany, context.warehouseCode)
                // var firstLocation = getLocationId(firstCompany, context.positionCode)
                var secondLocation = getLocationId(secondCompany, context.warehouseCode)
                var thirdLocation = getLocationId(thirdCompany, context.warehouseCode)
                log.audit('Location', firstLocation + '-' + secondLocation + '-' + thirdLocation);
                var firstCount = 0;
                var secondCount = 0;
                var thirdCount = 0;


                log.debug('firstLocation', firstLocation);
                log.debug('secondLocation', secondLocation);
                log.debug('thirdLocation', thirdLocation);

                if (firstLocation) {
                    firstCount = getCount(item, firstLocation)
                }
                if (secondLocation) {
                    secondCount = getCount(item, secondLocation)
                }
                if (thirdLocation) {
                    thirdCount = getCount(item, thirdLocation)
                }
                log.audit('Count', firstCount + '-' + secondCount + '-' + thirdCount);
                var allAccount = firstCount + secondCount + thirdCount
                var inventoryQty = Number(context.num)
                //盘盈的情况 当前数量 小于 WMS转移数量  
                if (allAccount < inventoryQty) {
                    throw new Error("当前可用库存小于报损数量，当前库存：" + allAccount + " 报损数量：" + inventoryQty)
                }
                //盘亏的情况 当前数量 大于 WMS库存数量
                if (allAccount >= inventoryQty) {
                    log.audit('allAccount > inventoryQty');
                    //剩余待调整数量
                    var remainCount = inventoryQty
                    var idArray = new Array()
                    //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                    if (firstCount > 0) {
                        var diffCount = firstCount
                        if (!firstLocation) throw new Error("蓝深贸易有限公司 对应仓库不存在 仓库编号：" + context.warehouseCode)
                        var toLocation = getLocationId(firstCompany, damageedLocation)
                        if (!toLocation) throw new Error("蓝深贸易有限公司 对应新仓库不存在 仓库编号：" + damageedLocation)
                        if (firstCount < remainCount) {
                            remainCount = remainCount - firstCount
                        } else {
                            diffCount = remainCount
                            remainCount = 0
                        }
                        var id = saveTransferOrder(firstCompany, item, firstLocation, toLocation, diffCount, context.fono, getParentLocationId(firstCompany, context.positionCode))
                        idArray.push(id)
                    }
                    if (secondCount > 0 && remainCount > 0) {
                        var diffCount = secondCount
                        if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应仓库不存在 仓库编号：" + context.warehouseCode)
                        var toLocation = getLocationId(secondCompany, damageedLocation)
                        if (!toLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应新仓库不存在 仓库编号：" + damageedLocation)
                        if (secondCount < remainCount) {
                            remainCount = remainCount - secondCount
                        } else {
                            diffCount = remainCount
                            remainCount = 0
                        }
                        var id = saveTransferOrder(secondCompany, item, secondLocation, toLocation, diffCount, context.fono, getParentLocationId(secondCompany, context.positionCode))
                        idArray.push(id)
                    }
                    if (remainCount > 0) {
                        var diffCount = remainCount
                        if (!thirdLocation) throw new Error("广州蓝深科技有限公司 对应仓库不存在 仓库编号：" + context.warehouseCode)
                        var toLocation = getLocationId(thirdCompany, damageedLocation)
                        if (!toLocation) throw new Error("广州蓝深科技有限公司 对应新仓库不存在 仓库编号：" + damageedLocation)
                        var id = saveTransferOrder(thirdCompany, item, thirdLocation, toLocation, diffCount, context.fono, getParentLocationId(thirdCompany, context.positionCode))
                        idArray.push(id)
                    }
                    var retjson = {
                        code: 0,
                        data: {}
                    }
                    requestRecord.saveRequestRecord(requestData.requestId, JSON.stringify(requestData.requestBody), JSON.stringify(retjson), 1, "库存报损");
                    return JSON.stringify(retjson);
                }
            }
        } catch (e) {
            var retjson = {
                code: 1,
                msg: e.message
            }
            log.audit('catch:', JSON.stringify(retjson));
            requestRecord.saveRequestRecord(requestData.requestId, JSON.stringify(requestData.requestBody), JSON.stringify(retjson), 2, "库存报损");
            return JSON.stringify(retjson);
        }
    }

    //保存数据
    function saveTransferOrder(company, item, location, toLocation, diffCount, fono, parentLocation) {
        var price;
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: item
                },
                {
                    name: 'inventorylocation',
                    operator: 'anyof',
                    values: location
                }
            ],
            columns: ['locationaveragecost']
        }).run().each(function (rec) {
            price = rec.getValue('locationaveragecost');
        });


        var rec = record.create({
            type: 'transferorder',
            isDynamic: false
        });
        rec.setValue({
            fieldId: 'subsidiary',
            value: company
        })
        rec.setValue({
            fieldId: 'orderstatus',
            value: 'B'
        })
        rec.setValue({
            fieldId: 'location',
            value: location
        })
        rec.setValue({
            fieldId: 'custbody_dps_start_location',
            value: parentLocation
        })
        rec.setValue({
            fieldId: 'custbody_dps_transferor_type',
            value: '6'
        })
        rec.setValue({
            fieldId: 'transferlocation',
            value: toLocation
        })
        rec.setValue({
            fieldId: 'custbody_dps_end_location',
            value: toLocation
        })
        rec.setValue({
            fieldId: 'custbody_dps_wms_damage_num',
            value: fono
        })
        rec.setValue({
            fieldId: 'useitemcostastransfercost',
            value: true
        })
        rec.setSublistValue({
            sublistId: 'item',
            fieldId: 'item',
            value: item,
            line: 0
        });
        rec.setSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: diffCount,
            line: 0
        });

        if (price) {
            log.audit('saveTransferOrder price', price);
            rec.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: price,
                line: 0
            });
        }

        var id = rec.save();
        var itemf = record.transform({
            fromType: 'transferorder',
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: id
        });
        itemf.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        })
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
            filters: [{
                name: 'namenohierarchy',
                operator: 'is',
                values: companyName
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

    function getItemId(sku) {
        var result
        search.create({
            type: 'item',
            filters: [{
                name: 'itemid',
                operator: 'is',
                values: sku
            }, ],
            columns: []
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取子公司的ID 
    function getLocationId(companyId, positionCode) {
        var result
        search.create({
            type: 'location',
            filters: [{
                    name: 'subsidiary',
                    operator: 'is',
                    values: companyId
                },
                {
                    name: 'custrecord_dps_wms_location',
                    operator: 'is',
                    values: positionCode
                }
            ],
            columns: [{
                name: 'internalId'
            }]
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
            filters: [{
                    name: 'internalId',
                    operator: 'is',
                    values: item
                },
                {
                    name: 'inventorylocation',
                    operator: 'is',
                    values: location
                }
            ],
            columns: [{
                name: 'locationquantityonhand'
            }]
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
            filters: [{
                    name: 'subsidiary',
                    operator: 'is',
                    values: companyId
                },
                {
                    name: 'custrecord_dps_wms_location',
                    operator: 'is',
                    values: positionCode
                },
                {
                    name: 'custrecord_wms_location_type',
                    operator: 'is',
                    values: '2'
                }
            ],
            columns: [{
                name: 'custrecord_dps_parent_location'
            }]
        }).run().each(function (rec) {
            log.audit('getParentLocationId result', JSON.stringify(rec))
            result = rec.getValue('custrecord_dps_parent_location')
            return false;
        });

        return result
    }

    function checkExist(fono) {
        var exist = false
        search.create({
            type: 'transferorder',
            filters: [{
                name: 'custbody_dps_wms_damage_num',
                operator: 'is',
                values: fono
            }, ],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function (rec) {
            exist = true
            return false;
        });
        return exist;
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