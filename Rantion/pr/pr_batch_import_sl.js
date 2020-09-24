/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@author Elias
 *@description 批量转请购单
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', '../Helper/Moment.min', 'N/runtime', 'N/format', '../language/pr_lan'],
  function (serverWidget, search, record, moment, runtime, format, systemLan) {
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')

    var language = runtime.getCurrentUser().getPreference({name: 'LANGUAGE'})
    var languageParam = systemLan.prBatchImportParam

    function onRequest (context) {
      log.debug('当前语言', language)
      if (JSON.stringify(language).indexOf('CN') > -1) {
        language = 'zh_CN';
      }else {
        language = 'en_US';
      }
      var response = context.response
      var request = context.request
      var method = request.method
      var params = request.parameters; // 参数
      log.debug('params', params)
      if (method == 'GET') {
        // 首次进入工作台渲染
        var form = initUI(); // 渲染查询条件UI界面
        var unchangedPrArr = searchBatchImportPrRes('', '', '', '')
        log.error({
          title: '返回的结果',
          details: JSON.stringify(unchangedPrArr)
        })
        setResultToForm(unchangedPrArr, form)
        response.writePage(form)
      } else {
        // 点击刷新时进行查询
        var action = params.action
        if (action == 'transform') {
          var data = params.data
          data = JSON.parse(data)
          var err = []
          try {
            var itemResultArr = searchAllChoosedItem(data);
            log.debug('itemResultArr',itemResultArr);
            // if(itemResultArr.length > 0){
            //   var err_sku = [], msgStr;
            //   for(var i = 0; i < itemResultArr.length; i++){
            //     if(!itemResultArr[i].getValue('vendor')){
            //       err_sku.push(itemResultArr[i].getValue('itemid'))
            //     }
            //   }
            //   if(err_sku.length > 0){
            //     msgStr = 'sku为：' + err_sku + '没有默认供应商';
            //     response.write({output: msgStr});
            //     return;
            //   }
            // }
            var resStr = ''
            for (var z = 0;z < data.length;z++) {
              var loadId = Number(data[z])
              try {
                var receiptId = transformRecordToPr(loadId, itemResultArr)
                log.error({
                  title: 'id',
                  details: receiptId
                })
                resStr = resStr + '内部标识为' + loadId + '的记录成功转换为请购单，其记录的id为:' + receiptId + '\n'
              } catch (error) {
                resStr = resStr + '内部标识为 ' + loadId + ' 的记录转换失败'
                log.error({
                  title: '报错信息',
                  details: JSON.stringify(error)
                })
              }
            }
          } catch(e) {
            log.error({
              title: '报错信息',
              details: JSON.stringify(e)
            })
            err.push(e.message)
          }
          if (err.length > 0) {
            resStr = resStr + ' 记录转换失败:' + JSON.stringify(err)
          }
          response.write({output: resStr})
        }else {
          var subsidiary = params.custpage_batch_import_subsidiary
          var import_type = params.custrecord_pr_batch_import_type; // 请购单类型
          var beginDate = params.custpage_batch_import_begin_time
          var endDate = params.custpage_batch_import_end_time
          var unchangedPrArr = searchBatchImportPrRes(subsidiary, import_type, beginDate, endDate)
          var form = initUI(); // 渲染查询条件UI界面
          form.updateDefaultValues({
            custpage_batch_import_subsidiary: subsidiary,
            custrecord_pr_batch_import_type: import_type,
            custpage_batch_import_begin_time: beginDate,
            custpage_batch_import_end_time: endDate
          })
          setResultToForm(unchangedPrArr, form)
          response.writePage(form)
        }
      }
    }

    /**
     * 初始化ui
     */
    function initUI () {
      var form = serverWidget.createForm(language == 'zh_CN' ? '批量导入请购单' : 'batch import requisition order')
      form.addFieldGroup({
        id: 'custpage_search_group',
        label: languageParam[language]['custpage_search_group']
      })
      var subsidiaryField = form.addField({
        id: 'custpage_batch_import_subsidiary',
        type: serverWidget.FieldType.SELECT,
        source: 'subsidiary',
        label: languageParam[language]['custpage_batch_import_subsidiary'],
        container: 'custpage_search_group'
      })
      // var batchField = form.addField({
      //     id: 'custpage_batch_import_batchid',
      //     type: serverWidget.FieldType.TEXT,
      //     label:  languageParam[language]['custpage_batch_import_batchid'],
      //     container: 'custpage_search_group'
      // })
      var beginTimeField = form.addField({
        id: 'custpage_batch_import_begin_time',
        type: serverWidget.FieldType.DATE,
        label: languageParam[language]['custpage_batch_import_begin_time'],
        container: 'custpage_search_group'
      })
      var endtimeField = form.addField({
        id: 'custpage_batch_import_end_time',
        type: serverWidget.FieldType.DATE,
        label: languageParam[language]['custpage_batch_import_end_time'],
        container: 'custpage_search_group'
      })

      // //==========查询条件end==================================================================

      // 创建显示结果的子列表
      form.addSubtab({
        id: 'custpage_batch_import_pr',
        label: languageParam[language]['custpage_batch_import_pr']
      })

      // //==========查询结果begin================================================================
      var sublist = form.addSublist({
        id: 'custpage_batch_import_sublist',
        type: serverWidget.SublistType.LIST,
        label: languageParam[language]['custpage_batch_import_sublist'],
        tab: 'custpage_batch_import_sub_tab'
      })
      sublist.addMarkAllButtons(); // 标记全部
      sublist.addField({
        id: 'custpage_batch_import_checkbox',
        type: serverWidget.FieldType.CHECKBOX,
        label: languageParam[language]['custpage_batch_import_checkbox']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL
      }) // 勾选框
      // sublist.addField({
      //     id: 'custpage_batch_import_batch_id',
      //     type: serverWidget.FieldType.TEXT,
      //     label:  languageParam[language]['custpage_batch_import_batch_id']
      // }).updateDisplayType({
      //     displayType: serverWidget.FieldDisplayType.NORMAL
      // }); //批次号
      sublist.addField({
        id: 'custpage_batch_import_id',
        type: serverWidget.FieldType.TEXT,
        label: languageParam[language]['custpage_batch_import_id']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.NORMAL
      })
      sublist.addField({
        id: 'custpage_batch_import_request_body',
        type: serverWidget.FieldType.SELECT,
        source: 'employee',
        label: languageParam[language]['custpage_batch_import_request_body']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      })
      sublist.addField({
        id: 'custpage_batch_import_create_date',
        type: serverWidget.FieldType.DATE,
        label: languageParam[language]['custpage_batch_import_create_date']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      }) //
      sublist.addField({
        id: 'custpage_batch_import_purchase_type',
        type: serverWidget.FieldType.SELECT,
        source: 'customlist_dps_dps_gctype',
        label: languageParam[language]['custpage_batch_import_purchase_type']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      }); // 请购单类型
      sublist.addField({
        id: 'custpage_batch_import_sublist_subdiary',
        type: serverWidget.FieldType.SELECT,
        source: 'subsidiary',
        label: languageParam[language]['custpage_batch_import_sublist_subdiary']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      }); // 采购主体
      sublist.addField({
        id: 'custpage_batch_import_sublist_location',
        type: serverWidget.FieldType.SELECT,
        source: 'location',
        label: languageParam[language]['custpage_batch_import_sublist_location']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      }); // 地点
      sublist.addField({
        id: 'custpage_batch_import_sublist_currency',
        type: serverWidget.FieldType.TEXT,
        label: languageParam[language]['custpage_batch_import_sublist_currency']
      }).updateDisplayType({
        displayType: serverWidget.FieldDisplayType.INLINE
      }); // 货币
      // sublist.addField({
      //     id: 'custpage_batch_import_plan_body',
      //     type: serverWidget.FieldType.SELECT,
      //     source:'employee',
      //     label:  languageParam[language]['custpage_batch_import_plan_body']
      // }).updateDisplayType({
      //     displayType: serverWidget.FieldDisplayType.NORMAL
      // }); //计划员
      // sublist.addField({
      //     id: 'custpage_batch_import_store',
      //     type: serverWidget.FieldType.SELECT,
      //     source:'customrecord_aio_account',
      //     label:  languageParam[language]['custpage_batch_import_store']
      // }).updateDisplayType({
      //     displayType: serverWidget.FieldDisplayType.NORMAL
      // });//店铺
      // //==========查询结果end==================================================================

      form.addSubmitButton({
        label: language == 'zh_CN' ? '查询' : 'Search'
      })
      form.addResetButton({
        label: language == 'zh_CN' ? '重置' : 'Reset'
      })
      form.addButton({
        id: 'custpage_batch_import_btn',
        label: languageParam[language]['custpage_batch_import_btn'],
        functionName: 'batchImport()'
      })
      form.clientScriptModulePath = './pr_batch_import_cs.js'
      return form
    }

    /**
     * 查询未转换请购单的记录
     */
    function searchBatchImportPrRes (subsidiary, importType, beginDate, endDate) {
      var columns = [
        'custrecord_pr_batch_import_entity', // 员工
        'custrecord_pr_batch_import_trandate', // 创建日期
        'custrecord_pr_batch_import_subsidiary', // 子公司
        // 'custrecord_pr_batch_import_location',  //地点
        'custrecord_pr_batch_import_currency', // 货币
        'custrecord_pr_bi_wether_to_be_pr', // 是否已生成请购单
        'internalid',
        'custrecord_pr_batch_import_type' // 请购单类型
      ]
      var filters = []
      filters.push(search.createFilter({
        name: 'custrecord_pr_bi_wether_to_be_pr',
        operator: 'is',
        values: 'F'
      }))
      if (subsidiary != '' && subsidiary != null) {
        filters.push(search.createFilter({
          name: 'custrecord_pr_batch_import_subsidiary',
          operator: 'is',
          values: subsidiary
        }))
      }
      if (importType != '' && importType != null) {
        filters.push(search.createFilter({
          name: 'custrecord_pr_batch_import_type',
          operator: 'anyof',
          values: importType
        }))
      }
      // if(batchid!=''&&batchid!=null){
      //     filters.push(search.createFilter({
      //         name: 'custrecord_pr_batch_import_batch_id',
      //         operator: 'is',
      //         values:batchid
      //     }))
      // }
      if (beginDate != '' && beginDate != null) {
        filters.push(search.createFilter({
          name: 'custrecord_pr_batch_import_trandate',
          operator: 'onorafter',
          values: beginDate
        }))
      }
      if (endDate != '' && endDate != null) {
        filters.push(search.createFilter({
          name: 'custrecord_pr_batch_import_trandate',
          operator: 'onorbefore',
          values: endDate
        }))
      }
      var unchangedPrSearch = search.create({
        type: 'customrecord_pr_batch_import_headline',
        title: '查询未转换的请购单记录',
        columns: columns,
        filters: filters
      })
      var unchangedPrArr = []
      unchangedPrSearch.run().each(function (result) {
        log.error({
          title: '请购单转换记录',
          details: JSON.stringify(result)
        })
        unchangedPrArr.push(result)
        return true
      })
      return unchangedPrArr
    }

    /**
     * 将结果集展示到列表上
     * @param {*} unchangedPrArr 
     * @param {*} form 
     */
    function setResultToForm (unchangedPrArr, form) {
      log.debug('初始化，查看搜索结果集', unchangedPrArr)
      if (unchangedPrArr.length > 0) {
        var sublist = form.getSublist({
          id: 'custpage_batch_import_sublist'
        })
        for (var i = 0;i < unchangedPrArr.length;i++) {
          // sublist.setSublistValue({//批次号
          //     id: 'custpage_batch_import_batch_id',
          //     line: i,
          //     value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_batch_id')
          // })
          unchangedPrArr[i].getValue('internalid') ? sublist.setSublistValue({ // 内部标识
            id: 'custpage_batch_import_id',
            line: i,
            value: unchangedPrArr[i].getValue('internalid')
          }) : '';
          unchangedPrArr[i].getValue('custrecord_pr_batch_import_entity') ? sublist.setSublistValue({ // 请求者
            id: 'custpage_batch_import_request_body',
            line: i,
            value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_entity')
          }) : '';
          unchangedPrArr[i].getValue('custrecord_pr_batch_import_trandate') ? sublist.setSublistValue({ // 创建日期
            id: 'custpage_batch_import_create_date',
            line: i,
            value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_trandate')
          }) : '';
          unchangedPrArr[i].getValue('custrecord_pr_batch_import_type') ? sublist.setSublistValue({ // 请购单类型
            id: 'custpage_batch_import_purchase_type',
            line: i,
            value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_type')
          }) : ''; // 请购单类型
          unchangedPrArr[i].getValue('custrecord_pr_batch_import_subsidiary') ? sublist.setSublistValue({ // 子公司
            id: 'custpage_batch_import_sublist_subdiary',
            line: i,
            value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_subsidiary')
          }) : '';
          // var location= unchangedPrArr[i].getValue('custrecord_pr_batch_import_location')
          // if(location!=null&&location.length>0){
          //     sublist.setSublistValue({//地点
          //         id: 'custpage_batch_import_sublist_location',
          //         line: i,
          //         value:unchangedPrArr[i].getValue('custrecord_pr_batch_import_location')
          //     })
          // }
          var currency = unchangedPrArr[i].getText('custrecord_pr_batch_import_currency')
          if (currency) {
            sublist.setSublistValue({ // 货币
              id: 'custpage_batch_import_sublist_currency',
              line: i,
              value: unchangedPrArr[i].getText('custrecord_pr_batch_import_currency')
            })
          }
        // sublist.setSublistValue({//计划员
        //     id: 'custpage_batch_import_plan_body',
        //     line: i,
        //     value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_buyer')
        // })
        // sublist.setSublistValue({//店铺
        //     id: 'custpage_batch_import_store',
        //     line: i,
        //     value:  unchangedPrArr[i].getValue('custrecord_pr_batch_import_store')
        // })
        }
      }
    }

    /**
     * 将批量导入记录为id的转换成请购单
     * @param {*} id 
     */
    function transformRecordToPr (loadId, itemResultArr) {
      var objRecord = record.load({
        type: 'customrecord_pr_batch_import_headline',
        id: loadId
      })
      var customRecord = record.create({
        type: 'purchaserequisition',
        isDynamic: true
      })
      customRecord.setValue({ // 请求者
        fieldId: 'entity',
        value: objRecord.getValue('owner')
      })
      customRecord.setValue({ // 采购员
        fieldId: 'custbody_dps_owner',
        value: objRecord.getValue('custrecord_pr_batch_import_entity')
      })
      customRecord.setValue({ // 备注
        fieldId: 'memo',
        value: objRecord.getValue('custrecord_pr_batch_import_memo')
      })
      var dueDate = objRecord.getValue('custrecord_pr_batch_import_duedate')
      if (dueDate != null && dueDate != '') {
        customRecord.setValue({ // 收货日期
          fieldId: 'duedate',
          value: dueDate
        })
      }
      var trandate = objRecord.getValue('custrecord_pr_batch_import_trandate')
      customRecord.setValue({ // 创建日期
        fieldId: 'trandate',
        value: trandate
      })
      var poMethod = objRecord.getValue('custrecord_pr_batch_import_type')
      log.debug('请购单类型', poMethod)
      if (poMethod != null && poMethod != '') {
        customRecord.setValue({ // 请购单类型
          fieldId: 'custbody_dps_type',
          value: poMethod
        })
      }
      // var store=objRecord.getValue('custrecord_pr_batch_import_store')
      // if(store!=null&&store!=''){
      //     customRecord.setValue({//店铺
      //         fieldId: 'custbody_pr_store',
      //         value: store
      //     })
      // }
      customRecord.setValue({ // 子公司
        fieldId: 'subsidiary',
        value: objRecord.getValue('custrecord_pr_batch_import_subsidiary')
      })
      // var location= objRecord.getValue('custrecord_pr_batch_import_location')
      // if(location!=null&&location!=''){
      //     customRecord.setValue({//地点
      //         fieldId: 'location',
      //         value: location
      //     })
      // }
      // customRecord.setValue({//计划员
      //     fieldId: 'custbody_po_planner',
      //     value: objRecord.getValue('custrecord_pr_batch_import_buyer')
      // })
      var country = objRecord.getValue('custrecord_pr_batch_import_country')
      if (country != null && country != '') {
        customRecord.setValue({ // 国家
          fieldId: 'custbody_country',
          value: country
        })
      }
      var poType = objRecord.getValue('custrecord_pr_batch_import_po_type')
      if (poType != null && poType != '') {
        customRecord.setValue({ // 采购合同类型
          fieldId: 'custbody_po_type',
          value: poType
        })
      }
      var orderId = objRecord.getValue('custrecord_pr_batch_import_order_id')
      if (orderId != null && orderId != '') {
        customRecord.setValue({ // order id
          fieldId: 'custbody_origin_orderid',
          value: orderId
        })
      }
      var contractMemo = objRecord.getValue('custrecord_pr_batch_import_contract_memo')
      if (contractMemo != null && contractMemo != '') {
        customRecord.setValue({ // 采购合同备注
          fieldId: 'custbody_purchase_contract_notes',
          value: contractMemo
        })
      }
      customRecord.setValue({ // 设置审批状态为已通过
        fieldId: 'custbody_approval_status',
        value: '已通过'
      })
      var receiptId = setSublistValueToRecord(customRecord, objRecord, itemResultArr)
      return receiptId
    }

    /**
     * 
     * @param {*} customRecord 
     * @param {*} objRecord 
     */
    function setSublistValueToRecord (customRecord, objRecord, itemResultArr) {
      var objSublist = objRecord.getSublist({ // load出来的对象
        sublistId: 'recmachcustrecord_pr_batch_import_link'
      })
      var lineCount = objRecord.getLineCount({
        sublistId: 'recmachcustrecord_pr_batch_import_link'
      })
      var itemSublist = customRecord.getSublist({
        sublistId: 'item'
      })
      for (var x = 0;x < lineCount;x++) {
        customRecord.selectNewLine({
          sublistId: 'item'
        })
        // var needStatus = objRecord.getSublistValue({//需求状态
        //     sublistId: 'recmachcustrecord_pr_batch_import_link',
        //     fieldId: 'custrecord_pr_batch_import_need_status',
        //     line: x
        // })
        // log.debug("需求状态",needStatus)
        // customRecord.setCurrentSublistValue({
        //     sublistId: 'item',
        //     fieldId: 'custcol_purchased_demand_date',
        //     value: needStatus
        // })
        var sku = objRecord.getSublistValue({ // 货品
          sublistId: 'recmachcustrecord_pr_batch_import_link',
          fieldId: 'custrecord_pr_batch_import_item',
          line: x
        })
        log.debug('货品', sku)
        customRecord.setCurrentSublistValue({ // 设置货品
          sublistId: 'item',
          fieldId: 'item',
          value: sku
        })
        for (var m = 0;m < itemResultArr.length;m++) {
          var itemId = itemResultArr[m].getValue('internalid')
          var description = itemResultArr[m].getValue('description')
          if (itemId == sku) {
            customRecord.setCurrentSublistValue({ // 说明
              sublistId: 'item',
              fieldId: 'description',
              value: description
            })
          }
        }



        // var dateKey = objRecord.getSublistValue({//需求时间
        //     sublistId: 'recmachcustrecord_pr_batch_import_link',
        //     fieldId: 'custrecord_pr_bi_required_time',
        //     line: x
        // })
        // log.debug("需求时间 ",dateKey)
        // customRecord.setCurrentSublistValue({
        //     sublistId: 'item',
        //     fieldId: 'custcol_purchased_application_date',
        //     value: dateKey
        // })
        // ------------------------以上为必须输入的内容
        var vendorName = objRecord.getSublistValue({ // 供应商
          sublistId: 'recmachcustrecord_pr_batch_import_link',
          fieldId: 'custrecord_pr_batch_import_vendor_name',
          line: x
        })
        log.debug('供应商 ', vendorName)
        if (vendorName != null && vendorName != '') {
          customRecord.setCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'povendor',
            value: vendorName
          })
        }
        // var preReceiptDate = objRecord.getSublistValue({//预计收货日期
        //     sublistId: 'recmachcustrecord_pr_batch_import_link',
        //     fieldId: 'custrecord_pr_bi_pre_reciept_date',
        //     line: x
        // })
        // log.debug("预计收货日期 ",preReceiptDate)
        // if(preReceiptDate!=null&&preReceiptDate!=''){
        //     customRecord.setCurrentSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'expectedreceiptdate',
        //         value: preReceiptDate
        //     })
        // }
        // var purchasePrinciple = objRecord.getSublistValue({//采购主体
        //     sublistId: 'recmachcustrecord_pr_batch_import_link',
        //     fieldId: 'custrecord_pr_bi_purchase_principle',
        //     line: x
        // })
        // if(purchasePrinciple!=null&&purchasePrinciple!=''){
        //     customRecord.setCurrentSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'custcol_purchased_subject',
        //         value: purchasePrinciple
        //     })
        // }
        // var upcCode = objRecord.getSublistValue({//upc code
        //     sublistId: 'recmachcustrecord_pr_batch_import_link',
        //     fieldId: 'custrecord_pr_batch_import_upc_code',
        //     line: x
        // })
        // if(upcCode!=null&&upcCode!=''){
        //     customRecord.setCurrentSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'custcol_barcode',
        //         value: upcCode
        //     })
        // }
        // 设置计划下单日期和计划发运日期  2020-02-29
        // if(sku&&dateKey){
        //     var date
        //     search.create({
        //         type: 'customrecord_time_mapping_relation',
        //         filters: [{ name: 'internalid', operator: 'is', values: dateKey }],
        //         columns: ['custrecord_time_begin']
        //     }).run().each(function (result) {
        //         date = result.getValue('custrecord_time_begin')
        //     })
        //     if (date) {
        //         var po_delivery = 0
        //         var cargo_days = 0
        //         var custitem_days = 0
        //         var special_days = 0
        //         var country, vc_fba
        //         var shiftDays = []
        //         var filters = [{ name: 'internalid', operator: 'anyof', values: sku }]
        //         var columns = ['custitem_po_delivery', 'custitem_state_region', 'custitem_cargo_days', 
        //             'custitem_land_transport_days', 'custitem_vc_fba', 'custitem_special_additional']
        //         var mySearch = search.create({
        //             type: 'item',
        //             filters: filters,
        //             columns: columns
        //         })
        //         mySearch.run().each(function (result) {
        //             po_delivery = Number(result.getValue('custitem_po_delivery'))
        //             cargo_days = Number(result.getValue('custitem_cargo_days'))
        //             custitem_days = Number(result.getValue('custitem_land_transport_days'))
        //             special_days = Number(result.getValue('custitem_special_additional'))
        //             country = result.getValue('custitem_state_region')
        //             vc_fba = result.getValue('custitem_vc_fba')
        //         })
        //         if (country) {
        //             search.create({
        //                 type: 'customrecord_logistics_shift_days',
        //                 filters: [{ name: 'custrecord_logistics_shift_country', operator: 'anyof', values: country }],
        //                 columns: ['custrecord_logistics_shift_start_time', 'custrecord_logistics_shift_end_time',
        //                     'custrecord_logistics_shift_dags', 'custrecord_logistics_vc_shift_dags']
        //             }).run().each(function (result) {
        //                 var shiftDaysJson = {}
        //                 shiftDaysJson.start_time = result.getValue('custrecord_logistics_shift_start_time')
        //                 shiftDaysJson.end_time = result.getValue('custrecord_logistics_shift_end_time')
        //                 shiftDaysJson.days = Number(result.getValue('custrecord_logistics_shift_dags'))
        //                 shiftDaysJson.vcdays = Number(result.getValue('custrecord_logistics_vc_shift_dags'))
        //                 shiftDays.push(shiftDaysJson)
        //                 return true
        //             })
        //         }
        //         var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
        //         var shipmentDate = getDemandDate('shipment', date, po_delivery, cargo_days, custitem_days, 
        //             vc_fba, shiftDays, special_days, dateFormat)
        //         customRecord.setCurrentSublistValue({
        //             sublistId: 'item', fieldId: 'custcol_schedule_ship_date',
        //             value: format.parse({ value: shipmentDate, type: format.Type.DATE })
        //         })
        //         customRecord.setCurrentSublistValue({
        //             sublistId: 'item', fieldId: 'custcol_schedule_order_date',
        //             value:format.parse({
        //                 value: getDemandDate('supply', shipmentDate, po_delivery, cargo_days, custitem_days, 
        //                     vc_fba, shiftDays, special_days, dateFormat),
        //                 type: format.Type.DATE
        //             })
        //         })
        //     }
        // }
        var quantity = objRecord.getSublistValue({ // 数量
          sublistId: 'recmachcustrecord_pr_batch_import_link',
          fieldId: 'custrecord_pr_batch_import_quantity',
          line: x
        })
        log.debug('数量', quantity)
        customRecord.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'quantity',
          value: quantity
        })
        var estimatePrice = objRecord.getSublistValue({ // 估计单价
          sublistId: 'recmachcustrecord_pr_batch_import_link',
          fieldId: 'custrecord_pr_batch_import_est_value',
          line: x
        })
        log.debug('估计单价', estimatePrice)
        customRecord.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'estimatedrate',
          value: estimatePrice
        })
        var estimateAmount = objRecord.getSublistValue({ // 估计金额
          sublistId: 'recmachcustrecord_pr_batch_import_link',
          fieldId: 'custrecord_pr_batch_import_est_amount',
          line: x
        })
        log.debug('估计金额 ', estimateAmount)
        customRecord.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'estimatedamount',
          value: estimateAmount
        })

        var esa = customRecord.getCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'estimatedamount'
        })
        log.debug('在Commitline 之前看看估价', esa)
        customRecord.commitLine({
          sublistId: 'item'
        })
      }
      var requisitionRecId = customRecord.save()
      objRecord.setValue({
        fieldId: 'custrecord_pr_bi_wether_to_be_pr',
        value: true
      })
      var batchImportNewId = objRecord.save()
      return requisitionRecId
    }

    function searchAllChoosedItem (data) {
      log.debug('internalid anyof  ' + JSON.stringify(data))
      var columns = ['internalid', {join: 'custrecord_pr_batch_import_link',name: 'custrecord_pr_batch_import_item'}]
      var filters = []
      filters.push(search.createFilter({
        name: 'internalid',
        operator: 'anyof',
        values: data
      }))
      var batchImportSearch = search.create({
        type: 'customrecord_pr_batch_import_headline',
        title: '查询所有未转换的货品',
        columns: columns,
        filters: filters
      })
      var batchImportItemArr = []
      batchImportSearch.run().each(function (result) {
        var item = result.getValue({join: 'custrecord_pr_batch_import_link',name: 'custrecord_pr_batch_import_item'})
        batchImportItemArr.push(item)
        return true
      })
      var itemColumns = ['description', 'custitem_dps_skuchiense', 'internalid', 'vendor', {join:'preferredVendor', name: 'subsidiary'}, 'itemid']
      var itemFilters = []
      itemFilters.push(search.createFilter({
        name: 'internalid',
        operator: 'anyof',
        values: batchImportItemArr
      }))
      var itemSearch = search.create({
        type: 'item',
        title: '查询所有的货品详情',
        columns: itemColumns,
        filters: itemFilters
      })
      var itemResultArr = []
      itemSearch.run().each(function (result) {
        log.error({
          title: '货品最终结果',
          details: JSON.stringify(result)
        })
        itemResultArr.push(result)
        return true
      })
      return itemResultArr
    }

    /**
     * 转换成系统标准的时间
     * @param {*} date 
     */
    function changeToFormatDate (date) {
      var datetime = date.getTime()
      var returnDate = moment(datetime).format(dateFormat)
      return returnDate
    }

    /**
    * 预估需求日期
    * @param {*} action 
    * @param {*} demandDate 
    * @param {*} purchaseadvance 
    * @param {*} logisticsadvance 
    * @param {*} custitem_days 
    * @param {*} vc_fba 
    * @param {*} shiftDays 
    * @param {*} special_days 
    * @param {*} dateFormat 
    */
    function getDemandDate (action, demandDate, purchaseadvance, logisticsadvance, custitem_days, vc_fba, shiftDays,
      special_days, dateFormat) {
      var date = moment(format.parse({ value: demandDate, type: format.Type.DATE })).format('YYYY/MM/DD')
      var onedate = new Date(date)
      var d = onedate.getTime()
      if (action == 'supply') { // 预计下单时间
        d = +d - 1000 * 60 * 60 * 24 * purchaseadvance
        for (var index = 0; index < 7; index++) {
          onedate = new Date(d)
          if (onedate.getDay() != 6 && onedate.getDay() != 7) {
            break
          } else {
            d = +d - 1000 * 60 * 60 * 24
          }
        }
      } else if (action == 'shipment') { // 预计发货时间
        d = +d - 1000 * 60 * 60 * 24 * (logisticsadvance + special_days)
        if (vc_fba == 'VC') {
          d = +d - 1000 * 60 * 60 * 24 * custitem_days
        }
        var daysShift, rd
        // console.log(new Date(d))
        for (var index = 0; index < shiftDays.length; index++) {
          if (!daysShift || (daysShift && shiftDays[index].days > daysShift)) {
            var startdateStr = moment(format.parse({ value: shiftDays[index].start_time, type: format.Type.DATE })).format('YYYY/MM/DD')
            var startdate = new Date(startdateStr)
            var enddateStr = moment(format.parse({ value: shiftDays[index].end_time, type: format.Type.DATE })).format('YYYY/MM/DD')
            var enddate = new Date(enddateStr)
            var rrd = d - 1000 * 60 * 60 * 24 * (shiftDays[index].days + shiftDays[index].vcdays)
            var ddate = new Date(rrd)
            // console.log(startdate + ' == ' + ddate + ' == ' + enddate + ' == ' + (startdate <= ddate && ddate <= enddate))
            if (startdate <= ddate && ddate <= enddate) {
              rd = rrd
              daysShift = shiftDays[index].days
            }
          }
        }
        if (daysShift) {
          d = rd
        }
        // console.log(new Date(d))
        for (var index = 0; index < 7; index++) {
          onedate = new Date(d)
          if (onedate.getDay() == 3) {
            break
          } else {
            d = +d - 1000 * 60 * 60 * 24
          }
        }
      }
      d = new Date(d)
      var now = new Date()
      // 预计下单时间 或 预计发运时间 早于当天日期，提示信息
      if (d <= now) {
        if (action == 'supply') {
          log.error('预计下单时间早于当前时间，请注意')
        } else {
          log.error('预计发运时间早于当前时间，请注意')
        }
      }
      var timeOne = moment(d.getTime()).format(dateFormat)
      return timeOne
    }

    return {
      onRequest: onRequest
    }
  })
