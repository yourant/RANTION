/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-21 15:27:41
 * @LastEditTime   : 2020-08-21 15:53:56
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \导出excel\out_excel2_sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(["require", "exports", "N/search", "N/record", "N/log",
    "N/ui/serverWidget", "N/file", 'N/encode', 'N/render'
], function (require, exports, search, record, log, ui, file, encode, render) {

    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object}
     *            context
     * @param {ServerRequest}
     *            context.request - Encapsulation of the incoming
     *            request
     * @param {ServerResponse}
     *            context.response - Encapsulation of the Suitelet
     *            response
     * @Since 2015.2
     */
    function onRequest(context) {
        var request = context.request;
        var method = request.method;
        var params = request.parameters;
        var excelData = JSON.parse(params.excelData);
        log.debug('excelData', excelData);
        var renderer = render.create();
        renderer.templateContent = file.load({
            id: 3411
        }).getContents();
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: "excelData",
            data: excelData
        });
        // 替换数据
        var fileContent = renderer.renderAsString();

        // 转换编码
        fileContent = encode.convert({
            string: fileContent,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64
        });
        var excelFile = file.create({
            name: '物料单信息.xlsx',
            fileType: file.Type.EXCEL,
            contents: fileContent
        });
        context.response.writeFile({
            file: excelFile,
            isInline: true
        });
    }
    return {
        onRequest: onRequest
    };

});
