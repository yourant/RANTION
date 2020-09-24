/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["N/search", "N/record", "N/http", 'N/url', 'N/https', '../Helper/logistics_cost_calculation.js', '../Helper/location_preferred.js', '../../douples_amazon/Helper/Moment.min.js', 'N/format', 'N/runtime', 'N/currency'], 
function (search, record, http, url, https, costCal, loactionPre, moment, format, runtime, currency) {

    function onRequest(context) {
        var response = context.response;
        



        try {
        //     var getFilter = [];
        //     // getFilter.push([[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]);
        //     // getFilter.push([ 'custrecord_lmr_destination', 'isempty', [] ]);
        //     // getFilter.push([ 'custrecord_lmr_destination.custrecord_cc_country_code', 'contains', 'US' ]);
        //     getFilter.push([ 'custrecord_lmr_sku', 'anyof', ['12449'] ]);
        //     log.debug('getFilter', JSON.stringify(getFilter));
        //     var searchRe = getRecBySearch(getFilter);
        //     log.debug('searchRe', JSON.stringify(searchRe));


            var soid = '89362';
            var idid = '1';
            createLogisticsStrategy(soid, idid);
        } catch (error) {
            log.debug('error', JSON.stringify(error));
        }




        // try {
        //     var id;
        //     search.create({
        //         type: 'customrecord_dps_juge_po',
        //         filters: [
        //             { name: 'custrecord_juge_sho', operator: 'is', values: false },
        //             { name: 'custrecord_juge_wrong', operator: 'is', values: false },
        //             { name: 'isinactive', operator: 'is', values: false }
        //         ],
        //         columns: [ 'custrecord_juge_po', 'custrecord_juge_time', { name: 'location', join: 'custrecord_juge_po' } ]
        //     }).run().each(function (rec) {
        //         id = rec.id;
        //         // 生成货品履行
        //         var itemFulfillment = record.transform({
        //             fromType: 'transferorder',
        //             toType: record.Type.ITEM_FULFILLMENT,
        //             fromId: Number(rec.getValue('custrecord_juge_po')),
        //         });
        //         itemFulfillment.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: rec.getValue('custrecord_juge_time') }) });
        //         itemFulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });
        //         // var location = rec.getValue({ name: 'location', join: 'custrecord_juge_po' });
        //         // var flad = true;
        //         // search.create({
        //         //     type: 'location',
        //         //     filters: [
        //         //         { name: 'internalid', operator: 'is', values: location }
        //         //     ],
        //         //     columns: [ 'custrecord_wms_location_type', 'custrecord_dps_financia_warehous' ]
        //         // }).run().each(function (rec) {
        //         //     var type = rec.getValue('custrecord_wms_location_type');
        //         //     var ware = rec.getValue('custrecord_dps_financia_warehous');
        //         //     if (type == 1 && ware == 3) {
        //         //         flad = false;
        //         //     }
        //         //     return false;
        //         // });
        //         // if (flad) {
        //         //     var lineIF = itemFulfillment.getLineCount({ sublistId: 'item' });
        //         //     for (var i = 0; i < lineIF; i++) {
        //         //         itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'custcol_location_bin', value: 1, line: i });
        //         //     }
        //         // }
        //         var ifId = itemFulfillment.save();
        //         log.debug('if生成成功', ifId);
    
        //         // 生成货品收据
        //         var itemReceipt = record.transform({
        //             fromType: 'transferorder',
        //             toType: record.Type.ITEM_RECEIPT,
        //             fromId: Number(rec.getValue('custrecord_juge_po')),
        //         });
        //         itemReceipt.setValue({ fieldId: 'shipstatus', value: 'C' });
        //         itemReceipt.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: rec.getValue('custrecord_juge_time') }) });
        //         // var lineIFe = itemReceipt.getLineCount({ sublistId: 'item' });
        //         // for (var i = 0; i < lineIFe; i++) {
        //         //     itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'custcol_location_bin', value: '', line: i });
        //         // }
        //         var irId = itemReceipt.save();
        //         log.debug('货品收据生成成功', irId);
    
        //         record.submitFields({
        //             type: 'customrecord_dps_juge_po',
        //             id: rec.id,
        //             values: {
        //                 custrecord_juge_sho: 'T'
        //             }
        //         });
        //         return false;
        //     });
        // } catch (error) {
        //     record.submitFields({
        //         type: 'customrecord_dps_juge_po',
        //         id: id,
        //         values: {
        //             custrecord_juge_wrong: 'T'
        //         }
        //     });
        //     log.debug('error', JSON.stringify(error));
        // }


        // var poRec = record.create({ type: 'purchaseorder', isDynamic: true });
        // poRec.setValue({ fieldId: 'entity', value: 8060 });
        // poRec.setValue({ fieldId: 'currency', value: 1 });
        // poRec.setValue({ fieldId: 'location', value: 155 });
        // poRec.setValue({ fieldId: 'custbody_dps_type', value: '6' });
        // // var skus = poData.skus;
        // // for (var index = 0; index < skus.length; index++) {
        //     // log.debug('skus', JSON.stringify(skus));
        //     poRec.selectNewLine({ sublistId: 'item' });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: 12449 });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
        //     poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 321 });
        //     // poRec.setCurrentSublistValue({ sublistId: 'item', fieldId: 'location', value: poData.to_subsidiary_location });
        //     poRec.commitLine({ sublistId: 'item' });
        // // }
        // poid = poRec.save();

        // try {
        //     search.create({
        //         type: 'customrecord_dps_juge_po',
        //         filters: [
        //             { name: 'custrecord_juge_sho', operator: 'is', values: false },
        //             { name: 'custrecord_juge_wrong', operator: 'is', values: false }
        //         ],
        //         columns: [
        //             'custrecord_juge_po', 'custrecord_juge_time', 'custrecord_juge_product', 'custrecord_juge_quantiy', 'custrecord_juge_location',
        //             'custrecord_juge_sho', 'custrecord_juge_wrong', 'custrecord_dps_location_bin'
        //         ]
        //     }).run().each(function (rec) {
        //         var po = rec.getValue('custrecord_juge_po');
        //         var sku = rec.getValue('custrecord_juge_product');
        //         var qty = Number(rec.getValue('custrecord_juge_quantiy'));
        //         var date = rec.getValue('custrecord_juge_time');
        //         var location = rec.getValue('custrecord_juge_location');
        //         var bin = rec.getValue('custrecord_dps_location_bin');
    
        //         log.debug('采购订单收货', 'po:' + po + ',sku:' + sku + ',qty:' + qty + ',date:' + date);
        //         // 生成货品收据
        //         var itemReceipt = record.transform({
        //             fromType: 'purchaseorder',
        //             toType: record.Type.ITEM_RECEIPT,
        //             fromId: Number(po),
        //         });
        //         var ttttt = false;
        //         var lineIR = itemReceipt.getLineCount({ sublistId: 'item' });
        //         itemReceipt.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: date }) });
        //         for (var i = 0; i < lineIR; i++) {
        //             var itemre = itemReceipt.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
        //             if (itemre != sku) {
        //                 itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'itemreceive', value: false, line: i });
        //                 continue;
        //             }
        //             ttttt = true;
        //             itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'custcol_location_bin', value: bin, line: i });
        //             itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: i });
        //             itemReceipt.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: i });
        //         }
        //         if (ttttt) {
        //             var idididididid = itemReceipt.save();
        //             if (idididididid) {
        //                 var venderBill = record.transform({
        //                     fromType:'purchaseorder',
        //                     toType: record.Type.VENDOR_BILL,
        //                     fromId: Number(po),
        //                 });
        //                 venderBill.setValue({ fieldId: 'approvalstatus', value: 2 });
        //                 venderBill.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: date }) });
        //                 var lineIR = venderBill.getLineCount({ sublistId: 'item' });
        //                 var kkk = false;
        //                 var tt = 0;
        //                 for (var i = 0; i < lineIR; i++) {
        //                     var itemre = venderBill.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
        //                     if (itemre != sku) {
        //                         venderBill.removeLine({ sublistId: 'item', line: (i - tt), ignoreRecalc: true });
        //                         tt++;
        //                         continue;
        //                     }
        //                     kkk = true;
        //                     venderBill.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: qty, line: i });
        //                 }
        //                 if (kkk) {
        //                     venderBill.save();
        //                     log.debug('采购订单收货账单', 'po:' + po + ',sku:' + sku + ',qty:' + qty);
        //                     record.submitFields({
        //                         type: 'customrecord_dps_juge_po',
        //                         id: rec.id,
        //                         values: {
        //                             custrecord_juge_sho: 'T'
        //                         }
        //                     });
        //                 }
        //             } else {
        //                 record.submitFields({
        //                     type: 'customrecord_dps_juge_po',
        //                     id: rec.id,
        //                     values: {
        //                         custrecord_juge_wrong: 'T'
        //                     }
        //                 });
        //             }
        //         } else {
        //             record.submitFields({
        //                 type: 'customrecord_dps_juge_po',
        //                 id: rec.id,
        //                 values: {
        //                     custrecord_juge_wrong: 'T'
        //                 }
        //             });
        //         }
        //         return false;
        //     });
        // } catch (error) {
        //     log.debug('error', JSON.stringify(error));
        // }

        // try {
        //     search.create({
        //         type: 'customrecord_juge_po_so',
        //         filters: [
        //             { name: 'custrecord_juge_poso_soshipped', operator: 'is', values: false },
        //             { name: 'custrecord_juge_poso_poreceipt', operator: 'is', values: false },
        //             { name: 'custrecord_juge_poso_invoice', operator: 'is', values: false },
        //             { name: 'custrecord_juge_poso_pobill', operator: 'is', values: false },
        //             { name: 'isinactive', operator: 'is', values: false }
        //         ],
        //         columns: [
        //             'custrecord_juge_poso_po', 'custrecord_juge_poso_so',
        //             'custrecord_dps_delivery_time', 'custrecord_dps_po_location_bin',
        //             { name: 'custrecord_dps_financia_warehous', join: 'custrecord_dps_so_location' }
        //         ]
        //     }).run().each(function (rec) {
        //         var po_id = rec.getValue('custrecord_juge_poso_po');
        //         var so_id = rec.getValue('custrecord_juge_poso_so');
        //         var location_bin = rec.getValue('custrecord_dps_po_location_bin');
        //         var po_so_date = rec.getValue('custrecord_dps_delivery_time'); // 收发货日期

        //         log.debug('data', 'po_id:' + po_id);

        //         // 生成货品履行
        //         var itemFulfillment = record.transform({
        //             fromType: 'salesorder',
        //             toType: record.Type.ITEM_FULFILLMENT,
        //             fromId: Number(so_id),
        //         });
        //         itemFulfillment.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: po_so_date }) });
        //         itemFulfillment.setValue({ fieldId: 'shipstatus', value: 'C' });
        //         var lineIF = itemFulfillment.getLineCount({ sublistId: 'item' });
        //         for (var i = 0; i < lineIF; i++) {
        //             if (location_bin) {
        //                 itemFulfillment.setSublistValue({ sublistId: 'item', fieldId: 'custcol_location_bin', value: location_bin, line: i });
        //             }
        //         }
        //         var ifId = itemFulfillment.save();
        //         record.submitFields({
        //             type: 'customrecord_juge_po_so',
        //             id: rec.id,
        //             values: {
        //                 custrecord_juge_poso_soshipped: 'T'
        //             }
        //         });
        //         log.debug('if生成成功', ifId);
    
        //         // 生成发票
        //         var Invoice = record.transform({
        //             fromType: 'salesorder',
        //             toType: record.Type.INVOICE,
        //             fromId: Number(so_id),
        //         })
        //         Invoice.setValue({ fieldId: 'approvalstatus', value: 2 });
        //         Invoice.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: po_so_date }) });
        //         var InvoiceId = Invoice.save();
        //         record.submitFields({
        //             type: 'customrecord_juge_po_so',
        //             id: rec.id,
        //             values: {
        //                 custrecord_juge_poso_invoice: 'T'
        //             }
        //         });
        //         log.debug('Invoice生成成功', InvoiceId);
    
        //         // 生成货品收据
        //         var itemReceipt = record.transform({
        //             fromType: 'purchaseorder',
        //             toType: record.Type.ITEM_RECEIPT,
        //             fromId: Number(po_id),
        //         });
        //         itemReceipt.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: po_so_date }) });
        //         var irId = itemReceipt.save();
        //         record.submitFields({
        //             type: 'customrecord_juge_po_so',
        //             id: rec.id,
        //             values: {
        //                 custrecord_juge_poso_poreceipt: 'T'
        //             }
        //         });
        //         log.debug('货品收据生成成功', irId);
    
        //         // 生成应付账单
        //         var venderBill = record.transform({
        //             fromType: 'purchaseorder',
        //             toType: record.Type.VENDOR_BILL,
        //             fromId: Number(po_id),
        //         });
        //         venderBill.setValue({ fieldId: 'approvalstatus', value: 2 });
        //         venderBill.setValue({ fieldId: 'trandate', value: format.parse({ type: format.Type.DATE, value: po_so_date }) });
        //         var venderBillId = venderBill.save();
        //         record.submitFields({
        //             type: 'customrecord_juge_po_so',
        //             id: rec.id,
        //             values: {
        //                 custrecord_juge_poso_pobill: 'T'
        //             }
        //         });
        //         log.debug('应付账单生成成功', venderBillId);
        //         return false;
        //     });
        // } catch (error) {
        //     log.debug('error', JSON.stringify(error));
        // }

    }

    function internalcompany() {
        try {
            var index = 1;
            search.create({
                type: 'customrecord_juge_po_so',
                filters: [
                    { name: 'custrecord_juge_poso_so', operator: 'anyof', values: ['@NONE@'] },
                    { name: 'custrecord_juge_poso_soshipped', operator: 'is', values: false },
                    { name: 'custrecord_juge_poso_poreceipt', operator: 'is', values: false },
                    { name: 'custrecord_juge_poso_invoice', operator: 'is', values: false },
                    { name: 'custrecord_juge_poso_pobill', operator: 'is', values: false }
                ],
                columns: [
                    'custrecord_juge_poso_po', 'custrecord_juge_poso_client', 'custrecord_juge_poso_date',
                    'custrecord_dps_delivery_time', 'custrecord_dps_so_location', 'custrecord_dps_po_location_bin',
                    { name: 'subsidiary', join: 'custrecord_juge_poso_client' },
                    { name: 'tranid', join: 'custrecord_juge_poso_po' }
                ]
            }).run().each(function (rec) {
                var id = rec.id;
                var po_id = rec.getValue('custrecord_juge_poso_po');
                var po_no = rec.getValue({ name: 'tranid', join: 'custrecord_juge_poso_po' });
                var client_id = rec.getValue('custrecord_juge_poso_client');
                var client_name = rec.getText('custrecord_juge_poso_client');
                var client_subsidiary = rec.getValue({ name: 'subsidiary', join: 'custrecord_juge_poso_client' });
                var so_date = rec.getValue('custrecord_juge_poso_date'); // SO日期

                var so_location_id = rec.getValue('custrecord_dps_so_location');
                var so_location_name = rec.getText('custrecord_dps_so_location');
                var location_bin = rec.getValue('custrecord_dps_po_location_bin');
                var po_so_date = rec.getValue('custrecord_dps_delivery_time'); // 收发货日期


                log.debug('getParameters', 'po_id:' + po_id + ',po_no:' + po_no + ',client_id:' + 
                    client_id + ',client_name:' + client_name + ',client_subsidiary:' + client_subsidiary + ',so_location_id:' + 
                    so_location_id + ',so_location_name:' + so_location_name + ',location_bin:' + location_bin + ',po_so_date:' + 
                    po_so_date);

                var parameters_str = getParameters(client_name, client_id, client_subsidiary, po_id, po_no, so_date, so_location_id);
                var auth = 'NLAuth nlauth_account=6188472,nlauth_email=157086326@qq.com,nlauth_signature=Welcome1234,nlauth_role=3';
                var url_str = 'https://6188472.app.netsuite.com/app/accounting/transactions/interco/salesordqueue.nl';
                var intercompany_body = https.post({
                    url: url_str,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept-Encoding': 'zh-CN,zh;q=0.9,en;q=0.8,zh-TW;q=0.7',
                        'Authorization': auth,
                        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
                    },
                    body: parameters_str
                });

                log.debug('intercompany_info', JSON.stringify(intercompany_body));
                var so_id;
                search.create({
                    type: 'purchaseorder',
                    filters: [{ name: 'internalid', operator: 'is', values: po_id }],
                    columns: [ 'intercotransaction' ]
                }).run().each(function (result) {
                    so_id = result.getValue('intercotransaction');
                    return false;
                });
                if (so_id) {
                    record.submitFields({
                        type: 'customrecord_juge_po_so',
                        id: id,
                        values: {
                            custrecord_juge_poso_so: so_id
                        }
                    });
                    record.submitFields({
                        type: 'salesorder',
                        id: so_id,
                        values: {
                            custbody_order_type: 6,
                            location: so_location_id
                        }
                    });
                }
                // if (index < 5) {
                //     index++;
                //     return true;
                // } else {
                    return false;
                // }
            });
        } catch (error) {
            log.debug('intercompany_error', JSON.stringify(error));
        }
    }

    function getParameters(client_name, client_id, client_subsidiary, po_id, po_no, so_date, so_location_id) {
        var parametersJson = {};
        // 动态参数
        // parametersJson.inpt_entity = '274 蓝深贸易有限公司'; // 客户名称，带编号
        // parametersJson.entity = '2821'; // 客户内部id
        // parametersJson.subsidiary = '2'; // po供应商的代表子公司内部id，so的子公司
        parametersJson.inpt_entity = client_name; // 客户名称，带编号
        parametersJson.entity = client_id; // 客户内部id
        parametersJson.subsidiary = client_subsidiary; // po供应商的代表子公司内部id，so的子公司
        parametersJson.nextorderidx = '2'; // po数量+1
        var po_info = {};
        // po_info.po_id = '231'; // PO内部id
        // po_info.po_number = 'PO2006230025'; // PO编号
        po_info.po_id = po_id; // PO内部id
        po_info.po_number = po_no; // PO编号
        var po_parameter_str = 'T{po_id}Purchase Order {po_number}/app/accounting/transactions/transaction.nl?id={po_id}1Sales Order';
        parametersJson.orderdata = po_parameter_str.format(po_info);
        // parametersJson.trandate = '2020-6-23'; // 日期
        parametersJson.trandate = so_date; // 日期
        parametersJson.location = so_location_id; // 地点

        // 静态参数，写死即可
        parametersJson.inpt_currency = 'CNY';
        parametersJson.currency = '1';
        parametersJson.orderaction = 'autogen';
        parametersJson.orderlabels = 'SelectIntercompany Purchase OrderCreate Manually';
        parametersJson.ordervalid = 'T';
        parametersJson.orderfields = 'applyorderidorderlinkorderurlcurrencypairedlinkpairedurl';
        parametersJson.ordertypes = 'checkboxtexttexttexttexttexttext';
        parametersJson.ordersortidx = '-1';
        parametersJson.submitted = 'T';
        parametersJson.orderflags = '4000000';

        var parameters_str = 'inpt_entity={inpt_entity}&entity={entity}&inpt_currency={inpt_currency}&currency={currency}&subsidiary={subsidiary}&orderaction={orderaction}&nextorderidx={nextorderidx}&orderlabels={orderlabels}&orderdata={orderdata}&ordervalid={ordervalid}&trandate={trandate}&orderfields={orderfields}&ordertypes={ordertypes}&ordersortidx={ordersortidx}&submitted={submitted}&orderflags={orderflags}&location={location}';
        var parameters = parameters_str.format(parametersJson);
        return parameters;
    }

    function splitMonthToWeek(monthStartDate, skuqty) {
        var firstDay = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth(), 1);
        var monthDays = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0).getDate();
        var day_qty_a = Math.floor(skuqty / monthDays);
        var day_qty_l = skuqty - (day_qty_a * (monthDays - 1));
        var week_data = {};
        var weeks_no = [];
        for (var index = 0; index < monthDays; index++) {
            var qty = day_qty_a;
            if ((index + 1) == monthDays) {
                qty = day_qty_l;
            }
            // if (qty > 0) {
                var day = new Date(firstDay.getTime() + (24 * 60 * 60 * 1000 * index));
                var weeknum = getWeek(day);
                var data = week_data[weeknum];
                if (data) {
                    data.qty = data.qty + qty;
                } else {
                    var json = {};
                    json.qty = qty;
                    week_data[weeknum] = json;
                    weeks_no.push(weeknum);
                }
            // }
        }
        week_data['weeks'] = weeks_no;
        return week_data;
    }

    function getWeek(day) {
        var d1 = new Date(day);
        var d2 = new Date(day);
        d2.setMonth(0);
        d2.setDate(1);
        var numweekf = d2.getDay();
        var rq = d1.getTime() - d2.getTime() + (24 * 60 * 60 * 1000 * numweekf);
        var days = Math.ceil(rq / (24 * 60 * 60 * 1000));
        var num = Math.ceil(days / 7);
        return num;
    }

    String.prototype.format = function() {
        if (arguments.length == 0) {
            return this;
        }
        var param = arguments[0];
        var str = this;
        if (typeof(param) == 'object') {
            for(var key in param) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "g"), param[key]);
            }
            return str;
        } else {
            for(var i = 0; i < arguments.length; i++) {
                str = str.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
            }
            return str;
        }
    }

    function createLogisticsStrategy(soid, fulid) {

        var startTime = new Date().getTime();
        var SKUs = [];
        var order = {};
        var flag = true;

        // order info
        search.create({
            type: 'salesorder',
            filters: [
                { name: 'mainline', operator: 'is', values: [ 'F' ] },
                { name: 'taxline', operator: 'is', values: [ 'F' ] },
                { name: 'type', operator: 'anyof', values: [ 'SalesOrd' ]},
                { name: 'type', join: 'item', operator: 'anyof', values: [ 'InvtPart' ]},
                { name: 'internalid', operator: 'anyof', values: soid }
            ],
            columns : [
                'custbody_aio_account', 'amount', 'subsidiary', 'item', 'quantity', 'location',
                { name: 'custrecord_aio_enabled_sites', join: 'custbody_aio_account' },
                { name: 'internalid', join: 'item' },
                { name: 'custrecord_cc_country', join: 'custbody_dps_order_contact' },
                { name: 'custrecord_cc_zip', join: 'custbody_dps_order_contact' },
                { name: 'custitem_dps_group', join: 'item' },
                { name: 'custitem_dps_long', join: 'item' },
                { name: 'custitem_dps_wide', join: 'item' },
                { name: 'custitem_dps_high', join: 'item' },
                { name: 'custitem_dps_heavy2', join: 'item' }
            ]
        }).run().each(function(result) {
            if (flag) {
                order.id = soid;
                order.siteid = result.getValue({ name: 'custrecord_aio_enabled_sites', join: 'custbody_aio_account' });
                order.accountid = result.getValue('custbody_aio_account');
                order.subsidiary = result.getValue('subsidiary');
                order.locationid = result.getValue('location');
                order.amount = Number(result.getValue('amount'));
                order.country = result.getValue({ name: 'custrecord_cc_country', join: 'custbody_dps_order_contact' });
                order.zip = result.getValue({ name: 'custrecord_cc_zip', join: 'custbody_dps_order_contact' });
                order.group = result.getValue({ name: 'custitem_dps_group', join: 'item' });
                order.long = Number(result.getValue({ name: 'custitem_dps_long', join: 'item' }));
                order.wide = Number(result.getValue({ name: 'custitem_dps_wide', join: 'item' }));
                order.high = Number(result.getValue({ name: 'custitem_dps_high', join: 'item' }));
                order.weight = 0;
                order.lwh = 0;
                flag = false;
            } else {
                order.amount = order.amount + Number(result.getValue('amount'));
            }
            var jsonstr = {};
            jsonstr.skuid = Number(result.getValue({ name: 'internalid', join: 'item' }));
            jsonstr.quantity = Number(result.getValue('quantity'));
            jsonstr.logistics_group = Number(result.getValue({ name: 'custitem_dps_group', join: 'item' }));
            var long = Number(result.getValue({ name: 'custitem_dps_long', join: 'item' }));
            if (long > order.long) {
                order.long = long;
            }
            var wide = Number(result.getValue({ name: 'custitem_dps_wide', join: 'item' }));
            if (wide > order.wide) {
                order.wide = wide;
            }
            var high = Number(result.getValue({ name: 'custitem_dps_high', join: 'item' }));
            if (high > order.high) {
                order.high = high;
            }
            var weight = Number(result.getValue({ name: 'custitem_dps_heavy2', join: 'item' }));
            order.weight = order.weight + weight;
            SKUs.push(jsonstr.skuid);
            return true;
        });
        order.lwh = order.long + order.wide + order.high;

        var getFilter = [];
        // 站点
        if (order.siteid) {
            getFilter.push([[ 'custrecord_lmr_site', 'anyof', order.siteid ], 'or', [ 'custrecord_lmr_site', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_site', 'isempty', [] ]);
        }
        // 账号
        getFilter.push('and');
        if (order.accountid) {
            getFilter.push([[ 'custrecord_lmr_account', 'anyof', order.accountid ], 'or', [ 'custrecord_lmr_account', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_account', 'isempty', [] ]);
        }
        // 仓库
        getFilter.push('and');
        if (order.locationid) {
            getFilter.push([[ 'custrecord_lmr_location', 'anyof', order.locationid ], 'or', [ 'custrecord_lmr_location', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_location', 'isempty', [] ]);
        }
        // 目的地
        getFilter.push('and');
        if (order.country) {
            getFilter.push([[ 'custrecord_lmr_destination.custrecord_cc_country_code', 'contains', order.country ], 'or', [ 'custrecord_lmr_destination', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_destination', 'isempty', [] ]);
        }
        // 产品
        getFilter.push('and');
        if (SKUs.length > 0) {
            getFilter.push([[ 'custrecord_lmr_sku', 'anyof', SKUs ], 'or', [ 'custrecord_lmr_sku', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_sku', 'isempty', [] ]);
        }
        // 物流分组
        getFilter.push('and');
        if (order.group) {
            getFilter.push([[ 'custrecord_lmr_logistics_group', 'anyof', order.group ], 'or', [ 'custrecord_lmr_logistics_group', 'isempty', [] ]]);
        } else {
            getFilter.push([ 'custrecord_lmr_logistics_group', 'isempty', [] ]);
        }
        // 金额范围
        getFilter.push('and');
        if (order.amount > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_amount_start', 'lessthanorequalto', order.amount ], 'and', [ 'custrecord_lmr_amount_end', 'greaterthanorequalto', order.amount ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'lessthanorequalto', order.amount ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'greaterthanorequalto', order.amount ]], 'or',
                [[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_amount_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_amount_end', 'isempty', [] ]]);
        }
        // 重量范围
        getFilter.push('and');
        if (order.weight > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_weight_start', 'lessthanorequalto', order.weight ], 'and', [ 'custrecord_lmr_weight_end', 'greaterthanorequalto', order.weight ]],'or',
                [[ 'custrecord_lmr_weight_start', 'lessthanorequalto', order.weight ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'greaterthanorequalto', order.weight ]], 'or',
                [[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_weight_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_weight_end', 'isempty', [] ]]);
        }
        // 长度范围
        getFilter.push('and');
        if (order.long > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_length_start', 'lessthanorequalto', order.long ], 'and', [ 'custrecord_lmr_length_end', 'greaterthanorequalto', order.long ]], 'or',
                [[ 'custrecord_lmr_length_start', 'lessthanorequalto', order.long ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'greaterthanorequalto', order.long ]], 'or',
                [[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_length_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_length_end', 'isempty', [] ]]);
        }
        // 宽度范围
        getFilter.push('and');
        if (order.wide > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_width_start', 'lessthanorequalto', order.wide ], 'and', [ 'custrecord_lmr_width_end', 'greaterthanorequalto', order.wide ]], 'or',
                [[ 'custrecord_lmr_width_start', 'lessthanorequalto', order.wide ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'greaterthanorequalto', order.wide ]], 'or',
                [[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_width_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_width_end', 'isempty', [] ]]);
        }
        // 高度范围
        getFilter.push('and');
        if (order.high > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_height_start', 'lessthanorequalto', order.high ], 'and', [ 'custrecord_lmr_height_end', 'greaterthanorequalto', order.high ]], 'or',
                [[ 'custrecord_lmr_height_start', 'lessthanorequalto', order.high ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'greaterthanorequalto', order.high ]], 'or',
                [[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_height_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_height_end', 'isempty', [] ]]);
        }
        // 长宽高范围
        getFilter.push('and');
        if (order.lwh > 0) {
            getFilter.push([
                [[ 'custrecord_lmr_lwh_start', 'lessthanorequalto', order.lwh ], 'and', [ 'custrecord_lmr_lwh_end', 'greaterthanorequalto', order.lwh ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'lessthanorequalto', order.lwh ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'greaterthanorequalto', order.lwh ]], 'or',
                [[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]]
            ]);
        } else {
            getFilter.push([[ 'custrecord_lmr_lwh_start', 'isempty', [] ], 'and', [ 'custrecord_lmr_lwh_end', 'isempty', [] ]]);
        }
        log.debug('getFilter', JSON.stringify(getFilter));
        var searchRe = getRecBySearch(getFilter);
        log.debug('searchRe', JSON.stringify(searchRe));

        // 计算预估运费
        var resultJSON = costCal.calculationByRule(searchRe, order.country, order.zip, order.weight, order.long, order.wide, order.high);
        log.debug('cost', JSON.stringify(resultJSON));
        var resultObj = JSON.parse(resultJSON);
        var ful = record.load({ type: 'customrecord_dps_shipping_small_record', id: fulid, isDynamic: true });
        if (resultObj.servicesId) {
            var so = record.load({ type: 'salesorder', id: soid, isDynamic: true });
            so.setValue({ fieldId: 'custbody_dps_distributors', value: resultObj.services_com_id }); // 渠道商
            so.setValue({ fieldId: 'custbody_dps_service_channels', value: resultObj.servicesId }); // 渠道服务
            so.setValue({ fieldId: 'custbody_dps_chargeable_weight', value: resultObj.costweight }); // 计费重量
            so.setValue({ fieldId: 'custbody_dps_estimate_freight', value: resultObj.costamount }); // 预估运费
            so.save();
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_channel_dealer', value: resultObj.services_com_id }); // 渠道商
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_channelservice', value: resultObj.servicesId }); // 渠道服务
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_estimatedfreig', value: resultObj.costamount }); // 预估运费
            // custrecord_dps_ship_small_ship_weight
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 1 }); // 匹配状态，成功
            
            log.debug('sss');
        } else {
            ful.setValue({ fieldId: 'custrecord_dps_ship_small_status', value: 3 }); // 匹配状态，失败
        }
        ful.setValue({ fieldId: 'custrecord_dps_ship_samll_location', value: order.locationid }); // 发货仓库
        ful.save();

        log.debug('fullfillment end, 总共耗时：', new Date().getTime() - startTime);
    }

    function getRecBySearch(filters) {
        var p = [];
        search.create({
            type: 'customrecord_logistics_match_rule',
            filters: filters
        }).run().each(function (rec) {
            p.push(rec.id);
            return true;
        });
        return p;
    }

    return {
        onRequest: onRequest
    }
});
