/**!
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 基于日期生成预测结果
 * @scriptID    customscript_rsf_forcast_mp
 * @deploymentID    customdeploy_rsf_forcast_mp
 */
define(["require", "exports", "N/search", "N/record", "N/log", "N/format", "N/runtime", "./utils/fun.lib", "./service/rsf.lib", '../../Helper/Moment.min'], function (require, exports, search, record, log, format, runtime, fun_lib_1, rsf_lib_1,moment) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function (ctx) {
        var list = [];
        var dt;
        if (runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' })) {
            dt = format.parse({ type: format.Type.DATE, value: runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' }) });
        }
        else {
            dt = new Date();
        }
        [
            new Date(dt.getFullYear(), dt.getMonth() + 1, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 2, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 3, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 4, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 5, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 6, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 7, 0),
            new Date(dt.getFullYear(), dt.getMonth() + 8, 0),
        ].map(function (dt) {
            var speed = rsf_lib_1.calculate_sales_speed(dt);
            list.push.apply(list, Object.keys(speed).map(function (store_id_and_item_id) { return [dt, store_id_and_item_id, speed[store_id_and_item_id]]; }));
        });
        return list;
    };
    exports.map = function (ctx) {
        var obj = JSON.parse(ctx.value);
        var dt = obj[0];
        var _a = obj[1].split('-'), store_id = _a[0], item_id = _a[1];
        var speed = obj[2];
        ctx.write(store_id + "|" + item_id + "|" + dt, speed);
    };
    exports.reduce = function (ctx) {
        ctx.values.map(function (v) {
            log.emergency('reduce', { key: ctx.key, speed: v });
            var _a = ctx.key.split('|'), store_id = _a[0], item_id = _a[1], date = _a[2];
            log.emergency('_a', _a);
            log.emergency('store_id', store_id);
            log.emergency('item_id', item_id);
            log.emergency('date', date);
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var dt = moment(date).format(dateFormat);
            log.emergency('dt', dt);
            var dt_qu = dt.getDate();
            log.emergency('dt_qu', dt_qu);
            // var dt = format.format({ type: format.Type.DATE, value: format.parse({ type: format.Type.DATE, value: date }) });
            // log.emergency('dt', dt);
            var speed = Number(v);
            log.emergency('speed', speed);
            var r;
            try{
                search.create({
                    type: 'customrecord_rsf_sales_forcast',
                    filters: [
                        { name: 'custrecord_rsf_sales_forcast_store', operator: search.Operator.ANYOF, values: store_id },
                        { name: 'custrecord_rsf_sales_forcast_item', operator: search.Operator.ANYOF, values: item_id },
                        { name: 'custrecord_rsf_sales_forcast_date', operator: search.Operator.ON, values: dt },
                    ]
                }).run().each(function (rec) {
                    r = record.load({ type: 'customrecord_rsf_sales_forcast', id: rec.id, isDynamic: true });
                    return false;
                });
            }catch(e){
                log.emergency('e', e);
            }
            
            if (!r) {
                r = record.create({ type: 'customrecord_rsf_sales_forcast', isDynamic: true });
                r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_store', value: store_id });
                r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_item', value: item_id });
                r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_date', value: dt });
            }
            r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_quantity', value: Math.round(speed * 30) });
            try {
                r.save();
            }
            catch (error) {
                fun_lib_1.handleErrorAndSendNotification(error, 'rsf.forcast.mp');
            }
        });
    };
    exports.summarize = fun_lib_1.summarization;
});
