/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/config.js', 'N/ui/dialog', 'N/runtime', 'N/record'],
    function (config, dialog, runtime, record) {

        var roleId = runtime.getCurrentUser().role;

        function pageInit(context) {

            // var objField = context.currentRecord.getField({
            //     fieldId: 'custrecord_delivery_date'
            // });
            // objField.isMandatory = true; //交期

            if (roleId == config.vendorRoleId) {
                // document.getElementById('custrecord_purchase_order_no').disabled = true; // 交货单号
                // document.getElementById('custrecord_dsp_delivery_order_location').disabled = true; // 地点

                var objField = context.currentRecord.getField({
                    fieldId: 'custrecord_delivery_date'
                });
                objField.isMandatory = true; //交期

                // document.getElementById('custrecord_delivery_date').disabled = true; //交期
                document.getElementById('custrecord_supplier_code').disabled = true; // 供应商编码
                document.getElementById('custrecord_settlement_method').disabled = true; // 结算方式
                document.getElementById('custrecord_delivery_remarks').disabled = true; // 备注
                document.getElementById('custrecord_tracking_number').disabled = true; // 运单号
            } else {
                //document.getElementById('custrecord_delivery_date').disabled = true;//交期
            }
        }

        function saveRecord(context) {

            if (roleId == config.vendorRoleId) {
                var saDate = context.currentRecord.getValue('custrecord_delivery_date');
                if (!saDate) {
                    dialog.alert({
                        title: '提示',
                        message: '请输入交期'
                    });

                    return false;
                }
            }

            var curRec = context.currentRecord;
            var numLines = curRec.getLineCount({
                sublistId: 'recmachcustrecord_dps_delivery_order_id'
            });

            // console.log('numLines', numLines);

            if (numLines < 1) {
                dialog.alert({
                    title: '提示',
                    message: '请选择一个货品行'
                });
                return false;
            } else {

                // console.log('存在货品行', numLines);
                var checkArr = [];
                for (var i = 0; i < numLines; i++) {
                    var check = curRec.getSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_dps_delivery_order_check',
                        line: i
                    });

                    if (check) {
                        checkArr.push(check);
                    }
                }

                if (checkArr.length > 0) {
                    // console.log('选择了对应的货品')
                    return true;
                } else {
                    // console.log('未选择有货品')
                    dialog.alert({
                        title: '提示',
                        message: '请选择一个货品行'
                    });
                    return false;
                }
            }

            return true;
        }

        function validateField(context) {
            var sblId = 'recmachcustrecord_dps_delivery_order_id';
            var rec = context.currentRecord;
            if (context.fieldId == 'custrecord_ddoi_long' || context.fieldId == 'custrecord_ddoi_width' ||
                context.fieldId == 'custrecord_ddoi_high' || context.fieldId == 'custrecord_item_quantity') {
                var long = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_ddoi_long'
                })) / 100;
                var width = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_ddoi_width'
                })) / 100;
                var high = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_ddoi_high'
                })) / 100;
                var volume = long * high * width;
                rec.setCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_ddoi_single_box_volume',
                    value: volume.toFixed(2)
                });
                var packqty = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_line_boxes_number'
                }));
                var volumest = volume * packqty;
                rec.setCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_ddoi_dps_total_volume',
                    value: volumest.toFixed(2)
                });
            }
            if (context.fieldId == 'custrecord_item_quantity') {
                var qty = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_item_quantity'
                }));
                var packingqty = Number(rec.getCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_line_packing_quantity'
                }));
                var num = 0;
                if (qty > 0 && packingqty > 0) {
                    num = qty / packingqty;
                    num = Math.ceil(num);
                }
                rec.setCurrentSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_line_boxes_number',
                    value: num
                });
            }

            if (context.fieldId == "custrecord_item_quantity") {
                var itemRecord = context.currentRecord;
                var itemNumber = 0,
                    hideNumber = 0;
                //交货数量
                itemNumber = itemRecord.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_item_quantity',
                });
                //隐藏交货数量
                hideNumber = itemRecord.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_hide_quantity',
                });
                // console.log("hideNumber: " + hideNumber, "itemNumber: " + itemNumber)
                if (hideNumber < itemNumber) {
                    dialog.alert({
                        title: '提示',
                        message: '现交货数量应小于原有交货数量'
                    });
                    itemRecord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_item_quantity',
                        value: hideNumber
                    });
                    return false;
                } else {
                    var outstandingQuantity = hideNumber - itemNumber;
                    itemRecord.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id',
                        fieldId: 'custrecord_outstanding_quantity',
                        value: outstandingQuantity
                    });
                }
            }
            return true;
        }

        function fieldChanged(context) {
            // console.log('roleId:' + roleId);
            // if (roleId != config.vendorRoleId && roleId != config.managerRoleId) {   // HACK 限制于供应商不允许修改交货地点
            if (roleId == config.vendorRoleId) {
                var fieldId = context.fieldId;
                if (fieldId != 'custrecord_item_quantity' && fieldId != 'custrecord_delivery_date' &&
                    fieldId != 'custrecord_outstanding_quantity') {
                    dialog.alert({
                        title: '不允许进行修改',
                        message: '不允许进行修改！'
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
            var sblId = 'recmachcustrecord_dps_delivery_order_id';
            var rec = context.currentRecord;
            var deliveryAmount = 0;
            var lineNum = rec.getLineCount({
                sublistId: sblId
            });
            for (var i = 0; i < lineNum; i++) {
                var qty = Number(rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_item_quantity',
                    line: i
                }));
                var rate = Number(rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_unit_price',
                    line: i
                }));
                deliveryAmount = deliveryAmount + (qty * rate);
            }
            rec.setValue({
                fieldId: 'custrecord_delivery_amount',
                value: deliveryAmount
            });
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
            var itemNumber = 0,
                hideNumber = 0;
            //交货数量
            itemNumber = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_item_quantity',
            });
            //隐藏交货数量
            hideNumber = itemRecord.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                fieldId: 'custrecord_hide_quantity',
            });
            // console.log(hideNumber)
            if (hideNumber < itemNumber) {
                dialog.alert({
                    title: '提示',
                    message: '现交货数量应小于原有交货数量'
                });
                return false;
            } else {
                var outstandingQuantity = hideNumber - itemNumber;
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