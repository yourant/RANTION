/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-10-14 10:27:38
 * @LastEditors    : Li
 * @Description    : refund 结算报告 生成退货授权、贷项通知单 或 日记账
 * @FilePath       : \douples_amazon\amazon.order.paymentthorization.mp.min1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['./Helper/interfunction.min', 'N/runtime', 'N/format', './Helper/Moment.min', './Helper/core.min', 'N/log',
    'N/search', 'N/record', './Helper/fields.min', 'N/task', 'N/email'
], function(interfun, runtime, format, moment, core, log, search, record, fiedls, task, email) {
    // 结算报告退款 欧洲可以根据 marcktplace Name区分国家
    const fba_return_location = 2502;
    const fmt = "yyyy-M-d";

    const debit_account = 622; // 借
    const credit_account = 125; // 贷
    const JP_currency = 8;
    const transactionType = 'Payment_return';

    function getInputData() {

        try {

            var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_acc' });
            log.debug('店铺', acc);
            var group = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_accgroup' });

            var runPaged = runtime.getCurrentScript().getParameter({ name: 'custscript_refund_runpaged' }); // 获取数据的形式
            // var recId = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_rec_id' }); //  记录 ID
            var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_start_date' }); // 开始时间
            var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_end_date' }); //  结束时间
            var _order_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_order_id' }); //订单号

            var _data_length = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_data_length' }); // 数据长度

            var fils = [
                { name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: 'Refund' },
                { name: 'custrecord_aio_sett_credit_memo', operator: 'isnot', values: 'T' },
                { name: 'custrecord_february_undeal', operator: 'isnot', values: 'F' },
                { name: "custrecord_dps_aio_jour", operator: "anyof", values: ["@NONE@"] }, // 退款日记账 为空
                { name: "custrecord_is_itemprice_taxfee", operator: "is", values: false }, // 不属于费用
            ]

            if (_order_id) {
                fils.push({ name: 'custrecord_aio_sett_order_id', operator: 'startswith', values: _order_id.trim() })
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


            log.debug('过滤器', fils);
            var colu = [
                { name: "id", summary: "COUNT" }, //    0
                { name: "custrecord_aio_account_2", summary: "GROUP" }, // 1
                { name: "custrecord_aio_sett_order_id", summary: "GROUP" }, //  2
                { name: "custrecord_aio_sett_sku", summary: "GROUP" }, // 3
                { name: "custrecord_settlement_enddate", summary: "GROUP" }, //  4
                // { name: "custrecord_aio_sett_id", summary: "GROUP" }, //  4
                // { name: "custrecord_aio_sett_adjust_item_id", summary: "GROUP" }, // 5
            ]

            var limit = 3999,
                groupArr = [];

            if (_data_length && _data_length < 3999) {
                limit = _data_length;
            }

            log.debug('limit', limit);
            search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: fils,
                columns: colu
            }).run().each(function(rec) {
                var it = {
                    acc: rec.getValue(rec.columns[1]),
                    order_id: rec.getValue(rec.columns[2]),
                    sku: rec.getValue(rec.columns[3]),
                    settlement_enddate: rec.getValue(rec.columns[4]),
                    count: rec.getValue(rec.columns[0]),
                    start_date: _start_date,
                    end_date: _end_date
                }
                groupArr.push(it);
                return --limit > 0;
            });

            log.audit("获取数据的长度:    " + groupArr.length, groupArr)
            return groupArr

        } catch (e) {
            log.error('error:', e);
        }
    }

    function reduce(context) {

        // return;

        log.audit("reduce(context)  ", context);

        var refund_return_reduce = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_refund_return_reduce' }); // 数据长度

        if (refund_return_reduce) {

            log.audit("阶段 reduce", "结束");
        }
        try {

            var red_value = (context.values)[0];

            log.debug("typeof", typeof(red_value));
            red_value = JSON.parse(red_value);
            log.debug("typeof", typeof(red_value));
            log.debug("传入的参数", red_value);

            log.debug("red_value.acc", red_value.acc);

            var temp_ids = [];
            var fils_gol = [];

            fils_gol.push({ name: 'custrecord_aio_account_2', operator: 'anyof', values: red_value.acc });
            fils_gol.push({ name: 'custrecord_aio_sett_order_id', operator: 'is', values: red_value.order_id });
            fils_gol.push({ name: 'custrecord_aio_sett_sku', operator: 'is', values: red_value.sku });
            fils_gol.push({ name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: 'Refund' });

            fils_gol.push({ name: 'custrecord_aio_sett_credit_memo', operator: 'isnot', values: 'T' });
            fils_gol.push({ name: 'custrecord_february_undeal', operator: 'isnot', values: 'F' });

            fils_gol.push({ name: 'custrecord_dps_aio_jour', operator: 'anyof', values: ["@NONE@"] });
            fils_gol.push({ name: 'custrecord_settlement_enddate', operator: "on", values: red_value.settlement_enddate });


            log.audit("fils_gol", fils_gol);

            search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: fils_gol,
            }).run().each(function(rec) {
                temp_ids.push(rec.id);
                return true;
            });

            log.debug("temp_ids", temp_ids);

            var skuid = interfun.getskuId(red_value.sku, red_value.acc).skuid; // 搜索对应的映射关系

            var filte = [];

            if (skuid) {
                filte.push({ name: 'item', operator: 'anyof', values: skuid });
            } else {
                filte.push({ name: 'custcol_aio_amazon_msku', operator: 'is', values: red_value.sku });
            }

            filte.push({ name: 'poastext', operator: "is", values: red_value.order_id })
            filte.push({ name: 'mainline', operator: 'is', values: false })
            filte.push({ name: 'taxline', operator: 'is', values: false })

            var order_acc, order_soId, order_item;
            search.create({
                type: 'salesorder',
                filters: filte,
                columns: ["custbody_order_locaiton", "item"]
            }).run().each(function(rec) {
                order_acc = rec.getValue('custbody_order_locaiton'); // 获取订单店铺
                order_soId = rec.id;
                order_item = rec.getValue("item");
            });

            if (order_soId) { // 存在订单店铺

                var item_ful_id;

                search.create({ // 查找对应的货品收据是否存在
                    type: 'itemfulfillment',
                    filters: [
                        { name: 'createdfrom', operator: "anyof", values: order_soId },
                        { name: 'mainline', operator: 'is', values: false },
                        { name: 'item', operator: 'anyof', values: order_item }
                    ],
                }).run().each(function(rec) {
                    item_ful_id = rec.id;
                });

                if (item_ful_id) { // 存在对应的货品实施, 创建或搜索对应的退货授权

                    var info = getInfo(fils_gol);

                    var currency
                    if (info.currency) {
                        search.create({
                            type: 'currency',
                            filters: [{ name: 'symbol', operator: 'is', values: info.currency }]
                        }).run().each(function(e) {
                            currency = e.id;
                        });
                    }

                    log.debug("typeof(info.link_id)", typeof(info.link_id))

                    var re_acc;
                    if (info.marketplace_name) {
                        re_acc = interfun.GetstoreInEU(red_value.acc, info.marketplace_name, info.acc_text);
                    } else if (info.marketplace_name == "Amazon.com") {
                        var temp_re_acc = interfun.GetstoreofCurrency(info.currency, red_value.acc);
                        re_acc = {
                            acc_text: temp_re_acc,
                            acc: temp_re_acc
                        }
                    }

                    log.debug("re_acc", JSON.stringify(re_acc));
                    if (re_acc.acc_text) {
                        // 如果没有对应的退货授权就create ，然后生成贷项通知单

                        if (info.link_id.length) {
                            createAuthorationFromPayment(info.link_id, re_acc.acc, info, red_value.order_id, "", currency, order_item, "dept", temp_ids, order_soId)
                        } else { // 属于费用类 或者 不需要处理
                            var diff_arr = diffArrary(temp_ids, info.link_id);
                            diff_arr.map(function(sd) {
                                record.submitFields({
                                    type: 'customrecord_aio_amazon_settlement',
                                    id: sd,
                                    values: {
                                        custrecord_is_itemprice_taxfee: true
                                    }
                                })
                            });
                        }

                    }

                } else { // 不存在 直接创建对应的日记账

                    var info = getInfo(fils_gol);

                    var re_acc;
                    if (info.marketplace_name) {
                        re_acc = interfun.GetstoreInEU(red_value.acc, info.marketplace_name, info.acc_text);
                    } else if (info.marketplace_name == "Amazon.com") {

                        var temp_re_acc = interfun.GetstoreofCurrency(info.currency, red_value.acc);

                        re_acc = {
                            acc_text: temp_re_acc,
                            acc: temp_re_acc
                        }
                    }
                    if (re_acc.acc_text) {

                        var account = getAcc(re_acc.acc);

                        if (info.link_id && info.link_id.length > 0) {
                            createJour(info.amount, account.info.subsidiary, account.info.dept, info.currency, account.id,
                                red_value.order_id, info.merchant_order_id, "", info.sett_id, info.link_id, account.customer, info.end_date, temp_ids)
                        } else { // 属于费用类 或者 不需要处理
                            var diff_arr = diffArrary(temp_ids, info.link_id);
                            diff_arr.map(function(sd) {
                                record.submitFields({
                                    type: 'customrecord_aio_amazon_settlement',
                                    id: sd,
                                    values: {
                                        custrecord_is_itemprice_taxfee: true
                                    }
                                })
                            });
                        }
                    }
                }
            } else { // 不存在对应的销售订单, 创建对应的日记账
                log.debug("找不到对应的销售订单", "找不到对应的销售订单");
                var info = getInfo(fils_gol);

                var re_acc = interfun.GetstoreInEU(red_value.acc, info.marketplace_name, info.acc_text);
                if (info.marketplace_name) {
                    re_acc = interfun.GetstoreInEU(red_value.acc, info.marketplace_name, info.acc_text);
                } else if (info.marketplace_name == "Amazon.com") {
                    var temp_re_acc = interfun.GetstoreofCurrency(info.currency, red_value.acc);

                    re_acc = {
                        acc_text: temp_re_acc,
                        acc: temp_re_acc
                    }
                }

                if (re_acc.acc_text) {

                    var account = getAcc(re_acc.acc);

                    if (info.link_id && info.link_id.length > 0) {
                        createJour(info.amount, account.info.subsidiary, account.info.dept, info.currency, account.id,
                            red_value.order_id, info.merchant_order_id, "", info.sett_id, info.link_id, account.customer, info.end_date, temp_ids)
                    } else { // 属于费用类 或者 不需要处理
                        var diff_arr = diffArrary(temp_ids, info.link_id);
                        diff_arr.map(function(sd) {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_settlement',
                                id: sd,
                                values: {
                                    custrecord_is_itemprice_taxfee: true
                                }
                            })
                        });
                    }
                }
            }

            makeresovle(transactionType, red_value.order_id, red_value.acc); // 标记已解决
        } catch (error) {
            log.error("处理数据出错了", error);

            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
            var date = format.parse({
                value: (moment(new Date().getTime()).format(dateFormat)),
                type: format.Type.DATE
            })
            var moId = createSOTRMissingOrder(transactionType, red_value.order_id, JSON.stringify(err), date, red_value.acc)
            log.error('出现错误，已创建missingorder' + moId)

        }

    }

    function summarize(summary) {

        log.debug('处理完成');
    }

    function makeresovle(type, orderid, acc) {
        var fils = []
        type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : ''
        orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : ''
        acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : ''
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
        var mo, fils = [];
        type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : '';
        orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : '';
        acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : '';
        var mo
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: fils
        }).run().each(function(rec) {
            mo = record.load({ type: 'customrecord_dps_transform_mo', id: rec.id });
            return false
        })
        if (!mo) {
            mo = record.create({ type: 'customrecord_dps_transform_mo', isDynamic: true });
        }
        type ? mo.setValue({ fieldId: 'custrecord_tr_missing_order_type', value: type }) : ''; // 类型
        acc ? mo.setValue({ fieldId: 'custrecord_tracking_missing_acoount', value: acc }) : '';
        orderid ? mo.setValue({ fieldId: 'custrecord_missing_orderid_txt', value: orderid }) : '';
        mo.setValue({ fieldId: 'custrecord_tr_missing_order_reason', value: reason });
        mo.setValue({ fieldId: 'custrecord_tr_missing_order_date', value: date });
        mo.setValue({ fieldId: 'custrecord_tr_missing_order_resolved', value: false });
        mo.setValue({ fieldId: 'custrecord_tr_missing_order_resolving', value: false });
        return mo.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
    }

    function getAcc(acc) {
        var t = fiedls.account,
            tsite = fiedls.amazon_global_sites,
            tdev = fiedls.amazon_dev_accounts
        var accounts = {},
            fin = []
        search.create({
            type: t._name,
            filters: [
                { name: 'internalidnumber', operator: 'equalto', values: acc },
                { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 1 /* amazon */ },
                { name: 'custrecord_aio_seller_id', operator: 'isnotempty' },
                /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                { name: 'custrecord_aio_dev_account', operator: 'noneof', values: '@NONE@' }
            ],
            columns: [
                /** * 名称 * @index 0 */
                { name: 'name' },
                /** * 账户API信息 * @index 1 */
                { name: t.seller_id },
                { name: t.mws_auth_token },
                { name: tsite.amazon_marketplace_id, join: t.enabled_sites },
                { name: tsite.amazon_mws_endpoint, join: t.enabled_sites },
                { name: tdev.aws_access_key_id, join: t.dev_account },
                { name: tdev.secret_key_guid, join: t.dev_account },
                /** * 账户基础信息 * @index 7 * */
                { name: 'name' },
                { name: t.currency },
                { name: 'custrecord_aio_if_salesorder' },
                { name: 'custrecord_aio_salesorder_type' },
                { name: 'custrecord_aio_salesorder_form' },
                { name: 'custrecord_aio_salesorder_location' },
                { name: 'custrecord_aio_salesorder_start_date' },
                /** * FBA信息 * @index 14 */
                { name: 'custrecord_aio_if_fbaorder' },
                { name: 'custrecord_aio_fbaorder_type' },
                { name: 'custrecord_aio_fbaorder_form' },
                { name: 'custrecord_aio_fbaorder_location' },
                { name: 'custrecord_aio_fbaorder_start_date' },
                /**@index 19 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_including_fees' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 其他信息 * @index 28 */
                { name: 'custrecord_division' },
                { name: 'custrecord_aio_salesorder_payment_method' },
                { name: 'custrecord_aio_discount_item' },
                { name: 'custrecord_aio_tax_item' },
                { name: tsite.amazon_currency, join: t.enabled_sites },
                /** * 公司信息 * @index 33 */
                core.utils.checkIfSubsidiaryEnabled() ? { name: 'custrecord_aio_subsidiary' } : { name: 'formulanumeric', formula: '0' },
                /** * 报告抓取信息 * @index 34 */
                { name: 'custrecord_aio_if_handle_removal_report' },
                { name: 'custrecord_aio_if_handle_custrtn_report' },
                /** * Preferences * @index 36 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                { name: 'custrecord_aio_if_handle_inv_report' },
                { name: 'custrecord_aio_to_default_from_location' },
                { name: 'custrecord_aio_shipping_item' },
                { name: 'custrecord_aio_to_form' },
                /** @index 48 */
                { name: fiedls.account.if_post_order_fulfillment },
                { name: fiedls.account.post_order_if_search },
                { name: fiedls.account.if_handle_sett_report },
                /** 检验亚马逊的密钥是否加密了 @index 51 */
                { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_aio_enabled_sites' },
                { name: 'custrecord_aio_customer' }

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
     * @param {*} settlerecord_ids   结算报告数组
     * @param {*} acc                店铺
     * @param {*} quantity           数量
     * @param {*} amount            总金额
     * @param {*} order_id          订单号
     * @param {*} merchant_order_id
     * @param {*} currency          货币
     * @param {*} skuid             货品
     * @param {*} dept              部门
     */
    function createAuthorationFromPayment(settlerecord_ids, acc, infomation, order_id, merchant_order_id, currency, order_item, dept, allArr, order_soId) {

        log.audit("infomation.end_date", infomation.end_date);
        var account = getAcc(acc);
        var endDate = interfun.getFormatedDate('', '', infomation.end_date, '', true)

        log.debug("endDate", endDate);
        log.debug('account', account);

        var loc, cid, rt_tax, R_memo,
            tax_item = account.info.tax_item,
            loc = account.extra_info.fbaorder_location,
            salesorder_if_taxed = account.preference.salesorder_if_taxed,
            country = account.country,
            dept = account.dept;

        log.debug('amount2222:' + infomation.amount, '单价:' + infomation.amount + '/' + infomation.quantity + ' = ' + (infomation.amount / infomation.quantity).toFixed(2));
        cid = account.customer;

        log.debug('开始创建退货授权', "开始创建退货授权");
        // var rt = record.create({
        //     type: record.Type.RETURN_AUTHORIZATION,
        //     isDynamic: true
        // });

        var rt = record.transform({
            fromType: 'salesorder',
            toType: record.Type.RETURN_AUTHORIZATION,
            fromId: Number(order_soId),
            isDynamic: true
        });


        var numLines = objRecord.getLineCount({ sublistId: 'item' });
        log.debug("获取的总行数", numLines);

        for (var i = numLines - 1; i > -1; i--) {
            log.debug("移除当前行", i);
            objRecord.removeLine({ sublistId: 'item', line: i, ignoreRecalc: true });
        }

        // rt.setValue({ fieldId: 'entity', value: cid });
        rt.setValue({ fieldId: 'location', value: loc });
        rt.setValue({ fieldId: 'currency', value: currency });
        if (merchant_order_id) {
            rt.setValue({ fieldId: 'otherrefnum', value: merchant_order_id });
        } else {
            rt.setValue({ fieldId: 'otherrefnum', value: order_id });
        }

        rt.setValue({ fieldId: 'department', value: dept });
        rt.setText({ fieldId: 'trandate', text: endDate.date });
        rt.setValue({ fieldId: 'custbody_order_locaiton', value: acc });
        rt.setValue({ fieldId: 'custbody_aio_account', value: acc });
        rt.setValue({ fieldId: 'custbody_aio_is_aio_order', value: true });
        log.debug("设置关联的结算报告 settlerecord_ids", settlerecord_ids);
        rt.setValue({ fieldId: 'custbody_origin_settlement', value: settlerecord_ids }); // 设置关联的结算报告

        rt.selectNewLine({ sublistId: 'item' });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: order_item });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: loc });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: infomation.sku });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: infomation.quantity });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Math.abs(Math.round((infomation.amount / infomation.quantity) * 100) / 100) });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: Math.abs(Math.round(infomation.amount * 100) / 100) });
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'taxcode', value: tax_item ? tax_item : 6 });

        try {
            rt.commitLine({ sublistId: 'item' });
        } catch (err) {
            log.error('commitLine error', err);
        }
        log.debug('增加货品成功');
        var rs = rt.save({
            ignoreMandatoryFields: true
        });
        log.debug('生成退货单成功', rs);
        log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355');
        // 创建贷项通知单
        var credit_memo = record.transform({
            fromType: record.Type.RETURN_AUTHORIZATION,
            toType: record.Type.CREDIT_MEMO,
            fromId: Number(rs)
        });

        credit_memo.setText({ fieldId: 'trandate', text: endDate.date });
        credit_memo.setValue({ fieldId: 'custbody_order_locaiton', value: acc });
        credit_memo.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 });

        var cre = credit_memo.save({
            ignoreMandatoryFields: true
        })
        log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre);

        settlerecord_ids.map(function(sd) {
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: sd,
                values: {
                    custrecord_aio_sett_credit_memo: 'T',
                    custrecord_aio_sett_authorization: 'T',
                    custrecord_dps_aio_retrun_authon: rs,
                }
            })
        });


        var diff_arr = diffArrary(allArr, settlerecord_ids);
        diff_arr.map(function(sd) {
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: sd,
                values: {
                    custrecord_is_itemprice_taxfee: true
                }
            })
        });
        return rs
    }



    /**
     * 获取对应结算的信息
     * @param {Array} fils
     */
    function getInfo(fils) {

        var _currency_txt, retObj = {},
            _deposit_date,
            _end_date,
            _sett_id,
            _merchant_order_id,
            _marketplace_name,
            limit = 3999,
            link_id = [],
            sett_info = [],
            _quantity = 1;
        var amount = 0;
        search.create({
            type: 'customrecord_aio_amazon_settlement',
            filters: fils,
            columns: [
                { name: 'custrecord_aio_sett_amount' },
                { name: 'custrecord_aio_sett_currency' },
                { name: 'custrecord_aio_sett_tran_type' },
                { name: 'custrecord_aio_sett_amount_type' },
                { name: 'custrecord_aio_sett_amount_desc' },
                { name: 'custrecord_aio_sett_quantity_purchased' }, // quantity
                { name: 'custrecord_aio_sett_deposit_date' },
                { name: 'custrecord_aio_sett_end_date' }, // endDate
                { name: 'custrecord_aio_sett_id' },
                { name: 'custrecord_aio_sett_merchant_order_id' },
                { name: 'custrecord_aio_sett_adjust_item_id' }, // MERCHANT ADJUSTMENT ITEM ID
                { name: 'custrecord_aio_sett_marketplace_name' },
                // { name: 'custrecord_aio_sett_marketplace_name',join: "custrecord_aio_account_2" },

            ]
        }).run().each(function(rec) {

            _marketplace_name = rec.getValue("custrecord_aio_sett_marketplace_name");
            _sett_id = rec.getValue("custrecord_aio_sett_id");
            _end_date = rec.getValue("custrecord_aio_sett_end_date");
            _merchant_order_id = rec.getValue("custrecord_aio_sett_merchant_order_id");
            _deposit_date = rec.getValue("custrecord_aio_sett_deposit_date");
            _quantity = rec.getValue('custrecord_aio_sett_quantity_purchased');
            _currency_txt = rec.getValue('custrecord_aio_sett_currency');
            var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');
            var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');
            var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');
            var currency_txt = rec.getValue('custrecord_aio_sett_currency');
            var a = rec.getValue('custrecord_aio_sett_amount').replace(',', '.')
            log.audit('金额:' + a, '类型：' + Tranction_type + ',' + Amount_type + ',' + Amount_desc)

            var ck = checkIno(Tranction_type, Amount_type, Amount_desc, currency_txt);
            log.debug("ck", ck);
            if (ck == 1) {
                log.debug('属于应收 金额 : ' + typeof(a), a)
                amount = amount + Number(a);
                log.debug('等于,', amount);
                link_id.push(rec.id);
                sett_info.push({
                    recId: rec.id,
                    adjust_item_id: rec.getValue("custrecord_aio_sett_adjust_item_id")
                })
            }
            return --limit > 0;
        });

        var temp_amount = amount ? amount : 0;
        retObj.currency = _currency_txt;
        if (_currency_txt == "JPY") {
            retObj.amount = Math.abs(temp_amount);
        } else {
            retObj.amount = Math.abs(temp_amount).toFixed(2);
        }
        retObj.quantity = _quantity ? _quantity : 1;
        retObj.deposit_date = _deposit_date;
        retObj.end_date = _end_date;
        retObj.sett_id = _sett_id;
        retObj.merchant_order_id = _merchant_order_id;
        retObj.link_id = link_id;
        retObj.sett_info = sett_info;
        retObj.marketplace_name = _marketplace_name;

        log.audit("getInfo  信息", JSON.stringify(retObj));
        return retObj
    }


    /**
     * 创建日记账
     * @param {*} amt                   金额
     * @param {*} subsidiary            子公司
     * @param {*} dept                  部门
     * @param {*} currency              货币
     * @param {*} pr_store              店铺
     * @param {*} orderid               订单号
     * @param {*} merchant_order_id
     * @param {*} so_id                 销售订单Id
     * @param {*} key
     * @param {*} settlement_ids        结算报告Id
     * @param {*} entity                客户
     */
    function createJour(amt, subsidiary, dept, currency, pr_store, orderid, merchant_order_id, so_id, key, settlement_ids, entity, end_date, allArr) {



        log.audit("开始生成日记账", "开始生成日记账");
        log.debug("currency", currency);
        log.debug("end_date", end_date);
        const j_memo = "结算退款-客户"

        var jour = record.create({ type: 'journalentry', isDynamic: true });
        var endDate = interfun.getFormatedDate('', '', end_date, '', true);
        log.debug("设置子公司", subsidiary);

        log.debug("endDate", JSON.stringify(endDate))

        jour.setValue({ fieldId: 'subsidiary', value: subsidiary });
        jour.setText({ fieldId: 'currency', text: currency });
        // jour.setValue({ fieldId: 'currency', value: currency });

        jour.setText({ fieldId: 'trandate', text: endDate.date });
        jour.setValue({ fieldId: 'memo', value: "退款结算" });

        jour.setValue({ fieldId: 'department', value: dept });
        jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store });
        jour.setValue({ fieldId: 'custbody_jour_orderid', value: orderid });
        jour.setValue({ fieldId: 'custbody_setl_merchant_order_id', value: merchant_order_id });
        jour.setValue({ fieldId: 'custbody_curr_voucher', value: j_memo });
        so_id ? jour.setValue({ fieldId: 'custbody_rel_salesorder', value: so_id }) : ''; // 关联销售订单
        jour.setValue({ fieldId: 'custbody_amazon_settlementid', value: key }); // settlementid
        jour.setValue({ fieldId: 'custbody_jour_type', value: 'refunds' }); // 记录凭证类型 orders / refunds
        jour.setValue({ fieldId: 'custbody_dps_jiesuan', value: settlement_ids }); // 设置关联的结算报告


        jour.selectNewLine({ sublistId: 'line' });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: debit_account });
        if (currency == JP_currency) { amt = Math.round(amt); } // JP取整数
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "未发货退款[Amazon]" });

        log.debug("设置客户", entity);
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: amt }); // 借
        jour.commitLine({ sublistId: 'line' });

        jour.selectNewLine({ sublistId: 'line' });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: credit_account });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "未发货退款[Amazon]" });
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: amt }); // 贷
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity }); // 客户
        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept }); // 部门
        jour.commitLine({ sublistId: 'line' });

        var jour_id = jour.save({
            // enableSourcing: true,
            // ignoreMandatoryFields: true
        });

        log.audit("创建日记账成功", jour_id);

        log.audit("开始设置结算报告关联的日记账", "设置关联的日记账");
        settlement_ids.map(function(id) {
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: id,
                values: {
                    custrecord_dps_aio_jour: jour_id
                }
            });
        });

        var diff_arr = diffArrary(allArr, settlement_ids);
        diff_arr.map(function(sd) {
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: sd,
                values: {
                    custrecord_is_itemprice_taxfee: true
                }
            })
        });

    }


    /**
     * 判断类型对应的金额是否需要计入
     * @param {*} Tranction_type
     * @param {*} Amount_type
     * @param {*} Amount_desc
     * @param {*} currency_txt
     */
    function checkIno(Tranction_type, Amount_type, Amount_desc, currency_txt) {

        if (
            (
                (
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Goodwill') ||

                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Goodwill ') ||

                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Goodwill') ||

                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Goodwill')
                ) &&
                (currency_txt == 'USD' || currency_txt == 'CAD' || currency_txt == 'MXN' || currency_txt == 'AUD' || currency_txt == 'SGD')
            ) ||

            (
                (
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Tax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'ShippingTax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Goodwill') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrapTax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'TaxDiscount') ||

                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Tax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'ShippingTax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'Goodwill') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrapTax') ||
                    (Tranction_type == 'Chargeback Refund' && Amount_type == 'Promotion' && Amount_desc == 'TaxDiscount') ||

                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Tax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'ShippingTax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'Goodwill') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'GiftWrapTax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'ItemPrice' && Amount_desc == 'TaxDiscount') ||

                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Principal') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Tax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Shipping') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'ShippingTax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrap') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'Goodwill') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'GiftWrapTax') ||
                    (Tranction_type == 'Refund' && Amount_type == 'Promotion' && Amount_desc == 'TaxDiscount')
                ) &&
                (currency_txt == 'EUR' || currency_txt == 'GBP' || currency_txt == 'JPY')
            )
        ) {
            return 1
        } else {
            return 0
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


    function diffArrary(arr1, arr2) {

        var newArr = [];

        arr1.map(function(x) {

            if (arr2.indexOf(x) == -1) {
                newArr.push(x)
            }

        });
        return newArr;
    }


    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    }
})