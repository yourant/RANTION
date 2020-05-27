/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(["N/ui/dialog", 'N/runtime'],
    function (dialog, runtime) {

        var roleId = runtime.getCurrentUser().role;
        function pageInit(context) {
            console.log(roleId) 
            if(roleId == 16){
                document.getElementById('custrecord_supplier_code').disabled = true;//供应商编码
                document.getElementById('custrecord_settlement_method').disabled = true;//结算方式
                document.getElementById('custrecord_delivery_amount').disabled = true;//交货金额
                document.getElementById('custrecord_carton_size').disabled = true;//纸箱尺寸
                document.getElementById('custrecord_single_box_volume').disabled = true;//单箱体积(M³)
                document.getElementById('custrecord_total_volume').disabled = true;//总体积(M³)
                document.getElementById('custrecord_delivery_remarks').disabled = true;//备注
                document.getElementById('custrecord_tracking_number').disabled = true;//运单号
            }else{
                //document.getElementById('custrecord_delivery_date').disabled = true;//交期
            }
        }

        function saveRecord(context) {
            return true;
        }

        function validateField(context) {
            return true;
        }

        function fieldChanged(context) {
            console.log(roleId) 
            if(roleId == 16){
                var fieldId = context.fieldId;
                if(fieldId != 'custrecord_supply_quantity' && fieldId != 'custrecord_delivery_date'){
                    dialog.alert({
                        title: '不允许进行修改',
                        message: '不允许进行修改！！'
                    }).then(success).catch(failure);
                    function success(result) { 
                        window.location.reload(true); 
                    }
                    function failure(reason) { 
                        console.log('Failure: ' + reason) 
                    }
                    return;	
                }
            }
 			
        }

        function postSourcing(context) {
            return true;
        }

        function lineInit(context) {
            return true;
        }

        function validateDelete(context) {
            return true;
        }

        function validateInsert(context) {
            return true;
        }

        function validateLine(context) {
            var itemRecord = context.currentRecord, itemNumber = 0, supplyQuantity = 0, packingQuantity = 0, boxesQuantity = 0;
            //采购数量
            var purchaseNumber = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_purchase_quantity',
            });

            //交货数量
            itemNumber = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_item_quantity',
            });

            //供应数量
            supplyQuantity = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_delivery_supply_quantity',
            });

            //装箱数量
            packingQuantity = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_line_packing_quantity',
            });

            if (purchaseNumber < supplyQuantity) {
                dialog.alert({ title: '提示', message: '供应数量应小于采购数量' });
                return false;
            }

            if (purchaseNumber < packingQuantity) {
                dialog.alert({ title: '提示', message: '装箱数量应小于采购数量' });
                return false;
            }

            if (purchaseNumber < itemNumber) {
                dialog.alert({ title: '提示', message: '交货数量应小于采购数量！' });
                return false;
            } else if (supplyQuantity < itemNumber) {
                dialog.alert({ title: '提示', message: '交货数量应小于供应数量' });
                return false;
            } else {
                var outstandingQuantity = purchaseNumber - itemNumber;
                itemRecord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_outstanding_quantity',
                    value: outstandingQuantity
                });
            }            
            return true;
        }

        function sublistChanged(context) {
            return true;
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
