/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min', 'N/format', 'N/runtime','./Helper/interfunction.min'],
  function (search, record, moment, format, runtime,interfun) {
    const MissingReportType = 4 //Missing report ���㱨��Settlement report - Order
    const dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    const date = format.parse({
      value: (moment(new Date().getTime()).format(dateFormat)),
      type: format.Type.DATE
    });
    const JP_currency = 8
    const income_fin=363    //Ӧ���˿�-�ݹ�	 1122.05	
    const income_settle=361    //Ӧ���˿�-������  1122.03
    const Fincome_Plat=412	    //Ԥ���˿�-ƽ̨	 2203.03 
    const Amazon_Plat=622	    //Ӧ���˿�-ƽ̨ Amazon	 1122.04.01
    const income_Refund=471    //��Ӫҵ������-�˿�	 6001.06
    const paymentmethod=7  //���д��
    const AR_settle=125    //  AR-������  1099

    //�����Ѹ���ķ�Ʊ�����г���
    function getInputData() {
      try {
        var limit = 100, orders = []
        var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_sotre' });
        var country = runtime.getCurrentScript().getParameter({ name: 'custscript_country_refund' });
        log.audit("ѡ��ĵ���:" + acc, "country:" + country)
        var fils = [
          // ["custrecord_aio_sett_order_id", "is", "114-1252019-0442666"],
          // "and",
          //["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]],
          // ["custrecord_aio_account", "anyof",  acc!="40"?[acc]:["40", "15", "16", "17", "18", "19"]],
          // "and",
          // ["custrecord_settlement_enddate", "ONORAFTER", "2020��2��2��"], //end date��2��2��֮�����е�
          // "and",
          ["custrecord_aio_sett_tran_type", "is", "Refund"],
          "and",
          ["custrecord_settle_is_generate_voucher", "is", false], //δ����ƾ֤
          "and",
          ["custrecord_february_undeal", "isnot", "F"],  //post date����2�·�֮ǰ
          "and",
          ["custrecord_missingorder_settlement", "isnot", "F"],    //��������Ų�������������ѷ����   3-7-7
        ]
        //custrecord_aio_account�ֶ��Ǻ���żӽ����ģ������ͨ��API��ȡ�ģ�Ҫ��custrecord_aio_sett_report_id.custrecord_aio_origin_account
        if(acc){ 
          fils.push("and")
          fils.push( ["custrecord_aio_sett_report_id.custrecord_aio_origin_account", "anyof", [acc]])
        }
        search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id', summary: "GROUP" },     //�� settlement id�͵��ŷ���
            { name: 'custrecord_aio_sett_order_id', summary: "GROUP" },
            { name: "custrecord_aio_sett_report_id", summary: "GROUP" },
            { name: "custrecord_aio_sett_merchant_order_id", summary: "GROUP" }
          ]
        }).run().each(function (e) {
          orders.push({
            "settle_id": e.getValue(e.columns[0]) + "",
            "reportId":  e.getValue(e.columns[2]),
            "merchant_order_id":  e.getValue(e.columns[3]),
            "orderid": e.getValue(e.columns[1])
          })
          return --limit > 0
        })

      } catch (e) {
        log.error("get input :error", e)
      }
      log.audit("����������", orders.length)
      return orders;
    }
    function map(context) {
      var err = [];
      var so_id;
      try {
        log.debug("context.value��", context.value)
        var obj = JSON.parse(context.value)
        var orderid = obj.orderid
        var settlmentid = obj.settle_id
        var reportId = obj.reportId
        var merchant_order_id = obj.merchant_order_id
        var entity, orderstatus, subsidiary, currency,settlement_idObj = {},settlement_ids=[], settlmentID = {}, shipsID = {},item_code
        var cl_date;  //��������ʱ��
        var endDate,postDate,depositDate,incomeaccount;
        //�������۶�����ȡ�ͻ�
        var postdate_arry = []
        var postdate_obj = {} ,check_post_date,PT_Arrys=[] //��¼�»��ۺ�˰
        var currency_txt
        var Item_amount=0,m_postdate_obj={},settlement_idArrs=[]

        var search_acc ,seller_id,report_acc,report_site,report_subsidiary,report_customer,report_siteId
        //�õ�seller id
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
            // { name: 'custbody_order_locaiton', operator: 'noneof', values: ["34","35"] }, //���õ��̹��ˣ��Ѳ���ͬһ��settlementID�����������������ͬ�ĵ��̣�
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
            //���������������Ҳ������۶���
            log.debug("���������������Ҳ������۶���")
            // pr_store = 27  ;  //JPY
            // subsidiary = 85  ;//ETEKCITY Corporation (US)
            // entity = 811606 ; //JPY
            return
          } else {
               //����˶�����Ϊ�������Ķ����ţ�06fb53d9-3e9d-4c69-b424-64ba8a4f43fe,�Ѵ˶����ŵĽ��㱨���¼���ѳ��˱��Ϊ F
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
            //��������Ų�������������ѷ����   3-7-7
            log.debug("settlement_ids:", settlement_ids)
            for (var index = 0; index < settlement_ids.length; index++) {
              record.submitFields({
                type: "customrecord_aio_amazon_settlement",
                id: settlement_ids[index],
                values: {
                  custrecord_missingorder_settlement: "F"   //�����������ţ�������
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
              log.debug("cl_date��",cl_date)
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
              //��Ʒ�۸��˰�����룬���������
              if ( !(Tranction_type == "Refund" && Amount_type == "ItemPrice" &&Amount_desc == "Principal" ) ) {
                settlement_idArrs.push(rec.id)
                     //Refund���������Tax���������ʱ��Ҫ�ж�Tax����0�ļ�Ϊ����
                     var month ,mok=false ,pos
                     //getFormatedDate(postDate, endDate, depositDate,startDate)
                     pos =  interfun.getFormatedDate("", "", postDate)  
                     month = pos.Month  //�õ���
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
                      settlement_idObj[settlmentid+"-"+month] =settlement_ids  //�洢��IDҲҪ����settlmentid+"-"+month ������
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
                            "memo": "�� " + orderid+" ��",
                            "amount": Math.round(parseFloat(amount) * 100) / 100,
                            "field": "credit",
                            "depositDate": depositDate
                          })
                          shk = true
                          break
                        }
                      }
                      //���shipment id ��ͬ��settlmentId��ͬ�������µ�shipment id
                      if (!shk) {
                        shipmentid_Arrys = []
                        shipmentid_Arrys.push({
                          // "incomeaccount": incomeaccount,
                          "Tranction_type": Tranction_type,
                          "Amount_type": Amount_type,
                          "Amount_desc": Amount_desc,
                          "memo": "�� " + orderid+" ��",
                          "amount": Math.round(parseFloat(amount) * 100) / 100,
                          "field": "credit",
                          "depositDate": depositDate
                        })
                        settlmentID[key][item_code]= shipmentid_Arrys
                      }
                      break
                    }
                  }
                  //settlmentId����ͬ��ֱ��push
                  if (!sek) {
                    shipmentid_Arrys = []
                    shipsID = {}
                    shipmentid_Arrys.push({
                      // "incomeaccount": incomeaccount,
                      "Tranction_type": Tranction_type,
                      "Amount_type": Amount_type,
                      "Amount_desc": Amount_desc,
                      "memo": "�� " + orderid+" ��",
                      "amount": Math.round(parseFloat(amount) * 100) / 100,
                      "field": "credit",
                      "depositDate": depositDate
                    })
                    shipsID[item_code] = shipmentid_Arrys
                    settlmentID[settlmentid+"-"+month] = shipsID
                  }
                }
        
              } else {
                // log.debug("��¼�²�����FBM�Ļ�Ʒ����˰���´β�������")
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
          //���״̬�Ǵ����У��Ҵ��ڿͻ����
          var so_obj = interfun.SearchSO(orderid,merchant_order_id,search_acc,cl_date.date)

          if(so_obj.fulfill ="isrefund"){
                    //�����ͻ��˿δ�������˿�����
                    var sdk = record.create({type:"customerrefund",isDynamic:true})
                    sdk.setValue({fieldId:"customer",value:so_obj.entity})
                    sdk.setValue({fieldId:"paymentmethod",value:paymentmethod})  //����
                    sdk.setValue({fieldId:"account",value:AR_settle})  //��Ŀ
                    sdk.setValue({fieldId:"aracct",value:Amazon_Plat})  //Ӧ�տ���ͻ�
                    sdk.setValue({fieldId:"currency",value:currency})  
                    sdk.setText({fieldId:"trandate",text:cl_date.date})  
                    var len  = sdk.getLineCount({sublistId:"deposit"})
                    log.debug("len:"+len)
                    for(var i =0;i<len;i++){
                      sdk.selectLine({sublistId:"deposit",line:i})
                      if(sdk.getCurrentSublistValue({sublistId:"deposit",fieldId:"doc"}) == so_obj.cust_depo)
                      sdk.setCurrentSublistValue({sublistId:"deposit",fieldId:"apply",value:true})
                      break
                    }
                    var ss = sdk.save()
                    log.debug("δ�����Ƚ��㣬�����ͻ����ɹ�",ss)
                    settlement_idArrs.map(function(set_id){
                        record.submitFields({
                            type: "customrecord_aio_amazon_settlement",
                            id: set_id,
                            values: {
                                custrecord_settle_is_generate_voucher: true
                            }
                        })
                    })
                    return 
          }
          log.debug("Item_amount:"+Item_amount,"settlmentID:"+JSON.stringify(settlmentID))
          log.debug("settlement_idObj:",JSON.stringify(settlement_idObj))
          for (var key in settlmentID) {
            log.debug("key write:"+key)
            //����ռ��� re02 �Ƿ����
            if(interfun.CheckJO(orderid,key,settlement_idObj[key],"re02")){
              context.write({
                key: key.split("-")[0] + "." + orderid+"."+key.split("-")[1],  //settl id + orderid+ month Ϊһ��
                value: {
                  "cl_date": cl_date,
                  "subsidiary": subsidiary,
                  // "acc_text": acc_text, 
                  "orderid": orderid, "entity": entity, "so_id": so_id, "currency": currency,
                  "pr_store": pr_store,
                  "shipmentids": settlmentID[key],
                  "settlement_ids": settlement_idObj[key],
                  "postdate_arry":  m_postdate_obj[key.split("-")[1]],  //���·����post date
                  // "rec_id": rec_id,
                  "search_acc": search_acc,  //���������ĵ���
                  "report_site": report_site,  //վ�������
                  "report_siteId": report_siteId,  //վ��
                }
              })
            }
            
            
          }

         
        // credit_cr(orderid);pr_store
    
      } catch (e) {
        log.error("eerroor:", e);
        err.push(e.message);
      }

      //����missorder
      if (err.length > 0) {

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var date = format.parse({
          value: (moment(new Date().getTime()).format(dateFormat)),
          type: format.Type.DATE
        });;

        var moId = createSOTRMissingOrder('returnjour', so_id, JSON.stringify(err), date);
        log.debug("���ִ����Ѵ���missingorder" + moId);
      }
    }
    
    function reduce(context) {
      log.debug(" reduce context", JSON.stringify(context))
      try{
     
      var v = context.values
      var settlmentid = context.key.split('.')[0]+"-"+context.key.split('.')[2]  //setllment ID + month
      log.debug(" settlmentid :" + settlmentid, context.key)
      //�ҵ� shipment id ��Ӧ�ķ�Ʊ�����ϱ�ע��������ͼ�¼
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
        if(!cl_date) {   //���ȡ����post date ����Ĭ��ȡ��һ��
          cl_date =obj.postdate_arry[0].date
        }
        var shipmentids = obj.shipmentids
        var jour = record.create({ type: 'journalentry', isDynamic: true })
        jour.setValue({ fieldId: 'memo', value: "re02" })
        jour.setValue({ fieldId: 'custbody_jour_type', value: "refunds" })
        jour.setValue({ fieldId: 'custbody_jour_orderid', value: orderid })
        jour.setValue({ fieldId: 'custbody_curr_voucher', value: "�˿���ƾ֤" })
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
              { name: "debitfxamount" }, //�裨���
              { name: "creditfxamount" }, //��(���
              { name: "account" }, //��Ŀ
              { name: "custbody_relative_finanace_report" }
            ]
          }).run().each(function (jo) {
            // log.debug('�����01��ƾ֤' + jo.id, jo.getValue("custbody_relative_finanace_report"))
            if (JSON.stringify(jo1_id).indexOf(jo.id) == -1) {
              jo1_id.push(jo.id)
              //�����Ĳ��񱨸���
              relative_finance.push(jo.getValue("custbody_relative_finanace_report"))
            }
            var acc_jour1 = jo.getValue('account')
            var dam = jo.getValue('debitfxamount')
            var cam = jo.getValue('creditfxamount')
            log.debug("account:" + acc_jour1, dam)
              jo1_arrys.push({
                account: acc_jour1,
                memo: "�� " + orderid + " ��",
                credit: dam,
                debit: cam,
              })
            return true;
          })   
          log.debug("jo1_arrys��",jo1_arrys)  
             //���ɳ�
          var jo1_arrys_len = jo1_arrys.length
          for (var i = 0; i < jo1_arrys_len; i++) {
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: jo1_arrys[i].account })
            // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: jo1_arrys[i].memo })

            if (jo1_arrys[i].credit) {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: jo1_arrys[i].credit }) //��
            }
            else {
              jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: jo1_arrys[i].debit }) //��
            }
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "���" })
            jour.commitLine({ sublistId: 'line' })
          }
          //����  ��
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
            //�ձ����̵ı��ֲ�����С��
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId:  obj.field, value: x})//credit ��
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "���" })
            jour.commitLine({ sublistId: 'line' })
            }
          })
          }
        
          log.debug("total:DR-CR", DR )
          // if(CR == 0) {  //����Ҳ���Ԥ�����Ͱ�������ȥ��ȥ���񱨸棬��Ԥ����������
          //   interfunction.getFinanceReport(pr_store,orderid,"refunds")
          //   return
          // }
          var s = DR
          log.debug("���:", s.toFixed(2))
          //  122 	Ӧ���˿�-�����⹫˾  1341 ��Ӫҵ������-�����⹫˾
          if (Number(s.toFixed(2)) !=0) {
            jour.selectNewLine({ sublistId: 'line' })
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: income_settle })
            // jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "�� "+orderid+" ��" })
            log.debug("��:", s.toFixed(2))
            if(currency == 6)   s =Math.round(s) 
            else  s =Math.round(parseFloat(s) * 100) / 100
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value:s }) //��
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //�ͻ�
            jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "���" })
            jour.commitLine({ sublistId: 'line' })
          }
          jour.setValue({ fieldId: 'custbody_amazon_settlementid', value:  settlmentid+""  })
          if(relative_finance.length>0)
          jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: relative_finance })
          log.audit("trandate:", cl_date)
          jour.setText({ fieldId: 'trandate', text:cl_date.date })
           jo_2 = jour.save();
          log.audit("�ڶ��� success:" + jo_2, cl_date.date)
         
          log.audit("settlement_ids:", settlement_ids)
          log.debug("jo1_id��" + typeof (jo1_id), JSON.stringify(jo1_id))
          log.debug("settlement_ids" + typeof (settlement_ids), JSON.stringify(settlement_ids))
          interfun.relativaJE(jo1_id, jo_2, "", settlement_ids,"")
      
      })
    }catch(e){
         log.debug("redunce e",e)
    }
    }

    function summarize(summary) {
      log.debug("�������,summary��",JSON.stringify(summary));
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
            log.debug("ɾ���ɹ�  ", de)
          }
        } catch (e) {
          log.debug("delete error", e)
        }
        return true
      })
    }

    /**
      * ���ɵ���ʧ�ܼ�¼
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
      }); //����

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
    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });