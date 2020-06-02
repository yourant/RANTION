/*
 * @Author         : Li
 * @Date           : 2020-05-25 15:37:29
 * @LastEditTime   : 2020-05-25 17:15:10
 * @LastEditors    : Li
 * @Description    : 应用于 装箱记录, 获取 货品的数据
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.box.contarc.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var type = context.type;

        if (type != 'delete') {

            var af_rec = context.newRecord;

            var informa_id = af_rec.getValue('custrecord_dps_p_declaration_informa');

            var subId = "recmachcustrecord_dps_z_b_l_links";
            var numLine = af_rec.getLineCount({
                sublistId: subId
            });

            var boxItem = [];
            var total = 0,
                t_gross_eig = 0,
                t_net_gross = 0;
            for (var i = 0; i < numLine; i++) {

                var g = af_rec.getSublistValue({
                    sublistId: subId,
                    fieldId: 'custrecord_dps_pack_docu_item_gross_eig',
                    line: i
                });
                t_gross_eig += Number(g);

                var n = af_rec.getSublistValue({
                    sublistId: subId,
                    fieldId: 'custrecord_dps_pack_cu_item_net_weight',
                    line: i
                });
                t_net_gross += Number(n);

                var it = {
                    itemId: af_rec.getSublistValue({
                        sublistId: subId,
                        fieldId: 'custrecord_dps_pack_docu_item_id',
                        line: i
                    }),
                    gross_eig: g,
                    net_weight: n
                }
                boxItem.push(it);
            }

            log.debug('t_gross_eig: ' + t_gross_eig, 't_net_gross: ' + t_net_gross);

            if (informa_id) {

                var d_id = searchDec(informa_id);
                if (d_id) {
                    // 设置报关单的相关字段
                    var objRecord = record.load({
                        type: 'customrecord_dps_customs_declaration',
                        id: d_id
                    });

                    objRecord.setValue({
                        fieldId: 'custrecord_dps_cu_decl_number',
                        value: numLine
                    });
                    objRecord.setValue({
                        fieldId: 'custrecord_dps_cu_decl_gross_weight',
                        value: t_gross_eig
                    });

                    objRecord.setValue({
                        fieldId: 'custrecord_dps_cu_decl_net_weight',
                        value: t_net_gross
                    });

                    var objRecordId = objRecord.save();
                    log.audit('objRecordId', objRecordId);
                }

            }
        }


    }

    /**
     * 搜索同报关发票的报关单
     * @param {*} informa_id 
     */
    function searchDec(informa_id) {
        var decId;
        search.create({
            type: 'customrecord_dps_customs_declaration',
            filters: [{
                name: 'custrecord_dps_cu_decl_infomation_link',
                operator: 'anyof',
                values: informa_id
            }]
        }).run().each(function (rec) {
            decId = rec.id;
        });

        log.debug('decId', decId);
        return decId || false;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});