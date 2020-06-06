/*
 * @Author         : Li
 * @Date           : 2020-05-25 15:37:29
 * @LastEditTime   : 2020-06-06 11:49:38
 * @LastEditors    : Li
 * @Description    : 应用于 装箱记录, 获取 货品的数据
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.box.contarc.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record', 'N/log', 'N/currency'], function (search, record, log, currency) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {


        var information, afRec = context.newRecord,
            limit = 3999,
            total = 0,
            t_gross_eig = 0,
            t_net_gross = 0;

        if (context.type == 'edit') {
            search.create({
                type: afRec.type,
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: afRec.id
                }],
                columns: [
                    'custrecord_dps_p_declaration_informa', // 报关资料
                    {
                        name: 'custrecord_dps_pack_docu_item_box_qty',
                        join: 'custrecord_dps_z_b_l_links'
                    }, // 总箱数
                    {
                        name: 'custrecord_dps_pack_docu_item_gross_eig',
                        join: 'custrecord_dps_z_b_l_links'
                    }, // 总毛重
                    {
                        name: 'custrecord_dps_pack_cu_item_net_weight',
                        join: 'custrecord_dps_z_b_l_links'
                    }, // 总净重
                ]
            }).run().each(function (rec) {
                information = rec.getValue('custrecord_dps_p_declaration_informa');
                total += Number(rec.getValue({
                    name: 'custrecord_dps_pack_docu_item_box_qty',
                    join: 'custrecord_dps_z_b_l_links'

                }));

                t_gross_eig += Number(rec.getValue({
                    name: 'custrecord_dps_pack_docu_item_gross_eig',
                    join: 'custrecord_dps_z_b_l_links'
                }));


                t_net_gross += Number(rec.getValue({
                    name: 'custrecord_dps_pack_cu_item_net_weight',
                    join: 'custrecord_dps_z_b_l_links'
                }));

                return --limit > 0;
            });


            if (information) {

                search.create({
                    type: 'customrecord_dps_customs_declaration',
                    filters: [{
                        name: 'custrecord_dps_cu_decl_infomation_link',
                        operator: 'anyof',
                        values: information
                    }]
                }).run().each(function (rec) {

                    var box_id = record.submitFields({
                        type: 'customrecord_dps_customs_declaration',
                        id: rec.id,
                        values: {
                            custrecord_dps_cu_decl_number: total,
                            custrecord_dps_cu_decl_gross_weight: t_gross_eig,
                            custrecord_dps_cu_decl_net_weight: t_net_gross,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                });
            }
        }

    }


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});