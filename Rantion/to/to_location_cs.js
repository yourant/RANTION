/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-19 23:56:31
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\to\to_location_cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/ui/dialog'], function (search, dialog) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        var rec = context.currentRecord;
        if (context.fieldId == 'custbody_dps_start_location') {
            var s_lcation = rec.getValue('custbody_dps_start_location');
            rec.setValue({
                fieldId: 'location',
                value: s_lcation
            });
        }
        if (context.fieldId == 'custbody_dps_end_location') {
            var e_lcation = rec.getValue('custbody_dps_end_location');
            rec.setValue({
                fieldId: 'transferlocation',
                value: e_lcation
            });
        }
        if (context.fieldId == 'custbody_dps_transferor_type' || context.fieldId == 'subsidiary') {
            var transferor_type = rec.getValue('custbody_dps_transferor_type');
            if (transferor_type == '1' || transferor_type == '2' || transferor_type == '3') {
                var subsidiary = rec.getValue('subsidiary');
                var to_location;
                if (subsidiary) {
                    search.create({
                        type: 'location',
                        filters: [{
                                name: 'subsidiary',
                                operator: 'anyof',
                                values: subsidiary
                            },
                            {
                                name: 'custrecord_dps_financia_warehous',
                                operator: 'anyof',
                                values: 5
                            }
                        ]
                    }).run().each(function (rec) {
                        to_location = rec.id;
                    });
                }
                if (to_location) {
                    rec.setValue({
                        fieldId: 'transferlocation',
                        value: to_location
                    });
                    rec.setValue({
                        fieldId: 'custbody_dps_end_location',
                        value: to_location
                    });
                }
            }
        }

        if (context.fieldId == "item") {
            // console.log('context.fieldId', context.fieldId);
            var account = rec.getValue('custbody_order_locaiton'); //获取店铺的值
            // console.log('account', account);
            if (account) { // 店铺存在
                var itemId = rec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item'
                });

                // console.log('itemId', itemId);

                var seller_sku;

                // 搜索映射关系表, 获取SellerSKU
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: [{
                            name: 'custrecord_ass_sku',
                            operator: 'anyof',
                            values: itemId
                        },
                        {
                            name: 'custrecord_ass_account',
                            operator: 'anyof',
                            values: account
                        }
                    ],
                    columns: [
                        'name'
                    ]
                }).run().each(function (r) {
                    seller_sku = r.getValue('name');
                });
                // console.log('seller_sku', seller_sku);
                if (seller_sku) {
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_aio_amazon_msku',
                        value: seller_sku,
                        ignoreFieldChange: true
                    });
                } else {
                    dialog.alert({
                        title: '设置MSKU',
                        message: '找不到相关的 MSKU'
                    }).then(success).catch(failure);

                    function success(result) {
                        // window.location.reload(true);
                    }

                    function failure(reason) {
                        console.log('Failure: ' + reason)
                    }
                }
            }
        }
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
        sublistChanged: sublistChanged
    }
});