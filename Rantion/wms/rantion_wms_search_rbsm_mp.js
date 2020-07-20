/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define([], function() {

    function getInputData() {

    }

    function map(context) {

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    /**
     * 获取token
     */
    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{ name: 'internalid', operator: 'anyof', values: 1 }],
            columns: ['custrecord_wtr_token']
        }).run().each(function(result) {
            token = result.getValue('custrecord_wtr_token');
        });
        return token;
    }

    /**
     * 发送请求
     * @param {*} token 
     * @param {*} data 
     */
    function sendRequest(token, data) {
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: 'http://47.107.254.110:18082/rantion-wms/outMaster',
            headers: headerInfo,
            body: data
        });

        retdata = JSON.stringify(response.body);
        if (response.code == 200) {
            // 调用成功
            code = retdata.code;
        } else {
            code = 1;
            // 调用失败
        }
        message.code = code;
        message.data = retdata;
        return message;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});