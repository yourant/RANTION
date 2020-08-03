/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record'], function (search, log, record) {

    function getInputData() {
        var orders = [], limit = 3999;
        search.create({
            type: 'customrecord_aio_connector_missing_order',
            filters: [
                { name: 'custrecord_aio_missing_order_marketplace', operator: 'is', values: 27 }
            ]
        }).run().each(function (rec) {
            orders.push(rec.id);
            return limit-- > 0;
        });
        log.audit('获取总数', orders.length);
        return orders;
    }

    function map(context) {
        try{
            record.delete({
                type : 'customrecord_aio_connector_missing_order',
                id : context.value
            });
            log.audit('delete',context.value);
        }catch(e){
            log.audit('e',e);
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
