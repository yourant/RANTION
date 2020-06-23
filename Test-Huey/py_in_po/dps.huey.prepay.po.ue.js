/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/ui/serverWidget', 'N/http', 'N/search'], function(log, record, serverWidget, http, search) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        if (context.type == "create") {
            var bf_cur = record.load({ type: 'purchaseorder', id: context.newRecord.id });
            //获取供应商id
            var entity_id = bf_cur.getValue('entity');
            var prepaidratio = '';
            search.create({
                type: 'vendor',
                filters: [
                    { name: 'internalid', operator: 'is', values: Number(entity_id) }
                ],
                columns: ['custentity_dps_prepaidratio']
            }).run().each(function(res) {
                prepaidratio = res.getValue('custentity_dps_prepaidratio').replace('%', '');
                return false;
            });
            if (prepaidratio != '') {
                bf_cur.setValue({ fieldId: 'custbody_dps_prepaidratio', value: Number(prepaidratio) });
                //计算并设置预付金额
                var o_payment = bf_cur.getValue('total');
                var n_payment = o_payment * prepaidratio / 100.0;
                bf_cur.setValue({ fieldId: 'custbody_dps_prepaymentamount', value: n_payment });
                bf_cur.save({ ignoreMandatoryFields: true });
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});