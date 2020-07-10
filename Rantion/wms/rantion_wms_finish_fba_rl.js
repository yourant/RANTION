/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../Helper/config.js', 'N/search', 'N/http'],
function(config, search, http) {

    function _get(context) {
        
    }

    function _post(context) {
        try {
            // 获取token
            var token = getToken();
            var transferOrderNO = context.transferOrderNO;
            if (token) {
                var data = {
                    'aono': transferOrderNO
                };
                message = sendRequest(token, data);
                var flag = false;
                if (message.code == 0) {
                    log.error('response code', message.data);
                    flag = true;
                }
            } else {
                message.code = 1;
                message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
            }
        } catch (error) {
            log.error('出错了', error);
            message.code = 5;
            message.data = error.message;
        }
        return message;
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    /**
     * 获取token
     */
    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 1
            }],
            columns: ['custrecord_wtr_token']
        }).run().each(function (result) {
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
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: config.WMS_Debugging_URL + '/allocationMaster/allocationFinishForFBA/' + data.aono,
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        // log.error('response', JSON.stringify(response));
        if (response.code == 200) {
            retdata = JSON.parse(response.body);
        } else {
            retdata = '请求被拒'
        }
        if (response.code == 200) {
            // 调用成功
        } else {
            code = 1;
            // 调用失败
        }
        message.code = code;
        message.data = retdata;
        return message;
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
