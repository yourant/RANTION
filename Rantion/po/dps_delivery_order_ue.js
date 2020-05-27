/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/log', 'N/record', 'N/runtime'], function(log, record, runtime) {

    var roleId = runtime.getCurrentUser().role;
    function beforeLoad(context) {
      log.debug('roleId',roleId);
        var newRecord = context.newRecord;
        if(context.type == 'view' && newRecord.type == 'purchaseorder' && !newRecord.getValue('custbody_dps_delivery_id')){
            var form = context.form 
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id : 'custpage_bills',
                label : '生成交货单',
                functionName : 'createDeliveryBills'
            });
        }

        if(context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order' && newRecord.getValue('custrecord_delivery_order_status') == 1){// && roleId == 16
            var form = context.form 
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id : 'custpage_determine',
                label : '供应商确定',
                functionName : 'supplierDetermination'
            });
        }

        if(context.type == 'view' && newRecord.type == 'customrecord_dps_delivery_order'){// && newRecord.getValue('custrecord_delivery_order_status') == 2 && roleId != 16
            var form = context.form 
            form.clientScriptModulePath = './dps_purchase_order_cs.js';
            form.addButton({
                id : 'custpage_push_to_wms',
                label : '推送WMS',
                functionName : 'pushToWms'
            });
        }
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        try{
            var newRecord = context.newRecord;
            var data = record.load({ type: 'customrecord_dps_delivery_order', id: newRecord.id, isDynamic: true});
            var count = data.getLineCount({ sublistId: 'recmachcustrecord_dps_delivery_order_id'});
            var total_itemQuantity = 0, total_packingQuantity = 0, total_boxesNumber = 0;
            for(var i = 0; i < count; i++){
                var item_quantity= data.getSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', line: i, fieldId: 'custrecord_item_quantity' });//交货数量
                total_itemQuantity += Number(item_quantity);
                var packing_quantity= data.getSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', line: i, fieldId: 'custrecord_line_packing_quantity' });//装箱数量
                total_packingQuantity += Number(packing_quantity);
                var boxes_number= data.getSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', line: i, fieldId: 'custrecord_line_boxes_number' });//箱数
                total_boxesNumber += Number(boxes_number);
            }
            data.setValue({fieldId: 'custrecord_delivery_item_quantity', value: total_itemQuantity});
            data.setValue({fieldId: 'custrecord_packing_quantity', value: total_packingQuantity});
            data.setValue({fieldId: 'custrecord_boxes_number', value: total_boxesNumber});
            data.save();
        }catch(e){
            log.debug('e',e);
        }
        
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
