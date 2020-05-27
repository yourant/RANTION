/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

    function _get(context) {
        
    }

    function _post(context) {
        var items_arr = context.items,message = {},status = 'error',data = '创建失败';
        if(items_arr.length > 0){
            try{
                var result = createBill(items_arr);
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

    function createBill(items_arr){
        var new_item = [], result_data = {};
        items_arr.map(function(line){
            search.create({
                type : 'item',
                filters : [
                    {name : 'internalid', operator : 'is', values : line.item_id},
                ],
                columns : [
                    'custitem_dps_group',
                    'custitem_dps_transport',
                    'subsidiary'
                ]
            }).run().each(function(result){
                var location;
                search.create({
                    type: 'customrecord_aio_account',
                    filters: [
                        { name: 'internalId', operator: 'is', values: line.account_id },
                    ],
                    columns: [
                        { name: 'custrecord_aio_salesorder_location'}
                    ]
                }).run().each(function (rec) {
                    location = rec.getValue('custrecord_aio_salesorder_location');
                });
                new_item.push({
                    item_id: line.item_id,
                    account_id: line.account_id,
                    item_quantity: line.item_quantity,
                    dps_group: result.getValue('custitem_dps_group') ? result.getValue('custitem_dps_group') : '',
                    dps_transport: result.getValue('custitem_dps_transport') ? result.getValue('custitem_dps_transport') : '',
                    subsidiary: result.getValue('subsidiary') ? result.getValue('subsidiary') : '',
                    location: location ? location : ''
                })
            });
        });
        log.debug('new_item',new_item);

        var item = [];
        if(new_item.length > 0){
            var po_no = [];
            for (var i = 0; i < new_item.length; i++) {
                if (po_no.indexOf(new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location) === -1) {
                    item.push({
                        location_log: new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location,
                        subsidiary: new_item[i].subsidiary,
                        location: 207,//new_item[i].location,
                        lineItems: [{
                            item_id: new_item[i].item_id,
                            account_id: new_item[i].account_id,
                            item_quantity: new_item[i].item_quantity,
                            dps_group: new_item[i].dps_group,
                            dps_transport: new_item[i].dps_transport,
                            subsidiary: new_item[i].subsidiary,
                            location: new_item[i].location
                        }]
                    });
                } else {
                    for (var j = 0; j < item.length; j++) {
                        if (item[j].location_log == (new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location)) {
                            item[j].lineItems.push(new_item[i]);
                            break;
                        }
                    }
                }
                po_no.push(new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location);
            }
        }
        log.debug('item',item);

        var ord_len = [];
        if(item.length > 0){
            item.map(function(line){
                var t_ord = record.create({ type: 'transferorder', isDynamic: true });
                t_ord.setValue({ fieldId: 'subsidiary', value: line.subsidiary });
                t_ord.setValue({ fieldId: 'transferlocation', value: line.location });
                line.lineItems.map(function (li) {
                    t_ord.selectNewLine({ sublistId: 'item' });
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: li.item_id });
                    t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: li.item_quantity });
                    // 其他字段
                    try {
                        t_ord.commitLine({ sublistId: 'item' });
                    }
                    catch (err) {
                        throw "Error inserting item line: " + line.sku_code + ", abort operation!" + so.id + '---------' + err;
                    }
                });
                var t_ord_id = t_ord.save();
                ord_len.push(t_ord_id);
            })
        }
        if(ord_len.length == item.length){
            result_data.status = 'success';
            result_data.data = '生成成功';
        }else if(ord_len.length < item.length){
            result_data.status = '部分生成成功';
            result_data.data = '生成成功的ID:' + ord_len;
        }else{
            result_data.status = 'error';
            result_data.data = '生成失败';
        }
        log.debug('result_data',result_data);
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
