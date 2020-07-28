/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-23 20:57:45
 * @LastEditTime   : 2020-07-24 15:58:11
 * @LastEditors    : Li
 * @Description    : WMS 触发获取装箱信息处理情况、WMS 触发重新上传装箱信息
 * @FilePath       : \Rantion\wms\dps.amazon.label.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', '../../douples_amazon/Helper/core.min', 'N/log', 'N/http',
    '../Helper/config', 'N/runtime', 'N/file'
], function (record, search, core, log, http, config, runtime, file) {

    function _post(context) {

        var userObj = runtime.getCurrentUser();

        log.audit('当前用户', userObj);

        log.debug('context', context);
        var aono = context.aono,
            action = context.action;

        var ret = {};

        try {

            var recordID = searchFulRec(aono);

            if (action == "amazonFeedStatus") {
                ret = amazonFeedStatus(recordID);
            }

            if (action == "amazonBoxInfo") {
                ret = amazonBoxInfo(recordID);
            }

        } catch (error) {

            ret.code = 5;
            ret.data = null;
            ret.msg = "处理异常, 请稍后重试"

            log.error('处理出错了', error);
        }



        return ret || false;
    }



    /**
     * 根据调拨单号, 获取对应的调拨单
     * @param {String} aono 
     */
    function searchFulRec(aono) {
        var ful_id;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'tranid',
                join: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: aono
            }]
        }).run().each(function (rec) {
            ful_id = rec.id;
        });
        return ful_id || false;
    }


    /**
     * 获取装箱信息处理情况, 若处理成功, 则推送标签文件给 WMS
     * @param {Number} recordID 
     */
    function amazonFeedStatus(recordID) {

        var ret = {};
        var accountId, amazon_info, submission_ids = [];
        search.create({
            type: "customrecord_dps_shipping_record",
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recordID
            }],
            columns: [
                "custrecord_dps_shipping_rec_account", // 账号
                {
                    name: 'custrecord_aio_feed_submission_id',
                    join: 'custrecord_dps_upload_packing_rec'
                }, // feed ID 
                "custrecord_dps_shipment_info", // amazon 装运信息
            ]
        }).run().each(function (rec) {
            amazon_info = rec.getValue('custrecord_dps_shipment_info');
            submission_ids.push(rec.getValue({
                name: 'custrecord_aio_feed_submission_id',
                join: 'custrecord_dps_upload_packing_rec'
            }));
            accountId = rec.getValue('custrecord_dps_shipping_rec_account');
        })

        var a = core.amazon.getFeedSubmissionList(accountId, submission_ids);
        log.debug('装箱信息处理情况', a);

        var shipRec = record.load({
            type: 'customrecord_dps_shipping_record',
            id: recordID
        });

        var feed_processing_status = a[0].feed_processing_status;
        if (feed_processing_status == "_DONE_" && a[0].MessagesWithError == 0 && !a[0].ResultDescription) {
            shipRec.setValue({
                fieldId: "custrecord_dps_amazon_box_flag",
                value: true
            });
            // subFlag = false;
        }

        log.debug('a[0].ResultMessageCode', a[0].ResultDescription);
        if (a[0].MessagesWithError != 0) {
            var s = a[0].ResultDescription,
                str;
            if (amazon_info) {
                str = amazon_info + '\n' + s;
            }
            shipRec.setValue({
                fieldId: "custrecord_dps_shipment_info",
                value: str ? str : s
            });
        }
        shipRec.setValue({
            fieldId: "custrecord_dps_shipment_info",
            value: a[0].ResultDescription
        });

        shipRec.setText({
            fieldId: "custrecord_dps_amazon_press_status",
            text: a[0].feed_processing_status
        });


        var shipRec_id = shipRec.save();

        log.debug('更新发运记录', shipRec_id);

        //  _AWAITING_ASYNCHRONOUS_REPLY_  等待异步答复    _CANCELLED_		取消     _DONE_		完成
        // _IN_PROGRESS_	进行中       _IN_SAFETY_NET_      _SUBMITTED_  已提交      _UNCONFIRMED_   未确认

        var str = "Amazon 未处理完成";
        if (a[0].feed_processing_status == "_DONE_") {
            str = "Amazon 已处理完成";
        } else if (a[0].feed_processing_status == "_CANCELLED_") {
            str = "Amazon 已取消";
        }
        ret.msg = "装箱信息处理状态：" + str;


        if (feed_processing_status == "_DONE_" && a[0].MessagesWithError == 0 && !a[0].ResultDescription) { // 上传装箱信息处理结果无报错
            var af_rec = record.load({
                type: 'customrecord_dps_shipping_record',
                id: recordID
            });

            var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
            var rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

            var total_number = af_rec.getValue('custrecord_dps_total_number');
            log.debug('total_number', total_number);

            var getRe;
            // if (rec_shipmentsid) {
            try {
                getRe = core.amazon.GetPackageLabels(rec_account, total_number, rec_shipmentsid);
            } catch (error) {
                log.error('获取箱唛出错了', error);
            }
            log.debug('getRe', getRe);
            log.debug('获取箱外标签', 'end');
            if (getRe) {
                var add;
                if (channel_dealer == 6) {
                    try {
                        add = getShipAddByContent({
                            "base64": getRe
                        });
                    } catch (error) {
                        log.audit('解析PDF error', error);
                    }
                }
                var fileObj = file.create({
                    name: rec_shipmentsid + '.ZIP',
                    fileType: file.Type.ZIP,
                    contents: getRe,
                    // description: 'This is a plain text file.',
                    // encoding: file.Encoding.MAC_ROMAN,
                    folder: 36,
                    isOnline: true
                });

                var fileObj_id = fileObj.save();
                log.debug('fileObj_id', fileObj_id);
                var recValue = {};
                recValue.custrecord_dps_shipping_rec_status = 17;
                recValue.custrecord_dps_shipment_label_file = fileObj_id;
                if (add && add.length > 0) {
                    recValue.custrecord_dps_recpir_flag = add ? add : '';
                    var addLen = add.length;
                    recValue.custrecord_dps_ship_small_recipient_dh = add[0]; // 收件人 
                    recValue.custrecord_dps_street1_dh = add[1]; // 街道1
                    if (addLen > 6) {
                        recValue.custrecord_dps_street2_dh = add[2]; // 街道2
                    }
                    recValue.custrecord_dps_state_dh = add[addLen - 3]; // 州
                    var temp1 = add[addLen - 1],
                        temp2 = '',
                        temp3 = temp1.split(" ");
                    if (temp3.length > 1) {
                        temp2 = temp3[temp3.length - 1];
                        recValue.custrecord_dps_recipien_code_dh = temp3[0] + ' ' + temp3[1]; // 邮编
                    }
                    var seaCout;

                    try {
                        seaCout = searchCreateCountry(temp2);
                    } catch (error) {
                        log.debug('搜索创建国家 error', error);
                    }
                    if (seaCout) {
                        recValue.custrecord_dps_recipient_country_dh = seaCout; // 国家
                    }
                    var searCity;
                    try {
                        searCity = searchCreateCity(add[addLen - 2]);
                    } catch (error) {
                        log.debug('搜索创建城市 error', error);
                    }
                    if (searCity) {
                        recValue.custrecord_dps_recipient_city_dh = searCity; // 城市
                    }
                }

                // recValue.custrecord_dps_amazon_box_flag = true;

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: recValue
                });
                log.debug('id', id);
                var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');
                // if (channel_dealer == 6) { // 渠道为龙舟的, 获取到标签文件之后, 直接推送标签文件给WMS
                // }
                labelToWMS(af_rec);
            }

        } else { // 上传装箱信息处理结果有报错 / 或者为处理完成
            var st = 26;
            if (feed_processing_status == "_DONE_") {
                st = 28
                ret.code = 5;
                ret.msg = "装箱信息处理状态：" + a[0].ResultDescription;
            } else {
                ret.code = 3;
                ret.msg = "装箱信息处理状态：" + str;
            }

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: recordID,
                values: {
                    custrecord_dps_shipping_rec_status: st,
                    custrecord_dps_shipment_info: a[0].ResultDescription
                }
            });
        }


        return ret;
    }


    /**
     * 重新上传装箱信息, 若已完成, 且无报错信息, 则获取标签文件并推送 WMS
     * @param {Number} recId 
     */
    function amazonBoxInfo(recId) {

        var retObj = {};
        var rec_account, rec_shipmentsid;
        search.create({
            type: "customrecord_dps_shipping_record",
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [
                "custrecord_dps_shipping_rec_account", // 账号
                "custrecord_dps_shipping_rec_shipmentsid", // shipmentId 
            ]
        }).run().each(function (rec) {
            rec_account = rec.getValue('custrecord_dps_shipping_rec_account');
            rec_shipmentsid = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

        })

        // 上传装箱信息
        var gerep = core.amazon.submitCartonContent(rec_account, recId, rec_shipmentsid);

        if (gerep == "_SUBMITTED_") {
            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: recId,
                values: {
                    custrecord_dps_shipping_rec_status: 24,
                    custrecord_dps_shipment_info: "装箱信息已经上传Amazon"
                }
            });

            retObj.code = 0;
            retObj.data = null;
            retObj.msg = "装箱信息已经上传Amazon: " + gerep
            return retObj;
            // } else if (gerep == "_DONE_") { // 装箱信息处理完成,直接
            //     retObj = amazonFeedStatus(recId);
        } else {
            retObj.code = 5;
            retObj.data = null;
            retObj.msg = "装箱信息已经上传Amazon: " + gerep
            return retObj;
        }



        return retObj;

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

        log.debug('sendRequest data', data);
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: config.WMS_Debugging_URL + '/allocationMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) {
            // 调用成功
            retdata = JSON.parse(response.body);
            code = retdata.code;
        } else {
            code = 1;
            // 调用失败
            retdata = "请求失败"
        }
        message.code = code;
        message.data = retdata;
        return message;
    }



    function getShipToAddr(str) {

        var newArr = [];
        var a = str.split("FBA");
        var b = a[1];
        var c = b.toString().split("发货地");

        var d = c[0].split("\n");

        for (var i = 0, len = d.length; i < len; i++) {
            if (d[i] == "" || d[i] == undefined || d[i] == null || d[i].indexOf('目的地') > -1 || d[i].indexOf('发货地') > -1 || d[i].indexOf("Declarant") > -1) {
                continue;
            }
            newArr.push(d[i].trim());
        }

        return newArr || false;
    }


    function getShipAddByContent(data) {

        var str;
        log.debug('sendRequest data', data);
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': getToken()
        };
        var response = http.post({
            // url: 'http://47.107.254.110:8066/swagger-ui.html#!/36890299922604127861/pdfParseToTextUsingPOST',
            // url: 'http://47.107.254.110:18082/rantion-wms/common/pdfParseToText',
            url: config.WMS_Debugging_URL + '/common/pdfParseToText',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        retdata = JSON.parse(response.body);

        if (retdata.code == 0) {
            var jsonRep = retdata.data;
            str = getShipToAddr(jsonRep);
        }

        return str || false;

    }



    /**
     * 标签文件推送 WMS
     * @param {Object} af_rec 
     */
    function labelToWMS(af_rec) {

        var fileId, service_code, channelservice, channel_dealer, channel_dealer_id, aono, Label, tranType, waybillNo, location_financia;
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [{
                    name: "url",
                    join: "file"
                },
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码
                'custrecord_dps_shipment_label_file', // 装运标签文件
                'custrecord_dps_shipping_r_channelservice', // 渠道服务
                'custrecord_dps_shipping_r_channel_dealer', //渠道商
                'custrecord_dps_shipping_rec_order_num', // 调拨单号
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                'custrecord_fulfill_dh_label_addr', // 面单地址,
                'custrecord_dps_shipping_rec_logistics_no', // 物流运单号
                {
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                },
                {
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
                }
            ]
        }).run().each(function (rec) {

            waybillNo = rec.getValue('custrecord_dps_shipping_rec_logistics_no');

            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');
            aono = rec.getValue({
                name: 'tranid',
                join: 'custrecord_dps_shipping_rec_order_num'
            });
            fileId = rec.getValue('custrecord_dps_shipment_label_file');

            location_financia = rec.getValue({
                name: 'custrecord_dps_financia_warehous',
                join: 'custrecord_dps_shipping_rec_location'
            });
            service_code = rec.getValue("custrecord_dps_shipping_r_channelservice");
            channelservice = rec.getText('custrecord_dps_shipping_r_channelservice');
            channel_dealer = rec.getText('custrecord_dps_shipping_r_channel_dealer');
            channel_dealer_id = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            Label = rec.getValue('custrecord_fulfill_dh_label_addr'); // 面单地址
        });

        log.debug('Label: ', Label);
        if (location_financia == 3) {
            return;
        }
        // 属于FBA调拨
        if (Label && (tranType == 1 || tranType == 3) && channel_dealer_id == 1) { // 跨仓调拨至 FBA、FAB调拨
            // 存在面单文件
            var url;
            if ((tranType == 1 || tranType == 3) && fileId) {
                var fileObj = file.load({
                    id: fileId
                });
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : "", // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };

            var token = getToken();
            if (token && url) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + '/allocationMaster/callbackForBox',
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
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            custrecord_dps_shipping_rec_status: 20,
                            custrecord_dps_shipping_rec_wms_info: '请求失败'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 20,
                        custrecord_dps_shipping_rec_wms_info: '无面单文件'
                    }
                });
            }

        }
        if (Label && (tranType == 2 || tranType == 3)) {
            // 存在面单文件
            var url = 'https://';
            if (tranType == 1 && fileId) {
                var fileObj = file.load({
                    id: fileId
                });
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : "", // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };

            var token = getToken();
            if (token) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/allocationMaster/callbackForBox",
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
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            // custrecord_dps_shipping_rec_status: 19,
                            custrecord_dps_shipping_rec_wms_info: 'Token 失效了'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
            }

        } else if (channel_dealer_id == 6 || channel_dealer_id == "Amazon龙舟") {

            var url;
            if (fileId) {
                var fileObj = file.load({
                    id: fileId
                });

                url = 'https://'
                var account = runtime.accountId;
                log.debug("Account ID for the current user: ", runtime.accountId);
                if (account.indexOf('_SB1') > -1) {
                    var ac = account.replace('_SB1', '');
                    url += ac + '-sb1.app.netsuite.com';
                } else {
                    url += account + '.app.netsuite.com';
                }
                url += fileObj.url;
            }
            log.debug('url', url);

            var data = {
                aono: aono, // 调拨单号
                boxLabelPath: url ? url : '', // 箱外标签文件路径,
                logisticsChannelCode: service_code, // (string): 物流渠道服务编号,
                logisticsChannelName: channelservice, //(string): 物流渠道服务名称,
                logisticsLabelPath: Label, //(string): 物流面单文件路径,
                logisticsProviderCode: channel_dealer_id, //(string): 物流渠道商编号,
                logisticsProviderName: channel_dealer, //(string): 物流渠道商名称
                waybillNo: waybillNo
            };


            log.debug('data', data);
            var token = getToken();
            if (token && url) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var response = http.post({
                    url: config.WMS_Debugging_URL + "/allocationMaster/callbackForBox",
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
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 20,
                                custrecord_dps_shipping_rec_wms_info: '推送标签文件： ' + JSON.stringify(retdata.msg)
                            }
                        });
                    }
                    code = retdata.code;
                } else {
                    code = -1;

                    var id = record.submitFields({
                        type: 'customrecord_dps_shipping_record',
                        id: af_rec.id,
                        values: {
                            // custrecord_dps_shipping_rec_status: 19,
                            custrecord_dps_shipping_rec_wms_info: 'Token 失效了'
                        }
                    });
                }

                log.debug('code', code);
            } else {
                log.debug('Token 不存在', 'Token 不存在');
            }

        } else {
            log.debug('物流面单不存在', '物流面单不存在');
        }
    }

    return {
        post: _post
    }
});