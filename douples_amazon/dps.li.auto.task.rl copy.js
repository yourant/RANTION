/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-16 10:12:35
 * @LastEditTime   : 2020-09-16 21:09:14
 * @LastEditors    : Li
 * @Description    : 外部程序调用, 触发定时任务
 * @FilePath       : \douples_amazon\dps.li.auto.task.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/task', 'N/search', 'N/record', 'N/log'], function(task, search, record, log) {

    const customrecord_id_group = [
        "customrecord_dps_li_account_group", // 记录
        "name", //       名称
        "isinactive", //         非活动
        "custrecord_dps_li_acc_group_submit_id", // 提交ID
        "custrecord_dps_li_acc_group_group", //         店铺分组
        "custrecord_dps_li_acc_group_shipment", //         发货报告
        "custrecord_dps_li_acc_group_financal", //         财务报告
        "custrecord_dps_li_acc_group_settlement_w", //        结算报告 冲销
        "custrecord_dps_li_acc_group_settlement_s", //         结算报告 结算
    ]

    const customer_acc = [
        "customrecord_dps_li_automatically_execut", // 记录
        "custrecord_dps_auto_execute_account", // 	店铺
        "custrecord_dps_li_submit_id", // 	提交ID
        "custrecord_dps_li_shipment_report", // 	发货报告
        "custrecord_dps_auto_execute_estimated", //   预估凭证
        "custrecord_dps_auto_execute_estimat_data", //	预估凭证 数据
        "custrecord_dps_li_settl_jour_w", //	结算报告(冲销)
        "custrecord_dps_li_settlement_voucher", //	结算凭证
        "custrecord_dps_li_settlement_voucher_dat", //	结算凭证 数据
        "custrecord_dps_li_returned_purchase", //	退货
        "custrecord_dps_li_returned_purchase_data", //	退货数据
        "custrecord_dps_li_credit_memo", //	贷项通知单
        "custrecord_dps_li_credit_memo_data", //	贷项通知单 数据
        "custrecord_dps_li_refund_settlement_cert", //	退款结算凭证
        "custrecord_dps_li_refund_settlement_data", //	退款结算凭证 数据
        "custrecord_dps_li_all_processed", //	全部处理完成
        "custrecord_dps_li_account_group", //	 店铺分组


    ]

    // 发货报告   Shipment
    // 结算报告 冲销   Settlement_w
    // 结算报告 结算   Settlement_s


    const taskScript = {
        Shipment: {
            scriptId: 'customscript_amazoz_so_fulfillment_mp',
            deploymentId: 'customdeploy_dps_li_amazoz_so_fulfillm'
        }, // 发货报告执行
        Settlement_w: {
            scriptId: 'customscript_dps_li_settlement_journal_w',
            deploymentId: 'customdeploy_dps_li_settl_jour_w_task'
        }, // 结算报告 冲销凭证
        Settlement_s: {
            scriptId: 'customscript_dps_li_settlement_journal_s',
            deploymentId: 'customdeploy_dps_li_settl_jour_s_task',
        } // 结算报告 冲销凭证
    };

    function _get(context) {

        try {

            var action = context.action;


            if (action) {
                return executeTaskByAccount(context);
                // return executeTask(context);
            } else {
                var it = {
                    code: 5,
                    msg: '请选择执行的动作'
                }
                return it
            }
        } catch (error) {
            log.error("启动任务出错了", error);
            return {
                code: 5,
                msg: '启动任务失败了'
            }
        }


    }

    function _post(context) {

        var action = context.action;

        try {
            if (action) {
                return executeTaskByAccount(context);
                return executeTask(context);
            } else {
                var it = {
                    code: 5,
                    msg: '请选择执行的动作'
                }
                return it
            }

        } catch (error) {
            log.error("启动任务出错了", error);
            return {
                code: 5,
                msg: '启动任务失败了'
            }

        }


    }


    function executeTask(context) {

        var action = context.action;
        var flag = context.flag;

        var retObj = {};

        if (action == "Shipment") { // 执行发货报告

            var ship_get = searchInfo(action);

            if (ship_get) {

                if (ship_get.submit_id) {
                    var taskStatus = task.checkStatus(ship_get.submit_id);

                    // PENDING      PROCESSING      COMPLETE      FAILED
                    if (taskStatus.status == "FAILED") {
                        var shipmentParam = {
                            custscript_fulfill_accgroup: ship_get.acc_group, // 店铺分组
                            custscript_full_bj: flag ? flag : "F", // 过滤的标准
                        }

                        log.audit("shipmentParam", shipmentParam);
                        retObj = submitMapReduceDeployment(taskScript[action].scriptId, taskScript[action].deploymentId, ship_get.rec_id, shipmentParam)

                    } else if (taskStatus.status == "COMPLETE") { // 直接退出,等待下一次

                        retObj = {
                            code: 7,
                            msg: '任务已经完成'
                        }

                    } else if (taskStatus.status == "PENDING") {
                        retObj = {
                            code: 2,
                            msg: '任务在等待中'
                        }
                    } else {
                        retObj = {
                            code: 1,
                            msg: '任务在处理中'
                        }
                    }
                } else {
                    var shipmentParam = {
                        custscript_fulfill_accgroup: ship_get.acc_group, // 店铺分组
                        custscript_full_bj: flag ? flag : "F", // 过滤的标准
                    }
                    retObj = submitMapReduceDeployment(taskScript[action].scriptId, taskScript[action].deploymentId, ship_get.rec_id, shipmentParam)

                }

            } else {
                retObj = {
                    code: 6,
                    msg: "没有可运行的数据"
                }

            }

        }

        return retObj;
    }

    function executeTaskByAccount(context) {

        var action = context.action;
        var flag = context.flag;

        var retObj = {};
        var runParam = {};
        var ship_get = searchInfoByAcc(action);

        if (ship_get && JSON.stringify(ship_get) != "{}") {

            if (action == "Shipment") { // 执行发货报告
                runParam = {
                    custscript_if_account: ship_get.accountId, // 店铺分组
                    custscript_full_bj: flag ? flag : "F", // 过滤的标准
                }

            } else if (action == "Settlement_w") { // 执行结算报告 冲销

                // 店铺分组     custscript_dps_li_sett_jour_w_acc_group
                // 店铺         custscript_dps_li_sett_jour_w_acc_accoun
                // 开始时间     custscript_dps_li_sett_jour_w_start_date
                // 结束时间     custscript_dps_li_sett_jour_w_end_date
                // runPage     custscript_dps_li_sett_jour_w_runpage
                // 订单号      custscript_dps_li_sett_jour_w_order_id

                runParam = {
                    custscript_dps_li_sett_jour_w_acc_accoun: ship_get.accountId, // 店铺
                }
            } else if (action == "Settlement_s") { // 执行结算报告 结算

                // 店铺分组     custscript_dps_li_sett_jour_s_acc_group
                // 店铺         custscript_dps_li_sett_jour_s_account
                // 开始时间     custscript_dps_li_sett_jour_s_start_date
                // 结束时间     custscript_dps_li_sett_jour_s_end_date
                // 订单号       custscript_dps_li_sett_jour_s_order_id
                // runPage     custscript_dps_li_sett_jour_s_runpage

                runParam = {
                    custscript_dps_li_sett_jour_s_account: ship_get.accountId, // 店铺分组
                }
            }

            if (ship_get.submit_id) {
                var taskStatus = task.checkStatus(ship_get.submit_id);

                log.audit("启动任务状态", taskStatus);

                // PENDING      PROCESSING      COMPLETE      FAILED
                if (taskStatus.status == "FAILED") {
                    retObj = submitMapReduceDeploymentByAcc(taskScript[action].scriptId, taskScript[action].deploymentId, ship_get.rec_id, runParam)
                } else if (taskStatus.status == "COMPLETE") { // 直接退出,等待下一次
                    retObj = {
                        code: 7,
                        msg: '任务已经完成'
                    }
                } else if (taskStatus.status == "PENDING") {
                    retObj = {
                        code: 2,
                        msg: '任务在等待中'
                    }
                } else {
                    retObj = {
                        code: 1,
                        msg: '任务在处理中'
                    }
                }
            } else {
                retObj = submitMapReduceDeploymentByAcc(taskScript[action].scriptId, taskScript[action].deploymentId, ship_get.rec_id, runParam)
            }

        } else {
            retObj = {
                code: 6,
                msg: "没有可运行的数据"
            }
        }

        return retObj;
    }

    function searchInfo(action) {
        var limit = 3999;

        var filter = [];
        filter.push({ name: 'isinactive', operator: 'is', values: false });

        if (action == "Shipment") {
            filter.push({ name: 'custrecord_dps_li_acc_group_shipment', operator: 'is', values: false })
        } else if (action == "Settlement_w") {
            filter.push({ name: 'custrecord_dps_li_acc_group_settlement_w', operator: 'is', values: false })
        } else if (action == "Settlement_s") {
            filter.push({ name: 'custrecord_dps_li_acc_group_settlement_s', operator: 'is', values: false })
        }

        var result = {};

        search.create({
            type: 'customrecord_dps_li_account_group',
            filters: filter,
            columns: [
                { name: 'internalid', sort: 'ASC' },
                "custrecord_dps_li_acc_group_submit_id", // 提交ID
                "custrecord_dps_li_acc_group_group", //         店铺分组
                "custrecord_dps_li_acc_group_shipment", //         发货报告
                "custrecord_dps_li_acc_group_financal", //         财务报告
                "custrecord_dps_li_acc_group_settlement_w", //        结算报告 冲销
                "custrecord_dps_li_acc_group_settlement_s", //         结算报告 结算
            ]
        }).run().each(function(_l) {
            result.rec_id = _l.id; // 记录ID
            result.submit_id = _l.getValue('custrecord_dps_li_acc_group_submit_id'); // 提交ID
            result.acc_group = _l.getValue('custrecord_dps_li_acc_group_group'); // 店铺分组
            result.Shipment = _l.getValue('custrecord_dps_li_acc_group_shipment'); // 发货报告
            result.financal = _l.getValue('custrecord_dps_li_acc_group_financal'); // 财务报告
            result.settlement_w = _l.getValue('custrecord_dps_li_acc_group_settlement_w'); // 结算报告 冲销
            result.settlement_s = _l.getValue('custrecord_dps_li_acc_group_settlement_s'); // 结算报告 结算
        });

        return result;
    }

    /**
     * 获取未跑的店铺数据
     * @param {String} action
     */
    function searchInfoByAcc(action) {

        var getResult = {};
        var filter = [];
        filter.push({ name: 'isinactive', operator: 'is', values: false });

        if (action == "Shipment") {
            filter.push({ name: 'custrecord_dps_li_shipment_report', operator: 'is', values: false })
        } else if (action == "Settlement_w") {
            filter.push({ name: 'custrecord_dps_li_settl_jour_w', operator: 'is', values: false })
        } else if (action == "Settlement_s") {
            filter.push({ name: 'custrecord_dps_li_settlement_voucher', operator: 'is', values: false })
        }

        search.create({
            type: 'customrecord_dps_li_automatically_execut',
            filters: filter,
            columns: [
                { name: 'internalid', sort: search.Sort.ASC },
                "custrecord_dps_auto_execute_account", // 	店铺
                "custrecord_dps_li_submit_id", // 	提交ID
                "custrecord_dps_li_shipment_report", // 	发货报告
                "custrecord_dps_auto_execute_estimated", //   预估凭证
                "custrecord_dps_li_settl_jour_w", //	结算报告(冲销)
                "custrecord_dps_li_settlement_voucher", //	结算凭证
                "custrecord_dps_li_returned_purchase", //	退货
                "custrecord_dps_li_credit_memo", //	贷项通知单
                "custrecord_dps_li_refund_settlement_cert", //	退款结算凭证
                "custrecord_dps_li_all_processed", //	全部处理完成
                "custrecord_dps_li_account_group", //	 店铺分组
            ]
        }).run().each(function(_rec) {
            getResult.rec_id = _rec.id; // 记录 ID
            getResult.accountId = _rec.getValue('custrecord_dps_auto_execute_account'); // 店铺 ID
            getResult.submit_id = _rec.getValue('custrecord_dps_li_submit_id'); // 提交 ID
            getResult.shipment = _rec.getValue('custrecord_dps_li_shipment_report'); // 发货报告
            getResult.settlement_w = _rec.getValue('custrecord_dps_li_settl_jour_w'); // 结算报告 冲销
            getResult.settlement_s = _rec.getValue('custrecord_dps_li_settlement_voucher'); // 结算报告 结算
            getResult.retruned = _rec.getValue('custrecord_dps_li_returned_purchase'); // 退货报告
        });


        return getResult;
    }


    function submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param) {

        log.audit('mapreduce id: ', mapReduceScriptId);
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: mapReduceScriptId,
            deploymentId: mapReduceDeploymentId,
            params: param
        });

        // Submit the map/reduce task.
        var mrTaskId = mrTask.submit();
        log.audit('mrTaskId', mrTaskId);

        record.submitFields({
            type: 'customrecord_dps_li_account_group',
            id: recId,
            values: {
                custrecord_dps_li_acc_group_submit_id: mrTaskId
            }
        });

        // PENDING      PROCESSING      COMPLETE      FAILED
        var taskStatus = task.checkStatus(mrTaskId);


        /*
        var authorId = 911;
        var recipientEmail = 'licanlin@douples.com';
        if (taskStatus.status === 'FAILED') {
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Failure executing map/reduce job!',
                body: 'Map reduce task: ' + mapReduceScriptId + ' has failed. \n 记录ID ' + recId + "\n 参数为\n" + JSON.stringify(param)
            });
        } else {
            email.send({
                author: authorId,
                recipients: recipientEmail,
                subject: 'Executing map/reduce job!',
                body: 'Map reduce task: ' + mapReduceScriptId + ' has activated. \n 记录ID ' + recId + "\n 参数为\n" + JSON.stringify(param)
            });
        }
        */

        var it = {
            code: 0,
            msg: '已经启动任务, 任务状态： ' + taskStatus + ";\n mrTaskId: " + mrTaskId
        }

        return it
    }
    /**
     *
     * @param {String} mapReduceScriptId  脚本 ID
     * @param {String} mapReduceDeploymentId  部署 ID
     * @param {Number} recId  记录 ID
     * @param {Object} param 提交参数
     */
    function submitMapReduceDeploymentByAcc(mapReduceScriptId, mapReduceDeploymentId, recId, param, action) {

        log.audit('mapreduce id: ', mapReduceScriptId);
        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: mapReduceScriptId,
            deploymentId: mapReduceDeploymentId,
            params: param
        });

        var mrTaskId = mrTask.submit();
        log.audit('mrTaskId', mrTaskId);

        record.submitFields({
            type: 'customrecord_dps_li_account_group',
            id: recId,
            values: {
                custrecord_dps_li_submit_id: mrTaskId
            }
        });

        // PENDING      PROCESSING      COMPLETE      FAILED
        var taskStatus = task.checkStatus(mrTaskId);
        log.audit("submitMapReduceDeploymentByAcc  taskStatus", taskStatus)

        var it = {
            code: 0,
            msg: '已经启动任务, 任务状态： ' + taskStatus + ";\n mrTaskId: " + mrTaskId
        }

        return it
    }

    return {
        get: _get,
        post: _post,
    }
});