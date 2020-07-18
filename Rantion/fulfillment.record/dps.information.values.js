/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-09 19:54:51
 * @LastEditTime   : 2020-07-18 18:44:45
 * @LastEditors    : Li
 * @Description    : 创建报关资料
 * @FilePath       : \Rantion\fulfillment.record\dps.information.values.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/search', 'N/record', 'N/log', 'N/currency'], function (search, record, log, currency) {


    /**
     * 搜索本位币对应货币的汇率
     * @param {String} recCurrency  货币符号
     */
    function searchCurrencyExchangeRates(recCurrency) {

        var exchangerate;

        search.create({
            type: 'currency',
            filters: [{
                name: "symbol",
                operator: "startswith",
                values: recCurrency,
            }],
            columns: [
                "exchangerate"
            ]
        }).run().each(function (rec) {
            exchangerate = rec.getValue('exchangerate')
        });

        log.debug('searchCurrencyExchangeRates exchangerate', exchangerate);

        return exchangerate || false;

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
            filters: [{
                    name: 'custrecord_dps_amazon_ns_sku',
                    operator: 'anyof',
                    values: itemId
                },
                {
                    name: 'custrecord_dps_store',
                    operator: 'anyof',
                    values: account
                }
            ],
            columns: [
                'custrecord_dps_amazon_sku_number',
                {
                    name: 'weight',
                    join: 'custrecord_dps_amazon_ns_sku'
                }
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

            ]
        }).run().each(function (rec) {
            if (rec.getValue('quantity') > 0) {
                var it = {
                    itemId: rec.getValue('item'),
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
                    brandName: rec.getText({
                        name: 'custitem_dps_brand',
                        join: 'item'
                    }),
                    taxamount: rec.getValue("taxamount"),
                    util: rec.getValue({
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
                    }),

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
     * @param {*} gross_margin 
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
        var total_amount = 0; //报关发票总金额
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

            // 设置货品采购订单的
            inv.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_cus_inv_item_po_price',
                line: i,
                value: Number(temp.rate)
            });


            var cur_rate = searchCurrencyExchangeRates("USD");

            // // 通过 API 直接获取 汇率
            // var cur_rate = currency.exchangeRate({
            //     source: 'CNY',
            //     target: 'USD',
            //     // date: new Date('7/28/2015')
            // });

            log.debug('cur_rate', cur_rate);

            var num = 1;
            if (gross_margin) {
                num += Number(gross_margin);
            }

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
            total_amount += (newRate * Number(temp.qty))
        }
        log.debug("总金额:", total_amount)
        inv.setValue({
            fieldId: 'custrecord_dps_cus_inv_total_amount',
            value: total_amount
        });

        var inv_id = inv.save();
        var currency_id
        search.create({
            type: 'currency',
            filters: [{
                name: "symbol",
                operator: 'is',
                values: "USD"
            }]
        }).run().each(function (e) {
            currency_id = e.id
            return true
        });


        var rs = {
            inv_id: inv_id,
            total_amount: total_amount,
            currency: currency_id,
        }
        return rs || false;
    }


    /**
     * 创建报关装箱单
     * @param {*} info 
     * @param {*} informaId 
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
     * 创建报关合同, 发票单价
     * @param {*} info 
     * @param {*} informId 
     * @param {*} sub 
     * @param {*} legalname 
     */
    function createContract(info, informId, sub, legalname, gross_margin) {
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

            var cur_rate = searchCurrencyExchangeRates("USD");

            // 通过 API 直接获取 汇率
            // var cur_rate = currency.exchangeRate({
            //     source: 'CNY',
            //     target: 'USD',
            //     // date: new Date('7/28/2015')
            // });

            log.debug('cur_rate', cur_rate);

            var num = 1;
            if (gross_margin) {
                num = Number(num) + Number(gross_margin);
            }

            log.debug('createContract num', num);

            log.debug('temp.rate', temp.rate);
            var newRate = Number(temp.rate) * num / cur_rate;

            log.debug('createContract newRate', newRate);

            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_util_price',
                line: i,
                value: newRate
            });
            con.setSublistValue({
                sublistId: subId,
                fieldId: 'custrecord_dps_c_c_item_amount',
                line: i,
                value: Number(newRate) * Number(temp.qty)
            });
        }
        var conId = con.save();
        return conId || false;
    }

    /**
     * 创建报关单,发票单价
     * @param {*} info 
     * @param {*} informaId 
     * @param {*} gross_margin 
     * @param {*} legalname 
     */
    function createDeclaration(info, informaId, gross_margin, legalname) {
        var dec = record.create({
            type: 'customrecord_dps_customs_declaration'
        });
        dec.setValue({
            fieldId: 'custrecord_dps_cu_decl_infomation_link',
            value: informaId
        });

        // dec.setValue({
        //     fieldId: 'custrecord_dps_cu_decl_pre_entry_number',
        //     value: informaId
        // }); // 预录入编号 

        // dec.setValue({
        //     fieldId: 'custrecord_dps_cu_decl_customs_code',
        //     value: temp.code
        // }); // 10 位海关代码 

        // dec.setValue({
        //     fieldId: 'custrecord_dps_cu_decl_customs_number',
        //     value: temp.code
        // }); // 海关编号 

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


            var cur_rate = searchCurrencyExchangeRates("USD");

            // var cur_rate = currency.exchangeRate({
            //     source: 'CNY',
            //     target: 'USD',
            //     // date: new Date('7/28/2015')
            // });

            log.debug('cur_rate', cur_rate);

            var num = 1 + Number(gross_margin);
            log.debug('num', num);

            log.debug('temp.rate', temp.rate);
            var newRate = Number(temp.rate) * num / cur_rate;

            log.debug('newRate', newRate);
            if (!newRate) {
                newRate = temp.rate;
            }
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
     * @param {*} informaId 
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
     * 创建开票资料, 发票单价
     * @param {*} info 
     * @param {*} informaId 
     * @param {*} batchNum 
     */
    function createBillInformation(info, informaId, batchNum) {
        var USBil = [];
        for (var i = 0, len = info.length; i < len; i++) {
            var temp = info[i];
            var usbil = record.create({
                type: 'customrecord_dps_us_billing_information'
            });


            usbil.setValue({
                fieldId: 'custrecord_dps_us_b_i_transfer_batch_num',
                value: batchNum
            }); // 调拨批次	custrecord_dps_us_b_i_transfer_batch_num

            usbil.setText({
                fieldId: 'custrecord_dps_us_b_i_vendor',
                text: temp.vendorId
            }); // 供应商	custrecord_dps_us_b_i_vendor

            // usbil.setValue({
            //     fieldId: 'custrecord_dps_us_b_i_vendor',
            //     value: temp.vendorCode
            // }); // 供应商	custrecord_dps_us_b_i_vendor

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
            log.debug('含税单价 a', a);
            var b = a / 1.13; // 未含税单价
            log.debug('未含税单价 b', b);
            var c = a * Number(temp.qty); // 含税金额
            log.debug('含税金额 c', c);

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
                value: Number(temp.qty) * b
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


    /**
     * 搜索关联的调拨单的 PO的货品信息
     * @param {*} tranId 
     */
    function searchPOItem(tranId) {

        var itemInfo = [],
            transfer_head = [],
            poArr = [],
            limit1 = 3999,
            limit2 = 3999;

        search.create({
            type: 'customrecord_realted_transfer_head',
            filters: [{
                name: "custrecord_transfer_code",
                join: "custrecord__realted_transfer_head",
                operator: 'anyof',
                values: tranId,
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

        if (transfer_head.length > 0) {
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

        return itemInfo.length > 0 ? itemInfo : false;
    }

    return {
        searchItemInfo: searchItemInfo,
        createCusInv: createCusInv,
        createBoxRec: createBoxRec,
        createContract: createContract,
        createDeclaration: createDeclaration,
        CreateElementsOfDeclaration: CreateElementsOfDeclaration,
        createBillInformation: createBillInformation,
        createInformation: createInformation,
        searchPOItem: searchPOItem
    }
});