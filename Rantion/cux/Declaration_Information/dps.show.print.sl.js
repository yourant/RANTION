/*
 * @Author         : Li
 * @Date           : 2020-05-25 22:21:51
 * @LastEditTime   : 2020-05-27 10:57:27
 * @LastEditors    : Li
 * @Description    : 搜索报关相关记录, 打印
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.show.print.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/log', 'N/ui/serverWidget', 'N/format', './dps.li.tool.setValue', 'N/redirect', 'N/record'], function (search, log, serverWidget, format, tool, redirect, record) {

    function onRequest(context) {

        try {

            var request = context.request;
            var response = context.response;
            var parameters = request.parameters;
            var tran_order = parameters.custpage_tran_order;
            var inv_link = parameters.custpage_text
            var print = parameters.print;

            log.debug('inv_link', inv_link);


            if (print) {

                if (tran_order) {
                    var bigRec, invNO;
                    search.create({
                        type: 'transferorder',
                        filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: tran_order
                            },
                            {
                                name: 'mainline',
                                operator: 'is',
                                values: true
                            }
                        ],
                        columns: [
                            'custbody_dps_fu_rec_link'
                        ]
                    }).run().each(function (rec) {
                        bigRec = rec.getValue('custbody_dps_fu_rec_link');
                    });

                    log.debug('bigRec', bigRec);

                    if (bigRec) {
                        search.create({
                            type: 'customrecord_dps_shipping_record',
                            filters: [{
                                name: 'internalid',
                                operator: 'anyof',
                                values: bigRec
                            }],
                            columns: [
                                'custrecord_dps_ship_rec_c_inv_link'
                            ]
                        }).run().each(function (rec) {
                            invNO = rec.getValue('custrecord_dps_ship_rec_c_inv_link');
                        });

                    }
                }

                log.debug('打印 tran_order', tran_order)
                var moduleXML = "SuiteScripts/Rantion/cux/Declaration_Information/xml/报关资料模版.xml";

                var fileObj = tool.setModuleXMLValue(invNO, moduleXML);


                if (fileObj) {
                    var id = record.submitFields({
                        type: 'transferorder',
                        id: tran_order,
                        values: {
                            custbody_dps_print_customs_nformation: true
                        }
                    });
                }
                context.response.writeFile({
                    file: fileObj,
                    isInline: true
                });

                return;
            } else {
                log.debug('tran_order', tran_order);

                var form = InitUI(tran_order);

                if (form) {
                    context.response.writePage({
                        pageObject: form
                    });

                } else {
                    context.response.write('无法渲染页面');
                }

                if (request.method == 'POST') {

                    redirect.toSuitelet({
                        scriptId: 'customscript_dps_show_print_sl',
                        deploymentId: 'customdeploy_dps_show_print_sl',
                        parameters: {
                            'custpage_tran_order': tran_order,
                            'custpage_text': inv_link
                        }
                    });
                }

            }


        } catch (error) {
            log.error('error', error);
            context.response.write('渲染页面出错了: ' + JSON.stringify(error));
        }

    }


    function InitUI(tran_order) {

        log.debug('InitUI tran_order', tran_order);

        var form = serverWidget.createForm({
            title: '报关打印'
        });

        // form.clientScriptModulePath = './dps.show.print.cs.js';
        form.clientScriptFileId = 4560;
        form.addFieldGroup({
            id: 'fieldgroupid',
            label: '查询条件'
        });

        form.addSubmitButton({
            label: '查询',
        });
        // var button = form.addButton({
        //     id: 'button1',
        //     functionName: 'printExcel',
        //     label: '打印'
        // });

        var text = form.addField({
            id: 'custpage_text',
            type: serverWidget.FieldType.INLINEHTML,
            label: 'Text',
            container: 'fieldgroupid'
        });

        text.defaultValue = '<h2 style="font-size:15px;">报关资料: 点击查询按钮,搜索调拨单的打印状态.</>\n' +
            '<h2 style="font-size:15px;">点击打印按钮直接打印全部报关资料.若不可打印, 则打印按钮不显示 </>\n' +
            '<p>注: 一次只打印一个调拨单的报关资料;未选择调拨单时,最大显示1000条数据</>';

        var traOrd = form.addField({
            id: 'custpage_tran_order',
            type: serverWidget.FieldType.SELECT,
            label: '调拨单',
            source: 'transferorder',
            container: 'fieldgroupid'
        });

        // traOrd.isMandatory = true;
        if (tran_order) {
            traOrd.defaultValue = tran_order;
        }

        var sublist = form.addSublist({
            id: 'sublistid',
            type: serverWidget.SublistType.LIST,
            label: '相关记录'
        });

        sublist.addMarkAllButtons();
        sublist.addRefreshButton();


        var su_box = sublist.addField({
            id: 'custpage_checkbox',
            type: serverWidget.FieldType.CHECKBOX,
            label: '勾选框'
        });
        su_box.updateLayoutType({
            layoutType: serverWidget.FieldLayoutType.NORMAL
        });
        var da = sublist.addField({
            id: 'custpage_transferorder',
            type: serverWidget.FieldType.SELECT,
            source: 'transferorder',
            label: '调拨单号'
        });
        da.updateDisplayType({
            displayType: serverWidget.FieldDisplayType.DISABLED
        });
        var sT = sublist.addField({
            id: 'custpage_transferorder_type',
            type: serverWidget.FieldType.TEXT,
            label: '报关单类型'
        });
        sT.defaultValue = '全部类型';
        sublist.addField({
            id: 'custpage_customs_information',
            type: serverWidget.FieldType.TEXT,
            label: '报关资料编号'
        });
        sublist.addField({
            id: 'custpage_declaration_status',
            type: serverWidget.FieldType.TEXT,
            label: '报关状态'
        });
        sublist.addField({
            id: 'custpage_print_status',
            type: serverWidget.FieldType.TEXT,
            label: '打印状态'
        });


        var invNO, flag = false;
        if (tran_order) {
            var bigRec;
            search.create({
                type: 'transferorder',
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: tran_order
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [
                    'custbody_dps_fu_rec_link', 'custbody_dps_print_customs_nformation'
                ]
            }).run().each(function (rec) {
                bigRec = rec.getValue('custbody_dps_fu_rec_link');
                flag = rec.getValue('custbody_dps_print_customs_nformation');
            });

            log.debug('bigRec', bigRec);

            if (bigRec) {
                search.create({
                    type: 'customrecord_dps_shipping_record',
                    filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: bigRec
                    }],
                    columns: [
                        'custrecord_dps_ship_rec_c_inv_link'
                    ]
                }).run().each(function (rec) {
                    invNO = rec.getValue('custrecord_dps_ship_rec_c_inv_link');

                });

                log.debug('invNO', invNO);
                if (invNO) {

                    var button = form.addButton({
                        id: 'button1',
                        functionName: 'printExcel',
                        label: '打印'
                    });
                    // text.defaultValue = invNO;
                } else {
                    // button.isDisabled = true;
                }

            }

            var line = form.getSublist({
                id: 'sublistid'
            });
            var status = '未打印';
            for (var i = 0; i < 1; i++) {
                line.setSublistValue({
                    id: 'custpage_transferorder',
                    value: tran_order,
                    line: i
                });

                if (flag) {
                    status = '已打印';
                }
                if (!invNO) {
                    status = '不可打印';
                }
                line.setSublistValue({
                    id: 'custpage_print_status',
                    value: status,
                    line: i
                });

            }
        } else {
            var status = '未打印';
            var line = form.getSublist({
                id: 'sublistid'
            });
            var i = 0,
                limit = 1000;
            search.create({
                type: 'transferorder',
                filters: [{
                    name: 'mainline',
                    operator: 'is',
                    values: true
                }],
                columns: [
                    'custbody_dps_fu_rec_link', 'custbody_dps_print_customs_nformation',
                    {
                        name: 'custrecord_dps_ship_rec_c_inv_link',
                        join: 'custbody_dps_fu_rec_link'
                    }
                ]
            }).run().each(function (rec) {

                var flag = rec.getValue('custbody_dps_print_customs_nformation')

                var inv = rec.getValue({
                    name: 'custrecord_dps_ship_rec_c_inv_link',
                    join: 'custbody_dps_fu_rec_link'
                });

                line.setSublistValue({
                    id: 'custpage_transferorder',
                    value: rec.id,
                    line: i
                });

                if (flag) {
                    status = '已打印';
                }
                if (!inv) {
                    status = '不可打印';
                }
                line.setSublistValue({
                    id: 'custpage_print_status',
                    value: status,
                    line: i
                });

                ++i;
                return --limit > 0;
            });


        }


        return form || false;

    }

    return {
        onRequest: onRequest
    }
});