/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 13:42:44
 * @LastEditTime   : 2020-06-08 15:06:55
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_out_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {

    function _get(context) {

    }

    function _post(context) {
        var j_context = context;
        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';
        var sourceType = j_context.sourceType;
        if (sourceType == 10) {
            var sourceNo = j_context.sourceNo;
            var weight = j_context.weight ? Number(j_context.weight) : 0;
            var recId, redSo;
            search.create({
                type: 'customrecord_dps_shipping_small_record',
                filters: [
                    { name: 'custrecord_dps_ship_order_number', operator: 'startswith', values: sourceNo }
                ],
                columns: [ 'custrecord_dps_ship_small_salers_order' ]
            }).run().each(function (rec) {
                recId = rec.id;
                redSo = rec.getValue('custrecord_dps_ship_small_salers_order');
            });
            if (redSo && recId) {
                try {
                    record.submitFields({
                        type: 'customrecord_dps_shipping_small_record',
                        id: recId,
                        values: {
                            custrecord_dps_ship_small_status: 6,
                            custrecord_dps_ship_small_wms_info: JSON.stringify(context),
                            custrecord_dps_ship_small_real_weight: weight
                        }
                    });
                    var d = { message: 'NS 处理成功' };
                    retjson.code = 0;
                    retjson.data = d;
                    retjson.msg = 'success';
                } catch (error) {
                    var d = { message: 'NS 处理失败, 请稍后重试' };
                    retjson.code = 3;
                    retjson.data = d;
                    retjson.msg = 'error';
                }
            }
        }

        if (sourceType == 20) {
            //  获取对应退货授权单
            var sourceNo = j_context.sourceNo;
            var v_id = sourceNo.split('-')[0];
            var w_code = sourceNo.split('-')[1];
            //  获取对应供应商退货审批单
            var v_record = record.load({ id: v_id, type: 'vendorreturnauthorization' });
            var item_count = v_record.getLineCount({ sublistId: 'item' });
            //  出库成功
            if (j_context.delivery) {
                //  根据来源单号后的物理仓库与退货单行上对应location匹配出原退货授权单中的ns_item        
                var item_wms = [];
                for (var i = 0; i < item_count; i++) {
                    //  获取item的NS location
                    var ns_location = v_record.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                    //  获取ns location对应记录的wms location
                    var wms_location;
                    search.create({
                        type: 'location',
                        filters: [
                            { name: 'internalid', operator: 'is', values: ns_location }
                        ],
                        columns: [ 'custrecord_dps_wms_location' ],
                    }).run().each(function (res) {
                        wms_location = res.getValue('custrecord_dps_wms_location');
                    });
                    if (w_code == wms_location) {
                        item_wms.push(i);
                    }
                }
                //获取退货授权单交易主体
                var subsidiary = v_record.getValue('subsidiary');
                //根据交易主体与回传地点获取对应location
                var storageList = j_context.storageList;
                var locations = [];
                storageList.forEach(function (item) {
                    //根据装箱类型获取WMS仓库编码
                    var custrecord_dps_wms_location = item.type == 1 ? item.barcode : item.positionCode;
                    search.create({
                        type: 'location',
                        filters: [
                            { name: 'subsidiary', operator: 'is', values: subsidiary }, 
                            { name: 'custrecord_dps_wms_location', operator: 'is', values: custrecord_dps_wms_location }
                        ],
                    }).run().each(function (res) {
                        locations.push({
                            item: item,
                            location: res.id
                        });
                    });
                });
                //根据location合并item
                var _locations = [];
                locations.forEach(function (item) {
                    if (typeof (_locations[item.location]) == 'undefined') {
                        _locations[item.location] = [];
                    }
                    _locations[item.location].push(item.item);
                });

                //根据合并后得loction转换对应得出库单
                var ifm_record = [];
                for (var _location in _locations) {
                    var ifm_record_item = record.transform({
                        fromType: 'vendorreturnauthorization',
                        fromId: Number(v_id),
                        toType: 'itemfulfillment'
                    });
                    //将转换出库单中所有提交项设置为false
                    for (var i = 0; i < item_count; i++) {
                        ifm_record_item.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i, value: false });
                    }
                    //将出库单中的所有出库地点设置成子项地点
                    for (var i = 0; i < item_count; i++) {
                        ifm_record_item.setSublistValue({ sublistId: 'item', fieldId: 'location', line: i, value: _location });
                    }
                    ifm_record.push({
                        record: ifm_record_item,
                        location: _location
                    });
                }
                //设置货品实施单的提交项并提交保存
                ifm_record.forEach(function (item_ifm_record) {
                    for (var i = 0; i < item_count; i++) {
                        //限定提交项属于改物理仓库
                        if (item_wms.indexOf(i) > -1) {
                            //获取该行的sku
                            var sku = item_ifm_record.record.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                            var itemid;
                            search.create({
                                type: 'item',
                                filters: [
                                    { name: 'internalid', operator: 'is', values: sku }
                                ],
                                columns: [ 'itemid' ]
                            }).run().each(function (res) {
                                itemid = res.getValue('itemid');
                            });
                            var items = _locations[item_ifm_record.location];
                            items.forEach(function (item) {
                                if (item.sku == itemid) {
                                    //设置提交项
                                    item_ifm_record.record.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', line: i, value: true });
                                    item_ifm_record.record.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: Number(item.qty) });
                                }
                            })

                        }
                    }
                    item_ifm_record.record.save();
                });
            }
            //出库失败
            else {
                for (var i = 0; i < item_count; i++) {
                    //获取item的NS location
                    var ns_location = v_record.getSublistValue({ sublistId: 'item', fieldId: 'location', line: i });
                    //获取ns location对应记录的wms location
                    var wms_location;
                    search.create({
                        type: 'location',
                        filters: [
                            { name: 'internalid', operator: 'is', values: ns_location }
                        ],
                        columns: [ 'custrecord_dps_wms_location' ]
                    }).run().each(function (res) {
                        wms_location = res.getValue('custrecord_dps_wms_location');
                    });
                    if (w_code == wms_location) {
                        //设置备注
                        v_record.setSublistValue({ sublistId: 'item', fieldId: 'description', line: i, value: '库存异常' });
                    }
                }
                v_record.save();
            }
        }
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