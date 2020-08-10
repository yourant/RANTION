/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-15 10:09:56
 * @LastEditTime   : 2020-08-09 20:03:11
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\Helper\tool.li.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/search', 'N/record', 'N/log'], function (search, record, log) {


    /**
     * 搜索调拨单关联的采购订单
     * @param {Array} itemArr 
     * @param {Number} toId 
     */
    function searchToLinkPO(itemArr, toId) {

        var limit = 3999;
        var getInfo = [];
        var getPO = {};
        var poNo = '';
        search.create({
            type: "customrecord_transfer_order_details",
            filters: [{
                    join: "custrecord_transfer_code",
                    name: "item",
                    operator: "anyof",
                    values: itemArr
                },
                {
                    name: "custrecord_transfer_code",
                    operator: "anyof",
                    values: [toId]
                }
            ],
            columns: [{
                    name: "custrecord__realted_transfer_head",
                    summary: "GROUP"
                }, // 采购订单
                {
                    join: "CUSTRECORD_TRANSFER_CODE",
                    name: "item",
                    summary: "GROUP"
                } // 货品
            ]
        }).run().each(function (rec) {
            var item_code = rec.getValue({
                join: "CUSTRECORD_TRANSFER_CODE",
                name: "item",
                summary: "GROUP"
            });
            var tra_hea = rec.getText({
                name: "custrecord__realted_transfer_head",
                summary: "GROUP"
            });

            var a = tra_hea.split(':');
            var b = '';
            if (a && a.length >= 2) {
                b = a[1];
            }
            getPO[item_code] = b;
            return --limit > 0;

        });

        return getPO;
    }

    function groupBoxInfo(boxInfo) {

        // AllocationMasterBoxingReportDto {
        //     air(Array[AllocationBoxingReportDto], optional): 空运模板数据,
        //         aono(string, optional): aono,
        //         boxNum(integer, optional): 总箱数,
        //         centerId(string, optional): centerId,
        //         country(string, optional): 收件人国家,
        //         department(string, optional): 事业部,
        //         logisticsChannelName(string, optional): 渠道服务,
        //         referenceId(string, optional): referenceId,
        //         sea(Array[AllocationBoxingReportDto], optional): 海运模板数据,
        //         shipTo(string, optional): shipTo,
        //         shipment(string, optional): shipment,
        //         shipmentName(string, optional): shipmentName,
        //         shippingType(integer, optional): 运输方式,
        //         targetWarehouseName(string, optional): 目标仓库名称,
        //         tradeCompanyName(string, optional): 交易主体名称
        // }
        // AllocationBoxingReportDto {
        //     asin(string, optional): asin,
        //         boxNo(string, optional): 箱号,
        //         boxNum(string, optional): 总箱数,
        //         brandName(string, optional): 品牌,
        //         chargeWeight(string, optional): 体积重,
        //         englishTitle(string, optional): 英文标题,
        //         height(number, optional): 高度,
        //         imageUrl(string, optional): 图片链接,
        //         isSpellBox(string, optional): 是否拼箱,
        //         length(number, optional): 长度,
        //         logisticsGroup(string, optional): 物流分组,
        //         material(string, optional): 材质,
        //         pono(string, optional): 采购单号,
        //         productLink(string, optional): 产品链接,
        //         productTitle(string, optional): 产品标题,
        //         purchaseCost(number, optional): 采购成本,
        //         purpose(string, optional): 用途,
        //         qty(integer, optional): 数量,
        //         sku(string, optional): sku,
        //         sumChargeWeight(string, optional): 总体积重,
        //         sumQty(string, optional): 总数量,
        //         sumVolume(string, optional): 总体积,
        //         sumWeight(string, optional): 总重,
        //         volume(string, optional): 体积 / 箱(m³),
        //         weight(number, optional): 重量,
        //         width(number, optional): 宽度
        // }



        var data = {};


        var ad = []
        data.air = ad; //(Array[AllocationBoxingReportDto], optional): 空运模板数据,
        data.sea = ad; //(Array[AllocationBoxingReportDto], optional): 海运模板数据,
        data.aono = ""; //(string, optional): aono,
        data.boxNum = 0; //(integer, optional): 总箱数,
        data.centerId = boxInfo[0].CenterId; //(string, optional): centerId,
        data.country = boxInfo[0].country; //(string, optional): 收件人国家,
        data.department = ""; //(string, optional): 事业部,
        data.dlogisticsChannelName = ""; //(string, optional): 渠道服务,
        data.referenceId = boxInfo[0].ReferenceId; //(string, optional): referenceId,
        data.shipTo = ""; //(string, optional): shipTo,
        data.shipment = boxInfo[0].shipmentId; //(string, optional): shipment,
        data.shipmentName = boxInfo[0].shipmentName; //(string, optional): shipmentName,

        data.targetWarehouseName = boxInfo[0].targetWarehouseName; //(string, optional): 目标仓库名称,
        data.tradeCompanyName = boxInfo[0].Subsidiary; //(string, optional): 交易主体名称

        var boxNo = 0;
        var newBoxArr = [];
        boxInfo.map(function (box) {
            var temp = box;
            var it = JSON.stringify(temp);
            var qty = temp.qty;
            var mpq = temp.mpq;
            var a = parseInt(qty / mpq);
            // for (var j = 0; j < a; j++) {
            var get = JSON.parse(it);
            ++boxNo;
            get.boxqty = mpq; // 每箱数量
            get.boxNo = boxNo; // 箱号
            get.boxNum = 1;
            if (get.asin) {
                get.productLink = "http://www.amazon.com/gp/product/" + get.asin; // 产品链接
            }
            get.sumQty = get.qty; // 总数量
            get.isSpellBox = "否"; // 是否拼箱
            get.purchaseCost = get.averagecost; // 总数量
            get.sumChargeWeight = (get.length * get.height * get.width) / 6000; // 总体积重
            get.volume = (get.length * get.height * get.width) / 1000000; // 体积 / 箱(m³)
            get.sumVolume = get.boxNum * get.sumChargeWeight; // 总数量
            get.sumWeight = get.boxNum * get.sumChargeWeight; // 总重

            newBoxArr.push(get);

        });

        data.boxNum = boxNo; // 总箱数


        var transport = boxInfo[0].transport;

        var shippingType;
        // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
        // 1	空运   2	海运   3	铁路    4   快船
        if (transport == 1) {
            shippingType = 10;
            data.air = newBoxArr; //(Array[AllocationBoxingReportDto], optional): 海运模板数据,
        } else if (transport == 4) {
            shippingType = 30;
        } else if (transport == 2) {
            data.sea = newBoxArr; //(Array[AllocationBoxingReportDto], optional): 空运模板数据,
            shippingType = 20;
        } else if (transport == 3) {
            shippingType = 40
        }

        data.shippingType = shippingType; //(integer, optional): 运输方式,

        log.audit('数据处理 data', data);

        return data;
    }


    /**
     * 获取发运记录的信息
     * @param {*} recId 
     */
    function getBoxInfo(recId) {

        var data = {};

        var itemArr = [],
            itemObj = {},
            boxArr = [];
        var limit1 = 3999,
            limit2 = 3999;
        search.create({
            type: 'customrecord_dps_shipping_record_box',
            filters: [{
                name: 'custrecord_dps_ship_box_fa_record_link',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_ship_box_fa_record_link"
                }, // 店铺
                {
                    name: 'custrecord_dps_to_shipment_name',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // shipmentName
                {
                    name: 'custrecord_dps_shipping_rec_shipmentsid',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // shipmentId
                {
                    name: 'custrecord_dps_shipping_rec_transa_subje',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 交易主体
                {
                    name: 'custrecord_dps_shipping_rec_to_location',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 目标仓库
                {
                    name: 'custrecord_dps_shipping_rec_country_regi',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 国家简码
                {
                    name: 'custrecord_dps_shipping_rec_destinationf',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // CenterId 
                {
                    name: 'custrecord_dps_to_reference_id',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // Reference ID
                {
                    name: 'custrecord_dps_shipping_rec_transport',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }, // 运输方式
                "custrecord_dps_ship_box_box_number", // 箱号
                "custrecord_dps_ship_box_item", // 货品
                "custrecord_dps_ship_box_quantity", // 数量
                "custrecord_dps_ship_box_sku", // seller SKU
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }, // 货品中文标题
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_ship_box_item'
                }, // 长
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_ship_box_item'
                }, // 宽
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_ship_box_item'
                }, // 高
                {
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                }, // 每箱数量
                {
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱重量(G)
                {
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }, // SKU英文标题
                {
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }, // 平均成本
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }, // 品牌
                {
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }, // 物流分组
                {
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品材质
                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }, // 用途
                {
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱长
                {
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱高
                {
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_ship_box_item'
                }, // 装箱宽
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品图片
                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_ship_box_item'
                }, // 产品重
            ]
        }).run().each(function (rec) {

            var it = {
                account: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_ship_box_fa_record_link"
                }),
                shipmentName: rec.getValue({
                    name: 'custrecord_dps_to_shipment_name',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // shipmentName
                shipmentId: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_shipmentsid',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // shipmentId
                Subsidiary: rec.getText({
                    name: 'custrecord_dps_shipping_rec_transa_subje',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }).split(":").slice(-1)[0].trim(), // 交易主体
                targetWarehouseName: rec.getText({
                    name: 'custrecord_dps_shipping_rec_to_location',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 目标仓库
                country: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_country_regi',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 国家简码
                CenterId: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_destinationf',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // CenterId 
                ReferenceId: rec.getValue({
                    name: 'custrecord_dps_to_reference_id',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // Reference ID
                transport: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_transport',
                    join: 'custrecord_dps_ship_box_fa_record_link'
                }), // 运输方式
                boxNo: rec.getValue('custrecord_dps_ship_box_box_number'),
                itemId: rec.getValue('custrecord_dps_ship_box_item'),
                sku: rec.getText('custrecord_dps_ship_box_item'),
                qty: rec.getValue('custrecord_dps_ship_box_quantity'),
                sellersku: rec.getValue('custrecord_dps_ship_box_sku'),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_ship_box_item'
                }),
                length: Number(rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_ship_box_item'
                })),
                width: Number(rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_ship_box_item'
                })),
                height: Number(rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_ship_box_item'
                })),
                mpq: Number(rec.getValue({
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_ship_box_item'
                })),
                packing_weight: rec.getValue({
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_ship_box_item'
                }),
                englishTitle: rec.getValue({
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_ship_box_item'
                }),
                averagecost: rec.getValue({
                    name: 'averagecost',
                    join: 'custrecord_dps_ship_box_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_ship_box_item'
                }),
                logisticsGroup: rec.getValue({
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_ship_box_item'
                }),
                material: rec.getText({
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_ship_box_item'
                }),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_ship_box_item'
                }),
                box_long: rec.getValue({
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_ship_box_item'
                }),
                box_high: rec.getValue({
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_ship_box_item'
                }),
                box_wide: rec.getValue({
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_ship_box_item'
                }),
                imageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_ship_box_item'
                }), // 产品图片
                // chargeWeight: rec.getValue({
                //     name: 'custitem_dps_heavy2',
                //     join: 'custrecord_dps_ship_box_item'
                // }),
                weight: Number(rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_ship_box_item'
                }))
            }
            itemArr.push(rec.id);
            boxArr.push(it);
            return --limit1 > 0;
        });

        log.debug('货品信息 boxArr', boxArr);

        var fil = [];

        fil.push([
            'custrecord_ass_account', 'anyof', boxArr[0].account
        ]);
        fil.push("and");
        var add_fils = [],
            num = 0,
            len = boxArr.length;
        boxArr.map(function (ld) {
            num++;
            if (ld.sellersku) { // 存在 msku
                add_fils.push([
                    ["name", "is", ld.sellersku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            } else { // 不存在 msku
                add_fils.push([
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            }
            if (num < len)
                add_fils.push("or");
        });
        fil.push(add_fils);
        fil.push("and");
        fil.push([
            "isinactive", "is", false
        ]);
        // fil.push("and");
        // fil.push([
        //     "custrecord_ass_asin", "isnotempty", []
        // ]);

        log.audit('搜索条件', fil)
        search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: fil,
            columns: [
                "custrecord_ass_sku", // 货品
                "custrecord_ass_asin", // ASIN
                "custrecord_ass_fnsku", // fnsku
            ]

        }).run().each(function (rec) {
            var itemId = rec.getValue('custrecord_ass_sku');
            var asin = rec.getValue('custrecord_ass_asin');
            var fnsku = rec.getValue('custrecord_ass_fnsku');
            itemObj[itemId] = {
                asin: asin,
                fnsku: fnsku
            }
        });

        log.debug('搜索货品 itemObj', itemObj)

        boxArr.map(function (box) {
            box.asin = itemObj[box.itemId].asin
            box.fnsku = itemObj[box.itemId].fnsku
        });

        return boxArr;
    }

    /**
     * 获取发运记录的信息
     * @param {*} recId 
     */
    function getInfo(recId) {

        var itemArr = [],
            itemObj = {},
            boxArr = [];
        var limit1 = 3999,
            limit2 = 3999;
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_shipping_record_parentrec"
                }, // 店铺
                "custrecord_dps_shipping_record_item", // 货品
                "custrecord_dps_ship_record_item_quantity", // 数量
                "custrecord_dps_ship_record_sku_item", // seller SKU
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 货品中文标题
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 长
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 宽
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 高
                {
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 每箱数量
                {
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱重量(G)
                {
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_shipping_record_item'
                }, // SKU英文标题
                {
                    name: 'averagecost',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 平均成本
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 品牌
                {
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 物流分组
                {
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品材质
                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 用途
                {
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱长
                {
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱高
                {
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 装箱宽
            ]
        }).run().each(function (rec) {

            var it = {
                account: rec.getValue({
                    name: 'custrecord_dps_shipping_rec_account',
                    join: "custrecord_dps_shipping_record_parentrec"
                }),
                itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                itemName: rec.getText('custrecord_dps_shipping_record_item'),
                qty: rec.getValue('custrecord_dps_ship_record_item_quantity'),
                sellersku: rec.getValue('custrecord_dps_ship_record_sku_item'),
                titel: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                long: rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                width: rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                high: rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                mpq: rec.getValue({
                    name: 'custitem_dps_mpq',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                packing_weight: rec.getValue({
                    name: 'custitem_dps_packing_weight',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                englishTitle: rec.getValue({
                    name: 'custitem_dps_skuenglish',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                averagecost: rec.getValue({
                    name: 'averagecost',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                brand: rec.getValue({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                logisticsGroup: rec.getValue({
                    name: 'custitem_dps_group',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                material: rec.getValue({
                    name: 'custitem_dps_nature',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_long: rec.getValue({
                    name: 'custitem_dps_box_long',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_high: rec.getValue({
                    name: 'custitem_dps_box_high',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                box_wide: rec.getValue({
                    name: 'custitem_dps_box_wide',
                    join: 'custrecord_dps_shipping_record_item'
                })
            }
            itemArr.push(rec.id);
            boxArr.push(it);
            return --limit1 > 0;
        });

        log.debug('货品信息 boxArr', boxArr);

        var fil = [];

        fil.push([
            'custrecord_ass_account', 'anyof', boxArr[0].account
        ]);
        fil.push("and");
        var add_fils = [],
            num = 0,
            len = boxArr.length;
        boxArr.map(function (ld) {
            num++;
            if (ld.sellersku) { // 存在 msku
                add_fils.push([
                    ["name", "is", ld.sellersku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            } else { // 不存在 msku
                add_fils.push([
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            }
            if (num < len)
                add_fils.push("or");
        });
        fil.push(add_fils);
        fil.push("and");
        fil.push([
            "isinactive", "is", false
        ])
        // fil.push("and");
        // fil.push([
        //     "custrecord_ass_asin", "isnotempty", []
        // ]);

        log.audit('搜索条件', fil)
        search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: fil,
            columns: [
                "custrecord_ass_sku", // 货品
                "custrecord_ass_asin", // ASIN
                "custrecord_ass_fnsku", // fnsku
            ]

        }).run().each(function (rec) {
            var itemId = rec.getValue('custrecord_ass_sku');
            var asin = rec.getValue('custrecord_ass_asin');
            var fnsku = rec.getValue('custrecord_ass_fnsku');
            itemObj[itemId] = {
                asin: asin,
                fnsku: fnsku
            }
        });

        log.debug('搜索货品 itemObj', itemObj)

        boxArr.map(function (box) {
            box.asin = itemObj[box.itemId].asin
            box.fnsku = itemObj[box.itemId].fnsku
        });

        return boxArr;
    }



    /**
     * 保存推送 WMS 的数据
     * @param {Number} linkId 
     * @param {Object} info 
     * @param {String} recType 
     */
    function wmsInfo(linkId, info, recType, event) {

        var recId;
        search.create({
            type: 'customrecord_dps_to_wms_data_info',
            filters: [{
                name: 'custrecord_dps_to_wms_rec_links',
                operator: 'anyof',
                values: linkId
            }]
        }).run().each(function (rec) {
            recId = rec.id;
        });

        var wmsObj;
        if (recId) {
            wmsObj = record.load({
                type: 'customrecord_dps_to_wms_data_info',
                id: recId
            });
        } else {
            wmsObj = record.create({
                type: 'customrecord_dps_to_wms_data_info',
            });
        }

        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_info',
            value: JSON.stringify(info)
        });

        // 1 调拨单 2 销售出库单 3 退货出库 4 采购入库 5 退件入库
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_rec_type',
            value: recType
        }); // 单据类型
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_datetime',
            value: new Date().toISOString()
        }); // 推送时间
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_rec_links',
            value: linkId
        }); // 关联的单据
        wmsObj.setValue({
            fieldId: 'custrecord_dps_to_wms_event',
            value: event
        }); // 事件

        var wmsObj_id = wmsObj.save();

        log.debug('推送记录信息', wmsObj_id);

        return wmsObj_id || false;

    }


    /**
     * 保存推送 WMS 的数据
     * @param {Number} linkId 
     * @param {Object} info 
     * @param {String} recType 
     */
    function wmsRetInfo(linkId, info, recType, event) {

        /*
        var recId;
        search.create({
            type: 'customrecord_dps_wms_ret_info',
            filters: [{
                name: 'custrecord_dps_wen_ret_links',
                operator: 'is',
                values: linkId
            }]
        }).run().each(function (rec) {
            recId = rec.id;
        });

        var wmsObj;
        if (recId) {
            wmsObj = record.load({
                type: 'customrecord_dps_wms_ret_info',
                id: recId
            });
        } else {
            wmsObj = record.create({
                type: 'customrecord_dps_wms_ret_info',
            });
        }
        */

        var wmsObj = record.create({
            type: 'customrecord_dps_wms_ret_info',
        });

        wmsObj.setValue({
            fieldId: '	custrecord_dps_wms_ret_info',
            value: JSON.stringify(info)
        }); // WMS 回传的数据

        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_ret_rectype',
            value: recType
        }); // 单据类型
        wmsObj.setValue({
            fieldId: 'custrecord_dps_ret_info_date',
            value: new Date().toISOString()
        }); // 回传时间
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wen_ret_links',
            value: linkId
        }); // 关联的单据
        wmsObj.setValue({
            fieldId: 'custrecord_dps_wms_ret_event',
            value: event
        }); // 事件

        var wmsObj_id = wmsObj.save();

        log.debug('回传数据记录ID', wmsObj_id);

        return wmsObj_id || false;

    }



    /**
     * 获取出入库货品信息
     * @param {Array} detailList 出/入库货品详情
     * @returns {Array} allArr 货品详情数组
     */
    function getAllBinBox(detailList) {
        // add 获取所有库位和箱号
        var allArr = [];

        for (var i_d = 0, i_dLen = detailList.length; i_d < i_dLen; i_d++) {
            var it = detailList[i_d].detailRecordList;
            for (var j_d = 0, j_dLen = it.length; j_d < j_dLen; j_d++) {
                allArr.push(it[j_d]);
            }

        }
        it.mpa(function (i_d) {
            allArr.push(it[i_d]);
        });
        log.debug('allArr', allArr);
        return allArr || false;
    }

    /**
     * 判断库存或者箱号时候存在
     * @param {String} action  操作的类型 "create" —— 表示 创建;
     * @param {Array} itemArr  货品数组
     * @returns {Array || Boolean} a_arr(库位/箱号 数组) || false
     */
    function judgmentBinBox(action, itemArr) {
        var itemObj = SummaryBinBox(itemArr);
        var boxObj = itemObj.BoxObj,
            binObj = itemObj.BinObj;
        log.debug('itemObj', itemObj);
        var BoxObjKey = Object.keys(boxObj);

        var BinObjKey = Object.keys(binObj);

        var binType = "customlist_location_bin",
            boxType = "customlist_case_number",
            a_arr = [];
        if (BoxObjKey && BoxObjKey.length > 0) {
            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 箱号动态
                var s_a = searchLocationBin(boxType, BoxObjKey[i]);
                if (!s_a) {
                    if (action == "create") {
                        var boxId = createLocationBin(boxType, BoxObjKey[i]);

                    } else {
                        a_arr.push("箱号" + BoxObjKey[i]);
                    }
                }
            }
        }

        if (BinObjKey && BinObjKey.length > 0) {
            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 库位固定
                var s_a = searchLocationBin(binType, BinObjKey[i]);
                if (!s_a) {
                    a_arr.push("库位：" + BinObjKey[i]);
                }
            }
        }

        return a_arr || false;
    }



    /**
     * 处理出库货品数组, 根据 库位 和 箱号 进行分组
     * @param {Array} itemArr 货币数组
     * @returns {Object} itemObj{BoxObj(箱号对象), BinObj(库位对象)}  || false
     */
    function SummaryBinBox(itemArr) {
        var BinArr = [],
            BoxArr = [],
            sBinBox = [];
        itemArr.forEach(function (item) {
            var type = item.type;
            if (type == 2) { // 未装箱, 从库位出
                BinArr.push(item)
            } else { // 已装箱, 从箱号出
                BoxArr.push(item)
            }
        });

        var BinObj = {},
            sunBinArr1 = [];
        // 同库位合并
        for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {
            var sunBinArr = [];
            var bin_temp = BinArr[i_bin];

            if (BinObj[bin_temp.positionCode]) {
                sunBinArr = BinObj[bin_temp.positionCode]
            }
            sunBinArr.push(bin_temp);
            for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {
                var j_bin_temp = BinArr[j_bin];
                if (bin_temp.positionCode == j_bin_temp.positionCode) {
                    sunBinArr.push(j_bin_temp);

                }
            }
            BinObj[bin_temp.positionCode] = sunBinArr;
        }

        var BoxObj = {},
            sunBoxArr1 = [];
        // 同箱号合并
        for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
            var box_temp = BoxArr[i_box];
            var sunBoxArr = [];
            if (BoxObj[box_temp.barcode]) {
                sunBinArr = BoxObj[bin_temp.positionCode]
            }
            sunBoxArr.push(box_temp);
            for (var j_box = i_box + 1; j_box < binLen; j_box++) {
                var j_box_temp = BoxArr[j_box];
                if (box_temp.barcode == j_box_temp.barcode) {
                    sunBoxArr.push(j_box_temp);
                }
            }
            BoxObj[box_temp.barcode] = sunBoxArr;
        }

        var itemObj = {
            "BoxObj": BoxObj,
            "BinObj": BinObj
        }

        return itemObj || false;

    }

    /**
     * 搜索库存对应的列表, 通过库存(箱号)名称, 获取库位ID
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function searchLocationBin(listType, BinName) {

        var BinId;
        search.create({
            type: listType,
            filters: [{
                    name: 'name',
                    operator: 'is',
                    values: BinName
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }, // 排除已经非活动的记录
            ]
        }).run().each(function (rec) {
            BinId = rec.id
        });
        return BinId || false;
    }

    /**
     * 创建对应的列表记录
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称 || 箱号
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function createLocationBin(listType, BinName) {

        var BinId;
        var bin = record.create({
            type: listType
        });
        bin.setValue({
            fieldId: 'name',
            value: BinName
        });
        BinId = bin.save();
        log.debug('BinId', BinId);
        return BinId || false;
    }


    /**
     * 生成销售订单的货品履行单
     * @param {Number} recId  记录ID
     */
    function createItemFulfillment(recId) {
        var f = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: recId
        });
        f.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });
        var fId = f.save();
        return fId || false;
    }

    /**
     * 生成销售订单的发票
     * @param {Number} recId 
     */
    function createInvoice(recId) {
        var invId;
        var inv = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.INVOICE,
            fromId: recId
        });
        invId = inv.save();
        return invId || false;
    }


    /**
     * 搜索对应的事务处理类型, 返货货品的 内部ID 和 货品名称
     * @param {String} recType 记录类型
     * @param {Number} recId 记录ID
     * @returns {*} itemArr(货品信息数组) || false
     */
    function searchTransactionItemInfo(recType, recId) {
        var limit = 3999,
            itemArr = [],
            item_temp, quantity_temp;

        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [recId]
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
                "item", "quantity"
            ]
        }).run().each(function (rec) {

            if (recType == "transferorder") {

                var item_id = rec.getValue('item'),
                    item_name = rec.getText('item'),
                    item_quantity = rec.getValue('quantity');
                if (item_id && item_name) {
                    if (item_temp != item_id && quantity_temp != item_quantity) {
                        var it = {
                            itemId: item_id,
                            itemName: item_name,
                            itemQty: Math.abs(item_quantity)
                        }
                        itemArr.push(it);
                    }
                    item_temp = item_id;
                    quantity_temp = item_quantity;
                }

            } else {
                var it = {
                    itemId: rec.getValue('item'),
                    itemName: rec.getText('item'),
                    itemQty: rec.getValue('quantity')
                }
                itemArr.push(it);
            }
            return --limit > 0;
        });

        return itemArr || false;
    }
    /**
     * 搜索对应的事务处理类型, 返货货品的 内部ID 和 货品名称
     * @param {String} recType 记录类型
     * @param {Number} recId 记录ID
     * @returns {*} itemObj {货品名称:货品ID} (货品信息对象) || false
     */
    function searchTransactionItemObj(recType, recId) {
        var limit = 3999,
            itemObj = {},
            item_temp, quantity_temp;

        search.create({
            type: recType,
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [recId]
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
                "item", "quantity"
            ]
        }).run().each(function (rec) {

            if (recType == "transferorder") { // 库存转移订单会出现多行重复项

                var item_id = rec.getValue('item'),

                    item_name = rec.getText('item'),
                    item_quantity = rec.getValue('quantity');
                if (item_id && item_name) {
                    if (item_temp != item_id && quantity_temp != item_quantity) {
                        itemObj[rec.getText('item')] = rec.getValue('item');
                    }
                    item_temp = item_id;
                    quantity_temp = item_quantity;
                }

            } else {
                itemObj[rec.getText('item')] = rec.getValue('item');
            }
            return --limit > 0;
        });

        return itemObj || false;
    }



    /**
     * 判断获取到的货品信息是否完全
     * @param {Number} recId 
     * @param {Array} judArr 
     */
    function judgmentFlag(recId, judArr) {

        var limit = 3999,
            fulArr = [];
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: recId
            }],
            columns: [{
                // 发运记录的货品
                name: 'custrecord_dps_shipping_record_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            }]
        }).run().each(function (rec) {

            var it = rec.getText({
                name: 'custrecord_dps_shipping_record_item',
                join: 'custrecord_dps_shipping_record_parentrec'
            })
            fulArr.push(it);

            return --limit > 0;
        });


        var itemIdArr = [];
        judArr.map(function (jud) {
            var itemId = jud.sku;
            itemIdArr.push(itemId);
        });


        var diffArr = checkDifferentArr(itemIdArr, fulArr);

        return diffArr;
    }



    /**
     * 获取两个数组的差异值
     * @param {Array} arr1 数组1
     * @param {Array} arr2 数组2
     */
    function checkDifferentArr(arr1, arr2) {
        var newArr = [];
        var arr3 = [];
        for (var i = 0; i < arr1.length; i++) {
            if (arr2.indexOf(arr1[i]) === -1)
                arr3.push(arr1[i]);
        }
        var arr4 = [];
        for (var j = 0; j < arr2.length; j++) {
            if (arr1.indexOf(arr2[j]) === -1) {
                arr4.push(arr2[j]);
            }
        }
        newArr = arr3.concat(arr4);
        return newArr;
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



    return {
        SummaryBinBox: SummaryBinBox,
        searchLocationBin: searchLocationBin,
        createLocationBin: createLocationBin,
        judgmentBinBox: judgmentBinBox,
        getAllBinBox: getAllBinBox,
        searchTransactionItemInfo: searchTransactionItemInfo,
        searchTransactionItemObj: searchTransactionItemObj,
        wmsInfo: wmsInfo,
        wmsRetInfo: wmsRetInfo,
        judgmentFlag: judgmentFlag,
        searchToLinkPO: searchToLinkPO,
        checkDifferentArr: checkDifferentArr,
        getToken: getToken,
        getInfo: getInfo,
        getBoxInfo: getBoxInfo,
        groupBoxInfo: groupBoxInfo
    }
});