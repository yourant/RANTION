/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {

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