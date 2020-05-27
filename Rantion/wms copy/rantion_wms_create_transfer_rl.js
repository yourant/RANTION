/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        
    }

    function _put(context) {
        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};
            // AllocationMasterCreateRequestDto {
            //     address (string): 地址 ,
            //     allocationDetailCreateRequestDtos (Array[AllocationDetailCreateRequestDto]): 调拨单明细 ,
            //     aono (string): 调拨单号 ,
            //     city (string): 城市 ,
            //     country (string): 国家 ,
            //     countryCode (string): 国家简码 ,
            //     createBy (string): 创建人 ,
            //     declareCurrency (string): 申报币种 ,
            //     declarePrice (number): 申报价格 ,
            //     email (string): 邮箱地址 ,
            //     fbaAccount (string): FBA账号 ,
            //     logisticsChannelCode (string): 物流渠道服务编号 ,
            //     logisticsChannelName (string): 物流渠道服务名称 ,
            //     logisticsLabelPath (string): 物流面单文件路径 ,
            //     logisticsProviderCode (string): 物流渠道商编号 ,
            //     logisticsProviderName (string): 物流渠道商名称 ,
            //     mobilePhone (string): 移动电话 ,
            //     postcode (string): 邮编 ,
            //     province (string): 省份 ,
            //     recipient (string): 收件人 ,
            //     shipment (string): shipment ,
            //     shippingType (integer): 运输方式：10 sea-普通，20 air-快递-红单，30 air-专线-红单 ,
            //     sourceWarehouseCode (string): 来源仓库编号 ,
            //     sourceWarehouseName (string): 来源仓库名称 ,
            //     targetWarehouseCode (string): 目标仓库编号 ,
            //     targetWarehouseName (string): 目标仓库名称 ,
            //     taxFlag (integer): 是否含税 0:否1:是 ,
            //     telephone (string): 固定电话 ,
            //     tradeCompanyCode (string): 交易主体编号 ,
            //     tradeCompanyName (string): 交易主体名称 ,
            //     type (integer): 调拨类型：10 普通调拨，20 FBA调拨 ,
            //     waybillNo (string): 运单号
            // }
            // AllocationDetailCreateRequestDto {
            //     asin (string): ASIN ,
            //     barcode (string): 条码 装箱条码/SKU ,
            //     fnsku (string): FNSKU ,
            //     msku (string): MSKU ,
            //     positionCode (string): 库位编号 ,
            //     productCode (string): 产品编号 ,
            //     productImageUrl (string): 图片路径 ,
            //     productTitle (string): 产品标题 ,
            //     productType (integer): 产品类型 10:成品 20:半成品 30:组合产品 40:包装材料 ,
            //     qty (integer): 数量 ,
            //     sku (string): SKU ,
            //     type (integer): 类型 1:已装箱 2:未装箱 ,
            //     variants (string): 变体规格
            // }


            // 发送请求
            message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
        return message;
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
        var retdata;
        var headerInfo = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'access_token': token
        };
        var response = http.post({
            url: 'http://47.107.254.110:18082/rantion-wms/allocationMaster',
            headers: headerInfo,
            body: JSON.stringify(data)
        });
        log.debug('response', JSON.stringify(response));
        retdata = JSON.stringify(response.body);
        if (response.code == 200) {
            // 调用成功
            code = retdata.code;
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
