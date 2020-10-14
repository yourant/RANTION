/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 11:34:43
 * @LastEditTime   : 2020-10-13 15:32:59
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/log', 'N/ui/serverWidget', 'N/runtime'], function(record, search, log, serverWidget, runtime) {

    function onRequest(context) {

        var userObj = runtime.getCurrentUser();

        // if (userObj.id == 911) {
        try {
            var request = context.request;
            var response = context.response;
            var parameters = request.parameters;
            var form = initUI();

            var param = getParams(parameters, form);

            var subShowId = form.getSublist({
                id: 'sublist_show_id'
            });
            var lineNumber = parameters.custpage_li_per_page;
            log.audit('lineNumber', lineNumber);

            if (!lineNumber) {
                lineNumber = 50;
            }

            log.audit('lineNumber', lineNumber);

            var nowPage = parameters.custpage_li_pages;

            var resArr;
            resArr = searchResult(param, lineNumber, nowPage);


            var resultArr = resArr.result,
                totalCount = resArr.totalCount,
                pageCount = resArr.pageCount,
                filter = resArr.filter;

            log.audit('数据长度 resultArr', resultArr.length);

            log.audit("总数量 totalCount", totalCount);
            log.audit("总页数 pageCount", pageCount);

            var selectpages = form.addField({
                id: 'custpage_li_pages',
                type: serverWidget.FieldType.SELECT,
                label: '选择页数',
                container: 'fieldgroupid'
            });

            var pages = form.addField({
                id: 'custpage_li_per_page',
                type: serverWidget.FieldType.SELECT,
                label: '每页数量',
                container: 'fieldgroupid'
            });

            var pagesObj = {
                20: 20,
                50: 50,
                100: 100,
                500: 500
            }

            if (pageCount) {
                for (var i = 0, z = i + 1; i < pageCount; i++, z = i + 1) {
                    var temp = selectpages.addSelectOption({
                        value: z,
                        text: z + "/" + pageCount
                    });
                }

                for (var i in pagesObj) {
                    if (i == lineNumber) {
                        pages.addSelectOption({
                            value: i,
                            text: pagesObj[i],
                            isSelected: true
                        });
                    } else {
                        pages.addSelectOption({
                            value: i,
                            text: pagesObj[i]
                        });
                    }
                }
            } else {
                selectpages.addSelectOption({
                    value: '',
                    text: ''
                });
                // pages.addSelectOption({
                //     value: "",
                //     text: ""
                // });
            }

            var temp = {
                custpage_li_total: totalCount,
                custpage_li_pages: nowPage,
            }
            form.updateDefaultValues(temp);

            var _resultArr = resultArr.slice(0, lineNumber)
            log.debug('截取数据长度', _resultArr.length)

            var curr_qty = form.addField({
                id: 'custpage_li_currentquantity',
                type: serverWidget.FieldType.INTEGER,
                label: '本页数量',
                container: 'fieldgroupid'
            });
            curr_qty.defaultValue = _resultArr.length;

            curr_qty.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.DISABLED
            });

            setSublistValue(subShowId, _resultArr);

            context.response.writePage({
                pageObject: form
            });

        } catch (error) {
            log.error('出错了', error);
            context.response.writeLine("出错了\n\n" + JSON.stringify(error))
        }

    }


    /**
     * 获取过滤条件
     * @param {Object} params
     * @param {Object} form
     */
    function getParams(params, form) {

        var date = new Date();
        var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        var fmt = "yyyy-M-d";
        if (!params.cs_op && !params.custpage_li_start_date && !params.custpage_li_end_date) { // 未选择 任何日期
            params.custpage_li_start_date = _li_dateFormat(firstDay, fmt);
            params.custpage_li_end_date = _li_dateFormat(lastDay, fmt);
        }

        var fieldArr = ["custpage_li_location", "custpage_li_sku", "custpage_li_start_date", "custpage_li_end_date", "custpage_li_pages", "custpage_li_per_page"];

        for (var i in params) {
            if (fieldArr.indexOf(i) > -1) {
                fieldArr.map(function(field) {
                    if (!params[field]) {
                        delete params[field]
                    }
                })
            } else {
                delete params[i]
            }
        }

        log.debug('params', params)
        form.updateDefaultValues(params);

        return params;
    }


    /**
     * 初始化页面
     */
    function initUI() {

        var form = serverWidget.createForm({
            title: 'Amazon & NS月度库存差异表'
        });
        form.clientScriptModulePath = './dps.li.inv.adjust.cs'

        form.addButton({
            id: 'button_inv_adj_id',
            label: '生成库存调整单',
            functionName: "createInventoryAdjust()"
        });

        var fieldgroup = form.addFieldGroup({
            id: 'fieldgroupid',
            label: '查询条件'
        });
        var location = form.addField({
            id: 'custpage_li_location',
            type: serverWidget.FieldType.SELECT,
            label: '仓库',
            source: 'location',
            container: 'fieldgroupid'
        });

        var sku = form.addField({
            id: 'custpage_li_sku',
            type: serverWidget.FieldType.SELECT,
            label: 'SKU',
            source: 'item',
            container: 'fieldgroupid'
        });

        var start_date = form.addField({
            id: 'custpage_li_start_date',
            type: serverWidget.FieldType.DATE,
            label: '起始日期',
            container: 'fieldgroupid'
        });
        var end_date = form.addField({
            id: 'custpage_li_end_date',
            type: serverWidget.FieldType.DATE,
            label: '结束日期',
            container: 'fieldgroupid'
        });

        var total = form.addField({
            id: 'custpage_li_total',
            type: serverWidget.FieldType.INTEGER,
            label: '总行数',
            container: 'fieldgroupid'
        });

        total.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        total.defaultValue = 0;

        var sublist = form.addSublist({
            id: 'sublist_show_id',
            type: serverWidget.SublistType.LIST,
            label: "\u8be6\u60c5"
        });

        sublist.addMarkAllButtons();
        sublist.addRefreshButton();

        sublist.addField({
            id: 'custpage_label_checkbox',
            type: serverWidget.FieldType.CHECKBOX,
            label: '勾选'
        });

        var sub_location = sublist.addField({
            id: 'custpage_label_location',
            type: serverWidget.FieldType.SELECT,
            source: 'location',
            label: '仓库'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublist.addField({
            id: 'custpage_label_sku',
            type: serverWidget.FieldType.SELECT,
            source: 'item',
            label: 'SKU'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        sublist.addField({
            id: 'custpage_label_msku',
            type: serverWidget.FieldType.TEXT,
            label: 'MSKU'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });

        sublist.addField({
            id: 'custpage_label_fnsku',
            type: serverWidget.FieldType.TEXT,
            label: 'FNSKU'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        sublist.addField({
            id: 'custpage_label_deparment',
            type: serverWidget.FieldType.SELECT,
            source: "deparment",
            label: '部门'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.HIDDEN
            // displayType: serverWidget.FieldDisplayType.INLINE
        });

        sublist.addField({
            id: 'custpage_label_amazon_qty',
            type: serverWidget.FieldType.INTEGER,
            label: 'Amazon 结余量'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        sublist.addField({
            id: 'custpage_label_ns_qty',
            type: serverWidget.FieldType.INTEGER,
            label: 'NS 结余量'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        sublist.addField({
            id: 'custpage_label_inv_diff_qty',
            type: serverWidget.FieldType.INTEGER,
            label: '库存差异'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        sublist.addField({
            id: 'custpage_label_inv_moninv_month',
            type: serverWidget.FieldType.DATE,
            label: '时间'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        sublist.addField({
            id: 'custpage_label_inv_locationaveragecost',
            type: serverWidget.FieldType.TEXT,
            label: '平均成本'
        }).updateDisplayType({
            // displayType: serverWidget.FieldDisplayType.DISABLED
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        sublist.addField({
            id: 'custpage_label_inv_recid_arr',
            type: serverWidget.FieldType.TEXTAREA,
            label: '对应的记录 Info'
        }).updateDisplayType({
            // displayType: serverWidget.FieldDisplayType.DISABLED
            displayType: serverWidget.FieldDisplayType.HIDDEN
        });
        return form;
    }

    var sublistField = ["custpage_label_account", "custpage_label_location", "custpage_label_sku", "custpage_label_msku", "custpage_label_amazon_qty", "custpage_label_ns_qty", "custpage_label_inv_diff_qty"]

    var _sublistFields = [
        "custpage_label_checkbox", // 勾选
        "custpage_label_account", // 店铺
        "custpage_label_location", // 地点
        "custpage_label_sku", // 货品
        "custpage_label_msku", // msku
        "custpage_label_deparment", //部门
        "custpage_label_brand", // 品牌
        "custpage_label_rec_id", // 月度库存记录 ID
        "custpage_label_center_id", //仓库中心
        "custpage_label_amazon_qty", // Amazon 数量
        "custpage_label_ns_qty", // NS 数量
        "custpage_label_inv_diff_qty", // 差异数量
        "custpage_label_inv_moninv_month", // 月度时间
        "custpage_label_inv_subsidiary" // 子公司
    ]

    /**
     * 设置子列表的值
     * @param {*} sublist
     */
    function setSublistValue(sublist, resultArr) {

        resultArr.map(function(result, key) {
            if (result.custpage_label_account) {
                sublist.setSublistValue({
                    id: 'custpage_label_account',
                    value: result.custpage_label_account,
                    line: key
                }); // 店铺
            }
            if (result.custpage_label_inv_locationaveragecost) {
                sublist.setSublistValue({
                    id: 'custpage_label_inv_locationaveragecost',
                    value: result.custpage_label_inv_locationaveragecost,
                    line: key
                }); // 平均成本
            }
            if (result.custpage_label_inv_moninv_month) {
                sublist.setSublistValue({
                    id: 'custpage_label_inv_moninv_month',
                    value: result.custpage_label_inv_moninv_month,
                    line: key
                }); // 时间
            }
            if (result.custpage_label_location) {
                sublist.setSublistValue({
                    id: 'custpage_label_location',
                    value: result.custpage_label_location,
                    line: key
                }); // 仓库
            }
            if (result.custpage_label_account) {
                sublist.setSublistValue({
                    id: 'custpage_label_account',
                    value: result.custpage_label_account,
                    line: key
                }); // 仓库
            }

            if (result.custpage_label_sku) {
                sublist.setSublistValue({
                    id: 'custpage_label_sku',
                    value: result.custpage_label_sku,
                    line: key
                }); // SKU
            }

            if (result.custpage_label_msku) {
                sublist.setSublistValue({
                    id: 'custpage_label_msku',
                    value: result.custpage_label_msku,
                    line: key
                }); // MSKU
            }
            if (result.custpage_label_rec_id) {
                sublist.setSublistValue({
                    id: 'custpage_label_rec_id',
                    value: result.custpage_label_rec_id,
                    line: key
                }); // MSKU
            }
            if (result.custpage_label_deparment) {
                sublist.setSublistValue({
                    id: 'custpage_label_deparment',
                    value: result.custpage_label_deparment,
                    line: key
                }); // 部门
            }

            if (result.custpage_label_fnsku) {
                sublist.setSublistValue({
                    id: 'custpage_label_fnsku',
                    value: result.custpage_label_fnsku,
                    line: key
                }); // FNSKU
            }
            if (result.custpage_label_brand) {
                sublist.setSublistValue({
                    id: 'custpage_label_brand',
                    value: result.custpage_label_brand,
                    line: key
                }); // 品牌
            }
            if (result.custpage_label_center_id) {
                sublist.setSublistValue({
                    id: 'custpage_label_center_id',
                    value: result.custpage_label_center_id,
                    line: key
                }); // centerId
            }
            if (result.custpage_label_amazon_qty || result.custpage_label_amazon_qty == 0) {
                sublist.setSublistValue({
                    id: 'custpage_label_amazon_qty',
                    value: (result.custpage_label_amazon_qty).toFixed(0),
                    line: key
                }); // Amazon 入库量
            }

            if (result.custpage_label_ns_qty || result.custpage_label_ns_qty == 0) {
                sublist.setSublistValue({
                    id: 'custpage_label_ns_qty',
                    value: result.custpage_label_ns_qty,
                    line: key
                }); // NS 入库量

            }
            if (result.custpage_label_inv_diff_qty || result.custpage_label_inv_diff_qty == 0) {
                sublist.setSublistValue({
                    id: 'custpage_label_inv_diff_qty',
                    value: (result.custpage_label_inv_diff_qty).toFixed(0),
                    line: key
                }); // 差异数量
            }
            if (result.custpage_label_inv_recid_arr) {
                sublist.setSublistValue({
                    id: 'custpage_label_inv_recid_arr',
                    value: result.custpage_label_inv_recid_arr,
                    line: key
                }); // 差异数量
            }
        });

        return sublist;
    }

    /**
     *
     * @param {Object} param
     * @param {Number} _sizePage
     * @param {Number} _nowPage
     */
    function searchResult(param, _sizePage, _nowPage) {

        if (!_nowPage) {
            _nowPage = 1;
        }

        var filter_amazon = [];

        filter_amazon.push(['custrecord_moninv_adjustment_order', 'is', false]);
        filter_amazon.push('and', ['custrecord_moninv_end_quantity', 'notequalto', ['0']]);

        // filter.push({
        //     name: 'custrecord_moninv_adjustment_order',
        //     operator: 'is',
        //     values: false
        // });
        // filter.push({
        //     name: "custrecord_moninv_end_quantity",
        //     operator: "notequalto",
        //     rightparens: 0,
        //     values: ["0"]
        // })

        if (param.custpage_li_start_date && param.custpage_li_end_date) {
            filter_amazon.push('and', ['custrecord_moninv_month', 'within', [param.custpage_li_start_date, param.custpage_li_end_date]])
            // filter.push({ name: "custrecord_moninv_month", operator: "within", values: [param.custpage_li_start_date, param.custpage_li_end_date] });
        } else if (param.custpage_li_start_date && !param.custpage_li_end_date) {
            filter_amazon.push('and', ['custrecord_moninv_month', "onorafter", [param.custpage_li_start_date]])
            // filter.push({ name: "custrecord_moninv_month", operator: "onorafter", values: [param.custpage_li_start_date] });
        } else if (!param.custpage_li_start_date && param.custpage_li_end_date) {
            filter_amazon.push('and', ['custrecord_moninv_month', 'onorbefore', [param.custpage_li_end_date]])
            // filter.push({ name: "custrecord_moninv_month", operator: "onorbefore", values: [param.custpage_li_end_date] });
        }

        if (param.custpage_li_location) {
            filter_amazon.push('and', ['CUSTRECORD_MONINV_ACCOUNT.custrecord_aio_fbaorder_location', "anyof", param.custpage_li_location])
        }

        log.audit('月度库存 过滤器', filter_amazon);
        var amazonSearch = search.create({
            type: "customrecord_amazon_monthinventory_rep",
            filters: filter_amazon,
            columns: [
                // { name: "custrecord_aio_seller_id", join: "CUSTRECORD_MONINV_ACCOUNT", summary: "GROUP" }, // MWS Seller ID  0
                { name: "custrecord_aio_fbaorder_location", join: "CUSTRECORD_MONINV_ACCOUNT", summary: "GROUP" }, // 店铺仓库  1
                { name: "custrecord_moninv_month", summary: "GROUP", sort: "DESC" }, // 日期  2
                { name: "custrecord_moninv_fnsku", summary: "GROUP" }, // FNSKU  3
                { name: "custrecord_moninv_sku", summary: "GROUP" }, // MSKU  4
                { name: "custrecord_moninv_end_quantity", summary: "SUM" }, // Amazon 月末结余  5
            ]
        });

        var pageSize = _sizePage; //每页条数
        pageSize = 1000; //每页条数
        var ama_pageData = amazonSearch.runPaged({
            pageSize: pageSize
        });
        var ama_totalCount = ama_pageData.count; //总数
        var ama_pageCount = ama_pageData.pageRanges.length; //页数

        log.audit('搜索 月度库存报表 ama_totalCount', ama_totalCount);
        log.audit('搜索 月度库存报表 ama_pageCount', ama_pageCount);

        var amazon_result = new Array(); //结果

        var itemArr = [],
            rsJson = {};

        if (ama_totalCount > 0) {
            ama_pageData.fetch({
                index: Number(_nowPage - 1)
            }).data.forEach(function(ama) {
                amazon_result.push({
                    location: ama.getValue(ama.columns[0]),
                    custpage_label_inv_moninv_month: ama.getValue(ama.columns[1]),
                    fnsku: ama.getValue(ama.columns[2]),
                    msku: ama.getValue(ama.columns[3]),
                    custpage_label_msku: ama.getValue(ama.columns[3]),
                    end_qty: ama.getValue(ama.columns[4]),
                    custpage_label_amazon_qty: ama.getValue(ama.columns[4]),
                });
            });
        }

        log.debug('amazon_result length', amazon_result.length);
        log.debug('amazon_result length', amazon_result[0]);
        var mapping_filter = [];

        var temp_map_filter = [];

        if (param.custpage_li_sku) {
            temp_map_filter.push(["custrecord_ass_sku", "anyof", [param.custpage_li_sku]]);
        } else {
            temp_map_filter.push(["custrecord_ass_sku", "noneof", ["@NONE@"]]);
        }

        amazon_result.forEach(function(res, key) {
            if (key == 0) {
                mapping_filter.push([
                    ["custrecord_ass_account.custrecord_aio_fbaorder_location", "anyof", [res.location]],
                    "and",
                    ['name', "contains", [res.msku]]
                ]);
            } else {
                mapping_filter.push("or", [
                    ["custrecord_ass_account.custrecord_aio_fbaorder_location", "anyof", [res.location]],
                    "and",
                    ['name', "contains", [res.msku]]
                ])
            }
        });

        if (mapping_filter && mapping_filter.length > 0) {
            temp_map_filter.push("and", mapping_filter)
        }

        var map_result = search.create({
            type: "customrecord_aio_amazon_seller_sku",
            filters: temp_map_filter,
            columns: [
                { name: "custrecord_ass_sku", summary: "GROUP" }, // 货品,  0
                { name: "name", summary: "GROUP" }, // msku  1
                { name: "custrecord_ass_fnsku", summary: "GROUP" }, // fnku   2
                { name: "custrecord_aio_fbaorder_location", join: "custrecord_ass_account", summary: "GROUP" }, //FBA 仓库  3
            ]
        });

        var map_pageData = map_result.runPaged({
            pageSize: pageSize
        });

        // log.debug('map_pageData', map_pageData);
        var map_totalCount = map_pageData.count; //总数
        var map_pageCount = map_pageData.pageRanges.length; //页数
        log.audit('关联第二个表 map_totalCount', map_totalCount);
        log.audit('关联第二个表 map_pageCount', map_pageCount);

        var map_result = []; //结果

        var _temp_arr = new Array();

        var counter = 0;

        if (map_totalCount > 0) {
            map_pageData.fetch({
                index: 0
            }).data.forEach(function(map) {

                counter++;

                var itemId = map.getValue(map.columns[0]),
                    msku = map.getValue(map.columns[1]),
                    fnsku = map.getValue(map.columns[2]),
                    fba_location = map.getValue(map.columns[3]);

                _temp_arr.push({
                    itemId: itemId,
                    msku: msku,
                    fnsku: fnsku,
                    fba_location: fba_location
                });

                var temp_element = amazon_result.filter(function(a1) {
                    return a1.msku == msku && a1.location == fba_location
                });

                log.debug('temp_element', temp_element);
                temp_element.map(function(ele) {
                    var it = {
                        msku: msku,
                        itemId: itemId,
                        end_qty: ele.end_qty,
                        fba_location: fba_location,
                        custpage_label_amazon_qty: ele.end_qty,
                        custpage_label_msku: msku,
                        custpage_label_sku: itemId,
                        custpage_label_inv_moninv_month: ele.custpage_label_inv_moninv_month,
                        custpage_label_fnsku: fnsku,
                    }
                    map_result.push(it);
                });

            });
        }

        log.audit('counter', counter);

        log.debug('map_result length ', map_result.length);
        log.debug('第二个表关联的数据 ', map_result[0]);

        // {
        //     "msku":"HP110-AD-FR-FBA",
        //     "itemId":"2952",
        //     "end_qty":"1",
        //     "fba_location":"57",
        //     "custpage_label_amazon_qty":"1",
        //     "custpage_label_msku":"HP110-AD-FR-FBA",
        //     "custpage_label_sku":"2952",
        //     "custpage_label_inv_moninv_month":"2020-6-30",
        //     "custpage_label_fnsku":"X000UTOEU1"
        // }


        var new_map_arr = [];
        map_result.map(function(_res) {
            if (_res) {
                var ns_itemId = _res.itemId,
                    fba_location = _res.fba_location;
                var temp_total_ama = 0,
                    _msku, _month, _location, _itemId
                var temp_element = map_result.filter(function(a1) {
                    return a1.itemId == ns_itemId && a1.fba_location == fba_location
                });

                temp_element.map(function(_ele) {
                    if (_ele) {
                        _msku = _ele.custpage_label_msku;
                        _month = _ele.custpage_label_inv_moninv_month;
                        _location = _ele.fba_location;
                        _itemId = _ele.itemId;
                        temp_total_ama += Number(_ele.end_qty);
                        var index = getArrIndex(map_result, _ele);
                        delete map_result[index];
                    }
                })
                new_map_arr.push({
                    "msku": _msku,
                    "itemId": _itemId,
                    "end_qty": temp_total_ama,
                    "fba_location": _location,
                    "custpage_label_amazon_qty": temp_total_ama,
                    "custpage_label_msku": _msku,
                    "custpage_label_sku": _itemId,
                    "custpage_label_inv_moninv_month": _month,
                    "info": temp_element
                })
            }

        })

        log.debug("new_map_arr", new_map_arr[0]);

        var ns_filters = [];
        ns_filters.push(
            ["mainline", "is", false],
            "and",
            ["type", "anyof", ["ItemRcpt", "ItemShip", "InvAdjst"]],
            "and",
            ["account", "anyof", ["214"]],
            "and",
            ["createdfrom.intercotransaction", "anyof", ["@NONE@"]],
            "and",
            ["location.name", "contains", ["FBA"]]
        );


        ["custpage_li_location", "custpage_li_sku", "custpage_li_start_date", "custpage_li_end_date", "custpage_li_pages", "custpage_li_per_page"];

        // if (param.custpage_li_sku) {
        //     ns_filters.push("and",
        //         ["item", "anyof", param.custpage_li_sku]
        //     )
        // }
        // if (param.custpage_li_location) {
        //     ns_filters.push("and",
        //         ["location", "anyof", param.custpage_li_location])
        // }

        if (param.custpage_li_end_date) {
            ns_filters.push("and", ["trandate", "onorbefore", [param.custpage_li_end_date]]);
        }

        var temp_ns_filter = [];

        log.debug("NS  条件", new_map_arr);

        new_map_arr.map(function(map, key) {
            if (map.fba_location && map.itemId) {

                if (key == 0) {
                    temp_ns_filter.push(
                        [
                            ["location", "anyof", map.fba_location],
                            "and",
                            ["item", "anyof", map.itemId]
                        ]
                    );

                } else {
                    temp_ns_filter.push("or",
                        [
                            ["location", "anyof", map.fba_location],
                            "and",
                            ["item", "anyof", map.itemId]
                        ]
                    );
                }
            }
        });

        // 过滤器中存在不存在货品 或者 地点
        // if (!param.custpage_li_sku && !param.custpage_li_location) {
        // }

        if (temp_ns_filter.length) {
            ns_filters.push("and", temp_ns_filter);
        }

        log.audit("NS 结余过滤器", ns_filters);
        var ns_mySearch = search.create({
            type: "transaction",
            filters: ns_filters,
            columns: [
                { name: "location", summary: "GROUP", type: "select", label: "仓库" }, // 0
                { name: "item", summary: "GROUP", label: "SKU" }, // 1
                { name: "department", join: "item", summary: "MAX", type: "select", label: "部门" }, // 2
                { name: "quantity", summary: "SUM", type: "float", label: "结余数量" }, // 3
                // { name: "locationaveragecost", join: "item", summary: "MAX", label: "Location Average Cost" }, // 4
                // { name: "averagecost", join: "item", summary: "AVG", label: "Average Cost" }
            ]
        });

        var pageData = ns_mySearch.runPaged({
            pageSize: pageSize
        });
        var ns_totalCount = pageData.count; //总数
        var ns_pageCount = pageData.pageRanges.length; //页数

        log.audit('关联第三个表 总数 ns_totalCount', ns_totalCount);
        log.audit('关联第三个表 页数 ns_pageCount', ns_pageCount);

        var result = []; //结果

        var itemArr = [],
            itemObj = {};
        var temp_result = [];
        if (ns_totalCount > 0) {
            pageData.fetch({
                index: 0
                // index: Number(_nowPage - 1)
            }).data.forEach(function(rs) {

                var ns_itemId = rs.getValue(rs.columns[1]),
                    fba_location = rs.getValue(rs.columns[0]),
                    ns_quantity = rs.getValue(rs.columns[3]),
                    ns_locationaveragecost = 0,
                    // ns_locationaveragecost = rs.getValue(rs.columns[4]),
                    ns_deparment = rs.getValue(rs.columns[2])
                // ns_subsidiary = rs.getValue(rs.columns[6])

                log.debug('ns_itemId: ' + ns_itemId, "fba_location: " + fba_location + ',   ns_quantity: ' + ns_quantity);

                var temp_element = new_map_arr.filter(function(a1) {
                    // log.debug('a1.fba_location: ' + a1.itemId, "a1.fba_location: " + a1.fba_location)
                    return a1.itemId == ns_itemId && a1.fba_location == fba_location
                });

                log.debug('temp_element', temp_element)

                temp_element.map(function(ele) {
                    var it = {
                        custpage_label_location: fba_location, // 仓库
                        custpage_label_sku: ns_itemId, // 货品
                        custpage_label_ns_qty: ns_quantity, // NS 数量
                        custpage_label_amazon_qty: ele.end_qty, // Amazon 数量
                        custpage_label_msku: ele.msku, // MSKU
                        custpage_label_inv_diff_qty: Number(ele.end_qty) - Number(ns_quantity), // NS - Amazon 差异数量
                        custpage_label_inv_moninv_month: ele.custpage_label_inv_moninv_month, // 月度库存时间
                        custpage_label_inv_locationaveragecost: ns_locationaveragecost, // 平均成本
                        custpage_label_fnsku: ele.custpage_label_fnsku,
                        custpage_label_deparment: ns_deparment,
                        custpage_label_inv_recid_arr: JSON.stringify(ele.info)
                    };

                    temp_result.push(it);
                });

            });
        }

        var temp_result_arr = temp_result.filter(function(a1) {
            return a1.custpage_label_inv_diff_qty != 0
        });


        log.debug('temp_result 长度', temp_result[0]);
        log.debug('temp_result 长度', temp_result.length);

        log.debug('temp_result_arr 长度', temp_result_arr.length);

        rsJson.result = temp_result_arr;
        rsJson.totalCount = ns_totalCount;
        rsJson.totalCount = ama_totalCount;
        rsJson.pageCount = ns_pageCount;
        rsJson.pageCount = ama_pageCount;
        // rsJson.filter = temp_map_filter;
        return rsJson;

    }


    /**
     *
     * @param {Object} param
     * @param {number} _sizePage
     * @param {number} _nowPage
     */
    function searchResult_LI(param, _sizePage, _nowPage) {


        var rsJson = []; //结果

        if (!_nowPage) {
            _nowPage = 1;
        }

        // 先获取对应货品在 NS 的结余量

        var filter_1 = [];

        var ns_filters_1 = [];
        ns_filters_1.push(
            ["mainline", "is", false],
            "and",
            ["type", "anyof", ["ItemRcpt", "ItemShip", "InvAdjst"]],
            "and",
            ["account", "anyof", ["214"]],
            "and",
            ["createdfrom.intercotransaction", "anyof", ["@NONE@"]],
            "and",
            ["location.name", "contains", ["FBA"]]
        );


        ["custpage_li_location", "custpage_li_sku", "custpage_li_start_date", "custpage_li_end_date", "custpage_li_pages", "custpage_li_per_page"];
        if (param.custpage_li_sku) {
            ns_filters_1.push("and",
                ["item", "anyof", param.custpage_li_sku]
            )
        }
        if (param.custpage_li_location) {
            ns_filters_1.push("and",
                ["location", "anyof", param.custpage_li_location])
        }
        if (param.custpage_li_start_date && param.custpage_li_end_date) {
            ns_filters_1.push("and", ["trandate", "within", [param.custpage_li_start_date, param.custpage_li_end_date]]);
        } else if (param.custpage_li_start_date && !param.custpage_li_end_date) {
            ns_filters_1.push("and", ["trandate", "onorafter", [param.custpage_li_start_date]]);
        } else if (!param.custpage_li_start_date && param.custpage_li_end_date) {
            ns_filters_1.push("and", ["trandate", "onorbefore", [param.custpage_li_end_date]]);
        }


        log.audit("NS 结余 过滤器", ns_filters_1)

        var ns_mySearch = search.create({
            type: "transaction",
            filters: ns_filters_1,
            columns: [
                { name: "location", summary: "GROUP", type: "select", label: "仓库" }, // 0
                { name: "item", summary: "GROUP", label: "SKU" }, // 1
                { name: "department", join: "item", summary: "MAX", type: "select", label: "部门" }, // 2
                { name: "quantity", summary: "SUM", type: "float", label: "结余数量" }, // 3
                { name: "locationaveragecost", join: "item", summary: "MAX", label: "Location Average Cost" }, // 4
                // { name: "averagecost", join: "item", summary: "AVG", label: "Average Cost" }
            ]
        });

        var pageData = ns_mySearch.runPaged({
            pageSize: pageSize
        });
        var ns_totalCount = pageData.count; //总数
        var ns_pageCount = pageData.pageRanges.length; //页数

        log.audit('获取 NS 结余数量 总数 ns_totalCount', ns_totalCount);
        log.audit('获取 NS 结余数量 页数 ns_pageCount', ns_pageCount);



        var itemArr = [],
            itemObj = {};
        var temp_result = [];
        if (ns_totalCount > 0) {
            pageData.fetch({
                index: 0
                // index: Number(_nowPage - 1)
            }).data.forEach(function(rs) {

                var ns_itemId = rs.getValue(rs.columns[1]),
                    fba_location = rs.getValue(rs.columns[0]),
                    ns_quantity = rs.getValue(rs.columns[3]),
                    ns_locationaveragecost = rs.getValue(rs.columns[4]),
                    ns_deparment = rs.getValue(rs.columns[2])
                // ns_subsidiary = rs.getValue(rs.columns[6])


                var it = {
                    custpage_label_location: fba_location, // 仓库
                    custpage_label_sku: ns_itemId, // 货品
                    custpage_label_ns_qty: ns_quantity, // NS 数量
                    // custpage_label_amazon_qty: ele.end_qty, // Amazon 数量
                    // custpage_label_msku: ele.msku, // MSKU
                    // custpage_label_inv_diff_qty: Number(ele.end_qty) - Number(ns_quantity), // NS - Amazon 差异数量
                    // custpage_label_inv_moninv_month: ele.custpage_label_inv_moninv_month, // 月度库存时间
                    custpage_label_inv_locationaveragecost: ns_locationaveragecost, // 平均成本
                    // custpage_label_fnsku: ele.custpage_label_fnsku,
                    custpage_label_deparment: ns_deparment,
                    // custpage_label_inv_recid_arr: JSON.stringify(ele.info)
                };

                temp_result.push(it);

            });
        }

        log.debug("获取数据 temp_result: " + temp_result.length, temp_result[0]);


        // 开始获取所有映射关系的 msku

        var mapping_filter = [];

        var ns_filters_2 = [];

        if (param.custpage_li_sku) {
            ns_filters_2.push(["custrecord_ass_sku", "anyof", [param.custpage_li_sku]]);
        } else {
            ns_filters_2.push(["custrecord_ass_sku", "noneof", ["@NONE@"]]);
        }

        temp_result.forEach(function(res, key) {
            if (key == 0) {
                mapping_filter.push([
                    ["custrecord_ass_account.custrecord_aio_fbaorder_location", "anyof", [res.custpage_label_location]],
                    "and",
                    ['custrecord_ass_sku', "anyof", [res.custpage_label_sku]]
                ]);
            } else {
                mapping_filter.push("or", [
                    ["custrecord_ass_account.custrecord_aio_fbaorder_location", "anyof", [res.custpage_label_location]],
                    "and",
                    ['custrecord_ass_sku', "anyof", [res.custpage_label_sku]]
                ])
            }
        });

        if (mapping_filter && mapping_filter.length > 0) {
            ns_filters_2.push("and", mapping_filter)
        }

        var map_result = search.create({
            type: "customrecord_aio_amazon_seller_sku",
            filters: ns_filters_2,
            columns: [
                { name: "custrecord_ass_sku", summary: "GROUP" }, // 货品,  0
                { name: "name", summary: "GROUP" }, // msku  1
                { name: "custrecord_ass_fnsku", summary: "GROUP" }, // fnku   2
                { name: "custrecord_aio_fbaorder_location", join: "custrecord_ass_account", summary: "GROUP" }, //FBA 仓库  3
            ]
        });

        var map_pageData = map_result.runPaged({
            pageSize: pageSize
        });

        // log.debug('map_pageData', map_pageData);
        var map_totalCount = map_pageData.count; //总数
        var map_pageCount = map_pageData.pageRanges.length; //页数
        log.audit('查找映射关系 map_totalCount', map_totalCount);
        log.audit('查找映射关系 map_pageCount', map_pageCount);

        var map_result = []; //结果

        var _temp_arr = new Array();

        var counter = 0;

        if (map_totalCount > 0) {
            map_pageData.fetch({
                index: 0
            }).data.forEach(function(map) {
                counter++;

                var itemId = map.getValue(map.columns[0]),
                    msku = map.getValue(map.columns[1]),
                    fnsku = map.getValue(map.columns[2]),
                    fba_location = map.getValue(map.columns[3]);

                var temp_element = temp_result.filter(function(a1) {
                    return a1.custpage_label_sku == itemId && a1.custpage_label_location == fba_location
                });


                temp_element.map(function(ele) {
                    var it = {
                        msku: msku,
                        itemId: itemId,
                        // end_qty: ele.end_qty,
                        fba_location: fba_location,
                        custpage_label_msku: msku,
                        custpage_label_sku: itemId,
                        custpage_label_fnsku: fnsku,
                        custpage_label_location: fba_location, // 仓库
                        custpage_label_ns_qty: ele.custpage_label_ns_qty, // NS 数量
                        // custpage_label_amazon_qty: ele.end_qty, // Amazon 数量
                        // custpage_label_inv_diff_qty: Number(ele.end_qty) - Number(ns_quantity), // NS - Amazon 差异数量
                        // custpage_label_inv_moninv_month: ele.custpage_label_inv_moninv_month, // 月度库存时间
                        custpage_label_inv_locationaveragecost: ele.custpage_label_inv_locationaveragecost, // 平均成本
                        custpage_label_deparment: ele.custpage_label_deparment,
                        // custpage_label_inv_recid_arr: JSON.stringify(ele.info)
                    }
                    map_result.push(it);

                })

            });
        }

        log.audit('counter', counter);

        log.debug('map_result length ', map_result.length);
        log.debug('映射关系 数据 1 ', map_result[0]);



        // 开始获获取月度库存数据

        var ns_filters_3 = [];
        ns_filters_3.push({
            name: 'custrecord_moninv_adjustment_order',
            operator: 'is',
            values: false
        });
        ns_filters_3.push({
            name: "custrecord_moninv_end_quantity",
            operator: "notequalto",
            rightparens: 0,
            values: ["0"]
        })

        if (param.custpage_li_start_date && param.custpage_li_end_date) {
            ns_filters_3.push({ name: "custrecord_moninv_month", operator: "within", values: [param.custpage_li_start_date, param.custpage_li_end_date] });
        } else if (param.custpage_li_start_date && !param.custpage_li_end_date) {
            ns_filters_3.push({ name: "custrecord_moninv_month", operator: "onorafter", values: [param.custpage_li_start_date] });
        } else if (!param.custpage_li_start_date && param.custpage_li_end_date) {
            ns_filters_3.push({ name: "custrecord_moninv_month", operator: "onorbefore", values: [param.custpage_li_end_date] });
        }

        log.audit('NS 库存结余 过滤器', ns_filters_3);
        var amazonSearch = search.create({
            type: "customrecord_amazon_monthinventory_rep",
            filters: ns_filters_3,
            columns: [
                // { name: "custrecord_aio_seller_id", join: "CUSTRECORD_MONINV_ACCOUNT", summary: "GROUP" }, // MWS Seller ID  0
                { name: "custrecord_aio_fbaorder_location", join: "CUSTRECORD_MONINV_ACCOUNT", summary: "GROUP" }, // 店铺仓库  1
                { name: "custrecord_moninv_month", summary: "GROUP", sort: "DESC" }, // 日期  2
                { name: "custrecord_moninv_fnsku", summary: "GROUP" }, // FNSKU  3
                { name: "custrecord_moninv_sku", summary: "GROUP" }, // MSKU  4
                { name: "custrecord_moninv_end_quantity", summary: "SUM" }, // Amazon 月末结余  5
            ]
        });

        var pageSize = _sizePage; //每页条数
        var ama_pageData = amazonSearch.runPaged({
            pageSize: pageSize
        });
        var ama_totalCount = ama_pageData.count; //总数
        var ama_pageCount = ama_pageData.pageRanges.length; //页数

        log.audit('关联第一个表 ama_totalCount', ama_totalCount);
        log.audit('关联第一个表 ama_pageCount', ama_pageCount);

        var amazon_result = new Array(); //结果

        var itemArr = [],
            rsJson = {};

        if (ama_totalCount > 0) {
            ama_pageData.fetch({
                index: Number(_nowPage - 1)
            }).data.forEach(function(ama) {

                var month_msku = ama.getValue(ama.columns[3]),
                    month_location = ama.getValue(ama.columns[0]),
                    month_ama = ama.getValue(ama.columns[1]),
                    end_qty = ama.getValue(ama.columns[4]),
                    month_rec_id = ama.id;


                var temp_element = map_result.filter(function(a1) {
                    return a1.custpage_label_msku == month_msku && a1.custpage_label_location == month_location
                });

                temp_element.map(function(mon) {
                    var it = {
                        month_rec_id: month_rec_id,
                        amazon_end_qty: end_qty,
                        custpage_label_msku: mon.custpage_label_msku,
                        custpage_label_sku: mon.custpage_label_sku,
                        custpage_label_fnsku: mon.custpage_label_fnsku,
                        custpage_label_location: mon.custpage_label_location, // 仓库
                        custpage_label_ns_qty: mon.custpage_label_ns_qty, // NS 数量
                        // custpage_label_inv_diff_qty: Number(ele.end_qty) - Number(ns_quantity), // NS - Amazon 差异数量
                        custpage_label_inv_moninv_month: month_ama, // 月度库存时间
                        custpage_label_inv_locationaveragecost: mon.custpage_label_inv_locationaveragecost, // 平均成本
                        custpage_label_deparment: mon.custpage_label_deparment,
                        // custpage_label_inv_recid_arr: JSON.stringify(ele.info)
                    }
                    amazon_result.push(it);
                })

            });
        }

        log.debug('amazon_result length', amazon_result.length)
        log.debug('amazon_result length', amazon_result[0])


        rsJson.result = amazon_result;
        rsJson.totalCount = ama_totalCount;
        rsJson.pageCount = ama_pageCount;

        return rsJson;

    }


    function _li_dateFormat(date, fmt) {
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds()
        }
        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (var k in o) {
            if (new RegExp('(' + k + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
            }
        }
        return fmt;
    }


    /**
     *
     * @param {Array} arr
     * @param {Object} obj
     */
    function getArrIndex(arr, obj) {
        var index = null;
        var key = Object.keys(obj)[0];
        arr.every(function(value, i) {
            if (value[key] === obj[key]) {
                index = i;
                return false;
            }
            return true;
        });
        return index;
    };

    return {
        onRequest: onRequest
    }
});