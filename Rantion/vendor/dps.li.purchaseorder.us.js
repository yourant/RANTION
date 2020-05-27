/*
 * @Author         : Li
 * @Date           : 2020-05-27 14:07:04
 * @LastEditTime   : 2020-05-27 15:31:09
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
        log.debug('beforeSubmit', 'beforeSubmit')

        var newRecord = scriptContext.newRecord;
        var type = scriptContext.type;
        log.debug('type', type);
        var ui = runtime.executionContext;
        log.debug('ui', ui);

        var price_type = newRecord.getValue('custbody_vendor_price_type');

        if (type == 'create' && ui == 'USEREVENT' && price_type == 1) {
            // var curUnitPrice = 0;
            // var numLines = newRecord.getLineCount({ sublistId: 'item' });
            // log.debug('numLines',numLines);
            // var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            // log.debug('dateFormat',dateFormat);
            // var today = moment(new Date().getTime()).format(dateFormat);
            // var supplier = newRecord.getValue('entity');
            // log.debug('supplier',supplier);
            // var currency = newRecord.getValue('currency');
            // log.debug('currency',currency);
            // var trandate = newRecord.getValue('trandate');
            // log.debug('trandate',trandate);
            // var date = moment(trandate).format(dateFormat);
            // log.debug('date',date);
            // for (var i = 0; i < numLines; i++) {
            //     var partNo = newRecord.getSublistValue({ 
            //         sublistId: 'item', 
            //         fieldId: 'item',
            //         line: i
            //     });
            //     log.debug('partNo',partNo);
            //     var quantity = newRecord.getSublistValue({ 
            //         sublistId: 'item', 
            //         fieldId: 'quantity',
            //         line: i
            //     });
            //     log.debug('quantity',quantity);

            //     var resultArr = getVpmd(supplier, currency, partNo, date);
            //     log.debug('resultArr',resultArr);
            //     for (j = 0; j < resultArr.length; j++) {
            //         var curquantity = resultArr[j].getValue('custrecord_vmpd_quantity');
            //         log.debug('curquantity',curquantity);
            //         if (quantity > curquantity) {
            //             if ((j + 1) == resultArr.length) {
            //                 log.debug(1)
            //                 curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
            //                 break;
            //             } else {
            //                 if (quantity <= resultArr[j + 1].getValue('custrecord_vmpd_quantity')) {
            //                     log.debug(2)
            //                     curUnitPrice = resultArr[j].getValue('custrecord_vmpd_unit_price');
            //                     break;
            //                 }
            //             }
            //         }
            //     }
            //     try {
            //         log.debug('curUnitPrice',curUnitPrice);
            //         newRecord.setSublistValue({ 
            //             sublistId: 'item', 
            //             fieldId: 'rate', 
            //             value: curUnitPrice,
            //             line: i
            //         });
            //     } catch (error) {
            //         log.debug('set error',error);
            //     }
            // }


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
                var resultArr = getVpmd(supplier, currency, partNo, date);
                // log.debug('resultArr' + k, resultArr);
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



        // var sings =[];
        // for (var m = 0; m < arr2.length; m++) {
        //     if (sings.indexOf('true') == -1) {

        //         sings.push(arr2[m].sign);
        //     }
        //     if (arr2[m].sign) {

        //         log.debug('m'+m,arr2[m].sign);
        //         log.debug('m'+m,arr2);
        //         try {
        //             // var lineNum = newRecord.selectLine({
        //             //     sublistId: 'item',
        //             //     line: m
        //             // });
        //             newRecord.removeLine({
        //                 sublistId: 'item',
        //                 line: m,
        //                 ignoreRecalc: true
        //             });
        //             // newRecord.commitLine({
        //             //     sublistId: 'item'
        //             // });
        //         } catch (error) {
        //             log.debug('e',error);
        //         }
        //     }
        // }


    }

    function afterSubmit(scriptContext) {
        log.debug('afterSubmit', 'afterSubmit')

        var newRecord = scriptContext.newRecord;
        var type = scriptContext.type;
        log.debug('type', type);
        var ui = runtime.executionContext;
        log.debug('ui', ui);

        // if (type == 'create' && ui == 'USEREVENT') {


        // try {
        //     var id = newRecord.save();
        //     log.debug('id',id);
        // } catch (error) {
        //     log.debug('save error',error);
        // }
        // }
    }


    function getVpmd(supplier, currency, partNo, today) {
        var filters = [{
                join: 'custrecord_vpmd_link',
                name: 'custrecord_vpmh_supplier',
                operator: 'anyof',
                values: supplier
            },
            {
                name: "custrecord_vpmd_part_no",
                operator: 'anyof',
                values: partNo
            },
            {
                name: "custrecord_vmpd_currency",
                operator: 'anyof',
                values: currency
            },
            {
                name: 'custrecord_vmpd_effective_date',
                operator: 'onorbefore',
                values: today
            },
            {
                name: 'custrecord_vmpd_expiration_date',
                operator: 'onorafter',
                values: today
            }
        ];
        var columns = [{
                name: 'custrecord_vmpd_quantity',
                sort: 'ASC'
            },
            {
                name: 'custrecord_vmpd_unit_price'
            }
        ];
        var mySearch = search.create({
            type: 'customrecord_vemdor_price_manage_d',
            filters: filters,
            columns: columns
        });
        var resultArr = [];
        mySearch.run().each(function (result) {
            resultArr.push(result);
            return true;
        });
        return resultArr;
    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});