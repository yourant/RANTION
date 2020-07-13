/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-11 10:53:37
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Test-Huey\po\dps.huey.po.rt.wms.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search'], function (search) {

    function beforeLoad(context) {
        var type = context.type;

        if (type == "view") {
            var form = context.form;
            var bf_cur = context.newRecord;
            var po_id = bf_cur.getValue('createdfrom');
            var status = bf_cur.getValue('custbody_po_return_status');
            if (!status) {
                bf_cur.setValue({
                    fieldId: 'custbody_po_return_status',
                    value: 1
                });
            }
            search.create({
                type: bf_cur.type,
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: bf_cur.id
                }],
                columns: [
                    "custbody_po_return_status"
                ]
            }).run().each(function (rec) {
                status = rec.getValue('custbody_po_return_status');
            })
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