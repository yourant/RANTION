/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/record","N/log",'N/search',"./../Helper/core.min"], 
function(record,log,search,aio) {

    function _get(context) {
        
    }

    function _post(context) {
        var order_ids = context.recId,type = context.type,message = {},status = 'error',data = '创建失败';
        if(order_ids.length > 0){
            try{
                var result;
                if(type == 1){
                    //生成交货单
                    result = deliveryOrders(order_ids);
                }
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

    //获取采购订单信息
    function deliveryOrders(order_ids){
        log.debug('order_ids',order_ids);
        var need_arr = [], result_list = {};
        order_ids.map(function(line){
            var item_list = [], list_json = {}, amount_num = 0;
            list_json.po_id = line;
            var purchaseorder_data = record.load({type: 'purchaseorder',id: line,isDynamic: true});
            list_json.entity = purchaseorder_data.getValue('entity');
            for(var i = 0; i < purchaseorder_data.getLineCount({ sublistId: 'item'}); i++){
                amount_num += purchaseorder_data.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i });
                var item = purchaseorder_data.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var quantity = purchaseorder_data.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                var rate = purchaseorder_data.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                item_list.push({
                    item : item,
                    quantity : quantity,
                    rate : rate
                })
            }
            list_json.amount = amount_num;
            list_json.item = item_list;
            need_arr.push(list_json);
        });

        log.debug('need_arr',need_arr);

        if(need_arr.length > 0){
            try{
                var delivery_record = createDelivery(need_arr);
                if(delivery_record.length == need_arr.length){
                    result_list.status = 'success';
                    result_list.data = '生成交货单成功';
                }else{
                    result_list.status = 'error';
                    result_list.data = '生成交货单失败';
                }
            }catch(e){
                result_list.status = 'error';
                result_list.data = e.message;
                log.debug('error ------',e);
            }
        }else{
            result_list.status = 'error';
            result_list.data = '生成交货单失败';
        }
        return result_list;
    }

    //生成交货单
    function createDelivery(need_arr){
        var res_arr = [];
        need_arr.map(function(line){
            //生成po编号(流水号)
            var need_date = aio.Moment.utc(new Date()).format('YYYYMMDD'),
            recid,
            existPoNumber,
            extRecord;
            var poNumber = 'DO' + need_date;
            search.create({
                type : 'customrecord_dps_delivery_schedule',
                filters : [
                    {name : 'custrecord_delivery_schedule_date', operator : 'is', values : need_date},
                    ],
            }).run().each(function(result){
                recid = result.id;
            });
            if(!recid){
                existPoNumber = 1;
                extRecord = record.create({type : 'customrecord_dps_delivery_schedule'});
                extRecord.setValue({fieldId : 'custrecord_delivery_schedule_date',value : need_date});
                extRecord.setValue({fieldId : 'custrecord_delivery_schedule_num',value : existPoNumber});
                //extRecord.save();
                poNumber = poNumber + '0000' + existPoNumber;
            }else{
                extRecord = record.load({type : 'customrecord_dps_delivery_schedule', id : recid});
                existPoNumber = Number(extRecord.getValue('custrecord_delivery_schedule_num')) + 1;
                if(existPoNumber < 10){
                    poNumber = poNumber + '0000' + existPoNumber;
                }else if(existPoNumber >= 10 && existPoNumber < 100){ 
                    poNumber = poNumber + '000' + existPoNumber;
                }else if(existPoNumber >= 100 && existPoNumber < 1000){
                    poNumber = poNumber + '00' + existPoNumber;
                }else if(existPoNumber >= 1000 && existPoNumber < 10000){
                    poNumber = poNumber + '0' + existPoNumber;
                }else{
                    poNumber = poNumber + existPoNumber;
                }
                extRecord.setValue({fieldId : 'custrecord_delivery_schedule_num',value : existPoNumber});
                //extRecord.save(); 
            };

            var delivery_ord = record.create({ type: 'customrecord_dps_delivery_order', isDynamic: true });
            delivery_ord.setValue({fieldId: 'custrecord_supplier', value: line.entity});
            delivery_ord.setValue({fieldId: 'custrecord_delivery_no', value: poNumber});
            delivery_ord.setValue({fieldId: 'custrecord_purchase_order_no', value: line.po_id});
            delivery_ord.setValue({fieldId: 'custrecord_delivery_amount', value: line.amount});
            //产品
            line.item.map(function (li) {
                delivery_ord.selectNewLine({ sublistId: 'recmachcustrecord_dps_delivery_order_id' });
                delivery_ord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_item_sku', value: li.item });
                delivery_ord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_purchase_quantity', value: li.quantity });
                delivery_ord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_outstanding_quantity', value: li.quantity });
                delivery_ord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_unit_price', value: li.rate });
                try {
                    delivery_ord.commitLine({ sublistId: 'recmachcustrecord_dps_delivery_order_id' });
                }catch (err) {
                    throw err;
                }
            });
            var res_id = delivery_ord.save();
            if(res_id){
                extRecord.save();
                log.debug('po_id',line.po_id);
                // record.submitFields({
                //     type: 'purchaseorder',
                //     id: line.po_id,
                //     values: {
                //         custbody_dps_delivery_id: res_id
                //     }
                // });
                var purchase_data = record.load({ type: 'purchaseorder', id: line.po_id });
                var delivery_id_arr = purchase_data.getValue('custbody_dps_delivery_id');
                delivery_id_arr.push(res_id);
                purchase_data.setValue({ fieldId: 'custbody_dps_delivery_id', value: delivery_id_arr });
                purchase_data.save();
                res_arr.push(res_id);
            }
        });
        return res_arr;
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