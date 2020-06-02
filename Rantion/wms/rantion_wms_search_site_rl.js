/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var sitess = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var name = context.name;
        var filters = [];
        if (name) {
            filters.push({ name: 'name', operator: 'is', value: name });
        }
        var mySearch = search.create({
            type: 'customrecord_aio_amazon_global_sites',
            filters: filters,
            columns: [
                'internalid', 'name', 'custrecord_aio_amazon_region', 'custrecord_aio_amazon_website', 
                'custrecord_aio_amazon_mws_endpoint', 'custrecord_aio_amazon_marketplace',
                'custrecord_aio_amazon_marketplace_id', 'custrecord_aio_amazon_currency',
                'custrecord_aio_amazon_site_timezone'
            ]
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
                sitess.push({
                    'id': result.getValue('internalid'),
                    'name': result.getValue('name'),
                    'region': result.getValue('custrecord_aio_amazon_region'),
                    'website': result.getValue('custrecord_aio_amazon_website'),
                    'endpoint': result.getValue('custrecord_aio_amazon_mws_endpoint'),
                    'marketplace': result.getValue('custrecord_aio_amazon_marketplace'),
                    'marketplace_id': result.getValue('custrecord_aio_amazon_marketplace_id'),
                    'currency': result.getValue('custrecord_aio_amazon_currency'),
                    'timezone': result.getValue('custrecord_aio_amazon_site_timezone')
                });
            });
        }
        retjson.code = 0;
        retjson.data = sitess;
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
