/*
 * @Author         : Li
 * @Date           : 2020-05-14 20:36:32
 * @LastEditTime   : 2020-05-26 17:28:11
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \douples_amazon\dps.create.ful.record.mp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['../Rantion/Helper/logistics_cost_calculation.js', 'N/record', 'N/search', 'N/log'],
function (costCal, record, search, log) {

    function getInputData() {
        var limit = 3999,
            order = [];
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: true
                },
                // 是否生成小货发运记录
                {
                    name: 'custbody_dps_so_create_ful_record',
                    operator: 'is',
                    values: true
                },
                // 关联的小货发运记录为空
                {
                    name: 'custbody_dps_small_fulfillment_record',
                    operator: 'anyof',
                    values: '@NONE@'
                }
            ]
        }).run().each(function (rec) {
            order.push(rec.id);
            return --limit > 0;
        });


        log.debug('order length: ' + order.length, order);

        return order;

    }

    function map(context) {

        try {
            var value = context.value;
            var create_ful_rec_id = createFulfillmentRecord(value, 'value');
            if (create_ful_rec_id) {
                createLogisticsStrategy(value, create_ful_rec_id);
            }
        } catch (error) {
            log.error('创建发运记录 error', error);
        }

    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    /**
     * 生成发运记录, 关联销售订单
     * @param {*} soid 
     * @param {*} sku 
     * @returns {*} 返回生成的发运记录的ID, 或者 false;
     */
    function createFulfillmentRecord(soid, sku) {

        var location, item, quantity, api_content, tranid, otherrefnum, account, marketplaceid, amount;
        var first_name, cc_country, cc_state, cc_ctiy, cc_zip, cc_addr1, cc_addr2, cc_phone_number;
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
                    name: "type",
                    join: "item",
                    operator: "noneof",
                    values: "OthCharge"
                }
            ],
            columns: ['location', 'item', 'quantity', 'custbody_aio_api_content', 'tranid', 'amount',
                'otherrefnum', 'custbody_aio_account', 'custcol_dps_trans_order_item_sku', 'custbody_aio_marketplaceid',
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
                }

            ]
        }).run().each(function (rec) {

            amount = rec.getValue('amount');
            location = rec.getValue('location');
            var info = {
                item: rec.getValue('item'),
                quantity: rec.getValue('quantity'),
                sku: rec.getValue('custcol_dps_trans_order_item_sku')
            }
            item_arr.push(info);
            api_content = rec.getValue('custbody_aio_api_content');
            tranid = rec.getValue('tranid');
            otherrefnum = rec.getValue('otherrefnum');
            account = rec.getValue('custbody_aio_account');
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


        log.debug('location', location);
        if (location) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_samll_location', //发运仓库 
                value: location
            });
        }

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_order_number', //订单号 
            value: tranid
        });
        log.debug('tranid', tranid);

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_platform_order_numbe', //平台订单号 
            value: otherrefnum
        });
        log.debug('otherrefnum', otherrefnum);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_status', //状态 
            value: 1
        });

        log.debug('marketplaceid', marketplaceid);
        if (marketplaceid) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_sales_platform', //销售平台 
                value: marketplaceid ? marketplaceid : ''
            });
        }

        log.debug('account', account);
        if (account) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_account', //销售店铺 
                value: account
            });
        }

        var sub_id = 'recmachcustrecord_dps_ship_small_links';

        log.debug('item_arr', item_arr);
        for (var i = 0, len = item_arr.length; i < len; i++) {
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
                value: item_arr[i].quantity
            });
        }

        log.debug('cc_ctiy', cc_ctiy);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_recipient_city',
            value: cc_ctiy
        });

        log.debug('cc_zip', cc_zip);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_recipien_code',
            value: cc_zip
        });

        log.debug('cc_state', cc_state);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_s_state',
            value: cc_state ? cc_state : ''
        });

        var c_country;
        if (cc_country) {
            c_country = searchCountryByCode(cc_country);
        }

        log.debug('c_country', c_country);
        if (c_country) {
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_recipient_country',
                value: c_country
            });
        }

        log.debug('cc_addr1', cc_addr1);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_street1',
            value: cc_addr1 ? cc_addr1 : ''
        });

        log.debug('cc_addr2', cc_addr2);
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_street2',
            value: cc_addr2 ? cc_addr2 : ''
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_destination', //目的地 
            value: first_name + '\n' + cc_addr1 + '\n' + cc_addr2 + '\n' + cc_zip + '\n' + cc_ctiy + '\n' + cc_state + '\n' + cc_country
        });

        if (first_name) {
            first_name += ',';
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
        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_addressee_address', // 收件人地址
            value: first_name + cc_addr1 + cc_addr2 + cc_zip + cc_ctiy + cc_state + cc_country
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_recipient', //  收件人 
            value: first_name
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_phone', //  联系电话 
            value: cc_phone_number ? cc_phone_number : ''
        });

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_small_salers_order', // 关联的销售订单
            value: soid
        });

        try {

            var set_value = 0;
            var temp = getDeclaredValue(cc_country, location);

            log.debug('typeof(temp)', typeof (temp));
            // temp = JSON.parse(temp);
            var dec_value = temp[0].tariff;
            var currency = temp[0].currency;
            log.debug('cureency', currency);
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

            log.audit('set_value', set_value);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_declared_value',
                value: set_value
            });
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_declare_currency',
                value: Number(currency)
            });
        } catch (error) {
            log.error('设置申报价值报错了', error);
        }

        var ful_create_rec_id = ful_create_rec.save({
            ignoreMandatoryFields: true
        });
        log.audit('发运记录生成成功, ID： ', ful_create_rec_id);

        if (ful_create_rec_id) {
            // custbody_dps_small_fulfillment_record    关联的小货发运记录
            var otherId = record.submitFields({
                type: 'salesorder',
                id: soid,
                values: {
                    'custbody_dps_small_fulfillment_record': ful_create_rec_id
                }
            });
            log.debug('otherId', otherId);
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
        search.create({
            type: 'location',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: locationid
            }],
            columns: [{
                name: 'custrecord_aio_country_sender'
            }]
        }).run().each(function (rec) {
            country_id = rec.getValue('custrecord_aio_country_sender');
        });

        return country_id || false;
    }

    /**
     * 根据国家简码, 搜索对应的国家记录
     * @param {*} code 
     */
    function searchCountryByCode(code) {

        log.debug('code', code);
        var country_id;
        search.create({
            type: 'customrecord_country_code',
            filters: [{
                name: "custrecord_cc_country_code",
                operator: "startswith",
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
     * @param {*} locationid 
     */
    function getDeclaredValue(code, locationid) {

        var t = searchCountryByCode(code);
        var f = getLocationCode(locationid);

        log.debug('t: ' + t, 'f: ' + f);

        var tariff = [];
        if (t && f) {
            search.create({
                type: 'customrecord_dps_tariff_threshold',
                filters: [{
                        name: 'custrecord_dps_tar_the_country_origin',
                        operator: 'anyof',
                        values: f
                    },
                    {
                        name: 'custrecord_dps_tar_the_target_country',
                        operator: 'anyof',
                        values: t
                    }
                ],
                columns: [{
                        name: 'custrecord_dps_tar_thre_tariff_threshold'
                    },
                    {
                        name: 'custrecord_dps_tar_thre_currency'
                    }
                ]
            }).run().each(function (rec) {
                var it = {
                    tariff: rec.getValue('custrecord_dps_tar_thre_tariff_threshold'),
                    currency: rec.getValue('custrecord_dps_tar_thre_currency')
                }
                tariff.push(it);
            });
        }

        log.debug('getDeclaredValue tariff', tariff);

        return tariff || false;
    }

    function createLogisticsStrategy(soid, fulid) {
        var startTime = new Date().getTime();
        var SKUs = [];
        var order = {};
        var flag = true;
        // order info
        search.create({
            type: 'salesorder',
            filters: [
                { name: 'mainline', operator: 'is', values: [ 'F' ] },
                { name: 'taxline', operator: 'is', values: [ 'F' ] },
                { name: 'type', operator: 'anyof', values: [ 'SalesOrd' ]},
                { name: 'type', join: 'item', operator: 'anyof', values: [ 'InvtPart' ]},
                { name: 'internalid', operator: 'anyof', values: soid }
            ],
            columns : [
                'custbody_aio_account', 'amount', 'subsidiary', 'item', 'quantity', 'location',
                { name: 'custrecord_aio_enabled_sites', join: 'custbody_aio_account' },
                { name: 'internalid', join: 'item' },
                { name: 'custrecord_cc_country', join: 'custbody_dps_order_contact' },
                { name: 'custrecord_cc_zip', join: 'custbody_dps_order_contact' },
                { name: 'custitem_dps_group', join: 'item' },
                { name: 'custitem_dps_long', join: 'item' },
                { name: 'custitem_dps_wide', join: 'item' },
                { name: 'custitem_dps_high', join: 'item' },
                { name: 'custitem_dps_weight', join: 'item' }
            ]
        }).run().each(function(result) {
            if (flag) {
                order.id = soid;
                order.siteid = result.getValue({ name: 'custrecord_aio_enabled_sites', join: 'custbody_aio_account' });
                order.accountid = result.getValue('custbody_aio_account');
                order.subsidiary = result.getValue('subsidiary');
                order.locationid = result.getValue('location');
                order.amount = Number(result.getValue('amount'));
                order.country = result.getValue({ name: 'custrecord_cc_country', join: 'custbody_dps_order_contact' });
                order.zip = result.getValue({ name: 'custrecord_cc_zip', join: 'custbody_dps_order_contact' });
                order.group = result.getValue({ name: 'custitem_dps_group', join: 'item' });
                order.long = Number(result.getValue({ name: 'custitem_dps_long', join: 'item' }));
                order.wide = Number(result.getValue({ name: 'custitem_dps_wide', join: 'item' }));
                order.high = Number(result.getValue({ name: 'custitem_dps_high', join: 'item' }));
                order.weight = 0;
                order.lwh = 0;
                flag = false;
            } else {
                order.amount = order.amount + Number(result.getValue('amount'));
            }
            var jsonstr = {};
            jsonstr.skuid = Number(result.getValue({ name: 'internalid', join: 'item' }));
            jsonstr.quantity = Number(result.getValue('quantity'));
            jsonstr.logistics_group = Number(result.getValue({ name: 'custitem_dps_group', join: 'item' }));
            var long = Number(result.getValue({ name: 'custitem_dps_long', join: 'item' }));
            if (long > order.long) {
                order.long = long;
            }
            var wide = Number(result.getValue({ name: 'custitem_dps_wide', join: 'item' }));
            if (wide > order.wide) {
                order.wide = wide;
            }
            var high = Number(result.getValue({ name: 'custitem_dps_high', join: 'item' }));
            if (high > order.high) {
                order.high = high;
            }
            var weight = Number(result.getValue({ name: 'custitem_dps_weight', join: 'item' }));
            order.weight = order.weight + weight;
            SKUs.push(jsonstr);
            return true;
        });
        order.lwh = order.long + order.wide + order.high;

        var getFilter = [];
        var searchRe = [];
        var searchARe = [];
        var searchVRe = [];
        var searchZRe = [];
        // 站点
        if (order.siteid) {
            getFilter.push({ name: 'custrecord_lmr_site', operator: 'anyof', values: order.siteid });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_site', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        log.debug('站点', searchRe);

        // 账号
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.accountid) {
            getFilter.push({ name: 'custrecord_lmr_account', operator: 'anyof', values: order.accountid });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_account', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('账号', searchRe);

        // 仓库
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.locationid) {
            getFilter.push({ name: 'custrecord_lmr_location', operator: 'anyof', values: order.locationid });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_location', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('仓库', searchRe);

        // 目的地
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.country) {
            getFilter.push({ name: 'custrecord_cc_country_code', join: 'custrecord_lmr_destination', operator: 'contains', values: order.country });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_cc_country_code', join: 'custrecord_lmr_destination', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('目的地', searchRe);

        // 产品
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (SKUs.length > 0) {
            getFilter.push({ name: 'internalid', join: 'custrecord_lmr_sku', operator: 'anyof', values: SKUs });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'internalid', join: 'custrecord_lmr_sku',  operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('产品', searchRe);

        // 物流分组
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.group) {
            getFilter.push({ name: 'custrecord_lmr_logistics_group', operator: 'anyof', values: order.group });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_logistics_group', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('物流分组', searchRe);

        // 金额范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.amount > 0) {
            getFilter.push({ name: 'custrecord_lmr_weight_start', operator: 'lessthanorequalto', values: order.amount });
            getFilter.push({ name: 'custrecord_lmr_weight_end', operator: 'greaterthanorequalto', values: order.amount });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_weight_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_weight_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('重量范围', searchRe);

        // 重量范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.weight > 0) {
            getFilter.push({ name: 'custrecord_lmr_weight_start', operator: 'lessthanorequalto', values: order.weight });
            getFilter.push({ name: 'custrecord_lmr_weight_end', operator: 'greaterthanorequalto', values: order.weight });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_weight_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_weight_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('重量范围', searchRe);

        // 长度范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.long > 0) {
            getFilter.push({ name: 'custrecord_lmr_length_start', operator: 'lessthanorequalto', values: order.long });
            getFilter.push({ name: 'custrecord_lmr_length_end', operator: 'greaterthanorequalto', values: order.long });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_length_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_length_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('长度范围', searchRe);

        // 宽度范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.wide > 0) {
            getFilter.push({ name: 'custrecord_lmr_width_start', operator: 'lessthanorequalto', values: order.wide });
            getFilter.push({ name: 'custrecord_lmr_width_end', operator: 'greaterthanorequalto', values: order.wide });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_width_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_width_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('宽度范围', searchRe);

        // 高度范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.high > 0) {
            getFilter.push({ name: 'custrecord_lmr_height_start', operator: 'lessthanorequalto', values: order.high });
            getFilter.push({ name: 'custrecord_lmr_height_end', operator: 'greaterthanorequalto', values: order.high });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_height_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_height_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('高度范围', searchRe);

        // 长宽高范围
        getFilter = [];
        searchARe = [];
        searchVRe = [];
        searchZRe = [];
        if (order.lwh > 0) {
            getFilter.push({ name: 'custrecord_lmr_lwh_start', operator: 'lessthanorequalto', values: order.lwh });
            getFilter.push({ name: 'custrecord_lmr_lwh_end', operator: 'greaterthanorequalto', values: order.lwh });
            searchARe = getRecBySearch(getFilter);
        }
        getFilter = [];
        getFilter.push({ name: 'custrecord_lmr_lwh_start', operator: 'isempty' });
        getFilter.push({ name: 'custrecord_lmr_lwh_end', operator: 'isempty' });
        searchVRe = getRecBySearch(getFilter);
        searchZRe = searchARe.concat(searchVRe.filter(function (val) { return !(searchARe.indexOf(val) > -1) }));
        searchRe = searchRe.filter(function (val) { return searchZRe.indexOf(val) > -1 });
        log.debug('长宽高范围', searchRe);
        
        // 计算预估运费
        var resultJSON = costCal.calculationByRule(searchRe, order.country, order.zip, order.weight, order.long, order.wide, order.high);

        var resultObj = JSON.parse(resultJSON);
        var ful = record.load({ type: 'customrecord_dps_shipping_small_record', id: fulid, isDynamic: true });
        if (resultObj.servicesId) {
            var so = record.load({ type: 'salesorder', id: soid, isDynamic: true });
            so.setValue({ fieldId: 'custbody_dps_distributors', value: resultObj.services_com_id }); // 渠道商
            so.setValue({ fieldId: 'custbody_dps_service_channels', value: resultObj.servicesId }); // 渠道服务
            so.setValue({ fieldId: 'custbody_dps_chargeable_weight', value: resultObj.costweight }); // 计费重量
            so.setValue({ fieldId: 'custbody_dps_estimate_freight', value: resultObj.costamount }); // 预估运费
            so.save();
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_channel_dealer', value: resultObj.services_com_id }); // 渠道商
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_channelservice', value: resultObj.servicesId }); // 渠道服务
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_estimatedfreig', value: resultObj.costamount }); // 预估运费
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 1 }); // 匹配状态，成功
        } else {
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 3 }); // 匹配状态，失败
        }
        ful.setValue({ fieldId: 'custrecord_dps_ship_samll_location', value: order.locationid }); // 发货仓库
        ful.save();

        log.debug('fullfillment end, 总共耗时：', new Date().getTime() - startTime);
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
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});