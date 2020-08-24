/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['../Helper/CryptoJS.min', 'N/search', 'N/log', 'N/record',
    'N/currentRecord', 'N/http', 'N/url', 'N/ui/dialog', '../common/request_record'], function (
        cryptoJS, search, log, record, currentRecord, http, url, dialog, requestRecord) {

    String.prototype.format = function () {
        if (arguments.length == 0) {
            return this;
        }
        var param = arguments[0];
        var str = this;
        if (typeof (param) == 'object') {
            for (var key in param) {
                str = str.replace(new RegExp("\\[" + key + "\\]", "g"),
                    param[key]);
            }
            return str;
        } else {
            for (var i = 0; i < arguments.length; i++) {
                str = str.replace(new RegExp("\\[" + i + "\\]", "g"),
                    arguments[i]);
            }
            return str;
        }
    }

	/**
	 * Function to be executed after page is initialized.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.mode - The mode in which the record is being
	 *            accessed (create, copy, or edit)
	 * 
	 * @since 2015.2
	 */
    function pageInit(scriptContext) {

        console.log('record_type:' + scriptContext.currentRecord.type);
        console.log('record_type:' + scriptContext.currentRecord.id);
      		record.submitFields({
            type: 'customrecord_product',
            id: 2189,
            ignoreMandatoryFields: true,
            values: {
                custrecord_product_department:3
            }
        })
        console.log('end-test');

    }

    function customizeGlImpact(transactionRecord, standardLines, customLines,
        book) {
        console.log('customizeGlImpact:');
        var bookId = book.getId();
        if (!book.isPrimary()) {
            var bookRec = nlapiLoadRecord('accountingbook', bookId);
        }
    }

	/**
	 * Function to be executed when field is changed.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
	 * @param {string}
	 *            scriptContext.fieldId - Field name
	 * @param {number}
	 *            scriptContext.lineNum - Line number. Will be undefined if not
	 *            a sublist or matrix field
	 * @param {number}
	 *            scriptContext.columnNum - Line number. Will be undefined if
	 *            not a matrix field
	 * 
	 * @since 2015.2
	 */
    function fieldChanged(scriptContext) {

    }

	/**
	 * Function to be executed when field is slaved.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
	 * @param {string}
	 *            scriptContext.fieldId - Field name
	 * 
	 * @since 2015.2
	 */
    function postSourcing(scriptContext) {

    }

	/**
	 * Function to be executed after sublist is inserted, removed, or edited.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
	 * 
	 * @since 2015.2
	 */
    function sublistChanged(scriptContext) {

    }

	/**
	 * Function to be executed after line is selected.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
	 * 
	 * @since 2015.2
	 */
    function lineInit(scriptContext) {

    }

	/**
	 * Validation function to be executed when field is changed.
	 * 
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
	 * @param {string}
	 *            scriptContext.fieldId - Field name
	 * @param {number}
	 *            scriptContext.lineNum - Line number. Will be undefined if not
	 *            a sublist or matrix field
	 * @param {number}
	 *            scriptContext.columnNum - Line number. Will be undefined if
	 *            not a matrix field
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
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
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
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
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
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @param {string}
	 *            scriptContext.sublistId - Sublist name
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
	 * @param {Object}
	 *            scriptContext
	 * @param {Record}
	 *            scriptContext.currentRecord - Current form record
	 * @returns {boolean} Return true if record is valid
	 * 
	 * @since 2015.2
	 */
    function saveRecord(scriptContext) {
        return true;
    }

    function stockUseType(type) {
        var result
        search.create({
            type: "customlist88",
            filters: [{
                name: 'name',
                operator: 'is',
                values: type
            },],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    // 保存数据
    function saveInventoryAdjust(company, items, type) {
        console.info(12);
        var rec = record.create({
            type: 'inventoryadjustment',
            isDynamic: false
        });
        // 科目
        rec.setValue({
            fieldId: 'subsidiary',
            value: company
        })
        rec.setValue({
            fieldId: 'custbody_stock_use_type',
            value: type
        })
        console.info(321);
        var account = getAccount(type)
        console.info(331);
        rec.setValue({
            fieldId: 'account',
            value: account
        })
        console.info(1);
        for (var i = 0; i < items.length; i++) {
            console.info(2);
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'itemreceive',
                line: i,
                value: true
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'item',
                value: items[i].item,
                line: i
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'location',
                value: items[i].location,
                line: i
            });
            rec.setSublistValue({
                sublistId: 'inventory',
                fieldId: 'adjustqtyby',
                value: items[i].diffCount,
                line: i
            });
        }
        console.info("3", JSON.stringify(rec));
        var id = rec.save();
        return id
    }

    function getAccount(type) {
        var account
        search.create({
            type: "customrecord_adjustment_account",
            filters: [{
                name: 'custrecord_inventory_types',
                operator: 'is',
                values: type
            }],
            columns: [{
                name: 'custrecord_adjustment_accounts'
            }]
        }).run().each(function (e) {
            account = e.getValue('custrecord_adjustment_accounts')
        })
        return account
    }

    // 获取子公司的ID
    function getLocationId(companyId, positionCode) {
        log.audit('companyId', companyId);
        var result
        search.create({
            type: 'location',
            filters: [{
                name: 'subsidiary',
                operator: 'is',
                values: companyId
            }, {
                name: 'custrecord_dps_wms_location',
                operator: 'is',
                values: positionCode
            }],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    // 获取公司的ID
    function getCompanyId(companyName) {
        var result
        search.create({
            type: 'subsidiary',
            filters: [{
                name: 'namenohierarchy',
                operator: 'is',
                values: companyName
            },],
            columns: [{
                name: 'internalId'
            }]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取模块
    function getCustrecordModular(custrecordModular) {
        var result
        search.create({
            type: 'customlist1001',
            filters: [
                { name: 'name', operator: 'is', values: custrecordModular },
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取流程
    function getCustrecordProcess(custrecordProcess) {
        var result
        search.create({
            type: 'customlist1002',
            filters: [
                { name: 'name', operator: 'is', values: custrecordProcess },
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取订单类型
    function getDocumentType(documentType) {
        var result
        search.create({
            type: 'customlist492',
            filters: [
                { name: 'name', operator: 'is', values: documentType },
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    //获取事物类型
    function getDocumentList(documentList) {
        var result
        search.create({
            type: 'transactiontype',
            filters: [
                { name: 'name', operator: 'is', values: documentList },
            ],
            columns: [
                { name: 'internalid' }
            ]
        }).run().each(function (rec) {
            result = rec.id
            return false;
        });
        return result
    }

    function logisticsTest() {
        var filters = [];
        filters.push(['custrecord_lcl_logistics_services_link', 'anyof', 60]);
        filters.push('and');
        filters.push([['custrecord_lcl_weight_start', 'lessthanorequalto', 123], 'or', ['custrecord_lcl_weight_start', 'is', '@NONE@']]);
        filters.push('and');
        filters.push([['custrecord_lcl_weight_end', 'greaterthanorequalto', 123], 'or', ['custrecord_lcl_weight_end', 'is', '@NONE@']]);

        log.debug('filters', JSON.stringify(filters));
        search.create({
            type: 'customrecord_logistics_cost_labber',
            filters: filters,
            columns: [
                'custrecord_lcl_unit_weight_cost', 'custrecord_lcl_processing_fee', 'custrecord_lcl_minimal_cost_weight',
                'custrecord_lcl_discount', 'custrecord_lcl_zip_begin',
                { name: 'internalid', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_bubble_count', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_logistics_company', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_ls_bubble_type', join: 'custrecord_lcl_logistics_services_link' },
                { name: 'custrecord_cc_country_code', join: 'custrecord_lcl_country' }
            ]
        }).run().each(function (result) {

            log.debug('1', JSON.stringify(result));
            var zipBegin = result.getValue('custrecord_lcl_zip_begin');
            if ((zip && zipBegin && (zip.indexOf(zipBegin) != 0)) || (!zip && zipBegin)) {
                return true;
            }
            log.debug('2', '2');
            var unitCost = Number(result.getValue('custrecord_lcl_unit_weight_cost'));
            var bubble = Number(result.getValue({ name: 'custrecord_ls_bubble_count', join: 'custrecord_lcl_logistics_services_link' }));
            var bubbleType = result.getValue({ name: 'custrecord_ls_bubble_type', join: 'custrecord_lcl_logistics_services_link' });
            var tureWeight = calcuationCostWeight(long, wide, high, bubble, bubbleType, weight); // 计费重量
            var minimalWeight = Number(result.getValue('custrecord_lcl_minimal_cost_weight'));
            if (minimalWeight > 0 && tureWeight < minimalWeight) {
                tureWeight = minimalWeight;
            }
            var discount = Number(result.getValue('custrecord_lcl_discount'));
            var cost = (unitCost * tureWeight + Number(result.getValue('custrecord_lcl_processing_fee'))) * discount;
            log.debug('cost', cost);
            if (resultJSON.costamount == 0 || cost < resultJSON.costamount) {
                resultJSON.servicesId = result.getValue({ name: 'internalid', join: 'custrecord_lcl_logistics_services_link' });
                resultJSON.services_com_id = result.getValue({ name: 'custrecord_ls_logistics_company', join: 'custrecord_lcl_logistics_services_link' });
                resultJSON.costweight = tureWeight;
                resultJSON.costamount = cost;
            }
            return true;
        });
    }

    function testRequest() {
        var custrecord_dps_declare_currency_dh;
        var custrecord_dps_declared_value_dh = 0;
        console.debug('begin')
        search.create({
            type: 'customrecord_transfer_order_details',
            filters: [{
                name: 'custrecord_transfer_code',
                operator: 'anyof',
                values: 23705
            }],
            columns: [{
                name: 'custrecord__realted_transfer_head'
            },
            {
                name: 'custrecord_transfer_quantity'
            }
            ]
        }).run().each(function (rec1) {
            var custrecord__realted_transfer_head = rec1.getValue('custrecord__realted_transfer_head');
            var custrecord_transfer_quantity = rec1.getValue('custrecord_transfer_quantity');
            console.debug('custrecord__realted_transfer_head', custrecord__realted_transfer_head);
            console.debug('custrecord_transfer_quantity', custrecord_transfer_quantity);
            search.create({
                type: 'purchaseorder',
                filters: [{
                    name: "mainline",
                    operator: "is",
                    values: ["F"]
                },
                {
                    name: "taxline",
                    operator: "is",
                    values: ["F"]
                },
                {
                    name: "item",
                    operator: "noneof",
                    values: ["@NONE@"]
                },
                {
                    name: "type",
                    operator: "anyof",
                    values: ["PurchOrd"]
                },
                {
                    name: "custbody_dps_type",
                    operator: "anyof",
                    values: ["2"]
                },
                // { name: "subsidiary", operator: "is", values: [subsidiary] },
                // { name: "item", operator: "anyof", values: itemArray },
                {
                    name: 'custcol_realted_transfer_detail',
                    operator: "anyof",
                    values: custrecord__realted_transfer_head
                }
                ],
                columns: [{
                    name: "quantity",
                    label: "采购数量",
                    type: "float"
                },
                {
                    name: "custcol_realted_transfer_detail",
                    label: "关联调拨单号",
                    type: "select"
                },
                {
                    name: "rate"
                },
                {
                    name: 'currency'
                }
                ]
            }).run().each(function (result) {
                console.debug("testest1 ", JSON.stringify(result));
                custrecord_dps_declare_currency_dh = result.getValue('currency');
                var value = {
                    quantity: result.getValue('quantity'),
                    link: result.getValue('custcol_realted_transfer_detail')
                }
                custrecord_dps_declared_value_dh = custrecord_dps_declared_value_dh + result.getValue('rate') * custrecord_transfer_quantity;
                console.debug("testest ", JSON.stringify(value));
                return true;
            });
            return true;
        });
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