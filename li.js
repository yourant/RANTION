/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-16 20:40:05
 * @LastEditTime   : 2020-06-17 10:11:33
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