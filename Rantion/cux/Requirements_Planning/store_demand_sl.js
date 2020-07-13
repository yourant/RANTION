/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-06 17:27:17
 * @LastEditTime: 2020-05-09 14:46:48
 * @FilePath: \Rantion_sandbox\Rantion\cux\Requirements_Planning\store_demand_sl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', '../../Helper/Moment.min', 'N/format', 'N/runtime', 'N/record', 'N/log'], function (search, ui, moment, format, runtime, record, log) {
  var SKUIds = [], func_type ,week_rs,acc_skus = {},sku_arrys=[];
  function onRequest (context) {
    var response = context.response
    var request = context.request
    var method = request.method
    var params = request.parameters; // 参数

    // 在方法中去做UI的初始化并判断GET/POST
    showResult(method, params, response)
  }

  function showResult (method, params, response) {
    var form = initUI(); // 渲染查询条件UI界面

    // 设置查询参数默认值
    form.updateDefaultValues({
      custpage_account_store: params.custpage_account_store,
      custpage_item: params.custpage_item,
      custpage_date_from: params.custpage_date_from,
      custpage_date_to: params.custpage_date_to
    })

    var action = params.action
    if (method == 'POST') {
      params.custpage_now_page = 1
      form = getSearchData(form, params, response)
    } else {
      if (action == 'search') {
        form = getSearchData(form, params, response)
      }
    }
    response.writePage(form)
  }

  /**
  * 查询逻辑
  * 
  * @param form
  * @param status 状态
  * @param serialNumber   个案序列号
  * @returns
  */
  function getSearchData (form, params) {
    var nowPage = params.custpage_now_page ? params.custpage_now_page : 1
    // var nowPage =1
    // var pageSize = params.custpage_page_size ? params.custpage_page_size : 50; // 每页数量
    var pageSize = 10; // 每页数量
    var item = params.custpage_item;
    if (!params.custpage_date_from || !params.custpage_date_to) { // || (date_from_p > date_to_p)
      throw '请先输入正确的时间范围';
    }

    var date_from = format.parse({ value: params.custpage_date_from, type: format.Type.DATE });
    var date_to = format.parse({ value: params.custpage_date_to, type: format.Type.DATE });
    var site = params.custpage_site;
    var account = params.custpage_account_store;
    // format.parse({ value:params.custpage_date_from, type: format.Type.DATE})
    // format.parse({ value:params.custpage_date_to, type: format.Type.DATE})

    if (!date_from || !date_to || (date_from > date_to)) {
      throw '请先输入正确的时间范围';
    }
    var rsJson = getResult(item, date_from, date_to, pageSize, nowPage, site, account,form); // 查询结果
    if (rsJson) {
      var result = rsJson.result;
      var totalCount = rsJson.totalCount;
      var pageCount = rsJson.pageCount;
      var need_result = createLineData(form, result, date_from, date_to); // 创建行数据
      if (need_result) {
        try {
          createOrUpdateData(need_result, date_from, date_to)
        } catch (e) {
          log.debug('e', e)
        }
      }
      // 设置数据选择列表、当前页、总页数到界面
      setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result)
    } else {
      var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '店铺供需', tab: 'custpage_tab' })
      sublist.helpText = '店铺供需结果'
      sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT })
      sublist.addField({ id: 'custpage_store_name_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
      sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT })
      sublist.addField({ id: 'custpage_item_sku_id', label: 'sku_id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
      sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT })
      sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT })
      sublist.addField({ id: 'custpage_data_type_id', label: '数据类型id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    }

    return form
  }

  // 保存或更新店铺净需求信息
  function createOrUpdateData (need_result, date_from, date_to) {
    try {
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat)
      need_result.map(function (line) {
        var bill_id
        if (line.data_type == 2 || line.data_type == 11) { // 在途
          line.data_type = 11
        } else if (line.data_type == 5) { // 净需求
          line.data_type = 3
        }
        // else if (line.data_type == 5 ) {  //净需求
        //     line.data_type = 23
        // }
        search.create({
          type: 'customrecord_demand_forecast_child',
          filters: [
            { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_sku },
            { join: 'custrecord_demand_forecast_parent', name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id },
            { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: today },
            { name: 'custrecord_demand_forecast_l_data_type', operator: 'anyof', values: line.data_type }
          ]
        }).run().each(function (rec) {
          bill_id = rec.id
        })
        var child_bill_data
        if (bill_id) {
          child_bill_data = record.load({ type: 'customrecord_demand_forecast_child', id: bill_id })
          for (var s = 1; s < 54; s++) {
            var field_name = 'custrecord_quantity_week' + s
            line.item.map(function (li) {
              if (s == li.week) {
                child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity.toString() })
              }
            })
          }
          week_rs.map(function (wek) {
            var field_name = 'custrecord_quantity_week' + wek
            line.item.map(function (li) {
              if (wek == li.week) {
                child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity.toString()})
              }
            })
          })

          var ss = child_bill_data.save()
        } else {
          var need_today = new Date(+new Date() + 8 * 3600 * 1000)
          var forecast_id
          search.create({
            type: 'customrecord_demand_forecast',
            filters: [
              { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: line.item_sku },
              { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: line.account_id }
            ]
          }).run().each(function (rec) {
            forecast_id = rec.id
          })
          log.debug('forecast_id', forecast_id)
          child_bill_data = record.create({ type: 'customrecord_demand_forecast_child' })
          child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: need_today })
          child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: line.data_type })
          child_bill_data.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id })
          week_rs.map(function (wek) {
            var field_name = 'custrecord_quantity_week' + wek
            line.item.map(function (li) {
              if (wek == li.week) {
                child_bill_data.setValue({ fieldId: field_name, value: li.item_quantity.toString() })
              }
            })
          })
          var ss = child_bill_data.save()
        }
      })
    } catch (e) {
      log.debug('e', e)
    }
  }

  /**
  * 查询结果
  * @param {*} item 
  * @param {*} date_from 
  * @param {*} date_to 
  */
  function getResult (item, date_from, date_to, pageSize, nowPage, site, account,form) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);
    // 传入开始时间和结束时
    var week_objs = weekofday(new Date(+new Date() + 8 * 3600 * 1000), date_from, date_to);
    func_type = week_objs.func_type;
    week_rs = week_objs.weeks;
    var cols = [
      { name: 'custrecord_demand_forecast_account'},
      { name: 'custrecord_demand_forecast_site'},
      { name: 'custrecord_demand_forecast_item_sku'},
      { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week1',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week2',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week3',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week4',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week5',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week6',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week7',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week8',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week9',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week10',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week11',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week12',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week13',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week14',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week15',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week16',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week17',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week18',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week19',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week20',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week21',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week22',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week23',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week24',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week25',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week26',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week27',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week28',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week29',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week30',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week31',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week32',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week33',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week34',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week35',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week36',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week37',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week38',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week39',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week40',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week41',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week42',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week43',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week44',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week45',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week46',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week47',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week48',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week49',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week50',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week51',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custrecord_quantity_week52',  join: 'custrecord_demand_forecast_parent'},
      { name: 'custitem_product_grading',join: 'custrecord_demand_forecast_item_sku'}, // 产品分级
      { name: 'custitemf_product_grading',join: 'custrecord_demand_forecast_item_sku'}, // 产品初始分级
      { name: 'custrecord_quantity_week53',  join: 'custrecord_demand_forecast_parent'}
    ];
    var rsJson = {}, SKUs = {}, limit = 4000;
    var filters_sku = [], skuids = [], location = [], item_data = [],acc_arrys=[];
    if (item) {
      // item = true
      filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }];
    }
    if (account) {
      filters_sku.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account });
    }
    // filters_sku.push({ name: 'custrecord_demand_forecast_date', operator: 'on', values: today })
    search.create({
      type: 'customrecord_demand_forecast',
      filters: filters_sku,
      columns: [
        { name: 'custrecord_demand_forecast_item_sku', sort: search.Sort.ASC },
        { name: 'custrecord_demand_forecast_account'},
        { name: 'custitem_dps_skuchiense', join: 'custrecord_demand_forecast_item_sku' }, // 供应商名称
        { name: 'custrecord_demand_forecast_site' },
        { name: 'custitem_product_grading', join: 'custrecord_demand_forecast_item_sku' }, // 产品分级
        { name: 'custitemf_product_grading', join: 'custrecord_demand_forecast_item_sku' }, // 产品初始分级
        { name: 'custrecord_aio_fbaorder_location' ,join:"custrecord_demand_forecast_account"},
      ]
    }).run().each(function (rec){
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]), // 产品分级
        itemf_leve: rec.getValue(rec.columns[5]), // 产品初始分级
        location: rec.getValue(rec.columns[6]), // 产品初始分级
        // location: need_location ? need_location : ''
      });
      location.push(rec.getValue(rec.columns[6]));
    //   acc_arrys.push( rec.getValue(rec.columns[1]));
      skuids.push(rec.getValue(rec.columns[0]));
      return --limit > 0;
    });
    log.debug("000000000000000000skuids",skuids);
    if (skuids.length == 0) {
      return '';
    }
    /**
         * 1.需求预测
         * 2.调拨在途量
         * 3.店铺库存量
         * 4.店铺净需求
         * 5.修改店铺净需求
         */


    // item_data=GetPredictionData (item_data, 1, today, account, skuids, SKUIds, {data_type: '1',data_type_text: '需求预测'},week_rs,func_type)

   log.debug("today",today)
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
        })
         sku_arrys.push(rs.getValue(rs.columns[2]))

         acc_skus[rs.getValue(rs.columns[2])+"."+rs.getValue(rs.columns[0]) ] = rs.getValue(rs.columns[0])  // sku +acc 
      });
    }
    var pageSizeField = form.getField({ id: 'custpage_page_size' })
    for(var i=1;i<=pageCount;i++){
        pageSizeField.addSelectOption({ value: i, text: i, isSelected: pageSize == i ? true : false })
    }
 
     log.debug("00000000000000000需求预测数据长度: "+item_data.length,"pageSize:"+pageSize+",nowPage:"+nowPage)
    // 调拨在途量 (数据源：to单)
    var transit_num = [];
    search.create({
      type: 'transferorder',
      filters: [
        { join: 'item', name: 'internalid', operator: 'is', values: sku_arrys },
        { name: 'custbody_actual_target_warehouse', operator: 'anyof', values: location }, // FBA仓，实际目标仓
        { name: 'mainline', operator: 'is', values: ['F'] },
        { name: 'taxline', operator: 'is', values: ['F'] },
        { name: 'shipping', operator: 'is', values: ['F'] },
        { name: 'transactionlinetype', operator: 'is', values: 'RECEIVING' }
      ],
      columns: [
        'item',
        'custbodyexpected_arrival_time',
        'quantity',
        'custbody_actual_target_warehouse'
      ]
    }).run().each(function (result) {
      SKUIds.map(function (line) {
        if (line.item_sku == result.getValue('item') && line.location == result.getValue('custbody_actual_target_warehouse')) {
            if (result.getValue('custbodyexpected_arrival_time')) {
                var item_date = format.parse({ value: result.getValue('custbodyexpected_arrival_time'), type: format.Type.DATE });
                var item_time = getWeek(item_date, func_type);
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

    var b = []; // 记录数组a中的id 相同的下标
    if (transit_num.length > 0) {
      for (var i = 0; i < transit_num.length; i++) {
        for (var j = transit_num.length - 1; j > i; j--) {
          if (transit_num[i].item_id == transit_num[j].item_id && transit_num[i].item_time == transit_num[j].item_time) {
            transit_num[i].item_quantity = (transit_num[i].item_quantity * 1 + transit_num[j].item_quantity * 1).toString()
            b.push(j)
          }
        }
      }
      for (var k = 0; k < b.length; k++) {
        transit_num.splice(b[k], 1)
      }
    }

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
              data_type: '2',
              data_type_text: '调拨在途量',
              item_leve: SKUIds[i]['item_leve'], // 产品分级
              itemf_leve: SKUIds[i]['itemf_leve'], // 产品初始分级
              transit_no: need_transit_num[a]['lineItems']
            })
          } else {
            if (po_no.indexOf(SKUIds[i]['item_sku']) == -1) {
              item_data.push({
                item_sku: SKUIds[i]['item_sku'],
                item_sku_text: SKUIds[i]['item_sku_name'],
                item_name: SKUIds[i]['item_name'],
                account: SKUIds[i]['forecast_account'],
                account_text: SKUIds[i]['forecast_account_name'],
                site: SKUIds[i]['forecast_site'],
                data_type: '2',
                data_type_text: '调拨在途量',
                item_leve: SKUIds[i]['item_leve'], // 产品分级
                itemf_leve: SKUIds[i]['itemf_leve'], // 产品初始分级
                transit_no: 0
              })
              po_no.push(SKUIds[i]['item_sku'])
            }
          }
        }
      }
    } else {
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
          item_leve: line['item_leve'], // 产品分级
          itemf_leve: line['itemf_leve'], // 产品初始分级
          transit_no: 0
        })
      });
    }

    // 库存量
    var location_quantity = [], temporary_arr = [];
    search.create({
      type: 'item',
      filters: [
        { name: 'inventorylocation', operator: 'anyof', values: location },
        { name: 'internalid', operator: 'anyof', values: sku_arrys }
      ],
      columns: [
        { name: 'inventorylocation' },
        { name: 'locationquantityavailable' }
      ]
    }).run().each(function (rec) {
        
      SKUIds.map(function (line) {
          var fs = true;
        if (line.item_sku == rec.id && line.location == rec.getValue('inventorylocation')) {
            location_quantity.map(function(ld){
                if(ld.item_id == line.item_sku){
                    ld["difference_qt"]  += rec.getValue('locationquantityavailable') * 1
                    fs = false;
                }
            });
            if(fs)
          location_quantity.push({
            item_id: rec.id,
            difference_qt: rec.getValue('locationquantityavailable') * 1
          });
        }
        temporary_arr.push(rec.id);
       });
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
              data_type: '3',
              data_type_text: '店铺库存量',
              item_leve: SKUIds[i]['item_leve'], // 产品分级
              itemf_leve: SKUIds[i]['itemf_leve'], // 产品初始分级
              location_no: location_quantity[a]['difference_qt']
            });
          } else {
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
                item_leve: SKUIds[i]['item_leve'], // 产品分级
                itemf_leve: SKUIds[i]['itemf_leve'], // 产品初始分级
                location_no: 0
              });
              temporary_arr.push(SKUIds[i]['item_sku']);
            }
          }
        }
      }
    } else {
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
          item_leve: line['item_leve'], // 产品分级
          itemf_leve: line['itemf_leve'], // 产品初始分级
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
        data_type: '4',
        item_leve: line['item_leve'], // 产品分级
        itemf_leve: line['itemf_leve'], // 产品初始分级
        data_type_text: '店铺净需求'
      })
    })

    SKUIds.map(function (line) {
      item_data.push({
        item_sku: line.item_sku,
        item_sku_text: line.item_sku_name,
        item_name: line.item_name,
        account: line.forecast_account,
        account_text: line.forecast_account_name,
        site: line.forecast_site,
        data_type: '5',
        item_leve: line['item_leve'], // 产品分级
        itemf_leve: line['itemf_leve'], // 产品初始分级
        data_type_text: '修改净需求量'
      })
    })
     log.debug("item_data最后得到的数据",item_data)
    rsJson.result = item_data
    rsJson.totalCount = totalCount
    rsJson.pageCount = pageCount
    log.debug('item_data', item_data)
    return rsJson
  }

  /**
  * 渲染查询结果至页面
  */
  function initUI () {
    var form = ui.createForm({ title: '店铺供需查询' })
    form.addSubmitButton({ label: '查询' })
    form.addButton({
      id: 'button_export',
      label: '导出Excel',
      functionName: 'ExportDemandPlan'
    })
    form.addButton({
      id: 'button_save',
      label: '保 存',
      functionName: 'updateData'
    })
    form.addTab({ id: 'custpage_tab', label: '查询结果' })
    form.addFieldGroup({ id: 'custpage_search_group', tab: 'custpage_tab', label: '查询条件' })
    // form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'item', label: '店铺', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_account_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '所属店铺', container: 'custpage_search_group' })
    // form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customlist9', label: '站点', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_date_from', type: ui.FieldType.DATE, label: '日期从', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_date_to', type: ui.FieldType.DATE, label: '日期至', container: 'custpage_search_group' })

    initPageChoose(form)
    form.clientScriptModulePath = './store_demand_cs'
    return form
  }

  /**
  * 创建行数据
  * @param {*} data 
  */
  function createLineData (form, result, date_from, date_to) {
    var num = 0;
    var week = {}, quantity_week = {}, qw = [];
    log.debug('开始创建行数据');
    var today = new Date(+new Date() + 8 * 3600 * 1000);
    // 传入开始时间和结束时
    var week_objs = weekofday(today, date_from, date_to);
    func_type = week_objs.func_type;
    week_rs = week_objs.weeks;
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
    var today_l = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat);

    // var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.STATICLIST, label: '店铺供需', tab: 'custpage_tab' });
    var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '店铺供需', tab: 'custpage_tab' });
    sublist.helpText = '店铺供需结果';
    sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT });
    sublist.addField({ id: 'custpage_store_name_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT });
    sublist.addField({ id: 'custpage_item_sku_id', label: 'sku_id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT });
    sublist.addField({ id: 'custpage_item_leve', label: '产品分级', type: ui.FieldType.SELECT, source: 'customlist_product_grading' }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE })
    sublist.addField({ id: 'custpage_item_start_leve', label: '产品初始分级', type: ui.FieldType.SELECT, source: 'customlist_product_grading' }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE })
    sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT });
    sublist.addField({ id: 'custpage_data_type_id', label: '数据类型id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    var today_week = getWeek(today, func_type);
    var md = week_rs[0] - today_week;
    var abs = Math.abs(md),num = 0;
    week_rs.map(function (wek) {
      var sub_filed = 'custpage_quantity_week' + wek;
      var ff = wek;
      if (func_type == 'B' && wek < week_rs[0]) // 跨年，明年的第一周不要
        ff = wek - 1;
      var Label = 'W' + ff;
      week_ = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER }) ;// INTEGER
      week_.defaultValue = '0';
      if (md < 0 && num < abs)
        week_.updateDisplayType({displayType: ui.FieldDisplayType.INLINE});
      else
        week_.updateDisplayType({displayType: ui.FieldDisplayType.ENTRY})
      week[wek] = week_;
      num++;
    })
    for (var s = 1; s < 54; s++) {
      var sub_filed = 'custpage_quantity_weekhi' + s;
      var Label = 'Whi' + s;
      var week_hi = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER }); // INTEGER
      week_hi.defaultValue = '0';
      week_hi.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
    }
    log.debug('000000000000000000000000createLineData result', result.length);
    log.debug('000000000000000000000000 SKUIds.length ', SKUIds.length);
    log.debug('000000000000000000000000 店铺 +  sku acc_skus', acc_skus);
    var zl = 0, data_arr = [];

    for(var key in acc_skus){
        for (var z = 0; z < SKUIds.length; z++) {
            var need1_zl, need2_zl, need3_zl,need4_zl;
            for (var a = 0; a < result.length; a++) {
              if (SKUIds[z]['item_sku'] == result[a]['item_sku'] && SKUIds[z]['forecast_account'] == result[a]['account'] 
              && key.split(".")[0]  == SKUIds[z]['item_sku']
              && acc_skus[key] == SKUIds[z]['forecast_account']
               ) {
                sublist.setSublistValue({ id: 'custpage_store_name', value: result[a]['account_text'], line: zl })
                sublist.setSublistValue({ id: 'custpage_store_name_id', value: result[a]['account'], line: zl })
                sublist.setSublistValue({ id: 'custpage_item_sku', value: result[a]['item_sku_text'], line: zl })
                sublist.setSublistValue({ id: 'custpage_item_sku_id', value: result[a]['item_sku'], line: zl })
                if (result[a]['item_name'])
                  sublist.setSublistValue({ id: 'custpage_item_name', value: result[a]['item_name'], line: zl })
                sublist.setSublistValue({ id: 'custpage_data_type', value: result[a]['data_type_text'], line: zl })
                sublist.setSublistValue({ id: 'custpage_data_type_id', value: result[a]['data_type'], line: zl })
                if (result[a]['item_leve'])
                  sublist.setSublistValue({ id: 'custpage_item_leve', value: result[a]['item_leve'], line: zl })
                if (result[a]['itemf_leve'])
                  sublist.setSublistValue({ id: 'custpage_item_start_leve', value: result[a]['itemf_leve'], line: zl })
      
                if (result[a]['data_type'] == 1) { // 销售预测
                    log.debug("000000000000有销售预测数据啦:"+zl,result[a]);
                  week_rs.map(function (wek) {
                    var sub_filed = 'custpage_quantity_week' + wek
                    if (result[a]['quantity_week' + wek]) {
                      sublist.setSublistValue({ id: sub_filed, value: Math.round(result[a]['quantity_week' + wek].split(' ')[1]).toFixed(0), line: zl })
                    } else {
                      sublist.setSublistValue({ id: sub_filed, value: '0', line: zl })
                    }
                  })
                  for (var s = 1; s < 54; s++) {
                    var sub_filed = 'custpage_quantity_weekhi' + s
                    if (result[a]['quantity_week' + s]) {
                      sublist.setSublistValue({ id: sub_filed, value: Math.round(result[a]['quantity_week' + s].split(' ')[1]).toFixed(0), line: zl })
                    } else {
                      sublist.setSublistValue({ id: sub_filed, value: '0', line: zl })
                    }
                  }
                  need1_zl = zl
                 
                }
                if (result[a]['data_type'] == 4 || result[a]['data_type'] == 5) { // 店铺净需求4  //修改净需求量5
                  var arr_list = [], data_josn = {}
                  data_josn.item_sku = result[a]['item_sku']
                  data_josn.account_id = result[a]['account']
                  data_josn.data_type = result[a]['data_type']
                  week_rs.map(function (wek) {
                    var sub_filed = 'custpage_quantity_week' + wek
                    var x1 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need1_zl }) : 0
                    var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need2_zl }) : 0
                    var x3 = need3_zl || need3_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need3_zl }) : 0
                    var x4 = x1 - (Number(x3) + Number(x2))
                    sublist.setSublistValue({ id: sub_filed, value: x4.toString(), line: zl })
                    arr_list.push({
                      week: wek,
                      item_quantity: x4
                    })
                  })
                  for (var s = 1; s < 54; s++) {
                    var sub_filed = 'custpage_quantity_weekhi' + s
                    var x1 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need1_zl }) : 0
                    var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need2_zl }) : 0
                    var x3 = need3_zl || need3_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need3_zl }) : 0
                    var x4 = x1 - (Number(x3) + Number(x2))
                    sublist.setSublistValue({ id: sub_filed, value: x4.toString(), line: zl })
                  }
                  data_josn.item = arr_list
                  if (result[a]['data_type'] == 5) {
                    data_arr.push(data_josn)
                  }
                  need4_zl = zl
                
                }
                if (result[a]['data_type'] == 23) { // 修改净需求量23
                  var arr_list = [], data_josn = {}
                  data_josn.item_sku = result[a]['item_sku']
                  data_josn.account_id = result[a]['account']
                  data_josn.data_type = result[a]['data_type']
                  week_rs.map(function (wek) {
                    var sub_filed = 'custpage_quantity_week' + wek
                    var x1 = Math.round(result[a]['quantity_week' + wek]) ? Math.round(result[a]['quantity_week' + wek]).toFixed(0) : '0'
                    // 如果等于0，就让他与净需求相同 
                    if (x1 == 0)
                      x1 = sublist.getSublistValue({ id: sub_filed, line: need4_zl })
                    sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl })
      
                    arr_list.push({
                      week: wek,
                      item_quantity: Math.round(result[a]['quantity_week' + wek]) ? Math.round(result[a]['quantity_week' + wek]).toFixed(0) : '0'
                    })
                  })
                  for (var s = 1; s < 54; s++) {
                    var sub_filed = 'custpage_quantity_weekhi' + s
                    var x1 = Math.round(result[a]['quantity_week' + s]) ? Math.round(result[a]['quantity_week' + s]).toFixed(0) : '0'
                    // 如果等于0，就让他与净需求相同 
                    if (x1 == 0)
                      x1 = sublist.getSublistValue({ id: sub_filed, line: need4_zl })
                    sublist.setSublistValue({ id: sub_filed, value: x1 ? x1.toString() : '0', line: zl })
                  }
                  data_josn.item = arr_list
                  data_arr.push(data_josn)
                 
                }
                if (result[a]['data_type'] == 2) { // 在途量
                  var arr_list = [], data_josn = {}
                  data_josn.item_sku = result[a]['item_sku']
                  data_josn.account_id = result[a]['account']
                  data_josn.data_type = result[a]['data_type']
                  var transit_no = result[a]['transit_no']
      
                  week_rs.map(function (wek) {
                    var sub_filed = 'custpage_quantity_week' + wek
                    if (transit_no.length > 0) {
                      var line_arr = []
                      var quan_item = 0
                      transit_no.map(function (l) {
                        if (l.item_time == wek) {
                          quan_item = l.item_quantity
                          sublist.setSublistValue({ id: sub_filed, value: quan_item.toString(), line: zl })
                        }
                        line_arr.push(l.item_time)
                      })
                      if (line_arr.indexOf(wek) == -1) {
                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl })
                      }
                      arr_list.push({
                        week: wek,
                        item_quantity: quan_item
                      })
                    } else {
                      sublist.setSublistValue({ id: sub_filed, value: '0', line: zl })
                      arr_list.push({
                        week: wek,
                        item_quantity: 0
                      })
                    }
                  })
                  for (var s = 1; s < 54; s++) {
                    var sub_filed = 'custpage_quantity_weekhi' + s;
                    if (transit_no.length > 0) {
                      var line_arr = [];
                      var quan_item = 0;
                      transit_no.map(function (l) {
                        if (l.item_time == s) {
                          quan_item = l.item_quantity;
                          sublist.setSublistValue({ id: sub_filed, value: quan_item.toString(), line: zl });
                        }
                        line_arr.push(l.item_time);
                      })
                      if (line_arr.indexOf(s) == -1) {
                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                      }
                    } else {
                      sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                    }
                  }
                  data_josn.item = arr_list;
                  data_arr.push(data_josn);
                  need2_zl = zl;
             
                }
      
                var need_no = 0;
                if (result[a]['data_type'] == 3) { // 库存量
                  week_rs.map(function (wek) {
                    var sub_filed = 'custpage_quantity_week' + wek;
                    if (wek == week_rs[0]) {
                      if (result[a]['location_no']) {
                        sublist.setSublistValue({ id: sub_filed, value: result[a]['location_no'].toString(), line: zl });
                        need_no = result[a]['location_no'];
                      } else {
                        need_no = 0
                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                      }
                    } else {
                      var need_sub_filed = 'custpage_quantity_weekhi' + (wek - 1);
                      var x1 = need_no;
                      var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need2_zl }) : 0;
                      var x3 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need1_zl }) : 0;
                      need_no = -(Number(x3) - (Number(x1) + Number(x2))); //需求预测 - (在途+ 库存)
                      sublist.setSublistValue({ id: sub_filed, value: need_no.toString() ? need_no.toString() : '0', line: zl });
                    }
                  })
                  for (var s = 1; s < 54; s++) {
                    var sub_filed = 'custpage_quantity_weekhi' + s;
                    if (s == 1) {
                      if (result[a]['location_no']) {
                        sublist.setSublistValue({ id: sub_filed, value: result[a]['location_no'].toString(), line: zl });
                        need_no = result[a]['location_no'];
                      } else {
                        sublist.setSublistValue({ id: sub_filed, value: '0', line: zl });
                      }
                    } else {
                      var need_sub_filed = 'custpage_quantity_weekhi' + (s - 1);
                      var x1 = need_no;
                      var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need2_zl }) : 0; //店铺库存
                      var x3 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: need_sub_filed, line: need1_zl }) : 0; //需求预测
                      need_no = -(Number(x3) - (Number(x1) + Number(x2)));
                      sublist.setSublistValue({ id: sub_filed, value: need_no.toString() ? need_no.toString() : '0', line: zl });
                    }
                  }
                  need3_zl = zl;
                }
                zl++;
              }
            }
          }
    }
    

    return data_arr
  }

  /**
  * 在界面显示：数据选择数据组（包括数据选择列表、当前页/总页数）
  * 
  * @param form
  * @param hidePageSelect 是否隐藏数据选择select
  * @returns
  */
  function initPageChoose (form, hidePageSelect) {
    form.addFieldGroup({ id: 'custpage_page_group', tab: 'custpage_tab', label: '数据选择' })
    if (hidePageSelect != 'Y') {
      form.addField({ id: 'custpage_select_page', type: ui.FieldType.SELECT, label: '数据选择', container: 'custpage_page_group' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    }
    form.addField({ id: 'custpage_total_count', type: ui.FieldType.TEXT, label: '总sku数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL })
    form.addField({ id: 'custpage_total_page', type: ui.FieldType.INTEGER, label: '总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 40, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    form.addField({ id: 'custpage_page_size', type: ui.FieldType.SELECT, label: '选择页数', container: 'custpage_page_group' }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL })
    form.addField({ id: 'custpage_now_page', type: ui.FieldType.INTEGER, label: '当前页', container: 'custpage_page_group' }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN })
    form.addField({ id: 'custpage_now_total_page', type: ui.FieldType.TEXT, label: '当前页/总页数', container: 'custpage_page_group' }).updateDisplaySize({ width: 10, height: 10 }).updateDisplayType({ displayType: ui.FieldDisplayType.INLINE }).updateBreakType({ breakType: ui.FieldBreakType.STARTCOL })
  }

  /**
  * 设置数据选择列表、当前页、总页数到界面    
  * 
  * @param form
  * @param nowPage
  * @param totalCount
  * @param pageSize
  * @param hidePageSelect 是否隐藏数据选择select
  * @returns
  */
  function setPageInfo (form, nowPage, totalCount, pageCount, pageSize, hidePageSelect) {
    form.getField({ id: 'custpage_total_page' }).defaultValue = pageCount
    form.getField({ id: 'custpage_now_page' }).defaultValue = nowPage
    form.getField({ id: 'custpage_page_size' }).defaultValue = nowPage
    form.getField({ id: 'custpage_now_total_page' }).defaultValue = (nowPage == 0 ? 1 : nowPage) + '/' + pageCount
    form.getField({ id: 'custpage_total_count' }).defaultValue = totalCount
    if (hidePageSelect != 'Y') {
      var selectPageField = form.getField({ id: 'custpage_select_page' })
      for (var i = 1; i <= pageCount; i++) {
        var selectedFlag
        var startStr = (i - 1) * pageSize + 1
        var endStr = i == pageCount ? totalCount : (i - 1) * pageSize + Number(pageSize)
        if (nowPage == i) {
          selectedFlag = true
        } else {
          selectedFlag = false
        }
        selectPageField.addSelectOption({ value: i, text: startStr + '-' + endStr + '行', isSelected: selectedFlag });
      }
    }

  }

  /**
   * 判断某一日属于这一年的第几周
   * @param {*} data 
   */
  function weekofday (data, date_from, date_to) {
    log.debug('date_from:' + date_from, date_to)
    var weeks = [],dat_from,dat_to ,func_type
    // //获取年份
    var YearDer_to = date_to.getFullYear() - data.getFullYear()
    if (YearDer_to > 0) { // 跨明年
      log.debug('跨明年')
      // 如果跨年了，判断明年的第一天是星期几
      // 是周 5、6、7，这几天，归为今年的是最后一周
      var y = date_to.getFullYear()
      var dd = '1/1/' + y
      dd = new Date(dd)
      if (dd.getDay() > 4 || dd.getDay() == 0) {
        // 并且 明年的 第一周归为去年的 最后一周 ，就是明年的第一周不要了
        dat_from = getWeek(date_from)
        for (var i = dat_from;i <= 53;i++) {
          weeks.push(i)
        }

        dat_to = getWeek(date_to)
        for (var i = 2;i <= dat_to;i++) {
          weeks.push(i)
        }
        func_type = 'B'
      }else {
        // 否则 去年的最后一周归为明年的第一周，就是去年的最后一周不要了
        dat_from = getWeek(date_from)
        for (var i = dat_from;i <= 52;i++) {
          weeks.push(i)
        }

        dat_to = getWeek(date_to)
        for (var i = 1;i <= dat_to;i++) {
          weeks.push(i)
        }
        func_type = 'C'
      }
    } else {
      log.debug('不跨明年？0,', YearDer_to)
      dat_to = getWeek(date_to)
      dat_from = getWeek(date_from)
      for (var i = dat_from;i <= dat_to;i++) {
        weeks.push(i)
      }
      func_type = 'A'
    }
    log.debug('weeks ', weeks)
    return {'weeks': weeks,'func_type': func_type}
  }

  function getWeek (day, func_type) {
    var d1 = new Date(day)
    var d2 = new Date(day)
    d2.setMonth(0)
    d2.setDate(1)
    var numweekf = d2.getDay()
    var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf)
    var days = Math.ceil(rq / (24 * 60 * 60 * 1000))
    var num = Math.ceil(days / 7)
    if (func_type == 'B' && num == 1) {
      num = 53
    }else if (func_type == 'C' && num == 53) {
      num = 1
    }
    return num
  }

  /**  
    * 搜索销售预测数据
    */
  function GetPredictionData (item_data, datatype, today, account, skuids, SKUIds, params, week_rs, func_type) {
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: datatype },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }
    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids })
    var colus = [
      { name: 'custrecord_demand_forecast_account'},
      { name: 'custrecord_demand_forecast_site'},
      { name: 'custrecord_demand_forecast_item_sku'},
      { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
      { name: 'custrecord_demand_forecast_l_data_type',join: 'custrecord_demand_forecast_parent'},
      { name: 'custitem_product_grading', join: 'custrecord_demand_forecast_item_sku' }, // 分级
      { name: 'custitemf_product_grading', join: 'custrecord_demand_forecast_item_sku' }, // 初级分级
    ]
    week_rs.map(function (wek) {
      colus.push({ name: 'custrecord_quantity_week' + wek, join: 'custrecord_demand_forecast_parent'})
    })

    var mySearch_demand_forecast = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: colus
    })
    var pageData_demand_forecast = mySearch_demand_forecast.runPaged({
      pageSize: 4000
    })
    var totalCount = pageData_demand_forecast.count; // 总数
    var pageCount = pageData_demand_forecast.pageRanges.length; // 页数
    var col_arry = {}
    if (pageCount == 0 && datatype == '22') {
      // 调拨计划量  ，取自修改的调拨计划量
      var filters = [
        { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: ['6'] },
        { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
      ]

      if (account) {
        filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
      }

      filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids })

      log.debug('filters', filters)

      var mySearch_delivery_schedule = search.create({
        type: 'customrecord_demand_forecast',
        filters: filters,
        columns: colus
      })
      pageData_demand_forecast = mySearch_delivery_schedule.runPaged({
        pageSize: 4000
      })
      totalCount = pageData_demand_forecast.count; // 总数
      pageCount = pageData_demand_forecast.pageRanges.length; // 页数
    }
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
          itemf_leve: line.itemf_leve
        })
      })
    } else {
      pageData_demand_forecast.fetch({
        index: 0
      }).data.forEach(function (rs) {
        col_arry = {}
        col_arry['item_sku'] = rs.getValue(rs.columns[2]) ? rs.getValue(rs.columns[2]) : ''
        col_arry['item_sku_text'] = rs.getText(rs.columns[2]) ? rs.getText(rs.columns[2]) : ''
        col_arry['item_name'] = rs.getValue(rs.columns[3]) ? rs.getValue(rs.columns[3]) : ''
        col_arry['account'] = rs.getValue(rs.columns[0]) ? rs.getValue(rs.columns[0]) : ''
        col_arry['account_text'] = rs.getText(rs.columns[0]) ? rs.getText(rs.columns[0]) : ''
        col_arry['site'] = rs.getValue(rs.columns[1]) ? rs.getValue(rs.columns[1]) : ''
        col_arry['data_type'] = rs.getValue(rs.columns[4]) ? rs.getValue(rs.columns[4]) : ''
        col_arry['data_type_text'] = rs.getText(rs.columns[4]) ? rs.getText(rs.columns[4]) : ''
        col_arry['item_leve'] = rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : ''
        col_arry['itemf_leve'] = rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : ''

        var col_ls = 6,str
        week_rs.map(function (wek) {
          col_ls++
          col_arry['quantity_week' + wek] = rs.getValue(rs.columns[col_ls]) ? rs.getValue(rs.columns[col_ls]) : ''
        })
        item_data.push(col_arry)
        log.debug('0000方法里的mp item_sku_text: ' + rs.getText(rs.columns[2]), item_data)
      })
    }
    log.debug('0000方法里的 调拨在途量:', item_data)
    return item_data
  }


  return {
    onRequest: onRequest
  }
})
