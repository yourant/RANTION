/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @desc
 * @name VP 裸成本
 * @id _vp_cost_mp_io_summary
 */
define(["require", "exports", "N/log", "N/search", "N/record"], function (require, exports, log, search, record) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function () {
        try {
            var filters = [];
            //var s = search.load({ type: 'transaction', id: 'customsearch_dps_inventory_balance_yes' });//期初search
            var s = search.load({ type: 'transaction', id: 'customsearch_dps_inventory_balance_today' });//前一天search
            //filters.push({ name: 'item', operator: search.Operator.ANYOF, values: ['12449'] });
            filters.push.apply(filters, s.filters);
            return search.create({
                type: 'transaction',
                filters: filters,
                columns: s.columns,
            });
        } catch (e) {
            log.debug('e', e);
        }
    };
    exports.map = function (ctx) {
        try{
            var obj = JSON.parse(ctx.value).values;
            var item_id = obj['GROUP(item)'].value; //货品ID
            var item_qua = obj['SUM(quantity)'] ? obj['SUM(quantity)'] : 0;//数量
            var amount = obj['SUM(formulacurrency)'] ? obj['SUM(formulacurrency)'] : 0; //金额
            var now_time = new Date(+new Date()+8*3600*1000);//当前时间
            var year = now_time.getFullYear();
            var month = now_time.getMonth() + 1;
            var day = now_time.getDate();
            var balance_mq_field = 'custrecord_vp_cost_balance_mq' + month;
            var balance_ma_field = 'custrecord_vp_cost_balance_ma' + month;
            var balance_mq_field_last = 'custrecord_vp_cost_balance_mq' + (month - 1);
            var balance_ma_field_last = 'custrecord_vp_cost_balance_ma' + (month - 1);
            var inventory_balance;
            if(item_id){
                var balance_mq = 0, balance_ma = 0, balance_mq_last = 0, balance_ma_last = 0;
                search.create({
                    type: 'customrecord_vp_cost_inventory_balance',
                    filters: [
                        { name: 'custrecord_vp_cost_balance_item', operator: search.Operator.ANYOF, values: item_id },
                        { name: 'custrecord_vp_cost_balance_year', operator: search.Operator.IS, values: year }
                    ],
                    columns: [
                        { name: balance_mq_field },
                        { name: balance_ma_field },
                        { name: balance_mq_field_last },
                        { name: balance_ma_field_last },
                    ]
                }).run().each(function (rec) {
                    inventory_balance = record.load({ type: 'customrecord_vp_cost_inventory_balance', id: rec.id, isDynamic: true });
                    balance_mq = rec.getValue(rec.columns[0]);
                    balance_ma = rec.getValue(rec.columns[1]);
                    if(day == 1){
                        balance_mq_last = rec.getValue(rec.columns[2]);
                        balance_ma_last = rec.getValue(rec.columns[3]);
                    }
                    return false;
                });

                if(!inventory_balance || (month == 1 && day == 1)){
                    inventory_balance = record.create({ type: 'customrecord_vp_cost_inventory_balance', isDynamic: true });
                }
                
                inventory_balance.setValue({ fieldId: 'custrecord_vp_cost_balance_item', value: item_id });
                inventory_balance.setValue({ fieldId: 'custrecord_vp_cost_balance_year', value: year+'' });
                if(day == 1){
                    inventory_balance.setValue({ fieldId: balance_mq_field, value: (Number(item_qua) + Number(balance_mq_last)) ? (Number(item_qua) + Number(balance_mq_last)) : 0 });
                    inventory_balance.setValue({ fieldId: balance_ma_field, value: (Number(amount) + Number(balance_ma_last)) ? (Number(amount) + Number(balance_ma_last)) : 0 });
                }else{
                    if(balance_mq && balance_ma){
                        inventory_balance.setValue({ fieldId: balance_mq_field, value: (Number(item_qua) + Number(balance_mq)) ? (Number(item_qua) + Number(balance_mq)) : 0 });
                        inventory_balance.setValue({ fieldId: balance_ma_field, value: (Number(amount) + Number(balance_ma)) ? (Number(amount) + Number(balance_ma)) : 0 });
                    }else{
                        inventory_balance.setValue({ fieldId: balance_mq_field, value: (Number(item_qua) + Number(balance_mq_last)) ? (Number(item_qua) + Number(balance_mq_last)) : 0 });
                        inventory_balance.setValue({ fieldId: balance_ma_field, value: (Number(amount) + Number(balance_ma_last)) ? (Number(amount) + Number(balance_ma_last)) : 0 });
                    }
                }
                
                var balance_id = inventory_balance.save();
                if(balance_id){
                    var original_cost = 0;
                    if(day == 1){
                        original_cost = ((Number(amount) + Number(balance_ma_last)) / (Number(item_qua) + Number(balance_mq_last))).toFixed(7);
                    }else{
                        original_cost = ((Number(amount) + Number(balance_ma)) / (Number(item_qua) + Number(balance_mq))).toFixed(7);
                    }
                    record.submitFields({
                        type: 'inventoryitem',
                        id: item_id,
                        values: {
                            'custitem_vp_cost_original_cost': original_cost
                        }
                    });
                }
                log.debug('balance_id','创建成功' + balance_id);
            }
        }catch(e){
            log.debug('e', e); 
        }
    };
    exports.reduce = function (ctx) {
    };
    exports.summarize = function (summary) {
        summary.mapSummary.errors.iterator().each(function (key, value) {
            log.error(key, value);
            return true;
        });
        summary.reduceSummary.errors.iterator().each(function (key, value) {
            log.error(key, value);
            return true;
        });
    };
});
