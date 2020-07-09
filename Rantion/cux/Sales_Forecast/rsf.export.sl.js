/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/log', 'SuiteScripts/douples_amazon/Helper/handlebars-v4.1.1', 'N/file', 'N/search', 'N/encode'], 
function (log,Handlebars, file, search, encode) {
    function onRequest(context) {
        var response = context.response;
        var request = context.request
        var params = request.parameters; // 参数
        var fils = JSON.parse(params.fils);
        try{
            var lineComObj = getDate(fils);
            // 写全路径
            var model = file.load({
                id: 'SuiteScripts/Rantion/cux/Sales_Forecast/rsf.export.sl.xml'
            }).getContents();
            var template = Handlebars.compile(model);
            var xml = template(lineComObj);
            var fileObj = file.create({
                name: '销售预测.xls',
                fileType: file.Type.EXCEL,
                contents: encode.convert({
                    string: xml,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                }),
                encoding: file.Encoding.UTF8,
                isOnline: true
            });
            response.writeFile({ file: fileObj, isInline: true });
            log.debug('耗时：', new Date().getTime() - St);
        }catch(e){
            log.debug('e', e);
        }
    }

    function getDate(fils){
        var sku_id = [], store_id = [], need_date = [];
        for (var i = 0; i < fils.length; i++) {
            sku_id.push(fils[i].sku);
            store_id.push(fils[i].acc);
        }
        log.debug('sku_id',sku_id);
        log.debug('store_id',store_id);
        var s = search.load({ type: 'customrecord_rsf_sales_forcast', id: 'customsearch_rsf_sales_forcast' });
        search.create({
            type: 'customrecord_rsf_sales_forcast',
            filters: [
                { name: 'custrecord_rsf_sales_forcast_store', operator: search.Operator.ANYOF, values: store_id },
                { name: 'custrecord_rsf_sales_forcast_item', operator: search.Operator.ANYOF, values: sku_id },
            ],
            columns: s.columns,
        }).run().each(function (rec) {
            need_date.push({
                store_name: rec.getText(rec.columns[0]),
                item_name: rec.getText(rec.columns[1]),
                unit: rec.getText(rec.columns[2]),
                date: rec.getValue(rec.columns[3]),
                month: rec.getValue(rec.columns[4]),
                quantity: rec.getValue(rec.columns[5]),
                alter: rec.getValue(rec.columns[6]),
                created: rec.getValue(rec.columns[7]),
                updated: rec.getValue(rec.columns[8]),
            });
            return true;
        });
        var lineComObj = {}
        lineComObj['lines'] = need_date;
        return lineComObj;
    }

    return {
        onRequest: onRequest
    }
});
