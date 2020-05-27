/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/record', 'N/log'],
    function(record) {
        function beforeLoad(context) {
            var form = context.form;
            var bf_cur = context.newRecord;
            var order_status = bf_cur.getValue('orderstatus');
            //log.debug('order_status', order_status);

            if (order_status == 'B') {
                form.addButton({
                    id: 'custpage_create_exchange_order',
                    label: '生成换货',
                    functionName: 'my_test_btn()'
                });
                form.clientScriptModulePath = './add_btn_test_cs.js';
            }
        }

        function beforeSubmit(context) {

        }

        function afterSubmit(context) {

        }
        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };
    }
);