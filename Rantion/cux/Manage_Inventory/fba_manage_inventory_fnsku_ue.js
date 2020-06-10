/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function(search, record) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        if (context.type == 'create') {
            var newRecord = context.newRecord;
            var sellersku = newRecord.getValue('custrecord_fba_sku');
            var fnsku = newRecord.getValue('custrecord_fba_fnsku');
            var asin = newRecord.getValue('custrecord_fba_asin');
            var account = newRecord.getValue('custrecord_fba_account');
            if (sellersku && fnsku && asin && account) {
                var flag = true;
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: [
                        { name: 'name', operator: 'is', values: sellersku },
                        { name: 'custrecord_ass_fnsku', operator: 'is', values: fnsku },
                        { name: 'custrecord_ass_asin', operator: 'is', values: asin },
                        { name: 'custrecord_ass_account', operator: 'is', values: account }
                    ]
                }).run().each(function (result) {
                    if (result.id) {
                        flag = false;
                    }
                    return true;
                });
                if (flag) {
                    var sellerSkuRec = record.create({ type: 'customrecord_aio_amazon_seller_sku', isDynamic: true });
                    sellerSkuRec.setValue({ fieldId: 'name', value: sellersku });
                    sellerSkuRec.setValue({ fieldId: 'custrecord_ass_fnsku', value: fnsku });
                    sellerSkuRec.setValue({ fieldId: 'custrecord_ass_asin', value: asin });
                    sellerSkuRec.setValue({ fieldId: 'custrecord_ass_account', value: account });
                    sellerSkuRec.save();
                }
            }
        }
    }

    function afterSubmit(context) {
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
