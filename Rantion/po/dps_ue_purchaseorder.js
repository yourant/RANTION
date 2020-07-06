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
            //可调拨数量汇总
            var allNeed = 0
            var allInvoiceAmount = 0
            var line = newRec.getLineCount({ sublistId: 'item' })
            for (var i = 0; i < line; i++) {
                //总数量
                var quantity = newRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })
                //剩余开票金额
                var needInvoiceAmount = newRec.getSublistValue({ sublistId: 'item', fieldId: 'grossamt', line: i })
                //设置可调拨数量
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', value: quantity, line: i });
                //设置已调拨数量
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', value: 0, line: i });
                //初始化关联单号
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_realted_transfer_detail', value: '', line: i });
                //设置已开票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', value: '0', line: i });
                //设置剩余开票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_open', value: needInvoiceAmount, line: i });
                //设置已使用发票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_used_invoice_amount', value: '0', line: i });
                //设置可使用发票金额
                newRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', value: '0', line: i });
                allNeed += Number(quantity)
                allInvoiceAmount += Number(needInvoiceAmount)
            }
            newRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: allNeed })
            newRec.setValue({ fieldId: 'custbody_transferred_quantity', value: 0 })
            newRec.setValue({ fieldId: 'custbody_available_invoice_amount', value: 0 })
            newRec.setValue({ fieldId: 'custbody_used_invoice_amount', value: 0 })
            newRec.setValue({ fieldId: 'custbody_invoiced_amount', value: 0 })
            newRec.setValue({ fieldId: 'custbody_invoice_number', value: 0 })
            newRec.setValue({ fieldId: 'custbody_remaining_invoiced_amount', value: allInvoiceAmount })


            //保存PO单，开始查找可以占用的TO单
            occPobyTo(context.newRecord)
        }
    }

    function afterSubmit(context) {
    }


    //查找未占用的TO单开始占用本PO单
    function occPobyTo(rec) {
        var type = rec.getValue('custbody_dps_type')
        //计划/备库存采购 才进行TO的占用
        if (type == '2') {
            //查询到的TO单的结果
            var toInfoJson = getUnOccToData(rec)
            log.audit('toInfoJson', toInfoJson);
            var line = rec.getLineCount({ sublistId: 'item' })
            //后续需要更新的TO单剩余数量的JSON
            var toConsumeJson = {}
            for (var i = 0; i < line; i++) {
                var quantity = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }))
                if (quantity) {
                    var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var needCount = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', line: i });
                    var toItemArray = toInfoJson[item]
                    //关联调拨单记录创建
                    var linkRec = record.create({ type: 'customrecord_realted_transfer_head', isDynamic: false });
                    linkRec.setValue({ fieldId: 'name', value: 'PO:' + rec.getValue('tranid') + ":" + (i + 1) })
                    var linkIndex = 0
                    var occCount = 0
                    if (toItemArray && toItemArray.length > 0) {
                        for (var j in toItemArray) {
                            log.audit('needCount', j+":"+needCount);
                            var toCount = toItemArray[j].toCount
                            var toId = toItemArray[j].toId
                            var toLine = toItemArray[j].toLine
                            if (needCount <= 0) break;
                            //当前数量比需要的数量多
                            linkRec.setSublistValue({ sublistId: 'recmachcustrecord__realted_transfer_head', fieldId: 'custrecord_transfer_code', value: toId, line: linkIndex });
                            var thisCount = 0
                            if (toCount > needCount) {
                                thisCount = needCount
                                needCount = 0
                            }
                            //当前数量比需要的数量相等或更少
                            else {
                                thisCount = toCount
                                needCount = needCount - toCount
                            }
                            //记录待会要更新的TO记录的剩余占用数量
                            if (!toConsumeJson[toId]) {
                                toConsumeJson[toId] = new Array()
                            }
                            toConsumeJson[toId].push({
                                line: toLine,
                                count: thisCount
                            })
                            occCount += thisCount
                            linkRec.setSublistValue({ sublistId: 'recmachcustrecord__realted_transfer_head', fieldId: 'custrecord_transfer_quantity', value: thisCount, line: linkIndex });
                            linkIndex++
                        }
                        var linkId = linkRec.save()
                        //设置关联单
                        rec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_realted_transfer_detail',
                            value: linkId,
                            line: i
                        });
                        calculatePoDetail(rec, occCount, i)
                    }
                }
            }
            //消减TO单上的剩余可占用数量
            discountToRemain(toConsumeJson)
        }
    }


    //获取未占用完的TO单
    function getUnOccToData(poRec) {
        var itemJSon = {}
        var line = poRec.getLineCount({ sublistId: 'item' })
        var itemArray = new Array()
        for (var i = 0; i < line; i++) {
            var item = poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (itemArray.indexOf(item) == -1) {
                itemArray.push(item);
            }
        }
        if (itemArray.length == 0) return itemJSon;
        var subsidiary = poRec.getValue('subsidiary')
        search.create({
            type: 'transferorder',
            filters: [
                { "name": "mainline", "operator": "is", "values": ["F"] },
                { "name": "taxline", "operator": "is", "values": ["F"] },
                { "name": "type", "operator": "anyof", "values": ["TrnfrOrd"] },
                { "name": "transactionlinetype", "operator": "anyof", "values": ["ITEM"] },
                { "name": "status", "operator": "noneof", "values": ["TrnfrOrd:H"] },
                { "name": "custcol_dps_unocc_po_quantity", "operator": "greaterthan", "values": ["0"] },
                { "name": "item", "operator": "anyof", "values": itemArray },
                { "name": "subsidiary", "operator": "anyof", "values": [subsidiary] }],
            columns: [
                { "name": "internalid", "label": "内部标识", "type": "select", "sortdir": "NONE" },//0
                { "name": "subsidiary", "label": "子公司", "type": "select", "sortdir": "NONE" },//1
                { "name": "item", "label": "货品", "type": "select", "sortdir": "NONE" },//2
                { "name": "custcol_dps_unocc_po_quantity", "label": "未占用数量", "type": "text", "sortdir": "NONE" },//3
                { "name": "datecreated", "label": "创建日期", "type": "datetime", "sortdir": "ASC" },//4
                { "name": "linesequencenumber", "label": "行序号", "type": "integer" }]//5
        }).run().each(function (rec) {
            var item = rec.getValue(rec.columns[2])
            var toId = rec.getValue(rec.columns[0])
            var toLine = Number(rec.getValue(rec.columns[5])) - 1
            var quantity = Number(rec.getValue(rec.columns[3]))
            if (!itemJSon[item]) {
                itemJSon[item] = new Array()
            }
            itemJSon[item].push({
                itemId: item,
                toCount: quantity,
                toId: toId,
                toLine: toLine
            })
            return true;
        });
        return itemJSon
    }

    //重新计算整个PO单明细
    function calculatePoDetail(poRec, count, PoLine) {
        var already = poRec.getValue('custbody_transferred_quantity')
        var need = poRec.getValue('custbody_available_transferred_quantit')
        already = Number(already) + count
        need = Number(need) - count
        poRec.setValue({ fieldId: 'custbody_transferred_quantity', value: already })
        poRec.setValue({ fieldId: 'custbody_available_transferred_quantit', value: need })
        //更新行明细汇总
        var alreadyL = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', line: PoLine })
        var needL = poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', line: PoLine })
        alreadyL = Number(alreadyL) + count
        needL = Number(needL) - count
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_transferred_quantity', value: alreadyL, line: PoLine });
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcoltransferable_quantity', value: needL, line: PoLine });
        //更新可使用发票与已使用发票金额
        // //已开票
        // var alreadySum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', line: PoLine }))
        //税率
        var rate = poRec.getSublistValue({ sublistId: 'item', fieldId: 'taxrate1', line: PoLine })
        //单价
        var price = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: PoLine }))
        //已使用发票
        var alreadyUseSum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_used_invoice_amount', line: PoLine }))
        //可使用发票
        var alreadyCanUseSum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', line: PoLine }))
        //可使用汇总
        var allAlreadyCanUseSum = Number(poRec.getValue('custbody_available_invoice_amount'))
        var allAlreadyUseSum = Number(poRec.getValue('custbody_used_invoice_amount'))
        var amount = count * price * ((100 + rate) / 100)
        alreadyUseSum += amount
        alreadyCanUseSum = alreadyCanUseSum - amount
        allAlreadyUseSum += amount
        allAlreadyCanUseSum = allAlreadyCanUseSum - amount
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_invoice_amount_available', value: alreadyCanUseSum, line: PoLine });
        poRec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_used_invoice_amount', value: alreadyUseSum, line: PoLine });
        poRec.setValue({ fieldId: 'custbody_available_invoice_amount', value: allAlreadyCanUseSum })
        poRec.setValue({ fieldId: 'custbody_used_invoice_amount', value: allAlreadyUseSum })
        return poRec
    }

    //消减TO单上的剩余可占用数量
    function discountToRemain(toConsumeJson) {
        for (var key in toConsumeJson) {
            var rec = record.load({
                type: 'transferorder',
                id: key,
                isDynamic: false
            });
            var toLineInfoArray = toConsumeJson[key];
            log.debug('toConsumeJson', JSON.stringify(toConsumeJson));
            for (var i in toLineInfoArray) {
                var line = toLineInfoArray[i].line
                var count = toLineInfoArray[i].count
                var itemId = toLineInfoArray[i].item;

                var lineNumber = rec.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    value: itemId
                });
                   
                // var nowCount = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_unocc_po_quantity', line: line }))
                var nowCount = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_unocc_po_quantity', line: lineNumber }));
                var remainCount = nowCount - count
                // rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_unocc_po_quantity', value: remainCount, line: line });
                rec.setSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_unocc_po_quantity', value: remainCount, line: lineNumber });
            }
            rec.save();
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
