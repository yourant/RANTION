define(['N/search'], function(search) {

    /**
     * 根据渠道服务、shipto信息及包裹信息，计算预估运费
     * @param {*} servicesId (小包、大货)渠道服务ID
     * @param {*} country (小包、大货)目标国家简码，例：'US'
     * @param {*} zip (小包)目标地区邮编
     * @param {*} weight (小包)包裹重量g
     * @param {*} long (小包)包裹长度cm
     * @param {*} wide (小包)包裹宽度cm
     * @param {*} high (小包)包裹高度cm
     * @param {*} city (大货)始发地
     * @param {*} departure (大货)始发港
     * @param {*} location (大货)仓库，大货目标仓库--亚马逊仓库
     * @param {*} destination (大货)目的港
     * @param {*} containerType (大货)装柜类型，20GP、40GP、40HQ、45HQ
     */
    function calculation(servicesId, country, zip, weight, long, wide, high, city, departure, location, destination, containerType) {
        var cost_type;
        search.create({
            type: 'customrecord_logistics_service',
            filters: [
                { name: 'internalid', operator: 'anyof', values: servicesId },
                { name: 'custrecord_ls_logistics_state', operator: 'anyof', values: ['1'] },
                { name: 'custrecord_lc_logistics_state', join: 'custrecord_ls_logistics_company', operator: 'anyof', values: ['1'] },
            ],
            columns: ['custrecord_ls_cost_type']
        }).run().each(function (result) {
            cost_type = result.getValue('custrecord_ls_cost_type');
            return true;
        });
        var resultJSON = {};
        resultJSON.costamount = 0;
        if (cost_type) {
            // 首重续重
            if (cost_type == 1) {
                resultJSON = costTypeA(resultJSON, servicesId, weight, country, long, wide, high);
            }
            // 重量区间
            if (cost_type == 2) {
                resultJSON = costTypeB(resultJSON, servicesId, zip, weight, long, wide, high, country);
            }
            // 海运
            if (cost_type == 3) {
                resultJSON = costTypeC(resultJSON, servicesId, city, departure, location, country, destination, containerType);
            }
            // 空运
            if (cost_type == 4) {
                resultJSON = costTypeD(resultJSON, servicesId, departure, location, city, weight, country);
            }
        }
        return resultJSON.costamount;
    }

    /**
     * 根据渠道规则、shipto信息及包裹信息，计算预估运费
     * @param {*} ruleIds 渠道规则ID
     * @param {*} country 目标国家简码，例：'US'
     * @param {*} zip 目标地区邮编
     * @param {*} weight 包裹重量
     * @param {*} long 包裹长度
     * @param {*} wide 包裹宽度
     * @param {*} high 包裹高度
     * @param {*} city 始发地
     * @param {*} departure 始发港
     * @param {*} location 仓库，大货目标仓库--亚马逊仓库
     * @param {*} destination 目的港
     * @param {*} containerType 装柜类型
     */
    function calculationByRule(ruleIds, country, zip, weight, long, wide, high, city, departure, location, destination, containerType) {
        var servicesIdsTypeA = [];
        var servicesIdsTypeB = [];
        var servicesIdsTypeC = [];
        var servicesIdsTypeD = [];
        search.create({
            type: 'customrecord_logistics_match_rule',
            filters: [
                { name: 'internalid', operator: 'anyof', values: ruleIds },
                { name: 'custrecord_ls_logistics_state', join: 'custrecord_lmr_logistics_service', operator: 'anyof', values: ['1'] }
            ],
            columns: [
                { name: 'internalid', join: 'custrecord_lmr_logistics_service' },
                { name: 'custrecord_ls_cost_type', join: 'custrecord_lmr_logistics_service' }
            ]
        }).run().each(function (rec) {
            var costType = rec.getValue({ name: 'custrecord_ls_cost_type', join: 'custrecord_lmr_logistics_service' });
            var id = rec.getValue({ name: 'internalid', join: 'custrecord_lmr_logistics_service' });
            if (costType == 1) {
                servicesIdsTypeA.push(id);
            }
            if (costType == 2) {
                servicesIdsTypeB.push(id);
            }
            if (costType == 3) {
                servicesIdsTypeC.push(id);
            }
            if (costType == 4) {
                servicesIdsTypeD.push(id);
            }
            return true;
        });
        var resultJSON = {};
        resultJSON.costamount = 0;
        // 首重续重
        if (servicesIdsTypeA.length > 0) {
            resultJSON = costTypeA(resultJSON, servicesIdsTypeA, weight, country, long, wide, high);
        }
        // 重量区间
        if (servicesIdsTypeB.length > 0) {
            resultJSON = costTypeB(resultJSON, servicesIdsTypeB, zip, weight, long, wide, high, country);
        }
        // 海运
        if (servicesIdsTypeC.length > 0) {
            resultJSON = costTypeC(resultJSON, servicesIdsTypeC, city, departure, location, country, destination, containerType);
        }
        // 空运
        if (servicesIdsTypeD.length > 0) {
            resultJSON = costTypeD(resultJSON, servicesIdsTypeD, departure, location, city, weight, country);
        }
        return JSON.stringify(resultJSON);
    }

    /**
     * 计算计费重量
     * @param {*} long 产品长度cm
     * @param {*} wide 产品宽度cm
     * @param {*} high 产品高度cm
     * @param {*} bubble 计泡基数g
     * @param {*} bubbleType 计泡重量算法类型
     * @param {*} weight 产品实重
     */
    function calcuationCostWeight(long, wide, high, bubble, bubbleType, weight) {
        var bweight = (long * wide * high) / bubble * 1000; // 计泡重量g
        // 默认没有计泡重量，实重就是计费重
        var costCardinality = weight; // 计费重g
        // 计泡重量和实重比较，谁大取谁
        if (bubbleType == 2) {
            costCardinality = bweight > weight ? bweight : weight;
        }
        return costCardinality;
    }

    /**
     * 首重续重
     * @param {*} resultJSON 
     * @param {*} servicesIds 渠道服务ID
     * @param {*} weight 产品重量
     * @param {*} country 目标国家简码，例：'US'
     * @param {*} long 产品长度
     * @param {*} wide 产品宽度
     * @param {*} high 产品高度
     */
    function costTypeA(resultJSON, servicesIds, weight, country, long, wide, high) {
        var filters = [];
        filters.push(['custrecord_lco_service', 'anyof', servicesIds]);
        filters.push('and');
        if (weight) {
            filters.push([['custrecord_lco_weight_start', 'lessthanorequalto', weight], 'or', ['custrecord_lco_weight_start', 'is', '@NONE@']]);
            filters.push('and');
            filters.push([['custrecord_lco_weight_end', 'greaterthanorequalto', weight], 'or', ['custrecord_lco_weight_end', 'is', '@NONE@']]);
        } else {
            filters.push(['custrecord_lco_weight_start', 'anyof', '@NONE@']);
            filters.push('and');
            filters.push(['custrecord_lco_weight_end', 'anyof', '@NONE@']);
        }
        search.create({
            type: 'customrecord_logistics_cost',
            filters: filters,
            columns: [
                'custrecord_lco_first_weight', 'custrecord_lco_first_weight_cost', 'custrecord_lco_following_weight_cost',
                'custrecord_lco_registration_fee', 'custrecord_lco_attach_first_weight', 'custrecord_lco_attach_first_weight_cost',
                'custrecord_lco_attach_follow_weight_cost', 'custrecord_lco_discount',
                { name: 'internalid', join: 'custrecord_lco_service' },
                { name: 'custrecord_ls_bubble_count', join: 'custrecord_lco_service' },
                { name: 'custrecord_ls_logistics_company', join: 'custrecord_lco_service' },
                { name: 'custrecord_ls_bubble_type', join: 'custrecord_lco_service' },
                { name: 'custrecord_cc_country_code', join: 'custrecord_lco_country' }
            ]
        }).run().each(function (result) {
            var countryCode = result.getValue({ name: 'custrecord_cc_country_code', join: 'custrecord_lco_country' });
            if (country && country != countryCode) {
                return true;
            }
            var bubble = Number(result.getValue({ name: 'custrecord_ls_bubble_count', join: 'custrecord_lco_service' }));
            var bubbleType = result.getValue({ name: 'custrecord_ls_bubble_type', join: 'custrecord_lco_service' });
            var tureWeight = calcuationCostWeight(long, wide, high, bubble, bubbleType, weight); // 计费重量
            var weightF = Number(result.getValue('custrecord_lco_first_weight')); // 首重
            var weightFcost = Number(result.getValue('custrecord_lco_first_weight_cost')); // 首重费
            var weightFollcost = Number(result.getValue('custrecord_lco_following_weight_cost')); // 续重费用
            var weightRcost = Number(result.getValue('custrecord_lco_registration_fee')); // 挂号费
            var discount = Number(result.getValue('custrecord_lco_discount')); // 折扣
            var weightAttF = Number(result.getValue('custrecord_lco_attach_first_weight')); // 附加首重
            var weightAttFcost = Number(result.getValue('custrecord_lco_attach_first_weight_cost')); // 附加首重费
            var weightAttFollcost = Number(result.getValue('custrecord_lco_attach_follow_weight_cost')); // 附加续重费用
            var cost = 0;
            if (tureWeight > weightF) {
                cost = (((tureWeight - weightF) * weightFollcost) * discount) + weightRcost;
            } else {
                cost = weightFcost;
            }
            if (tureWeight > weightAttF) {
                cost = cost + ((tureWeight - weightAttF) * weightAttFollcost);
            } else {
                cost = cost + weightAttFcost;
            }
            if (resultJSON.costamount == 0 || cost < resultJSON.costamount) {
                resultJSON.servicesId = result.getValue({ name: 'internalid', join: 'custrecord_lco_service' });
                resultJSON.services_com_id = result.getValue({ name: 'custrecord_ls_logistics_company', join: 'custrecord_lco_service' });
                resultJSON.costweight = tureWeight;
                resultJSON.costamount = cost;
            }
            return true;
        });
        return resultJSON;
    }

    /**
     * 重量区间
     * @param {*} resultJSON 
     * @param {*} servicesIds 渠道服务ID
     * @param {*} zip 目的地邮编
     * @param {*} weight 产品重量
     * @param {*} long 产品长度
     * @param {*} wide 产品宽度
     * @param {*} high 产品高度
     * @param {*} country 目标国家简码，例：'US'
     */
    function costTypeB(resultJSON, servicesIds, zip, weight, long, wide, high, country) {
        var filters = [];
        filters.push(['custrecord_lcl_logistics_services_link', 'anyof', servicesIds]);
        filters.push('and');
        if (weight) {
            filters.push([['custrecord_lcl_weight_start', 'lessthanorequalto', weight], 'or', ['custrecord_lcl_weight_start', 'is', '@NONE@']]);
            filters.push('and');
            filters.push([['custrecord_lcl_weight_end', 'greaterthanorequalto', weight], 'or', ['custrecord_lcl_weight_end', 'is', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcl_weight_start', 'anyof', '@NONE@']);
            filters.push('and');
            filters.push(['custrecord_lcl_weight_end', 'anyof', '@NONE@']);
        }
        search.create({
            type: 'customrecord_logistics_cost_labber',
            filters: filters,
            columns: [ 
                'custrecord_lcl_unit_weight_cost', 'custrecord_lcl_processing_fee', 'custrecord_lcl_minimal_cost_weight',
                'custrecord_lcl_discount', 'custrecord_lcl_zip_begin',
                { name: 'internalid', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_bubble_count', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_logistics_company', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_bubble_type', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_cc_country_code', join: 'custrecord_lcl_country' }
            ]
        }).run().each(function (result) {
            var countryCode = result.getValue({ name: 'custrecord_cc_country_code', join: 'custrecord_lcl_country' });
            if (country && country != countryCode) {
                return true;
            }
            var zipBegin = result.getValue('custrecord_lcl_zip_begin');
            if ((zip && zipBegin && (zip.indexOf(zipBegin) != 0)) || (!zip && zipBegin)) {
                return true;
            }
            var unitCost = Number(result.getValue('custrecord_lcl_unit_weight_cost'));
            var bubble = Number(result.getValue({ name: 'custrecord_ls_bubble_count', join: 'custrecord_lcl_logistics_services_link' }));
            var bubbleType = result.getValue({ name: 'custrecord_ls_bubble_type', join: 'custrecord_lcl_logistics_services_link' });
            var tureWeight = calcuationCostWeight(long, wide, high, bubble, bubbleType, weight); // 计费重量
            var minimalWeight = Number(result.getValue('custrecord_lcl_minimal_cost_weight'));
            if (minimalWeight > 0 && tureWeight < minimalWeight) {
                tureWeight = minimalWeight;
            }
            var discount = Number(result.getValue('custrecord_lcl_discount'));
            var cost = (unitCost * tureWeight + Number(result.getValue('custrecord_lcl_processing_fee'))) * discount;
            if (resultJSON.costamount == 0 || cost < resultJSON.costamount) {
                resultJSON.servicesId = result.getValue({ name: 'internalid', join: 'custrecord_lcl_logistics_services_link' });
                resultJSON.services_com_id = result.getValue({ name: 'custrecord_ls_logistics_company', join: 'custrecord_lcl_logistics_services_link' });
                resultJSON.costweight = tureWeight;
                resultJSON.costamount = cost;
            }
            return true;
        });
        return resultJSON;
    }

    /**
     * 海运计费
     * @param {*} resultJSON 
     * @param {*} servicesIds 渠道服务ID
     * @param {*} city 始发地
     * @param {*} departure 始发港
     * @param {*} location 仓库，大货目标仓库--亚马逊仓库
     * @param {*} country 目标国家简码，例：'US'
     * @param {*} destination 目的港
     * @param {*} containerType 装柜类型
     */
    function costTypeC(resultJSON, servicesIds, city, departure, location, country, destination, containerType) {
        var filters = [];
        filters.push(['custrecord_lcs_logistics_services', 'anyof', servicesIds]);
        filters.push('and');
        if (city) {
            filters.push([['custrecord_lcs_departure_city', 'anyof', city], 'or', ['custrecord_lcs_departure_city', 'anyof', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcs_departure_city', 'anyof', '@NONE@']);
        }
        filters.push('and');
        if (departure) {
            filters.push([['custrecord_lcs_departure_port', 'anyof', departure], 'or', ['custrecord_lcs_departure_port', 'anyof', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcs_departure_port', 'anyof', '@NONE@']);
        }
        // filters.push('and');
        // if (location) {
        //     filters.push([['custrecord_lcs_location', 'anyof', location], 'or', ['custrecord_lcs_location', 'anyof', '@NONE@']]);
        // } else {
        //     filters.push(['custrecord_lcs_location', 'anyof', '@NONE@']);
        // }
        filters.push('and');
        if (destination) {
            filters.push([['custrecord_lcs_destination_port', 'anyof', destination], 'or', ['custrecord_lcs_destination_port', 'anyof', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcs_destination_port', 'anyof', '@NONE@']);
        }
        search.create({
            type: 'customrecord_logistics_cost_shipping',
            filters: filters,
            columns: [ 
                'custrecord_lcs_bl_cost', 'custrecord_lcs_20gp', 'custrecord_lcs_40gp',
                'custrecord_lcs_40hq', 'custrecord_lcs_45hq',
                { name: 'internalid', join: 'custrecord_lcs_logistics_services' },
                { name: 'custrecord_ls_bubble_count', join: 'custrecord_lcs_logistics_services' },
                { name: 'custrecord_ls_logistics_company', join: 'custrecord_lcs_logistics_services' },
                { name: 'custrecord_ls_bubble_type', join: 'custrecord_lcs_logistics_services' },
                { name: 'custrecord_cc_country_code', join: 'custrecord_lcs_country' }
            ]
        }).run().each(function (result) {
            var countryCode = result.getValue({ name: 'custrecord_cc_country_code', join: 'custrecord_lcs_country' });
            if (country && country != countryCode) {
                return true;
            }
            var costl = 0;
            if (containerType == 1) {
                costl = Number(result.getValue('custrecord_lcs_20gp'));
            } else if (containerType == 2) {
                costl = Number(result.getValue('custrecord_lcs_40gp'));
            } else if (containerType == 3) {
                costl = Number(result.getValue('custrecord_lcs_40hq'));
            } else if (containerType == 4) {
                costl = Number(result.getValue('custrecord_lcs_45hq'));
            }
            var cost = Number(result.getValue('custrecord_lcs_bl_cost')) + costl;
            if (resultJSON.costamount == 0 || cost < resultJSON.costamount) {
                resultJSON.servicesId = result.getValue({ name: 'internalid', join: 'custrecord_lcs_logistics_services' });
                resultJSON.services_com_id = result.getValue({ name: 'custrecord_ls_logistics_company', join: 'custrecord_lcs_logistics_services' });
                resultJSON.costweight = 0;
                resultJSON.costamount = cost;
            }
            return true;
        });
        return resultJSON;
    }

    /**
     * 空运计费
     * @param {*} resultJSON 
     * @param {*} servicesIds 渠道服务ID
     * @param {*} departure 始发港
     * @param {*} location 仓库，大货目标仓库--亚马逊仓库
     * @param {*} city 始发地
     * @param {*} weight 产品重量
     * @param {*} country 目标国家简码，例：'US'
     */
    function costTypeD(resultJSON, servicesIds, departure, location, city, weight, country) {
        var filters = [];
        filters.push(['custrecord_lcat_logistics_services', 'anyof', servicesIds]);
        filters.push('and');
        if (departure) {
            filters.push([['custrecord_lcat_departure_port', 'anyof', departure], 'or', ['custrecord_lcat_departure_port', 'anyof', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcat_departure_port', 'anyof', '@NONE@']);
        }
        // filters.push('and');
        // if (location) {
        //     filters.push([['custrecord_lcat_location', 'anyof', location], 'or', ['custrecord_lcat_location', 'anyof', '@NONE@']]);
        // } else {
        //     filters.push(['custrecord_lcat_location', 'anyof', '@NONE@']);
        // }
        filters.push('and');
        if (city) {
            filters.push([['custrecord_lcat_city', 'anyof', city], 'or', ['custrecord_lcat_city', 'anyof', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcat_city', 'anyof', '@NONE@']);
        }
        filters.push('and');
        if (weight) {
            filters.push([['custrecord_lcat_weight_start', 'lessthanorequalto', weight], 'or', ['custrecord_lcat_weight_start', 'is', '@NONE@']]);
            filters.push('and');
            filters.push([['custrecord_lcat_weight_end', 'greaterthanorequalto', weight], 'or', ['custrecord_lcat_weight_end', 'is', '@NONE@']]);
        } else {
            filters.push(['custrecord_lcat_weight_start', 'anyof', '@NONE@']);
            filters.push('and');
            filters.push(['custrecord_lcat_weight_end', 'anyof', '@NONE@']);
        }
        search.create({
            type: 'customrecord_logistics_cost_air_transpor',
            filters: filters,
            columns: [ 
                'custrecord_lcat_unit_weight_cost', 
                { name: 'internalid', join: 'custrecord_lcat_logistics_services' },
                { name: 'custrecord_ls_bubble_count', join: 'custrecord_lcat_logistics_services' },
                { name: 'custrecord_ls_logistics_company', join: 'custrecord_lcat_logistics_services' },
                { name: 'custrecord_ls_bubble_type', join: 'custrecord_lcat_logistics_services' },
                { name: 'custrecord_cc_country_code', join: 'custrecord_lcat_country' }
            ]
        }).run().each(function (result) {
            var countryCode = result.getValue({ name: 'custrecord_cc_country_code', join: 'custrecord_lcat_country' });
            if (country && country != countryCode) {
                return true;
            }
            var cost = Number(result.getValue('custrecord_lcat_unit_weight_cost')) * weight;
            if (resultJSON.costamount == 0 || cost < resultJSON.costamount) {
                resultJSON.servicesId = result.getValue({ name: 'internalid', join: 'custrecord_lcat_logistics_services' });
                resultJSON.services_com_id = result.getValue({ name: 'custrecord_ls_logistics_company', join: 'custrecord_lcat_logistics_services' });
                resultJSON.costweight = weight;
                resultJSON.costamount = cost;
            }
            return true;
        });
        return resultJSON;
    }

    return {
        calculation: calculation,
        calculationByRule: calculationByRule,
        calcuationCostWeight: calcuationCostWeight
    }
});
