/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(["N/currentRecord", "N/record", "N/search", 'N/https', 'N/url'],

function(currentRecord, record, search, https, url) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
	var cur ;
    function pageInit(scriptContext) {
//    	console.log(11);
    cur = scriptContext.currentRecord;
    	console.log("cur"+JSON.stringify(cur));
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
    	return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
    	return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
    	return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
    	return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
    	return true;
    }
      
    function dps_search_item (){

    	console.log("cur="+JSON.stringify(cur));
    	var store_name = cur.getValue({fieldId: 'custpage_item_info_stroe_name'});
    	console.log('store_name='+JSON.stringify(store_name));
    	var status = cur.getValue({fieldId: 'custpage_item_info_status'});
    	console.log('status='+JSON.stringify(status));
    	
    	var itemLineCount = cur.getLineCount('custpage_details');
    	console.log('itemLineCount='+itemLineCount);
    	if(itemLineCount>0){
    		for (var n = itemLineCount - 1; n >= 0; n--) {
    			cur.removeLine({
    				sublistId:  'custpage_details',
    				line: n
    			});
    		}
    	}

//    	var link = url.resolveScript({
//    		scriptId: "customscript_search_item_info_rl",
//    		deploymentId: "customdeploy_search_item_info_rl",
//    	});
//    	var header = {
//        	"Content-Type": "application/json;charset=utf-8",
//        	"Accept":"application/json"
//        };
//    	var body = {
//    		"store_name": store_name,
//    		"status": status
//    	};
//    	try{
//    		https.post.promise({
//    			url: link,
//    			body: body,
//    			headers: header
//    		}).then(function (r){
//    			var str = JSON.parse(r.body);
//    			log.debug("str",str);
//    			console.log('str='+JSON.stringify(str));
//    			var lines = 0;
//    			rec.selectNewLine({sublistId: 'custpage_details'});
//    			
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_acc_id', value : str.p_acc_id });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_item_name', value : str.p_item_name });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_item_sku', value : str.p_seller_sku });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_asin', value : str.p_asin });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_product_id', value : str.p_product_id });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_status', value : str.p_status });
//        		rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_price', value : str.p_price });
//
//    			rec.commitLine({ sublistId: 'custpage_details' });
//        		lines ++;
//    			
//    		}).catch(function (reason){
//    			console.log(' catch reason='+JSON.stringify(reason));
//    			log.error("post search order error::",reason);
//    		});
//    		
//    	}catch(e){
//    		log.error("post search order error ",e)
//    	}
        var listing_id = '';
        search.create.promise({
            type: 'customrecord_aio_products_listing',
            filters: [
                { name: 'custrecord_aio_p_acc_id',  operator:'is', values: store_name },
    			{ name: 'custrecord_aio_p_status',  operator:'is', values: status },
            ],
            columns: [
                {name:'custrecord_aio_p_acc_id'},       //店铺
                {name:'custrecord_aio_p_item_name'},    //货品名称
                {name:'custrecord_aio_p_seller_sku'},   //sku
                {name:'custrecord_aio_p_asin'},         //asin
                {name:'custrecord_aio_p_product_id'},   //产品id
                {name:'custrecord_aio_p_status'},       //状态
                {name:'custrecord_aio_p_price'},        //价格
                {name:'custrecord_aio_p_item_description'},        //详细信息
            ]
        })
        .then(function(result) {
            result.run().each(function(rec_p) {
                var listing_id = rec_p.id;
                console.log("listing_id="+listing_id);
                if(listing_id){
                    cur.selectNewLine({sublistId: 'custpage_details'});
    
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_acc_id', value : rec_p.getValue('custrecord_aio_p_acc_id') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_item_name', value : rec_p.getValue('custrecord_aio_p_item_name') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_item_sku', value : rec_p.getValue('custrecord_aio_p_seller_sku') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_asin', value : rec_p.getValue('custrecord_aio_p_asin') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_product_id', value : rec_p.getValue('custrecord_aio_p_product_id') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_status', value : rec_p.getValue('custrecord_aio_p_status') });
                    cur.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_price', value : rec_p.getValue('custrecord_aio_p_price') });
                    // rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_item_description', value : rec_p.getValue('custrecord_aio_p_item_description') });
    
                    cur.commitLine({ sublistId: 'custpage_details' });
                    return true;
                }else{
                    alert("当前店铺无listing数据");
                }
            });
        })
        .catch(function(reason) {
            console.log('error：'+JSON.stringify(reason));
            alert(reason);
            log.error('出错',reason);
        });

//     	var lines = 0;
//     	search.create({
//     		type: 'customrecord_aio_products_listing',
//     		filters: [
//     			{ name: 'custrecord_aio_p_acc_id',  operator:'is', values: store_name },
//     			{ name: 'custrecord_aio_p_status',  operator:'is', values: status },
//     		],
//     	}).run().each(function (result) {
//             var rec_aio_pl = record.load({type : 'customrecord_aio_products_listing' , id : result.id});
//             console.log("rec_aio_pl="+JSON.stringify(rec_aio_pl));
// //    		console.log('lines='+lines);
            
//             rec.selectNewLine({sublistId: 'custpage_details'});
            
//             rec.setCurrentSublistValue({sublistId: 'custpage_details', fieldId : 'custpage_acc_id', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_acc_id'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_acc_id'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_item_name', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_item_name'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_item_name'})));
            
