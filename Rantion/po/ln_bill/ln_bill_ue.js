/*
 * @Author         : Bong
 * @Version        : 1.0
 * @Date           : 2020-09-22 17:09:16
 * @LastEditTime   : 2020-09-22 17:09:16
 * @LastEditors    : Bong
 * @Description    : 
 * @FilePath       : \Rantion\po\ln_bill\ln_bill_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../../Helper/config.js', 'N/search', 'N/record', 'N/runtime', 'N/url', 'N/ui/dialog', 'N/https', "N/format", "./../../Helper/core.min"], function (config, search, record, runtime, url, dialog, https, format, aio) {

    function beforeLoad(context) {
        var newRec = context.newRecord;
        try {
            if (context.type == context.UserEventType.CREATE) {
                var request = context.request;
                if (request) {
                    log.debug('request', request);
                    var form = context.form;
                    if (request.parameters.lnBill) {
                        var entity = request.parameters.entity;
                        var subsidiary = request.parameters.subsidiary;
                        var currency = request.parameters.currency;
                        var lnids = request.parameters.lnids.split(',');
                        if (!entity || !subsidiary || lnids.length <= 0 || !currency) {
                            log.error('错误', '缺少必要参数，交易主体、供应商、交货单号、货币其中一项或多项');
                            return false;
                        }
                        newRec.setValue({
                            fieldId: 'currency',
                            value: currency
                        });
                        // var numLines = newRec.getLineCount({
                        //     sublistId: 'item'
                        // });
                        log.debug("lnids", lnids);
                        // log.debug("numLines", numLines);
                        var skus = [];
                        var lnBillNo = '';
                        newRec.setValue({
                            fieldId: 'custbody_ln_bill_arr',
                            value: request.parameters.lnids
                        });

                        for (var i = 0; i < lnids.length; i++) {
                            var lnRec = record.load({
                                type: 'customrecord_dps_delivery_order',
                                id: lnids[i]
                            });
                            var poName = lnRec.getText({
                                fieldId: 'custrecord_purchase_order_no'
                            });
                            var lnDate = lnRec.getText({
                                fieldId: 'custrecord_dps_warehous_date'
                            });
                            if (lnRec.getValue({
                                    fieldId: 'custrecord_delivery_bill'
                                })) {
                                lnBillNo = true;
                            }
                            log.debug('lnid', lnids[i]);
                            var line = lnRec.getLineCount({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id'
                            });
                            log.debug("line", line);
                            for (var j = 0; j < line; j++) {
                                var itemSku = lnRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_item_sku',
                                    line: j
                                });
                                var itemQuantity = lnRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_stock_quantity',
                                    line: j
                                });
                                var itemPrice = lnRec.getSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_unit_price',
                                    line: j
                                }).toFixed(2);
                                skus.push({
                                    itemSku: itemSku,
                                    itemQuantity: itemQuantity,
                                    itemPrice: itemPrice,
                                    lnName: lnids[i],
                                    lnDate: lnDate,
                                    poName: poName
                                });
                                log.debug("itemSku", itemSku);
                                log.debug("itemQuantity", itemQuantity);
                                log.debug("itemPrice", itemPrice);
                            }
                        }
                        if (lnBillNo) {
                            log.error('错误', '对应交货单已有账单');
                            return false;
                        }
                        log.debug("skus", skus);

                        var usertotal = 0,
                            taxtotal = 0;
                        for (var i = 0; i < skus.length; i++) {
                            newRec.insertLine({
                                sublistId: 'item',
                                line: i
                            });
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                line: i,
                                value: skus[i].itemSku
                            }); //货品
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                line: i,
                                value: skus[i].itemQuantity
                            }); //数量
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                line: i,
                                value: skus[i].itemPrice
                            }); //单价
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i,
                                value: skus[i].itemPrice * skus[i].itemQuantity
                            }); //不含税总金额
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_ln',
                                line: i,
                                value: skus[i].lnName
                            }); //对应交货单号
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_ln_date',
                                line: i,
                                value: skus[i].lnDate
                            }); //对应交货单入库时间
                            newRec.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_dps_po',
                                line: i,
                                value: skus[i].poName
                            }); //对应po单号
                            if (subsidiary == 5) {
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxcode',
                                    line: i,
                                    value: 6
                                }); //税码
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxrate',
                                    line: i,
                                    value: 0
                                }); //该字段不可修改
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'tax1amt',
                                    line: i,
                                    value: 0
                                }); //总税额
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'grossamt',
                                    line: i,
                                    value: skus[i].itemPrice * skus[i].itemQuantity
                                }); //总金额
                                usertotal += skus[i].itemPrice * skus[i].itemQuantity * 1;
                                taxtotal += 0;
                            } else {
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxcode',
                                    line: i,
                                    value: 7
                                }); //税码
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'taxrate',
                                    line: i,
                                    value: 13
                                }); //该字段不可修改
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'tax1amt',
                                    line: i,
                                    value: skus[i].itemPrice * skus[i].itemQuantity * 0.13
                                }); //总税额
                                newRec.setSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'grossamt',
                                    line: i,
                                    value: skus[i].itemPrice * skus[i].itemQuantity * 1.13
                                }); //总金额
                                usertotal += skus[i].itemPrice * skus[i].itemQuantity * 1.13;
                                taxtotal += skus[i].itemPrice * skus[i].itemQuantity * 0.13;
                            }
                        }
                    } else {
                        // var poIds = request.parameters.poids.split(',');
                        // newRec.setValue({
                        //     fieldId: 'custbody_po_bill_arr',
                        //     value: request.parameters.poids
                        // });
                        // var hasBill = false;
                        // var filters = [];
                        // filters.push({
                        //     name: 'custrecord_delivery_order_status',
                        //     operator: 'is',
                        //     values: '4'
                        // });

                        // filters.push({
                        //     name: 'custrecord_purchase_order_no',
                        //     operator: 'anyof',
                        //     values: poIds
                        // });

                        // var poSearch = search.create({
                        //     type: 'customrecord_dps_delivery_order',
                        //     filters: filters,
                        //     columns: [
                        //         'internalid', 'custrecord_delivery_bill'
                        //     ]
                        // }).run().each(function (result) {
                        //     if (result.getValue('custrecord_delivery_bill').length > 0 && result.getValue('custrecord_delivery_bill') != '未生成') {
                        //         hasBill = true
                        //         return false;
                        //     }
                        //     return true;
                        // });

                        // if (hasBill) {
                        //     log.error('错误', '采购单对应交货单已有账单');
                        //     var numLines = newRec.getLineCount({
                        //         sublistId: 'item'
                        //     });
                        //     for (var i = numLines - 1; i >= 0; i--) {
                        //         newRec.removeLine({
                        //             sublistId: 'item',
                        //             line: i
                        //         });
                        //     }
                        // }
                    }
                }
            }
        } catch (e) {
            log.error("beforeLoad error:", e)
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var rec = context.newRecord;
        if (context.type == 'create') {
            if (rec.getValue('custbody_ln_bill_arr')) {
                log.debug('rec', rec);
                var lnids = rec.getValue('custbody_ln_bill_arr').split(',');
                log.debug('name', rec.getValue('name'))
                log.debug('transactionnumber', rec.getValue('transactionnumber'));
                for (var i = 0; i < lnids.length; i++) {
                    var skus = [];
                    var lnRec = record.load({
                        type: 'customrecord_dps_delivery_order',
                        id: lnids[i]
                    });
                    lnRec.setValue({
                        fieldId: 'custrecord_delivery_bill',
                        value: (rec.id).toString()
                    });
                    lnRec.save();
                    var poId = lnRec.getValue('custrecord_purchase_order_no');
                    log.error('poId', poId);
                    var line = lnRec.getLineCount({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });
                    for (var j = 0; j < line; j++) {
                        var itemSku = lnRec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_item_sku',
                            line: j
                        });
                        var itemQuantity = lnRec.getSublistValue({
                            sublistId: 'recmachcustrecord_dps_delivery_order_id',
                            fieldId: 'custrecord_stock_quantity',
                            line: j
                        });
                        skus.push({
                            itemSku: itemSku,
                            itemQuantity: itemQuantity
                        });
                    }
                    // var poRec = record.load({
                    //     type: 'purchaseorder',
                    //     id: poId
                    // });

                    // var poLine = poRec.getLineCount({
                    //     sublistId: 'item'
                    // });

                    // for (var z = 0; z < poLine; z++) {
                    //     var item = poRec.getSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'item',
                    //         line: z
                    //     });
                    //     for (var x = 0; x < skus.length; x++) {
                    //         log.error("item", item);
                    //         log.error('skus', skus[x].itemSku);
                    //         if (item == skus[x].itemSku) {
                    //             log.error('skus', skus[x].itemQuantity)
                    //             var billed = poRec.getSublistValue({
                    //                 sublistId: 'item',
                    //                 fieldId: 'quantitybilled',
                    //                 line: z
                    //             });
                    //             log.error("billed", billed);
                    //             log.error('lastNum', Number(skus[x].itemQuantity) + Number(billed));
                    //             poRec.setSublistValue({
                    //                 sublistId: 'item',
                    //                 fieldId: 'quantitybilled',
                    //                 value: Number(skus[x].itemQuantity) + Number(billed),
                    //                 line: z
                    //             });
                    //         }
                    //     }
                    // }
                    // log.error("poRec", poRec)
                    // poRec.save();
                }
            } else if (rec.getValue('custbody_po_bill_arr')) {
                // var poIds = rec.getValue('custbody_po_bill_arr').split(',');
                // var filters = [];
                // filters.push({
                //     name: 'custrecord_delivery_order_status',
                //     operator: 'is',
                //     values: '4'
                // });

                // filters.push({
                //     name: 'custrecord_purchase_order_no',
                //     operator: 'anyof',
                //     values: poIds
                // });

                // var poSearch = search.create({
                //     type: 'customrecord_dps_delivery_order',
                //     filters: filters,
                //     columns: [
                //         'internalid'
                //     ]
                // }).run().each(function (result) {
                //     log.error("result", result.getValue('internalid'));
                //     var updateId = record.submitFields({
                //         type: 'customrecord_dps_delivery_order',
                //         id: result.getValue('internalid'),
                //         values: {
                //             custrecord_delivery_bill: (rec.id).toString()
                //         }
                //     });
                //     return true;
                // });
            }
        }
        return true;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});