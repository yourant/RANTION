/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var sku = context.sku;
        var skus = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var filters = [];
        if (sku) {
            filters.push({ name: 'itemid', operator: 'is', values: sku });
        }
        var mySearch = search.create({
            type: 'item',
            filters : filters,
            columns: [
                'itemid', 'custitem_dps_ctype', 'custitem_dps_skuchiense', 'locationquantityonhand', 
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
            skus.push({
                'itemid': result.getValue('itemid'),
                'item_type': result.getValue('custitem_dps_ctype'),
                'item_name': result.getValue('custitem_dps_skuchiense'),
                'item_onhand': result.getValue('locationquantityonhand')
            });
        });
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
