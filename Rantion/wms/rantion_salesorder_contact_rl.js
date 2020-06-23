/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http'], function(search, http) {

    function _get(context) {
        
    }

    // {
    //     "id": 26,
    //     "marketId": 1,
    //     "orderId": "111-0297525-4845069",
    //     "sellerOrderId": "111-0297525-4845069",
    //     "orderStatus": 3,
    //     "orderType": "StandardOrder",
    //     "businessOrder": 0,
    //     "salesChannel": "Amazon.com",
    //     "currencyCode": "USD",
    //     "orderTotal": 10.49,
    //     "timeZone": "US/Pacific",
    //     "purchaseDate": 1544227451000,
    //     "purchaseDatet": "1544285051106",
    //     "lastUpdatedate": 1544357116000,
    //     "lastUpdatedatet": "1544414716107",
    //     "earliestShip": 1544284799000,
    //     "earliestShipt": "0",
    //     "lastShip": 1544284799000,
    //     "lastShipt": "1544342399000",
    //     "earliestDelivery": null,
    //     "earliestDeliveryt": "1544342399000",
    //     "lastDelivery": null,
    //     "lastDeliveryt": "0",
    //     "shipFulfillment": "AFN",
    //     "shipmentWarehouseId": 2,
    //     "shipServicelevel": "SecondDay",
    //     "carrier": "",
    //     "shipTrack": "",
    //     "shipNumber": 1,
    //     "addressName": "Christian Quinn",
    //     "addressLine1": "933 Bendleton Drive",
    //     "addressLine2": "",
    //     "addressLine3": null,
    //     "addressCity": "WOODSTOCK",
    //     "addressStateorregion": "GA",
    //     "addressPostalcode": "30188",
    //     "addressCountrycode": "US",
    //     "addressPhone": "",
    //     "buyerId": "",
    //     "buyerName": "Christian Quinn",
    //     "buyerEmail": "ytt8pyk1hyvzp2p@marketplace.amazon.com",
    //     "crawlItem": 0,
    //     "reviewTemplate": 2,
    //     "reviewDate": 1545832817000,
    //     "feedbackTemplate": 1,
    //     "feedbackDate": 1545314402000,
    //     "tag": 0,
    //     "requestReviewStatus": null,
    //     "vat": 0,
    //     "returns": 0,
    //     "returnsDate": "0",
    //     "fee": 0,
    //     "patch": 0,
    //     "others": "",
    //     "updateDate": 1544415656000,
    //     "parentId": 0,
    //     "createTime": null,
    //     "serialExceptionFlag": 0,
    //     "refund": 0
    // }
    function _post(context) {
        var message = {};
        try {
            // 获取token
            var token = getToken();
            if (token) {
                var headerInfo = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'access_token': token
                };
                var market = context.market;
                var saleOrderNo = context.saleOrderNo;
                var url = 'http://47.107.254.110:18082/rantion-gj/esaleOrder/saleOrder?market=' + market + '&saleOrderNo=' + saleOrderNo;
                log.debug('url', url);
                var response = http.get({
                    url: url,
                    headers: headerInfo,
                });
                retdata = JSON.parse(response.body);
                log.debug('retdata', JSON.stringify(retdata));
                message.code = 0;
                message.retdata = retdata;
            } else {
                message.code = 1;
                message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
            }
        } catch (error) {
            log.error('出错了', error);
            message.code = 5;
            message.data = error.message;
        }
        return message;
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    /**
     * 获取token
     */
    function getToken() {
        var token;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{ name: 'internalid', operator: 'anyof', values: 1 }],
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
    function sendRequest(token, data) {
        var message = {};
        var code = 0;
        var body;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: 'http://47.107.254.110:18082/rantion-wms/inMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        // log.error('response', JSON.stringify(response));
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
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
