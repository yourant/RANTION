/*
 * @Author         : Li
 * @Date           : 2020-05-25 16:24:06
 * @LastEditTime   : 2020-05-25 17:14:14
 * @LastEditors    : Li
 * @Description    : 应用于 报关合同 设置 报关单 的相关字段
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.contract.declaration.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        var type = context.type;

        if (type != 'delete') {
            var af_rec = context.newRecord;

            var transport_method = af_rec.getValue('custrecord_dps_c_c_transport_method');
            var cust_contr_inv_link = af_rec.getValue('custrecord_dps_cust_contr_inv_link');

            try {
                if (cust_contr_inv_link) {
                    var customs_declaration = searchDec(cust_contr_inv_link);
                    if (customs_declaration) {
                        var id = record.submitFields({
                            type: 'customrecord_dps_customs_declaration',
                            id: customs_declaration,
                            values: {
                                custrecord_dps_cu_decl_transport_method: transport_method
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });
                    }
                }
            } catch (error) {
                log.error('设置报关单的相关字段出错了', error);
            }
        }


    }


    /**
     * 搜索同报关发票的报关单
     * @param {*} invId 
     */
    function searchDec(invId) {
        var decId;
        search.create({
            type: 'customrecord_dps_customs_declaration',
            filters: [{
                name: 'custrecord_dps_customs_decl_inv_links',
                operator: 'anyof',
                values: invId
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