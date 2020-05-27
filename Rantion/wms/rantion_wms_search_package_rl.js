/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var positionCode = context.positionCode; // 库位编号
        var barCode = context.barCode; // 箱子条码
        var sku = context.sku; // SKU
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量

        if (!positionCode) {
            retjson.code = 1;
            retjson.data = [];
            retjson.msg = '缺少库位参数';
            retjson.totalCount = 0;
            retjson.pageCount = 0;
            retjson.nowPage = 1;
            retjson.pageSize = 1;
            return JSON.stringify(retjson);
        }

        var ids = [];
        var filters = [];
        if (!barCode) {
            search.create({
                type: 'location',
                filters: [
                    { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode }
                ],
                columns : [ 'internalid' ]
            }).run().each(function(result) {
                ids.push(result.getValue('internalid'));
            });
        } else {
            filters.push({ name: 'custrecord_dps_wms_location', operator: 'is', values: barCode });
        }
        filters.push({ name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location', operator: 'is', values: positionCode });
        filters.push({ name: 'custrecord_wms_location_type', operator: 'anyof', values: ['3'] });
        search.create({
            type: 'location',
            filters: filters,
            columns : [ 'internalid' ]
        }).run().each(function(result) {
            ids.push(result.getValue('internalid'));
        });

        var skups = {};
        var skupids = [];
        var skuss = {};
        var skusids = [];
        filters = [];
        filters.push({ name: 'internalid', join: 'inventorylocation', operator: 'anyof', values: ids });
        if (sku) {
            filters.push({ name: 'name', operator: 'is', values: sku });
        }
        var mySearch = search.create({
            type: 'inventoryitem',
            filters: filters,
            columns : [ 
                'itemid', 'custitem_dps_skuchiense', 'locationquantityonhand',
                { name: 'custrecord_dps_wms_location', join: 'inventorylocation' }, 
                { name: 'custrecord_dps_wms_location_name', join: 'inventorylocation' },
                { name: 'custrecord_wms_location_type', join: 'inventorylocation' }
            ]
        });

        var pageData = mySearch.runPaged({
            pageSize: pageSize
        });
        var totalCount = pageData.count; // 总数
        var pageCount = pageData.pageRanges.length; // 页数
        pageData.fetch({
            index: Number(nowPage - 1)
        }).data.forEach(function (result) {
            var type = result.getValue({ name: 'custrecord_wms_location_type', join: 'inventorylocation' });
            var item = result.getValue('itemid');
            var num = Number(result.getValue('locationquantityonhand'));
            if (type == 2) {
                var sku = skups[item];
                if (sku) {
                    sku.onhand = sku.onhand + num;
                } else {
                    var json = {};
                    json.itemcode = item;
                    json.itemname = result.getValue('custitem_dps_skuchiense');
                    json.code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'inventorylocation' });
                    json.name = result.getValue({ name: 'custrecord_dps_wms_location_name', join: 'inventorylocation' });
                    json.onhand = num;
                    skups[item] = json;
                    skupids.push(item);
                }
            } else if (type == 3) {
                var lcode = result.getValue({ name: 'custrecord_dps_wms_location', join: 'inventorylocation' });
                var key = item + '_' + lcode;
                var sku = skuss[key];
                if (sku) {
                    sku.onhand = sku.onhand + num;
                } else {
                    var json = {};
                    json.itemcode = item;
                    json.itemname = result.getValue('custitem_dps_skuchiense');
                    json.code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'inventorylocation' });
                    json.name = result.getValue({ name: 'custrecord_dps_wms_location_name', join: 'inventorylocation' });
                    json.onhand = num;
                    skuss[key] = json;
                    skusids.push(key);
                }
            }
            return true;
        });

        var skus = [];
        for (var index = 0; index < skupids.length; index++) {
            var json = {};
            var j = skups[skupids[index]];
            json.itemcode = j.itemcode;
            json.itemname = j.itemname;
            json.code = j.code;
            json.name = j.name;
            json.onhand = j.onhand;
            skus.push(json);
        }
        for (var index = 0; index < skusids.length; index++) {
            var json = {};
            var k = skuss[skusids[index]];
            json.itemcode = k.itemcode;
            json.itemname = k.itemname;
            json.code = k.code;
            json.name = k.name;
            json.onhand = k.onhand;
            skus.push(json);
        }

        retjson.code = 0;
        retjson.data = skus;
        retjson.msg = '查询成功';
        retjson.totalCount = totalCount;
        retjson.pageCount = pageCount;
        retjson.nowPage = nowPage;
        retjson.pageSize = pageSize;
        return JSON.stringify(retjson);
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
