/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/log', 'N/record', 'N/http'], function (search, log, record, http) {

    function getInputData() {
        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            //dingtalk
            var url = 'http://47.107.254.110:18082/rantion-user/dingtalkRecord';

            var endDate = new Date((new Date).toDateString());
            var beginDate = new Date(endDate.getTime() - 57600000);
            url = url + '?' +
                'processCodeList=PROC-EF6YCS6WO2-5NM7Y2MXPFWDA00LGYVX1-M4IP76KI-CD1,PROC-AKGK7QZV-IVMTO4NVOXRZB4PMOV5X1-TMIAF0FJ-6,PROC-JFYJVERV-E272C7P4XCJNF0L298HP2-Y558Y5RJ-R' +
                //'processCodeList=PROC-7EB449A0-A953-4DF1-9203-D5429FEE2AFF,PROC-1092FF21-2C38-4CC3-97F4-3A5F91D0DE8E,PROC-ACB6A139-97C2-4A85-ACDB-14DF102BBED8' +//测试用
                '&statue=COMPLETED&result=agree&eventType=bpms_instance_change' +
                '&beginCreateTime=2020-5-28'
                //+ beginDate.format("yyyy-MM-dd")
                +
                '&endCreateTime=' + endDate.format("yyyy-MM-dd");
            message = sendRequest(url, token);
            message = JSON.parse(JSON.parse(message.data))
            if (message.code == 0) {
                log.error('length:', message.data.length);
                //return message.data;
                /*
                var detail = JSON.parse(message.data[0].detail);
                getProcessinstance(detail);
                return;
                */
                message.data.forEach(function (item, i) {
                    var detail = JSON.parse(item.detail);
                    if (!getProcessinstance(detail)) {
                        //log.error('add-record-fail:', detail.businessId);
                        log.error('add-record-fail-msg-id:', item.processInstanceId);
                    } else {
                        log.error('add-record-success-msg-id:', item.processInstanceId);
                    }
                });
            }

        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
    }

    function map(context) {

        return;
    }

    function reduce(context) { }

    function summarize(summary) {

    }

    function getProcessinstance(process_instance) {

        var go = true;

        //申请日期
        var create_time = new Date(process_instance.createTime);
        if (isNaN(create_time.getTime())) {
            log.error('申请日期');
            log.error('value_error_create_time', create_time);
            return false;
        }

        if (create_time < new Date('2020-5-28')) {
            log.error('模板修改前记录')
            return false;
        }

        //#region  数据校验--------------------------------------
        //获取费用报销编码
        var business_id = process_instance.businessId;
        if (business_id == '' || typeof (business_id) == 'undefined') {
            log.error('value_error_business_id', business_id);
            return false;
        }

        //判断改报销编码是否已存在
        search.create({
            type: 'customrecord_dps_rbsm_record',
            filters: [{
                name: 'custrecord_dps_dd_proc_code',
                operator: 'is',
                values: business_id
            }],
        }).run().each(function (res) {
            go = false;
        });

        if (!go) {
            log.error('had_succee:', business_id)
            return true;
        }
        //交易主体
        var accounting_entity;
        process_instance.formComponentValues.forEach(function (e) {
            if (e.name == '交易主体') {
                accounting_entity = e.value;
            }
        })
        if (accounting_entity == '' || typeof (accounting_entity) == 'undefined') {
            log.error('交易主体为空')
            return false;
        }

        //报销人
        var applicant_name = process_instance.title;
        applicant_name = applicant_name.substring(0, applicant_name.indexOf('提交的'));
        if (applicant_name == '' || typeof (applicant_name) == 'undefined') {
            log.error('报销人');
            log.error('value_error_applicant_name', applicant_name);
            return false;
        }

        //报销总金额
        var total_amount;
        var CNY_total_amount; //其他费用报销/备用金
        var detail;

        if (process_instance.title.indexOf('费用报销') > 0) {

            var _o_total;
            var cny_total;
            process_instance.formComponentValues.forEach(function (e) {
                if (e.name == '报销明细') {
                    var ext_value = JSON.parse(e.extValue);
                    detail = JSON.parse(e.value);
                    ext_value.statValue.forEach(function (e) {
                        if (e.label == "原币金额") {
                            _o_total = e.num
                        }
                        if (e.label == "人民币金额") {
                            cny_total = e.num
                        }
                    });
                }
            });
            if (isNaN(_o_total)) {
                _o_total = cny_total;
            }
            total_amount = _o_total;
            total_amount = -1;
        } else if (process_instance.title.indexOf('其他') > 0 || process_instance.title.indexOf('备用金') > 0) {
            process_instance.formComponentValues.forEach(function (e) {
                if (e.name == '原币金额') {
                    total_amount = e.value;
                } else if (e.name == '人民币金额') {
                    CNY_total_amount = e.value;
                }
            });
            if (isNaN(total_amount)) {
                total_amount = CNY_total_amount;
            }
        }
        if (total_amount == '' || typeof (total_amount) == 'undefined') {
            log.error('人民币金额');
            log.error('value_error_total_amount', total_amount);
            go = false;
            return false;
        }
        //付款日期

        var _paydate = '';
        process_instance.formComponentValues.forEach(function (e) {
            if (e.name == '付款日期') {
                _paydate = e.value.replace('-', '/').replace('-', '/');
            }
        })

        var paydate = new Date(_paydate);

        if (isNaN(paydate.getTime())) {
            log.error('付款日期')
            log.error('value_error_paydate', _paydate);
            return false;
        }

        //其他备注
        var remark;
        process_instance.formComponentValues.forEach(function (e) {
            if (e.name == '备注') {
                remark = e.value == "null" ? '' : e.value;
            }
        })

        //付款银行类型
        var pay_bank_type;
        process_instance.formComponentValues.forEach(function (e) {
            if (typeof (e.name) != 'undefined' && e.name.indexOf('付款账号') != -1) {
                if (e.value != "null")
                    pay_bank_type = e.value;
            }
        });
        if (pay_bank_type == '' || typeof (pay_bank_type) == 'undefined') {
            log.error('付款银行类型')
            log.error('value_error_pay_bank_type', pay_bank_type);
            return false;
        }

        //遍历报销明细
        if (process_instance.title.indexOf('费用报销') > 0) {
            if (typeof (detail) == 'undefined' || detail.length == 0) {
                log.error('detail_error', '缺乏报销明细');
                return false;
            }
        }

        //报销人
        var applicant_name_id = '';
        search.create({
            type: 'employee',
            filters: [{
                name: 'firstname',
                operator: 'is',
                values: applicant_name
            }],
        }).run().each(function (res) {
            applicant_name_id = res.id;
        });
        if (applicant_name_id == '') {
            go = false;
            log.error('-报销人', applicant_name);
            log.error('报销人对应id不存在', applicant_name);
            return false;
        }
        //#endregion

        //#region  创建新记录------------------------------------
        var custrecord_dps_rbsm_type;
        var new_cus_record = record.create({
            type: 'customrecord_dps_rbsm_record'
        });
        var new_ns_record = record.create({
            type: 'journalentry'
        });
        var sub_id = 'recmachcustrecord_dps_rbsm_id';
        var ns_sub_id = 'line';


        var custrecord_dps_o_currency = '';
        if (process_instance.title.indexOf('费用报销') > 0) {
            custrecord_dps_rbsm_type = 1;
            total_amount = 0;
            detail.forEach(function (e, i) {
                if (go) {
                    var item = e.rowValue;
                    var custrecord_dps_rbsm_detailtype1 = '';
                    var custrecord_dps_rbsm_detailtype2 = '';
                    var custrecord_dps_rbsm_detailtype2_relation = '';
                    var custrecord_dps_rbsm_amount = '';

                    var custrecord_dps_rbsm_department = '';
                    var custrecord_dps_rbsm_department_name = '';

                    var custrecord_dps_rbsm_purpose = '';
                    var custrecord_dps_o_amount = '';

                    item.forEach(function (_e) {
                        if (typeof (_e.value) == 'undefined' || _e.value == '' || _e.value == 'null') {
                            log.error('detail_value_error', _e)
                            go = false;
                        }
                        if (go) {
                            switch (_e.label.replace(/\d/g, '')) {
                                case "受益/管控部门":
                                    custrecord_dps_rbsm_department_name = _e.value;
                                    if (Array.isArray(custrecord_dps_rbsm_department_name) && custrecord_dps_rbsm_department_name.length > 0) {
                                        custrecord_dps_rbsm_department_name = custrecord_dps_rbsm_department_name[0];
                                        search.create({
                                            type: 'department',
                                            filters: [{
                                                name: 'name',
                                                operator: 'is',
                                                values: custrecord_dps_rbsm_department_name
                                            }],
                                        }).run().each(function (res) {
                                            custrecord_dps_rbsm_department = res.id;
                                        });
                                    } else {
                                        search.create({
                                            type: 'department',
                                            filters: [{
                                                name: 'name',
                                                operator: 'is',
                                                values: custrecord_dps_rbsm_department_name
                                            }],
                                        }).run().each(function (res) {
                                            custrecord_dps_rbsm_department = res.id;
                                        });
                                    }
                                    if (custrecord_dps_rbsm_department_name == '' || !custrecord_dps_rbsm_department_name) {
                                        go = false;
                                        log.error('error', 'department_name' + custrecord_dps_rbsm_department_name);
                                    }
                                    break;
                                case "费用明细":
                                    var custrecord_dps_rbsm_detailtype2_name = _e.value;
                                    search.create({
                                        type: 'customrecord_dps_fee_type',
                                        filters: [{
                                            name: 'custrecord_dps_fee_type_name',
                                            operator: 'is',
                                            values: custrecord_dps_rbsm_detailtype2_name
                                        }],
                                        columns: [
                                            { name: 'custrecord_dps_fee_debitaccount' },
                                            { name: 'custrecord_expense_report_class' },
                                        ],
                                    }).run().each(function (res) {
                                        custrecord_dps_rbsm_detailtype2 = res.id;
                                        custrecord_dps_rbsm_detailtype2_relation = res.getValue('custrecord_dps_fee_debitaccount');
                                        custrecord_dps_rbsm_detailtype1 = res.getValue('custrecord_expense_report_class');
                                    });
                                    if (custrecord_dps_rbsm_detailtype2 == '') {
                                        var new_rbsm_detailtype2 = record.create({
                                            type: 'customrecord_dps_fee_type'
                                        });
                                        new_rbsm_detailtype2.setValue({
                                            fieldId: 'custrecord_dps_fee_type_name',
                                            value: custrecord_dps_rbsm_detailtype2_name
                                        })
                                        custrecord_dps_rbsm_detailtype2 = new_rbsm_detailtype2.save();
                                        go = false;
                                    }
                                    if (custrecord_dps_rbsm_detailtype2_relation == '' || !custrecord_dps_rbsm_detailtype2_relation) {
                                        go = false;
                                        log.error('error', 'custrecord_dps_rbsm_detailtype2_relation')
                                    }
                                    if (custrecord_dps_rbsm_detailtype1 == '' || !custrecord_dps_rbsm_detailtype1) {
                                        go = false;
                                        log.error('error', 'custrecord_dps_rbsm_detailtype1')
                                    }
                                    break;
                                case "用途":
                                    custrecord_dps_rbsm_purpose = _e.value;
                                    break;
                                case "币种":
                                    var custrecord_dps_o_currency_name = _e.value;
                                    search.create({
                                        type: 'currency',
                                        filters: [{
                                            name: 'symbol',
                                            operator: 'is',
                                            values: custrecord_dps_o_currency_name
                                        }],
                                    }).run().each(function (res) {
                                        custrecord_dps_o_currency = Number(res.id);
                                    });
                                    if (isNaN(custrecord_dps_o_currency)) {
                                        go = false;
                                        log.error('error-custrecord_dps_o_currency', custrecord_dps_o_currency_name)
                                    }

                                    break;
                                case "人民币金额":
                                    custrecord_dps_rbsm_amount = Number(_e.value);
                                    if (isNaN(custrecord_dps_rbsm_amount)) {
                                        go = false;
                                        log.error('error', 'custrecord_dps_rbsm_amount')
                                    }
                                    break;
                                case "原币金额":
                                    custrecord_dps_o_amount = Number(_e.value);
                                    break;
                                default:
                                    break;
                            }
                        }
                    })
                    if (go) {
                        if (custrecord_dps_rbsm_detailtype1 != '') {
                            new_cus_record.setSublistValue({
                                sublistId: sub_id, //recmath
                                fieldId: 'custrecord_dps_rbsm_detailtype1',
                                value: custrecord_dps_rbsm_detailtype1,
                                line: i
                            });
                        }
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_detailtype2',
                            value: Number(custrecord_dps_rbsm_detailtype2),
                            line: i
                        });

                        //--设置日记账科目信息
                        //log.error('custrecord_dps_rbsm_detailtype2_relation', custrecord_dps_rbsm_detailtype2_relation)
                        new_ns_record.setSublistValue({
                            sublistId: ns_sub_id,
                            fieldId: 'account',
                            value: Number(custrecord_dps_rbsm_detailtype2_relation),
                            line: i
                        });

                        /*
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_detailcurrency',
                            value: Number(custrecord_dps_o_currency),
                            line: i
                        });
                        */
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_amount',
                            value: custrecord_dps_rbsm_amount,
                            line: i
                        });



                        //--设置日记账名称--mark--财务说不需要
                        /*
                        new_ns_record.setSublistValue({
                            sublistId: ns_sub_id,
                            fieldId: 'entity',
                            value: Number(applicant_name_id),
                            line: i
                        });
                        */

                        //--设置日记账部门
                        //当多个部门的时候，日记账部门为空--mark
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_department',
                            value: custrecord_dps_rbsm_department_name,
                            line: i
                        });
                        if (custrecord_dps_rbsm_department != '') {
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'department',
                                value: Number(custrecord_dps_rbsm_department),
                                line: i
                            });
                        }

                        /*
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_remark',
                            value: custrecord_dps_rbsm_remark,
                            line: i
                        });
                        */

                        //--设置日记账备注信息
                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_rbsm_purpose',
                            value: custrecord_dps_rbsm_purpose,
                            line: i
                        });
                        new_ns_record.setSublistValue({
                            sublistId: ns_sub_id,
                            fieldId: 'memo',
                            value: custrecord_dps_rbsm_purpose,
                            line: i
                        });

                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_o_currency',
                            value: custrecord_dps_o_currency,
                            line: i
                        });
                        if (custrecord_dps_o_amount == '' || isNaN(custrecord_dps_o_amount)) {
                            custrecord_dps_o_amount = custrecord_dps_rbsm_amount;
                        }

                        new_cus_record.setSublistValue({
                            sublistId: sub_id,
                            fieldId: 'custrecord_dps_o_amount',
                            value: Number(custrecord_dps_o_amount),
                            line: i
                        });

                        new_ns_record.setSublistValue({
                            sublistId: ns_sub_id,
                            fieldId: 'debit',
                            value: Number(custrecord_dps_o_amount),
                            line: i
                        });
                        total_amount += custrecord_dps_o_amount;
                    }
                }
            })
        } else if (process_instance.title.indexOf('其他') > 0 || process_instance.title.indexOf('备用金') > 0) {
            custrecord_dps_rbsm_type = 2;
            var is_byj = process_instance.title.indexOf('备用金') > 0;
            if (is_byj) {
                custrecord_dps_rbsm_type = 3;
            }

            var custrecord_dps_rbsm_detailtype1 = '';
            var custrecord_dps_rbsm_detailtype2 = '';
            var custrecord_dps_rbsm_detailtype2_relation = '';
            var custrecord_dps_rbsm_amount = '';

            var custrecord_dps_rbsm_department = '';
            var custrecord_dps_rbsm_department_name = '';

            var custrecord_dps_rbsm_purpose = '';
            var custrecord_dps_o_amount = '';
            process_instance.formComponentValues.forEach(function (e) {
                if (typeof (e.name) != 'undefined' && e.value != 'null') {
                    var name = e.name.replace(/\d/g, '');
                    if (go) {
                        switch (name) {
                            case "受益/管控部门":
                                custrecord_dps_rbsm_department_name = e.value;
                                if (Array.isArray(custrecord_dps_rbsm_department_name)) {
                                    custrecord_dps_rbsm_department_name = custrecord_dps_rbsm_department_name.join();
                                } else {
                                    search.create({
                                        type: 'department',
                                        filters: [{
                                            name: 'name',
                                            operator: 'is',
                                            values: custrecord_dps_rbsm_department_name
                                        }],
                                    }).run().each(function (res) {
                                        custrecord_dps_rbsm_department = res.id;
                                    });
                                }
                                if (custrecord_dps_rbsm_department_name == '' || !custrecord_dps_rbsm_department_name) {
                                    go = false;
                                    log.error('error', 'department_name' + custrecord_dps_rbsm_department_name);
                                }
                                break;
                            case '费用明细':
                                var custrecord_dps_rbsm_detailtype2_name = e.value;
                                search.create({
                                    type: 'customrecord_dps_fee_type',
                                    filters: [{
                                        name: 'custrecord_dps_fee_type_name',
                                        operator: 'is',
                                        values: custrecord_dps_rbsm_detailtype2_name
                                    }],
                                    columns: [
                                        { name: 'custrecord_dps_fee_debitaccount' },
                                        { name: 'custrecord_expense_report_class' },
                                    ],
                                }).run().each(function (res) {
                                    custrecord_dps_rbsm_detailtype2 = res.id;
                                    custrecord_dps_rbsm_detailtype2_relation = res.getValue('custrecord_dps_fee_debitaccount');
                                    custrecord_dps_rbsm_detailtype1 = res.getValue('custrecord_expense_report_class');
                                });
                                if (custrecord_dps_rbsm_detailtype2 == '') {
                                    var new_rbsm_detailtype2 = record.create({
                                        type: 'customrecord_dps_fee_type'
                                    });
                                    new_rbsm_detailtype2.setValue({
                                        fieldId: 'custrecord_dps_fee_type_name',
                                        value: custrecord_dps_rbsm_detailtype2_name
                                    })
                                    custrecord_dps_rbsm_detailtype2 = new_rbsm_detailtype2.save();
                                    go = false;
                                }
                                if (custrecord_dps_rbsm_detailtype2_relation == '' || !custrecord_dps_rbsm_detailtype2_relation) {
                                    go = false;
                                    log.error('error', 'detailtype2_relation' + custrecord_dps_rbsm_detailtype2_name)
                                }
                                if (custrecord_dps_rbsm_detailtype1 == '' || !custrecord_dps_rbsm_detailtype1) {
                                    go = false;
                                    log.error('error', '_detailtype1' + custrecord_dps_rbsm_detailtype2_name)
                                }

                                break;
                            case '用途':
                                custrecord_dps_rbsm_purpose = e.value;
                                break;
                            case "币种":
                                var custrecord_dps_o_currency_name = e.value;
                                search.create({
                                    type: 'currency',
                                    filters: [{
                                        name: 'symbol',
                                        operator: 'is',
                                        values: custrecord_dps_o_currency_name
                                    }],
                                }).run().each(function (res) {
                                    custrecord_dps_o_currency = res.id;
                                });
                                break;
                            case "人民币金额":
                                custrecord_dps_rbsm_amount = Number(e.value);
                                if (isNaN(custrecord_dps_rbsm_amount)) {
                                    go = false;
                                    log.error('error', 'custrecord_dps_rbsm_amount')
                                }
                                break;
                            case "原币金额":
                                custrecord_dps_o_amount = Number(e.value);
                                break;
                            default:
                                break;
                        }
                    }
                }
            })

            if (is_byj) {
                var custrecord_dps_rbsm_detailtype2_name = '备用金';
                custrecord_dps_o_currency = 1;
                search.create({
                    type: 'customrecord_dps_fee_type',
                    filters: [{
                        name: 'custrecord_dps_fee_type_name',
                        operator: 'is',
                        values: custrecord_dps_rbsm_detailtype2_name
                    }],
                    columns: [
                        { name: 'custrecord_dps_fee_debitaccount' },
                        { name: 'custrecord_expense_report_class' },
                    ],
                }).run().each(function (res) {
                    custrecord_dps_rbsm_detailtype2 = res.id;
                    custrecord_dps_rbsm_detailtype2_relation = res.getValue('custrecord_dps_fee_debitaccount');
                    custrecord_dps_rbsm_detailtype1 = res.getValue('custrecord_expense_report_class');
                });
                if (custrecord_dps_rbsm_detailtype2 == '') {
                    var new_rbsm_detailtype2 = record.create({
                        type: 'customrecord_dps_fee_type'
                    });
                    new_rbsm_detailtype2.setValue({
                        fieldId: 'custrecord_dps_fee_type_name',
                        value: custrecord_dps_rbsm_detailtype2_name
                    })
                    custrecord_dps_rbsm_detailtype2 = new_rbsm_detailtype2.save();
                    go = false;
                }
            }
            var i = 0;
            if (go) {
                if (custrecord_dps_rbsm_detailtype1 != '') {
                    new_cus_record.setSublistValue({
                        sublistId: sub_id, //recmath
                        fieldId: 'custrecord_dps_rbsm_detailtype1',
                        value: custrecord_dps_rbsm_detailtype1,
                        line: i
                    });
                }
                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_rbsm_detailtype2',
                    value: Number(custrecord_dps_rbsm_detailtype2),
                    line: i
                });

                //--设置日记账科目信息
                //log.error('custrecord_dps_rbsm_detailtype2_relation', custrecord_dps_rbsm_detailtype2_relation)
                new_ns_record.setSublistValue({
                    sublistId: ns_sub_id,
                    fieldId: 'account',
                    value: Number(custrecord_dps_rbsm_detailtype2_relation),
                    line: i
                });

                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_rbsm_amount',
                    value: custrecord_dps_rbsm_amount,
                    line: i
                });

                //--设置日记账名称

                /*
                new_ns_record.setSublistValue({
                    sublistId: ns_sub_id,
                    fieldId: 'entity',
                    value: Number(applicant_name_id),
                    line: i
                });
                */

                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_rbsm_department',
                    value: custrecord_dps_rbsm_department_name,
                    line: i
                });
                if (custrecord_dps_rbsm_department != '') {
                    new_ns_record.setSublistValue({
                        sublistId: ns_sub_id,
                        fieldId: 'department',
                        value: Number(custrecord_dps_rbsm_department),
                        line: i
                    });
                }

                //--设置日记账备注信息
                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_rbsm_purpose',
                    value: custrecord_dps_rbsm_purpose,
                    line: i
                });
                new_ns_record.setSublistValue({
                    sublistId: ns_sub_id,
                    fieldId: 'memo',
                    value: custrecord_dps_rbsm_purpose,
                    line: i
                });

                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_o_currency',
                    value: custrecord_dps_o_currency,
                    line: i
                });
                if (custrecord_dps_o_amount == 0 || custrecord_dps_o_amount == '' || isNaN(custrecord_dps_o_amount)) {
                    custrecord_dps_o_amount = custrecord_dps_rbsm_amount;
                }

                new_cus_record.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_o_amount',
                    value: Number(custrecord_dps_o_amount),
                    line: i
                });

                //--设置日记账借记信息
                new_ns_record.setSublistValue({
                    sublistId: ns_sub_id,
                    fieldId: 'debit',
                    value: custrecord_dps_o_amount,
                    line: i
                });

            }
        }

        if (!go) {
            return false;
        }

        //设置主体信息
        var accounting_entity_id = '';
        search.create({
            type: 'subsidiary',
            filters: [{
                name: 'name',
                operator: 'contains',
                values: accounting_entity
            }],
        }).run().each(function (res) {
            accounting_entity_id = res.id;
        });
        if (accounting_entity_id == '') {
            go = false;
            log.error('交易主体id不存在', accounting_entity);
            return false;
        }
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_accounting_entity',
            value: accounting_entity_id
        });
        //ns-----------------------
        //设置子公司
        new_ns_record.setValue({
            fieldId: 'subsidiary',
            value: accounting_entity_id
        });

        new_cus_record.setValue({
            fieldId: 'custrecord_dps_dd_applicant_name',
            value: applicant_name_id
        });

        //费用报销类型 select
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_rbsm_type',
            value: custrecord_dps_rbsm_type //费用报销
        });
        //申请日期
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_applydate',
            value: create_time
        });

        //ns-----------------------------
        //设置日记账分录的日期
        new_ns_record.setValue({
            fieldId: 'trandate',
            value: create_time
        });

        //费用报销编码
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_dd_proc_code',
            value: business_id
        });
        //报销总金额
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_total_amount',
            value: Number(total_amount)
        });

        if (typeof (detail) == 'undefined') {
            detail = { length: 1 }
        }

        //--设置日记账贷记信息
        new_ns_record.setSublistValue({
            sublistId: ns_sub_id,
            fieldId: 'credit',
            value: Number(total_amount),
            line: detail.length
        });

        //报销币种 select
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_currency',
            value: custrecord_dps_o_currency
        });

        //ns-------------------根据费用报销里的明细决定--审核会限定只通过当多个费用报销明细的时，币种唯一的--mark
        new_ns_record.setValue({
            fieldId: 'currency',
            value: custrecord_dps_o_currency
        });

        //费用报销编码
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_dd_proc_code',
            value: business_id
        });

        //付款日期
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_paydate',
            value: paydate
        });

        //审批状态
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_ns_state',
            value: 1 //默认值
        });


        //其他备注--mark--财务说不需要
        /*
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_remark',
            value: remark
        });
        //ns------------------------
        new_ns_record.setValue({
            fieldId: 'memo',
            value: remark
        });
        */

        //设置银行科目类型

        var pay_bank_type_id = '';
        var ns_pay_bank_type_id = '';
        search.create({
            type: 'customrecord_dps_bank_type',
            filters: [{
                name: 'custrecord_dps_bank_type',
                operator: 'is',
                values: pay_bank_type
            }],
            columns: ['custrecord_dps_bank_debitaccount']
        }).run().each(function (res) {
            pay_bank_type_id = res.id;
            ns_pay_bank_type_id = res.getValue('custrecord_dps_bank_debitaccount')
        });
        if (pay_bank_type_id == '') {
            var new_pay_bank_type = record.create({
                type: 'customrecord_dps_bank_type'
            });
            new_pay_bank_type.setValue({
                fieldId: 'custrecord_dps_bank_type',
                value: pay_bank_type
            })
            pay_bank_type_id = new_pay_bank_type.save();
        }

        if (ns_pay_bank_type_id == '') {
            log.error('银行科目类型-未手动维护', pay_bank_type);
            go = false;
            return false;
        }

        new_cus_record.setValue({
            fieldId: 'custrecord_dps_paybanktype',
            value: Number(pay_bank_type_id)
        })

        //--设置日记账科目信息
        new_ns_record.setSublistValue({
            sublistId: ns_sub_id,
            fieldId: 'account',
            value: Number(ns_pay_bank_type_id),
            line: detail.length
        });
        //#endregion

        //#region 保存记录
        try {
            var ns_record_id = new_ns_record.save();
        } catch (error) {
            log.error('new_ns_record', error);
            /*
                        var j_new_ns_record = new_ns_record.toJSON();
                        var j_new_cus_record = new_cus_record.toJSON();
                        log.error('data-NS', j_new_ns_record.sublists.line);
                        log.error('data', j_new_cus_record.sublists);
                        */
            //log.error('entity-id', applicant_name_id);
            return false;
        }

        //关联日记账
        new_cus_record.setValue({
            fieldId: 'custrecord_dps_dailyrecord_id',
            value: ns_record_id
        });
        new_cus_record.save();
        return true;
        //#endregion

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
        }).run().each(function (result) {
            token = result.getValue('custrecord_wtr_token');
        });
        return token;
    }


    function sendRequest(url, token) {
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.get({
            url: url,
            headers: headerInfo
        });

        //log.error('error',response.toJSON());
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
})

Date.prototype.format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}