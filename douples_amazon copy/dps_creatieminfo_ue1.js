/*
 * @Author         : Li
 * @Date           : 2020-04-29 10:06:58
 * @LastEditTime   : 2020-05-11 21:00:04
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \douples_amazon\dps_creatieminfo_ue1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
  Amazon 拉单时，根据单号拿到货品信息
 */
define(["./Helper/core.min", "N/log", "N/record", "./Helper/Moment.min", "N/search"], function (core, log, record, moment, search) {

    /**
     * Function definition to be triggered before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

    function beforeLoad(context) {

    }
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(context) {
        try {
            var curr = context.newRecord
            log.debug("curr", JSON.stringify(curr))
            var cur_type = curr.type
            GetItemInfo(curr);

        } catch (e) {
            log.error("error:", e)
        }

    }
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(context) {


    }

    /**
     * 获取亚马逊的货品信息
     */
    function GetItemInfo(curr) {
        var auth = core.amazon.getAuthByAccountId(curr.getValue("custrecord_aio_cache_acc_id"));
        var line_items = core.amazon.getOrderItems(auth, curr.getValue("custrecord_aio_cache_order_id"));
        curr.setValue({
            fieldId: 'custrecord_amazonorder_iteminfo',
            value: JSON.stringify(line_items)
        });

        log.debug("order_id:" + curr.getValue("custrecord_aio_cache_acc_id"), line_items);
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});