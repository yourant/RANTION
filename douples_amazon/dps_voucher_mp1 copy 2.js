/*
 * @Date           : 2020-04-01 14:47:53
 * @LastEditors    : Li
 * @LastEditTime   : 2020-05-20 22:54:41
 * @Description    : 生成预估凭证, 修改时间 2020-05-20 19:48:07
 * @FilePath       : \douples_amazon\dps_voucher_mp1 copy 2.js
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
        var err = [];
        var order_id, shipdate, entity, orderstatus, so_id, subsidiary, pr_store, currency, item_id;
        try {
            var rec_finance = record.load({
                type: "customrecord_amazon_listfinancialevents",
                id: context.value
            })
            order_id = rec_finance.getValue('custrecord_l_amazon_order_id')

            search.create({
                type: "customrecord_amazon_sales_report",
                filters: [{
                        name: 'custrecord_amazon_order_id',
                        operator: 'is',
                        values: order_id
                    },
                    {
                        name: 'custrecord_sku',
                        operator: 'is',
                        values: rec_finance.getValue('custrecord_sellersku')
                    },
                    {
                        name: 'custrecord_quantity_shipped',
                        operator: 'is',
                        values: rec_finance.getValue('custrecord_quantityshipped')
                    },
                    {
                        name: 'custrecord_amazon_order_item_id',
                        operator: 'is',
                        values: rec_finance.getValue('custrecord_l_amazon_order_id')
                    }
                ],
                columns: [{
                    name: 'custrecord_posteddate_txt'
                }]
            }).run().each(function (rec) {
                shipdate = rec.getValue("custrecord_posteddate_txt");
            })
            //搜索销售订单获取客户
            search.create({
                type: record.Type.SALES_ORDER,
                filters: [{
                        name: 'poastext',
                        operator: 'is',
                        values: rec_finance.getValue('custrecord_l_amazon_order_id')
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: false
                    }
                ],
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
                        name: 'currency'
                    },
                    {
                        name: "item"
                    }
                ]
            }).run().each(function (rec) {
                so_id = rec.id;
                entity = rec.getValue('entity');
                orderstatus = rec.getValue('statusref');
                subsidiary = rec.getValue('subsidiary');
                pr_store = rec.getValue('custbody_pr_store');
                currency = rec.getValue('currency');
                item_id = rec.getValue('item')
                return false;
            });

            log.debug('item_id', item_id)
            log.audit("shipdate", shipdate)
            log.audit("orderstatus", orderstatus)
            //TODO 判断订单状态，如果已经全额收款或者已关闭，则不再生成日记账
            //如果该财务报告生成过凭证，先删除掉
            if (so_id) {
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
                var fv = []
                var jour = record.create({
                    type: 'journalentry',
                    isDynamic: true
                })
                jour.setValue({
                    fieldId: 'trandate',
                    value: moment.utc(shipdate).toDate()
                })
                jour.setValue({
                    fieldId: 'memo',
                    value: "01"
                })
                jour.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiary
                })
                jour.setValue({
                    fieldId: 'custbody_pr_store',
                    value: pr_store
                })
                jour.setValue({
                    fieldId: 'custbody_jour_orderid',
                    value: order_id
                })
                jour.setValue({
                    fieldId: 'custbody_curr_voucher',
                    value: "预估凭证"
                })
                jour.setValue({
                    fieldId: 'currency',
                    value: currency
                })
                log.debug("order_id", order_id)
                var dr = 0,
                    cr = 0,
                    num = 0;

                var pit = 0
                var financetype = rec_finance.getValue("custrecord_financetype");
                var item_name, incomeaccount;
                // if(financetype == "orders")
                item_name = "Sl-"
                // else if(financetype == "refunds") item_name="RE-"
                fieldsMapping.map(function (field) {
                    if (field == "LowValueGoodsTax-Principal" || field == "LowValueGoodsTax-Shipping") {
                        //歸為Tax科目 2268
                        if (Number(rec_finance.getValue(financeMapping[field]))) {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })

                            /**
                             * 这个行的科目, 需要修改		125	
                             */
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: 125
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: order_id
                            })
                            dr += Number(rec_finance.getValue(financeMapping[field]))
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            }) //借 
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    } else if (Number(rec_finance.getValue(financeMapping[field]))) {

                        // if (field == "Promotionitem") { incomeaccount = 1341 }
                        // else if (field == "PromotionShipping") { incomeaccount = 2203 }
                        // else {
                        // 	search.create({
                        // 		type: 'item', filters: [{ name: 'itemid', operator: 'is', values: item_name + field }],
                        // 		columns: [{ name: 'incomeaccount' }]
                        // 	}).run().each(function (iem) {
                        // 		incomeaccount = iem.getValue(iem.columns[0])
                        // 	})
                        // }

                        search.create({
                            type: 'item',
                            filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: item_id
                            }],
                            columns: [{
                                name: 'incomeaccount'
                            }]
                        }).run().each(function (iem) {
                            incomeaccount = iem.getValue(iem.columns[0])
                        })

                        log.debug('incomeaccount', incomeaccount)

                        if (incomeaccount) {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })

                            // TODO 货品的收入科目  (这里的TODO只是由于标记)
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: incomeaccount
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: order_id
                            })
                            dr += Number(rec_finance.getValue(financeMapping[field]))
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            }) ////贷
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
                jour.selectNewLine({
                    sublistId: 'line'
                })

                // TODO 这个科目需要修改, 应收科目
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'account',
                    value: 122
                })

                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: 'memo',
                    value: order_id
                })
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "debit",
                    value: Number(dr).toFixed(2)
                }) //借
                jour.setCurrentSublistValue({
                    sublistId: 'line',
                    fieldId: "entity",
                    value: entity
                }) //客户
                jour.commitLine({
                    sublistId: 'line'
                })

                // jour.setValue({fieldId:'custbody_relative_inoice',value:rec_id}) //与发票无关
                var jo = jour.save({
                    ignoreMandatoryFields: true
                });
                log.debug("success", jo)
                rec_finance.setValue({
                    fieldId: 'custrecord_is_generate_voucher',
                    value: true
                }) //预估计入已处理 
                rec_finance.save({
                    ignoreMandatoryFields: true
                });
            } else {
                log.debug("找不到销售订单")
            }
        } catch (e) {
            log.error(" error:", e);
            err.push(e.message);
        }

        //创建missorder
        if (err.length > 0) {

            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var date = format.parse({
                value: (moment(new Date().getTime()).format(dateFormat)),
                type: format.Type.DATE
            });;

            var moId = createSOTRMissingOrder('createvoucher', so_id, JSON.stringify(err), date);
            log.debug("出现错误，已创建missingorder" + moId);
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