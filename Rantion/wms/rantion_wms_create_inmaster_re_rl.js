/*
 * @Author         : Li
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-05-19 15:29:23
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_inmaster_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function _get(context) {

    }

    function _post(context) {
        // 回传报文
        // InMasterResultDto {
        //     detailList (Array[InDetailResultDto]): 入库明细 ,
        //     sourceNo (string): 来源单号 ,
        //     sourceType (integer): 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库
        // }
        //     InDetailResultDto {
        //     detailRecordList (Array[InDetailRecordResultDto]): sku上架明细 ,
        //     planQty (integer): 计划入库数 ,
        //     receivedQty (integer): 实收数量 ,
        //     shelvesQty (integer): 上架数量 ,
        //     sku (string): sku ,
        //     unqualifiedQty (integer): 质检不合格数
        // }
        // InDetailRecordResultDto {
        //     barcode (string): 条码 装箱条码/SKU ,
        //     positionCode (string): 库位编号 ,
        //     shelvesQty (integer): 上架数量 ,
        //     sku (string): sku ,
        //     type (integer): 类型 1:已装箱 2:未装箱
        // }

        var sourceType = context.sourceType;
        log.debug('context',context);
        var re_id;
        if(sourceType == 10){
            re_id = returnDelivery(context);
            var retjson = {};
            if(re_id){
                retjson.code = 0;
                retjson.data = {};
                retjson.msg = '推送成功';
                return JSON.stringify(retjson);
            }else{
                retjson.code = 1;
                retjson.data = {};
                retjson.msg = '推送失败';
                return JSON.stringify(retjson);
            }
            
        }
        else if (sourceType == 20) {
            re_id = returnInfo(context);
        }




        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';
        return JSON.stringify(retjson);
    }

    function _put(context) {

    }

    //交货单返回
    function returnDelivery(context){
        try{
            var sourceNo = context.sourceNo,ret_id;
            log.debug('sourceNo',sourceNo);
            search.create({
                type: 'customrecord_dps_delivery_order',
                filters: [
                    {name: 'name',operator: 'is',values: sourceNo}
                ]
            }).run().each(function (rec) {
                ret_id = rec.id;
            });
            log.debug('ret_id',ret_id);
            if(ret_id){
                var objRecord = record.load({type: 'customrecord_dps_delivery_order',id: ret_id});
                var count = objRecord.getLineCount({ sublistId: 'recmachcustrecord_dps_delivery_order_id' });
                if(context.detailList.length > 0){
                    context.detailList.map(function(line){
                        for(var i = 0; i < count; i++){
                            var item_sku = objRecord.getSublistText({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_item_sku', line: i });
                            if(line.sku == item_sku){
                                objRecord.setSublistValue({ sublistId: 'recmachcustrecord_dps_delivery_order_id', fieldId: 'custrecord_stock_quantity', value: line.shelvesQty, line: i })
                            }
                        }
                    });
                }
                var objRecord_id = objRecord.save();
                if(objRecord_id){
                    record.submitFields({
                        type: "customrecord_dps_delivery_order",
                        id: ret_id,
                        values: {
                            custrecord_delivery_order_status: 4
                        }
                    });

                    //生成货品收据
                    var receipt_id = createItemReceipt(objRecord.getValue('custrecord_purchase_order_no'),context.detailList);
                    if(receipt_id){
                        log.debug('创建货品收据','成功');
                    }
                }
                return objRecord_id;
            }
        }catch(e){
            log.debug('error',e);
        }
    }

    //生成货品收据
    function createItemReceipt(po_id,item){
        var objRecord = record.transform({
			fromType : 'purchaseorder',
			fromId : po_id,
			toType : 'itemreceipt',
			//isDynamic : true,
        });
        var count = objRecord.getLineCount({sublistId: 'item'});
        log.debug('count',count);
        item.map(function(line){
            for(var i = 0; i < count; i++){
                var item_id = objRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                var item_sku;
                search.create({
                    type: 'item',
                    filters: [
                        {name: 'internalid',operator: 'is',values: item_id}
                    ],
                    columns: [
                        'itemid'
                    ]
                }).run().each(function (rec) {
                    item_sku = rec.getValue('itemid');
                });
                if(item_sku == line.sku){
                    log.debug('item_sku',item_sku);
                    log.debug('line.sku',line.sku);
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: line.receivedQty,
                        line: i
                    });
                }
            }
        })

        return objRecord.save();
    }

    function returnInfo(context) {


        // InMasterResultDto {
        //     detailList(Array[InDetailResultDto]): 入库明细,
        //     sourceNo(string): 来源单号,
        //     sourceType(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 盘盈入库
        // }
        // InDetailResultDto {
        //     detailRecordList(Array[InDetailRecordResultDto]): sku上架明细,
        //     planQty(integer): 计划入库数,
        //     receivedQty(integer): 实收数量,
        //     shelvesQty(integer): 上架数量,
        //     sku(string): sku,
        //     unqualifiedQty(integer): 质检不合格数
        // }
        // InDetailRecordResultDto {
        //     barcode(string): 条码 装箱条码 / SKU,
        //     positionCode(string): 库位编号,
        //     shelvesQty(integer): 上架数量,
        //     sku(string): sku,
        //     type(integer): 类型 1: 已装箱 2: 未装箱
        // }

        var limit = 3999,
            ret_id,
            sku = [];
        var sourceNo = context.sourceNo;
        search.create({
            type: 'returnauthorization',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'poastext',
                    operator: 'is',
                    values: sourceNo
                }
            ],
            columns: [{
                    name: 'item'
                },
                {
                    name: "custcol_dps_trans_order_item_sku"
                }
            ]
        }).run().each(function (rec) {
            ret_id = rec.id;
            sku.push(rec.getValue('custcol_dps_trans_order_item_sku'));
            return --limit > 0;
        });

        var objRecord = record.load({
            type: 'returnauthorization',
            id: ret_id
        });
        var detailList = context.detailList;
        for (var i = 0, length = detailList.length; i < length; i++) {
            var re_sku = detailList[i].sku;
            var receivedQty = detailList[i].receivedQty;
            var unreceivedQty = detailList[i].planQty - receivedQty
            for (var j = 0, len = sku.length; j < len; j++) {
                if (re_sku == sku[j]) {

                    var lin = objRecord.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: custcol_dps_trans_order_item_sku,
                        value: re_sku
                    })
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: "custcol_dps_quantity_in_stock",
                        line: lin,
                        value: receivedQty
                    });
                    objRecord.setSublistValue({
                        sublistId: 'item',
                        fieldId: "custcol_dps_unstocked_quantity",
                        line: lin,
                        value: unreceivedQty
                    });
                }
            }
        }

        var objRecord_id = objRecord.save();

        return objRecord_id;

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