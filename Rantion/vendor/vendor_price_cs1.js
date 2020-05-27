/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/Moment.min', 'N/format', 'N/ui/dialog', 'N/record', 'N/search'],
    function (moment, format, dialog, record, search) {

        var rec;
        var se = [];
        var vc = [];

        function pageInit(context) {
            rec = context.currentRecord;

            // console.log('customform',rec.getValue('customform'))
            getVendorInfo();
            // var remove_tax_code = rec.getSublistField({
            //     sublistId: 'recmachcustrecord_vpmd_link',
            //     fieldId: 'custrecord_vmpd_tax_code',
            //     line: 0
            // });
            // console.log('remove_tax_code',remove_tax_code)
            // var line = rec.getLineCount({
            //     sublistId: 'recmachcustrecord_vpmd_link'
            // });
            // console.log('line',line);
            // for (var i = 0; i < line; i++) {
            //     console.log(1);

            //     var remove_tax_code = rec.getSublistField({
            //         sublistId: 'recmachcustrecord_vpmd_link',
            //         fieldId: 'custrecord_vmpd_tax_code',
            //         line: i
            //     });
            //     console.log('remove_tax_code',remove_tax_code);
            //     remove_tax_code.removeSelectOption({ value: null, }); 
            // }

            // var remove_tax_code = rec.getField({ fieldId: 'custrecord_vmpd_tax_code' });
            // console.log('remove_tax_code',remove_tax_code);
            // remove_tax_code.removeSelectOption({
            //     value: null,
            // }); 
        }

        function saveRecord(context) {
            var subsidiarys = rec.getValue('custrecord_vpmh_subsidiary');
            if (subsidiarys == '') {
                dialog.alert({
                    title: '提示',
                    message: '请选择子公司'
                });
                return false;
            } else {
                var flag = checkArr(se, subsidiarys);
                if (!flag) {
                    dialog.alert({
                        title: '提示',
                        message: '该供应商与您所选的子公司没有建立合作关系，请联系相关管理人员维护供应商档案'
                    });
                    return false;
                }
            }
            return true;
        }

        function validateField(context) {
            var subsidiarys = rec.getValue('custrecord_vpmh_subsidiary');
            var supplier = rec.getValue('custrecord_vpmh_supplier');
            if (context.fieldId == 'custrecord_vpmh_subsidiary') {
                if (subsidiarys == '') {
                    dialog.alert({
                        title: '提示',
                        message: '请选择子公司'
                    });
                    return false;
                } else {
                    if (!supplier) {
                        dialog.alert({
                            title: '提示',
                            message: '请选择供应商'
                        });
                        return false;
                    } else {
                        if (se.length < 1) {
                            getVendorInfo();
                        }
                        var flag = checkArr(se, subsidiarys);
                        if (!flag) {
                            dialog.alert({
                                title: '提示',
                                message: '该供应商与您所选的子公司没有建立合作关系，请联系相关管理人员维护供应商档案'
                            });
                            return false;
                        }
                    }
                }
            }
            if (context.fieldId == 'custrecord_vmpd_currency') {
                var currency = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_currency'
                });
                if (subsidiarys == '') {
                    dialog.alert({
                        title: '提示',
                        message: '请选择子公司'
                    });
                    return false;
                } else {
                    if (!supplier) {
                        dialog.alert({
                            title: '提示',
                            message: '请选择供应商'
                        });
                        return false;
                    } else {
                        if (se.length < 1) {
                            getVendorInfo();
                        }
                        var flag = checkArr(vc, currency);
                        if (!flag) {
                            dialog.alert({
                                title: '提示',
                                message: '该供应商与您所选的币种没有建立维护关系，请联系相关管理人员维护供应商档案'
                            });
                            return false;
                        }
                    }
                }
            }
            if (context.fieldId == 'custrecord_vpmh_supplier') { //根据供应商查找供应商ID
                var venRec = record.load({
                    type: 'vendor',
                    id: supplier
                });
                var vendorId = venRec.getValue('custentity_vendor_code');
                rec.setValue({
                    fieldId: 'custrecord_vendor_id',
                    value: vendorId,
                    ignoreFieldChange: true
                });
            }
            if (context.fieldId == 'custrecord_vpmd_part_no') {
                var sku = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vpmd_part_no'
                });
                var resultArr = searchSkuPriceInfo(sku, supplier);
                try {
                    var vendorRec = record.load({
                        type: record.Type.VENDOR,
                        id: supplier
                    });
                    var lineNum = vendorRec.getLineCount({
                        sublistId: 'submachine'
                    });
                    for (var x = 0; x < lineNum; x++) {
                        var vendorSubsidiary = vendorRec.getSublistValue({
                            sublistId: 'submachine',
                            fieldId: 'subsidiary',
                            line: x
                        });
                        var taxItem = vendorRec.getSublistValue({
                            sublistId: 'submachine',
                            fieldId: 'taxitem',
                            line: x
                        });
                        var baseCurrency = vendorRec.getSublistValue({
                            sublistId: 'submachine',
                            fieldId: 'unbilledbasecurrency',
                            line: x
                        });
                        if (subsidiarys == vendorSubsidiary) {
                            baseCurrency = baseCurrency.replace('(', '').replace(')', '');
                            rec.setCurrentSublistValue({
                                sublistId: 'recmachcustrecord_vpmd_link',
                                fieldId: 'custrecord_vmpd_tax_code',
                                value: taxItem,
                                ignoreFieldChange: true
                            });
                            rec.setCurrentSublistText({
                                sublistId: 'recmachcustrecord_vpmd_link',
                                fieldId: 'custrecord_vmpd_currency',
                                text: baseCurrency,
                                ignoreFieldChange: true
                            });
                        }
                    }
                } catch (error) {
                    console.log(JSON.stringify(error));
                }
                if (resultArr.length > 0) {
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_unit_price',
                        value: resultArr[0].getValue('custrecord_vmpd_unit_price'),
                        ignoreFieldChange: true
                    });
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_currency',
                        value: resultArr[0].getValue('custrecord_vmpd_currency'),
                        ignoreFieldChange: true
                    });
                }
            }

            if (context.fieldId == 'custrecord_vmpd_tax_code') {
                var rate;
                var tax_code = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_code'
                });

                var unit_price = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_unit_price'
                });

                var tax_unit_price = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_unit_price'
                });
                if (tax_code) {

                    rate = getTaxRate(tax_code);
                    if (rate == undefined) {
                        rate = 0;
                    }

                    // console.log('rate',rate);

                    if (unit_price) {
                        // console.log('unit_price', unit_price);
                        var tax_unit_price_1 = Number(unit_price * (1 + rate)).toFixed(4);
                        // console.log('tax_unit_price_1', tax_unit_price_1);
                        rec.setCurrentSublistValue({
                            sublistId: 'recmachcustrecord_vpmd_link',
                            fieldId: 'custrecord_vmpd_tax_unit_price',
                            value: tax_unit_price_1,
                            ignoreFieldChange: true,
                        });
                    }
                }


            }
            if (context.fieldId == 'custrecord_vendor_id') {
                var vendorId = rec.getValue('custrecord_vendor_id');
                var vendors = [];
                if (vendorId) {
                    search.create({
                        type: search.Type.VENDOR,
                        filters: [{
                            name: "custentity_vendor_code",
                            operator: "is",
                            values: vendorId
                        }],
                        columns: [{
                                name: "custentity_vendor_code"
                            },
                            {
                                name: 'subsidiary'
                            }
                        ]
                    }).run().each(function (result) {
                        vendors.push(result);
                        return true;
                    });

                    if (vendors.length > 1) {
                        alert('您输入的供应商ID对应了多个供应商');
                    } else if (vendors.length == 0) {
                        alert('您输入的供应商ID没有对应的供应商，请进行供应商维护');
                    } else {
                        rec.setValue({
                            fieldId: 'custrecord_vpmh_supplier',
                            value: Number(vendors[0].id),
                        });
                        rec.setValue({
                            fieldId: 'custrecord_vpmh_subsidiary',
                            value: vendors[0].getValue('subsidiary')
                        });
                    }
                }
            }
            return true;
        }

        function fieldChanged(context) {

            var line = rec.getLineCount({
                sublistId: 'recmachcustrecord_vpmd_link'
            });
            // var rec = context.currentRecord;
            var rate;


            if (context.fieldId == 'custrecord_vpmh_supplier') {
                getVendorInfo();
            }

            if (context.fieldId == 'custrecord_vmpd_unit_price') {
                var unit_price = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_unit_price'
                });
                var tax_code = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_code'
                });
                var tax_unit_price_1 = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_unit_price'
                });
                if (!tax_code) {
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_tax_unit_price',
                        value: unit_price,
                        ignoreFieldChange: true,
                    });
                }
                if (tax_code) {
                    // if (tax_code && (tax_unit_price_1 == null || tax_unit_price_1 == undefined || tax_unit_price_1 == '')) {
                    rate = getTaxRate(tax_code);
                    // console.log('rate', rate);
                    var tax_unit_price = Number(unit_price * (1 + rate)).toFixed(4);
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_tax_unit_price',
                        value: tax_unit_price,
                        ignoreFieldChange: true,
                    });
                }
            }

            if (context.fieldId == 'custrecord_vmpd_tax_unit_price') {

                var tax_unit_price = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_unit_price'
                });
                var tax_code = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_tax_code'
                });
                var unit_price_1 = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_unit_price'
                });
                if (!tax_code) {
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_unit_price',
                        value: tax_unit_price,
                        ignoreFieldChange: true,
                    });
                }
                if (tax_code) {
                    // if (tax_code && (unit_price_1 == null || unit_price_1 == undefined || unit_price_1 == '')) {
                    rate = getTaxRate(tax_code);
                    var unit_price = Number(tax_unit_price / (1 + rate)).toFixed(4);
                    rec.setCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_unit_price',
                        value: unit_price,
                        ignoreFieldChange: true,
                    });
                }
            }

        }

        function getTaxRate(tax_code) {
            var rate;
            search.create({
                type: 'salestaxitem',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: tax_code
                }],
                columns: [{
                    name: 'rate'
                }]
            }).run().each(function (result) {

                rate = Number((result.getValue(result.columns[0]).replace('%', '') * 100) / 10000);
            });
            return rate;
        }

        function getVendorInfo() {
            var supplier = rec.getValue('custrecord_vpmh_supplier');
            if (!supplier) {
                dialog.alert({
                    title: '提示',
                    message: '请选择供应商'
                });
            } else {
                var venRec = record.load({
                    type: 'vendor',
                    id: supplier
                });
                var venCurrCount = venRec.getLineCount({
                    sublistId: 'currency'
                });
                for (var j = 0; j < venCurrCount; j++) {
                    vc.push(venRec.getSublistValue({
                        sublistId: 'currency',
                        fieldId: 'currency',
                        line: j
                    }));
                }
                var venmseCount = venRec.getLineCount({
                    sublistId: 'submachine'
                });
                for (var j = 0; j < venmseCount; j++) {
                    se.push(venRec.getSublistValue({
                        sublistId: 'submachine',
                        fieldId: 'subsidiary',
                        line: j
                    }));
                }
            }
        }

        function postSourcing(context) {}

        function lineInit(context) {

        }

        function validateDelete(context) {
            return true;
        }

        function validateInsert(context) {
            return true;
        }

        function validateLine(context) {

            var rec = context.currentRecord;
            var supplier = rec.getValue('custrecord_vpmh_supplier');
            if (supplier == null || supplier == '') {
                dialog.alert({
                    title: '提示',
                    message: '请选择供应商'
                });
                return false;
            }
            var newPartNo = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vpmd_part_no'
            });
            var newquantity = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_quantity'
            });
            var newcurrency = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_currency'
            });
            var newEffectiveDateStr = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_effective_date'
            });

            var fir_type = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_quantity',
            })
            var newExpirationDateStr = rec.getCurrentSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_expiration_date'
            });
            if (!newExpirationDateStr) {
                rec.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_expiration_date',
                    values: new Date('2050/12/31')
                });

                newExpirationDateStr = rec.getCurrentSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_expiration_date'
                });
            }
            var newEffDate = format.parse({
                value: newEffectiveDateStr,
                type: format.Type.DATE
            });
            var newEffectiveDate = new Date(moment(newEffDate).format('YYYY/MM/DD'));
            var newExpDate = format.parse({
                value: newExpirationDateStr,
                type: format.Type.DATE
            });

            var newExpirationDate = new Date(moment(newExpDate).format('YYYY/MM/DD'));
            var newcurrIndex = rec.getCurrentSublistIndex({
                sublistId: 'recmachcustrecord_vpmd_link'
            });
            var resultArr = new Array();
            var newSublistCount = rec.getLineCount({
                sublistId: 'recmachcustrecord_vpmd_link'
            });
            for (index = 0; index < newSublistCount; index++) {
                var jsonObj = {};
                var pPartNo = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vpmd_part_no',
                    line: index
                });
                var oldquantity = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_quantity',
                    line: index
                });
                var oldcurrency = rec.getSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_currency',
                    line: index
                });
                if (newPartNo == pPartNo && oldquantity == newquantity && oldcurrency == newcurrency && newcurrIndex != index) {
                    jsonObj['custrecord_vmpd_effective_date'] = format.format({
                        value: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_vpmd_link',
                            fieldId: 'custrecord_vmpd_effective_date',
                            line: index
                        }),
                        type: format.Type.DATE
                    });
                    jsonObj['custrecord_vmpd_expiration_date'] = format.format({
                        value: rec.getSublistValue({
                            sublistId: 'recmachcustrecord_vpmd_link',
                            fieldId: 'custrecord_vmpd_expiration_date',
                            line: index
                        }),
                        type: format.Type.DATE
                    });
                    jsonObj['type'] = rec.getCurrentSublistValue({
                        sublistId: 'recmachcustrecord_vpmd_link',
                        fieldId: 'custrecord_vmpd_quantity',
                        line: index
                    })
                    resultArr.push(jsonObj);
                }
            }
            for (j = 0; j < resultArr.length; j++) {
                var result = resultArr[j];
                var oldEffDate = format.parse({
                    value: result.custrecord_vmpd_effective_date,
                    type: format.Type.DATE
                });
                var oldEffectiveDate = new Date(moment(oldEffDate).format('YYYY/MM/DD'));
                var oldExpDate = format.parse({
                    value: result.custrecord_vmpd_expiration_date,
                    type: format.Type.DATE
                });
                var type = result.type;
                var oldExpirationDate = new Date(moment(oldExpDate).format('YYYY/MM/DD'));

                // 暂先注释 2020-05-15 17:59
                // if (!(newEffectiveDate >= oldExpirationDate || newExpirationDate <= oldEffectiveDate)) {
                //     dialog.alert({
                //         title: '提示',
                //         message: '存在时间区间又交叉价格阶梯数据，请确认信息后再添加'
                //     });
                //     return false;
                // }
            }
            return true;
        }

        function sublistChanged(context) {


        }

        /**
         * 比较两个数组包含关系
         * @param {*} arr1 
         * @param {*} arr2 
         */
        function checkArr(arr1, arr2) {
            var arr3 = [];
            for (var i = 0; i < arr2.length; i++) {
                if (arr1.indexOf(arr2[i]) > -1) {
                    arr3.push(arr2[i])
                }
            }
            if (arr3.length == arr2.length) {
                return true;
            } else {
                return false;
            }
        }

        function searchSkuPriceInfo(sku, supplier) {
            var resultArr = [];

            if (supplier && sku) {
                search.create({
                    type: "customrecord_vemdor_price_manage_d",
                    filters: [{
                            name: 'custrecord_vpmd_part_no',
                            operator: 'is',
                            values: sku
                        },
                        {
                            name: 'custrecord_vpmh_supplier',
                            join: 'custrecord_vpmd_link',
                            operator: 'is',
                            values: supplier
                        },
                        {
                            name: 'custrecord_vmph_check_status',
                            join: 'custrecord_vpmd_link',
                            operator: 'is',
                            values: 6
                        }
                    ],
                    columns: [{
                            name: 'custrecord_vmpd_unit_price'
                        },
                        {
                            name: 'custrecord_vpmd_part_no'
                        },
                        {
                            name: 'custrecord_vpmd_link'
                        },
                        {
                            name: 'custrecord_vpmh_supplier',
                            join: 'custrecord_vpmd_link'
                        },
                        {
                            name: 'custrecord_vmpd_currency'
                        }
                    ]
                }).run().each(function (result) {
                    resultArr.push(result);
                    return true;
                })
            }
            return resultArr;
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
            sublistChanged: sublistChanged
        }
    });