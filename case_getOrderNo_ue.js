/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-14 09:48:23
 * @LastEditTime   : 2020-08-14 13:55:10
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : c:\Users\EDZ\Desktop\Amazon 装箱信息\case_getOrderNo_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @des 从邮件内容获取订单编号, 根据获取到的订单号查找对应的订单信息, 根据货品负责人设置邮件的分配至货品负责人
 */
define(['N/record', 'N/search', 'N/log'], function (record, search, log) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {

    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
        var ctx = scriptContext.newRecord;
        log.audit('scriptContext.type', scriptContext.type);
        if (scriptContext.type == 'create' || scriptContext.type == 'edit' || scriptContext.type == 'view') {
            log.audit("开始获取订单号", scriptContext.type);

            try {
                var inboundemail = ctx.getValue('inboundemail');
                var incomingmessage = ctx.getValue('incomingmessage');
                var assigned = ctx.getValue('assigned');
                var setcur = record.load({
                    type: 'supportcase',
                    id: ctx.id
                });
                log.debug("email: " + inboundemail, "message: " + incomingmessage)
                var title = ctx.getValue('title');


                incomingmessage = searchCaseMessage(ctx);

                log.audit('incomingmessage  typeof', typeof (incomingmessage));
                var proname, account;
                var casesolesid, item_asin, item_name, acc_id, memberitem;
                var getPo = '';
                // var reg = /\d{3}-\d{7}-\d{7}/
                // var so = str.match(reg);
                // getPo = checkS(title);
                getPo = searchAmazonOrder(title);
                if (getPo == '' || getPo == null || getPo == undefined) {
                    log.debug('主题无订单编号', '主题无订单编号')
                    //	getPo = getPObyMessage(incomingmessage);

                    getPo = searchAmazonOrder(incomingmessage);
                    log.debug("getPo", getPo);
                } else {
                    log.debug('主题订单号为: ', getPo)
                }

            } catch (e) {
                log.audit("Get PO error", e)
            }
            if (getPo == "" || getPo == null || getPo == undefined) {
                // log.audit("getPo为空","getPo为空");
            } else {
                try {
                    search.create({
                        type: 'salesorder',
                        filters: [{
                                name: 'poastext',
                                operator: "is",
                                values: getPo
                            },
                            // { name:'account', operator:'is', values:54 },
                            {
                                name: "mainline",
                                operator: "is",
                                values: false
                            },
                            {
                                name: 'taxline',
                                operator: 'is',
                                values: false
                            }
                        ],
                        columns: [{
                                name: "custcol_aio_amazon_asin"
                            },
                            // { name: 'custitem_display_item_name',join: 'item' },
                            {
                                name: 'custcol_aio_s_item_title'
                            },
                            {
                                name: "memberitem",
                                join: "item"
                            },
                            {
                                name: 'custbody_aio_account'
                            },
                        ]

                    }).run().each(function (rec) {
                        casesolesid = rec.id;
                        item_name = rec.getValue(rec.columns[1]);
                        item_asin = rec.getValue(rec.columns[0]);
                        memberitem = rec.getValue(rec.columns[2]);
                        acc_id = rec.getValue(rec.columns[3]);
                        return false;
                    });
                    log.debug('memberitem', memberitem)
                    log.debug("casesolesid", casesolesid);
                    if (casesolesid == "" || casesolesid == null || casesolesid == undefined) {
                        // log.debug("对应的销售订单内部ID","为空");
                        setcur.setValue({
                            fieldId: 'custevent_case_po',
                            value: getPo
                        });
                        var a = setcur.save();
                        log.audit('if case ID', a)
                    } else {

                        var item_employee;
                        /*
                        search.create({
                            type: 'inventoryitem',
                            filters: [{
                                name: 'internalid',
                                operator: 'is',
                                values: memberitem
                            }],
                            columns: [{
                                name: 'custitem_operation_leader'
                            }]
                        }).run().each(function (rec) {
                            item_employee = rec.getValue('custitem_operation_leader');
                        });

                        */

                        var email = ctx.getValue('email')
                        if (email.indexOf('no-reply@amazon.de') > -1 || email.indexOf('do-not-reply@amazon.com') > -1 || email.indexOf('fba-ship-confirm@amazon.com') > -1 || email.indexOf('fba-noreply@amazon.com') > -1 || email.indexOf('system@sent-via.netsuite.com') > -1 || email.indexOf('auto-communication@amazon.com') > -1) {
                            // 这些邮件暂不指派
                        } else {
                            if (item_employee) {
                                if (!assigned) {
                                    setcur.setValue({
                                        fieldId: 'assigned',
                                        value: item_employee
                                    });
                                }
                            }
                        }
                        log.debug('item_asin item_name  getPo  casesolesid   acc_id', item_asin + ' - ' + item_name + ' - ' + getPo + ' - ' + casesolesid + ' - ' + acc_id)

                        setcur.setValue({
                            fieldId: 'custevent_dps_case_asin',
                            value: item_asin
                        });
                        setcur.setValue({
                            fieldId: 'custevent_dps_case_item_name',
                            value: item_name
                        });
                        setcur.setValue({
                            fieldId: 'custevent_dps_case_poid',
                            value: getPo
                        });
                        setcur.setValue({
                            fieldId: 'custevent_dps_case_so',
                            value: casesolesid
                        });
                        setcur.setValue({
                            fieldId: 'custevent_dps_case_store',
                            value: acc_id
                        });
                        try {
                            var a = setcur.save()
                            log.audit('else case ID', a)
                        } catch (error) {
                            log.audit('设置信息出错', e);
                        }
                        // log.debug("对应的销售订单内部ID",casesolesid);
                    }
                } catch (e) {
                    log.audit('获取对应的销售订单失败', e);
                }

            }
        }

    }


    /**
     * @des 从讯息内容中获取订单号
     * @param {*} message 
     */
    function getPObyMessage(message) {
        var order_arrary = ['订单编号', 'order', 'orders', 'Orders', 'Order', 'commande', '注文番号', 'ORDER', 'Order Number', '注文'];
        // message = "Here is a copy of the e-mail that you sent to Jonathan Rothstein-Fisch.\n\n订单编号： 114-2960162-5573021:\n\n# \tASIN \t商品名称\n1 \t B07KZMTTD2 \t Milk Frother - VIVREAL 3-in-1 Electric Milk Steamer Foam Maker for Latte, Cappuccino, Hot Chocolate, Macchiato, Automatic Milk Frother and Heater w/Ho\n------------- Begin message -------------\n\n\n Dear customer,\nWe would like to arrange a replacemnet for you.\nThe package will be send to\nJonathan Rothstein-Fisch\n5511 SW 65TH CT\nSOUTH MIAMI, FL 33155-6474\nPlease check if it's the right address.\nThanks for choosing our product.\nBest regards,\nCustomer Service Team\n\n\n------------- End message -------------\n\n\nFor Your Information: To help protect the trust and safety of our marketplace, and to help arbitrate potential disputes, we retain all messages buyers and sellers send through Amazon.com for two years. This includes your response to the message above. Amazon.com uses filtering technology to protect buyers and sellers from possible fraud. Messages that fail this filtering will not be transmitted.\n\nWe want you to buy with confidence anytime you purchase products on Amazon.com. Learn more about Safe Online Shopping Learn more about Safe Online Shopping and our safe buying guarantee.\n\n \n\n此电子邮件是否有用？\n\n 如果您有任何问题，请访问: 卖家平台\n\n 要更改您的电子邮件首选项，请访问： 通知首选项";
        var sta = 0,
            n = 0;
        var po = '';
        for (var i = 0; i < order_arrary.length; i++) {
            log.debug('order_arrary[' + i, order_arrary[i]);
            var message_split = message.split(order_arrary[i])
            log.debug('message_split', message_split)
            var message_split_len = message_split.length

            if (message_split_len > 1) { //判断是否有重复order
                log.debug('有重复 ');

                for (var j = 1; j < message_split_len; j++) {
                    po = checkS(message_split[j])
                    if (po != '') break
                }

                // if(order_arrary[i] == '注文番号'){
                // 	for(var j=1;j<message_split_len;j++){
                // 		po = checkS(message_split[j])
                // 		if(po != '') break
                // 	}
                // }
                // else{
                // 	for(var j=0;j<message_split_len;j++){
                // 		po = checkS(message_split[j])
                // 		if(po != '') break
                // 	}
                // }

                if (po) return po
            } else {
                log.debug('无重复 ');
                var message_index = Number(message.indexOf(order_arrary[i]))
                log.error('message_index', message_index)
                var s = message.substring(message_index + 4, message_index + 35);
                log.error('s ', s);
                po = checkS(s)
                if (po == '') {
                    continue
                } else break;
            }
        }
        return po
    }

    function checkS(s) {
        var po = '';
        if (s == "" || s == null || s == undefined) {
            return ''
        } else {
            log.debug("s+=:", s)
            po = s.replace(/[^0-9-]/ig, "")
            log.debug('po+=', po);
            log.debug('po 的长度', po.length);

            if (po.length > 19) {
                var po_len = po.length
                // 	114-2960162-5573021   5843320  5842620
                for (var so = 0; so < po_len; so++) {
                    if (po[3 + so] == '-' && po[11 + so] == '-') {
                        po = po.substring(0 + so, 19 + so);
                        var a = /^\d+$/.test(po.substring(0, 3))
                        var b = /^\d+$/.test(po.substring(4, 11))
                        if (a && b && po[0].indexOf('0') == -1) {
                            log.debug('PO#', po);
                            return po
                        }
                    } else return ''
                }
            } else if (po.length == 19) {
                var a = /^\d+$/.test(po.substring(0, 3))
                var b = /^\d+$/.test(po.substring(4, 11))
                if (a && b && po[0].indexOf('0') == -1) return po
                else return ''
            } else return ''
        }
    }

    /**
     * 获取Amazon订单号  sear
     * @param {String} message 
     */
    function searchAmazonOrder(message) {
        var req = /[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]/; // Amazon 订单号格式

        var amazon_order;

        if (!message) {
            return amazon_order;
        }

        var b_starts = message.search(req); // 起始位置

        log.audit('开始位置', b_starts);

        if (b_starts == -1) {
            return '';
        }

        var b_end = b_starts + 19;

        log.audit('结束位置', b_end);

        amazon_order = message.substring(b_starts, b_end);

        log.audit('订单号', amazon_order);

        return amazon_order;
    }
    /**
     * 获取Amazon订单号数组  match
     * @param {String} message 
     */
    function matchAmazonOrder(message) {
        var req = /[0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9][0-9]/ig; // Amazon 订单号格式

        var amazon_order;

        if (!message) {
            return amazon_order;
        }

        var order_arrary = message.match(req); // 单号数组

        if (order_arrary && order_arrary.length == 0) {
            return '';
        }

        amazon_order = order_arrary;
        return amazon_order;
    }


    /**
     * 用于获取 case massage 内容
     * @param {Object} con 
     */
    function searchCaseMessage(con) {

        var message = '';
        search.create({
            type: con.type,
            filters: [{
                name: 'internalid',
                operator: 'anyof',
                values: con.id
            }],
            columns: [
                "message"
            ]
        }).run().each(function (rec) {
            message = rec.getValue('message');
        })

        return message
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };

});