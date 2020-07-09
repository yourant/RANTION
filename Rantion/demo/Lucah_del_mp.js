/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/interfunction.min.js'],
 function (search, log, record, interfun) {
  function getInputData () {
    return search.create({
      type: 'customrecord_aio_order_import_cache',
      filters: [
        {name: 'custrecord_dds111',operator: 'isnot',values: 'T'}
      ],columns: [
        {name: 'internalid'}
      ]
    })
  }

  function map (context) {
    log.debug('context', context)
    var obj = JSON.parse(context.value)
    var so = record.load({type:obj.recordType,id:obj.id})
    var item_obj = so.getValue("custrecord_amazonorder_iteminfo");
    if(!item_obj){
      log.debug("不存在")
      so.save()
      return 
    }
    var lst =interfun.getFormatedDate("", "",JSON.parse(so.getValue("custrecord_aio_cache_body")).last_update_date,true).date
    if(lst =="2"){
        so.setValue({fieldId:"custrecord_dds111",value:"T"})
        so.setValue({fieldId:"custrecord_aio_memo",value:"时间不对"})
        so.save();
        return
    }
    item_obj = JSON.parse(item_obj);
   
    for(var i =0;i<item_obj.length;i++){
      var ss = record.create({type:"customrecord_amazon_item_lines"});
      ss.setValue({fieldId:"custrecord_aitem_title",value:item_obj[i].title});
      ss.setValue({fieldId:"custrecord_aitem_seller_sku",value:item_obj[i].seller_sku});
      ss.setValue({fieldId:"custrecord_aitem_qty",value:item_obj[i].qty});
      ss.setValue({fieldId:"custrecord_aitem_shipping_discount",value:item_obj[i].shipping_discount});
      ss.setValue({fieldId:"custrecord_aitem_item_price",value:item_obj[i].item_price});
      ss.setValue({fieldId:"custrecord_aitem_promotion_discount",value:item_obj[i].promotion_discount});
      ss.setValue({fieldId:"custrecord_aitem_gift_wrap_price",value:item_obj[i].gift_wrap_price});
      ss.setValue({fieldId:"custrecord_aitem_shipping_price",value:item_obj[i].shipping_price});
      ss.setValue({fieldId:"custrecord_aitem_rel_cahce",value:obj.id});
       ss.save();
    }
    so.setValue({fieldId:"custrecord_dds111",value:"T"})
    so.setValue({fieldId:"custrecord_dps_cache_fulfillment_channel",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).fulfillment_channel})
    so.setValue({fieldId:"custrecord_shipment_date_cache",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).latest_ship_date})
    so.setValue({fieldId:"custrecord_purchase_date_1",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).purchase_date})
    so.setValue({fieldId:"custrecord_last_update_date",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).last_update_date})
    so.setValue({fieldId:"custrecord_seller_order_id_1",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).seller_order_id  })
    so.setValue({fieldId:"custrecord_dps_cache_shipped_byamazont_f",value:JSON.parse(so.getValue("custrecord_aio_cache_body")).shipped_byamazont_fm})
    so.save();
    log.debug("保存成功:"+obj.id,JSON.parse(so.getValue("custrecord_aio_cache_body")).fulfillment_channel)
  }

  function reduce (context) {
  }

  function summarize (summary) {
      log.debug("处理完成",summary)
  }


  return {
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  }
})
