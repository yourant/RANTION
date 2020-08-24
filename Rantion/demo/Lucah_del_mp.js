/**
 *@NApiVersion 2.x
*@NScriptType MapReduceScript
*/
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/interfunction.min.js'],
  function (search, log, record, interfun) {
    function getInputData () {
      var ord = [],limit = 4000
      // var fils = [
      //   ['custbody_fin_rel_inv_ck', 'is', 'F'],
      //   'and',
      //   ['memomain', 'is', '预估']
      // ]
      // search.create({
      //   type: 'journalentry',
      //   filters: fils,
      //   columns: [
      //     {name: 'custbody_relative_finanace_report',summary: 'GROUP'},
      //     {name: 'internalid',summary: 'GROUP'},
      //     {name: 'internalid',join: 'CUSTBODY_REL_SALESORDER',summary: 'GROUP'}
      //   ]
      // }).run().each(function (e) {
      //   ord.push({fin: e.getValue(e.columns[0]), 'oid': e.getValue(e.columns[1]),'so_id': e.getValue(e.columns[2])})
      //   return --limit > 0
      // })
      search.load({id: 'customsearch448'}).run().each(function (e) {
        ord.push({joid: e.getValue(e.columns[0]), dept: e.getValue(e.columns[1])})
        return --limit > 0
      })
      log.debug('ord', ord)
      return ord
    }

    function map (context) {
      return
      try {
        var ST = new Date().getTime()
        var obj = JSON.parse(context.value)
        var jo = record.load({type: 'journalentry',id: obj.joid,isDynamic: true})
        var len = jo.getLineCount({sublistId: 'line'})
        for (var i = 0;i < len;i++) {
          jo.selectLine({sublistId: 'line', line: i})
          jo.setCurrentSublistValue({sublistId: 'line',fieldId: 'department',value: obj.dept})
          jo.commitLine({sublistId: 'line'})
        }
        jo.save()
        log.audit('耗时', (new Date().getTime() - ST))
      } catch(e) {
        log.audit('error', e)
      }
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
