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
define(["N/format", "require", "exports", "./Helper/core.min", "N/log", "N/record", "N/runtime", "./Helper/Moment.min", "N/search"], function (format, require, exports, core, log, record, runtime, moment, search) {
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
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
            (type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_));
    };


    exports.getInputData = function () {
        var lines = [];
        var is_request = runtime.getCurrentScript().getParameter({
            name: 'custscript_aio_obt_report_is_request'
        }),
            report_type = runtime.getCurrentScript().getParameter({
                name: 'custscript_aio_obt_report_type'
            }),
            report_range = runtime.getCurrentScript().getParameter({
                name: 'custscript_aio_obt_report_date_range'
            }),
            report_start_date = Number(report_range) <= 3 ? moment.utc().subtract(1, ['', 'days', 'weeks', 'months'][report_range]).startOf('day').toISOString() : moment.utc().subtract(Number(report_range) - 2, 'days').startOf('day').toISOString();
        log.audit("report_type", report_type);
        log.audit("report_range", report_range);
        log.audit("StartDate", report_start_date);
        log.audit("EndDate", moment.utc().subtract(1, 'days').endOf('day').toISOString());
        var restr = runtime.getCurrentScript().getParameter({
            name: 'custscript_restriction'
        });
        log.audit("RESTRICTION", restr);
        var acc_arry = core.amazon.getReportAccountList();

        var startDate, endate;

        var sum = 0;

        core.amazon.getReportAccountList().map(function (account) {
        // core.amazon.getAccountList().map(function (account) {
            if (account.id == 5) {
                var marketplace = account.marketplace;
                if (check_if_handle(account.extra_info, report_type)) {
                    log.audit("account:" + account.id, marketplace);
                    if (is_request) {
                        /** Settlement Report 结算报告 Request */
                        if (report_type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                            sum++;
                            core.amazon.requestReportFake(account, report_type);
                            log.audit("requestReportFake", "requestReportFake");
                        } else {

                            log.audit("requestReportrequestReport", account.id);

                            // 根据站点来设置时间
                            if (account.enabled_sites == 'AmazonUS') {
                                // 美国站点
                                log.audit("account.id " + account.id, "美国站点");
                                startDate = "2020-04-01T00:00:00.000Z";
                                endate = "2020-04-19T23:59:59.999Z";

                            } else if (account.enabled_sites == 'AmazonUK') {
                                // 英国站点
                                log.audit("account.id " + account.id, "英国站点");

                                startDate = "2020-04-01T08:00:00.000Z";
                                endate = "2020-03-20T08:00:00.000Z";

                            } else if (account.enabled_sites == 'AmazonDE' || account.enabled_sites == 'AmazonES' || account.enabled_sites == 'AmazonFR' || account.enabled_sites == 'AmazonIT') {
                                // 欧洲站点
                                log.audit("account.id " + account.id, "欧洲站点");

                                startDate = "2020-04-01T09:00:00.000Z";
                                endate = "2020-03-20T09:00:00.000Z";

                            } else {
                                // 其他站点
                                log.audit("account.id " + account.id, "其他站点");
                                startDate = "2020-04-01T00:00:00.000Z";
                                endate = "2020-03-19T23:59:59.999Z";
                            }

                            startDate = report_start_date;
                            endate = moment.utc().subtract(1, 'days').endOf('day').toISOString()

                            startDate = '2020-04-01T00:00:00.000Z';
                            endate = '2020-04-31T23:59:59.000Z';
                            log.debug(report_type, "startDate:" + startDate + "   endate:" + endate);

                            core.amazon.requestReport(account, report_type, {
                                'StartDate': startDate,
                                'EndDate': endate,
                                'MarketplaceIdList.Id.1': account.marketplace,
                            });

                            // core.amazon.requestReport(account, report_type, {
                            //     'StartDate': report_start_date,
                            //     'EndDate': moment.utc().subtract(1, 'days').endOf('day').toISOString(),
                            //     'MarketplaceIdList.Id.1': account.marketplace,
                            // });

                        }
                    } else {

                        // 结算报告量大, 先按店铺拉取
                        if (account.id == 3 && report_type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                            log.audit("getRequestingReportList", "getRequestingReportList");
                            core.amazon.getRequestingReportList(account, report_type).map(function (r) {
                                log.error('账号 ID', account);
                                var rLines = r.lines;
                                log.audit('rLines', rLines[0]);
                                r.lines.map(function (l) {
                                    return lines.push({
                                        acc_id: account.id,
                                        salesorder_location: account.info.salesorder_location,
                                        id: r.id,
                                        type: report_type,
                                        line: l,
                                        firstLine: rLines[0],
                                    });
                                });

                                record.submitFields({
                                    type: core.ns.amazon_report._name,
                                    id: r.id,
                                    values: {
                                        'custrecord_aio_origin_report_is_download': true
                                    }
                                });
                            });
                        } else if (account.id) {
                            var rid = Date.now();
                            log.audit("getRequestingReportList", "getRequestingReportList");
                            core.amazon.getRequestingReportList(account, report_type).map(function (r) {
                                log.error('账号 ID', account);
                                var rLines = r.lines;
                                log.audit('rLines', rLines[0]);

                                r.lines.map(function (l) {
                                    return lines.push({
                                        acc_id: account.id,
                                        salesorder_location: account.info.salesorder_location,
                                        id: r.id,
                                        rid: rid,
                                        type: report_type,
                                        line: l,
                                        firstLine: rLines[0],
                                    });
                                });

                                record.submitFields({
                                    type: core.ns.amazon_report._name,
                                    id: r.id,
                                    values: {
                                        'custrecord_aio_origin_report_is_download': true
                                    }
                                });
                            });
                            if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) {
                                log.error("rid+店铺+FBA仓库", rid + "-" + account.id + "-" + account.info.salesorder_location);
                                if (account.info.salesorder_location) {
                                    reportFlag = true;
                                    var filters = [];
                                    filters.push({ name: 'custrecord_fba_update_inventory_account', operator: 'is', values: account.id });
                                    filters.push({ name: 'custrecord_salesorder_location', operator: 'is', values: account.info.salesorder_location });
                                    var updateId;
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
                                        updateId = e.id;
                                    });
                                    var updateInventoryRecord;
                                    if (!updateId) {
                                        updateInventoryRecord = record.create({
                                            type: "customrecord_fba_update_inventory",
                                            isDynamic: true
                                        });
                                    } else {
                                        updateInventoryRecord = record.load({
                                            type: "customrecord_fba_update_inventory",
                                            id: updateId
                                        });
                                    }
                                    updateInventoryRecord.setValue({
                                        fieldId: "custrecord_fba_update_inventory_account",
                                        value: account.id
                                    });
                                    updateInventoryRecord.setValue({
                                        fieldId: "custrecord_salesorder_location",
                                        value: account.info.salesorder_location
                                    });
                                    updateInventoryRecord.setValue({
                                        fieldId: "custrecord_fba_update_inventory_rid",
                                        value: rid
                                    });
                                    updateInventoryRecord.setValue({
                                        fieldId: "custrecord_fba_update_status",
                                        value: 2
                                    });
                                    updateInventoryRecord.save();
                                }
                            }
                        }
                    }
                }
            } else {
                log.audit("check_if_handle", 'check_if_handle false');
            }

        });
        log.audit('000input', {
            sum: sum,
            type: report_type,
            range: report_range,
            is_request: is_request,
            count: lines.length
        });
        var results = [];
        var count = 0;
        var r;
        for (var i = 0; i < lines.length; i++) {
            if (!r) {
                r = [];
            }
            r.push(lines[i]);
            count++;

            if (count >= 10 || i == (lines.length - 1)) {
                results.push(JSON.stringify(r));
                count = 0;
                r = [];
            }

        }
        log.audit('results length', results.length)
        return results;

    };

    exports.map = function (ctx) {
        try {
            var rid = ctx.value.rid;
            var reportFlag = false;
            var vArray = JSON.parse(ctx.value);
            log.error('vArray', vArray)
            vArray.map(function (v) {
                log.error("v:", v)
                // log.audit("JSON.parse(ctx.value)",JSON.stringify(v));
                var acc_id = Number(v.acc_id),
                    id = Number(v.id),
                    type = v.type,
                    line = v.line,
                    firstLine = v.firstLine;

                line['report-id'] = id;
                line['account'] = acc_id;
                var date_text;
                if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                    line['deposit-date'] = firstLine['deposit-date'];
                    line['total-amount'] = firstLine['total-amount']; //??????????????ó??????¨??í????????????????????????????
                    line['settlement-start-date'] = firstLine['settlement-start-date'];
                    line['settlement-end-date'] = firstLine['settlement-end-date'];
                    line['currency'] = firstLine['currency'];
                    line['receipt_date'] = moment.utc(dateDeal(firstLine['deposit-date'])).toDate();
                    //line['receipt_date'] = moment(firstLine['deposit-date'].substring(0,10)).toDate();

                }

                var mapping = core.consts.fieldsMapping[core.enums.report_type[type]]


                var check_rec_id, rec;
                if (mapping.record_type_id == "customrecord_amazon_sales_report") {
                    // Amazon 发货报告    customrecord_amazon_sales_report        _GET_AMAZON_FULFILLED_SHIPMENTS_DATA_
                    search.create({
                        type: 'customrecord_amazon_sales_report',
                        filters: [{
                            name: "custrecord_shipment_item_id",
                            operator: "is",
                            values: line['shipment-item-id']
                        }, // SHIPMENT-ITEM-ID
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_shipment_item_id}, '" + line['shipment-item-id'] + "')"
                        },
                        {
                            name: "custrecord_amazon_order_item_id",
                            operator: "is",
                            values: line['amazon-order-item-id']
                        }, // AMAZON-ORDER-ITEM-ID
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_amazon_order_item_id}, '" + line['amazon-order-item-id'] + "')"
                        },
                        {
                            name: "custrecord_amazon_order_id",
                            operator: "is",
                            values: line['amazon-order-id']
                        }, // Order ID 
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_amazon_order_id}, '" + line['amazon-order-id'] + "')"
                        },
                        {
                            name: "custrecord_shipment_account",
                            operator: "anyof",
                            values: [line['account']]
                        }, // account 
                        {
                            name: "custrecord_sku",
                            operator: "is",
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
                            name: "custrecord_quantity_shipped",
                            operator: "is",
                            values: line['quantity-shipped']
                        }, // QUANTITY-SHIPPED
                        ]
                    }).run().each(function (e) {
                        check_rec_id = e.id
                    });
                }
                // else if (mapping.record_type_id == "customrecord_aio_amazon_settlement") {
                //     // Amazon 结算报告     customrecord_aio_amazon_settlement        _GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_
                //     search.create({
                //         type: 'customrecord_aio_amazon_settlement',
                //         filters: [
                //             { name: "custrecord_aio_sett_amount_type", operator: "is", values: line['amount-type'] },
                //             { name: "custrecord_aio_sett_tran_type", operator: "is", values: line['transaction-type'] },
                //             { name: "custrecord_aio_sett_id", operator: "is", values: line['settlement-id'] },
                //             { name: "custrecord_aio_sett_amount", operator: "is", values: line['amount'] },
                //             { name: "custrecord_aio_sett_deposit_date", operator: "is", values: line['deposit-date'] },
                //             { name: "custrecord_aio_sett_order_id", operator: "is", values: line['order-id'] },
                //             // { name: "custrecord_aio_sett_sku", operator: "is", values: line['sku']?:"" },
                //             { name: "custrecord_aio_origin_account", join: "custrecord_aio_sett_report_id", operator: "anyof", values: [acc_id] },
                //             { name: "custrecord_aio_sett_posted_date_time", operator: "is", values: line['posted-date-time'] }
                //         ]
                //     }).run().each(function (e) {
                //         check_rec_id = e.id
                //     })
                // }
                else if (mapping.record_type_id == "customrecord_aio_amazon_customer_return") {
                    search.create({
                        type: 'customrecord_aio_amazon_customer_return',
                        filters: [{
                            name: "custrecord_aio_b2c_return_lcn",
                            operator: "is",
                            values: line["license-plate-number"]
                        },
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_aio_b2c_return_lcn}, '" + line['license-plate-number'] + "')"
                        },
                        {
                            name: "custrecord_aio_b2c_return_order_id",
                            operator: "is",
                            values: line["order-id"]
                        },
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_aio_b2c_return_order_id}, '" + line["order-id"] + "')"
                        },
                        {
                            name: "custrecord_amazon_returndate_text",
                            operator: "is",
                            values: line["return-date"]
                        },
                        {
                            name: "custrecord_aio_b2_creturn_sku",
                            operator: "is",
                            values: line["sku"]
                        },
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_aio_b2_creturn_sku}, '" + line['sku'] + "')"
                        },
                        {
                            name: "custrecord_aio_b2c_return_reason",
                            operator: "is",
                            values: line["reason"]
                        },
                        {
                            name: 'formulanumeric',
                            operator: 'equalto',
                            values: '1',
                            formula: "INSTR({custrecord_aio_b2c_return_reason}, '" + line['reason'] + "')"
                        },
                        {
                            name: "custrecord_aio_b2c_return_aio_account",
                            operator: "anyof",
                            values: line["account"]
                        },
                        {
                            name: "custrecord_aio_b2c_return_quantity",
                            operator: "is",
                            values: line["quantity"]
                        },

                        ]
                    }).run().each(function (e) {
                        check_rec_id = e.id
                    })
                } else if (mapping.record_type_id == "customrecord_dps_fba_received_inventory") {
                    // 报告为 Amazon Received 报告,增加去重机制
                    search.create({
                        type: mapping.record_type_id,
                        filters: [{
                            name: 'custrecord_dps_fba_received_inven_fnsku',
                            operator: 'is',
                            values: line["fnsku"]
                        },
                        {
                            name: 'custrecord_dps_fba_received_inve_account',
                            operator: 'is',
                            values: line["account"]
                        },
                        // { name: 'custrecord_dps_fba_received_inv_req_id',operator: 'is',values: line["report-id"]},
                        {
                            name: 'custrecord_dps_fba_received_receiveddate',
                            operator: 'is',
                            values: line["received-date"]
                        },
                        {
                            name: 'custrecord_dps_fba_received_inven_sku',
                            operator: 'is',
                            values: line["sku"]
                        },
                        {
                            name: 'custrecord_dps_fba_received_inv_quantity',
                            operator: 'is',
                            values: line["quantity"]
                        },
                        {
                            name: 'custrecord_dps_fba_received_shipment_id',
                            operator: 'is',
                            values: line["fba-shipment-id"]
                        },
                        {
                            name: 'custrecord_dps_fba_received_ful_centerid',
                            operator: 'is',
                            values: line["fulfillment-center-id"]
                        },
                        ]
                    }).run().each(function (e) {
                        check_rec_id = e.id;
                    })

                }
                if (check_rec_id) {
                    log.audit("0load " + line['amazon-order-id'] ? line['amazon-order-id'] : line["order-id"], "1 load: " + mapping.record_type_id)
                    // return
                    rec = record.load({
                        type: mapping.record_type_id,
                        id: check_rec_id
                    });
                } else {
                    log.audit("00000add new :" + line['amazon-order-id'] ? line['amazon-order-id'] : line["order-id"], "2 add new: " + mapping.record_type_id)
                    rec = record.create({
                        type: mapping.record_type_id,
                        isDynamic: true
                    });
                }
                // var rec = record.create({ type: mapping.record_type_id, isDynamic: true });

                var date_key = mapping.date_key;
                // log.debug('line[date_key:',line[date_key]);
                date_textutc = line[date_key]
                var returndateTextutc = line["return-date"]

                line[date_key] = format.format({
                    value: moment(line[date_key]).toDate(),
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_LOS_ANGELES //????????×????????????ú????????
                });

                line[date_key] = format.format({
                    value: moment(line[date_key]).toDate(),
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_LOS_ANGELES //????????×????????????ú????????
                });

                log.debug('Object', '1')
                Object.keys(mapping.mapping).map(function (field_id) {
                    var values = line[mapping.mapping[field_id]];
                    log.debug('Object field_id: ' + field_id, values);
                    if (values && JSON.stringify(values).length < 300) {
                        if (mapping.mapping[field_id] == date_key) {
                            rec.setText({
                                fieldId: field_id,
                                text: values
                            });
                        } else if (field_id == 'custrecord_aio_b2c_return_return_date') {
                            rec.setText({
                                fieldId: field_id,
                                text: format.format({
                                    value: moment(values).toDate(),
                                    type: format.Type.DATE,
                                    timezone: format.Timezone.AMERICA_LOS_ANGELES //????????×????????????ú????????
                                })
                            });
                        } else {
                            rec.setValue({
                                fieldId: field_id,
                                value: values
                            });
                        }
                    }

                });

                if (type == core.enums.report_type._GET_AMAZON_FULFILLED_SHIPMENTS_DATA_) {
                    rec.setValue({
                        fieldId: "custrecord_shipment_date_text",
                        value: date_textutc
                    });
                }
                if (type == core.enums.report_type._GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA_) {
                    log.error('returndateTextutc', returndateTextutc)
                    rec.setValue({
                        fieldId: "custrecord_amazon_returndate_text",
                        value: returndateTextutc
                    });
                }

                if (type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_) {
                    log.error("_GET_FBA_MYI_ALL_INVENTORY_DATA_", v.rid + "-" + v.salesorder_location + "-" + acc_id)
                    rec.setValue({
                        fieldId: "custrecord_fba_inventory_rid",
                        value: Number(v.rid)
                    });
                    rec.setValue({
                        fieldId: "custrecord_fba_account",
                        value: acc_id
                    });
                    rec.setValue({
                        fieldId: "custrecord_all_salesorder_location",
                        value: Number(v.salesorder_location)
                    });
                }
                if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                    var s_date = format.format({
                        value: moment.utc(dateDeal(line['settlement-start-date'])).toDate(),
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_LOS_ANGELES //????????×????????????ú????????
                    });
                    var e_date = format.format({
                        value: moment.utc(dateDeal(line['settlement-end-date'])).toDate(),
                        type: format.Type.DATE,
                        timezone: format.Timezone.AMERICA_LOS_ANGELES //????????×????????????ú????????
                    });
                    rec.setText({
                        fieldId: "custrecord_settlement_start",
                        text: s_date
                    });
                    rec.setText({
                        fieldId: "custrecord_settlement_enddate",
                        text: e_date
                    });

                    // rec.setValue({ fieldId: "custrecord_settlement_start", value: moment.utc(dateDeal(line['settlement-start-date'])).toDate() });
                    // rec.setValue({ fieldId: "custrecord_settlement_enddate", value: moment.utc(dateDeal(line['settlement-end-date'])).toDate() });
                }
                var id = rec.save();
                log.debug('rec.id', id);
            })
        } catch (err) {
            log.error('err cc', err);
        }
        // log.debug("0map ??á????",new Date().getTime())
    };


    function dateDeal(str) {
        var strs = str.substring(0, 10)
        var ins = strs.split(".")[0].length
        var s_d
        if (ins < 4) {
            s_d = strs.split(".")[2] + "/" + strs.split(".")[1] + "/" + strs.split(".")[0] + " " + str.substring(11, 19)
        } else {
            s_d = str.substring(0, 19)
        }
        return s_d
    }
    exports.reduce = function (ctx) { };
    exports.summarize = core.utils.summarize;
});