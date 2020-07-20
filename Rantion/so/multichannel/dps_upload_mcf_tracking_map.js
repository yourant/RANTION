/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-20 17:41:02
 * @LastEditTime   : 2020-07-20 17:52:26
 * @LastEditors    : Li
 * @Description    : 上传追踪号至对应的销售订单
 * @FilePath       : \Rantion\so\multichannel\dps_upload_mcf_tracking_map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', "./Helper/core.min"], function (record, search, core) {

    function getInputData() {
        var orders = [];

        core.amazon.getAccountList().map(function (acc) {
            // log.debug('acc_id',acc.id);
            var limit = 10;
            var num = 0;
            search.create({
                type: 'customrecord_so_seperate_table',
                filters: [
                    // { name: 'internalId', operator: 'is',values: '2351' },
                    {
                        name: 'custrecord_store_acc',
                        operator: 'anyof',
                        values: acc.id
                    },
                    {
                        name: 'custrecord_so_seperate_po_num',
                        operator: 'isnotempty'
                    },
                    {
                        name: 'custrecord_mcf_trackingnumber',
                        operator: 'isnotempty'
                    },
                    {
                        name: 'custrecord_fulfillment_rma_management',
                        operator: 'is',
                        values: ["6"]
                    },
                    {
                        name: 'custrecord_fulfillment_resolved',
                        operator: 'is',
                        values: false
                    },
                    {
                        name: 'custrecord_is_upload_tracking',
                        operator: 'is',
                        values: false
                    },
                    {
                        name: 'isinactive',
                        operator: 'is',
                        values: false
                    },
                ],
                columns: [{
                        name: 'custrecord_so_seperate_po_num'
                    },
                    {
                        name: 'custrecord_mck_carriercode'
                    },
                    {
                        name: 'custrecord_mcf_trackingnumber'
                    },
                    {
                        name: 'custrecord_shipments_date_mcf'
                    },
                    {
                        name: 'custrecord_service_level'
                    },
                    {
                        name: 'custrecord_fulfillment_resolved'
                    },
                    {
                        name: 'custrecord_so_seperate_quantity'
                    },
                    {
                        name: 'custrecord_fulfillment_rma_management'
                    },
                    {
                        name: 'custrecord_store_acc'
                    },
                    {
                        name: 'custrecord_is_upload_tracking'
                    },
                    {
                        name: 'lastmodified',
                        sort: search.Sort.DESC
                    },
                ]
            }).run().each(function (result) {
                num++;
                orders.push({
                    fulfillment_id: result.id,
                    po_num: result.getValue(result.columns[0]),
                    carrier_code: result.getValue(result.columns[1]),
                    tracking_number: result.getValue(result.columns[2]),
                    shipments_date: result.getValue(result.columns[3]),
                    shipments_method: result.getText(result.columns[4]),
                    resolved: result.getValue(result.columns[5]),
                    quantity: result.getValue(result.columns[6]),
                    rma_management: result.getText(result.columns[7]),
                    account_id: result.getValue(result.columns[8]),
                    is_upload_tracking: result.getValue(result.columns[9]),
                });
                return --limit > 0;
            });
            log.debug('get num', acc.id + '------' + num);
        });
        log.debug('get total', orders.length);
        return orders;
    }

    function map(context) {
        var order = JSON.parse(context.value);
        var po_num = order.po_num;
        var carrier_code = order.carrier_code;
        var tracking_number = order.tracking_number;
        var shipment_date = order.shipments_date;
        var shipment_method = order.shipments_method;
        var resolved = order.resolved;
        var quantity = order.quantity;
        var rma_management = order.rma_management;
        var fulfillment_id = order.fulfillment_id;
        var account_id = order.account_id;

        log.debug("order", {
            // id: order.id,
            account_id: account_id,
            po_num: po_num,
            carrier_code: carrier_code,
            tracking_number: tracking_number,
            shipment_date: shipment_date,
            shipment_method: shipment_method,
            resolved: resolved,
            quantity: quantity,
            rma_management: rma_management,
            fulfillment_id: fulfillment_id,
        });

        var so_id, order_item_id, amazon_msku;
        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'poastext',
                    operator: 'is',
                    values: po_num
                },
                {
                    name: 'custbody_aio_account',
                    operator: 'anyof',
                    values: account_id
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
            ],
            columns: [{
                    name: 'custcol_aio_order_item_id'
                },
                {
                    name: 'custcol_aio_amazon_msku'
                },

            ]
        }).run().each(function (result) {
            so_id = result.id
            log.debug("so_id", result.id);
            order_item_id = result.getValue(result.columns[0]),
                log.debug("order_item_id", order_item_id);
            amazon_msku = result.getValue(result.columns[1]),
                log.debug("amazon_msku", amazon_msku);
            // quantity = result.getValue(result.columns[2]),
            // log.debug("quantity",quantity);
            // account_id = result.getValue(result.columns[3]),
            // log.debug("account_id",account_id);
            log.debug("so", amazon_msku + " : " + order_item_id);
        });
        if (so_id) {
            var rows = [];
            rows.push({
                order_id: po_num,
                tracking_number: tracking_number,
                shipment_date: shipment_date,
                shipment_method: shipment_method,
                carrier_code: carrier_code,
                order_item_id: order_item_id,
                item_qty: quantity,
            });
            // log.debug("input",{
            // 	account_id:account_id,
            // 	rows:rows,
            // });

            var uploadTracking = core.amazon.uploadTracking(account_id, rows, fulfillment_id);

            var deliveryorder_id = '';
            search.create({
                type: 'customrecord_wms_deliveryorders',
                filters: [{
                    name: 'custrecord_mcf_record_id',
                    operator: 'is',
                    values: fulfillment_id
                }, ],
            }).run().each(function (result) {
                deliveryorder_id = result.id;
                log.debug("deliveryorder_id", deliveryorder_id);
            });
            if (deliveryorder_id) {
                var full_order_rec = record.load({
                    type: 'customrecord_wms_deliveryorders',
                    id: deliveryorder_id
                });
                full_order_rec.setValue({
                    fieldId: 'custrecord_is_upload_tracking_num',
                    value: true
                });
                var full_order_rec_id = full_order_rec.save();
                log.debug("full_order_rec_id", full_order_rec_id);
            }

            // if (uploadTracking) {
            // 	log.debug("uploadTracking",uploadTracking);
            // 	var feed_submission_id=[];
            // 	search.create({
            // 		type: 'customrecord_aio_amazon_feed',
            // 		filters: [
            // 			{ name: 'custrecord_hf_fulfillment_id', operator: 'is', values: fulfillment_id },
            // 		],
            // 		columns: [
            // 			{ name: 'custrecord_aio_feed_submission_id'},
            // 		]
            // 	}).run().each(function (result){
            // 		feed_submission_id.push(result.getValue("custrecord_aio_feed_submission_id"));
            // 		return true;
            // 	});
            // 	log.debug("feed_submission_id", feed_submission_id);
            // 	if(feed_submission_id){
            // 		var auth = core.amazon.getAuthByAccountId(account_id);
            // 		log.debug("feed_submission_id-->auth",auth);
            // 		if (auth) {
            // 			var result1 = ''  
            // 			result1 = core.amazon.getFeedSubmissionList(account_id, auth, feed_submission_id);
            // 			var response = [];
            // 			search.create({
            // 				type: 'customrecord_aio_amazon_feed',
            // 				filters: [
            // 					{ name: 'custrecord_hf_fulfillment_id', operator: 'is', values: fulfillment_id },
            // 					{ name: "custrecord_aio_feed_response", operator: "isnotempty"},
            // 					{ name: "custrecord_aio_feed_resolved", operator: "is",values: false},
            // 				],
            // 				columns: [
            // 					{ name: 'custrecord_aio_feed_response'},
            // 				]
            // 			}).run().each(function (result){
            // 				// response.push(result.getValue("custrecord_aio_feed_response"));
            // 				response.push({
            // 					feed_id:result.id,
            // 					re: result.getValue("custrecord_aio_feed_response")
            // 				});
            // 				return true;
            // 			});
            // 			// log.debug("response",response);
            // 			// log.debug("response.length",response.length)
            // 			// log.debug("feed_id",response[0].feed_id);


            // 			for (var i = 0; i < response.length; i++) {
            // 				log.debug('feed_id',response[i].feed_id);
            // 				var xmlDocument = xml.Parser.fromString({
            // 					text : response[i].re
            // 				});
            // 				var messages_successful = xmlDocument.getElementsByTagName({ tagName: 'MessagesSuccessful' }).length ? xmlDocument.getElementsByTagName({ tagName: 'MessagesSuccessful' })[0].textContent : '';
            // 				var result_description = xmlDocument.getElementsByTagName({ tagName: 'ResultDescription' }).length ? xmlDocument.getElementsByTagName({ tagName: 'ResultDescription' })[0].textContent : '';
            // 				log.debug("MessagesSuccessful",messages_successful);
            // 				log.debug("result_description",result_description);

            // 				if (result_description) {
            // 					// var feed_rec = record.load({ type:'customrecord_aio_amazon_feed', id: response[i].feed_id });
            // 					// feed_rec.setValue({ fieldId: 'custrecord_aio_feed_resolved', value: false });
            // 					// var feed_rec_id = feed_rec.save();
            // 					// log.debug("feed_rec_id",feed_rec_id);
            // 					var deliveryorder_id = '';
            // 					search.create({
            // 						type: 'customrecord_wms_deliveryorders',
            // 						filters: [
            // 							{ name: 'custrecord_mcf_record_id', operator: 'is', values: fulfillment_id },
            // 						],
            // 					}).run().each(function (result){
            // 						deliveryorder_id = result.id;
            // 						log.debug("deliveryorder_id",deliveryorder_id);
            // 					});
            // 					if(deliveryorder_id){
            // 						var full_order_rec = record.load({ type: 'customrecord_wms_deliveryorders', id: deliveryorder_id });
            // 						log.debug("full_order_rec",full_order_rec);
            // 						// full_order_rec.setValue({ fieldId: 'custrecord_deliveryorders_resolved', value: false });
            // 						full_order_rec.setValue({ fieldId: 'custrecord_upload_tracking_info', value: result_description });
            // 						var full_order_rec_id = full_order_rec.save();
            // 						log.debug("full_order_rec_id",full_order_rec_id);
            // 					}
            // 				}else{

            // 					var feed_rec = record.load({ type:'customrecord_aio_amazon_feed', id: response[i].feed_id });
            // 					feed_rec.setValue({ fieldId: 'custrecord_aio_feed_resolved', value: true });
            // 					var feed_rec_id = feed_rec.save();
            // 					log.debug("feed_rec_id",feed_rec_id);

            // 					log.debug("fulfillment_id",fulfillment_id);
            // 					var deliveryorder_id = '';
            // 					search.create({
            // 						type: 'customrecord_wms_deliveryorders',
            // 						filters: [
            // 							{ name: 'custrecord_mcf_record_id', operator: 'is', values: fulfillment_id },
            // 						],
            // 					}).run().each(function (result){
            // 						deliveryorder_id = result.id;
            // 						log.debug("deliveryorder_id",deliveryorder_id);
            // 					});
            // 					if(deliveryorder_id){
            // 						var full_order_rec = record.load({ type: 'customrecord_wms_deliveryorders', id: deliveryorder_id });
            // 						log.debug("full_order_rec",full_order_rec);
            // 						full_order_rec.setValue({ fieldId: 'custrecord_deliveryorders_resolved', value: true });
            // 						full_order_rec.setValue({ fieldId: 'custrecord_upload_tracking_info', value: "Upload Tracking Number Successful" });
            // 						var full_order_rec_id = full_order_rec.save();
            // 						log.debug("full_order_rec_id",full_order_rec_id);
            // 					}
            // 				}

            // 			}

            // 		}
            // 	}
            // }



        }


    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});