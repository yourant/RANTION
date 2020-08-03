/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-03 20:27:19
 * @LastEditTime   : 2020-07-30 14:08:09
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.transferorder.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/log', 'N/https', 'N/ui/dialog', 'N/record', 'N/search',
    '../Helper/commonTool.js'
], function (url, log, https, dialog, record, search, commonTool) {


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

        console.log('pageInit', "pageInit");
        var cur = scriptContext.currentRecord;
        var objField = cur.getField({
            fieldId: 'custbody_dps_transferor_type'
        });
        objField.isDisabled = true;
    }


    function fieldChanged(scriptContext) {

    }


    function postSourcing(scriptContext) {

    }


    function sublistChanged(scriptContext) {

    }


    function lineInit(scriptContext) {

    }


    function validateField(scriptContext) {
        return true;
    }


    function validateLine(scriptContext) {
        return true;
    }

    function validateInsert(scriptContext) {
        return true;
    }


    function validateDelete(scriptContext) {
        return true;
    }

    function saveRecord(scriptContext) {
        return true;
    }


    /**
     * 
     * @param {*} recId 
     */
    function getPalletLabels(recId) {

        console.log('getPalletLabels', recId);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funfi_record_tran_rl',
            deploymentId: 'customdeploy_dps_funfi_record_tran_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'getPalletLabels',
            recordID: recId
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "获取标签",
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
                    alert('获取标签失败')
                } else {
                    alert('获取标签: ' + response.body);
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
     * 
     * @param {*} recId 
     */
    function fulfillment(recId) {

        console.log('fulfillment', recId);

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funfi_record_tran_rl',
            deploymentId: 'customdeploy_dps_funfi_record_tran_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'fulfillment',
            recordID: recId
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "发运",
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
                    alert('发运失败')
                } else {
                    alert('发运: ' + response.body);
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
     * 
     * @param {*} recId 
     */
    function CreateFulRec(recId) {

        commonTool.startMask('生成发运记录中,请耐心等待');

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funfi_record_tran_rl',
            deploymentId: 'customdeploy_dps_funfi_record_tran_rl',
            returnExternalUrl: false
        });

        https.post.promise({
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            },
            url: url1,
            body: {
                action: "createFulRecord",
                recordID: recId
            }
        }).then(function (response) {

            var data = response.body;

            commonTool.endMask();

            dialog.alert({
                title: '生成发运记录',
                message: data
            }).then(function () {
                window.location.reload();
            });
        });


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
        getPalletLabels: getPalletLabels,
        fulfillment: fulfillment,
        CreateFulRec: CreateFulRec
    };

});