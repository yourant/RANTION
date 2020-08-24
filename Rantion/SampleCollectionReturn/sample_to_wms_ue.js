/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', '../Helper/config.js', 'N/format', 'N/http', 'N/record'], function (search, config, format, http, record) {

    function beforeLoad(context) {
        var newRecord = context.newRecord;
        if (context.type == 'view' && newRecord.getValue('custrecord_approve_status') == 6 && (newRecord.getValue('custrecord_stauts_wms') == 5 || newRecord.getValue('custrecord_stauts_wms') == 1)) {
            var form = context.form
            form.clientScriptModulePath = './sample_to_wms_cs.js';
            form.addButton({
                id: 'custpage_push_to_wms',
                label: '推送WMS',
                functionName: 'pushToWms("' + newRecord.getValue('custrecord_collect_type') + '")'
            });
        }
    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {
        var newRecord = context.newRecord;
        if (context.type != 'delete' && newRecord.getValue('custrecord_approve_status') == 6 && newRecord.getValue('custrecord_stauts_wms') == 1) {
            var data = {};
            if (newRecord.getValue('custrecord_collect_type') == 1) {
                try {
                    search.create({
                        type: 'customrecord_sample_use_return',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: newRecord.id }
                        ],
                        columns: [
                            'custrecord_logistics_channel_ser_num',
                            'custrecord23220',
                            'custrecord_logistics_channel_pro_num',
                            'custrecord_logistics_channel_provider',
                            'name',
                            { name: 'custrecord_dps_wms_location', join: 'custrecord_location_use_back' },
                            { name: 'custrecord_dps_wms_location_name', join: 'custrecord_location_use_back' }
                        ]
                    }).run().each(function (rec) {
                        data["logisticsChannelCode"] = rec.getValue('custrecord_logistics_channel_ser_num'); //  '物流渠道服务编号';
                        data["logisticsChannelName"] = rec.getText('custrecord23220'); // '物流渠道服务名称';
                        data["logisticsProviderCode"] = rec.getValue('custrecord_logistics_channel_pro_num'); //'物流渠道商编号';
                        data["logisticsProviderName"] = rec.getText('custrecord_logistics_channel_provider'); //'物流渠道商名称';
                        data["sourceNo"] = rec.getValue('name'); //'来源单号';
                        data["sourceType"] = 40; //'来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整';
                        data["warehouseCode"] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_location_use_back'
                        }); //'仓库编号';
                        data["warehouseName"] = rec.getValue({
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_location_use_back'
                        }); //'仓库名称';
                    });

                    //货品行
                    var item_info = [];
                    search.create({
                        type: 'customrecord_sample_useret_transfer_item',
                        filters: [
                            { name: 'custrecord_attribution_document', operator: 'anyof', values: newRecord.id }
                        ],
                        columns: [
                            'custrecord_suti_item',
                            'custrecord_suti_quantiy',
                            { name: 'custitem_dps_picture', join: 'custrecord_suti_item' },
                            { name: 'custitem_dps_skuchiense', join: 'custrecord_suti_item' }
                        ]
                    }).run().each(function (rec) {
                        item_info.push({
                            productImageUrl: rec.getValue({ name: 'custitem_dps_picture', join: 'custrecord_suti_item' }),
                            productTitle: rec.getValue({ name: 'custitem_dps_skuchiense', join: 'custrecord_suti_item' }),
                            qty: rec.getValue('custrecord_suti_quantiy'),
                            sku: rec.getText('custrecord_suti_item'),
                        });
                        return true;
                    });
                    data['detailCreateRequestDtos'] = item_info;
                    log.debug('data', data);
                    // 获取token
                    var token = getToken();
                    // 发送请求
                    if (token) {
                        message = sendRequest(token, [data], "/outMaster");
                        if (message.data.code != 0) {
                            record.submitFields({
                                type: 'customrecord_sample_use_return',
                                id: newRecord.id,
                                values: {
                                    custrecord_stauts_wms: 5,
                                    custrecord_wms_info_t: message.data.msg
                                }
                            });
                        } else {
                            record.submitFields({
                                type: 'customrecord_sample_use_return',
                                id: newRecord.id,
                                values: {
                                    custrecord_stauts_wms: 2,
                                    custrecord_wms_info_t: message.data.msg
                                }
                            });
                        }
                    } else {
                        record.submitFields({
                            type: 'customrecord_sample_use_return',
                            id: newRecord.id,
                            values: {
                                custrecord_stauts_wms: 5,
                                custrecord_wms_info_t: 'WMS token失效，请稍后再试!'
                            }
                        });
                    }
                } catch (e) {
                    log.debug('e', e);
                }
            } else if (newRecord.getValue('custrecord_collect_type') == 2) {
                try{
                    search.create({
                        type: 'customrecord_sample_use_return',
                        filters: [
                            { name: 'internalid', operator: 'anyof', values: newRecord.id }
                        ],
                        columns: [
                            'custrecord23219',
                            'custrecord_owner_1',
                            'name',
                            'custrecord_if_contain_tax',
                            'custrecord_subsidiary_type_1',
                            { name: 'custrecord_dps_wms_location', join: 'custrecord_location_use_back' },
                            { name: 'custrecord_dps_wms_location_name', join: 'custrecord_location_use_back' }
                        ]
                    }).run().each(function (rec) {
                        var estimateTime;
                        if (rec.getValue('custrecord23219')) {
                            estimateTime = format.parse({
                                value: rec.getValue('custrecord23219'),
                                type: format.Type.DATE
                            });
                        }
                        data["estimateTime"] = estimateTime ? (new Date(estimateTime)).getTime() : '';//预计到货时间
                        data["inspectionType"] = 10; //质检类型 10: 全检 20: 抽检
                        data["purchaser"] = rec.getText('custrecord_owner_1');//采购员
                        data["sourceNo"] = rec.getValue('name'); //'来源单号';
                        data["sourceType"] = 40; //'来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整';
                        data["taxFlag"] = rec.getValue('custrecord_if_contain_tax');//是否含税 0: 否1: 是
                        data["tradeCompanyCode"] = rec.getValue('custrecord_subsidiary_type_1');//交易主体编号
                        data["tradeCompanyName"] = rec.getText('custrecord_subsidiary_type_1').substr(rec.getText('custrecord_subsidiary_type_1').lastIndexOf(' ') + 1);//交易主体名称
                        data["warehouseCode"] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_location_use_back'
                        }); //'仓库编号';
                        data["warehouseName"] = rec.getValue({
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_location_use_back'
                        }); //'仓库名称';
                    });
    
                    //货品行
                    var box_num = 0, total_quantity = 0;
                    var item_info = [];
                    search.create({
                        type: 'customrecord_sample_useret_transfer_item',
                        filters: [
                            { name: 'custrecord_attribution_document', operator: 'anyof', values: newRecord.id }
                        ],
                        columns: [
                            'custrecord_item_box_quantity',
                            'custrecord_suti_quantiy',
                            'custrecord_suti_item',
                            { name: 'custitem_dps_picture', join: 'custrecord_suti_item' },
                            { name: 'custitem_dps_skuchiense', join: 'custrecord_suti_item' }
                        ]
                    }).run().each(function (rec) {
                        box_num += Number(rec.getValue('custrecord_item_box_quantity'));
                        total_quantity += Number(rec.getValue('custrecord_suti_quantiy'));
                        item_info.push({
                            boxNum: rec.getValue('custrecord_item_box_quantity'),
                            inspectionType: 10,
                            planQty: rec.getValue('custrecord_suti_quantiy'),
                            productCode: rec.getValue('custrecord_suti_item'),
                            productImageUrl: rec.getValue({ name: 'custitem_dps_picture', join: 'custrecord_suti_item' }),
                            productTitle: rec.getValue({ name: 'custitem_dps_skuchiense', join: 'custrecord_suti_item' }),
                            remainderQty: 0,
                            sku: rec.getText('custrecord_suti_item')
                        });
                        return true;
                    });
                    data['skuList'] = item_info;
                    data["boxNum"] = box_num;//箱数
                    data["planQty"] = total_quantity; //计划入库数量
                    log.debug('data', data);
                    // 获取token
                    var token = getToken();
                    // 发送请求
                    if (token) {
                        message = sendRequest(token, data, "/inMaster");
                        if (message.data.code != 0) {
                            record.submitFields({
                                type: 'customrecord_sample_use_return',
                                id: newRecord.id,
                                values: {
                                    custrecord_stauts_wms: 5,
                                    custrecord_wms_info_t: message.data.msg
                                }
                            });
                        } else {
                            record.submitFields({
                                type: 'customrecord_sample_use_return',
                                id: newRecord.id,
                                values: {
                                    custrecord_stauts_wms: 2,
                                    custrecord_wms_info_t: message.data.msg
                                }
                            });
                        }
                    }
                }catch(e){
                    log.debug('e',e);
                }
            }
        }
    }

    /**
     * 获取token
     */
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

    /**
     * 发送请求
     * @param {*} token 
     * @param {*} data 
     */
    function sendRequest(token, data, type) {
        var message = {};
        var code = 0;
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        
        var response = http.post({
            url: config.WMS_Debugging_URL + type,
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) {
            retdata = JSON.parse(response.body);
            // 调用成功
            code = retdata.code;
        } else {
            code = 1;
            // 调用失败
            retdata = "请求失败"
        }
        message.code = code;
        message.data = retdata;
        return message;
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
