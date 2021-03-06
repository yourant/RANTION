/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/format', 'N/runtime', './Helper/core.min', './Helper/Moment.min', 'N/log', 'N/search',
  'N/record', 'N/transaction', './Helper/interfunction.min', './Helper/fields.min', 'N/xml'
], function (format, runtime, core, moment, log, search, record, loactionPre, interfun, fiedls, xml) {
  function _get (context) {
    log.debug('get context:', context)
    var startT = new Date().getTime()
    switch (context.op) {
      case 'inv_getData':
        var limit = 4000,rs = []
        var acc = context.acc
        search.create({
          type: 'invoice',
          filters: [
            {name: 'department', operator: 'anyof',values: '@NONE@'},
            {name: 'custbody_aio_is_aio_order', operator: 'is',values: true},
            {name: 'custbody_aio_account',operator: 'anyof',values: ['78', '79', '80', '81', '82', '519', '164', '165']}
          ]
        }).run().each(function (e) {
          rs.push(e.id)
        })
        return rs
      case 'inv_dept':
        var inv_id = context.inv_id
        // var invs = getInputData(acc)
        var inv = record.load({type: 'invoice',id: inv_id})
        var len = inv.getLineCount({sublistId: 'item'})
        var oid = inv.getValue('otherrefnum')
        var acc = inv.getValue('custbody_order_locaiton'),objItem,dept
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
          var skuid = interfun.getskuId(line.seller_sku.trim(), acc, oid).skuid
          seller[skuid] = line.seller_sku.trim()
        })
        for (var i = 0;i < len;i++) {
          var itemid = inv.getSublistValue({sublistId: 'item',fieldId: 'item',line: i})
          inv.setSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: seller[itemid],line: i})
        }
        var ss = inv.save({ ignoreMandatoryFields: true})
        log.audit('发票保存成功', ss)
        ss = 'success :' + ss + ', 耗时：' + (new Date().getTime() - startT)
        return ss
        break
      case 'setsetllementAcc_Deal': // 处理店铺信息
        var acc = context.acc
        var group = context.acc_group
        log.debug('group', group)
        log.debug('acc', acc)
        //  core.amazon.getReportAccountList(group).map(function(account){
        //     log.audit(account.id)
        var ff = DealSettlment(group, acc)
        ff = ff + ',' + acc + ', 耗时：' + (new Date().getTime() - startT)
        log.debug('rs:', ff + ', 耗时：' + (new Date().getTime() - startT))
        //    ss += ",success ，group：" +group+ " 耗时：" + (new Date().getTime() - startT)
        return ff
      case 'pullorder_GetAcc':
        var group = context.acc_group
        var last_updated_after = context.last_updated_after
        var last_updated_before = context.last_updated_before
        //  core.amazon.getReportAccountList(group).map(function(account){
        //     log.audit(account.id)
        var ff = []
        // core.amazon.getAccountList(group).map(function (acc) {
        //   ff.push(acc.id)
        // })
        core.amazon.getReportAccountList(group).map(function (acc) {
          ff.push(acc.id)
        })
        //  })
        log.debug('rs:', ff)
        //    ss += ",success ，group：" +group+ " 耗时：" + (new Date().getTime() - startT)
        return ff
        break
      case 'dept_getdata':
        var acc = context.acc,ord = []
        var limit = 4000
        search.create({
          type: 'itemfulfillment',
          filters: [
            {name: 'taxline',operator: 'is',values: false},
            {name: 'mainline',operator: 'is',values: false},
            {name: 'custcol_aio_amazon_msku',operator: 'isempty'},
            {name: 'custbody_aio_is_aio_order',operator: 'is',values: true},
            {name: 'account',operator: 'anyof',values: ['214']},
            {name: 'custbody_aio_account',operator: 'anyof',values: ['78', '79', '80', '81', '82', '519', '164', '165']}
          ]
        }).run().each(function (e) {
          ord.push(e.id)
          return --limit > 0
        })
        return ord
        break
      case 'dept_dealord':
        var oid = context.oid,ord = []
        var rs,acc,objItem,dept
        try {
          var inv = record.load({type: context.type,id: oid})
          var len = inv.getLineCount({sublistId: 'item'})
          var orderid
          search.create({
            type: 'salesorder',
            filters: [
              {name: 'internalidnumber',operator: 'equalto',values: inv.getValue('createdfrom')}
            ],columns: ['otherrefnum']
          }).run().each(function (e) {
            orderid = e.getValue('otherrefnum')
          })
          acc = inv.getValue('custbody_aio_account')
          search.create({
            type: 'customrecord_aio_order_import_cache',
            filters: [
              { name: 'custrecord_aio_cache_acc_id', operator: search.Operator.ANYOF,values: acc},
              { name: 'custrecord_aio_cache_order_id',operator: 'is',values: orderid}
            ],columns: [{name: 'custrecord_amazonorder_iteminfo'} , { name: 'custrecord_division',join: 'custrecord_aio_cache_acc_id'}]
          }).run().each(function (ds) {
            objItem = JSON.parse(ds.getValue('custrecord_amazonorder_iteminfo'))
            dept = ds.getValue(ds.columns[1])
          })
          try {
            inv.setValue({fieldId: 'department',value: dept})
          } catch(e) {}

          var seller = {}
          objItem.map(function (line) {
            var skuid = interfun.getskuId(line.seller_sku.trim(), acc, orderid).skuid
            seller[skuid] = line.seller_sku.trim()
          })
          for (var i = 0;i < len;i++) {
            var itemid = inv.getSublistValue({sublistId: 'item',fieldId: 'item',line: i})
            inv.setSublistValue({sublistId: 'item',fieldId: 'department',value: dept,line: i})
            inv.setSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: seller[itemid],line: i})
          }
          rs = inv.save({ ignoreMandatoryFields: true})
          log.audit('发票保存成功', rs)
        } catch(e) {
          log.error('出错拉', e)
          rs = e.message
        }
        rs = ' 耗时：' + (new Date().getTime() - startT) + ',acc:' + acc + ' ，oid:' + oid + ' ， ' + rs
        return rs
        break
      case 'fin_inv': // 处理发票关联财务报告
        var acc = context.acc,ord = [],limit = 3
        var fils = [
          ['custbody_fin_rel_inv_ck', 'is', 'F'],
          'and',
          ['memomain', 'is', '预估'],
          'and',
          ['custbody_order_locaiton', 'anyof', [acc]]
        ]
        search.create({
          type: 'journalentry',
          filters: fils,
          columns: [
            {name: 'custbody_relative_finanace_report',summary: 'GROUP'},
            {name: 'internalid',summary: 'GROUP'},
            {name: 'internalid',join: 'CUSTBODY_REL_SALESORDER',summary: 'GROUP'}
          ]
        }).run().each(function (e) {
          ord.push({fin: e.getValue(e.columns[0]), 'oid': e.getValue(e.columns[1]),'so_id': e.getValue(e.columns[2])})
          return --limit > 0
        })
        // search.load({id: 'customsearch437'}).run().each(function (e) {
        //   ord.push({fin: e.getValue(e.columns[0]), 'oid': e.id,so_id: e.getValue(e.columns[1])})
        //   return --limit > 0
        // })
        log.debug('ord', ord)
        return ord
      case 'fin_invDeal': // 处理发票关联财务报告
        var obj = JSON.parse(context.oid),ord = [],limit = 4000
        log.debug('obj', obj)
        var rec_finance = record.load({type: 'customrecord_amazon_listfinancialevents',id: obj.fin})
        order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
        orderitemid = rec_finance.getValue('custrecord_orderitemid')
        pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account')
        postdate = rec_finance.getValue('custrecord_posteddate_txt') // 去财务报告的发布日期
        var pos_obj = interfun.getFormatedDate('', '', postdate, '', true)
        postdate = pos_obj.date
        var fils = [],sku = rec_finance.getValue('custrecord_sellersku'),qty = rec_finance.getValue('custrecord_quantityshipped')
        fils.push({ name: 'mainline', operator: 'is', values: false })
        fils.push({ name: 'taxline', operator: 'is', values: false })
        fils.push({ name: 'createdfrom', operator: 'anyof', values: obj.so_id })
        // fils.push({ name: 'custbody_dps_finance_report', operator: 'anyof', values: '@NONE@' })
        orderitemid ? fils.push({ name: 'custrecord_amazon_order_item_id',join: 'custbody_shipment_report_rel', operator: 'is', values: orderitemid}) : ''
        log.debug('fils:' + postdate, JSON.stringify(fils))
        var inv_id
        search.create({
          type: 'invoice',
          filters: fils,
          columns: [
            {name: 'quantity',summary: 'sum'},
            {name: 'internalid',summary: 'group'}
          ]
        }).run().each(function (rec) {
          log.debug('查看发票的数量 ：' + rec.getValue(rec.columns[0]), qty)
          if (rec.getValue(rec.columns[0]) == qty) {
            inv_id = rec.getValue(rec.columns[1])
          }
          return true
        })
        if (inv_id) {
          record.submitFields({
            type: 'invoice',
            id: inv_id,
            values: {
              custbody_dps_finance_report: obj.fin
            }
          })
          record.submitFields({
            type: 'journalentry',
            id: obj.oid,
            values: {
              custbody_fin_rel_inv_ck: true
            }
          })
          log.debug('找到了', inv_id)
          rs = 'OK :' + inv_id
        }else {
          log.error('出错了找不到')
          rs = '出错了找不到 ' + obj.oid
        }
        rs = rs + '; 耗时：' + (new Date().getTime() - startT)
        return rs
      case 'settle_getData':
        var acc = context.acc,ord = [],limit = 4000
        search.create({
          type: 'journalentry',
          filters: [
            {name: 'memomain',operator: 'is',values: '结算'},
            {name: 'custbody_order_locaiton',operator: 'anyof',values: acc},
            {name: 'custbody_kfak_depo',operator: 'is',values: true},
            {name: 'mainline',operator: 'is',values: true}
          ],columns: [
            {name: 'internalid',summary: 'group'},
            {name: 'custbody_amazon_settlementid',summary: 'group'},
            {name: 'custbody_jour_orderid',summary: 'group'},
            {name: 'custbody_order_locaiton',summary: 'group'}
          ]
        }).run().each(function (e) {
          ord.push({
            jo_id: e.getValue(e.columns[0]),
            settle_id: e.getValue(e.columns[1]).split('-')[0] + '',
            orderid: e.getValue(e.columns[2]),
            acc: e.getValue(e.columns[3])
          })
          return --limit > 0
        })
        log.audit('ord', ord)
        return ord
      case 'settle_DealData':

        var obj = JSON.parse(context.oid),ord = []
        var orderid = obj.orderid,settle_id = obj.settle_id,acc = obj.acc
        var principals = [],item_code,item_codes = [],orders = [],PT_Arrys = [],endDate,cl_date
        var princl = 0
        var fils = [
          ['custrecord_aio_sett_id', 'is', '' + settle_id],
          'and',
          ['custrecord_aio_sett_tran_type', 'isnot', 'Refund'],
          'and',
          ['custrecord_february_undeal', 'isnot', 'F'], // post date不是2月份之前
        ]
        log.audit('查看拿到的 orderid: ' + orderid, obj)
        fils.push('and')
        fils.push(['custrecord_aio_sett_order_id', 'is', orderid])
        search.create({
          type: 'customrecord_aio_amazon_settlement',
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id' },
            { name: 'custrecord_aio_sett_shipment_id' },
            { name: 'custrecord_aio_sett_tran_type' },
            { name: 'custrecord_aio_sett_start_date' },
            { name: 'custrecord_aio_sett_end_date' },
            { name: 'custrecord_aio_sett_posted_date_time' },
            { name: 'custrecord_aio_sett_amount_type' },
            { name: 'custrecord_aio_sett_amount_desc' },
            { name: 'custrecord_aio_sett_amount' },
            { name: 'custrecord_aio_sett_order_id' },
            { name: 'custrecord_aio_sett_deposit_date' },
            { name: 'custrecord_aio_sett_marketplace_name' },
            { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id' },
            { name: 'custrecord_aio_sett_currency' },
            { name: 'custrecord_aio_sett_order_item_code' }, // order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
            { name: 'custrecord_aio_sett_quantity_purchased' }

          ]
        }).run().each(function (rec) {
          currency_txt = rec.getValue('custrecord_aio_sett_currency')
          if (!endDate) {
            endDate = rec.getValue('custrecord_aio_sett_end_date')
            cl_date = interfun.getFormatedDate('', '', endDate)
          }
          // 修改于2020/5/16  16：00
          item_code = rec.getValue('custrecord_aio_sett_order_item_code')
          if (JSON.stringify(item_codes).indexOf(item_code) == -1)
            item_codes.push(item_code) // item_code 可能会在一份报告里面存着多个item_code
          var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type')
          var Amount_type = rec.getValue('custrecord_aio_sett_amount_type')
          var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc')
          var amount = rec.getValue('custrecord_aio_sett_amount')
          var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt)
          if (amount.indexOf(',') != -1) {
            amount = amount.replace(',', '.')
          }
          if (ck) {
            PT_Arrys.push(rec.id)
            principals.push({
              'rec_id': rec.id,
              'item_code': item_code,
              'Tranction_type': Tranction_type,
              'Amount_type': Amount_type,
              'Amount_desc': Amount_desc,
              'qty': rec.getValue('custrecord_aio_sett_quantity_purchased'),
              'amount': Math.round(amount * 100) / 100
            })
          }
          return true
        })
        var n = 0,amos = [],fls = {}
        principals.map(function (dsf) {
          fls = {}
          if ((dsf.Tranction_type == 'Order' && dsf.Amount_type == 'ItemPrice' && dsf.Amount_desc == 'Principal') || (n == 0)) {
            n++
            fls[dsf.item_code + '.' + dsf.qty] = dsf.amount
            fls['ck'] = true
            amos.push(fls)
          }else {
            amos[n - 1][dsf.item_code + '.' + dsf.qty] += dsf.amount
          }
        })
        log.debug('amos:::::', amos)
        PT_Arrys.map(function (pt) {
          record.submitFields({
            type: 'customrecord_aio_amazon_settlement',
            id: pt,
            values: {
              custrecord_payment_itemprice_pt: true,
              custrecord_settle_is_generate_voucher: false
            }
          })
        })
        var fils_inv = [
            ['mainline', 'is', false],
            'and',
            ['taxline', 'is', false],
            'and',
            ['otherrefnum', 'equalto', orderid],
            'and',
            ['custbody_aio_account', 'anyof', acc]
          ],fls = []
        var len_itco = item_codes.length,l_num = 0
        item_codes.map(function (ic) {
          if (ic)
            fls.push(
              ['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'is', ic]
          )
          else
            fls.push(
              ['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'isempty', '']
          )
          l_num++
          log.debug('l_num:' + l_num, 'len_itco: ' + len_itco)
          if (l_num < len_itco)
            fls.push('or')
        })
        var pricl = 1,ck = false
        search.create({
          type: 'invoice',
          filters: fils_inv,
          columns: [
            {name: 'internalid',summary: 'group'},
            {name: 'custrecord_amazon_order_item_id',join: 'custbody_shipment_report_rel',summary: 'group'},
            {name: 'quantity',summary: 'SUM'}
          ]
        }).run().each(function (e) {
          log.audit('查看发票:', e)
          ck = true
          amos.map(function (kl) {
            if (!ck) return
            if (kl['ck'] && kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]) {
              orders.push({
                inv_id: e.getValue(e.columns[0]),
                end_date: cl_date.date,
                depAmaount: kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]
              })
              ck = false
              kl['ck'] = false
              log.debug('已经用过，设置为false', kl)
              record.submitFields({
                type: 'invoice',
                id: e.getValue(e.columns[0]),
                values: {
                  custbody_dp_expected_due_date: cl_date.date,
                  custbody_setllement_depositamount: Math.round((kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]) * 100) / 100
                }
              })
            }
          })
          if (ck) {
            createSOTRMissingOrder(3, orderid, '结算凭证找不到对应的，发票ID：' + e.getValue(e.columns[0]), cl_date.date, acc)
          }
          return true
        })

        record.submitFields({
          type: 'journalentry',
          id: obj.jo_id,
          values: {
            custbody_settlement_inv_ids: JSON.stringify(orders),
            custbody_kfak_depo: false,
            custbody_jourentry_relative_checked: false
          }
        })
        rs = 'success : ' + JSON.stringify(obj) + '; 耗时：' + (new Date().getTime() - startT)
        return rs
      default:
        return context.op
        break
    }
  }

  function _post (context) {
    log.debug('post context:', context)
    var startT = new Date().getTime()
    switch (context.op) {
      case 'inv_getData':
        var limit = 4000,rs = []
        var acc = context.acc
        search.create({
          type: 'invoice',
          filters: [
            {name: 'department', operator: 'anyof',values: '@NONE@'},
            {name: 'custbody_aio_is_aio_order', operator: 'is',values: true},
            {name: 'custbody_aio_account',operator: 'anyof',values: ['78', '79', '80', '81', '82', '519', '164', '165']}
          ]
        }).run().each(function (e) {
          rs.push(e.id)
        })
        return rs
      case 'inv_dept':
        var inv_id = context.inv_id
        // var invs = getInputData(acc)
        var inv = record.load({type: 'invoice',id: inv_id})
        var len = inv.getLineCount({sublistId: 'item'})
        var oid = inv.getValue('otherrefnum')
        var acc = inv.getValue('custbody_order_locaiton'),objItem,dept
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
          var skuid = interfun.getskuId(line.seller_sku.trim(), acc, oid).skuid
          seller[skuid] = line.seller_sku.trim()
        })
        for (var i = 0;i < len;i++) {
          var itemid = inv.getSublistValue({sublistId: 'item',fieldId: 'item',line: i})
          inv.setSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: seller[itemid],line: i})
        }
        var ss = inv.save({ ignoreMandatoryFields: true})
        log.audit('发票保存成功', ss)
        ss = 'success :' + ss + ', 耗时：' + (new Date().getTime() - startT)
        return ss
        break
      case 'setsetllementAcc_Deal': // 处理店铺信息
        var acc = context.acc
        var group = context.acc_group
        log.debug('group', group)
        log.debug('acc', acc)
        //  core.amazon.getReportAccountList(group).map(function(account){
        //     log.audit(account.id)
        var ff = DealSettlment(group, acc)
        ff = ff + ',' + acc + ', 耗时：' + (new Date().getTime() - startT)
        log.debug('rs:', ff + ', 耗时：' + (new Date().getTime() - startT))
        //    ss += ",success ，group：" +group+ " 耗时：" + (new Date().getTime() - startT)
        return ff
      case 'pullorder_GetAcc':
        var acc = context.acc
        var group = context.acc_group
        var last_updated_after = context.last_updated_after
        var last_updated_before = context.last_updated_before
        //  core.amazon.getReportAccountList(group).map(function(account){
        //     log.audit(account.id)
        var ff = []
        core.amazon.getAccountList(group).map(function (acc) {
          ff.push(acc.id)
        })
        //  })
        log.debug('rs:', ff)
        //    ss += ",success ，group：" +group+ " 耗时：" + (new Date().getTime() - startT)
        return ff
        break
      case 'dept_getdata':
        var acc = context.acc,ord = []
        var limit = 4000
        search.create({
          type: 'itemfulfillment',
          filters: [
            {name: 'taxline',operator: 'is',values: false},
            {name: 'mainline',operator: 'is',values: false},
            {name: 'custcol_aio_amazon_msku',operator: 'isempty'},
            {name: 'custbody_aio_is_aio_order',operator: 'is',values: true},
            {name: 'account',operator: 'anyof',values: ['214']},
            {name: 'custbody_aio_account',operator: 'anyof',values: ['78', '79', '80', '81', '82', '519', '164', '165']}
          ]
        }).run().each(function (e) {
          ord.push(e.id)
          return --limit > 0
        })
        return ord
        break
      case 'dept_dealord':
        var oid = context.oid,ord = []
        var rs,acc,objItem,dept
        try {
          var inv = record.load({type: context.type,id: oid})
          var len = inv.getLineCount({sublistId: 'item'})
          var orderid
          search.create({
            type: 'salesorder',
            filters: [
              {name: 'internalidnumber',operator: 'equalto',values: inv.getValue('createdfrom')}
            ],columns: ['otherrefnum']
          }).run().each(function (e) {
            orderid = e.getValue('otherrefnum')
          })
          acc = inv.getValue('custbody_aio_account')
          search.create({
            type: 'customrecord_aio_order_import_cache',
            filters: [
              { name: 'custrecord_aio_cache_acc_id', operator: search.Operator.ANYOF,values: acc},
              { name: 'custrecord_aio_cache_order_id',operator: 'is',values: orderid}
            ],columns: [{name: 'custrecord_amazonorder_iteminfo'} , { name: 'custrecord_division',join: 'custrecord_aio_cache_acc_id'}]
          }).run().each(function (ds) {
            objItem = JSON.parse(ds.getValue('custrecord_amazonorder_iteminfo'))
            dept = ds.getValue(ds.columns[1])
          })
          try {
            inv.setValue({fieldId: 'department',value: dept})
          } catch(e) {}

          var seller = {}
          objItem.map(function (line) {
            var skuid = interfun.getskuId(line.seller_sku.trim(), acc, orderid).skuid
            seller[skuid] = line.seller_sku.trim()
          })
          for (var i = 0;i < len;i++) {
            var itemid = inv.getSublistValue({sublistId: 'item',fieldId: 'item',line: i})
            inv.setSublistValue({sublistId: 'item',fieldId: 'department',value: dept,line: i})
            inv.setSublistValue({sublistId: 'item',fieldId: 'custcol_aio_amazon_msku',value: seller[itemid],line: i})
          }
          rs = inv.save({ ignoreMandatoryFields: true})
          log.audit('发票保存成功', rs)
        } catch(e) {
          log.error('出错拉', e)
          rs = e.message
        }
        rs = ' 耗时：' + (new Date().getTime() - startT) + ',acc:' + acc + ' ，oid:' + oid + ' ， ' + rs
        return rs
        break
      case 'fin_inv': // 处理发票关联财务报告
        var acc = context.acc,ord = [],limit = 4000
        var fils = [
          ['custbody_fin_rel_inv_ck', 'is', 'F'],
          'and',
          ['memomain', 'is', '预估'],
          'and',
          ['custbody_order_locaiton', 'anyof', [acc]]
        ]
        search.create({
          type: 'journalentry',
          filters: fils,
          columns: [
            {name: 'custbody_relative_finanace_report',summary: 'GROUP'},
            {name: 'internalid',summary: 'GROUP'},
            {name: 'internalid',join: 'CUSTBODY_REL_SALESORDER',summary: 'GROUP'}
          ]
        }).run().each(function (e) {
          ord.push({fin: e.getValue(e.columns[0]), 'oid': e.getValue(e.columns[1]),'so_id': e.getValue(e.columns[2])})
          return --limit > 0
        })
        // search.load({id: 'customsearch437'}).run().each(function (e) {
        //   ord.push({fin: e.getValue(e.columns[0]), 'oid': e.id,so_id: e.getValue(e.columns[1])})
        //   return --limit > 0
        // })
        log.debug('ord', ord)
        return ord
      case 'fin_invDeal': // 处理发票关联财务报告
        var obj = JSON.parse(context.oid),ord = [],limit = 4000
        log.debug('obj', obj)
        var rec_finance = record.load({type: 'customrecord_amazon_listfinancialevents',id: obj.fin})
        order_id = rec_finance.getValue('custrecord_l_amazon_order_id')
        orderitemid = rec_finance.getValue('custrecord_orderitemid')
        pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account')
        postdate = rec_finance.getValue('custrecord_posteddate_txt') // 去财务报告的发布日期
        var pos_obj = interfun.getFormatedDate('', '', postdate, '', true)
        postdate = pos_obj.date
        var fils = [],sku = rec_finance.getValue('custrecord_sellersku'),qty = rec_finance.getValue('custrecord_quantityshipped')
        fils.push({ name: 'mainline', operator: 'is', values: false })
        fils.push({ name: 'taxline', operator: 'is', values: false })
        fils.push({ name: 'createdfrom', operator: 'anyof', values: obj.so_id })
        // fils.push({ name: 'custbody_dps_finance_report', operator: 'anyof', values: '@NONE@' })
        orderitemid ? fils.push({ name: 'custrecord_amazon_order_item_id',join: 'custbody_shipment_report_rel', operator: 'is', values: orderitemid}) : ''
        log.debug('fils:' + postdate, JSON.stringify(fils))
        var inv_id
        search.create({
          type: 'invoice',
          filters: fils,
          columns: [
            {name: 'quantity',summary: 'sum'},
            {name: 'internalid',summary: 'group'}
          ]
        }).run().each(function (rec) {
          log.debug('查看发票的数量 ：' + rec.getValue(rec.columns[0]), qty)
          if (rec.getValue(rec.columns[0]) == qty) {
            inv_id = rec.getValue(rec.columns[1])
          }
          return true
        })
        if (inv_id) {
          record.submitFields({
            type: 'invoice',
            id: inv_id,
            values: {
              custbody_dps_finance_report: obj.fin
            }
          })
          record.submitFields({
            type: 'journalentry',
            id: obj.oid,
            values: {
              custbody_fin_rel_inv_ck: true
            }
          })
          log.debug('找到了', inv_id)
          rs = 'OK :' + inv_id
        }else {
          log.error('出错了找不到')
          rs = '出错了找不到 ' + obj.oid
        }
        rs = rs + '; 耗时：' + (new Date().getTime() - startT)
        return rs
      case 'settle_getData':
        var acc = context.acc,ord = [],limit = 4000
        log.audit('查看拿到的ACC', acc)
        search.create({
          type: 'journalentry',
          filters: [
            {name: 'memomain',operator: 'is',values: '结算'},
            {name: 'custbody_order_locaiton',operator: 'anyof',values: acc},
            {name: 'custbody_kfak_depo',operator: 'is',values: true},
            {name: 'mainline',operator: 'is',values: true}
          ],columns: [
            {name: 'internalid',summary: 'group'},
            {name: 'custbody_amazon_settlementid',summary: 'group'},
            {name: 'custbody_jour_orderid',summary: 'group'},
            {name: 'custbody_order_locaiton',summary: 'group'}
          ]
        }).run().each(function (e) {
          ord.push({
            jo_id: e.getValue(e.columns[0]),
            settle_id: e.getValue(e.columns[1]).split('-')[0] + '',
            orderid: e.getValue(e.columns[2]),
            acc: e.getValue(e.columns[3])
          })
          return --limit > 0
        })
        log.audit('ord', ord)
        return ord
      case 'settle_DealData':

        var obj = JSON.parse(context.oid),ord = []
        var orderid = obj.orderid,settle_id = obj.settle_id,acc = obj.acc
        var principals = [],item_code,item_codes = [],orders = [],PT_Arrys = [],endDate,cl_date
        var princl = 0
        var fils = [
          ['custrecord_aio_sett_id', 'is', '' + settle_id],
          'and',
          ['custrecord_aio_sett_tran_type', 'isnot', 'Refund'],
          'and',
          ['custrecord_february_undeal', 'isnot', 'F'], // post date不是2月份之前
        ]
        log.audit('查看拿到的 orderid: ' + orderid, obj)
        fils.push('and')
        fils.push(['custrecord_aio_sett_order_id', 'is', orderid])
        search.create({
          type: 'customrecord_aio_amazon_settlement',
          filters: fils,
          columns: [
            { name: 'custrecord_aio_sett_id' },
            { name: 'custrecord_aio_sett_shipment_id' },
            { name: 'custrecord_aio_sett_tran_type' },
            { name: 'custrecord_aio_sett_start_date' },
            { name: 'custrecord_aio_sett_end_date' },
            { name: 'custrecord_aio_sett_posted_date_time' },
            { name: 'custrecord_aio_sett_amount_type' },
            { name: 'custrecord_aio_sett_amount_desc' },
            { name: 'custrecord_aio_sett_amount' },
            { name: 'custrecord_aio_sett_order_id' },
            { name: 'custrecord_aio_sett_deposit_date' },
            { name: 'custrecord_aio_sett_marketplace_name' },
            { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id' },
            { name: 'custrecord_aio_sett_currency' },
            { name: 'custrecord_aio_sett_order_item_code' }, // order item code 和shipment id作用相同，用order item code 更好查询（不用写公式区分大小写
            { name: 'custrecord_aio_sett_quantity_purchased' }

          ]
        }).run().each(function (rec) {
          currency_txt = rec.getValue('custrecord_aio_sett_currency')
          if (!endDate) {
            endDate = rec.getValue('custrecord_aio_sett_end_date')
            cl_date = interfun.getFormatedDate('', '', endDate)
          }
          // 修改于2020/5/16  16：00
          item_code = rec.getValue('custrecord_aio_sett_order_item_code')
          if (JSON.stringify(item_codes).indexOf(item_code) == -1)
            item_codes.push(item_code) // item_code 可能会在一份报告里面存着多个item_code
          var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type')
          var Amount_type = rec.getValue('custrecord_aio_sett_amount_type')
          var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc')
          var amount = rec.getValue('custrecord_aio_sett_amount')
          var ck = interfun.getArFee(Tranction_type, Amount_type, Amount_desc, currency_txt)
          if (amount.indexOf(',') != -1) {
            amount = amount.replace(',', '.')
          }
          if (ck) {
            PT_Arrys.push(rec.id)
            principals.push({
              'rec_id': rec.id,
              'item_code': item_code,
              'Tranction_type': Tranction_type,
              'Amount_type': Amount_type,
              'Amount_desc': Amount_desc,
              'qty': rec.getValue('custrecord_aio_sett_quantity_purchased'),
              'amount': Math.round(amount * 100) / 100
            })
          }
          return true
        })
        var n = 0,amos = [],fls = {}
        principals.map(function (dsf) {
          fls = {}
          if ((dsf.Tranction_type == 'Order' && dsf.Amount_type == 'ItemPrice' && dsf.Amount_desc == 'Principal') || (n == 0)) {
            n++
            fls[dsf.item_code + '.' + dsf.qty] = dsf.amount
            fls['ck'] = true
            amos.push(fls)
          }else {
            amos[n - 1][dsf.item_code + '.' + dsf.qty] += dsf.amount
          }
        })
        log.debug('amos:::::', amos)
        PT_Arrys.map(function (pt) {
          record.submitFields({
            type: 'customrecord_aio_amazon_settlement',
            id: pt,
            values: {
              custrecord_payment_itemprice_pt: true,
              custrecord_settle_is_generate_voucher: false
            }
          })
        })
        var fils_inv = [
            ['mainline', 'is', false],
            'and',
            ['taxline', 'is', false],
            'and',
            ['otherrefnum', 'equalto', orderid],
            'and',
            ['custbody_aio_account', 'anyof', acc]
          ],fls = []
        var len_itco = item_codes.length,l_num = 0
        item_codes.map(function (ic) {
          if (ic)
            fls.push(
              ['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'is', ic]
          )
          else
            fls.push(
              ['custbody_shipment_report_rel.custrecord_amazon_order_item_id', 'isempty', '']
          )
          l_num++
          log.debug('l_num:' + l_num, 'len_itco: ' + len_itco)
          if (l_num < len_itco)
            fls.push('or')
        })
        var pricl = 1,ck = false
        search.create({
          type: 'invoice',
          filters: fils_inv,
          columns: [
            {name: 'internalid',summary: 'group'},
            {name: 'custrecord_amazon_order_item_id',join: 'custbody_shipment_report_rel',summary: 'group'},
            {name: 'quantity',summary: 'SUM'}
          ]
        }).run().each(function (e) {
          log.audit('查看发票:', e)
          ck = true
          amos.map(function (kl) {
            if (!ck) return
            if (kl['ck'] && kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]) {
              orders.push({
                inv_id: e.getValue(e.columns[0]),
                end_date: cl_date.date,
                depAmaount: kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]
              })
              ck = false
              kl['ck'] = false
              log.debug('已经用过，设置为false', kl)
              record.submitFields({
                type: 'invoice',
                id: e.getValue(e.columns[0]),
                values: {
                  custbody_dp_expected_due_date: cl_date.date,
                  custbody_setllement_depositamount: Math.round((kl[e.getValue(e.columns[1]) + '.' + e.getValue(e.columns[2])]) * 100) / 100
                }
              })
            }
          })
          if (ck) {
            createSOTRMissingOrder(3, orderid, '结算凭证找不到对应的，发票ID：' + e.getValue(e.columns[0]), cl_date.date, acc)
          }
          return true
        })

        record.submitFields({
          type: 'journalentry',
          id: obj.jo_id,
          values: {
            custbody_settlement_inv_ids: JSON.stringify(orders),
            custbody_kfak_depo: false,
            custbody_jourentry_relative_checked: false
          }
        })
        rs = 'success : ' + JSON.stringify(obj) + '; 耗时：' + (new Date().getTime() - startT)
        return rs
      default:
        return context.op
        break
    }
  }

  function _put (context) {
  }

  function _delete (context) {
  }

  function DealSettlment (group_req, acc) {
    // var acc_arrys = [group_req],orders = []
    var acc_arrys = [],orders = []
    var fils = [],limit = 20
    fils = [
      ['custrecord_settlement_enddate', 'within', ['2020-6-1', '2020-6-30']],
      'and',
      ['custrecord_settlement_acc', 'anyof', '@NONE@'],
      'and',
      ['custrecord_aio_account_2.isinactive', 'is', 'F@'],
      'and',
      [
        ['custrecord_settlement_acc', 'anyof', '@NONE@'],
        'and',
        ['custrecord_is_manual', 'is', 'F']
      ]
    ]
    if (group_req) {
      core.amazon.getReportAccountList(group_req).map(function (ds) {
        acc_arrys.push(ds.id)
      })
      fils.push('and')
      fils.push(['custrecord_aio_account_2', 'anyof', acc_arrys])
      log.debug('DealSettlment group_req ' + group_req, acc_arrys)
    }
    if (acc) {
      fils.push('and')
      fils.push(['custrecord_aio_account_2', 'anyof', acc])
    }
    log.debug('DealSettlment fils', fils)
    search.create({
      type: 'customrecord_aio_amazon_settlement',
      filters: fils
    }).run().each(function (e) {
      orders.push(e.id)
      return --limit > 0
    })
    if (orders.length == 0) return '处理完成:' + group_req
    orders.map(function (dfs) {
      var setlle = record.load({type: 'customrecord_aio_amazon_settlement',id: dfs})
      var markt = setlle.getValue('custrecord_aio_sett_marketplace_name')
      var report_acc = setlle.getValue('custrecord_aio_account_2')
      if (!markt) {
        var settlement_id = setlle.getValue('custrecord_aio_sett_id')
        log.debug('markt不存在', 'markt: ' + markt + ',settlement_id: ' + settlement_id)
        search.create({
          type: 'customrecord_aio_amazon_settlement',
          filters: [
            {name: 'custrecord_aio_sett_id',operator: 'is',values: settlement_id},
            {name: 'custrecord_aio_sett_marketplace_name',operator: 'contains',values: 'Amazon.'}
          ],columns: [
            {name: 'custrecord_aio_sett_marketplace_name'}
          ]
        }).run().each(function (e) {
          markt = e.getValue('custrecord_aio_sett_marketplace_name')
        })
      }
      if (JSON.stringify(markt).indexOf('Amazon.') == -1) {
        log.debug('无法区分', 'markt: ' + markt + ',settlement_id: ' + settlement_id)
        var settlement_id = setlle.getValue('custrecord_aio_sett_id')
        search.create({
          type: 'customrecord_aio_amazon_settlement',
          filters: [
            {name: 'custrecord_aio_sett_id',operator: 'is',values: settlement_id},
            {name: 'custrecord_aio_sett_marketplace_name',operator: 'contains',values: 'Amazon.'}
          ],columns: [
            {name: 'custrecord_aio_sett_marketplace_name'}
          ]
        }).run().each(function (e) {
          markt = e.getValue('custrecord_aio_sett_marketplace_name')
        })
      }

      log.debug('拿到的markt: ' + markt)
      if (!markt || JSON.stringify(markt).indexOf('Amazon.') == -1) {
        setlle.setValue({fieldId: 'custrecord_is_manual',value: true})
        setlle.save()
        return
      }
      var account = interfun.GetstoreInEU(report_acc, markt, 'acc_text').acc
      log.debug('account,真实店铺', account)
      setlle.setValue({fieldId: 'custrecord_settlement_acc',value: account})
      setlle.save()
    })
    return orders
  }

  function Orderpull (acc, last_updated_after, last_updated_before) {
    var orders = []
    var ssd = core1.handleit(acc, last_updated_after, last_updated_before)
    if (!ssd)
      return '没有数据 店铺: ' + acc
    ssd.map(function (order) {
      orders.push(order)
    })
    orders.map(function (order) {
      log.debug('order:', order)
      // ====================进cache==============
      try {
        var r,r_id,ck = true
        search.create({
          type: 'customrecord_aio_order_import_cache',
          filters: [{
            name: 'custrecord_aio_cache_acc_id',
            operator: search.Operator.ANYOF,
            values: order.AccID
          },
            {
              name: 'custrecord_aio_cache_order_id',
              operator: search.Operator.IS,
              values: order.amazon_order_id
            }
          ],columns: ['custrecord_aio_cache_status']
        }).run().each(function (rec) {
          if (rec.getValue('custrecord_aio_cache_status') != 'Pending') {
            ck = false
          }
          r = record.load({
            type: 'customrecord_aio_order_import_cache',
            id: rec.id
          })
          r_id = rec.id
          return false
        })
        if (!ck) return
        if (!r) {
          r = record.create({
            type: 'customrecord_aio_order_import_cache',isDynamic: true
          })
        }
        var order_trandate = interfun.getFormatedDate('', '', order.purchase_date).date
        var last_update_date = interfun.getFormatedDate('', '', order.last_update_date).date

        r.setValue({
          fieldId: 'custrecord_aio_cache_acc_id',
          value: order.AccID
        })
        r.setValue({
          fieldId: 'custrecord_aio_cache_body',
          value: JSON.stringify(order)
        })
        r.setValue({
          fieldId: 'custrecord_aio_cache_order_id',
          value: order.amazon_order_id
        })
        r.setValue({
          fieldId: 'custrecord_aio_cache_resolved',
          value: false
        })
        r.setValue({
          fieldId: 'custrecord_aio_cache_status',
          value: order.order_status || ''
        })
        r.setValue({
          fieldId: 'custrecord_aio_cache_version',
          value: 1
        })
        r.setText({
          fieldId: 'custrecord_trandate_amazonorder',
          text: order_trandate
        })
        r.setValue({
          fieldId: 'custrecord_text_trandate',
          value: order.purchase_date
        })
        r.setText({
          fieldId: 'custrecord_amazon_last_update_date',
          text: last_update_date
        })
        r.setValue({fieldId: 'custrecord_dps_cache_fulfillment_channel',value: order.fulfillment_channel})
        r.setValue({fieldId: 'custrecord_shipment_date_cache',value: order.latest_ship_date})
        r.setValue({fieldId: 'custrecord_purchase_date_1',value: order.purchase_date})
        r.setValue({fieldId: 'custrecord_last_update_date',value: order.last_update_date})
        r.setText({fieldId: 'custrecordlatest_ship_date',text: interfun.getFormatedDate('', '', order.latest_ship_date).date})
        r.setValue({fieldId: 'custrecord_seller_order_id_1',value: order.seller_order_id })
        r.setValue({fieldId: 'custrecord_dps_cache_shipped_byamazont_f',value: order.shipped_byamazont_fm})
        // rec.selectNewLine({sublistId:"recmachcustrecord_aitem_rel_cahce"})
        // rec.setCurrentSublistText({sublistId:"recmachcustrecord_settlement_link",fieldId:field_id,text:values})
        var ss = r.save()
        log.debug('11cache save success：', ss)
      } catch (e) {
        log.error('import cache error', e)
        var mo
        search.create({
          type: 'customrecord_dps_transform_mo',
          filters: [{
            name: 'externalid',
            operator: 'is',
            values: externalid
          }]
        }).run().each(function (rec) {
          mo = record.load({
            type: 'customrecord_dps_transform_mo',
            id: rec.id
          })
          return false
        })
        if (!mo) {
          mo = record.create({
            type: 'customrecord_dps_transform_mo',
            isDynamic: true
          })
          mo.setValue({
            fieldId: 'externalid',
            value: acc + '' + order.amazon_order_id
          })
          mo.setValue({
            fieldId: 'custrecord_tr_missing_order_type',
            value: '拉单报错'
          })
          mo.setValue({
            fieldId: 'custrecord_missing_orderid_txt',
            value: order.amazon_order_id
          })
          mo.setValue({
            fieldId: 'custrecord_tracking_missing_acoount',
            value: acc
          })
          mo.setValue({
            fieldId: 'custrecord_tr_missing_order_reason',
            value: JSON.stringify(e)
          })
          mo.save()
        }
      }
    // =======================进cache==============end
    })
    return acc
  }

  // 亚马逊拉单方法 ==========================================================
  var core1 = {
    handleit: function (acc_id, last_after, last_before) {
      var hid, last_update_date, nextToken, h, orders, cut_token

      var enabled_sites
      if (last_after || last_before) {
        log.debug('是自定义时间')
        search.create({
          type: 'customrecord_aio_order_import_status',
          filters: [{
            name: 'custrecord_aio_importer_acc_id',
            operator: search.Operator.ANYOF,
            values: acc_id
          } ],
          columns: [
            /** token */
            {
              name: 'custrecord_aio_importer_next_token'
            },
            /** Last Updated After */
            {
              name: 'custrecord_aio_importer_last_updated_af'
            },
            /** Last Updated Before */
            {
              name: 'custrecord_aio_importer_last_updated_bf'
            },
            {
              name: 'custrecord_aio_enabled_sites',
              join: 'CUSTRECORD_AIO_IMPORTER_ACC_ID'
            }
          ]
        }).run().each(function (rec) {
          hid = rec.id
          h = record.load({
            type: 'customrecord_aio_order_import_status',
            id: rec.id
          })
          nextToken = rec.getValue(rec.columns[0])
          last_update_date = last_after
          enabled_sites = rec.getText({
            name: 'custrecord_aio_enabled_sites',
            join: 'CUSTRECORD_AIO_IMPORTER_ACC_ID'
          })
          return false
        })

        last_update_date = last_after
      } else {
        log.debug('不是自定义时间')
        search.create({
          type: 'customrecord_aio_order_import_status',
          filters: [{
            name: 'custrecord_aio_importer_acc_id',
            operator: search.Operator.ANYOF,
            values: acc_id
          } ],
          columns: [
            /** token */
            {
              name: 'custrecord_aio_importer_next_token'
            },
            /** Last Updated After */
            {
              name: 'custrecord_aio_importer_last_updated_af'
            },
            /** Last Updated Before */
            {
              name: 'custrecord_aio_importer_last_updated_bf'
            },
            {
              name: 'custrecord_dps_amazon_status_order_bf'
            }
          ]
        }).run().each(function (rec) {
          hid = rec.id
          h = record.load({
            type: 'customrecord_aio_order_import_status',
            id: rec.id
          })
          nextToken = rec.getValue(rec.columns[0])
          last_update_date = rec.getValue('custrecord_dps_amazon_status_order_bf')
          return false
        })
      }

      log.error('last_update_date')
      var field_token = cut_token ? 'custrecord_nexttoken_cust' : 'custrecord_aio_importer_next_token'
      log.debug('field_token', field_token)

      if (!last_update_date)
        last_update_date = '2020-05-31T00:00:00.000Z'
      if (hid && nextToken) {
        if (nextToken == '-1') {
          return
          /** 寮?1?7鍚?鏂扮殑鍗曟嵁鑾峰弰1?7 */
          log.debug('nextToken::::', nextToken + ',account: ' + acc_id)
          // return false
          var rtn_1 = core1.listOrders(acc_id, moment().utc(last_update_date).toISOString(), '', last_after, last_before)
          log.audit('listOrders222')
          log.error('rtn LastUpdatedBefore', moment(last_update_date).toISOString() + '------------------' + rtn_1.LastUpdatedBefore)
          h.setValue({
            // fieldId: 'custrecord_aio_importer_next_token',
            fieldId: field_token,
            value: rtn_1.token
          })
          // h.setValue({
          //     fieldId: 'custrecord_aio_importer_last_updated_af',
          //     value: last_update_date
          // })
          log.debug('1111111')
          if (last_after)
            h.setText({
              fieldId: 'custrecord_aio_importer_last_updated_af',
              text: moment(last_after).toDate()
            })
          if (last_before)
            h.setText({
              fieldId: 'custrecord_aio_importer_last_updated_bf',
              text: moment(last_before).toDate()
            })

          if (last_after)
            // 文本形式时间
            h.setValue({
              fieldId: 'custrecord_dps_amazon_status_order_af',
              value: last_after
            })
          else
            h.setValue({
              fieldId: 'custrecord_dps_amazon_status_order_af',
              value: last_update_date
            })
          h.setValue({
            fieldId: 'custrecord_dps_amazon_status_order_bf',
            value: rtn_1.LastUpdatedBefore
          })

          hid = h.save()
          log.debug('123new Date()=====save()', hid)
          return rtn_1.orders
        } else {
          // var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), nextToken)
          var rtn = core1.listOrders(acc_id, last_update_date, nextToken)
          if (rtn)
            h.setValue({
              // fieldId: 'custrecord_aio_importer_next_token',
              fieldId: field_token,
              value: rtn.token
            })
          else
            h.setValue({
              // fieldId: 'custrecord_aio_importer_next_token',
              fieldId: field_token,
              value: '没有数据'
            })
          hid = h.save()
          var rs
          if (rtn)
            rs = rtn.orders
          else
            rs = false
          log.debug('new Date()=====save()', hid)
          return rs
        }
      } else {
        if (!hid) {
          h = record.create({
            type: 'customrecord_aio_order_import_status'
          })
          h.setValue({
            fieldId: 'custrecord_aio_importer_acc_id',
            value: acc_id
          })
        }
        log.audit('else ! nextToken', last_update_date)
        log.audit('店铺：' + acc_id, 'last_after' + last_after + 'last_before: ' + last_before)
        // var rtn = core1.listOrders(acc_id, moment(last_update_date).toISOString(), '', last_after, last_before)
        var rtn = core1.listOrders(acc_id, last_update_date, '', last_after, last_before)
        if (last_after)
          // 文本形式时间
          h.setValue({
            fieldId: 'custrecord_dps_amazon_status_order_af',
            value: last_after
          })
        else
          h.setValue({
            fieldId: 'custrecord_dps_amazon_status_order_af',
            value: last_update_date
          })
        if (rtn)
          h.setValue({
            fieldId: 'custrecord_dps_amazon_status_order_bf',
            value: rtn.LastUpdatedBefore
          })

        if (last_update_date)
          h.setText({
            fieldId: 'custrecord_aio_importer_last_updated_af',
            // text: last_update_date
            text: moment(last_update_date).toDate()
          })

        h.setValue({
          fieldId: 'custrecord_aio_importer_last_updated_bf',
          value: new Date()
        })

        // h.setText({
        //     fieldId: 'custrecord_aio_importer_last_updated_bf',
        //     // value: new Date()
        //     value: moment.utc(last_before).toDate()
        // })
        if (rtn)
          h.setValue({
            // fieldId: 'custrecord_aio_importer_next_token',
            fieldId: field_token,
            value: rtn.token
          })
        else
          h.setValue({
            // fieldId: 'custrecord_aio_importer_next_token',
            fieldId: field_token,
            value: '没有数据'
          })
        hid = h.save()
        var rs
        if (rtn)
          rs = rtn.orders
        else
          rs = false
        log.debug('new Date()=====save()', hid)
        return rs
      }
    },

    listOrders: function (acc_id, last_updated_after, nextToken, last_after, last_before) {
      var orders = [],
        auth = core1.getAuthByAccountId(acc_id)

      // log.debug("last_after inlist:",last_after)
        // log.debug("last_before inlist:",last_before)
        // log.debug("last_update_date inlist:",last_updated_after)
        // log.audit('listOrder-->auth锛?1?7', auth)

      // last_updated_after = "2020-03-05T00:00:00.000Z"

      if (auth) {
        try {
          var content = void 0
          if (nextToken) {
            content = core.amazon.mwsRequestMaker(auth, 'ListOrdersByNextToken', '2013-09-01', {
              NextToken: nextToken
            }, '/Orders/2013-09-01')
          } else {
            if (last_after || last_before) {
              log.debug('last_after:' + last_after, 'last_before:' + last_before + ',marketplace_id：' + auth.marketplace_id)
              content = core.amazon.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                'MarketplaceId.Id.1': auth.marketplace_id,
                'LastUpdatedAfter': last_after,
                'LastUpdatedBefore': last_before
              // 'CreatedAfter': last_after,
              // 'CreatedBefore': last_before
              }, '/Orders/2013-09-01')
            } else {
              content = core.amazon.mwsRequestMaker(auth, 'ListOrders', '2013-09-01', {
                'MarketplaceId.Id.1': auth.marketplace_id,
                'LastUpdatedAfter': last_updated_after,
              // 'LastUpdatedAfter': "2019-12-20T18:33:09.806Z",
              // 'CreatedAfter': "2019-12-20T18:33:09.806Z",
              }, '/Orders/2013-09-01')
            }
          }

          log.audit('listOrder-->content', content)
          var res = xml.Parser.fromString({
            text: content
          })
          res.getElementsByTagName({
            tagName: 'Order'
          }).map(function (node) {
            orders.push({
              AccID: acc_id,
              latest_delivery_date: node.getElementsByTagName({
                tagName: 'LatestDeliveryDate'
              }).length ? node.getElementsByTagName({
                tagName: 'LatestDeliveryDate'
              })[0].textContent : '',
              latest_ship_date: node.getElementsByTagName({
                tagName: 'LatestShipDate'
              }).length ? node.getElementsByTagName({
                tagName: 'LatestShipDate'
              })[0].textContent : '',
              order_type: node.getElementsByTagName({
                tagName: 'OrderType'
              }).length ? node.getElementsByTagName({
                tagName: 'OrderType'
              })[0].textContent : '',
              purchase_date: node.getElementsByTagName({
                tagName: 'PurchaseDate'
              }).length ? node.getElementsByTagName({
                tagName: 'PurchaseDate'
              })[0].textContent : '',

              is_replacement_order: node.getElementsByTagName({
                tagName: 'IsReplacementOrder'
              }).length ? node.getElementsByTagName({
                tagName: 'IsReplacementOrder'
              })[0].textContent == 'true' : false,
              last_update_date: node.getElementsByTagName({
                tagName: 'LastUpdateDate'
              }).length ? node.getElementsByTagName({
                tagName: 'LastUpdateDate'
              })[0].textContent : '',
              buyer_email: node.getElementsByTagName({
                tagName: 'BuyerEmail'
              }).length ? node.getElementsByTagName({
                tagName: 'BuyerEmail'
              })[0].textContent : '',
              amazon_order_id: node.getElementsByTagName({
                tagName: 'AmazonOrderId'
              }).length ? node.getElementsByTagName({
                tagName: 'AmazonOrderId'
              })[0].textContent : '',

              number_of_items_shipped: node.getElementsByTagName({
                tagName: 'NumberOfItemsShipped'
              }).length ? node.getElementsByTagName({
                tagName: 'NumberOfItemsShipped'
              })[0].textContent : '',
              ship_service_level: node.getElementsByTagName({
                tagName: 'ShipServiceLevel'
              }).length ? node.getElementsByTagName({
                tagName: 'ShipServiceLevel'
              })[0].textContent : '',
              order_status: node.getElementsByTagName({
                tagName: 'OrderStatus'
              }).length ? node.getElementsByTagName({
                tagName: 'OrderStatus'
              })[0].textContent : '',
              sales_channel: node.getElementsByTagName({
                tagName: 'SalesChannel'
              }).length ? node.getElementsByTagName({
                tagName: 'SalesChannel'
              })[0].textContent : '',

              is_business_order: node.getElementsByTagName({
                tagName: 'IsBusinessOrder'
              }).length ? node.getElementsByTagName({
                tagName: 'IsBusinessOrder'
              })[0].textContent == 'true' : false,
              number_of_items_unshipped: node.getElementsByTagName({
                tagName: 'NumberOfItemsUnshipped'
              }).length ? node.getElementsByTagName({
                tagName: 'NumberOfItemsUnshipped'
              })[0].textContent : '',
              buyer_name: node.getElementsByTagName({
                tagName: 'BuyerName'
              }).length ? node.getElementsByTagName({
                tagName: 'BuyerName'
              })[0].textContent : '',
              is_premium_order: node.getElementsByTagName({
                tagName: 'IsPremiumOrder'
              }).length ? node.getElementsByTagName({
                tagName: 'IsPremiumOrder'
              })[0].textContent == 'true' : false,

              earliest_delivery_date: node.getElementsByTagName({
                tagName: 'EarliestDeliveryDate'
              }).length ? node.getElementsByTagName({
                tagName: 'EarliestDeliveryDate'
              })[0].textContent : '',
              earliest_ship_date: node.getElementsByTagName({
                tagName: 'EarliestShipDate'
              }).length ? node.getElementsByTagName({
                tagName: 'EarliestShipDate'
              })[0].textContent : '',
              marketplace_id: node.getElementsByTagName({
                tagName: 'MarketplaceId'
              }).length ? node.getElementsByTagName({
                tagName: 'MarketplaceId'
              })[0].textContent : '',
              fulfillment_channel: node.getElementsByTagName({
                tagName: 'FulfillmentChannel'
              }).length ? node.getElementsByTagName({
                tagName: 'FulfillmentChannel'
              })[0].textContent : '',
              payment_method: node.getElementsByTagName({
                tagName: 'PaymentMethod'
              }).length ? node.getElementsByTagName({
                tagName: 'PaymentMethod'
              })[0].textContent : '',
              is_prime: node.getElementsByTagName({
                tagName: 'IsPrime'
              }).length ? node.getElementsByTagName({
                tagName: 'IsPrime'
              })[0].textContent == 'true' : false,

              shipment_service_level_category: node.getElementsByTagName({
                tagName: 'ShipmentServiceLevelCategory'
              }).length ? node.getElementsByTagName({
                tagName: 'ShipmentServiceLevelCategory'
              })[0].textContent : '',
              seller_order_id: node.getElementsByTagName({
                tagName: 'SellerOrderId'
              }).length ? node.getElementsByTagName({
                tagName: 'SellerOrderId'
              })[0].textContent : '',
              shipped_byamazont_fm: node.getElementsByTagName({
                tagName: 'ShippedByAmazonTFM'
              }).length ? node.getElementsByTagName({
                tagName: 'ShippedByAmazonTFM'
              })[0].textContent == 'true' : false,
              tfm_shipment_status: node.getElementsByTagName({
                tagName: 'TFMShipmentStatus'
              }).length ? node.getElementsByTagName({
                tagName: 'TFMShipmentStatus'
              })[0].textContent : '',
              promise_response_due_date: node.getElementsByTagName({
                tagName: 'PromiseResponseDueDate'
              }).length ? node.getElementsByTagName({
                tagName: 'PromiseResponseDueDate'
              })[0].textContent : '',

              is_estimated_ship_date_set: node.getElementsByTagName({
                tagName: 'IsEstimatedShipDateSet'
              }).length ? node.getElementsByTagName({
                tagName: 'IsEstimatedShipDateSet'
              })[0].textContent == 'true' : false,
              // 娉ㄦ剰锛岃繖閲岀洿鎺ュ彇鐨勪笅涓?1?7灞傦紝鎵?1?7浠ュ彧浼氬彇涓?1?7涓?1?7
              payment_method_detail: node.getElementsByTagName({
                tagName: 'PaymentMethodDetail'
              }).length ? node.getElementsByTagName({
                tagName: 'PaymentMethodDetail'
              })[0].textContent : '',
              payment_execution_detail: node.getElementsByTagName({
                tagName: 'PaymentExecutionDetail'
              }).length ? node.getElementsByTagName({
                tagName: 'PaymentExecutionDetail'
              })[0].textContent : '',
              order_total: node.getElementsByTagName({
                tagName: 'OrderTotal'
              }).length ? {
                currency_code: node.getElementsByTagName({
                  tagName: 'OrderTotal'
                })[0].getElementsByTagName({
                  tagName: 'CurrencyCode'
                }).length ? node.getElementsByTagName({
                  tagName: 'OrderTotal'
                })[0].getElementsByTagName({
                  tagName: 'CurrencyCode'
                })[0].textContent : '',
                amount: node.getElementsByTagName({
                  tagName: 'OrderTotal'
                })[0].getElementsByTagName({
                  tagName: 'Amount'
                }).length ? Number(node.getElementsByTagName({
                  tagName: 'OrderTotal'
                })[0].getElementsByTagName({
                  tagName: 'Amount'
                })[0].textContent) : 0
              } : {
                currency_code: '_UNKNOW_',
                amount: 0
              },
              shipping_address: node.getElementsByTagName({
                tagName: 'ShippingAddress'
              }).length ? {
                city: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'City'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'City'
                })[0].textContent : '',
                postal_code: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'PostalCode'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'PostalCode'
                })[0].textContent : '',
                state_or_oegion: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'StateOrRegion'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'StateOrRegion'
                })[0].textContent : '',
                country_code: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'CountryCode'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'CountryCode'
                })[0].textContent : '',
                name: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'Name'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'Name'
                })[0].textContent : '',
                address_line1: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'AddressLine1'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'AddressLine1'
                })[0].textContent : '',
                address_line2: node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'AddressLine2'
                }).length ? node.getElementsByTagName({
                  tagName: 'ShippingAddress'
                })[0].getElementsByTagName({
                  tagName: 'AddressLine2'
                })[0].textContent : ''
              } : null
            })
          })
          if (res.getElementsByTagName({
              tagName: 'NextToken'
            }).length > 0) {
            return {
              acc_id: acc_id,
              orders: orders,
              token: res.getElementsByTagName({
                tagName: 'NextToken'
              })[0].textContent,
              LastUpdatedBefore: res.getElementsByTagName({
                tagName: 'LastUpdatedBefore'
              })[0].textContent
            }
          } else {
            // email.send({
            //     author: -5,
            //     recipients: ['18650801765@126.com'],
            //     bcc: ['mars.zhou@icloud.com'],
            //     subject: `璁㈠崟瀵煎叆璺戝畬浜哷,
            //     body: `Account: ${runtime.accountId}<br /><br />Seller ID: ${auth.seller_id}<br /><br />ACC ID: ${acc_id}<br /><br />Last Updated After: ${last_updated_after}`,
            // })
            return {
              acc_id: acc_id,
              orders: orders,
              token: '-1',
              LastUpdatedBefore: res.getElementsByTagName({
                tagName: 'LastUpdatedBefore'
              })[0].textContent
            }
          }
        } catch (e) {
          log.error('mwsRequestMaker eororooror:', e)
        }
      } else {
        throw '\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[' + acc_id + '].'
      }
    },
    getAuthByAccountId: function (account_id) {
      var auth
      log.audit('account_id', account_id)
      search.create({
        type: 'customrecord_aio_account',
        filters: [{
          name: 'internalid',
          operator: 'is',
          values: account_id
        }],
        columns: [{
          name: 'custrecord_aio_seller_id'
        },
          {
            name: 'custrecord_aio_mws_auth_token'
          },
          {
            name: 'custrecord_aio_aws_access_key_id',
            join: 'custrecord_aio_dev_account'
          },
          {
            name: 'custrecord_aio_secret_key_guid',
            join: 'custrecord_aio_dev_account'
          },
          {
            name: 'custrecord_aio_amazon_mws_endpoint',
            join: 'custrecord_aio_enabled_sites'
          },
          {
            name: 'custrecord_aio_amazon_marketplace_id',
            join: 'custrecord_aio_enabled_sites'
          }
        ]
      }).run().each(function (rec) {
        auth = {
          seller_id: rec.getValue(rec.columns[0]),
          auth_token: rec.getValue(rec.columns[1]),
          access_id: rec.getValue(rec.columns[2]),
          sec_key: rec.getValue(rec.columns[3]),
          end_point: rec.getValue(rec.columns[4]),
          marketplace_id: rec.getValue(rec.columns[5])
        }
        return false
      })
      return auth || false
    },
    mwsRequestMaker: function (acc_id, auth, action, version, params, resource, body) {
      if (resource === void 0) {
        resource = '/'
      }
      var timestamp = encodeURIComponent(new Date().toISOString())
      var query = {
        SellerId: encodeURIComponent(auth.seller_id),
        AWSAccessKeyId: encodeURIComponent(auth.access_id),
        Action: encodeURIComponent(action),
        SignatureMethod: encodeURIComponent('HmacSHA256'),
        SignatureVersion: encodeURIComponent('2'),
        Timestamp: timestamp,
        Version: encodeURIComponent(version)
      }
      if (auth.auth_token) {
        query['MWSAuthToken'] = encodeURIComponent(auth.auth_token)
      }
      for (var key in params) {
        if (params[key] != '') {
          query[key] = encodeURIComponent(params[key])
        }
      }
      var keys = Object.keys(query)
      keys.sort()
      var queryString = keys.map(function (key) {
        return key + '=' + query[key]
      }).join('&')
      var hash = cryptoJS.HmacSHA256('POST\n' + auth.end_point + '\n' + resource + '\n' + queryString, auth.sec_key)
      var hashInBase64 = encodeURIComponent(encode.convert({
        string: hash,
        inputEncoding: encode.Encoding.HEX,
        outputEncoding: encode.Encoding.BASE_64
      }))
      var response = https.post({
        url: 'https://' + auth.end_point + resource + '?' + queryString + '&Signature=' + hashInBase64,
        body: body ? body : queryString + '&Signature=' + hashInBase64,
        headers: body ? {
          'Content-Type': 'text/xml'
        } : {}
      })
      log.debug('url', 'https://' + auth.end_point + resource + '?' + queryString + '&Signature=' + hashInBase64)
      log.debug('body', body ? body : queryString + '&Signature=' + hashInBase64)
      log.debug('headers', body ? {
        'Content-Type': 'text/xml'
      } : {})
      log.debug('hashInBase64', hashInBase64)
      log.debug('response', response)
      if (response.body.indexOf('</ErrorResponse>') != -1) {
        var err = xml.Parser.fromString({
          text: response.body
        })
        if (err) {
          /** MWS閿欒??淇℃伅鍗曠嫭鍙戦?1?7?1?7 */
          /*email.send({
              author: -5,
              recipients: ['mars.zhou@icloud.com'],
              subject: 'MWS Request Error',
              body: "Account: " + runtime.accountId + "<br /><br />Seller ID: " + auth.seller_id + "<br /><br />Action: " + action + "<br /><br />Params: <pre>" + JSON.stringify(params, null, 2) + "</pre><br /><br />Response: " + response.body + "<br /><br />",
              attachments: body ? [file.create({ name: 'request.payload.xml', fileType: file.Type.XMLDOC, contents: body })] : [],
          });*/
          throw acc_id + ' MWS Request Builder ERR:\r\n\r\nSeller ID: ' + auth.seller_id + '\r\n\r\nError Details: \r\n\r\n' + response.body + ' \r\n\rParams: <pre>' + JSON.stringify(params, null, 2) + '</pre> \r\n\r\nSHA 256 HMAC: ' + hash
        } else {
          throw response.body
        }
      }
      log.debug('mwsRequestMaker.response.header', response.headers)
      return response.body
    }
  }
  // 亚马逊拉单方法 ==========================================================

  function getInputData (acc) {
    var payments = [],limit_payments = 1
    try {
      search.create({
        type: 'customrecord_aio_amazon_settlement',
        filters: [
          { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id', operator: 'anyof', values: acc },
          { name: 'custrecord_aio_sett_tran_type', operator: 'is', values: 'Refund' },
          { name: 'custrecord_settlement_enddate', operator: 'onorafter', values: '1/5/2020' }, // end date从2月份开始
          { name: 'custrecord_aio_sett_amount_type', operator: 'is', values: ['ItemPrice'] },
          { name: 'custrecord_aio_sett_amount_desc', operator: 'is', values: ['Principal'] },
          // { name: 'custrecord_aio_origin_account', join:'custrecord_aio_sett_report_id', operator: 'anyof', values: ["34"] },
          { name: 'custrecord_aio_sett_credit_memo', operator: 'isnot', values: 'T' },
          { name: 'custrecord_february_undeal', operator: 'isnot', values: 'F' }
        ],
        columns: [
          { name: 'custrecord_aio_origin_account', join: 'custrecord_aio_sett_report_id'},
          { name: 'custrecord_aio_sett_amount_desc' },
          { name: 'custrecord_aio_sett_amount_type' },
          { name: 'custrecord_aio_sett_merchant_order_id' },
          { name: 'custrecord_aio_sett_order_id' },
          { name: 'custrecord_aio_sett_sku' },
          { name: 'custrecord_aio_sett_amount' },
          { name: 'custrecord_aio_sett_deposit_date' },
          { name: 'custrecord_aio_sett_end_date' },
          { name: 'custrecord_aio_sett_posted_date_time' },
          { name: 'custrecord_aio_sett_marketplace_name' },
          { name: 'custrecord_february_undeal' },
          { name: 'custrecord_aio_sett_credit_memo' },
          { name: 'custrecord_aio_sett_adjust_item_id' },
          { name: 'custrecord_aio_sett_currency' },
          { name: 'internalid', sort: search.Sort.DESC }
        ]
      }).run().each(function (rec) {
        // if(rec.getValue("custrecord_aio_sett_amount_type") =="ItemPrice" && rec.getValue("custrecord_aio_sett_amount_desc") =="Principal")
        payments.push({
          recid: rec.id,
          acc: rec.getValue(rec.columns[0]),
          acc_text: rec.getText(rec.columns[0]),
          marketplace_name: rec.getValue('custrecord_aio_sett_marketplace_name'),
          merchant_order_id: rec.getValue('custrecord_aio_sett_merchant_order_id'),
          merchant_adjustment_itemid: rec.getValue('custrecord_aio_sett_adjust_item_id'),
          order_id: rec.getValue('custrecord_aio_sett_order_id'),
          sku: rec.getValue('custrecord_aio_sett_sku'),
          amount: rec.getValue('custrecord_aio_sett_amount'),
          deposit_date: rec.getValue('custrecord_aio_sett_deposit_date'),
          endDate: rec.getValue('custrecord_aio_sett_end_date'),
          postDate: rec.getValue('custrecord_aio_sett_posted_date_time'),
          curency_txt: rec.getValue('custrecord_aio_sett_currency')
        })
        return --limit_payments > 0
      })
      return payments
    } catch(e) {
      log.error('error:', e)
    }
  }

  function PaymentAuthrationmap (obj) {
    var startT = new Date().getTime()
    var acc_text
    var o
    var acc
    var transactionType = 'Payment_return'
    var err = []
    var accounts,total
    log.debug('objs', JSON.stringify(obj))

    accounts = interfun.GetstoreInEU(obj.acc, obj.marketplace_name, obj.acc_text)
    acc = accounts.acc
    acc_text = accounts.acc_text
    var settlerecord_id = obj.recid
    var merchant_order_id = obj.merchant_order_id
    var merchant_adjustment_itemid = obj.merchant_adjustment_itemid
    var order_id = obj.order_id
    var sku = obj.sku
    var postDate = obj.postDate
    var endDate_txt = obj.endDate
    var deposit_date = obj.deposit_date
    var curency_txt = obj.curency_txt
    var amount = obj.amount.replace(/-/, '').replace(/,/, '.')
    var quantity = 1
    try {
      var endDate = interfun.getFormatedDate('', '', endDate_txt).date
      if (!endDate) { // posted date为2月份之前的不处理
        log.debug('posted date为2月份之前的不处理:', endDate)
        record.submitFields({
          type: 'customrecord_aio_amazon_settlement',
          id: settlerecord_id,
          values: {
            custrecord_february_undeal: 'F'
          }
        })
        return
      }
      log.debug('endDate', endDate)
      var skuid = interfun.getskuId(sku, acc).skuid,rs
      var status // 退货订单状态
      // 去重 搜索退货授权单
      log.debug('skuid ' + skuid, acc + ',settlerecord_id,' + settlerecord_id + ',merchant_order_id:' + merchant_order_id)
      try {
        search.create({
          type: record.Type.RETURN_AUTHORIZATION,
          filters: [
            {name: 'custbody_origin_settlement',operator: 'anyof',values: settlerecord_id }, // 就查看有没有这一条结算报告产生的退货单
          ],columns: [{name: 'status'}]
        }).run().each(function (rec) {
          log.debug('找到重复的了 ' + rec.id, rec.getValue('status'))
          status = rec.getValue('status')
          rs = rec.id
        })
      } catch(e) {
        log.error('000search RETURN_AUTHORIZATION', e)
      }
      try {
        log.debug('status:' + status, 'rs:' + rs)
        if (!rs) {
          var currency
          if (curency_txt)
            search.create({
              type: 'currency',
              filters: [{
                name: 'symbol',
                operator: 'is',
                values: curency_txt
              }]
            }).run().each(function (e) {
              currency = e.id
            })
          // 如果没有对应的退货授权就create ，然后生成贷项通知单
          createAuthorationFromPayment(settlerecord_id, acc, sku, endDate, merchant_order_id, quantity, amount, acc_text, merchant_adjustment_itemid, currency, skuid)
        }else if (status == 'pendingReceipt') {
          var cm
          search.create({
            type: record.Type.CREDIT_MEMO,
            filters: [
              {name: 'createdfrom',operator: 'anyof',values: rs }
            ],columns: [{name: 'status'}] // applied 已核销
          }).run().each(function (rec) {
            log.debug('找到来源相同的贷项通知单  ' + rec.id, rec.getValue('status'))
            cm = rec.id
          })
          // 如果没有对应的贷项通知单就transform
          if (!cm) {
            var credit_memo
            log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
            // 创建贷项通知单
            credit_memo = record.transform({
              fromType: record.Type.RETURN_AUTHORIZATION,
              toType: record.Type.CREDIT_MEMO,
              fromId: Number(rs)
            })
            acc_text = acc_text.substring(0, 2) + acc_text.substring(acc_text.length - 2, acc_text.length)
            var Year = endDate.Year
            var Month = endDate.Month
            if (Year.length == 1) Year = '0' + Year
            if (Month.length == 1) Month = '0' + Month
            var T_memo = acc_text + Year + Month + '-0' // 付款备注
            var fm = mo_date.substring(0, 6) // 期 202006  年月
            var R_memo = interfun.CreatePaymentRec('refunds', acc, credit_memo.getValue('entity'), T_memo, fm, credit_memo.getValue('currency'), endDate.date, 1)
            log.debug('R_memo :', R_memo)
            credit_memo.setText({fieldId: 'trandate', text: endDate.date })
            credit_memo.setValue({fieldId: 'memo',value: R_memo})
            credit_memo.setValue({fieldId: 'custbody_order_locaiton',value: acc})
            credit_memo.setValue({fieldId: 'custbody_aio_marketplaceid',value: 1})

            var cre = credit_memo.save({ignoreMandatoryFields: true})
            log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
            // 创建客户退款
            // credit_cr(merchant_order_id,settlerecord_id)
            log.debug('OK')
          }
        }
        log.debug('settlerecord_id :' + settlerecord_id)
        record.submitFields({
          type: 'customrecord_aio_amazon_settlement',
          id: settlerecord_id,
          values: {
            custrecord_aio_sett_credit_memo: 'T',
            custrecord_aio_sett_authorization: 'T'
          }
        })
      } catch(e) {
        log.error('error!' + order_id, e)
        err.push(e)
      }
    } catch (error) {
      log.error('error', error)
    }

    if (err.length > 0) {
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
      })
      var moId = createSOTRMissingOrder(transactionType, merchant_order_id, JSON.stringify(err), date, acc)
      log.error('出现错误，已创建missingorder' + moId)
    }else {
      makeresovle(transactionType, merchant_order_id, acc)
    }
    log.error('00000结束耗时', (new Date().getTime() - startT))
  }

  function makeresovle (type, orderid, acc) {
    var fils = []
    type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}) : ''
    orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}) : ''
    acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}) : ''
    search.create({
      type: 'customrecord_dps_transform_mo',
      filters: fils
    }).run().each(function (rec) {
      record.submitFields({
        type: 'customrecord_dps_transform_mo',
        id: rec.id,
        values: {
          custrecord_tr_missing_order_resolved: true
        },
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true
        }
      })
      log.debug('make Resovle ' + rec.id, type + ' : ' + orderid)
      return true
    })
  }

  function createSOTRMissingOrder (type, orderid, reason, date, acc) {
    var mo
    var fils = []
    type ? fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}) : ''
    orderid ? fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}) : ''
    acc ? fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}) : ''
    var mo
    search.create({
      type: 'customrecord_dps_transform_mo',
      filters: fils
    }).run().each(function (rec) {
      mo = record.load({
        type: 'customrecord_dps_transform_mo',
        id: rec.id
      })
      return false
    })
    if (!mo) {
      mo = record.create({
        type: 'customrecord_dps_transform_mo',
        isDynamic: true
      })
    }
    type ?
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_type',
        value: type
      }) : ''; // 类型
    acc ?
      mo.setValue({
        fieldId: 'custrecord_tracking_missing_acoount',
        value: acc
      }) : ''
    orderid ?
      mo.setValue({
        fieldId: 'custrecord_missing_orderid_txt',
        value: orderid
      }) : ''
    mo.setValue({
      fieldId: 'custrecord_tr_missing_order_reason',
      value: reason
    })
    mo.setText({
      fieldId: 'custrecord_tr_missing_order_date',
      text: date
    })
    mo.setValue({
      fieldId: 'custrecord_tr_missing_order_resolved',
      value: false
    })
    mo.setValue({
      fieldId: 'custrecord_tr_missing_order_resolving',
      value: false
    })
    return mo.save()
  }

  function getAcc (acc) {
    var t = fiedls.account, tsite = fiedls.amazon_global_sites, tdev = fiedls.amazon_dev_accounts
    var accounts = {},fin = []
    search.create({
      type: t._name,
      filters: [
        { name: 'internalidnumber', operator: 'equalto', values: acc },
        { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 1 /* amazon */ },
        { name: 'custrecord_aio_seller_id', operator: 'isnotempty' },
        /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
        { name: 'custrecord_aio_dev_account', operator: 'noneof', values: '@NONE@' },
        { name: 'isinactive', operator: 'is', values: false }

      ],
      columns: [
        /** * 名称 * @index 0 */
        { name: 'name' },
        /** * 账户API信息 * @index 1 */
        { name: t.seller_id },
        { name: t.mws_auth_token },
        { name: tsite.amazon_marketplace_id, join: t.enabled_sites },
        { name: tsite.amazon_mws_endpoint, join: t.enabled_sites },
        { name: tdev.aws_access_key_id, join: t.dev_account },
        { name: tdev.secret_key_guid, join: t.dev_account },
        /** * 账户基础信息 * @index 7 * */
        { name: 'name' },
        { name: t.currency },
        { name: 'custrecord_aio_if_salesorder' },
        { name: 'custrecord_aio_salesorder_type' },
        { name: 'custrecord_aio_salesorder_form' },
        { name: 'custrecord_aio_salesorder_location' },
        { name: 'custrecord_aio_salesorder_start_date' },
        /** * FBA信息 * @index 14 */
        { name: 'custrecord_aio_if_fbaorder' },
        { name: 'custrecord_aio_fbaorder_type' },
        { name: 'custrecord_aio_fbaorder_form' },
        { name: 'custrecord_aio_fbaorder_location' },
        { name: 'custrecord_aio_fbaorder_start_date' },
        /**@index 19 */
        { name: 'custrecord_aio_if_only_paid_orders' },
        { name: 'custrecord_aio_salesorder_if_taxed' },
        { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
        { name: 'custrecord_aio_salesorder_tax_auto_calc' },
        { name: 'custrecord_aio_if_zero_price' },
        { name: 'custrecord_aio_if_check_customer_email' },
        { name: 'custrecord_aio_if_check_customer_addr' },
        { name: 'custrecord_aio_if_including_fees' },
        { name: 'custrecord_aio_if_payment_as_tran_date' },
        /** * 其他信息 * @index 28 */
        { name: 'custrecord_division' },
        { name: 'custrecord_aio_salesorder_payment_method' },
        { name: 'custrecord_aio_discount_item' },
        { name: 'custrecord_aio_tax_item' },
        { name: tsite.amazon_currency, join: t.enabled_sites },
        /** * 公司信息 * @index 33 */
        core.utils.checkIfSubsidiaryEnabled() ? { name: 'custrecord_aio_subsidiary' } : { name: 'formulanumeric', formula: '0' },
        /** * 报告抓取信息 * @index 34 */
        { name: 'custrecord_aio_if_handle_removal_report' },
        { name: 'custrecord_aio_if_handle_custrtn_report' },
        /** * Preferences * @index 36 */
        { name: 'custrecord_aio_if_only_paid_orders' },
        { name: 'custrecord_aio_salesorder_if_taxed' },
        { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
        { name: 'custrecord_aio_salesorder_tax_auto_calc' },
        { name: 'custrecord_aio_if_zero_price' },
        { name: 'custrecord_aio_if_check_customer_email' },
        { name: 'custrecord_aio_if_check_customer_addr' },
        { name: 'custrecord_aio_if_payment_as_tran_date' },
        /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
        { name: 'custrecord_aio_if_handle_inv_report' },
        { name: 'custrecord_aio_to_default_from_location' },
        { name: 'custrecord_aio_shipping_item' },
        { name: 'custrecord_aio_to_form' },
        /** @index 48 */
        { name: fiedls.account.if_post_order_fulfillment },
        { name: fiedls.account.post_order_if_search },
        { name: fiedls.account.if_handle_sett_report },
        /** 检验亚马逊的密钥是否加密了 @index 51 */
        { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_aio_enabled_sites' },
        { name: 'custrecord_aio_customer'}

      ]
    }).run().each(function (rec) {
      accounts = {
        id: rec.id,
        country: rec.getValue(rec.columns[51]),
        customer: rec.getValue(rec.columns[52]),
        auth_meta: {
          seller_id: rec.getValue(rec.columns[1]),
          auth_token: rec.getValue(rec.columns[2]),
          access_id: rec.getValue(rec.columns[5]),
          sec_key: rec.getValue(rec.columns[6]),
          end_point: rec.getValue(rec.columns[4])
        },
        info: {
          name: rec.getValue(rec.columns[7]),
          currency: rec.getValue(rec.columns[8]),
          if_salesorder: rec.getValue(rec.columns[9]),
          salesorder_type: rec.getValue(rec.columns[10]),
          salesorder_form: rec.getValue(rec.columns[11]),
          salesorder_location: rec.getValue(rec.columns[12]),
          salesorder_start_date: rec.getValue(rec.columns[13]),
          dept: rec.getValue(rec.columns[28]),
          salesorder_payment_method: rec.getValue(rec.columns[29]),
          discount_item: rec.getValue(rec.columns[30]),
          shipping_cost_item: rec.getValue(rec.columns[46]),
          tax_item: rec.getValue(rec.columns[31]),
          site_currency: rec.getValue(rec.columns[32]),
          subsidiary: Number(rec.getValue(rec.columns[33])),
          enable_tracking_upload: rec.getValue(rec.columns[48]),
          enabled_tracking_upload_search: rec.getValue(rec.columns[49])
        },
        extra_info: {
          if_fbaorder: rec.getValue(rec.columns[14]),
          fbaorder_type: rec.getValue(rec.columns[15]),
          fbaorder_form: rec.getValue(rec.columns[16]),
          fbaorder_location: rec.getValue(rec.columns[17]),
          fbaorder_start_date: rec.getValue(rec.columns[18]),
          if_including_fees: rec.getValue(rec.columns[26]),
          if_handle_custrtn_report: rec.getValue(rec.columns[35]),
          if_handle_removal_report: rec.getValue(rec.columns[34]),
          if_handle_inventory_report: rec.getValue(rec.columns[44]),
          if_handle_settlement_report: rec.getValue(rec.columns[50]),
          to_default_from_location: rec.getValue(rec.columns[45]),
          aio_to_default_form: rec.getValue(rec.columns[47])
        },
        marketplace: rec.getValue(rec.columns[3]),
        preference: {
          if_only_paid_orders: rec.getValue(rec.columns[36]),
          salesorder_if_taxed: rec.getValue(rec.columns[37]),
          salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
          salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
          if_zero_price: rec.getValue(rec.columns[40]),
          if_check_customer_email: rec.getValue(rec.columns[41]),
          if_check_customer_addr: rec.getValue(rec.columns[42]),
          if_payment_as_tran_date: rec.getValue(rec.columns[43])
        }
      }
    })
    return accounts
  }

  /**
   * 创建退货授权单，然后转贷项通知单
   * @param {*} settlerecord_id 
   * @param {*} acc 
   * @param {*} sku 
   * @param {*} postDate 
   * @param {*} merchant_order_id 
   * @param {*} quantity 
   * @param {*} amount 
   * @param {*} acc_text 
   * @param {*} deposit_date 
   * @param {*} merchant_adjustment_itemid 
   */
  function createAuthorationFromPayment (settlerecord_id, acc, sku, postDate, merchant_order_id, quantity, amount, acc_text, merchant_adjustment_itemid, currency, skuid) {
    var account = getAcc(acc)
    log.debug('account', account)
    var loc,cid,rt_tax, R_memo,
      tax_item = account.info.tax_item,
      loc = account.extra_info.fbaorder_location,
      salesorder_if_taxed = account.preference.salesorder_if_taxed,
      country = account.country
    log.debug('tax_item:' + tax_item, 'country:' + country)
    log.debug('salesorder_if_taxed: ' + salesorder_if_taxed)
    // 根据merchant_adjustment_itemid merchant_order_id和sku匹配对应的tax
    search.create({
      type: 'customrecord_aio_amazon_settlement',
      filters: [
        { name: 'custrecord_aio_sett_tran_type', operator: 'is', values: ['Refund'] },
        { name: 'custrecord_aio_sett_amount_type', operator: 'is', values: ['ItemPrice'] },
        { name: 'custrecord_aio_sett_amount_desc', operator: 'is', values: ['Tax'] },
        { name: 'custrecord_aio_sett_adjust_item_id', operator: 'is', values: merchant_adjustment_itemid },
        { name: 'custrecord_aio_sett_sku', operator: 'is', values: sku },
        { name: 'custrecord_aio_sett_merchant_order_id', operator: 'is', values: merchant_order_id }
      ],
      columns: [
        { name: 'custrecord_aio_sett_amount' }
      ]
    }).run().each(function (rec) {
      rt_tax = rec.getValue('custrecord_aio_sett_amount').replace(/,/, '.').replace(/-/, ''); // 金额可能会含有其他符合，，-,要换掉
      return false
    })
    log.debug('amount:' + amount, 'rt_tax:' + rt_tax)
    cid = account.customer
    var rt = record.create({type: record.Type.RETURN_AUTHORIZATION,isDynamic: true})
    rt.setValue({fieldId: 'entity',value: cid})
    rt.setValue({fieldId: 'location',value: loc})
    rt.setValue({fieldId: 'currency',value: currency})
    rt.setValue({fieldId: 'otherrefnum',value: merchant_order_id})
    rt.setText({fieldId: 'trandate',text: postDate})
    rt.setValue({fieldId: 'custbody_order_locaiton',value: acc})
    rt.setValue({fieldId: 'custbody_aio_account',value: acc})
    rt.setValue({fieldId: 'custbody_aio_is_aio_order',value: true})
    rt.setValue({fieldId: 'custbody_origin_settlement',value: settlerecord_id}); // 设置关联的结算报告
    log.debug('skuid:' + skuid, 'merchant_order_id :' + merchant_order_id)
    rt.selectNewLine({sublistId: 'item' })
    rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'item', value: skuid})
    rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'location', value: loc})
    rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity', value: quantity})
    rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate', value: amount / quantity })
    rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount', value: amount })

    /** 设置订单含税 */
    if (salesorder_if_taxed && tax_item && rt_tax) {
      rt.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'taxcode',
        value: tax_item
      })
    // if (country !="US"&& country !="CA") {
    //     rt.setCurrentSublistValue({
    //         sublistId: 'item',
    //         fieldId: 'tax1amt',
    //         value: rt_tax ? rt_tax : 0
    //     })
    // }
    } else {
      rt.setCurrentSublistValue({
        sublistId: 'item',
        fieldId: 'taxcode',
        value: tax_item ? tax_item : 6
      })
    }
    try {
      rt.commitLine({sublistId: 'item'})
    } catch (err) {
      log.error('commitLine error', err)
    }
    log.debug('增加货品成功')
    var rs = rt.save({ ignoreMandatoryFields: true })
    log.debug('生成退货单成功', rs)
    log.audit('\u5f00\u59cb\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355')
    // 创建贷项通知单
    var credit_memo = record.transform({
      fromType: record.Type.RETURN_AUTHORIZATION,
      toType: record.Type.CREDIT_MEMO,
      fromId: Number(rs)
    })
    // 开始生成付款/退款备注
    var mo_date = postDate.substring(0, postDate.length - 3).replace(/[\u4e00-\u9fa5]/g, '')
    if (mo_date.length == 5) mo_date = mo_date.substring(0, 4) + '0' + mo_date.substring(4, 5)
    acc_text = acc_text.substring(0, 2) + acc_text.substring(acc_text.length - 2, acc_text.length)
    var T_memo = acc_text + mo_date.substring(0, 6) + '-0' // 款备注
    var fm = mo_date.substring(0, 6) // 期 202006  年月
    var R_memo = interfun.CreatePaymentRec('refunds', acc, cid, T_memo, fm, currency, '', 1)
    log.debug('R_memo :', R_memo)
    credit_memo.setText({fieldId: 'trandate', text: postDate })
    credit_memo.setValue({fieldId: 'memo',value: R_memo})
    credit_memo.setValue({fieldId: 'custbody_order_locaiton',value: acc})
    credit_memo.setValue({fieldId: 'custbody_aio_marketplaceid',value: 1})
    // var lc = credit_memo.getLineCount({ sublistId: 'item' })
    // for (var ln = 0; ln < lc; ln++) {
    //     var line = return_authorization.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: credit_memo.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) })
    //     credit_memo.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: return_authorization.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln })
    // }
    var cre = credit_memo.save({ignoreMandatoryFields: true})
    log.audit('\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355\u6210\u529f', cre)
    return rs
  }

  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete
  }
})
