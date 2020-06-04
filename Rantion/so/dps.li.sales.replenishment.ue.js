/*
 * @Author         : Li
 * @Date           : 2020-05-08 16:36:48
 * @LastEditTime   : 2020-06-04 21:07:41
 * @LastEditors    : Li
 * @Description    : 销售退货/补货
 * @FilePath       : \Rantion\so\dps.li.sales.replenishment.ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/runtime'], function (runtime) {

            function beforeLoad(context) {
                var form = context.form;
                var bf_cur = context.newRecord;
                var createdfrom = bf_cur.getValue('createdfrom');

                var link_so = bf_cur.getValue('custbody_dps_link_so');
                var itemreceipt_links = bf_cur.getValue('custbody_dps_itemreceipt_links');
                var push_wms = bf_cur.getValue('custbody_dps_push_wms');

                var userObj = runtime.getCurrentUser();
                log.debug('userObj', userObj);

                if (!link_so && createdfrom) {
                        form.addButton({
                            id: 'custpage_dps_li_sales_button',
                            label: '生成补货',
                            functionName: "createNewSo(" + createdfrom + ',' + bf_cur.id + ',' + 1 + ")"
                        });
                    }



                    if (!push_wms && createdfrom) {
                        form.addButton({
                            id: 'custpage_dps_li_wms_button',
                            label: '推送WMS',
                            functionName: "createNewSo(" + createdfrom + ',' + bf_cur.id + ',' + 2 + ")"
                        });
                    }

                    form.clientScriptModulePath = './dps.li.sales.replenishment.cs.js';

                }



                function beforeSubmit(context) {
                    var bs_rec = context.newRecord;


                }

                function afterSubmit(context) {

                }

                return {
                    beforeLoad: beforeLoad,
                    beforeSubmit: beforeSubmit,
                    afterSubmit: afterSubmit
                }
            });