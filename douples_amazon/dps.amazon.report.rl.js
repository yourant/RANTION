/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-21 14:31:56
 * @LastEditTime   : 2020-09-23 22:36:27
 * @LastEditors    : Li
 * @Description    : 获取报告数据, 并保存  RL
 * @FilePath       : \douples_amazon\dps.amazon.report.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/format', './Helper/core.min', 'N/log', 'N/record', 'N/runtime', './Helper/Moment.min', 'N/search',
    './Helper/interfunction.min'
], function(format, core, log, record, runtime, moment, search, interfun) {


    accArr = [1, 3, 5, 12, 14, 16, 17, 19, 21, 23, 24, 31, 33, 35, 40, 41, 43,
        48, 49, 54, 56, 57, 67, 69, 72, 77, 78, 83, 86, 91, 92, 97, 102, 104, 106,
        111, 113, 115, 117, 118, 120, 122, 127, 129, 134, 136, 138, 143, 145, 148,
        149, 154, 156, 158, 163, 164, 166, 171, 172, 174, 179, 184, 186, 187, 189,
        194, 196, 201, 203, 204, 206, 211, 213, 218, 220, 221, 222, 227, 237, 313,
        314, 315, 321, 323, 324, 341, 415, 618
    ]


    function _post(context) {

        try {
            var report_type = context.reporttype,
                acc = context.acc,
                action = context.action,
                value = context.value;

            log.debug("执行的动作", action);
            log.debug("报告类型", report_type);
            log.debug("店铺", acc);
            log.debug("数据", value);

            if (action == "get_report_date") {

                search.create({
                    type: 'customrecord_dps_li_automatically_execut',
                    filters: [
                        { name: 'isinactive', operator: 'is', values: false },
                        { name: "custrecord_dps_li_get_report", operator: 'is', values: false }
                    ],
                    columns: [
                        "custrecord_dps_auto_execute_account"
                    ]
                }).run().each(function (rec) {
                    acc = rec.getValue("custrecord_dps_auto_execute_account")
                })
                var results = getInputData(report_type, acc, "");

                log.debug("获取数据长度   " + results.length, results);

                var data_dael = searchDate(acc, report_type);

                log.debug('未处理的数据    ' + data_dael.length, data_dael)

                if (results.length == 0 && data_dael.length == 0) {

                    search.create({
                        type: 'customrecord_dps_li_automatically_execut',
                        filters: [{ name: 'custrecord_dps_auto_execute_account', operator: 'anyof', values: acc }]
                    }).run().each(function(_li) {
                        log.debug("_li id", _li.id);
                        record.submitFields({
                            type: 'customrecord_dps_li_automatically_execut',
                            id: _li.id,
                            values: {
                                custrecord_dps_li_get_report: true
                            }
                        });
                    })

                } else {
                    log.debug("else", "else")
                }

                return results;

            } else if (action == "create_report_date") {

                return createRec(value);
            }
        } catch (error) {
            log.error("报错了", error);
            return error;
        }

    }


    /**
     * 搜索对应的未获取的数据的报告请求
     * @param {Number} acc
     * @param {Number} type
     */
    function searchDate(acc, type) {

        var deal_with_arr = [];
        search.create({
            type: "customrecord_aio_amazon_report",
            filters: [{
                    name: "custrecord_aio_origin_account",
                    operator: 'is',
                    values: acc
                },
                {
                    name: "custrecord_aio_origin_report_type",
                    operator: 'is',
                    values: type
                },
                {
                    name: "custrecord_aio_origin_report_id",
                    operator: 'isempty'
                },
                {
                    name: "custrecord_aio_origin_report_request_id",
                    operator: 'isnotempty'
                },
                {
                    name: "custrecord_aio_origin_report_status",
                    operator: 'isnot',
                    values: '_DONE_'
                },
                {
                    name: "custrecord_aio_origin_report_status",
                    operator: 'isnot',
                    values: '_DONE_NO_DATA_'
                },
                {
                    name: "custrecord_aio_origin_report_status",
                    operator: 'isnot',
                    values: '_CANCELLED_'
                }
            ]
        }).run().each(function(rec) {
            deal_with_arr.push(rec.id)
            return true;
        });

        return deal_with_arr;
    }

    /**
     * 获取请求的报告数据
     * @param {Number} report_type   报告的记录 ID
     * @param {Number} stroe  店铺 ID
     */
    function getInputData(report_type, stroe, group_req) {
        var lines = []
        var sum = 0,
            acc_arrys = []
        // listing可以区分站点
        if (report_type == core.enums.report_type._GET_MERCHANT_LISTINGS_ALL_DATA_) {
            acc_arrys = core.amazon.getAccountList(group_req)
        } else {
            acc_arrys = core.amazon.getReportAccountList(group_req)
        }

        log.debug(report_type, '店铺数量:' + acc_arrys.length)
        log.audit('店铺数据', acc_arrys);
        acc_arrys.map(function(account) {
            if (account.id != stroe && stroe) return
            var marketplace = account.marketplace;
            log.audit('account:' + account.id, marketplace);

            var rid = Date.now();
            log.audit('getRequestingReportList', 'getRequestingReportList');
            core.amazon.getRequestingReportList(account, report_type).map(function(r) {
                var rLines = r.lines;
                rLines.map(function(l) {
                    return lines.push({
                        acc_id: account.id,
                        seller_id: account.auth_meta.seller_id,
                        salesorder_location: account.extra_info.fbaorder_location,
                        id: r.id,
                        rid: rid,
                        type: report_type,
                        line: l,
                        firstLine: rLines[0],
                        site_id: account.site_id
                    })
                })

                record.submitFields({
                    type: core.ns.amazon_report._name,
                    id: r.id,
                    values: {
                        'custrecord_aio_origin_report_is_download': true,
                        'custrecord_amazon_report_counts': rLines.length // 本次拉取总数
                    }
                })
                log.error('origion * id： ' + core.ns.amazon_report._name, r)
                log.error('rid+店铺+FBA仓库+数量', rid + '-' + account.id + '-' + account.extra_info.fbaorder_location + '-' + rLines.length)
                if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_ && rLines.length > 0) {
                    if (account.extra_info.fbaorder_location) {
                        reportFlag = true
                        var filters = []
                        filters.push({ name: 'custrecord_fba_update_inventory_account', operator: 'EQUALTO', values: account.id })
                        filters.push({ name: 'custrecord_salesorder_location', operator: 'EQUALTO', values: account.extra_info.fbaorder_location })
                        var updateId
                        var fbaUpdateInventorySearch = search.create({
                            type: 'customrecord_fba_update_inventory',
                            filters: filters,
                            columns: [
                                'custrecord_fba_update_inventory_account',
                                'custrecord_salesorder_location',
                                'custrecord_fba_update_inventory_rid',
                                'custrecord_fba_update_status'
                            ]
                        }).run().each(function(e) {
                            updateId = e.id
                        })
                        var updateInventoryRecord
                        if (!updateId) {
                            updateInventoryRecord = record.create({
                                type: 'customrecord_fba_update_inventory',
                                isDynamic: true
                            })
                        } else {
                            updateInventoryRecord = record.load({
                                type: 'customrecord_fba_update_inventory',
                                id: updateId
                            })
                        }
                        updateInventoryRecord.setValue({
                            fieldId: 'custrecord_fba_update_inventory_account',
                            value: account.id
                        })
                        updateInventoryRecord.setValue({
                            fieldId: 'custrecord_salesorder_location',
                            value: account.extra_info.fbaorder_location
                        })
                        updateInventoryRecord.setValue({
                            fieldId: 'custrecord_fba_update_inventory_rid',
                            value: rid
                        })
                        updateInventoryRecord.setValue({
                            fieldId: 'custrecord_fba_update_status',
                            value: 2
                        })
                        updateInventoryRecord.save()
                    }
                }
            })
        })

        log.audit('000input', {
            sum: sum,
            type: report_type,
            // range: report_range,
            // is_request: is_request,
            count: lines.length
        })
        var results = []
        var count = 0
        var r
        for (var i = 0; i < lines.length; i++) {
            if (!r) {
                r = []
            }
            r.push(lines[i])
            count++

            if (count >= 20 || i == (lines.length - 1)) {
                results.push(JSON.stringify(r))
                count = 0
                r = []
            }
        }
        log.audit('results length', results.length)
        return results
    }


    /**
     * 创建报告数据, 并保存
     * @param {Object} ctx
     */
    function createRec(ctx) {
        log.audit('map ctx   ' + typeof(ctx), ctx)

        var recArr = [];
        try {
            var vArray = ctx;

            var acc_id, id, type, line, firstLine, site_id, seller_id
            var ck = true;

            vArray.map(function(v) {
                log.audit('JSON.parse(ctx.value)', JSON.stringify(v))
                acc_id = Number(v.acc_id),
                    id = Number(v.id),
                    type = v.type,
                    line = v.line,
                    site_id = v.site_id,
                    firstLine = v.firstLine
                seller_id = v.seller_id
                line['report-id'] = id
                line['account'] = acc_id
                if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                    ck = false
                    line['deposit-date'] = firstLine['deposit-date']
                    line['total-amount'] = firstLine['total-amount']
                    line['settlement-start-date'] = firstLine['settlement-start-date']
                    line['settlement-end-date'] = firstLine['settlement-end-date']
                    line['currency'] = firstLine['currency']
                    line['receipt_date'] = moment.utc(dateDeal(firstLine['deposit-date'])).toDate()
                }
                var mapping = core.consts.fieldsMapping[core.enums.report_type[type]]
                log.error('type :' + type, mapping)
                var date_key = mapping.date_key
                // log.debug('line[date_key:',line[date_key])
                line[date_key + '-txt'] = line[date_key]
                if (line[date_key]) {
                    line[date_key] = interfun.getFormatedDate('', '', line[date_key], '', true).date
                    if (line[date_key] == '2') return
                }
                var sjAcc
                var check_rec_id, rec
                if (mapping.record_type_id == 'customrecord_amazon_sales_report') {
                    // Amazon 发货报告    customrecord_amazon_sales_report        _GET_AMAZON_FULFILLED_SHIPMENTS_DATA_
                    search.create({
                        type: 'customrecord_amazon_sales_report',
                        filters: [{
                                name: 'custrecord_shipment_item_id',
                                operator: 'is',
                                values: line['shipment-item-id']
                            }, // SHIPMENT-ITEM-ID
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_shipment_item_id}, '" + line['shipment-item-id'] + "')"
                            },
                            {
                                name: 'custrecord_amazon_order_item_id',
                                operator: 'is',
                                values: line['amazon-order-item-id']
                            }, // AMAZON-ORDER-ITEM-ID
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_amazon_order_item_id}, '" + line['amazon-order-item-id'] + "')"
                            },
                            {
                                name: 'custrecord_amazon_order_id',
                                operator: 'is',
                                values: line['amazon-order-id']
                            }, // Order ID
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_amazon_order_id}, '" + line['amazon-order-id'] + "')"
                            },
                            {
                                name: 'custrecord_shipment_account',
                                operator: 'anyof',
                                values: [line['account']]
                            }, // account
                            {
                                name: 'custrecord_sku',
                                operator: 'is',
                                values: line['sku']
                            }, // sku
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_sku}, '" + line['sku'] + "')"
                            },
                            // { name: "custrecord_item_price", operator: "is", values: line['item-price'] },                         // ITEM-PRICE
                            {
                                name: 'custrecord_quantity_shipped',
                                operator: 'is',
                                values: line['quantity-shipped']
                            }, // QUANTITY-SHIPPED
                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == 'customrecord_aio_amazon_customer_return') {
                    search.create({
                        type: 'customrecord_aio_amazon_customer_return',
                        filters: [{
                                name: 'custrecord_aio_b2c_return_lcn',
                                operator: 'is',
                                values: line['license-plate-number']
                            },
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_aio_b2c_return_lcn}, '" + line['license-plate-number'] + "')"
                            },
                            {
                                name: 'custrecord_aio_b2c_return_order_id',
                                operator: 'is',
                                values: line['order-id']
                            },
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_aio_b2c_return_order_id}, '" + line['order-id'] + "')"
                            },
                            // {
                            //   name: 'custrecord_amazon_returndate_text',
                            //   operator: 'is',
                            //   values: line['return-date']
                            // },
                            {
                                name: 'custrecord_aio_b2_creturn_sku',
                                operator: 'is',
                                values: line['sku']
                            },
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_aio_b2_creturn_sku}, '" + line['sku'] + "')"
                            },
                            {
                                name: 'custrecord_aio_b2c_return_reason',
                                operator: 'is',
                                values: line['reason']
                            },
                            {
                                name: 'formulanumeric',
                                operator: 'equalto',
                                values: '1',
                                formula: "INSTR({custrecord_aio_b2c_return_reason}, '" + line['reason'] + "')"
                            },
                            {
                                name: 'custrecord_aio_b2c_return_aio_account',
                                operator: 'anyof',
                                values: line['account']
                            },
                            {
                                name: 'custrecord_aio_b2c_return_quantity',
                                operator: 'is',
                                values: line['quantity']
                            }

                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == 'customrecord_dps_fba_received_inventory') {
                    // 报告为 Amazon Received 报告,增加去重机制
                    search.create({
                        type: mapping.record_type_id,
                        filters: [{
                                name: 'custrecord_dps_fba_received_inven_fnsku',
                                operator: 'is',
                                values: line['fnsku']
                            },
                            {
                                name: 'custrecord_dps_fba_received_inve_account',
                                operator: 'is',
                                values: line['account']
                            },
                            // { name: 'custrecord_dps_fba_received_inv_req_id',operator: 'is',values: line["report-id"]},
                            {
                                name: 'custrecord_dps_fba_received_receiveddate',
                                operator: 'is',
                                values: line['received-date']
                            },
                            {
                                name: 'custrecord_dps_fba_received_inven_sku',
                                operator: 'is',
                                values: line['sku']
                            },
                            {
                                name: 'custrecord_dps_fba_received_inv_quantity',
                                operator: 'is',
                                values: line['quantity']
                            },
                            {
                                name: 'custrecord_dps_fba_received_shipment_id',
                                operator: 'is',
                                values: line['fba-shipment-id']
                            },
                            {
                                name: 'custrecord_dps_fba_received_ful_centerid',
                                operator: 'is',
                                values: line['fulfillment-center-id']
                            }
                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == 'customrecord_aio_amazon_mfn_listing') {
                    // 报告为 Amazon Listing 报告 , 增加去重机制
                    search.create({
                        type: mapping.record_type_id,
                        filters: [{
                                name: 'custrecord_aio_mfn_l_listing_id',
                                operator: 'is',
                                values: line['listing-id']
                            },
                            {
                                name: 'custrecord_aio_mfn_l_seller_sku',
                                operator: 'is',
                                values: line['seller-sku']
                            },
                            // { name: 'custrecord_dps_fba_received_inv_req_id',operator: 'is',values: line["report-id"]},
                            {
                                name: 'custrecord_aio_mfn_l_asin1',
                                operator: 'is',
                                values: line['asin1']
                            },
                            {
                                name: 'custrecord_aio_mfn_l_product_id',
                                operator: 'is',
                                values: line['product-id']
                            }
                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                    log.audit('check_rec_id', check_rec_id)
                } else if (mapping.record_type_id == 'customrecord_aio_amazon_removal_order') {
                    line['sjAcc'] = interfun.GetstoreofCurrency(line['currency'], acc_id)
                    log.debug('line sjAcc ', line['sjAcc'])
                    search.create({
                        type: mapping.record_type_id,
                        filters: [{
                                name: 'custrecord_aio_removal_account',
                                operator: 'is',
                                values: line['account']
                            },
                            {
                                name: 'custrecord_aio_removal_order_id',
                                operator: 'is',
                                values: line['order-id']
                            },
                            {
                                name: 'custrecord_aio_removal_sku',
                                operator: 'is',
                                values: line['sku']
                            },
                            {
                                name: 'custrecord_aio_removal_disposition',
                                operator: 'is',
                                values: line['disposition']
                            },
                            {
                                name: 'custrecord_aio_removal_order_type',
                                operator: 'is',
                                values: line['order-type']
                            }
                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == 'customrecord_amazon_monthinventory_rep') {
                    // 亚马逊月度历史库存
                    /**
                      search.create({
                      type: mapping.record_type_id,
                      filters: [
                        {name: 'custrecord_moninv_account', operator: 'is',values: line['account']},
                        {name: 'custrecord_moninv_month_txt', operator: 'is',values: line['month']},
                        {name: 'custrecord_moninv_fnsku', operator: 'is',values: line['fnsku']},
                        {name: 'custrecord_moninv_sku', operator: 'is',values: line['sku']},
                        {name: 'custrecord_moninv_fulfillment_center_id', operator: 'is',values: line['fulfillment-center-id']}
                      ]
                    }).run().each(function (e) {
                      check_rec_id = e.id
                    })
                     */

                } else if (mapping.record_type_id == 'customrecord_amazon_adjust_inventory_rep') {
                    // 亚马逊盘库报告
                    search.create({
                        type: mapping.record_type_id,
                        filters: [
                            { name: 'custrecord_adjusts_account', operator: 'is', values: line['account'] },
                            { name: 'custrecord_adjusts_transaction_item_id', operator: 'is', values: line['transaction-item-id'] },
                            { name: 'custrecord_adjusts_fnsku', operator: 'is', values: line['fnsku'] },
                            { name: 'custrecord_adjusts_sku', operator: 'is', values: line['sku'] },
                            { name: 'custrecord_adjusts_fulfillment_center_id', operator: 'is', values: line['fulfillment-center-id'] }
                        ]
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == 'customrecord_amazon_fulfill_invtory_rep') {
                    // 亚马逊库存动作详情报告
                    /**
                     search.create({
                      type: mapping.record_type_id,
                      filters: [
                        {name: 'custrecord_invful_account', operator: 'is',values: line['account']},
                        {name: 'custrecord_invful_transation_type', operator: 'is',values: line['transaction-type']},
                        {name: 'custrecord_invful_fnsku', operator: 'is',values: line['fnsku']},
                        {name: 'custrecord_invful_sku', operator: 'is',values: line['sku']},
                        {name: 'custrecord_invful_fulfillment_center_id', operator: 'is',values: line['fulfillment-center-id']},
                        {name: 'custrecord_invful_quantity', operator: 'is',values: line['quantity']},
                        {name: 'custrecord_invful_snapshot_date_txt', operator: 'is',values: line['snapshot-date-txt']}
                      ]
                    }).run().each(function (e) {
                      check_rec_id = e.id
                    })
                     */

                } else if (mapping.record_type_id == 'customrecord_aio_amazon_removal_shipment') {
                    var fils = [
                        { name: 'custrecord_remo_shipment_account', operator: 'is', values: line['account'] },
                        { name: 'custrecord_aio_rmv_request_date', operator: 'is', values: line['request-date'] },
                        { name: 'custrecord_aio_rmv_order_id', operator: 'is', values: line['order-id'] },
                        { name: 'custrecord_aio_rmv_date', operator: 'is', values: line['shipment-date-txt'] },
                        { name: 'custrecord_aio_rmv_sku', operator: 'is', values: line['sku'] },
                        { name: 'custrecord_aio_rmv_fnsku', operator: 'is', values: line['fnsku'] },
                        { name: 'custrecord_aio_rmv_disposition', operator: 'is', values: line['disposition'] },
                        { name: 'custrecord_aio_rmv_shipped_qty', operator: 'is', values: line['shipped-quantity'] }
                    ]
                    if (line['carrier']) {
                        fils.push({ name: 'custrecord_aio_rmv_carrier', operator: 'is', values: line['carrier'] })
                    } else {
                        fils.push({ name: 'custrecord_aio_rmv_carrier', operator: 'isempty' })
                    }
                    if (line['tracking-number']) {
                        fils.push({ name: 'custrecord_aio_rmv_tracking_number', operator: 'is', values: line['tracking-number'] })
                    } else {
                        fils.push({ name: 'custrecord_aio_rmv_tracking_number', operator: 'isempty' })
                    }

                    // 亚马逊移除货件
                    search.create({
                        type: mapping.record_type_id,
                        filters: fils
                    }).run().each(function(e) {
                        check_rec_id = e.id
                    })
                }
                if (check_rec_id) {
                    log.audit('0load ' + line['amazon-order-id'] ? line['amazon-order-id'] : line['order-id'], '1 load: ' + mapping.record_type_id)
                    // return
                    rec = record.load({
                        type: mapping.record_type_id,
                        id: check_rec_id
                    })
                } else {
                    log.audit('00000add new :' + line['amazon-order-id'] ? line['amazon-order-id'] : line['order-id'], '2 add new: ' + mapping.record_type_id)
                    rec = record.create({
                        type: mapping.record_type_id,
                        isDynamic: true
                    })
                }

                log.audit('date key success', line[date_key])
                Object.keys(mapping.mapping).map(function(field_id) {
                    var values = line[mapping.mapping[field_id]]
                    if (values && JSON.stringify(values).length < 300) {
                        if (mapping.mapping[field_id] == date_key) {
                            rec.setText({
                                fieldId: field_id,
                                text: values
                            })
                        } else {
                            rec.setValue({
                                fieldId: field_id,
                                value: values
                            })
                        }
                    } else if (values && JSON.stringify(values).length >= 300) {
                        log.error('else if values', values)
                        rec.setValue({
                            fieldId: field_id,
                            value: values.substring(0, 299)
                        })
                    }
                })

                if (type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) {
                    log.debug('库存报告的sku：' + line.sku, acc_id)
                    rec.setValue({
                        fieldId: 'custrecord_fba_inventory_rid',
                        value: Number(v.rid)
                    })
                    rec.setValue({
                        fieldId: 'custrecord_fba_account',
                        value: acc_id
                    })
                    rec.setValue({
                        fieldId: 'custrecord_all_salesorder_location',
                        value: Number(v.salesorder_location)
                    })
                    // sku对应关系，fnsku取库存报告
                    var sku_corr = '',
                        acc_search = interfun.getSearchAccount(seller_id).acc_search
                    search.create({
                        type: 'customrecord_aio_amazon_seller_sku',
                        filters: [
                            { name: 'custrecord_ass_account', operator: 'anyof', values: acc_search },
                            { name: 'name', operator: 'is', values: line.sku }
                        ]
                    }).run().each(function(e) {
                        sku_corr = record.load({ type: 'customrecord_aio_amazon_seller_sku', id: e.id })
                        sku_corr.setValue({ fieldId: 'custrecord_ass_fnsku', value: line.fnsku })
                        var ss = sku_corr.save()
                        log.debug('已更新SKU对应关系 ,id: ' + ss)
                        return true
                    })
                }
                if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                    rec.setText({
                        fieldId: 'custrecord_settlement_start',
                        text: interfun.getFormatedDate('', '', line['settlement-start-date']).date
                    })
                    rec.setText({
                        fieldId: 'custrecord_settlement_enddate',
                        text: interfun.getFormatedDate('', '', line['settlement-end-date']).date
                    })
                }
                if (type == core.enums.report_type._GET_MERCHANT_LISTINGS_ALL_DATA_) {
                    log.debug('listing 报告的sku：' + line['seller-sku'], acc_id)
                    rec.setValue({
                        fieldId: 'custrecord_aio_mfn_l_listing_acc_id',
                        value: acc_id
                    })
                    // sku对应关系，asin sellersku 店铺 站点
                    var sku_corr = ''
                    search.create({
                        type: 'customrecord_aio_amazon_seller_sku',
                        filters: [
                            { name: 'custrecord_ass_account', operator: 'anyof', values: acc_id },
                            { name: 'name', operator: 'is', values: line['seller-sku'] }
                        ]
                    }).run().each(function(e) {
                        sku_corr = e.id
                    })
                    if (!sku_corr) {
                        sku_corr = record.create({ type: 'customrecord_aio_amazon_seller_sku' })
                        sku_corr.setValue({ fieldId: 'custrecord_ass_account', value: acc_id })
                        sku_corr.setValue({ fieldId: 'custrecord_ass_asin', value: line.asin1 })
                        sku_corr.setValue({ fieldId: 'name', value: line['seller-sku'] })
                        if (site_id) {
                            sku_corr.setValue({ fieldId: 'custrecord_ass_sellersku_site', value: site_id })
                            var ss = sku_corr.save()
                            log.debug('SKU对应关系 ' + ss)
                        } else {
                            // 站点不存在？？？？店铺信息配置里面没有站点?
                            search.create({
                                type: 'customrecord_aio_account',
                                filters: [
                                    { name: 'internalidnumber', operator: 'equalto', values: acc_id }
                                ],
                                columns: [{ name: 'custrecord_aio_enabled_sites' }]
                            }).run().each(function(e) {
                                log.audit('找到站点', e.getValue('custrecord_aio_enabled_sites'))
                                sku_corr.setValue({ fieldId: 'custrecord_ass_sellersku_site', value: e.getValue('custrecord_aio_enabled_sites') })
                                var ss = sku_corr.save()
                                log.debug('SKU对应关系 ' + ss)
                            })
                        }
                    }
                }
                if (type == core.enums.report_type._GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA_) {
                    var mon = line['month'].split('/')[0],
                        year = line['month'].split('/')[1]
                    rec.setValue({
                        fieldId: 'custrecord_moninv_month',
                        value: new Date(year, mon, 0)
                    })
                }

                var ss = rec.save()
                log.debug('rec.id', ss)

                recArr.push(ss);

                // return ss;
            })

            return recArr;
        } catch (err) {
            log.error('error:', err)

            var ss = createMissingReport(type, id, err, acc_id, ck)

            return err;
        }
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
    function createMissingReport(repoty, repo_id, reason, acc, ck) {
        var mo
        var fils = []
        repoty ? fils.push({ name: 'custrecord_amazon_missing_rep', operator: 'anyof', values: repoty }) : ''
        repo_id ? fils.push({ name: 'custrecord_amazon_missing_reportid', operator: 'anyof', values: repo_id }) : ''
        acc ? fils.push({ name: 'custrecord_amazon_missing_account', operator: 'anyof', values: acc }) : ''
        search.create({
            type: 'customrecord_amazon_missing_report',
            filters: fils
        }).run().each(function(rec) {
            mo = record.load({
                type: 'customrecord_amazon_missing_report',
                id: rec.id
            })
            return false
        })
        if (!mo) {
            mo = record.create({
                type: 'customrecord_amazon_missing_report',
                isDynamic: true
            })
        }
        repoty ?
            mo.setValue({
                fieldId: 'custrecord_amazon_missing_rep',
                value: repoty
            }) : ''; // 类型
        acc ?
            mo.setValue({
                fieldId: 'custrecord_amazon_missing_account',
                value: acc
            }) : ''
        repo_id ?
            mo.setValue({
                fieldId: 'custrecord_amazon_missing_reportid',
                value: repo_id
            }) : ''
        reason ?
            mo.setValue({
                fieldId: 'custrecord_amazon_missing_reason',
                value: JSON.stringify(reason)
            }) : ''
        // 设置为false，重新拉一次

        if (ck)
            record.submitFields({
                type: 'customrecord_aio_amazon_report',
                id: repo_id,
                values: {
                    custrecord_aio_origin_report_is_download: false
                }
            })
        return mo.save()
    }

    return {
        get: _post,
        post: _post,
    }
});