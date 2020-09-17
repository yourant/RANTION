/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-27 10:39:05
 * @LastEditTime   : 2020-08-29 06:57:47
 * @LastEditors    : Li
 * @Description    : 定时查询处理状态, 自动切换执行的脚本
 * @FilePath       : \dps.li.auto.execute.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/task', 'N/log', 'N/record', 'N/email'], function(search, task, log, record, email) {

    function getInputData() {

        var execute_account, recId, submit_id, execute_estimated, execute_estimat_data, settlement_voucher, settlement_voucher_dat,
            returned_purchase, returned_purchase_data, credit_memo, credit_memo_data, refund_settlement_cert, refund_settlement_data;

        var executeObj = {};

        search.create({
            type: "customrecord_dps_li_automatically_execut",
            filters: [
                { name: 'custrecord_dps_li_all_processed', operator: 'is', values: false },
                { name: 'isinactive', operator: 'is', values: false }, // 过滤掉非活动的
            ],
            columns: [
                "custrecord_dps_auto_execute_account", // 店铺
                "custrecord_dps_li_submit_id", // 提交ID
                "custrecord_dps_auto_execute_estimated", // 预估凭证 标志
                "custrecord_dps_auto_execute_estimat_data", // 剩余预估数据
                "custrecord_dps_li_settlement_voucher", // 结算凭证
                "custrecord_dps_li_settlement_voucher_dat", // 结算数据量
                "custrecord_dps_li_returned_purchase", // 退货
                "custrecord_dps_li_returned_purchase_data", // 退货数据
                "custrecord_dps_li_credit_memo", // 贷项单
                "custrecord_dps_li_credit_memo_data", // 贷项单数据
                "custrecord_dps_li_refund_settlement_cert", // 退款结算凭证
                "custrecord_dps_li_refund_settlement_data", // 退款结算凭证数据
            ]
        }).run().each(function(rec) {
            execute_account = rec.getValue('custrecord_dps_auto_execute_account');
            recId = rec.id;
            submit_id = rec.getValue('custrecord_dps_li_submit_id');

            execute_estimated = rec.getValue('custrecord_dps_auto_execute_estimated');
            execute_estimat_data = rec.getValue('custrecord_dps_auto_execute_estimat_data');

            settlement_voucher = rec.getValue('custrecord_dps_li_settlement_voucher');
            settlement_voucher_dat = rec.getValue('custrecord_dps_li_settlement_voucher_dat');

            returned_purchase = rec.getValue('custrecord_dps_li_returned_purchase');
            returned_purchase_data = rec.getValue('custrecord_dps_li_returned_purchase_data');

            credit_memo = rec.getValue('custrecord_dps_li_credit_memo');
            credit_memo_data = rec.getValue('custrecord_dps_li_credit_memo_data');

            refund_settlement_cert = rec.getValue('custrecord_dps_li_refund_settlement_cert');
            refund_settlement_data = rec.getValue('custrecord_dps_li_refund_settlement_data');


            executeObj = {
                execute_account: execute_account,
                recId: recId,
                submit_id: submit_id,
                execute_estimated: execute_estimated,
                execute_estimat_data: execute_estimat_data,
                settlement_voucher: settlement_voucher,
                settlement_voucher_dat: settlement_voucher_dat,
                returned_purchase: returned_purchase,
                returned_purchase_data: returned_purchase_data,
                credit_memo: credit_memo,
                credit_memo_data: credit_memo_data,
                refund_settlement_cert: refund_settlement_cert,
                refund_settlement_data: refund_settlement_data
            }
        });



        log.audit("executeObj", JSON.stringify(executeObj));

        var mapReduceScriptId = "customscript_order_fin_mp",
            mapReduceDeploymentId = "customdeploy_dps_li_map_starts";


        // Order 预估凭证 脚本启动 customscript_order_fin_mp customdeploy_dps_li_map_starts

        // Order结算日记账分录 脚本启动 customscript_so_finance_je_mp customdeploy_dps_li_map_settlemen_starts

        // 亚马逊退款 脚本启动 customscript_amazon_order_refund_mp customdeploy_dps_li_map_return_starts

        // Refund结算日记账分录 脚本启动 customscript_dps_return_joursettle_mp customdeploy_dps_li_map_return_se_starts

        try {

            if (recId) { // 若存在对应的记录
                if (!submit_id) { // 不存在提交Id ,为新数据, 先执行 预估凭证

                    if (!execute_estimated && !settlement_voucher && !credit_memo && !refund_settlement_cert) {
                        var param = {
                            custscript_fin_account: execute_account,
                            custscript_dps_li_fin_record_id: recId
                        }

                        mapReduceScriptId = "customscript_order_fin_mp";
                        mapReduceDeploymentId = "customdeploy_dps_li_map_starts";
                        // 启用执行预估凭证脚本
                        submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)
                    }


                    // 直接启用下一程序
                    if (execute_estimated && !settlement_voucher && !credit_memo && !refund_settlement_cert) { // 预估凭证已经完成, 启用 结算程序

                        var param = {
                            custscript_dianpu: execute_account,
                            custscript_dps_li_settlement_record_id: recId
                        };

                        mapReduceScriptId = "customscript_so_finance_je_mp";
                        mapReduceDeploymentId = "customdeploy_dps_li_map_settlemen_starts";
                        // 启用执行预估凭证脚本
                        submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)

                    }

                    if (execute_estimated && settlement_voucher && !credit_memo && !refund_settlement_cert) { // 结算凭证已经完成, 启用 贷项程序
                        var param = {
                            custscript_refund_acc: execute_account,
                            custscript_dps_li_account_id_text: recId
                        };

                        mapReduceScriptId = "customscript_amazon_order_refund_mp";
                        mapReduceDeploymentId = "customdeploy_dps_li_map_return_starts";
                        // 启用执行预估凭证脚本
                        submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)
                    }
                    if (execute_estimated && settlement_voucher && credit_memo && !refund_settlement_cert) { // 贷项已经完成, 启用 退款结算程序
                        var param = {
                            custscript_sotre: execute_account,
                            custscript_dps_li_record_internal_id: recId
                        };

                        mapReduceScriptId = "customscript_dps_return_joursettle_mp";
                        mapReduceDeploymentId = "customdeploy_dps_li_map_return_se_starts";
                        // 启用执行预估凭证脚本
                        submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)
                    }

                } else {
                    var taskStatus = task.checkStatus(submit_id);

                    log.audit('程序处理状态', taskStatus);
                    // PENDING      PROCESSING      COMPLETE      FAILED
                    if (taskStatus.status == "FAILED") {

                    } else if (taskStatus.status == "PENDING" || taskStatus.status == "PROCESSING") { // 程序处于等待 或者 处理中, 不执行任何操作, 直接退出

                        return;
                    } else { // COMPLETE 属于已完成状态
                        // 直接启用下一程序
                        if (execute_estimated && !settlement_voucher && !credit_memo && !refund_settlement_cert) { // 预估凭证已经完成, 启用 结算程序

                            var param = {
                                custscript_dianpu: execute_account,
                                custscript_dps_li_settlement_record_id: recId
                            };

                            mapReduceScriptId = "customscript_so_finance_je_mp";
                            mapReduceDeploymentId = "customdeploy_dps_li_map_settlemen_starts";
                            // 启用执行预估凭证脚本
                            submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)

                        }

                        if (execute_estimated && settlement_voucher && !credit_memo && !refund_settlement_cert) { // 结算凭证已经完成, 启用 贷项程序
                            var param = {
                                custscript_refund_acc: execute_account,
                                custscript_dps_li_account_id_text: recId
                            };

                            mapReduceScriptId = "customscript_amazon_order_refund_mp";
                            mapReduceDeploymentId = "customdeploy_dps_li_map_return_starts";
                            // 启用执行预估凭证脚本
                            submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)
                        }
                        if (execute_estimated && settlement_voucher && credit_memo && !refund_settlement_cert) { // 贷项已经完成, 启用 退款结算程序
                            var param = {
                                custscript_sotre: execute_account,
                                custscript_dps_li_record_internal_id: recId
                            };

                            mapReduceScriptId = "customscript_dps_return_joursettle_mp";
                            mapReduceDeploymentId = "customdeploy_dps_li_map_return_se_starts";
                            // 启用执行预估凭证脚本
                            submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param)
                        }

                    }

                }

            } else {
                log.audit('没有可执行的数据', "没有可执行的数据")
            }

        } catch (error) {
            log.error('启动线程出错了', error);
        }

    }


    function submitMapReduceDeployment(mapReduceScriptId, mapReduceDeploymentId, recId, param) {

        // Store the script ID of the script to submit.
        //
        // Update the following statement so it uses the script ID
        // of the map/reduce script record you want to submit.
        log.audit('mapreduce id: ', mapReduceScriptId);

        // Create a map/reduce task.
        //
        // Update the deploymentId parameter to use the script ID of
        // the deployment record for your map/reduce script.
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
            type: 'customrecord_dps_li_automatically_execut',
            id: recId,
            values: {
                custrecord_dps_li_submit_id: mrTaskId
            }
        });




        // Check the status of the task, and send an email if the
        // task has a status of FAILED.
        // PENDING      PROCESSING      COMPLETE      FAILED
        //
        // Update the authorId value with the internal ID of the user
        // who is the email sender. Update the recipientEmail value
        // with the email address of the recipient.
        var taskStatus = task.checkStatus(mrTaskId);


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
    }


    function map(context) {

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});