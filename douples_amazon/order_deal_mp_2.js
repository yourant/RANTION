/**
 *@NApiVersion 2.x
*@NScriptType MapReduceScript
*/
define(['N/search', 'N/log', 'N/record', './Helper/interfunction.min.js'],
  function (search, log, record, interfun) {
    function getInputData () {
      // return search.load({ id: 'customsearch327'})
      return search.create({
        type: record.Type.RETURN_AUTHORIZATION,
        filters: [
          {name: 'custbody_origin_customer_return_order',operator: 'noneof',values: '@NONE@'}
        ]
      })
    }

    function map (context) {
      log.debug('context', context)
      var obj = JSON.parse(context.value)
      var meo = '平台发货成本-退回[Amazon]',rt_id
      search.create({
        type: 'itemreceipt',
        filters: [
          {name: 'createdfrom',operator: 'anyof',values: obj.id}
        ]
      }).run().each(function (e) {
        rt_id = e.id
      })
      record.submitFields({
        type: 'itemreceipt',
        id: rt_id,
        values: {
          memo: meo
        }
      })
      record.submitFields({
        type: obj.recordType,
        id: obj.id,
        values: {
          memo: meo
        }
      })
      log.debug('OK itemreceipt: ', rt_id)
      return
      try {
      } catch(e) {}

      return
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
