/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@author Doris
 *@description 亚马逊转单脚本/使用MP直接转单
 *@lastupdate 20200305 11:45
 */
define(["N/format", "N/runtime", "./Helper/core.min", "./Helper/CryptoJS.min", "./Helper/Moment.min", "N/log", "N/search",
    "N/record", "N/transaction", "N/encode", "N/https", "N/xml", 'N/config'
], function (format, runtime, core, cryptoJS, moment, log, search, record, transaction, encode, https, xml, config) {

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
            var limit = 1 // 999; //350
            var filters = [{
                    name: 'custrecord_aio_cache_resolved',
                    operator: search.Operator.IS,
                    values: false
                },

                {
                    name: "custrecord_aio_cache_status",
                    operator: "is",
                    values: "Shipped"
                }
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
                        // { name: "custrecord_aio_memo" }
                    ]
                }).run().each(function (rec) {
                    orders.push({
                        rec_id: rec.id,
                        id: account.id,
                        version: rec.getValue({
                            name: "custrecord_aio_cache_version",
                            sort: "ASC"
                        }),
                        currency: account.info.currency,
                        auth: account.auth_meta,
                        info: account.info,
                        extra: account.extra_info,
                        pref: account.preference,
                        country: account.country,
                        customer: account.customer,
                        order: JSON.parse(rec.getValue(rec.columns[2])),
                        iteminfo: rec.getValue('custrecord_amazonorder_iteminfo') ? rec.getValue("custrecord_amazonorder_iteminfo") : "",
                        memo: rec.getValue("custrecord_aio_memo") ? rec.getValue("custrecord_aio_memo") : "",
                        enabled_sites: account.enabled_sites,
                    });
                    return --limit > 0;
                });
            }
        });
        log.debug("orders", orders.length)
        return orders;
    }

    function map(context) {

        var obj = JSON.parse(context.value);
        log.audit('obj', obj)
        var amazon_account_id = obj.id;
        var o = obj.order;
        var a = obj.auth;
        var i = obj.info;
        var e = obj.extra;
        var p = obj.pref;

        var version = obj.version;

        log.error('version', version);


        var cy = obj.currency;
        var country = obj.country;
        var customer = obj.customer;
        var line_items = obj.iteminfo;
        line_items ? line_items = JSON.parse(line_items) : '';
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
        var memo = obj.memo;
        var order_lastupdate = o.last_update_date;
        var enabled_sites = obj.enabled_sites;

        var dateFormat

        log.audit("country:" + typeof (country), JSON.stringify(country))
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


                // 转换成店铺当地时区
                if (enabled_sites == 'AmazonUS') {
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
                        text: format.format({
                            value: endDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
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


                } else if (enabled_sites == 'AmazonUK') {
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
                        text: format.format({
                            value: endDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)
                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, -9),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                } else if (enabled_sites == 'AmazonDE' || enabled_sites == 'AmazonES' || enabled_sites == 'AmazonFR' || enabled_sites == 'AmazonIT') {
                    // 欧洲站点
                    log.audit("amazon_account_id " + amazon_account_id, "欧洲站点");

                    log.debug("endDate777", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text: format.format({
                            value: moment.utc(order_trandate).toDate(),
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_LOS_ANGELES
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)

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
                        text: format.format({
                            // value: endDate,
                            value: moment.utc(order_trandate).toDate(),
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)
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

                ord.setValue({
                    fieldId: 'memo',
                    value: memo
                });

                // 转换成店铺当地时区
                if (enabled_sites == 'AmazonUS') {
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
                        text: format.format({
                            value: endDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, 0),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });
                    log.debug("endDate456", timeOffset(order_lastupdate, 0));


                } else if (enabled_sites == 'AmazonUK') {
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
                        text: format.format({
                            value: endDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)

                    ord.setText({
                        fieldId: 'custbody_dps_local_dt',
                        text: format.format({
                            value: timeOffset(order_lastupdate, -9),
                            type: format.Type.DATETIME,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                } else if (enabled_sites == 'AmazonDE' || enabled_sites == 'AmazonES' || enabled_sites == 'AmazonFR' || enabled_sites == 'AmazonIT') {
                    // 欧洲站点
                    log.audit("amazon_account_id " + amazon_account_id, "欧洲站点");

                    log.debug("endDate777", endDate);
                    ord.setText({
                        fieldId: 'trandate',
                        text: format.format({
                            value: moment.utc(order_trandate).toDate(),
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_LOS_ANGELES
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)
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
                        text: format.format({
                            // value: endDate,
                            value: moment.utc(order_trandate).toDate(),
                            type: format.Type.DATE,
                            timezone: format.Timezone.EUROPE_LONDON
                        })
                    });

                    var local_dt = format.format({
                        value: timeOffset(order_lastupdate, -9),
                        type: format.Type.DATETIME,
                        timezone: format.Timezone.EUROPE_LONDON
                    })
                    log.debug('local_dt', local_dt)
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
                    log.debug('11', 11);
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



                var soId = ord.save({
                    ignoreMandatoryFields: true
                });
                return mark_resolved(amazon_account_id, o.amazon_order_id);
            }
            if (!line_items)
                line_items = core.amazon.getOrderItems(a, o.amazon_order_id);
            log.debug("11line_items", line_items);

            var itemAry = [],
                tax_item_amount = 0,
                num = 0;

            record.submitFields({
                type: 'customrecord_aio_order_import_cache',
                id: obj.rec_id,
                values: {
                    'custrecord_amazonorder_iteminfo': line_items,
                }
            });
            line_items.map(function (line) {
                log.debug("line", line);
                itemAry.push(line.seller_sku);
                if (line.qty == 0) {
                    return;
                }
                var skuid;
                try {

                    search.create({
                        type: 'customrecord_seller_sku_list',
                        filters: [
                            // { name: 'name', operator: 'is', values: line.VendorSKU }
                            {
                                name: 'custrecord_seller_sku_code',
                                operator: 'is',
                                values: line.seller_sku
                            }, //sku
                            {
                                name: 'custrecord_seller_sku_account',
                                operator: 'is',
                                values: amazon_account_id
                            } //店铺ID
                        ],
                        columns: [
                            'custrecord_item_sku'
                        ]
                    }).run().each(function (rec) {
                        skuid = rec.getValue('custrecord_item_sku');
                        return false;
                    });
                    //上面先查关联表，没有货品在直接查货品
                    if (!skuid) {
                        search.create({
                            type: 'item',
                            filters: [{
                                name: 'itemid',
                                operator: 'is',
                                values: line.seller_sku
                            }]
                        }).run().each(function (rec) {
                            skuid = rec.id;
                            return false;
                        });
                    }

                } catch (e) {
                    log.error("assemblyitem error :::", e)
                }
                ord.selectNewLine({
                    sublistId: 'item'
                });
                log.debug('12set skuid', 'skuid:' + skuid + ', cid:' + cid)

                if (!skuid) {
                    throw "找不到货品(SKU): " + line.seller_sku.trim()
                }

                //新增物流费用及关税费  2020-02-19  Elias
                /*--------------------------------------
                try {
                    log.error({
                        title: '获取到的id',
                        details: skuid
                    });
                    var itemRecord = record.load({
                        type: 'lotnumberedassemblyitem',
                        id: skuid
                    });
                    log.error({
                        title: '物流费用新增',
                        details: JSON.stringify(itemRecord)
                    });
                    if (itemRecord) {
                        caculateLogisticFee(itemRecord, ord, line.qty);
                    }
                } catch (e) {
                    log.error({
                        title: '报错信息',
                        details: JSON.stringify(e)
                    });
                }
                //------------------------------------- */

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


                // 欧洲站点 需要扣除货品的税
                var item_price = 0;
                // if (account.enabled_sites == 'AmazonUK' ||
                //     account.enabled_sites == 'AmazonDE' ||
                //     account.enabled_sites == 'AmazonES' ||
                //     account.enabled_sites == 'AmazonFR' ||
                //     account.enabled_sites == 'AmazonIT') {
                //     item_price = line.item_price - line.item_tax
                // } else {
                //     item_price = line.item_price;
                // }

                item_price = line.item_price;
                log.debug('14quantity:' + typeof (line.qty), line.qty)
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: line.qty
                });
                log.debug('15rate', item_price / line.qty)
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: item_price / line.qty
                });
                log.debug('16amount', item_price)
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    value: item_price
                });
                log.debug('17line.item_price', item_price)
                ord.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_aio_origianl_amount',
                    value: item_price
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
                    if (country != "US" && country != "CA") {
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'tax1amt',
                            value: line.item_tax ? line.item_tax : 5
                        });
                        log.debug('19item tax1amt', line.item_tax);
                    }
                } else {
                    log.debug('20item taxcode', i.tax_item);
                    ord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        value: i.tax_item ? i.tax_item : 5 // 5 无税
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
                tax_item_amount = line[core.consts.fieldsMapping._LIST_ORDER_ITEMS_.mapping['custcol_aio_s_item_tax']]
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

                    // add the tax item     3812
                    if (enabled_sites == 'AmazonUS') {
                        // 美国
                        ord.selectNewLine({
                            sublistId: 'item'
                        });
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: 3812
                        });
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: line.qty
                        });
                        ord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            value: tax_item_amount
                        });
                        // ord.setCurrentSublistValue({
                        //     sublistId: 'item',
                        //     fieldId: 'custcol_purchased_application_date',
                        //     value: 1
                        // }); //需求时间
                        ord.commitLine({
                            sublistId: 'item'
                        });

                        /*  暂先屏蔽
                        } else if (account.enabled_sites == 'AmazonUK' ||
                            account.enabled_sites == 'AmazonDE' ||
                            account.enabled_sites == 'AmazonES' ||
                            account.enabled_sites == 'AmazonFR' ||
                            account.enabled_sites == 'AmazonIT') {
                            // 欧洲
                            ord.selectNewLine({
                                sublistId: 'item'
                            });
                            // add the tax item , 
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: 1007
                            });
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: line.qty
                            });
                            ord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                value: tax_item_amount
                            });
                            // ord.setCurrentSublistValue({
                            //     sublistId: 'item',
                            //     fieldId: 'custcol_purchased_application_date',
                            //     value: 1
                            // }); //需求时间
                            ord.commitLine({
                                sublistId: 'item'
                            });
                            */

                    }

                } catch (err) {
                    log.error("selectNewLine error", err)
                }
                //=========================add tax item  end================================
            });

            ord.setValue({
                fieldId: 'memo',
                value: memo
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

            var cus_subsidiary
            search.create({
                type: 'customer',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: customer
                }],
                columns: [{
                    name: 'subsidiary'
                }]
            }).run().each(function (rec) {
                cus_subsidiary = rec.getValue('subsidiary')
            });
            // 店铺下不一定配置有履行的地点, 暂先配置任意一个
            if (cus_subsidiary) {
                // 匹配 店铺客户子公司下 的任意一个仓库
                search.create({
                    type: 'location',
                    filters: [{
                            name: 'subsidiary',
                            operator: 'is',
                            values: cus_subsidiary
                        },
                        // { name: 'custrecord_dps_is_transit', operator: 'is', values: true }
                    ]
                }).run().each(function (rec) {
                    order_location = rec.id;
                    return false;
                });
            }
            log.debug('31order_location', order_location);
            ord.setValue({
                fieldId: 'location',
                value: order_location
            });

            //订单来源 设置为 Amazon 9
            ord.setValue({
                fieldId: 'custbody_dps_order_source',
                value: '9'
            });
            //大小货发运    小货 2
            ord.setValue({
                fieldId: 'custbody_goods_distinguish',
                value: '2'
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

                    // set order item info 
                    ord.setValue({
                        fieldId: 'custbody_dps_amazonorder_iteminfo',
                        value: JSON.stringify(line_items) ? JSON.stringify(line_items) : ''
                    });

                    log.debug('ord', ord);
                    var soId = ord.save({
                        ignoreMandatoryFields: true
                    });

                    log.audit('订单生成成功', soId);
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

                    log.error("SO Error: " + o.amazon_order_id, err)
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
    }

    function reduce(context) {
        log.debug('context======', JSON.stringify(context));

    }

    function summarize(summary) {

    }

    /**
     * 创建订单联系人
     * @param {*} o 
     * @param {*} consumer_id 
     */
    function searchCusContactPerson(o, consumer_id) {

        log.audit('searchCusContactPerson o', o);
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

            var names;

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
                fieldId: 'custrecord_cc_type',
                value: 4
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

    var core1 = {
        handleit: function (acc_id, last_after, last_before) {
            var hid, last_update_date, nextToken, h, orders, cut_token;
            if (last_after && last_before) {
                log.debug("是自定义时间");
                h = record.load({
                    type: 'customrecord_aio_order_import_status',
                    id: 1504
                });
                cut_token = 1504
                hid = 1504
                nextToken = h.getValue('custrecord_nexttoken_cust');
                // last_update_date = rec.getValue(rec.columns[2]);
            } else {
                log.debug("不是自定义时间")
                search.create({
                    type: 'customrecord_aio_order_import_status',
                    filters: [{
                        name: 'custrecord_aio_importer_acc_id',
                        operator: search.Operator.ANYOF,
                        values: acc_id
                    }, ],
                    columns: [
                        /** token */
                        {
                            name: 'custrecord_aio_importer_next_token'
                        },
                        /** Last Updated After */
                        {
                            name: 'custrecord_aio_importer_last_updated_af'
                        },
                        /** Last Updated Before */
                        {
                            name: 'custrecord_aio_importer_last_updated_bf'
                        },
                    ]
                }).run().each(function (rec) {
                    hid = rec.id;
                    h = record.load({
                        type: 'customrecord_aio_order_import_status',
                        id: rec.id
                    });
                    nextToken = rec.getValue(rec.columns[0]);
                    last_update_date = rec.getValue(rec.columns[2]);
                    return false;
                });
            }
            var field_token = cut_token ? 'custrecord_nexttoken_cust' : 'custrecord_aio_importer_next_token';
            log.debug("field_token", field_token)
            if (!last_update_date) {
                last_update_date = moment('2019/10/28 00:00:00').toDate();
            }
            if (hid && nextToken) {
                if (nextToken == '-1') {
                    /** 寮�鍚柊鐨勫崟鎹幏鍙� */
                    log.debug("nextToken::::", nextToken + ",account: " + acc_id)
                    var rtn_1 = core1.listOrders(acc_id, moment().utc(last_update_date).toISOString(), '', last_after, last_before);
                    h.setValue({
                        // fieldId: 'custrecord_aio_importer_next_token',
                        fieldId: field_token,
                        value: rtn_1.token
                    });
                    h.setText({
                        fieldId: 'custrecord_aio_importer_last_updated_af',
                        text: last_update_date
                    });
                    h.setValue({
                        fieldId: 'custrecord_aio_importer_last_updated_bf',
                        value: new Date()
                    });
                    hid = h.save();
                    log.debug("new Date()=====save()", hid)
                    return rtn_1.orders;
                }
                log.audit('last_update_date3', last_update_date);
                log.audit('date3', moment(last_update_date).toISOString());
                var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), nextToken);
                h.setValue({
                    // fieldId: 'custrecord_aio_importer_next_token',
                    fieldId: field_token,
                    value: rtn.token
                });
                hid = h.save();
                log.debug("new Date()=====save()", hid)
                return rtn.orders;
            } else {
                if (!hid) {
                    h = record.create({
                        type: 'customrecord_aio_order_import_status'
                    });
                    h.setValue({
                        fieldId: 'custrecord_aio_importer_acc_id',
                        value: acc_id
                    });
                }
                log.audit('last_update_date2', last_update_date);
                log.audit('date2', moment(last_update_date).toISOString());
                var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), '', last_after, last_before);
                h.setText({
                    fieldId: 'custrecord_aio_importer_last_updated_af',
                    text: last_update_date
                });
                h.setValue({
                    fieldId: 'custrecord_aio_importer_last_updated_bf',
                    value: new Date()
                });
                h.setValue({
                    // fieldId: 'custrecord_aio_importer_next_token',
                    fieldId: field_token,
                    value: rtn.token
                });
                hid = h.save();
                log.debug("new Date()=====save()", hid)
                return rtn.orders;
            }
        },

        listOrders: function (acc_id, last_updated_after, nextToken, last_after, last_before) {
            var orders = [],
                auth = core.amazon.getAuthByAccountId(acc_id);

            if (!last_updated_after) {
                last_updated_after = moment('2019/10/28 00:00:00').toISOString();
            }
            // log.debug("last_after inlist:",last_after)
            // log.debug("last_before inlist:",last_before)
            // log.debug("last_update_date inlist:",last_updated_after)
            // log.audit('listOrder-->auth锛�', auth);
            log.audit('listOrder-->last_updated_after', last_updated_after);

            if (auth) {
                try {
                    log.debug("authauthauthauth  =====", JSON.stringify(auth))
                    var content = void 0;
                    if (nextToken) {
                        content = core.amazon.mwsRequestMaker(auth, 'ListOrdersByNextToken', '2013-09-01', {
                            NextToken: nextToken
                        }, '/Orders/2013-09-01');
                    } else {

                        log.debug("auth", auth)
                        content = core.amazon.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                            'MarketplaceId.Id.1': auth.marketplace_id,
                            'LastUpdatedAfter': last_updated_after,
                            // 'LastUpdatedAfter': "2019-12-20T18:33:09.806Z",
                            // 'CreatedAfter': "2019-12-20T18:33:09.806Z",
                        }, '/Orders/2013-09-01');

                    }

                } catch (e) {
                    log.error("mwsRequestMaker eororooror:", e)
                }
                log.audit('listOrder-->content', content);
                var res = xml.Parser.fromString({
                    text: content
                });
                res.getElementsByTagName({
                    tagName: 'Order'
                }).map(function (node) {
                    orders.push({
                        AccID: acc_id,
                        latest_delivery_date: node.getElementsByTagName({
                            tagName: 'LatestDeliveryDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'LatestDeliveryDate'
                        })[0].textContent : '',
                        latest_ship_date: node.getElementsByTagName({
                            tagName: 'LatestShipDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'LatestShipDate'
                        })[0].textContent : '',
                        order_type: node.getElementsByTagName({
                            tagName: 'OrderType'
                        }).length ? node.getElementsByTagName({
                            tagName: 'OrderType'
                        })[0].textContent : '',
                        purchase_date: node.getElementsByTagName({
                            tagName: 'PurchaseDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'PurchaseDate'
                        })[0].textContent : '',
                        is_replacement_order: node.getElementsByTagName({
                            tagName: 'IsReplacementOrder'
                        }).length ? node.getElementsByTagName({
                            tagName: 'IsReplacementOrder'
                        })[0].textContent == 'true' : false,
                        last_update_date: node.getElementsByTagName({
                            tagName: 'LastUpdateDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'LastUpdateDate'
                        })[0].textContent : '',
                        buyer_email: node.getElementsByTagName({
                            tagName: 'BuyerEmail'
                        }).length ? node.getElementsByTagName({
                            tagName: 'BuyerEmail'
                        })[0].textContent : '',
                        amazon_order_id: node.getElementsByTagName({
                            tagName: 'AmazonOrderId'
                        }).length ? node.getElementsByTagName({
                            tagName: 'AmazonOrderId'
                        })[0].textContent : '',
                        number_of_items_shipped: node.getElementsByTagName({
                            tagName: 'NumberOfItemsShipped'
                        }).length ? node.getElementsByTagName({
                            tagName: 'NumberOfItemsShipped'
                        })[0].textContent : '',
                        ship_service_level: node.getElementsByTagName({
                            tagName: 'ShipServiceLevel'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShipServiceLevel'
                        })[0].textContent : '',
                        order_status: node.getElementsByTagName({
                            tagName: 'OrderStatus'
                        }).length ? node.getElementsByTagName({
                            tagName: 'OrderStatus'
                        })[0].textContent : '',
                        sales_channel: node.getElementsByTagName({
                            tagName: 'SalesChannel'
                        }).length ? node.getElementsByTagName({
                            tagName: 'SalesChannel'
                        })[0].textContent : '',
                        is_business_order: node.getElementsByTagName({
                            tagName: 'IsBusinessOrder'
                        }).length ? node.getElementsByTagName({
                            tagName: 'IsBusinessOrder'
                        })[0].textContent == 'true' : false,
                        number_of_items_unshipped: node.getElementsByTagName({
                            tagName: 'NumberOfItemsUnshipped'
                        }).length ? node.getElementsByTagName({
                            tagName: 'NumberOfItemsUnshipped'
                        })[0].textContent : '',
                        buyer_name: node.getElementsByTagName({
                            tagName: 'BuyerName'
                        }).length ? node.getElementsByTagName({
                            tagName: 'BuyerName'
                        })[0].textContent : '',
                        is_premium_order: node.getElementsByTagName({
                            tagName: 'IsPremiumOrder'
                        }).length ? node.getElementsByTagName({
                            tagName: 'IsPremiumOrder'
                        })[0].textContent == 'true' : false,
                        earliest_delivery_date: node.getElementsByTagName({
                            tagName: 'EarliestDeliveryDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'EarliestDeliveryDate'
                        })[0].textContent : '',
                        earliest_ship_date: node.getElementsByTagName({
                            tagName: 'EarliestShipDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'EarliestShipDate'
                        })[0].textContent : '',
                        marketplace_id: node.getElementsByTagName({
                            tagName: 'MarketplaceId'
                        }).length ? node.getElementsByTagName({
                            tagName: 'MarketplaceId'
                        })[0].textContent : '',
                        fulfillment_channel: node.getElementsByTagName({
                            tagName: 'FulfillmentChannel'
                        }).length ? node.getElementsByTagName({
                            tagName: 'FulfillmentChannel'
                        })[0].textContent : '',
                        payment_method: node.getElementsByTagName({
                            tagName: 'PaymentMethod'
                        }).length ? node.getElementsByTagName({
                            tagName: 'PaymentMethod'
                        })[0].textContent : '',
                        is_prime: node.getElementsByTagName({
                            tagName: 'IsPrime'
                        }).length ? node.getElementsByTagName({
                            tagName: 'IsPrime'
                        })[0].textContent == 'true' : false,
                        shipment_service_level_category: node.getElementsByTagName({
                            tagName: 'ShipmentServiceLevelCategory'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShipmentServiceLevelCategory'
                        })[0].textContent : '',
                        seller_order_id: node.getElementsByTagName({
                            tagName: 'SellerOrderId'
                        }).length ? node.getElementsByTagName({
                            tagName: 'SellerOrderId'
                        })[0].textContent : '',
                        shipped_byamazont_fm: node.getElementsByTagName({
                            tagName: 'ShippedByAmazonTFM'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippedByAmazonTFM'
                        })[0].textContent == 'true' : false,
                        tfm_shipment_status: node.getElementsByTagName({
                            tagName: 'TFMShipmentStatus'
                        }).length ? node.getElementsByTagName({
                            tagName: 'TFMShipmentStatus'
                        })[0].textContent : '',
                        promise_response_due_date: node.getElementsByTagName({
                            tagName: 'PromiseResponseDueDate'
                        }).length ? node.getElementsByTagName({
                            tagName: 'PromiseResponseDueDate'
                        })[0].textContent : '',
                        is_estimated_ship_date_set: node.getElementsByTagName({
                            tagName: 'IsEstimatedShipDateSet'
                        }).length ? node.getElementsByTagName({
                            tagName: 'IsEstimatedShipDateSet'
                        })[0].textContent == 'true' : false,
                        // 娉ㄦ剰锛岃繖閲岀洿鎺ュ彇鐨勪笅涓�灞傦紝鎵�浠ュ彧浼氬彇涓�涓�
                        payment_method_detail: node.getElementsByTagName({
                            tagName: 'PaymentMethodDetail'
                        }).length ? node.getElementsByTagName({
                            tagName: 'PaymentMethodDetail'
                        })[0].textContent : '',
                        payment_execution_detail: node.getElementsByTagName({
                            tagName: 'PaymentExecutionDetail'
                        }).length ? node.getElementsByTagName({
                            tagName: 'PaymentExecutionDetail'
                        })[0].textContent : '',
                        order_total: node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        }).length ? {
                            currency_code: node.getElementsByTagName({
                                tagName: 'OrderTotal'
                            })[0].getElementsByTagName({
                                tagName: 'CurrencyCode'
                            }).length ? node.getElementsByTagName({
                                tagName: 'OrderTotal'
                            })[0].getElementsByTagName({
                                tagName: 'CurrencyCode'
                            })[0].textContent : '',
                            amount: node.getElementsByTagName({
                                tagName: 'OrderTotal'
                            })[0].getElementsByTagName({
                                tagName: 'Amount'
                            }).length ? Number(node.getElementsByTagName({
                                tagName: 'OrderTotal'
                            })[0].getElementsByTagName({
                                tagName: 'Amount'
                            })[0].textContent) : 0,
                        } : {
                            currency_code: '_UNKNOW_',
                            amount: 0
                        },
                        shipping_address: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        }).length ? {
                            city: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'City'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'City'
                            })[0].textContent : '',
                            postal_code: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'PostalCode'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'PostalCode'
                            })[0].textContent : '',
                            state_or_oegion: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'StateOrRegion'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'StateOrRegion'
                            })[0].textContent : '',
                            country_code: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'CountryCode'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'CountryCode'
                            })[0].textContent : '',
                            name: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'Name'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'Name'
                            })[0].textContent : '',
                            address_line1: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'AddressLine1'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'AddressLine1'
                            })[0].textContent : '',
                            address_line2: node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'AddressLine2'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ShippingAddress'
                            })[0].getElementsByTagName({
                                tagName: 'AddressLine2'
                            })[0].textContent : ''
                        } : null,
                    });
                });
                if (res.getElementsByTagName({
                        tagName: 'NextToken'
                    }).length > 0) {
                    return {
                        acc_id: acc_id,
                        orders: orders,
                        token: res.getElementsByTagName({
                            tagName: 'NextToken'
                        })[0].textContent
                    };
                } else {
                    // email.send({
                    //     author: -5,
                    //     recipients: ['18650801765@126.com'],
                    //     bcc: ['mars.zhou@icloud.com'],
                    //     subject: `璁㈠崟瀵煎叆璺戝畬浜哷,
                    //     body: `Account: ${runtime.accountId}<br /><br />Seller ID: ${auth.seller_id}<br /><br />ACC ID: ${acc_id}<br /><br />Last Updated After: ${last_updated_after}`,
                    // });
                    return {
                        acc_id: acc_id,
                        orders: orders,
                        token: '-1'
                    };
                }
            } else {
                throw "\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[" + acc_id + "].";
            }
        },
        getAuthByAccountId: function (account_id) {
            var auth;
            log.audit('account_id', account_id);
            search.create({
                type: 'customrecord_aio_account',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: account_id
                }],
                columns: [{
                        name: 'custrecord_aio_seller_id'
                    },
                    {
                        name: 'custrecord_aio_mws_auth_token'
                    },
                    {
                        name: 'custrecord_aio_aws_access_key_id',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_secret_key_guid',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_amazon_mws_endpoint',
                        join: 'custrecord_aio_enabled_sites'
                    },
                    {
                        name: 'custrecord_aio_amazon_marketplace_id',
                        join: 'custrecord_aio_enabled_sites'
                    },
                ]
            }).run().each(function (rec) {
                auth = {
                    seller_id: rec.getValue(rec.columns[0]),
                    auth_token: rec.getValue(rec.columns[1]),
                    access_id: rec.getValue(rec.columns[2]),
                    sec_key: rec.getValue(rec.columns[3]),
                    end_point: rec.getValue(rec.columns[4]),
                    marketplace_id: rec.getValue(rec.columns[5]),
                };
                return false;
            });
            return auth || false;
        },
        mwsRequestMaker: function (acc_id, auth, action, version, params, resource, body) {
            if (resource === void 0) {
                resource = '/';
            }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = {
                SellerId: encodeURIComponent(auth.seller_id),
                AWSAccessKeyId: encodeURIComponent(auth.access_id),
                Action: encodeURIComponent(action),
                SignatureMethod: encodeURIComponent('HmacSHA256'),
                SignatureVersion: encodeURIComponent('2'),
                Timestamp: timestamp,
                Version: encodeURIComponent(version)
            };
            if (auth.auth_token) {
                query['MWSAuthToken'] = encodeURIComponent(auth.auth_token);
            }
            for (var key in params) {
                if (params[key] != '') {
                    query[key] = encodeURIComponent(params[key]);
                }
            }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function (key) {
                return key + "=" + query[key];
            }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({
                string: hash,
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            }));
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? {
                    'Content-Type': 'text/xml',
                } : {}
            });
            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            log.debug('headers', body ? {
                'Content-Type': 'text/xml',
            } : {});
            log.debug('hashInBase64', hashInBase64);
            log.debug('response', response);
            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    /** MWS閿欒淇℃伅鍗曠嫭鍙戦�� */
                    /*email.send({
                        author: -5,
                        recipients: ['mars.zhou@icloud.com'],
                        subject: 'MWS Request Error',
                        body: "Account: " + runtime.accountId + "<br /><br />Seller ID: " + auth.seller_id + "<br /><br />Action: " + action + "<br /><br />Params: <pre>" + JSON.stringify(params, null, 2) + "</pre><br /><br />Response: " + response.body + "<br /><br />",
                        attachments: body ? [file.create({ name: 'request.payload.xml', fileType: file.Type.XMLDOC, contents: body })] : [],
                    });*/
                    throw acc_id + " MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            return response.body;
        },
    };

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
            ]
        }).run().each(function (r) {
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

    /**
     * 计算物流费
     * @param {*} itemRecord 
     * @param {*} ord 
     * @param {*} quantity 
     */
    var caculateLogisticFee = function (itemRecord, ord, quantity) {
        var cost = itemRecord.getValue('cost');
        var logisticPrice = itemRecord.getValue('custitem_standard_logistic_price');
        var percent = itemRecord.getValue('custitem_tariff_rate');
        var insuranceRate = itemRecord.getValue('custitem_insurance_rate');
        var otherRate = itemRecord.getValue('custitem_other_rate');
        var tariffRate = percent.replace("%", "");
        tariffRate = Number(tariffRate) / 100;
        insuranceRate = insuranceRate.replace('%', '');
        insuranceRate = Number(insuranceRate) / 100;
        otherRate = otherRate.replace('%', '');
        otherRate = Number(otherRate) / 100;
        log.error({
            title: '计算物流费用',
            details: cost + '----' + logisticPrice + '----' + percent
        });
        if (cost) {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_naked_cost_single_price',
                value: cost
            }); //裸成本价格
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_naked_cost_total_price',
                value: Number(cost) * Number(quantity)
            }); //裸成本总价
        } else {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_naked_cost_single_price',
                value: 0.0
            }); //裸成本价格
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_naked_cost_total_price',
                value: 0.0
            }); //裸成本总价
        }
        if (logisticPrice) {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_standard_logistic_price',
                value: logisticPrice
            }); //标准物流价格
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_logistic_total_fee',
                value: Number(logisticPrice).toFixed(2) * Number(quantity)
            }); //物流总价格
        } else {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_standard_logistic_price',
                value: 0.0
            }); //裸成本价格
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_logistic_total_fee',
                value: 0.0
            }); //裸成本总价
        }
        if (tariffRate && cost) {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_tariff_fee',
                value: Number(Number(tariffRate) * Number(cost) * Number(quantity)).toFixed(2)
            }); //裸成本总价
        } else {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_tariff_fee',
                value: 0.0
            }); //裸成本总价
        }
        if (insuranceRate && cost) { //保险费用
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_insurance_fee',
                value: Number(Number(insuranceRate) * Number(cost) * Number(quantity)).toFixed(2)
            });
        } else {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_insurance_fee',
                value: 0.0
            });
        }
        if (otherRate && cost) { //其他费用
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_other_fee',
                value: Number(Number(otherRate) * Number(cost) * Number(quantity)).toFixed(2)
            });
        } else {
            ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_other_fee',
                value: 0.0
            });
        }
    }


    /**
     * 当根据itemid获取不到货品的时候设置默认的值
     * @param {*} ord 
     */
    var setDefaultLogisticFee = function (ord) {
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_naked_cost_single_price',
            value: 0
        }); //裸成本价格
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_naked_cost_total_price',
            value: 0.0
        }); //裸成本总价
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_standard_logistic_price',
            value: 0
        }); //标准物流价格
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_logistic_total_fee',
            value: 0.0
        }); //物流总价格
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_tariff_fee',
            value: 0.0
        }); //裸成本总价
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_insurance_fee',
            value: 0.0
        }); //保险费用
        ord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_other_fee',
            value: 0.0
        }); //其他费用
    }


    function timeOffset(dateStr, zone) {
        //log.error("offset",dt.getTimezoneOffset());
        log.debug("timeOffset dateStr", dateStr);
        var a = dateStr.split(':');
        var b = a[a.length - 1];
        if (b.length < 7) {
            b = b.split('Z')[0] + '.000Z';
        }
        dateStr = a[0] + ':' + a[1] + ':' + b;
        log.debug("timeOffset dateStr22222", dateStr);
        var dt = new Date(dateStr);
        log.debug("timeOffset date", dt);
        log.debug("offset", dt.getTimezoneOffset());
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