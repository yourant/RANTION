/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/ui/dialog', 'N/url', 'N/record'], function(currentRecord, https, dialog, url, record) {

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

    //交货单推送WMS
    function pushToWms(collect_type) {
        var curr = currentRecord.get();
        function success(result) {
            if (result) {
                if(collect_type == 1){//领用是出库
                    var link = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_outmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_outmaster_rl'
                    });
                }else{//归还是入库
                    var link = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_inmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_inmaster_rl'
                    });
                }
                
                var header = {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': 'application/json'
                }
                var body = {
                    id: curr.id,
                    sourceType: 40
                }
                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })
                var title;
                if(JSON.parse(response.body).data.code == 0){
                    title = '成功';
                }else{
                    title = '失败';
                }
                dialog.alert({
                    title: title,
                    message: JSON.parse(response.body).data.msg
                }).then(success1).catch(failure);
            }
        }
        function success1(reason) {
            window.location.reload(true);
        }
        function failure(reason) {
            console.log('Failure: ' + reason);
        }
        var options = {
            title: '库存领用/归还 推送WMS',
            message: '是否推送WMS？'
        };
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
        pushToWms: pushToWms
    }
});
