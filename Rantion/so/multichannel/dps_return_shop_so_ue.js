/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/log',, 'N/record'], 
function(search,log, record) {

    function beforeLoad(context) {
        
    }

    function beforeSubmit(context) {
        
    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        var so_id;
        if(newRecord.getValue('custrecord_merchant_order_id')){
            search.create({
                type: 'salesorder',
                filters: [
                    { name: 'custbody_dps_fulfillment_order_id', operator: 'is', values: newRecord.getValue('custrecord_merchant_order_id')},
                ]
            }).run().each(function (rec) {
                so_id = rec.id;
                return false;
            });
            log.debug('so_id',so_id);
            if(so_id){
                var order_id = record.submitFields({
                    type: 'salesorder', 
                    id: so_id, 
                    values: {
                        'custbody_dps_delivery_shop_so': newRecord.getValue('custrecord_amazon_order_id'),
                    }
                }); 
                //创建履行单和发票
                if(order_id){
                    try{
                        var fulfillment = createItemFulfillment(so_id);
                        if(fulfillment){
                            log.debug('fulfillment 创建：','成功');
                            var invoice = createInvoice(so_id);
                            if(invoice){
                                log.debug("create INVOICE","创建成功");
                            }
                        }
                    }catch(e){
                        log.debug("create ERROR",e);
                    }
                }
            }
        }
    }
    
    //生成ITEM_FULFILLMENT
    function createItemFulfillment(id){
        try{
            var f = record.transform({
                fromType: record.Type.SALES_ORDER,
                toType: record.Type.ITEM_FULFILLMENT,
                fromId: Number(id)
            });
            f.setValue({ fieldId: 'shipstatus', value: 'C' });
            return f.save();
        }catch(e){
            throw e;
        }
    }

    //生成INVOICE
    function createInvoice(id){
        try{
            var inv = record.transform({
                fromType: record.Type.SALES_ORDER,
                toType: record.Type.INVOICE,
                fromId: Number(id)
            });
            return inv.save();
        }catch(e){
            throw e;
        }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
