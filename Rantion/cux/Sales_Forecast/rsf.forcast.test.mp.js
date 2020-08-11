/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/log", "N/format", "N/runtime", '../../Helper/Moment.min'],
    function (search, record, log, format, runtime, moment) {

        function getInputData() {
            try {
                return search.create({
                    type: 'customrecord_rsf_daily_sales',
                    columns: [
                        { name: 'custrecord_rsf_store', summary: search.Summary.GROUP },
                        { name: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                        { name: 'class', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                        { name: 'department', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                    ]
                });
            } catch (e) {
                log.debug('e', e);
            }
        }

        function map(context) {
            try {
                var last_arr = [];
                var obj = JSON.parse(context.value).values;
                var store_id = obj['GROUP(custrecord_rsf_store)'].value; //店铺ID
                var item_id = obj['GROUP(custrecord_rsf_item)'].value;//货品ID
                var class_id = obj['GROUP(class.custrecord_rsf_item)'].value; //类ID
                var department_id = obj['GROUP(department.custrecord_rsf_item)'].value;//部门ID
                var dt;
                if (runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' })) {
                    dt = format.parse({ type: format.Type.DATE, value: runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' }) });
                }
                else {
                    dt = new Date();
                }
                if (class_id && department_id && store_id && item_id) {
                    //获取当前月
                    var speed = calculate_sales_speed(class_id, department_id, store_id, item_id, dt);
                    last_arr.push.apply(last_arr, Object.keys(speed).map(function (store_id_and_item_id) { return [dt, store_id_and_item_id, speed[store_id_and_item_id]]; }));
                    //加一个月
                    var date = new Date(dt.getFullYear(), dt.getMonth() + 2, 0);
                    var speed1 = calculate_sales_speed1(dt, store_id, item_id, speed);
                    last_arr.push.apply(last_arr, Object.keys(speed1).map(function (store_id_and_item_id) { return [date, store_id_and_item_id, speed1[store_id_and_item_id]]; }));
                    //加两个月
                    var date1 = new Date(dt.getFullYear(), dt.getMonth() + 3, 0);
                    var speed2 = calculate_sales_speed2(dt, store_id, item_id, speed, speed1);
                    last_arr.push.apply(last_arr, Object.keys(speed2).map(function (store_id_and_item_id) { return [date1, store_id_and_item_id, speed2[store_id_and_item_id]]; }));
                    //加三个月
                    var date2 = new Date(dt.getFullYear(), dt.getMonth() + 4, 0);
                    var speed3 = getOtherData(speed2, speed1, speed);
                    last_arr.push.apply(last_arr, Object.keys(speed3).map(function (store_id_and_item_id) { return [date2, store_id_and_item_id, speed3[store_id_and_item_id]]; }));
                    //加四个月
                    var date3 = new Date(dt.getFullYear(), dt.getMonth() + 5, 0);
                    var speed4 = getOtherData(speed3, speed2, speed1);
                    last_arr.push.apply(last_arr, Object.keys(speed4).map(function (store_id_and_item_id) { return [date3, store_id_and_item_id, speed4[store_id_and_item_id]]; }));
                    //加五个月
                    var date4 = new Date(dt.getFullYear(), dt.getMonth() + 6, 0);
                    var speed5 = getOtherData(speed4, speed3, speed2);
                    last_arr.push.apply(last_arr, Object.keys(speed5).map(function (store_id_and_item_id) { return [date4, store_id_and_item_id, speed5[store_id_and_item_id]]; }));
                    //加六个月
                    var date5 = new Date(dt.getFullYear(), dt.getMonth() + 7, 0);
                    var speed6 = getOtherData(speed5, speed4, speed3);
                    last_arr.push.apply(last_arr, Object.keys(speed6).map(function (store_id_and_item_id) { return [date5, store_id_and_item_id, speed6[store_id_and_item_id]]; }));
                    //加七个月
                    var date6 = new Date(dt.getFullYear(), dt.getMonth() + 8, 0);
                    var speed7 = getOtherData(speed6, speed5, speed4);
                    last_arr.push.apply(last_arr, Object.keys(speed7).map(function (store_id_and_item_id) { return [date6, store_id_and_item_id, speed7[store_id_and_item_id]]; }));
                    context.write(last_arr);
                }else{
                    return;
                }
            } catch (e) {
                log.debug('e', e);
            }
        }

        function reduce(context) {
            var data = JSON.parse(context.key);
            data.map(function (v) {
                try {
                    var date = v[0], _a = v[1].split('-'), store_id = _a[0], item_id = _a[1], speed = Number(v[2]);
                    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var search_dt = moment(date).format(dateFormat);
                    var dt = moment(date).toDate();
                    var r;
                    search.create({
                        type: 'customrecord_rsf_sales_forcast',
                        filters: [
                            { name: 'custrecord_rsf_sales_forcast_store', operator: search.Operator.ANYOF, values: store_id },
                            { name: 'custrecord_rsf_sales_forcast_item', operator: search.Operator.ANYOF, values: item_id },
                            { name: 'custrecord_rsf_sales_forcast_date', operator: search.Operator.ON, values: search_dt },
                        ]
                    }).run().each(function (rec) {
                        r = record.load({ type: 'customrecord_rsf_sales_forcast', id: rec.id, isDynamic: true });
                        return false;
                    });
                    if (!r) {
                        try {
                            r = record.create({ type: 'customrecord_rsf_sales_forcast', isDynamic: true });
                            r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_store', value: store_id });
                            r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_item', value: item_id });
                            r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_date', value: dt });
                        } catch (e) {
                            log.debug('e', e);
                        }
                    }
                    r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_quantity', value: speed });
                    r.setValue({ fieldId: 'custrecord_rsf_sales_forcast_alter', value: speed });
                    r.save();
                } catch (e) {
                    log.debug('e', e);
                }

            })

        }

        function summarize(summary) {

        }

        /** 获取因子比例 */
        function getRsfFactor() {
            var factor_dict = {};
            search.create({
                type: 'customrecord_rsf_factor',
                columns: [
                    { name: 'custrecord_rsf_factor' },
                    { name: 'custrecord_rsf_factor_reference_value' },
                ]
            }).run().each(function (rec) {
                factor_dict[Number(rec.getValue('custrecord_rsf_factor'))] = 0.01 * Number(rec.getValue('custrecord_rsf_factor_reference_value').replace('%', ''));
                return true;
            });
            return factor_dict;
        }

        /** 获取环比增长率 */
        function getSequentialGrowthRate() {
            var growth_rate = {};
            search.create({
                type: 'customrecord_rsf_sequential_growth_rate',
                columns: [
                    { name: 'custrecord_rsf_category' },
                    { name: 'custrecord_rsf_department' },
                    { name: 'custrecord_rsf_growth_rate' }
                ]
            }).run().each(function (rec) {
                growth_rate[rec.getValue('custrecord_rsf_category') + '-' + rec.getValue('custrecord_rsf_department')] = rec.getValue('custrecord_rsf_growth_rate');
                return true;
            });
            return growth_rate;
        }

        /** 获取当前月的总天数 */
        function mGetDate(year, month) {
            var d = new Date(year, month, 0);
            return d.getDate();
        }

        /** 获取当前月 */
        function calculate_sales_speed(class_id, department_id, store_id, item_id, dt) {
            /** 获取因子比例 */
            var factor_dict = getRsfFactor();
            /** 获取环比增长率 */
            var growth_rate = getSequentialGrowthRate();
            /** 获取当前月的总天数 */
            var date_quan = mGetDate(dt.getYear(), dt.getMonth() + 1);
            var speed_table = {}, offset = 0, limit = 4000;
            search.create({
                type: 'customrecord_rsf_daily_sales',
                filters: [
                    { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_id },
                    { name: 'custrecord_rsf_item', operator: search.Operator.ANYOF, values: item_id }
                ],
                columns: [
                    { name: 'custrecord_rsf_store', summary: search.Summary.GROUP },
                    { name: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                    /** 默认因子1 最近7天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 7) + " THEN {custrecord_rsf_sales_alter}/7 ELSE 0 END", summary: search.Summary.SUM },
                    /** 默认因子2 最近14天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 14) + " THEN {custrecord_rsf_sales_alter}/14 ELSE 0 END", summary: search.Summary.SUM },
                    /** 默认因子3 最近30天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 30) + " THEN {custrecord_rsf_sales_alter}/30 ELSE 0 END", summary: search.Summary.SUM },
                    /** 默认因子4 最近31~60天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 60) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + (offset + 30) + " THEN {custrecord_rsf_sales_alter}/30 ELSE 0 END", summary: search.Summary.SUM },
                    /** 默认因子5 最近61~90天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 90) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + (offset + 60) + " THEN {custrecord_rsf_sales_alter}/30 ELSE 0 END", summary: search.Summary.SUM },
                ]
            }).run().each(function (rec) {
                var growth_rate_data = growth_rate[class_id + '-' + department_id];
                var speed = [
                    Number(rec.getValue(rec.columns[2])) * factor_dict[1 /* 最近7天销量 */],
                    Number(rec.getValue(rec.columns[3])) * factor_dict[2 /* 最近14天销量 */],
                    Number(rec.getValue(rec.columns[4])) * factor_dict[3 /* 最近30天销量 */],
                    Number(rec.getValue(rec.columns[5])) * factor_dict[4 /* "最近31~60天销量" */],
                    Number(rec.getValue(rec.columns[6])) * factor_dict[5 /* "最近61~90天销量" */],
                ].reduce(function (p, c) { return p + c; }, 0);
                speed_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = Math.round(speed * growth_rate_data * date_quan);
                return --limit > 0;
            });
            return speed_table;
        }

        /** 加一个月 */
        function calculate_sales_speed1(dt, store_id, item_id, speed_data) {
            var now_date = dt.getDate();
            var date = new Date(dt.getFullYear(), dt.getMonth(), 0);
            var date_quan = mGetDate(date.getYear(), date.getMonth() + 1);
            var date1 = new Date(dt.getFullYear(), dt.getMonth() - 1, 0);
            var date_quan1 = mGetDate(date1.getYear(), date1.getMonth() + 1);
            var speed_table = {};
            var limit = 4000;
            search.create({
                type: 'customrecord_rsf_daily_sales',
                filters: [
                    { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_id },
                    { name: 'custrecord_rsf_item', operator: search.Operator.ANYOF, values: item_id }
                ],
                columns: [
                    { name: 'custrecord_rsf_store', summary: search.Summary.GROUP },
                    { name: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                    /** 默认因子4 最近31~60天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (date_quan + now_date) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + now_date + " THEN {custrecord_rsf_sales_alter} ELSE 0 END", summary: search.Summary.SUM },
                    /** 默认因子5 最近61~90天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (date_quan + now_date + date_quan1) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + (date_quan + now_date) + " THEN {custrecord_rsf_sales_alter} ELSE 0 END", summary: search.Summary.SUM },
                ]
            }).run().each(function (rec) {
                var speed = [
                    Number(rec.getValue(rec.columns[2])) * 0.3,
                    Number(rec.getValue(rec.columns[3])) * 0.2,
                ].reduce(function (p, c) { return p + c; }, 0);
                speed_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = Math.round(speed + (Number(speed_data[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])]) * 0.5));
                return --limit > 0;
            });
            return speed_table;
        }

        /** 加两个月 */
        function calculate_sales_speed2(dt, store_id, item_id, speed_data, speed1_data) {
            var now_date = dt.getDate();
            var date = new Date(dt.getFullYear(), dt.getMonth(), 0);
            var date_quan = mGetDate(date.getYear(), date.getMonth() + 1);
            var speed_table = {};
            var limit = 4000;
            search.create({
                type: 'customrecord_rsf_daily_sales',
                filters: [
                    { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_id },
                    { name: 'custrecord_rsf_item', operator: search.Operator.ANYOF, values: item_id }
                ],
                columns: [
                    { name: 'custrecord_rsf_store', summary: search.Summary.GROUP },
                    { name: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                    /** 默认因子4 最近31~60天销量 */
                    { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (date_quan + now_date) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + now_date + " THEN {custrecord_rsf_sales_alter} ELSE 0 END", summary: search.Summary.SUM },
                ]
            }).run().each(function (rec) {
                speed_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = Math.round(Number(rec.getValue(rec.columns[2])) * 0.2 + Number(speed_data[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])]) * 0.3 + Number(speed1_data[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])]) * 0.5);
                return --limit > 0;
            });
            return speed_table;
        }

        /** 其他月份 */
        function getOtherData(speed2, speed1, speed) {
            var key_data;
            for (var key in speed) {
                key_data = key;
            }
            var speed3 = {};
            speed3[key_data] = Math.round(Number(speed2[key_data]) * 0.5 + Number(speed1[key_data]) * 0.3 + Number(speed[key_data]) * 0.2);
            return speed3;
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
