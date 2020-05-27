/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var companys = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var mySearch = search.create({
            type: 'subsidiary',
            filters: [
                { name: 'iselimination', operator: 'is', values: ['F'] },
                { name: 'parent', operator: 'isnotempty' }
            ],
            columns: [
                'internalid', 'name', 'city', 'state', 'country', 'currency'
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
            companys.push({
                'id': result.getValue('internalid'),
                'name': result.getValue('name'),
                'city': result.getValue('city'),
                'state': result.getValue('state'),
                'country': result.getValue('country'),
                'currency': result.getValue('currency')
            });
        });
        retjson.code = 0;
        retjson.data = companys;
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
