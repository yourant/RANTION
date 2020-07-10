/*
 * @Author         : Li
 * @Date           : 2020-05-22 17:01:38
 * @LastEditTime   : 2020-06-01 19:00:28
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\rantion_wms_container_re_rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log', '../common/request_record'], function (record, search, log, requestRecord) {

    function _get(context) {

    }

    function _post(context) {


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

        var data = context.requestBody;

        log.audit('data', data);
        var code = 1,
            re_data = {};
        var re_info = [];
        var retjson = {};

        try {
            //             for (var i = 0, len = data.length; i < len; i++) {
            var requestRecordInfo = requestRecord.findRequestRecord(context.requestId, 1, "container");
            if (requestRecordInfo) {
                retjson.code = 1;
                retjson.data = {
                    msg: 'NS 请求重复处理'
                }
                retjson.msg = 'failure'
            } else {
                var temp = data,
                    containerNo = temp.containerNo,
                    containerVolume = temp.containerVolume,
                    createTime = temp.createTime,
                    createBy = temp.createBy,
                    targetWarehouseCode = temp.targetWarehouseCode,
                    containerType = temp.containerType;

                try {
                    // 不存在对应的装柜记录
                    var con_id = searchLoadingInformation(containerNo);
                    if (!con_id) {
                        var c_con = record.create({
                            type: 'customrecord_dps_cabinet_record'
                        });

                        c_con.setValue({
                            fieldId: 'custrecord_dps_cabinet_rec_no',
                            value: containerNo
                        });

                        c_con.setValue({
                            fieldId: 'custrecord_dps_cabinet_rec_volume',
                            value: containerVolume
                        });

                        if (containerType) {
                            c_con.setValue({
                                fieldId: 'custrecord_dps_c_cabinet_type',
                                value: Number(containerType / 10)
                            });
                        }

                        c_con.setValue({
                            fieldId: 'custrecord_dps_cabinet_rec_owner',
                            value: createBy
                        });

                        c_con.setValue({
                            fieldId: 'custrecord_dps_cabinet_rec_create_time',
                            value: createTime
                        });

                        if (targetWarehouseCode) {
                            var location_id = searchLocationByNo(targetWarehouseCode);
                            if (location_id) {
                                c_con.setValue({
                                    fieldId: 'custrecord_dps_cabinet_rec_to_location',
                                    value: location_id
                                });
                            }
                        }

                        var c_con_id = c_con.save();

                        if (c_con_id) {
                            re_info.push({
                                'containerNo': containerNo,
                                "msg": "创建装柜信息成功(NS)"
                            });
                        }
                        requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 1, "container");
                        log.debug('c_con_id', c_con_id);
                    }
                } catch (error) {
                    re_info.push({
                        'containerNo': containerNo,
                        "msg": "创建装柜信息失败(NS)"
                    });
                    requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "container");
                }
                // }

                retjson.code = 0;
                retjson.data = {
                    re_info: re_info
                };
                retjson.msg = 'succeed';

            }
        } catch (error) {

            log.error('error', error)
            retjson.code = 3;
            retjson.data = {
                msg: "NS 处理失败, 请稍后重试"
            };
            retjson.msg = 'error';
            requestRecord.saveRequestRecord(context.requestId, JSON.stringify(context.requestBody), JSON.stringify(retjson), 2, "container");
        }
        return JSON.stringify(retjson);
    }



    /**
     * 根据仓库编号,搜索对应的地点
     * @param {*} locationNo 
     */
    function searchLocationByNo(locationNo) {
        var locationId;
        search.create({
            type: 'location',
            filters: [{
                name: 'custrecord_dps_wms_location',
                operator: 'is',
                values: locationNo
            }]
        }).run().each(function (rec) {
            locationId = rec.id;
        });

        return locationId || false;

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