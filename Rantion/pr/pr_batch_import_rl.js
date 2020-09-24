/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/search', 'N/record'], function (log, search, record) {

    function _get(context) {

    }

    function _post(context) {
        log.debug('context', context);
        var data = JSON.parse(context.data);
        if (data.length > 0) {
            var err_sku = [], msgStr, receipt_Id = [], loadId = [];
            try {
                for (var i = 0; i < data.length; i++) {
                    var itemResultArr = searchAllChoosedItem(data[i]);
                    if (itemResultArr.length > 0) {
                        for (var c = 0; c < itemResultArr.length; c++) {
                            if (!itemResultArr[c].getValue('vendor')) {
                                err_sku.push(itemResultArr[c].getValue('itemid'))
                            }
                        }
                    }
                    if (err_sku.length > 0) {
                        continue;
                    }
                    log.debug('itemResultArr', itemResultArr);
                    var new_itemResultArr = [];
                    if (itemResultArr.length > 0) {
                        var po_no = [];
                        for (var z = 0; z < itemResultArr.length; z++) {
                            if (po_no.indexOf(itemResultArr[z].getValue(itemResultArr[z].columns[4])) === -1) {
                                new_itemResultArr.push({
                                    subsidiary_id: itemResultArr[z].getValue(itemResultArr[z].columns[4]),
                                    lineItems: [{
                                        description: itemResultArr[z].getValue('description'),
                                        skuchiense: itemResultArr[z].getValue('custitem_dps_skuchiense'),
                                        internalid: itemResultArr[z].getValue('internalid'),
                                        vendor: itemResultArr[z].getValue('vendor'),
                                        subsidiary: itemResultArr[z].getValue(itemResultArr[z].columns[4]),
                                        item_name: itemResultArr[z].getValue('itemid')
                                    }]
                                });
                            } else {
                                for (var j = 0; j < new_itemResultArr.length; j++) {
                                    if (new_itemResultArr[j].subsidiary_id == itemResultArr[z].getValue(itemResultArr[z].columns[4])) {
                                        new_itemResultArr[j].lineItems.push({
                                            description: itemResultArr[z].getValue('description'),
                                            skuchiense: itemResultArr[z].getValue('custitem_dps_skuchiense'),
                                            internalid: itemResultArr[z].getValue('internalid'),
                                            vendor: itemResultArr[z].getValue('vendor'),
                                            subsidiary: itemResultArr[z].getValue(itemResultArr[z].columns[4]),
                                            item_name: itemResultArr[z].getValue('itemid')
                                        });
                                        break;
                                    }
                                }
                            }
                            po_no.push(itemResultArr[z].getValue(itemResultArr[z].columns[4]));
                        }
                    }

                    if (new_itemResultArr.length > 0) {
                        for(var z = 0; z < new_itemResultArr.length; z++){
                            log.debug('data[i]', data[i]);
                            log.debug('new_itemResultArr[z]', new_itemResultArr[z]);
                            var receiptId = transformRecordToPr(data[i], new_itemResultArr[z]);
                            receipt_Id.push(receiptId);
                            if(loadId.indexOf(data[i]) == -1){
                                loadId.push(data[i]);
                            }
                        }
                    }
                }
                if (err_sku.length > 0) {
                    msgStr = 'sku为：' + err_sku + '没有默认供应商';
                    return msgStr;
                }
                if(receipt_Id.length > 0){
                    msgStr = '内部标识为' + loadId + '的记录成功转换为请购单，其记录的id为:' + receipt_Id + '\n';
                    return msgStr;
                }
            } catch (e) {
                msgStr = '出错:' + e.message;
                return msgStr;
            }
        }
    }

    function searchAllChoosedItem(data) {
        log.debug('internalid anyof  ' + JSON.stringify(data))
        var columns = ['internalid', { join: 'custrecord_pr_batch_import_link', name: 'custrecord_pr_batch_import_item' }]
        var filters = []
        filters.push(search.createFilter({
            name: 'internalid',
            operator: 'anyof',
            values: data
        }))
        var batchImportSearch = search.create({
            type: 'customrecord_pr_batch_import_headline',
            title: '查询所有未转换的货品',
            columns: columns,
            filters: filters
        })
        var batchImportItemArr = []
        batchImportSearch.run().each(function (result) {
            var item = result.getValue({ join: 'custrecord_pr_batch_import_link', name: 'custrecord_pr_batch_import_item' })
            batchImportItemArr.push(item)
            return true
        })
        var itemColumns = ['description', 'custitem_dps_skuchiense', 'internalid', 'vendor', { join: 'preferredVendor', name: 'subsidiary' }, 'itemid']
        var itemFilters = []
        itemFilters.push(search.createFilter({
            name: 'internalid',
            operator: 'anyof',
            values: batchImportItemArr
        }))
        var itemSearch = search.create({
            type: 'item',
            title: '查询所有的货品详情',
            columns: itemColumns,
            filters: itemFilters
        })
        var itemResultArr = []
        itemSearch.run().each(function (result) {
            itemResultArr.push(result)
            return true
        })
        return itemResultArr
    }

    function transformRecordToPr(loadId, itemResultArr) {
        var objRecord = record.load({
            type: 'customrecord_pr_batch_import_headline',
            id: loadId
        })
        var customRecord = record.create({
            type: 'purchaserequisition',
            isDynamic: true
        })
        customRecord.setValue({ // 请求者
            fieldId: 'entity',
            value: objRecord.getValue('owner')
        })
        customRecord.setValue({ // 采购员
            fieldId: 'custbody_dps_owner',
            value: objRecord.getValue('custrecord_pr_batch_import_entity')
        })
        customRecord.setValue({ // 备注
            fieldId: 'memo',
            value: objRecord.getValue('custrecord_pr_batch_import_memo')
        })
        var dueDate = objRecord.getValue('custrecord_pr_batch_import_duedate')
        if (dueDate != null && dueDate != '') {
            customRecord.setValue({ // 收货日期
                fieldId: 'duedate',
                value: dueDate
            })
        }
        var trandate = objRecord.getValue('custrecord_pr_batch_import_trandate')
        customRecord.setValue({ // 创建日期
            fieldId: 'trandate',
            value: trandate
        })
        var poMethod = objRecord.getValue('custrecord_pr_batch_import_type')
        log.debug('请购单类型', poMethod)
        if (poMethod != null && poMethod != '') {
            customRecord.setValue({ // 请购单类型
                fieldId: 'custbody_dps_type',
                value: poMethod
            })
        }
        customRecord.setValue({ // 子公司
            fieldId: 'subsidiary',
            value: itemResultArr.subsidiary_id
        })
        var receiptId = setSublistValueToRecord(customRecord, objRecord, itemResultArr.lineItems)
        return receiptId
    }

    function setSublistValueToRecord(customRecord, objRecord, itemResultArr) {
        var objSublist = objRecord.getSublist({ // load出来的对象
            sublistId: 'recmachcustrecord_pr_batch_import_link'
        })
        var lineCount = objRecord.getLineCount({
            sublistId: 'recmachcustrecord_pr_batch_import_link'
        })
        var itemSublist = customRecord.getSublist({
            sublistId: 'item'
        })
        for (var x = 0; x < lineCount; x++) {
            customRecord.selectNewLine({
                sublistId: 'item'
            })
            var sku = objRecord.getSublistValue({ // 货品
                sublistId: 'recmachcustrecord_pr_batch_import_link',
                fieldId: 'custrecord_pr_batch_import_item',
                line: x
            })
            log.debug('货品', sku)
            
            for (var m = 0; m < itemResultArr.length; m++) {
                var itemId = itemResultArr[m].internalid
                var description = itemResultArr[m].description
                if (itemId == sku) {
                    customRecord.setCurrentSublistValue({ // 设置货品
                        sublistId: 'item',
                        fieldId: 'item',
                        value: sku
                    })

                    customRecord.setCurrentSublistValue({ // 说明
                        sublistId: 'item',
                        fieldId: 'description',
                        value: description
                    });

                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'povendor',
                        value: itemResultArr[m].vendor ? itemResultArr[m].vendor : ''
                    })

                    var quantity = objRecord.getSublistValue({ // 数量
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_quantity',
                        line: x
                    })
                    log.debug('数量', quantity)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: quantity
                    })
                    var estimatePrice = objRecord.getSublistValue({ // 估计单价
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_est_value',
                        line: x
                    })
                    log.debug('估计单价', estimatePrice)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedrate',
                        value: estimatePrice
                    })
                    var estimateAmount = objRecord.getSublistValue({ // 估计金额
                        sublistId: 'recmachcustrecord_pr_batch_import_link',
                        fieldId: 'custrecord_pr_batch_import_est_amount',
                        line: x
                    })
                    log.debug('估计金额 ', estimateAmount)
                    customRecord.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedamount',
                        value: estimateAmount
                    })
        
                    var esa = customRecord.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'estimatedamount'
                    })
                    log.debug('在Commitline 之前看看估价', esa)
                    customRecord.commitLine({
                        sublistId: 'item'
                    })
                }
            }
        }
        var requisitionRecId = customRecord.save()
        objRecord.setValue({
            fieldId: 'custrecord_pr_bi_wether_to_be_pr',
            value: true
        })
        var batchImportNewId = objRecord.save()
        return requisitionRecId
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
