/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-24 11:47:18
 * @LastEditTime   : 2020-08-25 17:00:33
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \Rantion\inventoryadjust\dps.li.inv.adjust.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/url', 'N/runtime', 'N/ui/dialog', 'N/currentRecord',
    'N/https'
], function (url, runtime, dialog, currentRecord, https) {


    function pageInit(context) {

        console.log('pageInit', "pageInit");

    }

    function fieldChanged(context) {

        var fieldArr = ["custpage_li_location", "custpage_li_sku", "custpage_li_start_date", "custpage_li_end_date", "custpage_li_pages", "custpage_li_per_page"];
        var fieldId = context.fieldId;

        console.log('变化字段', fieldId);

        if (fieldArr.indexOf(fieldId) > -1) {
            var rec = context.currentRecord;

            var DATEFORMAT = runtime.getCurrentUser().getPreference({
                name: "DATEFORMAT"
            });

            var param = getParams(rec, DATEFORMAT);
            console.log("typeof (param)", typeof (param));

            var link = url.resolveScript({
                scriptId: 'customscript_dps_li_inv_adjust_sl',
                deploymentId: 'customdeploy_dps_li_inv_adjust_sl',
                params: param
            });

            if (fieldId == "custpage_li_end_date") {

                if (rec.getValue('custpage_li_end_date')) {
                    console.log("rec.getValue('custpage_li_start_date')", rec.getValue('custpage_li_start_date'))
                    if (rec.getValue('custpage_li_start_date')) {
                        var start_date = rec.getValue('custpage_li_start_date'); // 开始时间
                        var end_date = rec.getValue('custpage_li_end_date'); // 结束时间

                        if (end_date) {
                            var _start = start_date.getTime();
                            var _end = end_date.getTime();

                            console.log('_start', _start)
                            console.log('_end', _end)

                            if (_start > _end) {
                                function success(result) {
                                    rec.setValue({
                                        fieldId: 'custpage_li_end_date',
                                        value: ''
                                    });
                                    console.log('Success with value: ' + result);
                                }

                                function failure(reason) {
                                    rec.setValue({
                                        fieldId: 'custpage_li_end_date',
                                        value: ''
                                    });
                                    console.log('Failure: ' + reason)
                                }

                                dialog.alert({
                                    title: '提示',
                                    message: '结束日期 不能小于 开始日期'
                                }).then(success).catch(failure)
                                return;
                            }
                        }

                    }

                } else {
                    return;
                }
            }

            log.debug('params', param);
            console.log('params', param);
            console.log('开始过滤', link);

            window.onbeforeunload = null;
            window.location.href = link;

        }

    }

    function postSourcing(context) {

    }

    function sublistChanged(context) {

    }

    function lineInit(context) {

    }

    function validateField(context) {
        return true;
    }

    function validateLine(context) {
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


    function getParams(rec, _dateformat) {

        var fieldArr = ["custpage_li_location", "custpage_li_sku", "custpage_li_start_date", "custpage_li_end_date", "custpage_li_pages", "custpage_li_per_page"];
        var params = {};

        fieldArr.map(function (field) {
            if (field == "custpage_li_start_date" || field == "custpage_li_end_date") {
                if (rec.getValue(field)) {
                    params[field] = dateFormat(rec.getValue(field), DATEFORMAT[_dateformat]);
                    console.log('DATEFORMAT[_dateformat]', DATEFORMAT[_dateformat]);
                    console.log('dateFormat(rec.getValue(field), DATEFORMAT[_dateformat])', dateFormat(rec.getValue(field), DATEFORMAT[_dateformat]))
                }
            } else {
                params[field] = rec.getValue(field);
            }
        });
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

        log.debug('params', params)

        return params;

    }

    var dateFormat = function () {
        var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
            timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
            timezoneClip = /[^-+\dA-Z]/g,
            pad = function (val, len) {
                val = String(val);
                len = len || 2;
                while (val.length < len) val = "0" + val;
                return val;
            };

        // Regexes and supporting functions are cached through closure
        return function (date, mask, utc) {
            var dF = dateFormat;

            // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
            if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
                mask = date;
                date = undefined;
            }

            // Passing date through Date applies Date.parse, if necessary
            date = date ? new Date(date) : new Date;
            if (isNaN(date)) throw SyntaxError("invalid date");

            mask = String(dF.masks[mask] || mask || dF.masks["default"]);

            // Allow setting the utc argument via the mask
            if (mask.slice(0, 4) == "UTC:") {
                mask = mask.slice(4);
                utc = true;
            }

            var _ = utc ? "getUTC" : "get",
                d = date[_ + "Date"](),
                D = date[_ + "Day"](),
                m = date[_ + "Month"](),
                y = date[_ + "FullYear"](),
                H = date[_ + "Hours"](),
                M = date[_ + "Minutes"](),
                s = date[_ + "Seconds"](),
                L = date[_ + "Milliseconds"](),
                o = utc ? 0 : date.getTimezoneOffset(),
                flags = {
                    d: d, // day
                    dd: pad(d),
                    ddd: dF.i18n.dayNames[D],
                    dddd: dF.i18n.dayNames[D + 7],
                    m: m + 1, // Month
                    mm: pad(m + 1),
                    mmm: dF.i18n.monthNames[m],
                    mmmm: dF.i18n.monthNames[m + 12],
                    yy: String(y).slice(2), // year
                    yyyy: y,
                    h: H % 12 || 12,
                    hh: pad(H % 12 || 12),
                    H: H, // 24 Hour
                    HH: pad(H),
                    M: M, // Minute
                    MM: pad(M),
                    s: s,
                    ss: pad(s),
                    l: pad(L, 3), // millisecond
                    L: pad(L > 99 ? Math.round(L / 10) : L), //  Milliseconds are displayed as a percentage
                    t: H < 12 ? "a" : "p",
                    tt: H < 12 ? "am" : "pm",
                    T: H < 12 ? "A" : "P",
                    TT: H < 12 ? "AM" : "PM",
                    Z: utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""), // set timezone
                    o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4), // set timezone
                    S: ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
                };

            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };
    }();

    // Some common format strings
    dateFormat.masks = {
        "default": "ddd mmm dd yyyy HH:MM:ss",
        shortDate: "m/d/yy",
        mediumDate: "mmm d, yyyy",
        longDate: "mmmm d, yyyy",
        fullDate: "dddd, mmmm d, yyyy",
        shortTime: "h:MM TT",
        mediumTime: "h:MM:ss TT",
        longTime: "h:MM:ss TT Z",
        isoDate: "yyyy-mm-dd",
        isoTime: "HH:MM:ss",
        isoDateTime: "yyyy-mm-dd'T'HH:MM:ss",
        isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'",
    };

    // Internationalization strings
    dateFormat.i18n = {
        dayNames: [
            "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
            "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
        ],
        monthNames: [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
            "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
        ]
    };


    var DATEFORMAT = {
        "M/D/YYYY": "m/d/yyyy",
        "D/M/YYYY": "d/m/yyyy",
        "D-Mon-YYYY": "d-mmm-yyyy",
        "D.M.YYYY": "d.m.yyyy",
        "D-MONTH-YYYY": "d-mmmm-yyyy",
        "D MONTH, YYYY": "d mmmm, yyyy",
        "YYYY/M/D": "yyyy/m/d",
        "YYYY-M-D": "yyyy-m-d",
        "DD/MM/YYYY": "dd/mm/yyyy",
        "DD-Mon-YYYY": "dd-mmm-yyyy",
        "DD.MM.YYYY": "dd.mm.yyyy",
        "DD-MONTH-YYYY": "dd-mmmm-yyyy",
        "DD MONTH, YYYY": "dd mmmm, yyyy",
        "MM/DD/YYYY": "mm/dd/yyyy",
        "YYYY/MM/DD": "yyyy/mm/dd",
        "YYYY-MM-DD": "yyyy-mm-dd"
    }

    function createInventoryAdjust() {

        var start_time = new Date();
        console.log("开始时间", start_time.toISOString());
        var curr_rec = currentRecord.get();
        var numLines = curr_rec.getLineCount({
            sublistId: 'sublist_show_id'
        });

        var objSublist = curr_rec.getSublist({
            sublistId: 'sublist_show_id'
        });

        var new_sublist_value = [];
        for (var i = 0; i < numLines; i++) {

            var flag = curr_rec.getSublistValue({
                sublistId: "sublist_show_id",
                fieldId: "custpage_label_checkbox",
                line: i
            });
            if (flag) {
                var it = {
                    custpage_label_location: curr_rec.getSublistValue({
                        sublistId: 'sublist_show_id',
                        fieldId: 'custpage_label_location',
                        line: i
                    }),
                    custpage_label_sku: curr_rec.getSublistValue({
                        sublistId: 'sublist_show_id',
                        fieldId: 'custpage_label_sku',
                        line: i
                    }),
                    custpage_label_inv_diff_qty: curr_rec.getSublistValue({
                        sublistId: 'sublist_show_id',
                        fieldId: 'custpage_label_inv_diff_qty',
                        line: i
                    })

                };

                new_sublist_value.push(it);
            }
        }


        console.log('子列表记录', new_sublist_value)
        if (new_sublist_value && new_sublist_value.length > 0) { // 选择了一行或者多行数据

            var url1 = url.resolveScript({
                scriptId: 'customscript_dps_li_inv_adjust_rl',
                deploymentId: 'customdeploy_dps_li_inv_adjust_rl',
                returnExternalUrl: false
            });

            var header3 = {
                "Content-Type": "application/json;charset=utf-8",
                "Accept": "application/json"
            };

            var body2 = {
                action: 'createInventoryAdjust',
                data: new_sublist_value
            };

            startMask('正在生成库存调整单, 请耐心等待...');
            https.post.promise({
                url: url1,
                body: body2,
                headers: header3
            }).then(function (response) {
                var rebody = JSON.parse(response.body);
                endMask();

                // if (rebody.code == 500) {
                //     msg = '生成库存调整到成功' + JSON.stringify(rebody);
                // } else {
                //     msg = '生成库存调整到成功';
                // }
                dialog.alert({
                    title: '提示',
                    message: JSON.stringify(rebody)
                }).then(function () {
                    window.onbeforeunload = null;
                    window.location.reload();
                });
            }).catch(function (reason) {
                endMask();
                dialog.alert({
                    title: '提示',
                    message: reason
                }).then(function () {
                    window.onbeforeunload = null;
                    window.location.reload();
                });
            })

        } else { // 没有选择任何行数据
            function success(result) {
                console.log('Success with value: ' + result);
            }

            function failure(reason) {
                console.log('Failure: ' + reason)
            }

            dialog.alert({
                title: '提示',
                message: '请选择一行数据'
            }).then(success).catch(failure)
        }
        console.log('new_sublist_value', new_sublist_value);

        var end_time = new Date();
        console.log("结束时间", end_time.toISOString());
        console.log("总共耗时 秒", (end_time.getTime() - start_time.getTime()) / 1000);

    }



    /**
     * 打开遮罩
     *
     * @param message
     * @returns
     */

    function startMask(message, type) {
        if (!type) {
            type = "afterbegin"
        }
        var cutomerModel = document.getElementById('cutomerModel');
        // if (cutomerModel == null) {
        var htmlText = "<div id ='cutomerModel' style=\"position: absolute;top: 0;left: 0;display: block;background-color: rgba(9, 9, 9, 0.6);width: 100%;height: 100%;z-index: 1000;text-align:center\"/>\n" +
            "<img src=\"https://system.na2.netsuite.com/core/media/media.nl?id=3583&c=4890821&h=8dca27f2eedc57f9d2a1\" style=\"margin-top:20%;width:40px;\" /></br>\n" +
            "<b style=\"margin-top:2%;color:#fff\">" +
            message +
            "</b>\n" +
            "</div>";
        insertHTML(document.body, type, htmlText);
        // console.log("insertHTML")
        // } else {
        document.getElementById('cutomerModel').style.display = 'block';
        // }
        pageH = Math.max(document.body.scrollHeight,
            document.documentElement.scrollHeight);
        pageH = pageH > 0 ? pageH : 600;
        // console.log(message)
        document.getElementById('cutomerModel').style.height = pageH + "px";
        return true;
    }

    /**
     * 插入html
     * @param el
     * @param where
     * @param html
     * @returns
     */
    function insertHTML(el, where, html) {
        if (!el) {
            return false;
        }
        where = where.toLowerCase();
        if (el.insertAdjacentHTML) { // IE
            // console.log("el.insertAdjacentHTML")
            el.insertAdjacentHTML(where, html);
        } else {
            var range = el.ownerDocument.createRange(),
                frag = null;
            switch (where) {
                case "beforebegin":
                    range.setStartBefore(el);
                    // console.log(html)
                    frag = range.createContextualFragment(html);
                    el.parentNode.insertBefore(frag, el);
                    return el.previousSibling;
                case "afterbegin":
                    if (el.firstChild) {
                        range.setStartBefore(el.firstChild);
                        frag = range.createContextualFragment(html);
                        el.insertBefore(frag, el.firstChild);
                    } else {
                        el.innerHTML = html;
                    }
                    return el.firstChild;
                case "beforeend":
                    if (el.lastChild) {
                        range.setStartAfter(el.lastChild);
                        frag = range.createContextualFragment(html);
                        el.appendChild(frag);
                    } else {
                        el.innerHTML = html;
                    }
                    return el.lastChild;
                case "afterend":
                    range.setStartAfter(el);
                    frag = range.createContextualFragment(html);
                    el.parentNode.insertBefore(frag, el.nextSibling);
                    return el.nextSibling;
            }
        }
    }

    /**
     * 去掉遮罩
     */
    function endMask() {
        try {
            document.getElementById('cutomerModel').style.display = 'none';
        } catch (e) {
            console.log('去掉遮罩', e)
        }
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
        saveRecord: saveRecord,
        createInventoryAdjust: createInventoryAdjust
    };

});