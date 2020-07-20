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
        var barcode = context.boxCode; // 箱号
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量

        var filters = [];
        if (warehouseCode) {
            filters.push({ name: 'custrecord_dps_wms_location', join: 'custrecord_id_location', operator: 'is', values: warehouseCode });
        }
        if (positionCode) {
            var position_id;
            search.create({
                type: 'customlist_location_bin',
                filters: [
                    { name: 'name', operator: 'is', values: positionCode }
                ],
                columns: [ 'internalid' ]
            }).run().each(function (rec) {
                position_id = rec.id
                return false;
            });
            if (position_id) {
                filters.push({ name: 'custrecord_id_location_detail', operator: 'anyof', values: position_id });
            }
        }
        if (barcode) {
            var barcode_id;
            search.create({
                type: 'customlist_case_number',
                filters: [
                    { name: 'name', operator: 'is', values: barcode }
                ],
                columns: [ 'internalid' ]
            }).run().each(function (rec) {
                barcode_id = rec.id
                return false;
            });
            if (barcode_id) {
                filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: barcode_id });
            }
        }

        var mySearch = search.create({
            type: 'customrecord_inventory_detail',
            filters: filters,
            columns: [ 'custrecord_id_sku', 'custrecord_id_quantiy' ]
        });
        var skus = [];
        var pageData = mySearch.runPaged({
            pageSize: pageSize
        });
        var totalCount = pageData.count; // 总数
        var pageCount = pageData.pageRanges.length; // 页数
        if (totalCount > 0) {
            pageData.fetch({
                index: Number(nowPage - 1)
            }).data.forEach(function (result) {
                skus.push({
                    'sku': result.getText('custrecord_id_sku'),
                    'qty': Number(result.getValue('custrecord_id_quantiy'))
                });
                return true;
            });
        }


        // var locationType, searchKey;
        // if (warehouseCode) {
        //     locationType = 1;
        //     searchKey = warehouseCode;
        //     if (positionCode) {
        //         locationType = 2;
        //         searchKey = positionCode;
        //         if (boxCode) {
        //             locationType = 3;
        //             searchKey = boxCode;
        //         }
        //     }
        // }
        // var filters = [];
        // if (locationType) {
        //     filters.push({ name: 'custrecord_dps_wms_location', operator: 'is', values: searchKey });
        //     filters.push({ name: 'custrecord_wms_location_type', operator: 'is', values: locationType });
        // }
        // var ids = [];
        // search.create({
        //     type: 'location',
        //     filters: filters,
        //     columns : [ 'internalid' ]
        // }).run().each(function(result) {
        //     ids.push(result.getValue('internalid'));
        //     return true;
        // });

        // var skus = [];
        // if (ids.length > 0) {
        //     var skups = {};
        //     var skupids = [];
        //     var mySearch = search.create({
        //         type: 'inventoryitem',
        //         filters: [{ name: 'internalid', join: 'inventorylocation', operator: 'anyof', values: ids }],
        //         columns : [ 'itemid', 'locationquantityonhand' ]
        //     });
        //     var pageData = mySearch.runPaged({
        //         pageSize: pageSize
        //     });
        //     var totalCount = pageData.count; // 总数
        //     if (totalCount > 0) {
        //         var pageCount = pageData.pageRanges.length; // 页数
        //         pageData.fetch({
        //             index: Number(nowPage - 1)
        //         }).data.forEach(function (result) {
        //             var item = result.getValue('itemid');
        //             var num = Number(result.getValue('locationquantityonhand'));
        //             var sku = skups[item];
        //             if (sku) {
        //                 sku.qty = sku.qty + num;
        //             } else {
        //                 var json = {};
        //                 json.sku = item;
        //                 json.qty = num;
        //                 skups[item] = json;
        //                 skupids.push(item);
        //             }
        //             return true;
        //         });
        //         for (var index = 0; index < skupids.length; index++) {
        //             skus.push({
        //                 'sku': skups[skupids[index]].sku,
        //                 'qty': Number(skups[skupids[index]].qty)
        //             });
        //         }
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
