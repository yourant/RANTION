/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-13 13:52:41
 * @LastEditTime   : 2020-07-03 15:09:03
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\so\multichannel\dps_sales_multichannel_cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(["N/ui/dialog", 'N/https', 'N/url', "N/currentRecord", 'N/log', 'N/search'], function (dialog, https, url, currentRecord, log, search) {

    function pageInit(context) {

    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {

        // var CurRec = context.currentRecord;

        // var account = CurRec.getValue('custbody_sotck_account'); // 店铺
        // var itemId = CurRec.getSublistValue({
        //     sublistId: 'item',
        //     fieldId: 'item',
        // });

        // var sku = searchSKU(itemId, account);
        // if (sku) {

        //     CurRec.setCurrentSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'custcol_aio_amazon_msku',
        //         value: sku,
        //         ignoreFieldChange: true
        //     });

        // }


        return true;
    }


    /**
     * 根据店铺和货品的对应关系获取 SellerSKU
     * @param {*} itemId 
     * @param {*} account 
     */
    function searchSKU(itemId, account) {
        var SellerSku;
        search.create({
            type: "customrecord_aio_amazon_seller_sku",
            filters: [{
                    name: 'custrecord_ass_sku',
                    operator: 'anyof',
                    values: [itemId]
                },
                {
                    name: 'custrecord_ass_account',
                    operator: 'anyof',
                    values: account
                }
            ],
            columns: [
                "name"
            ]
        }).run().each(function (rec) {
            SellerSku = rec.getValue('name');
        });

        return SellerSku || false;
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
        return true;
    }

    function syncToAmazon(soId) {


        // console.log("原因类型："+JSON.stringify(curr)+"-"+curr.getText("custbody_reason_type"))
        // if(!curr.getValue("custbody_reason_type")){
        //     alert("请先选择原因类型")
        //     return 
        // }

        function success1(result) {
            if (result == true) {
                var link = url.resolveScript({
                    scriptId: 'customscript_dps_sales_multichannel_rl',
                    deploymentId: 'customdeploy_dps_sales_multichannel_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
                }
                var body = {
                    recId: soId,
                    action: 'CreateFulfillmentOrder'
                }

                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })

                dialog.alert({
                    title: JSON.parse(response.body).code,
                    message: JSON.parse(response.body).message
                }).then(success).catch(failure);
            }
        }

        function success(reason) {
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "创建多渠道订单",
            message: '创建多渠道订单至Amazon'
        };
        dialog.confirm(options).then(success1).catch(failure);
    }

    function syncCelAmazon(soId) {


        function success1(result) {
            if (result == true) {

                var link = url.resolveScript({
                    scriptId: 'customscript_dps_sales_multichannel_rl',
                    deploymentId: 'customdeploy_dps_sales_multichannel_rl'
                });
                var header = {
                    "Content-Type": "application/json;charset=utf-8",
                    "Accept": "application/json"
                }
                var body = {
                    recId: soId,
                    action: 'CancelFulfillmentOrder'
                }

                var response = https.post({
                    url: link,
                    body: body,
                    headers: header
                })

                dialog.alert({
                    title: JSON.parse(response.body).code,
                    message: JSON.parse(response.body).message
                }).then(success).catch(failure);
            }
        }

        function success(reason) {
            console.log('Success with value: ' + reason);
            window.location.reload(true);
        }

        function failure(reason) {
            console.log("Failure: " + reason);
        }

        var options = {
            title: "取消多渠道订单",
            message: '取消Amazon多渠道订单'
        };
        dialog.confirm(options).then(success1).catch(failure);
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
        syncToAmazon: syncToAmazon,
        syncCelAmazon: syncCelAmazon
    }
});