/*
 * @Author         : Li
 * @Date           : 2020-05-25 11:48:15
 * @LastEditTime   : 2020-05-25 15:29:17
 * @LastEditors    : Li
 * @Description    : 应用于 报关发票, 设置报关发票中的相关字段的值于相关记录中
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.invoice.box.ue.js
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
        var af_rec = context.newRecord;

        var inv_number = af_rec.getValue('custrecord_dps_cus_inv_number'); // 发票号
        var inv_contract = af_rec.getValue('custrecord_dps_cus_inv_contract'); // 合同
        var inv_to = af_rec.getValue('custrecord_dps_cus_inv_to'); // To
        var inv_shipping_port = af_rec.getValue('custrecord_dps_cus_inv_shipping_port'); // 装运口岸
        var inv_destination = af_rec.getValue('custrecord_dps_cus_inv_destination'); // 目的地


        log.debug('inv_number', inv_number);
        try {

            var objRecord = record.load({
                type: af_rec.type,
                id: af_rec.id
            });

            // ==============================设置 报关装箱的 相关字段=================================
            var boxType = 'recmachcustrecord_dps_packing_doc_inv_links';
            var boxLine = objRecord.getLineCount({
                sublistId: boxType
            });
            log.debug('boxLine', boxLine);
            for (var box_i = 0; box_i < boxLine; box_i++) {
                objRecord.setSublistValue({
                    sublistId: boxType,
                    fieldId: 'custrecord_dps_pack_docu_inv_no',
                    line: box_i,
                    value: inv_number
                });
                objRecord.setSublistValue({
                    sublistId: boxType,
                    fieldId: 'custrecord_dps_pack_docu_contract_number',
                    line: box_i,
                    value: inv_contract
                });
                objRecord.setSublistValue({
                    sublistId: boxType,
                    fieldId: 'custrecord_dps_pack_docu_to',
                    line: box_i,
                    value: inv_to
                });
            }


            // ==============================设置 报关合同 的相关字段=================================
            var contractType = "recmachcustrecord_dps_cust_contr_inv_link";
            var conLine = objRecord.getLineCount({
                sublistId: contractType
            });

            var ord = [];
            search.create({
                type: 'customrecord_dps_customs_contract',
                filters: [{
                    name: 'custrecord_dps_cust_contr_inv_link',
                    operator: 'anyof',
                    values: af_rec.id
                }]
            }).run().each(function (rec) {
                ord.push(rec.id);
                return true;
            });
            log.debug('ord', ord);
            log.debug('conLine', conLine);
            for (var con_i = 0; con_i < conLine; con_i++) {
                // objRecord.setSublistValue({
                //     sublistId: contractType,
                //     fieldId: 'custrecord_dps_pack_docu_inv_no',
                //     line: con_i,
                //     value: inv_number
                // });
                objRecord.setSublistValue({
                    sublistId: contractType,
                    fieldId: 'custrecord_dps_c_c_contract_no',
                    line: con_i,
                    value: inv_contract
                });
                objRecord.setSublistValue({
                    sublistId: contractType,
                    fieldId: 'custrecord_dps_c_c_arrival_port',
                    line: con_i,
                    value: inv_shipping_port
                });
            }

            // ==============================设置 报关单 的相关字段  报关单需要设置 行上的字段  =================================
            var declarationType = "recmachcustrecord_dps_customs_decl_inv_links";
            var decLine = objRecord.getLineCount({
                sublistId: declarationType
            });

            var ord = [];
            search.create({
                type: 'customrecord_dps_customs_declaration',
                filters: [{
                    name: 'custrecord_dps_customs_decl_inv_links',
                    operator: 'anyof',
                    values: af_rec.id
                }]
            }).run().each(function (rec) {
                ord.push(rec.id);
                return true;
            });
            log.debug('ord', ord);
            log.debug('decLine', decLine);
            for (var dec_i = 0; dec_i < decLine; dec_i++) {
                // objRecord.setSublistValue({
                //     sublistId: declarationType,
                //     fieldId: 'custrecord_dps_pack_docu_inv_no',
                //     line: dec_i,
                //     value: inv_number
                // });
                objRecord.setSublistValue({
                    sublistId: declarationType,
                    fieldId: 'custrecord_dps_cu_decl_contract_agreemen',
                    line: dec_i,
                    value: inv_contract
                });
                // TODO  设置目的地等信息
                // objRecord.setSublistValue({
                //     sublistId: declarationType,
                //     fieldId: 'custrecord_dps_c_c_arrival_port',
                //     line: dec_i,
                //     value: inv_shipping_port
                // });
            }

            // ==============================设置 申报要素 的相关字段 =================================
            var elementsType = "recmachcustrecord_dps_elem_dedecl_inv_link";
            var eleLine = objRecord.getLineCount({
                sublistId: elementsType
            });

            var ord = [];
            search.create({
                type: 'customrecord_dps_elements_declaration',
                filters: [{
                    name: 'custrecord_dps_elem_dedecl_inv_link',
                    operator: 'anyof',
                    values: af_rec.id
                }]
            }).run().each(function (rec) {
                ord.push(rec.id);
                return true;
            });

            log.debug('ord', ord);

            log.debug('eleLine', eleLine);
            /*
            for (var dec_i = 0; dec_i < decLine; dec_i++) {
                // objRecord.setSublistValue({
                //     sublistId: elementsType,
                //     fieldId: 'custrecord_dps_pack_docu_inv_no',
                //     line: dec_i,
                //     value: inv_number
                // });
                objRecord.setSublistValue({
                    sublistId: elementsType,
                    fieldId: 'custrecord_dps_cu_decl_contract_agreemen',
                    line: dec_i,
                    value: inv_contract
                });
                // TODO  设置目的地等信息
                // objRecord.setSublistValue({
                //     sublistId: elementsType,
                //     fieldId: 'custrecord_dps_c_c_arrival_port',
                //     line: dec_i,
                //     value: inv_shipping_port
                // });
            }
            */

            var objRecord_id = objRecord.save();
            log.audit("objRecord_id", objRecord_id);

        } catch (error) {
            log.error('设置相关字段出错了', error);
        }

    }

    // 搜索当前发票关联的相关记录
    function searchInvLink(recType, filter) {
        var recId = [],
            limit = 3999;
        search.create({
            type: recType,
            filters: filter
        }).run().each(function (rec) {
            recId.push(rec.id);
            return --limit > 0;
        });

        return packId || false;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});