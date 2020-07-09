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
            log.debug('poData', JSON.stringify(poData));
            if (poData) {
                try {
                    var poRec = record.create({ type: 'purchaseorder', isDynamic: true });
                    poRec.setValue({ fieldId: 'customform', value: 98 });
                    if (!poData.to_subsidiary_vendor) {
                        respjson.msg = '调拨目标子公司未维护公司间交易供应商，请维护后再操作';
                        response.write(JSON.stringify(respjson));
                        return false;
                    }
                    poRec.setValue({ fieldId: 'entity', value: poData.to_subsidiary_vendor });
                    poRec.setValue({ fieldId: 'currency', value: poData.to_subsidiary_currency });
                    if (!poData.to_subsidiary_location) {
                        respjson.msg = '调拨目标子公司未维护公司间交易虚拟在途仓，请维护后再操作';
                        response.write(JSON.stringify(respjson));
                        return false;
                    }
                    poRec.setValue({ fieldId: 'location', value: poData.to_subsidiary_location });
                    poRec.setValue({ fieldId: 'custbody_dps_type', value: '6' });
                    if (poData.shipment_id) {
                        poRec.setValue({ fieldId: 'custbody_shipment_id', value: poData.shipment_id });
                    }
                    var skus = poData.skus;
                    for (var index = 0; index < skus.length; index++) {
                        log.debug('skus', JSON.stringify(skus));
                        poRec.selectNewLine({ sublistId: 'item' });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skus[index].item });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Number(skus[index].qty) });
                        poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Number(skus[index].price) });
                        // poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: poData.to_subsidiary_location });
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
