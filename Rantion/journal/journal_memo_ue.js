/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/record', 'N/ui/serverWidget', 'N/search'], function (log, record, serverWidget, search) {
    // 6	公司间交易
    // 5	固定资产/办公用品
    // 1	换货
    // 3	样品采购
    // 2	计划/备库存采购
    // 4	物料和配件
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {
        var journalRecord = scriptContext.newRecord;
        var type = journalRecord.type;
        var id = journalRecord.id;
        var orderType = journalRecord.getValue({ fieldId: 'ordertype' });
        var subsidiary = journalRecord.getValue({ fieldId: 'subsidiary' });
        log.debug("json", JSON.stringify(journalRecord));
        log.debug("order type", orderType);
        log.debug("subsidiary", subsidiary);
        var memo;
        log.debug("type", type);

        var filterArr = [];

        var modular;
        var process;
        var documentType;
        var documentList;
        var noNumber = {};
        switch (type) {
            case 'vendorprepayment':

                var purchaseorderId = journalRecord.getValue({ fieldId: 'purchaseorder' });
                if (purchaseorderId) {
                    modular = getCustrecordModular('采购模块');
                    process = getCustrecordProcess('采购订单');
                    documentList = 79;
                    var purchaseRecord = record.load({
                        type: 'purchaseorder',
                        id: purchaseorderId
                    });

                    var purchaseOrderType = purchaseRecord.getValue({ fieldId: 'custbody_dps_type' })
                    log.debug('purchaseOrderType', purchaseOrderType);
                    documentType = getPOTypeToDocumentType(purchaseOrderType);
                    log.debug('test purchaseOrderType', getPOTypeToDocumentType(purchaseOrderType))
                    var lineCount = purchaseRecord.getLineCount({
                        sublistId: 'recmachcustrecord_purchase_order_no'
                    })
                    var LNNO = '';
                    for (var i = 0; i < lineCount; i++) {
                        LNNO += '[' + purchaseRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_purchase_order_no',
                            fieldId: 'name',
                            line: i
                        }) + ']';
                    }
                    log.debug('LNNO', LNNO);

                    noNumber = {
                        PONO: purchaseRecord.getValue({ fieldId: 'tranid' }),
                        LNNO: LNNO
                    };
                }
                break;
            //
            case 'vendorprepaymentapplication':
                modular = getCustrecordModular('采购模块');
                process = getCustrecordProcess('采购订单');
                documentList = 80;

                var lineCount = journalRecord.getLineCount({
                    sublistId: 'bill'
                })
                log.debug('lineCount', lineCount);
                var poId;
                for (var i = 0; i < lineCount; i++) {
                    apply = journalRecord.getSublistValue({
                        sublistId: 'bill',
                        fieldId: 'apply',
                        line: i
                    });
                    log.debug('apply', apply);
                    if (apply) {
                        poId = journalRecord.getSublistValue({
                            sublistId: 'bill',
                            fieldId: 'createdfrom',
                            line: i
                        });
                    }
                }
                log.debug('purchaseorderId', poId);
                var purchaseOrderType;
                search.create({
                    type: 'purchaseorder',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: poId
                    }],
                    columns: ['custbody_dps_type', 'tranid']
                }).run().each(function (rec) {
                    purchaseOrderType = rec.getValue('custbody_dps_type');
                });
                log.debug('purchaseOrderType', purchaseOrderType);
                documentType = getPOTypeToDocumentType(purchaseOrderType);
                break;
            //账单付款
            case 'vendorpayment':
                modular = getCustrecordModular('采购模块');
                process = getCustrecordProcess('采购订单');
                documentList = 18;
                var billId = journalRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'internalid',
                    line: 0
                })

                var vendorbillRecord = record.load({
                    type: 'vendorbill',
                    id: billId
                });

                var lineCount = vendorbillRecord.getLineCount({
                    sublistId: 'purchaseorders'
                })
                log.debug('lineCount', lineCount);
                var poId;
                for (var i = 0; i < lineCount; i++) {
                    poId = vendorbillRecord.getSublistValue({
                        sublistId: 'purchaseorders',
                        fieldId: 'id',
                        line: i
                    });
                }
                log.debug('poId', poId);
                var purchaseRecord = record.load({
                    type: 'purchaseorder',
                    id: poId
                });

                var purchaseOrderType = purchaseRecord.getValue({ fieldId: 'custbody_dps_type' })
                log.debug('purchaseOrderType', purchaseOrderType);
                documentType = getPOTypeToDocumentType(purchaseOrderType);

                var lineCount = purchaseRecord.getLineCount({
                    sublistId: 'recmachcustrecord_purchase_order_no'
                })
                var LNNO = '';
                for (var i = 0; i < lineCount; i++) {
                    LNNO += '[' + purchaseRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_purchase_order_no',
                        fieldId: 'name',
                        line: i
                    }) + ']';
                }
                log.debug('LNNO', LNNO);

                // documentList = getDocumentList('Vendor Payment');
                noNumber = {
                    BillPaymentNO: journalRecord.getValue({ fieldId: 'transactionnumber' }),
                    LNNO: LNNO
                };
                break;
            //出库发运 2
            case 'itemfulfillment':
                documentList = 32;
                var orderid = journalRecord.getValue({ fieldId: 'orderid' });
                log.debug('orderid', orderid);
                if (orderType == 'SalesOrd') {
                    modular = getCustrecordModular('销售模块');
                    process = getCustrecordProcess('销售订单');
                    //custbody_order_type_fulfillment
                    var shipmentType;
                    var fba = getSaleShipmentType('FBA发货');
                    var fbm = getSaleShipmentType('FBM发货');
                    search.create({
                        type: 'salesorder',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: orderid
                        }],
                        columns: ['custbody_order_type_fulfillment']
                    }).run().each(function (rec) {
                        shipmentType = rec.getValue('custbody_order_type_fulfillment');
                    });
                    if (fba == shipmentType) {
                        documentType = getDocumentType('亚马逊FBA订单');
                    }
                    if (fbm == shipmentType) {
                        documentType = getDocumentType('亚马逊FBM订单');
                    }
                } else if (orderType == 'RtnAuth') {
                    modular = getCustrecordModular('采购模块');
                    process = getCustrecordProcess('采购退货订单');
                    documentType = getDocumentType('采购退货');
                    //vendorreturnauthorization createdfrom

                    var vendorreturnauthorization = record.load({
                        type: 'vendorreturnauthorization',
                        id: orderid
                    });

                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: vendorreturnauthorization.getValue({ fieldId: 'createdfrom' })
                        }],
                        columns: ['tranid']
                    }).run().each(function (rec) {
                        noNumber = {
                            RONO: '[' + journalRecord.getValue({ fieldId: 'transactionnumber' }) + ']',
                            PONO: '[' + rec.getValue('tranid') + ']'
                        }
                    });


                }
                // documentList = getDocumentList('Item Fulfillment');

                break;
            //应收发票
            case 'invoice':
                documentList = 7;
                modular = getCustrecordModular('销售模块');
                process = getCustrecordProcess('销售订单');
                //custbody_order_type_fulfillment
                var shipmentType;
                var fba = getSaleShipmentType('FBA发货');
                var fbm = getSaleShipmentType('FBM发货');
                search.create({
                    type: 'salesorder',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: journalRecord.getValue({ fieldId: 'createdfrom' })
                    }],
                    columns: ['custbody_order_type_fulfillment']
                }).run().each(function (rec) {
                    shipmentType = rec.getValue('custbody_order_type_fulfillment');
                });
                log.debug('shipmentType', shipmentType);
                log.debug('fba', fba);
                log.debug('fbm', fbm);
                if (fba === shipmentType) {
                    documentType = getDocumentType('亚马逊FBA订单');
                }
                if (fbm === shipmentType) {
                    documentType = getDocumentType('亚马逊FBM订单');
                }
                break;
            //账单
            case 'vendorbill':
                modular = getCustrecordModular('采购模块');
                process = getCustrecordProcess('采购订单');
                documentList = 17;
                var vendorbillRecord = record.load({
                    type: 'vendorbill',
                    id: id
                });

                var lineCount = vendorbillRecord.getLineCount({
                    sublistId: 'purchaseorders'
                })
                log.debug('lineCount', lineCount);
                var poId;
                for (var i = 0; i < lineCount; i++) {
                    poId = vendorbillRecord.getSublistValue({
                        sublistId: 'purchaseorders',
                        fieldId: 'id',
                        line: i
                    });
                }
                log.debug('poId', poId);
                var purchaseRecord = record.load({
                    type: 'purchaseorder',
                    id: poId
                });

                var purchaseOrderType = purchaseRecord.getValue({ fieldId: 'custbody_dps_type' })
                documentType = getPOTypeToDocumentType(purchaseOrderType);
                // links
                var lineCount = vendorbillRecord.getLineCount({
                    sublistId: 'links'
                })
                for (var i = 0; i < lineCount; i++) {
                    if (vendorbillRecord.getSublistValue({ sublistId: 'links', fieldId: 'type', line: i }) == '账单付款') {
                        //vendorpayment transactionnumber

                        search.create({
                            type: 'vendorpayment',
                            filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: vendorbillRecord.getSublistValue({ sublistId: 'links', fieldId: 'id', line: i })
                            }],
                            columns: ['transactionnumber']
                        }).run().each(function (rec) {
                            noNumber = { 'PaymentNO': rec.getValue('transactionnumber') };
                            log.debug('noNumber', noNumber);
                        });
                    }
                }
                //计划/备库存采购 公司间交易 采购补货
                if (purchaseOrderType == 2
                    || purchaseOrderType == 6
                    || purchaseOrderType == 8) {
                }
                //固定资产/办公用品
                if (purchaseOrderType == 5) {
                }
                //物料和配件
                if (purchaseOrderType == 4) {
                }
                //采购运费
                if (purchaseOrderType == 7) {
                }
                break;
            //订单预收款 2
            case 'customerdeposit':
                // memo = 'customerdeposit';
                modular = getCustrecordModular('销售模块');
                process = getCustrecordProcess('销售订单');
                documentType = getDocumentType('销售订单预收');
                documentList = 40;
                break;
            //客户存款
            case 'customerpayment':
                modular = getCustrecordModular('销售模块');
                process = getCustrecordProcess('销售订单');
                documentType = getDocumentType('销售订单结算');
                documentList = 9;
                break;
            //收货账款
            case 'itemreceipt':
                //采购订单
                if (orderType == 'PurchOrd') {
                    modular = getCustrecordModular('采购模块');
                    process = getCustrecordProcess('采购订单');
                    documentList = 16;
                    var orderid = journalRecord.getValue({ fieldId: 'orderid' });
                    var purchaseOrderType;
                    var purchase;
                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: orderid
                        }],
                        columns: ['custbody_dps_type', 'tranid']
                    }).run().each(function (rec) {
                        purchase = rec;
                        purchaseOrderType = rec.getValue('custbody_dps_type');
                    });
                    log.debug('purchaseOrderType', purchaseOrderType);
                    documentType = getPOTypeToDocumentType(purchaseOrderType);
                    //customlist_dps_dps_gctype
                    //计划/备库存采购
                    if (purchaseOrderType == 2) {
                        // documentType = getDocumentType('计划/备库存采购');
                        noNumber = { 'PONO': purchase.getValue('tranid') };
                        log.debug('noNumber', noNumber);
                    }
                    //样品采购
                    if (purchaseOrderType == 3) {
                        // documentType = getDocumentType('样品采购');
                        var purchaseRecord = record.load({
                            type: 'purchaseorder',
                            id: orderid
                        });
                        var lineCount = purchaseRecord.getLineCount({
                            sublistId: 'recmachcustrecord_purchase_order_no'
                        })
                        var LNNO = '';
                        for (var i = 0; i < lineCount; i++) {
                            LNNO += purchaseRecord.getSublistValue({
                                sublistId: 'recmachcustrecord_purchase_order_no',
                                fieldId: 'name',
                                line: i
                            });
                        }
                        log.debug('LNNO', LNNO);
                        noNumber = { 'LNNO': LNNO };
                    }
                    //公司间交易
                    if (purchaseOrderType == 6) {
                        // documentType = getDocumentType('公司间交易');
                        noNumber = { 'PONO': purchase.getValue('tranid') };
                        log.debug('noNumber', noNumber);
                    }
                    //采购补货
                    if (purchaseOrderType == 8) {
                        noNumber = { 'PONO': purchase.getValue('tranid') };
                    }
                }
                //退货授权
                if (orderType == 'RtnAuth') {
                    modular = getCustrecordModular('销售模块');
                    process = getCustrecordProcess('销售退货订单');
                    documentType = getDocumentType('销售订单退货');
                }
                break;
            //贷项通知单 1
            case 'creditmemo':
                modular = getCustrecordModular('采购模块');
                process = getCustrecordProcess('采购退货订单');
                documentType = getDocumentType('采购退货');
                noNumber = { "PONO": journalRecord.getValue({ fieldId: 'otherrefnum' }) };
                // documentList = getDocumentList('用贷记方法支付账单');
                documentList = 20;
                break;
            case 'customerrefund':
                modular = getCustrecordModular('销售模块');
                process = getCustrecordProcess('销售退货订单');
                var type = journalRecord.getSublistValue({
                    sublistId: 'apply',
                    fieldId: 'type',
                    line: 0
                })
                if (type == '贷项通知单') {
                    documentType = getDocumentType('销售订单已发货退款');
                } else {
                    documentType = getDocumentType('销售订单未发货退款');
                }
                documentList = 30;
                break;
            default:
                // memo = 'default';
                return;
        }
        log.debug('modular', modular);
        log.debug('process', process);
        log.debug('documentType', documentType);
        log.debug('documentList', documentList);
        if (modular > 0 && process > 0 && documentType > 0 && documentList > 0) {

            filterArr.push({ name: 'custrecord_modular', operator: 'anyof', values: modular });
            filterArr.push({ name: 'custrecord_process', operator: 'anyof', values: process });
            filterArr.push({ name: 'custrecord_document_type', operator: 'anyof', values: documentType });
            filterArr.push({ name: 'custrecord_document_list', operator: 'anyof', values: documentList });
            filterArr.push({ name: 'custrecord_subsidiary_type', operator: 'is', values: subsidiary });
            var configRecord = search.create({
                type: "customrecord_common_configuration",
                filters:
                    //customlist1001 模块
                    //customlist1002 流程
                    //customlist492 订单类型
                    //customrecord_cn_voucher_trantypes 事物类型
                    //subsidiary 公司
                    filterArr,
                columns:
                    [
                        "custrecord_modular",
                        "custrecord_process",
                        "custrecord_document_type",
                        "custrecord_document_list",
                        "custrecord_common",
                        'custrecord_subsidiary_type'
                    ]
            });
            configRecord.run().each(function (result) {
                log.debug('result:', JSON.stringify(result));
                memo = result.getValue('custrecord_common');
            });
        }
        if (memo) {
            if (JSON.stringify(noNumber) != '{}') {
                memo = memo.format(noNumber)
                log.debug('memo1:', memo);
            }
            log.debug('memo2:', memo);
            journalRecord.setValue({
                fieldId: 'memo',
                value: memo,
                ignoreFieldChange: true
            });
            // var sublistCount = journalRecord.getLineCount({
            //     sublistId: 'line'
            // });
            // log.debug("sublistCount:", sublistCount);
            // for (var i = 0; i < sublistCount; i++) {
            //     log.debug("set sublist:", i);
            //     journalRecord.setSublistValue({
            //         sublistId: 'line',
            //         fieldId: 'memo',
            //         value: memo,
            //         line: i
            //     });
            // }
        }
    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

    }

    //获取模块
    function getCustrecordModular(custrecordModular) {
        var result
        search.create({
            type: 'customlist1001',
            filters: [
                { name: 'name', operator: 'is', values: custrecordModular }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取流程
    function getCustrecordProcess(custrecordProcess) {
        var result
        search.create({
            type: 'customlist1002',
            filters: [
                { name: 'name', operator: 'is', values: custrecordProcess }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取订单类型
    function getDocumentType(documentType) {
        var result
        search.create({
            type: 'customlist492',
            filters: [
                { name: 'name', operator: 'is', values: documentType }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //采购订单类型 customlist_dps_dps_gctype
    function getPurchaseOrderType(purchaseOrderType) {
        var result
        search.create({
            type: 'customlist_dps_dps_gctype',
            filters: [
                { name: 'name', operator: 'is', values: purchaseOrderType }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //销售订单发运类型 customlist_dps_so_shipment_type
    function getSaleShipmentType(name) {
        var result
        search.create({
            type: 'customlist_dps_so_shipment_type',
            filters: [
                { name: 'name', operator: 'is', values: name }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取事物类型
    function getDocumentList(documentList) {
        var result
        search.create({
            type: 'customrecord_cn_voucher_trantypes',
            filters: [
                { name: 'name', operator: 'is', values: documentList }
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //采购单类型获取DocumentType
    function getPOTypeToDocumentType(purchaseOrderType) {
        switch (purchaseOrderType) {
            case '2':
                return getDocumentType('计划/备库存采购')
            case '3':
                return getDocumentType('样品采购')
            case '4':
                return getDocumentType('物料和配件')
            case '5':
                return getDocumentType('固定资产/办公用品采购')
            case '6':
                return getDocumentType('公司间交易')
            case '7':
                return getDocumentType('采购运费')
            case '8':
                return getDocumentType('采购补货')
        }
    }

    String.prototype.format = function () {
        if (arguments.length == 0) {
            return this;
        }
        var param = arguments[0];
        var str = this;
        if (typeof (param) == 'object') {
            for (var key in param) {
                str = str.replace(new RegExp("\\[" + key + "\\]", "g"), param[key]);
            }
            return str;
        } else {
            for (var i = 0; i < arguments.length; i++) {
                str = str.replace(new RegExp("\\[" + i + "\\]", "g"), arguments[i]);
            }
            return str;
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});
