/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', '../../Helper/Moment.min', 'N/format', 'N/runtime', 'N/record'], function (search, ui, moment, format, runtime, record) {
  var SKUIds = [],func_type,week_rs,acc_skus = {},sku_arrys = [],presT_arrys = []
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
    var set_date_form = new Date().toISOString().split('T')[0]
    var set_date_to = new Date(new Date().setMonth(new Date().getMonth() + 8)).toISOString().split('T')[0]
    if (!params.custpage_date_from) {
      params.custpage_date_from = set_date_form
    }
    if (!params.custpage_date_to) {
      params.custpage_date_to = set_date_to
    }
    form.updateDefaultValues(params)
    var action = params.action
    if (method == 'POST') {
      params.custpage_now_page = 1
      form = getSearchData(form, params, response)
    } else {
      form = getSearchData(form, params, response)
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
    // var pageSize = params.custpage_page_size ? params.custpage_page_size : 50; // 每页数量
    var pageSize = 10; // 每页数量
    var item = params.custpage_item
    var date_from_p = params.custpage_date_from
    var date_to_p = params.custpage_date_to
    if (!date_from_p || !date_to_p) { // || (date_from_p > date_to_p)
      throw '请先输入正确的时间范围'
    }
    var date_from = format.parse({ value: params.custpage_date_from, type: format.Type.DATE})
    var date_to = format.parse({ value: params.custpage_date_to, type: format.Type.DATE})
    log.debug('getSearchData date_from', date_from)
    log.debug('getSearchData date_to', date_to)
    if (date_from > date_to) {
      throw '请先输入正确的时间范围'
    }
    var site = params.custpage_site
    var account = params.custpage_account_store
    var department = params.custpage_department
    // format.parse({ value:params.custpage_date_from, type: format.Type.DATE})
    // format.parse({ value:params.custpage_date_to, type: format.Type.DATE})

    var rsJson = getResult(item, date_from, date_to, pageSize, nowPage, site, account, form, department); // 查询结果
    if (rsJson) {
      var result = rsJson.result
      var totalCount = rsJson.totalCount
      var pageCount = rsJson.pageCount
      createLineData(form, result, date_from, date_to); // 创建行数据
      // 设置数据选择列表、当前页、总页数到界面
      setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result)
    }

    return form
  }

  /**
  * 渲染查询结果至页面
  */
  function initUI () {
    var form = ui.createForm({ title: '调拨计划例外信息查询' })
    form.addSubmitButton({ label: '查询' })
    form.addTab({ id: 'custpage_tab', label: '查询结果' })
    form.addFieldGroup({ id: 'custpage_search_group', tab: 'custpage_tab', label: '查询条件' })
    // form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'item', label: '店铺', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_account_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '所属店铺', container: 'custpage_search_group' })
    // form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customlist9', label: '站点', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU', container: 'custpage_search_group' })
    form.addField({
      id: 'custpage_department',
      type: ui.FieldType.SELECT,
      source: 'department',
      label: '事业部',
      container: 'custpage_search_group'
    })
    form.addField({ id: 'custpage_date_from', type: ui.FieldType.DATE, label: '日期从', container: 'custpage_search_group' })
    form.addField({ id: 'custpage_date_to', type: ui.FieldType.DATE, label: '日期至', container: 'custpage_search_group' })
    initPageChoose(form)
    // form.clientScriptModulePath = './delivery_schedule_cs'
    return form
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
        selectPageField.addSelectOption({ value: i, text: startStr + '-' + endStr + '行', isSelected: selectedFlag })
      }
    }
  }

  /**
  * 查询结果
  * @param {*} item 
  * @param {*} date_from 
  * @param {*} date_to 
  */
  function getResult (item, date_from, date_to, pageSize, nowPage, site, account, form, department) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
    log.debug('dateFormat', dateFormat)
    //
    // var today = moment(new Date().getTime()).format(dateFormat)
    var today = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat)
    log.debug('today', today)
    today = '2020-8-4'
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
      ],markect_arrys = [],location = []
    var rsJson = {}, limit = 4000
    var filters_sku = [],skuids = []
    if (item) {
      // item = true
      filters_sku = [{ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item }]
    }
    if (account) {
      filters_sku.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }
    if (department) {
      filters_sku.push({ name: 'department',join: 'custrecord_demand_forecast_item_sku',operator: 'anyof', values: department})
    }
    search.create({
      type: 'customrecord_demand_forecast',
      filters: filters_sku,
      columns: [
        { name: 'custrecord_demand_forecast_item_sku',sort: search.Sort.ASC},
        { name: 'custrecord_demand_forecast_account'},
        { name: 'custitem_dps_skuchiense',join: 'custrecord_demand_forecast_item_sku'},
        { name: 'custrecord_demand_forecast_site'},
        { name: 'custitem_product_grading',join: 'custrecord_demand_forecast_item_sku'}, // 产品分级
        { name: 'custitemf_product_grading',join: 'custrecord_demand_forecast_item_sku'}, // 产品初始分级
        { name: 'custrecord_market_area',join: 'custrecord_demand_forecast_account'}, // 市场
        { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_demand_forecast_account'}
      ]
    }).run().each(function (rec) {
      SKUIds.push({
        item_sku: rec.getValue(rec.columns[0]),
        forecast_account: rec.getValue(rec.columns[1]),
        item_sku_name: rec.getText(rec.columns[0]),
        forecast_account_name: rec.getText(rec.columns[1]),
        item_name: rec.getValue(rec.columns[2]),
        forecast_site: rec.getValue(rec.columns[3]),
        item_leve: rec.getValue(rec.columns[4]), // 产品分级
        itemf_leve: rec.getValue(rec.columns[5]), // 产品初始分级
        markect: rec.getValue(rec.columns[6]), // 市场
        location: rec.getValue(rec.columns[7]), // 市场
      })
      location.push(rec.getValue(rec.columns[7]))
      markect_arrys.push(rec.getValue(rec.columns[6]))
      skuids.push(rec.getValue(rec.columns[0]))
      return --limit > 0
    })
    // log.debug('SKUIds',SKUIds)
    // 3店铺净需求,6调拨计划量，22修改调拨计划量
    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: ['3'] },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]
    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }
    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: skuids })
    if (site) {
      filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site })
    }
    var mySearch_delivery_schedule = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    })
    var pageData_delivery_schedule = mySearch_delivery_schedule.runPaged({
      pageSize: pageSize
    })
    var totalCount = pageData_delivery_schedule.count; // 总数
    var pageCount = pageData_delivery_schedule.pageRanges.length; // 页数
    var item_data = []
    if (totalCount == 0 && pageCount == 0) {
      rsJson.result = []
      rsJson.totalCount = totalCount
      rsJson.pageCount = pageCount
    } else {
      pageData_delivery_schedule.fetch({
        index: Number(nowPage - 1)
      }).data.forEach(function (rs) {
        item_data.push({
          item_sku: rs.getValue(rs.columns[2]),
          item_sku_text: rs.getText(rs.columns[2]),
          item_name: rs.getValue(rs.columns[3]),
          account: rs.getValue(rs.columns[0]),
          account_text: rs.getText(rs.columns[0]),
          site: rs.getValue(rs.columns[1]),
          data_type: rs.getValue(rs.columns[4]),
          data_type_text: rs.getText(rs.columns[4]),
          quantity_week1: rs.getValue(rs.columns[5])?rs.getValue(rs.columns[5]):"0",
          quantity_week2: rs.getValue(rs.columns[6])?rs.getValue(rs.columns[6]):"0",
          quantity_week3: rs.getValue(rs.columns[7])?rs.getValue(rs.columns[7]):"0",
          quantity_week4: rs.getValue(rs.columns[8])?rs.getValue(rs.columns[8]):"0",
          quantity_week5: rs.getValue(rs.columns[9])?rs.getValue(rs.columns[9]):"0",
          quantity_week6: rs.getValue(rs.columns[10])?rs.getValue(rs.columns[10]):"0",
          quantity_week7: rs.getValue(rs.columns[11])?rs.getValue(rs.columns[11]):"0",
          quantity_week8: rs.getValue(rs.columns[12])?rs.getValue(rs.columns[12]):"0",
          quantity_week9: rs.getValue(rs.columns[13])?rs.getValue(rs.columns[13]):"0",
          quantity_week10: rs.getValue(rs.columns[14])?rs.getValue(rs.columns[14]):"0",
          quantity_week11: rs.getValue(rs.columns[15])?rs.getValue(rs.columns[15]):"0",
          quantity_week12: rs.getValue(rs.columns[16])?rs.getValue(rs.columns[16]):"0",
          quantity_week13: rs.getValue(rs.columns[17])?rs.getValue(rs.columns[17]):"0",
          quantity_week14: rs.getValue(rs.columns[18])?rs.getValue(rs.columns[18]):"0",
          quantity_week15: rs.getValue(rs.columns[19])?rs.getValue(rs.columns[19]):"0",
          quantity_week16: rs.getValue(rs.columns[20])?rs.getValue(rs.columns[20]):"0",
          quantity_week17: rs.getValue(rs.columns[21])?rs.getValue(rs.columns[21]):"0",
          quantity_week18: rs.getValue(rs.columns[22])?rs.getValue(rs.columns[22]):"0",
          quantity_week19: rs.getValue(rs.columns[23])?rs.getValue(rs.columns[23]):"0",
          quantity_week20: rs.getValue(rs.columns[24])?rs.getValue(rs.columns[24]):"0",
          quantity_week21: rs.getValue(rs.columns[25])?rs.getValue(rs.columns[25]):"0",
          quantity_week22: rs.getValue(rs.columns[26])?rs.getValue(rs.columns[26]):"0",
          quantity_week23: rs.getValue(rs.columns[27])?rs.getValue(rs.columns[27]):"0",
          quantity_week24: rs.getValue(rs.columns[28])?rs.getValue(rs.columns[28]):"0",
          quantity_week25: rs.getValue(rs.columns[29])?rs.getValue(rs.columns[29]):"0",
          quantity_week26: rs.getValue(rs.columns[30])?rs.getValue(rs.columns[30]):"0",
          quantity_week27: rs.getValue(rs.columns[31])?rs.getValue(rs.columns[31]):"0",
          quantity_week28: rs.getValue(rs.columns[32])?rs.getValue(rs.columns[32]):"0",
          quantity_week29: rs.getValue(rs.columns[33])?rs.getValue(rs.columns[33]):"0",
          quantity_week30: rs.getValue(rs.columns[34])?rs.getValue(rs.columns[34]):"0",
          quantity_week31: rs.getValue(rs.columns[35])?rs.getValue(rs.columns[35]):"0",
          quantity_week32: rs.getValue(rs.columns[36])?rs.getValue(rs.columns[36]):"0",
          quantity_week33: rs.getValue(rs.columns[37])?rs.getValue(rs.columns[37]):"0",
          quantity_week34: rs.getValue(rs.columns[38])?rs.getValue(rs.columns[38]):"0",
          quantity_week35: rs.getValue(rs.columns[39])?rs.getValue(rs.columns[39]):"0",
          quantity_week36: rs.getValue(rs.columns[40])?rs.getValue(rs.columns[40]):"0",
          quantity_week37: rs.getValue(rs.columns[41])?rs.getValue(rs.columns[41]):"0",
          quantity_week38: rs.getValue(rs.columns[42])?rs.getValue(rs.columns[42]):"0",
          quantity_week39: rs.getValue(rs.columns[43])?rs.getValue(rs.columns[43]):"0",
          quantity_week40: rs.getValue(rs.columns[44])?rs.getValue(rs.columns[44]):"0",
          quantity_week41: rs.getValue(rs.columns[45])?rs.getValue(rs.columns[45]):"0",
          quantity_week42: rs.getValue(rs.columns[46])?rs.getValue(rs.columns[46]):"0",
          quantity_week43: rs.getValue(rs.columns[47])?rs.getValue(rs.columns[47]):"0",
          quantity_week44: rs.getValue(rs.columns[48])?rs.getValue(rs.columns[48]):"0",
          quantity_week45: rs.getValue(rs.columns[49])?rs.getValue(rs.columns[49]):"0",
          quantity_week46: rs.getValue(rs.columns[50])?rs.getValue(rs.columns[50]):"0",
          quantity_week47: rs.getValue(rs.columns[51])?rs.getValue(rs.columns[51]):"0",
          quantity_week48: rs.getValue(rs.columns[52])?rs.getValue(rs.columns[52]):"0",
          quantity_week49: rs.getValue(rs.columns[53])?rs.getValue(rs.columns[53]):"0",
          quantity_week50: rs.getValue(rs.columns[54])?rs.getValue(rs.columns[54]):"0",
          quantity_week51: rs.getValue(rs.columns[55])?rs.getValue(rs.columns[55]):"0",
          quantity_week52: rs.getValue(rs.columns[56])?rs.getValue(rs.columns[56]):"0",
          quantity_week53: rs.getValue(rs.columns[59])?rs.getValue(rs.columns[5]):"0",
          item_leve: rs.getValue(rs.columns[57]), // 产品分级
          itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
        })
        sku_arrys.push(rs.getValue(rs.columns[2]))
        acc_skus[rs.getValue(rs.columns[2]) + '.' + rs.getValue(rs.columns[0])] = rs.getValue(rs.columns[0]); // sku +acc 
      })
    }

    var pageSizeField = form.getField({ id: 'custpage_page_size' })
    for (var i = 1;i <= pageCount;i++) {
      pageSizeField.addSelectOption({ value: i, text: i, isSelected: pageSize == i ? true : false })
    }

    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: ['6'] },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]

    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }

    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: sku_arrys })

    if (site) {
      filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site })
    }
    var mySearch_delivery_schedule = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    })
    var pageData_delivery_schedule = mySearch_delivery_schedule.runPaged({
      pageSize: pageSize
    })
    var totalCount = pageData_delivery_schedule.count; // 总数
    var pageCount = pageData_delivery_schedule.pageRanges.length; // 页数
    if (totalCount == 0 && pageCount == 0) {
      rsJson.result = []
      rsJson.totalCount = totalCount
      rsJson.pageCount = pageCount
    } else {
      pageData_delivery_schedule.fetch({
        index: Number(nowPage - 1)
      }).data.forEach(function (rs) {
        item_data.push({
          item_sku: rs.getValue(rs.columns[2]),
          item_sku_text: rs.getText(rs.columns[2]),
          item_name: rs.getValue(rs.columns[3]),
          account: rs.getValue(rs.columns[0]),
          account_text: rs.getText(rs.columns[0]),
          site: rs.getValue(rs.columns[1]),
          data_type: rs.getValue(rs.columns[4]),
          data_type_text: rs.getText(rs.columns[4]),
          quantity_week1: rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : '0',
          quantity_week2: rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : '0',
          quantity_week3: rs.getValue(rs.columns[7]) ? rs.getValue(rs.columns[7]) : '0',
          quantity_week4: rs.getValue(rs.columns[8]) ? rs.getValue(rs.columns[8]) : '0',
          quantity_week5: rs.getValue(rs.columns[9]) ? rs.getValue(rs.columns[9]) : '0',
          quantity_week6: rs.getValue(rs.columns[10]) ? rs.getValue(rs.columns[10]) : '0',
          quantity_week7: rs.getValue(rs.columns[11]) ? rs.getValue(rs.columns[11]) : '0',
          quantity_week8: rs.getValue(rs.columns[12]) ? rs.getValue(rs.columns[12]) : '0',
          quantity_week9: rs.getValue(rs.columns[13]) ? rs.getValue(rs.columns[13]) : '0',
          quantity_week10: rs.getValue(rs.columns[14]) ? rs.getValue(rs.columns[14]) : '0',
          quantity_week11: rs.getValue(rs.columns[15]) ? rs.getValue(rs.columns[15]) : '0',
          quantity_week12: rs.getValue(rs.columns[16]) ? rs.getValue(rs.columns[16]) : '0',
          quantity_week13: rs.getValue(rs.columns[17]) ? rs.getValue(rs.columns[16]) : '0',
          quantity_week14: rs.getValue(rs.columns[18]) ? rs.getValue(rs.columns[18]) : '0',
          quantity_week15: rs.getValue(rs.columns[19]) ? rs.getValue(rs.columns[19]) : '0',
          quantity_week16: rs.getValue(rs.columns[20]) ? rs.getValue(rs.columns[20]) : '0',
          quantity_week17: rs.getValue(rs.columns[21]) ? rs.getValue(rs.columns[21]) : '0',
          quantity_week18: rs.getValue(rs.columns[22]) ? rs.getValue(rs.columns[22]) : '0',
          quantity_week19: rs.getValue(rs.columns[23]) ? rs.getValue(rs.columns[23]) : '0',
          quantity_week20: rs.getValue(rs.columns[24]) ? rs.getValue(rs.columns[24]) : '0',
          quantity_week21: rs.getValue(rs.columns[25]) ? rs.getValue(rs.columns[25]) : '0',
          quantity_week22: rs.getValue(rs.columns[26]) ? rs.getValue(rs.columns[26]) : '0',
          quantity_week23: rs.getValue(rs.columns[27]) ? rs.getValue(rs.columns[27]) : '0',
          quantity_week24: rs.getValue(rs.columns[28]) ? rs.getValue(rs.columns[28]) : '0',
          quantity_week25: rs.getValue(rs.columns[29]) ? rs.getValue(rs.columns[29]) : '0',
          quantity_week26: rs.getValue(rs.columns[30]) ? rs.getValue(rs.columns[30]) : '0',
          quantity_week27: rs.getValue(rs.columns[31]) ? rs.getValue(rs.columns[31]) : '0',
          quantity_week28: rs.getValue(rs.columns[32]) ? rs.getValue(rs.columns[32]) : '0',
          quantity_week29: rs.getValue(rs.columns[33]) ? rs.getValue(rs.columns[33]) : '0',
          quantity_week30: rs.getValue(rs.columns[34]) ? rs.getValue(rs.columns[34]) : '0',
          quantity_week31: rs.getValue(rs.columns[35]) ? rs.getValue(rs.columns[35]) : '0',
          quantity_week32: rs.getValue(rs.columns[36]) ? rs.getValue(rs.columns[36]) : '0',
          quantity_week33: rs.getValue(rs.columns[37]) ? rs.getValue(rs.columns[37]) : '0',
          quantity_week34: rs.getValue(rs.columns[38]) ? rs.getValue(rs.columns[38]) : '0',
          quantity_week35: rs.getValue(rs.columns[39]) ? rs.getValue(rs.columns[39]) : '0',
          quantity_week36: rs.getValue(rs.columns[40]) ? rs.getValue(rs.columns[40]) : '0',
          quantity_week37: rs.getValue(rs.columns[41]) ? rs.getValue(rs.columns[41]) : '0',
          quantity_week38: rs.getValue(rs.columns[42]) ? rs.getValue(rs.columns[42]) : '0',
          quantity_week39: rs.getValue(rs.columns[43]) ? rs.getValue(rs.columns[43]) : '0',
          quantity_week40: rs.getValue(rs.columns[44]) ? rs.getValue(rs.columns[44]) : '0',
          quantity_week41: rs.getValue(rs.columns[45]) ? rs.getValue(rs.columns[45]) : '0',
          quantity_week42: rs.getValue(rs.columns[46]) ? rs.getValue(rs.columns[46]) : '0',
          quantity_week43: rs.getValue(rs.columns[47]) ? rs.getValue(rs.columns[47]) : '0',
          quantity_week44: rs.getValue(rs.columns[48]) ? rs.getValue(rs.columns[48]) : '0',
          quantity_week45: rs.getValue(rs.columns[49]) ? rs.getValue(rs.columns[49]) : '0',
          quantity_week46: rs.getValue(rs.columns[50]) ? rs.getValue(rs.columns[50]) : '0',
          quantity_week47: rs.getValue(rs.columns[51]) ? rs.getValue(rs.columns[51]) : '0',
          quantity_week48: rs.getValue(rs.columns[52]) ? rs.getValue(rs.columns[52]) : '0',
          quantity_week49: rs.getValue(rs.columns[53]) ? rs.getValue(rs.columns[53]) : '0',
          quantity_week50: rs.getValue(rs.columns[54]) ? rs.getValue(rs.columns[54]) : '0',
          quantity_week51: rs.getValue(rs.columns[55]) ? rs.getValue(rs.columns[55]) : '0',
          quantity_week52: rs.getValue(rs.columns[56]) ? rs.getValue(rs.columns[56]) : '0',
          quantity_week53: rs.getValue(rs.columns[59]) ? rs.getValue(rs.columns[59]) : '0',
          item_leve: rs.getValue(rs.columns[57]), // 产品分级
          itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
        })
      })
    }

    var filters = [
      { name: 'custrecord_demand_forecast_l_data_type', join: 'custrecord_demand_forecast_parent', operator: 'anyof', values: ['22'] },
      { name: 'custrecord_demand_forecast_l_date', join: 'custrecord_demand_forecast_parent', operator: 'on', values: today }
    ]

    if (account) {
      filters.push({ name: 'custrecord_demand_forecast_account', operator: 'anyof', values: account })
    }

    filters.push({ name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: sku_arrys })

    if (site) {
      filters.push({ name: 'custrecord_demand_forecast_site', operator: 'anyof', values: site })
    }
    var mySearch_delivery_schedule = search.create({
      type: 'customrecord_demand_forecast',
      filters: filters,
      columns: cols
    })
    var pageData_delivery_schedule = mySearch_delivery_schedule.runPaged({
      pageSize: pageSize
    })
    var totalCount = pageData_delivery_schedule.count; // 总数
    var pageCount = pageData_delivery_schedule.pageRanges.length; // 页数
    if (totalCount == 0 && pageCount == 0) {
      rsJson.result = []
      rsJson.totalCount = totalCount
      rsJson.pageCount = pageCount
      return rsJson
    } else {
      pageData_delivery_schedule.fetch({
        index: Number(nowPage - 1)
      }).data.forEach(function (rs) {
        item_data.push({
          item_sku: rs.getValue(rs.columns[2]),
          item_sku_text: rs.getText(rs.columns[2]),
          item_name: rs.getValue(rs.columns[3]),
          account: rs.getValue(rs.columns[0]),
          account_text: rs.getText(rs.columns[0]),
          site: rs.getValue(rs.columns[1]),
          data_type: rs.getValue(rs.columns[4]),
          data_type_text: rs.getText(rs.columns[4]),
          quantity_week1: rs.getValue(rs.columns[5]) ? rs.getValue(rs.columns[5]) : '0',
          quantity_week2: rs.getValue(rs.columns[6]) ? rs.getValue(rs.columns[6]) : '0',
          quantity_week3: rs.getValue(rs.columns[7]) ? rs.getValue(rs.columns[7]) : '0',
          quantity_week4: rs.getValue(rs.columns[8]) ? rs.getValue(rs.columns[8]) : '0',
          quantity_week5: rs.getValue(rs.columns[9]) ? rs.getValue(rs.columns[9]) : '0',
          quantity_week6: rs.getValue(rs.columns[10]) ? rs.getValue(rs.columns[10]) : '0',
          quantity_week7: rs.getValue(rs.columns[11]) ? rs.getValue(rs.columns[11]) : '0',
          quantity_week8: rs.getValue(rs.columns[12]) ? rs.getValue(rs.columns[12]) : '0',
          quantity_week9: rs.getValue(rs.columns[13]) ? rs.getValue(rs.columns[13]) : '0',
          quantity_week10: rs.getValue(rs.columns[14]) ? rs.getValue(rs.columns[14]) : '0',
          quantity_week11: rs.getValue(rs.columns[15]) ? rs.getValue(rs.columns[15]) : '0',
          quantity_week12: rs.getValue(rs.columns[16]) ? rs.getValue(rs.columns[16]) : '0',
          quantity_week13: rs.getValue(rs.columns[17]) ? rs.getValue(rs.columns[17]) : '0',
          quantity_week14: rs.getValue(rs.columns[18]) ? rs.getValue(rs.columns[18]) : '0',
          quantity_week15: rs.getValue(rs.columns[19]) ? rs.getValue(rs.columns[19]) : '0',
          quantity_week16: rs.getValue(rs.columns[20]) ? rs.getValue(rs.columns[20]) : '0',
          quantity_week17: rs.getValue(rs.columns[21]) ? rs.getValue(rs.columns[21]) : '0',
          quantity_week18: rs.getValue(rs.columns[22]) ? rs.getValue(rs.columns[22]) : '0',
          quantity_week19: rs.getValue(rs.columns[23]) ? rs.getValue(rs.columns[23]) : '0',
          quantity_week20: rs.getValue(rs.columns[24]) ? rs.getValue(rs.columns[24]) : '0',
          quantity_week21: rs.getValue(rs.columns[25]) ? rs.getValue(rs.columns[25]) : '0',
          quantity_week22: rs.getValue(rs.columns[26]) ? rs.getValue(rs.columns[26]) : '0',
          quantity_week23: rs.getValue(rs.columns[27]) ? rs.getValue(rs.columns[27]) : '0',
          quantity_week24: rs.getValue(rs.columns[28]) ? rs.getValue(rs.columns[28]) : '0',
          quantity_week25: rs.getValue(rs.columns[29]) ? rs.getValue(rs.columns[29]) : '0',
          quantity_week26: rs.getValue(rs.columns[30]) ? rs.getValue(rs.columns[30]) : '0',
          quantity_week27: rs.getValue(rs.columns[31]) ? rs.getValue(rs.columns[31]) : '0',
          quantity_week28: rs.getValue(rs.columns[32]) ? rs.getValue(rs.columns[32]) : '0',
          quantity_week29: rs.getValue(rs.columns[33]) ? rs.getValue(rs.columns[33]) : '0',
          quantity_week30: rs.getValue(rs.columns[34]) ? rs.getValue(rs.columns[34]) : '0',
          quantity_week31: rs.getValue(rs.columns[35]) ? rs.getValue(rs.columns[35]) : '0',
          quantity_week32: rs.getValue(rs.columns[36]) ? rs.getValue(rs.columns[36]) : '0',
          quantity_week33: rs.getValue(rs.columns[37]) ? rs.getValue(rs.columns[37]) : '0',
          quantity_week34: rs.getValue(rs.columns[38]) ? rs.getValue(rs.columns[38]) : '0',
          quantity_week35: rs.getValue(rs.columns[39]) ? rs.getValue(rs.columns[39]) : '0',
          quantity_week36: rs.getValue(rs.columns[40]) ? rs.getValue(rs.columns[40]) : '0',
          quantity_week37: rs.getValue(rs.columns[41]) ? rs.getValue(rs.columns[41]) : '0',
          quantity_week38: rs.getValue(rs.columns[42]) ? rs.getValue(rs.columns[42]) : '0',
          quantity_week39: rs.getValue(rs.columns[43]) ? rs.getValue(rs.columns[43]) : '0',
          quantity_week40: rs.getValue(rs.columns[44]) ? rs.getValue(rs.columns[44]) : '0',
          quantity_week41: rs.getValue(rs.columns[45]) ? rs.getValue(rs.columns[45]) : '0',
          quantity_week42: rs.getValue(rs.columns[46]) ? rs.getValue(rs.columns[46]) : '0',
          quantity_week43: rs.getValue(rs.columns[47]) ? rs.getValue(rs.columns[47]) : '0',
          quantity_week44: rs.getValue(rs.columns[48]) ? rs.getValue(rs.columns[48]) : '0',
          quantity_week45: rs.getValue(rs.columns[49]) ? rs.getValue(rs.columns[49]) : '0',
          quantity_week46: rs.getValue(rs.columns[50]) ? rs.getValue(rs.columns[50]) : '0',
          quantity_week47: rs.getValue(rs.columns[51]) ? rs.getValue(rs.columns[51]) : '0',
          quantity_week48: rs.getValue(rs.columns[52]) ? rs.getValue(rs.columns[52]) : '0',
          quantity_week49: rs.getValue(rs.columns[53]) ? rs.getValue(rs.columns[53]) : '0',
          quantity_week50: rs.getValue(rs.columns[54]) ? rs.getValue(rs.columns[54]) : '0',
          quantity_week51: rs.getValue(rs.columns[55]) ? rs.getValue(rs.columns[55]) : '0',
          quantity_week52: rs.getValue(rs.columns[56]) ? rs.getValue(rs.columns[56]) : '0',
          quantity_week53: rs.getValue(rs.columns[59]) ? rs.getValue(rs.columns[59]) : '0',
          item_leve: rs.getValue(rs.columns[57]), // 产品分级
          itemf_leve: rs.getValue(rs.columns[58]), // 产品初始分级
        })
      })
    }

    var transport,presT,itm,mar
    var tansWays = [],trans_arrys = []
    // 查找默认运输方式
    search.create({
      type: 'customrecord_sku_site_default_ship',
      filters: [
        { name: 'custrecord_marker', operator: 'anyof', values: markect_arrys },
        { name: 'custrecord_sku_num', operator: 'anyof', values: sku_arrys}
      ],
      columns: [
        { name: 'custrecord_ship' },
        { name: 'custrecord_marker' },
        { name: 'custrecord_sku_num' }
      ]
    })
      .run()
      .each(function (rec) {
        transport = rec.getValue('custrecord_ship')
        mar = rec.getValue('custrecord_marker')
        itm = rec.getValue('custrecord_sku_num')
        tansWays.push(transport)
        var ks = false
        SKUIds.map(function (li) {
          if (ks) return
          if (li.item_sku == itm && li.markect == mar) {
            trans_arrys.push({
              'itms': itm,
              'acc': li.forecast_account,
              'transport': transport,
              'mar': mar
            })
            ks = true
          }
        })
        return true
      })
    if (tansWays.length > 0)
      // 运输时效
      search
        .create({
          type: 'customrecord_logistics_cycle',
          filters: [
            { name: 'custrecord_market', operator: 'anyof', values: markect_arrys },
            { name: 'custrecord_default_type_shipping', operator: 'anyof', values: tansWays}
          ],
          columns: [
            { name: 'custrecord_prescription' },
            { name: 'custrecord_default_type_shipping' },
            { name: 'custrecord_market' }
          ]
        })
        .run()
        .each(function (rec) {
          mar = rec.getValue('custrecord_market')
          transport = rec.getValue('custrecord_prescription')
          presT = rec.getValue('custrecord_prescription')
          trans_arrys.map(function (lt) {
            var ls = true
            if (lt.transport == transport && lt.mar == mar) {
              presT_arrys.map(function (lds) {
                if (lds.itms == lt.itm) {
                  ls = false
                }
              })
              if (ls)
                presT_arrys.push({
                  'itms': lt.itm,
                  'acc': lt.acc,
                  'transport': transport,
                  'mar': mar,
                  'presT': presT
                })
            }
          })
          return true
        })
    // SKUIds.map(function (li) {
    //   var fs = true
    //   presT_arrys.map(function (dd) {
    //     if (dd.acc == li.forecast_account && dd.itms == li.item_sku) {
    //       item_data.push({
    //         item_sku: li.item_sku,
    //         item_sku_text: li.item_sku_name,
    //         item_name: li.item_name,
    //         account: li.forecast_account,
    //         account_text: li.forecast_account_name,
    //         site: li.forecast_site,
    //         data_type: '5',
    //         data_type_text: '调拨计划量',
    //         item_leve: li['item_leve'], // 产品分级
    //         itemf_leve: li['itemf_leve'], // 产品初始分级
    //         need_time: dd.presT
    //       })
    //       fs = false
    //     }
    //   })
    //   if (fs)
    //     item_data.push({
    //       item_sku: li.item_sku,
    //       item_sku_text: li.item_sku_name,
    //       item_name: li.item_name,
    //       account: li.forecast_account,
    //       account_text: li.forecast_account_name,
    //       site: li.forecast_site,
    //       data_type: '5',
    //       data_type_text: '调拨计划量',
    //       item_leve: li['item_leve'], // 产品分级
    //       itemf_leve: li['itemf_leve'], // 产品初始分级
    //       need_time: ''
    //     })
    // })
    SKUIds.map(function (li) {
      item_data.push({
        item_sku: li.item_sku,
        item_sku_text: li.item_sku_name,
        item_name: li.item_name,
        account: li.forecast_account,
        account_text: li.forecast_account_name,
        site: li.forecast_site,
        data_type: '19',
        data_type_text: '建议处理情况',
        item_leve: li['item_leve'], // 产品分级
        itemf_leve: li['itemf_leve'], // 产品初始分级
      })
    })

    rsJson.result = item_data
    rsJson.totalCount = totalCount
    rsJson.pageCount = pageCount
    log.debug('rsJson.result', rsJson.result)
    return rsJson
  }

  /**
  * 创建行数据
  * @param {*} data 
  */
  function createLineData (form, result, date_from, date_to) {
    var week = {}

    var today = new Date(+new Date() + 8 * 3600 * 1000)
    var week_objs = weekofday(today, date_from, date_to)
    func_type = week_objs.func_type
    week_rs = week_objs.weeks
    log.audit('week_rs', week_rs)

    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
    // var today_l = moment(new Date().getTime()).format(dateFormat)
    var today_l = moment(new Date(+new Date() + 8 * 3600 * 1000).getTime()).format(dateFormat)
    log.debug('today_l', today_l)

    var sublist = form.addSublist({ id: 'custpage_sublist', type: ui.SublistType.LIST, label: '调拨计划例外信息', tab: 'custpage_tab' })
    sublist.helpText = '调拨计划结果'
    sublist.addField({ id: 'custpage_store_name', label: '店铺名', type: ui.FieldType.TEXT })
    sublist.addField({ id: 'custpage_store_name_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN})
    sublist.addField({ id: 'custpage_item_sku', label: 'sku', type: ui.FieldType.TEXT })
    sublist.addField({ id: 'custpage_item_sku_id', label: 'sku_id', type: ui.FieldType.TEXT }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN})
    sublist.addField({ id: 'custpage_item_name', label: '产品名称', type: ui.FieldType.TEXT })
    sublist.addField({ id: 'custpage_item_leve', label: '产品分级', type: ui.FieldType.SELECT,  source: 'customlist_product_grading'}).updateDisplayType({displayType: ui.FieldDisplayType.INLINE})
    sublist.addField({ id: 'custpage_item_start_leve', label: '产品初始分级', type: ui.FieldType.SELECT, source: 'customlist_product_grading' }).updateDisplayType({displayType: ui.FieldDisplayType.INLINE})
    sublist.addField({ id: 'custpage_data_type', label: '数据类型', type: ui.FieldType.TEXT })
    sublist.addField({ id: 'custpage_data_type_id', label: '数据类型id', type: ui.FieldType.TEXT }).updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN})
    var year = new Date(date_from).getFullYear()
    week_rs.map(function (wek) {
      var sub_filed = 'custpage_quantity_week' + wek
      var ff = wek
      if (func_type == 'B' && wek < week_rs[0]) // 跨年，明年的第一周不要
        ff = wek - 1
      var format = 'MM/dd' + ''
      var str_date = weekGetDate(year, ff, format)
      var Label = 'W' + ff + '(' + str_date + ')'
      Label = Label.replace(/[-]{5}/g, ',')
      week_ = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER })
      week_.defaultValue = '0'
      week[wek] = week_
    })
    for (var s = 1; s < 54; s++) {
      var sub_filed = 'custpage_quantity_weekhi' + s
      var Label = 'Whi' + s
      var week_hi = sublist.addField({ id: sub_filed, label: Label, type: ui.FieldType.INTEGER }) // INTEGER
      week_hi.defaultValue = '0'
      week_hi.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN})
    }
    var zl = 0, data_arr = []
    var skucs = []
    SKUIds.map(function (fs) {
      if (JSON.stringify(sku_arrys).indexOf(fs.item_sku) > -1) {
        skucs.push(fs)
      }
    })
    for (var z = 0; z < skucs.length; z++) {
      if (result.length > 0) {
        var need1_zl, need2_zl, need3_zl
        for (var a = 0; a < result.length; a++) {
          if (skucs[z]['item_sku'] == result[a]['item_sku'] && skucs[z]['forecast_account'] == result[a]['account']) {
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
            // 店铺净需求
            if (result[a]['data_type'] == 3) {
              week_rs.map(function (wek) {
                var sub_filed = 'custpage_quantity_week' + wek
                if (result[a]['quantity_week' + wek]) {
                  sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + wek]).toString() ? Math.abs(result[a]['quantity_week' + wek]).toString() : '0', line: zl}); // 净需求量
                }
              })
              for (var s = 1; s < 54; s++) {
                var sub_filed = 'custpage_quantity_weekhi' + s
                sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + s]).toString() ? Math.abs(result[a]['quantity_week' + s]).toString() : '0', line: zl})
              }
              zl++
            }
            // 计划量
            if (result[a]['data_type'] == 6) {
              week_rs.map(function (wek) {
                var sub_filed = 'custpage_quantity_week' + wek
                if (result[a]['quantity_week' + wek]) {
                  sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + wek]).toString() ? Math.abs(result[a]['quantity_week' + wek]).toString() : '0', line: zl}); // 净需求量
                }
              })
              for (var s = 1; s < 54; s++) {
                var sub_filed = 'custpage_quantity_weekhi' + s
                sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + s]).toString() ? Math.abs(result[a]['quantity_week' + s]).toString() : '0', line: zl})
              }
              need2_zl = zl
              zl++
            }

            // 修改量
            if (result[a]['data_type'] == 22) {
              week_rs.map(function (wek) {
                var sub_filed = 'custpage_quantity_week' + wek
                if (result[a]['quantity_week' + wek]) {
                  sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + wek]).toString() ? Math.abs(result[a]['quantity_week' + wek]).toString() : '0', line: zl}); // 净需求量
                }
              })
              for (var s = 1; s < 54; s++) {
                var sub_filed = 'custpage_quantity_weekhi' + s
                sublist.setSublistValue({ id: sub_filed, value: Math.abs(result[a]['quantity_week' + s]).toString() ? Math.abs(result[a]['quantity_week' + s]).toString() : '0', line: zl})
              }
              need1_zl = zl
              zl++
            }
            // 差异数量 需要倒排，根据修改计划量倒排，算出建议情况,xiugai - jihua 
            if (result[a]['data_type'] == 19) {
              var wekd
              presT_arrys.map(function (pt) {
                if (pt.itms == result[a]['item_sku'] && pt.acc == result[a]['account'])
                  wekd = getWeek(pt.presT, func_type)
              })
              if (!wekd) wekd = 0
              week_rs.map(function (wek) {
                var sub_filed = 'custpage_quantity_week' + (wek)
                var need_filed = 'custpage_quantity_weekhi' + (wek + wekd)
                var x1 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need1_zl}) : 0
                var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need2_zl}) : 0
                var x11 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: need_filed, line: need2_zl}) : 0
                if (wekd == 0) {
                  x11 = 0
                }
                var x3 = Math.round(x2) - Math.round(x1) + Math.round(x11)
                sublist.setSublistValue({ id: sub_filed, value: x3.toString() ? x3.toString() : '0', line: zl})
              })

              for (var s = 1; s < 54; s++) {
                var sub_filed = 'custpage_quantity_weekhi' + (s)
                var need_filed = 'custpage_quantity_weekhi' + (s + wekd)
                var x1 = need1_zl || need1_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need1_zl}) : 0
                var x2 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: sub_filed, line: need2_zl}) : 0
                var x11 = need2_zl || need2_zl == 0 ? sublist.getSublistValue({ id: need_filed, line: need2_zl}) : 0
                if (wekd == 0) {
                  x11 = 0
                }
                var x3 = Math.round(x2) - Math.round(x1) + Math.round(x11)
                sublist.setSublistValue({ id: sub_filed, value: x3.toString() ? x3.toString() : '0', line: zl})
              }

              need3_zl = zl
              zl++
            }
          }
        }
      }
    }
    return data_arr
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
       * 格式化时间函数
       * @param {format} 时间显示格式
       */
  Date.prototype.Format = function (fmt) { // 需要JS格式化时间，后期做的时候方便使用
    var o = {
      'M+': this.getMonth() + 1, // 月份
      'd+': this.getDate(), // 日
      'h+': this.getHours(), // 小时
      'm+': this.getMinutes(), // 分
      's+': this.getSeconds(), // 秒
      'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
      'S': this.getMilliseconds() // 毫秒
    }
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length))
    for (var k in o)
      if (new RegExp('(' + k + ')').test(fmt))
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
    return fmt
  }

  // 通过周取日期范围   year 年   weeks 周
  function weekGetDate (year, weeks, format) {
    var date = new Date(year, '0', '1')

    // 获取当前星期几,0:星期一
    var time = date.getTime()
    // 当这一年的1月1日为周日时则本年有54周,否则没有54周,没有则去除第54周的提示
    var _week = date.getDay()

    if (_week != 0) { // 一年53周情况
      if (weeks == 54) {
        return '今年没有54周'
      }
      var cnt = 0; // 获取距离周末的天数
      if (_week == 0) {
        cnt = 7
      } else if (_week == 1) {
        cnt = 6
      } else if (_week == 2) {
        cnt = 5
      } else if (_week == 3) {
        cnt = 4
      } else if (_week == 4) {
        cnt = 3
      } else if (_week == 5) {
        cnt = 2
      } else if (_week == 6) {
        cnt = 1
      }
      cnt += 1; // 加1表示以星期一为一周的第一天    // 将这个长整形时间加上第N周的时间偏移
      time += cnt * 24 * 3600000; // 第2周开始时间
      var nextYear = new Date(parseInt(year, 10) + 1, '0', '1')
      var nextWeek = nextYear.getDay()
      var lastcnt = 0; // 获取最后一周开始时间到周末的天数
      if (nextWeek == 0) {
        lastcnt = 6
      } else if (nextWeek == 1) {
        lastcnt = 0
      } else if (nextWeek == 2) {
        lastcnt = 1
      } else if (nextWeek == 3) {
        lastcnt = 2
      } else if (nextWeek == 4) {
        lastcnt = 3
      } else if (nextWeek == 5) {
        lastcnt = 4
      } else if (nextWeek == 6) {
        lastcnt = 5
      }
      if (weeks == 1) { // 第1周特殊处理    // 为日期对象 date 重新设置成时间 time
        var start = date.Format(format)
        date.setTime(time - 24 * 3600000)
        var end = date.Format(format)
        return start + '-----' + end
      } else if (weeks == 53) { // 第53周特殊处理
        // 第53周开始时间
        var start = time + (weeks - 2) * 7 * 24 * 3600000
        // 第53周结束时间
        var end = time + (weeks - 2) * 7 * 24 * 3600000 + lastcnt * 24 * 3600000 - 24 * 3600000
        date.setTime(start)
        var _start = date.Format(format)
        date.setTime(end)
        var _end = date.Format(format)
        return _start + '-----' + _end
      } else {
        var start = time + (weeks - 2) * 7 * 24 * 3600000; // 第n周开始时间
        var end = time + (weeks - 1) * 7 * 24 * 3600000 - 24 * 3600000; // 第n周结束时间
        date.setTime(start)
        var _start = date.Format(format)
        date.setTime(end)
        var _end = date.Format(format)
        return _start + '-----' + _end
      }
    } else { // 一年54周情况
      var cnt = 0; // 获取距离周末的天数
      if (_week == 0 && weeks == 1) { // 第一周
        cnt = 0
      } else if (_week == 0) {
        cnt = 7
      } else if (_week == 1) {
        cnt = 6
      } else if (_week == 2) {
        cnt = 5
      } else if (_week == 3) {
        cnt = 4
      } else if (_week == 4) {
        cnt = 3
      } else if (_week == 5) {
        cnt = 2
      } else if (_week == 6) {
        cnt = 1
      }
      cnt += 1; // 加1表示以星期一为一周的第一天
      // 将这个长整形时间加上第N周的时间偏移
      time += 24 * 3600000; // 第2周开始时间
      var nextYear = new Date(parseInt(year, 10) + 1, '0', '1')
      var nextWeek = nextYear.getDay()
      var lastcnt = 0; // 获取最后一周开始时间到周末的天数
      if (nextWeek == 0) {
        lastcnt = 6
      } else if (nextWeek == 1) {
        lastcnt = 0
      } else if (nextWeek == 2) {
        lastcnt = 1
      } else if (nextWeek == 3) {
        lastcnt = 2
      } else if (nextWeek == 4) {
        lastcnt = 3
      } else if (nextWeek == 5) {
        lastcnt = 4
      } else if (nextWeek == 6) {
        lastcnt = 5
      }
      if (weeks == 1) { // 第1周特殊处理
        var start = date.Format(format)
        date.setTime(time - 24 * 3600000)
        var end = date.Format(format)
        return _start + '-----' + end
      } else if (weeks == 54) { // 第54周特殊处理
        // 第54周开始时间
        var start = time + (weeks - 2) * 7 * 24 * 3600000
        // 第53周结束时间
        var end = time + (weeks - 2) * 7 * 24 * 3600000 + lastcnt * 24 * 3600000 - 24 * 3600000
        date.setTime(start)
        var _start = date.Format(format)
        date.setTime(end)
        var _end = date.Format(format)
        return _start + '-----' + _end
      } else {
        var start = time + (weeks - 2) * 7 * 24 * 3600000; // 第n周开始时间
        var end = time + (weeks - 1) * 7 * 24 * 3600000 - 24 * 3600000; // 第n周结束时间
        date.setTime(start)
        var _start = date.Format(format)
        date.setTime(end)
        var _end = date.Format(format)
        return _start + '-----' + _end
      }
    }
  }
  return {
    onRequest: onRequest
  }
})
