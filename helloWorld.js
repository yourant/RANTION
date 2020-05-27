/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/log'], function(record, log) {

    function onRequest(context) {
        var j_context = {
            "delivery": true,
            "deliveryTime": "string",
            "sourceNo": "243-gzhdc",
            "sourceType": 0,
            "weight": 0
        };

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

        if (v_record == null) {
            retjson.code = -2;
            retjson.msg = 'sourceNo无效';
            return JSON.stringify(retjson);
        }

        var item_count = v_record.getLineCount({ sublistId: 'item' });

        if (j_context.delivery) {

            //根据供应商退货审批单生成货品实施情况单
            var ifm_record = record.transform({
                fromType: 'vendorreturnauthorization',
                fromId: Number(v_id),
                toType: 'itemfulfillment'
            });
        }

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

            //设置出库数量
            if (wms_location != w_code) {
                if (j_context.delivery) {
                    /*
                    ifm_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        line: i,
                        value: false
                    });
                    */
                    log.debug(i);
                }
            } else {
                if (!j_context.delivery) {
                    v_record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'description',
                        line: i,
                        value: '库存异常'
                    });
                }


            }

        }
        //return JSON.stringify(retjson);

        if (j_context.delivery) {
            __huey = ifm_record;
            log.debug('begin');
            ifm_record.save();
            log.debug('success');
        } else {
            log.debug('v', v_record);
            //v_record.save();
        }
    }

    return {
        onRequest: onRequest
    }
});