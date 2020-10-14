/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/ui/serverWidget', 'N/format', 'N/record'],
    function (search, serverWidget, format, record) {

        function onRequest(ctx) {
            var response = ctx.response; //"type":"http.ServerResponse",
            var request = ctx.request;
            var method = request.method; //Get
            var params = request.parameters; //6188472-sb1,脚本id
            //在方法中去做UI的初始化并判断GET/POST
            showResult(method, params, response);
        }

        function showResult(method, params, response) {
            var form = initUI(); //渲染查询条件UI界面
            //设置查询参数默认值，如有参数传入查询参数
            form.updateDefaultValues({
                custpage_vendor_s: params.custpage_vendor_s,
                custpage_start_date_s: params.custpage_start_date_s,
                custpage_end_date_s: params.custpage_end_date_s
            });
            if (method == 'GET') {
                try {
                    params.custpage_now_page = 1;
                    form = getSearchData(form, params);
                } catch (error) {
                    log.debug('error', JSON.stringify(error));
                }
            } else {
                form = getSearchData(form, params);
            }
            response.writePage(form);
        }

        /**
         * 查询逻辑
         * @param form 
         * @param params 
         * @returns
         */
        function getSearchData(form, params) {
            log.error("getSearchData", JSON.stringify(form) + '-' + JSON.stringify(params));
            var nowPage = params.custpage_select_page ? params.custpage_select_page : 1;
            var pageSize = params.custpage_page_size ? params.custpage_page_size : 20; // 每页数量
            var vendor_s = params.custpage_vendor_s; // vendor供应商
            var start_date_s = params.custpage_start_date_s;
            var end_date_s = params.custpage_end_date_s;
            var rsJson = getResult(pageSize, nowPage, vendor_s, start_date_s, end_date_s); //查询结果
            var result = rsJson.result;
            var totalCount = rsJson.totalCount;
            var pageCount = rsJson.pageCount;
            createLineData(form, result); //创建行数据
            setPageInfo(form, nowPage, totalCount, pageCount, pageSize, result);
            return form;
        }

        /**
         * 查询结果
         * @param {*} pageSize 
         * @param {*} nowPage 
         * @param {*} po_s 
         * @param {*} vendor_s 
         */
        function getResult(pageSize, nowPage, vendor_s, start_date_s, end_date_s) {
            var rsJson = {};
            var skus = [];
            var filters = [];
            var subsidiary, currency, poBill;
            if (vendor_s) {
                filters.push({
                    name: 'internalid',
                    join: 'custrecord_supplier',
                    operator: 'is',
                    values: vendor_s
                });
            }
            if (start_date_s) {
                filters.push({
                    name: 'custrecord_delivery_date',
                    operator: 'within',
                    values: [start_date_s, end_date_s]
                });
            }
            filters.push({
                name: 'custrecord_delivery_order_status',
                operator: 'is',
                values: '4'
            });
            filters.push({
                name: 'custrecord_delivery_bill',
                operator: 'ISEMPTY'
            });
            var lnSearch = search.create({
                type: 'customrecord_dps_delivery_order',
                filters: filters,
                columns: [
                    'internalid', 'custrecord_dps_warehous_date', 'custrecord_delivery_amount', 'custrecord_purchase_order_no', 'custrecord_supplier',
                    {
                        name: 'entityid',
                        join: 'custrecord_supplier'
                    }
                ]
            });
            var pageData = lnSearch.runPaged({
                pageSize: pageSize
            });
            var totalCount = pageData.count; //总数
            var pageCount = pageData.pageRanges.length; //页数
            log.error('pageData', pageData);
            if (totalCount > 0) {
                if (nowPage > pageCount) {
                    nowPage = 1
                }
                pageData.fetch({
                    index: Number(nowPage - 1)
                }).data.forEach(function (result) {
                    log.error("result2", result)
                    if (result.getValue('custrecord_purchase_order_no')) {
                        var poRec = record.load({
                            type: 'purchaseorder',
                            id: result.getValue('custrecord_purchase_order_no')
                        });
                        subsidiary = poRec.getValue('subsidiary');
                        currency = poRec.getText('currency');
                        currency_id = poRec.getValue('currency');
                        log.error('result', result);
                        skus.push({
                            lnid: result.getValue('internalid'),
                            subsidiary: subsidiary,
                            entity_name: result.getValue({
                                name: 'entityid',
                                join: 'custrecord_supplier'
                            }),
                            currency: currency,
                            currency_id: currency_id,
                            entity: result.getValue('custrecord_supplier'),
                            total: result.getValue('custrecord_delivery_amount'),
                            date: result.getValue('custrecord_dps_warehous_date')
                        });
                    }
                    log.error('skus', skus);
                });
            }
            rsJson.result = skus;
            rsJson.totalCount = totalCount;
            rsJson.pageCount = pageCount;
            log.error('getResult rsJson', JSON.stringify(rsJson));
            return rsJson;
        }

        /**
         * 渲染查询结果至页面
         */
        function initUI() {
            var form = serverWidget.createForm('对交货单开单');
            form.addFieldGroup({
                id: 'custpage_search_group',
                label: '查询条件'
            });
            form.addField({
                id: 'custpage_vendor_s',
                type: serverWidget.FieldType.SELECT,
                source: 'vendor',
                label: '供应商编号',
                container: 'custpage_search_group'
            });
            form.addField({
                id: 'custpage_start_date_s',
                type: serverWidget.FieldType.DATE,
                label: '入库时间从',
                container: 'custpage_search_group'
            });
            form.addField({
                id: 'custpage_end_date_s',
                type: serverWidget.FieldType.DATE,
                label: '入库时间至',
                container: 'custpage_search_group'
            });
            form.addSubtab({
                id: 'custpage_sub_sku_tab',
                label: '交货单搜索结果'
            });
            var sku_sublist = form.addSublist({
                id: 'custpage_sku_sublist',
                type: serverWidget.SublistType.LIST,
                label: '交货单明细',
                tab: 'custpage_sub_sku_tab'
            });
            sku_sublist.addMarkAllButtons();
            sku_sublist.addField({
                id: 'custpage_checkbox',
                type: serverWidget.FieldType.CHECKBOX,
                label: '勾选框'
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln',
                type: serverWidget.FieldType.SELECT,
                source: 'customrecord_dps_delivery_order',
                label: '交货单'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_subsidiary',
                type: serverWidget.FieldType.SELECT,
                source: 'subsidiary',
                label: '交易主体'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_vendor',
                type: serverWidget.FieldType.TEXT,
                label: '供应商'
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_vendor_no',
                type: serverWidget.FieldType.TEXT,
                label: '供应商编号'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_amount',
                type: serverWidget.FieldType.FLOAT,
                label: '订单金额'
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_currency',
                type: serverWidget.FieldType.TEXT,
                label: '货币'
            });
            sku_sublist.addField({
                id: 'custpage_sub_ln_currency_id',
                type: serverWidget.FieldType.TEXT,
                label: '货币编号'
            }).updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });;
            sku_sublist.addField({
                id: 'custpage_sub_ln_date',
                type: serverWidget.FieldType.DATE,
                label: '入库时间'
            });
            initPageChoose(form);
            // initPageChoose(form);
            form.addSubmitButton({
                label: '查询'
            });
            form.addButton({
                id: 'custpage_create_bill',
                label: '生成账单',
                functionName: 'createBill()'
            }); //点击生成使用对应cs脚本
            form.clientScriptModulePath = './ln_bill_create_cs.js';
            return form;
        }


        /**
         * 创建行数据
         * @param {*} form 
         * @param {*} result 
         */
        function createLineData(form, result) {
            var sku_sublist = form.getSublist({
                id: 'custpage_sku_sublist'
            });
            result.map(function (d, line) {
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln',
                    value: d.lnid,
                    line: line
                });
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_subsidiary',
                    value: d.subsidiary,
                    line: line
                });
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_vendor',
                    value: d.entity_name,
                    line: line
                });
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_vendor_no',
                    value: d.entity,
                    line: line
                });
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_amount',
                    value: d.total,
                    line: line
                });
                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_currency',
                    value: d.currency,
                    line: line
                });

                sku_sublist.setSublistValue({
                    id: 'custpage_sub_ln_currency_id',
                    value: d.currency_id,
                    line: line
                })
                if (d.date) {
                    sku_sublist.setSublistValue({
                        id: 'custpage_sub_ln_date',
                        value: d.date,
                        line: line
                    });
                }
            });
        }

        /**
         * 在界面显示：数据选择数据组（包括数据选择列表、当前页/总页数）
         * @param form
         * @param hidePageSelect 是否隐藏数据选择select
         * @returns
         */
        function initPageChoose(form, hidePageSelect) {
            form.addFieldGroup({
                id: 'custpage_page_group',
                label: '数据选择'
            });
            if (hidePageSelect != 'Y') {
                form.addField({
                    id: 'custpage_select_page',
                    type: serverWidget.FieldType.SELECT,
                    label: '数据选择',
                    container: 'custpage_page_group'
                });
            }
            form.addField({
                    id: 'custpage_total_count',
                    type: serverWidget.FieldType.INTEGER,
                    label: '总行数',
                    container: 'custpage_page_group'
                })
                .updateDisplaySize({
                    width: 40,
                    height: 10
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                })
                .updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });
            form.addField({
                    id: 'custpage_total_page',
                    type: serverWidget.FieldType.INTEGER,
                    label: '总页数',
                    container: 'custpage_page_group'
                })
                .updateDisplaySize({
                    width: 40,
                    height: 10
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
            form.addField({
                    id: 'custpage_page_size',
                    type: serverWidget.FieldType.SELECT,
                    label: '每页条数',
                    container: 'custpage_page_group'
                })
                .updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });
            form.addField({
                    id: 'custpage_now_page',
                    type: serverWidget.FieldType.INTEGER,
                    label: '当前页',
                    container: 'custpage_page_group'
                })
                .updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
            form.addField({
                    id: 'custpage_now_total_page',
                    type: serverWidget.FieldType.TEXT,
                    label: '当前页/总页数',
                    container: 'custpage_page_group'
                })
                .updateDisplaySize({
                    width: 10,
                    height: 10
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                })
                .updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });
        }

        /**
         * 设置数据选择列表、当前页、总页数到界面
         * 
         * @param form
         * @param nowPage
         * @param totalCount
         * @param pageSize
         * @param hidePageSelect 是否隐藏数据选择select
         * @returns
         */
        function setPageInfo(form, nowPage, totalCount, pageCount, pageSize, hidePageSelect) {
            log.audit('setPageInfo1', form + '-' + nowPage + '-' + totalCount + '-' + pageCount + '-' + pageSize + '-' + hidePageSelect)
            form.getField({
                id: 'custpage_total_page'
            }).defaultValue = pageCount;
            form.getField({
                id: 'custpage_now_page'
            }).defaultValue = nowPage;
            form.getField({
                id: 'custpage_now_total_page'
            }).defaultValue = (nowPage == 0 ? 1 : nowPage) + '/' + pageCount;
            form.getField({
                id: 'custpage_total_count'
            }).defaultValue = totalCount;

            if (hidePageSelect != 'Y') {
                var selectPageField = form.getField({
                    id: 'custpage_select_page'
                });
                var page = Math.ceil(totalCount / pageSize);
                for (var i = 1; i <= page; i++) {
                    var selectedFlag;
                    if (nowPage == i) {
                        selectedFlag = true;
                    } else {
                        selectedFlag = false;
                    }
                    var startStr = (i - 1) * pageSize + 1;
                    var endStr = i * pageSize;
                    selectPageField.addSelectOption({
                        value: i,
                        text: startStr + '-' + endStr + '行',
                        isSelected: selectedFlag
                    });
                }
            }
            var pageSizeField = form.getField({
                id: 'custpage_page_size'
            });
            pageSizeField.addSelectOption({
                value: 10,
                text: 10,
                isSelected: pageSize == 10 ? true : false
            });
            pageSizeField.addSelectOption({
                value: 20,
                text: 20,
                isSelected: pageSize == 20 ? true : false
            });
            pageSizeField.addSelectOption({
                value: 50,
                text: 50,
                isSelected: pageSize == 50 ? true : false
            });
            pageSizeField.addSelectOption({
                value: 100,
                text: 100,
                isSelected: pageSize == 100 ? true : false
            });
            pageSizeField.addSelectOption({
                value: 500,
                text: 500,
                isSelected: pageSize == 500 ? true : false
            });
        }
        return {
            onRequest: onRequest
        }
    })