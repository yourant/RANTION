/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["N/search", "N/record", "N/http", '../Helper/logistics_cost_calculation.js', '../Helper/location_preferred.js'], 
function (search, record, http, costCal, loactionPre) {

    function onRequest(context) {
        var soid = '103096';
        var idid = '2732';
        createLogisticsStrategy(soid, idid);

        // var locationid;
        // var positionCode = 'AAAD6610101';
        // search.create({
        //     type: 'location',
        //     filters: [
        //         { name: 'custrecord_dps_wms_location', operator: 'is', values: positionCode },
        //         { name: 'subsidiary', operator: 'is', values: '5' }
        //     ],
        //     columns : [ 'internalid' ]
        // }).run().each(function(result) {
        //     locationid = result.getValue('internalid');
        //     return false;
        // });
        // log.debug('ss', locationid);


        // var resultJSON = {};
        // resultJSON.costamount = 0;
        // var a = [];
        // a.push('125');
        // var cost = costCal.calculation(a, 'US', '232344', 1, 1, 2, 3, '', 1, 2, 3, 4);

        
        // var itemreceiptrecord = record.load({ type: 'itemfulfillment', id: '8', isDynamic: true });
        // // var lineNum = itemreceiptrecord.getLineCount({
        // //     sublistId: 'submachine'
        // // });
        // log.debug('sdsd', JSON.stringify(itemreceiptrecord));

        // search.create({
        //     type: 'location',
        //     filters: [
        //         { name: 'custrecord_dps_wms_location', operator: 'is', values: 'gzhdc' },
        //         { name: 'custrecord_wms_location_type', operator: 'noneof', values: ['2'] }
        //     ],
        //     columns : [ 'internalid' ]
        // }).run().each(function(result) {
        //     if (!locationInfo.id) {
        //         locationInfo.id = result.getValue('internalid');
        //         locationInfo.code = result.getValue('custrecord_dps_wms_location');
        //         locationInfo.name = result.getValue('custrecord_dps_wms_location_name');
        //     }
        //     idsP.push(result.getValue('internalid'));
        // });



        // search.create({
        //     type: 'location',
        //     filters: [
        //         // { name: 'internalid', operator: 'anyof', values: idsP },
        //         { name: 'custrecord_wms_location_type', operator: 'noneof', values: ['3'] }
        //     ],
        //     columns : [ 
        //         'internalid', 'parent'
        //     ]
        // }).run().each(function(result) {
        //     ids.push(result.getValue('parent'));
        // });
        // log.debug('ids', ids)



        // var gl_Record = search.create({
        //     type: "itemreceipt",
        //     filters:
        //         [
        //             ["internalid", "anyof", "1356"]
        //         ],
        //     columns:
        //         [
        //             "account",
        //             "debitamount",
        //             "creditamount",
        //             "posting",
        //             "memo",
        //             "entity",
        //             "department",
        //             "class",
        //             "location"
        //         ]
        // });
        // gl_Record.run().each(function (result) {
            
        //     log.debug('Checking ' + result.getValue('account')  );
        
        //     account.push(       result.getValue('account')     );
        //     debit.push(         result.getValue('debitamount') );
        //     credit.push(        result.getValue('creditamount'));
        //     posting.push(       result.getValue('posting')     );
        //     memo.push(          result.getValue('memo')        );
        //     name.push(          result.getValue('entity')      );
        //     department.push(    result.getValue('entity')      );
        //     class_category.push(result.getValue('class')       );
        //     location.push(      result.getValue('location')    );
        
        //     return true;
        // });


        // var Authorization = 'Basic bnMtc2VydmVyOm5zLXNlcnZlci10ZXN0';
        // var headerInfo = {
        //     'Content-Type' : 'application/x-www-form-urlencoded',
        //     'Accept' : 'application/json',
        //     'Authorization' : Authorization
        // };
        // var response = http.post({
        //     url : 'http://47.107.254.110:18082/rantion-user/oauth/token',
        //     headers : headerInfo,
        //     body : ["grant_type=client_credentials"].join('&')
        // });
        // if (response.code == 200) {
        //     var res = JSON.parse(response.body);
        //     record.submitFields({
        //         type: 'customrecord_wms_token',
        //         id: '1',
        //         values: {
        //             'custrecord_wtr_token': res.access_token
        //         }
        //     });
        // }
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
