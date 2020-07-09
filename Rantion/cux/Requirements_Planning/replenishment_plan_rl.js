/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function(record, search, log, runtime) {

    function _get(context) {
        
    }

    function _post(context) {
        var items_arr = context.items,message = {},status = 'error',data = '创建失败', week = context.week;
        if(items_arr.length > 0){
            try{
                var result = createBill(items_arr,week);
                log.debug('result',result);
                status = result.status;
                data = result.data;
            }catch(e){
                message.data = e.message;
                log.debug('error',e);
            }
        }
        message.status = status;
        message.data = data;
        return message;
    }
     

// 1.由补货计划生成采购申请，交易主体默认选择为SKU的首选供应商；
// 2.若是多个SKU在存在不同的首选供应商，则按供应商进行拆分，生成多个采购申请；
// 3.若SKU没有默认供应商，则交易主体为蓝深贸易


    function createBill(items_arr,week){
        var result_data = {},ord_len = [];
        items_arr.map(function(line){
            var t_ord = record.create({ type: 'purchaserequisition', isDynamic: true });
            try{
                var numberRecord = record.load({ type: 'customrecord_dps_po_number', id: 1, isDynamic: true });
                var pr_last_number = Number(numberRecord.getValue('custrecord_ppn_pr_number')) + 1;
                var number_date = numberRecord.getValue('custrecord_ppn_date');
                var new_pr_number = '0001';
                var now_date = new Date(new Date().getTime() + (1000 * 60 * 60 * 8));
                var nowYStr = now_date.getFullYear();
                var nowMStr = now_date.getMonth();
                var nowDStr = now_date.getDate();
                var nowDateStr = (nowYStr - 2000) + (Array(2).join('0') + (nowMStr + 1)).slice(-2) + (Array(2).join('0') + nowDStr).slice(-2);
                var numberYStr = number_date.getFullYear();
                var numberMStr = number_date.getMonth();
                var numberDStr = number_date.getDate();
                var numberDateStr = (numberYStr - 2000) + (Array(2).join('0') + (numberMStr + 1)).slice(-2) + (Array(2).join('0') + numberDStr).slice(-2);
                var dateStr = nowDateStr;
                if (nowDateStr == numberDateStr) {
                    new_pr_number = (Array(4).join('0') + pr_last_number).slice(-4);
                } else {
                    pr_last_number = 0;
                    numberRecord.setValue({ fieldId: 'custrecord_ppn_date', value: now_date });
                }
                numberRecord.setValue({ fieldId: 'custrecord_ppn_pr_number', value: pr_last_number });
                numberRecord.save();
                t_ord.setValue({fieldId:"tranid",value:'PR' + dateStr + new_pr_number})
            }catch(e){
                log.error("error:",e)
            }
               //需求计划标记   ,年份+week        
            t_ord.setValue({
                fieldId: 'custbody_replace_demand_bj',
                value: new Date().getFullYear() +""+week
              })
            t_ord.setValue({ fieldId: 'custbody_dps_type', value: 2 });
            var acc  = line.account_id
            var subsidiary = 5  //蓝深贸易
            t_ord.setValue({ fieldId: 'subsidiary', value: subsidiary });
            var entity_id = runtime.getCurrentUser().id;
            t_ord.setValue({ fieldId: 'entity', value: entity_id });
            var today = new Date(+new Date()+8*3600*1000);
      
            t_ord.setValue({ fieldId: 'trandate', value: today });
            var vendor_id,dn;//根据SKU加供应商，找到对应的采购周期
            search.create({
                type: 'item',
                filters: [
                    { name: 'internalid', operator: 'is', values:  line.item_id },
                ],
                columns: [
                    { name: 'othervendor'}
                ]
            }).run().each(function (rec) {
                    vendor_id= rec.getValue('othervendor')
            });
            if(vendor_id){
                search.create({
                    type: 'customrecordpurchasing_cycle_record',
                    filters: [
                        { name: 'custrecordsku_number', operator: 'is', values: line.item_id },
                        { name: 'custrecord_vendor', operator: 'is', values: line.vendor_id },
                    ],
                    columns: [
                        'custrecord_purchasing_cycle'  //采购周期
                    ]
                }).run().each(function (rec) {
                    dn = rec.getValue("custrecord_purchasing_cycle");
                });
            }else{
                dn = 1;
            }
            var today_l = new Date(+new Date()+(dn*24*3600*1000));
            t_ord.selectNewLine({ sublistId: 'item' });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.item_id });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', value: today_l});
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Math.abs(line.item_quantity) });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount', value:  0});
            t_ord.commitLine({
                sublistId: 'item'
            });
            // 其他字段
            try {
             
            }catch (err) {
                throw "Error inserting item line: " + line.item_id + ", abort operation!" + err;
            }
            var len = t_ord.getLineCount({sublistId:"item"});
           
            t_ord.selectLine({ sublistId: 'item',line:len -1 });
            var ss = t_ord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item'});
            log.debug("生成请购单之前，查看一下len1 "+len,ss);
            t_ord.selectNewLine({ sublistId: 'item' });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.item_id });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', value: today_l});
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: Math.abs(line.item_quantity) });
            t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount', value: 0});
            t_ord.commitLine({ sublistId: 'item'});
            var len = t_ord.getLineCount({sublistId:"item"});
            t_ord.selectLine({ sublistId: 'item',line:len -1  });
            var ss = t_ord.getCurrentSublistValue({ sublistId: 'item', fieldId: 'item'});
            log.debug("生成请购单之前，查看一下len2： "+len,ss);
            try {
                var t_ord_id = t_ord.save();
            }catch (err) {
                throw "Error inserting item line: " + line.item_id + ", abort operation!" + err;
                return
            }
            
            var plan_rec = record.create({ type: 'customrecord_replenishment_plan_rec' });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_account', value: acc });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_item', value: line.item_id });
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_qty', value: Math.abs(line.item_quantity)});
            plan_rec.setValue({ fieldId: 'custrecord_replenishment_reqpurchase', value: t_ord_id });
            plan_rec.save();
            ord_len.push(t_ord_id);
        })

        if(ord_len.length == items_arr.length){
            result_data.status = 'success';
            result_data.data = '生成成功';
        }else if(ord_len.length < items_arr.length){
            result_data.status = '部分生成成功';
            result_data.data = '生成成功的ID:' + ord_len;
        }else{
            result_data.status = 'error';
            result_data.data = '生成失败';
        }
        return result_data;
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
