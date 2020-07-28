/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/format", "N/runtime", "./Helper/core.min", "./Helper/Moment.min", "N/log", "N/search",
    "N/record", "N/transaction", '../Rantion/Helper/location_preferred.js', "./Helper/interfunction.min"
], function (format, runtime, core, moment, log, search, record, transaction, loactionPre, interfun) {

    const price_conf = {
        "SKU售价": "item_price",
        "收取运费": "shipping_price",
        "促销折扣": "promotion_discount",
        "运费折扣": "shipping_discount",
        "giftwrap": "gift_wrap_price",
    }
    //订单类型
    const ord_type = {
        "AFN":1,
        "MFN":2
    }
    //订单状态
    const ord_status = {
        "PendingAvailability":1,
        "Pending":2,
        "Unshipped":3,
        "PartiallyShipped":4,
        "Shipped":5,
        "Canceled":6,
        "Unfulfillable":7,
    }
    function _get(context) {
        log.debug("context:",context)
        var startT = new Date().getTime();
        switch (context.op) {
            case "go_getAcc": //转单
                var acc = context.acc;
                var group = context.acc_group;
                var ff =[];
                core.amazon.getAccountList(group).map(function(acc){
                    ff.push(acc.id);
                });
                log.debug("rs:",ff);
                return ff;
            case "go_getord": //转单
                var acc = context.acc;
                log.debug("go context:", context);
                //var account = context.account;
                var invs = DealData(acc);
                return invs;
            case "fin"://财务报告
                log.debug("do context:", context);
                FinMap(context.acc, context.type_fin);
                var ss = "success ," + " 耗时：" + (new Date().getTime() - startT);
                return ss;
            case "dele":
                log.debug("do context:", context)
                var msg = settlementDe();
                var ss = "success ," + " 耗时：" + (new Date().getTime() - startT);
                log.debug("ss:", ss)
                return ss;
            case "store":
                log.debug("store context:", context)
                var msg = dingdandianpu();
                var ss = "success ," + " 耗时：" + (new Date().getTime() - startT);
                log.debug("ss:", ss);
                return ss;
            default:
                return context.op;
                break;
        }
    }

    function _post(context) {

    }

    function _put(context) {

    }

    function _delete(context) {

    }

    function FinMap(acc, type_fin) {

        var fid, h, PostedAfter, PostedBefore, PBefore, PEndDate, end_dateTime;
        log.debug("type", type_fin);
        var ref_1, ref_2
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
                },
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
                    endDateTime = new Date(PEndDate);

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
                nb = moment(postbDate.getTime() + 2 * 60 * 60 * 1000).toDate();
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

                    var ctx = {
                        "acc": acc,
                        "posta": posta,
                        "postb": postb,
                        "ship_l": l,
                        "type_fin": type_fin
                    }
                    reduce(ctx)
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

    function reduce(vl) {
        try {
            var posta, postb, acc, type_fin
            log.error("0000v.length", vl.length);
            var l = vl.ship_l,
                acc = vl.acc
            postb = vl.postb
            type_fin = vl.type_fin
            posta = vl.posta
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
            ship_rec.setText({
                fieldId: 'custrecord_amazon_finances_postedafter',
                text: interfun.getFormatedDate("", "", l.posted_date).date
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


   //创建财务报告
    function FinC(ctx) {
    var cache_id = ctx.value
    var fin = record.load({
        type: "customrecord_amazon_finances_cahce",
        id: cache_id
    })
    var ord = JSON.parse(fin.getValue("custrecord_amazon_finances_body"))
    var acc = fin.getValue("custrecord_amazon_finances_account")
    var postdate = fin.getValue("custrecord_amazon_ginances_postdate_txt")
    var t = fin.getValue("custrecord_finance_type")
    if (!t) return
    log.debug("Object.prototype:", Object.prototype.toString.call(ord))
    try {
        if (Object.prototype.toString.call(ord) == "[object Array]") {
        ord.map(function (o) {
            createRecFin(o, acc, cache_id, t, postdate)
        })
        } else {
            createRecFin(ord, acc, cache_id, t, postdate)
        }
        fin.setValue({
        fieldId: "custrecord_amazon_finances_checkbox",
        value: true
        })
        var fid = fin.save()
        log.audit("fid:", fid)
    } catch (e) {
        log.error("error:", e)
    }
    };
      
    /**
     * 从cache生成财务报告，refunds & orders     
     * 
     */
    function createRecFin(l, acc, cache_id, type_finances, postdate) {
        log.debug("type:" + type_finances, JSON.stringify(l))
        if (type_finances == "refunds") { //refund类型费用
          var items = l.shipment_item_adjustment_list
          var amazon_order_id = l.amazon_order_id
          var seller_order_id = l.seller_order_id
          log.debug("refunds items:" + amazon_order_id, JSON.stringify(items))
          if (items) {
            for (var i = 0; i < items.length; i++) {
              var ship_rec = record.create({
                type: 'customrecord_amazon_listfinancialevents'
              })
              ship_rec.setValue({
                fieldId: 'custrecord_fin_to_amazon_account',
                value: acc
              })
              ship_rec.setValue({
                fieldId: 'custrecord_relative_finances_rec',
                value: cache_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_sellersku',
                value: items[i].seller_sku
              })
              ship_rec.setValue({
                fieldId: 'custrecord_orderitemid',
                value: items[i].order_adjustment_item_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_quantityshipped',
                value: items[i].quantity_shipped
              })
              ship_rec.setText({
                fieldId: 'custrecord_posteddate',
                text: interfun.getFormatedDate("","",postdate).date
              })
              ship_rec.setValue({
                fieldId: 'custrecord_posteddate_txt',
                value: postdate
              })
              ship_rec.setValue({
                fieldId: 'custrecord_l_amazon_order_id',
                value: amazon_order_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_marketplace_name',
                value: l.marketplace_name
              })
              ship_rec.setValue({
                fieldId: 'custrecord_seller_order_id',
                value: seller_order_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_financetype',
                value: "refunds"
              })
  
              //遍历数据源，找出对应的费用类型 financeMapping
              var item_tax_withheld = items[i].item_tax_withheld_list
              for (var j = 0; j < item_tax_withheld.length; j++) {
                var taxes_withheld = item_tax_withheld[0].taxes_withheld
                for (var k = 0; k < taxes_withheld.length; k++) {
                  var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                  if (taxes_withheld[k]) {
                    ship_rec.setValue({
                      fieldId: "custrecord_prom_meta_data_def_val_code",
                      value: taxes_withheld[k].charge_amount.currency_code
                    })
                    var fieldss = taxes_withheld[k].charge_type
                    if (financeMapping[fieldss])
                      ship_rec.setValue({
                        fieldId: financeMapping[fieldss],
                        value: taxes_withheld[k].charge_amount.currency_amount
                      })
                    else {
                      ship_rec.setValue({
                        fieldId: "custrecord_orther_financatype",
                        value: orther + taxes_withheld[k].charge_type + "：-" + taxes_withheld[k].charge_amount.currency_amount + "; "
                      })
                    }
                  }
                }
              }
              var item_charge = items[i].item_charge_adjustment_list
              for (var l = 0; l < item_charge.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_charge[l].charge_amount.currency_code
                })
  
                if (financeMapping[item_charge[l].charge_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_charge[l].charge_type],
                    value: item_charge[l].charge_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_charge[l].charge_type + "：-" + item_charge[l].charge_amount.currency_amount + "; "
                  })
                }
              }
  
              var item_fee = items[i].item_fee_list
              for (var l = 0; l < item_fee.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_fee[l].fee_amount.currency_code
                })
                if (financeMapping[item_fee[l].fee_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_fee[l].fee_type],
                    value: item_fee[l].fee_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_fee[l].fee_type + "：-" + item_fee[l].fee_amount.currency_amount + "; "
                  })
                }
              }
              var item_fee_adjustment = items[i].item_fee_adjustment_list
              for (var l = 0; l < item_fee_adjustment.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_fee_adjustment[l].fee_amount.currency_code
                })
                if (financeMapping[item_fee_adjustment[l].fee_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_fee_adjustment[l].fee_type],
                    value: item_fee_adjustment[l].fee_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_fee_adjustment[l].fee_type + "：-" + item_fee_adjustment[l].fee_amount.currency_amount + "; "
                  })
                }
              }
  
              var promotion_list = items[i].promotion_list
              for (var l = 0; l < promotion_list.length; l++) {
                log.debug("promotion_list", JSON.stringify(promotion_list))
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                if (financeMapping[promotion_list[l].promotion_type]) {
                  var por = ship_rec.getValue(financeMapping[promotion_list[l].promotion_type])
                  por ? por : por = 0
                  var porship = ship_rec.getValue("custrecord_amazon_promotion_shipping")
                  porship ? porship : porship = 0
                  var poritem = ship_rec.getValue("custrecord_amazon_promotion_itemdiscount")
                  poritem ? poritem : poritem = 0
                  //promotion id  含有 item、VPC、Coupon 归为item类型费用,否则含有ship或者其他归为shipping类型费用
                  if (promotion_list[l].promotion_id.indexOf("item") > -1 || promotion_list[l].promotion_id.indexOf("VPC") > -1 || promotion_list[l].promotion_id.indexOf("Coupon") > -1)
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_itemdiscount',
                      value: (Number(poritem) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                    })
                  else
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_shipping',
                      value: (Number(porship) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                    })
  
                  ship_rec.setValue({
                    fieldId: financeMapping[promotion_list[l].promotion_type],
                    value: (Number(por) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                } else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + promotion_list[l].promotion_type + "：-" + promotion_list[l].promotion_amount.currency_amount + "; "
                  })
                }
              }
              var pro_adjustment = items[i].promotion_adjustment_list
              for (var l = 0; l < pro_adjustment.length; l++) {
                log.debug("pro_adjustment", JSON.stringify(pro_adjustment))
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                if (financeMapping[pro_adjustment[l].promotion_type]) {
                  var por = ship_rec.getValue(financeMapping[pro_adjustment[l].promotion_type])
                  por ? por : por = 0
                  var porship = ship_rec.getValue("custrecord_amazon_promotion_shipping")
                  porship ? porship : porship = 0
                  var poritem = ship_rec.getValue("custrecord_amazon_promotion_itemdiscount")
                  poritem ? poritem : poritem = 0
  
                  //promotion id  含有 item、VPC、Coupon 归为item类型费用,否则含有ship或者其他归为shipping类型费用
                  if (pro_adjustment[l].promotion_id.indexOf("item") > -1 || pro_adjustment[l].promotion_id.indexOf("VPC") > -1 || pro_adjustment[l].promotion_id.indexOf("Coupon") > -1)
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_itemdiscount',
                      value: (Number(poritem) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                    })
                  else
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_shipping',
                      value: (Number(porship) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                    })
  
                  ship_rec.setValue({
                    fieldId: financeMapping[pro_adjustment[l].promotion_type],
                    value: (Number(por) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                } else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + pro_adjustment[l].PromotionType + "：-" + pro_adjustment[l].promotion_amount.currency_amount + "; "
                  })
                }
              }
  
              var grant = ship_rec.getValue('custrecord_orther_financatype')
              ship_rec.setValue({
                fieldId: "custrecord_orther_financatype",
                value: Number(grant) + Number(items[i].cost_of_points_granted.currency_amount)
              })
              var returned = ship_rec.getValue('custrecord_orther_financatype')
              ship_rec.setValue({
                fieldId: "custrecord_orther_financatype",
                value: Number(returned) + Number(items[i].cost_of_points_returned.currency_amount)
              })
              var ss = ship_rec.save()
              log.debug("已生成退款财务报告", ss)
            }
          }
        } else { //orders类型费用
          var items = l.shipment_item_list
          var amazon_order_id = l.amazon_order_id
          var seller_order_id = l.seller_order_id
          log.debug("orders items:" + amazon_order_id, JSON.stringify(items))
          var marketplace_name = l.marketplace_name
          if (items) {
            for (var i = 0; i < items.length; i++) {
              var order_item_id = items[i].order_item_id
              var seller_sku = items[i].seller_sku
              var quantity_shipped = items[i].quantity_shipped
              log.debug(" l.seller_order_id:" + amazon_order_id, "postdate: " + postdate)
              var ship_rec = record.create({
                type: 'customrecord_amazon_listfinancialevents'
              })
              ship_rec.setValue({
                fieldId: 'custrecord_fin_to_amazon_account',
                value: acc
              })
              ship_rec.setValue({
                fieldId: 'custrecord_sellersku',
                value: seller_sku
              })
              ship_rec.setValue({
                fieldId: 'custrecord_orderitemid',
                value: order_item_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_quantityshipped',
                value: quantity_shipped
              })
              ship_rec.setValue({
                fieldId: 'custrecord_l_amazon_order_id',
                value: amazon_order_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_marketplace_name',
                value: marketplace_name
              })
              ship_rec.setValue({
                fieldId: 'custrecord_seller_order_id',
                value: seller_order_id
              })
              ship_rec.setValue({
                fieldId: 'custrecord_financetype',
                value: "orders"
              })
              ship_rec.setValue({
                fieldId: 'custrecord_relative_finances_rec',
                value: cache_id
              })
              ship_rec.setText({
                fieldId: 'custrecord_posteddate',
                text: interfun.getFormatedDate("","",postdate).date
              })
              ship_rec.setValue({
                fieldId: 'custrecord_posteddate_txt',
                value: postdate
              })
              var item_tax_withheld = items[i].item_tax_withheld_list
              //遍历数据源，找出对应的费用类型 financeMapping
              for (var j = 0; j < item_tax_withheld.length; j++) {
                var taxes_withheld = item_tax_withheld[j].taxes_withheld
                var orther = ship_rec.getValue("custrecord_orther_financatype")
                for (var k = 0; k < taxes_withheld.length; k++) {
                  ship_rec.setValue({
                    fieldId: "custrecord_prom_meta_data_def_val_code",
                    value: taxes_withheld[k].charge_amount.currency_code
                  })
                  if (financeMapping[taxes_withheld[k].charge_type])
                    ship_rec.setValue({
                      fieldId: financeMapping[taxes_withheld[k].charge_type],
                      value: taxes_withheld[k].charge_amount.currency_amount
                    })
                  else
                    ship_rec.setValue({
                      fieldId: "custrecord_orther_financatype",
                      value: orther + taxes_withheld[k].charge_type + "：-" + taxes_withheld[k].charge_amount.currency_amount + "; "
                    })
  
                }
              }
  
              var item_charge = items[i].item_charge_list
              for (var l = 0; l < item_charge.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ' '
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_charge[l].charge_amount.currency_code
                })
                if (financeMapping[item_charge[l].charge_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_charge[l].charge_type],
                    value: item_charge[l].charge_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_charge[l].charge_type + "：-" + item_charge[l].charge_amount.currency_amount + "; "
                  })
                }
              }
  
  
              var item_charge_adj = items[i].item_charge_adjustment_list
              for (var l = 0; l < item_charge_adj.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_charge_adj[l].charge_amount.currency_code
                })
                if (financeMapping[item_charge_adj[l].charge_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_charge_adj[l].charge_type],
                    value: item_charge_adj[l].charge_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_charge_adj[l].charge_type + "：-" + item_charge_adj[l].charge_amount.currency_amount + "; "
                  })
                }
              }
  
              var item_fee = items[i].item_fee_list
              for (var l = 0; l < item_fee.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                ship_rec.setValue({
                  fieldId: "custrecord_prom_meta_data_def_val_code",
                  value: item_fee[l].fee_amount.currency_code
                })
                if (financeMapping[item_fee[l].fee_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_fee[l].fee_type],
                    value: item_fee[l].fee_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_fee[l].fee_type + "：-" + item_fee[l].fee_amount.currency_amount + "; "
                  })
                }
  
              }
              var item_fee_adjustment = items[i].item_fee_adjustment_list
              for (var l = 0; l < item_fee_adjustment.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                if (financeMapping[item_fee_adjustment[l].fee_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[item_fee_adjustment[l].fee_type],
                    value: item_fee_adjustment[l].fee_amount.currency_amount
                  })
                else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + item_fee_adjustment[l].fee_type + "：-" + item_fee_adjustment[l].fee_amount.currency_amount + "; "
                  })
                }
              }
  
  
              var promotion_list = items[i].promotion_list
              for (var l = 0; l < promotion_list.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                if (financeMapping[promotion_list[l].promotion_type]) {
                  var por = ship_rec.getValue(financeMapping[promotion_list[l].promotion_type])
                  por ? por : por = 0
                  var porship = ship_rec.getValue("custrecord_amazon_promotion_shipping")
                  porship ? porship : porship = 0
                  var poritem = ship_rec.getValue("custrecord_amazon_promotion_itemdiscount")
                  poritem ? poritem : poritem = 0
  
                  //promotion id  含有 item、VPC、Coupon 归为item类型费用,否则含有ship或者其他归为shipping类型费用
                  if (promotion_list[l].promotion_id.indexOf("item") > -1 || promotion_list[l].promotion_id.indexOf("VPC") > -1 || promotion_list[l].promotion_id.indexOf("Coupon") > -1)
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_itemdiscount',
                      value: (Number(poritem) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                    })
                  else
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_shipping',
                      value: (Number(porship) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                    })
  
                  ship_rec.setValue({
                    fieldId: financeMapping[promotion_list[l].promotion_type],
                    value: (Number(por) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                } else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + promotion_list[l].promotion_type + "：-" + promotion_list[l].promotion_amount.currency_amount + "; "
                  })
                }
              }
              var pro_adjustment = items[i].promotion_adjustment_list
              for (var l = 0; l < pro_adjustment.length; l++) {
                var orther = ship_rec.getValue("custrecord_orther_financatype") + ''
                if (financeMapping[pro_adjustment[l].promotion_type]) {
                  var por = ship_rec.getValue(financeMapping[pro_adjustment[l].promotion_type])
                  por ? por : por = 0
                  var porship = ship_rec.getValue("custrecord_amazon_promotion_shipping")
                  porship ? porship : porship = 0
                  var poritem = ship_rec.getValue("custrecord_amazon_promotion_itemdiscount")
                  poritem ? poritem : poritem = 0
  
                  //promotion id  含有 item、VPC、Coupon 归为item类型费用,否则含有ship或者其他归为shipping类型费用
                  if (pro_adjustment[l].promotion_id.indexOf("item") > -1 || pro_adjustment[l].promotion_id.indexOf("VPC") > -1 || pro_adjustment[l].promotion_id.indexOf("Coupon") > -1)
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_itemdiscount',
                      value: (Number(poritem) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                    })
                  else
                    ship_rec.setValue({
                      fieldId: 'custrecord_amazon_promotion_shipping',
                      value: (Number(porship) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                    })
  
                  ship_rec.setValue({
                    fieldId: financeMapping[pro_adjustment[l].promotion_type],
                    value: (Number(por) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                } else {
                  ship_rec.setValue({
                    fieldId: "custrecord_orther_financatype",
                    value: orther + pro_adjustment[l].PromotionType + "：-" + pro_adjustment[l].promotion_amount.currency_amount + "; "
                  })
                }
              }
  
              var grant = ship_rec.getValue('custrecord_orther_financatype')
              ship_rec.setValue({
                fieldId: "custrecord_orther_financatype",
                value: Number(grant) + Number(items[i].cost_of_points_granted.currency_amount)
              })
              var returned = ship_rec.getValue('custrecord_orther_financatype')
              ship_rec.setValue({
                fieldId: "custrecord_orther_financatype",
                value: Number(returned) + Number(items[i].cost_of_points_returned.currency_amount)
              })
  
              var ss = ship_rec.save()
              log.debug("已生成发货财务报告", ss)
            }
          }
        }
      }




  //修改店铺字段
  function dingdandianpu(){
   var limit = 200,orders=[]
    search.create({
        type: record.Type.SALES_ORDER,
        filters: [
          { name: "custbody_order_locaiton", operator: 'anyof', values: "@NONE@" },
          { name: "custbody_sotck_account", operator: 'anyof', values: "@NONE@" },
          { name: 'custbody_aio_is_aio_order', operator: 'is', values: true },
          { name: 'mainline', operator: 'is', values: true }
        ],
        columns: [
          { name: 'custbody_aio_account' },
        ]
      }).run().each(function (rec) {
        orders.push({
           so_id: rec.id,
           acc: rec.getValue('custbody_aio_account') 
        })
        return --limit>0
      });
      log.debug("orders",orders.length)
      orders.map(function(e){
        record.submitFields({
            type: record.Type.SALES_ORDER,
            id: e.so_id,
            values: {
                custbody_order_locaiton:e.acc,
                custbody_sotck_account:e.acc,
            }
        })
      })
  }








    function settlementDe() {
        var orders = [], limit = 1000
        search.load({ id: "customsearch152" }).run().each(function (e) {
            orders.push(e.id)
            return --limit > 0
        })
        orders.map(function (dd) {
            var de = record.delete({ type: "customrecord_aio_amazon_settlement", id: dd })
            log.debug("de:" + de)
        })

    }
    function DealData(acc, idform, idto,oid) {

        var limit = 4 // 999; //350
        var startT = new Date().getTime();
        log.debug("acc", acc);
        log.debug("idform", idform);
        log.debug("idto", idto);
        var orders = [], orderid;
        try {
                core.amazon.getAccountList().map(function (account) {
                    if (account.id == acc) {
                        var filters = [{
                            name: 'custrecord_aio_cache_resolved',
                            operator: search.Operator.IS,
                            values: false
                        },
                        {
                            name: "custrecord_aio_cache_status",
                            operator: "isnot",
                            values: "Pending"
                        },
                     
                        ];
                        if(oid){
                            filters.push({
                                name: "custrecord_aio_cache_order_id",
                                operator: "is",
                                values: oid
                            });
                        }
                        if (idform) {
                            filters.push({
                                name: "internalidnumber",
                                operator: "greaterthanorequalto",
                                values: idform
                            });
                        }
                        if (idto) {
                            filters.push({
                                name: "internalidnumber",
                                operator: "lessthanorequalto",
                                values: idto
                            });
                        }
                        filters.push({
                            name: 'custrecord_aio_cache_acc_id',
                            operator: search.Operator.ANYOF,
                            values: account.id
                        });
                        search.create({
                            type: 'customrecord_aio_order_import_cache',
                            filters: filters,
                            columns: [{
                                name: 'created',
                                sort: search.Sort.DESC
                            },
                            {
                                name: 'custrecord_aio_cache_acc_id'
                            },
                            {
                                name: 'custrecord_aio_cache_body'
                            },
                            {
                                name: 'custrecord_amazonorder_iteminfo'
                            },
                            {
                                name: "custrecord_aio_cache_version",
                                sort: "ASC"
                            },
                            {
                                name: "custrecord_aio_cache_order_id",
                            },
                            ]
                        }).run().each(function (rec) {
                            orderid = rec.getValue("custrecord_aio_cache_order_id")
                            orders.push({
                                rec_id: rec.id,
                                version: rec.getValue({
                                    name: "custrecord_aio_cache_version",
                                    sort: "ASC"
                                }),
                                id: account.id,
                                currency: account.info.currency,
                                auth: account.auth_meta,
                                info: account.info,
                                extra: account.extra_info,
                                pref: account.preference,
                                country: account.country,
                                customer: account.customer,
                                ord_formula: account.ord_formula,
                                order: JSON.parse(rec.getValue('custrecord_aio_cache_body')),
                                iteminfo: rec.getValue('custrecord_amazonorder_iteminfo') ? rec.getValue("custrecord_amazonorder_iteminfo") : "",
                                enabled_sites: account.enabled_sites,
                            });
                            return --limit > 0;
                        });
                    }
                });
        } catch (error) {
            return "failer:" + error.message
        }
        log.debug("orders:" + orders.length)
        if (orders.length == 0)
            return "店铺 :"+acc+"order:" + orders.length
     try{
        orders.map(function (obj) {
                log.audit('obj', obj)
                var amazon_account_id = obj.id;
                var o = obj.order;
                var a = obj.auth;
                var i = obj.info;
                var e = obj.extra;
                var p = obj.pref;
                var cy = obj.currency;
                var country = obj.country;
                var r_id = obj.rec_id;
                var ord_formula = obj.ord_formula; //计算公式

                var version = obj.version;
                var err = []
                log.error('version ' + version, "country: " + country);

                var customer = obj.customer;
                var line_items = obj.iteminfo;



                try {
                    if (line_items) {
                        line_items ? line_items = JSON.parse(line_items) : '';
                    }
                } catch (error) {
                    line_items = '';
                    log.error('error', error);
                }
                var externalid = "aio" + amazon_account_id + "." + o.amazon_order_id;

                var fulfillment_channel = o.fulfillment_channel;

                var order_type = (o.fulfillment_channel == 'MFN' ? i.salesorder_type : e.fbaorder_type) == '1' ? 'salesorder' : 'cashsale';
                var order_form = o.fulfillment_channel == 'MFN' ? i.salesorder_form : e.fbaorder_form;

                var order_location = o.fulfillment_channel == 'MFN' ? e.fbaorder_location : e.fbaorder_location;
                // var order_location = o.fulfillment_channel == 'MFN' ? i.salesorder_location : e.fbaorder_location;
                // var order_trandate = p.if_payment_as_tran_date ? moment.utc(o.purchase_date).toDate() : moment.utc(o.purchase_date).toDate();

                var order_trandate = interfun.getFormatedDate("","",o.purchase_date).date;
                var last_update_date =interfun.getFormatedDate("","",o.last_update_date,true).date;
                try{
                    if(last_update_date == "2") {
                        if(r_id){
                            var del = record.delete({type:"customrecord_aio_order_import_cache",id:r_id});
                            log.debug("删除 del:"+del);
                        }
                        return ;
                    }
                }catch(e){

                }
             


                var error_message = [],
                    currency_id;
                var ord, c, shipping_cost = 0,
                    discount_rate = 0;

                var order_lastupdate = o.last_update_date;

                var enabled_sites = obj.enabled_sites;

                var dateFormat;

                log.audit('o.order_total.currency_code', o.order_total.currency_code);
                search.create({
                    type: 'currency',
                    filters: [{
                        name: "symbol",
                        operator: 'is',
                        values: o.order_total.currency_code
                    }]
                }).run().each(function (e) {
                    currency_id = e.id
                    return true
                })
                if (!currency_id) currency_id = cy
                log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!"); //开始处理订单!
                try {
                    /** 设置只抓取有付款信息的订单 */
                    if (p.if_only_paid_orders) {
                        if (o.fulfillment_channel == 'MFN' && o.order_status == 'Pending')
                            return mark_resolved(amazon_account_id, o.amazon_order_id);;
                        if (o.fulfillment_channel == 'AFN' && o.order_status != 'Shipped')
                            return mark_resolved(amazon_account_id, o.amazon_order_id);;
                    }
                    log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  111 " + order_type);
                    search.create({
                        type: order_type,
                        filters: [{
                            name: 'externalid',
                            operator: 'is',
                            values: externalid
                        }]
                    }).run().each(function (rec) {
                        log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  1111");
                        record.delete({ type: order_type, id: rec.id })
                        return false;
                    });
                    log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  222");
                    /** 状态未更新，直接PASS */
                    if (ord && o.order_status == 'Pending') {
                        return mark_resolved(amazon_account_id, o.amazon_order_id);
                    }
                    log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  333");
                    /** 状态变成了Cancel，VOID掉NS的单? */
                    if (ord && ord.getValue('orderstatus') != 'C' && o.order_status == 'Canceled') {
                        transaction.void({
                            type: 'salesorder',
                            id: ord.id
                        });
                    }
                    log.debug(externalid, externalid + " | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  444");
                    if (!ord) {
                        var cid = customer;

                        ord = record.create({
                            type: order_type,
                            isDynamic: true
                        });
                        log.debug('order_type', order_type); //salesorder
                        log.debug('order_form1', order_form); //68
                        if (order_form) {
                            ord.setValue({
                                fieldId: 'customform',
                                value: Number(order_form)
                            });

                        }

                        // 1 待定 / 未付款
                        // 2 已付款待发货
                        // 3 已发货
                        // 4 已完成
                        // 5 已取消


                        var pay_ord;
                        if (o.order_status == "Shipped") {
                            pay_ord = 3
                        } else if (o.order_status == "Pending") {
                            pay_ord = 1
                        } else if (o.order_status == "Canceled") {
                            pay_ord = 5
                        } else {
                            pay_ord = 2
                        }

                        // set payment status
                        if (pay_ord) {
                            ord.setValue({
                                fieldId: 'custbody_payment_state',
                                value: pay_ord
                            })
                        }

                        log.debug(externalid, externalid + " | \u7ED9\u8BA2\u5355\u8BBE\u7F6Eentity ID: " + cid);
                        ord.setValue({
                            fieldId: 'entity',
                            value: cid
                        });
                        //  ord.setValue({fieldId: 'entity',value: 6796});
                        log.debug('2getSublistValue', cid);
                        if (o.fulfillment_channel == 'MFN') {
                            ord.setValue({
                                fieldId: 'orderstatus',
                                value: 'A'
                            });
                            log.debug('3orderstatus', 'A');
                        }

                       

                        var enabled_sites_arr = ['AmazonUK', 'AmazonDE',]

                        ord.setValue({
                            fieldId: 'custbody_amazon_purchase_date',
                            value: o.purchase_date
                        });
                        log.debug('5currency：' + typeof (currency_id), currency_id);
                        ord.setValue({
                            fieldId: 'currency',
                            value: Number(currency_id)
                        });
                        log.debug('6otherrefnum', o.amazon_order_id);
                        ord.setValue({
                            fieldId: 'otherrefnum',
                            value: o.amazon_order_id
                        });
                        log.debug('7externalid', externalid);
                        ord.setValue({
                            fieldId: 'externalid',
                            value: externalid
                        });
                        log.debug('8department', i.dept);
                        if (i.dept) {
                            ord.setValue({
                                fieldId: 'department',
                                value: i.dept
                            })
                        }


                    } else {


                    
                        log.debug('o.order_lastupdate11', order_lastupdate);

                        if (ord.getValue('orderstatus') == 'A' && ['Pending', 'Canceled', 'Unfulfillable'].indexOf(o.order_status) > -1) {
                            /** 如果有地址，替换掉原来的临时地址 */
                            if (o.shipping_address && o.buyer_email) {
                                c = record.load({
                                    type: 'customer',
                                    id: ord.getValue('entity'),
                                    isDynamic: true
                                });
                                c.setValue({
                                    fieldId: 'isperson',
                                    value: 'T'
                                });
                                if (i.subsidiary)
                                    c.setValue({
                                        fieldId: 'subsidiary',
                                        value: i.subsidiary
                                    });
                                log.debug('i.subsidiary', i.subsidiary);
                                var names = o.buyer_email.split(' ').filter(function (n) {
                                    return n != '';
                                });
                                c.setValue({
                                    fieldId: 'firstname',
                                    value: names[0]
                                });
                                c.setValue({
                                    fieldId: 'lastname',
                                    value: (names.length > 1 ? (names.length > 2 ? names[2] : names[1]) : '*')
                                });
                                c.setValue({
                                    fieldId: 'middlename',
                                    value: names.length > 2 ? names[1] : ''
                                });
                                c.setValue({
                                    fieldId: 'currency',
                                    value: Number(currency_id)
                                });
                                c.setValue({
                                    fieldId: 'email',
                                    value: o.buyer_email
                                });
                                c.selectNewLine({
                                    sublistId: 'addressbook'
                                });
                                c.setCurrentSublistValue({
                                    sublistId: 'addressbook',
                                    fieldId: 'defaultshipping',
                                    value: true
                                });
                                c.setCurrentSublistValue({
                                    sublistId: 'addressbook',
                                    fieldId: 'defaultbilling',
                                    value: true
                                });
                                var addr = c.getCurrentSublistSubrecord({
                                    sublistId: 'addressbook',
                                    fieldId: 'addressbookaddress'
                                });
                                addr.setValue({
                                    fieldId: 'country',
                                    value: o.shipping_address.country_code
                                });
                                addr.setValue({
                                    fieldId: 'city',
                                    value: o.shipping_address.city
                                });
                                addr.setValue({
                                    fieldId: 'state',
                                    value: o.shipping_address.state_or_oegion.slice(0, 30)
                                });
                                addr.setValue({
                                    fieldId: 'zip',
                                    value: o.shipping_address.postal_code
                                });

                                addr.setValue({
                                    fieldId: 'addressee',
                                    value: o.shipping_address.name
                                });
                                addr.setValue({
                                    fieldId: 'addr1',
                                    value: o.shipping_address.address_line1
                                });
                                addr.setValue({
                                    fieldId: 'addr2',
                                    value: o.shipping_address.address_line2
                                });
                                c.commitLine({
                                    sublistId: 'addressbook'
                                });
                                log.debug('13', 13);
                                try {
                                    c.save();
                                    log.debug(externalid, externalid + " | \u66F4\u65B0\u5BA2\u4EBA\u4FE1\u606F\u6210\u529F! #" + c.id);
                                } catch (e) {
                                    throw "SAVING CUSTOMER INFORMATION FAILED: " + e;
                                }
                            }
                        }

                        var pay_ord;
                        if (o.order_status == "Shipped") {
                            pay_ord = 3
                        } else if (o.order_status == "Pending") {
                            pay_ord = 1
                        } else if (o.order_status == "Canceled") {
                            pay_ord = 5
                        } else {
                            pay_ord = 2
                        }

                        // set payment status
                        if (pay_ord) {
                            ord.setValue({
                                fieldId: 'custbody_payment_state',
                                value: pay_ord
                            })
                        }


                        // set payment status
                        if (pay_ord) {
                            ord.setValue({
                                fieldId: 'custbody_payment_state',
                                value: pay_ord
                            })
                        }
                        // set LAST UPDATE DATE
                        ord.setValue({
                            fieldId: 'custbody_aio_s_l_u_date',
                            value: o.last_update_date
                        });


                        // set purchase date
                        ord.setValue({
                            fieldId: 'custbody_aio_s_p_date',
                            value: o.purchase_date
                        });

                        // set PLATFORM ORDER STATUS
                        ord.setValue({
                            fieldId: 'custbody_aio_s_order_status',
                            value: o.order_status
                        });

                        // set SALES CHANNEL
                        ord.setValue({
                            fieldId: 'custbody_aio_s_sales_channel',
                            value: o.sales_channel
                        });
                        // set EARLIEST SHIP DATE
                        ord.setValue({
                            fieldId: 'custbody_aio_s_earliest_ship_date',
                            value: o.earliest_ship_date
                        });

                        // set order type 
                        ord.setValue({
                            fieldId: 'custbody_aio_s_order_type',
                            value: o.order_type
                        });
                        // set the fulfillment_channel
                        // ord.setValue({
                        //     fieldId: 'custbody_aio_s_fulfillment_channel',
                        //     value: fulfillment_channel
                        // });

                        var soId = ord.save({
                            ignoreMandatoryFields: true
                        });
                        return mark_resolved(amazon_account_id, o.amazon_order_id);
                    }
                    if (!line_items){
                        line_items = core.amazon.getOrderItems(a, o.amazon_order_id);
                        log.debug("0000011line_items:" + obj.rec_id, line_items);
    
                        record.submitFields({
                            type: 'customrecord_aio_order_import_cache',
                            id: obj.rec_id,
                            values: {
                                'custrecord_amazonorder_iteminfo': JSON.stringify(line_items)
                            }
                        });
                    }
                    log.debug("OKokokok:" + obj.rec_id, line_items)
                    var itemAry = []

                    //计算公式
                    log.debug("计算公式:", ord_formula)
                    var fla = {}
                    var formula_str = ord_formula.split(/[^+-]/g).join("").split("")
                    log.debug("1formula ", formula_str)
                    var formula_name = ord_formula.split(/[{}+-]/g)
                    log.debug("2 formula ", formula_name)
                    var fsn = 0
                    for (var i = 0; i < formula_name.length; i++) {
                        if (formula_name[i]) {
                            if (fsn == 0) {
                                fla[price_conf[formula_name[i]]] = "start"
                                fsn++
                            } else {
                                fla[price_conf[formula_name[i]]] = formula_str[fsn - 1]
                                fsn++
                            }
                        }
                    }

                    log.debug("2 fla ", fla)

                    line_items.map(function (line) {
                        log.debug("line", line);
                        log.debug("amazon_account_id", amazon_account_id);
                        itemAry.push(line.seller_sku);
                        if (line.qty == 0) {
                            return;
                        }
                        var skuid;

                        try {
                            skuid = interfun.getskuId(line.seller_sku, amazon_account_id,o.amazon_order_id)
                        } catch (e) {
                            err.push(e)
                            log.error("assemblyitem error :::", e)
                        }
                        if(!skuid) 
                        throw "SKU不存在"
                        ord.selectNewLine({
                            sublistId: 'item'
                        });
                        log.debug('12set skuid', 'skuid:' + skuid + ', cid:' + cid)




                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: skuid
                        });

                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: order_location
                        });

                        // ASIN
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_aio_amazon_asin',
                            value: line.asin
                        });
                        // seller sku
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_trans_order_item_sku',
                            value: line.seller_sku
                        });

                        log.debug('14quantity:' + typeof (line.qty), line.qty);
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: line.qty
                        });

                        //按照计算逻辑公式计算itemprice

                        var itemprice = 0, fla_str = ""
                        for (key in fla) {
                            if (fla[key] == "start") {
                                itemprice = Number(line[key])
                                fla_str += key + ""
                            } else {
                                if (fla[key] == "-") {
                                    itemprice = itemprice - Number(line[key])
                                    fla_str += "-" + key
                                } else if (fla[key] == "+") {
                                    fla_str += "+" + key
                                    itemprice = itemprice + Number(line[key])
                                }
                            }
                        }
                        log.debug("组合好的计算公式fla_str:", fla_str)
                        log.debug("0000000itemprice:" + itemprice, "原始的货品价格：" + line.item_price)

                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'rate',
                            value: itemprice / line.qty   //单价
                        });

                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: itemprice
                        });
                  
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_aio_origianl_amount',
                            value: itemprice
                        });
                        /** 设置订单含税 */
                        if (p.salesorder_if_taxed && i.tax_item && line.item_tax) {
                            log.debug('18item taxcode:' + typeof (i.tax_item), i.tax_item);
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                value: i.tax_item
                            });
                            // if (country != "US" && country != "CA") {
                            //     ord.setCurrentSublistValue({
                            //         sublistId: 'item',
                            //         fieldId: 'tax1amt',
                            //         value: line.item_tax ? line.item_tax : 5
                            //     });
                            //     log.debug('19item tax1amt', line.item_tax);
                            // }
                        } else {
                            log.debug('20item taxcode', i.tax_item);
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                // value: i.tax_item ? i.tax_item : 5 // 5 无税
                                value: i.tax_item ? i.tax_item : 6 // 5 无税
                            });

                        }
                        /** 设置0单价商品 */
                        if (p.if_zero_price) {
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'rate',
                                value: 0
                            });
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: 0
                            });
                        }
                        shipping_cost += line.shipping_price + line.shipping_tax;
                        discount_rate += Number(line.shipping_discount) + Number(line.promotion_discount);

                        try {
                            ord.commitLine({
                                sublistId: 'item'
                            });
                            log.debug(externalid, externalid + " | \u884C\u4FE1\u606F\u63D2\u5165\u6210\u529F! #" + line.order_item_id + " * " + line.qty);
                        } catch (err) {
                            err.push(err)
                            error_message.push("Item Line Error: " + err + ". Associated SKU: " + line.seller_sku + ";");
                            throw "Item Line Error: " + err + ". Associated SKU: " + line.seller_sku + ";";
                        }
                    });

                    log.debug('o.order_total.amount:' + typeof (o.order_total.amount), o.order_total.amount);
                    ord.setValue({
                        fieldId: 'amount',
                        value: o.order_total.amount
                    });
                    //  log.debug('27amount', o.order_total.amount);
                    ord.setValue({
                        fieldId: 'shipcarrier',
                        value: 'nonups'
                    });
                    if (o.shipping_address) {
                        ord.setValue({
                            fieldId: 'shipcountrycode',
                            value: o.shipping_address.country_code
                        });
                    }
                    if (o.shipping_address) {
                        ord.setValue({
                            fieldId: 'shipzip',
                            value: o.shipping_address.postal_code
                        });
                    }

                    ord.setValue({
                        fieldId: 'custbody_aio_marketplaceid',
                        value: 1 /* amazon */
                    });
                    log.debug('30 amazon_account_id:' + typeof (amazon_account_id), amazon_account_id);
                    ord.setValue({
                        fieldId: 'custbody_aio_account',
                        value: Number(amazon_account_id)
                    });
                    ord.setText({
                        fieldId: 'trandate',
                        text:  order_trandate
                    });
                    ord.setValue({
                        fieldId: 'custbody_order_locaiton',//订单店铺
                        value: Number(amazon_account_id)
                    });
                       //设置亚马逊订单状态
                    ord.setValue({
                        fieldId: 'custbody_amazon_order_status',
                        value: ord_status[o.order_status]
                    });
                      //设置订单的类型 AFN/MFN
                    ord.setValue({
                        fieldId: 'custbody_order_type',
                        value: ord_type[o.fulfillment_channel]   
                    });
                    ord.setValue({
                        fieldId: 'custbody_sotck_account',  //发货店铺
                        value: Number(amazon_account_id)
                    });
                    ord.setValue({
                        fieldId: 'custbody_aio_api_content',
                        value: JSON.stringify(o)
                    });


                    log.debug('31-1order_location', order_location);
                    if (o.fulfillment_channel == 'MFN') {
                        // 仓库优选
                        var ship_loca_id = loactionPre.locationPreferred(amazon_order_id);
                        if (ship_loca_id) {
                            order_location = ship_loca_id;
                        }
                    }
                    log.debug('31-2order_location', order_location);
                    ord.setValue({
                        fieldId: 'location',
                        value: order_location
                    });

                    var con_per = searchCusContactPerson(o, customer)

                    // 设置联系人
                    if (con_per) {
                        ord.setValue({
                            fieldId: 'custbody_dps_order_contact',
                            value: con_per
                        });
                    }

                    for (var field_id in core.consts.fieldsMapping._LIST_ORDERS_.mapping) {
                        ord.setValue({
                            fieldId: field_id,
                            value: o[core.consts.fieldsMapping._LIST_ORDERS_.mapping[field_id]]
                        });
                    }
                    if (error_message.length) {
                        log.debug('error_message', error_message.length);
                        var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + error_message.join('\n'), interfun.getFormatedDate("", "", order_trandate).date);
                        log.debug(externalid, externalid + " | \u5305\u542B\u9519\u8BEF\u4FE1\u606F\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
                    } else {
                        try {
                            /** 设置是AIO进单 */
                            ord.setValue({
                                fieldId: 'custbody_aio_is_aio_order',
                                value: true
                            });

                            // set fulfillment channel
                            ord.setValue({
                                fieldId: 'custbody_aio_s_fulfillment_channel',
                                value: fulfillment_channel
                            });

                            // set purchase_date
                            ord.setValue({
                                fieldId: 'custbody_aio_s_p_date',
                                value: o.purchase_date
                            });

                            // set LAST UPDATE DATE
                            ord.setValue({
                                fieldId: 'custbody_aio_s_l_u_date',
                                value: o.last_update_date
                            });


                            // set payment status
                            if (pay_ord) {
                                ord.setValue({
                                    fieldId: 'custbody_payment_state',
                                    value: pay_ord
                                })
                            }


                            // set PLATFORM ORDER STATUS
                            ord.setValue({
                                fieldId: 'custbody_aio_s_order_status',
                                value: o.order_status
                            });

                            // set SALES CHANNEL
                            ord.setValue({
                                fieldId: 'custbody_aio_s_sales_channel',
                                value: o.sales_channel
                            });
                            // set EARLIEST SHIP DATE
                            ord.setValue({
                                fieldId: 'custbody_aio_s_earliest_ship_date',
                                value: o.earliest_ship_date
                            });

                            // set order type 
                            ord.setValue({
                                fieldId: 'custbody_aio_s_order_type',
                                value: o.order_type
                            });

                            // set order item info 
                            ord.setValue({
                                fieldId: 'custbody_dps_amazonorder_iteminfo',
                                value: JSON.stringify(line_items) ? JSON.stringify(line_items) : ''
                            });

                            log.debug('ord', ord);
                            var soId = ord.save({
                                ignoreMandatoryFields: true
                            });
                            log.debug('订单生成成功', soId);

                            if (o.fulfillment_channel == 'MFN') {
                                //     // 创建相应的发货记录
                                //     var ful_rec = createFulfillmentRecord(soid, itemAry);
                                //     log.audit('发运记录生成成功', ful_rec);
                            }

                            /** 删除CACHE记录 */
                            mark_resolved(amazon_account_id, o.amazon_order_id);
                            /** 删除Missing Order的记录如果存在 */
                            search.create({
                                type: 'customrecord_aio_connector_missing_order',
                                filters: [{
                                    name: 'externalid',
                                    operator: 'is',
                                    values: externalid
                                }]
                            }).run().each(function (rec) {
                                record.submitFields({
                                    type: core.ns.connector_missing_order._name,
                                    id: rec.id,
                                    values: {
                                        'custrecord_aio_missing_order_is_resolved': true,
                                        'custrecord_aio_missing_order_resolving': false,
                                    }
                                });
                                return true;
                            });
                        } catch (err) {
                            err.push(err)
                            log.error("SO Error: ", err)
                            var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, "SO Error: " + err, interfun.getFormatedDate("", "", order_trandate).date);

                            log.debug(externalid, externalid + " | \u8BA2\u5355\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
                        }
                    }
                } catch (err) {
                    log.debug(externalid, externalid + " | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
                    log.error("error message:", amazon_account_id + "," + o.amazon_order_id + "," + itemAry + "System Error: " + err)
                    var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + "System Error: " + err, order_trandate);

                    err.push(err)
                    record.submitFields({
                        type: 'customrecord_aio_order_import_cache',
                        id: obj.rec_id,
                        values: {
                            'custrecord_aio_cache_version': Number(version) + 1
                        }
                    });
                    log.debug(externalid, externalid + " | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
                }

                if (err.length > 0) {
                    return "fail:" + o.amazon_order_id;
                } else {
                    //makeresovle('journalvoucher', orderid, pr_store);
                    return "success:" + o.amazon_order_id
                }
           
        })
        var DET = new Date().getTime() - startT
        return "success: " + orderid + ", 耗时：" + DET
        } catch (e) {
            log.error("e", e);
            return "failer:" + orderid + ", error->" + e
        }
    }
    /**
    * 创建订单联系人
    * @param {*} o 
    * @param {*} consumer_id 
    */
    function searchCusContactPerson(o, consumer_id) {

        var c_id

        var o_name = o.shipping_address.name ? o.shipping_address.name : (o.buyer_name ? o.buyer_name : (o.buyer_email.split('@')[0]))

        try {
            var files = [
                {
                    name: 'name',
                    operator: 'is',
                    values: o_name
                },
                {
                    name: 'custrecord_cc_country',
                    operator: 'is',
                    values: o.shipping_address.country_code
                },
            ]
            if (o.shipping_address.address_line1)
                files.push({
                    name: 'custrecord_cc_addr1',
                    operator: 'is',
                    values: o.shipping_address.address_line1
                })
            search.create({
                type: 'customrecord_customer_contact',
                filters: files

            }).run().each(function (rec) {
                c_id = rec.id;
                return false;
            });

        } catch (error) {
            log.audit('search error', error)
        }

        if (o.shipping_address && o.buyer_email) {

            var names

            if (o.shipping_address.name) {
                names = o.shipping_address.name.split(' ').filter(function (n) {
                    return n != '';
                });
            }

            if (o.buyer_name) {
                names = o.buyer_name.split(' ').filter(function (n) {
                    return n != '';
                });
            } else {
                names = o.buyer_email.split(' ').filter(function (n) {
                    return n != '';
                });
            }
            var c = record.create({
                type: 'customrecord_customer_contact',
                isDynamic: true
            });
            c.setValue({
                fieldId: 'name',
                value: o.shipping_address.name ? o.shipping_address.name : (o.buyer_name ? o.buyer_name : (o.buyer_email.split('@')[0]))
            });
            c.setValue({
                fieldId: 'custrecord_cc_first_name',
                value: names[0]
            });
            c.setValue({
                fieldId: 'custrecord_cc_last_name',
                value: names[1]
            });
            // c.setValue({ fieldId: 'custrecord_cc_phone_number', value: data.default_address.phone });
            c.setValue({
                fieldId: 'custrecord_cc_entity',
                value: consumer_id
            });
            c.setValue({
                fieldId: 'custrecord_cc_email',
                value: o.buyer_email
            });
               //设置国家名称
               if( o.shipping_address.country_code){
                search.create({
                    type:"customrecord_country_code",
                    filters:[
                        {name:"custrecord_cc_country_code",operator:"is",values:o.shipping_address.country_code}
                    ]
                }).run().each(function(e){
                    c.setValue({
                        fieldId: 'custrecord_dps_cc_country',
                        value:e.id
                    });
                });
            }
            //设置联系人类型
            c.setValue({
                fieldId: 'custrecord_cc_type',
                value:1  //默认C端客户
            });
            c.setValue({
                fieldId: 'custrecord_cc_country',
                value: o.shipping_address.country_code
            });
            c.setValue({
                fieldId: 'custrecord_cc_state',
                value: o.shipping_address.state_or_oegion.slice(0, 30)
            });
            c.setValue({
                fieldId: 'custrecord_cc_ctiy',
                value: o.shipping_address.city
            });
            c.setValue({
                fieldId: 'custrecord_cc_addr1',
                value: o.shipping_address.address_line1
            });
            c.setValue({
                fieldId: 'custrecord_cc_addr2',
                value: o.shipping_address.address_line2
            });
            c.setValue({
                fieldId: 'custrecord_cc_zip',
                value: o.shipping_address.postal_code
            });
            c_id = c.save();
        }

        return c_id

    }
    var mark_missing_order = function (externalid, account_id, order_id, reason, purchase_date) {
        var mo;
        search.create({
            type: 'customrecord_aio_connector_missing_order',
            filters: [{
                name: 'externalid',
                operator: 'is',
                values: externalid
            }]
        }).run().each(function (rec) {
            mo = record.load({
                type: 'customrecord_aio_connector_missing_order',
                id: rec.id
            });
            return false;
        });
        if (!mo) {
            mo = record.create({
                type: 'customrecord_aio_connector_missing_order',
                isDynamic: true,
            });
        }
        mo.setValue({
            fieldId: 'externalid',
            value: externalid
        });
        mo.setValue({
            fieldId: 'custrecord_aio_missing_order_account',
            value: account_id
        });
        mo.setValue({
            fieldId: 'custrecord_aio_missing_order_marketplace',
            value: 1 /* amazon */
        });
        mo.setValue({
            fieldId: 'custrecord_aio_missing_order_po_check_no',
            value: order_id
        });
        mo.setValue({
            fieldId: 'custrecord_aio_missing_order_reason',
            value: reason
        });
        mo.setText({
            fieldId: 'custrecord_purchase_date_missing',
            text: purchase_date
        });
        mo.setValue({
            fieldId: core.ns.connector_missing_order.missing_order_is_resolved,
            value: false
        });
        mo.setValue({
            fieldId: core.ns.connector_missing_order.missing_order_resolving,
            value: false
        });
        return mo.save();
    };

    var mark_resolved = function (amazon_account_id, amazon_order_id) {
        log.debug('mark_resolved', 'mark_resolved');
        search.create({
            type: 'customrecord_aio_order_import_cache',
            filters: [{
                name: 'custrecord_aio_cache_acc_id',
                operator: search.Operator.ANYOF,
                values: amazon_account_id
            },
            {
                name: 'custrecord_aio_cache_order_id',
                operator: search.Operator.IS,
                values: amazon_order_id
            },
            ],
            columns: ['custrecord_aio_cache_version']
        }).run().each(function (r) {
            var ver = r.getValue('custrecord_aio_cache_version')
            record.submitFields({
                type: 'customrecord_aio_order_import_cache',
                id: r.id,
                values: {
                    'custrecord_aio_cache_resolved': true,
                }
            });
            return true;
        });
    };

    function timeOffset(dateStr, zone) {
        //log.error("offset",dt.getTimezoneOffset());
        log.audit("timeOffset dateStr", dateStr);
        var a = dateStr.split(':');
        var b = a[a.length - 1];
        if (b.length < 7) {
            b = b.split('Z')[0] + '.000Z';
        }
        dateStr = a[0] + ':' + a[1] + ':' + b;
        log.audit("timeOffset dateStr22222", dateStr);
        var dt = new Date(dateStr);
        log.audit("timeOffset date", dt);
        log.audit("offset", dt.getTimezoneOffset());
        var timestamp = dt.getTime();
        //log.error("offset2",new Date(timestamp+3600*1000*zone).getTimezoneOffset());
        return new Date(timestamp + 3600 * 1000 * zone);
    }
    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
