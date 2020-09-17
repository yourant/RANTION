/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 19:08:37
 * @LastEditTime   : 2020-09-17 11:04:01
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {


    const _invAdjAccount = 526; // 库存调整的科目
    const _subsidiary = 5; // 蓝深贸易有限公司

    function _post(context) {


        // 一次性限制于 350
        // log.audit('context', context.data[0]);

        // log.debug('typeof ', typeof(context));
        // log.debug('typeof ', typeof(context.data));


        var temp_arr = [];
        var dealDate = context.data.slice(0, 100); // 限制于 100 条数据
        log.audit('dealDate 第一个数据', dealDate[0]);
        try {


            dealDate.map(function(info) {

                var temp_inadju = inventoryAdjustment(info);
                if (temp_inadju) {
                    temp_arr.push(temp_arr)
                }
            });
        } catch (error) {
            log.error('生成库存调整单出错了', error);
        }

        return {
            msg: ' 处理完成',
            data: "总共处理数据量： " + dealDate.length + ", 处理成功数量： " + temp_arr.length
        }

    }


    /**
     * 生成库存调整单, 子公司 和 盘盈盘亏 状态归总
     * @param {Object} info
     */
    function inventoryAdjustment(info) {

        var invAdj = record.create({
            type: 'inventoryadjustment',
        });
        invAdj.setValue({
            fieldId: 'subsidiary',
            value: _subsidiary
        });
        invAdj.setValue({
            fieldId: 'memo',
            value: "Amazon & NS月度库存差异 调整"
        });
        invAdj.setValue({
            fieldId: 'account',
            value: _invAdjAccount
        });

        // 32 盘盈入库
        // 33 盘亏出库

        var ama_type = 32;
        if (info.custpage_label_inv_diff_qty < 0) {
            ama_type = 33;
        }

        invAdj.setValue({
            fieldId: 'custbody_stock_use_type',
            value: ama_type
        });
        invAdj.setText({
            fieldId: 'trandate',
            text: info.custpage_label_inv_moninv_month
        });
        invAdj.setText({
            fieldId: 'department',
            text: info.custpage_label_deparment
        });

        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'item',
            value: info.custpage_label_sku,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'location',
            value: info.custpage_label_location,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'adjustqtyby',
            value: info.custpage_label_inv_diff_qty,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'unitcost',
            value: info.custpage_label_inv_locationaveragecost,
            line: 0
        });

        var invAdj_id = invAdj.save();
        log.debug('库存调整单', invAdj_id);


        if (invAdj_id) {

            // {
            //     "custpage_label_location":"57",
            //     "custpage_label_sku":"3937",
            //     "custpage_label_inv_diff_qty":-3580,
            //     "custpage_label_msku":"HP115-UK-GM-FBA",
            //     "custpage_label_fnsku":"",
            //     "custpage_label_inv_moninv_month":"2020-6-30",
            //     "custpage_label_deparment":"LR事业部",
            //     "custpage_label_inv_locationaveragecost":"29.66",
            //     "custpage_label_inv_recid_arr":[
            //         {
            //             "msku":"HP115-AD-FR-FBA",
            //             "itemId":"3937",
            //             "end_qty":"70",
            //             "fba_location":"57",
            //             "custpage_label_amazon_qty":"70",
            //             "custpage_label_msku":"HP115-AD-FR-FBA",
            //             "custpage_label_sku":"3937",
            //             "custpage_label_inv_moninv_month":"2020-6-30",
            //             "custpage_label_fnsku":"X000UJO20N"
            //         },
            //         {
            //             "msku":"HP115-UK-GM-FBA",
            //             "itemId":"3937",
            //             "end_qty":"16",
            //             "fba_location":"57",
            //             "custpage_label_amazon_qty":"16",
            //             "custpage_label_msku":"HP115-UK-GM-FBA",
            //             "custpage_label_sku":"3937",
            //             "custpage_label_inv_moninv_month":"2020-6-30",
            //             "custpage_label_fnsku":"X000UB3CDJ"
            //         }
            //     ]
            // }


            var invFilter = [];
            var recInfo = info.custpage_label_inv_recid_arr;

            recInfo.map(function(_info, _key) {

                if (_key == 0) {
                    invFilter.push(
                        [
                            ['custrecord_moninv_month', 'on', _info.custpage_label_inv_moninv_month],
                            "and",
                            ["custrecord_moninv_sku", 'is', _info.custpage_label_msku],
                            "and",
                            ['custrecord_moninv_fnsku', 'is', _info.custpage_label_fnsku]
                        ]
                    );
                } else {
                    invFilter.push("or",
                        [
                            ['custrecord_moninv_month', 'on', _info.custpage_label_inv_moninv_month],
                            "and",
                            ["custrecord_moninv_sku", 'is', _info.custpage_label_msku],
                            "and",
                            ['custrecord_moninv_fnsku', 'is', _info.custpage_label_fnsku]
                        ]
                    );
                }
            });

            log.debug("invFilter", invFilter);

            var searchArr = [];
            search.create({
                type: "customrecord_amazon_monthinventory_rep",
                filters: invFilter
            }).run().each(function(rec) {
                searchArr.push(rec.id);
                record.submitFields({
                    type: 'customrecord_amazon_monthinventory_rep',
                    id: rec.id,
                    values: {
                        custrecord_dps_li_inventoryadjust_rec: invAdj_id,
                        custrecord_moninv_adjustment_order: true
                    }
                });

                return true;
            })

            log.debug('searchArr  ' + searchArr.length, searchArr)
        }
        return invAdj_id;

    }

    return {
        post: _post
    }
});