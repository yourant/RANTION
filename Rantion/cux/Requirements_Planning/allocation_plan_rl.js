/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function (
  record,
  search,
  log,
  runtime
) {
  function _get (context) { }

  function _post (context) {
    // 获取蓝深科技2、蓝图3、蓝贸5下的仓库

    if (context.PlanType) {
      log.audit('记录例外信息' + typeof context.item_arr6, context)
      setDeferValue(context.item_arr6, context.item_arr5, context.today, context.PlanType)
      return
    }

    var location_arr = []
    search
      .create({
        type: 'location',
        filters: [
          { name: 'subsidiary', operator: 'anyof', values: [2] },
          {
            name: 'custrecord_dps_financia_warehous',
            operator: 'anyof',
            values: ['2'], // 2自营仓
          },
          { name: 'isinactive', operator: 'is', values: 'F' }
        ],
        columns: ['name', 'subsidiary']
      })
      .run()
      .each(function (rec) {
        var subsidiary_id, transfer_location
          subsidiary_id = 2
          transfer_location = 203
        location_arr.push({
          location_id: rec.id,
          transfer_location: transfer_location, // 虚拟仓
          name: rec.getValue('name'),
          subsidiary_id: subsidiary_id
        })
        return true
      })
      search
      .create({
        type: 'location',
        filters: [
          { name: 'subsidiary', operator: 'anyof', values: [3] },
          {
            name: 'custrecord_dps_financia_warehous',
            operator: 'anyof',
            values: ['2'], // 2自营仓
          },
          { name: 'isinactive', operator: 'is', values: 'F' }
        ],
        columns: ['name', 'subsidiary']
      })
      .run()
      .each(function (rec) {
        var subsidiary_id, transfer_location
          subsidiary_id = 3
          transfer_location = 206
        location_arr.push({
          location_id: rec.id,
          transfer_location: transfer_location, // 虚拟仓
          name: rec.getValue('name'),
          subsidiary_id: subsidiary_id
        })
        return true
      })
      search
      .create({
        type: 'location',
        filters: [
          { name: 'subsidiary', operator: 'anyof', values: [5] },
          {
            name: 'custrecord_dps_financia_warehous',
            operator: 'anyof',
            values: ['2'], // 2自营仓
          },
          { name: 'isinactive', operator: 'is', values: 'F' }
        ],
        columns: ['name', 'subsidiary']
      })
      .run()
      .each(function (rec) {
        var subsidiary_id, transfer_location
          subsidiary_id = 5
          transfer_location = 204
        location_arr.push({
          location_id: rec.id,
          transfer_location: transfer_location, // 虚拟仓
          name: rec.getValue('name'),
          subsidiary_id: subsidiary_id
        })
        return true
      })
    log.debug('location_arr：'+location_arr.length, location_arr)

    // 把相同子公司的仓库合并
    var po_no = [],
      need_location_arr = []
    for (var i = 0; i < location_arr.length; i++) {
      if (po_no.indexOf(location_arr[i].subsidiary_id) === -1) {
        need_location_arr.push({
          subsidiary: location_arr[i].subsidiary_id,
          transfer_location: location_arr[i].transfer_location,
          lineLocations: [location_arr[i].location_id]
        })
      } else {
        for (var j = 0; j < need_location_arr.length; j++) {
          if (need_location_arr[j].subsidiary == location_arr[i].subsidiary_id) {
            need_location_arr[j].lineLocations.push(
              location_arr[i].location_id
            )
            break
          }
        }
      }
      po_no.push(location_arr[i].subsidiary_id)
    }

    log.debug('need_location_arr ' +need_location_arr.length, need_location_arr)
    var items_arr = context.items,
      message = {},
      status = 'error',
      data = '创建失败',
      week = context.week
    if (items_arr.length > 0) {
      try {
        var result = createBill(items_arr, week, need_location_arr)
        log.debug('result', result)
        status = result.status
        data = result.data
      } catch (e) {
        message.data = e.message
        log.debug('error', e)
      }
    }
    message.status = status
    message.data = data
    return message
  }
  // 设置例外信息处理情况
  function setDeferValue (item_arr6, item_arr5, today, PlanDefer) {
    var bill_id
    item_arr6.map(function (itls) {
      search
        .create({
          type: 'customrecord_demand_forecast_child',
          filters: [
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_item_sku',
              operator: 'anyof',
              values: itls.item_id
            },
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_account',
              operator: 'anyof',
              values: itls.account_id
            },
            {
              name: 'custrecord_demand_forecast_l_date',
              operator: 'on',
              values: today
            },
            {
              name: 'custrecord_demand_forecast_l_data_type',
              operator: 'anyof',
              values: itls.data_type
            }
          ]
        })
        .run()
        .each(function (rec) {
          bill_id = rec.id
        })
      log.debug('bill_id', bill_id)
      var child_bill_data
      if (bill_id) {
        child_bill_data = record.load({
          type: 'customrecord_demand_forecast_child',
          id: bill_id
        })
        var field_name = 'custrecord_quantity_week' + itls.week_date
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        })
        child_bill_data.save()
      } else {
        var forecast_id
        search
          .create({
            type: 'customrecord_demand_forecast',
            filters: [
              {
                name: 'custrecord_demand_forecast_item_sku',
                operator: 'anyof',
                values: itls.item_id
              },
              {
                name: 'custrecord_demand_forecast_account',
                operator: 'anyof',
                values: itls.account_id
              }
            ]
          })
          .run()
          .each(function (rec) {
            forecast_id = rec.id
          })
        log.debug('forecast_id', forecast_id)
        child_bill_data = record.create({
          type: 'customrecord_demand_forecast_child'
        })
        child_bill_data.setText({
          fieldId: 'custrecord_demand_forecast_l_date',
          text: today
        })
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_l_data_type',
          value: itls.data_type
        })
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_parent',
          value: forecast_id
        })
        var field_name = 'custrecord_quantity_week' + itls.week_date
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        })
        child_bill_data.save()
      }

      for (var i = 0; i < item_arr5.length; i++) {
        // 属于同一行，并且同一周
        log.debug(
          'itls.line:' + itls.line,
          'item_arr5[i].line:' + item_arr5[i].line
        )
        log.debug(
          'itls.week_date:' + itls.week_date,
          'item_arr5[i].week_date:' + item_arr5[i].week_date
        )
        if (
          itls.line == item_arr5[i].line &&
          itls.week_date == item_arr5[i].week_date
        ) {
          // 差异情况，修改调拨计划量 - 调拨计划量
          var fs =
          Number(itls.item_quantity) - Number(item_arr5[i].item_quantity)
          log.debug(
            '差异数量:' + fs,
            Number(itls.item_quantity) +
            ' - ' +
            Number(item_arr5[i].item_quantity)
          )
          if (Number(fs) != 0) {
            log.debug('差异数量 !=0:' + fs)
            // 记录差异情况
            // 19 调拨计划建议处理情况
            try {
              PlanDefer.map(function (P) {
                SetDeferRec(
                  itls,
                  today,
                  'custrecord_quantity_week' + itls.week_date,
                  fs,
                  P
                )
              })
            } catch (error) {
              log.error('错误', error)
            }
          }
          break
        }
      }
    })
  }
  /**
   * 记录建议处理情况
   * @param {*} line
   * @param {*} today
   * @param {*} field_name
   * @param {*} defer
   */
  function SetDeferRec (line, today, field_name, defer, suggestionType) {
    var forecast_id
    search
      .create({
        type: 'customrecord_demand_forecast',
        filters: [
          {
            name: 'custrecord_demand_forecast_item_sku',
            operator: 'anyof',
            values: line.item_id
          },
          {
            name: 'custrecord_demand_forecast_account',
            operator: 'anyof',
            values: line.account_id
          }
        ]
      })
      .run()
      .each(function (rec) {
        forecast_id = rec.id
      })
    // 创建建议处理情况记录
    var defer_id
    search
      .create({
        type: 'customrecord_demand_forecast_child',
        filters: [
          {
            join: 'custrecord_demand_forecast_parent',
            name: 'custrecord_demand_forecast_item_sku',
            operator: 'anyof',
            values: line.item_id
          },
          {
            join: 'custrecord_demand_forecast_parent',
            name: 'custrecord_demand_forecast_account',
            operator: 'anyof',
            values: line.account_id
          },
          {
            name: 'custrecord_demand_forecast_l_date',
            operator: 'on',
            values: today
          },
          {
            name: 'custrecord_demand_forecast_l_data_type',
            operator: 'anyof',
            values: suggestionType
          }
        ]
      })
      .run()
      .each(function (rec) {
        defer_id = record.load({
          type: 'customrecord_demand_forecast_child',
          id: rec.id
        })
      })
    if (!defer_id)
      defer_id = record.create({ type: 'customrecord_demand_forecast_child' })
    defer_id.setText({
      fieldId: 'custrecord_demand_forecast_l_date',
      text: today
    })
    defer_id.setValue({
      fieldId: 'custrecord_demand_forecast_l_data_type',
      value: suggestionType
    })
    defer_id.setValue({
      fieldId: 'custrecord_demand_forecast_parent',
      value: forecast_id
    })
    defer_id.setValue({ fieldId: field_name, value: defer })
    var ss = defer_id.save()
    log.debug(
      '建议处理情记录成功 ' + ss,
      'suggestionType:' +
      suggestionType +
      ',defer：' +
      defer +
      ',field_name：' +
      field_name
    )
  }

  function createBill (items_arr, week, need_location_arr) {
    var item_arr = []
    for (var i = 0; i < items_arr.length; i++) {
      item_arr.push(items_arr[i]['item_id'])
    }
    log.debug('item_arr', item_arr)
    var new_item = [],
      result_data = {}
    // 查询所有产品在蓝深2、蓝图3、蓝贸5下的仓库所有库位的库存量
    var location_list_result = []
    need_location_arr.map(function (l) {
    
        var location_list =   l.lineLocations
     
        if (location_list.length > 0) {
          var filters = []
          filters.push({
            name: 'inventorylocation',
            operator: 'anyof',
            values: location_list
          })
          filters.push({
            name: 'internalid',
            operator: 'anyof',
            values: item_arr
          })
          search.create({
            type: 'item',
            filters: filters,
            columns: ['name', 'locationquantityonhand', 'inventorylocation']
          }).run().each(function (rec) {
              if(rec.getValue('locationquantityonhand')>0)
            location_list_result.push({
              item_id: rec.id,
              item_inventory: rec.getValue('locationquantityonhand'),
              subsidiary: l.subsidiary,
              location:  rec.getValue('inventorylocation'),
              detailed_location: rec.getValue('inventorylocation'),
              transfer_location: l.transfer_location
            })
            return true
          })
        }
    })
    
    // 将数组中相同地点的数量进行相加
    // var b = []; // 记录数组a中的id 相同的下标
    // for (var i = 0; i < location_list_result.length; i++) {
    //   for (var j = location_list_result.length - 1; j > i; j--) {
    //     if (
    //       location_list_result[i].item_id == location_list_result[j].item_id &&
    //       location_list_result[i].location == location_list_result[j].location
    //     ) {
    //       location_list_result[i].item_inventory = (
    //       location_list_result[i].item_inventory * 1 +
    //       location_list_result[j].item_inventory * 1
    //         ).toString()
    //       b.push(j)
    //     }
    //   }
    // }
    // log.debug('111111location_list_result '+location_list_result.length, location_list_result)

    // for (var k = 0; k < b.length; k++) {
    //   location_list_result.splice(b[k], 1); // 删除指定位置
    // }
    log.debug('2222222location_list_result '+location_list_result.length, location_list_result)
    var po_no = [],
      new_location_arr = []
      
    for (var i = 0; i < location_list_result.length; i++) {
      if (po_no.indexOf(location_list_result[i].item_id) === -1) {
        new_location_arr.push({
          item_id: location_list_result[i].item_id,
          inventory_item: [
            {
              subsidiary: location_list_result[i].subsidiary,
              transfer_location: location_list_result[i].transfer_location,
              location: location_list_result[i].location,
              detailed_location: location_list_result[i].detailed_location,
              item_inventory: location_list_result[i].item_inventory
            }
          ]
        })
      } else {
        for (var j = 0; j < new_location_arr.length; j++) {
          if (new_location_arr[j].item_id == location_list_result[i].item_id) {
            new_location_arr[j].inventory_item.push({
              subsidiary: location_list_result[i].subsidiary,
              transfer_location: location_list_result[i].transfer_location,
              location: location_list_result[i].location,
              detailed_location: location_list_result[i].detailed_location,
              item_inventory: location_list_result[i].item_inventory
            })
            break
          }
        }
      }
      po_no.push(location_list_result[i].item_id);
    }
    log.debug('new_location_arr', new_location_arr);

    items_arr.map(function (line) {
      search
        .create({
          type: 'item',
          filters: [
            { name: 'internalid', operator: 'is', values: line.item_id }
          ],
          columns: [
            'custitem_dps_group',
            'custitem_dps_declaration_cn',
          //  'custitem_dps_transport'
          ]
        })
        .run()
        .each(function (result) {
          
          var location, subsidiary, price_no,acc_site,transport;
          //查出目标仓,查找这个货品的目标仓
          search
            .create({
              type: 'customrecord_aio_account',
              filters: [
                { name: 'internalId', operator: 'is', values: line.account_id }
              ],
              columns: [
                { name: 'custrecord_aio_enabled_sites' },
                { name: 'custrecord_aio_fbaorder_location' },
                { name: 'custrecord_aio_subsidiary' }
              ]
            })
            .run()
            .each(function (rec) {
              location = rec.getValue('custrecord_aio_fbaorder_location');
              subsidiary = rec.getValue('custrecord_aio_subsidiary');
              acc_site = rec.getValue('custrecord_aio_enabled_sites');
            });
            //查找默认运输方式
          search
            .create({
              type: 'customrecord_sku_site_default_ship',
              filters: [
                { name: 'custrecord_amazon_site', operator: 'anyof', values:acc_site },
                { name: 'custrecord_sku_number', operator: 'anyof', values:line.item_id },
              ],
              columns: [
                { name: 'custrecord_default_ship_type' }
              ]
            })
            .run()
            .each(function (rec) {
              transport = rec.getValue('custrecord_default_ship_type')
            });
          
          search
            .create({
              type: 'item',
              filters: [
                { name: 'internalid', operator: 'is', values: line.item_id },
                { name: 'inventorylocation', operator: 'anyof', values: 1607 }
              ],
              columns: [{ name: 'locationaveragecost' }]
            })
            .run()
            .each(function (rec) {
              price_no = rec.getValue('locationaveragecost');
            });
            var dps_group = result.getValue('custitem_dps_group'); //物流分组
            var declaration_cn = result.getValue('custitem_dps_declaration_cn'); //申报名称中文
          new_item.push({
            item_id: line.item_id,
            account_id: line.account_id,
            item_quantity: line.item_quantity,
            dps_group: dps_group?dps_group: '',
            dps_transport: transport?transport:"", //现在取的是对应关系表里面的
            // dps_transport: result.getValue('custitem_dps_transport')
            //   ? result.getValue('custitem_dps_transport')
            //   : '',
            subsidiary: subsidiary ? subsidiary : '',
            location: location ? location : '',
            week_date: line.week_date,
            price_no: price_no ? price_no : '',
            declaration_cn:declaration_cn ? declaration_cn : '',
          });
          log.debug('new_item1', new_item);
        })
    })
    log.debug('new_item', new_item);

    week.map(function (li) {
      var item = []
      if (new_item.length > 0) {
        var po_no = []
        for (var i = 0; i < new_item.length; i++) {
          if (li == new_item[i]['week_date']) {
            //根据物流分组，运输方式，目标仓分组
            if (
              po_no.indexOf(
                new_item[i].dps_group +
                new_item[i].dps_transport +
                new_item[i].subsidiary +
                new_item[i].location
              ) === -1
            ) {
              item.push({
                location_log: new_item[i].dps_group +
                  new_item[i].dps_transport +
                  new_item[i].subsidiary +
                  new_item[i].location,
                subsidiary: new_item[i].subsidiary,
                location: new_item[i].location,
                declaration_cn: new_item[i].declaration_cn,
                lineItems: [
                  {
                    item_id: new_item[i].item_id,
                    account_id: new_item[i].account_id,
                    declaration_cn: new_item[i].declaration_cn,
                    item_quantity: new_item[i].item_quantity,
                    dps_group: new_item[i].dps_group,
                    dps_transport: new_item[i].dps_transport,
                    subsidiary: new_item[i].subsidiary,
                    location: new_item[i].location,
                    price_no: new_item[i].price_no ? new_item[i].price_no : ''
                  }
                ]
              })
            } else {
              for (var j = 0; j < item.length; j++) {
                if (
                  item[j].location_log ==
                  new_item[i].dps_group +
                  new_item[i].dps_transport +
                  new_item[i].subsidiary +
                  new_item[i].location
                ) {
                  item[j].lineItems.push(new_item[i])
                  break
                }
              }
            }
            po_no.push(
              new_item[i].dps_group +
              new_item[i].dps_transport +
              new_item[i].subsidiary +
              new_item[i].location
            )
          }
        }
      }
      log.debug('item', item)
      var ord_len = []
      if (item.length > 0) {
          //SL页面上的数据
        item.map(function (line) {
          var new_need_list_arr = [],
            need_item_arr = []
          if (new_location_arr.length > 0) {
            line.lineItems.map(function (l) {
  
              var old_quantity = l.item_quantity; // 调拨修改计划量
              
              new_location_arr.map(function (ll) {
                if (ll.item_id == l.item_id) {
                  if (need_item_arr.indexOf(l.item_id) == -1) {
                    need_item_arr.push(l.item_id)
                  }
                  var loc_len = ll.inventory_item.length,chek =false
                  for (var i = 0; i < loc_len; i++) {
                    if(chek) return //如果是上一个仓库的库存足够，就不往下生成
                    //                   ll.地点库存量
                    log.debug('0000000l.old_quantity '+old_quantity, ll.inventory_item[i].item_inventory)
                    if (old_quantity > ll.inventory_item[i].item_inventory && ll.inventory_item[i].item_inventory >0) {
                        log.debug('0000000l.此仓库库存不足 '+old_quantity, ll.inventory_item[i].item_inventory)
                      if (loc_len == (i+1)) {
                        log.debug('0000000l.最后一个仓库，全放在这 '+ ll.inventory_item[i].location,old_quantity)
                        // 最后一个仓库，还是库存不足，就把剩余的数量全部放到此仓库下面
                        new_need_list_arr.push({
                          subsidiary: ll.inventory_item[i].subsidiary,
                          location: ll.inventory_item[i].location,
                          // account_id: l.account_id,
                          target_subsidiary: l.subsidiary,
                          target_warehouse: l.location,
                          declaration_cn: l.declaration_cn,
                          transfer_location: ll.inventory_item[i].transfer_location,
                          lineItems: [
                            {
                              item_id: l.item_id,
                              declaration_cn: l.declaration_cn,
                              item_quantity: old_quantity,
                              price_no: 30
                            }
                          ]
                        })
                      }else {
                        old_quantity = Math.round(old_quantity) - Math.round(ll.inventory_item[i].item_inventory)
                        log.debug('0000000l.Old数量剪掉 '+old_quantity,Math.round(old_quantity)  +" - "+ Math.round(ll.inventory_item[i].item_inventory))
                        new_need_list_arr.push({
                          subsidiary: ll.inventory_item[i].subsidiary,
                          location: ll.inventory_item[i].location,
                          target_subsidiary: l.subsidiary,
                          target_warehouse: l.location,
                          declaration_cn: l.declaration_cn,
                          transfer_location: ll.inventory_item[i].transfer_location,
                          lineItems: [
                            {
                              item_id: l.item_id,
                              declaration_cn: l.declaration_cn,
                            //   item_quantity: ll.inventory_item[i].item_inventory
                            //     ? ll.inventory_item[i].item_inventory
                            //     : old_quantity,
                              item_quantity: ll.inventory_item[i].item_inventory,
                              price_no: 30
                            }
                          ]
                        })
                      }
                    // old_quantity -= ll.inventory_item[i].item_inventory
                    //     ? ll.inventory_item[i].item_inventory
                    //     : old_quantity
                    // if (
                    //     i == ll.inventory_item.length - 1 &&
                    //     old_quantity != 0
                    // ) {
                    //     new_need_list_arr.push({
                    //         subsidiary: 5,
                    //         location: 542,
                    //         target_subsidiary: l.subsidiary,
                    //         target_warehouse: l.location,
                    //         transfer_location: 204,
                    //         lineItems: [
                    //             {
                    //                 item_id: l.item_id,
                    //                 item_quantity: old_quantity,
                    //                 price_no: 30,
                    //             },
                    //         ],
                    //     })
                    // }
                    } else {
                      new_need_list_arr.push({
                        subsidiary: ll.inventory_item[i].subsidiary,
                        location: ll.inventory_item[i].location,
                        target_subsidiary: l.subsidiary,
                        target_warehouse: l.location,
                        declaration_cn: l.declaration_cn,
                        transfer_location: ll.inventory_item[i].transfer_location,
                        lineItems: [
                          {
                            item_id: l.item_id,
                            declaration_cn: l.declaration_cn,
                            item_quantity: old_quantity,
                            price_no: 30
                          }
                        ]
                      })
                      chek = true
                    }
                  }
                }
              })
            })
          }
          log.debug("Map 的 new_need_list_arr: "+new_need_list_arr.length,new_need_list_arr)
          log.debug("Map 的 need_item_arr: "+need_item_arr.length,need_item_arr)
          log.debug("Map 的 line.lineItems: "+line.lineItems.length,line.lineItems)
          for (var i = 0; i < line.lineItems.length; i++) {
            if (need_item_arr.indexOf(line.lineItems[i].item_id) == -1) {
                log.debug("所有的仓库东欧没货，选在蓝神贸易")
              new_need_list_arr.push({
                subsidiary: 5,
                location: 542,
                target_subsidiary: line.lineItems[i].subsidiary,
                target_warehouse: line.lineItems[i].location,
                declaration_cn: line.lineItems[i].declaration_cn,
                transfer_location: 204,
                lineItems: [
                  {
                    item_id: line.lineItems[i].item_id,
                    declaration_cn: line.lineItems[i].declaration_cn,
                    item_quantity: line.lineItems[i].item_quantity,
                    price_no: 30
                  }
                ]
              })
            }
          }
          log.debug('new_need_list_arr:'+new_need_list_arr.length, new_need_list_arr)
 
          var po_no = [],
            new_result_arr = []
          for (var i = 0; i < new_need_list_arr.length; i++) {
            if (
              po_no.indexOf(
                new_need_list_arr[i].subsidiary + new_need_list_arr[i].location
              ) === -1
            ) {
              new_result_arr.push({
                id: new_need_list_arr[i].subsidiary +
                  new_need_list_arr[i].location,
                subsidiary: new_need_list_arr[i].subsidiary,
                location: new_need_list_arr[i].location,
                declaration_cn: new_need_list_arr[i].declaration_cn,
                target_subsidiary: new_need_list_arr[i].target_subsidiary,
                target_warehouse: new_need_list_arr[i].target_warehouse,
                transfer_location: new_need_list_arr[i].transfer_location,
                lineItems: new_need_list_arr[i].lineItems
              })
            } else {
              for (var j = 0; j < new_result_arr.length; j++) {
                if (
                  new_result_arr[j].id ==
                  new_need_list_arr[i].subsidiary +
                  new_need_list_arr[i].location
                ) {
                  var ss = [],fs_cn=false
                    
                  new_result_arr[j].lineItems.map(function(dl){
                         if(ss.indexOf (dl.declaration_cn  ) ==-1  )  {
                           ss.push(
                            dl.declaration_cn
                          ) 
                         }   
                  })
                   //一个调拨单上物品的中文名称的数量不能大于5个
                   if(ss.length<5){
                    new_result_arr[j].lineItems.push(new_need_list_arr[i].lineItems)
                   }else{
                    new_result_arr.push({
                      id: new_need_list_arr[i].subsidiary +
                        new_need_list_arr[i].location,
                      subsidiary: new_need_list_arr[i].subsidiary,
                      location: new_need_list_arr[i].location,
                      declaration_cn: new_need_list_arr[i].declaration_cn,
                      target_subsidiary: new_need_list_arr[i].target_subsidiary,
                      target_warehouse: new_need_list_arr[i].target_warehouse,
                      transfer_location: new_need_list_arr[i].transfer_location,
                      lineItems: new_need_list_arr[i].lineItems
                    }) 
                   }
                  break
                }       
              }
            }
            po_no.push(
              new_need_list_arr[i].subsidiary + new_need_list_arr[i].location 
            )
          }
          log.debug('new_result_arr:'+new_result_arr.length, new_result_arr)
          new_result_arr.map(function (l) {
            var t_ord = record.create({
              type: 'transferorder',
              isDynamic: true
            })
            log.debug('locatioon' + l.location, 'transferlocation' + l.transfer_location)
            t_ord.setValue({ fieldId: 'subsidiary', value: l.subsidiary })
            t_ord.setValue({ fieldId: 'location', value: l.location })
            t_ord.setValue({
              fieldId: 'transferlocation',
              value: l.transfer_location
            }); // 虚拟仓
            t_ord.setValue({
              fieldId: 'custbodyactual_target_subsidiary',
              value: l.target_subsidiary
            })
            t_ord.setValue({
              fieldId: 'custbody_actual_target_warehouse',
              value: l.target_warehouse
            })
            t_ord.setValue({
              fieldId: 'custbody_dps_transferor_type',
              value: 1
            })
            t_ord.setValue({
              fieldId: 'employee',
              value: runtime.getCurrentUser().id
            })
            l.lineItems.map(function (lia) {
              t_ord.selectNewLine({ sublistId: 'item' })
              t_ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                value: lia.item_id
              })
              t_ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                value: Math.abs(lia.item_quantity)
              })
              t_ord.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: lia.price_no ? lia.price_no : 0
              })
              // 其他字段
              try {
                t_ord.commitLine({ sublistId: 'item' })
              } catch (err) {
                throw (
                'Error inserting item line: ' +
                lia.item_id +
                ', abort operation!' +
                err
                )
              }
            })
            var t_ord_id = t_ord.save({
              enableSourcing: true,
              ignoreMandatoryFields: true
            })
            ord_len.push(t_ord_id)
          })
        })
      }
      if (ord_len.length > 0) {
        result_data.status = 'success'
        result_data.data = '生成成功'
      } else {
        result_data.status = 'error'
        result_data.data = '生成失败'
      }
    })

    log.debug('result_data', result_data)
    return result_data
  }

  function _put (context) { }

  function _delete (context) { }

  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete
  }
})
