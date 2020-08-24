/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-09 20:17:42
 * @LastEditTime   : 2020-08-18 12:46:15
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.box.info.print.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['../Helper/config', '../Helper/tool.li', 'N/http',
    'N/redirect', 'N/file', '../cux/Declaration_Information/handlebars-v4.1.1', 'N/encode'
], function (config, tool, http, redirect, file, Handlebars, encode) {

    function onRequest(context) {

        var parameters = context.request.parameters;
        var custpage_print = parameters.custpage_print;
        var custpage_print_amazon = parameters.custpage_print_amazon;


        try {
            if (custpage_print) {

                var getArr = tool.getBoxInfo(custpage_print);

                var redisId = Date.parse(new Date());
                var obj = tool.groupBoxInfo(getArr);

                log.audit('obj', obj);

                log.audit('redisId', redisId)

                var token = tool.getToken();
                var code = 0;
                var retdata;
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/common/setBoxingReportBodyByRedis/" + redisId,
                    headers: headerInfo,
                    body: JSON.stringify(obj)
                });

                log.audit('response', response);
                if (response.code == 200) {
                    retdata = JSON.parse(response.body);
                    // 调用成功
                    code = retdata.code;
                    if (code == 0) {

                        redirect.redirect({
                            url: config.WMS_Debugging_URL + "/common/export/getBoxingReportExcel/" + redisId,
                            parameters: {
                                'custparam_test': 'helloWorld'
                            }
                        });

                    }
                } else {

                }

                return;


                var getArr = tool.getBoxInfo(64);

                var redisId = Date.parse(new Date());
                var print_data = tool.groupBoxInfo(getArr);

                log.audit('print_data', print_data.data);

                // 获取模板内容,写全路径或者内部ID
                var xmlID = "SuiteScripts/Rantion/fulfillment.record/xml/装箱单.xml";
                var model = file.load({
                    id: xmlID
                }).getContents();

                log.debug('xmlID', xmlID);

                var template = Handlebars.compile(model);
                var xml_1 = template(getAmaInfo);

                var nowDate = new Date().toISOString();
                var fileObj = file.create({
                    name: "装箱单-" + nowDate + ".xls",
                    fileType: file.Type.EXCEL,
                    contents: encode.convert({
                        string: xml_1,
                        inputEncoding: encode.Encoding.UTF_8,
                        outputEncoding: encode.Encoding.BASE_64
                    }),
                    encoding: file.Encoding.UTF8,
                    isOnline: true
                });

                context.response.writeFile({
                    file: fileObj,
                    isInline: true
                });

            } else if (custpage_print_amazon) {
                var getAmaInfo = tool.AmazonBoxInfo(custpage_print_amazon);

                log.audit('getAmaInfo', getAmaInfo);

                // 获取模板内容,写全路径或者内部ID
                var xmlID = "SuiteScripts/Rantion/fulfillment.record/xml/装箱单.xml";
                xmlID = "SuiteScripts/Rantion/fulfillment.record/xml/Amazon格式 装箱信息.xml";
                var model = file.load({
                    id: xmlID
                }).getContents();

                log.debug('xmlID', xmlID);

                var template = Handlebars.compile(model);
                var xml_1 = template(getAmaInfo);

                var nowDate = new Date().toISOString();
                var fileObj = file.create({
                    name: "Amazon 格式 装箱信息-" + getAmaInfo.aono + ".xls",
                    fileType: file.Type.EXCEL,
                    contents: encode.convert({
                        string: xml_1,
                        inputEncoding: encode.Encoding.UTF_8,
                        outputEncoding: encode.Encoding.BASE_64
                    }),
                    encoding: file.Encoding.UTF8,
                    isOnline: true
                });

                context.response.writeFile({
                    file: fileObj,
                    isInline: true
                });
            }

        } catch (error) {
            log.error('出错了', error);
        }

    }

    return {
        onRequest: onRequest
    }
});