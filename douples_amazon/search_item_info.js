/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/format', 'N/record', 'N/search', 'N/ui/serverWidget', 'N/runtime'],
/**
 * @param {format} format
 * @param {record} record
 * @param {search} search
 * @param {serverWidget} serverWidget
 */
function(format, record, search, serverWidget, runtime) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {
    	var req = context.request;
    	var res = context.response
    	var user_id = runtime.getCurrentUser().role;
    	var account;
    	search.create({
    		type: 'customrecord_aio_account',
    		filters:[
    			{name:'custrecord_account_role',operator:'is',values: user_id},
    		],
    		columns:[
    			{name: 'internalID'}
    		]
    	}).run().each(function(e) {
    		account = e.getValue(e.columns[0]);
    		return true;
    	})
    	log.debug("account",account);
    	var form = serverWidget.createForm( {title : 'Search Item Information' } );
		form.addFieldGroup({ id: 'custpage_filter', label: 'Primary Information' });
			if(user_id == 3){
				var store_name = form.addField({
					id : 'custpage_item_info_stroe_name',
					type : serverWidget.FieldType.SELECT,
					label : 'Store Name',
					source: 'customrecord_aio_account',
					container: 'custpage_filter'
		    	});
				// }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
				// store_name.defaultValue = account;
			}else{
				var store_name = form.addField({
					id : 'custpage_item_info_stroe_name',
					type : serverWidget.FieldType.SELECT,
					label : 'Store Name',
					source: 'customrecord_aio_account',
					container: 'custpage_filter'
	//	    	});
				}).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
				store_name.defaultValue = account;
			}

	    	var status = form.addField({
	    	    id : 'custpage_item_info_status',
	    	    type : serverWidget.FieldType.SELECT,
	    	    label : 'Status',
	    	    container: 'custpage_filter',
	    	});
	    	status.addSelectOption({
	    	    value : 'active',
	    	    text : 'Active'
	    	});
	    	status.addSelectOption({
	    	    value : 'inactive',
	    	    text : 'Inactive'
	    	});
	    	status.addSelectOption({
	    	    value : 'incomplete',
	    	    text : 'Incomplete'
	    	});
	    	
	    	form.addButton({
	    	    id : 'custpage_search_item',
	    	    label: 'Search',
	    	    functionName: 'dps_search_item',
	    	});
	    	
	    	form.addButton({
	    	    id : 'custpage_update_price',
	    	    label: 'Submit',
	    	    functionName: 'dps_create_update_price',
	    	});
    	
    	   	
    	var sb = form.addSublist({ id: 'custpage_details', type: serverWidget.SublistType.INLINEEDITOR, label: 'Item Information' });
			sb.addField({ id: 'custpage_acc_id', type: serverWidget.FieldType.TEXT, label: 'acc_id'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_item_name', type: serverWidget.FieldType.TEXTAREA, label: 'item_name'}).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
//			sb.addField({ id: 'custpage_item_description', type: serverWidget.FieldType.TEXTAREA, label: 'item_description' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_item_sku', type: serverWidget.FieldType.TEXT,label: 'item_sku' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_asin', type: serverWidget.FieldType.TEXT, label: 'asin' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_product_id', type: serverWidget.FieldType.TEXT, label: 'product_id' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_status', type: serverWidget.FieldType.TEXT, label: 'status' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_price', type: serverWidget.FieldType.FLOAT, label: 'price' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
			sb.addField({ id: 'custpage_new_price', type: serverWidget.FieldType.FLOAT, label: 'new_Price' }).updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
			
			
//		if(context.request.method == 'POST'){
//			
//			var store_name = form.getField({
//				id : 'custpage_item_info_stroe_name'
//			});
//			var status = form.getField({
//				id : 'custpage_item_info_status'
//			});
//			try{
//				var lines = 0;
//				
//				search.create({
//					type: 'customrecord_aio_products_listing',
//					filters: [
//						{ name: 'custrecord_aio_p_acc_id',  operator:'is', values: store_name },
//						{ name: 'custrecord_aio_p_status',  operator:'is', values: status },
//					],
//					columns: [
//		                {name: 'custrecord_aio_p_acc_id'},
//		                {name: 'custrecord_aio_p_item_name'},
//		                {name: 'custrecord_aio_p_item_description'},
//		                {name: 'custrecord_aio_p_asin'},
//		                {name: 'custrecord_aio_p_product_id'},
//		                {name: 'custrecord_aio_p_status'},
//		                {name: 'custrecord_aio_p_price'},
//		            ]
//				}).run().each(function (rec) {
//					log.debug("rec.id",rec.id)					
////					var rec1 = record.load({type : 'customrecord_aio_products_listing' , id : rec.id});
//					log.audit("rec1",rec1);
//					log.audit("acc_id",rec1.getValue({fieldId: 'custrecord_aio_p_acc_id'}) );
//					
//					sb.setSublistValue({
//						id : 'custpage_acc_id',
//						line : lines,
//						value : rec.getValue(rec.columns[0])
//					});
//					log.audit("1",1);
//					sb.setSublistValue({
//						id : 'custpage_item_name',
//						line : lines,
//						value : rec.getValue(rec.columns[1])
//					});
//					sb.setSublistValue({
//						id : 'custpage_item_description',
//						line : lines,
//						value : rec.getValue(rec.columns[2])
//					});
//					log.audit("2",2);
//					sb.setSublistValue({
//						id : 'custpage_asin',
//						line : lines,
//						value : rec.getValue(rec.columns[3])
//					});
//					log.audit("3",3);
//					sb.setSublistValue({
//						id : 'custpage_product_id',
//						line : lines,
//						value : rec.getValue(rec.columns[4])
//					});
//					log.audit("4",4);
//					sb.setSublistValue({
//						id : 'custpage_status',
//						line : lines,
//						value : rec.getValue(rec.columns[5])
//					});
//					log.audit("5",5);
//					sb.setSublistValue({
//						id : 'custpage_price',
//						line : lines,
//						value : rec.getValue(rec.columns[6])
//					});
//					log.audit("6",6);
//					
//					lines ++;
//					return true;
//					
//				});
//			}
//			catch(e){
//				log.audit('出错',e);
//			}
//			
//		}

	    
   	 	
   	 	
   	 	
	    form.clientScriptModulePath = './search_item_info_cs.js';
	    res.writePage({ pageObject: form });
   	 	
    }

    return {
        onRequest: onRequest
    };
    
});
