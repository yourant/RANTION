/*
 * @Author         : Li
 * @Date           : 2020-05-08 16:50:16
 * @LastEditTime   : 2020-05-25 19:34:49
 * @LastEditors    : Li
 * @Description    : 复制对应的销售订单, 生成新的销售订单; 推送 入库信息到WMS
 * @FilePath       : \Rantion\so\dps.li.sales.replenishment.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format', "../../douples_amazon/Helper/Moment.min", 'N/runtime', 'N/runtime'], function (record, search, log, format, moment, runtime, runtime) {


    function _post(context) {

        log.debug('context', context);

        var info = {};

        var action = context.action;
        log.debug('action', action);
        if (action == 1) {
            // SO
            var soId = createSO(context);
            info = {
                soId: soId,
                action: 'createSo'
            }
            return info;
        } else if (action == 2) {
            // WMS

            var getWMSid = toWMS(context);
            info = {
                soId: getWMSid,
                action: 'WMS'
            }

            return info;
        }

        return info || false;

    }

    function toWMS(con) {




        // 推送WMS 成功, 标记状态
        var id = record.submitFields({
            type: 'returnauthorization',
            id: con.id,
            values: {
                custbody_dps_push_wms: true
            }
        });


        return id || false;
    }

    /**
     * create SO
     * @param {*} con 
     */
    function createSO(con) {

        var objRecord = record.copy({
            type: record.Type.SALES_ORDER,
            id: con.soId,
            // isDynamic: true
        });

        log.audit('new Date()', new Date());
        log.audit('new Date().getTimezoneOffset()', new Date().getTimezoneOffset());
        objRecord.setValue({
            fieldId: 'trandate',
            value: new Date()
        });

        objRecord.setValue({
            fieldId: 'custbody_order_type',
            value: 4
        });

        objRecord.setValue({
            fieldId: 'custbody_dps_link_so',
            value: con.id
        });

        // 补单类型的销售订单, 标记生成小货发运记录
        objRecord.setValue({
            fieldId: 'custbody_dps_so_create_ful_record',
            value: true
        });

        var numLines = objRecord.getLineCount({
            sublistId: 'item'
        });

        log.debug('numLines', numLines);

        for (var i = 0; i < numLines; i++) {
            objRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                value: 0,
                line: i
            });
            objRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                value: 0,
                line: i
            });
        }

        log.audit('objRecord', objRecord);
        var new_so_id = objRecord.save();


        // var newRate = record.load({
        //     type: 'salesorder',
        //     id: new_so_id
        // });

        // var numLines = newRate.getLineCount({
        //     sublistId: 'item'
        // });

        // log.debug('numLines', numLines);

        // for (var i = 0; i < numLines; i++) {
        //     objRecord.setSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'rate',
        //         value: 0,
        //         line: i
        //     });
        //     objRecord.setSublistValue({
        //         sublistId: 'item',
        //         fieldId: 'amount',
        //         value: 0,
        //         line: i
        //     });
        // }


        var id = record.submitFields({
            type: 'returnauthorization',
            id: con.id,
            values: {
                custbody_dps_link_so: new_so_id
            }
        });

        return new_so_id || false;
    }

    return {

        post: _post

    }
});