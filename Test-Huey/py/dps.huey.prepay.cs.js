/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/log', 'N/record', 'N/search'], function (log, record, search) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */


    var total;
    var o_payment;
    var o_i_payment = 0;
    var o_entity;
    var is_finish = false;

    function pageInit(scriptContext) {

        var objRecord = scriptContext.currentRecord;

        var prepaymentamount = 0;

        if (objRecord.getValue('purchaseorder') == '')
            return;

        search.create({
            type: 'purchaseorder',
            filters: [{
                "name": "internalid",
                "operator": "is",
                "values": objRecord.getValue('purchaseorder')
            }],
            columns: ["custbody_dps_prepaymentamount", "custbody_dps_actualprepaidamount", "total", "entity"]
        }).run().each(function (res) {
            prepaymentamount = Number(res.getValue('custbody_dps_prepaymentamount'));
            o_payment = Number(res.getValue('custbody_dps_actualprepaidamount'));
            total = Number(res.getValue('total'));
            o_entity = res.getValue('entity')
            console.log(prepaymentamount);
        });

        //获取供应商信息
        /*
        var custentity_dps_accountnameprivate,
            custentity_dps_accountnamepublic,
            custentity_dps_collectionaccountprivate,
            custentity_dps_collectionaccountpublic,
            custentity_dps_receivingbankprivate,
            custentity_dps_receivingbankpublic;
        search.create({
            type: 'vendor',
            filters: [{
                "name": "internalid",
                "operator": "is",
                "values": o_entity
            }],
            columns: [
                "custentity_dps_accountnameprivate",
                "custentity_dps_accountnamepublic",
                "custentity_dps_collectionaccountprivate",
                "custentity_dps_collectionaccountpublic",
                "custentity_dps_receivingbankprivate",
                "custentity_dps_receivingbankpublic"
            ]
        }).run().each(function (res) {
            custentity_dps_accountnameprivate = res.getValue('custentity_dps_accountnameprivate');
            custentity_dps_accountnamepublic = res.getValue('custentity_dps_accountnamepublic');
            custentity_dps_collectionaccountprivate = res.getValue('custentity_dps_collectionaccountprivate');
            custentity_dps_collectionaccountpublic = res.getValue('custentity_dps_collectionaccountpublic');
            custentity_dps_receivingbankprivate = res.getValue('custentity_dps_receivingbankprivate');
            custentity_dps_receivingbankpublic = res.getValue('custentity_dps_receivingbankpublic');
        });

        objRecord.setValue({
            fieldId: 'custbody_dps_accountnamepriv',
            value: custentity_dps_accountnameprivate,
        });
        objRecord.setValue({
            fieldId: 'custbody_dps_accountnamepubl',
            value: custentity_dps_accountnamepublic,
        });
        objRecord.setValue({
            fieldId: 'custbody_dps_collectionaccou',
            value: custentity_dps_collectionaccountprivate,
        });
        objRecord.setValue({
            fieldId: 'custbody_dps_collectionaccou2',
            value: custentity_dps_collectionaccountpublic,
        });
        objRecord.setValue({
            fieldId: 'custbody_dps_receivingbankpr',
            value: custentity_dps_receivingbankprivate,
        });
        objRecord.setValue({
            fieldId: 'custbody_dps_receivingbankpu',
            value: custentity_dps_receivingbankpublic,
        });
        */

        if (scriptContext.mode == 'create') {

            is_finish = false;
            //获取订单预付金额
            var set_payment;
            if (prepaymentamount > 0 && o_payment == 0) {
                set_payment = prepaymentamount;
            } else {
                set_payment = total - o_payment;
            }

            if (set_payment == 0) {
                alert('预付金额已达上限');
                location.href = document.referrer;
                return;
            }
            objRecord.setValue({
                fieldId: 'payment',
                value: set_payment,
            });

            var account_id = '';


            var currency_name = '';

            search.create({
                type: 'currency',
                filters: [{
                    "name": "internalid",
                    "operator": "is",
                    "values": objRecord.getValue('currency')
                }],
                columns: ["name"]
            }).run().each(function (res) {
                currency_name = res.getValue('name');
            })

            console.log(currency_name);


            search.create({
                type: 'account',
                filters: [{
                    "name": "subsidiary",
                    "operator": "is",
                    "values": objRecord.getValue('subsidiary')
                }, {
                    "name": "type",
                    "operator": "is",
                    "values": 'Bank'
                }],
                columns: ["name"]
            }).run().each(function (res) {

                if (res.getValue('name').indexOf(currency_name) > -1) {
                    account_id = res.id;
                    console.log('load_id:' + account_id);
                    huey2 = res;
                    return false;
                }
                return true;
            });

            //huey = record.load({ "type": "account","id": 327})

            if (account_id != '') {
                objRecord.setValue({
                    fieldId: 'account',
                    value: account_id,
                });
            }

        } else if (scriptContext.mode == 'edit') {
            o_i_payment = Number(objRecord.getValue('payment'));
            console.log('edit', o_i_payment);
        }
        is_finish = true;
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
        if (is_finish) {
            var bf_cur = scriptContext.currentRecord;

            if (isNaN(o_payment))
                o_payment = 0;

            var n_payment = Number(bf_cur.getValue('payment'));
            n_payment = o_payment + n_payment - o_i_payment;
            log.error('before-save:n_payment', n_payment);
            if (n_payment > total) {
                alert('预付总金额：' + n_payment + "大于订单总金额：" + total);
                bf_cur.setValue({
                    fieldId: 'payment',
                    value: total - o_payment + o_i_payment,
                });
            }
            console.log(bf_cur.getValue('account'));
        }
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

        /*
        var objRecord = scriptContext.currentRecord;

        var purchaseorder_id = objRecord.getValue('purchaseorder');


        var url1 = url.resolveScript({
            scriptId: 'customdeploydps_huey_prepay_rl',
            deploymentId: 'customdeploydps_huey_prepay_rl',
            returnExternalUrl: false
        })

        var header = {
            "Content-Type": "application/json;charset=utf-8",
            "Accept": "application/json"
        };

        var body1 = {
            poId: purchaseorder_id
        };

        log.debug('body1', body1);
        log.debug('url1', url1);

        var response = https.post({
            url: url1,
            body: body1,
            headers: header
        });

        if (response.body == false) {
            alert('更新采购订单实际预付款金额失败');
        }
        */
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
        sublistChanged: sublistChanged
    }
});