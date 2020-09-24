/**
 *@NApiVersion 2.x
*@NScriptType MapReduceScript
*/
define(['N/search', 'N/log', 'N/record', '../../douples_amazon/Helper/interfunction.min.js'],
  function (search, log, record, interfun) {
    function getInputData () {
      var ord = [],limit = 4000
      ord = [
        '026-0770379-3145932',
        '026-1296048-4993932',
        '026-1953745-0217963',
        '026-3501818-3721166',
        '026-6558712-3484322',
        '026-6579274-0337918',
        '026-7492287-3788308',
        '026-8332164-2752338',
        '026-8570402-6664312',
        '202-2195634-5427565',
        '202-2416791-3446715',
        '202-2573559-7452366',
        '202-9570905-4807549',
        '203-0601561-9727522',
        '203-0977224-0571563',
        '203-0977224-0571563',
        '203-0977224-0571563',
        '203-2506927-8205938',
        '203-3540848-7015508',
        '203-4917034-6196323',
        '203-5330594-6001105',
        '203-7309444-6350735',
        '203-8517300-0372338',
        '204-0681602-8029901',
        '204-1144476-2314744',
        '204-4861223-8520350',
        '204-5784320-7787564',
        '204-6408196-6135501',
        '204-8202217-2550748',
        '204-8239387-6972305',
        '204-8294506-3477902',
        '204-8732028-1628356',
        '204-9267197-8639500',
        '205-0287987-8570775',
        '205-0309422-5041110',
        '205-1741318-9295556',
        '205-2625738-5327516',
        '205-3093136-7595522',
        '205-3093136-7595522',
        '205-3783147-5721123',
        '205-4324274-8714752',
        '205-5538741-4678766',
        '205-5538741-4678766',
        '205-5613643-0977129',
        '205-6702619-2701917',
        '205-9369250-1349947',
        '206-1251939-5746745',
        '206-1377078-5517929',
        '206-1555253-1456347',
        '206-1609777-7672317',
        '206-2185264-1941166',
        '206-2346288-9386711',
        '206-2527707-2091530',
        '206-2527707-2091530',
        '206-2741987-8618703',
        '206-2945171-8095527',
        '206-3254097-5581961',
        '206-3401216-3964331',
        '206-3518949-4895562',
        '206-4341857-7321119',
        '206-7354462-1190765',
        '206-9493410-6942727'
      ]
      ord = [
        '026-2033080-2573955',
        '203-2980962-3512308',
        '204-7969378-4762718',
        '026-7203796-7093960',
        '026-7203796-7093960',
        '204-4777731-0299530',
        '205-6686793-5112309',
        '203-3009055-5241157',
        '204-8518780-9097932',
        '204-8518780-9097932',
        '206-8597483-3419519',
        '205-2912423-0593117',
        '026-5198197-7975512',
        '203-8097050-9571546',
        '205-9843613-8832307',
        '202-5664083-7121957',
        '206-1293842-5564354',
        '026-7742878-7868334',
        '202-2306496-6508329',
        '206-1814796-3599501',
        '206-0900596-3870751',
        '026-9273952-2229923',
        '202-7246422-9657151',
        '205-2703631-0037938',
        '203-8533348-9618756',
        '206-5287264-2881104',
        '206-5287264-2881104',
        '206-2870794-5457931',
        '205-2414206-0538708',
        '203-4689747-9948356',
        '203-3865664-8456300',
        '202-2933674-4273158',
        '204-0475157-8457137',
        '205-2256136-6477927',
        '203-2621406-4155549',
        '205-0061114-9853150',
        '206-9128346-5318717',
        '202-1839786-0278749',
        '203-8244673-5250716',
        '202-5311485-7821911',
        '206-9296536-1801125',
        '026-4472599-5073959',
        '205-2525310-1292351',
        '202-7976524-7368334',
        '204-4043142-5869966',
        '203-4578042-5448369',
        '203-4578042-5448369',
        '202-5033663-5773164',
        '205-4358269-4496346',
        '205-4358269-4496346',
        '205-4358269-4496346',
        '205-4358269-4496346',
        '206-5182282-8605120',
        '202-4743458-3385963',
        '205-2182770-4740367',
        '204-3520974-3592341',
        '206-4150442-3779538',
        '205-5249779-6829159',
        '204-3184013-9115534',
        '204-8432058-9404346',
        '206-4156834-9659543',
        '203-7144810-2881129',
        '204-0234429-1591537',
        '204-7148865-4321946',
        '206-8376495-5631526',
        '202-7361784-2421913',
        '206-8113082-0207542',
        '202-2974043-5628359',
        '204-0871673-4145114',
        '205-1551300-7639520',
        '205-8887360-4337922',
        '203-0688296-6501906',
        '026-6836966-0984315',
        '202-7101822-9565911',
        '204-1035012-7175540',
        '203-4324765-7706713',
        '206-2247553-7750735',
        '026-2560600-2453113',
        '205-4540457-4961960',
        '203-8857933-7129965',
        '205-1127924-4376304',
        '203-1414941-0794701',
        '204-6908193-0887526',
        '206-1858673-2769127',
        '206-1644495-7823537',
        '026-5369889-0374768',
        '202-5342047-7824364',
        '202-2287196-9975529',
        '202-3952251-7468318',
        '203-1468750-1679544',
        '202-6503128-0576335',
        '205-2019683-4773124',
        '205-5235330-3818716',
        '202-4784433-5823501',
        '205-4308924-3082737',
        '204-0901293-0999555',
        '202-1362694-2732325',
        '203-0086807-3159542',
        '202-0615420-4917938',
        '202-8992586-4591522',
        '202-7081945-9177915',
        '202-7081945-9177915',
        '206-8584177-6525961',
        '202-2728281-4437951',
        '206-2316291-6927521',
        '206-2316291-6927521',
        '026-4911779-0862730',
        '204-3011560-6445122',
        '206-8066218-7505158',
        '202-0221999-4353961',
        '202-3144926-7670739',
        '204-8338564-7405937',
        '205-5681680-8721141',
        '205-3570360-1641938',
        '026-2146723-9049102',
        '205-3385174-2674713',
        '202-8545130-4488348',
        '202-8545130-4488348',
        '205-0142033-2463555',
        '205-0142033-2463555',
        '205-0142033-2463555',
        '205-0142033-2463555',
        '205-0142033-2463555',
        '204-1575818-4209953',
        '026-8004247-2773914',
        '026-0330024-9431532',
        '204-0939146-8950736',
        '204-3127461-4317153',
        '202-6225860-5030734',
        '205-3694205-9343506',
        '203-7319495-9025906',
        '204-2218605-7065928',
        '205-3380905-4258760',
        '203-6227494-4153934',
        '205-6486969-4453954'
      ]
      // var fils = [
      //   ['custbody_fin_rel_inv_ck', 'is', 'F'],
      //   'and',
      //   ['memomain', 'is', '预估']
      // ]
      // search.create({
      //   type: 'journalentry',
      //   filters: fils,
      //   columns: [
      //     {name: 'custbody_relative_finanace_report',summary: 'GROUP'},
      //     {name: 'internalid',summary: 'GROUP'},
      //     {name: 'internalid',join: 'CUSTBODY_REL_SALESORDER',summary: 'GROUP'}
      //   ]
      // }).run().each(function (e) {
      //   ord.push({fin: e.getValue(e.columns[0]), 'oid': e.getValue(e.columns[1]),'so_id': e.getValue(e.columns[2])})
      //   return --limit > 0
      // })
      // search.load({id: 'customsearch448'}).run().each(function (e) {
      //   ord.push({joid: e.getValue(e.columns[0]), dept: e.getValue(e.columns[1])})
      //   return --limit > 0
      // })
      // log.debug('ord', ord)
      return ord
    }

    function map (context) {
      var filters = []

      try {
        getOrderAndCreateCache(49, 49, orderid)
        return
        filters.push({
          name: 'custrecord_aio_cache_order_id',
          operator: 'is',
          values: context.value
        })
        search.create({
          type: 'customrecord_aio_order_import_cache',
          filters: filters
        }).run().each(function (rec) {
          var sfs = record.load({type: 'customrecord_aio_order_import_cache',id: rec.id})
          sfs.save()
          return true
        })
        return
        var ST = new Date().getTime()
        var obj = JSON.parse(context.value)
        var jo = record.load({type: 'journalentry',id: obj.joid,isDynamic: true})
        var len = jo.getLineCount({sublistId: 'line'})
        for (var i = 0;i < len;i++) {
          jo.selectLine({sublistId: 'line', line: i})
          jo.setCurrentSublistValue({sublistId: 'line',fieldId: 'department',value: obj.dept})
          jo.commitLine({sublistId: 'line'})
        }
        jo.save()
        log.audit('耗时', (new Date().getTime() - ST))
      } catch(e) {
        log.audit('error', e)
      }
    }

    function reduce (context) {
    }

    function summarize (summary) {
      log.debug('处理完成', summary)
    }

    function DElFullfill (soid) {
      var order_id,sellr
      search.create({
        type: 'salesorder',
        filters: [
          // { name: 'custbody_order_locaiton', operator: 'anyof', values: acc_search},
          { name: 'internalid', operator: 'is', values: soid }
        ],columns: [{name: 'custrecord_aio_seller_id',join: 'custbody_order_locaiton'} , {name: 'otherrefnum'}]
      }).run().each(function (rec) {
        sellr = rec.getValue(rec.columns[0])
        order_id = rec.getValue(rec.columns[1])
        return true
      })

      var fulfill_id = [],inv_id = []
      search.create({
        type: 'invoice',
        filters: [
          { name: 'createdfrom', operator: 'anyof', values: soid},
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
          { name: 'createdfrom', operator: 'anyof', values: soid},
          { name: 'mainline', operator: 'is', values: true }
        ]
      }).run().each(function (rec) {
        fulfill_id.push(rec.id)
        return true
      })

      inv_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'invoice',id: dls})
      })
      fulfill_id.map(function (dls) {
        // 如果是已发货，但是没开票，考虑到要保持一个发货一份发票，所以要把这个发货单删除，重新发货开票
        var de = record.delete({type: 'itemfulfillment',id: dls})
      })
      log.audit('fulfill_id:', fulfill_id)
      log.audit('inv_id:', inv_id)
      log.audit('sellr:' + sellr, order_id)
      var acc_search = interfun.getSearchAccount(sellr)
      var pds = []
      search.create({
        type: 'customrecord_amazon_sales_report',
        filters: [
          {name: 'custrecord_amazon_order_id',operator: 'is',values: order_id},
          {name: 'custrecord_shipment_account',operator: 'anyof',values: acc_search}
        ]
      }).run().each(function (ds) {
        pds.push(ds.id)
        return true
      })
      pds.map(function (dls) {
        record.submitFields({
          type: 'customrecord_amazon_sales_report',
          id: dls,
          values: {
            custrecord_fulfill_in_ns: 'F'
          }
        })
      })
      log.audit('OK', pds)
    }
    function salereport (context) {
      var flf = record.load({type: 'customrecord_amazon_sales_report',id: context})
      var oid = flf.getValue('custrecord_amazon_order_id')
      var inv_id = [],fulfill_id = []
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
        log.error('重新发货设置成功', '发货报告：' + JSON.stringify(slf))
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
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
