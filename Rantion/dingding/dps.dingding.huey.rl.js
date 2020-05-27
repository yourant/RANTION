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

        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var url = 'http://47.107.254.110:18082/rantion-user/dingtalkRecord';

            var endDate = new Date((new Date).toDateString());
            var beginDate = new Date(endDate.getTime() - 57600000);
            var data = {
                processCode: 'PROC-EF6YCS6WO2-5NM7Y2MXPFWDA00LGYVX1-M4IP76KI-CD1',
                statue: 'COMPLETED',
                result: 'agree',
                beginCreateTime: beginDate.getTime().toString(),
                endCreateTime: endDate.getTime().toString(),
            }
            message = sendRequest(url, token, data);
            log.debug(message);

            return message;

            if (message.code == 0) {
                message.data.forEach(function(item) {
                    if (!getProcessinstance(item)) {
                        log.error('add-record-fail:', item);
                    }
                });
            }

        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
        return message;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    function getProcessinstance(process_instance) {

        var go = true;
        //#region  数据校验--------------------------------------
        //获取费用报销编码
        var business_id = process_instance.business_id;
        if (business_id == '' || typeof(business_id) == 'undefined') {
            log.error('value_error_business_id', business_id);
            return false;
        }

        //判断改报销编码是否已存在
        search.create({
            'type': 'customrecord_dps_rbsm_record',
            'filters': [{
                'name': "custrecord_dps_dd_proc_code",
                'operator': 'is',
                'value': business_id
            }]
        }).run(function(res) {
            go = false;
        })

        if (!go) {
            log.error('had_error:', business_id)
            return true;
        }

        //核算主体
        var accounting_entity;
        process_instance.form_component_values.forEach(function(e) {
            if (e.name == '费用归属于哪个公司') {
                accounting_entity = e.value;
            }
        })
        if (accounting_entity == '' || typeof(accounting_entity) == 'undefined') {
            log.error('value_error_accounting_entity', accounting_entity);
            return false;
        }

        //申请日期
        var create_time = new Date(process_instance.create_time);
        if (isNaN(create_time.getTime())) {
            log.error('value_error_create_time', create_time);
            return false;
        }

        //报销人
        var applicant_name = process_instance.title;
        applicant_name.substring(0, applicant_name.indexOf('提交的费用报销'));
        if (applicant_name == '' || typeof(applicant_name) == 'undefined') {
            log.error('value_error_applicant_name', applicant_name);
            return false;
        }
        new_cus_record.setValue({
            "type": 'custrecord_dps_dd_applicant_name',
            "value": applicant_name
        });

        //报销总金额
        var total_amount;
        var detail;
        process_instance.form_component_values.forEach(function(e) {
            if (e.name == '报销明细') {
                var ext_value = JSON.parse(e.ext_value);
                detail = JSON.parse(e.value);
                ext_value.statValue.forEach(function(e) {
                    if (e.label == "总人民币金额") {
                        total_amount = e.num
                    }
                })
            }
        })
        if (total_amount == '' || typeof(total_amount) == 'undefined') {
            log.error('value_error_total_amount', total_amount);
            return false;
        }
        //付款日期
        var paydate;
        process_instance.form_component_values.forEach(function(e) {
            if (e.name == '付款日期') {
                paydate = e.value;
            }
        })
        paydate = new Date(paydate);
        if (isNaN(paydate.getTime())) {
            log.error('value_error_paydate', paydate);
            return false;
        }

        //其他备注
        var remark;
        process_instance.form_component_values.forEach(function(e) {
            if (e.name == '备注') {
                remark = e.value == "null" ? '' : e.value;
            }
        })

        //付款银行类型
        var pay_bank_type;
        process_instance.form_component_values.forEach(function(e) {
            if (typeof(e.name) != 'undefined' && e.name.indexOf('付款账号') != -1) {
                if (e.value != "null")
                    pay_bank_type = e.value;
            }
        });
        if (pay_bank_type == '' || typeof(pay_bank_type) == 'undefined') {
            log.error('value_error_pay_bank_type', pay_bank_type);
            return false;
        }

        //遍历报销明细
        if (typeof(detail) == 'undefined' || detail.length == 0) {
            log.error('detail_error', '缺乏报销明细');
            return false;
        }
        //#endregion

        //#region  创建新记录------------------------------------
        var new_cus_record = record.create({
            type: 'customrecord_dps_rbsm_record'
        });

        detail.forEach(function(e, i) {
            if (go) {
                var item = e.rowValue;
                var custrecord_dps_rbsm_detailtype1 = ''; //无
                var custrecord_dps_rbsm_detailtype2;
                var custrecord_dps_rbsm_detailcurrency = 'CNY';
                var custrecord_dps_rbsm_amount;
                var custrecord_dps_rbsm_department;
                var custrecord_dps_rbsm_remark = ''; //无
                var custrecord_dps_rbsm_purpose;
                var custrecord_dps_o_currency; //未知
                var custrecord_dps_o_amount; //未知
                item.forEach(function(_e) {
                    if (typeof(_e.value) == 'undefined' || _e.value == '' || _e.value == 'null') {
                        log.error('detail_value_error', e)
                        go = false;
                    }
                    if (go) {
                        switch (_e.label) {
                            case "受益/管控部门":
                                custrecord_dps_rbsm_department = _e.value;
                                break;
                            case "费用类别":
                                custrecord_dps_rbsm_detailtype2 = _e.value;
                                break;
                            case "用途":
                                custrecord_dps_rbsm_purpose = _e.value;
                                break;
                            case "外币币种":
                                custrecord_dps_o_currency = _e.value;
                                break;
                            case "人民币金额":
                                custrecord_dps_rbsm_amount = Number(_e.value);
                                if (isNaN(custrecord_dps_rbsm_amount)) {
                                    go = false;
                                }
                                break;
                            case "外币金额":
                                custrecord_dps_o_amount = Number(_e.value);
                                if (isNaN(custrecord_dps_o_amount)) {
                                    go = false;
                                }
                                break;
                            default:
                                break;
                        }
                    }
                })
                if (go) {
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_detailtype1',
                        value: custrecord_dps_rbsm_detailtype1,
                        line: i
                    });
                    new_cus_record.setSublistText({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_detailtype2',
                        value: custrecord_dps_rbsm_detailtype2,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_detailcurrency',
                        value: custrecord_dps_rbsm_detailcurrency,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_amount',
                        value: custrecord_dps_rbsm_amount,
                        line: i
                    });
                    new_cus_record.setSublistText({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_department',
                        value: custrecord_dps_rbsm_department,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_remark',
                        value: custrecord_dps_rbsm_remark,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_rbsm_purpose',
                        value: custrecord_dps_rbsm_purpose,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_o_currency',
                        value: custrecord_dps_o_currency,
                        line: i
                    });
                    new_cus_record.setSublistValue({
                        sublistId: 'customrecord_dps_rbsm_detail',
                        fieldId: 'custrecord_dps_o_amount',
                        value: custrecord_dps_o_amount,
                        line: i
                    });
                }
            }
        })

        if (!go) {
            return false;
        }

        //设置主体信息
        new_cus_record.setText({
            "type": 'custrecord_dps_accounting_entity',
            "value": accounting_entity
        });
        //费用报销类型 select
        new_cus_record.setValue({
            "type": 'custrecord_dps_rbsm_type',
            "value": 1 //费用报销
        });
        //申请日期
        new_cus_record.setValue({
            "type": 'custrecord_dps_applydate',
            "value": create_time
        });
        //费用报销编码
        new_cus_record.setValue({
            "type": 'custrecord_dps_dd_proc_code',
            "value": business_id
        });
        //报销总金额
        new_cus_record.setValue({
            "type": 'custrecord_dps_total_amount',
            "value": Number(total_amount)
        });
        //报销币种 select
        new_cus_record.setText({
            "type": 'custrecord_dps_currency',
            "value": 'CNY'
        });
        //汇率 
        new_cus_record.setValue({
            "type": 'custrecord_dps_change_rate',
            "value": 1
        });
        //费用报销编码
        new_cus_record.setValue({
            "type": 'custrecord_dps_dd_proc_code',
            "value": business_id
        });
        //付款日期
        new_cus_record.setValue({
            "type": 'custrecord_dps_paydate',
            "value": process_instance
        });
        //审批状态
        new_cus_record.setValue({
            "type": 'custrecord_dps_ns_state',
            "value": 1 //默认值
        });
        //其他备注
        new_cus_record.setValue({
            "type": 'custrecord_dps_remark',
            "value": remark
        });
        //关联日记账
        new_cus_record.setValue({
            "type": 'custrecord_dps_dailyrecord_id',
            "value": process_instance
        });
        //设置银行科目类型
        new_cus_record.setValue({
            "type": 'custrecord_dps_paybanktype',
            "value": pay_bank_type
        });

        //#endregion

        //#region  创建NS费用报销记录-----------------------------




        //#endregion

    }


    //#region old
    function register_call_back() {
        var token = _getToken();
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


    function _getToken(isreget) {

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
    //#endregion

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
    function sendRequest(url, token, data) {
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: url,
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
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});