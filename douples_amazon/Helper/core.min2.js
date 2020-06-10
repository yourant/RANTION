/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 *
 * @description AIO核心籄1�7
 */
define(["require", "exports", "N/email", "N/error", "N/https", "N/log", "N/file", "N/format", "N/cache", "N/runtime", "N/crypto", "N/search", "N/record", "N/encode", "N/ui/serverWidget", "N/xml", "./Moment.min", "./CryptoJS.min", "./Papaparse.min", "./fields.min"], function (require, exports, email, error, https, log, file, format, cache, runtime, crypto, search, record, encode, ui, xml, moment, cryptoJS, papa, fiedls) {
    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.Moment = moment;
    exports.CryptoJS = cryptoJS;
    exports.ns = fiedls;
    var BUNDLE_PATH = '/.bundle/256221';
    var enums;
    (function (enums) {
        /** Const enums can only use constant enum expressions and unlike regular enums they are completely removed during compilation. Const enum members are inlined at use sites. This is possible since const enums cannot have computed members. */
        var report_type;
        (function (report_type) {
            /**
             * @name FBA Removal Order Detail Report
             * @description Tab-delimited flat file. This report contains all the removal orders, including the items in each removal order, placed during any given time period. This can be used to help reconcile the total number of items requested to be removed from an Amazon fulfillment center with the actual number of items removed along with the status of each item in the removal order. Content updated in near real-time. For FBA sellers. For Marketplace and Seller Central sellers.
             * */
            report_type[report_type["_GET_FBA_FULFILLMENT_REMOVAL_ORDER_DETAIL_DATA_"] = 1] = "_GET_FBA_FULFILLMENT_REMOVAL_ORDER_DETAIL_DATA_";
            /**
             * @name FBA Removal Shipment Detail Report
             * @description Tab-delimited flat file. This report provides shipment tracking information for all removal orders and includes the items that have been removed from an Amazon fulfillment center for either a single removal order or for a date range. This report will not include canceled returns or disposed items; it is only for shipment information. Content updated in near real-time. For FBA sellers. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_FBA_FULFILLMENT_REMOVAL_SHIPMENT_DETAIL_DATA_"] = 2] = "_GET_FBA_FULFILLMENT_REMOVAL_SHIPMENT_DETAIL_DATA_";
            /**
             * @name FBA Returns Report
             * @description Tab-delimited flat file. Contains customer returned items received at an Amazon fulfillment center, including Return Reason and Disposition. Content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA_"] = 3] = "_GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA_";
            /**
             * @name FBA Replacements Report
             * @description Tab-delimited flat file. Contains replacements that have been issued to customers for completed orders. Content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers. Available in the US and China (CN) only.
             */
            report_type[report_type["_GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_REPLACEMENT_DATA_"] = 14] = "_GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_REPLACEMENT_DATA_";
            /**
             * @name FBA Daily Inventory History Report
             * @description Tab-delimited flat file. Contains historical daily snapshots of your available inventory in Amazon’s fulfillment centers including quantity, location and disposition. Content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA_"] = 5] = "_GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA_";
            /**
             * @name FBA Reimbursements Report
             * @description Tab-delimited flat file. Contains itemized details of your inventory reimbursements including the reason for the reimbursement. Content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_FBA_REIMBURSEMENTS_DATA_"] = 6] = "_GET_FBA_REIMBURSEMENTS_DATA_";
            /**
             * @name FBA Amazon Fulfilled Shipments Report
             * @description Tab-delimited flat file. Contains detailed order/shipment/item information including price, address, and tracking data. You can request up to one month of data in a single report. Content updated near real-time in Europe (EU), Japan, and North America (NA). In China, content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_AMAZON_FULFILLED_SHIPMENTS_DATA_"] = 7] = "_GET_AMAZON_FULFILLED_SHIPMENTS_DATA_";
            /**
             * @name FBA Inventory Event Detail Report
             * @description Tab-delimited flat file. Contains history of inventory events (e.g. receipts, shipments, adjustments etc.) by SKU and Fulfillment Center. Content updated daily. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA_"] = 8] = "_GET_FBA_FULFILLMENT_INVENTORY_SUMMARY_DATA_";
            /**
             * @name FBA Multi-Country Inventory Report
             * @description Tab-delimited flat file. Contains quantity available for local fulfillment by country, helping Multi-Country Inventory sellers in Europe track their FBA inventory. Content updated in near-real time. This report is only available to FBA sellers in European (EU) marketplaces. For Seller Central sellers.
             */
            report_type[report_type["_GET_AFN_INVENTORY_DATA_BY_COUNTRY_"] = 9] = "_GET_AFN_INVENTORY_DATA_BY_COUNTRY_";
            /**
             * @name Flat File Orders By Last Update Report
             * @description Tab-delimited flat file report that shows all orders updated in the specified period. Cannot be scheduled. For all sellers.
             */
            report_type[report_type["_GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE_"] = 10] = "_GET_FLAT_FILE_ALL_ORDERS_DATA_BY_LAST_UPDATE_";
            /**
             * @name Flat File V2 Settlement Report
             * @description Tab-delimited flat file alternate version of the Flat File Settlement Report that is automatically scheduled by Amazon; it cannot be requested through RequestReport. Price columns are condensed into three general purpose columns: amounttype, amountdescription, and amount. For Seller Central sellers only.
             */
            report_type[report_type["_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_"] = 11] = "_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_";
            /**
             * @name FBA Amazon Fulfilled Inventory Report
             * @description Tab-delimited flat file. Content updated in near real-time. For FBA sellers only. For Marketplace and Seller Central sellers.
             */
            report_type[report_type["_GET_AFN_INVENTORY_DATA_"] = 12] = "_GET_AFN_INVENTORY_DATA_";
            /** Tab-delimited flat file detailed all listings report. For Marketplace and Seller Central sellers. */
            report_type[report_type["_GET_MERCHANT_LISTINGS_ALL_DATA_"] = 13] = "_GET_MERCHANT_LISTINGS_ALL_DATA_";
        })(report_type = enums.report_type || (enums.report_type = {}));
        /** 亚马逊提交FEED的类垄1�7 */
        var feed_type;
        (function (feed_type) {
            feed_type[feed_type["_POST_PRODUCT_DATA_"] = 0] = "_POST_PRODUCT_DATA_";
            feed_type[feed_type["_POST_INVENTORY_AVAILABILITY_DATA_"] = 1] = "_POST_INVENTORY_AVAILABILITY_DATA_";
            feed_type[feed_type["_POST_PRODUCT_OVERRIDES_DATA_"] = 2] = "_POST_PRODUCT_OVERRIDES_DATA_";
            feed_type[feed_type["_POST_PRODUCT_PRICING_DATA_"] = 3] = "_POST_PRODUCT_PRICING_DATA_";
            feed_type[feed_type["_POST_PRODUCT_IMAGE_DATA_"] = 4] = "_POST_PRODUCT_IMAGE_DATA_";
            feed_type[feed_type["_POST_PRODUCT_RELATIONSHIP_DATA_"] = 5] = "_POST_PRODUCT_RELATIONSHIP_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_INVLOADER_DATA_"] = 6] = "_POST_FLAT_FILE_INVLOADER_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_LISTINGS_DATA_"] = 7] = "_POST_FLAT_FILE_LISTINGS_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_BOOKLOADER_DATA_"] = 8] = "_POST_FLAT_FILE_BOOKLOADER_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_CONVERGENCE_LISTINGS_DATA_"] = 9] = "_POST_FLAT_FILE_CONVERGENCE_LISTINGS_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_PRICEANDQUANTITYONLY_UPDATE_DATA_"] = 10] = "_POST_FLAT_FILE_PRICEANDQUANTITYONLY_UPDATE_DATA_";
            feed_type[feed_type["_POST_UIEE_BOOKLOADER_DATA_"] = 11] = "_POST_UIEE_BOOKLOADER_DATA_";
            feed_type[feed_type["_POST_STD_ACES_DATA_"] = 12] = "_POST_STD_ACES_DATA_";
            feed_type[feed_type["_POST_ORDER_ACKNOWLEDGEMENT_DATA_"] = 13] = "_POST_ORDER_ACKNOWLEDGEMENT_DATA_";
            feed_type[feed_type["_POST_PAYMENT_ADJUSTMENT_DATA_"] = 14] = "_POST_PAYMENT_ADJUSTMENT_DATA_";
            feed_type[feed_type["_POST_ORDER_FULFILLMENT_DATA_"] = 15] = "_POST_ORDER_FULFILLMENT_DATA_";
            feed_type[feed_type["_POST_INVOICE_CONFIRMATION_DATA_"] = 16] = "_POST_INVOICE_CONFIRMATION_DATA_";
            feed_type[feed_type["_POST_EXPECTED_SHIP_DATE_SOD_"] = 17] = "_POST_EXPECTED_SHIP_DATE_SOD_";
            feed_type[feed_type["_POST_FLAT_FILE_ORDER_ACKNOWLEDGEMENT_DATA_"] = 18] = "_POST_FLAT_FILE_ORDER_ACKNOWLEDGEMENT_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_PAYMENT_ADJUSTMENT_DATA_"] = 19] = "_POST_FLAT_FILE_PAYMENT_ADJUSTMENT_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_FULFILLMENT_DATA_"] = 20] = "_POST_FLAT_FILE_FULFILLMENT_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_INVOICE_CONFIRMATION_DATA_"] = 21] = "_POST_FLAT_FILE_INVOICE_CONFIRMATION_DATA_";
            feed_type[feed_type["_POST_EXPECTED_SHIP_DATE_SOD_FLAT_FILE_"] = 22] = "_POST_EXPECTED_SHIP_DATE_SOD_FLAT_FILE_";
            feed_type[feed_type["_POST_FULFILLMENT_ORDER_REQUEST_DATA_"] = 23] = "_POST_FULFILLMENT_ORDER_REQUEST_DATA_";
            feed_type[feed_type["_POST_FULFILLMENT_ORDER_CANCELLATION_REQUEST_DATA_"] = 24] = "_POST_FULFILLMENT_ORDER_CANCELLATION_REQUEST_DATA_";
            feed_type[feed_type["_POST_FBA_INBOUND_CARTON_CONTENTS_"] = 25] = "_POST_FBA_INBOUND_CARTON_CONTENTS_";
            feed_type[feed_type["_POST_FLAT_FILE_FULFILLMENT_ORDER_REQUEST_DATA_"] = 26] = "_POST_FLAT_FILE_FULFILLMENT_ORDER_REQUEST_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_FULFILLMENT_ORDER_CANCELLATION_REQUEST_DATA_"] = 27] = "_POST_FLAT_FILE_FULFILLMENT_ORDER_CANCELLATION_REQUEST_DATA_";
            feed_type[feed_type["_POST_FLAT_FILE_FBA_CREATE_INBOUND_PLAN_"] = 28] = "_POST_FLAT_FILE_FBA_CREATE_INBOUND_PLAN_";
            feed_type[feed_type["_POST_FLAT_FILE_FBA_UPDATE_INBOUND_PLAN_"] = 29] = "_POST_FLAT_FILE_FBA_UPDATE_INBOUND_PLAN_";
            feed_type[feed_type["_POST_FLAT_FILE_FBA_CREATE_REMOVAL_"] = 30] = "_POST_FLAT_FILE_FBA_CREATE_REMOVAL_";
            feed_type[feed_type["_POST_ENHANCED_CONTENT_DATA_"] = 31] = "_POST_ENHANCED_CONTENT_DATA_";
            feed_type[feed_type["_POST_EASYSHIP_DOCUMENTS_"] = 32] = "_POST_EASYSHIP_DOCUMENTS_";
            feed_type[feed_type["_UPLOAD_VAT_INVOICE_"] = 33] = "_UPLOAD_VAT_INVOICE_";
        })(feed_type = enums.feed_type || (enums.feed_type = {}));
    })(enums = exports.enums || (exports.enums = {}));
    var consts;
    (function (consts) {
        /** 扄1�7有平台都包含都AIO字段 */
        consts.aio_body_fiedls = [fiedls.bodies.marketplaceid, fiedls.bodies.account, fiedls.bodies.api_content, fiedls.bodies.fee_content, fiedls.bodies.is_aio_order];
        /** 字段映射 */
        consts.fieldsMapping = {
            "_GET_FBA_FULFILLMENT_REMOVAL_ORDER_DETAIL_DATA_": {
                "record_type_id": "customrecord_aio_amazon_removal_order",
                "mapping": {
                    "custrecord_aio_removal_report_id": "report-id",
                    "custrecord_aio_removal_request_date": "request-date",
                    "custrecord_aio_removal_order_id": "order-id",
                    "custrecord_aio_removal_order_type": "order-type",
                    "custrecord_aio_removal_order_status": "order-status",
                    "custrecord_aio_removal_last_updated_date": "last-updated-date",
                    "custrecord_aio_removal_sku": "sku",
                    "custrecord_aio_removal_fnsku": "fnsku",
                    "custrecord_aio_removal_disposition": "disposition",
                    "custrecord_aio_removal_requested_qty": "requested-quantity",
                    "custrecord_aio_removal_cancelled_qty": "cancelled-quantity",
                    "custrecord_aio_removal_disposed_qty": "disposed-quantity",
                    "custrecord_aio_removal_shipped_qty": "shipped-quantity",
                    "custrecord_aio_removal_in_process_qty": "in-process-quantity",
                    "custrecord_aio_removal_removal_fee": "removal-fee",
                    "custrecord_aio_removal_currency": "currency"
                }
            },
            "_GET_FBA_FULFILLMENT_REMOVAL_SHIPMENT_DETAIL_DATA_": {
                "record_type_id": "customrecord_aio_amazon_removal_shipment",
                "mapping": {
                    "custrecord_aio_rmv_report_id": "report-id",
                    "custrecord_aio_rmv_request_date": "request-date",
                    "custrecord_aio_rmv_order_id": "order-id",
                    "custrecord_aio_rmv_date": "shipment-date",
                    "custrecord_aio_rmv_sku": "sku",
                    "custrecord_aio_rmv_fnsku": "fnsku",
                    "custrecord_aio_rmv_disposition": "disposition",
                    "custrecord_aio_rmv_shipped_qty": "shipped-quantity",
                    "custrecord_aio_rmv_carrier": "carrier",
                    "custrecord_aio_rmv_tracking_number": "tracking-number"
                }
            },
            "_GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA_": {
                "record_type_id": "customrecord_aio_amazon_customer_return",
                "date_key": "shipment-date",
                "mapping": {
                    "custrecord_aio_b2c_return_report_id": "report-id",
                    "custrecord_aio_b2c_return_return_date": "return-date",
                    "custrecord_aio_b2c_return_order_id": "order-id",
                    "custrecord_aio_b2_creturn_sku": "sku",
                    "custrecord_aio_b2c_return_asin": "asin",
                    "custrecord_aio_b2c_return_fnsku": "fnsku",
                    "custrecord_aio_b2c_return_product_name": "product-name",
                    "custrecord_aio_b2c_return_quantity": "quantity",
                    "custrecord_aio_b2c_return_shipment_fc_id": "fulfillment-center-id",
                    "custrecord_aio_b2c_return_detailed_disp": "detailed-disposition",
                    "custrecord_aio_b2c_return_reason": "reason",
                    "custrecord_aio_b2c_return_status": "status",
                    "custrecord_aio_b2c_return_lcn": "license-plate-number",
                    "custrecord_aio_b2c_return_customer_cms": "customer-comments",
                    "custrecord_aio_b2c_return_aio_account": "account"
                }
            },
            "_GET_FBA_FULFILLMENT_CUSTOMER_SHIPMENT_REPLACEMENT_DATA_": {
                "record_type_id": "customrecord_aio_amazon_customer_replace",
                "date_key": "shipment-date",
                "mapping": {
                    "custrecord_aio_b2c_replace_report_id": "report-id",
                    "custrecord_aio_b2c_replace_shipment_date": "shipment-date",
                    "custrecord_aio_b2c_replace_sku": "sku",
                    "custrecord_aio_b2c_replace_asin": "asin",
                    "custrecord_aio_b2c_replace_quantity": "quantity",
                    "custrecord_aio_b2c_replace_fc_id": "fulfillment-center-id",
                    "custrecord_aio_b2c_replace_origin_fc_id": "original-fulfillment-center-id",
                    "custrecord_aio_b2c_replace_reason_code": "replacement-reason-code",
                    "custrecord_aio_b2c_replacement_ao_id": "replacement-amazon-order-id",
                    "custrecord_aio_b2c_replace_origin_ao_id": "original-amazon-order-id",
                    "custrecord_aio_b2c_replacement_acc_id": "account"
                }
            },
            "_GET_FBA_FULFILLMENT_CURRENT_INVENTORY_DATA_": {
                "record_type_id": "customrecord_aio_amazon_inventory",
                "mapping": {
                    "custrecord_aio_inv_report_id": "report-id",
                    "custrecord_aio_inv_snapshot_date": "snapshot-date",
                    "custrecord_aio_inv_fnsku": "fnsku",
                    "custrecord_aio_inv_sellersku": "sku",
                    "custrecord_aio_inv_product_name": "product-name",
                    "custrecord_aio_inv_quantity": "quantity",
                    "custrecord_aio_inv_fulfillment_center_id": "fulfillment-center-id",
                    "custrecord_aio_inv_detailed_disposition": "detailed-disposition",
                    "custrecord_aio_inv_country": "country",
                }
            },
            "_GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2_": {
                "record_type_id": "customrecord_aio_amazon_settlement",
                "mapping": {
                    "custrecord_aio_sett_report_id": 'report-id',
                    "custrecord_aio_sett_deposit_date": 'deposit-date',
                    "custrecord_aio_sett_total_amount": 'total-amount',
                    "custrecord_aio_sett_id": 'settlement-id',
                    "custrecord_aio_sett_start_date": 'settlement-start-date',
                    "custrecord_aio_sett_end_date": 'settlement-end-date',
                    "custrecord_aio_sett_currency": 'currency',
                    "custrecord_aio_sett_tran_type": 'transaction-type',
                    "custrecord_aio_sett_order_id": 'order-id',
                    "custrecord_aio_sett_merchant_order_id": 'merchant-order-id',
                    "custrecord_aio_sett_adjustment_id": 'adjustment-id',
                    "custrecord_aio_sett_shipment_id": 'shipment-id',
                    "custrecord_aio_sett_marketplace_name": 'marketplace-name',
                    "custrecord_aio_sett_amount_type": 'amount-type',
                    "custrecord_aio_sett_amount_desc": 'amount-description',
                    "custrecord_aio_sett_amount": 'amount',
                    "custrecord_aio_sett_fulfillment_id": 'fulfillment-id',
                    "custrecord_aio_sett_posted_date": 'posted-date',
                    "custrecord_aio_sett_posted_date_time": 'posted-date-time',
                    "custrecord_aio_sett_order_item_code": 'order-item-code',
                    "custrecord_aio_sett_m_order_item_id": 'merchant-order-item-id',
                    "custrecord_aio_sett_adjust_item_id": 'merchant-adjustment-item-id',
                    "custrecord_aio_sett_sku": 'sku',
                    "custrecord_aio_sett_quantity_purchased": 'quantity-purchased',
                    "custrecord_aio_sett_promotion_id": 'promotion-id',
                    "custrecord_aio_sett_receipt_date": 'receipt_date',
                }
            },
            "_GET_AFN_INVENTORY_DATA_": {
                "record_type_id": "customrecord_aio_amazon_afn_inventory",
                "mapping": {
                    "custrecord_aio_afn_inv_report_id": "report-id",
                    "custrecord_aio_afn_inv_seller_sku": "seller-sku",
                    "custrecord_aio_afn_inv_fnsku": "fulfillment-channel-sku",
                    "custrecord_aio_afn_inv_asin": "asin",
                    "custrecord_aio_afn_inv_condition": "condition-type",
                    "custrecord_aio_afn_inv_wh_condition": "Warehouse-Condition-code",
                    "custrecord_aio_afn_inv_qty": "Quantity Available",
                }
            },
            "_GET_MERCHANT_LISTINGS_ALL_DATA_": {
                "record_type_id": "customrecord_aio_amazon_mfn_listing",
                "mapping": {
                    "custrecord_aio_mfn_l_report_id": "report-id",
                    "custrecord_aio_mfn_l_item_name": "item-name",
                    "custrecord_aio_mfn_l_item_description": "item-description",
                    "custrecord_aio_mfn_l_listing_id": "listing-id",
                    "custrecord_aio_mfn_l_seller_sku": "seller-sku",
                    "custrecord_aio_mfn_l_price": "price",
                    "custrecord_aio_mfn_l_quantity": "quantity",
                    "custrecord_aio_mfn_l_open_date": "open-date",
                    "custrecord_aio_mfn_l_image_url": "image-url",
                    "custrecord_aio_mfn_l_item_is_marketplace": "item-is-marketplace",
                    "custrecord_aio_mfn_l_product_id_type": "product-id-type",
                    "custrecord_aio_mfn_l_zshop_shipping_fee": "zshop-shipping-fee",
                    "custrecord_aio_mfn_l_item_note": "item-note",
                    "custrecord_aio_mfn_l_item_condition": "item-condition",
                    "custrecord_aio_mfn_l_zshop_category1": "zshop-category1",
                    "custrecord_aio_mfn_l_zshop_browse_path": "zshop-browse-path",
                    "custrecord_aio_mfn_l_zshop_sf": "zshop-storefront-feature",
                    "custrecord_aio_mfn_l_asin1": "asin1",
                    "custrecord_aio_mfn_l_asin2": "asin2",
                    "custrecord_aio_mfn_l_asin3": "asin3",
                    "custrecord_aio_mfn_l_will_ship_intal": "will-ship-internationally",
                    "custrecord_aio_mfn_l_expedited_shipping": "expedited-shipping",
                    "custrecord_aio_mfn_l_zshop_boldface": "zshop-boldface",
                    "custrecord_aio_mfn_l_product_id": "product-id",
                    "custrecord_aio_mfn_l_bid_for_fp": "bid-for-featured-placement",
                    "custrecord_aio_mfn_l_add_delete": "add-delete",
                    "custrecord_aio_mfn_l_pending_quantity": "pending-quantity",
                    "custrecord_aio_mfn_l_fulfillment_channel": "fulfillment-channel",
                    "custrecord_aio_mfn_l_merchant_sg": "merchant-shipping-group",
                    "custrecord_aio_mfn_l_status": "status",
                }
            },
            "_MISSING_ORDER": {
                "record_type_id": 'customrecord_aio_connector_missing_order',
                "mapping": {
                    "custrecord_aio_missing_order_account": "",
                    "custrecord_aio_missing_order_marketplace": "",
                    "custrecord_aio_missing_order_po_check_no": "",
                    "custrecord_aio_missing_order_reason": "",
                    "custrecord_aio_missing_order_is_resolved": "",
                }
            },
            "_LIST_ORDERS_": {
                "record_type_id": 'salesorder',
                "mapping": {
                    "custbody_aio_s_p_date": "purchase_date",
                    "custbody_aio_s_l_u_date": "last_update_date",
                    "custbody_aio_s_order_status": "order_status",
                    "custbody_aio_s_fulfillment_channel": "fulfillment_channel",
                    "custbody_aio_s_sales_channel": "sales_channel",
                    "custbody_aio_s_ship_service_level": "ship_service_level",
                    "custbody_aio_s_payment_execution_detai": "payment_execution_detail",
                    "custbody_aio_s_shipmentservicelevelcat": "shipment_service_level_category",
                    "custbody_aio_s_shipped_by_amazon_tfm": "shipped_byamazont_fm",
                    "custbody_aio_s_tfmshipmentstatus": "tfm_shipment_status",
                    "custbody_aio_s_order_type": "order_type",
                    "custbody_aio_s_earliest_ship_date": "earliest_ship_date",
                    "custbody_aio_latest_ship_date": "latest_ship_date",
                    "custbody_aio_s_earliest_delivery_date": "earliest_delivery_date",
                    "custbody_aio_s_latest_delivery_date": "latest_delivery_date",
                    "custbody_aio_s_is_business_order": "is_business_order",
                    "custbody_aio_s_is_premium_order": "is_premium_order",
                    "custbody_aio_s_is_prime": "is_prime",
                    "custbody_aio_s_p_r_due_date": "promise_response_due_date",
                    "custbody_aio_estimated_ship_date_set": "is_estimated_ship_date_set",
                }
            },
            "_LIST_ORDER_ITEMS_": {
                "record_type_id": "itemline",
                "mapping": {
                    "custcol_aio_amazon_asin": "asin",
                    "custcol_aio_amazon_msku": "seller_sku",
                    "custcol_aio_s_item_title": "title",
                    "custcol_aio_s_cod_fee_amount": "cod_fee",
                    "custcol_aio_s_cod_fee_discount_amount": "cod_fee_discount",
                    "custcol_aio_s_gift_message_text": "gift_message_text",
                    "custcol_aio_s_gift_wrap_level": "gift_wrap_level",
                    "custcol_aio_s_promotion_ids": "promotion_ids",
                    "custcol_aio_s_promotion_discount": "promotion_discount",
                    "custcol_aio_s_item_tax": "item_tax",
                    "custcol_aio_s_shipping_price": "shipping_price",
                    "custcol_aio_s_gift_wrap_price": "gift_wrap_price",
                    "custcol_aio_s_shipping_tax": "shipping_tax",
                    "custcol_aio_s_shipping_discount": "shipping_discount",
                    "custcol_aio_order_item_id": "order_item_id",
                }
            },
            "_GET_ORDERS_": {
                "record_type_id": "ebaysalesorders",
                "mapping": {
                    "custbody_aio_e_order_id": "order_id",
                    "custbody_aio_e_buyer_user_id": "buyer_user_id",
                    "custbody_aio_e_shipping_service": "shipping_service",
                    "custbody_aio_e_shipped_time": "shipped_time",
                    "custbody_aio_e_sales_record_number": "sales_record_number",
                    "custbody_aio_e_tax": "tax",
                    "custbody_aio_e_tax_percent": "tax_percent",
                    "custbody_aio_e_tax_state": "tax_state",
                    "custbody_aio_e_shipping_includedintax": "shipping_included_in_tax",
                    "custbody_aio_e_insurance": "insurance",
                    "custbody_aio_e_total": "total",
                    "custbody_aio_e_subtotal": "subtotal",
                    "custbody_aio_e_amount_adjust": "amount_adjust",
                    "custbody_aio_e_amount_paid": "amount_paid",
                    "custbody_aio_e_amount_saved": "amount_saved",
                    "custbody_aio_e_payment_method": "payment_method",
                    "custbody_aio_e_checkout_status": "checkout_status",
                    "custbody_aio_e_last_modified_time": "last_modified_time",
                    "custbody_aio_e_create_date": "create_date",
                    "custbody_aio_e_paypal_date": "paypal_date",
                    "custbody_aio_e_paypal_email": "paypal_email",
                    "custbody_aio_e_paypal_status": "paypal_status",
                    "custbody_aio_e_paid_time": "paid_time",
                    "custbody_aio_e_order_status": "order_status",
                    "custbody_aio_e_seller_email": "seller_email",
                    "custbody_aio_e_seller_user_id": "seller_user_id",
                    "custbody_aio_e_eias_token": "eias_token",
                    "custbody_aio_e_i_m_c_c_enabled": "integrated_merchant_credit_card_enabled",
                    "custbody_aio_e_buyer_name": "buyer_name",
                    "custbody_aio_e_buyer_phone": "buyer_phone",
                    "custbody_aio_e_buyer_street1": "buyer_street1",
                    "custbody_aio_e_buyer_street2": "buyer_street2",
                    "custbody_aio_e_buyer_city": "buyer_city",
                    "custbody_aio_e_buyer_state": "buyer_state",
                    "custbody_aio_e_buyer_zip": "buyer_zip",
                    "custbody_aio_e_buyer_country": "buyer_country",
                    "custbody_aio_e_is_m_l_shipping": "is_multi_leg_shipping",
                    "custbody_aio_e_s_r_name": "shipping_recipient_name",
                    "custbody_aio_e_s_r_phone": "shipping_recipient_phone",
                    "custbody_aio_e_shipping_street1": "shipping_street1",
                    "custbody_aio_e_shipping_street2": "shipping_street2",
                    "custbody_aio_e_shipping_city": "shipping_city",
                    "custbody_aio_e_shipping_state": "shipping_state",
                    "custbody_aio_e_shipping_zip": "shipping_zip",
                    "custbody_aio_e_shipping_country": "shipping_country",
                    "custbody_aio_e_shipping_reference_id": "shipping_reference_id",
                    "custbody_aio_e_get_it_fast": "get_it_fast",
                    "custbody_aio_e_shipping_cost": "shipping_cost",
                    "custbody_aio_e_g_s_service": "global_shipping_service",
                    "custbody_aio_e_g_s_cost": "global_shipping_cost",
                    "custbody_aio_e_g_s_cost_currency": "global_shipping_cost_currency",
                    "custbody_aio_e_g_s_import_charge": "global_shipping_import_charge",
                    "custbody_aio_e_o_d_num": "order_detail_num",
                    "custbody_aio_e_m_d_num": "monetary_detail_num",
                    "custbody_aio_e_c_u_role": "creating_user_role"
                }
            },
            "_GET_ORDER_ITEMS_": {
                "record_type_id": "ebaysalesorderitems",
                "mapping": {
                    "custcol_aio_e_item_id": "item_id",
                    "custcol_aio_e_sku": "sku",
                    "custcol_aio_e_quantity": "quantity",
                    "custcol_aio_e_price": "price",
                    "custcol_aio_e_t_id": "transaction_id",
                    "custcol_aio_e_s_carrier": "shipping_carrier",
                    "custcol_aio_e_s_t_num": "shipping_tracking_num",
                    "custcol_aio_e_t_t_amount": "total_tax_amount",
                    "custcol_aio_e_a_s_cost": "actual_shipping_cost",
                    "custcol_aio_e_a_h_cost": "actual_handling_cost",
                    "custcol_aio_e_site": "site",
                    "custcol_aio_e_tax_amount": "tax_amount",
                    "custcol_aio_e_t_o_subtotal": "tax_on_subtotal",
                    "custcol_aio_e_t_o_shipping": "tax_on_shipping",
                    "custcol_aio_e_t_o_handling": "tax_on_handling",
                    "custcol_aio_e_w_r_f_t_amount": "waste_recycling_fee_tax_amount",
                    "custcol_aio_e_title": "title",
                    "custcol_aio_e_e_d_t_min": "estimated_delivery_time_min",
                    "custcol_aio_e_e_d_t_max": "estimated_delivery_time_max",
                    "custcol_aio_e_buyer_email": "buyer_email",
                    "custcol_aio_e_static_alias": "static_alias",
                    "custcol_aio_e_s_r_number": "sales_record_number",
                }
            },
            "_GET_ORDER_PAYMENTS_": {
                "record_type_id": "ebaysalesorderpayments",
                "mapping": {
                    "custcol_aio_e_type": "type",
                    "custcol_aio_e_status": "status",
                    "custcol_aio_e_from_type": "payer.type",
                    "custcol_aio_e_from_name": "pater.value",
                    "custcol_aio_e_to_type": "payee.type",
                    "custcol_aio_e_to_name": "payee.value",
                    "custcol_aio_e_payment_time": "payment_time",
                    "custcol_aio_e_payment_amount": "payment_amount",
                    "custcol_aio_e_r_id_type": "reference_id_type",
                    "custcol_aio_e_reference_id": "reference_id",
                    "custcol_aio_e_fee": "fee",
                    "custcol_aio_e_refund_type": "refund_type"
                }
            }
        };
    })(consts = exports.consts || (exports.consts = {}));
    exports.utils = {
        getBundlePath: function () {
            return runtime.accountId == '5187135' ? 'SuiteScripts/AIOConnector' : BUNDLE_PATH;
        },
        getNotificationMail: function () {
            var mail = '';
            search.create({
                type: exports.ns.global_configuration._name,
                filters: [{
                    name: exports.ns.global_configuration.cfg_if_preferred,
                    operator: search.Operator.IS,
                    values: true
                }],
                columns: [{
                    name: exports.ns.global_configuration.cfg_notification_email
                }]
            }).run().each(function (rec) {
                mail = rec.getValue(rec.columns[0]);
                return false;
            });
            return mail;
        },
        checkIfSubsidiaryEnabled: function () {
            try {
                search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: '-5',
                    columns: ['subsidiary']
                }).subsidiary;
                return true;
            } catch (error) {
                return false;
            }
        },
        handleErrorAndSendNotification: function (e, stage) {
            email.send({
                author: -5,
                recipients: [exports.utils.getNotificationMail() || 'mars.zhou@icloud.com'],
                bcc: ['mars.zhou@icloud.com'],
                subject: ("\u540E\u53F0\u811A\u672C\u8FD0\u884C\u9519\u8BEF(" + runtime.getCurrentScript().id.replace('customscript_', '') + ":" + stage + ")").toUpperCase(),
                body: "\n                Account: " + runtime.accountId + "<br />\n                Environment: " + runtime.envType + "<br />\n                Context: " + runtime.executionContext + "<br />\n                Log Level: " + runtime.getCurrentScript().logLevel + "<br />\n                User: " + runtime.getCurrentUser().email + "<br />\n                Error: " + e.name + "<br />\n                Messages:<br /><br />\n                " + e.message + "\n            "
            });
        },
        handleErrorInStage: function (stage, summary) {
            var messages = [];
            summary.errors.iterator().each(function (key, value) {
                messages.push("<b>Failure to handle stage (" + stage + ") for key " + key + " details as:</b><br />" + value);
                return true;
            });
            if (messages.length > 0) {
                exports.utils.handleErrorAndSendNotification(error.create({
                    name: '_MAP_REDUCE_BACKGROUND_FAILED_',
                    message: messages.join('<br /><br />')
                }), stage);
            }
        },
        summarize: function (summary) {
            if (summary.inputSummary.error) {
                exports.utils.handleErrorAndSendNotification(error.create({
                    name: '_AIO_MAP_REDUCE_FAILED_',
                    message: summary.inputSummary.error
                }), 'INPUT');
            }
            exports.utils.handleErrorInStage('MAP', summary.mapSummary);
            exports.utils.handleErrorInStage('REDUCE', summary.reduceSummary);
            /* email.send({ author: -5, recipients: ['mars.zhou@icloud.com'], subject: `${runtime.accountId} DONE Notification ${runtime.getCurrentScript().id}`.toUpperCase(), body: 'DONE!' }) */
        },
        sumBy: function (obj_list) {
            var els = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                els[_i - 1] = arguments[_i];
            }
            return obj_list.map(function (obj) {
                return Number(els.reduce(function (p, c) {
                    return p[c];
                }, obj));
            }).reduce(function (sum, current) {
                return sum + current;
            }, 0);
        },
        getTextContentSafe: function (res, tag) {
            return res.getElementsByTagName({ tagName: tag }).length ? res.getElementsByTagName({ tagName: tag })[0].textContent : '';
            // return xml.XPath.select({ node: res, xpath: path }).length ? xml.XPath.select({ node: res, xpath: path })[0].textContent : '';
        },
        md5: function (body) {
            var md5 = crypto.createHash({ algorithm: crypto.HashAlg.MD5 });
            md5.update({ input: body, inputEncoding: encode.Encoding.UTF_8 });
            return md5.digest({ outputEncoding: encode.Encoding.HEX });
        },
        md5_1: function (body) { 
            var md5 = crypto.createHash({ algorithm: crypto.HashAlg.MD5 });
            md5.update({ input: body});
            return md5.digest({ outputEncoding: encode.Encoding.BASE_64 });
        },
        uniq: function (array) {
            var temp = {},
                r = [],
                len = array.length;
            for (var i = 0; i < len; i++) {
                var val = array[i],
                    type = typeof val;
                if (!temp[val]) {
                    temp[val] = [type];
                    r.push(val);
                } else if (temp[val].indexOf(type) < 0) {
                    temp[val].push(type);
                    r.push(val);
                }
            }
            return r;
        },
        reversexml: function (el) {
            var string = "<" + el.tagName + ">";
            if (el.firstChild && el.firstChild.nodeType == xml.NodeType.TEXT_NODE) {
                string += el.textContent;
            } else if (el.nodeType == xml.NodeType.ELEMENT_NODE) {
                exports.utils.uniq(el.childNodes.map(function (node) {
                    return node.nodeName;
                })).map(function (tag) {
                    el.getElementsByTagName({
                        tagName: tag
                    }).map(function (el) {
                        return string += exports.utils.reversexml(el);
                    });
                });
            }
            string += "</" + el.tagName + ">";
            return string;
        }
    };
    exports.amazon = {
        bodies: Object.keys(consts.fieldsMapping._LIST_ORDERS_.mapping),
        fields: ['custrecord_aio_seller_id', 'custrecord_aio_account_region', 'custrecord_aio_enabled_sites', 'custrecord_aio_mws_auth_token', 'custrecord_aio_dev_account', 'custrecord_aio_if_handle_removal_report', 'custrecord_aio_if_including_fees', 'custrecord_aio_if_handle_custrtn_report', 'custrecord_aio_asin_field', 'custrecord_aio_asin_field_value', 'custrecord_aio_to_default_from_location', 'custrecord_aio_if_handle_inv_report', 'custrecord_aio_to_form', 'custrecord_aio_if_handle_sett_report'],
        /**
         * TODO 获取账号列表，包含敏感信恄1�7
         */
        getAccountList: function (region) {
            var t = fiedls.account, tsite = fiedls.amazon_global_sites, tdev = fiedls.amazon_dev_accounts;
            var accounts = [];
            var filters = [{
                    name: 'custrecord_aio_marketplace',
                    operator: 'anyof',
                    values: 1 /* amazon */
                },
                {
                    name: 'custrecord_aio_seller_id',
                    operator: 'isnotempty'
                },
                /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                {
                    name: 'custrecord_aio_dev_account',
                    operator: 'noneof',
                    values: '@NONE@'
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                },
            ];
            if (region) {
                filters.push({
                    name: 'custrecord_aio_account_region',
                    operator: 'is',
                    values: region
                });
            }
            search.create({
                type: t._name,
                filters: filters,
                columns: [
                    /** * 名称 * @index 0 */
                    {
                        name: 'name'
                    },
                    /** * 账户API信息 * @index 1 */
                    {
                        name: t.seller_id
                    },
                    {
                        name: t.mws_auth_token
                    },
                    {
                        name: tsite.amazon_marketplace_id,
                        join: t.enabled_sites
                    },
                    {
                        name: tsite.amazon_mws_endpoint,
                        join: t.enabled_sites
                    },
                    {
                        name: tdev.aws_access_key_id,
                        join: t.dev_account
                    },
                    {
                        name: tdev.secret_key_guid,
                        join: t.dev_account
                    },
                    /** * 账户基础信息 * @index 7 * */
                    {
                        name: 'name'
                    },
                    {
                        name: t.currency
                    },
                    {
                        name: 'custrecord_aio_if_salesorder'
                    },
                    {
                        name: 'custrecord_aio_salesorder_type'
                    },
                    {
                        name: 'custrecord_aio_salesorder_form'
                    },
                    {
                        name: 'custrecord_aio_salesorder_location'
                    },
                    {
                        name: 'custrecord_aio_salesorder_start_date'
                    },
                    /** * FBA信息 * @index 14 */
                    {
                        name: 'custrecord_aio_if_fbaorder'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_type'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_form'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_location'
                    },
                    {
                        name: 'custrecord_aio_fbaorder_start_date'
                    },
                    /**@index 19 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_including_fees'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 其他信息 * @index 28 */
                    {
                        name: 'custrecord_aio_dept'
                    },
                    {
                        name: 'custrecord_aio_salesorder_payment_method'
                    },
                    {
                        name: 'custrecord_aio_discount_item'
                    },
                    {
                        name: 'custrecord_aio_tax_item'
                    },
                    {
                        name: tsite.amazon_currency,
                        join: t.enabled_sites
                    },
                    /** * 公司信息 * @index 33 */
                    exports.utils.checkIfSubsidiaryEnabled() ? {
                        name: 'custrecord_aio_subsidiary'
                    } : {
                        name: 'formulanumeric',
                        formula: '0'
                    },
                    /** * 报告抓取信息 * @index 34 */
                    {
                        name: 'custrecord_aio_if_handle_removal_report'
                    },
                    {
                        name: 'custrecord_aio_if_handle_custrtn_report'
                    },
                    /** * Preferences * @index 36 */
                    {
                        name: 'custrecord_aio_if_only_paid_orders'
                    },
                    {
                        name: 'custrecord_aio_salesorder_if_taxed'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_rate_ipt'
                    },
                    {
                        name: 'custrecord_aio_salesorder_tax_auto_calc'
                    },
                    {
                        name: 'custrecord_aio_if_zero_price'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_email'
                    },
                    {
                        name: 'custrecord_aio_if_check_customer_addr'
                    },
                    {
                        name: 'custrecord_aio_if_payment_as_tran_date'
                    },
                    /** * 待扩展的放这个下面，上面次序不要叄1�7 * @index 44 */
                    {
                        name: 'custrecord_aio_if_handle_inv_report'
                    },
                    {
                        name: 'custrecord_aio_to_default_from_location'
                    },
                    {
                        name: 'custrecord_aio_shipping_item'
                    },
                    {
                        name: 'custrecord_aio_to_form'
                    },
                    /** @index 48 */
                    {
                        name: fiedls.account.if_post_order_fulfillment
                    },
                    {
                        name: fiedls.account.post_order_if_search
                    },
                    {
                        name: fiedls.account.if_handle_sett_report
                    },
                    {
                        name: 'custrecord_account_vat_number'
                    },
                ]
            }).run().each(function (rec) {
                accounts.push({
                    id: rec.id,
                    auth_meta: {
                        seller_id: rec.getValue(rec.columns[1]),
                        auth_token: rec.getValue(rec.columns[2]),
                        access_id: rec.getValue(rec.columns[5]),
                        sec_key: rec.getValue(rec.columns[6]),
                        end_point: rec.getValue(rec.columns[4]),
                    },
                    info: {
                        name: rec.getValue(rec.columns[7]),
                        currency: rec.getValue(rec.columns[8]),
                        if_salesorder: rec.getValue(rec.columns[9]),
                        salesorder_type: rec.getValue(rec.columns[10]),
                        salesorder_form: rec.getValue(rec.columns[11]),
                        salesorder_location: rec.getValue(rec.columns[12]),
                        salesorder_start_date: rec.getValue(rec.columns[13]),
                        dept: rec.getValue(rec.columns[28]),
                        salesorder_payment_method: rec.getValue(rec.columns[29]),
                        discount_item: rec.getValue(rec.columns[30]),
                        shipping_cost_item: rec.getValue(rec.columns[46]),
                        tax_item: rec.getValue(rec.columns[31]),
                        site_currency: rec.getValue(rec.columns[32]),
                        subsidiary: Number(rec.getValue(rec.columns[33])),
                        enable_tracking_: rec.getValue(rec.columns[48]),
                        enabled_tracking_upload_search: rec.getValue(rec.columns[49]),
                    },
                    extra_info: {
                        if_fbaorder: rec.getValue(rec.columns[14]),
                        fbaorder_type: rec.getValue(rec.columns[15]),
                        fbaorder_form: rec.getValue(rec.columns[16]),
                        fbaorder_location: rec.getValue(rec.columns[17]),
                        fbaorder_start_date: rec.getValue(rec.columns[18]),
                        if_including_fees: rec.getValue(rec.columns[26]),
                        if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                        if_handle_removal_report: rec.getValue(rec.columns[34]),
                        if_handle_inventory_report: rec.getValue(rec.columns[44]),
                        if_handle_settlement_report: rec.getValue(rec.columns[50]),
                        to_default_from_location: rec.getValue(rec.columns[45]),
                        aio_to_default_form: rec.getValue(rec.columns[47]),
                    },
                    marketplace: rec.getValue(rec.columns[3]),
                    vat_number: rec.getValue(rec.columns[51]),
                    preference: {
                        if_only_paid_orders: rec.getValue(rec.columns[36]),
                        salesorder_if_taxed: rec.getValue(rec.columns[37]),
                        salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                        salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                        if_zero_price: rec.getValue(rec.columns[40]),
                        if_check_customer_email: rec.getValue(rec.columns[41]),
                        if_check_customer_addr: rec.getValue(rec.columns[42]),
                        if_payment_as_tran_date: rec.getValue(rec.columns[43]),
                    }
                });
                return true;
            });
            return accounts;
        },
        requestReport: function (account, type, params) {
            if (params === void 0) {
                params = {};
            }
            params['ReportType'] = enums.report_type[type];
            log.debug("params1", params);
            var content = exports.amazon.mwsRequestMaker(account.auth_meta, 'RequestReport', '2009-01-01', params),
                res = xml.Parser.fromString({
                    text: content
                }),
                request_id = res.getElementsByTagName({
                    tagName: 'ReportRequestId'
                }).length ? res.getElementsByTagName({
                    tagName: 'ReportRequestId'
                })[0].textContent : null,
                _ = fiedls.amazon_report;
            log.audit('content', content);
            if (request_id) {
                var r = record.create({
                    type: _._name,
                    isDynamic: true
                });
                r.setValue({
                    fieldId: 'custrecord_aio_origin_account',
                    value: account.id
                });
                r.setValue({
                    fieldId: _.origin_sellerid,
                    value: account.auth_meta.seller_id
                });
                r.setValue({
                    fieldId: _.origin_report_type,
                    value: type
                });
                r.setValue({
                    fieldId: _.origin_report_request_id,
                    value: request_id
                });
                r.save();
            }
            return request_id;
        },
        /**
         * requestReport的姊妹函数，专门用于不需要request的报呄1�7
         * 为了不育其他第三方对接应用数据重合，AIO默认只会拿自己Request的报呄1�7
         * ! 此函数仅用于获取非自主Request的报告类型，谨慎使用＄1�7
         * @param account 账号
         */
        requestReportFake: function (account, type) {
            var _ = fiedls.amazon_report,
                content = exports.amazon.mwsRequestMaker(account.auth_meta, 'GetReportList', '2009-01-01', {
                    'ReportTypeList.Type.1': enums.report_type[type]
                }),
                res = xml.Parser.fromString({
                    text: content
                });
            log.debug('requestReportFake:res', res);
            res.getElementsByTagName({
                tagName: 'ReportInfo'
            }).map(function (info) {
                log.debug('requestReportFake:ReportInfo', info);
                var report_is_exists = search.create({
                    type: _._name,
                    filters: [{
                            name: _.origin_sellerid,
                            operator: search.Operator.IS,
                            values: account.auth_meta.seller_id
                        },
                        {
                            name: _.origin_report_request_id,
                            operator: search.Operator.IS,
                            values: exports.utils.getTextContentSafe(info, 'ReportRequestId')
                        },
                    ]
                }).run().getRange({
                    start: 0,
                    end: 1
                }).length > 0;
                if (!report_is_exists) {
                    var r = record.create({
                        type: _._name,
                        isDynamic: true
                    });
                    r.setValue({
                        fieldId: _.origin_sellerid,
                        value: account.auth_meta.seller_id
                    });
                    r.setValue({
                        fieldId: _.origin_report_type,
                        value: type
                    });
                    r.setValue({
                        fieldId: _.origin_report_request_id,
                        value: exports.utils.getTextContentSafe(info, 'ReportRequestId')
                    });
                    r.save();
                }
            });
        },
        getRequestingReportList: function (account, type) {
            var _ = fiedls.amazon_report;
            var rids = [],
                params = {},
                reports = [];
            search.create({
                type: _._name,
                filters: [{
                        name: _.origin_sellerid,
                        operator: 'is',
                        values: account.auth_meta.seller_id
                    },
                    {
                        name: _.origin_report_type,
                        operator: 'is',
                        values: type
                    },
                    {
                        name: _.origin_report_id,
                        operator: 'isempty'
                    },
                    {
                        name: _.origin_report_request_id,
                        operator: 'isnotempty'
                    },
                    {
                        name: _.origin_report_status,
                        operator: 'isnot',
                        values: '_DONE_'
                    },
                    {
                        name: _.origin_report_status,
                        operator: 'isnot',
                        values: '_DONE_NO_DATA_'
                    }
                ],
                columns: [{
                    name: _.origin_report_request_id
                }]
            }).run().each(function (rec) {
                rids.push(rec.getValue(rec.columns[0]));
                return true;
            });
            log.debug('getRequestingReportList:rids', rids);
            if (rids.length > 0) {
                rids.map(function (id, key) {
                    return params["ReportRequestIdList.Id." + (key + 1)] = id;
                });
                var content = exports.amazon.mwsRequestMaker(account.auth_meta, 'GetReportRequestList', '2009-01-01', params),
                    res = xml.Parser.fromString({
                        text: content
                    }),
                    request_report_list = res.getElementsByTagName({
                        tagName: 'ReportRequestInfo'
                    }).map(function (node) {
                        return {
                            report_request_id: node.getElementsByTagName({
                                tagName: 'ReportRequestId'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ReportRequestId'
                            })[0].textContent : '',
                            report_type: node.getElementsByTagName({
                                tagName: 'ReportType'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ReportType'
                            })[0].textContent : '',
                            start_date: node.getElementsByTagName({
                                tagName: 'StartDate'
                            }).length ? node.getElementsByTagName({
                                tagName: 'StartDate'
                            })[0].textContent : '',
                            end_date: node.getElementsByTagName({
                                tagName: 'EndDate'
                            }).length ? node.getElementsByTagName({
                                tagName: 'EndDate'
                            })[0].textContent : '',
                            scheduled: node.getElementsByTagName({
                                tagName: 'Scheduled'
                            }).length ? node.getElementsByTagName({
                                tagName: 'Scheduled'
                            })[0].textContent : '',
                            submitted_date: node.getElementsByTagName({
                                tagName: 'SubmittedDate'
                            }).length ? node.getElementsByTagName({
                                tagName: 'SubmittedDate'
                            })[0].textContent : '',
                            report_processing_status: node.getElementsByTagName({
                                tagName: 'ReportProcessingStatus'
                            }).length ? node.getElementsByTagName({
                                tagName: 'ReportProcessingStatus'
                            })[0].textContent : '',
                            generated_report_id: node.getElementsByTagName({
                                tagName: 'GeneratedReportId'
                            }).length ? node.getElementsByTagName({
                                tagName: 'GeneratedReportId'
                            })[0].textContent : '',
                            started_processing_date: node.getElementsByTagName({
                                tagName: 'StartedProcessingDate'
                            }).length ? node.getElementsByTagName({
                                tagName: 'StartedProcessingDate'
                            })[0].textContent : '',
                            completed_date: node.getElementsByTagName({
                                tagName: 'CompletedDate'
                            }).length ? node.getElementsByTagName({
                                tagName: 'CompletedDate'
                            })[0].textContent : '',
                        };
                    });
                log.debug('getRequestingReportList:content', content);
                /** 更新状�1�7�1�7 */
                request_report_list.map(function (report) {
                    log.debug('getRequestingReportList:report', report);
                    search.create({
                        type: _._name,
                        filters: [{
                            name: _.origin_report_request_id,
                            operator: 'is',
                            values: report.report_request_id
                        }]
                    }).run().each(function (rec) {
                        var r = record.load({
                            type: _._name,
                            id: rec.id
                        });
                        r.setValue({
                            fieldId: _.origin_report_id,
                            value: report.generated_report_id
                        });
                        r.setValue({
                            fieldId: _.origin_report_start_date,
                            value: report.start_date
                        });
                        r.setValue({
                            fieldId: _.origin_report_end_date,
                            value: report.end_date
                        });
                        r.setValue({
                            fieldId: _.origin_report_if_schedule,
                            value: report.scheduled == 'true'
                        });
                        r.setValue({
                            fieldId: _.origin_report_submit_date,
                            value: report.submitted_date
                        });
                        r.setValue({
                            fieldId: _.origin_report_status,
                            value: report.report_processing_status
                        });
                        r.setValue({
                            fieldId: _.origin_report_start_pdate,
                            value: report.started_processing_date
                        });
                        r.setValue({
                            fieldId: _.origin_report_comp_date,
                            value: report.completed_date
                        });
                        r.save();
                        return true;
                    });
                });
            }
            /** 为避免漏掉，这里重新查询丄1�7欄1�7 */
            search.create({
                type: _._name,
                filters: [{
                        name: _.origin_sellerid,
                        operator: 'is',
                        values: account.auth_meta.seller_id
                    },
                    {
                        name: _.origin_report_type,
                        operator: 'is',
                        values: type
                    },
                    {
                        name: _.origin_report_id,
                        operator: 'isnotempty'
                    },
                    {
                        name: _.origin_report_is_download,
                        operator: 'is',
                        values: false
                    },
                    {
                        name: _.origin_report_status,
                        operator: 'is',
                        values: '_DONE_'
                    },
                ],
                columns: [{
                    name: _.origin_report_id
                }]
            }).run().each(function (rec) {
                /** 进行抓取 */
                reports.push({
                    id: Number(rec.id),
                    lines: papa.parse(exports.amazon.getReport(account, rec.getValue(rec.columns[0])), {
                        header: true,
                        skipEmptyLines: true
                    }).data
                });
                return true;
            });
            return reports;
        },
        getReport: function (account, report_id) {
            // var report = 
            // exports.amazon.mwsRequestMaker(account.auth_meta, 'GetReport', '2009-01-01', { 'ReportId': report_id });
            //  var fileObj = file.create({
            //       name: 'report'+report_id+'.csv',
            //       fileType: file.Type.CSV,
            //       contents: report,
            //       folder : -15,
            //       isOnline : true
            //       });
            //  fileObj.save();
            //  return report;
            return exports.amazon.mwsRequestMaker(account.auth_meta, 'GetReport', '2009-01-01', {
                'ReportId': report_id
            });
        },

        getRecentOrders: function (account, fulfillmentChannel, nextToken, orderIds) {
            var lastUpdatedAfter = moment().subtract(moment.duration(1, 'hours')).startOf('hour').toISOString();
            var content = '',
                orders = [];
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(account.auth_meta, 'ListOrdersByNextToken', '2013-09-01', {
                    NextToken: nextToken
                }, '/Orders/2013-09-01');
            } else if (orderIds) {
                var params_1 = {};
                //                orderIds.map(function (id, k) {
                //                    params_1["AmazonOrderId.Id." + (k + 1)] = id;
                //                });
                params_1["AmazonOrderId.Id.1"] = orderIds;
                content = exports.amazon.mwsRequestMaker(account.auth_meta, 'GetOrder', '2013-09-01', params_1, '/Orders/2013-09-01');
            } else {
                if (fulfillmentChannel == 'ALL') {
                    content = exports.amazon.mwsRequestMaker(account.auth_meta, 'ListOrders', '2013-09-01', {
                        'MarketplaceId.Id.1': account.marketplace,
                        'LastUpdatedAfter': lastUpdatedAfter,
                    }, '/Orders/2013-09-01');
                } else {
                    content = exports.amazon.mwsRequestMaker(account.auth_meta, 'ListOrders', '2013-09-01', {
                        'MarketplaceId.Id.1': account.marketplace,
                        'LastUpdatedAfter': lastUpdatedAfter,
                        'FulfillmentChannel.Channel.1': fulfillmentChannel ? fulfillmentChannel : 'All',
                    }, '/Orders/2013-09-01');
                }
            }
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'Order'
            }).map(function (node) {
                orders.push({
                    latest_delivery_date: node.getElementsByTagName({
                        tagName: 'LatestDeliveryDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LatestDeliveryDate'
                    })[0].textContent : '',
                    latest_ship_date: node.getElementsByTagName({
                        tagName: 'LatestShipDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LatestShipDate'
                    })[0].textContent : '',
                    order_type: node.getElementsByTagName({
                        tagName: 'OrderType'
                    }).length ? node.getElementsByTagName({
                        tagName: 'OrderType'
                    })[0].textContent : '',
                    purchase_date: node.getElementsByTagName({
                        tagName: 'PurchaseDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PurchaseDate'
                    })[0].textContent : '',
                    is_replacement_order: node.getElementsByTagName({
                        tagName: 'IsReplacementOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsReplacementOrder'
                    })[0].textContent == 'true' : false,
                    last_update_date: node.getElementsByTagName({
                        tagName: 'LastUpdateDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'LastUpdateDate'
                    })[0].textContent : '',
                    buyer_email: node.getElementsByTagName({
                        tagName: 'BuyerEmail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'BuyerEmail'
                    })[0].textContent : '',
                    amazon_order_id: node.getElementsByTagName({
                        tagName: 'AmazonOrderId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'AmazonOrderId'
                    })[0].textContent : '',
                    number_of_items_shipped: node.getElementsByTagName({
                        tagName: 'NumberOfItemsShipped'
                    }).length ? node.getElementsByTagName({
                        tagName: 'NumberOfItemsShipped'
                    })[0].textContent : '',
                    ship_service_level: node.getElementsByTagName({
                        tagName: 'ShipServiceLevel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShipServiceLevel'
                    })[0].textContent : '',
                    order_status: node.getElementsByTagName({
                        tagName: 'OrderStatus'
                    }).length ? node.getElementsByTagName({
                        tagName: 'OrderStatus'
                    })[0].textContent : '',
                    sales_channel: node.getElementsByTagName({
                        tagName: 'SalesChannel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'SalesChannel'
                    })[0].textContent : '',
                    is_business_order: node.getElementsByTagName({
                        tagName: 'IsBusinessOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsBusinessOrder'
                    })[0].textContent == 'true' : false,
                    number_of_items_unshipped: node.getElementsByTagName({
                        tagName: 'NumberOfItemsUnshipped'
                    }).length ? node.getElementsByTagName({
                        tagName: 'NumberOfItemsUnshipped'
                    })[0].textContent : '',
                    buyer_name: node.getElementsByTagName({
                        tagName: 'BuyerName'
                    }).length ? node.getElementsByTagName({
                        tagName: 'BuyerName'
                    })[0].textContent : '',
                    is_premium_order: node.getElementsByTagName({
                        tagName: 'IsPremiumOrder'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsPremiumOrder'
                    })[0].textContent == 'true' : false,
                    earliest_delivery_date: node.getElementsByTagName({
                        tagName: 'EarliestDeliveryDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'EarliestDeliveryDate'
                    })[0].textContent : '',
                    earliest_ship_date: node.getElementsByTagName({
                        tagName: 'EarliestShipDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'EarliestShipDate'
                    })[0].textContent : '',
                    marketplace_id: node.getElementsByTagName({
                        tagName: 'MarketplaceId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'MarketplaceId'
                    })[0].textContent : '',
                    fulfillment_channel: node.getElementsByTagName({
                        tagName: 'FulfillmentChannel'
                    }).length ? node.getElementsByTagName({
                        tagName: 'FulfillmentChannel'
                    })[0].textContent : '',
                    payment_method: node.getElementsByTagName({
                        tagName: 'PaymentMethod'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentMethod'
                    })[0].textContent : '',
                    is_prime: node.getElementsByTagName({
                        tagName: 'IsPrime'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsPrime'
                    })[0].textContent == 'true' : false,
                    shipment_service_level_category: node.getElementsByTagName({
                        tagName: 'ShipmentServiceLevelCategory'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShipmentServiceLevelCategory'
                    })[0].textContent : '',
                    seller_order_id: node.getElementsByTagName({
                        tagName: 'SellerOrderId'
                    }).length ? node.getElementsByTagName({
                        tagName: 'SellerOrderId'
                    })[0].textContent : '',
                    shipped_byamazont_fm: node.getElementsByTagName({
                        tagName: 'ShippedByAmazonTFM'
                    }).length ? node.getElementsByTagName({
                        tagName: 'ShippedByAmazonTFM'
                    })[0].textContent == 'true' : false,
                    tfm_shipment_status: node.getElementsByTagName({
                        tagName: 'TFMShipmentStatus'
                    }).length ? node.getElementsByTagName({
                        tagName: 'TFMShipmentStatus'
                    })[0].textContent : '',
                    promise_response_due_date: node.getElementsByTagName({
                        tagName: 'PromiseResponseDueDate'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PromiseResponseDueDate'
                    })[0].textContent : '',
                    is_estimated_ship_date_set: node.getElementsByTagName({
                        tagName: 'IsEstimatedShipDateSet'
                    }).length ? node.getElementsByTagName({
                        tagName: 'IsEstimatedShipDateSet'
                    })[0].textContent == 'true' : false,
                    // 注意，这里直接取的下丄1�7层，扄1�7以只会取丄1�7丄1�7
                    payment_method_detail: node.getElementsByTagName({
                        tagName: 'PaymentMethodDetail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentMethodDetail'
                    })[0].textContent : '',
                    payment_execution_detail: node.getElementsByTagName({
                        tagName: 'PaymentExecutionDetail'
                    }).length ? node.getElementsByTagName({
                        tagName: 'PaymentExecutionDetail'
                    })[0].textContent : '',
                    order_total: node.getElementsByTagName({
                        tagName: 'OrderTotal'
                    }).length ? {
                        currency_code: node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'CurrencyCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'CurrencyCode'
                        })[0].textContent : '',
                        amount: node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'Amount'
                        }).length ? Number(node.getElementsByTagName({
                            tagName: 'OrderTotal'
                        })[0].getElementsByTagName({
                            tagName: 'Amount'
                        })[0].textContent) : 0,
                    } : {
                        currency_code: '_UNKNOW_',
                        amount: 0
                    },
                    shipping_address: node.getElementsByTagName({
                        tagName: 'ShippingAddress'
                    }).length ? {
                        city: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'City'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'City'
                        })[0].textContent : '',
                        postal_code: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'PostalCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'PostalCode'
                        })[0].textContent : '',
                        state_or_oegion: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'StateOrRegion'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'StateOrRegion'
                        })[0].textContent : '',
                        country_code: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'CountryCode'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'CountryCode'
                        })[0].textContent : '',
                        name: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'Name'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'Name'
                        })[0].textContent : '',
                        address_line1: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine1'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine1'
                        })[0].textContent : '',
                        address_line2: node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine2'
                        }).length ? node.getElementsByTagName({
                            tagName: 'ShippingAddress'
                        })[0].getElementsByTagName({
                            tagName: 'AddressLine2'
                        })[0].textContent : ''
                    } : null,
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                /** 考虑亚马逊限制可能产生错评1�7 */
                try {
                    exports.amazon.getRecentOrders(account, fulfillmentChannel, res.getElementsByTagName({
                        tagName: 'NextToken'
                    })[0].textContent).map(function (ord) {
                        orders.push(ord);
                    });
                } catch (e) {
                    log.error('注意，获取订单不完整，自动截斄1�7', {
                        name: account.info.name,
                        acc_id: account.id,
                        orders_count: orders.length,
                    });
                }
            }
            return orders;
        },
        getOrderItems: function (auth, amazon_order_id, nextToken) {
            var content = '',
                lines = [];
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListOrderItemsByNextToken', '2013-09-01', {
                    'NextToken': nextToken
                }, '/Orders/2013-09-01');
            } else {
                content = exports.amazon.mwsRequestMaker(auth, 'ListOrderItems', '2013-09-01', {
                    'AmazonOrderId': amazon_order_id
                }, '/Orders/2013-09-01');
            }
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'OrderItem'
            }).map(function (item) {
                lines.push({
                    title: item.getElementsByTagName({
                        tagName: 'Title'
                    }).length ? item.getElementsByTagName({
                        tagName: 'Title'
                    })[0].textContent : '',
                    cod_fee: item.getElementsByTagName({
                        tagName: 'CODFee'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'CODFee'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    cod_fee_discount: item.getElementsByTagName({
                        tagName: 'CODFeeDiscount'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'CODFeeDiscount'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    gift_message_text: item.getElementsByTagName({
                        tagName: 'GiftMessageText'
                    }).length ? item.getElementsByTagName({
                        tagName: 'GiftMessageText'
                    })[0].textContent : '',
                    gift_wrap_level: item.getElementsByTagName({
                        tagName: 'GiftWrapLevel'
                    }).length ? item.getElementsByTagName({
                        tagName: 'GiftWrapLevel'
                    })[0].textContent : '',
                    promotion_ids: item.getElementsByTagName({
                        tagName: 'PromotionIds'
                    }).length ? (item.getElementsByTagName({
                        tagName: 'PromotionIds'
                    }).map(function (promotion) {
                        return promotion.getElementsByTagName({
                            tagName: 'PromotionId'
                        })[0].textContent;
                    }).join(',')) : '',
                    qty: item.getElementsByTagName({
                        tagName: 'QuantityOrdered'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'QuantityOrdered'
                    })[0].textContent) : 0,
                    promotion_discount: item.getElementsByTagName({
                        tagName: 'PromotionDiscount'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'PromotionDiscount'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    is_gift: item.getElementsByTagName({
                        tagName: 'IsGift'
                    }).length ? item.getElementsByTagName({
                        tagName: 'IsGift'
                    })[0].textContent : '',
                    asin: item.getElementsByTagName({
                        tagName: 'ASIN'
                    }).length ? item.getElementsByTagName({
                        tagName: 'ASIN'
                    })[0].textContent : '',
                    seller_sku: item.getElementsByTagName({
                        tagName: 'SellerSKU'
                    }).length ? item.getElementsByTagName({
                        tagName: 'SellerSKU'
                    })[0].textContent : '',
                    order_item_id: item.getElementsByTagName({
                        tagName: 'OrderItemId'
                    }).length ? item.getElementsByTagName({
                        tagName: 'OrderItemId'
                    })[0].textContent : '',
                    item_price: item.getElementsByTagName({
                        tagName: 'ItemPrice'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'ItemPrice'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    item_tax: item.getElementsByTagName({
                        tagName: 'ItemTax'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'ItemTax'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    shipping_price: item.getElementsByTagName({
                        tagName: 'ShippingPrice'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'ShippingPrice'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    gift_wrap_price: item.getElementsByTagName({
                        tagName: 'GiftWrapPrice'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'GiftWrapPrice'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    shipping_tax: item.getElementsByTagName({
                        tagName: 'ShippingTax'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'ShippingTax'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                    shipping_discount: item.getElementsByTagName({
                        tagName: 'ShippingDiscount'
                    }).length ? Number(item.getElementsByTagName({
                        tagName: 'ShippingDiscount'
                    })[0].getElementsByTagName({
                        tagName: 'Amount'
                    })[0].textContent) : 0,
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                exports.amazon.getOrderItems(auth, amazon_order_id, res.getElementsByTagName({
                    tagName: 'NextToken'
                })[0].textContent).map(function (line) {
                    lines.push(line);
                });
            }
            return lines;
        },
        listFinancialEvents: function (auth, tranid, nextToken) {
            var content = '',
                events, shipment_event_list = [],
                refund_event_list = [],
                guarantee_claim_event_list = [],
                chargeback_event_list = [];
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListFinancialEventsByNextToken', '2015-05-01', {
                    NextToken: nextToken
                }, '/Finances/2015-05-01');
            } else if (tranid) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListFinancialEvents', '2015-05-01', {
                    AmazonOrderId: tranid,
                }, '/Finances/2015-05-01');
            } else {
                content = exports.amazon.mwsRequestMaker(auth, 'ListFinancialEvents', '2015-05-01', {
                    PostedAfter: moment.utc().subtract(moment.duration(3, 'days')).startOf('day').toISOString(),
                    PostedBefore: moment.utc().subtract(moment.duration(1, 'days')).endOf('day').toISOString(),
                }, '/Finances/2015-05-01');
            }
            var res = xml.Parser.fromString({
                text: content
            });

            /** SHIPMENT EVENT LIST */
            xml.XPath.select({
                node: res, 
                xpath: '//nlapi:ShipmentEventList/nlapi:ShipmentEvent'
            }).map(function (_, k1) {
                // log.audit('xpath shipment event looping', k1);
                var shipment_event = {
                    type: '_shipment_',
                    amazon_order_id: exports.utils.getTextContentSafe(_, "AmazonOrderId"),
                    seller_order_id: exports.utils.getTextContentSafe(_, "SellerOrderId"),
                    marketplace_name: exports.utils.getTextContentSafe(_, "MarketplaceName"),
                    posted_date: exports.utils.getTextContentSafe(_, "PostedDate"),
                    order_charge_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:OrderChargeList/nlapi:ChargeComponent"
                    }).map(function (_, k2) {
                        return {
                            charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                            charge_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    order_charge_adjustment_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:OrderChargeAdjustmentList/nlapi:ChargeComponent"
                    }).map(function (_, k2) {
                        return {
                            charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                            charge_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    shipment_fee_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentFeeList/nlapi:FeeComponent"
                    }).map(function (_, k2) {
                        return {
                            fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                            fee_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    shipment_fee_adjustment_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentFeeAdjustmentList/nlapi:FeeComponent"
                    }).map(function (_, k2) {
                        return {
                            fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                            fee_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    order_fee_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:OrderFeeList/nlapi:FeeComponent"
                    }).map(function (_, k2) {
                        return {
                            fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                            fee_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    order_fee_adjustment_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:OrderFeeAdjustmentList/nlapi:FeeComponent"
                    }).map(function (_, k2) {
                        return {
                            fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                            fee_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    direct_payment_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:DirectPaymentList/nlapi:DirectPayment"
                    }).map(function (_, k2) {
                        return {
                            direct_payment_type: exports.utils.getTextContentSafe(_, "DirectPaymentType"),
                            direct_payment_amount: {
                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                            }
                        };
                    }),
                    shipment_item_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem"
                    }).map(function (_, k2) {
                        return {
                            seller_sku: exports.utils.getTextContentSafe(_, "SellerSKU"),
                            order_item_id: exports.utils.getTextContentSafe(_, "OrderItemId"),
                            order_adjustment_item_id: exports.utils.getTextContentSafe(_, "OrderAdjustmentItemId"),
                            quantity_shipped: Number(exports.utils.getTextContentSafe(_, "QuantityShipped")),
                            item_charge_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemChargeList/nlapi:ChargeComponent"
                            }).map(function (_, k3) {
                                return {
                                    charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                    charge_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_tax_withheld_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemTaxWithheldList/nlapi:TaxWithheldComponent"
                            }).map(function (_, k3) {
                                return {
                                    tax_collection_model: exports.utils.getTextContentSafe(_, "TaxCollectionModel"),
                                    taxes_withheld: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemTaxWithheldList/nlapi:TaxWithheldComponent[" + (k3 + 1) + "]/nlapi:TaxesWithheld/nlapi:ChargeComponent"
                                    }).map(function (_, k4) {
                                        return {
                                            charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                            charge_amount: {
                                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                            }
                                        };
                                    }),
                                };
                            }),
                            item_charge_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemChargeAdjustmentList/nlapi:ChargeComponent"
                            }).map(function (_, k3) {
                                return {
                                    charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                    charge_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_fee_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemFeeList/nlapi:FeeComponent"
                            }).map(function (_, k3) {
                                return {
                                    fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                                    fee_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_fee_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemFeeAdjustmentList/nlapi:FeeComponent"
                            }).map(function (_, k3) {
                                return {
                                    fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                                    fee_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            promotion_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:PromotionList/nlapi:Promotion"
                            }).map(function (_, k3) {
                                return {
                                    promotion_type: exports.utils.getTextContentSafe(_, "PromotionType"),
                                    promotion_id: exports.utils.getTextContentSafe(_, "PromotionId"),
                                    promotion_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            promotion_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:PromotionAdjustmentList/nlapi:Promotion"
                            }).map(function (_, k3) {
                                return {
                                    promotion_type: exports.utils.getTextContentSafe(_, "PromotionType"),
                                    promotion_id: exports.utils.getTextContentSafe(_, "PromotionId"),
                                    promotion_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            cost_of_points_granted: {
                                currency_code: _.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                })[0], 'CurrencyCode') : '',
                                currency_amount: Number(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                })[0], 'CurrencyAmount') : ''),
                            },
                            cost_of_points_returned: {
                                currency_code: _.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                })[0], 'CurrencyCode') : '',
                                currency_amount: Number(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                })[0], 'CurrencyAmount') : ''),
                            }
                        };
                    }),
                    shipment_item_adjustment_list: xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem"
                    }).map(function (_, k2) {
                        return {
                            seller_sku: exports.utils.getTextContentSafe(_, "SellerSKU"),
                            order_item_id: exports.utils.getTextContentSafe(_, "OrderItemId"),
                            order_adjustment_item_id: exports.utils.getTextContentSafe(_, "OrderAdjustmentItemId"),
                            quantity_shipped: Number(exports.utils.getTextContentSafe(_, "QuantityShipped")),
                            item_charge_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemChargeList/nlapi:ChargeComponent"
                            }).map(function (_, k3) {
                                return {
                                    charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                    charge_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_tax_withheld_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemTaxWithheldList/nlapi:TaxWithheldComponent"
                            }).map(function (_, k3) {
                                return {
                                    tax_collection_model: exports.utils.getTextContentSafe(_, "TaxCollectionModel"),
                                    taxes_withheld: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemTaxWithheldList/nlapi:TaxWithheldComponent[" + (k3 + 1) + "]/nlapi:TaxesWithheld/nlapi:ChargeComponent"
                                    }).map(function (_, k4) {
                                        return {
                                            charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                            charge_amount: {
                                                currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                                currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                            }
                                        };
                                    }),
                                };
                            }),
                            item_charge_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemChargeAdjustmentList/nlapi:ChargeComponent"
                            }).map(function (_, k3) {
                                return {
                                    charge_type: exports.utils.getTextContentSafe(_, "ChargeType"),
                                    charge_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_fee_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemFeeList/nlapi:FeeComponent"
                            }).map(function (_, k3) {
                                return {
                                    fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                                    fee_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            item_fee_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:ItemFeeAdjustmentList/nlapi:FeeComponent"
                            }).map(function (_, k3) {
                                return {
                                    fee_type: exports.utils.getTextContentSafe(_, "FeeType"),
                                    fee_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            promotion_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:PromotionList/nlapi:Promotion"
                            }).map(function (_, k3) {
                                return {
                                    promotion_type: exports.utils.getTextContentSafe(_, "PromotionType"),
                                    promotion_id: exports.utils.getTextContentSafe(_, "PromotionId"),
                                    promotion_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            promotion_adjustment_list: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:ShipmentEventList/nlapi:ShipmentEvent[" + (k1 + 1) + "]/nlapi:ShipmentItemAdjustmentList/nlapi:ShipmentItem[" + (k2 + 1) + "]/nlapi:PromotionAdjustmentList/nlapi:Promotion"
                            }).map(function (_, k3) {
                                return {
                                    promotion_type: exports.utils.getTextContentSafe(_, "PromotionType"),
                                    promotion_id: exports.utils.getTextContentSafe(_, "PromotionId"),
                                    promotion_amount: {
                                        currency_code: exports.utils.getTextContentSafe(_, "CurrencyCode"),
                                        currency_amount: Number(exports.utils.getTextContentSafe(_, "CurrencyAmount"))
                                    }
                                };
                            }),
                            cost_of_points_granted: {
                                currency_code: _.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                })[0], 'CurrencyCode') : '',
                                currency_amount: Number(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsGranted'
                                })[0], 'CurrencyAmount') : ''),
                            },
                            cost_of_points_returned: {
                                currency_code: _.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                })[0], 'CurrencyCode') : '',
                                currency_amount: Number(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                }).length ? exports.utils.getTextContentSafe(_.getElementsByTagName({
                                    tagName: 'CostOfPointsReturned'
                                })[0], 'CurrencyAmount') : ''),
                            }
                        };
                    }),
                };
                shipment_event_list.push(shipment_event);
            });
            events = {
                shipment_event_list: shipment_event_list,
                refund_event_list: refund_event_list,
                guarantee_claim_event_list: guarantee_claim_event_list,
                chargeback_event_list: chargeback_event_list,
                pay_with_amazon_event_list: [],
                service_provider_credit_event_list: [],
                retrocharge_event_list: [],
                rental_transaction_event_list: [],
                performance_bond_refund_event_list: [],
                product_ads_payment_event_list: [],
                service_fee_event_list: [],
                debt_recovery_event_list: [],
                loan_servicing_event_list: [],
                adjustment_event_list: [],
                coupon_payment_event_list: [],
                safe_t_reimbursement_event_list: [],
                seller_review_enrollment_payment_event_list: [],
                fba_liquidation_event_list: [],
                imaging_services_fee_event_list: [],
                network_commingling_transaction_event_list: []
            };
            if (res.getElementsByTagName({ tagName: 'NextToken' }).length > 0) {
                var next = exports.amazon.listFinancialEvents(auth, tranid, res.getElementsByTagName({ tagName: 'NextToken' })[0].textContent);
                for (var event_1 in next) {
                    if (next.hasOwnProperty(event_1)) {
                        events[event_1].push(next[event_1]);
                    }
                }
            }
            return events;
        },
        listInventorySupply: function (auth, marketplace_id, nextToken) {
            var supplies = [],
                query_start_date_time = moment().subtract(moment.duration(24, 'months')).toISOString(),
                params = {
                    'MarketplaceId': marketplace_id,
                    'QueryStartDateTime': query_start_date_time,
                    'ResponseGroup': 'Basic',
                };
            var rest;
            if (nextToken) {
                rest = exports.amazon.mwsRequestMaker(auth, 'ListInventorySupplyByNextToken', '2010-10-01', {
                    NextToken: nextToken
                }, '/FulfillmentInventory/2010-10-01');
            } else {
                rest = exports.amazon.mwsRequestMaker(auth, 'ListInventorySupply', '2010-10-01', params, '/FulfillmentInventory/2010-10-01');
            }
            var res = xml.Parser.fromString({
                text: rest
            });
            res.getElementsByTagName({
                tagName: 'member'
            }).map(function (node) {
                supplies.push({
                    acc_id: null,
                    seller_sku: exports.utils.getTextContentSafe(node, 'SellerSKU'),
                    asin: exports.utils.getTextContentSafe(node, 'ASIN'),
                    total_supply_quantity: exports.utils.getTextContentSafe(node, 'TotalSupplyQuantity'),
                    fnsku: exports.utils.getTextContentSafe(node, 'FNSKU'),
                    condition: exports.utils.getTextContentSafe(node, 'Condition'),
                    supply_detail: exports.utils.getTextContentSafe(node, 'SupplyDetail'),
                    in_stock_supply_quantity: exports.utils.getTextContentSafe(node, 'InStockSupplyQuantity'),
                    earliest_availability: node.getElementsByTagName({
                        tagName: 'EarliestAvailability'
                    }).length ? exports.utils.getTextContentSafe(node.getElementsByTagName({
                        tagName: 'EarliestAvailability'
                    })[0], 'TimepointType') : '',
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                exports.amazon.listInventorySupply(auth, marketplace_id, res.getElementsByTagName({
                    tagName: 'NextToken'
                })[0].textContent).map(function (l) {
                    supplies.push(l);
                });
            }
            return supplies;
        },
        getFeedSubmissionList: function (account_id, auth, submission_ids) {
            log.debug('input', {
                account_id: account_id,
                auth: auth,
                submission_ids: submission_ids
            });
            var params = {
                'MaxCount': 100,
                'SubmittedFromDate': moment().subtract(moment.duration(1, 'month')).startOf('month').toISOString(),
                'SubmittedToDate': moment().toISOString(),
            };
            log.debug("params1", params)

            if (submission_ids) {
                // submission_ids.map(function (id, key) { params["FeedSubmissionIdList.Id." + (key + 1)] = id; });
                params["FeedSubmissionIdList.Id.1"] = submission_ids;
            }
            log.debug("params2", params)
            var content = exports.amazon.mwsRequestMaker(auth, 'GetFeedSubmissionList', '2009-01-01', params, '/Feeds/2009-01-01/'),
                res = xml.Parser.fromString({
                    text: content
                });
            var feeds = [];
            res.getElementsByTagName({
                tagName: 'FeedSubmissionInfo'
            }).map(function (info) {
                feeds.push({
                    feed_submission_id: exports.utils.getTextContentSafe(info, 'FeedSubmissionId'),
                    feed_type: exports.utils.getTextContentSafe(info, 'FeedType'),
                    submitted_date: exports.utils.getTextContentSafe(info, 'SubmittedDate'),
                    feed_processing_status: exports.utils.getTextContentSafe(info, 'FeedProcessingStatus'),
                    started_processing_date: exports.utils.getTextContentSafe(info, 'StartedProcessingDate'),
                    completed_processing_date: exports.utils.getTextContentSafe(info, 'CompletedProcessingDate'),
                });
            });
            feeds.map(function (feed) {
                search.create({
                    type: exports.ns.amazon_feed._name,
                    filters: [{
                            name: exports.ns.amazon_feed.feed_account,
                            operator: search.Operator.IS,
                            values: account_id
                        },
                        {
                            name: exports.ns.amazon_feed.feed_submission_id,
                            operator: search.Operator.IS,
                            values: feed.feed_submission_id
                        }
                    ],
                    columns: [{
                        name: exports.ns.amazon_feed.feed_response
                    }]
                }).run().each(function (rec) {
                    var response = '';
                    if (feed.feed_processing_status == '_DONE_' && "" + rec.getValue(rec.columns[0]) == '') {
                        response = exports.amazon.mwsRequestMaker(auth, 'GetFeedSubmissionResult', '2009-01-01', {
                            FeedSubmissionId: feed.feed_submission_id
                        }, '/Feeds/2009-01-01/');
                        log.debug("response", response);
                    }
                    record.submitFields({
                        type: exports.ns.amazon_feed._name,
                        id: rec.id,
                        values: {
                            'custrecord_aio_submitted_date': feed.submitted_date,
                            'custrecord_aio_feed_processing_status': feed.feed_processing_status,
                            'custrecord_aio_started_processing_date': feed.started_processing_date,
                            'custrecord_aio_completed_processing_date': feed.completed_processing_date,
                            'custrecord_aio_feed_response': response
                        }
                    });
                    return true;
                });
            });
            return feeds;
        },

        listAccount: function () {
            var accounts = [];
            search.create({
                type: 'customrecord_aio_account',
                filters: [{
                        name: 'custrecord_aio_marketplace',
                        operator: 'anyof',
                        values: 1 /* amazon */
                    },
                    {
                        name: 'isinactive',
                        operator: 'is',
                        values: false
                    },
                ],
                columns: [{
                        name: 'name'
                    },
                    {
                        name: 'custrecord_aio_abbr'
                    }
                ]
            }).run().each(function (rec) {
                accounts.push({
                    id: rec.id,
                    name: rec.getValue('name'),
                    abbr: rec.getValue('custrecord_aio_abbr'),
                });
                return true;
            });
            return accounts;
        },
        getAuthByAccountId: function (account_id) {
            var t = fiedls.account,
                t1 = fiedls.amazon_global_sites,
                t2 = fiedls.amazon_dev_accounts;
            var auth;
            search.create({
                type: t._name,
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: account_id
                }],
                columns: [{
                        name: t.seller_id
                    },
                    {
                        name: t.mws_auth_token
                    },
                    {
                        name: t2.aws_access_key_id,
                        join: t.dev_account
                    },
                    {
                        name: t2.secret_key_guid,
                        join: t.dev_account
                    },
                    {
                        name: t1.amazon_mws_endpoint,
                        join: t.enabled_sites
                    },
                    {
                        name: t1.amazon_marketplace_id,
                        join: t.enabled_sites
                    },
                ]
            }).run().each(function (rec) {
                auth = {
                    seller_id: rec.getValue(rec.columns[0]),
                    auth_token: rec.getValue(rec.columns[1]),
                    access_id: rec.getValue(rec.columns[2]),
                    sec_key: rec.getValue(rec.columns[3]),
                    end_point: rec.getValue(rec.columns[4]),
                    marketplace_id: rec.getValue(rec.columns[5]),
                };
                return false;
            });
            return auth || false;
        },
        getAddressById: function (address_id) {
            var address;
            search.create({
                type: 'customrecord_aio_amazon_inbound_address',
                filters: [{
                    name: 'internalid',
                    operator: 'is',
                    values: address_id
                }],
                columns: [{
                        name: 'name'
                    },
                    {
                        name: 'custrecordwmaia_address_line1'
                    },
                    {
                        name: 'custrecordwmaia_address_line2'
                    },
                    {
                        name: 'custrecordwmaia_city'
                    },
                    {
                        name: 'custrecordwmaia_district_or_country'
                    },
                    {
                        name: 'custrecordwmaia_state_or_province_code'
                    },
                    {
                        name: 'custrecordwmaia_country_code'
                    },
                    {
                        name: 'custrecordwmaia_postal_code'
                    }
                ]
            }).run().each(function (rec) {
                address = {
                    id: rec.id,
                    Name: rec.getValue(rec.columns[0]),
                    AddressLine1: rec.getValue(rec.columns[1]),
                    AddressLine2: rec.getValue(rec.columns[2]),
                    City: rec.getValue(rec.columns[3]),
                    DistrictOrCounty: rec.getValue(rec.columns[4]),
                    StateOrProvinceCode: rec.getValue(rec.columns[5]),
                    CountryCode: rec.getValue(rec.columns[6]),
                    PostalCode: rec.getValue(rec.columns[7])
                };
                return false;
            });
            return address || false;
        },
        listInboundAddress: function () {
            var addrs = [];
            search.create({
                type: 'customrecord_aio_amazon_inbound_address',
                filters: [{
                    name: 'custrecordwmaia_shipfrom_address',
                    operator: 'is',
                    values: true
                }],
                columns: [{
                        name: 'name'
                    },
                    {
                        name: 'custrecordwmaia_address_line1'
                    },
                    {
                        name: 'custrecordwmaia_address_line2'
                    },
                    {
                        name: 'custrecordwmaia_city'
                    },
                    {
                        name: 'custrecordwmaia_district_or_country'
                    },
                    {
                        name: 'custrecordwmaia_state_or_province_code'
                    },
                    {
                        name: 'custrecordwmaia_country_code'
                    },
                    {
                        name: 'custrecordwmaia_postal_code'
                    },
                ]
            }).run().each(function (rec) {
                addrs.push({
                    id: rec.id,
                    Name: rec.getValue(rec.columns[0]),
                    AddressLine1: rec.getValue(rec.columns[1]),
                    AddressLine2: rec.getValue(rec.columns[2]),
                    City: rec.getValue(rec.columns[3]),
                    DistrictOrCounty: rec.getValue(rec.columns[4]),
                    StateOrProvinceCode: rec.getValue(rec.columns[5]),
                    CountryCode: rec.getValue(rec.columns[6]),
                    PostalCode: rec.getValue(rec.columns[7]),
                });
                return true;
            });
            return addrs;
        },
        listInboundShipments: function (auth, nextToken, shipmentIds) {
            var lastUpdatedAfter = moment().subtract(moment.duration(720, 'hours')).toISOString(),
                lastUpdatedBefore = moment().toISOString(),
                shipments = [];
            var content;
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipmentsByNextToken', '2010-10-01', {
                    'NextToken': nextToken,
                }, '/FulfillmentInboundShipment/2010-10-01');
            } else if (shipmentIds && shipmentIds.length) {
                var params_2 = {};
                shipmentIds.map(function (id, key) {
                    return params_2["ShipmentIdList.member." + (key + 1)] = id;
                });
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipments', '2010-10-01', params_2, '/FulfillmentInboundShipment/2010-10-01');
            } else {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipments', '2010-10-01', {
                    'ShipmentStatusList.member.1': 'WORKING',
                    'ShipmentStatusList.member.2': 'SHIPPED',
                    'ShipmentStatusList.member.3': 'IN_TRANSIT',
                    'ShipmentStatusList.member.4': 'DELIVERED',
                    'ShipmentStatusList.member.5': 'CHECKED_IN',
                    'ShipmentStatusList.member.6': 'RECEIVING',
                    'ShipmentStatusList.member.7': 'CLOSED',
                    'ShipmentStatusList.member.8': 'CANCELLED',
                    'ShipmentStatusList.member.9': 'DELETED',
                    'ShipmentStatusList.member.10': 'ERROR',
                    'LastUpdatedAfter': lastUpdatedAfter,
                    'LastUpdatedBefore': lastUpdatedBefore
                }, '/FulfillmentInboundShipment/2010-10-01');
            }
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'member'
            }).map(function (node) {
                shipments.push({
                    shipment_id: exports.utils.getTextContentSafe(node, 'ShipmentId'),
                    shipment_name: exports.utils.getTextContentSafe(node, 'ShipmentName'),
                    center_id: exports.utils.getTextContentSafe(node, 'DestinationFulfillmentCenterId'),
                    label_prep_type: exports.utils.getTextContentSafe(node, 'LabelPrepType'),
                    shipment_status: exports.utils.getTextContentSafe(node, 'ShipmentStatus'),
                    are_cases_required: exports.utils.getTextContentSafe(node, 'AreCasesRequired'),
                    confirmed_need_by_date: exports.utils.getTextContentSafe(node, 'ConfirmedNeedByDate'),
                    box_contents_source: exports.utils.getTextContentSafe(node, 'BoxContentsSource'),
                    ship_from_address: res.getElementsByTagName({
                        tagName: 'ShipFromAddress'
                    }).length ? {
                        id: '',
                        Name: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'Name'),
                        AddressLine1: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'AddressLine1'),
                        AddressLine2: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'AddressLine2'),
                        City: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'City'),
                        DistrictOrCounty: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'DistrictOrCounty'),
                        StateOrProvinceCode: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'StateOrProvinceCode'),
                        CountryCode: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'CountryCode'),
                        PostalCode: exports.utils.getTextContentSafe(res.getElementsByTagName({
                            tagName: 'ShipFromAddress'
                        })[0], 'PostalCode'),
                    } : null,
                    items: []
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                exports.amazon.listInboundShipments(auth, res.getElementsByTagName({
                    tagName: 'NextToken'
                })[0].textContent).map(function (shipment) {
                    return shipments.push(shipment);
                });
            }
            return shipments;
        },
        listInboundShipmentsItems: function (auth, shipmentId, nextToken) {
            var items = [];
            var content;
            if (nextToken) {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipmentItemsByNextToken', '2010-10-01', {
                    NextToken: nextToken
                }, '/FulfillmentInboundShipment/2010-10-01');
            } else {
                content = exports.amazon.mwsRequestMaker(auth, 'ListInboundShipmentItems', '2010-10-01', {
                    ShipmentId: shipmentId
                }, '/FulfillmentInboundShipment/2010-10-01');
            }
            var res = xml.Parser.fromString({
                text: content
            });
            res.getElementsByTagName({
                tagName: 'member'
            }).map(function (item) {
                items.push({
                    shipment_id: exports.utils.getTextContentSafe(item, 'ShipmentId'),
                    seller_sku: exports.utils.getTextContentSafe(item, 'SellerSKU'),
                    quantity_shipped: exports.utils.getTextContentSafe(item, 'QuantityShipped'),
                    quantity_in_case: exports.utils.getTextContentSafe(item, 'QuantityInCase'),
                    quantity_received: exports.utils.getTextContentSafe(item, 'QuantityReceived'),
                    fulfillment_network_sku: exports.utils.getTextContentSafe(item, 'FulfillmentNetworkSKU'),
                    release_date: exports.utils.getTextContentSafe(item, 'ReleaseDate'),
                });
            });
            if (res.getElementsByTagName({
                    tagName: 'NextToken'
                }).length > 0) {
                exports.amazon.listInboundShipmentsItems(auth, shipmentId, res.getElementsByTagName({
                    tagName: 'NextToken'
                })[0].textContent).map(function (item) {
                    return items.push(item);
                });
            }
            return items;
        },
        createInboundShipmentPlan: function (account_id, address_id, ship_to_country_code, label_prep_preference, items) {
            var inboundShipmentPlans = [];
            var auth = this.getAuthByAccountId(account_id);
            if (auth) {
                search.create({
                    type: 'customrecord_aio_amazon_inbound_address',
                    filters: [{
                        name: 'internalid',
                        operator: 'is',
                        values: address_id
                    }],
                    columns: [{
                            name: 'name'
                        },
                        {
                            name: 'custrecordwmaia_address_line1'
                        },
                        {
                            name: 'custrecordwmaia_address_line2'
                        },
                        {
                            name: 'custrecordwmaia_city'
                        },
                        {
                            name: 'custrecordwmaia_district_or_country'
                        },
                        {
                            name: 'custrecordwmaia_state_or_province_code'
                        },
                        {
                            name: 'custrecordwmaia_country_code'
                        },
                        {
                            name: 'custrecordwmaia_postal_code'
                        }
                    ]
                }).run().each(function (rec1) {
                    var params = {
                        "ShipFromAddress.Name": rec1.getValue(rec1.columns[0]),
                        "ShipFromAddress.AddressLine1": rec1.getValue(rec1.columns[1]),
                        "ShipFromAddress.AddressLine2": rec1.getValue(rec1.columns[2]),
                        "ShipFromAddress.City": rec1.getValue(rec1.columns[3]),
                        "ShipFromAddress.DistrictOrCounty": rec1.getValue(rec1.columns[4]),
                        "ShipFromAddress.StateOrProvinceCode": rec1.getValue(rec1.columns[5]),
                        "ShipFromAddress.CountryCode": rec1.getValue(rec1.columns[6]),
                        "ShipFromAddress.PostalCode": rec1.getValue(rec1.columns[7]),
                        "ShipToCountryCode": ship_to_country_code,
                        "LabelPrepPreference": label_prep_preference,
                    };
                    items.map(function (item, key) {
                        params["InboundShipmentPlanRequestItems.member." + (key + 1) + ".SellerSKU"] = item.SellerSKU;
                        params["InboundShipmentPlanRequestItems.member." + (key + 1) + ".ASIN"] = item.ASIN;
                        params["InboundShipmentPlanRequestItems.member." + (key + 1) + ".Quantity"] = item.Quantity;
                        params["InboundShipmentPlanRequestItems.member." + (key + 1) + ".Condition"] = item.Condition;
                        params["InboundShipmentPlanRequestItems.member." + (key + 1) + ".QuantityInCase"] = item.QuantityInCase;
                    });
                    var response = exports.amazon.mwsRequestMaker(auth, 'CreateInboundShipmentPlan', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01');
                    log.debug('response', response);
                    var res = xml.Parser.fromString({
                        text: response
                    });
                    xml.XPath.select({
                        node: res,
                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member"
                    }).map(function (_, key) {
                        var plan_items = [];
                        xml.XPath.select({
                            node: res,
                            xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member"
                        }).map(function (_, line) {
                            var prepDetailsList = [];
                            xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:PrepDetailsList"
                            }).map(function (_, d) {
                                prepDetailsList.push({
                                    PrepInstruction: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:PrepDetailsList/nlapi:PrepDetails[" + (d + 1) + "]/nlapi:PrepInstruction"
                                    })[0].textContent,
                                    PrepOwner: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:PrepDetailsList/nlapi:PrepDetails[" + (d + 1) + "]/nlapi:PrepOwner"
                                    })[0].textContent,
                                });
                            });
                            plan_items.push({
                                FulfillmentNetworkSKU: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:FulfillmentNetworkSKU"
                                })[0].textContent,
                                Quantity: Number(xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:Quantity"
                                })[0].textContent),
                                SellerSKU: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:Items/nlapi:member[" + (line + 1) + "]/nlapi:SellerSKU"
                                })[0].textContent,
                                PrepDetailsList: prepDetailsList
                            });
                        });
                        inboundShipmentPlans.push({
                            ShipmentId: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipmentId"
                            })[0].textContent,
                            DestinationFulfillmentCenterId: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:DestinationFulfillmentCenterId"
                            })[0].textContent,
                            ShipToAddress: {
                                id: '',
                                Name: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:Name"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:Name"
                                })[0].textContent : '',
                                AddressLine1: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:AddressLine1"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:AddressLine1"
                                })[0].textContent : '',
                                AddressLine2: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:AddressLine2"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:AddressLine2"
                                })[0].textContent : '',
                                City: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:City"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:City"
                                })[0].textContent : '',
                                DistrictOrCounty: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:DistrictOrCounty"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:DistrictOrCounty"
                                })[0].textContent : '',
                                StateOrProvinceCode: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:StateOrProvinceCode"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:StateOrProvinceCode"
                                })[0].textContent : '',
                                CountryCode: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:CountryCode"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:CountryCode"
                                })[0].textContent : '',
                                PostalCode: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:PostalCode"
                                }).length ? xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:ShipToAddress/nlapi:PostalCode"
                                })[0].textContent : '',
                            },
                            LabelPrepType: xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:LabelPrepType"
                            }).length ? xml.XPath.select({
                                node: res,
                                xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:LabelPrepType"
                            })[0].textContent : '',
                            Items: plan_items,
                            EstimatedBoxContentsFee: {
                                TotalUnits: xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalUnits"
                                }).length ? Number(xml.XPath.select({
                                    node: res,
                                    xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalUnits"
                                })[0].textContent) : 0,
                                FeePerUnit: {
                                    CurrencyCode: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:FeePerUnit/nlapi:CurrencyCode"
                                    }).length ? xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:FeePerUnit/nlapi:CurrencyCode"
                                    })[0].textContent : '',
                                    Value: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:FeePerUnit/nlapi:Value"
                                    }).length ? Number(xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:FeePerUnit/nlapi:Value"
                                    })[0].textContent) : 0,
                                },
                                TotalFee: {
                                    CurrencyCode: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalFee/nlapi:CurrencyCode"
                                    }).length ? xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalFee/nlapi:CurrencyCode"
                                    })[0].textContent : '',
                                    Value: xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalFee/nlapi:Value"
                                    }).length ? Number(xml.XPath.select({
                                        node: res,
                                        xpath: "//nlapi:InboundShipmentPlans/nlapi:member[" + (key + 1) + "]/nlapi:EstimatedBoxContentsFee/nlapi:TotalFee/nlapi:Value"
                                    })[0].textContent) : 0,
                                }
                            }
                        });
                    });
                    return false;
                });
            }
            return inboundShipmentPlans;
        },
        createShipmentPlan: function (context) {
            var assistant = ui.createAssistant({
                title: 'Create FBA Shipments Assistant'
            });
            var step_0 = assistant.addStep({
                id: 'step_0',
                label: '信息配置 PLAN'
            });
            step_0.helpText = '请填写以下表卄1�7';
            var step_1 = assistant.addStep({
                id: 'step_1',
                label: '信息配置 SHIPMENTS'
            });
            step_1.helpText = '请填写以下表卄1�7';
            var step_2 = assistant.addStep({
                id: 'step_2',
                label: '生成结果'
            });
            step_2.helpText = '产生结果如下';
            assistant.hideAddToShortcutsLink = true;
            assistant.clientScriptModulePath = exports.utils.getBundlePath() + "/amazon.shipment.plan.cl.min.js";
            if (context.request.method == 'GET') {
                if (!assistant.isFinished()) {
                    assistant.errorHtml = null;
                    if (assistant.currentStep == null) {
                        assistant.currentStep = step_0;
                    }
                    var step = assistant.currentStep.id;
                    log.debug('START GET STEP...', step);
                    if (step == 'step_0') {
                        var f00_1 = assistant.addField({
                            id: 'custpage_f00',
                            label: '操作账号',
                            type: ui.FieldType.SELECT
                        });
                        exports.amazon.listAccount().map(function (account) {
                            f00_1.addSelectOption({
                                text: account.abbr + " - " + account.name,
                                value: account.id
                            });
                        });
                        f00_1.setHelpText({
                            help: 'Please select the Amazon account.',
                            showInlineForAssistant: true
                        });
                        f00_1.isMandatory = true;
                        var f01_1 = assistant.addField({
                            id: 'custpage_f01',
                            label: '发货地址',
                            type: ui.FieldType.SELECT
                        });
                        exports.amazon.listInboundAddress().map(function (addr) {
                            f01_1.addSelectOption({
                                text: addr.Name + " - " + addr.City + " - " + addr.StateOrProvinceCode + " - " + addr.CountryCode,
                                value: addr.id
                            });
                        });
                        f01_1.setHelpText({
                            help: 'The address from which you will send your inbound shipment.',
                            showInlineForAssistant: true
                        });
                        f01_1.isMandatory = true;
                        var f02 = assistant.addField({
                            id: 'custpage_f02',
                            label: '目的囄1�7',
                            type: ui.FieldType.SELECT
                        });
                        for (var country in exports.amazon.shipToCountryCode) {
                            f02.addSelectOption({
                                text: country,
                                value: exports.amazon.shipToCountryCode[country]
                            });
                        }
                        f02.setHelpText({
                            help: 'The two-character country code for the country where you want your inbound shipment to be sent.',
                            showInlineForAssistant: true
                        });
                        f02.isMandatory = true;
                        var f03_1 = assistant.addField({
                            id: 'custpage_f03',
                            label: 'LabelPrepPreference',
                            type: ui.FieldType.SELECT
                        });
                        exports.amazon.labelPrepPreference.map(function (type) {
                            return f03_1.addSelectOption({
                                text: type,
                                value: type
                            });
                        });
                        f03_1.setHelpText({
                            help: 'Your preference for label preparation for an inbound shipment.',
                            showInlineForAssistant: true
                        }).isMandatory = true;
                        /** 货件导入弄1�7姄1�7 */
                        var f05_1 = assistant.addField({
                            id: 'custpage_f05',
                            label: 'Shipment Plan Importer Record',
                            type: ui.FieldType.SELECT
                        });
                        f05_1.addSelectOption({
                            text: '',
                            value: ''
                        });
                        search.create({
                            type: fiedls.amazon_inbound_item._name,
                            columns: [{
                                name: fiedls.amazon_inbound_item.inbound_reference,
                                summary: search.Summary.GROUP
                            }]
                        }).run().each(function (rec) {
                            f05_1.addSelectOption({
                                text: rec.getValue(rec.columns[0]),
                                value: rec.getValue(rec.columns[0])
                            });
                            return true;
                        });
                        f05_1.setHelpText({
                            help: 'The Amazon Standard Identification Number (ASIN) of the item By File Upload.',
                            showInlineForAssistant: true
                        });
                        /** 货件导入结束 */
                        var f04 = assistant.addSublist({
                            id: 'custpage_f04',
                            label: '待装箱货仄1�7',
                            type: ui.SublistType.INLINEEDITOR
                        });
                        var f0401 = f04.addField({
                            id: 'custpage_f0401',
                            label: 'SellerSKU',
                            type: ui.FieldType.SELECT,
                            source: 'item'
                        }).setHelpText({
                            help: 'The Seller SKU of the item.',
                            showInlineForAssistant: true
                        });
                        f0401.updateDisplayType({
                            displayType: ui.FieldDisplayType.ENTRY
                        });
                        f0401.isMandatory = true;
                        f04.addField({
                                id: 'custpage_f0402',
                                label: 'ASIN',
                                type: ui.FieldType.TEXT
                            })
                            .setHelpText({
                                help: 'The Amazon Standard Identification Number (ASIN) of the item.',
                                showInlineForAssistant: true
                            })
                            // .updateDisplayType({displayType: ui.FieldDisplayType.INLINE})
                            .isMandatory = false;
                        var f0403_1 = f04.addField({
                            id: 'custpage_f0403',
                            label: 'Condition',
                            type: ui.FieldType.SELECT
                        }).setHelpText({
                            help: 'The condition of the item.',
                            showInlineForAssistant: true
                        });
                        exports.amazon.condition.map(function (c) {
                            return f0403_1.addSelectOption({
                                text: c,
                                value: c
                            });
                        });
                        f0403_1.isMandatory = false;
                        f04.addField({
                            id: 'custpage_f0404',
                            label: 'Quantity',
                            type: ui.FieldType.INTEGER
                        }).setHelpText({
                            help: 'The item quantity.',
                            showInlineForAssistant: true
                        }).isMandatory = true;
                        f04.addField({
                            id: 'custpage_f0405',
                            label: 'QuantityInCase',
                            type: ui.FieldType.INTEGER
                        }).setHelpText({
                            help: 'If QuantityInCase is specified, its value must be a divisor of Quantity.',
                            showInlineForAssistant: true
                        }).isMandatory = false;
                        /* f04.addField({id: 'f0406', label: 'QuantityInCase', type: ui.FieldType.INTEGER}).setHelpText({help: 'A list of preparation instructions, and who is responsible for each preparation.', showInlineForAssistant: true}).isMandatory = false; */
                        f04.helpText = 'SKU and quantity information for the items in an inbound shipment.';
                        f04.updateUniqueFieldId({
                            id: 'custpage_f0401'
                        });
                        f04.updateTotallingFieldId({
                            id: 'custpage_f0404'
                        });
                    } else if (step == 'step_1') {
                        // assistant.setSplash({
                        //     title: "正在向亚马�1�7�发送请汄1�7",
                        //     text1: "正在基于步骤提交的数据向亚马逊发送Shipment请求",
                        //     text2: "请直接编辑返回的shipment信息."
                        // });
                        var account_id = Number(step_0.getValue({
                            id: 'custpage_f00'
                        }));
                        var address_id = Number(step_0.getValue({
                            id: 'custpage_f01'
                        }));
                        var ship_to_country = step_0.getValue({
                            id: 'custpage_f02'
                        });
                        var label_prep_preference = step_0.getValue({
                            id: 'custpage_f03'
                        });
                        var items_1 = [];
                        var items_count = step_0.getLineCount({
                            group: 'custpage_f04'
                        });
                        var _loop_1 = function (line) {
                            var item_id = step_0.getSublistValue({
                                group: 'custpage_f04',
                                id: 'custpage_f0401',
                                line: line
                            });
                            if (!item_id) {
                                assistant.errorHtml = "\u63D0\u4EA4\u6570\u636E\u5F02\u5E38\uFF0C\u8BF7\u8FD4\u56DE\u4E0A\u4E00\u6B65\u91CD\u65B0\u64CD\u4F5C\uFF01";
                                context.response.writePage({
                                    pageObject: assistant
                                });
                                return {
                                    value: void 0
                                };
                            }
                            search.create({
                                type: 'item',
                                filters: [{
                                    name: 'internalid',
                                    operator: 'is',
                                    values: item_id
                                }],
                                columns: [{
                                    name: 'itemid'
                                }]
                            }).run().each(function (rec) {
                                items_1.push({
                                    'SellerSKU': rec.getValue(rec.columns[0]),
                                    'ASIN': step_0.getSublistValue({
                                        group: 'custpage_f04',
                                        id: 'custpage_f0402',
                                        line: line
                                    }),
                                    'Condition': step_0.getSublistValue({
                                        group: 'custpage_f04',
                                        id: 'custpage_f0403',
                                        line: line
                                    }),
                                    'Quantity': step_0.getSublistValue({
                                        group: 'custpage_f04',
                                        id: 'custpage_f0404',
                                        line: line
                                    }),
                                    'QuantityInCase': step_0.getSublistValue({
                                        group: 'custpage_f04',
                                        id: 'custpage_f0405',
                                        line: line
                                    }),
                                });
                                return false;
                            });
                        };
                        for (var line = 0; line < items_count; line++) {
                            var state_1 = _loop_1(line);
                            if (typeof state_1 === "object")
                                return state_1.value;
                        }
                        try {
                            var inboundShipmentPlans_1 = exports.amazon.createInboundShipmentPlan(account_id, address_id, ship_to_country, label_prep_preference, items_1);
                            var _step_prefix_1 = "custpage_s1";
                            var fsource = assistant.addField({
                                id: _step_prefix_1 + "f_source",
                                label: 'source data',
                                type: ui.FieldType.TEXTAREA
                            });
                            fsource.updateDisplayType({
                                displayType: ui.FieldDisplayType.HIDDEN
                            });
                            fsource.defaultValue = JSON.stringify(inboundShipmentPlans_1);
                            inboundShipmentPlans_1.map(function (plan, i) {
                                var _container_id = "" + _step_prefix_1 + i;
                                assistant.addFieldGroup({
                                    id: _container_id,
                                    label: "\u8BBE\u7F6E" + plan.ShipmentId + "\u7684\u8BE6\u7EC6\u4FE1\u606F (" + (i + 1) + " / " + inboundShipmentPlans_1.length + ")"
                                }).isSingleColumn = false;
                                var fshipment_name = assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f_shipment_name",
                                    label: 'Shipment Name',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                });
                                fshipment_name.isMandatory = true;
                                var fshipment_status = assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f_shipment_status",
                                    label: 'Shipment Status',
                                    type: ui.FieldType.SELECT,
                                    container: _container_id
                                });
                                ['', 'WORKING', 'SHIPPED'].map(function (s) {
                                    return fshipment_status.addSelectOption({
                                        text: s,
                                        value: s
                                    });
                                });
                                fshipment_status.isMandatory = true;
                                var fshipment_ibcs = assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f_shipment_ibcs",
                                    label: 'intended Box Contents Source',
                                    type: ui.FieldType.SELECT,
                                    container: _container_id
                                });
                                exports.amazon.intendedBoxContentsSource.map(function (_) {
                                    return fshipment_ibcs.addSelectOption({
                                        text: _,
                                        value: _
                                    });
                                });
                                fshipment_ibcs.isMandatory = true;
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f_shipment_are_cases_required",
                                    label: 'Are Cases Required',
                                    type: ui.FieldType.CHECKBOX,
                                    container: _container_id
                                });
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f01",
                                    label: 'Shipment Id',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = plan.ShipmentId;
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f02",
                                    label: 'Destination Fulfillment CenterId',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = plan.DestinationFulfillmentCenterId;
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f03",
                                    label: 'Label Prep Type',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = plan.LabelPrepType;
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f05",
                                    label: 'Total Units',
                                    type: ui.FieldType.INTEGER,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.EstimatedBoxContentsFee.TotalUnits);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f06",
                                    label: 'Fee Per Unit',
                                    type: ui.FieldType.CURRENCY,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.EstimatedBoxContentsFee.FeePerUnit.Value);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f07",
                                    label: 'Total Fee',
                                    type: ui.FieldType.CURRENCY,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).updateBreakType({
                                    breakType: ui.FieldBreakType.STARTCOL
                                }).defaultValue = String(plan.EstimatedBoxContentsFee.TotalFee.Value);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f08",
                                    label: 'Name',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.Name);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f09",
                                    label: 'Address Line 1',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.AddressLine1);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f10",
                                    label: 'Address Line 2',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.AddressLine2);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f11",
                                    label: 'City',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.City);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f12",
                                    label: 'District Or County',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.DistrictOrCounty);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f13",
                                    label: 'State Or Province Code',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.StateOrProvinceCode);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f14",
                                    label: 'Country Code',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.CountryCode);
                                assistant.addField({
                                    id: "" + _step_prefix_1 + i + "f15",
                                    label: 'Postal Code',
                                    type: ui.FieldType.TEXT,
                                    container: _container_id
                                }).updateDisplayType({
                                    displayType: ui.FieldDisplayType.INLINE
                                }).defaultValue = String(plan.ShipToAddress.PostalCode);
                                assistant.addField({
                                        id: "" + _step_prefix_1 + i + "f16",
                                        label: 'Items',
                                        type: ui.FieldType.TEXTAREA,
                                        container: _container_id
                                    }).updateDisplayType({
                                        displayType: ui.FieldDisplayType.INLINE
                                    })
                                    .defaultValue = plan.Items.map(function (item) {
                                        return "Seller SKU: " + item.SellerSKU + ", FulfillmentNetworkSKU: " + item.FulfillmentNetworkSKU + ", Quantity: " + item.Quantity;
                                    }).join('\n');
                            });
                        } catch (err) {
                            assistant.errorHtml = "<pre>" + err + "</pre>";
                        }
                    } else if (step == 'step_2') {
                        var results_1 = [];
                        var source = JSON.parse(step_1.getValue({
                            id: 'custpage_s1f_source'
                        }));
                        if (!source) {
                            assistant.errorHtml = "\u63D0\u4EA4\u6570\u636E\u5F02\u5E38\uFF0C\u8BF7\u8FD4\u56DE\u4E0A\u4E00\u6B65\u91CD\u65B0\u64CD\u4F5C\uFF01";
                            context.response.writePage({
                                pageObject: assistant
                            });
                            return;
                        }
                        var account_id_1 = Number(step_0.getValue({
                            id: 'custpage_f00'
                        }));
                        var address_id_1 = Number(step_0.getValue({
                            id: 'custpage_f01'
                        }));
                        var ship_to_country = step_0.getValue({
                            id: 'custpage_f02'
                        });
                        var label_prep_preference_1 = step_0.getValue({
                            id: 'custpage_f03'
                        });
                        var plan = record.create({
                            type: 'customrecord_aio_amazon_plan',
                            isDynamic: true
                        });
                        var acc_1 = record.load({
                            type: 'customrecord_aio_account',
                            id: account_id_1
                        });
                        plan.setValue({
                            fieldId: 'name',
                            value: source.map(function (_) {
                                return _.ShipmentId;
                            }).join('/')
                        });
                        plan.setValue({
                            fieldId: 'custrecord_aio_plan_account',
                            value: account_id_1
                        });
                        plan.setValue({
                            fieldId: 'custrecord_aio_plan_from',
                            value: address_id_1
                        });
                        plan.setValue({
                            fieldId: 'custrecord_aio_plan_country',
                            value: ship_to_country
                        });
                        plan.setText({
                            fieldId: 'custrecord_aio_plan_label',
                            text: label_prep_preference_1
                        });
                        plan.setValue({
                            fieldId: 'custrecord_aio_plan_items',
                            value: step_1.getValue({
                                id: 'custpage_s1f_source'
                            })
                        });
                        var pid_1 = plan.save();
                        try {
                            source.map(function (_, key) {
                                /* 创建Shipment */
                                var items = [];
                                _.Items.map(function (__) {
                                    var item = {
                                        ShipmentId: _.ShipmentId,
                                        SellerSKU: __.SellerSKU,
                                        FulfillmentNetworkSKU: __.FulfillmentNetworkSKU,
                                        QuantityShipped: __.Quantity,
                                        QuantityInCase: __.QuantityInCase,
                                        PrepDetailsList: __.PrepDetailsList
                                    };
                                    items.push(item);
                                });
                                var shipment_id = exports.amazon.createInboundShipment(account_id_1, address_id_1, _.ShipmentId, "" + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_name"
                                }), _.DestinationFulfillmentCenterId, "" + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_status"
                                }), "" + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_ibcs"
                                }), _.LabelPrepType, items);
                                /* 创建TO */
                                var to = record.create({
                                    type: 'transferorder',
                                    isDynamic: true
                                });
                                to.setValue({
                                    fieldId: 'customform',
                                    value: acc_1.getValue(fiedls.account.to_form)
                                });
                                to.setValue({
                                    fieldId: 'externalid',
                                    value: "aio" + account_id_1 + "." + _.ShipmentId
                                });
                                to.setValue({
                                    fieldId: 'memo',
                                    value: "" + _.ShipmentId
                                });
                                if (exports.utils.checkIfSubsidiaryEnabled()) {
                                    to.setValue({
                                        fieldId: 'subsidiary',
                                        value: acc_1.getValue('custrecord_aio_subsidiary')
                                    });
                                    log.audit('TO set Subsidiary', acc_1.getValue('custrecord_aio_subsidiary'));
                                }
                                to.setValue({
                                    fieldId: 'location',
                                    value: acc_1.getValue('custrecord_aio_to_default_from_location')
                                });
                                to.setValue({
                                    fieldId: 'transferlocation',
                                    value: acc_1.getValue('custrecord_aio_fbaorder_location')
                                });
                                to.setValue({
                                    fieldId: 'department',
                                    value: acc_1.getValue('custrecord_aio_dept')
                                });
                                to.setValue({
                                    fieldId: 'firmed',
                                    value: true
                                });
                                to.setValue({
                                    fieldId: 'incoterm',
                                    value: 1
                                });
                                to.setValue({
                                    fieldId: 'tranid',
                                    value: "AIO" + _.ShipmentId
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_account',
                                    value: account_id_1
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_marketplaceid',
                                    value: 1 /* amazon */
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_shipment_id',
                                    value: "" + _.ShipmentId
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_shipment_name',
                                    value: "" + step_1.getValue({
                                        id: "custpage_s1" + key + "f_shipment_name"
                                    })
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_dest_center_id',
                                    value: "" + _.DestinationFulfillmentCenterId
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_label_prep_type',
                                    value: "" + label_prep_preference_1
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_shipment_status',
                                    value: "" + step_1.getValue({
                                        id: "custpage_s1" + key + "f_shipment_status"
                                    })
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_case_required',
                                    value: "" + (step_1.getValue({
                                        id: "custpage_s1" + key + "f_shipment_are_cases_required"
                                    }) || '')
                                });
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_ship_from_addr',
                                    value: address_id_1
                                });
                                var addrtoid;
                                search.create({
                                    type: 'customrecord_aio_amazon_inbound_address',
                                    filters: [{
                                            name: 'custrecordcenterid',
                                            operator: 'is',
                                            values: _.DestinationFulfillmentCenterId
                                        },
                                        {
                                            name: 'custrecordwmaia_shipfrom_address',
                                            operator: 'is',
                                            values: false
                                        }
                                    ]
                                }).run().each(function (addrrec) {
                                    addrtoid = addrrec.id;
                                    return false;
                                });
                                if (!addrtoid) {
                                    log.debug('creating inbound address', _.DestinationFulfillmentCenterId);
                                    var addrto = record.create({
                                        type: 'customrecord_aio_amazon_inbound_address',
                                        isDynamic: true
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_shipfrom_address',
                                        value: false
                                    });
                                    addrto.setValue({
                                        fieldId: 'name',
                                        value: step_1.getValue({
                                            id: "custpage_s1" + key + "f08"
                                        }) + ", " + step_1.getValue({
                                            id: "custpage_s1" + key + "f09"
                                        })
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordcenterid',
                                        value: _.DestinationFulfillmentCenterId
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecord_name',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f08"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_address_line1',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f09"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_address_line2',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f10"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_city',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f11"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_district_or_country',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f12"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_state_or_province_code',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f13"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_country_code',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f14"
                                        }) || '')
                                    });
                                    addrto.setValue({
                                        fieldId: 'custrecordwmaia_postal_code',
                                        value: "" + (step_1.getValue({
                                            id: "custpage_s1" + key + "f15"
                                        }) || '')
                                    });
                                    addrtoid = addrto.save();
                                }
                                to.setValue({
                                    fieldId: 'custbody_aio_inbound_ship_to_addr',
                                    value: addrtoid
                                });
                                results_1.push("ShipmentId: " + _.ShipmentId);
                                results_1.push("InboundShipmentHeader:");
                                results_1.push("-ShipmentName: " + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_name"
                                }));
                                results_1.push("-ShipFromAddress(id): " + step_0.getValue({
                                    id: 'custpage_f01'
                                }));
                                results_1.push("-DestinationFulfillmentCenterId: " + _.DestinationFulfillmentCenterId);
                                results_1.push("-LabelPrepPreference: " + _.DestinationFulfillmentCenterId);
                                results_1.push("-Are Case Required: " + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_are_cases_required"
                                }));
                                results_1.push("-Shipment Status: " + step_1.getValue({
                                    id: "custpage_s1" + key + "f_shipment_status"
                                }));
                                // results.push(`Intended Box Contents Source: ${_.DestinationFulfillmentCenterId}`);
                                results_1.push('InboundShipmentItems:');
                                _.Items.map(function (item) {
                                    search.create({
                                        type: 'item',
                                        filters: [{
                                            name: 'itemid',
                                            operator: 'is',
                                            values: "" + item.SellerSKU
                                        }],
                                        columns: [{
                                            name: 'type'
                                        }, {
                                            name: 'itemid'
                                        }]
                                    }).run().each(function (t) {
                                        var type = t.getValue(t.columns[0]);
                                        var item_name = t.getValue(t.columns[1]);
                                        if (type == 'Kit') {
                                            var i = record.load({
                                                type: 'kititem',
                                                id: t.id
                                            });
                                            for (var index = 0; index < i.getLineCount({
                                                    sublistId: 'member'
                                                }); index++) {
                                                var item_id = i.getSublistValue({
                                                    sublistId: 'member',
                                                    fieldId: 'item',
                                                    line: index
                                                });
                                                var item_qty = Number(i.getSublistValue({
                                                    sublistId: 'member',
                                                    fieldId: 'quantity',
                                                    line: index
                                                }));
                                                to.selectNewLine({
                                                    sublistId: 'item'
                                                });
                                                log.debug('setting item id', item_id);
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'item',
                                                    value: item_id
                                                });
                                                log.debug('end setting item id', item_id);
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'quantity',
                                                    value: "" + item.Quantity * item_qty
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'quantityreceived',
                                                    value: 0
                                                });
                                                // 自定义部刄1�7
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_shipment_id',
                                                    value: "" + _.ShipmentId
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_amazon_msku',
                                                    value: "" + item_name
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_fnsku',
                                                    value: "" + item.FulfillmentNetworkSKU
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_qty_shipped',
                                                    value: "" + item.Quantity * item_qty
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_qty_received',
                                                    value: 0
                                                });
                                                to.setCurrentSublistValue({
                                                    sublistId: 'item',
                                                    fieldId: 'custcol_aio_qty_in_case',
                                                    value: "" + (item.QuantityInCase || 1)
                                                });
                                                to.commitLine({
                                                    sublistId: 'item'
                                                });
                                            }
                                        } else {
                                            to.selectNewLine({
                                                sublistId: 'item'
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'item',
                                                value: t.id
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantity',
                                                value: "" + item.Quantity
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'quantityreceived',
                                                value: 0
                                            });
                                            // 自定义部刄1�7
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_shipment_id',
                                                value: "" + _.ShipmentId
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_amazon_msku',
                                                value: "" + item_name
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_fnsku',
                                                value: "" + item.FulfillmentNetworkSKU
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_qty_shipped',
                                                value: "" + item.Quantity
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_qty_received',
                                                value: 0
                                            });
                                            to.setCurrentSublistValue({
                                                sublistId: 'item',
                                                fieldId: 'custcol_aio_qty_in_case',
                                                value: "" + (item.QuantityInCase || 1)
                                            });
                                            to.commitLine({
                                                sublistId: 'item'
                                            });
                                        }
                                        return false;
                                    });
                                });
                                var tid = to.save();
                                _.Items.map(function (item) {
                                    search.create({
                                        type: 'item',
                                        filters: [{
                                            name: 'itemid',
                                            operator: 'is',
                                            values: "" + item.SellerSKU
                                        }],
                                        columns: [{
                                            name: 'type'
                                        }, {
                                            name: 'itemid'
                                        }]
                                    }).run().each(function (t) {
                                        var line = record.create({
                                            type: 'customrecord_aio_amazon_plan_items',
                                            isDynamic: true
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_id',
                                            value: pid_1
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_item',
                                            value: t.id
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_fnsku',
                                            value: "" + item.FulfillmentNetworkSKU
                                        });
                                        // line.setValue({fieldId: 'custrecord_aio_amazon_plan_asin', value: pid});
                                        // line.setValue({fieldId: 'custrecord_aio_amazon_plan_condition', value: pid});
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_qty',
                                            value: "" + item.Quantity
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_qtyincase',
                                            value: "" + (item.QuantityInCase || '')
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_tran_id',
                                            value: tid
                                        });
                                        line.setValue({
                                            fieldId: 'custrecord_aio_amazon_plan_shipmentid',
                                            value: "" + _.ShipmentId
                                        });
                                        line.save();
                                        results_1.push("-ShipmentId: " + _.ShipmentId);
                                        results_1.push("-Seller SKU: " + item.SellerSKU);
                                        results_1.push("-Fulfillment Network SKU: " + item.FulfillmentNetworkSKU);
                                        results_1.push("-Quantity Shipped: " + item.Quantity);
                                        step_1.getValue({
                                            id: "custpage_s1" + key + "f_shipment_are_cases_required"
                                        }) ? results_1.push("-Quantity In Case: " + item.QuantityInCase) : null;
                                        return false;
                                    });
                                });
                                results_1.push('');
                            });
                            assistant.finishedHtml = results_1.join('<br />');
                        } catch (err) {
                            log.error('err', {
                                error: err,
                                source: source
                            });
                            record.delete({
                                type: 'customrecord_aio_amazon_plan',
                                id: pid_1
                            });
                            assistant.errorHtml = "<b>" + err + "</b>";
                        }
                    }
                    log.debug('END GET STEP...', step);
                }
                context.response.writePage({
                    pageObject: assistant
                });
            } else if (context.request.method == 'POST') {
                if (assistant.getLastAction() == ui.AssistantSubmitAction.NEXT || (assistant.getLastAction() == ui.AssistantSubmitAction.BACK)) {
                    assistant.currentStep = assistant.getNextStep();
                    assistant.sendRedirect({
                        response: context.response
                    });
                } else if (assistant.getLastAction() == ui.AssistantSubmitAction.FINISH) {
                    context.response.writePage({
                        pageObject: assistant
                    });
                }
            }
        },
        createInboundShipment: function (account_id, address_id, shipment_id, shipment_name, destination_fulfillment_center_id, status, intended_box_contents_source, label_prep_preference, items) {
            log.debug('createInboundShipment', arguments);
            var rtn_shipment_id = '';
            var auth = exports.amazon.getAuthByAccountId(account_id),
                addr = exports.amazon.getAddressById(address_id);
            if (auth && addr) {
                var params_3 = {
                    "ShipmentId": shipment_id,
                    "InboundShipmentHeader.ShipmentName": shipment_name,
                    "InboundShipmentHeader.ShipFromAddress.Name": addr.Name,
                    "InboundShipmentHeader.ShipFromAddress.AddressLine1": addr.AddressLine1,
                    "InboundShipmentHeader.ShipFromAddress.AddressLine2": addr.AddressLine2,
                    "InboundShipmentHeader.ShipFromAddress.City": addr.City,
                    "InboundShipmentHeader.ShipFromAddress.DistrictOrCounty": addr.DistrictOrCounty,
                    "InboundShipmentHeader.ShipFromAddress.StateOrProvinceCode": addr.StateOrProvinceCode,
                    "InboundShipmentHeader.ShipFromAddress.CountryCode": addr.CountryCode,
                    "InboundShipmentHeader.ShipFromAddress.PostalCode": addr.PostalCode,
                    "InboundShipmentHeader.DestinationFulfillmentCenterId": destination_fulfillment_center_id,
                    "InboundShipmentHeader.ShipmentStatus": status,
                    "InboundShipmentHeader.IntendedBoxContentsSource": intended_box_contents_source,
                    "InboundShipmentHeader.LabelPrepPreference": label_prep_preference,
                };
                items.map(function (item, key) {
                    params_3["InboundShipmentItems.member." + (key + 1) + ".QuantityShipped"] = item.QuantityShipped;
                    params_3["InboundShipmentItems.member." + (key + 1) + ".SellerSKU"] = item.SellerSKU;
                    item.PrepDetailsList.map(function (p, pi) {
                        params_3["InboundShipmentItems.member." + (key + 1) + ".PrepDetailsList.PrepDetails." + (pi + 1) + ".PrepInstruction"] = p.PrepInstruction;
                        params_3["InboundShipmentItems.member." + (key + 1) + ".PrepDetailsList.PrepDetails." + (pi + 1) + ".PrepOwner"] = p.PrepOwner;
                    });
                });
                log.debug('params', params_3);
                var response = exports.amazon.mwsRequestMaker(auth, 'CreateInboundShipment', '2010-10-01', params_3, '/FulfillmentInboundShipment/2010-10-01');
                log.debug('response', response);
                var res = xml.Parser.fromString({
                    text: response
                });
                rtn_shipment_id = xml.XPath.select({
                    node: res,
                    xpath: "//nlapi:CreateInboundShipmentResult/nlapi:ShipmentId"
                }).map(function (_) {
                    return _.textContent;
                }).join('');
            }
            return rtn_shipment_id;
        },
        uploadPrice: function (account_id, rows,currency) {
            log.debug( "upload","店铺："+account_id);
            var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>Price</MessageType>";
            rows.map(function (row, _) {
                body += "<Message>";
                body += "<MessageID>" + (_ + 1) + "</MessageID>";
                body += "<Price>";
                body += "<SKU>" + row.item_sku + "</SKU>";
                body += "<StandardPrice currency='DEFAULT'>" + row.new_price + "</StandardPrice>";
                body += "</Price>";
                body += "</Message>";
            });
            body += "</AmazonEnvelope>";
            log.debug("body", body);
            var auth = exports.amazon.getAuthByAccountId(account_id);
            log.debug("auth", auth);
            if (auth) {
                //log.debug("in","in");
                var rtn = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._POST_PRODUCT_PRICING_DATA_],
                        PurgeAndReplace: 'false',
                        ContentMD5Value: encode.convert({
                            string: exports.utils.md5(body),
                            inputEncoding: encode.Encoding.HEX,
                            outputEncoding: encode.Encoding.BASE_64
                        }),
                    }, '/', body,"uploadPrice"),
                    res = xml.Parser.fromString({ text: rtn });
                log.debug("rtn", rtn);
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    log.debug("res", res);
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    //log.debug("feed1",feed)
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_account, value: account_id });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_submission_id, value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_type, value: exports.utils.getTextContentSafe(res, 'FeedType') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.submitted_date, value: exports.utils.getTextContentSafe(res, 'SubmittedDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_processing_status, value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.started_processing_date, value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.completed_processing_date, value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_body, value: body });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    var feed_id = feed.save();
                    //log.debug("feed_id",feed_id)
                    return res.getElementsByTagName({ tagName: 'FeedProcessingStatus' })[0].textContent;
                } else {
                    //log.debug("e1","e1");
                    throw "\u63D0\u4EA4Price\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                //log.debug("e2","e2");
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        uploadInvoice1: function (account_id, rows) {
            // var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>Invoice</MessageType>";
            // rows.map(function (row, _) {
            //     body += "<Message>";
            //     body += "<MessageID>" + (_ + 1) + "</MessageID>";
            //     body += "<FeedContent>" + row.pdf_contents + "</FeedContent>"; //PDF文档内容(base_64编码字符串)
            //     body += "</Message>";
            // });
            var body = rows[0].pdf_contents;    //PDF文档内容(base_64编码字符串)
            log.debug('uploadInvoice1_typeof_body',typeof(body));   //字符串类型
            var auth = exports.amazon.getAuthByAccountId(account_id);
            log.debug("auth", auth);
            if (auth) {
                var rtn = exports.amazon.mwsRequestMaker1(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._UPLOAD_VAT_INVOICE_],
                        PurgeAndReplace: 'false',
                        // ContentMD5Value:  exports.utils.md5_1(body),
                        ContentMD5Value: encode.convert({ string: exports.utils.md5(body), inputEncoding: encode.Encoding.HEX, outputEncoding: encode.Encoding.BASE_64 }),
                        FeedOptions: 'metadata:OrderId=' + rows[0].order_id + ';metadata:InvoiceNumber='+ rows[0].invoice_number + ';metadata:DocumentType=Invoice',
                    }, '/', body, 'feed');
                log.debug("rtn", rtn);
                var res = xml.Parser.fromString({ text: rtn });
                if (res.getElementsByTagName({ tagName: 'FeedProcessingStatus' }).length > 0) {
                    var feed = record.create({ type: exports.ns.amazon_feed._name, isDynamic: true });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_account, value: account_id });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_submission_id, value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_type, value: exports.utils.getTextContentSafe(res, 'FeedType') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.submitted_date, value: exports.utils.getTextContentSafe(res, 'SubmittedDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_processing_status, value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.started_processing_date, value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.completed_processing_date, value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate') });
                    feed.setValue({ fieldId: exports.ns.amazon_feed.feed_body, value: body });
                    var feed_id = feed.save();
                    log.debug("feed_id",feed_id)
                    return res.getElementsByTagName({ tagName: 'FeedProcessingStatus' })[0].textContent + ':' + exports.utils.getTextContentSafe(res, 'FeedSubmissionId');
                } else {
                    throw "\u63D0\u4EA4Invoice\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        mwsRequestMaker1: function (auth, action, version, params, resource, body, type_feed) {
            log.debug('mwsRequestMaker1_typeof_body',typeof(body));
            if (resource === void 0) { resource = '/'; }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = { SellerId: encodeURIComponent(auth.seller_id), AWSAccessKeyId: encodeURIComponent(auth.access_id), Action: encodeURIComponent(action), SignatureMethod: encodeURIComponent('HmacSHA256'), SignatureVersion: encodeURIComponent('2'), Timestamp: timestamp, Version: encodeURIComponent(version), };
            if (type_feed == 'feed') { query['MarketplaceIdList.Id.1'] = encodeURIComponent(auth.marketplace_id); }
            if (auth.auth_token) { query['MWSAuthToken'] = encodeURIComponent(auth.auth_token); }
            for (var key in params) { if (params[key] != '') { query[key] = encodeURIComponent(params[key]); } }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function (key) { return key + "=" + query[key]; }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({ string: hash, inputEncoding: encode.Encoding.HEX, outputEncoding: encode.Encoding.BASE_64 }));
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? { 'Transfer-Encoding' : 'chunked' , 'Content-Type': 'application/octet-stream', } : {}
                // headers: body ? { 'Content-Type': 'application/octet-stream', } : {}
                // headers: body ? { 'Transfer-Encoding' : 'chunked', 'Content-Type': 'application/pdf', } : {}
                // headers: body ? { 'Content-Type': 'application/pdf', } : {}
                // headers: body ? { 'Content-Type': 'text/xml', } : {}
            });
            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            // log.debug('headers', body ? { 'Transfer-Encoding' : 'chunked' , 'Content-Type': 'application/octet-stream', } : {} );
            log.debug('hashInBase64', hashInBase64);
            log.debug('response', response);
            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    throw "MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            return response.body;
        },

        uploadInvoice: function (account_id, rows) {
            log.debug("upload", account_id);
            var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>Invoice</MessageType>";
            rows.map(function (row, _) {
                log.debug("upload_row", {
                    marketplace: row.marketplace,
                    order_id: row.order_id,
                    invoice_number: row.invoice_number,
                    total_amount: String(row.total_amount),
                    vat_amount: String(row.vat_amount),
                })
                body += "<Message>";
                body += "<MessageID>" + (_ + 1) + "</MessageID>";
                // body += "<MarketplaceList.Id.1>"+ row.marketplace + "</MarketplaceList.Id.1>";  //必须

                body += "<FeedOptions>" + "metadata:orderid=" + row.order_id + ";metadata:invoicenumber=" + row.invoice_number + ";metadata:totalamount=" + String(row.total_amount) + ";metadata:totalvatamount=" + String(row.vat_amount) + ";metadata:documenttype=Invoice" + "</FeedOptions>";



                // body += "<FeedOptions metadata:OrderId="+row.order_id +";metadata:invoicenumber="+row.invoice_number+";metadata:TotalAmount="+String(row.total_amount)+";metadata:TotalVATAmount="+String(row.vat_amount)+";metadata:DocumentType=Invoice>"+"</FeedOptions>";
                // body += "<FeedOptions>";

                // body += "<metadata:OrderId>"+ row.order_id + "</metadata:OrderId>";    //必须
                // body += "<metadata:InvoiceNumber>"+ row.invoice_number  + "</metadata:InvoiceNumber>";  //必须
                // body += "<metadata:TotalAmount>"+ row.total_amount + "</metadata:TotalAmount>";    //非必须 row.total_amount
                // body += "<metadata:TotalVATAmount>"+ row.vat_amount + "</metadata:TotalVATAmount>";  //非必须   row.vat_amount
                // body += "<metadata:DocumentType>"+ 'Invoice' + "</metadata:DocumentType>"; //非必须

                // body += "<OrderId>"+ "metadata:OrderId=" +row.order_id + ";" + "</OrderId>";    //必须
                // body += "<InvoiceNumber>"+ "metadata:InvoiceNumber=" + row.invoice_number + ";" + "</InvoiceNumber>";  //必须
                // body += "<TotalAmount>"+ "metadata:TotalAmount=" + row.total_amount + ";" + "</TotalAmount>";    //非必须 row.total_amount
                // body += "<VATAmount>"+ "metadata:TotalVATAmount=" +row.vat_amount+ ";" + "</VATAmount>";  //非必须   row.vat_amount
                // body += "<DocumentType>"+ 'metadata:DocumentType=Invoice' + "</DocumentType>"; //非必须

                // body += "<OrderId>"+row.order_id +"</OrderId>";    //必须
                // body += "<InvoiceNumber>"+ row.invoice_number+ "</InvoiceNumber>";  //必须
                // body += "<TotalAmount>" + row.total_amount + "</TotalAmount>";    //非必须 row.total_amount
                // body += "<VATAmount>"+ row.vat_amount+"</VATAmount>";  //非必须   row.vat_amount
                // body += "<DocumentType>"+ 'Invoice' + "</DocumentType>"; //非必须

                // body += "</FeedOptions>";

                body += "<FeedContent>" + row.vat_invoice + "</FeedContent>"; //PDF文档
                body += "</Message>";
            });
            body += "</AmazonEnvelope>";
            log.debug("body", body);
            var auth = exports.amazon.getAuthByAccountId(account_id);
            log.debug("auth", auth);
            if (auth) {
                //log.debug("in","in");
                // var rtn = exports.amazon.mwsRequestMaker1(auth, 'SubmitFeed', '2009-01-01', {
                //     FeedType: enums.feed_type[enums.feed_type._UPLOAD_VAT_INVOICE_],
                //     PurgeAndReplace: 'false',
                //     ContentMD5Value: encode.convert({
                //         string: exports.utils.md5(body),
                //         inputEncoding: encode.Encoding.HEX,
                //         outputEncoding: encode.Encoding.BASE_64
                //     }),
                // }, '/', body,rows,'uploadInvoice'), res = xml.Parser.fromString({ text: rtn });
                var rtn = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._UPLOAD_VAT_INVOICE_],
                        PurgeAndReplace: 'false',
                        ContentMD5Value: encode.convert({
                            string: exports.utils.md5(body),
                            inputEncoding: encode.Encoding.HEX,
                            outputEncoding: encode.Encoding.BASE_64
                        }),
                    }, '/', body, 'uploadInvoice'),
                    res = xml.Parser.fromString({
                        text: rtn
                    });
                log.debug("rtn", rtn);
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    log.debug("res", res);
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    //log.debug("feed1",feed)
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_account,
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_submission_id,
                        value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_type,
                        value: exports.utils.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.submitted_date,
                        value: exports.utils.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_processing_status,
                        value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.started_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.completed_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_body,
                        value: body
                    });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    var feed_id = feed.save();
                    //log.debug("feed_id",feed_id)
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    //log.debug("e1","e1");
                    throw "\u63D0\u4EA4Tracking\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                //log.debug("e2","e2");
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        
        RefundOrderAdjustments: function (account_id, rows, rec_id) {
            log.debug("Refund", "refund");
            var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.02</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>OrderAdjustment</MessageType>";
            rows.map(function (row, _) {
                body += "<Message>";
                body += "<MessageID>" + (_ + 1) + "</MessageID>";
                body += "<OrderAdjustment>";
                body += "<AmazonOrderID>" + row.po_number + "</AmazonOrderID>";
                body += "<ActionType>" + row.refund_type + "</ActionType>";
                //                body += "<ActionType>" + 'Refund' + "</ActionType>";
                body += "<AdjustedItem>";
                body += "<AmazonOrderItemCode>" + row.orderitemid + "</AmazonOrderItemCode>";
                body += "<AdjustmentReason>" + row.reason + "</AdjustmentReason>";
                body += "<ItemPriceAdjustments>";
                body += "<Component>";
                body += "<Type>" + row.price_type_principal + "</Type>";
                body += "<Amount currency='USD'>" + row.refund_sale_total + "</Amount>";
                body += "</Component>";
                body += "<Component>";
                body += "<Type>" + row.price_type_shipping + "</Type>";
                body += "<Amount currency='USD'>" + row.refund_shipping + "</Amount>";
                body += "</Component>";
                body += "</ItemPriceAdjustments>";
                body += "<PromotionAdjustments>";
                //                body += "<PromotionClaimCode>" + row.promotion_ids + "</PromotionClaimCode>";
                body += "<Component>";
                body += "<Type>" + 'Principal' + "</Type>";
                body += "<Amount currency='USD'>" + row.refund_promotion + "</Amount>";
                body += "</Component>";
                body += "</PromotionAdjustments>";
                body += "</AdjustedItem>";
                body += "</OrderAdjustment>";
                body += "</Message>";
            });
            body += "</AmazonEnvelope>";
            log.debug("body", body);
            var auth = exports.amazon.getAuthByAccountId(account_id);
            log.debug("auth", auth);
            if (auth) {
                //log.debug("in","in");
                var rtn = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._POST_PAYMENT_ADJUSTMENT_DATA_],
                        PurgeAndReplace: 'false',
                        ContentMD5Value: encode.convert({
                            string: exports.utils.md5(body),
                            inputEncoding: encode.Encoding.HEX,
                            outputEncoding: encode.Encoding.BASE_64
                        }),
                    }, '/', body),
                    res = xml.Parser.fromString({
                        text: rtn
                    });
                log.debug("rtn", rtn);
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    //log.debug("res",res);
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    //log.debug("feed",feed);
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_account,
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_submission_id,
                        value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_type,
                        value: exports.utils.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.submitted_date,
                        value: exports.utils.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_processing_status,
                        value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.started_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.completed_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_body,
                        value: body
                    });
                    feed.setValue({
                        fieldId: 'custrecord_hf_refund_id',
                        value: rec_id
                    });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    var feedid = feed.save();
                    log.debug("feedid", feedid);
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    //log.debug("e1","e1");
                    throw "\u63D0\u4EA4Refund\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                //log.debug("e2","e2");
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        CreateFulfillmentOrder: function (account_id, params) {
            var auth = exports.amazon.getAuthByAccountId(account_id);
            if (auth) {
                log.debug('auth', auth);
                var response = exports.amazon.mwsRequestMaker(auth, 'CreateFulfillmentOrder', '2010-10-01', params, '/FulfillmentOutboundShipment/2010-10-01');
                log.debug('response', response);
                var res = xml.Parser.fromString({
                    text: response
                });
                //   rtn_shipment_id = xml.XPath.select({ node: res, xpath: "//nlapi:CreateInboundShipmentResult/nlapi:ShipmentId" }).map(function (_) { return _.textContent; }).join('');
            }
            //   return rtn_shipment_id;
        },
        FBAFulfillmentOrder: function (account_id, rows) {
            log.audit('gfw_rows', rows);
            var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>FulfillmentOrderRequest</MessageType>";
            rows.map(function (row, _) {
                log.audit('gfw_rows1', row.DisplayableOrderDateTime);
                var DisplayableOrderDate = format.parse({
                    type: format.Type.DATE,
                    value: row.DisplayableOrderDateTime
                });
                log.audit('gfw_rows2', DisplayableOrderDate);
                body += "<Message>";
                body += "<MessageID>" + (_ + 1) + "</MessageID>";
                body += "<FulfillmentOrderRequest>";
                body += "<MerchantFulfillmentOrderID>" + row.SellerFulfillmentOrderId + "</MerchantFulfillmentOrderID>";
                body += "<DisplayableOrderID>" + row.DisplayableOrderId + "</DisplayableOrderID>";
                body += "<DisplayableOrderDate>" + DisplayableOrderDate + "</DisplayableOrderDate>";
                body += "<FulfillmentAction>" + row.FulfillmentAction + "</FulfillmentAction>";
                body += "<Item>";
                body += "<MerchantSKU>" + row.SellerSKU + "</MerchantSKU>";
                body += "<Quantity>" + row.Quantity + "</Quantity>";
                body += "<MerchantFulfillmentOrderItemID>" + row.SellerFulfillmentOrderItemId + "</MerchantFulfillmentOrderItemID>";
                body += "</Item>";
                body += "<DisplayableOrderComment>" + row.DisplayableOrderComment + "</DisplayableOrderComment>";
                body += "<DeliverySLA>" + row.ShippingSpeedCategory + "</DeliverySLA>";
                body += "<DestinationAddress>";
                body += "<AddressName>" + row.AddressName + "</AddressName>";
                body += "<AddressFieldOne>" + row.Line1 + "</AddressFieldOne>";
                body += "<AddressFieldTwo>" + row.Line2 + "</AddressFieldTwo>";
                body += "<AddressCity>" + row.City + "</AddressCity>";
                body += "<AddressCountryCode>" + row.CountryCode + "</AddressCountryCode>";
                body += "<AddressStateOrRegion>" + row.StateOrProvinceCode + "</AddressStateOrRegion>";
                body += "<AddressPostalCode>" + row.PostalCode + "</AddressPostalCode>";
                body += "<AddressPhoneNumber>" + row.PhoneNumber + "</AddressPhoneNumber>";
                body += "</DestinationAddress>";
                body += "<NotificationEmail>" + row.email + "</NotificationEmail>";
                body += "</FulfillmentOrderRequest>";
                body += "</Message>";
            });
            body += "</AmazonEnvelope>";
            log.audit('gfw_mfc_body', body);
            var auth = exports.amazon.getAuthByAccountId(account_id);
            log.audit('gfw_mfc_auth', auth);
            if (auth) {
                var rtn = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._POST_FULFILLMENT_ORDER_REQUEST_DATA_],
                        PurgeAndReplace: 'false',
                        ContentMD5Value: encode.convert({
                            string: exports.utils.md5(body),
                            inputEncoding: encode.Encoding.HEX,
                            outputEncoding: encode.Encoding.BASE_64
                        }),
                    }, '/', body),
                    res = xml.Parser.fromString({
                        text: rtn
                    });
                log.audit('gfw_mfc_rtn', rtn);
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_account,
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_submission_id,
                        value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_type,
                        value: exports.utils.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.submitted_date,
                        value: exports.utils.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_processing_status,
                        value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.started_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.completed_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_body,
                        value: body
                    });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    feed.save();
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    throw "\u63D0\u4EA4Tracking\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        uploadTracking: function (account_id, rows, fulfillment_id) {
            log.debug("input", {
                account_id: account_id,
                rows: rows,
                fulfillment_id: fulfillment_id
            });
            var body = "<?xml version=\"1.0\" encoding=\"UTF-8\"?><AmazonEnvelope><Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>AIO</MerchantIdentifier></Header><MessageType>OrderFulfillment</MessageType>";
            rows.map(function (row, _) {
                log.debug("row", row)
                body += "<Message>";
                body += "<MessageID>" + (_ + 1) + "</MessageID>";
                body += "<OrderFulfillment>";
                body += "<AmazonOrderID>" + row.order_id + "</AmazonOrderID><FulfillmentDate>" + row.shipment_date + "</FulfillmentDate>";
                body += "<FulfillmentData><CarrierName>" + row.carrier_code + "</CarrierName><ShippingMethod>" + row.shipment_method + "</ShippingMethod><ShipperTrackingNumber>" + row.tracking_number + "</ShipperTrackingNumber></FulfillmentData>";
                body += "<Item><AmazonOrderItemCode>" + row.order_item_id + "</AmazonOrderItemCode><Quantity>" + row.item_qty + "</Quantity></Item>";
                body += "</OrderFulfillment>";
                body += "</Message>";
            });
            body += "</AmazonEnvelope>";
            var auth = exports.amazon.getAuthByAccountId(account_id);
            if (auth) {
                //   log.debug("account_id",account_id)
                log.debug("auth", auth);
                var rtn = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', {
                        FeedType: enums.feed_type[enums.feed_type._POST_ORDER_FULFILLMENT_DATA_],
                        PurgeAndReplace: 'false',
                        ContentMD5Value: encode.convert({
                            string: exports.utils.md5(body),
                            inputEncoding: encode.Encoding.HEX,
                            outputEncoding: encode.Encoding.BASE_64
                        }),
                    }, '/', body),
                    res = xml.Parser.fromString({
                        text: rtn
                    });
                log.debug("rtn", rtn);
                log.debug("res", res);

                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    log.debug("rows.order_id", rows[0].order_id);
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_account,
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_submission_id,
                        value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_type,
                        value: exports.utils.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.submitted_date,
                        value: exports.utils.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_processing_status,
                        value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.started_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.completed_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_body,
                        value: body
                    });
                    feed.setValue({
                        fieldId: 'custrecord_hf_fulfillment_id',
                        value: fulfillment_id
                    });
                    feed.setValue({
                        fieldId: 'custrecord_aio_order_id',
                        value: rows[0].order_id
                    });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    var feedid = feed.save();
                    log.debug("feedid", feedid);
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    throw "\u63D0\u4EA4Tracking\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + rtn;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        submitCartonContent: function (account_id, to_id, shipment_id) {
            var auth = exports.amazon.getAuthByAccountId(account_id),
                to = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: to_id,
                    isDynamic: true
                });
            if (auth) {
                var params = {},
                    carton_infos_1 = {};
                search.create({
                    type: exports.ns.amazon_shipment_import._name,
                    filters: [{
                        name: exports.ns.amazon_shipment_import.amazon_shipment_toid,
                        operator: search.Operator.ANYOF,
                        values: to_id
                    }],
                    columns: [{
                            name: exports.ns.amazon_shipment_import.amazon_shipment_item
                        },
                        {
                            name: exports.ns.amazon_shipment_import.shipment_qty
                        },
                        {
                            name: exports.ns.amazon_shipment_import.amazon_shipment_boxid
                        },
                        {
                            name: exports.ns.amazon_shipment_import.shipment_tracking
                        },
                    ]
                }).run().each(function (b) {
                    var item_line_no = to.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: b.getValue(b.columns[0])
                    });
                    if (item_line_no == -1)
                        throw "\u6570\u636E\u975E\u6CD5\uFF0CITEM[" + b.getText(b.columns[0]) + "]\u5728\u521D\u59CB\u5355\u636E\u4E0A\u627E\u4E0D\u5230\uFF01";
                    var boxinfo = {
                        sku: to.getSublistValue({
                            sublistId: 'item',
                            fieldId: exports.ns.cols.amazon_msku,
                            line: item_line_no
                        }),
                        qty: to.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: item_line_no
                        }),
                        qty_in_case: Number(b.getValue(b.columns[1])),
                        tracking: b.getValue(b.columns[3]),
                    };
                    if (carton_infos_1.hasOwnProperty("box_" + b.getValue(b.columns[2]))) {
                        carton_infos_1["box_" + b.getValue(b.columns[2])].push(boxinfo);
                    } else {
                        carton_infos_1["box_" + b.getValue(b.columns[2])] = [boxinfo];
                    }
                    return true;
                });
                log.audit('carton_infos', carton_infos_1);
                // 提交装箱单信恄1�7
                var body_1 = '<?xml version="1.0" encoding="utf-8"?>' +
                    '<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">' +
                    '<Header>' +
                    '<DocumentVersion>1.01</DocumentVersion>' +
                    '<MerchantIdentifier>' + auth.seller_id + '</MerchantIdentifier>' +
                    '</Header>' +
                    '<MessageType>CartonContentsRequest</MessageType>' +
                    '<Message>' +
                    '<MessageID>1</MessageID>' +
                    '<CartonContentsRequest>' +
                    '<ShipmentId>' + shipment_id + '</ShipmentId>' +
                    '<NumCartons>' + Object.keys(carton_infos_1).length + '</NumCartons>';
                Object.keys(carton_infos_1).map(function (carton_id) {
                    body_1 += "<Carton><CartonId>" + carton_id.replace('box_', '') + "</CartonId>";
                    carton_infos_1["" + carton_id].map(function (item) {
                        body_1 += "<Item><SKU>" + item.sku + "</SKU><QuantityShipped>" + item.qty_in_case + "</QuantityShipped><QuantityInCase>" + item.qty_in_case + "</QuantityInCase></Item>";
                    });
                    body_1 += "</Carton>";
                });
                body_1 += '</CartonContentsRequest></Message></AmazonEnvelope>';
                params['FeedType'] = "_POST_FBA_INBOUND_CARTON_CONTENTS_";
                params['PurgeAndReplace'] = 'true';
                params['ContentMD5Value'] = encode.convert({
                    string: exports.utils.md5(body_1),
                    inputEncoding: encode.Encoding.HEX,
                    outputEncoding: encode.Encoding.BASE_64
                });
                log.audit('md5', exports.utils.md5(body_1));
                log.audit('params', params);
                log.audit('body', body_1);
                var content = exports.amazon.mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', params, '/', body_1);
                var res = xml.Parser.fromString({
                    text: content
                });
                if (res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    }).length > 0) {
                    var feed = record.create({
                        type: exports.ns.amazon_feed._name,
                        isDynamic: true
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_account,
                        value: account_id
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_submission_id,
                        value: exports.utils.getTextContentSafe(res, 'FeedSubmissionId')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_type,
                        value: exports.utils.getTextContentSafe(res, 'FeedType')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.submitted_date,
                        value: exports.utils.getTextContentSafe(res, 'SubmittedDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_processing_status,
                        value: exports.utils.getTextContentSafe(res, 'FeedProcessingStatus')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.started_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'StartedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.completed_processing_date,
                        value: exports.utils.getTextContentSafe(res, 'CompletedProcessingDate')
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_body,
                        value: body_1
                    });
                    feed.setValue({
                        fieldId: exports.ns.amazon_feed.feed_referenced,
                        value: to_id
                    });
                    // feed.setValue({fieldId: ns.amazon_feed.feed_response, value: res.getElementsByTagName({ tagName: 'FeedSubmissionId' })[0].textContent});
                    feed.save();
                    return res.getElementsByTagName({
                        tagName: 'FeedProcessingStatus'
                    })[0].textContent;
                } else {
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        putTransportContent: function (account_id, to_id, shipment_id) {
            var auth = exports.amazon.getAuthByAccountId(account_id),
                to = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: to_id,
                    isDynamic: true
                });
            if (auth) {
                var params = {},
                    carton_infos_2 = {};
                search.create({
                    type: exports.ns.amazon_shipment_import._name,
                    filters: [{
                        name: exports.ns.amazon_shipment_import.amazon_shipment_toid,
                        operator: search.Operator.ANYOF,
                        values: to_id
                    }],
                    columns: [{
                            name: exports.ns.amazon_shipment_import.amazon_shipment_item
                        },
                        {
                            name: exports.ns.amazon_shipment_import.shipment_qty
                        },
                        {
                            name: exports.ns.amazon_shipment_import.amazon_shipment_boxid
                        },
                        {
                            name: exports.ns.amazon_shipment_import.shipment_tracking
                        },
                    ]
                }).run().each(function (b) {
                    var item_line_no = to.findSublistLineWithValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: b.getValue(b.columns[0])
                    });
                    if (item_line_no == -1)
                        throw "\u6570\u636E\u975E\u6CD5\uFF0CITEM[" + b.getText(b.columns[0]) + "]\u5728\u521D\u59CB\u5355\u636E\u4E0A\u627E\u4E0D\u5230\uFF01";
                    var boxinfo = {
                        sku: to.getSublistValue({
                            sublistId: 'item',
                            fieldId: exports.ns.cols.amazon_msku,
                            line: item_line_no
                        }),
                        qty: to.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'quantity',
                            line: item_line_no
                        }),
                        qty_in_case: Number(b.getValue(b.columns[1])),
                        tracking: b.getValue(b.columns[3]),
                    };
                    if (carton_infos_2.hasOwnProperty("box_" + b.getValue(b.columns[2]))) {
                        carton_infos_2["box_" + b.getValue(b.columns[2])].push(boxinfo);
                    } else {
                        carton_infos_2["box_" + b.getValue(b.columns[2])] = [boxinfo];
                    }
                    return true;
                });
                log.audit('carton_infos', carton_infos_2);
                var pms_1 = {
                    'ShipmentId': "" + shipment_id,
                    'IsPartnered': 'false',
                    'ShipmentType': 'SP',
                    'TransportDetails.NonPartneredSmallParcelData.CarrierName': 'OTHER'
                };
                Object.keys(carton_infos_2).map(function (carton_id, i) {
                    pms_1["TransportDetails.NonPartneredSmallParcelData.PackageList.member." + (i + 1) + ".TrackingId"] = carton_infos_2[carton_id][0].tracking;
                });
                var transport_content = exports.amazon.mwsRequestMaker(auth, 'PutTransportContent', '2010-10-01', pms_1, '/FulfillmentInboundShipment/2010-10-01'),
                    transport_result = xml.Parser.fromString({
                        text: transport_content
                    });
                if (transport_result.getElementsByTagName({
                        tagName: 'TransportStatus'
                    }).length > 0 && transport_result.getElementsByTagName({
                        tagName: 'TransportStatus'
                    })[0].textContent == 'WORKING') {
                    return 'WORKING';
                } else {
                    throw "\u63D0\u4EA4Transport Content\u5230\u4E9A\u9A6C\u900A\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + transport_content;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        updateInboundShipment: function (account_id, to_id, shipment_id, shipment_status) {
            var auth = exports.amazon.getAuthByAccountId(account_id),
                to = record.load({
                    type: record.Type.TRANSFER_ORDER,
                    id: to_id,
                    isDynamic: true
                }),
                addr = exports.amazon.getAddressById(Number(to.getValue(exports.ns.bodies.inbound_ship_from_addr)));
            if (auth && addr) {
                var params = {
                    "ShipmentId": shipment_id,
                    "InboundShipmentHeader.ShipmentName": to.getValue(exports.ns.bodies.inbound_shipment_name),
                    "InboundShipmentHeader.ShipFromAddress.Name": addr.Name,
                    "InboundShipmentHeader.ShipFromAddress.AddressLine1": addr.AddressLine1,
                    "InboundShipmentHeader.ShipFromAddress.AddressLine2": addr.AddressLine2,
                    "InboundShipmentHeader.ShipFromAddress.City": addr.City,
                    "InboundShipmentHeader.ShipFromAddress.DistrictOrCounty": addr.DistrictOrCounty,
                    "InboundShipmentHeader.ShipFromAddress.StateOrProvinceCode": addr.StateOrProvinceCode,
                    "InboundShipmentHeader.ShipFromAddress.CountryCode": addr.CountryCode,
                    "InboundShipmentHeader.ShipFromAddress.PostalCode": addr.PostalCode,
                    "InboundShipmentHeader.DestinationFulfillmentCenterId": to.getValue(exports.ns.bodies.inbound_dest_center_id),
                    "InboundShipmentHeader.ShipmentStatus": shipment_status,
                    // "InboundShipmentHeader.IntendedBoxContentsSource": intended_box_contents_source,
                    "InboundShipmentHeader.LabelPrepPreference": to.getValue(exports.ns.bodies.inbound_label_prep_type),
                };
                var line_count = to.getLineCount({
                    sublistId: 'item'
                });
                for (var key = 0; key < line_count; key++) {
                    params["InboundShipmentItems.member." + (key + 1) + ".QuantityShipped"] = to.getSublistValue({
                        sublistId: 'item',
                        fieldId: exports.ns.cols.qty_shipped,
                        line: key
                    });
                    params["InboundShipmentItems.member." + (key + 1) + ".SellerSKU"] = to.getSublistValue({
                        sublistId: 'item',
                        fieldId: exports.ns.cols.amazon_msku,
                        line: key
                    });
                }
                log.debug('params', params);
                var response = exports.amazon.mwsRequestMaker(auth, 'UpdateInboundShipment', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01');
                log.debug('response', response);
                var res = xml.Parser.fromString({
                    text: response
                });
                var rtn_shipment_id = xml.XPath.select({
                    node: res,
                    xpath: "//nlapi:UpdateInboundShipmentResult/nlapi:ShipmentId"
                }).map(function (_) {
                    return _.textContent;
                }).join('');
                if (rtn_shipment_id) {
                    to.setValue({
                        fieldId: exports.ns.bodies.inbound_shipment_status,
                        value: exports.amazon.listInboundShipments(auth, null, [rtn_shipment_id]).shift().shipment_status
                    });
                    to.save();
                    return rtn_shipment_id;
                } else {
                    throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + response;
                }
            } else {
                throw "\u66F4\u65B0Amazon Inbound Shipment[" + shipment_id + "]\u5931\u8D25\uFF0C\u65E0\u6CD5\u4ECE\u7CFB\u7EDF\u4E2D\u83B7\u53D6\u539F\u59CBTransfer Order\u7684\u57FA\u7840\u4FE1\u606F\uFF01";
            }
        },
        getUniquePackageLabels: function (account_id, to_id, shipment_id, page) {
            var auth = exports.amazon.getAuthByAccountId(account_id),
                params = {
                    ShipmentId: shipment_id,
                    PageType: 'PackageLabel_Plain_Paper'
                };
            if (auth) {
                var key_1 = 0,
                    s = search.create({
                        type: exports.ns.amazon_shipment_import._name,
                        filters: [{
                            name: exports.ns.amazon_shipment_import.amazon_shipment_toid,
                            operator: search.Operator.ANYOF,
                            values: to_id
                        }],
                        columns: [{
                            name: exports.ns.amazon_shipment_import.amazon_shipment_boxid,
                            summary: search.Summary.GROUP
                        }]
                    }).run();
                if (page) {
                    s.getRange({
                        start: (page - 1) * 50,
                        end: page * 50
                    }).map(function (rec) {
                        params["PackageLabelsToPrint.member." + ++key_1] = rec.getValue(rec.columns[0]);
                        return true;
                    });
                } else {
                    s.each(function (rec) {
                        params["PackageLabelsToPrint.member." + ++key_1] = rec.getValue(rec.columns[0]);
                        return true;
                    });
                }
                log.debug('getUniquePackageLabels.request', params);
                var content = exports.amazon.mwsRequestMaker(auth, 'GetUniquePackageLabels', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01/');
                log.debug('getUniquePackageLabels.response', content);
                var res = xml.Parser.fromString({
                    text: content
                });
                if (res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    }).length > 0) {
                    return res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                } else {
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        getPalletLabels: function (account_id, to_id, shipment_id) {
            var auth = exports.amazon.getAuthByAccountId(account_id),
                params = {
                    ShipmentId: shipment_id,
                    PageType: 'PackageLabel_Plain_Paper',
                };
            if (auth) {
                var key_2 = 0;
                search.create({
                    type: exports.ns.amazon_shipment_import._name,
                    filters: [{
                        name: exports.ns.amazon_shipment_import.amazon_shipment_toid,
                        operator: search.Operator.ANYOF,
                        values: to_id
                    }],
                    columns: [{
                        name: exports.ns.amazon_shipment_import.amazon_shipment_boxid,
                        summary: search.Summary.GROUP
                    }]
                }).run().each(function (rec) {
                    key_2++;
                    return true;
                });
                params['NumberOfPallets'] = key_2;
                var content = exports.amazon.mwsRequestMaker(auth, 'GetPalletLabels', '2010-10-01', params, '/FulfillmentInboundShipment/2010-10-01/'),
                    res = xml.Parser.fromString({
                        text: content
                    });
                if (res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    }).length > 0) {
                    return res.getElementsByTagName({
                        tagName: 'PdfDocument'
                    })[0].textContent;
                } else {
                    throw "\u4ECE\u4E9A\u9A6C\u900A\u83B7\u53D6\u4FE1\u606F\u5931\u8D25\uFF0C\u8BE6\u7EC6\u8FD4\u56DE\u4FE1\u606F: " + content;
                }
            } else {
                throw "\u4ECEAIO\u83B7\u53D6\u8D26\u53F7\u4FE1\u606F\u5931\u8D25";
            }
        },
        mwsRequestMaker: function (auth, action, version, params, resource, body, type_feed) {
            if (resource === void 0) {
                resource = '/';
            }
            var timestamp = encodeURIComponent(new Date().toISOString());
            var query = {
                SellerId: encodeURIComponent(auth.seller_id),
                AWSAccessKeyId: encodeURIComponent(auth.access_id),
                Action: encodeURIComponent(action),
                SignatureMethod: encodeURIComponent('HmacSHA256'),
                SignatureVersion: encodeURIComponent('2'),
                Timestamp: timestamp,
                Version: encodeURIComponent(version)
            };

            log.debug("type_feed："+type_feed)
          
            if (type_feed == 'uploadInvoice' || type_feed=="uploadPrice" ) {
                query['MarketplaceIdList.Id.1'] = encodeURIComponent(auth.marketplace_id);
            }
            if (auth.auth_token) {
                query['MWSAuthToken'] = encodeURIComponent(auth.auth_token);
            }
            for (var key in params) {
                if (params[key] != '') {
                    query[key] = encodeURIComponent(params[key]);
                }
            }
            var keys = Object.keys(query);
            keys.sort();
            var queryString = keys.map(function (key) {
                return key + "=" + query[key];
            }).join('&');
            var hash = cryptoJS.HmacSHA256("POST\n" + auth.end_point + "\n" + resource + "\n" + queryString, auth.sec_key);
            var hashInBase64 = encodeURIComponent(encode.convert({
                string: hash,
                inputEncoding: encode.Encoding.HEX,
                outputEncoding: encode.Encoding.BASE_64
            }));
            var response = https.post({
                url: "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64,
                body: body ? body : queryString + "&Signature=" + hashInBase64,
                headers: body ? {
                    'Content-Type': 'text/xml',
                } : {}
            });
            log.debug('url', "https://" + auth.end_point + resource + "?" + queryString + "&Signature=" + hashInBase64);
            log.debug('body', body ? body : queryString + "&Signature=" + hashInBase64);
            log.debug('headers', body ? {
                'Content-Type': 'text/xml',
            } : {});
            log.debug('hashInBase64', hashInBase64);
            log.debug('response', response);
            if (response.body.indexOf('</ErrorResponse>') != -1) {
                var err = xml.Parser.fromString({
                    text: response.body
                });
                if (err) {
                    throw "MWS Request Builder ERR:\r\n\r\nSeller ID: " + auth.seller_id + "\r\n\r\nError Details: \r\n\r\n" + response.body + " \r\n\rParams: <pre>" + JSON.stringify(params, null, 2) + "</pre> \r\n\r\nSHA 256 HMAC: " + hash;
                } else {
                    throw response.body;
                }
            }
            log.debug('mwsRequestMaker.response.header', response.headers);
            return response.body;
        },
        labelPrepPreference: ['SELLER_LABEL', 'AMAZON_LABEL_ONLY', 'AMAZON_LABEL_PREFERRED'],
        shipToCountryCode: {
            'United States': 'US',
            'Canada': 'CA',
            'Mexico': 'MX',
            'Germany': 'DE',
            'Spain': 'ES',
            'France': 'FR',
            'United Kingdom': 'GB',
            'Italy': 'IT',
            'Japan': 'JP'
        },
        condition: ['NewItem', 'NewWithWarranty', 'NewOEM', 'NewOpenBox', 'UsedLikeNew', 'UsedVeryGood', 'UsedGood', 'UsedAcceptable', 'UsedPoor', 'UsedRefurbished', 'CollectibleLikeNew', 'CollectibleVeryGood', 'CollectibleGood', 'CollectibleAcceptable', 'CollectiblePoor', 'RefurbishedWithWarranty', 'Refurbished', 'Club'],
        intendedBoxContentsSource: ['NONE', 'FEED', '2D_BARCODE']
    };
});