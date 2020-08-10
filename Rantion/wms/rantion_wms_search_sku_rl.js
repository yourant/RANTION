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
        pageSize = pageSize > 1000 ? 1000 : pageSize;
        var filters = [];
        if (sku) {
            filters.push({ name: 'itemid', operator: 'is', values: sku });
        }
        var mySearch = search.create({
            type: 'item',
            filters : filters,
            columns: [
                'itemid', 'custitem_dps_ctype', 'custitem_dps_skuchiense', 
                // 'custitem_dps_division', 不明原因被删除
                'vendorname', 'custitem_dps_skuenglish', 'custitem_dps_skureferred',
                'custitem_dps_high', 'custitem_dps_long',
                'custitem_dps_wide', 
                // 'custitem_dps_weight', 
                'custitem_dps_picture',
                'custitem_dps_factory_inspe', 'custitem_dps_warehouse_check',
                'custitem_dps_group', 'stockunit'
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
                skus.push({
                    'sku': result.getValue('itemid'),
                    'productType': result.getText('custitem_dps_ctype'),
                    'productTitle': result.getValue('custitem_dps_skuchiense'),
                    'productUnit': result.getText('stockunit'),
                    'group': result.getText('custitem_dps_group'),
                    'division': '无对应字段',
                    'declarationCN': result.getValue('vendorname'),
                    'declarationUS': result.getValue('custitem_dps_skuenglish'),
                    'skureferred': result.getValue('custitem_dps_skureferred'),
                    'long': result.getValue('custitem_dps_long'),
                    'wide': result.getValue('custitem_dps_wide'),
                    'high': result.getValue('custitem_dps_high'),
                    // 'weight': result.getValue('custitem_dps_weight'),
                    // 'baseunit': result.getText('baseunit'),
                    'productImageUrl': result.getValue('custitem_dps_picture'),
                    'factoryInspe': result.getText('custitem_dps_factory_inspe'),
                    'warehouseCheck': result.getText('custitem_dps_warehouse_check')
                });
            });
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
