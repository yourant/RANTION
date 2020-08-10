/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', './Helper/interfunction.min.js', './Helper/core.min.js'],
  function (search, log, record, interfun, core) {
    function getInputData () {
      return search.create({
        type: 'customrecord_aio_order_import_cache',
        filters: [
          // {name: 'custrecord_aio_cache_order_id',operator: 'is',values: '403-9941673-2481901'},
          // {name: 'custrecord_dds111',operator: 'is',values: 'T'},
          {name: 'custrecord_aio_cache_acc_id',operator: 'anyof',values: ['78', '79', '80', '81', '82', '164', '165', '519']}
        ],columns: [
          {name: 'internalid'}
        ]
      })
    }

    function map (context) {
      try {
        log.debug('context', context)
        var St = new Date().getTime(),inv_id = []
      } catch(e) {
        log.error('000出错啦', e)
      }
      log.debug('耗时', new Date().getTime() - St)
    }

    function delInvioce () {
      search.create({
        type: 'invoice',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: obj.so_id},
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
          { name: 'createdfrom', operator: 'anyof', values: obj.so_id},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        fulfill_id.push(rec.id)
        return true
      })
      log.debug('删除发货', fulfill_id)
      log.debug('删除发票', inv_id)
      inv_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'invoice',id: dls})
      })
      fulfill_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'itemfulfillment',id: dls})
      })
      var deso = record.delete({type: 'salesorder',id: obj.so_id})
      var slf = []
      search.create({
        type: 'customrecord_amazon_sales_report',
        filters: [
          { name: 'custrecord_amazon_order_id', operator: 'is', values: obj.orderid},
          { name: 'custrecord_shipment_account', operator: 'anyof', values: obj.acc}
        ]
      }).run().each(function (rec) {
        slf.push(rec.id)
        return true
      })
      slf.map(function (sds) {
        record.submitFields({
          type: 'customrecord_amazon_sales_report',
          id: sds,
          values: {
            custrecord_fulfill_in_ns: 'F'
          }
        })
      })
      var filters = []
      filters.push({
        name: 'custrecord_aio_cache_acc_id',
        operator: search.Operator.ANYOF,
        values: obj.acc
      })
      filters.push({
        name: 'custrecord_aio_cache_order_id',
        operator: 'is',
        values: obj.orderid
      })
      search.create({
        type: 'customrecord_aio_order_import_cache',
        filters: filters
      }).run().each(function (rec) {
        record.submitFields({
          type: 'customrecord_aio_order_import_cache',
          id: rec.id,
          values: {
            'custrecord_aio_cache_resolved': false,
            'custrecord_aio_memo': '创建成功'
          }
        })
      })

      log.audit('OK', obj)
    }
    function reduce (context) {
    }

    function summarize (summary) {
      log.debug('处理完成', summary)
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
