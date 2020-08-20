/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-06 17:36:22
 * @LastEditTime   : 2020-08-19 21:19:15
 * @FilePath       : \Rantion\cux\Requirements_Planning\store_demand_cs.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/ui/dialog', 'N/https', 'N/currentRecord', 'N/runtime', 'N/format', '../../Helper/Moment.min', 'N/search', 'N/record'],
    function (url, dialog, https, currentRecord, runtime, format, moment, search, record) {
        var rec, sublistId = 'custpage_sublist',
            week_rs, func_type

        function pageInit(context) {
            rec = context.currentRecord; // 当前记录

        }

        function saveRecord(context) {
            return true
        }

        function validateField(context) {
            if (context.fieldId == 'custpage_select_page') {
                selectPage()
            } else if (context.fieldId == 'custpage_page_size') {
                pigeSizeChange()
            }
            return true
        }

        function fieldChanged(context) {
            var cur = context.currentRecord;
            var fieldId = context.fieldId;
            var data_type_id = cur.getCurrentSublistValue({
                sublistId: sublistId,
                fieldId: 'custpage_data_type_id'
            });
            if (fieldId != 'custpage_account_store' && fieldId != 'custpage_site' && fieldId != 'custpage_item' &&
                fieldId != 'custpage_date_from' && fieldId != 'custpage_date_to' && data_type_id != 5 &&
                data_type_id != 23 &&
                fieldId != 'custpage_page_size' && fieldId != 'custpage_department'
            ) {
                function success(result) {
                    console.log('Success with value: ' + result);
                    window.onbeforeunload = null;
                    window.location.reload(true);
                }

                function failure(reason) {
                    console.log('Failure: ' + reason)
                }

                dialog.alert({
                    title: '提示',
                    message: '不允许进行修改！'
                }).then(success).catch(failure)
                return
            } else {

                if (fieldId == 'custpage_date_from' || fieldId == 'custpage_date_to') {


                    console.log('字段 fieldId', fieldId);
                    var D = cur.getValue(fieldId)
                    if (fieldId == 'custpage_date_from') {
                        if (!D) {
                            function success(result) {
                                console.log('Success with value: ' + result);
                            }
                            function failure(reason) {
                                console.log('Failure: ' + reason);
                            }
                            dialog.alert({
                                title: '提示',
                                message: '请选择开始日期'
                            }).then(success).catch(failure)

                            cur.setValue({
                                fieldId: fieldId,
                                value: new Date()
                            });
                            return;
                        }

                    } else {
                        if (!D) {
                            function success(result) {
                                console.log('Success with value: ' + result);
                            }
                            function failure(reason) {
                                console.log('Failure: ' + reason);
                            }
                            dialog.alert({
                                title: '提示',
                                message: '请选择结束日期'
                            }).then(success).catch(failure)
                            cur.setValue({
                                fieldId: fieldId,
                                value: new Date(new Date().setMonth(new Date().getMonth() + 8))
                            });

                            return;
                        }
                    }


                    var now_date = getWeek(new Date())
                    var fo_date = getWeek(D)
                    console.log('错误的')
                    if (D < new Date() && now_date > fo_date) {
                        function success(result) {
                            console.log('Success with value: ' + result);
                        }

                        function failure(reason) {
                            console.log('Failure: ' + reason);
                        }
                        dialog.alert({
                            title: '提示',
                            message: '不能选择旧数据'
                        }).then(success).catch(failure)
                        cur.setValue({
                            fieldId: fieldId,
                            value: new Date()
                        })
                    }


                    var cur_params = getParams(rec)

                    console.log("cur.getValue('custpage_date_from').Format(\"yyyy-MM-dd\")", cur.getValue('custpage_date_from').Format("yyyy-MM-dd"))
                    console.log("cur.getValue('custpage_date_to').Format(\"yyyy-MM-dd\")", cur.getValue('custpage_date_to').Format("yyyy - MM - dd"))
                    var link = url.resolveScript({
                        scriptId: 'customscript_store_demand_sl',
                        deploymentId: 'customdeploy_store_demand_sl',
                        params: cur_params
                    });

                    console.log('开始过滤', link);

                    window.onbeforeunload = null;
                    window.location.href = link;


                    return
                }
                var data = []
                var item_week = fieldId.replace(/custpage_quantity_week/, 'custrecord_quantity_week')
                data.push({
                    item_id: cur.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_item_sku_id'
                    }),
                    item_account: cur.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: 'custpage_store_name_id'
                    }),
                    item_quantity: cur.getCurrentSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldId
                    }),
                    item_type: data_type_id,
                    item_week: item_week
                })
                var link = url.resolveScript({
                    scriptId: 'customscript_modified_quantity_rl',
                    deploymentId: 'customdeploy_modified_quantity_rl'
                })
                var header = {
                    'Content-Type': 'application/json;charset=utf-8',
                    'Accept': 'application/json'
                }
                var body = {
                    data: data
                }
                https.post({
                    url: link,
                    body: body,
                    headers: header
                })
            }

            if (fieldId == 'custpage_department' || fieldId == 'custpage_account_store'
                || fieldId == 'custpage_item' || fieldId == 'custpage_page_size') {


                ["custpage_account_store", "custpage_item", "custpage_date_from", "custpage_date_to", "custpage_department", "custpage_page_size"];
                var cur_params = getParams(rec)

                var link = url.resolveScript({
                    scriptId: 'customscript_store_demand_sl',
                    deploymentId: 'customdeploy_store_demand_sl',
                    params: cur_params
                    // params: {
                    //     custpage_department: rec.getValue('custpage_department')
                    // }
                });

                // 当该事件返回的字符串（ 事前设置好的event.returnValue的值） 不为null或者undefined时， 弹出确认窗口让用户自行选择是否关闭当前页面。

                window.onbeforeunload = null;
                // window.open(link);
                window.location.href = link;
            }
            return true
        }

        function postSourcing(context) { }

        function lineInit(context) { }

        function validateDelete(context) {
            return true
        }

        function validateInsert(context) {
            return true
        }

        function validateLine(context) {
            return true
        }

        function sublistChanged(context) { }

        /**
         * 数据选择
         *
         * @returns
         */
        function selectPage() {
            var custpage_item = rec.getValue('custpage_item')
            var custpage_date_from = rec.getText('custpage_date_from')
            var custpage_date_to = rec.getText('custpage_date_to')
            var custpage_now_page = rec.getValue('custpage_now_page')
            var custpage_total_page = rec.getValue('custpage_total_page')
            var custpage_select_page = rec.getValue('custpage_select_page')
            var custpage_page_size = rec.getValue('custpage_page_size')

            if (custpage_total_page != null && custpage_total_page != '') {
                window.location = reportSuitelet + '&' + serializeURL({
                    action: 'search',
                    custpage_item: custpage_item,
                    custpage_date_from: custpage_date_from,
                    custpage_date_to: custpage_date_to,
                    custpage_now_page: custpage_select_page,
                    custpage_page_size: custpage_page_size
                })
            }
        }

        function pigeSizeChange() {
            var custpage_item = rec.getValue('custpage_item'); // 货品
            var custpage_date_from = rec.getText('custpage_date_from')
            var custpage_date_to = rec.getText('custpage_date_to')
            var custpage_now_page = rec.getValue('custpage_now_page')
            var custpage_total_page = rec.getValue('custpage_total_page')
            var custpage_select_page = rec.getText('custpage_page_size')
            var custpage_page_size = rec.getValue('custpage_page_size')
            console.log('所选货品:', custpage_item)
            if (custpage_total_page != null && custpage_total_page != '') {
                console.log('选择的页数', custpage_select_page)
                console.log('页面大小', custpage_page_size)
                if (parseInt(custpage_select_page) - 1 > 0) {
                    var link = url.resolveScript({
                        scriptId: 'customscript_store_demand_sl',
                        deploymentId: 'customdeploy_store_demand_sl'
                    })

                    link = link + '&' + serializeURL({
                        action: 'search',
                        custpage_item: custpage_item,
                        custpage_date_from: custpage_date_from,
                        custpage_date_to: custpage_date_to,
                        custpage_now_page: custpage_select_page,
                        custpage_page_size: custpage_page_size
                    })
                    console.log('link : ', link)
                    window.location = link
                }
            }
        }

        /**
         * 序列化url参数
         *
         * @param obj
         * @returns
         */
        function serializeURL(obj) {
            var str = []
            for (var p in obj)
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
                }
            return str.join('&')
        }


        /**
         * 导出Excel
         */
        function ExportDemandPlan() {
            var sublistId = 'custpage_sublist';
            var curr = currentRecord.get();
            var date_from = format.parse({
                value: curr.getValue('custpage_date_from'),
                type: format.Type.DATE
            });
            var date_to = format.parse({
                value: curr.getValue('custpage_date_to'),
                type: format.Type.DATE
            });
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var today = moment(new Date().getTime()).format(dateFormat),
                quantity;
            // 传入开始时间和结束时
            var week_objs = weekofday(new Date(), date_from, date_to);
            func_type = week_objs.func_type;
            week_rs = week_objs.weeks;
            log.audit('week_rs', week_rs);
            var fils = [];
            var len = curr.getLineCount({
                sublistId: sublistId
            });
            console.log('子列表长度: ' + len, today);
            if (len > 0) {
                fils = {
                    'acc': curr.getValue('custpage_account_store'),
                    'sku': curr.getValue('custpage_item'),
                    "pageSize": curr.getText('custpage_page_size'),
                    "nowPage": curr.getValue("custpage_page_size"),
                    'TT': 'Demand',
                    'func_type': func_type,
                    'week_rs': week_rs
                };
                console.log('week:: ' + week_rs, func_type);

                console.log('fils: ', JSON.stringify(fils));
                var link = url.resolveScript({
                    scriptId: 'customscript_store_demand_print_sl',
                    deploymentId: 'customdeploy_store_demand_print_sl',
                    params: {
                        fils: JSON.stringify(fils)
                    },
                    returnExternalUrl: true
                });
                window.open(link);
            } else {
                alert('无数据');
            }
        }


        function updateData() {
            var sublistId = 'custpage_sublist'
            var curr = currentRecord.get()
            var date_from = format.parse({
                value: curr.getValue('custpage_date_from'),
                type: format.Type.DATE
            })
            var date_to = format.parse({
                value: curr.getValue('custpage_date_to'),
                type: format.Type.DATE
            })
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT')
            // 传入开始时间和结束时
            var week_objs = weekofday(new Date(), date_from, date_to)
            func_type = week_objs.func_type
            week_rs = week_objs.weeks
            console.log('week_rs', week_rs)
            var today = moment(new Date().getTime()).format(dateFormat)
            console.log('today:', today)
            var item_arr6 = [],
                item_arr5 = []
            var quantity, item_objs6 = {},
                item_objs5 = {},
                sku_id, account, key_str, CH = true
            var ST = new Date().getTime()
            for (var i = 0; i < curr.getLineCount({
                sublistId: sublistId
            }); i++) {
                var data_type = curr.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_data_type_id',
                    line: i
                })
                sku_id = curr.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_item_sku_id',
                    line: i
                })
                account = curr.getSublistValue({
                    sublistId: sublistId,
                    fieldId: 'custpage_store_name_id',
                    line: i
                })
                console.log("修改净需求", data_type);
                //   if (data_type == 6 || data_type == 22) { // 修改净需求量
                if (data_type == 5 || data_type == 23) { //修改净需求量

                    quantity = 0, data_t = 23;
                    week_rs.map(function (wek) {
                        CH = true;
                        quantity = curr.getSublistValue({
                            sublistId: sublistId,
                            fieldId: 'custpage_quantity_week' + wek,
                            line: i
                        })
                        key_str = sku_id + '-' + account + '-' + data_t + '-' + i;
                        for (var key in item_objs6) {
                            if (key == key_str) {
                                item_objs6[key].push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: wek,
                                    line: i,
                                    data_type: data_t, // 需求预测数据类型 中的22 -修改调拨计划量
                                    item_quantity: quantity.toString()
                                })
                                CH = false;
                            }
                        }
                        if (CH) {
                            item_arr6 = []
                            item_arr6.push({
                                item_id: sku_id,
                                account_id: account,
                                week_date: wek,
                                line: i,
                                data_type: data_t, // 需求预测数据类型 中的22 -修改调拨计划量
                                item_quantity: quantity.toString()
                            })
                            item_objs6[key_str] = item_arr6;
                        }
                    })
                    for (var l = 1; l < 54; l++) {
                        if (week_rs.indexOf(l) == -1) {
                            quantity = curr.getSublistValue({
                                sublistId: sublistId,
                                fieldId: 'custpage_quantity_weekhi' + l,
                                line: i
                            })
                            key_str = sku_id + '-' + account + '-' + data_t + '-' + i
                            for (var key in item_objs6) {
                                if (key == key_str) {
                                    item_objs6[key].push({
                                        item_id: sku_id,
                                        account_id: account,
                                        week_date: l,
                                        line: i,
                                        data_type: data_t, // 需求预测数据类型 中的22 -修改调拨计划量
                                        item_quantity: quantity.toString()
                                    })
                                    CH = false;
                                }
                            }
                            if (CH) {
                                item_arr6 = []
                                item_arr6.push({
                                    item_id: sku_id,
                                    account_id: account,
                                    week_date: l,
                                    line: i,
                                    data_type: 22, // 需求预测数据类型 中的22 -修改调拨计划量
                                    item_quantity: quantity.toString()
                                })
                                item_objs6[key_str] = item_arr6
                            }
                        }
                    }
                }
            }
            console.log('循环获取数据耗时：' + (new Date().getTime() - ST))
            console.log('item_arr6 : \n ', JSON.stringify(item_objs6))

            var link = url.resolveScript({
                scriptId: 'customscript_modified_quantity_rl',
                deploymentId: 'customdeploy_modified_quantity_rl'
            })
            var header = {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            }
            var body = {
                data: item_objs6,
                today: today,
                TT: 'storeDemand'
            }

            https.post.promise({
                header: header,
                url: link,
                body: body
            }).then(function (response) {
                alert('保存成功')
            }).catch(function onRejected(reason) {
                console.log('报错了，look:  ' + reason)
            })

            console.log('更新数据耗时：' + (new Date().getTime() - ST))
        }

        /**
         * 判断某一日属于这一年的第几周
         * @param {*} data
         */
        function weekofday(data, date_from, date_to) {
            log.debug('date_from:' + date_from, date_to)
            var weeks = [],
                dat_from, dat_to, func_type
            // //获取年份
            var YearDer_to = date_to.getFullYear() - data.getFullYear()
            if (YearDer_to > 0) { // 跨明年
                log.debug('跨明年')
                // 如果跨年了，判断明年的第一天是星期几
                // 是周 5、6、7，这几天，归为今年的是最后一周
                var y = date_to.getFullYear()
                var dd = '1/1/' + y
                dd = new Date(dd)
                if (dd.getDay() > 4 || dd.getDay() == 0) {
                    // 并且 明年的 第一周归为去年的 最后一周 ，就是明年的第一周不要了
                    dat_from = getWeek(date_from)
                    for (var i = dat_from; i <= 53; i++) {
                        weeks.push(i)
                    }

                    dat_to = getWeek(date_to)
                    for (var i = 2; i <= dat_to; i++) {
                        weeks.push(i)
                    }
                    func_type = 'B'
                } else {
                    // 否则 去年的最后一周归为明年的第一周，就是去年的最后一周不要了
                    dat_from = getWeek(date_from)
                    for (var i = dat_from; i <= 52; i++) {
                        weeks.push(i)
                    }

                    dat_to = getWeek(date_to)
                    for (var i = 1; i <= dat_to; i++) {
                        weeks.push(i)
                    }
                    func_type = 'C'
                }
            } else {
                log.debug('不跨明年？0,', YearDer_to)
                dat_to = getWeek(date_to)
                dat_from = getWeek(date_from)
                for (var i = dat_from; i <= dat_to; i++) {
                    weeks.push(i)
                }
                func_type = 'A'
            }
            log.debug('weeks ', weeks)
            return {
                'weeks': weeks,
                'func_type': func_type
            }
        }

        function getWeek(day, func_type) {
            var d1 = new Date(day)
            var d2 = new Date(day)
            d2.setMonth(0)
            d2.setDate(1)
            var numweekf = d2.getDay()
            var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf)
            var days = Math.ceil(rq / (24 * 60 * 60 * 1000))
            var num = Math.ceil(days / 7)
            if (func_type == 'B' && num == 1) {
                num = 53
            } else if (func_type == 'C' && num == 53) {
                num = 1
            }
            return num
        }


        function getParams(rec) {
            var fieldArr = ["custpage_account_store", "custpage_item", "custpage_date_from", "custpage_date_to", "custpage_department", "custpage_page_size"];
            var params = {};

            fieldArr.map(function (field) {

                if (field == "custpage_date_from" || field == "custpage_date_to") {
                    params[field] = rec.getValue(field).Format("yyyy-MM-dd");
                } else {
                    params[field] = rec.getValue(field);
                }
            })

            for (var i in params) {
                if (fieldArr.indexOf(i) > -1) {
                    fieldArr.map(function (field) {
                        if (!params[field]) {
                            delete params[field]
                        }
                    })
                } else {
                    delete params[i]
                }
            }

            return params;
        }


        Date.prototype.Format = function (fmt) { //需要JS格式化时间，后期做的时候方便使用
            var o = {
                "M+": this.getMonth() + 1,                 //月份
                "d+": this.getDate(),                    //日
                "h+": this.getHours(),                   //小时
                "m+": this.getMinutes(),                 //分
                "s+": this.getSeconds(),                 //秒
                "q+": Math.floor((this.getMonth() + 3) / 3), //季度
                "S": this.getMilliseconds()             //毫秒
            };
            if (/(y+)/.test(fmt))
                fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(fmt))
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        };



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
            sublistChanged: sublistChanged,
            ExportDemandPlan: ExportDemandPlan,
            updateData: updateData
        }
    })