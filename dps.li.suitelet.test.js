/*
 * @Author         : Li
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-07-09 20:00:14
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.suitelet.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */



/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/task', 'N/log', 'N/search', 'N/record', 'N/file', 'N/currency', 'N/runtime',
    './douples_amazon/Helper/core.min', 'N/http', 'N/ui/serverWidget', "./Rantion/Helper/logistics_cost_calculation"
], function (task, log, search, record, file, currency, runtime, core, http, serverWidget, costCal) {

    function onRequest(context) {


        /**
         * 搜索并创建城市记录
         * @param {*} City 
         */
        function searchCreateCity(City) {

            var cityId;
            search.create({
                type: 'customrecord_dps_port',
                filters: [{
                    name: 'name',
                    operator: 'is',
                    values: City
                }]
            }).run().each(function (rec) {
                cityId = rec.id;
            });

            if (!cityId) {
                var newCi = record.create({
                    type: 'customrecord_dps_port'
                });

                newCi.setValue({
                    fieldId: 'name',
                    value: City
                });

                cityId = newCi.save();
            }

            return cityId || false;
        }



        /**
         * 搜索或创建国家记录
         * @param {*} CountryCode 
         */
        function searchCreateCountry(CountryCode) {
            var countryId;
            search.create({
                type: 'customrecord_country_code',
                filters: [{
                    name: 'custrecord_cc_country_code',
                    operator: 'is',
                    values: CountryCode
                }]
            }).run().each(function (rec) {
                countryId = rec.id;
            });

            if (!countryId) {
                search.create({
                    type: 'customrecord_country_code',
                    filters: [{
                        name: "custrecord_cc_country_name_en",
                        operator: 'is',
                        values: CountryCode
                    }]
                }).run().each(function (rec) {
                    countryId = rec.id;
                });
                var newCode = record.create({
                    type: 'customrecord_country_code'
                });

                newCode.setValue({
                    fieldId: 'name',
                    value: CountryCode
                });

                newCode.setValue({
                    fieldId: 'custrecord_cc_country_code',
                    value: CountryCode
                });
                newCode.setValue({
                    fieldId: 'custrecord_cc_country_name_en',
                    value: CountryCode
                });

                countryId = newCode.save();

                log.debug('countryId', countryId);
            }

            return countryId || false;
        }

        function getShipToAddr(str) {

            var newArr = [];
            var a = str.split("FBA");
            var b = a[1];
            var c = b.toString().split("发货地");

            var d = c[0].split("\n");

            for (var i = 0, len = d.length; i < len; i++) {
                if (d[i] == "" || d[i] == undefined || d[i] == null || d[i].indexOf('目的地') > -1 || d[i].indexOf('发货地') > -1 || d[i].indexOf("Declarant") > -1) {
                    continue;
                }
                newArr.push(d[i].trim());
            }

            return newArr || false;
        }

        /**
         * 获取token
         */
        function getToken() {
            var token;
            search.create({
                type: 'customrecord_wms_token',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: 1
                }],
                columns: ['custrecord_wtr_token']
            }).run().each(function (result) {
                token = result.getValue('custrecord_wtr_token');
            });
            return token;
        }

        /**
         * 发送请求
         * @param {*} token 
         * @param {*} data 
         */
        function sendRequest(token, data) {

            log.debug('sendRequest data', data);
            var message = {};
            var code = 0;
            var retdata;
            var headerInfo = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'access_token': token
            };
            var response = http.post({
                // url: 'http://47.107.254.110:8066/swagger-ui.html#!/36890299922604127861/pdfParseToTextUsingPOST',
                url: 'http://47.107.254.110:18082/rantion-wms/common/pdfParseToText',
                headers: headerInfo,
                body: JSON.stringify(data)
            });
            log.debug('response', JSON.stringify(response));
            retdata = JSON.parse(response.body);
            return retdata;
        }


        /**
         * 
         * @param {String} recType 记录类型
         * @param {Number} recId 记录Id
         */
        function copyTransactionRec(recType, recId) {

            var newLocation, newTLocation, objRecordId;
            var objRecord = record.copy({
                type: recType,
                id: recId,
                isDynamic: true,
                // defaultValues: {
                //     entity: 107
                // }
            });

            search.create({
                type: recType,
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: recId
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    },
                    // {
                    //     name: 'taxline',
                    //     operator: 'is',
                    //     values: true
                    // }
                ],
                columns: [
                    "location", // FROM LOCATION
                    "transferlocation", // TO LOCATION
                    "custbody_actual_target_warehouse", // 实际目标仓库
                ]
            }).run().each(function (r) {
                newLocation = r.getValue('transferlocation');
                newTLocation = r.getValue('custbody_actual_target_warehouse');
            });


            log.debug('newLocation', newLocation);
            log.debug('newTLocation', newTLocation);
            if (newLocation && newTLocation && newLocation != newTLocation) {
                objRecord.setValue({
                    fieldId: 'location',
                    value: newLocation
                });
                objRecord.setValue({
                    fieldId: 'transferlocation',
                    value: newTLocation
                });

                objRecordId = objRecord.save();
                log.debug('objRecordId', objRecordId);
            }

            return objRecordId || false;
        }


        /**
         * 履行库存转移单
         * @param {*} rec 
         */
        function itemfulfillment(link) {

            var objRecord = record.transform({
                fromType: 'transferorder',
                fromId: link,
                toType: 'itemfulfillment',
                // isDynamic: true,
            });

            var objRecord_id = objRecord.save();

            return objRecord_id || false;
        }

        /**
         * 接受库存转移单的货品
         * @param {*} rec 
         */
        function itemreceipt(link) {
            var objRecord = record.transform({
                fromType: 'transferorder',
                fromId: link,
                toType: 'itemreceipt',
                // isDynamic: true,
            });
            var obj_id = objRecord.save();
            return obj_id || false;
        }


        /**
         * 计算预估运费
         * @param {*} Rec 
         */
        function getCost(Rec) {

            var limit = 3999;
            var rec_country, serverID,
                cost = 0,
                allWeight,
                city,
                to_location,
                zip;

            log.audit("serverID rec_country city to_location allWeight", serverID + '-' + rec_country + '-' + city + '-' + to_location + '-' + allWeight);


            search.create({
                type: Rec.type,
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: [Rec.id]
                }],
                columns: [
                    "custrecord_dps_recipient_country_dh", // country
                    "custrecord_dps_recipient_city_dh", // City
                    "custrecord_dps_recipien_code_dh", // zip
                    "custrecord_dps_shipping_rec_country_regi", // Country Code
                    "custrecord_dps_shipping_rec_to_location", // 目标仓库
                    "custrecord_dps_shipping_r_channelservice", // 服务Id
                ]
            }).run().each(function (rec) {
                rec_country = rec.getValue("custrecord_dps_shipping_rec_country_regi") ? rec.getValue("custrecord_dps_shipping_rec_country_regi") : "";
                city = rec.getValue('custrecord_dps_recipient_city_dh') ? rec.getValue('custrecord_dps_recipient_city_dh') : "";
                zip = rec.getValue('custrecord_dps_recipien_code_dh') ? rec.getValue('custrecord_dps_recipien_code_dh') : "";
                to_location = rec.getValue('custrecord_dps_shipping_rec_to_location') ? rec.getValue('custrecord_dps_shipping_rec_to_location') : "";
                serverID = rec.getValue("custrecord_dps_shipping_r_channelservice");
            });



            var numLines = Rec.getLineCount({
                sublistId: 'recmachcustrecord_dps_shipping_record_parentrec'
            });
            var allWeight = 0;
            for (var i = 0; i < numLines; i++) {
                var item = Rec.getSublistValue({
                    sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                    fieldId: 'custrecord_dps_shipping_record_item',
                    line: i
                });
                var quantity = Rec.getSublistValue({
                    sublistId: 'recmachcustrecord_dps_shipping_record_parentrec',
                    fieldId: 'custrecord_dps_ship_record_item_quantity',
                    line: i
                })
                search.create({
                    type: 'item',
                    filters: [{
                        name: 'internalId',
                        operator: 'anyof',
                        values: item
                    }, ],
                    columns: [{
                        name: 'custitem_dps_heavy2'
                    }]
                }).run().each(function (skurec) {
                    var weight = skurec.getValue("custitem_dps_heavy2")
                    if (quantity) allWeight += Number(weight) * Number(quantity)
                    return true;
                });
            }


            log.audit("serverID rec_country city to_location allWeight", serverID + '-' + rec_country + '-' + city + '-' + to_location + '-' + allWeight);
            // if (serverID)
            cost = costCal.calculation(serverID, rec_country, zip, allWeight, '', '', '', city, '', to_location, '', '');
            log.audit("cost", cost);

            // 设置预估运费
            var id = record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: Rec.id,
                values: {
                    custrecord_dps_shipping_rec_estimatedfre: cost,
                }
            });

            return cost || false;
        }



        var startTime, endTime, cost;
        try {

            // log.debug('context.request.month', context.request.month)

            if (context.request.month == "POST") {
                log.debug('context.request.month', context.request.month)
            }


            var a = new Date();
            log.debug('a', a);
            log.debug('toString a', a.toUTCString())
            log.debug('a getTimezoneOffset', a.getTimezoneOffset())

            // log.debug("请求", context);

            context.response.write("1");



            /*

            var rec = record.load({
                type: 'transferorder',
                id: 20369
            });

            var lofba;

            search.create({
                type: rec.type,
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: [rec.id]
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [{
                    name: 'custrecord_dps_financia_warehous',
                    join: "custbody_actual_target_warehouse"
                }]
            }).run().each(function (rec) {
                lofba = rec.getValue({
                    name: 'custrecord_dps_financia_warehous',
                    join: "custbody_actual_target_warehouse"
                })
            });

            log.debug('lofba', lofba);


            /*
            cost = getCost(loadRec);
            log.debug('cost');


            /*
            startTime = new Date().getTime();
            log.debug('startTime', startTime);

            var recType = "transferorder",
                recId = 18316;

            var copyId = copyTransactionRec(recType, recId);

            log.debug('copyId', copyId);

            if (copyId) {

                var itful, itrec, recIdFul;
                var itful = itemfulfillment(recId);
                log.debug('recIdFul', recIdFul);
                var itful = itemfulfillment(copyId);
                log.debug('itful', itful);
                if (itful) {
                    itrec = itemreceipt(recId);
                    log.debug('itrec', itrec);
                }

            }
            endTime = new Date().getTime();
            log.debug('endTime', endTime);

            log.debug('endTime - startTime', endTime - startTime)


            /*

            var form = serverWidget.createForm({
                title: 'Simple Form'
            });

            var field = form.addField({
                id: 'textfield',
                type: serverWidget.FieldType.TEXT,
                label: 'Text'
            });

            form.clientScriptModulePath = './dps.li.test.cs.js';

            context.response.writePage({
                pageObject: form
            });



            /*

            var loadFile = file.load({
                // id: 2920
                id: 2919
            });

            var getContent = loadFile.getContents();


            var d = {
                "base64": getContent
            }

            var end = loadFile.encoding;
            log.debug('end', end);
            var rep;
            rep = sendRequest(getToken(), d);

            log.debug('rep', rep);

            log.debug('code', rep.code);
            context.response.writeLine("rep: \n" + JSON.stringify(rep));


            var jsonRep = rep.data;

            log.debug('jsonRep', jsonRep);

            var str = getShipToAddr(jsonRep);

            log.debug("str", str);

            context.response.writeLine("str: \n" + str);

            var seRec = record.load({
                type: "customrecord_dps_shipping_record",
                id: 21
            });
            seRec.setValue({
                fieldId: 'custrecord_dps_recpir_flag',
                value: str.join("\n")
            });

            var recValue = {};
            var add = str;

            recValue.custrecord_dps_recpir_flag = add ? add : '';

            var addLen = add.length;

            recValue.custrecord_dps_ship_small_recipient_dh = add[0]; // 收件人 
            recValue.custrecord_dps_ship_small_recipient_dh = add[1]; // 街道1
            if (addLen > 6) {
                recValue.custrecord_dps_ship_small_recipient_dh = add[2]; // 街道2
            }
            recValue.custrecord_dps_ship_small_recipient_dh = add[addLen - 3]; // 州
            recValue.custrecord_dps_ship_small_recipient_dh = add[addLen - 2]; // 城市
            recValue.custrecord_dps_ship_small_recipient_dh = add[addLen - 1]; // 国家

            context.response.writeLine('recValue: ' + JSON.stringify(recValue));
            var temp1 = add[addLen - 1],
                temp2 = '',
                temp3 = temp1.split(" ");
            if (temp3.length > 1) {
                temp2 = temp3[temp3.length - 1];
                recValue.custrecord_dps_ship_small_recipient_dh = temp3[0] + ' ' + temp3[1]; // 邮编
            }
            var seaCout = searchCreateCountry(temp2);

            context.response.writeLine("seaCout: " + seaCout);

            var searCity = searchCreateCity(add[addLen - 2]);

            context.response.writeLine("searCity: " + searCity);
            // var seRec_id = seRec.save();
            log.debug('seRec_id', seRec_id);



            /*

            var rec_account = 4,
                total_number = 2,
                rec_shipmentsid = "FBA15D0V9MWF";

            if (rec_shipmentsid) {
                try {
                    getRe = core.amazon.getPalletLabels(rec_account, total_number, rec_shipmentsid);

                } catch (error) {
                    log.error('获取箱唛出错了', error);
                }

                log.debug('getRe', getRe);

                log.debug('获取箱外标签', 'end');
                if (getRe) {
                    var fileObj = file.create({
                        name: rec_shipmentsid + '.ZIP',
                        fileType: file.Type.ZIP,
                        contents: getRe,
                        // description: 'This is a plain text file.',
                        // encoding: file.Encoding.MAC_ROMAN,
                        folder: 36,
                        isOnline: true
                    });

                    var fileObj_id = fileObj.save();

                    log.debug('fileObj_id', fileObj_id);

                }

            }



            /*

            var shipmentIds = ["FBA15D0V9MWF"];

            var account_id = 4;
            var auth = core.amazon.getAuthByAccountId(account_id)

            var response = core.amazon.listInboundShipments(auth, "", shipmentIds);

            log.debug('response', response);

            context.response.writeLine("response: \n" + response);


            /*

            function searchLocationCode(warCode, Subsidiary) {
                var locationId;
                search.create({
                    type: 'location',
                    filters: [{
                            name: 'custrecord_dps_wms_location',
                            operator: 'is',
                            values: warCode
                        },
                        {
                            name: 'subsidiary',
                            operator: 'anyof',
                            values: Subsidiary
                        },
                        {
                            name: 'isinactive',
                            operator: 'is',
                            values: false
                        }
                    ],
                }).run().each(function (rec) {
                    locationId = rec.id;
                });
                return locationId || false;
            }

            var showId = searchLocationCode("HD2A0101", 5);

            log.debug('showId', showId);

            /*

            var toId = 109;

            var newfLocation, newtLocation

            search.create({
                type: 'transferorder',
                filters: [{
                        name: "internalid",
                        operator: "anyof",
                        values: [toId]
                    },
                    {
                        name: "mainline",
                        operator: 'is',
                        values: ["T"]
                    }
                ],
                columns: [
                    "transferlocation", "custbody_actual_target_warehouse"
                ]
            }).run().each(function (rec) {
                log.debug('rec', rec);
                newfLocation = rec.getValue("transferlocation");
                newtLocation = rec.getValue("custbody_actual_target_warehouse");
                return true;
            });

            log.debug('newfLocation', newfLocation);
            log.debug('newtLocation', newtLocation);

            var copyRec = record.copy({
                type: "transferorder",
                id: toId,
                isDynamic: true,
                // defaultValues: {
                //     location: newfLocation,
                //     transferlocation: newtLocation
                // }
            });

            copyRec.setValue({
                fieldId: 'location',
                value: newfLocation
            });

            copyRec.setValue({
                fieldId: 'transferlocation',
                value: newtLocation
            });


            var copyRec_id = copyRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            log.debug("copyRec_id", copyRec_id);

            var da = new Date().getTimezoneOffset();
            log.audit('da', da);

            var daa = new Date(Date.parse(new Date()) + 60 * da * 1000);

            // 相差一个小时, 夏令时
            log.debug('加上时区差,', daa);
            log.debug('new Date', new Date());


            /*
            function searchCurrencyExchangeRates(recCurrency) {

                var exchangerate;

                search.create({
                    type: 'currency',
                    filters: [{
                        name: "symbol",
                        operator: "startswith",
                        values: recCurrency,
                    }],
                    columns: [
                        "exchangerate"
                    ]
                }).run().each(function (rec) {
                    exchangerate = rec.getValue('exchangerate')
                });
                log.debug('exchangerate', exchangerate);
                return exchangerate || false;

            }


            var curS = "USD";
            var ra = searchCurrencyExchangeRates(curS);
            log.debug('ra', ra);

            /*

            var ship_to_country_code = "",
                address_id = {},
                label_prep_preference = "SELLER_LABEL",
                items = [],
                shipping_rec_location,
                lim = 3999,
                lim2 = 3999,
                sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

            search.create({
                type: 'customrecord_dps_shipping_record',
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: 1154
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
                    },
                    'custrecord_dps_shipping_rec_location', // 仓库
                    'custrecord_dps_shipping_rec_account', // 店铺
                ]
            }).run().each(function (rec) {
                shipping_rec_location = rec.getValue('custrecord_dps_shipping_rec_location');
                rec_account = rec.getValue('custrecord_dps_shipping_rec_account');

                var nsItem = rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                });
                log.debug('nsItem', nsItem);
                ship_to_country_code = rec.getValue({
                    name: 'custrecord_cc_country_code',
                    join: 'custrecord_dps_recipient_country_dh'
                });
                var SellerSKU;

                search.create({
                    type: 'customrecord_dps_amazon_seller_sku',
                    filters: [{
                            name: 'custrecord_dps_amazon_ns_sku',
                            operator: 'anyof',
                            values: nsItem
                        },
                        {
                            name: 'custrecord_dps_amazon_sku_account',
                            operator: 'anyof',
                            values: rec_account
                        }
                    ],
                    columns: [
                        'custrecord_dps_amazon_sku_number'
                    ]
                }).run().each(function (rec) {
                    SellerSKU = rec.getText('custrecord_dps_amazon_sku_number');
                    return --lim2 > 0;
                });

                var info = {
                    SellerSKU: SellerSKU, // 这里使用固定 seller SKU 替代一下
                    ASIN: '',
                    Condition: '',
                    Quantity: Number(rec.getValue({
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    })),
                    QuantityInCase: '',
                }
                items.push(info);
                return --lim > 0;
            });



            /*
            var objRecord = record.transform({
                fromType: 'transferorder',
                fromId: 131689,
                toType: 'itemfulfillment',
                // isDynamic: true,
            });

            objRecord.setValue({
                fieldId: 'shipstatus',
                value: 'C'
            });

            var item_ful = objRecord.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < item_ful; i++) {
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'location',
                    line: i,
                    value: 1607
                });
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i,
                    value: 1
                });
            }

            var objRecord_id = objRecord.save();
            log.debug('objRecord_id', objRecord_id);



            /*
            record.submitFields({
                type: 'customrecord_dps_shipping_record',
                id: 1113,
                values: {
                    custrecord_dps_shipping_rec_status: 17,
                    // custrecord_dps_shipment_info: error
                }
            });


            /*
            var fileObj = file.load({
                id: 7403
            });

            var sessionObj = runtime.getCurrentSession();
            log.debug('sessionObj', sessionObj);
            log.debug("File Path: ", fileObj.path);
            log.debug("File URL: ", fileObj.url);

            var account = runtime.accountId;
            log.debug("Account ID for the current user: ", runtime.accountId);

            var url = 'https://';
            if (account.indexOf('_SB1') > -1) {
                var ac = account.replace('_SB1', '');
                url += ac + '-sb1.app.netsuite.com';
            } else {
                url += account;
            }
            url += fileObj.url;

            log.debug('url', url);

            var load_test_id;

            /*
            // var load_test = record.load({
            //     type: 'customrecord_dps_li_test',
            //     id: 1
            // });

            // load_test.setValue({
            //     fieldId: 'name',
            //     value: 202005291513
            // });

            // load_test_id = load_test.save();

            // load_test_id = record.submitFields({
            //     type: "customrecord_dps_li_test",
            //     id: 1,
            //     values: {
            //         name: 4
            //     }
            // });

            // log.debug('load_test_id', load_test_id);
            var fau;
            // search.create({
            //     type: 'customrecord_dps_li_test',
            //     filters: [],
            //     columns: ['custrecord_dps_li_test_formula']
            // }).run().each(function (rec) {
            //     fau = rec.getValue('custrecord_dps_li_test_formula');
            // });

            // log.debug('fau  type: ' + typeof (fau), fau);

            // var a = 9,
            //     b = 3,
            //     c = 2;
            // var am = 1;
            // fau = eval(fau);
            // log.debug('fau', fau);
            // var sum = fau;
            // log.debug('sum', sum);
            // var rate = currency.exchangeRate({
            //     source: 'USD',
            //     target: 'CNY',
            //     // date: new Date('7/28/2015')
            // });

            // log.debug('rate', rate);

            // log.debug('am * rate', am * rate);

            // if (rate) {
            //     // context.response.write(rate);
            // } else {
            //     context.response.write('无');
            // }
            */

        } catch (error) {
            // context.response.write('error: ' + JSON.stringify(error));
            log.error('error', error);
        }

        /*
        try {
            // 拉取财务报告, refund
            var mapScriptId = 'customscript_dps_am_report_financial',
                // mapDeploymentId = 'customdeploy_dps_am_report_financial_ref';
                mapDeploymentId = 'customdeploy_dps_am_report_financial_ord';

            var map_status = submitMapReduceDeployment(mapScriptId, mapDeploymentId);
            context.response.writeLine(JSON.stringify(map_status))
        } catch (error) {
            context.response.writeLine(JSON.stringify(error))
        }

        */

    }

    /**
     * 生成发运记录, 关联销售订单
     * @param {*} soid 
     * @param {*} sku 
     * @returns {*} 返回生成的发运记录的ID, 或者 false;
     */
    function createFulfillmentRecord(soid, sku) {

        var location, item, quantity, api_content, tranid, otherrefnum, account, marketplaceid, amount;
        var first_name, cc_country, cc_state, cc_ctiy, cc_zip, cc_addr1, cc_addr2, cc_phone_number;
        var item_arr = [],
            limit = 3999;

        search.create({
            type: 'salesorder',
            filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: soid
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
                },
                {
                    name: "type",
                    join: "item",
                    operator: "noneof",
                    values: "OthCharge"
                }
            ],
            columns: ['location', 'item', 'quantity', 'custbody_aio_api_content', 'tranid', 'amount',
                'otherrefnum', 'custbody_aio_account', 'custcol_dps_trans_order_item_sku', 'custbody_aio_marketplaceid',
                {
                    name: 'custrecord_cc_first_name',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_country',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_state',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_ctiy',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_zip',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_addr1',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_addr2',
                    join: 'custbody_dps_order_contact'
                },
                {
                    name: 'custrecord_cc_phone_number',
                    join: 'custbody_dps_order_contact'
                }

            ]
        }).run().each(function (rec) {

            amount = rec.getValue('amount');
            location = rec.getValue('location');
            var info = {
                item: rec.getValue('item'),
                quantity: rec.getValue('quantity'),
                sku: rec.getValue('custcol_dps_trans_order_item_sku')
            }
            item_arr.push(info);
            api_content = rec.getValue('custbody_aio_api_content');
            tranid = rec.getValue('tranid');
            otherrefnum = rec.getValue('otherrefnum');
            account = rec.getValue('custbody_aio_account');
            marketplaceid = rec.getValue('custbody_aio_marketplaceid');

            first_name = rec.getValue({
                name: 'custrecord_cc_first_name',
                join: 'custbody_dps_order_contact'
            });
            cc_country = rec.getValue({
                name: 'custrecord_cc_country',
                join: 'custbody_dps_order_contact'
            });
            cc_state = rec.getValue({
                name: 'custrecord_cc_state',
                join: 'custbody_dps_order_contact'
            });
            cc_ctiy = rec.getValue({
                name: 'custrecord_cc_ctiy',
                join: 'custbody_dps_order_contact'
            });
            cc_zip = rec.getValue({
                name: 'custrecord_cc_zip',
                join: 'custbody_dps_order_contact'
            });
            cc_addr1 = rec.getValue({
                name: 'custrecord_cc_addr1',
                join: 'custbody_dps_order_contact'
            });
            cc_addr2 = rec.getValue({
                name: 'custrecord_cc_addr2',
                join: 'custbody_dps_order_contact'
            });
            cc_phone_number = rec.getValue({
                name: 'custrecord_cc_phone_number',
                join: 'custbody_dps_order_contact'
            });

            return --limit > 0;
        });

        var ful_create_rec = record.create({
            type: 'customrecord_dps_shipping_small_record'
        });

        // var big_rec = record.create({
        //     type: 'customrecord_dps_shipping_record'
        // });
        // var big_rec_id = big_rec.save();
        // log.debug('big_rec_id', big_rec_id);

        var small_rec = record.create({
            type: 'customrecord_dps_shipping_small_record'
        });
        var small_rec_id = small_rec.save();
        log.debug('small_rec_id', small_rec_id);

        var objRecord = record.create({
            type: 'customrecord_dps_shipping_small_record',
            isDynamic: true,
            // defaultValues: {
            //     custrecord_dps_ship_order_number: 87
            // }
        });

        var objRecord_id = objRecord.save();

        log.debug('obj', objRecord_id);

        ful_create_rec.setValue({
            fieldId: 'custrecord_dps_ship_order_number', //订单号 
            value: 'tranid'
        });
        log.debug('tranid', tranid);

        var s_id = ful_create_rec.save();
        log.debug('s_id', s_id);

        // objRecord.setValue({
        //     fieldId: 'item',
        //     value: true,
        //     ignoreFieldChange: true
        // });

        /*

            if (location) {
                log.debug('location', location);
                ful_create_rec.setValue({
                    fieldId: 'custrecord_dps_ship_samll_location', //发运仓库 
                    value: location
                });
            }

            /*
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_order_number', //订单号 
                value: tranid
            });
            log.debug('tranid', tranid);

            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_platform_order_numbe', //平台订单号 
                value: otherrefnum
            });
            log.debug('otherrefnum', otherrefnum);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_status', //状态 
                value: 1
            });

            /*
            log.debug('marketplaceid', marketplaceid);
            if (marketplaceid) {
                ful_create_rec.setValue({
                    fieldId: 'custrecord_dps_ship_small_sales_platform', //销售平台 
                    value: marketplaceid ? marketplaceid : ''
                });
            }

            log.debug('account', account);
            if (account) {
                ful_create_rec.setValue({
                    fieldId: 'custrecord_dps_ship_small_account', //销售店铺 
                    value: account
                });
            }

            var sub_id = 'recmachcustrecord_dps_ship_small_links';
            /*
            log.debug('item_arr', item_arr);
            for (var i = 0, len = item_arr.length; i < len; i++) {
                log.debug('i', i);
                ful_create_rec.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_ship_small_item_item',
                    line: i,
                    value: item_arr[i].item
                });
                ful_create_rec.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_ship_small_sku_line',
                    line: i,
                    value: item_arr[i].sku
                });
                ful_create_rec.setSublistValue({
                    sublistId: sub_id,
                    fieldId: 'custrecord_dps_ship_small_item_quantity',
                    line: i,
                    value: item_arr[i].quantity
                });
            }
            
            log.debug('cc_ctiy', cc_ctiy);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_recipient_city',
                value: cc_ctiy
            });

            log.debug('cc_zip', cc_zip);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_recipien_code',
                value: cc_zip
            });

            log.debug('cc_state', cc_state);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_s_state',
                value: cc_state
            });

            var c_country = searchCountryByCode(cc_country);

            log.debug('c_country', c_country);
            if (c_country) {
                ful_create_rec.setValue({
                    fieldId: 'custrecord_dps_recipient_country',
                    value: c_country
                });
            }

            log.debug('cc_addr1', cc_addr1);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_street1',
                value: cc_addr1 ? cc_addr1 : ''
            });

            log.debug('cc_addr2', cc_addr2);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_street2',
                value: cc_addr2 ? cc_addr2 : ''
            });

            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_destination', //目的地 
                value: first_name + '\n' + cc_addr1 + '\n' + cc_addr2 + '\n' + cc_zip + '\n' + cc_ctiy + '\n' + cc_state + '\n' + cc_country
            });

            if (first_name) {
                first_name += ',';
            }
            if (cc_addr1) {
                cc_addr1 += ',';
            }
            if (cc_addr2) {
                cc_addr2 += ',';
            }
            if (cc_zip) {
                cc_zip += ',';
            }
            if (cc_ctiy) {
                cc_ctiy += ',';
            }
            if (cc_state) {
                cc_state += ',';
            }
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_addressee_address', // 收件人地址
                value: first_name + cc_addr1 + cc_addr2 + cc_zip + cc_ctiy + cc_state + cc_country
            });

            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_recipient', //  收件人 
                value: first_name
            });

            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_phone', //  联系电话 
                value: cc_phone_number
            });
           

            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_ship_small_salers_order', // 关联的销售订单
                value: soid
            });

            var set_value = 0;
            var temp = getDeclaredValue(cc_country, location);

            log.debug('typeof(temp)', typeof (temp));
            // temp = JSON.parse(temp);
            var dec_value = temp[0].tariff;
            var currency = temp[0].currency;
            log.debug('cureency', currency);
            if (dec_value) {
                if (amount > dec_value) {
                    var l_v = Number(dec_value) * 0.2,
                        h_v = Number(dec_value) * 0.8;
                    set_value = randomNum(l_v, h_v);

                } else {
                    set_value = account;
                }
            } else {
                set_value = account;
            }

            log.audit('set_value', set_value);
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_declared_value',
                value: Number(set_value)
            });
            ful_create_rec.setValue({
                fieldId: 'custrecord_dps_declare_currency',
                value: Number(currency)
            });

            var ful_create_rec_id = ful_create_rec.save({
                ignoreMandatoryFields: true
            });
            */
        log.audit('发运记录生成成功, ID： ', ful_create_rec_id);

        if (ful_create_rec_id) {
            // custbody_dps_small_fulfillment_record    关联的小货发运记录
            var otherId = record.submitFields({
                type: 'salesorder',
                id: soid,
                values: {
                    'custbody_dps_small_fulfillment_record': ful_create_rec_id
                }
            });
            log.debug('otherId', otherId);
        }

        return ful_create_rec_id || false;
    }



    //生成从minNum到maxNum的随机数
    function randomNum(minNum, maxNum) {
        switch (arguments.length) {
            case 1:
                return Math.random() * minNum;
            case 2:
                return Math.random() * (maxNum - minNum) + minNum;
            default:
                return 0 + minNum;
        }
    }


    /**
     * 获取地点的国家
     * @param {*} locationid 
     */
    function getLocationCode(locationid) {
        var country_id;
        search.create({
            type: 'location',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: locationid
            }],
            columns: [{
                name: 'custrecord_aio_country_sender'
            }]
        }).run().each(function (rec) {
            country_id = rec.getValue('custrecord_aio_country_sender');
        });

        return country_id || false;
    }

    /**
     * 根据国家简码, 搜索对应的国家记录
     * @param {*} code 
     */
    function searchCountryByCode(code) {

        log.debug('code', code);
        var country_id;
        search.create({
            type: 'customrecord_country_code',
            filters: [{
                name: "custrecord_cc_country_code",
                operator: "startswith",
                values: code
            }]
        }).run().each(function (rec) {
            country_id = rec.id;
            return true;
        });

        return country_id || false;
    }


    /**
     * 获取关税起征点的值
     * @param {*} code 
     * @param {*} locationid 
     */
    function getDeclaredValue(code, locationid) {

        var t = searchCountryByCode(code);
        var f = getLocationCode(locationid);

        log.debug('t: ' + t, 'f: ' + f);

        var tariff = [];
        if (t && f) {
            search.create({
                type: 'customrecord_dps_tariff_threshold',
                filters: [{
                        name: 'custrecord_dps_tar_the_country_origin',
                        operator: 'anyof',
                        values: f
                    },
                    {
                        name: 'custrecord_dps_tar_the_target_country',
                        operator: 'anyof',
                        values: t
                    }
                ],
                columns: [{
                        name: 'custrecord_dps_tar_thre_tariff_threshold'
                    },
                    {
                        name: 'custrecord_dps_tar_thre_currency'
                    }
                ]
            }).run().each(function (rec) {
                var it = {
                    tariff: rec.getValue('custrecord_dps_tar_thre_tariff_threshold'),
                    currency: rec.getValue('custrecord_dps_tar_thre_currency')
                }
                tariff.push(it);
            });
        }

        log.debug('getDeclaredValue tariff', tariff);

        return tariff || false;
    }

    return {
        onRequest: onRequest
    }
});