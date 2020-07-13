/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["N/search", "N/record", "N/http", 'N/url', 'N/https', '../Helper/logistics_cost_calculation.js', '../Helper/location_preferred.js', '../../douples_amazon/Helper/Moment.min.js', 'N/format', 'N/runtime'], 
function (search, record, http, url, https, costCal, loactionPre, moment, format, runtime) {

    function onRequest(context) {
        // var response = context.response;
        // var soid = '20362';
        // var idid = '3';
        // createLogisticsStrategy(soid, idid);

        // log.debug('runtime', JSON.stringify(runtime));

        // var poRec = record.create({ type: 'purchaseorder', isDynamic: true });
        // poRec.setValue({ fieldId: 'entity', value: 8060 });
        // poRec.setValue({ fieldId: 'currency', value: 1 });
        // poRec.setValue({ fieldId: 'location', value: 155 });
        // poRec.setValue({ fieldId: 'custbody_dps_type', value: '6' });
        // // var skus = poData.skus;
        // // for (var index = 0; index < skus.length; index++) {
        //     // log.debug('skus', JSON.stringify(skus));
        //     poRec.selectNewLine({ sublistId: 'item' });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 12449 });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 321 });
        //     // poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: poData.to_subsidiary_location });
        //     poRec.commitLine({ sublistId: 'item' });
        // // }
        // poid = poRec.save();

        search.create({
            type: 'customrecord_dps_juge_po',
            filters: [
                { name: 'custrecord_juge_sho', operator: 'is', values: false }
            ],
            columns: [
                'custrecord_juge_po_2', 'custrecord_juge_time_2', 'custrecord_juge_product_2', 'custrecord_juge_quantiy_2', 'custrecord_juge_location_2'
            ]
        }).run().each(function (rec) {
            
            var po = rec.getValue('custrecord_juge_po_2');
            var sku = rec.getValue('custrecord_juge_product_2');
            var qty = Number(rec.getValue('custrecord_juge_quantiy_2'));
            var location_IR = rec.getValue('custrecord_juge_location_2');
            var date = rec.getValue('custrecord_juge_time_2');
            log.debug('date', date);
            log.debug('date', format.format({ type: format.Type.DATE, value: date }));
            log.debug('采购订单收货', 'po:' + po + ',sku:' + sku + ',qty:' + qty + ',location_IR:' + location_IR);

            var itemReceipt = record.transform({
                fromType:'purchaseorder',
                toType: record.Type.ITEM_RECEIPT,
                fromId: Number(po),
            });
            itemReceipt.setValue({ fieldId: 'trandate', value: format.format({ type: format.Type.DATE, value: date }) });
            var lineIR = itemReceipt.getLineCount({ sublistId: 'item' });
            for (var i = 0; i < lineIR; i++) {
                var itemre = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                if (itemre != sku) {
                    itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
                    continue;
                }
                itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location_IR, line: i });
                itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: i });
            }
            itemReceipt.save();

            record.submitFields({
                type: 'customrecord_dps_juge_po',
                id: rec.id,
                values: {
                    custrecord_juge_sho: 'T'
                }
            });

            return false;
        });



    }

    function splitMonthToWeek(monthStartDate, skuqty) {
        var firstDay = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1);
        var monthDays = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0).getDate();
        var day_qty_a = Math.floor(skuqty / monthDays);
        var day_qty_l = skuqty - (day_qty_a * (monthDays - 1));
        var week_data = {};
        var weeks_no = [];
        for (var index = 0; index < monthDays; index++) {
            var qty = day_qty_a;
            if ((index + 1) == monthDays) {
                qty = day_qty_l;
            }
            // if (qty > 0) {
                var day = new Date(firstDay.getTime() + (24 * 60 * 60 * 1000 * index));
                var weeknum = getWeek(day);
                var data = week_data[weeknum];
                if (data) {
                    data.qty = data.qty + qty;
                } else {
                    var json = {};
                    json.qty = qty;
                    week_data[weeknum] = json;
                    weeks_no.push(weeknum);
                }
            // }
        }
        week_data['weeks'] = weeks_no;
        return week_data;
    }

    function getWeek(day) {
        var d1 = new Date(day);
        var d2 = new Date(day);
        d2.setMonth(0);
        d2.setDate(1);
        var numweekf = d2.getDay();
        var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
        var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
        var num = Math.ceil(days / 7);
        return num;
    }

    String.prototype.format = function() {
        if (arguments.length == 0) {
            return this;
        }
        var param = arguments[0];
        var str = this;
        if (typeof(param) == 'object') {
            for(var key in param) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
            }
            return str;
        } else {
            for(var i = 0; i < arguments.length; i++) {
                str = str.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
            }
            return str;
        }
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
                { name: 'custitem_dps_heavy2', join: 'item' }
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
            var weight = Number(result.getValue({ name: 'custitem_dps_heavy2', join: 'item' }));
            order.weight = order.weight + weight;
            SKUs.push(jsonstr.skuid);
            return true;
        });
        order.lwh = order.long + order.wide + order.high;

        // var getFsilter = [];
        // // s
        // // 重量范围
        // getFilter.push('and');
        // if (order.weight > 0) {
        //     getFilter.push([[ 'custrecord_lmr_weight_start', 'lessthanorequalto', order.weight ], 'and', [ 'custrecord_lmr_weight_end', 'greaterthanorequalto', order.weight ]]);
        // } else {
        //     getFilter.push([[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]);
        // }
        // // 长度范围
        // getFilter.push('and');
        // if (order.long > 0) {
        //     getFilter.push([[ 'custrecord_lmr_length_start', 'lessthanorequalto', order.long ], 'and', [ 'custrecord_lmr_length_end', 'greaterthanorequalto', order.long ]]);
        // } else {
        //     getFilter.push([[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]]);
        // }
        // // 宽度范围
        // getFilter.push('and');
        // if (order.wide > 0) {
        //     getFilter.push([[ 'custrecord_lmr_width_start', 'lessthanorequalto', order.wide ], 'and', [ 'custrecord_lmr_width_end', 'greaterthanorequalto', order.wide ]]);
        // } else {
        //     getFilter.push([[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]]);
        // }
        // // 高度范围
        // getFilter.push('and');
        // if (order.high > 0) {
        //     getFilter.push([[ 'custrecord_lmr_height_start', 'lessthanorequalto', order.high ], 'and', [ 'custrecord_lmr_height_end', 'greaterthanorequalto', order.high ]]);
        // } else {
        //     getFilter.push([[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]]);
        // }
        // // 长宽高范围
        // getFilter.push('and');
        // if (order.lwh > 0) {
        //     getFilter.push([[ 'custrecord_lmr_lwh_start', 'lessthanorequalto', order.lwh ], 'and', [ 'custrecord_lmr_lwh_end', 'greaterthanorequalto', order.lwh ]]);
        // } else {
        //     getFilter.push([[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]]);
        // }
        // log.debug('getFilter', JSON.stringify(getFilter));
        // var searchRe = getRecBySearch(getFilter);
        // log.debug('searchRe', JSON.stringify(searchRe));
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
        
        log.debug('searchRe', JSON.stringify(searchRe) + JSON.stringify(order));
        // 计算预估运费
        var resultJSON = costCal.calculationByRule(searchRe, order.country, order.zip, order.weight, order.long, order.wide, order.high);

        log.debug('cost', JSON.stringify(resultJSON));
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
            // custrecord_dps_ship_small_ship_weight
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 1 }); // 匹配状态，成功
            
            log.debug('sss');
        } else {
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 3 }); // 匹配状态，失败
        }
        ful.setValue({ fieldId: 'custrecord_dps_ship_samll_location', value: order.locationid }); // 发货仓库
        ful.save();
        log.debug('sssdddd');

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
        onRequest: onRequest
    }
});
