/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-07 10:17:20
 * @LastEditTime   : 2020-09-09 15:59:02
 * @LastEditors    : Li
 * @Description    : 应用于发运记录货品行, 当前发运记录货品行存在关联的发运记录, 则锁定记录
 * @FilePath       : \Rantion\fulfillment.record\dps.ful.update.field.item.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', 'N/workflow', 'N/runtime'], function (record, search, log, workflow, runtime) {

    function beforeLoad(context) {

        var actionType = context.type;

        log.debug('actionType', actionType);

        try {

            var userObj = runtime.getCurrentUser();

            if ((actionType == "view" || actionType == "edit") && runtime.executionContext == "USERINTERFACE") {

                var rec_big, rec_item_id;
                search.create({
                    type: context.newRecord.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: context.newRecord.id
                    }],
                    columns: [
                        "custrecord_dps_shipping_record_parentrec", // 关联的父记录
                    ]
                }).run().each(function (re) {
                    rec_item_id = re.id;
                    rec_big = re.getValue('custrecord_dps_shipping_record_parentrec');
                });

                log.debug('父记录货品', rec_big);
                if (rec_big) {

                    log.debug('开始锁定记录', 'Starts');

                    workflow.initiate({
                        recordType: 'customrecord_dps_shipping_record_item',
                        recordId: rec_item_id,
                        workflowId: 'customworkflow_dps_li_ful_rec_item_line'
                    });

                    workflow.trigger({
                        recordType: 'customrecord_dps_shipping_record_item',
                        recordId: rec_item_id,
                        workflowId: 'customworkflow_dps_li_ful_rec_item_line',
                        actionId: "workflowaction_lock_record"
                    });

                    log.debug('开始锁定记录', 'End');

                    if (userObj.role == 3) { // 管理员解除锁定

                        log.debug('开始解锁记录', 'Starts');
                        workflow.trigger({
                            recordType: 'customrecord_dps_shipping_record_item',
                            recordId: rec_item_id,
                            workflowId: 'customworkflow_dps_li_ful_rec_item_line',
                            actionId: "workflowaction_unlock_record"
                        });

                        log.debug('开始解锁记录', 'End');
                    }
                }

            }
        } catch (error) {
            log.error('锁定记录出错了', error);
        }

    }

    function beforeSubmit(context) {


        // var userObj = runtime.getCurrentUser();

        // log.debug('beforeSubmit   userObj', userObj);

        // var actionType = context.type;

        // if (actionType != "create") {
        //     var old_cur = context.oldRecord;
        //     var new_cur = context.newRecord;

        //     var old_link = old_cur.getValue('custrecord_dps_shipping_record_parentrec');
        //     var new_link = new_cur.getValue('custrecord_dps_shipping_record_parentrec');

        //     log.debug('old_link:  new_link', old_link + ":  " + new_link);
        // }


    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});