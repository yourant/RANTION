/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', '../Helper/interfunction.min', 'N/runtime'],

  function (log, search, record, interfun, runtime) {
    const adjAccount = 538 // 6601.49	 报损
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
      var fils = [
        { name: 'custrecord_aio_b2c_return_detailed_disp', operator: 'isnot', values: 'SELLABLE' },
        { name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: '2020-6-1' },
        { name: 'custrecord_return_bs', operator: 'is', values: false }
      ]
      if (acc) {
        fils.push({ name: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: acc })
      }
      if (group) {
        fils.push({ name: 'custrecord_aio_getorder_group',join: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: group })
      }
      // 退货报告
      search.create({
        type: 'customrecord_aio_amazon_customer_return',
        filters: fils,
        columns: [
          { name: 'custrecord_aio_b2c_return_aio_account' },
          { name: 'custrecord_amazon_returndate_text' },
          { name: 'custrecord_aio_b2c_return_detailed_disp' },
          { name: 'custrecord_aio_b2c_return_quantity' },
          { name: 'custrecord_aio_b2_creturn_sku' },
          { name: 'custrecord_division',join: 'custrecord_aio_b2c_return_aio_account' },
          { name: 'custrecord_aio_subsidiary',join: 'custrecord_aio_b2c_return_aio_account' },
          { name: 'custrecord_aio_fbaorder_location',join: 'custrecord_aio_b2c_return_aio_account' }

        ]
      }).run().each(function (rec) {
        orders.push({
          'rec_id': rec.id,
          'acc': rec.getValue(rec.columns[0]),
          'date': rec.getValue(rec.columns[1]),
          'desc': rec.getValue(rec.columns[2]),
          'qty': - Number(rec.getValue(rec.columns[3])),
          'sku': rec.getValue(rec.columns[4]),
          'division': rec.getValue(rec.columns[5]),
          'subsidiary': rec.getValue(rec.columns[6]),
          'location': rec.getValue(rec.columns[7]),
          'rec_type': 'customrecord_aio_amazon_customer_return',
          'ck_filed': 'custrecord_return_bs'
        })
        return --limit > 0
      })
      // ==================搜索库存动作详情
      limit = 3000
      fils = []
      if (acc) {
        fils.push({ name: 'custrecord_invful_account', operator: 'anyof', values: acc })
      }
      if (group) {
        fils.push({ name: 'custrecord_aio_getorder_group',join: 'custrecord_invful_account', operator: 'anyof', values: group })
      }
      fils.push({ name: 'custrecord_invful_transation_type', operator: 'is', values: 'VendorReturns'})
      fils.push({ name: 'custrecord_dps_invful_processed', operator: 'is', values: false})
      search.create({
        type: 'customrecord_amazon_fulfill_invtory_rep',
        filters: fils,
        columns: [
          { name: 'custrecord_invful_account' },
          { name: 'custrecord_invful_snapshot_date_txt' },
          { name: 'custrecord_invful_disposition' },
          { name: 'custrecord_invful_quantity' },
          { name: 'custrecord_invful_sku' },
          { name: 'custrecord_division',join: 'custrecord_invful_account' },
          { name: 'custrecord_aio_subsidiary',join: 'custrecord_invful_account' },
          { name: 'custrecord_aio_fbaorder_location',join: 'custrecord_invful_account' }
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
          'rec_type': 'customrecord_amazon_fulfill_invtory_rep',
          'ck_filed': 'custrecord_dps_invful_processed'
        })
        return --limit > 0
      })

      // ===================搜索移除货件
      limit = 3000
      fils = []
      if (acc) {
        fils.push({ name: 'custrecord_remo_shipment_account', operator: 'anyof', values: acc })
      }
      if (group) {
        fils.push({ name: 'custrecord_aio_getorder_group',join: 'custrecord_remo_shipment_account', operator: 'anyof', values: group })
      }
      fils.push({ name: 'custrecord_aio_rmv_disposition', operator: 'is', values: 'Sellable'})
      fils.push({ name: 'custrecord_aio_rmv_ck', operator: 'is', values: false})
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
          // 移除出库，做调拨单
          var t_ord = record.create({
            type: 'transferorder',
            isDynamic: true
          })
          t_ord.setValue({ fieldId: 'subsidiary', value: obj.subsidiary })
          t_ord.setValue({ fieldId: 'location', value: obj.location })
          t_ord.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date})
          t_ord.setValue({ fieldId: 'custbody_dps_start_location', value: obj.location })
          t_ord.setValue({ fieldId: 'custbody_order_locaiton', value: obj.acc})
          t_ord.setValue({fieldId: 'department',value: obj.division })
          t_ord.setValue({ fieldId: 'custbody_rel_removal_shipment', value: obj.rec_id})
          t_ord.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc})
          t_ord.setValue({ fieldId: 'memo', value: 'FBA调拨货物出库（' + obj.orderid + '）' })
          t_ord.setValue({fieldId: 'transferlocation',value: 4}); // 梅西仓
          t_ord.setValue({fieldId: 'custbody_actual_target_warehouse',value: 4 })
          t_ord.setValue({fieldId: 'custbody_dps_transferor_type',value: 4}) // 类型是移库
          t_ord.setValue({fieldId: 'employee',value: runtime.getCurrentUser().id})
          t_ord.selectNewLine({ sublistId: 'item' })
          var rs = interfun.getskuId(obj.sku, obj.acc, '')
          t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'item',value: rs.skuid})
          t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: obj.qty})
          t_ord.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate',value: rs.averagecost})
          // 其他字段
          try {
            t_ord.commitLine({ sublistId: 'item' })
          } catch (err) {
            throw (
            'Error inserting item line: ' +
            ', abort operation!' +
            err
            )
          }
          var t_ord_id = t_ord.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
          })
          log.debug('移库 创建调拨单成功：' + t_ord_id)
          var filds = {}
          filds[obj.ck_filed] = true
          record.submitFields({
            type: obj.rec_type,
            id: obj.rec_id,
            values: filds
          })
        }else {
          var rec = record.create({type: 'inventoryadjustment',isDynamic: true})
          rec.setValue({fieldId: 'subsidiary',value: obj.subsidiary})
          rec.setValue({fieldId: 'account',value: adjAccount })
          rec.setValue({fieldId: 'department',value: obj.division })
          rec.setValue({fieldId: 'custbody_order_locaiton',value: obj.acc })
          rec.setValue({ fieldId: 'custbody_inv_item_ls', value: obj.desc})
          rec.setValue({ fieldId: 'memo', value: 'FBA仓报损'})
          if (obj.rec_type == 'customrecord_aio_amazon_customer_return') {
            // 退货报告
            rec.setValue({ fieldId: 'custbody_origin_customer_return_order', value: obj.rec_id})
          }else {
            // 来源库存动作详情
            rec.setValue({ fieldId: 'custbody_rel_fulfillment_invreq', value: obj.rec_id})
          }
          rec.setText({ fieldId: 'trandate', text: interfun.getFormatedDate('', '', obj.date).date })
          rec.selectNewLine({sublistId: 'inventory'})
          rec.setCurrentSublistValue({sublistId: 'inventory',fieldId: 'item',value: interfun.getskuId(obj.sku, obj.acc).skuid})
          rec.setCurrentSublistValue({sublistId: 'inventory',fieldId: 'location',value: obj.location})
          rec.setCurrentSublistValue({sublistId: 'inventory',fieldId: 'adjustqtyby',value: obj.qty})
          rec.setCurrentSublistValue({sublistId: 'inventory',fieldId: 'newquantity',value: obj.qty})
          rec.commitLine({sublistId: 'inventory'})
          var inventoryadjustment_save = rec.save({
            ignoreMandatoryFields: true
          })
          log.debug('库存调整成功', inventoryadjustment_save)
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

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
