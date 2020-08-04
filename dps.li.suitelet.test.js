/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-08-03 19:12:49
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.suitelet.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/log', './douples_amazon/Helper/core.min', 'N/file',
    'N/xml', './Rantion/Helper/tool.li', 'N/runtime', 'N/file', "N/ui/serverWidget"
], function (search, record, log, core, file, xml, tool, runtime, file, serverWidget) {


    function onRequest(context) {
        try {

            var userObj = runtime.getCurrentUser();

            log.debug('userObj', userObj);
            if (userObj.role == 3 && userObj.id != 911) {
                var request = context.request;
                var response = context.response;
                var parameters = request.parameters;
                var account = parameters.custpage_dps_account;
                var shipment = parameters.custpage_dps_shipment;
                var print = parameters.print;

                var form = serverWidget.createForm({
                    title: '查询shipment'
                });

                form.addFieldGroup({
                    id: 'search_groupid',
                    label: '查询条件'
                });

                form.addFieldGroup({
                    id: 'result_groupid',
                    label: '结果信息'
                });
                if (account && shipment) {


                    var auth = core.amazon.getAuthByAccountId(account);

                    var s = core.amazon.listInboundShipments(auth, "", [shipment])

                    log.debug('s', s)
                    var item = core.amazon.listInboundShipmentsItems(auth, shipment, "");
                    log.debug('item', item);


                    var sublist = form.addSublist({
                        id: 'sublistid',
                        type: serverWidget.SublistType.LIST,
                        label: 'Shipment信息'
                    });

                    var da = sublist.addField({
                        id: 'custpage_shipment_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment id'
                    });
                    var da = sublist.addField({
                        id: 'custpage_shipment_name',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment name'
                    });
                    var da = sublist.addField({
                        id: 'custpage_center_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'center id'
                    });
                    var da = sublist.addField({
                        id: 'custpage_label_prep_type',
                        type: serverWidget.FieldType.TEXT,
                        label: 'label prep type'
                    });
                    var da = sublist.addField({
                        id: 'custpage_shipment_status',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment status'
                    });
                    var da = sublist.addField({
                        id: 'custpage_are_cases_required',
                        type: serverWidget.FieldType.TEXT,
                        label: 'are cases required'
                    });
                    var da = sublist.addField({
                        id: 'custpage_box_contents_source',
                        type: serverWidget.FieldType.TEXT,
                        label: 'box contents source'
                    });

                    var line = form.getSublist({
                        id: 'sublistid'
                    });
                    for (var i_s = 0, i_len = s.length; i_s < i_len; i_s++) {
                        line.setSublistValue({
                            id: 'custpage_shipment_id',
                            value: s[i_s].shipment_id,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_shipment_name',
                            value: s[i_s].shipment_name,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_center_id',
                            value: s[i_s].center_id,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_label_prep_type',
                            value: s[i_s].label_prep_type,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_shipment_status',
                            value: s[i_s].shipment_status,
                            line: i_s
                        });
                        line.setSublistValue({
                            id: 'custpage_are_cases_required',
                            value: s[i_s].are_cases_required,
                            line: i_s
                        });
                        if (s[i_s].box_contents_source) {
                            line.setSublistValue({
                                id: 'custpage_box_contents_source',
                                value: s[i_s].box_contents_source,
                                line: i_s
                            });
                        }
                    }

                    var sublist_item = form.addSublist({
                        id: 'sublistid_ship_item',
                        type: serverWidget.SublistType.LIST,
                        label: 'Shipment 货品'
                    });

                    var da = sublist_item.addField({
                        id: 'custpage_item_shipment_id',
                        type: serverWidget.FieldType.TEXT,
                        label: 'shipment id'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_seller_sku',
                        type: serverWidget.FieldType.TEXT,
                        label: 'seller sku'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_shipped',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity shipped'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_in_case',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity in case'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_quantity_received',
                        type: serverWidget.FieldType.TEXT,
                        label: 'quantity received'
                    });
                    var da = sublist_item.addField({
                        id: 'custpage_item_fulfillment_network_sku',
                        type: serverWidget.FieldType.TEXT,
                        label: 'fulfillment network sku'
                    });


                    var line_item = form.getSublist({
                        id: 'sublistid_ship_item'
                    });
                    for (var it_i = 0, it_len = item.length; it_i < it_len; it_i++) {
                        line_item.setSublistValue({
                            id: 'custpage_item_shipment_id',
                            value: item[it_i].shipment_id,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_seller_sku',
                            value: item[it_i].seller_sku,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_shipped',
                            value: item[it_i].quantity_shipped,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_in_case',
                            value: item[it_i].quantity_in_case,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_quantity_received',
                            value: item[it_i].quantity_received,
                            line: it_i
                        });
                        line_item.setSublistValue({
                            id: 'custpage_item_fulfillment_network_sku',
                            value: item[it_i].fulfillment_network_sku,
                            line: it_i
                        });
                    }

                }


                form.addSubmitButton({
                    label: '查询',
                });

                var s_account = form.addField({
                    id: 'custpage_dps_account',
                    type: serverWidget.FieldType.SELECT,
                    source: 'customrecord_aio_account',
                    label: '店铺',
                    container: 'search_groupid'
                });
                s_account.defaultValue = account;

                var ship = form.addField({
                    id: 'custpage_dps_shipment',
                    type: serverWidget.FieldType.TEXT,
                    label: 'ShipmentId',
                    container: 'search_groupid'
                });
                ship.defaultValue = shipment;





                context.response.writePage({
                    pageObject: form
                });

            } else if (userObj.id == 911 /* || userObj.id == 13440 */ ) {



                return;
                var retObj = {
                    "detailList": [{
                        "detailRecordList": [{
                            "barcode": "GX012A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 80,
                            "sku": "GX012A",
                            "type": 2
                        }],
                        "planQty": 80,
                        "receivedQty": 80,
                        "shelvesQty": 80,
                        "sku": "GX012A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX012AX2",
                            "positionCode": "HD1A01",
                            "shelvesQty": 80,
                            "sku": "GX012AX2",
                            "type": 2
                        }],
                        "planQty": 80,
                        "receivedQty": 80,
                        "shelvesQty": 80,
                        "sku": "GX012AX2",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX012B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 80,
                            "sku": "GX012B",
                            "type": 2
                        }],
                        "planQty": 80,
                        "receivedQty": 80,
                        "shelvesQty": 80,
                        "sku": "GX012B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX012BX2",
                            "positionCode": "HD1A01",
                            "shelvesQty": 80,
                            "sku": "GX012BX2",
                            "type": 2
                        }],
                        "planQty": 80,
                        "receivedQty": 80,
                        "shelvesQty": 80,
                        "sku": "GX012BX2",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX013B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 210,
                            "sku": "GX013B",
                            "type": 2
                        }],
                        "planQty": 210,
                        "receivedQty": 210,
                        "shelvesQty": 210,
                        "sku": "GX013B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX019A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 180,
                            "sku": "GX019A",
                            "type": 2
                        }],
                        "planQty": 180,
                        "receivedQty": 180,
                        "shelvesQty": 180,
                        "sku": "GX019A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX019C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 40,
                            "sku": "GX019C",
                            "type": 2
                        }],
                        "planQty": 40,
                        "receivedQty": 40,
                        "shelvesQty": 40,
                        "sku": "GX019C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX019D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "GX019D",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "GX019D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX047E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 5,
                            "sku": "GX047E",
                            "type": 2
                        }],
                        "planQty": 5,
                        "receivedQty": 5,
                        "shelvesQty": 5,
                        "sku": "GX047E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 190,
                            "sku": "GX059A",
                            "type": 2
                        }],
                        "planQty": 190,
                        "receivedQty": 190,
                        "shelvesQty": 190,
                        "sku": "GX059A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 170,
                            "sku": "GX059B",
                            "type": 2
                        }],
                        "planQty": 170,
                        "receivedQty": 170,
                        "shelvesQty": 170,
                        "sku": "GX059B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 240,
                            "sku": "GX059D",
                            "type": 2
                        }],
                        "planQty": 240,
                        "receivedQty": 240,
                        "shelvesQty": 240,
                        "sku": "GX059D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 190,
                            "sku": "GX059E",
                            "type": 2
                        }],
                        "planQty": 190,
                        "receivedQty": 190,
                        "shelvesQty": 190,
                        "sku": "GX059E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059F",
                            "positionCode": "HD1A01",
                            "shelvesQty": 50,
                            "sku": "GX059F",
                            "type": 2
                        }],
                        "planQty": 50,
                        "receivedQty": 50,
                        "shelvesQty": 50,
                        "sku": "GX059F",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX059G",
                            "positionCode": "HD1A01",
                            "shelvesQty": 80,
                            "sku": "GX059G",
                            "type": 2
                        }],
                        "planQty": 80,
                        "receivedQty": 80,
                        "shelvesQty": 80,
                        "sku": "GX059G",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX083G",
                            "positionCode": "HD1A01",
                            "shelvesQty": 100,
                            "sku": "GX083G",
                            "type": 2
                        }],
                        "planQty": 100,
                        "receivedQty": 100,
                        "shelvesQty": 100,
                        "sku": "GX083G",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX083H",
                            "positionCode": "HD1A01",
                            "shelvesQty": 60,
                            "sku": "GX083H",
                            "type": 2
                        }],
                        "planQty": 60,
                        "receivedQty": 60,
                        "shelvesQty": 60,
                        "sku": "GX083H",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 395,
                            "sku": "GX087B",
                            "type": 2
                        }],
                        "planQty": 395,
                        "receivedQty": 395,
                        "shelvesQty": 395,
                        "sku": "GX087B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 19,
                            "sku": "GX087C",
                            "type": 2
                        }],
                        "planQty": 19,
                        "receivedQty": 19,
                        "shelvesQty": 19,
                        "sku": "GX087C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 322,
                            "sku": "GX087D",
                            "type": 2
                        }],
                        "planQty": 322,
                        "receivedQty": 322,
                        "shelvesQty": 322,
                        "sku": "GX087D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 66,
                            "sku": "GX087E",
                            "type": 2
                        }],
                        "planQty": 66,
                        "receivedQty": 66,
                        "shelvesQty": 66,
                        "sku": "GX087E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087L",
                            "positionCode": "HD1A01",
                            "shelvesQty": 22,
                            "sku": "GX087L",
                            "type": 2
                        }],
                        "planQty": 22,
                        "receivedQty": 22,
                        "shelvesQty": 22,
                        "sku": "GX087L",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087M",
                            "positionCode": "HD1A01",
                            "shelvesQty": 115,
                            "sku": "GX087M",
                            "type": 2
                        }],
                        "planQty": 115,
                        "receivedQty": 115,
                        "shelvesQty": 115,
                        "sku": "GX087M",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX087O",
                            "positionCode": "HD1A01",
                            "shelvesQty": 299,
                            "sku": "GX087O",
                            "type": 2
                        }],
                        "planQty": 299,
                        "receivedQty": 299,
                        "shelvesQty": 299,
                        "sku": "GX087O",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX088A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 330,
                            "sku": "GX088A",
                            "type": 2
                        }],
                        "planQty": 330,
                        "receivedQty": 330,
                        "shelvesQty": 330,
                        "sku": "GX088A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX089A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 10,
                            "sku": "GX089A",
                            "type": 2
                        }],
                        "planQty": 10,
                        "receivedQty": 10,
                        "shelvesQty": 10,
                        "sku": "GX089A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX089B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "GX089B",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "GX089B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX090B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 125,
                            "sku": "GX090B",
                            "type": 2
                        }],
                        "planQty": 125,
                        "receivedQty": 125,
                        "shelvesQty": 125,
                        "sku": "GX090B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX093D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 220,
                            "sku": "GX093D",
                            "type": 2
                        }],
                        "planQty": 220,
                        "receivedQty": 220,
                        "shelvesQty": 220,
                        "sku": "GX093D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX093F",
                            "positionCode": "HD1A01",
                            "shelvesQty": 55,
                            "sku": "GX093F",
                            "type": 2
                        }],
                        "planQty": 55,
                        "receivedQty": 55,
                        "shelvesQty": 55,
                        "sku": "GX093F",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX094A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 190,
                            "sku": "GX094A",
                            "type": 2
                        }],
                        "planQty": 190,
                        "receivedQty": 190,
                        "shelvesQty": 190,
                        "sku": "GX094A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX094B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 160,
                            "sku": "GX094B",
                            "type": 2
                        }],
                        "planQty": 160,
                        "receivedQty": 160,
                        "shelvesQty": 160,
                        "sku": "GX094B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX095A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 375,
                            "sku": "GX095A",
                            "type": 2
                        }],
                        "planQty": 375,
                        "receivedQty": 375,
                        "shelvesQty": 375,
                        "sku": "GX095A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX095B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 170,
                            "sku": "GX095B",
                            "type": 2
                        }],
                        "planQty": 170,
                        "receivedQty": 170,
                        "shelvesQty": 170,
                        "sku": "GX095B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX095D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 5,
                            "sku": "GX095D",
                            "type": 2
                        }],
                        "planQty": 5,
                        "receivedQty": 5,
                        "shelvesQty": 5,
                        "sku": "GX095D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX095E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 275,
                            "sku": "GX095E",
                            "type": 2
                        }],
                        "planQty": 275,
                        "receivedQty": 275,
                        "shelvesQty": 275,
                        "sku": "GX095E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX096A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 530,
                            "sku": "GX096A",
                            "type": 2
                        }],
                        "planQty": 530,
                        "receivedQty": 530,
                        "shelvesQty": 530,
                        "sku": "GX096A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX096B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 155,
                            "sku": "GX096B",
                            "type": 2
                        }],
                        "planQty": 155,
                        "receivedQty": 155,
                        "shelvesQty": 155,
                        "sku": "GX096B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX096C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 5,
                            "sku": "GX096C",
                            "type": 2
                        }],
                        "planQty": 5,
                        "receivedQty": 5,
                        "shelvesQty": 5,
                        "sku": "GX096C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX096D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 5,
                            "sku": "GX096D",
                            "type": 2
                        }],
                        "planQty": 5,
                        "receivedQty": 5,
                        "shelvesQty": 5,
                        "sku": "GX096D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX096E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 5,
                            "sku": "GX096E",
                            "type": 2
                        }],
                        "planQty": 5,
                        "receivedQty": 5,
                        "shelvesQty": 5,
                        "sku": "GX096E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX105A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "GX105A",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "GX105A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX105C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 50,
                            "sku": "GX105C",
                            "type": 2
                        }],
                        "planQty": 50,
                        "receivedQty": 50,
                        "shelvesQty": 50,
                        "sku": "GX105C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX105D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "GX105D",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "GX105D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX108C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 200,
                            "sku": "GX108C",
                            "type": 2
                        }],
                        "planQty": 200,
                        "receivedQty": 200,
                        "shelvesQty": 200,
                        "sku": "GX108C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX108D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 100,
                            "sku": "GX108D",
                            "type": 2
                        }],
                        "planQty": 100,
                        "receivedQty": 100,
                        "shelvesQty": 100,
                        "sku": "GX108D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX108E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 250,
                            "sku": "GX108E",
                            "type": 2
                        }],
                        "planQty": 250,
                        "receivedQty": 250,
                        "shelvesQty": 250,
                        "sku": "GX108E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX112A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 39,
                            "sku": "GX112A",
                            "type": 2
                        }],
                        "planQty": 39,
                        "receivedQty": 39,
                        "shelvesQty": 39,
                        "sku": "GX112A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX112C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 76,
                            "sku": "GX112C",
                            "type": 2
                        }],
                        "planQty": 76,
                        "receivedQty": 76,
                        "shelvesQty": 76,
                        "sku": "GX112C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX112D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 89,
                            "sku": "GX112D",
                            "type": 2
                        }],
                        "planQty": 89,
                        "receivedQty": 89,
                        "shelvesQty": 89,
                        "sku": "GX112D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX113A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 300,
                            "sku": "GX113A",
                            "type": 2
                        }],
                        "planQty": 300,
                        "receivedQty": 300,
                        "shelvesQty": 300,
                        "sku": "GX113A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX113D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 220,
                            "sku": "GX113D",
                            "type": 2
                        }],
                        "planQty": 220,
                        "receivedQty": 220,
                        "shelvesQty": 220,
                        "sku": "GX113D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX115L",
                            "positionCode": "HD1A01",
                            "shelvesQty": 170,
                            "sku": "GX115L",
                            "type": 2
                        }],
                        "planQty": 170,
                        "receivedQty": 170,
                        "shelvesQty": 170,
                        "sku": "GX115L",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX116K",
                            "positionCode": "HD1A01",
                            "shelvesQty": 105,
                            "sku": "GX116K",
                            "type": 2
                        }],
                        "planQty": 105,
                        "receivedQty": 105,
                        "shelvesQty": 105,
                        "sku": "GX116K",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX116L",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "GX116L",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "GX116L",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GX116M",
                            "positionCode": "HD1A01",
                            "shelvesQty": 210,
                            "sku": "GX116M",
                            "type": 2
                        }],
                        "planQty": 210,
                        "receivedQty": 210,
                        "shelvesQty": 210,
                        "sku": "GX116M",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0124A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 137,
                            "sku": "GXGN0124A",
                            "type": 2
                        }],
                        "planQty": 137,
                        "receivedQty": 137,
                        "shelvesQty": 137,
                        "sku": "GXGN0124A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0124B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 38,
                            "sku": "GXGN0124B",
                            "type": 2
                        }],
                        "planQty": 38,
                        "receivedQty": 38,
                        "shelvesQty": 38,
                        "sku": "GXGN0124B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0124C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 96,
                            "sku": "GXGN0124C",
                            "type": 2
                        }],
                        "planQty": 96,
                        "receivedQty": 96,
                        "shelvesQty": 96,
                        "sku": "GXGN0124C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0124D",
                            "positionCode": "HD1A01",
                            "shelvesQty": 87,
                            "sku": "GXGN0124D",
                            "type": 2
                        }],
                        "planQty": 87,
                        "receivedQty": 87,
                        "shelvesQty": 87,
                        "sku": "GXGN0124D",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0124E",
                            "positionCode": "HD1A01",
                            "shelvesQty": 66,
                            "sku": "GXGN0124E",
                            "type": 2
                        }],
                        "planQty": 66,
                        "receivedQty": 66,
                        "shelvesQty": 66,
                        "sku": "GXGN0124E",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0125A",
                            "positionCode": "HD1A01",
                            "shelvesQty": 110,
                            "sku": "GXGN0125A",
                            "type": 2
                        }],
                        "planQty": 110,
                        "receivedQty": 110,
                        "shelvesQty": 110,
                        "sku": "GXGN0125A",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0125B",
                            "positionCode": "HD1A01",
                            "shelvesQty": 99,
                            "sku": "GXGN0125B",
                            "type": 2
                        }],
                        "planQty": 99,
                        "receivedQty": 99,
                        "shelvesQty": 99,
                        "sku": "GXGN0125B",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "GXGN0125C",
                            "positionCode": "HD1A01",
                            "shelvesQty": 99,
                            "sku": "GXGN0125C",
                            "type": 2
                        }],
                        "planQty": 99,
                        "receivedQty": 99,
                        "shelvesQty": 99,
                        "sku": "GXGN0125C",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "HP1011",
                            "positionCode": "HD1A01",
                            "shelvesQty": 30,
                            "sku": "HP1011",
                            "type": 2
                        }],
                        "planQty": 30,
                        "receivedQty": 30,
                        "shelvesQty": 30,
                        "sku": "HP1011",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "HP1014",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "HP1014",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "HP1014",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "HP1105",
                            "positionCode": "HD1A01",
                            "shelvesQty": 10,
                            "sku": "HP1105",
                            "type": 2
                        }],
                        "planQty": 10,
                        "receivedQty": 10,
                        "shelvesQty": 10,
                        "sku": "HP1105",
                        "unqualifiedQty": 0
                    }, {
                        "detailRecordList": [{
                            "barcode": "HP1106",
                            "positionCode": "HD1A01",
                            "shelvesQty": 20,
                            "sku": "HP1106",
                            "type": 2
                        }],
                        "planQty": 20,
                        "receivedQty": 20,
                        "shelvesQty": 20,
                        "sku": "HP1106",
                        "unqualifiedQty": 0
                    }],
                    "remark": "",
                    "sourceNo": "LN202007310028",
                    "sourceType": 10
                }

                var a = new Date();


                log.error("开始时间：", a)
                context.response.writeLine("开始时间： " + a.toISOString());

                returnDelivery(retObj);

                var b = new Date();
                log.error("开始时间：", b)
                context.response.writeLine("结束时间 " + b.toISOString());


                return;
                search.create({
                    type: 'customrecord_dps_shipping_record_box',
                    filters: [{
                        name: 'custrecord_dps_ship_box_fa_record_link',
                        operator: 'anyof',
                        values: 46
                    }],
                }).run().each(function (rec) {
                    record.delete({
                        type: 'customrecord_dps_shipping_record_box',
                        id: rec.id
                    });
                    return true;
                });

                record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: 46,
                    values: {
                        custrecord_dps_box_return_flag: false
                    }
                });


            } else {
                context.response.writeLine('<html><head><meta charset="utf-8"></head><body><br><br><br><br><h1 style = "vertical-align:middle;text-align:center;color: red">权限不足</h1><p style = "vertical-align:middle;text-align:center;">无法运行此页面</p></body></html>')
            }


        } catch (error) {

            var b = new Date();
            log.error("开始时间：", b)
            context.response.writeLine("结束时间 " + b.toISOString());


            log.error('函数执行出错了', error);
        }
    }


    /**
     * 交货单入库回传
     * @param {Object} context 
     */
    function returnDelivery(context) {
        var ret = {};
        var sourceNo = context.sourceNo;
        var ret_id, wmsLocCode;
        search.create({
            type: 'customrecord_dps_delivery_order',
            filters: [{
                name: 'name',
                operator: 'is',
                values: sourceNo
            }],
            columns: [{
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dsp_delivery_order_location'
                }, // WMS仓库编码
            ]
        }).run().each(function (rec) {
            ret_id = rec.id;
            wmsLocCode = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dsp_delivery_order_location'
            })
        });


        // GC

        if (ret_id) {

            if (wmsLocCode == "GC") {

                var de_ord = [],
                    poNo, Loca,
                    limit = 3999;

                search.create({
                    type: 'customrecord_dps_delivery_order',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: ret_id
                    }],
                    columns: [{
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货货品
                        {
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        }, // 交货数量
                        "custrecord_dsp_delivery_order_location", // 地点
                        "custrecord_purchase_order_no", // 采购订单
                    ]
                }).run().each(function (r) {
                    poNo = r.getValue('custrecord_purchase_order_no');
                    Loca = r.getValue('custrecord_dsp_delivery_order_location');

                    var it = {
                        itemId: r.getValue({
                            name: 'custrecord_item_sku',
                            join: "custrecord_dps_delivery_order_id"
                        }),
                        qty: r.getValue({
                            name: 'custrecord_item_quantity',
                            join: "custrecord_dps_delivery_order_id"
                        })
                    }
                    de_ord.push(it);
                    return --limit > 0;
                });

                log.debug('地点', Loca);
                log.debug('采购订单', poNo);

                log.debug('de_ord', de_ord);
                if (poNo) {
                    var irObj = record.transform({
                        fromType: 'purchaseorder',
                        fromId: poNo,
                        toType: 'itemreceipt'
                    }); //转换为货品收据

                    var numLines = irObj.getLineCount({
                        sublistId: 'item'
                    });

                    for (var nu = 0; nu < numLines; nu++) {
                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: false,
                            line: nu
                        });
                    }


                    var irObj_id;
                    for (var i = 0, iLen = de_ord.length; i < iLen; i++) {
                        var temp = de_ord[i];
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: temp.itemId
                        });

                        log.debug('lineNumber', lineNumber);

                        if (lineNumber > -1) {
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'quantity',
                                value: temp.qty,
                                line: lineNumber
                            });
                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                value: Loca,
                                line: lineNumber
                            });

                            irObj.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'itemreceive',
                                value: true,
                                line: lineNumber
                            });


                            var lo = irObj.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'location',
                                // value: Loca,
                                line: lineNumber
                            });

                            log.debug('货品行地点', lo)

                        }
                    }

                    var irObj_id = irObj.save();

                    // 更改发运记录状态
                    record.submitFields({
                        type: 'customrecord_dps_delivery_order',
                        id: ret_id,
                        values: {
                            custrecord_delivery_order_status: 4
                        }
                    });
                    log.debug('工厂直发生成货品收据', irObj_id);

                    ret.code = 0;
                    ret.data = null;
                    ret.msg = 'NS 收货成功';
                    return ret;
                } else {

                    log.debug('交货单不存在对应的采购订单', "数据异常");
                    ret.code = 3;
                    ret.data = null;
                    ret.msg = 'unknown';
                    return ret;
                }

            } else {

                var detailList = context.detailList; // 入库明细
                log.debug('detailList', detailList);
                if (!detailList) {
                    log.debug('数据异常', "数据异常");
                    ret.code = 7;
                    ret.data = null;
                    ret.msg = '传入的数据异常';
                    return ret;
                }

                var getBinArr = tool.getAllBinBox(detailList);
                var getArr = tool.judgmentBinBox('create', getBinArr); // 获取对应的库位, 箱号(若不存在,新建)

                if (getArr && getArr.length > 0) { // 出货的库位不存在, 返回报错信息
                    retjson.code = 3;
                    retjson.data = null;
                    retjson.msg = 'unknown: ' + getArr;
                    log.debug('不存在库位 : ', retjson);
                    return retjson;
                }

                log.debug('开始加载 交货单记录', "load")
                var objRecord = record.load({
                    type: 'customrecord_dps_delivery_order',
                    id: ret_id
                });

                objRecord.setValue({
                    fieldId: 'custrecord_delivery_order_status',
                    value: 4
                });

                objRecord.setValue({
                    fieldId: 'custrecord_dps_warehousing_end',
                    value: true
                });

                var count = objRecord.getLineCount({
                    sublistId: 'recmachcustrecord_dps_delivery_order_id'
                });
                log.debug('开始修改交货单', '货品行上的值');
                if (context.detailList.length > 0) {
                    context.detailList.map(function (line) {
                        for (var i = 0; i < count; i++) {
                            var item_sku = objRecord.getSublistText({
                                sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                fieldId: 'custrecord_item_sku',
                                line: i
                            });
                            if (line.sku == item_sku) {
                                objRecord.setSublistValue({
                                    sublistId: 'recmachcustrecord_dps_delivery_order_id',
                                    fieldId: 'custrecord_stock_quantity',
                                    value: line.shelvesQty,
                                    line: i
                                })
                            }
                        }
                    });
                }

                var devLocation = objRecord.getValue('custrecord_dsp_delivery_order_location'); // 获取交货单的地点
                var poId = objRecord.getValue('custrecord_purchase_order_no'); // 关联的采购订单
                log.debug('履行采购订单', 'Starts');
                var receipt_id = createItemReceipt(poId, context.detailList, devLocation);
                log.debug('履行采购订单', 'End');
                if (receipt_id && receipt_id.length > 0) { // 存在货品收据

                    // var objRecord_id = objRecord.save();

                    log.debug('更新交货单成功 objRecord_id', objRecord_id);

                    log.debug('NS 处理成功', "NS 处理成功");
                    ret.code = 0;
                    ret.data = null;
                    ret.msg = 'NS 处理成功';
                    return ret;
                } else {
                    log.debug('NS 处理异常', "NS 处理异常");
                    ret.code = 6;
                    ret.data = null;
                    ret.msg = 'NS 处理异常';
                    return ret;
                }
            }

        } else {
            log.debug('未知单号', sourceNo)
            ret.code = 3;
            ret.data = null;
            ret.msg = 'unknown: ' + sourceNo;
        }
        return ret;
    }


    function createItemReceipt(po_id, itemList, location) {

        log.audit('交货单地点', location);
        log.debug('开始生成货品收据: ' + po_id, JSON.stringify(itemList));

        var cLimit = 3999,
            fItemArr = [];
        var fiObj = {};
        search.create({
            type: 'purchaseorder',
            filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [po_id]
                },
                {
                    name: 'mainline',
                    operator: 'is',
                    values: false
                },
                {
                    name: 'taxline',
                    operator: 'is',
                    values: false
                }
            ],
            columns: [
                "item",
                "quantity"
            ]
        }).run().each(function (rec) {
            var it = {
                itemId: rec.getValue('item'),
                itemName: rec.getText('item')
            }
            fiObj[rec.getText('item')] = rec.getValue('item')
            fItemArr.push(it)
            return --cLimit > 0;
        })

        log.audit('采购订单的货品', fItemArr);

        var irArr = [];
        var getABox = tool.getAllBinBox(itemList);
        log.debug('库位 箱号 ', getABox);
        var binBoxObj = tool.SummaryBinBox(getABox);

        log.debug('库位箱号分组 ', binBoxObj);

        var boxObj = binBoxObj.BoxObj,
            binObj = binBoxObj.BinObj

        var BoxObjKey = Object.keys(boxObj);
        log.debug('箱号的值', BoxObjKey);
        var BinObjKey = Object.keys(binObj);
        log.debug('库位的值', BinObjKey);

        log.debug('库位 BinObjKey', BinObjKey);
        log.debug('箱号 BoxObjKey', BoxObjKey);

        if (BoxObjKey && BoxObjKey.length > 0) {

            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 每个箱号履行

                var boxKey = BoxObjKey[i];
                var temp_obj = boxObj[boxKey];
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[i];

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: dl_sku.shelvesQty,
                            line: lineNumber
                        }); // 设置数量

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: dl_sku.positionCode,
                            line: lineNumber
                        }); // 仓库编号

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_case_number',
                            text: boxKey,
                            line: lineNumber
                        }); // 箱号

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: true,
                            line: lineNumber
                        }); // 设置为收货
                        // }
                    }
                }

            }
            var irObj_id = irObj.save();

            irArr.push(irObj_id);

            log.debug("货品收据 irObj_id", irObj_id);
        }

        if (BinObjKey && BinObjKey.length > 0) {
            var irObj = record.transform({
                fromType: 'purchaseorder',
                fromId: po_id,
                toType: 'itemreceipt',
            }); //转换为货品收据

            var numLines = irObj.getLineCount({
                sublistId: 'item'
            });

            for (var nu = 0; nu < numLines; nu++) { // 先全部设置不收货
                irObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'itemreceive',
                    value: false,
                    line: nu
                });
            }

            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 每个库位履行

                var binKey = BinObjKey[i];
                var temp_obj = binObj[binKey];

                log.debug('temp_obj', temp_obj);
                for (var j = 0, jLen = temp_obj.length; j < jLen; j++) {

                    var dl_sku = temp_obj[j];

                    // log.debug('dl_sku: ' + j, dl_sku)

                    if (fiObj[dl_sku.sku]) {
                        var lineNumber = irObj.findSublistLineWithValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            value: fiObj[dl_sku.sku]
                        });

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'location',
                            value: location,
                            line: lineNumber
                        }); // 设置地点

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            value: dl_sku.shelvesQty,
                            line: lineNumber
                        }); // 设置数量

                        irObj.setSublistText({
                            sublistId: 'item',
                            fieldId: 'custcol_location_bin',
                            text: dl_sku.positionCode,
                            line: lineNumber
                        }); // 仓库编号

                        irObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemreceive',
                            value: true,
                            line: lineNumber
                        }); // 设置为收货

                    }
                }
            }
            var irObj_id = irObj.save();
            irArr.push(irObj_id);
            log.debug("货品收据 irObj_id", irObj_id);
        }

        return irArr || false;
    }


    function toWMS() {
        var context = {};
        context.recordID = 737;
        var tranOrder;
        var data = {};
        var tranType, fbaAccount;
        var ful_to_link;
        search.create({
            type: 'customrecord_dps_shipping_record',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [
                'custrecord_dps_ship_record_tranor_type', // 调拨单类型
                'custrecord_dps_shipping_rec_transport',
                'custrecord_dps_shipping_rec_order_num',
                // 'owner',
                'custrecord_dps_shipping_rec_currency',
                'custrecord_dps_declared_value_dh',
                'custrecord_dps_shipping_rec_account',
                'custrecord_dps_shipping_r_channelservice',
                'custrecord_dps_shipping_r_channel_dealer',
                'custrecord_dps_shipping_rec_shipments',
                'custrecord_dps_shipping_rec_location',
                'custrecord_dps_shipping_rec_to_location',
                'custrecord_dps_shipping_rec_transa_subje',
                'custrecord_dps_shipping_rec_logistics_no',
                'custrecord_dps_f_b_purpose', // 用途
                'custrecord_dps_declare_currency_dh', // 申报币种
                'custrecord_dps_shipping_rec_shipmentsid', // shipmentId

                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_location'
                }, // 仓库名称
                {
                    name: 'custrecord_dps_wms_location',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库编号
                {
                    name: 'custrecord_dps_wms_location_name',
                    join: 'custrecord_dps_shipping_rec_to_location'
                }, // 目标仓库名称
                {
                    name: 'custrecord_ls_service_code',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 渠道服务代码

                {
                    name: 'custrecord_ls_bubble_count',
                    join: 'custrecord_dps_shipping_r_channelservice'
                }, // 计泡基数
                // {
                //     name: "entityid",
                //     join: "owner"
                // }, // 拥有者

                {
                    name: 'custrecord_aio_marketplace',
                    join: 'custrecord_dps_shipping_rec_account'
                }, // 站点 / 市场

                "custrecord_dps_shipping_rec_destinationf", // 仓库中心
                "custrecord_dps_ship_remark", // 备注

                {
                    name: "tranid",
                    join: "custrecord_dps_shipping_rec_order_num"
                }, // 调拨单号
                "custrecord_dps_to_shipment_name", // shipment name 
                "custrecord_dps_to_reference_id", // reference id
            ]
        }).run().each(function (rec) {

            tranOrder = rec.getValue('custrecord_dps_shipping_rec_order_num')

            ful_to_link = rec.getValue('custrecord_dps_shipping_rec_order_num'); // 调拨单号
            var rec_transport = rec.getValue('custrecord_dps_shipping_rec_transport');

            var shippingType;
            // shippingType(integer): 运输方式：10 空运，20 海运，30 快船，40 铁路
            // 1	空运   2	海运   3	铁路    4   快船
            if (rec_transport == 1) {
                shippingType = 10;
            } else if (rec_transport == 4) {
                shippingType = 30;
            } else if (rec_transport == 2) {
                shippingType = 20;
            } else if (rec_transport == 3) {
                shippingType = 40
            }

            data["remark"] = rec.getValue('custrecord_dps_ship_remark') ? rec.getValue('custrecord_dps_ship_remark') : ''; // 备注字段

            data["referenceId"] = rec.getValue("custrecord_dps_to_reference_id");
            data["shipmentName"] = rec.getValue("custrecord_dps_to_shipment_name"); // shipment name

            data["shippingType"] = shippingType;
            data["aono"] = rec.getValue({
                name: "tranid",
                join: "custrecord_dps_shipping_rec_order_num"
            });

            // data["createBy"] = rec.getValue({
            //     name: "entityid",
            //     join: "owner"
            // });

            data["marketplaces"] = rec.getText({
                name: 'custrecord_aio_marketplace',
                join: 'custrecord_dps_shipping_rec_account'
            });
            data["declareCurrency"] = rec.getText('custrecord_dps_declare_currency_dh');

            data["declarePrice"] = Number(rec.getValue('custrecord_dps_declared_value_dh'));
            fbaAccount = rec.getValue('custrecord_dps_shipping_rec_account');
            data["fbaAccount"] = rec.getText('custrecord_dps_shipping_rec_account');

            data["countBubbleBase"] = Number(rec.getValue({
                name: 'custrecord_ls_bubble_count',
                join: 'custrecord_dps_shipping_r_channelservice'
            }));
            data["logisticsChannelCode"] = rec.getValue('custrecord_dps_shipping_r_channelservice');
            data["logisticsChannelName"] = rec.getText('custrecord_dps_shipping_r_channelservice');
            data["logisticsLabelPath"] = 'logisticsLabelPath';

            data["logisticsProviderCode"] = rec.getValue('custrecord_dps_shipping_r_channel_dealer'); // 渠道商

            // data["logisticsProviderCode"] = rec.getValue({
            //     name: 'custrecord_ls_service_code',
            //     join: 'custrecord_dps_shipping_r_channelservice'
            // });

            var channel_dealer = rec.getValue('custrecord_dps_shipping_r_channel_dealer');
            var channel_dealerText = rec.getText('custrecord_dps_shipping_r_channel_dealer');

            var logiFlag = 1;
            if (channel_dealer == 6 || channel_dealerText == "Amazon龙舟") {
                logiFlag = 0;
            }

            // logisticsFlag (integer): 是否需要物流面单 0:否 1:是 
            // FIXME 需要判断物流渠道是否存在面单文件, 
            data["logisticsFlag"] = logiFlag;


            data["logisticsProviderName"] = rec.getText('custrecord_dps_shipping_r_channel_dealer'); // 渠道商名称

            data["sourceWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_location'
            });
            data["sourceWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_location'
            });

            data["targetWarehouseCode"] = rec.getValue({
                name: 'custrecord_dps_wms_location',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["targetWarehouseName"] = rec.getValue({
                name: 'custrecord_dps_wms_location_name',
                join: 'custrecord_dps_shipping_rec_to_location'
            });
            data["taxFlag"] = 1;
            data["tradeCompanyCode"] = rec.getValue('custrecord_dps_shipping_rec_transa_subje');

            var a = rec.getText('custrecord_dps_shipping_rec_transa_subje');
            var b = a.split(':');
            data["tradeCompanyName"] = b[b.length - 1];
            // data["tradeCompanyName"] = rec.getText('custrecord_dps_shipping_rec_transa_subje');

            var type1 = rec.getValue('custrecord_dps_ship_record_tranor_type');

            tranType = rec.getValue('custrecord_dps_ship_record_tranor_type');

            var type = 10;
            // 1 FBA调拨    2 自营仓调拨   3 跨仓调拨   4 移库

            var waybillNo;

            if (type1 == 1) {
                type = 20;
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipmentsid');
            } else {
                data["shipment"] = rec.getValue('custrecord_dps_shipping_rec_shipments');
                waybillNo = rec.getValue('custrecord_dps_shipping_rec_shipments');
            }

            data["centerId"] = rec.getValue('custrecord_dps_shipping_rec_destinationf') ? rec.getValue('custrecord_dps_shipping_rec_destinationf') : ''; // 仓库中心
            data["type"] = type;
            data["waybillNo"] = waybillNo; // 运单号
        });



        var createdBy, to_aono;
        search.create({
            type: 'transferorder',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: ful_to_link
            }],
            columns: [
                "createdby",
                // {
                //     name: "tranid",
                //     join: "custrecord_dps_shipping_rec_order_num"
                // }, // 调拨单号
            ]
        }).run().each(function (rec) {
            createdBy = rec.getText('createdby');
            // to_aono = rec.getValue({
            //     name: "tranid",
            //     join: "custrecord_dps_shipping_rec_order_num"
            // });
        });


        // data["aono"] = to_aono;

        data["createBy"] = createdBy; // 设置调拨单创建者

        var taxamount;
        var item_info = [];
        var subli_id = 'recmachcustrecord_dps_shipping_record_parentrec';
        // var numLines = af_rec.getLineCount({
        //     sublistId: subli_id
        // });


        var itemArr = [];
        search.create({
            type: 'customrecord_dps_shipping_record_item',
            filters: [{
                name: 'custrecord_dps_shipping_record_parentrec',
                operator: 'anyof',
                values: context.recordID
            }],
            columns: [{
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_msku'
                },
                {
                    name: 'custrecord_dps_f_b_purpose',
                    join: 'custrecord_dps_shipping_record_parentrec'
                },
                {
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                },
                {
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                },
                {
                    name: 'custrecord_dps_ship_record_sku_item'
                },
                {
                    name: 'custrecord_dps_ship_record_item_quantity'
                },

                {
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品重量(cm),
                {
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品高(cm),
                {
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品长(cm),
                {
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品宽(cm),
                {
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 品牌名称,
                {
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }, // 产品英文标题,

                {
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                },
                'custrecord_dps_shipping_record_item', // 货品

                // {
                //     name: 'taxamount',
                //     join: 'custrecord_dps_trans_order_link'
                // }

                {
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }, // 材质  material
                {
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }, // 物流分组 logisticsGroup
                {
                    name: "cost",
                    join: "custrecord_dps_shipping_record_item"
                }, // 采购成本  purchaseCost
                {
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }, // 英文标题/描述 englishTitle
            ]
        }).run().each(function (rec) {

            // AllocationDetailCreateRequestDto{
            //     asin(string): ASIN,
            //     brandName(string): 品牌名称,
            //     englishTitle(string): 产品英文标题,
            //     fnsku(string): FNSKU,
            //     msku(string): MSKU,
            //     productCode(string, optional): 产品编号,
            //     productHeight(number): 产品高(cm),
            //     productImageUrl(string): 图片路径,
            //     productLength(number): 产品长(cm),
            //     productTitle(string): 产品标题,
            //     productWeight(number): 产品重量(g),
            //     productWidth(number): 产品宽(cm),
            //     purpose(string): 用途,
            //     qty(integer): 数量,
            //     sku(string): SKU,
            //   }

            itemArr.push(rec.getValue('custrecord_dps_shipping_record_item'));
            var purchaseCost = rec.getValue({
                name: "cost",
                join: "custrecord_dps_shipping_record_item"
            });
            var it = {
                englishTitle: rec.getValue({
                    name: "custitem_dps_skuenglish",
                    join: "custrecord_dps_shipping_record_item"
                }),
                purchaseCost: Number(purchaseCost),
                logisticsGroup: rec.getText({
                    name: "custitem_dps_group",
                    join: "custrecord_dps_shipping_record_item"
                }),
                material: rec.getText({
                    name: "custitem_dps_nature",
                    join: "custrecord_dps_shipping_record_item"
                }),
                itemId: rec.getValue('custrecord_dps_shipping_record_item'),
                purpose: rec.getValue({
                    name: 'custitem_dps_use',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                brandName: rec.getText({
                    name: 'custitem_dps_brand',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                asin: rec.getValue({
                    name: 'custitem_aio_asin',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                fnsku: rec.getValue({
                    join: 'custrecord_dps_shipping_record_item',
                    name: 'custitem_dps_fnsku'
                }),

                msku: rec.getValue("custrecord_dps_ship_record_sku_item"), //sellersku
                englishTitle: rec.getValue({
                    name: 'custitem_dps_declaration_us',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productImageUrl: rec.getValue({
                    name: 'custitem_dps_picture',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productTitle: rec.getValue({
                    name: 'custitem_dps_skuchiense',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                productHeight: Number(rec.getValue({
                    name: 'custitem_dps_high',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productLength: Number(rec.getValue({
                    name: 'custitem_dps_long',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                productWeight: Number(rec.getValue({
                    name: 'custitem_dps_heavy2',
                    join: 'custrecord_dps_shipping_record_item'
                })),
                productWidth: Number(rec.getValue({
                    name: 'custitem_dps_wide',
                    join: 'custrecord_dps_shipping_record_item'
                })),

                sku: rec.getValue({
                    name: 'itemid',
                    join: 'custrecord_dps_shipping_record_item'
                }),
                qty: Number(rec.getValue('custrecord_dps_ship_record_item_quantity'))
            };
            taxamount = rec.getValue({
                name: 'taxamount',
                join: 'custrecord_dps_trans_order_link'
            });
            item_info.push(it);

            return true;

        });

        log.debug('itemArr', itemArr);

        // 2020/7/18 13：44 改动 
        var fils = [],
            add_fils = []; //过滤
        var len = item_info.length,
            num = 0;
        var checkArr = [];
        item_info.map(function (ld) {
            num++;
            if (ld.msku) { // 存在 msku
                add_fils.push([
                    ["name", "is", ld.msku],
                    "and",
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            } else { // 不存在 msku
                add_fils.push([
                    ["custrecord_ass_sku", "anyof", ld.itemId]
                ]);
            }
            if (num < len)
                add_fils.push("or");
        });
        fils.push(add_fils);
        fils.push("and",
            ["custrecord_ass_account", "anyof", fbaAccount]
        );
        fils.push("and",
            ["isinactive", "is", false]
        );
        log.debug('fils', fils);
        log.debug('item_info', item_info);
        var newItemInfo = [];

        if (tranType == 1) {
            var new_limit = 3999;
            log.debug("fils:::::", fils)
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: fils,
                columns: [
                    "name", "custrecord_ass_fnsku", "custrecord_ass_asin", "custrecord_ass_sku",
                ]
            }).run().each(function (rec) {
                // log.debug("rec.id ::::::: ", rec.id)
                var it = rec.getValue('custrecord_ass_sku');
                item_info.forEach(function (item, key) {

                    // log.debug('item.itemId: ' + item.itemId, "it: " + it);

                    if (item.itemId == it) {
                        item.asin = rec.getValue("custrecord_ass_asin");
                        item.fnsku = rec.getValue("custrecord_ass_fnsku")
                        item.msku = rec.getValue('name');
                        newItemInfo.push(item);
                    }
                });
                return --new_limit > 0;
            });

            log.debug('newItemInfo', newItemInfo);

            if (newItemInfo && newItemInfo.length == 0) {

                message.code = 3;
                message.data = 'Amazon Seller SKU 中找不到对应的映射关系';
                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: JSON.stringify(message.data)
                    }
                });

                return message;
            }

            // 判断一下, 对应的货品在映射关系中是否存在, 若不存在直接返回, 不推送WMS
            var juArr = tool.judgmentFlag(context.recordID, newItemInfo);

            log.audit('存在差异数组', juArr);

            if (juArr.length > 0) {

                message.code = 3;
                message.data = juArr + ':  Amazon Seller SKU 中找不到对应的映射关系, 或者信息不全';

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: context.recordID,
                    values: {
                        custrecord_dps_shipping_rec_status: 8,
                        custrecord_dps_shipping_rec_wms_info: '推送调拨单： ' + JSON.stringify(message.data)
                    }
                });

                return message;
            }


            data['allocationDetailCreateRequestDtos'] = newItemInfo;
        } else {
            data['allocationDetailCreateRequestDtos'] = item_info;
        }

        log.audit('newItemInfo', newItemInfo);
        if (Number(taxamount) > 0) {
            data["taxFlag"] = 1;
        } else {
            data["taxFlag"] = 0;
        }
        // log.error('item_info', item_info);
        // data['allocationDetailCreateRequestDtos'] = newItemInfo;



        log.error('参数 data', data);
        // 发送请求

    }



    return {
        onRequest: onRequest
    }
});