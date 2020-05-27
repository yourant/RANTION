/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-27 22:34:25
 * @LastEditTime   : 2020-05-27 22:53:12
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
            var id = context.newRecord.id;

            var startTime = util.nanoTime();
            log.debug("startTime", startTime);
            if (id != 4948) {
                // redirect.toRecord({
                //     type: 'salesorder',
                //     id: 4948,
                //     parameters: {
                //         'custparam_test': 'helloWorld'
                //     }
                // });
            }

            // var startTime = util.nanoTime();

            // log.debug("startTime", startTime);
            var elapsedTime = util.nanoTime() - startTime;

            log.debug('elapsedTime', elapsedTime);

        } catch (error) {
            log.error('出错了', error);
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