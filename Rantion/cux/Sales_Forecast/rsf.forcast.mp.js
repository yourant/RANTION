/**!
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 基于日期生成预测结果
 * @scriptID    customscript_rsf_forcast_mp
 * @deploymentID    customdeploy_rsf_forcast_mp
 */
define(["require", "exports", "N/search", "N/record", "N/log", "N/format", "N/runtime", "./utils/fun.lib", "./service/rsf.lib", '../../Helper/Moment.min'], function (require, exports, search, record, log, format, runtime, fun_lib_1, rsf_lib_1, moment) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function (ctx) {
        try{
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
            //当前月预测值
            var speed = rsf_lib_1.calculate_sales_speed(dt);
            log.debug('speed', speed);
            list.push.apply(list, Object.keys(speed).map(function (store_id_and_item_id) { return [dt, store_id_and_item_id, speed[store_id_and_item_id]]; }));
            log.debug('list', list.length);
            log.debug('list_data', list);
            var speed1 = rsf_lib_1.calculate_sales_speed1(dt, list);
            //加一个月 7
            var c = new Date(dt.getFullYear(), dt.getMonth() + 2, 0);
            log.debug('speed1', speed1);
            list1.push.apply(list1, Object.keys(speed1).map(function (store_id_and_item_id) { return [c, store_id_and_item_id, speed1[store_id_and_item_id]]; }));
            list = list.concat(list1);
            log.debug('list', list);
            return;
            
    
            //当前月加一个月的预测值
            
            for (var i = 300; i < 375; i++) {//list.length
                //加一个月 7
                var c = new Date(dt.getFullYear(), dt.getMonth() + 2, 0);
                var a = list[i][1].split('-');
                var d = Number(list[i][2]) * 0.5;
                var b = rsf_lib_1.calculate_sales_speed1(dt, a[0], a[1], d);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c, store_id_and_item_id, b[store_id_and_item_id]]; }));
                //加两个月 8
                var c1 = new Date(dt.getFullYear(), dt.getMonth() + 3, 0);
                var b1 = rsf_lib_1.calculate_sales_speed2(dt, a[0], a[1]);
                var e = Math.round(Number(b1[list[i][1]]) + Number(b[list[i][1]]) * 0.5 + Number(list[i][2]) * 0.3);
                list1.push.apply(list1, Object.keys(b1).map(function (store_id_and_item_id) { return [c1, store_id_and_item_id, e]; }));
                //加三个月 9
                var c2 = new Date(dt.getFullYear(), dt.getMonth() + 4, 0);
                var f = Math.round(Number(e) * 0.5 + Number(b[list[i][1]]) * 0.3 + Number(list[i][2]) * 0.2);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c2, store_id_and_item_id, f]; }));
                //加四个月 10
                var c3 = new Date(dt.getFullYear(), dt.getMonth() + 5, 0);
                var f1 = Math.round(Number(f) * 0.5 + Number(e) * 0.3 + Number(b[list[i][1]]) * 0.2);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c3, store_id_and_item_id, f1]; }));
                //加五个月 11
                var c4 = new Date(dt.getFullYear(), dt.getMonth() + 6, 0);
                var f2 = Math.round(Number(f1) * 0.5 + Number(f) * 0.3 + Number(e) * 0.2);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c4, store_id_and_item_id, f2]; }));
                //加六个月 12
                var c5 = new Date(dt.getFullYear(), dt.getMonth() + 7, 0);
                var f3 = Math.round(Number(f2) * 0.5 + Number(f1) * 0.3 + Number(f) * 0.2);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c5, store_id_and_item_id, f3]; }));
                //加七个月 13
                var c6 = new Date(dt.getFullYear(), dt.getMonth() + 8, 0);
                var f4 = Math.round(Number(f3) * 0.5 + Number(f2) * 0.3 + Number(f1) * 0.2);
                list1.push.apply(list1, Object.keys(b).map(function (store_id_and_item_id) { return [c6, store_id_and_item_id, f4]; }));
            }
            list = list.concat(list1);
            log.debug('list', list);
            return;
            return list;
        }catch(e){
            log.debug('e', e);
        }
    };

    function mGetDate(year, month) {
        var d = new Date(year, month, 0);
        return d.getDate();
    }
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
