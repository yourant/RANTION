/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/moment.js', 'N/runtime', 'N/search', 'N/format', 'N/ui/dialog'],
  function (moment, runtime, search, format, dialog) {
    function pageInit (context) {
    }

    function saveRecord (context) {
      return true
    }

    function validateField (context) {
      if (context.fieldId == 'custcol_purchased_application_date') {
        var rec = context.currentRecord
        var sku = rec.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'})
        if (!sku) {
          return false
        }
      }
      return true
    }

    function fieldChanged (context) {
      var rec = context.currentRecord
      var sku = rec.getCurrentSublistValue({sublistId: 'item',fieldId: 'item'})
      if (context.fieldId == 'custcol_purchased_application_date' && sku) {
        var dateKey = rec.getCurrentSublistValue({sublistId: 'item',fieldId: 'custcol_purchased_application_date'})
        if (dateKey) {
          var date
          search.create({
            type: 'customrecord_time_mapping_relation',
            filters: [{ name: 'internalid', operator: 'is', values: dateKey }],
            columns: ['custrecord_time_begin']
          }).run().each(function (result) {
            date = result.getValue('custrecord_time_begin')
          })
          if (date) {
            var po_delivery = 0
            var cargo_days = 0
            var custitem_days = 0
            var special_days = 0
            var country, vc_fba
            var shiftDays = []
            var filters = [{ name: 'internalid', operator: 'anyof', values: sku }]
            var columns = ['custitem_po_delivery', 'custitem_state_region', 'custitem_cargo_days',
              'custitem_land_transport_days', 'custitem_vc_fba', 'custitem_special_additional']
            var mySearch = search.create({
              type: 'item',
              filters: filters,
              columns: columns
            })
            mySearch.run().each(function (result) {
              po_delivery = Number(result.getValue('custitem_po_delivery'))
              cargo_days = Number(result.getValue('custitem_cargo_days'))
              custitem_days = Number(result.getValue('custitem_land_transport_days'))
              special_days = Number(result.getValue('custitem_special_additional'))
              country = result.getValue('custitem_state_region')
              vc_fba = result.getValue('custitem_vc_fba')
            })
            if (country) {
              search.create({
                type: 'customrecord_logistics_shift_days',
                filters: [{ name: 'custrecord_logistics_shift_country', operator: 'anyof', values: country }],
                columns: ['custrecord_logistics_shift_start_time', 'custrecord_logistics_shift_end_time',
                  'custrecord_logistics_shift_dags', 'custrecord_logistics_vc_shift_dags']
              }).run().each(function (result) {
                var shiftDaysJson = {}
                shiftDaysJson.start_time = result.getValue('custrecord_logistics_shift_start_time')
                shiftDaysJson.end_time = result.getValue('custrecord_logistics_shift_end_time')
                shiftDaysJson.days = Number(result.getValue('custrecord_logistics_shift_dags'))
                shiftDaysJson.vcdays = Number(result.getValue('custrecord_logistics_vc_shift_dags'))
                shiftDays.push(shiftDaysJson)
                return true
              })
            }
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
            var shipmentDate = getDemandDate('shipment', date, po_delivery, cargo_days, custitem_days,
              vc_fba, shiftDays, special_days, dateFormat)
            rec.setCurrentSublistValue({
              sublistId: 'item', fieldId: 'custcol_schedule_ship_date',
              value: format.parse({ value: shipmentDate, type: format.Type.DATE })
            })
            rec.setCurrentSublistValue({
              sublistId: 'item', fieldId: 'custcol_schedule_order_date',
              value: format.parse({
                value: getDemandDate('supply', shipmentDate, po_delivery, cargo_days, custitem_days,
                  vc_fba, shiftDays, special_days, dateFormat),
                type: format.Type.DATE
              })
            })
          }
        }
      }
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
          dialog.alert({ title: '提示', message: '预计下单时间早于当前时间，请注意' })
        } else {
          dialog.alert({ title: '提示', message: '预计发运时间早于当前时间，请注意' })
        }
      }
      var timeOne = moment(d.getTime()).format(dateFormat)
      return timeOne
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
      sublistChanged: sublistChanged
    }
  })
