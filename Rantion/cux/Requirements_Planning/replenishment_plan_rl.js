/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/runtime'], function(record, search, log, runtime) {

    function _get(context) {
        
    }

    function _post(context) {
        var item_objs = context.item_objs,message = {},status = 'error',data = '创建失败', week = context.week;
            try{
                var result = createBill(item_objs);
                status = result.status;
                data = result.data;
            }catch(e){
                message.data = e.message;
                log.debug('error',e);
            }
        message.status = status;
        message.data = data;
        return message;
    }
     

// 1.由补货计划生成采购申请，交易主体默认选择为SKU的首选供应商；
// 2.若是多个SKU在存在不同的首选供应商，则按供应商进行拆分，生成多个采购申请；
// 3.若SKU没有默认供应商，则交易主体为蓝深贸易


    function createBill(item_objs){
        var result_data = {},ord_len = [],data_l = 0,tranids=[];
        for(var key in item_objs){
            data_l++;
            var week = key.split("-")[1];
            var t_ord = record.create({ type: 'purchaserequisition', isDynamic: true });
            t_ord.setValue({ fieldId: 'customform', value: 110 });  //备货采购-请购单表单 
            //需求计划标记   ,年份+week        
            t_ord.setValue({
            fieldId: 'custbody_replace_demand_bj',
            value: new Date().getFullYear() +""+week
            })
          
            var subsidiary = 5  //蓝深贸易
            t_ord.setValue({ fieldId: 'subsidiary', value: subsidiary });
      
            var entity_id = runtime.getCurrentUser().id;
            log.debug("entity_id:",entity_id)
            t_ord.setValue({ fieldId: 'entity', value: entity_id });
      
            var today = new Date(+new Date()+8*3600*1000);
            var ll = today.getTime();
            log.debug("today.getTime():"+ll,today);
            // t_ord.setValue({ fieldId: 'trandate', value: today });
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
                tranids.push('PR' + dateStr + new_pr_number);
                t_ord.setValue({fieldId:"tranid",value:'PR' + dateStr + new_pr_number});
            }catch(e){
                log.error("error:",e)
            }
            var vendor_id,dn;//根据SKU加供应商，找到对应的采购周期
            item_objs[key].map(function(line){
                if(!dn){
                    search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalid', operator: 'is', values:  line.item_id },
                        ],
                        columns: [
                            { name: 'othervendor'}
                        ]
                    }).run().each(function (rec) {
                            vendor_id= rec.getValue('othervendor');
                    });
                    if(vendor_id){
                        search.create({
                            type: 'customrecordpurchasing_cycle_record',
                            filters: [
                                { name: 'custrecordsku_number', operator: 'is', values: line.item_id },
                                { name: 'custrecord_vendor', operator: 'is', values: vendor_id },
                            ], 
                            columns: [
                                'custrecord_purchasing_cycle'  //采购周期
                            ]
                        }).run().each(function (rec) {
                            dn = Number(rec.getValue("custrecord_purchasing_cycle"));
                            log.debug("custrecord_purchasing_cycle:",dn)
                        });
                        if(!dn)
                             dn = 7;
                    }else{
                        dn = 7;
                    }
                }
                
               var fsf=   ll + dn*24*3600*1000 
               log.debug("fsf: "+fsf,"dn:"+dn)
                var today_l = new Date(fsf);
                t_ord.selectNewLine({ sublistId: 'item' });
                log.debug("line.item_id:",line.item_id)
                t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: line.item_id });
                log.debug("line.today_l:",today_l)
                t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'expectedreceiptdate', value: today_l});
                log.debug("line.item_quantity:",Math.abs(line.item_quantity))
                t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.item_quantity });
                t_ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'estimatedamount', value:  0});
                 // 其他字段
                    t_ord.commitLine({
                        sublistId: 'item'
                    });
               
            })
                t_ord.setValue({ fieldId: 'custbody_dps_type', value: 2 });
                log.debug("custbody_dps_type",t_ord.getValue("custbody_dps_type"));
                var t_ord_id = t_ord.save({
                    ignoreMandatoryFields: true
                });
                log.debug("生成成功",t_ord_id)
                var plan_rec = record.create({ type: 'customrecord_replenishment_plan_rec' });
                plan_rec.setValue({ fieldId: 'custrecord_replenishment_item', value:  key.split("-")[0] });
                plan_rec.setValue({ fieldId: 'custrecord_replenishment_reqpurchase', value: t_ord_id });
                plan_rec.save({ ignoreMandatoryFields: true});
                ord_len.push(t_ord_id);
          
        }

        if(ord_len.length == data_l){
            result_data.status = 'success';
            result_data.data = '生成成功 :'+JSON.stringify(tranids);
        }else if(ord_len.length < data_l){
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
