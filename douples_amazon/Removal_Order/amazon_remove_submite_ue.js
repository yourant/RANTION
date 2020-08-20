/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */

define(['N/log', 'N/search', 'N/record', 'N/encode',
  '../Helper/CryptoJS.min', 'N/https', 'N/xml',
  'N/crypto'],

  function (log, search, record, encode, cryptoJS, https, xml, crypto) {

    /**
     * Function definition to be triggered before record is loaded.
     * 
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad (scriptContext) {
      var type = scriptContext.type
      var form = scriptContext.form
      form.addButton({
        id: 'custpage_bt',
        label: 'Create result',
        functionName: 'removalOrder'
      })
      // var curr = scriptContext.newRecord
      form.clientScriptModulePath = './amazon_remove_submite_cs.js'
      // log.error("type",type)
      // var ui = runtime.executionContext
      // if( ui == 'USERINTERFACE'){
      // log.error("ui",ui)
      // try{
      // 	var soid = scriptContext.request.parameters.soId
      // 	var caseid =scriptContext.request.parameters.caseId 
      // 	log.error("soid",soid)
      // 	log.error("caseid",caseid)
      // 	if(soid){
      // 		log.error("setdefualt(curr,soid)")
      // 		setdefualt(curr,soid,'so')
      // 	}
      // 	if(caseid){
      // 		log.error("setdefualt(curr,caseid)")
      // 		setdefualt(curr,caseid,'case')
      // 	}
      // }catch(e){
      //     log.error("error",e)
      // }
      // 	if(type == 'view'){
      // 	var owner = curr.getValue('owner'),batch=[],app = curr.getValue('custrecord_audit_reord');//审批人
      // 	var status = curr.getValue('custrecord_audit_status')
      // 	log.debug("owner",owner)
      // 	log.debug("status",status)
      // 	var userObj = runtime.getCurrentUser()
      // 	log.debug("userObj",userObj)
      // 		// 管理员或者审批人可以看到批量审批的按钮
      // 	if(userObj.role == 3){
      // 		form.addButton({
      // 			id:'custpage_bt',
      // 			label:'Create result',
      // 			functionName:'removalOrder'
      // 		})
      // 		if(status !='passed' && (userObj.id == app || userObj.role == 3)){
      // 			log.debug('显示批量审批按钮',userObj.id+': '+userObj.role)
      // 			// 搜索当前记录的创建者所有未审批的记录
      // 			try{
      // 				search.create({
      // 					type: 'customrecord_removeorder_audit',
      // 					filters: [{
      // 						name: 'owner',
      // 						operator: 'is',
      // 						values: owner
      // 					},
      // 					{
      // 						name: 'custrecord_audit_status',
      // 						operator: 'is',
      // 						values: 'Approving'
      // 					}]
      // 				}).run().each(function (rec){
      // 					batch.push(rec.id)
      // 					return true
      // 				})
      // 				log.debug('记录创建者未审批的记录',batch)
      // 			}
      // 			catch(e){
      // 				log.debug('搜索记录出错',e)
      // 			}

      // 			if(batch.length >= 1){
      // 				form.addButton({
      // 					id : 'custpage_bulkco',
      // 					label: 'Batch Consent',
      // 					functionName:'BulkTriggerWorkflowConsent("' + batch + '")'
      // 				})

      // 				form.addButton({
      // 					id : 'custpage_bulkre',
      // 					label: 'Batch Rejection',
      // 					functionName:'BulkTriggerWorkflowRejection("' + batch + '")'
      // 				})
      // 			}

      // 		}
      // 	 }
      // 	}else if(type == 'create'){
      // 		var cur_role = runtime.getCurrentUser().role
      // 		log.debug('role',cur_role)
      // 		search.create({
      // 			type:'customrecord_aio_account',
      // 			filters:[
      // 				{name:'custrecord_account_role',operator:'is',values:cur_role}
      // 			],columns:[
      // 				{name:'name'}
      // 			]
      // 		}).run().each(function(e){
      // 			log.debug('account name:'+e.getValue('name'), e.id )
      // 			curr.setValue({fieldId:'custrecord_store_name_reord',value:e.id })
      // 			curr.setValue({fieldId:'custrecord_text_store_name',value:e.getValue('name') })
      // 		})
      // 	 }
      // 	//  else if(type == 'edit') throw("\u60a8\u65e0\u6cd5\u5bf9\u5df2\u7ecf\u63d0\u4ea4\u7684\u8ba2\u5355\u8fdb\u884c\u7f16\u8f91")

    // }
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
    function beforeSubmit (scriptContext) {

      // var type = scriptContext.type
      // // 只有创建做控制, 审批不做控制
      // if(type == 'create'){

      // 	var curr = scriptContext.newRecord
      // 	var cur_role = runtime.getCurrentUser().role , 
      // 	acc_id = curr.getValue('custrecord_store_name_reord'),curr_acc_id
      // 	alert(cur_role)
      // 	log.debug('role',cur_role)
      // 	search.create({
      // 		type:'customrecord_aio_account',
      // 		filters:[
      // 			{name:'custrecord_account_role',operator:'is',values:cur_role}
      // 		]
      // 	}).run().each(function(e){
      // 		log.debug('account name:', e.id)
      // 		curr_acc_id = e.id
      // 	})
      // 	if(acc_id != curr_acc_id)  
      // 		throw '\u5e97\u94fa\u4e0e\u5f53\u524d\u7528\u6237\u4e0d\u5339\u914d\uff0c\u8bf7\u68c0\u67e5\u7528\u6237\u89d2\u8272\u662f\u5426\u6b63\u786e\u3002'

      // }

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
    function afterSubmit (scriptContext) {
      try {
        var newrec = scriptContext.newRecord
        var newrec_id = newrec.id
        log.debug('newrec_id:', newrec_id)
        // var workflowInstanceId1 = workflow.initiate({
        // 	recordType: 'customrecord_removeorder_audit',
        // 	recordId: newrec_id,
        // 	workflowId: 'customworkflow_hf_remove_order_wf'
        // })
        // var workflowInstanceId2 = workflow.trigger({
        // 	recordType: 'customrecord_removeorder_audit',
        // 	recordId: newrec_id,
        // 	workflowId: 'customworkflow_hf_remove_order_wf',
        // 	actionId: 'workflowaction_submit_audit',
        // })

        var audit_status = newrec.getValue('custrecord_audit_status')
        log.debug('audit_status', audit_status)
        if (true) {
          // if(audit_status == 'passed'){
          log.debug('已通过审批，开始执行', newrec.getValue('custrecord_order_no'))
          // so 回写移除单ID
          // try{
          // 	search.create({
          // 		type:"salesorder",
          // 		filters: [
          // 		{name:'poastext',operator:'is',values:newrec.getValue('custrecord_order_no') },
          // 		{name:'mainline',operator:'is',values:true},
          // 		{name:'taxline',operator:'is',values:false}
          // 	]
          // 	}).run().each(function(e){
          // 	var so = record.load({type:"salesorder",id:e.id})
          // 	so.setValue({fieldId:'custbody_salesorder_removal_id', value: newrec_id})
          // 	so.setValue({fieldId:'custbody_is_salesorder_removal', value: true})
          // 	so.save()
          // 	})
          // }catch(e){
          // 	log.error("error",e)
          // }

          var deliveryway = newrec.getValue('custrecord_deliveryways')
          log.debug('deliveryway:', deliveryway)
          if (deliveryway == 1) deliveryway = 'Standard'
          else if (deliveryway == 2) deliveryway = 'Expedited'
          else if (deliveryway == 3) deliveryway = 'Priority'
          else if (deliveryway == 4) deliveryway = 'ScheduledDelivery'
          log.debug('deliveryway:', deliveryway)
          var tranId, multiOrder,accId, param = {}
          var receiverName
          var receiverMobile
          var receiverCountry
          var receiverProvince
          var receiverCity
          var postalCode
          var addr1
          var addr2

          search.create({
            type: 'customrecord_removeorder_audit',
            filters: [
              {name: 'internalid',operator: 'is',values: newrec_id}
            ],
            columns: [
              {name: 'custrecord_hf_remove_type'},
              {name: 'custrecord_store_name_reord'},
              {name: 'custrecord_hf_recivename'},
              {name: 'custrecord_hf_remove_phone'},
              {name: 'custrecord_hf_remove_country'},
              {name: 'custrecord_hf_remove_provience'},
              {name: 'custrecord_hf_city'},
              {name: 'custrecord_hf_remove_zip'},
              {name: 'custrecord_hf_address'},
              {name: 'custrecord_address2'},
              {name: 'custrecord_hf_remove_orders'}
            ]
          }).run().each(function (e) {
            multiOrder = e.getValue('custrecord_hf_remove_type')
            log.debug('multiOrder:', multiOrder)
            accId = e.getValue('custrecord_store_name_reord')
            receiverName = e.getValue('custrecord_hf_recivename')
            receiverMobile = e.getValue('custrecord_hf_remove_phone')
            receiverCountry = e.getValue('custrecord_hf_remove_country')
            receiverProvince = e.getValue('custrecord_hf_remove_provience')
            receiverCity = e.getValue('custrecord_hf_city')
            postalCode = e.getValue('custrecord_hf_remove_zip')
            addr1 = e.getValue('custrecord_hf_address')
            addr2 = e.getValue('custrecord_address2')
            tranId = e.getValue('custrecord_hf_remove_orders')
            log.debug('tranId:' + tranId)
            return false
          })

          var num = 1
          var removeList = []
          var availableQuantity,unavailableQuantity,sellerSku
          search.create({
            type: 'customrecord_remove_product',
            filters: [
              {name: 'custrecord_hf_remove_relative_audit',operator: 'anyof',values: newrec_id}
            ],
            columns: [
              {name: 'custrecord_hf_remove_sku'},
              {name: 'custrecord_hf_remove_sallabel'},
              {name: 'custrecord_hf_remove_unsallable'}
            ]
          }).run().each(function (e) {
            sellerSku = e.getValue('custrecord_hf_remove_sku')
            availableQuantity = e.getValue('custrecord_hf_remove_sallabel')
            unavailableQuantity = e.getValue('custrecord_hf_remove_unsallable')
            removeList.push({
              availableQuantity: availableQuantity,
              unavailableQuantity: unavailableQuantity,
              sellerSku: sellerSku
            })
            return true
          })
          //   param['Items.member.'+num+'.SellerSKU']  = sellerSku//sellerSku
          //   param['Items.member.'+num+'.SellerFulfillmentOrderItemId']  =  sellerSku+num
          //   param['Items.member.'+num+'.Quantity']  = availableQuantity+unavailableQuantity

          log.audit('商品信息获取成功', removeList)
          //   1指定地址弃置  2 没有地址  直接放弃  
          if (multiOrder) {
            // var isoDate = moment(new Date()).toISOString(true)
            // log.debug('isoDate',isoDate)
            // 	param['DisplayableOrderDateTime'] = isoDate
            // 	param['DisplayableOrderComment'] = 'happynewyear'
            // 	param['FulfillmentAction'] = 'Ship'

            // 	/**配送订单的配送方式:
            // 	 * Standard - 标准配送方式。
            // 	 * Expedited - 加急配送方式。
            // 	 * Priority - 优先配送方式。
            // 	 * ScheduledDelivery - 预约送货上门配送方式。预约送货上门仅适用于日本 (JP)。
            // 	 */
            // 	param['ShippingSpeedCategory']  = deliveryway
            // //  配送地址
            // 	param['DestinationAddress.Name']  = receiverName
            // 	param['DestinationAddress.Line1']  = addr1
            // 	param['DestinationAddress.Line2']  = addr2
            // 	param['DestinationAddress.CountryCode']  = receiverCountry
            // 	param['DestinationAddress.StateOrProvinceCode']  = receiverProvince
            // 	param['DestinationAddress.City']  = receiverCity
            // 	param['DestinationAddress.PostalCode']  = postalCode
            // 	param['DestinationAddress.PhoneNumber']  = receiverMobile;  	
            //  log.audit("param",param)
            var removeData = {
              tranId: tranId,
              multiOrder: multiOrder,
              receiverName: receiverName, // 收货人名
              receiverMobile: receiverMobile, // 手机
              receiverCountry: receiverCountry, // 国家 
              receiverProvince: receiverProvince, // 省
              receiverCity: receiverCity, // 城市
              postalCode: postalCode, // 邮编
              addr1: addr1,
              addr2: addr2
            }
            log.audit('客户信息', removeData)
            try {
              var auth = getAuthByAccountId(accId)
              log.audit('Amazon_auth', auth)
            } catch(e) {
              log.error('error', e)
            }
            if (auth) {
              var feedResponse
              //        得到提交结果  	
              var submitFeedMessage
              var feedId,ord
              //       提交数据r
              search.create({
                type: 'customrecord_aio_amazon_feed',
                filters: [
                  {name: 'custrecord_hf_remove_id',operator: 'anyof',values: Number(newrec_id)}
                ]
              }).run().each(function (e) {
                ord = record.load({type: 'customrecord_aio_amazon_feed',id: e.id})
              })
              log.debug('ord', JSON.stringify(ord))
              feedResponse_re = getFeedSubmissionId(auth, removeData, removeList)
              feedResponse = praseFeedResponseXML(feedResponse_re)
              if (feedResponse_re == '2') {  log.audit('2', '接口请求错误') }else {
                if (ord) {
                  var rs = getSubmitList(feedId, auth, removeData, removeList)
                  log.debug('rs', rs)
                  ord.setValue({fieldId: 'custrecord_aio_feed_submission_id',value: feedResponse.feedId})
                  ord.setValue({fieldId: 'custrecord_aio_feed_response',value: JSON.stringify(rs)})
                  var or = ord.save()
                  log.debug('save()', or)
                }else {
                  log.audit('feedResponse', JSON.stringify(feedResponse))
                  var ord_0 = record.create({ type: 'customrecord_aio_amazon_feed', isDynamic: true })
                  ord_0.setValue({ fieldId: 'custrecord_hf_remove_id', value: newrec_id })
                  ord_0.setValue({ fieldId: 'custrecord_aio_feed_submission_id', value: feedResponse.feedId })
                  ord_0.setValue({ fieldId: 'custrecord_aio_submitted_date', value: feedResponse.submittedDate })
                  ord_0.setValue({ fieldId: 'custrecord_aio_feed_processing_status', value: feedResponse.feedProcessingStatus })
                  ord_0.setValue({ fieldId: 'custrecord_aio_feed_type', value: feedResponse.feedType })
                  ord_0.setValue({ fieldId: 'custrecord_aio_order_id', value: tranId })
                  ord_0.setValue({ fieldId: 'custrecord_aio_feed_account', value: accId })
                  var or = ord_0.save()
                  log.debug('save()', or)
                }
              }
            }
          } // endif multiOrder

        } // endif ststus
      } catch(e) {
        log.debug('error', e)
      }
      //   提交移除订单   
      function getFeedSubmissionId (auth, removeData, removeList) {
        var param = {}
        var resouse = '/SubmitFeed/2009-01-01/'
        log.error('提交移除订单 ', '' + JSON.stringify(removeData))
        var body = getBody(removeData, removeList)
        param['FeedType'] = '_POST_FLAT_FILE_FBA_CREATE_REMOVAL_'
        param['ContentMD5Value'] = encode.convert({
          string: md5(body),
          inputEncoding: encode.Encoding.HEX,
          outputEncoding: encode.Encoding.BASE_64
        })
        log.error(' 提交移除订单 body :', JSON.stringify(body))
        var response
        // (auth, action, version, params, resource, body,record1)
        response = mwsRequestMaker(auth, 'SubmitFeed', '2009-01-01', param, '/', body)
        log.error('检查 提交 response', '' + response)
        return response
      }
      // 检查是否成功
      // RETURN    退货  指定地址移除
      // DISPOSAL  弃置 直接移除 
      function getSubmitList (feedId, auth, removeData, removeList) {
        // 	var auth = core1.getAuthByAccountId('102')
        log.error('检查参数', '' + JSON.stringify(removeData) + '---' + feedId)
        var param = {}
        var body = getBody(removeData, removeList)
        param['FeedSubmissionId'] = feedId
        param['ContentMD5Value'] = encode.convert({
          string: md5(body),
          inputEncoding: encode.Encoding.HEX,
          outputEncoding: encode.Encoding.BASE_64
        })
        var response; // (auth, action, version, params, resource, body,record1)
        response = mwsRequestMaker(auth, 'GetFeedSubmissionResult', '2009-01-01', param, '/', body)
        log.error('检查是否成功哦 response', '' + response)
        return response
      }
      //	移除订单类型  1 指定地址弃置   2没有地址  直接放弃
      function getBody (removeData, removeList) {
        var multiOrder = removeData.multiOrder
        var line0 = ['MerchantRemovalOrderID', removeData.tranId].join('\t')
        var line1 = ''
        if (multiOrder == 1) {
          line1 = ['RemovalDisposition', 'RETURN'].join('\t')
        }else {
          line1 = ['RemovalDisposition', 'DISPOSAL'].join('\t')
        }
        log.audit('line1', line1)
        var line2 = ['AddressName', removeData.receiverName].join('\t')
        var line3 = ['AddressFieldOne', removeData.addr1].join('\t')
        var line4 = ['AddressFieldTwo', removeData.addr2].join('\t')
        var line5 = ['AddressFieldThree', ''].join('\t')
        var line6 = ['AddressCity', removeData.receiverCity].join('\t')
        var line7 = ['AddressCountryCode', removeData.receiverCountry].join('\t')
        var line8 = ['AddressStateOrRegion', removeData.receiverProvince].join('\t')
        var line9 = ['AddressPostalCode', removeData.postalCode].join('\t')
        var line10 = ['ContactPhoneNumber', removeData.receiverMobile].join('\t')
        var line11 = ['ShippingNotes', ''].join('\t')
        var line21 = ['MerchantSKU', 'SellableQuantity', 'UnsellableQuantity'].join('\t')
        /**
           availableQuantity:availableQuantity,
           unavailableQuantity:unavailableQuantity,
           sellerSku:sellerSku
         */
        var listRemoceList = []
        for (var i = 0; i < removeList.length; i++) {
          listRemoceList[i] = [removeList[i].sellerSku, removeList[i].availableQuantity, removeList[i].unavailableQuantity].join('\t')
        }
        var line22 = ''
        for (var i = 0; i < listRemoceList.length;i++) {
          line22 = line22 + listRemoceList[i] + '\n'
        }

        var body = [line0, line1, line2, line3, line4, line5, line6, line7, line8, line9, line10, line11, line21, line22].join('\n')
        return body
      }

      function praseFeedResponseXML (xmlData) {
        log.error('Sumfeed  xmlData：', '' + xmlData)
        var data
        if (xmlData == '2') { data = 2 }else {
          var xmlDataDispose = xmlData.replace('xmlns', 'aaa')
          var xmlDocument = xml.Parser.fromString({ text: xmlDataDispose })
          log.error('aaa xmlDocument', '' + xmlDocument)
          var bookNode = xml.XPath.select({  node: xmlDocument, xpath: '//FeedSubmissionId'})
          var feedId = bookNode[0].textContent
          //       赋值给装箱单号
          var bookNode1 = xml.XPath.select({ node: xmlDocument, xpath: '//RequestId'})
          var requestId = bookNode1[0].textContent

          var bookNode2 = xml.XPath.select({ node: xmlDocument, xpath: '//FeedProcessingStatus'})
          var feedProcessingStatus = bookNode2[0].textContent

          var bookNode3 = xml.XPath.select({ node: xmlDocument, xpath: '//SubmittedDate'})
          var submittedDate = bookNode3[0].textContent

          var bookNode4 = xml.XPath.select({ node: xmlDocument, xpath: '//FeedType'})
          var feedType = bookNode4[0].textContent

          data = {
            feedId: feedId,
            requestId: requestId,
            feedProcessingStatus: feedProcessingStatus,
            submittedDate: submittedDate,
            feedType: feedType
          }
        }
        return data
      }
      //  得到店下面账户的基本网络请求数据
      function getAuthByAccountId (account_id) {
        var auth
        search.create({
          type: 'customrecord_aio_account',
          filters: [{ name: 'internalid', operator: 'is', values: account_id }],
          columns: [
            { name: 'custrecord_aio_seller_id' },
            { name: 'custrecord_aio_mws_auth_token' },
            { name: 'custrecord_aio_aws_access_key_id', 	join: 'custrecord_aio_dev_account'   },
            { name: 'custrecord_aio_secret_key_guid', 		join: 'custrecord_aio_dev_account'   },
            { name: 'custrecord_aio_amazon_mws_endpoint', 	join: 'custrecord_aio_enabled_sites' },
            { name: 'custrecord_aio_amazon_marketplace_id', join: 'custrecord_aio_enabled_sites' }
          ]
        }).run().each(function (rec) {
          auth = {
            seller_id: rec.getValue(rec.columns[0]),
            auth_token: rec.getValue(rec.columns[1]),
            access_id: rec.getValue(rec.columns[2]),
            sec_key: rec.getValue(rec.columns[3]),
            end_point: rec.getValue(rec.columns[4]),
            marketplace_id: rec.getValue(rec.columns[5])
          }
          return false
        })
        return auth || false
      }
      function mwsRequestMaker (auth, action, version, params, resource, body) {
        try {
          if (resource === void 0) { resource = '/'; }
          var timestamp = encodeURIComponent(new Date().toISOString())
          log.audit('action:', action)
          log.audit('paramssss:', action)
          var query = {
            SellerId: encodeURIComponent(auth.seller_id),
            AWSAccessKeyId: encodeURIComponent(auth.access_id),
            Action: encodeURIComponent(action),
            SignatureMethod: encodeURIComponent('HmacSHA256'),
            SignatureVersion: encodeURIComponent('2'),
            Timestamp: timestamp,
            Version: encodeURIComponent(version)
          }
          if (auth.auth_token) {
            query['MWSAuthToken'] = encodeURIComponent(auth.auth_token)
          }
          for (var key in params) {
            if (params[key] != '') {
              query[key] = encodeURIComponent(params[key])
            }
          }
          var keys = Object.keys(query)
          keys.sort()
          var queryString = keys.map(function (key) { return key + '=' + query[key]; }).join('&')
          var hash = cryptoJS.HmacSHA256('POST\n' + auth.end_point + '\n' + resource + '\n' + queryString, auth.sec_key)
          var hashInBase64 = encodeURIComponent(encode.convert({ string: hash, inputEncoding: encode.Encoding.HEX, outputEncoding: encode.Encoding.BASE_64 }))
          var response = https.post({
            url: 'https://' + auth.end_point + resource + '?' + queryString + '&Signature=' + hashInBase64,
            body: body ? body : queryString + '&Signature=' + hashInBase64,
            headers: body ? { 'Content-Type': 'text/xml' } : {}
          })
          log.error('url', 'https://' + auth.end_point + resource + '?' + queryString + '&Signature=' + hashInBase64)
          log.error('body', body ? body : queryString + '&Signature=' + hashInBase64)
          log.error('headers', body ? { 'Content-Type': 'text/xml' } : {})
          log.error('hashInBase64', hashInBase64)
          log.error('response', response)
          log.error('response.body', response.body)
          if (response.body.indexOf('</ErrorResponse>') != -1) {
            log.error('response.indexOf</ErrorResponse>', response.body.indexOf('</ErrorResponse>'))
            var record1 = record.create({type: 'customrecord_hofan_remove_response',isDynamic: true})
            record1.setValue({
              fieldId: 'custrecord_hf_response_message',
              value: 'MWS Request Builder ERR:\r\n\r\nSeller ID: ' + auth.seller_id + '\r\n\r\nAction:' + action + '\r\n\r\nError Details: \r\n\r\n' + response.body
            })
            record1.setValue({fieldId: 'custrecord_relative_audit',value: newrec_id})
            var s = record1.save()
            log.debug('mess reposne', s)
            return '2'
          }
        } catch(e) {log.error('error:', e) }
        return response.body
      }

      function getTextContentSafe (res, tag) {
        return res.getElementsByTagName({ tagName: tag }).length ? res.getElementsByTagName({ tagName: tag })[0].textContent : ''
      }
      function md5 (body) {
        var md5 = crypto.createHash({ algorithm: crypto.HashAlg.MD5 })
        log.debug('input', body)
        md5.update({ input: body, inputEncoding: encode.Encoding.UTF_8 })
        return md5.digest({ outputEncoding: encode.Encoding.HEX })
      }
    }

    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    }

    function setdefualt (rec, soid, type) {
      var name
      if (type == 'so') {
        type = 'salesorder'
        name = 'otherrefnum'
      }
      else if (type == 'case') {
        type = 'supportcase'
        name = 'custevent_case_po'
      }
      search.create({
        type: type,
        filters: [
          { name: 'internalId', operator: 'is', values: soid }
        ],
        columns: [
          {name: name}
        ]
      }).run().each(function (e) {
        rec.setValue({fieldId: 'custrecord_order_no',value: e.getValue(name)})
      })
    }
  })
