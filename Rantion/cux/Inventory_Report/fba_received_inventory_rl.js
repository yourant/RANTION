/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {

    function _get(context) {

    }

    function _post(context) {
        log.debug('context', context);
        var result = {}, data = context.data;
        result.msg = '生成库存调整失败';
        if (data) {
            var error_arr = [];
            data.map(function (line) {
                var id;
                try {
                    var inventory_adjustment = record.create({ type: 'inventoryadjustment', isDynamic: true });
                    inventory_adjustment.setValue({ fieldId: 'subsidiary', value: 5 });//子公司
                    inventory_adjustment.setValue({ fieldId: 'account', value: 522 });//调整科目
                    inventory_adjustment.setValue({ fieldId: 'custbody_stock_use_type', value: 40 });//库存调整-领用类型
                    inventory_adjustment.setValue({ fieldId: 'department', value: line.department });//部门
                    inventory_adjustment.setValue({ fieldId: 'class', value: line.line_class });//类
                    inventory_adjustment.setValue({ fieldId: 'adjlocation', value: line.warehouse });//调整位置
                    inventory_adjustment.setValue({ fieldId: 'custbody_address_name', value: line.shipment_id });//shipment_id
                    inventory_adjustment.setValue({ fieldId: 'custbody_related_transfer_order', value: line.billnum_id });//库存转移单id
                    inventory_adjustment.selectNewLine({ sublistId: 'inventory' });
                    inventory_adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'item', value: line.sku });
                    inventory_adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'location', value: line.warehouse });
                    inventory_adjustment.setCurrentSublistValue({ sublistId: 'inventory', fieldId: 'adjustqtyby', value: line.difference_qua });
                    inventory_adjustment.commitLine({ sublistId: 'inventory' });
                    id = inventory_adjustment.save();
                } catch (e) {
                    log.debug('e', e);
                    error_arr.push(line.billnum + '单号的' + line.sku_name + '货品，生成库存调整单失败,' + e.message);
                }

                if (id) {
                    var inventory_id = [];
                    search.create({
                        type: 'customrecord_dps_fba_received_inventory',
                        filters: [
                            { name: 'custrecord_dps_fba_received_inve_account', operator: 'is', values: line.store_id }, //店铺
                            { name: 'custrecord_dps_fba_received_inven_sku', operator: 'is', values: line.seller_sku },//sellersku 
                            { name: 'custrecord_dps_fba_received_shipment_id', operator: 'is', values: line.shipment_id } //shipment_id
                        ]
                    }).run().each(function (rec) {
                        inventory_id.push(rec.id);
                        return true;
                    });
                    
                    if(inventory_id.length > 0){
                        inventory_id.map(function(li){
                            record.submitFields({
                                type: 'customrecord_dps_fba_received_inventory',
                                id: li,
                                values: {
                                    custrecord_dps_fba_received_iscreate: true
                                }
                            });
                        });
                    }else{
                        error_arr.push(line.billnum + '单号的' + line.sku_name + '货品，生成库存调整单失败,' + e.message);
                        record.delete({
                            type: 'inventoryadjustment',
                            id: id
                        });
                    }
                }
            });
            if (error_arr.length > 0) {
                result.msg = error_arr;
            }else{
                result.msg = '生成成功';
            }
        }
        return result;
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
