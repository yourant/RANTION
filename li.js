/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-16 20:40:05
 * @LastEditTime   : 2020-06-23 11:01:56
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \li.js
 * @可以输入预定的版权声明、个性签名、空行等
 */



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


function createBoxLocation(boxName, parentLocationId) {
    // 5   蓝深贸易有限公司
    // 3   广州蓝图创拓进出口贸易有限公司
    // 2   广州蓝深科技有限公司

    var subArr = [2, 3, 5];
    for ()

}