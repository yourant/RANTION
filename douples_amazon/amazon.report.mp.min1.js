/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @lastupdate 20200302 20:09
 */
define(['N/format', 'require', 'exports', './Helper/core.min', 'N/log', 'N/record', 'N/runtime', './Helper/Moment.min', 'N/search', './Helper/interfunction.min'],
    function (format, require, exports, core, log, record, runtime, moment, search, interfun) {
        Object.defineProperty(exports, '__esModule', {
            value: true
        })
        var tz = new Date().getTimezoneOffset()
        /** 检查对应报告类型*/
        var check_if_handle = function (cfg, type) {
            return ((cfg.if_handle_removal_report && (type == core.enums.report_type._GET_FBA_FULFILLMENT_REMOVAL_ORDER_DETAIL_DATA_ || type == core.enums.report_type._GET_FBA_FULFILLMENT_REMOVAL_SHIPMENT_DETAIL_DATA_)) ||
                (cfg.if_handle_custrtn_report && (type == core.enums.report_type._GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA_ || type == core.enums.report_type._GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_REPLACEMENT_DATA_)) ||
                (cfg.if_handle_inventory_report && type == core.enums.report_type._GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA_) ||
                (cfg.if_handle_settlement_report && type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) ||
                (type == core.enums.report_type._GET_AFN_INVENTORY_DATA_) ||
                (type == core.enums.report_type._GET_MERCHANT_LISTINGS_ALL_DATA_) ||
                (type == core.enums.report_type._GET_FBA_REIMBURSEMENTS_DATA_) ||
                (type == core.enums.report_type._POST_ORDER_FULFILLMENT_DATA_) ||
                (type == core.enums.report_type._GET_AMAZON_FULFILLED_SHIPMENTS_DATA_) ||
                (type == core.enums.report_type._GET_FBA_MYI_UNSUPPRESSED_INVENTORY_DATA_) ||
                (type == core.enums.report_type._GET_VAT_TRANSACTION_DATA_) ||
                (type == core.enums.report_type._GET_FBA_FULFILLMENT_INVENTORY_RECEIPTS_DATA_) ||
                (type == core.enums.report_type._GET_FBA_STORAGE_FEE_CHARGES_DATA_) ||
                (type == core.enums.report_type._GET_FBA_FULFILLMENT_LONGTERM_STORAGE_FEE_CHARGES_DATA_) ||
                (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) ||
                (type == core.enums.report_type._GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA_) ||
                (type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) ||
                (type == core.enums.report_type._GET_FBA_FULFILLMENT_INVENTORY_ADJUSTMENTS_DATA_) ||
                (type == core.enums.report_type._GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA_))
        }

        exports.getInputData = function () {
            var lines = []
            var is_request = runtime.getCurrentScript().getParameter({
                    name: 'custscript_aio_obt_report_is_request'
                }),
                report_type = runtime.getCurrentScript().getParameter({
                    name: 'custscript_aio_obt_report_type'
                }),
                report_range = runtime.getCurrentScript().getParameter({
                    name: 'custscript_aio_obt_report_date_range'
                }),
                report_start_date = Number(report_range) <= 3 ? moment.utc().subtract(1, ['', 'days', 'weeks', 'months'][report_range]).startOf('day').toISOString() : moment.utc().subtract(Number(report_range) - 2, 'days').startOf('day').toISOString()
            log.audit('report_type: ' + report_type, ' core.enums.report_type._GET_AMAZON_FULFILLED_SHIPMENTS_DATA_: ' + core.enums.report_type._GET_AMAZON_FULFILLED_SHIPMENTS_DATA_)
            log.audit('report_range', report_range)
            log.audit('StartDate', report_start_date)
            log.audit('EndDate', moment.utc().subtract(1, 'days').endOf('day').toISOString())
            var restr = runtime.getCurrentScript().getParameter({
                name: 'custscript_restriction'
            })
            log.audit('RESTRICTION', restr)
            // 店铺
            var stroe = runtime.getCurrentScript().getParameter({
                name: 'custscript_store_report'
            })
            // 自定义开始时间
            var startdate = runtime.getCurrentScript().getParameter({
                name: 'custscript_cust_startdate'
            })
            // 自定义结束时间
            var startend = runtime.getCurrentScript().getParameter({
                name: 'custscript_cust_endate'
            })
            var group_req = runtime.getCurrentScript().getParameter({
                name: 'custscript_acc_group_rep'
            })
            if (startdate)
                startdate = new Date(startdate.getTime() - tz * 60 * 1000).toISOString()
            if (startend)
                startend = new Date(startend.getTime() - tz * 60 * 1000).toISOString()
            var startDate, endDate
            startdate ? startDate = startdate : startDate = report_start_date
            startend ? endDate = startend : endDate = moment.utc().subtract(1, 'days').endOf('day').toISOString()
            log.debug(report_type, 'startDate:' + startDate + '   endDate:' + endDate)
            var sum = 0,
                acc_arrys = []
            // listing可以区分站点
            if (report_type == core.enums.report_type._GET_MERCHANT_LISTINGS_ALL_DATA_) {
                acc_arrys = core.amazon.getAccountList(group_req)
            } else {
                acc_arrys = core.amazon.getReportAccountList(group_req)
            }
            // core.amazon.getReportAccountList().map(function (account) {
            log.debug(report_type, '店铺数量:' + acc_arrys.length)
            acc_arrys.map(function (account) {
                if (account.id != stroe && stroe) return
                var marketplace = account.marketplace
                // if (check_if_handle(account.extra_info, report_type)) {
                log.audit('account:' + account.id, marketplace)
                if (is_request) {
                    /** Settlement Report 结算报告 Request */
                    if (report_type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                        sum++
                        core.amazon.requestReportFake(account, report_type, startDate, endDate)
                        log.audit('requestReportFake', 'requestReportFake')
                    } else if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) {
                        core.amazon.requestReport(account, report_type, {})
                    } else {
                        core.amazon.requestReport(account, report_type, {
                            'StartDate': startDate,
                            'EndDate': endDate,
                            'MarketplaceIdList.Id.1': account.marketplace,
                            'ReportOptions': 'ShowSalesChannel'
                        })
                    }
                } else {
                    var rid = Date.now()
                    log.audit('getRequestingReportList', 'getRequestingReportList')
                    core.amazon.getRequestingReportList(account, report_type).map(function (r) {
                        log.error('账号 ID', account)
                        var rLines = r.lines
                        log.audit('rLines' + rLines.length, rLines[0])

                        rLines.map(function (l) {
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
                        log.error('rid+店铺+FBA仓库+数量', rid + '-' + account.id + '-' + account.extra_info.fbaorder_location + '-' + rLines.length)
                        if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_ && rLines.length > 0) {
                            if (account.extra_info.fbaorder_location) {
                                reportFlag = true
                                var filters = []
                                filters.push({
                                    name: 'custrecord_fba_update_inventory_account',
                                    operator: 'EQUALTO',
                                    values: account.id
                                })
                                filters.push({
                                    name: 'custrecord_salesorder_location',
                                    operator: 'EQUALTO',
                                    values: account.extra_info.fbaorder_location
                                })
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
                                }).run().each(function (e) {
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
                }
                // } else {
                //   log.audit('check_if_handle', 'check_if_handle false')
                // }
            })

            log.audit('000input', {
                sum: sum,
                type: report_type,
                range: report_range,
                is_request: is_request,
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
                    // results.push(r)
                    count = 0
                    r = []
                }
            }
            log.audit('results length', results.length);
            return results
        }

        exports.map = function (ctx) {

            // return ;
            // log.error('ctx.value', ctx.value);
            var vArray = JSON.parse(ctx.value);
            // log.debug('vArray length: ' + typeof (vArray), vArray);
            var acc_id, id, type, line, firstLine, site_id, seller_id
            var ck = true
            try {
                var mapping = core.consts.fieldsMapping[core.enums.report_type[vArray[0].type]]
                log.debug('try', 'try');
                vArray.map(function (v) {
                    log.error('记录ID：' + mapping.record_type_id, v)
                    // log.audit("JSON.parse(ctx.value)",JSON.stringify(v))
                    acc_id = Number(v.acc_id),
                        id = Number(v.id),
                        type = v.type,
                        line = v.line,
                        site_id = v.site_id,
                        firstLine = v.firstLine,
                        seller_id = v.seller_id

                    // log.error('line', line);

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
                        // line['receipt_date'] = moment(firstLine['deposit-date'].substring(0,10)).toDate()
                    }

                    log.audit('mapping', mapping);
                    var sjAcc
                    var check_rec_id, rec
                    if (mapping.record_type_id == 'customrecord_amazon_sales_report') { // Amazon 发货报告    customrecord_amazon_sales_report        _GET_AMAZON_FULFILLED_SHIPMENTS_DATA_
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
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                    } else if (mapping.record_type_id == 'customrecord_aio_amazon_customer_return') { // 退货报告
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
                                {
                                    name: 'custrecord_amazon_returndate_text',
                                    operator: 'is',
                                    values: line['return-date']
                                },
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
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                    } else if (mapping.record_type_id == 'customrecord_dps_fba_received_inventory') { // 报告为 Amazon Received 报告,增加去重机制
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
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                    } else if (mapping.record_type_id == 'customrecord_aio_amazon_mfn_listing') { // 报告为 Amazon Listing 报告 , 增加去重机制
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
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                        log.audit('check_rec_id', check_rec_id)
                    } else if (mapping.record_type_id == 'customrecord_aio_amazon_removal_order') { // 移除订单
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
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                        log.audit('check_rec_id', check_rec_id)
                    } else if (mapping.record_type_id == 'customrecord_amazon_monthinventory_rep') { // 亚马逊月度历史库存
                        search.create({
                            type: mapping.record_type_id,
                            filters: [{
                                    name: 'custrecord_moninv_account',
                                    operator: 'is',
                                    values: line['account']
                                },
                                {
                                    name: 'custrecord_moninv_month_txt',
                                    operator: 'is',
                                    values: line['month']
                                },
                                {
                                    name: 'custrecord_moninv_fnsku',
                                    operator: 'is',
                                    values: line['fnsku']
                                },
                                {
                                    name: 'custrecord_moninv_sku',
                                    operator: 'is',
                                    values: line['sku']
                                },
                                {
                                    name: 'custrecord_moninv_fulfillment_center_id',
                                    operator: 'is',
                                    values: line['fulfillment-center-id']
                                }
                            ]
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                    } else if (mapping.record_type_id == 'customrecord_amazon_adjust_inventory_rep') { // 亚马逊盘库报告
                        search.create({
                            type: mapping.record_type_id,
                            filters: [{
                                    name: 'custrecord_adjusts_account',
                                    operator: 'is',
                                    values: line['account']
                                },
                                {
                                    name: 'custrecord_adjusts_transaction_item_id',
                                    operator: 'is',
                                    values: line['transaction-item-id']
                                },
                                {
                                    name: 'custrecord_adjusts_fnsku',
                                    operator: 'is',
                                    values: line['fnsku']
                                },
                                {
                                    name: 'custrecord_adjusts_sku',
                                    operator: 'is',
                                    values: line['sku']
                                },
                                {
                                    name: 'custrecord_adjusts_fulfillment_center_id',
                                    operator: 'is',
                                    values: line['fulfillment-center-id']
                                }
                            ]
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })
                    } else if (mapping.record_type_id == 'customrecord_amazon_fulfill_invtory_rep') { // 亚马逊库存动作详情报告

                        /*  HACK
                        search.create({
                            type: mapping.record_type_id,
                            filters: [{
                                    name: 'custrecord_invful_account',
                                    operator: 'is',
                                    values: line['account']
                                },
                                {
                                    name: 'custrecord_invful_transation_type',
                                    operator: 'is',
                                    values: line['transaction-type']
                                },
                                {
                                    name: 'custrecord_invful_fnsku',
                                    operator: 'is',
                                    values: line['fnsku']
                                },
                                {
                                    name: 'custrecord_invful_sku',
                                    operator: 'is',
                                    values: line['sku']
                                },
                                {
                                    name: 'custrecord_invful_fulfillment_center_id',
                                    operator: 'is',
                                    values: line['fulfillment-center-id']
                                }
                            ]
                        }).run().each(function (e) {
                            check_rec_id = e.id
                        })

                        */
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

                    var date_key = mapping.date_key
                    // log.debug('line[date_key:',line[date_key])
                    line[date_key + '-txt'] = line[date_key]
                    // log.debug('处理前 line[date_key]', line[date_key]);
                    if (line[date_key]) {
                        line[date_key] = interfun.getFormatedDate('', '', line[date_key], '', true).date
                        if (line[date_key] == '2') return
                    }
                    // log.audit('date key success', line[date_key])
                    Object.keys(mapping.mapping).map(function (field_id) {
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

                    // log.debug('映射字段处理', '设值成功')

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
                            acc_search = interfun.getSearchAccount(seller_id)
                        search.create({
                            type: 'customrecord_aio_amazon_seller_sku',
                            filters: [{
                                    name: 'custrecord_ass_account',
                                    operator: 'anyof',
                                    values: acc_search
                                },
                                {
                                    name: 'name',
                                    operator: 'is',
                                    values: line.sku
                                }
                            ]
                        }).run().each(function (e) {
                            sku_corr = record.load({
                                type: 'customrecord_aio_amazon_seller_sku',
                                id: e.id
                            })
                            sku_corr.setValue({
                                fieldId: 'custrecord_ass_fnsku',
                                value: line.fnsku
                            })
                            var ss = sku_corr.save()
                            log.debug('已更新SKU对应关系 ,id: ' + ss)
                            return true
                        })
                    }
                    if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                        log.debug('_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_', type);
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
                            filters: [{
                                    name: 'custrecord_ass_account',
                                    operator: 'anyof',
                                    values: acc_id
                                },
                                {
                                    name: 'name',
                                    operator: 'is',
                                    values: line['seller-sku']
                                }
                            ]
                        }).run().each(function (e) {
                            sku_corr = e.id
                        })
                        if (!sku_corr) {
                            sku_corr = record.create({
                                type: 'customrecord_aio_amazon_seller_sku'
                            })
                            sku_corr.setValue({
                                fieldId: 'custrecord_ass_account',
                                value: acc_id
                            })
                            sku_corr.setValue({
                                fieldId: 'custrecord_ass_asin',
                                value: line.asin1
                            })
                            sku_corr.setValue({
                                fieldId: 'name',
                                value: line['seller-sku']
                            })
                            sku_corr.setValue({
                                fieldId: 'custrecord_ass_sellersku_site',
                                value: site_id
                            })
                            var ss = sku_corr.save()
                            log.debug('SKU对应关系 ' + ss)
                        }
                    }
                    if (type == core.enums.report_type._GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA_) {
                        // log.debug('_GET_FBA_FULFILLMENT_MONTHLY_INVENTORY_DATA_', type);
                        var mon = line['month'].split('/')[0],
                            year = line['month'].split('/')[1]
                        rec.setValue({
                            fieldId: 'custrecord_moninv_month',
                            value: new Date(year, mon, 0)
                        })
                    }
                    log.debug('开始保存数据', '开始保存数据')
                    var ss = rec.save()
                    log.debug('记录ID rec.id', ss)
                })
            } catch (err) {
                var ss = createMissingReport(type, id, err, acc_id, ck)
                log.error('error:save id:' + ss, err)
            }
        }

        function dateDeal(str) {
            var strs = str.substring(0, 10)
            var ins = strs.split('.')[0].length
            var s_d = str
            if (ins < 4) {
                s_d = strs.split('.')[2] + '/' + strs.split('.')[1] + '/' + strs.split('.')[0] + ' ' + str.substring(11, 19)
            } else {
                if (str.indexOf('UTC') > -1)
                    s_d = str.substring(0, 19)
            }
            return s_d
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
            repoty ? fils.push({
                name: 'custrecord_amazon_missing_rep',
                operator: 'anyof',
                values: repoty
            }) : ''
            repo_id ? fils.push({
                name: 'custrecord_amazon_missing_reportid',
                operator: 'anyof',
                values: repo_id
            }) : ''
            acc ? fils.push({
                name: 'custrecord_amazon_missing_account',
                operator: 'anyof',
                values: acc
            }) : ''
            search.create({
                type: 'customrecord_amazon_missing_report',
                filters: fils
            }).run().each(function (rec) {
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

        exports.reduce = function (ctx) {}
        exports.summarize = function (ctx) {
            log.audit('处理完成', ctx)
        }
    })