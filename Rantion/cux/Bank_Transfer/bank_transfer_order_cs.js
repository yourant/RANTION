/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/ui/dialog', 'N/record', 'N/currency'],
function(search, dialog, record, currency) {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        var currentRecord = context.currentRecord;
        var base_account_id = currentRecord.getValue('custrecord_bto_base_account');
        if (!base_account_id) {
            dialog.alert({ title: '提示', message: '该子公司未维护本位币账户科目相关信息，请移至“数据对应关系-->银行转账配置表”中维护资料后再做操作。' });
            return false;
        }
        dialog.alert({ title: '提示', message: '此功能暂时无法为您自动生成转账单据，请联系系统管理员。' });
        return true;
    }

    function validateField(context) {
        var currentRecord = context.currentRecord;
        if (context.fieldId == 'custrecord_bto_from_account') {
            var from_account_id = currentRecord.getValue('custrecord_bto_from_account');
            var subsidiary_id, base_account_id, from_currency_id, base_currency_id;
            if (from_account_id) {
                var from_account_recrod = record.load({ type: 'account', id: from_account_id });
                subsidiary_id = from_account_recrod.getValue('subsidiary');
                from_currency_id = from_account_recrod.getValue('currency');
                // 子公司
                currentRecord.setValue({ fieldId: 'custrecord_bto_company', value: subsidiary_id });
                // 转出账户币别
                currentRecord.setValue({ fieldId: 'custrecord_bto_from_currency', value: from_currency_id });
                search.create({
                    type: 'customrecord_bank_transfer_configuration',
                    filters: [
                        { name: 'custrecord_btc_company', operator: 'anyof', values: subsidiary_id }
                    ],
                    columns: [ 'custrecord_btc_base_account', 'custrecord_btc_expense_account' ]
                }).run().each(function (result) {
                    base_account_id = result.getValue('custrecord_btc_base_account');
                    return false;
                });
                if (base_account_id) {
                    // 本位币账户科目
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_account', value: base_account_id });
                    var base_account_recrod = record.load({ type: 'account', id: base_account_id });
                    base_currency_id = base_account_recrod.getValue('currency');
                    // 本位币别
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_currency', value: base_currency_id });
                    var transaction_date = currentRecord.getValue('custrecord_bto_tran_date');
                    var from_exchangerate = getExchangerate(from_currency_id, base_currency_id, transaction_date);
                    // 转出账户与本位币汇率
                    currentRecord.setValue({ fieldId: 'custrecord_bto_exchangerate1', value: from_exchangerate });
                    var from_amount = Number(currentRecord.getValue('custrecord_bto_from_amount'));
                    var base_amount = 0;
                    if (from_amount > 0) {
                        base_amount = from_amount * from_exchangerate;
                    }
                    // 本位币金额
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_amount', value: base_amount });
                } else {
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_account', value: '' });
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_currency', value: '' });
                    currentRecord.setValue({ fieldId: 'custrecord_bto_exchangerate1', value: '' });
                    currentRecord.setValue({ fieldId: 'custrecord_bto_exchangerate2', value: '' });
                    currentRecord.setValue({ fieldId: 'custrecord_bto_base_amount', value: 0 });
                    currentRecord.setValue({ fieldId: 'custrecord_bto_to_amount', value: 0 });
                    dialog.alert({ title: '提示', message: '该子公司未维护本位币账户科目相关信息，请移至“数据对应关系-->银行转账配置表”中维护资料后再做操作。' });
                }
            }
        }
        if (context.fieldId == 'custrecord_bto_to_account') {
            var transaction_date = currentRecord.getValue('custrecord_bto_tran_date');
            var to_account_id = currentRecord.getValue('custrecord_bto_to_account');
            var to_account_recrod = record.load({ type: 'account', id: to_account_id });
            var to_currency_id = to_account_recrod.getValue('currency');
            // 转入账户币别
            currentRecord.setValue({ fieldId: 'custrecord_bto_to_currency', value: to_currency_id });
            var base_currency_id = currentRecord.getValue('custrecord_bto_base_currency');
            if (base_currency_id && to_currency_id && transaction_date) {
                var to_exchangerate = getExchangerate(base_currency_id, to_currency_id, transaction_date);
                currentRecord.setValue({ fieldId: 'custrecord_bto_exchangerate2', value: to_exchangerate });
                var base_amount = currentRecord.getValue('custrecord_bto_base_amount');
                var to_amount = 0;
                if (to_exchangerate > 0 && base_amount > 0) {
                    to_amount = base_amount * to_exchangerate;
                }
                currentRecord.setValue({ fieldId: 'custrecord_bto_to_amount', value: to_amount });
            }
        }
        if (context.fieldId == 'custrecord_bto_tran_date') {
            var transaction_date = currentRecord.getValue('custrecord_bto_tran_date');
            var from_currency_id  = currentRecord.getValue('custrecord_bto_from_currency');
            var base_currency_id = currentRecord.getValue('custrecord_bto_base_currency');
            if (from_currency_id && base_currency_id && transaction_date) {
                var from_exchangerate = getExchangerate(from_currency_id, base_currency_id, transaction_date);
                currentRecord.setValue({ fieldId: 'custrecord_bto_exchangerate1', value: from_exchangerate });
            }
        }
        if (context.fieldId == 'custrecord_bto_from_amount') {
            var from_exchangerate = Number(currentRecord.getValue('custrecord_bto_exchangerate1'));
            var to_exchangerate = Number(currentRecord.getValue('custrecord_bto_exchangerate2'));
            var from_amount = Number(currentRecord.getValue('custrecord_bto_from_amount'));
            var base_amount = 0;
            if (from_exchangerate > 0 && from_amount > 0) {
                base_amount = from_amount * from_exchangerate;
            }
            currentRecord.setValue({ fieldId: 'custrecord_bto_base_amount', value: base_amount });
            var to_amount = 0;
            if (to_exchangerate > 0 && base_amount > 0) {
                to_amount = base_amount * to_exchangerate;
            }
            currentRecord.setValue({ fieldId: 'custrecord_bto_to_amount', value: to_amount });
        }
        return true;
    }

    /**
     * 获取货币汇率
     * @param {*} source 
     * @param {*} target 
     * @param {*} date 
     */
    function getExchangerate(source, target, date) {
        var exchangerate = currency.exchangeRate({ source: source, target: target, date: date });
        return exchangerate;
    }

    function fieldChanged(context) {
        
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {
        return true;
    }

    function validateInsert(context) {
        return true;
    }

    function validateLine(context) {
        return true;
    }

    function sublistChanged(context) {
        
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }
});
