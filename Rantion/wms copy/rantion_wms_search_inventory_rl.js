/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define([], function() {

    function _get(context) {
        
    }

    function _post(context) {
        
    }

    function _put(context) {
        var skus = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var mySearch = search.create({
            type: 'item',
            columns: [
                'itemid', 'locationquantityavailable', 'inventorylocation'
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
                'locationquantityavailable': result.getValue('locationquantityavailable'),
                'inventorylocation': result.getValue('inventorylocation')
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

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});