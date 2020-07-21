/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function beforeLoad(context) {
        var form = context.form;
        var curr = context.newRecord
        log.error("context:", JSON.stringify(context))
        if (curr.id && context.type == 'view') {
            log.error("curr.id:", curr.id)
            search.create({
                type: 'returnauthorization',
                filters: [{
                    name: 'createdfrom',
                    operator: 'anyof',
                    values: curr.id
                }],
                columns: ['tranid']
            }).run().each(function (rec) {
                log.error("rec:", JSON.stringify(rec))
                form.addButton({
                    id: 'custpage_dps_li_sales_button',
                    label: '生成补货订单',
                    functionName: "createNewSo(" + curr.id + ',' + rec.id + ',' + 1 + ")"
                });
                return false;
            });
        }

        form.clientScriptModulePath = './dps.li.sales.replenishment.cs.js';
    }

    function beforeSubmit(context) {
        if (context.type == 'create') {
            var newSorec = context.newRecord;
            var interid = newSorec.getValue('intercotransaction');
            var soLoaction = newSorec.getValue('location');
            if (interid && !soLoaction) {
                search.create({
                    type: 'subsidiary',
                    filters: [
                        { name: 'internalid', operator: 'anyof', values: newSorec.getValue('subsidiary') }
                    ],
                    columns: ['custrecord_virtual_transit_warehouse']
                }).run().each(function (result) {
                    soLoaction = result.getValue('custrecord_virtual_transit_warehouse');
                    return true;
                });
                newSorec.setValue({ fieldId: 'location', value: soLoaction });
            }
        }
    }

    function afterSubmit(context) {
        if (context.type == 'create') {
            var newSorec = context.newRecord;
            var purchaseOrderRecordId, poLocation;
            // 判断是否公司间交易产生的销售订单
            search.create({
                type: 'purchaseorder',
                filters: [{ name: 'intercotransaction', operator: 'is', values: newSorec.id }],
                columns: ['location']
            }).run().each(function (result) {
                purchaseOrderRecordId = result.id;
                poLocation = result.getValue('location');
            });
            if (purchaseOrderRecordId) {
                // 生成货品履行
                var itemFulfillment = record.transform({
                    fromType: 'salesorder',
                    toType: record.Type.ITEM_FULFILLMENT,
                    fromId: Number(newSorec.id),
                });

                itemFulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });
                var lineIF = itemFulfillment.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineIF; i++) {
                    var itemre = itemFulfillment.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var quantity = itemFulfillment.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i })
                    var l_fulfillment = newSorec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: itemre });
                    var location_IF = newSorec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_fulfillment }) ? newSorec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_fulfillment }) : newSorec.getValue('location');
                    itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location_IF, line: i });
                    itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity, line: i });
                }
                var ifId = itemFulfillment.save();
                log.debug('if生成成功', ifId);

                // 生成发票
                var Invoice = record.transform({
                    fromType: 'salesorder',
                    toType: record.Type.INVOICE,
                    fromId: Number(newSorec.id),
                })
                var InvoiceId = Invoice.save();
                log.debug('Invoice生成成功', InvoiceId);

                // 生成货品收据
                var itemReceipt = record.transform({
                    fromType: 'purchaseorder',
                    toType: record.Type.ITEM_RECEIPT,
                    fromId: Number(purchaseOrderRecordId),
                });
                var po = record.load({ type: 'purchaseorder', id: purchaseOrderRecordId });
                var lineIR = itemReceipt.getLineCount({ sublistId: 'item' });
                for (var i = 0; i < lineIR; i++) {
                    var itemre = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    var quantity = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i });
                    var l_receipt = po.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: itemre });
                    var location_IR = po.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_receipt }) ? po.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_receipt }) : po.getValue('location');
                    itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location_IR, line: i });
                    itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity, line: i });
                }
                var irId = itemReceipt.save();
                log.debug('货品收据生成成功', irId);

                // 生成应付账单
                var venderBill = record.transform({
                    fromType: 'purchaseorder',
                    toType: record.Type.VENDOR_BILL,
                    fromId: Number(purchaseOrderRecordId),
                });
                var venderBillId = venderBill.save();
                log.debug('应付账单生成成功', venderBillId);

                // 生成NO.3 transferorder
                var shipping_id, subsidiary, to_loaction, informa_id;
                var SKUs = [];
                search.create({
                    type: 'customrecord_dps_shipping_record',
                    filters: [
                        { name: 'custrecord_inter_po', operator: 'anyof', values: purchaseOrderRecordId }
                    ],
                    columns: [
                        { name: 'custbodyactual_target_subsidiary', join: 'custrecord_dps_shipping_rec_order_num' },
                        { name: 'custbody_actual_target_warehouse', join: 'custrecord_dps_shipping_rec_order_num' }
                    ]
                }).run().each(function (result) {
                    shipping_id = result.id;
                    subsidiary = result.getValue({ name: 'custbodyactual_target_subsidiary', join: 'custrecord_dps_shipping_rec_order_num' });
                    to_loaction = result.getValue({ name: 'custbody_actual_target_warehouse', join: 'custrecord_dps_shipping_rec_order_num' });
                    return false;
                });

                search.create({
                    type: 'customrecord_customs_declaration_informa',
                    filters: [
                        { name: 'custrecord_inter_po_report', operator: 'anyof', values: purchaseOrderRecordId }
                    ]
                }).run().each(function (result) {
                    informa_id = result.id;
                    return true;
                });

                if (informa_id && shipping_id && subsidiary && to_loaction) {
                    search.create({
                        type: 'customrecord_dps_customs_decl_item',
                        filters: [
                            { name: 'custrecord_dps_cu_decl_infomation_link', join: 'custrecord_dps_customs_decla_item_link', operator: 'anyof', values: informa_id }
                        ],
                        columns: [
                            'custrecord_dps_customs_decl_item', 'custrecord_dps_customs_decl_item_qty', 'custrecord_dps_custom_decl_item_un_price'
                        ]
                    }).run().each(function (result) {
                        SKUs.push({
                            'item': result.getValue('custrecord_dps_customs_decl_item'),
                            'qty': result.getValue('custrecord_dps_customs_decl_item_qty'),
                            'price': result.getValue('custrecord_dps_custom_decl_item_un_price')
                        });
                        return true;
                    });

                    // 创建NO.3库存转移订单
                    var transferorder_c_rec = record.create({ type: 'transferorder', isDynamic: true });
                    transferorder_c_rec.setValue({ fieldId: 'subsidiary', value: subsidiary });
                    transferorder_c_rec.setValue({ fieldId: 'custbody_dps_start_location', value: poLocation });
                    transferorder_c_rec.setValue({ fieldId: 'location', value: poLocation });
                    transferorder_c_rec.setValue({ fieldId: 'custbody_dps_end_location', value: to_loaction });
                    transferorder_c_rec.setValue({ fieldId: 'transferlocation', value: to_loaction });
                    transferorder_c_rec.setValue({ fieldId: 'orderstatus', value: 'B' });
                    transferorder_c_rec.setValue({ fieldId: 'custbody_dps_transferor_type', value: '5' });
                    transferorder_c_rec.setValue({ fieldId: 'custbody_dps_fu_rec_link', value: shipping_id });
                    for (var index = 0; index < SKUs.length; index++) {
                        transferorder_c_rec.selectNewLine({ sublistId: 'item' });
                        transferorder_c_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: SKUs[index].item });
                        transferorder_c_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: SKUs[index].qty });
                        transferorder_c_rec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: SKUs[index].price });
                        transferorder_c_rec.commitLine({ sublistId: 'item' });
                    }
                    var transferorder_c_id = transferorder_c_rec.save();

                    // 修改报告资料
                    if (informa_id) {
                        record.submitFields({
                            type: 'customrecord_customs_declaration_informa',
                            id: informa_id,
                            values: { 'custrecord_inter_so_report': newSorec.id }
                        });
                    }

                    // 修改发运记录
                    var shipping_rec = record.load({ type: 'customrecord_dps_shipping_record', id: shipping_id });
                    shipping_rec.setValue({ fieldId: 'custrecord_inter_so', value: newSorec.id });
                    shipping_rec.setValue({ fieldId: 'custrecord_transfer_order3', value: transferorder_c_id });
                    shipping_rec.save();

                    // NO.3库存转移订单生成货品履行
                    var itemFulfillment = record.transform({
                        fromType: 'transferorder',
                        toType: record.Type.ITEM_FULFILLMENT,
                        fromId: Number(transferorder_c_id),
                    });
                    itemFulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });
                    var lineIF = itemFulfillment.getLineCount({ sublistId: 'item' });
                    for (var i = 0; i < lineIF; i++) {
                        var itemre = itemFulfillment.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                        var quantity = itemFulfillment.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: i })
                        var l_fulfillment = newSorec.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: itemre });
                        var location_IF = newSorec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_fulfillment }) ? newSorec.getSublistValue({ sublistId: 'item', fieldId: 'location', line: l_fulfillment }) : poLocation;
                        itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location_IF, line: i });
                        itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity, line: i });
                    }
                    var ifId = itemFulfillment.save();
                    log.debug('库存转移订单if生成成功', ifId);
                }
            }
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