// //    		rec.setCurrentSublistValue({
// //    			sublistId: 'custpage_details',
// //    			fieldId : 'custpage_item_description',
// //    			value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_item_description'})
// //    		});
// //    		console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_item_description'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_item_sku', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_seller_sku'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_asin'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_asin', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_asin'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_asin'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_product_id', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_product_id'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_product_id'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_status', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_status'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_status'})));
            
//             rec.setCurrentSublistValue({ sublistId: 'custpage_details', fieldId : 'custpage_price', value : rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_price'}) });
//             console.log(JSON.stringify(rec_aio_pl.getValue({fieldId: 'custrecord_aio_p_price'})));
            
//             rec.commitLine({ sublistId: 'custpage_details' });
            
//             lines ++;
//             return true;
//         });
    	    	
    }

    
    function dps_create_update_price (){
    	console.log(JSON.stringify(cur));
    	var itemCount = cur.getLineCount('custpage_details');
    	console.log('itemCount='+itemCount);
    	var store_name = cur.getValue({fieldId: 'custpage_item_info_stroe_name'});
    	
		// var change_price_item_rec = record.create({type: "customrecord_change_price_approval", isDynamic: true});
		var change_price_item_rec = record.create.promise({type: "customrecord_change_price_approval", isDynamic: true});
		
		// change_price_item_rec.setValue({ fieldId: 'custrecord_price_store_name', value: store_name });
        // console.log('store_name='+store_name);
        
        change_price_item_rec.then(function(objRecord) {

            for(var i=0; i<itemCount; i++){
                
                var new_pirce = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_new_price', line: i });
                console.log('new_pirce='+new_pirce);
                
                if(new_pirce){

                    var acc_id = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_acc_id', line: i });
                    console.log('acc_id='+acc_id);
                    var item_name = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_item_name', line: i });
                    console.log('item_name='+item_name);
                    var item_sku = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_item_sku', line: i });
                    console.log('item_sku='+item_sku);
                    var asin = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_asin', line: i });
                    console.log('asin='+asin);
                    var product_id = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_product_id', line: i });
                    console.log('product_id='+product_id);
                    var status = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_status', line: i });
                    console.log('status='+status);
                    var old_pirce = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_price', line: i });
                    console.log('old_pirce='+old_pirce);

                    
                    objRecord.selectNewLine({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord' });

                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_account', value: acc_id });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_sku', value: item_sku });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_asin', value: asin });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_name', value: item_name });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_product_id', value: product_id });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_pirce_pl_old_price', value: old_pirce });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_new_price', value: new_pirce });
                    objRecord.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_status', value: status });

                    objRecord.commitLine({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord' });
                }
            }
            objRecord.setValue({ fieldId: 'custrecord_price_store_name', value: store_name });
            objRecord.save();
            alert('你的价格申请已经提交， 请等待系统自动发送邮件，更新价格审批状态 ，点击确定，刷新当前页面');    
            window.location.reload();
            // window.close();
        }, function(e) {
            alert(e);    
            // log.error({
            //     title: 'Unable to create record', 
            //     details: e.name
            // });
        });
		
    	// for(var i=0; i<itemCount; i++){
    		
    	// 	var acc_id = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_acc_id', line: i });
    	// 	console.log('acc_id='+acc_id);
    	// 	var item_name = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_item_name', line: i });
    	// 	console.log('item_name='+item_name);
    	// 	var item_sku = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_item_sku', line: i });
    	// 	console.log('item_sku='+item_sku);
    	// 	var asin = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_asin', line: i });
    	// 	console.log('asin='+asin);
    	// 	var product_id = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_product_id', line: i });
    	// 	console.log('product_id='+product_id);
    	// 	var status = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_status', line: i });
    	// 	console.log('status='+status);
    	// 	var old_pirce = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_price', line: i });
    	// 	console.log('old_pirce='+old_pirce);
    	// 	var new_pirce = cur.getSublistValue({ sublistId: 'custpage_details', fieldId: 'custpage_new_price', line: i });
    	// 	console.log('new_pirce='+new_pirce);

    	// 	if(new_pirce){
    			
		// 		change_price_item_rec.selectNewLine({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord' });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_account', value: acc_id });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_sku', value: item_sku });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_asin', value: asin });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_name', value: item_name });
    	// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_product_id', value: product_id });
    	// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_pirce_pl_old_price', value: old_pirce });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_new_price', value: new_pirce });
		// 		change_price_item_rec.setCurrentSublistValue({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord', fieldId: 'custrecord_change_price_pl_item_status', value: status });

		// 		change_price_item_rec.commitLine({ sublistId: 'recmachcustrecord_change_price_pl_parentrecord' });
    	// 	}
        // }
    	// change_price_item_rec.save();
		// alert('你的价格申请已经提交， 请等待系统自动发送邮件，价格更新状态 ');
		// window.close();
    }
    
    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        sublistChanged: sublistChanged,
        lineInit: lineInit,
        validateField: validateField,
        validateLine: validateLine,
        validateInsert: validateInsert,
        validateDelete: validateDelete,
        saveRecord: saveRecord,
        dps_search_item: dps_search_item,
        dps_create_update_price: dps_create_update_price
    };
    
});
