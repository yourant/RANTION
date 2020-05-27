/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/record'], function(log, record) {

    function _get(context) {

    }

    function _post(context) {

        var j_context = JSON.parse(context);

        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';

        //获取对应退货授权单
        var sourceNo = j_context.sourceNo;

        var v_id = sourceNo.split('-')[0];
        var w_code = sourceNo.split('-')[1];

        //获取对应供应商退货审批单
        var v_record = record.load({
            id: Number(v_id),
            type: "vendorreturnauthorization"
        });

        var ifm_record = [];

        if (v_record == null) {
            retjson.code = -2;
            retjson.msg = 'sourceNo无效';
            return JSON.stringify(retjson);
        }

        var item_count = v_record.getLineCount({ sublistId: 'item' });

        if (j_context.delivery) {
            //根据退货授权单中的item地址生成货品实施单
            for (var i = 0; i < item_count; i++) {
                var location = v_record.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                });
                if (typeof(ifm_record[location]) == 'undefined') {
                    ifm_record[location] = {
                        location: location,
                        record: record.transform({
                            fromType: 'vendorreturnauthorization',
                            fromId: Number(v_id),
                            toType: 'itemfulfillment'
                        }),
                        isAdd: false
                    };
                }
            }

            //将转换出库单中所有提交项设置为false
            ifm_record.forEach(function(item) {
                for (var i = 0; i < item_count; i++) {
                    item.record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        line: i,
                        value: false
                    });
                }
            });

        }
        //设置提交项
        for (var i = 0; i < item_count; i++) {
            //获取item的NS location
            var location = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: i
            });

            //获取location对应记录
            var v_location = record.load({
                type: 'location',
                id: location
            });

            //从location对应记录获取wms仓库编码
            var wms_location = v_location.getValue('custrecord_dps_wms_location');



            if (j_context.delivery) {
                if (wms_location == w_code) {
                    //设置提交项
                    ifm_record[location].record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: true,
                        line: i
                    });
                    ifm_record[location].isAdd = true
                }
            } else {
                //设置备注
                v_record.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: i,
                    value: '库存异常'
                });
            }
        }

        if (j_context.delivery) {
            ifm_record.forEach(function(item) {
                if (item.isAdd) {
                    item.record.save();
                }
            });
        } else {
            v_record.save();
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