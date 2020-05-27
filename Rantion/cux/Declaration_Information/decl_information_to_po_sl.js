/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record'], function(record) {

    function onRequest(context) {
        var request = context.request;
        var response = context.response;
        var params = request.parameters; // 参数
        var action = params.action;

        if (action == 'createpo') {
            var respjson = {};
            var poData = JSON.parse(params.poData);
            var msg = '生成成功';
            var poid;
            if (poData) {
                try {
                    var poRec = record.create({ type: 'purchaseorder', isDynamic: true });
                    poRec.setValue({ fieldId: 'entity', value: poData.to_subsidiary_vendor });
                    poRec.setValue({ fieldId: 'currency', value: poData.to_subsidiary_currency });
                    poRec.setValue({ fieldId: 'location', value: poData.to_subsidiary_location });
                    var skus = poData.skus;
                    for (var index = 0; index < skus.length; index++) {
                        poRec.selectNewLine({ sublistId: 'item' });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skus[index].item });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Number(skus[index].qty) });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Number(skus[index].price) });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: poData.to_subsidiary_location });
                        poRec.commitLine({ sublistId: 'item' });
                    }
                    poid = poRec.save();
                    if (poid) {
                        var informaRec = record.load({ type: 'customrecord_customs_declaration_informa', id: poData.informationId });
                        informaRec.setValue({ fieldId: 'custrecord_inter_po_report', value: poid });
                        informaRec.save();
                        var shipping_rec = record.load({ type: 'customrecord_dps_shipping_record', id: poData.shippingId });
                        shipping_rec.setValue({ fieldId: 'custrecord_inter_po', value: poid });
                        shipping_rec.save();
                    }
                } catch (error) {
                    log.debug('error', JSON.stringify(error));
                    msg = '生成失败';
                }
            }
            respjson.msg = msg;
            response.write(JSON.stringify(respjson));
        }
    }

    return {
        onRequest: onRequest
    }
});
