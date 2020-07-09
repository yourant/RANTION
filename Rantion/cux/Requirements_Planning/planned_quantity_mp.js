/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', '../../Helper/Moment.min', 'N/runtime'], function(search, log, record, moment, runtime) {

    function getInputData() {
        try{
            var old_arr = [], new_arr = [], need_arr = [];
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var old_day = moment(new Date(+new Date()+8*3600*1000 - 24*3600*1000).getTime()).format(dateFormat);
            log.debug('old_day',old_day);
            search.create({
                type: 'customrecord_demand_forecast_child',
                filters: [
                    { name:'custrecord_demand_forecast_l_date', operator: 'on', values: old_day }
                ]
            }).run().each(function (rec) {
                old_arr.push(rec.id)
                return true;
            });

            var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
            log.debug('today',today);
            search.create({
                type: 'customrecord_demand_forecast_child',
                filters: [
                    { name:'custrecord_demand_forecast_l_date', operator: 'on', values: today }
                ]
            }).run().each(function (rec) {
                new_arr.push(rec.id)
                return true;
            });
            log.debug('new_arr',new_arr);
            log.debug('old_arr',old_arr);
            
            if(old_arr.length > 0 && new_arr.length > 0){
                for(var i = 0; i < old_arr.length; i++){
                    if(new_arr.indexOf(old_arr[i]) == -1){
                        need_arr.push(old_arr[i]);
                    }
                }
                log.debug('need_arr',need_arr);
                return need_arr;
            }else{
                return old_arr;
            }
        }catch(e){
            log.debug('e',e);
        }
    }

    function map(context) {
        var today = new Date(+new Date()+8*3600*1000);
        var bill_id = context.value;
        try{
            var forecast_child = record.copy({
                type: 'customrecord_demand_forecast_child',
                id: bill_id,
                isDynamic: true
            });  
            forecast_child.setValue({fieldId: 'custrecord_demand_forecast_l_date',value: today});
            forecast_child.save();
            if(forecast_child){
                log.debug('复制成功','id为：' + forecast_child)
            }else{
                log.debug('复制失败','复制失败')
            }
        }catch(e){
            log.debug('e',e)
        }
        
        
    }

    function reduce(context) {
        
    }

    function summarize(summary) {
        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
