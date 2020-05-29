/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-27 22:34:25
 * @LastEditTime   : 2020-05-29 15:04:02
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.ts.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/redirect', 'N/util', 'N/log'], function (redirect, util, log) {

    function beforeLoad(context) {

        try {

            log.audit('beforeLoad', context.type);

        } catch (error) {
            log.error('出错了', error);
        }

    }

    function beforeSubmit(context) {
        log.audit('beforeSubmit', context.type);
    }

    function afterSubmit(context) {
        log.audit('afterSubmit', context.type);
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});