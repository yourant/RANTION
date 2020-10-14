/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-09-26 17:26:27
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \douples_amazon\dps_return_jourSettle_mp1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime', './Helper/interfunction.min',
    'N/task'
], function(search, record, moment, format, runtime, interfun, task) {
    const MissingReportType = 4 // Missing report ���㱨��Settlement report - Order
    const dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
    const date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
    });

    const fmt = "yyyy-M-d";
    const JP_currency = 8
    const income_fin = 363 // ????????????-??????	 1122.05
    const income_settle = 125 // 待结算科目  1122.03.01	应收账款-待结算-Amazon
    const Fincome_Plat = 1363 // 预收账款科目	客户存款
    const Amazon_Plat = 622 // ????????????-???? Amazon	 1122.04.01
    const income_Refund = 652 // 退款科目	 6001.06.01 主营业务收入：退款：Amazon
    const paymentmethod = 7 // ??????д????
    const AR_settle = 125 //  待结算科目  1122.03.01 应收账款-待结算-Amazon

    // �����Ѹ���ķ�Ʊ�����г���
    function getInputData() {
        try {
            var limit = 4000,
                orders = []
            var acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_sotre'
            })
            // var country = runtime.getCurrentScript().getParameter({ name: 'custscript_country_refund' })
            var group = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_settle_group' });

            var runPaged = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_settle_runpaged' });
            var order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_li_record_order_id' });

            var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_settle_start_date' });
            var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_settle_end_date' });
            log.audit('ѡ��ĵ���:' + acc, 'group:' + group)

            var fils = [
                ['custrecord_aio_sett_tran_type', 'contains', 'Refund'],
                //   'and',
                //   ['custrecord_settlement_acc', 'noneof', '@NONE@'],
                // 'and',
                // ['custrecord_aio_sett_credit_memo', 'is', 'T'],
                'and',
                ['custrecord_settle_is_generate_voucher', 'is', false],
                'and',
                ['custrecord_payment_itemprice_pt', 'is', false],
                'and',
                ['custrecord_february_undeal', 'isnot', 'F']

            ]


            if (_start_date && _end_date) {
                fils.push("and", ['custrecord_settlement_enddate', 'within', [_li_dateFormat(_start_date, fmt), _li_dateFormat(_end_date, fmt)]]) // end date从2月份开始
            }
            if (_start_date && !_end_date) {
                fils.push("and", ['custrecord_settlement_enddate', 'onorafter', [_li_dateFormat(_start_date, fmt)]]) // end date从2月份开始
            }
            if (!_start_date && _end_date) {
                fils.push("and", ['custrecord_settlement_enddate', 'onorbefore', [_li_dateFormat(_end_date, fmt)]]) // end date从2月份开始
            }

            if (acc) {
                fils.push('and')
                fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [acc]])
            }
            if (group) {
                fils.push('and')
                fils.push(['custrecord_aio_account_2.custrecord_aio_getorder_group', 'anyof', [group]])
            }
            if (order_id) {
                fils.push('and')
                fils.push(['custrecord_aio_sett_order_id', 'startswith', order_id])
            }

            log.audit("fils", fils);
            var mySearch = search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: fils,
                columns: [
                    { name: 'custrecord_aio_sett_id', summary: 'GROUP' }, // �� settlement id�͵��ŷ���
                    { name: 'custrecord_aio_sett_order_id', summary: 'GROUP' },
                    { name: 'custrecord_aio_sett_report_id', summary: 'GROUP' },
                    { name: 'custrecord_aio_sett_merchant_order_id', summary: 'GROUP' },
                    { name: 'custrecord_settlement_acc', summary: 'GROUP' }, // 实际店铺
                ]
            })

            if (runPaged) {
                var get_result = []; // 结果
                var pageSize = 1000; // 每页条数
                var pageData = mySearch.runPaged({
                    pageSize: pageSize
                })
                var totalCount = pageData.count; // 总数

                log.error('总共的数据量', totalCount)
                var pageCount = pageData.pageRanges.length; // 页数
                log.error('总共的页数', pageCount)

                if (totalCount > 0) {
                    for (var i = 0; i < pageCount; i++) {
                        pageData.fetch({
                            index: i
                        }).data.forEach(function(rec) {
                            get_result.push({
                                'settle_id': e.getValue(e.columns[0]) + '',
                                'reportId': e.getValue(e.columns[2]),
                                'merchant_order_id': e.getValue(e.columns[3]),
                                'orderid': e.getValue(e.columns[1]),
                                'settlement_acc': e.getValue(e.columns[4])
                            })
                        })
                    }
                }

                return get_result
            }

            log.audit('不执行runPaged', '不执行runPaged')
            mySearch.run().each(function(e) {
                orders.push({
                    'settle_id': e.getValue(e.columns[0]) + '',
                    'reportId': e.getValue(e.columns[2]),
                    'merchant_order_id': e.getValue(e.columns[3]),
                    'orderid': e.getValue(e.columns[1]),
                    'settlement_acc': e.getValue(e.columns[4])
                })
                return --limit > 0
            })
        } catch (e) {
            log.error('get input :error', e)
        }
        log.error('订单总数：', orders.length)
        return orders
    }

    function map(context) {
        log.audit('开始执行 map 函数', '开始执行 map 函数')
        var err = []
        var so_id
        try {
            var obj = JSON.parse(context.value)
            var orderid = obj.orderid
            var settlement_acc = obj.settlement_acc
            var settlmentid = obj.settle_id
            var reportId = obj.reportId
            var merchant_order_id = obj.merchant_order_id
            var entity, orderstatus, subsidiary, currency, settlement_idObj = {},
                settlement_ids = [],
                settlmentID = {},
                shipsID = {},
                pr_store = obj.settlement_acc,
                item_code
            var cl_date
            var endDate, postDate, depositDate, incomeaccount
            var postdate_arry = []
            var postdate_obj = {},
                check_post_date, PT_Arrys = [] // ��¼�»��ۺ�˰
            var currency_txt
            var Item_amount = 0,
                m_postdate_obj = {},
                settlement_idArrs = []

            var search_acc, seller_id, report_acc, report_site, report_subsidiary, report_customer, report_siteId, dept // 部门

            search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: [
                    { name: 'custrecord_aio_sett_order_id', operator: 'is', values: orderid },
                    { name: 'custrecord_aio_sett_id', operator: 'is', values: settlmentid + '' },
                    { name: 'custrecord_settle_is_generate_voucher', operator: 'is', values: false },
                    { name: 'custrecord_payment_itemprice_pt', operator: 'is', values: false },
                    { name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: 'Refund' }
                ],
                columns: [
                    { name: 'custrecord_aio_sett_tran_type' },
                    { name: 'custrecord_aio_sett_amount_type' },
                    { name: 'custrecord_aio_sett_amount_desc' },
                    { name: 'custrecord_aio_sett_amount' },
                    { name: 'custrecord_aio_sett_order_id' },
                    { name: 'custrecord_aio_sett_posted_date_time' },
                    { name: 'custrecord_aio_sett_end_date' },
                    { name: 'custrecord_aio_sett_currency' },
                    { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id' },
                    { name: 'custrecord_aio_sett_deposit_date' },
                    { name: 'custrecord_aio_sett_order_item_code' },
                    { name: 'custrecord_aio_sett_adjust_item_id' }, // MERCHANT ADJUSTMENT ITEM ID
                    { name: 'custrecord_aio_sett_start_date' },
                    { name: 'custrecord_aio_account_2' },
                    { name: 'custrecord_aio_sett_marketplace_name' }
                ]
            }).run().each(function(rec) {
                log.audit('1', rec)
                if (!currency)
                    currency_txt = rec.getValue('custrecord_aio_sett_currency')
                if (!pr_store)
                    pr_store = rec.getValue(rec.columns[8])
                if (!endDate) {
                    endDate = rec.getValue('custrecord_aio_sett_end_date')
                    cl_date = interfun.getFormatedDate('', '', endDate)
                }
                postDate = rec.getValue('custrecord_aio_sett_posted_date_time')
                var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type')
                var Amount_type = rec.getValue('custrecord_aio_sett_amount_type')
                var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc')
                var amount = rec.getValue('custrecord_aio_sett_amount')
                if (amount.indexOf(',') != -1) {
                    amount = amount.replace(',', '.')
                }

                log.audit("检测时间店铺", settlement_acc);
                if (!settlement_acc) {
                    var markt
                    if (!rec.getValue('custrecord_aio_sett_marketplace_name') || JSON.stringify(rec.getValue('custrecord_aio_sett_marketplace_name')).indexOf('Amazon.') == -1) {
                        search.create({
                            type: 'customrecord_aio_amazon_settlement',
                            filters: [
                                { name: 'custrecord_aio_sett_id', operator: 'is', values: rec.getValue('custrecord_aio_sett_id') + '' },
                                { name: 'custrecord_aio_sett_marketplace_name', operator: 'contains', values: 'Amazon.' }
                            ],
                            columns: [{ name: 'custrecord_aio_sett_marketplace_name' }]
                        }).run().each(function(e) {
                            markt = e.getValue('custrecord_aio_sett_marketplace_name')
                        })
                    } else if (JSON.stringify(rec.getValue('custrecord_aio_sett_marketplace_name')).indexOf('Amazon.') > -1) {
                        markt = rec.getValue('custrecord_aio_sett_marketplace_name')
                    }

                    log.audit("获取市场名称", markt)
                    if (markt && markt != "Amazon.com") {

                        log.audit("不属于北美")
                        settlement_acc = interfun.GetstoreInEU(rec.getValue('custrecord_aio_account_2'), markt, 'acc_text').acc;
                        log.debug(" markt   " + markt, settlement_acc);
                    } else if (markt == "Amazon.com") {
                        log.audit("属于北美")
                        settlement_acc = interfun.GetstoreofCurrency(currency_txt, rec.getValue('custrecord_aio_account_2'))
                    }
                }

                log.audit("获取实际店铺 settlement_acc", settlement_acc)
                log.audit('2', rec)
                item_code = rec.getValue('custrecord_aio_sett_order_item_code')
                var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt)
                log.audit('3', rec)
                if (ck || !Tranction_type) {
                    log.audit('是属于应收:' + rec.id, Tranction_type + ' , ' + Amount_type + ' , ' + Amount_desc)
                    PT_Arrys.push(rec.id)
                } else {
                    log.audit('不是属于应收:' + rec.id, Tranction_type + ' , ' + Amount_type + ' , ' + Amount_desc)
                    settlement_idArrs.push(rec.id)
                    var month, mok = false,
                        pos
                    pos = interfun.getFormatedDate('', '', postDate)
                    month = pos.Month // �õ���
                    for (var mo in m_postdate_obj) {
                        if (mo == month) {
                            m_postdate_obj[month].push(pos)
                            settlement_idObj[settlmentid + '-' + month].push(rec.id)
                            mok = true
                            break
                        }
                    }
                    if (!mok) {
                        postdate_arry = []
                        postdate_arry.push(pos)
                        m_postdate_obj[month] = postdate_arry
                        settlement_ids = [];
                        settlement_ids.push(rec.id)
                        settlement_idObj[settlmentid + '-' + month] = settlement_ids // �洢��IDҲҪ����settlmentid+"-"+month ������
                    }
                    log.audit('查看金额', amount)
                    var sek = false,
                        shk = false
                    if (Number(amount) != 0) {
                        for (var key in settlmentID) {
                            log.debug('key:' + key, settlmentid)
                            if (key == settlmentid + '-' + month) {
                                sek = true
                                for (var ke in settlmentID[key]) {
                                    if (ke == item_code) {
                                        settlmentID[key][ke].push({
                                            'Tranction_type': Tranction_type,
                                            'Amount_type': Amount_type,
                                            'Amount_desc': Amount_desc,
                                            'memo': '�� ' + orderid + ' ��',
                                            'amount': Math.round(parseFloat(amount) * 100) / 100,
                                            'field': 'credit',
                                            'depositDate': depositDate
                                        })
                                        shk = true
                                        break
                                    }
                                }
                                if (!shk) {
                                    shipmentid_Arrys = []
                                    shipmentid_Arrys.push({
                                        'Tranction_type': Tranction_type,
                                        'Amount_type': Amount_type,
                                        'Amount_desc': Amount_desc,
                                        'memo': '�� ' + orderid + ' ��',
                                        'amount': Math.round(parseFloat(amount) * 100) / 100,
                                        'field': 'credit',
                                        'depositDate': depositDate
                                    })
                                    settlmentID[key][item_code] = shipmentid_Arrys
                                }
                                break
                            }
                        }
                        if (!sek) {
                            shipmentid_Arrys = []
                            shipsID = {}
                            shipmentid_Arrys.push({
                                'Tranction_type': Tranction_type,
                                'Amount_type': Amount_type,
                                'Amount_desc': Amount_desc,
                                'memo': '�� ' + orderid + ' ��',
                                'amount': Math.round(parseFloat(amount) * 100) / 100,
                                'field': 'credit',
                                'depositDate': depositDate
                            })
                            shipsID[item_code] = shipmentid_Arrys
                            settlmentID[settlmentid + '-' + month] = shipsID
                        }
                    }
                }
                return true
            })


            log.audit("settlement_acc", settlement_acc);
            // �õ�seller id
            search.create({
                type: 'customrecord_aio_account',
                filters: [{
                    name: 'internalidnumber',
                    operator: 'equalto',
                    values: settlement_acc
                }],
                columns: [
                    { name: 'custrecord_aio_seller_id' },
                    { name: 'custrecord_aio_subsidiary' },
                    { name: 'custrecord_aio_customer' },
                    { name: 'custrecord_aio_enabled_sites' },
                    { name: 'name' },
                    { name: 'custrecord_division' }
                ]
            }).run().each(function(e) {
                seller_id = e.getValue(e.columns[0])
                report_subsidiary = e.getValue(e.columns[1])
                report_customer = e.getValue(e.columns[2])
                report_site = e.getText(e.columns[3])
                report_siteId = e.getValue(e.columns[3])
                report_acc = settlement_acc
                acc_text = e.getValue(e.columns[4])
                dept = e.getValue(e.columns[5])
            })
            search_acc = settlement_acc
            log.debug('seller_id: ' + seller_id, 'search_acc ' + search_acc)

            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    { name: 'poastext', operator: 'is', values: orderid },
                    { name: 'custrecord_aio_sett_id', join: 'custbody_origin_settlement', operator: 'is', values: settlmentid + '' },
                    { name: 'mainline', operator: 'is', values: true }
                ],
                columns: [
                    { name: 'entity' },
                    { name: 'statusref' },
                    { name: 'subsidiary' },
                    { name: 'currency' },
                    { name: 'custbody_order_locaiton' }
                ]
            }).run().each(function(rec) {
                so_id = rec.id
                entity = rec.getValue('entity')
                orderstatus = rec.getValue('statusref')
                subsidiary = rec.getValue('subsidiary')
                // currency = rec.getValue('currency')
                pr_store = rec.getValue('custbody_order_locaiton')
            })
            if (!so_id) {
                log.debug('找不到订单?', orderid)
                entity = report_customer
                subsidiary = report_subsidiary
                pr_store = report_acc
            }
            log.audit('orderstatus ' + orderstatus + ',' + 'entity: ' + entity, 'orderid:' + orderid)
            //  delJour(orderid)

            PT_Arrys.map(function(pt) {
                record.submitFields({
                    type: 'customrecord_aio_amazon_settlement',
                    id: pt,
                    values: {
                        custrecord_payment_itemprice_pt: true,
                        custrecord_settle_is_generate_voucher: false
                    }
                })
            })
            if (currency_txt)
                search.create({
                    type: 'currency',
                    filters: [{ name: 'symbol', operator: 'is', values: currency_txt }]
                }).run().each(function(e) {
                    currency = e.id
                })
            var so_obj = interfun.SearchSO(orderid, merchant_order_id, search_acc, cl_date.date)

            if (so_obj.fulfill == 'isrefund') {
                var sdk = record.create({
                    type: 'customerrefund',
                    isDynamic: true
                })
                sdk.setValue({
                    fieldId: 'customer',
                    value: so_obj.entity
                })
                sdk.setValue({
                    fieldId: 'paymentmethod',
                    value: paymentmethod
                }) // ����
                sdk.setValue({
                    fieldId: 'account',
                    value: AR_settle
                }) // ��Ŀ
                sdk.setValue({
                    fieldId: 'aracct',
                    value: Amazon_Plat
                }) // Ӧ�տ���ͻ�
                sdk.setValue({
                    fieldId: 'currency',
                    value: currency
                })
                sdk.setValue({
                    fieldId: 'department',
                    value: dept
                })
                sdk.setText({
                    fieldId: 'trandate',
                    text: cl_date.date
                })
                var len = sdk.getLineCount({
                    sublistId: 'deposit'
                })
                log.debug('len:' + len)
                for (var i = 0; i < len; i++) {
                    sdk.selectLine({
                        sublistId: 'deposit',
                        line: i
                    })
                    if (sdk.getCurrentSublistValue({
                            sublistId: 'deposit',
                            fieldId: 'doc'
                        }) == so_obj.cust_depo)
                        sdk.setCurrentSublistValue({
                            sublistId: 'deposit',
                            fieldId: 'apply',
                            value: true
                        })
                    break
                }
                var ss = sdk.save()
                settlement_idArrs.map(function(set_id) {
                    record.submitFields({
                        type: 'customrecord_aio_amazon_settlement',
                        id: set_id,
                        values: {
                            custrecord_settle_is_generate_voucher: true
                        }
                    })
                })
                return
            }
            log.debug('settlmentID:' + JSON.stringify(settlmentID))
            log.debug('settlement_idObj:', JSON.stringify(settlement_idObj))
            for (var key in settlmentID) {
                log.debug('key write:' + key)
                // ����ռ��� re02 �Ƿ����
                if (interfun.CheckJO(orderid, key, settlement_idObj[key], '退款结算')) {
                    context.write({
                        key: key.split('-')[0] + '.' + orderid + '.' + key.split('-')[1], // settl id + orderid+ month Ϊһ��
                        value: {
                            'cl_date': cl_date,
                            'subsidiary': subsidiary,
                            'orderid': orderid,
                            'entity': entity,
                            'so_id': so_id,
                            'currency': currency,
                            'pr_store': pr_store,
                            'shipmentids': settlmentID[key],
                            'settlement_ids': settlement_idObj[key],
                            'postdate_arry': m_postdate_obj[key.split('-')[1]], // ���·����post date
                            'search_acc': search_acc, // ���������ĵ���
                            'report_site': report_site, // վ�������
                            'report_siteId': report_siteId, // վ��
                            'dept': dept, // վ��
                        }
                    })
                }
            }
        } catch (e) {
            log.error('eerroor:', e)
            err.push(e.message)
        }

        // ����missorder
        if (err.length > 0) {
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
            var date = format.parse({
                value: (moment(new Date().getTime()).format(dateFormat)),
                type: format.Type.DATE
            })

            var moId = createSOTRMissingOrder('returnjour', so_id, JSON.stringify(err), date)
            log.debug('���ִ����Ѵ���missingorder' + moId)
        }
    }

    function reduce(context) {
        log.debug(' reduce context', JSON.stringify(context))
        try {
            var v = context.values
            var settlmentid = context.key.split('.')[0] + '-' + context.key.split('.')[2] // setllment ID + month
            log.debug(' settlmentid :' + settlmentid, context.key)
            // �ҵ� shipment id ��Ӧ�ķ�Ʊ�����ϱ�ע��������ͼ�¼
            v.map(function(obj) {
                var jo_2, jo1_id = []
                var DR = 0,
                    CR = 0
                obj = JSON.parse(obj)
                var cl_date = obj.cl_date
                var settlement_ids = obj.settlement_ids
                var pr_store = obj.pr_store
                var orderid = obj.orderid
                var currency = obj.currency
                var entity = obj.entity
                var subsidiary = obj.subsidiary
                var search_acc = obj.search_acc
                var report_site = obj.report_site
                var report_siteId = obj.report_siteId
                var dept = obj.dept

                var depositDate
                // ===========================================
                var item_codes = []
                if (!cl_date) { // ���ȡ����post date ����Ĭ��ȡ��һ��
                    cl_date = obj.postdate_arry[0].date
                }
                var shipmentids = obj.shipmentids
                var jour = record.create({
                    type: 'journalentry',
                    isDynamic: true
                })
                jour.setValue({
                    fieldId: 'memo',
                    value: '退款结算'
                })
                jour.setValue({
                    fieldId: 'custbody_jour_type',
                    value: 'refunds'
                })
                jour.setValue({
                    fieldId: 'custbody_jour_orderid',
                    value: orderid
                })
                jour.setValue({
                    fieldId: 'custbody_curr_voucher',
                    value: '退款结算凭证'
                })
                log.debug('orderid:' + orderid, 'settlmentid:' + settlmentid + '')
                jour.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiary
                })
                jour.setValue({
                    fieldId: 'custbody_order_locaiton',
                    value: pr_store
                })
                jour.setValue({
                    fieldId: 'currency',
                    value: currency
                })

                var relative_finance = [],
                    jo_2, jo1_id
                var jo1_arrys = [],
                    jo1_id = [],
                    relative_finance = []

                for (var ke in shipmentids) {
                    log.debug('ke:' + ke, shipmentids[ke])
                    item_codes.push(ke)
                    shipmentids[ke].map(function(obj) {
                        depositDate = obj.depositDate
                        var x = Math.round(parseFloat(obj.amount) * 100) / 100
                        if (currency == JP_currency) x = Math.round(x)
                        var incc = interfun.GetSettlmentFee(obj.Amount_type, obj.Amount_desc, obj.Tranction_type, report_site.split(' ')[1], x, report_siteId, pr_store)
                        if (!incc) throw '找不到费用,' + obj.Amount_type + ',' + obj.Amount_desc + ',' + obj.Tranction_type
                        else if (incc.incomeaccount != '125' && incc != 'unable') {
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: incc.incomeaccount
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: incc.L_memo
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'credit',
                                value: x
                            }) // credit
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: entity
                            }) // credit
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'department',
                                value: dept
                            }) // credit
                            jour.commitLine({
                                sublistId: 'line'
                            })
                            jour.selectNewLine({
                                sublistId: 'line'
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: income_settle
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: incc.L_memo
                            })
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'debit',
                                value: x
                            }) // ��
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'entity',
                                value: entity
                            }) // �ͻ�
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'department',
                                value: dept
                            }) // �ͻ�
                            jour.commitLine({
                                sublistId: 'line'
                            })
                        }
                    })
                }

                jour.setValue({
                    fieldId: 'custbody_amazon_settlementid',
                    value: settlmentid + ''
                })
                if (relative_finance.length > 0)
                    jour.setValue({
                        fieldId: 'custbody_relative_finanace_report',
                        value: relative_finance
                    })
                jour.setText({
                    fieldId: 'trandate',
                    text: cl_date.date
                })
                jo_2 = jour.save()
                log.audit('�ڶ��� success:' + jo_2, cl_date.date)
                interfun.relativaJE(jo1_id, jo_2, '', settlement_ids, '')
            })
        } catch (e) {
            log.debug('redunce e', e)
        }
    }

    function summarize(summary) {
        log.debug('处理完成,summary', JSON.stringify(summary))
    }

    /**
     * ���ɵ���ʧ�ܼ�¼
     * @param {*} type
     * @param {*} account_id
     * @param {*} order_id
     * @param {*} so_id
     * @param {*} reason
     * @param {*} date
     */
    function createSOTRMissingOrder(type, orderid, reason, date) {
        var mo
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
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_type',
            value: type
        }); // ����

        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_id',
            value: orderid
        })
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

    function submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param) {

        // Store the script ID of the script to submit.
        //
        // Update the following statement so it uses the script ID
        // of the map/reduce script record you want to submit.
        log.audit('mapreduce id: ', mapReduceScriptId)

        // Create a map/reduce task.
        //
        // Update the deploymentId parameter to use the script ID of
        // the deployment record for your map/reduce script.
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: mapReduceScriptId,
            deploymentId: mapReduceDeploymentId,
            // params: param
        })

        // Submit the map/reduce task.
        var mrTaskId = mrTask.submit()
        log.audit('mrTaskId', mrTaskId)

        record.submitFields({
            type: 'customrecord_dps_li_automatically_execut',
            id: recId,
            values: {
                custrecord_dps_li_submit_id: mrTaskId
            }
        })

        // Check the status of the task, and send an email if the
        // task has a status of FAILED.
        // PENDING      PROCESSING      COMPLETE      FAILED
        //
        // Update the authorId value with the internal ID of the user
        // who is the email sender. Update the recipientEmail value
        // with the email address of the recipient.
        var taskStatus = task.checkStatus(mrTaskId)

        var authorId = 911
        var recipientEmail = 'licanlin@douples.com'
        if (taskStatus.status === 'FAILED') {
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Failure executing map/reduce job!',
                body: 'Map reduce task: ' + mapReduceScriptId + ' has failed. \n 记录ID ' + recId + '\n 参数为\n' + JSON.stringify(param)
            })
        } else {
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Executing map/reduce job!',
                body: 'Map reduce task: ' + mapReduceScriptId + ' has activated. \n 记录ID ' + recId + '\n 参数为\n' + JSON.stringify(param)
            })
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