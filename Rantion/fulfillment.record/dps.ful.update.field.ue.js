/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-30 15:27:22
 * @LastEditTime   : 2020-08-03 19:22:28
 * @LastEditors    : Li
 * @Description    : 应用于发运记录-大包, 用于更新库存转移订单某些字段数据
 * @FilePath       : \Rantion\fulfillment.record\dps.ful.update.field.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/log', '../Helper/tool.li', '../Helper/config',
    'N/http', 'N/redirect', 'N/ui/serverWidget', 'N/runtime'
], function (record, search, log, tool, config, http, redirect, serverWidget, runtime) {

    function beforeLoad(context) {

        try {

            var userObj = runtime.getCurrentUser();

            var actionType = context.type;
            log.debug('actionType', actionType);
            log.debug('runtime.executionContext', runtime.executionContext);
            if (actionType == "edit" && userObj.role != 3 && runtime.executionContext == "USERINTERFACE") {
                var aono, rec_status;
                search.create({
                    type: context.newRecord.type,
                    filters: [{
                        name: "internalid",
                        operator: 'anyof',
                        values: context.newRecord.id
                    }],
                    columns: [{
                            name: "tranid",
                            join: "custrecord_dps_shipping_rec_order_num"
                        }, // 调拨单号
                        {
                            name: 'custrecord_dps_shipping_rec_status', // 状态
                        }
                    ]
                }).run().each(function (r) {
                    aono = r.getValue({
                        name: "tranid",
                        join: "custrecord_dps_shipping_rec_order_num"
                    })
                    rec_status = Number(r.getValue({
                        name: 'custrecord_dps_shipping_rec_status'
                    }));
                });

                var statusArr = [6, 7, 12, 13, 19, 20, 22, 23, 24, 25, 26, 28];


                // log.audit('statusArr.indexOf(rec_status)', statusArr.indexOf(Number(rec_status)))
                log.debug('发运记录状态', rec_status);
                log.debug('发运记录 aono', aono);
                if (rec_status == 14) { // 只有已经推送 WMS, 才需要查询
                    var token = getToken();
                    if (token) {
                        log.debug('授权秘钥存在', '授权秘钥存在')
                        var headerObj = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'access_token': token,
                        };

                        var response = http.get({
                            url: config.WMS_Debugging_URL + "/allocationMaster/getAllocationMaster" + "?aono=" + aono,
                            headers: headerObj
                        });

                        log.debug('获取调拨单状态', response);
                        if (response.code == 200) {
                            var body = JSON.parse(response.body);
                            log.debug('返回的参数' + typeof (body), body);
                            if (body.code == 0) {

                                var status = body.data.status;
                                log.audit('WMS 调拨单状态', status)
                                if (status == 10) { // 允许修改

                                    return;
                                } else { // 不允许修改

                                    var field = context.form.addField({
                                        id: 'custpage_abc_text',
                                        type: serverWidget.FieldType.CHECKBOX,
                                        label: '不允许修改发运记录'
                                    });

                                    field.defaultValue = 'T';

                                    return;

                                    redirect.toRecord({
                                        type: context.newRecord.type,
                                        id: context.newRecord.id,
                                    });
                                }
                            }
                        }
                    }

                    // var statusArr = [6, 7, 12, 13, 19, 20, 22, 23, 24, 25, 26, 28];
                } else if (statusArr.indexOf(rec_status) > -1) { // 不允许修改, 直接重定向
                    record.submitFields({
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                        values: {
                            custrecord_dps_update_ful_rec_info: '不允许修改'
                        },
                    });
                    redirect.toRecord({
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    });
                }


            } else if (actionType == "view") {

                var aono, rec_status;
                search.create({
                    type: context.newRecord.type,
                    filters: [{
                        name: "internalid",
                        operator: 'anyof',
                        values: context.newRecord.id
                    }],
                    columns: [{
                            name: "tranid",
                            join: "custrecord_dps_shipping_rec_order_num"
                        }, // 调拨单号
                        {
                            name: 'custrecord_dps_shipping_rec_status', // 状态
                        }
                    ]
                }).run().each(function (r) {
                    aono = r.getValue({
                        name: "tranid",
                        join: "custrecord_dps_shipping_rec_order_num"
                    })
                    rec_status = r.getValue({
                        name: 'custrecord_dps_shipping_rec_status'
                    });
                });

                if (rec_status == 14) {
                    context.form.addButton({
                        id: 'custpage_dps_li_update_info',
                        label: '重新推送WMS更新',
                        functionName: "updateWMS(" + context.newRecord.id + ")"
                    });

                    context.form.clientScriptModulePath = './dps.to.control.field.cs.js';
                }
            }
        } catch (error) {
            log.error('获取状态出错', error);
        }


    }

    function beforeSubmit(context) {

    }

    function afterSubmit(context) {

        try {
            var action = context.type;
            // if (action == "edit") {

            var userObj = runtime.getCurrentUser();

            log.debug('afterSubmit action', action);
            log.debug('afterSubmit runtime.executionContext', runtime.executionContext);
            if (action == "edit" && runtime.executionContext == "USERINTERFACE") {

                log.audit('符合条件, 更改调拨单', "符合条件, 更改调拨单");

                var updateField = {};

                var newRecord = context.newRecord;
                var af_rec = record.load({
                    type: newRecord.type,
                    id: newRecord.id
                });

                var tranLoca, af_rec_status, aono;
                search.create({
                    type: newRecord.type,
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: newRecord.id
                    }],
                    columns: [{
                            name: 'transferlocation',
                            join: "custrecord_dps_shipping_rec_order_num"
                        },
                        {
                            name: 'custrecord_dps_shipping_rec_status', // 状态
                        },
                        {
                            name: "tranid",
                            join: "custrecord_dps_shipping_rec_order_num"
                        }, // 调拨单
                    ]
                }).run().each(function (rec) {
                    tranLoca = rec.getValue({
                        name: 'transferlocation',
                        join: "custrecord_dps_shipping_rec_order_num"
                    });
                    af_rec_status = rec.getValue({
                        name: 'custrecord_dps_shipping_rec_status', // 状态
                    });
                    aono = rec.getValue({
                        name: "tranid",
                        join: "custrecord_dps_shipping_rec_order_num"
                    });
                })
                updateField.transferlocation = tranLoca;
                updateField.location = af_rec.getValue("custrecord_dps_shipping_rec_location");

                var toId = af_rec.getValue('custrecord_dps_shipping_rec_order_num'); // 关联的调拨单

                var fieldKey = Object.keys(fieldMapping);

                var statusArr = [1, 2, 3, 4, 5, 9, 10, 11, 15, 16, 17, 18]

                log.audit('发运记录状态', af_rec_status);
                if (af_rec_status == 14) {
                    fieldKey.map(function (field, key) {
                        var fieldValue = af_rec.getValue(field);
                        updateField[fieldMapping[field]] = fieldValue;
                    });
                } else if (statusArr.indexOf(af_rec_status) > -1) {
                    fieldKey.map(function (field, key) {
                        if (field == "custrecord_dps_to_reference_id") {
                            var fieldValue = af_rec.getValue(field);
                            updateField[fieldMapping[field]] = fieldValue;
                        }
                    });
                }

                log.audit('更新字段的值', updateField);

                var updateToId = record.submitFields({
                    type: 'transferorder',
                    id: toId,
                    values: updateField
                });

                log.audit('更新库存转移订单主体字段', updateToId);

                var recSubId = "recmachcustrecord_dps_shipping_record_parentrec"
                var numLines = af_rec.getLineCount({
                    sublistId: recSubId
                });

                log.audit('numLines', numLines);
                var newItem = [];
                for (var i = 0; i < numLines; i++) {

                    var it = {
                        itemId: af_rec.getSublistValue({
                            sublistId: recSubId,
                            fieldId: 'custrecord_dps_shipping_record_item',
                            line: i
                        }),
                        qty: af_rec.getSublistValue({
                            sublistId: recSubId,
                            fieldId: 'custrecord_dps_ship_record_item_quantity',
                            line: i
                        }),
                        sellerSku: af_rec.getSublistValue({
                            sublistId: recSubId,
                            fieldId: 'custrecord_dps_ship_record_sku_item',
                            line: i
                        }),
                    }
                    newItem.push(it);
                }

                log.audit('新的货品信息', newItem);

                var toRec = record.load({
                    type: 'transferorder',
                    id: toId,
                    isDynamic: true,
                });

                var toNum = toRec.getLineCount({
                    sublistId: 'item'
                });
                var toItemArr = [];
                for (var j = 0; j < toNum; j++) {
                    var it = {
                        itemId: toRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: j
                        }),
                        qty: toRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: j
                        }),
                        sellerSku: toRec.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_aio_amazon_msku',
                            line: j
                        })
                    }
                    toItemArr.push(it);
                }

                var to_itemIdArr = [];
                toItemArr.map(function (jud) {
                    var itemId = jud.itemId;
                    to_itemIdArr.push(itemId);
                });
                var fu_itemIdArr = [];
                newItem.map(function (jud) {
                    var itemId = jud.itemId;
                    fu_itemIdArr.push(itemId);
                });

                var diffArr = tool.checkDifferentArr(to_itemIdArr, fu_itemIdArr)

                log.audit('差异货品', diffArr);
                diffArr.map(function (dif) {
                    if (to_itemIdArr.indexOf(dif) > -1) {
                        log.debug('需要删除货品', dif);

                        var re_line = toRec.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: dif
                        });
                        toRec.removeLine({
                            sublistId: 'item',
                            line: re_line,
                            ignoreRecalc: true
                        });
                    } else {
                        for (var z = 0, z_len = newItem.length; z < z_len; z++) {
                            var temp = newItem[z];
                            if (temp.itemId == dif) { // 找到对应的货品, 新增

                                toRec.selectNewLine({
                                    sublistId: 'item'
                                });
                                toRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: dif,
                                    ignoreFieldChange: true
                                });
                                toRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: temp.qty,
                                    ignoreFieldChange: true
                                });
                                toRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_aio_amazon_msku',
                                    value: temp.sellerSku,
                                    ignoreFieldChange: true
                                });
                                toRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'rate',
                                    value: 0,
                                    ignoreFieldChange: true
                                });
                                toRec.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value: 0,
                                    ignoreFieldChange: true
                                });

                                toRec.commitLine({
                                    sublistId: 'item'
                                });
                            }
                        }

                        log.debug('需要新增货品', dif);
                    }
                });

                var toRec_id = toRec.save();

                log.debug('保存库存转移订单的新增或者删除货品信息', toRec_id)

                var n_toRec = record.load({
                    type: 'transferorder',
                    id: toId,
                });
                newItem.map(function (n_item) {
                    log.debug('n_item.sellerSku', n_item.sellerSku);

                    var find_line = n_toRec.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: n_item.itemId
                    });
                    log.debug('find_line', find_line);
                    if (find_line > -1) {
                        n_toRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_aio_amazon_msku',
                            value: n_item.sellerSku,
                            line: find_line
                        });
                        n_toRec.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: n_item.qty,
                            line: find_line
                        });
                    }
                })

                var n_toRec_id = n_toRec.save();

                log.audit('修改原货品信息', n_toRec_id);


                var userObj = runtime.getCurrentUser();

                var name = userObj.name; // 当前用户



                var retObj = updateToWMS(context.newRecord.id, name, aono);

                record.submitFields({
                    type: context.newRecord.type,
                    id: context.newRecord.id,
                    values: {
                        custrecord_dps_update_ful_rec_info: JSON.stringify(retObj.data)
                    }

                });
                // custrecord_dps_shipping_record_item

            } else {
                log.audit('不更新', '调拨单')
            }

        } catch (error) {
            log.error('获取字段的值出错了', error);
        }


    }


    function updateToWMS(recId, updateName, aono) {
        var itemArr = [];
        var ful_limit = 3999;
        var tranType, data = {};
        var message = {};

        var item_info = [];
        var ful_to_link;

        var fbaAccount;

        data["aono"] = aono;
        data["updateBy"] = updateName;
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: recId
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
                    name: 'custrecord_dps_ship_record_tranor_type',
                    join: 'custrecord_dps_shipping_record_parentrec'
                },
                {
                    name: "custrecord_dps_shipping_rec_order_num",
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

                {
                    name: 'custrecord_dps_shipping_rec_account',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // 店铺
            ]
        }).run().each(function (rec) {

            ful_to_link = rec.getValue({
                name: "custrecord_dps_shipping_rec_order_num",
                join: 'custrecord_dps_shipping_record_parentrec'
            })

            fbaAccount = rec.getValue({
                name: 'custrecord_dps_shipping_rec_account',
                join: 'custrecord_dps_shipping_record_parentrec'
            })
            itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
            var purchaseCost = rec.getValue({
                name: "cost",
                join: "custrecord_dps_shipping_record_item"
            });
            tranType = rec.getValue({
                name: 'custrecord_dps_ship_record_tranor_type',
                join: 'custrecord_dps_shipping_record_parentrec'
            })
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
        log.debug('item_info', item_info);
        var newItemInfo = [];


        log.debug('推送 WMS tranType', tranType);
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
                        item.fnsku = rec.getValue("custrecord_ass_fnsku")
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
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    }
                });

                return message;
            }


            var getPoObj = tool.searchToLinkPO(itemArr, ful_to_link)

            newItemInfo.map(function (newItem) {
                var itemId = newItem.itemId;
                newItem.pono = getPoObj[itemId]
            });

            data['allocationDetailCreateRequestDtos'] = newItemInfo;
        } else {
            data['allocationDetailCreateRequestDtos'] = item_info;
        }

        var code = 0;
        var retdata;

        var token = getToken();

        if (token) {

            var headerInfo = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'access_token': token
            };

            var response = http.post({
                url: config.WMS_Debugging_URL + "/allocationMaster/updateDetail",
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
            }
            message.code = code;
            message.data = retdata;
        } else {
            message.code = 5;
            message.data = "不存在秘钥";
        }

        return message;

    }

    var fieldMapping = { // 库存转移订单 与 发运记录的 字段对应关系
        "custrecord_dps_shipping_rec_location": "custbody_dps_start_location", // 起始仓库
        "custrecord_dps_ship_remark": "custrecord_dps_ship_remark", // 备注
        "custrecord_dps_to_reference_id": "custbody_dps_to_reference_id", // reference id
        "custrecord_dps_to_shipment_name": "custbody_dps_to_shipment_name", // shipment name
        "custrecord_dps_shipping_rec_transport": "custbody_shipment_method", // 运输方式
        "custrecord_dps_ns_upload_packing_informa": "custbody_dps_ns_upload_packing_informa", // 设置 NS 是否上传装箱信息, 获取箱唛
        "custrecord_dps_ship_record_tranor_type": "custbody_dps_transferor_type", // 调拨单类型
        "custrecord_dps_shipping_rec_shipmentsid": "custbody_shipment_id", // shipmentId
        "custrecord_dps_shipping_rec_destinationf": "custbody_dps_ama_location_centerid", // 设置仓库中心编码
        "custrecord_dps_shipping_rec_department": "department", // 部门
        "custrecord_dps_shipping_rec_transa_subje": "subsidiary", //子公司
        "custrecord_dps_shipping_rec_to_location": "custbody_actual_target_warehouse", // 目标仓库
        "custrecord_dps_shipping_rec_create_date": "trandate", // 日期
        "custrecord_dps_shipping_rec_account": "custbody_order_locaiton", // 店铺
        "custrecord_dps_shipping_r_channel_dealer": "custbody_dps_transferor_channel_dealer", // 渠道商
        "custrecord_dps_shipping_r_channelservice": "custbody_dps_transferor_channelservice" // 渠道服务
    }


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


    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});