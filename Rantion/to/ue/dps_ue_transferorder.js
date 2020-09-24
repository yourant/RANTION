/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {
        var newRec = context.newRecord;
        var type = context.type;
        if (type == 'create') {
            var line = newRec.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < line; i++) {
                // 总数量
                var quantity = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                // 未调拨数量
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_unocc_po_quantity', value: quantity, line: i });
            }
        }
    }

    /**
     * 主要功能，根据TO单判断符合条件的PO单的SKU明细行，然后逐个去占用PO单的SKU
     * @param {} context 
     */
    function afterSubmit(context) {
        // var newRec = context.newRecord;
        // var type = context.type;
        // if (type == 'edit') {
        //     var status;
        //     search.create({
        //         type: 'transferorder',
        //         filters: [
        //             { name: 'mainline', operator: 'is', values: ['T'] },
        //             { name: 'internalId', operator: 'is', values: newRec.id },
        //         ],
        //         columns: [ 'statusref' ]
        //     }).run().each(function (rec) {
        //         status = rec.getValue(rec.columns[0]);
        //         return false;
        //     });
        //     //关闭订单的时候 需要将之前占用的数据取消掉
        //     if (status && status == 'closed') {
        //         var detailArray = new Array();
        //         var detailJson = {};
        //         search.create({
        //             type: 'customrecord_transfer_order_details',
        //             filters: [
        //                 { name: 'custrecord_transfer_code', operator: 'is', values: newRec.id }],
        //             columns: [
        //                 'custrecord_transfer_quantity',
        //                 { name: 'internalid', join: 'CUSTRECORD__REALTED_TRANSFER_HEAD' }, 
        //                 'custrecord_transfer_code'
        //             ]
        //         }).run().each(function (rec) {
        //             detailArray.push(rec.getValue(rec.columns[1]));
        //             if (!detailJson[rec.getValue(rec.columns[1])]) {
        //                 detailJson[rec.getValue(rec.columns[1])] = new Array()
        //             }
        //             detailJson[rec.getValue(rec.columns[1])].push({
        //                 count: rec.getValue(rec.columns[0]),
        //                 id: rec.id
        //             })
        //             return true;
        //         });
        //         if (detailArray.length > 0) {
        //             //拿出符合条件的所有采购单的行明细，然后再一一拿出来再做占用处理
        //             var purcharseInfo = {};
        //             search.create({
        //                 type: 'purchaseorder',
        //                 filters: [
        //                     { name: 'mainline', operator: 'is', values: ['F'] },
        //                     { name: 'taxline', operator: 'is', values: ['F'] },
        //                     { name: 'custcol_realted_transfer_detail', operator: 'anyof', values: detailArray },
        //                     { name: 'item', operator: 'noneof', values: ['@NONE@'] },
        //                     { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
        //                     { name: 'custbody_dps_type', operator: 'anyof', values: ['2'] },
        //                 ],
        //                 columns: [
        //                     { name: 'datecreated', sort: 'DESC' }, //0
        //                     { name: 'subsidiary' }, //1
        //                     { name: 'custbody_dps_type' }, //2
        //                     { name: 'line' }, //3
        //                     { name: 'item' }, //4
        //                     { name: 'quantity' }, //5
        //                     { name: 'custcoltransferable_quantity' }, //6
        //                     { name: 'custcol_transferred_quantity' }, //7
        //                     { name: 'custcol_realted_transfer_detail' } //8
        //                 ]
        //             }).run().each(function (rec) {
        //                 var value = {
        //                     item: rec.getValue(rec.columns[4]),
        //                     quantity: rec.getValue(rec.columns[5]),
        //                     needCount: rec.getValue(rec.columns[6]),
        //                     alreadyCount: rec.getValue(rec.columns[7]),
        //                     line: rec.getValue(rec.columns[3]),
        //                     link: rec.getValue(rec.columns[8])
        //                 }
        //                 if (purcharseInfo[rec.id]) {
        //                     purcharseInfo[rec.id].push(value)
        //                 } else {
        //                     purcharseInfo[rec.id] = [value]
        //                 }
        //                 return true;
        //             });
        //             cancelLink2PurchaseOrder(purcharseInfo, detailJson)
        //         }
        //     }
        // }
        // var custbody_dps_fu_rec_link = newRec.getValue('custbody_dps_fu_rec_link');
        // if (custbody_dps_fu_rec_link != null && custbody_dps_fu_rec_link) {
        //     var custrecord_dps_declare_currency_dh;
        //     var custrecord_dps_declared_value_dh = 0;;
        //     search.create({
        //         type: 'customrecord_transfer_order_details',
        //         filters: [
        //             { name: 'custrecord_transfer_code', operator: 'anyof', values: newRec.id }
        //         ],
        //         columns: [ 'custrecord__realted_transfer_head', 'custrecord_transfer_quantity' ]
        //     }).run().each(function (rec1) {
        //         var custrecord__realted_transfer_head = rec1.getValue('custrecord__realted_transfer_head');
        //         var custrecord_transfer_quantity = rec1.getValue('custrecord_transfer_quantity');

        //         search.create({
        //             type: 'purchaseorder',
        //             filters: [
        //                 { name: 'mainline', operator: 'is', values: ['F'] },
        //                 { name: 'taxline', operator: 'is', values: ['F'] },
        //                 { name: 'item', operator: 'noneof', values: ['@NONE@'] },
        //                 { name: 'type', operator: 'anyof', values: ['PurchOrd'] },
        //                 { name: 'custbody_dps_type', operator: 'anyof', values: ['2'] },
        //                 // { name: 'subsidiary', operator: 'is', values: [subsidiary] },
        //                 // { name: 'item', operator: 'anyof', values: itemArray },
        //                 { name: 'custcol_realted_transfer_detail', operator: 'anyof', values: custrecord__realted_transfer_head }
        //             ],
        //             columns: [
        //                 { name: 'quantity', label: '采购数量', type: 'float' },
        //                 { name: 'custcol_realted_transfer_detail', label: '关联调拨单号', type: 'select' },
        //                 { name: 'rate' },
        //                 { name: 'currency' }
        //             ]
        //         }).run().each(function (result) {
        //             custrecord_dps_declare_currency_dh = result.getValue('currency');
        //             custrecord_dps_declared_value_dh = custrecord_dps_declared_value_dh + result.getValue('rate') * custrecord_transfer_quantity;
        //             return true;
        //         });
        //         return true;
        //     });
        //     record.submitFields({
        //         type: 'customrecord_dps_shipping_record',
        //         id: custbody_dps_fu_rec_link,
        //         values: {
        //             custrecord_dps_declared_value_dh: custrecord_dps_declared_value_dh,
        //             custrecord_dps_declare_currency_dh: custrecord_dps_declare_currency_dh
        //         }
        //     });
        // }
    }

    /**
     * 库存转移单关闭 取消采购订单的占用
     * @param {}} purcharseInfo 
     * @param {*} itemJson 
     * @param {*} ToId 
     */
    function cancelLink2PurchaseOrder(purcharseInfo, detailJson) {
        var purchaseNeedSaveJson = {}
        for (var key in purcharseInfo) {
            for (var i in purcharseInfo[key]) {
                var purchaseData = purcharseInfo[key][i]
                var alreadyCount = purchaseData.alreadyCount
                if (alreadyCount) {
                    //拿出TO单上符合该条件的货品和数量
                    var detailInfo = detailJson[purchaseData.link]
                    if (detailInfo) {
                        for (var j in detailInfo) {
                            var CancelCount = Number(detailInfo[j].count)
                            var LinkDetailId = detailInfo[j].id
                            if (CancelCount && CancelCount > 0) {
                                log.audit(key, purchaseData);
                                var poRec
                                if (purchaseNeedSaveJson[key]) {
                                    poRec = purchaseNeedSaveJson[key]
                                } else {
                                    poRec = record.load({
                                        type: 'purchaseorder',
                                        id: key
                                    });
                                    purchaseNeedSaveJson[key] = poRec
                                }
                                purchaseNeedSaveJson[key] = cancelToLinkRecord(poRec, purchaseData.line, CancelCount, purchaseData.link, LinkDetailId)
                            }
                        }
                    }
                }
            }
        }
        for (var key in purchaseNeedSaveJson) {
            var poRec = purchaseNeedSaveJson[key]
            poRec.save()
        }
    }

    /**
     * 取消TO关联与更新采购订单对应的占用数量
     * @param {} poRec 
     * @param {*} PoLine 
     * @param {*} count 
     * @param {*} linkId 
     * @param {*} ToId 
     */
    function cancelToLinkRecord(poRec, PoLine, count, linkId, detailId) {
        PoLine = PoLine - 1
        //之前有未占完的情况
        if (linkId) {
            record.delete({ type: 'customrecord_transfer_order_details', id: detailId });
            var momentCount = 0;
            search.create({
                type: 'customrecord_transfer_order_details',
                filters: [
                    { name: 'internalid', join: 'custrecord__realted_transfer_head', operator: 'is', values: linkId }],
                columns: []
            }).run().each(function (rec) {
                momentCount += 1
                return true;
            });
            if (momentCount == 0) {
                poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_realted_transfer_detail', value: '', line: PoLine });
                poRec.save()
                poRec = record.load({ type: 'purchaseorder', id: poRec.id });
                record.delete({ type: 'customrecord_realted_transfer_head', id: linkId });
            }
            //更新头部汇总
            var already = poRec.getValue('custbody_transferred_quantity');
            var need = poRec.getValue('custbody_available_transferred_quantit');
            already = Number(already) - count;
            need = Number(need) + count;
            poRec.setValue({ fieldId: 'custbody_transferred_quantity', value: already });
            poRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: need });
            //更新行明细汇总
            var alreadyL = poRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_transferred_quantity',
                line: PoLine
            })
            var needL = poRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcoltransferable_quantity',
                line: PoLine
            })
            alreadyL = Number(alreadyL) - count
            needL = Number(needL) + count
            poRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_transferred_quantity',
                value: alreadyL,
                line: PoLine
            });
            poRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcoltransferable_quantity',
                value: needL,
                line: PoLine
            });
        }
        return poRec;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});