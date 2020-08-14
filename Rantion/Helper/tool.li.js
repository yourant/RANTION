/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-15 10:09:56
 * @LastEditTime   : 2020-08-14 13:54:36
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\Helper\tool.li.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/search', 'N/record', 'N/log', "N/http", 'N/runtime', 'N/util'], function (search, record, log, http, runtime, util) {



    /**
     * 搜索调拨单关联的采购订单
     * @param {Array} itemArr 
     * @param {Number} toId 
     */
    function searchToLinkPO(itemArr, toId) {

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
     * 保存推送 WMS 的数据
     * @param {Number} linkId 
     * @param {Object} info 
     * @param {String} recType 
     */
    function wmsInfo(linkId, info, recType, event) {

        var recId;
        search.create({
            type: 'customrecord_dps_to_wms_data_info',
            filters: [{
                name: 'custrecord_dps_to_wms_rec_links',
                operator: 'anyof',
                values: linkId
            }]
        }).run().each(function (rec) {
            recId = rec.id;
        });

        var wmsObj;
        if (recId) {
            wmsObj = record.load({
                type: 'customrecord_dps_to_wms_data_info',
                id: recId
            });
        } else {
            wmsObj = record.create({
                type: 'customrecord_dps_to_wms_data_info',
            });
        }

        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_info',
            value: JSON.stringify(info)
        });

        // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_rec_type',
            value: recType
        }); // 单据类型
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_datetime',
            value: new Date().toISOString()
        }); // 推送时间
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_rec_links',
            value: linkId
        }); // 关联的单据
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_event',
            value: event
        }); // 事件

        var wmsObj_id = wmsObj.save();

        log.debug('推送记录信息', wmsObj_id);

        return wmsObj_id || false;

    }


    /**
     * 保存推送 WMS 的数据
     * @param {Number} linkId 
     * @param {Object} info 
     * @param {String} recType 
     */
    function wmsRetInfo(linkId, info, recType, event) {

        /*
        var recId;
        search.create({
            type: 'customrecord_dps_wms_ret_info',
            filters: [{
                name: 'custrecord_dps_wen_ret_links',
                operator: 'is',
                values: linkId
            }]
        }).run().each(function (rec) {
            recId = rec.id;
        });

        var wmsObj;
        if (recId) {
            wmsObj = record.load({
                type: 'customrecord_dps_wms_ret_info',
                id: recId
            });
        } else {
            wmsObj = record.create({
                type: 'customrecord_dps_wms_ret_info',
            });
        }
        */

        var wmsObj = record.create({
            type: 'customrecord_dps_wms_ret_info',
        });

        wmsObj.setValue({
            fieldId: '	custrecord_dps_wms_ret_info',
            value: JSON.stringify(info)
        }); // WMS 回传的数据

        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_ret_rectype',
            value: recType
        }); // 单据类型
        wmsObj.setValue({
            fieldId: 'custrecord_dps_ret_info_date',
            value: new Date().toISOString()
        }); // 回传时间
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wen_ret_links',
            value: linkId
        }); // 关联的单据
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_ret_event',
            value: event
        }); // 事件

        var wmsObj_id = wmsObj.save();

        log.debug('回传数据记录ID', wmsObj_id);

        return wmsObj_id || false;

    }



    /**
     * 获取出入库货品信息
     * @param {Array} detailList 出/入库货品详情
     * @returns {Array} allArr 货品详情数组
     */
    function getAllBinBox(detailList) {
        // add 获取所有库位和箱号
        var allArr = [];
        for (var i_d = 0, i_dLen = detailList.length; i_d < i_dLen; i_d++) {
            var it = detailList[i_d].detailRecordList;
            for (var j_d = 0, j_dLen = it.length; j_d < j_dLen; j_d++) {
                allArr.push(it[j_d]);
            }
        }
        log.debug('allArr', allArr);
        return allArr || false;


        // add 获取所有库位和箱号
        var allArr = [];

        it.map(function (i_d) {
            if (it[i_d]) {
                allArr.push(it[i_d]);
            }
        });
        log.debug('allArr', allArr);
        return allArr || false;
    }

    /**
     * 判断库存或者箱号时候存在
     * @param {String} action  操作的类型 "create" —— 表示 创建;
     * @param {Array} itemArr  货品数组
     * @returns {Array || Boolean} a_arr(库位/箱号 数组) || false
     */
    function judgmentBinBox(action, itemArr) {
        var itemObj = SummaryBinBox(itemArr);
        var boxObj = itemObj.BoxObj,
            binObj = itemObj.BinObj;
        log.debug('itemObj', itemObj);
        var BoxObjKey = Object.keys(boxObj);

        var BinObjKey = Object.keys(binObj);

        var binType = "customlist_location_bin",
            boxType = "customlist_case_number",
            a_arr = [];
        if (BoxObjKey && BoxObjKey.length > 0) {
            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 箱号动态
                var s_a = searchLocationBin(boxType, BoxObjKey[i]);
                if (!s_a) {
                    if (action == "create") {
                        var boxId = createLocationBin(boxType, BoxObjKey[i]);

                    } else {
                        a_arr.push("箱号" + BoxObjKey[i]);
                    }
                }
            }
        }

        if (BinObjKey && BinObjKey.length > 0) {
            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 库位固定
                var s_a = searchLocationBin(binType, BinObjKey[i]);
                if (!s_a) {
                    a_arr.push("库位：" + BinObjKey[i]);
                }
            }
        }

        return a_arr || false;
    }



    /**
     * 处理出库货品数组, 根据 库位 和 箱号 进行分组
     * @param {Array} itemArr 货币数组
     * @returns {Object} itemObj{BoxObj(箱号对象), BinObj(库位对象)}  || false
     */
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

        var BinObj = {},
            sunBinArr1 = [];
        // 同库位合并
        for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {
            var sunBinArr = [];
            var bin_temp = BinArr[i_bin];

            if (BinObj[bin_temp.positionCode]) {
                sunBinArr = BinObj[bin_temp.positionCode]
            }
            sunBinArr.push(bin_temp);
            for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {
                var j_bin_temp = BinArr[j_bin];
                if (bin_temp.positionCode == j_bin_temp.positionCode) {
                    sunBinArr.push(j_bin_temp);

                }
            }
            BinObj[bin_temp.positionCode] = sunBinArr;
        }

        var BoxObj = {},
            sunBoxArr1 = [];
        // 同箱号合并
        for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
            var box_temp = BoxArr[i_box];
            var sunBoxArr = [];
            if (BoxObj[box_temp.barcode]) {
                sunBinArr = BoxObj[bin_temp.positionCode]
            }
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

        return itemObj || false;

    }

    /**
     * 搜索库存对应的列表, 通过库存(箱号)名称, 获取库位ID
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function searchLocationBin(listType, BinName) {

        var BinId;
        search.create({
            type: listType,
            filters: [{
                    name: 'name',
                    operator: 'is',
                    values: BinName
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }, // 排除已经非活动的记录
            ]
        }).run().each(function (rec) {
            BinId = rec.id
        });
        return BinId || false;
    }

    /**
     * 创建对应的列表记录
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称 || 箱号
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function createLocationBin(listType, BinName) {

        var BinId;
        var bin = record.create({
            type: listType
        });
        bin.setValue({
            fieldId: 'name',
            value: BinName
        });
        BinId = bin.save();
        log.debug('BinId', BinId);
        return BinId || false;
    }


    /**
     * 生成销售订单的货品履行单
     * @param {Number} recId  记录ID
     */
    function createItemFulfillment(recId) {
        var f = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: recId
        });
        f.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });
        var fId = f.save();
        return fId || false;
    }

    /**
     * 生成销售订单的发票
     * @param {Number} recId 
     */
    function createInvoice(recId) {
        var invId;
        var inv = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.INVOICE,
            fromId: recId
        });
        invId = inv.save();
        return invId || false;
    }


    /**
     * 搜索对应的事务处理类型, 返货货品的 内部ID 和 货品名称
     * @param {String} recType 记录类型
     * @param {Number} recId 记录ID
     * @returns {*} itemArr(货品信息数组) || false
     */
    function searchTransactionItemInfo(recType, recId) {
        var limit = 3999,
            itemArr = [],
            item_temp, quantity_temp;

        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [recId]
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
            columns: [
                "item", "quantity"
            ]
        }).run().each(function (rec) {

            if (recType == "transferorder") {

                var item_id = rec.getValue('item'),
                    item_name = rec.getText('item'),
                    item_quantity = rec.getValue('quantity');
                if (item_id && item_name) {
                    if (item_temp != item_id && quantity_temp != item_quantity) {
                        var it = {
                            itemId: item_id,
                            itemName: item_name,
                            itemQty: Math.abs(item_quantity)
                        }
                        itemArr.push(it);
                    }
                    item_temp = item_id;
                    quantity_temp = item_quantity;
                }

            } else {
                var it = {
                    itemId: rec.getValue('item'),
                    itemName: rec.getText('item'),
                    itemQty: rec.getValue('quantity')
                }
                itemArr.push(it);
            }
            return --limit > 0;
        });

        return itemArr || false;
    }
    /**
     * 搜索对应的事务处理类型, 返货货品的 内部ID 和 货品名称
     * @param {String} recType 记录类型
     * @param {Number} recId 记录ID
     * @returns {*} itemObj {货品名称:货品ID} (货品信息对象) || false
     */
    function searchTransactionItemObj(recType, recId) {
        var limit = 3999,
            itemObj = {},
            item_temp, quantity_temp;

        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [recId]
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
            columns: [
                "item", "quantity"
            ]
        }).run().each(function (rec) {

            if (recType == "transferorder") { // 库存转移订单会出现多行重复项

                var item_id = rec.getValue('item'),

                    item_name = rec.getText('item'),
                    item_quantity = rec.getValue('quantity');
                if (item_id && item_name) {
                    if (item_temp != item_id && quantity_temp != item_quantity) {
                        itemObj[rec.getText('item')] = rec.getValue('item');
                    }
                    item_temp = item_id;
                    quantity_temp = item_quantity;
                }

            } else {
                itemObj[rec.getText('item')] = rec.getValue('item');
            }
            return --limit > 0;
        });

        return itemObj || false;
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


        var diffArr = checkDifferentArr(itemIdArr, fulArr);

        return diffArr;
    }



    /**
     * 获取两个数组的差异值
     * @param {Array} arr1 数组1
     * @param {Array} arr2 数组2
     */
    function checkDifferentArr(arr1, arr2) {
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
    function sendRequest(token, data, url) {
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
            url: url,
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

    /**
     * 获取发运记录的信息
     * @param {*} recId 
     */
    function getInfo(recId) {

        var itemArr = [],
            itemObj = {},
            boxArr = [];
        var limit1 = 3999,
            limit2 = 3999;
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_shipping_record_parentrec"
                }, // 店铺
                "custrecord_dps_shipping_record_item", // 货品
                "custrecord_dps_ship_record_item_quantity", // 数量
                "custrecord_dps_ship_record_sku_item", // seller SKU
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 货品中文标题
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 长
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 宽
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 高
                {
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 每箱数量
                {
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱重量(G)
                {
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_shipping_record_item'
                }, // SKU英文标题
                {
                    name: 'averagecost',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 平均成本
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 品牌
                {
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 物流分组
                {
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品材质
                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 用途
                {
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱长
                {
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱高
                {
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱宽
            ]
        }).run().each(function (rec) {

            var it = {
                account: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_shipping_record_parentrec"
                }),
                itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                itemName: rec.getText('custrecord_dps_shipping_record_item'),
                qty: rec.getValue('custrecord_dps_ship_record_item_quantity'),
                sellersku: rec.getValue('custrecord_dps_ship_record_sku_item'),
                titel: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                long: rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                width: rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                high: rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                mpq: rec.getValue({
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                packing_weight: rec.getValue({
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                englishTitle: rec.getValue({
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                averagecost: rec.getValue({
                    name: 'averagecost',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                brand: rec.getValue({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                logisticsGroup: rec.getText({
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                material: rec.getValue({
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_long: rec.getValue({
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_high: rec.getValue({
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_wide: rec.getValue({
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_shipping_record_item'
                })
            }
            itemArr.push(rec.id);
            boxArr.push(it);
            return --limit1 > 0;
        });

        log.debug('货品信息 boxArr', boxArr);


        if (boxArr[0].account) {

            var fil = [];

            fil.push([
                'custrecord_ass_account', 'anyof', boxArr[0].account
            ]);
            fil.push("and");
            var add_fils = [],
                num = 0,
                len = boxArr.length;
            boxArr.map(function (ld) {
                num++;
                if (ld.sellersku) { // 存在 msku
                    add_fils.push([
                        ["name", "is", ld.sellersku],
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
            fil.push(add_fils);
            fil.push("and");
            fil.push([
                "isinactive", "is", false
            ])
            // fil.push("and");
            // fil.push([
            //     "custrecord_ass_asin", "isnotempty", []
            // ]);

            log.audit('搜索条件', fil);
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fil,
                columns: [
                    "custrecord_ass_sku", // 货品
                    "custrecord_ass_asin", // ASIN
                    "custrecord_ass_fnsku", // fnsku
                ]

            }).run().each(function (rec) {
                var itemId = rec.getValue('custrecord_ass_sku');
                var asin = rec.getValue('custrecord_ass_asin');
                var fnsku = rec.getValue('custrecord_ass_fnsku');
                itemObj[itemId] = {
                    asin: asin,
                    fnsku: fnsku
                }
            });

            log.debug('搜索货品 itemObj', itemObj)

            boxArr.map(function (box) {
                box.asin = itemObj[box.itemId].asin
                box.fnsku = itemObj[box.itemId].fnsku
            });
        }

        return boxArr;
    }

    /**
     * 获取发运记录的装箱信息
     * @param {*} recId 
     */
    function getBoxInfo(recId) {

        var data = {};

        var itemArr = [],
            itemObj = {},
            boxArr = [];
        var limit1 = 3999,
            limit2 = 3999;
        search.create({
            type: 'customrecord_dps_shipping_record_box',
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }],
            columns: [
                "custrecord_dps_ship_box_box_number", // 箱号
                "custrecord_dps_ship_box_item", // 货品
                "custrecord_dps_ship_box_quantity", // 数量
                "custrecord_dps_ship_box_sku", // seller SKU
                "custrecord_dps_ship_box_weight", // 装箱重量
                "custrecord_dps_ful_rec_box_length", // 箱长
                "custrecord_dps_ful_rec_big_box_width", // 箱宽
                "custrecord_dps_ful_rec_big_box_hight", // 箱高
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }, // 货品中文标题

                {
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                }, // 每箱数量
                {
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱重量(G)
                {
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }, // SKU英文标题
                {
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }, // 平均成本
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }, // 品牌
                {
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }, // 物流分组
                {
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品材质
                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }, // 用途
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品图片
                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品重
            ]
        }).run().each(function (rec) {

            var it = {
                recId: recId,
                boxNo: rec.getValue('custrecord_dps_ship_box_box_number'),
                itemId: rec.getValue('custrecord_dps_ship_box_item'),
                sku: rec.getText('custrecord_dps_ship_box_item'),
                qty: rec.getValue('custrecord_dps_ship_box_quantity'),
                sellersku: rec.getValue('custrecord_dps_ship_box_sku'),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }),

                mpq: Number(rec.getValue({
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                })),
                packing_weight: rec.getValue({
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }),
                englishTitle: rec.getValue({
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }),
                averagecost: rec.getValue({
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }),
                logisticsGroup: rec.getText({
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }),
                material: rec.getText({
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }),

                box_long: rec.getValue("custrecord_dps_ful_rec_box_length"), // 箱长
                box_high: rec.getValue("custrecord_dps_ful_rec_big_box_hight"), // 箱高
                box_wide: rec.getValue("custrecord_dps_ful_rec_big_box_width"), // 箱宽

                length: rec.getValue("custrecord_dps_ful_rec_box_length"), // 箱长
                height: rec.getValue("custrecord_dps_ful_rec_big_box_hight"), // 箱高
                width: rec.getValue("custrecord_dps_ful_rec_big_box_width"), // 箱宽
                imageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }), // 产品图片

                weight: Number(rec.getValue("custrecord_dps_ship_box_weight"))
            }
            itemArr.push(rec.id);
            boxArr.push(it);
            return --limit1 > 0;
        });

        // log.debug('货品信息 boxArr', boxArr);

        var fil = [];

        if (boxArr[0].account) {

            fil.push([
                'custrecord_ass_account', 'anyof', boxArr[0].account
            ]);
            fil.push("and");
            var add_fils = [],
                num = 0,
                len = boxArr.length;
            boxArr.map(function (ld) {
                num++;
                if (ld.sellersku) { // 存在 msku
                    add_fils.push([
                        ["name", "is", ld.sellersku],
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
            fil.push(add_fils);
            fil.push("and");
            fil.push([
                "isinactive", "is", false
            ]);
            // fil.push("and");
            // fil.push([
            //     "custrecord_ass_asin", "isnotempty", []
            // ]);

            // log.audit('搜索条件', fil)
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fil,
                columns: [
                    "custrecord_ass_sku", // 货品
                    "custrecord_ass_asin", // ASIN
                    "custrecord_ass_fnsku", // fnsku
                ]

            }).run().each(function (rec) {
                var itemId = rec.getValue('custrecord_ass_sku');
                var asin = rec.getValue('custrecord_ass_asin');
                var fnsku = rec.getValue('custrecord_ass_fnsku');
                itemObj[itemId] = {
                    asin: asin,
                    fnsku: fnsku
                }
            });

            // log.debug('搜索货品 itemObj', itemObj)

            if (JSON.stringify(itemObj) != "{}") {
                boxArr.map(function (box) {
                    box.asin = itemObj[box.itemId].asin
                    box.fnsku = itemObj[box.itemId].fnsku
                });
            }
        }

        // log.debug('增加 信息 boxArr', boxArr);

        return boxArr;
    }


    /**
     * 获取装箱信息数据
     * @param {Array} boxInfo 
     */
    function groupBoxInfo(boxInfo) {

        var shipment, shipmentName, shipTo = '',
            aono, centerId, department, referenceId, targetWarehouseName, tradeCompanyName, transport

        var limit = 3999;

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: boxInfo[0].recId
            }],
            columns: [
                "custrecord_dps_to_shipment_name", // shipment name
                "custrecord_dps_shipping_rec_shipmentsid", // shipment
                "custrecord_dps_shipping_rec_destinationf", // centerId
                "custrecord_dps_to_reference_id", // referenceId
                "custrecord_dps_shipping_rec_to_location", // location
                "custrecord_dps_shipping_rec_transa_subje", // 交易主体

                "custrecord_dps_shipping_rec_transport", // 运输方式

                {
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 调拨单号
                {
                    name: "department",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 部门

            ]
        }).run().each(function (rec) {
            transport = rec.getValue("custrecord_dps_shipping_rec_transport");
            targetWarehouseName = rec.getText('custrecord_dps_shipping_rec_to_location');
            tradeCompanyName = rec.getText('custrecord_dps_shipping_rec_transa_subje').split(":").slice(-1)[0].trim();
            shipment = rec.getValue('custrecord_dps_shipping_rec_shipmentsid'); // shipment
            shipmentName = rec.getValue('custrecord_dps_to_shipment_name'); // shipment
            centerId = rec.getValue('custrecord_dps_shipping_rec_destinationf'); // centerId

            referenceId = rec.getValue('custrecord_dps_to_reference_id');
            aono = rec.getValue({
                name: "tranid",
                join: "custrecord_dps_shipping_rec_order_num"
            }); // aono

            department = rec.getText({
                name: "department",
                join: "custrecord_dps_shipping_rec_order_num"
            });

            return --limit > 0;
        });

        var country = '';

        if (centerId) {
            var te = searchCenterIdInfo(centerId);
            country = te.country;
            shipTo = te.recipien + ',' + te.addr1 + ',' + te.city + ',' + te.state + ',' + te.postcode + ',' + te.country + "(" + te.centerId + ')'
        }

        var data = {};

        data.aono = aono; //(string, optional): aono,
        data.boxNum = 1; //(integer, optional): 总箱数,
        data.centerId = centerId; //(string, optional): centerId,
        data.country = country; //(string, optional): 收件人国家,
        data.department = department; //(string, optional): 事业部,
        data.dlogisticsChannelName = ""; //(string, optional): 渠道服务,
        data.referenceId = referenceId; //(string, optional): referenceId,
        data.shipTo = shipTo; //(string, optional): shipTo,
        data.shipment = shipment; //(string, optional): shipment,
        data.shipmentName = shipmentName; //(string, optional): shipmentName,

        data.targetWarehouseName = targetWarehouseName; //(string, optional): 目标仓库名称,
        data.tradeCompanyName = tradeCompanyName; //(string, optional): 交易主体名称

        var boxNo = 0;
        var newBoxArr = [],
            sea_box_info_arr = [],
            air_box_info_arr = [];
        boxInfo.map(function (box) {
            var temp = box;
            var it = JSON.stringify(temp);
            var qty = temp.qty;
            var mpq = temp.mpq;
            var a = parseInt(qty / mpq);
            // for (var j = 0; j < a; j++) {
            var get = JSON.parse(it);
            ++boxNo;

            if (a > 0) {
                get.boxqty = mpq; // 每箱数量

            } else {

                get.boxqty = qty; // 每箱数量
            }

            var temp_boxNo = '000' + boxNo
            get.boxNo = temp_boxNo.substring(temp_boxNo.length - 3); // 箱号
            get.boxNum = 1;
            if (get.asin) {
                get.productLink = "http://www.amazon.com/gp/product/" + get.asin; // 产品链接
            }
            get.sumQty = get.qty; // 总数量
            get.isSpellBox = "否"; // 是否拼箱
            get.purchaseCost = get.averagecost; // 加权
            get.sumChargeWeight = ((get.length * get.height * get.width) / 6000).toString(); // 总体积重
            get.volume = ((get.length * get.height * get.width) / 1000000).toString(); // 体积 / 箱(m³)
            get.sumVolume = (get.boxNum * get.sumChargeWeight).toString(); // 总数量
            get.sumWeight = (get.boxNum * get.sumChargeWeight).toString(); // 总重

            newBoxArr.push(get);

        });

        air_box_info_arr = JSON.parse(JSON.stringify(newBoxArr)); // 空运数据不合并

        log.debug('newBoxArr', newBoxArr);

        var box_arr = [];

        newBoxArr.map(function (box, key) {
            if (box) {
                var itemId = box.itemId,
                    sku = box.sku,
                    qty = box.qty,
                    length = box.length,
                    height = box.height,
                    width = box.width;

                var temp_new_box_arr = [];

                temp_new_box_arr.push(box.boxNo);
                for (var i = key + 1, i_len = newBoxArr.length; i < i_len; i++) {
                    var i_temp_box = newBoxArr[i];

                    if (i_temp_box) {
                        var i_itemId = i_temp_box.itemId,
                            i_sku = i_temp_box.sku,
                            i_qty = i_temp_box.qty,
                            i_length = i_temp_box.length,
                            i_height = i_temp_box.height,
                            i_width = i_temp_box.width;

                        if (itemId == i_itemId && sku == i_sku && qty == i_qty && length == i_length && height == i_height && width == i_width) {
                            temp_new_box_arr.push(i_temp_box.boxNo)
                            delete newBoxArr[i]
                        }
                    }

                    box.boxNo = temp_new_box_arr;
                    box.boxNum = temp_new_box_arr.length;
                    box.sumVolume = box.boxNum * box.boxqty; // 总数量
                    box.sumWeight = box.boxNum * box.sumChargeWeight; // 总重
                }
                box_arr.push(box)
            }
        });

        box_arr.map(function (box) {
            var boxNo = box.boxNo;

            if (util.isArray(boxNo)) {
                box.boxNo = boxNo.join(',')
            }

        });

        data.boxNum = boxNo; // 总箱数

        var shippingType;
        // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
        // 1	空运   2	海运   3	铁路    4   快船
        if (transport == 1) {
            shippingType = 10;
        } else if (transport == 4) {
            shippingType = 30;
        } else if (transport == 2) {
            shippingType = 20;
        } else if (transport == 3) {
            shippingType = 40
        }

        data.sea = box_arr; // 空运模板数据,
        data.air = air_box_info_arr; // 海运模板数据,
        data.shippingType = shippingType; //(integer, optional): 运输方式,

        log.audit('数据处理 data', data);

        return data;
    }


    /**
     * 获取发运记录的装箱信息
     * @param {*} recId 
     */
    function getGroupBoxInfo(recId) {

        // 现在货品、数量、箱子信息 分组

        var box_group_limit = 3999,
            box_group_obj = {},
            box_group_arr = [];
        search.create({
            type: 'customrecord_dps_shipping_record_box',
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                    name: "custrecord_dps_ship_box_box_number",
                    summary: "COUNT",
                    type: "text",
                    label: "箱号"
                },
                {
                    name: "custrecord_dps_ship_box_item",
                    summary: "GROUP",
                    type: "select",
                    label: "货品"
                },
                {
                    name: "custrecord_dps_ship_box_sku",
                    summary: "GROUP",
                    type: "text",
                    label: "SKU"
                },
                {
                    name: "custrecord_dps_ship_box_quantity",
                    summary: "GROUP",
                    type: "integer",
                    label: "数量"
                },
                {
                    name: "custrecord_dps_ful_rec_box_length",
                    summary: "GROUP",
                    type: "float",
                    label: "箱长"
                },
                {
                    name: "custrecord_dps_ful_rec_big_box_width",
                    summary: "GROUP",
                    type: "float",
                    label: "箱宽"
                },
                {
                    name: "custrecord_dps_ful_rec_big_box_hight",
                    summary: "GROUP",
                    type: "float",
                    label: "箱高"
                },
            ]

        }).run().each(function (re) {

            var it = {
                itemId: re.getValue({
                    name: "custrecord_dps_ship_box_item",
                    summary: "GROUP",
                    type: "select",
                    label: "货品"
                }),
                sku: re.getValue({
                    name: "custrecord_dps_ship_box_sku",
                    summary: "GROUP",
                    type: "text",
                    label: "SKU"
                }),
                boxqty: re.getValue({
                    name: "custrecord_dps_ship_box_quantity",
                    summary: "GROUP",
                    type: "integer",
                    label: "数量"
                }),
                box_length: re.getValue({
                    name: "custrecord_dps_ful_rec_box_length",
                    summary: "GROUP",
                    type: "float",
                    label: "箱长"
                }),
                box_width: re.getValue({
                    name: "custrecord_dps_ful_rec_big_box_width",
                    summary: "GROUP",
                    type: "float",
                    label: "箱宽"
                }),
                box_hight: re.getValue({
                    name: "custrecord_dps_ful_rec_big_box_hight",
                    summary: "GROUP",
                    type: "float",
                    label: "箱高"
                }),
            }
            box_group_arr.push(it);
            return --box_group_limit > 0;
        });

        log.debug('box_group_arr', box_group_arr);

        // return box_group_arr;

        var data = {};

        var itemArr = [],
            itemObj = {},
            boxArr = [];
        var limit1 = 3999,
            limit2 = 3999;
        search.create({
            type: 'customrecord_dps_shipping_record_box',
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }],
            columns: [

                {
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_ship_box_fa_record_link"
                }, // 店铺
                {
                    name: 'custrecord_dps_to_shipment_name',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // shipmentName
                {
                    name: 'custrecord_dps_shipping_rec_shipmentsid',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // shipmentId
                {
                    name: 'custrecord_dps_shipping_rec_transa_subje',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 交易主体
                {
                    name: 'custrecord_dps_shipping_rec_to_location',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 目标仓库
                {
                    name: 'custrecord_dps_shipping_rec_country_regi',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 国家简码
                {
                    name: 'custrecord_dps_shipping_rec_destinationf',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // CenterId 
                {
                    name: 'custrecord_dps_to_reference_id',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // Reference ID
                {
                    name: 'custrecord_dps_shipping_rec_transport',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 运输方式



                "custrecord_dps_ful_rec_box_length", // 箱长
                "custrecord_dps_ful_rec_big_box_width", // 箱宽
                "custrecord_dps_ful_rec_big_box_hight", // 箱高

                "custrecord_dps_ship_box_box_number", // 箱号
                "custrecord_dps_ship_box_item", // 货品
                "custrecord_dps_ship_box_quantity", // 数量
                "custrecord_dps_ship_box_sku", // seller SKU
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }, // 货品中文标题
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_ship_box_item'
                }, // 长
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_ship_box_item'
                }, // 宽
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_ship_box_item'
                }, // 高
                {
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                }, // 每箱数量
                {
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱重量(G)
                {
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }, // SKU英文标题
                {
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }, // 平均成本
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }, // 品牌
                {
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }, // 物流分组
                {
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品材质
                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }, // 用途
                {
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱长
                {
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱高
                {
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱宽
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品图片
                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品重
            ]
        }).run().each(function (rec) {


            var itemId = rec.getValue('custrecord_dps_ship_box_item'),
                sku = rec.getText('custrecord_dps_ship_box_item'),
                qty = rec.getValue('custrecord_dps_ship_box_quantity');


            var it = {
                recId: recId,

                account: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_ship_box_fa_record_link"
                }),
                shipmentName: rec.getValue({
                    name: 'custrecord_dps_to_shipment_name',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // shipmentName

                shipmentId: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_shipmentsid',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // shipmentId

                Subsidiary: rec.getText({
                    name: 'custrecord_dps_shipping_rec_transa_subje',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }).split(":").slice(-1)[0].trim(), // 交易主体

                targetWarehouseName: rec.getText({
                    name: 'custrecord_dps_shipping_rec_to_location',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 目标仓库
                country: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_country_regi',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 国家简码
                CenterId: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_destinationf',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // CenterId 
                ReferenceId: rec.getValue({
                    name: 'custrecord_dps_to_reference_id',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // Reference ID
                transport: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_transport',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 运输方式

                boxNo: rec.getValue('custrecord_dps_ship_box_box_number'),
                itemId: rec.getValue('custrecord_dps_ship_box_item'),
                sku: rec.getText('custrecord_dps_ship_box_item'),
                qty: rec.getValue('custrecord_dps_ship_box_quantity'),
                sellersku: rec.getValue('custrecord_dps_ship_box_sku'),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }),

                length: Number(rec.getValue("custrecord_dps_ful_rec_box_length")), // 箱长
                width: Number(rec.getValue("custrecord_dps_ful_rec_big_box_width")), // 箱宽
                height: Number(rec.getValue("custrecord_dps_ful_rec_big_box_hight")), // 箱高
                // length: Number(rec.getValue({
                //     name: 'custitem_dps_long',
                //     join: 'custrecord_dps_ship_box_item'
                // })),
                // width: Number(rec.getValue({
                //     name: 'custitem_dps_wide',
                //     join: 'custrecord_dps_ship_box_item'
                // })),
                // height: Number(rec.getValue({
                //     name: 'custitem_dps_high',
                //     join: 'custrecord_dps_ship_box_item'
                // })),
                mpq: Number(rec.getValue({
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                })),
                packing_weight: rec.getValue({
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }), // 装箱重量
                englishTitle: rec.getValue({
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }),
                averagecost: rec.getValue({
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }),
                logisticsGroup: rec.getText({
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }),
                material: rec.getText({
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }),
                // box_long: rec.getValue({
                //     name: 'custitem_dps_box_long',
                //     join: 'custrecord_dps_ship_box_item'
                // }),
                // box_high: rec.getValue({
                //     name: 'custitem_dps_box_high',
                //     join: 'custrecord_dps_ship_box_item'
                // }),
                // box_wide: rec.getValue({
                //     name: 'custitem_dps_box_wide',
                //     join: 'custrecord_dps_ship_box_item'
                // }),
                imageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }), // 产品图片
                // chargeWeight: rec.getValue({
                //     name: 'custitem_dps_heavy2',
                //     join: 'custrecord_dps_ship_box_item'
                // }),
                weight: Number(rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_ship_box_item'
                }))
            }
            itemArr.push(rec.id);
            boxArr.push(it);
            return --limit1 > 0;
        });

        log.debug('货品信息 boxArr', boxArr);

        var fil = [];

        if (boxArr[0].account) {

            fil.push([
                'custrecord_ass_account', 'anyof', boxArr[0].account
            ]);
            fil.push("and");
            var add_fils = [],
                num = 0,
                len = boxArr.length;
            boxArr.map(function (ld) {
                num++;
                if (ld.sellersku) { // 存在 msku
                    add_fils.push([
                        ["name", "is", ld.sellersku],
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
            fil.push(add_fils);
            fil.push("and");
            fil.push([
                "isinactive", "is", false
            ]);
            // fil.push("and");
            // fil.push([
            //     "custrecord_ass_asin", "isnotempty", []
            // ]);

            log.audit('搜索条件', fil)
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fil,
                columns: [
                    "custrecord_ass_sku", // 货品
                    "custrecord_ass_asin", // ASIN
                    "custrecord_ass_fnsku", // fnsku
                ]

            }).run().each(function (rec) {
                var itemId = rec.getValue('custrecord_ass_sku');
                var asin = rec.getValue('custrecord_ass_asin');
                var fnsku = rec.getValue('custrecord_ass_fnsku');
                itemObj[itemId] = {
                    asin: asin,
                    fnsku: fnsku
                }
            });

            log.debug('搜索货品 itemObj', itemObj)
            if (JSON.stringify(itemObj) != "{}") {

                boxArr.map(function (box) {
                    box.asin = itemObj[box.itemId].asin
                    box.fnsku = itemObj[box.itemId].fnsku
                });
            }
        }


        log.debug('boxArr', boxArr);


        return boxArr;
    }

    /**
     * 
     * @param {Number} recId 
     */
    function AmazonBoxInfo(recId) {

        var shipment, shipmentName, shipTo = '',
            aono, centerId;

        var limit = 3999,
            Total = 0,
            item_info_arr = [],
            item_info_obj = {};

        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [
                "custrecord_dps_to_shipment_name", // shipment name
                "custrecord_dps_shipping_rec_shipmentsid", // shipment
                "custrecord_dps_shipping_rec_destinationf", // centerId
                {
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 调拨单号

                // 货品行
                {
                    name: 'custrecord_dps_ship_record_item_quantity',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // 货品数量
                {
                    name: 'custrecord_dps_shipping_record_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // 货品
                {
                    name: 'custrecord_dps_ship_record_sku_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }, // seller sku
            ]
        }).run().each(function (rec) {
            shipment = rec.getValue('custrecord_dps_shipping_rec_shipmentsid'); // shipment
            shipmentName = rec.getValue('custrecord_dps_to_shipment_name'); // shipment
            centerId = rec.getValue('custrecord_dps_shipping_rec_destinationf'); // centerId
            aono = rec.getValue({
                name: "tranid",
                join: "custrecord_dps_shipping_rec_order_num"
            }); // aono

            var itemId = rec.getValue({
                    name: 'custrecord_dps_shipping_record_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }),
                item_qty = rec.getValue({
                    name: 'custrecord_dps_ship_record_item_quantity',
                    join: 'custrecord_dps_shipping_record_parentrec'
                }),
                item_seller_sku = rec.getValue({
                    name: 'custrecord_dps_ship_record_sku_item',
                    join: 'custrecord_dps_shipping_record_parentrec'
                });

            item_info_obj[itemId] = {
                itemId: itemId,
                item_qty: item_qty,
                item_seller_sku: item_seller_sku
            }
            Total += Number(item_qty);
            return --limit > 0;

        });

        if (centerId) {
            var te = searchCenterIdInfo(centerId);
            shipTo = te.recipien + ',' + te.addr1 + ',' + te.city + ',' + te.state + ',' + te.postcode + ',' + te.country + "(" + te.centerId + ')'
        }

        var boxItemTotal = 0; // 装箱数量

        var temp_box_info = []; // 装箱信息
        var item_boxNo_obj = {}; // 箱号对象
        var limit1 = 3999;

        var box_item_arr = [];
        search.create({
            type: "customrecord_dps_shipping_record_box",
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                    name: "custrecord_dps_ship_box_box_number",
                    sortdir: "ASC"
                }, // 箱号
                "custrecord_dps_ship_box_item", // 货品
                "custrecord_dps_ship_box_sku", // seller sku
                "custrecord_dps_ship_box_quantity", // 装箱数量
                "custrecord_dps_ship_box_asin", // asin
                "custrecord_dps_ship_box_fnsku", // fnsku
                'custrecord_dps_ful_rec_box_length', // 箱长
                'custrecord_dps_ful_rec_big_box_width', // 箱宽
                'custrecord_dps_ful_rec_big_box_hight', // 箱高
                'custrecord_dps_ship_box_weight', // 箱重
            ]
        }).run().each(function (r) {

            boxItemTotal += Number(r.getValue({
                name: 'custrecord_dps_ship_box_quantity',
            }))
            var itemId = r.getValue("custrecord_dps_ship_box_item");

            var temp_boxInfo_arr = [];
            var boxNo = r.getValue({
                name: "custrecord_dps_ship_box_box_number",
                sortdir: "ASC"
            });

            if (item_boxNo_obj[boxNo]) {
                temp_boxInfo_arr = item_boxNo_obj[boxNo];
            }
            // 获取箱号
            item_boxNo_obj[boxNo] = r.getValue("custrecord_dps_ship_box_item");

            var it = {
                boxNo: boxNo,
                boxqty: r.getValue("custrecord_dps_ship_box_quantity"),
                sellersku: r.getValue("custrecord_dps_ship_box_sku"),
                asin: r.getValue("custrecord_dps_ship_box_asin"),
                fnsku: r.getValue("custrecord_dps_ship_box_fnsku"),
                itemId: itemId,
                box_length: r.getValue('custrecord_dps_ful_rec_box_length'),
                box_width: r.getValue('custrecord_dps_ful_rec_big_box_width'),
                box_hight: r.getValue('custrecord_dps_ful_rec_big_box_hight'),
                box_weight: r.getValue('custrecord_dps_ship_box_weight'),
                box_length_in: (Number(r.getValue('custrecord_dps_ful_rec_box_length')) * 0.393700787402).toFixed(2),
                box_width_in: (Number(r.getValue('custrecord_dps_ful_rec_big_box_width')) * 0.393700787402).toFixed(2),
                box_hight_in: (Number(r.getValue('custrecord_dps_ful_rec_big_box_hight')) * 0.393700787402).toFixed(2),
                box_weight_lb: (Number(r.getValue('custrecord_dps_ship_box_weight')) * 2.20).toFixed(2),
            };

            box_item_arr.push(it);
            temp_boxInfo_arr.push(it);
            item_boxNo_obj[boxNo] = temp_boxInfo_arr;
            temp_box_info.push(it);
            return --limit1 > 0;
        });


        var item_key_arr = Object.keys(item_info_obj); // 获取货品数组

        var box_key_arr = Object.keys(item_boxNo_obj); // 获取箱号数据

        var new_item_info_arr = [];
        item_key_arr.map(function (item) {

            var temp_item_info = {};
            temp_item_info.sellersku = item_info_obj[item].item_seller_sku;
            temp_item_info.qty = item_info_obj[item].item_qty;

            // log.audit('item_info_obj[item]', item_info_obj[item]);

            var temp_item_box_arr = []; // 用于当前货品对应的所有箱号
            var tep_mitem_boxInfo_arr = []; // 用于当前货品对应的所有箱子信息
            box_key_arr.map(function (box) {

                if (item_boxNo_obj[box]) { // 当前箱号存在值

                    var temp_item_boxNo_arr = item_boxNo_obj[box];

                    for (var i = 0, length = temp_item_boxNo_arr.length; i < length; i++) {

                        var it = temp_item_boxNo_arr[i];

                        if (it.itemId == item) { // 属于当前货品
                            temp_item_box_arr.push(box)
                            // temp_item_info.sellersku = it.sellersku;
                            temp_item_info.asin = it.asin;
                            temp_item_info.fnsku = it.fnsku;
                            tep_mitem_boxInfo_arr.push({
                                boxNo: box,
                                boxqty: it.boxqty
                            })
                        }
                    }
                    if (temp_item_box_arr.indexOf(box) == -1) {
                        tep_mitem_boxInfo_arr.push({
                            boxNo: box,
                            boxqty: ''
                        })
                    }
                }
            });
            temp_item_info.boxNo = tep_mitem_boxInfo_arr;

            new_item_info_arr.push(temp_item_info);
        });


        var new_boxNo_arr = [];

        Object.keys(item_boxNo_obj).map(function (box) {
            var it = {
                boxNo: item_boxNo_obj[box][0].boxNo,
                box_length: item_boxNo_obj[box][0].box_length,
                box_width: item_boxNo_obj[box][0].box_width,
                box_hight: item_boxNo_obj[box][0].box_hight,
                box_weight: item_boxNo_obj[box][0].box_weight,
                box_length_in: item_boxNo_obj[box][0].box_length_in,
                box_width_in: item_boxNo_obj[box][0].box_width_in,
                box_hight_in: item_boxNo_obj[box][0].box_hight_in,
                box_weight_lb: item_boxNo_obj[box][0].box_weight_lb,
            };
            new_boxNo_arr.push(it);
        });


        return {
            boxObjLength: Object.keys(item_boxNo_obj).length,
            boxNoArr: new_boxNo_arr, // 用于存放箱号数组
            item_boxNo_obj: item_boxNo_obj,
            shipment: shipment, // shipment
            shipmentName: shipmentName, // shipment name
            skus: Object.keys(item_info_obj).length, // sku 总数
            Total: boxItemTotal, // 装箱数量
            shipTo: shipTo, // shipTo 地址
            aono: aono, // 调拨单号
            boxItemArr: box_item_arr, // 箱号、箱子信息等
            itemInfoArr: new_item_info_arr, // 装箱信息汇总
        }
    }


    /**
     * 搜索 Amazon shipTo 的地址
     * @param {String} centerId 
     */
    function searchCenterIdInfo(centerId) {

        if (!centerId) { // 不存在直接返回空对象
            return {};
        }
        var shipTo = {};

        search.create({
            type: "customrecord_dps_amazo_center_id_address",
            filters: [{
                    name: 'name',
                    operator: 'is',
                    values: centerId
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }, // 不属于非活动的
            ],
            columns: [
                "name", // center Id
                "custrecord_dps_amazon_center_id_shipto", // shipTo
                "custrecord_dps_amazon_center_id_country", // 目标国家
                "custrecord_dps_amazon_center_id_recipien", // 收件人
                "custrecord_dps_amaozn_center_id_addr1", // 地址 1
                "custrecord_dps_amazon_center_id_city", // 城市
                "custrecord_dps_amazon_center_id_state", // 州
                "custrecord_dps_amazon_center_id_postcode", // 邮编
            ]
        }).run().each(function (re) {

            shipTo.centerId = re.getValue("name");
            shipTo.country = re.getValue("custrecord_dps_amazon_center_id_country");
            shipTo.recipien = re.getValue("custrecord_dps_amazon_center_id_recipien");
            shipTo.addr1 = re.getValue("custrecord_dps_amaozn_center_id_addr1");
            shipTo.city = re.getValue("custrecord_dps_amazon_center_id_city");
            shipTo.state = re.getValue("custrecord_dps_amazon_center_id_state");
            shipTo.postcode = re.getValue("custrecord_dps_amazon_center_id_postcode");
        });


        log.debug('shipTo', shipTo);
        return shipTo;
    }



    /**
     * 搜索或者创建城市记录
     * @param {String} action 
     * @param {String} city 
     */
    function searchCreateCity(action, city) {

        var cityId;
        search.create({
            type: "customrecord_dps_port",
            filters: [{
                    name: 'name',
                    operator: 'is',
                    values: city
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }, // 不属于非活动的
            ]
        }).run().each(function (re) {
            cityId = re.id;
        });


        if (action == "create") {
            var newCity = record.create({
                type: 'customrecord_dps_port',
            });
            newCity.setValue({
                fieldId: 'name',
                value: city
            });
            cityId = newCity.save();
        }

        log.debug('城市 cityId', cityId);

        return cityId;
    }


    /**
     * 搜索或者创建国家
     * @param {String} action 
     * @param {String} country 
     */
    function searchCreateCountry(action, country) {

        var countryId;

        search.create({
            type: "customrecord_country_code",
            filters: [{
                name: 'custrecord_cc_country_code',
                operator: 'is',
                values: country
            }]
        }).run().each(function (r) {
            countryId = r.id;
        });

        if (action == "create") {
            var newCountry = record.create({
                type: "customrecord_country_code"
            });

            newCountry.setValue({
                fieldId: 'name',
                value: country
            });
            newCountry.setValue({
                fieldId: 'custrecord_cc_country_code',
                value: country
            });

            countryId = newCountry.save();

        }

        log.debug('城市 countryId', countryId);
        return countryId;
    }


    /**
     * 删除发运记录 的装箱信息
     * @param {Number} recId 
     */
    function deleteBoxInfo(recId) {

        var limit = 1200;

        var boxIdArr = [];

        log.audit('搜索 Starts', runtime.getCurrentScript().getRemainingUsage());

        search.create({
            type: "customrecord_dps_shipping_record_box",
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }]
        }).run().each(function (r) {
            boxIdArr.push(r.id);

            return --limit > 0;
        });


        log.audit('搜索 End', runtime.getCurrentScript().getRemainingUsage());

        boxIdArr.map(function (boxId, key) {

            log.audit('删除 Starts ' + key, runtime.getCurrentScript().getRemainingUsage());
            record.delete({
                type: "customrecord_dps_shipping_record_box",
                id: boxId
            });

            log.audit('删除 End ' + key, runtime.getCurrentScript().getRemainingUsage());
        });


        var boxLine = getBoxLine(recId);

        log.debug('装箱信息行数', boxLine);

        if (boxLine == 0) {
            log.audit('提交字段 Starts ', runtime.getCurrentScript().getRemainingUsage());
            record.submitFields({
                type: "customrecord_dps_shipping_record",
                id: recId,
                values: {
                    custrecord_dps_box_return_flag: false
                }
            })
            log.audit('提交字段 End ', runtime.getCurrentScript().getRemainingUsage());
        }

        return boxLine;


    }

    function getBoxLine(recId) {

        var limit = 3999;
        var boxLine = 0;
        search.create({
            type: "customrecord_dps_shipping_record_box",
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }]
        }).run().each(function (r) {
            boxLine++;
            return --limit > 0;
        });

        return boxLine || 0;
    }


    /**
     * 获取Amazon订单号  sear
     * @param {String} message 
     */
    function searchAmazonOrder(message) {
        var req = /[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]/; // Amazon 订单号格式

        var amazon_order;

        if (!message) {
            return amazon_order;
        }

        var b_starts = message.search(req); // 起始位置

        log.audit('开始位置', b_starts);

        if (b_starts == -1) {
            return '';
        }

        var b_end = b_starts + 19;

        log.audit('结束位置', b_end);

        amazon_order = message.substring(b_starts, b_end);

        log.audit('订单号', amazon_order);

        return amazon_order;
    }
    /**
     * 获取Amazon订单号数组  match
     * @param {String} message 
     */
    function matchAmazonOrder(message) {
        var req = /[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]/ig; // Amazon 订单号格式

        var amazon_order;

        if (!message) {
            return amazon_order;
        }

        var order_arrary = message.match(req); // 单号数组

        if (order_arrary && order_arrary.length == 0) {
            return '';
        }

        amazon_order = order_arrary;
        return amazon_order;
    }


    /**
     * 用于获取 case massage 内容
     * @param {Object} con 
     */
    function searchCaseMessage(con) {

        var message = '';
        search.create({
            type: con.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: con.id
            }],
            columns: [
                "message"
            ]
        }).run().each(function (rec) {
            message = rec.getValue('message');
        })

        return message
    }


    return {
        SummaryBinBox: SummaryBinBox,
        searchLocationBin: searchLocationBin,
        createLocationBin: createLocationBin,
        judgmentBinBox: judgmentBinBox,
        getAllBinBox: getAllBinBox,
        searchTransactionItemInfo: searchTransactionItemInfo,
        searchTransactionItemObj: searchTransactionItemObj,
        wmsInfo: wmsInfo,
        wmsRetInfo: wmsRetInfo,
        judgmentFlag: judgmentFlag,
        searchToLinkPO: searchToLinkPO,
        checkDifferentArr: checkDifferentArr,
        getToken: getToken,
        sendRequest: sendRequest,
        getInfo: getInfo,
        getBoxInfo: getBoxInfo,
        groupBoxInfo: groupBoxInfo,
        getGroupBoxInfo: getGroupBoxInfo,
        AmazonBoxInfo: AmazonBoxInfo,
        searchCenterIdInfo: searchCenterIdInfo,
        searchCreateCity: searchCreateCity,
        searchCreateCountry: searchCreateCountry,
        deleteBoxInfo: deleteBoxInfo,
        searchAmazonOrder: searchAmazonOrder,
        matchAmazonOrder: matchAmazonOrder,
        searchCaseMessage: searchCaseMessage
    }
});