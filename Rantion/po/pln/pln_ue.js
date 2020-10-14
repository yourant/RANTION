/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['../../Helper/config.js', 'N/search', 'N/record', 'N/runtime', 'N/url', 'N/ui/dialog', 'N/https', "N/format", "./../../Helper/core.min"], function (config, search, record, runtime, url, dialog, https, format, aio) {
    var roleId = runtime.getCurrentUser().role;

    function beforeLoad(context) {
        var newRec = context.newRecord;
        var orderStatus = newRec.getValue('custrecord_pln_delivery_order_status');
        try {
            if (context.type == context.UserEventType.CREATE) {
                // var form = context.form
                // form.clientScriptModulePath = './pln_cs.js';
                // form.addButton({
                //     id: 'custpage_bills',
                //     label: '生成交货单',
                //     functionName: 'createDeliveryBills(' + newRec.getValue('custrecord_pln_delivery_order_location') + ')'
                // });
                var request = context.request;
                // log.debug("request", request)
                if (request) {
                    var form = context.form;

                    form.clientScriptModulePath = './pln_cs.js';
                    form.addButton({
                        id: 'custpage_addmarkallbuttons',
                        label: '标记所有货品',
                        functionName: 'addMarkAllButtons()'
                    });
                    form.addButton({
                        id: 'custpage_addrefreshbutton',
                        label: '取消所有标记',
                        functionName: 'addRefreshButton()'
                    });
                    var poIds = request.parameters.poids.split('|');
                    log.error("poIds", poIds);
                    if (poIds.length > 0) {
                        var arri = 0;
                        var slid = 'recmachcustrecord_pln_management_id';
                        var subsidiary = '' //主体 子公司
                        var entity = '' //供应商
                        search.create({
                            type: 'purchaseorder',
                            filters: [{
                                name: 'internalId',
                                operator: 'is',
                                values: poIds[0]
                            }],
                            columns: ['subsidiary', 'entity']
                        }).run().each(function (rec) {
                            subsidiary = rec.getValue('subsidiary');
                            entity = rec.getValue('entity');
                            return false;
                        });
                        newRec.setValue({
                            fieldId: 'custrecord_pln_subsidiary',
                            value: subsidiary
                        });
                        newRec.setValue({
                            fieldId: 'custrecord_pln_supplier',
                            value: entity
                        });
                        var date = new Date();
                        newRec.setValue({
                            fieldId: 'custrecord_pln_date',
                            value: date
                        });
                        newRec.setValue({
                            fieldId: 'custrecord_pln_delivery_order_status',
                            value: '1'
                        });
                        search.create({
                            type: 'purchaseorder',
                            filters: [{
                                    name: 'internalid',
                                    operator: 'anyof',
                                    values: poIds
                                },
                                {
                                    name: 'type',
                                    operator: 'anyof',
                                    values: ['PurchOrd']
                                },
                                {
                                    name: 'mainline',
                                    operator: 'is',
                                    values: ['F']
                                },
                                {
                                    name: 'taxline',
                                    operator: 'is',
                                    values: ['F']
                                }
                            ],
                            columns: [
                                'internalid', 'total', 'item', 'line', 'quantity',
                                'custcol_dps_quantity_delivered', 'custcol_dps_undelivered_quantity',
                                {
                                    name: 'custitem_dps_declaration_cn',
                                    join: 'item'
                                },
                                {
                                    name: 'custitem_dps_unit',
                                    join: 'item'
                                }
                            ]
                        }).run().each(function (result) {
                            var objRecord = record.load({
                                type: "purchaseorder",
                                id: result.id
                            });
                            var lineNumber = objRecord.findSublistLineWithValue({
                                sublistId: 'item',
                                fieldId: 'item',
                                value: result.getValue('item')
                            });
                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_po',
                                value: result.getValue('internalid'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_po_amount',
                                value: result.getValue('total'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_sku',
                                value: result.getValue('item'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_sku_name',
                                value: result.getValue({
                                    name: 'custitem_dps_declaration_cn',
                                    join: 'item'
                                }),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_sku_unit',
                                value: result.getValue({
                                    name: 'custitem_dps_unit',
                                    join: 'item'
                                }),
                                line: arri
                            });

                            //默认交全剩余数量
                            var limitNum = (result.getValue('quantity') - result.getValue('custcol_dps_quantity_delivered')).toFixed(0);
                            if (limitNum <= 0) {
                                limitNum = Number(0).toFixed(0);
                                newRec.setSublistValue({
                                    sublistId: slid,
                                    fieldId: 'custrecord_pln_order_check',
                                    value: false,
                                    line: arri
                                });
                            } else {
                                newRec.setSublistValue({
                                    sublistId: slid,
                                    fieldId: 'custrecord_pln_order_check',
                                    value: true,
                                    line: arri
                                });
                            }
                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_delivery_quantity',
                                value: limitNum,
                                line: arri
                            });
                            log.error("limitNum", limitNum);
                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_quantity',
                                value: result.getValue('quantity'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_quantity_delivered',
                                value: result.getValue('custcol_dps_quantity_delivered'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_undelivered_quantity',
                                value: result.getValue('custcol_dps_undelivered_quantity'),
                                line: arri
                            });

                            newRec.setSublistValue({
                                sublistId: slid,
                                fieldId: 'custrecord_pln_sku_line',
                                value: lineNumber.toFixed(0),
                                line: arri
                            });
                            arri++;
                            return true;
                        });
                    }
                }
            }
            if (context.type == 'view' && orderStatus == '1') {
                search.create({
                    type: 'customrecord_pln_management',
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: newRec.id
                    }],
                    columns: [{
                        name: 'custrecord_dps_wms_location', // WMS仓库编码
                        join: 'custrecord_pln_delivery_order_location'
                    }]
                }).run().each(function (rec) {
                    wmsLocCode = rec.getValue({
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_pln_delivery_order_location'
                    }); //WMS仓库编码
                    log.error("wmsLocCode", wmsLocCode)
                });
                var form = context.form
                form.clientScriptModulePath = './pln_cs.js';
                if (wmsLocCode == 'GC') {
                    //工厂仓不推送
                } else {
                    form.addButton({
                        id: 'custpage_push_to_wms',
                        label: '推送WMS',
                        functionName: 'pushToWms'
                    });
                }
            }
        } catch (e) {
            log.error("beforeLoad error:", e)
        }
    }

    function beforeSubmit(context) {
        if (context.type == context.UserEventType.CREATE) {
            var bf_rec = context.newRecord;
            var numLines = bf_rec.getLineCount({
                sublistId: 'recmachcustrecord_pln_management_id'
            });
            for (var i = numLines - 1; i > -1; i--) {
                var check = bf_rec.getSublistValue({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    fieldId: 'custrecord_pln_order_check',
                    line: i
                });
                var quantity = bf_rec.getSublistValue({
                    sublistId: 'recmachcustrecord_pln_management_id',
                    fieldId: 'custrecord_pln_quantity',
                    line: i
                });
                if (!check || quantity == 0) {
                    bf_rec.removeLine({
                        sublistId: 'recmachcustrecord_pln_management_id',
                        line: i,
                        ignoreRecalc: true
                    });
                }
            }
        }
    }

    function afterSubmit(context) {
        var actionType = context.type;
        if (actionType == 'create') {

            var rec = context.newRecord;
            var plnId = rec.id;
            var sblId = 'recmachcustrecord_pln_management_id';
            var numLines = rec.getLineCount({
                sublistId: sblId
            }); //获取子列表行数
            var pos = {};
            for (var i = 0; i < numLines; i++) {
                var poid = rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_po',
                    line: i
                }); //获取子列表的po单号
                var line = rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_sku_line',
                    line: i
                });
                var po = pos[poid];
                //本次交货数量
                var quantity = Number(rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_delivery_quantity',
                    line: i
                }));
                if (quantity) {
                    if (!po) {
                        po = new Array();
                    } //如果po为空新建
                    po.push({
                        line: line,
                        num: quantity
                    }) //将交货数量和行数传入
                    pos[poid] = po;
                }
            }
            var pln_json = {};
            pln_json.plnId = plnId;
            pln_json.location = rec.getValue('custrecord_pln_delivery_order_location'); //地点 
            pln_json.delivery_date = rec.getValue('custrecord_pln_delivery_date'); //交期
            pln_json.quantity = rec.getValue('custrecord_pln_if_quantity'); //是否质检 
            var scResult = [];
            var count = 0;
            // log.error("pos", pos); //{"1286102":[{"line":0,"num":100},{"line":1,"num":50}],"1381158":[{"line":0,"num":1}]}
            for (var key in pos) {
                // log.error("pos[key]", pos[key]); //[{"line":0,"num":100},{"line":1,"num":50}]
                count++;
                //本来是调用rl页面url，现在使用函数返回
                var response = deliveryOrders(key, pos[key], pln_json);
                response.id = key;
                scResult.push(response);
                log.error('lnNumber',response.lnNumber);
                log.error("response", response);
                if (response.status == 'success') {
                    var poRec = record.load({
                        type: 'purchaseorder',
                        id: key
                    });
                    var poArray = pos[key];
                    for (var line in poArray) {
                        var lineInfo = poArray[line];
                        var totalNum,
                            deliveredNum,
                            undeliveredNum;
                        totalNum = poRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: lineInfo.line
                        }); //总数量
                        deliveredNum = poRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_quantity_delivered',
                            line: lineInfo.line
                        }); //原已交货数量
                        deliveredNum = Number(deliveredNum) + Number(lineInfo.num); //加上这次的交货量
                        undeliveredNum = Number(totalNum) - Number(deliveredNum); //剩余未交数量
                        poRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_quantity_delivered',
                            value: deliveredNum,
                            line: lineInfo.line
                        });
                        poRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_undelivered_quantity',
                            value: undeliveredNum,
                            line: lineInfo.line
                        });
                        poRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_dps_delivery_quantity',
                            value: 0,
                            line: lineInfo.line
                        });
                    }
                    poRec.save();
                    log.debug("poRec", poRec);
                }
            }
            var af_rec = record.load({
                type: rec.type,
                id: rec.id
            });
            for (var i = 0; i < numLines; i++) {
                var sbl_poid = rec.getSublistValue({
                    sublistId: sblId,
                    fieldId: 'custrecord_pln_po',
                    line: i
                }); //获取子列表的po单号
                var sbl_plnId;
                for (var key in scResult) {
                    if (scResult[key].id == sbl_poid) {
                        sbl_plnId = scResult[key].lnNumber;
                    }
                }
                log.debug("sbl_plnId", sbl_plnId);
                if (sbl_plnId) {
                    af_rec.setSublistValue({
                        sublistId: sblId,
                        fieldId: 'custrecord_pln_delivery_order_id',
                        line: i,
                        value: sbl_plnId
                    });
                    af_rec.setSublistValue({
                        sublistId: sblId,
                        fieldId: 'custrecord_pln_delivery_order_id_text',
                        line: i,
                        value: sbl_plnId
                    });
                }
            }
            af_rec.save();
        }
    }

    //获取采购订单信息
    function deliveryOrders(line, po_line, pln_json) {
        var result_list = {};
        var item_list = [];
        var list_json = {};
        var amount_num = 0;
        list_json.po_id = line;
        var purchaseorder_data = record.load({
            type: 'purchaseorder',
            id: line,
            isDynamic: true
        });
        list_json.entity = purchaseorder_data.getValue('entity');
        list_json.dps_type = purchaseorder_data.getValue('custbody_dps_type');
        var count = purchaseorder_data.getLineCount({
            sublistId: 'item'
        });

        var skuzzzs = {};
        var skuzzzids = [];
        for (var i = 0; i < count; i++) {
            var item = purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            skuzzzids.push(item);
        }
        search.create({
            type: 'item',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: skuzzzids
            }],
            columns: [
                'internalid', 'custitem_dps_box_long', 'custitem_dps_box_high', 'custitem_dps_box_wide', 'custitem_dps_mpq'
            ]
        }).run().each(function (result) {
            var item = result.getValue('internalid');
            var json = {};
            json.long = Number(result.getValue('custitem_dps_box_long'));
            json.width = Number(result.getValue('custitem_dps_box_wide'));
            json.high = Number(result.getValue('custitem_dps_box_high'));
            json.mpq = Number(result.getValue('custitem_dps_mpq'));
            skuzzzs[item] = json;
            return true;
        });

        for (var i = 0; i < count; i++) {
            amount_num += purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'amount',
                line: i
            });
            var item = purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });
            var quantity = purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });
            var rate = purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i
            });
            var quantity_delivered = purchaseorder_data.getSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_dps_quantity_delivered',
                line: i
            });
            var lineFlag = true;
            for (var lineNum in po_line) {
                if (i == po_line[lineNum].line) {
                    var delivery_quantity = po_line[lineNum].num;
                    var undelivered_quantity = quantity - quantity_delivered;
                    lineFlag = false;
                }
            }
            if (lineFlag) {
                var undelivered_quantity = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_dps_undelivered_quantity',
                    line: i
                });
                var delivery_quantity = purchaseorder_data.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_dps_delivery_quantity',
                    line: i
                });
            }
            var long_m = skuzzzs[item].long / 100;
            var width_m = skuzzzs[item].width / 100;
            var high_m = skuzzzs[item].high / 100;
            var volume = long_m * high_m * width_m;
            var box_volume = volume.toFixed(2);
            var packingqty = skuzzzs[item].mpq;
            var packqty = 0;
            if (quantity > 0 && packingqty > 0) {
                packqty = quantity / packingqty;
                packqty = Math.ceil(packqty);
            }
            var volumest = volume * packqty;
            var total_volume = volumest.toFixed(2);
            item_list.push({
                item: item,
                quantity: quantity,
                long: skuzzzs[item].long,
                width: skuzzzs[item].width,
                high: skuzzzs[item].high,
                box_volume: box_volume,
                total_volume: total_volume,
                boxes_number: packqty,
                rate: rate,
                quantity_delivered: quantity_delivered,
                undelivered_quantity: undelivered_quantity ? undelivered_quantity : 0,
                delivery_quantity: delivery_quantity
            });
        }
        list_json.amount = amount_num;
        list_json.item = item_list;
        try {
            result_list.lnNumber = createDelivery(list_json, pln_json);
            result_list.status = 'success';
            result_list.data = '生成交货单成功';
        } catch (e) {
            result_list.status = 'error';
            result_list.data = e.message;
            result_list.lnNumber = ''
            log.debug('error ------', e);
        }
        return result_list;
    }

    //生成交货单
    function createDelivery(line, pln_json) {
        var location = pln_json.location; //交货单的地点,从批量交货单中获取
        var delivery_data = format.parse({
            value: pln_json.delivery_date,
            type: format.Type.DATE
        }); //交期
        var pln_quantity = pln_json.quantity; //是否质检
        var pln_id = pln_json.plnId;
        //生成po编号(流水号)
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
        var delivery_ord = record.create({
            type: 'customrecord_dps_delivery_order',
            isDynamic: true
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_supplier',
            value: line.entity
        });
        delivery_ord.setValue({
            fieldId: 'name',
            value: poNumber
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_purchase_order_no',
            value: line.po_id
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_delivery_amount',
            value: line.amount
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_delivery_date',
            value: delivery_data
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_dsp_delivery_order_location',
            value: location
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_if_quantity',
            value: pln_quantity
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_delivery_order_type',
            value: line.dps_type
        });
        delivery_ord.setValue({
            fieldId: 'custrecord_pln_no',
            value: pln_id
        });
        log.error('pln_id',pln_id);
        var flag = false;
        var totalAmount = 0;
        //产品
        for (var i = 0; i < line.item.length; i++) {
            var li = line.item[i];
            if (li.delivery_quantity > 0 || (li.quantity - li.quantity_delivered) > 0) {
                delivery_ord.selectNewLine({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                //默认交货
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_dps_delivery_order_check',
                    value: true
                })
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_item_sku',
                    value: li.item
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_purchase_quantity',
                    value: li.quantity
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_ddoi_long',
                    value: li.long
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_ddoi_width',
                    value: li.width
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_ddoi_high',
                    value: li.high
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_ddoi_single_box_volume',
                    value: li.box_volume
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_ddoi_dps_total_volume',
                    value: li.total_volume
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_line_boxes_number',
                    value: li.boxes_number
                });

                var outQty = li.quantity - li.quantity_delivered - li.delivery_quantity;
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_dps_dev_undelivered_quantity',
                    value: 0
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_item_quantity',
                    value: li.delivery_quantity > 0 ? li.delivery_quantity : outQty
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_unit_price',
                    value: li.rate
                });
                delivery_ord.setCurrentSublistValue({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                    fieldId: 'custrecord_outstanding_quantity',
                    value: 0
                });
                var qu = li.delivery_quantity > 0 ? li.delivery_quantity : outQty;
                totalAmount += Number(qu) * Number(li.rate);
                try {
                    delivery_ord.commitLine({
                        sublistId: 'recmachcustrecord_dps_delivery_order_id'
                    });
                    if (i == line.item.length - 1) {
                        flag = true;
                    }
                } catch (err) {
                    throw err;
                }
            }
            delivery_ord.setValue({
                fieldId: 'custrecord_delivery_amount',
                value: totalAmount
            });
            var res_id;
            if (flag) {
                // 交货单存在货品行信息, 则保存
                res_id = delivery_ord.save();
            }
            if (res_id) {
                extRecord.save();
                log.debug('po_id', line.po_id);
                // record.submitFields({
                //     type: 'purchaseorder',
                //     id: line.po_id,
                //     values: {
                //         custbody_dps_delivery_id: res_id
                //     }
                // });
                var purchase_data = record.load({
                    type: 'purchaseorder',
                    id: line.po_id
                });
                // var delivery_id_arr = [];
                // delivery_id_arr = purchase_data.getValue('custbody_dps_delivery_id');
                // delivery_id_arr.push(res_id);
                // purchase_data.setValue({
                //     fieldId: 'custbody_dps_delivery_id',
                //     value: delivery_id_arr
                // });

                line.item.map(function (li) {
                    var lineNumber = purchase_data.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: li.item
                    });
                    // 设置当前行的未交货数量
                    purchase_data.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_undelivered_quantity',
                        value: Number(li.quantity) - Number(li.quantity_delivered) - Number(li.delivery_quantity),
                        line: lineNumber
                    });
                    // 设置当前行的已交货数量
                    purchase_data.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_quantity_delivered',
                        value: Number(li.quantity_delivered) + Number(li.delivery_quantity),
                        line: lineNumber
                    });
                    // 设置当前行的交货数量
                    purchase_data.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_dps_delivery_quantity',
                        value: Number(li.quantity) - Number(li.quantity_delivered) - Number(li.delivery_quantity),
                        line: lineNumber
                    });
                });
            }
        }
        return res_id;
    }
    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});