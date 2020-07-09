/*
 * @Date           : 2020-04-11 15:50:58
 * @LastEditors    : Li
 * @LastEditTime   : 2020-05-08 14:43:08
 * @Description    : 
 * @FilePath       : \douples_amazon\Amazon_salesreport_mp1.js
 * @Author         : Li
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(["require", "exports", "./Helper/core.min", "N/log", "N/record", "N/search", "N/xml", "./Helper/Moment.min", "N/runtime","./Helper/interfunction.min"],
    function (require, exports, core, log, record, search, xml, moment, runtime,interfun) {
        Object.defineProperty(exports, "__esModule", {
            value: true
        });

        exports.getInputData = function () {

            var orderJson = [],
                total = 0;
                var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_store' });
                var group_f = runtime.getCurrentScript().getParameter({ name: 'custscript_acc_group_fl' });
                log.debug("acc:"+acc);
                  var fils = [];
                  fils.push(search.createFilter({ name: 'custrecord_aio_marketplace', operator: "anyof", values: "1" }));/* amazon */
                  fils.push(search.createFilter({ name: 'custrecord_aio_seller_id', operator: "isnotempty"}));/* amazon */
                  fils.push(search.createFilter({ name: 'custrecord_aio_dev_account', operator: "noneof",values:"@NONE@"}));/* amazon */
                  fils.push(search.createFilter({ name: 'isinactive', operator: "is",values:false}));/* amazon */
                  fils.push(search.createFilter({ name: 'custrecord_dps_get_report', operator: "is",values:true}));/* amazon */
                  acc ? fils.push(search.createFilter({ name: 'internalidnumber', operator: search.Operator.EQUALTO, values: acc })) : "";
                  group_f ? fils.push(search.createFilter({ name: 'custrecord_aio_getorder_group', operator: search.Operator.ANYOF, values: group_f })) : "";
                  log.debug("filters", JSON.stringify(fils))
            // 搜索店铺
            search.create({
                type: 'customrecord_aio_account',
                filters: fils,
                columns: [{
                        name: 'custrecord_aio_enabled_sites'
                    } // 站点信息
                ]
            }).run().each(function (rec) {
                // var sites = rec.getText('custrecord_aio_enabled_sites');
                // orderJson[sites] = rec.id;
                orderJson.push(rec.id)
                total++;
                return true;
            })

            log.audit("总数: total  " + total, JSON.stringify(orderJson));
            return orderJson;

        };

        exports.map = function (ctx) {
            var acc = ctx.value,
                fid, h, PostedAfter, PostedBefore, PBefore, PEndDate, end_dateTime;
            var type_fin = runtime.getCurrentScript().getParameter({
                name: 'custscript_finances_type'
            });
            var dateId = runtime.getCurrentScript().getParameter({
                name: 'custscript_finaces_index'
            });
            log.debug("type", type_fin);
            var ref_1, ref_2, day
            try {
                log.debug("try", "try");
                // 搜索财务报告拉取请求记录, 获取上次请求的时间范围
                search.create({
                    type: 'customrecord_amazon_finances_status',
                    filters: [{
                            name: 'custrecord_finances_status_acc',
                            operator: search.Operator.IS,
                            values: acc
                        },
                        {
                            name: 'custrecord_financetype_status',
                            operator: search.Operator.IS,
                            values: type_fin
                        },
                        // { name: "custrecord_amazon_finances_index", operator: search.Operator.IS, values: dateId }
                    ],
                    columns: [{
                            name: 'custrecord_finances_postedafter'
                        }, // POSTEDAFTER  上次请求的开始时间
                        {
                            name: 'custrecord_finances_postedbefore'
                        }, // POSTEDBEFORE 上次请求的结束时间
                        {
                            name: "custrecord_dps_amazon_finaces_end_date"
                        },//终止时间
                    ]
                }).run().each(function (rec) {
                    fid = rec.id;
                    h = record.load({
                        type: 'customrecord_amazon_finances_status',
                        id: rec.id
                    });
                    PostedAfter = rec.getValue(rec.columns[0]);
                    PBefore = rec.getValue(rec.columns[1]);
                    PEndDate = rec.getValue(rec.columns[2]);
                    return false;
                });

                log.debug('PostedAfter', PostedAfter);
                log.debug('PBefore: ' + PBefore, "PEndDate: " + PEndDate);

                var bfDateTime, endDateTime, flag;

                // 用于比较请求的结束时间与终止时间, 若请求的结束时间大于终止时间, 则用终止时间作为请求的结束时间
                if (PBefore && PEndDate) {
                    var bfDateTime = new Date(PBefore),
                        endDateTime = new Date();

                    log.debug("bfDateTime - endDateTime", bfDateTime + " ; " + endDateTime)

                    if ((bfDateTime - endDateTime >= 0) && bfDateTime && endDateTime) {
                        log.debug('请求财务报告的时间 PostedBefore', "大于当前时间: " + (bfDateTime - endDateTime));
                        end_dateTime = PEndDate;
                        flag = true;
                    }
                }

                if (flag) {
                    log.debug('不执行操作', "直接退出");
                    return;
                }

                // 若请求的结束时间与终止时间相同, 则退出
                if ((PBefore == PEndDate) && PBefore && PEndDate) {
                    log.debug("PBefore == PEndDate")
                    return;
                }

                var report_start_date;

                // 若不存在记录, 则新建
                if (!fid) {
                    h = record.create({
                        type: 'customrecord_amazon_finances_status'
                    });
                    h.setValue({
                        fieldId: 'custrecord_finances_status_acc',
                        value: acc
                    });
                    h.setValue({
                        fieldId: 'custrecord_financetype_status',
                        value: type_fin
                    });

                    var report_range = runtime.getCurrentScript().getParameter({
                        name: 'custscript_dps_obt_report_date_range'
                    });

                    report_start_date = Number(report_range) <= 3 ?
                        moment.utc().subtract(1, ['', 'days', 'weeks', 'months'][report_range]).startOf('day').toISOString() :
                        moment.utc().subtract(Number(report_range) - 2, 'days').startOf('day').toISOString();

                    // 获取自定义时间 的财务报告
                    // TODO
                    report_start_date = "2020-06-01T00:00:00.000Z"
                    // 设置请求报告的开始时间
                    h.setValue({
                        fieldId: 'custrecord_dps_financetype_startdate',
                        value: report_start_date
                    })
                }
                log.debug('report_start_date', report_start_date);


                var postb, posta;

                if (!PostedAfter) {
                    // 若不存在请求的起始时间
                    posta = report_start_date
                }

                if (!PBefore) {
                    // 若不存在请求的截止时间
                    PBefore = report_start_date;
                }

                // posta = PostedAfter;

                // 使用上一次请求的结束时间, 作为本次请求的开始时间
                posta = PBefore;
                // postb = PBefore;

                // 上一次的 PostedBefore 作为本次的 PostedAfter
                ref_1 = moment(PBefore).toDate();
                // ref_1 = moment(ref_1.getTime() + 1).toDate();
                ref_1 = moment(ref_1).toISOString();

                // 上次请求的结束时间, 加上对应的小时数 作为本次请求的结束时间
                var nb;
                var postbDate = moment(PBefore).toDate();

                if (type_fin == "refunds") {
                    log.audit(" refunds:" + type_fin);
                    nb = moment(postbDate.getTime() + 12 * 60 * 60 * 1000).toDate();
                } else {
                    log.audit(" orders:" + type_fin)
                    nb = moment(postbDate.getTime() + 12 * 60 * 60 * 1000).toDate();
                }

                ref_2 = moment(nb).toISOString();

                log.debug('ref_2', ref_2)


                if (end_dateTime) {
                    postb = end_dateTime;
                    log.debug('if postb = ref_2', postb)
                } else {
                    postb = ref_2
                    log.debug('else postb = ref_2', postb)
                }

                log.error("ref_1 + ref_2", ref_1 + "  :  " + ref_2);

                h.setValue({
                    fieldId: 'custrecord_finances_postedafter',
                    value: ref_1
                });
                h.setValue({
                    fieldId: 'custrecord_finances_postedbefore',
                    value: ref_2
                });

                log.audit(acc + "，type:" + type_fin, "PostedAfter:" + posta + " - " + "PostedBefore:" + postb)

                try {
                    var auth = core.amazon.getAuthByAccountId(acc),
                        enventlists;
                    var startT = new Date().getTime();

                    // (auth, tranid, nextToken, PostedAfter, PostedBefore, type_fin)
                    var content = core.amazon.listFinancialEvents1(auth, "", "", posta, postb, type_fin)
                    var endT = new Date().getTime();
                    log.error("000listFinancialEvents", (endT - startT));
                    log.debug("content:", JSON.stringify(content))


                    // 若请求报错, 则不更改信息

                    log.error('report_start_date: ' + report_start_date, moment.utc().subtract(1, 'days').endOf('day').toISOString())
                    // h.setValue({ fieldId: 'custrecord_finances_postedafter2', value: report_start_date });
                    // 设置请求报告的结束时间
                    h.setValue({
                        fieldId: 'custrecord_dps_amazon_finaces_end_date',
                        value: moment.utc().subtract(1, 'days').endOf('day').toISOString()
                    });

                    var ssr = h.save()
                    log.audit("update success stauts", ssr)

                    if (type_fin == "orders") enventlists = content.shipment_event_list
                    if (type_fin == "refunds") enventlists = content.refund_event_list
                    log.audit('enventlists length', enventlists.length)
                    enventlists.map(function (l) {
                        ctx.write({
                            key: acc+"."+l.amazon_order_id,
                            value: {
                                "acc": acc,
                                "posta": posta,
                                "postb": postb,
                                "ship_l": l,
                                "type_fin": type_fin
                            }
                        })
                    })
                } catch (e) {
                    log.error("error:", e)
                    try {
                        var miss_rec = record.create({
                            type: 'customrecord_amazon_missing_finances'
                        })
                        miss_rec.setValue({
                            fieldId: 'custrecord_missing_postedafter',
                            value: posta
                        })
                        miss_rec.setValue({
                            fieldId: 'custrecord_missing_postedbefore',
                            value: postb
                        })
                        miss_rec.setValue({
                            fieldId: 'custrecord_missing_acc',
                            value: acc
                        })
                        miss_rec.setValue({
                            fieldId: 'custrecord_missing_error_reason',
                            value: JSON.stringify(e)
                        })
                        var miss_id = miss_rec.save()
                        log.audit("miss_id:", miss_id)

                    } catch (error) {
                        log.error('保存出错了', error)

                    }
                }
            } catch (e) {
                log.error("error:", e)
            }
        };
        exports.reduce = function (ctx) {
            try {
                var posta, postb, acc, type_fin
                var v = ctx.values
                log.error("0000v.length", v.length);
                var totalStartT = new Date().getTime();
                v.map(function (vl) {
                    var l = JSON.parse(vl).ship_l,
                        acc = JSON.parse(vl).acc
                    postb = JSON.parse(vl).postb
                    type_fin = JSON.parse(vl).type_fin
                    posta = JSON.parse(vl).posta
                    log.debug("vl:" + Object.prototype.toString.call(l), JSON.stringify(l) + "，type_fin：" + type_fin)
                    if (Object.prototype.toString.call(l) == "[object Array]") {
                        log.debug("[object Array]", Object.prototype.toString.call(l))
                        l.map(function (sl) {
                            log.debug("[object Array].map", Object.prototype.toString.call(sl))
                            createRec(sl, acc, type_fin)
                        })
                    } else {
                        log.debug("bushi arry")
                        createRec(l, acc, type_fin)
                    }
                })
                var totalEndT = new Date().getTime();
                log.error("000耗时", (totalEndT - totalStartT));
            } catch (e) {
                log.error("error:", e)
                var miss_rec = record.create({
                    type: 'customrecord_amazon_missing_finances'
                })
                miss_rec.setValue({
                    fieldId: 'custrecord_missing_postedafter',
                    value: posta
                })
                miss_rec.setValue({
                    fieldId: 'custrecord_missing_postedbefore',
                    value: postb
                })
                miss_rec.setValue({
                    fieldId: 'custrecord_missing_acc',
                    value: acc
                })
                miss_rec.setValue({
                    fieldId: 'custrecord_missing_error_reason',
                    value: JSON.stringify(e)
                })
                var miss_id = miss_rec.save()
                log.audit("miss_id:", miss_id)
            }

        };

        function createRec(l, acc, type_fin) {
            var ship_rec;
            search.create({ //去重
                type: "customrecord_amazon_finances_cahce",
                filters: [{
                        name: 'custrecord_amazon_finances_account',
                        operator: 'is',
                        values: acc
                    },
                    {
                        name: 'custrecord_finance_type',
                        operator: 'is',
                        values: type_fin
                    }, //类型
                    {
                        name: 'custrecord_amazon_finances_orderid',
                        operator: 'is',
                        values: l.amazon_order_id
                    },
                    {
                        name: 'custrecord_amazon_ginances_postdate_txt',
                        operator: 'is',
                        values: l.posted_date
                    },
                ]
            }).run().each(function (e) {
                log.error("you", e.id)
                ship_rec = record.load({
                    type: 'customrecord_amazon_finances_cahce',
                    id: e.id
                })
            })
            if (!ship_rec)
                ship_rec = record.create({
                    type: 'customrecord_amazon_finances_cahce'
                })

            var pos =  interfun.getFormatedDate("","",l.posted_date,true).date
            if(pos=="2") return ;
            ship_rec.setText({
                fieldId: 'custrecord_amazon_finances_postedafter',
                text:pos
            })
            ship_rec.setValue({
                fieldId: 'custrecord_amazon_ginances_postdate_txt',
                value: l.posted_date
            })
            ship_rec.setValue({
                fieldId: 'custrecord_amazon_finances_account',
                value: acc
            })
            ship_rec.setValue({
                fieldId: 'custrecord_amazon_finances_orderid',
                value: l.amazon_order_id
            })
            ship_rec.setValue({
                fieldId: 'custrecord_amazon_finances_body',
                value: JSON.stringify(l)
            })

            ship_rec.setValue({
                fieldId: 'custrecord_finance_type',
                value: type_fin
            })
            var cache_id = ship_rec.save()
            log.audit("lie.map OK:", cache_id)

        }
        exports.summarize = function (ctx) {
            log.audit('处理完成')
        };
    });