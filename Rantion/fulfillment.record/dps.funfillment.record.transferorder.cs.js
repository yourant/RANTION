/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-03 20:27:19
 * @LastEditTime   : 2020-07-19 23:35:13
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

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

        var curRec = scriptContext.currentRecord;// 当前记录
        var fieldId = scriptContext.fieldId; // 字段ID

        var

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


    function submitFields(recId) {
        record.submitFields.promise({
            type: "transferorder",
            id: recId,
            values: {
                memo: ""
            }
        }).then(function (recordId) {

            var fulRec_info, fulRecId;
            search.create({
                type: 'transferorder',
                filters: [{
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    },
                    {
                        name: 'internalid',
                        operator: 'anyof',
                        values: recordId
                    }
                ],
                columns: [
                    "custbody_dps_to_create_fulrec_info", // 创建发运记录信息
                    "custbody_dps_fu_rec_link", // 关联的发运记录
                ]
            }).run().each(function (rec) {
                fulRec_info = rec.getValue('custbody_dps_to_create_fulrec_info');
                fulRecId = rec.getValue('custbody_dps_fu_rec_link');
            });

            commonTool.endMask();

            if (fulRecId) {
                dialog.alert({
                    title: '创建发运记录成功',
                    message: '创建发运记录成功'
                }).then(success).catch(failure);

                function success(result) {
                    window.location.reload(true);
                }

                function failure(reason) {
                    console.log('Failure: ' + reason)
                }
            } else {
                dialog.alert({
                    title: '创建发运记录失败',
                    message: '创建发运记录失败:' + erro_info
                }).then(success).catch(failure);

                function success(result) {
                    window.location.reload(true);
                }

                function failure(reason) {
                    console.log('Failure: ' + reason)
                }
            }
        }, function (e) {

            commonTool.endMask();
            log.error({
                title: e.name,
                details: e.message
            });
        });
    }

    /**
     * 
     * @param {*} recId 
     */
    function CreateFulRec(recId) {

        commonTool.startMask('生成发运记录中,请耐心等待');


        record.submitFields({
            type: "transferorder",
            id: recId,
            values: {
                memo: ""
            }
        });

        var fulRecId;
        var erro_info;
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recId
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: [
                "custbody_dps_fu_rec_link",
                "custbody_dps_to_create_fulrec_info"
            ]
        }).run().each(function (rec) {
            erro_info = rec.getValue("custbody_dps_to_create_fulrec_info");
            fulRecId = rec.getValue("custbody_dps_fu_rec_link");
        });
        commonTool.endMask();
        if (fulRecId) {
            dialog.alert({
                title: '创建发运记录成功',
                message: '创建发运记录成功'
            }).then(success).catch(failure);

            function success(result) {
                window.location.reload(true);
            }

            function failure(reason) {
                console.log('Failure: ' + reason)
            }
        } else {
            dialog.alert({
                title: '创建发运记录失败',
                message: '创建发运记录失败:' + erro_info
            }).then(success).catch(failure);

            function success(result) {
                window.location.reload(true);
            }

            function failure(reason) {
                console.log('Failure: ' + reason)
            }
        }

        console.log('创建', recId);

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