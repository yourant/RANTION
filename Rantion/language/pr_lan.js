/**
 * @NModuleScope Public
 * @author 
 * @description 多语言配置文件
 * @NModuleScope public
 */
define(['N/runtime'], function (runtime) {
  var prBatchImportParam = {'zh_CN': {
      'custpage_search_group': '查询条件',
      'custpage_batch_import_subsidiary': '子公司',
      'custpage_batch_import_batchid': '批次号',
      'custpage_batch_import_begin_time': '请购单查询开始日期',
      'custpage_batch_import_end_time': '请购单查询结束日期',
      'custpage_batch_import_pr': '请购单',
      'custpage_batch_import_sublist': '查询结果',
      'custpage_batch_import_checkbox': '勾选框',
      'custpage_batch_import_batch_id': '批次号',
      'custpage_batch_import_id': '内部标识',
      'custpage_batch_import_request_body': '请求者',
      'custpage_batch_import_create_date': '创建日期',
      'custpage_batch_import_purchase_type': '请购单类型',
      'custpage_batch_import_sublist_subdiary': '子公司',
      'custpage_batch_import_sublist_location': '地点',
      'custpage_batch_import_sublist_currency': '货币',
      'custpage_batch_import_plan_body': '计划员',
      'custpage_batch_import_store': '店铺',
      'custpage_batch_import_btn': '批量导入'
    },'en_US': {
      'custpage_search_group': 'search condition',
      'custpage_batch_import_subsidiary': 'subsidiary',
      'custpage_batch_import_batchid': 'batch id',
      'custpage_batch_import_begin_time': 'search begin date',
      'custpage_batch_import_end_time': 'search end date',
      'custpage_batch_import_pr': 'requisition order',
      'custpage_batch_import_sublist': 'search results',
      'custpage_batch_import_checkbox': 'check',
      'custpage_batch_import_batch_id': 'batch id',
      'custpage_batch_import_id': 'import id',
      'custpage_batch_import_request_body': 'requester',
      'custpage_batch_import_create_date': 'create date',
      'custpage_batch_import_purchase_type': 'purchase type',
      'custpage_batch_import_sublist_subdiary': 'subsidiary',
      'custpage_batch_import_sublist_location': 'location',
      'custpage_batch_import_sublist_currency': 'currency',
      'custpage_batch_import_plan_body': 'planner',
      'custpage_batch_import_store': 'store',
      'custpage_batch_import_btn': 'Batch Import'
  }}

  return {
    prBatchImportParam: prBatchImportParam
  }
})
