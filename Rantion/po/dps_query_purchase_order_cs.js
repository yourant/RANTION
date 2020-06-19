/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/config.js', 'N/ui/dialog', 'N/runtime'],
    function (config, dialog, runtime) {

        var roleId = runtime.getCurrentUser().role;

        function pageInit(context) {
            if (roleId == config.vendorRoleId) {
                // document.getElementById('custrecord_purchase_order_no').disabled = true; // 交货单号
                // document.getElementById('custrecord_dsp_delivery_order_location').disabled = true; // 地点

                document.getElementById('custrecord_supplier_code').disabled = true; // 供应商编码
                document.getElementById('custrecord_settlement_method').disabled = true; // 结算方式
                document.getElementById('custrecord_delivery_remarks').disabled = true; // 备注
                document.getElementById('custrecord_tracking_number').disabled = true; // 运单号
            } else {
                //document.getElementById('custrecord_delivery_date').disabled = true;//交期
            }
        }

        function saveRecord(context) {
            return true;
        }

        function validateField(context) {
            var sblId = 'recmachcustrecord_dps_delivery_order_id';
            var rec = context.currentRecord;
            if (context.fieldId == 'custrecord_ddoi_long' || context.fieldId == 'custrecord_ddoi_width'
                || context.fieldId == 'custrecord_ddoi_high' || context.fieldId == 'custrecord_item_quantity') {
                var long = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_ddoi_long' })) / 100;
                var width = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_ddoi_width' })) / 100;
                var high = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_ddoi_high' })) / 100;
                var volume = long * high * width;
                rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_ddoi_single_box_volume', value: volume.toFixed(2) });
                var packqty = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_line_boxes_number' }));
                var volumest = volume * packqty;
                rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_ddoi_dps_total_volume', value: volumest.toFixed(2) });
            }
            if (context.fieldId == 'custrecord_item_quantity') {
                var qty = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_item_quantity' }));
                var packingqty = Number(rec.getCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_line_packing_quantity' }));
                var num = 0;
                if (qty > 0 && packingqty > 0) {
                    num = qty / packingqty;
                    num = Math.ceil(num);
                }
                rec.setCurrentSublistValue({ sublistId: sblId, fieldId: 'custrecord_line_boxes_number', value: num });
            }
            return true;
        }

        function fieldChanged(context) {
            // console.log('roleId:' + roleId);
            // if (roleId != config.vendorRoleId && roleId != config.managerRoleId) {
            //     var fieldId = context.fieldId;
            //     if (fieldId != 'custrecord_item_quantity' && fieldId != 'custrecord_delivery_date' 
            //         && fieldId != 'custrecord_outstanding_quantity') {
            //         dialog.alert({
            //             title: '不允许进行修改',
            //             message: '不允许进行修改！'
            //         }).then(success).catch(failure);
            //         function success(result) { 
            //             window.location.reload(true); 
            //         }
            //         function failure(reason) { 
            //             console.log('Failure: ' + reason) 
            //         }
            //         return;	
            //     }
            // }
        }

        function postSourcing(context) {
            return true;
        }

        function lineInit(context) {
            var sblId = 'recmachcustrecord_dps_delivery_order_id';
            var rec = context.currentRecord;
            var deliveryAmount = 0;
            var lineNum = rec.getLineCount({ sublistId: sblId });
            for (var i = 0; i < lineNum; i++) {
                var qty = Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_item_quantity', line: i }));
                var rate = Number(rec.getSublistValue({ sublistId: sblId, fieldId: 'custrecord_unit_price', line: i }));
                deliveryAmount = deliveryAmount + (qty * rate);
            }
            rec.setValue({ fieldId: 'custrecord_delivery_amount', value: deliveryAmount });
            return true;
        }

        function validateDelete(context) {
            return true;
        }

        function validateInsert(context) {
            return true;
        }

        function validateLine(context) {
            var itemRecord = context.currentRecord;
            var itemNumber = 0;
            var supplyQuantity = 0;
            var packingQuantity = 0;
            var boxesQuantity = 0;
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
