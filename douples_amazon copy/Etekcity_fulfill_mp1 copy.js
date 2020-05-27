/*
 * @Date           : 2020-04-01 14:47:53
 * @LastEditors    : Li
 * @LastEditTime   : 2020-05-20 22:09:17
 * @Description    : 
 * @FilePath       : \douples_amazon\Etekcity_fulfill_mp1 copy.js
 * @Author         : Li
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@description 根据发货报告履行订单，生成发票
 */
define(["N/runtime", 'N/search', 'N/record', './Helper/Moment.min.js'],
    function (runtime, search, record, moment) {

        function getInputData() {
            var limit = 3,
                orders = [],
                amazon_location_no;
            var acc = runtime.getCurrentScript().getParameter({
                name: 'custscript_if_account'
            });
            var fils = []
            fils.push(search.createFilter({
                name: 'custrecord_fulfill_in_ns',
                operator: search.Operator.IS,
                values: false
            }));
            acc ? fils.push(search.createFilter({
                name: 'custrecord_shipment_account',
                operator: search.Operator.IS,
                values: acc
            })) : ""
            log.debug("filters", JSON.stringify(fils));
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
                        name: 'custrecord_sku'
                    },
                    {
                        name: 'custrecord_amazon_order_id'
                    },
                    // TODO 发货报告中的Amazon 仓库编号 amazon_location_no
                    {
                        name: 'custrecord_fulfillment_center_id'
                    }
                ]
            }).run().each(function (e) {
                orders.push({
                    "reporid": e.id,
                    "order_id": e.getValue("custrecord_amazon_order_id"),
                    "ship_sku": e.getValue("custrecord_sku"),
                    "ship_qty": e.getValue("custrecord_quantity_shipped"),
                    "shipDate_text": e.getValue("custrecord_shipment_date_text"),
                    // amazon location
                    "amazon_location_no": e.getValue('custrecord_fulfillment_center_id')
                })
                return --limit > 0
            })
            log.audit("订单总数", orders.length)
            return orders;
        }

        function map(context) {
            try {
                var so_id
                var obj = JSON.parse(context.value)
                var shipDate_text = obj.shipDate_text,
                    ship_sku = obj.ship_sku,
                    ship_qty = obj.ship_qty,
                    oid = obj.order_id,
                    repid = obj.reporid,
                    amazon_location_no = obj.amazon_location_no;

                // 搜索发货报告对应的 SO
                search.create({
                    type: record.Type.SALES_ORDER,
                    filters: [{
                            name: 'poastext',
                            operator: 'is',
                            values: oid
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
                });

                if (so_id) {
                    var so = record.load({
                        type: 'salesorder',
                        id: so_id
                    });
                    var order_id = so.getValue("otherrefnum");
                    log.debug("soid：" + so_id + "tranid:" + so.getValue("tranid"), order_id);
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

                    // 履行 SO
                    fullfillment(so_id, shipDate_text, ship_sku, ship_qty, repid, amazon_location_no) //发货
                } else {
                    log.debug("找不到订单, 或者该订单已经履行完成", oid)
                }
            } catch (e) {
                log.error(" error ：" + order_id, e)
            }
        }


        /**
         * @description 开始履行订单, 开单
         * @param {*} so_id 
         * @param {*} shipdate 
         * @param {*} ship_sku 
         * @param {*} qty 
         * @param {*} rei 
         * @param {*} amazon_location_no 
         */
        function fullfillment(so_id, shipdate, ship_sku, qty, rei, amazon_location_no) {
            var startTime = new Date().getTime();
            log.audit('fullfillment start', startTime)

            var so = record.load({
                type: 'salesorder',
                id: so_id
            });
            var location = so.getValue("location") ? so.getValue('location') : so.getValue('custbody_dps_body_delivery_location');
            var ord_sta = so.getValue("orderstatus");
            var ord_stas = so.getValue("status");

            var ns_location;
            // 搜索 亚马逊仓库对应系统地点关系表
            search.create({
                type: 'customrecord_dps_amazon_ns_location',
                filters: [{
                    name: 'custrecord_dps_amazon_location_number',
                    operator: 'is',
                    values: amazon_location_no
                }],
                columns: [{
                    name: 'custrecord_dps_netsuite_location'
                }]
            }).run().each(function (rec) {
                // ns_location = rec.getValue('custrecord_dps_netsuite_location');
                location = rec.getValue('custrecord_dps_netsuite_location');
            });

            // 获取销售订单的货品行的数量
            var numLines = so.getLineCount({
                sublistId: 'item'
            });

            var item_arr = []
            for (var ii = 0; ii < numLines; ii++) {
                // 获取货品
                var so_item_id = so.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: ii
                });
                // 获取货品数量
                var so_item_quantity = so.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: ii
                });
                var it = {
                    'so_item_id': so_item_id,
                    'so_item_quantity': so_item_quantity
                }
                item_arr.push(it);

            }

            log.audit("fullfillment orderstatus :" + JSON.stringify(ord_sta), "status" + ord_stas);
            if (ord_sta == 'B' || ord_sta == 'E' || ord_sta == 'D') {
                var f = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.ITEM_FULFILLMENT,
                    fromId: Number(so_id)
                });
                log.audit("shipDate_text ", JSON.stringify(shipdate));
                // f.setValue({ fieldId: 'trandate', value:so.getValue('trandate')});
                f.setValue({
                    fieldId: 'trandate',
                    value: moment.utc(shipdate).toDate()
                });
                f.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });
                f.setValue({
                    fieldId: 'custbody_pr_store',
                    value: so.getValue('custbody_pr_store')
                });

                const lc = f.getLineCount({
                    sublistId: 'item'
                });

                log.debug('lc', lc)
                var ful, unrec = []
                for (var ln = 0; ln < lc; ln++) {
                    var po_item_id = f.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: ln
                    });
                    f.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'location',
                        value: location,
                        line: ln
                    });

                    for (var jj = 0; jj < item_arr.length; jj++) {
                        if (item_arr[jj].so_item_id == po_item_id) {
                            f.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: item_arr[jj].so_item_quantity,
                                line: ln
                            });
                        }
                    }

                }

                var ss = f.save({
                    ignoreMandatoryFields: true
                });
                log.audit('发货成功', ss);
                record.submitFields({
                    type: "customrecord_amazon_sales_report",
                    id: rei,
                    values: {
                        custrecord_fulfill_in_ns: true
                    }
                })
                // 自动开票
                createInvioce(so_id, shipdate, so.getValue('custbody_pr_store'));

                /*
                const lc = f.getLineCount({ sublistId: 'item' });
                var ful, unrec = []
                for (var ln = 0; ln < lc; ln++) {
                    var n = 0
                    log.debug(" ln = 0  n", n)
                    var quantity = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: ln })
                    var itemid = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln });
                    var itemtype = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln });		//货品类型
                    if (ful == 'full') {//取消后续的发货
                        var lo = f.getSublistValue({ sublistId: 'item', fieldId: 'location', line: ln });
                        if ((itemtype == 'OthCharge' && !lo) || itemtype != 'OthCharge')
                            unrec.push(ln)
                        continue
                    }
                    if (itemtype == 'OthCharge') continue
                    var c
                    try {
                        if ((ln + 1) < lc) c = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln + 1 });		//货品类型
                    } catch (e) {
                        log.error("cc error", e)
                    }

                    var skuid = getitemID(ship_sku, so.getValue('custbody_pr_store'))
                    log.audit("qty: " + qty, "ship_sku：" + ship_sku)
                    log.audit("skuid.indexOf(itemid): " + itemid, skuid.indexOf(itemid))
                    if (skuid.indexOf(itemid) > -1) {
                        ful = "full"
                        if (quantity < qty) {
                            log.debug("该货品已发完", ship_sku)
                            record.submitFields({
                                type: "customrecord_amazon_sales_report",
                                id: rei,
                                values: {
                                    custrecord_fulfill_in_ns: true
                                }
                            })
                            return
                        }
                        f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: ln });
                        f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln });

                        // Inventory_Nunmber(f, ln, Number(qty), location, 'so', "", so.getValue('subsidiary'))
                        if (c == 'OthCharge') {
                            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: ln + 1 });
                            f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln + 1 });
                        }
                    }
                }
                log.debug("ful::", ful);
                log.debug("unrec::", JSON.stringify(unrec));
                //不用发货
                unrec.map(function (l) {
                    f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: l });
                })

                if (ful == "full") {
                    var ss = f.save({
                        ignoreMandatoryFields: true
                    });
                    log.audit('发货成功', ss);
                    record.submitFields({
                        type: "customrecord_amazon_sales_report",
                        id: rei,
                        values: {
                            custrecord_fulfill_in_ns: true
                        }
                    })
                    // 自动开票
                    createInvioce(so_id, shipdate, so.getValue('custbody_pr_store'));
                }

                */
            } else {
                log.debug("该订单已发完", so_id)
                record.submitFields({
                    type: "customrecord_amazon_sales_report",
                    id: rei,
                    values: {
                        custrecord_fulfill_in_ns: true
                    }
                })
            }
            log.audit('fullfillment end, 总共耗时：', new Date().getTime() - startTime)

        }


        function getitemID(sku, amazon_account_id) {
            try {
                var skuid = [];
                log.debug("amazon msku:", sku.trim())

                search.create({
                    type: 'customrecord_seller_sku_list',
                    filters: [
                        // { name: 'name', operator: 'is', values: line.VendorSKU }
                        {
                            name: 'custrecord_seller_sku_code',
                            operator: 'is',
                            values: sku.trim()
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
                    skuid.push(rec.id)
                    return false;
                });
                //上面先查关联表，没有货品在直接查货品
                if (skuid.length < 1) {
                    search.create({
                        type: 'item',
                        filters: [{
                            name: 'itemid',
                            operator: 'is',
                            values: sku.trim()
                        }]
                    }).run().each(function (rec) {
                        skuid.push(rec.id)
                        return false;
                    });
                }

            } catch (e) {
                log.error("assemblyitem error :::", e)
            }
            return skuid
        }


        //=====================================================================Inventory_Nunmber分割线==============================================================================
        function Inventory_Nunmber(f, l, quantity, location, type, po, subsidiary) {
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
            var inven_quantity = 0;


            search.create({
                type: "inventorynumber",
                filters: [{
                        name: 'item',
                        operator: 'anyof',
                        values: [item]
                    },
                    //  {name:'isonhand',operator:'is',values:'true'},
                    {
                        name: 'location',
                        operator: 'anyof',
                        values: [location]
                    }
                ],
                columns: [{
                        name: "internalid",
                        sort: "DESC"
                    },
                    {
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
                return false
            })
            log.debug("invennumber：" + inven_quantity + ",quantity:" + quantity, JSON.stringify(invennumber))
            if (inven_quantity < quantity) {
                // 可用库存不足，直接创建新的批次
                log.debug("可用库存不足")
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

        function createInvioce(soid, shipdate, acc) {
            // var so = record.load({ type: 'salesorder', id: soid });
            try {

                var inv = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.INVOICE,
                    fromId: Number(soid),
                });
                inv.setValue({
                    fieldId: 'custbody_pr_store',
                    value: acc
                });
                // inv.setValue({ fieldId: 'approvalstatus', value: 2 });
                inv.setValue({
                    fieldId: 'trandate',
                    value: moment.utc(shipdate).toDate()
                });
                var first_save = inv.save();
                log.debug("保存成功", first_save)

                // }
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