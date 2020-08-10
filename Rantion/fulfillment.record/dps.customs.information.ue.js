/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-09 13:58:40
 * @LastEditTime   : 2020-08-06 13:59:51
 * @LastEditors    : Li
 * @Description    : 应用于大货发运记录, WMS 发运产生 报关资料
 * @FilePath       : \Rantion\fulfillment.record\dps.customs.information.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['./dps.information.values', 'N/record', 'N/search', 'N/log'], function (informationValue, record, search, log) {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        try {

            var order_num, recordId, statusText,
                statusId, subText, subId,
                ship_tran_abno, af_rec = context.newRecord,
                information, type = context.type,
                legalname, gross_margin

            if (type != 'create' || type != 'delete') {

                search.create({
                    type: af_rec.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: af_rec.id
                    }],
                    columns: [
                        'custrecord_dps_shipping_rec_status', 'custrecord_dps_shipping_rec_transa_subje',
                        'custrecord_dps_shipping_rec_order_num', 'custrecord_dps_ship_tran_abno',
                        'custrecord_dps_shipping_rec_information',
                        'custrecord_dps_shipping_rec_order_num', 'custrecord_dps_shipping_rec_transa_subje',
                        {
                            name: 'custrecord_gross_margin',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        }, // 交易主体的毛利率
                        {
                            name: 'legalname',
                            join: 'custrecord_dps_shipping_rec_transa_subje'
                        }, // 交易主体 法定名称

                    ]
                }).run().each(function (rec) {
                    legalname = rec.getValue({
                        name: 'legalname',
                        join: 'custrecord_dps_shipping_rec_transa_subje'
                    });
                    gross_margin = rec.getValue({
                        name: 'custrecord_gross_margin',
                        join: 'custrecord_dps_shipping_rec_transa_subje'
                    });
                    recordId = rec.id;
                    statusText = rec.getText('custrecord_dps_shipping_rec_status');
                    statusId = rec.getValue('custrecord_dps_shipping_rec_status');

                    subText = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                    subId = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                    order_num = rec.getValue('custrecord_dps_shipping_rec_order_num');

                    ship_tran_abno = rec.getValue('custrecord_dps_ship_tran_abno');
                    information = rec.getValue('custrecord_dps_shipping_rec_information');

                });

                log.debug('statusId: ' + statusId, 'statusText: ' + statusText);

                log.debug('information', information);
                var flag = false;

                if (!information) {
                    // if ((statusId == 6 || statusText == 'WMS已发运' ||
                    //         statusId == 12 || statusText == 'WMS已装箱' ||
                    //         statusId == 10 || statusText == "已获取Shipment，等待装箱" ||
                    //         statusId == 8 || statusText == "WMS发运失败") &&
                    //     !information) { // 状态为 WMS已发运 并且 关联的报关资料

                    // var a = Math.floor(Math.random() * Math.floor(6));
                    // gross_margin = Number((0.3 + (a / 100)).toFixed(2));
                    log.audit('毛利率', gross_margin);
                    log.audit('order_num', order_num);

                    var info = informationValue.searchPOItem(order_num);
                    log.debug('info', info);
                    if (info && info.length > 0) {
                        log.debug('存在对应的货品', info.length);
                        // 创建报关资料
                        var informaId = informationValue.createInformation(recordId, order_num);
                        log.debug('informaId', informaId);

                        if (informaId) {
                            // 创建报关发票
                            var invId = informationValue.createCusInv(info, informaId, gross_margin);

                            log.debug('invId', invId);

                            // 创建报关装箱
                            var boxId = informationValue.createBoxRec(info, informaId);
                            log.debug('boxId', boxId);

                            // 创建报关合同
                            var conId = informationValue.createContract(info, informaId, subId);
                            log.debug('conId', conId);

                            // 创建报关单
                            var decId = informationValue.createDeclaration(info, informaId, gross_margin, legalname);
                            log.debug('decId', decId);

                            // 创建报关要素
                            var eleArr = informationValue.CreateElementsOfDeclaration(info, informaId);
                            log.debug('eleArr', eleArr);

                            // 创建 开票资料
                            var usbArr = informationValue.createBillInformation(info, informaId, ship_tran_abno);
                            log.debug('usbArr', usbArr);

                            // 关联报关资料, 需要全部报关资料产生之后再关联
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    custrecord_dps_shipping_rec_information: informaId,
                                    custrecord_dps_customs_information: '创建报关资料成功',
                                    custrecord_dps_declared_value_dh: invId.total_amount,
                                    custrecord_dps_declare_currency_dh: invId.currency
                                }
                            });
                        } else {
                            record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordId,
                                values: {
                                    // custrecord_dps_shipping_rec_information: informaId,
                                    custrecord_dps_customs_information: '创建报关资料失败'
                                }
                            });
                        }

                    } else {
                        log.debug('不存在对应的货品', '搜索到的货品信息为空');
                        record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: recordId,
                            values: {
                                // custrecord_dps_shipping_rec_information: informaId,
                                custrecord_dps_customs_information: '创建报关资料失败,映射关系中找不到关联的采购订单'
                            }
                        });
                    }
                }
            }

        } catch (error) {

            log.error('生成报关资料,出错了', error);

            try {
                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.newRecord.id,
                    values: {
                        // custrecord_dps_shipping_rec_information: informaId,
                        custrecord_dps_customs_information: JSON.stringify(error)
                    }
                });
            } catch (error) {
                log.error('报错保存数据出错了', error);
            }
        }

    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});