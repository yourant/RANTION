/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-07-16 21:06:05
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
    'N/xml', './Rantion/Helper/tool.li'
], function (search, record, log, core, file, xml, tool) {

    function onRequest(context) {


        function SummaryBinBox(itemList) {

            var BinArr = [],
                BoxArr = [],
                sBinBox = [];

            itemList.forEach(function (item) {
                var type = item.type;
                if (type == 2) { // 未装箱, 从库位出
                    BinArr.push(item)
                } else { // 已装箱, 从箱号出
                    BoxArr.push(item)
                }
            });

            log.debug('BinArr length: ' + BinArr.length, BinArr)
            log.debug('BoxArr length: ' + BoxArr.length, BoxArr)


            var BinObj = {},
                sunBinArr = [];
            // 同库位合并
            for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {
                log.debug('binLen', binLen);
                var bin_temp = BinArr[i_bin];

                sunBinArr.push(bin_temp);

                log.debug('循环 BinObj', BinObj);
                for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {

                    log.debug('j_bin', j_bin);
                    var j_bin_temp = BinArr[j_bin];
                    if (bin_temp.positionCode == j_bin_temp.positionCode) {
                        sunBinArr.push(j_bin_temp);
                    }
                }
                BinObj[bin_temp.positionCode] = sunBinArr;
            }
            log.debug('同库位合并 BinObj', JSON.stringify(BinObj))

            var BinObjKey = Object.keys(BinObj);

            log.debug('库位的值', BinObjKey);

            var BoxObj = {},
                sunBoxArr = [];
            // 同箱号合并
            for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
                var box_temp = BoxArr[i_box];
                sunBoxArr.push(box_temp);
                for (var j_box = i_box + 1; j_box < binLen; j_box++) {

                    var j_box_temp = BoxArr[j_box];
                    if (box_temp.barcode == j_box_temp.barcode) {
                        sunBoxArr.push(j_box_temp);
                    }
                }
                BoxObj[box_temp.barcode] = sunBoxArr;
            }
            log.debug('同箱号合并 BoxObj', JSON.stringify(BoxObj))

            var BoxObjKey = Object.keys(BoxObj);

            log.debug('箱号的值', BoxObjKey);

            var itemObj = {
                BoxObj: BoxObj,
                BinObj: BinObj
            }

            return itemObj || false;

        }


        var recType = "transferorder";
        var recId = 2710;

        var a = tool.searchTransactionItemInfo(recType, recId);

        log.debug('a', a);


        /*
        // try {
        var a_response;
        search.create({
            type: 'customrecord_aio_amazon_feed',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: 9
            }],
            columns: [
                "custrecord_aio_feed_response"
            ]
        }).run().each(function (rec) {
            a_response = rec.getValue('custrecord_aio_feed_response');
        })

        var res = xml.Parser.fromString({
            text: a_response
        });

        var MessagesWithError = getTextContentSafe(res, 'MessagesWithError');

        log.debug('MessagesWithError', MessagesWithError);

        function getTextContentSafe(res, tag) {
            return res.getElementsByTagName({
                tagName: tag
            }).length ? res.getElementsByTagName({
                tagName: tag
            })[0].textContent : '';
            // return xml.XPath.select({ node: res, xpath: path }).length ? xml.XPath.select({ node: res, xpath: path })[0].textContent : '';
        }








        /*


        var a = [{
                "sku": "1101",
                "type": 2,
                "barcode": "1101",
                "positionCode": "AAAD6610101",
                "qty": 1
            },
            {
                "sku": "1102",
                "type": 2,
                "barcode": "1102",
                "positionCode": "AAAD6610102",
                "qty": 1
            },
            {
                "sku": "1102",
                "type": 1,
                "barcode": "ASSDS1",
                "positionCode": "AAAD6610101",
                "qty": 1
            },
            {
                "sku": "1101",
                "type": 1,
                "barcode": "ASSDSO",
                "positionCode": "AAAD6610101",
                "qty": 1
            }
        ]

        var recType = "transferorder";
        var recId = 585591;


        recType = "salesorder";
        recId = 610497;


        recType = "purchaseorder";
        recId = 629807;


        var a = tool.searchTransactionItemObj(recType, recId);

        log.debug('a', a);

        return;
        // var b = SummaryBinBox(a);

        // log.audit("b", b);


        var objRecord = record.transform({
            fromType: 'transferorder',
            fromId: 2778,
            toType: 'itemfulfillment',
        });


        var numLines = objRecord.getLineCount({
            sublistId: 'item'
        });

        var text = objRecord.getSublistText({
            sublistId: 'item',
            fieldId: 'item',
            line: 0
        });

        log.debug('text', text);



        // var lineNumber = objRecord.findSublistLineWithValue({
        //     sublistId: 'item',
        //     fieldId: 'item',
        //     value: "14328"
        // });


        // log.debug('lineNumber', lineNumber);





        /*

                    var a = core.amazon.submitCartonContent(21, 17, "FBA15NZ4QTC3");
                    log.debug('a', a);





                    /* 

        var getRe = core.amazon.GetPackageLabels(21, 2, "FBA15NZ4QTC3");

        if (getRe) {

            var fileObj = file.create({
                name: "FBA15NZ4QTC3" + '.ZIP',
                fileType: file.Type.ZIP,
                contents: getRe,
                // description: 'This is a plain text file.',
                // encoding: file.Encoding.MAC_ROMAN,
                folder: 36,
                isOnline: true
            });

            var fileObj_id = fileObj.save();

            log.debug('fileObj_id', fileObj_id);


            return;

            var recValue = {};

            recValue.custrecord_dps_shipping_rec_status = 17;
            recValue.custrecord_dps_shipment_label_file = fileObj_id;

            if (add && add.length > 0) {

                recValue.custrecord_dps_recpir_flag = add ? add : '';

                var addLen = add.length;

                recValue.custrecord_dps_ship_small_recipient_dh = add[0]; // 收件人 
                recValue.custrecord_dps_street1_dh = add[1]; // 街道1
                if (addLen > 6) {
                    recValue.custrecord_dps_street2_dh = add[2]; // 街道2
                }
                recValue.custrecord_dps_state_dh = add[addLen - 3]; // 州

                var temp1 = add[addLen - 1],
                    temp2 = '',
                    temp3 = temp1.split(" ");
                if (temp3.length > 1) {
                    temp2 = temp3[temp3.length - 1];
                    recValue.custrecord_dps_recipien_code_dh = temp3[0] + ' ' + temp3[1]; // 邮编
                }
                var seaCout;

                try {
                    seaCout = searchCreateCountry(temp2);
                } catch (error) {
                    log.debug('搜索创建国家 error', error);
                }
                if (seaCout) {
                    recValue.custrecord_dps_recipient_country_dh = seaCout; // 国家
                }

                var searCity;
                try {
                    searCity = searchCreateCity(add[addLen - 2]);
                } catch (error) {
                    log.debug('搜索创建城市 error', error);
                }
                if (searCity) {
                    recValue.custrecord_dps_recipient_city_dh = searCity; // 城市
                }

            }

            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: af_rec.id,
                values: recValue
            });

            log.debug('id', id);

            var atid = record.attach({
                record: {
                    type: 'file',
                    id: fileObj_id
                },
                to: {
                    type: af_rec.type,
                    id: af_rec.id
                }
            });
            log.debug('atid', atid);
            var channel_dealer = af_rec.getValue('custrecord_dps_shipping_r_channel_dealer');

            if (channel_dealer == 6) { // 渠道为龙舟的, 获取到标签文件之后, 直接推送标签文件给WMS
                labelToWMS(af_rec);
            }


        }


        /*   

        var accountId = 21,
            submission_ids = [764979018457],
            account = core.amazon.getAuthByAccountId(accountId)


        log.debug('account', account);

        var a = core.amazon.getFeedSubmissionList(accountId, submission_ids);

        log.debug('a', a);

        /*     */



        // } catch (error) {
        //     log.debug('error', error);
        // }





        /*

        var lim2 = 3999,
            limit = 3999;

        var itemObj = {},
            FItemA = []
        var af_rec = {
            type: "customrecord_dps_shipping_record",
            id: 7
        };
        // 先获取发运记录对应的所有货品信息
        search.create({
            type: af_rec.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: af_rec.id
            }],
            columns: [{
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                },
                {
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: "custrecord_dps_shipping_record_parentrec"
                },
                {
                    name: 'custrecord_cc_country_code',
                    join: 'custrecord_dps_recipient_country_dh'
                }
            ]
        }).run().each(function (rec) {

            itemObj[rec.getValue({
                name: "custrecord_dps_shipping_record_item",
                join: "custrecord_dps_shipping_record_parentrec"
            })] = Number(rec.getValue({
                name: "custrecord_dps_ship_record_item_quantity",
                join: "custrecord_dps_shipping_record_parentrec"
            }))

            FItemA.push(rec.getValue({
                name: "custrecord_dps_shipping_record_item",
                join: "custrecord_dps_shipping_record_parentrec"
            }));

            return --limit > 0;
        });

        var rec_account = 4;
        var amItem = [];
        search.create({
            type: 'customrecord_aio_amazon_seller_sku',
            filters: [{
                    name: 'custrecord_ass_sku',
                    operator: 'anyof',
                    values: FItemA
                },
                {
                    name: 'custrecord_ass_account',
                    operator: 'anyof',
                    values: rec_account
                }
            ],
            columns: [
                'name', "custrecord_ass_sku"
            ]
        }).run().each(function (rec) {
            var nsItem = rec.getValue('custrecord_ass_sku');

            if (itemObj[nsItem]) {

                var it = {
                    nsItem: nsItem,
                    SellerSKU: rec.getValue('name'),
                    ASIN: '',
                    Condition: '',
                    Quantity: Number(itemObj[nsItem]),
                    QuantityInCase: '',
                }
                amItem.push(it);
            }
            return --lim2 > 0;
        });

        log.debug('amItem', amItem);
        
        */


    }

    return {
        onRequest: onRequest
    }
});





var a = [{
        id: 1,
        name: 'LI'
    },
    {
        id: 2,
        name: 'CAN'
    }
]