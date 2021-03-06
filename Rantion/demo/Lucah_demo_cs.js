/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/record', 'N/ui/dialog', 'N/https', 'N/url', '../Helper/sweetalert2.all.js'],
    function (currentRecord, record, dialog, https, url, Swal) {

        var currentRec = null;
        var synPredictionSuiteletUrl = null;

        function pageInit(context) {
            synPredictionSuiteletUrl = url.resolveScript({
                scriptId: 'customscript_batch_import_transform_pr',
                deploymentId: 'customdeploy_batch_import_transform_pr'
            }); //要跳转的接口处理SL路径
            currentRec = context.currentRecord;
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

        function batchImport() {
            var numLines = currentRec.getLineCount({
                sublistId: 'custpage_batch_import_sublist'
            });
         
                Swal.fire({
                    onBeforeOpen: Swal.showLoading,
                    onOpen: function () {
                        https.post.promise({
                            url: synPredictionSuiteletUrl,
                            body: {
                                action: 'transform',
                                data: JSON.stringify(idArr)
                            }
                        }).then(function (response) {
                            Swal.close();
                            var body = response.body;
                            if (body == null || body == '') {
                                dialog.alert({
                                    title: '提示',
                                    message: '记录转化全部失败'
                                });
                            } else {
                                dialog.alert({
                                    title: '提示',
                                    message: body
                                });
                            }
                        });
                    },
                    allowOutsideClick: false,
                    allowEscapeKey: true,
                    text: "请购单转换中"
                });
        }

        /**
         * 重置请求参数
         */
        function resetParam() {
            currentRec.setValue({
                fieldId: 'custpage_batch_import_subsidiary',
                value: null
            });
            currentRec.setValue({
                fieldId: 'custpage_batch_import_batchid',
                value: ''
            });
            currentRec.setValue({
                fieldId: 'custpage_batch_import_begin_time',
                value: ''
            });
            currentRec.setValue({
                fieldId: 'custpage_batch_import_end_time',
                value: ''
            });
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
            batchImport: batchImport,
            resetParam: resetParam
        }
    });