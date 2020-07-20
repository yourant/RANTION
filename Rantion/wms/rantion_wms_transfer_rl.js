/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'SuiteScripts/dps/common/api_util', 'N/record', 'SuiteScripts/dps/logistics/common/Moment.min'],
function (search, apiUtil, record, Moment) {

    function _get(context) {

    }
    
    // StockMoveRequestDto {
    //     boxtorageDto (StorageMoveBoxRequestDto): 整箱移库信息,
    //     skuStorageDto (StorageMoveSkuRequestDto): Sku移库信息
    // }
    // StorageMoveBoxRequestDto {
    //     barcode (string): 箱号,
    //     newPositionCode (string): 新库位,
    //     oldPositionCode (string): 旧库位
    // }
    // StorageMoveSkuRequestDto {
    //     barcode (string): 条码 装箱条码/SKU,
    //     newPosition (string): 新位置 库位或箱号,
    //     newBarcode (string): 新位置 库位或箱号,
    //     newType (integer): 类型 1:已装箱 2:未装箱
    //     positionCode (string): 旧库位,
    //     qty (integer): 数量,
    //     sku (string): SKU,
    //     type (integer): 类型 1:已装箱 2:未装箱
    // }
    function _post(context) {
        log.debug('context', JSON.stringify(context));
        try {
            // 移整箱
            if (context.boxtorageDto) {
                var barcode_id = getBarcodeId(context.boxtorageDto.barcode);
                var newPositionCode_id = getPositionId(context.boxtorageDto.newPositionCode);
                var oldPositionCode_id = getPositionId(context.boxtorageDto.oldPositionCode);
                var filters = [];
                filters.push({ name: 'custrecord_id_location_detail', operator: 'anyof', values: oldPositionCode_id });
                filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: barcode_id });
                filters.push({ name: 'custrecord_id_type', operator: 'is', values: 3 });
                search.create({
                    type: 'customrecord_inventory_detail',
                    filters: filters
                }).run().each(function (rec) {
                    record.submitFields({
                        type: 'customrecord_inventory_detail',
                        id: rec.id,
                        values: {
                            custrecord_id_location_detail: newPositionCode_id
                        }
                    });
                    return true;
                });
            }
            // 移库
            if (context.skuStorageDto) {
                var type = context.skuStorageDto.type;
                var oldPositionCode_id = getPositionId(context.skuStorageDto.positionCode);
                var newPosition_id = getPositionId(context.skuStorageDto.newPosition);
                var newBarcode_id;
                if (context.skuStorageDto.newBarcode) {
                    var newBarcode_id = getPositionId(context.skuStorageDto.newBarcode);
                }
                var qty = Number(context.skuStorageDto.qty);
                var sku = context.skuStorageDto.sku;
                var filters = [];
                filters.push({ name: 'custrecord_id_location_detail', operator: 'anyof', values: oldPositionCode_id });
                filters.push({ name: 'name', join: 'custrecord_id_sku', operator: 'is', values: sku });
                // 箱内
                if (type == 1) {
                    var barcode_id = getBarcodeId(context.skuStorageDto.barcode);
                    filters.push({ name: 'custrecord_id_type', operator: 'is', values: 3 });
                    filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: barcode_id });
                }
                // 箱外
                if (type == 2) {
                    filters.push({ name: 'custrecord_id_type', operator: 'is', values: 2 });
                    filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: ['@NONE@'] });
                }
                var haveQuantity = 0;
                var details = [];
                search.create({
                    type: 'customrecord_inventory_detail',
                    filters: filters,
                    columns: [ 'custrecord_id_location', 'custrecord_id_quantiy' ]
                }).run().each(function (rec) {
                    details.push(rec);
                    haveQuantity = haveQuantity + Number(rec.getValue('custrecord_id_quantiy'));
                    return true;
                });
                if (haveQuantity < qty) {
                    var retjson = {
                        code: 2,
                        msg: '库存不足，请确认后再做操作'
                    }
                    return JSON.stringify(retjson);
                }
                for (var index = 0; index < details.length; index++) {
                    var detail = details[index];
                    var location = detail.getValue('custrecord_id_location');
                    var quantiy = Number(detail.getValue('custrecord_id_quantiy'));
                    var ggqty = qty - quantiy;
                    if (ggqty >= 0) {
                        qty = ggqty;
                        record.submitFields({
                            type: 'customrecord_inventory_detail',
                            id: detail.id,
                            values: {
                                custrecord_id_location_detail: newPosition_id,
                                custrecord_id_location_box: newBarcode_id
                            }
                        });
                        if (ggqty == 0) {
                            break;
                        }
                    }
                    if (ggqty < 0) {
                        var gg = quantiy - qty;
                        record.submitFields({
                            type: 'customrecord_inventory_detail',
                            id: detail.id,
                            values: {
                                // custrecord_id_location_detail: newPosition_id,
                                // custrecord_id_location_box: newBarcode_id,
                                custrecord_id_quantiy: gg
                            }
                        });
                        var filtersAA = [];
                        filtersAA.push({ name: 'custrecord_id_location_detail', operator: 'anyof', values: newPosition_id });
                        filtersAA.push({ name: 'name', join: 'custrecord_id_sku', operator: 'is', values: sku });
                        if (newBarcode_id) {
                            var barcode_id = getBarcodeId(context.skuStorageDto.barcode);
                            filters.push({ name: 'custrecord_id_type', operator: 'is', values: 3 });
                            filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: newBarcode_id });
                        } else {
                            filters.push({ name: 'custrecord_id_type', operator: 'is', values: 2 });
                            filters.push({ name: 'custrecord_id_location_box', operator: 'anyof', values: ['@NONE@'] });
                        }
                        var newDetail_id, qqqquantity;
                        search.create({
                            type: 'customrecord_inventory_detail',
                            filters: filtersAA,
                            columns: [ 'custrecord_id_quantiy' ]
                        }).run().each(function (rec) {
                            newDetail_id = rec.id;
                            qqqquantity = rec.getValue('custrecord_id_quantiy');
                            return false;
                        });
                        if (newDetail_id) {
                            var tt = qqqquantity + qty;
                            record.submitFields({
                                type: 'customrecord_inventory_detail',
                                id: newDetail_id,
                                values: {
                                    custrecord_id_quantiy: tt
                                }
                            });
                        } else {
                            var detail_rec = record.create({ type: 'customrecord_inventory_detail', isDynamic: true });
                            detail_rec.setValue({ fieldId: 'custrecord_id_sku', value: sku });
                            detail_rec.setValue({ fieldId: 'custrecord_id_location', value: location });
                            detail_rec.setValue({ fieldId: 'custrecord_id_location_detail', value: newPosition_id });
                            detail_rec.setValue({ fieldId: 'custrecord_id_location_box', value: newBarcode_id });
                            detail_rec.setValue({ fieldId: 'custrecord_id_quantiy', value: qty });
                            detail_rec.setValue({ fieldId: 'custrecord_id_type', value: newBarcode_id ? 3 : 2 });
                            detail_rec.save();
                        }
                        break;
                    }
                }
            }
            var retjson = {
                code: 0,
                msg: '操作成功'
            }
            return JSON.stringify(retjson);
        } catch (e) {
            var retjson = {
                code: 1,
                msg: e.message
            }
            return JSON.stringify(retjson);
        }
    }

    function getPositionId(positionCode) {
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
        return position_id;
    }

    function getBarcodeId(barcode) {
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
        return barcode_id;
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
