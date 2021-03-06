/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-15 12:05:49
 * @LastEditTime   : 2020-07-18 17:10:50
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_create_inmaster_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../Helper/config.js', 'N/search', 'N/http', 'N/record', './../Helper/Moment.min.js', 'N/format', 'N/https'], function (config, search, http, record, moment, format, https) {

    function _get(context) {

    }



    var checkBodyArr = [
        // "boxNum", //(integer): 箱数,
        "estimateTime", //(string): 预计到货时间,
        "inspectionType", //(integer): 质检类型 10: 全检 20: 抽检,
        "planQty", //(integer): 计划入库数量,
        "purchaser", //(string): 采购员,
        "sourceNo", //(string): 来源单号,
        "sourceType", //(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 借调入库 70: 批量交货单,
        "taxFlag", // (integer): 是否含税 0: 否1: 是,
        "tradeCompanyCode", // (string): 交易主体编号,
        "tradeCompanyName", // (string): 交易主体名称,
        "warehouseCode", //(string): 仓库编号,
        "warehouseName", //(string): 仓库名称,
    ];


    var showBodyObj = {
        // "boxNum": "箱子数量 不存在", //(integer): 箱数,
        "estimateTime": "预计到货时间 不存在", //(string): 预计到货时间,
        "inspectionType": "质检类型 不存在", //(integer): 质检类型 10: 全检 20: 抽检,
        "planQty": '计划入库数量 不存在', //(integer): 计划入库数量,
        "purchaser": '采购订单 采购员不存在', //(string): 采购员,
        "sourceNo": '来源单号 不存在', //(string): 来源单号,
        "sourceType": '来源类型 不存在', //(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 借调入库 70: 批量交货单,
        // "taxFlag": '含税 不存在', // (integer): 是否含税 0: 否1: 是,
        "tradeCompanyCode": "采购订单 交易主体编号 不存在", // (string): 交易主体编号,
        "tradeCompanyName": '采购订单 交易主体名称 不存在', // (string): 交易主体名称,
        "warehouseCode": '地点：仓库编号 不存在', //(string): 仓库编号,
        "warehouseName": '地点：仓库名臣 不存在', //(string): 仓库名称,
    };


    var checkItemArr = [
        // "boxNum", //(integer): 箱数,
        "inspectionType", // (integer): 质检类型 10: 全检 20: 抽检 30: 免检,
        "planQty", //(integer): 计划入库数,
        "productCode", //(string): 产品编号,
        //"productImageUrl", //(string): 图片路径,
        "productTitle", //(string): 产品标题,
        "remainderQty", //(integer): 余数,
        "sku", //(string): sku,
    ]

    var showItemObj = {
        // "boxNum": '货品的箱数 不存在', //(integer): 箱数,
        "inspectionType": '货品档案的 质检类型 不存在', // (integer): 质检类型 10: 全检 20: 抽检 30: 免检,
        "planQty": '货品行 计划入库数 不存在', //(integer): 计划入库数,
        "productCode": '货品档案的 产品编号不存在', //(string): 产品编号,
        //"productImageUrl": "货品档案 产品图片 不存在", //(string): 图片路径,
        "productTitle": '货品档案 SKU中文标题 不存在', //(string): 产品标题,
        "remainderQty": '货品行的 余数不存在', //(integer): 余数,
        "sku": '货品行 货品 不存在', //(string): sku,
    }


    /**
     * 
     * @param {*} context 
     */
    function _post(context) {
        var message = {};

        try {
            // 获取token
            var token = getToken();
            if (token) {
                var data = {};
                // 业务数据填写至data即可
                // 参数模板 (参数类型，是否必填)
                // InMasterCreateRequestDto {
                //     boxNum(integer): 箱数,
                //         estimateTime(string): 预计到货时间,
                //         inspectionType(integer): 质检类型 10: 全检 20: 抽检,
                //         planQty(integer): 计划入库数量,
                //         pono(string, optional): 采购单号,
                //         purchaser(string): 采购员,
                //         remark(string, optional): 备注,
                //         skuList(Array[InDetailCreateRequestDto]): 入库SKU明细,
                //         sourceNo(string): 来源单号,
                //         sourceType(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 借调入库 70: 批量交货单,
                //         supplierCode(string, optional): 供应商编号,
                //         supplierName(string, optional): 供应商名称,
                //         taxFlag(integer): 是否含税 0: 否1: 是,
                //         tradeCompanyCode(string): 交易主体编号,
                //         tradeCompanyName(string): 交易主体名称,
                //         warehouseCode(string): 仓库编号,
                //         warehouseName(string): 仓库名称,
                //         waybillNo(string, optional): 运单号
                // }
                // InDetailCreateRequestDto {
                //     boxInfo(InDetailBoxInfoCreateRequestDto): 箱子信息,
                //         boxNum(integer): 箱数,
                //         inspectionType(integer): 质检类型 10: 全检 20: 抽检 30: 免检,
                //         planQty(integer): 计划入库数,
                //         productCode(string): 产品编号,
                //         productImageUrl(string): 图片路径,
                //         productTitle(string): 产品标题,
                //         remainderQty(integer): 余数,
                //         sku(string): sku,
                //         supplierVariant(string, optional): 供应商变体规格 json,
                //         variant(string, optional): 变体规格 json
                // }
                // InDetailBoxInfoCreateRequestDto {
                //     height(number): 高,
                //         length(number): 长,
                //         width(number): 宽
                // }

                var sourceType = Number(context.sourceType); // 来源类型 10:交货单 20:退货入库 30:调拨入库 40:样品归还 70:批量交货单
                // 交货单入库
                if (sourceType == 10) {
                    var item_arr = [],
                        order_po_no = 0,
                        boxNum = 0,
                        planQty = 0;

                    var inspectionType;

                    search.create({
                        type: 'customrecord_dps_delivery_order_item',
                        filters: [{
                            name: 'custrecord_dps_delivery_order_id',
                            operator: 'anyof',
                            values: context.id
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
                                name: "custitem_dps_spucoding",
                                join: "custrecord_item_sku"
                            }, //SPU编码
                            {
                                name: "custitem_dps_picture",
                                join: "custrecord_item_sku"
                            }, //产品图片
                            {
                                name: "custitem_dps_skuchiense",
                                join: "custrecord_item_sku"
                            }, //中文标题
                            {
                                name: "custitem_dps_specifications",
                                join: "custrecord_item_sku"
                            }, //规格
                            {
                                name: "custitem_dps_warehouse_check",
                                join: "custrecord_item_sku"
                            }, // 仓检类型
                            //主体上的
                            {
                                name: "custrecord_purchase_order_no",
                                join: "custrecord_dps_delivery_order_id"
                            }, //采购单ID
                            {
                                name: "custrecord_delivery_remarks",
                                join: "custrecord_dps_delivery_order_id"
                            }, //备注
                            {
                                name: "name",
                                join: "custrecord_dps_delivery_order_id"
                            }, //交货单号
                            {
                                name: "custrecord_supplier_code",
                                join: "custrecord_dps_delivery_order_id"
                            }, //供应商编码
                            {
                                name: "custrecord_supplier",
                                join: "custrecord_dps_delivery_order_id"
                            }, //供应商
                            {
                                name: "custrecord_tracking_number",
                                join: "custrecord_dps_delivery_order_id"
                            }, //运单号
                            {
                                name: "custrecord_delivery_date",
                                join: "custrecord_dps_delivery_order_id"
                            }, //交期
                            {
                                name: "custrecord_dsp_delivery_order_location",
                                join: "custrecord_dps_delivery_order_id"
                            }, //地点
                            {
                                name: "itemid",
                                join: "custrecord_item_sku"
                            }, //产品编号
                        ]
                    }).run().each(function (rec) {
                        order_po_no = rec.getValue({
                            name: "custrecord_purchase_order_no",
                            join: "custrecord_dps_delivery_order_id"
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
                            name: "name",
                            join: "custrecord_dps_delivery_order_id"
                        });
                        data['sourceType'] = 10;
                        data['supplierCode'] = rec.getValue({
                            name: "custrecord_supplier_code",
                            join: "custrecord_dps_delivery_order_id"
                        });
                        data['supplierName'] = rec.getText({
                            name: "custrecord_supplier",
                            join: "custrecord_dps_delivery_order_id"
                        });
                        data['waybillNo'] = rec.getValue({
                            name: "custrecord_tracking_number",
                            join: "custrecord_dps_delivery_order_id"
                        });
                        data['warehouseCode'] = rec.getValue({
                            name: "custrecord_dsp_delivery_order_location",
                            join: "custrecord_dps_delivery_order_id"
                        }); //rec.getValue({name: "custrecord_dps_wms_location",join: "location"});//仓库编号
                        data['warehouseName'] = rec.getText({
                            name: "custrecord_dsp_delivery_order_location",
                            join: "custrecord_dps_delivery_order_id"
                        }); //rec.getValue({name: "custrecord_dps_wms_location_name",join: "location"});//仓库名称
                        //rec.getValue({name: "custitem_dps_specifications",join: "custrecord_item_sku"});
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
                                name: "custrecord_line_boxes_number"
                            }),
                            planQty: rec.getValue({
                                name: "custrecord_item_quantity"
                            }),
                            productCode: rec.getValue({
                                // name: "custitem_dps_spucoding",
                                name: "itemid",
                                join: "custrecord_item_sku"
                            }),
                            productImageUrl: rec.getValue({
                                name: "custitem_dps_picture",
                                join: "custrecord_item_sku"
                            }),
                            productTitle: rec.getValue({
                                name: "custitem_dps_skuchiense",
                                join: "custrecord_item_sku"
                            }),
                            remainderQty: rec.getValue('custrecord_outstanding_quantity') ? rec.getValue('custrecord_outstanding_quantity') : 0,
                            sku: rec.getText({
                                name: "custrecord_item_sku"
                            }),
                            variant: JSON.stringify(variant_arr),
                            inspectionType: rec.getValue({
                                name: "custitem_dps_warehouse_check",
                                join: "custrecord_item_sku"
                            }) == 1 ? null : 30
                        });
                        return true;
                    });

                    search.create({
                        type: 'customrecord_dps_delivery_order',
                        filters: [{
                            name: "internalid",
                            operator: 'anyof',
                            values: context.id
                        }],
                        columns: [{
                                name: 'custrecord_dps_wms_location',
                                join: 'custrecord_dsp_delivery_order_location'
                            }, // //仓库编号
                            {
                                name: 'custrecord_dps_wms_location_name',
                                join: 'custrecord_dsp_delivery_order_location'
                            }, //仓库名称
                        ]
                    }).run().each(function (rec) {
                        data['warehouseCode'] = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_dsp_delivery_order_location'
                        }); //rec.getValue({name: "custrecord_dps_wms_location",join: "location"});//仓库编号
                        data['warehouseName'] = rec.getValue({
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_dsp_delivery_order_location'
                        }); //rec.getValue({name: "custrecord_dps_wms_location_name",join: "location"});//仓库名称
                    })
                    if (!boxNum) {
                        boxNum = 0;
                    }
                    data['boxNum'] = boxNum;
                    data['planQty'] = planQty;

                    var createdby;
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
                            "createdby",
                            'tranid',
                            'entity',
                            'subsidiary',
                            {
                                name: "custrecord_tax_included",
                                join: "subsidiary"
                            },
                            // {name: "custrecord_dps_wms_location",join: "location"},
                            // {name: "custrecord_dps_wms_location_name",join: "location"},
                        ]
                    }).run().each(function (rec) {

                        createdby = rec.getText('createdby');
                        var vendor_data = record.load({
                            type: 'vendor',
                            id: rec.getValue('entity')
                        });
                        data['pono'] = rec.getValue('tranid'); //采购单号
                        inspectionType = vendor_data.getValue('custentity_supplier_type') == 1 ? 10 : 20; //质检类型
                        data['inspectionType'] = inspectionType;

                        data['taxFlag'] = rec.getValue({
                            name: "custrecord_tax_included",
                            join: "subsidiary"
                        }) == 1 ? 1 : 0; //是否含税 0:否1:是
                        data['tradeCompanyCode'] = rec.getValue('subsidiary'); //交易主体编号
                        data['tradeCompanyName'] = rec.getText('subsidiary').substr(rec.getText('subsidiary').lastIndexOf(' ') + 1); //交易主体名称
                        return false;
                    });
                    for (var i = 0; i < item_arr.length; i++) {
                        if (item_arr[i].inspectionType == null) {
                            item_arr[i].inspectionType = inspectionType;
                        }
                    }
                    data['skuList'] = item_arr;
                    data['purchaser'] = createdby; //采购员 来源于采购订单的创建者
                    log.debug('data', data);

                    var flag = 0,
                        showArr = [];

                    for (var i = 0, len = checkItemArr.length; i < len; i++) {
                        var temp = data.skuList;
                        // log.debug('temp', temp);
                        for (var z = 0, len2 = temp.length; z < len2; z++) {
                            var a = temp[z];
                            log.debug('a[checkItemArr[i]])', a[checkItemArr[i]])
                            if (a[checkItemArr[i]]) {
                                flag += 1;
                            } else {
                                showArr.push("货品 " + z + ": " + showItemObj[checkItemArr[i]])
                                // flag = false
                            }
                        }
                    }

                    for (var j = 0, len1 = checkBodyArr.length; j < len1; j++) {
                        if (data[checkBodyArr[j]]) {
                            flag = true;
                        } else {
                            showArr.push(showBodyObj[checkBodyArr[j]])
                            flag = false
                        }
                    }


                    var retArr = [];
                    for (var g = 0, gln = showArr.length; g < gln; g++) {

                        if (showArr[g] == null || showArr[g] == undefined || showArr[g] == '') {} else {
                            retArr.push(showArr[g])
                        }
                    }

                    log.debug('showArr length ' + showArr.length, showArr)
                    log.debug('NS 字段检查', flag);
                    if (retArr && retArr.length > 0) {
                        // var message = {}
                        message.code = 5;
                        message.data = JSON.stringify(retArr);

                        if (context.id.length) {
                            for (var i = 0; i < context.id.length; i++) {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_delivery_order',
                                    id: context.id[i],
                                    values: {
                                        // custrecord_delivery_order_status: 3,
                                        custrecord_dps_delivery_wms_info: message.data
                                    }
                                });
                            }
                        } else {
                            var id = record.submitFields({
                                type: 'customrecord_dps_delivery_order',
                                id: context.id[i],
                                values: {
                                    // custrecord_delivery_order_status: 3,
                                    custrecord_dps_delivery_wms_info: message.data
                                }
                            });
                        }

                        return message
                    }
                    // message.code = 1;
                    // message.data = 'sssssssss';
                    // return message;
                }
                // 退货入库
                else if (sourceType == 20) {

                    var limit = 3999;
                    var sku_arr = [],
                        item_sku = [],
                        record_type, taxamount, otherrefnum, inspection_type = 10,
                        record_id, location_id, subsidiary_id,
                        entity, location, subsidiary, trandate, tranid, total = 0;
                    // sku、价格、数量、客户名称、地点、日期、子公司、退货单号
                    search.create({
                        type: 'returnauthorization',
                        filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: context.id
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
                        // sku、价格、数量、客户名称、地点、日期、子公司、退货单号
                        columns: [
                            'item', 'rate', 'quantity', 'entity', 'location', 'subsidiary',
                            'trandate', 'tranid', 'custcol_dps_trans_order_item_sku', 'custcol_dps_so_item_title',
                            {
                                name: "itemid",
                                join: "item",
                            },
                            {
                                name: "custitem_aio_asin",
                                join: "item",
                            },
                            {
                                name: "custitem_dps_fnsku",
                                join: "item"
                            },
                            {
                                name: "custitem_dps_msku",
                                join: "item"
                            },
                            {
                                name: "custitem_dps_spucoding",
                                join: "item"
                            },
                            {
                                name: "custitem_dps_skuchiense",
                                join: "item"
                            },
                            {
                                name: "custitem_dps_picture",
                                join: "item",
                            },
                            {
                                name: "custitem_dps_quality_inspection_type",
                                join: "item"
                            },
                            {
                                name: "taxamount"
                            },
                            'otherrefnum'
                        ]
                    }).run().each(function (rec) {
                        record_id = rec.id;
                        record_type = rec.recordType;
                        entity = rec.getText('entity');
                        location_id = rec.getValue('location');
                        location = rec.getText('location');
                        subsidiary_id = rec.getValue('subsidiary');
                        subsidiary = rec.getText('subsidiary');
                        trandate = rec.getValue('trandate');
                        tranid = rec.getValue('tranid');
                        taxamount = rec.getValue('taxamount');

                        otherrefnum = rec.getValue('otherrefnum');


                        var a = 30;
                        var insType = rec.getValue({
                            name: "custitem_dps_quality_inspection_type",
                            join: "item"
                        });
                        if (insType == 1) {
                            a = 10;
                        } else if (insType == 2) {
                            a = 20;
                        }
                        var itemInspectionType = rec.getValue({
                            name: "custitem_dps_quality_inspection_type",
                            join: "item"
                        });
                        // inspection_type =  == 1 ? 10 : 20;
                        var it = Math.abs(rec.getValue('quantity'));
                        total += Number(it);
                        var info = {
                            inspectionType: Number(a),
                            item: rec.getValue('item'),
                            sku: rec.getValue({
                                name: "itemid",
                                join: "item",
                            }),
                            rate: rec.getValue('rate'),
                            quantity: it,
                            title: rec.getValue({
                                name: "custitem_dps_skuchiense",
                                join: "item"
                            }),
                            url: rec.getValue({
                                name: "custitem_dps_picture",
                                join: "item",
                            })
                        };
                        sku_arr.push(info);
                        return --limit > 0;
                    });

                    log.debug('sku_arr', sku_arr);
                    var skuList = [];
                    for (var i = 0; i < sku_arr.length; i++) {
                        // if (inspection_type == 1) {
                        //     inspectionType = inspectionType;
                        // } else if (inspection_type == 2) {
                        //     inspectionType = 30;
                        // }
                        var info = {
                            "boxNum": 0, // 箱数
                            "planQty": sku_arr[i].quantity, // 计划入库数
                            "productCode": sku_arr[i].item, // 产品编码
                            "productImageUrl": sku_arr[i].url ? sku_arr[i].url : 'null', //图片路径
                            "productTitle": sku_arr[i].title, //产品标题
                            "remainderQty": 0, // 余数
                            "sku": sku_arr[i].sku, // sku
                            'inspectionType': 10, //     质检类型(字段迁移至 货品行)
                            // 'inspectionType': sku_arr[i].inspectionType, //     质检类型(字段迁移至 货品行)
                        }
                        skuList.push(info);
                    }


                    log.debug('skuList', skuList);
                    log.audit('total', total);
                    var da = new Date();

                    log.audit('Math.abs(Number(total))', Math.abs(Number(total)));


                    var taxFlag = 0;
                    if (taxamount > 0) {
                        taxFlag = 1;
                    }
                    data["taxFlag"] = taxFlag;
                    data["boxNum"] = 0;
                    data["estimateTime"] = da.toISOString();

                    // 1 全检
                    // 2 抽检
                    // 3 免检

                    log.debug('inspection_type', inspection_type);
                    var inspectionType = 2;
                    if (inspection_type == 1) {
                        inspectionType = 10;
                    } else if (inspection_type == 2) {
                        inspectionType = 20;
                    } else {
                        inspectionType = 30;
                    }

                    log.debug('inspectionType', inspectionType);

                    data["inspectionType"] = 10;
                    data["planQty"] = Math.abs(Number(total));
                    // var sourceNo = record_type + '_' + record_id;

                    // log.error('sourceNo', sourceNo);

                    data["sourceNo"] = record_id; // otherrefnum; // 来源单号

                    data["sourceType"] = 20; // 来源类型
                    data["taxFlag"] = taxFlag; // 是否含税

                    var ent = entity.replace(/[0-9]/ig, "").trim();
                    log.audit('ent： ' + ent, 'entity: ' + entity);
                    // data["supplierName"] = ent; // 供应商名称
                    data["tradeCompanyCode"] = subsidiary_id; // 交易主体编号
                    var con = subsidiary.split(':');
                    log.audit('con length ' + con.length, con);
                    var length = con.length;
                    subsidiary = con[length - 1];

                    log.audit('subsidiary', subsidiary);
                    data["tradeCompanyName"] = subsidiary.trim(); // 交易主体名称
                    data["warehouseCode"] = location_id; // 仓库编码
                    data["warehouseName"] = location; // 仓库名称
                    data["waybillNo"] = tranid; // 运单号
                    data["skuList"] = skuList; // SKU LIST
                    log.audit('data', data);

                }
                // 调拨入库
                else if (sourceType == 30) {

                }
                // 样品归还
                else if (sourceType == 40) {
                    search.create({
                        type: 'customrecord_sample_use_return',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: context.id
                        }],
                        columns: [
                            'custrecord_related_arrival_date',
                            'custrecord_owner_1',
                            'name',
                            'custrecord_if_contain_tax',
                            'custrecord_subsidiary_type_1',
                            {
                                name: 'custrecord_dps_wms_location',
                                join: 'custrecord_location_use_back'
                            },
                            {
                                name: 'custrecord_dps_wms_location_name',
                                join: 'custrecord_location_use_back'
                            }
                        ]
                    }).run().each(function (rec) {
                        var estimateTime;
                        if (rec.getValue('custrecord_related_arrival_date')) {
                            estimateTime = format.parse({
                                value: rec.getValue('custrecord_related_arrival_date'),
                                type: format.Type.DATE
                            });
                        }
                        data["estimateTime"] = estimateTime ? (new Date(estimateTime)).getTime() : ''; //预计到货时间
                        data["inspectionType"] = 10; //质检类型 10: 全检 20: 抽检
                        data["purchaser"] = rec.getText('custrecord_owner_1'); //采购员
                        data["sourceNo"] = rec.getValue('name'); //'来源单号';
                        data["sourceType"] = sourceType; //'来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整';
                        data["taxFlag"] = rec.getValue('custrecord_if_contain_tax'); //是否含税 0: 否1: 是
                        data["tradeCompanyCode"] = rec.getValue('custrecord_subsidiary_type_1'); //交易主体编号
                        data["tradeCompanyName"] = rec.getText('custrecord_subsidiary_type_1').substr(rec.getText('custrecord_subsidiary_type_1').lastIndexOf(' ') + 1); //交易主体名称
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
                    var box_num = 0,
                        total_quantity = 0;
                    var item_info = [];
                    search.create({
                        type: 'customrecord_sample_useret_transfer_item',
                        filters: [{
                            name: 'custrecord_suti_link',
                            operator: 'anyof',
                            values: context.id
                        }],
                        columns: [
                            'custrecord_item_box_quantity',
                            'custrecord_suti_quantiy',
                            'custrecord_suti_item',
                            {
                                name: 'custitem_dps_picture',
                                join: 'custrecord_suti_item'
                            },
                            {
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_suti_item'
                            }
                        ]
                    }).run().each(function (rec) {
                        box_num += Number(rec.getValue('custrecord_item_box_quantity'));
                        total_quantity += Number(rec.getValue('custrecord_suti_quantiy'));
                        item_info.push({
                            boxNum: rec.getValue('custrecord_item_box_quantity'),
                            inspectionType: 10,
                            planQty: rec.getValue('custrecord_suti_quantiy'),
                            productCode: rec.getValue('custrecord_suti_item'),
                            productImageUrl: rec.getValue({
                                name: 'custitem_dps_picture',
                                join: 'custrecord_suti_item'
                            }),
                            productTitle: rec.getValue({
                                name: 'custitem_dps_skuchiense',
                                join: 'custrecord_suti_item'
                            }),
                            remainderQty: 0,
                            sku: rec.getText('custrecord_suti_item')
                        });
                        return true;
                    });
                    data['skuList'] = item_info;
                    data["boxNum"] = box_num; //箱数
                    data["planQty"] = total_quantity; //计划入库数量
                    log.debug('data', data);
                }
                // 批量交货单
                else if (sourceType == 70) {
                    var items = [];
                    var plnObj = {};
                    var inspectionType;
                    log.debug('context.id', context.id);
                    search.create({
                        type: 'customrecord_dps_delivery_order',
                        filters: [{
                            name: 'custrecord_pln_no',
                            operator: 'anyof',
                            values: context.id //批量发货单号
                        }],
                        columns: [
                            'internalid'
                        ]
                    }).run().each(function (ln) {
                        var lnId = ln.getValue('internalid');
                        log.debug('lnId', lnId);
                        search.create({
                            type: 'customrecord_dps_delivery_order_item',
                            filters: [{
                                name: 'custrecord_dps_delivery_order_id',
                                operator: 'anyof',
                                values: lnId
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
                                    name: "custitem_dps_spucoding",
                                    join: "custrecord_item_sku"
                                }, //SPU编码
                                {
                                    name: "custitem_dps_picture",
                                    join: "custrecord_item_sku"
                                }, //产品图片
                                {
                                    name: "custitem_dps_skuchiense",
                                    join: "custrecord_item_sku"
                                }, //中文标题
                                {
                                    name: "custitem_dps_specifications",
                                    join: "custrecord_item_sku"
                                }, //规格
                                {
                                    name: "custitem_dps_warehouse_check",
                                    join: "custrecord_item_sku"
                                }, // 仓检类型
                                {
                                    name: "itemid",
                                    join: "custrecord_item_sku"
                                }, //产品编号
                            ]
                        }).run().each(function (rec) {
                            var hasItem;
                            for (key in items) {
                                if (items[key].sku == rec.getText('custrecord_item_sku')) {
                                    hasItem = key;
                                }
                            }
                            if (hasItem) { //如果已经有这个sku了，那么直接增加数量就可以了
                                items[hasItem].boxNum += Number(rec.getValue('custrecord_line_boxes_number'));
                                items[hasItem].planQty += Number(rec.getValue('custrecord_item_quantity'));
                            } else {
                                var itemArr = {};
                                itemArr.sku = rec.getText('custrecord_item_sku'); //sku的ID
                                itemArr.productCode = rec.getValue({
                                    // name: "custitem_dps_spucoding",
                                    name: "itemid",
                                    join: "custrecord_item_sku"
                                }); //该sku对应的产品编码，例如101006
                                itemArr.boxNum = Number(rec.getValue('custrecord_line_boxes_number')); //该sku箱数
                                itemArr.planQty = Number(rec.getValue('custrecord_item_quantity')); //该sku数量
                                var variant_arr = [{
                                        name: 'color',
                                        value: '白色'
                                    },
                                    {
                                        name: 'size',
                                        value: 'L'
                                    }
                                ];
                                itemArr.variant = JSON.stringify(variant_arr); //不知道是什么，默认带的
                                var boxInfo = {
                                    height: rec.getValue('custrecord_ddoi_high'), //(number): 高,
                                    length: rec.getValue('custrecord_ddoi_long'), //(number): 长,
                                    width: rec.getValue('custrecord_ddoi_width'), // (number): 宽
                                };
                                itemArr.boxInfo = boxInfo; //该sku的箱子长宽高
                                itemArr.productImageUrl = rec.getValue({
                                    name: "custitem_dps_picture",
                                    join: "custrecord_item_sku"
                                }); //sku的图片
                                itemArr.productTitle = rec.getValue({
                                    name: "custitem_dps_skuchiense",
                                    join: "custrecord_item_sku"
                                }); //sku的中文标题
                                itemArr.remainderQty = rec.getValue('custrecord_outstanding_quantity') ? rec.getValue('custrecord_outstanding_quantity') : 0; //sku剩余交货数量
                                itemArr.inspectionType = rec.getValue({
                                    name: "custitem_dps_warehouse_check",
                                    join: "custrecord_item_sku"
                                }) == 1 ? null : 30; //sku仓检类型
                                items.push(itemArr);
                            }
                            return true;
                        });
                        return true;
                    });
                    search.create({
                        type: 'customrecord_pln_management',
                        filters: [{
                            name: "internalid",
                            operator: 'is',
                            values: context.id
                        }],
                        columns: [
                            "name", //pln单号名称
                            "custrecord_pln_delivery_remarks", //备注
                            "custrecord_pln_supplier", //供应商
                            "custrecord_pln_delivery_date", //交期
                            'owner', //创建员&采购员
                            'custrecord_pln_subsidiary', //来源主体
                            {
                                name: 'name',
                                join: 'custrecord_pln_subsidiary'
                            }, //来源主体名称
                            {
                                name: 'custrecord_tax_included',
                                join: 'custrecord_pln_subsidiary'
                            }, //是否含税
                            {
                                name: 'custrecord_dps_wms_location',
                                join: 'custrecord_pln_delivery_order_location'
                            }, //仓库编号
                            {
                                name: 'custrecord_dps_wms_location_name',
                                join: 'custrecord_pln_delivery_order_location'
                            }, //仓库名称
                        ]
                    }).run().each(function (rec) {
                        plnObj.warehouseCode = rec.getValue({
                            name: 'custrecord_dps_wms_location',
                            join: 'custrecord_pln_delivery_order_location'
                        }); //仓库编号
                        plnObj.warehouseName = rec.getValue({
                            name: 'custrecord_dps_wms_location_name',
                            join: 'custrecord_pln_delivery_order_location'
                        }); //仓库名字
                        if (rec.getValue({
                                name: 'custrecord_pln_delivery_date'
                            })) {
                            var estimateTime = format.parse({
                                value: rec.getValue({
                                    name: 'custrecord_pln_delivery_date'
                                }),
                                type: format.Type.DATE
                            });
                            plnObj.estimateTime = (new Date(estimateTime)).getTime(); ///1000
                        } else {
                            plnObj.estimateTime = '';
                        } //交期
                        plnObj.remark = rec.getValue('custrecord_pln_delivery_remarks'); //备注
                        plnObj.supplierName = rec.getText('custrecord_pln_supplier'); //供应商名字
                        plnObj.purchaser = rec.getText('owner'); //采购员
                        var vendor_data = record.load({
                            type: 'vendor',
                            id: rec.getValue('custrecord_pln_supplier')
                        });
                        inspectionType = vendor_data.getValue('custentity_supplier_type');
                        if (inspectionType == 1) {
                            inspectionType = 10;
                        } else if (inspectionType == 2) {
                            inspectionType = 20;
                        }
                        plnObj.inspectionType = inspectionType; //质检类型
                        var totalPlanQty = 0,
                            totalBoxNum = 0;
                        for (key in items) {
                            totalPlanQty += items[key].planQty;
                            totalBoxNum += items[key].boxNum;
                            if (items[key].inspectionType == null) {
                                items[key].inspectionType = inspectionType;
                            }
                        }
                        plnObj.taxFlag = rec.getValue({
                            name: "custrecord_tax_included",
                            join: "custrecord_pln_subsidiary"
                        }) == 1 ? 1 : 0; //是否含税 0:否1:是
                        plnObj.planQty = totalPlanQty; //总数量
                        plnObj.boxNum = totalBoxNum; //总箱数
                        plnObj.sourceNo = rec.getValue('name'); //来源单号
                        plnObj.sourceType = 70; //来源类型
                        plnObj.tradeCompanyCode = rec.getValue('custrecord_pln_subsidiary'); //交易主体编号
                        plnObj.tradeCompanyName = rec.getValue({
                            name: 'name',
                            join: 'custrecord_pln_subsidiary'
                        }).substr(rec.getValue({
                            name: 'name',
                            join: 'custrecord_pln_subsidiary'
                        }).lastIndexOf(' ') + 1); //交易主体名字
                        plnObj.skuList = items; //pln的商品们
                    });
                    log.debug("plnObj", plnObj);
                    var showArr = [];

                    for (var i = 0; i < checkItemArr.length; i++) {
                        //检查item字段是否都存在
                        var temp = plnObj.skuList;
                        for (var z = 0; z < temp.length; z++) {
                            var a = temp[z];
                            if (!a[checkItemArr[i]]) {
                                showArr.push('货品' + z + ": " + showItemObj[checkItemArr[i]]);
                            }
                        }
                    }
                    for (j = 0; j < checkBodyArr.length; j++) {
                        //检查body字段是否都存在
                        if (!plnObj[checkBodyArr[j]]) {
                            showArr.push(showBodyObj[checkBodyArr[j]]);
                        }
                    }
                    var retArr = [];
                    for (var g = 0; g < showArr.length; g++) {
                        //清掉空值
                        if (showArr[g] != null && showArr[g] != undefined && showArr[g] != '') {
                            retArr.push(showArr[g]);
                        }
                    }
                    log.debug("retArr", retArr); //确认是否存在未填字段

                    if (retArr && retArr.length > 0) {
                        // var message = {}
                        message.code = 5;
                        message.data = JSON.stringify(retArr);
                        var id = record.submitFields({
                            type: 'customrecord_pln_management',
                            id: context.id,
                            values: {
                                custrecord_pln_wms_info: message.data
                            }
                        });
                        return message
                    }
                    data = plnObj; //将数据统一到data内
                }
                log.debug("data", data);
                message = sendRequest(token, data);
                var flag = false;
                if (message.data.code == 0) {
                    log.error('response code', message.data);
                    flag = true;
                }

                if (sourceType == 40) {
                    log.debug('message', message);
                    if (message.data.code != 0) {
                        record.submitFields({
                            type: 'customrecord_sample_use_return',
                            id: context.id,
                            values: {
                                custrecord_stauts_wms: 5,
                                custrecord_wms_info_t: message.data.msg
                            }
                        });
                    } else {
                        record.submitFields({
                            type: 'customrecord_sample_use_return',
                            id: context.id,
                            values: {
                                custrecord_stauts_wms: 2,
                                custrecord_wms_info_t: message.data.msg
                            }
                        });
                    }
                }

                var sta;
                if (sourceType == 10) {
                    var result_data = {},
                        status = 'error';
                    if (message.data.code == 0) {
                        sta = 3
                        var id = record.submitFields({
                            type: 'customrecord_dps_delivery_order',
                            id: context.id,
                            values: {
                                custrecord_delivery_order_status: 3,
                                custrecord_dps_delivery_wms_info: message.data.msg
                            }
                        });
                        status = 'success';
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_dps_delivery_order',
                            id: context.id,
                            values: {
                                // custrecord_delivery_order_status: sta,
                                custrecord_dps_delivery_wms_info: message.data.msg ? message.data.msg : message.data
                            }
                        });
                    }
                    result_data.status = status;
                    result_data.data = message.data.msg ? message.data.msg : message.data;
                    log.audit('result_data', result_data);
                    return result_data;
                }

                if (sourceType == 70) {
                    var result_data = {};
                    var status = 'error';
                    if (message.data.code == 0) {
                        //设置pln的交货单状态
                        var id = record.submitFields({
                            type: 'customrecord_pln_management',
                            id: context.id,
                            values: {
                                custrecord_pln_delivery_order_status: 3,
                                custrecord_pln_wms_info: message.data.msg
                            }
                        });
                        //还要修改ln的交货单状态
                        search.create({
                            type: 'customrecord_dps_delivery_order',
                            filters: [{
                                name: 'custrecord_pln_no',
                                operator: 'anyof',
                                values: context.id //批量发货单号
                            }],
                            columns: [
                                'internalid'
                            ]
                        }).run().each(function (ln) {
                            log.debug("交货单id", ln.getValue('internalid'));
                            var lnId = record.submitFields({
                                type: 'customrecord_dps_delivery_order',
                                id: ln.getValue('internalid'),
                                values: {
                                    custrecord_delivery_order_status: 3,
                                    custrecord_dps_delivery_wms_info: message.data.msg
                                }
                            });
                            return true;
                        });
                        status = 'success';
                    } else {
                        var id = record.submitFields({
                            type: 'customrecord_pln_management',
                            id: context.id,
                            values: {
                                custrecord_pln_wms_info: message.data.msg
                            }
                        });
                    }
                    result_data.status = status;
                    result_data.data = message.data.msg ? message.data.msg : message.data;
                    log.audit('result_data', result_data);
                    return result_data;
                }

                if (sourceType == 20) {
                    var id = record.submitFields({
                        type: 'returnauthorization',
                        id: context.id,
                        values: {
                            custbody_dps_wms_info: JSON.stringify(message.data.msg ? message.data.msg : message.data),
                            custbody_dps_push_wms: flag
                        }
                    });
                }
            } else {
                message.code = 1;
                message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
            }

        } catch (error) {
            log.error('出错了', error);
            message.code = 5;
            message.data = error.message;
        }
        return message;
    }

    function _put(context) {

    }

    function _delete(context) {

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
        log.debug('headers', JSON.stringify(headerInfo));
        log.debug('body', JSON.stringify(data));
        var response = http.post({
            url: config.WMS_Debugging_URL + '/inMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) { // 调用成功
            retdata = JSON.parse(response.body);
            code = 0;
        } else { // 调用失败
            retdata = '调用失败: ' + response.code;
            code = 5
        }

        message.code = code;
        message.data = retdata;
        return message;
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});