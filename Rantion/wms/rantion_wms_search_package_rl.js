/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    // params：{
    //     warehouseCode ：String // 仓库编号 可选 
    //     positionCode ：String // 库位编号 可选
    //     boxCode : String // 箱号 可选
    // }
    // result：{
    //     sku: string,
    //     qty: number //数量 
    // }
    function _post(context) {
        var warehouseCode = context.warehouseCode; // 仓库编号
        var positionCode = context.positionCode; // 库位编号
        var boxCode = context.boxCode; // 箱号
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量

        var locationType, searchKey;
        if (warehouseCode) {
            locationType = 1;
            searchKey = warehouseCode;
            if (positionCode) {
                locationType = 2;
                searchKey = positionCode;
                if (boxCode) {
                    locationType = 3;
                    searchKey = boxCode;
                }
            }
        }
        var filters = [];
        if (locationType) {
            filters.push({ name: 'custrecord_dps_wms_location', operator: 'is', values: searchKey });
            filters.push({ name: 'custrecord_wms_location_type', operator: 'is', values: locationType });
        }
        var ids = [];
        search.create({
            type: 'location',
            filters: filters,
            columns : [ 'internalid' ]
        }).run().each(function(result) {
            ids.push(result.getValue('internalid'));
            return true;
        });

        var skus = [];
        if (ids.length > 0) {
            var skups = {};
            var skupids = [];
            var mySearch = search.create({
                type: 'inventoryitem',
                filters: [{ name: 'internalid', join: 'inventorylocation', operator: 'anyof', values: ids }],
                columns : [ 'itemid', 'locationquantityonhand' ]
            });
            var pageData = mySearch.runPaged({
                pageSize: pageSize
            });
            var totalCount = pageData.count; // 总数
            if (totalCount > 0) {
                var pageCount = pageData.pageRanges.length; // 页数
                pageData.fetch({
                    index: Number(nowPage - 1)
                }).data.forEach(function (result) {
                    var item = result.getValue('itemid');
                    var num = Number(result.getValue('locationquantityonhand'));
                    var sku = skups[item];
                    if (sku) {
                        sku.qty = sku.qty + num;
                    } else {
                        var json = {};
                        json.sku = item;
                        json.qty = num;
                        skups[item] = json;
                        skupids.push(item);
                    }
                    return true;
                });
                for (var index = 0; index < skupids.length; index++) {
                    skus.push({
                        'sku': skups[skupids[index]].sku,
                        'qty': Number(skups[skupids[index]].qty)
                    });
                }
            }
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
