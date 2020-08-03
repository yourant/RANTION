/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-07-31 16:41:39
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.suitelet.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/log', './douples_amazon/Helper/core.min', 'N/file',
    'N/xml', './Rantion/Helper/tool.li', 'N/runtime', 'N/file', "N/ui/serverWidget"
], function (search, record, log, core, file, xml, tool, runtime, file, serverWidget) {

    function onRequest(context) {
        try {

            var userObj = runtime.getCurrentUser();

            log.debug('userObj', userObj);
            if (userObj.role == 3 && userObj.id != 911) {
                var request = context.request;
                var response = context.response;
                var parameters = request.parameters;
                var account = parameters.custpage_dps_account;
                var shipment = parameters.custpage_dps_shipment;
                var print = parameters.print;

                var form = serverWidget.createForm({
                    title: '查询shipment'
                });

                form.addFieldGroup({
                    id: 'search_groupid',
                    label: '查询条件'
                });

                form.addFieldGroup({
                    id: 'result_groupid',
                    label: '结果信息'
                });
                if (account && shipment) {


                    var auth = core.amazon.getAuthByAccountId(account);

                    var s = core.amazon.listInboundShipments(auth, "", [shipment])

                    log.debug('s', s)
                    var item = core.amazon.listInboundShipmentsItems(auth, shipment, "");
                    log.debug('item', item);


                    var sublist = form.addSublist({
                        id: 'sublistid',
                        type: serverWidget.SublistType.LIST,
                        label: 'Shipment信息'
                    });

                    var da = sublist.addField({
                        id: 'custpage_shipment_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment id'
                    });
                    var da = sublist.addField({
                        id: 'custpage_shipment_name',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment name'
                    });
                    var da = sublist.addField({
                        id: 'custpage_center_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'center id'
                    });
                    var da = sublist.addField({
                        id: 'custpage_label_prep_type',
                        type: serverWidget.FieldType.TEXT,
                        label: 'label prep type'
                    });
                    var da = sublist.addField({
                        id: 'custpage_shipment_status',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment status'
                    });
                    var da = sublist.addField({
                        id: 'custpage_are_cases_required',
                        type: serverWidget.FieldType.TEXT,
                        label: 'are cases required'
                    });
                    var da = sublist.addField({
                        id: 'custpage_box_contents_source',
                        type: serverWidget.FieldType.TEXT,
                        label: 'box contents source'
                    });

                    var line = form.getSublist({
                        id: 'sublistid'
                    });
                    for (var i_s = 0, i_len = s.length; i_s < i_len; i_s++) {
                        line.setSublistValue({
                            id: 'custpage_shipment_id',
                            value: s[i_s].shipment_id,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_shipment_name',
                            value: s[i_s].shipment_name,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_center_id',
                            value: s[i_s].center_id,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_label_prep_type',
                            value: s[i_s].label_prep_type,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_shipment_status',
                            value: s[i_s].shipment_status,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_are_cases_required',
                            value: s[i_s].are_cases_required,
                            line: i_s
                        });
                        if (s[i_s].box_contents_source) {
                            line.setSublistValue({
                                id: 'custpage_box_contents_source',
                                value: s[i_s].box_contents_source,
                                line: i_s
                            });
                        }
                    }

                    var sublist_item = form.addSublist({
                        id: 'sublistid_ship_item',
                        type: serverWidget.SublistType.LIST,
                        label: 'Shipment 货品'
                    });

                    var da = sublist_item.addField({
                        id: 'custpage_item_shipment_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment id'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_seller_sku',
                        type: serverWidget.FieldType.TEXT,
                        label: 'seller sku'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_shipped',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity shipped'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_in_case',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity in case'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_received',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity received'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_fulfillment_network_sku',
                        type: serverWidget.FieldType.TEXT,
                        label: 'fulfillment network sku'
                    });


                    var line_item = form.getSublist({
                        id: 'sublistid_ship_item'
                    });
                    for (var it_i = 0, it_len = item.length; it_i < it_len; it_i++) {
                        line_item.setSublistValue({
                            id: 'custpage_item_shipment_id',
                            value: item[it_i].shipment_id,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_seller_sku',
                            value: item[it_i].seller_sku,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_shipped',
                            value: item[it_i].quantity_shipped,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_in_case',
                            value: item[it_i].quantity_in_case,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_received',
                            value: item[it_i].quantity_received,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_fulfillment_network_sku',
                            value: item[it_i].fulfillment_network_sku,
                            line: it_i
                        });
                    }

                }


                form.addSubmitButton({
                    label: '查询',
                });

                var s_account = form.addField({
                    id: 'custpage_dps_account',
                    type: serverWidget.FieldType.SELECT,
                    source: 'customrecord_aio_account',
                    label: '店铺',
                    container: 'search_groupid'
                });
                s_account.defaultValue = account;

                var ship = form.addField({
                    id: 'custpage_dps_shipment',
                    type: serverWidget.FieldType.TEXT,
                    label: 'ShipmentId',
                    container: 'search_groupid'
                });
                ship.defaultValue = shipment;





                context.response.writePage({
                    pageObject: form
                });

            } else if (userObj.id == 911 /* || userObj.id == 13440 */ ) {


                return ;
                search.create({
                    type: 'customrecord_dps_shipping_record_box',
                    filters: [{
                        name: 'custrecord_dps_ship_box_fa_record_link',
                        operator: 'anyof',
                        values: 46
                    }],
                }).run().each(function (rec) {
                    record.delete({
                        type: 'customrecord_dps_shipping_record_box',
                        id: rec.id
                    });
                    return true;
                });

                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: 46,
                    values: {
                        custrecord_dps_box_return_flag: false
                    }
                });


            } else {
                context.response.writeLine('<html><head><meta charset="utf-8"></head><body><br><br><br><br><h1 style = "vertical-align:middle;text-align:center;color: red">权限不足</h1><p style = "vertical-align:middle;text-align:center;">无法运行此页面</p></body></html>')
            }


        } catch (error) {
            log.error('函数执行出错了', error);
        }
    }



    function SummaryBinBox(itemArr) {
        var BinArr = [],
            BoxArr = [],
            sBinBox = [];
        itemArr.forEach(function (item) {
            var type = item.type;
            if (type == 2) { // 未装箱, 从库位出
                BinArr.push(item)
            } else { // 已装箱, 从箱号出
                BoxArr.push(item)
            }
        });

        log.debug('按箱分组', BoxArr);
        log.debug('按库位分组', BinArr);

        var BinObj = {},
            sunBinArr1 = [];
        // 同库位合并
        for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {
            var sunBinArr = [];
            var bin_temp = BinArr[i_bin];
            log.audit('bin_temp', bin_temp);
            sunBinArr.push(bin_temp);
            for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {
                var j_bin_temp = BinArr[j_bin];
                if (bin_temp.positionCode == j_bin_temp.positionCode) {
                    sunBinArr.push(j_bin_temp);
                    log.audit('sunBinArr', sunBinArr);
                }
            }
            BinObj[bin_temp.positionCode] = sunBinArr;
        }
        // log.audit('sunBinArr', sunBinArr)
        var BoxObj = {},
            sunBoxArr1 = [];
        // 同箱号合并
        for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
            var box_temp = BoxArr[i_box];
            var sunBoxArr = [];
            sunBoxArr.push(box_temp);
            for (var j_box = i_box + 1; j_box < binLen; j_box++) {
                var j_box_temp = BoxArr[j_box];
                if (box_temp.barcode == j_box_temp.barcode) {
                    sunBoxArr.push(j_box_temp);
                }
            }
            BoxObj[box_temp.barcode] = sunBoxArr;
        }

        var itemObj = {
            "BoxObj": BoxObj,
            "BinObj": BinObj
        }
        // log.debug('SummaryBinBox itemObj', itemObj)
        return itemObj || false;

    }


    function toWMS() {
        var context = {};
        context.recordID = 737;
        var tranOrder;
        var data = {};
        var tranType, fbaAccount;
        var ful_to_link;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                'custrecord_dps_shipping_rec_transport',
                'custrecord_dps_shipping_rec_order_num',
                // 'owner',
                'custrecord_dps_shipping_rec_currency',
                'custrecord_dps_declared_value_dh',
                'custrecord_dps_shipping_rec_account',
                'custrecord_dps_shipping_r_channelservice',
                'custrecord_dps_shipping_r_channel_dealer',
                'custrecord_dps_shipping_rec_shipments',
                'custrecord_dps_shipping_rec_location',
                'custrecord_dps_shipping_rec_to_location',
                'custrecord_dps_shipping_rec_transa_subje',
                'custrecord_dps_shipping_rec_logistics_no',
                'custrecord_dps_f_b_purpose', // 用途
                'custrecord_dps_declare_currency_dh', // 申报币种
                'custrecord_dps_shipping_rec_shipmentsid', // shipmentId

                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库名称
                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库名称
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码

                {
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 计泡基数
                // {
                //     name: "entityid",
                //     join: "owner"
                // }, // 拥有者

                {
                    name: 'custrecord_aio_marketplace',
                    join: 'custrecord_dps_shipping_rec_account'
                }, // 站点 / 市场

                "custrecord_dps_shipping_rec_destinationf", // 仓库中心
                "custrecord_dps_ship_remark", // 备注

                {
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 调拨单号
                "custrecord_dps_to_shipment_name", // shipment name 
                "custrecord_dps_to_reference_id", // reference id
            ]
        }).run().each(function (rec) {

            tranOrder = rec.getValue('custrecord_dps_shipping_rec_order_num')

            ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
            var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

            var shippingType;
            // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
            // 1	空运   2	海运   3	铁路    4   快船
            if (rec_transport == 1) {
                shippingType = 10;
            } else if (rec_transport == 4) {
                shippingType = 30;
            } else if (rec_transport == 2) {
                shippingType = 20;
            } else if (rec_transport == 3) {
                shippingType = 40
            }

            data["remark"] = rec.getValue('custrecord_dps_ship_remark') ? rec.getValue('custrecord_dps_ship_remark') : ''; // 备注字段

            data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");
            data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment name

            data["shippingType"] = shippingType;
            data["aono"] = rec.getValue({
                name: "tranid",
                join: "custrecord_dps_shipping_rec_order_num"
            });

            // data["createBy"] = rec.getValue({
            //     name: "entityid",
            //     join: "owner"
            // });

            data["marketplaces"] = rec.getText({
                name: 'custrecord_aio_marketplace',
                join: 'custrecord_dps_shipping_rec_account'
            });
            data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

            data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));
            fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
            data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

            data["countBubbleBase"] = Number(rec.getValue({
                name: 'custrecord_ls_bubble_count',
                join: 'custrecord_dps_shipping_r_channelservice'
            }));
            data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
            data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
            data["logisticsLabelPath"] = 'logisticsLabelPath';

            data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

            // data["logisticsProviderCode"] = rec.getValue({
            //     name: 'custrecord_ls_service_code',
            //     join: 'custrecord_dps_shipping_r_channelservice'
            // });

            var channel_dealer = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            var channel_dealerText = rec.getText('custrecord_dps_shipping_r_channel_dealer');

            var logiFlag = 1;
            if (channel_dealer == 6 || channel_dealerText == "Amazon龙舟") {
                logiFlag = 0;
            }

            // logisticsFlag (integer): 是否需要物流面单 0:否 1:是 
            // FIXME 需要判断物流渠道是否存在面单文件, 
            data["logisticsFlag"] = logiFlag;


            data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

            data["sourceWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_location'
            });
            data["sourceWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_location'
            });

            data["targetWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["targetWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["taxFlag"] = 1;
            data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

            var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
            var b = a.split(':');
            data["tradeCompanyName"] = b[b.length - 1];
            // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

            var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

            var type = 10;
            // 1 FBA调拨    2 自营仓调拨   3 跨仓调拨   4 移库

            var waybillNo;

            if (type1 == 1) {
                type = 20;
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
            } else {
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
            }

            data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
            data["type"] = type;
            data["waybillNo"] = waybillNo; // 运单号
        });



        var createdBy, to_aono;
        search.create({
            type: 'transferorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: ful_to_link
            }],
            columns: [
                "createdby",
                // {
                //     name: "tranid",
                //     join: "custrecord_dps_shipping_rec_order_num"
                // }, // 调拨单号
            ]
        }).run().each(function (rec) {
            createdBy = rec.getText('createdby');
            // to_aono = rec.getValue({
            //     name: "tranid",
            //     join: "custrecord_dps_shipping_rec_order_num"
            // });
        });


        // data["aono"] = to_aono;

        data["createBy"] = createdBy; // 设置调拨单创建者

        var taxamount;
        var item_info = [];
        var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
        // var numLines = af_rec.getLineCount({
        //     sublistId: subli_id
        // });


        var itemArr = [];
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [{
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_msku'
                },
                {
                    name: 'custrecord_dps_f_b_purpose',
                    join: 'custrecord_dps_shipping_record_parentrec'
                },
                {
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                },
                {
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custrecord_dps_ship_record_sku_item'
                },
                {
                    name: 'custrecord_dps_ship_record_item_quantity'
                },

                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品重量(cm),
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品高(cm),
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品长(cm),
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品宽(cm),
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 品牌名称,
                {
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品英文标题,

                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                },
                'custrecord_dps_shipping_record_item', // 货品

                // {
                //     name: 'taxamount',
                //     join: 'custrecord_dps_trans_order_link'
                // }

                {
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }, // 材质  material
                {
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }, // 物流分组 logisticsGroup
                {
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                }, // 采购成本  purchaseCost
                {
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }, // 英文标题/描述 englishTitle
            ]
        }).run().each(function (rec) {

            // AllocationDetailCreateRequestDto{
            //     asin(string): ASIN,
            //     brandName(string): 品牌名称,
            //     englishTitle(string): 产品英文标题,
            //     fnsku(string): FNSKU,
            //     msku(string): MSKU,
            //     productCode(string, optional): 产品编号,
            //     productHeight(number): 产品高(cm),
            //     productImageUrl(string): 图片路径,
            //     productLength(number): 产品长(cm),
            //     productTitle(string): 产品标题,
            //     productWeight(number): 产品重量(g),
            //     productWidth(number): 产品宽(cm),
            //     purpose(string): 用途,
            //     qty(integer): 数量,
            //     sku(string): SKU,
            //   }

            itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
            var purchaseCost = rec.getValue({
                name: "cost",
                join: "custrecord_dps_shipping_record_item"
            });
            var it = {
                englishTitle: rec.getValue({
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }),
                purchaseCost: Number(purchaseCost),
                logisticsGroup: rec.getText({
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }),
                material: rec.getText({
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }),
                itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                asin: rec.getValue({
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                fnsku: rec.getValue({
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                }),

                msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                englishTitle: rec.getValue({
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productImageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productHeight: Number(rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productLength: Number(rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productWeight: Number(rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                })),
                productWidth: Number(rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                sku: rec.getValue({
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
            };
            taxamount = rec.getValue({
                name: 'taxamount',
                join: 'custrecord_dps_trans_order_link'
            });
            item_info.push(it);

            return true;

        });

        log.debug('itemArr', itemArr);

        // 2020/7/18 13：44 改动 
        var fils = [],
            add_fils = []; //过滤
        var len = item_info.length,
            num = 0;
        var checkArr = [];
        item_info.map(function (ld) {
            num++;
            if (ld.msku) { // 存在 msku
                add_fils.push([
                    ["name", "is", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            } else { // 不存在 msku
                add_fils.push([
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            }
            if (num < len)
                add_fils.push("or");
        });
        fils.push(add_fils);
        fils.push("and",
            ["custrecord_ass_account", "anyof", fbaAccount]
        );
        fils.push("and",
            ["isinactive", "is", false]
        );
        log.debug('fils', fils);
        log.debug('item_info', item_info);
        var newItemInfo = [];

        if (tranType == 1) {
            var new_limit = 3999;
            log.debug("fils:::::", fils)
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fils,
                columns: [
                    "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                ]
            }).run().each(function (rec) {
                // log.debug("rec.id ::::::: ", rec.id)
                var it = rec.getValue('custrecord_ass_sku');
                item_info.forEach(function (item, key) {

                    // log.debug('item.itemId: ' + item.itemId, "it: " + it);

                    if (item.itemId == it) {
                        item.asin = rec.getValue("custrecord_ass_asin");
                        item.fnsku = rec.getValue("custrecord_ass_fnsku")
                        item.msku = rec.getValue('name');
                        newItemInfo.push(item);
                    }
                });
                return --new_limit > 0;
            });

            log.debug('newItemInfo', newItemInfo);

            if (newItemInfo && newItemInfo.length == 0) {

                message.code = 3;
                message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    }
                });

                return message;
            }

            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(context.recordID, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0) {

                message.code = 3;
                message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                    }
                });

                return message;
            }


            data['allocationDetailCreateRequestDtos'] = newItemInfo;
        } else {
            data['allocationDetailCreateRequestDtos'] = item_info;
        }

        log.audit('newItemInfo', newItemInfo);
        if (Number(taxamount) > 0) {
            data["taxFlag"] = 1;
        } else {
            data["taxFlag"] = 0;
        }
        // log.error('item_info', item_info);
        // data['allocationDetailCreateRequestDtos'] = newItemInfo;



        log.error('参数 data', data);
        // 发送请求

    }


    /**
     * 获取当前订单的延交订单的货品数量, 若存在延交订单数量大于 0, 返回 false; 否则返回 true;
     * @param {Number} toId 
     * @returns {Array} 
     */
    function arrBackOrder(toId) {
        var backOrder = 0;
        var bacOrdArr = [];

        var toObj = record.load({
            type: 'transferorder',
            id: toId
        });
        var numLines = toObj.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0; i < numLines; i++) {

            var backQty = toObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantitybackordered',
                line: i
            });
            if (backQty != 0) {
                var it = {
                    itemName: toObj.getSublistText({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i
                    }),
                    qty: backQty
                }
                bacOrdArr.push(toObj.getSublistText({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                }));
            }
            backOrder += Number(backQty);
        }
        log.debug('backOrder', backOrder);

        if (backOrder != 0) {
            flag = false;
        }
        log.audit('bacOrdArr length： ' + bacOrdArr.length, bacOrdArr);

        return bacOrdArr;
    }



    function searchShipmentInfo(context) {


        var form = serverWidget.createForm({
            title: '查询shipment'
        });

        var field = form.addField({
            id: 'custpage_dps_account',
            type: serverWidget.FieldType.SELECT,
            source: 'customrecord_aio_account',
            label: '店铺'
        });


        context.response.writePage({
            pageObject: form
        });

    }



    function getBoxInfo(rec_id, auth, shipment_id) {

        var feedRecId;
        var params = {},
            carton_infos_1 = {};

        var limit1 = 3999,
            limit2 = 3999,
            boxItem = [],
            skuItem = [];

        var lim = 3999;
        var newBox = [];
        search.create({
            type: "customrecord_dps_shipping_record_box",
            filters: [{
                name: "custrecord_dps_ship_box_fa_record_link",
                operator: "anyof",
                values: [rec_id]
            }],
            columns: [{
                    name: "custrecord_dps_ship_box_box_number",
                    sortdir: "ASC"
                }, // 箱号
                'custrecord_dps_ship_box_item', // 货品
                'custrecord_dps_ship_box_quantity', // 数量
            ]
        }).run().each(function (rec) {

            var it = {
                itemId: rec.getValue('custrecord_dps_ship_box_item'),
                qty: rec.getValue('custrecord_dps_ship_box_quantity'),
                box: rec.getValue({
                    name: "custrecord_dps_ship_box_box_number",
                    sortdir: "ASC"
                })
            }
            newBox.push(it);
            return --limit1 > 0;
        });

        log.audit('newBox', newBox);

        var sukObj = {};
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: rec_id
            }],
            columns: [{
                    name: 'custrecord_dps_shipping_record_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // 货品
                {
                    name: 'custrecord_dps_ship_record_sku_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // serllerSKU
            ]
        }).run().each(function (rec) {

            sukObj[rec.getValue({
                name: 'custrecord_dps_shipping_record_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            })] = rec.getValue({
                name: 'custrecord_dps_ship_record_sku_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            })

            return --limit2 > 0;
        });


        newBox.map(function (box) {
            var box_itemId = box.itemId;
            box.sellersku = sukObj[box_itemId];
        });

        newBox.map(function (box) {

            if (carton_infos_1.hasOwnProperty("box_" + box.box)) {
                var it = {
                    sku: box.sellersku,
                    qty: box.qty,
                    qty_in_case: 1,
                }
                carton_infos_1["box_" + box.box].push(it);
            } else {
                var it = {
                    sku: box.sellersku,
                    qty: box.qty,
                    qty_in_case: 1,
                }
                carton_infos_1["box_" + box.box] = [it];
            }

        })


        log.audit('carton_infos', carton_infos_1);
        // 提交装箱单信息
        var body_1 = '<?xml version="1.0" encoding="utf-8"?>' +
            '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">' +
            '<Header>' +
            '<DocumentVersion>1.01</DocumentVersion>' +
            '<MerchantIdentifier>' + auth.seller_id + '</MerchantIdentifier>' +
            '</Header>' +
            '<MessageType>CartonContentsRequest</MessageType>' +
            '<Message>' +
            '<MessageID>1</MessageID>' +
            '<OperationType>Update</OperationType>' +
            '<CartonContentsRequest>' +
            '<ShipmentId>' + shipment_id + '</ShipmentId>' +
            '<NumCartons>' + Object.keys(carton_infos_1).length + '</NumCartons>';
        Object.keys(carton_infos_1).map(function (carton_id) {
            body_1 += "<Carton><CartonId>" + carton_id.replace('box_', shipment_id + "U") + "</CartonId>";
            carton_infos_1["" + carton_id].map(function (item) {
                body_1 += "<Item><SKU>" + item.sku + "</SKU><QuantityShipped>" + item.qty + "</QuantityShipped><QuantityInCase>" + item.qty_in_case + "</QuantityInCase></Item>";
            });
            body_1 += "</Carton>";
        });
        body_1 += '</CartonContentsRequest></Message></AmazonEnvelope>';

        log.debug("xml body", body_1);

        return body_1;
    }

    /**
     * 推送WMS
     * @param {*} af_rec
     */
    function wms(af_rec) {
        // 推送 WMS, 获取装箱信息

        var flagLocation;

        //     1 FBA仓   2 自营仓   3 工厂仓   4 虚拟仓    5 虚拟在途仓
        // 先判断起始仓库是否为工厂仓
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [{
                    name: 'custrecord_dps_financia_warehous',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 财务分仓 类型
            ]
        }).run().each(function (rec) {
            flagLocation = rec.getValue({
                name: 'custrecord_dps_financia_warehous',
                join: 'custrecord_dps_shipping_rec_location'
            });
        });

        if (flagLocation == 3) { // 属于财务分仓属于 工厂仓

            log.debug('发出仓库属于工厂仓', "直接退出, 不推送WMS")
            return;
        }

        var rec_transport = af_rec.getValue('custrecord_dps_shipping_rec_transport');
        var shippingType;

        if (rec_transport == 1) {
            shippingType = 10;
        } else if (rec_transport == 3) {
            shippingType = 30;
        } else {
            shippingType = 20;
        }


        var message = {};
        // 获取token
        // var token = getToken();

        var token = getToken();
        if (token) {
            var data = {};
            var tranType, fbaAccount, logisticsFlag = 0;

            var ful_to_link;
            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [
                    'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                    'custrecord_dps_shipping_rec_transport',
                    'custrecord_dps_shipping_rec_order_num', // 调拨单号
                    {
                        name: 'tranid',
                        join: 'custrecord_dps_shipping_rec_order_num'
                    },
                    // 'owner',
                    'custrecord_dps_shipping_rec_currency',
                    'custrecord_dps_declared_value_dh',
                    'custrecord_dps_shipping_rec_account',
                    'custrecord_dps_shipping_r_channelservice',
                    'custrecord_dps_shipping_r_channel_dealer',
                    'custrecord_dps_shipping_rec_shipments',
                    'custrecord_dps_shipping_rec_location',
                    'custrecord_dps_shipping_rec_to_location',
                    'custrecord_dps_shipping_rec_transa_subje',
                    'custrecord_dps_shipping_rec_logistics_no',
                    'custrecord_dps_f_b_purpose', // 用途
                    'custrecord_dps_declare_currency_dh', // 申报币种
                    'custrecord_dps_shipping_rec_shipmentsid', // shipmentId
                    "custrecord_dps_shipping_rec_destinationf", // 仓库中心编号

                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 仓库编号
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_location'
                    }, // 仓库名称
                    {
                        name: 'custrecord_dps_wms_location',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    }, // 目标仓库编号
                    {
                        name: 'custrecord_dps_wms_location_name',
                        join: 'custrecord_dps_shipping_rec_to_location'
                    }, // 目标仓库名称
                    {
                        name: 'custrecord_ls_service_code',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 渠道服务代码
                    {
                        name: 'custrecord_ls_is_face',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 渠道服务存在面单文件

                    {
                        name: 'custrecord_ls_bubble_count',
                        join: 'custrecord_dps_shipping_r_channelservice'
                    }, // 计泡基数
                    {
                        name: "entityid",
                        join: "owner"
                    }, // 拥有者

                    {
                        name: 'custrecord_aio_marketplace',
                        join: 'custrecord_dps_shipping_rec_account'
                    }, // 站点 / 市场
                    {
                        name: 'custrecord_dps_ship_remark'
                    }, // 备注
                ]
            }).run().each(function (rec) {

                ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
                var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

                if (rec_transport == 1) {
                    shippingType = 10;
                } else if (rec_transport == 3) {
                    shippingType = 30;
                } else {
                    shippingType = 20;
                }

                data["shippingType"] = shippingType;
                data["aono"] = rec.getValue({
                    name: 'tranid',
                    join: 'custrecord_dps_shipping_rec_order_num'
                });
                data["createBy"] = rec.getValue({
                    name: "entityid",
                    join: "owner"
                });

                data["marketplaces"] = rec.getText({
                    name: 'custrecord_aio_marketplace',
                    join: 'custrecord_dps_shipping_rec_account'
                });
                data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

                data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));
                fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
                data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

                data["countBubbleBase"] = Number(rec.getValue({
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }));
                data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
                data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
                data["logisticsLabelPath"] = 'logisticsLabelPath';

                data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

                logisticsFlag = rec.getValue({
                    name: 'custrecord_ls_is_face',
                    join: 'custrecord_dps_shipping_r_channelservice'
                })

                if (logisticsFlag) {
                    data["logisticsFlag"] = 1;
                } else {
                    data["logisticsFlag"] = 0;
                }
                // logisticsFlag (integer): 是否需要物流面单 0:否 1:是 

                data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

                data["sourceWarehouseCode"] = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                });
                data["sourceWarehouseName"] = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                });

                data["targetWarehouseCode"] = rec.getValue({
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                data["targetWarehouseName"] = rec.getValue({
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                });
                data["taxFlag"] = 1;
                data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

                var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
                var b = a.split(':');
                data["tradeCompanyName"] = b[b.length - 1];
                // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

                var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

                tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

                var type = 10;
                // 1 FBA调拨         2 自营仓调拨             3 跨仓调拨            4 移库

                var waybillNo;

                if (type1 == 1) {
                    type = 20;
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                } else {
                    data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                    waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
                }
                data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
                data["type"] = type;
                data["remark"] = rec.getValue('custrecord_dps_ship_remark'); // 备注字段
                data["waybillNo"] = waybillNo; // 运单号
            });

            var createdBy;
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: ful_to_link
                }],
                columns: [
                    "createdby"
                ]
            }).run().each(function (rec) {
                createdBy = rec.getText('createdby');
            });

            data["createBy"] = createdBy; // 设置调拨单创建者

            var taxamount;
            var item_info = [];
            var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
            // var numLines = af_rec.getLineCount({
            //     sublistId: subli_id
            // });


            var itemArr = [];
            var ful_limit = 3999;
            search.create({
                type: 'customrecord_dps_shipping_record_item',
                filters: [{
                    name: 'custrecord_dps_shipping_record_parentrec',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [{
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_msku'
                    },
                    {
                        name: 'custrecord_dps_f_b_purpose',
                        join: 'custrecord_dps_shipping_record_parentrec'
                    },
                    {
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_fnsku'
                    },
                    {
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'itemid',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    {
                        name: 'custrecord_dps_ship_record_sku_item'
                    },
                    {
                        name: 'custrecord_dps_ship_record_item_quantity'
                    },

                    {
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品重量(cm),
                    {
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品高(cm),
                    {
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品长(cm),
                    {
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品宽(cm),
                    {
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 品牌名称,
                    {
                        name: 'custitem_dps_declaration_us',
                        join: 'custrecord_dps_shipping_record_item'
                    }, // 产品英文标题,

                    {
                        name: 'custitem_dps_use',
                        join: 'custrecord_dps_shipping_record_item'
                    },
                    'custrecord_dps_shipping_record_item', // 货品
                    'custrecord_dps_ship_record_sku_item', //seller sku
                    // {
                    //     name: 'taxamount',
                    //     join: 'custrecord_dps_trans_order_link'
                    // }

                    {
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 材质  material
                    {
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 物流分组 logisticsGroup
                    {
                        name: "cost",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 采购成本  purchaseCost
                    {
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }, // 英文标题/描述 englishTitle
                ]
            }).run().each(function (rec) {

                itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
                var purchaseCost = rec.getValue({
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                });

                var it = {
                    englishTitle: rec.getValue({
                        name: "custitem_dps_skuenglish",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    purchaseCost: Number(purchaseCost),
                    logisticsGroup: rec.getText({
                        name: "custitem_dps_group",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    material: rec.getText({
                        name: "custitem_dps_nature",
                        join: "custrecord_dps_shipping_record_item"
                    }),
                    itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                    purpose: rec.getValue({
                        name: 'custitem_dps_use',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    brandName: rec.getText({
                        name: 'custitem_dps_brand',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    asin: rec.getValue({
                        name: 'custitem_aio_asin',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    fnsku: rec.getValue({
                        join: 'custrecord_dps_shipping_record_item',
                        name: 'custitem_dps_fnsku'
                    }),

                    msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                    englishTitle: rec.getValue({
                        name: 'custitem_dps_declaration_us',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    productImageUrl: rec.getValue({
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    }) ? rec.getValue({
                        name: 'custitem_dps_picture',
                        join: 'custrecord_dps_shipping_record_item'
                    }) : 'productImageUrl',
                    productTitle: rec.getValue({
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    }) ? rec.getValue({
                        name: 'custitem_dps_skuchiense',
                        join: 'custrecord_dps_shipping_record_item'
                    }) : productTitle,
                    productHeight: Number(rec.getValue({
                        name: 'custitem_dps_high',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productLength: Number(rec.getValue({
                        name: 'custitem_dps_long',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    productWeight: Number(rec.getValue({
                        name: 'custitem_dps_heavy2',
                        join: 'custrecord_dps_shipping_record_item'
                    })),
                    productWidth: Number(rec.getValue({
                        name: 'custitem_dps_wide',
                        join: 'custrecord_dps_shipping_record_item'
                    })),

                    sku: rec.getValue({
                        name: 'itemid',
                        join: 'custrecord_dps_shipping_record_item'
                    }),
                    qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
                };
                taxamount = rec.getValue({
                    name: 'taxamount',
                    join: 'custrecord_dps_trans_order_link'
                });
                item_info.push(it);

                return --ful_limit > 0;
            });

            log.debug('itemArr', itemArr);
            // 2020/7/18 13：44 改动 
            var fils = [],
                add_fils = []; //过滤
            var len = item_info.length,
                num = 0;
            item_info.map(function (ld) {
                num++;
                add_fils.push([
                    ["name", "is", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
                if (num < len)
                    add_fils.push("or");
            });
            fils.push(add_fils);
            fils.push("and",
                ["custrecord_ass_account", "anyof", fbaAccount]
            );
            fils.push("and",
                ["isinactive", "is", false]
            );
            log.debug('fils', fils);
            log.audit('item_info', item_info);
            var newItemInfo = [];

            if (tranType == 1) {
                var new_limit = 3999;
                var fls_skus = [];
                search.create({
                    type: 'customrecord_aio_amazon_seller_sku',
                    filters: fils,
                    columns: [
                        "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                    ]
                }).run().each(function (rec) {

                    var it = rec.getValue('custrecord_ass_sku');
                    item_info.forEach(function (item, key) {
                        if (item.itemId == it && fls_skus.indexOf(it) == -1) {
                            item.asin = rec.getValue("custrecord_ass_asin");
                            item.fnsku = rec.getValue("custrecord_ass_fnsku");
                            item.msku = rec.getValue('name');
                            newItemInfo.push(item);
                            fls_skus.push(it);
                        }
                    });
                    return --new_limit > 0;
                });
                log.debug('newItemInfo', newItemInfo);

                if (newItemInfo && newItemInfo.length == 0) {

                    message.code = 3;
                    message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                    // var id = record.submitFields({
                    //     type: 'customrecord_dps_shipping_record',
                    //     id: context.recordID,
                    //     values: {
                    //         custrecord_dps_shipping_rec_status: 8,
                    //         custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    //     }
                    // });

                    return message;
                }


                var getPoObj = searchToLinkPO(itemArr, ful_to_link)

                newItemInfo.map(function (newItem) {
                    var itemId = newItem.itemId;
                    newItem.pono = getPoObj[itemId]
                });

                data['allocationDetailCreateRequestDtos'] = newItemInfo;
            } else {
                data['allocationDetailCreateRequestDtos'] = item_info;
            }

            log.audit('newItemInfo', newItemInfo);

            if (Number(taxamount) > 0) {
                data["taxFlag"] = 1;
            } else {
                data["taxFlag"] = 0;
            }


            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(af_rec.id, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0) {

                message.code = 3;
                message.data = juArr + ': Amazon Seller SKU 中找不到对应的映射关系';

                // var id = record.submitFields({
                //     type: 'customrecord_dps_shipping_record',
                //     id: af_rec.id,
                //     values: {
                //         custrecord_dps_shipping_rec_status: 8,
                //         custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                //     }
                // });

                return message;
            }

            // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
            // tool.wmsInfo(af_rec.id, data, 1, '创建调拨单');
            // 发送请求
            // message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }

        log.debug('message', message);
        var flag;
        if (message.data.code == 0) {
            flag = 14;
        } else {
            flag = 8;
        }

        // var id = record.submitFields({
        //     type: 'customrecord_dps_shipping_record',
        //     id: af_rec.id,
        //     values: {
        //         custrecord_dps_shipping_rec_status: flag,
        //         custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
        //     }
        // });

    }


    /**
     * 搜索调拨单关联的采购订单
     * @param {Array} itemArr 
     * @param {Number} toId 
     */
    function searchToLinkPO(itemArr, toId) {

        log.error('itemArr', itemArr);
        log.error('toId', toId);
        var limit = 3999;
        var getInfo = [];
        var getPO = {};
        var poNo = '';
        search.create({
            type: "customrecord_transfer_order_details",
            filters: [{
                    join: "custrecord_transfer_code",
                    name: "item",
                    operator: "anyof",
                    values: itemArr
                },
                {
                    name: "custrecord_transfer_code",
                    operator: "anyof",
                    values: [toId]
                }
            ],
            columns: [{
                    name: "custrecord__realted_transfer_head",
                    summary: "GROUP"
                }, // 采购订单
                {
                    join: "CUSTRECORD_TRANSFER_CODE",
                    name: "item",
                    summary: "GROUP"
                } // 货品
            ]
        }).run().each(function (rec) {
            var item_code = rec.getValue({
                join: "CUSTRECORD_TRANSFER_CODE",
                name: "item",
                summary: "GROUP"
            });
            var tra_hea = rec.getText({
                name: "custrecord__realted_transfer_head",
                summary: "GROUP"
            });

            log.error('tra_hea', tra_hea);

            var a = tra_hea.split(':');
            var b = '';
            if (a && a.length >= 2) {
                b = a[1];
            }
            getPO[item_code] = b;
            return --limit > 0;

        });

        return getPO;
    }


    /**
     * 搜索关联的调拨单的 PO的货品信息
     * @param {*} tranId 
     */
    function searchPOItem(tranId) {

        var itemInfo = [],
            transfer_head = [],
            poArr = [],
            limit1 = 3999,
            limit2 = 3999;

        search.create({
            type: 'customrecord_realted_transfer_head',
            filters: [{
                name: "custrecord_transfer_code",
                join: "custrecord__realted_transfer_head",
                operator: 'anyof',
                values: tranId,
            }],
            columns: [{
                    name: 'custrecord_transfer_quantity',
                    join: 'custrecord__realted_transfer_head'
                }, // 数量
            ]
        }).run().each(function (rec) {

            log.debug('rec id', rec.id);

            var qty = rec.getValue({
                name: 'custrecord_transfer_quantity',
                join: 'custrecord__realted_transfer_head'
            });

            var it = {
                qty: qty,
                toHId: rec.id
            };

            poArr.push(it);

            transfer_head.push(rec.id);

            log.debug('transfer_head', transfer_head);

            flag = true;
            return --limit1 > 0;

        });

        if (transfer_head.length > 0) {
            search.create({
                type: 'purchaseorder',
                filters: [{
                        name: 'mainline',
                        operator: 'is',
                        values: false
                    },
                    {
                        name: 'taxline',
                        operator: 'is',
                        values: false
                    },
                    {
                        name: 'custcol_realted_transfer_detail',
                        operator: 'anyof',
                        values: transfer_head
                    }
                ],
                columns: [ // taxamount 总量 = 数量 X 单价 X 税率
                    'rate', 'item', 'quantity', "taxamount", "custcol_realted_transfer_detail", 'entity',
                    {
                        name: 'custitem_dps_declaration_cn',
                        join: 'item'
                    },
                    {
                        name: 'custitem_dps_brand',
                        join: 'item'
                    },
                    {
                        name: 'custitem_dps_unit',
                        join: 'item'
                    },
                    {
                        name: 'custitem_dps_declare',
                        join: 'item'
                    },
                    {
                        name: 'custitem_dps_customs_code',
                        join: 'item'
                    },
                    {
                        name: 'custentity_dps_placeofsupply',
                        join: 'vendor'
                    }, // 供应商 货源地
                    {
                        name: "custentity_vendor_code",
                        join: 'vendor'
                    }, // 供应商编码
                    {
                        name: "entityid",
                        join: 'vendor'
                    }, // 供应商名称
                    {
                        name: 'custentity_dps_buyer',
                        join: 'vendor'
                    }, // 供应商 采购员
                ]
            }).run().each(function (rec) {

                var transfer_detail = rec.getValue('custcol_realted_transfer_detail');
                var qty = 1;
                for (var i = 0, len = poArr.length; i < len; i++) {
                    var temp = poArr[i];
                    if (temp.toHId == transfer_detail) {
                        qty = temp.qty;
                        break;
                    }
                }

                var temp_taxAmt = rec.getValue('taxamount');
                var tem_tax = 0;
                if (temp_taxAmt) { // 获取到的 taxamount 为负, 取绝对值, 且为总和, 需要除以数量
                    tem_tax = Math.abs(temp_taxAmt / rec.getValue('quantity'))
                }

                var it = {
                    name: rec.getValue({
                        name: 'custitem_dps_declaration_cn',
                        join: 'item'
                    }),
                    taxamount: tem_tax,
                    buyer: rec.getValue({
                        name: 'custentity_dps_buyer',
                        join: 'vendor'
                    }),
                    vendorId: rec.getValue({
                        name: "entityid",
                        join: 'vendor'
                    }),
                    vendorCode: rec.getValue({
                        name: "custentity_vendor_code",
                        join: 'vendor'
                    }),
                    placeofsupply: rec.getValue({
                        name: 'custentity_dps_placeofsupply',
                        join: 'vendor'
                    }),
                    itemId: rec.getValue('item'),
                    rate: rec.getValue('rate'),
                    qty: qty,
                    declaration: rec.getValue({
                        name: 'custitem_dps_declaration_cn',
                        join: 'item'
                    }),
                    brand: rec.getText({
                        name: 'custitem_dps_brand',
                        join: 'item'
                    }),
                    unit: rec.getValue({
                        name: 'custitem_dps_unit',
                        join: 'item'
                    }),
                    declare: rec.getValue({
                        name: 'custitem_dps_declare',
                        join: 'item'
                    }),
                    code: rec.getValue({
                        name: 'custitem_dps_customs_code',
                        join: 'item'
                    })
                };

                itemInfo.push(it);

                return --limit2 > 0;
            });
        }

        return itemInfo.length > 0 ? itemInfo : false;
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
     * 判断获取到的货品信息是否完全
     * @param {Number} recId 
     * @param {Array} judArr 
     */
    function judgmentFlag(recId, judArr) {

        var limit = 3999,
            fulArr = [];
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                // 发运记录的货品
                name: 'custrecord_dps_shipping_record_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            }]
        }).run().each(function (rec) {

            var it = rec.getText({
                name: 'custrecord_dps_shipping_record_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            })
            fulArr.push(it);

            return --limit > 0;
        });


        var itemIdArr = [];
        judArr.map(function (jud) {
            var itemId = jud.sku;
            itemIdArr.push(itemId);
        });


        var diffArr = diff(itemIdArr, fulArr);

        return diffArr;
    }



    /**
     * 获取两个数组的差异值
     * @param {Array} arr1 数组1
     * @param {Array} arr2 数组2
     */
    function diff(arr1, arr2) {
        var newArr = [];
        var arr3 = [];
        for (var i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) === -1)
                arr3.push(arr1[i]);
        }
        var arr4 = [];
        for (var j = 0; j < arr2.length; j++) {
            if (arr1.indexOf(arr2[j]) === -1)
                arr4.push(arr2[j]);
        }
        newArr = arr3.concat(arr4);
        return newArr;
    }


    return {
        onRequest: onRequest
    }
});





var a = [{
        id: 1,
        name: 'LI'
    },
    {
        id: 2,
        name: 'CAN'
    }
]