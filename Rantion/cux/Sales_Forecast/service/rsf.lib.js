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
    exports.calculate_sales_speed = function (date) {
        var speed_table = {};
        var offset = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
        search.create({
            type: 'customrecord_rsf_daily_sales',
            columns: [
                { name: 'custrecord_rsf_store', summary: search.Summary.GROUP },
                { name: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                /** 默认因子1 最近7天销量 */
                { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 7) + " THEN {custrecord_rsf_sales}/7 ELSE 0 END", summary: search.Summary.SUM },
                /** 默认因子2 最近14天销量 */
                { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 14) + " THEN {custrecord_rsf_sales}/14 ELSE 0 END", summary: search.Summary.SUM },
                /** 默认因子3 最近30天销量 */
                { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 30) + " THEN {custrecord_rsf_sales}/30 ELSE 0 END", summary: search.Summary.SUM },
                /** 默认因子4 最近31~60天销量 */
                { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 60) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + (offset + 30) + " THEN {custrecord_rsf_sales}/30 ELSE 0 END", summary: search.Summary.SUM },
                /** 默认因子5 最近61~90天销量 */
                { name: 'formulanumeric', formula: "CASE WHEN ROUND({today}-{custrecord_rsf_date}, 0) <= " + (offset + 90) + " AND ROUND({today}-{custrecord_rsf_date}, 0) > " + (offset + 60) + " THEN {custrecord_rsf_sales}/30 ELSE 0 END", summary: search.Summary.SUM },
            ]
        }).run().each(function (rec) {
            var speed = [
                Number(rec.getValue(rec.columns[2])) * factor_dict[1 /* 最近7天销量 */],
                Number(rec.getValue(rec.columns[3])) * factor_dict[2 /* 最近14天销量 */],
                Number(rec.getValue(rec.columns[4])) * factor_dict[3 /* 最近30天销量 */],
                Number(rec.getValue(rec.columns[5])) * factor_dict[4 /* "最近31~60天销量" */],
                Number(rec.getValue(rec.columns[6])) * factor_dict[5 /* "最近61~90天销量" */],
            ].reduce(function (p, c) { return p + c; }, 0);
            speed_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = speed;
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
                { name: 'custitem_dps_category1', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                { name: 'custitem_dps_division', join: 'custrecord_rsf_item', summary: search.Summary.GROUP },
                { name: 'formulanumeric', formula: "DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-12),'month'),{custrecord_rsf_sales},0)/TO_CHAR((last_day(ADD_MONTHS({today},-12))),'DD')", summary: search.Summary.MAX },
                { name: 'formulanumeric', formula: "(0.5 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-13),'month'),{custrecord_rsf_sales},0)/TO_CHAR((last_day(ADD_MONTHS({today},-13))),'DD') +  0.3 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-14),'month'),{custrecord_rsf_sales},0)/TO_CHAR((last_day(ADD_MONTHS({today},-14))),'DD') +  0.2 * DECODE(TRUNC({custrecord_rsf_date},'month'),TRUNC(ADD_MONTHS({today},-15),'month'),{custrecord_rsf_sales},0)/TO_CHAR((last_day(ADD_MONTHS({today},-15))),'DD'))", summary: search.Summary.MAX },
            ]
        }).run().each(function (rec) {
            rate_table[rec.getValue(rec.columns[0]) + "-" + rec.getValue(rec.columns[1])] = {
                category: rec.getText(rec.columns[0]),
                division: rec.getText(rec.columns[1]),
                qty: Number(rec.getValue(rec.columns[2])),
                base: Number(rec.getValue(rec.columns[3])),
            };
            return --limit > 0;
        });
        return rate_table;
    };
});
