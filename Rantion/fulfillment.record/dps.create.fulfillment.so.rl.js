/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-12 19:57:07
 * @LastEditTime   : 2020-07-18 17:36:36
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.create.fulfillment.so.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['../Helper/config.js', '../Helper/logistics_cost_calculation.js',
    'N/record', 'N/search', 'N/log'
], function (config, costCal, record, search, log) {


    function _post(context) {

        log.debug('typrof context', typeof (context));

        log.debug('context', context);

        var recordID = context.recordID;

        log.debug('recordID', recordID);

        var reJson = {},
            itemArr = {};

        try {

            // itemArr = searchItemSO(recordID);
            // var flag = searchLocation(itemArr);

            var flag = qtyBackOrdered(recordID);

            var recType = "salesorder";
            // var flag = judgmentItemInventory(recType, recordID);

            log.debug('searchLocation flag', flag);

            // flag = false;
            if (flag) {
                // 创建发运记录
                var create_ful_rec_id = createFulfillmentRecord(recordID, 'value');
                log.debug('创建发运记录成功', 'create_ful_rec_id:' + create_ful_rec_id);
                if (create_ful_rec_id) {
                    reJson.msg = '小货发运记录： ' + create_ful_rec_id;
                    // 物流匹配
                    log.debug('物流匹配', 'recordID:' + recordID + ', create_ful_rec_id:' + create_ful_rec_id);
                    createLogisticsStrategy(recordID, create_ful_rec_id);
                } else {
                    log.debug('创建发运记录失败了', '');
                    reJson.code = 3;
                    reJson.msg = '创建发运记录失败了 ';
                }
            } else {
                reJson.code = 2;
                reJson.msg = '货品库存不足';
            }

        } catch (error) {
            log.error('创建小货发运记录失败了', error);
            reJson.code = 5;
            reJson.msg = error.message;
        }

        log.debug('reJson', reJson);
        return reJson;

    }


    // 获取订单对应的库存
    /**
     * 搜索单据的货品、地点、子公司
     * @param {String} recType 
     * @param {number} recId 
     * @returns {Object} {subsidiary: subs,itemArr: itemArr,location: loca,totalQty: totalQty};
     */
    function searchToLocationItem(recType, recId) {

        log.debug('recId: ' + recId, "recType: " + recType);
        var limit = 3999,
            itemArr = [],
            totalQty = 0,
            loca, subs;
        search.create({
            type: recType,
            filters: [{
                    name: "internalid",
                    operator: 'anyof',
                    values: [recId]
                },
                {
                    name: "mainline",
                    operator: 'is',
                    values: false
                },
                {
                    name: "taxline",
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "item",
                "quantity"
            ]
        }).run().each(function (rec) {
            var it = rec.getValue('item')
            if (itemArr.indexOf(it) == -1) {
                itemArr.push(rec.getValue('item'));
                totalQty += Math.abs(Number(rec.getValue('quantity')))
            }
            return --limit > 0;
        });


        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recId
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }
            ],
            columns: [
                "location", "subsidiary"
            ]
        }).run().each(function (r) {
            subs = r.getValue('subsidiary');
            loca = r.getValue('location');
        })

        var it = {
            subsidiary: subs,
            itemArr: itemArr,
            location: loca,
            totalQty: totalQty
        };

        return it || false;

    }


    /**
     * 搜索货品对应的所有地点,限制于子公司
     * @param {String} sub 子公司
     * @param {number} loca 一级地点
     * @param {Array} locaArr 货品地点数组
     * @returns {Array} loArr 货品对应的地点数组
     */
    function searchSecLoca(sub, loca, locaArr) {
        var loArr = [],
            limit = 3999

        log.debug('sub: ' + sub + " loca: " + loca, "locaArr  typeof  " + typeof (locaArr) + "    " + locaArr)
        search.create({
            type: "location",
            filters: [{
                    name: 'custrecord_dps_parent_location',
                    operator: 'anyof',
                    values: [loca]
                }, // 父级地点
                {
                    name: "subsidiary",
                    operator: 'anyof',
                    values: [sub]
                }, // 子公司
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: locaArr
                }, // 地点
            ]
        }).run().each(function (rec) {

            // log.debug('locaArr.indexOf(rec.id) ', locaArr.indexOf(rec.id))
            if (locaArr.indexOf(rec.id) > -1) {
                log.debug('地点的内部ID', rec.id)
                loArr.push(rec.id);
            }
            return --limit > 0;
        });
        return loArr || false;
    }


    /**
     * 搜索对应的地点 并返回
     * @param {Array} secArr  地点数组
     * @param {Array} loca 一级地点
     * @returns {Array} thrArr 地点数组
     */
    function searchThrLoca(secArr, loca) {
        var limit = 3999,
            thrArr = secArr;

        log.debug('thrArr', thrArr);
        log.debug('secArr', secArr);
        search.create({
            type: 'location',
            filters: [{
                name: 'custrecord_dps_parent_location',
                operator: 'anyof',
                values: secArr
            }]
        }).run().each(function (rec) {
            thrArr.push(rec.id);
            return --limit > 0;
        });

        thrArr.push(loca);
        return thrArr || false;

    }

    /**
     * 搜索对应货品、地点的库存量与延交订单量
     * @param {Array} itemArr 货品数组
     * @param {Array} LocaArr 地点数组
     * @returns {Object} { totalQty (库存总量): totalQty, backOrderQty(延交订单总量): backOrderQty }
     */
    function searchItemQty(itemArr, LocaArr) {


        log.debug('itemArr length: ' + itemArr.length, "LocaArr length: " + LocaArr.length)
        var limit = 3999,
            locationquantityonhand,
            backOrderQty = 0,
            totalQty = 0,
            loca;
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: itemArr
                },
                {
                    name: 'inventorylocation',
                    operator: 'anyof',
                    values: LocaArr
                }
            ],
            columns: [
                "locationquantityonhand", // 库存量 Location On Hand
                "inventorylocation", // 库存地点    Inventory Location
                "locationquantitybackordered", // 延交订单 LOCATION BACK ORDERED
            ]
        }).run().each(function (rec) {

            log.debug('locationquantityonhand: ' + rec.getValue('locationquantityonhand'), "loca: " + rec.getValue('inventorylocation'))
            totalQty += Number(rec.getValue('locationquantityonhand'));
            backOrderQty += Number(rec.getValue('locationquantitybackordered'));
            return --limit > 0;
        });

        var it = {
            totalQty: totalQty,
            backOrderQty: backOrderQty
        }

        return it || false;
    }



    /**
     * 搜索货品对应的地点
     * @param {Array} itemArr 货品数组
     * @param {Number} sub 子公司ID
     * @returns {Array} locaArr 地点数组
     */
    function searchItemLocation(itemArr, sub) {

        var limit = 3999,
            locaArr = [];
        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: itemArr
                },
                {
                    name: 'subsidiary',
                    join: 'inventorylocation',
                    operator: 'anyof',
                    values: sub
                }
            ],
            columns: [
                "inventorylocation"
            ]
        }).run().each(function (rec) {
            locaArr.push(rec.getValue('inventorylocation'));
            return --limit > 0;
        });

        return locaArr || false;

    }



    /**
     * 判断库存是否充足
     * @param {String} recType 
     * @param {Number} recId 
     * @returns{Boolean} flag
     */
    function judgmentItemInventory(recType, recId) {

        var flag = false;

        // 获取单据对应的货品,子公司,地点,总数量
        var a = searchToLocationItem(recType, recId);
        log.debug('一级地点 a', a);

        //  获取货品对应的地点
        var al = searchItemLocation(a.itemArr, a.subsidiary);
        log.debug("al", al);

        // 搜索货品地点的库存
        var bl = searchSecLoca(a.subsidiary, a.location, al)
        log.debug('bl length' + bl.length, bl);
        var cl, fl

        if (bl && bl.length > 0) { // 存在库位, 则进行箱的搜索
            // 搜索库存对应的箱
            cl = searchThrLoca(bl, a.location)
            log.debug('cl length: ' + cl.length, cl);
        } else { // 不存在库存, 直接获取一级地点
            cl = [a.location]
        }
        // 搜索货品对应的库存数量和延交订单数量
        var dl = searchItemQty(a.itemArr, cl);
        var fl = dl.totalQty - dl.backOrderQty - a.totalQty;
        log.debug('fl', fl);
        if (fl >= 0) {
            log.debug('库存充足', "可以发货");
            flag = true;
        } else {
            log.debug('库存不足', "无法发货");
            flag = false;
        }
        log.debug('dl', dl);

        return flag;
    }

    /**
     * 获取当前订单的延交订单的货品数量, 若存在延交订单数量大于 0, 返回 true; 否则返回 false;
     * @param {*} soId 
     * @returns {Boolean} true || false
     */
    function qtyBackOrdered(soId) {
        var flag = true;
        var backOrder = 0;

        var soObj = record.load({
            type: 'salesorder',
            id: soId
        });
        var numLines = soObj.getLineCount({
            sublistId: 'item'
        });

        for (var i = 0; i < numLines; i++) {

            var backQty = soObj.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantitybackordered',
                line: i
            });
            backOrder += Number(backQty);
        }
        log.debug('backOrder', backOrder);

        if (backOrder > 0) {
            flag = false;
        }

        return flag;
    }


    /**
     * 搜索订单的货品信息
     * @param {*} soid 
     */
    function searchItemSO(soid) {

        var itemArr = [],
            itemInfo = [],
            itemJson = {},
            location,
            limit = 3999;
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: soid
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
                },
                {
                    name: 'type',
                    join: 'item',
                    operator: 'noneof',
                    values: 'OthCharge'
                }
            ],
            columns: [
                'location', 'item', 'quantity',
            ]
        }).run().each(function (rec) {
            location = rec.getValue('location');
            var info = {
                item: rec.getValue('item'),
                qty: rec.getValue('quantity')
            }
            itemArr.push(rec.getValue('item'));
            itemInfo.push(info);
            return --limit > 0;
        });

        itemJson.location = location;
        itemJson.iteminfo = itemInfo;
        itemJson.itemarr = itemArr;
        return itemJson || false;
    }


    /**
     * 判断货品是否有库存
     * @param {*} itemJson 
     */
    function searchLocation(itemJson) {
        var itemArr = itemJson.itemarr,
            location = itemJson.location,
            itemInfo = itemJson.iteminfo,
            flag = false,
            limit = 3999;

        log.debug('searchLocation itemArr', itemArr);
        log.debug('searchLocation location', location);
        log.debug('searchLocation itemInfo', itemInfo);

        search.create({
            type: 'item',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: itemArr
                },
                {
                    name: "inventorylocation",
                    operator: 'anyof',
                    values: location
                }
            ],
            columns: [
                'inventorylocation'
            ]
        }).run().each(function (rec) {
            var item = rec.id,
                invent = rec.getValue('item');

            log.debug('item: ' + item, 'invent: ' + invent);
            for (var i = 0, len = itemInfo.length; i < len; i++) {

                log.debug('for item', item);
                log.debug('for invent', invent);
                var temp = itemInfo[i];
                if (item == tempitem && invent >= temp.qty) {
                    flag = true;
                } else {
                    flag = false;
                }
            }
            return --limit > 0;
        });

        log.debug('searchLocation flag', flag);

        return flag;
    }


    /**
     * 生成发运记录, 关联销售订单
     * @param {*} soid 
     * @param {*} sku 
     * @returns {*} 返回生成的发运记录的ID, 或者 false;
     */
    function createFulfillmentRecord(soid, sku) {
        var location, api_content, tranid, otherrefnum, account, marketplaceid, amount,
            first_name, cc_country, cc_state, cc_ctiy, cc_zip, cc_addr1, cc_addr2, cc_phone_number, recName;

        var custbody_dps_distributors, custbody_dps_service_channels; // 渠道商, 渠道服务

        var item_arr = [],
            limit = 3999;
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: soid
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
                },
                {
                    name: 'type',
                    join: 'item',
                    operator: 'noneof',
                    values: 'OthCharge'
                }
            ],
            columns: [
                'location', 'item', 'quantity', 'custbody_aio_api_content', 'tranid', 'amount',
                'otherrefnum', 'custbody_aio_account', 'custcol_dps_trans_order_item_sku',
                'custbody_aio_marketplaceid', "custbody_dps_distributors", "custbody_dps_service_channels",
                {
                    name: 'custitem_dps_heavy2',
                    join: 'item'
                },
                {
                    name: 'custrecord_cc_first_name',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_country',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_state',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_ctiy',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_zip',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_addr1',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_addr2',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_phone_number',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'name',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custbody_sotck_account'
                }, // 发货店铺
            ]
        }).run().each(function (rec) {

            custbody_dps_distributors = rec.getValue('custbody_dps_distributors'); // 渠道商
            custbody_dps_service_channels = rec.getValue('custbody_dps_service_channels'); // 渠道服务

            recName = rec.getValue({
                name: 'name',
                join: 'custbody_dps_order_contact'
            });
            amount = rec.getValue('amount');
            location = rec.getValue('location');
            var info = {
                item: rec.getValue('item'),
                quantity: rec.getValue('quantity'),
                sku: rec.getValue('custcol_dps_trans_order_item_sku'),
                weight: rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'item'
                })
            }
            item_arr.push(info);
            api_content = rec.getValue('custbody_aio_api_content');
            tranid = rec.getValue('tranid');
            otherrefnum = rec.getValue('otherrefnum');
            account = rec.getValue('custbody_sotck_account');
            marketplaceid = rec.getValue('custbody_aio_marketplaceid');
            first_name = rec.getValue({
                name: 'custrecord_cc_first_name',
                join: 'custbody_dps_order_contact'
            });
            cc_country = rec.getValue({
                name: 'custrecord_cc_country',
                join: 'custbody_dps_order_contact'
            });
            cc_state = rec.getValue({
                name: 'custrecord_cc_state',
                join: 'custbody_dps_order_contact'
            });
            cc_ctiy = rec.getValue({
                name: 'custrecord_cc_ctiy',
                join: 'custbody_dps_order_contact'
            });
            cc_zip = rec.getValue({
                name: 'custrecord_cc_zip',
                join: 'custbody_dps_order_contact'
            });
            cc_addr1 = rec.getValue({
                name: 'custrecord_cc_addr1',
                join: 'custbody_dps_order_contact'
            });
            cc_addr2 = rec.getValue({
                name: 'custrecord_cc_addr2',
                join: 'custbody_dps_order_contact'
            });
            cc_phone_number = rec.getValue({
                name: 'custrecord_cc_phone_number',
                join: 'custbody_dps_order_contact'
            });
            return --limit > 0;
        });
        var ful_create_rec = record.create({
            type: 'customrecord_dps_shipping_small_record'
        });
        // 发运仓库
        if (location) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_samll_location',
                value: location
            });
        }

        // 渠道商
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_channel_dealer',
            value: custbody_dps_distributors
        });
        // 渠道服务
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_channelservice',
            value: custbody_dps_service_channels
        });
        // 订单号 
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_order_number',
            value: tranid
        });
        // 平台订单号 
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_platform_order_numbe',
            value: otherrefnum
        });
        // 状态 
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_status',
            value: 1
        });
        // 销售平台
        if (marketplaceid) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_sales_platform',
                value: marketplaceid ? marketplaceid : ''
            });
        }
        // 销售店铺
        if (account) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_account',
                value: account
            });
        }
        var sub_id = 'recmachcustrecord_dps_ship_small_links';
        var real_weight = 0;
        for (var i = 0, len = item_arr.length; i < len; i++) {
            var skuqty = Number(item_arr[i].quantity);
            var skuweight = Number(item_arr[i].weight);
            real_weight = real_weight + (skuqty * skuweight);
            ful_create_rec.setSublistValue({
                sublistId: sub_id,
                fieldId: 'custrecord_dps_ship_small_item_item',
                line: i,
                value: item_arr[i].item
            });
            ful_create_rec.setSublistValue({
                sublistId: sub_id,
                fieldId: 'custrecord_dps_ship_small_sku_line',
                line: i,
                value: item_arr[i].sku
            });
            ful_create_rec.setSublistValue({
                sublistId: sub_id,
                fieldId: 'custrecord_dps_ship_small_item_quantity',
                line: i,
                value: skuqty
            });
        }
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_real_weight',
            value: real_weight
        });
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_recipient_city',
            value: cc_ctiy
        });
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_recipien_code',
            value: cc_zip
        });
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_s_state',
            value: cc_state ? cc_state : ''
        });
        var c_country;
        if (cc_country) {
            c_country = searchCountryByCode(cc_country);
        }
        if (c_country) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_recipient_country',
                value: c_country
            });
        }
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_street1',
            value: cc_addr1 ? cc_addr1 : ''
        });
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_street2',
            value: cc_addr2 ? cc_addr2 : ''
        });


        var strName1;
        var strName = recName ? recName : first_name;
        // 目的地
        // ful_create_rec.setValue({
        //     fieldId: 'custrecord_dps_ship_small_destination',
        //     value: strName + '\n' + cc_addr1 + '\n' + cc_addr2 + '\n' + cc_zip + '\n' + cc_ctiy + '\n' + cc_state + '\n' + cc_country
        // });
        if (strName) {
            strName1 = strName;
            strName += ',';
        }
        if (cc_addr1) {
            cc_addr1 += ',';
        }
        if (cc_addr2) {
            cc_addr2 += ',';
        }
        if (cc_zip) {
            cc_zip += ',';
        }
        if (cc_ctiy) {
            cc_ctiy += ',';
        }
        if (cc_state) {
            cc_state += ',';
        }
        // 收件人地址
        // ful_create_rec.setValue({
        //     fieldId: 'custrecord_dps_addressee_address',
        //     value: strName + cc_addr1 + cc_addr2 + cc_zip + cc_ctiy + cc_state + cc_country
        // });
        // 收件人 
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_recipient',
            value: strName1
        });
        // 联系电话 
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_phone',
            value: cc_phone_number ? cc_phone_number : ''
        });
        // 关联的销售订单
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_salers_order',
            value: soid
        });
        try {
            var set_value = 0;
            var currency;
            var temp = getDeclaredValue(cc_country);
            log.debug('获取关税起征点的值', JSON.stringify(temp));
            if (temp.length > 0) {
                var dec_value = temp[0].tariff;
                currency = temp[0].currency;
                if (dec_value) {
                    if (amount > dec_value) {
                        var l_v = Number(dec_value) * 0.2,
                            h_v = Number(dec_value) * 0.8;
                        set_value = randomNum(l_v, h_v);
                    } else {
                        set_value = account;
                    }
                } else {
                    set_value = account;
                }
            }
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_declared_value',
                value: set_value
            });
            if (currency) {
                ful_create_rec.setValue({
                    fieldId: 'custrecord_dps_declare_currency',
                    value: Number(currency)
                });
            }
            log.debug('设置申报价值', set_value);
        } catch (error) {
            log.error('设置申报价值报错了', error);
        }
        var ful_create_rec_id = ful_create_rec.save({
            ignoreMandatoryFields: true
        });
        if (ful_create_rec_id) {
            // custbody_dps_small_fulfillment_record 关联的小货发运记录
            record.submitFields({
                type: 'salesorder',
                id: soid,
                values: {
                    'custbody_dps_small_fulfillment_record': ful_create_rec_id
                }
            });
        }
        return ful_create_rec_id || false;
    }

    //生成从minNum到maxNum的随机数
    function randomNum(minNum, maxNum) {
        switch (arguments.length) {
            case 1:
                return Math.random() * minNum;
            case 2:
                return Math.random() * (maxNum - minNum) + minNum;
            default:
                return 0 + minNum;
        }
    }

    /**
     * 获取地点的国家
     * @param {*} locationid 
     */
    function getLocationCode(locationid) {
        var country_id;
        if (locationid) {
            search.create({
                type: 'location',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: locationid
                }],
                columns: ['custrecord_aio_country_sender']
            }).run().each(function (rec) {
                country_id = rec.getValue('custrecord_aio_country_sender');
            });
        }
        return country_id || false;
    }

    /**
     * 根据国家简码, 搜索对应的国家记录
     * @param {*} code 
     */
    function searchCountryByCode(code) {
        var country_id;
        search.create({
            type: 'customrecord_country_code',
            filters: [{
                name: 'custrecord_cc_country_code',
                operator: 'startswith',
                values: code
            }]
        }).run().each(function (rec) {
            country_id = rec.id;
            return true;
        });
        return country_id || false;
    }

    /**
     * 获取关税起征点的值
     * @param {*} code 
     */
    function getDeclaredValue(code) {
        var target_country_id = searchCountryByCode(code);
        var origin_country_id = config.countryCodeChinaID; // 中国
        log.debug('发货国家country_id', origin_country_id);
        log.debug('目标国家country_id', target_country_id);
        var tariffs = [];
        if (origin_country_id && target_country_id) {
            search.create({
                type: 'customrecord_dps_tariff_threshold',
                filters: [{
                        name: 'custrecord_dps_tar_the_country_origin',
                        operator: 'anyof',
                        values: origin_country_id
                    },
                    {
                        name: 'custrecord_dps_tar_the_target_country',
                        operator: 'anyof',
                        values: target_country_id
                    }
                ],
                columns: ['custrecord_dps_tar_thre_tariff_threshold', 'custrecord_dps_tar_thre_currency']
            }).run().each(function (rec) {
                var it = {
                    tariff: rec.getValue('custrecord_dps_tar_thre_tariff_threshold'),
                    currency: rec.getValue('custrecord_dps_tar_thre_currency')
                }
                tariffs.push(it);
            });
        }
        return tariffs || false;
    }

    /**
     * 物流匹配
     * @param {*} soid 
     * @param {*} fulid 
     */
    function createLogisticsStrategy(soid, fulid) {
        var startTime = new Date().getTime();
        var SKUs = [];
        var order = {};
        var flag = true;

        var custbody_dps_distributors, // 渠道商
            custbody_dps_service_channels; // 渠道服务
        // order info
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: ['F']
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: ['F']
                },
                {
                    name: 'type',
                    operator: 'anyof',
                    values: ['SalesOrd']
                },
                {
                    name: 'type',
                    join: 'item',
                    operator: 'anyof',
                    values: ['InvtPart']
                },
                {
                    name: 'internalid',
                    operator: 'anyof',
                    values: soid
                }
            ],
            columns: [
                "custbody_dps_distributors", // 渠道商
                "custbody_dps_service_channels", // 渠道服务
                'custbody_aio_account', 'amount', 'subsidiary', 'item', 'quantity', 'location',
                {
                    name: 'custrecord_aio_enabled_sites',
                    join: 'custbody_aio_account'
                },
                {
                    name: 'internalid',
                    join: 'item'
                },
                {
                    name: 'custrecord_cc_country',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_zip',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custitem_dps_group',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_long',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_wide',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_high',
                    join: 'item'
                },
                {
                    name: 'custitem_dps_heavy2',
                    join: 'item'
                }
            ]
        }).run().each(function (result) {

            custbody_dps_distributors = rec.getValue('custbody_dps_distributors'); // 渠道商
            custbody_dps_service_channels = rec.getValue('custbody_dps_service_channels'); // 渠道服务

            if (flag) {
                order.id = soid;
                order.siteid = result.getValue({
                    name: 'custrecord_aio_enabled_sites',
                    join: 'custbody_aio_account'
                });
                order.accountid = result.getValue('custbody_aio_account');
                order.subsidiary = result.getValue('subsidiary');
                order.locationid = result.getValue('location');
                order.amount = Number(result.getValue('amount'));
                order.country = result.getValue({
                    name: 'custrecord_cc_country',
                    join: 'custbody_dps_order_contact'
                });
                order.zip = result.getValue({
                    name: 'custrecord_cc_zip',
                    join: 'custbody_dps_order_contact'
                });
                order.group = result.getValue({
                    name: 'custitem_dps_group',
                    join: 'item'
                });
                order.long = Number(result.getValue({
                    name: 'custitem_dps_long',
                    join: 'item'
                }));
                order.wide = Number(result.getValue({
                    name: 'custitem_dps_wide',
                    join: 'item'
                }));
                order.high = Number(result.getValue({
                    name: 'custitem_dps_high',
                    join: 'item'
                }));
                order.weight = 0;
                order.lwh = 0;
                flag = false;
            } else {
                order.amount = order.amount + Number(result.getValue('amount'));
            }
            var jsonstr = {};
            jsonstr.skuid = Number(result.getValue({
                name: 'internalid',
                join: 'item'
            }));
            jsonstr.quantity = Number(result.getValue('quantity'));
            jsonstr.logistics_group = Number(result.getValue({
                name: 'custitem_dps_group',
                join: 'item'
            }));
            var long = Number(result.getValue({
                name: 'custitem_dps_long',
                join: 'item'
            }));
            if (long > order.long) {
                order.long = long;
            }
            var wide = Number(result.getValue({
                name: 'custitem_dps_wide',
                join: 'item'
            }));
            if (wide > order.wide) {
                order.wide = wide;
            }
            var high = Number(result.getValue({
                name: 'custitem_dps_high',
                join: 'item'
            }));
            if (high > order.high) {
                order.high = high;
            }
            var weight = Number(result.getValue({
                name: 'custitem_dps_heavy2',
                join: 'item'
            }));
            order.weight = order.weight + weight;
            SKUs.push(jsonstr.skuid);
            return true;
        });


        if (custbody_dps_distributors && custbody_dps_service_channels) { // 存在渠道商 和 渠道服务
            log.debug('物流渠道', custbody_dps_distributors);
            log.debug('渠道服务', custbody_dps_service_channels);
            return;
        }
        order.lwh = order.long + order.wide + order.high;

        var getFilter = [];
        // 站点
        if (order.siteid) {
            getFilter.push([[ 'custrecord_lmr_site', 'anyof', order.siteid ], 'or', [ 'custrecord_lmr_site', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_site', 'isempty', [] ]);
        }
        // 账号
        getFilter.push('and');
        if (order.accountid) {
            getFilter.push([[ 'custrecord_lmr_account', 'anyof', order.accountid ], 'or', [ 'custrecord_lmr_account', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_account', 'isempty', [] ]);
        }
        // 仓库
        getFilter.push('and');
        if (order.locationid) {
            getFilter.push([[ 'custrecord_lmr_location', 'anyof', order.locationid ], 'or', [ 'custrecord_lmr_location', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_location', 'isempty', [] ]);
        }
        // 目的地
        getFilter.push('and');
        if (order.country) {
            getFilter.push([[ 'custrecord_lmr_destination.custrecord_cc_country_code', 'contains', order.country ], 'or', [ 'custrecord_lmr_destination', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_destination', 'isempty', [] ]);
        }
        // 产品
        getFilter.push('and');
        if (SKUs.length > 0) {
            getFilter.push([[ 'custrecord_lmr_sku', 'anyof', SKUs ], 'or', [ 'custrecord_lmr_sku', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_sku', 'isempty', [] ]);
        }
        // 物流分组
        getFilter.push('and');
        if (order.group) {
            getFilter.push([[ 'custrecord_lmr_logistics_group', 'anyof', order.group ], 'or', [ 'custrecord_lmr_logistics_group', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_logistics_group', 'isempty', [] ]);
        }
        // 金额范围
        getFilter.push('and');
        if (order.amount > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_amount_start', 'lessthanorequalto', order.amount ], 'and', [ 'custrecord_lmr_amount_end', 'greaterthanorequalto', order.amount ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'lessthanorequalto', order.amount ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'greaterthanorequalto', order.amount ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]]);
        }
        // 重量范围
        getFilter.push('and');
        if (order.weight > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_weight_start', 'lessthanorequalto', order.weight ], 'and', [ 'custrecord_lmr_weight_end', 'greaterthanorequalto', order.weight ]],'or',
                [[ 'custrecord_lmr_weight_start', 'lessthanorequalto', order.weight ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'greaterthanorequalto', order.weight ]], 'or',
                [[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]);
        }
        // 长度范围
        getFilter.push('and');
        if (order.long > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_length_start', 'lessthanorequalto', order.long ], 'and', [ 'custrecord_lmr_length_end', 'greaterthanorequalto', order.long ]], 'or',
                [[ 'custrecord_lmr_length_start', 'lessthanorequalto', order.long ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'greaterthanorequalto', order.long ]], 'or',
                [[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]]);
        }
        // 宽度范围
        getFilter.push('and');
        if (order.wide > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_width_start', 'lessthanorequalto', order.wide ], 'and', [ 'custrecord_lmr_width_end', 'greaterthanorequalto', order.wide ]], 'or',
                [[ 'custrecord_lmr_width_start', 'lessthanorequalto', order.wide ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'greaterthanorequalto', order.wide ]], 'or',
                [[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]]);
        }
        // 高度范围
        getFilter.push('and');
        if (order.high > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_height_start', 'lessthanorequalto', order.high ], 'and', [ 'custrecord_lmr_height_end', 'greaterthanorequalto', order.high ]], 'or',
                [[ 'custrecord_lmr_height_start', 'lessthanorequalto', order.high ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'greaterthanorequalto', order.high ]], 'or',
                [[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]]);
        }
        // 长宽高范围
        getFilter.push('and');
        if (order.lwh > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_lwh_start', 'lessthanorequalto', order.lwh ], 'and', [ 'custrecord_lmr_lwh_end', 'greaterthanorequalto', order.lwh ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'lessthanorequalto', order.lwh ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'greaterthanorequalto', order.lwh ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]]);
        }
        var searchRe = getRecBySearch(getFilter);
        log.debug('长宽高范围', searchRe);

        // 计算预估运费
        var resultJSON = costCal.calculationByRule(searchRe, order.country, order.zip, order.weight, order.long, order.wide, order.high);

        var resultObj = JSON.parse(resultJSON);
        var ful = record.load({
            type: 'customrecord_dps_shipping_small_record',
            id: fulid,
            isDynamic: true
        });
        if (resultObj.servicesId) {
            var so = record.load({
                type: 'salesorder',
                id: soid,
                isDynamic: true
            });
            so.setValue({
                fieldId: 'custbody_dps_distributors',
                value: resultObj.services_com_id
            }); // 渠道商
            so.setValue({
                fieldId: 'custbody_dps_service_channels',
                value: resultObj.servicesId
            }); // 渠道服务
            so.setValue({
                fieldId: 'custbody_dps_chargeable_weight',
                value: resultObj.costweight
            }); // 计费重量
            so.setValue({
                fieldId: 'custbody_dps_estimate_freight',
                value: resultObj.costamount.toFixed(2)
            }); // 预估运费
            so.save();
            ful.setValue({
                fieldId: 'custrecord_dps_ship_small_channel_dealer',
                value: resultObj.services_com_id
            }); // 渠道商
            ful.setValue({
                fieldId: 'custrecord_dps_ship_small_channelservice',
                value: resultObj.servicesId
            }); // 渠道服务
            ful.setValue({
                fieldId: 'custrecord_dps_ship_small_estimatedfreig',
                value: resultObj.costamount.toFixed(2)
            }); // 预估运费
            ful.setValue({
                fieldId: 'custrecord_dps_ship_small_status',
                value: 1
            }); // 匹配状态，成功
        } else {
            ful.setValue({
                fieldId: 'custrecord_dps_ship_small_status',
                value: 2
            }); // 匹配状态，失败
        }
        ful.setValue({
            fieldId: 'custrecord_dps_ship_samll_location',
            value: order.locationid
        }); // 发货仓库
        ful.save();

        log.debug('soid:' + soid + ', fullfillment end, 总共耗时：', new Date().getTime() - startTime);
    }

    function getRecBySearch(filters) {
        var p = [];
        search.create({
            type: 'customrecord_logistics_match_rule',
            filters: filters
        }).run().each(function (rec) {
            p.push(rec.id);
            return true;
        });
        return p;
    }

    return {

        post: _post
    }
});