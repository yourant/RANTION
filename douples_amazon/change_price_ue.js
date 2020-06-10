/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 * 进行价格的监控
 * 如果改变的价格在5%内浮动可以直接更改，超过5%则进行审批流
 * 如果  old_price*95% <= new_price <= old_price*105%  则直接进行修改
 * 否则  提交审批
 * 
 */
define(["N/log", "N/search", "N/record", "N/workflow", "N/email", "./Helper/core.min2"],

function(log, search, record, workflow, email, core) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext) {

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
    function beforeSubmit(scriptContext) { 
    	
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
    function afterSubmit(scriptContext) {
    	log.audit("to","afterSubmit");
    	var newrec = scriptContext.newRecord;
    	log.debug("newrec",newrec);
    	log.debug("newrec.id",newrec.id);
    	var newrec_line = record.load({ type: 'customrecord_change_price_approval', id: newrec.id });
    	log.debug("newrec_line",newrec_line);
    	//审批人
    	var approver = newrec.getValue({
    	    fieldId: 'custrecord_price_approver'
    	});
//    	log.audit("approver",approver);

    	//申请人
    	var applicant = newrec.getValue({
    	    fieldId: 'custrecord_price_applicant'
    	});
//    	log.audit("applicant",applicant);

    	
    	//多行
    	var LineCount = newrec.getLineCount({
    	    sublistId: 'recmachcustrecord_change_price_pl_parentrecord'
    	})
    	log.audit("LineCount",LineCount);
    	
    	//标记 计数
    	var lowerCount = 0;

    	for(var i=0; i<LineCount; i++){
    		log.audit(i);
    		//店铺id
    		var acc_id = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'custrecord_change_price_pl_account',
    			line:i
			});
			var currency
			log.audit("acc_id-"+(i+1), acc_id);
			search.create({
				type:"customrecord_aio_account",
				filters:[{name:"internalidnumber",operator:"equalto",values:acc_id}],
				columns:[{name:"custrecord_aio_currency"}]
			}).run().each(function(e){
				currency=e.getText(e.columns[0])
			})
			 
			log.audit("currency-"+currency);
    		//货品sku
    		var item_sku = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'custrecord_change_price_pl_item_sku',
    			line:i
    		});
    		log.audit("item_sku-"+(i+1), item_sku);
    		
    		//货品名称
    		var itemname = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'custrecord_change_price_pl_item_name',
    			line:i
    		});
    		log.audit("itemname-"+(i+1), itemname);
    		
    		//旧价格
    		var old_price = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'custrecord_change_pirce_pl_old_price',
    			line:i
    		});
    		log.audit("old_price-"+(i+1), old_price);
    		
    		//新价格
    		var new_price = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'custrecord_change_price_pl_new_price',
    			line:i
    		});
    		log.audit("new_price-"+(i+1), new_price);
    		
    		//
    		var line_id = newrec_line.getSublistValue({
    			sublistId: 'recmachcustrecord_change_price_pl_parentrecord',
    			fieldId: 'id',
    			line:i
    		});
    		log.audit("line_id-"+(i+1), line_id);

    		
    		var old_price1 = Math.round( (Number (old_price) * 0.95) * 10000, 10) / 10000;
//    		log.audit("old_price1-"+(i+1),old_price1);
    		
    		var old_price2 = Math.round( (Number (old_price) * 1.05) * 10000, 10) / 10000;
