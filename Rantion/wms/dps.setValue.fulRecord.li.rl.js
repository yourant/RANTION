/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-01 19:21:16
 * @LastEditTime   : 2020-07-02 10:37:23
 * @LastEditors    : Li
 * @Description    : 更改调拨单的状态为 WMS已装箱
 * @FilePath       : \Rantion\wms\dps.setValue.fulRecord.li.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/https', 'N/url', 'N/task', 'N/search'], function (record, https, url, task, search) {

    function _get(context) {

    }

    function _post(context) {

        var retJson = {};
        try {

            var aono = context.aono;

            var bigRec = searchTranRec(aono);

            if (bigRec) {
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: bigRec,
                    values: {
                        custrecord_dps_shipping_rec_status: 12
                    }
                });

                retJson.code = 0;
                retJson.msg = "成功";

                log.debug('更改发运记录状态成功, id', id);
            } else {
                retJson.code = 1;
                retJson.msg = "调拨单号对应的发运记录不存在";
            }

            // submitMapReduceDeployment(context);
        } catch (error) {

            log.error('error', error);
            retJson.code = 5;
            retJson.msg = error.message;
        }

        return retJson

    }


    /**
     * 搜索对应的调拨单
     * @param {*} aono 
     */
    function searchTranRec(aono) {

        var bigRec;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'anyof',
                values: aono
            }]
        }).run().each(function (rec) {
            bigRec = rec.id;
        });

        return bigRec || false;

    }


    function submitMapReduceDeployment(recId) {

        var mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_dps_setvalue_li_map",
            deploymentId: 'customdeploy_dps_setvalue_li_map',
            params: {
                custscript_dps_ful_rec_id: recId
            }
        });

        var mrTaskId = mrTask.submit();

    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});