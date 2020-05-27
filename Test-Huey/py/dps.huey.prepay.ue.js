/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/ui/serverWidget'], function(log, record, serverWidget) {

    function beforeLoad(context) {
        var bf_cur = context.newRecord;
        var form = context.form;

        //purchaseorder
        //获取对应采购订单
        var purchaseorder_id = bf_cur.getValue('purchaseorder');
        var p_record = record.load({
            type: 'purchaseorder',
            id: purchaseorder_id
        })

        var payment = p_record.getValue('custbody_dps_prepaymentamount');

        var field = form.addField({
            id: 'custpage_payment_file',
            label: '预付金额',
            type: serverWidget.FieldType.TEXT
        });

        field.defaultValue = payment;

        field.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var bf_cur = context.newRecord;
        var form = context.form;

        var purchaseorder_id = bf_cur.getValue('purchaseorder');
        //purchaseorder
        //获取对应采购订单
        var p_record = record.load({
            type: 'purchaseorder',
            id: purchaseorder_id
        });

        //获取原预付金额
        var o_payment = p_record.getValue('custbody_dps_actualprepaidamount');

        //获取现预付金额
        var n_payment = bf_cur.getValue('payment');

        if (context.type == 'delete') {
            n_payment = 0;
        }

        if (o_payment != n_payment || n_payment == 0) {
            p_record.setValue({
                fieldId: 'custbody_dps_actualprepaidamount',
                value: n_payment,
            });
            p_record.save();
        }




    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});