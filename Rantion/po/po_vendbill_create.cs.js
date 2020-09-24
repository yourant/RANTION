/*
 * @Author         : Bong
 * @Version        : 1.0
 * @Date           : 2020-09-15 14:18:29
 * @LastEditTime   : 2020-09-15 14:18:29
 * @LastEditors    : Bong
 * @Description    :
 * @FilePath       : \Rantion\po\po_vendbill_create.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog'],
    function (currentRecord, record, search, dialog) {
        function pageInit(context) {
            var lineCount = context.currentRecord.getLineCount({
                    sublistId: 'item'
                }),
                quantity = 0,
                excl_tax = 0,
                amount = 0,
                tax = 0;
            for (var i = 0; i < lineCount; i++) {
                quantity = Number(quantity) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                }));
                excl_tax = Number(excl_tax) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                })); //除税金额
                amount = Number(amount) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'grossamt',
                    line: i
                })); //金额
                tax = Number(tax) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'tax1amt',
                    line: i
                })); //税额
            }
            context.currentRecord.setValue('custbody_items_quantity', quantity);
            context.currentRecord.setValue('custbody_items_amount_excl_tax', excl_tax);
            context.currentRecord.setValue('custbody_items_amount', amount);
            context.currentRecord.setValue('custbody_items_amount_tax', tax);
        }

        function saveRecord(context) {
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {
            return true;
        }

        function postSourcing(context) {

        }

        function lineInit(context) {
            var lineCount = context.currentRecord.getLineCount({
                    sublistId: 'item'
                }),
                quantity = 0,
                excl_tax = 0,
                amount = 0,
                tax = 0;
            for (var i = 0; i < lineCount; i++) {
                quantity = Number(quantity) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                }));
                excl_tax = Number(excl_tax) + Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                })); //除税金额
                amount = Number(context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'grossamt',
                    line: i
                })); //金额
                tax = context.currentRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'tax1amt',
                    line: i
                }); //税额
            }
            context.currentRecord.setValue('custbody_items_quantity', quantity);
            context.currentRecord.setValue('custbody_items_amount_excl_tax', excl_tax);
            context.currentRecord.setValue('custbody_items_amount', amount);
            context.currentRecord.setValue('custbody_items_amount_tax', tax);
        }

        function validateDelete(context) {

            return true;
        }

        function validateInsert(context) {
            return true;
        }

        function validateLine(context) {
            console.log("validateLine")
            return true;
        }

        function sublistChanged(context) {
            // console.log("sublistChanged", 'sublistChanged');
            // console.log(context.currentRecord.type);
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