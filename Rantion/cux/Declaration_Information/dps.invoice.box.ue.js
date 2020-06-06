/*
 * @Author         : Li
 * @Date           : 2020-05-25 11:48:15
 * @LastEditTime   : 2020-06-05 22:25:07
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

        log.debug('afterSubmit', af_rec.type);
        if (context.type == 'edit') {

            var inv_number = af_rec.getValue('custrecord_dps_cus_inv_number'); // 发票号
            var inv_contract = af_rec.getValue('custrecord_dps_cus_inv_contract'); // 合同
            var inv_to = af_rec.getValue('custrecord_dps_cus_inv_to'); // To
            var inv_shipping_port = af_rec.getValue('custrecord_dps_cus_inv_shipping_port'); // 装运口岸
            var inv_destination = af_rec.getValue('custrecord_dps_cus_inv_destination'); // 目的地
            var information = af_rec.getValue('custrecord_dps_cus_inv_information'); // 报关资料

            search.create({
                type: af_rec.type,
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [
                    'custrecord_dps_cus_inv_number', // 发票号
                    'custrecord_dps_cus_inv_contract', // 合同号
                    'custrecord_dps_cus_inv_to', // TO
                    'custrecord_dps_cus_inv_shipping_port', // 装运口岸
                    'custrecord_dps_cus_inv_destination', // 目的地
                    'custrecord_dps_cus_inv_information', // 报关资料
                ]
            }).run().each(function (rec) {
                inv_number = rec.getValue('custrecord_dps_cus_inv_number');
                inv_contract = rec.getValue('custrecord_dps_cus_inv_contract');
                inv_to = rec.getValue('custrecord_dps_cus_inv_to');
                inv_shipping_port = rec.getValue('custrecord_dps_cus_inv_shipping_port');
                inv_destination = rec.getValue('custrecord_dps_cus_inv_destination');
                information = rec.getValue('custrecord_dps_cus_inv_information');
            });


            log.debug('inv_number', inv_number);
            try {
                if (information && context.type != 'delete') {

                    // ==============================设置 报关装箱的 相关字段   start =================================
                    var boxId;
                    search.create({
                        type: 'customrecord_dps_packing_documents',
                        filters: [{
                            name: 'custrecord_dps_p_declaration_informa',
                            operator: 'anyof',
                            values: information
                        }]
                    }).run().each(function (rec) {
                        boxId = rec.id;
                    });


                    var box_id = record.submitFields({
                        type: 'customrecord_dps_packing_documents',
                        id: boxId,
                        values: {
                            custrecord_dps_pack_docu_inv_no: inv_number,
                            custrecord_dps_pack_docu_contract_number: inv_contract,
                            custrecord_dps_pack_docu_to: inv_to,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });

                    log.debug('box_id', box_id);


                    // ==============================设置 报关合同 的相关字段=================================
                    var conId;
                    search.create({
                        type: 'customrecord_dps_customs_contract',
                        filters: [{
                            name: 'custrecord_dps_c_c_information',
                            operator: 'anyof',
                            values: information
                        }],
                    }).run().each(function (rec) {
                        conId = rec.id;
                    });

                    var con_id = record.submitFields({
                        type: 'customrecord_dps_customs_contract',
                        id: conId,
                        values: {
                            custrecord_dps_c_c_contract_no: inv_contract,
                            custrecord_dps_c_c_arrival_port: inv_destination,
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });

                    log.debug('con_id', con_id);

                    // ==============================设置 报关单 的相关字段  报关单需要设置 行上的字段 =================================

                    var cosId;
                    search.create({
                        type: 'customrecord_dps_customs_declaration',
                        filters: [{
                            name: 'custrecord_dps_cu_decl_infomation_link',
                            operator: 'anyof',
                            values: information
                        }],
                    }).run().each(function (rec) {
                        cosId = rec.id;
                    });

                    var cosRec = record.load({
                        type: 'customrecord_dps_customs_declaration',
                        id: cosId
                    });

                    cosRec.setValue({
                        fieldId: 'custrecord_dps_cu_decl_contract_agreemen',
                        value: inv_contract
                    });
                    cosRec.setValue({
                        fieldId: 'custrecord_dps_cu_decl_trading_country',
                        value: inv_destination
                    });
                    cosRec.setValue({
                        fieldId: 'custrecord_dps_cu_decl_shipping_country',
                        value: inv_destination
                    });
                    cosRec.setValue({
                        fieldId: 'custrecord_dps_cu_decl_finger_port',
                        value: inv_destination
                    });

                    var cosSubId = 'recmachcustrecord_dps_customs_decla_item_link';

                    var numLines = cosRec.getLineCount({
                        sublistId: cosSubId
                    });

                    for (var i = 0; i < numLines; i++) {
                        cosRec.setSublistValue({
                            sublistId: cosSubId,
                            fieldId: 'custrecord_dps_customs_decl_item_ori_arr',
                            value: inv_destination,
                            line: i
                        });

                    }

                    var cos_id = cosRec.save();
                    log.debug('cos_id', cos_id);

                }

            } catch (error) {
                log.error('设置相关字段出错了', error);
            }
        }


    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});