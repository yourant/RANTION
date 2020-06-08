/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime', "./Helper/interfunction.min"],
  function (search, record, moment, format, runtime, interfun) {
    const MissingReportType = 3 //Missing report 结算报告Settlement report - Order
    const dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    const date = format.parse({
      value: (moment(new Date().getTime()).format(dateFormat)),
      type: format.Type.DATE
    });
    const JP_currency = 8
    const income_fin=363    //应收账款-暂估	 1122.05	
    const income_settle=361    //应收账款-待结算  1122.03
    const Fincome_Plat=412	    //预收账款-平台	 2203.03 
    const income_Refund=471    //主营业务收入-退款	 6001.06
    const amount_ser=404    //短期借款-机构贷款	 2001.02
   	
    function getInputData() {
      var limit = 100, orders = [], settl_id = []
      var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_dianpu1' });
      log.audit("选择的店铺:" + acc)
     
      //如果是属于生成短期借款凭证
      var fils =[]
        fils = [
          ["custrecord_aio_sett_amount_type", "is", "other-transaction"],
          "and",
          ["custrecord_aio_sett_tran_type", "is", "other-transaction"],
          "and",
          ["custrecord_aio_sett_amount_desc", "is", "Amazon Capital Services"], 
          "and",
          ["custrecord_settle_is_generate_voucher", "is", false], //未生成凭证
        ]
        log.error("acc", acc);
        if(acc){
          fils.push("and")
          fils.push( ["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]])
        }

        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id' },
            { name: 'custrecord_aio_sett_end_date' },
            { name: 'custrecord_aio_sett_amount' },
            { name: 'custrecord_aio_sett_currency' },
            { name: 'custrecord_aio_sett_report_id' },  //order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
          
          ]
        }).run().each(function (rec) {
       
            var amount = rec.getValue('custrecord_aio_sett_amount');
            if (amount.indexOf(',') != -1) {
              amount = amount.replace(',', '.')
            }
            //货品价格和税是收入，不计入冲销
              if (Number(amount) != 0) {
                  orders.push({
                  
                    "amount": - Math.round(parseFloat(amount) * 100) / 100,
                    "rec_id":rec.id,
                    "settle_id": rec.getValue('custrecord_aio_sett_id'),
                    "currency_txt":rec.getValue('custrecord_aio_sett_currency'),
                    "cl_date":interfun.getFormatedDate("", "",  rec.getValue('custrecord_aio_sett_end_date')) ,
                    "reportId":rec.getValue('custrecord_aio_sett_report_id') ,
                  })
              }
          return true
        })
     
      
      log.audit("待冲销总数 " + orders.length, orders)
      return orders;
    }
    
    function map(context) {
      var startT = new Date().getTime();
      log.debug("context.value",context.value)
      var obj = JSON.parse(context.value)
      var settle_id = obj.settle_id
      var reportId = obj.reportId
      var currency_txt = obj.currency_txt
      var rec_id = obj.rec_id
      var entity, subsidiary, acc_text,pr_store;  //订单原信息
      log.debug("settle_id" + settle_id)
      var currency_txt,currency

      try {
        var seller_id,report_site
    
        search.create({
          type:"customrecord_aio_amazon_report",
          filters:[
            {name:"internalidnumber",operator:"equalto",values:reportId}
          ],columns:[
            {name:"custrecord_aio_seller_id",join:"custrecord_aio_origin_account"},
            {name:"custrecord_aio_subsidiary",join:"custrecord_aio_origin_account"},
            {name:"custrecord_aio_customer",join:"custrecord_aio_origin_account"},
            {name:"custrecord_aio_enabled_sites",join:"custrecord_aio_origin_account"},
            {name:"custrecord_aio_origin_account"}
          ]
        }).run().each(function(e){
          seller_id = e.getValue(e.columns[0])
          subsidiary = e.getValue(e.columns[1])
          entity = e.getValue(e.columns[2])
          report_site = e.getText(e.columns[3])
          report_siteId = e.getValue(e.columns[3])
          pr_store = e.getValue(e.columns[4])
          acc_text = e.getText(e.columns[4])
        })
    
          search.create({
            type: 'currency',
            filters: [{
              name: "symbol",
              operator: 'is',
              values: currency_txt
            }]
          }).run().each(function (e) {
            currency = e.id
          })

        log.audit("entity :" + entity + ",currency: " + currency, "店铺：" + pr_store)
          if(interfun.CheckJO("",settle_id+"-"+ rec_id,[rec_id],"",pr_store)){
            var jour = record.create({ type: 'journalentry', isDynamic: true })
            jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
            jour.setValue({ fieldId: 'currency', value: currency })
            jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store })
            jour.setValue({ fieldId: 'custbody_curr_voucher', value: "短期借款" })
            jour.setValue({ fieldId: 'custbody_amazon_settlementid', value:settle_id+"-" +rec_id })  //settlementid
            jour.setValue({ fieldId: 'custbody_jour_type', value: "orders" })  //记录凭证类型 orders / refunds
            log.debug("开始生产冲销日记账 ：" + rec_id)

            var x = Math.round(parseFloat(obj.amount) * 100) / 100;
            log.debug("开始生产冲销日记账 ：" + rec_id)
             jour.selectNewLine({ sublistId: 'line' })
             jour.setCurrentSublistValue({ 
               sublistId: 'line',
                 fieldId: 'account', 
                   value:  amount_ser})
             if (currency == JP_currency) x = Math.round(x)  //JP取整数
             jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: x }) 
             log.debug("开始生产冲销日记账 ：" + rec_id)
             jour.commitLine({ sublistId: 'line' })

            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_settle })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: x }) 
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
            jour.commitLine({ sublistId: 'line' })
            jour.setText({ fieldId: 'trandate', text: obj.cl_date.date })
            log.debug("开始生产冲销日记账 ：" + rec_id)
            var jo_2 = jour.save();
            log.debug("success ,冲销凭证耗时："+(new Date().getTime() - startT),jo_2)
          }
       } catch (e) {
        log.error("000000000000000000000000000000eerroor:" + orderid, e);
      }

    }

    function reduce(context) {
    }

    function summarize(summary) {
      log.audit("处理完成")
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });