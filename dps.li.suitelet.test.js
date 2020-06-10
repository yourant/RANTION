/*
 * @Author         : Li
 * @Date           : 2020-05-08 15:08:31
 * @LastEditTime   : 2020-06-09 20:28:20
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \dps.li.suitelet.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/task', 'N/log', 'N/search', 'N/record', 'N/file', 'N/currency', 'N/runtime'], function (task, log, search, record, file, currency, runtime) {

    function onRequest(context) {

        try {


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