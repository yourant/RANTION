/**!
 * @NApiVersion 2.x
 * @NScriptType Portlet
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF Portlet
 * @scriptID    customscript_rsf_forcast_workbench_pl
 * @deploymentID    customdeploy_rsf_forcast_workbench_pl
 */
define(["require", "exports", "N/search"], function (require, exports, search) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.render = function (ctx) {
        ctx.portlet.title = 'RSF 系统配置';
        var html = [];
        html.push("<ul>");
        search.create({ type: 'customrecord_rsf_system_config', columns: [
                { name: 'custrecord_rsf_config_store_field' },
                { name: 'custrecord_rsf_config_store_field_id' },
            ] }).run().each(function (rec) {
            html.push("<li>" + rec.getText('custrecord_rsf_config_store_field') + "</li>");
            return false;
        });
        html.push("</ul>");
        ctx.portlet.html = html.join('');
    };
});
