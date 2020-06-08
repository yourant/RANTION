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
define(["N/format", "require", "exports", "./Helper/core.min", "N/log", "N/record", "N/runtime", "./Helper/Moment.min", "N/search", "./Helper/interfunction.min"],
    function (format, require, exports, core, log, record, runtime, moment, search, interfun) {
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
                name: 'custscript_aio_obt_report_is_request2'
            }),
                report_type = runtime.getCurrentScript().getParameter({
                    name: 'custscript_aio_obt_report_type2'
                }),
                report_range = runtime.getCurrentScript().getParameter({
                    name: 'custscript_aio_obt_report_date_range2'
                }),
                report_start_date = Number(report_range) <= 3 ? moment.utc().subtract(1, ['', 'days', 'weeks', 'months'][report_range]).startOf('day').toISOString() : moment.utc().subtract(Number(report_range) - 2, 'days').startOf('day').toISOString();
            log.audit("report_type", report_type);
            log.audit("report_range", report_range);
            log.audit("StartDate", report_start_date);
            log.audit("EndDate", moment.utc().subtract(1, 'days').endOf('day').toISOString());

            var startDate, endate;

            var sum = 0;

            core.amazon.getReportAccountList().map(function (account) {
                // core.amazon.getAccountList().map(function (account) {
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
                            startDate = '2020-05-01T00:00:00.000Z';
                            endate = '2020-06-01T00:00:00.000Z';
                            log.debug(report_type, "startDate:" + startDate + "   endate:" + endate);

                            core.amazon.requestReport(account, report_type, {
                                'StartDate': startDate,
                                'EndDate': endate,
                                'MarketplaceIdList.Id.1': account.marketplace,
                            });
                        }
                    } else {

                        var rid = Date.now();
                        log.audit("getRequestingReportList", "getRequestingReportList");
                        core.amazon.getRequestingReportList(account, report_type).map(function (r) {
                            log.error('账号 ID', account);
                            var rLines = r.lines;
                            log.audit('rLines' + rLines.length, rLines[0]);

                            rLines.map(function (l) {
                                return lines.push({
                                    acc_id: account.id,
                                    salesorder_location: account.extra_info.fbaorder_location,
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
                                    'custrecord_aio_origin_report_is_download': true,
                                    'custrecord_amazon_report_counts': rLines.length //本次拉取总数
                                }
                            });
                            log.error("rid+店铺+FBA仓库+数量", rid + "-" + account.id + "-" + account.extra_info.fbaorder_location + "-" + rLines.length);
                            if (report_type == core.enums.report_type._GET_FBA_MYI_ALL_INVENTORY_DATA_ && rLines.length > 0) {

                                if (account.extra_info.fbaorder_location) {
                                    reportFlag = true;
                                    var filters = [];
                                    filters.push({ name: 'custrecord_fba_update_inventory_account', operator: 'EQUALTO', values: account.id });
                                    filters.push({ name: 'custrecord_salesorder_location', operator: 'EQUALTO', values: account.extra_info.fbaorder_location });
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
                                        value: account.extra_info.fbaorder_location
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
                        });


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

                if (count >= 400 || i == (lines.length - 1)) {
                    results.push(JSON.stringify(r));
                    count = 0;
                    r = [];
                }

            }
            log.audit('results length', results.length)
            return results;

        };

        exports.map = function (ctx) {

            var vArray = JSON.parse(ctx.value);
            var report_type = runtime.getCurrentScript().getParameter({
                name: 'custscript_aio_obt_report_type2'
            })
            log.error('vArray:'+vArray.length, vArray)
            var acc_id, id, type, line, firstLine
            var startT = new Date().getTime();
            try {
                if (report_type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                    log.debug("是结算报告")
                    var rec = record.create({type:"customrecord_aio_amazon_settlement2",isDynamic:true})
                    var mapping = core.consts.fieldsMapping[core.enums.report_type[report_type]]
                     vArray.map(function (v) {
                        rec.selectNewLine({sublistId:"recmachcustrecord_settlement_link"})
                        log.error("v:", v)
                        // log.audit("JSON.parse(ctx.value)",JSON.stringify(v));
                        acc_id = Number(v.acc_id),
                            id = Number(v.id),
                            type = v.type,
                            line = v.line,
                            firstLine = v.firstLine;
    
                            line['report-id'] = id;
                            line['account'] = acc_id;
                            line['deposit-date'] = firstLine['deposit-date'];
                            line['total-amount'] = firstLine['total-amount'];
                            line['settlement-start-date'] = firstLine['settlement-start-date'];
                            line['settlement-end-date'] = firstLine['settlement-end-date'];
                            line['currency'] = firstLine['currency'];
                            line['receipt_date'] = moment.utc(dateDeal(firstLine['deposit-date'])).toDate();
                            var date_key = mapping.date_key;
                            // log.debug('line[date_key:',line[date_key]);
                            line[date_key + "-txt"] = line[date_key];
                            if (line[date_key]) {
                                line[date_key] = interfun.getFormatedDate("", "", line[date_key]).date;
                            }
                            Object.keys(mapping.mapping).map(function (field_id) {
                                var values = line[mapping.mapping[field_id]];
                                if (values && JSON.stringify(values).length < 300) {
                                    if (mapping.mapping[field_id] == date_key) {
                                        rec.setCurrentSublistText({sublistId:"recmachcustrecord_settlement_link",fieldId:field_id,text:values})
                                    } else {
                                        rec.setCurrentSublistValue({sublistId:"recmachcustrecord_settlement_link",fieldId:field_id,value:values})
                                    }
                                } else if (values && JSON.stringify(values).length >= 300) {
                                    rec.setCurrentSublistValue({sublistId:"recmachcustrecord_settlement_link",fieldId:field_id,value:values.substring(0,299)})
                                }
                            });
                            if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                                rec.setCurrentSublistText({
                                    sublistId:"recmachcustrecord_settlement_link",
                                    fieldId: "custrecord_settlement_start",
                                    text: interfun.getFormatedDate("", "", line["settlement-start-date"]).date
                                });
                                rec.setCurrentSublistText({
                                    sublistId:"recmachcustrecord_settlement_link",
                                    fieldId: "custrecord_settlement_enddate",
                                    text: interfun.getFormatedDate("", "", line["settlement-end-date"]).date
                                });
                            }
                            rec.commitLine({sublistId:"recmachcustrecord_settlement_link"})
                    })
                    var ss = rec.save()  
                    log.debug("00000000000000头表保存成功",ss)
                    return 
                }
                var ss = "success ,"+" 耗时："+ (new Date().getTime() -startT)
                log.debug("000000000000a耗时:",ss)
            } catch (error) {
                log.error("000000000000error:",error)
            }
           return
            try {
                vArray.map(function (v) {
                    log.error("v:", v)
                    // log.audit("JSON.parse(ctx.value)",JSON.stringify(v));
                    acc_id = Number(v.acc_id),
                        id = Number(v.id),
                        type = v.type,
                        line = v.line,
                        firstLine = v.firstLine;
                     
                    line['report-id'] = id;
                    line['account'] = acc_id;
                    if (type == core.enums.report_type._GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_) {
                        line['deposit-date'] = firstLine['deposit-date'];
                        line['total-amount'] = firstLine['total-amount'];
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

                    var date_key = mapping.date_key;
                    // log.debug('line[date_key:',line[date_key]);
                    line[date_key + "-txt"] = line[date_key];
                    if (line[date_key]) {
                        line[date_key] = interfun.getFormatedDate("", "", line[date_key]).date;
                    }
                    Object.keys(mapping.mapping).map(function (field_id) {
                        var values = line[mapping.mapping[field_id]];
                        if (values && JSON.stringify(values).length < 300) {
                            if (mapping.mapping[field_id] == date_key) {
                                rec.setText({
                                    fieldId: field_id,
                                    text: values
                                });
                            } else {
                                rec.setValue({
                                    fieldId: field_id,
                                    value: values
                                });
                            }
                        } else if (values && JSON.stringify(values).length >= 300) {
                            log.error('else if values', values);
                            rec.setValue({
                                fieldId: field_id,
                                value: values.substring(0, 19)
                            });
                        }

                    });


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
                        rec.setText({
                            fieldId: "custrecord_settlement_start",
                            text: interfun.getFormatedDate("", "", line["settlement-start-date"]).date
                        });
                        rec.setText({
                            fieldId: "custrecord_settlement_enddate",
                            text: interfun.getFormatedDate("", "", line["settlement-end-date"]).date
                        });
                    }
                    var ss = rec.save();
                    log.debug('rec.id', ss);
                })
            } catch (err) {
                var ss = createMissingReport(type, id, err, acc_id)
                log.error('error:save id:' + ss, err);
            }

        };


        function dateDeal(str) {
            var strs = str.substring(0, 10)
            var ins = strs.split(".")[0].length
            var s_d = str
            if (ins < 4) {
                s_d = strs.split(".")[2] + "/" + strs.split(".")[1] + "/" + strs.split(".")[0] + " " + str.substring(11, 19)
            } else {
                if (str.indexOf("UTC") > -1)
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
        function createMissingReport(repoty, repo_id, reason, acc) {
            var mo;
            var fils = []
            repoty ? fils.push({ name: 'custrecord_amazon_missing_rep', operator: 'anyof', values: repoty }) : ""
            repo_id ? fils.push({ name: 'custrecord_amazon_missing_reportid', operator: 'anyof', values: repo_id }) : ""
            acc ? fils.push({ name: 'custrecord_amazon_missing_account', operator: 'anyof', values: acc }) : ""
            search.create({
                type: 'customrecord_amazon_missing_report',
                filters: fils
            }).run().each(function (rec) {
                mo = record.load({
                    type: 'customrecord_amazon_missing_report',
                    id: rec.id
                });
                return false;
            });
            if (!mo) {
                mo = record.create({
                    type: 'customrecord_amazon_missing_report',
                    isDynamic: true,
                });
            }
            repoty ?
                mo.setValue({
                    fieldId: 'custrecord_amazon_missing_rep',
                    value: repoty
                }) : ""; //类型
            acc ?
                mo.setValue({
                    fieldId: 'custrecord_amazon_missing_account',
                    value: acc
                }) : "";
            repo_id ?
                mo.setValue({
                    fieldId: 'custrecord_amazon_missing_reportid',
                    value: repo_id
                }) : "";
            reason ?
                mo.setValue({
                    fieldId: 'custrecord_amazon_missing_reason',
                    value: reason
                }) : "";
            //设置为false，重新拉一次
            record.submitFields({
                type: "customrecord_aio_amazon_report",
                id: repo_id,
                values: {
                    custrecord_aio_origin_report_is_download: false
                }
            })
            return mo.save();
        };

        exports.reduce = function (ctx) { };
        exports.summarize = function (ctx) {
            log.audit("处理完成", ctx)
        };
    });