/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/http'], function(log, http) {

    var _url = 'http://47.107.254.110/dingtalk/';

    var aes_key = 'rUfx1QWm2VYkmj4vKRUENbfZ1J13pgWbUevuDvhITrR';

    var headerInfo = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    };

    function _get(context) {

    }

    function _post(context) {


        var clear_message;




    }

    function _put(context) {

    }

    function _delete(context) {

    }

    function register_call_back() {
        var token = getToken();
        var url = _url + '/call_back/register_call_back?access_token=' + token;
        var body = {
            "aes_key": aes_key,
            "call_back_tag": '["bpms_task_change","bpms_instance_change"]',
            "url": "http://47.107.254.110:18082/rantion-user/token/dingtalk",
            "token": "123456"
        }

        var response = http.post({
            url: url,
            headers: headerInfo,
            body: body
        });

        log.error('register_respond', response);

    }


    function getToken(isreget) {

        var token = '';
        var time;
        if (!isreget) {
            search.create({
                type: 'customrecord_dps_dingding_token',
                columns: [
                    'custrecord_dps_dingding_token_value',
                    'custrecord_dps_dingding_token_time'
                ]
            }).run().each(function(result) {
                token = result.getValue('custrecord_dps_dingding_token_value');
                time = result.getValue('custrecord_dps_dingding_token_time');
            });

            if (token == '' || new Date().getTime() - Number(time) > 7200000) {
                isreget = true;
            }
        }
        if (isreget) {

            var appKey = 'ding3ldujbffzatwuzfw';
            var appSecret = 'k0Kb7BcSqDuG7G3e0pC6AQYi3aKis2lTC9Mch82x1Jqscyr8Oopl4_iV665C-vUy';

            var url = _url + '/gettoken?appkey=' + appKey + '&appsecret=' + appSecret;

            var response = http.get({
                url: url,
                headers: headerInfo,
            });

            var result = response.toJSON();
            if (result.code == 200) {
                var res = JSON.parse(result.body)

                if (res.errcode == 0) {
                    record.submitFields({
                        type: 'customrecord_dps_dingding_token',
                        values: {
                            'custrecord_dps_dingding_token_value': res.access_token,
                            'custrecord_dps_dingding_token_time': (new Date().getTime() - 1000).toString()
                        },
                        id: 1
                    });
                    token = res.access_token;
                    log.error('new-token', token);
                } else {
                    log.error('gettoken_error2:', res);
                }
            } else {
                log.error('gettoken_error:', result.body);
            }

        }
        return token;
    }


    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});