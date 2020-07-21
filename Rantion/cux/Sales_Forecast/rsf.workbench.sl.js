/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["N/search", "N/https", "N/task", "N/format", "N/ui/message", "N/ui/serverWidget", "./utils/fun.lib"], function(search, https, task, format, message, ui, fun_lib_1) {

    function onRequest(context) {
        if (context.request.method == https.Method.POST) {
            return post(context);
        }
        var form = ui.createForm({ title: 'RSF 预测工作台' });
        form.clientScriptModulePath = "./statement.print.cs.js";
        form.addSubmitButton({ label: '预测运算' });
        form.addButton({
            id: 'button_export',
            label: '导出Excel',
            functionName: 'ExportSalesForecast'
        });
        // form.addFieldGroup({ id: 'custpage_fg_00', label: '执行预测' });
        // const f6 = form.addField({ id: 'custpage_date', type: ui.FieldType.DATE, label: '预测日期', container: 'custpage_fg_00' });
        // f6.defaultValue = context.request.parameters['custpage_date'];
        var fg = form.addFieldGroup({ id: 'custpage_fg_01', label: '查询' });
        var f0 = form.addField({ id: 'custpage_store', type: ui.FieldType.SELECT, source: 'customrecord_aio_account', label: '店铺', container: 'custpage_fg_01' });
        f0.defaultValue = context.request.parameters['custpage_store'];
        var f2 = form.addField({ id: 'custpage_department', type: ui.FieldType.SELECT, source: 'department', label: '事业部', container: 'custpage_fg_01' });
        f2.defaultValue = context.request.parameters['custpage_department'];
        var f4 = form.addField({ id: 'custpage_site', type: ui.FieldType.SELECT, source: 'customrecord_aio_amazon_global_sites', label: '站点', container: 'custpage_fg_01' });
        f4.defaultValue = context.request.parameters['custpage_site'];
        var f5 = form.addField({ id: 'custpage_item', type: ui.FieldType.SELECT, source: 'item', label: 'SKU', container: 'custpage_fg_01' });
        f5.defaultValue = context.request.parameters['custpage_item'];
        var filters = [];
        if (context.request.parameters['custpage_store']) {
            filters.push({ name: 'custrecord_rsf_sales_forcast_store', operator: search.Operator.ANYOF, values: context.request.parameters['custpage_store'] });
        }
        if (context.request.parameters['custpage_department']) {
            filters.push({ name: 'custitem_dps_division', join: 'custrecord_rsf_sales_forcast_item', operator: search.Operator.ANYOF, values: context.request.parameters['custpage_department'] });
        }
        if (context.request.parameters['custpage_site']) {
            filters.push({ name: 'custrecord_aio_enabled_sites', join: 'custrecord_rsf_sales_forcast_store', operator: search.Operator.ANYOF, values: context.request.parameters['custpage_site'] });
        }
        if (context.request.parameters['custpage_item']) {
            filters.push({ name: 'custrecord_rsf_sales_forcast_item', operator: search.Operator.ANYOF, values: context.request.parameters['custpage_item'] });
        }
        var sb_02 = form.addSublist({ id: 'custpage_sb_02', type: ui.SublistType.LIST, label: '销售预测单' });
        sb_02.addField({ id: 'store', type: ui.FieldType.TEXT, label: '店铺' });
        sb_02.addField({ id: 'store_id', label: '店铺id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        sb_02.addField({ id: 'sku', type: ui.FieldType.TEXT, label: '货品名称' });
        sb_02.addField({ id: 'sku_id', label: '货品id', type: ui.FieldType.TEXT }).updateDisplayType({ displayType: ui.FieldDisplayType.HIDDEN });
        sb_02.addField({ id: 'unit', type: ui.FieldType.TEXT, label: '单位' });
        sb_02.addField({ id: 'date', type: ui.FieldType.TEXT, label: '预测日期' });
        sb_02.addField({ id: 'month', type: ui.FieldType.TEXT, label: '预测月份' });
        sb_02.addField({ id: 'quantity', type: ui.FieldType.INTEGER, label: '预测值' });
        sb_02.addField({ id: 'alter', type: ui.FieldType.INTEGER, label: '修改后预测值' });
        sb_02.addField({ id: 'created', type: ui.FieldType.TEXT, label: '生成日期' });
        sb_02.addField({ id: 'updated', type: ui.FieldType.TEXT, label: '修改日期' });
        var limit = 4000;
        var dict = [];
        var s = search.load({ type: 'customrecord_rsf_sales_forcast', id: 'customsearch_rsf_sales_forcast' });
        log.debug('s.columns',s.columns);
        filters.push.apply(filters, s.filters);
        search.create({
            type: 'customrecord_rsf_sales_forcast',
            filters: filters,
            columns: s.columns,
        }).run().each(function (rec) {
            dict.push({
                store: rec.getText(rec.columns[0]),
                store_id: rec.getValue(rec.columns[0]),
                sku: rec.getText(rec.columns[1]),
                sku_id: rec.getValue(rec.columns[1]),
                unit: rec.getValue(rec.columns[2]),
                date: rec.getValue(rec.columns[3]),
                month: rec.getValue(rec.columns[4]),
                quantity: rec.getValue(rec.columns[5]),
                alter: rec.getValue(rec.columns[6]),
                created: rec.getValue(rec.columns[7]),
                updated: rec.getValue(rec.columns[8]),
            });
            return --limit > 0;
        });
        if (limit == 0) {
            form.addPageInitMessage({ type: message.Type.WARNING, message: '注意：数据超过了当前页面4000的最大限制，部分数据没有显示完全！', });
        }
        dict.map(function (d, line) {
            sb_02.setSublistValue({ id: 'store', value: "" + (d.store || '-'), line: line });
            sb_02.setSublistValue({ id: 'store_id', value: "" + (d.store_id || '-'), line: line });
            sb_02.setSublistValue({ id: 'sku', value: "" + (d.sku || '-'), line: line });
            sb_02.setSublistValue({ id: 'sku_id', value: "" + (d.sku_id || '-'), line: line });
            sb_02.setSublistValue({ id: 'unit', value: "" + (d.unit || '-'), line: line });
            sb_02.setSublistValue({ id: 'date', value: "" + (d.date || '-'), line: line });
            sb_02.setSublistValue({ id: 'month', value: "" + (d.month || '-'), line: line });
            sb_02.setSublistValue({ id: 'quantity', value: "" + (d.quantity || '0'), line: line });
            sb_02.setSublistValue({ id: 'alter', value: "" + (d.alter || '0'), line: line });
            sb_02.setSublistValue({ id: 'created', value: "" + (d.created || '-'), line: line });
            sb_02.setSublistValue({ id: 'updated', value: "" + (d.updated || '-'), line: line });
        });
        return context.response.writePage({ pageObject: form });
    }

    function post(ctx){
        var dt;
        if (ctx.request.parameters['custpage_date']) {
            dt = format.parse({ type: format.Type.DATE, value: ctx.request.parameters['custpage_date'] });
        }
        else {
            dt = new Date();
        }
        try {
            var t = task.create({ taskType: task.TaskType.MAP_REDUCE, scriptId: 'customscript_rsf_forcast_mp_2', deploymentId: 'customdeploy_dps_test1', params: { custscript_rsf_forcast_date: dt } });
            t.submit();
        }
        catch (error) {
            fun_lib_1.handleErrorAndSendNotification(error, 'calculate_sales_speed');
        }
        ctx.response.write("\u7EDF\u8BA1\u5DF2\u7ECF\u53D1\u5E03\u5230\u540E\u53F0\uFF0C\u8FD9\u4E2A\u4F1A\u9700\u8981\u4E00\u5B9A\u7684\u65F6\u95F4\uFF0C\u60A8\u53EF\u4EE5\u79FB\u6B65\u5DE5\u4F5C\u53F0\u67E5\u770B\u7ED3\u679C\uFF01");
    }

    return {
        onRequest: onRequest
    }
});
