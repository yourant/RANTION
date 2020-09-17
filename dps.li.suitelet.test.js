/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-09-14 21:13:33
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \dps.li.suitelet.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/log', './douples_amazon/Helper/core.min', 'N/file',
    'N/xml', './Rantion/Helper/tool.li', 'N/runtime', 'N/file', "N/ui/serverWidget",
    './douples_amazon/Helper/Moment.min', 'N/format', './douples_amazon/Helper/fields.min',
    "./Rantion/Helper/config", 'N/http', 'N/encode', 'N/redirect',
    './Rantion/cux/Declaration_Information/handlebars-v4.1.1', "./Rantion/fulfillment.record/dps.information.values.js",

    "./Rantion/cux/Declaration_Information/dps.li.tool.setValue.js", "N/render", "N/task"
], function(search, record, log, core, file, xml, tool, runtime, file, serverWidget,
    moment, format, fields, config, http, encode, redirect, Handlebars, information, toolValue, render, task) {

    function onRequest(context) {
        try {

            log.audit('脚本使用量', runtime.getCurrentScript().getRemainingUsage());

            var userObj = runtime.getCurrentUser();

            log.debug('userObj', userObj);
            if (userObj.role == 3 && userObj.id != 911) {
                var form = InitUI(context);
                context.response.writePage({
                    pageObject: form
                });

            } else if (userObj.id == 911 /* || userObj.id == 13440 */ ) {

                try {


                    var temp = GetstoreInEU(acc, marketplace_name, acc_text);

                    context.response.writeLine("temp \n"+JSON.stringify(temp))


                    // var mrTask = task.create({
                    //     taskType: task.TaskType.MAP_REDUCE,
                    //     scriptId: 'customscript_dps_am_report_financial',
                    //     // deploymentId: "customdeploy_dps_am_report_financial_ord",
                    //     deploymentId: "customdeploy_dps_am_report_financial_ref",
                    // });
                    // context.response.writeLine('mrTask=' + mrTask);
                    // var taskId = mrTask.submit();
                    // context.response.writeLine('taskId=' + taskId);

                    // var mrTask = task.create({
                    //     taskType: task.TaskType.MAP_REDUCE,
                    //     scriptId: 'customscript_dps_am_report_financial',
                    //     deploymentId: "customdeploy_dps_am_report_financial_ord",
                    //     // deploymentId: "customdeploy_dps_am_report_financial_ref",
                    // });
                    // context.response.writeLine('mrTask=' + mrTask);
                    // var taskId = mrTask.submit();
                    // context.response.writeLine('taskId=' + taskId);
                } catch (e) {
                    log.error("e", e);
                }



                function GetstoreInEU(acc, marketplace_name, acc_text) {
                    var sellerid, account = {},
                        feck = false,
                        entity, subsidiary
                    search.create({
                        type: 'customrecord_aio_account',
                        filters: [
                            { name: 'internalidnumber', operator: 'equalto', values: Number(acc) }
                        ],
                        columns: [
                            { name: 'custrecord_aio_seller_id' },
                            { name: 'custrecord_aio_customer' },
                            { name: 'custrecord_aio_subsidiary' }
                        ]
                    }).run().each(function(e) {
                        sellerid = e.getValue('custrecord_aio_seller_id')
                        entity = e.getValue('custrecord_aio_customer')
                        subsidiary = e.getValue('custrecord_aio_subsidiary')
                    })
                    marketplace_name = marketplace_name.substring(marketplace_name.length - 2, marketplace_name.length)
                    search.create({
                        type: 'customrecord_aio_account',
                        filters: [
                            { name: 'custrecord_aio_seller_id', operator: 'is', values: sellerid },
                            { name: 'isinactive', operator: 'is', values: false }
                        ],
                        columns: [
                            { name: 'custrecord_aio_seller_id' },
                            { name: 'custrecord_aio_amazon_marketplace', join: 'custrecord_aio_enabled_sites' },
                            { name: 'name' },
                            { name: 'custrecord_aio_customer' },
                            { name: 'custrecord_aio_subsidiary' }
                        ]
                    }).run().each(function(e) {
                        var enbelsite = e.getValue(e.columns[1])
                        entity = e.getValue('custrecord_aio_customer')
                        subsidiary = e.getValue('custrecord_aio_subsidiary')
                        if (marketplace_name.toUpperCase() == enbelsite.trim()) {
                            account = {
                                'acc': e.id,
                                'acc_text': e.getValue('name'),
                                'entity': entity,
                                'subsidiary': subsidiary
                            }
                            feck = true
                        }
                        return true
                    })
                    if (!feck) {
                        account = {
                            'acc': acc,
                            'acc_text': acc_text,
                            'entity': entity,
                            'subsidiary': subsidiary
                        }
                    }
                    log.debug('拿到的account', account)
                    return account
                }

                return;
                var fils = []
                fils = [
                    ['custrecord_settlement_enddate', 'within', ['2020-6-1', '2020-6-30']], // end date在2月2号之后，所有的
                    //   'and',
                    //   ['custrecord_settlement_acc', 'noneof', '@NONE@'],
                    'and',
                    ['custrecord_aio_sett_tran_type', 'doesnotcontain', 'Refund'],
                    'and',
                    ['custrecord_settle_is_generate_voucher', 'is', false], // 未生成凭证
                    'and',
                    ['custrecord_payment_itemprice_pt', 'is', false], // 不属于货价和税
                    'and',
                    ['custrecord_february_undeal', 'isnot', 'F'], // 不处理
                    // 'and',
                    // ['custrecord_aio_account_2.custrecord_aio_account_region', 'noneof', ['1']],
                    // "and",
                    // ["custrecord_missingorder_settlement", "isnot", "F"],    //如果订单号不是正常的亚马逊单号   3-7-7
                ]


                fils.push('and')
                // fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [17]]);// KOHREE.US
                fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [49]]); // MOUKEY.UK
                // fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [179]]); // JINLAN.UK
                // fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [21]]); // DONNERDIRECT.US
                // fils.push(['custrecord_aio_sett_report_id.custrecord_aio_origin_account', 'anyof', [24]]); // PLAMBAG.US

                var mySearch = search.create({
                    type: 'customrecord_aio_amazon_settlement',
                    filters: fils,
                    columns: [{
                            name: 'custrecord_aio_sett_id',
                            summary: 'GROUP'
                        }, // 按 settlement id和单号分组
                        {
                            name: 'custrecord_aio_sett_order_id',
                            summary: 'GROUP'
                        },
                        {
                            name: 'custrecord_aio_sett_report_id',
                            summary: 'GROUP'
                        },
                        {
                            name: 'custrecord_aio_sett_merchant_order_id',
                            summary: 'GROUP'
                        },
                        {
                            name: 'custrecord_settlement_acc',
                            summary: 'GROUP'
                        }, // 实际店铺
                    ]
                });

                var pageSize = 1000; // 每页条数
                var pageData = mySearch.runPaged({
                    pageSize: pageSize
                })

                var totalCount = pageData.count; // 总数

                log.error('总共的数据量', totalCount)

                context.response.writeLine("总共的数据量\n\n" + JSON.stringify(totalCount));

                return;


                var loadSearch = search.load({
                    id: 523
                });



                // return;

                var limit = 10;

                log.debug('start', new Date().toISOString())

                // name(required)

                // join

                // operator(required)

                // summary

                // formula

                // values
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: [
                        ["custrecord_ass_account.custrecord_aio_seller_id", "contains", "A3VHP1JMM4SW7V"] // join
                    ]
                }).run().each(function(re) {
                    log.debug('re.id', re.id);

                    return --limit > 0;
                })

                log.debug('end', new Date().toISOString())



                return;

                var load_a = search.load({
                    id: 327
                });

                context.response.writeLine("尝试加载报表\n\n" + JSON.stringify(load_a));



                return;
                var toId = 2660752;
                var get = searchToStatus(toId);


                log.debug('get', get);

                context.response.writeLine('get: ' + get)


                return;
                var nowDate = new Date();
                var format = "yyyy年MM月dd日"

                var get = tool.dateFormat(nowDate, format);

                log.debug('get', get);

                context.response.writeLine('get: ' + get)

            } else {
                context.response.writeLine('<html><head><meta charset="utf-8"></head><body><br><br><br><br><h1 style = "vertical-align:middle;text-align:center;color: red">权限不足</h1><p style = "vertical-align:middle;text-align:center;">无法运行此页面</p></body></html>')
            }


        } catch (error) {

            var b = new Date();
            log.error("开始时间：", b)
            context.response.writeLine("\n\n\n 结束时间     " + b.toISOString());

            log.error('函数执行出错了', error);
        }
    }


    /**
     * 搜索调拨单的状态
     * @param {Number} toId
     */
    function searchToStatus(toId) {
        var statusref;
        search.create({
            type: 'transaction',
            // type: 'transferorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: toId
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: [
                "statusref"
            ]
        }).run().each(function(rec) {
            statusref = rec.getValue('statusref');
        });


        return statusref || false;

    }

    function getWeekObj(day, func_type) {

        var weekObj = {};
        var weekArr = [];
        var start_date, end_date;
        var d1 = new Date(day);
        var d2 = new Date(day);

        d2.setMonth(0);
        d2.setDate(1);
        var numweekf = d2.getDay();
        log.debug('numweekf', numweekf);

        var weeekDay = [1, 2, 3, 4, 5, 6, 0];
        var s_str = weeekDay.indexOf(numweekf);

        start_date = new Date(d1.getTime() - (24 * 60 * 60 * 1000 * s_str)).toISOString().split('T')[0];
        end_date = new Date(d1.getTime() + (24 * 60 * 60 * 1000 * (6 - s_str))).toISOString().split('T')[0];

        log.debug('start_date', start_date);
        log.debug('end_date', end_date);

        var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
        var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
        var num = Math.ceil(days / 7);
        if (func_type == 'B' && num == 1) {
            num = 53;
            weekObj[num] = {
                week: num,
                start_date: start_date,
                end_date: end_date
            }

            weekArr.push({
                week: num,
                start_date: start_date,
                end_date: end_date
            })
        } else if (func_type == 'C' && num == 53) {
            num = 1;
            weekObj[num] = {
                week: num,
                start_date: start_date,
                end_date: end_date
            }
            weekArr.push({
                week: num,
                start_date: start_date,
                end_date: end_date
            })
        } else {
            weekObj[num] = {
                week: num,
                start_date: start_date,
                end_date: end_date
            }
            weekArr.push({
                week: num,
                start_date: start_date,
                end_date: end_date
            })
        }

        return weekArr;
    }


    //获取子公司的ID
    function getCompanyId(companyName) {
        var result
        search.create({
            type: 'subsidiary',
            filters: [{
                name: 'namenohierarchy',
                operator: 'is',
                values: companyName
            }, ],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function(rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取子公司的ID
    function getLocationId(companyId, positionCode) {

        log.debug('companyId', companyId);
        log.debug('positionCode', positionCode);

        var result
        search.create({
            type: 'location',
            filters: [{
                    name: 'subsidiary',
                    operator: 'anyof',
                    values: companyId
                },
                {
                    name: 'custrecord_dps_wms_location',
                    operator: 'is',
                    values: positionCode
                }
            ],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function(rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取货品对应库位的当前数量
    function getCount(item, location) {
        var count = 0
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalId',
                    operator: 'is',
                    values: item
                },
                {
                    name: 'inventorylocation',
                    operator: 'is',
                    values: location
                }
            ],
            columns: [{
                name: 'locationquantityonhand'
            }]
        }).run().each(function(rec) {
            var nowCount = rec.getValue('locationquantityonhand')
            count = nowCount ? Number(nowCount) : 0
            return true;
        });
        return count
    }


    function InventoryReportUI(param) {

        var form = serverWidget.createForm({
            title: '库存报表'
        });

        form.addFieldGroup({
            id: 'search_groupid',
            label: '查询条件'
        });

        form.addFieldGroup({
            id: 'result_groupid',
            label: '结果信息'
        });

        var sublist = form.addSublist({
            id: 'sublistid',
            type: serverWidget.SublistType.LIST,
            label: '详情'
        });

        form.addSubmitButton({
            label: '查询',
        });


        InventoryReportUIField(form, "search_groupid", param);

        InventoryReportUISublistFields(sublist);

        return form;

    }


    /**
     * 设置表单的字段
     * @param {Object} form
     * @param {String} container
     * @param {Object} defaultValue
     */
    function InventoryReportUIField(form, container, defaultValue) {
        var field_location = form.addField({
            id: 'custpage_dps_search_location',
            type: serverWidget.FieldType.SELECT,
            source: 'location',
            label: '仓库',
            container: container
        });
        field_location.defaultValue = defaultValue.location;

        var field_sku = form.addField({
            id: 'custpage_dps_search_sku',
            type: serverWidget.FieldType.SELECT,
            source: 'item',
            label: 'SKU',
            container: container
        });
        field_sku.defaultValue = defaultValue.sku;

        var field_department = form.addField({
            id: 'custpage_dps_search_department',
            type: serverWidget.FieldType.SELECT,
            source: 'department',
            label: '部门',
            container: container
        });
        field_department.defaultValue = defaultValue.department;

        var field_sellersku = form.addField({
            id: 'custpage_dps_search_sellersku',
            type: serverWidget.FieldType.TEXT,
            label: 'SELLERSKU',
            container: container
        });
        field_sellersku.defaultValue = defaultValue.msku;

        var field_fnsku = form.addField({
            id: 'custpage_dps_search_fnsku',
            type: serverWidget.FieldType.TEXT,
            label: 'FNSKU',
            container: container
        });
        field_fnsku.defaultValue = defaultValue.fnsku;

        var field_asin = form.addField({
            id: 'custpage_dps_search_asin',
            type: serverWidget.FieldType.TEXT,
            label: 'ASIN',
            container: container
        });
        field_asin.defaultValue = defaultValue.asin;


        var field_productstatus = form.addField({
            id: 'custpage_dps_search_productstatus',
            type: serverWidget.FieldType.SELECT,
            label: '产品状态',
            container: container
        });
        field_productstatus.addSelectOption({
            value: '0',
            text: ''
        });
        field_productstatus.addSelectOption({
            value: '1',
            text: '正常'
        });
        field_productstatus.addSelectOption({
            value: '2',
            text: '停用'
        });
        field_productstatus.defaultValue = defaultValue.productstatus;

    }


    /**
     * 增加子列表的字段
     * @param {Object} sublist
     */
    function InventoryReportUISublistFields(sublist) {

        var da = sublist.addField({
            id: 'custpage_sublist_location',
            type: serverWidget.FieldType.TEXT,
            label: '仓库'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_sku',
            type: serverWidget.FieldType.TEXT,
            label: 'SKU'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_produstname',
            type: serverWidget.FieldType.TEXT,
            label: '产品名称'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_brand',
            type: serverWidget.FieldType.TEXT,
            label: '品牌'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_category',
            type: serverWidget.FieldType.TEXT,
            label: '品类'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_department',
            type: serverWidget.FieldType.TEXT,
            label: '部门'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_vendor',
            type: serverWidget.FieldType.TEXT,
            label: '默认供应商'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_sellersku',
            type: serverWidget.FieldType.TEXT,
            label: 'SELLERSKU'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_fnsku',
            type: serverWidget.FieldType.TEXT,
            label: 'FNSKU'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_asin',
            type: serverWidget.FieldType.TEXT,
            label: 'ASIN'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_productstatus',
            type: serverWidget.FieldType.TEXT,
            label: '产品状态'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_wps',
            type: serverWidget.FieldType.INTEGER,
            label: 'WPS'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_sales',
            type: serverWidget.FieldType.TEXT,
            label: '过去9天销量（倒序0-8）'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_inventoryturnover',
            type: serverWidget.FieldType.INTEGER,
            label: '库周转'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_turnaroundintransit',
            type: serverWidget.FieldType.INTEGER,
            label: '途周转'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_planturnaround',
            type: serverWidget.FieldType.INTEGER,
            label: '计周转'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_warehousing',
            type: serverWidget.FieldType.INTEGER,
            label: '入库'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_warehouse',
            type: serverWidget.FieldType.INTEGER,
            label: '库'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_reserved',
            type: serverWidget.FieldType.INTEGER,
            label: '预留'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_transit',
            type: serverWidget.FieldType.INTEGER,
            label: '中转'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_plan',
            type: serverWidget.FieldType.INTEGER,
            label: '计'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_order',
            type: serverWidget.FieldType.INTEGER,
            label: '定'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_delivery',
            type: serverWidget.FieldType.INTEGER,
            label: '交'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_inboundworking',
            type: serverWidget.FieldType.TEXT,
            label: 'inboundworking'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_inboundshipped',
            type: serverWidget.FieldType.TEXT,
            label: 'inboundshipped'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_inboundreceiving',
            type: serverWidget.FieldType.TEXT,
            label: 'inboundreceiving'
        });
        var da = sublist.addField({
            id: 'custpage_sublist_updatetime',
            type: serverWidget.FieldType.DATE,
            label: '更新时间'
        });

    }

    /**
     * 获取搜索的结果
     * @param {Object} param
     */
    function getSearchResult(param) {


        var itemFilter = [];

        if (param.location) {
            itemFilter.push({
                name: "inventorylocation",
                operator: "anyof",
                values: [param.location]
            });
        }
        if (param.department) {
            itemFilter.push({
                name: "department",
                operator: "anyof",
                values: [param.department]
            });
        }
        if (param.sku) {
            itemFilter.push({
                name: "internalid",
                operator: "anyof",
                values: [param.sku]
            });
        }
        if (param.productstatus) {
            if (param.productstatus == 1) {
                itemFilter.push({
                    name: "isinactive",
                    operator: "is",
                    values: false
                });
            }
            if (param.productstatus == 2) {
                itemFilter.push({
                    name: "isinactive",
                    operator: "is",
                    values: true
                });
            }
        }

        log.audit('itemFilter', itemFilter);

        var item_info_obj = searchItemResult(itemFilter);

        var itemIdArr = Object.keys(item_info_obj);

        log.debug('itemIdArr', itemIdArr);

        var mskuFilter = [];

        if (itemIdArr.length > 0) {
            mskuFilter.push({
                name: "custrecord_ass_sku",
                operator: "anyof",
                values: itemIdArr
            });
        }

        // var account = item_info_obj[itemIdArr[0]][0].account;
        // if (param.location && account) {
        //     log.audit('店铺 3', account);

        //     mskuFilter.push({
        //         formula: "{custrecord_ass_account}",
        //         name: "formulatext",
        //         operator: "is",
        //         values: [account]
        //     });
        // }

        if (param.asin) {
            mskuFilter.push({
                name: "custrecord_ass_asin",
                operator: "is",
                values: param.asin
            });
        }
        if (param.msku) {
            mskuFilter.push({
                name: "name",
                operator: "is",
                values: param.msku
            });
        }

        if (param.fnsku) {
            mskuFilter.push({
                name: "custrecord_ass_fnsku",
                operator: "is",
                values: param.fnsku
            });
        }

        // mskuFilter.push({
        //     name: "isinactive",
        //     operator: "is",
        //     values: false
        // });



        var new_mskuInfoObj = searchMskuResult(mskuFilter, item_info_obj);

        log.debug('new_mskuInfoObj', new_mskuInfoObj);


        return new_mskuInfoObj;

    }


    /**
     * 获取货品信息
     * @param {Array} itemFilter
     */
    function searchItemResult(itemFilter) {

        var limit_1 = 100;
        var item_info_obj = {},
            item_info_arr = [];
        search.create({
            type: 'item',
            filters: itemFilter,
            columns: [
                "itemid", //"Name",
                "custitem_dps_use", // "产品用途",
                "inventorylocation", //"Inventory Location",
                "custitem_dps_skuchiense", //"SKU中文标题",
                "custitem_dps_brand", //"品牌",
                "custitem_dps_ctype", //"产品类型",
                "department", //"Department",
                "vendor", //"Preferred Vendor",
                "isinactive", //"Inactive",
                "locationquantitybackordered", // 延交订单
                "locationquantityavailable", // 可用数量
            ]
        }).run().each(function(rec) {
            var itemId = rec.id;
            var temp_item_info = [];
            var temp_str = '正常';
            if (rec.getValue('isinactive')) {
                temp_str = '停用';
            }
            var it = {
                itemId: rec.id, // 货品 ID
                itemName: rec.getValue('itemid'), // 货品名称
                purpose: rec.getValue('custitem_dps_use'), // 用途
                inventorylocation: rec.getText('inventorylocation'), // 库存地点
                account: rec.getText('inventorylocation').replace('FBA-', ''), // 库存地点
                productTitle: rec.getValue('custitem_dps_skuchiense'), // 产品标题
                brand: rec.getText('custitem_dps_brand'), // 品牌
                category: rec.getText('custitem_dps_ctype'), // 产品类型
                department: rec.getText('department'), // 部门
                vendor: rec.getText('vendor'), // 默认供应商
                isinactive: temp_str, // 活动状态
                locationquantitybackordered: rec.getValue('locationquantitybackordered'), // 延交订单
                delivery: rec.getValue('locationquantityavailable'), // 可用数量
            }

            if (item_info_obj[itemId]) {
                temp_item_info = item_info_obj[itemId];
            }

            temp_item_info.push(it);
            item_info_obj[itemId] = temp_item_info;

            return --limit_1 > 0;
        });

        log.debug('item_info_obj', item_info_obj);

        return item_info_obj;
    }


    /**
     * 搜索映射关系中 msku, fnsku, asin
     * @param {Array} mskuFilter
     * @param {Object} itemInfoObj
     */
    function searchMskuResult(mskuFilter, itemInfoObj) {

        log.debug('mskuFilter', mskuFilter);
        var limit = 3999;

        var mskuInfoObj = {};

        search.create({
            type: "customrecord_aio_amazon_seller_sku",
            filters: mskuFilter,
            columns: [
                "name", // seller sku
                "custrecord_ass_sku", // 货品
                "custrecord_ass_fnsku", // FNSKU
                "custrecord_ass_asin", // ASIN
            ]
        }).run().each(function(r) {

            var temp_msku_arr = [];

            if (mskuInfoObj[itemId]) {
                temp_msku_arr = mskuInfoObj[itemId]
            }

            var itemId = r.getValue('custrecord_ass_sku'),
                msku = r.getValue('name'),
                fnsku = r.getValue('custrecord_ass_fnsku'),
                asin = r.getValue('custrecord_ass_asin');

            if (itemInfoObj[itemId]) {
                var temp_item = itemInfoObj[itemId];

                temp_item.map(function(item) {
                    var it = {
                        itemId: itemId,
                        msku: msku,
                        fnsku: fnsku,
                        asin: asin,
                        itemName: item.itemName,
                        purpose: item.purpose,
                        inventorylocation: item.inventorylocation,
                        account: item.account,
                        productTitle: item.productTitle,
                        brand: item.brand,
                        category: item.category,
                        department: item.department,
                        vendor: item.vendor,
                        isinactive: item.isinactive,
                        locationquantitybackordered: item.locationquantitybackordered,
                        delivery: item.delivery
                    }

                    temp_msku_arr.push(it);
                });
            }

            // var it = {
            //     itemId: itemId,
            //     msku: r.getValue('name'),
            //     fnsku: r.getValue('custrecord_ass_fnsku'),
            //     asin: r.getValue('custrecord_ass_asin')
            // }
            // temp_msku_arr.push(it);

            mskuInfoObj[itemId] = temp_msku_arr;

            return --limit > 0;
        });

        return mskuInfoObj;

    }

    function setSublistValue(subli, valueObj) {

        var line_no = 0;
        Object.keys(valueObj).map(function(value, key) {

            var temp_arr = valueObj[value];

            temp_arr.map(function(tem) {

                log.debug('tem', tem);
                if (tem.inventorylocation) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_location',
                        value: tem.inventorylocation,
                        line: line_no
                    });
                }
                if (tem.itemName) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_sku',
                        value: tem.itemName,
                        line: line_no
                    });

                }

                if (tem.productTitle) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_produstname',
                        value: tem.productTitle,
                        line: line_no
                    });
                }

                if (tem.brand) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_brand',
                        value: tem.brand,
                        line: line_no
                    });
                }

                if (tem.category) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_category',
                        value: tem.category,
                        line: line_no
                    });
                }

                if (tem.department) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_department',
                        value: tem.department,
                        line: line_no
                    });
                }
                if (tem.vendor) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_vendor',
                        value: tem.vendor,
                        line: line_no
                    });
                }


                if (tem.msku) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_sellersku',
                        value: tem.msku,
                        line: line_no
                    });
                }

                if (tem.fnsku) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_fnsku',
                        value: tem.fnsku,
                        line: line_no
                    });
                }

                if (tem.asin) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_asin',
                        value: tem.asin,
                        line: line_no
                    });
                }

                if (tem.isinactive) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_productstatus',
                        value: tem.isinactive,
                        line: line_no
                    });
                }

                if (tem.wps) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_wps',
                        value: tem.wps,
                        line: line_no
                    });
                }

                if (tem.sales) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_sales',
                        value: tem.sales,
                        line: line_no
                    });
                }
                if (tem.inventoryturnover) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_inventoryturnover',
                        value: tem.inventoryturnover,
                        line: line_no
                    });
                }

                if (tem.turnaroundintransit) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_turnaroundintransit',
                        value: tem.turnaroundintransit,
                        line: line_no
                    });
                }

                if (tem.planturnaround) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_planturnaround',
                        value: tem.planturnaround,
                        line: line_no
                    });
                } // '计周转'
                if (tem.warehousing) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_warehousing',
                        value: tem.warehousing,
                        line: line_no
                    });
                } // '入库'

                if (tem.warehouse) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_warehouse',
                        value: tem.warehouse,
                        line: line_no
                    });
                } // '库'

                if (tem.reserved) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_reserved',
                        value: tem.reserved,
                        line: line_no
                    });
                } // '预留'

                if (tem.transit) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_transit',
                        value: tem.transit,
                        line: line_no
                    });
                } // '中转'

                if (tem.plan) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_plan',
                        value: tem.plan,
                        line: line_no
                    });
                } // '计'

                if (tem.order) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_order',
                        value: tem.order,
                        line: line_no
                    });
                } // '定'

                if (tem.delivery) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_delivery',
                        value: tem.delivery,
                        line: line_no
                    });
                } // '交'

                if (tem.inboundworking) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_inboundworking',
                        value: tem.inboundworking,
                        line: line_no
                    });
                } // inboundworking

                if (tem.inboundshipped) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_inboundshipped',
                        value: tem.inboundshipped,
                        line: line_no
                    });
                } // inboundshipped

                if (tem.inboundreceiving) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_inboundreceiving',
                        value: tem.inboundreceiving,
                        line: line_no
                    });
                } // inboundreceiving

                if (tem.updatetime) {
                    subli.setSublistValue({
                        id: 'custpage_sublist_updatetime',
                        // value: tem.updatetime,
                        line: line_no
                    });
                } // 更新时间

                subli.setSublistValue({
                    id: 'custpage_sublist_updatetime',
                    value: new Date().toISOString().split('T')[0],
                    // value: new Date(),
                    line: line_no
                });

                line_no++;
            })



        });


    }



    function InitUI(context) {
        var request = context.request;
        var response = context.response;
        var parameters = request.parameters;
        var account = parameters.custpage_dps_account;
        var shipment = parameters.custpage_dps_shipment;
        var print = parameters.print;

        var form = serverWidget.createForm({
            title: '查询shipment'
        });

        form.addFieldGroup({
            id: 'search_groupid',
            label: '查询条件'
        });

        form.addFieldGroup({
            id: 'result_groupid',
            label: '结果信息'
        });
        if (account && shipment) {


            var auth = core.amazon.getAuthByAccountId(account);

            var s = core.amazon.listInboundShipments(auth, "", [shipment])

            log.debug('s', s)
            var item = core.amazon.listInboundShipmentsItems(auth, shipment, "");
            log.debug('item', item);


            var sublist = form.addSublist({
                id: 'sublistid',
                type: serverWidget.SublistType.LIST,
                label: 'Shipment信息'
            });

            var da = sublist.addField({
                id: 'custpage_shipment_id',
                type: serverWidget.FieldType.TEXT,
                label: 'shipment id'
            });
            var da = sublist.addField({
                id: 'custpage_shipment_name',
                type: serverWidget.FieldType.TEXT,
                label: 'shipment name'
            });
            var da = sublist.addField({
                id: 'custpage_center_id',
                type: serverWidget.FieldType.TEXT,
                label: 'center id'
            });
            var da = sublist.addField({
                id: 'custpage_label_prep_type',
                type: serverWidget.FieldType.TEXT,
                label: 'label prep type'
            });
            var da = sublist.addField({
                id: 'custpage_shipment_status',
                type: serverWidget.FieldType.TEXT,
                label: 'shipment status'
            });
            var da = sublist.addField({
                id: 'custpage_are_cases_required',
                type: serverWidget.FieldType.TEXT,
                label: 'are cases required'
            });
            var da = sublist.addField({
                id: 'custpage_box_contents_source',
                type: serverWidget.FieldType.TEXT,
                label: 'box contents source'
            });

            var line = form.getSublist({
                id: 'sublistid'
            });
            for (var i_s = 0, i_len = s.length; i_s < i_len; i_s++) {
                line.setSublistValue({
                    id: 'custpage_shipment_id',
                    value: s[i_s].shipment_id,
                    line: i_s
                });
                line.setSublistValue({
                    id: 'custpage_shipment_name',
                    value: s[i_s].shipment_name,
                    line: i_s
                });
                line.setSublistValue({
                    id: 'custpage_center_id',
                    value: s[i_s].center_id,
                    line: i_s
                });
                line.setSublistValue({
                    id: 'custpage_label_prep_type',
                    value: s[i_s].label_prep_type,
                    line: i_s
                });
                line.setSublistValue({
                    id: 'custpage_shipment_status',
                    value: s[i_s].shipment_status,
                    line: i_s
                });
                line.setSublistValue({
                    id: 'custpage_are_cases_required',
                    value: s[i_s].are_cases_required,
                    line: i_s
                });
                if (s[i_s].box_contents_source) {
                    line.setSublistValue({
                        id: 'custpage_box_contents_source',
                        value: s[i_s].box_contents_source,
                        line: i_s
                    });
                }
            }

            var sublist_item = form.addSublist({
                id: 'sublistid_ship_item',
                type: serverWidget.SublistType.LIST,
                label: 'Shipment 货品'
            });

            var da = sublist_item.addField({
                id: 'custpage_item_shipment_id',
                type: serverWidget.FieldType.TEXT,
                label: 'shipment id'
            });
            var da = sublist_item.addField({
                id: 'custpage_item_seller_sku',
                type: serverWidget.FieldType.TEXT,
                label: 'seller sku'
            });
            var da = sublist_item.addField({
                id: 'custpage_item_quantity_shipped',
                type: serverWidget.FieldType.TEXT,
                label: 'quantity shipped'
            });
            var da = sublist_item.addField({
                id: 'custpage_item_quantity_in_case',
                type: serverWidget.FieldType.TEXT,
                label: 'quantity in case'
            });
            var da = sublist_item.addField({
                id: 'custpage_item_quantity_received',
                type: serverWidget.FieldType.TEXT,
                label: 'quantity received'
            });
            var da = sublist_item.addField({
                id: 'custpage_item_fulfillment_network_sku',
                type: serverWidget.FieldType.TEXT,
                label: 'fulfillment network sku'
            });


            var line_item = form.getSublist({
                id: 'sublistid_ship_item'
            });
            for (var it_i = 0, it_len = item.length; it_i < it_len; it_i++) {
                line_item.setSublistValue({
                    id: 'custpage_item_shipment_id',
                    value: item[it_i].shipment_id,
                    line: it_i
                });
                line_item.setSublistValue({
                    id: 'custpage_item_seller_sku',
                    value: item[it_i].seller_sku,
                    line: it_i
                });
                line_item.setSublistValue({
                    id: 'custpage_item_quantity_shipped',
                    value: item[it_i].quantity_shipped,
                    line: it_i
                });
                line_item.setSublistValue({
                    id: 'custpage_item_quantity_in_case',
                    value: item[it_i].quantity_in_case,
                    line: it_i
                });
                line_item.setSublistValue({
                    id: 'custpage_item_quantity_received',
                    value: item[it_i].quantity_received,
                    line: it_i
                });
                line_item.setSublistValue({
                    id: 'custpage_item_fulfillment_network_sku',
                    value: item[it_i].fulfillment_network_sku,
                    line: it_i
                });
            }

        }


        form.addSubmitButton({
            label: '查询',
        });

        var s_account = form.addField({
            id: 'custpage_dps_account',
            type: serverWidget.FieldType.SELECT,
            source: 'customrecord_aio_account',
            label: '店铺',
            container: 'search_groupid'
        });
        s_account.defaultValue = account;

        var ship = form.addField({
            id: 'custpage_dps_shipment',
            type: serverWidget.FieldType.TEXT,
            label: 'ShipmentId',
            container: 'search_groupid'
        });
        ship.defaultValue = shipment;

        return form;

    }

    function tranferOrderToWMS(recIds) {

        // InMasterCreateRequestDto {
        //     boxNum(integer): 箱数,       1
        //     estimateTime(string): 预计到货时间,          1
        //     inspectionType(integer): 质检类型 10: 全检 20: 抽检,             1
        //     planQty(integer): 计划入库数量,
        //     pono(string, optional): 采购单号,
        //     purchaser(string): 采购员,
        //     remark(string, optional): 备注,                1
        //     skuList(Array[InDetailCreateRequestDto]): 入库SKU明细,
        //     sourceNo(string): 来源单号,                  1
        //     sourceType(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 借调入库,             1
        //     supplierCode(string, optional): 供应商编号,
        //     supplierName(string, optional): 供应商名称,
        //     taxFlag(integer): 是否含税 0: 否1: 是,               1
        //     tradeCompanyCode(string): 交易主体编号,              1
        //     tradeCompanyName(string): 交易主体名称,              1
        //     warehouseCode(string): 仓库编号,                 1
        //     warehouseName(string): 仓库名称,                 1
        //     waybillNo(string, optional): 运单号
        // }
        // InDetailCreateRequestDto {
        //     boxInfo(InDetailBoxInfoCreateRequestDto): 箱子信息,
        //     boxNum(integer): 箱数,
        //     inspectionType(integer): 质检类型 10: 全检 20: 抽检 30: 免检,
        //     planQty(integer): 计划入库数,
        //     productCode(string): 产品编号,
        //     productImageUrl(string): 图片路径,
        //     productTitle(string): 产品标题,
        //     remainderQty(integer): 余数,
        //     sku(string): sku,
        //     supplierVariant(string, optional): 供应商变体规格 json,
        //     variant(string, optional): 变体规格 json
        // }
        // InDetailBoxInfoCreateRequestDto {
        //     height(number): 高,
        //     length(number): 长,
        //     width(number): 宽
        // }


        var limit = 3999;

        var data = {};
        var itemInfo = [];
        data.sourceType = 30;
        data.estimateTime = new Date().toISOString();
        data.inspectionType = 10;
        data.boxNum = 10;
        data.taxFlag = 0;

        var planQty = 0;

        search.create({
            type: "transferorder",
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recIds
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "subsidiary", // 子公司
                // "transferlocation", // 入库地点
                "memo", // 备注
                "custbodyexpected_arrival_time", // 预计到货时间
                "tranid", // 订单号
                {
                    name: "custrecord_dps_wms_location",
                    join: "toLocation"
                }, // 仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: "toLocation"
                }, // 仓库名称

                "item", "quantity",
                {
                    name: 'custitem_dps_picture',
                    join: 'item'
                }, // 产品图片
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'item'
                }, // 中文标题
                {
                    name: 'custitem_dps_mpq',
                    join: 'item'
                }, // 每箱数量
            ]
        }).run().each(function(rec) {

            data.tradeCompanyCode = rec.getValue('subsidiary');
            data.tradeCompanyName = rec.getText('subsidiary').split(":").slice(-1)[0].trim();
            data.remark = rec.getValue('memo');



            var loca_code = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'toLocation'
            });

            var loca_name = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'toLocation'
            })
            log.audit('loca_code: ' + loca_code, 'loca_name: ' + loca_name)

            data.sourceNo = rec.getValue('tranid');
            data.warehouseCode = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'toLocation'
            });
            data.warehouseName = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'toLocation'
            });

            var temp_qty = Number(rec.getValue('quantity'));

            var mpq = rec.getValue({
                name: 'custitem_dps_mpq',
                join: 'item'
            });
            log.audit('mpq', mpq);

            var imgUrl = rec.getValue({
                name: 'custitem_dps_picture',
                join: 'item'
            })

            var it = {
                boxNum: 1,
                inspectionType: 30,
                planQty: temp_qty,
                productCode: rec.getValue('item'),
                productImageUrl: imgUrl ? imgUrl : 'imgUrl',
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'item'
                }),
                remainderQty: (temp_qty % (mpq ? mpq : 1)) ? (temp_qty % (mpq ? mpq : 1)) : 1,
                sku: rec.getText('item'),
            }

            if (temp_qty > 0) {
                planQty += temp_qty;
                itemInfo.push(it);
            }

            return --limit > 0;
        });
        data.skuList = itemInfo; //   货品数量
        data.planQty = planQty; //   计划入库数

        return data;

    }

    function inventoryAdjustment(recId) {

        var info = {};
        var limit = 3999;

        var TRANSACTION_TYPE = ["VendorReturns"];
        var DISPOSITION = ["CUSTOMER_DAMAGED", "DEFECTIVE", "DISTRIBUTOR_DAMAGED", "CARRIER_DAMAGED"];
        search.create({
            type: "customrecord_amazon_fulfill_invtory_rep",
            filters: [{
                    isnot: false,
                    isor: false,
                    name: "custrecord_invful_transation_type",
                    operator: "startswith",
                    values: ["VendorReturns"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["CARRIER_DAMAGED"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["DISTRIBUTOR_DAMAGED"]
                },
                {
                    isnot: false,
                    isor: true,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["DEFECTIVE"]
                },
                {
                    isnot: false,
                    isor: false,
                    name: "custrecord_invful_disposition",
                    operator: "is",
                    values: ["CUSTOMER_DAMAGED"]
                },
                {
                    name: 'custrecord_dps_invful_processed',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [{
                    name: "custrecord_division",
                    join: 'custrecord_invful_account'
                }, // 部门
                {
                    name: 'custrecord_aio_subsidiary',
                    join: 'custrecord_invful_account'
                }, // 子公司
                {
                    name: 'custrecord_aio_fbaorder_location',
                    join: 'custrecord_invful_account'
                }, // 地点
                {
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_invful_account'
                }, // sellerId
                "custrecord_invful_quantity", // 数量
                "custrecord_invful_transation_type", // TRANSACTION-TYPE
                "custrecord_invful_fnsku", // fnsku
                "custrecord_invful_sku", // SKU
                "custrecord_invful_snapshot_date", // SNAPSHOT-DATE
            ]
        }).run().each(function(r) {
            info = {
                snapshot_date: r.getValue('custrecord_invful_snapshot_date'),
                sellerId: r.getValue({
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_invful_account'
                }),
                subsidiary: r.getValue({
                    name: 'custrecord_aio_subsidiary',
                    join: 'custrecord_invful_account'
                }),
                department: r.getValue({
                    name: "custrecord_division",
                    join: 'custrecord_invful_account'
                }),
                location: r.getValue({
                    name: 'custrecord_aio_fbaorder_location',
                    join: 'custrecord_invful_account'
                }),
                qty: r.getValue('custrecord_invful_quantity'),
                transation_type: r.getValue('custrecord_invful_transation_type'),
                fnsku: r.getValue('custrecord_invful_fnsku'),
                sku: r.getValue('custrecord_invful_sku')
            }

            return --limit > 0;
        });

        search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: [{
                    name: 'custrecord_aio_seller_id',
                    join: 'custrecord_ass_account',
                    operator: 'is',
                    values: info.sellerId
                },
                {
                    name: 'name',
                    operator: 'is',
                    values: info.sku
                }
            ],
            columns: [
                "custrecord_ass_sku", // NS 货品
            ]
        }).run().each(function(rec) {
            info.itemId = rec.getValue('custrecord_ass_sku')
        });

        var invAdj = record.create({
            type: 'inventoryadjustment',

        });
        invAdj.setValue({
            fieldId: 'subsidiary',
            value: info.subsidiary
        });
        invAdj.setValue({
            fieldId: 'memo',
            value: "FBA仓报损"
        });
        invAdj.setValue({
            fieldId: 'account',
            value: 538
        });
        invAdj.setValue({
            fieldId: 'custbody_stock_use_type',
            value: 40
        });
        invAdj.setText({
            fieldId: 'trandate',
            text: info.snapshot_date
        });
        invAdj.setValue({
            fieldId: 'department',
            value: info.department
        });

        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'item',
            value: info.itemid,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'location',
            value: info.itemid,
            line: 0
        });
        invAdj.setSublistValue({
            sublistId: 'inventory',
            fieldId: 'adjustqtyby',
            value: info.qty,
            line: 0
        });

        var invAdj_id = invAdj.save();
        log.debug('库存调整单', invAdj_id);

    }


    /**
     * 交货单入库回传
     * @param {Object} context
     */
    function returnDelivery(context) {
        var ret = {};
        var sourceNo = context.sourceNo;
        var ret_id, wmsLocCode;
        search.create({
            type: 'customrecord_dps_delivery_order',
            filters: [{
                name: 'name',
                operator: 'is',
                values: sourceNo
            }],
            columns: [{
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dsp_delivery_order_location'
                }, // WMS仓库编码
            ]
        }).run().each(function(rec) {
            ret_id = rec.id;
            wmsLocCode = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dsp_delivery_order_location'
            })
        });


        // GC

        if (ret_id) {

            if (wmsLocCode == "GC") {

                var de_ord = [],
                    poNo, Loca,
                    limit = 3999;

                search.create({
                    type: 'customrecord_dps_delivery_order',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: ret_id
                    }],
                    columns: [{
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货货品
                        {
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货数量
                        "custrecord_dsp_delivery_order_location", // 地点
                        "custrecord_purchase_order_no", // 采购订单
                    ]
                }).run().each(function(r) {
                    poNo = r.getValue('custrecord_purchase_order_no');
                    Loca = r.getValue('custrecord_dsp_delivery_order_location');

                    var it = {
                        itemId: r.getValue({
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }),
                        qty: r.getValue({
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        })
                    }
                    de_ord.push(it);
                    return --limit > 0;
                });

                log.debug('地点', Loca);
                log.debug('采购订单', poNo);

                log.debug('de_ord', de_ord);
                if (poNo) {
                    var irObj = record.transform({
                        fromType: 'purchaseorder',
                        fromId: poNo,
                        toType: 'itemreceipt'
                    }); //转换为货品收据

                    var numLines = irObj.getLineCount({
                        sublistId: 'item'
                    });

                    for (var nu = 0; nu < numLines; nu++) {
                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: false,
                            line: nu
                        });
                    }


                    var irObj_id;
                    for (var i = 0, iLen = de_ord.length; i < iLen; i++) {
                        var temp = de_ord[i];
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: temp.itemId
                        });

                        log.debug('lineNumber', lineNumber);

                        if (lineNumber > -1) {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: temp.qty,
                                line: lineNumber
                            });
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: Loca,
                                line: lineNumber
                            });

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            });


                            var lo = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                // value: Loca,
                                line: lineNumber
                            });

                            log.debug('货品行地点', lo)

                        }
                    }

                    var irObj_id = irObj.save();

                    // 更改发运记录状态
                    record.submitFields({
                        type: 'customrecord_dps_delivery_order',
                        id: ret_id,
                        values: {
                            custrecord_delivery_order_status: 4
                        }
                    });
                    log.debug('工厂直发生成货品收据', irObj_id);

                    ret.code = 0;
                    ret.data = null;
                    ret.msg = 'NS 收货成功';
                    return ret;
                } else {

                    log.debug('交货单不存在对应的采购订单', "数据异常");
                    ret.code = 3;
                    ret.data = null;
                    ret.msg = 'unknown';
                    return ret;
                }

            } else {

                var detailList = context.detailList; // 入库明细
                log.debug('detailList', detailList);
                if (!detailList) {
                    log.debug('数据异常', "数据异常");
                    ret.code = 7;
                    ret.data = null;
                    ret.msg = '传入的数据异常';
                    return ret;
                }

                var getBinArr = tool.getAllBinBox(detailList);
                var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

                if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                    retjson.code = 3;
                    retjson.data = null;
                    retjson.msg = 'unknown: ' + getArr;
                    log.debug('不存在库位 : ', retjson);
                    return retjson;
                }

                log.debug('开始加载 交货单记录', "load")
                var objRecord = record.load({
                    type: 'customrecord_dps_delivery_order',
                    id: ret_id
                });

                objRecord.setValue({
                    fieldId: 'custrecord_delivery_order_status',
                    value: 4
                });

                objRecord.setValue({
                    fieldId: 'custrecord_dps_warehousing_end',
                    value: true
                });

                var count = objRecord.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                log.debug('开始修改交货单', '货品行上的值');
                if (context.detailList.length > 0) {
                    context.detailList.map(function(line) {
                        for (var i = 0; i < count; i++) {
                            var item_sku = objRecord.getSublistText({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_sku',
                                line: i
                            });
                            if (line.sku == item_sku) {
                                objRecord.setSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_stock_quantity',
                                    value: line.shelvesQty,
                                    line: i
                                })
                            }
                        }
                    });
                }

                var devLocation = objRecord.getValue('custrecord_dsp_delivery_order_location'); // 获取交货单的地点
                var poId = objRecord.getValue('custrecord_purchase_order_no'); // 关联的采购订单
                log.debug('履行采购订单', 'Starts');
                var receipt_id = createItemReceipt(poId, context.detailList, devLocation);
                log.debug('履行采购订单', 'End');
                if (receipt_id && receipt_id.length > 0) { // 存在货品收据

                    // var objRecord_id = objRecord.save();

                    log.debug('更新交货单成功 objRecord_id', objRecord_id);

                    log.debug('NS 处理成功', "NS 处理成功");
                    ret.code = 0;
                    ret.data = null;
                    ret.msg = 'NS 处理成功';
                    return ret;
                } else {
                    log.debug('NS 处理异常', "NS 处理异常");
                    ret.code = 6;
                    ret.data = null;
                    ret.msg = 'NS 处理异常';
                    return ret;
                }
            }

        } else {
            log.debug('未知单号', sourceNo)
            ret.code = 3;
            ret.data = null;
            ret.msg = 'unknown: ' + sourceNo;
        }
        return ret;
    }


    function createItemReceipt(po_id, itemList, location) {

        log.audit('交货单地点', location);
        log.debug('开始生成货品收据: ' + po_id, JSON.stringify(itemList));

        var cLimit = 3999,
            fItemArr = [];
        var fiObj = {};
        search.create({
            type: 'purchaseorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [po_id]
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "item",
                "quantity"
            ]
        }).run().each(function(rec) {
            var it = {
                itemId: rec.getValue('item'),
                itemName: rec.getText('item')
            }
            fiObj[rec.getText('item')] = rec.getValue('item')
            fItemArr.push(it)
            return --cLimit > 0;
        })

        log.audit('采购订单的货品', fItemArr);

        var irArr = [];
        var getABox = tool.getAllBinBox(itemList);
        log.debug('库位 箱号 ', getABox);
        var binBoxObj = tool.SummaryBinBox(getABox);

        log.debug('库位箱号分组 ', binBoxObj);

        var boxObj = binBoxObj.BoxObj,
            binObj = binBoxObj.BinObj

        var BoxObjKey = Object.keys(boxObj);
        log.debug('箱号的值', BoxObjKey);
        var BinObjKey = Object.keys(binObj);
        log.debug('库位的值', BinObjKey);

        log.debug('库位 BinObjKey', BinObjKey);
        log.debug('箱号 BoxObjKey', BoxObjKey);

        if (BoxObjKey && BoxObjKey.length > 0) {

            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 每个箱号履行

                var boxKey = BoxObjKey[i];
                var temp_obj = boxObj[boxKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: dl_sku.shelvesQty,
                            line: lineNumber
                        }); // 设置数量

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: dl_sku.positionCode,
                            line: lineNumber
                        }); // 仓库编号

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_case_number',
                            text: boxKey,
                            line: lineNumber
                        }); // 箱号

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: true,
                            line: lineNumber
                        }); // 设置为收货
                        // }
                    }
                }

            }
            var irObj_id = irObj.save();

            irArr.push(irObj_id);

            log.debug("货品收据 irObj_id", irObj_id);
        }

        if (BinObjKey && BinObjKey.length > 0) {
            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 每个库位履行

                var binKey = BinObjKey[i];
                var temp_obj = binObj[binKey];

                log.debug('temp_obj', temp_obj);
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[j];

                    // log.debug('dl_sku: ' + j, dl_sku)

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: dl_sku.shelvesQty,
                            line: lineNumber
                        }); // 设置数量

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: dl_sku.positionCode,
                            line: lineNumber
                        }); // 仓库编号

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: true,
                            line: lineNumber
                        }); // 设置为收货

                    }
                }
            }
            var irObj_id = irObj.save();
            irArr.push(irObj_id);
            log.debug("货品收据 irObj_id", irObj_id);
        }

        return irArr || false;
    }


    function toWMS() {
        var context = {};
        context.recordID = 737;
        var tranOrder;
        var data = {};
        var tranType, fbaAccount;
        var ful_to_link;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                'custrecord_dps_shipping_rec_transport',
                'custrecord_dps_shipping_rec_order_num',
                // 'owner',
                'custrecord_dps_shipping_rec_currency',
                'custrecord_dps_declared_value_dh',
                'custrecord_dps_shipping_rec_account',
                'custrecord_dps_shipping_r_channelservice',
                'custrecord_dps_shipping_r_channel_dealer',
                'custrecord_dps_shipping_rec_shipments',
                'custrecord_dps_shipping_rec_location',
                'custrecord_dps_shipping_rec_to_location',
                'custrecord_dps_shipping_rec_transa_subje',
                'custrecord_dps_shipping_rec_logistics_no',
                'custrecord_dps_f_b_purpose', // 用途
                'custrecord_dps_declare_currency_dh', // 申报币种
                'custrecord_dps_shipping_rec_shipmentsid', // shipmentId

                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库名称
                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库名称
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码

                {
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 计泡基数
                // {
                //     name: "entityid",
                //     join: "owner"
                // }, // 拥有者

                {
                    name: 'custrecord_aio_marketplace',
                    join: 'custrecord_dps_shipping_rec_account'
                }, // 站点 / 市场

                "custrecord_dps_shipping_rec_destinationf", // 仓库中心
                "custrecord_dps_ship_remark", // 备注

                {
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 调拨单号
                "custrecord_dps_to_shipment_name", // shipment name
                "custrecord_dps_to_reference_id", // reference id
            ]
        }).run().each(function(rec) {

            tranOrder = rec.getValue('custrecord_dps_shipping_rec_order_num')

            ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
            var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

            var shippingType;
            // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
            // 1	空运   2	海运   3	铁路    4   快船
            if (rec_transport == 1) {
                shippingType = 10;
            } else if (rec_transport == 4) {
                shippingType = 30;
            } else if (rec_transport == 2) {
                shippingType = 20;
            } else if (rec_transport == 3) {
                shippingType = 40
            }

            data["remark"] = rec.getValue('custrecord_dps_ship_remark') ? rec.getValue('custrecord_dps_ship_remark') : ''; // 备注字段

            data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");
            data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment name

            data["shippingType"] = shippingType;
            data["aono"] = rec.getValue({
                name: "tranid",
                join: "custrecord_dps_shipping_rec_order_num"
            });

            // data["createBy"] = rec.getValue({
            //     name: "entityid",
            //     join: "owner"
            // });

            data["marketplaces"] = rec.getText({
                name: 'custrecord_aio_marketplace',
                join: 'custrecord_dps_shipping_rec_account'
            });
            data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

            data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));
            fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
            data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

            data["countBubbleBase"] = Number(rec.getValue({
                name: 'custrecord_ls_bubble_count',
                join: 'custrecord_dps_shipping_r_channelservice'
            }));
            data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
            data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
            data["logisticsLabelPath"] = 'logisticsLabelPath';

            data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

            // data["logisticsProviderCode"] = rec.getValue({
            //     name: 'custrecord_ls_service_code',
            //     join: 'custrecord_dps_shipping_r_channelservice'
            // });

            var channel_dealer = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            var channel_dealerText = rec.getText('custrecord_dps_shipping_r_channel_dealer');

            var logiFlag = 1;
            if (channel_dealer == 6 || channel_dealerText == "Amazon龙舟") {
                logiFlag = 0;
            }

            // logisticsFlag (integer): 是否需要物流面单 0:否 1:是
            // FIXME 需要判断物流渠道是否存在面单文件,
            data["logisticsFlag"] = logiFlag;


            data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

            data["sourceWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_location'
            });
            data["sourceWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_location'
            });

            data["targetWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["targetWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["taxFlag"] = 1;
            data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

            var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
            var b = a.split(':');
            data["tradeCompanyName"] = b[b.length - 1];
            // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

            var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

            var type = 10;
            // 1 FBA调拨    2 自营仓调拨   3 跨仓调拨   4 移库

            var waybillNo;

            if (type1 == 1) {
                type = 20;
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
            } else {
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
            }

            data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
            data["type"] = type;
            data["waybillNo"] = waybillNo; // 运单号
        });



        var createdBy, to_aono;
        search.create({
            type: 'transferorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: ful_to_link
            }],
            columns: [
                "createdby",
                // {
                //     name: "tranid",
                //     join: "custrecord_dps_shipping_rec_order_num"
                // }, // 调拨单号
            ]
        }).run().each(function(rec) {
            createdBy = rec.getText('createdby');
            // to_aono = rec.getValue({
            //     name: "tranid",
            //     join: "custrecord_dps_shipping_rec_order_num"
            // });
        });


        // data["aono"] = to_aono;

        data["createBy"] = createdBy; // 设置调拨单创建者

        var taxamount;
        var item_info = [];
        var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
        // var numLines = af_rec.getLineCount({
        //     sublistId: subli_id
        // });


        var itemArr = [];
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [{
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_msku'
                },
                {
                    name: 'custrecord_dps_f_b_purpose',
                    join: 'custrecord_dps_shipping_record_parentrec'
                },
                {
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                },
                {
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custrecord_dps_ship_record_sku_item'
                },
                {
                    name: 'custrecord_dps_ship_record_item_quantity'
                },

                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品重量(cm),
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品高(cm),
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品长(cm),
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品宽(cm),
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 品牌名称,
                {
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品英文标题,

                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                },
                'custrecord_dps_shipping_record_item', // 货品

                // {
                //     name: 'taxamount',
                //     join: 'custrecord_dps_trans_order_link'
                // }

                {
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }, // 材质  material
                {
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }, // 物流分组 logisticsGroup
                {
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                }, // 采购成本  purchaseCost
                {
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }, // 英文标题/描述 englishTitle
            ]
        }).run().each(function(rec) {

            // AllocationDetailCreateRequestDto{
            //     asin(string): ASIN,
            //     brandName(string): 品牌名称,
            //     englishTitle(string): 产品英文标题,
            //     fnsku(string): FNSKU,
            //     msku(string): MSKU,
            //     productCode(string, optional): 产品编号,
            //     productHeight(number): 产品高(cm),
            //     productImageUrl(string): 图片路径,
            //     productLength(number): 产品长(cm),
            //     productTitle(string): 产品标题,
            //     productWeight(number): 产品重量(g),
            //     productWidth(number): 产品宽(cm),
            //     purpose(string): 用途,
            //     qty(integer): 数量,
            //     sku(string): SKU,
            //   }

            itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
            var purchaseCost = rec.getValue({
                name: "cost",
                join: "custrecord_dps_shipping_record_item"
            });
            var it = {
                englishTitle: rec.getValue({
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }),
                purchaseCost: Number(purchaseCost),
                logisticsGroup: rec.getText({
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }),
                material: rec.getText({
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }),
                itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                asin: rec.getValue({
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                fnsku: rec.getValue({
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                }),

                msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                englishTitle: rec.getValue({
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productImageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productHeight: Number(rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productLength: Number(rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productWeight: Number(rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                })),
                productWidth: Number(rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                sku: rec.getValue({
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
            };
            taxamount = rec.getValue({
                name: 'taxamount',
                join: 'custrecord_dps_trans_order_link'
            });
            item_info.push(it);

            return true;

        });

        log.debug('itemArr', itemArr);

        // 2020/7/18 13：44 改动
        var fils = [],
            add_fils = []; //过滤
        var len = item_info.length,
            num = 0;
        var checkArr = [];
        item_info.map(function(ld) {
            num++;
            if (ld.msku) { // 存在 msku
                add_fils.push([
                    ["name", "is", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            } else { // 不存在 msku
                add_fils.push([
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            }
            if (num < len)
                add_fils.push("or");
        });
        fils.push(add_fils);
        fils.push("and",
            ["custrecord_ass_account", "anyof", fbaAccount]
        );
        fils.push("and",
            ["isinactive", "is", false]
        );
        log.debug('fils', fils);
        log.debug('item_info', item_info);
        var newItemInfo = [];

        if (tranType == 1) {
            var new_limit = 3999;
            log.debug("fils:::::", fils)
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fils,
                columns: [
                    "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                ]
            }).run().each(function(rec) {
                // log.debug("rec.id ::::::: ", rec.id)
                var it = rec.getValue('custrecord_ass_sku');
                item_info.forEach(function(item, key) {

                    // log.debug('item.itemId: ' + item.itemId, "it: " + it);

                    if (item.itemId == it) {
                        item.asin = rec.getValue("custrecord_ass_asin");
                        item.fnsku = rec.getValue("custrecord_ass_fnsku")
                        item.msku = rec.getValue('name');
                        newItemInfo.push(item);
                    }
                });
                return --new_limit > 0;
            });

            log.debug('newItemInfo', newItemInfo);

            if (newItemInfo && newItemInfo.length == 0) {

                message.code = 3;
                message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    }
                });

                return message;
            }

            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(context.recordID, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0) {

                message.code = 3;
                message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                    }
                });

                return message;
            }


            data['allocationDetailCreateRequestDtos'] = newItemInfo;
        } else {
            data['allocationDetailCreateRequestDtos'] = item_info;
        }

        log.audit('newItemInfo', newItemInfo);
        if (Number(taxamount) > 0) {
            data["taxFlag"] = 1;
        } else {
            data["taxFlag"] = 0;
        }
        // log.error('item_info', item_info);
        // data['allocationDetailCreateRequestDtos'] = newItemInfo;



        log.error('参数 data', data);
        // 发送请求

    }


    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 1
            }],
            columns: ['custrecord_wtr_token']
        }).run().each(function(result) {
            token = result.getValue('custrecord_wtr_token');
        });
        return token;
    }



    function others() {

        return;
    }
    return {
        onRequest: onRequest
    }



    function wms(af_rec) {
        // 推送 WMS, 获取装箱信息

        var flagLocation;

        //     1 FBA仓   2 自营仓   3 工厂仓   4 虚拟仓    5 虚拟在途仓
        // 先判断起始仓库是否为工厂仓
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [{
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 财务分仓 类型
            ]
        }).run().each(function(rec) {
            flagLocation = rec.getValue({
                name: 'custrecord_dps_financia_warehous',
                join: 'custrecord_dps_shipping_rec_location'
            }); // 仓库的财务分仓
        });

        log.audit('仓库类型 flagLocation', flagLocation);
        if (flagLocation == 3) { // 属于财务分仓属于 工厂仓

            // 27	等待录入装箱信息
            log.debug('发出仓库属于工厂仓', "直接退出, 不推送WMS")


            return;
        }

        var rec_transport = af_rec.getValue('custrecord_dps_shipping_rec_transport');
        var shippingType;
        // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
        // 1	空运   2	海运   3	铁路    4   快船
        if (rec_transport == 1) {
            shippingType = 10;
        } else if (rec_transport == 4) {
            shippingType = 30;
        } else if (rec_transport == 2) {
            shippingType = 20;
        } else if (rec_transport == 3) {
            shippingType = 40
        }


        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};
            var tranType, fbaAccount, logisticsFlag = 0;

            var ful_to_link;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_dps_shipping_rec_transport',
                    'custrecord_dps_shipping_rec_order_num', // 调拨单号
                    {
                        name: 'tranid',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    },
                    // 'owner',
                    'custrecord_dps_shipping_rec_currency',
                    'custrecord_dps_declared_value_dh',
                    'custrecord_dps_shipping_rec_account',
                    'custrecord_dps_shipping_r_channelservice',
                    'custrecord_dps_shipping_r_channel_dealer',
                    'custrecord_dps_shipping_rec_shipments',
                    'custrecord_dps_shipping_rec_location',
                    'custrecord_dps_shipping_rec_to_location',
                    'custrecord_dps_shipping_rec_transa_subje',
                    'custrecord_dps_shipping_rec_logistics_no',
                    'custrecord_dps_f_b_purpose', // 用途
                    'custrecord_dps_declare_currency_dh', // 申报币种
                    'custrecord_dps_shipping_rec_shipmentsid', // shipmentId
                    "custrecord_dps_shipping_rec_destinationf", // 仓库中心编号

                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 仓库编号
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 仓库名称
                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    }, // 目标仓库编号
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    }, // 目标仓库名称
                    {
                        name: 'custrecord_ls_service_code',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 渠道服务代码
                    {
                        name: 'custrecord_ls_is_face',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 渠道服务存在面单文件

                    {
                        name: 'custrecord_ls_bubble_count',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 计泡基数
                    {
                        name: "entityid",
                        join: "owner"
                    }, // 拥有者

                    {
                        name: 'custrecord_aio_marketplace',
                        join: 'custrecord_dps_shipping_rec_account'
                    }, // 站点 / 市场
                    {
                        name: 'custrecord_dps_ship_remark'
                    }, // 备注
                    "custrecord_dps_to_shipment_name", // shipment name
                    "custrecord_dps_to_reference_id", // reference id
                ]
            }).run().each(function(rec) {

                ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
                var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');
                var shippingType;
                // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
                // 1	空运   2	海运   3	铁路    4   快船
                if (rec_transport == 1) {
                    shippingType = 10;
                } else if (rec_transport == 4) {
                    shippingType = 30;
                } else if (rec_transport == 2) {
                    shippingType = 20;
                } else if (rec_transport == 3) {
                    shippingType = 40
                }

                data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");

                data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment
                data["shippingType"] = shippingType;
                data["aono"] = rec.getValue({
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });
                data["createBy"] = rec.getValue({
                    name: "entityid",
                    join: "owner"
                });

                data["marketplaces"] = rec.getText({
                    name: 'custrecord_aio_marketplace',
                    join: 'custrecord_dps_shipping_rec_account'
                });
                data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

                data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));
                fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
                data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

                data["countBubbleBase"] = Number(rec.getValue({
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }));
                data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
                data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
                data["logisticsLabelPath"] = 'logisticsLabelPath';

                data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

                logisticsFlag = rec.getValue({
                    name: 'custrecord_ls_is_face',
                    join: 'custrecord_dps_shipping_r_channelservice'
                })

                if (logisticsFlag) {
                    data["logisticsFlag"] = 1;
                } else {
                    data["logisticsFlag"] = 0;
                }
                // logisticsFlag (integer): 是否需要物流面单 0:否 1:是

                data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

                data["sourceWarehouseCode"] = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                });
                data["sourceWarehouseName"] = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                });

                data["targetWarehouseCode"] = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                data["targetWarehouseName"] = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                data["taxFlag"] = 1;
                data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                var b = a.split(':');
                data["tradeCompanyName"] = b[b.length - 1];
                // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

                var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

                tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

                var type = 10;
                // 1 FBA调拨         2 自营仓调拨             3 跨仓调拨            4 移库

                var waybillNo;

                if (type1 == 1) {
                    type = 20;
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                } else {
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
                }
                data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
                data["type"] = type;
                data["remark"] = rec.getValue('custrecord_dps_ship_remark'); // 备注字段
                data["waybillNo"] = waybillNo; // 运单号
            });

            var createdBy;
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: ful_to_link
                }],
                columns: [
                    "createdby"
                ]
            }).run().each(function(rec) {
                createdBy = rec.getText('createdby');
            });

            data["createBy"] = createdBy; // 设置调拨单创建者

            var taxamount;
            var item_info = [];
            var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
            // var numLines = af_rec.getLineCount({
            //     sublistId: subli_id
            // });


            var itemArr = [];
            var ful_limit = 3999;
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [{
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_msku'
                    },
                    {
                        name: 'custrecord_dps_f_b_purpose',
                        join: 'custrecord_dps_shipping_record_parentrec'
                    },
                    {
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_fnsku'
                    },
                    {
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'itemid',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custrecord_dps_ship_record_sku_item'
                    },
                    {
                        name: 'custrecord_dps_ship_record_item_quantity'
                    },

                    {
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品重量(cm),
                    {
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品高(cm),
                    {
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品长(cm),
                    {
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品宽(cm),
                    {
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 品牌名称,
                    {
                        name: 'custitem_dps_declaration_us',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品英文标题,

                    {
                        name: 'custitem_dps_use',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    'custrecord_dps_shipping_record_item', // 货品
                    'custrecord_dps_ship_record_sku_item', //seller sku
                    // {
                    //     name: 'taxamount',
                    //     join: 'custrecord_dps_trans_order_link'
                    // }

                    {
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 材质  material
                    {
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 物流分组 logisticsGroup
                    {
                        name: "cost",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 采购成本  purchaseCost
                    {
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 英文标题/描述 englishTitle
                ]
            }).run().each(function(rec) {

                itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));

                var purchaseCost = rec.getValue({
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                });
                var it = {
                    englishTitle: rec.getValue({
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    purchaseCost: Number(purchaseCost),
                    logisticsGroup: rec.getText({
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    material: rec.getText({
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                    purpose: rec.getValue({
                        name: 'custitem_dps_use',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    brandName: rec.getText({
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    asin: rec.getValue({
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    fnsku: rec.getValue({
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_fnsku'
                    }),

                    msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                    // englishTitle: rec.getValue({
                    //     name: 'custitem_dps_declaration_us',
                    //     join: 'custrecord_dps_shipping_record_item'
                    // }),
                    productImageUrl: rec.getValue({
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productTitle: rec.getValue({
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productHeight: Number(rec.getValue({
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productLength: Number(rec.getValue({
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productWeight: Number(rec.getValue({
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productWidth: Number(rec.getValue({
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    sku: rec.getValue({
                        name: 'itemid',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
                };
                taxamount = rec.getValue({
                    name: 'taxamount',
                    join: 'custrecord_dps_trans_order_link'
                });
                item_info.push(it);

                return --ful_limit > 0;
            });

            log.debug('itemArr', itemArr);
            log.debug('item_info', item_info);
            // 2020/7/18 13：44 改动
            var fils = [],
                add_fils = []; //过滤
            var len = item_info.length,
                num = 0;
            item_info.map(function(ld) {
                num++;
                add_fils.push([
                    ["name", "contains", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
                if (num < len)
                    add_fils.push("or");
            });
            fils.push(add_fils);
            fils.push("and",
                ["custrecord_ass_account", "anyof", fbaAccount]
            );
            // fils.push("and",
            //     ["isinactive", "is", false]
            // );
            log.debug('fils', fils);
            log.debug('item_info', item_info);
            var newItemInfo = [];

            log.debug('推送 WMS tranType', tranType);
            if (tranType == 1) {

                if (!fbaAccount) {
                    message.code = 3;
                    message.data = 'FBA 调拨 不存在店铺';
                    log.debug('message', message);

                    return message;
                }

                var search_item = [];
                var new_limit = 3999;
                var fls_skus = [];
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: fils,
                    columns: [
                        "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                    ]
                }).run().each(function(rec) {
                    var temp_name = rec.getValue('name');
                    var it = rec.getValue('custrecord_ass_sku');
                    search_item.push(it)

                    log.error('temp_name: ' + temp_name, "it: " + it);

                    item_info.map(function(item, key) {

                        if (item.itemId == it && item.msku.trim() == temp_name.trim() && fls_skus.indexOf(temp_name) == -1) {
                            item.asin = rec.getValue("custrecord_ass_asin");
                            item.fnsku = rec.getValue("custrecord_ass_fnsku");
                            item.msku = rec.getValue('name');
                            newItemInfo.push(item);
                            fls_skus.push(temp_name);
                        }
                    });
                    return --new_limit > 0;
                });

                log.audit('search_item search', search_item);
                log.audit('item_info search', item_info);
                log.audit('fls_skus', fls_skus);
                log.debug('newItemInfo ', newItemInfo);

                if (newItemInfo && newItemInfo.length == 0) {

                    message.code = 3;
                    message.data = 'Amazon Seller SKU 中找不到对应的映射关系';


                    log.debug('message', message);

                    return message;
                }


                var getPoObj = tool.searchToLinkPO(itemArr, ful_to_link);

                newItemInfo.map(function(newItem) {
                    var itemId = newItem.itemId;
                    newItem.pono = getPoObj[itemId]
                });


                data['allocationDetailCreateRequestDtos'] = newItemInfo;
            } else {
                data['allocationDetailCreateRequestDtos'] = item_info;
            }

            log.audit('newItemInfo', newItemInfo);

            if (Number(taxamount) > 0) {
                data["taxFlag"] = 1;
            } else {
                data["taxFlag"] = 0;
            }


            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(af_rec.id, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0 && tranType == 1) {

                message.code = 3;
                message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                log.debug('message', message);

                return message;
            }


            // 发送请求
            // message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';

            log.debug('message', message);

        }


    }





    function getWeekOfYear() {
        var today = new Date();
        var firstDay = new Date(today.getFullYear(), 0, 1);
        var dayOfWeek = firstDay.getDay();
        var spendDay = 1;
        if (dayOfWeek != 0) {
            spendDay = 7 - dayOfWeek + 1;
        }
        firstDay = new Date(today.getFullYear(), 0, 1 + spendDay);
        var d = Math.ceil((today.valueOf() - firstDay.valueOf()) / 86400000);
        var result = Math.ceil(d / 7);
        return result + 1;
    };


    /**
     * 这个方法将取得某年(year)第几周(weeks)的星期几(weekDay)的日期
     * @param {*} year
     * @param {*} weeks
     * @param {*} weekDay
     */
    function getXDate(year, weeks, weekDay) {
        // 用指定的年构造一个日期对象，并将日期设置成这个年的1月1日
        // 因为计算机中的月份是从0开始的,所以有如下的构造方法
        var date = new Date(year, "0", "1");

        log.debug('year', date);

        // 取得这个日期对象 date 的长整形时间 time
        var time = date.getTime();

        // 将这个长整形时间加上第N周的时间偏移
        // 因为第一周就是当前周,所以有:weeks-1,以此类推
        // 7*24*3600000 是一星期的时间毫秒数,(JS中的日期精确到毫秒)
        time += (weeks - 1) * 7 * 24 * 3600000;

        time -= 8 * 3600000 + 1; // 加 8 小时

        // 为日期对象 date 重新设置成时间 time
        date.setTime(time);

        log.debug('date', date);
        return getNextDate(date, weekDay);
    }


    function getNextDate(nowDate, weekDay) {
        // 0是星期日,1是星期一,...

        // 0123456  - 日一二三四五六
        weekDay %= 7;

        log.debug('weekDay', weekDay);
        var day = nowDate.getDay();
        log.debug('day', day);
        var time = nowDate.getTime();
        var sub = weekDay - day;
        if (sub <= 0) {
            sub += 7;
        }

        log.debug('sub', sub);
        time += sub * 24 * 3600000;
        nowDate.setTime(time);
        return nowDate;
    }


    /**
     * 格式化时间函数
     * @param {format} 时间显示格式
     */
    Date.prototype.format = function(format) {
        var date = {
            "M+": this.getMonth() + 1, //月份
            "d+": this.getDate(), //日
            "h+": this.getHours(), //小时
            "m+": this.getMinutes(), //分
            "s+": this.getSeconds(), //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds() //毫秒
        };
        if (/(y+)/i.test(format)) {
            format = format.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
        }
        for (var k in date) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? date[k] : ("00" + date[k]).substr(("" + date[k]).length));
            }
        }
        return format;
    };

    //通过周取日期范围   year 年   weeks 周
    function weekGetDate(year, weeks) {
        var date = new Date(year, "0", "1");

        // 获取当前星期几,0:星期一
        var time = date.getTime();
        //当这一年的1月1日为周日时则本年有54周,否则没有54周,没有则去除第54周的提示
        var _week = date.getDay();

        if (_week != 0) { //一年53周情况
            if (weeks == 54) {
                return '今年没有54周';
            }
            var cnt = 0; // 获取距离周末的天数
            if (_week == 0) {
                cnt = 7;
            } else if (_week == 1) {
                cnt = 6;
            } else if (_week == 2) {
                cnt = 5;
            } else if (_week == 3) {
                cnt = 4;
            } else if (_week == 4) {
                cnt = 3;
            } else if (_week == 5) {
                cnt = 2;
            } else if (_week == 6) {
                cnt = 1;
            }
            cnt += 1; //加1表示以星期一为一周的第一天    // 将这个长整形时间加上第N周的时间偏移
            time += cnt * 24 * 3600000; //第2周开始时间
            var nextYear = new Date(parseInt(year, 10) + 1, "0", "1");
            var nextWeek = nextYear.getDay();
            var lastcnt = 0; //获取最后一周开始时间到周末的天数
            if (nextWeek == 0) {
                lastcnt = 6;
            } else if (nextWeek == 1) {
                lastcnt = 0;
            } else if (nextWeek == 2) {
                lastcnt = 1;
            } else if (nextWeek == 3) {
                lastcnt = 2;
            } else if (nextWeek == 4) {
                lastcnt = 3;
            } else if (nextWeek == 5) {
                lastcnt = 4;
            } else if (nextWeek == 6) {
                lastcnt = 5;
            }
            if (weeks == 1) { //第1周特殊处理    // 为日期对象 date 重新设置成时间 time
                var start = date.Format("yyyy-MM-dd");
                date.setTime(time - 24 * 3600000);
                var end = date.Format("yyyy-MM-dd");
                return start + "-----" + end;
            } else if (weeks == 53) { //第53周特殊处理
                //第53周开始时间
                var start = time + (weeks - 2) * 7 * 24 * 3600000;
                //第53周结束时间
                var end = time + (weeks - 2) * 7 * 24 * 3600000 + lastcnt * 24 * 3600000 - 24 * 3600000;
                date.setTime(start);
                var _start = date.Format("yyyy-MM-dd");
                date.setTime(end);
                var _end = date.Format("yyyy-MM-dd");
                return _start + "-----" + _end;
            } else {
                var start = time + (weeks - 2) * 7 * 24 * 3600000; //第n周开始时间
                var end = time + (weeks - 1) * 7 * 24 * 3600000 - 24 * 3600000; //第n周结束时间
                date.setTime(start);
                var _start = date.Format("yyyy-MM-dd");
                date.setTime(end);
                var _end = date.Format("yyyy-MM-dd");
                return _start + "-----" + _end;
            }
        } else { //一年54周情况
            var cnt = 0; // 获取距离周末的天数
            if (_week == 0 && weeks == 1) { //第一周
                cnt = 0;
            } else if (_week == 0) {
                cnt = 7;
            } else if (_week == 1) {
                cnt = 6;
            } else if (_week == 2) {
                cnt = 5;
            } else if (_week == 3) {
                cnt = 4;
            } else if (_week == 4) {
                cnt = 3;
            } else if (_week == 5) {
                cnt = 2;
            } else if (_week == 6) {
                cnt = 1;
            }
            cnt += 1; //加1表示以星期一为一周的第一天
            // 将这个长整形时间加上第N周的时间偏移
            time += 24 * 3600000; //第2周开始时间
            var nextYear = new Date(parseInt(year, 10) + 1, "0", "1");
            var nextWeek = nextYear.getDay();
            var lastcnt = 0; //获取最后一周开始时间到周末的天数
            if (nextWeek == 0) {
                lastcnt = 6;
            } else if (nextWeek == 1) {
                lastcnt = 0;
            } else if (nextWeek == 2) {
                lastcnt = 1;
            } else if (nextWeek == 3) {
                lastcnt = 2;
            } else if (nextWeek == 4) {
                lastcnt = 3;
            } else if (nextWeek == 5) {
                lastcnt = 4;
            } else if (nextWeek == 6) {
                lastcnt = 5;
            }
            if (weeks == 1) { //第1周特殊处理
                var start = date.Format("yyyy-MM-dd");
                date.setTime(time - 24 * 3600000);
                var end = date.Format("yyyy-MM-dd");
                return _start + "-----" + end;
            } else if (weeks == 54) { //第54周特殊处理
                //第54周开始时间
                var start = time + (weeks - 2) * 7 * 24 * 3600000;
                //第53周结束时间
                var end = time + (weeks - 2) * 7 * 24 * 3600000 + lastcnt * 24 * 3600000 - 24 * 3600000;
                date.setTime(start);
                var _start = date.Format("yyyy-MM-dd");
                date.setTime(end);
                var _end = date.Format("yyyy-MM-dd");
                return _start + "-----" + _end;
            } else {
                var start = time + (weeks - 2) * 7 * 24 * 3600000; //第n周开始时间
                var end = time + (weeks - 1) * 7 * 24 * 3600000 - 24 * 3600000; //第n周结束时间
                date.setTime(start);
                var _start = date.Format("yyyy-MM-dd");
                date.setTime(end);
                var _end = date.Format("yyyy-MM-dd");
                return _start + "-----" + _end;
            }
        }
    }


});


account_arr = [95, 216, 215, 35, 80, 87, 60, 135,
    31, 217, 47, 46, 200, 412, 194, 13, 153, 152,
    104, 24, 137, 3, 334, 101, 231, 173, 177, 159,
    207, 124, 130, 102, 201, 148, 21, 335, 326, 220,
    58, 69, 212, 54, 48, 205, 61, 327, 77, 37, 38,
    36, 185, 182, 43, 413, 202, 165, 181, 322,
    522, 50, 9, 116, 110, 106, 143, 105, 521, 330,
    331, 98, 523, 155, 223, 160, 154, 228, 163, 206,
    157, 518, 19, 120, 89, 12, 85, 199, 147, 138,
    25, 84, 213, 109, 81, 519
];


accArr = [134, 122, 79, 14, 87, 31, 13, 104, 24, 3,
    207, 130, 21, 220, 54, 48, 165, 9, 110, 106, 143,
    98, 206, 157, 19, 120, 89, 12, 25, 109
]



accArr = [134, 13, 104, 24, 130, 21, 220, 54, 48, 9, 106, 19, 120, 12]