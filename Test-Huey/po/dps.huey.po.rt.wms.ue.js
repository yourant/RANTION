/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        var form = context.form;
        var bf_cur = context.newRecord;
        var order_status = bf_cur.getValue('orderstatus');
        var createdfrom = bf_cur.getValue('createdfrom');

        if (order_status == 'B' || order_status == 'D' || order_status == 'E' || order_status == 'F' || order_status == 'G') {
            form.addButton({
                id: 'custpage_rt_wms_order_btn',
                label: '推送WMS',
                functionName: "returnWMS(+" + createdfrom + ',' + bf_cur.id + ")"
            });
            form.clientScriptModulePath = './dps.huey.po.rt.wms.cs.js';
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