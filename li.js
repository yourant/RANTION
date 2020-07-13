/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-16 20:40:05
 * @LastEditTime   : 2020-07-10 17:34:24
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \li.js
 * @可以输入预定的版权声明、个性签名、空行等
 */




/**
 * 搜索 TO 的货品和地点
 * @param {*} toId 
 */
function searchItemTo(toId) {

    var itemArr = [],
        Loca,
        limit = 3999;
    search.create({
        type: 'transferorder',
        filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: toId
            },
            {
                name: 'mainline',
                operator: 'is',
                values: false
            },
            {
                name: 'taxline',
                operator: 'is',
                values: false
            },

        ],
        columns: [
            "item", "location"
        ]
    }).run().each(function (rec) {
        itemArr.push(rec.getValue('item'));
        Loca = rec.getValue('location');
        return --limit > 0
    });

    var retObj = {
        Location: Loca,
        ItemArr: itemArr
    }

    return retObj || false;
}

/**
 * 搜索货品对应店铺的库存平均成本
 * @param {*} itemArr 
 * @param {*} Location 
 */
function searchItemAver(itemArr, Location) {
    var priceArr = [];
    search.create({
        type: 'item',
        filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: itemArr
            },
            {
                name: 'inventorylocation',
                operator: 'anyof',
                values: Location
            }
        ],
        columns: ['locationaveragecost', "averagecost", ]
    }).run().each(function (rec) {
        var it = {
            itemId: rec.id,
            averagecost: rec.getValue('averagecost')
        }
        priceArr.push(it);

        return true;
    });

    return priceArr || false;

}

/**
 * 设置 TO 货品行的 转让价格
 * @param {*} toId 
 * @param {*} valArr 
 */
function setToValue(toId, valArr) {

    var toRec = record.load({
        type: 'transferorder',
        id: toId,
        isDynamic: false,
    });

    var cLine = toRec.getLineCount({
        sublistId: "item"
    });

    for (var i = 0, len = valArr.length; i < len; i++) {

        var t = valArr[i];

        var lineNumber = toRec.findSublistLineWithValue({
            sublistId: 'item',
            fieldId: 'item',
            value: t.itemId
        });
        toRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            value: t.averagecost,
            line: lineNumber
        });
    }

    var toRec_id = toRec.save({
        enableSourcing: true,
        ignoreMandatoryFields: true
    });
    log.debug('toRec_id', toRec_id);
}


/**
 * 履行调拨单
 * @param {*} recType 记录类型
 * @param {*} recId 记录ID
 */
function fulTranOrder(recType, recId) {

    var copyId = copyTransactionRec(recType, recId);
    log.debug('copyId', copyId);

    if (copyId) {

        var itful, itrec, recIdFul, itRec;
        var recIdFul = itemfulfillment(recId);
        log.debug('recIdFul', recIdFul);
        if (recIdFul) {
            itRec = itemreceipt(recIdFul);
            log.debug('itRec', itRec);
        }
        var itful = itemfulfillment(copyId);
        log.debug('itful', itful);
        if (itful) {
            itrec = itemreceipt(recId);
            log.debug('itrec', itrec);
        }

    }
}




function submitMapReduceDeployment() {

    var mapReduceScriptId = 'customscript_test_mapreduce_script';
    log.audit('mapreduce id: ', mapReduceScriptId);

    var mrTask = task.create({
        taskType: task.TaskType.MAP_REDUCE,
        scriptId: mapReduceScriptId,
        deploymentId: 'customdeploy_test_mapreduce_script'
    });

    var mrTaskId = mrTask.submit();

}



[{
    "aono": "6730",
    "boxNo": "001",
    "detailModels": [{
        "asin": "",
        "boxNo": "001",
        "fnsku": "",
        "msku": "",
        "productCode": "",
        "productImageUrl": "",
        "productTitle": "",
        "productType": 10,
        "qty": 10,
        "sku": "903014"
    }],
    "height": 50.00,
    "length": 50.00,
    "weight": 5.00,
    "width": 50.00
}]





/**
 * 复制一个单据, 并设置相关相关字段的值
 * @param {String} recType 记录类型
 * @param {Number} recId 记录Id
 * @returns {*} objRecordId || false, 若新记录ID存在, 返回新纪录ID, 否则返回 false
 */
