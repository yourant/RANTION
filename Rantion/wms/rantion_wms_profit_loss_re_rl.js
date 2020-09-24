/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record', '../common/request_record'], function (search, apiUtil, record, requestRecord) {

    function _get(context) {

    }

    // params：{
    // barcode (string):条码 装箱条码/SKU ,
    // icno (string):盘点单单号 ,
    // lossesQty (integer):盘亏数量 ,
    // operator (string):操作人 ,
    // positionCode (string):库位编号 ,
    // sku (string):sku ,
    // surplusQty (integer): 盘盈数量,
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
        if (!context.requestBody || context.requestBody.length == 0) throw new Error('请求数据不合法');
        log.audit('context', context);
        var retjson = {};
        try {
            var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "库存盘点");
            if (requestRecordInfo) {
                retjson.code = 1;
                retjson.data = {
                    msg: 'NS 请求重复处理'
                }
                retjson.msg = 'failure';
            } else {
                var resultArray = new Array();
                var firstCompany = getCompanyId("蓝深贸易有限公司");
                var secondCompany = getCompanyId("广州蓝图创拓进出口贸易有限公司");
                var thirdCompany = getCompanyId("广州蓝深科技有限公司");

                var surplus = new Array();

                var firstCompanyData = new Array();
                var secondCompanyData = new Array();
                var thirdCompanyData = new Array();
                for (var i in context.requestBody) {
                    var parami = context.requestBody[i];
                    var item = getItemId(parami.sku);
                    var line = Number(i) + 1;
                    if (!item) throw new Error('第' + line + '行SKU不存在NS系统');
                    var positionCode = getPositionCodeID(parami.positionCode);
                    var barcode;
                    log.debug('parami.type',parami.type);
                    if(parami.type == 1){
                        barcode = getBarcodeID(parami.barcode);
                    }
                    //盘盈入库
                    if (parami.surplusQty > 0) {
                        var useType = stockUseType('盘盈入库');
                        if (!positionCode) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode);
                        if (!barcode) {
                            if(parami.type == 1){
                                barcode = createBarcode(parami.barcode);
                            }
                        }
                        surplus.push({
                            company: firstCompany,
                            item: item,
                            location: 2,
                            diffCount: parami.surplusQty,
                            useType: useType,
                            icno: parami.icno,
                            positionCode: positionCode,
                            barcode: barcode
                        })
                        resultArray.push({
                            icno: parami.icno,
                            barcode: parami.barcode,
                            surplusQty: parami.surplusQty,
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
                            diffCount: surplusData.diffCount,
                            positionCode: surplusData.positionCode,
                            barcode: surplusData.barcode
                        })
                    }
                    saveInventoryAdjust(surplus[0].company, surplus[0].useType, surplus[0].icno, surplusDataArray);
                }

                //获取三个主体下的总的数量
                var firstCount = 0;
                var secondCount = 0;
                var thirdCount = 0;
                if (positionCode) {
                    firstCount = getCount(item, 2, positionCode, barcode);
                    secondCount = getCount(item, 3, positionCode, barcode);
                    thirdCount = getCount(item, 1, positionCode, barcode);
                }
                log.debug('firstCount',firstCount);
                log.debug('secondCount',secondCount);
                log.debug('thirdCount',thirdCount);
                var allAccount = firstCount + secondCount + thirdCount;
                //盘亏出库
                if (parami.lossesQty > 0) {
                    if (allAccount >= parami.lossesQty) {
                        var useType = stockUseType('盘亏出库');
                        //剩余待调整数量
                        var remainCount = parami.lossesQty;
                        //如果第一个仓位当前量小于总的盈亏  先调整完这一部分
                        if (firstCount > 0) {
                            var diffCount = firstCount * -1
                            if (!positionCode) throw new Error("蓝深贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            if (firstCount < remainCount) {
                                remainCount = (remainCount - Math.abs(firstCount))
                            } else {
                                diffCount = remainCount * -1
                                remainCount = 0
                            }
                            firstCompanyData.push({
                                company: firstCompany,
                                item: item,
                                location: 2,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                positionCode: positionCode,
                                barcode: barcode ? barcode : ''
                            })
                        }
                        if (secondCount > 0 && remainCount > 0) {
                            var diffCount = secondCount * -1
                            if (!positionCode) throw new Error("广州蓝图创拓进出口贸易有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            if (secondCount < remainCount) {
                                remainCount = (remainCount - Math.abs(secondCount))
                            } else {
                                diffCount = remainCount * -1
                                remainCount = 0
                            }
                            secondCompanyData.push({
                                company: secondCompany,
                                item: item,
                                location: 3,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                positionCode: positionCode,
                                barcode: barcode ? barcode : ''
                            })
                        }
                        if (remainCount > 0) {
                            var diffCount = remainCount * -1
                            if (!positionCode) throw new Error("广州蓝深科技有限公司 对应库位不存在 库位编号：" + parami.positionCode)
                            thirdCompanyData.push({
                                company: thirdCompany,
                                item: item,
                                location: 1,
                                diffCount: diffCount,
                                useType: useType,
                                icno: parami.icno,
                                positionCode: positionCode,
                                barcode: barcode ? barcode : ''
                            })
                        }
                        resultArray.push({
                            icno: parami.icno,
                            barcode: parami.barcode,
                            surplusQty: 0,
                            lossesQty: parami.lossesQty,
                            positionCode: parami.positionCode,
                            sku: parami.sku,
                            type: parami.type
                        })
                    }
                }

                if (firstCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in firstCompanyData) {
                        var lossData = firstCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount,
                            positionCode: lossData.positionCode,
                            barcode: lossData.barcode
                        })
                    }
                    saveInventoryAdjust(firstCompanyData[0].company, firstCompanyData[0].useType, firstCompanyData[0].icno, lossDataArray)
                }
                if (secondCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in secondCompanyData) {
                        var lossData = secondCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount,
                            positionCode: lossData.positionCode,
                            barcode: lossData.barcode
                        })
                    }
                    saveInventoryAdjust(secondCompanyData[0].company, secondCompanyData[0].useType, secondCompanyData[0].icno, lossDataArray)
                }
                if (thirdCompanyData.length > 0) {
                    var lossDataArray = new Array()
                    for (var i in thirdCompanyData) {
                        var lossData = thirdCompanyData[i]
                        lossDataArray.push({
                            item: lossData.item,
                            location: lossData.location,
                            diffCount: lossData.diffCount,
                            positionCode: lossData.positionCode,
                            barcode: lossData.barcode
                        })
                    }
                    saveInventoryAdjust(thirdCompanyData[0].company, thirdCompanyData[0].useType, thirdCompanyData[0].icno, lossDataArray)
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

    //获取货品在库位或箱子上的数量
    function getCount(item, location_id, positionCode, barcode){
        var count = 0;
        var filters = [];
        filters.push({name: "custrecord_id_sku", operator: "anyof", values: item});
        filters.push({name: "custrecord_id_location", operator: "anyof", values: location_id});
        filters.push({name: "custrecord_id_location_detail", operator: "anyof", values: positionCode});
        if(barcode){
            filters.push({name: "custrecord_id_location_box", operator: "anyof", values: barcode});
        }
        log.debug('filters',filters);
        search.create({
            type: 'customrecord_inventory_detail',
            filters: filters,
            columns: [
                { name: 'custrecord_id_quantiy' }
            ]
        }).run().each(function (rec) {
            var nowCount = rec.getValue('custrecord_id_quantiy')
            count = nowCount ? Number(nowCount) : 0
            return true;
        });
        return count;
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
        return result;
    }

    //获取产品ID
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

    //获取领用类型ID
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
    function saveInventoryAdjust(subsidiary_type, account_type, icno, data) {
        var inventory_ord = record.create({ type: 'inventoryadjustment', isDynamic: false });
        inventory_ord.setValue({ fieldId: 'subsidiary', value: subsidiary_type });
        var account = getAccount(account_type);
        inventory_ord.setValue({ fieldId: 'account', value: account });
        inventory_ord.setValue({ fieldId: 'custbody_dps_check_inventory_no', value: icno });
        inventory_ord.setValue({ fieldId: 'custbody_stock_use_type', value: account_type });

        for (var i in data) {
            inventory_ord.setSublistValue({ sublistId: 'inventory', fieldId: 'item', value: data[i].item, line: i });
            inventory_ord.setSublistValue({ sublistId: 'inventory', fieldId: 'location', value: data[i].location, line: i });
            inventory_ord.setSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: data[i].diffCount, line: i });
            inventory_ord.setSublistValue({ sublistId: 'inventory', fieldId: 'custcol_location_bin', value: data[i].positionCode, line: i });
            inventory_ord.setSublistValue({ sublistId: 'inventory', fieldId: 'custcol_case_number', value: data[i].barcode, line: i });
        }
        return inventory_ord.save();
    }

    //获取对应的科目ID
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

    //获取库位ID
    function getPositionCodeID(code) {
        var BinId;
        search.create({
            type: 'customlist_location_bin',
            filters: [{
                name: 'name',
                operator: 'is',
                values: code
            },
            {
                name: 'isinactive',
                operator: 'is',
                values: false
            }, // 排除已经非活动的记录
            ]
        }).run().each(function (rec) {
            BinId = rec.id
        });
        return BinId || false;
    }

    //获取箱号ID
    function getBarcodeID(code) {
        var BinId;
        search.create({
            type: 'customlist_case_number',
            filters: [{
                name: 'name',
                operator: 'is',
                values: code
            },
            {
                name: 'isinactive',
                operator: 'is',
                values: false
            }, // 排除已经非活动的记录
            ]
        }).run().each(function (rec) {
            BinId = rec.id
        });
        return BinId || false;
    }

    //创建箱号
    function createBarcode(code) {
        var BinId;
        var bin = record.create({
            type: 'customlist_case_number'
        });
        bin.setValue({
            fieldId: 'name',
            value: code
        });
        BinId = bin.save();
        log.debug('BinId', BinId);
        return BinId || false;
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
