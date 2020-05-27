/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function (search, http, record) {

    function _get(context) {

    }

    /**
     * 参数示例：
     * {
        "boxNum": 2,
        "estimateTime": "2020-05-14T06:20:05.869Z",
        "inspectionType": 20,
        "planQty": 200,
        "pono": "PO006",
        "purchaser": "某帅",
        "remark": "测试",
        "skuList": [
            {
            "planQty": 50,
            "productCode": "SPU003",
            "productImageUrl": "http://a4.att.hudong.com/86/44/01300000336482123305442457077.jpg",
            "productTitle": "壹号",
            "sku": "SKU031",
            "supplierVariant": "{\"name\":\"颜色\",\"value\":\"红色\"}",
            "variant": "{\"name\":\"颜色\",\"value\":\"红色\"}",
            "boxNum":0,
            "remainderQty":50
            },
        {
            "planQty": 150,
            "productCode": "SPU003",
            "productImageUrl": "http://5b0988e595225.cdn.sohucs.com/q_70,c_zoom,w_640/images/20190101/3f15616528194351992b5beb1af64050.jpe",
            "productTitle": "壹号",
            "sku": "SKU032",
            "supplierVariant": "{\"name\":\"颜色\",\"value\":\"蓝色\"}",
            "variant": "{\"name\":\"颜色\",\"value\":\"蓝色\"}",
            "boxNum":0,
            "remainderQty":50
            }
        ],
        "sourceNo": "LN006",
        "sourceType": 10,
        "supplierCode": "T01",
        "supplierName": "T01",
        "taxFlag": 0,
        "tradeCompanyCode": "LSMY",
        "tradeCompanyName": "蓝深贸易",
        "warehouseCode": "HD",
        "warehouseName": "HD",
        "waybillNo": "W006"
        }

     * @param {*} context 
     */
    function _post(context) {
        var token, retdata;
        var message = {};
        var code = 0;
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
        if (token) {
            var data = {};
            var sourceType = Number(context.sourceType); // 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库
            // 交货单入库
            if (sourceType == 10) {

            }
            // 退货入库
            else if (sourceType == 20) {

                var limit = 3999;
                var sku_arr = [],
                    item_sku = [],
                    record_type,
                    record_id,
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
                        'trandate', 'tranid', 'custcol_dps_trans_order_item_sku', 'custcol_dps_so_item_title'
                    ]
                }).run().each(function (rec) {
                    record_id = rec.id;
                    record_type = rec.recordType;
                    entity = rec.getText('entity');
                    location = rec.getText('location');
                    subsidiary = rec.getText('subsidiary');
                    trandate = rec.getValue('trandate');
                    tranid = rec.getValue('tranid');
                    var it = Math.abs(rec.getValue('quantity'));
                    total += Number(it);
                    var info = {
                        item: rec.getText('item'),
                        sku: rec.getValue('custcol_dps_trans_order_item_sku'),
                        rate: rec.getValue('rate'),
                        quantity: it,
                        title: rec.getValue('custcol_dps_so_item_title')
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
                        "productImageUrl": 'url', //图片路径
                        "productTitle": sku_arr[i].title ? sku_arr[i].title : sku_arr[i].item, //产品标题
                        "remainderQty": 0, // 余数
                        "sku": sku_arr[i].sku // sku
                    }
                    skuList.push(info);
                }

                log.error('total', total);
                var da = new Date();

                log.error('Math.abs(Number(total))', Math.abs(Number(total)));


                // InMasterCreateRequestDto {
                //     boxNum(integer): 箱数,
                //         estimateTime(string): 预计到货时间,
                //         inspectionType(integer): 质检类型 10: 全检 20: 抽检,
                //         planQty(integer): 计划入库数量,
                //         pono(string): 采购单号,
                //         purchaser(string): 采购员,
                //         remark(string): 备注,
                //         skuList(Array[InDetailCreateRequestDto]): 入库SKU明细,
                //         sourceNo(string): 来源单号,
                //         sourceType(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 盘盈入库,
                //         supplierCode(string): 供应商编号,
                //         supplierName(string): 供应商名称,
                //         taxFlag(integer): 是否含税 0: 否1: 是,
                //         tradeCompanyCode(string): 交易主体编号,
                //         tradeCompanyName(string): 交易主体名称,
                //         warehouseCode(string): 仓库编号,
                //         warehouseName(string): 仓库名称,
                //         waybillNo(string): 运单号
                // }
                // InDetailCreateRequestDto {
                //     boxNum(integer): 箱数,
                //         planQty(integer): 计划入库数,
                //         productCode(string): 产品编号,
                //         productImageUrl(string): 图片路径,
                //         productTitle(string): 产品标题,
                //         remainderQty(integer): 余数,
                //         sku(string): sku,
                //         supplierVariant(string): 供应商变体规格 json,
                //         variant(string): 变体规格 json
                // }

                data["boxNum"] = 0;
                data["estimateTime"] = da.toISOString();
                data["inspectionType"] = 20;
                data["planQty"] = Math.abs(Number(total));
                var sourceNo = record_type + '_' + record_id;

                log.error('sourceNo', sourceNo);

                data["sourceNo"] = sourceNo; // 来源单号
                data["sourceType"] = 20; // 来源类型
                data["purchaser"] = 'AMAZON'; // 采购员
                data["remark"] = 'test'; // 备注
                data["taxFlag"] = 0; // 是否含税

                var ent = entity.replace(/[0-9]/ig, "").trim();
                log.error('ent： ' + ent, 'entity: ' + entity);
                // data["supplierName"] = ent; // 供应商名称
                data["tradeCompanyCode"] = "LSMY"; // 交易主体编号
                var con = subsidiary.split(':');
                log.error('con length ' + con.length, con);
                var length = con.length;
                subsidiary = con[length - 1];

                log.error('subsidiary', subsidiary);
                data["tradeCompanyName"] = subsidiary.trim(); // 交易主体名称
                data["warehouseCode"] = location; // 仓库编码
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
            log.debug('response', JSON.stringify(response));
            retdata = JSON.stringify(response);

            log.error('response', response);

            var flag = false;
            if (response.body.code == 0) {
                log.error('response code', response.code);
                flag = true;
            }
            if (sourceType == 20) {
                var id = record.submitFields({
                    type: 'returnauthorization',
                    id: context.id,
                    values: {
                        custbody_dps_wms_info: response.body,
                        custbody_dps_push_wms: flag
                    }
                });
            }
            code = response.code;
        } else {
            code = 1;
            retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
        message.code = code;
        message.data = response.body;
        return message;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    // function pacakgeDate(data) {
    //     var bodyjson = {};
    //     bodyjson.boxNum = Number(data.boxNum); // 箱数
    //     bodyjson.estimateTime = data.estimateTime; // 预计到货时间(选填)
    //     bodyjson.inspectionType = Number(data.boxNum); // 质检类型 10:全检 20:抽检
    //     bodyjson.pono = data.pono; // 采购单号
    //     bodyjson.purchaser = data.purchaser; // 采购员
    //     bodyjson.remark = data.remark; // 备注(选填)
    //     bodyjson.sourceNo = data.sourceNo; // 来源单号
    //     bodyjson.sourceType = Number(data.sourceType); // 来源类型 10:交货单 20:退货入库 30:调拨入库 40:盘盈入库
    //     bodyjson.supplierCode = data.supplierCode; // 供应商编号
    //     bodyjson.supplierName = data.supplierName; // 供应商名称
    //     bodyjson.taxFlag = Number(data.taxFlag); // 是否含税 0:否 1:是 
    //     bodyjson.tradeCompanyCode = data.tradeCompanyCode; // 交易主体编号
    //     bodyjson.tradeCompanyName = data.tradeCompanyName; // 交易主体名称
    //     bodyjson.warehouseCode = data.warehouseCode; // 仓库编号
    //     bodyjson.warehouseName = data.warehouseName; // 仓库名称
    //     bodyjson.waybillNo = data.waybillNo; // 运单号

    //     var planQtyTotal = 0;
    //     var skuList = [];
    //     var skus = data.skus;
    //     for (var index = 0; index < skus.length; index++) {
    //         var skujson = {};
    //         skujson.boxNum = Number(skus[index].boxNum ? skus[index].boxNum : 0); // 箱数
    //         skujson.planQty = Number(skus[index].planQty ? skus[index].planQty : 0); // 计划入库数
    //         planQtyTotal = planQtyTotal + skujson.planQty;
    //         skujson.productCode = skus[index].productCode; // 产品编号
    //         skujson.productImageUrl = skus[index].productImageUrl; // 图片路径(选填)
    //         skujson.productTitle = skus[index].productTitle; // 产品标题
    //         skujson.sku = skus[index].sku; // sku
    //         skujson.supplierVariant = skus[index].supplierVariant; // 供应商变体规格 json(选填)
    //         skujson.variant = skus[index].variant; // 变体规格 json(选填)
    //         skujson.remainderQty = Number(skus[index].remainderQty ? skus[index].remainderQty : 0); // 余数
    //         skuList.push(skujson);
    //     }
    //     bodyjson.planQty = Number(planQtyTotal); // 计划入库数量
    //     return bodyjson;
    // }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});