/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search','N/record','./Helper/Moment.min','N/format','N/runtime'],
  function(search,record,moment,format,runtime) {
    //查找已付款的发票，进行冲销
    function getInputData() {
      var limit = 4000,orders = []
     search.create({
       type:"customrecord_aio_amazon_settlement",
       filters:[
           {name:"custrecord_settle_is_generate_voucher",operator:'is',values:false},
           {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:'Refund'},
           {name:"custrecord_settlement_start",operator:'isnotempty'},
       ],
       columns:[
           {name:'custrecord_aio_sett_order_id',summary: "GROUP"},    
       ]
    })
     .run().each(function(e){
           orders.push(e.getValue(e.columns[0]))
          return --limit>0
      })
      log.audit("待冲销总数",orders.length)
      return orders;
    }
    function map(context) {
      var err = [];
      var so_id;
      try{
        log.debug("context.value：",context.value)
        var settlmentid,trandate;
        var depositdate;
        var CR=0;
        var DR=0;
        var cache_id = context.value
        var orderid = context.value
        if(!orderid) return;//如果没有亚马逊订单号直接返回
        
        var entity,orderstatus,subsidiary,currency,pr_store,settlement_ids = [];
        //搜索销售订单获取客户
	      search.create({
	        type:  record.Type.RETURN_AUTHORIZATION,
	        filters: [
	            { name: 'poastext', operator: 'is', values: orderid },
	            { name: 'mainline', operator: 'is', values: true } 
	        ],
	        columns:[
	          {name:'entity'},
            {name:'statusref'},
            {name:'subsidiary'},
            {name:'currency'},
            {name:'custbody_pr_store'},
	        ]
	      }).run().each(function (rec) {
	        so_id = rec.id;
	        entity = rec.getValue('entity');
          orderstatus = rec.getValue('statusref');
          subsidiary = rec.getValue('subsidiary');
          currency = rec.getValue('currency');
          pr_store = rec.getValue('custbody_pr_store');
	        return false;
        });
	      if(!so_id){
	    	  log.audit("未找到RETURN_AUTHORIZATION",entity)
	    	  return;
	      }
	      
        log.audit("entity",entity)
        log.audit("orderstatus",orderstatus)
        //  delJour(orderid)
        var jour = record.create({type:'journalentry',isDynamic:true})
            jour.setValue({fieldId:'memo',value:"re02"})
            jour.setValue({fieldId:'subsidiary',value:subsidiary})
            jour.setValue({fieldId:'currency',value:currency})
            jour.setValue({fieldId:'custbody_pr_store',value:pr_store})
            jour.setValue({fieldId:'custbody_jour_type',value:"refunds"})
            jour.setValue({fieldId:'custbody_jour_orderid',value:orderid})
            jour.setValue({fieldId:'custbody_curr_voucher',value:"退款冲减凭证"})
            log.debug("orderid",orderid)

        search.create({
          type:"customrecord_aio_amazon_settlement",
          filters:[
              {name:"custrecord_aio_sett_order_id",operator:'is',values:orderid},
             {name:"custrecord_settle_is_generate_voucher",operator:'is',values:false},
              {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:"Refund"},
          ],
          columns:[
              {name:'custrecord_aio_sett_tran_type'},
              {name:'custrecord_aio_sett_amount_type'},
              {name:'custrecord_aio_sett_amount_desc'},
              {name:'custrecord_aio_sett_amount'},
              {name:'custrecord_aio_sett_id'},
              {name:'custrecord_aio_sett_order_id'},
              {name:'custrecord_aio_sett_deposit_date'},
          ]
       }).run().each(function(rec){
        settlement_ids.push(rec.id)
               depositdate =  rec.getValue('custrecord_aio_sett_deposit_date')
               log.debug("rec depositdate:"+typeof(depositdate),depositdate)
           var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');   
           var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');   
           var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');  
               settlmentid = rec.getValue('custrecord_aio_sett_id');  
          var amount = rec.getValue('custrecord_aio_sett_amount');
          if(amount.indexOf(',')!=-1){
        	  amount = amount.replace(',','.') 
          }
        if(((Amount_desc=="Tax"||Amount_desc=="Principal")&&(Tranction_type=="Order"||Tranction_type=="Refund")&&Amount_type=="ItemPrice")){
        }else if(Number(amount)){
           log.debug("amount："+amount,Tranction_type+","+Amount_type+","+Amount_desc)
           var customrecord_itemid;  
           search.create({
               type:'customrecord_cost_type_vs_cost_item',
               filters:[
                   {name:'custrecord_amazon_amount_type',operator:'is',values:Amount_type},
                   {name:'custrecord_amazon_amount_description',operator:'is',values:Amount_desc},
                   {name:'custrecord_amazon_transaction_type',operator:'is',values:Tranction_type}
                   ],
                   columns:[
                       {name:'custrecord_allowance_item'}  
                   ]
           }).run().each(function(e){
               customrecord_itemid = e.getValue(e.columns[0])
           })
           if(customrecord_itemid){
           search.create({
            type:'item',
            filters:[
                {name:'internalid',operator:'is',values:customrecord_itemid},
                ],
                columns:[
                    {name:'incomeaccount'}  
                ]
          }).run().each(function(e){
            incomeaccount = e.getValue(e.columns[0])
          })
          DR -= Number(amount)
          jour.selectNewLine({sublistId:'line'})
          jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:incomeaccount})   
          jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"结 "+orderid})   
          jour.setCurrentSublistValue({sublistId:'line', fieldId:"debit",value:0-Number(amount)})//credit
          jour.commitLine({sublistId:'line'})
        //  record.submitFields({                              
        //     type: "customrecord_aio_amazon_settlement",     
        //     id: rec.id,
        //     values: {
        //       custrecord_settle_checked:true
        //     }
        // })
         }
        }
        return true
      })

      log.debug('查出的DR',DR)
      // credit_cr(orderid);
      if(DR!=0){
        var relative_finance=[],jo1_id, jo3_id ;
        var ins
        search.create({
          type:"journalentry",filters:[
            {name:"custbody_jour_orderid",operator:'is',values:orderid},
            {name:"memomain",operator:'is',values:'re01'}
          ],
          columns:[
            {name:"internalid",summary: "GROUP"}
          ]
        }).run().each(function(jo){
             jo1_id = jo.getValue(jo.columns[0])
          var re_jou = record.load({type:"journalentry",id:jo.getValue(jo.columns[0])})
             var  relative  = re_jou.getValue("custbody_relative_finanace_report")
             relative.map(function(eld){
              relative_finance.push(eld)
             })
              trandate = re_jou.getValue("trandate");
              log.debug("trandate:"+typeof(trandate)+"-,"+trandate,JSON.stringify(trandate))
              // trandate = re_jou.getValue("trandate").replace(/[\u4e00-\u9fa5]/g,'/');
          var len = re_jou.getLineCount({sublistId:"line"})
          for(var le = 0;le<len;le++){
            var acc = re_jou.getSublistValue({sublistId:'line',fieldId:'account',line:le})
            var memo = re_jou.getSublistValue({sublistId:'line',fieldId:'memo',line:le})
            log.debug("找到第一步的日记账:"+jo.getValue(jo.columns[0]),memo)
            if(acc!=122 && memo.indexOf("物")==-1){
              var dam = re_jou.getSublistValue({sublistId:'line',fieldId:'debit',line:le})
              var cam = re_jou.getSublistValue({sublistId:'line',fieldId:'credit',line:le})
                  jour.selectNewLine({sublistId:'line'})
                  jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:acc})   
                  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+orderid})   
              if(dam) jour.setCurrentSublistValue({sublistId:'line',fieldId:"credit", value:dam}) 
              else  jour.setCurrentSublistValue({sublistId:'line',fieldId:"debit", value:cam}) 
              // if(dam) jour.setCurrentSublistValue({sublistId:'line',fieldId:"credit", value:dam}) 
              // else  jour.setCurrentSublistValue({sublistId:'line',fieldId:"debit", value:cam}) 
              jour.commitLine({sublistId:'line'})
            }else{
//              CR = re_jou.getSublistValue({sublistId:'line',fieldId:'debit',line:le})
//              CR = CR?CR:re_jou.getSublistValue({sublistId:'line',fieldId:'credit',line:le})
            	CR += re_jou.getSublistValue({sublistId:'line',fieldId:'debit',line:le})?re_jou.getSublistValue({sublistId:'line',fieldId:'debit',line:le}):re_jou.getSublistValue({sublistId:'line',fieldId:'credit',line:le})
            }
          }
        })
        log.debug("total:DR-CR",DR+"-"+CR)
        var s =  DR + CR
        log.debug("差额:",s.toFixed(2))
          //  122 	应收账款-集团外公司  1341 主营业务收入-集团外公司
          if(Number(s.toFixed(2))){
            jour.selectNewLine({sublistId:'line'})
            jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:122})   
            jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
            jour.setCurrentSublistValue({sublistId:'line',fieldId:"debit",value:s.toFixed(2)}) //贷
            jour.setCurrentSublistValue({sublistId:'line',fieldId:"entity",value:entity}) //客户
            jour.commitLine({sublistId:'line'})
          }
        jour.setValue({fieldId:'trandate',value:moment.utc(getFormatedDate(depositdate)).toDate()})
        // jour.setValue({fieldId:'custbody_amazon_settlementid',value:settlmentid})
        jour.setValue({fieldId:'custbody_relative_finanace_report',value:relative_finance})
        jour.setValue({fieldId:'custbody_settle_in_pingzheng',value:settlement_ids})
       // jour.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
      
        var jo_2 =  jour.save(); 
        log.debug("depositdate:"+typeof(depositdate),depositdate)
        depositdate =  depositdate.substring(0,depositdate.length - 4)
        log.debug("第二步 success:"+jo_2,trandate)
        if(jo_2){
        try {
          var acc  = pr_store,account;
          var jour_3 = record.create({type:'journalentry',isDynamic:true})
              jour_3.setValue({fieldId:'subsidiary',value:subsidiary})
              jour_3.setValue({fieldId:'currency',value:currency})
              jour_3.setValue({fieldId:'trandate',value:moment.utc(getFormatedDate(depositdate)).toDate()})
            //  jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
              jour_3.setValue({fieldId:'custbody_relative_finanace_report',value:relative_finance})
              jour_3.setValue({fieldId:'custbody_settle_in_pingzheng',value:settlement_ids})
              jour_3.setValue({fieldId:'memo',value:"re03"})
              jour_3.setValue({fieldId:'custbody_pr_store',value:acc})
              jour_3.setValue({fieldId:'custbody_jour_type',value:"refunds"})
              jour_3.setValue({fieldId:'custbody_jour_orderid',value:orderid})
              jour_3.setValue({fieldId:'custbody_curr_voucher',value:"退款凭证"})
           search.create({
               type:'customrecord_aio_account',
               filters:[{name:'internalid',operator:'is',values:acc}],
               columns:[{name:'custrecord_customer_payment_account'}]
           }).run().each(function(e){
               account = e.getValue(e.columns[0])
           })
           // account = 1275
            DR = Number(DR).toFixed(2)
            log.debug('第三单金额',DR)
          if(DR>=0){
            jour_3.selectNewLine({sublistId:'line'})
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:account})   
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"debit",value:DR}) //贷
            jour_3.commitLine({sublistId:'line'})
            jour_3.selectNewLine({sublistId:'line'})
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:122})   
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"credit",value:DR}) //借
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"entity",value:entity}) //客户
            jour_3.commitLine({sublistId:'line'})
          }else{
            jour_3.selectNewLine({sublistId:'line'})
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:account})   
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"credit",value:DR})  //借
            jour_3.commitLine({sublistId:'line'})
            jour_3.selectNewLine({sublistId:'line'})
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:122})   
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"debit",value:DR})  
            jour_3.setCurrentSublistValue({sublistId:'line',fieldId:"entity",value:entity}) //客户
            jour_3.commitLine({sublistId:'line'})
          }
          // jour_3.setValue({fieldId:'custbody_amazon_settlementid',value:settlmentid})
         // jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
          jour_3.setValue({fieldId:'trandate',value:moment.utc(getFormatedDate(depositdate)).toDate()})
           jo3_id = jour_3.save();
          log.debug("第三步 success",jo3_id)
        } catch (error) {
            log.error("生成日记账 error",error)
            record.delete({type:'journalentry',id:jo_2})
           // err.push(e.message);
            throw ''+JSON.stringify(error)
           
          }
        }
        log.debug("生成日记账 success",ins)
        log.debug("settlement_ids.length",settlement_ids.length)
        for (var index = 0; index < settlement_ids.length; index++) {
          record.submitFields({
            type:"customrecord_aio_amazon_settlement",
            id:settlement_ids[index],
            values: {
              custrecord_settle_is_generate_voucher: true
            }
          })
          
        }
        if(jo3_id){
          record.submitFields({
            type:"journalentry",
            id:jo1_id,
            values: {
              custbody_estimate_s: jo1_id,
              custbody_blot_s: jo_2,
              custbody_coll_s: jo3_id,
            }
          })
          record.submitFields({
            type:"journalentry",
            id:jo_2,
            values: {
              custbody_estimate_s: jo1_id,
              custbody_blot_s: jo_2,
              custbody_coll_s: jo3_id,
            }
          })
          record.submitFields({
            type:"journalentry",
            id:jo3_id,
            values: {
              custbody_estimate_s: jo1_id,
              custbody_blot_s: jo_2,
              custbody_coll_s: jo3_id,
            }
          })
        }else{
          record.submitFields({
            type:"journalentry",
            id:jo1_id,
            values: {
              custbody_estimate_s: jo1_id,
              custbody_blot_s: jo_2,
            }
          })
          record.submitFields({
            type:"journalentry",
            id:jo_2,
            values: {
              custbody_estimate_s: jo1_id,
              custbody_blot_s: jo_2,
            }
          })
        }

        log.debug("开始生成退款单")
        credit_cr(orderid);
        // context.write({
        //   key:"1",value:{"invoicesId":ins,"depositdate":depositdate,"jo1":jo1_id,"jo2":jo_2,"jo3":jo3_id}
        // })
       }
        }catch(e){
          log.error("eerroor:",e);
          err.push(e.message);
        }  

      //创建missorder
      if (err.length > 0) {

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var date =  format.parse({
          value: (moment(new Date().getTime()).format(dateFormat)),
          type: format.Type.DATE
        });;

        var moId = createSOTRMissingOrder('returnjour', so_id, JSON.stringify(err), date);
        log.debug("出现错误，已创建missingorder"+moId);
      }
    }

    function reduce(context) {
    }

    function summarize(summary) {
        
    }
 
  function delJour(ordid){
       search.create({
        type:'journalentry',
        filters:[
            {name:'mainline',operator:'is',values:true},
            {name:'custbody_jour_orderid',operator:'is',values:ordid},
        ],columns:[{name:"memomain"}]
      }).run().each(function(e){
        try{
        if(e.getValue("memomain") == "re02"|| e.getValue("memomain") == "re03"){
          var de =  record.delete({type:'journalentry',id:e.id})
          log.debug("删除成功  ",de)
        }
        }catch(e){
          log.debug("delete error",e)
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
     * 
     * @param {*} dateStr 01.01.2020 23:34:01 UTC 或者 2020-01-01 23:34:01 UTC
     * 返回2020-01-01T23:34:01
     */
    function getFormatedDate(dateStr) {
      var dateTime;
        var time = dateStr.split(" ")[1];
        var date = dateStr.split(" ")[0];
        if(dateStr.indexOf('.') != -1){
        	var yyyy = date.split(".")[2];
        	var mm = date.split(".")[1];
        	var dd = date.split(".")[0];
        	dateTime = yyyy+"-"+mm+"-"+dd+"T"+time
        }else{
        	dateTime = date+"T"+time
        }
        return dateTime
    }

    /**
     * 根据销售订单id查询冲销订单
     */
    function credit_cr(orderid) {
      search.create({
        type: record.Type.CREDIT_MEMO,
        filters:[
            {name:'mainline',operator:'is',values:true},
            {name:'status',operator:'is',values:"CustCred:A"},
            {name:'custbody_aio_marketplaceid',operator:'is',values:1},
            {name:"otherrefnum",operator:"equalto",values:orderid},
            {name:'custbody_journal_voucher_checkedbox',operator:'is',values:false},

        ],columns:[{name:"internalid",sort:'DESC'}]
    }).run().each(function(e){
      var  cache_id = e.id;
      var  cre = record.load({
          type: record.Type.CREDIT_MEMO,
          id: cache_id
      });
      if(cre){
        log.debug("找到了cr",cache_id)
      var depositdate, settleid
      var ref = record.create({
          type: "customerrefund",
          isDynamic: true
      })
      ref.setValue({
          fieldId: "customer",
          value: cre.getValue("entity")
      })
      search.create({
          type: "customrecord_aio_amazon_settlement",
          filters: [{
              name: "custrecord_aio_sett_order_id",
              operator: 'is',
              values: orderid
          }, ],
          columns: [{
                  name: 'custrecord_aio_sett_id'
              },
              {
                  name: 'custrecord_aio_sett_deposit_date'
              },
          ]
      }).run().each(function (rec) {
          settleid = rec.getValue('custrecord_aio_sett_id')
          depositdate = rec.getValue('custrecord_aio_sett_deposit_date')
      })
      var acc = cre.getValue('custbody_pr_store'),account;
      var currency = cre.getValue('currency')
      log.debug("acc:", acc)
      log.debug("cache_id:", cache_id)
        search.create({
            type:'customrecord_aio_account',
            filters:[{name:'internalid',operator:'is',values:acc}],
            columns:[{name:'custrecord_customer_payment_account'}]
        }).run().each(function(e){
            account = e.getValue(e.columns[0])
        })
       // account = 125
        log.debug("account客户付款科目",account)
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
      log.debug('legth',ref.getLineCount({
              sublistId: "apply"
          }))
      var lineWithCreditmemo = ref.findSublistLineWithValue('apply','internalid',cache_id);
      log.debug('lineWithCreditmemo',lineWithCreditmemo)
      
      var  total = ref.getValue("total")
      var  subsidiary = ref.getValue("subsidiary")
      var  acc_ref = ref.getValue("account")
      var save_id = ref.save({
          ignoreMandatoryFields: true
      });
      log.audit("客户退款成功:"+total, save_id)
      resetBackJo(orderid,save_id)  //反写jour
      record.submitFields({
              type: record.Type.CREDIT_MEMO,
              id: cache_id,
              values: {
            	  custbody_journal_voucher_checkedbox: true
              }
          })
      log.debug("开始生成退款单的日记账 re04","depositdate："+depositdate)  
      log.debug("moment.utc(getFormatedDate(depositdate)).toDate()",moment.utc(getFormatedDate(depositdate)).toDate())  
      var jour_4 = record.create({type:'journalentry',isDynamic:true})
      jour_4.setValue({fieldId:'subsidiary',value:subsidiary})
      jour_4.setValue({fieldId:'currency',value:currency})
      jour_4.setValue({fieldId:'memo',value:"re04"})
      jour_4.setValue({fieldId:'trandate',value:moment.utc(getFormatedDate(depositdate)).toDate()})
      jour_4.setValue({fieldId:'custbody_pr_store',value:acc})
      jour_4.setValue({fieldId:'custbody_jour_type',value:"refunds"})
      jour_4.setValue({fieldId:'custbody_jour_orderid',value:orderid})
      jour_4.setValue({fieldId:'custbody_curr_voucher',value:"来自退款单"})
      jour_4.setValue({fieldId:'custbody_payment',value:save_id})
      jour_4.selectNewLine({sublistId:'line'})
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:acc_ref})   
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:"debit",value:total}) //借
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:"entity",value:cre.getValue("entity")}) //客户
      jour_4.commitLine({sublistId:'line'})
      jour_4.selectNewLine({sublistId:'line'})
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:account})   
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:orderid}) 
      jour_4.setCurrentSublistValue({sublistId:'line',fieldId:"credit",value:total}) //贷
      jour_4.commitLine({sublistId:'line'})
      var jo4 = jour_4.save()
      log.debug("jo4生成成功",jo4)
        }else{
          log.debug("找不到cr",orderid)
        }
      return true
    })
      

    }
    function resetBackJo(orderid,save_id){
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