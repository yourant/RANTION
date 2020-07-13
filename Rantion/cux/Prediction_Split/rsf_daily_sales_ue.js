/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/format'], function (search, record, format) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        if (context.type != 'delete') {
            try {
                var newRecord = context.newRecord;
                var monthStartDate = newRecord.getValue('custrecord_rsf_sales_forcast_date');
                if (monthStartDate) {
                    monthStartDate = format.parse({ value: monthStartDate, type: format.Type.DATE });
                }
                log.debug('monthStartDate', monthStartDate);
                var year = monthStartDate.getFullYear();
                var month = monthStartDate.getMonth() + 1;
                var now_date = new Date();
                var now_year = now_date.getFullYear();
                var store = newRecord.getValue('custrecord_rsf_sales_forcast_store');
                var item = newRecord.getValue('custrecord_rsf_sales_forcast_item');
                var monthQty = Number(newRecord.getValue('custrecord_rsf_sales_forcast_alter')) > 0 ?
                    Number(newRecord.getValue('custrecord_rsf_sales_forcast_alter')) : Number(newRecord.getValue('custrecord_rsf_sales_forcast_quantity'));
                var monthWeekDate = splitMonthToWeek(monthStartDate, monthQty);
                log.debug('monthWeekDate', monthWeekDate);
                var forecast_id;
                search.create({
                    type: 'customrecord_demand_forecast',
                    filters: [
                        { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item },
                        { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: store }
                    ]
                }).run().each(function (result) {
                    forecast_id = result.id;
                    return true;
                });
                if (!forecast_id) {
                    var forecast_record = record.create({ type: 'customrecord_demand_forecast', isDynamic: true });
                    forecast_record.setValue({ fieldId: 'custrecord_demand_forecast_item_sku', value: item });
                    forecast_record.setValue({ fieldId: 'custrecord_demand_forecast_account', value: store });
                    forecast_id = forecast_record.save();
                }
                var forecast_child_id;
                search.create({
                    type: 'customrecord_demand_forecast_child',
                    filters: [
                        { name: 'custrecord_demand_forecast_parent', operator: 'anyof', values: forecast_id },
                        { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: format.format({ value: new Date(new Date().getTime() + 8 * 3600 * 1000), type: format.Type.DATE }) },
                        { name: 'custrecord_demand_forecast_l_data_type', operator: 'is', values: 1 },
                    ]
                }).run().each(function (result) {
                    forecast_child_id = result.id;
                    return true;
                });
                var forecast_child_record;
                if (!forecast_child_id) {
                    forecast_child_record = record.create({ type: 'customrecord_demand_forecast_child', isDynamic: true });
                    forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: new Date(new Date().getTime() + 8 * 3600 * 1000) });
                    forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: 1 });
                    forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id });
                    var weeks = monthWeekDate.weeks;
                    for (var index = 0; index < weeks.length; index++) {
                        var week_num = weeks[index];
                        var week_key = 'custrecord_quantity_week' + week_num;
                        // var old_quy = Number(forecast_child_record.getValue(week_key)) ? Number(forecast_child_record.getValue(week_key)) : 0;
                        // var qty = Number(monthWeekDate[week_num].qty) + old_quy;
                        forecast_child_record.setValue({ fieldId: week_key, value: year + '-' + week_num + ' ' + monthWeekDate[week_num].qty });
                    }
                } else {
                    forecast_child_record = record.load({ type: 'customrecord_demand_forecast_child', id: forecast_child_id });
                    var weeks = monthWeekDate.weeks;
                    for (var index = 0; index < weeks.length; index++) {
                        //判断 第一年的年底的最后一天是否为周 4、5、6、7，这几天，归为今年的是最后一周
                        if (now_year == year && month == 12 && index == (weeks.length - 1)) {
                            var last_day = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0).getDay();
                            if (last_day < 4 && last_day != 0) {
                                var week_num = weeks[index];
                                var week_key = 'custrecord_quantity_week' + 1;
                                var ord_date = forecast_child_record.getValue(week_key) ? forecast_child_record.getValue(week_key).split(' ') : 0;
                                var old_qty = Number(ord_date[1]) ? Number(ord_date[1]) : 0;
                                var qty = Number(monthWeekDate[week_num].qty) + old_qty;
                                forecast_child_record.setValue({ fieldId: week_key, value: (year+1) + '-' + 1 + ' ' + qty });
                            }else {
                                var week_num = weeks[index];
                                var week_key = 'custrecord_quantity_week' + week_num;
                                var ord_date = forecast_child_record.getValue(week_key) ? forecast_child_record.getValue(week_key).split(' ') : 0;
                                var old_qty = Number(ord_date[1]) ? Number(ord_date[1]) : 0;
                                var qty = Number(monthWeekDate[week_num].qty) + old_qty;
                                forecast_child_record.setValue({ fieldId: week_key, value: year + '-' + week_num + ' ' + qty });
                            }
                        } else if((now_year + 1) == year && month == 1 && index == 0){//第二年的 第一天（ 1号 ），判断为周几，如果是周5，则往后两天（2号、3号）都归为去年的最后一周；
                            var first_day = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1).getDay();
                            if(first_day >= 5 || first_day == 0){
                                var last_week = getWeek(new Date(now_year, 12, 0));
                                var week_num = weeks[index];
                                var week_key = 'custrecord_quantity_week' + last_week;
                                var ord_date = forecast_child_record.getValue(week_key) ? forecast_child_record.getValue(week_key).split(' ') : 0;
                                log.debug('ord_date', ord_date);
                                var old_qty = Number(ord_date[1]) ? Number(ord_date[1]) : 0;
                                var qty = Number(monthWeekDate[week_num].qty) + old_qty;
                                forecast_child_record.setValue({ fieldId: week_key, value: now_year + '-' + last_week + ' ' + qty });
                            }
                        }else {
                            var week_num = weeks[index];
                            var week_key = 'custrecord_quantity_week' + week_num;
                            var ord_date = forecast_child_record.getValue(week_key) ? forecast_child_record.getValue(week_key).split(' ') : 0;
                            var old_qty = Number(ord_date[1]) ? Number(ord_date[1]) : 0;
                            var qty = Number(monthWeekDate[week_num].qty) + old_qty;
                            forecast_child_record.setValue({ fieldId: week_key, value: year + '-' + week_num + ' ' + qty });
                        }
                    }
                }
                forecast_child_record.save();
            } catch (e) {
                log.debug('e', e);
            }

        }
    }

    function splitMonthToWeek(monthStartDate, skuqty) {
        var firstDay = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1);
        var monthDays = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0).getDate();
        var day_qty_a = Math.floor(skuqty / monthDays);
        var day_qty_l = skuqty - (day_qty_a * (monthDays - 1));
        var week_data = {};
        var weeks_no = [];
        for (var index = 0; index < monthDays; index++) {
            var qty = day_qty_a;
            if ((index + 1) == monthDays) {
                qty = day_qty_l;
            }
            var day = new Date(firstDay.getTime() + (24 * 60 * 60 * 1000 * index));
            var weeknum = getWeek(day);
            var data = week_data[weeknum];
            if (data) {
                data.qty = data.qty + qty;
            } else {
                var json = {};
                json.qty = qty;
                week_data[weeknum] = json;
                weeks_no.push(weeknum);
            }
        }
        week_data['weeks'] = weeks_no;
        return week_data;
    }

    function getWeek(day) {
        var d1 = new Date(day);
        var d2 = new Date(day);
        d2.setMonth(0);
        d2.setDate(1);
        var numweekf = d2.getDay();
        var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
        var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
        var num = Math.ceil(days / 7);
        return num;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
