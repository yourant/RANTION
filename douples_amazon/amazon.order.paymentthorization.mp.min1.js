/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-03-27 17:11:52
 * @LastEditTime   : 2020-09-15 20:05:24
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['./Helper/interfunction.min', 'N/runtime', 'N/format', './Helper/Moment.min', './Helper/core.min', 'N/log', 'N/search', 'N/record', './Helper/fields.min', 'N/task', 'N/email'],
    function(interfun, runtime, format, moment, core, log, search, record, fiedls, task, email) {
        // 结算报告退款 欧洲可以根据 marcktplace Name区分国家
        const fba_return_location = 2502
        const fmt = "yyyy-M-d"

        function getInputData() {
            var payments = [],
                limit_payments = 4000
            var sT = new Date().getTime()
            try {
                var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_acc' });

                log.error('店铺', acc);
                var group = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_accgroup' });

                var runPaged = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_runpaged' }); // 获取数据的形式
                var recId = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_rec_id' }); //  记录 ID
                var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_start_date' }); // 开始时间
                var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_end_date' }); //  结束时间
                var _order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_order_id' }); //订单号

                var fils = [
                    { name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: 'Refund' },
                    // {
                    //     name: 'custrecord_settlement_enddate',
                    //     operator: 'within',
                    //     values: ['2020-6-1', '2020-6-30']
                    // }, // end date从2月份开始
                    { name: 'custrecord_aio_sett_amount_type', operator: 'is', values: ['ItemPrice'] },
                    // {
                    //     name: 'custrecord_aio_sett_amount_desc',
                    //     operator: 'is',
                    //     values: ['Principal']
                    // },
                    { name: 'custrecord_aio_sett_credit_memo', operator: 'isnot', values: 'T' },
                    { name: 'custrecord_february_undeal', operator: 'isnot', values: 'F' }
                ]

                if (_order_id) {
                    fils.push({ name: 'custrecord_aio_sett_order_id', operator: 'startswith', values: _order_id })
                }

                if (_start_date && _end_date) {
                    fils.push({ name: 'custrecord_settlement_enddate', operator: 'within', values: [_li_dateFormat(_start_date, fmt), _li_dateFormat(_end_date, fmt)] }) // end date从2月份开始
                }
                if (_start_date && !_end_date) {
                    fils.push({ name: 'custrecord_settlement_enddate', operator: 'onorafter', values: [_li_dateFormat(_start_date, fmt)] }) // end date从2月份开始
                }
                if (!_start_date && _end_date) {
                    fils.push({ name: 'custrecord_settlement_enddate', operator: 'onorbefore', values: [_li_dateFormat(_end_date, fmt)] }) // end date从2月份开始
                }


                if (acc) {
                    fils.push({ name: 'custrecord_aio_account_2', operator: 'anyof', values: acc })
                }
                if (group) {
                    fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_aio_account_2', operator: 'anyof', values: group })
                }

                log.error("过滤器", fils);
                // fils.push({ name: 'custrecord_aio_account_region',join: 'custrecord_aio_account_2', operator: 'noneof', values: ['1'] })
                var mySearch = search.create({
                    type: 'customrecord_aio_amazon_settlement',
                    filters: fils,
                    columns: [
                        { name: 'custrecord_settlement_acc' },
                        { name: 'custrecord_aio_sett_amount_desc' },
                        { name: 'custrecord_aio_sett_amount_type' },
                        { name: 'custrecord_aio_sett_merchant_order_id' },
                        { name: 'custrecord_aio_sett_order_id' },
                        { name: 'custrecord_aio_sett_sku' },
                        { name: 'custrecord_aio_sett_amount' },
                        { name: 'custrecord_aio_sett_deposit_date' },
                        { name: 'custrecord_aio_sett_end_date' },
                        { name: 'custrecord_aio_sett_posted_date_time' },
                        { name: 'custrecord_aio_sett_marketplace_name' },
                        { name: 'custrecord_february_undeal' },
                        { name: 'custrecord_aio_sett_credit_memo' },
                        { name: 'custrecord_aio_sett_adjust_item_id' },
                        { name: 'custrecord_aio_sett_currency' },
                        // { name: 'internalid', sort: search.Sort.DESC },
                        { name: 'custrecord_division', join: 'custrecord_settlement_acc' },
                        { name: 'custrecord_aio_sett_quantity_purchased' },
                        { name: 'custrecord_aio_sett_id' },
                        { name: 'custrecord_aio_account_2' }
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

                    if (totalCount > 0) {
                        for (var i = 0; i < pageCount; i++) {
                            pageData.fetch({
                                index: i
                            }).data.forEach(function(rec) {
                                get_result.push({
                                    recid: rec.id,
                                    acc: rec.getValue(rec.columns[0]),
                                    acc_text: rec.getText(rec.columns[0]),
                                    marketplace_name: rec.getValue('custrecord_aio_sett_marketplace_name'),
                                    merchant_order_id: rec.getValue('custrecord_aio_sett_merchant_order_id'),
                                    merchant_adjustment_itemid: rec.getValue('custrecord_aio_sett_adjust_item_id'),
                                    order_id: rec.getValue('custrecord_aio_sett_order_id'),
                                    sku: rec.getValue('custrecord_aio_sett_sku'),
                                    amount: rec.getValue('custrecord_aio_sett_amount'),
                                    deposit_date: rec.getValue('custrecord_aio_sett_deposit_date'),
                                    endDate: rec.getValue('custrecord_aio_sett_end_date'),
                                    postDate: rec.getValue('custrecord_aio_sett_posted_date_time'),
                                    dept: rec.getValue(rec.columns[15]),
                                    curency_txt: rec.getValue('custrecord_aio_sett_currency'),
                                    setl_id: rec.getValue('custrecord_aio_sett_id'),
                                    aio_acc: rec.getValue('custrecord_aio_account_2'),
                                    quantity: rec.getValue('custrecord_aio_sett_quantity_purchased') ? rec.getValue('custrecord_aio_sett_quantity_purchased') : 1
                                })
                            });
                        }
                    }
                    var results = []
                    var count = 0
                    var r
                    for (var i = 0; i < get_result.length; i++) {
                        if (!r) {
                            r = []
                        }
                        r.push(get_result[i])
                        count++

                        if (count >= 2 || i == (get_result.length - 1)) {
                            results.push(JSON.stringify(r))
                            count = 0
                            r = []
                        }
                    }
                    log.error('runPaged 0000000results.length  ' + results.length, '搜索耗时：' + new Date().getTime() - sT)

                    return results

                }

                mySearch.run().each(function(rec) {
                    // if(rec.getValue("custrecord_aio_sett_amount_type") =="ItemPrice" && rec.getValue("custrecord_aio_sett_amount_desc") =="Principal")
                    payments.push({
                        recid: rec.id,
                        acc: rec.getValue(rec.columns[0]),
                        acc_text: rec.getText(rec.columns[0]),
                        marketplace_name: rec.getValue('custrecord_aio_sett_marketplace_name'),
                        merchant_order_id: rec.getValue('custrecord_aio_sett_merchant_order_id'),
                        merchant_adjustment_itemid: rec.getValue('custrecord_aio_sett_adjust_item_id'),
                        order_id: rec.getValue('custrecord_aio_sett_order_id'),
                        sku: rec.getValue('custrecord_aio_sett_sku'),
                        amount: rec.getValue('custrecord_aio_sett_amount'),
                        deposit_date: rec.getValue('custrecord_aio_sett_deposit_date'),
                        endDate: rec.getValue('custrecord_aio_sett_end_date'),
                        postDate: rec.getValue('custrecord_aio_sett_posted_date_time'),
                        dept: rec.getValue(rec.columns[15]),
                        curency_txt: rec.getValue('custrecord_aio_sett_currency'),
                        setl_id: rec.getValue('custrecord_aio_sett_id'),
                        aio_acc: rec.getValue('custrecord_aio_account_2'),
                        quantity: rec.getValue('custrecord_aio_sett_quantity_purchased') ? rec.getValue('custrecord_aio_sett_quantity_purchased') : 1
                    })
                    return --limit_payments > 0
                });

                var results = []
                var count = 0
                var r
                for (var i = 0; i < payments.length; i++) {
                    if (!r) {
                        r = []
                    }
                    r.push(payments[i])
                    count++

                    if (count >= 2 || i == (payments.length - 1)) {
                        results.push(JSON.stringify(r))
                        count = 0
                        r = []
                    }
                }
                log.error('0000000results.length  ' + results.length, '搜索耗时：' + new Date().getTime() - sT)


                return results
            } catch (e) {
                log.error('error:', e)
            }
        }

        function map(context) {


            // return;
            var startT = new Date().getTime()
            var acc_text
            var o
            var acc
            var transactionType = 'Payment_return'
            var err = []
            var objs = JSON.parse(context.value)
            var accounts, total
            log.debug('objs', JSON.stringify(objs))
            try {
                objs.map(function(obj) {
                    acc = obj.acc
                    acc_text = obj.acc_text
                    if (!acc) {
                        var markt
                        if (!obj.marketplace_name || JSON.stringify(obj.marketplace_name).indexOf('Amazon.') == -1) {
                            search.create({
                                type: 'customrecord_aio_amazon_settlement',
                                filters: [{
                                        name: 'custrecord_aio_sett_id',
                                        operator: 'is',
                                        values: obj.setl_id
                                    },
                                    {
                                        name: 'custrecord_aio_sett_marketplace_name',
                                        operator: 'contains',
                                        values: 'Amazon.'
                                    }
                                ],
                                columns: [{
                                    name: 'custrecord_aio_sett_marketplace_name'
                                }]
                            }).run().each(function(e) {
                                markt = e.getValue('custrecord_aio_sett_marketplace_name')
                            })
                        }
                        if (markt) {
                            acc = interfun.GetstoreInEU(obj.aio_acc, markt, 'acc_text').acc
                        }
                    }
                    // var rs_id =obj.rs_id
                    // acc = 27
                    // acc_text ="Levoit JP"
                    var settlerecord_id = obj.recid
                    var merchant_order_id = obj.merchant_order_id
                    var merchant_adjustment_itemid = obj.merchant_adjustment_itemid
                    var order_id = obj.order_id
                    var sku = obj.sku
                    var postDate = obj.postDate
                    var endDate_txt = obj.endDate
                    var deposit_date = obj.deposit_date
                    var curency_txt = obj.curency_txt
                    var dept = obj.dept
                    var amount = Number(obj.amount.replace(',', '.'))
                    var quantity = Math.abs(obj.quantity)
                    var endDate = interfun.getFormatedDate('', '', endDate_txt, '', true)
                    if (endDate.date == '2') { // posted date为2月份之前的不处理
                        log.debug('posted date为2月份之前的不处理:', endDate)
                        record.submitFields({
                            type: 'customrecord_aio_amazon_settlement',
                            id: settlerecord_id,
                            values: {
                                custrecord_february_undeal: 'F'
                            }
                        })
                        return
                    }
                    log.debug('endDate', endDate)
                    var skuid = interfun.getskuId(sku, acc).skuid,
                        rs
                    var status; // 退货订单状态
                    // 去重 搜索退货授权单
                    log.debug('skuid ' + skuid, acc + ',settlerecord_id,' + settlerecord_id + ',merchant_order_id:' + merchant_order_id)
                    try {
                        search.create({
                            type: record.Type.RETURN_AUTHORIZATION,
                            filters: [{
                                    name: 'custbody_origin_settlement',
                                    operator: 'anyof',
                                    values: settlerecord_id
                                }, // 就查看有没有这一条结算报告产生的退货单
                            ],
                            columns: [{
                                name: 'status'
                            }]
                        }).run().each(function(rec) {
                            log.debug('找到重复的了 ' + rec.id, rec.getValue('status'))
                            status = rec.getValue('status')
                            rs = rec.id
                        })
                    } catch (e) {
                        log.error('000search RETURN_AUTHORIZATION', e)
                    }
                    try {
                        log.debug('status:' + status, 'rs:' + rs)
                        if (!rs) {
                            var currency
                            if (curency_txt)
                                search.create({
                                    type: 'currency',
                                    filters: [{
                                        name: 'symbol',
                                        operator: 'is',
                                        values: curency_txt
                                    }]
                                }).run().each(function(e) {
                                    currency = e.id
                                })
                            // 如果没有对应的退货授权就create ，然后生成贷项通知单
                            createAuthorationFromPayment(settlerecord_id, acc, sku, endDate, merchant_order_id, quantity, amount, order_id, merchant_adjustment_itemid, currency, skuid, dept)
                        } else if (status == 'pendingReceipt' || status == 'pendingApproval') {
                            if (status == 'pendingApproval')
                                record.submitFields({
                                    type: 'returnauthorization',
                                    id: rs,
                                    values: {
                                        orderstatus: 'B',
                                        status: 'pendingReceipt'
                                    }
                                })
                            var cm
                            search.create({
                                type: record.Type.CREDIT_MEMO,
                                filters: [{
                                    name: 'createdfrom',
                                    operator: 'anyof',
                                    values: rs
                                }],
                                columns: [{
                                    name: 'status'
                                }] // applied 已核销
                            }).run().each(function(rec) {
                                log.debug('找到来源相同的贷项通知单  ' + rec.id, rec.getValue('status'))
                                cm = rec.id
                            })
                            // 如果没有对应的贷项通知单就transform
                            if (!cm) {
                                var credit_memo
                                log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
                                // 创建贷项通知单
                                credit_memo = record.transform({
                                    fromType: record.Type.RETURN_AUTHORIZATION,
                                    toType: record.Type.CREDIT_MEMO,
                                    fromId: Number(rs)
                                })
                                credit_memo.setText({
                                    fieldId: 'trandate',
                                    text: endDate.date
                                })
                                credit_memo.setValue({
                                    fieldId: 'custbody_order_locaiton',
                                    value: acc
                                })
                                credit_memo.setValue({
                                    fieldId: 'custbody_aio_marketplaceid',
                                    value: 1
                                })

                                // var lc = credit_memo.getLineCount({ sublistId: 'item' })
                                // for (var ln = 0; ln < lc; ln++) {
                                //     var line = return_authorization.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: credit_memo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) })
                                //     credit_memo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: return_authorization.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln })
                                // }
                                var cre = credit_memo.save({
                                    ignoreMandatoryFields: true
                                })
                                log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
                                // 创建客户退款
                                // credit_cr(merchant_order_id,settlerecord_id)
                                log.debug('OK')
                            }
                        }
                        log.debug('settlerecord_id :' + settlerecord_id)
                        record.submitFields({
                            type: 'customrecord_aio_amazon_settlement',
                            id: settlerecord_id,
                            values: {
                                custrecord_aio_sett_credit_memo: 'T',
                                custrecord_aio_sett_authorization: 'T'
                            }
                        })
                    } catch (e) {
                        log.error('error!' + order_id, e)
                        err.push(e)
                    }
                    log.audit('00000结束耗时', (new Date().getTime() - startT))
                })
            } catch (error) {
                log.error('error', error)
            }
            if (err.length > 0) {
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
                var date = format.parse({
                    value: (moment(new Date().getTime()).format(dateFormat)),
                    type: format.Type.DATE
                })
                var moId = createSOTRMissingOrder(transactionType, merchant_order_id, JSON.stringify(err), date, acc)
                log.error('出现错误，已创建missingorder' + moId)
            } else {
                makeresovle(transactionType, merchant_order_id, acc)
            }
        }

        function reduce(context) {}

        function summarize(summary) {

            log.debug('处理完成');
        }

        function makeresovle(type, orderid, acc) {
            var fils = []
            type ? fils.push({
                name: 'custrecord_tr_missing_order_type',
                operator: 'is',
                values: type
            }) : ''
            orderid ? fils.push({
                name: 'custrecord_missing_orderid_txt',
                operator: 'is',
                values: orderid
            }) : ''
            acc ? fils.push({
                name: 'custrecord_tracking_missing_acoount',
                operator: 'is',
                values: acc
            }) : ''
            search.create({
                type: 'customrecord_dps_transform_mo',
                filters: fils
            }).run().each(function(rec) {
                record.submitFields({
                    type: 'customrecord_dps_transform_mo',
                    id: rec.id,
                    values: {
                        custrecord_tr_missing_order_resolved: true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                })
                log.debug('make Resovle ' + rec.id, type + ' : ' + orderid)
                return true
            })
        }

        function createSOTRMissingOrder(type, orderid, reason, date, acc) {
            var mo
            var fils = []
            type ? fils.push({
                name: 'custrecord_tr_missing_order_type',
                operator: 'is',
                values: type
            }) : ''
            orderid ? fils.push({
                name: 'custrecord_missing_orderid_txt',
                operator: 'is',
                values: orderid
            }) : ''
            acc ? fils.push({
                name: 'custrecord_tracking_missing_acoount',
                operator: 'is',
                values: acc
            }) : ''
            var mo
            search.create({
                type: 'customrecord_dps_transform_mo',
                filters: fils
            }).run().each(function(rec) {
                mo = record.load({
                    type: 'customrecord_dps_transform_mo',
                    id: rec.id
                })
                return false
            })
            if (!mo) {
                mo = record.create({
                    type: 'customrecord_dps_transform_mo',
                    isDynamic: true
                })
            }
            type ?
                mo.setValue({
                    fieldId: 'custrecord_tr_missing_order_type',
                    value: type
                }) : ''; // 类型
            acc ?
                mo.setValue({
                    fieldId: 'custrecord_tracking_missing_acoount',
                    value: acc
                }) : ''
            orderid ?
                mo.setValue({
                    fieldId: 'custrecord_missing_orderid_txt',
                    value: orderid
                }) : ''
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_reason',
                value: reason
            })
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_date',
                value: date
            })
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_resolved',
                value: false
            })
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_resolving',
                value: false
            })
            return mo.save()
        }

        function getAcc(acc) {
            var t = fiedls.account,
                tsite = fiedls.amazon_global_sites,
                tdev = fiedls.amazon_dev_accounts
            var accounts = {},
                fin = []
            search.create({
                type: t._name,
                filters: [{
                        name: 'internalidnumber',
                        operator: 'equalto',
                        values: acc
                    },
                    {
                        name: 'custrecord_aio_marketplace',
                        operator: 'anyof',
                        values: 1 /* amazon */
                    },
                    {
                        name: 'custrecord_aio_seller_id',
                        operator: 'isnotempty'
                    },
                    /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                    {
                        name: 'custrecord_aio_dev_account',
                        operator: 'noneof',
                        values: '@NONE@'
                    }
                ],
                columns: [
                    /** * 名称 * @index 0 */
                    {
                        name: 'name'
                    },
                    /** * 账户API信息 * @index 1 */
                    {
                        name: t.seller_id
                    },
                    {
                        name: t.mws_auth_token
                    },
                    {
                        name: tsite.amazon_marketplace_id,
                        join: t.enabled_sites
                    },
                    {
                        name: tsite.amazon_mws_endpoint,
                        join: t.enabled_sites
                    },
                    {
                        name: tdev.aws_access_key_id,
                        join: t.dev_account
                    },
                    {
                        name: tdev.secret_key_guid,
                        join: t.dev_account
                    },
                    /** * 账户基础信息 * @index 7 * */
                    {
                        name: 'name'
                    },
                    {
                        name: t.currency
                    },
                    {
                        name: 'custrecord_aio_if_salesorder'
                    },
                    {
                        name: 'custrecord_aio_salesorder_type'
                    },
                    {
                        name: 'custrecord_aio_salesorder_form'
                    },
                    {
                        name: 'custrecord_aio_salesorder_location'
                    },
                    {
                        name: 'custrecord_aio_salesorder_start_date'
                    },
                    /** * FBA信息 * @index 14 */
                    {
                        name: 'custrecord_aio_if_fbaorder'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_type'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_form'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_location'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_start_date'
                    },
                    /**@index 19 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_including_fees'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 其他信息 * @index 28 */
                    {
                        name: 'custrecord_division'
                    },
                    {
                        name: 'custrecord_aio_salesorder_payment_method'
                    },
                    {
                        name: 'custrecord_aio_discount_item'
                    },
                    {
                        name: 'custrecord_aio_tax_item'
                    },
                    {
                        name: tsite.amazon_currency,
                        join: t.enabled_sites
                    },
                    /** * 公司信息 * @index 33 */
                    core.utils.checkIfSubsidiaryEnabled() ? {
                        name: 'custrecord_aio_subsidiary'
                    } : {
                        name: 'formulanumeric',
                        formula: '0'
                    },
                    /** * 报告抓取信息 * @index 34 */
                    {
                        name: 'custrecord_aio_if_handle_removal_report'
                    },
                    {
                        name: 'custrecord_aio_if_handle_custrtn_report'
                    },
                    /** * Preferences * @index 36 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                    {
                        name: 'custrecord_aio_if_handle_inv_report'
                    },
                    {
                        name: 'custrecord_aio_to_default_from_location'
                    },
                    {
                        name: 'custrecord_aio_shipping_item'
                    },
                    {
                        name: 'custrecord_aio_to_form'
                    },
                    /** @index 48 */
                    {
                        name: fiedls.account.if_post_order_fulfillment
                    },
                    {
                        name: fiedls.account.post_order_if_search
                    },
                    {
                        name: fiedls.account.if_handle_sett_report
                    },
                    /** 检验亚马逊的密钥是否加密了 @index 51 */
                    {
                        name: 'custrecord_aio_amazon_marketplace',
                        join: 'custrecord_aio_enabled_sites'
                    },
                    {
                        name: 'custrecord_aio_customer'
                    }

                ]
            }).run().each(function(rec) {
                accounts = {
                    id: rec.id,
                    country: rec.getValue(rec.columns[51]),
                    customer: rec.getValue(rec.columns[52]),
                    auth_meta: {
                        seller_id: rec.getValue(rec.columns[1]),
                        auth_token: rec.getValue(rec.columns[2]),
                        access_id: rec.getValue(rec.columns[5]),
                        sec_key: rec.getValue(rec.columns[6]),
                        end_point: rec.getValue(rec.columns[4])
                    },
                    info: {
                        name: rec.getValue(rec.columns[7]),
                        currency: rec.getValue(rec.columns[8]),
                        if_salesorder: rec.getValue(rec.columns[9]),
                        salesorder_type: rec.getValue(rec.columns[10]),
                        salesorder_form: rec.getValue(rec.columns[11]),
                        salesorder_location: rec.getValue(rec.columns[12]),
                        salesorder_start_date: rec.getValue(rec.columns[13]),
                        dept: rec.getValue(rec.columns[28]),
                        salesorder_payment_method: rec.getValue(rec.columns[29]),
                        discount_item: rec.getValue(rec.columns[30]),
                        shipping_cost_item: rec.getValue(rec.columns[46]),
                        tax_item: rec.getValue(rec.columns[31]),
                        site_currency: rec.getValue(rec.columns[32]),
                        subsidiary: Number(rec.getValue(rec.columns[33])),
                        enable_tracking_upload: rec.getValue(rec.columns[48]),
                        enabled_tracking_upload_search: rec.getValue(rec.columns[49])
                    },
                    extra_info: {
                        if_fbaorder: rec.getValue(rec.columns[14]),
                        fbaorder_type: rec.getValue(rec.columns[15]),
                        fbaorder_form: rec.getValue(rec.columns[16]),
                        fbaorder_location: rec.getValue(rec.columns[17]),
                        fbaorder_start_date: rec.getValue(rec.columns[18]),
                        if_including_fees: rec.getValue(rec.columns[26]),
                        if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                        if_handle_removal_report: rec.getValue(rec.columns[34]),
                        if_handle_inventory_report: rec.getValue(rec.columns[44]),
                        if_handle_settlement_report: rec.getValue(rec.columns[50]),
                        to_default_from_location: rec.getValue(rec.columns[45]),
                        aio_to_default_form: rec.getValue(rec.columns[47])
                    },
                    marketplace: rec.getValue(rec.columns[3]),
                    preference: {
                        if_only_paid_orders: rec.getValue(rec.columns[36]),
                        salesorder_if_taxed: rec.getValue(rec.columns[37]),
                        salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                        salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                        if_zero_price: rec.getValue(rec.columns[40]),
                        if_check_customer_email: rec.getValue(rec.columns[41]),
                        if_check_customer_addr: rec.getValue(rec.columns[42]),
                        if_payment_as_tran_date: rec.getValue(rec.columns[43])
                    }
                }
            })
            return accounts
        }

        /**
         * 创建退货授权单，然后转贷项通知单
         * @param {*} settlerecord_id
         * @param {*} acc
         * @param {*} sku
         * @param {*} postDate
         * @param {*} merchant_order_id
         * @param {*} quantity
         * @param {*} amount
         * @param {*} acc_text
         * @param {*} deposit_date
         * @param {*} merchant_adjustment_itemid
         */
        function createAuthorationFromPayment(settlerecord_id, acc, sku, endDate, merchant_order_id, quantity, amount, order_id, merchant_adjustment_itemid, currency, skuid, dept) {
            var account = getAcc(acc)
            log.debug('account', account)
            var loc, cid, rt_tax, R_memo,
                tax_item = account.info.tax_item,
                loc = account.extra_info.fbaorder_location,
                salesorder_if_taxed = account.preference.salesorder_if_taxed,
                country = account.country
            // 根据merchant_adjustment_itemid merchant_order_id和sku匹配对应的tax
            var tray
            // 配置为应收待结算的都算作收入/退款金额
            var fils = [{
                    name: 'custrecord_aio_sett_tran_type',
                    operator: 'contains',
                    values: ['Refund']
                },
                {
                    name: 'custrecord_aio_sett_adjust_item_id',
                    operator: 'is',
                    values: merchant_adjustment_itemid
                },
                {
                    name: 'custrecord_aio_sett_sku',
                    operator: 'is',
                    values: sku
                }

            ]
            if (merchant_order_id) {
                fils.push({
                    name: 'custrecord_aio_sett_merchant_order_id',
                    operator: 'is',
                    values: merchant_order_id
                })
            }
            if (order_id) {
                fils.push({
                    name: 'custrecord_aio_sett_order_id',
                    operator: 'is',
                    values: order_id
                })
            }
            search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: fils,
                columns: [{
                        name: 'custrecord_aio_sett_amount'
                    },
                    {
                        name: 'custrecord_aio_sett_currency'
                    },
                    {
                        name: 'custrecord_aio_sett_tran_type'
                    },
                    {
                        name: 'custrecord_aio_sett_amount_type'
                    },
                    {
                        name: 'custrecord_aio_sett_amount_desc'
                    }
                ]
            }).run().each(function(rec) {
                var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type')
                var Amount_type = rec.getValue('custrecord_aio_sett_amount_type')
                var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc')
                var currency_txt = rec.getValue('custrecord_aio_sett_currency')
                var a = rec.getValue('custrecord_aio_sett_amount').replace(',', '.')
                log.audit('金额:' + a, '类型：' + Tranction_type + ',' + Amount_type + ',' + Amount_desc)
                if (!(Amount_type == 'ItemPrice' && Amount_desc == 'Principal')) {
                    var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt)
                    if (ck) {
                        log.debug('属于应收 金额 : ' + typeof(a), a)
                        amount = amount + Number(a)
                        log.debug('等于,', amount)
                    }
                }
                return true
            })
            // search.create({
            //   type: 'customrecord_aio_account',
            //   filters: [
            //     {name: 'internalidnumber',operator: 'equalto',values: acc}
            //   ],columns: [
            //     {name: 'custrecord_aio_seller_id'},
            //     {name: 'custrecord_aio_subsidiary'},
            //     {name: 'custrecord_aio_customer'},
            //     {name: 'custrecord_aio_enabled_sites'},
            //     {name: 'name'},
            //     {name: 'custrecord_division'}, // object
            //   ]
            // }).run().each(function (e) {

            //   report_site = e.getText(e.columns[3])
            //   report_siteId = e.getValue(e.columns[3])
            // })

            // var incc = interfun.GetSettlmentFee('ItemPrice', 'Tax', tray, report_site.split(' ')[1], rt_tax, report_siteId, acc)
            // log.debug('amount1111:' + amount + ',rt_tax:' + rt_tax, 'incc:' + JSON.stringify(incc))
            // if (!incc) throw '找不到费用,' + 'Tax' + ',' + 'ItemPrice' + ',' + tray
            // if (incc.incomeaccount == '125') {
            //   amount += Number(rt_tax)
            // }
            log.debug('amount2222:' + amount, '单价:' + amount + '/' + quantity + ' = ' + (amount / quantity).toFixed(2))
            cid = account.customer
            var rt = record.create({
                type: record.Type.RETURN_AUTHORIZATION,
                isDynamic: true
            })
            rt.setValue({
                fieldId: 'entity',
                value: cid
            })
            rt.setValue({
                fieldId: 'location',
                value: loc
            })
            rt.setValue({
                fieldId: 'currency',
                value: currency
            })
            if (merchant_order_id) {
                rt.setValue({
                    fieldId: 'otherrefnum',
                    value: merchant_order_id
                })
            } else {
                rt.setValue({
                    fieldId: 'otherrefnum',
                    value: order_id
                })
            }
            rt.setValue({
                fieldId: 'department',
                value: dept
            })
            rt.setText({
                fieldId: 'trandate',
                text: endDate.date
            })
            rt.setValue({
                fieldId: 'custbody_order_locaiton',
                value: acc
            })
            rt.setValue({
                fieldId: 'custbody_aio_account',
                value: acc
            })
            rt.setValue({
                fieldId: 'custbody_aio_is_aio_order',
                value: true
            })
            rt.setValue({
                fieldId: 'custbody_origin_settlement',
                value: settlerecord_id
            }); // 设置关联的结算报告
            log.debug('skuid:' + skuid, 'merchant_order_id :' + merchant_order_id)
            rt.selectNewLine({
                sublistId: 'item'
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: skuid
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                value: loc
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_aio_amazon_msku',
                value: sku
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: quantity
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: Math.abs(Math.round((amount / quantity) * 100) / 100)
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                value: Math.abs(Math.round(amount * 100) / 100)
            })
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                value: tax_item ? tax_item : 6
            })

            try {
                rt.commitLine({
                    sublistId: 'item'
                })
            } catch (err) {
                log.error('commitLine error', err)
            }
            log.debug('增加货品成功');
            var rs = rt.save({
                ignoreMandatoryFields: true
            });
            log.debug('生成退货单成功', rs)
            log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
            // 创建贷项通知单
            var credit_memo = record.transform({
                fromType: record.Type.RETURN_AUTHORIZATION,
                toType: record.Type.CREDIT_MEMO,
                fromId: Number(rs)
            })

            credit_memo.setText({
                fieldId: 'trandate',
                text: endDate.date
            })
            credit_memo.setValue({
                fieldId: 'custbody_order_locaiton',
                value: acc
            })
            credit_memo.setValue({
                fieldId: 'custbody_aio_marketplaceid',
                value: 1
            })
            // var lc = credit_memo.getLineCount({ sublistId: 'item' })
            // for (var ln = 0; ln < lc; ln++) {
            //     var line = return_authorization.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: credit_memo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) })
            //     credit_memo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: return_authorization.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln })
            // }
            var cre = credit_memo.save({
                ignoreMandatoryFields: true
            })
            log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
            return rs
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
            if (taskStatus.status === 'FAILED') {
                email.send({
                    author: authorId,
                    recipients: recipientEmail,
                    subject: 'Failure executing map/reduce job!',
                    body: 'Map reduce task: ' + mapReduceScriptId + ' has failed. \n 记录ID ' + recId + "\n 参数为\n" + JSON.stringify(param)
                });
            } else {
                email.send({
                    author: authorId,
                    recipients: recipientEmail,
                    subject: 'Executing map/reduce job!',
                    body: 'Map reduce task: ' + mapReduceScriptId + ' has activated. \n 记录ID ' + recId + "\n 参数为\n" + JSON.stringify(param)
                });
            }
        }


        function _li_dateFormat(date, fmt) {
            var o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            }
            if (/(y+)/.test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
            }
            for (var k in o) {
                if (new RegExp('(' + k + ')').test(fmt)) {
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
                }
            }
            return fmt;
        }


        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    })