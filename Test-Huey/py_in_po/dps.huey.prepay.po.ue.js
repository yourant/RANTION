/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/ui/serverWidget', 'N/http', 'N/search'], function(log, record, serverWidget, http, search) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {



        //设置货品对应sku
        //获取订单子项个数
        /*
        var new_record_count = bf_cur.getLineCount({ sublistId: 'item' });

        log.debug('new_record_count:', new_record_count);
        for (var i = 0; i < new_record_count; i++) {
            var itemid = bf_cur.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            log.debug('itemid:', itemid);

            var sku = '';
            search.create({
                type: 'customrecord_dps_amazon_seller_sku',
                filters: [{
                    name: 'custrecord_dps_amazon_ns_sku',
                    operator: 'anyof',
                    values: itemid
                }],
                columns: ['custrecord_dps_amazon_sku_number']
            }).run().each(function(rec) {
                sku = rec.getValue('custrecord_dps_amazon_sku_number')
                log.debug('sku', sku);
            })

            if (sku != '') {
                bf_cur.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_dps_trans_order_item_sku',
                    line: i,
                    value: sku
                });
            }

        }
        */



    }

    function afterSubmit(context) {
        if (context.type == 'create') {
            var bf_cur = record.load({
                type: context.newRecord.type,
                id: context.newRecord.id
            });
            //获取供应商id
            var entity_id = bf_cur.getValue('entity');
            log.debug('entity_id:', entity_id);

            var prepaidratio = '';
            search.create({
                type: 'vendor',
                filters: [{
                    "name": "internalid",
                    "operator": "is",
                    "values": Number(entity_id)
                }],
                columns: ["custentity_dps_prepaidratio"]
            }).run().each(function(res) {
                prepaidratio = res.getValue('custentity_dps_prepaidratio').replace('%', '');
            })

            if (prepaidratio != '') {
                log.error('prepaidratio:', prepaidratio);
                bf_cur.setValue({
                    fieldId: 'custbody_dps_prepaidratio',
                    value: Number(prepaidratio),
                });

                //计算并设置预付金额
                var o_payment = bf_cur.getValue('total');
                log.debug('o_payment:', o_payment);
                var n_payment = o_payment * prepaidratio / 100.0;
                log.debug('n_payment:', n_payment);
                bf_cur.setValue({
                    fieldId: 'custbody_dps_prepaymentamount',
                    value: n_payment,
                });
                bf_cur.save({
                    ignoreMandatoryFields: true
                });
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});