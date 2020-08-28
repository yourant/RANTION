/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-12 19:56:55
 * @LastEditTime   : 2020-08-26 14:10:26
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
define(['N/search', 'N/url', 'N/ui/dialog', 'N/log', 'N/https', '../Helper/commonTool.js'], function (search, url, dialog, log, https, commonTool) {

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

        // Swal.fire({
        //     onBeforeOpen: Swal.showLoading,
        //     onOpen: function () {
        //         https.post.promise({
        //             url: url1,
        //             body: body1,
        //             headers: header
        //         }).then(function (response) {
        //             Swal.close();
        //             var body = JSON.parse(response.body);
        //             log.debug('typeof body', typeof (body))
        //             if (body == null || body == '') {
        //                 dialog.alert({
        //                     title: '提示',
        //                     message: '小货发运记录生成失败'
        //                 });
        //             } else {
        //                 dialog.alert({
        //                     title: '提示',
        //                     message: body.msg
        //                 });
        //             }
        //             window.location.reload(true);
        //         });
        //     },
        //     allowOutsideClick: false,
        //     allowEscapeKey: true,
        //     text: "小货发运记录生成中"
        // });


        commonTool.startMask('正在删除装箱信息,请耐心等待...');

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_ful_update_field_rl',
            deploymentId: 'customdeploy_dps_ful_update_field_rl',
            returnExternalUrl: false
        });

        https.post.promise({
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            },
            url: url1,
            body: body1
        }).then(function (response) {

            var body = JSON.parse(response.body);
            log.debug('typeof body', typeof (body))
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
            window.location.reload(true);
        }).catch(function onRejected(reason) {
            dialog.alert({
                title: '提示',
                message: reason
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
        createFulRecord: createFulRecord
    };

});