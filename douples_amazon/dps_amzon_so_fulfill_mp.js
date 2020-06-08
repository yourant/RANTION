/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript 
 */
define(["N/format", "N/runtime", 'N/search', 'N/record', './Helper/Moment.min.js',"./Helper/interfunction.min"],
  function (format, runtime, search, record, moment,interfun) {
     const MissingReportType = 1 //Missing report 发货报告
    function getInputData() {
      var startT = new Date().getTime()
      var limit = 1000, orders = []
      var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_if_account' });
      var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_orderid' });
      var shipdate_ed = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_shipdate_ed' });
      var shipdate_st = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_shipdate_st' });
      log.debug("shipdate_st:"+shipdate_st,"shipdate_ed:"+shipdate_ed)
        var fils = []
        fils.push(search.createFilter({ name: 'custrecord_fulfill_in_ns', operator: "is", values: "F" }));
        // fils.push(search.createFilter({ name: 'internalidnumber', operator: "equalto", values: 50977 }));
        acc ? fils.push(search.createFilter({ name: 'custrecord_shipment_account', operator: search.Operator.IS, values: acc })) : ""
        shipdate_st ? fils.push(search.createFilter({ name: 'custrecord_shipment_date', operator: search.Operator.ONORAFTER, values: shipdate_st })) : ""
        shipdate_ed ? fils.push(search.createFilter({ name: 'custrecord_shipment_date', operator: search.Operator.ONORBEFORE, values: shipdate_ed })) : ""
        orderid ? fils.push(search.createFilter({ name: 'custrecord_amazon_order_id', operator: search.Operator.IS, values: orderid })) : ""
        log.debug("filters", JSON.stringify(fils))
        search.create({
          type: 'customrecord_amazon_sales_report',
          filters: fils,
          columns: [
            { name: 'custrecord_quantity_shipped' },
            { name: 'custrecord_shipment_date' },
            { name: 'custrecord_sku' },
            { name: 'custrecord_shipment_account' },
            { name: 'custrecord_aio_seller_id',join:"custrecord_shipment_account" },
            { name: 'custrecord_aio_fbaorder_location',join:"custrecord_shipment_account" },
            { name: 'custrecord_amazon_order_id' },
            { name: 'custrecord_merchant_order_id' },
          ]
        }).run().each(function (e) {
          orders.push({
            "reporid": e.id,
            "report_acc": e.getValue("custrecord_shipment_account"),
            "order_id": e.getValue("custrecord_amazon_order_id"),
            "merchant_order_id": e.getValue("custrecord_merchant_order_id"),
            "ship_sku": e.getValue("custrecord_sku"),
            "ship_qty": e.getValue("custrecord_quantity_shipped"),
            "seller_id": e.getValue(e.columns[4]),
            "loca": e.getValue(e.columns[5]),
            "shipDate": e.getValue("custrecord_shipment_date")
          })
          return --limit > 0
        })
      
      log.audit("订单总数", orders.length)
      var endmap = new Date().getTime()
      log.debug("000getInputData endTime " + (endmap - startT), new Date().getTime())
      return orders;
    }

    function map(context) {
      var startT = new Date().getTime()
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
      var date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
      });
      log.debug("map startTime", startT)
      var err = [], acc, transactionType
      transactionType = "fulfillment"
      var so_id
      var obj = JSON.parse(context.value)
      var shipDate = obj.shipDate,
      report_acc = obj.report_acc,
        ship_sku = obj.ship_sku,
        order_id = obj.order_id,
        ship_qty = obj.ship_qty,
        merchant_order_id = obj.merchant_order_id,
        repid = obj.reporid;
      try {
        //查询有没有关联此发货报告的发票
        var inv_id,fulfill_id
        search.create({
          type: "invoice",
          filters: [
            { name: 'custbody_shipment_report_rel', operator: 'anyof', values: repid},
            { name: 'mainline', operator: 'is', values: true }
          ]
        }).run().each(function (rec) {
          inv_id = rec.id
        })
         //查询有没有关联此发货报告的货品实施单
        search.create({
          type: "itemfulfillment",
          filters: [
            { name: 'custbody_shipment_report_rel', operator: 'anyof', values: repid},
            { name: 'mainline', operator: 'is', values: true }
          ]
        }).run().each(function (rec) {
          fulfill_id = rec.id
        })
        if(inv_id){
           //已存在此报告的发票，就设置为T
          record.submitFields({
            type: "customrecord_amazon_sales_report",
            id: repid,
            values: {
                custrecord_fulfill_in_ns: "T"
            }
          }) 
          return
        }
        if(fulfill_id &&!inv_id){
           //如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
           var de = record.delete({type:"itemfulfillment",id:fulfill_id})
           log.debug("已删除发货单，重新发货发票",de)
        }

        var flss = [],acc_search=interfun.getSearchAccount(obj.seller_id);
        var ord_status
        log.debug("order_id",order_id)
        var so_obj = interfun.SearchSO(order_id,merchant_order_id,acc_search)
            so_id = so_obj.so_id
            acc = so_obj.acc
            ord_status = so_obj.ord_status
          
            log.debug("so_obj",so_obj)
        if (so_id) {
          if (ord_status == 'A') {  //先批准
            log.audit("orderstatus " + ord_status, "先批准")
            record.submitFields({
              type: record.Type.SALES_ORDER,
              id: so_id,
              values: {
                orderstatus: 'B'
              },
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
              }
            });
          }
        
          var ful_rs = fullfillment(so_id, shipDate, ship_sku, ship_qty, repid,obj.loca)  //发货
          if (ful_rs.indexOf("不足") > -1) {
            err.push(ful_rs)
          }

        }
         else {
          log.debug("找不到订单:", order_id)
          // record.submitFields({
          //   type: "customrecord_amazon_sales_report",
          //   id: repid,
          //   values: {
          //     custrecord_fulfill_in_ns: 'NSO'
          //   }
          // })
          createMissingReportRec(MissingReportType, order_id,"发货时，发货报告找不到销售订单",report_acc)
          log.debug("找不到订单，计入missing order")
        }
      } catch (e) {
        log.error(" error ：" + order_id, e)
        err.push(e)
      }
      log.debug("000map endTime", new Date().getTime() - startT)

      //创建missorder
      if (err.length > 0) {
        if(acc)
        var moId = createSOTRMissingOrder(transactionType, order_id, JSON.stringify(err), date, acc);
        else
        var moId = createSOTRMissingOrder(transactionType, order_id, JSON.stringify(err), date, report_acc);
        log.debug("出现错误，已创建missingorder" + moId);
      } else {
        if(acc){
          delMissingReportRec(MissingReportType, orderid,"发货时，发货报告找不到销售订单",acc)
          makeresovle(transactionType, order_id, acc)
        }
        else{
          delMissingReportRec(MissingReportType, orderid,"发货时，发货报告找不到销售订单",report_acc)
          makeresovle(transactionType, order_id, report_acc)
        }
  
      }
    }

    /**
      * 发货问题记录
      * @param {*} type 
      * @param {*} orderid 
      * @param {*} acc 
      */
    function TakeNote(acc, orderid, location, newsku, msku, qty) {
      var recs
      search.create({
        type: 'customrecord_fuifillment_itemrec',
        filters: [
          { name: 'custrecord_fulfillment_store', operator: 'is', values: acc },
          { name: 'custrecord_fulfillmentrec_orderid', operator: 'is', values: orderid },
          { name: 'custrecord_fulfillment_location', operator: 'is', values: location },
          { name: 'custrecord_fulfillment_qty', operator: 'is', values: qty },
          { name: 'custrecord_fulfillment', operator: 'is', values: msku },
          { name: 'custrecord_fulfillment_newsku', operator: 'is', values: newsku }
        ]
      }).run().each(function (rec) {
        recs = record.load({ type: "customrecord_fuifillment_itemrec", id: rec.id })
      })
      if (!recs) {
        recs = record.create({ type: "customrecord_fuifillment_itemrec" })
        recs.setValue({ fieldId: 'custrecord_fulfillment_store', value: acc });
        recs.setValue({ fieldId: 'custrecord_fulfillmentrec_orderid', value: orderid });
        recs.setValue({ fieldId: 'custrecord_fulfillment_location', value: location });
        recs.setValue({ fieldId: 'custrecord_fulfillment_qty', value: qty });
        recs.setValue({ fieldId: 'custrecord_fulfillment', value: msku });
        recs.setValue({ fieldId: 'custrecord_fulfillment_newsku', value: newsku });
        recs.save()
      }
    }
    /**
          * makeresovle missingorder
          * @param {*} type 
          * @param {*} orderid 
          * @param {*} acc 
          */
    function makeresovle(type, orderid, acc) {
      var fils = []
      type?fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}):""
      orderid?fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}):""
      acc?fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}):""
      search.create({
        type: 'customrecord_dps_transform_mo',
        filters:fils
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
      type?fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}):""
      orderid?fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}):""
      acc?fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}):""
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
      type?
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_type',
        value: type
      }):""; //类型
      acc?
      mo.setValue({
        fieldId: 'custrecord_tracking_missing_acoount',
        value: acc
      }):"";
      orderid?
      mo.setValue({
        fieldId: 'custrecord_missing_orderid_txt',
        value: orderid
      }):"";
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
    * 执行失败，记录有差异的数据，存储并可显示，供分析、查询用途
    * @param {*} type missing report类型
    * @param {*} orderid 
    * @param {*} desc  描述
    * @param {*} acc 
    */
    function createMissingReportRec(type, orderid,desc,acc) {
      var rec
      var fils = []
      type?fils.push({ name: 'custrecord_missing_report_type', operator: 'is',values: type}):""
      orderid?fils.push({ name: 'custrecord_missing_report_orderid', operator: 'is',values: orderid}):""
      acc?fils.push({ name: 'custrecord_missing_report_store', operator: 'is',values: acc}):""
      desc?fils.push({ name: 'custrecord_missing_report_description', operator: 'is',values: desc}):""
      search.create({
        type: 'customrecord_missing_report',
        filters:fils
      }).run().each(function (rec) {
        rec = record.load({type:"customrecord_missing_report",id:rec.id})
      })
      if(!rec){
        rec = record.create({type:"customrecord_missing_report"})
      }
         rec.setValue({fieldId:"custrecord_missing_report_type",value:type})
        rec.setValue({fieldId:"custrecord_missing_report_orderid",value:orderid})
        rec.setValue({fieldId:"custrecord_missing_report_store",value:acc})
        rec.setValue({fieldId:"custrecord_missing_report_description",value:desc})
        var ss =  rec.save()
        log.debug("missing record success : " +ss)
    }
    /**
     * 执行完成，删除已有的差异记录
     * @param {*} type 
     * @param {*} orderid 
     * @param {*} desc 
     * @param {*} acc 
     */
    function delMissingReportRec(type, orderid,desc,acc){
      var rec
      var fils = []
      type?fils.push({ name: 'custrecord_missing_report_type', operator: 'is',values: type}):""
      orderid?fils.push({ name: 'custrecord_missing_report_orderid', operator: 'is',values: orderid}):""
      acc?fils.push({ name: 'custrecord_missing_report_store', operator: 'is',values: acc}):""
      desc?fils.push({ name: 'custrecord_missing_report_description', operator: 'is',values: desc}):""
      search.create({
        type: 'customrecord_missing_report',
        filters:fils
      }).run().each(function (rec) {
        var de = record.delete({type:"customrecord_missing_report",id:rec.id})
        
      })
    }
       
    function fullfillment(so_id, shipdate, ship_sku, qty, rei,loca) {
      var so = record.load({ type: 'salesorder', id: so_id })
      var location = so.getValue("location")
      if(!location)
      location = loca
      var ord_sta = so.getValue("orderstatus")
      var ord_stas = so.getValue("status")
      var acc = so.getValue('custbody_aio_account')
      var order_id = so.getValue("otherrefnum")
      log.audit("fullfillment orderstatus :" + JSON.stringify(ord_sta), "status" + ord_stas)
      // if (ord_sta == 'B' || ord_sta == 'E' || ord_sta == 'D') { //待履行，部分發貨，部分開票
        var f = record.transform({
          fromType: record.Type.SALES_ORDER,
          toType: record.Type.ITEM_FULFILLMENT,
          fromId: Number(so_id)
        });
        log.audit("000000shipDate_text ", JSON.stringify(shipdate))
        // f.setValue({ fieldId: 'trandate', value:so.getValue('trandate')});
        f.setText({ fieldId: 'trandate', text: shipdate });
        f.setValue({ fieldId: 'shipstatus', value: 'C' });
        f.setValue({ fieldId: 'custbody_aio_account', value: acc });
        f.setValue({ fieldId: 'custbody_shipment_report_rel', value: rei });  //关联发货报告

        const lc = f.getLineCount({ sublistId: 'item' });
        var ful, unrec = [],fulfill_line,fulfill_qty
        for (var ln = 0; ln < lc; ln++) {
          var n = 0
          log.debug(" ln = 0  n", n)
          var onhand = f.getSublistValue({ sublistId: 'item', fieldId: 'onhand', line: ln })  //可用
          var quantity = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: ln })
          var itemid = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln });
          var itemtype = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln });		//货品类型
          if (ful == 'full') {//取消后续的发货 full  :这一天发货报告的发货数量已经发完
            if (ln == fulfill_line && itemtype == "OthCharge"){
              continue
            }else {
              unrec.push(ln)
              continue
            }
          } else if ( ful == 'full_blot') {  // full_blot  :这一天发货报告的发货数量还没发完
            if (ln == fulfill_line && itemtype == "OthCharge")
              continue
          } else if(itemtype == 'OthCharge'){   // OthCharge  : 费用类型不发
             unrec.push(ln)
             continue
          }
          var c
          try {
            if ((ln + 1) < lc) c = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln + 1 });		//货品类型
          } catch (e) {
            log.error("cc error", e)
          }
          var  skuid = interfun.getskuId(ship_sku.trim(),acc,order_id)
          log.audit("发货对应的货品信息：","qty: " + qty + "，ship_sku：" + ship_sku+",itemid:"+skuid)
          log.audit("skuid.indexOf(itemid): " + itemid, skuid.indexOf(itemid))
          if (JSON.stringify(skuid).indexOf(itemid) > -1 && onhand>=qty) {
            if (quantity < qty) {
              ful = "full_blot",fulfill_line =ln+1
              log.debug("此行货品的剩余数量少于发货报告", quantity+' ：'+qty)
              fulfill_qty = quantity
              qty =  qty - quantity
            }else{
              ful = "full",fulfill_line =ln+1
              fulfill_qty = qty
            }
            
            f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fulfill_qty, line: ln });
            f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln });
          } else if(JSON.stringify(skuid).indexOf(itemid) > -1 && onhand<qty){
            var NewSku = getIteminfo(itemid)
            TakeNote(acc, order_id, location, NewSku, ship_sku, qty);
            return "SKU库存不足: " + ship_sku
          } else {
            log.debug("这行不发货，记起来 :" + ln, JSON.stringify(unrec))
            unrec.push(ln)
          }
        }
        log.debug("ful::", ful);
        log.debug("unrec::", JSON.stringify(unrec));
        //不用发货
        unrec.map(function (l) {
          f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: l });
        })

        if (ful == "full") {
          var ss = f.save({
            ignoreMandatoryFields: true
          });
          log.audit('发货成功', ss);
         
          // 自动开票
          if (ss)
            createInvioce(so_id, shipdate, so.getValue('custbody_aio_account'),rei);
            
        }else{
          log.debug("不满足发货条件 qty:"+qty,"发货报告ID:"+rei)
        }
      // } 
      return "OK"
    }


    /**
     * 拿到新SKU ，记入missingorder
     */
    function getIteminfo(itemid) {
      var itemN
      search.create({
        type: 'item',
        filters: [{ name: "internalidnumber", operator: "equalto", values: [itemid] }],
        columns: [
          { name: 'internalId' },
          { name: 'itemid' },
        ]
      }).run().each(function (rec) {
        itemN = rec.getValue("itemid")
      });
      return itemN
    }
    

    function createInvioce(soid, shipdate, acc,rei) {
      // var so = record.load({ type: 'salesorder', id: soid });
      try {
        // var curr_time = new Date(
        var inv = record.transform({
          fromType: record.Type.SALES_ORDER,
          toType: record.Type.INVOICE,
          fromId: Number(soid),
        });
        inv.setValue({ fieldId: 'custbody_aio_account', value: acc });
        inv.setValue({ fieldId: 'approvalstatus', value: 2 });
        inv.setText({ fieldId: 'trandate', text: shipdate });
        inv.setValue({ fieldId: 'custbody_shipment_report_rel', value: rei });
        var first_save = inv.save();
        log.debug("保存成功“", first_save)
        record.submitFields({
          type: "customrecord_amazon_sales_report",
          id: rei,
          values: {
            custrecord_fulfill_in_ns: 'T'
          }
        })
        return first_save
      } catch (e) {
        log.error("error", e);
      }
    }

    function reduce(context) {

    }

    function summarize(summary) {
      log.debug("处理完成")
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  });
