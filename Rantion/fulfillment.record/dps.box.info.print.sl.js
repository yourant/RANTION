/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-09 20:17:42
 * @LastEditTime   : 2020-08-09 20:47:27
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
    'N/redirect'
], function (config, tool, http, redirect) {

    function onRequest(context) {

        var parameters = context.request.parameters;
        var custpage_print = parameters.custpage_print;

        if (custpage_print) {

            var getArr = tool.getBoxInfo(custpage_print);

            var redisId = Date.parse(new Date());
            var obj = tool.groupBoxInfo(getArr);

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
        }

    }

    return {
        onRequest: onRequest
    }
});