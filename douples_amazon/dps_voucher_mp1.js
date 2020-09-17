/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-09-14 20:14:38
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \douples_amazon\dps_voucher_mp1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime', './Helper/interfunction.min', './Helper/core.min', 'N/task', 'N/email'],
    function(search, record, moment, format, runtime, interfun, core, task, email) {
        const MissingReportType = 5 // Missing report 财务报告  orders
        const account = 122 // 应收账款
        const account_Tax = 1026 // 6601.30.01 销售费用 : 平台销售税 : Amazon
        // const Promotionitem = 54   //主营业务
        const ItemPrice = {
            'Principal': '', // ItemPricePrincipal
            'Tax': 1026, // ItemPrice TAX
        }
        // const PromotionShipping = 2203   //PromotionShipping 科目
        const financeMapping = {
            'Principal': 'custrecord_principal_currency_amount',
            'Tax': 'custrecord_tax_currency_amount',
            'Commission': 'custrecord_commission',
            'FBAPerOrderFulfillmentFee': 'custrecord_fba_perorder_fulfil_feeamount',
            'FBAPerUnitFulfillmentFee': 'custrecord_fba_perunit_fulfil_feeamount',
            'FBAWeightBasedFee': 'custrecord_fba_weight_based_fee_amount',
            'FixedClosingFee': 'custrecord_fixed_closing_fee_amount',
            'VariableClosingFee': 'custrecord_variable_closing_fee_amount',
            'GetPaidFasterFee': 'custrecord_amazon_getpaidfasterfee',
            'GiftwrapChargeback': 'custrecord_giftwrap_charge_back_fee_amou',
            'GiftWrap': 'custrecord_giftwrap_currency_amount',
            'GiftWrapTax': 'custrecord_giftwraptax_currency_amount',
            'SalesTaxCollectionFee': 'custrecord_sales_tax_collection_fee_amou',
            'Shipping': 'custrecord_shippingcharge_curr_amount',
            'ShippingTax': 'custrecord_shippingtax_currency_amount',
            'ShippingHB': 'custrecord_shippinghb_fee_amount',
            'ShippingChargeback': 'custrecord_shipping_charge_back_fee_amou',
            'MarketplaceFacilitatorTax-Shipping': 'custrecord_marketplace_factaxship_amount',
            'MarketplaceFacilitatorTax-Principal': 'custrecord_marketplace_factaxprin_amount',
            'MarketplaceFacilitatorTax-Other': 'custrecord_marketplace_factaxother_acoun',
            'Principal-promotion': 'custrecord_amazon_promotion_itemdiscount',
            'Shipping-promotion': 'custrecord_amazon_promotion_shipping',
            'RefundCommission': 'custrecord_refundcommission',
            'ExportCharge': 'custrecord_finace_exportcharge',
            'LowValueGoodsTax-Principal': 'custrecord_lowvaluegoodstax_principal',
            'LowValueGoodsTax-Shipping': 'custrecord_lowvaluegoodstax_shipping',
            'RestockingFee': 'custrecord_amazon_restockingfee',
            'Promotionitem': 'custrecord_amazon_promotion_itemdiscount', // 1341
            'PromotionShipping': 'custrecord_amazon_promotion_shipping', // 2203
            // "PromotionMetaDataDefinitionValue" :"custrecord_prom_meta_data_def_val"
        }
        const CORR_fin = {
            'Commission': 680, // 平台佣金
            'FBAPerOrderFulfillmentFee': 681, // 平台配送
            'FBAPerUnitFulfillmentFee': 681, // 平台配送
            'FBAWeightBasedFee': 681
        } // 平台配送
        const CORR_MEMO = {
            '680': '暂估平台扣取交易佣金[Amazon]',
            '681': '暂估平台扣取物流配送费[Amazon]'
        }

        const fieldsMapping = [
            'Commission',
            'FBAPerOrderFulfillmentFee',
            'FBAPerUnitFulfillmentFee',
            'FBAWeightBasedFee',
            // 'FixedClosingFee',
            // 'VariableClosingFee',
            // 'GetPaidFasterFee',
            // 'GiftwrapChargeback',
            // 'GiftWrap',
            // 'GiftWrapTax',
            // 'Tax',
            // 'SalesTaxCollectionFee',
            // 'Shipping',
            // 'ShippingTax',
            // 'ShippingHB',
            // 'ShippingChargeback',
            // 'MarketplaceFacilitatorTax-Shipping',
            // 'MarketplaceFacilitatorTax-Principal',
            // 'MarketplaceFacilitatorTax-Other',
            // //   "PromotionMetaDataDefinitionValue",
            // 'Promotionitem',
            // 'PromotionShipping',
            // 'ExportCharge',
            // 'RestockingFee',
            // 'LowValueGoodsTax-Principal',
            // 'LowValueGoodsTax-Shipping',
            // 'RefundCommission'
        ]
        const martk_corr = { // 科目配置表的报告类型字段
            'EU': 2,
            'NL': 2,
            'JP': 2,
            'UK': 2,
            'IT': 2,
            'ES': 2,
            'DE': 2,
            'FR': 2,
            'US': 1,
            'CA': 1,
            'MX': 1,
            'AU': 1,
            'SG': 1
        }
        const finType = 'Order'
        const JP_currency = 8
        const income_fin = 623 // 应收账款-暂估	Amazon 1122.05.01
        const income_settle = 361 // 应收账款-待结算  1122.03
        const Fincome_Plat = 412 // 预收账款-平台	 2203.03
        const income_Refund = 471 // 主营业务收入-退款	 6001.06



        const fmt = "yyyy-M-d"

        function getInputData() {
            var limit = 400,
                orders = [],
                ors = []
            // var acc_sort = 115-67-17-111-184-14-33-1-187
            // var acc_sort = ['172', '211', '136', '113', '156', '118', '31', '21', '102']
            // var acc_sort = ['201', '194', '104', '24', '143', '69', '120', '54', '19','102','154']
            // var oid = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_oid' }); // 订单号
            // oid = oid.split('-')
            var acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_fin_account'
            })
            var runPaged = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_li_fin_runpaged'
            })
            var group_req = runtime.getCurrentScript().getParameter({
                name: 'custscript_fin_group'
            })
            var _start_date = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_li_order_fin_start_date'
            })
            var _end_date = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_li_order_fin_end_date'
            })


            var full_bj = runtime.getCurrentScript().getParameter({
                name: 'custscript_fin_bj'
            }) ? runtime.getCurrentScript().getParameter({
                name: 'custscript_fin_bj'
            }) : 'F'; // 搜索对应的标记



            // var num = 0
            // oid.map(function (acc) {
            // if (orders.length > 0 && limit > 0) {
            //   return
            // } else if (orders.length == 0 && num != 0) {
            //   log.error('0000000000000000000000 处理完成的店铺', acc)
            // }
            // num++
            var fils = []
            var acc_arrys = []
            fils.push({
                name: 'custrecord_is_generate_voucher',
                operator: 'is',
                values: full_bj
            })
            // if (oid)
            //   fils.push({name: 'custrecord_l_amazon_order_id',operator: 'is',values: oid})
            if (group_req) { // 根据拉单分组去履行
                core.amazon.getReportAccountList(group_req).map(function(acount) {
                    acc_arrys.push(acount.id)
                })
                fils.push({
                    name: 'custrecord_fin_to_amazon_account',
                    operator: 'anyof',
                    values: acc_arrys
                })
            }
            if (acc)
                fils.push({
                    name: 'custrecord_fin_to_amazon_account',
                    operator: 'anyof',
                    values: acc
                })



            if (_start_date && _end_date) {

                _d_start_date = interfun.li_dateFormat(_start_date, fmt)
                _d_end_date = interfun.li_dateFormat(_end_date, fmt)
                fils.push({
                    name: 'custrecord_posteddate',
                    operator: 'within',
                    values: [_d_start_date, _d_end_date]
                })
            }
            if (_start_date && !_end_date) {

                _d_start_date = interfun.li_dateFormat(_start_date, fmt)
                fils.push({
                    name: 'custrecord_posteddate',
                    operator: 'onorafter',
                    values: [_d_start_date]
                })
            }
            if (!_start_date && _end_date) {

                _d_start_date = interfun.li_dateFormat(_end_date, fmt)
                fils.push({
                    name: 'custrecord_posteddate',
                    operator: 'onorbefore',
                    values: [_d_end_date]
                })
            }
            fils.push({
                name: 'custrecord_financetype',
                operator: 'is',
                values: 'orders'
            })
            // fils.push({
            //     name: 'custrecord_posteddate',
            //     operator: 'onorBefore',
            //     values: '2020-6-30'
            // })
            log.debug('fils:', fils)
            var mySearch = search.create({
                type: 'customrecord_amazon_listfinancialevents',
                filters: fils,
                columns: [{
                        name: 'custrecord_aio_seller_id',
                        join: 'custrecord_fin_to_amazon_account'
                    },
                    {
                        name: 'custrecord_aio_enabled_sites',
                        join: 'custrecord_fin_to_amazon_account'
                    }, // 站点
                    {
                        name: 'custrecord_division',
                        join: 'custrecord_fin_to_amazon_account'
                    } // 部门
                ]
            });

            if (runPaged) {
                var get_result = []; //结果
                var pageSize = 1000; //每页条数
                var pageData = mySearch.runPaged({
                    pageSize: pageSize
                });
                var totalCount = pageData.count; //总数

                log.error('总共的数据量', totalCount);
                var pageCount = pageData.pageRanges.length; //页数
                log.error('总共的页数', pageCount);


                // return;

                if (totalCount > 0) {

                    for (var i = 0; i < pageCount; i++) {
                        pageData.fetch({ // 只跑一页
                            index: i
                        }).data.forEach(function(e) {
                            get_result.push({
                                rec_id: e.id,
                                seller_id: e.getValue(e.columns[0]),
                                enabled_sites: e.getText(e.columns[1]),
                                dept: e.getValue(e.columns[2])
                            })
                        });
                    }

                }

                log.error('获取数据的长度 get_result', get_result.length)

                return get_result;

            }
            mySearch.run().each(function(e) {
                orders.push({
                    rec_id: e.id,
                    seller_id: e.getValue(e.columns[0]),
                    enabled_sites: e.getText(e.columns[1]),
                    dept: e.getValue(e.columns[2])
                })
                return --limit > 0
            })
            // })
            // fils.push({ name: 'custrecord_aio_account_region',join: 'custrecord_fin_to_amazon_account', operator: 'noneof', values: ['1'] })

            log.error('待冲销总数', orders.length)
            return orders
        }

        function map(context) {
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
            var date = format.parse({
                value: (moment(new Date().getTime()).format(dateFormat)),
                type: format.Type.DATE
            })
            var startT = new Date().getTime()
            var obj = JSON.parse(context.value)
            var fin_id = obj.rec_id
            var order_id, postdate, entity, so_id, subsidiary, pr_store, currency, orderitemid, dept = obj.dept
            var ship_recid, ship_obj, fee_line, fil_channel, merchant_order_id, ord_type
            var isA_order = 1 // 是否属于改发单号
            try {
                var rec_finance = record.load({
                    type: 'customrecord_amazon_listfinancialevents',
                    id: fin_id
                })
                order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
                merchant_order_id = rec_finance.getValue('custrecord_seller_order_id')
                orderitemid = rec_finance.getValue('custrecord_orderitemid')
                pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account')
                postdate = rec_finance.getValue('custrecord_posteddate_txt') // 去财务报告的发布日期
                // postdate = rec_finance.getText('custrecord_posteddate'); // 去财务报告的发布日期
                var pos_obj = interfun.getFormatedDate('', '', postdate, '', true)
                postdate = pos_obj.date
                if (postdate == '2') {
                    rec_finance.setValue({
                        fieldId: 'custrecord_is_generate_voucher',
                        value: '时间在5月'
                    })
                    rec_finance.save({
                        ignoreMandatoryFields: true
                    })
                    return
                }
                var fils = [],
                    sku = rec_finance.getValue('custrecord_sellersku'),
                    qty = rec_finance.getValue('custrecord_quantityshipped')
                fils.push({
                    name: 'custrecord_amazon_order_id',
                    operator: 'is',
                    values: order_id
                })
                if (order_id.charAt(0) == 'S') {
                    if (merchant_order_id) {
                        fils.push({
                            name: 'custrecord_merchant_order_id',
                            operator: 'is',
                            values: merchant_order_id
                        })
                        if (merchant_order_id.charAt(0) == 'A') {
                            // 如果是A开头的订单号，需要查找对应关系，找到原订单号,*****放到凭证上******
                            search.create({
                                type: 'customrecord_amazon_order_relation',
                                filters: [{
                                        name: 'custrecord_amazon_order_s',
                                        operator: 'is',
                                        values: order_id
                                    },
                                    {
                                        name: 'custrecord_amazon_order_a',
                                        operator: 'is',
                                        values: merchant_order_id
                                    }
                                ],
                                columns: [{
                                    name: 'name'
                                }]
                            }).run().each(function(e) {
                                order_id = e.getValue('name')
                                isA_order = 2
                            })
                        }
                    }
                } else if (!order_id) {
                    rec_finance.setValue({
                        fieldId: 'custrecord_is_generate_voucher',
                        value: '没有订单号'
                    })
                    rec_finance.save({
                        ignoreMandatoryFields: true
                    })
                    return
                }

                fils.push({
                    name: 'custrecord_is_check_invoucher',
                    operator: 'is',
                    values: false
                })
                sku ? fils.push({
                    name: 'custrecord_sku',
                    operator: 'is',
                    values: sku
                }) : ''
                qty ? fils.push({
                    name: 'custrecord_quantity_shipped',
                    operator: 'is',
                    values: qty
                }) : ''
                orderitemid ? fils.push({
                    name: 'custrecord_amazon_order_item_id',
                    operator: 'is',
                    values: orderitemid
                }) : ''
                log.debug('fils:' + postdate, JSON.stringify(fils))
                search.create({
                    type: 'customrecord_amazon_sales_report',
                    filters: fils,
                    columns: [{
                            name: 'custrecord_shipment_date',
                            sort: 'DESC'
                        },
                        {
                            name: 'custrecord_shipment_date_text'
                        }
                    ]
                }).run().each(function(rec) {
                    ship_recid = rec.id
                    ship_obj = interfun.getFormatedDate('', '', rec.getValue('custrecord_shipment_date_text'), '', true)
                    log.debug('postdate：' + postdate, ',shipment_date:' + ship_obj.date)
                })
                var inv_id
                if (ship_recid) {
                    var posum = pos_obj.Year + pos_obj.Month + ''
                    var shipsum = ship_obj.Year + ship_obj.Month + ''
                    if (shipsum != posum) {
                        rec_finance.setValue({
                            fieldId: 'custrecord_is_generate_voucher',
                            value: '与发货跨月'
                        })
                        rec_finance.save({
                            ignoreMandatoryFields: true
                        })
                        return
                    }

                    search.create({
                        type: 'invoice',
                        filters: [{
                            name: 'custbody_shipment_report_rel',
                            operator: 'anyof',
                            values: ship_recid
                        }]
                    }).run().each(function(rec) {
                        inv_id = rec.id
                    })
                }
                var acc_search = interfun.getSearchAccount(obj.seller_id).acc_search
                log.debug('查询的店铺acc_search:', acc_search)
                // 搜索销售订单获取客户
                var so_obj = interfun.SearchSO(order_id, merchant_order_id, acc_search)
                log.audit('查看拿到的SO', so_obj)
                so_id = so_obj.so_id
                pr_store = so_obj.acc
                acc_text = so_obj.acc_text
                entity = so_obj.entity
                subsidiary = so_obj.subsidiary
                currency = so_obj.currency
                fil_channel = so_obj.fulfill_channel
                orderid = so_obj.otherrefnum
                ord_type = so_obj.ord_type

                log.audit('fil_channel', fil_channel)

                // 如果该财务报告生成过凭证，先删除掉
                if (so_id) {
                    var ck_jo
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
                                values: fin_id
                            }
                        ],
                        columns: [{
                            name: 'memomain'
                        }]
                    }).run().each(function(e) {
                        try {
                            if (e.getValue('memomain') == '预估') {
                                ck_jo = e.id
                                // var de = record.delete({type: 'journalentry',id: e.id})
                                // log.debug('删除成功  ', de)
                            }
                        } catch (e) {
                            log.debug('delete error', e)
                            // err.push(e.message)
                        }
                        return true
                    })
                    if (ck_jo) {
                        rec_finance.setValue({
                            fieldId: 'custrecord_is_generate_voucher',
                            value: 'T'
                        }) // 不处理,没有对应的销售订单就不生产预估
                        rec_finance.setValue({
                            fieldId: 'custrecord_fin_rel_demit',
                            value: ck_jo
                        }) // 不处理,没有对应的销售订单就不生产预估
                        rec_finance.save({
                            ignoreMandatoryFields: true
                        })
                        return '已存在:' + ck_jo
                    }
                    // 开始生成日记账凭证

                    if (ord_type == '2') { // 如果是FMB类型订单，查找有没有发货
                        search.create({
                            type: 'invoice',
                            filters: [{
                                name: 'createdfrom',
                                operator: 'anyof',
                                values: so_id
                            }]
                        }).run().each(function(rec) {
                            inv_id = rec.id
                        })
                    }
                    if (!inv_id) {
                        if (!ship_recid) {
                            rec_finance.setValue({
                                fieldId: 'custrecord_is_generate_voucher',
                                value: '找不到发货报告'
                            })
                            rec_finance.save({
                                ignoreMandatoryFields: true
                            })
                            return '找不到发货报告:' + orderid
                        }
                        rec_finance.setValue({
                            fieldId: 'custrecord_is_generate_voucher',
                            value: '待发货'
                        }) // 不处理,没有对应的销售订单就不生产预估
                        rec_finance.save({
                            ignoreMandatoryFields: true
                        })
                        return '待发货:' + orderid
                    }

                    var fv = []
                    var jour = record.create({
                        type: 'journalentry',
                        isDynamic: true
                    })
                    jour.setText({
                        fieldId: 'trandate',
                        text: postdate
                    })
                    jour.setValue({
                        fieldId: 'memo',
                        value: '预估'
                    })
                    jour.setValue({
                        fieldId: 'subsidiary',
                        value: subsidiary
                    })
                    jour.setValue({
                        fieldId: 'custbody_order_locaiton',
                        value: pr_store
                    })
                    jour.setValue({
                        fieldId: 'department',
                        value: dept
                    })
                    jour.setValue({
                        fieldId: 'custbody_jour_orderid',
                        value: order_id
                    })
                    jour.setValue({
                        fieldId: 'custbody_curr_voucher',
                        value: '预估凭证'
                    })
                    jour.setValue({
                        fieldId: 'custbody_rel_salesorder',
                        value: so_id
                    }); // 关联销售订单
                    jour.setValue({
                        fieldId: 'currency',
                        value: currency
                    })
                    jour.setValue({
                        fieldId: 'custbody_jour_type',
                        value: 'orders'
                    }); // 记录凭证类型 orders / refunds
                    log.debug('order_id', order_id)
                    var dr = 0,
                        cr = 0,
                        num = 0
                    var incomeaccount, L_memo
                    fieldsMapping.map(function(field) {
                        if (field == 'LowValueGoodsTax-Principal' || field == 'LowValueGoodsTax-Shipping') {
                            // 歸為Tax科目 2268
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
                                    fieldId: 'department',
                                    value: dept
                                })
                                jour.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'memo',
                                    value: '收客户销售税[Amazon]'
                                })
                                jour.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'entity',
                                    value: entity
                                })
                                dr += Number(rec_finance.getValue(financeMapping[field]))
                                // 借费用，贷应收。费用为负数，放贷方会自动变成借方
                                // 如果是日本，取整
                                if (currency == JP_currency) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                                else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                                jour.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: 'credit',
                                    value: fee_line
                                }) // 贷
                                jour.commitLine({
                                    sublistId: 'line'
                                })
                            }
                        } else if (Number(rec_finance.getValue(financeMapping[field]))) {
                            incomeaccount = CORR_fin[field]
                            L_memo = CORR_MEMO[incomeaccount]
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
                                value: L_memo
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: entity
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'department',
                                value: dept
                            })
                            if (currency == JP_currency) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                            else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'credit',
                                value: fee_line
                            }) // 贷
                            jour.commitLine({
                                sublistId: 'line'
                            })
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: income_fin
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: L_memo
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'department',
                                value: dept
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: entity
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'debit',
                                value: fee_line
                            }) // 贷
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    })
                    fv.push(fin_id)
                    jour.setValue({
                        fieldId: 'custbody_relative_finanace_report',
                        value: fv
                    })
                    jour.setValue({
                        fieldId: 'custbody_aio_marketplaceid',
                        value: 1
                    })
                    jour.setValue({
                        fieldId: 'custbody_relative_inoice',
                        value: inv_id
                    })
                    var jo
                    var len = jour.getLineCount({
                        sublistId: 'line'
                    })
                    if (len == 0) {
                        rec_finance.setValue({
                            fieldId: 'custrecord_is_generate_voucher',
                            value: '配送费和佣金为0'
                        })
                        // rec_finance.setValue({fieldId: 'custrecord_fin_rel_demit',value: jo})
                        rec_finance.save({
                            ignoreMandatoryFields: true
                        })
                    } else {
                        // log.audit('脚本使用量', runtime.getCurrentScript().getRemainingUsage());
                        jo = jour.save({
                            ignoreMandatoryFields: true
                        })
                        log.debug('success', jo)
                        rec_finance.setValue({
                            fieldId: 'custrecord_is_generate_voucher',
                            value: 'T'
                        })
                        rec_finance.setValue({
                            fieldId: 'custrecord_fin_rel_demit',
                            value: jo
                        })
                        rec_finance.save({
                            ignoreMandatoryFields: true
                        })
                        if (ship_recid)
                            record.submitFields({
                                type: 'customrecord_amazon_sales_report',
                                id: ship_recid,
                                values: {
                                    custrecord_is_check_invoucher: true,
                                    custrecord_fin_rel: jo
                                }
                            })
                    }
                    var inv = record.load({
                        type: 'invoice',
                        id: inv_id
                    })
                    if (isA_order == 1)
                        inv.setValue({
                            fieldId: 'custbody_dps_finance_report',
                            value: fin_id
                        }) // 1 正常单的财务报告
                    else if (isA_order == 2)
                        inv.setValue({
                            fieldId: 'custbody_dps_finance_report1',
                            value: fin_id
                        }) // 2 改发单的财务报告
                    inv.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                    log.debug('ship_recid:' + ship_recid, '发货报告设置成功')
                    return 'success:' + jo
                } else {
                    log.debug('0000找不到销售订单', order_id)
                    rec_finance.setValue({
                        fieldId: 'custrecord_is_generate_voucher',
                        value: '找不到订单'
                    }) // 不处理,没有对应的销售订单就不生产预估
                    rec_finance.save({
                        ignoreMandatoryFields: true
                    })
                    return '找不到订单：' + order_id
                }
            } catch (e) {
                log.audit(' error:', e)
            }
            log.debug('000 耗时：', new Date().getTime() - startT)
        }

        function reduce(context) {}

        function summarize(summary) {

            var runPaged = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_li_fin_runpaged'
            })
            var recId = runtime.getCurrentScript().getParameter({
                name: 'custscript_dps_li_fin_record_id'
            })

            log.error('summary runPaged', runPaged);
            log.error('summary recId', recId);



            var acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_fin_account'
            });

            if (runPaged) {



                // return;


                // record.submitFields({
                //     type: 'customrecord_dps_li_automatically_execut',
                //     id: recId,
                //     values: {
                //         custrecord_dps_auto_execute_estimated: true
                //     }
                // });

                // submitMapReduceDeployment("customscript_dps_li_timed_switch_script", "customdeploy_dps_li_timed_switch_script", "recId", "param");
            }

            var authorId = 911;
            var recipientEmail = 'licanlin@douples.com';


            // email.send({
            //     author: authorId,
            //     recipients: recipientEmail,
            //     subject: '预估凭证已经处理完成!',
            //     body: "预估凭证,已经处理完成了。\n 店铺 ID" + acc
            // });

            // custscript_dps_li_fin_record_id
            log.debug('处理完成')
        }


        function submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param) {

            // Store the script ID of the script to submit.
            //
            // Update the following statement so it uses the script ID
            // of the map/reduce script record you want to submit.
            log.audit('mapreduce id: ', mapReduceScriptId);

            // Create a map/reduce task.
            //
            // Update the deploymentId parameter to use the script ID of
            // the deployment record for your map/reduce script.
            var mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: mapReduceScriptId,
                deploymentId: mapReduceDeploymentId,
                // params: param
            });

            // Submit the map/reduce task.
            var mrTaskId = mrTask.submit();
            log.audit('mrTaskId', mrTaskId);

            record.submitFields({
                type: 'customrecord_dps_li_automatically_execut',
                id: recId,
                values: {
                    custrecord_dps_li_submit_id: mrTaskId
                }
            });




            // Check the status of the task, and send an email if the
            // task has a status of FAILED.
            // PENDING      PROCESSING      COMPLETE      FAILED
            //
            // Update the authorId value with the internal ID of the user
            // who is the email sender. Update the recipientEmail value
            // with the email address of the recipient.
            var taskStatus = task.checkStatus(mrTaskId);


            var authorId = 911;
            var recipientEmail = 'licanlin@douples.com';
            // email.send({
            //     author: authorId,
            //     recipients: recipientEmail,
            //     subject: '结算报告处理完成了, ' + taskStatus.status ,
            //     body: 'Map reduce task: ' + mapReduceScriptId + ' has activated. \n 记录ID ' + recId + '\n 参数为\n' + JSON.stringify(param)
            // })
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    })