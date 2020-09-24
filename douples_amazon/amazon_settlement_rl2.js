/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-26 10:19:59
 * @LastEditTime   : 2020-09-17 21:37:14
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \douples_amazon\amazon_settlement_rl2.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/format', 'N/runtime', './Helper/core.min', './Helper/Moment.min', 'N/log', 'N/search',
    'N/record', 'N/transaction', './Helper/interfunction.min', './Helper/fields.min', 'N/xml'
], function(format, runtime, core, moment, log, search, record, loactionPre, interfun, fiedls, xml) {
    const MissingReportType = 5 // Missing report 财务报告  orders
    const account = 122 // 应收账款
    const account_Tax = 1026 // 6601.30.01 销售费用 : 平台销售税 : Amazon
    // const Promotionitem = 54   //主营业务
    const ItemPrice = {
        'Principal': '', // ItemPricePrincipal
        'Tax': 1026, // ItemPrice TAX
    }
    // const PromotionShipping = 2203   //PromotionShipping 科目
    const financeMapping = {
        'Principal': 'custrecord_principal_currency_amount',
        'Tax': 'custrecord_tax_currency_amount',
        'Commission': 'custrecord_commission',
        'FBAPerOrderFulfillmentFee': 'custrecord_fba_perorder_fulfil_feeamount',
        'FBAPerUnitFulfillmentFee': 'custrecord_fba_perunit_fulfil_feeamount',
        'FBAWeightBasedFee': 'custrecord_fba_weight_based_fee_amount',
        'FixedClosingFee': 'custrecord_fixed_closing_fee_amount',
        'VariableClosingFee': 'custrecord_variable_closing_fee_amount',
        'GetPaidFasterFee': 'custrecord_amazon_getpaidfasterfee',
        'GiftwrapChargeback': 'custrecord_giftwrap_charge_back_fee_amou',
        'GiftWrap': 'custrecord_giftwrap_currency_amount',
        'GiftWrapTax': 'custrecord_giftwraptax_currency_amount',
        'SalesTaxCollectionFee': 'custrecord_sales_tax_collection_fee_amou',
        'Shipping': 'custrecord_shippingcharge_curr_amount',
        'ShippingTax': 'custrecord_shippingtax_currency_amount',
        'ShippingHB': 'custrecord_shippinghb_fee_amount',
        'ShippingChargeback': 'custrecord_shipping_charge_back_fee_amou',
        'MarketplaceFacilitatorTax-Shipping': 'custrecord_marketplace_factaxship_amount',
        'MarketplaceFacilitatorTax-Principal': 'custrecord_marketplace_factaxprin_amount',
        'MarketplaceFacilitatorTax-Other': 'custrecord_marketplace_factaxother_acoun',
        'Principal-promotion': 'custrecord_amazon_promotion_itemdiscount',
        'Shipping-promotion': 'custrecord_amazon_promotion_shipping',
        'RefundCommission': 'custrecord_refundcommission',
        'ExportCharge': 'custrecord_finace_exportcharge',
        'LowValueGoodsTax-Principal': 'custrecord_lowvaluegoodstax_principal',
        'LowValueGoodsTax-Shipping': 'custrecord_lowvaluegoodstax_shipping',
        'RestockingFee': 'custrecord_amazon_restockingfee',
        'Promotionitem': 'custrecord_amazon_promotion_itemdiscount', // 1341
        'PromotionShipping': 'custrecord_amazon_promotion_shipping', // 2203
        // "PromotionMetaDataDefinitionValue" :"custrecord_prom_meta_data_def_val"
    }
    const adjAccount = 538 // 6601.49	 报损
    const CORR_fin = {
        'Commission': 680, // 平台佣金
        'FBAPerOrderFulfillmentFee': 681, // 平台配送
        'FBAPerUnitFulfillmentFee': 681, // 平台配送
        'FBAWeightBasedFee': 681
    } // 平台配送
    const CORR_MEMO = {
        '680': '暂估平台扣取交易佣金[Amazon]',
        '681': '暂估平台扣取物流配送费[Amazon]'
    }

    const fieldsMapping = [
        'Commission',
        'FBAPerOrderFulfillmentFee',
        'FBAPerUnitFulfillmentFee',
        'FBAWeightBasedFee',
        /*
        'FixedClosingFee',
        'VariableClosingFee',
        'GetPaidFasterFee',
        'GiftwrapChargeback',
        'GiftWrap',
        'GiftWrapTax',
        'Tax',
        'SalesTaxCollectionFee',
        'Shipping',
        'ShippingTax',
        'ShippingHB',
        'ShippingChargeback',
        'MarketplaceFacilitatorTax-Shipping',
        'MarketplaceFacilitatorTax-Principal',
        'MarketplaceFacilitatorTax-Other',
        //   "PromotionMetaDataDefinitionValue",
        'Promotionitem',
        'PromotionShipping',
        'ExportCharge',
        'RestockingFee',
        'LowValueGoodsTax-Principal',
        'LowValueGoodsTax-Shipping',
        'RefundCommission'
        */
    ]
    const martk_corr = { // 科目配置表的报告类型字段
        'EU': 2,
        'NL': 2,
        'JP': 2,
        'UK': 2,
        'IT': 2,
        'ES': 2,
        'DE': 2,
        'FR': 2,
        'US': 1,
        'CA': 1,
        'MX': 1,
        'AU': 1,
        'SG': 1
    }
    const finType = 'Order'
    const JP_currency = 8
    const income_fin = 623 // 应收账款-暂估	Amazon 1122.05.01
    const income_settle = 361 // 应收账款-待结算  1122.03
    const Fincome_Plat = 412 // 预收账款-平台	 2203.03
    const income_Refund = 471 // 主营业务收入-退款	 6001.06
    function _get(context) {
        log.debug('get context:', context)
        var startT = new Date().getTime()
        switch (context.op) {
            case 'create_art_getData':
                var acc = context.acc
                var group = context.acc_group
                var limit = 4000,
                    returns = []
                var fils = [
                    { name: 'custrecord_aio_b2c_return_detailed_disp', operator: 'is', values: 'SELLABLE' },
                    { name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: '2020-6-1' },
                    { name: 'isinactive', join: 'custrecord_aio_b2c_return_aio_account', operator: 'is', values: false },
                    { name: 'custrecord_aio_b2c_return_authorization', operator: 'is', values: 'F' }
                ]
                if (acc) {
                    fils.push({ name: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: acc })
                }
                if (group) {
                    fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: group })
                }
                search.create({
                    type: 'customrecord_aio_amazon_customer_return',
                    filters: fils,
                    columns: [
                        { name: 'custrecord_aio_b2c_return_aio_account' },
                        { name: 'custrecord_aio_b2_creturn_sku' },
                        { name: 'custrecord_aio_b2c_return_return_date' },
                        { name: 'custrecord_aio_b2c_return_status' },
                        { name: 'custrecord_amazon_returndate_text' },
                        { name: 'custrecord_aio_b2c_return_quantity' },
                        { name: 'custrecord_aio_b2c_return_lcn' },
                        { name: 'custrecord_aio_b2c_return_order_id' },
                        { name: 'internalid' },
                        { name: 'custrecord_aio_seller_id', join: 'custrecord_aio_b2c_return_aio_account' },
                        { name: 'custrecord_division', join: 'custrecord_aio_b2c_return_aio_account' },
                        { name: 'custrecord_aio_b2c_return_detailed_disp' }
                    ]
                }).run().each(function(rec) {
                    returns.push({
                        recid: rec.id,
                        status: rec.getValue('custrecord_aio_b2c_return_status'),
                        acc: rec.getValue('custrecord_aio_b2c_return_aio_account'),
                        order_id: rec.getValue('custrecord_aio_b2c_return_order_id'),
                        creturn_sku: rec.getValue('custrecord_aio_b2_creturn_sku'),
                        creturn_qty: rec.getValue('custrecord_aio_b2c_return_quantity'),
                        creturn_lcn: rec.getValue('custrecord_aio_b2c_return_lcn'),
                        return_date: rec.getValue('custrecord_amazon_returndate_text'),
                        seller_id: rec.getValue(rec.columns[9]),
                        dept: rec.getValue(rec.columns[10]),
                        detial_desc: rec.getValue('custrecord_aio_b2c_return_detailed_disp') // �������ֶ��ж��Ƿ����
                    })
                    return --limit > 0
                })
                return returns
            case 'create_art_DealData':
                try {
                    var err = []
                    var obj = JSON.parse(context.objs)
                    // returns.map(function (obj) {
                    var oid = obj.order_id,
                        p_store = obj.acc,
                        status = obj.status,
                        rtn_id = obj.recid,
                        re_sku = obj.creturn_sku,
                        re_qty = obj.creturn_qty,
                        re_lcn = obj.creturn_lcn,
                        detial_desc = obj.detial_desc,
                        dept = obj.dept,
                        return_date_txt = obj.return_date

                    var return_author
                    var location, fba_location, fulfill_id

                    var rs = interfun.getSearchAccount(obj.seller_id)
                    var acc_search = rs.acc_search
                    var skuid = interfun.getskuId(re_sku, p_store).skuid
                    return_date = interfun.getFormatedDate('', '', return_date_txt, '', true).date
                    if (return_date == '2') {
                        record.submitFields({
                            type: 'customrecord_aio_amazon_customer_return',
                            id: rtn_id,
                            values: {
                                custrecord_aio_b2c_return_authorization: '6月之前'
                            }
                        })
                        return
                    }
                    var res = DeduplicationRa(rtn_id)
                    log.debug('skuid:' + skuid, res)
                    if (!res) {
                        var so_id = 0,
                            ordstatus
                        search.create({
                            type: record.Type.SALES_ORDER,
                            filters: [
                                { name: 'poastext', operator: 'is', values: oid },
                                // { name: "status", operator: "noneof",values: ["SalesOrd:C", "SalesOrd:H"]},
                                { name: 'custbody_aio_account', operator: 'anyof', values: acc_search },
                                { name: 'mainline', operator: 'is', values: true }
                            ],
                            columns: [
                                { name: 'custbody_aio_account' },
                                { name: 'status' }
                            ]
                        }).run().each(function(rec) {
                            log.audit('rec:', rec)
                            so_id = rec.id
                            p_store = rec.getValue('custbody_aio_account')
                            ordstatus = rec.getValue('status')
                        })
                        var ship_id
                        search.create({
                            type: 'customrecord_amazon_sales_report',
                            filters: [
                                ['custrecord_shipment_account', 'anyof', acc_search], 'and',
                                ['custrecord_amazon_order_id', 'is', oid]
                            ]
                        }).run().each(function(e) {
                            ship_id = e.id
                        })
                        var ship_date
                        if (so_id)
                            search.create({
                                type: 'itemfulfillment',
                                filters: [
                                    ['mainline', 'is', false], 'and',
                                    ['item', 'anyof', skuid], 'and',
                                    ['createdfrom', 'anyof', so_id]
                                ],
                                // columns:["serialnumbers"]
                                columns: ['trandate']
                            }).run().each(function(e) {
                                fulfill_id = e.id
                                ship_date = e.getValue(e.columns[0])
                            })
                        if (fulfill_id) {
                            // var so = record.load({ type: record.Type.SALES_ORDER, id: so_id })
                            // log.audit('returnauthorization', {
                            //   so: so.getValue('tranid'),
                            //   id: rtn_id,
                            //   location: so.getValue('location'),
                            //   so_id: so_id
                            // })
                            var r
                            r = record.transform({
                                fromType: record.Type.SALES_ORDER,
                                toType: record.Type.RETURN_AUTHORIZATION,
                                fromId: Number(so_id)
                            })

                            var fils = [
                                ['internalidnumber', 'equalto', p_store]
                            ]
                            search.create({
                                type: 'customrecord_aio_account',
                                filters: fils,
                                columns: ['custrecord_aio_fba_return_loaction', 'custrecord_aio_fbaorder_location']
                            }).run().each(function(e) {
                                fba_location = e.getValue(e.columns[1])
                            })

                            location = fba_location
                            log.audit('return_date' + return_date_txt, location)
                            r.setText({ fieldId: 'trandate', text: return_date })
                            r.setValue({ fieldId: 'orderstatus', value: 'B' })
                            r.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' })
                            r.setValue({ fieldId: 'location', value: location })
                            r.setValue({ fieldId: 'custbody_order_locaiton', value: p_store }) //
                            r.setValue({ fieldId: 'custbody_origin_customer_return_order', value: rtn_id })
                            r.setValue({ fieldId: 'custbody_amazon_ra_date_text', value: return_date_txt })
                            r.setValue({ fieldId: 'custbody_ra_license_plate_number', value: re_lcn })
                            r.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 })
                            var lc = r.getLineCount({ sublistId: 'item' })
                            var arry = []
                            var n
                            for (var ln = 0; ln < lc; ln++) {
                                var itemid = r.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln })
                                var itemtype = r.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln })
                                log.debug('itemtype' + itemtype, 'itemid��' + itemid)
                                if (itemtype == 'OthCharge' || !itemid) continue

                                if (n) { // nΪtrue�������Ѿ��˻��������оͲ����˻���һ���˻�����һ��ֻ��һ����
                                    if (ln == n && itemtype == 'OthCharge')
                                        continue
                                    else {
                                        arry.push(ln)
                                        continue
                                    }
                                } else if (skuid == itemid) {
                                    n = ln + 1

                                    r.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: re_qty, line: ln })
                                    r.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln })
                                    r.setSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: re_sku, line: ln })
                                    continue
                                }
                                if (!n) {
                                    arry.push(ln)
                                    var ditemtype = r.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln + 1 })
                                    if (ditemtype == 'OthCharge')
                                        arry.push(ln + 1)
                                }
                            }
                            var del = 0
                            arry.map(function(lin) {
                                r.removeLine({
                                    sublistId: 'item',
                                    line: lin - del,
                                    ignoreRecalc: true
                                })
                                del++
                            })
                            return_author = r.save()
                        } else {
                            var cre_rs = createAuthoration(rtn_id, re_lcn, p_store, skuid, return_date, return_date_txt, oid, re_qty, status, dept, re_sku)
                            return_author = cre_rs.Art_id
                            fba_location = cre_rs.fba_location
                        }
                        if (!return_author)
                            return
                        var return_receipt = record.transform({
                            fromType: record.Type.RETURN_AUTHORIZATION,
                            toType: 'itemreceipt',
                            fromId: Number(return_author)
                        })
                        return_receipt.setText({ fieldId: 'trandate', text: return_date })
                        return_receipt.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' })
                        var lc = return_receipt.getLineCount({ sublistId: 'item' })
                        for (var ln = 0; ln < lc; ln++) {
                            var itemid = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln })
                            var itemtype = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln })
                            log.debug(itemtype)
                            if (itemtype == 'OthCharge' || !itemid) continue // �������ͻ�Ʒ���ý���
                            var qty = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: ln })
                            log.debug(itemtype, 'qty ' + qty)
                        }
                        var receipt_save = return_receipt.save()
                        log.debug(receipt_save, typeof(receipt_save) + '=====\u6536\u8d27\u6210\u529f', '\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
                        // \u751f\u6210\u8d37\u9879\u901a\u77e5\u5355
                        var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: return_author })
                        var LineCount = return_author_load.getLineCount({ sublistId: 'item' })
                        for (var i = 0; i < LineCount; i++) {
                            return_author_load.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            })
                        }
                        var return_author_load_id = return_author_load.save()
                        if (ship_date) {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T',
                                    custrecord_return_shipdate: ship_date
                                }
                            })
                        } else {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T'
                                }
                            })
                        }
                        log.debug('OK')
                    } else if (res.status == 'pendingReceipt') {
                        log.debug('������ظ���res.status:' + res.status)
                        // �����ɹ�֮����ܻ�Ʒ��Ȼ��close
                        var return_receipt = record.transform({
                            fromType: record.Type.RETURN_AUTHORIZATION,
                            toType: 'itemreceipt',
                            fromId: Number(res.art_id)
                        })
                        log.debug('���̣�' + res.pr_store)
                        var fils = [
                            ['internalidnumber', 'equalto', res.pr_store]
                        ]
                        search.create({
                            type: 'customrecord_aio_account',
                            filters: fils,
                            columns: ['custrecord_aio_fbaorder_location']
                        }).run().each(function(e) {
                            fba_location = e.getValue(e.columns[0])
                        })
                        return_receipt.setText({ fieldId: 'trandate', text: return_date })
                        return_receipt.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' })
                        var lc = return_receipt.getLineCount({ sublistId: 'item' })
                        for (var ln = 0; ln < lc; ln++) {
                            var itemid = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln })
                            var itemtype = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln })
                            return_receipt.setSublistValue({ sublistId: 'item', fieldId: 'location', value: res.location, line: ln })
                            return_receipt.setSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: re_sku, line: ln })
                            log.debug(itemtype)
                            if (itemtype == 'OthCharge' || !itemid) continue // �������ͻ�Ʒ���ý���
                            var qty = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: ln })
                            log.debug(itemtype, 'qty ' + qty)
                        }
                        var receipt_save = return_receipt.save()
                        log.debug(receipt_save, typeof(receipt_save) + '=====\u6536\u8d27\u6210\u529f', '\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
                        var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: Number(res.art_id) })
                        return_author_load.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' })
                        var LineCount = return_author_load.getLineCount({ sublistId: 'item' })
                        for (var i = 0; i < LineCount; i++) {
                            return_author_load.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            })
                        }
                        var return_author_load_id = return_author_load.save()
                        if (ship_date) {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T',
                                    custrecord_return_shipdate: ship_date
                                }
                            })
                        } else {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T'
                                }
                            })
                        }
                    } else if (res.status == 'pendingRefund') {
                        var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: Number(res.art_id) })
                        return_author_load.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' })
                        var LineCount = return_author_load.getLineCount({ sublistId: 'item' })
                        for (var i = 0; i < LineCount; i++) {
                            return_author_load.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            })
                        }
                        var return_author_load_id = return_author_load.save()
                        log.debug('�ر��˻���Ȩ��', return_author_load_id)
                        if (ship_date) {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T',
                                    custrecord_return_shipdate: ship_date
                                }
                            })
                        } else {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T'
                                }
                            })
                        }
                    } else if (res.status == 'closed') {
                        // �����˻������Ѿ����ɹ��˻����ˣ����ΪT
                        if (ship_date) {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T',
                                    custrecord_return_shipdate: ship_date
                                }
                            })
                        } else {
                            record.submitFields({
                                type: 'customrecord_aio_amazon_customer_return',
                                id: rtn_id,
                                values: {
                                    custrecord_aio_b2c_return_authorization: 'T'
                                }
                            })
                        }
                    }
                } catch (e) {
                    log.error('error!', e)
                    err.push(e.message)
                }
                if (err.length > 0) {
                    return err + ',rtid: ' + obj.recid + ' ,orderid :' + obj.order_id
                } else {
                    return 'OK：' + JSON.stringify(obj.order_id) + '，耗时：' + (new Date().getTime() - startT)
                }
                case 'create_fin_getData':
                    var full_bj = context.bj
                    var acc_group = context.acc_group
                    var acc = context.acc
                    var acc1 = [115, 67, 17, , 111, 184, 14, 33, 1, 187]
                    var acc2 = [201, 194, 104, , 24, 143, 69, 120, 54, 19, 102, 154]
                    var acc3 = [211, 113, 156, , 118, 31, 21]

                    var _start_date = context.start_date,
                        _end_date = context.end_date;
                    // if (oid)
                    //   fils.push({name: 'custrecord_l_amazon_order_id',operator: 'is',values: oid})
                    // if (acc == 1) acc = acc3
                    // else acc = acc2
                    var acc_arrys = [],
                        fils = [],
                        orders = [],
                        limit = 400;

                    // fils.push({ name: 'custrecord_is_generate_voucher', operator: 'isnot', values: 'T' })
                    fils.push({ name: 'custrecord_is_generate_voucher', operator: 'is', values: 'F' })
                    if (acc_group) { // 根据拉单分组去履行
                        core.amazon.getReportAccountList(acc_group).map(function(acount) { acc_arrys.push(acount.id) })
                        core.amazon.getReportAccountList(1).map(function(acount) { acc_arrys.push(acount.id) })
                        core.amazon.getReportAccountList(8).map(function(acount) { acc_arrys.push(acount.id) })
                        fils.push({ name: 'custrecord_fin_to_amazon_account', operator: 'anyof', values: acc_arrys })
                    }
                    if (acc) {
                        fils.push({ name: 'custrecord_fin_to_amazon_account', operator: 'anyof', values: acc })
                    }

                    // if (_start_date && _end_date) {
                    //     fils.push({ name: 'custrecord_posteddate', operator: 'within', values: [_start_date, _end_date] })
                    // } else if (_start_date && !_end_date) {
                    //     fils.push({ name: 'custrecord_posteddate', operator: 'onorafter', values: [_start_date] })
                    // } else if (!_start_date && _end_date) {
                    //     fils.push({ name: 'custrecord_posteddate', operator: 'onorbefore', values: [_end_date] })
                    // }

                    fils.push({ name: 'custrecord_financetype', operator: 'is', values: 'orders' })
                    fils.push({ name: 'custrecord_posteddate', operator: 'within', values: ['2020-7-1', '2020-7-31'] })
                    // fils.push({ name: 'custrecord_posteddate', operator: 'onorBefore', values: '2020-6-30' })
                    log.debug('fils:', fils)
                    search.create({
                        type: 'customrecord_amazon_listfinancialevents',
                        filters: fils,
                        columns: [
                            { name: 'custrecord_aio_seller_id', join: 'custrecord_fin_to_amazon_account' },
                            { name: 'custrecord_aio_enabled_sites', join: 'custrecord_fin_to_amazon_account' }, // 站点
                            { name: 'custrecord_division', join: 'custrecord_fin_to_amazon_account' } // 部门
                        ]
                    }).run().each(function(e) {
                        orders.push({
                            rec_id: e.id,
                            seller_id: e.getValue(e.columns[0]),
                            enabled_sites: e.getText(e.columns[1]),
                            dept: e.getValue(e.columns[2])
                        })
                        return --limit > 0
                    })
                    // if (orders.length == 0) {
                    //   acc = acc2
                    //   fils = []
                    //   fils.push({name: 'custrecord_is_generate_voucher',operator: 'is',values: full_bj})
                    //   fils.push({name: 'custrecord_fin_to_amazon_account',operator: 'anyof',values: acc})
                    //   fils.push({name: 'custrecord_financetype',operator: 'is',values: 'orders'})
                    //   fils.push({name: 'custrecord_posteddate',operator: 'onorBefore',values: '2020-6-30'})
                    //   search.create({
                    //     type: 'customrecord_amazon_listfinancialevents',
                    //     filters: fils,
                    //     columns: [
                    //       {name: 'custrecord_aio_seller_id',join: 'custrecord_fin_to_amazon_account'},
                    //       {name: 'custrecord_aio_enabled_sites',join: 'custrecord_fin_to_amazon_account'}, // 站点
                    //       {name: 'custrecord_division',join: 'custrecord_fin_to_amazon_account'} // 部门
                    //     ]
                    //   }).run().each(function (e) {
                    //     orders.push({
                    //       rec_id: e.id,
                    //       seller_id: e.getValue(e.columns[0]),
                    //       enabled_sites: e.getText(e.columns[1]),
                    //       dept: e.getValue(e.columns[2])
                    //     })
                    //     return --limit > 0
                    //   })
                    // }
                    return orders
                case 'create_fin_DealData':
                    var obj = JSON.parse(context.objs),
                        ss
                    try {
                        ss = Findata(obj)
                    } catch (e) {
                        return '出错：' + e.message
                    }

                    return ss + ', OK：' + JSON.stringify(obj.rec_id) + '，耗时：' + (new Date().getTime() - startT)
                case 'create_settle_getData':
                case 'refund_getdata':
                    var rs = getInputData_refund(context.acc_group, context.acc)
                    return rs
                case 'refund_deal':
                    var rs = context.objs
                    try {
                        var obj = JSON.parse(context.objs),
                            ss
                        rs = Refund(obj)
                    } catch (e) {
                        return 'error：' + JSON.stringify(e)
                    }
                    return rs
                case 'rt_bsGetData':
                    var orders = [],
                        limit = 1000
                    var acc = runtime.getCurrentScript().getParameter({
                        name: 'custscript_defect_acc'
                    })
                    var group = runtime.getCurrentScript().getParameter({
                        name: 'custscript_defect_group'
                    })
                    var fils = [
                        { name: 'custrecord_aio_b2c_return_detailed_disp', operator: 'isnot', values: 'SELLABLE' },
                        { name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: '2020-6-1' },
                        { name: 'custrecord_return_bs', operator: 'is', values: false }
                    ]
                    fils.push({ name: 'isinactive', join: 'custrecord_aio_b2c_return_aio_account', operator: 'is', values: false })
                    if (acc) {
                        fils.push({ name: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: acc })
                    }
                    if (group) {
                        fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: group })
                    }
                    // 退货报告
                    search.create({
                        type: 'customrecord_aio_amazon_customer_return',
                        filters: fils,
                        columns: [
                            { name: 'custrecord_aio_b2c_return_aio_account' },
                            { name: 'custrecord_amazon_returndate_text' },
                            { name: 'custrecord_aio_b2c_return_detailed_disp' },
                            { name: 'custrecord_aio_b2c_return_quantity' },
                            { name: 'custrecord_aio_b2_creturn_sku' },
                            { name: 'custrecord_division', join: 'custrecord_aio_b2c_return_aio_account' },
                            { name: 'custrecord_aio_subsidiary', join: 'custrecord_aio_b2c_return_aio_account' },
                            { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_aio_b2c_return_aio_account' }

                        ]
                    }).run().each(function(rec) {
                        orders.push({
                            'rec_id': rec.id,
                            'acc': rec.getValue(rec.columns[0]),
                            'date': rec.getValue(rec.columns[1]),
                            'desc': rec.getValue(rec.columns[2]),
                            'qty': -Number(rec.getValue(rec.columns[3])),
                            'sku': rec.getValue(rec.columns[4]),
                            'division': rec.getValue(rec.columns[5]),
                            'subsidiary': rec.getValue(rec.columns[6]),
                            'location': rec.getValue(rec.columns[7]),
                            'rec_type': 'customrecord_aio_amazon_customer_return',
                            'ck_filed': 'custrecord_return_bs'
                        })
                        return --limit > 0
                    })
                    // ==================搜索库存动作详情
                    limit = 1000
                    fils = []
                    if (acc) {
                        fils.push({ name: 'custrecord_invful_account', operator: 'anyof', values: acc })
                    }
                    if (group) {
                        fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_invful_account', operator: 'anyof', values: group })
                    }
                    fils.push({ name: 'custrecord_invful_transation_type', operator: 'is', values: 'VendorReturns' })
                    fils.push({ name: 'custrecord_dps_invful_processed', operator: 'is', values: false })
                    search.create({
                        type: 'customrecord_amazon_fulfill_invtory_rep',
                        filters: fils,
                        columns: [
                            { name: 'custrecord_invful_account' },
                            { name: 'custrecord_invful_snapshot_date_txt' },
                            { name: 'custrecord_invful_disposition' },
                            { name: 'custrecord_invful_quantity' },
                            { name: 'custrecord_invful_sku' },
                            { name: 'custrecord_division', join: 'custrecord_invful_account' },
                            { name: 'custrecord_aio_subsidiary', join: 'custrecord_invful_account' },
                            { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_invful_account' }
                        ]
                    }).run().each(function(rec) {
                        orders.push({
                            'rec_id': rec.id,
                            'acc': rec.getValue(rec.columns[0]),
                            'date': rec.getValue(rec.columns[1]),
                            'desc': rec.getValue(rec.columns[2]),
                            'qty': rec.getValue(rec.columns[3]),
                            'sku': rec.getValue(rec.columns[4]),
                            'division': rec.getValue(rec.columns[5]),
                            'subsidiary': rec.getValue(rec.columns[6]),
                            'location': rec.getValue(rec.columns[7]),
                            'rec_type': 'customrecord_amazon_fulfill_invtory_rep',
                            'ck_filed': 'custrecord_dps_invful_processed'
                        })
                        return --limit > 0
                    })

                    // ===================搜索移除货件
                    limit = 1000
                    fils = []
                    if (acc) {
                        fils.push({ name: 'custrecord_remo_shipment_account', operator: 'anyof', values: acc })
                    }
                    if (group) {
                        fils.push({ name: 'custrecord_aio_getorder_group', join: 'custrecord_remo_shipment_account', operator: 'anyof', values: group })
                    }
                    fils.push({ name: 'custrecord_aio_rmv_disposition', operator: 'is', values: 'Sellable' })
                    fils.push({ name: 'custrecord_aio_rmv_ck', operator: 'is', values: false })
                    search.create({
                        type: 'customrecord_aio_amazon_removal_shipment',
                        filters: fils,
                        columns: [
                            { name: 'custrecord_remo_shipment_account' },
                            { name: 'custrecord_aio_rmv_date' },
                            { name: 'custrecord_aio_rmv_disposition' },
                            { name: 'custrecord_aio_rmv_shipped_qty' },
                            { name: 'custrecord_aio_rmv_sku' },
                            { name: 'custrecord_division', join: 'custrecord_remo_shipment_account' },
                            { name: 'custrecord_aio_subsidiary', join: 'custrecord_remo_shipment_account' },
                            { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_remo_shipment_account' },
                            { name: 'custrecord_aio_rmv_order_id' }
                        ]
                    }).run().each(function(rec) {
                        orders.push({
                            'rec_id': rec.id,
                            'acc': rec.getValue(rec.columns[0]),
                            'date': rec.getValue(rec.columns[1]),
                            'desc': rec.getValue(rec.columns[2]),
                            'qty': rec.getValue(rec.columns[3]),
                            'sku': rec.getValue(rec.columns[4]),
                            'division': rec.getValue(rec.columns[5]),
                            'subsidiary': rec.getValue(rec.columns[6]),
                            'location': rec.getValue(rec.columns[7]),
                            'orderid': rec.getValue(rec.columns[8]),
                            'rec_type': 'customrecord_aio_amazon_removal_shipment',
                            'ck_filed': 'custrecord_aio_rmv_ck'
                        })
                        return --limit > 0
                    })
                    log.audit('orders:' + orders.length, orders)
                    return orders
                case 'rt_bsDealData':
                    var ss = rt_bs(JSON.parse(context.objs))
                    return ss
                default:
                    return context.op
                    break
        }
    }

    function rt_bs(obj) {
        var startT = new Date().getTime()
        var rec_type = obj.rec_type
        var ss
        try {
            if (rec_type == 'customrecord_aio_amazon_removal_shipment') {
                var t_ord
                search.create({
                    type: 'customrecord_aio_amazon_removal_shipment',
                    filters: [
                        { name: 'custbody_rel_removal_shipment', operator: 'anyof', values: obj.rec_id }
                    ]
                }).run().each(function(fd) {
                    t_ord = record.load({
                        type: 'transferorder',
                        id: fd.id
                    })
                })
                // 移除出库，做调拨单
                if (!t_ord) {
                    t_ord = record.create({
                        type: 'transferorder',
                        isDynamic: true
                    })
                    t_ord.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
                    t_ord.setValue({ fieldId: 'location', value: obj.location })
                    t_ord.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date })
                    t_ord.setValue({ fieldId: 'custbody_dps_start_location', value: obj.location })
                    t_ord.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc })
                    t_ord.setValue({ fieldId: 'department', value: obj.division })
                    t_ord.setValue({ fieldId: 'custbody_rel_removal_shipment', value: obj.rec_id })
                    t_ord.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc })
                    t_ord.setValue({ fieldId: 'memo', value: 'FBA调拨货物出库（' + obj.orderid + '）' })
                    t_ord.setValue({ fieldId: 'transferlocation', value: 4 }); // 梅西仓
                    t_ord.setValue({ fieldId: 'custbody_actual_target_warehouse', value: 4 })
                    t_ord.setValue({ fieldId: 'custbody_dps_transferor_type', value: 4 }) // 类型是移库
                    t_ord.setValue({ fieldId: 'employee', value: runtime.getCurrentUser().id })
                    t_ord.selectNewLine({ sublistId: 'item' })
                    var rs = interfun.getskuId(obj.sku, obj.acc, '')
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: rs.skuid })
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: obj.qty })
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rs.averagecost })
                    // 其他字段
                    try {
                        t_ord.commitLine({ sublistId: 'item' })
                    } catch (err) {
                        throw (
                            'Error inserting item line: ' +
                            ', abort operation!' +
                            err
                        )
                    }
                    var t_ord_id = t_ord.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    })
                    ss = t_ord_id
                    log.debug('移库 创建调拨单成功：' + t_ord_id)
                }
                var filds = {}
                filds[obj.ck_filed] = true
                record.submitFields({
                    type: obj.rec_type,
                    id: obj.rec_id,
                    values: filds
                })
            } else {
                var rec, fils = []

                if (obj.rec_type == 'customrecord_aio_amazon_customer_return') {
                    fils.push({ name: 'custbody_origin_customer_return_order', operator: 'anyof', values: obj.rec_id })
                    // 退货报告
                } else {
                    // 来源库存动作详情
                    fils.push({ name: 'custbody_rel_fulfillment_invreq', operator: 'anyof', values: obj.rec_id })
                }
                search.create({
                    type: 'inventoryadjustment',
                    filters: fils
                }).run().each(function(fd) {
                    rec = record.load({
                        type: 'inventoryadjustment',
                        id: fd.id
                    })
                })
                if (!rec) {
                    rec = record.create({ type: 'inventoryadjustment', isDynamic: true })
                    rec.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
                    rec.setValue({ fieldId: 'account', value: adjAccount })
                    rec.setValue({ fieldId: 'department', value: obj.division })
                    rec.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc })
                    rec.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc })
                    rec.setValue({ fieldId: 'memo', value: 'FBA仓报损' })
                    if (obj.rec_type == 'customrecord_aio_amazon_customer_return') {
                        // 退货报告
                        rec.setValue({ fieldId: 'custbody_origin_customer_return_order', value: obj.rec_id })
                    } else {
                        // 来源库存动作详情
                        rec.setValue({ fieldId: 'custbody_rel_fulfillment_invreq', value: obj.rec_id })
                    }
                    rec.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date })
                    rec.selectNewLine({ sublistId: 'inventory' })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: interfun.getskuId(obj.sku, obj.acc).skuid })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: obj.location })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: obj.qty })
                    rec.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'newquantity', value: obj.qty })
                    rec.commitLine({ sublistId: 'inventory' })
                    var inventoryadjustment_save = rec.save({
                        ignoreMandatoryFields: true
                    })
                    log.debug('库存调整成功', inventoryadjustment_save)
                    ss = inventoryadjustment_save
                }
                var filds = {}
                filds[obj.ck_filed] = true
                record.submitFields({
                    type: obj.rec_type,
                    id: obj.rec_id,
                    values: filds
                })
            }
        } catch (e) {
            log.error('出错', e)
            ss = e.message
        }
        ss = 'success:' + ss + ',耗时：' + (new Date().getTime() - startT)
        log.audit('obj.rec_id:' + obj.rec_id, ss)
        return ss
    }

    function getInputData_refund(group, acc) {
        var payments = [],
            limit_payments = 2200
        var sT = new Date().getTime()
        try {
            var fils = [
                { name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: 'Refund' },
                { name: 'custrecord_settlement_enddate', operator: 'within', values: ['2020-6-1', '2020-6-30'] }, // end date从2月份开始
                { name: 'custrecord_aio_sett_amount_type', operator: 'is', values: ['ItemPrice'] },
                { name: 'custrecord_aio_sett_amount_desc', operator: 'is', values: ['Principal'] },
                { name: 'custrecord_aio_sett_credit_memo', operator: 'isnot', values: 'T' },
                { name: 'custrecord_february_undeal', operator: 'isnot', values: 'F' }
            ]
            fils.push({ name: 'isinactive', join: 'custrecord_aio_account_2', operator: 'is', values: false })
            // if (acc) {
            //   fils.push({ name: 'custrecord_aio_account_2', operator: 'anyof', values: acc })
            // }
            // if (group) {
            //   fils.push({ name: 'custrecord_aio_getorder_group',join: 'custrecord_aio_account_2', operator: 'anyof', values: group })
            // }
            log.audit('fils', fils)
            search.create({
                type: 'customrecord_aio_amazon_settlement',
                filters: fils,
                columns: [
                    { name: 'custrecord_settlement_acc' },
                    { name: 'custrecord_aio_sett_amount_desc' },
                    { name: 'custrecord_aio_sett_amount_type' },
                    { name: 'custrecord_aio_sett_merchant_order_id' },
                    { name: 'custrecord_aio_sett_order_id' },
                    { name: 'custrecord_aio_sett_sku' },
                    { name: 'custrecord_aio_sett_amount' },
                    { name: 'custrecord_aio_sett_deposit_date' },
                    { name: 'custrecord_aio_sett_end_date' },
                    { name: 'custrecord_aio_sett_posted_date_time' },
                    { name: 'custrecord_aio_sett_marketplace_name' },
                    { name: 'custrecord_february_undeal' },
                    { name: 'custrecord_aio_sett_credit_memo' },
                    { name: 'custrecord_aio_sett_adjust_item_id' },
                    { name: 'custrecord_aio_sett_currency' },
                    // { name: 'internalid', sort: search.Sort.DESC },
                    { name: 'custrecord_division', join: 'custrecord_settlement_acc' },
                    { name: 'custrecord_aio_sett_quantity_purchased' },
                    { name: 'custrecord_aio_sett_id' },
                    { name: 'custrecord_aio_account_2' }
                ]
            }).run().each(function(rec) {
                // if(rec.getValue("custrecord_aio_sett_amount_type") =="ItemPrice" && rec.getValue("custrecord_aio_sett_amount_desc") =="Principal")
                payments.push({
                    recid: rec.id,
                    acc: rec.getValue(rec.columns[0]),
                    acc_text: rec.getText(rec.columns[0]),
                    marketplace_name: rec.getValue('custrecord_aio_sett_marketplace_name'),
                    merchant_order_id: rec.getValue('custrecord_aio_sett_merchant_order_id'),
                    merchant_adjustment_itemid: rec.getValue('custrecord_aio_sett_adjust_item_id'),
                    order_id: rec.getValue('custrecord_aio_sett_order_id'),
                    sku: rec.getValue('custrecord_aio_sett_sku'),
                    amount: rec.getValue('custrecord_aio_sett_amount'),
                    deposit_date: rec.getValue('custrecord_aio_sett_deposit_date'),
                    endDate: rec.getValue('custrecord_aio_sett_end_date'),
                    postDate: rec.getValue('custrecord_aio_sett_posted_date_time'),
                    dept: rec.getValue(rec.columns[15]),
                    curency_txt: rec.getValue('custrecord_aio_sett_currency'),
                    setl_id: rec.getValue('custrecord_aio_sett_id'),
                    aio_acc: rec.getValue('custrecord_aio_account_2'),
                    quantity: rec.getValue('custrecord_aio_sett_quantity_purchased') ? rec.getValue('custrecord_aio_sett_quantity_purchased') : 1
                })
                return --limit_payments > 0
            })

            return payments
        } catch (e) {
            log.error('error:', e)
        }
    }

    function Findata(obj) {
        var fin_id = obj.rec_id
        var order_id, postdate, entity, so_id, subsidiary, pr_store, currency, orderitemid, dept = obj.dept
        var ship_recid, ship_obj, fee_line, fil_channel, merchant_order_id, ord_type
        var isA_order = 1 // 是否属于改发单号
        try {
            var rec_finance = record.load({ type: 'customrecord_amazon_listfinancialevents', id: fin_id })
            order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
            merchant_order_id = rec_finance.getValue('custrecord_seller_order_id')
            orderitemid = rec_finance.getValue('custrecord_orderitemid')
            pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account')
            postdate = rec_finance.getValue('custrecord_posteddate_txt') // 去财务报告的发布日期
            // postdate = rec_finance.getText('custrecord_posteddate'); // 去财务报告的发布日期
            var pos_obj = interfun.getFormatedDate('', '', postdate, '', true)
            postdate = pos_obj.date
            if (postdate == '2') {
                rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '时间在5月' })
                rec_finance.save({ ignoreMandatoryFields: true })
                return '时间在5月'
            }
            var fils = [],
                sku = rec_finance.getValue('custrecord_sellersku'),
                qty = rec_finance.getValue('custrecord_quantityshipped')
            fils.push({ name: 'custrecord_amazon_order_id', operator: 'is', values: order_id })
            if (order_id.charAt(0) == 'S') {
                if (merchant_order_id) {
                    fils.push({ name: 'custrecord_merchant_order_id', operator: 'is', values: merchant_order_id })
                    if (merchant_order_id.charAt(0) == 'A') {
                        // 如果是A开头的订单号，需要查找对应关系，找到原订单号,*****放到凭证上******
                        search.create({
                            type: 'customrecord_amazon_order_relation',
                            filters: [
                                { name: 'custrecord_amazon_order_s', operator: 'is', values: order_id },
                                { name: 'custrecord_amazon_order_a', operator: 'is', values: merchant_order_id }
                            ],
                            columns: [
                                { name: 'name' }
                            ]
                        }).run().each(function(e) {
                            order_id = e.getValue('name')
                            isA_order = 2
                        })
                    }
                }
            } else if (!order_id) {
                rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '没有订单号' })
                rec_finance.save({ ignoreMandatoryFields: true })
                return '没有订单号'
            }

            fils.push({ name: 'custrecord_is_check_invoucher', operator: 'is', values: false })
            sku ? fils.push({ name: 'custrecord_sku', operator: 'is', values: sku }) : ''
            qty ? fils.push({ name: 'custrecord_quantity_shipped', operator: 'is', values: qty }) : ''
            orderitemid ? fils.push({ name: 'custrecord_amazon_order_item_id', operator: 'is', values: orderitemid }) : ''
            log.debug('fils:' + postdate, JSON.stringify(fils))
            search.create({
                type: 'customrecord_amazon_sales_report',
                filters: fils,
                columns: [
                    { name: 'custrecord_shipment_date', sort: 'DESC' },
                    { name: 'custrecord_shipment_date_text' }
                ]
            }).run().each(function(rec) {
                ship_recid = rec.id
                ship_obj = interfun.getFormatedDate('', '', rec.getValue('custrecord_shipment_date_text'), '', true)
                log.debug('postdate：' + postdate, ',shipment_date:' + ship_obj.date)
            })
            var inv_id
            if (ship_recid) {
                var posum = pos_obj.Year + pos_obj.Month + ''
                var shipsum = ship_obj.Year + ship_obj.Month + ''
                if (shipsum != posum) {
                    rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '与发货跨月' })
                    rec_finance.save({ ignoreMandatoryFields: true })
                    return '与发货跨月'
                }

                search.create({
                    type: 'invoice',
                    filters: [
                        { name: 'custbody_shipment_report_rel', operator: 'anyof', values: ship_recid }
                    ]
                }).run().each(function(rec) {
                    inv_id = rec.id
                })
            }
            var acc_search = interfun.getSearchAccount(obj.seller_id).acc_search
            log.debug('查询的店铺acc_search:', acc_search)
            // 搜索销售订单获取客户
            var so_obj = interfun.SearchSO(order_id, merchant_order_id, acc_search)
            log.audit('查看拿到的SO', so_obj)
            so_id = so_obj.so_id
            pr_store = so_obj.acc
            acc_text = so_obj.acc_text
            entity = so_obj.entity
            subsidiary = so_obj.subsidiary
            currency = so_obj.currency
            fil_channel = so_obj.fulfill_channel
            orderid = so_obj.otherrefnum
            ord_type = so_obj.ord_type

            log.audit('fil_channel', fil_channel)

            // 如果该财务报告生成过凭证，先删除掉
            if (so_id) {
                var ck_jo
                search.create({
                    type: 'journalentry',
                    filters: [
                        { name: 'mainline', operator: 'is', values: true },
                        { name: 'custbody_relative_finanace_report', operator: 'anyof', values: fin_id }
                    ],
                    columns: [{ name: 'memomain' }]
                }).run().each(function(e) {
                    try {
                        if (e.getValue('memomain') == '预估') {
                            ck_jo = e.id
                            // var de = record.delete({type: 'journalentry',id: e.id})
                            // log.debug('删除成功  ', de)
                        }
                    } catch (e) {
                        log.debug('delete error', e)
                        // err.push(e.message)
                    }
                    return true
                })
                if (ck_jo) {
                    rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: 'T' }) // 不处理,没有对应的销售订单就不生产预估
                    rec_finance.setValue({ fieldId: 'custrecord_fin_rel_demit', value: ck_jo }) // 不处理,没有对应的销售订单就不生产预估
                    rec_finance.save({ ignoreMandatoryFields: true })
                    return '已存在:' + ck_jo
                }
                // 开始生成日记账凭证

                if (ord_type == '2') { // 如果是FMB类型订单，查找有没有发货
                    search.create({
                        type: 'invoice',
                        filters: [{ name: 'createdfrom', operator: 'anyof', values: so_id }]
                    }).run().each(function(rec) {
                        inv_id = rec.id
                    })
                }
                if (!inv_id) {
                    if (!ship_recid) {
                        rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '找不到发货报告' })
                        rec_finance.save({ ignoreMandatoryFields: true })
                        return '找不到发货报告:' + orderid
                    }
                    rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '待发货' }) // 不处理,没有对应的销售订单就不生产预估
                    rec_finance.save({ ignoreMandatoryFields: true })
                    return '待发货:' + orderid
                }

                var fv = []
                var jour = record.create({ type: 'journalentry', isDynamic: true })
                jour.setText({ fieldId: 'trandate', text: postdate })
                jour.setValue({ fieldId: 'memo', value: '预估' })
                jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
                jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store })
                jour.setValue({ fieldId: 'department', value: dept })
                jour.setValue({ fieldId: 'custbody_jour_orderid', value: order_id })
                jour.setValue({ fieldId: 'custbody_curr_voucher', value: '预估凭证' })
                jour.setValue({ fieldId: 'custbody_rel_salesorder', value: so_id }); // 关联销售订单
                jour.setValue({ fieldId: 'currency', value: currency })
                jour.setValue({ fieldId: 'custbody_jour_type', value: 'orders' }); // 记录凭证类型 orders / refunds
                log.debug('order_id', order_id)
                var dr = 0,
                    cr = 0,
                    num = 0
                var incomeaccount, L_memo
                fieldsMapping.map(function(field) {
                    if (field == 'LowValueGoodsTax-Principal' || field == 'LowValueGoodsTax-Shipping') {
                        // 歸為Tax科目 2268
                        if (Number(rec_finance.getValue(financeMapping[field]))) {
                            jour.selectNewLine({ sublistId: 'line' })
                            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: account_Tax })
                            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept })
                            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: '收客户销售税[Amazon]' })
                            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity })
                            dr += Number(rec_finance.getValue(financeMapping[field]))
                            // 借费用，贷应收。费用为负数，放贷方会自动变成借方
                            // 如果是日本，取整
                            if (currency == JP_currency) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                            else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: fee_line }) // 贷
                            jour.commitLine({ sublistId: 'line' })
                        }
                    } else if (Number(rec_finance.getValue(financeMapping[field]))) {
                        incomeaccount = CORR_fin[field]
                        L_memo = CORR_MEMO[incomeaccount]
                        jour.selectNewLine({ sublistId: 'line' })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: incomeaccount })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: L_memo })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept })
                        if (currency == JP_currency) fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                        else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: fee_line }) // 贷
                        jour.commitLine({ sublistId: 'line' })
                        jour.selectNewLine({ sublistId: 'line' })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_fin })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: L_memo })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'department', value: dept })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity })
                        jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: fee_line }) // 贷
                        jour.commitLine({ sublistId: 'line' })
                    }
                })
                fv.push(fin_id)
                jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: fv })
                jour.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 })
                jour.setValue({ fieldId: 'custbody_relative_inoice', value: inv_id })
                var jo
                var len = jour.getLineCount({ sublistId: 'line' })
                if (len == 0) {
                    rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '配送费和佣金为0' })
                    // rec_finance.setValue({fieldId: 'custrecord_fin_rel_demit',value: jo})
                    rec_finance.save({ ignoreMandatoryFields: true })
                } else {
                    jo = jour.save({ ignoreMandatoryFields: true })
                    log.debug('success', jo)
                    rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: 'T' })
                    rec_finance.setValue({ fieldId: 'custrecord_fin_rel_demit', value: jo })
                    rec_finance.save({ ignoreMandatoryFields: true })
                    if (ship_recid)
                        record.submitFields({
                            type: 'customrecord_amazon_sales_report',
                            id: ship_recid,
                            values: {
                                custrecord_is_check_invoucher: true,
                                custrecord_fin_rel: jo
                            }
                        })
                }
                var inv = record.load({ type: 'invoice', id: inv_id })
                if (isA_order == 1)
                    inv.setValue({ fieldId: 'custbody_dps_finance_report', value: fin_id }) // 1 正常单的财务报告
                else if (isA_order == 2)
                    inv.setValue({ fieldId: 'custbody_dps_finance_report1', value: fin_id }) // 2 改发单的财务报告
                inv.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                })
                log.debug('ship_recid:' + ship_recid, '发货报告设置成功')
                return 'success:' + jo
            } else {
                log.debug('0000找不到销售订单', order_id)
                rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: '找不到订单' }) // 不处理,没有对应的销售订单就不生产预估
                rec_finance.save({ ignoreMandatoryFields: true })
                return '找不到订单：' + order_id
            }
        } catch (e) {
            log.audit(' error:', e)
            return 'error' + e.message
        }
    }

    function DeduplicationRa(rtn_id) {
        var rs = false
        search.create({
            type: record.Type.RETURN_AUTHORIZATION,
            filters: [
                { name: 'custbody_origin_customer_return_order', operator: 'anyof', values: rtn_id }
            ],
            columns: [
                { name: 'status' },
                { name: 'custbody_aio_account' },
                { name: 'location' }
            ]
        }).run().each(function(rec) {
            log.debug('�ҵ��ظ����� ' + rec.id, '״̬' + rec.getValue('status'))
            rs = {
                status: rec.getValue('status'),
                art_id: rec.id,
                pr_store: rec.getValue('custbody_aio_account'),
                location: rec.getValue('location')
            }
        })
        return rs
    }

    function createAuthoration(rtn_id, re_lcn, retacc, skuid, retdate, retdate_txt, order_id, retqty, status, dept, re_sku) {
        log.debug('retacc:' + retacc)
        var account = getAcc(retacc),
            loc, cid,
            tax_item = account.info.tax_item,
            fba_location = account.extra_info.fbaorder_location,
            salesorder_if_taxed = account.preference.salesorder_if_taxed,
            country = account.country

        var rt_amount = 0
        var rt_tax = 0
        log.debug('rt_amount:' + rt_amount, rt_tax)
        cid = account.customer
        log.debug('cid:' + cid, 'loc :' + loc)
        var rt = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true })
        rt.setValue({ fieldId: 'entity', value: cid })
        loc = fba_location

        rt.setValue({ fieldId: 'location', value: loc }) // \u6279\u51c6
        rt.setValue({ fieldId: 'otherrefnum', value: order_id })
        rt.setText({ fieldId: 'trandate', text: retdate })
        rt.setValue({ fieldId: 'orderstatus', value: 'B' }) // ��׼
        rt.setValue({ fieldId: 'memo', value: '平台发货成本-退回[Amazon]' }) // ��׼
        rt.setValue({ fieldId: 'department', value: dept }) // ��׼
        rt.setValue({ fieldId: 'custbody_aio_account', value: retacc })
        rt.setValue({ fieldId: 'custbody_order_locaiton', value: retacc })
        rt.setValue({ fieldId: 'custbody_aio_is_aio_order', value: true })
        rt.setValue({ fieldId: 'custbody_origin_customer_return_order', value: rtn_id })
        rt.setValue({ fieldId: 'custbody_amazon_ra_date_text', value: retdate_txt })
        rt.setValue({ fieldId: 'custbody_ra_license_plate_number', value: re_lcn })
        rt.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 })
        log.debug('skuid:' + skuid, 'orderid : ' + order_id)
        rt.selectNewLine({ sublistId: 'item' })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skuid })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: loc })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: retqty })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: rt_amount })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: re_sku })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: rt_amount * retqty })

        /** ���ö�����˰ */
        if (salesorder_if_taxed && tax_item && rt_tax) {
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                value: tax_item
            })
        } else {
            rt.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxcode',
                value: tax_item ? tax_item : 6
            })
        }
        try {
            rt.commitLine({ sublistId: 'item' })
        } catch (err) {
            log.error('commitLine error', err)
        }
        var Art_id = rt.save({
            ignoreMandatoryFields: true
        })
        log.debug('return successful', Art_id)
        return {
            Art_id: Art_id,
            fba_location: fba_location
        }
    }

    function _post(context) {}

    function _put(context) {}

    function _delete(context) {}

    function getAcc(acc) {
        var t = fiedls.account,
            tsite = fiedls.amazon_global_sites,
            tdev = fiedls.amazon_dev_accounts
        var accounts = {},
            fin = []
        search.create({
            type: t._name,
            filters: [
                { name: 'internalidnumber', operator: 'equalto', values: acc },
                { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 1 /* amazon */ },
                { name: 'custrecord_aio_seller_id', operator: 'isnotempty' },
                /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                { name: 'custrecord_aio_dev_account', operator: 'noneof', values: '@NONE@' },
                { name: 'isinactive', operator: 'is', values: false }

            ],
            columns: [
                /** * 名称 * @index 0 */
                { name: 'name' },
                /** * 账户API信息 * @index 1 */
                { name: t.seller_id },
                { name: t.mws_auth_token },
                { name: tsite.amazon_marketplace_id, join: t.enabled_sites },
                { name: tsite.amazon_mws_endpoint, join: t.enabled_sites },
                { name: tdev.aws_access_key_id, join: t.dev_account },
                { name: tdev.secret_key_guid, join: t.dev_account },
                /** * 账户基础信息 * @index 7 * */
                { name: 'name' },
                { name: t.currency },
                { name: 'custrecord_aio_if_salesorder' },
                { name: 'custrecord_aio_salesorder_type' },
                { name: 'custrecord_aio_salesorder_form' },
                { name: 'custrecord_aio_salesorder_location' },
                { name: 'custrecord_aio_salesorder_start_date' },
                /** * FBA信息 * @index 14 */
                { name: 'custrecord_aio_if_fbaorder' },
                { name: 'custrecord_aio_fbaorder_type' },
                { name: 'custrecord_aio_fbaorder_form' },
                { name: 'custrecord_aio_fbaorder_location' },
                { name: 'custrecord_aio_fbaorder_start_date' },
                /**@index 19 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_including_fees' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 其他信息 * @index 28 */
                { name: 'custrecord_division' },
                { name: 'custrecord_aio_salesorder_payment_method' },
                { name: 'custrecord_aio_discount_item' },
                { name: 'custrecord_aio_tax_item' },
                { name: tsite.amazon_currency, join: t.enabled_sites },
                /** * 公司信息 * @index 33 */
                core.utils.checkIfSubsidiaryEnabled() ? { name: 'custrecord_aio_subsidiary' } : { name: 'formulanumeric', formula: '0' },
                /** * 报告抓取信息 * @index 34 */
                { name: 'custrecord_aio_if_handle_removal_report' },
                { name: 'custrecord_aio_if_handle_custrtn_report' },
                /** * Preferences * @index 36 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                { name: 'custrecord_aio_if_handle_inv_report' },
                { name: 'custrecord_aio_to_default_from_location' },
                { name: 'custrecord_aio_shipping_item' },
                { name: 'custrecord_aio_to_form' },
                /** @index 48 */
                { name: fiedls.account.if_post_order_fulfillment },
                { name: fiedls.account.post_order_if_search },
                { name: fiedls.account.if_handle_sett_report },
                /** 检验亚马逊的密钥是否加密了 @index 51 */
                { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_aio_enabled_sites' },
                { name: 'custrecord_aio_customer' }

            ]
        }).run().each(function(rec) {
            accounts = {
                id: rec.id,
                country: rec.getValue(rec.columns[51]),
                customer: rec.getValue(rec.columns[52]),
                auth_meta: {
                    seller_id: rec.getValue(rec.columns[1]),
                    auth_token: rec.getValue(rec.columns[2]),
                    access_id: rec.getValue(rec.columns[5]),
                    sec_key: rec.getValue(rec.columns[6]),
                    end_point: rec.getValue(rec.columns[4])
                },
                info: {
                    name: rec.getValue(rec.columns[7]),
                    currency: rec.getValue(rec.columns[8]),
                    if_salesorder: rec.getValue(rec.columns[9]),
                    salesorder_type: rec.getValue(rec.columns[10]),
                    salesorder_form: rec.getValue(rec.columns[11]),
                    salesorder_location: rec.getValue(rec.columns[12]),
                    salesorder_start_date: rec.getValue(rec.columns[13]),
                    dept: rec.getValue(rec.columns[28]),
                    salesorder_payment_method: rec.getValue(rec.columns[29]),
                    discount_item: rec.getValue(rec.columns[30]),
                    shipping_cost_item: rec.getValue(rec.columns[46]),
                    tax_item: rec.getValue(rec.columns[31]),
                    site_currency: rec.getValue(rec.columns[32]),
                    subsidiary: Number(rec.getValue(rec.columns[33])),
                    enable_tracking_upload: rec.getValue(rec.columns[48]),
                    enabled_tracking_upload_search: rec.getValue(rec.columns[49])
                },
                extra_info: {
                    if_fbaorder: rec.getValue(rec.columns[14]),
                    fbaorder_type: rec.getValue(rec.columns[15]),
                    fbaorder_form: rec.getValue(rec.columns[16]),
                    fbaorder_location: rec.getValue(rec.columns[17]),
                    fbaorder_start_date: rec.getValue(rec.columns[18]),
                    if_including_fees: rec.getValue(rec.columns[26]),
                    if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                    if_handle_removal_report: rec.getValue(rec.columns[34]),
                    if_handle_inventory_report: rec.getValue(rec.columns[44]),
                    if_handle_settlement_report: rec.getValue(rec.columns[50]),
                    to_default_from_location: rec.getValue(rec.columns[45]),
                    aio_to_default_form: rec.getValue(rec.columns[47])
                },
                marketplace: rec.getValue(rec.columns[3]),
                preference: {
                    if_only_paid_orders: rec.getValue(rec.columns[36]),
                    salesorder_if_taxed: rec.getValue(rec.columns[37]),
                    salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                    salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                    if_zero_price: rec.getValue(rec.columns[40]),
                    if_check_customer_email: rec.getValue(rec.columns[41]),
                    if_check_customer_addr: rec.getValue(rec.columns[42]),
                    if_payment_as_tran_date: rec.getValue(rec.columns[43])
                }
            }
        })
        return accounts
    }

    function Refund(obj) {
        var startT = new Date().getTime()
        var acc_text
        var o
        var acc
        var transactionType = 'Payment_return'
        var err = []
        var accounts, total
        log.audit('obobobobo', obj)
        acc = obj.acc
        acc_text = obj.acc_text
        if (!acc) {
            var markt
            if (!obj.marketplace_name || JSON.stringify(obj.marketplace_name).indexOf('Amazon.') == -1) {
                search.create({
                    type: 'customrecord_aio_amazon_settlement',
                    filters: [
                        { name: 'custrecord_aio_sett_id', operator: 'is', values: obj.setl_id + '' },
                        { name: 'custrecord_aio_sett_marketplace_name', operator: 'startswith', values: 'Amazon.' }
                    ],
                    columns: [
                        { name: 'custrecord_aio_sett_marketplace_name' }
                    ]
                }).run().each(function(e) {
                    markt = e.getValue('custrecord_aio_sett_marketplace_name')
                })
            } else if (JSON.stringify(obj.marketplace_name).indexOf('Amazon.') > -1) {
                markt = obj.marketplace_name
            }
            if (markt) {
                acc = interfun.GetstoreInEU(obj.aio_acc, markt, 'acc_text').acc
            } else {
                return 'markte 不存在,' + JSON.stringify(obj.setl_id)
            }
        }
        // var rs_id =obj.rs_id
        // acc = 27
        // acc_text ="Levoit JP"
        var settlerecord_id = obj.recid
        var merchant_order_id = obj.merchant_order_id
        var merchant_adjustment_itemid = obj.merchant_adjustment_itemid
        var order_id = obj.order_id
        var sku = obj.sku
        var postDate = obj.postDate
        var endDate_txt = obj.endDate
        var deposit_date = obj.deposit_date
        var curency_txt = obj.curency_txt
        var dept = obj.dept
        var amount = Number(obj.amount.replace(',', '.'))
        var quantity = Math.abs(obj.quantity)
        var endDate = interfun.getFormatedDate('', '', endDate_txt, '', true)
        if (endDate.date == '2') { // posted date为2月份之前的不处理
            log.debug('posted date为2月份之前的不处理:', endDate)
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: settlerecord_id,
                values: {
                    custrecord_february_undeal: 'F'
                }
            })
            return 'false'
        }
        log.debug('endDate', endDate)
        var skuid = interfun.getskuId(sku, acc).skuid,
            rs
        var status; // 退货订单状态
        // 去重 搜索退货授权单
        log.debug('skuid ' + skuid, acc + ',settlerecord_id,' + settlerecord_id + ',merchant_order_id:' + merchant_order_id)
        try {
            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    { name: 'custbody_origin_settlement', operator: 'anyof', values: settlerecord_id }, // 就查看有没有这一条结算报告产生的退货单
                ],
                columns: [{ name: 'status' }]
            }).run().each(function(rec) {
                log.debug('找到重复的了 ' + rec.id, rec.getValue('status'))
                status = rec.getValue('status')
                rs = rec.id
            })
        } catch (e) {
            log.error('000search RETURN_AUTHORIZATION', e)
        }
        try {
            log.debug('status:' + status, 'rs:' + rs)
            if (!rs) {
                var currency
                if (curency_txt)
                    search.create({
                        type: 'currency',
                        filters: [{
                            name: 'symbol',
                            operator: 'is',
                            values: curency_txt
                        }]
                    }).run().each(function(e) {
                        currency = e.id
                    })
                // 如果没有对应的退货授权就create ，然后生成贷项通知单
                createAuthorationFromPayment(settlerecord_id, acc, sku, endDate, merchant_order_id, quantity, amount, order_id, merchant_adjustment_itemid, currency, skuid, dept)
            } else if (status == 'pendingReceipt' || status == 'pendingApproval') {
                if (status == 'pendingApproval')
                    record.submitFields({
                        type: 'returnauthorization',
                        id: rs,
                        values: {
                            orderstatus: 'B',
                            status: 'pendingReceipt'
                        }
                    })
                var cm
                search.create({
                    type: record.Type.CREDIT_MEMO,
                    filters: [
                        { name: 'createdfrom', operator: 'anyof', values: rs }
                    ],
                    columns: [{ name: 'status' }] // applied 已核销
                }).run().each(function(rec) {
                    log.debug('找到来源相同的贷项通知单  ' + rec.id, rec.getValue('status'))
                    cm = rec.id
                })
                // 如果没有对应的贷项通知单就transform
                if (!cm) {
                    var credit_memo
                    log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
                    // 创建贷项通知单
                    credit_memo = record.transform({
                        fromType: record.Type.RETURN_AUTHORIZATION,
                        toType: record.Type.CREDIT_MEMO,
                        fromId: Number(rs)
                    })
                    credit_memo.setText({ fieldId: 'trandate', text: endDate.date })
                    credit_memo.setValue({ fieldId: 'custbody_order_locaiton', value: acc })
                    credit_memo.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 })

                    // var lc = credit_memo.getLineCount({ sublistId: 'item' })
                    // for (var ln = 0; ln < lc; ln++) {
                    //     var line = return_authorization.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: credit_memo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) })
                    //     credit_memo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: return_authorization.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln })
                    // }
                    var cre = credit_memo.save({ ignoreMandatoryFields: true })
                    log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
                    // 创建客户退款
                    // credit_cr(merchant_order_id,settlerecord_id)
                    log.debug('OK')
                }
            }
            log.debug('settlerecord_id :' + settlerecord_id)
            record.submitFields({
                type: 'customrecord_aio_amazon_settlement',
                id: settlerecord_id,
                values: {
                    custrecord_aio_sett_credit_memo: 'T',
                    custrecord_aio_sett_authorization: 'T'
                }
            })
        } catch (e) {
            log.error('error!' + order_id, e)
            err.push(e)
        }
        if (err.length == 0) {
            return '执行成功，耗时:  ' + (new Date().getTime() - startT)
        } else {
            return '执行失败，' + JSON.stringify(err) + ' \n 耗时:  ' + (new Date().getTime() - startT)
        }
        log.audit('00000结束耗时', (new Date().getTime() - startT))
    }

    function createAuthorationFromPayment(settlerecord_id, acc, sku, endDate, merchant_order_id, quantity, amount, order_id, merchant_adjustment_itemid, currency, skuid, dept) {
        var account = getAcc(acc)
        log.debug('account', account)
        var loc, cid, rt_tax, R_memo,
            tax_item = account.info.tax_item,
            loc = account.extra_info.fbaorder_location,
            salesorder_if_taxed = account.preference.salesorder_if_taxed,
            country = account.country
        // 根据merchant_adjustment_itemid merchant_order_id和sku匹配对应的tax
        var tray
        // 配置为应收待结算的都算作收入/退款金额
        var fils = [
            { name: 'custrecord_aio_sett_tran_type', operator: 'contains', values: ['Refund'] },
            { name: 'custrecord_aio_sett_adjust_item_id', operator: 'is', values: merchant_adjustment_itemid },
            { name: 'custrecord_aio_sett_sku', operator: 'is', values: sku }

        ]
        if (merchant_order_id) {
            fils.push({ name: 'custrecord_aio_sett_merchant_order_id', operator: 'is', values: merchant_order_id })
        }
        if (order_id) {
            fils.push({ name: 'custrecord_aio_sett_order_id', operator: 'is', values: order_id })
        }
        search.create({
            type: 'customrecord_aio_amazon_settlement',
            filters: fils,
            columns: [
                { name: 'custrecord_aio_sett_amount' },
                { name: 'custrecord_aio_sett_currency' },
                { name: 'custrecord_aio_sett_tran_type' },
                { name: 'custrecord_aio_sett_amount_type' },
                { name: 'custrecord_aio_sett_amount_desc' }
            ]
        }).run().each(function(rec) {
            var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type')
            var Amount_type = rec.getValue('custrecord_aio_sett_amount_type')
            var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc')
            var currency_txt = rec.getValue('custrecord_aio_sett_currency')
            var a = rec.getValue('custrecord_aio_sett_amount').replace(',', '.')
            log.audit('金额:' + a, '类型：' + Tranction_type + ',' + Amount_type + ',' + Amount_desc)
            if (!(Amount_type == 'ItemPrice' && Amount_desc == 'Principal')) {
                var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt)
                if (ck) {
                    log.debug('属于应收 金额 : ' + typeof(a), a)
                    amount = amount + Number(a)
                    log.debug('等于,', amount)
                }
            }
            return true
        })
        // search.create({
        //   type: 'customrecord_aio_account',
        //   filters: [
        //     {name: 'internalidnumber',operator: 'equalto',values: acc}
        //   ],columns: [
        //     {name: 'custrecord_aio_seller_id'},
        //     {name: 'custrecord_aio_subsidiary'},
        //     {name: 'custrecord_aio_customer'},
        //     {name: 'custrecord_aio_enabled_sites'},
        //     {name: 'name'},
        //     {name: 'custrecord_division'}, // object
        //   ]
        // }).run().each(function (e) {

        //   report_site = e.getText(e.columns[3])
        //   report_siteId = e.getValue(e.columns[3])
        // })

        // var incc = interfun.GetSettlmentFee('ItemPrice', 'Tax', tray, report_site.split(' ')[1], rt_tax, report_siteId, acc)
        // log.debug('amount1111:' + amount + ',rt_tax:' + rt_tax, 'incc:' + JSON.stringify(incc))
        // if (!incc) throw '找不到费用,' + 'Tax' + ',' + 'ItemPrice' + ',' + tray
        // if (incc.incomeaccount == '125') {
        //   amount += Number(rt_tax)
        // }
        log.debug('amount2222:' + amount, '单价:' + amount + '/' + quantity + ' = ' + (amount / quantity).toFixed(2))
        cid = account.customer
        var rt = record.create({ type: record.Type.RETURN_AUTHORIZATION, isDynamic: true })
        rt.setValue({ fieldId: 'entity', value: cid })
        rt.setValue({ fieldId: 'location', value: loc })
        rt.setValue({ fieldId: 'currency', value: currency })
        if (merchant_order_id) {
            rt.setValue({ fieldId: 'otherrefnum', value: merchant_order_id })
        } else {
            rt.setValue({ fieldId: 'otherrefnum', value: order_id })
        }
        rt.setValue({ fieldId: 'department', value: dept })
        rt.setText({ fieldId: 'trandate', text: endDate.date })
        rt.setValue({ fieldId: 'custbody_order_locaiton', value: acc })
        rt.setValue({ fieldId: 'custbody_aio_account', value: acc })
        rt.setValue({ fieldId: 'custbody_aio_is_aio_order', value: true })
        rt.setValue({ fieldId: 'custbody_origin_settlement', value: settlerecord_id }); // 设置关联的结算报告
        log.debug('skuid:' + skuid, 'merchant_order_id :' + merchant_order_id)
        rt.selectNewLine({ sublistId: 'item' })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: skuid })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: loc })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: sku })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: quantity })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: Math.abs(Math.round((amount / quantity) * 100) / 100) })
        rt.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: Math.abs(Math.round(amount * 100) / 100) })
        rt.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'taxcode',
            value: tax_item ? tax_item : 6
        })

        try {
            rt.commitLine({ sublistId: 'item' })
        } catch (err) {
            log.error('commitLine error', err)
        }
        log.debug('增加货品成功')
        var rs = rt.save({ ignoreMandatoryFields: true })
        log.debug('生成退货单成功', rs)
        log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
        // 创建贷项通知单
        var credit_memo = record.transform({
            fromType: record.Type.RETURN_AUTHORIZATION,
            toType: record.Type.CREDIT_MEMO,
            fromId: Number(rs)
        })

        credit_memo.setText({ fieldId: 'trandate', text: endDate.date })
        credit_memo.setValue({ fieldId: 'custbody_order_locaiton', value: acc })
        credit_memo.setValue({ fieldId: 'custbody_aio_marketplaceid', value: 1 })
        // var lc = credit_memo.getLineCount({ sublistId: 'item' })
        // for (var ln = 0; ln < lc; ln++) {
        //     var line = return_authorization.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: credit_memo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) })
        //     credit_memo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: return_authorization.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln })
        // }
        var cre = credit_memo.save({ ignoreMandatoryFields: true })
        log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
        return rs
    }

    function makeresovle(type, orderid, acc) {
        var fils = []
        type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : ''
        orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : ''
        acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : ''
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: fils
        }).run().each(function(rec) {
            record.submitFields({
                type: 'customrecord_dps_transform_mo',
                id: rec.id,
                values: {
                    custrecord_tr_missing_order_resolved: true
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            })
            log.debug('make Resovle ' + rec.id, type + ' : ' + orderid)
            return true
        })
    }

    function createSOTRMissingOrder(type, orderid, reason, date, acc) {
        var mo
        var fils = []
        type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : ''
        orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : ''
        acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : ''
        var mo
        search.create({
            type: 'customrecord_dps_transform_mo',
            filters: fils
        }).run().each(function(rec) {
            mo = record.load({
                type: 'customrecord_dps_transform_mo',
                id: rec.id
            })
            return false
        })
        if (!mo) {
            mo = record.create({
                type: 'customrecord_dps_transform_mo',
                isDynamic: true
            })
        }
        type ?
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_type',
                value: type
            }) : ''; // 类型
        acc ?
            mo.setValue({
                fieldId: 'custrecord_tracking_missing_acoount',
                value: acc
            }) : ''
        orderid ?
            mo.setValue({
                fieldId: 'custrecord_missing_orderid_txt',
                value: orderid
            }) : ''
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_reason',
            value: reason
        })
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_date',
            value: date
        })
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_resolved',
            value: false
        })
        mo.setValue({
            fieldId: 'custrecord_tr_missing_order_resolving',
            value: false
        })
        return mo.save()
    }

    function getAcc(acc) {
        var t = fiedls.account,
            tsite = fiedls.amazon_global_sites,
            tdev = fiedls.amazon_dev_accounts
        var accounts = {},
            fin = []
        search.create({
            type: t._name,
            filters: [
                { name: 'internalidnumber', operator: 'equalto', values: acc },
                { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 1 /* amazon */ },
                { name: 'custrecord_aio_seller_id', operator: 'isnotempty' },
                /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                { name: 'custrecord_aio_dev_account', operator: 'noneof', values: '@NONE@' }
            ],
            columns: [
                /** * 名称 * @index 0 */
                { name: 'name' },
                /** * 账户API信息 * @index 1 */
                { name: t.seller_id },
                { name: t.mws_auth_token },
                { name: tsite.amazon_marketplace_id, join: t.enabled_sites },
                { name: tsite.amazon_mws_endpoint, join: t.enabled_sites },
                { name: tdev.aws_access_key_id, join: t.dev_account },
                { name: tdev.secret_key_guid, join: t.dev_account },
                /** * 账户基础信息 * @index 7 * */
                { name: 'name' },
                { name: t.currency },
                { name: 'custrecord_aio_if_salesorder' },
                { name: 'custrecord_aio_salesorder_type' },
                { name: 'custrecord_aio_salesorder_form' },
                { name: 'custrecord_aio_salesorder_location' },
                { name: 'custrecord_aio_salesorder_start_date' },
                /** * FBA信息 * @index 14 */
                { name: 'custrecord_aio_if_fbaorder' },
                { name: 'custrecord_aio_fbaorder_type' },
                { name: 'custrecord_aio_fbaorder_form' },
                { name: 'custrecord_aio_fbaorder_location' },
                { name: 'custrecord_aio_fbaorder_start_date' },
                /**@index 19 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_including_fees' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 其他信息 * @index 28 */
                { name: 'custrecord_division' },
                { name: 'custrecord_aio_salesorder_payment_method' },
                { name: 'custrecord_aio_discount_item' },
                { name: 'custrecord_aio_tax_item' },
                { name: tsite.amazon_currency, join: t.enabled_sites },
                /** * 公司信息 * @index 33 */
                core.utils.checkIfSubsidiaryEnabled() ? { name: 'custrecord_aio_subsidiary' } : { name: 'formulanumeric', formula: '0' },
                /** * 报告抓取信息 * @index 34 */
                { name: 'custrecord_aio_if_handle_removal_report' },
                { name: 'custrecord_aio_if_handle_custrtn_report' },
                /** * Preferences * @index 36 */
                { name: 'custrecord_aio_if_only_paid_orders' },
                { name: 'custrecord_aio_salesorder_if_taxed' },
                { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                { name: 'custrecord_aio_if_zero_price' },
                { name: 'custrecord_aio_if_check_customer_email' },
                { name: 'custrecord_aio_if_check_customer_addr' },
                { name: 'custrecord_aio_if_payment_as_tran_date' },
                /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                { name: 'custrecord_aio_if_handle_inv_report' },
                { name: 'custrecord_aio_to_default_from_location' },
                { name: 'custrecord_aio_shipping_item' },
                { name: 'custrecord_aio_to_form' },
                /** @index 48 */
                { name: fiedls.account.if_post_order_fulfillment },
                { name: fiedls.account.post_order_if_search },
                { name: fiedls.account.if_handle_sett_report },
                /** 检验亚马逊的密钥是否加密了 @index 51 */
                { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_aio_enabled_sites' },
                { name: 'custrecord_aio_customer' }

            ]
        }).run().each(function(rec) {
            accounts = {
                id: rec.id,
                country: rec.getValue(rec.columns[51]),
                customer: rec.getValue(rec.columns[52]),
                auth_meta: {
                    seller_id: rec.getValue(rec.columns[1]),
                    auth_token: rec.getValue(rec.columns[2]),
                    access_id: rec.getValue(rec.columns[5]),
                    sec_key: rec.getValue(rec.columns[6]),
                    end_point: rec.getValue(rec.columns[4])
                },
                info: {
                    name: rec.getValue(rec.columns[7]),
                    currency: rec.getValue(rec.columns[8]),
                    if_salesorder: rec.getValue(rec.columns[9]),
                    salesorder_type: rec.getValue(rec.columns[10]),
                    salesorder_form: rec.getValue(rec.columns[11]),
                    salesorder_location: rec.getValue(rec.columns[12]),
                    salesorder_start_date: rec.getValue(rec.columns[13]),
                    dept: rec.getValue(rec.columns[28]),
                    salesorder_payment_method: rec.getValue(rec.columns[29]),
                    discount_item: rec.getValue(rec.columns[30]),
                    shipping_cost_item: rec.getValue(rec.columns[46]),
                    tax_item: rec.getValue(rec.columns[31]),
                    site_currency: rec.getValue(rec.columns[32]),
                    subsidiary: Number(rec.getValue(rec.columns[33])),
                    enable_tracking_upload: rec.getValue(rec.columns[48]),
                    enabled_tracking_upload_search: rec.getValue(rec.columns[49])
                },
                extra_info: {
                    if_fbaorder: rec.getValue(rec.columns[14]),
                    fbaorder_type: rec.getValue(rec.columns[15]),
                    fbaorder_form: rec.getValue(rec.columns[16]),
                    fbaorder_location: rec.getValue(rec.columns[17]),
                    fbaorder_start_date: rec.getValue(rec.columns[18]),
                    if_including_fees: rec.getValue(rec.columns[26]),
                    if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                    if_handle_removal_report: rec.getValue(rec.columns[34]),
                    if_handle_inventory_report: rec.getValue(rec.columns[44]),
                    if_handle_settlement_report: rec.getValue(rec.columns[50]),
                    to_default_from_location: rec.getValue(rec.columns[45]),
                    aio_to_default_form: rec.getValue(rec.columns[47])
                },
                marketplace: rec.getValue(rec.columns[3]),
                preference: {
                    if_only_paid_orders: rec.getValue(rec.columns[36]),
                    salesorder_if_taxed: rec.getValue(rec.columns[37]),
                    salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                    salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                    if_zero_price: rec.getValue(rec.columns[40]),
                    if_check_customer_email: rec.getValue(rec.columns[41]),
                    if_check_customer_addr: rec.getValue(rec.columns[42]),
                    if_payment_as_tran_date: rec.getValue(rec.columns[43])
                }
            }
        })
        return accounts
    }
    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
})