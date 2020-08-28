/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 19:08:37
 * @LastEditTime   : 2020-08-25 10:41:59
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {


    function _post(context) {

        log.debug('context', context);

        log.debug('typeof ', typeof (context));
        log.debug('typeof ', typeof (context.data));

        var typeof_data = typeof (context.data);

        return {
            msg: ' 已接收',
            data: typeof_data
        }

    }




    function inventoryAdjustment(recId) {

        var info = {};
        var limit = 3999;

        var TRANSACTION_TYPE = ["VendorReturns"];
        var DISPOSITION = ["CUSTOMER_DAMAGED", "DEFECTIVE", "DISTRIBUTOR_DAMAGED", "CARRIER_DAMAGED"];
        search.create({
            type: "customrecord_amazon_fulfill_invtory_rep",
            filters: [{
                    isnot: false,
                    isor: false,
                    name: "custrecord_invful_transation_type",
                    operator: "startswith",
                    values: ["VendorReturns"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["CARRIER_DAMAGED"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["DISTRIBUTOR_DAMAGED"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["DEFECTIVE"]
                },
                {
                    isnot: false,
                    isor: false,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["CUSTOMER_DAMAGED"]
                },
                {
                    name: 'custrecord_dps_invful_processed',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [{
                    name: "custrecord_division",
                    join: 'custrecord_invful_account'
                }, // 部门
                {
                    name: 'custrecord_aio_subsidiary',
                    join: 'custrecord_invful_account'
                }, // 子公司
                {
                    name: 'custrecord_aio_fbaorder_location',
                    join: 'custrecord_invful_account'
                }, // 地点
                {
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_invful_account'
                }, // sellerId
                "custrecord_invful_quantity", // 数量
                "custrecord_invful_transation_type", // TRANSACTION-TYPE
                "custrecord_invful_fnsku", // fnsku
                "custrecord_invful_sku", // SKU
                "custrecord_invful_snapshot_date", // SNAPSHOT-DATE
            ]
        }).run().each(function (r) {
            info = {
                snapshot_date: r.getValue('custrecord_invful_snapshot_date'),
                sellerId: r.getValue({
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_invful_account'
                }),
                subsidiary: r.getValue({
                    name: 'custrecord_aio_subsidiary',
                    join: 'custrecord_invful_account'
                }),
                department: r.getValue({
                    name: "custrecord_division",
                    join: 'custrecord_invful_account'
                }),
                location: r.getValue({
                    name: 'custrecord_aio_fbaorder_location',
                    join: 'custrecord_invful_account'
                }),
                qty: r.getValue('custrecord_invful_quantity'),
                transation_type: r.getValue('custrecord_invful_transation_type'),
                fnsku: r.getValue('custrecord_invful_fnsku'),
                sku: r.getValue('custrecord_invful_sku')
            }

            return --limit > 0;
        });

        search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: [{
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_ass_account',
                    operator: 'is',
                    values: info.sellerId
                },
                {
                    name: 'name',
                    operator: 'is',
                    values: info.sku
                }
            ],
            columns: [
                "custrecord_ass_sku", // NS 货品
            ]
        }).run().each(function (rec) {
            info.itemId = rec.getValue('custrecord_ass_sku')
        });

        var invAdj = record.create({
            type: 'inventoryadjustment',

        });
        invAdj.setValue({
            fieldId: 'subsidiary',
            value: info.subsidiary
        });
        invAdj.setValue({
            fieldId: 'memo',
            value: "FBA仓报损"
        });
        invAdj.setValue({
            fieldId: 'account',
            value: 538
        });
        invAdj.setValue({
            fieldId: 'custbody_stock_use_type',
            value: 40
        });
        invAdj.setText({
            fieldId: 'trandate',
            text: info.snapshot_date
        });
        invAdj.setValue({
            fieldId: 'department',
            value: info.department
        });

        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'item',
            value: info.itemid,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'location',
            value: info.itemid,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'adjustqtyby',
            value: info.qty,
            line: 0
        });

        var invAdj_id = invAdj.save();
        log.debug('库存调整单', invAdj_id);

    }

    return {
        post: _post
    }
});