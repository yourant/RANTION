/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-22 23:57:07
 * @LastEditTime   : 2020-08-19 11:50:29
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.full.to.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */


/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', 'N/format', 'N/https', './Rantion/Helper/tool.li'], function (record, search, log, format, https, tool) {

    function _post(context) {


        var action = context.action;

        var recIds = context.recIds;

        if (action == "search") {

        }

        if (action == "update") {
            try {
                // VendorPrepayment(context.recId);

            } catch (error) {
                log.error('更改字段出错了', error);
            }
        }

        if (action == "tranferOrderToWMS") {
            var get_data = tranferOrderToWMS();

            var token = getToken();
            if (token) {

            }
        }


    }



    function tranferOrderToWMS(recIds) {

        // InMasterCreateRequestDto {
        //     boxNum(integer): 箱数,       1
        //     estimateTime(string): 预计到货时间,          1
        //     inspectionType(integer): 质检类型 10: 全检 20: 抽检,             1
        //     planQty(integer): 计划入库数量,
        //     pono(string, optional): 采购单号,
        //     purchaser(string): 采购员,
        //     remark(string, optional): 备注,                1
        //     skuList(Array[InDetailCreateRequestDto]): 入库SKU明细,
        //     sourceNo(string): 来源单号,                  1
        //     sourceType(integer): 来源类型 10: 交货单 20: 退货入库 30: 调拨入库 40: 借调入库,             1
        //     supplierCode(string, optional): 供应商编号,
        //     supplierName(string, optional): 供应商名称,
        //     taxFlag(integer): 是否含税 0: 否1: 是,               1
        //     tradeCompanyCode(string): 交易主体编号,              1
        //     tradeCompanyName(string): 交易主体名称,              1
        //     warehouseCode(string): 仓库编号,                 1
        //     warehouseName(string): 仓库名称,                 1
        //     waybillNo(string, optional): 运单号
        // }
        // InDetailCreateRequestDto {
        //     boxInfo(InDetailBoxInfoCreateRequestDto): 箱子信息,
        //     boxNum(integer): 箱数,
        //     inspectionType(integer): 质检类型 10: 全检 20: 抽检 30: 免检,
        //     planQty(integer): 计划入库数,
        //     productCode(string): 产品编号,
        //     productImageUrl(string): 图片路径,
        //     productTitle(string): 产品标题,
        //     remainderQty(integer): 余数,
        //     sku(string): sku,
        //     supplierVariant(string, optional): 供应商变体规格 json,
        //     variant(string, optional): 变体规格 json
        // }
        // InDetailBoxInfoCreateRequestDto {
        //     height(number): 高,
        //     length(number): 长,
        //     width(number): 宽
        // }


        var limit = 3999;

        var data = {};
        var itemInfo = [];
        data.sourceType = 30;
        data.estimateTime = new Date().toISOString();
        data.inspectionType = 10;
        data.boxNum = 10;
        data.taxFlag = 0;

        var planQty = 0;

        search.create({
            type: "transferorder",
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: recIds
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
            columns: [
                "subsidiary", // 子公司
                // "transferlocation", // 入库地点
                "memo", // 备注
                "custbodyexpected_arrival_time", // 预计到货时间
                "tranid", // 订单号
                {
                    name: "custrecord_dps_wms_location",
                    join: "toLocation"
                }, // 仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: "toLocation"
                }, // 仓库名称

                "item", "quantity",
                {
                    name: 'custitem_dps_picture',
                    join: 'item'
                }, // 产品图片
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'item'
                }, // 中文标题
                {
                    name: 'custitem_dps_mpq',
                    join: 'item'
                }, // 每箱数量
            ]
        }).run().each(function (rec) {

            data.tradeCompanyCode = rec.getValue('subsidiary');
            data.tradeCompanyName = rec.getText('subsidiary').split(":").slice(-1)[0].trim();
            data.remark = rec.getValue('memo');



            var loca_code = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'toLocation'
            });

            var loca_name = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'toLocation'
            })
            log.audit('loca_code: ' + loca_code, 'loca_name: ' + loca_name)

            data.sourceNo = rec.getValue('tranid');
            data.warehouseCode = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'toLocation'
            });
            data.warehouseName = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'toLocation'
            });

            var temp_qty = Number(rec.getValue('quantity'));

            var mpq = rec.getValue({
                name: 'custitem_dps_mpq',
                join: 'item'
            });
            log.audit('mpq', mpq);

            var imgUrl = rec.getValue({
                name: 'custitem_dps_picture',
                join: 'item'
            })

            var it = {
                boxNum: 1,
                inspectionType: 30,
                planQty: temp_qty,
                productCode: rec.getValue('item'),
                productImageUrl: imgUrl ? imgUrl : 'imgUrl',
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'item'
                }),
                remainderQty: temp_qty % (mpq ? mpq : 1),
                sku: rec.getText('item'),
            }

            if (temp_qty > 0) {

                planQty += temp_qty;
                itemInfo.push(it);
            }

            return --limit > 0;
        });
        data.skuList = itemInfo; //   货品数量
        data.planQty = planQty; //   计划入库数

        return data;

    }

    /**
     * 获取
     */
    function searchPreDate() {

        var idArr = [];
        var mySearch = search.load({
            id: 'customsearch_dps_li_vendorprepayment'
        });

        mySearch.run().each(function (rec) {
            idArr.push(rec.id);

            return true;
        });

        return idArr;
    }


    /**
     * 更改供应商预付款单的日期
     * @param {Number} recId 
     */
    function VendorPrepayment(recId) {

        search.create({
            type: 'customrecord_supplier_advance_charge',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [
                "custrecord_dps_advance_charge_time", // 日期
                "custrecord_related_prepayment", // 关联预付款单
            ]
        }).run().each(function (rec) {
            record.submitFields({
                type: 'vendorprepayment',
                id: rec.getValue('custrecord_related_prepayment'),
                values: {
                    trandate: rec.getValue("custrecord_dps_advance_charge_time")
                }
            })
        });

    }



    function ToWMS(context) {
        var limit = 3999,
            itemArr = [],
            date = {};


        data["boxNum"] = 1; // 箱数
        data["estimateTime"] = new Date().toISOString(); // 预计到货时间
        data["inspectionType"] = 10; // 质检类型
        data["sourceNo"] = toNO; // 来源单号
        data["sourceType"] = 30; // 来源类型
        data["taxFlag"] = 0; // 是否含税
        data["tradeCompanyCode"] = 0; // 交易主体编号
        data["tradeCompanyName"] = 0; // 交易主体名称
        data["warehouseCode"] = "US_MX"; // 仓库编号
        data["warehouseName"] = "美西仓"; // 仓库名称


        search.create({
            type: 'transferorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                value: context
            }],
            columns: [

            ]
        }).run().each(function (rec) {

            var it = {
                boxInfo: {
                    msg: 123
                },
                boxNum: 1,
                inspectionType: 30,
                planQty: 1,
                productCode: 1,
                productImageUrl: 1,

            };


            itemArr.push();
            return --limit > 0;
        })

        data["skuList"] = "美西仓"; // 入库明细

    }


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



    function recTO() {
        var ord = [];
        var limit = 2;

        var a = new Date().getTime();
        search.create({
            type: "customrecord_dps_juge_po",
            filters: [{
                    name: 'custrecord_juge_wrong',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'custrecord_juge_sho',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "custrecord_juge_time", // 收货日期
                "custrecord_juge_po", // 调拨单ID
                "custrecord_juge_sho", // 已生成单据
                "custrecord_juge_wrong", // 数据有问题
            ]
        }).run().each(function (rec) {


            log.debug("编号: " + rec.id, rec.getText("custrecord_juge_po"))
            try {

                var n_date = rec.getValue('custrecord_juge_time') + "T10:00:00.000Z"

                log.debug("rec.getValue('custrecord_juge_time')", rec.getValue('custrecord_juge_time'))
                // 直接履行
                var objRecord = record.transform({
                    fromType: 'transferorder',
                    fromId: rec.getValue('custrecord_juge_po'),
                    toType: 'itemfulfillment',
                });

                objRecord.setValue({
                    fieldId: 'shipstatus',
                    value: 'C'
                });

                var numLines = objRecord.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < numLines; i++) {
                    objRecord.setSublistText({
                        sublistId: 'item',
                        fieldId: 'custcol_location_bin',
                        text: 'HD1A01',
                        line: i
                    }); // 仓库编号
                }

                objRecord.setText({
                    fieldId: 'trandate',
                    text: rec.getValue('custrecord_juge_time')
                });
                // objRecord.setValue({
                //     fieldId: 'trandate',
                //     value: format.format({
                //         value: new Date(n_date),
                //         type: format.Type.DATE
                //     })
                // });


                var objRecord_id = objRecord.save();





                var objRecordCeipt = record.transform({
                    fromType: 'transferorder',
                    fromId: rec.getValue('custrecord_juge_po'),
                    toType: 'itemreceipt',
                });

                objRecordCeipt.setText({
                    fieldId: 'trandate',
                    text: rec.getValue('custrecord_juge_time')
                });


                var numLines = objRecordCeipt.getLineCount({
                    sublistId: 'item'
                });

                for (var i = 0; i < numLines; i++) {
                    objRecordCeipt.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_location_bin',
                        value: '',
                        line: i
                    }); // 仓库编号
                }



                var obj_id = objRecordCeipt.save();

                var l_rec_id = record.submitFields({
                    type: 'customrecord_dps_juge_po',
                    id: rec.id,
                    values: {
                        custrecord_juge_sho: true
                    },
                })
            } catch (error) {

                log.error('出错 ' + rec.getText("custrecord_juge_po"), error)
                var l_rec_id = record.submitFields({
                    type: 'customrecord_dps_juge_po',
                    id: rec.id,
                    values: {
                        custrecord_juge_wrong: true
                    },
                })
            }


            return --limit > 0;

        });


        var b = new Date().getTime();
        var c = {
            "处理时间": (b - a) / 1000 + ' 秒'
        }

        return c
    }
    return {

        post: _post,

    }
});