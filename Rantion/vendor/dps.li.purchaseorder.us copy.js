/*
 * @Author         : Li
 * @Date           : 2020-05-27 14:07:04
 * @LastEditTime   : 2020-06-22 13:56:57
 * @LastEditors    : Li
 * @Description    : 应用于采购订单, 用于设置请购单转采购订单, 设置相关字段的值
 * @FilePath       : \Rantion\vendor\dps.li.purchaseorder.us.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime', '../Helper/Moment.min'], function (record, search, runtime, moment) {

    function beforeLoad(scriptContext) {

    }

    function beforeSubmit(scriptContext) {
        log.debug('beforeSubmit', 'beforeSubmit');

        var newRecord = scriptContext.newRecord;
        var type = scriptContext.type;
        log.debug('type', type);
        var ui = runtime.executionContext;
        log.debug('ui', ui);

        var price_type = newRecord.getValue('custbody_vendor_price_type');

        log.audit('price_type', price_type);

        try {

            if (type == 'create' && ui == 'USEREVENT' && price_type) {


                var numLines = newRecord.getLineCount({
                    sublistId: 'item'
                });
                log.debug('numLines', numLines);
                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                log.debug('dateFormat', dateFormat);
                var today = moment(new Date().getTime()).format(dateFormat);
                var supplier = newRecord.getValue('entity');
                log.debug('supplier', supplier);
                var currency = newRecord.getValue('currency');
                log.debug('currency', currency);
                var trandate = newRecord.getValue('trandate');
                log.debug('trandate', trandate);
                var date = moment(trandate).format(dateFormat);
                log.debug('date', date);

                var subsidiary = newRecord.getValue('subsidiary');

                var arr2 = [];
                for (var i = 0; i < numLines; i++) {
                    var partNo = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    });
                    log.debug('partNo', partNo);
                    var quantity = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i
                    });
                    log.debug('quantity', quantity);

                    var custcol_sign = newRecord.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sign',
                        line: i
                    });
                    log.debug('custcol_sign', custcol_sign);

                    arr2.push({
                        item: partNo,
                        quantity: quantity,
                        sign: custcol_sign
                    });
                }
                log.debug('arr2', arr2);
                if (arr2.length > 1) {
                    for (var xx = 0; xx < arr2.length; xx++) {
                        if (arr2[xx].sign) {
                            continue;
                        } else {
                            for (var yy = xx + 1; yy < arr2.length; yy++) {
                                if (arr2[yy].sign) {
                                    continue;
                                } else {
                                    if (arr2[yy].item == arr2[xx].item) {
                                        arr2[xx].item = arr2[yy].item;
                                        arr2[xx].quantity = Number(arr2[yy].quantity) + Number(arr2[xx].quantity);
                                        arr2[yy].sign = true;
                                    }
                                }
                            }
                        }
                    }
                    log.debug('合并后', arr2)
                }

                for (var k = 0; k < arr2.length; k++) {
                    var curUnitPrice = 0;
                    var partNo = arr2[k].item;
                    var quantity = arr2[k].quantity;
                    var sign = arr2[k].sign;


                    if (price_type == 1) {
                        log.debug('price_type 1', price_type);
                        resultArr = getVpmd(supplier, currency, partNo, today, price_type, quantity);
                    } else if (price_type == 2) {

                        var get_arr = getEffectiveDateByItem(supplier, currency, partNo, today);
                        if (get_arr.length > 0) {
                            log.debug('get_arr', get_arr);
                            var effectiveDate;
                            effectiveDate = get_arr[0].getValue('custrecord_dps_vmph_cumulative_time');

                            if (!effectiveDate) {
                                var effectiveDate = get_arr[0].getValue('custrecord_vmpd_effective_date');
                            }

                            log.debug('effectiveDate', effectiveDate);
                            log.debug("get_arr", get_arr);
                            // effectiveDate = moment(effectiveDate).format(dateFormat);
                            sum = getPriceByTotal(supplier, subsidiary, currency, partNo, effectiveDate);
                        }

                        if (!sum) {
                            sum = 0;
                        }
                        log.debug('sum', sum);
                        if (sum >= 0) {
                            sum = Number(sum);

                            log.debug('Number(sum)', Number(sum));
                            // 采购过相同的货品
                            resultArr = getVpmd(supplier, currency, partNo, today, price_type, sum);
                        }

                    }

                    for (j = 0; j < resultArr.length; j++) {
                        log.debug(1)
                        var curquantity = resultArr[j].getValue('custrecord_vmpd_quantity');
                        if (quantity >= curquantity) {
                            log.debug(2)
                            if ((j + 1) == resultArr.length) {
                                log.debug(3)
                                curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                break;
                            } else {
                                log.debug(4)
                                if (quantity < resultArr[j + 1].getValue('custrecord_vmpd_quantity')) {
                                    log.debug(5)
                                    curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                    break;
                                }
                            }
                        }
                        log.debug(6)
                    }
                    log.debug('k=', k);
                    log.debug('sign' + (k + 1), sign);
                    log.debug('partNo' + (k + 1), partNo);
                    log.debug('quantity' + (k + 1), quantity);
                    log.debug('curUnitPrice' + (k + 1), curUnitPrice);
                    newRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: partNo,
                        line: k
                    });
                    newRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: curUnitPrice,
                        line: k
                    });
                    newRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: quantity,
                        line: k
                    });
                    newRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sign',
                        value: sign,
                        line: k
                    });
                }

                for (var i = 0; i < newRecord.getLineCount({
                        sublistId: 'item'
                    }); i++) {
                    log.debug('i', i)
                    var lineNumber = newRecord.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'custcol_sign',
                        value: true
                    });
                    log.debug('lineNumber', lineNumber);

                    newRecord.removeLine({
                        sublistId: 'item',
                        line: lineNumber,
                        ignoreRecalc: true
                    });
                    i++
                }
            }

            var sings = [];
            for (var m = 0; m < arr2.length; m++) {
                if (sings.indexOf('true') == -1) {

                    sings.push(arr2[m].sign);
                }
                if (arr2[m].sign) {

                    log.debug('m' + m, arr2[m].sign);
                    log.debug('m' + m, arr2);
                    try {
                        // var lineNum = newRecord.selectLine({
                        //     sublistId: 'item',
                        //     line: m
                        // });
                        newRecord.removeLine({
                            sublistId: 'item',
                            line: m,
                            ignoreRecalc: true
                        });
                        // newRecord.commitLine({
                        //     sublistId: 'item'
                        // });
                    } catch (error) {
                        log.debug('e', error);
                    }
                }
            }
        } catch (error) {
            log.error('设置价格出错了', error);
        }


    }

    function afterSubmit(scriptContext) {

    }


    /**
     * 查询阶梯价格
     * @param {*} supplier  供应商
     * @param {*} currency  币种
     * @param {*} partNo    货品
     * @param {*} today     当前日期
     * @param {*} sta       价格类型
     * @param {*} sum       已采购总数/或采购的数量
     */
    function getVpmd(supplier, currency, partNo, today, sta, sum) {


        log.debug('getVpmd sum', sum);
        log.audit('sum', sum);

        var limit = 3999;

        // log.debug('getVpmd', supplier, currency, partNo, today, sta, sum);
        var filters = [];
        var flag = false;
        filters.push({
            join: 'custrecord_vpmd_link',
            name: 'custrecord_vpmh_supplier',
            operator: 'anyof',
            values: supplier
        }, {
            name: "custrecord_vpmd_part_no",
            operator: 'anyof',
            values: partNo
        }, {
            name: "custrecord_vmpd_currency",
            operator: 'anyof',
            values: currency
        }, {
            name: 'custrecord_vmpd_effective_date',
            operator: 'onorbefore',
            values: today
        }, {
            name: 'custrecord_vmpd_expiration_date',
            operator: 'onorafter',
            values: today
        }, {
            name: 'custrecord_dps_vpmh_price_type',
            join: 'custrecord_vpmd_link',
            operator: 'anyof',
            values: sta
        });
        var columns = [];
        columns.push({
            name: 'custrecord_vmpd_unit_price'
        });

        if (sta == 1) {
            columns.push({
                name: 'custrecord_vmpd_quantity',
                sort: 'ASC'
            });
            flag = true;
        }
        if (sta == 2) {


            if (sum > 0) {
                log.debug('sum > 0');
                filters.push({
                    name: 'custrecord_dps_vmph_cumulative_total',
                    operator: "lessthanorequalto",
                    values: sum
                });
            } else {
                log.debug('sum = 0');
                filters.push({
                    name: 'custrecord_dps_vmph_cumulative_total',
                    operator: "equalto",
                    values: sum
                });
            }

            columns.push({
                name: 'custrecord_dps_vmph_cumulative_total',
                sort: 'ASC'
            });
            flag = true;
        }
        log.audit('filters', filters);
        var resultArr = [];
        var add = 0;

        search.create({
            type: 'customrecord_vemdor_price_manage_d',
            filters: filters,
            columns: columns
        }).run().each(function (result) {
            resultArr.push(result);

            log.audit('price', result.getValue('custrecord_vmpd_unit_price'));
            add++;

            return flag;
            return --limit > 0;
        });

        log.debug('getVpmd resultArr', resultArr);
        // log.debug('add', add);
        return resultArr || false;

    }


    /**
     * 获取当前货品 供应商价格管理的数据
     * @param {*} supplier  供应商
     * @param {*} currency  货币
     * @param {*} partNo    货品
     * @param {*} today     当前日期
     */
    function getEffectiveDateByItem(supplier, currency, partNo, today) {

        var filters = [];
        filters.push({
            join: 'custrecord_vpmd_link',
            name: 'custrecord_vpmh_supplier',
            operator: 'anyof',
            values: supplier
        }, {
            name: "custrecord_vpmd_part_no",
            operator: 'anyof',
            values: partNo
        }, {
            name: "custrecord_vmpd_currency",
            operator: 'anyof',
            values: currency
        }, {
            name: 'custrecord_vmpd_effective_date',
            operator: 'onorbefore',
            values: today
        }, {
            name: 'custrecord_vmpd_expiration_date',
            operator: 'onorafter',
            values: today
        }, {
            name: 'custrecord_dps_vpmh_price_type',
            join: 'custrecord_vpmd_link',
            operator: 'anyof',
            values: 2
        });

        var columns = [{
                name: 'custrecord_dps_vmph_cumulative_total',
                sort: 'ASC'
            },
            {
                // 累计开始时间
                name: 'custrecord_dps_vmph_cumulative_time'
            },
            {
                // 生效时间
                name: 'custrecord_vmpd_effective_date'
            },
            {
                // 失效时间
                name: 'custrecord_vmpd_expiration_date'
            }
        ];

        var resultArr = [];
        var add = 0;

        search.create({
            type: 'customrecord_vemdor_price_manage_d',
            filters: filters,
            columns: columns
        }).run().each(function (result) {
            resultArr.push(result);
            ++add;
            // 只取符合条件的第一个价格
            // return true;
        });
        log.debug('add', add);
        return resultArr || false;
    }


    /**
     * 查询历史采购订单的
     * @param {*} vendor 
     * @param {*} subsidiary 
     * @returns 
     */
    function getPriceByTotal(vendor, subsidiary, currency, itemId, effectiveDate) {
        var total = 0,
            limit = 3999,
            add = 0;
        log.debug('getPriceByTotal', vendor, subsidiary, currency, itemId, effectiveDate);
        search.create({
            type: 'purchaseorder',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                },
                {
                    name: "trandate",
                    operator: "onorafter",
                    values: effectiveDate
                },
                {
                    name: "subsidiary",
                    operator: 'anyof',
                    values: subsidiary
                },
                {
                    name: 'currency',
                    operator: 'anyof',
                    values: currency
                },
                {
                    name: "internalid",
                    join: "vendor",
                    operator: 'anyof',
                    values: vendor
                },
                {
                    name: "item",
                    operator: 'anyof',
                    values: itemId
                }
            ],
            columns: [{
                name: "quantity",
                summary: "SUM"
            }]
        }).run().each(function (rec) {
            total = rec.getValue({
                name: "quantity",
                summary: "SUM"
            });
            ++add;
            return --limit > 0;
        });

        log.debug('total', total, 'add', add);
        return total ? total : 0;

    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});