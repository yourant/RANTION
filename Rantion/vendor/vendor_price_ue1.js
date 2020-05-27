/*
 * @Author         : Li
 * @Date           : 2020-05-15 15:09:31
 * @LastEditTime   : 2020-05-16 14:43:02
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\vendor\vendor_price_ue1.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../Helper/Moment.min', 'N/search', 'N/format', 'N/record', 'N/runtime', 'N/redirect'], function (moment, search, format, record, runtime, redirect) {


    // 1	待提交审批
    // 2	审批中
    // 3	初审中
    // 4	复审中
    // 5	已拒绝
    // 6	已通过
    // 7	审核中

    function beforeLoad(context) {
        var type = context.type;
        var userObj = runtime.getCurrentUser();
        var userName = userObj.id;

        if (type == context.UserEventType.EDIT) {

            var newRecord = context.newRecord;
            // log.error('新的记录', JSON.stringify(newRecord));
            var checkStatus = newRecord.getValue('custrecord_vmph_check_status');
            var creator = newRecord.getValue('custrecord_vendor_price_creator');
            if (checkStatus == 6 || checkStatus == 2) { // 已通过 / 审批中  不能编辑
                redirect.toRecord({
                    type: context.newRecord.type,
                    id: context.newRecord.id,
                });
            }
            if (checkStatus == 1 && userName != creator) { // 待提交审批  且 当前用户不等于创建人，则不能编辑
                redirect.toRecord({
                    type: context.newRecord.type,
                    id: context.newRecord.id,
                });
            }
        }
    }

    function beforeSubmit(context) {
        // var newRecord = context.newRecord;
        // log.audit('newRecord', newRecord)
        // var status = newRecord.getValue('custrecord_vmph_check_status');
        // log.debug("status", status);
        // if (status == 6) {
        //     // log.debug("in");
        //     forvpmd(newRecord.getValue('id'));
        // }
    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        // log.audit('newRecord', newRecord)
        var status = newRecord.getValue('custrecord_vmph_check_status');
        log.debug("status", status);

        // 1 单阶梯数量价格
        // 2 累计阶梯数量价格
        var price_type = newRecord.getValue('custrecord_dps_vpmh_price_type');
        if (status == 6) {
            // log.debug("in");
            if (price_type == 1) {
                forvpmd(newRecord.getValue('id'));
            } else if (price_type == 2) {
                CumTotalVendor(newRecord.id, newRecord.type);
            }
        }

        try {
            if (price_type == 2) {
                CumTotalVendor(newRecord.id, newRecord.type);
            }

        } catch (error) {
            log.error('error', error);
        }
    }

    function forvpmd(id) {
        var vpmhRec = record.load({
            type: 'customrecord_vemdor_price_manage_h',
            id: id
        });

        var supplier = vpmhRec.getValue('custrecord_vpmh_supplier');
        var subsidiary = vpmhRec.getValue('custrecord_vpmh_subsidiary');
        var status = vpmhRec.getValue('custrecord_vmph_check_status');
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        log.debug("in.", {
            id: id,
            supplier: supplier,
            subsidiary: subsidiary,
            status: status
        });


        if (!status) {
            status = sta;
        }

        log.debug('status', status);

        var newSublistCount = vpmhRec.getLineCount({
            sublistId: 'recmachcustrecord_vpmd_link'
        });
        log.debug("newSublistCount", newSublistCount);
        for (var index = 0; index < newSublistCount; index++) {
            log.debug("index" + index, index);
            var newPartNo = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vpmd_part_no',
                line: index
            });
            var newQuantity = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_quantity',
                line: index
            });
            var newCurrency = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_currency',
                line: index
            });

            log.debug("newSublistCount_p", {
                newPartNo: newPartNo,
                // newUnitPrice:newUnitPrice,
                newQuantity: newQuantity,
                newCurrency: newCurrency
            });

            var newEffectiveDateStr = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_effective_date',
                line: index
            });
            var newExpirationDateStr = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_expiration_date',
                line: index
            });
            // log.debug("date_str","newEffectiveDateStr"+newEffectiveDateStr+"——"+"newEffectiveDateStr"+newEffectiveDateStr);
            var newEffDate = format.parse({
                value: newEffectiveDateStr,
                type: format.Type.DATE
            });
            var newEffectiveDate = new Date(moment(newEffDate).format('YYYY/MM/DD'));
            // log.debug("newEffectiveDate",newEffectiveDate);
            var newExpDate = format.parse({
                value: newExpirationDateStr,
                type: format.Type.DATE
            });
            var newExpirationDate = new Date(moment(newExpDate).format('YYYY/MM/DD'));
            // log.debug("newExpirationDate",newExpirationDate);

            log.debug("id", id);
            var mySearch = search.create({
                type: 'customrecord_vemdor_price_manage_d',
                filters: [
                    //{ name: "custrecord_vpmd_link", operator: 'anyof', values: id},
                    {
                        name: "custrecord_vpmh_subsidiary",
                        join: "custrecord_vpmd_link",
                        operator: "anyof",
                        values: JSON.stringify(subsidiary).replace('[\"', '').replace('\"]', '').split('\",\"')
                    },
                    {
                        name: "custrecord_vpmh_supplier",
                        join: "custrecord_vpmd_link",
                        operator: "anyof",
                        values: supplier
                    },
                    {
                        name: "custrecord_vmph_check_status",
                        join: "custrecord_vpmd_link",
                        operator: "anyof",
                        values: status
                    },
                    {
                        name: "custrecord_vpmd_part_no",
                        operator: 'anyof',
                        values: newPartNo
                    },
                    {
                        name: "custrecord_vmpd_quantity",
                        operator: 'equalto',
                        values: newQuantity
                    },
                    {
                        name: "custrecord_vmpd_currency",
                        operator: 'anyof',
                        values: newCurrency
                    },
                    {
                        name: "isinactive",
                        operator: 'is',
                        values: false
                    }
                ],
                columns: [
                    'internalid',
                    'custrecord_vmpd_quantity',
                    'custrecord_vmpd_effective_date',
                    'custrecord_vmpd_expiration_date'
                ]
            });
            var resultArr = new Array();
            mySearch.run().each(function (result) {
                var jsonObj = {};
                jsonObj['custrecord_vpmd_id'] = result.getValue('internalid');
                jsonObj['custrecord_vmpd_quantity'] = result.getValue('custrecord_vmpd_quantity');
                jsonObj['custrecord_vmpd_effective_date'] = result.getValue('custrecord_vmpd_effective_date');
                jsonObj['custrecord_vmpd_expiration_date'] = result.getValue('custrecord_vmpd_expiration_date');
                resultArr.push(jsonObj);
                return true;
            });
            log.debug("resultArr", resultArr);
            log.debug("resultArr.length", resultArr.length);
            for (j = 0; j < resultArr.length; j++) {
                log.debug("j" + j, j);
                var result = resultArr[j];
                var vpmd_id = result.custrecord_vpmd_id;
                var vpmdRec = record.load({
                    type: 'customrecord_vemdor_price_manage_d',
                    id: vpmd_id
                });

                var oldEffDate = format.parse({
                    value: result.custrecord_vmpd_effective_date,
                    type: format.Type.DATE
                });
                var oldEffectiveDate = new Date(moment(oldEffDate).format('YYYY/MM/DD'));

                var oldExpDate = format.parse({
                    value: result.custrecord_vmpd_expiration_date,
                    type: format.Type.DATE
                });
                var oldExpirationDate = new Date(moment(oldExpDate).format('YYYY/MM/DD'));


                //新生效日期 >  旧失效日期                新失效日期 < 旧生效日期
                if (newEffectiveDate > oldExpirationDate || newExpirationDate < oldEffectiveDate) {
                    log.debug(1);
                    // 合法的
                    continue;
                }
                //新生效日期 <= 旧生效日期
                if (newEffectiveDate <= oldEffectiveDate) {
                    log.debug(2);
                    //新失效日期 < 旧失效日期
                    if (newExpirationDate < oldExpirationDate) {
                        log.debug(3);
                        vpmdRec.setValue({
                            fieldId: 'custrecord_vmpd_effective_date',
                            value: format.parse({
                                value: getNextDate(newExpirationDate, 1, dateFormat),
                                type: format.Type.DATE
                            })
                        });
                        log.debug(31);
                        vpmdRec.save({
                            ignoreMandatoryFields: true
                        });
                        continue;
                    }
                    log.debug(21);
                }
                //新失效日期 >= 旧失效日期
                if (newExpirationDate >= oldExpirationDate) {
                    log.debug(4);
                    //新生效日期 > 旧生效日期
                    if (newEffectiveDate > oldEffectiveDate) {
                        log.debug(5);
                        vpmdRec.setValue({
                            fieldId: 'custrecord_vmpd_expiration_date',
                            value: format.parse({
                                value: getNextDate(newEffectiveDate, -1, dateFormat),
                                type: format.Type.DATE
                            })
                        });
                        log.debug(51);
                        vpmdRec.save({
                            ignoreMandatoryFields: true
                        });
                        continue;
                    }
                    log.debug(41);
                }

                /*
                  //新失效日期 >= 旧失效日期
                  if (newExpirationDate >= oldExpirationDate) {
                      log.debug(6);
                      //新生效日期 > 旧生效日期
                      if (newEffectiveDate > oldEffectiveDate) {
                          log.debug(7);
                          vpmdRec.setValue({
                              fieldId : 'custrecord_vmpd_expiration_date',
                              value : format.parse({
                                  value : getNextDate(newEffectiveDate, -1, dateFormat), type : format.Type.DATE
                              })
                          });
                          log.debug(71);
                          vpmdRec.save();
                          continue;
                      }
                      log.debug(61);
                  }
                  */
                // 新生效日期 >= 旧生效日期     新生效日期 <= 旧失效日期
                if ((newEffectiveDate >= oldEffectiveDate) && (newEffectiveDate <= oldExpirationDate)) {
                    log.debug("newEffDate", newEffDate);
                    log.debug(8);
                    vpmdRec.setValue({
                        fieldId: 'custrecord_vmpd_expiration_date',
                        value: format.parse({
                            value: getNextDate(newEffectiveDate, -1, dateFormat),
                            type: format.Type.DATE
                        })
                    });
                    log.debug(81);
                    vpmdRec.save({
                        ignoreMandatoryFields: true
                    });
                    continue;
                }

                vpmdRec.save({
                    ignoreMandatoryFields: true
                });
                continue;
            }
        }
        return true;
    }


    /**
     * 审批完成之后, 修改价格
     * 2 累计阶梯数量价格
     * @param {*} recId 
     */
    function CumTotalVendor(recId, recType) {

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');

        var objRecord = record.load({
            type: recType,
            id: recId
        });

        var item_info = [];

        var numLines = objRecord.getLineCount({
            sublistId: 'recmachcustrecord_vpmd_link'
        });

        log.debug('CumTotalVendor numLines', numLines);
        // 获取所有的行数据
        for (var i = 0; i < numLines; i++) {

            var custrecord_vpmd_part_no = objRecord.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vpmd_part_no',
                line: i
            });
            var custrecord_dps_vmph_cumulative_total = objRecord.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_dps_vmph_cumulative_total',
                line: i
            });
            var custrecord_vmpd_currency = objRecord.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_currency',
                line: i
            });
            var effective_date = objRecord.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_effective_date',
                line: i
            });
            var expiration_date = objRecord.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_expiration_date',
                line: i
            });

            item_info.push({
                itemId: custrecord_vpmd_part_no,
                total: custrecord_dps_vmph_cumulative_total,
                currency: custrecord_vmpd_currency,
                effective_date: effective_date,
                expiration_date: expiration_date
            })
        }

        // item_info = JSON.parse(item_info);
        log.debug('CumTotalVendor item_info lenght: ' + item_info.length, item_info);
        for (var a = 0; a < item_info.length; a++) {

            var a_item = item_info[a].itemId;
            var a_currency = item_info[a].currency;
            var a_total = item_info[a].total;

            var a_eff_date = item_info[a].effective_date;
            var a_exp_date = item_info[a].expiration_date;

            for (var b = a + 1; b < item_info.length; b++) {

                var b_item = item_info[b].itemId;
                var b_currency = item_info[b].currency;
                var b_total = item_info[b].total;

                var b_eff_date = item_info[b].effective_date;
                var b_exp_date = item_info[b].expiration_date;

                if (a_item == b_item && a_currency == b_currency && a_total == b_total) {

                    log.debug('数据对比', '若货品,交易货币以及累计数量相同, 则比较这两行货品的生效日期与结束日期是否有交叉,默认上行货品为最早的一行')
                    // 若货品,交易货币以及累计数量相同, 则比较这两行货品的生效日期与结束日期是否有交叉,默认上行货品为最早的一行

                    var a_f_exp_date = format.parse({
                        value: a_exp_date,
                        type: format.Type.DATE
                    });
                    var b_f_exp_date = format.parse({
                        value: b_eff_date,
                        type: format.Type.DATE
                    });

                    // 后一个的生效时间小于前一个的是失效时间, 则存在时间交叉
                    if (b_f_exp_date - a_f_exp_date < 0) {
                        log.debug('两行货品存在', '交叉时间');
                        // 这两行货品存在时间交叉

                        objRecord.setSublistValue({
                            sublistId: 'recmachcustrecord_vpmd_link',
                            fieldId: 'custrecord_vmpd_expiration_date',
                            value: format.parse({
                                value: getNextDate(b_eff_date, -1, dateFormat),
                                type: format.Type.DATE
                            }),
                            line: a
                        });

                        var show_date = objRecord.getSublistValue({
                            sublistId: 'recmachcustrecord_vpmd_link',
                            fieldId: 'custrecord_vmpd_expiration_date',
                            // value: new Date(fo_da),
                            line: a
                        });

                        log.debug('show_date', show_date);
                    }

                }
            }

        }


        var objRecord_id = objRecord.save();
        log.audit('objRecord_id', objRecord_id);

    }

    /**
     * 获取指定日期的前一天，后一天
     * 代表指定的日期，格式：2018-09-27
     * 传-1表始前一天，传1表始后一天
     */
    function getNextDate(date, day, dateFormat) {
        var d = date.getTime();
        d = +d + 1000 * 60 * 60 * 24 * day;
        d = new Date(d);
        var timeOne = moment(d.getTime()).format(dateFormat);
        return timeOne;
    };

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});