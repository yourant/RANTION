/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-30 11:18:54
 * @LastEditTime   : 2020-07-30 11:54:15
 * @LastEditors    : Li
 * @Description    : UE 控制字段的显隐
 * @FilePath       : \Rantion\fulfillment.record\dps.to.control.field.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/runtime', 'N/log', 'N/ui/serverWidget'], function (runtime, log, serverWidget) {

    function beforeLoad(context) {

        var form = context.form;

        var userObj = runtime.getCurrentUser();

        log.debug("userObj", userObj);
        var bfRec = context.newRecord;
        var type = context.type;

        if (type == 'edit') {



            try {

                
                // if (userObj.id == 911) {}
                var objField = bfRec.getField({
                    fieldId: 'custbody_dps_transferor_type'
                });
                // objField.isDisabled = true;

                objField.updateDisplayType({
                    displayType: "DISABLED"
                });

            } catch (error) {
                log.error('设置字段显隐出错了', error)
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