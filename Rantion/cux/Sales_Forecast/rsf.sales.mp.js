/**!
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 计算销量
 * @scriptID    customscript_rsf_daily_sales_mp
 * @deploymentID    customdeploy_rsf_daily_sales_mp
 */
define(["require", "exports", "N/search", "N/record", "./utils/fun.lib", 'N/log'], function (require, exports, search, record, fun_lib_1, log) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function (ctx) {
        try{
            var data = [];
            var limit = 4000;
            var filters = [];
            filters.push({ name: 'mainline', operator: search.Operator.IS, values: false });
            filters.push({ name: 'taxline', operator: search.Operator.IS, values: false });
            filters.push({ name: 'shipping', operator: search.Operator.IS, values: false });
            search.create({
                type: search.Type.SALES_ORDER,
                filters: filters,
                columns: [
                    { name: 'custbody_order_locaiton', summary: search.Summary.GROUP },
                    { name: 'item', summary: search.Summary.GROUP },
                    { name: 'quantity', summary: search.Summary.SUM },
                    { name: 'trandate', summary: search.Summary.GROUP },
                ]
            }).run().each(function (rec) {
                log.debug('rec',rec);
                data.push({
                    store_id: rec.getValue({ name: 'custbody_order_locaiton', summary: search.Summary.GROUP }),
                    item_id: rec.getValue({ name: 'item', summary: search.Summary.GROUP }),
                    quantity: rec.getValue({ name: 'quantity', summary: search.Summary.SUM }),
                    date: rec.getValue({ name: 'trandate', summary: search.Summary.GROUP }),
                });
                return --limit > 0;
            });
    
            log.debug('data',data);
            return;
            return data;
        }catch(e){
            log.debug('e',e);
        }
    };
    exports.map = function (ctx) {
        var obj = JSON.parse(ctx.value);
        ctx.write(obj.item_id + "|" + obj.store_id + "|" + obj.date, ctx.value);
    };
    exports.reduce = function (ctx) {
        ctx.values.map(function (v) {
            var obj = JSON.parse(v);
            var r;
            search.create({
                type: 'customrecord_rsf_daily_sales',
                filters: [
                    { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: obj.store_id },
                    { name: 'custrecord_rsf_item', operator: search.Operator.ANYOF, values: obj.item_id },
                    { name: 'custrecord_rsf_date', operator: search.Operator.ON, values: obj.date },
                ]
            }).run().each(function (rec) {
                r = record.load({ type: 'customrecord_rsf_daily_sales', id: rec.id, isDynamic: true });
                return false;
            });
            if (!r) {
                r = record.create({ type: 'customrecord_rsf_daily_sales', isDynamic: true });
                r.setValue({ fieldId: 'custrecord_rsf_store', value: obj.store_id });
                r.setValue({ fieldId: 'custrecord_rsf_item', value: obj.item_id });
                r.setText({ fieldId: 'custrecord_rsf_date', text: obj.date });
            }
            r.setValue({ fieldId: 'custrecord_rsf_sales', value: obj.quantity });
            r.setValue({ fieldId: 'custrecord_rsf_sales_alter', value: obj.quantity });
            r.save();
        });
    };
    exports.summarize = fun_lib_1.summarization;
});
