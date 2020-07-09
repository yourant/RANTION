/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/commonTool.js', 'N/ui/dialog', 'N/https', 'N/url'],
function(commonTool, dialog, https, url) {

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
        
    }

    function sendButton(type, inventoryadjust_id) {
        var options = {
            title: '推送WMS',
            message: '是否确认推送WMS？'
        };
        dialog.confirm(options).then(success).catch(failure);
        function success(result) {
            if (result) {
                commonTool.startMask('正在推送WMS中，请耐心等待');
                // 36 样品领用， 37 样品归还
                var link;
                if (type == 36) {
                    link = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_outmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_outmaster_rl',
                    });
                } else if (type == 37) {
                    link = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_inmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_inmaster_rl'
                    });
                }
                if (link) {
                    https.post.promise({
                        url: link,
                        body: {
                            sourceType: 40,
                            inventoryadjust_id: inventoryadjust_id
                        }
                    }).then(function (resp) {
                        resp = JSON.parse(resp.body);
                        commonTool.endMask();
                        dialog.alert({ title: '提示', message: resp.data.msg }).then(function () {
                            window.location.reload();
                        });
                    });
                } else {
                    commonTool.endMask();
                    dialog.alert({ title: '提示', message: '库存调整-领用类型数据错误，请联系管理员' });
                }
            }
        }
        function failure(reason) {}
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
        sendButton: sendButton
    }
});
