/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', 'N/redirect'], function (record, search, log, redirect) {

    function beforeLoad(context) {
        var type = context.type;
        var bl_rec = context.newRecord;
        var link = bl_rec.getValue('custbody_dps_fu_rec_link');
        var link_status;
        if (link) {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{ name: 'internalid', operator: 'anyof', values: link }],
                columns: ['custrecord_dps_shipping_rec_status']
            }).run().each(function (rec) {
                link_status = rec.getValue('custrecord_dps_shipping_rec_status');
            });
            if (type == 'edit' && (link_status == 14 || link_status == 10 || link_status == 3)) {
                // 这些状态下,  不允许更改库存转移订单
                redirect.toRecord({
                    type: bl_rec.type,
                    id: bl_rec.id
                });
            }
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var af_rec = context.newRecord;
        var orderstatus = af_rec.getValue('orderstatus');
        if (orderstatus == 'B') {
            try {
                // 创建大货发运记录
                var rec_id = createFulRecord(af_rec);
                // var rec_id = '1034';
                if (rec_id) {
                    record.submitFields({
                        type: af_rec.type,
                        id: af_rec.id,
                        values: {
                            'custbody_dps_fu_rec_link': rec_id
                        }
                    });

                    if (context.type == 'create') {
                        var info = searchItemInfo(af_rec.id);
                        var subsidiary = af_rec.getValue('subsidiary');
                        if (info && info.length) {
                            // 创建报关资料
                            var informaId = createInformation(rec_id, af_rec.id);
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: rec_id,
                                values: {
                                    custrecord_dps_shipping_rec_information: informaId
                                }
                            });
                            log.debug('informaId', informaId);
                            if (informaId) {
                                // 创建报关发票
                                createCusInv(info, informaId);

                                // 创建报关装箱
                                var boxId = createBoxRec(info, informaId);
                                log.debug('boxId', boxId);

                                // 创建报关合同
                                var conId = createContract(info, informaId, subsidiary);
                                log.debug('conId', conId);

                                // 创建报关单
                                var decId = createDeclaration(info, informaId);
                                log.debug('decId', decId);

                                // 创建报关要素
                                var eleArr = CreateElementsOfDeclaration(info, informaId);
                                log.debug('eleArr', eleArr);

                                // 创建 US 开票资料
                                var usbArr = createUSBillInformation(info, informaId);
                                log.debug('usbArr', usbArr);
                            }
                        }
                    }
                }
            } catch (error) {
                log.error('error', error);
            }
        } else {
            log.debug('else status', orderstatus);
        }
    }

    /**
     * 创建大货发运记录
     * @param {*} rec 
     */
    function createFulRecord(rec) {
        var objRecord;
        var link = rec.getValue('custbody_dps_fu_rec_link');
        var link_status;
        if (link) {
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: link
                }]
            }).run().each(function (rec) {
                link_status = rec.getValue('custrecord_dps_shipping_rec_status');
            });
            objRecord = record.load({
                type: 'customrecord_dps_shipping_record',
                id: link
            });

            // 若对应的发运记录为 "WMS已发运" 或者 "WMS一部分发运" 直接退出,不做任何修改
            var rec_status = objRecord.getValue('custrecord_dps_shipping_rec_status');
            if (rec_status == 6 || rec_status == 7) {
                return;
            }
        } else {
            objRecord = record.create({
                type: 'customrecord_dps_shipping_record'
            });
        }
        if (link_status == 1 || link_status == 4 || link_status == 9 || link_status == 11) {

        }
        objRecord.setValue({
            fieldId: 'custrecord_dps_shipping_rec_location',
            value: rec.getValue('location')
        });

        // 1 FBA调拨
        // 2 自营仓调拨
        // 3 跨仓调拨
        var tran_type = rec.getValue('custbody_dps_transferor_type');
        log.audit('tran_type', tran_type);
        // 调拨单类型
        objRecord.setValue({ fieldId: 'custrecord_dps_ship_record_tranor_type', value: Number(tran_type) });
        var s;
        if (tran_type) {
            if (tran_type == 2) { // 2	自营仓调拨
                s = 1;
            } else if (tran_type == 1) { // 1	FBA调拨
                s = 11;
            } else if (tran_type == 3) { // 3	跨仓调拨
                s = 1;
            }
            if (!link_status) {
                objRecord.setValue({
                    fieldId: 'custrecord_dps_shipping_rec_status',
                    value: s
                });
            }
        }

        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_department', value: rec.getValue('department') });
        // 渠道商
        var channel_dealer = rec.getValue('custbody_dps_transferor_channel_dealer');
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_r_channel_dealer', text: channel_dealer });
        var channelservice = rec.getValue('custbody_dps_transferor_channelservice');
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_r_channelservice', text: channelservice });
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_transa_subje', value: rec.getValue('subsidiary') });
        objRecord.setValue({ fieldId: 'custrecord_dps_trans_order_link', value: rec.id });
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_to_location', value: rec.getValue('transferlocation') });
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_create_date', value: rec.getValue('trandate') });
        var account = rec.getValue('custbody_aio_account');
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_account', value: account });
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_order_num', value: rec.id });
        var weight = getItemWeight(rec);
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_rec_weight', value: weight });
        var employee = rec.getValue('employee');
        var numLines = rec.getLineCount({ sublistId: 'item' });
        // 渠道商
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_r_channel_dealer', value: rec.getValue('custbody_dps_transferor_channel_dealer') });
        // 渠道服务
        objRecord.setValue({ fieldId: 'custrecord_dps_shipping_r_channelservice', value: rec.getValue('custbody_dps_transferor_channelservice') });
        for (var i = 0; i < numLines; i++) {
            var item_sku = rec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_dps_trans_order_item_sku', line: i });
            var item = rec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
            if (account) {
                try {
                    item_sku = searchItemSku(item, account);
                } catch (error) {
                    log.error('获取货品对应的SKU出错了', error);
                }
            }
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_sku_item',
                line: i,
                value: item_sku
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_shipping_record_item',
                line: i,
                value: item
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_item_location',
                line: i,
                value: rec.getValue('transferlocation')
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_rec_item_account',
                line: i,
                value: rec.getValue('custbody_aio_account')
            });
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                fieldId: 'custrecord_dps_ship_record_item_quantity',
                line: i,
                value: rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                })
            });
        }
        var objRecord_id;
        if (link && link_status == 1 || link_status == 4 || link_status == 9 || link_status == 11) {
            objRecord_id = objRecord.save();
        } else if (!link) {
            objRecord_id = objRecord.save();
        }
        return objRecord_id || false;
    }

    /**
     * 获取货品的所有重量
     * @param {*} rec 
     */
    function getItemWeight(rec) {
        var weight = 0;
        var limit = 3999;
        search.create({
            type: rec.type,
            filters: [
                { name: 'internalid', operator: 'is', values: rec.id },
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false }
            ],
            columns: [{ name: 'weight', join: 'item' }]
        }).run().each(function (rec) {
            weight = rec.getValue({ name: 'weight', join: 'item' });
            return --limit > 0;
        });
        return weight || 0;
    }

    /**
     * 根据 货品ID, 获取对应的 SKU
     * @param {*} itemId 
     * @param {*} account 
     */
    function searchItemSku(itemId, account) {
        var info;
        search.create({
            type: 'customrecord_dps_amazon_seller_sku',
            filters: [
                { name: 'custrecord_dps_amazon_ns_sku', operator: 'anyof', values: itemId },
                { name: 'custrecord_dps_store', operator: 'anyof', values: account }
            ],
            columns: [
                'custrecord_dps_amazon_sku_number', 
                { name: 'weight', join: 'custrecord_dps_amazon_ns_sku' }
            ]
        }).run().each(function (rec) {
            info = rec.getValue('custrecord_dps_amazon_sku_number');
            return false;
        });
        return info || false;
    }

    /**
     * 获取对应的库存转移订单的信息
     * @param {*} t_o_id 
     */
    function searchItemInfo(t_o_id) {
        var info = [];
        search.create({
            type: 'transferorder',
            filters: [
                { name: 'internalid', operator: 'anyof', values: t_o_id },
                { name: 'mainline', operator: 'is', values: false },
                { name: 'taxline', operator: 'is', values: false }
            ],
            columns: [
                'rate', 'item', 'quantity', "taxamount",
                { name: 'custitem_dps_declaration_cn', join: 'item' },
                { name: 'custitem_dps_brand', join: 'item' }
            ]
        }).run().each(function (rec) {
            if (rec.getValue('quantity') > 0) {
                var it = {
                    itemId: rec.getValue('item'),
                    name: rec.getValue({ name: 'custitem_dps_declaration_cn', join: 'item' }),
                    rate: rec.getValue('rate'),
                    qty: rec.getValue('quantity'),
                    brand: rec.getValue({ name: 'custitem_dps_brand', join: 'item' }),
                    brandName: rec.getText({ name: 'custitem_dps_brand', join: 'item' }),
                    taxamount: rec.getValue("taxamount")
                }
                info.push(it);
            }
            return true;
        });
        return info || false;
    }

    /**
     * 创建报关发票
     * @param {*} itemInfo 
     * @param {*} informaId 
     */
    function createCusInv(itemInfo, informaId) {
        var inv = record.create({ type: 'customrecord_dps_customs_invoice' });
        inv.setValue({ fieldId: 'custrecord_dps_cus_inv_information', value: informaId });
        var subId = 'recmachcustrecord_dps_c_i_item_link';
        for (var i = 0, len = itemInfo.length; i < len; i++) {
            var temp = itemInfo[i];
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_qty',
                line: i,
                value: temp.qty
            });
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_name',
                line: i,
                value: temp.name
            });
            // FIXME 发票的单价, 有待处理
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_pric',
                line: i,
                value: temp.rate
            });
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_inv_item_amount',
                line: i,
                value: Number(temp.rate) * Number(temp.qty)
            });
        }
        var inv_id = inv.save();
        return inv_id || false;
    }

    /**
     * 创建报关装箱单
     * @param {*} info 
     */
    function createBoxRec(info, informaId) {
        var boxRec = record.create({ type: 'customrecord_dps_packing_documents' });
        boxRec.setValue({ fieldId: 'custrecord_dps_p_declaration_informa', value: informaId });
        var subId = 'recmachcustrecord_dps_z_b_l_links'
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docu_item_id',
                value: temp.itemId,
                line: i
            });
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docu_item_name',
                value: temp.name,
                line: i
            });
            boxRec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_pack_docum_item_qty',
                value: temp.qty,
                line: i
            });
        }
        var boxRecId = boxRec.save();
        return boxRecId || false;
    }

    /**
     * 创建报关合同
     * @param {*} info 
     */
    function createContract(info, informId, sub) {
        var con = record.create({ type: 'customrecord_dps_customs_contract' });
        con.setValue({ fieldId: 'custrecord_dps_c_c_seller', value: sub });
        con.setValue({ fieldId: 'custrecord_dps_c_c_information', value: informId });
        var subId = 'recmachcustrecord_dps_c_c_li_links';
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_i_item_name',
                line: i,
                value: temp.name
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_qty',
                line: i,
                value: temp.qty
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_util_price',
                line: i,
                value: temp.rate
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_amount',
                line: i,
                value: Number(temp.rate) * Number(temp.qty)
            });
        }
        var conId = con.save();
        return conId || false;
    }


    /**
     * 创建报关单
     * @param {*} info 
     */
    function createDeclaration(info, informaId) {
        var dec = record.create({ type: 'customrecord_dps_customs_declaration' });
        dec.setValue({ fieldId: 'custrecord_dps_cu_decl_infomation_link', value: informaId });
        var subId = 'recmachcustrecord_dps_customs_decla_item_link'
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_name',
                value: temp.name,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_qty',
                value: temp.qty,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item',
                value: temp.itemId,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custom_decl_item_un_price',
                value: temp.rate,
                line: i
            });
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custo_decl_total_amount',
                value: Number(temp.rate) * Number(temp.qty),
                line: i
            });
        }
        var decId = dec.save();
        return decId || false;
    }

    /**
     * 创建申报要素
     * @param {*} info 
     */
    function CreateElementsOfDeclaration(info, informaId) {
        var recArr = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var elem = record.create({ type: 'customrecord_dps_elements_declaration' });
            var temp = info[i];
            elem.setValue({ fieldId: 'custrecord_dps_elem_dedecl_name', value: temp.name });
            elem.setValue({ fieldId: 'custrecord_dps_elem_dedecl_total_number', value: temp.qty });
            elem.setValue({ fieldId: 'custrecord_dps_elem_dedecl_brand', value: temp.brandName });
            elem.setValue({ fieldId: 'custrecord_dps_elem_dedecl_information', value: informaId });
            var elemId = elem.save();
            if (elemId) {
                recArr.push(elemId);
            }
        }
        return recArr || false;
    }

    /**
     * 创建US开票资料
     * @param {*} info 
     * @param {*} invId 
     */
    function createUSBillInformation(info, informaId) {
        var USBil = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            var usbil = record.create({ type: 'customrecord_dps_us_billing_information' });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_item_name', value: temp.name });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_qty', value: temp.qty });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_unit_price', value: temp.rate });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_amount', value: Number(temp.qty) * Number(temp.rate) });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_unit_price_includ', value: temp.qty });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_tax_included_amoun', value: temp.taxamount });
            usbil.setValue({ fieldId: 'custrecord_dps_us_b_i_informa', value: informaId });
            var usbilId = usbil.save();
            if (usbilId) {
                USBil.push(usbil);
            }
        }
        return USBil || false;
    }

    /**
     * 创建报关资料
     * @param {*} recordId 
     * @param {*} transferorderId 
     */
    function createInformation(recordId, transferorderId) {
        var information = record.create({ type: 'customrecord_customs_declaration_informa' });
        information.setValue({ fieldId: 'custrecord_fulfillment_record', value: recordId });
        information.setValue({ fieldId: 'custrecord_transfer_order', value: transferorderId });
        var id = information.save();
        return id;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }

});