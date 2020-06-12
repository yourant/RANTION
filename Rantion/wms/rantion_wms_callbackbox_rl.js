/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-03 15:34:35
 * @LastEditTime   : 2020-06-12 10:28:11
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_callbackbox_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function _get(context) {

    }



    function _post(context) {

        // if (rec_status == 17) {

        // NsCallbackForUpdateBoxRequestDto {
        //     aono(string): 调拨单号,
        //     boxLabelPath(string): 箱外标签文件路径,
        //     logisticsChannelCode(string): 物流渠道服务编号,
        //     logisticsChannelName(string): 物流渠道服务名称,
        //     logisticsLabelPath(string): 物流面单文件路径,
        //     logisticsProviderCode(string): 物流渠道商编号,
        //     logisticsProviderName(string): 物流渠道商名称
        // }

        var recordID = context.recordID;
        var message = {};
        var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label, tranType;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recordID
            }],
            columns: [{
                    name: "url",
                    join: "file"
                },
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码
                'custrecord_dps_shipping_r_channelservice', // 渠道服务
                'custrecord_dps_shipping_r_channel_dealer', //渠道商
                'custrecord_dps_shipping_rec_order_num', // 调拨单号
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
            ]
        }).run().each(function (rec) {
            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');
            aono = rec.getValue('custrecord_dps_shipping_rec_order_num');
            fileId = rec.getValue({
                name: "url",
                join: "file"
            });
            service_code = rec.getValue({
                name: 'custrecord_ls_service_code',
                join: 'custrecord_dps_shipping_r_channelservice'
            });
            channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
            channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
            channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            Label = rec.getValue('custrecord_fulfill_dh_label_addr'); // 面单地址
        })

        if (Label) {
            // 存在面单文件
            var url = 'https://';
            if (tranType == 1 && fileId) {
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileId;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url, // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
            };

            var token = getToken();
            if (token) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster/callbackForBox',
                    headers: headerInfo,
                    body: JSON.stringify(data)
                });
                log.debug('response', JSON.stringify(response));
                retdata = JSON.parse(response.body);
                var code;
                log.audit('retdata', retdata);
                if (response.code == 200) {
                    // 调用成功
                    if (retdata.code == 0) {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 19,
                                custrecord_dps_shipping_rec_wms_info: JSON.stringify(retdata.data)
                            }
                        });
                        message.code = 0;
                        message.msg = '推送面单文件成功';
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: JSON.stringify(retdata.data)
                            }
                        });
                        message.code = 3;
                        message.msg = '推送面单文件失败';
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 20,
                            custrecord_dps_shipping_rec_wms_info: '不存在 Token'
                        }
                    });
                    message.code = 5;
                    message.msg = '不存在 Token';
                }

                log.debug('code', code);
            }
        }
        // }
        // var message = {};
        // // 获取token
        // var token = getToken();
        // if (token) {
        //     var data = {};


        //     // 发送请求
        //     message = sendRequest(token, data);
        // } else {
        //     message.code = 1;
        //     message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        // }
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
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster/callbackForBox',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
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
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});