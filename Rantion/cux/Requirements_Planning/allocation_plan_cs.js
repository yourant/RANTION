/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../../Helper/Moment.min', 'N/currentRecord', 'N/url', 'N/https', 'N/ui/dialog', 'N/format', 'N/runtime', 'N/search', 'N/record'],
  function (moment, currentRecord, url, https, dialog, format, runtime, search, record) {
    var rec,    sublistId = 'custpage_sublist',week_rs,func_type
    function pageInit (context) {
      rec = context.currentRecord; // 当前记录
    }

    function saveRecord (context) {
      return true
    }

    function validateField (context) {
      // if (context.fieldId == 'custpage_select_page') {
      //     selectPage()
      // } else if (context.fieldId == 'custpage_page_size') {
      //     pigeSizeChange()
      // }
      return true
    }
    function pigeSizeChange () {
      var custpage_item = rec.getValue('custpage_item'); // 货品
      var custpage_date_from = rec.getText('custpage_date_from')
      var custpage_date_to = rec.getText('custpage_date_to')
      var custpage_now_page = rec.getValue('custpage_now_page')
      var custpage_total_page = rec.getValue('custpage_total_page')
      var custpage_select_page = rec.getText('custpage_page_size')
      var custpage_page_size = rec.getValue('custpage_page_size')
      console.log('所选货品:', custpage_item)
      if (custpage_total_page != null && custpage_total_page != '') {
        console.log('选择的页数', custpage_select_page)
        console.log('页面大小', custpage_page_size)
        if (parseInt(custpage_select_page) - 1 > 0) {
          var link = url.resolveScript({
            scriptId: 'customscript_allocation_plan_sl',
            deploymentId: 'customdeploy_allocation_plan_sl'
          })

          link = link + '&' + serializeURL({
            action: 'search',
            custpage_item: custpage_item,
            custpage_date_from: custpage_date_from,
            custpage_date_to: custpage_date_to,
            custpage_now_page: custpage_select_page,
            custpage_page_size: custpage_page_size
          })
          console.log('link : ', link)
          window.location = link
        }
      }
    }
    /**
     * 序列化url参数
     * 
     * @param obj
     * @returns
     */
    function serializeURL (obj) {
      var str = []
      for (var p in obj)
        if (obj.hasOwnProperty(p)) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
      }
      return str.join('&')
    }

    function fieldChanged (context) {
      var cur = context.currentRecord
      var fieldId = context.fieldId
      var data_type_id = cur.getCurrentSublistValue({ sublistId: sublistId, fieldId: 'custpage_data_type_id'})
      console.log('data_type_id:' + data_type_id)
      if (fieldId != 'custpage_week_date' && fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' && fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to'
        && data_type_id != 6 && data_type_id != 22
        && fieldId != 'custpage_page_size' && fieldId != 'custpage_department'
      ) { // 不等于修改调拨计划量   
        function success (result) { console.log('Success with value: ' + result); window.location.reload(true);}
        function failure (reason) { console.log('Failure: ' + reason); }

        dialog.alert({
          title: '提示',
          message: '不允许进行修改！'
        }).then(success).catch(failure)
      }else {
        if (fieldId == 'custpage_date_from' || fieldId == 'custpage_date_to') {
          var D = cur.getValue(fieldId)
          var now_date = getWeek(new Date())
          var fo_date = getWeek(D)
          console.log('错误的')
          if (fieldId == 'custpage_date_from') {
            if (!D) {
              function success (result) {
                console.log('Success with value: ' + result)
              }
              function failure (reason) {
                console.log('Failure: ' + reason)
              }
              dialog.alert({
                title: '提示',
                message: '请选择开始日期'
              }).then(success).catch(failure)

              cur.setValue({
                fieldId: fieldId,
                value: new Date()
              })
              return
            }
          }else {
            if (!D) {
              function success (result) {
                console.log('Success with value: ' + result)
              }
              function failure (reason) {
                console.log('Failure: ' + reason)
              }
              dialog.alert({
                title: '提示',
                message: '请选择结束日期'
              }).then(success).catch(failure)
              cur.setValue({
                fieldId: fieldId,
                value: new Date(new Date().setMonth(new Date().getMonth() + 8))
              })
              return
            }
          }

          if (D < new Date() && now_date > fo_date) {
            function success (result) { console.log('Success with value: ' + result); }
            function failure (reason) { console.log('Failure: ' + reason); }
            dialog.alert({
              title: '提示',message: '不能选择旧数据'
            }).then(success).catch(failure)
            cur.setValue({fieldId: fieldId,value: new Date()})
          }
          var cur_params = getParams(rec)

          console.log('cur.getValue(\'custpage_date_from\').Format("yyyy-MM-dd")', cur.getValue('custpage_date_from').Format('yyyy-MM-dd'))
          console.log('cur.getValue(\'custpage_date_to\').Format("yyyy-MM-dd")', cur.getValue('custpage_date_to').Format('yyyy - MM - dd'))
          var link = url.resolveScript({
            scriptId: 'customscript_allocation_plan_sl',
            deploymentId: 'customdeploy_allocation_plan_sl',
            params: cur_params
          })
          console.log('开始过滤', link)
          window.onbeforeunload = null
          window.location.href = link
          return
        }
        if (fieldId == 'custpage_department' || fieldId == 'custpage_account_store'
          || fieldId == 'custpage_item' || fieldId == 'custpage_page_size') {
          var cur_params = getParams(rec)

          var link = url.resolveScript({
            scriptId: 'customscript_allocation_plan_sl',
            deploymentId: 'customdeploy_allocation_plan_sl',
            params: cur_params
          // params: {
          //     custpage_department: rec.getValue('custpage_department')
          // }
          })

          // 当该事件返回的字符串（ 事前设置好的event.returnValue的值） 不为null或者undefined时， 弹出确认窗口让用户自行选择是否关闭当前页面。

          window.onbeforeunload = null
          // window.open(link)
          window.location.href = link
        }
      }
      return true
    }
    function getParams (rec) {
      var fieldArr = ['custpage_account_store', 'custpage_item', 'custpage_date_from', 'custpage_date_to', 'custpage_department', 'custpage_page_size']
      var params = {}

      fieldArr.map(function (field) {
        if (field == 'custpage_date_from' || field == 'custpage_date_to') {
          params[field] = rec.getValue(field).Format('yyyy-MM-dd')
        } else {
          console.log('查看刷新的字段值: ' + field, rec.getValue(field))
          params[field] = rec.getValue(field)
        }
      })
      params['action'] = 'search'
      return params
    }
    function postSourcing (context) {
    }

    function lineInit (context) {
    }

    function validateDelete (context) {
      return true
    }

    function validateInsert (context) {
      return true
    }

    function validateLine (context) {
      return true
    }

    function sublistChanged (context) {
    }

    function createTransferOrders () {
      var sublistId = 'custpage_sublist'
      var curr = currentRecord.get()
      var week_date = curr.getValue('custpage_week_date').toString()
      var date_from = format.parse({ value: curr.getValue('custpage_date_from'), type: format.Type.DATE})
      var date_to = format.parse({ value: curr.getValue('custpage_date_to'), type: format.Type.DATE})
      // 传入开始时间和结束时
      var week_objs = weekofday(new Date(), date_from, date_to)
      func_type = week_objs.func_type
      week_rs = week_objs.weeks
      log.audit('week_rs', week_rs)
      var week_arr = week_date.split(',')
      var item_arr = []
      console.log('len:', curr.getLineCount({sublistId: sublistId}))
      var un_line = []
      for (var i = 0; i < curr.getLineCount({sublistId: sublistId}); i++) {
        var data_type = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_data_type_id',line: i})
        var quantity = 0
        console.log('data_type:' + data_type)
        if (data_type == 6 || data_type == 22) { // 修改调拨计划量
          week_arr.map(function (line) {
            week_rs.map(function (wek) {
              if (wek == line) {
                console.log('line:' + line)
                quantity = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_quantity_week' + wek,line: i})
              }
            })
            console.log('quantity:' + quantity)
            if (quantity <= 0) {
              un_line.push({'wek': line,'line': i})
            }else {
              item_arr.push({
                item_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i}),
                account_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i}),
                week_date: line,
                item_quantity: quantity
              })
            }
          })
        }
      }
      console.log(item_arr)
      function success (result) {
        console.log('Success with value ' + result)
      }

      function success1 (result) {
        console.log('Success1 with value ' + result)
        if (result == true) {
          var link = url.resolveScript({
            scriptId: 'customscript_allocation_plan_rl',
            deploymentId: 'customdeploy_allocation_plan_rl'
          })
          var header = {
            'Content-Type': 'application/json;charset=utf-8',
            'Accept': 'application/json'
          }
          var body = {
            items: item_arr,
            week: week_arr
          }

          var response = https.post({
            url: link,
            body: body,
            headers: header
          })
          dialog.alert({
            title: JSON.parse(response.body).status,
            message: JSON.parse(response.body).data
          }).then(success2).catch(failure)
        }
      }

      function success2 (reason) {
        console.log('Success with value: ' + reason)
        // window.location.reload(true)
        window.opener.close()
      }

      function failure (reason) {
        console.log('Failure: ' + reason)
      }
      if (un_line.length > 0) {
        var mess = ''
        un_line.map(function (ln) {
          mess += '第' + ln.line + '行，' + '第' + ln.wek + '周的SKU不需要调拨 \n'
        })
        var options = {
          title: 'Tip',
          message: '选择的数据中：' + mess
        }
        dialog.confirm(options).then(success2).catch(failure)
      }

      if (item_arr.length == 0) {
        var options = {
          title: '生成库存转移单',
          message: '未选择生成周或生成周下面的调拨计划量为空不能进行生成库存转移单操作！'
        }
        dialog.confirm(options).then(success).catch(failure)
      }else {
        var options = {
          title: '生成库存转移单',
          message: '是否确认生成库存转移单？'
        }
        dialog.confirm(options).then(success1).catch(failure)
      }
    }

    function updateData () {
      var sublistId = 'custpage_sublist'
      var ST = new Date().getTime()
      var curr = currentRecord.get()
      var date_from = format.parse({ value: curr.getValue('custpage_date_from'), type: format.Type.DATE})
      var date_to = format.parse({ value: curr.getValue('custpage_date_to'), type: format.Type.DATE})
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var today = moment(new Date().getTime()).format(dateFormat)
      // 传入开始时间和结束时
      var week_objs = weekofday(new Date(), date_from, date_to)
      func_type = week_objs.func_type
      week_rs = week_objs.weeks
      log.audit('week_rs', week_rs)
      var item_arr6 = [],item_arr5 = []
      var quantity ,item_objs6 = {},item_objs5 = {},sku_id,account,key_str,CH = true
      for (var i = 0; i < curr.getLineCount({sublistId: sublistId}); i++) {
        var data_type = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_data_type_id',line: i})
        if (data_type == 6 || data_type == 22) { // 修改调拨计划量
          quantity = 0
          week_rs.map(function (wek) {
            CH = true
            quantity = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_quantity_week' + wek,line: i})
            sku_id = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i})
            account = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i})
            key_str = sku_id + '-' + account + '-22-' + i
            for (var key in item_objs6) {
              if (key == key_str) {
                item_objs6[key].push({
                  item_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i}),
                  account_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i}),
                  week_date: wek,
                  line: i,
                  data_type: 22, // 需求预测数据类型 中的22 -修改调拨计划量
                  item_quantity: quantity.toString()
                })
                CH = false
              }
            }
            if (CH) {
              item_arr6 = []
              item_arr6.push({
                item_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i}),
                account_id: curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i}),
                week_date: wek,
                line: i,
                data_type: 22, // 需求预测数据类型 中的22 -修改调拨计划量
                item_quantity: quantity.toString()
              })
              item_objs6[key_str] = item_arr6
            }
          })
          for (var l = 1;l < 54;l++) {
            CH = true
            if (week_rs.indexOf(l) == -1) {
              quantity = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_quantity_weekhi' + l,line: i})
              sku_id = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i})
              account = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i})
              key_str = sku_id + '-' + account + '-22-' + i
              for (var key in item_objs6) {
                if (key == key_str) {
                  item_objs6[key].push({
                    item_id: sku_id,
                    account_id: account,
                    week_date: l,
                    line: i,
                    data_type: 22, // 需求预测数据类型 中的22 -修改调拨计划量
                    item_quantity: quantity.toString()
                  })
                  CH = false
                }
              }
              if (CH) {
                item_arr6 = []
                item_arr6.push({
                  item_id: sku_id,
                  account_id: account,
                  week_date: l,
                  line: i,
                  data_type: 22, // 需求预测数据类型 中的22 -修改调拨计划量
                  item_quantity: quantity.toString()
                })
                item_objs6[key_str] = item_arr6
              }
            }
          }
        }
        if (data_type == 5) { // 调拨计划量
          quantity = 0
          week_rs.map(function (wek) {
            CH = true
            quantity = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_quantity_week' + wek,line: i})
            sku_id = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i})
            account = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i})
            key_str = sku_id + '-' + account + '-6-' + i
            for (var key in item_objs5) {
              if (key == key_str) {
                item_objs5[key].push({
                  item_id: sku_id,
                  account_id: account,
                  week_date: wek,
                  line: i + 1,
                  data_type: 6, // 需求预测数据类型 中的6 -调拨计划量
                  item_quantity: quantity.toString()
                })
                CH = false
              }
            }
            if (CH) {
              item_arr5 = []
              item_arr5.push({
                item_id: sku_id,
                account_id: account,
                week_date: wek,
                line: i + 1,
                data_type: 6, // 需求预测数据类型 中的6 调拨计划量
                item_quantity: quantity.toString()
              })
              item_objs5[key_str] = item_arr5
            }
          })
          for (var l = 1;l < 54;l++) {
            CH = true
            if (week_rs.indexOf(l) == -1) {
              quantity = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_quantity_weekhi' + l,line: i})
              sku_id = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_item_sku_id',line: i})
              account = curr.getSublistValue({sublistId: sublistId,fieldId: 'custpage_store_name_id',line: i})
              key_str = sku_id + '-' + account + '-6-' + i
              for (var key in item_objs5) {
                if (key == key_str) {
                  item_objs5[key].push({
                    item_id: sku_id,
                    account_id: account,
                    week_date: l,
                    line: i,
                    data_type: 6, // 需求预测数据类型 中的6 调拨计划量
                    item_quantity: quantity.toString()
                  })
                  CH = false
                }
              }
              if (CH) {
                item_arr5 = []
                item_arr5.push({
                  item_id: sku_id,
                  account_id: account,
                  week_date: l,
                  line: i,
                  data_type: 6, // 需求预测数据类型 中的6 调拨计划量
                  item_quantity: quantity.toString()
                })
                item_objs5[key_str] = item_arr5
              }
            }
          }
        }
      }

      console.log('item_objs5:', item_objs5)
      console.log('item_objs6:', item_objs6)

      var link = url.resolveScript({
        scriptId: 'customscript_allocation_plan_rl',
        deploymentId: 'customdeploy_allocation_plan_rl'
      })
      var header = {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
      }
      var body = {
        item_objs5: item_objs5, // 计划量
        item_objs6: item_objs6, // 修改量
        today: today,
        PlanType: ['19', '20', '21'], // 调拨计划 , 交货计划，补货计划 例外信息类型
      }

      https.post.promise({
        header: header,
        url: link,
        body: body
      }).then(function (response) {
        alert('保存成功')
        console.log('更新数据耗时：' + (new Date().getTime() - ST))
      }).catch(function onRejected (reason) {
        console.log('报错了，look:  ' + reason)
      })
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
       * 导出Excel
       */
    function ExportDemandPlan () {
      var sublistId = 'custpage_sublist'
      var curr = currentRecord.get()
      var date_from = format.parse({ value: curr.getValue('custpage_date_from'), type: format.Type.DATE})
      var date_to = format.parse({ value: curr.getValue('custpage_date_to'), type: format.Type.DATE})
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
      var today = moment(new Date().getTime()).format(dateFormat),quantity
      // 传入开始时间和结束时
      var week_objs = weekofday(new Date(), date_from, date_to)
      func_type = week_objs.func_type
      week_rs = week_objs.weeks
      log.audit('week_rs', week_rs)
      var fils = []
      var len = curr.getLineCount({sublistId: sublistId})
      console.log('子列表长度: ' + len, today)
      if (len > 0) {
        fils = {
          'acc': curr.getValue('custpage_account_store'),
          'sku': curr.getValue('custpage_item'),
          'pageSize': curr.getText('custpage_page_size'),
          'nowPage': curr.getValue('custpage_page_size'),
          'TT': 'Alloca',
          'func_type': func_type,
          'week_rs': week_rs
        }
        console.log('week:: ' + week_rs, func_type)

        console.log('fils: ', JSON.stringify(fils))
        var link = url.resolveScript({
          scriptId: 'customscript_store_demand_print_sl',
          deploymentId: 'customdeploy_store_demand_print_sl',
          params: {
            fils: JSON.stringify(fils)
          },
          returnExternalUrl: true
        })
        window.open(link)
      }else {
        alert('无数据')
      }
    }
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
    return {
      pageInit: pageInit,
      saveRecord: saveRecord,
      validateField: validateField,
      fieldChanged: fieldChanged,
      postSourcing: postSourcing,
      lineInit: lineInit,
      validateDelete: validateDelete,
      validateInsert: validateInsert,
      validateLine: validateLine,
      sublistChanged: sublistChanged,
      createTransferOrders: createTransferOrders,
      ExportDemandPlan: ExportDemandPlan,
      updateData: updateData
    }
  })
