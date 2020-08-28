/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 11:34:43
 * @LastEditTime   : 2020-08-28 15:09:21
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/log', 'N/ui/serverWidget'], function(record, search, log, serverWidget) {

    function onRequest(context) {

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
                lineNumber = 20;
            }

            var nowPage = parameters.custpage_li_pages;

            // var resArr = getSublistValue("", lineNumber, nowPage);
            var resArr = searchResult(param, lineNumber, nowPage);

            // context.response.writeLine("resArr \n\n" + JSON.stringify(resArr));

            // return;

            var resultArr = resArr.result,
                totalCount = resArr.totalCount,
                pageCount = resArr.pageCount,
                filter = resArr.filter;


            log.audit('数据长度 resultArr', resultArr.length);

            log.audit("总数量  totalCount", totalCount);
            log.audit("总页数  pageCount", pageCount);

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

                    if (i === lineNumber) {

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
                pages.addSelectOption({
                    value: "",
                    text: ""
                });
            }
            if (totalCount) {}
            var temp = {
                custpage_li_total: totalCount,
                custpage_li_pages: nowPage
            }
            form.updateDefaultValues(temp);

            setSublistValue(subShowId, resultArr);

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

        // var request = context.request;
        // var response = context.response;

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

        // location.setHelpText({
        //     help: "需要查询的仓库",
        //     showInlineForAssistant: true
        // });
        var sku = form.addField({
            id: 'custpage_li_sku',
            type: serverWidget.FieldType.SELECT,
            label: 'SKU',
            source: 'item',
            container: 'fieldgroupid'
        });

        // sku.updateBreakType({
        //     breakType: serverWidget.FieldBreakType.STARTCOL
        // });// 新列
        var start_date = form.addField({
            id: 'custpage_li_start_date',
            type: serverWidget.FieldType.DATE,
            label: '起始日期',
            container: 'fieldgroupid'
        });
        // start_date.updateBreakType({
        //     breakType: serverWidget.FieldBreakType.STARTCOL
        // });// 新列
        var end_date = form.addField({
            id: 'custpage_li_end_date',
            type: serverWidget.FieldType.DATE,
            label: '结束日期',
            container: 'fieldgroupid'
        });

        // end_date.updateBreakType({
        //     breakType: serverWidget.FieldBreakType.STARTCOL
        // });// 新列

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
            // type: serverWidget.SublistType.INLINEEDITOR,
            label: '详情'
        });

        sublist.addMarkAllButtons();
        sublist.addRefreshButton();

        sublist.addField({
            id: 'custpage_label_checkbox',
            type: serverWidget.FieldType.CHECKBOX,
            label: '勾选'
        });

        var sub_account = sublist.addField({
            id: 'custpage_label_account',
            type: serverWidget.FieldType.SELECT,
            source: 'customrecord_aio_account',
            label: '店铺'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
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
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        sublist.addField({
            id: 'custpage_label_deparment',
            type: serverWidget.FieldType.SELECT,
            source: 'deparment',
            label: '事业部'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        sublist.addField({
            id: 'custpage_label_brand',
            type: serverWidget.FieldType.SELECT,
            // source: 'customlist_dps_brandbrand',
            label: '品牌'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        sublist.addField({
            id: 'custpage_label_rec_id',
            type: serverWidget.FieldType.TEXT,
            label: '记录ID'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
        });
        sublist.addField({
            id: 'custpage_label_center_id',
            type: serverWidget.FieldType.TEXT,
            label: 'centerId'
        }).updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE
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

        return form;
    }


    var sublistField = ["custpage_label_account", "custpage_label_location", "custpage_label_sku", "custpage_label_msku", "custpage_label_amazon_qty", "custpage_label_ns_qty", "custpage_label_inv_diff_qty"]


    /**
     * 设置子列表的值
     * @param {*} sublist
     */
    function setSublistValue(sublist, resultArr) {

        resultArr.map(function(result, key) {
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
                    value: result.custpage_label_amazon_qty,
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
        });

        return sublist;
    }

    /**
     *
     * @param {*} param
     */
    function searchResult(param, _sizePage, _nowPage) {

        if (!_nowPage) {
            _nowPage = 1;
        }

        var filter = [];
        filter.push({
            name: 'custrecord_moninv_adjustment_order',
            operator: 'is',
            values: false
        })
        if (param.custpage_li_start_date && param.custpage_li_end_date) {

            filter.push({ name: "custrecord_moninv_month", operator: "within", values: [param.custpage_li_start_date, param.custpage_li_end_date] });

        } else if (param.custpage_li_start_date && !param.custpage_li_end_date) {
            filter.push({ name: "custrecord_moninv_month", operator: "onorafter", values: [param.custpage_li_start_date] });
        } else if (!param.custpage_li_start_date && param.custpage_li_end_date) {
            filter.push({ name: "custrecord_moninv_month", operator: "onorbefore", values: [param.custpage_li_end_date] });
        }


        log.audit('月度库存 过滤器', filter);
        var amazonSearch = search.create({
            type: "customrecord_amazon_monthinventory_rep",
            filters: filter,
            columns: [
                "custrecord_moninv_end_quantity", // END-QUANTITY
                { name: "custrecord_aio_seller_id", join: "CUSTRECORD_MONINV_ACCOUNT" }, // MWS Seller ID
                "custrecord_moninv_sku", // msku
                "custrecord_moninv_fulfillment_center_id", // centerId
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


        // log.audit('ama_pageData', ama_pageData);

        var itemArr = [],
            rsJson = {};

        if (ama_totalCount > 0) {
            ama_pageData.fetch({
                index: Number(_nowPage - 1)
            }).data.forEach(function(ama) {

                amazon_result.push({
                    rec_id: ama.id,
                    _month_recId: ama.id,
                    centerId: ama.getValue(ama.columns[3]),
                    msku: ama.getValue(ama.columns[2]),
                    end_qty: ama.getValue(ama.columns[0]),
                    sellerId: ama.getValue(ama.columns[1]),
                    custpage_label_amazon_qty: ama.getValue(ama.columns[0]),
                    custpage_label_msku: ama.getValue(ama.columns[2])
                });
            });
        }

        log.debug('amazon_result length', amazon_result.length)
        var mapping_filter = [];

        var temp_map_filter = [];

        temp_map_filter.push(["custrecord_ass_sku", "noneof", ["@NONE@"]]);


        amazon_result.forEach(function(res, key) {
            if (key == 0) {
                mapping_filter.push([
                    ["custrecord_ass_account.custrecord_aio_seller_id", "startswith", [res.sellerId]],
                    "and",
                    ['name', "contains", [res.msku]]
                ]);
            } else {
                mapping_filter.push("or", [
                    ["custrecord_ass_account.custrecord_aio_seller_id", "startswith", [res.sellerId]],
                    "and",
                    ['name', "contains", [res.msku]]
                ])
            }
        });

        if (mapping_filter && mapping_filter.length > 0) {
            temp_map_filter.push("and", mapping_filter)
        }


        // log.debug('temp_map_filter', temp_map_filter);


        var map_result = search.create({
            type: "customrecord_aio_amazon_seller_sku",
            filters: temp_map_filter,
            columns: [
                // "custrecord_ass_sku", // 货品,
                // "name", // msku
                // { join: "custrecord_ass_account", name: "custrecord_aio_seller_id" }, // sellerId
                // { name: 'custrecord_aio_fbaorder_location', join: 'custrecord_ass_account' }, //FBA 仓库
                // "custrecord_ass_account", // 店铺

                { name: "custrecord_ass_sku", summary: "GROUP" }, // 货品,
                { name: "name", summary: "GROUP" }, // msku
                { name: "custrecord_aio_seller_id", join: "custrecord_ass_account", summary: "GROUP" }, // sellerId
                { name: "custrecord_aio_fbaorder_location", join: "custrecord_ass_account", summary: "GROUP" } //FBA 仓库
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
                    sellerId = map.getValue(map.columns[2]),
                    fba_location = map.getValue(map.columns[3]);
                // account = map.getValue(map.columns[4]);

                _temp_arr.push({
                    itemId: itemId,
                    msku: msku,
                    sellerId: sellerId
                })

                var temp_element = amazon_result.filter(function(a1) { // find(),
                    return a1.msku == msku && a1.sellerId == sellerId
                });

                // log.debug('temp_element', temp_element);
                temp_element.map(function(ele) {
                    var it = {
                        rec_id: ele.rec_id,
                        // account: account,
                        msku: msku,
                        itemId: itemId,
                        sellerId: sellerId,
                        end_qty: ele.end_qty,
                        fba_location: fba_location,
                        centerId: ele.centerId,
                        custpage_label_amazon_qty: ele.end_qty,
                        custpage_label_msku: msku,
                        custpage_label_sku: itemId,
                        custpage_label_center_id: ele.centerId
                    }
                    map_result.push(it);
                });

            });
        }


        log.audit('counter', counter);

        log.debug('map_result length ', map_result.length)


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
        if (param.custpage_li_sku) {
            ns_filters.push("and",
                ["item", "anyof", param.custpage_li_sku]
            )
        }
        if (param.custpage_li_location) {
            ns_filters.push("and",
                ["location", "anyof", param.custpage_li_location])
        }
        var temp_ns_filter = [];

        map_result.map(function(map, key) {
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

        if (temp_ns_filter && temp_ns_filter.length > 0) {
            ns_filters.push("and", temp_ns_filter);
        }


        // log.error('ns_filters', ns_filters)

        // return ns_filters;

        var ns_mySearch = search.create({
            type: "transaction",
            filters: ns_filters,
            columns: [
                { name: "location", summary: "GROUP", type: "select", label: "仓库" },
                { name: "item", summary: "GROUP", label: "SKU" },
                { name: "custitem_dps_brand", join: "item", summary: "MAX", type: "select", label: "品牌" },
                { name: "department", join: "item", summary: "MAX", type: "select", label: "部门" },
                { name: "class", join: "item", summary: "MAX", type: "select", label: "品类" },
                { name: "quantity", summary: "SUM", type: "float", label: "结余数量" },

            ]
        });

        var pageData = ns_mySearch.runPaged({
            pageSize: pageSize
        });
        var ns_totalCount = pageData.count; //总数
        var ns_pageCount = pageData.pageRanges.length; //页数

        log.audit('关联第三个表 ns_totalCount', ns_totalCount);
        log.audit('关联第三个表 ns_pageCount', ns_pageCount);

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
                    ns_quantity = rs.getValue(rs.columns[5]),
                    ns_deparment = rs.getValue(rs.columns[3]),
                    ns_brand = rs.getText(rs.columns[2])

                var temp_element = map_result.filter(function(a1) { // find(),
                    return a1.itemId == ns_itemId && a1.fba_location == fba_location
                });

                temp_element.map(function(ele) {
                    var it = {
                        // custpage_label_account: ele.account,
                        custpage_label_location: fba_location,
                        custpage_label_sku: ns_itemId,
                        custpage_label_ns_qty: ns_quantity,
                        custpage_label_amazon_qty: ele.end_qty,
                        custpage_label_msku: ele.msku,
                        custpage_label_rec_id: ele.rec_id,
                        custpage_label_center_id: ele.centerId,
                        custpage_label_inv_diff_qty: Number(ele.end_qty) - Number(ns_quantity),
                        custpage_label_deparment: ns_deparment,
                        custpage_label_brand: ns_brand
                    };

                    temp_result.push(it);
                });

            });
        }

        log.debug('temp_result 长度', temp_result.length);

        rsJson.result = temp_result;
        rsJson.totalCount = ns_totalCount;
        rsJson.pageCount = ns_pageCount;
        rsJson.pageCount = ama_pageCount;
        // rsJson.filter = temp_map_filter;
        return rsJson;

    }

    return {
        onRequest: onRequest
    }
});