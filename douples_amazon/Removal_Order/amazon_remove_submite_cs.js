/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */

define(['N/currentRecord', 'N/https', 'N/search', 'N/url', 'N/log'],

  function (currentRecord, https, search, url, log) {
    function BulkTriggerWorkflowRejection (arrary) {
      var arr = arrary.split(',')
      var link = url.resolveScript({
        scriptId: 'customscript_hf_remove_so_rl',
        deploymentId: 'customdeploy_hf_remove_so_rl'
      })

      console.debug('link: ' + link)
      var header = {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
      }
      var body = {
        'arr': arr,
        'p': 'Rejection'
      }
      var dataFromRestlet = ''
      try {
        dataFromRestlet = https.post({
          url: link,
          body: body,
          headers: header
        })

        var result_body = JSON.parse(dataFromRestlet.body)
        var str = '需要审批: ' + arr.length + ',审批拒绝: ' + result_body
        alert(str)
        window.location.reload()
      } catch(e) {
        log.debug('err', e)
      }
    }

    function BulkTriggerWorkflowConsent (arrary) {
      var arr = arrary.split(',')
      var link = url.resolveScript({
        scriptId: 'customscript_hf_remove_so_rl',
        deploymentId: 'customdeploy_hf_remove_so_rl'
      })
      var header = {
        'Content-Type': 'application/json;charset=utf-8',
        'Accept': 'application/json'
      }
      var body = {
        'arr': arr,
        'p': 'Consent'

      }
      log.debug('body', body)
      var dataFromRestlet = ''
      try {
        dataFromRestlet = https.post({
          url: link,
          body: body,
          headers: header
        })
        var result_body = JSON.parse(dataFromRestlet.body)
        var str = '需要审批: ' + arr.length + ',审批通过: ' + result_body
        alert(str)
        window.location.reload()
      } catch(e) {
        log.debug('err', e)
      }
    }

    function removalOrder () {
      var curr = currentRecord.get()

      var feedId
      search.create({
        type: 'customrecord_aio_amazon_feed',
        filters: [
          { name: 'custrecord_hf_remove_id', operator: 'is', values: Number(curr.id)}],
        columns: [
          {name: 'custrecord_aio_feed_submission_id'}
        ]
      }).run().each(function (rec) {
        feedId = rec.getValue('custrecord_aio_feed_submission_id')
        return false
      })
      if (feedId) {
        log.debug('feedId', feedId)
        var acc_id = curr.getValue('custrecord_store_name_reord')
        if (!acc_id) {
          try {
            search.create({
              type: 'customrecord_removeorder_audit',
              filters: [
                { name: 'internalid', operator: 'is', values: Number(curr.id)}],
              columns: [
                {name: 'custrecord_store_name_reord'}
              ]
            }).run().each(function (rec) {
              acc_id = rec.getValue('custrecord_store_name_reord')
            })
          } catch(e) {log.error('error', e) }
        }
        log.debug('acc_id', acc_id)
        var link = url.resolveScript({
          scriptId: 'customscript_amazon_remove_submite_rl',
          deploymentId: 'customdeploy_amazon_remove_submite_rl'
        })
        var header = {
          'Content-Type': 'application/json;charset=utf-8',
          'Accept': 'application/json'
        }
        var body = {
          'feedId': feedId,
          'acc_id': acc_id,
          'rec_id': curr.id,
          'p': 'removal_checkStatus'
        }
        try {
          var post_res
          https.post.promise({
            url: link,
            body: body,
            header: header
          }).then(function (res) {
            var str = JSON.parse(res.body)
            console.info(str)
            alert(str)
          }).catch(function onRejected (reason) {
            log.error('failure_reason::', reason)
          })
        } catch(e) { log.error('error', e) }
      }else {
        alert('未通过')
      }
    }
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit (scriptContext) {

      // 	 var curr =  scriptContext.currentRecord

      // 	//  var ui = runtime.executionContext
      // 	//  if (ui == 'USERINTERFACE') {
      // 	// 	var acc = curr.getField({
      // 	// 		fieldId: 'custrecord_store_name_reord' 
      // 	// 	}); 
      // 	//     acc.isDisplay = false
      // 	//  }

      // 	var orderNo = curr.getValue('custrecord_order_no')
      // 		if(orderNo){
      // 		var link = url.resolveScript({
      // 	        scriptId: 'customscript_hf_remove_so_rl',
      //             deploymentId: 'customdeploy_hf_remove_so_rl',
      //         })
      //         var header = {
      //         		'Content-Type': 'application/json;charset=utf-8',
      //         		'Accept':'application/json'
      //         }
      //         var body = {
      //         		"orderno":orderNo,
      //         		"p":"searchOrder"
      //         }
      // 		  try{
      // 	    	 var post_res
      // 	    	 https.post.promise({
      // 				 url:link,
      // 				 body:body,
      // 				 header:header
      // 			 }).then(function(res){  
      // 				 console.info(res.body)
      // 				  var str = JSON.parse(res.body)
      // 				 if(str === '2'){
      // 					 alert("找不到订单，请手动输入")
      // 				 }else{
      // 				 curr.setValue({fieldId:'custrecord_store_name_reord',value:Number(str.acc_id)})
      // 				 curr.setValue({fieldId:'custrecord_hf_recivename',value:str.receiverName})
      // 				 curr.setValue({fieldId:'custrecord_hf_address',value:str.addr1})
      // 				 curr.setValue({fieldId:'custrecord_address2',value:str.addr2})
      // 				 curr.setValue({fieldId:'custrecord_hf_city',value:str.receiverCity})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_provience',value:str.receiverProvince})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_country',value:str.receivercountryCode})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_zip',value:str.zip})
      // 				 curr.setValue({fieldId:'custrecord_main_sku',value:str.sku})
      //            curr.setValue({fieldId:'custrecord_remove_so_fulfillment_channel',value:str.channel})        
      // 				 searchSkuQty(str.sku,str.acc_id)
      // 				 if(str.receiverMobile) curr.setValue({fieldId:'custrecord_hf_remove_phone',value:str.receiverMobile})}
      // 				 }).catch(function onRejected(reason){
      // 				 log.error("post search order error::",reason)
      // 			 })
      // 	      }catch(e){
      // 	    	log.error("post search order error ",e)
      // 		 }
      // 		}
      // 		 function searchSkuQty(sku,store){
      // 			if(sku)	{
      // 				var link = url.resolveScript({
      // 					scriptId: 'customscript_hf_remove_so_rl',
      // 					deploymentId: 'customdeploy_hf_remove_so_rl',
      // 				})
      // 				log.error('link',link)
      // 				var header = {
      // 						'Content-Type': 'application/json;charset=utf-8',
      // 						'Accept':'application/json'
      // 				}
      // 				var body = {
      // 						"post_sku":sku,
      // 						"acc_id":store,
      // 						"p":"checkInven"
      // 				}
      // 			   console.info("body:"+body)
      // 				  try{
      // 					 var post_res
      // 					 https.post.promise({
      // 						 url:link,
      // 						 body:body,
      // 						 header:header
      // 					 }).then(function(res){
      // 						 log.debug("res",res.body)
      // 						post_res=JSON.parse(res.body)
      // 						if(post_res == '2'){
      // //    						alert("找不到对应的seller sku")
      // 							curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      // 							 curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      // 						}else{
      // 							 log.debug("un",post_res.un)
      // 							  log.debug("in",post_res.i)
      // 							curr.setValue({fieldId:'custrecord_instock_quan',value:post_res.i,ignoreFieldChange: true})
      // 							 curr.setValue({fieldId:'custrecord_unstock_quantity',value:post_res.un,ignoreFieldChange: true})
      // 						}

      // 					 }).catch(function(reason){
      // 							curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      // 							 curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      // 						 log.debug("failure_reason::",reason)
      // 						 console.info("failure_reason :"+reason)
      // 					 })
      // 				  }catch(e){
      // 				  console.info("post error:"+e) 
      // 				  curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      // 				  curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      // 				}
      // 			 }
      // 		}
      return true
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
    function fieldChanged (scriptContext) {
      //     	var curr = scriptContext.currentRecord
      //     	if(scriptContext.fieldId == 'custrecord_hf_remove_type'){
      //     		var  i = curr.getValue('custrecord_hf_remove_type')
      //     		if(i == '2'){
      //     			var sn = curr.getField({fieldId: 'custrecord_hf_recivename'}).isDisabled= true
      //     			var ad1 = curr.getField({fieldId: 'custrecord_hf_address'}).isDisabled= true
      //     			var ad2 = curr.getField({fieldId: 'custrecord_address2'}).isDisabled= true
      //     			var ct = curr.getField({fieldId: 'custrecord_hf_city'}).isDisabled= true
      //     			var ps = curr.getField({fieldId: 'custrecord_hf_remove_provience'}).isDisabled= true
      //     			var cy = curr.getField({fieldId: 'custrecord_hf_remove_country'}).isDisabled= true
      //     			var zc = curr.getField({fieldId: 'custrecord_hf_remove_zip'}).isDisabled= true
      //     			var ph = curr.getField({fieldId: 'custrecord_hf_remove_phone'}).isDisabled = true
      // 			}
      // 			else{
      // 				var sn = curr.getField({fieldId: 'custrecord_hf_recivename'}).isDisabled= false
      //     			var ad1 = curr.getField({fieldId: 'custrecord_hf_address'}).isDisabled= false
      //     			var ad2 = curr.getField({fieldId: 'custrecord_address2'}).isDisabled= false
      //     			var ct = curr.getField({fieldId: 'custrecord_hf_city'}).isDisabled= false
      //     			var ps = curr.getField({fieldId: 'custrecord_hf_remove_provience'}).isDisabled= false
      //     			var cy = curr.getField({fieldId: 'custrecord_hf_remove_country'}).isDisabled= false
      //     			var zc = curr.getField({fieldId: 'custrecord_hf_remove_zip'}).isDisabled= false
      //     			var ph = curr.getField({fieldId: 'custrecord_hf_remove_phone'}).isDisabled = false
      // 			}
      //     	}

      //     	if(scriptContext.fieldId == 'custrecord_main_sku'){
      //             var sku = curr.getValue('custrecord_main_sku')
      //         	if(sku){
      //         	if(curr.getValue('custrecord_store_name_reord')){
      //         		searchSkuQty(sku,curr.getValue('custrecord_store_name_reord'))
      //         	}else{alert("请先选择店铺")}
      //         	}

      //     	}
      //     	if(scriptContext.fieldId == 'custrecord_store_name_reord'){
      // 			var sku = curr.getValue('custrecord_main_sku')
      //     		   if(sku && curr.getValue('custrecord_store_name_reord'))
      //     		   searchSkuQty(sku,curr.getValue('custrecord_store_name_reord'))
      //     	}

      // //    	if(scriptContext.fieldId == 'custrecord_hf_remove_sallabel'){
      // //			var sallabel = curr.getCurrentSublistValue({
      // //				sublistId: 'recmachcustrecord_hf_remove_relative_audit',
      // //				fieldId: 'custrecord_hf_remove_sallabel'
      // //				})
      // //			var cur_sallabel = curr.getCurrentSublistValue({
      // //				sublistId: 'recmachcustrecord_hf_remove_relative_audit',
      // //				fieldId: 'custrecord_inven_instock_quantity'
      // //			})
      // //			if(sallabel){
      // //    			console.info(sallabel,cur_sallabel)
      // //    			log.debug("不可售:"+sallabel,"当前不可售:"+cur_sallabel)
      // //    			if (Number(sallabel) > Number(cur_sallabel) || Number(sallabel) <0 ) {
      // //    				alert("您输入的值不符合当前可售数量，请修改!")
      // //    				curr.setCurrentSublistValue({sublistId:'recmachcustrecord_hf_remove_relative_audit',fieldId:'custrecord_hf_remove_sallabel',value:0})
      // //    			}
      // //    		}
      // //    	}
      // //    	if(scriptContext.fieldId == 'custrecord_hf_remove_unsallable'){
      // //    		var unsallable = curr.getCurrentSublistValue({
      // //           		sublistId: 'recmachcustrecord_hf_remove_relative_audit',
      // //           		fieldId: 'custrecord_hf_remove_unsallable'
      // //           		})
      // //    		var cur_unsallable = curr.getCurrentSublistValue({
      // //    			sublistId: 'recmachcustrecord_hf_remove_relative_audit',
      // //    			fieldId: 'custrecord_inven_unstock_quantity'
      // //    		})
      // //    		if(unsallable){
      // //    			console.info(unsallable,cur_unsallable)
      // //    			log.debug("不可售:"+unsallable,"当前不可售:"+cur_unsallable)
      // //        		if (Number(unsallable) > Number(cur_unsallable) || Number(unsallable) <0 ) {
      // //        			alert("您输入的值不符合当前不可售数量，请修改!")
      // //        			curr.setCurrentSublistValue({sublistId:'recmachcustrecord_hf_remove_relative_audit',fieldId:'custrecord_hf_remove_unsallable',value:0})
      // //        		}
      // //    		}
      // //    	}
      //     	if(scriptContext.fieldId == 'custrecord_remove_sallabel' || scriptContext.fieldId == 'custrecord_remove_unsallebel' ){
      //     	var sallabel= 0,unsallable= 0
      //     		sallabel = curr.getValue('custrecord_remove_sallabel')
      //     		unsallable = curr.getValue('custrecord_remove_unsallebel')
      //     		log.debug("不可售:"+unsallable+"ty: "+typeof(unsallable),"可售:"+sallabel+"ty: "+typeof(unsallable))
      //     		var n = Number(sallabel)+Number(unsallable)
      // 			try{
      // 				curr.setValue({fieldId:'custrecord_quantity_remove',value:n})
      // 			}catch(e){
      // 				log.error("error",e)
      // 			}

      //     	}
      //     	if(scriptContext.fieldId == 'custrecord_order_no'){
      // 		// }else if(1>2){
      //     		var orderNo = curr.getValue('custrecord_order_no')
      //     		if(orderNo){
      //     		var link = url.resolveScript({
      // 		        scriptId: 'customscript_hf_remove_so_rl',
      // 	            deploymentId: 'customdeploy_hf_remove_so_rl',
      // 	        })
      // 	        var header = {
      // 	        		'Content-Type': 'application/json;charset=utf-8',
      // 	        		'Accept':'application/json'
      // 	        }
      // 	        var body = {
      // 	        		"orderno":orderNo,
      // 	        		"p":"searchOrder"
      // 	        }
      // 			  try{
      // 		    	 var post_res
      // 		    	 https.post.promise({
      // 					 url:link,
      // 					 body:body,
      // 					 header:header
      // 				 }).then(function(res){  
      // 					 console.info(res.body)
      // 					  var str = JSON.parse(res.body)
      // 					 if(str === '2'){
      // 						 alert("找不到订单，请手动输入")
      // 					 }else{

      // 					 curr.setValue({fieldId:'custrecord_store_name_reord',value:Number(str.acc_id)})
      // 					 curr.setValue({fieldId:'custrecord_hf_recivename',value:str.receiverName})
      // 					 curr.setValue({fieldId:'custrecord_hf_address',value:str.addr1})
      // 					 curr.setValue({fieldId:'custrecord_address2',value:str.addr2})
      // 					 curr.setValue({fieldId:'custrecord_hf_city',value:str.receiverCity})
      // 					 curr.setValue({fieldId:'custrecord_hf_remove_provience',value:str.receiverProvince})
      // 					 curr.setValue({fieldId:'custrecord_hf_remove_country',value:str.receivercountryCode})
      // 					 curr.setValue({fieldId:'custrecord_hf_remove_zip',value:str.zip})
      // 					 curr.setValue({fieldId:'custrecord_main_sku',value:str.sku})
      //                curr.setValue({fieldId:'custrecord_remove_so_fulfillment_channel',value:str.channel})
      // 					 searchSkuQty(str.sku,str.acc_id)
      // 					 if(str.receiverMobile) curr.setValue({fieldId:'custrecord_hf_remove_phone',value:str.receiverMobile})}
      // 					 }).catch(function onRejected(reason){
      // 					 log.error("post search order error::",reason)
      // 				 })
      //     	      }catch(e){
      //     	    	log.error("post search order error ",e)
      //     	     }
      //     	   }else{
      //     		     curr.setValue({fieldId:'custrecord_store_name_reord',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_recivename',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_address',value:''})
      // 				 curr.setValue({fieldId:'custrecord_address2',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_city',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_provience',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_country',value:''})
      // 				 curr.setValue({fieldId:'custrecord_hf_remove_zip',value:''})
      // 				 curr.setValue({fieldId:'custrecord_main_sku',value:''})
      //     	   }
      //     	}
      //     	function searchSkuQty(sku,store){
      //     		if(sku)	{
      //        		 var link = url.resolveScript({
      //     		        scriptId: 'customscript_hf_remove_so_rl',
      //     	            deploymentId: 'customdeploy_hf_remove_so_rl',
      //     	        })
      //     	        log.error('link',link)
      //     	        var header = {
      //     	        		'Content-Type': 'application/json;charset=utf-8',
      //     	        		'Accept':'application/json'
      //     	        }
      //     	        var body = {
      //     	        		"post_sku":sku,
      //     	        		"acc_id":store,
      //     	        		"p":"checkInven"
      //     	        }
      //     	       console.info("body:"+body)
      //     			  try{
      //     		    	 var post_res
      //     		    	 https.post.promise({
      //     					 url:link,
      //     					 body:body,
      //     					 header:header
      //     				 }).then(function(res){
      //     					 log.debug("res",res.body)
      //     					post_res=JSON.parse(res.body)
      //     					if(post_res == '2'){
      // //    						alert("找不到对应的seller sku")
      //     						curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      //      				    	curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      //     					}else{
      //     						 log.debug("un",post_res.un)
      //      						 log.debug("in",post_res.i)
      // 						    curr.setValue({fieldId:'custrecord_instock_quan',value:post_res.i,ignoreFieldChange: true})
      //      				    	curr.setValue({fieldId:'custrecord_unstock_quantity',value:post_res.un,ignoreFieldChange: true})
      //     					}

      //     				 }).catch(function(reason){
      // 						    curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      //      				    	curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      //     					 log.debug("failure_reason::",reason)
      //     					 console.info("failure_reason :"+reason)
      //     				 })
      // 				  }catch(e){
      // 				  console.info("post error:"+e) 
      // 				  curr.setValue({fieldId:'custrecord_instock_quan',value:1,ignoreFieldChange: true})
      // 				  curr.setValue({fieldId:'custrecord_unstock_quantity',value:0,ignoreFieldChange: true})
      // 				}
      //          	}
      //     	}

      return true
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
    function postSourcing (scriptContext) {
      return true
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
    function sublistChanged (scriptContext) {
      console.info('sublistChanged', scriptContext.sublistId)
      return true
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
    function lineInit (scriptContext) {
      return true
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
    function validateField (scriptContext) {
      return true
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
    function validateLine (scriptContext) {
      return true
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
    function validateInsert (scriptContext) {
      return true
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
    function validateDelete (scriptContext) {
      return true
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
    function saveRecord (scriptContext) {
      var curr = scriptContext.currentRecord
      var sallabel = curr.getValue('custrecord_remove_sallabel')
      var cur_sallabel = curr.getValue('custrecord_instock_quan')
      var unsallable = curr.getValue('custrecord_remove_unsallebel')
      var cur_unsallable = curr.getValue('custrecord_unstock_quantity')
      var recivename = curr.getValue('custrecord_hf_recivename')
      var country = curr.getValue('custrecord_hf_remove_country')
      var provience = curr.getValue('custrecord_hf_remove_provience')
      var city = curr.getValue('custrecord_hf_city')
      var zip = curr.getValue('custrecord_hf_remove_zip')
      var phone = curr.getValue('custrecord_hf_remove_phone')
      var address = curr.getValue('custrecord_hf_address')

      if (curr.getValue('custrecord_hf_remove_type') == 1) {
        if (recivename && country && provience && city && zip && address) {
          if (Number(unsallable) > Number(cur_unsallable) || Number(sallabel) > Number(cur_sallabel)) {
            alert('您输入的货品值超过了当前数量，请修改!')
            return false
          } return true
        }else {
          alert('收件人信息不全，请检查！')
          return false
        }
      }else {
        if (Number(unsallable) > Number(cur_unsallable) || Number(sallabel) > Number(cur_sallabel)) {
          alert('您输入的货品值超过了当前数量，请修改!')
          return false
        }else return true
      }
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
      removalOrder: removalOrder,
      BulkTriggerWorkflowConsent: BulkTriggerWorkflowConsent,
      BulkTriggerWorkflowRejection: BulkTriggerWorkflowRejection,
    // removalOrder:removalOrder,
    }
  })
