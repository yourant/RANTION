/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

    function _get(context) {
        
    }

    function _post(context) {
        //获取蓝深2、蓝图3、蓝贸5下的仓库
        var location_arr = [];
        search.create({
            type: 'location',
            filters: [
                { name: 'subsidiary', operator: 'anyof', values: [2,3,5] },
                { name: 'custrecord_wms_location_type', operator: 'anyof', values: [1]},
                { name: 'isinactive', operator: 'is', values:'F'}
            ],
            columns : [
                'name',
                'subsidiary'
            ]
        }).run().each(function (rec) {
            var subsidiary_id,transfer_location;
            if(rec.getValue('subsidiary') == '广州蓝深科技有限公司'){
                subsidiary_id = 2;
                transfer_location = 203;
            }else if(rec.getValue('subsidiary') == '广州蓝图创拓进出口贸易有限公司'){
                subsidiary_id = 3;
                transfer_location = 206;
            }else if(rec.getValue('subsidiary') == '蓝深贸易有限公司'){
                subsidiary_id = 5;
                transfer_location = 204;
            }
            location_arr.push({
                location_id: rec.id,
                transfer_location: transfer_location,
                name: rec.getValue('name'),
                subsidiary_id: subsidiary_id,
            });
            return true;
        });
        log.debug('location_arr',location_arr);
        
        var po_no = [],need_location_arr = [];
        for (var i = 0; i < location_arr.length; i++) {
            if (po_no.indexOf(location_arr[i].subsidiary_id) === -1) {
                need_location_arr.push({
                    subsidiary: location_arr[i].subsidiary_id,
                    transfer_location: location_arr[i].transfer_location,
                    lineLocations: [location_arr[i].location_id]
                });
            } else {
                for (var j = 0; j < need_location_arr.length; j++) {
                    if (need_location_arr[j].subsidiary == location_arr[i].subsidiary_id) {
                        need_location_arr[j].lineLocations.push(location_arr[i].location_id);
                        break;
                    }
                }
            }
            po_no.push(location_arr[i].subsidiary_id);
        }

        log.debug('need_location_arr',need_location_arr);

        var items_arr = context.items,message = {},status = 'error',data = '创建失败', week = context.week;
        if(items_arr.length > 0){
            try{
                var result = createBill(items_arr,week,need_location_arr);
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

    function createBill(items_arr,week,need_location_arr){
        var item_arr = [];
        for(var i = 0; i < items_arr.length; i++){
            item_arr.push(items_arr[i]['item_id']);
        }
        log.debug('item_arr',item_arr)
        var new_item = [], result_data = {};
        //查询所有产品在蓝深2、蓝图3、蓝贸5下的仓库所有库位的库存量
        var location_list_result = [];
        need_location_arr.map(function(l){
            l.lineLocations.map(function(line){
                var location_list = [];
                search.create({
                    type: 'location',
                    filters: [
                        { name: 'custrecord_dps_parent_location', operator: 'anyof', values:line},
                        { name: 'custrecord_wms_location_type', operator: 'anyof', values: [2,3]},
                        { name: 'isinactive', operator: 'is', values:'F'}
                    ]
                }).run().each(function (rec) {
                    location_list.push(rec.id);
                    return true;
                });
                if(location_list.length > 0){
                    var filters = [];
                    filters.push({ name: 'inventorylocation', operator: 'anyof', values: location_list });
                    filters.push({ name: 'internalid', operator: 'is', values: item_arr });
                    search.create({
                        type: 'item',
                        filters: filters,
                        columns : [ 
                            'name', 'locationquantityonhand',
                        ]
                    }).run().each(function (rec) {
                        location_list_result.push({
                            item_id: rec.id,
                            item_inventory: rec.getValue('locationquantityonhand'),
                            subsidiary: l.subsidiary,
                            location: line,
                            transfer_location: l.transfer_location
                        })
                        return true;
                    });
                }
            })
        })
        //将数组中相同地点的数量进行相加
        var b = []//记录数组a中的id 相同的下标
        for(var i = 0; i < location_list_result.length;i++){
            for(var j = location_list_result.length-1;j>i;j--){
                if(location_list_result[i].item_id == location_list_result[j].item_id && location_list_result[i].location == location_list_result[j].location){
                    location_list_result[i].item_inventory = (location_list_result[i].item_inventory*1 + location_list_result[j].item_inventory*1).toString()
                    b.push(j)
                }
            }
 
        }

        for(var k = 0; k<b.length;k++){
            location_list_result.splice(b[k],1)
        }
        log.debug('location_list_result',location_list_result)
        var po_no = [],new_location_arr = [];
        for (var i = 0; i < location_list_result.length; i++) {
            if (po_no.indexOf(location_list_result[i].item_id) === -1) {
                new_location_arr.push({
                    item_id: location_list_result[i].item_id,
                    inventory_item : [{
                        subsidiary: location_list_result[i].subsidiary,
                        transfer_location: location_list_result[i].transfer_location,
                        location: location_list_result[i].location,
                        item_inventory: location_list_result[i].item_inventory
                    }]
                });
            } else {
                for (var j = 0; j < new_location_arr.length; j++) {
                    if (new_location_arr[j].item_id == location_list_result[i].item_id) {
                        new_location_arr[j].inventory_item.push({
                            subsidiary: location_list_result[i].subsidiary,
                            transfer_location: location_list_result[i].transfer_location,
                            location: location_list_result[i].location,
                            item_inventory: location_list_result[i].item_inventory
                        });
                        break;
                    }
                }
            }
            po_no.push(location_list_result[i].item_id);
        }
        log.debug('new_location_arr',new_location_arr)

        items_arr.map(function(line){
            search.create({
                type : 'item',
                filters : [
                    {name : 'internalid', operator : 'is', values : line.item_id},
                ],
                columns : [
                    'custitem_dps_group',
                    'custitem_dps_transport'
                ]
            }).run().each(function(result){
                var location,subsidiary,price_no;
                search.create({
                    type: 'customrecord_aio_account',
                    filters: [
                        { name: 'internalId', operator: 'is', values: line.account_id },
                    ],
                    columns: [
                        { name: 'custrecord_aio_fbaorder_location'},
                        { name: 'custrecord_aio_subsidiary'},
                    ]
                }).run().each(function (rec) {
                    location = rec.getValue('custrecord_aio_fbaorder_location');
                    subsidiary = rec.getValue('custrecord_aio_subsidiary');
                });

                search.create({
                    type: 'item',
                    filters: [
                        { name: 'internalid', operator: 'is', values: line.item_id },
                        { name: 'inventorylocation', operator: 'anyof', values: 1607 }
                    ],
                    columns: [
                        { name: 'locationaveragecost'},
                    ]
                }).run().each(function (rec) {
                    price_no = rec.getValue('locationaveragecost');
                });

                new_item.push({
                    item_id: line.item_id,
                    account_id: line.account_id,
                    item_quantity: line.item_quantity,
                    dps_group: result.getValue('custitem_dps_group') ? result.getValue('custitem_dps_group') : '',
                    dps_transport: result.getValue('custitem_dps_transport') ? result.getValue('custitem_dps_transport') : '',
                    subsidiary: subsidiary ? subsidiary : '',
                    location: location ? location : '',
                    week_date: line.week_date,
                    price_no: price_no ? price_no : ''
                })
            });
        });
        log.debug('new_item',new_item);

        week.map(function(li){
            var item = [];
            if(new_item.length > 0){
                var po_no = [];
                for (var i = 0; i < new_item.length; i++) {
                    if(li == new_item[i]['week_date']){
                        if (po_no.indexOf(new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location) === -1) {
                            item.push({
                                location_log: new_item[i].dps_group + new_item[i].dps_transport + new_item[i].subsidiary + new_item[i].location,
                                subsidiary: new_item[i].subsidiary,
                                location: new_item[i].location,
                                lineItems: [{
                                    item_id: new_item[i].item_id,
                                    account_id: new_item[i].account_id,
                                    item_quantity: new_item[i].item_quantity,
                                    dps_group: new_item[i].dps_group,
                                    dps_transport: new_item[i].dps_transport,
                                    subsidiary: new_item[i].subsidiary,
                                    location: new_item[i].location,
                                    price_no: new_item[i].price_no ? new_item[i].price_no : ''
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
            }
            log.debug('item',item);
            var ord_len = [];
            if(item.length > 0){
                item.map(function(line){
                    var new_need_list_arr = [],need_item_arr = [];
                    if(new_location_arr.length > 0){
                        line.lineItems.map(function (l) {
                            log.debug('l.item_id',l.item_id);
                            var old_quantity = l.item_quantity;
                            new_location_arr.map(function(ll){
                                if(ll.item_id == l.item_id){
                                    if(need_item_arr.indexOf(l.item_id) == -1){
                                        need_item_arr.push(l.item_id);
                                    }
                                    for(var i = 0; i < ll.inventory_item.length; i++){
                                        if(old_quantity > ll.inventory_item[i].item_inventory){
                                            new_need_list_arr.push({
                                                subsidiary: ll.inventory_item[i].subsidiary,
                                                location: ll.inventory_item[i].location,
                                                target_subsidiary: l.subsidiary,
                                                target_warehouse: l.location,
                                                transfer_location: ll.inventory_item[i].transfer_location,
                                                lineItems: [{
                                                    item_id: l.item_id,
                                                    item_quantity: ll.inventory_item[i].item_inventory ? ll.inventory_item[i].item_inventory : old_quantity,
                                                    price_no: 30
                                                }]
                                            })
                                            old_quantity -= ll.inventory_item[i].item_inventory ? ll.inventory_item[i].item_inventory : old_quantity;
                                            if(i == ll.inventory_item.length - 1 && old_quantity != 0){
                                                new_need_list_arr.push({
                                                    subsidiary: 5,
                                                    location: 542,
                                                    target_subsidiary: l.subsidiary,
                                                    target_warehouse: l.location,
                                                    transfer_location: 204,
                                                    lineItems: [{
                                                        item_id: l.item_id,
                                                        item_quantity: old_quantity,
                                                        price_no: 30
                                                    }]
                                                })
                                            }
                                        } else{
                                            new_need_list_arr.push({
                                                subsidiary: ll.inventory_item[i].subsidiary,
                                                location: ll.inventory_item[i].location,
                                                target_subsidiary: l.subsidiary,
                                                target_warehouse: l.location,
                                                transfer_location: ll.inventory_item[i].transfer_location,
                                                lineItems: [{
                                                    item_id: l.item_id,
                                                    item_quantity: old_quantity,
                                                    price_no: 30
                                                }]
                                            })
                                        } 
                                    }
                                }
                            })
                        });
                    }

                    for(var i = 0; i < line.lineItems.length; i++){
                        if(need_item_arr.indexOf(line.lineItems[i].item_id) == -1){
                            new_need_list_arr.push({
                                subsidiary: 5,
                                location: 542,
                                target_subsidiary: line.lineItems[i].subsidiary,
                                target_warehouse: line.lineItems[i].location,
                                transfer_location: 204,
                                lineItems: [{
                                    item_id: line.lineItems[i].item_id,
                                    item_quantity: line.lineItems[i].item_quantity,
                                    price_no: 30
                                }]
                            })
                        }
                    }
                    log.debug('new_need_list_arr',new_need_list_arr);

                    var po_no = [],new_result_arr = [];
                    for (var i = 0; i < new_need_list_arr.length; i++) {
                        if (po_no.indexOf(new_need_list_arr[i].subsidiary + new_need_list_arr[i].location) === -1) {
                            new_result_arr.push({
                                id: new_need_list_arr[i].subsidiary + new_need_list_arr[i].location,
                                subsidiary: new_need_list_arr[i].subsidiary,
                                location: new_need_list_arr[i].location,
                                target_subsidiary: new_need_list_arr[i].target_subsidiary,
                                target_warehouse: new_need_list_arr[i].target_warehouse,
                                transfer_location: new_need_list_arr[i].transfer_location,
                                lineItems: new_need_list_arr[i].lineItems
                            });
                        } else {
                            for (var j = 0; j < new_result_arr.length; j++) {
                                if (new_result_arr[j].id == new_need_list_arr[i].subsidiary + new_need_list_arr[i].location) {
                                    new_result_arr[j].lineItems.push(new_need_list_arr[i].lineItems[0]);
                                    break;
                                }
                            }
                        }
                        po_no.push(new_need_list_arr[i].subsidiary + new_need_list_arr[i].location);
                    }
                    log.debug('new_result_arr',new_result_arr)
                    new_result_arr.map(function(l){
                        var t_ord = record.create({ type: 'transferorder', isDynamic: true });      
                        t_ord.setValue({ fieldId: 'subsidiary', value: l.subsidiary });
                        t_ord.setValue({ fieldId: 'location', value: l.location });
                        t_ord.setValue({ fieldId: 'transferlocation', value: l.transfer_location });//虚拟仓
                        t_ord.setValue({ fieldId: 'custbodyactual_target_subsidiary', value: l.target_subsidiary });
                        t_ord.setValue({ fieldId: 'custbody_actual_target_warehouse', value: l.target_warehouse });
                        t_ord.setValue({ fieldId: 'custbody_dps_transferor_type', value: 1 });
                        l.lineItems.map(function (lia) {
                            t_ord.selectNewLine({ sublistId: 'item' });
                            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: lia.item_id });
                            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Math.abs(lia.item_quantity)});
                            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: lia.price_no ? lia.price_no : 0});
                            // 其他字段
                            try {
                                t_ord.commitLine({ sublistId: 'item' });
                            }
                            catch (err) {
                                throw "Error inserting item line: " + lia.item_id + ", abort operation!" + err;
                            }
                        });
                        var t_ord_id = t_ord.save();
                        ord_len.push(t_ord_id);
                    })
                })
            }
            if(ord_len.length > 0){
                result_data.status = 'success';
                result_data.data = '生成成功';
            }else{
                result_data.status = 'error';
                result_data.data = '生成失败';
            }
        });
        
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
