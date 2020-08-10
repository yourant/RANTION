/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log', 'N/ui/serverWidget'], function (search, record, log, ui) {

    function beforeLoad(context) {
        if (context.type == 'create') {
            try {
                var newRecord = context.newRecord;
                var request = context.request;
                var bill_id = request.parameters.bill_id;
                if (bill_id) {
                    //获取采购订单信息
                    var soRec = record.load({ type: 'purchaseorder', id: bill_id });
                    var LineCount = soRec.getLineCount({ sublistId: 'item' });
                    var department_id;
                    for (var i = 0; i < LineCount; i++) {
                        if (soRec.getSublistValue({ sublistId: 'item', fieldId: 'department', line: i })) {
                            department_id = soRec.getSublistValue({ sublistId: 'item', fieldId: 'department', line: i })
                        }
                    }
                    //更新科目下拉选项
                    var form = context.form;
                    var field = form.getField({ id: 'custrecord_dps_bank_account' });
                    field.updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
                    var account_field = form.addField({
                        id: 'custpage_supplier_account',
                        type: ui.FieldType.SELECT,
                        label: '预付款银行科目'
                    });
                    account_field.isMandatory = true;
                    var account_list = [];
                    search.create({
                        type: 'account',
                        filters: [
                            { name: "subsidiary", operator: "anyof", values: soRec.getValue('subsidiary') },
                            { name: "type", operator: "anyof", values: 'Bank' },
                        ],
                        columns: ['name']
                    }).run().each(function (result) {
                        account_list.push({
                            id: result.id,
                            name: result.getValue('name')
                        })
                        return true;
                    });
                    var new_list = [];
                    for (var i = 0; i < account_list.length; i++) {
                        var name = account_list[i].name;
                        if (name.indexOf('CNY') > 0 || name.indexOf(' : ') == -1) {
                            new_list.push(account_list[i]);
                        }
                    }
                    if (new_list.length > 0) {
                        for (var i = 0; i < new_list.length; i++) {
                            account_field.addSelectOption({
                                value: new_list[i].id,
                                text: new_list[i].name
                            });
                        }
                    }
                    //赋值
                    newRecord.setValue({
                        fieldId: 'custrecord_dps_supplier',
                        value: soRec.getValue({ sublistId: 'item', fieldId: 'entity' })
                    });
                    newRecord.setValue({ fieldId: 'custrecord_dps_purchase_order', value: bill_id });

                    var purchaseorder_data = record.load({ type: 'purchaseorder', id: bill_id });
                    var total = purchaseorder_data.getValue('total');
                    var other_total = 0;
                    search.create({
                        type: 'customrecord_supplier_advance_charge',
                        filters: [
                            { name: 'custrecord_dps_purchase_order', operator: 'anyof', values: bill_id }
                        ],
                        columns: [
                            'custrecord_dps_collection_amount'
                        ]
                    }).run().each(function (result) {
                        other_total += Number(result.getValue('custrecord_dps_collection_amount'));
                        return true;
                    });
                    var total_qua = toDecimal(total - other_total);
                    if (total_qua < soRec.getValue('custbody_dps_prepaymentamount')) {
                        newRecord.setValue({ fieldId: 'custrecord_dps_collection_amount', value: total_qua });
                    }else{
                        newRecord.setValue({ fieldId: 'custrecord_dps_collection_amount', value: soRec.getValue('custbody_dps_prepaymentamount') });
                    }
                    newRecord.setValue({ fieldId: 'custrecord_dps_t_currency', value: soRec.getValue('currency') });
                    newRecord.setValue({ fieldId: 'custrecord_dps_exchange_rate', value: soRec.getValue('exchangerate') });
                    newRecord.setValue({ fieldId: 'custrecord_dps_advance_charge_time', value: soRec.getValue('trandate') });
                    newRecord.setValue({ fieldId: 'custrecord_dps_affiliated_subsidiary', value: soRec.getValue('subsidiary') });
                    newRecord.setValue({ fieldId: 'custrecord_department', value: department_id });
                }
            } catch (e) {
                log.debug('e', e);
            }
        }
    }

    function toDecimal(x) {  
        var f = parseFloat(x);  
        if (isNaN(f)) {  
            return;  
        }  
        f = Math.round(x*100)/100;  
        return f;  
    } 

    function beforeSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            try {
                newRecord.setValue({ fieldId: 'custrecord_dps_bank_account', value: newRecord.getValue('custpage_supplier_account') });
            } catch (e) {
                log.debug('e', e);
            }
        }
    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        if (context.type != 'delete' && newRecord.getValue('custrecord_dps_t_approval_status') == 6 && !newRecord.getValue('custrecord_related_prepayment')) {
            var vendor_prepayment_Id;
            try {
                var vendor_prepayment = record.create({ type: 'vendorprepayment' });
                vendor_prepayment.setValue({ fieldId: 'entity', value: newRecord.getValue('custrecord_dps_supplier') });
                vendor_prepayment.setValue({ fieldId: 'account', value: newRecord.getValue('custrecord_dps_bank_account') });
                vendor_prepayment.setValue({ fieldId: 'payment', value: newRecord.getValue('custrecord_dps_collection_amount') });
                vendor_prepayment.setValue({ fieldId: 'purchaseorder', value: newRecord.getValue('custrecord_dps_purchase_order') });
                vendor_prepayment.setValue({ fieldId: 'department', value: newRecord.getValue('custrecord_department') });
                vendor_prepayment.setValue({ fieldId: 'trandate', value: newRecord.getValue('custrecord_dps_advance_charge_time') });
                vendor_prepayment_Id = vendor_prepayment.save();
                if (vendor_prepayment_Id) {
                    var subId = record.submitFields({
                        type: newRecord.type,
                        id: newRecord.id,
                        values: {
                            custrecord_related_prepayment: vendor_prepayment_Id
                        }
                    });
                }
            } catch (e) {
                log.debug('e', e);
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});