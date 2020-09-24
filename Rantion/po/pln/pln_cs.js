/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', '../../Helper/commonTool.js', 'N/search', 'N/record', 'N/https', 'N/ui/dialog', 'N/url', 'N/format'],
    function (currentRecord, commonTool, search, record, https, dialog, url, format) {

        function pageInit(context) {

        }

        function saveRecord(context) {
            // commonTool.startMask('正在生成发票记录并绑定采购订单，请耐心等待');

            // commonTool.endMask();
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {
            return true;
        }

        function postSourcing(context) {
            return true;
        }

        function lineInit(context) {
            return true;
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
            var rec = context.currentRecord;
            var sblId = "recmachcustrecord_pln_management_id";
            var lineNum = rec.getLineCount({
                sublistId: sblId
            });
            var quantity = 0,
                check = false;
            for (var i = 0; i < lineNum; i++) {
                quantity = rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_delivery_quantity',
                    line: i
                });
                check = rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_order_check',
                    line: i
                });
                if (quantity <= 0 && check) {
                    rec.selectLine({
                        sublistId: sblId,
                        line: i
                    });
                    rec.setCurrentSublistValue({
                        sublistId: sblId,
                        fieldId: "custrecord_pln_order_check",
                        value: false
                    });
                    rec.commitLine({
                        sublistId: sblId
                    });
                    dialog.alert({
                        title: "勾选失败",
                        message: "不可勾选交货量小于0的行"
                    })
                }
            }
            return true;
        }

        function pushToWms() {
            var curr = currentRecord.get();

            function success(result) {
                if (result == true) {
                    var link = url.resolveScript({
                        scriptId: 'customscript_dps_wms_create_inmaster_rl',
                        deploymentId: 'customdeploy_dps_wms_create_inmaster_rl'
                    });
                    var header = {
                        'Content-Type': 'application/json;charset=utf-8',
                        'Accept': 'application/json'
                    }
                    var body = {
                        id: curr.id,
                        sourceType: 70
                    }
                    var response = https.post({
                        url: link,
                        body: body,
                        headers: header
                    })
                    dialog.alert({
                        title: JSON.parse(response.body).code,
                        message: JSON.parse(response.body).data
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
                title: '交货单推送WMS',
                message: '是否推送WMS？'
            };
            dialog.confirm(options).then(success).catch(failure);
        }

        function addMarkAllButtons() {
            var curRec = currentRecord.get();
            var numLines = curRec.getLineCount({
                sublistId: 'recmachcustrecord_pln_management_id'
            });

            for (var i = 0; i < numLines; i++) {
                curRec.selectLine({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    line: i
                });
                curRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    fieldId: 'custrecord_pln_order_check',
                    value: true,
                    ignoreFieldChange: true
                });
                curRec.commitLine({
                    sublistId: 'recmachcustrecord_pln_management_id'
                });
            }
        }

        function addRefreshButton() {
            var curRec = currentRecord.get();
            var numLines = curRec.getLineCount({
                sublistId: 'recmachcustrecord_pln_management_id'
            });

            for (var i = 0; i < numLines; i++) {
                curRec.selectLine({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    line: i
                });
                curRec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    fieldId: 'custrecord_pln_order_check',
                    value: false,
                    ignoreFieldChange: true
                });
                curRec.commitLine({
                    sublistId: 'recmachcustrecord_pln_management_id'
                });
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
            pushToWms: pushToWms,
            addMarkAllButtons: addMarkAllButtons,
            addRefreshButton: addRefreshButton
        }
    });