/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/encode', 'SuiteScripts/douples_amazon/Helper/handlebars-v4.1.1', 'N/file','N/runtime','SuiteScripts/douples_amazon/Helper/Moment.min',"N/search","N/format"
], function (encode, Handlebars, file,runtime,moment,search,format) {
  function onRequest (context) {
    var response = context.response
    var request = context.request
    var St = new Date().getTime()
    var params = request.parameters; // 参数
    log.debug('lineComObj:', params.fils)

    var fils = JSON.parse(params.fils)

    getResult(fils.sku, fils.dateFrom, fils.dateTo, fils.acc)
   return
    // 写全路径
    var model = file.load({ 
      id: 'SuiteScripts/Rantion/cux/Requirements_Planning/store_demand_model.xml'
    }).getContents()
    var template = Handlebars.compile(model)
    var xml = template(JSON.parse(params.lineComObj))
    var fileObj = file.create({
      name: '需求计划.xls',
      fileType: file.Type.EXCEL,
      contents: encode.convert({
        string: xml,
        inputEncoding: encode.Encoding.UTF_8,
        outputEncoding: encode.Encoding.BASE_64
      }),
      encoding: file.Encoding.UTF8,
      isOnline: true
    })
    response.writeFile({ file: fileObj, isInline: true })
    log.debug('耗时：', new Date().getTime() - St)
  }

  /**
    * 查询结果
    * @param {*} item 
    * @param {*} date_from 
    * @param {*} date_to 
    */
  function getResult (item, date_from, date_to, account) {
    var colus = [
      { name: 'custrecord_demand_forecast_account'},
      { name: 'custrecord_demand_forecast_site'},
      { name: 'custrecord_demand_forecast_item_sku'},
      { name: 'vendorname',join: 'custrecord_demand_forecast_item_sku'},
      { name: 'custrecord_demand_forecast_l_data_type',join: 'custrecord_demand_forecast_parent'}
    ]
    for (var i =date_from;i < date_to;i++) {
      colus.push({ name: 'custrecord_quantity_week' + i, join: 'custrecord_demand_forecast_parent'});
    }
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    // log.debug('dateFormat', dateFormat);
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    log.debug('today', today);
    
    var rsJson = {}, SKUIds = [], limit = 4000;
    var filters_sku = [],skuids = [],location = [];
    if (item) {
      // item = true
      filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }];
    }
    if (account) {
      filters_sku.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
    }
    search.create({
      type: 'customrecord_demand_forecast',
      filters: filters_sku,
      columns: [
        { name: 'custrecord_demand_forecast_item_sku',sort: search.Sort.ASC},
        { name: 'custrecord_demand_forecast_account'},
        { name: 'vendorname',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'}
      ]
    }).run().each(function (rec) {
      // 获取仓库
      var need_location
      search.create({
        type: 'customrecord_aio_account',
        filters: [
          { name: 'internalId', operator: 'is', values: rec.getValue(rec.columns[1]) }
        ],
        columns: [
          { name: 'custrecord_aio_fbaorder_location'}
        ]
      }).run().each(function (r) {
        need_location = r.getValue('custrecord_aio_fbaorder_location')
        location.push(r.getValue('custrecord_aio_fbaorder_location'))
      })
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        location: need_location ? need_location : ''
      })
      skuids.push(rec.getValue(rec.columns[0]))
      return --limit > 0
    })
    log.debug('SKUIds', SKUIds);
    // 1需求量
    var item_data1 = []
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: 1 },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ];
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    };

    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids });

    // if (site) {
    //   filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site });
    // };
    log.debug('filters', filters);
    
    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: colus
    });
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: pageSize
    });
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
    var col_arry = {}
    if (totalCount == 0 && pageCount == 0) {
      rsJson.result = [];
      rsJson.totalCount = totalCount;
      rsJson.pageCount = pageCount;
    } else {
      pageData_demand_forecast.fetch({
        index:0
      }).data.forEach(function (rs) {
        item_data1.push({
          item_sku: rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
          item_sku_text: rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : '',
          item_name: rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : '',
          account: rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : '',
          account_text: rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : '',
          site: rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : '',
          data_type: rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : '',
          data_type_text: rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : '',
      
        })
        var col_ls = 4
         for (var i = date_from;i < date_to;i++) {
            col_ls++
            col_arry["quantity_week"+i] = rs.getValue(rs.columns[col_ls]) ? rs.getValue(rs.columns[col_ls]) : ''
            item_data.push(col_arry)
          }
      })
    }

    // 在途量 (数据源：to单)
    var transit_num = [],item_data2=[]
    search.create({
      type: 'transferorder',
      filters: [
        { join: 'item', name: 'internalid', operator: 'is', values: skuids },
        { name: 'transferlocation', operator: 'anyof', values: location },
        { name: 'mainline', operator: 'is', values: ['F'] },
        { name: 'taxline', operator: 'is', values: ['F'] },
        { name: 'shipping', operator: 'is', values: ['F'] },
        { name: 'transactionlinetype', operator: 'is', values: 'RECEIVING' }
      ],
      columns: [
        'item',
        'custbodyexpected_arrival_time',
        'quantity',
        'transferlocation'
      ]
    }).run().each(function (result) {
      log.debug('result', result.id)
      log.debug('custbodyexpected_arrival_time', result.getValue('custbodyexpected_arrival_time'))
      SKUIds.map(function (line) {
        if (line.item_sku == result.getValue('item') && line.location == result.getValue('transferlocation')) {
          if (result.getValue('custbodyexpected_arrival_time')) {
            var item_date = format.parse({ value: result.getValue('custbodyexpected_arrival_time'), type: format.Type.DATE})
            var item_time = weekofday(item_date)
            transit_num.push({
              item_id: result.getValue('item'),
              item_time: item_time,
              item_quantity: result.getValue('quantity')
            })
          }
        }
      })

      return true
    })
    log.debug('transit_num', transit_num)
    var b = []; // 记录数组a中的id 相同的下标
    if (transit_num.length > 0) {
      for (var i = 0; i < transit_num.length;i++) {
        for (var j = transit_num.length - 1;j > i;j--) {
          if (transit_num[i].item_id == transit_num[j].item_id && transit_num[i].item_time == transit_num[j].item_time) {
            transit_num[i].item_quantity = (transit_num[i].item_quantity * 1 + transit_num[j].item_quantity * 1).toString()
            b.push(j)
          }
        }
      }
      for (var k = 0; k < b.length;k++) {
        transit_num.splice(b[k], 1)
      }
    }

    log.debug('transit_num1', transit_num)
    var need_transit_num = []
    var po_no = []
    if (transit_num.length > 0) {
      for (var i = 0; i < transit_num.length; i++) {
        if (po_no.indexOf(transit_num[i]['item_id']) === -1) {
          need_transit_num.push({
            item_id: transit_num[i]['item_id'],
            lineItems: [{
              item_time: transit_num[i].item_time,
              item_quantity: transit_num[i].item_quantity
            }]
          })
        } else {
          for (var j = 0; j < need_transit_num.length; j++) {
            if (need_transit_num[j].item_id == transit_num[i].item_id) {
              need_transit_num[j].lineItems.push({
                item_time: transit_num[i].item_time,
                item_quantity: transit_num[i].item_quantity
              })
              break
            }
          }
        }
        po_no.push(transit_num[i]['item_id'])
      }
    }
    log.debug('need_transit_num', need_transit_num)

    if (need_transit_num.length > 0) {
      for (var a = 0; a < need_transit_num.length; a++) {
        for (var i = 0; i < SKUIds.length; i++) {
          if (SKUIds[i]['item_sku'] == need_transit_num[a]['item_id']) {
            item_data2.push({
              item_sku: SKUIds[i]['item_sku'],
              item_sku_text: SKUIds[i]['item_sku_name'],
              item_name: SKUIds[i]['item_name'],
              account: SKUIds[i]['forecast_account'],
              account_text: SKUIds[i]['forecast_account_name'],
              site: SKUIds[i]['forecast_site'],
              data_type: '2',
              data_type_text: '在途量',
              transit_no: need_transit_num[a]['lineItems']
            })
          }else {
            if (po_no.indexOf(SKUIds[i]['item_sku']) == -1) {
              item_data2.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '2',
                data_type_text: '在途量',
                transit_no: 0
              })
              po_no.push(SKUIds[i]['item_sku'])
            }
          }
        }
      }
    }else {
      SKUIds.map(function (line) {
        item_data2.push({
          item_sku: line.item_sku,
          item_sku_text: line.item_sku_name,
          item_name: line.item_name,
          account: line.forecast_account,
          account_text: line.forecast_account_name,
          site: line.forecast_site,
          data_type: '2',
          data_type_text: '在途量',
          transit_no: 0
        })
      })
    }

    // 库存量
    var location_quantity = [],temporary_arr = [],item_data3=[]
    search.create({
      type: 'item',
      filters: [
        { name: 'inventorylocation', operator: 'anyof', values: location },
        { name: 'internalid', operator: 'anyof', values: skuids }
      ],
      columns: [
        {name: 'inventorylocation'},
        {name: 'locationquantityavailable'}
      ]
    }).run().each(function (rec) {
      SKUIds.map(function (line) {
        if (line.item_sku == rec.id && line.location == rec.getValue('inventorylocation')) {
          location_quantity.push({
            item_id: rec.id,
            difference_qt: rec.getValue('locationquantityavailable') * 1
          })
        }
        temporary_arr.push(rec.id)
      })
      return true
    })
    log.debug('location_quantity', location_quantity)

    if (location_quantity.length > 0) {
      for (var i = 0; i < SKUIds.length; i++) {
        for (var a = 0; a < location_quantity.length; a++) {
          if (SKUIds[i]['item_sku'] == location_quantity[a]['item_id']) {
            item_data3.push({
              item_sku: SKUIds[i]['item_sku'],
              item_sku_text: SKUIds[i]['item_sku_name'],
              item_name: SKUIds[i]['item_name'],
              account: SKUIds[i]['forecast_account'],
              account_text: SKUIds[i]['forecast_account_name'],
              site: SKUIds[i]['forecast_site'],
              data_type: '3',
              data_type_text: '库存量',
              location_no: location_quantity[a]['difference_qt']
            })
          }else {
            if (temporary_arr.indexOf(SKUIds[i]['item_sku']) == -1) {
              item_data3.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '3',
                data_type_text: '库存量',
                location_no: 0
              })
              temporary_arr.push(SKUIds[i]['item_sku'])
            }
          }
        }
      }
    }else {
      SKUIds.map(function (line) {
        item_data3.push({
          item_sku: line.item_sku,
          item_sku_text: line.item_sku_name,
          item_name: line.item_name,
          account: line.forecast_account,
          account_text: line.forecast_account_name,
          site: line.forecast_site,
          data_type: '3',
          data_type_text: '库存量',
          location_no: 0
        })
      })
    }
    // 店铺净需求
    var item_data4=[]
    SKUIds.map(function (line) {
      item_data4.push({
        item_sku: line.item_sku,
        item_sku_text: line.item_sku_name,
        item_name: line.item_name,
        account: line.forecast_account,
        account_text: line.forecast_account_name,
        site: line.forecast_site,
        data_type: '4',
        data_type_text: '店铺净需求'
      })
    })

    // 修改净需求量
    var item_data5=[];
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: 23 },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ];
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
    }

    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids });

    // if (site) {
    //   filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site });
    // }
    log.debug('filters', filters);
    // 需求量
    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: colus
    })
    var pageSize = pageSize; // 每页条数
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: pageSize
    });
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数

    if (totalCount == 0 && pageCount == 0) {
      SKUIds.map(function (line) {
        item_data5.push({
          item_sku: line.item_sku,
          item_sku_text: line.item_sku_name,
          item_name: line.item_name,
          account: line.forecast_account,
          account_text: line.forecast_account_name,
          site: line.forecast_site,
          data_type: '5',
          data_type_text: '修改净需求量'
        });
      });

      rsJson.totalCount = totalCount;
      rsJson.pageCount = pageCount;
    } else {
      pageData_demand_forecast.fetch({
        index: 0
      }).data.forEach(function (rs) {
        item_data5.push({
          item_sku: rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
          item_sku_text: rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : '',
          item_name: rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : '',
          account: rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : '',
          account_text: rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : '',
          site: rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : '',
          data_type: rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : '',
          data_type_text: rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : '',
      
        })
        var col_ls = 4;
         for (var i = date_from;i < date_to;i++) {
            col_ls++;
            col_arry["quantity_week"+i] = rs.getValue(rs.columns[col_ls]) ? rs.getValue(rs.columns[col_ls]) : '';
            item_data.push(col_arry);
          }
      })
    }
     //1 需求量 ,2 在途量， 3 库存量，4 净需求量，5修改净需求
    log.debug('item_data1 需求量', item_data1);
    log.debug('item_data1 在途量，', item_data2);
    log.debug('item_data1 库存量', item_data3);
    log.debug('item_data1 净需求量', item_data4);
    log.debug('item_data1 修改净需求', item_data5);
    // var week;
    // for(var i = 0; i < len; i++){
    //     var data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type',line:i});
    //     var weekArray =[],dataObjs = {};
    //     store_name =item_data[i];
    //     sku = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_sku',line:i});
    //     item_name = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_item_name',line:i});
    //     data_type = curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_data_type',line:i});
    //     for(var a = week_from; a < week_to + 1; a++){
    //         week ="W"+ a;
    //         weekArray.push({week : week,qty:curr.getSublistValue({sublistId:sublistId,fieldId:'custpage_quantity_week'+a,line:i})});
    //     }
    //     lines.push({ store_name:store_name, sku:sku, item_name:item_name,data_type:data_type,weekArray:weekArray});
    // }
    // console.log("+ItemDatas: ",JSON.stringify(lines));
    // lineComObj["lines"] = lines;    
    // lineComObj["weekArrayHead"] = weekArray;



    // rsJson.result = item_data;
    // rsJson.totalCount = totalCount;
    // rsJson.pageCount = pageCount;
    return rsJson;
  }
   /**
     * 判断某一日属于这一年的第几周
     * @param {*} data 
     */
    function weekofday(data) {
      // function weekofday(date_from,date_to) {
          // log.debug('data',data);
          // var value = format.parse({value:data, type: format.Type.DATE});
          // log.debug('value',value);
          // var value = moment(value1).format('YYYY/MM/DD');
          // log.debug('value',value);
          // var dt = new Date(value);
  
          // //获取年份
          // if(date_from && date_to){
          //     var YearDer= date_to.getFullYear() - date_from.getFullYear() ;
          //     if(YearDer !=0){
          //         form - 52 * YearDer;
          //        YearDer - 1 >0 
          //         1 - to;
          //     }
          // }
         
          //比较参数年份
          var dt = data;
          log.debug('dt',dt);
          var y = dt.getFullYear();
          log.debug('y',y);
  
          var start = "1/1/" + y;
  
          log.debug('start',start);
  
          start = new Date(start);
          
          log.debug('start_1',start);
  
          starts = start.valueOf();
  
          log.debug('starts',starts);
  
          startweek = start.getDay();
  
          log.debug('startweek',startweek);
  
          dtweek = dt.getDay();
  
          log.debug('dtweek',dtweek);
  
          var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1 ;
          
          log.debug('days',days);
  
          days = Math.floor(days / 7);
  
          log.debug('days_1',days);
  
          return (days + 2);
      }
  return {
    onRequest: onRequest
  }
})
