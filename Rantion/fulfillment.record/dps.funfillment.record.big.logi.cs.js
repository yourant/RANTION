/*
 * @Author         : Li
 * @Date           : 2020-05-18 19:37:38
 * @LastEditTime   : 2020-07-06 20:22:07
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.funfillment.record.big.logi.cs.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url', 'N/https', 'N/currentRecord', 'N/ui/dialog'], function (url, https, currentRecord, dialog) {

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


        var field = scriptContext.fieldId;
        // console.log('field', field);
        if (field == "custrecord_dps_shipping_rec_shipmentsid") {
            var channel_dealer = scriptContext.currentRecord.getValue('custrecord_dps_shipping_r_channel_dealer');
            var shipment = scriptContext.currentRecord.getValue('custrecord_dps_shipping_rec_shipmentsid');
            if (shipment.indexOf('FBA') != 0 && shipment.length != 12 && channel_dealer == 6 && shipment) {
                alert('ShipmentId 不符合规则, 以FBA开头,长度为12位');
                scriptContext.currentRecord.setValue({
                    fieldId: 'custrecord_dps_shipping_rec_shipmentsid',
                    value: ""
                })
            }

        }
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
        return true;
    }




    /**
     * 重新WMS发运
     * @param {*} rec_id 
     */
    function WMSShipping(rec_id) {

        // alert('重新WMS发运: ' + rec_id);
        // return;

        console.log('WMSShipping', rec_id);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_wms_create_transfer_rl',
            deploymentId: 'customdeploy_dps_wms_create_transfer_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'WMS',
            recordID: rec_id
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "重新WMS发运",
            message: "重新WMS发运?"
        };

        function success(result) {
            if (result) {
                response = https.put({
                    url: url1,
                    body: body1,
                    headers: header
                });
                if (response.body == false) {
                    alert('重新WMS发运')
                } else {
                    alert('重新WMS发运: ' + response.body);
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);

    }
    /**
     * 重新推送标签面单文件
     * @param {*} rec_id 
     */
    function LabelDocument(rec_id) {

        console.log('推送标签面单文件', rec_id);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funf_rec_big_shipment',
            deploymentId: 'customdeploy_dps_funf_rec_big_shipment',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            recordID: rec_id,
            action: "LabelDocument"
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "推送标签面单文件",
            message: "推送标签面单文件?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                console.log('response.body ', response.body);
                if (response.body == false) {
                    alert('推送标签面单文件失败');
                } else {
                    alert('推送标签面单文件成功: ' + response.body);
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);

    }

    /**
     * 
     * @param {*} rec_id 
     */
    function amazonShipment(rec_id) {
        console.log('获取shipment', rec_id);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funf_rec_big_shipment',
            deploymentId: 'customdeploy_dps_funf_rec_big_shipment',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            recordID: rec_id,
            action: "amazonShipment"
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "重新获取shipment",
            message: "重新获取shipment?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                console.log('response.body ', response.body);
                if (response.body == false) {
                    alert('获取shipment失败');
                } else {
                    alert(response.body);
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);
    }

    /**
     * 重新获取物流渠道
     * @param {*} rec_id 
     */
    function reacquireLogistics(rec_id) {

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_fulfillment_big_btn_rl',
            deploymentId: 'customdeploy_dps_fulfillment_big_btn_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'Logistics',
            recordID: rec_id
        };
        var response;

        var options = {
            title: "重新获取物流运单号",
            message: "重新获取物流运单号?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                log.audit('respone', response.body);
                var body = JSON.parse(response.body);
                if (body.code == 500) {
                    alert('重新获取物流运单号失败：' + body.msg);
                    window.location.reload(true);
                } else {
                    alert('重新获取物流运单号成功');
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);

    }


    /**
     * 重新获取物流跟踪号
     * @param {*} rec_id 
     */
    function getTrackingNumber(rec_id) {

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_fulfillment_big_btn_rl',
            deploymentId: 'customdeploy_dps_fulfillment_big_btn_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'TrackingNumber',
            recordID: rec_id
        };
        var response;

        var options = {
            title: "重新获取物流运单号",
            message: "重新获取物流运单号?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                log.audit('respone', response.body);
                var body = JSON.parse(response.body)
                if (body.code == 500) {
                    alert('重新获取物流跟踪号失败：' + body.msg)
                } else {
                    alert('重新获取物流跟踪号成功');
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);

    }


    /**
     * 重新获取物流面单
     * @param {*} rec_id 
     */
    function getLabel(rec_id) {

        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_fulfillment_big_btn_rl',
            deploymentId: 'customdeploy_dps_fulfillment_big_btn_rl',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            action: 'GetLabel',
            recordID: rec_id
        };
        var response;

        var options = {
            title: "获取物流面单",
            message: "获取物流面单?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                log.audit('respone', response.body);
                var body = JSON.parse(response.body)
                if (body.code == 500) {
                    alert('重新获取物流面单失败：' + body.msg)
                    window.location.reload(true);
                } else {
                    alert('重新获取物流面单成功');
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);
    }


    /**
     * 生成报关资料
     * @param {*} rec_id 
     */
    function createInformation(rec_id) {
        console.log('生成报关资料', rec_id);
        var url1 = url.resolveScript({
            scriptId: 'customscript_dps_funf_rec_big_shipment',
            deploymentId: 'customdeploy_dps_funf_rec_big_shipment',
            returnExternalUrl: false
        });

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            recordID: rec_id,
            action: "createInformation"
        };
        log.debug('body1', body1);
        log.debug('url1', url1);
        var response;

        var options = {
            title: "生成报关资料",
            message: "是否生成报关资料?"
        };

        function success(result) {
            if (result) {
                response = https.post({
                    url: url1,
                    body: body1,
                    headers: header
                });
                console.log('response.body ', response.body);
                if (response.body == false) {
                    alert('生成报关资料失败');
                } else {
                    alert(response.body);
                    window.location.reload(true);
                }
            }
        }

        function failure(reason) {
            log.debug('reason', reason)
        }
        dialog.confirm(options).then(success).catch(failure);
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged,
        WMSShipping: WMSShipping,
        amazonShipment: amazonShipment,
        reacquireLogistics: reacquireLogistics,
        getTrackingNumber: getTrackingNumber,
        getLabel: getLabel,
        createInformation: createInformation,
        LabelDocument: LabelDocument
    }
});