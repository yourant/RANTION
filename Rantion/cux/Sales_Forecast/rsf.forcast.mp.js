/**!
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 基于日期生成预测结果
 * @scriptID    customscript_rsf_forcast_mp
 * @deploymentID    customdeploy_rsf_forcast_mp
 */
define(["require", "exports", "N/search", "N/record", "N/log", "N/format", "N/runtime", "./utils/fun.lib", "./service/rsf.lib", '../../Helper/Moment.min'], 
function (require, exports, search, record, log, format, runtime, fun_lib_1, rsf_lib_1, moment) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function (ctx) {
        try {
            var list = [], list1 = [];
            var dt;//= new Date()
            if (runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' })) {
                dt = format.parse({ type: format.Type.DATE, value: runtime.getCurrentScript().getParameter({ name: 'custscript_rsf_forcast_date' }) });
                log.debug('dt', dt);
            }
            else {
                dt = new Date();
                log.debug('dt', dt);
            }
            // [
            //     new Date(dt.getFullYear(), dt.getMonth() + 1, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 2, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 3, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 4, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 5, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 6, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 7, 0),
            //     new Date(dt.getFullYear(), dt.getMonth() + 8, 0),
            // ].map(function (dt) {
            //     var speed = rsf_lib_1.calculate_sales_speed(dt);
            //     list.push.apply(list, Object.keys(speed).map(function (store_id_and_item_id) { return [dt, store_id_and_item_id, speed[store_id_and_item_id]]; }));
            // });

            // 1,2,3,4,5,6,7,8,9,12,13,14,15,16,17,18

            // 19,20,21,22,23,24,25,31,32,33,34,35

            //36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,67,68,69,70,71,72,73
            
            //74,75,76,77,78,79,80,81,82,83,84
            
            //85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117
           
            // 118,119,120,121,122,123,124,125,126,127,128,129,130,
            // 131,132,133,134,135,136,137,138,139,140,141,142,143,
            // 144,145,146,147,148,149,150,151,152,153,154,155,156,
            // 157,158,159,160,162,163,164,165,166,167,168,169,170,171,172,
            // 173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,
            // 194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,
            // 211,212,213,214,215

            // 216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,237,
            // 312,313,314,315,321,322,323,324,325,326,327,328,329,330,331,332,333,334,
            // 335,341,412,413,415,512,513,514,515,516,517,518,519,520,521,522,523

            var store_arr = [
                36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,67,68,69,70,71,72,73
            ];//
            log.debug('store_arr', store_arr);
            //当前月预测值 6
            var speed = rsf_lib_1.calculate_sales_speed(dt,store_arr);
            list.push.apply(list, Object.keys(speed).map(function (store_id_and_item_id) { return [dt, store_id_and_item_id, speed[store_id_and_item_id]]; }));
            //加一个月 7
            var c = new Date(dt.getFullYear(), dt.getMonth() + 2, 0);
            var speed1 = rsf_lib_1.calculate_sales_speed1(dt, speed, store_arr);
            list1.push.apply(list1, Object.keys(speed1).map(function (store_id_and_item_id) { return [c, store_id_and_item_id, speed1[store_id_and_item_id]]; }));
            //加两个月 8
            var c1 = new Date(dt.getFullYear(), dt.getMonth() + 3, 0);
            var speed2 = rsf_lib_1.calculate_sales_speed2(dt, speed, speed1, store_arr);
            list1.push.apply(list1, Object.keys(speed2).map(function (store_id_and_item_id) { return [c1, store_id_and_item_id, speed2[store_id_and_item_id]]; }));
            //加三个月 9
            var c2 = new Date(dt.getFullYear(), dt.getMonth() + 4, 0);
            var speed3 = rsf_lib_1.getOtherData(list, speed2, speed1, speed);
            list1.push.apply(list1, Object.keys(speed3).map(function (store_id_and_item_id) { return [c2, store_id_and_item_id, speed3[store_id_and_item_id]]; }));
            //加四个月 10
            var c3 = new Date(dt.getFullYear(), dt.getMonth() + 5, 0);
            var speed4 = rsf_lib_1.getOtherData(list, speed3, speed2, speed1);
            list1.push.apply(list1, Object.keys(speed4).map(function (store_id_and_item_id) { return [c3, store_id_and_item_id, speed4[store_id_and_item_id]]; }));
            //加五个月 11
            var c4 = new Date(dt.getFullYear(), dt.getMonth() + 6, 0);
            var speed5 = rsf_lib_1.getOtherData(list, speed4, speed3, speed2);
            list1.push.apply(list1, Object.keys(speed5).map(function (store_id_and_item_id) { return [c4, store_id_and_item_id, speed5[store_id_and_item_id]]; }));
            //加六个月 12
            var c5 = new Date(dt.getFullYear(), dt.getMonth() + 7, 0);
            var speed6 = rsf_lib_1.getOtherData(list, speed5, speed4, speed3);
            list1.push.apply(list1, Object.keys(speed6).map(function (store_id_and_item_id) { return [c5, store_id_and_item_id, speed6[store_id_and_item_id]]; }));
            //加七个月 13
            var c6 = new Date(dt.getFullYear(), dt.getMonth() + 8, 0);
            var speed7 = rsf_lib_1.getOtherData(list, speed6, speed5, speed4);
            list1.push.apply(list1, Object.keys(speed7).map(function (store_id_and_item_id) { return [c6, store_id_and_item_id, speed7[store_id_and_item_id]]; }));
            list = list.concat(list1);
            return list;
        } catch (e) {
            log.debug('e', e);
        }
    };

    exports.map = function (ctx) {
        var obj = JSON.parse(ctx.value);
        var dt = obj[0];
        var _a = obj[1].split('-'), store_id = _a[0], item_id = _a[1];
        var speed = obj[2];
        ctx.write(store_id + "|" + item_id + "|" + dt, speed);
    };
    exports.reduce = function (ctx) {
        ctx.values.map(function (v) {
            log.emergency('reduce', { key: ctx.key, speed: v });
            var _a = ctx.key.split('|'), store_id = _a[0], item_id = _a[1], date = _a[2];
            var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
            var search_dt = moment(date).format(dateFormat);
            var dt = moment(date).toDate();
            var speed = Number(v);
            var r;
            try {
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
            } catch (e) {
                log.emergency('e', e);
            }
            try {
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
            }
            catch (error) {
                fun_lib_1.handleErrorAndSendNotification(error, 'rsf.forcast.mp');
            }
        });
    };
    exports.summarize = fun_lib_1.summarization;
});
