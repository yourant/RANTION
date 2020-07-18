/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/search', 'N/url', 'N/https'], function (record, log, search, url, https) {

    function _post(context) {

        var v_record = record.load({
            id: context.id,
            type: "vendorreturnauthorization"
        });

        var p_record = record.load({
            id: context.poId,
            type: "purchaseorder"
        });

        var datas = [];
        var locations = [];

        var OutDetailCreateRequestDtos = [];
        var item_count = v_record.getLineCount({ sublistId: 'item' });
        var all_qty = [];
        var location = '';
        var wms_location_names = [];
        for (var i = 0; i < item_count; i++) {

            var OutDetailCreateRequestDto = {};
            var itemid = v_record.getSublistText({
                sublistId: 'item',
                fieldId: 'item',
                line: i
            });

            var sku = itemid;
            var productCode, productImageUrl, productType, productTitle, qty, variants = '';

            search.create({
                type: 'item',
                filters: [{
                    name: 'itemid',
                    operator: 'is',
                    values: itemid
                }],
                columns: [
                    'custitem_dps_spucoding', //产品编号
                    'custitem_dps_picture', //图片路径
                    'custitem_dps_ctype', //产品类型 10:成品 20:半成品 30:组合产品 40:包装材料 ,
                    'custitem_dps_skuchiense', //产品标题
                    //'custitem_dps_skuenglish', //sku
                    'custitem_dps_specifications', //变体规格
                ]
            }).run().each(function (res) {
                productCode = res.getValue('custitem_dps_spucoding');
                productImageUrl = res.getValue('custitem_dps_picture');
                productTitle = res.getValue('custitem_dps_skuchiense');
                productType = res.getValue('custitem_dps_ctype');
                variants = res.getValue('custitem_dps_specifications');
            });


            if (productImageUrl == '') {
                productImageUrl = 'https://cdn.shopify.com/s/files/1/1384/9629/files/ACOUSTIC-GUITAR.jpg';
            }

            if (productType == '') {
                productType = 10;
            }

            var qty = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });

            var location = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: i
            });

            var location_display = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location_display',
                line: i
            });

            var v_location = record.load({
                type: 'location',
                id: location
            });

            var wms_location = v_location.getValue('custrecord_dps_wms_location');
            var wms_location_name = v_location.getValue('custrecord_dps_wms_location_name');

            var wms_location_o = { wms_location: wms_location, wms_location_name: wms_location_name };

            if (locations.indexOf(wms_location) < 0) {
                locations.push(wms_location);
                wms_location_names[wms_location] = wms_location_name;
            }

            //设置默认总数
            if (typeof (all_qty[wms_location]) == 'undefined') {
                all_qty[wms_location] = 0;
            }

            all_qty[wms_location] += qty;
            OutDetailCreateRequestDto.productCode = productCode;
            OutDetailCreateRequestDto.productImageUrl = productImageUrl;
            OutDetailCreateRequestDto.productTitle = productTitle;
            OutDetailCreateRequestDto.productType = productType;
            OutDetailCreateRequestDto.qty = qty;
            OutDetailCreateRequestDto.sku = sku;
            if (variants != '')
                OutDetailCreateRequestDto.variants = variants;

            if (typeof (OutDetailCreateRequestDtos[wms_location]) == 'undefined')
                OutDetailCreateRequestDtos[wms_location] = [];
            OutDetailCreateRequestDtos[wms_location].push(OutDetailCreateRequestDto);
        }

        //获取供应商信息
        var entity_id = v_record.getValue('entity');
        var entity = record.load({
            type: 'vendor',
            id: entity_id
        });


        var address = entity.getSublistValue({
            sublistId: 'addressbook',
            fieldId: 'addressbookaddress_text',
            line: 0
        });

        //获取供应商邮箱
        var email = entity.getValue('email');

        //供应商移动电话
        var telphone = entity.getValue('altphone');

        //供应商手机
        var mobilePhone = entity.getValue('phone');

        //获取平台信息
        var platformCode = p_record.getValue('custitem_dps_platformcode');
        var platformName = p_record.getValue('custitem_dps_platformname');

        //获取店铺信息
        var shopCode = p_record.getValue('custitem_dps_shopCode');
        var shopName = p_record.getValue('custitem_dps_shopName');
        if (shopCode == '') {
            shopCode = '';
            shopName = '';
            log.debug('shopInfo:', 'unset');
        }


        //获取备注信息
        var sourceNo = v_record.id;
        var remark = v_record.getValue('memo');

        var customrecord_logistics_service_id;
        var customrecord_logistics_company_id;

        //获取渠道信息

        search.create({
            type: 'customrecord_logistics_service',
            filters: [{
                name: 'name',
                operator: 'is',
                values: '货拉拉渠道服务'
            }],
            columns: [
                'custrecord_ls_logistics_company'
            ]
        }).run().each(function (res) {
            customrecord_logistics_service_id = res.id;
            customrecord_logistics_company_id = res.getValue('custrecord_ls_logistics_company');
        });


        //根据wms仓库合并数据生成出库单
        locations.forEach(function (location) {


            OutMasterCreateRequestDto = {
                sourceType: 20, //来源类型 10: 销售订单 20: 采购退货单 30: 调拨单 40: 移库单 50: 库存调整,

                address: address, // '地址', // (string)
                email: email, //'邮箱地址', //(string, optional)
                mobilePhone: mobilePhone, //'移动电话', //(string)
                telephone: telphone, //'固定电话', //(string, optional)

                logisticsChannelCode: customrecord_logistics_service_id, //'物流渠道服务编号', //(string)
                logisticsChannelName: '货拉拉渠道服务', //'物流渠道服务名称', //(string)
                //logisticsLabelPath: logisticsLabelPath, //' 物流面单文件路径', //(string)
                logisticsProviderCode: customrecord_logistics_company_id, //'物流渠道商编号', //(string)
                logisticsProviderName: '货拉拉', //'物流渠道商名称', //(string)

                sourceNo: sourceNo + '-' + location, //'来源单号', //(string)
                remark: remark, //'备注', //(string, optional)

                warehouseCode: location, //'仓库编号', //(string)
                warehouseName: wms_location_names[location], //'仓库名称', //(string)

                /*不确定，可以没有*/
                shopCode: shopCode, //'店铺编号', //(string, optional)
                shopName: shopName, //'店铺名称', //(string, optional)
                platformCode: platformCode, //'平台编号', //(string, optional)
                platformName: platformName, //'平台名称', //(string, optional)

                //#region  /*没有*/
                /*
                waybillNo: '没有', //'运单号' //(string)
                city: '没有', //'城市', // (string)
                country: '没有', //'国家', //(string)
                countryCode: '没有', //'国家简码', //(string)
                postcode: '没有', //'邮编', //(string)
                province: '没有', //'省份', //(string)
                recipient: '没有', //'收件人', //(string)
                trackingNo: '没有', //'最终跟踪号', //(string, optional)
                */
                //#endregion

                detailCreateRequestDtos: OutDetailCreateRequestDtos[wms_location], //出库单明细 ,(Array[OutDetailCreateRequestDto])
                qty: all_qty[wms_location], //'数量', //(integer, optional)
            }

            datas.push(OutMasterCreateRequestDto);

            log.debug('datas', datas);
        });

        return datas;
    }

    return {
        post: _post,
    }
});