/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/ui/serverWidget', 'N/search'], function (log, record, serverWidget, search) {



    function beforeLoad(context) {

    }

    function beforeSubmit(context) { }

    function afterSubmit(context) {
        var bf_cur = context.newRecord;

        var purchaseorder_id = bf_cur.getValue('purchaseorder');

        if (!purchaseorder_id) {
            return;
        }
        //purchaseorder
        //获取对应采购订单
        var p_record = record.load({
            type: 'purchaseorder',
            id: purchaseorder_id
        });

        //获取原预付总金额
        var o_payment = Number(p_record.getValue('custbody_dps_actualprepaidamount'));

        //获取现预付金额
        var n_payment = Number(bf_cur.getValue('payment'));

        //仅用于修改，原预付金额
        var o_cur_payment = 0;
        var new_payment;
        if (context.type == 'delete') {
            new_payment = o_payment - n_payment;
        } else if (context.type == 'edit') {
            //获取原预付金额
            o_cur_payment = Number(context.oldRecord.getValue('payment'));
            log.error('o_cur_payment', o_cur_payment);
            log.error('o_payment', o_payment);
            log.error('n_payment', n_payment);
            new_payment = o_payment - o_cur_payment + n_payment;
            log.error('new_payment', new_payment);
        } else if (context.type == 'create') {
            new_payment = o_payment + n_payment;
        }

        p_record.setValue({
            fieldId: 'custbody_dps_actualprepaidamount',
            value: new_payment,
        });

        log.error('n_payment-befor-save', new_payment);

        p_record.save({
            ignoreMandatoryFields: true
        });
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});