/*
 * @Author         : Li
 * @Date           : 2020-05-08 16:43:21
 * @LastEditTime   : 2020-05-28 16:27:10
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.fulfillment.record.full.invoice.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/https', 'N/url', 'N/ui/dialog'],
    /**
     * @param {search} search
     */
    function (search, https, url, dialog) {

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


        /**
         * 重新获取物流渠道
         * @param {*} rec_id 
         */
        function reacquireLogistics(rec_id) {

            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_wms_logistics_samll_ite',
                deploymentId: 'customdeploy_dps_wms_logistics_samll_ite',
                returnExternalUrl: false
            });

            var header = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            var body1 = {
                action: 'Logistics',
                recordID: rec_id
            };
            var response;

            var options = {
                title: "重新获取物流运单号",
                message: "Press OK or Cancel"
            };

            function success(result) {
                if (result) {
                    response = https.post({
                        url: url1,
                        body: body1,
                        headers: header
                    });
                    log.audit('respone', response.body);
                    var body = JSON.parse(response.body)
                    if (body.code == 500) {
                        alert('重新获取物流运单号失败：' + body.msg)
                    } else {
                        alert('重新获取物流运单号成功');
                        window.location.reload(true);
                    }
                }
            }

            function failure(reason) {
                log.debug('reason', reason)
            }
            dialog.confirm(options).then(success).catch(failure);

        }


        /**
         * 重新获取物流跟踪号
         * @param {*} rec_id 
         */
        function getTrackingNumber(rec_id) {

            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_wms_logistics_samll_ite',
                deploymentId: 'customdeploy_dps_wms_logistics_samll_ite',
                returnExternalUrl: false
            });

            var header = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            var body1 = {
                action: 'TrackingNumber',
                recordID: rec_id
            };
            var response;

            var options = {
                title: "重新获取物流运单号",
                message: "Press OK or Cancel"
            };

            function success(result) {
                if (result) {
                    response = https.post({
                        url: url1,
                        body: body1,
                        headers: header
                    });
                    log.audit('respone', response.body);
                    var body = JSON.parse(response.body)
                    if (body.code == 500) {
                        alert('重新获取物流跟踪号失败：' + body.msg)
                        window.location.reload(true);
                    } else {
                        alert('重新获取物流跟踪号成功');
                        window.location.reload(true);
                    }
                }
            }

            function failure(reason) {
                log.debug('reason', reason)
            }
            dialog.confirm(options).then(success).catch(failure);

        }


        /**
         * 重新WMS发运
         * @param {*} rec_id 
         */
        function WMSShipping(rec_id) {

            // alert('重新WMS发运: ' + rec_id);
            // return;

            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_wms_create_outmaster_rl',
                deploymentId: 'customdeploy_dps_wms_create_outmaster_rl',
                returnExternalUrl: false
            });

            var header = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            var body1 = {
                sourceType: 10,
                recordID: rec_id
            };
            log.debug('body1', body1);
            log.debug('url1', url1);
            var response;

            var options = {
                title: "重新WMS发运",
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
                        alert('重新WMS发运')
                    } else {
                        alert('重新WMS发运: ' + response.body);
                        window.location.reload(true);
                    }
                }
            }

            function failure(reason) {
                log.debug('reason', reason)
            }
            dialog.confirm(options).then(success).catch(failure);

        }

        function showImg(id) {
            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_fulfillment_show_img',
                deploymentId: 'customdeploy_dps_fulfillment_show_img',
                returnExternalUrl: false
            });
            window.open(url1 + "&id=" + id)
        }


        /**
         * 重新获取物流面单
         * @param {*} rec_id 
         */
        function getLabel(rec_id) {

            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_wms_logistics_samll_ite',
                deploymentId: 'customdeploy_dps_wms_logistics_samll_ite',
                returnExternalUrl: false
            });

            var header = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            var body1 = {
                action: 'GetLabel',
                recordID: rec_id
            };
            var response;

            var options = {
                title: "获取物流面单",
                message: "Press OK or Cancel"
            };

            function success(result) {
                if (result) {
                    response = https.post({
                        url: url1,
                        body: body1,
                        headers: header
                    });
                    log.audit('respone', response.body);
                    var body = JSON.parse(response.body)
                    if (body.code == 500) {
                        alert('重新获取物流面单失败：' + body.msg)
                        window.location.reload(true);
                    } else {
                        alert('重新获取物流面单成功');
                        window.location.reload(true);
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
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord,
            reacquireLogistics: reacquireLogistics,
            WMSShipping: WMSShipping,
            getTrackingNumber: getTrackingNumber,
            showImg: showImg,
            getLabel: getLabel
        };

    });