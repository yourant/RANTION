/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-04-20 11:45:39
 * @LastEditTime   : 2020-05-16 15:52:05
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['./CryptoJS.min', '../Helper/config', 'N/search', 'N/record', 'N/xml', 'N/https', 'N/crypto',
    'N/file', 'N/encode', 'N/runtime'
], function (cryptoJS, config, search, record, xml, https, crypto, file, encode, runtime) {


    function _post(context) {
        log.debug('context', context);
        var result = {};
        try {

            if (context.type == 'Update_Inbound_Shipment') {
                result = core.updateInboundShipment(context.acc_id, context.recId, context.recType, context.shipmentId, shipment_status, context.order_contact);
                log.debug('result', result);
            } else if (context.type == 'SubmitFeed_Inbound') {
                result = core.submitCartonContent(context.acc_id, context.recId, context.recType, context.shipmentId);
                log.debug('result', result);
            } else if (context.type == 'Get_SubmitFeed_Inbound_Result') {
                result = core.getFeedSubmissionList(context.acc_id, context.submission_ids, context.recId, context.recType);
                log.debug('result', result);
            } else if (context.type == 'Get_Package_Labels') {
                result = core.GetPackageLabels(context.acc_id, context.shipmentId, context.recId, context.recType);
                log.debug('result', result);
                var fileObj = file.create({
                    name: 'GetPackageLabels' + context.shipmentId,
                    fileType: file.Type.PDF,
                    contents: result
                });
                fileObj.folder = config.fileFolder;
                fileObj.encoding = file.Encoding.MAC_ROMAN;
                var fileId = fileObj.save();
                var id = record.attach({
                    record: {
                        type: 'file',
                        id: fileId
                    },
                    to: {
                        type: context.recType,
                        id: context.recId
                    }
                });
                log.debug('id', id);
                log.debug('fileId', fileId);
            } else if (context.type == 'get_pallet_labels') {
                result = core.getPalletLabels(context.acc_id, context.shipmentId, context.recId, context.recType);
                log.debug('result', result);

                var fileObj = file.create({
                    name: 'getPalletLabels' + context.shipmentId,
                    fileType: file.Type.PDF,
                    contents: result
                });
                fileObj.folder = config.fileFolder;
                fileObj.encoding = file.Encoding.MAC_ROMAN;
                var fileId = fileObj.save();
                var id = record.attach({
                    record: {
                        type: 'file',
                        id: fileId
                    },
                    to: {
                        type: context.recType,
                        id: context.recId
                    }
                });
                log.debug('id', id);
                log.debug('fileId', fileId);
            }

        } catch (error) {
            result.status = 'error';
            result.message = e.message;
            return result;
        }

        return result;
    }

    var core = {

        getTextContentSafe: function (res, tag) {
            return res.getElementsByTagName({
                tagName: tag
            }).length ? res.getElementsByTagName({
                tagName: tag
            })[0].textContent : '';
            // return xml.XPath.select({ node: res, xpath: path }).length ? xml.XPath.select({ node: res, xpath: path })[0].textContent : '';
        },

        md5: function (body) {
            var md5 = crypto.createHash({
                algorithm: crypto.HashAlg.MD5
            });
            md5.update({
                input: body,
                inputEncoding: encode.Encoding.UTF_8
            });
            return md5.digest({
                outputEncoding: encode.Encoding.HEX
            });
        },

        getAddressById: function (address_id) {
            var address;
            search.create({
                type: 'customrecord_customer_contact',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: address_id
                }],
                columns: [{
                        name: 'name'
                    },
                    {
                        name: 'custrecord_cc_addr1'
                    },
                    {
                        name: 'custrecord_cc_addr2'
                    },
                    {
                        name: 'custrecord_cc_ctiy'
                    },
                    {
                        name: 'custrecord_cc_country'
                    },
                    {
                        name: 'custrecord_cc_state'
                    },
                    {
                        name: 'custrecord5'
                    },
                    {
                        name: 'custrecord_cc_zip'
                    }
                ]
            }).run().each(function (rec) {
                address = {
                    id: rec.id,
                    Name: rec.getValue(rec.columns[0]),
                    AddressLine1: rec.getValue(rec.columns[1]),
                    AddressLine2: rec.getValue(rec.columns[2]),
                    City: rec.getValue(rec.columns[3]),
                    DistrictOrCounty: rec.getValue(rec.columns[4]),
                    StateOrProvinceCode: rec.getValue(rec.columns[5]),
                    CountryCode: rec.getValue(rec.columns[6]),
                    PostalCode: rec.getValue(rec.columns[7])
                };
                return false;
            });
            return address || false;
        },

        getFeedSubmissionList: function (account_id, submission_ids, recId, recType) {
            var auth = core.getAuthByAccountId(account_id)
            var params = {
                'MaxCount': 100,
                'SubmittedFromDate': moment().subtract(moment.duration(1, 'month')).startOf('month').toISOString(),
                'SubmittedToDate': moment().toISOString(),
            };
            if (submission_ids) {
                // submission_ids.map(function (id, key) { params["FeedSubmissionIdList.Id." + (key + 1)] = id; });
                params["FeedSubmissionIdList.Id.1"] = submission_ids;
            }
            var content = core.mwsRequestMaker(auth, 'GetFeedSubmissionList', '2009-01-01', params, '/Feeds/2009-01-01/');
            var res = xml.Parser.fromString({
                text: content
            });
            var feeds = [];
            res.getElementsByTagName({
                tagName: 'FeedSubmissionInfo'
            }).map(function (info) {
                feeds.push({
                    feed_submission_id: core.getTextContentSafe(info, 'FeedSubmissionId'),
                    feed_type: core.getTextContentSafe(info, 'FeedType'),
                    submitted_date: core.getTextContentSafe(info, 'SubmittedDate'),
                    feed_processing_status: core.getTextContentSafe(info, 'FeedProcessingStatus'),
                    started_processing_date: core.getTextContentSafe(info, 'StartedProcessingDate'),
                    completed_processing_date: core.getTextContentSafe(info, 'CompletedProcessingDate'),
                });
            });
            feeds.map(function (feed) {
                search.create({
                    type: 'customrecord_aio_amazon_feed',
                    filters: [{
                            name: 'custrecord_aio_feed_account',
                            operator: search.Operator.ANYOF,
                            values: account_id
                        },
                        {
                            name: 'custrecord_aio_feed_submission_id',
                            operator: search.Operator.IS,
                            values: feed.feed_submission_id
                        },
                        {
                            name: 'custrecord_aio_feed_bg',
                            operator: search.Operator.ANYOF,
                            values: recId
                        }
                    ],
                    columns: [{
                        name: 'custrecord_aio_feed_response'
                    }]
                }).run().each(function (rec) {
                    var response = '';
                    if (feed.feed_processing_status == '_DONE_' && "" + rec.getValue(rec.columns[0]) == '') {
                        response = core.mwsRequestMaker(auth, 'GetFeedSubmissionResult', '2009-01-01', {
                            FeedSubmissionId: feed.feed_submission_id
                        }, '/Feeds/2009-01-01/');
                    }
                    record.submitFields({
                        type: 'customrecord_aio_amazon_feed',
                        id: rec.id,
                        values: {
                            'custrecord_aio_submitted_date': feed.submitted_date,
                            'custrecord_aio_feed_processing_status': feed.feed_processing_status,
                            'custrecord_aio_started_processing_date': feed.started_processing_date,
                            'custrecord_aio_completed_processing_date': feed.completed_processing_date,
                            'custrecord_aio_feed_response': response
                        }
                    });
                    record.submitFields({
                        type: recType,
                        id: recId,
                        values: {
                            'custrecord_bg_submitted_date': feed.submitted_date,
                            'custrecord_bg_feed_processing_status': feed.feed_processing_status,
                            'custrecord_bg_started_processing_date': feed.started_processing_date,
                            'custrecord_bg_completed_processing_date': feed.completed_processing_date,
                            'custrecord_bg_feed_response': response
                        }
                    });
                    return true;
                });
            });
            return feeds;
        },

        submitCartonContent: function (account_id, recId, recType, shipment_id) {
            var auth = core.getAuthByAccountId(account_id),
                bg_rec = record.load({
                    type: recType,
                    id: recId,
                    isDynamic: true
                });

            var result_data = {};
            if (auth) {
                var params = {},
                    carton_infos_1 = {};
                search.create({
                    type: 'customrecord_bulky_boxing_info',
                    filters: [{
                        name: 'custrecord_bulky_shipment_id',
                        join: 'custrecord_bulky_shipping_id',
                        operator: 'is',
                        values: shipment_id
                    }],
                    columns: [{
                            name: 'internalid',
                            sort: search.Sort.ASC
                        },
                        {
                            name: 'custrecord_bulky_box_details_sku'
                        },
                        {
                            name: 'custrecord_bulky_box_quantity'
                        },
                        {
                            name: 'custrecord_bulky_box_case_number'
                        },
                        {
                            name: 'custrecord_bulky_box_sku'
                        },
                    ]
                }).run().each(function (b) {
                    // var item_line_no = bg_rec.findSublistLineWithValue({ sublistId: 'recmachcustrecord_bulky_relative_shipping_rec', fieldId: 'custrecord_bulky_sku', value: b.getValue(b.columns[3]) });
                    // if (item_line_no == -1)
                    //     throw "\u6570\u636E\u975E\u6CD5\uFF0CITEM[" + b.getText(b.columns[0]) + "]\u5728\u521D\u59CB\u5355\u636E\u4E0A\u627E\u4E0D\u5230\uFF01";
                    // var boxinfo = {
                    //     sku: bg_rec.getSublistValue({ sublistId: 'recmachcustrecord_bulky_relative_shipping_rec', fieldId: 'custrecord_bulky_platform_sku', line: item_line_no }),
                    //     qty: bg_rec.getSublistValue({ sublistId: 'recmachcustrecord_bulky_relative_shipping_rec', fieldId: 'custrecord_bulky_quantity', line: item_line_no }),
                    //     qty_in_case: Number(b.getValue(b.columns[1])),
                    // };
                    var boxinfo = {
                        sku: b.getValue(b.columns[1]),
                        qty: b.getValue(b.columns[2]),
                        qty_in_case: 1,
                    }
                    if (carton_infos_1.hasOwnProperty("box_" + b.getValue(b.columns[3]))) {
                        carton_infos_1["box_" + b.getValue(b.columns[3])].push(boxinfo);
                    } else {
                        carton_infos_1["box_" + b.getValue(b.columns[3])] = [boxinfo];
                    }
                    return true;
                });
                log.audit('carton_infos', carton_infos_1);
                // 提交装箱单信息
                var body_1 = '<?xml version="1.0" encoding="utf-8"?>' +
                    '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">' +
                    '<Header>' +
                    '<DocumentVersion>1.01</DocumentVersion>' +
                    '<MerchantIdentifier>' + auth.seller_id + '</MerchantIdentifier>' +
                    '</Header>' +
                    '<MessageType>CartonContentsRequest</MessageType>' +
                    '<Message>' +
                    '<MessageID>1</MessageID>' +
                    '<CartonContentsRequest>' +
                    '<ShipmentId>' + shipment_id + '</ShipmentId>' +
                    '<NumCartons>' + Object.keys(carton_infos_1).length + '</NumCartons>';
                Object.keys(carton_infos_1).map(function (carton_id) {
                    body_1 += "<Carton><CartonId>" + carton_id.replace('box_', '') + "</CartonId>";
                    carton_infos_1["" + carton_id].map(function (item) {
                        body_1 += "<Item><SKU>" + item.sku + "</SKU><QuantityShipped>" + item.qty + "</QuantityShipped><QuantityInCase>" + item.qty_in_case + "</QuantityInCase></Item>";
                    });
                    body_1 += "</Carton>";
                });
                body_1 += '</CartonContentsRequest></Message></AmazonEnvelope>';
                params['FeedType'] = "_POST_FBA_INBOUND_CARTON_CONTENTS_";
                params['PurgeAndReplace'] = 'true';
                params['ContentMD5Value'] = encode.convert({
                    string: core.md5(body_1),
                    inputEncoding: encode.Encoding.HEX,
                    outputEncoding: encode.Encoding.BASE_64
                });
                log.audit('md5', core.md5(body_1));
                log.audit('params', params);
                log.audit('body', body_1);
                var content = core.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', params, '/', body_1);
                var res = xml.Parser.fromString({
                    text: content
                });
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    var feed = record.create({
                        type: 'customrecord_aio_amazon_feed',
                        isDynamic: true
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_account',
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_submission_id',
                        value: core.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_type',
                        value: core.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_submitted_date',
                        value: core.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_processing_status',
                        value: core.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_started_processing_date',
                        value: core.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_completed_processing_date',
                        value: core.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_body',
                        value: body_1
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_feed_bg',
                        value: recId
                    });
                    feed.save();

                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_feed_submission_id',
                        value: core.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_feed_type',
                        value: core.getTextContentSafe(res, 'FeedType')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_submitted_date',
                        value: core.getTextContentSafe(res, 'SubmittedDate')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_feed_processing_status',
                        value: core.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_started_processing_date',
                        value: core.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_completed_processing_date',
                        value: core.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    bg_rec.setValue({
                        fieldId: 'custrecord_bg_feed_body',
                        value: body_1
                    });

                    result_data.status = 'success';
                    result_data.message = res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                    return result_data
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    result_data.status = 'error';
                    result_data.message = "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                    return result_data
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                result_data.status = 'error';
                result_data.message = "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
                return result_data
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },

        getPackageLabels: function (account_id, shipment_id, recId, recType) {
            var auth = core.getAuthByAccountId(account_id);
            var result_data = {};
            var params = {
                ShipmentId: shipment_id,
                PageType: 'PackageLabel_Plain_Paper',
            };
            if (auth) {
                var key_2 = 0;
                search.create({
                    type: 'customrecord_bulky_boxing_info',
                    filters: [{
                        name: 'custrecord_bulky_shipping_id',
                        operator: 'anyof',
                        values: recId
                    }],
                    columns: [{
                        name: 'custrecord_bulky_box_case_number',
                        summary: 'group'
                    }]
                }).run().each(function (rec) {
                    key_2++;
                    return true;
                });
                params['NumberOfPallets'] = key_2;
                var content = core.mwsRequestMaker(auth, 'GetPackageLabels', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01/');
                log.debug('content', content);
                var res = xml.Parser.fromString({
                    text: content
                });
                log.debug('res', res);
                if (res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    }).length > 0) {
                    result_data.status = 'success';
                    result_data.message = res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                    return result_data
                    return res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                } else {
                    result_data.status = 'error';
                    result_data.message = "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                    return result_data
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                result_data.status = 'error';
                result_data.message = "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
                return result_data
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },

        getPalletLabels: function (account_id, shipment_id, recId, recType) {
            var auth = core.getAuthByAccountId(account_id);
            var result_data = {};
            var params = {
                ShipmentId: shipment_id,
                PageType: 'PackageLabel_Plain_Paper',
            };
            if (auth) {
                var key_2 = 0;
                search.create({
                    type: 'customrecord_bulky_boxing_info',
                    filters: [{
                        name: 'custrecord_bulky_shipping_id',
                        operator: 'anyof',
                        values: recId
                    }],
                    columns: [{
                        name: 'custrecord_bulky_box_case_number',
                        summary: 'group'
                    }]
                }).run().each(function (rec) {
                    key_2++;
                    return true;
                });
                params['NumberOfPallets'] = key_2;
                var content = core.mwsRequestMaker(auth, 'GetPalletLabels', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01/');
                log.debug('content', content);
                var res = xml.Parser.fromString({
                    text: content
                });
                log.debug('res', res);
                if (res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    }).length > 0) {
                    result_data.status = 'success';
                    result_data.message = res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                    return result_data
                    return res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                } else {
                    result_data.status = 'error';
                    result_data.message = "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                    return result_data
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                result_data.status = 'error';
                result_data.message = "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
                return result_data
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },

        updateInboundShipment: function (account_id, recId, recType, shipment_id, shipment_status, order_contact) {
            var auth = core.getAuthByAccountId(account_id),
                bg_rec = record.load({
                    type: recType,
                    id: recId,
                    isDynamic: true
                }),
                addr = core.getAddressById(Number(order_contact));
            var result_data = {};
            var inbound_shipment_name = bg_rec.getValue('custrecord_bulky_shipment_number');
            var shipment_status = bg_rec.getText('custrecord_bg_inbound_shipment_status');
            var inbound_dest_center_id = bg_rec.getValue('custrecord_bg_inbound_dest_center_id');
            var inbound_label_prep_type = bg_rec.getText('custrecord_bg_inbound_label_prep_type');
            if (auth && addr) {
                var params = {
                    "ShipmentId": shipment_id,
                    "InboundShipmentHeader.ShipmentName": inbound_shipment_name, //Yes

                    "InboundShipmentHeader.ShipFromAddress.Name": addr.Name, //Yes
                    "InboundShipmentHeader.ShipFromAddress.AddressLine1": addr.AddressLine1, //Yes
                    "InboundShipmentHeader.ShipFromAddress.AddressLine2": addr.AddressLine2, //No
                    "InboundShipmentHeader.ShipFromAddress.City": addr.City, //Yes
                    "InboundShipmentHeader.ShipFromAddress.DistrictOrCounty": addr.DistrictOrCounty, //No
                    "InboundShipmentHeader.ShipFromAddress.StateOrProvinceCode": addr.StateOrProvinceCode, //No
                    "InboundShipmentHeader.ShipFromAddress.CountryCode": addr.CountryCode, //Yes
                    "InboundShipmentHeader.ShipFromAddress.PostalCode": addr.PostalCode, //No

                    "InboundShipmentHeader.DestinationFulfillmentCenterId": inbound_dest_center_id, //Yes
                    "InboundShipmentHeader.ShipmentStatus": shipment_status, //Yes   WORKING SHIPPED CANCELLED

                    "InboundShipmentHeader.IntendedBoxContentsSource": 'FEED', //No    NONE, FEED, 2D_BARCODE
                    "InboundShipmentHeader.LabelPrepPreference": inbound_label_prep_type, //Yes   SELLER_LABEL AMAZON_LABEL_ONLY AMAZON_LABEL_PREFERRED 
                };
                var line_count = bg_rec.getLineCount({
                    sublistId: 'recmachcustrecord_bulky_relative_shipping_rec'
                });
                for (var key = 0; key < line_count; key++) {
                    params["InboundShipmentItems.member." + (key + 1) + ".QuantityShipped"] = bg_rec.getSublistValue({
                        sublistId: 'recmachcustrecord_bulky_relative_shipping_rec',
                        fieldId: 'custrecord_bulky_quantity',
                        line: key
                    });
                    params["InboundShipmentItems.member." + (key + 1) + ".SellerSKU"] = bg_rec.getSublistValue({
                        sublistId: 'recmachcustrecord_bulky_relative_shipping_rec',
                        fieldId: 'custrecord_bulky_platform_sku',
                        line: key
                    });
                }
                log.debug('params', params);
                var response = core.mwsRequestMaker(auth, 'UpdateInboundShipment', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01');
                log.debug('response', response);
                var res = xml.Parser.fromString({
                    text: response
                });
                var rtn_shipment_id = xml.XPath.select({
                    node: res,
                    xpath: "//nlapi:UpdateInboundShipmentResult/nlapi:ShipmentId"
                }).map(function (_) {
                    return _.textContent;
                }).join('');
                if (rtn_shipment_id) {
                    bg_rec.setText({
                        fieldId: 'custrecord_bg_inbound_shipment_status',
                        text: core.listInboundShipments(auth, null, [rtn_shipment_id]).shift().shipment_status
                    });
                    bg_rec.save();
                    result_data.status = 'success';
                    result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + rtn_shipment_id + "]\u6210\u529f";
                    return result_data;
                    return rtn_shipment_id;
                } else {
                    result_data.status = 'error';
                    result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + response;
                    return result_data;
                    throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + response;
                }
            } else {
                result_data.status = 'error';
                result_data.message = "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u65E0\u6CD5\u4ECE\u7CFB\u7EDF\u4E2D\u83B7\u53D6\u539F\u59CB SG Order\u7684\u57FA\u7840\u4FE1\u606F\uFF01";
                return result_data;
                throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u65E0\u6CD5\u4ECE\u7CFB\u7EDF\u4E2D\u83B7\u53D6\u539F\u59CB SG Order\u7684\u57FA\u7840\u4FE1\u606F\uFF01";
            }
        },

        listInboundShipments: function (auth, nextToken, shipmentIds) {
            var lastUpdatedAfter = moment().subtract(moment.duration(720, 'hours')).toISOString(),
                lastUpdatedBefore = moment().toISOString(),
                shipments = [];
            var content;
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipmentsByNextToken', '2010-10-01', {
                    'NextToken': nextToken,
                }, '/FulfillmentInboundShipment/2010-10-01');
            } else if (shipmentIds && shipmentIds.length) {
                var params_2 = {};
                shipmentIds.map(function (id, key) {
                    return params_2["ShipmentIdList.member." + (key + 1)] = id;
                });
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipments', '2010-10-01', params_2, '/FulfillmentInboundShipment/2010-10-01');
            } else {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipments', '2010-10-01', {
                    'ShipmentStatusList.member.1': 'WORKING',
                    'ShipmentStatusList.member.2': 'SHIPPED',
                    'ShipmentStatusList.member.3': 'IN_TRANSIT',
                    'ShipmentStatusList.member.4': 'DELIVERED',
                    'ShipmentStatusList.member.5': 'CHECKED_IN',
                    'ShipmentStatusList.member.6': 'RECEIVING',
                    'ShipmentStatusList.member.7': 'CLOSED',
                    'ShipmentStatusList.member.8': 'CANCELLED',
                    'ShipmentStatusList.member.9': 'DELETED',
                    'ShipmentStatusList.member.10': 'ERROR',
                    'LastUpdatedAfter': lastUpdatedAfter,
                    'LastUpdatedBefore': lastUpdatedBefore
                }, '/FulfillmentInboundShipment/2010-10-01');
            }
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'member'
            }).map(function (node) {
                shipments.push({
                    shipment_id: core.getTextContentSafe(node, 'ShipmentId'),
                    shipment_name: core.getTextContentSafe(node, 'ShipmentName'),
                    center_id: core.getTextContentSafe(node, 'DestinationFulfillmentCenterId'),
                    label_prep_type: core.getTextContentSafe(node, 'LabelPrepType'),
                    shipment_status: core.getTextContentSafe(node, 'ShipmentStatus'),
                    are_cases_required: core.getTextContentSafe(node, 'AreCasesRequired'),
                    confirmed_need_by_date: core.getTextContentSafe(node, 'ConfirmedNeedByDate'),
                    box_contents_source: core.getTextContentSafe(node, 'BoxContentsSource'),
                    ship_from_address: res.getElementsByTagName({
                        tagName: 'ShipFromAddress'
                    }).length ? {
                        id: '',
                        Name: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'Name'),
                        AddressLine1: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'AddressLine1'),
                        AddressLine2: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'AddressLine2'),
                        City: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'City'),
                        DistrictOrCounty: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'DistrictOrCounty'),
                        StateOrProvinceCode: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'StateOrProvinceCode'),
                        CountryCode: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'CountryCode'),
                        PostalCode: core.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'PostalCode'),
                    } : null,
                    items: []
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                core.listInboundShipments(auth, res.getElementsByTagName({
                    tagName: 'NextToken'
                })[0].textContent).map(function (shipment) {
                    return shipments.push(shipment);
                });
            }
            return shipments;
        },

        getAuthByAccountId: function (account_id) {
            var auth;
            log.audit('account_id', account_id);
            search.create({
                type: 'customrecord_aio_account',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: account_id
                }, ],
                columns: [{
                        name: 'custrecord_aio_seller_id'
                    },
                    {
                        name: 'custrecord_aio_mws_auth_token'
                    },
                    {
                        name: 'custrecord_aio_aws_access_key_id',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_secret_key_guid',
                        join: 'custrecord_aio_dev_account'
                    },
                    {
                        name: 'custrecord_aio_amazon_mws_endpoint',
                        join: 'custrecord_aio_enabled_sites'
                    },
                    {
                        name: 'custrecord_aio_amazon_marketplace_id',
                        join: 'custrecord_aio_enabled_sites'
                    },
                ]
            }).run().each(function (rec) {
                auth = {
                    seller_id: rec.getValue(rec.columns[0]),
                    auth_token: rec.getValue(rec.columns[1]),
                    access_id: rec.getValue(rec.columns[2]),
                    sec_key: rec.getValue(rec.columns[3]),
                    end_point: rec.getValue(rec.columns[4]),
                    marketplace_id: rec.getValue(rec.columns[5]),
                };
                return false;
            });
            return auth || false;
        },

        mwsRequestMaker: function (auth, action, version, params, resource, body) {
            if (resource === void 0) {
                resource = '/';
            }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = {
                SellerId: encodeURIComponent(auth.seller_id),
                AWSAccessKeyId: encodeURIComponent(auth.access_id),
                Action: encodeURIComponent(action),
                SignatureMethod: encodeURIComponent('HmacSHA256'),
                SignatureVersion: encodeURIComponent('2'),
                Timestamp: timestamp,
                Version: encodeURIComponent(version)
            };
            if (auth.auth_token) {
                query['MWSAuthToken'] = encodeURIComponent(auth.auth_token);
            }
            for (var key in params) {
                if (params[key] != '') {
                    query[key] = encodeURIComponent(params[key]);
                }
            }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function (key) {
                return key + "=" + query[key];
            }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({
                string: hash,
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            }));
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? {
                    'Content-Type': 'text/xml',
                } : {}
            });
            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            log.debug('headers', body ? {
                'Content-Type': 'text/xml',
            } : {});
            log.debug('hashInBase64', hashInBase64);
            log.debug('response', response);

            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    throw "MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            log.debug('mwsRequestMaker.response.body', response.body);
            return response.body;
        },
    }

    return {

        post: _post

    }
});