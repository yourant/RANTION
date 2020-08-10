/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/ui/dialog', 'N/record', 'N/search', 'N/url'], function (currentRecord, https, dialog, record, search, url) {

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

    //采购单批量生成交货单
    function createDeliveryOrders() {
        var sublistId = 'custpage_line';
        var curr = currentRecord.get();
        var no_list = [];
        for (var i = 0; i < curr.getLineCount({
                sublistId: sublistId
            }); i++) {
            var checked = curr.getSublistValue({
                sublistId: sublistId,
                fieldId: 'store_line_checkbox',
                line: i
            });
            var id = curr.getSublistValue({
                sublistId: sublistId,
                fieldId: 'store_line_orderid',
                line: i
            });
            if (checked) {
                no_list.push(id);
            }
        }

        function success(result) {
            console.log('Success with value ' + result);
        }

        function success1(result) {
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_query_purchase_order_rl',
                    deploymentId: 'customdeploy_dps_query_purchase_order_rl'
                });
                var header = {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': 'application/json'
                }
                var body = {
                    recId: no_list,
                    type: 1
                }
                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })
                dialog.alert({
                    title: JSON.parse(response.body).status,
                    message: JSON.parse(response.body).data
                }).then(success2).catch(failure);
            }
        }

        function success2(reason) {
            window.location.reload(true);
        }

        function failure(reason) {
            console.log('Failure: ' + reason);
        }
        if (no_list.length == 0) {
            var options = {
                title: '生成交货单',
                message: '未选择单据！'
            };
            dialog.confirm(options).then(success).catch(failure);
        } else {
            var options = {
                title: '生成交货单',
                message: '是否确认生成交货单？'
            };
            dialog.confirm(options).then(success1).catch(failure);
        }
    }

    //采购订单生成交货单
    function createDeliveryBills(url, bill_id, approve_status) {
        if (approve_status != '8') {
            dialog.alert({
                title: '提示',
                message: '供应商未确认采购单，无法生成交货单'
            });
            return;
        }
        window.open(url + '&bill_id=' + bill_id);
    }

    //交货单推送WMS
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
                    sourceType: 10
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
            sublistId: 'recmachcustrecord_dps_delivery_order_id'
        });

        for (var i = 0; i < numLines; i++) {
            curRec.selectLine({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                line: i
            });
            curRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_dps_delivery_order_check',
                value: true,
                ignoreFieldChange: true
            });
            curRec.commitLine({
                sublistId: 'recmachcustrecord_dps_delivery_order_id'
            });
        }
    }

    function addRefreshButton() {
        var curRec = currentRecord.get();
        var numLines = curRec.getLineCount({
            sublistId: 'recmachcustrecord_dps_delivery_order_id'
        });

        for (var i = 0; i < numLines; i++) {
            curRec.selectLine({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                line: i
            });
            curRec.setCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_dps_delivery_order_check',
                value: false,
                ignoreFieldChange: true
            });
            curRec.commitLine({
                sublistId: 'recmachcustrecord_dps_delivery_order_id'
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
        createDeliveryOrders: createDeliveryOrders,
        createDeliveryBills: createDeliveryBills,
        pushToWms: pushToWms,
        addMarkAllButtons: addMarkAllButtons,
        addRefreshButton: addRefreshButton
    }
});