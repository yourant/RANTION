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
        if(context.TT =="storeDemand"){
        // 需求计划的修改静需求量数据更新
            StoreDemand(items_arr,context.today)
            return "Updated";
        }
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
     
    /** 
     * 需求计划的修改静需求量数据更新
     */
    function StoreDemand(item_arr6,today){
     // 设置例外信息处理情况
    var bill_id;
    item_arr6.map(function (itls) {
      search
        .create({
          type: 'customrecord_demand_forecast_child',
          filters: [
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_item_sku',
              operator: 'anyof',
              values: itls.item_id
            },
            {
              join: 'custrecord_demand_forecast_parent',
              name: 'custrecord_demand_forecast_account',
              operator: 'anyof',
              values: itls.account_id
            },
            {
              name: 'custrecord_demand_forecast_l_date',
              operator: 'on',
              values: today
            },
            {
              name: 'custrecord_demand_forecast_l_data_type',
              operator: 'anyof',
              values: itls.data_type
            }
          ]
        })
        .run()
        .each(function (rec) {
          bill_id = rec.id
        });
      log.debug('bill_id', bill_id);
      var child_bill_data;
      if (bill_id) {
        child_bill_data = record.load({
          type: 'customrecord_demand_forecast_child',
          id: bill_id
        });
        var field_name = 'custrecord_quantity_week' + itls.week_date
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        });
        child_bill_data.save();
      } else {
        var forecast_id;
        search
          .create({
            type: 'customrecord_demand_forecast',
            filters: [
              {
                name: 'custrecord_demand_forecast_item_sku',
                operator: 'anyof',
                values: itls.item_id
              },
              {
                name: 'custrecord_demand_forecast_account',
                operator: 'anyof',
                values: itls.account_id
              }
            ]
          })
          .run()
          .each(function (rec) {
            forecast_id = rec.id
          });
        log.debug('forecast_id', forecast_id);
        child_bill_data = record.create({
          type: 'customrecord_demand_forecast_child'
        });
        child_bill_data.setText({
          fieldId: 'custrecord_demand_forecast_l_date',
          text: today
        });
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_l_data_type',
          value: itls.data_type
        });
        child_bill_data.setValue({
          fieldId: 'custrecord_demand_forecast_parent',
          value: forecast_id
        });
        var field_name = 'custrecord_quantity_week' + itls.week_date;
        child_bill_data.setValue({
          fieldId: field_name,
          value: itls.item_quantity
        });
        child_bill_data.save();
      }
    })
    }
    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