function copyTransactionRec(recType, recId) {

    var newLocation, newTLocation, objRecordId;
    var objRecord = record.copy({
        type: recType,
        id: recId,
        isDynamic: true,
        // defaultValues: {
        //     entity: 107
        // }
    });

    search.create({
        type: recType,
        filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            },
            {
                name: 'mainline',
                operator: 'is',
                values: true
            },
            // {
            //     name: 'taxline',
            //     operator: 'is',
            //     values: true
            // }
        ],
        columns: [
            "location", // FROM LOCATION
            "transferlocation", // TO LOCATION
            "custbody_actual_target_warehouse", // 实际目标仓库
        ]
    }).run().each(function (r) {
        newLocation = r.getValue('transferlocation');
        newTLocation = r.getValue('custbody_actual_target_warehouse');
    });


    log.debug('newLocation', newLocation);
    log.debug('newTLocation', newTLocation);
    if (newLocation && newTLocation && newLocation != newTLocation) {
        objRecord.setValue({
            fieldId: 'location',
            value: newLocation
        });
        objRecord.setValue({
            fieldId: 'transferlocation',
            value: newTLocation
        });

        objRecordId = objRecord.save();
        log.debug('objRecordId', objRecordId);
    }

    return objRecordId || false;
}




// var s = "FBA 纸箱编号 1，共 5 个纸箱 - 22.49 磅\n目的地：\nFBA: Kohree LLC\nAmazon.com Services, Inc.\n33333 LBJ FWY\nDallas, TX 75241-7203\n美国\n发货地：\nNextrox\nGuangdong - Guangzhou - 510000\nRoom 605, 9# dongan yuan dongjiao north road\n中国\nUSFBA20200416K-KOHREE-2\nFBA15LX19SCGU000001\nHY0061-HM-FBA\n数量 9\nFBA 纸箱编号 2，共 5 个纸箱 - 22.49 磅\n目的地：\nFBA: Kohree LLC\nAmazon.com Services, Inc.\n33333 LBJ FWY\nDallas, TX 75241-7203\n美国\n发货地：\nNextrox\nGuangdong - Guangzhou - 510000\nRoom 605, 9# dongan yuan dongjiao north road\n中国\nUSFBA20200416K-KOHREE-2\nFBA15LX19SCGU000002\nHY0061-HM-FBA\n数量 9\nFBA 纸箱编号 3，共 5 个纸箱 - 22.49 磅\n目的地：\nFBA: Kohree LLC\nAmazon.com Services, Inc.\n33333 LBJ FWY\nDallas, TX 75241-7203\n美国\n发货地：\nNextrox\nGuangdong - Guangzhou - 510000\nRoom 605, 9# dongan yuan dongjiao north road\n中国\nUSFBA20200416K-KOHREE-2\nFBA15LX19SCGU000003\nHY0061-HM-FBA\n数量 9\nFBA 纸箱编号 4，共 5 个纸箱 - 22.49 磅\n目的地：\nFBA: Kohree LLC\nAmazon.com Services, Inc.\n33333 LBJ FWY\nDallas, TX 75241-7203\n美国\n发货地：\nNextrox\nGuangdong - Guangzhou - 510000\nRoom 605, 9# dongan yuan dongjiao north road\n中国\nUSFBA20200416K-KOHREE-2\nFBA15LX19SCGU000004\nHY0061-HM-FBA\n数量 9\nFBA 纸箱编号 5，共 5 个纸箱 - 22.49 磅\n目的地：\nFBA: Kohree LLC\nAmazon.com Services, Inc.\n33333 LBJ FWY\nDallas, TX 75241-7203\n美国\n发货地：\nNextrox\nGuangdong - Guangzhou - 510000\nRoom 605, 9# dongan yuan dongjiao north road\n中国\nUSFBA20200416K-KOHREE-2\nFBA15LX19SCGU000005\nHY0061-HM-FBA\n数量 9\n"

