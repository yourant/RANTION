/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-12 19:44:57
 * @LastEditTime   : 2020-06-13 10:37:54
 * @LastEditors    : Li
 * @Description    :应用于销售订单, 用于添加 生成小货发运记录 按钮
 * @FilePath       : \Rantion\fulfillment.record\dps.create.fulfillment.so.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function beforeLoad(context) {
        var actionType = context.type;
        if (actionType == 'view') {

            var bfRec = context.newRecord;

            var create_ful_record = bfRec.getValue("custbody_dps_so_create_ful_record"); // 标记生成小货发运记录
            var fulfillment_record = bfRec.getValue('custbody_dps_small_fulfillment_record'); // 关联的小货发运记录
            /*
            search.create({
                type: bfRec.type,
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: bfRec.id
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [
                    'custbody_dps_so_create_ful_record', 'custbody_dps_small_fulfillment_record'
                ]
            }).run().each(function (rec) {
                create_ful_record = rec.getValue('custbody_dps_so_create_ful_record');
                fulfillment_record = rec.getValue('custbody_dps_small_fulfillment_record');
            });
            */

            log.debug('create_ful_record', create_ful_record);
            log.debug('fulfillment_record', fulfillment_record);

            if (create_ful_record && !fulfillment_record) {
                var form = context.form;
                form.addButton({
                    id: 'custpage_dps_li_create_record',
                    label: '生成小货发运记录',
                    functionName: "createFulRecord(" + bfRec.id + ")"
                });
                form.clientScriptModulePath = './dps.create.fulfillment.so.cs.js';
            }

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