/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-08 17:33:48
 * @LastEditTime   : 2020-07-09 12:00:05
 * @LastEditors    : Li
 * @Description    : 根据结算报告设置对应发票的相关的值
 * @FilePath       : \douples_amazon\dps.setvalue.invoice.settlement.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function getInputData() {


        var ordArr = [],
            limit = 3999;
        search.create({
            type: "journalentry",
            filters: [
                ["memomain", "contains", "02"],
                "and",
                ["custbody_coll_s", "noneof", "@NONE@"],
                "and",
                // ["datecreated", "onorafter", ["2020年5月7日 12:00 上午"]],
                ["custbody_dps_invoice_mark", "is", false],
                // "and",
                ["mainline", "is", true],
                "and",
                ["custbody_jourentry_relative_checked", "is", false]
            ],
            columns: [{
                    name: "internalid",
                    summary: "group"
                },
                // {
                //     name: 'custbody_settlement_inv_ids'
                // }
            ]
        }).run().each(function (result) {
            ordArr.push(result.getValue(result.columns[0]))
            return --limit > 0
        });

        return ordArr;

    }

    function map(context) {

        var jourId = context.value;
        log.debug('jourId', jourId);
        var JourArr = searchJournal(jourId);
        var invArr;
        if (JourArr && JourArr.length > 0) {
            invArr = searchInvValue(JourArr);
            if (invArr && JourArr.length > 0) {
                invArr.map(function (inv) {
                    var jourId = inv.jourId,
                        it = {
                            shipId: inv.shipId,
                            invId: inv.invId
                        }
                    context.write({
                        key: jourId,
                        value: it
                    });
                })
            }
        }

    }


    function reduce(context) {
        var jourId = context.key;
        var inv = context.values;

        log.debug("jourId", jourId)
        log.debug("inv", inv)

        searchSettlementValue(inv, jourId);

    }

    function summarize(summary) {

    }

    /**
     * 搜索日记账中的发票数组
     * @param {*} jourId 
     */
    function searchJournal(jourId) {
        var invArr, invs;
        search.create({
            type: 'journalentry',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: [jourId]
            }],
            columns: [
                "custbody_settlement_inv_ids"
            ]
        }).run().each(function (rec) {
            invs = rec.getValue('custbody_settlement_inv_ids');
        });
        var it = {
            jourId: jourId,
            invArr: JSON.parse(invs)
        }

        invArr.push(it)

        return invArr || false;

    }


    /**
     * 搜索发票记录关联发货报告的 shipmentId
     * @param {*} invarr 
     */
    function searchInvValue(invarr) {
        var limit = 3999,
            invArr = [];
        search.create({
            type: 'invoice',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: invarr.invArr
            }],
            columns: [{
                name: 'custrecord_shipment_id',
                join: "custbody_shipment_report_rel"
            }]
        }).run().each(function (r) {
            var it = {
                jourId: invarr.jourId,
                invId: r.id,
                shipId: r.getValue({
                    name: 'custrecord_shipment_id',
                    join: "custbody_shipment_report_rel"
                })
            }
            invArr.push(it);
            return --limit > 0;
        });

        return invArr || false;

    }


    /**
     * 根据结算报告, 设置相关字段的值
     * @param {*} shipId 
     * @param {*} invId 
     */
    function searchSettlementValue(inv, jourId) {
        var lin = 3999,
            settArr = [];

        search.create({
            type: 'customrecord_aio_amazon_settlement',
            filters: [{
                name: 'custrecord_aio_sett_shipment_id',
                operator: 'is',
                values: inv.shipId
            }],
            columns: [
                "custrecord_aio_sett_id", // SETTLEMENT ID
                "custrecord_settlement_start", // start date
                "custrecord_settlement_enddate", // end date
                "custrecord_aio_sett_receipt_date", // receipt date
                "custrecord_aio_sett_deposit_date", // deposit date
            ]
        }).run().each(function (rec) {

            var sett_id = rec.getValue('custrecord_aio_sett_id'),
                start_date = rec.getValue('custrecord_settlement_start'),
                end_date = rec.getValue('custrecord_settlement_enddate'),
                deposit_date = rec.getValue('custrecord_aio_sett_deposit_date');

            var id = record.submitFields({
                type: "invoice",
                id: inv.invId,
                values: {
                    custbody_dp_settlement_id: sett_id,
                    custbody_dp_loans_s_date: start_date,
                    custbody_dp_loans_end_date: end_date,
                    custbody_dp_expected_due_date: deposit_date,
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });

            return --limit > 0;

        });

        record.submitFields({
            type: "journalentry",
            id: jourId,
            values: {
                custbody_dps_invoice_mark: true,
            },
            options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
            }
        });

    }


    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});