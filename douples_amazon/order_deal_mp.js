/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', './Helper/interfunction.min.js', './Helper/core.min.js'],
  function (search, log, record, interfun, core) {
    function getInputData () {
      // return  search.create({
      //   type: 'customrecordafasf',
      //   filters: [
      //     { name: 'custrecord_sf', operator: 'is',values:false}
      //   ]
      // });
      return search.create({
        type: 'customrecord_aio_order_import_cache',
        filters: [
          {name: 'custrecord_aio_cache_acc_id',operator: 'anyof',values: ['78', '79', '80', '81', '82', '164', '165']},
          {name: "custrecord_ord_shippingtax", join: "custrecord_aitem_rel_cahce", operator: "isempty"}
        ],columns: [
          {name: 'internalid',sort:"DESC"}
        ]
      })
    }

    function map (context) {
      try {
        log.debug('context', context)
        var obj = JSON.parse(context.value)
        var sf = record.load({type: obj.recordType,id:obj.id,isDynamic:true});

        search.create({
          type: 'customrecord_amazon_item_lines',
          filters: [
            {name: 'custrecord_aitem_rel_cahce',operator: 'anyof',values: curr.id }
          ]
        }).run().each(function (e) {
          fs.push(e.id);
          return true;
        })
        var auth = core.amazon.getAuthByAccountId(curr.getValue('custrecord_aio_cache_acc_id'))
        if (curr.getValue('custrecord_aio_cache_status') != ord_sta1 || !item_obj)
          item_obj = JSON.stringify(core.amazon.getOrderItems(auth, curr.getValue('custrecord_aio_cache_order_id')))
        log.debug('item_objssssssssssssssssssssssssssssssssssssssssssssss', item_obj)
        item_obj = JSON.parse(item_obj)
        if (item_obj.length < 1 || !item_obj) {
          log.debug('item_obj为空,退出', item_obj)
          record.submitFields({
            type: 'customrecord_aio_order_import_cache',
            id: curr.id,
            values: {
              custrecord_dds111: 'F'
            }
          })
          return
        }
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
          ss.setValue({fieldId: 'custrecord_ord_itemtax',value: item_obj[i].item_tax})
          log.debug('设置sippingTax', item_obj[i].shipping_tax)
          ss.setValue({fieldId: 'custrecord_ord_shippingtax',value: item_obj[i].shipping_tax})
          ss.setValue({fieldId: 'custrecord_aitem_rel_cahce',value: curr.id})
          ss.save()
        }
        fs.map(function (ds) {
          record.delete({type: 'customrecord_amazon_item_lines',id: ds})
          log.debug('先删除')
        })
        var ss = sf.save();
        log.debug("OK",ss)
      } catch(e) {
        log.error('000出错啦', e);
      }
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
