/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime','./Helper/interfunction.min'],
  function (search, record, moment, format, runtime,interfun) {
    const financeMapping = {
      "Principal": "custrecord_principal_currency_amount",
      "Tax": "custrecord_tax_currency_amount",
      "Commission": "custrecord_commission",
      "FBAPerOrderFulfillmentFee": "custrecord_fba_perorder_fulfil_feeamount",
      "FBAPerUnitFulfillmentFee": "custrecord_fba_perunit_fulfil_feeamount",
      "FBAWeightBasedFee": "custrecord_fba_weight_based_fee_amount",
      "FixedClosingFee": "custrecord_fixed_closing_fee_amount",
      "VariableClosingFee": "custrecord_variable_closing_fee_amount",
      "GetPaidFasterFee": "custrecord_amazon_getpaidfasterfee",
      "GiftwrapChargeback": "custrecord_giftwrap_charge_back_fee_amou",
      "GiftWrap": "custrecord_giftwrap_currency_amount",
      "GiftWrapTax": "custrecord_giftwraptax_currency_amount",
      "SalesTaxCollectionFee": "custrecord_sales_tax_collection_fee_amou",
      "Shipping": "custrecord_shippingcharge_curr_amount",
      "ShippingTax": "custrecord_shippingtax_currency_amount",
      "ShippingHB": "custrecord_shippinghb_fee_amount",
      "ShippingChargeback": "custrecord_shipping_charge_back_fee_amou",
      "MarketplaceFacilitatorTax-Shipping": "custrecord_marketplace_factaxship_amount",
      "MarketplaceFacilitatorTax-Principal": "custrecord_marketplace_factaxprin_amount",
      "MarketplaceFacilitatorTax-Other": "custrecord_marketplace_factaxother_acoun",
      "Principal-promotion": "custrecord_amazon_promotion_itemdiscount",
      "Shipping-promotion": "custrecord_amazon_promotion_shipping",
      "RefundCommission": "custrecord_refundcommission",
      "ExportCharge": "custrecord_finace_exportcharge",
      "LowValueGoodsTax-Principal": "custrecord_lowvaluegoodstax_principal",
      "LowValueGoodsTax-Shipping": "custrecord_lowvaluegoodstax_shipping",
      "RestockingFee": "custrecord_amazon_restockingfee",
      "Promotionitem": "custrecord_amazon_promotion_itemdiscount",//1341
      "PromotionShipping": "custrecord_amazon_promotion_shipping",//2203
      // "PromotionMetaDataDefinitionValue" :"custrecord_prom_meta_data_def_val"
    }
    const fieldsMapping = [
      "Commission",
      "FBAPerOrderFulfillmentFee",
      "FBAPerUnitFulfillmentFee",
      "FBAWeightBasedFee",
      "FixedClosingFee",
      "VariableClosingFee",
      "GetPaidFasterFee",
      "GiftwrapChargeback",
      "GiftWrap",
      "GiftWrapTax",
      "SalesTaxCollectionFee",
      "Shipping",
      "ShippingTax",
      "ShippingHB",
      "ShippingChargeback",
      "MarketplaceFacilitatorTax-Shipping",
      "MarketplaceFacilitatorTax-Principal",
      "MarketplaceFacilitatorTax-Other",
      //   "PromotionMetaDataDefinitionValue",
      "Promotionitem",
      "PromotionShipping",
      "ExportCharge",
      "RestockingFee",
      "LowValueGoodsTax-Principal",
      "LowValueGoodsTax-Shipping",
      "RefundCommission"
    ]
    const account_Tax = 1026   //6601.30.01 销售费用 : 平台销售税 : Amazon
    const income_fin=363    //应收账款-暂估	 1122.05	
    const martk_corr={   //科目配置表的报告类型字段
      "EU":2,
      "JP":2,
      "US":1,
      "CA":1,
      "MX":1,
      "AU":1,
      "SG":1
    } 
    const JP_currency = 8
    const finType = "Refund" 
    function getInputData() {
      var limit = 100, orders = []
      search.create({
        type: 'customrecord_amazon_listfinancialevents',
        filters: [
          { name: 'custrecord_financetype', operator: 'is', values: "refunds" },
          { name: 'custrecord_fin_to_amazon_account', operator: 'anyof', values: "5" },
          // { name: 'custrecord_seller_order_id', operator: 'is', values: "114-1252019-0442666" },
          // { name: 'custrecord_posteddate', operator: 'within', values: ["2020年2月1日","2020年3月2日"] },
          { name: 'custrecord_is_generate_voucher', operator: 'is', values: "F" },
        ],columns:[
          {name:"custrecord_aio_seller_id",join:"custrecord_fin_to_amazon_account"},
          {name:"custrecord_aio_enabled_sites",join:"custrecord_fin_to_amazon_account"}//站点
        ]
        }).run().each(function(e){
         orders.push({
         rec_id:e.id,
         seller_id:e.getValue(e.columns[0]),
         enabled_sites:e.getText(e.columns[1]),
       })
       return --limit>0
      })
      log.audit("待冲销总数", orders.length)
      return orders;  
    }

    function map(context) {
      var err = [];
      var order_id, seller_order_id, post_date, entity, orderstatus, so_id, subsidiary, pr_store, currency_id;
      var obj = JSON.parse(context.value)
      var fin_id = obj.rec_id, enabled_sites = obj.enabled_sites.split(" ")[1]
      try {
        var rec_finance = record.load({ type: "customrecord_amazon_listfinancialevents", id: fin_id }),
          order_id = rec_finance.getValue('custrecord_seller_order_id'),
          post_date = rec_finance.getValue('custrecord_posteddate_txt'),
          sku = rec_finance.getValue('custrecord_sellersku')

          if(!order_id){    //退款线取seller order ID ，如果没有再取amazon order id
            order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
          }
        var ret_qty
        log.debug("order_id", order_id)
        var filters = []
        sku ?
        filters.push({ name: 'custrecord_aio_b2_creturn_sku', operator: 'is', values: sku }) : ""
        filters.push({ name: 'custrecord_aio_b2c_return_order_id', operator: 'is', values: order_id })

        search.create({
          type: 'customrecord_aio_amazon_customer_return',
          filters: filters,
          columns: [
            { name: 'custrecord_aio_b2c_return_quantity' },
          ]
        }).run().each(function (rec) {
          ret_qty = rec.getValue("custrecord_aio_b2c_return_quantity")
        });
        //搜索tuihuo单获取客户
        var acc_search = interfun.getSearchAccount(obj.seller_id);
        search.create({
          type: record.Type.RETURN_AUTHORIZATION,
          filters: [
            { name: 'poastext', operator: 'is', values: order_id },
            { name: 'custbody_aio_account', operator: 'anyof', values: acc_search },
            { name: 'mainline', operator: 'is', values: true }
          ],
          columns: [
            { name: 'entity' },
            { name: 'statusref' },
            { name: 'subsidiary' },
            { name: 'custbody_aio_account' },
            { name: 'currency' }
          ]
        }).run().each(function (rec) {
          so_id = rec.id;
          entity = rec.getValue('entity');
          orderstatus = rec.getValue('statusref');
          subsidiary = rec.getValue('subsidiary');
          pr_store = rec.getValue('custbody_aio_account');
          currency_id = rec.getValue('currency');
          return false;
        });
        log.audit("entity"+entity,"orderstatus:"+orderstatus)
        //如果该财务报告生成过凭证，先删除掉
        if (so_id) {
          search.create({
            type: 'journalentry',
            filters: [
              { name: 'mainline', operator: 'is', values: true },
              { name: 'custbody_relative_finanace_report', operator: 'anyof', values:fin_id },
            ], columns: [{ name: "memomain" }]
          }).run().each(function (e) {
            try {
              if (e.getValue("memomain") == "re01") {
                var de = record.delete({ type: 'journalentry', id: e.id })
                log.debug("删除成功  ", de)
              }
            } catch (e) {
              log.debug("delete error", e)
              err.push(e.message);
            }
            return true
          })
          var fv = [] //存储关联的财务报告
          var jour = record.create({ type: 'journalentry', isDynamic: true })
          log.debug("post_date:"+post_date,getFormatedDate(post_date))
          jour.setText({ fieldId: 'trandate', text: interfun.getFormatedDate("","",post_date).date })
          jour.setValue({ fieldId: 'memo', value: "re01" })
          jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
          jour.setValue({ fieldId: 'currency', value: currency_id })
          jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store })
          jour.setValue({ fieldId: 'custbody_jour_orderid', value: order_id })
          jour.setValue({ fieldId: 'custbody_jour_type', value: "refunds" })
          jour.setValue({ fieldId: 'custbody_curr_voucher', value: "退款预估凭证" })

          log.debug("order_id", order_id)
          var dr = 0, cr = 0, num = 0;
          var item_name, incomeaccount;
          item_name = "RE-"
          fieldsMapping.map(function (field) {
            if (field == "LowValueGoodsTax-Principal" || field == "LowValueGoodsTax-Shipping") {
              //歸為Tax科目 2268
              if (Number(rec_finance.getValue(financeMapping[field]))) {
                jour.selectNewLine({ sublistId: 'line' })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: account_Tax })
                // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "预 "+order_id+" 退" })
              
                var x = Math.round(parseFloat(rec_finance.getValue(financeMapping[field])) * 100) / 100;
                if(currency_id == JP_currency )   x =Math.round(x) 
                dr += x
                log.debug("credit:"+x)
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: x }) //credit贷
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
                jour.commitLine({ sublistId: 'line' })
              }
            } else if (Number(rec_finance.getValue(financeMapping[field]))) {
              // if (field == "Promotionitem") incomeaccount = 1341
              // else if (field == "PromotionShipping") incomeaccount = 2203
              // else
              log.debug("enabled_sites: "+enabled_sites,martk_corr[enabled_sites])
              search.create({
                  type:'customrecord_order_account_corr',
                  filters:[
                    {name:'custrecordamazon_transaction_type',operator:'is',values:finType},
                    {name:'custrecordamazon_amount_description',operator:'is',values:field},
                    {name:'custrecord_amazon_report_type',operator:'is',values:martk_corr[enabled_sites]},
                   ],
                  columns:[{name:'custrecord_account_type'}]
              }).run().each(function(iem){
                  incomeaccount = iem.getValue(iem.columns[0])
              })
              if (incomeaccount) {
                jour.selectNewLine({ sublistId: 'line' })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: incomeaccount })
                // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value:"预 "+order_id+" 退"})
                var x = Math.round(parseFloat(rec_finance.getValue(financeMapping[field])) * 100) / 100;
                if(currency_id == JP_currency )   x =Math.round(x) 
                dr += x
                log.debug("credit:"+x)
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value:x }) //credit贷 
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
                jour.commitLine({ sublistId: 'line' })
              }
            }
          })
          fv.push(fin_id)
          jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: fv })
          log.debug("贷项总额：" + dr.toFixed(2))
          if(Number(dr) ==0){ 
            rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: "T" }) //预估计入已处理 
            rec_finance.save({ ignoreMandatoryFields: true });
            return 
          }
          jour.selectNewLine({ sublistId: 'line' })
          jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_fin })
          // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "预 "+order_id+" 退" })
          if(currency_id == JP_currency )   dr=Math.round(dr) 
          else   dr = Math.round(parseFloat(dr) * 100) / 100;
          log.debug("debit:"+dr)
          jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: dr }) //debit借
          jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
          jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
          jour.commitLine({ sublistId: 'line' })


          //    jour.setValue({fieldId:'custbody_relative_inoice',value:rec_id}) 
          var jo = jour.save({ ignoreMandatoryFields: true });
          log.debug("success", jo)
          rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: "T" }) //预估计入已处理 
          rec_finance.save({ ignoreMandatoryFields: true });
        } else {
          // rec_finance.setValue({ fieldId: "custrecord_is_generate_voucher", value: "找不到退货授权单" })
          // rec_finance.save()
          log.debug("0000000找不到订单:"+fin_id, rec_finance.getValue('custrecord_l_amazon_order_id'))
        }
      } catch (e) {
        log.error("create error", e)
        err.push(e.message);
      }
      //创建missorder
      if (err.length > 0) {
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var date = format.parse({
          value: (moment(new Date().getTime()).format(dateFormat)),
          type: format.Type.DATE
        });;

        var moId = createSOTRMissingOrder('returnjour', so_id, JSON.stringify(err), date);
        log.debug("出现错误，已创建missingorder" + moId);
      }
    }
    function reduce(context) {

    }

    function summarize(summary) {
      log.debug("处理完成" ,summary);
    } 
    /**
  * 生成单据失败记录
  * @param {*} type 
  * @param {*} account_id 
  * @param {*} order_id 
  * @param {*} so_id 
  * @param {*} reason 
  * @param {*} date 
  */
    function createSOTRMissingOrder(type, orderid, reason, date) {
      var mo;
      search.create({
        type: 'customrecord_dps_transform_mo',
        filters: [{
          name: 'custrecord_tr_missing_order_type',
          operator: 'is',
          values: type
        }, {
          name: 'custrecord_tr_missing_order_id',
          operator: 'is',
          values: orderid
        }]
      }).run().each(function (rec) {
        mo = record.load({
          type: 'customrecord_dps_transform_mo',
          id: rec.id
        });
        return false;
      });
      if (!mo) {
        mo = record.create({
          type: 'customrecord_dps_transform_mo',
          isDynamic: true,
        });
      }
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_type',
        value: type
      }); //类型

      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_id',
        value: orderid
      });
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_reason',
        value: reason
      });
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_date',
        value: date
      });
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_resolved',
        value: false
      });
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_resolving',
        value: false
      });
      return mo.save();
    };

    function getFormatedDate(str) {
      var strs = str.substring(0, 10)
      var ins = strs.split(".")[0].length
      var s_d=str
      if (ins < 4) {
        s_d = strs.split(".")[2] + "/" + strs.split(".")[1] + "/" + strs.split(".")[0] + " " + str.substring(11, 19)
      }
      else {
        if(str.indexOf("UTC") > -1)
        s_d = str.substring(0, 19)
      }
      s_d = format.format({
        value: moment.utc(s_d).toDate(),
        type: format.Type.DATE,
        timezone: format.Timezone.AMERICA_LOS_ANGELES  //统一转为美国时间
      });
      log.debug("时间 trandate：", s_d)
      return s_d
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });