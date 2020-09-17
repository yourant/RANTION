/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/format', 'require', 'exports', 'N/log', 'N/record', 'N/search', './Helper/Moment.min', 'N/runtime', './Helper/interfunction.min'],
  function (format, require, exports, log, record, search, moment, runtime, interfun) {
    Object.defineProperty(exports, '__esModule', {
      value: true
    })
    const financeMapping = {
      'Principal': 'custrecord_principal_currency_amount',
      'Tax': 'custrecord_tax_currency_amount',
      'GiftWrap': 'custrecord_giftwrap_currency_amount',
      'GiftWrapTax': 'custrecord_giftwraptax_currency_amount',
      'ShippingCharge': 'custrecord_shippingcharge_curr_amount',
      'FBAPerOrderFulfillmentFee': 'custrecord_fba_perorder_fulfil_feeamount',
      'FBAPerUnitFulfillmentFee': 'custrecord_fba_perunit_fulfil_feeamount',
      'FBAWeightBasedFee': 'custrecord_fba_weight_based_fee_amount',
      'Commission': 'custrecord_commission',
      'ShippingHB': 'custrecord_shippinghb_fee_amount',
      'FixedClosingFee': 'custrecord_fixed_closing_fee_amount',
      'GiftwrapChargeback': 'custrecord_giftwrap_charge_back_fee_amou',
      'ShippingChargeback': 'custrecord_shipping_charge_back_fee_amou',
      'VariableClosingFee': 'custrecord_variable_closing_fee_amount',
      'SalesTaxCollectionFee': 'custrecord_sales_tax_collection_fee_amou',
      'MarketplaceFacilitatorTax-Shipping': 'custrecord_marketplace_factaxship_amount',
      'MarketplaceFacilitatorTax-Principal': 'custrecord_marketplace_factaxprin_amount',
      'MarketplaceFacilitatorTax-Other': 'custrecord_marketplace_factaxother_acoun',
      'PromotionMetaDataDefinitionValue': 'custrecord_prom_meta_data_def_val',
      'ExportCharge': 'custrecord_finace_exportcharge',
      'RefundCommission': 'custrecord_refundcommission',
      'other': 'custrecord_orther_financatype',
      'ShippingTax': 'custrecord_shippingtax_currency_amount',
      'LowValueGoodsTax-Principal': 'custrecord_lowvaluegoodstax_principal',
      'LowValueGoodsTax-Shipping': 'custrecord_lowvaluegoodstax_shipping',
      'RestockingFee': 'custrecord_amazon_restockingfee'
    }
    var FinancialEventsList = [
      'AffordabilityExpenseReversalEventList',
      'ProductAdsPaymentEventList',
      'RentalTransactionEventList',
      'PayWithAmazonEventList',
      'ServiceFeeEventList',
      'CouponPaymentEventList',
      'ServiceProviderCreditEventList',
      'ImagingServicesFeeEventList',
      'SellerDealPaymentEventList',
      'SellerReviewEnrollmentPaymentEventList',
      'DebtRecoveryEventList',
      'RetrochargeEventList',
      'SAFETReimbursementEventList',
      'GuaranteeClaimEventList',
      'ChargebackEventList',
      'NetworkComminglingTransactionEventList',
      'FBALiquidationEventList',
      'LoanServicingEventList',
      'RemovalShipmentEventList',
      'AffordabilityExpenseEventList',
      'AdjustmentEventList',
      'PerformanceBondRefundEventList'
    ]
    exports.getInputData = function () {
      var orders = [],
        limit = 3999
      search.create({
        type: 'customrecord_amazon_finances_cahce',
        filters: [
          // { name: 'custrecord_amazon_finances_postedafter',operator:"within", values: ["2020��2��1��","2020��2��29��"]},
          { name: 'custrecord_amazon_finances_checkbox',operator: search.Operator.IS, values: false},
          { name: 'custrecordsssssssss',operator: search.Operator.ISNOT, values: 'F'},
        // { name: 'custrecord_finance_type',operator:"is",values:"orders"},
        // { name: 'custrecord_amazon_finances_orderid',operator:"is",values:"303-6657489-5667535"},
        ]
      }).run().each(function (e) {
        orders.push(e.id)
        return --limit > 0
      })

      log.audit('获取数据长度:', orders.length)
      return orders
    }

    exports.map = function (ctx) {
      var cache_id = ctx.value
      var fin = record.load({
        type: 'customrecord_amazon_finances_cahce',
        id: cache_id
      })
      var ord = JSON.parse(fin.getValue('custrecord_amazon_finances_body'))
      var acc = fin.getValue('custrecord_amazon_finances_account')
      var postdate = fin.getValue('custrecord_amazon_ginances_postdate_txt')
      var t = fin.getValue('custrecord_finance_type')
      if (!t) return
      log.debug('Object.prototype:', Object.prototype.toString.call(ord))
      var ff = true
      try {
        if (Object.prototype.toString.call(ord) == '[object Array]') {
          ord.map(function (o) {
            ff = createRec(o, acc, cache_id, t, postdate)
          })
        } else {
          ff = createRec(ord, acc, cache_id, t, postdate)
        }
        if (ff) {
          fin.setValue({
            fieldId: 'custrecord_amazon_finances_checkbox',
            value: true
          })
        }else {
          fin.setValue({
            fieldId: 'custrecordsssssssss',
            value: 'F'
          })
        }

        var fid = fin.save()
        log.audit('fid:', fid)
      } catch (e) {
        log.error('error:', e)
      }
    }
    exports.reduce = function (ctx) {}
    /**
     * ��cache���ɲ��񱨸棬refunds & orders
     *
     */
    function createRec (l, acc, cache_id, type_finances, postdate) {
      log.debug('type:' + type_finances, JSON.stringify(l))
      if (type_finances == 'refunds') { // refund���ͷ���
        var items = l.shipment_item_adjustment_list
        var amazon_order_id = l.amazon_order_id
        var seller_order_id = l.seller_order_id
        log.debug('refunds items:' + amazon_order_id, JSON.stringify(items))
        if (items) {
          for (var i = 0; i < items.length; i++) {
            var ship_rec = record.create({
              type: 'customrecord_amazon_listfinancialevents'
            })
            ship_rec.setValue({
              fieldId: 'custrecord_fin_to_amazon_account',
              value: acc
            })
            ship_rec.setValue({
              fieldId: 'custrecord_relative_finances_rec',
              value: cache_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_sellersku',
              value: items[i].seller_sku
            })
            ship_rec.setValue({
              fieldId: 'custrecord_orderitemid',
              value: items[i].order_adjustment_item_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_quantityshipped',
              value: items[i].quantity_shipped
            })
            var pos = interfun.getFormatedDate('', '', postdate, '', true).date
            if (pos == '2') {
              return false
            }
            ship_rec.setText({
              fieldId: 'custrecord_posteddate',
              text: pos
            })
            ship_rec.setValue({
              fieldId: 'custrecord_posteddate_txt',
              value: postdate
            })
            ship_rec.setValue({
              fieldId: 'custrecord_l_amazon_order_id',
              value: amazon_order_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_marketplace_name',
              value: l.marketplace_name
            })
            ship_rec.setValue({
              fieldId: 'custrecord_seller_order_id',
              value: seller_order_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_financetype',
              value: 'refunds'
            })

            // ��������Դ���ҳ���Ӧ�ķ������� financeMapping
            var item_tax_withheld = items[i].item_tax_withheld_list
            for (var j = 0; j < item_tax_withheld.length; j++) {
              var taxes_withheld = item_tax_withheld[0].taxes_withheld
              for (var k = 0; k < taxes_withheld.length; k++) {
                var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
                if (taxes_withheld[k]) {
                  ship_rec.setValue({
                    fieldId: 'custrecord_prom_meta_data_def_val_code',
                    value: taxes_withheld[k].charge_amount.currency_code
                  })
                  var fieldss = taxes_withheld[k].charge_type
                  if (financeMapping[fieldss])
                    ship_rec.setValue({
                      fieldId: financeMapping[fieldss],
                      value: taxes_withheld[k].charge_amount.currency_amount
                    })
                  else {
                    ship_rec.setValue({
                      fieldId: 'custrecord_orther_financatype',
                      value: orther + taxes_withheld[k].charge_type + '��-' + taxes_withheld[k].charge_amount.currency_amount + '; '
                    })
                  }
                }
              }
            }
            var item_charge = items[i].item_charge_adjustment_list
            for (var l = 0; l < item_charge.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_charge[l].charge_amount.currency_code
              })

              if (financeMapping[item_charge[l].charge_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_charge[l].charge_type],
                  value: item_charge[l].charge_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_charge[l].charge_type + '��-' + item_charge[l].charge_amount.currency_amount + '; '
                })
              }
            }

            var item_fee = items[i].item_fee_list
            for (var l = 0; l < item_fee.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_fee[l].fee_amount.currency_code
              })
              if (financeMapping[item_fee[l].fee_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_fee[l].fee_type],
                  value: item_fee[l].fee_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_fee[l].fee_type + '��-' + item_fee[l].fee_amount.currency_amount + '; '
                })
              }
            }
            var item_fee_adjustment = items[i].item_fee_adjustment_list
            for (var l = 0; l < item_fee_adjustment.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_fee_adjustment[l].fee_amount.currency_code
              })
              if (financeMapping[item_fee_adjustment[l].fee_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_fee_adjustment[l].fee_type],
                  value: item_fee_adjustment[l].fee_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_fee_adjustment[l].fee_type + '��-' + item_fee_adjustment[l].fee_amount.currency_amount + '; '
                })
              }
            }

            var promotion_list = items[i].promotion_list
            for (var l = 0; l < promotion_list.length; l++) {
              log.debug('promotion_list', JSON.stringify(promotion_list))
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              if (financeMapping[promotion_list[l].promotion_type]) {
                var por = ship_rec.getValue(financeMapping[promotion_list[l].promotion_type])
                por ? por : por = 0
                var porship = ship_rec.getValue('custrecord_amazon_promotion_shipping')
                porship ? porship : porship = 0
                var poritem = ship_rec.getValue('custrecord_amazon_promotion_itemdiscount')
                poritem ? poritem : poritem = 0
                // promotion id  ���� item��VPC��Coupon ��Ϊitem���ͷ���,������ship����������Ϊshipping���ͷ���
                if (promotion_list[l].promotion_id.indexOf('item') > -1 || promotion_list[l].promotion_id.indexOf('VPC') > -1 || promotion_list[l].promotion_id.indexOf('Coupon') > -1)
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_itemdiscount',
                    value: (Number(poritem) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                else
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_shipping',
                    value: (Number(porship) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })

                ship_rec.setValue({
                  fieldId: financeMapping[promotion_list[l].promotion_type],
                  value: (Number(por) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                })
              } else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + promotion_list[l].promotion_type + '��-' + promotion_list[l].promotion_amount.currency_amount + '; '
                })
              }
            }
            var pro_adjustment = items[i].promotion_adjustment_list
            for (var l = 0; l < pro_adjustment.length; l++) {
              log.debug('pro_adjustment', JSON.stringify(pro_adjustment))
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              if (financeMapping[pro_adjustment[l].promotion_type]) {
                var por = ship_rec.getValue(financeMapping[pro_adjustment[l].promotion_type])
                por ? por : por = 0
                var porship = ship_rec.getValue('custrecord_amazon_promotion_shipping')
                porship ? porship : porship = 0
                var poritem = ship_rec.getValue('custrecord_amazon_promotion_itemdiscount')
                poritem ? poritem : poritem = 0

                // promotion id  ���� item��VPC��Coupon ��Ϊitem���ͷ���,������ship����������Ϊshipping���ͷ���
                if (pro_adjustment[l].promotion_id.indexOf('item') > -1 || pro_adjustment[l].promotion_id.indexOf('VPC') > -1 || pro_adjustment[l].promotion_id.indexOf('Coupon') > -1)
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_itemdiscount',
                    value: (Number(poritem) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                else
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_shipping',
                    value: (Number(porship) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })

                ship_rec.setValue({
                  fieldId: financeMapping[pro_adjustment[l].promotion_type],
                  value: (Number(por) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                })
              } else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + pro_adjustment[l].PromotionType + '��-' + pro_adjustment[l].promotion_amount.currency_amount + '; '
                })
              }
            }

            var grant = ship_rec.getValue('custrecord_orther_financatype')
            ship_rec.setValue({
              fieldId: 'custrecord_orther_financatype',
              value: Number(grant) + Number(items[i].cost_of_points_granted.currency_amount)
            })
            var returned = ship_rec.getValue('custrecord_orther_financatype')
            ship_rec.setValue({
              fieldId: 'custrecord_orther_financatype',
              value: Number(returned) + Number(items[i].cost_of_points_returned.currency_amount)
            })
            var ss = ship_rec.save()
            log.debug('�������˿���񱨸�', ss)
          }
        }
      } else { // orders���ͷ���
        var items = l.shipment_item_list
        var amazon_order_id = l.amazon_order_id
        var seller_order_id = l.seller_order_id
        log.debug('orders items:' + amazon_order_id, JSON.stringify(items))
        var marketplace_name = l.marketplace_name
        if (items) {
          for (var i = 0; i < items.length; i++) {
            var order_item_id = items[i].order_item_id
            var seller_sku = items[i].seller_sku
            var quantity_shipped = items[i].quantity_shipped
            log.debug(' l.seller_order_id:' + amazon_order_id, 'postdate: ' + postdate)
            var ship_rec = record.create({
              type: 'customrecord_amazon_listfinancialevents'
            })
            ship_rec.setValue({
              fieldId: 'custrecord_fin_to_amazon_account',
              value: acc
            })
            ship_rec.setValue({
              fieldId: 'custrecord_sellersku',
              value: seller_sku
            })
            ship_rec.setValue({
              fieldId: 'custrecord_orderitemid',
              value: order_item_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_quantityshipped',
              value: quantity_shipped
            })
            ship_rec.setValue({
              fieldId: 'custrecord_l_amazon_order_id',
              value: amazon_order_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_marketplace_name',
              value: marketplace_name
            })
            ship_rec.setValue({
              fieldId: 'custrecord_seller_order_id',
              value: seller_order_id
            })
            ship_rec.setValue({
              fieldId: 'custrecord_financetype',
              value: 'orders'
            })
            ship_rec.setValue({
              fieldId: 'custrecord_relative_finances_rec',
              value: cache_id
            })
            var pos = interfun.getFormatedDate('', '', postdate, '', true).date
            if (pos == '2') {
              return false
            }
            ship_rec.setText({
              fieldId: 'custrecord_posteddate',
              text: pos
            })
            ship_rec.setValue({
              fieldId: 'custrecord_posteddate_txt',
              value: postdate
            })
            var item_tax_withheld = items[i].item_tax_withheld_list
            // ��������Դ���ҳ���Ӧ�ķ������� financeMapping
            for (var j = 0; j < item_tax_withheld.length; j++) {
              var taxes_withheld = item_tax_withheld[j].taxes_withheld
              var orther = ship_rec.getValue('custrecord_orther_financatype')
              for (var k = 0; k < taxes_withheld.length; k++) {
                ship_rec.setValue({
                  fieldId: 'custrecord_prom_meta_data_def_val_code',
                  value: taxes_withheld[k].charge_amount.currency_code
                })
                if (financeMapping[taxes_withheld[k].charge_type])
                  ship_rec.setValue({
                    fieldId: financeMapping[taxes_withheld[k].charge_type],
                    value: taxes_withheld[k].charge_amount.currency_amount
                  })
                else
                  ship_rec.setValue({
                    fieldId: 'custrecord_orther_financatype',
                    value: orther + taxes_withheld[k].charge_type + '��-' + taxes_withheld[k].charge_amount.currency_amount + '; '
                  })
              }
            }

            var item_charge = items[i].item_charge_list
            for (var l = 0; l < item_charge.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ' '
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_charge[l].charge_amount.currency_code
              })
              if (financeMapping[item_charge[l].charge_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_charge[l].charge_type],
                  value: item_charge[l].charge_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_charge[l].charge_type + '��-' + item_charge[l].charge_amount.currency_amount + '; '
                })
              }
            }

            var item_charge_adj = items[i].item_charge_adjustment_list
            for (var l = 0; l < item_charge_adj.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_charge_adj[l].charge_amount.currency_code
              })
              if (financeMapping[item_charge_adj[l].charge_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_charge_adj[l].charge_type],
                  value: item_charge_adj[l].charge_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_charge_adj[l].charge_type + '��-' + item_charge_adj[l].charge_amount.currency_amount + '; '
                })
              }
            }

            var item_fee = items[i].item_fee_list
            for (var l = 0; l < item_fee.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              ship_rec.setValue({
                fieldId: 'custrecord_prom_meta_data_def_val_code',
                value: item_fee[l].fee_amount.currency_code
              })
              if (financeMapping[item_fee[l].fee_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_fee[l].fee_type],
                  value: item_fee[l].fee_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_fee[l].fee_type + '��-' + item_fee[l].fee_amount.currency_amount + '; '
                })
              }
            }
            var item_fee_adjustment = items[i].item_fee_adjustment_list
            for (var l = 0; l < item_fee_adjustment.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              if (financeMapping[item_fee_adjustment[l].fee_type])
                ship_rec.setValue({
                  fieldId: financeMapping[item_fee_adjustment[l].fee_type],
                  value: item_fee_adjustment[l].fee_amount.currency_amount
                })
              else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + item_fee_adjustment[l].fee_type + '��-' + item_fee_adjustment[l].fee_amount.currency_amount + '; '
                })
              }
            }

            var promotion_list = items[i].promotion_list
            for (var l = 0; l < promotion_list.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              if (financeMapping[promotion_list[l].promotion_type]) {
                var por = ship_rec.getValue(financeMapping[promotion_list[l].promotion_type])
                por ? por : por = 0
                var porship = ship_rec.getValue('custrecord_amazon_promotion_shipping')
                porship ? porship : porship = 0
                var poritem = ship_rec.getValue('custrecord_amazon_promotion_itemdiscount')
                poritem ? poritem : poritem = 0

                // promotion id  ���� item��VPC��Coupon ��Ϊitem���ͷ���,������ship����������Ϊshipping���ͷ���
                if (promotion_list[l].promotion_id.indexOf('item') > -1 || promotion_list[l].promotion_id.indexOf('VPC') > -1 || promotion_list[l].promotion_id.indexOf('Coupon') > -1)
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_itemdiscount',
                    value: (Number(poritem) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                else
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_shipping',
                    value: (Number(porship) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                  })

                ship_rec.setValue({
                  fieldId: financeMapping[promotion_list[l].promotion_type],
                  value: (Number(por) + Number(promotion_list[l].promotion_amount.currency_amount)).toFixed(2)
                })
              } else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + promotion_list[l].promotion_type + '��-' + promotion_list[l].promotion_amount.currency_amount + '; '
                })
              }
            }
            var pro_adjustment = items[i].promotion_adjustment_list
            for (var l = 0; l < pro_adjustment.length; l++) {
              var orther = ship_rec.getValue('custrecord_orther_financatype') + ''
              if (financeMapping[pro_adjustment[l].promotion_type]) {
                var por = ship_rec.getValue(financeMapping[pro_adjustment[l].promotion_type])
                por ? por : por = 0
                var porship = ship_rec.getValue('custrecord_amazon_promotion_shipping')
                porship ? porship : porship = 0
                var poritem = ship_rec.getValue('custrecord_amazon_promotion_itemdiscount')
                poritem ? poritem : poritem = 0

                // promotion id  ���� item��VPC��Coupon ��Ϊitem���ͷ���,������ship����������Ϊshipping���ͷ���
                if (pro_adjustment[l].promotion_id.indexOf('item') > -1 || pro_adjustment[l].promotion_id.indexOf('VPC') > -1 || pro_adjustment[l].promotion_id.indexOf('Coupon') > -1)
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_itemdiscount',
                    value: (Number(poritem) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })
                else
                  ship_rec.setValue({
                    fieldId: 'custrecord_amazon_promotion_shipping',
                    value: (Number(porship) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                  })

                ship_rec.setValue({
                  fieldId: financeMapping[pro_adjustment[l].promotion_type],
                  value: (Number(por) + Number(pro_adjustment[l].promotion_amount.currency_amount)).toFixed(2)
                })
              } else {
                ship_rec.setValue({
                  fieldId: 'custrecord_orther_financatype',
                  value: orther + pro_adjustment[l].PromotionType + '��-' + pro_adjustment[l].promotion_amount.currency_amount + '; '
                })
              }
            }

            var grant = ship_rec.getValue('custrecord_orther_financatype')
            ship_rec.setValue({
              fieldId: 'custrecord_orther_financatype',
              value: Number(grant) + Number(items[i].cost_of_points_granted.currency_amount)
            })
            var returned = ship_rec.getValue('custrecord_orther_financatype')
            ship_rec.setValue({
              fieldId: 'custrecord_orther_financatype',
              value: Number(returned) + Number(items[i].cost_of_points_returned.currency_amount)
            })

            var ss = ship_rec.save()
            log.debug('�����ɷ������񱨸�', ss)
          }
        }
      }
      return true
    }
    exports.summarize = function (ctx) {
      log.audit('�������', ctx)
    }
  })
