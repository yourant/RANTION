/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function _get(context) {

    }

    /**
     * 
     * @param {*} context 
     */
    function _post(context) {
        var message = {};
        // 获取token
        var token = getToken();
        if (token) {
            var data = {};
            // 业务数据填写至data即可
            // 参数模板 (参数类型，是否必填)
            // InMasterCreateRequestDto {
            //     boxNum (integer): 箱数 ,
            //     estimateTime (string): 预计到货时间 ,
            //     inspectionType (integer): 质检类型 10:全检 20:抽检 ,
            //     planQty (integer): 计划入库数量 ,
            //     pono (string, optional): 采购单号 ,
            //     purchaser (string): 采购员 ,
            //     remark (string, optional): 备注 ,
            //     skuList (Array[InDetailCreateRequestDto]): 入库SKU明细 ,
            //     sourceNo (string): 来源单号 ,
            //     sourceType (integer): 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库 ,
            //     supplierCode (string, optional): 供应商编号 ,
            //     supplierName (string, optional): 供应商名称 ,
            //     taxFlag (integer): 是否含税 0:否1:是 ,
            //     tradeCompanyCode (string): 交易主体编号 ,
            //     tradeCompanyName (string): 交易主体名称 ,
            //     warehouseCode (string): 仓库编号 ,
            //     warehouseName (string): 仓库名称 ,
            //     waybillNo (string, optional): 运单号
            // }
            // InDetailCreateRequestDto {
            //     boxNum (integer): 箱数 ,
            //     planQty (integer): 计划入库数 ,
            //     productCode (string): 产品编号 ,
            //     productImageUrl (string): 图片路径 ,
            //     productTitle (string): 产品标题 ,
            //     remainderQty (integer): 余数 ,
            //     sku (string): sku ,
            //     supplierVariant (string, optional): 供应商变体规格 json ,
            //     variant (string, optional): 变体规格 json
            // }
            var sourceType = Number(context.sourceType); // 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库
            // 交货单入库
            if (sourceType == 10) {

            }
            // 退货入库
            else if (sourceType == 20) {

                var limit = 3999;
                var sku_arr = [],
                    item_sku = [],
                    record_type, taxamount, otherrefnum, inspection_type,
                    record_id, location_id, subsidiary_id,
                    entity, location, subsidiary, trandate, tranid, total = 0;
                // sku、价格、数量、客户名称、地点、日期、子公司、退货单号
                search.create({
                    type: 'returnauthorization',
                    filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: context.id
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
                        }
                    ],
                    // sku、价格、数量、客户名称、地点、日期、子公司、退货单号
                    columns: [
                        'item', 'rate', 'quantity', 'entity', 'location', 'subsidiary',
                        'trandate', 'tranid', 'custcol_dps_trans_order_item_sku', 'custcol_dps_so_item_title',
                        {
                            name: "custitem_aio_asin",
                            join: "item",
                        },
                        {
                            name: "custitem_dps_fnsku",
                            join: "item"
                        },
                        {
                            name: "custitem_dps_msku",
                            join: "item"
                        },
                        {
                            name: "custitem_dps_spucoding",
                            join: "item"
                        },
                        {
                            name: "custitem_dps_skuchiense",
                            join: "item"
                        },
                        {
                            name: "custitem_dps_picture",
                            join: "item",
                        },
                        {
                            name: "custitem_dps_quality_inspection_type",
                            join: "item"
                        },
                        {
                            name: "taxamount"
                        },
                        'otherrefnum'
                    ]
                }).run().each(function (rec) {
                    record_id = rec.id;
                    record_type = rec.recordType;
                    entity = rec.getText('entity');
                    location_id = rec.getValue('location');
                    location = rec.getText('location');
                    subsidiary_id = rec.getValue('subsidiary');
                    subsidiary = rec.getText('subsidiary');
                    trandate = rec.getValue('trandate');
                    tranid = rec.getValue('tranid');
                    taxamount = rec.getValue('taxamount');

                    inspection_type = rec.getValue({
                        name: "custitem_dps_quality_inspection_type",
                        join: "item"
                    });
                    var it = Math.abs(rec.getValue('quantity'));
                    total += Number(it);
                    var info = {
                        item: rec.getValue('item'),
                        sku: rec.getValue('custcol_dps_trans_order_item_sku'),
                        rate: rec.getValue('rate'),
                        quantity: it,
                        title: rec.getValue({
                            name: "custitem_dps_skuchiense",
                            join: "item"
                        }),
                        url: rec.getValue({
                            name: "custitem_dps_picture",
                            join: "item",
                        })
                    };
                    sku_arr.push(info);
                    return --limit > 0;
                });

                var skuList = [];
                for (var i = 0; i < sku_arr.length; i++) {
                    var info = {
                        "boxNum": 0, // 箱数
                        "planQty": sku_arr[i].quantity, // 计划入库数
                        "productCode": sku_arr[i].item, // 产品编码
                        "productImageUrl": sku_arr[i].url, //图片路径
                        "productTitle": sku_arr[i].title, //产品标题
                        "remainderQty": 0, // 余数
                        "sku": sku_arr[i].sku // sku
                    }
                    skuList.push(info);
                }

                log.error('total', total);
                var da = new Date();

                log.error('Math.abs(Number(total))', Math.abs(Number(total)));


                var taxFlag = 0;
                if (taxamount > 0) {
                    taxFlag = 1;
                }
                data["boxNum"] = 0;
                data["estimateTime"] = da.toISOString();

                // 1 全检
                // 2 抽检
                // 3 免检

                var inspectionType = 2;
                if (inspection_type == 1) {
                    inspectionType = 10;
                } else if (inspection_type == 2) {
                    inspectionType = 20;
                }

                data["inspectionType"] = inspectionType;
                data["planQty"] = Math.abs(Number(total));
                // var sourceNo = record_type + '_' + record_id;

                // log.error('sourceNo', sourceNo);

                data["sourceNo"] = otherrefnum; // 来源单号

                data["sourceType"] = 20; // 来源类型
                data["taxFlag"] = taxFlag; // 是否含税

                var ent = entity.replace(/[0-9]/ig, "").trim();
                log.error('ent： ' + ent, 'entity: ' + entity);
                // data["supplierName"] = ent; // 供应商名称
                data["tradeCompanyCode"] = subsidiary_id; // 交易主体编号
                var con = subsidiary.split(':');
                log.error('con length ' + con.length, con);
                var length = con.length;
                subsidiary = con[length - 1];

                log.error('subsidiary', subsidiary);
                data["tradeCompanyName"] = subsidiary.trim(); // 交易主体名称
                data["warehouseCode"] = location_id; // 仓库编码
                data["warehouseName"] = location; // 仓库名称
                data["waybillNo"] = tranid; // 运单号
                data["skuList"] = skuList; // SKU LIST
                log.error('data', data);

            }
            // 调拨入库
            else if (sourceType == 30) {

            }
            // 盘盈入库
            else if (sourceType == 40) {

            }
            message = sendRequest(token, data);
            var flag = false;
            if (message.code == 0) {
                log.error('response code', message.data);
                flag = true;
            }
            if (sourceType == 20) {
                var id = record.submitFields({
                    type: 'returnauthorization',
                    id: context.id,
                    values: {
                        custbody_dps_wms_info: message.data,
                        custbody_dps_push_wms: flag
                    }
                });
            }
        } else {
            message.code = 1;
            message.data = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
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
            retdata = JSON.stringify(response.body);
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