/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['exports', './Helper/core.min', './Helper/fields.min', 'N/search', 'N/record'],

    function (exports, core, fields, search, record) {

        /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
        function doGet(request) {
            return doPost(request);
        }

        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPost(requestDto) {
            var responseDto = {};
            if (!requestDto.startDate || !requestDto.endDate || !requestDto.reportType || !requestDto.limit) {
                return "startDate endDate reportType limit必填";
            }
            if (!requestDto.id && !requestDto.group) {
                return "id group必填";
            }
            var limit = requestDto.limit;
            var offset = 86400000 * new Number(limit);
            var start = new Date(requestDto.startDate);
            var end = new Date(requestDto.endDate);
            if (end.getTime() - start.getTime() < 0) {
                return "时间范围错误";
            }
            var tempTime = new Date(start.getTime() - 1);
            var time = [];
            var lastDate = new Date(start.getTime());
            var accountArr = requestDto.reportType == 13 ? getAccount(requestDto) : getReportAccountList(requestDto);

            var requestIdArr = [];
            responseDto.data = { account: accountArr, requestIdArr: requestIdArr, time: time, is13: requestDto.reportType == 13 };
            do {
                tempTime = new Date(tempTime.getTime() + offset);
                var startDate;
                var endDate;
                if (tempTime.getTime() <= end.getTime()) {
                    startDate = lastDate.toISOString();
                    endDate = tempTime.toISOString();
                    time.push(lastDate.toISOString() + '-' + tempTime.toISOString());
                } else {
                    startDate = lastDate.toISOString();
                    endDate = end.toISOString();
                    time.push(lastDate.toISOString() + '-' + end.toISOString());
                }
                lastDate = new Date(tempTime.getTime() + 1);
                accountArr.map(function (account) {
                    var reqId = core.amazon.requestReport(account, requestDto.reportType, {
                        'StartDate': startDate,
                        'EndDate': endDate,
                        'MarketplaceIdList.Id.1': account.marketplace,
                        'ReportOptions': 'ShowSalesChannel'
                    });
                    requestIdArr.push({
                        account: account.id,
                        'StartDate': startDate,
                        'EndDate': endDate,
                        reqId: reqId
                    })
                })
            } while (tempTime.getTime() < end.getTime());


            return JSON.stringify(responseDto);
            // return JSON.stringify(time);
        }

        function checkIfSubsidiaryEnabled() {
            try {
                search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: '-5',
                    columns: ['subsidiary']
                }).subsidiary
                return true
            } catch (error) {
                return false
            }
        }

        function getAccount(req) {
            var accounts = [],
                fils = []
            var t = fields.account,
                tsite = fields.amazon_global_sites,
                tdev = fields.amazon_dev_accounts
            var accounts = [],
                fils = []
            fils = [{
                name: 'custrecord_aio_marketplace',
                operator: 'anyof',
                values: 1 /* amazon */
            },
            {
                name: 'custrecord_aio_seller_id',
                operator: 'isnotempty'
            },
            /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
            {
                name: 'custrecord_aio_dev_account',
                operator: 'noneof',
                values: '@NONE@'
            },
            {
                name: 'isinactive',
                operator: 'is',
                values: false
            }
            ]
            if (req.id) {
                fils.push({
                    name: 'internalid',
                    operator: 'anyof',
                    values: req.id.split(',')
                })
            }
            if (req.group) {
                fils.push({
                    name: 'custrecord_aio_getorder_group',
                    operator: 'anyof',
                    values: req.group.split(',')
                })
            }
            search.create({
                type: t._name,
                filters: fils,
                columns: [
                    /** * 名称 * @index 0 */
                    {
                        name: 'name'
                    },
                    /** * 账户API信息 * @index 1 */
                    {
                        name: t.seller_id
                    },
                    {
                        name: t.mws_auth_token
                    },
                    {
                        name: tsite.amazon_marketplace_id,
                        join: t.enabled_sites
                    },
                    {
                        name: tsite.amazon_mws_endpoint,
                        join: t.enabled_sites
                    },
                    {
                        name: tdev.aws_access_key_id,
                        join: t.dev_account
                    },
                    {
                        name: tdev.secret_key_guid,
                        join: t.dev_account
                    },
                    /** * 账户基础信息 * @index 7 * */
                    {
                        name: 'name'
                    },
                    {
                        name: t.currency
                    },
                    {
                        name: 'custrecord_aio_if_salesorder'
                    },
                    {
                        name: 'custrecord_aio_salesorder_type'
                    },
                    {
                        name: 'custrecord_aio_salesorder_form'
                    },
                    {
                        name: 'custrecord_aio_salesorder_location'
                    },
                    {
                        name: 'custrecord_aio_salesorder_start_date'
                    },
                    /** * FBA信息 * @index 14 */
                    {
                        name: 'custrecord_aio_if_fbaorder'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_type'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_form'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_location'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_start_date'
                    },
                    /**@index 19 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_including_fees'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 其他信息 * @index 28 */
                    {
                        name: 'custrecord_division' //	custrecord_division
                    },
                    {
                        name: 'custrecord_aio_salesorder_payment_method'
                    },
                    {
                        name: 'custrecord_aio_discount_item'
                    },
                    {
                        name: 'custrecord_aio_tax_item'
                    },
                    {
                        name: tsite.amazon_currency,
                        join: t.enabled_sites
                    },
                    /** * 公司信息 * @index 33 */
                    checkIfSubsidiaryEnabled() ? {
                        name: 'custrecord_aio_subsidiary'
                    } : {
                            name: 'formulanumeric',
                            formula: '0'
                        },
                    /** * 报告抓取信息 * @index 34 */
                    {
                        name: 'custrecord_aio_if_handle_removal_report'
                    },
                    {
                        name: 'custrecord_aio_if_handle_custrtn_report'
                    },
                    /** * Preferences * @index 36 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                    {
                        name: 'custrecord_aio_if_handle_inv_report'
                    },
                    {
                        name: 'custrecord_aio_to_default_from_location'
                    },
                    {
                        name: 'custrecord_aio_shipping_item'
                    },
                    {
                        name: 'custrecord_aio_to_form'
                    },
                    /** @index 48 */
                    {
                        name: fields.account.if_post_order_fulfillment // 48
                    },
                    {
                        name: fields.account.post_order_if_search
                    },
                    {
                        name: fields.account.if_handle_sett_report
                    },
                    {
                        name: 'custrecord_aio_customer'
                    },
                    {
                        name: 'custrecord_aio_enabled_sites'
                    },
                    {
                        name: 'custrecord_amazon_order_formula'
                    },
                    {
                        name: tsite.amazon_site_timezone, // 54
                        join: t.enabled_sites
                    }
                ]
            }).run().each(function (rec) {
                accounts.push({
                    id: rec.id,
                    timezone: rec.getValue(rec.columns[54]),
                    auth_meta: {
                        seller_id: rec.getValue(rec.columns[1]),
                        auth_token: rec.getValue(rec.columns[2]),
                        access_id: rec.getValue(rec.columns[5]),
                        sec_key: rec.getValue(rec.columns[6]),
                        end_point: rec.getValue(rec.columns[4])
                    },
                    info: {
                        name: rec.getValue(rec.columns[7]),
                        currency: rec.getValue(rec.columns[8]),
                        if_salesorder: rec.getValue(rec.columns[9]),
                        salesorder_type: rec.getValue(rec.columns[10]),
                        salesorder_form: rec.getValue(rec.columns[11]),
                        salesorder_location: rec.getValue(rec.columns[12]),
                        salesorder_start_date: rec.getValue(rec.columns[13]),
                        dept: rec.getValue('custrecord_division'),
                        // dept: rec.getValue(rec.columns[28]),
                        salesorder_payment_method: rec.getValue(rec.columns[29]),
                        discount_item: rec.getValue(rec.columns[30]),
                        shipping_cost_item: rec.getValue(rec.columns[46]),
                        tax_item: rec.getValue(rec.columns[31]),
                        site_currency: rec.getValue(rec.columns[32]),
                        subsidiary: Number(rec.getValue(rec.columns[33])),
                        enable_tracking_upload: rec.getValue(rec.columns[48]),
                        enabled_tracking_upload_search: rec.getValue(rec.columns[49])
                    },
                    extra_info: {
                        if_fbaorder: rec.getValue(rec.columns[14]),
                        fbaorder_type: rec.getValue(rec.columns[15]),
                        fbaorder_form: rec.getValue(rec.columns[16]),
                        fbaorder_location: rec.getValue(rec.columns[17]),
                        fbaorder_start_date: rec.getValue(rec.columns[18]),
                        if_including_fees: rec.getValue(rec.columns[26]),
                        if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                        if_handle_removal_report: rec.getValue(rec.columns[34]),
                        if_handle_inventory_report: rec.getValue(rec.columns[44]),
                        if_handle_settlement_report: rec.getValue(rec.columns[50]),
                        to_default_from_location: rec.getValue(rec.columns[45]),
                        aio_to_default_form: rec.getValue(rec.columns[47])
                    },
                    marketplace: rec.getValue(rec.columns[3]),
                    preference: {
                        if_only_paid_orders: rec.getValue(rec.columns[36]),
                        salesorder_if_taxed: rec.getValue(rec.columns[37]),
                        salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                        salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                        if_zero_price: rec.getValue(rec.columns[40]),
                        if_check_customer_email: rec.getValue(rec.columns[41]),
                        if_check_customer_addr: rec.getValue(rec.columns[42]),
                        if_payment_as_tran_date: rec.getValue(rec.columns[43])
                    },
                    customer: rec.getValue(rec.columns[51]),
                    enabled_sites: rec.getText('custrecord_aio_enabled_sites'),
                    site_id: rec.getValue('custrecord_aio_enabled_sites'),
                    ord_formula: rec.getText('custrecord_amazon_order_formula')
                })
                return true
            })
            return accounts
        }


        // 获取拉取报告的店铺列表
        function getReportAccountList(req) {
            var t = fields.account,
                tsite = fields.amazon_global_sites,
                tdev = fields.amazon_dev_accounts
            var accounts = []
            var fils = [{
                name: 'custrecord_aio_marketplace',
                operator: 'anyof',
                values: 1 /* amazon */
            },
            {
                name: 'custrecord_aio_seller_id',
                operator: 'isnotempty'
            },
            /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
            {
                name: 'custrecord_aio_dev_account',
                operator: 'noneof',
                values: '@NONE@'
            },
            {
                name: 'isinactive',
                operator: 'is',
                values: false
            },
            {
                name: 'custrecord_dps_get_report',
                operator: 'is',
                values: true
            }
            ]
            if (req.id) {
                fils.push({
                    name: 'internalid',
                    operator: 'anyof',
                    values: req.id.split(',')
                })
            }
            if (req.group)
                fils.push({
                    name: 'custrecord_aio_getorder_group',
                    operator: 'anyof',
                    values: req.group
                })
            search.create({
                type: t._name,
                filters: fils,
                columns: [
                    /** * 名称 * @index 0 */
                    {
                        name: 'name'
                    },
                    /** * 账户API信息 * @index 1 */
                    {
                        name: t.seller_id
                    },
                    {
                        name: t.mws_auth_token
                    },
                    {
                        name: tsite.amazon_marketplace_id,
                        join: t.enabled_sites
                    },
                    {
                        name: tsite.amazon_mws_endpoint,
                        join: t.enabled_sites
                    },
                    {
                        name: tdev.aws_access_key_id,
                        join: t.dev_account
                    },
                    {
                        name: tdev.secret_key_guid,
                        join: t.dev_account
                    },
                    /** * 账户基础信息 * @index 7 * */
                    {
                        name: 'name'
                    },
                    {
                        name: t.currency
                    },
                    {
                        name: 'custrecord_aio_if_salesorder'
                    },
                    {
                        name: 'custrecord_aio_salesorder_type'
                    },
                    {
                        name: 'custrecord_aio_salesorder_form'
                    },
                    {
                        name: 'custrecord_aio_salesorder_location'
                    },
                    {
                        name: 'custrecord_aio_salesorder_start_date'
                    },
                    /** * FBA信息 * @index 14 */
                    {
                        name: 'custrecord_aio_if_fbaorder'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_type'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_form'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_location'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_start_date'
                    },
                    /**@index 19 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_including_fees'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 其他信息 * @index 28 */
                    {
                        name: 'custrecord_division' // custrecord_aio_dept
                    },
                    {
                        name: 'custrecord_aio_salesorder_payment_method'
                    },
                    {
                        name: 'custrecord_aio_discount_item'
                    },
                    {
                        name: 'custrecord_aio_tax_item'
                    },
                    {
                        name: tsite.amazon_currency,
                        join: t.enabled_sites
                    },
                    /** * 公司信息 * @index 33 */
                    checkIfSubsidiaryEnabled() ? {
                        name: 'custrecord_aio_subsidiary'
                    } : {
                            name: 'formulanumeric',
                            formula: '0'
                        },
                    /** * 报告抓取信息 * @index 34 */
                    {
                        name: 'custrecord_aio_if_handle_removal_report'
                    },
                    {
                        name: 'custrecord_aio_if_handle_custrtn_report'
                    },
                    /** * Preferences * @index 36 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                    {
                        name: 'custrecord_aio_if_handle_inv_report'
                    },
                    {
                        name: 'custrecord_aio_to_default_from_location'
                    },
                    {
                        name: 'custrecord_aio_shipping_item'
                    },
                    {
                        name: 'custrecord_aio_to_form'
                    },
                    /** @index 48 */
                    {
                        name: fields.account.if_post_order_fulfillment
                    },
                    {
                        name: fields.account.post_order_if_search
                    },
                    {
                        name: fields.account.if_handle_sett_report
                    },
                    {
                        name: 'custrecord_aio_customer'
                    },
                    {
                        name: 'custrecord_aio_enabled_sites'
                    }
                ]
            }).run().each(function (rec) {
                accounts.push({
                    id: rec.id,
                    auth_meta: {
                        seller_id: rec.getValue(rec.columns[1]),
                        auth_token: rec.getValue(rec.columns[2]),
                        access_id: rec.getValue(rec.columns[5]),
                        sec_key: rec.getValue(rec.columns[6]),
                        end_point: rec.getValue(rec.columns[4])
                    },
                    info: {
                        name: rec.getValue(rec.columns[7]),
                        currency: rec.getValue(rec.columns[8]),
                        if_salesorder: rec.getValue(rec.columns[9]),
                        salesorder_type: rec.getValue(rec.columns[10]),
                        salesorder_form: rec.getValue(rec.columns[11]),
                        salesorder_location: rec.getValue(rec.columns[12]),
                        salesorder_start_date: rec.getValue(rec.columns[13]),
                        dept: rec.getValue('custrecord_division'),
                        // dept: rec.getValue(rec.columns[28]),
                        salesorder_payment_method: rec.getValue(rec.columns[29]),
                        discount_item: rec.getValue(rec.columns[30]),
                        shipping_cost_item: rec.getValue(rec.columns[46]),
                        tax_item: rec.getValue(rec.columns[31]),
                        site_currency: rec.getValue(rec.columns[32]),
                        subsidiary: Number(rec.getValue(rec.columns[33])),
                        enable_tracking_upload: rec.getValue(rec.columns[48]),
                        enabled_tracking_upload_search: rec.getValue(rec.columns[49])
                    },
                    extra_info: {
                        if_fbaorder: rec.getValue(rec.columns[14]),
                        fbaorder_type: rec.getValue(rec.columns[15]),
                        fbaorder_form: rec.getValue(rec.columns[16]),
                        fbaorder_location: rec.getValue(rec.columns[17]),
                        fbaorder_start_date: rec.getValue(rec.columns[18]),
                        if_including_fees: rec.getValue(rec.columns[26]),
                        if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                        if_handle_removal_report: rec.getValue(rec.columns[34]),
                        if_handle_inventory_report: rec.getValue(rec.columns[44]),
                        if_handle_settlement_report: rec.getValue(rec.columns[50]),
                        to_default_from_location: rec.getValue(rec.columns[45]),
                        aio_to_default_form: rec.getValue(rec.columns[47])
                    },
                    marketplace: rec.getValue(rec.columns[3]),
                    preference: {
                        if_only_paid_orders: rec.getValue(rec.columns[36]),
                        salesorder_if_taxed: rec.getValue(rec.columns[37]),
                        salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                        salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                        if_zero_price: rec.getValue(rec.columns[40]),
                        if_check_customer_email: rec.getValue(rec.columns[41]),
                        if_check_customer_addr: rec.getValue(rec.columns[42]),
                        if_payment_as_tran_date: rec.getValue(rec.columns[43])
                    },
                    customer: rec.getValue(rec.columns[51]),
                    enabled_sites: rec.getText('custrecord_aio_enabled_sites'),
                    site_id: rec.getValue('custrecord_aio_enabled_sites')
                })
                return true
            })
            return accounts
        }

        return {
            post: doPost,
            get: doGet
        };

    });
