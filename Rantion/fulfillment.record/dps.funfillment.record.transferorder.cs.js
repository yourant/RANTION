/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/log', 'N/https', 'N/ui/dialog'],
function (url, log, https, dialog) {


    function pageInit(scriptContext) {

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
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funfi_record_tran_rl',
            deploymentId: 'customdeploy_dps_funfi_record_tran_rl',
            returnExternalUrl: false
        });

        var header = {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json'
        };

        var body1 = {
            action: 'getPalletLabels',
            recordID: recId
        };
        var response;

        var options = {
            title: '获取标签',
            message: '是否确认获取标签？'
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                if (response.body == false) {
                    alert('获取标签失败！')
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
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funfi_record_tran_rl',
            deploymentId: 'customdeploy_dps_funfi_record_tran_rl',
            returnExternalUrl: false
        });

        var header = {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json'
        };

        var body1 = {
            action: 'fulfillment',
            recordID: recId
        };
        var response;

        var options = {
            title: '发运',
            message: '是否确认发运？'
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                if (response.body == false) {
                    alert('发运失败！')
                } else {
                    alert('发运: ' + response.body);
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
        getPalletLabels: getPalletLabels,
        fulfillment: fulfillment
    };

});