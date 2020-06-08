/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './Helper/Moment.min.js', "N/runtime", 'N/format'],
    function (search, record, moment, runtime, format) {
        function getInputData() {
            var limit = 3999,
                orders = []
            var case_type = runtime.getCurrentScript().getParameter({
                name: 'custscript_case_type'
            })
            log.audit("case_type",case_type)
            if (case_type == "INVOICE") {
                // 获取 状态为 "未结" de invoice
                var status = [ "CustInvc:A"]
                search.create({
                    type: 'invoice',
                    filters: [{
                            name: 'mainline',
                            operator: 'is',
                            values: true
                        },
                       {
                           name: 'status',
                           operator: 'anyof',
                           values: status
                       }
                    ],
                    columns: [{
                        name: "internalid",
                        sort: 'DESC'
                        // sort: 'ASC'
                    }]
                }).run().each(function (e) {
                    orders.push({
                        cache_id: e.id,
                        case_type: case_type
                    })
                //   return false
                    return --limit > 0

                })

            }
            // log.audit("orders", orders)
            log.audit("付款总数", orders.length)
            return orders;
        }

        function map(context) {
            var err = [];
            var obj = JSON.parse(context.value)
            var cache_id = obj.cache_id
            var case_type = obj.case_type
            log.debug("case_type:" + case_type, cache_id)
            try {
                if (case_type == "INVOICE")
                    invoic_tr(cache_id)
            } catch (e) {
                log.error("error:", e);
                err.push(e.message);
            }

            //创建missorder
            if (err.length > 0) {

                var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                var date = format.parse({
                    value: (moment(new Date().getTime()).format(dateFormat)),
                    type: format.Type.DATE
                });;

                var moId = createSOTRMissingOrder('createpayment', cache_id, JSON.stringify(err), date);
                log.debug("出现错误，已创建missingorder" + moId);
            }

        }

        function reduce(context) {

        }

        function summarize(summary) {

        }


    /**
     * 
     * @param {*} dateStr 01.01.2020 23:34:01 UTC 或者 2020-01-01 23:34:01 UTC
     * 返回2020-01-01T23:34:01
     */
    function getFormatedDate(dateStr) {
        var dateTime;
          var time = dateStr.split(" ")[1];
          var date = dateStr.split(" ")[0];
          if(dateStr.indexOf('.') != -1){
           var yyyy = date.split(".")[2];
           var mm = date.split(".")[1];
           var dd = date.split(".")[0];
           dateTime = yyyy+"-"+mm+"-"+dd+"T"+time
          }else{
           dateTime = date+"T"+time
          }
          return dateTime
      }

        /**
         * 生成单据失败记录
         * @param {*} type 
         * @param {*} account_id 
         * @param {*} order_id 
         * @param {*} so_id 
         * @param {*} reason 
         * @param {*} date 
         */
        function createSOTRMissingOrder(type, orderid, reason, date) {
            var mo;
            search.create({
                type: 'customrecord_dps_transform_mo',
                filters: [{
                    name: 'custrecord_tr_missing_order_type',
                    operator: 'is',
                    values: type
                }, {
                    name: 'custrecord_tr_missing_order_id',
                    operator: 'is',
                    values: orderid
                }]
            }).run().each(function (rec) {
                mo = record.load({
                    type: 'customrecord_dps_transform_mo',
                    id: rec.id
                });
                return false;
            });
            if (!mo) {
                mo = record.create({
                    type: 'customrecord_dps_transform_mo',
                    isDynamic: true,
                });
            }
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_type',
                value: type
            }); //类型

            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_id',
                value: orderid
            });
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_reason',
                value: reason
            });
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_date',
                value: date
            });
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_resolved',
                value: false
            });
            mo.setValue({
                fieldId: 'custrecord_tr_missing_order_resolving',
                value: false
            });
            return mo.save();
        };

     
        function invoic_tr(cache_id) {
            var inv = record.load({
                type: record.Type.INVOICE,
                id: cache_id
            });
            var orderid = inv.getValue("otherrefnum"),
                depositdate, settleid, record_id
            log.audit('INVOICE', {
                orderid: orderid,
                inv: inv.getValue('tranid'),
                location: inv.getValue('location'),
                approvalstatus: inv.getValue('approvalstatus')
            });

            var coount_id = inv.getValue('custbody_aio_account')
            if (inv.getValue('approvalstatus') == 1)
                record.submitFields({
                    type: 'invoice',
                    id: cache_id,
                    values: {
                        approvalstatus: 2
                    }
                })

                search.create({
                    type:"customrecord_aio_amazon_settlement",
                    filters:[
                        {name:"custrecord_aio_sett_order_id",operator:'is',values:orderid},
                        // 已生成凭证
                        {name:"custrecord_settle_is_generate_voucher",operator:'is',values:true},
            
                        // 付款
                        {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:"Order"},
            
                        // 退款
                        // {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:"Refund"},
                        
                        {name:"custrecord_aio_sett_amount_type",operator:'isnot',values:"ItemPrice"},
                        // {name:"custrecord_aio_sett_amount_desc",operator:'isnot',values:"Principal"},
                       // {name:"custrecord_settlement_start",operator:'isnotempty'},
                    ],
                    columns:[
                        {name:'custrecord_aio_sett_tran_type'},
                        {name:'custrecord_aio_sett_amount_type'},
                        {name:'custrecord_aio_sett_amount_desc'},
                        {name:'custrecord_aio_sett_amount'},
                        {name:'custrecord_aio_sett_id'},
                        {name:'custrecord_aio_sett_order_id'},
                        {name:'custrecord_aio_sett_deposit_date'},
                    ]
                 }).run().each(function (rec) {
                    record_id = rec.id;
                     settleid = rec.getValue('custrecord_aio_sett_id')
                     depositdate = rec.getValue('custrecord_aio_sett_deposit_date')
                 })
                 log.debug("record_id",record_id)

                 var da = format.format({value:depositdate, type: format.Type.DATE})
                 log.debug("format format",da)

                 log.debug("format parse",format.parse({value:da, type: format.Type.DATE}))

                 var save_id

                 if(record_id){

                     var acc = inv.getValue('custbody_aio_account'),
                         account;
                     search.create({
                         type: 'customrecord_aio_account',
                         filters: [{
                             name: 'internalid',
                             operator: 'is',
                             values: acc
                         }],
                         columns: [{
                             name: 'custrecord_customer_payment_account'
                         }]
                     }).run().each(function (e) {
                         account = e.getValue(e.columns[0])
                     })
         
                     // account = 1275
                     log.debug("account客户付款科目", account)
                     var pmt = record.transform({
                         fromType: record.Type.INVOICE,
                         toType: record.Type.CUSTOMER_PAYMENT,
                         fromId: Number(cache_id)
                     });
                     log.debug("depositdate1", depositdate)
                     
                    //  log.debug("new Date(depositdate)",new Date(depositdate))

                     depositdate = getFormatedDate(depositdate)
                     log.debug('depositdate2',depositdate)
                     
                     
                    //  log.debug("moment depositdate", moment.utc(depositdate).toDate())
         
                     pmt.setValue({
                         fieldId: 'trandate',
                         value: moment.utc(depositdate).toDate()
                     });
                     pmt.setValue({
                         fieldId: 'account',
                         value: account
                     });
                     pmt.setValue({
                         fieldId: 'custbody_amazon_settlementid',
                         value: settleid
                     });
                     save_id = pmt.save({
                         ignoreMandatoryFields: true
                     });
                     log.audit("客户付款成功:", save_id)
                     search.create({
                         type: "journalentry",
                         filters: [{
                                 name: 'mainline',
                                 operator: 'is',
                                 values: true
                             },
                             {
                                 name: 'custbody_jour_orderid',
                                 operator: 'is',
                                 values: orderid
                             },
                             {
                                 name: 'custbody_curr_voucher',
                                 operator: 'is',
                                 values: "预估凭证"
                             },
                         ]
                     }).run().each(function (e) {
                         record.submitFields({
                             type: "journalentry",
                             id: e.id,
                             values: {
                                 custbody_payment: save_id,
                             }
                         })
                     })
                     search.create({
                         type: "journalentry",
                         filters: [{
                                 name: 'mainline',
                                 operator: 'is',
                                 values: true
                             },
                             {
                                 name: 'custbody_jour_orderid',
                                 operator: 'is',
                                 values: orderid
                             },
                             {
                                 name: 'custbody_curr_voucher',
                                 operator: 'is',
                                 values: "冲减凭证"
                             },
                         ]
                     }).run().each(function (e) {
                         record.submitFields({
                             type: "journalentry",
                             id: e.id,
                             values: {
                                 custbody_payment: save_id,
                             }
                         })
                     })
                     search.create({
                         type: "journalentry",
                         filters: [{
                                 name: 'mainline',
                                 operator: 'is',
                                 values: true
                             },
                             {
                                 name: 'custbody_jour_orderid',
                                 operator: 'is',
                                 values: orderid
                             },
                             {
                                 name: 'custbody_curr_voucher',
                                 operator: 'is',
                                 values: "收款凭证"
                             },
                         ]
                     }).run().each(function (e) {
                         record.submitFields({
                             type: "journalentry",
                             id: e.id,
                             values: {
                                 custbody_payment: save_id,
                             }
                         })
                     })
                    //  return save_id
                 }
                 else {

                     log.error('找不到相关的结算报告')
                 }

                 return save_id
        }
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });