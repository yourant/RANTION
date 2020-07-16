/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-10 11:37:16
 * @LastEditTime   : 2020-07-14 14:54:34
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\po\dps_create_delivery_order_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['./../Helper/core.min', 'N/runtime', 'N/search', 'N/record', 'N/format', 'N/http'],
    function (aio, runtime, search, record, format, http) {

        function beforeLoad(context) {
            if (context.type == 'view') {
                var recordForm = context.form;
                recordForm.clientScriptModulePath = './delivery_order_cs.js';
                recordForm.addButton({
                    id: 'custpage_dps_report_delivery',
                    label: '交货单导出',
                    functionName: 'reportDelivery("' + context.newRecord.id + '")',
                });
            }
            if (context.type == 'create') {
                var request = context.request;
                var bill_id = request.parameters.bill_id;
                if (bill_id) {
                    var newRecord = context.newRecord;
                    var soRec = record.load({
                        type: 'purchaseorder',
                        id: bill_id
                    });
                    //生成交货单号编号(流水号)
                    var need_date = aio.Moment.utc(new Date()).format('YYYYMMDD');
                    var recid, existPoNumber, extRecord;
                    var poNumber = 'LN' + need_date;
                    search.create({
                        type: 'customrecord_dps_delivery_schedule',
                        filters: [{
                            name: 'custrecord_delivery_schedule_date',
                            operator: 'is',
                            values: need_date
                        }]
                    }).run().each(function (result) {
                        recid = result.id;
                    });
                    if (!recid) {
                        existPoNumber = 1;
                        extRecord = record.create({
                            type: 'customrecord_dps_delivery_schedule'
                        });
                        extRecord.setValue({
                            fieldId: 'custrecord_delivery_schedule_date',
                            value: need_date
                        });
                        extRecord.setValue({
                            fieldId: 'custrecord_delivery_schedule_num',
                            value: existPoNumber
                        });
                        //extRecord.save();
                        poNumber = poNumber + '000' + existPoNumber;
                    } else {
                        extRecord = record.load({
                            type: 'customrecord_dps_delivery_schedule',
                            id: recid
                        });
                        existPoNumber = Number(extRecord.getValue('custrecord_delivery_schedule_num')) + 1;
                        if (existPoNumber < 10) {
                            poNumber = poNumber + '000' + existPoNumber;
                        } else if (existPoNumber >= 10 && existPoNumber < 100) {
                            poNumber = poNumber + '00' + existPoNumber;
                        } else if (existPoNumber >= 100 && existPoNumber < 1000) {
                            poNumber = poNumber + '0' + existPoNumber;
                        } else {
                            poNumber = poNumber + existPoNumber;
                        }
                        extRecord.setValue({
                            fieldId: 'custrecord_delivery_schedule_num',
                            value: existPoNumber
                        });
                        //extRecord.save(); 
                    };
                    newRecord.setValue({
                        fieldId: 'custrecord_supplier',
                        value: soRec.getValue({
                            sublistId: 'item',
                            fieldId: 'entity'
                        })
                    });
                    newRecord.setValue({
                        fieldId: 'name',
                        value: poNumber
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_purchase_order_no',
                        value: bill_id
                    });
                    newRecord.setValue({
                        fieldId: 'custrecord_delivery_order_type',
                        value: soRec.getValue('custbody_dps_type')
                    });
                    //产品
                    var LineCount = soRec.getLineCount({
                        sublistId: 'item'
                    });
                    var amount_price = 0;
                    var addLine = 0;
                    for (var i = 0; i < LineCount; i++) {
                        var box_long, box_high, box_wide, mpq, box_volume, volume, item_name;
                        search.create({
                            type: 'item',
                            filters: [{
                                name: 'internalid',
                                operator: 'is',
                                values: soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                })
                            }],
                            columns: [
                                'internalid', 'custitem_dps_box_long', 'custitem_dps_box_high', 'custitem_dps_box_wide', 'custitem_dps_mpq', 'itemid'
                            ]
                        }).run().each(function (result) {
                            box_long = result.getValue('custitem_dps_box_long');
                            box_high = result.getValue('custitem_dps_box_high');
                            box_wide = result.getValue('custitem_dps_box_wide');
                            mpq = result.getValue('custitem_dps_mpq');
                            var long_m = box_long / 100;
                            var width_m = box_wide / 100;
                            var high_m = box_high / 100;
                            volume = long_m * high_m * width_m;
                            box_volume = volume.toFixed(2);
                            item_name = result.getValue('itemid');
                        });

                        amount_price += Number(soRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            line: i
                        }));
                        var delivery_quantity = soRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_delivery_quantity',
                            line: i
                        });
                        var quantity = soRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: i
                        });
                        var quantity_delivered = soRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_quantity_delivered',
                            line: i
                        });
                        log.debug('delivery_quantity: ', delivery_quantity);
                        log.debug('quantity - quantity_delivered', quantity - quantity_delivered);
                        if (delivery_quantity > 0 || (quantity - quantity_delivered) > 0) {
                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_sku',
                                value: soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                }),
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_name',
                                value: item_name,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_purchase_quantity',
                                value: soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i
                                }),
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_ddoi_long',
                                value: box_long,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_ddoi_width',
                                value: box_wide,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_ddoi_high',
                                value: box_high,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_ddoi_single_box_volume',
                                value: box_volume,
                                line: addLine
                            });

                            var packqty = 0;
                            if (quantity > 0 && mpq > 0) {
                                packqty = quantity / mpq;
                                packqty = Math.ceil(packqty);
                            }
                            var volumest = volume * packqty;
                            var total_volume = volumest.toFixed(2);
                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_ddoi_dps_total_volume',
                                value: total_volume,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_line_packing_quantity',
                                value: mpq,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_line_boxes_number',
                                value: packqty,
                                line: addLine
                            });

                            var outQty = quantity - quantity_delivered - delivery_quantity;
                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_dps_dev_undelivered_quantity',
                                value: 0,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_quantity',
                                value: delivery_quantity > 0 ? delivery_quantity : outQty,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_hide_quantity',
                                value: delivery_quantity > 0 ? delivery_quantity : outQty,
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_unit_price',
                                value: soRec.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    line: i
                                }),
                                line: addLine
                            });

                            newRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_outstanding_quantity',
                                value: 0,
                                line: addLine
                            });

                            addLine++;
                        }
                    }
                    newRecord.setValue({
                        fieldId: 'custrecord_delivery_amount',
                        value: amount_price
                    });

                    var checkFlag = 0,
                        retFlag = true,
                        QInspection = 1;
                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: bill_id
                            },
                            {
                                name: 'mainline',
                                operator: 'is',
                                values: false
                            },
                            {
                                name: 'taxline',
                                operator: 'is',
                                values: false
                            }
                        ],
                        columns: [{
                            name: 'custitem_dps_factory_inspe',
                            join: 'item'
                        }]
                    }).run().each(function (rec) {

                        var a = rec.getValue({
                            name: 'custitem_dps_factory_inspe',
                            join: 'item'
                        });
                        if (a == 1) {
                            checkFlag = 1;
                            retFlag = false;
                        }

                        return retFlag;
                    });

                    if (checkFlag == 1) {
                        newRecord.setValue({
                            fieldId: "custrecord_if_quantity",
                            value: 1
                        })
                    }
                }
            }
        }

        function beforeSubmit(context) {

        }

        function afterSubmit(context) {
            if (context.type == 'create') {
                //生成交货单号编号(流水号)
                var need_date = aio.Moment.utc(new Date()).format('YYYYMMDD');
                var recid, existPoNumber, extRecord;
                var poNumber = 'LN' + need_date;
                search.create({
                    type: 'customrecord_dps_delivery_schedule',
                    filters: [{
                        name: 'custrecord_delivery_schedule_date',
                        operator: 'is',
                        values: need_date
                    }]
                }).run().each(function (result) {
                    recid = result.id;
                });
                if (!recid) {
                    existPoNumber = 1;
                    extRecord = record.create({
                        type: 'customrecord_dps_delivery_schedule'
                    });
                    extRecord.setValue({
                        fieldId: 'custrecord_delivery_schedule_date',
                        value: need_date
                    });
                    extRecord.setValue({
                        fieldId: 'custrecord_delivery_schedule_num',
                        value: existPoNumber
                    });
                    extRecord.save();
                    poNumber = poNumber + '000' + existPoNumber;
                } else {
                    extRecord = record.load({
                        type: 'customrecord_dps_delivery_schedule',
                        id: recid
                    });
                    existPoNumber = Number(extRecord.getValue('custrecord_delivery_schedule_num')) + 1;
                    if (existPoNumber < 10) {
                        poNumber = poNumber + '000' + existPoNumber;
                    } else if (existPoNumber >= 10 && existPoNumber < 100) {
                        poNumber = poNumber + '00' + existPoNumber;
                    } else if (existPoNumber >= 100 && existPoNumber < 1000) {
                        poNumber = poNumber + '0' + existPoNumber;
                    } else {
                        poNumber = poNumber + existPoNumber;
                    }
                    extRecord.setValue({
                        fieldId: 'custrecord_delivery_schedule_num',
                        value: existPoNumber
                    });
                    extRecord.save();
                };
            }

            if (context.type != 'create' && context.type != 'delete' && context.type != 'copy') {
                var newRecord = context.newRecord;
                var delivery_order = record.load({
                    type: 'customrecord_dps_delivery_order',
                    id: newRecord.id
                });

                // 1	待确认
                // 2	供应商已确认
                // 3	已推WMS
                // 4	WMS已入库
                // 5	推送WMS失败
                // 6	品控确认
                var delivery_order_status = delivery_order.getValue('custrecord_delivery_order_status');
                var delivery_order_type = delivery_order.getValue('custrecord_delivery_order_type');
                if (delivery_order_status == 6 && (delivery_order_type == 1 || delivery_order_type == 2 || delivery_order_type == 3) &&
                    !delivery_order.getValue('custrecord_dps_wms_end')) {
                    log.debug('newRecord.id', newRecord.id);
                    var item_arr = [],
                        order_po_no = 0,
                        boxNum = 0,
                        planQty = 0;
                    var data = {};
                    // 获取token
                    var token = getToken();
                    var inspectionType;
                    search.create({
                        type: 'customrecord_dps_delivery_order_item',
                        filters: [{
                            name: 'custrecord_dps_delivery_order_id',
                            operator: 'anyof',
                            values: newRecord.id
                        }],
                        columns: [
                            'custrecord_item_sku', //货品
                            'custrecord_line_boxes_number', //箱数
                            'custrecord_item_quantity', //交货数量
                            'custrecord_outstanding_quantity', //剩余交货数量

                            'custrecord_ddoi_high', //(number): 高,
                            'custrecord_ddoi_long', //(number): 长,
                            'custrecord_ddoi_width', // (number): 宽

                            {
                                name: 'custitem_dps_spucoding',
                                join: 'custrecord_item_sku'
                            }, //SPU编码
                            {
                                name: 'custitem_dps_picture',
                                join: 'custrecord_item_sku'
                            }, //产品图片
                            {
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_item_sku'
                            }, //中文标题
                            {
                                name: 'custitem_dps_specifications',
                                join: 'custrecord_item_sku'
                            }, //规格
                            {
                                name: 'custitem_dps_warehouse_check',
                                join: 'custrecord_item_sku'
                            }, // 仓检类型
                            //主体上的
                            {
                                name: 'custrecord_purchase_order_no',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //采购单ID
                            {
                                name: 'custrecord_delivery_remarks',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //备注
                            {
                                name: 'name',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //交货单号
                            {
                                name: 'custrecord_supplier_code',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //供应商编码
                            {
                                name: 'custrecord_supplier',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //供应商
                            {
                                name: 'custrecord_tracking_number',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //运单号
                            {
                                name: 'custrecord_delivery_date',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //交期
                            {
                                name: 'custrecord_dsp_delivery_order_location',
                                join: 'custrecord_dps_delivery_order_id'
                            }, //地点
                        ]
                    }).run().each(function (rec) {
                        order_po_no = rec.getValue({
                            name: 'custrecord_purchase_order_no',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        boxNum += Number(rec.getValue('custrecord_line_boxes_number'));
                        if (rec.getValue({
                                name: 'custrecord_delivery_date',
                                join: 'custrecord_dps_delivery_order_id'
                            })) {
                            var estimateTime = format.parse({
                                value: rec.getValue({
                                    name: 'custrecord_delivery_date',
                                    join: 'custrecord_dps_delivery_order_id'
                                }),
                                type: format.Type.DATE
                            });
                            data['estimateTime'] = (new Date(estimateTime)).getTime(); ///1000
                        } else {
                            data['estimateTime'] = '';
                        }
                        planQty += Number(rec.getValue('custrecord_item_quantity'));
                        data['remark'] = rec.getValue({
                            name: 'custrecord_delivery_remarks',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        data['sourceNo'] = rec.getValue({
                            name: 'name',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        data['sourceType'] = 10;
                        data['supplierCode'] = rec.getValue({
                            name: 'custrecord_supplier_code',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        data['supplierName'] = rec.getText({
                            name: 'custrecord_supplier',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        data['waybillNo'] = rec.getValue({
                            name: 'custrecord_tracking_number',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        data['warehouseCode'] = rec.getValue({
                            name: 'custrecord_dsp_delivery_order_location',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        //rec.getValue({name: 'custrecord_dps_wms_location',join: 'location'});//仓库编号
                        data['warehouseName'] = rec.getText({
                            name: 'custrecord_dsp_delivery_order_location',
                            join: 'custrecord_dps_delivery_order_id'
                        });
                        //rec.getValue({name: 'custrecord_dps_wms_location_name',join: 'location'});//仓库名称
                        //rec.getValue({name: 'custitem_dps_specifications',join: 'custrecord_item_sku'});
                        var variant_arr = [{
                                name: 'color',
                                value: '白色'
                            },
                            {
                                name: 'size',
                                value: 'L'
                            }
                        ];
                        var boxInfo = {
                            height: rec.getValue('custrecord_ddoi_high'), //(number): 高,
                            length: rec.getValue('custrecord_ddoi_long'), //(number): 长,
                            width: rec.getValue('custrecord_ddoi_width'), // (number): 宽
                        };

                        item_arr.push({
                            boxInfo: boxInfo,
                            boxNum: rec.getValue({
                                name: 'custrecord_line_boxes_number'
                            }),
                            planQty: rec.getValue({
                                name: 'custrecord_item_quantity'
                            }),
                            productCode: rec.getValue({
                                name: 'custitem_dps_spucoding',
                                join: 'custrecord_item_sku'
                            }),
                            productImageUrl: rec.getValue({
                                name: 'custitem_dps_picture',
                                join: 'custrecord_item_sku'
                            }),
                            productTitle: rec.getValue({
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_item_sku'
                            }),
                            remainderQty: rec.getValue('custrecord_outstanding_quantity') ? rec.getValue('custrecord_outstanding_quantity') : 0,
                            sku: rec.getText({
                                name: 'custrecord_item_sku'
                            }),
                            variant: JSON.stringify(variant_arr),
                            inspectionType: rec.getValue({
                                name: 'custitem_dps_warehouse_check',
                                join: 'custrecord_item_sku'
                            }) == 1 ? inspectionType : 30
                        });
                        return true;
                    });
                    data['boxNum'] = boxNum;
                    data['planQty'] = planQty;
                    data['skuList'] = item_arr;

                    search.create({
                        type: 'purchaseorder',
                        filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: order_po_no
                            },
                            {
                                name: 'mainline',
                                operator: 'is',
                                values: true
                            }
                        ],
                        columns: [
                            'tranid',
                            'entity',
                            'subsidiary',
                            {
                                name: 'custrecord_tax_included',
                                join: 'subsidiary'
                            },
                            // {name: 'custrecord_dps_wms_location',join: 'location'},
                            // {name: 'custrecord_dps_wms_location_name',join: 'location'},
                        ]
                    }).run().each(function (rec) {
                        var vendor_data = record.load({
                            type: 'vendor',
                            id: rec.getValue('entity')
                        });
                        data['pono'] = rec.getValue('tranid'); //采购单号
                        inspectionType = vendor_data.getValue('custentity_supplier_type') == 1 ? 10 : 20; //质检类型
                        data['inspectionType'] = inspectionType;
                        data['taxFlag'] = rec.getValue({
                            name: 'custrecord_tax_included',
                            join: 'subsidiary'
                        }) == 1 ? 1 : 0; //是否含税 0:否1:是
                        data['tradeCompanyCode'] = rec.getValue('subsidiary'); //交易主体编号
                        data['tradeCompanyName'] = rec.getText('subsidiary').substr(rec.getText('subsidiary').lastIndexOf(' ') + 1); //交易主体名称
                        return false;
                    });
                    var order_data = record.load({
                        type: 'purchaseorder',
                        id: order_po_no
                    });
                    data['purchaser'] = order_data.getText('employee');
                    log.debug('data', data);
                    if (token) {
                        message = sendRequest(token, data);
                        log.debug('message', message);
                        if (message.data.code == 0) {
                            record.submitFields({
                                type: 'customrecord_dps_delivery_order',
                                id: newRecord.id,
                                values: {
                                    custrecord_delivery_order_status: 3,
                                    custrecord_dps_wms_end: true,
                                    custrecord_dps_delivery_wms_info: JSON.stringify(message.data)
                                }
                            });
                        } else {
                            record.submitFields({
                                type: 'customrecord_dps_delivery_order',
                                id: newRecord.id,
                                values: {
                                    custrecord_delivery_order_status: 5,
                                    custrecord_dps_wms_end: false,
                                    custrecord_dps_delivery_wms_info: JSON.stringify(message.data)
                                }
                            });
                        }
                    } else {
                        record.submitFields({
                            type: 'customrecord_dps_delivery_order',
                            id: newRecord.id,
                            values: {
                                custrecord_delivery_order_status: 5,
                                custrecord_dps_wms_end: false,
                                custrecord_dps_delivery_wms_info: 'WMS token 无效了'
                            }
                        });
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
        function sendRequest(token, data) {
            var message = {};
            var code = 0;
            var body;
            var headerInfo = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'access_token': token
            };
            var response = http.post({
                url: 'http://47.107.254.110:18082/rantion-wms/inMaster',
                headers: headerInfo,
                body: JSON.stringify(data)
            });
            // log.error('response', JSON.stringify(response));
            if (response.code == 200) {
                retdata = JSON.parse(response.body);
            } else {
                retdata = '请求被拒'
            }
            if (response.code == 200) {
                // 调用成功
            } else {
                code = 1;
                // 调用失败
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