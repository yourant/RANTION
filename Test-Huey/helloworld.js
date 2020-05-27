/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Rantion/Helper/CryptoJS.min', 'N/search', 'N/log', 'N/record', 'N/currentRecord', 'N/http', 'N/url', 'N/ui/dialog'], function(cryptoJS, search, log, record, currentRecord, http, url, dialog) {
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

        //var j_context = JSON.parse(context);
        /*
        test = record.transform({
            fromType: 'vendorreturnauthorization',
            fromId: 22,
            toType: 'itemfulfillment'
        });
        huey = test;

        huey.setSublistValue({
            sublistId: 'item',
            fieldId: 'quantity',
            value: 1,
            line: 0
        });

        console.log('end')

        try {
            huey.save()
        } catch (ex) {
            console.log(ex)
        }

        return;
        */

        return;

        var j_context = {
            "delivery": true,
            "deliveryTime": "string",
            "sourceNo": "62137-gzhdc",
            "sourceType": 0,
            "weight": 0
        };

        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';

        //获取对应退货授权单
        var sourceNo = j_context.sourceNo;

        var v_id = sourceNo.split('-')[0];
        var w_code = sourceNo.split('-')[1];

        //获取对应供应商退货审批单
        var v_record = record.load({
            id: Number(v_id),
            type: "vendorreturnauthorization"
        });

        var ifm_record = [];

        if (v_record == null) {
            retjson.code = -2;
            retjson.msg = 'sourceNo无效';
            return JSON.stringify(retjson);
        }

        var item_count = v_record.getLineCount({ sublistId: 'item' });

        if (j_context.delivery) {
            //根据退货授权单中的item地址生成货品实施单
            for (var i = 0; i < item_count; i++) {
                var location = v_record.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i
                });
                if (typeof(ifm_record[location]) == 'undefined') {
                    ifm_record[location] = {
                        location: location,
                        record: record.transform({
                            fromType: 'vendorreturnauthorization',
                            fromId: Number(v_id),
                            toType: 'itemfulfillment'
                        }),
                        isAdd: false
                    };
                }
            }

            //将转换出库单中所有提交项设置为false
            ifm_record.forEach(function(item) {
                for (var i = 0; i < item_count; i++) {
                    item.record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        line: i,
                        value: false
                    });
                }
            });

        }
        //设置提交项
        for (var i = 0; i < item_count; i++) {
            //获取item的NS location
            var location = v_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'location',
                line: i
            });

            //获取location对应记录
            var v_location = record.load({
                type: 'location',
                id: location
            });

            //从location对应记录获取wms仓库编码
            var wms_location = v_location.getValue('custrecord_dps_wms_location');



            if (j_context.delivery) {
                if (wms_location == w_code) {
                    //设置提交项
                    ifm_record[location].record.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'itemreceive',
                        value: true,
                        line: i
                    });
                    ifm_record[location].isAdd = true
                }
            } else {
                //设置备注
                v_record.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: i,
                    value: '库存异常'
                });
            }
        }




        //return JSON.stringify(retjson);

        if (j_context.delivery) {
            var bug = ifm_record;
            huey = bug;
            ifm_record.forEach(function(item) {
                if (item.isAdd) {
                    item.record.save();
                }
            });
        } else {
            v_record.save();
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
        return true;
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
    }
});


Date.prototype.format = function(fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o) {
        if (new RegExp("(" + k + ")").test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        }
    }
    return fmt;
}