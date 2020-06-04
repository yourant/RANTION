/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-03 20:27:19
 * @LastEditTime   : 2020-06-03 20:34:37
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.transferorder.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/log', 'N/https'], function (url, log, https) {


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
     * @param {*} rec_id 
     */
    function getPalletLabels(rec_id) {

        console.log('WMSShipping', rec_id);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_wms_create_transfer_rl',
            deploymentId: 'customdeploy_dps_wms_create_transfer_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'WMS',
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
                response = https.put({
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
        saveRecord: saveRecord
    };

});