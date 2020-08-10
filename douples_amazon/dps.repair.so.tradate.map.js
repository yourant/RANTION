/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-04 16:43:56
 * @LastEditTime   : 2020-08-04 19:47:12
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \douples_amazon\dps.repair.so.tradate.map.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/log', 'N/format', './Helper/Moment.min',
    './Helper/fields.min'
], function (search, record, log, format, moment, fields) {

    function getInputData() {

        var ordArr = [];
        var accObj = {};
        search.create({
            type: 'customrecord_aio_account',
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                // values: ["165", "164", "79", "82", "80", "81", "519", "78"]
                values: [164]
            }],
            columns: [{
                name: "custrecord_aio_amazon_site_timezone",
                join: 'custrecord_aio_enabled_sites'
            }]
        }).run().each(function (r) {
            accObj[r.id] = r.getValue({
                name: "custrecord_aio_amazon_site_timezone",
                join: 'custrecord_aio_enabled_sites'
            });

            return false;
        });

        log.debug('accObj', accObj);

        return accObj;


        /*
        var mySearch = search.create({
            type: "customrecord_aio_order_import_cache",
            filters: [{
                    name: "custrecord_aio_cache_acc_id",
                    operator: "anyof",
                    values: ["165", "164", "79", "82", "80", "81", "519", "78"]
                },
                {
                    name: "custrecord_aio_cache_resolved",
                    operator: "is",
                    values: ["T"]
                }
            ],
            columns: [
                "custrecord_aio_cache_acc_id", // 店铺
                "custrecord_aio_cache_order_id", // 订单号
                "custrecord_aio_cache_body", // 订单详情
                "custrecord_text_trandate", // TRANDATE TEXT
            ]
        });

        var pageSize = 1000; //每页条数
        var pageData = mySearch.runPaged({
            pageSize: pageSize
        });
        var totalCount = pageData.count; //总数

        log.audit('总数', totalCount);
        var pageCount = pageData.pageRanges.length; //页数

        log.audit('总页数', pageCount);

        pageData.fetch({
            index: 1
        }).data.forEach(function (rs) {
            ordArr.push({
                account: rs.getValue("custrecord_aio_cache_acc_id"),
                orderId: rs.getValue("custrecord_aio_cache_order_id"),
            })
        });


        */
    }

    function map(context) {

        try {

            var o;
            search.create({
                type: 'salesorder',
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: 7509
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [
                    "custbody_aio_api_content"
                ]
            }).run().each(function (rec) {
                o = rec.getValue('custbody_aio_api_content');
            })

            o = JSON.parse(o);
            log.debug('body o', o);
            log.debug('body o purchase_date', o.purchase_date);


            log.debug('moment().utc(o.purchase_date).toDate()', moment.utc(o.purchase_date).toDate());


            var key = context.key,
                valu = context.value;

            log.debug('key: ' + key, "valu " + valu);
            var order_trandate = format.format({
                value: moment.utc(o.purchase_date).toDate(),
                type: format.Type.DATETIMETZ,
                timezone: fields.timezone[valu] // depositDate
            }).split(" ")[0];


            log.audit('order_trandate', order_trandate);

            var id = record.submitFields({
                type: 'salesorder',
                id: 7509,
                values: {
                    trandate: order_trandate
                }
            });

            log.debug('id', id);
        } catch (error) {
            log.error('更新日期出错了', error);
        }
    }

    function reduce(context) {

    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});