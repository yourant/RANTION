/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@description demo CS
 *@author Doris
 */
define(["N/url", 'N/ui/dialog', 'N/currentRecord', 'N/https', '../../Helper/commonTool.js'], function (url, dialog, currentRecord, https, commonTool) {

    var rec;
    var reportSuitelet;

    function pageInit(context) {
        rec = context.currentRecord; //当前记录

        reportSuitelet = url.resolveScript({
            scriptId: 'customscript_fba_received_inventory_sl',
            deploymentId: 'customdeploy_fba_received_inventory_sl'
        });
    }

    function saveRecord(context) {
        return true
    }

    function validateField(context) {
        console.log('context.fieldId',context.fieldId);
        if (context.fieldId == 'custpage_select_page') {
            selectPage();
        } else if (context.fieldId == 'custpage_page_size') {
            console.log(1);
            pigeSizeChange();
        }
        return true
    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {
        return true
    }

    function validateInsert(context) {
        return true
    }

    function validateLine(context) {
        return true
    }

    function sublistChanged(context) {

    }

    /**
     * 数据选择
     * 
     * @returns
     */
    function selectPage() {
        var custpage_shipment_id = rec.getValue('custpage_shipment_id');
        var custpage_seller_sku = rec.getValue('custpage_seller_sku');


        var custpage_now_page = rec.getValue('custpage_now_page');
        var custpage_total_page = rec.getValue('custpage_total_page');
        var custpage_select_page = rec.getValue('custpage_select_page');
        var custpage_page_size = rec.getValue('custpage_page_size');

        if (custpage_total_page != null && custpage_total_page != '') {
            console.log('selectPage reportSuitelet',reportSuitelet);
            window.location = reportSuitelet + '&' + serializeURL({
                action: 'search',
                custpage_shipment_id: custpage_shipment_id,
                custpage_seller_sku: custpage_seller_sku,
                custpage_now_page: custpage_select_page,
                custpage_page_size: custpage_page_size
            });

        }

    }

    function pigeSizeChange() {
        console.log(2);
        var custpage_shipment_id = rec.getValue('custpage_shipment_id');
        var custpage_seller_sku = rec.getValue('custpage_seller_sku');

        var custpage_now_page = rec.getValue('custpage_now_page');
        var custpage_total_page = rec.getValue('custpage_total_page');
        var custpage_select_page = rec.getValue('custpage_select_page');
        var custpage_page_size = rec.getValue('custpage_page_size');
        console.log('custpage_page_size',custpage_page_size);
        if (custpage_total_page != null && custpage_total_page != '') {
            console.log(3);
            console.log('pigeSizeChange reportSuitelet',reportSuitelet);
            // if (parseInt(custpage_now_page) - 1 > 0) {
                console.log('custpage_now_page - 1 > 0',reportSuitelet);
                window.location = url + '&' + serializeURL({
                    action: 'search',
                    custpage_shipment_id: custpage_shipment_id,
                    custpage_seller_sku: custpage_seller_sku,
                    custpage_now_page: 1,
                    custpage_page_size: custpage_page_size
                });
            // }
        }

    }

    /**
     * 序列化url参数
     * 
     * @param obj
     * @returns
     */
    function serializeURL(obj) {
        var str = [];
        for (var p in obj)
            if (obj.hasOwnProperty(p)) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
            }
        return str.join("&");
    }

    //生成库存调整单
    function CreateInventoryAdjustment() {
        var curr = currentRecord.get(), sublistId = 'custpage_line';
        var line = curr.getLineCount({sublistId: sublistId});
        var data = [];
        for(var i = 0;i < line;i ++){
            var checked = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_checkbox', line : i});
            if(checked){
                var department = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_department', line : i});//部门
                var line_class = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_class', line : i});//类
                var sku = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_sku', line : i});//货品
                var sku_name = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_sku_name', line : i});//货品名称
                var difference_qua = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_difference_qua', line : i});//差异数量
                var warehouse = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_warehouse', line : i});//地点
                var billnum_id = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_billnum', line : i});//库存转移ID
                var billnum = curr.getSublistText({sublistId : sublistId, fieldId : 'store_line_billnum_name', line : i});//库存转移单号
                var shipment_id = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_shipment_id', line : i});//shipmentID
                var seller_sku = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_seller_sku', line : i});//seller_sku 
                var store_id = curr.getSublistValue({sublistId : sublistId, fieldId : 'store_line_store', line : i});
                data.push({
                    department: department,
                    line_class: line_class,
                    sku: sku,
                    sku_name: sku_name,
                    seller_sku: seller_sku,
                    difference_qua: difference_qua,
                    warehouse: warehouse,
                    billnum_id: billnum_id,
                    billnum: billnum,
                    shipment_id: shipment_id,
                    store_id: store_id,
                });
            }
        }

        if(data == 0){
            dialog.alert({ title: '提示', message: '未选择单据' }).then(function () {
                window.location.reload();
            });  
            return;
        }

        var options = {
            title: "提示",
            message: "是否生成库存调整单?"
        };

        var url1 = url.resolveScript({
            scriptId: 'customscript_fba_received_inventory_rl',
            deploymentId: 'customdeploy_fba_received_inventory_rl'
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            data: data
        };
        function success(result) {
            if (result) {
                commonTool.startMask('生成库存调整单中，请耐心等待');
                https.post.promise({
                    url: url1,
                    body: body1,
                    headers: header
                }).then(function (resp) {
                    resp = JSON.parse(resp.body);
                    commonTool.endMask();
                    dialog.alert({ title: '提示', message: resp.msg }).then(function () {
                        window.location.reload();
                    });
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
        CreateInventoryAdjustment: CreateInventoryAdjustment
    }
});