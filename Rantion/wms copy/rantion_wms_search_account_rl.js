/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var account = [];
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var mySearch = search.create({
            type: 'customrecord_aio_account',
            columns: [
                'name', 'internalid', 'custrecord_dps_platform_number', 'custrecord_dps_store_number', 'custrecord_dps_site',
                'custrecord_aio_marketplace', 'custrecord_aio_currency', 'custrecord_aio_subsidiary', 
                'custrecord_aio_eb_registered_county', 'custrecord_aio_fbaorder_location', 'custrecord_aio_salesorder_location', 
                'custrecord_aio_account_region', 'custrecord_aio_enabled_sites', 'custrecord_aio_seller_id', 
                'custrecord_aio_mws_auth_token', 'custrecord_aio_dev_account'
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
            account.push({
                'id': result.getValue('internalid'),
                'name': result.getValue('name'),
                'platform_number': result.getValue('custrecord_dps_platform_number'),
                'store_number': result.getValue('custrecord_dps_store_number'),
                'site': result.getValue('custrecord_dps_site'),
                'marketplace': result.getValue('custrecord_aio_marketplace'),
                'currency': result.getValue('custrecord_aio_currency'),
                'subsidiary': result.getValue('custrecord_aio_subsidiary'),
                'registered_county': result.getValue('custrecord_aio_eb_registered_county'),
                'fbaorder_location': result.getValue('custrecord_aio_fbaorder_location'),
                'salesorder_location': result.getValue('custrecord_aio_salesorder_location'),
                'account_region': result.getValue('custrecord_aio_account_region'),
                'enabled_sites': result.getValue('custrecord_aio_enabled_sites'),
                'seller_id': result.getValue('custrecord_aio_seller_id'),
                'auth_token': result.getValue('custrecord_aio_mws_auth_token'),
                'dev_account': result.getValue('custrecord_aio_dev_account')
            });
        });
        retjson.code = 0;
        retjson.data = account;
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
