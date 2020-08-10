/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript 
 */
define(['N/format', 'N/runtime', 'N/search', 'N/record', './Helper/Moment.min.js', './Helper/interfunction.min', './Helper/core.min.js', 'N/xml'],
  function (format, runtime, search, record, moment, interfun, core, xml) {
    // 单价的计算逻辑
    const price_conf = {
      'SKU售价': 'item_price',
      '收取运费': 'shipping_price',
      '促销折扣': 'promotion_discount',
      '运费折扣': 'shipping_discount',
      'giftwrap': 'gift_wrap_price'
    }
    const cc_type = 1; // 订单联系人类型，C端客户
    // 订单类型
    const ord_type = {
      'AFN': 1,
      'MFN': 2
    }
    // 订单状态
    const ord_status = {
      'PendingAvailability': 1,
      'Pending': 2,
      'Unshipped': 3,
      'PartiallyShipped': 4,
      'Shipped': 5,
      'Canceled': 6,
      'Unfulfillable': 7
    }
    const MissingReportType = 1 // Missing report 发货报告
    function getInputData () {
      var startT = new Date().getTime()
      var limit = 4000, orders = []
      var acc = runtime.getCurrentScript().getParameter({ name: 'custscript_if_account' })
      var orderid = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_orderid' })
      var shipdate_ed = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_shipdate_ed' })
      var shipdate_st = runtime.getCurrentScript().getParameter({ name: 'custscript_amazon_shipdate_st' })
      var group_req = runtime.getCurrentScript().getParameter({ name: 'custscript_fulfill_accgroup' })
      var full_bj = runtime.getCurrentScript().getParameter({ name: 'custscript_full_bj' }) ? runtime.getCurrentScript().getParameter({ name: 'custscript_full_bj' }) : 'F'; // 搜索对应的标记
      var fils = []
      fils.push(search.createFilter({ name: 'custrecord_fulfill_in_ns', operator: 'isnot', values: 'T' }))
      var acc_arrys = []
      if (group_req) { // 根据拉单分组去履行
        core.amazon.getReportAccountList(group_req).map(function (acount) {
          acc_arrys.push(acount.id)
        })
      }
      acc ? fils.push(search.createFilter({ name: 'custrecord_shipment_account', operator: search.Operator.ANYOF, values: acc })) : ''
      acc_arrys.length > 0 ? fils.push(search.createFilter({ name: 'custrecord_shipment_account', operator: search.Operator.ANYOF, values: acc_arrys })) : ''
      shipdate_st ? fils.push(search.createFilter({ name: 'custrecord_shipment_date', operator: search.Operator.ONORAFTER, values: shipdate_st })) : ''
      shipdate_ed ? fils.push(search.createFilter({ name: 'custrecord_shipment_date', operator: search.Operator.ONORBEFORE, values: shipdate_ed })) : ''
      orderid ? fils.push(search.createFilter({ name: 'custrecord_amazon_order_id', operator: search.Operator.IS, values: orderid })) : ''
      search.create({
        type: 'customrecord_amazon_sales_report',
        filters: fils,
        columns: [
          { name: 'custrecord_quantity_shipped' },
          { name: 'custrecord_shipment_date' },
          { name: 'custrecord_sku' },
          { name: 'custrecord_shipment_account' },
          { name: 'custrecord_aio_seller_id',join: 'custrecord_shipment_account' },
          { name: 'custrecord_aio_fbaorder_location',join: 'custrecord_shipment_account' },
          { name: 'custrecord_division',join: 'custrecord_shipment_account' },
          { name: 'custrecord_amazon_order_id' },
          { name: 'custrecord_merchant_order_id' },
          { name: 'custrecord_sales_channel' },
          { name: 'custrecord_shipment_date_text' }
        ]
      }).run().each(function (e) {
        orders.push({
          'reporid': e.id,
          'report_acc': e.getValue('custrecord_shipment_account'),
          'report_acc_txt': e.getText('custrecord_shipment_account'),
          'order_id': e.getValue('custrecord_amazon_order_id'),
          'merchant_order_id': e.getValue('custrecord_merchant_order_id'),
          'ship_sku': e.getValue('custrecord_sku'),
          'ship_qty': e.getValue('custrecord_quantity_shipped'),
          'seller_id': e.getValue(e.columns[4]),
          'loca': e.getValue(e.columns[5]),
          'dept': e.getValue(e.columns[6]),
          'shipDate_txt': e.getValue('custrecord_shipment_date_text'),
          'market': e.getValue('custrecord_sales_channel')
        })
        return --limit > 0
      })

      log.audit('订单总数' + orders.length, orders)
      // var endmap = new Date().getTime()
      // log.debug('000getInputData endTime ' + (endmap - startT), new Date().getTime())
      return orders
    }

    function map (context) {
      var startT = new Date().getTime()
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var date = format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
      })
      var err = [], acc, transactionType
      transactionType = 'fulfillment'
      var so_id
      var obj = JSON.parse(context.value)
      var shipDate = obj.shipDate_txt,
        report_acc = obj.report_acc,
        report_acc_txt = obj.report_acc_txt,
        ship_sku = obj.ship_sku,
        order_id = obj.order_id,
        ship_qty = obj.ship_qty,
        dept = obj.dept,
        merchant_order_id = obj.merchant_order_id,
        market = obj.market, // marketplaceName
        repid = obj.reporid
      try {
        shipDate = interfun.getFormatedDate('', '', shipDate, '', true).date
        if (shipDate == '2') {
          record.submitFields({
            type: 'customrecord_amazon_sales_report',
            id: repid,
            values: {
              custrecord_fulfill_in_ns: '时间在5月'
            }
          })
          return
        }
        var flss = [],acc_search = interfun.getSearchAccount(obj.seller_id)
        var ord_status
        log.debug('order_id', order_id)
        var so_obj = interfun.SearchSO(order_id, merchant_order_id, acc_search)
        so_id = so_obj.so_id
        acc = so_obj.acc
        ord_status = so_obj.ord_status

        log.debug('ord_status: ' + ord_status, 'so_obj: ' + JSON.stringify(so_obj))
        if (so_id) {
          if (ord_status == 'pendingApproval') { // 待批准
            record.submitFields({
              type: record.Type.SALES_ORDER,
              id: so_id,
              values: {
                orderstatus: 'B'
              },
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true
              }
            })
          }
          // 查询有没有关联此发货报告的发票
          var inv_id = [],fulfill_id = []
          search.create({
            type: 'invoice',
            filters: [
              { name: 'custbody_shipment_report_rel', operator: 'anyof', values: repid},
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
              { name: 'custbody_shipment_report_rel', operator: 'anyof', values: repid},
              { name: 'mainline', operator: 'is', values: true }
            ]
          }).run().each(function (rec) {
            fulfill_id.push(rec.id)
            return true
          })
          if (inv_id.length == 1 && fulfill_id.length == 1) {
            // 已存在此报告的发票，并且只有一个，就设置为T
            record.submitFields({
              type: 'customrecord_amazon_sales_report',
              id: repid,
              values: {
                custrecord_fulfill_in_ns: 'T'
              }
            })
            return
          }else if (inv_id.length == 0 && fulfill_id.length > 0) {
            fulfill_id.map(function (dls) {
              // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
              var de = record.delete({type: 'itemfulfillment',id: dls})
              log.debug('已删除发货单，重新发货发票', de)
            })
          }else if (inv_id.length > 0 && fulfill_id.length > 0) {
            // 发货有问题，停止发货，需要人工检查问题
            record.submitFields({
              type: 'customrecord_amazon_sales_report',
              id: repid,
              values: {
                custrecord_fulfill_in_ns: 'error'
              }
            })
            return
          }
          if (ord_status == 'fullyBilled') { // 已经全部开票？？
            record.submitFields({
              type: 'customrecord_amazon_sales_report',
              id: repid,
              values: {
                custrecord_fulfill_in_ns: '没发货已开票'
              }
            })
            return
          }
          var ful_rs = fullfillment(so_id, shipDate, ship_sku, ship_qty, repid, obj.loca, dept); // 发货
          if (ful_rs.indexOf('不足') > -1) {
            err.push(ful_rs)
            record.submitFields({
              type: 'customrecord_amazon_sales_report',
              id: repid,
              values: {
                custrecord_fulfill_in_ns: '库存不足'
              }
            })
          }
        }else {
          if (order_id.indexOf('S') == -1) {
            var cach
            var T_acc = interfun.GetstoreInEU(report_acc, market, report_acc_txt).acc
            log.error(' 找不到订单 T_acc' + T_acc, 'order_id: ' + order_id)
            var fil = []
            fil.push(search.createFilter({ name: 'custrecord_aio_cache_acc_id', operator: search.Operator.IS, values: T_acc }))
            fil.push(search.createFilter({ name: 'custrecord_aio_cache_order_id', operator: search.Operator.IS, values: order_id }))
            fil.push(search.createFilter({ name: 'custrecord_aio_cache_status', operator: search.Operator.ISNOT, values: 'pending' }))
            search.create({
              type: 'customrecord_aio_order_import_cache',
              filters: fil
            }).run().each(function (e) {
              cach = e.id
            })
            if (!cach)
              getOrderAndCreateCache(T_acc, T_acc, order_id); // 找不到订单，根据单号把订单拉回来；
            else {
              var invs = orderupRl(order_id, cach, T_acc)
              log.debug('转单：', invs)
            }
          }
          record.submitFields({
            type: 'customrecord_amazon_sales_report',
            id: repid,
            values: {
              custrecord_fulfill_in_ns: 'F'
            }
          })
        }
      } catch (e) {
        log.error(' error ：' + order_id, e)
        err.push(e)
      }
      log.debug('000map endTime', new Date().getTime() - startT)

      // 创建missorder
      if (err.length > 0) {
        if (acc)
          var moId = createSOTRMissingOrder(transactionType, order_id, JSON.stringify(err), date, acc)
        else
          var moId = createSOTRMissingOrder(transactionType, order_id, JSON.stringify(err), date, report_acc)
        log.debug('出现错误，已创建missingorder' + moId)
      } else {
        if (acc) {
          delMissingReportRec(MissingReportType, orderid, '发货时，发货报告找不到销售订单', acc)
          makeresovle(transactionType, order_id, acc)
        }else {
          delMissingReportRec(MissingReportType, orderid, '发货时，发货报告找不到销售订单', report_acc)
          makeresovle(transactionType, order_id, report_acc)
        }
      }
    }

    // ========================order up=============================
    function orderupRl (oid, cachid, acc) {
      var limit = 1 // 999 //350
      var startT = new Date().getTime()
      log.debug('acc', acc)
      var orders = [], orderid
      try {
        core.amazon.getAccountList().map(function (account) {
          if (account.id == acc) {
            var filters = [
              {
                name: 'custrecord_aio_cache_status',
                operator: 'isnot',
                values: 'Pending'
              }
            ]
            if (oid) {
              filters.push({
                name: 'custrecord_aio_cache_order_id',
                operator: 'is',
                values: oid
              })
            }
            if (cachid) {
              filters.push({
                name: 'internalidnumber',
                operator: 'equalto',
                values: cachid
              })
            }
            filters.push({
              name: 'custrecord_aio_cache_acc_id',
              operator: search.Operator.ANYOF,
              values: account.id
            })
            search.create({
              type: 'customrecord_aio_order_import_cache',
              filters: filters,
              columns: [{
                name: 'created',
                sort: search.Sort.DESC
              },
                {
                  name: 'custrecord_aio_cache_acc_id'
                },
                {
                  name: 'custrecord_aio_cache_body'
                },
                {
                  name: 'custrecord_amazonorder_iteminfo'
                },
                {
                  name: 'custrecord_aio_cache_version',
                  sort: 'ASC'
                },
                {
                  name: 'custrecord_aio_cache_order_id'
                }
              ]
            }).run().each(function (rec) {
              orderid = rec.getValue('custrecord_aio_cache_order_id')
              orders.push({
                rec_id: rec.id,
                version: rec.getValue({
                  name: 'custrecord_aio_cache_version',
                  sort: 'ASC'
                }),
                id: account.id,
                currency: account.info.currency,
                auth: account.auth_meta,
                info: account.info,
                extra: account.extra_info,
                timezone: account.timezone,
                pref: account.preference,
                country: account.country,
                customer: account.customer,
                ord_formula: account.ord_formula,
                order: JSON.parse(rec.getValue('custrecord_aio_cache_body')),
                iteminfo: rec.getValue('custrecord_amazonorder_iteminfo') ? rec.getValue('custrecord_amazonorder_iteminfo') : '',
                enabled_sites: account.enabled_sites
              })
              return --limit > 0
            })
          }
        })
      } catch (error) {
        return 'failer:' + error.message
      }
      log.debug('orders:' + orders.length)
      if (orders.length == 0)
        return '店铺 :' + acc + 'order:' + orders.length
      try {
        orders.map(function (obj) {
          log.audit('obj', obj)
          var amazon_account_id = obj.id
          var o = obj.order
          var a = obj.auth
          var i = obj.info
          var e = obj.extra
          var timezone = obj.timezone
          var p = obj.pref
          var cy = obj.currency
          var country = obj.country
          var r_id = obj.rec_id
          var ord_formula = obj.ord_formula; // 计算公式

          var version = obj.version
          var err = []
          log.error('version ' + version, 'country: ' + country)

          var customer = obj.customer
          var line_items

          var externalid = 'aio' + amazon_account_id + '.' + o.amazon_order_id

          var fulfillment_channel = o.fulfillment_channel

          var order_type = (o.fulfillment_channel == 'MFN' ? i.salesorder_type : e.fbaorder_type) == '1' ? 'salesorder' : 'salesorder'
          var order_form = o.fulfillment_channel == 'MFN' ? i.salesorder_form : e.fbaorder_form

          var order_location = o.fulfillment_channel == 'MFN' ? i.salesorder_location : e.fbaorder_location
          var order_trandate = format.format({
            value: moment.utc(o.purchase_date).toDate(),
            type: format.Type.DATETIMETZ,
            timezone: fields.timezone[timezone] // depositDate
          }).split(' ')[0]

          var error_message = [],
            currency_id
          var ord, c

          var order_lastupdate = o.last_update_date
          var enabled_sites = obj.enabled_sites

          var dateFormat

          log.audit('o.order_total.currency_code', o.order_total.currency_code)
          search.create({
            type: 'currency',
            filters: [{
              name: 'symbol',
              operator: 'is',
              values: o.order_total.currency_code
            }]
          }).run().each(function (e) {
            currency_id = e.id
            return true
          })
          if (!currency_id) currency_id = cy
          log.debug(externalid, externalid + ' | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!'); // 开始处理订单!
          try {
            // /** 设置只抓取有付款信息的订单 */
            // if (p.if_only_paid_orders) {
            //     if (o.fulfillment_channel == 'MFN' && o.order_status == 'Pending')
            //         return mark_resolved(amazon_account_id, o.amazon_order_id)
            //     if (o.fulfillment_channel == 'AFN' && o.order_status != 'Shipped')
            //         return mark_resolved(amazon_account_id, o.amazon_order_id)
            // }
            log.debug(externalid, externalid + ' | \u5F00\u59CB\u5904\u7406\u8BA2\u5355!  111 ' + order_type)
            var so_i = interfun.SearchSO(o.amazon_order_id, '', amazon_account_id)
            if (so_i.so_id)
              ord = record.load({
                type: order_type,
                id: so_i.so_id,
                isDynamic: true
              })
            /** 状态未更新，直接PASS */
            if (ord && o.order_status == 'Pending') {
              return mark_resolved(amazon_account_id, o.amazon_order_id)
            }
            if (!ord) {
              var cid = customer

              ord = record.create({
                type: order_type,
                isDynamic: true
              })
              log.debug('order_type', order_type) // salesorder
              log.debug('order_form1', order_form) // 68
              if (order_form) {
                ord.setValue({
                  fieldId: 'customform',
                  value: Number(order_form)
                })
              }

              // 1 待定 / 未付款
              // 2 已付款待发货
              // 3 已发货
              // 4 已完成
              // 5 已取消

              var pay_ord
              if (o.order_status == 'Shipped') {
                pay_ord = 3
              } else if (o.order_status == 'Pending') {
                pay_ord = 1
              } else if (o.order_status == 'Canceled') {
                pay_ord = 5
              } else {
                pay_ord = 2
              }

              // set payment status
              if (pay_ord) {
                ord.setValue({
                  fieldId: 'custbody_payment_state',
                  value: pay_ord
                })
              }
              var acc_local_time = format.format({
                value: moment.utc(o.purchase_date).toDate(),
                type: format.Type.DATETIMETZ,
                timezone: fields.timezone[timezone]
              }); // 当地店铺时间
      
              ord.setText({
                fieldId: 'custbody_dps_acc_local_time',
                text: acc_local_time
              })
              log.debug(externalid, externalid + ' | \u7ED9\u8BA2\u5355\u8BBE\u7F6Eentity ID: ' + cid)
              ord.setValue({
                fieldId: 'entity',
                value: cid
              })
              //  ord.setValue({fieldId: 'entity',value: 6796})
              log.debug('2getSublistValue', cid)
              if (o.fulfillment_channel == 'MFN') {
                ord.setValue({
                  fieldId: 'orderstatus',
                  value: 'A'
                })
                log.debug('3orderstatus', 'A')
              }
              log.debug('4trandate', order_trandate)

              ord.setText({
                fieldId: 'trandate',
                text: order_trandate
              })

              ord.setValue({
                fieldId: 'custbody_amazon_purchase_date',
                value: o.purchase_date
              })
              // 设置亚马逊订单状态
              ord.setValue({
                fieldId: 'custbody_amazon_order_status',
                value: ord_status[o.order_status]
              })
              // 设置订单的类型 AFN/MFN
              ord.setValue({
                fieldId: 'custbody_order_type',
                value: ord_type[o.fulfillment_channel]
              })
              log.debug('5currency：' + typeof (currency_id), currency_id)
              ord.setValue({
                fieldId: 'currency',
                value: Number(currency_id)
              })
              log.debug('6otherrefnum', o.amazon_order_id)
              ord.setValue({
                fieldId: 'otherrefnum',
                value: o.amazon_order_id
              })
              log.debug('7externalid', externalid)
              ord.setValue({
                fieldId: 'externalid',
                value: externalid
              })
              log.debug('8department', i.dept)
              if (i.dept) {
                ord.setValue({
                  fieldId: 'department',
                  value: i.dept
                })
              }
            } else {
              var acc_local_time = format.format({
                value: moment.utc(o.purchase_date).toDate(),
                type: format.Type.DATETIMETZ,
                timezone: fields.timezone[timezone]
              }); // 当地店铺时间

              ord.setText({
                fieldId: 'custbody_dps_acc_local_time',
                text: acc_local_time
              })
              ord.setText({
                fieldId: 'trandate',
                text: order_trandate
              })

              log.debug('o.order_lastupdate11', order_lastupdate)
              if (ord.getValue('orderstatus') == 'A' && ['Pending', 'Canceled', 'Unfulfillable'].indexOf(o.order_status) > -1) {
                /** 如果有地址，替换掉原来的临时地址 */
                if (o.shipping_address && o.buyer_email) {
                  c = record.load({
                    type: 'customer',
                    id: ord.getValue('entity'),
                    isDynamic: true
                  })
                  c.setValue({
                    fieldId: 'isperson',
                    value: 'T'
                  })
                  if (i.subsidiary)
                    c.setValue({
                      fieldId: 'subsidiary',
                      value: i.subsidiary
                    })
                  log.debug('i.subsidiary', i.subsidiary)
                  var names = o.buyer_email.split(' ').filter(function (n) {
                    return n != ''
                  })
                  c.setValue({
                    fieldId: 'firstname',
                    value: names[0]
                  })
                  c.setValue({
                    fieldId: 'lastname',
                    value: (names.length > 1 ? (names.length > 2 ? names[2] : names[1]) : '*')
                  })
                  c.setValue({
                    fieldId: 'middlename',
                    value: names.length > 2 ? names[1] : ''
                  })
                  c.setValue({
                    fieldId: 'currency',
                    value: Number(currency_id)
                  })
                  c.setValue({
                    fieldId: 'email',
                    value: o.buyer_email
                  })
                  c.selectNewLine({
                    sublistId: 'addressbook'
                  })
                  c.setCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultshipping',
                    value: true
                  })
                  c.setCurrentSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultbilling',
                    value: true
                  })
                  var addr = c.getCurrentSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress'
                  })
                  addr.setValue({
                    fieldId: 'country',
                    value: o.shipping_address.country_code
                  })
                  addr.setValue({
                    fieldId: 'city',
                    value: o.shipping_address.city
                  })
                  addr.setValue({
                    fieldId: 'state',
                    value: o.shipping_address.state_or_oegion.slice(0, 30)
                  })
                  addr.setValue({
                    fieldId: 'zip',
                    value: o.shipping_address.postal_code
                  })

                  addr.setValue({
                    fieldId: 'addressee',
                    value: o.shipping_address.name
                  })
                  addr.setValue({
                    fieldId: 'addr1',
                    value: o.shipping_address.address_line1
                  })
                  addr.setValue({
                    fieldId: 'addr2',
                    value: o.shipping_address.address_line2
                  })
                  c.commitLine({
                    sublistId: 'addressbook'
                  })
                  log.debug('13', 13)
                  try {
                    c.save()
                    log.debug(externalid, externalid + ' | \u66F4\u65B0\u5BA2\u4EBA\u4FE1\u606F\u6210\u529F! #' + c.id)
                  } catch (e) {
                    throw 'SAVING CUSTOMER INFORMATION FAILED: ' + e
                  }
                }
              }
              var pay_ord
              if (o.order_status == 'Shipped') {
                pay_ord = 3
              } else if (o.order_status == 'Pending') {
                pay_ord = 1
              } else if (o.order_status == 'Canceled') {
                pay_ord = 5
              } else {
                pay_ord = 2
              }

              // set payment status
              if (pay_ord) {
                ord.setValue({
                  fieldId: 'custbody_payment_state',
                  value: pay_ord
                })
              }

              // set LAST UPDATE DATE
              ord.setValue({
                fieldId: 'custbody_aio_s_l_u_date',
                value: o.last_update_date
              })

              // set purchase date
              ord.setValue({
                fieldId: 'custbody_aio_s_p_date',
                value: o.purchase_date
              })

              // set PLATFORM ORDER STATUS
              ord.setValue({
                fieldId: 'custbody_aio_s_order_status',
                value: o.order_status
              })

              // set SALES CHANNEL
              ord.setValue({
                fieldId: 'custbody_aio_s_sales_channel',
                value: o.sales_channel
              })
              // set EARLIEST SHIP DATE
              ord.setValue({
                fieldId: 'custbody_aio_s_earliest_ship_date',
                value: o.earliest_ship_date
              })

              // set order type 
              ord.setValue({
                fieldId: 'custbody_aio_s_order_type',
                value: o.order_type
              })

              var soId = ord.save({
                ignoreMandatoryFields: true
              })
              return mark_resolved(amazon_account_id, o.amazon_order_id)
            }
            try {
              line_items = JSON.parse(line_items)
            } catch (error) {
              line_items = ''
              log.error('error', error)
            }
            if (!line_items || line_items.length == 0) {
              line_items = core.amazon.getOrderItems(a, o.amazon_order_id)
              log.debug('0000011line_items:' + obj.rec_id, line_items)

              record.submitFields({
                type: 'customrecord_aio_order_import_cache',
                id: obj.rec_id,
                values: {
                  'custrecord_amazonorder_iteminfo': JSON.stringify(line_items)
                }
              })
              var fs = []
              search.create({
                type: 'customrecord_amazon_item_lines',
                filters: [
                  {name: 'custrecord_aitem_rel_cahce',operator: 'anyof',values: obj.rec_id }
                ]
              }).run().each(function (e) {
                fs.push(e.id)
                return true
              })

              if (line_items.length < 1 || !line_items) {
                log.debug('item_obj为空,退出', line_items)
                return
              }

              for (var i = 0;i < line_items.length;i++) {
                var ss = record.create({type: 'customrecord_amazon_item_lines'})
                ss.setValue({fieldId: 'custrecord_aitem_title',value: line_items[i].title})
                ss.setValue({fieldId: 'custrecord_aitem_seller_sku',value: line_items[i].seller_sku})
                ss.setValue({fieldId: 'custrecord_aitem_qty',value: line_items[i].qty})
                ss.setValue({fieldId: 'custrecord_aitem_shipping_discount',value: line_items[i].shipping_discount})
                ss.setValue({fieldId: 'custrecord_aitem_item_price',value: line_items[i].item_price})
                ss.setValue({fieldId: 'custrecord_aitem_promotion_discount',value: line_items[i].promotion_discount})
                ss.setValue({fieldId: 'custrecord_aitem_gift_wrap_price',value: line_items[i].gift_wrap_price})
                ss.setValue({fieldId: 'custrecord_aitem_shipping_price',value: line_items[i].shipping_price})
                ss.setValue({fieldId: 'custrecord_ord_itemtax',value: line_items[i].item_tax})
                log.debug('设置sippingTax', line_items[i].shipping_tax)
                ss.setValue({fieldId: 'custrecord_ord_shippingtax',value: line_items[i].shipping_tax})
                ss.setValue({fieldId: 'custrecord_aitem_rel_cahce',value: obj.rec_id})
                ss.save()
              }
              fs.map(function (ds) {
                record.delete({type: 'customrecord_amazon_item_lines',id: ds})
                log.debug('先删除')
              })
            }

            log.debug('OKokokok:' + obj.rec_id, line_items)
            var itemAry = [],
              tax_item_amount = 0,
              num = 0

            var amazon_sku

            // 计算公式
            log.debug('计算公式:', ord_formula)
            var fla = {}
            var formula_str = ord_formula.split(/[^+-]/g).join('').split('')
            log.debug('1formula ', formula_str)
            var formula_name = ord_formula.split(/[{}+-]/g)
            log.debug('2 formula ', formula_name)
            var fsn = 0
            for (var i = 0; i < formula_name.length; i++) {
              if (formula_name[i]) {
                if (fsn == 0) {
                  fla[price_conf[formula_name[i]]] = 'start'
                  fsn++
                } else {
                  fla[price_conf[formula_name[i]]] = formula_str[fsn - 1]
                  fsn++
                }
              }
            }

            log.debug('2 fla ', fla)

            line_items.map(function (line) {
              log.debug('line', line)
              log.debug('amazon_account_id', amazon_account_id)
              itemAry.push(line.seller_sku)
              var skuid

              try {
                skuid = interfun.getskuId(line.seller_sku.trim(), amazon_account_id, o.amazon_order_id)
              } catch (e) {
                log.error('assemblyitem error :::', e)
              }
              ord.selectNewLine({
                sublistId: 'item'
              })
              log.debug('12set skuid', 'skuid:' + skuid + ', cid:' + cid)

              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: skuid
              })

              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                value: order_location
              })

              // ASIN
              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_aio_amazon_asin',
                value: line.asin
              })
              // seller sku
              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_dps_trans_order_item_sku',
                value: line.seller_sku
              })
              // MSKU
              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_aio_amazon_msku',
                value: line.seller_sku
              })

              log.debug('14quantity:' + typeof (line.qty), line.qty)
              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: line.qty
              })

              // 按照计算逻辑公式计算itemprice

              var itemprice = 0,
                fla_str = ''
              for (key in fla) {
                if (fla[key] == 'start') {
                  itemprice = Number(line[key])
                  fla_str += key + ''
                } else {
                  if (fla[key] == '-') {
                    itemprice = itemprice - Number(line[key])
                    fla_str += '-' + key
                  } else if (fla[key] == '+') {
                    fla_str += '+' + key
                    itemprice = itemprice + Number(line[key])
                  }
                }
              }
              log.debug('组合好的计算公式fla_str:', fla_str)
              log.debug('0000000itemprice:' + itemprice, '原始的货品价格：' + line.item_price)

              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: (itemprice / line.qty).toFixed(2)
              })

              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                value: itemprice.toFixed(2)
              })
              log.debug('17line.item_price', line.item_price)
              ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_aio_origianl_amount',
                value: itemprice.toFixed(2)
              })
              log.audit('tax_item_amount::', line.item_tax + ',' + line.shipping_tax)
              /** 设置订单含税 */
              if (p.salesorder_if_taxed && i.tax_item && line.item_tax) {
                log.debug('18item taxcode:' + typeof (i.tax_item), i.tax_item)
                ord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'taxcode',
                  value: i.tax_item
                })
              // if (country != "US" && country != "CA") {
              //     ord.setCurrentSublistValue({
              //         sublistId: 'item',
              //         fieldId: 'tax1amt',
              //         value: line.item_tax ? line.item_tax : 5
              //     })
              //     log.debug('19item tax1amt', line.item_tax)
              // }
              } else {
                log.debug('20item taxcode', i.tax_item)
                ord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'taxcode',
                  // value: i.tax_item ? i.tax_item : 5 // 5 无税
                  value: i.tax_item ? i.tax_item : 6 // 5 无税
                })
              }
              /** 设置0单价商品 */
              if (p.if_zero_price) {
                ord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'rate',
                  value: 0
                })
                ord.setCurrentSublistValue({
                  sublistId: 'item',
                  fieldId: 'amount',
                  value: 0
                })
              }

              try {
                ord.commitLine({
                  sublistId: 'item'
                })
                log.debug(externalid, externalid + ' | \u884C\u4FE1\u606F\u63D2\u5165\u6210\u529F! #' + line.order_item_id + ' * ' + line.qty)
              } catch (err) {
                // mark_resolved(amazon_account_id, o.amazon_order_id)
                error_message.push('Item Line Error: ' + err + '. Associated SKU: ' + line.seller_sku + ';')
                throw 'Item Line Error: ' + err + '. Associated SKU: ' + line.seller_sku + ';'
              }
            })

            log.debug('o.order_total.amount:' + typeof (o.order_total.amount), o.order_total.amount)
            ord.setValue({
              fieldId: 'amount',
              value: o.order_total.amount
            })
            //  log.debug('27amount', o.order_total.amount)
            ord.setValue({
              fieldId: 'shipcarrier',
              value: 'nonups'
            })
            if (o.shipping_address) {
              ord.setValue({
                fieldId: 'shipcountrycode',
                value: o.shipping_address.country_code
              })
            }
            if (o.shipping_address) {
              ord.setValue({
                fieldId: 'shipzip',
                value: o.shipping_address.postal_code
              })
            }

            ord.setValue({
              fieldId: 'custbody_aio_marketplaceid',
              value: 1 /* amazon */
            })
            log.debug('30 amazon_account_id:' + typeof (amazon_account_id), amazon_account_id)
            ord.setValue({
              fieldId: 'custbody_aio_account',
              value: Number(amazon_account_id)
            })
            ord.setValue({
              fieldId: 'custbody_order_locaiton', // 订单店铺
              value: Number(amazon_account_id)
            })
            ord.setValue({
              fieldId: 'custbody_sotck_account', // 发货店铺
              value: Number(amazon_account_id)
            })
            ord.setValue({
              fieldId: 'custbody_aio_api_content',
              value: JSON.stringify(o)
            })

            log.debug('31-1order_location', order_location)
            if (o.fulfillment_channel == 'MFN') {
              // 仓库优选
              var ship_loca_id = loactionPre.locationPreferred(amazon_account_id)
              if (ship_loca_id) {
                order_location = ship_loca_id
              }
            }

            log.debug('31-2order_location', order_location)
            ord.setValue({
              fieldId: 'location',
              value: order_location
            })

            var con_per = searchCusContactPerson(o, customer)

            // 设置联系人
            if (con_per) {
              ord.setValue({
                fieldId: 'custbody_dps_order_contact',
                value: con_per
              })
            }

            for (var field_id in core.consts.fieldsMapping._LIST_ORDERS_.mapping) {
              ord.setValue({
                fieldId: field_id,
                value: o[core.consts.fieldsMapping._LIST_ORDERS_.mapping[field_id]]
              })
            }
            if (error_message.length) {
              var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + error_message.join('\n'), order_trandate)
              log.debug(externalid, externalid + ' | \u5305\u542B\u9519\u8BEF\u4FE1\u606F\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #' + mid + ' order: ' + JSON.stringify(o, null, 2))
            } else {
              try {
                /** 设置是AIO进单 */
                ord.setValue({
                  fieldId: 'custbody_aio_is_aio_order',
                  value: true
                })

                // set fulfillment channel
                ord.setValue({
                  fieldId: 'custbody_aio_s_fulfillment_channel',
                  value: fulfillment_channel
                })

                // set purchase_date
                ord.setValue({
                  fieldId: 'custbody_aio_s_p_date',
                  value: o.purchase_date
                })

                // set LAST UPDATE DATE
                ord.setValue({
                  fieldId: 'custbody_aio_s_l_u_date',
                  value: o.last_update_date
                })

                // set payment status
                if (pay_ord) {
                  ord.setValue({
                    fieldId: 'custbody_payment_state',
                    value: pay_ord
                  })
                }

                // set PLATFORM ORDER STATUS
                ord.setValue({
                  fieldId: 'custbody_aio_s_order_status',
                  value: o.order_status
                })

                // set SALES CHANNEL
                ord.setValue({
                  fieldId: 'custbody_aio_s_sales_channel',
                  value: o.sales_channel
                })
                // set EARLIEST SHIP DATE
                ord.setValue({
                  fieldId: 'custbody_aio_s_earliest_ship_date',
                  value: o.earliest_ship_date
                })

                // set order type 
                ord.setValue({
                  fieldId: 'custbody_aio_s_order_type',
                  value: o.order_type
                })

                // set order item info 
                ord.setValue({
                  fieldId: 'custbody_dps_amazonorder_iteminfo',
                  value: JSON.stringify(line_items) ? JSON.stringify(line_items) : ''
                })

                var soId = ord.save({
                  ignoreMandatoryFields: true
                })
                log.audit('订单生成成功', soId)
                // 如果状态是已取消，则关闭销售订单
                if (o.order_status == 'Canceled') {
                  var so = record.load({ type: 'salesorder', id: soId })
                  var LineCount = so.getLineCount({ sublistId: 'item' })
                  for (var i = 0; i < LineCount; i++) {
                    so.setSublistValue({
                      sublistId: 'item',
                      fieldId: 'isclosed',
                      line: i,
                      value: true
                    })
                  }
                  var ss = so.save()
                  log.debug('关闭成功', ss)
                }
                if (o.fulfillment_channel == 'MFN') {
                  //     // 创建相应的发货记录
                  //     var ful_rec = createFulfillmentRecord(soid, itemAry)
                  //     log.audit('发运记录生成成功', ful_rec)
                }

                /** 删除CACHE记录 */
                mark_resolved(amazon_account_id, o.amazon_order_id)
                /** 删除Missing Order的记录如果存在 */
                search.create({
                  type: 'customrecord_aio_connector_missing_order',
                  filters: [{
                    name: 'externalid',
                    operator: 'is',
                    values: externalid
                  }]
                }).run().each(function (rec) {
                  record.submitFields({
                    type: 'customrecord_aio_connector_missing_order',
                    id: rec.id,
                    values: {
                      'custrecord_aio_missing_order_is_resolved': true,
                      'custrecord_aio_missing_order_resolving': false
                    }
                  })
                  return true
                })
              } catch (err) {
                log.error('SO Error: ', err)
                var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, 'SO Error: ' + err, order_trandate)

                log.debug(externalid, externalid + ' | \u8BA2\u5355\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #' + mid + ' order: ' + JSON.stringify(o, null, 2))
              }
            }
          } catch (err) {
            log.debug(externalid, externalid + ' | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #' + mid + ' order: ' + JSON.stringify(o, null, 2))
            log.error('error message:', amazon_account_id + ',' + o.amazon_order_id + ',' + itemAry + 'System Error: ' + err)
            var mid = mark_missing_order(externalid, amazon_account_id, o.amazon_order_id, itemAry + 'System Error: ' + err, order_trandate)

            record.submitFields({
              type: 'customrecord_aio_order_import_cache',
              id: obj.rec_id,
              values: {
                'custrecord_aio_cache_version': Number(version) + 1
              }
            })
            log.debug(externalid, externalid + ' | \u7CFB\u7EDF\u7EA7\u522B\u9519\u8BEF\uFF0C\u8BA2\u5355\u63A8\u81F3MISSING ORDER! #' + mid + ' order: ' + JSON.stringify(o, null, 2))
          }
          log.debug('生成一张单耗时:', new Date().getTime() - startT)

          if (error_message.length > 0) {
            return 'fail:' + o.amazon_order_id + ',error_message:' + error_message
          } else {
            // makeresovle('journalvoucher', orderid, pr_store)
            return 'success:' + o.amazon_order_id
          }
        })
        var DET = new Date().getTime() - startT
        return 'success: ' + orderid + ', 耗时：' + DET
      } catch (e) {
        log.error('e', e)
        return 'failer:' + orderid + ', error: ' + e
      }
    }

    /**
   * 创建订单联系人
   * @param {*} o 
   * @param {*} consumer_id 
   */
    function searchCusContactPerson (o, consumer_id) {
      var c_id

      // var o_name = o.shipping_address.name ? o.shipping_address.name : (o.buyer_name ? o.buyer_name : (o.buyer_email.split('@')[0]))

      if (o.shipping_address && o.buyer_email) {
        var names
        if (o.shipping_address.name) {
          names = o.shipping_address.name.split(' ').filter(function (n) {
            return n != ''
          })
        }

        if (o.buyer_name) {
          names = o.buyer_name.split(' ').filter(function (n) {
            return n != ''
          })
        } else {
          names = o.buyer_email.split(' ').filter(function (n) {
            return n != ''
          })
        }
        var c = record.create({
          type: 'customrecord_customer_contact',
          isDynamic: true
        })
        c.setValue({
          fieldId: 'name',
          value: o.shipping_address.name ? o.shipping_address.name : (o.buyer_name ? o.buyer_name : (o.buyer_email.split('@')[0]))
        })
        c.setValue({
          fieldId: 'custrecord_cc_first_name',
          value: names[0]
        })
        c.setValue({
          fieldId: 'custrecord_cc_last_name',
          value: names[1]
        })
        // c.setValue({ fieldId: 'custrecord_cc_phone_number', value: data.default_address.phone })
        c.setValue({
          fieldId: 'custrecord_cc_entity',
          value: consumer_id
        })
        c.setValue({
          fieldId: 'custrecord_cc_email',
          value: o.buyer_email
        })
        // 设置国家名称
        if (o.shipping_address.country_code) {
          search.create({
            type: 'customrecord_country_code',
            filters: [
              {name: 'custrecord_cc_country_code',operator: 'is',values: o.shipping_address.country_code}
            ]
          }).run().each(function (e) {
            c.setValue({
              fieldId: 'custrecord_dps_cc_country',
              value: e.id
            })
          })
        }
        // 设置联系人类型
        c.setValue({
          fieldId: 'custrecord_cc_type',
          value: cc_type
        })
        c.setValue({
          fieldId: 'custrecord_cc_country',
          value: o.shipping_address.country_code
        })

        c.setValue({
          fieldId: 'custrecord_cc_state',
          value: o.shipping_address.state_or_oegion.slice(0, 30)
        })
        c.setValue({
          fieldId: 'custrecord_cc_ctiy',
          value: o.shipping_address.city
        })
        c.setValue({
          fieldId: 'custrecord_cc_addr1',
          value: o.shipping_address.address_line1
        })
        c.setValue({
          fieldId: 'custrecord_cc_addr2',
          value: o.shipping_address.address_line2
        })
        c.setValue({
          fieldId: 'custrecord_cc_zip',
          value: o.shipping_address.postal_code
        })
        c_id = c.save()
      }

      return c_id
    }

    var mark_missing_order = function (externalid, account_id, order_id, reason, purchase_date) {
      var mo
      search.create({
        type: 'customrecord_aio_connector_missing_order',
        filters: [{
          name: 'externalid',
          operator: 'is',
          values: externalid
        }]
      }).run().each(function (rec) {
        mo = record.load({
          type: 'customrecord_aio_connector_missing_order',
          id: rec.id
        })
        return false
      })
      if (!mo) {
        mo = record.create({
          type: 'customrecord_aio_connector_missing_order',
          isDynamic: true
        })
      }
      mo.setValue({
        fieldId: 'externalid',
        value: externalid
      })
      mo.setValue({
        fieldId: 'custrecord_aio_missing_order_account',
        value: account_id
      })
      mo.setValue({
        fieldId: 'custrecord_aio_missing_order_marketplace',
        value: 1 /* amazon */
      })
      mo.setValue({
        fieldId: 'custrecord_aio_missing_order_po_check_no',
        value: order_id
      })
      mo.setValue({
        fieldId: 'custrecord_aio_missing_order_reason',
        value: reason
      })
      mo.setValue({
        fieldId: 'customrecord_aio_connector_missing_order',
        value: purchase_date
      })
      mo.setValue({
        fieldId: 'customrecord_aio_connector_missing_order',
        value: false
      })
      mo.setValue({
        fieldId: 'customrecord_aio_connector_missing_order',
        value: false
      })
      return mo.save()
    }

    var mark_resolved = function (amazon_account_id, amazon_order_id) {
      log.debug('mark_resolved', 'mark_resolved')
      search.create({
        type: 'customrecord_aio_order_import_cache',
        filters: [{
          name: 'custrecord_aio_cache_acc_id',
          operator: search.Operator.ANYOF,
          values: amazon_account_id
        },
          {
            name: 'custrecord_aio_cache_order_id',
            operator: search.Operator.IS,
            values: amazon_order_id
          }
        ],
        columns: ['custrecord_aio_cache_version']
      }).run().each(function (r) {
        var ver = r.getValue('custrecord_aio_cache_version')
        record.submitFields({
          type: 'customrecord_aio_order_import_cache',
          id: r.id,
          values: {
            'custrecord_aio_cache_resolved': true
          }
        })
        return true
      })
    }

    function timeOffset (dateStr, zone) {
      // log.error("offset",dt.getTimezoneOffset())
      var a = dateStr.split(':')
      var b = a[a.length - 1]
      if (b.length < 7) {
        b = b.split('Z')[0] + '.000Z'
      }
      dateStr = a[0] + ':' + a[1] + ':' + b
      var dt = new Date(dateStr)
      var timestamp = dt.getTime()
      // log.error("offset2",new Date(timestamp+3600*1000*zone).getTimezoneOffset())
      return new Date(timestamp + 3600 * 1000 * zone)
    }
    // ========================order up=============================
    /**
      * 发货问题记录
      * @param {*} type 
      * @param {*} orderid 
      * @param {*} acc 
      */
    function TakeNote (acc, orderid, location, newsku, msku, qty) {
      var recs
      search.create({
        type: 'customrecord_fuifillment_itemrec',
        filters: [
          { name: 'custrecord_fulfillment_store', operator: 'is', values: acc },
          { name: 'custrecord_fulfillmentrec_orderid', operator: 'is', values: orderid },
          { name: 'custrecord_fulfillment_location', operator: 'is', values: location },
          { name: 'custrecord_fulfillment_qty', operator: 'is', values: qty },
          { name: 'custrecord_fulfillment', operator: 'is', values: msku },
          { name: 'custrecord_fulfillment_newsku', operator: 'is', values: newsku }
        ]
      }).run().each(function (rec) {
        recs = record.load({ type: 'customrecord_fuifillment_itemrec', id: rec.id })
      })
      if (!recs) {
        recs = record.create({ type: 'customrecord_fuifillment_itemrec' })
        recs.setValue({ fieldId: 'custrecord_fulfillment_store', value: acc })
        recs.setValue({ fieldId: 'custrecord_fulfillmentrec_orderid', value: orderid })
        recs.setValue({ fieldId: 'custrecord_fulfillment_location', value: location })
        recs.setValue({ fieldId: 'custrecord_fulfillment_qty', value: qty })
        recs.setValue({ fieldId: 'custrecord_fulfillment', value: msku })
        recs.setValue({ fieldId: 'custrecord_fulfillment_newsku', value: newsku })
        recs.save()
      }
    }
    /**
          * makeresovle missingorder
          * @param {*} type 
          * @param {*} orderid 
          * @param {*} acc 
          */
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
    /**
    * 生成单据失败记录
    * @param {*} type 
    * @param {*} account_id 
    * @param {*} order_id 
    * @param {*} so_id 
    * @param {*} reason 
    * @param {*} date 
    */
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
      mo.setValue({
        fieldId: 'custrecord_tr_missing_order_date',
        value: date
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

    /**
     * 执行完成，删除已有的差异记录
     * @param {*} type 
     * @param {*} orderid 
     * @param {*} desc 
     * @param {*} acc 
     */
    function delMissingReportRec (type, orderid, desc, acc) {
      var rec
      var fils = []
      type ? fils.push({ name: 'custrecord_missing_report_type', operator: 'is',values: type}) : ''
      orderid ? fils.push({ name: 'custrecord_missing_report_orderid', operator: 'is',values: orderid}) : ''
      acc ? fils.push({ name: 'custrecord_missing_report_store', operator: 'is',values: acc}) : ''
      desc ? fils.push({ name: 'custrecord_missing_report_description', operator: 'is',values: desc}) : ''
      search.create({
        type: 'customrecord_missing_report',
        filters: fils
      }).run().each(function (rec) {
        var de = record.delete({type: 'customrecord_missing_report',id: rec.id})
      })
    }

    function fullfillment (so_id, shipdate, ship_sku, qty, rei, loca, dept) {
      var so = record.load({ type: 'salesorder', id: so_id })
      var location = so.getValue('location'), skuid,fulfill_items = []
      if (!location)
        location = loca
      var acc = so.getValue('custbody_aio_account')
      var order_id = so.getValue('otherrefnum')
      var f = record.transform({
        fromType: record.Type.SALES_ORDER,
        toType: record.Type.ITEM_FULFILLMENT,
        fromId: Number(so_id)
      })
      // f.setValue({ fieldId: 'trandate', value:so.getValue('trandate')})
      f.setText({ fieldId: 'trandate', text: shipdate })
      f.setValue({ fieldId: 'shipstatus', value: 'C' })
      f.setValue({ fieldId: 'department', value: dept })
      f.setValue({ fieldId: 'custbody_aio_account', value: acc })
      f.setValue({ fieldId: 'custbody_shipment_report_rel', value: rei }); // 关联发货报告

      const lc = f.getLineCount({ sublistId: 'item' })
      var ful, unrec = [],fulfill_line,fulfill_qty
      for (var ln = 0; ln < lc; ln++) {
        var n = 0
        var onhand = f.getSublistValue({ sublistId: 'item', fieldId: 'onhand', line: ln }) // 可用
        var quantity = f.getSublistValue({ sublistId: 'item', fieldId: 'quantityremaining', line: ln })
        var itemid = f.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln })
        var itemtype = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln }); // 货品类型
        if (ful == 'full') { // 取消后续的发货 full  :这一天发货报告的发货数量已经发完
          if (ln == fulfill_line && itemtype == 'OthCharge') {
            continue
          }else {
            unrec.push(ln)
            continue
          }
        } else if (ful == 'full_blot') { // full_blot  :这一天发货报告的发货数量还没发完
          if (ln == fulfill_line && itemtype == 'OthCharge')
            continue
        } else if (itemtype == 'OthCharge') { // OthCharge  : 费用类型不发
          unrec.push(ln)
          continue
        }
        var c
        try {
          if ((ln + 1) < lc) c = f.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: ln + 1 }); // 货品类型
        } catch (e) {
          log.error('cc error', e)
        }
        skuid = interfun.getskuId(ship_sku.trim(), acc, order_id)
        if (JSON.stringify(skuid).indexOf(itemid) > -1 && onhand >= qty) {
          if (quantity < qty) {
            ful = 'full_blot', fulfill_line = ln + 1
            log.debug('此行货品的剩余数量少于发货报告', quantity + ' ：' + qty)
            fulfill_qty = quantity
            qty = qty - quantity
            log.debug('此行货品的剩余数量少于发货报告,下一行要发的数量: ', qty)
          }else {
            ful = 'full', fulfill_line = ln + 1
            fulfill_qty = qty
          }

          f.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: fulfill_qty, line: ln })
          f.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln })
          f.setSublistValue({ sublistId: 'item', fieldId: 'department', value: dept, line: ln })
          f.setSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: ship_sku, line: ln })
          fulfill_items.push({
            skuid: skuid,
            qty: fulfill_qty
          })
        } else if (JSON.stringify(skuid).indexOf(itemid) > -1 && onhand < qty) {
          var NewSku = getIteminfo(itemid)
          TakeNote(acc, order_id, location, NewSku, ship_sku, qty)
          return 'SKU库存不足: ' + ship_sku
        } else {
          unrec.push(ln)
        }
      }
      // 不用发货
      unrec.map(function (l) {
        f.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: l })
      })

      if (ful == 'full') {
        var ss = f.save({
          ignoreMandatoryFields: true
        })
        log.audit('发货成功', ss)

        // 自动开票
        if (ss)
          createInvioce(so_id, shipdate, so.getValue('custbody_aio_account'), rei, fulfill_items, ship_sku, dept)
      }else {
        log.debug('不满足发货条件 qty:' + qty, '发货报告ID:' + rei)
      }
      return 'OK'
    }

    /**
     * 拿到新SKU ，记入missingorder
     */
    function getIteminfo (itemid) {
      var itemN
      search.create({
        type: 'item',
        filters: [{ name: 'internalidnumber', operator: 'equalto', values: [itemid] }],
        columns: [
          { name: 'internalId' },
          { name: 'itemid' }
        ]
      }).run().each(function (rec) {
        itemN = rec.getValue('itemid')
      })
      return itemN
    }

    function createInvioce (soid, shipdate, acc, rei, fulfill_items, ship_sku, dept) {
      log.audit('fulfill_items:', fulfill_items) // 本次发货的货品和数量 [ { qty: , }]
      var remocl = []
      try {
        var inv = record.transform({
          fromType: record.Type.SALES_ORDER,
          toType: record.Type.INVOICE,
          fromId: Number(soid),
          isDynamic: true
        })
        inv.setValue({ fieldId: 'custbody_aio_account', value: acc })
        inv.setValue({ fieldId: 'approvalstatus', value: 2 })
        inv.setValue({ fieldId: 'department', value: dept })
        inv.setText({ fieldId: 'trandate', text: shipdate })
        inv.setValue({ fieldId: 'custbody_shipment_report_rel', value: rei })
        var len = inv.getLineCount({ sublistId: 'item'}),ck = true,seted = 0
        fulfill_items.map(function (fs) {
          ck = true

          for (var i = seted;i < len;i++) {
            //
            inv.selectLine({sublistId: 'item',line: i})
            var itds = inv.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'})
            var qty = inv.getCurrentSublistValue({sublistId: 'item',fieldId: 'quantity'})
            if (fs.skuid == itds && fs.qty <= qty && ck) {
              seted = i + 1
              ck = false
              inv.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity',value: fs.qty})
              inv.setCurrentSublistValue({ sublistId: 'item', fieldId: 'custcol_aio_amazon_msku', value: ship_sku })
              var index = remocl.indexOf(i)
              log.debug('要删除的index: ' + index, i)
              remocl.splice(index, 1)
              inv.commitLine({sublistId: 'item'})
            }else {
              if (remocl.indexOf(i) == -1) {
                remocl.push(i)
              }
            }
          }
          log.debug('seted: ' + seted, remocl)
        })

        log.debug('发票要删除的行：', remocl)
        remocl.sort()
        var num = 0
        remocl.map(function (ds) {
          ds = ds - num
          inv.removeLine({sublistId: 'item',line: ds})
          num++
        })

        var first_save = inv.save()
        log.debug('保存成功“', first_save)
        record.submitFields({
          type: 'customrecord_amazon_sales_report',
          id: rei,
          values: {
            custrecord_fulfill_in_ns: 'T'
          }
        })
        return first_save
      } catch (e) {
        log.error('error', e)
      }
    }

    /**
     * 调用亚马逊的接口拉取订单并创建cache表
     * @param {*} acc
     * @param {*} orderid
     */
    function getOrderAndCreateCache (acc, accountid, orderid) {
      var orders = []
      var ss = ''
      log.debug('acc', acc)
      var auth = core.amazon.getAuthByAccountId(accountid)

      var params_1 = {}
      params_1['AmazonOrderId.Id.1'] = orderid

      var content = core.amazon.mwsRequestMaker(
        auth,
        'GetOrder',
        '2013-09-01',
        params_1,
        '/Orders/2013-09-01'
      )
      log.debug('GetOrder-->content', content)
      // 获取订单并解析成对象
      if (auth) {
        var res = xml.Parser.fromString({
          text: content
        })
        res
          .getElementsByTagName({
            tagName: 'Order'
          })
          .map(function (node) {
            orders.push({
              AccID: acc,
              latest_delivery_date: node.getElementsByTagName({
                tagName: 'LatestDeliveryDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'LatestDeliveryDate'
                })[0].textContent
                : '',
              latest_ship_date: node.getElementsByTagName({
                tagName: 'LatestShipDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'LatestShipDate'
                })[0].textContent
                : '',
              order_type: node.getElementsByTagName({
                tagName: 'OrderType'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'OrderType'
                })[0].textContent
                : '',
              purchase_date: node.getElementsByTagName({
                tagName: 'PurchaseDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'PurchaseDate'
                })[0].textContent
                : '',
              is_replacement_order: node.getElementsByTagName({
                tagName: 'IsReplacementOrder'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'IsReplacementOrder'
                })[0].textContent == 'true'
                : false,
              last_update_date: node.getElementsByTagName({
                tagName: 'LastUpdateDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'LastUpdateDate'
                })[0].textContent
                : '',
              buyer_email: node.getElementsByTagName({
                tagName: 'BuyerEmail'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'BuyerEmail'
                })[0].textContent
                : '',
              amazon_order_id: node.getElementsByTagName({
                tagName: 'AmazonOrderId'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'AmazonOrderId'
                })[0].textContent
                : '',
              number_of_items_shipped: node.getElementsByTagName({
                tagName: 'NumberOfItemsShipped'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'NumberOfItemsShipped'
                })[0].textContent
                : '',
              ship_service_level: node.getElementsByTagName({
                tagName: 'ShipServiceLevel'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'ShipServiceLevel'
                })[0].textContent
                : '',
              order_status: node.getElementsByTagName({
                tagName: 'OrderStatus'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'OrderStatus'
                })[0].textContent
                : '',
              sales_channel: node.getElementsByTagName({
                tagName: 'SalesChannel'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'SalesChannel'
                })[0].textContent
                : '',
              is_business_order: node.getElementsByTagName({
                tagName: 'IsBusinessOrder'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'IsBusinessOrder'
                })[0].textContent == 'true'
                : false,
              number_of_items_unshipped: node.getElementsByTagName({
                tagName: 'NumberOfItemsUnshipped'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'NumberOfItemsUnshipped'
                })[0].textContent
                : '',
              buyer_name: node.getElementsByTagName({
                tagName: 'BuyerName'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'BuyerName'
                })[0].textContent
                : '',
              is_premium_order: node.getElementsByTagName({
                tagName: 'IsPremiumOrder'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'IsPremiumOrder'
                })[0].textContent == 'true'
                : false,
              earliest_delivery_date: node.getElementsByTagName({
                tagName: 'EarliestDeliveryDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'EarliestDeliveryDate'
                })[0].textContent
                : '',
              earliest_ship_date: node.getElementsByTagName({
                tagName: 'EarliestShipDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'EarliestShipDate'
                })[0].textContent
                : '',
              marketplace_id: node.getElementsByTagName({
                tagName: 'MarketplaceId'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'MarketplaceId'
                })[0].textContent
                : '',
              fulfillment_channel: node.getElementsByTagName({
                tagName: 'FulfillmentChannel'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'FulfillmentChannel'
                })[0].textContent
                : '',
              payment_method: node.getElementsByTagName({
                tagName: 'PaymentMethod'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'PaymentMethod'
                })[0].textContent
                : '',
              is_prime: node.getElementsByTagName({
                tagName: 'IsPrime'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'IsPrime'
                })[0].textContent == 'true'
                : false,
              shipment_service_level_category: node.getElementsByTagName({
                tagName: 'ShipmentServiceLevelCategory'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'ShipmentServiceLevelCategory'
                })[0].textContent
                : '',
              seller_order_id: node.getElementsByTagName({
                tagName: 'SellerOrderId'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'SellerOrderId'
                })[0].textContent
                : '',
              shipped_byamazont_fm: node.getElementsByTagName({
                tagName: 'ShippedByAmazonTFM'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'ShippedByAmazonTFM'
                })[0].textContent == 'true'
                : false,
              tfm_shipment_status: node.getElementsByTagName({
                tagName: 'TFMShipmentStatus'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'TFMShipmentStatus'
                })[0].textContent
                : '',
              promise_response_due_date: node.getElementsByTagName({
                tagName: 'PromiseResponseDueDate'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'PromiseResponseDueDate'
                })[0].textContent
                : '',
              is_estimated_ship_date_set: node.getElementsByTagName({
                tagName: 'IsEstimatedShipDateSet'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'IsEstimatedShipDateSet'
                })[0].textContent == 'true'
                : false,
              // 娉ㄦ剰锛岃繖閲岀洿鎺ュ彇鐨勪笅涓�灞傦紝鎵�浠ュ彧浼氬彇涓�涓�
              payment_method_detail: node.getElementsByTagName({
                tagName: 'PaymentMethodDetail'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'PaymentMethodDetail'
                })[0].textContent
                : '',
              payment_execution_detail: node.getElementsByTagName({
                tagName: 'PaymentExecutionDetail'
              }).length
                ? node.getElementsByTagName({
                  tagName: 'PaymentExecutionDetail'
                })[0].textContent
                : '',
              order_total: node.getElementsByTagName({
                tagName: 'OrderTotal'
              }).length
                ? {
                  currency_code: node
                    .getElementsByTagName({
                      tagName: 'OrderTotal'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'CurrencyCode'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'OrderTotal'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'CurrencyCode'
                      })[0].textContent
                    : '',
                  amount: node
                    .getElementsByTagName({
                      tagName: 'OrderTotal'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'Amount'
                    }).length
                    ? Number(
                      node
                        .getElementsByTagName({
                          tagName: 'OrderTotal'
                        })[0]
                        .getElementsByTagName({
                          tagName: 'Amount'
                        })[0].textContent
                    )
                    : 0
                }
                : {
                  currency_code: '_UNKNOW_',
                  amount: 0
                },
              shipping_address: node.getElementsByTagName({
                tagName: 'ShippingAddress'
              }).length
                ? {
                  city: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'City'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'City'
                      })[0].textContent
                    : '',
                  postal_code: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'PostalCode'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'PostalCode'
                      })[0].textContent
                    : '',
                  state_or_oegion: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'StateOrRegion'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'StateOrRegion'
                      })[0].textContent
                    : '',
                  country_code: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'CountryCode'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'CountryCode'
                      })[0].textContent
                    : '',
                  name: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'Name'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'Name'
                      })[0].textContent
                    : '',
                  address_line1: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'AddressLine1'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'AddressLine1'
                      })[0].textContent
                    : '',
                  address_line2: node
                    .getElementsByTagName({
                      tagName: 'ShippingAddress'
                    })[0]
                    .getElementsByTagName({
                      tagName: 'AddressLine2'
                    }).length
                    ? node
                      .getElementsByTagName({
                        tagName: 'ShippingAddress'
                      })[0]
                      .getElementsByTagName({
                        tagName: 'AddressLine2'
                      })[0].textContent
                    : ''
                }
                : null
            })
          })
      } else {
        throw (
        '\u627E\u4E0D\u5230\u6307\u5B9A\u7684\u4E9A\u9A6C\u900A\u8D26\u53F7[' +
        acc_id +
        '].'
        )
      }
      log.debug('orders=', JSON.stringify(orders))

      // 创建cache,实际上只会有一条数据
      for (var i = 0; i < orders.length; i++) {
        var order = orders[i]
        try {
          var r
          search
            .create({
              type: 'customrecord_aio_order_import_cache',
              filters: [
                {
                  name: 'custrecord_aio_cache_acc_id',
                  operator: search.Operator.ANYOF,
                  values: order.AccID
                },
                {
                  name: 'custrecord_aio_cache_order_id',
                  operator: search.Operator.IS,
                  values: order.amazon_order_id
                }
              ]
            })
            .run()
            .each(function (rec) {
              r = record.load({
                type: 'customrecord_aio_order_import_cache',
                id: rec.id
              })
              return false
            })
          if (!r) {
            r = record.create({
              type: 'customrecord_aio_order_import_cache'
            })
          }
          var order_trandate = format.format({
            value: moment.utc(order.purchase_date).toDate(),
            type: format.Type.DATETIMETZ,
            timezone: fields.timezone[timezone] // depositDate
          }).split(' ')[0]
          var last_update_date = format.format({
            value: moment.utc(order.last_update_date).toDate(),
            type: format.Type.DATETIMETZ,
            timezone: fields.timezone[timezone] // depositDate
          }).split(' ')[0]
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
          r.setValue({
            fieldId: 'custrecord_dps_cache_fulfillment_channel',
            value: order.fulfillment_channel
          })
          r.setValue({fieldId: 'custrecord_shipment_date_cache',value: order.latest_ship_date})
          r.setValue({fieldId: 'custrecord_purchase_date_1',value: order.purchase_date})
          r.setValue({fieldId: 'custrecord_last_update_date',value: order.last_update_date})
          r.setText({fieldId: 'custrecordlatest_ship_date',text: interfun.getFormatedDate('', '', order.last_update_date).date})
          r.setValue({fieldId: 'custrecord_seller_order_id_1',value: order.seller_order_id  })
          r.setValue({fieldId: 'custrecord_dps_cache_shipped_byamazont_f',value: order.shipped_byamazont_fm})
          ss = r.save()
          log.debug('cache save success：', ss)
        } catch (e) {
          log.error('import cache error', e)
        }
      }
      return ss
    }

    function reduce (context) {
    }

    function summarize (summary) {
      log.debug('处理完成')
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
