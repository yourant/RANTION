/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/commonTool.js', 'N/search', 'N/record'],
    function (commonTool, search, record) {

        function pageInit(context) {

        }

        function saveRecord(context) {
            // commonTool.startMask('正在生成发票记录并绑定采购订单，请耐心等待');

            // commonTool.endMask();
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {
            if (context.fieldId == 'custrecord_isl_sku_quantity') {
                var rec = context.currentRecord;
                var sblId = 'recmachcustrecord_isl_invoice_link';
                var limitCount = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_limit' }));
                var curQty = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity' }));
                if (limitCount < curQty) {
                    rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity', value: limitCount });
                }
                var curPrice = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_price' });
                var rate = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_tax_rate' });
                rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', value: curQty * curPrice });
                rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_taxamount', value: curQty * curPrice * ((Number(rate.replace('%', ''))) / 100) });
            }
            return true;
        }

        function postSourcing(context) {
            return true;
        }

        function lineInit(context) {
            return true;
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
            var rec = context.currentRecord;
            var sblId = 'recmachcustrecord_isl_invoice_link';
            var lineNum = rec.getLineCount({ sublistId: sblId });
            var invoiceAmount = 0;
            for (var i = 0; i < lineNum; i++) {
                invoiceAmount = invoiceAmount + Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', line: i }))
                    + Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_taxamount', line: i }));
            }
            rec.setValue({ fieldId: 'custrecord_invoice_amount', value: invoiceAmount });
            return true;
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
