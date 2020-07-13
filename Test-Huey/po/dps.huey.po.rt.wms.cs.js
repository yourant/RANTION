/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Rantion/Helper/commonTool.js', 'N/https', 'N/record', 'N/url', 'N/ui/dialog', 'N/search'],
    function (commonTool, https, record, url, dialog, search) {

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

        function returnWMS(poId, id) {
            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_huey_po_rt_wms_rl',
                deploymentId: 'customdeploy_dps_huey_po_rt_wms_rl',
                returnExternalUrl: false
            })
            var options = {
                title: '推送WMS',
                message: '是否确认推送WMS'
            };

            function success(result) {
                if (result) {
                    commonTool.startMask('推送WMS中，请耐心等待');
                    https.post.promise({
                        headers: {
                            'Content-Type': 'application/json;charset=utf-8',
                            'Accept': 'application/json'
                        },
                        url: url1,
                        body: {
                            poId: poId,
                            id: id
                        }
                    }).then(function (response) {
                        if (response.body == false) {
                            commonTool.endMask();
                            dialog.alert({
                                title: '推送WMS',
                                message: '推送WMS失败！'
                            });
                        } else {
                            var data = response.body;
                            var url_rt_wms = url.resolveScript({
                                scriptId: 'customscript_dps_wms_create_outmaster_rl',
                                deploymentId: 'customdeploy_dps_wms_create_outmaster_rl',
                                returnExternalUrl: false
                            });
                            var response_wms = https.post({
                                url: url_rt_wms,
                                body: {
                                    sourceType: 20,
                                    data: data
                                },
                                headers: {
                                    'Content-Type': 'application/json;charset=utf-8',
                                    'Accept': 'application/json'
                                }
                            });
                            var _result = JSON.parse(response_wms.body);
                            var _res = _result.data;

                            // record.submitFields({
                            //     type: 'vendorreturnauthorization',
                            //     id: id,
                            //     values: {
                            //         custbody_po_return_status: 2
                            //     }
                            // });
                            commonTool.endMask();
                            var sta = 1;
                            var msggg = _res.msg;
                            if (_res.code == 0) {
                                msggg = '推送WMS成功！';
                                sta = 2;
                            }
                            // custbody_dps_wms_info
                            record.submitFields({
                                type: 'vendorreturnauthorization',
                                id: id,
                                values: {
                                    custbody_po_return_status: sta,
                                    custbody_dps_wms_info: msggg
                                }
                            });

                            dialog.alert({
                                title: '推送WMS',
                                message: msggg
                            }).then(function () {
                                window.location.reload();
                            });
                        }
                    });
                }
            }

            function failure(reason) {
                log.debug('reason', reason)
            }
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
            returnWMS: returnWMS
        }
    });