/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/commonTool.js', 'N/search', 'N/record'], 
function(commonTool, search, record) {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        commonTool.startMask('正在生成发票记录并绑定采购订单，请耐心等待');
        var rec = context.currentRecord;
        var sblId = 'recmachcustrecord_isl_invoice_link';
        var lineNum = rec.getLineCount({ sublistId: sblId });
        var pos = {};
        var poids = [];
        for (var i = 0; i < lineNum; i++) {
            var poid = rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_po', line: i });
            var po = pos[poid];
            var quantity = rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity', line: i });
            if (po) {
                po.qty = po.qty + Number(quantity);
            } else {
                var pojson = {};
                pojson.qty = Number(quantity);
                pos[poid] = pojson;
                poids.push(poid);
            }
        }
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'internalid', operator: 'anyof', values: poids },
                { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'taxline', operator: 'is', values: ['F'] }
            ],
            columns: [ 
                { name: 'internalid', summary: 'group' }, 
                { name: 'quantity', summary: 'SUM' }
            ]
        }).run().each(function(result) {
            var poid = result.getValue({ name: 'internalid', summary: 'group' });
            var quantity = result.getValue({ name: 'quantity', summary: 'SUM' });
            var po = pos[poid];
            if (po) {
                var status = 3;
                if (po.qty < quantity) {
                    status = 2;
                }
                var porec = record.load({ type: 'purchaseorder', id: poid });
                porec.setValue({ fieldId: 'custbody_dps_invoice_status', value: status });
                porec.save();
            }
        });
        commonTool.endMask();
        return true;
    }

    function validateField(context) {
        if (context.fieldId == 'custrecord_isl_sku_quantity') {
            var sblId = 'recmachcustrecord_isl_invoice_link';
            var rec = context.currentRecord;
            var lineNum = rec.getLineCount({ sublistId: sblId });
            var curQty = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity' });
            var curPrice = rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_price' });
            rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', value: curQty * curPrice });
            var invoiceAmount = 0;
            for (var i = 0; i < lineNum; i++) {
                invoiceAmount = invoiceAmount + Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', line: i }));
            }
            rec.setValue({ fieldId: 'custrecord_invoice_amount', value: invoiceAmount });
        }
        return true;
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
