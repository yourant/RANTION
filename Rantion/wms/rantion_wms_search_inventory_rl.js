/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function _get(context) {

    }

    function _post(context) {
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 50); // 每页数量
        pageSize = pageSize > 100 ? 100 : pageSize;
        var sku = context.sku;
        var warehouseCode = context.warehouseCode;
        var comjson = getCompany();
        var filters = [];
        filters.push({
            name: 'isinactive',
            join: 'inventoryLocation',
            operator: 'is',
            values: 'F'
        });
        filters.push({
            name: 'custrecord_dps_financia_warehous',
            join: 'inventoryLocation',
            operator: 'anyof',
            values: ['2']
        });
        filters.push({
            name: 'custrecord_wms_location_type',
            join: 'inventoryLocation',
            operator: 'anyof',
            values: ['1']
        });
        if (sku) {
            filters.push({
                name: 'name',
                operator: 'is',
                values: sku
            });
        }
        if (warehouseCode) {
            filters.push({
                name: 'custrecord_dps_wms_location',
                join: 'inventorylocation',
                operator: 'is',
                values: warehouseCode
            })
        }
        var mySearch = search.create({
            type: 'item',
            filters: filters,
            columns: ['name']
        });
        var pageData = mySearch.runPaged({
            pageSize: pageSize
        });
        var skus = [];
        var totalCount = pageData.count; // 总数
        if (totalCount > 0) {
            var skuAAAAids = [];
            var pageCount = pageData.pageRanges.length; // 页数
            pageData.fetch({
                index: Number(nowPage - 1)
            }).data.forEach(function (result) {
                skuAAAAids.push(result.id);
                return true;
            });
            var skusjson = {};
            var skusis = [];
            var filters = [];
            filters.push({
                name: 'isinactive',
                join: 'inventoryLocation',
                operator: 'is',
                values: 'F'
            });
            filters.push({
                name: 'custrecord_dps_financia_warehous',
                join: 'inventoryLocation',
                operator: 'anyof',
                values: ['2']
            });
            filters.push({
                name: 'custrecord_wms_location_type',
                join: 'inventoryLocation',
                operator: 'anyof',
                values: ['1']
            });
            filters.push({
                name: 'internalid',
                operator: 'anyof',
                values: skuAAAAids
            });
            if (warehouseCode) {
                filters.push({
                    name: 'custrecord_dps_wms_location',
                    join: 'inventorylocation',
                    operator: 'is',
                    values: warehouseCode
                })
            }
            search.create({
                type: 'item',
                filters: filters,
                columns: [
                    'name', 'custitem_dps_skuchiense', 'locationquantityonhand',
                    'locationquantitycommitted', 'locationquantityavailable', 'custitem_dps_picture',
                    'isinactive', 'custitem_dps_ctype',
                    {
                        name: 'subsidiary',
                        join: 'inventorylocation'
                    },
                    {
                        name: 'internalid',
                        join: 'inventorylocation'
                    },
                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'inventorylocation'
                    },
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'inventorylocation'
                    }
                ]
            }).run().each(function (result) {
                var sku = result.getValue('name');
                var warehouseName = result.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'inventorylocation'
                });
                var warehouseCode = result.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'inventorylocation'
                });
                var itemname = result.getValue('name');
                var qty = Number(result.getValue('locationquantityonhand'));
                var useQty = Number(result.getValue('locationquantityavailable'));
                var lockQty = Number(result.getValue('locationquantitycommitted'));
                var key = warehouseName + '_' + warehouseCode + '_' + itemname;
                var sku = skusjson[key];
                if (sku) {
                    sku.qty = sku.qty + qty;
                    sku.useQty = sku.useQty + useQty;
                    sku.lockQty = sku.lockQty + lockQty;
                } else {
                    var comid = comjson[result.getValue({
                        name: 'subsidiary',
                        join: 'inventorylocation'
                    })];
                    var skujo = {};
                    skujo.warehouseName = result.getValue({
                        name: 'custrecord_dps_wms_location_name',
                        join: 'inventorylocation'
                    }); // 仓库名称
                    skujo.warehouseCode = result.getValue({
                        name: 'custrecord_dps_wms_location',
                        join: 'inventorylocation'
                    }); // 仓库编码
                    skujo.sku = itemname; // SKU
                    skujo.productImageUrl = result.getValue('custitem_dps_picture'); // 图片
                    skujo.productTitle = result.getValue('custitem_dps_skuchiense'); // 产品名称
                    skujo.qty = qty; // 库内总库存
                    skujo.useQty = useQty; // 可用库存（未被锁定库存）
                    skujo.lockQty = lockQty; // 预留库存（锁定库存）
                    skujo.inQty = 0; // 调入中库存 // TODO
                    skujo.outQty = 0; // 调出中库存 // TODO
                    skujo.rantionTechnologyQty = comid == 2 ? Number(result.getValue('locationquantityonhand')) : 0; // 蓝深科技库存数量
                    skujo.rantionTradeQty = comid == 5 ? Number(result.getValue('locationquantityonhand')) : 0; // 蓝深贸易库存数量
                    skujo.productType = result.getText('custitem_dps_ctype'); // 货品类型
                    skujo.productStatus = result.getValue('isinactive') == true ? 'inactive' : 'active' // 货品状态
                    skusjson[key] = skujo;
                    skusis.push(key);
                }
                return true;
            });

            for (var index = 0; index < skusis.length; index++) {
                var itemsku = skusjson[skusis[index]];
                skus.push({
                    'warehouseName': itemsku.warehouseName, // 仓库名称
                    'warehouseCode': itemsku.warehouseCode, // 仓库编码
                    'sku': itemsku.sku, // SKU
                    'productImageUrl': itemsku.productImageUrl, // 图片
                    'productTitle': itemsku.productTitle, // 产品名称
                    'qty': itemsku.qty, // 库内总库存
                    'useQty': itemsku.useQty, // 可用库存（未被锁定库存）
                    'lockQty': itemsku.lockQty, // 预留库存（锁定库存）
                    'inQty': 0, // 调入中库存 // TODO
                    'outQty': 0, // 调出中库存 // TODO
                    'rantionTechnologyQty': itemsku.rantionTechnologyQty, // 蓝深科技库存数量
                    'rantionTradeQty': itemsku.rantionTradeQty, // 蓝深贸易库存数量
                    'productType': itemsku.productType, // 货品类型
                    'productStatus': itemsku.productStatus // 货品状态
                });
            }
        }


        // var locations = {};
        // var locationids = [];
        // var filters = [];
        // filters.push({ name: 'isinactive', join: 'inventoryLocation', operator: 'is', values: 'F' });
        // filters.push({ name: 'custrecord_wms_location_type', join: 'inventoryLocation', operator: 'anyof', values: ['2','3'] });
        // if (sku) {
        //     filters.push({ name: 'name', operator: 'is', values: sku });
        // }
        // var mySearch = search.create({
        //     type: 'item',
        //     filters: filters,
        //     columns: [ 'name' ]
        // });
        // var pageData = mySearch.runPaged({
        //     pageSize: pageSize
        // });
        // var totalCount = pageData.count; // 总数
        // var skuAAAAids = [];
        // var skus = [];
        // var skuids = [];
        // var comskus = {};
        // if (totalCount > 0) {
        //     var pageCount = pageData.pageRanges.length; // 页数
        //     pageData.fetch({
        //         index: Number(nowPage - 1)
        //     }).data.forEach(function (result) {
        //         skuAAAAids.push(result.getValue('name'));
        //         return true;
        //     });
        //     skuAAAAids.map(function (itemsku) {
        //         filters = [];
        //         filters.push({ name: 'isinactive', join: 'inventoryLocation', operator: 'is', values: 'F' });
        //         filters.push({ name: 'custrecord_wms_location_type', join: 'inventoryLocation', operator: 'anyof', values: ['2','3'] });
        //         filters.push({ name: 'name', operator: 'is', values: itemsku });
        //         search.create({
        //             type: 'item',
        //             filters: filters,
        //             columns: [
        //                 'name', 'custitem_dps_skuchiense', 'locationquantityonhand', 
        //                 'locationquantitycommitted', 'locationquantityavailable', 'custitem_dps_picture',
        //                 'isinactive', 'custitem_dps_ctype',
        //                 { name: 'subsidiary', join: 'inventorylocation' },
        //                 { name: 'custrecord_dps_warehouse_code', join: 'inventorylocation' },
        //                 { name: 'custrecord_dps_warehouse_name', join: 'inventorylocation' }
        //             ]
        //         }).run().each(function (result) {
        //             var itemid = result.getValue('name');
        //             var loc = result.getValue({ name: 'custrecord_dps_warehouse_code', join: 'inventorylocation' });
        //             var numonhand = Number(result.getValue('locationquantityonhand'));
        //             if (loc && numonhand > 0) {
        //                 var numcommitted = Number(result.getValue('locationquantitycommitted'));
        //                 var numavailable = Number(result.getValue('locationquantityavailable'));
        //                 var key = itemid + '_' + loc;
        //                 var comid = result.getValue({ name: 'subsidiary', join: 'inventorylocation' });
        //                 if (comid == 2 || comid == 5) {
        //                     var keycom = itemid + '_' + comid;
        //                     var comsku = comskus[keycom];
        //                     if (comsku) {
        //                         comsku.qty = comsku.qty + numonhand;
        //                     } else {
        //                         var json = {};
        //                         json.qty = numonhand;
        //                         comskus[keycom] = json;
        //                     }
        //                 }
        //                 var location = locations[key];
        //                 if (location) {
        //                     location.numonhand = location.numonhand + numonhand;
        //                     location.numcommitted = location.numcommitted + numcommitted;
        //                     location.numavailable = location.numavailable + numavailable;
        //                 } else {
        //                     var json = {};
        //                     json.item = itemid;
        //                     skuids.push(itemid);
        //                     json.comid = comid;
        //                     json.item_status = result.getValue('isinactive') == true ? 'inactive' : 'active';
        //                     json.item_type = result.getText('custitem_dps_ctype');
        //                     json.item_name = result.getValue('custitem_dps_skuchiense');
        //                     json.item_picture = result.getValue('custitem_dps_picture');
        //                     json.code = result.getValue({ name: 'custrecord_dps_warehouse_code', join: 'inventorylocation' });
        //                     json.name = result.getValue({ name: 'custrecord_dps_warehouse_name', join: 'inventorylocation' });
        //                     json.numonhand = numonhand;
        //                     json.numcommitted = numcommitted;
        //                     json.numavailable = numavailable;
        //                     locations[key] = json;
        //                     locationids.push(key);
        //                 }
        //             }
        //             return true;
        //         });
        //     });
        //     // search.create({ // TODO
        //     //     type: 'transferorder',
        //     //     filters: [],
        //     //     columns: [
        //     //         { name: "memo" }
        //     //     ]
        //     // }).run().each(function (result) {
        //     // });
        //     for (var index = 0; index < locationids.length; index++) {
        //         var json = {};
        //         var j = locations[locationids[index]];
        //         json.warehouseName = j.name; // 仓库名称
        //         json.warehouseCode = j.code; // 仓库编码
        //         json.sku = j.item; // SKU
        //         json.productImageUrl = j.item_picture; // 图片
        //         json.productTitle = j.item_name; // 产品名称
        //         json.qty = j.numonhand; // 库内总库存
        //         json.useQty = j.numavailable; // 可用库存（未被锁定库存）
        //         json.lockQty = j.numcommitted; // 预留库存（锁定库存）
        //         json.inQty = 0; // 调入中库存 // TODO
        //         json.outQty = 0; // 调出中库存 // TODO
        //         var comid = json.comid;
        //         var key = json.sku + '_' + comid;
        //         // 蓝深科技库存数量
        //         json.rantionTechnologyQty = comid == 2 ? comskus[key].qty : 0;
        //         // 蓝深贸易库存数量
        //         json.rantionTradeQty = comid == 5 ? comskus[key].qty : 0;
        //         json.productType = j.item_type; // 货品类型
        //         json.productStatus = j.item_status; // 货品状态
        //         skus.push(json);
        //     }
        // }
        retjson.code = 0;
        retjson.data = skus;
        retjson.msg = '查询成功';
        retjson.totalCount = totalCount;
        retjson.pageCount = pageCount;
        retjson.nowPage = nowPage;
        retjson.pageSize = pageSize;
        return JSON.stringify(retjson);
    }

    function getCompany() {
        var comjson = {};
        search.create({
            type: 'subsidiary',
            filters: [{
                    name: 'iselimination',
                    operator: 'is',
                    values: ['F']
                },
                {
                    name: 'parent',
                    operator: 'isnotempty'
                }
            ],
            columns: ['internalid', 'name']
        }).run().each(function (rec) {
            var namestr = rec.getValue('name').replace(/\s/g, '').split(':');
            comjson[namestr[namestr.length - 1]] = rec.getValue('internalid');
            return true;
        });
        return comjson;
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