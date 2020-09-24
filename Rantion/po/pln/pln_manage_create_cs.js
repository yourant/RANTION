/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog'], function (currentRecord, dialog) {

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
        //验证勾选时是否不同主体
        var sblId = 'custpage_sku_sublist';
        var vvv = rec.getCurrentSublistValue({
            sublistId: sblId,
            fieldId: 'custpage_checkbox'
        });
        if (vvv && context.fieldId == 'custpage_checkbox') {
            var li = rec.getCurrentSublistIndex({
                sublistId: sblId
            });
            var lineRec = rec.selectLine({
                sublistId: sblId,
                line: li
            });
            var vendor = lineRec.getSublistValue({
                sublistId: sblId,
                fieldId: 'custpage_sub_po_vendor_no',
                line: li
            });

            var subsidiary = lineRec.getSublistValue({
                sublistId: sblId,
                fieldId: 'custpage_sub_po_subsidiary_no',
                line: li
            });

            var lineNum = rec.getLineCount({
                sublistId: sblId
            });
            for (var i = 0; i < lineNum; i++) {
                var check = lineRec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custpage_checkbox',
                    line: i
                });
                var currVendor = lineRec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custpage_sub_po_vendor_no',
                    line: i
                });
                var currSubsidiary = lineRec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custpage_sub_po_subsidiary_no',
                    line: i
                });
                if (check && currVendor != vendor) {
                    dialog.alert({
                        title: '提示',
                        message: '不同供应商不可生成同一张交货单'
                    });
                    var recaa = context.currentRecord;
                    recaa.setCurrentSublistValue({
                        sublistId: sblId,
                        fieldId: 'custpage_checkbox',
                        value: false
                    });
                    break;
                }
                if (check && currSubsidiary != subsidiary) {
                    dialog.alert({
                        title: '提示',
                        message: '不同主体不可生成同一张交货单'
                    });
                    var recaa = context.currentRecord;
                    recaa.setCurrentSublistValue({
                        sublistId: sblId,
                        fieldId: 'custpage_checkbox',
                        value: false
                    });
                    break;
                }
            }
        }
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

    function createLpn() {
        log.audit('createLpn begin');
        var rtn = getSublistCountAndValue();
        log.audit('createLpn rtn', JSON.stringify(rtn));
        //如果没有勾选任何行
        if (!rtn.isCheck) {
            dialog.alert({
                title: '提示',
                message: rtn.checkMsg
            });
            return false;
        } else {
            console.log(rtn.detail);
            var poArr = [],
                subArr = [],
                vendorArr = [];
            for (key in rtn.detail) {
                poArr.push(rtn.detail[key].po);
                if (subArr.indexOf(rtn.detail[key].sub) < 0) {
                    subArr.push(rtn.detail[key].sub);
                }
                if (vendorArr.indexOf(rtn.detail[key].vendor) < 0) {
                    vendorArr.push(rtn.detail[key].vendor);
                }
            }
            if (subArr.length > 1) {
                dialog.alert({
                    title: '提示',
                    message: "不能选择不同的交易主体"
                });
                return false;
            }

            if (vendorArr.length > 1) {
                dialog.alert({
                    title: '提示',
                    message: "不能选择不同的供应商"
                });
                return false;
            }
            window.onbeforeunload = null;
            // var invoiceid = 正式站的批量管理的记录类型id
            var invoiceid = 2044;
            window.location.href = '/app/common/custom/custrecordentry.nl?rectype=' + invoiceid + '&poids=' + poArr.join('|');
        }
        log.audit('createLpn end');
    }

    /**
     * 获取勾选的采购订单
     */
    function getSublistCountAndValue() {
        var rtn = {};
        var rtnData = []
        //获取custpage_sku_sublist这个表格的行数
        var count = rec.getLineCount({
            sublistId: 'custpage_sku_sublist'
        });
        var isHaveNot = count < 1 ? true : false;
        var isCheckFlag = true;
        for (var i = 0; i < count; i++) {
            var check = rec.getSublistValue({
                sublistId: 'custpage_sku_sublist',
                fieldId: 'custpage_checkbox',
                line: i
            });
            if (check) {
                var poData = {};
                //如果有勾上的行就将该行放入po采购单json中
                isCheckFlag = false;
                poData.po = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_po_po',
                    line: i
                });
                poData.sub = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_po_subsidiary',
                    line: i
                });

                poData.vendor = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_po_vendor_no',
                    line: i
                });
                rtnData.push(poData);
            }
        }
        if (isCheckFlag) {
            //如果没有勾选，先判断是否为空表单
            if (isHaveNot) {
                rtn.checkMsg = '暂无采购订单符合搜索条件';
            } else if (!rtn.checkMsg) {
                rtn.checkMsg = '请先勾选采购订单';
            }
        }
        rtn.isCheck = !isCheckFlag;
        rtn.detail = rtnData;
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
        createLpn: createLpn
    }
});