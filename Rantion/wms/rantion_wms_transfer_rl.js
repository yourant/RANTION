/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record', 'SuiteScripts/dps/logistics/common/Moment.min'],
    function (search, apiUtil, record, Moment) {

        function _get(context) {

        }

        // params：{
        //     boxtorageDto (StorageMoveBoxRequestDto): 整箱移库信息 ,
        //     skuStorageDto (StorageMoveSkuRequestDto): Sku移库信息

        //     StorageMoveBoxRequestDto {
        //     barcode (string): 箱号 ,
        //     newPositionCode (string): 新库位 ,
        //     oldPositionCode (string): 旧库位
        //     }
        //     StorageMoveSkuRequestDto {
        //     barcode (string): 条码 装箱条码/SKU ,
        //     newPosition (string): 新位置 库位或箱号 ,
        //     positionCode (string): 旧库位编号 ,
        //     qty (integer): 数量 ,
        //     sku (string): SKU ,
        //     type (integer): 类型 1:已装箱 2:未装箱
        //     }
        //     }
        function _post(context) {
            log.audit('context', context);
            try {
                var firstCompany = getCompanyId("蓝深贸易有限公司")
                var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司")
                var thirdCompany = getCompanyId("广州蓝深科技有限公司")
                if (context.boxtorageDto) {
                    context = context.boxtorageDto
                    if (context.oldPositionCode == context.newPositionCode) throw new Error("新库位与旧库位相等")
                    var oldFirstPosition = getLocationId(firstCompany, context.oldPositionCode)
                    var oldSecondPosition = getLocationId(secondCompany, context.oldPositionCode)
                    var oldThirdPosition = getLocationId(thirdCompany, context.oldPositionCode)

                    if (!oldFirstPosition) throw new Error("蓝深贸易有限公司：旧库位不存在")
                    if (!oldSecondPosition) throw new Error("广州蓝图创拓进出口贸易有限公司：旧库位不存在")
                    if (!oldThirdPosition) throw new Error("广州蓝深科技有限公司：旧库位不存在")

                    var newFirstPosition = getLocationId(firstCompany, context.newPositionCode)
                    var newSecondPosition = getLocationId(secondCompany, context.newPositionCode)
                    var newThirdPosition = getLocationId(thirdCompany, context.newPositionCode)

                    log.audit('newFirstPosition', newFirstPosition);
                    log.audit('newSecondPosition', newSecondPosition);
                    log.audit('newThirdPosition', newThirdPosition);

                    if (!newFirstPosition) throw new Error("蓝深贸易有限公司：新库位不存在")
                    if (!newSecondPosition) throw new Error("广州蓝图创拓进出口贸易有限公司：新库位不存在")
                    if (!newThirdPosition) throw new Error("广州蓝深科技有限公司：新库位不存在")
                    // if (!newFirstPosition) newFirstPosition = createLocation(firstCompany, context.newPositionCode, "蓝贸" + context.newPositionCode)
                    // if (!newSecondPosition) newSecondPosition = createLocation(secondCompany, context.newPositionCode, "蓝图" + context.newPositionCode)
                    // if (!newThirdPosition) newThirdPosition = createLocation(thirdCompany, context.newPositionCode, "蓝深" + context.newPositionCode)

                    var firstLocation = getBoxLocationId(firstCompany, context.barcode, oldFirstPosition, 'F')
                    var secondLocation = getBoxLocationId(secondCompany, context.barcode, oldSecondPosition, 'F')
                    var thirdLocation = getBoxLocationId(thirdCompany, context.barcode, oldThirdPosition, 'F')

                    log.audit('firstLocation', firstLocation);
                    log.audit('secondLocation', secondLocation);
                    log.audit('thirdLocation', thirdLocation);

                    if (!firstLocation && !secondLocation && !thirdLocation) throw new Error("旧库位箱号不存在")
                    // if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司：旧库位箱号不存在")
                    // if (!thirdLocation) throw new Error("广州蓝深科技有限公司：旧库位箱号不存在")

                    var newFirstLocation = getBoxLocationId(firstCompany, context.barcode, newFirstPosition)
                    var newSecondLocation = getBoxLocationId(secondCompany, context.barcode, newSecondPosition)
                    var newThirdLocation = getBoxLocationId(thirdCompany, context.barcode, newThirdPosition)


                    log.audit('newFirstLocation', newFirstLocation);
                    log.audit('newSecondLocation', newSecondLocation);
                    log.audit('newThirdLocation', newThirdLocation);

                    // if (!newFirstLocation) throw new Error("蓝深贸易有限公司：新库位箱号不存在")
                    // if (!newSecondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司：新库位箱号不存在")
                    // if (!newThirdLocation) throw new Error("广州蓝深科技有限公司：新库位箱号不存在")

                    if (!newFirstLocation) newFirstLocation = createLocation(firstCompany, context.barcode, "蓝贸箱子" + context.barcode, newFirstPosition)
                    if (!newSecondLocation) newSecondLocation = createLocation(secondCompany, context.barcode, "蓝图箱子" + context.barcode, newSecondPosition)
                    if (!newThirdLocation) newThirdLocation = createLocation(thirdCompany, context.barcode, "蓝深箱子" + context.barcode, newThirdPosition)


                    var firstBox;
                    if (firstLocation) {
                        firstBox = getBoxSku(firstLocation)
                    }
                    var secondBox;
                    if (secondLocation) {
                        secondBox = getBoxSku(secondLocation);
                    }
                    var thirdBox;
                    if (thirdLocation) {
                        thirdBox = getBoxSku(thirdLocation);
                    }

                    log.audit('firstBox', firstBox);
                    log.audit('secondBox', secondBox);
                    log.audit('thirdBox', thirdBox);

                    if (firstBox && firstBox.length > 0)
                        saveTransferOrderBox(firstCompany, firstLocation, newFirstLocation, firstBox, getParentLocationId(firstCompany, context.oldPositionCode))
                    if (secondBox && secondBox.length > 0)
                        saveTransferOrderBox(secondCompany, secondLocation, newSecondLocation, secondBox, getParentLocationId(firstCompany, context.oldPositionCode))
                    if (thirdBox && thirdBox.length > 0)
                        saveTransferOrderBox(thirdCompany, thirdLocation, newThirdLocation, thirdBox, getParentLocationId(firstCompany, context.oldPositionCode))

                    disableLocation(firstLocation)
                    disableLocation(secondLocation)
                    disableLocation(thirdLocation)

                    var retjson = {
                        code: 0,
                        data: {}
                    }
                    return JSON.stringify(retjson);
                }
                //单个SKU的情况
                if (context.skuStorageDto) {
                    context = context.skuStorageDto
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
                    var inventoryQty = Number(context.qty)
                    //盘盈的情况 当前数量 小于 WMS转移数量  
                    if (allAccount < inventoryQty) {
                        throw new Error("当前可用库存小于移库数量，当前库存：" + allAccount + " 移库数量：" + inventoryQty)
                    }
                    //盘亏的情况 当前数量 大于等于 WMS库存数量
                    if (allAccount >= inventoryQty) {
                        //剩余待调整数量
                        var remainCount = inventoryQty
                        var idArray = new Array()
                        //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                        if (firstCount > 0) {
                            var diffCount = firstCount
                            if (!firstLocation) throw new Error("蓝深贸易有限公司 对应旧库位不存在 库位编号：" + context.positionCode)
                            var toLocation = getLocationId(firstCompany, context.newPosition)
                            if (!toLocation) throw new Error("蓝深贸易有限公司 对应新库位不存在 库位编号：" + context.newPosition)
                            if (firstCount < remainCount) {
                                remainCount = remainCount - firstCount
                            } else {
                                diffCount = remainCount
                                remainCount = 0
                            }
                            var id = saveTransferOrder(firstCompany, item, firstLocation, toLocation, diffCount, getParentLocationId(firstCompany, context.positionCode))
                            idArray.push(id)
                        }
                        if (secondCount > 0 && remainCount > 0) {
                            var diffCount = secondCount
                            if (!secondLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应旧库位不存在 库位编号：" + context.positionCode)
                            var toLocation = getLocationId(secondCompany, context.newPosition)
                            if (!toLocation) throw new Error("广州蓝图创拓进出口贸易有限公司 对应新库位不存在 库位编号：" + context.newPosition)
                            if (secondCount < remainCount) {
                                remainCount = remainCount - secondCount
                            } else {
                                diffCount = remainCount
                                remainCount = 0
                            }
                            var id = saveTransferOrder(secondCompany, item, secondLocation, toLocation, diffCount, getParentLocationId(secondCompany, context.positionCode))
                            idArray.push(id)
                        }
                        if (remainCount > 0) {
                            var diffCount = remainCount
                            if (!thirdLocation) throw new Error("广州蓝深科技有限公司 对应库位不存在 库位编号：" + context.positionCode)
                            var toLocation = getLocationId(thirdCompany, context.newPosition)
                            if (!toLocation) throw new Error("广州蓝深科技有限公司 对应新库位不存在 库位编号：" + context.newPosition)
                            var id = saveTransferOrder(thirdCompany, item, thirdLocation, toLocation, diffCount, getParentLocationId(thirdCompany, context.positionCode))
                            idArray.push(id)
                        }
                        var retjson = {
                            code: 0,
                            data: {}
                        }
                        return JSON.stringify(retjson);
                    }
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
        function saveTransferOrder(company, item, location, toLocation, diffCount, parentLocation) {
            var price;
            search.create({
                type: 'item',
                filters: [
                    { name: 'internalid', operator: 'is', values: item },
                    { name: 'inventorylocation', operator: 'anyof', values: location }
                ],
                columns: ['locationaveragecost']
            }).run().each(function (rec) {
                price = rec.getValue('locationaveragecost');
            });

            var rec = record.create({ type: 'transferorder', isDynamic: false });
            rec.setValue({ fieldId: 'subsidiary', value: company })
            rec.setValue({ fieldId: 'orderstatus', value: 'B' })
            rec.setValue({ fieldId: 'custbody_dps_transferor_type', value: '4' })
            rec.setValue({ fieldId: 'location', value: location })
            rec.setValue({ fieldId: 'custbody_dps_start_location', value: parentLocation })
            rec.setValue({ fieldId: 'transferlocation', value: toLocation })
            rec.setValue({ fieldId: 'custbody_dps_end_location', value: toLocation })
            rec.setValue({ fieldId: 'useitemcostastransfercost', value: true })
            rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: item, line: 0 });
            rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: diffCount, line: 0 });
            if (price) {
                log.audit('saveTransferOrder price', price);
                rec.setSublistValue({ sublistId: 'item', fieldId: 'rate', value: price, line: 0 });
            }
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


        //保存数据
        function saveTransferOrderBox(company, location, toLocation, data, parentLocation) {
            log.audit('saveTransferOrderBox begin');
            log.audit('saveTransferOrderBox arr', company + '-' + location + '-' + toLocation + '-' + data + '-' + parentLocation);
            var rec = record.create({ type: 'transferorder', isDynamic: false });
            rec.setValue({ fieldId: 'subsidiary', value: company })
            rec.setValue({ fieldId: 'orderstatus', value: 'B' })
            rec.setValue({ fieldId: 'custbody_dps_transferor_type', value: '4' })
            rec.setValue({ fieldId: 'location', value: location })
            rec.setValue({ fieldId: 'custbody_dps_start_location', value: parentLocation })
            rec.setValue({ fieldId: 'transferlocation', value: toLocation })
            rec.setValue({ fieldId: 'custbody_dps_end_location', value: toLocation })
            rec.setValue({ fieldId: 'useitemcostastransfercost', value: true })
            for (var i in data) {
                var price;
                search.create({
                    type: 'item',
                    filters: [
                        { name: 'internalid', operator: 'is', values: data[i].item },
                        { name: 'inventorylocation', operator: 'anyof', values: location }
                    ],
                    columns: ['locationaveragecost']
                }).run().each(function (rec) {
                    price = rec.getValue('locationaveragecost');
                });
                if (price) {
                    log.audit('saveTransferOrder price', price);
                    rec.setSublistValue({ sublistId: 'item', fieldId: 'rate', value: price, line: i });
                }

                rec.setSublistValue({ sublistId: 'item', fieldId: 'item', value: data[i].item, line: i });
                rec.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: data[i].count, line: i });
            }
            var id;
            try {
                id = rec.save();
            } catch (error) {
                log.audit('saveTransferOrderBox save1', error);
            }

            var itemf = record.transform({
                fromType: 'transferorder',
                toType: record.Type.ITEM_FULFILLMENT,
                fromId: id
            });
            itemf.setValue({ fieldId: 'shipstatus', value: 'C' })
            try {
                itemf.save()
            } catch (error) {
                log.audit('saveTransferOrderBox save2', error);
            }

            var itemr = record.transform({
                fromType: 'transferorder',
                toType: 'itemreceipt',
                fromId: id
            });
            itemr.save()
            log.audit('saveTransferOrderBox end');
            return id
        }

        function createLocation(companyId, locationCode, name, parent) {
            var rec = record.create({ type: 'location', isDynamic: false });
            rec.setValue({ fieldId: 'subsidiary', value: companyId })
            rec.setValue({ fieldId: 'custrecord_dps_wms_location', value: locationCode })
            rec.setValue({ fieldId: 'custrecord_dps_wms_location_name', value: locationCode })
            rec.setValue({ fieldId: 'custrecord_wms_location_type', value: '2' })
            if (parent) {
                rec.setValue({ fieldId: 'parent', value: parent })
                rec.setValue({ fieldId: 'custrecord_wms_location_type', value: '3' })
            }
            rec.setValue({ fieldId: 'name', value: name })
            var id = rec.save();
            return id;
        }

        function disableLocation(id) {
            if (!id) {
                return;
            }
            record.submitFields({
                type: 'location',
                id: id,
                values: {
                    isinactive: 'T'
                }
            });
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
            var result
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

        //获取子箱子 
        function getBoxLocationId(companyId, barcode, parent, active) {
            var result
            var filters = [
                { name: 'subsidiary', operator: 'is', values: companyId },
                { name: 'custrecord_dps_wms_location', operator: 'is', values: barcode },
                { name: 'custrecord_dps_parent_location', operator: 'is', values: parent },
                { name: 'custrecord_wms_location_type', operator: 'is', values: '3' }
            ]
            if (active) filters.push({ name: 'isinactive', operator: 'is', values: active })
            search.create({
                type: 'location',
                filters: filters,
                columns: [
                    { name: 'internalId' },
                    { name: 'isinactive' },
                ]
            }).run().each(function (rec) {
                result = rec.id
                if (rec.getValue('isinactive')) {
                    record.submitFields({
                        type: 'location',
                        id: rec.id,
                        values: {
                            isinactive: 'F'
                        }
                    });
                }
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

        //获取某箱子下的SKU汇总
        function getBoxSku(location) {
            var boxSkuArray = new Array()
            search.create({
                type: 'item',
                filters: [
                    { name: 'locationquantityonhand', operator: 'GREATERTHAN', values: 0 },
                    { name: 'inventorylocation', operator: 'is', values: location }
                ],
                columns: [
                    { name: 'locationquantityonhand' }
                ]
            }).run().each(function (rec) {
                boxSkuArray.push({
                    item: rec.id,
                    count: rec.getValue('locationquantityonhand')
                })
                return true;
            });
            return boxSkuArray
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
