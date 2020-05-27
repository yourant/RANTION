/*
 * @Author         : Li
 * @Date           : 2020-04-29 10:06:58
 * @LastEditTime   : 2020-04-29 10:11:45
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Bundle 328233\douples (2)\dps_creatieminfo_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
  Amazon 拉单时，根据单号拿到货品信息
 */
define(["./Helper/core.min", "N/log", "N/record", "./Helper/Moment.min", "N/search"], function (core, log, record, moment, search) {

    /**
     * Function definition to be triggered before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */

    function beforeLoad(context) {

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
    function beforeSubmit(context) {
        try {
            var curr = context.newRecord
            log.debug("curr", JSON.stringify(curr))
            var cur_type = curr.type
            switch (cur_type) {
                /*
                case "invoice": //发票   “关联销售订单” 字段设置
                    log.debug("invoice")
                    curr.setValue({
                        fieldId: "custbody_rel_salesorder",
                        value: curr.getValue("createdfrom")
                    })
                    break;
                case "itemfulfillment": //货品实施   “关联销售订单” 字段设置
                    log.debug("itemfulfillment")
                    if (curr.getText("createdfrom").indexOf("库存转移") == -1)
                        curr.setValue({
                            fieldId: "custbody_rel_salesorder",
                            value: curr.getValue("createdfrom")
                        })
                    break;
                    */
                case "customrecord_aio_order_import_cache":
                    GetItemInfo(curr)
                    break;
                default:
                    break;
            }

        } catch (e) {
            log.error("error:", e)
        }

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
    function afterSubmit(context) {


    }

    /**
     * 获取亚马逊的货品信息
     */
    function GetItemInfo(curr) {
        var auth = core.amazon.getAuthByAccountId(curr.getValue("custrecord_aio_cache_acc_id"));
        var line_items = core.amazon.getOrderItems(auth, curr.getValue("custrecord_aio_cache_order_id"));
        curr.setValue({
            fieldId: 'custrecord_amazonorder_iteminfo',
            value: JSON.stringify(line_items)
        });
        /*
        // set fields start
        var iteminfo = line_items[0]
        curr.setValue({
            fieldId: 'custrecord_dps_cache_cod_fee',
            value: iteminfo.cod_fee
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_cod_fee_discount',
            value: iteminfo.cod_fee_discount
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_promotion_ids',
            value: iteminfo.promotion_ids
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_qty',
            value: iteminfo.qty
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_promotion_discount',
            value: iteminfo.promotion_discount
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_is_gift',
            value: iteminfo.is_gift
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_asin',
            value: iteminfo.asin
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_seller_sku',
            value: iteminfo.seller_sku
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_order_item_id',
            value: iteminfo.order_item_id
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_item_price',
            value: iteminfo.item_price
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_item_tax',
            value: iteminfo.item_tax
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_shipping_price',
            value: iteminfo.shipping_price
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_gift_wrap_price',
            value: iteminfo.gift_wrap_price
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_shipping_tax',
            value: iteminfo.shipping_tax
        });
        curr.setValue({
            fieldId: 'custrecord_dps_cache_shipping_discount',
            value: iteminfo.shipping_discount
        });
        // set fields end
        */

        log.debug("order_id:" + curr.getValue("custrecord_aio_cache_acc_id"), line_items)
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});