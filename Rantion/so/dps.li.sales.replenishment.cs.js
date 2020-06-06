/*
 * @Author         : Li
 * @Date           : 2020-05-08 16:43:21
 * @LastEditTime   : 2020-06-04 20:42:51
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\dps.li.sales.replenishment.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/https', 'N/url', 'N/ui/dialog', 'N/record'],
    /**
     * @param {search} search
     */
    function (search, https, url, dialog, record) {

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

        // function createNewSo(soId) {
        function createNewSo(soId, id, action) {

            console.log(soId, id, action);

            var url1;
            var title1 = '';

            // return;

            var body1;
            if (action == 1) {
                title1 = "是否生成补货";
                url1 = url.resolveScript({
                    scriptId: 'customscript_dps_li_sales_replenishm_rl',
                    deploymentId: 'customdeploy_dps_li_sales_replenishm_rl',
                    returnExternalUrl: false
                });

                body1 = {
                    'action': action,
                    soId: soId,
                    id: id
                };
            } else if (action == 2) {

                // console.log('action', 2);

                title1 = "是否推送WMS";
                url1 = url.resolveScript({
                    scriptId: 'customscript_dps_wms_create_inmaster_rl',
                    deploymentId: 'customdeploy_dps_wms_create_inmaster_rl',
                    returnExternalUrl: false
                });

                body1 = {
                    soId: soId,
                    id: id,
                    sourceType: 20
                };
            }

            // console.log('1', 1);

            var header = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            // console.log('body1', body1);
            // console.log('url1', url1);
            log.debug('body1', body1);
            log.debug('url1', url1);
            var response, res_body;


            var options = {
                title: title1,
                message: "Press OK or Cancel"
            };

            function success(result) {
                if (result) {
                    response = https.post({
                        url: url1,
                        body: body1,
                        headers: header
                    });
                    res_body = JSON.parse(response.body);
                    console.log('res_body', res_body);
                    if (res_body.soId == false) {
                        if (res_body.action == 'createSo') {
                            alert(msg);
                        }
                        window.location.reload(true);
                    } else {
                        // console.log(1, res_body);
                        if (res_body.action == 'createSo') {
                            alert(res_body.msg);
                        }
                        // console.log(12, res_body.code);
                        if (res_body.code) {
                            // console.log(2, res_body);
                            alert(res_body.data);
                        }
                        window.location.reload(true);
                    }
                }
            }

            function failure(reason) {
                log.debug('reason', reason);
            }
            dialog.confirm(options).then(success).catch(failure);

        }


        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord,
            createNewSo: createNewSo
        };

    });