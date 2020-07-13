/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-11 10:57:32
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Test-Huey\po\dps.huey.po.exo.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {

        var actionType = context.action;
        if (actionType == "view") {
            var form = context.form;
            var bf_cur = context.newRecord;
            var order_status = bf_cur.getValue('orderstatus');
            var po_id = bf_cur.getValue('createdfrom');
            var new_po_id = bf_cur.getValue('custbody_dps_link_po');
            if (!new_po_id && (order_status == 'B' || order_status == 'D' || order_status == 'E' || order_status == 'F')) {
                form.addButton({
                    id: 'custpage_exchange_order_btn',
                    label: '生成换货采购订单',
                    functionName: "createNewPo(+" + po_id + ',' + bf_cur.id + ")"
                });
                form.clientScriptModulePath = './dps.huey.po.exo.cs.js';
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