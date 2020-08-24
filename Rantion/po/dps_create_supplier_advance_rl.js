/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/search'], function(record, log, search) {

    function _get(context) {
        
    }

    function _post(context) {
        var result = {}, id;
        try{
            var advance_charge = record.load({ type: 'customrecord_supplier_advance_charge', id: context.id });
            if(advance_charge.getValue('custrecord_dps_amount')){
                var vendor_prepayment = record.create({ type: 'vendorprepayment' });
                vendor_prepayment.setValue({ fieldId: 'entity', value: advance_charge.getValue('custrecord_dps_supplier') });
                vendor_prepayment.setValue({ fieldId: 'account', value: advance_charge.getValue('custrecord_dps_bank_account') });
                vendor_prepayment.setValue({ fieldId: 'payment', value: advance_charge.getValue('custrecord_dps_amount') });
                vendor_prepayment.setValue({ fieldId: 'purchaseorder', value: advance_charge.getValue('custrecord_dps_purchase_order') });
                vendor_prepayment.setValue({ fieldId: 'department', value: advance_charge.getValue('custrecord_department') });
    
                vendor_prepayment.setValue({ fieldId: 'custbody_order_total', value: advance_charge.getValue('custrecord_order_total') });
                vendor_prepayment.setValue({ fieldId: 'custbody_amount_paid', value: advance_charge.getValue('custrecord_amount_paid') });
                vendor_prepayment.setValue({ fieldId: 'custbody_payments_date', value: advance_charge.getValue('custrecord_payment_date') });
                vendor_prepayment.setValue({ fieldId: 'custbody_dps_settlement_type1', value: advance_charge.getValue('custrecord_settlement_methods') });
                vendor_prepayment.setValue({ fieldId: 'custbody_custom_bill', value: context.id });
                id = vendor_prepayment.save();
                if(id){
                    var amount_paid = 0,payment_date;
                    log.debug('amount_paid',amount_paid);
                    search.create({
                        type: 'vendorprepayment',
                        filters: [
                            { name: 'custbody_custom_bill', operator: 'is', values: context.id },
                            { name: 'mainline', operator: 'is', values: false }
                        ]
                    }).run().each(function (result) {
                        log.debug('result.id',result.id);
                        var payment_data = record.load({ type: 'vendorprepayment', id: result.id });
                        log.debug('payment_data',payment_data);
                        amount_paid += Number(payment_data.getValue('payment'));
                        log.debug('amount_paid1',amount_paid);
                        payment_date = payment_data.getValue('trandate')
                        return true;
                    });
                    log.debug('amount_paid2',amount_paid);
                    advance_charge.setValue({ fieldId: 'custrecord_amount_paid', value: amount_paid });
                    advance_charge.setValue({ fieldId: 'custrecord_payment_date', value: payment_date });
                    advance_charge.setValue({ fieldId: 'custrecord_dps_amount', value: advance_charge.getValue('custrecord_dps_collection_amount') - amount_paid });
                    var charge_id = advance_charge.save();
                    if(!charge_id){
                        record.delete({
                            type : 'vendorprepayment',
                            id : id
                        });
                        result.code = 'error';
                        result.msg = '生成系统供应商预付款单后返写失败！';
                    }else{
                        result.code = 'success';
                        result.msg = '生成系统供应商预付款单成功！';
                    }
                }else{
                    result.code = 'error';
                    result.msg = '生成系统供应商预付款单成功！';
                }
            }else{
                result.code = 'error';
                result.msg = '未填写本次预付款金额！';
            }
        }catch(e){
            log.debug('e', e);
            result.code = 'error';
            result.msg = e.message;
            if(id){
                record.delete({
                    type : 'vendorprepayment',
                    id : id
                });
            }
        }
        return result;
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
