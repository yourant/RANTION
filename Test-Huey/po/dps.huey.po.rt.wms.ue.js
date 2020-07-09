/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function() {

    function beforeLoad(context) {
        var form = context.form;
        var type = context.type;
        var bf_cur = context.newRecord;
        var po_id = bf_cur.getValue('createdfrom');
        var status = bf_cur.getValue('custbody_po_return_status');
        if (!status) {
            bf_cur.setValue({ fieldId: 'custbody_po_return_status', value: 1 });
        }
        if (type == 'view') {
            if (status == 1 || !status) {
                form.addButton({
                    id: 'custpage_rt_wms_order_btn',
                    label: '推送WMS',
                    functionName: "returnWMS(+" + po_id + ',' + bf_cur.id + ")"
                });
                form.clientScriptModulePath = './dps.huey.po.rt.wms.cs.js';
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