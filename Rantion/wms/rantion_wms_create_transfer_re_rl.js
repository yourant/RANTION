/*
 * @Author         : Li
 * @Date           : 2020-05-18 12:00:00
 * @LastEditTime   : 2020-05-23 15:40:45
 * @LastEditors    : Li
 * @Description    : 调拨单 回传 NS, 回写信息至相关单据
 * @FilePath       : \Rantion\wms\rantion_wms_create_transfer_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/record', 'N/log'], function (search, record, log) {

    function _get(context) {

    }

    function _post(context) {


        // AllocationMasterResponseDto {
        //     abno(string): 调拨批次号,
        //         aono(string): 调拨单号,
        //         boxQty(integer): 箱数,
        //         countBubbleBase(integer): 计泡基数,
        //         createBy(string): 创建人,
        //         createTime(string): 创建时间,
        //         declareCurrency(string): 申报币种,
        //         declarePrice(number): 申报价格,
        //         deliveryTime(string): 出库时间,
        //         dono(string): 出库单号,
        //         fbaAccount(string): FBA账号,
        //         id(integer): id,
        //         logisticsChannelCode(string): 物流渠道服务编号,
        //         logisticsChannelName(string): 物流渠道服务名称,
        //         logisticsLabelPath(string): 物流面单文件路径,
        //         logisticsProviderCode(string): 物流渠道商编号,
        //         logisticsProviderName(string): 物流渠道商名称,
        //         marketplaces(string): 站点 / 市场,
        //         pickno(string): 拣货单号,
        //         shipment(string): shipment,
        //         shippingType(integer): 运输方式： 10 sea - 普通， 20 air - 快递 - 红单， 30 air - 专线 - 红单,
        //         sourceWarehouseCode(string): 来源仓库编号,
        //         sourceWarehouseName(string): 来源仓库名称,
        //         status(integer): 调拨状态： 10 未处理， 20 已打印， 30 已拣货， 40 已装箱， 50 待发运， 60 已发运， 70 已完成， 80 已取消,
        //         targetWarehouseCode(string): 目标仓库编号,
        //         targetWarehouseName(string): 目标仓库名称,
        //         taxFlag(integer): 是否含税 0: 否1: 是,
        //         tradeCompanyCode(string): 交易主体编号,
        //         tradeCompanyName(string): 交易主体名称,
        //         type(integer): 调拨类型： 10 普通调拨， 20 FBA调拨,
        //         updateBy(string): 更新人,
        //         updateTime(string): 更新时间,
        //         volume(number): 体积,
        //         waybillNo(string): 运单号,
        //         weight(number): 重量
        // }

        var data = context.data;
        for (var i = 0, len = date.length; i < len; i++) {

            var temp = data[i];
            var containerNo = temp.containerNo,
                boxQty = temp.boxQty,
                aono = temp.aono,
                deliveryTime = temp.deliveryTime,
                dono = temp.dono,
                pickno = temp.pickno,
                status = temp.status,
                volume = temp.volume,
                weight = temp.weight,
                abno = temp.abno;
            var aono_id = searchFulRec(aono);
            if (aono_id) {
                var l_rec = record.load({
                    type: 'customrecord_dps_shipping_record',
                    id: aono_id
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_total_number',
                    value: boxQty
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_tran_abno',
                    value: abno
                });
                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_small_weight',
                    value: weight
                });

                var cn_no = searchLoadingInformation(containerNo);
                if (cn_no) {
                    l_rec.setValue({
                        fieldId: 'custrecord_dps_ship_rec_load_links',
                        value: cn_no
                    });

                    var l_con = record.load({
                        type: 'customrecord_dps_cabinet_record',
                        id: cn_no
                    });


                    // AllocationContainerResponseDto {
                    //     actualRate(number, optional): 实装率,
                    //         boxQty(integer): 箱数,
                    //         containerNo(string): 货柜号,
                    //         containerType(integer): 装柜类型： 10 龙舟整柜， 20 捷仕整柜， 30 捷仕散柜， 40 空运装柜,
                    //         containerVolume(number): 货柜容积（ L）,
                    //         createBy(string): 创建人,
                    //         createTime(string): 创建时间,
                    //         id(integer): id,
                    //         realVolume(number): 实装容积（ L）,
                    //         shippingType(integer): 运输方式： 10 sea - 普通， 20 air - 快递 - 红单， 30 air - 专线 - 红单,
                    //         sourceWarehouseCode(string): 来源仓库编号,
                    //         sourceWarehouseName(string): 来源仓库名称,
                    //         targetWarehouseCode(string): 目标仓库编号,
                    //         targetWarehouseName(string): 目标仓库名称,
                    //         updateBy(string): 更新人,
                    //         updateTime(string): 更新时间
                    // }


                    var conVolume = l_con.getValue("custrecord_dps_cabinet_rec_volume");
                    l_con.setValue({
                        fieldId: 'custrecord_dps_cabinet_rec_remai_volume',
                        value: Number(conVolume) - Number(volume)
                    });
                    var l_con_id = l_con.save();
                    log.audit('更新装柜信息成功', l_con_id);
                }

                // 设置调拨单的状态
                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_rec_transfer_status',
                    value: status / 10
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_rec_dono',
                    value: dono
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_shipping_rec_status',
                    value: ''
                });

                l_rec.setValue({
                    fieldId: 'custrecord_dps_ship_rec_pickno',
                    value: pickno
                });

                var l_rec_id = l_rec.save();

                log.audit('发运记录更新完成', l_rec_id);
            }

        }


        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';
        return JSON.stringify(retjson);
    }


    /**
     * 根据柜号搜索对应的装柜记录
     * @param {*} containerNo 
     */
    function searchLoadingInformation(containerNo) {

        var con_no;
        search.create({
            type: 'customrecord_dps_cabinet_record',
            filters: [{
                name: 'custrecord_dps_cabinet_rec_no',
                operator: 'is',
                values: containerNo
            }]
        }).run().each(function (rec) {
            con_no = rec.id;
        });

        return con_no || false;

    }

    /**
     * 根据调拨单号, 获取对应的调拨单
     * @param {*} aono 
     */
    function searchFulRec(aono) {

        var ful_id;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: 'is',
                values: aono
            }]
        }).run().each(function (rec) {
            ful_id = rec.id;
        });

        return ful_id || false;
    }

    function _put(context) {

    }

    function _delete(context) {

    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});