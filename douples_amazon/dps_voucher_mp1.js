/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime', './Helper/interfunction.min'],
  function (search, record, moment, format, runtime, interfun) {
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
    const fieldsMapping = [
      'Commission' ,
      'FBAPerOrderFulfillmentFee',
      'FBAPerUnitFulfillmentFee',
      'FBAWeightBasedFee',
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
    ]
    const martk_corr = { // 科目配置表的报告类型字段
      'EU': 2,
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
    const income_fin = 363 // 应收账款-暂估	 1122.05	
    const income_settle = 361 // 应收账款-待结算  1122.03
    const Fincome_Plat = 412 // 预收账款-平台	 2203.03 
    const income_Refund = 471 // 主营业务收入-退款	 6001.06

    function getInputData () {
      var limit = 1000,orders = [],ors = []
      var oid = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_oid' }); // 订单号
      var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_account' })
      var group_req = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_group' })
      var fils = []
      fils.push({name: 'custrecord_is_generate_voucher',operator: 'isnot',values: 'F'})
      if (oid)
        fils.push({name: 'custrecord_l_amazon_order_id',operator: 'is',values: oid})
      if (acc)
        fils.push({name: 'custrecord_fin_to_amazon_account',operator: 'anyof',values: acc})
      fils.push({name: 'custrecord_financetype',operator: 'is',values: 'orders'})
      fils.push({name: 'custrecord_posteddate',operator: 'onorafter',values: '2020-6-1'})
     var acc_arrys = [];
      if(group_req){//根据拉单分组去履行
        core.amazon.getReportAccountList(group_req).map(function(acount){
          acc_arrys.push(acount.id);
        })
        fils.push({name: 'custrecord_fin_to_amazon_account',operator: 'anyof',values: acc_arrys})
      }

      search.create({
        type: 'customrecord_amazon_listfinancialevents',
        filters: fils,
        columns: [
          {name: 'custrecord_aio_seller_id',join: 'custrecord_fin_to_amazon_account'},
          {name: 'custrecord_aio_enabled_sites',join: 'custrecord_fin_to_amazon_account'} // 站点
        ]
      }).run().each(function (e) {
        orders.push({
          rec_id: e.id,
          seller_id: e.getValue(e.columns[0]),
          enabled_sites: e.getText(e.columns[1])
        })
        return --limit > 0
      })
      log.audit('待冲销总数', orders.length)
      return orders
    }

    function map (context) {
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
      })
      var obj = JSON.parse(context.value)
      var fin_id = obj.rec_id, enabled_sites = obj.enabled_sites.split(' ')[1]
      var order_id,postdate,entity,so_id,subsidiary,pr_store,currency
      var ship_recid,shipment_date, fee_line,fil_channel,merchant_order_id
      try {
        var rec_finance = record.load({type: 'customrecord_amazon_listfinancialevents',id: fin_id})
        order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
        pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account')
        // postdate = rec_finance.getValue('custrecord_posteddate_txt') //去财务报告的发布日期
        postdate = rec_finance.getText('custrecord_posteddate'); // 去财务报告的发布日期
        merchant_order_id = rec_finance.getValue('custrecord_seller_order_id')
        if (!order_id) {
          order_id = rec_finance.getValue('custrecord_seller_order_id')
        }

        var fils = [],sku = rec_finance.getValue('custrecord_sellersku'),qty = rec_finance.getValue('custrecord_quantityshipped')
        fils.push({ name: 'custrecord_amazon_order_id', operator: 'is', values: order_id })
        sku ? fils.push({ name: 'custrecord_sku', operator: 'is', values: sku}) : ''
        qty ? fils.push({ name: 'custrecord_quantity_shipped', operator: 'is', values: qty}) : ''
        // postdate = interfun.getFormatedDate("", "", endDate).date
        fils.push({ name: 'custrecord_shipment_date', operator: 'ON', values: postdate})

        log.debug('fils:' + postdate, JSON.stringify(fils))
        search.create({
          type: 'customrecord_amazon_sales_report',
          filters: fils,
          columns: [
            {name: 'custrecord_shipment_date',sort: 'DESC'},
            {name: 'custrecord_shipment_date_text'}
          ]
        }).run().each(function (rec) {
          ship_recid = rec.id
          shipment_date = rec.getValue('custrecord_shipment_date_text')
        })
        log.debug('postdate：' + postdate, ',shipment_date:' + shipment_date)
        var flss = [],acc_search = interfun.getSearchAccount(obj.seller_id)
        log.debug('查询的店铺acc_search:', acc_search)
        // 搜索销售订单获取客户

        var so_obj = interfun.SearchSO(order_id, merchant_order_id, acc_search)
        so_id = so_obj.so_id
        pr_store = so_obj.acc
        acc_text = so_obj.acc_text
        entity = so_obj.entity
        subsidiary = so_obj.subsidiary
        currency = so_obj.currency
        fil_channel = so_obj.fulfill_channel
        orderid = so_obj.otherrefnum

        log.audit('fil_channel', fil_channel)
        // TODO 判断订单状态，如果已经全额收款或者已关闭，则不再生成日记账
        // 如果该财务报告生成过凭证，先删除掉
        if (so_id) {
          search.create({
            type: 'journalentry',
            filters: [
              {name: 'mainline',operator: 'is',values: true},
              {name: 'custbody_relative_finanace_report',operator: 'anyof',values: fin_id}
            ],columns: [{name: 'memomain'}]
          }).run().each(function (e) {
            try {
              if (e.getValue('memomain') == '01') {
                var de = record.delete({type: 'journalentry',id: e.id})
                log.debug('删除成功  ', de)
              }
            } catch(e) {
              log.debug('delete error', e)
            // err.push(e.message)
            }
            return true
          })
          // 开始生成日记账凭证

          var fv = []
          var jour = record.create({type: 'journalentry',isDynamic: true})
          jour.setText({fieldId: 'trandate', text: postdate})
          jour.setValue({fieldId: 'memo',value: '01'})
          jour.setValue({fieldId: 'subsidiary',value: subsidiary})
          jour.setValue({fieldId: 'custbody_order_locaiton',value: pr_store})
          jour.setValue({fieldId: 'custbody_jour_orderid',value: order_id})
          jour.setValue({fieldId: 'custbody_curr_voucher',value: '预估凭证'})
          jour.setValue({fieldId: 'custbody_rel_salesorder',value: so_id}) ; // 关联销售订单
          jour.setValue({fieldId: 'currency',value: currency })
          jour.setValue({fieldId: 'custbody_jour_type',value: 'orders' }); // 记录凭证类型 orders / refunds
          log.debug('order_id', order_id)
          var dr = 0,cr = 0,num = 0

          var item_name,incomeaccount
          // if(financetype == "orders")
          item_name = 'Sl-'
          // else if(financetype == "refunds") item_name="RE-"
          var FBM_amount = 0 // 记录FBM的货品价格和税
          fieldsMapping.map(function (field) {
            if (field == 'LowValueGoodsTax-Principal' || field == 'LowValueGoodsTax-Shipping') {
              // 歸為Tax科目 2268
              if (Number(rec_finance.getValue(financeMapping[field]))) {
                jour.selectNewLine({sublistId: 'line'})
                jour.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: account_Tax})
                //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})  
                dr += Number(rec_finance.getValue(financeMapping[field]))
                // 借费用，贷应收。费用为负数，放贷方会自动变成借方  
                // 如果是日本，取整
                if (currency == JP_currency)  fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                jour.setCurrentSublistValue({ sublistId: 'line',fieldId: 'credit', value: fee_line }) // 贷 
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_document_type', value: '预估' })
                jour.commitLine({sublistId: 'line'})
              }
            }else if (Number(rec_finance.getValue(financeMapping[field]))) {
              // if(field == "Promotionitem")   incomeaccount  =Promotionitem
              // else if(field == "PromotionShipping")   incomeaccount  =PromotionShipping
              // else 
              log.debug('enabled_sites: ' + enabled_sites, martk_corr[enabled_sites])
              search.create({
                type: 'customrecord_order_account_corr',
                filters: [
                  {name: 'custrecordamazon_transaction_type',operator: 'is',values: finType},
                  {name: 'custrecordamazon_amount_description',operator: 'is',values: field},
                  {name: 'custrecord_amazon_report_type',operator: 'is',values: martk_corr[enabled_sites]}
                ],
                columns: [{name: 'custrecord_account_type'}]
              }).run().each(function (iem) {
                incomeaccount = iem.getValue(iem.columns[0])
              })
              if (incomeaccount) {
                jour.selectNewLine({sublistId: 'line'})
                jour.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: incomeaccount})
                //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})  
                dr += Number(rec_finance.getValue(financeMapping[field]))
                if (currency == JP_currency)  fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                else fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
                jour.setCurrentSublistValue({ sublistId: 'line',fieldId: 'credit', value: fee_line}) // 贷
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_document_type', value: '预估' })
                jour.commitLine({sublistId: 'line'})
              }
            }
          })
          fv.push(fin_id)
          jour.setValue({fieldId: 'custbody_relative_finanace_report',value: fv})
          log.debug('贷项总额：' + dr.toFixed(2))
          if (!Number(dr)) {
            log.debug('贷项总额为零，Resovle 返回', Number(dr))
            rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: 'T' }) // 预估计入已处理 
            rec_finance.save({ ignoreMandatoryFields: true })
            return
          }
          jour.selectNewLine({sublistId: 'line'})
          jour.setCurrentSublistValue({sublistId: 'line',fieldId: 'account',value: income_fin}) // 122 应收账款
          //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})   
          if (currency == JP_currency)  dr = Number(dr).toFixed(0)
          else dr = Number(dr).toFixed(2)
          jour.setCurrentSublistValue({ sublistId: 'line',fieldId: 'debit', value: dr }) // 借
          jour.setCurrentSublistValue({sublistId: 'line',fieldId: 'entity',value: entity}) // 客户
          jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'custcol_document_type', value: '预估' })
          jour.commitLine({sublistId: 'line'})

          // jour.setValue({fieldId:'custbody_relative_inoice',value:rec_id}) //与发票无关
          var jo = jour.save({ignoreMandatoryFields: true})
          log.debug('success', jo)
          rec_finance.setValue({fieldId: 'custrecord_is_generate_voucher',value: 'T'}) // 预估计入已处理 
          rec_finance.save({ignoreMandatoryFields: true})
          if (ship_recid)
            // 发货报告 已入凭证标记
            record.submitFields({
              type: 'customrecord_amazon_sales_report',
              id: ship_recid,
              values: {
                custrecord_is_check_invoucher: true
              }
            })
        }else {
          log.debug('0000找不到销售订单', order_id)
        // rec_finance.setValue({fieldId:'custrecord_is_generate_voucher',value:'R'}) //不处理,没有对应的销售订单就不生产预估
        // rec_finance.save({ignoreMandatoryFields:true})
        }
      } catch(e) {
        log.error(' error:', e)
      }
      log.debug('000 耗时：', new Date().getTime() - startT)
    }
    function reduce (context) {
    }

    function summarize (summary) {
      log.debug('处理完成')
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
