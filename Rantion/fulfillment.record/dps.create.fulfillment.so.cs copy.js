/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-12 19:56:55
 * @LastEditTime   : 2020-06-15 10:33:48
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.create.fulfillment.so.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/url', 'N/ui/dialog', 'N/log', 'N/https', '../Helper/sweetalert2.all.js'], function (search, url, dialog, log, https, Swal) {

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


    function createFulRecord(recId) {
        console.log('recId', recId);

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_create_fulfill_so_rl',
            deploymentId: 'customdeploy_dps_create_fulfill_so_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            recordID: recId
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;


        Swal.fire({
            onBeforeOpen: Swal.showLoading,
            onOpen: function () {
                https.post.promise({
                    url: url1,
                    body: body1,
                    headers: header
                }).then(function (response) {
                    Swal.close();
                    var body = response.body;
                    if (body == null || body == '') {
                        dialog.alert({
                            title: '提示',
                            message: '小货发运记录生成失败'
                        });
                    } else {
                        dialog.alert({
                            title: '提示',
                            message: body.msg
                        });
                    }
                });
            },
            allowOutsideClick: false,
            allowEscapeKey: true,
            text: "小货发运记录生成中"
        });

        var options = {
            title: "小货发运记录",
            message: "生成小货发运记录?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });

                var resp;

                try {
                    resp = JSON.parse(response.body);
                    log.debug('客户端转换数据', resp);
                } catch (error) {
                    log.audit('error', error);
                    resp = response.body;
                }

                // resp = response.body;
                log.debug('resp  typeof: ' + typeof (resp), resp.msg)
                if (resp == false) {
                    alert('生成小货发运记录失败')
                } else {
                    alert(resp.msg);
                    window.location.reload(true);
                }

                // .then(function (response) {

                //     var resp;

                //     try {
                //         resp = JSON.parse(response.body);
                //         // console.log('resp', resp);
                //         // console.log('尝试转换数据')
                //     } catch (error) {
                //         console.log('error', error);
                //         resp = response.body;
                //     }

                //     // resp = response.body;
                //     console.log('resp  typeof: ' + typeof (resp), resp.msg)
                //     if (resp == false) {
                //         alert('生成小货发运记录失败')
                //     } else {
                //         alert(resp.msg);
                //         window.location.reload(true);
                //     }
                //     log.debug({
                //         title: 'Response',
                //         details: response
                //     });
                // }).catch(function onRejected(reason) {
                //     log.debug({
                //         title: 'Invalid Request: ',
                //         details: reason
                //     });
                // });

                // console.log('response.body', response.body)
                // if (response.body == false) {
                //     alert('生成小货发运记录失败')
                // } else {
                //     alert('生成小货发运记录成功: ' + response.body);
                //     window.location.reload(true);
                // }
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
        createFulRecord: createFulRecord
    };

});