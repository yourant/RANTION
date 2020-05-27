/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(["N/currentRecord", "N/url", "N/https", "N/ui/dialog", 'N/record'], function(currentRecord, url, https, dialog, record) {

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
        for (var i = 0; i < curr.getLineCount({ sublistId: sublistId }); i++) {
            var checked = curr.getSublistValue({ sublistId: sublistId, fieldId: 'store_line_checkbox', line: i });
            var id = curr.getSublistValue({ sublistId: sublistId, fieldId: 'store_line_orderid', line: i });
            if (checked) {
                no_list.push(id);
            }
        }

        function success(result) {
            console.log("Success with value " + result);
        }

        function success1(result) {
            console.log("Success1 with value " + result);
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_query_purchase_order_rl',
                    deploymentId: 'customdeploy_dps_query_purchase_order_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
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
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        if (no_list.length == 0) {
            var options = {
                title: "生成交货单",
                message: '未选择单据！！！'
            };
            dialog.confirm(options).then(success).catch(failure);
        } else {
            var options = {
                title: "生成交货单",
                message: '是否确认生成交货单？？？'
            };
            dialog.confirm(options).then(success1).catch(failure);
        }
    }

    //采购订单生成交货单
    function createDeliveryBills() {
        var curr = currentRecord.get();

        var no_list = [];
        no_list.push(curr.id);

        function success(result) {
            console.log("Success with value " + result);
        }

        function success1(result) {
            console.log("Success1 with value " + result);
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_query_purchase_order_rl',
                    deploymentId: 'customdeploy_dps_query_purchase_order_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
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
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        if (no_list.length == 0) {
            var options = {
                title: "生成交货单",
                message: '未选择单据！！！'
            };
            dialog.confirm(options).then(success).catch(failure);
        } else {
            var options = {
                title: "生成交货单",
                message: '是否确认生成交货单？？？'
            };
            dialog.confirm(options).then(success1).catch(failure);
        }
    }

    //供应商确定
    function supplierDetermination() {
        var curr = currentRecord.get();
        console.log(curr.id);
        function success(result) {
            console.log("Success with value " + result);
            if (result == true) {
                record.submitFields({
                    type: "customrecord_dps_delivery_order",
                    id: curr.id,
                    values: {
                        custrecord_delivery_order_status: 2
                    }
                })
                window.location.reload(true);
            }
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "供应商确认",
            message: '是否确认？？？'
        };
        dialog.confirm(options).then(success).catch(failure);
    }

    //交货单推送WMS
    function pushToWms() {
        var curr = currentRecord.get();

        function success(result) {
            console.log("Success1 with value " + result);
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_wms_create_inmaster_rl',
                    deploymentId: 'customdeploy_dps_wms_create_inmaster_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
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
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "交货单推送WMS",
            message: '是否推送WMS？？？'
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
        createDeliveryOrders: createDeliveryOrders,
        createDeliveryBills: createDeliveryBills,
        supplierDetermination: supplierDetermination,
        pushToWms: pushToWms
    }
});
