/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime','./Helper/interfunction.min'],
  function (search, record, moment, format, runtime,interfun) {
    const MissingReportType = 4 //Missing report 结算报告Settlement report - Order
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

    //查找已付款的发票，进行冲销
    function getInputData() {
      try {
        var limit = 100, orders = []
        var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_sotre' });
        var country = runtime.getCurrentScript().getParameter({ name: 'custscript_country_refund' });
        log.audit("选择的店铺:" + acc, "country:" + country)
        var fils = [
          // ["custrecord_aio_sett_order_id", "is", "114-1252019-0442666"],
          // "and",
          //["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]],
          // ["custrecord_aio_account", "anyof",  acc!="40"?[acc]:["40", "15", "16", "17", "18", "19"]],
          // "and",
          // ["custrecord_settlement_enddate", "ONORAFTER", "2020年2月2日"], //end date在2月2号之后，所有的
          // "and",
          ["custrecord_aio_sett_tran_type", "is", "Refund"],
          "and",
          ["custrecord_settle_is_generate_voucher", "is", false], //未生成凭证
          "and",
          ["custrecord_february_undeal", "isnot", "F"],  //post date不是2月份之前
          "and",
          ["custrecord_missingorder_settlement", "isnot", "F"],    //如果订单号不是正常的亚马逊单号   3-7-7
        ]
        //custrecord_aio_account字段是后面才加进来的，如果是通过API拉取的，要用custrecord_aio_sett_report_id.custrecord_aio_origin_account
        if(acc){ 
          fils.push("and")
          fils.push( ["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]])
        }
        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id', summary: "GROUP" },     //按 settlement id和单号分组
            { name: 'custrecord_aio_sett_order_id', summary: "GROUP" },
            { name: "custrecord_aio_sett_report_id", summary: "GROUP" }
          ]
        }).run().each(function (e) {
          orders.push({
            "settle_id": e.getValue(e.columns[0]) + "",
            "reportId":  e.getValue(e.columns[2]),
            "orderid": e.getValue(e.columns[1])
          })
          return --limit > 0
        })

      } catch (e) {
        log.error("get input :error", e)
      }
      log.audit("待冲销总数", orders.length)
      return orders;
    }
    function map(context) {
      var err = [];
      var so_id;
      try {
        log.debug("context.value：", context.value)
        var obj = JSON.parse(context.value)
        var orderid = obj.orderid
        var settlmentid = obj.settle_id
        var reportId = obj.reportId
        var entity, orderstatus, subsidiary, currency,settlement_idObj = {},settlement_ids=[], settlmentID = {}, shipsID = {},item_code
        var cl_date;  //冲销结算时间
        var endDate,postDate,depositDate,incomeaccount;
        //搜索销售订单获取客户
        var postdate_arry = []
        var postdate_obj = {} ,check_post_date,PT_Arrys=[] //记录下货价和税
        var currency_txt
        var Item_amount=0,m_postdate_obj={}

        var search_acc ,seller_id,report_acc,report_site,report_subsidiary,report_customer,report_siteId
        //拿到seller id
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
            report_subsidiary = e.getValue(e.columns[1])
            report_customer = e.getValue(e.columns[2])
            report_site = e.getText(e.columns[3])
            report_siteId = e.getValue(e.columns[3])
            report_acc = e.getValue(e.columns[4])
          })
          search_acc  = interfun.getSearchAccount(seller_id)
          log.debug("seller_id: "+seller_id,"search_acc "+search_acc)

        search.create({
          type: record.Type.RETURN_AUTHORIZATION,
          filters: [
            { name: 'poastext', operator: 'is', values: orderid },
            // { name: 'custbody_order_locaiton', operator: 'noneof', values: ["34","35"] }, //不用店铺过滤，难不成同一份settlementID下面会有两个单号相同的店铺？
            {name: "custrecord_aio_sett_id",join:"custbody_origin_settlement",operator: "is" , values:  settlmentid+""  },
            { name: 'mainline', operator: 'is', values: true }
          ],
          columns: [
            { name: 'entity' },
            { name: 'statusref' },
            { name: 'subsidiary' },
            { name: 'currency' },
            { name: 'custbody_order_locaiton' },
          ]
        }).run().each(function (rec) {
          so_id = rec.id;
          entity = rec.getValue('entity');
          orderstatus = rec.getValue('statusref');
          subsidiary = rec.getValue('subsidiary');
          // currency = rec.getValue('currency');
          pr_store = rec.getValue('custbody_order_locaiton');
          return false;
        });
        if (!so_id) {
          // if (false) {
          if (orderid.length == 19  &&orderid.split("-")[0].length ==3) {
            //正常订单，但是找不到销售订单
            log.debug("正常订单，但是找不到销售订单")
            // pr_store = 27  ;  //JPY
            // subsidiary = 85  ;//ETEKCITY Corporation (US)
            // entity = 811606 ; //JPY
            return
          } else {
               //如果此订单号为非正常的订单号：06fb53d9-3e9d-4c69-b424-64ba8a4f43fe,把此订单号的结算报告记录都搜出了标记为 F
          if (settlement_ids.length == 0)
          search.create({
            type: "customrecord_aio_amazon_settlement",
            filters: [
              { name: "custrecord_aio_sett_order_id", operator: 'is', values: orderid },
              { name: "custrecord_aio_sett_id", operator: 'is', values: settlmentid },
            ],
          }).run().each(function (rec) {
            settlement_ids.push(rec.id)
            return true
          })
            //如果订单号不是正常的亚马逊单号   3-7-7
            log.debug("settlement_ids:", settlement_ids)
            for (var index = 0; index < settlement_ids.length; index++) {
              record.submitFields({
                type: "customrecord_aio_amazon_settlement",
                id: settlement_ids[index],
                values: {
                  custrecord_missingorder_settlement: "F"   //非正常订单号，不处理
                }
              })
            }
            return;
          }
        }
        log.audit("orderstatus "+orderstatus+","+"entity: "+ entity,"orderid:"+orderid)
        //  delJour(orderid)
     
        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: [
            { name: "custrecord_aio_sett_order_id", operator: 'is', values: orderid },
            { name: "custrecord_aio_sett_id", operator: 'is', values:  settlmentid+""  },
            { name: "custrecord_settle_is_generate_voucher", operator: 'is', values: false },
            { name: "custrecord_aio_sett_tran_type", operator: 'is', values: "Refund" },
          ],
          columns: [
            { name: 'custrecord_aio_sett_tran_type' },
            { name: 'custrecord_aio_sett_amount_type' },
            { name: 'custrecord_aio_sett_amount_desc' },
            { name: 'custrecord_aio_sett_amount' },
            { name: 'custrecord_aio_sett_order_id' },
            { name: 'custrecord_aio_sett_posted_date_time' },
            { name: 'custrecord_aio_sett_end_date' },
            { name: 'custrecord_aio_sett_currency' },
            { name: "custrecord_aio_origin_account", join: "custrecord_aio_sett_report_id" },
            { name: 'custrecord_aio_sett_deposit_date' },
            { name: 'custrecord_aio_sett_order_item_code' },
            { name: 'custrecord_aio_sett_adjust_item_id' },// MERCHANT ADJUSTMENT ITEM ID
            { name: 'custrecord_aio_sett_start_date' },
          ]
        }).run().each(function (rec) {
            if (!currency)
            currency_txt = rec.getValue('custrecord_aio_sett_currency')
            if (!pr_store)
              pr_store = rec.getValue(rec.columns[8])
            if (!endDate) {
              endDate = rec.getValue('custrecord_aio_sett_end_date')
              cl_date = interfun.getFormatedDate("", "", endDate) 
              log.debug("cl_date：",cl_date)
            }
            postDate = rec.getValue('custrecord_aio_sett_posted_date_time')
            var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');
            var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');
            var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');
            var amount = rec.getValue('custrecord_aio_sett_amount');
            if (amount.indexOf(',') != -1) {
              amount = amount.replace(',', '.')
            }
          
            log.debug("check_post_date: " + check_post_date, "postDate: " + postDate + ", endDate: " + endDate)
              
               item_code = rec.getValue('custrecord_aio_sett_order_item_code') 
              //货品价格和税是收入，不计入冲销
              if ( !(Tranction_type == "Refund" && Amount_type == "ItemPrice" &&Amount_desc == "Principal" ) ) {
                     //Refund会出现两个Tax的情况，这时候要判断Tax大于0的记为费用
                     var month ,mok=false ,pos
                     //getFormatedDate(postDate, endDate, depositDate,startDate)
                     pos =  interfun.getFormatedDate("", "", postDate)  
                     month = pos.Month  //拿到月
                    for (var mo in m_postdate_obj) {
                      if(mo == month ){
                        m_postdate_obj[month].push(pos)
                        settlement_idObj[settlmentid+"-"+month].push(rec.id)
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
                      settlement_idObj[settlmentid+"-"+month] =settlement_ids  //存储的ID也要根据settlmentid+"-"+month 来分组
                    }
                
                 var sek = false, shk = false
                if (Number(amount) != 0) {
                  for (var key in settlmentID) {
                    log.debug("key:" + key, settlmentid)
                    if (key == settlmentid+"-"+month) {
                      sek = true
                      // var ships = settlmentID[settlmentid]
                      for (var ke in settlmentID[key]) {
                        if (ke == item_code) {
                          settlmentID[key][ke].push({
                            // "incomeaccount": incomeaccount,
                            "Tranction_type": Tranction_type,
                            "Amount_type": Amount_type,
                            "Amount_desc": Amount_desc,
                            "memo": "结 " + orderid+" 退",
                            "amount": Math.round(parseFloat(amount) * 100) / 100,
                            "field": "credit",
                            "depositDate": depositDate
                          })
                          shk = true
                          break
                        }
                      }
                      //如果shipment id 不同，settlmentId相同，增加新的shipment id
                      if (!shk) {
                        shipmentid_Arrys = []
                        shipmentid_Arrys.push({
                          // "incomeaccount": incomeaccount,
                          "Tranction_type": Tranction_type,
                          "Amount_type": Amount_type,
                          "Amount_desc": Amount_desc,
                          "memo": "结 " + orderid+" 退",
                          "amount": Math.round(parseFloat(amount) * 100) / 100,
                          "field": "credit",
                          "depositDate": depositDate
                        })
                        settlmentID[key][item_code]= shipmentid_Arrys
                      }
                      break
                    }
                  }
                  //settlmentId不相同，直接push
                  if (!sek) {
                    shipmentid_Arrys = []
                    shipsID = {}
                    shipmentid_Arrys.push({
                      // "incomeaccount": incomeaccount,
                      "Tranction_type": Tranction_type,
                      "Amount_type": Amount_type,
                      "Amount_desc": Amount_desc,
                      "memo": "结 " + orderid+" 退",
                      "amount": Math.round(parseFloat(amount) * 100) / 100,
                      "field": "credit",
                      "depositDate": depositDate
                    })
                    shipsID[item_code] = shipmentid_Arrys
                    settlmentID[settlmentid+"-"+month] = shipsID
                  }
                }
        
              } else {
                // log.debug("记录下不属于FBM的货品金额和税，下次不再搜索")
                PT_Arrys.push(rec.id)
              }
          return true
        })
         PT_Arrys.map(function (pt) {
          record.submitFields({
            type: "customrecord_aio_amazon_settlement",
            id: pt,
            values: {
              custrecord_payment_itemprice_pt: true,
              custrecord_settle_is_generate_voucher: false,
            }
          })
        })
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
          log.debug("Item_amount:"+Item_amount,"settlmentID:"+JSON.stringify(settlmentID))
          log.debug("settlement_idObj:",JSON.stringify(settlement_idObj))
          for (var key in settlmentID) {
            log.debug("key write:"+key)
            //检查日记账 re02 是否存在
            if(interfun.CheckJO(orderid,key,settlement_idObj[key],"re02")){
              context.write({
                key: key.split("-")[0] + "." + orderid+"."+key.split("-")[1],  //settl id + orderid+ month 为一组
                value: {
                  "cl_date": cl_date,
                  "subsidiary": subsidiary,
                  // "acc_text": acc_text, 
                  "orderid": orderid, "entity": entity, "so_id": so_id, "currency": currency,
                  "pr_store": pr_store,
                  "shipmentids": settlmentID[key],
                  "settlement_ids": settlement_idObj[key],
                  "postdate_arry":  m_postdate_obj[key.split("-")[1]],  //按月分组的post date
                  // "rec_id": rec_id,
                  "search_acc": search_acc,  //用于搜索的店铺
                  "report_site": report_site,  //站点的名称
                  "report_siteId": report_siteId,  //站点
                }
              })
            }
            
            
          }

         
        // credit_cr(orderid);pr_store
    
      } catch (e) {
        log.error("eerroor:", e);
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
      log.debug(" reduce context", JSON.stringify(context))
      try{
     
      var v = context.values
      var settlmentid = context.key.split('.')[0]+"-"+context.key.split('.')[2]  //setllment ID + month
      log.debug(" settlmentid :" + settlmentid, context.key)
      //找到 shipment id 对应的发票，打上备注，计入款型记录
      v.map(function (obj) {

        var jo_2, jo1_id = []
        var DR = 0, CR = 0;
        obj = JSON.parse(obj)
        var cl_date = obj.cl_date
        var settlement_ids = obj.settlement_ids
        var pr_store = obj.pr_store
        var orderid = obj.orderid
        var currency = obj.currency
        var entity = obj.entity
        var subsidiary = obj.subsidiary
        var search_acc = obj.search_acc
        var report_site = obj.report_site
        var report_siteId = obj.report_siteId

        var depositDate
        // ===========================================
        var item_codes=[]
        if(!cl_date) {   //如果取的是post date ，则默认取第一个
          cl_date =obj.postdate_arry[0].date
        }
        var shipmentids = obj.shipmentids
        var jour = record.create({ type: 'journalentry', isDynamic: true })
        jour.setValue({ fieldId: 'memo', value: "re02" })
        jour.setValue({ fieldId: 'custbody_jour_type', value: "refunds" })
        jour.setValue({ fieldId: 'custbody_jour_orderid', value: orderid })
        jour.setValue({ fieldId: 'custbody_curr_voucher', value: "退款冲减凭证" })
        log.debug("orderid:"+orderid,"settlmentid:"+ settlmentid+"" )
        jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
        jour.setValue({ fieldId: 'custbody_order_locaiton', value: pr_store })
        jour.setValue({ fieldId: 'currency', value: currency })
       
        var relative_finance = [],jo_2, jo1_id;
          var fils_fee = [
            ["custbody_blot_s", "anyof", "@NONE@"], "and",
             ["taxline", "is", false], "and",
            ["custbody_jour_orderid", "is", orderid], "and",
            ["custbody_order_locaiton", "anyof",search_acc], "and",
            ["memomain", "is", "re01"]
          ]
          var fil = []
          // var len =  item_codes.length, l = 0
          var len =  obj.postdate_arry.length, l = 0
          // if(pr_store != 27){
          // item_codes.map(function (pos) {
            obj.postdate_arry.map(function (pos) {
            // fil.push(["custbody_relative_finanace_report.custrecord_orderitemid", "is", pos])
            fil.push(["trandate", "on", pos.date])
            l++
            if (l < len) {
              fil.push("or");
            }
          })
          if (fil.length > 0) fils_fee.push("and");
          fils_fee.push(fil)
          log.debug("fils_fee", fils_fee)
        // }
          var jo1_arrys = [],jo1_id=[],relative_finance=[]
          search.create({
            type: "journalentry",
            filters: fils_fee,
            columns: [
              { name: "debitfxamount" }, //借（外币
              { name: "creditfxamount" }, //贷(外币
              { name: "account" }, //科目
              { name: "custbody_relative_finanace_report" }
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
            log.debug("account:" + acc_jour1, dam)
              jo1_arrys.push({
                account: acc_jour1,
                memo: "冲 " + orderid + " 退",
                credit: dam,
                debit: cam,
              })
            return true;
          })   
          log.debug("jo1_arrys：",jo1_arrys)  
             //生成冲
          var jo1_arrys_len = jo1_arrys.length
          for (var i = 0; i < jo1_arrys_len; i++) {
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: jo1_arrys[i].account })
            // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: jo1_arrys[i].memo })

            if (jo1_arrys[i].credit) {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: jo1_arrys[i].credit }) //贷
            }
            else {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: jo1_arrys[i].debit }) //借
            }
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "冲回" })
            jour.commitLine({ sublistId: 'line' })
          }
          //生成  结
          for (var ke in shipmentids) {
            log.debug("ke:"+ke,shipmentids[ke])
            item_codes.push(ke)
            shipmentids[ke].map(function (obj) {
            depositDate = obj.depositDate
            var x = Math.round(parseFloat(obj.amount) * 100) / 100;
            if(currency == JP_currency)   x =Math.round(x) 
            var incc = interfun.GetSettlmentFee(obj.Amount_type, obj.Amount_desc, obj.Tranction_type,report_site.split(" ")[1],x,report_siteId,pr_store)
          if(incc){
            DR += x
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: incc })
            // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value:  obj.memo })
            //日本店铺的币种不能有小数
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId:  obj.field, value: x})//credit 贷
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "冲回" })
            jour.commitLine({ sublistId: 'line' })
            }
          })
          }
        
          log.debug("total:DR-CR", DR )
          // if(CR == 0) {  //如果找不到预估，就按订单号去拉去财务报告，待预估报告生成
          //   interfunction.getFinanceReport(pr_store,orderid,"refunds")
          //   return
          // }
          var s = DR
          log.debug("差额:", s.toFixed(2))
          //  122 	应收账款-集团外公司  1341 主营业务收入-集团外公司
          if (Number(s.toFixed(2)) !=0) {
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_settle })
            // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "结 "+orderid+" 退" })
            log.debug("借:", s.toFixed(2))
            if(currency == 6)   s =Math.round(s) 
            else  s =Math.round(parseFloat(s) * 100) / 100
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value:s }) //借
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "冲回" })
            jour.commitLine({ sublistId: 'line' })
          }
          jour.setValue({ fieldId: 'custbody_amazon_settlementid', value:  settlmentid+""  })
          if(relative_finance.length>0)
          jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: relative_finance })
          log.audit("trandate:", cl_date)
          jour.setText({ fieldId: 'trandate', text:cl_date.date })
           jo_2 = jour.save();
          log.audit("第二步 success:" + jo_2, cl_date.date)
         
          log.audit("settlement_ids:", settlement_ids)
          log.debug("jo1_id：" + typeof (jo1_id), JSON.stringify(jo1_id))
          log.debug("settlement_ids" + typeof (settlement_ids), JSON.stringify(settlement_ids))
          interfun.relativaJE(jo1_id, jo_2, "", settlement_ids,"")
      
      })
    }catch(e){
         log.debug("redunce e",e)
    }
    }

    function summarize(summary) {
      log.debug("处理完成,summary：",JSON.stringify(summary));
    }

    function delJour(ordid) {
      search.create({
        type: 'journalentry',
        filters: [
          { name: 'mainline', operator: 'is', values: true },
          { name: 'custbody_jour_orderid', operator: 'is', values: ordid },
        ], columns: [{ name: "memomain" }]
      }).run().each(function (e) {
        try {
          if (e.getValue("memomain") == "re02" || e.getValue("memomain") == "re03") {
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
   /**
     * 格式化时间，时区转为美国
     * 判断是否为2020.02.01 08:00:00 UTC之后才处理
     * @param {*} dateStr
     */
    
    function getFormatedDate(postDate, endDate, depositDate,startDate) {
      var o_date = moment.utc("2020/02/01 08:00:00").toDate()   //UTC 2020年2月1日 8点，美国0点
      var rs
      if (!depositDate) {
        var post_strs = postDate.substring(0, 10)
        var end_strs = endDate.substring(0, 10)
        var start_strs = startDate.substring(0, 10)
        var end_len = end_strs.split(".")[0].length
        if (end_len < 4) {
          endDate = end_strs.split(".")[2] + "/" + end_strs.split(".")[1] + "/" + end_strs.split(".")[0] + " " + endDate.substring(11, 19)
          postDate = post_strs.split(".")[2] + "/" + post_strs.split(".")[1] + "/" + post_strs.split(".")[0] + " " + postDate.substring(11, 19)
          startDate = start_strs.split(".")[2] + "/" + start_strs.split(".")[1] + "/" + start_strs.split(".")[0] + " " + startDate.substring(11, 19)
        } else {
          if(endDate.indexOf("UTC")>-1)
          endDate = endDate.substring(0, 19)
          if(postDate.indexOf("UTC")>-1)
          postDate = postDate.substring(0, 19)
          if(startDate.indexOf("UTC")>-1)
          startDate = startDate.substring(0, 19)
        }
    
        var ender_date  = moment.utc(endDate).toDate()
        var poster_date  = moment.utc(postDate).toDate()
        var starter_date  = moment.utc(startDate).toDate()
        log.debug("date_post:"+poster_date,"moment（date_post）："+ender_date)
        if(o_date > poster_date){
          //判断posted date是否在2020年2月1日 UTC8点之后才处理
           return "2"
        }
        ender_date = format.format({
          value: ender_date,
          type: format.Type.DATE,
          timezone: format.Timezone.AMERICA_LOS_ANGELES  //统一转为美国时间 endDate
        });
        poster_date = format.format({
          value:poster_date,
          type: format.Type.DATE,
          timezone: format.Timezone.AMERICA_LOS_ANGELES  //统一转为美国时间 postDate
        });
        starter_date = format.format({
          value:starter_date,
          type: format.Type.DATE,
          timezone: format.Timezone.AMERICA_LOS_ANGELES  //统一转为美国时间 postDate
        });
        var Day = ender_date.split(/[\u4e00-\u9fa5]/g)[2] 
        var month = ender_date.split(/[\u4e00-\u9fa5]/g)[1] 
        if (Day >3 && month > starter_date.split(/[\u4e00-\u9fa5]/g)[1]) {  //跨越且大于等于3日取endDate,放当月
          rs = {
            "ps":"end",
            "date":ender_date
          }
        } else {  /**  
                   取 post Date,放当月  
                 */
                log.debug("  取 post Date,放当月")
                rs = {
                  "ps":"post",
                  "date":poster_date
                }
        }
      } else {
        //收款时间 depositDate
        var deposit_strs = depositDate.substring(0, 10)
        var deposit_len = deposit_strs.split(".")[0].length
        if (deposit_len < 4) {
          depositDate = deposit_strs.split(".")[2] + "/" + deposit_strs.split(".")[1] + "/" + deposit_strs.split(".")[0] + " " + depositDate.substring(11, 19)
        } else {
          if(depositDate.indexOf("UTC")>-1)
          depositDate = depositDate.substring(0, 19)
        }
        rs = {
          "ps":"deposit",
          "date":format.format({
            value: moment.utc(depositDate).toDate(),
            type: format.Type.DATE,
            timezone: format.Timezone.AMERICA_LOS_ANGELES  //统一转为美国时间 depositDate
          })
        }
      }
      return  rs
    }
    function credit_cr(orderid) {
      search.create({
        type: record.Type.CREDIT_MEMO,
        filters: [
          { name: 'mainline', operator: 'is', values: true },
          { name: 'status', operator: 'is', values: "CustCred:A" },
          { name: 'custbody_aio_marketplaceid', operator: 'is', values: 1 },
          { name: "otherrefnum", operator: "equalto", values: orderid },
          { name: 'custbody_journal_voucher_checkedbox', operator: 'is', values: false },

        ], columns: [{ name: "internalid", sort: 'DESC' }]
      }).run().each(function (e) {
        var cache_id = e.id;
        var cre = record.load({
          type: record.Type.CREDIT_MEMO,
          id: cache_id
        });
        if (cre) {
          log.debug("找到了cr", cache_id)
          var depositdate, settleid
          var ref = record.create({
            type: "customerrefund",
            isDynamic: true
          })
          ref.setValue({
            fieldId: "customer",
            value: cre.getValue("entity")
          })
          var acc = cre.getValue('custbody_order_locaiton'), account;
          var currency = cre.getValue('currency')
          log.debug("acc:", acc)
          log.debug("cache_id:", cache_id)
          search.create({
            type: 'customrecord_aio_account',
            filters: [{ name: 'internalid', operator: 'is', values: acc }],
            columns: [{ name: 'custrecord_customer_payment_account' }]
          }).run().each(function (e) {
            account = e.getValue(e.columns[0])
          })
          // account = 125
          log.debug("account客户付款科目", account)
          // ref.setValue({ fieldId: 'account', value: cre.getValue('account') });
          // ref.setValue({ fieldId: 'aracct', value: account });
          ref.setValue({ fieldId: 'currency', value: currency });
          ref.setValue({
            fieldId: "paymentmethod",
            value: 8
          })
          log.debug("currency:", ref.getValue('currency'))
          log.debug("depositdate", depositdate)
          depositdate = depositdate.substring(0, depositdate.length - 4)
          log.debug("depositdate", depositdate)

          ref.setValue({
            fieldId: 'trandate',
            value: moment.utc(getFormatedDate(depositdate)).toDate()
          });
          for (var i = 0; i < ref.getLineCount({
            sublistId: "apply"
          }); i++) {
            ref.selectLine({
              sublistId: 'apply',
              line: i
            })
            var internalid = ref.getCurrentSublistValue({
              sublistId: 'apply',
              fieldId: 'internalid'
            })
            // log.debug("internalid:", internalid+":"+cache_id)
            if (internalid == cache_id) {
              ref.setCurrentSublistValue({
                sublistId: 'apply',
                fieldId: 'apply',
                value: true
              })
              break
            }
          }
          log.debug('legth', ref.getLineCount({
            sublistId: "apply"
          }))
          var lineWithCreditmemo = ref.findSublistLineWithValue('apply', 'internalid', cache_id);
          log.debug('lineWithCreditmemo', lineWithCreditmemo)

          var total = ref.getValue("total")
          var subsidiary = ref.getValue("subsidiary")
          var acc_ref = ref.getValue("account")
          var save_id = ref.save({
            ignoreMandatoryFields: true
          });
          log.audit("客户退款成功:" + total, save_id)
          resetBackJo(orderid, save_id)  //反写jour
          record.submitFields({
            type: record.Type.CREDIT_MEMO,
            id: cache_id,
            values: {
              custbody_journal_voucher_checkedbox: true
            }
          })
          //生成退款单之后，将费用计入对应的银行账户
        } else {
          log.debug("找不到cr", orderid)
        }
        return true
      })


    }

    function resetBackJo(orderid, save_id) {
      search.create({
        type: "journalentry",
        filters: [{
          name: 'mainline',
          operator: 'is',
          values: true
        },
        {
          name: 'custbody_jour_orderid',
          operator: 'is',
          values: orderid
        },
        {
          name: 'custbody_curr_voucher',
          operator: 'is',
          values: "退款预估凭证"
        },
        ]
      }).run().each(function (e) {
        record.submitFields({
          type: "journalentry",
          id: e.id,
          values: {
            custbody_payment: save_id,
          }
        })
      })
      search.create({
        type: "journalentry",
        filters: [{
          name: 'mainline',
          operator: 'is',
          values: true
        },
        {
          name: 'custbody_jour_orderid',
          operator: 'is',
          values: orderid
        },
        {
          name: 'custbody_curr_voucher',
          operator: 'is',
          values: "退款冲减凭证"
        },
        ]
      }).run().each(function (e) {
        record.submitFields({
          type: "journalentry",
          id: e.id,
          values: {
            custbody_payment: save_id,
          }
        })
      })
      search.create({
        type: "journalentry",
        filters: [{
          name: 'mainline',
          operator: 'is',
          values: true
        },
        {
          name: 'custbody_jour_orderid',
          operator: 'is',
          values: orderid
        },
        {
          name: 'custbody_curr_voucher',
          operator: 'is',
          values: "退款凭证"
        },
        ]
      }).run().each(function (e) {
        record.submitFields({
          type: "journalentry",
          id: e.id,
          values: {
            custbody_payment: save_id,
          }
        })
      })
    }
    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });