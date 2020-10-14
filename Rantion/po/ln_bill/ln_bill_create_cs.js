/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/currentRecord', 'N/ui/dialog', 'N/url', 'N/record', 'N/search'], function (currentRecord, dialog, url, record, search) {

    var rec;

    function pageInit(context) {
        console.log(context);
        rec = context.currentRecord;
        if (context.mode = 'create' && getQueryVariable('lnBill')) {
            document.getElementById('recalc').click();
            var line = rec.getLineCount({
                sublistId: 'item'
            });
            if (line <= 0) {
                dialog.alert({
                    title: "错误",
                    message: "货品行为空"
                })
                console.log('货品行为空，请检查交货单是否已开票')
            }
        } else if (context.mode = 'create' && getQueryVariable('poids')) {
            var line = rec.getLineCount({
                sublistId: 'item'
            });
            if (line <= 0) {
                dialog.alert({
                    title: "错误",
                    message: "货品行为空"
                })
                console.log('货品行为空，请检查该采购单下的交货单是否已开票')
            }
        }
        // if (context.mode = 'create' && getQueryVariable('lnBill')) {
        //     var lnids = getQueryVariable('lnids').split(',');

        //     // rec.selectNewLine({
        //     //     sublistId: 'item'
        //     // });
        //     // rec.commitLine({
        //     //     sublistId: 'item'
        //     // });
        //     for (var i = 0; i < lnids.length; i++) {
        //         var lnRec = record.load({
        //             type: 'customrecord_dps_delivery_order',
        //             id: lnids[i]
        //         });
        //         var line = lnRec.getLineCount({
        //             sublistId: 'recmachcustrecord_dps_delivery_order_id'
        //         });
        //         for (var j = 0; j < line; j++) {
        //             var itemSku = lnRec.getSublistValue({
        //                 sublistId: 'recmachcustrecord_dps_delivery_order_id',
        //                 fieldId: 'custrecord_item_sku',
        //                 line: j
        //             });
        //             var itemQuantity = lnRec.getSublistValue({
        //                 sublistId: 'recmachcustrecord_dps_delivery_order_id',
        //                 fieldId: 'custrecord_stock_quantity',
        //                 line: j
        //             });
        //             var itemPrice = (lnRec.getSublistValue({
        //                 sublistId: 'recmachcustrecord_dps_delivery_order_id',
        //                 fieldId: 'custrecord_unit_price',
        //                 line: j
        //             })).toFixed(2);
        //             var itemAmount = itemPrice * itemQuantity; //不含税总金额
        //             var tax1amt = itemAmount * 0.13; //税额
        //             var grossamt = itemAmount + tax1amt; //总金额
        //             rec.selectNewLine({
        //                 sublistId: 'item'
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'item',
        //                 value: itemSku
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'quantity',
        //                 value: itemQuantity
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'rate',
        //                 value: itemPrice
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'amount',
        //                 value: itemAmount
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'taxcode',
        //                 value: 7,
        //                 ignoreFieldChange: true
        //             });
        //             // rec.setCurrentSublistValue({
        //             //     sublistId: 'item',
        //             //     fieldId: 'taxrate',
        //             //     value: parseInt(13) + '%'
        //             // }); //该字段不可修改

        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'tax1amt',
        //                 value: tax1amt
        //             });
        //             rec.setCurrentSublistValue({
        //                 sublistId: 'item',
        //                 fieldId: 'grossamt',
        //                 value: grossamt
        //             });
        //             rec.commitLine({
        //                 sublistId: 'item'
        //             });
        //         }
        //     }
        // }
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

    function createBill() {
        var rtn = getSublistCountAndValue();
        console.log(rtn);
        var ln_bill_url = url.resolveScript({
            scriptId: 'customscript_ln_bill_search_sl',
            deploymentId: 'customdeploy_ln_bill_search_sl',
            returnExternalUrl: false
        });
        ln_bill_url = encodeURIComponent(window.location.host + ln_bill_url);
        //如果没有勾选任何行
        if (!rtn.isCheck) {
            dialog.alert({
                title: '提示',
                message: rtn.checkMsg
            });
            return false;
        } else {
            console.log(rtn.detail);
            var lnArr = [],
                subArr = [],
                vendorArr = [],
                currencyArr = [];
            for (key in rtn.detail) {
                lnArr.push(rtn.detail[key].ln);
                if (subArr.indexOf(rtn.detail[key].sub) < 0) {
                    subArr.push(rtn.detail[key].sub);
                }
                if (vendorArr.indexOf(rtn.detail[key].vendor) < 0) {
                    vendorArr.push(rtn.detail[key].vendor);
                }
                if (currencyArr.indexOf(rtn.detail[key].currency) < 0) {
                    currencyArr.push(rtn.detail[key].currency);
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

            if (currencyArr.length > 1) {
                dialog.alert({
                    title: '提示',
                    message: "不能选择不同的货币"
                });
                return false;
            }

            window.onbeforeunload = null;
            if (lnArr.length > 0 && subArr.length > 0 && vendorArr.length > 0) {
                window.location.href = '/app/accounting/transactions/vendbill.nl?whence=' + ln_bill_url + '&lnBill=true&entity=' + rtn.detail[0].vendor + '&subsidiary=' + rtn.detail[0].sub + '&currency=' + rtn.detail[0].currency + '&lnids=' + lnArr.join(',');
            }
        }
    }
    /**
     * 获取勾选的采购订单
     */
    function getSublistCountAndValue() {
        var rtn = {};
        var rtnData = []
        console.log(rec);
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
                var lnData = {};
                //如果有勾上的行就将该行放入ln采购单json中
                isCheckFlag = false;
                lnData.ln = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_ln',
                    line: i
                });

                lnData.sub = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_ln_subsidiary',
                    line: i
                });

                lnData.vendor = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_ln_vendor_no',
                    line: i
                });

                lnData.currency = rec.getSublistValue({
                    sublistId: 'custpage_sku_sublist',
                    fieldId: 'custpage_sub_ln_currency_id',
                    line: i
                });

                rtnData.push(lnData);
            }
        }
        if (isCheckFlag) {
            //如果没有勾选，先判断是否为空表单
            if (isHaveNot) {
                rtn.checkMsg = '暂无交货单符合搜索条件';
            } else if (!rtn.checkMsg) {
                rtn.checkMsg = '请先勾选交货单';
            }
        }
        rtn.isCheck = !isCheckFlag;
        rtn.detail = rtnData;
        return rtn;
    }

    /**
     * 获取url参数
     * @param {*} variable 
     */
    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return (false);
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
        createBill: createBill
    }
});