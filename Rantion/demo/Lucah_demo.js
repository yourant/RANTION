/*
 * @version: 1.0
 * @Author: LUCAH
 * @Date: 2020-05-07 10:11:07
 * @LastEditTime: 2020-05-07 10:23:28
 * @FilePath: \Rantion_sandbox\Rantion\demo
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
  'N/format',
  'N/runtime',
  'N/search',
  'N/record',
  '../../douples_amazon/Helper/interfunction.min',
  'N/xml',
  '../../douples_amazon/Helper/core.min',
  '../../douples_amazon/Helper/CryptoJS.min',
  'N/encode',
  'N/https',
  '../../douples_amazon/Helper/Moment.min',
  'N/render',
  '../../douples_amazon/Helper/handlebars-v4.1.1',
  'N/file',
  'N/ui/serverWidget',
  'N/transaction',
  '../../douples_amazon/Helper/fields.min'
], function (
  format,
  runtime,
  search,
  record,
  interfun,
  xml,
  core,
  cryptoJS,
  encode,
  https,
  moment,
  render,
  Handlebars,
  file,
  ui,
  transaction,
  fields
) {
  // 已知格林威治时间，换算本地正确时间
  // 本地时间 = 格林威治时间 - 时差
  // 已知本地时间，换算对应格林威治时间：
  // 格林威治时间 = 本地时间 + 时差

  //  大货发运记录字段 - 地点需要带出的收件人信息字段   config
  const receiptInfo_corr = {
    custrecord_dps_contact_phone: 'custrecord_aio_contact_information', // 收件人联系方式
    custrecord_dps_street1_dh: 'custrecord_aio_sender_address', // 收件人地址
    custrecord_dps_recipient_city_dh: 'custrecord_aio_sender_city', // 城市
    custrecord_dps_recipient_country_dh: 'custrecord_aio_country_sender', // 国家
    custrecord_dps_recipien_code_dh: 'custrecord_aio_sender_address_code', // 邮编
    custrecord_dps_ship_small_recipient_dh: 'custrecord_aio_sender_name', // 收件人名称
    custrecord_dps_state_dh: 'custrecord_aio_sender_state', // 州
  }
  function onRequest (context) {
    var response = context.response
    var request = context.request
    var St = new Date().getTime()
    var params = request.parameters; // 参数
    var ord = [
      '114-2671488-0645858',
      '112-4429781-7127405',
      '112-8055958-7845038',
      '114-5572222-8037056',
      '111-8492072-7280205',
      '113-3632654-4545009',
      '114-9848994-8482650',
      '111-5890446-6207452',
      '112-5511110-6291416',
      '114-5240067-5150646',
      '111-6028290-6508262',
      '111-7424251-1847406',
      '113-3930890-1185023',
      '111-1196929-0185833',
      '114-2403857-1421006',
      '111-7146978-2781836',
      '113-4621817-1855428',
      '111-0033060-8803400',
      '111-4121108-5703451',
      '113-6001933-4063440',
      '113-9270137-5137062',
      '112-0323369-6369873',
      '114-3446876-9465800',
      '112-1597769-6471407',
      '113-4846412-8567441',
      '111-9220486-8214668',
      '112-6340020-2026664',
      '112-0060092-0577877',
      '113-7832182-1034635',
      '113-7246684-2760268',
      '114-9059241-4957803',
      '114-0182406-9053070',
      '114-5183494-1177813',
      '114-3576047-5263467',
      '111-7202067-5477844',
      '113-3543048-6008219',
      '112-4132932-4923411',
      '114-6891511-3723443',
      '112-9221701-7677058',
      '114-6480921-1301034',
      '114-0189258-9179446',
      '113-9117019-4758617',
      '113-5748715-4719464',
      '113-5893892-7259444',
      '112-9129571-5303422',
      '112-3103824-1016261',
      '114-2745351-0113058',
      '111-1345082-7413007',
      '113-4826388-5726660',
      '113-2843738-8332258',
      '114-7202168-5744225',
      '114-2152643-0625822',
      '114-0599631-9147444',
      '113-8931723-6509010',
      '114-1064079-4637832',
      '114-1064079-4637832',
      '111-5800322-6053813',
      '111-7220531-7938647',
      '114-1528174-3078602',
      '702-0484500-1444203',
      '702-5649420-2097023',
      '701-4187995-8076255',
      '702-3552029-5841064',
      '205-7189997-1658743',
      '026-4703902-9002743',
      '203-9044273-2861941',
      '202-8495427-9733953',
      '206-1515403-5392324',
      '206-6153816-5797902',
      '202-8495899-4004362',
      '203-1918622-8793138',
      '203-5025430-3610765',
      '203-1304686-2217143',
      '202-3972476-5932346',
      '205-7459001-6875535',
      '114-2671488-0645858',
      '112-4429781-7127405',
      '112-8055958-7845038',
      '114-5572222-8037056',
      '111-8492072-7280205',
      '113-3632654-4545009',
      '114-9848994-8482650',
      '111-5890446-6207452',
      '112-5511110-6291416',
      '114-5240067-5150646',
      '111-6028290-6508262',
      '111-7424251-1847406',
      '113-3930890-1185023',
      '111-1196929-0185833',
      '114-2403857-1421006',
      '111-7146978-2781836',
      '113-4621817-1855428',
      '111-0033060-8803400',
      '111-4121108-5703451',
      '113-6001933-4063440',
      '113-9270137-5137062',
      '112-0323369-6369873',
      '114-3446876-9465800',
      '112-1597769-6471407',
      '113-4846412-8567441',
      '111-9220486-8214668',
      '112-6340020-2026664',
      '112-0060092-0577877',
      '113-7832182-1034635',
      '113-7246684-2760268',
      '114-9059241-4957803',
      '114-0182406-9053070',
      '114-5183494-1177813',
      '114-3576047-5263467',
      '111-7202067-5477844',
      '113-3543048-6008219',
      '112-4132932-4923411',
      '114-6891511-3723443',
      '112-9221701-7677058',
      '114-6480921-1301034',
      '114-0189258-9179446',
      '113-9117019-4758617',
      '113-5748715-4719464',
      '113-5893892-7259444',
      '112-9129571-5303422',
      '112-3103824-1016261',
      '114-2745351-0113058',
      '111-1345082-7413007',
      '113-4826388-5726660',
      '113-2843738-8332258',
      '114-7202168-5744225',
      '114-2152643-0625822',
      '114-0599631-9147444',
      '113-8931723-6509010',
      '114-1064079-4637832',
      '114-1064079-4637832',
      '111-5800322-6053813',
      '111-7220531-7938647',
      '114-1528174-3078602',
      '702-0484500-1444203',
      '702-5649420-2097023',
      '701-4187995-8076255',
      '702-3552029-5841064',
      '205-7189997-1658743',
      '026-4703902-9002743',
      '203-9044273-2861941',
      '202-8495427-9733953',
      '206-1515403-5392324',
      '206-6153816-5797902',
      '202-8495899-4004362',
      '203-1918622-8793138',
      '203-5025430-3610765',
      '203-1304686-2217143',
      '202-3972476-5932346',
      '205-7459001-6875535'
    ]
    var fils = [
        ['custrecord_aio_cache_status', 'is', 'Pending'],
        'and'
      ],fls = [],num = 0,rs = []
    ord.map(function (ds) {
      fls.push(
        ['custrecord_aio_cache_order_id', 'is', ds]
      )
      num++
      if (num < ord.length) {
        fls.push('or')
      }
    })
    fils.push(fls)
    // log.audit('fsda', fils)
    // search.create({
    //   type: 'customrecord_aio_order_import_cache',
    //   filters: fils,
    //   columns: [{
    //     name: 'custrecord_aio_cache_acc_id'
    //   }, {name: 'custrecord_aio_cache_order_id'}
    //   ]
    // }).run().each(function (rec) {
    //   rs.push({
    //     'id': rec.id,
    //     'acc': rec.getValue(rec.columns[0]),
    //     'oid': rec.getValue(rec.columns[1])
    //   })
    //   return true
    // })
    // log.audit('rsrs', rs)
    // rs.map(function (eds) {
    //   try {
    //     var ss = getOrderAndCreateCache(eds.acc, eds.acc, eds.oid)
    //     if (!ss) record.submitFields({
    //         type: 'customrecord_aio_order_import_cache',
    //         id: eds.id,
    //         values: {
    //           custrecord_aio_cache_status: 'Canceled'
    //         }
    //       })
    //   } catch(e) {
    //     log.audit('报错了', eds)
    //     record.submitFields({
    //       type: 'customrecord_aio_order_import_cache',
    //       id: eds.id,
    //       values: {
    //         custrecord_aio_cache_status: 'Canceled'
    //       }
    //     })
    //   }
    // })

    search.create({
      type: 'customrecord_aio_amazon_settlement',
      filters: [
        {name: 'custrecord_aio_sett_id',operator: 'is',values: '13046188431'},
        {name: 'custrecord_aio_sett_marketplace_name',operator: 'contains',values: 'Amazon.'}
      ],columns: [
        {name: 'custrecord_aio_sett_marketplace_name'}
      ]
    }).run().each(function (e) {
      var markt = e.getValue('custrecord_aio_sett_marketplace_name')
      log.audit('martke', markt)
    })
    // var itn_date = interfun.SearchSO("026-0299845-0004328","A039-026-0299845-0004328-GF",[78,79,80,81,82])
    // var limt = 15,ods = []
    // var rec = record.create({type: 'customrecord_amazon_monthinventory_h',isDynamic: true})
    // log.debug('sublists', rec.getSublists())
    // search.load({ id: 'customsearch448'}).run().each(function (e) {
    //   ods.push({'rsid': e.id,'rt_id': e.getValue(e.columns[8]),'acc': e.getValue(e.columns[9])})
    //   return --limt > 0
    // })
    // log.audit('ods  ' + ods, ods)
    // ods.map(function (po) {
    //   var rs = record.load({type: 'itemreceipt',id: po.rsid,isDynamic: true})
    //   var loc
    //   search.create({
    //     type: 'customrecord_aio_account',
    //     filters: [
    //       { name: 'internalidnumber', operator: 'equalto', values: po.acc }
    //     ], columns: [
    //       'custrecord_aio_fbaorder_location'
    //     ]
    //   }).run().each(function (rec) {
    //     loc = rec.getValue(rec.columns[0])
    //     log.audit('loc  ' + loc, rec)
    //   })
    //   var len = rs.getLineCount({sublistId: 'item'})
    //   for (var i = 0;i < len;i++) {
    //     rs.selectLine({sublistId: 'item',line: i})
    //     rs.setCurrentSublistValue({sublistId: 'item',fieldId: 'location',value: loc})
    //     rs.commitLine({sublistId: 'item'})
    //   }
    //   rs.save()
    //   record.submitFields({
    //     type: record.Type.RETURN_AUTHORIZATION,
    //     id: po.rt_id,
    //     values: {
    //       location: loc
    //     }
    //   })
    // })

    return
    response.writePage(form)
    // response.write(JSON.stringify(ss))

    log.debug('耗时：', new Date().getTime() - St)
  }

  function getAcc (acc) {
    var t = fiedls.account, tsite = fiedls.amazon_global_sites, tdev = fiedls.amazon_dev_accounts
    var accounts = {},fin = []

    return accounts
  }
  /**
   * 判断某一日属于这一年的第几周
   * @param {*} data 
   */
  function weekofday (data) {
    // log.debug('data',data)
    // var value = format.parse({value:data, type: format.Type.DATE})
    // log.debug('value',value)
    // var value = moment(value1).format('YYYY/MM/DD')
    // log.debug('value',value)
    // var dt = new Date(value)
    var dt = data
    log.debug('dt', dt)
    var y = dt.getFullYear()
    log.debug('y', y)
    var start = '1/1/' + y

    log.debug('start', start)

    start = new Date(start)

    log.debug('start_1', start)

    starts = start.valueOf()

    log.debug('starts', starts)

    startweek = start.getDay()

    log.debug('startweek', startweek)

    dtweek = dt.getDay()

    log.debug('dtweek', dtweek)

    var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1

    log.debug('days', days)

    days = Math.floor(days / 7)

    log.debug('days_1', days)

    return (days + 2)
  }
  function getSubmitList (feedId, auth) {
    log.error('检查参数typeof(feedId)', '---' + typeof feedId)
    var param = {}
    param['FeedSubmissionId'] = feedId
    var response; // auth, action, version, params, resource, body,newrec_id)
    response = mwsRequestMaker(
      auth,
      'GetFeedSubmissionResult',
      '2009-01-01',
      param,
      '/Feeds/2009-01-01/',
      ''
    )
    log.error('检查是否成功哦 response', '' + response)
    return response
  }
  function getAuthByAccountId (account_id) {
    var auth
    search
      .create({
        type: 'customrecord_aio_account',
        filters: [{ name: 'internalid', operator: 'is', values: account_id }],
        columns: [
          { name: 'custrecord_aio_seller_id' },
          { name: 'custrecord_aio_mws_auth_token' },
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
      })
      .run()
      .each(function (rec) {
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
  }
  function mwsRequestMaker (auth, action, version, params, resource, body) {
    try {
      if (resource === void 0) {
        resource = '/'
      }
      var timestamp = encodeURIComponent(new Date().toISOString())
      log.audit('action:', action)
      log.audit('paramssss:', action)
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
      var queryString = keys
        .map(function (key) {
          return key + '=' + query[key]
        })
        .join('&')
      var hash = cryptoJS.HmacSHA256(
        'POST\n' + auth.end_point + '\n' + resource + '\n' + queryString,
        auth.sec_key
      )
      var hashInBase64 = encodeURIComponent(
        encode.convert({
          string: hash,
          inputEncoding: encode.Encoding.HEX,
          outputEncoding: encode.Encoding.BASE_64
        })
      )
      var response = https.post({
        url: 'https://' +
          auth.end_point +
          resource +
          '?' +
          queryString +
          '&Signature=' +
          hashInBase64,
        body: body ? body : queryString + '&Signature=' + hashInBase64,
        headers: body ? { 'Content-Type': 'text/xml' } : {}
      })
      log.error(
        'url',
        'https://' +
        auth.end_point +
        resource +
        '?' +
        queryString +
        '&Signature=' +
        hashInBase64
      )
      log.error(
        'body',
        body ? body : queryString + '&Signature=' + hashInBase64
      )
      log.error('headers', body ? { 'Content-Type': 'text/xml' } : {})
      log.error('hashInBase64', hashInBase64)
      log.error('response', response)
      log.error('response.body', response.body)
      if (response.body.indexOf('</ErrorResponse>') != -1) {
        log.error(
          'response.indexOf</ErrorResponse>',
          response.body.indexOf('</ErrorResponse>')
        )
        return '2'
      }
    } catch (e) {
      log.error('error:', e)
    }
    return response.body
  }
  /**
   * 存储拉回来的财务费用数据
   * @param {*} l 
   * @param {*} acc 
   * @param {*} type_fin 
   */
  function createRec (l, acc, type_fin) {
    var ship_rec
    search.create({ // 去重
      type: 'customrecord_amazon_finances_cahce',
      filters: [{
        name: 'custrecord_amazon_finances_account',
        operator: 'anyof',
        values: acc
      },
        {
          name: 'custrecord_finance_type',
          operator: 'is',
          values: type_fin
        }, // 类型
        {
          name: 'custrecord_amazon_finances_orderid',
          operator: 'is',
          values: l.amazon_order_id
        },
        {
          name: 'custrecord_amazon_ginances_postdate_txt',
          operator: 'is',
          values: l.posted_date
        }
      ]
    }).run().each(function (e) {
      log.error('you', e.id)
      ship_rec = record.load({
        type: 'customrecord_amazon_finances_cahce',
        id: e.id
      })
    })
    if (!ship_rec)
      ship_rec = record.create({
        type: 'customrecord_amazon_finances_cahce'
      })

    var pos = interfun.getFormatedDate('', '', l.posted_date, '', true).date
    if (pos == '2') return
    ship_rec.setText({
      fieldId: 'custrecord_amazon_finances_postedafter',
      text: pos
    })
    ship_rec.setValue({
      fieldId: 'custrecord_amazon_ginances_postdate_txt',
      value: l.posted_date
    })
    log.audit('nulllll??????', acc)
    ship_rec.setValue({
      fieldId: 'custrecord_amazon_finances_account',
      value: acc
    })
    ship_rec.setValue({
      fieldId: 'custrecord_amazon_finances_orderid',
      value: l.amazon_order_id
    })
    ship_rec.setValue({
      fieldId: 'custrecord_amazon_finances_body',
      value: JSON.stringify(l)
    })

    ship_rec.setValue({
      fieldId: 'custrecord_finance_type',
      value: type_fin
    })
    var cache_id = ship_rec.save()
    log.audit('fin req  OK:', cache_id)
  }
  /**
   * 调用亚马逊的接口拉取订单并创建cache表
   * @param {*} acc
   * @param {*} orderid
   */
  function getOrderAndCreateCache (acc, accountid, orderid, response) {
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
    if (orders.length == 0) return false
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
        var order_trandate = interfun.getFormatedDate(
          '',
          '',
          order.purchase_date
        ).date
        var last_update_date = interfun.getFormatedDate(
          '',
          '',
          order.last_update_date
        ).date
        if (last_update_date == '2') {
          return
        }
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
  return {
    onRequest: onRequest
  }
})
