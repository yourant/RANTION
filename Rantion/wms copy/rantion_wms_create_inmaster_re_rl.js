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
define([], function () {

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

        var re_id;

        if (sourceType == 20) {
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