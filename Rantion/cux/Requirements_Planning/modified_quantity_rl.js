/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/search', 'N/record', '../../Helper/Moment.min', 'N/runtime'], function(log, search, record, moment, runtime) {

    function _get(context) {
        
    }

    function _post(context) {
        log.debug('context',context);
        var items_arr = context.data;
        if(items_arr.length > 0){
            try{
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                var today = moment(new Date(+new Date()+8*3600*1000).getTime()).format(dateFormat);
                items_arr.map(function(line){
                    var bill_id,data_type;
                    if(line.item_type == 5){
                        data_type = 3;
                        //店铺净需求量
                    }else if(line.item_type == 8){
                        data_type = 16;  
                        //确认交货数量
                    }else{
                        data_type = line.item_type;
                    }
                    search.create({
                        type: 'customrecord_demand_forecast_child',
                        filters: [
                            { name: 'custrecord_demand_forecast_account', join: 'custrecord_demand_forecast_parent', operator: 'is', values: line.item_account},
                            { name: 'custrecord_demand_forecast_item_sku', join: 'custrecord_demand_forecast_parent', operator: 'is', values: line.item_id},
                            { name: 'custrecord_demand_forecast_l_data_type', operator: 'is', values: data_type},
                            { name: 'custrecord_demand_forecast_l_date', operator: 'on', values: today}
                        ]
                    }).run().each(function (rec) {
                        bill_id = rec.id;
                    });
                    
                    var r = record.load({ type: 'customrecord_demand_forecast_child',id: bill_id});
                    r.setValue({fieldId: line.item_week, value: line.item_quantity});
                    r.save();
                })
            }catch(e){
                log.debug('e',e);
            }
            
        }
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
