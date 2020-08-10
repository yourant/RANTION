/**
 *@NApiVersion 2.x
*@NScriptType MapReduceScript
*/
define(['N/search', 'N/log', 'N/record', './Helper/interfunction.min.js'],
  function (search, log, record, interfun) {
    function getInputData () {
      return search.load({ id: 'customsearch327'})
    // return search.create({
    //   type: 'customrecord_aio_amazon_seller_sku',
    //   filters: [
    //     {name: 'internalid',operator: 'greaterthan',summarytype:"count",values:["1"]}
    //   ],columns: [
    //     {name: 'internalid',summary:"COUNT"},
    //     {name:"name",summary:"GROUP"},
    //     {name:"custrecord_ass_account",summary:"GROUP"}
    //   ]
    // })
    }

    function map (context) {
      log.debug('context', context)
      var obj = JSON.parse(context.value)
      try {
        var vals = obj.values
        var inv = record.load({type: obj.recordType,id: obj.id})
        var len = inv.getLineCount({sublistId: 'item'})
        var oid = vals['otherrefnum.createdFrom']
        var acc = vals['custbody_order_locaiton.createdFrom'].value,objItem,dept
        search.create({
          type: 'customrecord_aio_order_import_cache',
          filters: [
            { name: 'custrecord_aio_cache_acc_id', operator: search.Operator.ANYOF,values: acc},
            { name: 'custrecord_aio_cache_order_id',operator: 'is',values: oid}
          ],columns: [{name: 'custrecord_amazonorder_iteminfo'} , { name: 'custrecord_division',join: 'custrecord_aio_cache_acc_id'}]
        }).run().each(function (ds) {
          objItem = JSON.parse(ds.getValue('custrecord_amazonorder_iteminfo'))
          dept = ds.getValue(ds.columns[1])
        })
        inv.setValue({fieldId: 'department',value: dept})
        var seller = {}

        objItem.map(function (line) {
          var skuid = interfun.getskuId(line.seller_sku.trim(), acc, oid)
          seller[skuid] = line.seller_sku.trim()
        })
        for (var i = 0;i < len;i++) {
          var itemid = inv.getSublistValue({sublistId: 'item',fieldId: 'item',line: i})
          inv.setSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: seller[itemid],line: i})
        }
        var ss = inv.save({ ignoreMandatoryFields: true})
        log.audit('保存成功', ss)
      } catch(e) {
        log.error('出错拉', e)
      }
      return
      // obj = obj.values
      // var repid = obj['GROUP(custbody_shipment_report_rel)'].value
      // var createdfrom = obj['GROUP(createdfrom)'].value
      // var fxamount = obj['SUM(fxamount)']
      // var ship_qty = obj['SUM(quantity)']
      // log.debug('发货报告：' + repid, '金额： ' + fxamount + ' ,发货数量：' + ship_qty)
      // var qty = 0
      // // 查询有没有关联此发货报告的货品实施单
      // search.create({
      //   type: 'itemfulfillment',
      //   filters: [
      //     { name: 'custbody_shipment_report_rel', operator: 'anyof', values: repid},
      //     { name: 'account', operator: 'noneof', values: ['214']},
      //     { name: 'taxline', operator: 'is', values: false },
      //     { name: 'mainline', operator: 'is', values: false }
      //   ],columns: [{name: 'quantity'}]
      // }).run().each(function (rec) {
      //   qty += Number(rec.getValue('quantity'))
      //   return true
      // })
      // log.debug('货品实施的数量:'+qty,"发货数量:"+ship_qty)
      // if(qty!=ship_qty){
      //   log.audit("开票数量不对","发货报告："+repid)
      //   record.submitFields({
      //     type: 'customrecord_amazon_sales_report',
      //     id: repid,
      //     values: {
      //       custrecord_fulfill_in_ns: '没发货已开票'
      //     }
      //   })
      // }

      // var acc = obj["GROUP(custrecord_ass_account)"].value
      // log.debug("seller sku : "+nama,"acc: "+acc)

      // var kds=[]
      //     search.create({
      //       type: 'customrecord_aio_amazon_seller_sku',
      //       filters: [
      //         {name: 'name',operator: 'is',values: nama},
      //         {name: 'custrecord_ass_account',operator: 'anyof',values: acc}
      //       ],columns: [
      //         {name: 'internalid'}
      //       ]
      //     }).run().each(function(e){
      //       kds.push(e.id)
      //       return true
      //     })
      //    for(var i =0;i<kds.length - 1;i++){
      //       var so = record.delete({type:"customrecord_aio_amazon_seller_sku",id: kds[i]})
      //       log.audit("删除成功",so)
      //     }

      return
      var so = record.load({type: obj.recordType,id: obj.id})
      var item_obj = so.getValue('custrecord_amazonorder_iteminfo')
      if (!item_obj) {
        log.debug('不存在')
        so.save()
        return
      }
      var lst = interfun.getFormatedDate('', '', JSON.parse(so.getValue('custrecord_aio_cache_body')).last_update_date, true).date
      if (lst == '2') {
        so.setValue({fieldId: 'custrecord_dds111',value: 'T'})
        so.setValue({fieldId: 'custrecord_aio_memo',value: '时间不对'})
        so.save()
        return
      }
      item_obj = JSON.parse(item_obj)

      for (var i = 0;i < item_obj.length;i++) {
        var ss = record.create({type: 'customrecord_amazon_item_lines'})
        ss.setValue({fieldId: 'custrecord_aitem_title',value: item_obj[i].title})
        ss.setValue({fieldId: 'custrecord_aitem_seller_sku',value: item_obj[i].seller_sku})
        ss.setValue({fieldId: 'custrecord_aitem_qty',value: item_obj[i].qty})
        ss.setValue({fieldId: 'custrecord_aitem_shipping_discount',value: item_obj[i].shipping_discount})
        ss.setValue({fieldId: 'custrecord_aitem_item_price',value: item_obj[i].item_price})
        ss.setValue({fieldId: 'custrecord_aitem_promotion_discount',value: item_obj[i].promotion_discount})
        ss.setValue({fieldId: 'custrecord_aitem_gift_wrap_price',value: item_obj[i].gift_wrap_price})
        ss.setValue({fieldId: 'custrecord_aitem_shipping_price',value: item_obj[i].shipping_price})
        ss.setValue({fieldId: 'custrecord_aitem_rel_cahce',value: obj.id})
        ss.save()
      }
      so.setValue({fieldId: 'custrecord_dds111',value: 'T'})
      so.setValue({fieldId: 'custrecord_dps_cache_fulfillment_channel',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).fulfillment_channel})
      so.setValue({fieldId: 'custrecord_shipment_date_cache',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).latest_ship_date})
      so.setValue({fieldId: 'custrecord_purchase_date_1',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).purchase_date})
      so.setValue({fieldId: 'custrecord_last_update_date',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).last_update_date})
      so.setValue({fieldId: 'custrecord_seller_order_id_1',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).seller_order_id  })
      so.setValue({fieldId: 'custrecord_dps_cache_shipped_byamazont_f',value: JSON.parse(so.getValue('custrecord_aio_cache_body')).shipped_byamazont_fm})
      so.save()
      log.debug('保存成功:' + obj.id, JSON.parse(so.getValue('custrecord_aio_cache_body')).fulfillment_channel)
    }

    function reduce (context) {
    }

    function summarize (summary) {
      log.debug('处理完成', summary)
    }

    function DElFullfill (soid) {
      var order_id,sellr
      search.create({
        type: 'salesorder',
        filters: [
          // { name: 'custbody_order_locaiton', operator: 'anyof', values: acc_search},
          { name: 'internalid', operator: 'is', values: soid }
        ],columns: [{name: 'custrecord_aio_seller_id',join: 'custbody_order_locaiton'} , {name: 'otherrefnum'}]
      }).run().each(function (rec) {
        sellr = rec.getValue(rec.columns[0])
        order_id = rec.getValue(rec.columns[1])
        return true
      })

      var fulfill_id = [],inv_id = []
      search.create({
        type: 'invoice',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: soid},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        inv_id.push(rec.id)
        return true
      })
      // 查询有没有关联此发货报告的货品实施单
      search.create({
        type: 'itemfulfillment',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: soid},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        fulfill_id.push(rec.id)
        return true
      })

      inv_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'invoice',id: dls})
      })
      fulfill_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'itemfulfillment',id: dls})
      })
      log.audit('fulfill_id:', fulfill_id)
      log.audit('inv_id:', inv_id)
      log.audit('sellr:' + sellr, order_id)
      var acc_search = interfun.getSearchAccount(sellr)
      var pds = []
      search.create({
        type: 'customrecord_amazon_sales_report',
        filters: [
          {name: 'custrecord_amazon_order_id',operator: 'is',values: order_id},
          {name: 'custrecord_shipment_account',operator: 'anyof',values: acc_search}
        ]
      }).run().each(function (ds) {
        pds.push(ds.id)
        return true
      })
      pds.map(function (dls) {
        record.submitFields({
          type: 'customrecord_amazon_sales_report',
          id: dls,
          values: {
            custrecord_fulfill_in_ns: 'F'
          }
        })
      })
      log.audit('OK', pds)
    }
    function salereport (context) {
      var flf = record.load({type: 'customrecord_amazon_sales_report',id: context})
      var oid = flf.getValue('custrecord_amazon_order_id')
      var inv_id = [],fulfill_id = []
      var fils = [],so_ids = []
      var fils = [
        // { name: 'custbody_aio_account', operator: 'anyof', values: acc_search},
        { name: 'mainline', operator: 'is', values: true },
        { name: 'poastext', operator: 'is', values: oid }
      ]
      search.create({
        type: record.Type.SALES_ORDER,
        filters: fils
      }).run().each(function (rec) {
        so_ids.push(rec.id)
        return true
      })
      search.create({
        type: 'invoice',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: so_ids},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        inv_id.push(rec.id)
        return true
      })
      inv_id.map(function (inv_i) {
        var inv = record.delete({type: 'invoice',id: Number(inv_i)})
      })
      // 查询有没有关联此发货报告的货品实施单
      search.create({
        type: 'itemfulfillment',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: so_ids},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        fulfill_id.push(rec.id)
        return true
      })
      fulfill_id.map(function (fulfill_i) {
        var full = record.delete({type: 'itemfulfillment',id: fulfill_i})
      })
      var slf = []
      search.create({
        type: 'customrecord_amazon_sales_report',
        filters: [
          { name: 'custrecord_amazon_order_id', operator: 'is', values: oid}
        ]
      }).run().each(function (rec) {
        slf.push(rec.id)
        return true
      })
      slf.map(function (ds) {
        record.submitFields({
          type: 'customrecord_amazon_sales_report',
          id: ds,
          values: {
            custrecord_fulfill_in_ns: '重新发货'
          }
        })
      })
      if (fulfill_id.length == 0 && inv_id.length == 0) {
        log.error('重新发货设置成功', '发货报告：' + JSON.stringify(slf))
      }
    }
    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
