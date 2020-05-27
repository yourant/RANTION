/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/search', 'N/log', 'N/record'], function(search, log, record) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        //huey = test();
        var custrecord_dps_rbsm_department_name = [1, 2, 3, 4, 5]
        if (Array.isArray(custrecord_dps_rbsm_department_name)) {
            custrecord_dps_rbsm_department_name = custrecord_dps_rbsm_department_name.join();
        }
        console.log(custrecord_dps_rbsm_department_name)
        huey = record.load({
            type: scriptContext.currentRecord.type,
            id: scriptContext.currentRecord.id
        });
        console.log('end');
    }

    function test() {

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
                beginCreateTime: beginDate.format("yyyy-MM-dd"),
                endCreateTime: endDate.format("yyyy-MM-dd"),
            }

            url = url + '?processCode=' + data.processCode +
                '&statue=' + data.statue +
                '&result=' + data.result // +
                //'&beginCreateTime=' + data.beginCreateTime +
                //'&endCreateTime=' + data.endCreateTime;
                ////console.log(data);
            message = sendRequest(url, token, data);
            message = JSON.parse(JSON.parse(message.data))
            if (message.code == 0) {
                ////console.log('-------------')
                var detail = JSON.parse(message.data[0].detail);
                getProcessinstance(detail);
                /*
                message.data.forEach(function(item, i) {
                    var detail = JSON.parse(item.detail);
                    if (!getProcessinstance(detail)) {
                        log.error('add-record-fail:', item.detail);
                        ////console.log(i + ' failed');
                    } else {
                        //console.log('success:' + detail.businessId)
                    }
                });
                */
            }

        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
        return message;

        function getProcessinstance(process_instance) {

            var go = true;
            //#region  数据校验--------------------------------------
            //获取费用报销编码
            var business_id = process_instance.businessId;
            if (business_id == '' || typeof(business_id) == 'undefined') {
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
            }).run().each(function(res) {
                go = false;
            });

            if (!go) {
                log.error('had_error:', business_id)
                return true;
            }

            //console.log(business_id);

            //核算主体
            log.debug('核算主体')
            var accounting_entity;
            process_instance.formComponentValues.forEach(function(e) {
                if (e.name == '费用归属于哪个公司') {
                    accounting_entity = e.value;
                }
            })
            if (accounting_entity == '' || typeof(accounting_entity) == 'undefined') {
                log.error('value_error_accounting_entity', accounting_entity);
                return false;
            }

            //申请日期
            log.debug('申请日期')
            var create_time = new Date(process_instance.createTime);
            if (isNaN(create_time.getTime())) {
                log.error('value_error_create_time', create_time);
                return false;
            }

            //报销人
            log.debug('报销人')
            var applicant_name = process_instance.title;
            applicant_name = applicant_name.substring(0, applicant_name.indexOf('提交的费用报销'));
            if (applicant_name == '' || typeof(applicant_name) == 'undefined') {
                log.error('value_error_applicant_name', applicant_name);
                return false;
            }

            //报销总金额
            log.debug('报销总金额')
            var total_amount;
            var detail;
            process_instance.formComponentValues.forEach(function(e) {
                if (e.name == '报销明细') {
                    var ext_value = JSON.parse(e.extValue);
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
            log.debug('付款日期')
            var paydate;
            process_instance.formComponentValues.forEach(function(e) {
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
            log.debug('其他备注')
            var remark;
            process_instance.formComponentValues.forEach(function(e) {
                if (e.name == '备注') {
                    remark = e.value == "null" ? '' : e.value;
                }
            })

            //付款银行类型
            log.debug('付款银行类型')
            var pay_bank_type;
            process_instance.formComponentValues.forEach(function(e) {
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
            log.debug('遍历报销明细')
            if (typeof(detail) == 'undefined' || detail.length == 0) {
                log.error('detail_error', '缺乏报销明细');
                return false;
            }

            //报销人
            log.debug('-报销人', applicant_name);
            var applicant_name_id = '';
            search.create({
                type: 'employee',
                filters: [{
                    name: 'firstname',
                    operator: 'is',
                    values: applicant_name
                }],
            }).run().each(function(res) {
                applicant_name_id = res.id;
            });
            if (applicant_name_id == '') {
                go = false;
                log.error('报销人对应id不存在', applicant_name);
                return false;
            }
            //#endregion

            //#region  创建新记录------------------------------------
            var new_cus_record = record.create({
                type: 'customrecord_dps_rbsm_record'
            });
            var new_ns_record = record.create({
                type: 'journalentry'
            });
            var sub_id = 'recmachcustrecord_dps_rbsm_id';
            var ns_sub_id = 'line';

            //console.log('step:1:' + go)
            detail.forEach(function(e, i) {
                    if (go) {
                        var item = e.rowValue;
                        var custrecord_dps_rbsm_detailtype1 = ''; //无

                        var custrecord_dps_rbsm_detailtype2 = '';
                        var custrecord_dps_rbsm_detailtype2_relation = '';

                        var custrecord_dps_rbsm_detailcurrency = 'CNY';
                        var custrecord_dps_rbsm_amount;
                        var custrecord_dps_rbsm_department;
                        var custrecord_dps_rbsm_remark = ''; //无
                        var custrecord_dps_rbsm_purpose;
                        var custrecord_dps_o_currency = ''; //未知
                        var custrecord_dps_o_amount = ''; //未知
                        item.forEach(function(_e) {
                            if (typeof(_e.value) == 'undefined' || _e.value == '' || _e.value == 'null') {
                                log.error('detail_value_error', e)
                                go = false;
                                //console.log('error1')
                            }
                            if (go) {
                                switch (_e.label) {
                                    case "受益/管控部门":
                                        var custrecord_dps_rbsm_department_name = _e.value;
                                        search.create({
                                            type: 'department',
                                            filters: [{
                                                name: 'name',
                                                operator: 'is',
                                                values: custrecord_dps_rbsm_department_name
                                            }],
                                        }).run().each(function(res) {
                                            custrecord_dps_rbsm_department = res.id;
                                        });
                                        if (custrecord_dps_rbsm_department == '' || !custrecord_dps_rbsm_department) {
                                            go = false;
                                            //console.log('error2')
                                        }
                                        break;
                                    case "费用类别":
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
                                            ],
                                        }).run().each(function(res) {
                                            custrecord_dps_rbsm_detailtype2 = res.id;
                                            custrecord_dps_rbsm_detailtype2_relation = res.getValue('custrecord_dps_fee_debitaccount');
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
                                            //console.log('error3')
                                        }
                                        if (custrecord_dps_rbsm_detailtype2_relation == '' || !custrecord_dps_rbsm_detailtype2_relation) {
                                            go = false;
                                            //console.log('error4')
                                        }
                                        break;
                                    case "用途":
                                        custrecord_dps_rbsm_purpose = _e.value;
                                        break;
                                    case "外币币种":
                                        var custrecord_dps_o_currency_name = _e.value;
                                        search.create({
                                            type: 'currency',
                                            filters: [{
                                                name: 'symbol',
                                                operator: 'is',
                                                values: custrecord_dps_o_currency_name
                                            }],
                                        }).run().each(function(res) {
                                            custrecord_dps_o_currency = res.id;
                                        });
                                        break;
                                    case "人民币金额":
                                        custrecord_dps_rbsm_amount = Number(_e.value);
                                        if (isNaN(custrecord_dps_rbsm_amount)) {
                                            go = false;
                                            //console.log('error5')
                                        }
                                        break;
                                    case "外币金额":
                                        custrecord_dps_o_amount = Number(_e.value);
                                        if (isNaN(custrecord_dps_o_amount)) {
                                            go = false;
                                            //console.log('error6')
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }
                        })
                        if (go) {
                            if (custrecord_dps_rbsm_detailtype1 != '') {
                                log.debug('custrecord_dps_rbsm_detailtype1', custrecord_dps_rbsm_detailtype1)
                                new_cus_record.setSublistValue({
                                    sublistId: sub_id, //recmath
                                    fieldId: 'custrecord_dps_rbsm_detailtype1',
                                    value: custrecord_dps_rbsm_detailtype1,
                                    line: i
                                });
                            }
                            log.debug('custrecord_dps_rbsm_detailtype2', custrecord_dps_rbsm_detailtype2)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_detailtype2',
                                value: Number(custrecord_dps_rbsm_detailtype2),
                                line: i
                            });


                            //console.log('error-1-6');
                            //--设置日记账科目信息
                            log.debug('custrecord_dps_rbsm_detailtype2_relation', custrecord_dps_rbsm_detailtype2_relation)
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'account',
                                value: Number(custrecord_dps_rbsm_detailtype2_relation),
                                line: i
                            });

                            log.debug('custrecord_dps_rbsm_detailcurrency', custrecord_dps_rbsm_detailcurrency)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_detailcurrency',
                                value: 1,
                                line: i
                            });
                            log.debug('custrecord_dps_rbsm_amount', custrecord_dps_rbsm_amount)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_amount',
                                value: custrecord_dps_rbsm_amount,
                                line: i
                            });

                            //console.log('error-1-5');
                            //--设置日记账借记信息
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'debit',
                                value: custrecord_dps_rbsm_amount,
                                line: i
                            });
                            //console.log('error-1-4');

                            //--设置日记账名称
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'entity',
                                value: Number(applicant_name_id),
                                line: i
                            });
                            //console.log('error-1-3');


                            log.debug('custrecord_dps_rbsm_department', custrecord_dps_rbsm_department)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_department',
                                value: Number(custrecord_dps_rbsm_department),
                                line: i
                            });

                            //--设置日记账部门
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'department',
                                value: Number(custrecord_dps_rbsm_department),
                                line: i
                            });
                            //console.log('error-1-2');

                            log.debug('custrecord_dps_rbsm_remark', custrecord_dps_rbsm_remark)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_remark',
                                value: custrecord_dps_rbsm_remark,
                                line: i
                            });
                            log.debug('custrecord_dps_rbsm_purpose', custrecord_dps_rbsm_purpose)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_rbsm_purpose',
                                value: custrecord_dps_rbsm_purpose,
                                line: i
                            });


                            //--设置日记账备注信息
                            new_ns_record.setSublistValue({
                                sublistId: ns_sub_id,
                                fieldId: 'memo',
                                value: custrecord_dps_rbsm_purpose,
                                line: i
                            });
                            //console.log('error-1-1');
                            log.debug('custrecord_dps_o_currency', custrecord_dps_o_currency)
                            if (custrecord_dps_o_currency == '') {
                                custrecord_dps_o_currency = 1;
                            }
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_o_currency',
                                value: custrecord_dps_o_currency,
                                line: i
                            });

                            if (custrecord_dps_o_amount == '') {
                                custrecord_dps_o_amount = custrecord_dps_rbsm_amount;
                            }
                            log.debug('custrecord_dps_o_amount', custrecord_dps_o_amount)
                            new_cus_record.setSublistValue({
                                sublistId: sub_id,
                                fieldId: 'custrecord_dps_o_amount',
                                value: Number(custrecord_dps_o_amount),
                                line: i
                            });

                        }
                    }
                })
                //console.log('step:2:' + go);

            if (!go) {
                return false;
            }

            //设置主体信息
            var accounting_entity_id = '';
            log.debug('-设置主体信息', accounting_entity);
            search.create({
                type: 'subsidiary',
                filters: [{
                    name: 'name',
                    operator: 'contains',
                    values: accounting_entity
                }],
            }).run().each(function(res) {
                accounting_entity_id = res.id;
            });
            if (accounting_entity_id == '') {
                go = false;
                log.error('核算主体id不存在', accounting_entity);
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
            log.debug('-费用报销类型');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_rbsm_type',
                value: 1 //费用报销
            });
            //申请日期
            log.debug('-申请日期', create_time);
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
            log.debug('-费用报销编码', business_id);
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_dd_proc_code',
                value: business_id
            });
            //报销总金额
            log.debug('-报销总金额', Number(total_amount));
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_total_amount',
                value: Number(total_amount)
            });


            //--设置日记账贷记信息
            new_ns_record.setSublistValue({
                sublistId: ns_sub_id,
                fieldId: 'credit',
                value: Number(total_amount),
                line: detail.length
            });

            //报销币种 select
            log.debug('-报销币种');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_currency',
                value: 1
            });
            //ns-------------------
            new_ns_record.setValue({
                fieldId: 'currency',
                value: 1
            });

            //汇率 
            log.debug('-汇率');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_change_rate',
                value: 1
            });
            //费用报销编码
            log.debug('-费用报销编码', business_id);
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_dd_proc_code',
                value: business_id
            });
            //付款日期
            log.debug('-付款日期');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_paydate',
                value: paydate
            });
            //审批状态
            log.debug('-审批状态');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_ns_state',
                value: 1 //默认值
            });
            //其他备注
            log.debug('-其他备注', remark);
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_remark',
                value: remark
            });


            //ns------------------------
            new_ns_record.setValue({
                fieldId: 'memo',
                value: remark
            });

            //设置银行科目类型
            log.debug('-设置银行科目类型', pay_bank_type);

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
            }).run().each(function(res) {
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
            }

            //console.log('step:3')

            new_cus_record.setValue({
                fieldId: 'custre-cord_dps_paybanktype',
                value: Number(ns_pay_bank_type_id)
            })

            //--设置日记账科目信息
            new_ns_record.setSublistValue({
                sublistId: ns_sub_id,
                fieldId: 'account',
                value: Number(pay_bank_type_id),
                line: detail.length
            });
            //console.log('step:4')
            //#endregion

            //#region 保存记录
            huey_ns = new_ns_record;
            huey_cus = new_cus_record;

            var ns_record_id = new_ns_record.save();

            //关联日记账
            log.debug('-关联日记账');
            new_cus_record.setValue({
                fieldId: 'custrecord_dps_dailyrecord_id',
                value: ns_record_id
            });
            new_cus_record.save();
            return true;
            //#endregion

            //console.log('成功');

        }


    }






    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {


        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        return true;
    }


    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged,
    }
});


Date.prototype.format = function(fmt) {
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