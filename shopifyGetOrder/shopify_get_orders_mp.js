/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', './shopify_common.js', 'N/https', 'N/record', 'N/log', 'N/format', './../../Helper/core.min'], function (search, sp, https, record, log, format, aio) {//SuiteScripts/dps/shopifyGetOrder

    function getInputData() {
        try {
            var start_date = '2020-07-01T00:00:00-04:00',//开始时间
                end_date = '2020-07-03T24:00:00-04:00';//结束时间
                num = '100',//代表每页数量
                orders = [];
                //new Date(+new Date()-8*3600*1000-4*3600*1000)
            log.debug('start_date', start_date);
            log.debug('end_date', end_date);
            var orders = [];
            shopifyApi.init(https, search),
                shopifyApi.getAccountList().map(function (account) {
                    shopifyApi.connectHttpGetResponse(account, start_date, end_date).map(function (order) {
                        orders.push({
                            id: account.id,
                            info: account.info,
                            marketplace_id: account.auth_meta.marketplace,
                            customer_id: account.auth_meta.customer,
                            salesrep_id: account.auth_meta.salesrep_id,
                            department_id: account.auth_meta.department_id,
                            subsidiary_id: account.auth_meta.subsidiary_id,
                            order: order
                        })
                    });
                });
            log.debug('orders', orders.length);
            return orders;
        } catch (e) {
            log.debug('e', e);
        }
    }

    function map(context) {
        log.debug('context', JSON.parse(context.value));
        var obj = JSON.parse(context.value), acc_id = obj.id, marketplace_id = obj.marketplace_id, customer_id = obj.customer_id, salesrep_id = obj.salesrep_id, department_id = obj.department_id, so = obj.order,
            subsidiary_id = obj.subsidiary_id, ord, error_message = [];
        //查询订单是否存在salesorder中
        search.create({
            type: 'salesorder',
            filters: [
                { name: 'externalid', operator: 'is', values: so.name }
            ]
        }).run().each(function (rec) {
            ord = record.load({ type: 'salesorder', id: rec.id, isDynamic: true });
        });

        if(!ord){
            //创建订单
            try{
                createOrders(so,acc_id,marketplace_id,customer_id,salesrep_id,department_id,subsidiary_id);
            }catch(e){
                error_message.push("createOrders: " + e);
                log.debug('Create Orders','createOrders: ' + e);
            }
        }else{
            log.debug('SalesOrders 存在该订单', "PASS: SalesOrder订单号为：" + so.name);
        }
        if (error_message.length) {
            context.write(so.name, JSON.stringify({
                account_id: acc_id,
                order_id: so.name,
                marketplace_id: marketplace_id,
                reason: error_message.join('\n')
            }));
        }else {
            try {
                search.create({
                    type: 'customrecord_aio_connector_missing_order',
                    filters: [
                        { name: 'externalid', operator: 'is', values: so.name }
                    ]
                }).run().each(function (rec) {
                    record.submitFields({
                        type: 'customrecord_aio_connector_missing_order',
                        id: rec.id,
                        values: {
                            'custrecord_aio_missing_order_is_resolved': true,
                            'custrecord_aio_missing_order_resolving': false,
                        }
                    });
                    return true;
                });
            }catch (err) {
                context.write(so.name, JSON.stringify({
                    account_id: acc_id,
                    order_id: so.name,
                    marketplace_id: marketplace_id,
                    reason: "SO Error: " + err
                }));
            }
        }
    }

    function reduce(context) {
        try{
            var externalid = context.key;
            context.values.map(function (info) {
                var missing_order = JSON.parse(info);
                var mo;
                search.create({
                    type: 'customrecord_aio_connector_missing_order',
                    filters: [
                        { name: 'externalid', operator: 'is', values: externalid }
                    ]
                }).run().each(function (rec) {
                    mo = record.load({ type: 'customrecord_aio_connector_missing_order', id: rec.id });
                    return false;
                });
                
                if (!mo) {
                    mo = record.create({ type: 'customrecord_aio_connector_missing_order', isDynamic: true });
                }
                mo.setValue({ fieldId: 'externalid', value: externalid });
                mo.setValue({ fieldId: 'custrecord_aio_missing_order_account', value: missing_order.account_id });
                mo.setValue({ fieldId: 'custrecord_aio_missing_order_marketplace', value: missing_order.marketplace_id });
                mo.setValue({ fieldId: 'custrecord_aio_missing_order_po_check_no', value: missing_order.order_id });
                mo.setValue({ fieldId: 'custrecord_aio_missing_order_reason', value: missing_order.reason });
                mo.setValue({ fieldId: aio.ns.connector_missing_order.missing_order_is_resolved, value: false });
                mo.setValue({ fieldId: aio.ns.connector_missing_order.missing_order_resolving, value: false });
                mo.save(); 
            });
      }catch(err){
          log.error('丢单建表，出现问题', 'err'+err);
      }
    }

    function createOrders(so,acc_id,marketplace_id,customer_id,salesrep_id,department_id,subsidiary_id){
        try{
            var ord = record.create({ type: 'salesorder', isDynamic: true });
            //客户
            ord.setValue({ fieldId: 'entity', value: customer_id });
            //日期
            ord.setText({
                fieldId : 'trandate',
                text : format.format({
                    value : aio.Moment(so.created_at).toDate(),
                    type :format.Type.DATE,
                    timezone: format.Timezone.AMERICA_LOS_ANGELES
                })
            });
            //预交日期
            ord.setText({
                fieldId : 'custbody_est_dd',
                text : format.format({
                    value : aio.Moment(so.created_at).toDate(),
                    type :format.Type.DATE,
                    timezone: format.Timezone.AMERICA_LOS_ANGELES
                })
            });
            //PO编号
            ord.setValue({ fieldId: 'otherrefnum', value: so.name });
            ord.setValue({ fieldId: 'externalid', value: so.name });
            //销售代表
            ord.setValue({ fieldId: 'salesrep', value: salesrep_id });
            //店铺
            ord.setValue({ fieldId: 'custbody_dps_store_name', value: acc_id });
            //部门
            ord.setValue({ fieldId: 'department', value: department_id });
            //获取的订单内容
            ord.setValue({ fieldId: 'custbody_aio_api_content', value: JSON.stringify(so) });
            //单据类型
            //ord.setValue({ fieldId: 'custbody_dps_bil_type', value: 1});
            //产品

            so.line_items.map(function (line) {
                var sku_id;
                search.create({
                    type: 'customrecord_aio_shopify_seller_sku',
                    filters: [
                        { name: 'name', operator: 'is', values: line.sku }, //sku
                        { name: 'custrecord_shopify_account', operator: 'is', values: acc_id }//店铺ID
                    ],
                    columns: [
                        'custrecord_shopify_sku'
                    ]
                }).run().each(function (rec) {
                    sku_id = rec.getValue('custrecord_shopify_sku');
                    return false;
                });
                ord.selectNewLine({ sublistId: 'item' });
                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: sku_id });
                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: line.quantity });
                ord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: line.price });
                // 其他字段
                try {
                    ord.commitLine({ sublistId: 'item' });
                }
                catch (err) {
                    throw "Error inserting item line: " + line.sku + ", abort operation!" + so.order_number + '---------' + err;
                }
            });
            ord.save();
            log.debug("creatso","创建成功");
        }catch(e){
            throw "creat order error: " + so.name + "--------" + e;
        }
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
