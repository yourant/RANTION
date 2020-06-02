/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    // params：{
    //     warehouseCode ：String //仓库编号 必传
    //     sku ：String //可选
    //     positionCode ：String //库位编号 可选
    //     barcode : String //箱号 可选
    // }
    // result：{
    //     warehouseCode ：String //仓库编号
    //     warehouseName ：String //仓库名称
    //     sku ：String
    //     type ：String //类型 1:箱内 2:箱外
    //     barcode ：String //条码 箱号/SKU （类型为1时，条码是箱号，为2是，条码是SKU）
    //     positionCode ：String //库位编号
    //     qty ：String //数量
    // }
    function _post(context) {
        var retjson = {};
        var nowPage = Number(context.page ? context.page : 1); // 查询页
        var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
        var warehouseCode = context.warehouseCode;
        var sku = context.sku;
        var positionCode = context.positionCode;
        var barcode = context.barcode;

        var filters = [];
        if (warehouseCode) {
            filters.push({ name: 'custrecord_dps_warehouse_code', operator: 'is', values: warehouseCode });
        }
        if (positionCode) {
            filters.push({ name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode });
        }
        if (barcode) {
            filters.push({ name: 'custrecord_dps_wms_location', operator: 'is', values: barcode });
            filters.push({ name: 'custrecord_wms_location_type', operator: 'anyof', values: [ '3' ] });
        } else {
            filters.push({ name: 'custrecord_wms_location_type', operator: 'anyof', values: [ '2', '3' ] });
        }
        filters.push({ name: 'isinactive', operator: 'is', values: 'F' });
        var ids = [];
        var locapare = {};
        var locaware = {};
        search.create({
            type: 'location',
            filters: filters,
            columns : [ 
                'internalid', 'custrecord_wms_location_type', 'custrecord_dps_wms_location',
                'custrecord_dps_warehouse_code', 'custrecord_dps_warehouse_name',
                { name: 'custrecord_wms_location_type', join: 'custrecord_dps_parent_location' },
                { name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' }
            ]
        }).run().each(function(result) {
            var id = result.getValue('internalid');
            ids.push(id);
            var code = result.getValue('custrecord_dps_wms_location');
            var type = result.getValue('custrecord_wms_location_type');
            var key = type + '_' + code;
            var json = {};
            json.wareCode = result.getValue('custrecord_dps_warehouse_code');
            json.wareName = result.getValue('custrecord_dps_warehouse_name');
            locaware[code] = json;
            locapare[key] = result.getValue({ name: 'custrecord_dps_wms_location', join: 'custrecord_dps_parent_location' });
            return true;
        });

        var filters = [];
        var skus = [];
        if (ids.length > 0) {
            filters.push({ name: 'internalid', join: 'inventorylocation', operator: 'anyof', values: ids });
            if (sku) {
                filters.push({ name: 'itemid', operator: 'is', values: sku });
            }
            filters.push({ name: 'locationquantityonhand', operator: 'greaterthanorequalto', values: ['0'] });
            var mySearch = search.create({
                type: 'inventoryitem',
                filters: filters,
                columns : [ 
                    'itemid', 'locationquantityonhand',
                    { name: 'custrecord_wms_location_type', join: 'inventorylocation' },
                    { name: 'custrecord_dps_wms_location', join: 'inventorylocation' }
                ]
            });
            var pageData = mySearch.runPaged({
                pageSize: pageSize
            });
            var totalCount = pageData.count; // 总数
            var pageCount = pageData.pageRanges.length; // 页数
            if (totalCount > 0) {
                var skups = {};
                var skupids = [];
                pageData.fetch({
                    index: Number(nowPage - 1)
                }).data.forEach(function (result) {
                    var locationtype = result.getValue({ name: 'custrecord_wms_location_type', join: 'inventorylocation' });
                    var code = result.getValue({ name: 'custrecord_dps_wms_location', join: 'inventorylocation' });
                    var wareCode = locaware[code].wareCode;
                    var wareName = locaware[code].wareName;
                    var sku = result.getValue('itemid');
                    var type = locationtype == 2 ? 2 : 1;
                    var barcode = type == 1 ? code : sku;
                    var keyyy = '3_' + code;
                    var positionCode = locationtype == 2 ? code : locapare[keyyy];
                    var qty = Number(result.getValue('locationquantityonhand'));
                    var key = sku + '_' + code;
                    var skuobj = skups[key];
                    if (skuobj) {
                        skuobj.qty = skuobj.qty + qty;
                    } else {
                        var json = {};
                        json.wareCode = wareCode;
                        json.wareName = wareName;
                        json.sku = sku;
                        json.type = type;
                        json.barcode = barcode;
                        json.positionCode = positionCode;
                        json.qty = qty;
                        skups[key] = json;
                        skupids.push(key);
                    }
                    return true;
                });
                for (var index = 0; index < skupids.length; index++) {
                    skus.push({
                        'warehouseCode': skups[skupids[index]].wareCode,
                        'warehouseName': skups[skupids[index]].wareName,
                        'sku': skups[skupids[index]].sku,
                        'type': skups[skupids[index]].type,
                        'barcode': skups[skupids[index]].barcode,
                        'positionCode': skups[skupids[index]].positionCode,
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
