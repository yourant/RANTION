/*
 * @Author         : Li
 * @Date           : 2020-05-07 09:41:37
 * @LastEditTime   : 2020-05-19 23:52:27
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \douples_amazon\amazon.orderup_mp1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@author Doris
 *@description 亚马逊抓单脚本/使用MP直接抓单
 *@lastupdate 20200305 11:45
 */
define(["N/format", "N/runtime", "./Helper/core.min", "./Helper/Moment.min", "N/log", "N/search",
    "N/record", "N/transaction", '../Rantion/Helper/location_preferred.js',"./Helper/interfunction.min"
], function (format, runtime, core,  moment, log, search, record, transaction, loactionPre,interfun) {

    const price_conf = {
        "SKU售价": "item_price",
        "收取运费": "shipping_price",
        "促销折扣": "promotion_discount",
        "运费折扣": "shipping_discount",
        "giftwrap": "gift_wrap_price",
    }

    function getInputData() {
        var acc = runtime.getCurrentScript().getParameter({
            name: 'custscript_tr_account'
        });
        var idform = runtime.getCurrentScript().getParameter({
            name: 'custscript_id_from1'
        });
        var idto = runtime.getCurrentScript().getParameter({
            name: 'custscript_id_to1'
        });

        log.debug("acc", acc);
        log.debug("idform", idform);
        log.debug("idto", idto);
        var orders = [];
        core.amazon.getAccountList().map(function (account) {
            var limit = 4000 // 999; //350
            var filters = [{
                    name: 'custrecord_aio_cache_resolved',
                    operator: search.Operator.IS,
                    values: false
                },
                {
                    name: "custrecord_aio_cache_status",
                    operator: "is",
                    values: "Shipped"
                },
                {
                    name: "custrecord_trandate_amazonorder",
                    operator: "within",
                    values: ["1/5/2020","1/6/2020"]
                },
            ];
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

            //如果先了店铺，则只有等于选择的店铺时才查询，如果没有选择店铺，则都进行查询
            if ((acc && account.id == acc) || !acc) {

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
                    ]
                }).run().each(function (rec) {
                    // if (rec.id == 20800) {

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
                        // order: JSON.parse(rec.getValue(rec.columns[2])),
                        order: JSON.parse(rec.getValue('custrecord_aio_cache_body')),
                        iteminfo: rec.getValue('custrecord_amazonorder_iteminfo') ? rec.getValue("custrecord_amazonorder_iteminfo") : "",
                        enabled_sites: account.enabled_sites,
                    });
                    // }

                    return --limit > 0;
                });

                // log.debug('orders', orders)
            }
        });
        log.debug("orders", orders.length);
        return orders;
    }

    function map(context) {
        var startT = new Date().getTime()
        var obj = JSON.parse(context.value);
        return
        log.audit('obj', obj)
        var amazon_account_id = obj.id;
        var o = obj.order;
        var a = obj.auth;
        var i = obj.info;
        var e = obj.extra;
        var p = obj.pref;
        var cy = obj.currency;
        var country = obj.country;
        var ord_formula = obj.ord_formula; //计算公式

        var version = obj.version;

        log.error('version '+ version,"country: "+country);

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

        var order_location = o.fulfillment_channel == 'MFN' ? i.salesorder_location : e.fbaorder_location;
        // var order_trandate = p.if_payment_as_tran_date ? moment.utc(o.purchase_date).toDate() : moment.utc(o.purchase_date).toDate();
        var order_trandate = o.purchase_date;




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
                ord = record.load({
                    type: order_type,
                    id: rec.id,
                    isDynamic: true
                });
                log.debug(externalid, externalid + " | \u8BA2\u5355\u5DF2\u7ECF\u5B58\u5728!");
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
                log.debug('4trandate', order_trandate);

                var enabled_sites_arr = ['AmazonUK', 'AmazonDE', ]

                // 转换成店铺当地时区
                if (enabled_sites == 'Amazon US') {
                    // 美国站点
                    log.audit("amazon_account_id " + amazon_account_id, "美国站点");

                    dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var timeOne = moment(timeOffset(order_trandate, 0)).format(dateFormat);

                    var endDate = format.format({
                        value: timeOne,
                        type: format.Type.DATE
                    });
                    log.debug("endDate123", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text:  interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, 0),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                    log.debug("endDate456", timeOffset(order_lastupdate, 0));


                } else if (enabled_sites == 'Amazon UK') {
                    // 英国站点
                    log.audit("amazon_account_id " + amazon_account_id, "英国站点");

                    dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var timeOne = moment(timeOffset(order_trandate, -9)).format(dateFormat);

                    var endDate = format.format({
                        value: timeOne,
                        type: format.Type.DATE
                    });
                    log.debug("endDate", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text:  interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, -9),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                } else if (enabled_sites == 'Amazon DE' || enabled_sites == 'Amazon ES' || enabled_sites == 'Amazon FR' || enabled_sites == 'Amazon IT') {
                    // 欧洲站点
                    log.audit("amazon_account_id " + amazon_account_id, "欧洲站点");

                    log.debug("endDate777", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text: interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: moment.utc(order_lastupdate).toDate(),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.AMERICA_LOS_ANGELES
                        })
                    });

                } else {
                    // 其他站点
                    log.audit("amazon_account_id " + amazon_account_id, "其他站点");

                    ord.setText({
                        fieldId: 'trandate',
                        text: interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, 0),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                }

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


                // 转换成店铺当地时区
                if (enabled_sites == 'Amazon US') {
                    // 美国站点
                    log.audit("amazon_account_id " + amazon_account_id, "美国站点");

                    dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var timeOne = moment(timeOffset(order_trandate, 0)).format(dateFormat);

                    var endDate = format.format({
                        value: timeOne,
                        type: format.Type.DATE
                    });
                    log.debug("endDate123", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text:interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, 0),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                    log.debug("endDate456", timeOffset(order_lastupdate, 0));


                } else if (enabled_sites == 'Amazon UK') {
                    // 英国站点
                    log.audit("amazon_account_id " + amazon_account_id, "英国站点");

                    dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var timeOne = moment(timeOffset(order_trandate, -9)).format(dateFormat);

                    var endDate = format.format({
                        value: timeOne,
                        type: format.Type.DATE
                    });
                    log.debug("endDate", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text:interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, -9),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                } else if (enabled_sites == 'Amazon DE' || enabled_sites == 'Amazon ES' || enabled_sites == 'Amazon FR' || enabled_sites == 'Amazon IT') {
                    // 欧洲站点
                    log.audit("amazon_account_id " + amazon_account_id, "欧洲站点");

                    log.debug("endDate777", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text: interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: moment.utc(order_lastupdate).toDate(),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.AMERICA_LOS_ANGELES
                        })
                    });

                } else {
                    // 其他站点
                    log.audit("amazon_account_id " + amazon_account_id, "其他站点");

                    ord.setText({
                        fieldId: 'trandate',
                        text: interfun.getFormatedDate("","",order_trandate).date
                    });

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, 0),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                }

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
                /** 行全部清空重新插入 */
                // const line_count = ord.getLineCount({ sublistId: 'item' });
                // for (let i = 0; i < line_count; i++) {
                //     ord.removeLine({ sublistId: 'item', line: i });
                // }
                // 如果单据存在，改完客人后直接推出，不作任何更改




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
            if (!line_items)
                line_items = core.amazon.getOrderItems(a, o.amazon_order_id);
            log.debug("0000011line_items:" + obj.rec_id, line_items);

             record.submitFields({
                type: 'customrecord_aio_order_import_cache',
                id: obj.rec_id,
                values: {
                    'custrecord_amazonorder_iteminfo': JSON.stringify(line_items)
                }
            });
            log.debug("OKokokok:" + obj.rec_id, line_items)
            var itemAry = [],
                tax_item_amount = 0,
                num = 0;

            var amazon_sku;


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
                    search.create({
                        type: 'customrecord_dps_amazon_seller_sku',
                        filters: [{
                                name: 'custrecord_dps_amazon_sku_number',
                                operator: 'is',
                                values:  line.seller_sku.trim()
                            } //sku
                            , { // 存在货品非活动的情况
                                name: 'isinactive',
                                join: 'custrecord_dps_amazon_ns_sku',
                                operator: 'is',
                                values: false
                            },
                            {
                                name: 'custrecord_dps_store',
                                operator: 'anyof',
                                values: amazon_account_id
                            }
                        ],
                        columns: [
                            'custrecord_dps_amazon_ns_sku'
                        ]
                    }).run().each(function (rec) {
                        skuid = rec.getValue('custrecord_dps_amazon_ns_sku');
                        return false;
                    });

                    if(!skuid)
                    search.create({
                        type: 'item',
                        filters: [{
                                name: 'itemid',
                                operator: 'is',
                                values: line.seller_sku.trim()
                            } //sku
                        ],
                    }).run().each(function (rec) {
                        skuid = rec.id;
                    });
                    if (!skuid) {
                        var sku_notes, counts = 0
                        search.create({
                            type: 'customrecord_no_sku_record',
                            filters: [{
                                name: 'custrecord_not_on_sku',
                                operator: 'is',
                                values:  line.seller_sku.trim()
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
                            value: seller_sku
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
                    throw "找不到货品, 或者货品已经非活动了(SKU): " + line.seller_sku.trim();
                }
               
 
                } catch (e) {
                    log.error("assemblyitem error :::", e)
                }
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

                var itemprice = 0,fla_str=""
                for (key in fla) {
                    if (fla[key] == "start") {
                        itemprice = Number(line[key])
                        fla_str += key+""
                    } else {
                        if (fla[key] == "-") {
                            itemprice = itemprice - Number(line[key])
                            fla_str += "-"+key
                        } else if (fla[key] == "+") {
                            fla_str += "+"+key
                            itemprice = itemprice + Number(line[key])
                        }
                    }
                }
                log.debug("组合好的计算公式fla_str:",fla_str)
         
                if (country == "US" || country == "CA") {
                    log.debug('需要加稅tax_item_amount'+tax_item_amount, tax_item_amount+"+"+itemprice)
                    tax_item_amount = line[core.consts.fieldsMapping._LIST_ORDER_ITEMS_.mapping['custcol_aio_s_item_tax']]
                    itemprice +=Number(tax_item_amount)
                }
                log.debug("0000000itemprice:" + itemprice, "原始的货品价格：" + line.item_price) 
               
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: itemprice / line.qty
                });
               
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: itemprice
                });
                log.debug('17line.item_price', line.item_price)
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_aio_origianl_amount',
                    value: itemprice
                });
                // ord.setCurrentSublistValue({
                //     sublistId: 'item',
                //     fieldId: 'custcol_purchased_application_date', //需求时间
                //     value: 1
                // });
                log.audit("tax_item_amount::", line.item_tax + "," + line.shipping_tax)
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

                num++;
                //  log.audit("line[core.consts.fieldsMapping._LIST_ORDER_ITEMS_.mapping['custcol_aio_s_item_tax']]:",line[core.consts.fieldsMapping._LIST_ORDER_ITEMS_.mapping['custcol_aio_s_item_tax']])
                try {
                    ord.commitLine({
                        sublistId: 'item'
                    });
                    log.debug(externalid, externalid + " | \u884C\u4FE1\u606F\u63D2\u5165\u6210\u529F! #" + line.order_item_id + " * " + line.qty);
                } catch (err) {
                    // mark_resolved(amazon_account_id, o.amazon_order_id)
                    error_message.push("Item Line Error: " + err + ". Associated SKU: " + line.seller_sku + ";");
                    throw "Item Line Error: " + err + ". Associated SKU: " + line.seller_sku + ";";
                }
                // ======================add tax item  start==============
                log.audit("tax_item_amount:", tax_item_amount)
                try {

                    // set tax line     56357  不再增加费用货品，增加个税合并到itemprice上
                    // log.debug('amazon_account_id', amazon_account_id + ",country:" + country);
                    // if (country == "US" || country == "CA") {
                    //     ord.selectNewLine({
                    //         sublistId: 'item'
                    //     });
                    //     ord.setCurrentSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'item',
                    //         value: 56357
                    //     });
                    //     ord.setCurrentSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'quantity',
                    //         value: line.qty
                    //     });
                    //     ord.setCurrentSublistValue({
                    //         sublistId: 'item',
                    //         fieldId: 'amount',
                    //         value: tax_item_amount
                    //     });
                    //     ord.commitLine({
                    //         sublistId: 'item'
                    //     });
                    // }
                } catch (err) {
                    log.error("selectNewLine error", err)
                }
                //=========================add tax item  end================================
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
            ord.setValue({
                fieldId: 'custbody_pr_store',
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
                })
            }

            //  for (var field_id in core.consts.fieldsMapping._LIST_ORDERS_.mapping) {
            //     ord.setValue({
            //          fieldId: field_id,
            //          value: o[core.consts.fieldsMapping._LIST_ORDERS_.mapping[field_id]]
            //      });
            //  }
            if (error_message.length) {
                log.debug('error_message', error_message.length);
                var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + error_message.join('\n'), order_trandate);
                log.debug(externalid, externalid + " | \u5305\u542B\u9519\u8BEF\u4FE1\u606F\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
            } else {
                try {
                    /** 设置是AIO进单 */
                    ord.setValue({
                        fieldId: 'custbody_aio_is_aio_order',
                        value: true
                    });
                    ord.setValue({
                        fieldId: 'custbody_is_amazon_order',
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

                    log.error("SO Error: ", err)
                    var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, "SO Error: " + err, order_trandate);

                    log.debug(externalid, externalid + " | \u8BA2\u5355\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
                }
            }
            log.debug('1', 1);
        } catch (err) {
            log.debug(externalid, externalid + " | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
            log.error("error message:", amazon_account_id + "," + o.amazon_order_id + "," + itemAry + "System Error: " + err)
            var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + "System Error: " + err, order_trandate);


            record.submitFields({
                type: 'customrecord_aio_order_import_cache',
                id: obj.rec_id,
                values: {
                    'custrecord_aio_cache_version': Number(version) + 1
                }
            });
            log.debug(externalid, externalid + " | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #" + mid + " order: " + JSON.stringify(o, null, 2));
        }
        log.debug("生成一张单耗时:", new Date().getTime() -startT)
    }

    function reduce(context) {
        log.debug('context======', JSON.stringify(context));

    }

    function summarize(summary) {

    }

    // 发运记录的相关字段
    const fulfillment_record = {
        custrecord_dps_ship_samll_location: 'custrecord_dps_ship_samll_location', //发运仓库  列表 / 记录 地点 是
        custrecord_dps_ship_order_number: 'custrecord_dps_ship_order_number', //订单号  Free - Form文本 是
        custrecord_dps_ship_platform_order_numbe: 'custrecord_dps_ship_platform_order_numbe', //平台订单号  Free - Form文本 是
        custrecord_dps_ship_small_logistics_orde: 'custrecord_dps_ship_small_logistics_orde', //物流运单号  Free - Form文本 是
        custrecord_dps_ship_small_trackingnumber: 'custrecord_dps_ship_small_trackingnumber', //物流跟踪单号  Free - Form文本 是
        custrecord_dps_ship_small_status: 'custrecord_dps_ship_small_status', //状态  列表 / 记录 发运记录发运状态 是
        custrecord_dps_ship_small_sales_platform: 'custrecord_dps_ship_small_sales_platform', //销售平台  Free - Form文本 是
        custrecord_dps_ship_small_account: 'custrecord_dps_ship_small_account', //销售店铺  列表 / 记录 DPS | Connector Account 是
        custrecord_dps_ship_small_sku: 'custrecord_dps_ship_small_sku', //SKU  Free - Form文本 是
        custrecord_dps_ship_small_quantity: 'custrecord_dps_ship_small_quantity', //数量  整数 是
        custrecord_dps_ship_small_destination: 'custrecord_dps_ship_small_destination', //目的地  全文 是
        custrecord_dps_ship_small_recipient: 'custrecord_dps_ship_small_recipient', //收件人  Free - Form文本 是
        custrecord_dps_ship_small_phone: 'custrecord_dps_ship_small_phone', //联系电话  Free - Form文本 是
        custrecord_dps_ship_small_ship_weight: 'custrecord_dps_ship_small_ship_weight', //发货重量  小数 是
        custrecord_dps_ship_small_estimatedfreig: 'custrecord_dps_ship_small_estimatedfreig', //预估运费  小数 是
        custrecord_dps_ship_small_shipping_date: 'custrecord_dps_ship_small_shipping_date', //发运时间  日期 是
        custrecord_dps_ship_small_due_date: 'custrecord_dps_ship_small_due_date', //妥投时间  日期 是
        custrecord_dps_ship_small_channel_dealer: 'custrecord_dps_ship_small_channel_dealer', //渠道商  列表 / 记录 发运方式 是
        custrecord_dps_ship_small_channelservice: 'custrecord_dps_ship_small_channelservice', //渠道服务 Free - Form文本 是
    }


    /**
     * 生成发运记录, 关联销售订单
     * @param {*} soid 
     * @param {*} sku 
     * @returns {*} 返回生成的发运记录的ID, 或者 false;
     */
    function createFulfillmentRecord(soid, sku) {

        var location, item, quantity, api_content, tranid, otherrefnum, account;

        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: soid
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                }
            ],
            columns: ['location', 'item', 'quantity', 'custbody_aio_api_content', 'tranid', 'otherrefnum', 'custbody_pr_store']
        }).run().each(function (rec) {
            location = rec.getValue('location');
            item = rec.getValue('item');
            quantity = rec.getValue('quantity');
            api_content = rec.getValue('custbody_aio_api_content');
            tranid = rec.getValue('trandi');
            otherrefnum = rec.getValue('otherrefnum');
            account = rec.getValue('custbody_pr_store');
        });

        var ful_create_rec = record.create({
            type: 'customrecord_dps_shipping_small_record'
        });


        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_samll_location', //发运仓库 
            value: location
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_order_number', //订单号 
            value: tranid
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_platform_order_numbe', //平台订单号 
            value: otherrefnum
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_status', //状态 
            values: 1
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_sales_platform', //销售平台 
            values: 'Amazon'
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_account', //销售店铺 
            values: account
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_sku', //SKU 
            values: sku[0]
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_quantity', //数量 
            values: quantity
        });

        api_content = JSON.parse(api_content);

        // "shipping_address": {
        //     "city": "Blackfalds",
        //     "postal_code": "T4M 0M3",
        //     "state_or_oegion": "Alberta",
        //     "country_code": "CA",
        //     "name": "Mackenzie Power",
        //     "address_line1": "29 Pinnacle Close",
        //     "address_line2": ""
        //   }

        var city = api_content.shipping_address.city;
        var postal_code = api_content.shipping_address.postal_code;

        var state_or_oegion = api_content.shipping_address.state_or_oegion;

        var country_code = api_content.shipping_address.country_code;
        var name = api_content.shipping_address.name;

        var address_line1 = api_content.shipping_address.address_line1;
        var address_line2 = api_content.shipping_address.address_line2;

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_destination', //目的地 
            value: name + '\n' + address_line1 + '\n' + address_line2 + '\n' + postal_code + '\n' + city + '\n' + state_or_oegion + '\n' + country_code
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_recipient', //收件人 
            value: name
        });

        // ful_create_rec.setValue({
        //     fieldId: 'custrecord_dps_ship_small_phone', //联系电话 
        //     value: '12313'
        // });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_salers_order', // 关联的销售订单
            value: soid
        });

        var ful_create_rec_id = ful_create_rec.save();
        log.audit('发运记录生成成功, ID： ', ful_create_rec_id);

        if (ful_create_rec_id) {
            // custbody_dps_small_fulfillment_record    关联的小货发运记录
            var otherId = record.submitFields({
                type: 'salesorder',
                id: soid,
                values: {
                    'custbody_dps_small_fulfillment_record': ful_create_rec_id
                }
            });
            log.debug('otherId', otherId);
        }

        return ful_create_rec_id || false;
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
            search.create({

                type: 'customrecord_customer_contact',
                filters: [{
                        name: 'name',
                        operator: 'is',
                        values: o_name
                    },
                    {
                        name: 'custrecord_cc_country',
                        operator: 'is',
                        values: o.shipping_address.country_code
                    },
                    {
                        name: 'custrecord_cc_addr1',
                        operator: 'is',
                        values: o.shipping_address.address_line1
                    }
                ]
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
        mo.setValue({
            fieldId: 'custrecord_purchase_date_missing',
            value: purchase_date
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
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});