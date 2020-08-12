/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-07 10:17:20
 * @LastEditTime   : 2020-08-12 18:48:56
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
            // if (actionType == "view" || actionType == "edit") {
            if (actionType == "edit" && runtime.executionContext == "USERINTERFACE") {
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

                    var rec_big = re.getValue('custrecord_dps_shipping_record_parentrec');

                    log.debug('父记录货品', rec_big);
                    if (rec_big) {
                        workflow.initiate({
                            recordType: 'customrecord_dps_shipping_record_item',
                            recordId: re.id,
                            workflowId: 'customworkflow_dps_li_ful_rec_item_line'
                        });

                        workflow.trigger({
                            recordType: 'customrecord_dps_shipping_record_item',
                            recordId: re.id,
                            workflowId: 'customworkflow_dps_li_ful_rec_item_line',
                            actionId: "workflowaction_lock_record"
                        });
                    }
                });



                return;
                var limit = 3999;
                var itemArr = [];
                search.create({
                    type: 'customrecord_dps_shipping_record_item',
                    filters: [{
                        name: 'custrecord_dps_shipping_record_parentrec',
                        operator: 'anyof',
                        values: context.newRecord.id
                    }]
                }).run().each(function (rec) {
                    itemArr.push(rec.id);
                    return --limit > 0;
                });


                if (actionType == "view") {

                    itemArr.map(function (item) {

                        workflow.initiate({
                            recordType: 'customrecord_dps_shipping_record_item',
                            recordId: item,
                            workflowId: 'customworkflow_dps_li_ful_rec_item_line'
                        });

                        workflow.trigger({
                            recordType: 'customrecord_dps_shipping_record_item',
                            recordId: item,
                            workflowId: 'customworkflow_dps_li_ful_rec_item_line',
                            actionId: "workflowaction_lock_record"
                        });
                    })
                    return;
                }
                itemArr.map(function (item) {
                    workflow.trigger({
                        recordType: 'customrecord_dps_shipping_record_item',
                        recordId: item,
                        workflowId: 'customworkflow_dps_li_ful_rec_item_line',
                        actionId: "workflowaction_unlock_record"
                    });
                })

            }
        } catch (error) {
            log.error('锁定记录出错了', error);
        }

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});