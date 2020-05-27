/*
 * @Author         : Li
 * @Date           : 2020-05-20 19:55:27
 * @LastEditTime   : 2020-05-20 23:18:11
 * @LastEditors    : Li
 * @Description    : 冲销凭证, 修改版 2020-05-20 23:09:42  尚睿
 * @FilePath       : \douples_amazon\Journal_voucher_mp1 copy.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime',
    "./Helper/interfunction.min"
], function (search, record, moment, format, runtime, interfunction) {
    const MissingReportType = 3 //Missing report 结算报告Settlement report - Order
    const dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    const date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
    });
    const EU_corr = {

    }
    const acc_sub_corr = {

    }


    function getInputData() {
        var limit = 10,
            orders = []
        search.create({
            type: "customrecord_aio_amazon_settlement",
            filters: [{
                    name: "custrecord_settle_is_generate_voucher",
                    operator: 'is',
                    values: false
                },
                {
                    name: "custrecord_aio_sett_tran_type",
                    operator: 'startswith',
                    values: 'Order'
                },
                {
                    name: "custrecord_aio_sett_amount_type",
                    operator: 'isnot',
                    values: "ItemPrice"
                }
            ],
            columns: [{
                name: 'custrecord_aio_sett_order_id',
                summary: "GROUP"
            }]
        }).run().each(function (e) {
            orders.push(e.getValue(e.columns[0]))
            return --limit > 0
        })
        log.audit("待冲销总数", orders.length)
        return orders;
    }

    function map(context) {
        var startT = new Date().getTime();
        var obj = JSON.parse(context.value)
        var orderid = obj.orderid
        var settle_id = obj.settle_id
        var rec_id = obj.rec_id
        var pr_store = obj.acc
        var err = [];
        var so_id;
        var incomeaccount;
        var relative_finance = [],
            jo1_id = [],
            jo3_id, jo_2, settlement_ids = [];
        var entity, marketplace_name, subsidiary, acc_text; //订单原信息
        var depositDate, endDate, postDate, shipmentid_Arrys = [],
            settlmentID = {},
            shipsID = {};
        var cl_date; //冲销时间
        var item_code, ship_id_arrys = []; //记录shipmentid
        var fulfill_channel //发运方式，判断fbm 
        var item_prices = 0 //货品价格和税收入，用于fbm 
        log.debug("settle_id" + settle_id, "orderid:" + orderid)
        var currency_txt, currency
        try {
            var num = 0
            var end_date, postdate_arry = [],
                PT_Arrys = []
            //搜索销售订单获取客户
            // var search_acc = pr_store
            // if (pr_store == 34 || pr_store == 35 || pr_store == 40) search_acc = EU_corr[pr_store]
            search.create({
                type: record.Type.SALES_ORDER,
                filters: [{
                        name: 'poastext',
                        operator: 'is',
                        values: orderid
                    },
                    // { name: 'custbody_pr_store', operator: 'anyof', values: search_acc },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
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
                        name: "currency"
                    },
                    {
                        name: 'custbody_pr_store'
                    },
                    {
                        name: 'custbody_aio_s_fulfillment_channel'
                    },
                ]
            }).run().each(function (rec) {
                so_id = rec.id;
                entity = rec.getValue('entity');
                // orderstatus = rec.getValue('statusref');
                subsidiary = rec.getValue('subsidiary');
                currency = rec.getValue('currency');
                pr_store = rec.getValue('custbody_pr_store');
                acc_text = rec.getText('custbody_pr_store');
                fulfill_channel = rec.getValue('custbody_aio_s_fulfillment_channel');
            });
            if (!so_id) {
                if (orderid.length == 19 && pr_store && orderid.split("-")[0].length == 3) {
                    //正常订单，但是找不到销售订单
                    // pr_store = 27  ;  //JPY
                    // subsidiary = 85  ;//ETEKCITY Corporation (US)
                    // entity = 811606 ; //JPY
                    subsidiary = acc_sub_corr[pr_store].subsidiary
                    entity = acc_sub_corr[pr_store].entity
                } else {
                    //如果订单号不是正常的亚马逊单号   3-7-7
                    //如果此订单号为非正常的订单号：06fb53d9-3e9d-4c69-b424-64ba8a4f43fe,把此订单号的结算报告记录都搜出了标记为 F
                    if (settlement_ids.length == 0)
                        search.create({
                            type: "customrecord_aio_amazon_settlement",
                            filters: [{
                                    name: "custrecord_aio_sett_order_id",
                                    operator: 'is',
                                    values: orderid
                                },
                                {
                                    name: "custrecord_aio_sett_id",
                                    operator: 'is',
                                    values: settlmentid
                                },
                            ],
                        }).run().each(function (rec) {
                            settlement_ids.push(rec.id)
                            return true
                        })
                    log.debug("settlement_ids:", settlement_ids)
                    for (var index = 0; index < settlement_ids.length; index++) {
                        record.submitFields({
                            type: "customrecord_aio_amazon_settlement",
                            id: settlement_ids[index],
                            values: {
                                custrecord_missingorder_settlement: "F"
                            }
                        })
                    }
                    return;
                }
            }
            var postdate_obj = {},
                check_post_date, m_postdate_obj = {},
                adjObj = {},
                orderItemTax = [],
                adjusItemCode;
            var fils = [
                ["custrecord_aio_sett_order_id", "is", "" + orderid],
                "and",
                ["custrecord_aio_sett_id", "is", "" + settle_id],
                "and",
                ["custrecord_aio_sett_tran_type", "is", "Order"],
                "and",
                ["custrecord_settle_is_generate_voucher", "is", false],
                "and",
                ["custrecord_payment_itemprice_pt", "is", false], //不属于货价和税
                //   "and",
                //   ["custrecord_february_undeal", "isnot", "F"],  //post date不是2月份之前
                //   "and",
                //   ["custrecord_missingorder_settlement", "isnot", "F"],  //post date不是2月份之前
            ]
            search.create({
                type: "customrecord_aio_amazon_settlement",
                filters: fils,
                columns: [{
                        name: 'custrecord_aio_sett_id'
                    },
                    {
                        name: 'custrecord_aio_sett_shipment_id'
                    },
                    {
                        name: 'custrecord_aio_sett_tran_type'
                    },
                    {
                        name: "custrecord_aio_sett_start_date"
                    },
                    {
                        name: 'custrecord_aio_sett_end_date'
                    },
                    {
                        name: 'custrecord_aio_sett_posted_date_time'
                    },
                    {
                        name: 'custrecord_aio_sett_amount_type'
                    },
                    {
                        name: 'custrecord_aio_sett_amount_desc'
                    },
                    {
                        name: 'custrecord_aio_sett_amount'
                    },
                    {
                        name: 'custrecord_aio_sett_order_id'
                    },
                    {
                        name: 'custrecord_aio_sett_deposit_date'
                    },
                    {
                        name: 'custrecord_aio_sett_marketplace_name'
                    },
                    {
                        name: "custrecord_aio_origin_account",
                        join: "custrecord_aio_sett_report_id"
                    },
                    // { name: "custrecord_aio_account" },
                    {
                        name: 'custrecord_aio_sett_currency'
                    },
                    {
                        name: 'custrecord_aio_sett_order_item_code'
                    },

                ]
            }).run().each(function (rec) {

                if (!currency) {
                    currency_txt = rec.getValue('custrecord_aio_sett_currency');
                }
                if (!pr_store) {
                    pr_store = rec.getValue(rec.columns[12])
                }

                if (!marketplace_name) {
                    marketplace_name = rec.getValue(rec.columns[10]);
                }

                // log.debug("00 計數：" + num++, settle_id)
                if (!endDate) {
                    endDate = rec.getValue('custrecord_aio_sett_end_date')
                    // end_date = getFormatedDatesd(endDate)
                }
                postDate = rec.getValue('custrecord_aio_sett_posted_date_time');
                check_post_date = "";
                if (postdate_obj[postDate]) {
                    check_post_date = postdate_obj[postDate];
                } else {
                    check_post_date = getFormatedDate(postDate, endDate, ""); //冲销时间
                    postdate_obj[postDate] = check_post_date;
                }

                log.debug("check_post_date: " + check_post_date, "postDate: " + postDate + ", endDate: " + endDate)
                if (check_post_date == "2") { //posted date为2月份之前的不处理
                    log.debug("posted date为2月份之前的不处理:", postDate);
                    record.submitFields({
                        type: "customrecord_aio_amazon_settlement",
                        id: rec.id,
                        values: {
                            custrecord_february_undeal: "F"
                        }
                    });
                } else { //只处理postdate 2月份之后的数据，
                    //判断post date一份结算报告里面会有几个post date是，会出现一个在2月一个在3月，要求把它区分开了，分成两份

                    var pos = getFormatedDate("", "", postDate); //返回美国时间
                    var month = pos.split(/[\u4e00-\u9fa5]/g)[1],
                        mok = false; //拿到月
                    for (var mo in m_postdate_obj) {
                        if (mo == month) {
                            m_postdate_obj[month].push(pos);
                            mok = true;
                            break
                        }
                    }
                    if (!mok) {
                        postdate_arry = [];
                        postdate_arry.push(pos);
                        m_postdate_obj[month] = postdate_arry;
                    }
                    //修改于2020/5/16  16：00
                    // cl_date = check_post_date
                    // ship_id = rec.getValue('custrecord_aio_sett_shipment_id')  //shipment ID 可能会在一份报告里面存着多个shipmentID
                    item_code = rec.getValue('custrecord_aio_sett_order_item_code'); //item_code 可能会在一份报告里面存着多个item_code
                    depositDate = rec.getValue('custrecord_aio_sett_deposit_date');
                    var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');
                    var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');
                    var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');
                    var amount = rec.getValue('custrecord_aio_sett_amount');
                    if (amount.indexOf(',') != -1) {
                        amount = amount.replace(',', '.');
                    }

                    // log.debug("amount：" + amount, Tranction_type + "," + Amount_type + "," + Amount_desc + " , " + fulfill_channel)
                    //货品价格和税是收入，不计入冲销
                    if (!(Tranction_type == "Order" && Amount_type == "ItemPrice" && (Amount_desc == "Tax" || Amount_desc == "Principal")) && fulfill_channel != "FBM") {
                        settlement_ids.push(rec.id); //记录下报告内部ID
                        // log.debug("在不是FBM的情况下，冲销不计货品价格和税",rec.getValue("custrecord_aio_sett_amount"))
                        var havedSettlmentid = false,
                            havedShipid = false;
                        if (Number(amount) != 0) {
                            for (var key in settlmentID) {
                                log.debug("key:" + key, settle_id + "-" + month);
                                if (key == settle_id + "-" + month) {
                                    havedSettlmentid = true;
                                    for (var ke in settlmentID[key]) {
                                        if (ke == item_code) {
                                            settlmentID[key][ke].push({
                                                // "incomeaccount": incomeaccount,
                                                "Tranction_type": Tranction_type,
                                                "Amount_type": Amount_type,
                                                "Amount_desc": Amount_desc,
                                                "memo": "结 " + orderid,
                                                "amount": -Math.round(parseFloat(amount) * 100) / 100,
                                                "field": "debit",
                                                "depositDate": depositDate
                                            });
                                            havedShipid = true;
                                            break;
                                        }
                                    }
                                    //如果shipment id 不同，settlmentId相同，增加新的shipment id
                                    log.debug("havedShipid:" + havedShipid)
                                    if (!havedShipid) {
                                        //清空
                                        shipmentid_Arrys = [];
                                        shipmentid_Arrys.push({
                                            // "incomeaccount": incomeaccount,
                                            "Tranction_type": Tranction_type,
                                            "Amount_type": Amount_type,
                                            "Amount_desc": Amount_desc,
                                            "memo": "结 " + orderid,
                                            "amount": -Math.round(parseFloat(amount) * 100) / 100,
                                            "field": "debit",
                                            "depositDate": depositDate
                                        });
                                        settlmentID[key][item_code] = shipmentid_Arrys;
                                    }
                                    break
                                }
                            }
                            //settlmentId不相同，直接push
                            if (!havedSettlmentid) {
                                shipmentid_Arrys = []
                                shipsID = {}
                                shipmentid_Arrys.push({
                                    // "incomeaccount": incomeaccount,
                                    "Tranction_type": Tranction_type,
                                    "Amount_type": Amount_type,
                                    "Amount_desc": Amount_desc,
                                    "memo": "结 " + orderid,
                                    "amount": -Math.round(parseFloat(amount) * 100) / 100,
                                    "field": "debit",
                                    "depositDate": depositDate
                                })
                                shipsID[item_code] = shipmentid_Arrys
                                settlmentID[settle_id + "-" + month] = shipsID
                            }

                        }
                    } else {
                        // log.debug("记录下不属于FBM的货品金额和税，下次不再搜索")
                        PT_Arrys.push(rec.id)
                    }
                }
                return true
            })

            PT_Arrys.map(function (pt) {
                record.submitFields({
                    type: "customrecord_aio_amazon_settlement",
                    id: pt,
                    values: {
                        custrecord_payment_itemprice_pt: true,
                        custrecord_settle_is_generate_voucher: false,
                    }
                })
            })
            log.debug("settlmentID::", JSON.stringify(settlmentID))
            if (settlement_ids.length == 0) {
                log.debug("settlement_ids== 0" + settlement_ids)
                return
            }
            var getc
            search.create({
                type: 'journalentry',
                filters: [{
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    },
                    {
                        name: 'custbody_amazon_settlementid',
                        operator: 'is',
                        values: settle_id
                    },
                    {
                        name: 'custbody_jour_orderid',
                        operator: 'is',
                        values: orderid
                    },
                    {
                        name: 'memomain',
                        operator: 'is',
                        values: "02"
                    }
                ]
            }).run().each(function (e) {
                try {
                    getc = true
                    //  var de = record.delete({type:"journalentry",id:e.getValue(e.columns[0])})
                    //  log.debug("delete 删除", de)
                    // log.debug("00000该 settlement id 已结算 " + settle_id, e.id + "," + orderid)
                } catch (e) {
                    log.debug("delete error", e)
                }
            })
            try {
                if (getc) {
                    log.debug("已存在凭证", orderid + "," + settle_id)
                    settlement_ids.map(function (seid) {
                        record.submitFields({
                            type: "customrecord_aio_amazon_settlement",
                            id: seid,
                            values: {
                                custrecord_settle_is_generate_voucher: true
                            }
                        })
                    })
                    return
                    //结算修复设置T
                }
            } catch (error) {

            }
            if (currency_txt)
                search.create({
                    type: 'currency',
                    filters: [{
                        name: "symbol",
                        operator: 'is',
                        values: currency_txt
                    }]
                }).run().each(function (e) {
                    currency = e.id
                })
            log.audit("entity :" + entity + ",currency: " + currency, "orderid:" + orderid + "，店铺：" + pr_store)
            for (var key in settlmentID) {
                context.write({
                    key: key.split("-")[0] + "." + orderid + "-" + key.split("-")[1], // 按settlment ID +orderid + post date 的月份分组
                    value: {
                        // "cl_date": cl_date,
                        "subsidiary": subsidiary,
                        "acc_text": acc_text,
                        "orderid": orderid,
                        "entity": entity,
                        "so_id": so_id,
                        "currency": currency,
                        "fulfill_channel": fulfill_channel,
                        // "ship_id_arrys": ship_id_arrys,
                        "pr_store": pr_store,
                        "shipmentids": settlmentID[key], //向reduce 传递需要处理的费用
                        "settlement_ids": settlement_ids,
                        "cl_date": m_postdate_obj[key.split("-")[1]][0], //按月分组的post date,取第一个就可以了
                        // "postdate_arry": m_postdate_obj[key.split("-")[1]],
                        "rec_id": rec_id,
                        "search_acc": search_acc, //用于搜索的店铺
                    }
                })



                // context.write({
                //   key: orderid,
                //   value: {
                //     "acc_text": acc_text, "orderid": orderid, "depositDate": depositDate,"entity":entity,"ship_id_arrys":ship_id_arrys,"jo_2":jo_2,"jo3_id":jo3_id
                //   }
                // })
            }
            log.debug("00000单次map耗时", new Date() - startT)
        } catch (e) {
            log.error("000000000000000000000000000000eerroor:" + orderid, e);
            err.push(e.message);

        }

        //创建missorder,
        if (err.length > 0) {
            var moId = createSOTRMissingOrder('payment', so_id, JSON.stringify(err), date, pr_store);
            log.debug("出现错误，已创建missingorder" + moId);
        } else {
            delMissingReportRec(MissingReportType, orderid, "冲销时，找不到结算报告", pr_store)
            delMissingReportRec("5", orderid, "冲销时，找不到预估凭证", pr_store)
            delMissingReportRec(MissingReportType, orderid, "冲销时，找不到销售订单", pr_store)
            makeresovle('payment', orderid, pr_store)
        }

    }

    function reduce(context) {
        log.debug(" reduce context", JSON.stringify(context))
        var v = context.values
        var key = context.key.split('.')[0]
        log.debug(" key :" + key, context.key)
        //找到 shipment id 对应的发票，打上备注，计入款型记录
        v.map(function (obj) {
            //款型记录，备注：店铺名前两位+后两位+年月日
            try {
                var jo_2, jo3_id, jo1_id = []
                var DR = 0,
                    CR = 0;
                obj = JSON.parse(obj)
                // var deposit_date = obj.depositDate
                var cl_date = obj.cl_date
                var fulfill_channel = obj.fulfill_channel
                var settlement_ids = obj.settlement_ids
                var pr_store = obj.pr_store
                var so_id = obj.so_id
                var orderid = obj.orderid
                var currency = obj.currency
                var acc_text = obj.acc_text
                var entity = obj.entity
                var subsidiary = obj.subsidiary
                // var postdate_arry = obj.postdate_arry
                var search_acc = obj.search_acc
                var depositDate, relative_finance = [],
                    item_codes = []

                // ===========================================
                log.debug("obj,shipmentids: " + typeof (obj.shipmentids), obj.shipmentids)
                var shipmentids = obj.shipmentids
                //根据SETTLMENT ID 创建冲销凭证
                var startT = new Date().getTime();
                var jour = record.create({
                    type: 'journalentry',
                    isDynamic: true
                })
                jour.setValue({
                    fieldId: 'memo',
                    value: "02"
                })
                jour.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiary
                })
                jour.setValue({
                    fieldId: 'currency',
                    value: currency
                })
                jour.setValue({
                    fieldId: 'custbody_pr_store',
                    value: pr_store
                })
                jour.setValue({
                    fieldId: 'custbody_jour_orderid',
                    value: orderid
                })
                jour.setValue({
                    fieldId: 'custbody_curr_voucher',
                    value: "冲减凭证"
                })
                so_id ?
                    jour.setValue({
                        fieldId: 'custbody_rel_salesorder',
                        value: so_id
                    }) : ""; //关联销售订单
                jour.setValue({
                    fieldId: 'custbody_amazon_settlementid',
                    value: key
                }) //settlementid
                jour.setValue({
                    fieldId: 'custbody_jour_type',
                    value: "orders"
                }) //记录凭证类型 orders / refunds
                log.debug("开始生产冲销日记账 ：" + key, orderid)
                for (var ke in shipmentids) {
                    log.debug("shipment id:" + ke, JSON.stringify(shipmentids[ke]))
                    item_codes.push(ke) //根据 Item code 去查找相对应的预估凭证
                    shipmentids[ke].map(function (obj) {
                        depositDate = obj.depositDate
                        var x = Math.round(parseFloat(obj.amount) * 100) / 100;
                        DR += x
                        //log.debug('obj.amount',obj.amount);
                        //log.debug('obj.amount to number',Number(obj.amount));
                        jour.selectNewLine({
                            sublistId: 'line'
                        })
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'account',
                            value: interfunction.GetSettlmentFee(obj.Amount_type, obj.Amount_desc, obj.Tranction_type)
                        })
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: 'memo',
                            value: obj.memo
                        })
                        if (currency == 6) x = Math.round(x) //JP取整数
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: obj.field,
                            value: x
                        }) //借
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: "custcol_document_type",
                            value: "冲回"
                        })
                        fulfill_channel == "MFN" ?
                            jour.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_amazon_fulfillment_channel",
                                value: "FBM"
                            }) : ""
                        jour.commitLine({
                            sublistId: 'line'
                        })
                    })

                }
                num = 0
                var fin1

                var fils_fee = [
                    ["custbody_blot_s", "anyof", "@NONE@"], "and", ["taxline", "is", false], "and",
                    ["custbody_jour_orderid", "is", orderid], "and",
                    ["custbody_pr_store", "anyof", search_acc], "and",
                    ["memomain", "is", "01"]
                ]

                var fil = []
                var len = item_codes.length,
                    l = 0

                item_codes.map(function (pos) {
                    //查关联的财务报告上面的order item code
                    fil.push(["custbody_relative_finanace_report.custrecord_orderitemid", "is", pos])
                    l++
                    if (l < len) {
                        fil.push("or");
                    }
                })
                if (fil.length > 0) fils_fee.push("and");
                fils_fee.push(fil)
                log.debug("fils_fee", fils_fee)

                var jo1_arrys = [],
                    item_prices = 0
                search.create({
                    type: "journalentry",
                    filters: fils_fee,
                    columns: [{
                            name: "debitfxamount"
                        }, //借（外币
                        {
                            name: "creditfxamount"
                        }, //贷(外币
                        {
                            name: "account"
                        }, //科目
                        {
                            name: "custcol_item_or_tax"
                        },
                        {
                            name: "custbody_relative_finanace_report"
                        }
                    ]
                }).run().each(function (jo) {
                    // log.debug('查出的01类凭证' + jo.id, jo.getValue("custbody_relative_finanace_report"))
                    if (JSON.stringify(jo1_id).indexOf(jo.id) == -1) {
                        jo1_id.push(jo.id)
                        //关联的财务报告组
                        relative_finance.push(jo.getValue("custbody_relative_finanace_report"))
                    }
                    var acc_jour1 = jo.getValue('account')
                    var item_tax = jo.getValue('custcol_item_or_tax')
                    var dam = jo.getValue('debitfxamount')
                    var cam = jo.getValue('creditfxamount')
                    log.debug("item_tax " + item_tax + ",account:" + acc_jour1, dam)
                    if (acc_jour1 != 122 && item_tax != "Y") {
                        jo1_arrys.push({
                            account: acc_jour1,
                            memo: "冲 " + orderid,
                            credit: dam,
                            debit: cam,
                        })
                    } else if (acc_jour1 == 122 && item_tax == "Y") { //等于Y 表示此行为货品价格或者税,不计入冲销
                        item_prices += Number(jo.getValue("debitfxamount")) //记着一笔，放银行科目,借方
                    }
                    return true;
                })

                var jo1_arrys_len = jo1_arrys.length
                for (var i = 0; i < jo1_arrys_len; i++) {
                    jour.selectNewLine({
                        sublistId: 'line'
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'account',
                        value: jo1_arrys[i].account
                    })
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: 'memo',
                        value: jo1_arrys[i].memo
                    })

                    if (jo1_arrys[i].credit) {
                        CR += Math.round(jo1_arrys[i].credit * 100) / 100
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: "credit",
                            value: jo1_arrys[i].credit
                        }) //贷
                    } else {
                        DR += Math.round(jo1_arrys[i].debit * 100) / 100
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: "debit",
                            value: jo1_arrys[i].debit
                        }) //借
                    }
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_document_type",
                        value: "冲回"
                    })
                    fulfill_channel == "MFN" ?
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: "custcol_amazon_fulfillment_channel",
                            value: "FBM"
                        }) : ""
                    jour.commitLine({
                        sublistId: 'line'
                    })
                }
                // if (num > 30) return
                // if(!fin1) return
                log.debug("total:DR-CR", DR + "-" + CR)
                var s = DR - CR
                log.debug("差额 fixed 2:", s.toFixed(2))

                //  122 	应收账款-集团外公司  1341 主营业务收入-集团外公司
                if (Number(s.toFixed(2)) != 0) {
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
                        value: "结 " + orderid
                    })
                    if (currency == 6) s = Math.round(s) //JP取整数
                    else s = Math.round(s * 100) / 100;
                    log.debug('s', s);
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "credit",
                        value: s
                    }) //贷
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "entity",
                        value: entity
                    }) //客户
                    jour.setCurrentSublistValue({
                        sublistId: 'line',
                        fieldId: "custcol_document_type",
                        value: "冲回"
                    })
                    fulfill_channel == "MFN" ?
                        jour.setCurrentSublistValue({
                            sublistId: 'line',
                            fieldId: "custcol_amazon_fulfillment_channel",
                            value: "FBM"
                        }) : ""
                    jour.commitLine({
                        sublistId: 'line'
                    })
                }
                log.debug("set Trandate cl_date:", cl_date)
                jour.setText({
                    fieldId: 'trandate',
                    text: cl_date
                })
                jour.setValue({
                    fieldId: 'custbody_relative_finanace_report',
                    value: relative_finance
                })
                jour.setValue({
                    fieldId: 'custbody_amaozn_order_iemc',
                    value: JSON.stringify(item_codes)
                }) //存储item code
                //  jour.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
                log.debug('item_prices', item_prices)
                log.debug('jo_2', jour);
                jo_2 = jour.save();
                log.debug("000冲销凭证耗时：", new Date().getTime() - startT)
                log.debug("000000000第二步 success:" + jo_2, cl_date)
                if (jo_2) {
                    try {
                        var acc = pr_store,
                            account, j3_startTime = new Date().getTime();
                        var jour_3 = record.create({
                            type: 'journalentry',
                            isDynamic: true
                        })
                        jour_3.setValue({
                            fieldId: 'subsidiary',
                            value: subsidiary
                        })
                        jour_3.setValue({
                            fieldId: 'currency',
                            value: currency
                        })
                        jour_3.setText({
                            fieldId: 'trandate',
                            text: getFormatedDate("", "", depositDate)
                        })
                        // jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
                        jour_3.setValue({
                            fieldId: 'custbody_relative_finanace_report',
                            value: relative_finance
                        })
                        jour_3.setValue({
                            fieldId: 'memo',
                            value: "03"
                        })
                        jour_3.setValue({
                            fieldId: 'custbody_pr_store',
                            value: acc
                        })
                        jour_3.setValue({
                            fieldId: 'custbody_jour_orderid',
                            value: orderid
                        })
                        jour_3.setValue({
                            fieldId: 'custbody_curr_voucher',
                            value: "收款凭证"
                        })
                        jour_3.setValue({
                            fieldId: 'custbody_rel_salesorder',
                            value: so_id
                        }) //关联销售订单
                        jour_3.setValue({
                            fieldId: 'custbody_amazon_settlementid',
                            value: key
                        }) //settlementid
                        jour_3.setValue({
                            fieldId: 'custbody_jour_type',
                            value: "orders"
                        }) //记录凭证类型 orders / refunds
                        jour_3.setValue({
                            fieldId: 'custbody_amaozn_order_iemc',
                            value: JSON.stringify(item_codes)
                        }) ////存储item code
                        search.create({
                            type: 'customrecord_aio_account',
                            filters: [{
                                name: 'internalid',
                                operator: 'is',
                                values: acc
                            }],
                            columns: [{
                                name: 'custrecord_customer_payment_account'
                            }]
                        }).run().each(function (e) {
                            account = e.getValue(e.columns[0])
                        })
                        // account = 1275

                        if (currency == 6) {
                            item_prices = Math.round(item_prices)
                            DR = Math.round(DR)
                        } //JP取整数
                        else {
                            item_prices = Math.round(parseFloat(item_prices) * 100) / 100
                            DR = Math.round(parseFloat(DR) * 100) / 100
                        }

                        log.debug('account:' + account, "item_prices:" + item_prices + ",DR:" + DR)
                        if (item_prices && fulfill_channel == "MFN") { //FBM 货品金额计入收入
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: account
                            }) //银行
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "debit",
                                value: item_prices
                            }) //贷
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_amazon_fulfillment_channel",
                                value: "FBM"
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_item_or_tax",
                                value: "Y"
                            })
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: 122
                            }) //应收
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: item_prices
                            }) //贷
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_amazon_fulfillment_channel",
                                value: "FBM"
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_item_or_tax",
                                value: "Y"
                            })
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                        }
                        if (DR > 0) {
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: account
                            }) //银行
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: DR
                            }) //贷
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            fulfill_channel == "MFN" ?
                                jour_3.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: 122
                            }) //应收账款
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "debit",
                                value: DR
                            }) //借
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "entity",
                                value: entity
                            }) //客户
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            fulfill_channel == "MFN" ?
                                jour_3.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                        } else if (DR < 0) {
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: account
                            }) //银行
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "debit",
                                value: DR
                            }) //借
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            fulfill_channel == "MFN" ?
                                jour_3.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                            jour_3.selectNewLine({
                                sublistId: 'line'
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'account',
                                value: 122
                            }) //应收账款
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: 'memo',
                                value: "资 " + orderid
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "credit",
                                value: DR
                            })
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "entity",
                                value: entity
                            }) //客户
                            jour_3.setCurrentSublistValue({
                                sublistId: 'line',
                                fieldId: "custcol_document_type",
                                value: "结算"
                            })
                            fulfill_channel == "MFN" ?
                                jour_3.setCurrentSublistValue({
                                    sublistId: 'line',
                                    fieldId: "custcol_amazon_fulfillment_channel",
                                    value: "FBM"
                                }) : ""
                            jour_3.commitLine({
                                sublistId: 'line'
                            })
                        }
                        // jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
                        // jour_3.setValue({fieldId:'trandate',value:moment.utc(trandate).toDate()})
                        jo3_id = jour_3.save();
                        log.debug("000收款凭证耗时：", new Date().getTime() - j3_startTime)
                        log.debug("000000000000第三步 success", jo3_id)
                    } catch (error) {
                        log.error("生成第三步 error orderid:" + orderid + ",settlementid:" + key, error)
                        DetleteJO(orderid)
                        return;
                    }
                }
                // record.submitFields({
                //   type: "customrecord_exlimit_orderid",
                //   id: rec_id,
                //   values: {
                //     custrecord_ruash: "OK"
                //   }
                // })

                log.debug("jo1_id：" + typeof (jo1_id), JSON.stringify(jo1_id))
                log.debug("settlement_ids" + typeof (settlement_ids), JSON.stringify(settlement_ids))
                interfunction.relativaJE(jo1_id, jo_2, jo3_id, settlement_ids)


                // interfunction.setTruesettlment(settlement_ids)

                // ===========================================
                //查找相同的order item id 的发票进行核销记录
                // mo_date = mo_date.split(/[\u4e00-\u9fa5]/g)
                // log.debug("mo_date", JSON.stringify(mo_date))
                // if (mo_date[1].length == 1) mo_date[1] = "0" + mo_date[1]
                // if (mo_date[2].length == 1) mo_date[2] = "0" + mo_date[2]
                // var Time = mo_date[0] + mo_date[1] + mo_date[2]   //期
                // log.debug(JSON.stringify(mo_date) + " mo_date================\n")
                // acc_text = acc_text.substring(0, 2) + acc_text.substring(acc_text.length - 2, acc_text.length)
                // var T_memo = acc_text + Time + "-0"   //付款备注
                // var ship_ids = obj.ship_id_arrys, orders = []
                // ship_ids.map(function (shs) {
                //   search.create({
                //     type: 'invoice',
                //     filters: [
                //       { name: "custbody_amazon_shipment_id", operator: "is", values: shs }
                //     ],
                //   }).run().each(function (e) {
                //     orders.push({
                //       rec_id: e.id
                //     })
                //     return true
                //   })
                //   log.debug(shs + " 待付款的发票总是:" + orders.length)
                //   orders.map(function (il) {
                //     T_memo = CreatePaymentRec("orders", acc, entity, T_memo, Time)
                //     log.debug("T_memo :", T_memo)
                //     record.submitFields({
                //       type: "invoice",
                //       id: il.rec_id,
                //       values: {
                //         memo: T_memo,
                //       }
                //     })
                //     log.debug("OK ", il.rec_id)
                //   })
                // })
            } catch (e) {
                log.error("error :" + orderid + "，settlementid:" + key, e)

            }

        })
    }

    function summarize(summary) {
        log.audit("处理完成")
    }

    /**
     * 创建付款型号记录
     * @param {*} t 
     * @param {*} acc 
     * @param {*} entity 
     * @param {*} T_memo 
     * @param {*} fm 
     */
    function CreatePaymentRec(t, acc, entity, T_memo, fm) {
        var resd, qty, Tmemo, rs;
        search.create({
            type: "customrecord_payment_rec_store",
            filters: [{
                    name: 'custrecord_payment_type',
                    operator: search.Operator.IS,
                    values: t
                },
                {
                    name: 'custrecord_payment_store',
                    operator: "anyof",
                    values: acc
                },
                {
                    name: "custrecord_payment_customer",
                    operator: "anyof",
                    values: entity
                },
                {
                    name: "custrecord_payment_fm",
                    operator: "is",
                    values: fm
                },
                {
                    name: "custrecord_buchong",
                    operator: "is",
                    values: "T"
                },
            ],
            columns: [{
                    name: "internalid",
                    sort: "DESC"
                },
                {
                    name: "custrecord_payment_counts"
                },
                {
                    name: "custrecord_payment_memo"
                }
            ]
        }).run().each(function (rec) {
            log.debug("找到重复的了 " + rec.id)
            Tmemo = rec.getValue("custrecord_payment_memo")
            resd = record.load({
                type: "customrecord_payment_rec_store",
                id: rec.id
            })
            qty = Number(rec.getValue("custrecord_payment_counts")) + 1
        })
        //付款、退款备注编号，大于5000则增加流水号 T_memo +""
        if (qty <= 4000 && qty) {
            rs = Tmemo
            resd.setValue({
                fieldId: "custrecord_payment_memo",
                value: Tmemo
            })
            resd.setValue({
                fieldId: "custrecord_payment_counts",
                value: qty
            })
        } else if (qty > 4000 && qty) {
            qty = 1
            var ty = Number(Tmemo.split("-")[1]) + 1
            Tmemo = Tmemo.split("-")[0] + "-" + ty
            rs = Tmemo
            resd = record.create({
                type: "customrecord_payment_rec_store"
            })
            resd.setValue({
                fieldId: "custrecord_payment_memo",
                value: Tmemo
            })
            resd.setValue({
                fieldId: "custrecord_payment_counts",
                value: qty
            })
            resd.setValue({
                fieldId: "custrecord_buchong",
                value: "T"
            })
        } else if (!resd) {
            qty = 1
            rs = T_memo
            resd = record.create({
                type: "customrecord_payment_rec_store"
            })
            resd.setValue({
                fieldId: "custrecord_payment_memo",
                value: T_memo
            })
            resd.setValue({
                fieldId: "custrecord_payment_counts",
                value: qty
            })
            resd.setValue({
                fieldId: "custrecord_buchong",
                value: "T"
            })
        }
        resd.setValue({
            fieldId: "custrecord_payment_fm",
            value: fm
        })
        resd.setValue({
            fieldId: "name",
            value: rs
        })
        resd.setValue({
            fieldId: "custrecord_payment_type",
            value: t
        })
        resd.setValue({
            fieldId: "custrecord_payment_store",
            value: acc
        })
        resd.setValue({
            fieldId: "custrecord_payment_customer",
            value: entity
        })
        var sds = resd.save()
        log.debug("OK:" + sds, rs)
        return rs
    }

    /**
     * 执行失败，记录有差异的数据，存储并可显示，供分析、查询用途
     * @param {*} type missing report类型
     * @param {*} orderid 
     * @param {*} desc  描述
     * @param {*} acc 
     */
    function createMissingReportRec(type, orderid, desc, acc) {
        var rec
        var fils = []
        type ? fils.push({
            name: 'custrecord_missing_report_type',
            operator: 'is',
            values: type
        }) : ""
        orderid ? fils.push({
            name: 'custrecord_missing_report_orderid',
            operator: 'is',
            values: orderid
        }) : ""
        acc ? fils.push({
            name: 'custrecord_missing_report_store',
            operator: 'is',
            values: acc
        }) : ""
        desc ? fils.push({
            name: 'custrecord_missing_report_description',
            operator: 'is',
            values: desc
        }) : ""
        search.create({
            type: 'customrecord_missing_report',
            filters: fils
        }).run().each(function (rec) {
            rec = record.load({
                type: "customrecord_missing_report",
                id: rec.id
            })
            // record.submitFields({
            //   type: 'customrecord_missing_report',
            //   id: rec.id,
            //   values: {
            //     custrecord_tr_missing_order_resolved: true
            //   },
            //   options: {
            //     enableSourcing: false,
            //     ignoreMandatoryFields: true
            //   }
            // })
            // log.debug("make Resovle " + rec.id, type + " : " + orderid)
            // return true
        })
        if (!rec) {
            rec = record.create({
                type: "customrecord_missing_report"
            })
            rec.setValue({
                fieldId: "custrecord_tr_missing_order_type",
                value: type
            })
            rec.setValue({
                fieldId: "custrecord_missing_report_orderid",
                value: orderid
            })
            rec.setValue({
                fieldId: "custrecord_missing_report_store",
                value: acc
            })
            rec.setValue({
                fieldId: "custrecord_missing_report_description",
                value: desc
            })
            rec.save()
        }


    }
    /**
     * 执行完成，删除已有的差异记录
     * @param {*} type 
     * @param {*} orderid 
     * @param {*} desc 
     * @param {*} acc 
     */
    function delMissingReportRec(type, orderid, desc, acc) {
        var rec
        var fils = []
        type ? fils.push({
            name: 'custrecord_missing_report_type',
            operator: 'is',
            values: type
        }) : ""
        orderid ? fils.push({
            name: 'custrecord_missing_report_orderid',
            operator: 'is',
            values: orderid
        }) : ""
        acc ? fils.push({
            name: 'custrecord_missing_report_store',
            operator: 'is',
            values: acc
        }) : ""
        desc ? fils.push({
            name: 'custrecord_missing_report_description',
            operator: 'is',
            values: desc
        }) : ""
        search.create({
            type: 'customrecord_missing_report',
            filters: fils
        }).run().each(function (rec) {
            var de = record.delete({
                type: "customrecord_missing_report",
                id: rec.id
            })

        })
    }
    /**
     * makeresovle missingorder
     * @param {*} type 
     * @param {*} orderid 
     * @param {*} acc 
     */
    function makeresovle(type, orderid, acc) {
        var fils = []
        type ? fils.push({
            name: 'custrecord_tr_missing_order_type',
            operator: 'is',
            values: type
        }) : ""
        orderid ? fils.push({
            name: 'custrecord_missing_orderid_txt',
            operator: 'is',
            values: orderid
        }) : ""
        acc ? fils.push({
            name: 'custrecord_tracking_missing_acoount',
            operator: 'is',
            values: acc
        }) : ""
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: fils
        }).run().each(function (rec) {
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
            log.debug("make Resovle " + rec.id, type + " : " + orderid)
            return true
        })
    }
    /**
     * 生成凭证过程失败，删除已生成的凭证
     * @param {*} orderid 
     */
    function DetleteJO(orderid) {
        search.create({
            type: 'journalentry',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: true
                },
                {
                    name: 'custbody_jour_orderid',
                    operator: 'is',
                    values: orderid
                },
            ],
            columns: [{
                name: "memomain"
            }]
        }).run().each(function (e) {
            try {
                if (e.getValue("memomain") == "02" || e.getValue("memomain") == "03") {
                    var de = record.delete({
                        type: 'journalentry',
                        id: e.id
                    })
                    log.debug("删除成功  ", de)
                }
            } catch (e) {
                log.debug("delete error", e)
            }
            return true
        })
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
    function createSOTRMissingOrder(type, orderid, reason, date, acc) {
        var mo;
        var fils = []
        type ? fils.push({
            name: 'custrecord_tr_missing_order_type',
            operator: 'is',
            values: type
        }) : ""
        orderid ? fils.push({
            name: 'custrecord_missing_orderid_txt',
            operator: 'is',
            values: orderid
        }) : ""
        acc ? fils.push({
            name: 'custrecord_tracking_missing_acoount',
            operator: 'is',
            values: acc
        }) : ""
        var mo;
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: fils
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
        type ?
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_type',
                value: type
            }) : ""; //类型
        acc ?
            mo.setValue({
                fieldId: 'custrecord_tracking_missing_acoount',
                value: acc
            }) : "";
        orderid ?
            mo.setValue({
                fieldId: 'custrecord_missing_orderid_txt',
                value: orderid
            }) : "";
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

    /**
     * 格式化时间，时区转为美国  返回
     * 判断是否为2020.02.01 08:00:00 UTC之后才处理
     * @param {*} dateStr
     */

    function getFormatedDate(postDate, endDate, depositDate) {
        var o_date = moment.utc("2020/02/01 08:00:00").toDate() //UTC 2020年2月1日 8点，美国0点
        if (!depositDate) {
            var post_strs = postDate.substring(0, 10)
            var end_strs = endDate.substring(0, 10)
            var end_len = end_strs.split(".")[0].length
            var date_end, date_post
            if (end_len < 4) {
                date_end = end_strs.split(".")[2] + "/" + end_strs.split(".")[1] + "/" + end_strs.split(".")[0] + " " + endDate.substring(11, 19)
                date_post = post_strs.split(".")[2] + "/" + post_strs.split(".")[1] + "/" + post_strs.split(".")[0] + " " + postDate.substring(11, 19)
            } else {
                date_end = endDate.substring(0, 19)
                date_post = postDate.substring(0, 19)
            }
            var ender_date = moment.utc(date_end).toDate()
            var poster_date = moment.utc(date_post).toDate()
            if (o_date > poster_date) {
                //判断posted date是否在2020年2月1日 UTC8点之后才处理
                return "2"
            }
            date_end = format.format({
                value: ender_date,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_LOS_ANGELES //统一转为美国时间 endDate
            });
            date_post = format.format({
                value: poster_date,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_LOS_ANGELES //统一转为美国时间 postDate
            });
            var Day = date_end.split(/[\u4e00-\u9fa5]/g)[2]
            var month = date_end.split(/[\u4e00-\u9fa5]/g)[1]
            if (Day > 3 && month > date_post.split(/[\u4e00-\u9fa5]/g)[1]) { //大于等于3日取endDate,
                return date_end
            } else {
                /**  
           取 post Date
         */
                return date_post
            }
        } else {
            //收款时间 depositDate
            var deposit_strs = depositDate.substring(0, 10)
            var deposit_len = deposit_strs.split(".")[0].length
            var deposit_date
            if (deposit_len < 4) {
                deposit_date = deposit_strs.split(".")[2] + "/" + deposit_strs.split(".")[1] + "/" + deposit_strs.split(".")[0] + " " + depositDate.substring(11, 19)
            } else {
                deposit_date = depositDate.substring(0, 19)
            }
            return format.format({
                value: moment.utc(deposit_date).toDate(),
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_LOS_ANGELES //统一转为美国时间 depositDate
            });
        }
    }

    function invoic_tr(cache_id, depositDate, jo1_id, jo_2, jo3_id) {
        var inv = record.load({
            type: record.Type.INVOICE,
            id: cache_id
        });
        var orderid = inv.getValue("otherrefnum")
        log.audit('INVOICE', {
            orderid: orderid,
            inv: inv.getValue('tranid'),
            location: inv.getValue('location'),
            approvalstatus: inv.getValue('approvalstatus')
        });

        if (inv.getValue('approvalstatus') == 1)
            record.submitFields({
                type: 'invoice',
                id: cache_id,
                values: {
                    approvalstatus: 2
                }
            })

        var save_id
        var acc = inv.getValue('custbody_pr_store'),
            account, cust, acc_name;
        search.create({
            type: 'customrecord_aio_account',
            filters: [{
                name: 'internalid',
                operator: 'is',
                values: acc
            }],
            columns: [{
                    name: 'custrecord_customer_payment_account'
                },
                {
                    name: 'custrecord_aio_customer'
                },
                {
                    name: 'name'
                },
            ]
        }).run().each(function (e) {
            account = e.getValue(e.columns[0])
            cust = e.getValue(e.columns[1])
            acc_name = e.getValue(e.columns[2])
        })
        search.create({
            type: 'invoice',
            filters: [{
                name: 'internalid',
                operator: 'is',
                values: acc
            }],
            columns: [{
                    name: 'custrecord_customer_payment_account'
                },
                {
                    name: 'name'
                },
            ]
        }).run().each(function (e) {
            account = e.getValue(e.columns[0])
            acc_name = e.getValue(e.columns[2])
        })
        // account = 1275
        log.debug("account客户付款科目", account)
        // var pmt = record.transform({
        //   fromType: record.Type.INVOICE,
        //   toType: record.Type.CUSTOMER_PAYMENT,
        //   fromId: Number(cache_id)
        // });
        var pmt = record.create({
            type: record.Type.CUSTOMER_PAYMENT
        })
        pmt.setValue({
            fieldId: "customer",
            value: cust
        })
        log.debug("depositDate", depositDate)

        pmt.setText({
            fieldId: 'trandate',
            text: getFormatedDate("", "", depositDate)
        });
        pmt.setValue({
            fieldId: 'payment',
            value: account
        });
        pmt.setValue({
            fieldId: 'account',
            value: account
        });

        save_id = pmt.save({
            ignoreMandatoryFields: true
        });
        log.audit("客户付款成功:", save_id)


        jo1_id.map(function (j1) {
            record.submitFields({
                type: "journalentry",
                id: j1,
                values: {
                    custbody_payment: save_id
                }
            })
        })

        record.submitFields({
            type: "journalentry",
            id: jo_2,
            values: {
                custbody_payment: save_id
            }
        })
        record.submitFields({
            type: "journalentry",
            id: jo3_id,
            values: {
                custbody_payment: save_id
            }
        })
        return save_id
    }
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});