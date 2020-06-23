/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-05 19:59:20
 * @LastEditTime   : 2020-06-08 22:53:11
 * @LastEditors    : Li
 * @Description    : 搜索大货发运记录, 创建报关资料
 * @FilePath       : \Rantion\fulfillment.record\dps.customs.information.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/currency'], function (search, record, log, currency) {

    function getInputData() {
        var limit = 3999,
            ord = [];

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                    name: 'custrecord_dps_shipping_rec_information',
                    operator: 'anyof',
                    values: '@NONE@'
                },
                {
                    name: "custrecord_dps_shipping_rec_order_num",
                    operator: "noneof",
                    values: ["@NONE@"]
                },
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: 1088
                },
            ],
            columns: [
                'custrecord_dps_shipping_rec_order_num', 'custrecord_dps_shipping_rec_transa_subje',
                {
                    name: 'custrecord_gross_margin',
                    join: 'custrecord_dps_shipping_rec_transa_subje'
                }, // 交易主体的毛利率
                {
                    name: 'legalname',
                    join: 'custrecord_dps_shipping_rec_transa_subje'
                }, // 交易主体 法定名称
            ]

        }).run().each(function (rec) {
            var it = {
                bId: rec.id,
                toNum: rec.getValue('custrecord_dps_shipping_rec_order_num'),
                subsidiary: rec.getValue('custrecord_dps_shipping_rec_transa_subje'),
                gross_margin: rec.getValue({
                    name: 'custrecord_gross_margin',
                    join: 'custrecord_dps_shipping_rec_transa_subje'
                }),
                legalname: rec.getValue({
                    name: 'legalname',
                    join: 'custrecord_dps_shipping_rec_transa_subje'
                })

            }
            ord.push(it);
            return --limit > 0;
        });
        log.audit('ord.length', ord.length);

        return ord;
    }

    function map(context) {

        var itemInfo = [];
        var val = context.value,
            limit1 = 3999,
            limit2 = 3999,
            limit = 3999,
            flag = false;

        val = JSON.parse(val);
        var subsidiary = val.subsidiary,
            gross_margin = val.gross_margin,
            legalname = val.legalname,

            bId = val.bId,
            toNum = val.toNum;

        var placeofsupply;

        log.debug('bId: ' + bId, 'toNum: ' + toNum);

        var poArr = [];

        var transfer_head = [];

        var qtyTotal = 0;

        try {

            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                        name: 'custrecord_dps_shipping_rec_information',
                        operator: 'anyof',
                        values: '@NONE@'
                    },
                    {
                        name: 'internalid',
                        operator: 'anyof',
                        values: bId
                    },
                ],
                columns: [{
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: 'custrecord_dps_shipping_record_parentrec'
                }]
            }).run().each(function (rec) {
                qtyTotal += Number(rec.getValue({
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: 'custrecord_dps_shipping_record_parentrec'
                }));
                return --limit > 0;
            });

            // log.debug('qtyTotal: ' + qtyTotal);

            var OccupyTotal = 0;
            search.create({
                type: 'customrecord_realted_transfer_head',
                filters: [{
                    name: "custrecord_transfer_code",
                    join: "custrecord__realted_transfer_head",
                    operator: 'anyof',
                    values: toNum,
                }],
                columns: [{
                        name: 'custrecord_transfer_quantity',
                        join: 'custrecord__realted_transfer_head'
                    }, // 数量
                ]
            }).run().each(function (rec) {

                log.debug('rec id', rec.id);

                var qty = rec.getValue({
                    name: 'custrecord_transfer_quantity',
                    join: 'custrecord__realted_transfer_head'
                });

                OccupyTotal += Number(qty);

                var it = {
                    qty: qty,
                    toHId: rec.id
                };

                poArr.push(it);

                transfer_head.push(rec.id);

                log.debug('transfer_head', transfer_head);

                flag = true;
                return --limit1 > 0;

            });

            log.debug('qtyTotal: ' + qtyTotal, 'OccupyTotal: ' + OccupyTotal);

            if (OccupyTotal == qtyTotal) {
                search.create({
                    type: 'purchaseorder',
                    filters: [{
                            name: 'mainline',
                            operator: 'is',
                            values: false
                        },
                        {
                            name: 'taxline',
                            operator: 'is',
                            values: false
                        },
                        {
                            name: 'custcol_realted_transfer_detail',
                            operator: 'anyof',
                            values: transfer_head
                        }
                    ],
                    columns: [
                        'rate', 'item', 'quantity', "taxamount", "custcol_realted_transfer_detail", 'entity',
                        {
                            name: 'custitem_dps_declaration_cn',
                            join: 'item'
                        },
                        {
                            name: 'custitem_dps_brand',
                            join: 'item'
                        },
                        {
                            name: 'custitem_dps_unit',
                            join: 'item'
                        },
                        {
                            name: 'custitem_dps_declare',
                            join: 'item'
                        },
                        {
                            name: 'custitem_dps_customs_code',
                            join: 'item'
                        },
                        {
                            name: 'custentity_dps_placeofsupply',
                            join: 'vendor'
                        }, // 供应商 货源地
                        {
                            name: "custentity_vendor_code",
                            join: 'vendor'
                        }, // 供应商编码
                        {
                            name: "entityid",
                            join: 'vendor'
                        }, // 供应商名称
                        {
                            name: 'custentity_dps_buyer',
                            join: 'vendor'
                        }, // 供应商 采购员
                    ]
                }).run().each(function (rec) {

                    // log.debug('purchaseorder rec.id', rec.id);


                    var transfer_detail = rec.getValue('custcol_realted_transfer_detail');
                    var qty = 1;
                    for (var i = 0, len = poArr.length; i < len; i++) {
                        var temp = poArr[i];
                        if (temp.toHId == transfer_detail) {
                            qty = temp.qty;
                            break;
                        }
                    }

                    var it = {
                        name: rec.getValue({
                            name: 'custitem_dps_declaration_cn',
                            join: 'item'
                        }),
                        taxamount: rec.getValue('taxamount'),
                        buyer: rec.getValue({
                            name: 'custentity_dps_buyer',
                            join: 'vendor'
                        }),
                        vendorId: rec.getValue({
                            name: "entityid",
                            join: 'vendor'
                        }),
                        vendorCode: rec.getValue({
                            name: "custentity_vendor_code",
                            join: 'vendor'
                        }),
                        placeofsupply: rec.getValue({
                            name: 'custentity_dps_placeofsupply',
                            join: 'vendor'
                        }),
                        itemId: rec.getValue('item'),
                        rate: rec.getValue('rate'),
                        qty: qty,
                        declaration: rec.getValue({
                            name: 'custitem_dps_declaration_cn',
                            join: 'item'
                        }),
                        brand: rec.getText({
                            name: 'custitem_dps_brand',
                            join: 'item'
                        }),
                        unit: rec.getValue({
                            name: 'custitem_dps_unit',
                            join: 'item'
                        }),
                        declare: rec.getValue({
                            name: 'custitem_dps_declare',
                            join: 'item'
                        }),
                        code: rec.getValue({
                            name: 'custitem_dps_customs_code',
                            join: 'item'
                        })
                    };

                    itemInfo.push(it);

                    return --limit2 > 0;
                });

            }

            log.audit('itemInfo: ' + bId, itemInfo);

            if (flag && itemInfo.length > 0) {
                var informaId = createInformation(bId, toNum);

                log.debug('informaId', informaId);

                if (informaId) {
                    // 创建报关发票
                    var invId = createCusInv(itemInfo, informaId, gross_margin);
                    log.debug('invId', invId);

                    // 创建报关装箱
                    var boxId = createBoxRec(itemInfo, informaId);
                    log.debug('boxId', boxId);

                    // 创建报关合同
                    var conId = createContract(itemInfo, informaId, subsidiary, legalname);
                    log.debug('conId', conId);

                    // 创建报关单
                    var decId = createDeclaration(itemInfo, informaId, gross_margin, legalname);
                    log.debug('decId', decId);

                    // 创建报关要素
                    var eleArr = CreateElementsOfDeclaration(itemInfo, informaId);
                    log.debug('eleArr', eleArr);

                    // 创建 US 开票资料
                    var usbArr = createUSBillInformation(itemInfo, informaId);
                    log.debug('usbArr', usbArr);

                }
                var box_id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: bId,
                    values: {
                        custrecord_dps_shipping_rec_information: informaId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                log.debug('box_id', box_id);
            } else {
                log.debug('不存在对应的采购订单', '不创建报关资料');
            }

        } catch (error) {
            log.error('处理数据失败了', error);
        }

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }


    /**
     * 创建报关发票
     * @param {*} itemInfo 
     * @param {*} informaId 
     */
    function createCusInv(itemInfo, informaId, gross_margin) {
        var inv = record.create({
            type: 'customrecord_dps_customs_invoice'
        });
        inv.setValue({
            fieldId: 'custrecord_dps_cus_inv_information',
            value: informaId
        });
        var subId = 'recmachcustrecord_dps_c_i_item_link';
        for (var i = 0, len = itemInfo.length; i < len; i++) {
            var temp = itemInfo[i];
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item',
                line: i,
                value: temp.itemId
            });
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


            // 通过 API 直接获取 汇率
            var cur_rate = currency.exchangeRate({
                source: 'CNY',
                target: 'USD',
                // date: new Date('7/28/2015')
            });

            log.debug('cur_rate', cur_rate);

            var num = 1 + Number(gross_margin);

            log.debug('temp.rate', temp.rate);
            var newRate = Number(temp.rate) * num / cur_rate;

            log.debug('newRate', newRate);
            // FIXME 发票的单价, 有待处理
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_invoice_item_pric',
                line: i,
                value: newRate
            });
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_inv_item_amount',
                line: i,
                value: newRate * Number(temp.qty)
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

        log.debug('createBoxRec', informaId);
        var boxRec = record.create({
            type: 'customrecord_dps_packing_documents'
        });
        boxRec.setValue({
            fieldId: 'custrecord_dps_p_declaration_informa',
            value: informaId
        });

        // {"itemId":"39115","rate":"55.00","qty":"10","declaration":"234","brand":"8","unit":"","declare":"321","code":"123"}

        var subId = 'recmachcustrecord_dps_z_b_l_links';
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
    function createContract(info, informId, sub, legalname) {
        var con = record.create({
            type: 'customrecord_dps_customs_contract'
        });
        con.setValue({
            fieldId: 'custrecord_dps_c_c_seller',
            value: sub
        });
        con.setValue({
            fieldId: 'custrecord_dps_c_c_information',
            value: informId
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
    function createDeclaration(info, informaId, gross_margin, legalname) {
        var dec = record.create({
            type: 'customrecord_dps_customs_declaration'
        });
        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_infomation_link',
            value: informaId
        });

        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_pre_entry_number',
            value: informaId
        }); // 预录入编号 

        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_customs_code',
            value: informaId
        }); // 10 位海关代码 

        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_customs_number',
            value: informaId
        }); // 海关编号 

        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_domestic_shipper',
            value: legalname
        }); // 境内发货人 

        // dec.setValue({
        //     fieldId: 'custrecord_dps_cu_decl_overseas_consigne',
        //     value: 'RANTION TRADING LIMITED'
        // }); // 境外收货人  RANTION TRADING LIMITED


        var subId = 'recmachcustrecord_dps_customs_decla_item_link'
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_declara_item_num',
                value: temp.code,
                line: i
            }); // 商品编号 custrecord_dps_customs_declara_item_num
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_name',
                value: temp.name,
                line: i
            }); // 品名 custrecord_dps_customs_decl_item_name
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_qty',
                value: temp.qty,
                line: i
            }); // 数量 custrecord_dps_customs_decl_item_qty
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item',
                value: temp.itemId,
                line: i
            }); // 货品 custrecord_dps_customs_decl_item
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_cust_decl_item_dom_source',
                value: temp.placeofsupply,
                line: i
            }); // 境内货源地 custrecord_dps_cust_decl_item_dom_source
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_customs_decl_item_ori_arr',
                value: temp.placeofsupply,
                line: i
            }); // 最终目的国（ 地区） custrecord_dps_customs_decl_item_ori_arr

            var cur_rate = currency.exchangeRate({
                source: 'CNY',
                target: 'USD',
                // date: new Date('7/28/2015')
            });

            log.debug('cur_rate', cur_rate);

            var num = 1 + Number(gross_margin);

            log.debug('temp.rate', temp.rate);
            var newRate = Number(temp.rate) * num / cur_rate;

            log.debug('newRate', newRate);
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custom_decl_item_un_price',
                value: newRate,
                line: i
            }); // 单价 custrecord_dps_custom_decl_item_un_price
            dec.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_custo_decl_total_amount',
                value: newRate * Number(temp.qty),
                line: i
            }); // 总价 custrecord_dps_custo_decl_total_amount
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
            var elem = record.create({
                type: 'customrecord_dps_elements_declaration'
            });
            var temp = info[i];
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_name',
                value: temp.name
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_cust_hs_code',
                value: temp.code
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
                fieldId: 'custrecord_dps_elem_dedecl_other_reporti',
                value: temp.declare
            });
            elem.setValue({
                fieldId: 'custrecord_dps_elem_dedecl_information',
                value: informaId
            });
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
            var usbil = record.create({
                type: 'customrecord_dps_us_billing_information'
            });

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_vendor',
                value: temp.vendorCode
            }); // 供应商	custrecord_dps_us_b_i_vendor

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_sku',
                value: temp.itemId
            }); // SKU	


            // usbil.setValue({
            //     fieldId: 'custrecord_dps_us_b_i_quantity_unit',
            //     value: temp.name
            // }); // 单位内数量	custrecord_dps_us_b_i_quantity_unit

            // usbil.setValue({
            //     fieldId: 'custrecord_dps_us_b_i_total_qty',
            //     value: temp.name
            // }); // 总个数	custrecord_dps_us_b_i_total_qty

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_customs_code',
                value: temp.code
            }); // 海关编码	custrecord_dps_us_b_i_customs_code

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_place_supply',
                value: temp.placeofsupply
            }); // 货源地	custrecord_dps_us_b_i_place_supply

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_buyer',
                value: temp.buyer
            }); // 采购员	custrecord_dps_us_b_i_buyer

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_brand_name',
                value: temp.brand
            }); // 品牌名	custrecord_dps_us_b_i_brand_name

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_supplier_name',
                value: temp.vendorId
            }); // 供应商名称	custrecord_dps_us_b_i_supplier_name

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_item_name',
                value: temp.declaration
            }); // 货物名称	custrecord_dps_us_b_i_item_name
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_qty',
                value: temp.qty
            }); // 数量	custrecord_dps_us_b_i_qty

            var a = Number(temp.rate) + Number(temp.taxamount); // 含税单价
            var b = a / 0.13; // 未含税单价
            var c = a * Number(temp.qty); // 含税金额


            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_tax',
                value: c / 1.13 * 0.13
            }); // 税额	custrecord_dps_us_b_i_tax

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_tax_included_amoun',
                value: c
            }); // 含税金额	custrecord_dps_us_b_i_tax_included_amoun


            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price',
                value: b
            }); // 单价	custrecord_dps_us_b_i_unit_price
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_amount',
                value: Number(temp.qty) * Number(temp.rate)
            }); // 金额	custrecord_dps_us_b_i_amount
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit_price_includ',
                value: a
            }); // 含税单价	custrecord_dps_us_b_i_unit_price_includ

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_unit',
                value: temp.unit
            }); // 单位	custrecord_dps_us_b_i_unit
            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_elements_declarati',
                value: temp.declare
            }); // 申报要素	custrecord_dps_us_b_i_elements_declarati

            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_informa',
                value: informaId
            });
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
        var information = record.create({
            type: 'customrecord_customs_declaration_informa'
        });
        information.setValue({
            fieldId: 'custrecord_fulfillment_record',
            value: recordId
        });
        information.setValue({
            fieldId: 'custrecord_transfer_order',
            value: transferorderId
        });
        var id = information.save();
        return id;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});