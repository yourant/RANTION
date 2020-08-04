/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function beforeLoad(context) {

    }


    function beforeSubmit(context) {
        var newRec = context.newRecord;
        var line = newRec.getLineCount({
            sublistId: 'item'
        })
        for (var i = 0; i < line; i++) {
            var quantity = newRec.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });

            log.debug("quantity: " + quantity, "Number(quantity): " + Number(quantity));
            newRec.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_dps_unocc_po_quantity',
                value: Number(quantity),
                line: i
            });
        }
    }


    /**
     * 主要功能，根据TO单判断符合条件的PO单的SKU明细行，然后逐个去占用PO单的SKU
     * @param {} context 
     */
    function afterSubmit(context) {

        try {

            var newRec = context.newRecord;
            var type = context.type;
            if (type == "create") {
                var subsidiary = newRec.getValue('subsidiary')
                var line = newRec.getLineCount({
                    sublistId: 'item'
                })
                var itemArray = new Array()
                var itemJson = {}
                for (var i = 0; i < line; i++) {
                    var item = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    })
                    var quantity = newRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    })
                    var exist = false
                    for (var j = 0; j < itemArray.length; j++) {
                        if (itemArray[j] == item) {
                            exist = true;
                            break;
                        }
                    }
                    if (!exist) {
                        itemArray.push(item)
                    }
                    if (itemJson[item]) {
                        quantity += itemJson[item]
                    }
                    itemJson[item] = quantity
                }
                if (itemArray.length > 0) {
                    //拿出符合条件的所有采购单的行明细，然后再一一拿出来再做占用处理
                    var purcharseInfo = {}
                    log.audit('subsidiary', subsidiary);
                    log.audit('itemArray', itemArray);
                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                                name: "mainline",
                                operator: "is",
                                values: ["F"]
                            },
                            {
                                name: "taxline",
                                operator: "is",
                                values: ["F"]
                            },
                            {
                                name: "item",
                                operator: "noneof",
                                values: ["@NONE@"]
                            },
                            {
                                name: "type",
                                operator: "anyof",
                                values: ["PurchOrd"]
                            },
                            {
                                name: "custbody_dps_type",
                                operator: "anyof",
                                values: ["2"]
                            },
                            {
                                name: "subsidiary",
                                operator: "is",
                                values: [subsidiary]
                            },
                            {
                                name: "item",
                                operator: "anyof",
                                values: itemArray
                            }
                        ],
                        columns: [{
                                name: "datecreated",
                                label: "日期",
                                type: "date",
                                sort: "ASC"
                            }, //0
                            {
                                name: "subsidiary",
                                label: "子公司",
                                type: "select"
                            }, //1
                            {
                                name: "custbody_dps_type",
                                label: "采购订单类型",
                                type: "select"
                            }, //2
                            {
                                name: "line",
                                label: "行Id",
                                type: "integer"
                            }, //3
                            {
                                name: "item",
                                label: "货品名称",
                                type: "select"
                            }, //4
                            {
                                name: "quantity",
                                label: "采购数量",
                                type: "float"
                            }, //5
                            {
                                name: "custcoltransferable_quantity",
                                label: "可调拨数量",
                                type: "float"
                            }, //6
                            {
                                name: "custcol_transferred_quantity",
                                label: "已调拨数量",
                                type: "float"
                            }, //7
                            {
                                name: "custcol_realted_transfer_detail",
                                label: "关联调拨单号",
                                type: "select"
                            } //8
                        ]
                    }).run().each(function (rec) {
                        var value = {
                            item: rec.getValue(rec.columns[4]),
                            quantity: rec.getValue(rec.columns[5]),
                            needCount: rec.getValue(rec.columns[6]),
                            alreadyCount: rec.getValue(rec.columns[7]),
                            line: rec.getValue(rec.columns[3]),
                            link: rec.getValue(rec.columns[8])
                        }
                        if (purcharseInfo[rec.id]) {
                            purcharseInfo[rec.id].push(value)
                        } else {
                            purcharseInfo[rec.id] = [value]
                        }
                        return true;
                    });
                    log.audit('purcharseInfo', purcharseInfo);
                    linkToData2PurchaseOrder(purcharseInfo, itemJson, newRec.id)
                }
            }
            if (type == "edit") {
                var status;
                search.create({
                    type: 'transferorder',
                    filters: [{
                            name: "mainline",
                            operator: "is",
                            values: ["T"]
                        },
                        {
                            name: "internalId",
                            operator: "is",
                            values: newRec.id
                        },
                    ],
                    columns: [{
                        name: "statusref"
                    }, ]
                }).run().each(function (rec) {
                    status = rec.getValue(rec.columns[0]);
                    return false;
                });
                log.audit('status', status);
                //关闭订单的时候 需要将之前占用的数据取消掉
                if (status && status == "closed") {
                    var detailArray = new Array()
                    var detailJson = {}
                    search.create({
                        type: "customrecord_transfer_order_details",
                        filters: [{
                            name: 'custrecord_transfer_code',
                            operator: 'is',
                            values: newRec.id
                        }, ],
                        columns: [{
                                "name": "custrecord_transfer_quantity",
                                "label": "调拨数量",
                                "type": "float"
                            },
                            {
                                "name": "internalid",
                                "join": "CUSTRECORD__REALTED_TRANSFER_HEAD",
                                "label": "内部标识",
                                "type": "select"
                            },
                            {
                                "name": "custrecord_transfer_code",
                                "label": "转移单号",
                                "type": "select"
                            }
                        ]
                    }).run().each(function (rec) {
                        detailArray.push(rec.getValue(rec.columns[1]))
                        if (!detailJson[rec.getValue(rec.columns[1])]) {
                            detailJson[rec.getValue(rec.columns[1])] = new Array()
                        }
                        detailJson[rec.getValue(rec.columns[1])].push({
                            count: rec.getValue(rec.columns[0]),
                            id: rec.id
                        })
                        return true;
                    });
                    if (detailArray.length > 0) {
                        //拿出符合条件的所有采购单的行明细，然后再一一拿出来再做占用处理
                        var purcharseInfo = {}
                        log.audit('detailJson', detailJson);
                        search.create({
                            type: 'purchaseorder',
                            filters: [{
                                    name: "mainline",
                                    operator: "is",
                                    values: ["F"]
                                },
                                {
                                    name: "taxline",
                                    operator: "is",
                                    values: ["F"]
                                },
                                {
                                    name: "custcol_realted_transfer_detail",
                                    operator: "anyof",
                                    values: detailArray
                                },
                                {
                                    name: "item",
                                    operator: "noneof",
                                    values: ["@NONE@"]
                                },
                                {
                                    name: "type",
                                    operator: "anyof",
                                    values: ["PurchOrd"]
                                },
                                {
                                    name: "custbody_dps_type",
                                    operator: "anyof",
                                    values: ["2"]
                                },
                            ],
                            columns: [{
                                    name: "datecreated",
                                    label: "日期",
                                    type: "date",
                                    sort: "DESC"
                                }, //0
                                {
                                    name: "subsidiary",
                                    label: "子公司",
                                    type: "select"
                                }, //1
                                {
                                    name: "custbody_dps_type",
                                    label: "采购订单类型",
                                    type: "select"
                                }, //2
                                {
                                    name: "line",
                                    label: "行Id",
                                    type: "integer"
                                }, //3
                                {
                                    name: "item",
                                    label: "货品名称",
                                    type: "select"
                                }, //4
                                {
                                    name: "quantity",
                                    label: "采购数量",
                                    type: "float"
                                }, //5
                                {
                                    name: "custcoltransferable_quantity",
                                    label: "可调拨数量",
                                    type: "float"
                                }, //6
                                {
                                    name: "custcol_transferred_quantity",
                                    label: "已调拨数量",
                                    type: "float"
                                }, //7
                                {
                                    name: "custcol_realted_transfer_detail",
                                    label: "关联调拨单号",
                                    type: "select"
                                } //8
                            ]
                        }).run().each(function (rec) {
                            var value = {
                                item: rec.getValue(rec.columns[4]),
                                quantity: rec.getValue(rec.columns[5]),
                                needCount: rec.getValue(rec.columns[6]),
                                alreadyCount: rec.getValue(rec.columns[7]),
                                line: rec.getValue(rec.columns[3]),
                                link: rec.getValue(rec.columns[8])
                            }
                            if (purcharseInfo[rec.id]) {
                                purcharseInfo[rec.id].push(value)
                            } else {
                                purcharseInfo[rec.id] = [value]
                            }
                            return true;
                        });
                        log.audit('purcharseInfo', purcharseInfo);
                        cancelLink2PurchaseOrder(purcharseInfo, detailJson)
                    }
                }
            }
            var custbody_dps_fu_rec_link = newRec.getValue('custbody_dps_fu_rec_link');
            log.audit('custbody_dps_fu_rec_link', custbody_dps_fu_rec_link)
            if (custbody_dps_fu_rec_link != null && custbody_dps_fu_rec_link) {
                var custrecord_dps_declare_currency_dh;
                var custrecord_dps_declared_value_dh = 0;;
                search.create({
                    type: 'customrecord_transfer_order_details',
                    filters: [{
                        name: 'custrecord_transfer_code',
                        operator: 'anyof',
                        values: newRec.id
                    }],
                    columns: [{
                            name: 'custrecord__realted_transfer_head'
                        },
                        {
                            name: 'custrecord_transfer_quantity'
                        }
                    ]
                }).run().each(function (rec1) {
                    var custrecord__realted_transfer_head = rec1.getValue('custrecord__realted_transfer_head');
                    var custrecord_transfer_quantity = rec1.getValue('custrecord_transfer_quantity');
                    log.debug('custrecord__realted_transfer_head', custrecord__realted_transfer_head);
                    log.debug('custrecord_transfer_quantity', custrecord_transfer_quantity);

                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                                name: "mainline",
                                operator: "is",
                                values: ["F"]
                            },
                            {
                                name: "taxline",
                                operator: "is",
                                values: ["F"]
                            },
                            {
                                name: "item",
                                operator: "noneof",
                                values: ["@NONE@"]
                            },
                            {
                                name: "type",
                                operator: "anyof",
                                values: ["PurchOrd"]
                            },
                            {
                                name: "custbody_dps_type",
                                operator: "anyof",
                                values: ["2"]
                            },
                            // { name: "subsidiary", operator: "is", values: [subsidiary] },
                            // { name: "item", operator: "anyof", values: itemArray },
                            {
                                name: 'custcol_realted_transfer_detail',
                                operator: "anyof",
                                values: custrecord__realted_transfer_head
                            }
                        ],
                        columns: [{
                                name: "quantity",
                                label: "采购数量",
                                type: "float"
                            },
                            {
                                name: "custcol_realted_transfer_detail",
                                label: "关联调拨单号",
                                type: "select"
                            },
                            {
                                name: "rate"
                            },
                            {
                                name: 'currency'
                            }
                        ]
                    }).run().each(function (result) {
                        log.debug("testest1 ", JSON.stringify(result));
                        custrecord_dps_declare_currency_dh = result.getValue('currency');
                        var value = {
                            quantity: result.getValue('quantity'),
                            link: result.getValue('custcol_realted_transfer_detail')
                        }
                        custrecord_dps_declared_value_dh = custrecord_dps_declared_value_dh + result.getValue('rate') * custrecord_transfer_quantity;
                        log.debug("testest ", JSON.stringify(value));
                        return true;
                    });
                    return true;
                });
                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: custbody_dps_fu_rec_link,
                    values: {
                        custrecord_dps_declared_value_dh: custrecord_dps_declared_value_dh,
                        custrecord_dps_declare_currency_dh: custrecord_dps_declare_currency_dh
                    }
                });
            }
        } catch (error) {
            log.error('保存库存转移订单出错了', error);
        }
    }

    /**
     * 将TO单上的货品数量占用采购单上的货品
     * @param {} purcharseInfo 
     * @param {*} itemJson 
     */
    function linkToData2PurchaseOrder(purcharseInfo, itemJson, ToId) {
        var purchaseNeedSaveJson = {}
        for (var key in purcharseInfo) {
            for (var i in purcharseInfo[key]) {
                var purchaseData = purcharseInfo[key][i]
                var needCount = getRemainCount(purchaseData.needCount, purchaseData.quantity)
                if (needCount) {
                    //拿出TO单上符合该条件的货品和数量
                    var itemKey = purchaseData.item
                    var ToCount = itemJson[itemKey]
                    if (ToCount && ToCount > 0) {
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
                        var actuallyCount
                        //当库存转移比实际的采购的数量要多的情况
                        if (ToCount >= needCount) {
                            actuallyCount = needCount
                            itemJson[itemKey] = ToCount - needCount
                        }
                        //当库存转移比实际的采购的数量要少的情况
                        if (ToCount < needCount) {
                            actuallyCount = ToCount
                            itemJson[itemKey] = 0
                        }
                        log.audit('执行采购订单关联', poRec.id);
                        purchaseNeedSaveJson[key] = createToLinkRecord(poRec, purchaseData.line, actuallyCount, purchaseData.link, ToId)

                    }
                }
            }
        }
        for (var key in purchaseNeedSaveJson) {
            var poRec = purchaseNeedSaveJson[key];
            try {
                poRec.save();
            } catch (error) {
                log.debug('transferoder_po', JSON.stringify(error));
            }
        }
        //开始计算用掉了多少数量，然后再更新TO货品行数据
        refreshItemCount(itemJson, ToId)
    }

    /**
     * 创建关联记录并赋值给采购单的货品行
     * @param {*} poRec 
     * @param {*} PoLine 
     * @param {*} count 
     * @param {*} linkId 
     * @param {*} ToId 
     */
    function createToLinkRecord(poRec, PoLine, count, linkId, ToId) {
        PoLine = PoLine - 1
        //之前有未占完的情况
        if (linkId) {
            var linkRec = record.load({
                type: 'customrecord_realted_transfer_head',
                id: linkId
            });
            var linkLine = linkRec.getLineCount({
                sublistId: 'recmachcustrecord__realted_transfer_head'
            })
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
            var linkRec = record.create({
                type: 'customrecord_realted_transfer_head',
                isDynamic: false
            });
            linkRec.setValue({
                fieldId: 'name',
                value: 'PO:' + poRec.getValue('tranid') + ":" + (PoLine + 1)
            })
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
                line: PoLine
            });
        }
        log.audit('采购单号与TO单号', poRec.id + " " + ToId);
        //更新头部汇总
        var already = poRec.getValue('custbody_transferred_quantity')
        var need = poRec.getValue('custbody_available_transferred_quantit')
        already = Number(already) + count
        need = Number(need) - count
        poRec.setValue({
            fieldId: 'custbody_transferred_quantity',
            value: already
        })
        poRec.setValue({
            fieldId: 'custbody_available_transferred_quantit',
            value: need
        })
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
        alreadyL = Number(alreadyL) + count
        needL = Number(needL) - count
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
        //更新可使用发票与已使用发票金额
        // //已开票
        // var alreadySum = Number(poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_invoiced_amount', line: PoLine }))
        //税率
        var rate = poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'taxrate1',
            line: PoLine
        })
        //单价
        var price = Number(poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'rate',
            line: PoLine
        }))
        //已使用发票
        var alreadyUseSum = Number(poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_used_invoice_amount',
            line: PoLine
        }))
        //可使用发票
        var alreadyCanUseSum = Number(poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_invoice_amount_available',
            line: PoLine
        }))
        //可使用汇总
        var allAlreadyCanUseSum = Number(poRec.getValue('custbody_available_invoice_amount'))
        var allAlreadyUseSum = Number(poRec.getValue('custbody_used_invoice_amount'))
        var amount = count * price * ((100 + rate) / 100)
        alreadyUseSum += amount
        alreadyCanUseSum = alreadyCanUseSum - amount
        allAlreadyUseSum += amount
        allAlreadyCanUseSum = allAlreadyCanUseSum - amount
        poRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_invoice_amount_available',
            value: alreadyCanUseSum,
            line: PoLine
        });
        poRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_used_invoice_amount',
            value: alreadyUseSum,
            line: PoLine
        });
        poRec.setValue({
            fieldId: 'custbody_available_invoice_amount',
            value: allAlreadyCanUseSum
        })
        poRec.setValue({
            fieldId: 'custbody_used_invoice_amount',
            value: allAlreadyUseSum
        })
        return poRec;
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
                                log.audit('执行采购订单关联', poRec.id);
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
            var alreadySave = false
            record.delete({
                type: 'customrecord_transfer_order_details',
                id: detailId
            });
            var momentCount = 0;
            search.create({
                type: "customrecord_transfer_order_details",
                filters: [{
                    name: 'internalid',
                    join: 'custrecord__realted_transfer_head',
                    operator: 'is',
                    values: linkId
                }, ],
                columns: []
            }).run().each(function (rec) {
                momentCount += 1
                return true;
            });
            if (momentCount == 0) {
                poRec.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_realted_transfer_detail',
                    value: '',
                    line: PoLine
                });
                poRec.save()
                poRec = record.load({
                    type: 'purchaseorder',
                    id: poRec.id
                });
                record.delete({
                    type: 'customrecord_realted_transfer_head',
                    id: linkId
                });
            }
            log.audit('采购单号与行号数量', poRec.id + "---" + PoLine + "---" + count);
            //更新头部汇总
            var already = poRec.getValue('custbody_transferred_quantity')
            var need = poRec.getValue('custbody_available_transferred_quantit')
            already = Number(already) - count
            need = Number(need) + count
            poRec.setValue({
                fieldId: 'custbody_transferred_quantity',
                value: already
            })
            poRec.setValue({
                fieldId: 'custbody_available_transferred_quantit',
                value: need
            })
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

    //计算并更新未占用的数量
    function refreshItemCount(itemJson, ToId) {
        var toRec = record.load({
            type: 'transferorder',
            id: ToId
        });
        var line = toRec.getLineCount({
            sublistId: 'item'
        })
        var hasChange;
        for (var key in itemJson) {
            //占用完后剩余的数量
            var remainCount = itemJson[key]
            for (var i = 0; i < line; i++) {
                var item = toRec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                })
                if (item == key) {
                    var quantity = Number(toRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    }))
                    if (quantity) {
                        if (quantity > remainCount) {
                            toRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_unocc_po_quantity',
                                value: Number(remainCount),
                                line: i
                            });
                            itemJson[key] = 0
                            hasChange = true
                        } else {
                            remainCount = remainCount - quantity
                            itemJson[key] = remainCount
                        }
                    }
                }

            }
        }
        if (hasChange) {
            toRec.save()
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
        return Number(quantity)

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});