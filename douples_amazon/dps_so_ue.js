/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
  Amazon 拉单时，根据单号拿到货品信息
 */
define(["N/search"], function (search) {

    /**
     * Function definition to be triggered before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

    function beforeLoad(context) {
        var form = context.form;
        var curr = context.newRecord
        var entity = curr.getValue('entity'), loca, acc;
        if (entity) {
            search.create({
                type: "customrecord_aio_account",
                filters: [
                    "custrecord_aio_customer", "anyof", entity
                ], columns: ["custrecord_aio_fbaorder_location"]
            }).run().each(function (e) {
                acc = e.id
                loca = e.getValue(e.columns[0])
            })
        }

        log.debug("location:", loca)
        if (acc)
            curr.setValue({ fieldId: "custbody_sotck_account", value: acc })
        if (loca)
            curr.setValue({ fieldId: "location", value: Number(loca) })

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


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});