/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/format'], function(search, format) {

    function getInputData() {
        try{
            var limit = 4000;
            var item_arr = [];
            search.create({
                type: 'customrecord_rsf_sales_forcast',
                // filters: [
                //     { name: 'custrecord_rsf_item', operator: 'anyof', values: 10400},
                //     { name: 'custrecord_rsf_store', operator: 'anyof', values: [4]}
                // ],
                columns : [ 
                    'custrecord_rsf_sales_forcast_store',
                    'custrecord_rsf_sales_forcast_item',
                    'custrecord_rsf_sales_forcast_date',
                    'custrecord_rsf_sales_forcast_quantity'
                ]
            }).run().each(function (rec) {
                var monthWeekDate = splitMonthToWeek(format.parse({ value:rec.getValue('custrecord_rsf_sales_forcast_date'), type: format.Type.DATE}),rec.getValue('custrecord_rsf_sales_forcast_quantity'));
                log.debug('monthWeekDate',monthWeekDate);
                item_arr.push({
                    store_id: rec.getValue('custrecord_rsf_sales_forcast_store'),
                    item_id: rec.getValue('custrecord_rsf_sales_forcast_item'),
                    forcast_date: rec.getValue('custrecord_rsf_sales_forcast_date'),
                    forcast_time: format.parse({ value:rec.getValue('custrecord_rsf_sales_forcast_date'), type: format.Type.DATE}),
                    forcast_quantity: rec.getValue('custrecord_rsf_sales_forcast_quantity'),
                    monthWeekDate: monthWeekDate
                });
                return --limit > 3999;
            });
            log.debug('item_arr',item_arr.length);
            log.debug('item_arr',item_arr);
        }catch(e){
            log.debug('e',e);
        }
    }

    function map(context) {
        try{
            log.debug('context',context);
            // var forecast_id;
            // search.create({
            //     type: 'customrecord_demand_forecast',
            //     filters: [
            //         { name: 'custrecord_demand_forecast_item_sku', operator: 'anyof', values: item },
            //         { name: 'custrecord_demand_forecast_account', operator: 'anyof', values: store }
            //     ]
            // }).run().each(function (result) {
            //     forecast_id = result.id;
            //     return true;
            // });
            // if (!forecast_id) {
            //     var forecast_record = record.create({ type: 'customrecord_demand_forecast', isDynamic: true });
            //     forecast_record.setValue({ fieldId: 'custrecord_demand_forecast_item_sku', value: item });
            //     forecast_record.setValue({ fieldId: 'custrecord_demand_forecast_account', value: store });
            //     forecast_id = forecast_record.save();
            // }
            // var forecast_child_id;
            // search.create({
            //     type: 'customrecord_demand_forecast_child',
            //     filters: [
            //         { name: 'custrecord_demand_forecast_parent', operator: 'anyof', values: forecast_id },
            //         { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: format.format({ value: new Date(new Date().getTime() + 8 * 3600 * 1000), type: format.Type.DATE }) },
            //         { name: 'custrecord_demand_forecast_l_data_type', operator: 'is', values: 1 },
            //     ]
            // }).run().each(function (result) {
            //     forecast_child_id = result.id;
            //     return true;
            // });
            // var forecast_child_record;
            // if (!forecast_child_id) {
            //     forecast_child_record = record.create({ type: 'customrecord_demand_forecast_child', isDynamic: true });
            //     forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_l_date', value: new Date(new Date().getTime() + 8 * 3600 * 1000) });
            //     forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_l_data_type', value: 1 });
            //     forecast_child_record.setValue({ fieldId: 'custrecord_demand_forecast_parent', value: forecast_id });
            // } else {
            //     forecast_child_record = record.load({ type: 'customrecord_demand_forecast_child', id: forecast_child_id });
                
            // }
            // var weeks = monthWeekDate.weeks;
            // for (var index = 0; index < weeks.length; index++) {
            //     var week_num = weeks[index];
            //     var week_key = 'custrecord_quantity_week' + week_num;
            //     var qty = monthWeekDate[week_num].qty;
            //     forecast_child_record.setValue({ fieldId: week_key, value: qty });
            // }
            // forecast_child_record.save();
        }catch(e){
            log.debug('e',e);
        }
    }

    function reduce(context) {
        
    }

    function summarize(summary) {
        
    }

    function splitMonthToWeek(monthStartDate, skuqty) {
        var firstDay = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1);
        var monthDays = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0).getDate();
        var day_qty_a = Math.floor(skuqty / monthDays);
        log.debug('day_qty_a',day_qty_a);
        var day_qty_l = skuqty - (day_qty_a * (monthDays - 1));
        var week_data = {};
        var weeks_no = [];
        for (var index = 0; index < monthDays; index++) {
            var qty = day_qty_a;
            if ((index + 1) == monthDays) {
                qty = day_qty_l;
            }
            var day = new Date(firstDay.getTime() + (24 * 60 * 60 * 1000 * index));
            log.debug('day' + index,day);
            var weeknum = getWeek(day);
            log.debug('index' + index,weeknum);
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
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
