/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var fnskus = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var seller_sku = context.seller_sku;
        var sku = context.sku;
        var fnsku = context.fnsku;
        var asin = context.asin;
        var site = context.site;
        var filters = [];
        filters.push({ name: 'custrecord_ass_sku', operator: 'noneof', values: ['@NONE@'] });
        if (seller_sku) {
            filters.push({ name: 'name', operator: 'is', values: seller_sku });
        }
        if (sku) {
            filters.push({ name: 'itemid', join: 'custrecord_ass_sku', operator: 'is', values: sku });
        }
        if (fnsku) {
            filters.push({ name: 'custrecord_ass_fnsku', operator: 'is', values: fnsku });
        }
        if (asin) {
            filters.push({ name: 'custrecord_ass_asin', operator: 'is', values: asin });
        }
        if (site) {
            filters.push({ name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_ass_sellersku_site', operator: 'is', values: site });
        }
        var mySearch = search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: filters,
            columns: [
                'custrecord_ass_account', 'custrecord_ass_fnsku', 'custrecord_ass_asin',
                'custrecord_ass_sku', 'name',
                { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_ass_sellersku_site' }
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
                fnskus.push({
                    'seller_sku': result.getValue('name'),
                    'sku': result.getText('custrecord_ass_sku'),
                    'fnsku': result.getValue('custrecord_ass_fnsku'),
                    'asin': result.getValue('custrecord_ass_asin'),
                    'account': result.getText('custrecord_ass_account'),
                    'site': result.getText('custrecord_ass_sellersku_site')
                });
            });
        }
        retjson.code = 0;
        retjson.data = fnskus;
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
