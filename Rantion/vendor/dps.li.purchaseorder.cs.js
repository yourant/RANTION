/*
 * @Author         : Li
 * @Date           : 2020-05-15 20:32:05
 * @LastEditTime   : 2020-08-07 11:47:30
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\vendor\dps.li.purchaseorder.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../Helper/Moment.min', 'N/search', 'N/runtime'], function (moment, search, runtime) {

    function pageInit(context) {

    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {

    }

    function sublistChanged(context) {

    }

    function lineInit(context) {

    }

    function validateField(context) {
        // console.log('validateField', context.fieldId);
        var rec = context.currentRecord;

        var price_type = rec.getValue('custbody_vendor_price_type');

        var curUnitPrice = 0;
        var curTaxCode = 0;
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat);
        // console.log('today', today);

        var quantity = rec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity'
        });

        if (context.fieldId == 'matchbilltoreceipt' || context.fieldId == 'quantity' || context.fieldId == 'item') {
            var supplier = rec.getValue('entity');
            // console.log('supplier', supplier);
            var subs = rec.getValue('subsidiary');
            var currency = rec.getValue('currency');
            // console.log('currency', currency);
            var partNo = rec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });
            // console.log('partNo', partNo);
            if (!supplier || !partNo || !currency) {
                return true;
            }

            if (!quantity) {
                quantity = 1;
            }
            // console.log('quantity', quantity);
            var resultArr;
            var sum;

            // console.log('price_type', price_type);

            if (price_type == 1) {
                console.log('price_type 1', price_type);
                resultArr = getVpmd(supplier, currency, partNo, today, price_type, quantity);
            } else if (price_type == 2) {

                var get_arr = getEffectiveDateByItem(supplier, currency, partNo, today);
                if (get_arr && get_arr.length > 0) {
                    // console.log('get_arr', get_arr);
                    var effectiveDate;
                    effectiveDate = get_arr[0].getValue('custrecord_dps_vmph_cumulative_time');

                    if (!effectiveDate) {
                        var effectiveDate = get_arr[0].getValue('custrecord_vmpd_effective_date');
                    }

                    // console.log('effectiveDate', effectiveDate);
                    // console.log("get_arr", get_arr);
                    // effectiveDate = moment(effectiveDate).format(dateFormat);
                    sum = getPriceByTotal(supplier, subs, currency, partNo, effectiveDate);
                }

                if (!sum) {
                    sum = 0;
                }
                // console.log('sum', sum);
                if (sum >= 0) {
                    sum = Number(sum);

                    // console.log('Number(sum)', Number(sum));
                    // 采购过相同的货品
                    resultArr = getVpmd(supplier, currency, partNo, today, price_type, sum);
                }

            }
            // console.log('resultArr', resultArr);
            if (resultArr && resultArr.length > 0) {
                if (price_type == 1) {
                    for (j = 0; j < resultArr.length; j++) {
                        var curquantity = resultArr[j].getValue('custrecord_vmpd_quantity');
                        // console.log('curquantity', curquantity);
                        if (quantity >= curquantity) {
                            if ((j + 1) == resultArr.length) {
                                curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                curTaxCode = resultArr[j].getValue('custrecord_vmpd_tax_code');
                                // console.log('(j + 1) == resultArr.length curUnitPrice', curUnitPrice);
                                break;
                            } else {
                                if (quantity < resultArr[j + 1].getValue('custrecord_vmpd_quantity')) {
                                    curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                    curTaxCode = resultArr[j].getValue('custrecord_vmpd_tax_code');
                                    console.log('ELSE curUnitPrice', curUnitPrice);
                                    break;
                                }
                            }
                        }
                    }
                } else if (price_type == 2) {
                    var len = resultArr.length;
                    curUnitPrice = resultArr[len - 1].getValue('custrecord_vmpd_unit_price');
                    curTaxCode = resultArr[len - 1].getValue('custrecord_vmpd_tax_code');
                }


                console.log('curUnitPrice', curUnitPrice);
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: curUnitPrice
                });


                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: curTaxCode
                });
              if (rec.type == 'purchaseorder') {
                    var taxrate1 = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxrate1'
                    })
                    var taxPrice = rec.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_purchase_tax_price'
                    })
                    var rate = curUnitPrice;
                    rec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_purchase_tax_price',
                        value: (taxrate1 + 100) * rate / 100
                    });

                }

            }
        }
		if (rec.type == 'purchaseorder' && context.fieldId == 'custcol_purchase_tax_price') {
            var taxrate1 = rec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'taxrate1'
            })
            var taxPrice = rec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_purchase_tax_price'
            })
            rec.setCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: taxPrice / (taxrate1 + 100) * 100
            });
        }
        return true;
    }

    function validateLine(context) {


        /*
        var rec = context.currentRecord;

        var price_type = rec.getValue('custbody_vendor_price_type');

        var curUnitPrice = 0;
        var curTaxCode = 0;
        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
        var today = moment(new Date().getTime()).format(dateFormat);

        var quantity = rec.getCurrentSublistValue({
            sublistId: 'item',
            fieldId: 'quantity'
        });

        if (quantity == 1) {
            var supplier = rec.getValue('entity');

            var subs = rec.getValue('subsidiary');
            var currency = rec.getValue('currency');

            var partNo = rec.getCurrentSublistValue({
                sublistId: 'item',
                fieldId: 'item'
            });

            if (!supplier || !partNo || !currency) {
                return true;
            }

            var resultArr;
            var sum;

            // console.log('price_type', price_type);

            if (price_type == 1) {
                // console.log('price_type 1', price_type);
                resultArr = getVpmd(supplier, currency, partNo, today, price_type, quantity);
            } else if (price_type == 2) {

                var get_arr = getEffectiveDateByItem(supplier, currency, partNo, today);
                if (get_arr && get_arr.length > 0) {
                    // console.log('get_arr', get_arr);
                    var effectiveDate;
                    effectiveDate = get_arr[0].getValue('custrecord_dps_vmph_cumulative_time');

                    if (!effectiveDate) {
                        var effectiveDate = get_arr[0].getValue('custrecord_vmpd_effective_date');
                    }

                    // console.log('effectiveDate', effectiveDate);
                    // console.log("get_arr", get_arr);
                    sum = getPriceByTotal(supplier, subs, currency, partNo, effectiveDate);
                }

                if (!sum) {
                    sum = 0;
                }
                console.log('sum', sum);
                if (sum >= 0) {
                    sum = Number(sum);
                    // 采购过相同的货品
                    resultArr = getVpmd(supplier, currency, partNo, today, price_type, sum);
                }

            }

            if (resultArr && resultArr.length > 0) {
                if (price_type == 1) {
                    for (j = 0; j < resultArr.length; j++) {
                        var curquantity = resultArr[j].getValue('custrecord_vmpd_quantity');

                        if (quantity >= curquantity) {
                            if ((j + 1) == resultArr.length) {
                                curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                curTaxCode = resultArr[j].getValue('custrecord_vmpd_tax_code');
                                console.log('(j + 1) == resultArr.length curUnitPrice', curUnitPrice);
                                break;
                            } else {
                                if (quantity < resultArr[j + 1].getValue('custrecord_vmpd_quantity')) {
                                    curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
                                    curTaxCode = resultArr[j].getValue('custrecord_vmpd_tax_code');
                                    console.log('ELSE curUnitPrice', curUnitPrice);
                                    break;
                                }
                            }
                        }
                    }
                } else if (price_type == 2) {
                    var len = resultArr.length;
                    curUnitPrice = resultArr[len - 1].getValue('custrecord_vmpd_unit_price');
                    curTaxCode = resultArr[len - 1].getValue('custrecord_vmpd_tax_code');
                }

                console.log('curUnitPrice', curUnitPrice);
                rec.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    value: curUnitPrice
                });
            }
        }

        */
        return true;
    }

    function validateInsert(context) {
        return true;
    }

    function validateDelete(context) {
        return true;
    }

    function saveRecord(context) {
        return true;
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


        console.log('getVpmd sum', sum);
        log.error('sum', sum);

        var limit = 3999;

        // console.log('getVpmd', supplier, currency, partNo, today, sta, sum);
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
        }, {
            name: 'isinactive',
            operator: 'is',
            values: false
        });
        var columns = [];
        columns.push({
            name: 'custrecord_vmpd_unit_price'
        });
        columns.push({
            name: 'custrecord_vmpd_tax_code'
        });
        if (sta == 1) {
            columns.push({
                name: 'custrecord_vmpd_quantity',
                sort: 'ASC'
            });
            flag = true;
        }
        if (sta == 2) {

            // filters.push({
            //     name: 'custrecord_dps_vmph_cumulative_total',
            //     operator: "lessthanorequalto",
            //     values: sum
            // });

            if (sum > 0) {
                console.log('sum > 0');
                filters.push({
                    name: 'custrecord_dps_vmph_cumulative_total',
                    operator: "lessthanorequalto",
                    values: sum
                });
            } else {
                console.log('sum = 0');
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
        log.error('filters', filters);
        var resultArr = [];
        var add = 0;

        search.create({
            type: 'customrecord_vemdor_price_manage_d',
            filters: filters,
            columns: columns
        }).run().each(function (result) {
            resultArr.push(result);

            log.error('price', result.getValue('custrecord_vmpd_unit_price'));
            log.error('price2', result.getValue('custrecord_vmpd_tax_code'));
            add++;

            return flag;
            return --limit > 0;
        });

        console.log('getVpmd resultArr', resultArr);
        // console.log('add', add);
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
        console.log('add', add);
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
        console.log('getPriceByTotal', vendor, subsidiary, currency, itemId, effectiveDate);
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

        console.log('total', total, 'add', add);
        return total ? total : 0;

    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord
    };

});