function getShipToAddr(str) {

    var ShipToAddress = {};

    var newArr = [];
    var a = s.split("FBA:");

    var b = a[1];
    var c = b.split("发货地");
    var d = c[0].split("\n");



    for (var i = 0, len = d.length; i < len; i++) {
        if (d[i] == "" || d[i] == undefined || d[i] == null) {
            continue;
        }
        newArr.push(d[i].trim());
    }

    ShipToAddress.destination = c[0];
    ShipToAddress.destinationArr = newArr;

    var si = newArr[newArr.length - 2];
    s2 = si.split(",");

    return newArr || false;
}


var wmsField = [{
        id: "logisticsChannelCode",
        ns: '物流渠道服务编号'
    },
    {
        id: "logisticsChannelName",
        ns: "物流渠道服务名称"
    },
    {
        id: "logisticsProviderCode",
        ns: "物流渠道商编号"
    },
    {
        id: "logisticsProviderName",
        ns: "物流渠道商名称"
    },
    {
        id: "sourceNo",
        ns: "来源单号"
    },
    {
        id: "sourceType",
        ns: '来源类型'
    },
    {
        id: "warehouseCode",
        ns: 'warehouseCode'
    },
    {
        id: "warehouseName",
        ns: "仓库名称"
    }
];

var skuField = [{
        id: "productImageUrl",
        ns: "图片路径"
    },
    {
        id: "productTitle",
        ns: "产品标题"
    },
    {
        id: "qty",
        ns: "出库数量"
    },
    {
        id: "sku",
        ns: "sku"
    }
];


/**
 * 判断特定对象中是否含有数组中的某些值
 * @param {Object} object 
 * @param {Array} valueArr 
 */
function ObjectValue(object, valueArr) {
    var objEmpty = [];
    valueArr.forEach(function (x) {
        if (object[x.id] != null && object[x.id] != "") {

        } else {
            objEmpty.push(x.ns);
        }
    });

    return objEmpty;
}




/**
 * 判断对象的值是不是全为空
 */
function objectValueAllEmpty(object) {
    var objArr = [];
    var isEmpty = true;
    Object.keys(object).forEach(function (x) {
        if (object[x] != null && object[x] != "") {
            isEmpty = false;
        } else {
            objArr.push(x)
        }
    });
    if (isEmpty) { //值全为空
        return true;
    }
    return false;
}


var it = {
    name: 'LI',
    age: ''
}



var it = {
    productImageUrl: "图片路径",
    productTitle: "产品标题",
    qty: "",
    sku: "",
}

function toRecord(recType) {
    var output = url.resolveRecord({
        recordType: recType,
        recordId: 6,
        isEditMode: true
    });

    var a = output.split("&id=");
    var url = a[0];

    return url || false;
}




//生成货品收据
function createItemReceipt(po_id, item) {
    var objRecord = record.transform({
        fromType: 'purchaseorder',
        fromId: po_id,
        toType: 'itemreceipt'
    });
    var subsidiary = objRecord.getValue('subsidiary');
    var count = objRecord.getLineCount({
        sublistId: 'item'
    });

    var glo_positionCode;
    item.map(function (line) {
        for (var i = 0; i < count; i++) {
            var item_id = objRecord.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            var item_sku;
            var positionCode = line.detailRecordList[i].positionCode;
            var type = line.detailRecordList[i].type;
            var locationid, searchLocation;
            searchLocation = positionCode;
            // type (integer): 类型 1:已装箱 2:未装箱
            if (type == 1) { // 装箱搜索箱号
                searchLocation = line.detailRecordList[i].barcode;
            }

            search.create({
                type: 'location',
                filters: [{
                        name: 'custrecord_dps_wms_location',
                        operator: 'is',
                        values: searchLocation
                    },
                    {
                        name: 'subsidiary',
                        operator: 'is',
                        values: subsidiary
                    }
                ],
                columns: ['internalid']
            }).run().each(function (result) {
                locationid = result.getValue('internalid');
                return false;
            });

            if (!locationid && type) {

            }
            search.create({
                type: 'item',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: item_id
                }],
                columns: ['itemid']
            }).run().each(function (rec) {
                item_sku = rec.getValue('itemid');
            });
            objRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                value: locationid,
                line: i
            });
            if (item_sku == line.sku) {
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: line.shelvesQty,
                    line: i
                });
            }
        }
    });
    return objRecord.save();
}