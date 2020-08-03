/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-02 14:27:52
 * @LastEditTime   : 2020-08-02 15:05:52
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.ful.update.field.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/http', 'N/search', 'N/record', 'N/log', 'N/runtime', '../Helper/tool.li',
    '../Helper/config'
], function (http, search, record, log, runtime, tool, config) {


    function _post(context) {

        var retObj = {};
        var recId = context.recordID;

        var token = getToken();
        if (token) {
            log.debug('授权秘钥存在', '授权秘钥存在');
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
                log.debug('请求 WMS, 返回的参数' + typeof (body), body);
                if (body.code == 0) { // 

                    var status = body.data.status;
                    log.audit('WMS 调拨单状态', status)
                    if (status == 10) { // 允许修改

                        var aono;
                        search.create({
                            type: "customrecord_dps_shipping_record",
                            filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: recId
                            }],
                            columns: [{
                                    name: "tranid",
                                    join: "custrecord_dps_shipping_rec_order_num"
                                }, // 调拨单
                            ]
                        }).run().each(function (rec) {
                            aono = rec.getValue({
                                name: "tranid",
                                join: "custrecord_dps_shipping_rec_order_num"
                            })
                        })

                        var userObj = runtime.getCurrentUser();

                        var name = userObj.name; // 当前用户

                        var retObj = updateToWMS(recId, name, aono);

                        record.submitFields({
                            type: "customrecord_dps_shipping_record",
                            id: recId,
                            values: {
                                custrecord_dps_update_ful_rec_info: JSON.stringify(retObj.msg)
                            }
                        });
                        log.audit('调拨单允许修改, 返回参数', retObj)
                        return retObj;
                    } else { // 不允许修改
                        retObj.code = 2;
                        retObj.data = null;
                        retObj.msg = "请联系仓库人员修改wms调拨单状态";

                        record.submitFields({
                            type: "customrecord_dps_shipping_record",
                            id: recId,
                            values: {
                                custrecord_dps_update_ful_rec_info: JSON.stringify(retObj.msg)
                            }
                        });
                        log.audit('调拨单不允许修改, 返回参数 retObj', retObj);

                        return retObj;
                    }
                } else {
                    retObj.code = 2;
                    retObj.data = null;
                    retObj.msg = body.msg;

                    record.submitFields({
                        type: "customrecord_dps_shipping_record",
                        id: recId,
                        values: {
                            custrecord_dps_update_ful_rec_info: JSON.stringify(retObj.msg)
                        }
                    });
                    log.audit('code 不为 0, 返回参数 retObj', retObj);

                    return retObj;
                }
            } else {
                retObj.code = 3;
                retObj.data = null;
                retObj.msg = "访问失败";
                log.audit('请求不成功, 返回参数 retObj', retObj);

                return retObj;
            }
        } else {
            retObj.code = 5;
            retObj.data = null;
            retObj.msg = "访问秘钥不存在";
            log.audit('不存在 token, 返回参数 retObj', retObj);
            return retObj;
        }
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


    function updateToWMS(recId, updateName, aono) {
        var itemArr = [];
        var ful_limit = 3999;
        var tranType, data = {};
        var message = {};

        var item_info = [];

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
                message.msg = 'Amazon Seller SKU 中找不到对应的映射关系';
                message.data = null;
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.msg)
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
            message.data = null;
            message.msg = retdata.msg;
        } else {
            message.code = 5;
            message.data = null;
            message.msg = "不存在秘钥";
        }

        return message;

    }

    return {
        post: _post
    }
});