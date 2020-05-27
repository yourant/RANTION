/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {

    }

    function _post(context) {
        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};
            // 业务数据填写至data即可
            // 参数模板 (参数类型，是否必填)
            // OutMasterCreateRequestDto {
            //     address (string): 地址 ,
            //     city (string): 城市 ,
            //     country (string): 国家 ,
            //     countryCode (string): 国家简码 ,
            //     detailCreateRequestDtos (Array[OutDetailCreateRequestDto]): 出库单明细 ,
            //     email (string, optional): 邮箱地址 ,
            //     logisticsChannelCode (string): 物流渠道服务编号 ,
            //     logisticsChannelName (string): 物流渠道服务名称 ,
            //     logisticsLabelPath (string): 物流面单文件路径 ,
            //     logisticsProviderCode (string): 物流渠道商编号 ,
            //     logisticsProviderName (string): 物流渠道商名称 ,
            //     mobilePhone (string): 移动电话 ,
            //     platformCode (string, optional): 平台编号 ,
            //     platformName (string, optional): 平台名称 ,
            //     postcode (string): 邮编 ,
            //     province (string): 省份 ,
            //     qty (integer, optional): 数量 ,
            //     recipient (string): 收件人 ,
            //     remark (string, optional): 备注 ,
            //     shopCode (string, optional): 平台编号 ,
            //     shopName (string, optional): 店铺名称 ,
            //     sourceNo (string): 来源单号 ,
            //     sourceType (integer): 来源类型 10:销售订单 20:采购退货单 30:调拨单 40:移库单 50:库存调整 ,
            //     telephone (string, optional): 固定电话 ,
            //     trackingNo (string, optional): 最终跟踪号 ,
            //     warehouseCode (string): 仓库编号 ,
            //     warehouseName (string): 仓库名称 ,
            //     waybillNo (string): 运单号
            // }
            // OutDetailCreateRequestDto {
            //     productCode (string, optional): 产品编号 ,
            //     productImageUrl (string): 图片路径 ,
            //     productTitle (string): 产品标题 ,
            //     productType (integer, optional): 产品类型 10:成品 20:半成品 30:组合产品 40:包装材料 ,
            //     qty (integer): 出库数量 ,
            //     sku (string): sku ,
            //     variants (string, optional): 变体规格
            // }
            log.debug('context', context);
            var sourceType = Number(context.sourceType);
            // 销售订单
            if (sourceType == 10) {

            }
            // 采购退货单
            else if (sourceType == 20) {

                data = context.data;
            }
            // 调拨单
            else if (sourceType == 30) {

            }
            // 移库单
            else if (sourceType == 40) {

            }
            // 库存调整
            else if (sourceType == 50) {

            }
            // 发送请求
            message = sendRequest(token, data);
        } else {
            message.code = 1;
            message.retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
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
        }).run().each(function(result) {
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
            url: 'http://47.107.254.110:18082/rantion-wms/outMaster',
            headers: headerInfo,
            body: data
        });

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