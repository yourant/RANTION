/**!
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 *
 * @apply customrecord_rsf_daily_sales
 * @scriptNAME  RSF 设置销量数据表会计期间
 * @scriptID    customscript_rsf_daily_sales_ue
 * @deploymentID    customdeploy_rsf_daily_sales_ue
 */
define(["require", "exports", "N/record", 'N/log'], function (require, exports, record, log) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.beforeSubmit = function (ctx) {
        if (ctx.type === ctx.UserEventType.DELETE || ctx.type === 'xedit')
            return;
        var r = record.create({ type: record.Type.INVENTORY_ADJUSTMENT, isDynamic: true });
        var subsidiaries = r.getField({ fieldId: 'subsidiary' }).getSelectOptions();
        if (subsidiaries.length > 0) {
            r.setValue({ fieldId: 'subsidiary', value: subsidiaries.pop().value });
            r.setValue({ fieldId: 'trandate', value: ctx.newRecord.getValue('custrecord_rsf_date') });
            if (r.getValue({ fieldId: 'postingperiod' })) {
                ctx.newRecord.setValue({ fieldId: 'custrecord_rsf_month', value: r.getValue({ fieldId: 'postingperiod' }) });
            }
        }
    };
});
