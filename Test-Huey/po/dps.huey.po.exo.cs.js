/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Rantion/Helper/commonTool.js', 'N/https', 'N/record', 'N/url', 'N/ui/dialog'],
function(commonTool, https, record, url, dialog) {

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

    function createNewPo(poId, id) {
        var url_new_po = url.resolveScript({
            scriptId: 'customscriptdps_huey_po_exo_rl',
            deploymentId: 'customdeploydps_huey_po_exo_rl',
            returnExternalUrl: false
        });
        var options = {
            title: '生成换货采购订单',
            message: '是否确认换货采购订单？'
        };
        dialog.confirm(options).then(success).catch(failure);
        function success(result) {
            if (result) {
                commonTool.startMask('正在生成换货采购订单，请耐心等待');
                https.post.promise({
                    url: url_new_po,
                    body: {
                        poId: poId,
                        id: id
                    },
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                }).then(function (response) {
                    commonTool.endMask();
                    if (response.body == false) {
                        dialog.alert({ title: '提示', message: '生成换货采购订单出错了，请联系管理员' });
                    } else {
                        dialog.alert({ title: '提示', message: '成功生成换货采购订单，相应的内部ID：' + response.body + '，点击确认跳转查看采购订详情'}).then(function () {
                            window.location.href = '/app/accounting/transactions/purchord.nl?id=' + response.body;
                        });
                    }
                });
            }
        }
        function failure(reason) {
            log.debug('reason', reason);
        }
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
        createNewPo: createNewPo
    }
});