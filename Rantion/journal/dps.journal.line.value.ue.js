/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 23:21:34
 * @LastEditTime   : 2020-07-10 23:26:45
 * @LastEditors    : Li
 * @Description    : 设置日记账行的本位币金额
 * @FilePath       : \Rantion\journal\dps.journal.line.value.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

        // add li 2020-07-10 23:16
        try {
            setJournalValueCurrency(context.newRecord);
        } catch (error) {
            log.debug('设置本位币金额', error)
        }

    }

    function afterSubmit(context) {

    }


    /**
     * 设置 日记账行的本位币金额
     * @param {*} Rec 
     */
    function setJournalValueCurrency(Rec) {

        var exchangerate = Rec.getValue('exchangerate'); // 汇率

        var numLines = Rec.getLineCount({
            sublistId: "line"
        });

        for (var i = 0; i < numLines; i++) {
            var a, b
            a = Rec.getSublistValue({
                sublistId: 'line',
                fieldId: 'credit',
                line: i
            }); // 贷
            if (a) {
                Rec.setSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_dps_currency_amount',
                    line: i,
                    value: a * exchangerate
                })
            } else {
                b = Rec.getSublistValue({
                    sublistId: 'line',
                    fieldId: 'debit',
                    line: i
                }); // 借

                Rec.setSublistValue({
                    sublistId: 'line',
                    fieldId: 'custcol_dps_currency_amount',
                    line: i,
                    value: b * exchangerate
                })
            }


        }

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});