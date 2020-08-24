/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', 'N/format', '../Helper/core.min'], function(search, log, record, format, aio) {

    function getInputData() {
        try{
            var dict = [], limit = 4000;
            var s = search.load({ type: 'customrecord_supplier_advance_charge', id: 'customsearch433' });
            search.create({
                type: 'customrecord_supplier_advance_charge',
                filters: s.filters,
                columns: s.columns,
            }).run().each(function (rec) {
                dict.push({
                    id: rec.id,
                    bill_id: rec.getValue(rec.columns[9]),
                    bill_date: rec.getValue(rec.columns[6]),
                });
                return --limit > 0;
            });
            log.debug('dict',dict.length);
            log.debug('dict',dict);
            return dict;
        }catch(e){
            log.debug('e',e);
        }
        
    }

    function map(context) {
        var data = JSON.parse(context.value);
        log.debug('data',data);
        try{
            var bill_data = record.load({type:'vendorprepayment', id:data.bill_id});
            bill_data.setText({fieldId: 'trandate',text: data.bill_date});
            var id = bill_data.save();
            log.debug('id',id);
        }catch(e){
            log.debug('e',e);
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
