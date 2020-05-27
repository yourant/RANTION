/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search'], function(search) {

    function beforeLoad(context) {
        var newRec = context.newRecord;
        if (context.type == context.UserEventType.CREATE) {
            var request = context.request;
            if (request) {
                var poIds = request.parameters.poids.split('|');
                if (poIds.length > 0) {
                    var arri = 0;
                    var skuQty = 0;
                    var totalamount = 0;
                    var slid = 'recmachcustrecord_isl_invoice_link';
                    search.create({
                        type: 'purchaseorder',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: poIds },
                            { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
                            { name: 'mainline', operator: 'is', values: ['F'] },
                            { name: 'taxline', operator: 'is', values: ['F'] }
                        ],
                        columns: [
                            'internalid', 'total', 'item', 'quantity', 'rate', 'amount', 'taxamount',
                            { name: 'custitem_dps_declaration_cn', join: 'item' },
                            { name: 'custitem_dps_unit', join: 'item' },
                            { name: 'rate', join: 'taxItem' }
                        ]
                    }).run().each(function(result) {
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_po', value: result.getValue('internalid'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_po_amount', value: result.getValue('total'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku', value: result.getValue('item'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_name', value: result.getValue({ name: 'custitem_dps_declaration_cn', join: 'item' }), line: arri });
                        var qty = Number(result.getValue('quantity'));
                        skuQty = skuQty + qty;
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_quantity', value: qty, line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_unit', value: result.getValue({ name: 'custitem_dps_unit', join: 'item' }), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_price', value: result.getValue('rate'), line: arri });
                        var amount = Number(result.getValue('amount'));
                        totalamount = totalamount + amount;
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_amount', value: totalamount, line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_tax_rate', value: result.getValue({ name: 'rate', join: 'taxItem' }), line: arri });
                        var taxamount = Number(result.getValue('taxamount'));
                        taxamount = taxamount < 0 ? 0 - taxamount : 0;
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_taxamount', value: taxamount, line: arri });
                        arri++;
                        return true;
                    });
                    newRec.setValue({ fieldId: 'custrecord_invoice_amount', value: totalamount });
                    newRec.setValue({ fieldId: 'custrecord_invoice_number', value: skuQty });
                }
            }
        }
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
