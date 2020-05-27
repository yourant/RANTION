/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/https', 'N/record', 'N/url', 'N/ui/dialog'], function(https, record, url, dialog) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {


    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        return true;
    }

    function returnWMS(poId, id) {


        /*
        v_record = record.load({
            id: id,
            type: "vendorreturnauthorization"
        });

        p_record = record.load({
            id: poId,
            type: "purchaseorder"
        });

        console.log('loaded');


        return ;
        */

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_huey_po_rt_wms_rl',
            deploymentId: 'customdeploy_dps_huey_po_rt_wms_rl',
            returnExternalUrl: false
        })

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            poId: poId,
            id: id
        };

        log.debug('body1', body1);
        log.debug('url1', url1);

        var response;

        var options = {
            title: "是否推送至WMS",
            message: "Press OK or Cancel"
        };


        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                if (response.body == false) {
                    alert('推送至WMS失败')
                } else {

                    var data = response.body;
                    console.log('berfore_to_wms:' + response.body);
                    var url2 = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_outmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_outmaster_rl',
                        returnExternalUrl: false
                    });

                    var response2 = https.post({
                        url: url2,
                        body: {
                            sourceType: 20,
                            data: data
                        },
                        headers: header
                    });


                    var _result = JSON.parse(response2.body)
                    var _res = JSON.parse(eval(_result.data));

                    alert(_res.code == 0 ? '推送至WMS成功' : _res.msg)
                    console.log(_res);

                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);

    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged,
        returnWMS: returnWMS
    }
});