/*
 * @Author         : Li
 * @Date           : 2020-04-26 12:08:43
 * @LastEditTime   : 2020-07-10 22:26:29
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\pr\pr_batch_import_sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@author Elias
 *@description 批量转请购单
 */
define(['N/ui/serverWidget', 'N/search', 'N/record', '../Helper/Moment.min', 'N/runtime', 'N/format', './pr_lan'],
    function (serverWidget, search, record, moment, runtime, format, systemLan) {

        var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');

        var language = runtime.getCurrentUser().getPreference({
            name: 'LANGUAGE'
        });
        var languageParam = systemLan.prBatchImportParam;

        function onRequest(context) {

            try {

                var response = context.response;
                var request = context.request;
                var method = request.method;
                var params = request.parameters; //参数
                if (method == 'GET') {
                    //首次进入工作台渲染
                    var form = initUI(); //渲染查询条件UI界面
                    var unchangedPrArr = searchBatchImportPrRes('', '', '', '');
                    log.error({
                        title: '返回的结果',
                        details: JSON.stringify(unchangedPrArr)
                    });
                    setResultToForm(unchangedPrArr, form);
                    response.writePage(form);
                } else {
                    //点击刷新时进行查询
                    var action = params.action;
                    if (action == 'transform') {
                        var data = params.data;
                        data = JSON.parse(data);
                        var itemResultArr = searchAllChoosedItem(data);
                        var resStr = '';
                        for (var z = 0; z < data.length; z++) {
                            var loadId = Number(data[z]);
                            try {
                                var receiptId = transformRecordToPr(loadId, itemResultArr);
                                log.error({
                                    title: 'id',
                                    details: receiptId
                                });
                                resStr = resStr + '内部标识为' + loadId + '的记录成功转换为请购单，其记录的id为:' + receiptId + '\n';
                            } catch (error) {
                                resStr = resStr + '内部标识为' + loadId + '的记录转换失败';
                                log.error({
                                    title: '报错信息',
                                    details: JSON.stringify(error)
                                });
                            }
                        }
                        response.write({
                            output: resStr
                        });
                    } else {
                        var subsidiary = params.custpage_batch_import_subsidiary;
                        // var batchid = params.custpage_batch_import_batchid;
                        var beginDate = params.custpage_batch_import_begin_time;
                        var endDate = params.custpage_batch_import_end_time;
                        var unchangedPrArr = searchBatchImportPrRes(subsidiary, beginDate, endDate);
                        var form = initUI(); //渲染查询条件UI界面
                        form.updateDefaultValues({
                            custpage_batch_import_subsidiary: subsidiary,
                            // custpage_batch_import_batchid: batchid,
                            custpage_batch_import_begin_time: beginDate,
                            custpage_batch_import_end_time: endDate
                        });
                        setResultToForm(unchangedPrArr, form);
                        response.writePage(form);
                    }
                }
            } catch (error) {
                log.error('转换请购单出错了', error)
                // context.response.writeLine("ERROR")
                context.response.writeLine(JSON.stringify(error))

            }
        }

        /**
         * 初始化ui
         */
        function initUI() {
            var form = serverWidget.createForm(language == 'zh_CN' ? '批量导入请购单' : 'batch import requisition order');
            form.addFieldGroup({
                id: 'custpage_search_group',
                label: languageParam[language]['custpage_search_group']
            });
            var subsidiaryField = form.addField({
                id: 'custpage_batch_import_subsidiary',
                type: serverWidget.FieldType.SELECT,
                source: 'subsidiary',
                label: languageParam[language]['custpage_batch_import_subsidiary'],
                container: 'custpage_search_group'
            });
            // var batchField = form.addField({
            //     id: 'custpage_batch_import_batchid',
            //     type: serverWidget.FieldType.TEXT,
            //     label: languageParam[language]['custpage_batch_import_batchid'],
            //     container: 'custpage_search_group'
            // });
            var beginTimeField = form.addField({
                id: 'custpage_batch_import_begin_time',
                type: serverWidget.FieldType.DATE,
                label: languageParam[language]['custpage_batch_import_begin_time'],
                container: 'custpage_search_group'
            });
            var endtimeField = form.addField({
                id: 'custpage_batch_import_end_time',
                type: serverWidget.FieldType.DATE,
                label: languageParam[language]['custpage_batch_import_end_time'],
                container: 'custpage_search_group'
            });

            // //==========查询条件end==================================================================

            //创建显示结果的子列表
            form.addSubtab({
                id: 'custpage_batch_import_pr',
                label: languageParam[language]['custpage_batch_import_pr']
            });

            // //==========查询结果begin================================================================
            var sublist = form.addSublist({
                id: 'custpage_batch_import_sublist',
                type: serverWidget.SublistType.LIST,
                label: languageParam[language]['custpage_batch_import_sublist'],
                tab: 'custpage_batch_import_sub_tab'
            });
            sublist.addMarkAllButtons(); //标记全部
            sublist.addField({
                id: 'custpage_batch_import_checkbox',
                type: serverWidget.FieldType.CHECKBOX,
                label: languageParam[language]['custpage_batch_import_checkbox']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            }) //勾选框
            // sublist.addField({
            //     id: 'custpage_batch_import_batch_id',
            //     type: serverWidget.FieldType.TEXT,
            //     label: languageParam[language]['custpage_batch_import_batch_id']
            // }).updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.NORMAL
            // });
            sublist.addField({
                id: 'custpage_batch_import_id',
                type: serverWidget.FieldType.TEXT,
                label: languageParam[language]['custpage_batch_import_id']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            });
            sublist.addField({
                id: 'custpage_batch_import_request_body',
                type: serverWidget.FieldType.SELECT,
                source: 'employee',
                label: languageParam[language]['custpage_batch_import_request_body']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            sublist.addField({
                id: 'custpage_batch_import_create_date',
                type: serverWidget.FieldType.DATE,
                label: languageParam[language]['custpage_batch_import_create_date']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.NORMAL
            });
            // sublist.addField({
            //     id: 'custpage_batch_import_purchase_type',
            //     type: serverWidget.FieldType.TEXT,
            //     label: languageParam[language]['custpage_batch_import_purchase_type']
            // }).updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.NORMAL
            // });
            sublist.addField({
                id: 'custpage_batch_import_sublist_subdiary',
                type: serverWidget.FieldType.SELECT,
                source: 'subsidiary',
                label: languageParam[language]['custpage_batch_import_sublist_subdiary']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            }); //NORMAL
            sublist.addField({
                id: 'custpage_batch_import_sublist_location',
                type: serverWidget.FieldType.SELECT,
                source: 'location',
                label: languageParam[language]['custpage_batch_import_sublist_location']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            sublist.addField({
                id: 'custpage_batch_import_sublist_currency',
                type: serverWidget.FieldType.TEXT,
                label: languageParam[language]['custpage_batch_import_sublist_currency']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            sublist.addField({
                id: 'custpage_batch_import_demand_number',
                type: serverWidget.FieldType.TEXT,
                label: languageParam[language]['custpage_batch_import_demand_number']
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            // sublist.addField({
            //     id: 'custpage_batch_import_plan_body',
            //     type: serverWidget.FieldType.SELECT,
            //     source: 'employee',
            //     label: languageParam[language]['custpage_batch_import_plan_body']
            // }).updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.NORMAL
            // });
            // sublist.addField({
            //     id: 'custpage_batch_import_store',
            //     type: serverWidget.FieldType.SELECT,
            //     source: 'customrecord_aio_account',
            //     label: languageParam[language]['custpage_batch_import_store']
            // }).updateDisplayType({
            //     displayType: serverWidget.FieldDisplayType.NORMAL
            // });
            // //==========查询结果end==================================================================

            form.addSubmitButton({
                label: language == 'zh_CN' ? '查询' : 'Search'
            });
            form.addResetButton({
                label: language == 'zh_CN' ? '重置' : 'Reset'
            });
            form.addButton({
                id: 'custpage_batch_import_btn',
                label: languageParam[language]['custpage_batch_import_btn'],
                functionName: 'batchImport()'
            });
            form.clientScriptModulePath = './pr_batch_import_cs.js';
            return form;
        }

        /**
         * 查询未转换请购单的记录
         */
        function searchBatchImportPrRes(subsidiary, beginDate, endDate) {
            var columns = [
                'custrecord_pr_batch_import_entity',
                'custrecord_pr_batch_import_trandate',
                'custrecord_pr_batch_import_subsidiary',
                'custrecord_pr_batch_import_location',
                'custrecord_pr_batch_import_currency',

                // 'custrecord_pr_batch_import_order_id',
                // 'custrecord_pr_batch_import_buyer',
                // 'custrecord_pr_batch_import_store', 

                'custrecord_pr_bi_wether_to_be_pr',
                'custrecord_oms_demandnumber',
                'internalid'
            ];
            var filters = [];
            filters.push(search.createFilter({
                name: 'custrecord_pr_bi_wether_to_be_pr',
                operator: 'is',
                values: 'F'
            }));
            if (subsidiary != '' && subsidiary != null) {
                filters.push(search.createFilter({
                    name: 'custrecord_pr_batch_import_subsidiary',
                    operator: 'is',
                    values: subsidiary
                }));
            }
            // if (batchid != '' && batchid != null) {
            //     filters.push(search.createFilter({
            //         name: 'custrecord_pr_batch_import_batch_id',
            //         operator: 'is',
            //         values: batchid
            //     }));
            // }
            if (beginDate != '' && beginDate != null) {
                filters.push(search.createFilter({
                    name: 'custrecord_pr_batch_import_trandate',
                    operator: 'onorafter',
                    values: beginDate
                }));
            }
            if (endDate != '' && endDate != null) {
                filters.push(search.createFilter({
                    name: 'custrecord_pr_batch_import_trandate',
                    operator: 'onorbefore',
                    values: endDate
                }));
            }
            var unchangedPrSearch = search.create({
                type: 'customrecord_pr_batch_import_headline',
                title: '查询未转换的请购单记录',
                columns: columns,
                filters: filters
            });
            var unchangedPrArr = [];
            unchangedPrSearch.run().each(function (result) {
                log.error({
                    title: '请购单转换记录',
                    details: JSON.stringify(result)
                });
                unchangedPrArr.push(result);
                return true;
            });
            return unchangedPrArr;
        }

        /**
         * 将结果集展示到列表上
         * @param {*} unchangedPrArr 
         * @param {*} form 
         */
        function setResultToForm(unchangedPrArr, form) {
            if (unchangedPrArr.length > 0) {
                var sublist = form.getSublist({
                    id: 'custpage_batch_import_sublist'
                });
                for (var i = 0; i < unchangedPrArr.length; i++) {
                    // sublist.setSublistValue({ //批次号
                    //     id: 'custpage_batch_import_batch_id',
                    //     line: i,
                    //     value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_batch_id')
                    // });
                    unchangedPrArr[i].getValue('internalid') ? sublist.setSublistValue({ //内部标识
                        id: 'custpage_batch_import_id',
                        line: i,
                        value: unchangedPrArr[i].getValue('internalid')
                    }) : '';
                    unchangedPrArr[i].getValue('custrecord_pr_batch_import_entity') ? sublist.setSublistValue({ //请求者
                        id: 'custpage_batch_import_request_body',
                        line: i,
                        value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_entity')
                    }) : '';
                    unchangedPrArr[i].getValue('custrecord_pr_batch_import_trandate') ? sublist.setSublistValue({ //创建日期
                        id: 'custpage_batch_import_create_date',
                        line: i,
                        value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_trandate')
                    }) : '';
                    // sublist.setSublistValue({ //采购方式
                    //     id: 'custpage_batch_import_purchase_type',
                    //     line: i,
                    //     value: unchangedPrArr[i].getText('custrecord_pr_batch_import_po_method')
                    // });

                    unchangedPrArr[i].getValue('custrecord_pr_batch_import_subsidiary') ? sublist.setSublistValue({ //子公司
                        id: 'custpage_batch_import_sublist_subdiary',
                        line: i,
                        value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_subsidiary')
                    }) : '';
                    var location = unchangedPrArr[i].getValue('custrecord_pr_batch_import_location');
                    if (location != null && location.length > 0) {
                        sublist.setSublistValue({ //地点
                            id: 'custpage_batch_import_sublist_location',
                            line: i,
                            value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_location')
                        });
                    }
                    var currency = unchangedPrArr[i].getText('custrecord_pr_batch_import_currency');
                    if (currency) {
                        sublist.setSublistValue({ //货币
                            id: 'custpage_batch_import_sublist_currency',
                            line: i,
                            value: unchangedPrArr[i].getText('custrecord_pr_batch_import_currency')
                        });
                    }
                    // sublist.setSublistValue({ //计划员
                    //     id: 'custpage_batch_import_plan_body',
                    //     line: i,
                    //     value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_buyer')
                    // });
                    // sublist.setSublistValue({ //店铺
                    //     id: 'custpage_batch_import_store',
                    //     line: i,
                    //     value: unchangedPrArr[i].getValue('custrecord_pr_batch_import_store')
                    // });
                    var demandnumber = unchangedPrArr[i].getValue('custrecord_oms_demandnumber');
                    demandnumber ? sublist.setSublistValue({ //需求单号
                        id: 'custpage_batch_import_demand_number',
                        line: i,
                        value: unchangedPrArr[i].getValue('custrecord_oms_demandnumber')
                    }) : '';
                }
            }
        }

        /**
         * 将批量导入记录为id的转换成请购单
         * @param {*} id 
         */
        function transformRecordToPr(loadId, itemResultArr) {
            log.debug('transformRecordToPr', {
                'loadId': loadId,
                'itemResultArr': itemResultArr
            })
            var objRecord = record.load({
                type: 'customrecord_pr_batch_import_headline',
                id: loadId
            });
            var customRecord = record.create({
                type: 'purchaserequisition',
                isDynamic: true
            });
            log.debug('entity', objRecord.getValue('custrecord_pr_batch_import_entity'))
            customRecord.setValue({
                fieldId: 'entity',
                value: objRecord.getValue('custrecord_pr_batch_import_entity')
            }); //请求者
            log.debug('demandnumber', objRecord.getValue('custrecord_oms_demandnumber'))
            customRecord.setValue({
                fieldId: 'custbody_oms_demandnumber',
                value: objRecord.getValue('custrecord_oms_demandnumber')
            }); //需求单号
            var trandate = objRecord.getValue('custrecord_pr_batch_import_trandate');
            log.debug('trandate', trandate)
            customRecord.setValue({
                fieldId: 'trandate',
                value: trandate
            }); //创建日期
            var dueDate = objRecord.getValue('custrecord_pr_batch_import_duedate');
            log.debug('dueDate', dueDate)
            if (dueDate != null && dueDate != '') {
                customRecord.setValue({
                    fieldId: 'duedate',
                    value: dueDate
                }); //收货日期
            }
            log.debug('subsidiary', objRecord.getValue('custrecord_pr_batch_import_subsidiary'))
            customRecord.setValue({
                fieldId: 'subsidiary',
                value: objRecord.getValue('custrecord_pr_batch_import_subsidiary')
            }); //子公司
            var location = objRecord.getValue('custrecord_pr_batch_import_location');
            log.debug('location', location)
            if (location != null && location != '') {
                customRecord.setValue({
                    fieldId: 'location',
                    value: location
                }); //地点
            }
            var Memo = objRecord.getValue('custrecord_pr_batch_import_memo');
            log.debug('Memo', Memo)
            if (Memo != null && Memo != '') {
                customRecord.setValue({
                    fieldId: 'memo',
                    value: Memo
                }); //备注
            }

            var lineCount = objRecord.getLineCount({
                sublistId: 'recmachcustrecord_pr_batch_import_link'
            });
            log.debug('lineCount', lineCount);
            var items = [];
            for (var x = 0; x < lineCount; x++) {
                var item_id = objRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_pr_batch_import_link',
                    fieldId: 'custrecord_pr_batch_import_item',
                    line: x
                }); //货品
                var othervendor;
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: item_id
                    }],
                    columns: [{
                        name: 'othervendor'
                    }]
                }).run().each(function (rec) {
                    othervendor = rec.getValue('othervendor');
                })
                log.debug('othervendor', othervendor);
                var quantity = objRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_pr_batch_import_link',
                    fieldId: 'custrecord_pr_batch_import_quantity',
                    line: x
                }); //数量
                var estimatePrice = objRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_pr_batch_import_link',
                    fieldId: 'custrecord_pr_batch_import_est_value',
                    line: x
                }); //估计单价
                var estimateAmount = objRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_pr_batch_import_link',
                    fieldId: 'custrecord_pr_batch_import_est_amount',
                    line: x
                }); //估计金额
                var preReceiptDate = objRecord.getSublistValue({
                    sublistId: 'recmachcustrecord_pr_batch_import_link',
                    fieldId: 'custrecord_pr_bi_pre_reciept_date',
                    line: x
                }); //预计收货日期
                items.push({
                    line: x,
                    item_id: item_id,
                    othervendor: othervendor,
                    quantity: quantity,
                    estimatePrice: estimatePrice,
                    estimateAmount: estimateAmount,
                    preReceiptDate: preReceiptDate,
                });
            }
            log.debug('before set item lineCount', customRecord.getLineCount({
                sublistId: 'item'
            }))
            log.debug('items', items)
            items.map(function (line) {
                log.debug('line', line);
                try {
                    // customRecord.selectLine({ sublistId: 'item', line: line.line });
                    customRecord.selectNewLine({
                        sublistId: 'item'
                    });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: line.item_id
                    });
                    // customRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'povendor', value: line.othervendor });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: line.quantity
                    });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedrate',
                        value: line.estimatePrice
                    });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedamount',
                        value: line.estimateAmount
                    });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'expectedreceiptdate',
                        value: line.preReceiptDate
                    });
                    for (var m = 0; m < itemResultArr.length; m++) {
                        var itemId = itemResultArr[m].getValue('internalid');
                        var description = itemResultArr[m].getValue('description');
                        if (itemId == line.item_id) {
                            customRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                value: description
                            }); //说明
                        }
                    }
                    customRecord.commitLine({
                        sublistId: 'item'
                    });
                } catch (error) {
                    log.debug('error', error);
                }
            });
            log.debug('after set item lineCount', customRecord.getLineCount({
                sublistId: 'item'
            }))
            var requisitionRecId = customRecord.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            objRecord.setValue({
                fieldId: 'custrecord_pr_bi_wether_to_be_pr',
                value: true
            });
            // TOTO 若要设置请购单链接
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_pr_batch_import_link',
                fieldId: 'custrecord_pr_batch_import_link_po',
                value: requisitionRecId,
                line: 0
            });
            var batchImportNewId = objRecord.save();
            // var receiptId = setSublistValueToRecord(customRecord, objRecord, itemResultArr);
            return requisitionRecId;
        }

        /**
         * 
         * @param {*} customRecord 
         * @param {*} objRecord 
         */
        function setSublistValueToRecord(customRecord, objRecord, itemResultArr) {
            log.debug('setSublistValueToRecord', 'setSublistValueToRecord');
            log.debug('customRecord', customRecord)
            var objSublist = objRecord.getSublist({
                sublistId: 'recmachcustrecord_pr_batch_import_link'
            }); //load出来的对象
            var lineCount = objRecord.getLineCount({
                sublistId: 'recmachcustrecord_pr_batch_import_link'
            });
            log.debug('lineCount', lineCount);
            var itemSublist = customRecord.getSublist({
                sublistId: 'item'
            });
            for (var x = 0; x < lineCount; x++) {
                try {
                    customRecord.selectNewLine({
                        sublistId: 'item'
                    });
                    var sku = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_item',
                        line: x
                    }); //货品
                    log.debug('sku', sku)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: sku
                    }); //设置货品
                    var othervendor;
                    search.create({
                        type: 'item',
                        filters: [{
                            name: 'internalid',
                            operator: 'is',
                            values: sku
                        }],
                        columns: [{
                            name: 'othervendor'
                        }]
                    }).run().each(function (rec) {
                        othervendor = rec.getValue('othervendor');
                    })
                    log.debug('othervendor', othervendor);
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'povendor',
                        value: othervendor
                    }); //设置货品供应商
                    for (var m = 0; m < itemResultArr.length; m++) {
                        var itemId = itemResultArr[m].getValue('internalid');
                        var description = itemResultArr[m].getValue('description');
                        if (itemId == sku) {
                            log.debug('description', description);
                            customRecord.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'description',
                                value: description
                            }); //说明
                        }
                    }
                    var quantity = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_quantity',
                        line: x
                    }); //数量
                    log.debug('quantity', quantity)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: quantity
                    });
                    var estimatePrice = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_est_value',
                        line: x
                    }); //估计单价
                    log.debug('estimatePrice', estimatePrice)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedrate',
                        value: estimatePrice
                    });
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        value: estimatePrice
                    });
                    var estimateAmount = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_est_amount',
                        line: x
                    }); //估计金额
                    log.debug('estimateAmount', estimateAmount)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedamount',
                        value: estimateAmount
                    });
                    //------------------------以上为必须输入的内容
                    // var vendorName = objRecord.getSublistValue({ sublistId: 'recmachcustrecord_pr_batch_import_link', fieldId: 'custrecord_pr_batch_import_vendor_name', line: x });//供应商
                    // if (vendorName != null && vendorName != '') {
                    //     customRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'povendor', value: vendorName });
                    // }
                    var preReceiptDate = objRecord.getSublistValue({
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_bi_pre_reciept_date',
                        line: x
                    }); //预计收货日期
                    log.debug('preReceiptDate', preReceiptDate)
                    if (preReceiptDate != null && preReceiptDate != '') {
                        customRecord.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'expectedreceiptdate',
                            value: preReceiptDate
                        });
                    }

                    log.debug(1)
                    customRecord.commitLine({
                        sublistId: 'item'
                    });
                    log.debug(2)
                } catch (err) {
                    throw "Item Line Error: " + err;
                }

            }
            var requisitionRecId = customRecord.save();
            objRecord.setValue({
                fieldId: 'custrecord_pr_bi_wether_to_be_pr',
                value: true
            });


            // TOTO 若要设置请购单链接
            objRecord.setSublistValue({
                sublistId: 'recmachcustrecord_pr_batch_import_link',
                fieldId: 'custrecord_pr_batch_import_link_po',
                value: requisitionRecId,
                line: 0
            });

            var batchImportNewId = objRecord.save();
            return requisitionRecId;
        }

        function searchAllChoosedItem(data) {
            var columns = ['internalid', {
                join: 'custrecord_pr_batch_import_link',
                name: 'custrecord_pr_batch_import_item'
            }];
            var filters = [];
            filters.push(search.createFilter({
                name: 'internalid',
                operator: 'anyof',
                values: data
            }));
            var batchImportSearch = search.create({
                type: 'customrecord_pr_batch_import_headline',
                title: '查询所有未转换的货品',
                columns: columns,
                filters: filters
            });
            var batchImportItemArr = [];
            batchImportSearch.run().each(function (result) {
                var item = result.getValue({
                    join: 'custrecord_pr_batch_import_link',
                    name: 'custrecord_pr_batch_import_item'
                });
                batchImportItemArr.push(item);
                return true;
            });
            var itemColumns = ['description', 'internalid'];
            var itemFilters = [];
            itemFilters.push(search.createFilter({
                name: 'internalid',
                operator: 'anyof',
                values: batchImportItemArr
            }));
            var itemSearch = search.create({
                type: 'item',
                title: '查询所有的货品详情',
                columns: itemColumns,
                filters: itemFilters
            });
            var itemResultArr = [];
            itemSearch.run().each(function (result) {
                log.error({
                    title: '货品最终结果',
                    details: JSON.stringify(result)
                });
                itemResultArr.push(result);
                return true;
            });
            return itemResultArr;
        }

        /**
         * 转换成系统标准的时间
         * @param {*} date 
         */
        function changeToFormatDate(date) {
            var datetime = date.getTime();
            var returnDate = moment(datetime).format(dateFormat);
            return returnDate;
        }


        /**
         * 预估需求日期
         * @param {*} action 
         * @param {*} demandDate 
         * @param {*} purchaseadvance 
         * @param {*} logisticsadvance 
         * @param {*} custitem_days 
         * @param {*} vc_fba 
         * @param {*} shiftDays 
         * @param {*} special_days 
         * @param {*} dateFormat 
         */
        function getDemandDate(action, demandDate, purchaseadvance, logisticsadvance, custitem_days, vc_fba, shiftDays,
            special_days, dateFormat) {
            var date = moment(format.parse({
                value: demandDate,
                type: format.Type.DATE
            })).format('YYYY/MM/DD');
            var onedate = new Date(date);
            var d = onedate.getTime();
            if (action == 'supply') { // 预计下单时间
                d = +d - 1000 * 60 * 60 * 24 * purchaseadvance;
                for (var index = 0; index < 7; index++) {
                    onedate = new Date(d);
                    if (onedate.getDay() != 6 && onedate.getDay() != 7) {
                        break;
                    } else {
                        d = +d - 1000 * 60 * 60 * 24
                    }
                }
            } else if (action == 'shipment') { // 预计发货时间
                d = +d - 1000 * 60 * 60 * 24 * (logisticsadvance + special_days);
                if (vc_fba == 'VC') {
                    d = +d - 1000 * 60 * 60 * 24 * custitem_days;
                }
                var daysShift, rd;
                // console.log(new Date(d));
                for (var index = 0; index < shiftDays.length; index++) {
                    if (!daysShift || (daysShift && shiftDays[index].days > daysShift)) {
                        var startdateStr = moment(format.parse({
                            value: shiftDays[index].start_time,
                            type: format.Type.DATE
                        })).format('YYYY/MM/DD');
                        var startdate = new Date(startdateStr);
                        var enddateStr = moment(format.parse({
                            value: shiftDays[index].end_time,
                            type: format.Type.DATE
                        })).format('YYYY/MM/DD');
                        var enddate = new Date(enddateStr);
                        var rrd = d - 1000 * 60 * 60 * 24 * (shiftDays[index].days + shiftDays[index].vcdays);
                        var ddate = new Date(rrd);
                        // console.log(startdate + ' == ' + ddate + ' == ' + enddate + ' == ' + (startdate <= ddate && ddate <= enddate));
                        if (startdate <= ddate && ddate <= enddate) {
                            rd = rrd;
                            daysShift = shiftDays[index].days;
                        }
                    }
                }
                if (daysShift) {
                    d = rd;
                }
                // console.log(new Date(d));
                for (var index = 0; index < 7; index++) {
                    onedate = new Date(d);
                    if (onedate.getDay() == 3) {
                        break;
                    } else {
                        d = +d - 1000 * 60 * 60 * 24
                    }
                }
            }
            d = new Date(d);
            var now = new Date();
            // 预计下单时间 或 预计发运时间 早于当天日期，提示信息
            if (d <= now) {
                if (action == 'supply') {
                    log.error('预计下单时间早于当前时间，请注意');
                } else {
                    log.error('预计发运时间早于当前时间，请注意');
                }
            }
            var timeOne = moment(d.getTime()).format(dateFormat);
            return timeOne;
        }

        return {
            onRequest: onRequest
        }
    });