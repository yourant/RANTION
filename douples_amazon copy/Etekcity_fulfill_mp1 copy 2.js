/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript 
 */
define(["N/format", "N/runtime", 'N/search', 'N/record', './Helper/Moment.min.js'],
    function (format, runtime, search, record, moment) {
        const MissingReportType = "1" //Missing report 发货报告
        const EU_corr = {
            "34": ["34", "20", "21", "22", "23", "24"],
            "35": ["35", "10", "11", "12", "13", "14"],
        }

        function getInputData() {
            var startT = new Date().getTime()
            var limit = 500,
                orders = []

            var acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_if_account'
            });
            // var acc = 8
            var orderid = runtime.getCurrentScript().getParameter({
                name: 'custscript_amazon_orderid'
            });

            var fils = []
            fils.push(search.createFilter({
                name: 'custrecord_fulfill_in_ns',
                operator: "is",
                values: "F"
            }));
            // fils.push(search.createFilter({ name: 'internalidnumber', operator: "equalto", values: 50977 }));
            fils.push(search.createFilter({
                name: 'custrecord_shipment_date',
                operator: "within",
                values: ["2020年2月1日", "2020年2月29日"]
            }));
            acc ? fils.push(search.createFilter({
                name: 'custrecord_shipment_account',
                operator: search.Operator.IS,
                values: acc
            })) : ""
            orderid ? fils.push(search.createFilter({
                name: 'custrecord_amazon_order_id',
                operator: search.Operator.IS,
                values: orderid
            })) : ""
            log.debug("filters", JSON.stringify(fils))
            search.create({
                type: 'customrecord_amazon_sales_report',
                filters: fils,
                columns: [{
                        name: 'custrecord_quantity_shipped'
                    },
                    {
                        name: 'custrecord_shipment_date_text'
                    },
                    {
                        name: 'custrecord_shipment_id'
                    },
                    {
                        name: 'custrecord_shipment_item_id'
                    },
                    {
                        name: 'custrecord_sku'
                    },
                    {
                        name: 'custrecord_shipment_account'
                    },
                    {
                        name: "custrecord_amazon_order_item_id"
                    }, // order item id
                    {
                        name: 'custrecord_amazon_order_id'
                    }
                ]
            }).run().each(function (e) {
                orders.push({
                    "reporid": e.id,
                    "report_acc": e.getValue("custrecord_shipment_account"),
                    "order_id": e.getValue("custrecord_amazon_order_id"),
                    "ship_sku": e.getValue("custrecord_sku"),
                    "ship_qty": e.getValue("custrecord_quantity_shipped"),
                    "order_itemid": e.getValue("custrecord_amazon_order_item_id"),
                    "shipment_id": e.getValue("custrecord_shipment_id"),
                    "shipment_item_id": e.getValue("custrecord_shipment_item_id"),
                    "shipDate_text": e.getValue("custrecord_shipment_date_text")
                })
                return --limit > 0
            })

            log.audit("订单总数", orders.length)
            var endmap = new Date().getTime()
            log.debug("000getInputData endTime " + (endmap - startT), new Date().getTime())
            return orders;
        }

        function map(context) {
            var startT = new Date().getTime()
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var date = format.parse({
                value: (moment(new Date().getTime()).format(dateFormat)),
                type: format.Type.DATE
            });
            log.debug("map startTime", startT)
            var err = [],
                acc, transactionType
            try {
                transactionType = "fulfillment"
                var so_id
                var obj = JSON.parse(context.value)
                var shipDate_text = obj.shipDate_text,
                    report_acc = obj.report_acc,
                    ship_sku = obj.ship_sku,
                    order_id = obj.order_id,
                    ship_qty = obj.ship_qty,
                    shipment_id = obj.shipment_id,
                    shipment_item_id = obj.shipment_item_id,
                    order_itemid = obj.order_itemid
                repid = obj.reporid;
                if (report_acc == 34 || report_acc == 35) report_acc = EU_corr[report_acc]
                search.create({
                    type: record.Type.SALES_ORDER,
                    filters: [{
                            name: 'poastext',
                            operator: 'is',
                            values: order_id
                        },
                        {
                            name: 'custbody_pr_store',
                            operator: 'anyof',
                            values: report_acc
                        },
                        {
                            name: "status",
                            operator: "anyof",
                            values: ["SalesOrd:A", "SalesOrd:B", "SalesOrd:E", "SalesOrd:D"]
                        },
                        {
                            name: 'mainline',
                            operator: 'is',
                            values: true
                        }
                    ],
                    columns: [{
                        name: "statusref"
                    }]
                }).run().each(function (rec) {
                    log.debug("statusref:", rec.getValue("statusref"))
                    so_id = rec.id
                })
                if (so_id) {
                    var so = record.load({
                        type: 'salesorder',
                        id: so_id
                    })
                    log.debug("soid：" + so_id + "tranid:" + so.getValue("tranid"), order_id)
                    acc = so.getValue('custbody_pr_store')
                    if (so.getValue('orderstatus') == 'A') { //先批准
                        log.audit("orderstatus " + so.getValue('orderstatus'), "先批准")
                        record.submitFields({
                            type: record.Type.SALES_ORDER,
                            id: so_id,
                            values: {
                                orderstatus: 'B'
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }

                    var ful_rs = fullfillment(so_id, shipDate_text, ship_sku, ship_qty, repid, order_id, shipment_id, shipment_item_id, order_itemid) //发货
                    if (ful_rs.indexOf("不足") > -1) {
                        err.push(ful_rs)
                    }

                } else {
                    log.debug("找不到订单:", order_id)
                    var reason_type, account, so_id;
                    search.create({
                        type: record.Type.SALES_ORDER,
                        filters: [{
                                name: 'poastext',
                                operator: 'is',
                                values: order_id
                            },
                            {
                                name: 'custbody_pr_store',
                                operator: 'anyof',
                                values: report_acc
                            },
                            {
                                name: 'mainline',
                                operator: 'is',
                                values: true
                            }
                        ],
                        columns: [{
                                name: "statusref"
                            },
                            {
                                name: "custbody_pr_store"
                            },
                        ]
                    }).run().each(function (rec) {
                        //log.error("statusref:", rec.getValue("statusref"))
                        so_id = rec.id
                        account = rec.getValue("custbody_pr_store")
                        reason_type = rec.getValue("statusref")
                    })
                    if (reason_type == "fullyBilled") { //已开票，设置为 T
                        reason_type = "T"
                    } else if (reason_type == "pendingBilling") { //待开票状态，直接开票
                        var AMERICA_date = format.format({
                            value: moment.utc(shipDate_text).toDate(),
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_LOS_ANGELES
                        })
                        createInvioce(so_id, AMERICA_date, account, shipment_id, shipment_item_id);
                        reason_type = "T"
                        // reason_type = "SO:"+reason_type
                    } else if (!reason_type) { //不存在销售订单 NSO
                        reason_type = "NSO"
                    }
                    record.submitFields({
                        type: "customrecord_amazon_sales_report",
                        id: repid,
                        values: {
                            custrecord_fulfill_in_ns: reason_type
                        }
                    })
                    createMissingReportRec(MissingReportType, orderid, "发货时，发货报告找不到销售订单", acc)
                    // var moId = createSOTRMissingOrder("unfound-ship", order_id,"发货报告找不到订单", date, acc);
                    log.debug("找不到订单，计入missing order")
                }
            } catch (e) {
                log.error(" error ：" + order_id, e)
                err.push(e)
            }
            log.debug("000map endTime", new Date().getTime() - startT)

            //创建missorder
            if (err.length > 0) {
                var moId = createSOTRMissingOrder(transactionType, order_id, JSON.stringify(err), date, acc);
                log.debug("出现错误，已创建missingorder" + moId);
            } else {
                delMissingReportRec(MissingReportType, orderid, "发货时，发货报告找不到销售订单", acc)
                makeresovle(transactionType, order_id, acc)
            }
        }

        /**
         * 发货问题记录
         * @param {*} type 
         * @param {*} orderid 
         * @param {*} acc 
         */
        function TakeNote(acc, orderid, location, newsku, msku, qty) {
            var recs
            search.create({
                type: 'customrecord_fuifillment_itemrec',
                filters: [{
                        name: 'custrecord_fulfillment_store',
                        operator: 'is',
                        values: acc
                    },
                    {
                        name: 'custrecord_fulfillmentrec_orderid',
                        operator: 'is',
                        values: orderid
                    },
                    {
                        name: 'custrecord_fulfillment_location',
                        operator: 'is',
                        values: location
                    },
                    {
                        name: 'custrecord_fulfillment_qty',
                        operator: 'is',
                        values: qty
                    },
                    {
                        name: 'custrecord_fulfillment',
                        operator: 'is',
                        values: msku
                    },
                    {
                        name: 'custrecord_fulfillment_newsku',
                        operator: 'is',
                        values: newsku
                    }
                ]
            }).run().each(function (rec) {
                recs = record.load({
                    type: "customrecord_fuifillment_itemrec",
                    id: rec.id
                })
            })
            if (!recs) {
                recs = record.create({
                    type: "customrecord_fuifillment_itemrec"
                })
                recs.setValue({
                    fieldId: 'custrecord_fulfillment_store',
                    value: acc
                });
                recs.setValue({
                    fieldId: 'custrecord_fulfillmentrec_orderid',
                    value: orderid
                });
                recs.setValue({
                    fieldId: 'custrecord_fulfillment_location',
                    value: location
                });
                recs.setValue({
                    fieldId: 'custrecord_fulfillment_qty',
                    value: qty
                });
                recs.setValue({
                    fieldId: 'custrecord_fulfillment',
                    value: msku
                });
                recs.setValue({
                    fieldId: 'custrecord_fulfillment_newsku',
                    value: newsku
                });
                recs.save()
            }
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

        function fullfillment(so_id, shipdate, ship_sku, qty, rei, order_id, shipment_id, shipment_item_id, order_itemid) {
            var so = record.load({
                type: 'salesorder',
                id: so_id
            })
            var location = so.getValue("location")
            var ord_sta = so.getValue("orderstatus")
            var ord_stas = so.getValue("status")
            var acc = so.getValue('custbody_pr_store')

            log.audit("fullfillment orderstatus :" + JSON.stringify(ord_sta), "status" + ord_stas)
            if (ord_sta == 'B' || ord_sta == 'E' || ord_sta == 'D') {
                var f = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.ITEM_FULFILLMENT,
                    fromId: Number(so_id)
                });
                log.audit("000000shipDate_text ", JSON.stringify(shipdate))
                var AMERICA_date = format.format({
                    value: moment.utc(shipdate).toDate(),
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_LOS_ANGELES
                })
                log.audit("0000AMERICA_date ", JSON.stringify(AMERICA_date))
                // f.setValue({ fieldId: 'trandate', value:so.getValue('trandate')});
                f.setText({
                    fieldId: 'trandate',
                    text: AMERICA_date
                });
                f.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });
                f.setValue({
                    fieldId: 'custbody_pr_store',
                    value: acc
                });
                // f.setValue({ fieldId: 'custbody_amazon_shipment_id', value: shipment_id });
                f.setValue({
                    fieldId: 'custbody_amaozn_order_iemc',
                    value: order_itemid
                }); //order item id
                // f.setValue({ fieldId: 'custbody_amazon_shipitemid', value: shipment_item_id });

                const lc = f.getLineCount({
                    sublistId: 'item'
                });
                var ful, unrec = [],
                    fulfill_line, fulfill_qty
                for (var ln = 0; ln < lc; ln++) {
                    var n = 0
                    log.debug(" ln = 0  n", n)
                    var quantity = f.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantityremaining',
                        line: ln
                    })
                    var itemid = f.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: ln
                    });
                    var itemtype = f.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemtype',
                        line: ln
                    }); //货品类型
                    if (ful == 'full') { //取消后续的发货 full  :这一天发货报告的发货数量已经发完
                        if (ln == fulfill_line && itemtype == "OthCharge") {
                            continue
                        } else {
                            unrec.push(ln)
                            continue
                        }
                    } else if (ful == 'full_blot') { // full_blot  :这一天发货报告的发货数量还没发完
                        if (ln == fulfill_line && itemtype == "OthCharge")
                            continue
                    } else if (itemtype == 'OthCharge') { // OthCharge  : 费用类型不发
                        unrec.push(ln)
                        continue
                    }
                    var c
                    try {
                        if ((ln + 1) < lc) c = f.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            line: ln + 1
                        }); //货品类型
                    } catch (e) {
                        log.error("cc error", e)
                    }
                    var skuid = getitemID(ship_sku, so.getValue('custbody_pr_store'))
                    log.audit("发货对应的货品信息：", "qty: " + qty + "，ship_sku：" + ship_sku + ",itemid:" + skuid)
                    log.audit("skuid.indexOf(itemid): " + itemid, skuid.indexOf(itemid))
                    if (JSON.stringify(skuid).indexOf(itemid) > -1) {
                        if (quantity < qty) {
                            ful = "full_blot", fulfill_line = ln + 1
                            log.debug("此行货品的剩余数量少于发货报告", quantity + ' ：' + qty)
                            fulfill_qty = quantity
                            qty = qty - quantity
                        } else {
                            ful = "full", fulfill_line = ln + 1
                            fulfill_qty = qty
                        }

                        f.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: fulfill_qty,
                            line: ln
                        });
                        f.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: ln
                        });
                        var res = Inventory_Nunmber(f, ln, Number(fulfill_qty), location, 'so')
                        if (res == "unabel") {
                            var NewSku = getIteminfo(itemid)
                            TakeNote(acc, order_id, location, NewSku, ship_sku, fulfill_qty);
                            record.submitFields({
                                type: "customrecord_amazon_sales_report",
                                id: rei,
                                values: {
                                    custrecord_fulfill_in_ns: 'unabel'
                                }
                            })
                            return "SKU库存不足: " + ship_sku
                        }
                        log.debug("c:itemtype:", c)
                        if (c == 'OthCharge') {
                            f.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: fulfill_qty,
                                line: ln + 1
                            });
                            f.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: location,
                                line: ln + 1
                            });
                        }
                    } else {
                        log.debug("这行不发货，记起来 :" + ln, JSON.stringify(unrec))
                        unrec.push(ln)
                    }
                }
                log.debug("ful::", ful);
                log.debug("unrec::", JSON.stringify(unrec));
                //不用发货
                unrec.map(function (l) {
                    f.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: false,
                        line: l
                    });
                })

                if (ful == "full") {
                    var ss = f.save({
                        ignoreMandatoryFields: true
                    });
                    log.audit('发货成功', ss);

                    // 自动开票
                    if (ss)
                        createInvioce(so_id, AMERICA_date, so.getValue('custbody_pr_store'), order_itemid);

                    record.submitFields({
                        type: "customrecord_amazon_sales_report",
                        id: rei,
                        values: {
                            custrecord_fulfill_in_ns: 'T'
                        }
                    })
                } else {
                    log.debug("不满足发货条件 qty:" + qty, "发货报告ID:" + rei)
                }
            } else {
                log.debug("该订单已发完", so_id)
                record.submitFields({
                    type: "customrecord_amazon_sales_report",
                    id: rei,
                    values: {
                        custrecord_fulfill_in_ns: 'T'
                    }
                })
            }
            return "OK"
        }


        /**
         * 拿到新SKU ，记入missingorder
         */
        function getIteminfo(itemid) {
            var itemN
            search.create({
                type: 'item',
                filters: [{
                    name: "internalidnumber",
                    operator: "equalto",
                    values: [itemid]
                }],
                columns: [{
                        name: 'internalId'
                    },
                    {
                        name: 'itemid'
                    },
                ]
            }).run().each(function (rec) {
                itemN = rec.getValue("itemid")
            });
            return itemN
        }

        function getitemID(sku, amazon_account_id) {
            try {
                var skuid = [];
                log.debug("amazon msku:", sku.trim())
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'custitem_seller_sku',
                        operator: search.Operator.IS,
                        values: sku.trim()
                    }],
                    columns: [{
                        name: 'internalId'
                    }, ]
                }).run().each(function (rec) {
                    skuid.push(rec.id)
                });
                if (skuid.length < 1) {
                    search.create({
                        type: 'item',
                        filters: [{
                            name: 'itemid',
                            operator: search.Operator.IS,
                            values: sku.trim()
                        }],
                        columns: [{
                            name: 'internalId'
                        }, ]
                    }).run().each(function (rec) {
                        skuid.push(rec.id)
                    });
                }
                if (skuid.length < 1) {
                    search.create({
                        type: 'item',
                        filters: [{
                            name: 'custitem_old_code',
                            operator: search.Operator.IS,
                            values: sku.trim()
                        }],
                        columns: [{
                            name: 'internalId'
                        }, ]
                    }).run().each(function (rec) {
                        skuid.push(rec.id)
                    });
                }
                search.create({
                    type: 'customrecord_sku_correspondence',
                    filters: [{
                        name: 'custrecord_sku_c_product_id',
                        operator: search.Operator.IS,
                        values: sku.trim()
                    }, ],
                    columns: [{
                        name: 'custrecord_sku_c_sku'
                    }, ]
                }).run().each(function (rec) {
                    skuid.push(rec.getValue('custrecord_sku_c_sku'))
                    return true
                });
                log.debug("skuid", JSON.stringify(skuid))
                if (skuid.length < 1) {
                    var sku_notes, counts = 0
                    search.create({
                        type: 'customrecord_no_sku_record',
                        filters: [{
                                name: 'custrecord_not_on_sku',
                                operator: 'is',
                                values: sku.trim()
                            },
                            {
                                name: 'custrecord_account',
                                operator: 'is',
                                values: amazon_account_id
                            }
                        ],
                        columns: [{
                            name: 'custrecord_total_orders'
                        }]
                    }).run().each(function (e) {
                        counts = e.getValue("custrecord_total_orders")
                        sku_notes = record.load({
                            type: 'customrecord_no_sku_record',
                            id: e.id
                        })
                    })
                    if (!sku_notes) {
                        sku_notes = record.create({
                            type: "customrecord_no_sku_record"
                        })
                    }
                    sku_notes.setValue({
                        fieldId: 'custrecord_not_on_sku',
                        value: sku.trim()
                    })
                    sku_notes.setValue({
                        fieldId: 'custrecord_orderno',
                        value: "Amazon"
                    })
                    sku_notes.setValue({
                        fieldId: 'custrecord_account',
                        value: amazon_account_id
                    })
                    sku_notes.setValue({
                        fieldId: 'custrecord_total_orders',
                        value: Number(counts) + 1
                    })
                    sku_notes.save();
                    log.debug("找不到sku，已记录下来")
                }
            } catch (e) {
                log.error("assemblyitem error :::", e)
            }
            return skuid
        }
        //=====================================================================Inventory_Nunmber分割线==============================================================================

        function Inventory_Nunmber(f, l, quantity, location, type) {
            var item = f.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: l
                }),
                qty = quantity
            var inventorydetail = f.getSublistSubrecord({
                sublistId: 'item',
                fieldId: 'inventorydetail',
                line: l
            });
            var invennumber = [],
                line_count = 0;
            var inven_quantity = 0,
                founded = true;
            search.create({
                type: "inventorynumber",
                filters: [{
                        name: 'item',
                        operator: 'anyof',
                        values: [item]
                    },
                    {
                        name: 'quantityavailable',
                        operator: 'notequalto',
                        values: 0
                    }, //可用数量不为零
                    {
                        name: 'location',
                        operator: 'anyof',
                        values: [location]
                    }
                ],
                columns: [{
                        name: "inventorynumber"
                    },
                    {
                        name: "quantityintransit"
                    },
                    {
                        name: "quantityavailable"
                    }
                ]
            }).run().each(function (e) {
                if (type == 'so' && e.getValue('quantityavailable') != '0') {
                    inven_quantity += Number(e.getValue('quantityavailable'))
                    invennumber.push({
                        inventorynumber_id: e.id,
                        inventorynumber: e.getValue('inventorynumber'),
                        quantityavailable: e.getValue('quantityavailable'),
                        quantityintransit: e.getValue('quantityintransit')
                    })
                } else if (type == 'po' && e.getValue('quantityintransit') != '0') {
                    invennumber.push({
                        inventorynumber_id: e.id,
                        inventorynumber: e.getValue('inventorynumber'),
                        quantityavailable: e.getValue('quantityavailable'),
                        quantityintransit: e.getValue('quantityintransit')
                    })
                }
                if (inven_quantity > qty) founded = false
                return founded
            })
            log.debug("invennumber：" + inven_quantity + ",quantity:" + quantity, JSON.stringify(invennumber))
            if (inven_quantity < quantity) {
                // 可用库存不足，直接创建新的批次
                log.debug("可用库存不足")
                return "unabel"
            } else {
                //可能会有多批次
                for (var i = 0; i < invennumber.length; i++) {
                    log.debug("line_count:", line_count)
                    qty = Number(type == 'so' ? invennumber[i].quantityavailable : invennumber[i].quantityintransit) - Number(qty)
                    if (qty >= 0) {
                        if (type == 'so') {
                            log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'issueinventorynumber',
                                value: invennumber[i].inventorynumber_id,
                                line: line_count
                            });
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: invennumber[i].inventorynumber,
                                line: line_count
                            });
                        } else {
                            log.debug("赋值批次号", invennumber[i].inventorynumber)
                            inventorydetail.setSublistText({
                                sublistId: 'inventoryassignment',
                                fieldId: 'issueinventorynumber',
                                Text: invennumber[i].inventorynumber,
                                line: line_count
                            });
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: invennumber[i].inventorynumber,
                                line: line_count
                            });
                        }
                        inventorydetail.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: line_count == 0 ? quantity : Number(type == 'so' ? invennumber[i].quantityavailable : invennumber[i].quantityintransit) - Number(qty),
                            line: line_count
                        });
                        line_count++;
                        break;
                    } else {
                        qty = 0 - Number(qty)
                        if (type == 'so') {
                            log.debug("赋值批次号ID", invennumber[i].inventorynumber_id)
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'issueinventorynumber',
                                value: invennumber[i].inventorynumber_id,
                                line: line_count
                            });
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: invennumber[i].inventorynumber,
                                line: line_count
                            });
                        } else {
                            log.debug("赋值批次号", invennumber[i].inventorynumber)
                            inventorydetail.setSublistText({
                                sublistId: 'inventoryassignment',
                                fieldId: 'issueinventorynumber',
                                Text: invennumber[i].inventorynumber,
                                line: line_count
                            });
                            inventorydetail.setSublistValue({
                                sublistId: 'inventoryassignment',
                                fieldId: 'receiptinventorynumber',
                                value: invennumber[i].inventorynumber,
                                line: line_count
                            });
                        }
                        inventorydetail.setSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            value: type == 'so' ? invennumber[i].quantityavailable : invennumber[i].quantityintransit,
                            line: line_count
                        });
                        line_count++;
                    }
                }
            }
        }

        function createInvioce(soid, AMERICA_date, acc, order_itemid) {
            // var so = record.load({ type: 'salesorder', id: soid });
            try {
                // var curr_time = new Date(
                var inv = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.INVOICE,
                    fromId: Number(soid),
                });
                inv.setValue({
                    fieldId: 'custbody_pr_store',
                    value: acc
                });
                inv.setValue({
                    fieldId: 'approvalstatus',
                    value: 2
                });
                inv.setText({
                    fieldId: 'trandate',
                    text: AMERICA_date
                });
                f.setValue({
                    fieldId: 'custbody_amaozn_order_iemc',
                    value: order_itemid
                }); //order item id
                var first_save = inv.save();
                log.debug("保存成功“", first_save)
                return first_save
            } catch (e) {
                log.error("error", e);
            }
        }

        function reduce(context) {

        }

        function summarize(summary) {
            log.debug("处理完成")
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });