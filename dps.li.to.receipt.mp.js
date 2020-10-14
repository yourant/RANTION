/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-10 15:57:07
 * @LastEditTime   : 2020-10-13 10:52:14
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \dps.li.to.receipt.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/runtime'], function(search, record, runtime) {

    function getInputData() {

        var run_limit = 3999,
            getArr = [];


        var rec_id = runtime.getCurrentScript().getParameter({
            name: 'custscript_dps_li_rec_id'
        })
        var data_length = runtime.getCurrentScript().getParameter({
            name: '	custscript_dps_li_data_length'
        })

        if (data_length && data_length <= run_limit) {
            run_limit = data_length;
        }
        var filter = [];

        filter.push({ name: 'custrecord_juge_sho', operator: 'is', values: false });

        if (rec_id) {
            filter.push({ name: 'internalid', operator: 'anyof', values: rec_id })
        }
        search.create({
            type: 'customrecord_dps_juge_po',
            filters: filter,
            columns: [
                "custrecord_juge_po", // PO ID
                "custrecord_juge_time", // 日期
                "custrecord_juge_product", // 货品
                "custrecord_juge_quantiy", // 数量
                "custrecord_dps_location_bin", // 库位
            ]
        }).run().each(function(_rec) {
            var it = {
                rec_id: _rec.id,
                po_id: _rec.getValue("custrecord_juge_po"),
                po_date: _rec.getValue('custrecord_juge_time'),
                po_item: _rec.getValue('custrecord_juge_product'),
                po_qty: _rec.getValue('custrecord_juge_quantiy')
            };

            getArr.push(it);
            return --run_limit > 0;
        });

        log.audit("数据长度", getArr.length);
        return getArr;
    }

    function map(context) {

        var _val = JSON.parse(context.value);
        log.debug('_val  ' + typeof(_val), _val);
        try {

            var _item_fulfillment = record.transform({
                fromType: 'transferorder',
                toType: "itemfulfillment",
                fromId: Number(_val.po_id)
            });


            _item_fulfillment.setText({
                fieldId: 'trandate',
                text: _val.po_date
            })
            _item_fulfillment.setValue({
                fieldId: 'shipstatus',
                value: "C"
            })
            var lineNumber = _item_fulfillment.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: _val.po_item
            });

            _item_fulfillment.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: lineNumber,
                value: _val.po_qty
            });

            var numLines = _item_fulfillment.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < numLines; i++) {
                _item_fulfillment.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    line: i,
                    value: false
                });
            }

            var _item_fulfillment_id = _item_fulfillment.save();

            log.audit("开始履行", _item_fulfillment_id)


            var _item_recive = record.transform({
                fromType: 'transferorder',
                toType: "itemreceipt",
                fromId: Number(_val.po_id)
            });


            var numLines = _item_recive.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < numLines; i++) {
                _item_recive.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    line: i,
                    value: false
                });
            }


            _item_recive.setText({
                fieldId: 'trandate',
                text: _val.po_date
            })
            var lineNumber = _item_recive.findSublistLineWithValue({
                sublistId: 'item',
                fieldId: 'item',
                value: _val.po_item
            });

            _item_recive.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: lineNumber,
                value: _val.po_qty
            });

            var _item_recive_id = _item_recive.save();

            record.submitFields({
                type: 'customrecord_dps_juge_po',
                id: _val.rec_id,
                values: {
                    custrecord_juge_sho: true
                }
            })


            log.audit("调拨单收货成功", _item_recive_id);
        } catch (error) {
            log.error("处理出错了", error);
        }


    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});