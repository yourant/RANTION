/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/format'], function(search, format) {

    function getInputData() {
        var date=new Date;
        var year=date.getFullYear(); 

        var item_arr = [];
        search.create({
            type: 'customrecord_rsf_daily_sales',
            filters: [
                { name: 'custrecord_rsf_item', operator: 'anyof', values: 10400},
                { name: 'custrecord_rsf_store', operator: 'anyof', values: [4]}
            ],
            columns : [ 
                'custrecord_rsf_date',
                'custrecord_rsf_sales',
                'custrecord_rsf_item',
                'custrecord_rsf_store'
            ]
        }).run().each(function (rec) {
            var item_date = format.parse({ value:rec.getValue('custrecord_rsf_date'), type: format.Type.DATE});
            var item_week = weekofday(item_date);
            var item_year = rec.getValue('custrecord_rsf_date').substring(rec.getValue('custrecord_rsf_date').lastIndexOf('/')+1);
            if(year == item_year){
                item_arr.push({
                    bill_id: rec.id,
                    item_id: rec.getValue('custrecord_rsf_item'),
                    item_store: rec.getValue('custrecord_rsf_store'),
                    item_quantity: rec.getValue('custrecord_rsf_sales'),
                    item_week: item_week,
                    item_date: rec.getValue('custrecord_rsf_date')
                })
            }
            
            return true;
        });
        log.debug('item_arr',item_arr);
        var need_transit_num = [];
        if(item_arr.length > 0){
            var po_no = [];
            for (var i = 0; i < item_arr.length; i++) {
                if (po_no.indexOf(item_arr[i]['item_id'] + item_arr[i]['item_store'] + item_arr[i]['item_week']) === -1) {
                    need_transit_num.push({
                        id: item_arr[i]['item_id'] + item_arr[i]['item_store'] + item_arr[i]['item_week'],
                        item_id: item_arr[i]['item_id'],
                        item_store: item_arr[i]['item_store'],
                        item_quantity: item_arr[i]['item_quantity'],
                        item_week: item_arr[i]['item_week']
                    });
                } else {
                    for (var j = 0; j < need_transit_num.length; j++) {
                        if (need_transit_num[j].id == item_arr[i]['item_id'] + item_arr[i]['item_store'] + item_arr[i]['item_week']) {
                            need_transit_num[j]['item_quantity'] = item_arr[i]['item_quantity']*1 + need_transit_num[j]['item_quantity']*1;
                            break;
                        }
                    }
                }
                po_no.push(item_arr[i]['item_id'] + item_arr[i]['item_store'] + item_arr[i]['item_week']);
            }
        }
        log.debug('need_transit_num',need_transit_num);
    }

    function map(context) {
        
    }

    function reduce(context) {
        
    }

    function summarize(summary) {
        
    }

    function weekofday(data) {
        // log.debug('data',data);
        // var value = format.parse({value:data, type: format.Type.DATE});
        // log.debug('value',value);
        // var value = moment(value1).format('YYYY/MM/DD');
        // log.debug('value',value);
        // var dt = new Date(value);
        var dt = data;
        // log.debug('dt',dt);
        var y = dt.getFullYear();
        // log.debug('y',y);
        var start = "1/1/" + y;

        // log.debug('start',start);

        start = new Date(start);
        
        // log.debug('start_1',start);

        starts = start.valueOf();

        // log.debug('starts',starts);

        startweek = start.getDay();

        // log.debug('startweek',startweek);

        dtweek = dt.getDay();

        // log.debug('dtweek',dtweek);

        var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1 ;
        
        // log.debug('days',days);

        days = Math.floor(days / 7);

        // log.debug('days_1',days);

        return (days + 2);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
