/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog'], function(currentRecord, dialog) {

    var rec;

    function pageInit(context) {
        rec = context.currentRecord;
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

    function createInvoice() {
        var rtn = getSublistCountAndValue();
        if (!rtn.isCheck) {
            dialog.alert({ title: '提示', message: rtn.checkMsg });
            return false;
        } else {
            window.onbeforeunload = null;
            var invoiceid = 494;
            window.location.href = '/app/common/custom/custrecordentry.nl?rectype=' + invoiceid + '&poids=' + rtn.detail.join('|');
        }
    }

    /**
     * 获取勾选的采购订单
     */
    function getSublistCountAndValue() {
        var rtn = {};
        var poData = [];
        var count = rec.getLineCount({ sublistId: 'custpage_sku_sublist' });
        var isHaveNot = count < 1 ? true : false;
        var isCheckFlag = true;
        for (var i = 0; i < count; i++) {
            var check = rec.getSublistValue({ sublistId: 'custpage_sku_sublist', fieldId: 'custpage_checkbox', line: i });
            if (check) {
                isCheckFlag = false;
                poData.push(rec.getSublistValue({ sublistId: 'custpage_sku_sublist', fieldId: 'custpage_sub_po_po', line: i }));
            }
        }
        if (isCheckFlag) {
            if (isHaveNot) {
                rtn.checkMsg = '暂无采购订单符合搜索条件';
            } else if (!rtn.checkMsg) {
                rtn.checkMsg = '请先勾选采购订单';
            }
        }
        rtn.isCheck = !isCheckFlag;
        rtn.detail = poData;
        return rtn;
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
        createInvoice: createInvoice
    }
});