/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-30 11:07:52
 * @LastEditTime   : 2020-08-02 15:09:45
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.to.control.field.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/ui/dialog', 'N/record', '../Helper/commonTool.js', 'N/ui/dialog', 'N/url',
    'N/https'
], function (search, dialog, record, commonTool, dialog, url, https) {

    var fieldMapping = { // 库存转移订单 与 发运记录的 字段对应关系
        "custrecord_dps_shipping_rec_location": "location", // 起始地点
        "custrecord_dps_shipping_rec_location": "custbody_dps_start_location", // 起始仓库
        "custrecord_dps_ship_remark": "custrecord_dps_ship_remark", // 备注
        // "custrecord_dps_to_reference_id": "custbody_dps_to_reference_id", // reference id
        "custrecord_dps_to_shipment_name": "custbody_dps_to_shipment_name", // shipment name
        "custrecord_dps_shipping_rec_transport": "custbody_shipment_method", // 运输方式
        "custrecord_dps_ns_upload_packing_informa": "custbody_dps_ns_upload_packing_informa", // 设置 NS 是否上传装箱信息, 获取箱唛
        "custrecord_dps_ship_record_tranor_type": "custbody_dps_transferor_type", // 调拨单类型
        "custrecord_dps_shipping_rec_shipmentsid": "custbody_shipment_id", // shipmentId
        "custrecord_dps_shipping_rec_destinationf": "custbody_dps_ama_location_centerid", // 设置仓库中心编码
        "custrecord_dps_shipping_rec_department": "department", // 部门
        "custrecord_dps_shipping_rec_transa_subje": "subsidiary", //子公司
        "custrecord_dps_shipping_rec_to_location": "custbody_actual_target_warehouse", // 目标仓库
        "custrecord_dps_shipping_rec_create_date": "trandate", // 日期
        "custrecord_dps_shipping_rec_account": "custbody_order_locaiton", // 店铺
        "custrecord_dps_shipping_r_channel_dealer": "custbody_dps_transferor_channel_dealer", // 渠道商
        "custrecord_dps_shipping_r_channelservice": "custbody_dps_transferor_channelservice" // 渠道服务
    }

    var fieldArr = [
        "customform",
        "trandate",
        "custbody_dps_transferor_type",
        "custbody_order_locaiton",
        "custbody_dps_start_location",
        "custbody_actual_target_warehouse",
        "employee",
        "memo",
        "custbody_dps_print_customs_nformation",
        "custbody_dps_transferor_channel_dealer",
        "custbody_dps_transferor_channelservice",
        "custbodyexpected_arrival_time",
        "custbody_dps_fu_rec_link",
        "custbody_shipment_id",
        "custbody_shipment_method",
        "transferlocation",
        "custbody_dps_ama_location_centerid",
        "custbody_dps_to_shipment_name",
        "location"
    ]

    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {



        // 6 WMS已发运        7 WMS已部分发运         12 WMS已装箱
        // 13 WMS已部分装箱        19 已推送 标签文件         23 渠道退件已入库
        // 24 已上传装箱信息         25 上传装箱信息成功         26 Amazon 处理装箱信息中         28 上传装箱信息错误


        var cur = scriptContext.currentRecord;
        var mode = scriptContext.mode;

        if (mode == "edit") {

            var custpage_abc_text = cur.getValue('custpage_abc_text');
            if (custpage_abc_text) {
                var url = window.location.href;
                url = url.replace('&e=T', '');

                var options = {
                    title: '修改发运记录',
                    message: '不允许修改发运记录',
                };

                var submitFieldsPromise = record.submitFields.promise({
                    type: cur.type,
                    id: cur.id,
                    values: {
                        custrecord_dps_update_ful_rec_info: '请联系仓库人员修改wms调拨单状态'
                    }
                });

                function success(result) {
                    window.location.replace(url)
                }

                function failure(reason) {
                    window.location.replace(url)
                }
                dialog.create(options).then(success).catch(failure);
            }

            var statusArr = [6, 7, 12, 13, 19, 20, 22, 23, 24, 25, 26, 28];

            var rec_status = cur.getValue("custrecord_dps_shipping_rec_status");
            if (statusArr.indexOf(rec_status) > -1) {
                var field_Arr = Object.keys(fieldMapping)
                field_Arr.map(function (field) {
                    cur.getField({
                        fieldId: field
                    }).isDisabled = true;
                })

            }

        }
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

        var cur = scriptContext.currentRecord;
        var status = cur.getValue('custpage_abc_text');
        if (status == undefined || status == null) {
            alert('不允许修改发运记录');
            return false
        }
        return true;
    }

    function updateWMS(rec_id) {

        // alert('别点了, 不执行任何操作');

        // console.log('updateWMS', rec_id);

        // return 1;


        commonTool.startMask('重新推送WMS更新中,请耐心等待...');

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_ful_update_field_rl',
            deploymentId: 'customdeploy_dps_ful_update_field_rl',
            returnExternalUrl: false
        });

        https.post.promise({
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            },
            url: url1,
            body: {
                action: "updateWMS",
                recordID: rec_id
            }
        }).then(function (response) {

            var data = response.body;

            // console.log('data  typeof: ' + typeof (data), data);
            commonTool.endMask();

            dialog.alert({
                title: '重新推送WMS更新',
                message: JSON.parse(data).msg
            }).then(function () {
                window.location.reload();
            });
        }).catch(function onRejected(reason) {
            dialog.alert({
                title: '重新推送WMS更新',
                message: reason
            }).then(function () {
                window.location.reload();
            });
        })

    }


    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord,
        updateWMS: updateWMS
    };

});