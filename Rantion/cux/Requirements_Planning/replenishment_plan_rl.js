/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function(record, search, log, runtime) {

    function _get(context) {
        
    }

    function _post(context) {
        var items_arr = context.items,message = {},status = 'error',data = '创建失败', week = context.week;
        if(items_arr.length > 0){
            try{
                var result = createBill(items_arr,week);
                log.debug('result',result);
                status = result.status;
                data = result.data;
            }catch(e){
                message.data = e.message;
                log.debug('error',e);
            }
        }
        message.status = status;
        message.data = data;
        return message;
    }
     

// 1.由补货计划生成采购申请，交易主体默认选择为SKU的首选供应商；
// 2.若是多个SKU在存在不同的首选供应商，则按供应商进行拆分，生成多个采购申请；
// 3.若SKU没有默认供应商，则交易主体为蓝深贸易


    function createBill(items_arr){
        var result_data = {},ord_len = [];
        items_arr.map(function(line){
            var t_ord = record.create({ type: 'purchaserequisition', isDynamic: true });
            t_ord.setValue({ fieldId: 'custbody_dps_type', value: 2 });
            var acc  = line.account_id
            var subsidiary = 5  //蓝深贸易
            t_ord.setValue({ fieldId: 'subsidiary', value: subsidiary });
            var entity_id = runtime.getCurrentUser().id;
            t_ord.setValue({ fieldId: 'entity', value: entity_id });
            var today = new Date(+new Date()+8*3600*1000);
            t_ord.setValue({ fieldId: 'trandate', value: today });
            t_ord.selectNewLine({ sublistId: 'item' });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.item_id });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Math.abs(line.item_quantity) });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount', value:  0});
            // 其他字段
            try {
                t_ord.commitLine({ sublistId: 'item'});
            }catch (err) {
                throw "Error inserting item line: " + line.item_id + ", abort operation!" + err;
            }
            var t_ord_id = t_ord.save();
            var plan_rec = record.create({ type: 'customrecord_replenishment_plan_rec' });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_account', value: acc });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_item', value: line.item_id });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_qty', value: Math.abs(line.item_quantity)  });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_reqpurchase', value: t_ord_id });
            plan_rec.save()
            ord_len.push(t_ord_id);
        })

        if(ord_len.length == items_arr.length){
            result_data.status = 'success';
            result_data.data = '生成成功';
        }else if(ord_len.length < items_arr.length){
            result_data.status = '部分生成成功';
            result_data.data = '生成成功的ID:' + ord_len;
        }else{
            result_data.status = 'error';
            result_data.data = '生成失败';
        }
        return result_data;
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
