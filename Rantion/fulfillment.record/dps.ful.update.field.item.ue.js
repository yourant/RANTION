/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-07 10:17:20
 * @LastEditTime   : 2020-08-08 10:29:43
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.ful.update.field.item.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', 'N/workflow'], function (record, search, log, workflow) {

    function beforeLoad(context) {

        var actionType = context.type;

        log.debug('actionType', actionType);
        if (actionType == "view" || actionType == "edit") {

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