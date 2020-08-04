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
    const income_settle=125    //应收账款-待结算  1122.03.01
    const Fincome_Plat=412	    //预收账款-平台	 2203.03 
    const income_Refund=471    //主营业务收入-退款	 6001.06
    const amount_ser=404    //短期借款-机构贷款	 2001.02
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
    function getInputData() {
      var limit = 4000, orders = [], settl_id = [];
      var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_dianpu' });
      var par_orid = runtime.getCurrentScript().getParameter({ name: 'custscript_amaozn_orderid' });
      log.audit("选择的店铺:" + acc,"par_orid:"+par_orid)
      // if (!acc) {
      //   log.debug("必须先选择店铺", "在脚本部署找到店铺参数设置店铺")
      //   return
      // }
      //如果是属于生成短期借款凭证
      var fils =[]
    
        fils = [
          // ["custrecord_aio_sett_order_id", "is", "249-5241254-4181445"],
          // ["custrecord_aio_sett_order_id", "isnotempty", ""],
          // "and",
          ["custrecord_settlement_enddate", "within", ["2020-6-1","2020-7-1"]], //end date在2月2号之后，所有的
          "and",
          ["custrecord_settlement_acc", "noneof", "@NONE@"],
          "and",
          ["custrecord_aio_sett_tran_type", "isnot", "Refund"],
          "and",
          ["custrecord_settle_is_generate_voucher", "is", false], //未生成凭证
          "and",
          ["custrecord_payment_itemprice_pt", "is", false], //不属于货价和税
          "and",
          ["custrecord_february_undeal", "isnot", "F"],  //post date不是2月份之前
          // "and",
          // ["custrecord_missingorder_settlement", "isnot", "F"],    //如果订单号不是正常的亚马逊单号   3-7-7
        ]
    
      if(acc){
        fils.push("and")
        fils.push( ["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]])
      }
      if(par_orid){
        fils.push("and")
        fils.push(["custrecord_aio_sett_order_id", "is", par_orid])
      }
        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id', summary: "GROUP" },     //按 settlement id和单号分组
            { name: 'custrecord_aio_sett_order_id', summary: "GROUP" },
            { name: "custrecord_aio_sett_report_id", summary: "GROUP" },
            { name: 'custrecord_aio_sett_merchant_order_id', summary: "GROUP" },
            { name: 'custrecord_settlement_acc', summary: "GROUP" }, //实际店铺
          ]
        }).run().each(function (e) {
          orders.push({
            "settle_id": e.getValue(e.columns[0]) + "",
            "reportId":  e.getValue(e.columns[2]),
            "orderid": e.getValue(e.columns[1]),
            "merchant_order_id": e.getValue(e.columns[3]),
            "settlement_acc": e.getValue(e.columns[4])
          })
          return --limit > 0
      })
      log.audit("待冲销总数 " + orders.length, orders)
      return orders;
    }
    
    function map(context) {
      var startT = new Date().getTime();
      log.debug("context.value",context.value)
      var obj = JSON.parse(context.value)
      var orderid = obj.orderid
      var settlement_acc = obj.settlement_acc
      var settle_id = obj.settle_id
      var reportId = obj.reportId
      var merchant_order_id = obj.merchant_order_id
      var err = [];
      var so_id
      var settlement_ids = [];
      var entity, marketplace_name, subsidiary, acc_text,pr_store;  //订单原信息
      var depositDate, endDate, postDate, shipmentid_Arrys = [], settlmentID = {}, shipsID = {};
      var cl_date;  //冲销时间
      var item_codes=[],item_code, ship_id_arrys = [];  //记录shipmentid
      var fulfill_channel  //发运方式，判断fbm 
      var item_prices = 0 //货品价格和税收入，用于fbm 
      var currency_txt,currency
    
      try {
        var end_date, postdate_arry = [], PT_Arrys = [],settlement_idObj={}
        var search_acc ,seller_id,report_acc,report_site,report_subsidiary,report_customer,report_siteId;
      
        var fils ;
         fils = [
         
          ["custrecord_aio_sett_id", "is", "" + settle_id],
          "and",
          ["custrecord_aio_sett_tran_type", "isnot", "Refund"],
          "and",
          ["custrecord_settle_is_generate_voucher", "is", false],
          // "and",
          // ["custrecord_payment_itemprice_pt", "is", false], //不属于货价和税
          "and",
          ["custrecord_february_undeal", "isnot", "F"],  //post date不是2月份之前
          "and",
          ["custrecord_missingorder_settlement", "isnot", "F"],  //不是正常订单号
        ]
        if(JSON.stringify(orderid).indexOf("None") >-1){ //订单号为空
          orderid =""
          fils.push("and");
          fils.push( ["custrecord_aio_sett_order_id", "isempty", ""])
        }else{
          fils.push("and");
          fils.push( ["custrecord_aio_sett_order_id", "is",orderid])
        }
        var amount_all=0,settlement_idArrs=[],principals={};
        var postdate_obj = {}, check_post_date,m_postdate_obj={},adjObj = {},orderItemTax=[] ,adjusItemCode
        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id' },
            { name: 'custrecord_aio_sett_shipment_id' },
            { name: 'custrecord_aio_sett_tran_type' },
            { name: "custrecord_aio_sett_start_date" },
            { name: 'custrecord_aio_sett_end_date' },
            { name: 'custrecord_aio_sett_posted_date_time' },
            { name: 'custrecord_aio_sett_amount_type' },
            { name: 'custrecord_aio_sett_amount_desc' },
            { name: 'custrecord_aio_sett_amount' },
            { name: 'custrecord_aio_sett_order_id' },
            { name: 'custrecord_aio_sett_deposit_date' },
            { name: 'custrecord_aio_sett_marketplace_name' },
            { name: "custrecord_aio_origin_account", join: "custrecord_aio_sett_report_id" },
            // { name: "custrecord_aio_account" },
            { name: 'custrecord_aio_sett_currency' },
            { name: 'custrecord_aio_sett_order_item_code' },  //order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
            { name: 'custrecord_aio_sett_quantity_purchased' }, 
            // { name: 'custrecord_aio_sett_shipment_id' },   //shipment id 可以用于查找对应记有shipment id的发票 ()
          
          ]
        }).run().each(function (rec) {
          if (!currency)
          currency_txt = rec.getValue('custrecord_aio_sett_currency')
          // log.debug("00 計數：" + num++, settle_id)
          if (!endDate) {
            endDate = rec.getValue('custrecord_aio_sett_end_date')
            cl_date = interfun.getFormatedDate("", "", endDate) 
            
          }
          postDate = rec.getValue('custrecord_aio_sett_posted_date_time')
               //判断post date一份结算报告里面会有几个post date是，会出现一个在2月一个在3月，要求把它区分开了，分成两份
              
              //修改于2020/5/16  16：00
            item_code = rec.getValue('custrecord_aio_sett_order_item_code')
            if(JSON.stringify(item_codes).indexOf(item_code) == -1)
            item_codes.push(item_code)  //item_code 可能会在一份报告里面存着多个item_code
            var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');
            var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');
            var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');
            var amount = rec.getValue('custrecord_aio_sett_amount');
            if (amount.indexOf(',') != -1) {
              amount = amount.replace(',', '.');
            }

            // log.debug("amount：" + amount, Tranction_type + "," + Amount_type + "," + Amount_desc + " , " + fulfill_channel)

            if (!(Tranction_type == "Order" && Amount_type == "ItemPrice" &&  Amount_desc == "Principal")) {
              settlement_idArrs.push(rec.id)  //记录下报告内部ID
              var month,mok=false ,pos
                  pos =  interfun.getFormatedDate("", "", postDate)  
                 month = pos.Month  //拿到月
                for (var mo in m_postdate_obj) {
                  if(mo == month ){
                    if( m_postdate_obj[month] ==pos )
                     m_postdate_obj[month].push(pos)
                    settlement_idObj[settle_id+"-"+month].push(rec.id)
                    mok=true 
                    break
                  }
                }
                if(!mok){
                  postdate_arry=[] 
                  postdate_arry.push(pos)
                  m_postdate_obj[month] = postdate_arry
                  settlement_ids =[]
                  settlement_ids.push(rec.id)
                  settlement_idObj[settle_id+"-"+month] =settlement_ids  //存储的ID也要根据settlmentid+"-"+month 来分组
                } 

              // log.debug("在不是FBM的情况下，冲销不计货品价格和税",rec.getValue("custrecord_aio_sett_amount"))
              var havedSettlmentid = false, havedShipid = false
                amount_all +=  Math.round(parseFloat(amount) * 100) / 100;
                for (var key in settlmentID) {
                  if (key == settle_id+"-"+month) {
                    havedSettlmentid = true
                    for (var ke in  settlmentID[key]) {
                      if (ke == item_code) {
                        settlmentID[key][ke].push({
                          // "incomeaccount": incomeaccount,
                          "Tranction_type": Tranction_type,
                          "Amount_type": Amount_type,
                          "Amount_desc": Amount_desc,
                          "memo": "结 " + orderid,
                          "amount": -Math.round(parseFloat(amount) * 100) / 100,
                          "field": "debit",
                          "depositDate": depositDate
                        })
                        havedShipid = true
                        break
                      }
                    }
                    //如果shipment id 不同，settlmentId相同，增加新的shipment id
                    if (!havedShipid) {
                      //清空
                      shipmentid_Arrys = []
                      shipmentid_Arrys.push({
                        // "incomeaccount": incomeaccount,
                        "Tranction_type": Tranction_type,
                        "Amount_type": Amount_type,
                        "Amount_desc": Amount_desc,
                        "memo": "结 " + orderid,
                        "amount": -Math.round(parseFloat(amount) * 100) / 100,
                        "field": "debit",
                        "depositDate": depositDate
                      })
                      settlmentID[key][item_code] = shipmentid_Arrys
                    }
                    break
                  }
                }
                //settlmentId不相同，直接push
                if (!havedSettlmentid) {
                  shipmentid_Arrys = []
                  shipsID = {}
                  shipmentid_Arrys.push({
                    // "incomeaccount": incomeaccount,
                    "Tranction_type": Tranction_type,
                    "Amount_type": Amount_type,
                    "Amount_desc": Amount_desc,
                    "memo": "结 " + orderid,
                    "amount": - Math.round(parseFloat(amount) * 100) / 100,
                    "field": "debit",
                    "depositDate": depositDate
                  })
                  shipsID[item_code] = shipmentid_Arrys
                  settlmentID[settle_id+"-"+month] = shipsID
                }
            } else {
              log.debug()
              PT_Arrys.push(rec.id)
              principals[item_code+"."+rec.getValue('custrecord_aio_sett_quantity_purchased')] = amount; //放发票上
            }
          return true
        })
        log.debug("查看拿到的principals",principals)
        // PT_Arrys.map(function (pt) {
        //   record.submitFields({
        //     type: "customrecord_aio_amazon_settlement",
        //     id: pt,
        //     values: {
        //       custrecord_payment_itemprice_pt: true,
        //       custrecord_settle_is_generate_voucher: false,
        //     }
        //   })
        // })
        if (currency_txt)
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

          search.create({
            type:"customrecord_aio_account",
            filters:[
              {name:"internalidnumber",operator:"equalto",values:settlement_acc}
            ],columns:[
              {name:"custrecord_aio_seller_id"},
              {name:"custrecord_aio_subsidiary"},
              {name:"custrecord_aio_customer"},
              {name:"custrecord_aio_enabled_sites"},
              {name:"name"},
              {name:"custrecord_division"},  //object
            ]
          }).run().each(function(e){
            seller_id = e.getValue(e.columns[0])
            report_subsidiary = e.getValue(e.columns[1])
            report_customer = e.getValue(e.columns[2])
            report_site = e.getText(e.columns[3])
            report_siteId = e.getValue(e.columns[3])
            report_acc =settlement_acc
            acc_text = e.getValue(e.columns[4])
            dept = e.getValue(e.columns[5])
          })
          search_acc  = settlement_acc
          var so_obj = interfun.SearchSO(orderid,merchant_order_id,search_acc,cl_date.date,"order");
          
          so_id = so_obj.so_id;
          if (!so_id) {
              if(orderid){ //订单号存在
                if (orderid.length == 19  && orderid.split("-")[0].length ==3) {
                  //正常订单，但是找不到销售订单,取报告上面的信息
                  log.debug("正常订单，但是找不到销售订单")
                  return ;
                  subsidiary =report_subsidiary
                  entity = report_customer
                  pr_store = report_acc
                } else {
                  //如果订单号不是正常的亚马逊单号   3-7-7
                  //如果此订单号为非正常的订单号：06fb53d9-3e9d-4c69-b424-64ba8a4f43fe,把此订单号的结算报告记录都搜出了标记为 F
                  // var markt;
                  // var fils_ds=[
                  //   ["custrecord_aio_sett_id","is",""+settle_id],
                  //   "and",
                  //   ["custrecord_aio_sett_marketplace_name","contains","Amazon."]
                  // ]
                  // search.create({
                  //   type:"customrecord_aio_amazon_settlement",
                  //    filters:fils_ds,
                  //    columns:[{name:"custrecord_aio_sett_marketplace_name"}]
                  // }).run().each(function(e){
                  //    markt = e.getValue("custrecord_aio_sett_marketplace_name");
                  // })
                  // var acc_objs = interfun.GetstoreInEU(report_acc, markt, acc_text);
                  pr_store = report_acc
                  acc_text = acc_text
                  entity = report_customer
                  subsidiary = report_subsidiary
                }
              }else{ //订单号不存在
                pr_store = report_acc
                acc_text = acc_text
                entity = report_customer
                subsidiary = report_subsidiary
              }
           
          }else{
            pr_store = so_obj.acc;
            acc_text = so_obj.acc_text;
            entity = so_obj.entity;
            subsidiary = so_obj.subsidiary;
            fulfill_channel = so_obj.fulfill_channel;
            orderid = so_obj.otherrefnum;
            dept = so_obj.dept;
            if(so_obj.fulfill == "unfulfill"){
              //未发货先结算，创建客户存款
              //这种情况是未发货先结算          此订单状态是待履行且存在客户存款，并且金额是负数，判定为未发货先退款
              var cust_depo = record.create({type:"customerdeposit"})
              cust_depo.setValue({fieldId:"customer",value:entity})
              cust_depo.setValue({fieldId:"salesorder",value:so_id })
              cust_depo.setValue({fieldId:"department",value:dept })
              cust_depo.setValue({fieldId:"currency",value:currency})
              cust_depo.setText({fieldId:"trandate",text:cl_date.date})
              if (currency == JP_currency) amount_all = Math.round(amount_all)  //JP取整数
              else amount_all = Math.round(parseFloat(amount_all) * 100) / 100
              cust_depo.setText({fieldId:"payment",text:amount_all})
              var ss = cust_depo.save()
              log.debug("未发货先结算，创建客户存款成功",ss)
              settlement_idArrs.map(function(set_id){
                  record.submitFields({
                      type: "customrecord_aio_amazon_settlement",
                      id: set_id,
                      values: {
                          custrecord_settle_is_generate_voucher: true
                      }
                  })
              })
              return ;
            }
            if(so_obj.ord_status =="pendingFulfillment"){
              log.debug("如果是待履行，先return")
              return ;
            }
          }
         if(cl_date.Month == "7" )  return;
        log.audit("entity :" + entity + ",currency: " + currency, "orderid:" + orderid + "，店铺：" + pr_store)
        for (var key in settlmentID) {
          if(interfun.CheckJO(orderid,key,settlement_idObj[key],"结算",search_acc)){
            context.write({
              key: key.split("-")[0] + "." + orderid+"."+key.split("-")[1],  // 按settlment ID +orderid + post date 的月份分组
              value: { 
                "cl_date": cl_date,
                "subsidiary": subsidiary,
                "acc_text": acc_text, "orderid": orderid, "entity": entity, "so_id": so_id, "currency": currency, "fulfill_channel": fulfill_channel,
                // "ship_id_arrys": ship_id_arrys,
                "pr_store": pr_store,
                "shipment": settlmentID[key],  //向reduce 传递需要处理的费用
                "settlement_ids": settlement_ids,
                "postdate_arry": m_postdate_obj[key.split("-")[1]],
                // "rec_id": rec_id,
                "search_acc": search_acc,  //用于搜索的店铺
                "report_site": report_site,  //站点的名称
                "report_siteId": report_siteId,  //站点的名称
                "item_codes": item_codes,  //站点的名称
                "principals": principals , //principals ,货品金额s
                "dept": dept  //principals ,货品金额s
              }
            })
          }
        }
        log.debug("00000单次map耗时", new Date() - startT)
       } catch (e) {
        log.error("000000000000000000000000000000eerroor:" + orderid, e);
        err.push(e.message);
      }

      //创建missorder,
      if (err.length > 0) {
        var moId = createSOTRMissingOrder('payment', so_id, JSON.stringify(err), new Date(+new Date().getTime()+8*3600*1000), pr_store);
        log.debug("出现错误，已创建missingorder" + moId);
      } else {
        delMissingReportRec(MissingReportType, orderid, "冲销时，找不到结算报告", pr_store)
        delMissingReportRec("5", orderid, "冲销时，找不到预估凭证", pr_store)
        delMissingReportRec(MissingReportType, orderid, "冲销时，找不到销售订单", pr_store)
        makeresovle('payment', orderid, pr_store)
      }

    }

    function reduce(context) {
      log.debug(" reduce context", JSON.stringify(context))
      var v = context.values
      var key = context.key.split('.')[0]+"-"+context.key.split('.')[2]  //setllment ID + month
      //找到 shipment id 对应的发票，打上备注，计入款型记录
      v.map(function (obj) {
        //款型记录，备注：店铺名前两位+后两位+年月日
        try {
          var jo_2, jo1_id = []
          var DR = 0, CR = 0;   //冲销的借贷
          var funds = 0   //结算的金额total，计入资金凭证
          obj = JSON.parse(obj)
          // var deposit_date = obj.depositDate
          var cl_date = obj.cl_date
          var fulfill_channel = obj.fulfill_channel
          var settlement_ids = obj.settlement_ids
          var pr_store = obj.pr_store
          var so_id = obj.so_id
          var orderid = obj.orderid
          var currency = obj.currency
          var acc_text = obj.acc_text
          var entity = obj.entity
          var subsidiary = obj.subsidiary
          var search_acc = obj.search_acc
          var report_site = obj.report_site
          var report_siteId = obj.report_siteId
          var item_codes = obj.item_codes
          var principals = obj.principals
          var dept = obj.dept
        
          var depositDate, relative_finance = [];

          // ===========================================
          var shipments = obj.shipment
          //根据SETTLMENT ID 创建冲销凭证
          var startT = new Date().getTime();
          var jour = record.create({ type: 'journalentry', isDynamic: true })
          jour.setValue({ fieldId: 'memo', value: "结算" })
          jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
          jour.setValue({ fieldId: 'department', value: dept })
          jour.setValue({ fieldId: 'currency', value: currency })
          jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store })
          jour.setValue({ fieldId: 'custbody_jour_orderid', value: orderid })
          jour.setValue({ fieldId: 'custbody_curr_voucher', value: "结算凭证" })
          so_id ?
          jour.setValue({ fieldId: 'custbody_rel_salesorder', value: so_id }) : "";  //关联销售订单
          jour.setValue({ fieldId: 'custbody_amazon_settlementid', value: key })  //settlementid
          jour.setValue({ fieldId: 'custbody_jour_type', value: "orders" })  //记录凭证类型 orders / refunds
          log.debug("开始生产冲销日记账 ：" + key, orderid)

      
          
          var jo1_arrys = [], item_prices = 0;
          if(orderid){
            var fils_fee = [
              ["custbody_blot_s", "anyof", "@NONE@"], "and", ["taxline", "is", false], "and",
              ["custbody_jour_orderid", "is", orderid], "and",
              ["custbody_order_locaiton", "anyof", search_acc], "and",
              ["memomain", "is", "预估"]
            ]
            var fil = [];
            var len = obj.postdate_arry.length, l = 0
            log.debug("000000000000postdate_arry", obj.postdate_arry)
              item_codes.map(function (item_code) {   
                fil.push(["custbody_relative_finanace_report.custrecord_orderitemid", "is", item_code])   
                l++;
                if (l < len) {
                  fil.push("or");
                }
              })
              //   obj.postdate_arry.map(function (pos) {   
              //   fil.push(["trandate", "on", pos.date])   
              //   l++;
              //   if (l < len) {
              //     fil.push("or");
              //   }
              // })
              if (fil.length > 0) fils_fee.push("and");
              fils_fee.push(fil);
              log.debug("fils_fee", fils_fee)
            search.create({
              type: "journalentry",
              filters: fils_fee,
              columns: [
                { name: "debitfxamount" }, //借（外币
                { name: "creditfxamount" }, //贷(外币
                { name: "account" }, //科目
                { name: "custcol_item_or_tax" },
                { name: "custbody_relative_finanace_report" },
                { name: "memo" },
              ]
            }).run().each(function (jo) {
              // log.debug('查出的01类凭证' + jo.id, jo.getValue("custbody_relative_finanace_report"))
              if (JSON.stringify(jo1_id).indexOf(jo.id) == -1) {
                jo1_id.push(jo.id)
                //关联的财务报告组
                relative_finance.push(jo.getValue("custbody_relative_finanace_report"))
              }
              var acc_jour1 = jo.getValue('account')
              var dam = jo.getValue('debitfxamount')
              var cam = jo.getValue('creditfxamount')
              var meo = jo.getValue('memo')
                jo1_arrys.push({
                  account: acc_jour1,
                  memo: "冲回" + meo,
                  credit: dam,
                  debit: cam,
                })
              return true;
            })
          }
       
        

      
         //生成冲
          var jo1_arrys_len = jo1_arrys.length
          for (var i = 0; i < jo1_arrys_len; i++) {
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: jo1_arrys[i].account })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: jo1_arrys[i].memo })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity })

            if (jo1_arrys[i].credit) {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: jo1_arrys[i].credit }) //贷
            }
            else {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: jo1_arrys[i].debit }) //借
            }
            jour.commitLine({ sublistId: 'line' })
          }


          //生成  结
          for (var ke in shipments) {
            if(ke)
            shipments[ke].map(function (obj) {
              depositDate = obj.depositDate
              var x = Math.round(parseFloat(obj.amount) * 100) / 100;
              //log.debug('obj.amount',obj.amount);
              //log.debug('obj.amount to number',Number(obj.amount));
              var incc = interfun.GetSettlmentFee(obj.Amount_type, obj.Amount_desc, obj.Tranction_type,report_site.split(" ")[1],x,report_siteId,pr_store)
              if(incc.incomeaccount != '125'){
                jour.selectNewLine({ sublistId: 'line' })
              
                jour.setCurrentSublistValue({ 
                  sublistId: 'line',
                    fieldId: 'account', 
                      value:  incc.incomeaccount})
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: incc.L_memo })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'entity', value: entity})
                if (currency == JP_currency) x = Math.round(x)  //JP取整数
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: obj.field, value: x }) //借
                jour.commitLine({ sublistId: 'line' })

                jour.selectNewLine({ sublistId: 'line' })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_settle })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: incc.L_memo })
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: x }) //贷
                jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
                jour.commitLine({ sublistId: 'line' })
              } 
             
            })

          }
        
          log.debug("set Trandate cl_date:", cl_date.date)
          jour.setText({ fieldId: 'trandate', text: cl_date.date })
          jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: relative_finance })
          jour.setValue({ fieldId: 'custbody_amaozn_order_iemc', value: JSON.stringify(item_codes) }) //存储item code
          //  jour.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
          jo_2 = jour.save();
          log.debug("000冲销凭证耗时：", new Date().getTime() - startT)
          log.debug("000000000第二步 success:" + jo_2, cl_date.date)
         
             //查找相同的order item id 的发票进行核销记录
             var mo_day = cl_date.Day
             var mo_month = cl_date.Month
             var mo_Year = cl_date.Year
             if (mo_month.length == 1) mo_month = "0" + mo_month
             if (mo_day.length== 1) mo_day = "0" +mo_day
             var Time = mo_Year + mo_month +mo_day+""   //期
         
             log.debug(JSON.stringify(Time) + " Time================\n")
             //店铺名称前两位+后两位+年月日 + "-流水号"
             acc_text = acc_text.substring(0, 2) + acc_text.substring(acc_text.length - 2, acc_text.length)
             var T_memo = acc_text + Time + "-0"   //付款备注
             var orders = [];
             if(orderid){
              var fils_inv = [
                ["mainline","is",false],
                "and",
                ["taxline","is",false],
                "and",
                ["otherrefnum","equalto",orderid],
                "and",
                ["custbody_aio_account","anyof",search_acc]
              ],fls=[];
               var len_itco=item_codes.length,l_num=0
              item_codes.map(function (ic) {
                 if(ic)
                fls.push(
                  ["custbody_shipment_report_rel.custrecord_amazon_order_item_id","is",ic]
                )
                else
                fls.push(
                 ["custbody_shipment_report_rel.custrecord_amazon_order_item_id","isempty",""]
               )
                l_num++
                if(l_num <len_itco)
                fls.push("or")
              })
               if(len_itco>0)
               fils_inv.push("and")
               fils_inv.push(fls)
              log.debug("发票过滤器:",fils_inv)
               //搜索出所有item code 的发票
                search.create({
                  type: 'invoice',
                  filters:fils_inv,
                  columns:[
                    {name:"internalid",summary:"group"},
                    {name:"custrecord_amazon_order_item_id",join:"custbody_shipment_report_rel",summary:"group"},
                    {name:"quantity",summary:"SUM"},
                ]
                }).run().each(function (e) {
                  log.audit("查看发票:",e)
                  log.audit("principals",principals)
                  if(principals[e.getValue(e.columns[1])+"."+e.getValue(e.columns[2])]){
                    orders.push({
                      inv_id:e.getValue(e.columns[0]),
                      end_date:cl_date.date,
                      depAmaount:principals[e.getValue(e.columns[1])+"."+e.getValue(e.columns[2])]
                    })
                  }else{
                    createSOTRMissingOrder(3, orderid, "查出的发票找不到对应的放款金额", new Date(+new Date().getTime()+8*3600*1000), search_acc)
                    throw "查出的发票找不到对应的放款金额"+orderid
                  }
                  return true
                })
             }
            // /principals
                
               log.debug(" 待付款的发票:" + orders.length,orders)
                 //款型记录
               T_memo = interfun.CreatePaymentRec("orders", pr_store, entity, T_memo, Time,currency,cl_date.date,orders.length)
               log.debug("T_memo :"+T_memo)
               var memo_obj= {};
               //现将付款型号存在冲销日记账中，后排跑日程脚本来给发票标记备注
               memo_obj[T_memo]=orders 
               //设置关联字段
               interfun.relativaJE(jo1_id, jo_2, "", settlement_ids,memo_obj)  
              //  custbody_dp_expected_due_date
        
        } catch (e) {
          log.error("error :" + orderid + "，settlementid:" + key, e)

        }

      })
    }

    function summarize(summary) {
      log.audit("处理完成")
    }



    /**
     * 执行完成，删除已有的差异记录
     * @param {*} type 
     * @param {*} orderid 
     * @param {*} desc 
     * @param {*} acc 
     */
    function delMissingReportRec(type, orderid, desc, acc) {
      var rec
      var fils = []
      type ? fils.push({ name: 'custrecord_missing_report_type', operator: 'is', values: type }) : ""
      orderid ? fils.push({ name: 'custrecord_missing_report_orderid', operator: 'is', values: orderid }) : ""
      acc ? fils.push({ name: 'custrecord_missing_report_store', operator: 'is', values: acc }) : ""
      desc ? fils.push({ name: 'custrecord_missing_report_description', operator: 'is', values: desc }) : ""
      search.create({
        type: 'customrecord_missing_report',
        filters: fils
      }).run().each(function (rec) {
        var de = record.delete({ type: "customrecord_missing_report", id: rec.id })

      })
    }
    /**
        * makeresovle missingorder
        * @param {*} type 
        * @param {*} orderid 
        * @param {*} acc 
        */
    function makeresovle(type, orderid, acc) {
      var fils = []
      type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : ""
      orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : ""
      acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : ""
      search.create({
        type: 'customrecord_dps_transform_mo',
        filters: fils
      }).run().each(function (rec) {
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
        log.debug("make Resovle " + rec.id, type + " : " + orderid)
        return true
      })
    }
    /**
     * 生成凭证过程失败，删除已生成的凭证
     * @param {*} orderid 
     */
    function DetleteJO(orderid) {
      search.create({
        type: 'journalentry',
        filters: [
          { name: 'mainline', operator: 'is', values: true },
          { name: 'custbody_jour_orderid', operator: 'is', values: orderid },
        ], columns: [{ name: "memomain" }]
      }).run().each(function (e) {
        try {
          if (e.getValue("memomain") == "02" || e.getValue("memomain") == "03") {
            var de = record.delete({ type: 'journalentry', id: e.id })
            log.debug("删除成功  ", de)
          }
        } catch (e) {
          log.debug("delete error", e)
        }
        return true
      })
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
    function createSOTRMissingOrder(type, orderid, reason, date, acc) {
      var mo;
      var fils = []
      type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type }) : ""
      orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is', values: orderid }) : ""
      acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is', values: acc }) : ""
      var mo;
      search.create({
        type: 'customrecord_dps_transform_mo',
        filters: fils
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
      type ?
        mo.setValue({
          fieldId: 'custrecord_tr_missing_order_type',
          value: type
        }) : ""; //类型
      acc ?
        mo.setValue({
          fieldId: 'custrecord_tracking_missing_acoount',
          value: acc
        }) : "";
      orderid ?
        mo.setValue({
          fieldId: 'custrecord_missing_orderid_txt',
          value: orderid
        }) : "";
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


    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });