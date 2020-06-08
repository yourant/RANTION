/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(["N/ui/dialog", 'N/https', 'N/url'], function (dialog, https, url) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {
        return true;
    }

    function validateInsert(context) {
        return true;
    }

    function validateLine(context) {
        return true;
    }

    function sublistChanged(context) {
        return true;
    }

    function syncToAmazon(soId) {
        function success1(result) {
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_sales_multichannel_rl',
                    deploymentId: 'customdeploy_dps_sales_multichannel_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
                }
                var body = {
                    recId: soId,
                    action: 'CreateFulfillmentOrder'
                }

                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })

                dialog.alert({
                    title: JSON.parse(response.body).code,
                    message: JSON.parse(response.body).message
                }).then(success).catch(failure);
            }
        }

        function success(reason) {
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "创建多渠道订单",
            message: '创建多渠道订单至Amazon'
        };
        dialog.confirm(options).then(success1).catch(failure);
    }

    function syncCelAmazon(soId) {
        function success1(result) {
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_sales_multichannel_rl',
                    deploymentId: 'customdeploy_dps_sales_multichannel_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
                }
                var body = {
                    recId: soId,
                    action: 'CancelFulfillmentOrder'
                }

                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })

                dialog.alert({
                    title: JSON.parse(response.body).code,
                    message: JSON.parse(response.body).message
                }).then(success).catch(failure);
            }
        }

        function success(reason) {
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "取消多渠道订单",
            message: '取消Amazon多渠道订单'
        };
        dialog.confirm(options).then(success1).catch(failure);
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
        syncToAmazon: syncToAmazon,
        syncCelAmazon: syncCelAmazon
    }
});