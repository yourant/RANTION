/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/search'], function(log, search) {

    function beforeLoad(context) {

        var form = context.form;
        var bf_cur = context.newRecord;
        var order_status = bf_cur.getValue('orderstatus');
        var createdfrom = bf_cur.getValue('createdfrom');

        log.error('createdfrom:', createdfrom)

        if (order_status == 'B' || order_status == 'D' || order_status == 'E' || order_status == 'F') {
            form.addButton({
                id: 'custpage_exchange_order_btn',
                label: '生成换货',
                functionName: "createNewPo(+" + createdfrom + ',' + bf_cur.id + ")"
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