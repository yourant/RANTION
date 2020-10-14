/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 19:08:37
 * @LastEditTime   : 2020-10-13 15:09:40
 * @LastEditors    : Li
 * @Description    : 根据月度库存差异报表生成库存调整单
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function(record, search, log, runtime) {


    const _invAdjAccount = 526; // 库存调整的科目
    const _subsidiary = 5; // 蓝深贸易有限公司

    function _post(context) {

        var temp_arr = [];
        var dealDate = context.data.slice(0, 100); // 限制于 100 条数据
        log.audit('dealDate 第一个数据', dealDate[0]);
        var inventory_snapshot_id;

        try {
            //生成快照
            var inventory_snapshot = record.create({ type: 'customrecord_amazom_inventory_snapshot', isDynamic: true });
            inventory_snapshot.setValue({ fieldId: 'owner', value: runtime.getCurrentUser().id });
            var sublist_id = 'recmachcustrecord_amazom_inv_snap_id';
            dealDate.map(function(info) {
                var temp_inadju = inventoryAdjustment(info, inventory_snapshot, sublist_id);
                if (temp_inadju) {
                    temp_arr.push(temp_arr)
                }
            });

            if (temp_arr.length) {
                inventory_snapshot_id = inventory_snapshot.save();
                log.debug("快照 ID", inventory_snapshot_id)
            }
        } catch (error) {
            log.error('生成库存调整单出错了', error);
            if (inventory_snapshot_id) {
                //删除创建了的快照明细
                var err_ids = [];
                search.create({
                    type: 'customrecord_amazom_inventory_snap_line',
                    filters: [
                        { name: 'custrecord_amazom_inv_snap_id', operator: 'anyof', values: inventory_snapshot_id },
                    ]
                }).run().each(function(rec) {
                    err_ids.push(rec.id);
                    return true;
                });
                if (err_ids.length > 0) {
                    err_ids.map(function(line) {
                        record.delete({
                            type: 'customrecord_amazom_inventory_snap_line',
                            id: line
                        });
                    });
                }
                //删除快照主记录
                record.delete({
                    type: 'customrecord_amazom_inventory_snapshot',
                    id: inventory_snapshot_id
                });
            }
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
    function inventoryAdjustment(info, inventory_snapshot, sublist_id) {

        var invAdj = record.create({
            type: 'inventoryadjustment',
            isDynamic: true
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

        invAdj.selectNewLine({ sublistId: 'inventory' });

        invAdj.setCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'item',
            value: info.custpage_label_sku,
        });
        invAdj.setCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'location',
            value: info.custpage_label_location,
        });

        if (info.custpage_label_inv_diff_qty > 0) { // 若属于盘盈入库, 则先设置未 盘亏出库, 获取当前的库存成本, 在设置回正确的值
            invAdj.setCurrentSublistValue({
                sublistId: 'inventory',
                fieldId: 'adjustqtyby',
                value: -info.custpage_label_inv_diff_qty,
            });

        }
        invAdj.setCurrentSublistValue({
            sublistId: 'inventory',
            fieldId: 'adjustqtyby',
            value: info.custpage_label_inv_diff_qty,
        });

        // invAdj.setCurrentSublistValue({
        //     sublistId: 'inventory',
        //     fieldId: 'unitcost',
        //     value: info.custpage_label_inv_locationaveragecost,
        // });

        invAdj.commitLine({ sublistId: 'inventory' });
        // var invAdj_id;
        var invAdj_id = invAdj.save({
            ignoreMandatoryFields: true
        });
        log.debug('库存调整单', invAdj_id);


        if (invAdj_id) {
            // if (1) {

            var invFilter = [];
            var recInfo = info.custpage_label_inv_recid_arr;
            invFilter.push(['custrecord_moninv_end_quantity', 'notequalto', ['0']]);

            recInfo.map(function(_info, _key) {

                if (_key == 0) {
                    invFilter.push('and',
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

            log.debug('searchArr  月度库存标记 内部ID  ' + searchArr.length, searchArr);

            //生成快照明细
            inventory_snapshot.selectNewLine({ sublistId: sublist_id });
            inventory_snapshot.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_warehouse', value: info.custpage_label_location }); //仓库
            inventory_snapshot.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_sku', value: info.custpage_label_sku }); //SKU
            inventory_snapshot.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_aquantity', value: info.custpage_label_amazon_qty }); //Amazon结余量
            inventory_snapshot.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_nquantity', value: info.custpage_label_ns_qty }); //NS结余量
            inventory_snapshot.setCurrentSublistValue({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_diffquantity', value: info.custpage_label_inv_diff_qty }); //库存差异
            inventory_snapshot.setCurrentSublistText({ sublistId: sublist_id, fieldId: 'custrecord_amazom_inv_snap_date', text: info.custpage_label_inv_moninv_month }); //时间
            inventory_snapshot.commitLine({ sublistId: sublist_id });

        }
        return invAdj_id;

    }

    return {
        post: _post
    }
});