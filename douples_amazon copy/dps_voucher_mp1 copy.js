/*
 * @Date           : 2020-04-01 14:47:53
 * @LastEditors    : Li
 * @LastEditTime   : 2020-05-20 23:05:34
 * @Description    : 生成预估凭证, 修改时间 2020-05-20 19:48:07
 * @FilePath       : \douples_amazon\dps_voucher_mp1 copy.js
 * @Author         : Li
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 './Helper/Moment.min'
 */
define(['N/search', 'N/record', './Moment.min', 'N/format', 'N/runtime'], function (search, record, moment, format, runtime) {
    const financeMapping = {
        "Principal": "custrecord_principal_currency_amount",
        "Tax": "custrecord_tax_currency_amount",
        "Commission": "custrecord_commission",
        "FBAPerOrderFulfillmentFee": "custrecord_fba_perorder_fulfil_feeamount",
        "FBAPerUnitFulfillmentFee": "custrecord_fba_perunit_fulfil_feeamount",
        "FBAWeightBasedFee": "custrecord_fba_weight_based_fee_amount",
        "FixedClosingFee": "custrecord_fixed_closing_fee_amount",
        "VariableClosingFee": "custrecord_variable_closing_fee_amount",
        "GetPaidFasterFee": "custrecord_amazon_getpaidfasterfee",
        "GiftwrapChargeback": "custrecord_giftwrap_charge_back_fee_amou",
        "GiftWrap": "custrecord_giftwrap_currency_amount",
        "GiftWrapTax": "custrecord_giftwraptax_currency_amount",
        "SalesTaxCollectionFee": "custrecord_sales_tax_collection_fee_amou",
        "Shipping": "custrecord_shippingcharge_curr_amount",
        "ShippingTax": "custrecord_shippingtax_currency_amount",
        "ShippingHB": "custrecord_shippinghb_fee_amount",
        "ShippingChargeback": "custrecord_shipping_charge_back_fee_amou",
        "MarketplaceFacilitatorTax-Shipping": "custrecord_marketplace_factaxship_amount",
        "MarketplaceFacilitatorTax-Principal": "custrecord_marketplace_factaxprin_amount",
        "MarketplaceFacilitatorTax-Other": "custrecord_marketplace_factaxother_acoun",
        "Principal-promotion": "custrecord_amazon_promotion_itemdiscount",
        "Shipping-promotion": "custrecord_amazon_promotion_shipping",
        "RefundCommission": "custrecord_refundcommission",
        "ExportCharge": "custrecord_finace_exportcharge",
        "LowValueGoodsTax-Principal": "custrecord_lowvaluegoodstax_principal",
        "LowValueGoodsTax-Shipping": "custrecord_lowvaluegoodstax_shipping",
        "RestockingFee": "custrecord_amazon_restockingfee",
        "Promotionitem": "custrecord_amazon_promotion_itemdiscount", //1341
        "PromotionShipping": "custrecord_amazon_promotion_shipping", //2203
        // "PromotionMetaDataDefinitionValue" :"custrecord_prom_meta_data_def_val"
    }
    const fieldsMapping = [
        "Commission",
        "FBAPerOrderFulfillmentFee",
        "FBAPerUnitFulfillmentFee",
        "FBAWeightBasedFee",
        "FixedClosingFee",
        "VariableClosingFee",
        "GetPaidFasterFee",
        "GiftwrapChargeback",
        "GiftWrap",
        "GiftWrapTax",
        "SalesTaxCollectionFee",
        "Shipping",
        "ShippingTax",
        "ShippingHB",
        "ShippingChargeback",
        "MarketplaceFacilitatorTax-Shipping",
        "MarketplaceFacilitatorTax-Principal",
        "MarketplaceFacilitatorTax-Other",
        //   "PromotionMetaDataDefinitionValue",
        "Promotionitem",
        "PromotionShipping",
        "ExportCharge",
        "RestockingFee",
        "LowValueGoodsTax-Principal",
        "LowValueGoodsTax-Shipping",
        "RefundCommission"
    ]
    const pritax = ["Principal", "Tax", ]
    //查找财务报告
    function getInputData() {
        var limit = 1000,
            orders = []

        search.create({
            type: 'customrecord_amazon_listfinancialevents',
            filters: [{
                    name: 'custrecord_is_generate_voucher',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'custrecord_financetype',
                    operator: 'is',
                    values: "orders"
                }
            ]
        }).run().each(function (e) {
            orders.push(e.id)
            return --limit > 0
        })

        log.audit("待冲销总数: " + orders.length, orders)
        return orders;
    }

    function map(context) {
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var date = format.parse({
            value: (moment(new Date().getTime()).format(dateFormat)),
            type: format.Type.DATE
        });
        var startT = new Date().getTime();
        var err = [];
        var order_id, postdate, entity, orderstatus, so_id, subsidiary, pr_store, currency;
        var shipment_id, shipment_item_id, ship_recid, shipment_date, fee_line, fil_channel, item_code
        try {
            var rec_finance = record.load({
                type: "customrecord_amazon_listfinancialevents",
                id: context.value
            })
            order_id = rec_finance.getValue('custrecord_l_amazon_order_id');
            pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account');
            postdate = rec_finance.getValue('custrecord_posteddate_txt'); //去财务报告的发布日期
            // item_code  = rec_finance.getValue('custrecord_orderitemid') //item code 根据关键字段，用于冲销识别
            if (!order_id) {
                order_id = rec_finance.getValue('custrecord_seller_order_id');
            }


            var fils = [],
                sku = rec_finance.getValue('custrecord_sellersku'),
                qty = rec_finance.getValue('custrecord_quantityshipped'),
                ord_itemid = rec_finance.getValue('custrecord_orderitemid');
            fils.push({
                name: 'custrecord_amazon_order_id',
                operator: 'is',
                values: order_id
            })
            sku ? fils.push({
                name: 'custrecord_sku',
                operator: 'is',
                values: sku
            }) : ""
            qty ? fils.push({
                name: 'custrecord_quantity_shipped',
                operator: 'is',
                values: qty
            }) : ""
            if (pr_store != 25) { //不是是CA店铺
                ord_itemid ? fils.push({
                    name: 'custrecord_amazon_order_item_id',
                    operator: 'is',
                    values: ord_itemid
                }) : ""
            }
            //搜索发货报告的发货时间在此时间或者之前的，然后按时间倒叙，取最近的一个
            if (postdate) {
                postdate = getFormatedDate(postdate)
                fils.push({
                    name: 'custrecord_shipment_date',
                    operator: 'ONORBEFORE',
                    values: postdate
                })
            }


            log.debug("fils:", JSON.stringify(fils))
            search.create({
                type: "customrecord_amazon_sales_report",
                filters: fils,
                columns: [{
                        name: 'custrecord_shipment_date',
                        sort: "DESC"
                    },
                    {
                        name: 'custrecord_shipment_id'
                    },
                    {
                        name: 'custrecord_shipment_date_text'
                    },
                    {
                        name: 'custrecord_amazon_order_item_id'
                    },
                ]
            }).run().each(function (rec) {
                ship_recid = rec.id
                // shipment_date = rec.getValue("custrecord_shipment_date_text")
                item_code = rec.getValue("custrecord_shipment_item_id")
            })
            //搜索销售订单获取客户
            var flss = []
            flss.push({
                name: 'poastext',
                operator: 'is',
                values: order_id
            })

            // flss.push({
            //     name: 'custbody_pr_store',
            //     operator: 'anyof',
            //     values: 23
            // })
            flss.push({
                name: 'mainline',
                operator: 'is',
                values: true
            })
            search.create({
                type: record.Type.SALES_ORDER,
                filters: flss,
                columns: [{
                        name: 'entity'
                    },
                    {
                        name: 'statusref'
                    },
                    {
                        name: 'subsidiary'
                    },
                    {
                        name: 'custbody_pr_store'
                    },
                    {
                        name: 'custbody_aio_s_fulfillment_channel'
                    },
                    {
                        name: 'currency'
                    },
                ]
            }).run().each(function (rec) {
                so_id = rec.id;
                entity = rec.getValue('entity');
                orderstatus = rec.getValue('statusref');
                subsidiary = rec.getValue('subsidiary');
                pr_store = rec.getValue('custbody_pr_store');
                currency = rec.getValue('currency');
                fil_channel = rec.getValue('custbody_aio_s_fulfillment_channel');
                return false;
            });
            log.audit("postdate", postdate)
            log.audit("fil_channel", fil_channel)
            //TODO 判断订单状态，如果已经全额收款或者已关闭，则不再生成日记账
            //如果该财务报告生成过凭证，先删除掉
            if (so_id) {
                if (fil_channel != "MFN" && !ship_recid) {
                    log.debug("找不到发货报告,且不是FBM 标识暂不处理 NSH", order_id);
                    // createMissingReportRec(MissingReportType, order_id, "生成预估凭证时，找不到发货报告", pr_store);
                    rec_finance.setValue({
                        fieldId: 'custrecord_is_generate_voucher',
                        value: false
                    });
                    rec_finance.save({
                        ignoreMandatoryFields: true
                    });
                    return
                }

                search.create({
                    type: 'journalentry',
                    filters: [{
                            name: 'mainline',
                            operator: 'is',
                            values: true
                        },
                        {
                            name: 'custbody_relative_finanace_report',
                            operator: 'anyof',
                            values: context.value
                        },
                    ],
                    columns: [{
                        name: "memomain"
                    }]
                }).run().each(function (e) {
                    try {
                        if (e.getValue("memomain") == "01") {
                            var de = record.delete({
                                type: 'journalentry',
                                id: e.id
                            })
                            log.debug("删除成功  ", de)
                        }
                    } catch (e) {
                        log.debug("delete error", e)
                        // err.push(e.message);
                    }
                    return true
                })
                //开始生成日记账凭证

                var fv = [];
                var jour = record.create({
                    type: 'journalentry',
                    isDynamic: true
                });
                jour.setText({
                    fieldId: 'trandate',
                    text: postdate
                });
                jour.setValue({
                    fieldId: 'memo',
                    value: "01"
                });
                jour.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiary
                });
                jour.setValue({
                    fieldId: 'custbody_pr_store',
                    value: pr_store
                });
                jour.setValue({
                    fieldId: 'custbody_jour_orderid',
                    value: order_id
                });
                jour.setValue({
                    fieldId: 'custbody_curr_voucher',
                    value: "预估凭证"
                });
                jour.setValue({
                    fieldId: 'custbody_rel_salesorder',
                    value: so_id
                }); //关联销售订单
                jour.setValue({
                    fieldId: 'currency',
                    value: currency
                });
                jour.setValue({
                    fieldId: 'custbody_jour_type',
                    value: "orders"
                }) //记录凭证类型 orders / refunds
                // jour.setValue({fieldId:'custbody_amaozn_order_iemc',value: item_code })  //关键字段 ,不用设置,财务报告上面有
                // jour.setValue({fieldId:'custbody_amazon_shipment_id',value: shipment_id })

                log.debug("order_id", order_id)
                var dr = 0,
                    cr = 0,
                    num = 0;

                var item_name, incomeaccount;
                // if(financetype == "orders")
                item_name = "Sl-"
                // else if(financetype == "refunds") item_name="RE-"
                var FBM_amount = 0 //记录FBM的货品价格和税
                if (fil_channel == "MFN") { //FBM 计货品价格和税 ，没有发票
                    pritax.map(function (field) {
                        if (Number(rec_finance.getValue(financeMapping[field]))) {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: ItemPrice[field]
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "预 " + order_id
                            })

                            //借费用，贷应收。费用为负数，放贷方会自动变成借方  
                            //如果是日本，取整
                            if (currency == 6) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                            else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            //货品价格和税，为收入，主营业务增加，放贷方，且冲销的时候不能冲收入
                            log.debug("FBM:fee_line", fee_line)
                            FBM_amount += Number(fee_line)
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: fee_line
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "预估"
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_item_or_tax",
                                value: "Y"
                            }) //标记为货品价格和税
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_amazon_fulfillment_channel",
                                value: "FBM"
                            })
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    })

                    jour.selectNewLine({
                        sublistId: 'line'
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: 122
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: "预 " + order_id
                    })
                    //借费用，贷应收。费用为负数，放贷方会自动变成借方  
                    //如果是日本，取整
                    log.debug("FBM:FBM_amount", FBM_amount)
                    if (currency == 6) FBM_amount = Number(FBM_amount).toFixed(0)
                    else FBM_amount = Number(FBM_amount).toFixed(2)
                    log.debug("FBM:toFixed FBM_amount", FBM_amount)
                    //货品价格和税，为收入，主营业务增加，放贷方，且冲销的时候不能冲收入
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "debit",
                        value: FBM_amount
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_document_type",
                        value: "预估"
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_item_or_tax",
                        value: "Y"
                    }) //标记为货品价格和税
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_amazon_fulfillment_channel",
                        value: "FBM"
                    })
                    jour.commitLine({
                        sublistId: 'line'
                    })
                }
                fieldsMapping.map(function (field) {
                    if (field == "LowValueGoodsTax-Principal" || field == "LowValueGoodsTax-Shipping") {
                        //歸為Tax科目 2268
                        if (Number(rec_finance.getValue(financeMapping[field]))) {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: account_Tax
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "预 " + order_id
                            })
                            dr += Number(rec_finance.getValue(financeMapping[field]))
                            //借费用，贷应收。费用为负数，放贷方会自动变成借方  
                            //如果是日本，取整
                            if (currency == 6) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                            else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: fee_line
                            }) //贷 
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "预估"
                            })
                            fil_channel == "MFN" ?
                                jour.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    } else if (Number(rec_finance.getValue(financeMapping[field]))) {
                        if (field == "Promotionitem") incomeaccount = Promotionitem
                        else if (field == "PromotionShipping") incomeaccount = PromotionShipping
                        else
                            search.create({
                                type: 'item',
                                filters: [{
                                    name: 'itemid',
                                    operator: 'is',
                                    values: item_name + field
                                }],
                                columns: [{
                                    name: 'incomeaccount'
                                }]
                            }).run().each(function (iem) {
                                incomeaccount = iem.getValue(iem.columns[0])
                            })
                        if (incomeaccount) {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: incomeaccount
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "预 " + order_id
                            })
                            dr += Number(rec_finance.getValue(financeMapping[field]))
                            if (currency == 6) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                            else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: fee_line
                            }) //贷
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "预估"
                            })
                            fil_channel == "MFN" ?
                                jour.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    }
                })
                fv.push(context.value)

                jour.setValue({
                    fieldId: 'custbody_relative_finanace_report',
                    value: fv
                })
                log.debug("贷项总额：" + dr.toFixed(2))
                if (!Number(dr)) {
                    log.debug("贷项总额为零，Resovle 返回", Number(dr))
                    rec_finance.setValue({
                        fieldId: 'custrecord_is_generate_voucher',
                        value: 'T'
                    }) //预估计入已处理 
                    rec_finance.save({
                        ignoreMandatoryFields: true
                    });
                    return
                }
                jour.selectNewLine({
                    sublistId: 'line'
                });

                // TODO 应收账款
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'account',
                    value: 122
                });
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'memo',
                    value: "预 " + order_id
                });
                if (currency == 6) dr = Number(dr).toFixed(0)
                else dr = Number(dr).toFixed(2)
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "debit",
                    value: dr
                }); //借
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "entity",
                    value: entity
                }); //客户
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "custcol_document_type",
                    value: "预估"
                });
                fil_channel == "MFN" ?
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_amazon_fulfillment_channel",
                        value: "FBM"
                    }) : "";
                jour.commitLine({
                    sublistId: 'line'
                });

                // jour.setValue({fieldId:'custbody_relative_inoice',value:rec_id}) //与发票无关
                var jo = jour.save({
                    ignoreMandatoryFields: true
                });
                log.debug("success", jo)
                rec_finance.setValue({
                    fieldId: 'custrecord_is_generate_voucher',
                    value: 'T'
                }); //预估计入已处理 
                rec_finance.save({
                    ignoreMandatoryFields: true
                });
                if (ship_recid) {
                    //发货报告 已入凭证标记
                    record.submitFields({
                        type: "customrecord_amazon_sales_report",
                        id: ship_recid,
                        values: {
                            custrecord_is_check_invoucher: true
                        }
                    });
                }
            } else {
                log.debug("0000找不到销售订单,计入missingorder", order_id);
                // createMissingReportRec(MissingReportType, order_id, "生成预估凭证时，找不到销售订单", pr_store);
                rec_finance.setValue({
                    fieldId: 'custrecord_is_generate_voucher',
                    value: false
                }); //暂不处理
                rec_finance.save({
                    ignoreMandatoryFields: true
                });
            }
        } catch (e) {
            log.error(" error:", e);
            err.push(e.message);
        }
        log.debug("000 耗时：", new Date().getTime() - startT)
        //创建missorder
        if (err.length > 0) {
            var moId = createSOTRMissingOrder('createvoucher', order_id, JSON.stringify(err), date, pr_store);
            log.debug("出现错误，已创建missingorder" + moId);
            // } else {
            // delMissingReportRec(MissingReportType, order_id, "生成预估凭证时，找不到销售订单", pr_store);
            // makeresovle("createvoucher", order_id, pr_store);
        }
    }


    function reduce(context) {

    }

    function summarize(summary) {

    }


    /**
     * 生成单据失败记录
     * @param {*} type 
     * @param {*} account_id 
     * @param {*} order_id 
     * @param {*} so_id 
     * @param {*} reason 
     * @param {*} date 
     */
    function createSOTRMissingOrder(type, orderid, reason, date) {
        var mo;
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: [{
                name: 'custrecord_tr_missing_order_type',
                operator: 'is',
                values: type
            }, {
                name: 'custrecord_tr_missing_order_id',
                operator: 'is',
                values: orderid
            }]
        }).run().each(function (rec) {
            mo = record.load({
                type: 'customrecord_dps_transform_mo',
                id: rec.id
            });
            return false;
        });
        if (!mo) {
            mo = record.create({
                type: 'customrecord_dps_transform_mo',
                isDynamic: true,
            });
        }
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_type',
            value: type
        }); //类型

        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_id',
            value: orderid
        });
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_reason',
            value: reason
        });
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_date',
            value: date
        });
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_resolved',
            value: false
        });
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_resolving',
            value: false
        });
        return mo.save();
    };
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});