//    		log.audit("old_price2-"+(i+1),old_price2);
    		
    		var pitem = '';
    		search.create({
    			type: 'customrecord_aio_amazon_mfn_listing',
    			filters: [
    				{ name: 'custrecord_aio_mfn_l_listing_acc_id',  operator:'is', values: acc_id },
    				{ name: 'custrecord_aio_mfn_l_seller_sku',  operator:'is', values: item_sku },
    			]
    		}).run().each(function (result) {
    			pitem = result.id;
    		});
    		log.audit("pitem",pitem);

    		var rows = [];
    		rows.push({
    			item_sku: item_sku,
    			new_price: new_price
    		});
    		var account_id = acc_id;
    		log.audit("upload:",{
    			rows: rows,
    			account_id: account_id
    		});
    		
    		
    		if( false ){    			
    		// if( Number(new_price) < old_price1 || Number(new_price) > old_price2 ){    			
    			log.audit("x",new_price);

    			record.submitFields({
				    type: 'customrecord_change_price_plisting',
				    id: line_id,
				    values: {
				    	'custrecord_change_price_pl_is_approve': true
				    }
				});

	    		var workflowInstanceId1 = workflow.initiate({
	    			recordType: 'customrecord_change_price_approval',
	    			recordId: newrec.id,
	    			workflowId: 'customworkflow_change_price_approval'
	    		});
	    		log.debug("1");
	    		var workflowInstanceId2 = workflow.trigger({
	    			recordType: 'customrecord_change_price_approval',
	    			recordId: newrec.id,
	    			workflowId: 'customworkflow_change_price_approval',
	    			actionId: 'workflowaction_submit',
	    		});
	    		log.debug("2");
    		
	    		var status1 = newrec.getValue({
	    		    fieldId: 'custrecord_approval_status_price'
	    		});
	    		log.audit("status1",status1);
	    		
	    		
                //已通过
	    		if(status1 == 'Passed' || status1 == '已通过'){
	    			/**
	    			 * 调用上传数据接口
	    			 */
					var rs =core.amazon.uploadPrice(account_id, rows,currency)
					log.audit("rs:::::::",rs);
	    			// log.audit("upload_1","success");
	    			
	        		var pitem1 = record.load({ type: 'customrecord_aio_amazon_mfn_listing', id: pitem });
	        		log.audit("pitem1",pitem1);
	    			pitem1.setValue({ fieldId: 'custrecord_aio_mfn_l_price', value: new_price });
	    			var idx = pitem1.save();
	    			log.audit("idx",idx);
	    				    			
	    		}else{
	    			log.debug("x1");
	    		}
    		}else{
    			log.audit("y",new_price);
    			
    			lowerCount++;
				log.audit("lowerCount",lowerCount);
				log.audit("rows：：：",rows);
    			/**
    			 * 调用上传数据接口
    			 */
				try {
					var rs = core.amazon.uploadPrice(account_id, rows,currency);
    			log.audit("rs:::::::",rs);
    			var pitem2 = record.load({ type: 'customrecord_aio_amazon_mfn_listing', id: pitem });
    			log.audit("pitem2",pitem2);
    			pitem2.setValue({ fieldId: 'custrecord_aio_mfn_l_price', value: new_price });
    			
    			var idy = pitem2.save();
    			log.audit("idy",idy);
				} catch (error) {
					log.error("出错了",error)
				}
    			
    			
    			
//    			// 数据上传完成,给申请人发送邮件
//	    		email.send({
//	    		    author: approver,			//发件人
//	    		    recipients: applicant,		//收件人
//	    		    subject: 'Price approval',
//	    		    body: '\u4f60\u7684\u4ef7\u683c\u7533\u8bf7\u5df2\u7ecf\u63d0\u4ea4\uff0c\u7f16\u53f7\u4e3a\uff1a' + newrec.id + 
//	    		          '\n' + '\u56e0\u4ef7\u683c\u6d6e\u52a8\u4f4e\u4e8e\u0035\u0025\uff0c\u5ba1\u6279\u81ea\u52a8\u5b8c\u6210' + 
//	    		          '\n' + '\u4ef7\u683c\u66f4\u65b0\u5df2\u7ecf\u4e0a\u4f20\u6210\u529f',
//	    		})
    		}
    	}
    	
    	if(lowerCount == LineCount){
    		
    		record.submitFields({
    		    type: 'customrecord_change_price_approval',
    		    id: newrec.id,
    		    values: {
    		    	'custrecord_approval_status_price': 'Passed'	//状态设置为已通过
    		    	}
    		});
    		
//    		email.send({
//    		    author: approver,			//发件人
//    		    recipients: applicant,		//收件人
//    		    subject: 'Price approval',
//    		    body: '\u4f60\u7684\u4ef7\u683c\u7533\u8bf7\u5df2\u7ecf\u63d0\u4ea4\uff0c\u7f16\u53f7\u4e3a\uff1a' + newrec.id + 
//    		          '\n' + '\u56e0\u4ef7\u683c\u6d6e\u52a8\u4f4e\u4e8e\u0035\u0025\uff0c\u65e0\u9700\u5ba1\u6279\uff0c\u81ea\u52a8\u4e0a\u4f20' + 
//    		          '\n' + '\u4ef7\u683c\u66f4\u65b0\u5df2\u7ecf\u4e0a\u4f20\u6210\u529f',
//    		});
    	}
	
    	
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
