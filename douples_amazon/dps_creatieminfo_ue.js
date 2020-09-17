/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
  Amazon 拉单时，根据单号拿到货品信息
 */
define(['./Helper/core.min', 'N/log', 'N/record', './Helper/Moment.min', 'N/search'],
  function (core, log, record, moment, search) {
    var ord_sta1
    /**
     * Function definition to be triggered before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

    function beforeLoad (context) {
      var curr = context.newRecord
      ord_sta1 = curr.getValue('custrecord_aio_cache_status'); // 保存之前的订单状态
    }
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit (context) {
      // try {
      //   var curr = context.newRecord
      //   log.debug('curr', JSON.stringify(curr))
      //   var cur_type = curr.type
      //   switch (cur_type) {
      //     case 'customrecord_aio_order_import_cache':
      //       GetItemInfo(curr)
      //       break
      //     default:
      //       break
      //   }
      // } catch (e) {
      //   log.error('error:', e)
      // }
    }
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit (context) {
      try {
        var curr = context.newRecord,fs = []
        var item_obj = curr.getValue('custrecord_amazonorder_iteminfo')

        search.create({
          type: 'customrecord_amazon_item_lines',
          filters: [
            {name: 'custrecord_aitem_rel_cahce',operator: 'anyof',values: curr.id }
          ]
        }).run().each(function (e) {
          fs.push(e.id)
          return true
        })
        log.debug('item_objs', item_obj)

        if (!item_obj) {
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
      } catch(e) {
        log.error('error:', e)
      }
    }
    /**
     * 获取亚马逊的货品信息
     */
    function GetItemInfo (curr) {
      if (curr.getValue('custrecord_aio_cache_status') != ord_sta1 || !curr.getValue('custrecord_amazonorder_iteminfo')) {
        var auth = core.amazon.getAuthByAccountId(curr.getValue('custrecord_aio_cache_acc_id'))
        var line_items = core.amazon.getOrderItems(auth, curr.getValue('custrecord_aio_cache_order_id'))
        curr.setValue({
          fieldId: 'custrecord_amazonorder_iteminfo',
          value: JSON.stringify(line_items)
        })

        // set fields start
        var iteminfo = line_items[0]
        curr.setValue({fieldId: 'custrecord_dps_cache_cod_fee',value: iteminfo.cod_fee})
        curr.setValue({fieldId: 'custrecord_dps_cache_cod_fee_discount',value: iteminfo.cod_fee_discount})
        curr.setValue({fieldId: 'custrecord_dps_cache_promotion_ids',value: iteminfo.promotion_ids})
        curr.setValue({fieldId: 'custrecord_dps_cache_qty',value: iteminfo.qty})
        curr.setValue({fieldId: 'custrecord_dps_cache_promotion_discount',value: iteminfo.promotion_discount})
        curr.setValue({fieldId: 'custrecord_dps_cache_is_gift',value: iteminfo.is_gift})
        curr.setValue({fieldId: 'custrecord_dps_cache_asin',value: iteminfo.asin})
        curr.setValue({fieldId: 'custrecord_dps_cache_seller_sku',value: iteminfo.seller_sku })
        curr.setValue({fieldId: 'custrecord_dps_cache_order_item_id',value: iteminfo.order_item_id})
        curr.setValue({fieldId: 'custrecord_dps_cache_item_price',value: iteminfo.item_price})
        curr.setValue({fieldId: 'custrecord_dps_cache_item_tax',value: iteminfo.item_tax})
        curr.setValue({fieldId: 'custrecord_dps_cache_shipping_price',value: iteminfo.shipping_price})
        curr.setValue({fieldId: 'custrecord_dps_cache_gift_wrap_price',value: iteminfo.gift_wrap_price})
        curr.setValue({fieldId: 'custrecord_dps_cache_shipping_tax',value: iteminfo.shipping_tax})
        curr.setValue({fieldId: 'custrecord_dps_cache_shipping_discount',value: iteminfo.shipping_discount})

        log.debug('order_id:' + curr.getValue('custrecord_aio_cache_acc_id'), line_items)
      }

      // set fields end

    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    }
  })
