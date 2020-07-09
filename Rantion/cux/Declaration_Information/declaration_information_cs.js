/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/commonTool.js', 'N/search', 'N/url', 'N/https', 'N/ui/dialog'], 
function(commonTool, search, url, https, dialog) {

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

    function createInterPO(idString) {
        var ids = idString.split('_');
        var transferId = ids[0];
        var shippingId = ids[1];
        var informationId = ids[2];
        var poDataJson = {};
        var SKUs = [];
        if (transferId && shippingId && informationId) {
            var options = { title: '生成公司间交易采购订单', message: '是否确认生成公司间交易采购订单？' };
            function success(result) {
                if (result) {
                    commonTool.startMask('生成订单中，请耐心等待');
                    poDataJson.transferId = transferId;
                    poDataJson.shippingId = shippingId;
                    poDataJson.informationId = informationId;
                    search.create({
                        type: 'transferorder',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: transferId }
                        ],
                        columns: [
                            'subsidiary', 'custbodyactual_target_subsidiary', 'location', 'transferlocation',
                            'custbody_actual_target_warehouse',
                            { name: 'custrecord_inter_vendor', join: 'custbodyactual_target_subsidiary' },
                            { name: 'custrecord_inter_customer', join: 'custbodyactual_target_subsidiary' },
                            { name: 'custrecord_virtual_transit_warehouse', join: 'custbodyactual_target_subsidiary' },
                            { name: 'currency', join: 'custbodyactual_target_subsidiary' }
                        ]
                    }).run().each(function(result) {
                        // 发出交易主体
                        poDataJson.from_subsidiary = result.getValue('subsidiary');
                        // 发出主体实际发出仓库
                        poDataJson.from_location = result.getValue('location');
                        // 发出交易主体虚拟在途仓
                        poDataJson.from_halfway_location = result.getValue('transferlocation');
                        // 接收交易主体
                        poDataJson.to_subsidiary = result.getValue('custbodyactual_target_subsidiary');
                        // 接收交易主体供应商
                        poDataJson.to_subsidiary_vendor = result.getValue({ name: 'custrecord_inter_vendor', join: 'custbodyactual_target_subsidiary' });
                        // 接收交易主体客户
                        poDataJson.to_subsidiary_customer = result.getValue({ name: 'custrecord_inter_customer', join: 'custbodyactual_target_subsidiary' });
                        // 接收交易主体虚拟接收仓库
                        poDataJson.to_subsidiary_location = result.getValue({ name: 'custrecord_virtual_transit_warehouse', join: 'custbodyactual_target_subsidiary' });
                        // 接收交易主体实际接收仓库
                        poDataJson.to_location = result.getValue('custbody_actual_target_warehouse');
                        // 接收交易主体货币
                        poDataJson.to_subsidiary_currency = result.getValue({ name: 'currency', join: 'custbodyactual_target_subsidiary' });
                        return false;
                    });
                    var shipment_id;
                    search.create({
                        type: 'customrecord_dps_shipping_record',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: informationId }
                        ],
                        columns: [ 'custrecord_dps_shipping_rec_shipmentsid' ]
                    }).run().each(function(result) {
                        shipment_id = result.getValue('custrecord_dps_shipping_rec_shipmentsid');
                        return true;
                    });
                    if (shipment_id) {
                        poDataJson.shipment_id = shipment_id;
                    }
                    search.create({
                        type: 'customrecord_dps_customs_invoice_item',
                        filters: [
                            { name: 'custrecord_dps_cus_inv_information', join: 'custrecord_dps_c_i_item_link', operator: 'anyof', values: informationId }
                        ],
                        columns: [
                            'custrecord_dps_customs_invoice_item', 'custrecord_dps_customs_invoice_item_qty', 'custrecord_dps_cus_inv_item_po_price'
                        ]
                    }).run().each(function(result) {
                        SKUs.push({
                            'item': result.getValue('custrecord_dps_customs_invoice_item'),
                            'qty': result.getValue('custrecord_dps_customs_invoice_item_qty'),
                            'price': result.getValue('custrecord_dps_cus_inv_item_po_price')
                        });
                        return true;
                    });
                    poDataJson.skus = SKUs;

                    var create_url = url.resolveScript({ scriptId: 'customscript_dps_decl_infom_create_po_sl', deploymentId: 'customdeploy_dps_decl_infom_create_po_sl' });
                    https.post.promise({
                        url: create_url,
                        body: {
                            action: 'createpo',
                            poData: JSON.stringify(poDataJson)
                        }
                    }).then(function (resp) {
                        resp = JSON.parse(resp.body);
                        commonTool.endMask();
                        dialog.alert({ title: '提示', message: resp.msg }).then(function () {
                            window.location.reload();
                        });
                    });
                }
            }
            function failure(reason) {}
            dialog.confirm(options).then(success).catch(failure);
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
        createInterPO: createInterPO
    }
});
