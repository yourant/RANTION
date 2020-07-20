/**
 *@NApiVersion 2.x
*@NScriptType MapReduceScript
*/
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/interfunction.min.js'],
  function (search, log, record, interfun) {
    function getInputData () {
      var dd = [
        '14816',
        '17050',
        '11166',
        '12603',
        '18623',
        '12649',
        '2813',
        '3960',
        '9526',
        '16646',
        '11039',
        '12644',
        '13416',
        '9842',
        '16039',
        '5781',
        '14589',
        '13329',
        '15660',
        '12433',
        '16049',
        '16699',
        '15915',
        '10827',
        '10520',
        '10631',
        '18384',
        '12674',
        '12187',
        '3740',
        '16621',
        '13929',
        '3969',
        '12304',
        '15387',
        '12608',
        '3209',
        '15981',
        '14051',
        '19324',
        '14467',
        '11311',
        '11175',
        '4105',
        '10769',
        '18331',
        '16047',
        '14617',
        '14785',
        '10302',
        '14778',
        '14736',
        '3007',
        '16991',
        '15546',
        '1187',
        '12485',
        '13987',
        '12576',
        '4338',
        '3024',
        '16854',
        '15369',
        '14489',
        '13722',
        '12524',
        '17726',
        '12519',
        '17608',
        '11438',
        '2823',
        '3545',
        '11366',
        '17016',
        '16423',
        '10413',
        '10448',
        '12223',
        '5873',
        '16425',
        '18055',
        '5538',
        '11947',
        '2283',
        '17390',
        '18359',
        '1116',
        '14795',
        '1632'
      ]
      var ff = [
        15580,
        18237,
        3820,
        927,
        14976,
        14801,
        15388,
        1965,
        10306,
        10998,
        14702,
        14253,
        10556,
        18403,
        11125,
        19208,
        13535,
        13840,
        13991,
        12913,
        14773,
        9794,
        13478,
        14491,
        18525,
        3614,
        14073,
        13031,
        13408,
        16322,
        1678
      ]
      return dd
      return search.create({
        type: 'customrecord_demand_forecast_child',
        filters: [
          // {name: 'custrecord_dds111',operator: 'isnot',values: 'T'}
        ],columns: [
          {name: 'internalid'}
        ]
      })
    // return search.create({
    //   type: 'customrecord_aio_order_import_cache',
    //   filters: [
    //     {name: 'custrecord_dds111',operator: 'isnot',values: 'T'}
    //   ],columns: [
    //     {name: 'internalid'}
    //   ]
    // })
    }

    function map (context) {
      var inv_id = [],fulfill_id = []
      try {
        var flf = record.load({type: 'customrecord_amazon_sales_report',id: context.value})
        var oid = flf.getValue('custrecord_amazon_order_id')
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
          log.error('重新发货设置成功', '发货报告：' + JSON.stringify(slf));
        }
      } catch(e) {
        log.error('报错拉', e)
      }
      return

      log.debug('context', context)
      var obj = JSON.parse(context.value)
      var so = record.delete({type: obj.recordType,id: obj.id})
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

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
