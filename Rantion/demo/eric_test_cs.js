/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['../Helper/CryptoJS.min', 'N/search', 'N/log', 'N/record',
    'N/currentRecord', 'N/http', 'N/url', 'N/ui/dialog'], function (
        cryptoJS, search, log, record, currentRecord, http, url, dialog) {

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


        console.log('[NO]:', '[NO][ONO]'.format({ NO: '测试1', ONO: '测试2' }));
        // var str = '测试{PONumber}'.format({
        //     'PONumber': 'PO2006100001'
        // });
        // var recordInfo = record.load({
        //     type: scriptContext.currentRecord.type,
        //     id: scriptContext.currentRecord.id
        // });
        // console.log('recordInfo:', JSON.stringify(recordInfo));

        // var sublistCount = recordInfo.getLineCount({
        //     sublistId: 'line'
        // });
        // console.log('sublistCount:', sublistCount);
        // for (var i = 0; i < sublistCount; i++) {
        //     var line = recordInfo.getSublistValue({
        //         sublistId: 'line',
        //         fieldId: 'memo',
        //         line: i
        //     });
        //     recordInfo.setSublistValue({
        //         sublistId: 'line',
        //         fieldId: 'memo',
        //         value: i,
        //         line: i
        //     });
        //     console.log('memo:', JSON.stringify(line));
        // }
        // recordInfo.save();
        var item = record.load({
            type: 'purchaseorder',
            id: 167619
        })
        console.log(JSON.stringify(item));
        console.log(item);

        search.create({
            type: 'purchaseorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 167619
            }],
            columns: [{
                name: 'custbody_approve_status'
            }]
        }).run().each(function (rec) {
            var custbody_approve_status = rec.getValue('custbody_approve_status');
            console.log('custbody_approve_status', custbody_approve_status);
            console.log('custbody_approve_status', typeof custbody_approve_status);
        });

        var filterArr = [];
        var modular = getCustrecordModular('采购模块');
        var process = getCustrecordProcess('采购订单');
        var documentType = getDocumentType('计划/备库存采购');
        // var documentList = getDocumentList('货品收据');
        documentList = 16;
        console.log("modular", modular);
        console.log("process", process);
        console.log("documentType", documentType);
        console.log("documentList", documentList);
        if (modular && process && documentType && documentList) {
            // filterArr.push({ name: 'custrecord_modular', operator: 'anyof', values: modular });
            // filterArr.push({ name: 'custrecord_process', operator: 'anyof', values: process });
            // filterArr.push({ name: 'custrecord_document_type', operator: 'anyof', values: documentType });
            // filterArr.push({ name: 'custrecord_document_list', operator: 'anyof', values: documentList });
            // filterArr.push({ name: 'custrecord_subsidiary_type', operator: 'is', values: 2 });
        }
        var i = 50;
        var configRecord = search.create({
            type: "customrecord_common_configuration",
            filters: filterArr,
            // [
            //customlist1001 模块
            //customlist1002 流程
            //customlist492 订单类型
            //customrecord_cn_voucher_trantypes 事物类型
            //subsidiary
            // { name: 'namenohierarchy', join: 'custrecord_modular', operator: 'is', values: '采购模块' },
            // { name: 'namenohierarchy', join: 'custrecord_subsidiary_type', operator: 'is', values: '广州蓝深科技有限公司' }
            // filterArr
            // ],
            columns:
                [
                    "custrecord_modular",
                    "custrecord_process",
                    "custrecord_document_type",
                    "custrecord_document_list",
                    "custrecord_common",
                    'custrecord_subsidiary_type'
                ]
        });
        configRecord.run().each(function (result) {
            console.log('result:' + JSON.stringify(result));
            // log.debug('result ' + JSON.stringify(result));
            return i-- > 0;
        });


















        // var filters = [];
        // filters.push({ name: 'custrecord_fba_update_inventory_account',
        // operator: 'EQUALTO', values: 1 });
        // filters.push({ name: 'custrecord_salesorder_location', operator:
        // 'EQUALTO', values: 4 });
        // var updateId;
        // var fbaUpdateInventorySearch = search.create({
        // type: 'customrecord_fba_update_inventory',
        // filters: filters,
        // columns: [
        // 'custrecord_fba_update_inventory_account',
        // 'custrecord_salesorder_location',
        // 'custrecord_fba_update_inventory_rid',
        // 'custrecord_fba_update_status'
        // ]
        // }).run().each(function (e) {
        // updateId = e.id;
        // if (updateId) {
        // console.log(11)
        // } else {
        // console.log(22)
        // }
        // console.log(updateId)
        // });
        // console.log("begin");
        // search.create({
        // type: 'customrecord_dps_amazon_seller_sku',
        // columns: [
        // 'custrecord_dps_amazon_sku_number',
        // 'custrecord_dps_amazon_ns_sku'
        // ]
        // , filters: [
        // { name: 'name', join: 'custrecord_dps_amazon_sku_number', operator:
        // 'is', values: 'MF239-FBA' }
        // , { name: 'isinactive', join: 'custrecord_dps_amazon_ns_sku',
        // operator: 'is', values: false }
        // ]
        // }).run().each(function (seller) {
        // var sellerJSON = JSON.parse(JSON.stringify(seller));
        // console.log(sellerJSON);
        // });
        // var filters = [];
        // filters.push({ name: 'custrecord_fba_update_inventory_account',
        // operator: 'is', values: 1 });
        // filters.push({ name: 'custrecord_salesorder_location', operator:
        // 'is', values: 1 });
        // var updateId;
        // var fbaUpdateInventorySearch = search.create({
        // type: 'customrecord_fba_update_inventory',
        // filters: filters,
        // columns: [
        // 'custrecord_fba_update_inventory_account',
        // 'custrecord_salesorder_location',
        // 'custrecord_fba_update_inventory_rid',
        // 'custrecord_fba_update_status'
        // ]
        // }).run().each(function (e) {
        // updateId = e.id;
        // });

        // eric_record = record.load({
        // type: scriptContext.currentRecord.type,
        // id: scriptContext.currentRecord.id
        // });
        // var jour = record.create({ type: 'journalentry', isDynamic: true });
        // jour.setValue({ fieldId: 'memo', value: '测试备注' });
        // jour.setValue({ fieldId: 'subsidiary', value: '2' });
        // jour.setValue({ fieldId: 'currency', value: 'USD' });
        // jour.setValue({ fieldId: 'custbody_pr_store', value:
        // 'custbody_pr_store' });
        // jour.setValue({ fieldId: 'custbody_jour_orderid', value:
        // 'custbody_jour_orderid' });
        // jour.setValue({ fieldId: 'custbody_curr_voucher', value: '测试凭证' });

        // jour.setValue({ fieldId: 'trandate', value: new Date() });
        // jour.save();
        // var page = 100;
        // search.create({
        // type: "journalentry",
        // columns: [
        // { name: "memo" }
        // ]
        // }).run().each(function (e) {
        // console.log('journalentry:' + JSON.stringify(e));
        // if (page == 0) {
        // return false;
        // }
        // var journalentryItem = record.load({
        // type: "journalentry",
        // id: e.id
        // });
        // console.log("journalentryItem: " + JSON.stringify(journalentryItem));
        // console.log("line: " + JSON.stringify(journalentryItem.getSublist({
        // sublistId: "line" })));
        // // journalentryItem.setSublistValue({ sublistId: 'line', fieldId:
        // 'memo', value: "测试备注", line: 0 })
        // // journalentryItem.save();
        // page--;
        // return true;
        // })

        // //盘盈
        // var surplus = [];
        // //盘亏
        // var losses = [];

        // var updateList = [];
        // console.log("updateList begin");
        // search.create({
        // type: 'customrecord_fba_update_inventory',
        // columns: [
        // 'custrecord_fba_update_inventory_account',
        // 'custrecord_salesorder_location',
        // 'custrecord_fba_update_inventory_rid',
        // 'custrecord_fba_update_status'
        // ],
        // filters: [{ name: 'custrecord_fba_update_status', operator: 'is',
        // values: 2 }]
        // }).run().each(function (e) {
        // var result = JSON.parse(JSON.stringify(e));
        // console.log("updateList begin", JSON.stringify(e));
        // var isC = false;
        // var custrecord_salesorder_location =
        // result.values.custrecord_salesorder_location;
        // updateList.map(function (v) {
        // console.log("updateList v", JSON.stringify(v));
        // if (v.salesorder_location == custrecord_salesorder_location) {
        // isC = true;
        // }
        // });
        // if (!false) {
        // var item = {
        // account: result.values.custrecord_fba_update_inventory_account,
        // salesorder_location: result.values.custrecord_salesorder_location,
        // rid: result.values.custrecord_fba_update_inventory_rid
        // }
        // updateList.push(item);
        // }
        // });

        // console.log("updateList ", JSON.stringify(updateList));

        // updateList.map(function (update) {
        // var i = 1;
        // console.log("updateList item ", update);
        // var nowPage = Number(0); // 查询页
        // var pageSize = Number(100); // 每页数量
        // console.log('update.rid ', update.rid);
        // var inventoryitem = search.create({
        // type: 'customrecord_fba_myi_all_inventory_data',
        // columns: [
        // 'custrecord_fba_sku', 'custrecord_fba_afn_total_quantity',
        // 'custrecord_fba_inventory_rid', 'custrecord_fba_account',
        // 'custrecord_all_salesorder_location'
        // ],
        // filters: [
        // { name: 'custrecord_fba_inventory_rid', operator: 'EQUALTO', values:
        // Number(update.rid) },
        // { name: 'custrecord_fba_account', operator: 'EQUALTO', values:
        // Number(update.account) },
        // { name: 'custrecord_all_salesorder_location', operator: 'EQUALTO',
        // values: Number(update.salesorder_location) }
        // ]
        // });
        // var pageData = inventoryitem.runPaged({
        // // pageSize: pageSize
        // pageSize: 10
        // });
        // var totalCount = pageData.count; // 总数
        // // var pageCount = pageData.pageRanges.length; // 页数
        // var pageCount = 1; // 页数
        // console.log('totalCount', JSON.stringify(totalCount));
        // while (pageCount > 0) {
        // pageData.fetch({
        // index: Number(nowPage++)
        // }).data.forEach(function (result) {
        // var resultJSON = result.toJSON();
        // // if (resultJSON.custrecord_fba_sku &&
        // // resultJSON.custrecord_fba_afn_total_quantity &&
        // // resultJSON.custrecord_fba_inventory_rid &&
        // // resultJSON.custrecord_fba_account &&
        // // resultJSON.custrecord_all_salesorder_location) {
        // //获取映射关系sku customrecord_dps_amazon_seller_sku
        // // console.log('customrecord_dps_amazon_seller_sku',
        // JSON.stringify(record.load({
        // // type: "customrecord_dps_amazon_seller_sku",
        // // id: ++i
        // // })));
        // search.create({
        // type: 'customrecord_dps_amazon_seller_sku',
        // columns: [
        // 'custrecord_dps_amazon_sku_number',
        // 'custrecord_dps_amazon_ns_sku'
        // ]
        // , filters: [{ name: 'custrecord_dps_amazon_sku_number', operator:
        // 'is', values: resultJSON.values.custrecord_fba_sku }]
        // }).run().each(function (seller) {
        // var sellerJSON = JSON.parse(JSON.stringify(seller));
        // console.log('sellerJSON', sellerJSON)
        // var skuId = sellerJSON.values.custrecord_dps_amazon_ns_sku[0].value;
        // var inventoryitem = record.load({
        // type: "inventoryitem",
        // id: skuId
        // });
        // var inventoryitemJSON = JSON.parse(JSON.stringify(inventoryitem));
        // console.log('inventoryitemJSON', inventoryitemJSON)

        // var item_count = inventoryitem.getLineCount({ sublistId: 'locations'
        // });
        // for (var i = 0; i < item_count; i++) {
        // var locationid = inventoryitem.getSublistValue({
        // sublistId: 'locations',
        // fieldId: 'locationid',
        // line: i,
        // });
        // if (locationid == update.salesorder_location) {
        // //库存对比
        // var quantityavailable = inventoryitem.getSublistValue({
        // sublistId: 'locations',
        // fieldId: 'quantityavailable',
        // line: i,
        // });
        // var qty = resultJSON.values.custrecord_fba_afn_total_quantity;
        // console.log("库存对比 ", qty + "-" + quantityavailable)
        // if (qty > quantityavailable) {
        // surplus.push({
        // item: skuId,
        // location: update.salesorder_location,
        // diffCount: qty - quantityavailable
        // });
        // }
        // if (qty < quantityavailable) {
        // losses.push({
        // item: skuId,
        // location: update.salesorder_location,
        // diffCount: qty - quantityavailable
        // });
        // }
        // }
        // }
        // return false;
        // });
        // });
        // pageCount--;
        // }

        // console.log('i', i);
        // });
        // console.log('surplus', surplus);

        // var firstCompany = getCompanyId("蓝深贸易有限公司")
        // if (surplus.length > 0) {
        // var useType = stockUseType('盘盈入库')
        // saveInventoryAdjust(firstCompany, surplus, useType);
        // }
        // console.log('losses', losses);
        // if (losses.length > 0) {
        // var useType = stockUseType('盘亏出库')
        // saveInventoryAdjust(firstCompany, losses, useType);
        // }

        // var nowPage = Number(1); // 查询页
        // var pageSize = Number(100); // 每页数量
        // var inventoryitem = search.create({
        // type: 'inventoryitem',
        // columns: [
        // 'itemid', 'custitem_dps_ctype', 'custitem_dps_skuchiense',
        // 'locationquantityonhand',
        // 'locationquantitycommitted', 'locationquantityavailable',
        // 'custitem_dps_picture'
        // ]
        // });
        // var pageData = inventoryitem.runPaged({
        // pageSize: pageSize
        // });
        // var totalCount = pageData.count; // 总数
        // var pageCount = pageData.pageRanges.length; // 页数
        // pageData.fetch({
        // index: Number(nowPage - 1)
        // }).data.forEach(function (result) {
        // console.log('inventoryitem', JSON.stringify(result));
        // var inventoryitem = record.load({
        // type: "inventoryitem",
        // id: result.id
        // });
        // console.log("inventoryitem: ", JSON.stringify(inventoryitem));
        // });

        // console.log(JSON.stringify(eric_record));
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