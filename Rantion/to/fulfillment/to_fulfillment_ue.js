/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var newRec = context.newRecord;
        var type = context.type;
        if (type == 'create') {
            var recordType;
            search.create({
                type: newRec.type,
                filters: [
                    { name: 'internalId', operator: 'is', values: newRec.id },
                ],
                columns: [
                    { name: 'recordType', join: 'createdfrom' }
                ]
            }).run().each(function (rec) {
                recordType = rec.getValue(rec.columns[0]);
                return false;
            });
            if (recordType == 'transferorder') {
                var to_id = newRec.getValue('createdfrom');
                var subsidiary = newRec.getValue('subsidiary');
                var line = newRec.getLineCount({ sublistId: 'item' });
                var itemArray = new Array();
                var itemJson = {};
                for (var i = 0; i < line; i++) {
                    var item = newRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var quantity = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    var exist = false;
                    for (var j = 0; j < itemArray.length; j++) {
                        if (itemArray[j] == item) {
                            exist = true;
                            break;
                        }
                    }
                    if (!exist) {
                        itemArray.push(item);
                    }
                    if (itemJson[item]) {
                        quantity += itemJson[item];
                    }
                    itemJson[item] = quantity;
                }
                if (itemArray.length > 0) {
                    //拿出符合条件的所有采购收货单的行明细，然后再一一拿出来再做占用处理
                    var poRecInfo = {};
                    var po_ids = [];
                    var sku_qty = {};
                    search.create({
                        type: 'itemreceipt',
                        filters: [
                            { name: 'mainline', operator: 'is', values: ['F'] },
                            { name: 'taxline', operator: 'is', values: ['F'] },
                            { name: 'item', operator: 'noneof', values: ['@NONE@'] },
                            { name: 'custbody_dps_type', join: 'createdfrom', operator: 'anyof', values: ['2'] },
                            { name: 'recordType', join: 'createdfrom', operator: 'is', values: 'purchaseorder' },
                            { name: 'subsidiary', operator: 'is', values: [subsidiary] },
                            { name: 'item', operator: 'anyof', values: itemArray }
                        ],
                        columns: [
                            { name: 'trandate', label: '日期', type: 'date', sort: 'ASC' }, // 0
                            { name: 'item', label: '货品名称', type: 'select' }, // 1
                            { name: 'quantity', label: '采购数量', type: 'float' }, // 2
                            { name: 'createdfrom', label: '采购订单id', type: 'select' } // 3
                        ]
                    }).run().each(function (rec) {
                        var item_id = rec.getValue(rec.columns[1]);
                        var po_id = rec.getValue(rec.columns[3]);
                        var key = po_id + '_' + item_id;
                        sku_qty[key] = rec.getValue(rec.columns[2]);
                        po_ids.push(po_id);
                        return true;
                    });
                    log.debug('sku_qty', JSON.stringify(sku_qty));


                    if (po_ids && po_ids.length > 0) { // 存在对应的采购订单
                        search.create({
                            type: 'purchaseorder',
                            filters: [
                                { name: 'mainline', operator: 'is', values: ['F'] },
                                { name: 'taxline', operator: 'is', values: ['F'] },
                                { name: 'internalid', operator: 'anyof', values: po_ids },
                                { name: 'item', operator: 'anyof', values: itemArray }
                            ],
                            columns: [
                                { name: 'trandate', label: '日期', type: 'date', sort: 'ASC' }, //0
                                { name: 'subsidiary', label: '子公司', type: 'select' }, //1
                                { name: 'custbody_dps_type', label: '采购订单类型', type: 'select' }, //2
                                { name: 'line', label: '行Id', type: 'integer' }, //3
                                { name: 'item', label: '货品名称', type: 'select' }, //4
                                { name: 'quantity', label: '采购数量', type: 'float' }, //5
                                { name: 'custcoltransferable_quantity', label: '可调拨数量', type: 'float' }, //6
                                { name: 'custcol_transferred_quantity', label: '已调拨数量', type: 'float' }, //7
                                { name: 'custcol_realted_transfer_detail', label: '关联调拨单号', type: 'select' }, //8
                            ]
                        }).run().each(function (rec) {
                            var item_id = rec.getValue(rec.columns[4]);
                            var po_id = rec.id;
                            var key = po_id + '_' + item_id;
                            var value = {
                                item: rec.getValue(rec.columns[4]),
                                quantity: sku_qty[key],
                                needCount: rec.getValue(rec.columns[6]),
                                alreadyCount: rec.getValue(rec.columns[7]),
                                line: rec.getValue(rec.columns[3]),
                                link: rec.getValue(rec.columns[8])
                            }
                            if (poRecInfo[rec.id]) {
                                poRecInfo[rec.id].push(value);
                            } else {
                                poRecInfo[rec.id] = [value];
                            }
                            return true;
                        });
                        log.debug('poRecInfo', JSON.stringify(poRecInfo));
                        linkToData2Po(poRecInfo, itemJson, to_id);

                    }
                }
            }
        }
    }

    /**
     * 将TO单上的货品数量占用采购收货单上的货品
     * @param {*} poRecInfo
     * @param {*} itemJson
     */
    function linkToData2Po(poRecInfo, itemJson, ToId) {
        var poNeedSaveJson = {};
        for (var key in poRecInfo) {
            log.debug('key', key);
            for (var i in poRecInfo[key]) {
                var poData = poRecInfo[key][i];
                log.debug('poData', JSON.stringify(poData));
                var needCount = getRemainCount(poData.needCount, poData.quantity);
                if (needCount) {
                    //拿出TO单上符合该条件的货品和数量
                    var itemKey = poData.item;
                    var ToCount = itemJson[itemKey];
                    if (ToCount && ToCount > 0) {
                        var poRec;
                        if (poNeedSaveJson[key]) {
                            poRec = poNeedSaveJson[key];
                        } else {
                            poRec = record.load({
                                type: 'purchaseorder',
                                id: key
                            });
                            poNeedSaveJson[key] = poRec;
                        }
                        var actuallyCount;
                        //当库存转移比实际的采购的数量要多的情况
                        if (ToCount >= needCount) {
                            actuallyCount = needCount;
                            itemJson[itemKey] = ToCount - needCount;
                        }
                        //当库存转移比实际的采购的数量要少的情况
                        if (ToCount < needCount) {
                            actuallyCount = ToCount;
                            itemJson[itemKey] = 0;
                        }
                        log.debug('createToLinkRecord', poRec.getValue('tranid') + '==' + poData.line + '==' + actuallyCount + '==' + poData.link + '==' + ToId);
                        poNeedSaveJson[key] = createToLinkRecord(poRec, poData.line, actuallyCount, poData.link, ToId);
                    }
                }
            }
        }
        for (var key in poNeedSaveJson) {
            var poRec = poNeedSaveJson[key];
            try {
                poRec.save();
            } catch (error) {
                log.debug('transferoder_po', JSON.stringify(error));
            }
        }
        //开始计算用掉了多少数量，然后再更新TO货品行数据
        refreshItemCount(itemJson, ToId);
    }

    /**
     * 创建关联记录并赋值给采购收货单的货品行
     * @param {*} poRec
     * @param {*} itemReceiptLine
     * @param {*} count
     * @param {*} linkId
     * @param {*} ToId
     */
    function createToLinkRecord(poRec, itemReceiptLine, count, linkId, ToId) {
        itemReceiptLine = itemReceiptLine - 1;
        //之前有未占完的情况
        if (linkId) {
            var linkRec = record.load({ type: 'customrecord_realted_transfer_head', id: linkId });
            var linkLine = linkRec.getLineCount({ sublistId: 'recmachcustrecord__realted_transfer_head' });
            linkRec.setSublistValue({
                sublistId: 'recmachcustrecord__realted_transfer_head',
                fieldId: 'custrecord_transfer_code',
                value: ToId,
                line: linkLine
            });
            linkRec.setSublistValue({
                sublistId: 'recmachcustrecord__realted_transfer_head',
                fieldId: 'custrecord_transfer_quantity',
                value: count,
                line: linkLine
            });
            linkRec.save();
        }
        //之前没有未占完的情况
        else {
            var linkRec = record.create({ type: 'customrecord_realted_transfer_head', isDynamic: false });
            linkRec.setValue({ fieldId: 'name', value: 'PO:' + poRec.getValue('tranid') + ':' + (itemReceiptLine + 1) + ':(TO)' });
            linkRec.setSublistValue({
                sublistId: 'recmachcustrecord__realted_transfer_head',
                fieldId: 'custrecord_transfer_code',
                value: ToId,
                line: 0
            });
            linkRec.setSublistValue({
                sublistId: 'recmachcustrecord__realted_transfer_head',
                fieldId: 'custrecord_transfer_quantity',
                value: count,
                line: 0
            });
            var linkNewId = linkRec.save();

            //设置关联单
            poRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_realted_transfer_detail',
                value: linkNewId,
                line: itemReceiptLine
            });
        }

        //更新行明细汇总
        var alreadyL = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', line: itemReceiptLine });
        var needL = poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: itemReceiptLine });
        alreadyL = Number(alreadyL) + count;
        needL = Number(needL) - count;
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', value: alreadyL > 0 ? alreadyL : 0, line: itemReceiptLine });
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', value: needL, line: itemReceiptLine });
        //更新头部汇总
        var already = poRec.getValue('custbody_transferred_quantity');
        var need = poRec.getValue('custbody_available_transferred_quantit');
        already = Number(already) + count;
        need = Number(need) - already;
        poRec.setValue({ fieldId: 'custbody_transferred_quantity', value: already });
        poRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: need });
        //更新可使用发票与已使用发票金额
        // //已开票
        // var alreadySum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', line: itemReceiptLine }));
        //税率
        var rate = poRec.getSublistValue({ sublistId: 'item', fieldId: 'taxrate1', line: itemReceiptLine });
        //单价
        var price = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: itemReceiptLine }));
        //已使用发票
        var alreadyUseSum = Number(poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_used_invoice_amount',
            line: itemReceiptLine
        }));
        //可使用发票
        var alreadyCanUseSum = Number(poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_invoice_amount_available',
            line: itemReceiptLine
        }));
        //可使用汇总
        var allInvoicedAmountSum = Number(poRec.getValue('custbody_invoiced_amount'));
        var allAlreadyUseSum = Number(poRec.getValue('custbody_used_invoice_amount'));
        var amount = count * price * ((100 + rate) / 100);
        alreadyUseSum += amount;
        alreadyCanUseSum = alreadyCanUseSum + amount;
        allAlreadyUseSum += amount;
        var allAlreadyCanUseSum = allInvoicedAmountSum - allAlreadyUseSum;
        poRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_invoice_amount_available',
            value: alreadyCanUseSum,
            line: itemReceiptLine
        });
        poRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_used_invoice_amount',
            value: alreadyUseSum,
            line: itemReceiptLine
        });
        poRec.setValue({
            fieldId: 'custbody_available_invoice_amount',
            value: allAlreadyCanUseSum
        });
        poRec.setValue({
            fieldId: 'custbody_used_invoice_amount',
            value: allAlreadyUseSum
        });
        return poRec;
    }

    //计算并更新未占用的数量
    function refreshItemCount(itemJson, ToId) {
        var toRec = record.load({ type: 'transferorder', id: ToId });
        var line = toRec.getLineCount({ sublistId: 'item' });
        var hasChange;
        for (var key in itemJson) {
            //占用完后剩余的数量
            var remainCount = itemJson[key];
            for (var i = 0; i < line; i++) {
                var item = toRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                if (item == key) {
                    var quantity = Number(toRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }));
                    if (quantity) {
                        if (quantity > remainCount) {
                            toRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_unocc_po_quantity',
                                value: Number(remainCount),
                                line: i
                            });
                            itemJson[key] = 0;
                            hasChange = true;
                        } else {
                            remainCount = remainCount - quantity;
                            itemJson[key] = remainCount;
                        }
                    }
                }
            }
        }
        if (hasChange) {
            toRec.save();
        }
    }

    /**
     * 计算采购单某行还剩多少未调拨数量
     * @param {*} needCount 还可以调整的数量
     * @param {*} quantity 总数量
     */
    function getRemainCount(needCount, quantity) {
        if (needCount != undefined && needCount != '') {
            return Number(needCount);
        }
        return Number(quantity);
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
