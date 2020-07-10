/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/encode', 'SuiteScripts/douples_amazon/Helper/handlebars-v4.1.1', 'N/file', 'N/runtime', 'SuiteScripts/douples_amazon/Helper/Moment.min', 'N/search', 'N/format'
], function (encode, Handlebars, file, runtime, moment, search, format) {
  function onRequest (context) {
    var response = context.response;
    var request = context.request;
    var St = new Date().getTime();
    var params = request.parameters; // 参数
    log.debug('lineComObj:', params.fils);

    var fils = JSON.parse(params.fils);
    var lineComObj;
    if (fils.TT == 'Demand') { // 店铺供应需求
      lineComObj = getResult_Demand(fils.sku, fils.week_rs, fils.func_type, fils.acc,fils.nowPage,fils.pageSize);
    }else if (fils.TT == 'Alloca') { // 调拨计划
      lineComObj = getResult_Alloca(fils.sku, fils.week_rs, fils.func_type, fils.acc,fils.nowPage,fils.pageSize);
    }else if (fils.TT == 'Delivery') { // 交货计划
      lineComObj = getResult_Delivery(fils.sku, fils.week_rs, fils.func_type, fils.acc,fils.nowPage,fils.pageSize);
    }else if (fils.TT == 'Replen') { // 补货计划
      lineComObj = getResult_Replen(fils.sku, fils.week_rs, fils.func_type, fils.acc,fils.nowPage,fils.pageSize);
    }

    // 写全路径
    var model = file.load({
      id: 'SuiteScripts/Rantion/cux/Requirements_Planning/store_demand_model.xml'
    }).getContents();
    var template = Handlebars.compile(model);
    var xml = template(lineComObj);
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
    });
    response.writeFile({ file: fileObj, isInline: true });
    log.debug('耗时：', new Date().getTime() - St);
  }

 /**
    * 查询结果 补货计划 导出
    * @param {*} item 
    * @param {*} week_rs 
    * @param {*} func_type 
    */
   function getResult_Replen (item, week_rs, func_type, account,nowPage,pageSize) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    var SKUIds = [], limit = 4000;
    var filters_sku = [],skuids = [],location = [];
    if (item) {
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
        { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'},
        { name: 'custitem_product_grading', join: "custrecord_demand_forecast_item_sku" },  //分级
        { name: 'custitemf_product_grading', join: "custrecord_demand_forecast_item_sku" }, //初级分级

      ]
    }).run().each(function (rec) {
      // 获取仓库
      var need_location;
      search.create({
        type: 'customrecord_aio_account',
        filters: [
          { name: 'internalId', operator: 'is', values: rec.getValue(rec.columns[1]) }
        ],
        columns: [
          { name: 'custrecord_aio_fbaorder_location'}
        ]
      }).run().each(function (r) {
        need_location = r.getValue('custrecord_aio_fbaorder_location');
        location.push(r.getValue('custrecord_aio_fbaorder_location'));
      });
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]),//产品分级
        itemf_leve: rec.getValue(rec.columns[5]),//产品初始分级
        location: need_location ? need_location : ''
      });
      skuids.push(rec.getValue(rec.columns[0]));
      return --limit > 0;
    })
    var item_data = []
     //搜索店铺净需求，确认交货
    item_data = GetPredictionData(item_data, ['23'], today, account, skuids,SKUIds, {data_type: '23',data_type_text: '店铺净需求'},week_rs,nowPage,acc_skus,pageSize); 
    //确认交货量
    item_data = GetPredictionData(item_data, ['16'], today, account, skuids,SKUIds, {data_type: '16',data_type_text: '确认交货量'},week_rs,nowPage,acc_skus,pageSize); 
  //倒排补货量
  var item_arr = []
  search.create({
      type: 'item',
      filters: [
          { name: 'internalid', operator: 'is', values: skuids },
      ],
      columns: [
          { name: 'othervendor'}
      ]
  }).run().each(function (rec) {
      item_arr.push({
          item_id: rec.id,
          vendor_id: rec.getValue('othervendor')
      })
      return true;
  });

  if(item_arr.length > 0){
      item_arr.map(function(line){

          SKUIds.map(function(li){
              //如果供应商存在
              if(line.vendor_id){
                  log.debug("存在供应商,搜索采购周期记录")
                  search.create({
                      type: 'customrecordpurchasing_cycle_record',
                      filters: [
                          { name: 'custrecordsku_number', operator: 'is', values: line.item_id },
                          { name: 'custrecord_vendor', operator: 'is', values: line.vendor_id },
                      ],
                      columns: [
                          'custrecord_purchasing_cycle'  //采购周期
                      ]
                  }).run().each(function (rec) {
                      var need_time = Number(rec.getValue('custrecord_purchasing_cycle'));
                      if(need_time){
                          if(li.item_sku == line.item_id){
                              item_data.push({
                                  item_sku: li.item_sku,
                                  item_sku_text: li.item_sku_name,
                                  item_name: li.item_name,
                                  account: li.forecast_account,
                                  account_text: li.forecast_account_name,
                                  site: li.forecast_site,
                                  data_type: '1',
                                  data_type_text: '倒排补货量',
                                  item_leve : li['item_leve'],//产品分级
                                  itemf_leve : li['itemf_leve'],//产品初始分级
                                  need_time: need_time
                              }); 
          
                              item_data.push({
                                  item_sku: li.item_sku,
                                  item_sku_text: li.item_sku_name,
                                  item_name: li.item_name,
                                  account: li.forecast_account,
                                  account_text: li.forecast_account_name,
                                  site: li.forecast_site,
                                  data_type: '2',
                                  data_type_text: '修改补货量',
                                  item_leve : li['item_leve'],//产品分级
                                  itemf_leve : li['itemf_leve'],//产品初始分级
                                  need_time: need_time
                              }); 
          
                              item_data.push({
                                  item_sku: li.item_sku,
                                  item_sku_text: li.item_sku_name,
                                  item_name: li.item_name,
                                  account: li.forecast_account,
                                  account_text: li.forecast_account_name,
                                  site: li.forecast_site,
                                  data_type: '4',
                                  data_type_text: '补货量',
                                  item_leve : li['item_leve'],//产品分级
                                  itemf_leve : li['itemf_leve'],//产品初始分级
                                  need_time: need_time
                              }); 
                          }
                      }
                  });
              }else{
                  if(li.item_sku == line.item_id){
                      item_data.push({
                          item_sku: li.item_sku,
                          item_sku_text: li.item_sku_name,
                          item_name: li.item_name,
                          account: li.forecast_account,
                          account_text: li.forecast_account_name,
                          site: li.forecast_site,
                          data_type: '1',
                          data_type_text: '倒排补货量',
                          item_leve : li['item_leve'],//产品分级
                          itemf_leve : li['itemf_leve'],//产品初始分级
                          need_time: ''
                      }); 
  
                      item_data.push({
                          item_sku: li.item_sku,
                          item_sku_text: li.item_sku_name,
                          item_name: li.item_name,
                          account: li.forecast_account,
                          account_text: li.forecast_account_name,
                          site: li.forecast_site,
                          data_type: '2',
                          data_type_text: '修改补货量',
                          item_leve : li['item_leve'],//产品分级
                          itemf_leve : li['itemf_leve'],//产品初始分级
                          need_time: ''
                      }); 
  
                      item_data.push({
                          item_sku: li.item_sku,
                          item_sku_text: li.item_sku_name,
                          item_name: li.item_name,
                          account: li.forecast_account,
                          account_text: li.forecast_account_name,
                          site: li.forecast_site,
                          data_type: '4',
                          data_type_text: '补货量',
                          item_leve : li['item_leve'],//产品分级
                          itemf_leve : li['itemf_leve'],//产品初始分级
                          need_time: ''
                      }); 
                  }
              }
          })
          
      })
  }


    var result = item_data;
   
    var zl = 0, data_arr = [],weekArray = [],week
    for (var z = 0; z < SKUIds.length; z++) {
      var need1_zl, need2_zl, need3_zl,need4_zl;
      for (var a = 0; a < result.length; a++) {
        if (SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']) {
          var data_type = result[a].data_type_text;
          var sku = result[a].item_sku;
          var item_sku_text = result[a].item_sku_text;
          var item_name = result[a].item_name;
          var store_name = result[a].account_text;
          var item_leve = result[a].item_leve;
          var itemf_leve = result[a].itemf_leve;
          if(result[a]['data_type'] == 23){
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
                weekArray.push({week: week,qty:Math.round(result[a]['quantity_week'+wek])?result[a]['quantity_week'+wek]:"0"});
            })
         }
              // 确认交货量
            if(result[a]['data_type'] == 16){
              weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              weekArray.push({week: week,qty:Math.round(result[a]['quantity_week'+wek])?result[a]['quantity_week'+wek]:"0"});
            })
            need1_zl = zl;
          }
         //倒排补货量
         if(result[a]['data_type'] == 1){
          weekArray=[];
          var need_today = new Date(+new Date()+8*3600*1000 - result[a]['need_time']*24*3600*1000);
          var need_week_today = getWeek(need_today,func_type);
          var week_today = getWeek(new Date(+new Date()+8*3600*1000),func_type);
          var cc = week_today - need_week_today; //这一周减去需求周
           // 52 行
           week_rs.map(function(wek){
              var df =   data_arr[need1_zl]["weekArray"][(Number(wek) + Number(cc)+1)]
              var x1 = need1_zl || need1_zl == 0 ? df?df["qty"]:0:0
              //x1在不选店铺的情况下是空的
              weekArray.push({week: week,qty:x1?x1:"0"});
          })
          re_zl =zl
      }
     
      if(result[a]['data_type'] == 2 || result[a]['data_type'] == 4){
          weekArray=[];
          var need_today = new Date(+new Date()+8*3600*1000 - result[a]['need_time']*24*3600*1000);
          var need_week_today = getWeek(need_today,func_type);
          var week_today = getWeek(new Date(+new Date()+8*3600*1000),func_type)
          var cc = week_today - need_week_today; //这一周减去需求周
           // 52 行
           week_rs.map(function(wek){
            var df =   data_arr[need1_zl]["weekArray"][(Number(wek) + Number(cc))]
            var x1 = re_zl || re_zl == 0 ? df?df["qty"]:0:0
              //x1在不选店铺的情况下是空的
              weekArray.push({week: week,qty:x1?x1:"0"});
            
          })
      }
          zl++;
          // 最后得到的数据
          data_arr.push({
            store_name: store_name,
            sku: item_sku_text,
            item_name: item_name,
            data_type: data_type,
            item_leve: item_leve,
            itemf_leve: itemf_leve,
            weekArray: weekArray
          });
        }
      }
    }
    var lineComObj = {};
    lineComObj['lines'] = data_arr;
    lineComObj['weekArrayHead'] = weekArray;
    log.debug('lineComObj:', lineComObj);

    return lineComObj;
  }


  /**
    * 查询结果 交货计划 导出
    * @param {*} item 
    * @param {*} week_rs 
    * @param {*} func_type 
    */
   function getResult_Delivery (item, week_rs, func_type, account,nowPage,pageSize) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    var SKUIds = [], limit = 4000;
    var filters_sku = [],skuids = [],location = [];
    if (item) {
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
        { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'},
        { name: 'custitem_product_grading', join: "custrecord_demand_forecast_item_sku" },  //分级
        { name: 'custitemf_product_grading', join: "custrecord_demand_forecast_item_sku" }, //初级分级

      ]
    }).run().each(function (rec) {
      // 获取仓库
      var need_location;
      search.create({
        type: 'customrecord_aio_account',
        filters: [
          { name: 'internalId', operator: 'is', values: rec.getValue(rec.columns[1]) }
        ],
        columns: [
          { name: 'custrecord_aio_fbaorder_location'}
        ]
      }).run().each(function (r) {
        need_location = r.getValue('custrecord_aio_fbaorder_location');
        location.push(r.getValue('custrecord_aio_fbaorder_location'));
      });
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]),//产品分级
        itemf_leve: rec.getValue(rec.columns[5]),//产品初始分级
        location: need_location ? need_location : ''
      });
      skuids.push(rec.getValue(rec.columns[0]));
      return --limit > 0;
    })
    var item_data = []
    // 调拨计划量  ，取自修改的调拨计划量 22
    item_data = GetPredictionData(item_data, ['22'], today, account, skuids,SKUIds, {data_type: '6',data_type_text: '调拨计划量'},week_rs,nowPage,skuids,pageSize); 
        var location=[];
        //获取所有自营仓
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_financia_warehous', operator: 'is', values: 2 },
            ],
            columns: [
                { name: 'internalId'}
            ]
        }).run().each(function (rec) {
            location.push(rec.id);
            return true;
        });
        log.debug('location',location);
        //自营仓在途量 数据来源采购单]
        log.debug('skuids',skuids);
        var operated_warehouse = [];
        search.create({
            type: 'purchaseorder',
            filters: [
                { name: 'location', operator: 'anyof', values: location },
                { name: 'item', operator: 'anyof', values: skuids },
                { name: 'mainline', operator: 'is', values: ['F'] },
                { name: 'taxline', operator: 'is', values: ['F'] }
            ],
            columns: [
                // { join: 'item', name: 'internalid', summary: 'GROUP' },
                // { formula: '{quantity}-{quantityshiprecv}', name: 'formulanumeric', summary: 'SUM' },
                //'expectedreceiptdate'
                'item',
                'expectedreceiptdate',
                'quantity',
                'quantityshiprecv',
                'location'
            ]
        }).run().each(function (result) {
            var need_quantity = result.getValue('quantity') - result.getValue('quantityshiprecv');
            if(need_quantity != 0){
                SKUIds.map(function(line){
                    if(line.item_sku == result.getValue('item')){
                        if(result.getValue('expectedreceiptdate')){
                            var item_date = format.parse({ value:result.getValue('expectedreceiptdate'), type: format.Type.DATE});
                            var item_time =  getWeek(item_date,func_type);
                            operated_warehouse.push({
                                item_id : result.getValue('item'),
                                item_date : item_time,
                                item_quantity : need_quantity
                            })
                        }
                    }
                })
            }
            return true;
        });
        log.debug('operated_warehouse',operated_warehouse);
        
        var need_transit_num = [];
        var b = [];//记录数组a中的id 相同的下标
        if(operated_warehouse.length > 0){
            for(var i = 0; i < operated_warehouse.length;i++){
                for(var j = operated_warehouse.length-1;j>i;j--){
                    if(operated_warehouse[i].item_id == operated_warehouse[j].item_id && operated_warehouse[i].item_date == operated_warehouse[j].item_date){
                        operated_warehouse[i].item_quantity = (operated_warehouse[i].item_quantity*1 + operated_warehouse[j].item_quantity*1).toString()
                        b.push(j)
                    }
                }
            }
            for(var k = 0; k<b.length;k++){
                operated_warehouse.splice(b[k],1)
            }
        }

        log.debug('operated_warehouse1',operated_warehouse);
        var need_transit_num = [];
        if(operated_warehouse.length > 0){
            var po_no = [];
            for (var i = 0; i < operated_warehouse.length; i++) {
                if (po_no.indexOf(operated_warehouse[i]['item_id']) === -1) {
                    need_transit_num.push({
                        item_id: operated_warehouse[i]['item_id'],
                        lineItems: [{
                            item_time: operated_warehouse[i].item_date,
                            item_quantity: operated_warehouse[i].item_quantity
                        }]
                    });
                } else {
                    for (var j = 0; j < need_transit_num.length; j++) {
                        if (need_transit_num[j].item_id == operated_warehouse[i].item_id) {
                            need_transit_num[j].lineItems.push({
                                item_time: operated_warehouse[i].item_date,
                                item_quantity: operated_warehouse[i].item_quantity
                            });
                            break;
                        }
                    }
                }
                po_no.push(operated_warehouse[i]['item_id']);
            }
        }
        log.debug('need_transit_num',need_transit_num);

        if(need_transit_num.length > 0){
            for(var i = 0; i < SKUIds.length; i++){
                for(var a = 0; a < need_transit_num.length; a++){
                    if(SKUIds[i]['item_sku'] == need_transit_num[a]['item_id']){
                        item_data.push({
                            item_sku: SKUIds[i]['item_sku'],
                            item_sku_text: SKUIds[i]['item_sku_name'],
                            item_name: SKUIds[i]['item_name'],
                            account: SKUIds[i]['forecast_account'],
                            account_text: SKUIds[i]['forecast_account_name'],
                            site: SKUIds[i]['forecast_site'],
                            data_type: '4',
                            data_type_text: '自营仓采购在途量',
                            item_leve : SKUIds[i]['item_leve'],//产品分级
                            itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级

                            operated_warehouse: need_transit_num[a]['lineItems']
                        });
                    }else{
                        if(po_no.indexOf(SKUIds[i]['item_sku']) == -1){
                            item_data.push({
                                item_sku: SKUIds[i]['item_sku'],
                                item_sku_text: SKUIds[i]['item_sku_name'],
                                item_name: SKUIds[i]['item_name'],
                                account: SKUIds[i]['forecast_account'],
                                account_text: SKUIds[i]['forecast_account_name'],
                                site: SKUIds[i]['forecast_site'],
                                data_type: '4',
                                data_type_text: '自营仓采购在途量',
                                item_leve : SKUIds[i]['item_leve'],//产品分级
                                itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级
                                operated_warehouse: 0
                            });
                            po_no.push(SKUIds[i]['item_sku']);
                        }
                    }
                }
            }
        }else{
            SKUIds.map(function(line){
                item_data.push({
                    item_sku: line.item_sku,
                    item_sku_text: line.item_sku_name,
                    item_name: line.item_name,
                    account: line.forecast_account,
                    account_text: line.forecast_account_name,
                    site: line.forecast_site,
                    data_type: '4',
                    data_type_text: '自营仓采购在途量',
                    item_leve :line['item_leve'],//产品分级
                    itemf_leve : line['itemf_leve'],//产品初始分级
                    operated_warehouse: ''
                });
            })
        }
        
     
        log.debug('loca_w',loca_w);
        var filters_lo=[],warehouse_stock1=[],warehouse_stock2=[];
        //美西仓库存量
        filters_lo.push({ name: 'inventorylocation', operator: 'anyof', values: 2601 });
        filters_lo.push({ name: 'internalid', operator: 'anyof', values: skuids });
        var temporary_arr = [];
        search.create({
            type: 'item',
            filters: filters_lo,
            columns : [
                {name : 'internalid', summary: 'GROUP' },
                {name : 'locationquantityavailable', summary: 'SUM'},
            ]
        }).run().each(function (rec) {
            log.debug('rec',rec.getValue({name : 'internalid', summary: 'GROUP' }));
            log.debug('locationquantityavailable',rec.getValue({name : 'locationquantityavailable', summary: 'SUM'}));
            warehouse_stock1.push({
                item_id : rec.getValue({name : 'internalid', summary: 'GROUP' }),
                item_quantity : rec.getValue({name : 'locationquantityavailable', summary: 'SUM'})
            });
            temporary_arr.push(rec.getValue({name : 'internalid', summary: 'GROUP' }));
            return true;
        });
        item_data = GetInventoryData(SKUIds,warehouse_stock1,item_data,temporary_arr,"5","美西仓库存");
         filters_lo=[],temporary_arr=[];

        //其他自营仓与工厂仓库存
        var loca_w=[];
        search.create({
            type: 'location',
            filters: [
                { name: 'custrecord_dps_financia_warehous', operator: 'anyof', values: ["2","3"] },
                { name: 'internalId', operator: 'noneof', values:["2601"] },
            ],
            columns: [
                { name: 'internalId'}
            ]
        }).run().each(function (rec) {
            loca_w.push(rec.id);
            return true
        });
        filters_lo.push({ name: 'inventorylocation', operator: 'anyof', values: loca_w });
        filters_lo.push({ name: 'internalid', operator: 'anyof', values: skuids });
        search.create({
            type: 'item',
            filters: filters_lo,
            columns : [
                {name : 'internalid', summary: 'GROUP' },
                {name : 'locationquantityavailable', summary: 'SUM'},
            ]
        }).run().each(function (rec) {
            log.debug('rec',rec.getValue({name : 'internalid', summary: 'GROUP' }));
            log.debug('locationquantityavailable',rec.getValue({name : 'locationquantityavailable', summary: 'SUM'}));
            warehouse_stock2.push({
                item_id : rec.getValue({name : 'internalid', summary: 'GROUP' }),
                item_quantity : rec.getValue({name : 'locationquantityavailable', summary: 'SUM'})
            });
            temporary_arr.push(rec.getValue({name : 'internalid', summary: 'GROUP' }));
            return true;
        });
        item_data = GetInventoryData(SKUIds,warehouse_stock2,item_data,temporary_arr,"111","其他自营仓与工厂仓库存");
   
        SKUIds.map(function(line){
          item_data.push({
              item_sku: line.item_sku,
              item_sku_text: line.item_sku_name,
              item_name: line.item_name,
              account: line.forecast_account,
              account_text: line.forecast_account_name,
              site: line.forecast_site,
              data_type: '7',
              data_type_text: '计划交货量',
              item_leve :line['item_leve'],//产品分级
              itemf_leve : line['itemf_leve'],//产品初始分级
          });
      })
    //修改就货量
    item_data = GetPredictionData(item_data, ['15'], today, account, skuids,SKUIds, {data_type: '8',data_type_text: '修改交货量'},week_rs,nowPage,skuids,pageSize); 
    //确认交货量
    item_data = GetPredictionData(item_data, ['16'], today, account, skuids,SKUIds, {data_type: '9',data_type_text: '确认交货量'},week_rs,nowPage,skuids,pageSize); 
  


    var result = item_data;
   
    var zl = 0, data_arr = [],weekArray = [],week;
    for(var key in acc_skus){
    for (var z = 0; z < SKUIds.length; z++) {
      var need1_zl, need2_zl, need3_zl,need4_zl;
      for (var a = 0; a < result.length; a++) {
        if (SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']
        && key.split(".")[0]  == SKUIds[z]['item_sku'] 
        && acc_skus[key] == SKUIds[z]['forecast_account']
        ) {
          var data_type = result[a].data_type_text;
          var sku = result[a].item_sku;
          var item_sku_text = result[a].item_sku_text;
          var item_name = result[a].item_name;
          var store_name = result[a].account_text;
          var item_leve = result[a].item_leve;
          var itemf_leve = result[a].itemf_leve;

          if(result[a]['data_type'] == 22 ||result[a]['data_type'] == 6 ){//调拨计划量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
                weekArray.push({week: week,qty:Math.abs(result[a]['quantity_week'+wek]).toString() ?Math.abs(result[a]['quantity_week'+wek]):"0"});
            })
            need1_zl = zl;
         }
        
         if(result[a]['data_type'] == 4){//自营仓在途量 
          var operated_no = result[a]['operated_warehouse'];
          log.debug('item_name', result[a]['item_name']);
          log.debug('operated_no',operated_no);
          weekArray=[];
          week_rs.map(function(wek){
            var ff = wek;
            if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                  ff=wek -1;
            week = 'W' + ff;
            var chck = true
              if(operated_no.length > 0){
                  operated_no.map(function(l){
                      if(l.item_time == wek){
                        chck = false
                        weekArray.push({week: week,qty:l.item_quantity.toString() ?l.item_quantity.toString():"0"}); 
                      }
                  })
                  if(chck)
                  weekArray.push({week: week,qty:"0"}); 
              }else{
                weekArray.push({week: week,qty:"0"}); 
              }
          })
          need2_zl = zl;
         }


         if(result[a]['data_type'] == 5){//美西仓库存量
          weekArray=[];
          week_rs.map(function(wek){
            var ff = wek;
            if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                  ff=wek -1;
            week = 'W' + ff;
              if(wek== week_rs[0]){
                      weekArray.push({week: week,qty:Math.round(result[a]['warehouse_quantity']) ?Math.round(result[a]['warehouse_quantity']):0}); 
              }else{
                  weekArray.push({week: week,qty:"0"}); 
              }
          })
          need3_zl = zl;
          }

          if(result[a]['data_type'] == 111){//其他自营仓与工厂仓库存
            weekArray=[];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
                if(wek== week_rs[0]){
                    weekArray.push({week: week,qty:Math.round(result[a]['warehouse_quantity']) ?Math.round(result[a]['warehouse_quantity']):0}); 
                }else{
                  weekArray.push({week: week,qty:"0"}); 
                }
            })
            need4_zl = zl;
          }

          if(result[a]['data_type'] == 7 ){ //计划交货量
            weekArray=[];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              //拿到对应的data_arr的数据
                //调拨计划
                var x1 = need1_zl || need1_zl == 0 ? Math.round(data_arr[need1_zl]["weekArray"][wek - week_rs[0]]["qty"])? Math.round(data_arr[need1_zl]["weekArray"][wek - week_rs[0]]["qty"]):0 : 0; 
                //采购在途
                var x2 = need2_zl || need2_zl == 0 ? Math.round(data_arr[need2_zl]["weekArray"][wek - week_rs[0]]["qty"])? Math.round(data_arr[need2_zl]["weekArray"][wek - week_rs[0]]["qty"]):0  : 0;
                //美西仓库存
                var x3 = need3_zl || need3_zl == 0 ? Math.round(data_arr[need3_zl]["weekArray"][wek - week_rs[0]]["qty"])? Math.round(data_arr[need3_zl]["weekArray"][wek - week_rs[0]]["qty"]):0  : 0;
                //其他自营仓与工厂仓库存
                var x4 = need4_zl || need4_zl == 0 ? Math.round(data_arr[need4_zl]["weekArray"][wek - week_rs[0]]["qty"])? Math.round(data_arr[need4_zl]["weekArray"][wek - week_rs[0]]["qty"]):0  : 0;
                var x5 = x1-(Number(x3)+Number(x2) +Number(x4));
                weekArray.push({week: week,qty: x5 ? x5.toString() : '0'}); 
            })
          }

          //   8 15修改交货量 / 9 16 确认交货量
          if(result[a]['data_type'] == 8 || result[a]['data_type'] == 9 || result[a]['data_type'] == 15|| result[a]['data_type'] == 16){
            weekArray=[];
            if(result[a]['data_type'] == 15 ||result[a]['data_type'] == 16 ){
                week_rs.map(function(wek){
                  var ff = wek;
                  if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                        ff=wek -1;
                  week = 'W' + ff;

                    var x4 = Math.abs(result[a]['quantity_week'+wek]).toString() ? Math.abs(result[a]['quantity_week'+wek]).toString():"0";

                    log.debug("-15 16 0000000000000确认交货量 - "+x4,result[a]['quantity_week'+wek]);
                    weekArray.push({week: week,qty: x4}); 
                })
            }else{
                week_rs.map(function(wek){
                  var ff = wek;
                  if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                        ff=wek -1;
                  week = 'W' + ff;
                    var x1 = need1_zl || need1_zl == 0 ? Math.round(data_arr[need1_zl]["weekArray"][wek - week_rs[0]]["qty"])?Math.round(data_arr[need1_zl]["weekArray"][wek - week_rs[0]]["qty"]):0 : 0;
                    var x2 = need2_zl || need2_zl == 0 ? Math.round(data_arr[need2_zl]["weekArray"][wek - week_rs[0]]["qty"])?Math.round(data_arr[need2_zl]["weekArray"][wek - week_rs[0]]["qty"]):0 : 0;
                    var x3 = need3_zl || need3_zl == 0 ? Math.round(data_arr[need3_zl]["weekArray"][wek - week_rs[0]]["qty"])?Math.round(data_arr[need3_zl]["weekArray"][wek - week_rs[0]]["qty"]):0: 0;
                    var x4 =Number(x1) -(Number(x3)+Number(x2));
                    log.debug("-00000000000000确认交货量 - "+x4,x1+","+x2+","+x3);
                    weekArray.push({week: week,qty: Math.round(x4) }); 
                })
            }
        }
          zl++;
          // 最后得到的数据
          data_arr.push({
            store_name: store_name,
            sku: item_sku_text,
            item_name: item_name,
            data_type: data_type,
            item_leve: item_leve,
            itemf_leve: itemf_leve,
            weekArray: weekArray
          });
        }
      }
    }
    }
    var lineComObj = {};
    lineComObj['lines'] = data_arr;
    lineComObj['weekArrayHead'] = weekArray;
    log.debug('lineComObj:', lineComObj);

    return lineComObj;
  }


  /**
    * 查询结果 调拨计划 导出
    * @param {*} item 
    * @param {*} week_rs 
    * @param {*} func_type 
    */
  function getResult_Alloca (item, week_rs, func_type, account,nowPage,pageSize) {

    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    var SKUIds = [], limit = 4000;
    var filters_sku = [],skuids = [],location = [];
    if (item) {
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
        { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'},
        { name: 'custitem_product_grading', join: "custrecord_demand_forecast_item_sku" },  //分级
        { name: 'custitemf_product_grading', join: "custrecord_demand_forecast_item_sku" }, //初级分级
        { name: 'custrecord_aio_fbaorder_location' ,join:"custrecord_demand_forecast_account"},
      ]
    }).run().each(function (rec) {
      // 获取仓库
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]),//产品分级
        itemf_leve: rec.getValue(rec.columns[5]),//产品初始分级
        location: rec.getValue(rec.columns[6])
      });
      location.push(rec.getValue(rec.columns[6]));
      skuids.push(rec.getValue(rec.columns[0]));
      return --limit > 0;
    })
    var item_data = [];
      /** 
         * 1.需求预测
         * 2.店铺库存量
         * 11.调拨在途量
         * 23.修改店铺净需求量
         * 5.调拨计划量
         * 6/22.修改调拨计划量
         */
    // item_data = GetPredictionData(item_data, ['1'], today, account, skuids,SKUIds, {data_type: '1',data_type_text: '需求预测'},week_rs,func_type); // 1需求量
    
     // 需求量 - > 销售预测
     var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: 1 },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ];
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
    }

    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids });

    if (site) {
      filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site });
    }
    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    });
    var acc_skus = {},sku_arrys=[];
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: pageSize
    });
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
    if (totalCount == 0 && pageCount == 0) {
      rsJson.result = [];
      rsJson.totalCount = totalCount;
      rsJson.pageCount = pageCount;
      log.debug('item_data', item_data);
      return rsJson;
    } else {
      pageData_demand_forecast.fetch({
        index: Number(nowPage - 1)
      }).data.forEach(function (rs) {
        item_data.push({
          item_sku: rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
          item_sku_text: rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : '',
          item_name: rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : '',
          account: rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : '',
          account_text: rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : '',
          site: rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : '',
          data_type: rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : '',
          data_type_text: rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : '',
          quantity_week1: rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : '',
          quantity_week2: rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : '',
          quantity_week3: rs.getValue(rs.columns[7]) ? rs.getValue(rs.columns[7]) : '',
          quantity_week4: rs.getValue(rs.columns[8]) ? rs.getValue(rs.columns[8]) : '',
          quantity_week5: rs.getValue(rs.columns[9]) ? rs.getValue(rs.columns[9]) : '',
          quantity_week6: rs.getValue(rs.columns[10]) ? rs.getValue(rs.columns[10]) : '',
          quantity_week7: rs.getValue(rs.columns[11]) ? rs.getValue(rs.columns[11]) : '',
          quantity_week8: rs.getValue(rs.columns[12]) ? rs.getValue(rs.columns[12]) : '',
          quantity_week9: rs.getValue(rs.columns[13]) ? rs.getValue(rs.columns[13]) : '',
          quantity_week10: rs.getValue(rs.columns[14]) ? rs.getValue(rs.columns[14]) : '',
          quantity_week11: rs.getValue(rs.columns[15]) ? rs.getValue(rs.columns[15]) : '',
          quantity_week12: rs.getValue(rs.columns[16]) ? rs.getValue(rs.columns[16]) : '',
          quantity_week13: rs.getValue(rs.columns[17]) ? rs.getValue(rs.columns[17]) : '',
          quantity_week14: rs.getValue(rs.columns[18]) ? rs.getValue(rs.columns[18]) : '',
          quantity_week15: rs.getValue(rs.columns[19]) ? rs.getValue(rs.columns[19]) : '',
          quantity_week16: rs.getValue(rs.columns[20]) ? rs.getValue(rs.columns[20]) : '',
          quantity_week17: rs.getValue(rs.columns[21]) ? rs.getValue(rs.columns[21]) : '',
          quantity_week18: rs.getValue(rs.columns[22]) ? rs.getValue(rs.columns[22]) : '',
          quantity_week19: rs.getValue(rs.columns[23]) ? rs.getValue(rs.columns[23]) : '',
          quantity_week20: rs.getValue(rs.columns[24]) ? rs.getValue(rs.columns[24]) : '',
          quantity_week21: rs.getValue(rs.columns[25]) ? rs.getValue(rs.columns[25]) : '',
          quantity_week22: rs.getValue(rs.columns[26]) ? rs.getValue(rs.columns[26]) : '',
          quantity_week23: rs.getValue(rs.columns[27]) ? rs.getValue(rs.columns[27]) : '',
          quantity_week24: rs.getValue(rs.columns[28]) ? rs.getValue(rs.columns[28]) : '',
          quantity_week25: rs.getValue(rs.columns[29]) ? rs.getValue(rs.columns[29]) : '',
          quantity_week26: rs.getValue(rs.columns[30]) ? rs.getValue(rs.columns[30]) : '',
          quantity_week27: rs.getValue(rs.columns[31]) ? rs.getValue(rs.columns[31]) : '',
          quantity_week28: rs.getValue(rs.columns[32]) ? rs.getValue(rs.columns[32]) : '',
          quantity_week29: rs.getValue(rs.columns[33]) ? rs.getValue(rs.columns[33]) : '',
          quantity_week30: rs.getValue(rs.columns[34]) ? rs.getValue(rs.columns[34]) : '',
          quantity_week31: rs.getValue(rs.columns[35]) ? rs.getValue(rs.columns[35]) : '',
          quantity_week32: rs.getValue(rs.columns[36]) ? rs.getValue(rs.columns[36]) : '',
          quantity_week33: rs.getValue(rs.columns[37]) ? rs.getValue(rs.columns[37]) : '',
          quantity_week34: rs.getValue(rs.columns[38]) ? rs.getValue(rs.columns[38]) : '',
          quantity_week35: rs.getValue(rs.columns[39]) ? rs.getValue(rs.columns[39]) : '',
          quantity_week36: rs.getValue(rs.columns[40]) ? rs.getValue(rs.columns[40]) : '',
          quantity_week37: rs.getValue(rs.columns[41]) ? rs.getValue(rs.columns[41]) : '',
          quantity_week38: rs.getValue(rs.columns[42]) ? rs.getValue(rs.columns[42]) : '',
          quantity_week39: rs.getValue(rs.columns[43]) ? rs.getValue(rs.columns[43]) : '',
          quantity_week40: rs.getValue(rs.columns[44]) ? rs.getValue(rs.columns[44]) : '',
          quantity_week41: rs.getValue(rs.columns[45]) ? rs.getValue(rs.columns[45]) : '',
          quantity_week42: rs.getValue(rs.columns[46]) ? rs.getValue(rs.columns[46]) : '',
          quantity_week43: rs.getValue(rs.columns[47]) ? rs.getValue(rs.columns[47]) : '',
          quantity_week44: rs.getValue(rs.columns[48]) ? rs.getValue(rs.columns[48]) : '',
          quantity_week45: rs.getValue(rs.columns[49]) ? rs.getValue(rs.columns[49]) : '',
          quantity_week46: rs.getValue(rs.columns[50]) ? rs.getValue(rs.columns[50]) : '',
          quantity_week47: rs.getValue(rs.columns[51]) ? rs.getValue(rs.columns[51]) : '',
          quantity_week48: rs.getValue(rs.columns[52]) ? rs.getValue(rs.columns[52]) : '',
          quantity_week49: rs.getValue(rs.columns[53]) ? rs.getValue(rs.columns[53]) : '',
          quantity_week50: rs.getValue(rs.columns[54]) ? rs.getValue(rs.columns[54]) : '',
          quantity_week51: rs.getValue(rs.columns[55]) ? rs.getValue(rs.columns[55]) : '',
          quantity_week52: rs.getValue(rs.columns[56]) ? rs.getValue(rs.columns[56]) : '',
          quantity_week53: rs.getValue(rs.columns[59]) ? rs.getValue(rs.columns[59]) : '',
          item_leve: rs.getValue(rs.columns[57]), // 产品分级
          itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
        });
        sku_arrys.push(rs.getValue(rs.columns[2]));
        acc_skus[rs.getValue(rs.columns[2])+"."+rs.getValue(rs.columns[0])] = rs.getValue(rs.columns[0]);  // sku +acc 
      });
    }
    
    
    // 库存量
    var location_quantity = [],temporary_arr = [];
    search.create({
      type: 'item',
      filters: [
        { name: 'inventorylocation', operator: 'anyof', values: location },
        { name: 'internalid', operator: 'anyof', values: sku_arrys }
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
          });
          temporary_arr.push(rec.id);
        }
      })
      return true;
    })

    if (location_quantity.length > 0) {
      for (var i = 0; i < SKUIds.length; i++) {
        for (var a = 0; a < location_quantity.length; a++) {
          if (SKUIds[i]['item_sku'] == location_quantity[a]['item_id']) {
            item_data.push({
              item_sku: SKUIds[i]['item_sku'],
              item_sku_text: SKUIds[i]['item_sku_name'],
              item_name: SKUIds[i]['item_name'],
              account: SKUIds[i]['forecast_account'],
              account_text: SKUIds[i]['forecast_account_name'],
              site: SKUIds[i]['forecast_site'],
              data_type: '2',
              data_type_text: '店铺库存量',
              location_no: location_quantity[a]['difference_qt']
            });
          }else {
            if (temporary_arr.indexOf(SKUIds[i]['item_sku']) == -1) {
              log.debug('item_sku', SKUIds[i]['item_sku'])
              item_data.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '2',
                data_type_text: '店铺库存量',
                location_no: 0
              });
              temporary_arr.push(SKUIds[i]['item_sku']);
            }
          }
        }
      }
    }else{
      for(var i = 0; i < SKUIds.length; i++){
            item_data.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '2',
                data_type_text: '店铺库存量',
                item_leve : SKUIds[i]['item_leve'],//产品分级
                itemf_leve :  SKUIds[i]['itemf_leve'],//产品初始分级
                location_no: 0
            });
     }
    }

    item_data = GetPredictionData(item_data, ['11'], today, account, skuids ,SKUIds, {data_type: '11',data_type_text: '调拨在途量'},week_rs,nowPage,acc_skus,pageSize); // 11在途量
    item_data = GetPredictionData(item_data, ['3'], today, account, skuids ,SKUIds, {data_type: '3',data_type_text: '店铺净需求'},week_rs,nowPage,acc_skus,pageSize); // 3 净需求

    // 调拨计划量
    var item_arr = []
    search.create({
      type: 'item',
      filters: [
        { name: 'internalid', operator: 'is', values: skuids }
      ],
      columns: [
        { name: 'custitem_dps_transport'}
      ]
    }).run().each(function (rec) {
      item_arr.push({
        item_id: rec.id,
        dps_transport: rec.getValue('custitem_dps_transport')
      });
      return true;
    });

    if (item_arr.length > 0) {
      item_arr.map(function (line) {
        SKUIds.map(function (li) {
          if (line.dps_transport) {
            search.create({
              type: 'customrecord_logistics_cycle',
              filters: [
                { name: 'custrecord_default_type_shipping', operator: 'is', values: line.dps_transport }
              ],
              columns: [
                'custrecord_prescription'
              ]
            }).run().each(function (rec) {
              var need_time = Number(rec.getValue('custrecord_prescription'));
              if (li.item_sku == line.item_id) {
                item_data.push({
                  item_sku: li.item_sku,
                  item_sku_text: li.item_sku_name,
                  item_name: li.item_name,
                  account: li.forecast_account,
                  account_text: li.forecast_account_name,
                  site: li.forecast_site,
                  item_leve:li.item_leve,
                  itemf_leve:li.itemf_leve,
                  data_type: '5',
                  data_type_text: '调拨计划量',
                  need_time: need_time
                });
              }
            })
          } else {
            if (li.item_sku == line.item_id) {
              item_data.push({
                item_sku: li.item_sku,
                item_sku_text: li.item_sku_name,
                item_name: li.item_name,
                account: li.forecast_account,
                account_text: li.forecast_account_name,
                site: li.forecast_site,
                data_type: '5',
                data_type_text: '调拨计划量',
                item_leve:li.item_leve,
                itemf_leve:li.itemf_leve,
                need_time: ''
              });
            }
          }
        });
      });
    }
    // 22 先查有没有修改的调拨计划量，没有就等于计划量
    item_data = GetPredictionData(item_data, ['22'], today, account, skuids, SKUIds, {data_type: '6',data_type_text: '修改调拨计划量'},week_rs,nowPage,acc_skus,pageSize);

    var result = item_data;
   
    var zl = 0, data_arr = [],weekArray = [],week;
    for(var key in acc_skus){
    for (var z = 0; z < SKUIds.length; z++) {
      var need1_zl, need2_zl, need3_zl,need4_zl;
      for (var a = 0; a < result.length; a++) {
        if (SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']
        && key.split(".")[0]  == SKUIds[z]['item_sku'] 
        && acc_skus[key] == SKUIds[z]['forecast_account']
        ) {
          var data_type = result[a].data_type_text;
          var sku = result[a].item_sku;
          var item_sku_text = result[a].item_sku_text;
          var item_name = result[a].item_name;
          var store_name = result[a].account_text;
          var item_leve = result[a].item_leve;
          var itemf_leve = result[a].itemf_leve;
          if (result[a]['data_type'] == 1) { // 需求量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                      ff=wek -1;
              week = 'W' + ff;
              weekArray.push({week: week,qty:Math.round( result[a]['quantity_week' + wek] )? result[a]['quantity_week' + wek] : '0'});
            })
            need1_zl = a;
          }
          if (result[a]['data_type'] == 2) { // 店铺库存量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              if (wek== week_rs[0]) {
                  weekArray.push({week: week,qty: Math.round( result[a]['location_no'])?Math.round( result[a]['location_no']):"0"});
              }else {
                // 取店铺静需求量的负数
                var x3 = - (need4_zl || need4_zl == 0 ?  Math.round(result[need4_zl]['quantity_week' + (wek - 1)])?Math.round(result[need4_zl]['quantity_week' + (wek - 1)]):0 : 0);
                weekArray.push({week: week,qty: x3.toString()});
              }
            })
            need2_zl = a;
          }
          if (result[a]['data_type'] == 11) { // 调拨在途量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
                weekArray.push({week: week,qty: Math.round(result[a]['quantity_week' +wek]) ?Math.round(result[a]['quantity_week' +wek]):"0"});
            })
            need3_zl = a;
          }
          if (result[a]['data_type'] == 3) { // 店铺净需求量
            weekArray = []
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
                weekArray.push({week: week,qty: Math.round( result[a]['quantity_week' + wek] )? result[a]['quantity_week' + wek] : '0'});
                var dk = data_arr[zl - 2]['weekArray'][wek -week_rs[0] ]['qty']; // 净需求的前两行是库存
                // 查看店铺库存量是否为0，为零则需要设置净需求的负数
                if (dk == 0) {
                  data_arr[zl - 2]['weekArray'][wek -week_rs[0]]['qty'] =(- Math.round(result[a]['quantity_week'+(wek-1)] ?result[a]['quantity_week'+(wek-1)] :0)).toFixed(0);
                }
            })
            need4_zl = zl;
          }
          if (result[a]['data_type'] == 5) { // 调拨计划量5 
            weekArray = [];
            var need_today = new Date(+new Date() + 8 * 3600 * 1000 - result[a]['need_time'] * 24 * 3600 * 1000);
            var need_week_today = getWeek(need_today,func_type);
            var week_today = getWeek(new Date(+new Date() + 8 * 3600 * 1000),func_type);
            var cc = week_today - need_week_today;
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff; 
              var x1 = need4_zl || need4_zl == 0 ? data_arr[need4_zl]['weekArray'][wek - week_rs[0]]['qty' + (Number(wek) + Number(cc))] : 0;
              weekArray.push({week: week,qty: x1 ? x1 : '0'});
            })
            need5_zl = zl;
          }
          if (result[a]['data_type'] == 6) { // 修改调拨计划量6或者22
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              var x1 = need5_zl || need5_zl == 0 ? data_arr[need5_zl]['weekArray'][wek - week_rs[0]]['qty' + wek] : 0;
              weekArray.push({week: week,qty: x1 ? x1 : '0'});
            })
          }
          if (result[a]['data_type'] == 22) {   
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              weekArray.push({week: week,qty: result[a]['quantity_week' + wek]});
            })
          }

          var need_no = 0;
          if (result[a]['data_type'] == 3) { // 库存量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                    ff=wek -1;
              week = 'W' + ff;
              if (wek == week_rs[0]) {
                if (result[a]['location_no']) {
                  weekArray.push({week: week,qty: result[a]['location_no']});
                  need_no = result[a]['location_no'];
                }else {
                  weekArray.push({week: week,qty: '0'});
                }
              }else {
                var x1 = need_no;
                var x2;
                if (need2_zl || need2_zl == 0) {
                  if (result[need2_zl]['location_no'] == 0) {
                    x2 = 0;
                  }else {
                    x2 =  result[need2_zl]['location_no'];
                  }
                }else {
                  x2 = 0;
                }
                if (!x2) x2 = 0;
                var x3 = need1_zl || need1_zl == 0 ? result[need1_zl]['quantity_week' + wek] ? result[need1_zl]['quantity_week' + wek] : 0 : 0; // 需求量
                need_no = -(Number(x3) - (Number(x1) + Number(x2)));
                weekArray.push({week: week,qty: need_no});
              }
            })
            need3_zl = a;
          }
          zl++;
          // 最后得到的数据
          data_arr.push({
            store_name: store_name,
            sku: item_sku_text,
            item_name: item_name,
            data_type: data_type,
            item_leve: item_leve,
            itemf_leve: itemf_leve,
            weekArray: weekArray
          });
        }
      }
    }
    }
    var lineComObj = {};
    lineComObj['lines'] = data_arr;
    lineComObj['weekArrayHead'] = weekArray;
    log.debug('lineComObj:', lineComObj);

    return lineComObj;
  }

  /**
    * 查询结果 店铺供需,导出excel数据查询结果
    * @param {*} item 
    * @param {*} date_from 
    * @param {*} date_to 
    */
  function getResult_Demand (item, week_rs, func_type, account,nowPage,pageSize) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    var pageSize = 20; // 每页条数
    log.debug('today', today);
    var acc_skus = {},sku_arrys=[];
    var rsJson = {}, SKUIds = [], limit = 4000;
    var filters_sku = [],skuids = [],location = [];
    var lineComObj = {};
    if (item) {
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
        { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'},
        { name: 'custitem_product_grading', join: "custrecord_demand_forecast_item_sku" },  //分级
        { name: 'custitemf_product_grading', join: "custrecord_demand_forecast_item_sku" }, //初级分级
        { name: 'custrecord_aio_fbaorder_location' ,join:"custrecord_demand_forecast_account"},
      ]
    }).run().each(function (rec) {
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]),//产品分级
        itemf_leve: rec.getValue(rec.columns[5]),//产品初始分级
        location: rec.getValue(rec.columns[6]),
      });
      location.push(rec.getValue(rec.columns[6]));
      skuids.push(rec.getValue(rec.columns[0]));
      return --limit > 0;
    })
    log.debug('SKUIds', SKUIds);
    var item_data = [];
    //  // 1需求量  -  销售预测
    // item_data=GetPredictionData (item_data, 1, today, account, skuids, SKUIds, {data_type: '1',data_type_text: '需求预测'},week_rs,func_type);
      // 需求量 - > 销售预测
      var filters = [
        { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: 1 },
        { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
      ];
      if (account) {
        filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
      }
  
      filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids });
  
      if (site) {
        filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site });
      }
      var mySearch_demand_forecast = search.create({
        type: 'customrecord_demand_forecast',
        filters: filters,
        columns: cols
      });
   
      var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
        pageSize: pageSize
      });
      var totalCount = pageData_demand_forecast.count; // 总数
      var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
      if (totalCount == 0 && pageCount == 0) {
        lineComObj['lines'] = [];
        lineComObj['weekArrayHead'] = [];
        log.debug('lineComObj:', lineComObj);
        return lineComObj;
      } else {
        pageData_demand_forecast.fetch({
          index: Number(nowPage - 1)
        }).data.forEach(function (rs) {
          item_data.push({
            item_sku: rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : '',
            item_sku_text: rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : '',
            item_name: rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : '',
            account: rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : '',
            account_text: rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : '',
            site: rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : '',
            data_type: rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : '',
            data_type_text: rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : '',
            quantity_week1: rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : '',
            quantity_week2: rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : '',
            quantity_week3: rs.getValue(rs.columns[7]) ? rs.getValue(rs.columns[7]) : '',
            quantity_week4: rs.getValue(rs.columns[8]) ? rs.getValue(rs.columns[8]) : '',
            quantity_week5: rs.getValue(rs.columns[9]) ? rs.getValue(rs.columns[9]) : '',
            quantity_week6: rs.getValue(rs.columns[10]) ? rs.getValue(rs.columns[10]) : '',
            quantity_week7: rs.getValue(rs.columns[11]) ? rs.getValue(rs.columns[11]) : '',
            quantity_week8: rs.getValue(rs.columns[12]) ? rs.getValue(rs.columns[12]) : '',
            quantity_week9: rs.getValue(rs.columns[13]) ? rs.getValue(rs.columns[13]) : '',
            quantity_week10: rs.getValue(rs.columns[14]) ? rs.getValue(rs.columns[14]) : '',
            quantity_week11: rs.getValue(rs.columns[15]) ? rs.getValue(rs.columns[15]) : '',
            quantity_week12: rs.getValue(rs.columns[16]) ? rs.getValue(rs.columns[16]) : '',
            quantity_week13: rs.getValue(rs.columns[17]) ? rs.getValue(rs.columns[17]) : '',
            quantity_week14: rs.getValue(rs.columns[18]) ? rs.getValue(rs.columns[18]) : '',
            quantity_week15: rs.getValue(rs.columns[19]) ? rs.getValue(rs.columns[19]) : '',
            quantity_week16: rs.getValue(rs.columns[20]) ? rs.getValue(rs.columns[20]) : '',
            quantity_week17: rs.getValue(rs.columns[21]) ? rs.getValue(rs.columns[21]) : '',
            quantity_week18: rs.getValue(rs.columns[22]) ? rs.getValue(rs.columns[22]) : '',
            quantity_week19: rs.getValue(rs.columns[23]) ? rs.getValue(rs.columns[23]) : '',
            quantity_week20: rs.getValue(rs.columns[24]) ? rs.getValue(rs.columns[24]) : '',
            quantity_week21: rs.getValue(rs.columns[25]) ? rs.getValue(rs.columns[25]) : '',
            quantity_week22: rs.getValue(rs.columns[26]) ? rs.getValue(rs.columns[26]) : '',
            quantity_week23: rs.getValue(rs.columns[27]) ? rs.getValue(rs.columns[27]) : '',
            quantity_week24: rs.getValue(rs.columns[28]) ? rs.getValue(rs.columns[28]) : '',
            quantity_week25: rs.getValue(rs.columns[29]) ? rs.getValue(rs.columns[29]) : '',
            quantity_week26: rs.getValue(rs.columns[30]) ? rs.getValue(rs.columns[30]) : '',
            quantity_week27: rs.getValue(rs.columns[31]) ? rs.getValue(rs.columns[31]) : '',
            quantity_week28: rs.getValue(rs.columns[32]) ? rs.getValue(rs.columns[32]) : '',
            quantity_week29: rs.getValue(rs.columns[33]) ? rs.getValue(rs.columns[33]) : '',
            quantity_week30: rs.getValue(rs.columns[34]) ? rs.getValue(rs.columns[34]) : '',
            quantity_week31: rs.getValue(rs.columns[35]) ? rs.getValue(rs.columns[35]) : '',
            quantity_week32: rs.getValue(rs.columns[36]) ? rs.getValue(rs.columns[36]) : '',
            quantity_week33: rs.getValue(rs.columns[37]) ? rs.getValue(rs.columns[37]) : '',
            quantity_week34: rs.getValue(rs.columns[38]) ? rs.getValue(rs.columns[38]) : '',
            quantity_week35: rs.getValue(rs.columns[39]) ? rs.getValue(rs.columns[39]) : '',
            quantity_week36: rs.getValue(rs.columns[40]) ? rs.getValue(rs.columns[40]) : '',
            quantity_week37: rs.getValue(rs.columns[41]) ? rs.getValue(rs.columns[41]) : '',
            quantity_week38: rs.getValue(rs.columns[42]) ? rs.getValue(rs.columns[42]) : '',
            quantity_week39: rs.getValue(rs.columns[43]) ? rs.getValue(rs.columns[43]) : '',
            quantity_week40: rs.getValue(rs.columns[44]) ? rs.getValue(rs.columns[44]) : '',
            quantity_week41: rs.getValue(rs.columns[45]) ? rs.getValue(rs.columns[45]) : '',
            quantity_week42: rs.getValue(rs.columns[46]) ? rs.getValue(rs.columns[46]) : '',
            quantity_week43: rs.getValue(rs.columns[47]) ? rs.getValue(rs.columns[47]) : '',
            quantity_week44: rs.getValue(rs.columns[48]) ? rs.getValue(rs.columns[48]) : '',
            quantity_week45: rs.getValue(rs.columns[49]) ? rs.getValue(rs.columns[49]) : '',
            quantity_week46: rs.getValue(rs.columns[50]) ? rs.getValue(rs.columns[50]) : '',
            quantity_week47: rs.getValue(rs.columns[51]) ? rs.getValue(rs.columns[51]) : '',
            quantity_week48: rs.getValue(rs.columns[52]) ? rs.getValue(rs.columns[52]) : '',
            quantity_week49: rs.getValue(rs.columns[53]) ? rs.getValue(rs.columns[53]) : '',
            quantity_week50: rs.getValue(rs.columns[54]) ? rs.getValue(rs.columns[54]) : '',
            quantity_week51: rs.getValue(rs.columns[55]) ? rs.getValue(rs.columns[55]) : '',
            quantity_week52: rs.getValue(rs.columns[56]) ? rs.getValue(rs.columns[56]) : '',
            quantity_week53: rs.getValue(rs.columns[59]) ? rs.getValue(rs.columns[59]) : '',
            item_leve: rs.getValue(rs.columns[57]), // 产品分级
            itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
          })
           sku_arrys.push(rs.getValue(rs.columns[2]));
           acc_skus[rs.getValue(rs.columns[2])+"."+rs.getValue(rs.columns[0]) ] = rs.getValue(rs.columns[0]);  // sku +acc 
        });
      }
    // 在途量 (数据源：to单)
    var transit_num = [];
    search.create({
      type: 'transferorder',
      filters: [
        { join: 'item', name: 'internalid', operator: 'is', values: sku_arrys },
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
      log.debug('result', result.id);
      log.debug('custbodyexpected_arrival_time', result.getValue('custbodyexpected_arrival_time'));
      SKUIds.map(function (line) {
        if (line.item_sku == result.getValue('item') && line.location == result.getValue('transferlocation')) {
          if (result.getValue('custbodyexpected_arrival_time')) {
            var item_date = format.parse({ value: result.getValue('custbodyexpected_arrival_time'), type: format.Type.DATE});
            var item_time =  getWeek(item_date,func_type);
            transit_num.push({
              item_id: result.getValue('item'),
              item_time: item_time,
              item_quantity: result.getValue('quantity')
            });
          }
        }
      });
      return true;
    })
    log.debug('transit_num', transit_num);
    var b = []; // 记录数组a中的id 相同的下标
    if (transit_num.length > 0) {
      for (var i = 0; i < transit_num.length;i++) {
        for (var j = transit_num.length - 1;j > i;j--) {
          if (transit_num[i].item_id == transit_num[j].item_id && transit_num[i].item_time == transit_num[j].item_time) {
            transit_num[i].item_quantity = (transit_num[i].item_quantity * 1 + transit_num[j].item_quantity * 1).toString();
            b.push(j);
          }
        }
      }
      for (var k = 0; k < b.length;k++) {
        transit_num.splice(b[k], 1);
      }
    }

    log.debug('transit_num1', transit_num);
    var need_transit_num = [];
    var po_no = [];
    if (transit_num.length > 0) {
      for (var i = 0; i < transit_num.length; i++) {
        if (po_no.indexOf(transit_num[i]['item_id']) === -1) {
          need_transit_num.push({
            item_id: transit_num[i]['item_id'],
            lineItems: [{
              item_time: transit_num[i].item_time,
              item_quantity: transit_num[i].item_quantity
            }]
          });
        } else {
          for (var j = 0; j < need_transit_num.length; j++) {
            if (need_transit_num[j].item_id == transit_num[i].item_id) {
              need_transit_num[j].lineItems.push({
                item_time: transit_num[i].item_time,
                item_quantity: transit_num[i].item_quantity
              });
              break;
            }
          }
        }
        po_no.push(transit_num[i]['item_id']);
      }
    }
    log.debug('need_transit_num', need_transit_num);

    if (need_transit_num.length > 0) {
      for (var a = 0; a < need_transit_num.length; a++) {
        for (var i = 0; i < SKUIds.length; i++) {
          if (SKUIds[i]['item_sku'] == need_transit_num[a]['item_id']) {
            item_data.push({
              item_sku: SKUIds[i]['item_sku'],
              item_sku_text: SKUIds[i]['item_sku_name'],
              item_name: SKUIds[i]['item_name'],
              account: SKUIds[i]['forecast_account'],
              account_text: SKUIds[i]['forecast_account_name'],
              site: SKUIds[i]['forecast_site'],
              item_leve:SKUIds[i]['item_leve'],
              itemf_leve:SKUIds[i]['itemf_leve'],
              data_type: '2',
              data_type_text: '调拨在途量',
              transit_no: need_transit_num[a]['lineItems']
            });
          }else {
            if (po_no.indexOf(SKUIds[i]['item_sku']) == -1) {
              item_data.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                item_leve:SKUIds[i]['item_leve'],
                itemf_leve:SKUIds[i]['itemf_leve'],
                data_type: '2',
                data_type_text: '调拨在途量',
                transit_no: 0
              });
              po_no.push(SKUIds[i]['item_sku']);
            }
          }
        }
      }
    }else {
      SKUIds.map(function (line) {
        item_data.push({
          item_sku: line.item_sku,
          item_sku_text: line.item_sku_name,
          item_name: line.item_name,
          account: line.forecast_account,
          account_text: line.forecast_account_name,
          site: line.forecast_site,
          data_type: '2',
          data_type_text: '调拨在途量',
          item_leve:line.item_leve,
          itemf_leve: line.itemf_leve,
          transit_no: 0
        });
      });
    }

    // 库存量
    var location_quantity = [],temporary_arr = [];
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
          });
        }
        temporary_arr.push(rec.id);
      })
      return true;
    })
    log.debug('location_quantity', location_quantity);

    if (location_quantity.length > 0) {
      for (var i = 0; i < SKUIds.length; i++) {
        for (var a = 0; a < location_quantity.length; a++) {
          if (SKUIds[i]['item_sku'] == location_quantity[a]['item_id']) {
            item_data.push({
              item_sku: SKUIds[i]['item_sku'],
              item_sku_text: SKUIds[i]['item_sku_name'],
              item_name: SKUIds[i]['item_name'],
              account: SKUIds[i]['forecast_account'],
              account_text: SKUIds[i]['forecast_account_name'],
              site: SKUIds[i]['forecast_site'],
              data_type: '3',
              data_type_text: '店铺库存量',
              location_no: location_quantity[a]['difference_qt']
            });
          }else {
            if (temporary_arr.indexOf(SKUIds[i]['item_sku']) == -1) {
              item_data.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '3',
                data_type_text: '店铺库存量',
                location_no: 0
              });
              temporary_arr.push(SKUIds[i]['item_sku']);
            }
          }
        }
      }
    }else {
      SKUIds.map(function (line) {
        item_data.push({
          item_sku: line.item_sku,
          item_sku_text: line.item_sku_name,
          item_name: line.item_name,
          account: line.forecast_account,
          account_text: line.forecast_account_name,
          site: line.forecast_site,
          data_type: '3',
          data_type_text: '店铺库存量',
          location_no: 0
        });
      });
    }
    // 店铺净需求

    SKUIds.map(function (line) {
      item_data.push({
        item_sku: line.item_sku,
        item_sku_text: line.item_sku_name,
        item_name: line.item_name,
        account: line.forecast_account,
        account_text: line.forecast_account_name,
        site: line.forecast_site,
        item_leve:line.item_leve,
        itemf_leve: line.itemf_leve,
        data_type: '4',
        data_type_text: '店铺净需求'
      });
    });


     // 23 修改净需求量
     item_data=GetPredictionData (item_data, "23", today, account, skuids, SKUIds, {data_type: '23',data_type_text: '修改净需求量'},week_rs,nowPage,acc_skus,pageSize);

    var result = item_data;
    // 1 销售预测 ,2 在途量， 3 库存量，4 净需求量，23修改净需求
    var zl = 0, data_arr = [],weekArray = [],week;
    for(var key in acc_skus){
    for (var z = 0; z < SKUIds.length; z++) {
      var need1_zl, need2_zl, need3_zl;
      for (var a = 0; a < result.length; a++) {
        if (SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account']
        && key.split(".")[0]  == SKUIds[z]['item_sku'] 
        && acc_skus[key] == SKUIds[z]['forecast_account']
        ) {
          var data_type = result[a].data_type_text;
          var sku = result[a].item_sku;
          var item_sku_text = result[a].item_sku_text;
          var item_name = result[a].item_name;
          var store_name = result[a].account_text;
          var item_leve = result[a].item_leve;
          var itemf_leve = result[a].itemf_leve;

          if (result[a]['data_type'] == 1) { // 需求量
            weekArray = [];
            week_rs.map(function(wek){
                var ff = wek;
                if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                        ff=wek -1;
              week = 'W' + ff;
              weekArray.push({week: week,qty: result[a]['quantity_week' + wek] ? result[a]['quantity_week' + wek].split(" ")[1] : '0'});
            });
            need1_zl = a
            zl++
          }
          if (result[a]['data_type'] == 4 || result[a]['data_type'] == 23) { // 店铺净需求4  //修改净需求量23
            weekArray = []
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                      ff=wek -1;
            week = 'W' + ff;
              var x1 = need1_zl || need1_zl == 0 ? result[need1_zl]['quantity_week' + wek] ? result[need1_zl]['quantity_week' + wek].split(" ")[1] : 0 : 0; // 需求量
              var x2
              if (need2_zl || need2_zl == 0) {
                log.debug('result[need2_zl] - > need2_zl', result[need2_zl])
                if (result[need2_zl]['transit_no'] == 0)
                  x2 = 0
                else
                  result[need2_zl]['transit_no'].map(function (trl) {
                    if (trl.item_time == wek) {
                      x2 = trl.item_quantity
                    }
                  })
              }else {
                x2 = 0
              }
              if (!x2) x2 = 0
              var x3 = need3_zl || need3_zl == 0 ? result[need3_zl]['quantity_week' + wek] ? result[need3_zl]['quantity_week' + wek] : 0 : 0; // 库存量
              var x4 = Number(x1) - (Number(x3) + Number(x2))
              weekArray.push({week: week,qty: x4 })
            })
            zl++
          }

          if (result[a]['data_type'] == 2) { // 调拨在途量
            var transit_no = result[a]['transit_no']
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                      ff=wek -1;
              week = 'W' + ff;
              if (transit_no.length > 0) {
                var line_arr = [];
                var quan_item = 0;
                transit_no.map(function (l) {
                  if (l.item_time == wek) {
                    quan_item = l.item_quantity;
                    weekArray.push({week: week,qty: quan_item });
                  }
                  line_arr.push(l.item_time);
                })
                if (line_arr.indexOf(wek) == -1) {
                  weekArray.push({week: week,qty: '0' });
                }
              }else {
                weekArray.push({week: week,qty: '0' });
              }
            });
            need2_zl = a;
            zl++;
          }

          var need_no = 0;
          if (result[a]['data_type'] == 3) { // 库存量
            weekArray = [];
            week_rs.map(function(wek){
              var ff = wek;
              if(func_type  == "B" && wek < week_rs[0]) //跨年，明年的第一周不要
                      ff=wek -1;
              week = 'W' + ff;
              if (wek == week_rs[0]) {
                if (result[a]['location_no']) {
                  weekArray.push({week: week,qty: result[a]['location_no']});
                  need_no = result[a]['location_no'];
                }else {
                  weekArray.push({week: week,qty: '0'});
                }
              }else {
                var x1 = need_no;
                var x2;
                if (need2_zl || need2_zl == 0) {
                  log.debug('result[need2_zl]transit_no', result[need2_zl]);
                  if (result[need2_zl]['transit_no'] == 0) {
                    x2 = 0;
                  }else {
                    result[need2_zl]['transit_no'].map(function (trl) {
                      if (trl.item_time == wek) {
                        x2 = trl.item_quantity;
                      }
                    });
                  }
                }else {
                  x2 = 0;
                }
                if (!x2) x2 = 0;
                var x3 = need1_zl || need1_zl == 0 ? result[need1_zl]['quantity_week' + wek] ? result[need1_zl]['quantity_week' + wek] : 0 : 0; // 需求量
                need_no = -(Number(x3) - (Number(x1) + Number(x2)));
                weekArray.push({week: week,qty: need_no});
              }
            });
            need3_zl = a;
            zl++;
          }
          // 最后得到的数据
          data_arr.push({
            store_name: store_name,
            sku: item_sku_text,
            item_name: item_name,
            data_type: data_type,
            item_leve: item_leve,
            itemf_leve: itemf_leve,
            weekArray: weekArray
          });
        }
      }
    }
  }
  
    lineComObj['lines'] = data_arr;
    lineComObj['weekArrayHead'] = weekArray;
    log.debug('lineComObj:', lineComObj);

    return lineComObj;
  }
  
    /**
     * 判断某一日属于这一年的第几周
     * @param {*} data 
     */
    function weekofday(data, date_from, date_to) {
      log.debug("date_from:" + date_from, date_to);
      var weeks = [],dat_from,dat_to ,func_type;
      // //获取年份
      var YearDer_to = date_to.getFullYear() - data.getFullYear();
      if (YearDer_to > 0) {//跨明年
          log.debug("跨明年");
          //如果跨年了，判断明年的第一天是星期几
          //是周 5、6、7，这几天，归为今年的是最后一周
          var y = date_to.getFullYear();
          var dd = "1/1/" + y;
          dd = new Date(dd);
          if(dd.getDay() > 4|| dd.getDay() == 0){
              //并且 明年的 第一周归为去年的 最后一周 ，就是明年的第一周不要了
              dat_from = getWeek(date_from)
              for(var i=dat_from;i<=53;i++){
                  weeks.push(i) 
              }

              dat_to = getWeek(date_to);
              for(var i=2;i<=dat_to;i++){
                  weeks.push(i) 
              }
              func_type = "B"
          }else{
              //否则 去年的最后一周归为明年的第一周，就是去年的最后一周不要了
              dat_from = getWeek(date_from)
              for(var i=dat_from;i<=52;i++){
                  weeks.push(i) 
              }

              dat_to = getWeek(date_to);
              for(var i=1;i<=dat_to;i++){
                  weeks.push(i) 
              }
              func_type = "C"
          }

      } else {
          log.debug("不跨明年？0,", YearDer_to);
          dat_to = getWeek(date_to);
          dat_from = getWeek(date_from);
          for(var i=dat_from;i<=dat_to;i++){
              weeks.push(i) 
          }
          func_type = "A"
      }
      log.debug("weeks ",weeks);
      return {"weeks":weeks,"func_type":func_type} ;
  }

  function getWeek(day,func_type) {
      var d1 = new Date(day);
      var d2 = new Date(day);
      d2.setMonth(0);
      d2.setDate(1);
      var numweekf = d2.getDay();
      var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
      var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
      var num = Math.ceil(days / 7);
      if(func_type == "B" && num == 1){
          num = 53
      }else if(func_type == "C" && num == 53){
          num = 1
      }
      return num;
  }
   /**  
   * 搜索销售预测数据
   */
  function GetPredictionData (item_data, datatype, today, account, skuids, SKUIds, params,week_rs,Double,nowPage,acc_skus,pageSize) {
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: datatype },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }
    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids })
    var cols= [
        { name:'custrecord_demand_forecast_account'},
        { name:'custrecord_demand_forecast_site'},
        { name:'custrecord_demand_forecast_item_sku'},
        { name: 'custitem_dps_skuchiense',join:"custrecord_demand_forecast_item_sku"},
        { name:'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week1' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week2' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week3' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week4' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week5' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week6' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week7' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week8' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week9' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week10' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week11' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week12' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week13' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week14' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week15' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week16' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week17' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week18' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week19' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week20' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week21' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week22' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week23' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week24' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week25' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week26' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week27' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week28' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week29' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week30' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week31' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week32' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week33' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week34' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week35' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week36' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week37' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week38' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week39' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week40' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week41' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week42' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week43' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week44' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week45' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week46' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week47' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week48' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week49' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week50' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week51' , join: 'custrecord_demand_forecast_parent'},
        { name:'custrecord_quantity_week52' , join: 'custrecord_demand_forecast_parent'},
        { name: 'custitem_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品分级
        { name: 'custitemf_product_grading',join:"custrecord_demand_forecast_item_sku"}, //产品初始分级
        { name:'custrecord_quantity_week53' , join: 'custrecord_demand_forecast_parent'},
    ]
    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    });
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: pageSize
    });
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
    if(pageCount ==0 && Double ) {
    
      //调拨计划量  ，取自修改的调拨计划量
      var filters = [
          { name : 'custrecord_demand_forecast_l_data_type', join:'custrecord_demand_forecast_parent', operator:'anyof', values: [ params.data_type] },
          { name : 'custrecord_demand_forecast_l_date', join:'custrecord_demand_forecast_parent', operator:'on', values: today },
      ];

      if (account) {
          filters.push({ name: "custrecord_demand_forecast_account", operator: "anyof", values: account });
      }

      filters.push({ name: "custrecord_demand_forecast_item_sku", operator: "anyof", values: skuids });
    
      var mySearch_delivery_schedule = search.create({
          type: "customrecord_demand_forecast",
          filters: filters,
          columns:cols
      });
      pageData_demand_forecast = mySearch_delivery_schedule.runPaged({
          pageSize: pageSize
      });
       totalCount = pageData_demand_forecast.count; //总数
       pageCount = pageData_demand_forecast.pageRanges.length; //页数
    }
    log.audit("pageCount",pageCount)
    log.audit("totalCount",totalCount)
    log.audit("skuids",skuids)
    var item_data16 = [];
    if (totalCount == 0 && pageCount == 0) {
        SKUIds.map(function (line) {
          item_data.push({
            item_sku: line.item_sku,
            item_sku_text: line.item_sku_name,
            item_name: line.item_name,
            account: line.forecast_account,
            account_text: line.forecast_account_name,
            site: line.forecast_site,
            data_type: params.data_type,
            data_type_text: params.data_type_text,
            item_leve: line.item_leve,
            itemf_leve: line.itemf_leve,
          });
        });
    } else {
      pageData_demand_forecast.fetch({
        index: Number(nowPage - 1 ) 
      }).data.forEach(function (rs) {
        for(var key_acc in acc_skus){
            if(rs.getValue(rs.columns[2]) == key_acc.split(".")[0] && rs.getValue(rs.columns[0]) == key_acc.split(".")[1]){
                item_data.push({
                    item_sku:rs.getValue(rs.columns[2]),
                    item_sku_text: rs.getText(rs.columns[2]),
                    item_name: rs.getValue(rs.columns[3]),
                    account: rs.getValue(rs.columns[0]),
                    account_text: rs.getText(rs.columns[0]),
                    site: rs.getValue(rs.columns[1]),
                    data_type: rs.getValue(rs.columns[4]),
                    data_type_text: rs.getText(rs.columns[4]),
                    item_leve : rs.getValue(rs.columns[57]),//产品分级
                    itemf_leve : rs.getValue(rs.columns[58]),//产品初始分级
                    quantity_week1: rs.getValue(rs.columns[5]),
                    quantity_week2: rs.getValue(rs.columns[6]),
                    quantity_week3: rs.getValue(rs.columns[7]),
                    quantity_week4: rs.getValue(rs.columns[8]),
                    quantity_week5: rs.getValue(rs.columns[9]),
                    quantity_week6: rs.getValue(rs.columns[10]),
                    quantity_week7: rs.getValue(rs.columns[11]),
                    quantity_week8: rs.getValue(rs.columns[12]),
                    quantity_week9: rs.getValue(rs.columns[13]),
                    quantity_week10: rs.getValue(rs.columns[14]),
                    quantity_week11: rs.getValue(rs.columns[15]),
                    quantity_week12: rs.getValue(rs.columns[16]),
                    quantity_week13: rs.getValue(rs.columns[17]),
                    quantity_week14: rs.getValue(rs.columns[18]),
                    quantity_week15: rs.getValue(rs.columns[19]),
                    quantity_week16: rs.getValue(rs.columns[20]),
                    quantity_week17: rs.getValue(rs.columns[21]),
                    quantity_week18: rs.getValue(rs.columns[22]),
                    quantity_week19: rs.getValue(rs.columns[23]),
                    quantity_week20: rs.getValue(rs.columns[24]),
                    quantity_week21: rs.getValue(rs.columns[25]),
                    quantity_week22: rs.getValue(rs.columns[26]),
                    quantity_week23: rs.getValue(rs.columns[27]),
                    quantity_week24: rs.getValue(rs.columns[28]),
                    quantity_week25: rs.getValue(rs.columns[29]),
                    quantity_week26: rs.getValue(rs.columns[30]),
                    quantity_week27: rs.getValue(rs.columns[31]),
                    quantity_week28: rs.getValue(rs.columns[32]),
                    quantity_week29: rs.getValue(rs.columns[33]),
                    quantity_week30: rs.getValue(rs.columns[34]),
                    quantity_week31: rs.getValue(rs.columns[35]),
                    quantity_week32: rs.getValue(rs.columns[36]),
                    quantity_week33: rs.getValue(rs.columns[37]),
                    quantity_week34: rs.getValue(rs.columns[38]),
                    quantity_week35: rs.getValue(rs.columns[39]),
                    quantity_week36: rs.getValue(rs.columns[40]),
                    quantity_week37: rs.getValue(rs.columns[41]),
                    quantity_week38: rs.getValue(rs.columns[42]),
                    quantity_week39: rs.getValue(rs.columns[43]),
                    quantity_week40: rs.getValue(rs.columns[44]),
                    quantity_week41: rs.getValue(rs.columns[45]),
                    quantity_week42: rs.getValue(rs.columns[46]),
                    quantity_week43: rs.getValue(rs.columns[47]),
                    quantity_week44: rs.getValue(rs.columns[48]),
                    quantity_week45: rs.getValue(rs.columns[49]),
                    quantity_week46: rs.getValue(rs.columns[50]),
                    quantity_week47: rs.getValue(rs.columns[51]),
                    quantity_week48: rs.getValue(rs.columns[52]),
                    quantity_week49: rs.getValue(rs.columns[53]),
                    quantity_week50: rs.getValue(rs.columns[54]),
                    quantity_week51: rs.getValue(rs.columns[55]),
                    quantity_week52: rs.getValue(rs.columns[56]),
                    quantity_week53: rs.getValue(rs.columns[59]),
                    
                });
                item_data16.push(key_acc);
            }
        }
        
      })
      log.debug("item_data16",item_data16)
      for(var key_acc in acc_skus){
      if(item_data16.indexOf(key_acc) == -1 ){
          SKUIds.map(function(li){
              if(li.item_sku == key_acc.split(".")[0] && li.forecast_account == key_acc.split(".")[1]){
                  var objs =  {
                      item_sku: li.item_sku,
                      item_sku_text: li.item_sku_name,
                      item_name: li.item_name,
                      account: li.forecast_account,
                      account_text: li.forecast_account_name,
                      site: li.forecast_site,
                      data_type: params.data_type,
                      data_type_text:params.data_type_text,
                      item_leve : li['item_leve'],//产品分级
                      itemf_leve : li['itemf_leve'],//产品初始分级
                  };
                  for(var i=1;i<54;i++){
                      objs["quantity_week"+i] = "0";
                  }
                  item_data.push(objs);
              }
             
          });
       }
      }
    }
    
    return item_data;
  }


  /** 
     * 处理库存数据
     */
    function GetInventoryData(SKUIds,warehouse_stock,item_data,temporary_arr,ty,ty_txt){
      if(warehouse_stock.length > 0){
          SKUIds.map(function(line){
              warehouse_stock.map(function(li){
                  if(line.item_sku == li.item_id){
                      item_data.push({
                          item_sku: line.item_sku,
                          item_sku_text: line.item_sku_name,
                          item_name: line.item_name,
                          account: line.forecast_account,
                          account_text: line.forecast_account_name,
                          site: line.forecast_site,
                          data_type: ty,
                          data_type_text: ty_txt,
                          item_leve :line['item_leve'],//产品分级
                          itemf_leve : line['itemf_leve'],//产品初始分级
                          warehouse_quantity: li.item_quantity
                      });
                  }else{
                      if(temporary_arr.indexOf(line.item_sku) == -1){
                          item_data.push({
                              item_sku: line.item_sku,
                              item_sku_text: line.item_sku_name,
                              item_name: line.item_name,
                              account: line.forecast_account,
                              account_text: line.forecast_account_name,
                              site: line.forecast_site,
                              data_type:ty,
                              data_type_text: ty_txt,
                              item_leve :line['item_leve'],//产品分级
                              itemf_leve : line['itemf_leve'],//产品初始分级
                              warehouse_quantity: 0
                          });
                          temporary_arr.push(line.item_sku);
                      }
                  }
              })
          })
      }else{
          SKUIds.map(function(line){
              item_data.push({
                  item_sku: line.item_sku,
                  item_sku_text: line.item_sku_name,
                  item_name: line.item_name,
                  account: line.forecast_account,
                  account_text: line.forecast_account_name,
                  site: line.forecast_site,
                  data_type: ty,
                  data_type_text: ty_txt,
                  item_leve :line['item_leve'],//产品分级
                  itemf_leve : line['itemf_leve'],//产品初始分级
                  warehouse_quantity: '0'
              });
          })
      }
      return item_data
  }
  return {
    onRequest: onRequest
  }
})
