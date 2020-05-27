/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/log'], function(record, log) {

    function onRequest(context) {
        var ifm_record = record.transform({
            fromType: 'vendorreturnauthorization',
            fromId: 7,
            toType: 'itemfulfillment'
        });
        ifm_record.save();
    }

    return {
        onRequest: onRequest
    }
});