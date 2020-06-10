/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
/**
 * @param {record} record
 * @param {search} search
 */
function(record, search) {

    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost(requestBody) {
    	var body = requestBody;
    	var store_name = body.store_name;
		log.debug("store_name",store_name);
		var status = body.status;
		log.debug("status",status);
		try{
			var product = [];
			search.create({
				type: 'customrecord_aio_amazon_mfn_listing',
				filters: [
					{ name: 'custrecord_aio_mfn_l_listing_acc_id',  operator:'anyof', values: store_name },
					{ name: 'custrecord_aio_mfn_l_status',  operator:'is', values: status },
					],
					columns: [
						{name:'custrecord_aio_mfn_l_listing_acc_id'},
						{name:'custrecord_aio_mfn_l_item_name'},
						{name:'custrecord_aio_mfn_l_seller_sku'},
						{name:'custrecord_aio_mfn_l_asin1'},
						{name:'custrecord_aio_mfn_l_product_id'},
						{name:'custrecord_aio_mfn_l_status'},
						{name:'custrecord_aio_mfn_l_price'},
						]
			}).run().each(function (result) {
				product.push({
					p_acc_id: result.getValue(result.columns[0]),
					p_item_name: result.getValue(result.columns[1]),
					p_seller_sku: result.getValue(result.columns[2]),
					p_asin: result.getValue(result.columns[3]),
					p_product_id: result.getValue(result.columns[4]),
					p_status: result.getValue(result.columns[5]),
					p_price: result.getValue(result.columns[6]),
				})
			});
			log.debug("product",product);
			return product;
		}catch(e){
			log.debug("出错",e)
		}
    }


    return {

        post: doPost,

    };
    
});
