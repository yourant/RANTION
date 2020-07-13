/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record', 'N/http', '../Helper/config.js'], function (search, record, http, config) {

    /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
    function doGet(requestParams) {
        log.audit('requestParams', requestParams)
        var deliveryId = requestParams.deliveryId;
        var body = reportDelivery(deliveryId);
        var id = (new Date()).valueOf();
        // sendRequest(id, body);

        return JSON.stringify(body);
    }

    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPut(requestBody) {

    }


    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost(requestBody) {
        return;
    }

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doDelete(requestParams) {
        return;
    }

    function reportDelivery(deliveryId) {
        log.audit('deliveryId', deliveryId);
        var filters = [];
        filters.push({ name: 'internalid', operator: 'anyof', values: deliveryId });
        var rs;
        search.create({
            type: 'customrecord_dps_delivery_order',
            filters: filters,
            columns: [
                'name'//交货单号
                , { name: 'companyname', join: 'custrecord_supplier' }//供应商名称
                , 'custrecord_delivery_date'//送货日期
                , { name: 'custrecord_aio_sender_address', join: 'custrecord_dsp_delivery_order_location' }//收货地址
                , { name: 'custrecord_aio_contact_information', join: 'custrecord_dsp_delivery_order_location' }//收货联系方式
                , { name: 'custrecord_aio_sender_name', join: 'custrecord_dsp_delivery_order_location' }//收货姓名
                , { name: 'custentityaddress', join: 'custrecord_supplier' }//供应商地址
                , { name: 'tranid', join: 'custrecord_purchase_order_no' } //PO
                , { name: 'subsidiary', join: 'custrecord_purchase_order_no' } //subsidiary
            ]
        }).run().each(function (result) {

            var item = [];
            rs = {
                name: result.getValue('name'),
                supplierName: result.getValue({ name: 'companyname', join: 'custrecord_supplier' }),
                custrecord_delivery_date: result.getValue('custrecord_delivery_date'),
                custrecord_aio_sender_address: result.getValue({ name: 'custrecord_aio_sender_address', join: 'custrecord_dsp_delivery_order_location' }),
                custrecord_aio_contact_information: result.getValue({ name: 'custrecord_aio_contact_information', join: 'custrecord_dsp_delivery_order_location' }),
                custrecord_aio_sender_name: result.getValue({ name: 'custrecord_aio_sender_name', join: 'custrecord_dsp_delivery_order_location' }),
                custentityaddress: result.getValue({ name: 'custentityaddress', join: 'custrecord_supplier' }),
                tranid: result.getValue({ name: 'tranid', join: 'custrecord_purchase_order_no' }),
                subsidiary: result.getText({ name: 'subsidiary', join: 'custrecord_purchase_order_no' }),
                item: item
            }
            search.create({
                type: 'customrecord_dps_delivery_order_item',
                filters: { name: 'custrecord_dps_delivery_order_id', operator: 'anyof', values: deliveryId },
                columns: [
                    { name: 'itemid', join: 'custrecord_item_sku' }//sku
                    , 'custrecord_item_name'
                    , 'custrecord_item_quantity'
                    , 'custrecord_line_packing_quantity'
                    , 'custrecord_line_boxes_number'
                    , 'custrecord_ddoi_long'
                    , 'custrecord_ddoi_width'
                    , 'custrecord_ddoi_high'
                    , 'custrecord_ddoi_single_box_volume'
                    , 'custrecord_ddoi_dps_total_volume'
                ]
            }).run().each(function (result) {
                item.push({
                    sku: result.getValue({ name: 'itemid', join: 'custrecord_item_sku' }),
                    name: result.getValue('custrecord_item_name'),
                    custrecord_item_quantity: result.getValue('custrecord_item_quantity'),
                    custrecord_line_packing_quantity: result.getValue('custrecord_line_packing_quantity'),
                    custrecord_line_boxes_number: result.getValue('custrecord_line_boxes_number'),
                    custrecord_ddoi_long: result.getValue('custrecord_ddoi_long'),
                    custrecord_ddoi_width: result.getValue('custrecord_ddoi_width'),
                    custrecord_ddoi_high: result.getValue('custrecord_ddoi_high'),
                    custrecord_ddoi_single_box_volume: result.getValue('custrecord_ddoi_single_box_volume'),
                    custrecord_ddoi_dps_total_volume: result.getValue('custrecord_ddoi_dps_total_volume')
                })
                return true;
            });
        });
        return rs;
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
    function sendRequest(id, data) {
        var message = {};
        var code = 0;
        var body;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': getToken()
        };
        var response = http.post({
            url: config.WMS_Debugging_URL + '/common/setDeliveryBodyByRedis/' + id,
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.audit('response', JSON.stringify(response));
        if (response.code == 200) {
            retdata = JSON.parse(response.body);
        } else {
            retdata = '请求被拒'
        }
        if (response.code == 200) {
            // 调用成功
        } else {
            code = 1;
            // 调用失败
        }
        message.code = code;
        message.data = retdata;
        return message;
    }

    return {
        'get': doGet,
        put: doPut,
        post: doPost,
        'delete': doDelete,
        reportDelivery: reportDelivery
    };



});