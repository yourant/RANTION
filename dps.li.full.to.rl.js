/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-22 23:57:07
 * @LastEditTime   : 2020-08-03 20:09:09
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.full.to.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */


/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format', 'N/https'], function (record, search, log, format, https) {

    function _post(context) {



    }




    function ToWMS(context) {
        var limit = 3999,
            itemArr = [],
            date = {};


        data["boxNum"] = 1; // 箱数
        data["estimateTime"] = new Date().toISOString(); // 预计到货时间
        data["inspectionType"] = 10; // 质检类型
        data["sourceNo"] = toNO; // 来源单号
        data["sourceType"] = 30; // 来源类型
        data["taxFlag"] = 0; // 是否含税
        data["tradeCompanyCode"] = 0; // 交易主体编号
        data["tradeCompanyName"] = 0; // 交易主体名称
        data["warehouseCode"] = "US_MX"; // 仓库编号
        data["warehouseName"] = "美西仓"; // 仓库名称


        search.create({
            type: 'transferorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                value: context
            }],
            columns: [

            ]
        }).run().each(function (rec) {

            var it = {
                boxInfo: {
                    msg: 123
                },
                boxNum: 1,
                inspectionType: 30,
                planQty: ,
                productCode: ,
                productImageUrl: ,

            };


            itemArr.push();
            return --limit > 0;
        })

        data["skuList"] = "美西仓"; // 入库明细

    }


    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 1
            }],
            columns: ['custrecord_wtr_token']
        }).run().each(function (result) {
            token = result.getValue('custrecord_wtr_token');
        });
        return token;
    }



    function recTO() {
        var ord = [];
        var limit = 2;

        var a = new Date().getTime();
        search.create({
            type: "customrecord_dps_juge_po",
            filters: [{
                    name: 'custrecord_juge_wrong',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'custrecord_juge_sho',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "custrecord_juge_time", // 收货日期
                "custrecord_juge_po", // 调拨单ID
                "custrecord_juge_sho", // 已生成单据
                "custrecord_juge_wrong", // 数据有问题
            ]
        }).run().each(function (rec) {


            log.debug("编号: " + rec.id, rec.getText("custrecord_juge_po"))
            try {

                var n_date = rec.getValue('custrecord_juge_time') + "T10:00:00.000Z"

                log.debug("rec.getValue('custrecord_juge_time')", rec.getValue('custrecord_juge_time'))
                // 直接履行
                var objRecord = record.transform({
                    fromType: 'transferorder',
                    fromId: rec.getValue('custrecord_juge_po'),
                    toType: 'itemfulfillment',
                });

                objRecord.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                var numLines = objRecord.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < numLines; i++) {
                    objRecord.setSublistText({
                        sublistId: 'item',
                        fieldId: 'custcol_location_bin',
                        text: 'HD1A01',
                        line: i
                    }); // 仓库编号
                }

                objRecord.setText({
                    fieldId: 'trandate',
                    text: rec.getValue('custrecord_juge_time')
                });
                // objRecord.setValue({
                //     fieldId: 'trandate',
                //     value: format.format({
                //         value: new Date(n_date),
                //         type: format.Type.DATE
                //     })
                // });


                var objRecord_id = objRecord.save();





                var objRecordCeipt = record.transform({
                    fromType: 'transferorder',
                    fromId: rec.getValue('custrecord_juge_po'),
                    toType: 'itemreceipt',
                });

                objRecordCeipt.setText({
                    fieldId: 'trandate',
                    text: rec.getValue('custrecord_juge_time')
                });


                var numLines = objRecordCeipt.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < numLines; i++) {
                    objRecordCeipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_location_bin',
                        value: '',
                        line: i
                    }); // 仓库编号
                }



                var obj_id = objRecordCeipt.save();

                var l_rec_id = record.submitFields({
                    type: 'customrecord_dps_juge_po',
                    id: rec.id,
                    values: {
                        custrecord_juge_sho: true
                    },
                })
            } catch (error) {

                log.error('出错 ' + rec.getText("custrecord_juge_po"), error)
                var l_rec_id = record.submitFields({
                    type: 'customrecord_dps_juge_po',
                    id: rec.id,
                    values: {
                        custrecord_juge_wrong: true
                    },
                })
            }


            return --limit > 0;

        });


        var b = new Date().getTime();
        var c = {
            "处理时间": (b - a) / 1000 + ' 秒'
        }

        return c
    }
    return {

        post: _post,

    }
});