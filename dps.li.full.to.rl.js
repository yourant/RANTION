/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-22 23:57:07
 * @LastEditTime   : 2020-07-23 01:59:10
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.full.to.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */


/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format'], function (record, search, log, format) {


    function _post(context) {


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