/*
 * @Author         : Li
 * @Date           : 2020-05-24 13:52:51
 * @LastEditTime   : 2020-05-28 09:39:55
 * @LastEditors    : Li
 * @Description    : 应用于 大货发运记录, 大货发运记录生成之后, 直接生成报关发票等相关记录
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.create.customs.invoice.js
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

    }

    function afterSubmit(context) {

        try {
            var af_rec = context.newRecord;
            var type = context.type;
            log.debug('type', type);
            if (type == 'create') {
                // 限制于大货的创建
                var order_link = af_rec.getValue('custrecord_dps_trans_order_link'); // 库存转移订单
                var inv_link = af_rec.getValue('custrecord_dps_ship_rec_c_inv_link'); // 报关发票

                var t_o_id = af_rec.getValue('custrecord_dps_trans_order_link');
                if (order_link && !inv_link) {
                    var info = searchItemInfo(t_o_id);
                    log.debug('info', info);
                    if (info && info.length) {
                        // 创建报关发票
                        var invId = createCusInv(info);
                        log.debug('invId', invId);

                        var id = record.submitFields({
                            type: af_rec.type,
                            id: af_rec.id,
                            values: {
                                custrecord_dps_ship_rec_c_inv_link: invId
                            }
                        });

                        if (invId) {
                            // 创建报关装箱
                            var boxId = createBoxRec(info, invId);
                            log.debug('boxId', boxId);

                            // 创建报关合同
                            var conId = createContract(info, invId);
                            log.debug('conId', conId);

                            // 创建报关单
                            var decId = createDeclaration(info, invId);
                            log.debug('decId', decId);

                            // 创建报关要素
                            var eleArr = CreateElementsOfDeclaration(info, invId);
                            log.debug('eleArr', eleArr);

                            // 创建 US 开票资料
                            var usbArr = createUSBillInformation(info, invId);
                            log.debug('usbArr', usbArr);

                        }
                    }
                }
            }

        } catch (error) {
            log.error('error', error);
        }
    }


    /**
     * 获取对应的库存转移订单的信息
     * @param {*} t_o_id 
     */
    function searchItemInfo(t_o_id) {
        var info = [],
            limit = 3999;
        search.create({
            type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: t_o_id
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
                'rate', 'item', 'quantity', "taxamount",
                {
                    name: 'custitem_dps_declaration_cn',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_brand',
                    join: 'item'
                }
            ]
        }).run().each(function (rec) {
            if (rec.getValue('quantity') > 0) {
                var it = {
                    name: rec.getValue({
                        name: 'custitem_dps_declaration_cn',
                        join: 'item'
                    }),
                    rate: rec.getValue('rate'),
                    qty: rec.getValue('quantity'),
                    brand: rec.getValue({
                        name: 'custitem_dps_brand',
                        join: 'item'
                    }),
                    taxamount: rec.getValue("taxamount")
                }
                info.push(it);
            }
            return --limit > 0;
        });
        return info || false;
    }


    /**
     * 创建报关发票
     * @param {*} itemInfo 
     */
    function createCusInv(itemInfo) {

        var inv = record.create({
            type: 'customrecord_dps_customs_invoice'
        });

        var subId = 'recmachcustrecord_dps_c_i_item_link';

        log.debug('createCusInv iteminfo: ' + itemInfo.length, itemInfo);
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
    function createBoxRec(info, invId) {

        var boxRec = record.create({
            type: 'customrecord_dps_packing_documents'
        });

        boxRec.setValue({
            fieldId: 'custrecord_dps_packing_doc_inv_links',
            value: invId
        });

        var subId = 'recmachcustrecord_dps_z_b_l_links'
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];

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
        log.debug('boxRecId', boxRecId);

        return boxRecId || false;
    }

    /**
     * 创建报关合同
     * @param {*} info 
     */
    function createContract(info, invId) {

        var con = record.create({
            type: 'customrecord_dps_customs_contract'
        });

        con.setValue({
            fieldId: 'custrecord_dps_cust_contr_inv_link',
            value: invId
        });
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
    function createDeclaration(info, invId) {

        var dec = record.create({
            type: 'customrecord_dps_customs_declaration'
        });
        dec.setValue({
            fieldId: 'custrecord_dps_customs_decl_inv_links',
            value: invId
        });

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
    function CreateElementsOfDeclaration(info, invId) {
        var recArr = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var elem = record.create({
                type: 'customrecord_dps_elements_declaration'
            });

            var temp = info[i];
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_name',
                value: temp.name
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_total_number',
                value: temp.qty
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_brand',
                value: temp.brand
            });

            elem.setValue({
                fieldId: 'custrecord__dps_elem_dedecl_inv_link',
                value: invId
            });

            var elemId = elem.save();
            // log.debug('elemId', elemId);
            if (elemId) {
                recArr.push(elemId);
            }
        }
        log.debug('recArr', recArr);
        return recArr || false;

    }


    /**
     * 创建US开票资料
     * @param {*} info 
     * @param {*} invId 
     */
    function createUSBillInformation(info, invId) {

        var USBil = [];
        for (var i = 0, len = info.length; i < len; i++) {

            var temp = info[i];
            var usbil = record.create({
                type: 'customrecord_dps_us_billing_information'
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_item_name',
                value: temp.name
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_qty',
                value: temp.qty
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price',
                value: temp.rate
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_amount',
                value: Number(temp.qty) * Number(temp.rate)
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price_includ',
                value: temp.qty
            });
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_tax_included_amoun',
                value: temp.taxamount
            });

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_tax_links',
                value: invId
            });

            var usbilId = usbil.save();
            if (usbilId) {
                USBil.push(usbil);
            }
        }

        return USBil || false;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});