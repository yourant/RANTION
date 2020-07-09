/**!
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 环比增长率计算
 * @scriptID    customscript_rsf_sequential_growth_mp
 * @deploymentID    customdeploy_rsf_sequential_growth_mp
 */
define(["require", "exports", "N/search", "N/record", "./utils/fun.lib", "./service/rsf.lib", 'N/log'], function (require, exports, search, record, fun_lib_1, rsf_lib_1, log) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function (ctx) {
        var dict = rsf_lib_1.calculate_year_on_year_growth_rate(new Date());
        return Object.keys(dict).map(function (k) { return [k, dict[k]]; });
    };
    exports.map = function (ctx) {
        var obj = JSON.parse(ctx.value);
        var key = obj[0], result = obj[1];
        var _a = key.split('-'), cat_id = _a[0], depart_id = _a[1];
        if (cat_id && depart_id) {
            ctx.write(key, JSON.stringify(result));
        }
    };
    exports.reduce = function (ctx) {
        var _a = ctx.key.split('-'), cat_id = _a[0], depart_id = _a[1];
        ctx.values.map(function (v) {
            var obj = JSON.parse(v);
            // 判断是否存在
            var r;
            search.create({
                type: 'customrecord_rsf_sequential_growth_rate',
                filters: [
                    { name: 'custrecord_rsf_category', operator: search.Operator.ANYOF, values: cat_id },
                    { name: 'custrecord_rsf_department', operator: search.Operator.ANYOF, values: depart_id },
                    { name: 'created', operator: search.Operator.ON, values: 'today' }
                ]
            }).run().each(function (rec) {
                r = record.load({ type: 'customrecord_rsf_sequential_growth_rate', id: rec.id, isDynamic: true });
                return false;
            });
            if (!r) {
                r = record.create({ type: 'customrecord_rsf_sequential_growth_rate', isDynamic: true });
                r.setValue({ fieldId: 'custrecord_rsf_category', value: cat_id });
                r.setValue({ fieldId: 'custrecord_rsf_department', value: depart_id });
            }
            r.setValue({ fieldId: 'custrecord_rsf_growth_rate', value: obj.qty });
            r.save();
        });
    };
    exports.summarize = fun_lib_1.summarization;
});
