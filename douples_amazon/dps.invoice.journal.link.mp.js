/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-28 14:18:49
 * @LastEditTime   : 2020-10-13 09:01:02
 * @LastEditors    : Li
 * @Description    : 修复发票和日记账关联关系, 设置发票 ID 等相关字段
 * @FilePath       : \douples_amazon\dps.invoice.journal.link.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', './Helper/interfunction.min', 'N/runtime'], function(search, record, log, interfun, runtime) {

    const fmt = "yyyy-M-d";

    function getInputData() {

        var limit = 3999,
            orderInfo = [];

        try {

            var fils = [];

            var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoi_journal_start_date' }); // 开始时间
            var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoi_journal_end_date' }); // 结束时间
            var _journal_id = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoi_journal_id' }); // 日记账 内部标识
            var _account = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_invoi_journal_account' }); // 日记账 内部标识

            fils.push({ name: "custbody_settlement_inv_ids", operator: "isempty" });

            fils.push({ name: "memomain", operator: "startswith", values: "结算" })

            fils.push({ name: "custbody_curr_voucher", operator: "startswith", values: "结算凭证" })

            log.audit("_start_date", _start_date);
            log.audit("_end_date", _end_date);

            log.debug("_journal_id", _journal_id);
            if (_journal_id) {
                fils.push({ name: "internalid", operator: "anyof", values: _journal_id });
            }

            if (_start_date && _end_date) {
                fils.push({ name: "trandate", operator: "within", values: [_dateFormat(_start_date, fmt), _dateFormat(_end_date, fmt)] });
            } else if (_start_date && !_end_date) {
                fils.push({ name: "trandate", operator: "onorafter", values: [_dateFormat(_start_date, fmt)] });
            } else if (!_start_date && _end_date) {
                fils.push({ name: "trandate", operator: "onorbefore", values: [_dateFormat(_end_date, fmt)] });
            }

            if (_account) {
                fils.push({ name: "custbody_order_locaiton", operator: "anyof", values: _account });
            }


            log.audit("过滤器", fils)

            search.create({
                type: "journalentry",
                filters: fils,
                columns: [
                    { name: "custbody_amazon_settlementid", summary: "GROUP" },
                    { name: "custbody_jour_orderid", summary: "GROUP" },
                    { name: "internalid", summary: "GROUP" },
                    // { name: 'custrecord_aio_account_2', summary: "GROUP" },
                ]
            }).run().each(function(_res) {

                var it = {
                    journal_id: _res.getValue(_res.columns[2]),
                    order_id: _res.getValue(_res.columns[1]),
                    settlement_id: _res.getValue(_res.columns[0]),
                    account: _account,
                }

                orderInfo.push(it);

                return --limit > 0;
            });
        } catch (error) {
            log.error("getInputData 出错了", error);
        }


        log.audit("获取数据长度: " + orderInfo.length, orderInfo);
        return orderInfo;

    }


    function reduce(context) {

        try {

            log.debug("context.values[0]  typeof:   " + typeof(context.values[0]), context.values[0])

            var val = JSON.parse(context.values[0]);

            var limit = 3999;

            var jour_load = record.load({ type: "journalentry", id: val.journal_id });
            var amaozn_order_iemc = JSON.parse(jour_load.getValue("custbody_amaozn_order_iemc"));

            log.debug("typeof amaozn_order_iemc", typeof(amaozn_order_iemc));

            var fils_1 = [];

            var temp_settlement_id = val.settlement_id.split("-")[0];
            fils_1.push(['custrecord_aio_sett_tran_type', 'doesnotcontain', 'Refund']);
            fils_1.push("and", ['custrecord_aio_sett_order_id', 'startswith', val.order_id]);
            fils_1.push("and", ['custrecord_aio_sett_id', 'startswith', temp_settlement_id]);

            var temp_fils = [],
                temp_fils_2 = [];
            amaozn_order_iemc.map(function(iemc, key) {
                if (key == 0) {
                    temp_fils.push(["custrecord_aio_sett_order_item_code", "startswith", iemc]);
                } else {
                    temp_fils.push("or", ["custrecord_aio_sett_order_item_code", "startswith", iemc]);
                }
            });

            temp_fils_2 = fils_1;

            if (temp_fils && temp_fils.length) {
                fils_1.push("and", temp_fils);
            }


            log.debug("过滤器", fils_1);
            var _end_date, _amount = 0,
                _acount, merchant_order_id;
            search.create({
                type: "customrecord_aio_amazon_settlement",
                filters: fils_1,
                columns: [
                    { name: 'custrecord_aio_sett_id' },
                    { name: 'custrecord_aio_sett_shipment_id' },
                    { name: 'custrecord_aio_sett_tran_type' },
                    { name: 'custrecord_aio_sett_start_date' },
                    { name: 'custrecord_aio_sett_end_date' },
                    { name: 'custrecord_aio_sett_posted_date_time' },
                    { name: 'custrecord_aio_sett_amount_type' },
                    { name: 'custrecord_aio_sett_amount_desc' },
                    { name: 'custrecord_aio_sett_amount' },
                    { name: 'custrecord_aio_sett_order_id' },
                    { name: 'custrecord_aio_sett_deposit_date' },
                    { name: 'custrecord_aio_sett_marketplace_name' },
                    { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id' },
                    { name: 'custrecord_aio_account_2' },
                    { name: 'custrecord_aio_sett_currency' },
                    { name: 'custrecord_aio_sett_order_item_code' }, // order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
                    { name: 'custrecord_aio_sett_quantity_purchased' }, // { name: 'custrecord_aio_sett_shipment_id' },   //shipment id 可以用于查找对应记有shipment id的发票 ()
                    { name: 'custrecord_aio_sett_merchant_order_id' }
                ]
            }).run().each(function(_rec) {

                // log.debug("_rec id", _rec.id);
                merchant_order_id = _rec.getValue("custrecord_aio_sett_merchant_order_id");

                _acount = _rec.getValue("custrecord_aio_account_2");
                _end_date = _rec.getValue("custrecord_aio_sett_end_date");

                var Tranction_type = _rec.getValue("custrecord_aio_sett_tran_type");
                var Amount_type = _rec.getValue("custrecord_aio_sett_amount_type");
                var Amount_desc = _rec.getValue("custrecord_aio_sett_amount_desc");
                var currency_txt = _rec.getValue("custrecord_aio_sett_currency");
                var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt);

                var amount = _rec.getValue('custrecord_aio_sett_amount');

                amount = amount.replace(",", ".");

                // log.debug("ck: " + ck, amount)
                if (ck || (!Tranction_type)) {
                    if (Tranction_type == 'Order') {

                        _amount = _amount + Number(amount);
                        // log.debug("总额相加: " + amount, _amount)
                    }
                }

                return true;
            });


            log.debug("_amount", _amount);

            if (!_amount) {
                search.create({
                    type: "customrecord_aio_amazon_settlement",
                    filters: temp_fils_2,
                    columns: [
                        { name: 'custrecord_aio_sett_id' },
                        { name: 'custrecord_aio_sett_shipment_id' },
                        { name: 'custrecord_aio_sett_tran_type' },
                        { name: 'custrecord_aio_sett_start_date' },
                        { name: 'custrecord_aio_sett_end_date' },
                        { name: 'custrecord_aio_sett_posted_date_time' },
                        { name: 'custrecord_aio_sett_amount_type' },
                        { name: 'custrecord_aio_sett_amount_desc' },
                        { name: 'custrecord_aio_sett_amount' },
                        { name: 'custrecord_aio_sett_order_id' },
                        { name: 'custrecord_aio_sett_deposit_date' },
                        { name: 'custrecord_aio_sett_marketplace_name' },
                        { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id' },
                        { name: 'custrecord_aio_account_2' },
                        { name: 'custrecord_aio_sett_currency' },
                        { name: 'custrecord_aio_sett_order_item_code' }, // order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
                        { name: 'custrecord_aio_sett_quantity_purchased' }, // { name: 'custrecord_aio_sett_shipment_id' },   //shipment id 可以用于查找对应记有shipment id的发票 ()
                        { name: 'custrecord_aio_sett_merchant_order_id' }
                    ]
                }).run().each(function(_rec) {

                    // log.debug("_rec id", _rec.id);
                    merchant_order_id = _rec.getValue("custrecord_aio_sett_merchant_order_id");

                    _acount = _rec.getValue("custrecord_aio_account_2");
                    _end_date = _rec.getValue("custrecord_aio_sett_end_date");

                    var Tranction_type = _rec.getValue("custrecord_aio_sett_tran_type");
                    var Amount_type = _rec.getValue("custrecord_aio_sett_amount_type");
                    var Amount_desc = _rec.getValue("custrecord_aio_sett_amount_desc");
                    var currency_txt = _rec.getValue("custrecord_aio_sett_currency");
                    var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt);

                    var amount = _rec.getValue('custrecord_aio_sett_amount');

                    amount = amount.replace(",", ".");

                    // log.debug("ck: " + ck, amount)
                    if (ck || (!Tranction_type)) {
                        if (Tranction_type == 'Order') {

                            _amount = _amount + Number(amount);
                            // log.debug("总额相加: " + amount, _amount)
                        }
                    }

                    return true;
                });

            }


            _end_date = interfun.getFormatedDate('', '', _end_date);

            log.debug("_end_date", _end_date);


            search.create({
                type: 'customrecord_aio_account',
                filters: [{ name: 'internalidnumber', operator: 'equalto', values: _acount }],
                columns: [
                    { name: 'custrecord_aio_seller_id' },
                    { name: 'custrecord_aio_subsidiary' },
                    { name: 'custrecord_aio_customer' },
                    { name: 'custrecord_aio_enabled_sites' },
                    { name: 'name' },
                    { name: 'custrecord_division' }, // object
                ]
            }).run().each(function(e) {
                seller_id = e.getValue(e.columns[0]);
                report_subsidiary = e.getValue(e.columns[1]);
                report_customer = e.getValue(e.columns[2]);
                report_site = e.getText(e.columns[3]);
                report_siteId = e.getValue(e.columns[3]);
                report_acc = _acount;
                acc_text = e.getValue(e.columns[4]);
                dept = e.getValue(e.columns[5]);
            })

            var search_accObj = interfun.getSearchAccount(seller_id);

            var invArr = [];

            var orders = [];
            if (val.order_id) {
                var fils_inv = [
                        ['mainline', 'is', false],
                        'and',
                        ['taxline', 'is', false],
                        'and',
                        ['custbody_aio_account', 'anyof', search_accObj.acc_search]
                    ],
                    fls = []

                if (val.order_id.charAt(0) == 'S') {
                    fils_inv.push('and')
                    fils_inv.push(['custbodyfulfillment_stock_so', 'is', merchant_order_id])
                } else {
                    fils_inv.push('and')
                    fils_inv.push(['otherrefnum', 'equalto', val.order_id])
                }
                var len_itco = amaozn_order_iemc.length,
                    l_num = 0
                amaozn_order_iemc.map(function(ic) {
                    if (ic)
                        fls.push(['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'is', ic])
                    else
                        fls.push(['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'isempty', ''])
                    l_num++
                    log.debug('l_num:' + l_num, 'len_itco: ' + len_itco)
                    if (l_num < len_itco)
                        fls.push('or')
                })
                if (len_itco > 0) {
                    fils_inv.push('and')
                    fils_inv.push(fls)
                }

                if (val.account) {
                    fils_1.push("and", ['custbody_order_locaiton', 'anyof', val.account]);
                }

                log.debug('发票过滤器:', fils_inv);
                // 搜索出所有item code 的发票
                var ck = false
                search.create({
                    type: 'invoice',
                    filters: fils_inv,
                    columns: [
                        { name: 'internalid', summary: 'group' },
                        { name: 'custrecord_amazon_order_item_id', join: 'custbody_shipment_report_rel', summary: 'group' },
                        { name: 'quantity', summary: 'SUM' }
                    ]
                }).run().each(function(e) {

                    orders.push({
                        inv_id: e.getValue(e.columns[0]),
                        end_date: _end_date.date,
                        depAmaount: _amount
                    })

                    return true
                })
            }

            log.debug("orders", orders);

            // return;
            if (orders && orders.length > 0) {
                var re_jour = record.submitFields({
                    type: "journalentry",
                    id: val.journal_id,
                    values: {
                        custbody_settlement_inv_ids: JSON.stringify(orders)
                    }
                });

                log.debug("更新日记账 发票ID", re_jour);
            }
        } catch (error) {

            log.error("处理出错了", error);

        }



    }

    function summarize(summary) {

    }


    function _dateFormat(date, fmt) {
        var o = {
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds(),
            'q+': Math.floor((date.getMonth() + 3) / 3),
            'S': date.getMilliseconds()
        }
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
        }
        for (var k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
            }
        }
        return fmt
    }


    return {
        getInputData: getInputData,
        reduce: reduce,
        summarize: summarize
    }
});