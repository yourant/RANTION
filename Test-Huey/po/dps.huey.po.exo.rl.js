/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record'], function(record) {

    function _post(context) {
        log.debug('context', JSON.stringify(context));
        // {"poId":4757,"id":4759}
        var purchaseorder_id = context.poId;
        var return_id = context.id;
        //获取供应商退货审批记录
        var c_record = record.load({ id: return_id, type: 'vendorreturnauthorization' });
        
        //复制原采购订单
        var new_record = record.copy({ type: 'purchaseorder', id: purchaseorder_id });
        //获取订单子项个数
        var new_record_count = new_record.getLineCount({ sublistId: 'item' });
        //修改子项单价
        for (var i = 0; i < new_record_count; i++) {
            //修改子项数量
            var quantity = c_record.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
            new_record.setSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i, value: quantity });
            //修改子项日期
            new_record.setSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', line: i, value: new Date() });
        }

        //修改复制采购订单状态
        new_record.setValue({ fieldId: 'orderstatus', value: 'A', });
        //设置采购订单创建来源
        new_record.setValue({ fieldId: 'createdfrom', value: Number(purchaseorder_id) });
        //设置自定义类型
        new_record.setValue({ fieldId: 'custbody_dps_type', value: 1 }); // 存放对应的值 1代表“换货”
        //设置关联采购订单
        new_record.setValue({ fieldId: 'custbody_dps_link_po', value: Number(purchaseorder_id) });
        //设置新日期
        new_record.setValue({ fieldId: 'trandate', value: new Date() }); // 待修改，东八区

        var new_po_id;

        try {
            new_po_id = new_record.save();
            record.submitFields({
                type: 'vendorreturnauthorization',
                id: return_id,
                values: {
                    custbody_dps_link_po: new_po_id
                }
            });
        } catch (error) {
            log.debug('error', error);
        }
        return new_po_id || false;
    }

    return {
        post: _post,
    }
});