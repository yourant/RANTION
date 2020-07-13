/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-09 13:34:51
 * @LastEditTime   : 2020-07-10 20:29:12
 * @LastEditors    : Li
 * @Description    : 供应商付款的金额设置到相关联的采购订单; 设置采购订单行上的部门到供应商付款(create)
 * @FilePath       : \Rantion\po\dps.li.bill.amount.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function beforeLoad(context) {


    }

    function beforeSubmit(context) {

        var action = context.type;

        if (action == "delete") {
            var getObj = searchVendorBill(context.newRecord, action);
            if (getObj) {
                log.debug('getObj', JSON.stringify(getObj));
                var po_id = searchPurchaseOrder(getObj.billArr);
                if (po_id) {
                    setPOValue(po_id, getObj.totalAmount, "", "");
                }

            }

        }

    }

    function afterSubmit(context) {
        var action = context.type;

        if (action == "create") {
            var getObj = searchVendorBill(context.newRecord, action);
            if (getObj) {

                log.debug('getObj', JSON.stringify(getObj));
                var po_id = searchPurchaseOrder(getObj.billArr);
                if (po_id) {
                    setPOValue(po_id, getObj.totalAmount, context.newRecord, action);
                }
            }
        }

    }


    /**
     * 搜索供应商付款, 若审批状态不为 已批准, 则不执行操作
     * @param {Object} recObj 记录对象
     * @param {String} action 执行的操作
     */
    function searchVendorBill(recObj, action) {

        var limit = 3999,
            billArr = [],
            retObj = {},
            ap_status,
            totalAmount = 0;

        search.create({
            type: recObj.type,
            filters: [{
                    name: 'internalid',
                    operator: "anyof",
                    values: [recObj.id]
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "amount", // 金额
                "createdfrom", // 创建自
                "approvalstatus", // 审批状态
            ]
        }).run().each(function (rec) {
            ap_status = rec.getValue('approvalstatus');
            var iAmo = Number(rec.getValue('amount'))
            if ((action == "create" || action == "edit") && iAmo < 0) {
                iAmo = -iAmo
                totalAmount = totalAmount + iAmo;
            } else if (action == "delete") {
                totalAmount = -totalAmount + iAmo;
            }
            billArr.push(rec.getValue('createdfrom'))

            return --limit > 0;
        });


        log.debug('ap_status', ap_status);

        log.debug('totalAmount', totalAmount);
        log.debug('billArr', billArr);

        retObj.totalAmount = totalAmount;
        retObj.billArr = billArr;

        // if (ap_status != "已核准" || ap_status != "Approved") {
        //     log.debug('ap_status: ' + ap_status, "审批状态不为 已核准, 不执行操作")
        //     return false;
        // }


        return retObj || false;

    }


    /**
     * 搜索账单对应的采购订单
     * @param {Array} billArr 账单数组
     */
    function searchPurchaseOrder(billArr) {
        var lin = 3999,
            purArr = [],
            poId


        search.create({
            type: 'vendorbill',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: billArr
            }],
            columns: [
                "createdfrom"
            ]
        }).run().each(function (r) {
            poId = r.getValue('createdfrom');
        });
        log.debug('poId', poId);

        return poId || false;
    }

    /**
     * 设置采购订单行上的已付款字段
     * @param {Integer} po_id 
     * @param {currency} toAmount 
     */
    function setPOValue(po_id, toAmount, newRec, action) {

        var poRec = record.load({
            type: 'purchaseorder',
            id: po_id
        });

        var t_amount = poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_amount_paid',
            line: 0
        });

        poRec.setSublistValue({
            sublistId: 'item',
            fieldId: 'custcol_amount_paid',
            value: t_amount + toAmount,
            line: 0
        });

        var department = poRec.getSublistValue({
            sublistId: 'item',
            fieldId: 'department',
            line: 0
        })

        var poRec_id = poRec.save();

        log.debug('poRec_id', poRec_id);


        if (action == "create") {
            var id = record.submitFields({
                type: newRec.type,
                id: newRec.id,
                values: {
                    department: department
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            log.debug('设置供应商付款单 部门字段', id);
        }

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});