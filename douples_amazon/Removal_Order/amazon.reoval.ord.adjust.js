/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-20 21:12:41
 * @LastEditTime   : 2020-09-30 15:21:45
 * @LastEditors    : Li
 * @Description    : 退货报损、库存动作详情报损、移除调整
 * @FilePath       : \douples_amazon\Removal_Order\amazon.reoval.ord.adjust.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', '../Helper/interfunction.min',
    'N/runtime', "../Helper/Moment.min"
], function(log, search, record, interfun, runtime, moment) {
    const cus_adjAccount = 654; //   538 // 6601.49	 报损
    const eve_adjAccount = 538; //   538 // 6601.49	 报损
    const fmt = "yyyy-M-d"

    const gol_mome = "平台发货成本-退回";

    // 科目：6401.01.01 主营业务成本 : 货款 : Amazon
    // 摘要：平台发货成本 - 退回 + 字段 [detailed - disposition]

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object}
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData() {
        var orders = [],
            limit = 3000
        var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_defect_acc' });
        var group = runtime.getCurrentScript().getParameter({ name: 'custscript_defect_group' });

        var _start_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_am_inv_adjust_start_date' });
        var _end_date = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_am_inv_adjust_end_date' });

        // 1 退货报损            2 库存动作详情报损            3 移除货件调拨
        var run_type = runtime.getCurrentScript().getParameter({ name: 'custscript_dps_am_inv_adjust_run_type' });

        var data_length = runtime.getCurrentScript().getParameter({ name: 'custscript_am_inv_adjust_data_type' }); // 执行数据的长度

        if (data_length && data_length <= 4000) {
            limit = data_length
        }

        if (run_type == 1) { // 退货报损

            var fils = [
                { name: 'custrecord_aio_b2c_return_detailed_disp', operator: 'isnot', values: 'SELLABLE' },
                // { name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: '2020-6-1' },
                { name: 'custrecord_return_bs', operator: 'is', values: false },
                { name: 'isinactive', join: "custrecord_aio_b2c_return_aio_account", operator: 'is', values: false }
            ]
            if (acc) {
                fils.push({ name: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: acc })
            }
            if (group) {
                fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: group })
            }

            if (_start_date && _end_date) {
                fils.push({ name: 'custrecord_aio_b2c_return_return_date', operator: 'within', values: [_dateFormat(_start_date, fmt), _dateFormat(_end_date, fmt)] })
            } else if (_start_date && !_end_date) {
                fils.push({ name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: [_dateFormat(_start_date, fmt)] })
            } else if (!_start_date && _end_date) {
                fils.push({ name: 'custrecord_aio_b2c_return_return_date', operator: 'onorbefore', values: [_dateFormat(_end_date, fmt)] })
            } else {
                fils.push({ name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: '2020-6-1' })
            }


            // 退货报告
            search.create({
                type: 'customrecord_aio_amazon_customer_return',
                filters: fils,
                columns: [
                    { name: 'custrecord_aio_b2c_return_aio_account' },
                    { name: 'custrecord_amazon_returndate_text' },
                    { name: 'custrecord_aio_b2c_return_detailed_disp' },
                    { name: 'custrecord_aio_b2c_return_quantity' },
                    { name: 'custrecord_aio_b2_creturn_sku' },
                    { name: 'custrecord_division', join: 'custrecord_aio_b2c_return_aio_account' },
                    { name: 'custrecord_aio_subsidiary', join: 'custrecord_aio_b2c_return_aio_account' },
                    { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_aio_b2c_return_aio_account' }

                ]
            }).run().each(function(rec) {
                orders.push({
                    'rec_id': rec.id,
                    'acc': rec.getValue(rec.columns[0]),
                    "acc_text": rec.getText(rec.columns[0]),
                    'date': rec.getValue(rec.columns[1]),
                    'desc': rec.getValue(rec.columns[2]),
                    'qty': Number(rec.getValue(rec.columns[3])),
                    'sku': rec.getValue(rec.columns[4]),
                    'division': rec.getValue(rec.columns[5]),
                    'subsidiary': rec.getValue(rec.columns[6]),
                    'location': rec.getValue(rec.columns[7]),
                    'rec_type': 'customrecord_aio_amazon_customer_return',
                    'ck_filed': 'custrecord_return_bs'
                })
                return --limit > 0
            })
        } else if (run_type == 2) { // ==================搜索库存动作详情

            fils = []
            if (acc) {
                fils.push({ name: 'custrecord_invful_account', operator: 'anyof', values: acc })
            }
            if (group) {
                fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_invful_account', operator: 'anyof', values: group })
            }

            if (_start_date && _end_date) {
                fils.push({ name: 'custrecord_invful_snapshot_date', operator: 'within', values: [_dateFormat(_start_date, fmt), _dateFormat(_end_date, fmt)] })
            } else if (_start_date && !_end_date) {
                fils.push({ name: 'custrecord_invful_snapshot_date', operator: 'onorafter', values: [_dateFormat(_start_date, fmt)] })
            } else if (!_start_date && _end_date) {
                fils.push({ name: 'custrecord_invful_snapshot_date', operator: 'onorbefore', values: [_dateFormat(_end_date, fmt)] })
            } else {
                fils.push({ name: 'custrecord_invful_snapshot_date', operator: 'onorafter', values: '2020-6-1' })
            }

            fils.push({ name: 'custrecord_invful_transation_type', operator: 'is', values: 'VendorReturns' })
            fils.push({ name: 'custrecord_dps_invful_processed', operator: 'is', values: false })
            fils.push({ name: 'custrecord_invful_disposition', operator: 'isnot', values: "SELLABLE" })
            fils.push({ name: 'isinactive', join: "custrecord_invful_account", operator: 'is', values: false })
            search.create({
                type: 'customrecord_amazon_fulfill_invtory_rep',
                filters: fils,
                columns: [
                    { name: 'custrecord_invful_account' },
                    { name: 'custrecord_invful_snapshot_date_txt' },
                    { name: 'custrecord_invful_disposition' },
                    { name: 'custrecord_invful_quantity' },
                    { name: 'custrecord_invful_sku' },
                    { name: 'custrecord_division', join: 'custrecord_invful_account' },
                    { name: 'custrecord_aio_subsidiary', join: 'custrecord_invful_account' },
                    { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_invful_account' }
                ]
            }).run().each(function(rec) {
                orders.push({
                    'rec_id': rec.id,
                    'acc': rec.getValue(rec.columns[0]),
                    'acc_text': rec.getText(rec.columns[0]),
                    'date': rec.getValue(rec.columns[1]),
                    'desc': rec.getValue(rec.columns[2]),
                    'qty': rec.getValue(rec.columns[3]),
                    'sku': rec.getValue(rec.columns[4]),
                    'division': rec.getValue(rec.columns[5]),
                    'subsidiary': rec.getValue(rec.columns[6]),
                    'location': rec.getValue(rec.columns[7]),
                    'rec_type': 'customrecord_amazon_fulfill_invtory_rep',
                    'ck_filed': 'custrecord_dps_invful_processed'
                })
                return --limit > 0
            })
        } else { // 移除货件调拨

            fils = []
            if (acc) {
                fils.push({ name: 'custrecord_remo_shipment_account', operator: 'anyof', values: acc })
            }
            if (group) {
                fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_remo_shipment_account', operator: 'anyof', values: group })
            }

            if (_start_date && _end_date) {
                fils.push({ name: 'custrecord_aio_removal_shoment_date', operator: 'within', values: [_dateFormat(_start_date, fmt), _dateFormat(_end_date, fmt)] })
            } else if (_start_date && !_end_date) {
                fils.push({ name: 'custrecord_aio_removal_shoment_date', operator: 'onorafter', values: [_dateFormat(_start_date, fmt)] })
            } else if (!_start_date && _end_date) {
                fils.push({ name: 'custrecord_aio_removal_shoment_date', operator: 'onorbefore', values: [_dateFormat(_end_date, fmt)] })
            } else {
                fils.push({ name: 'custrecord_aio_removal_shoment_date', operator: 'onorafter', values: '2020-6-1' })
            }

            fils.push({ name: 'custrecord_aio_rmv_disposition', operator: 'is', values: 'Sellable' })
            fils.push({ name: 'custrecord_aio_rmv_ck', operator: 'is', values: false })
            search.create({
                type: 'customrecord_aio_amazon_removal_shipment',
                filters: fils,
                columns: [
                    { name: 'custrecord_remo_shipment_account' },
                    { name: 'custrecord_aio_rmv_date' },
                    { name: 'custrecord_aio_rmv_disposition' },
                    { name: 'custrecord_aio_rmv_shipped_qty' },
                    { name: 'custrecord_aio_rmv_sku' },
                    { name: 'custrecord_division', join: 'custrecord_remo_shipment_account' },
                    { name: 'custrecord_aio_subsidiary', join: 'custrecord_remo_shipment_account' },
                    { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_remo_shipment_account' },
                    { name: 'custrecord_aio_rmv_order_id' }
                ]
            }).run().each(function(rec) {
                orders.push({
                    'rec_id': rec.id,
                    'acc': rec.getValue(rec.columns[0]),
                    'acc_text': rec.getText(rec.columns[0]),
                    'date': rec.getValue(rec.columns[1]),
                    'desc': rec.getValue(rec.columns[2]),
                    'qty': rec.getValue(rec.columns[3]),
                    'sku': rec.getValue(rec.columns[4]),
                    'division': rec.getValue(rec.columns[5]),
                    'subsidiary': rec.getValue(rec.columns[6]),
                    'location': rec.getValue(rec.columns[7]),
                    'orderid': rec.getValue(rec.columns[8]),
                    'rec_type': 'customrecord_aio_amazon_removal_shipment',
                    'ck_filed': 'custrecord_aio_rmv_ck'
                })
                return --limit > 0
            })
        }

        log.audit('orders:' + orders.length, orders)
        return orders
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var startT = new Date().getTime();
        var obj = JSON.parse(context.value);
        log.debug("obj", context.value);
        var rec_type = obj.rec_type;
        try {
            if (rec_type == 'customrecord_aio_amazon_removal_shipment') {
                var t_ord
                search.create({
                    type: 'customrecord_aio_amazon_removal_shipment',
                    filters: [
                        { name: 'custbody_rel_removal_shipment', operator: 'anyof', values: obj.rec_id }
                    ]
                }).run().each(function(fd) {
                    t_ord = record.load({
                        type: 'transferorder',
                        id: fd.id
                    })
                })
                // 移除出库，做调拨单
                if (!t_ord) {
                    t_ord = record.create({
                        type: 'transferorder',
                        isDynamic: true
                    })
                    t_ord.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
                    t_ord.setValue({ fieldId: 'location', value: obj.location })

                    var temp_date_text = dealWithDate(obj.date, obj.acc_text);

                    rec.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', temp_date_text).date })

                    // t_ord.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date })
                    t_ord.setValue({ fieldId: 'custbody_dps_start_location', value: obj.location })
                    t_ord.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc })
                    t_ord.setValue({ fieldId: 'department', value: obj.division })
                    t_ord.setValue({ fieldId: 'custbody_rel_removal_shipment', value: obj.rec_id })
                    t_ord.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc })
                    t_ord.setValue({ fieldId: 'memo', value: 'FBA调拨货物出库（' + obj.orderid + '）' })
                    t_ord.setValue({ fieldId: 'transferlocation', value: 4 }); // 梅西仓
                    t_ord.setValue({ fieldId: 'custbody_actual_target_warehouse', value: 4 })
                    t_ord.setValue({ fieldId: 'custbody_dps_transferor_type', value: 4 }) // 类型是移库
                    t_ord.setValue({ fieldId: 'employee', value: runtime.getCurrentUser().id })
                    t_ord.selectNewLine({ sublistId: 'item' })
                    var rs = interfun.getskuId(obj.sku, obj.acc, '')
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: rs.skuid })
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: obj.qty })
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rs.averagecost })
                    // 其他字段
                    try {
                        t_ord.commitLine({ sublistId: 'item' })
                    } catch (err) {
                        throw (
                            'Error inserting item line: ' +
                            ', abort operation!' +
                            err
                        )
                    }
                    var t_ord_id = t_ord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                    log.debug('移库 创建调拨单成功：' + t_ord_id)
                }
                var filds = {}
                filds[obj.ck_filed] = true
                record.submitFields({
                    type: obj.rec_type,
                    id: obj.rec_id,
                    values: filds
                })
            } else {
                var rec, fils = []


                if (obj.rec_type == 'customrecord_aio_amazon_customer_return') {
                    fils.push({ name: 'custbody_origin_customer_return_order', operator: 'anyof', values: obj.rec_id })
                    // 退货报告
                } else {
                    // 来源库存动作详情
                    fils.push({ name: 'custbody_rel_fulfillment_invreq', operator: 'anyof', values: obj.rec_id })
                }
                search.create({
                    type: 'inventoryadjustment',
                    filters: fils
                }).run().each(function(fd) {
                    rec = record.load({
                        type: 'inventoryadjustment',
                        id: fd.id
                    })
                })
                if (!rec) {
                    rec = record.create({ type: 'inventoryadjustment', isDynamic: true })
                    rec.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
                    // rec.setValue({ fieldId: 'account', value: adjAccount })
                    rec.setValue({ fieldId: 'department', value: obj.division })
                    rec.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc })
                    rec.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc })
                    if (obj.rec_type == 'customrecord_aio_amazon_customer_return') {
                        rec.setValue({ fieldId: 'account', value: cus_adjAccount })

                        rec.setValue({ fieldId: 'memo', value: gol_mome + obj.desc });
                        // 退货报告
                        rec.setValue({ fieldId: 'custbody_origin_customer_return_order', value: obj.rec_id })
                    } else {
                        rec.setValue({ fieldId: 'account', value: eve_adjAccount })
                        rec.setValue({ fieldId: 'memo', value: 'FBA仓报损' })
                        // 来源库存动作详情
                        rec.setValue({ fieldId: 'custbody_rel_fulfillment_invreq', value: obj.rec_id })
                    }

                    var temp_date_text = dealWithDate(obj.date, obj.acc_text);

                    rec.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', temp_date_text).date })
                    // rec.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date })

                    rec.selectNewLine({ sublistId: 'inventory' });

                    var sku = interfun.getskuId(obj.sku, obj.acc).skuid;
                    log.debug("货品", sku);

                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: sku })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: obj.location })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: obj.qty })
                    // rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'newquantity', value: obj.qty })
                    rec.commitLine({ sublistId: 'inventory' })
                    var inventoryadjustment_save = rec.save({
                        ignoreMandatoryFields: true
                    })
                    log.debug('库存调整成功', inventoryadjustment_save)
                }
                var filds = {}
                filds[obj.ck_filed] = true
                record.submitFields({
                    type: obj.rec_type,
                    id: obj.rec_id,
                    values: filds
                })
            }
        } catch (e) {
            log.error('出错', e)
        }
        var ss = '耗时：' + (new Date().getTime() - startT)
        log.audit('obj.rec_id:' + obj.rec_id, ss)
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {}

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        log.audit('处理完成 summary', summary)
    }


    function _dateFormat(date, fmt) {
        var o = {
            'M+': date.getMonth() + 1,
            'd+': date.getDate(),
            'h+': date.getHours(),
            'm+': date.getMinutes(),
            's+': date.getSeconds(),
            'q+': Math.floor((date.getMonth() + 3) / 3),
            'S': date.getMilliseconds()
        }
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
        }
        for (var k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
            }
        }
        return fmt
    }


    /**
     * 处理 JP/AU 的时区问题
     * @param {*} dateText  text格式的时间
     * @param {*} accountName  店铺名称
     */
    function dealWithDate(dateText, accountName) {

        if (accountName.indexOf(".JP") > -1) {
            var temp_time = moment(dateText).toISOString();
            var time_jp_add = 9
            var temp_z_jp_add = new Date(new Date(temp_time).getTime() + time_jp_add * 60 * 60 * 1000).toISOString();
            var re_tiem_jp = temp_z_jp_add.replace(".000Z", "+09:00");
            return re_tiem_jp;
        } else if (accountName.indexOf(".AU") > -1) {
            var temp_time = moment(dateText).toISOString();
            var time_au_add = 10;
            var temp_z_au_add = new Date(new Date(temp_time).getTime() + time_au_add * 60 * 60 * 1000).toISOString();
            var re_tiem_au = temp_z_au_add.replace(".000Z", "+10:00");
            return re_tiem_au;
        } else {
            var temp_date = moment(dateText).toISOString();
            var re_tiem_au = temp_date.replace(".000Z", "+00:00");
            return re_tiem_au;
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
})