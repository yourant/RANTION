/**!
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 *
 * RSF平台核心库
 */
define(["require", "exports", "N/search"], function (require, exports, search) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rsf = function (item_id, store_id) {
    };
    /** 销售速度计算 */
    exports.calculate_sales_speed = function (date,store_arr) {
        try {
            var date_quan = mGetDate(date.getYear(), date.getMonth() + 1);
            var speed_table = {};
            var offset = 0;//Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            var limit = 4000;
            /** 获取因子比例 */
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
            log.debug('factor_dict', factor_dict);
            //获取环比增长率
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
            log.debug('growth_rate', growth_rate);
            search.create({
                type: 'customrecord_rsf_daily_sales',
                filters: [
                    { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_arr }
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
                    { name: 'class', join: 'custrecord_rsf_item', summary: search.Summary.GROUP},
                    { name: 'department', join: 'custrecord_rsf_item', summary: search.Summary.GROUP},
                ]
            }).run().each(function (rec) {
                var growth_rate_data = growth_rate[rec.getValue(rec.columns[7]) + '-' + rec.getValue(rec.columns[8])];
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
        } catch (e) {
            log.debug('e', e);
        }
    };

    exports.calculate_sales_speed1 = function (dt, speed_data,store_arr) {
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
                { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_arr }
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
    };

    exports.calculate_sales_speed2 = function (dt, speed_data, speed1_data,store_arr) {
        var now_date = dt.getDate();
        var date = new Date(dt.getFullYear(), dt.getMonth(), 0);
        var date_quan = mGetDate(date.getYear(), date.getMonth() + 1);
        var speed_table = {};
        var limit = 4000;
        search.create({
            type: 'customrecord_rsf_daily_sales',
            filters: [
                { name: 'custrecord_rsf_store', operator: search.Operator.ANYOF, values: store_arr }
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
    };
    /** 环比增长率 */
    exports.calculate_year_on_year_growth_rate = function (date) {
        var rate_table = {};
        var limit = 4000;
        search.create({
            type: 'customrecord_rsf_daily_sales',
            columns: [
                { name: 'class', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                { name: 'department', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                { name: 'formulanumeric', formula: "DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-12),'month'),{custrecord_rsf_sales_alter},0)", summary: search.Summary.SUM },
                { name: 'formulanumeric', formula: "DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-13),'month'),{custrecord_rsf_sales_alter},0)", summary: search.Summary.SUM },
                { name: 'formulanumeric', formula: "DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-14),'month'),{custrecord_rsf_sales_alter},0)", summary: search.Summary.SUM },
                { name: 'formulanumeric', formula: "DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-15),'month'),{custrecord_rsf_sales_alter},0)", summary: search.Summary.SUM },
                //{ name: 'formulanumeric', formula: "(0.5 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-13),'month'),{custrecord_rsf_sales_alter},0) + 0.3 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-14),'month'),{custrecord_rsf_sales_alter},0) + 0.2 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-15),'month'),{custrecord_rsf_sales_alter},0)", summary: search.Summary.SUM },
            ]
        }).run().each(function (rec) {
            rate_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = {
                category: rec.getText(rec.columns[0]),
                division: rec.getText(rec.columns[1]),
                qty: Number(rec.getValue(rec.columns[2])) / (0.5 * Number(rec.getValue(rec.columns[3])) + 0.3 * Number(rec.getValue(rec.columns[4])) + 0.2 * Number(rec.getValue(rec.columns[5]))),
                base: Number(rec.getValue(rec.columns[3])),
            };
            return --limit > 0;
        });
        return rate_table;
    };

    function mGetDate(year, month) {
        var d = new Date(year, month, 0);
        return d.getDate();
    }

    exports.getOtherData = function (list, speed2, speed1, speed) {
        var speed3 = {}
        for(var i = 0; i < list.length; i++){
            speed3[list[i][1]] = Math.round(Number(speed2[list[i][1]]) * 0.5 + Number(speed1[list[i][1]]) * 0.3 + Number(speed[list[i][1]]) * 0.2);
        }
        return speed3;
    }
});
