/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', '../Helper/interfunction.min', 'N/runtime', '../../Rantion/Helper/tool.li.js', '../../Rantion/Helper/config.js'],

  function (log, search, record, interfun, runtime, tool, config) {
    const adjAccount = 538 // 6601.49	 报损
    const MXwarehous = 4 // 美西仓
    const url = config.WMS_Debugging_URL + '/inMaster'
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object}
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData () {
      var orders = [],limit = 3000
      var acc = runtime.getCurrentScript().getParameter({
        name: 'custscript_defect_acc'
      })
      var group = runtime.getCurrentScript().getParameter({
        name: 'custscript_defect_group'
      })
      var fils = []
      if (acc) {
        fils.push({ name: 'custrecord_remo_shipment_account', operator: 'anyof', values: acc })
      }
      if (group) {
        fils.push({ name: 'custrecord_aio_getorder_group',join: 'custrecord_remo_shipment_account', operator: 'anyof', values: group })
      }
      fils.push({ name: 'custrecord_aio_rmv_disposition', operator: 'is', values: 'Sellable'})
      fils.push({ name: 'custrecord_aio_rmv_ck', operator: 'is', values: false})
      fils.push({ name: 'custrecord_aio_removal_shoment_date', operator: 'onorafter', values: '2020-6-1'})
      search.create({
        type: 'customrecord_aio_amazon_removal_shipment',
        filters: fils,
        columns: [
          { name: 'custrecord_remo_shipment_account' },
          { name: 'custrecord_aio_rmv_date' },
          { name: 'custrecord_aio_rmv_disposition' },
          { name: 'custrecord_aio_rmv_shipped_qty' },
          { name: 'custrecord_aio_rmv_sku' },
          { name: 'custrecord_division',join: 'custrecord_remo_shipment_account' },
          { name: 'custrecord_aio_subsidiary',join: 'custrecord_remo_shipment_account' },
          { name: 'custrecord_aio_fbaorder_location',join: 'custrecord_remo_shipment_account' },
          { name: 'custrecord_aio_rmv_order_id' }
        ]
      }).run().each(function (rec) {
        orders.push({
          'rec_id': rec.id,
          'acc': rec.getValue(rec.columns[0]),
          'date': rec.getValue(rec.columns[1]),
          'desc': rec.getValue(rec.columns[2]),
          'qty': rec.getValue(rec.columns[3]),
          'sku': rec.getValue(rec.columns[4]),
          'division': rec.getValue(rec.columns[5]),
          'subsidiary': rec.getValue(rec.columns[6]),
          'location': rec.getValue(rec.columns[7]),
          'orderid': rec.getValue(rec.columns[8]),
          'rec_type': 'customrecord_aio_amazon_removal_shipment',
          'ck_filed': 'custrecord_aio_rmv_ck'
        })
        return --limit > 0
      })
      log.audit('orders:' + orders.length, orders)
      return orders
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map (context) {
      var startT = new Date().getTime()
      var obj = JSON.parse(context.value)
      var rec_type = obj.rec_type
      try {
        if (rec_type == 'customrecord_aio_amazon_removal_shipment') {
          var t_ord,ord_status,t_ord_id
          search.create({
            type: 'transferorder',
            filters: [
              {name: 'custbody_rel_removal_shipment',operator: 'anyof',values: obj.rec_id},
              {name: 'transferlocation',  operator: 'noneof', values: MXwarehous}
            ],
            columns: ['status']
          }).run().each(function (fd) {
            ord_status = fd.getValue('status')
            t_ord_id = fd.id
          // t_ord = record.load({
          //   type: 'transferorder',
          //   id: fd.id
          // })
          })
          log.audit('TO status:', ord_status)
          log.audit('TO t_ord:', t_ord)
          // 移除出库，做调拨单
          var fulfilmentDate = interfun.getFormatedDate('', '', obj.date).date
          var XNlocation // 虚拟在途仓
          search.create({
            type: 'location',
            filters: [
              {name: 'subsidiary',operator: 'anyof',values: obj.subsidiary} ,
              {name: 'custrecord_dps_financia_warehous',operator: 'anyof',values: 5} // 财务分仓类型,虚拟在途仓
            ]
          }).run().each(function (fd) {
            XNlocation = fd.id
          })
          if (!t_ord_id) {
            t_ord_id = createTO(obj, fulfilmentDate, obj.location, XNlocation) // 5 虚拟在途仓
            log.debug('移库 创建第一段调拨单 FBA -> 在途仓 成功：' + t_ord_id)

            var to_fulfillment = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id,
              toType: 'itemfulfillment'
            })
            to_fulfillment.setText({ fieldId: 'trandate', text: fulfilmentDate})
            to_fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' })
            var to_fulfillment_id = to_fulfillment.save()
            log.audit('第一段 自动发货 成功', to_fulfillment_id)
            var to_itemreceipt = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id,
              toType: 'itemreceipt'
            })
            to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
            var to_itemreceipt_id = to_itemreceipt.save()
            log.audit('第一段 自动收货 成功', to_itemreceipt_id)
          }else if (t_ord_id && ord_status == 'pendingFulfillment') {
            var to_fulfillment = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id,
              toType: 'itemfulfillment'
            })
            to_fulfillment.setText({ fieldId: 'trandate', text: fulfilmentDate})
            to_fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' })
            var to_fulfillment_id = to_fulfillment.save()
            log.audit('第一段 自动发货 成功', to_fulfillment_id)
            var to_itemreceipt = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id,
              toType: 'itemreceipt'
            })
            to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
            to_itemreceipt.save()
          }else if (t_ord_id && ord_status == 'pendingReceipt') {
            var to_itemreceipt = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id,
              toType: 'itemreceipt'
            })
            to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
            var to_itemreceipt_id = to_itemreceipt.save()
            log.audit('第一段 自动收货 成功', to_itemreceipt_id)
          }
          log.audit('开始创建第二阶段调拨 在途 -> 美西')
          var t_ord_id2,t_ord2,ord_status2
          search.create({
            type: 'transferorder',
            filters: [
              {name: 'custbody_rel_removal_shipment',operator: 'anyof',values: obj.rec_id},
              {name: 'transferlocation',  operator: 'anyof', values: MXwarehous}
            ],
            columns: ['status']
          }).run().each(function (fd) {
            ord_status2 = fd.getValue('status')
            t_ord_id2 = fd.id
          // t_ord2 = record.load({
          //   type: 'transferorder',
          //   id: fd.id
          // })
          })
          if (!t_ord_id2) {
            t_ord_id2 = createTO(obj, fulfilmentDate, XNlocation, MXwarehous)
            var to_fulfillment = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id2,
              toType: 'itemfulfillment'
            })
            to_fulfillment.setText({ fieldId: 'trandate', text: fulfilmentDate})
            to_fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' })
            var to_fulfillment_id = to_fulfillment.save()
            log.audit('第二段 自动发货 成功', to_fulfillment_id)

            var to_wms_message = tool.tranferOrderToWMS(t_ord_id2, url)
            if (to_wms_message.code == 0) { // 推送成功，开始收货
              var to_itemreceipt = record.transform({
                fromType: 'transferorder',
                fromId: t_ord_id2,
                toType: 'itemreceipt'
              })
              to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
              var to_itemreceipt_id = to_itemreceipt.save()
              log.audit('第二段 自动收货 成功', to_itemreceipt_id)
            }
          }else if (t_ord_id2 && ord_status2 == 'pendingFulfillment') {
            var to_fulfillment = record.transform({
              fromType: 'transferorder',
              fromId: t_ord_id2,
              toType: 'itemfulfillment'
            })
            to_fulfillment.setText({ fieldId: 'trandate', text: fulfilmentDate})
            to_fulfillment.setValue({ fieldId: 'shipstatus', value: 'C' })
            var to_fulfillment_id = to_fulfillment.save()
            log.audit('第二段 自动发货 成功', to_fulfillment_id)
            var to_wms_message = tool.tranferOrderToWMS(t_ord_id2, url)
            if (to_wms_message.code == 0) { // 推送成功，开始收货
              var to_itemreceipt = record.transform({
                fromType: 'transferorder',
                fromId: t_ord_id2,
                toType: 'itemreceipt'
              })
              to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
              var to_itemreceipt_id = to_itemreceipt.save()
              log.audit('第二段 自动收货 成功', to_itemreceipt_id)
            }
          }else if (t_ord_id2 && ord_status2 == 'pendingReceipt') {
            var to_wms_message = tool.tranferOrderToWMS(t_ord_id2, url)
            if (to_wms_message.code == 0) { // 推送成功，开始收货
              var to_itemreceipt = record.transform({
                fromType: 'transferorder',
                fromId: t_ord_id2,
                toType: 'itemreceipt'
              })
              to_itemreceipt.setText({ fieldId: 'trandate', text: fulfilmentDate})
              var to_itemreceipt_id = to_itemreceipt.save()
              log.audit('第二段 自动收货 成功', to_itemreceipt_id)
            }
          }

          var filds = {}
          filds[obj.ck_filed] = true
          record.submitFields({
            type: obj.rec_type,
            id: obj.rec_id,
            values: filds
          })
        }
      } catch(e) {
        log.error('出错', e)
      }
      var ss = '耗时：' + (new Date().getTime() - startT)
      log.audit('obj.rec_id:' + obj.rec_id, ss)
    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce (context) {
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize (summary) {
      log.audit('处理完成 summary', summary)
    }
    function createTO (obj, trandate, StartLocation, EndLocation) {
      t_ord = record.create({
        type: 'transferorder',
        isDynamic: true
      })
      try {
        t_ord.setValue({ fieldId: 'customform', value: 57}) // 指定为标准表
      } catch(e) {}

      t_ord.setValue({ fieldId: 'orderstatus', value: 'B' }) // 默认设置待履行
      t_ord.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
      t_ord.setValue({ fieldId: 'location', value: StartLocation })
      t_ord.setText({ fieldId: 'trandate', text: trandate})
      // t_ord.setValue({ fieldId: 'custbody_dps_start_location', value: obj.location })  
      t_ord.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc})
      t_ord.setValue({ fieldId: 'department',value: obj.division })
      t_ord.setValue({ fieldId: 'custbody_rel_removal_shipment', value: obj.rec_id})
      t_ord.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc})
      t_ord.setValue({ fieldId: 'memo', value: 'FBA调拨货物出库（' + obj.orderid + '）' })

      t_ord.setValue({fieldId: 'transferlocation',value: EndLocation})
      // t_ord.setValue({fieldId: 'custbody_actual_target_warehouse',value: tran_location })
      t_ord.setValue({fieldId: 'custbody_dps_transferor_type',value: 4}) // 类型是移库
      // t_ord.setValue({fieldId: 'employee',value: runtime.getCurrentUser().id})
      t_ord.selectNewLine({ sublistId: 'item' })
      var rs = interfun.getskuId(obj.sku, obj.acc, '')
      t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: rs.skuid})
      t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: obj.qty})
      t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: rs.averagecost})
      t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: obj.sku})
      try {
        t_ord.commitLine({ sublistId: 'item' })
      } catch (err) {
        throw (
        'Error inserting item line: ' +
        ', abort operation!' +
        errf
        )
      }
      var t_ord_id = t_ord.save({
        // enableSourcing: true,
        ignoreMandatoryFields: true
      })
      return t_ord_id
    }
    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
