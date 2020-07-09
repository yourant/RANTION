/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        var newRec = context.newRecord;
        try{
        if (context.type == context.UserEventType.CREATE) {
            var request = context.request;
            log.debug("request",request)
            if (request) {
                var poIds = request.parameters.poids.split('|');
                if (poIds.length > 0) {
                    var arri = 0;
                    var skuQty = 0;
                    var alreadyUseSum = 0;
                    var alreadyCanUseSum = 0;
                    var totalamount = 0;
                    var slid = 'recmachcustrecord_isl_invoice_link';
                    var subsidiary = ''
                    var entity = ''
                    search.create({
                        type: 'purchaseorder',
                        filters: [
                            { name: 'internalId', operator: 'is', values: poIds[0] },
                        ],
                        columns: [ 'subsidiary', 'entity' ]
                    }).run().each(function (rec) {
                        subsidiary = rec.getValue('subsidiary');
                        entity = rec.getValue('entity');
                        return false;
                    });
                    newRec.setValue({ fieldId: 'custrecord_subsidiary', value: subsidiary });
                    newRec.setValue({ fieldId: 'custrecord_vendor_code', value: entity });
                    var date = new Date();
                    newRec.setValue({ fieldId: 'custrecord_invoice_date', value: date });
                    newRec.setValue({ fieldId: 'custrecord_invoice_status', value: '2' });
                    var toLinkArray = new Array();
                    search.create({
                        type: 'purchaseorder',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: poIds },
                            { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
                            { name: 'mainline', operator: 'is', values: ['F'] },
                            { name: 'taxline', operator: 'is', values: ['F'] },
                            { name: 'custcol_invoice_amount_open', operator: 'greaterthan', values: ['0']  }
                        ],
                        columns: [
                            'internalid', 'total', 'item', 'quantity', 'rate', 'amount', 'taxamount', 'line',
                            'custcol_transferred_quantity', 'custcol_invoiced_amount', 'custcol_realted_transfer_detail',
                            'custcol_invoice_amount_available', 'custcol_used_invoice_amount', 'custcol_invoice_amount_open',
                            { name: 'custitem_dps_declaration_cn', join: 'item' },
                            { name: 'custitem_dps_unit', join: 'item' },
                            { name: 'rate', join: 'taxItem' }
                        ]
                    }).run().each(function (result) {
                        var price = result.getValue('rate');
                        var rate = result.getValue({ name: 'rate', join: 'taxItem' });
                        //计算改行支持最大的数量
                        var needMoney = Number(result.getValue('custcol_invoice_amount_open'));
                        var unitRate = Number(rate.replace("%", ""));
                        var unitTaxPrice = (price * (unitRate + 100) / 100).toFixed(2);
                        var limitNum = (needMoney / unitTaxPrice).toFixed(0);
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_limit', value: limitNum, line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_po', value: result.getValue('internalid'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_po_amount', value: result.getValue('total'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku', value: result.getValue('item'), line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_name', value: result.getValue({ name: 'custitem_dps_declaration_cn', join: 'item' }), line: arri });
                        // var qty = Number(result.getValue('quantity'));
                        skuQty = skuQty + Number(limitNum);
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_quantity', value: limitNum, line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_unit', value: result.getValue({ name: 'custitem_dps_unit', join: 'item' }), line: arri });

                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_price', value: price, line: arri });
                        // var amount = Number(result.getValue('amount'));
                        totalamount = totalamount + Number(needMoney);
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_amount', value: needMoney, line: arri });

                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_tax_rate', value: rate, line: arri });
                        // var taxamount = Number(result.getValue('taxamount'));
                        var taxamount = Number(limitNum) * price * rate / 100
                        log.audit('taxamount', taxamount);
                        taxamount = taxamount < 0 ? 0 - taxamount : 0;
                        var toLink = result.getValue('custcol_realted_transfer_detail')
                        if (toLink) {
                            toLinkArray.push(toLink)
                        }
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_taxamount', value: taxamount, line: arri });
                        newRec.setSublistValue({ sublistId: slid, fieldId: 'custrecord_isl_sku_line', value: (Number(result.getValue('line')) - 1).toFixed(0), line: arri });
                        alreadyUseSum += Number(result.getValue('custcol_used_invoice_amount'))
                        alreadyCanUseSum += Number(result.getValue('custcol_invoice_amount_available'))

                        arri++;
                        return true;
                    });
                    newRec.setValue({ fieldId: 'custrecord_invoice_amount', value: totalamount });
                    newRec.setValue({ fieldId: 'custrecord_dps_to_link_choose', value: toLinkArray });
                    newRec.setValue({ fieldId: 'custrecord_invoice_number', value: skuQty.toFixed(0) });
                    newRec.setValue({ fieldId: 'custrecord_transfer_order_quantity', value: toLinkArray.length });
                    newRec.setValue({ fieldId: 'custrecord_used_invoice_amount', value: alreadyUseSum.toFixed(2) });
                    newRec.setValue({ fieldId: 'custrecord_invoice_amount_available', value: alreadyCanUseSum.toFixed(2) });
                    var slid_to = 'recmachcustrecord_iss_link_inv_manage'; //调拨单（明细行）
                    var l=0 
                    toLinkArray.map(function(La){
                        search.create({
                            type:"customrecord_transfer_order_details",
                            filters:["internalidnumber","equalto",La],
                            columns:["custrecord_transfer_code","custrecord_transfer_quantity"]
                        }).run().each(function(e){
                            newRec.setSublistValue({ sublistId: slid_to, fieldId: 'custrecord_transfer_code', value: e.getValue("custrecord_transfer_code"), line: l });
                            newRec.setSublistValue({ sublistId: slid_to, fieldId: 'custrecord_transfer_quantity', value: e.getValue("custrecord_transfer_quantity"), line: l });
                            l++
                        })
                    })
                }
            }
        }
        }catch(e){
            log.error("beforeLoad error:" ,e)
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var rec = context.newRecord;
        var type = context.type
        if (type == 'create') {
            var sblId = 'recmachcustrecord_isl_invoice_link';
            var lineNum = rec.getLineCount({ sublistId: sblId });
            var pos = {};
            for (var i = 0; i < lineNum; i++) {
                var poid = rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_po', line: i });
                var line = rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_line', line: i });
                log.audit('line', line);
                var po = pos[poid];
                var quantity = Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_quantity', line: i }));
                var amount = Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_amount', line: i })) +
                    Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_isl_sku_taxamount', line: i }))
                if (quantity) {
                    if (!po) {
                        po = new Array();
                    }
                    po.push({
                        line: line,
                        num: quantity,
                        amount: amount
                    })
                    pos[poid] = po
                }
            }
            log.audit('pos', pos);
            for (var key in pos) {
                var poRec = record.load({
                    type: 'purchaseorder',
                    id: key
                });
                var allAlreadySum = Number(poRec.getValue("custbody_invoiced_amount"))
                var allNeedSum = Number(poRec.getValue("custbody_remaining_invoiced_amount"))
                var allAlreadyCanUseSum = Number(poRec.getValue("custbody_available_invoice_amount"))
                var poArray = pos[key]
                for (var line in poArray) {
                    var lineInfo = poArray[line]
                    log.audit('lineInfo', lineInfo);
                    //已开票
                    var alreadySum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', line: lineInfo.line }))
                    //未开票
                    var needSum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_open', line: lineInfo.line }))
                    //可使用
                    var alreadyCanUseSum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', line: lineInfo.line }))
                    alreadySum += lineInfo.amount
                    needSum = needSum - lineInfo.amount
                    alreadyCanUseSum += lineInfo.amount
                    poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', value: alreadySum, line: lineInfo.line });
                    poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_open', value: needSum, line: lineInfo.line });
                    poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', value: alreadyCanUseSum, line: lineInfo.line });

                    allAlreadySum += lineInfo.amount
                    allNeedSum = allNeedSum - lineInfo.amount
                    allAlreadyCanUseSum += lineInfo.amount
                }
                //设置已开票金额
                poRec.setValue({ fieldId: 'custbody_invoiced_amount', value: allAlreadySum })
                poRec.setValue({ fieldId: 'custbody_remaining_invoiced_amount', value: allNeedSum })
                poRec.setValue({ fieldId: 'custbody_available_invoice_amount', value: allAlreadyCanUseSum })
                var invoiceNum = Number(poRec.getValue("custbody_invoice_number"))
                var remainAmount = Number(poRec.getValue("custbody_remaining_invoiced_amount"))
                var status = 3;
                if (remainAmount > 0) {
                    status = 2;
                }
                poRec.setValue({ fieldId: 'custbody_dps_invoice_status', value: status });
                var date = new Date()
                if (invoiceNum == 0) {
                    poRec.setValue({ fieldId: 'custbody_invoice_start_date', value: date });
                }
                poRec.setValue({ fieldId: 'custbody_update_time', value: date });
                poRec.setValue({ fieldId: 'custbody_invoice_number', value: invoiceNum + 1 });
                poRec.save()
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
