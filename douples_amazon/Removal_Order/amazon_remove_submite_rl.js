/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['../Helper/core.min', 'N/log', 'N/search', 'N/record', 'N/encode',
  '../Helper/CryptoJS.min', '../Helper/Moment.min', 'N/https', 'N/xml',
  'N/crypto', 'N/workflow'],

  function (core, log, search, record, encode, cryptoJS, moment, https, xml, crypto, workflow) {
    /**
     * Function called upon sending a GET request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.1
     */
    function doGet (requestParams) {
    }

    /**
     * Function called upon sending a PUT request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPut (requestBody) {
    }

    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost (requestBody) {
      var qua
      switch (requestBody.p) {
        case 'Consent':
          log.debug('requestBody', requestBody)
          log.debug('requestBody.arr', requestBody.arr)
          log.debug('requestBody.p', requestBody.p)
          qua = BulkTriggerWorkflowConsent(requestBody.arr)
          return qua
        case 'Rejection':
          log.debug('requestBody', requestBody)
          log.debug('requestBody.arr', requestBody.arr)
          log.debug('requestBody.p', requestBody.p)
          qua = BulkTriggerWorkflowRejection(requestBody.arr)
          return qua
        case 'checkInven':
          // var account = core.amazon.getAuthByAccountId(requestBody.acc_id)
          var report_type = 14,n = 0,result = {}
          result = getReport('', report_type, requestBody.post_sku, requestBody.acc_id)

          if (JSON.stringify(result) != '{}') {
            log.debug('result != {}', result)
            return result
          }else { return '2'}
        case 'removal_checkStatus': // 检查提交状态
          try {
            var account = core.amazon.getAuthByAccountId(requestBody.acc_id)
            log.debug('typeof-feedId', typeof (requestBody.feedId))
            var result = ''
            result = getSubmitList(requestBody.feedId, account, requestBody.rec_id)
            log.debug('result-response:', typeof (result))
            if (result != '2') {
              x = result.indexOf('Info')
              if (x < 0) x = result.indexOf('信息')
              log.debug('info /信息 x:', x)
              result = result.substring(x, result.length)
            //				result = result.split('message')[1]
            //	    		result = result.replace(/[\t,\n,\d]/g,'')
            }else {
              reslut = '订单还没有创建成功'
            }
          } catch(e) {
            log.error('removal_checkStatus err', e)
            if (e.indexOf('You need a higher permission') > 0) {
              result = '权限不足'
            }else {
              result = '查询失败'
            }
          }
          return result
        case 'searchOrder':
          try {
            var result = searchOrder(requestBody.orderno)
            log.debug('result:', result)
            if (JSON.stringify(result) == '{}') return '2'
            else return result
          } catch(e) {log.error('error', e) }
        case 'refund_checkStatus':
          try {
            var account = core.amazon.getAuthByAccountId(requestBody.acc_id)
            log.debug('typeof-feedId', typeof (requestBody.feedId))
            var result = ''
            result = getSubmitList(requestBody.feedId, account[0].auth_meta, requestBody.rec_id)
            var xmlDocument = xml.Parser.fromString({
              text: result
            })
            var ResultDescription = xml.XPath.select({
              node: xmlDocument,
              xpath: '//ResultDescription'
            })
            var StatusCode = xml.XPath.select({
              node: xmlDocument,
              xpath: '//StatusCode'
            })
            var Successful = xml.XPath.select({
              node: xmlDocument,
              xpath: '//MessagesSuccessful'
            })
            var ResultDescription_0
            try {
              ResultDescription_0 = ResultDescription[0].textContent
            } catch(e) {
              if (Successful[0].textContent == '1' && StatusCode[0].textContent == 'Complete')   ResultDescription_0 = 'Successful'
            }
            log.debug('ResultCode+typ :' + typeof (ResultDescription_0), JSON.stringify(ResultDescription_0))
            if (result != '2') {
              result = ResultDescription_0
            //				result = result.split('message')[1]
            //	    		result = result.replace(/[\t,\n,\d]/g,'')
            }else {
              reslut = '没有创建成功'
            }
          } catch(e) {
            log.error('removal_checkStatus err', e)
            if (e.indexOf('You need a higher permission') > 0) {
              result = '权限不足'
            }else {
              result = '查询失败'
            }
          }
          return result
        default:
          log.debug('requestBody', requestBody)
          break
      }
    }

    function searchOrder (p) {
      var sku,en,result = {}
      search.create({
        type: 'salesorder',
        filters: [
          {name: 'poastext',operator: 'is',values: p},
          {name: 'mainline',operator: 'is',values: false},
          {name: 'account',operator: 'is',values: 54}
        ],
        columns: [
          {name: 'custitem_seller_sku',join: 'item'},
          {name: 'shipaddressee'},
          {name: 'shipcountry'},
          {name: 'shipphone'},
          {name: 'shipstate'},
          {name: 'shipcity'},
          {name: 'shipaddress1'},
          {name: 'shipaddress2'},
          {name: 'shipzip'},
          {name: 'custbody_aio_account'},
          {name: 'custbody_aio_s_fulfillment_channel'}
        ]
      }).run().each(function (e) {
        result = {
          sku: e.getValue(e.columns[0]),
          receiverName: e.getValue(e.columns[1]),
          receivercountryCode: e.getValue(e.columns[2]),
          receiverMobile: e.getValue(e.columns[3]),
          receiverProvince: e.getValue(e.columns[4]),
          receiverCity: e.getValue(e.columns[5]),
          addr1: e.getValue(e.columns[6]),
          addr2: e.getValue(e.columns[7]),
          zip: e.getValue(e.columns[8]),
          acc_id: e.getValue(e.columns[9]),
          channel: e.getValue(e.columns[10])
        }
      })
      return result
    }
    function getReport (account, report_type, post_seller_sku, acc_id) {
      var quantity = {},r = []
      //  try{
      // 	  var r = core.amazon.getRequestingReportList(account, report_type)
      //          log.debug("acc_id:"+acc_id,"post_seller_sku:"+post_seller_sku)
      //          log.debug("r :",r)
      //          for(var j=0;j<r.length;j++){
      //         	 var lines = r[j].lines
      //              record.submitFields({
      //                  type: core.ns.amazon_report._name, id: r[j].id, values: {
      //                      'custrecord_aio_origin_report_is_download': true
      //                  }
      //              })

      //           	 for(var i=0;i<lines.length;i++){
      //           		 var  unsellable = JSON.parse(JSON.stringify(lines[i]))['afn-unsellable-quantity']
      //           		 var  sellable =JSON.parse(JSON.stringify(lines[i]))['afn-fulfillable-quantity']
      //           		 var  uni =lines[i]['afn-unsellable-quantity']
      //           		 var  ii =lines[i]['afn-fulfillable-quantity']
      //           		 log.debug("lines["+i+"]",lines[i])
      // 	            var n=0
      // 	            search.create({
      // 	            	type:'customrecord_unsalle_and_salle',
      // 	            	filters:[
      // 	            		{name:'custrecord_seller_skus',operator:'is',values:lines[i].sku},
      // 	            		{name:'custrecord_relaive',operator:'is',values:acc_id}
      // 	            	]
      // 				}).run().each(function(e){ n=e.id })
      // 				log.debug("n:",n)
      // 	            if(n){
      // 	            var s = record.load({type:'customrecord_unsalle_and_salle',id:n})
      // 		    	s.setValue({fieldId:'custrecord_relaive',value:acc_id})
      // 				s.setValue({fieldId:'custrecord_unsalles',value:lines[i]['afn-unsellable-quantity']})
      // 				s.setValue({fieldId:'custrecord_salle',value:lines[i]['afn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_seller_skus',value:lines[i].sku})
      // 				s.setValue({fieldId:'custrecord_amzon_fnsku',value:lines[i].fnsku})
      // 				s.setValue({fieldId:'custrecord_amzon_asin',value:lines[i].asin})
      // 				s.setValue({fieldId:'custrecord_mfn_listing_extsts',value:lines[i]['mfn-listing-exists']})
      // 				s.setValue({fieldId:'custrecord_mfn_fulfillable_quantity',value:lines[i]['mfn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_listing_exists',value:lines[i]['afn-listing-exists']})
      // 				s.setValue({fieldId:'custrecord_afn_warehouse_quantity',value:lines[i]['afn-warehouse-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_fulfillable_quantity',value:lines[i]['afn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_unsellable_quantity',value:lines[i]['afn-unsellable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_reserved_quantity',value:lines[i]['afn-reserved-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_total_quantity',value:lines[i]['afn-total-quantity']})
      // 				s.setValue({fieldId:'custrecord_per_unit_volume',value:lines[i]['per-unit-volume']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_working_quantity',value:lines[i]['afn-inbound-working-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_shipped_quantity',value:lines[i]['afn-inbound-shipped-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_recei_quantity',value:lines[i]['afn-inbound-receiving-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_reserved_future_supply',value:lines[i]['afn-reserved-future-supply']})
      // 				s.setValue({fieldId:'custrecord_afn_future_supply_buyable',value:lines[i]['afn-future-supply-buyable']})
      // 				s.setValue({fieldId:'custrecord_your_price',value:lines[i]['your-price']})
      // 				s.setValue({fieldId:'custrecord_amazon_condition',value:lines[i].condition})
      // 				var ss = s.save()
      // 				log.debug("save():",ss)
      // 	            }else{
      // 	            	var s = record.create({type:'customrecord_unsalle_and_salle',isDynamic:true})
      // 				s.setValue({fieldId:'custrecord_relaive',value:acc_id})
      // 				s.setValue({fieldId:'custrecord_unsalles',value:lines[i]['afn-unsellable-quantity']})
      // 				s.setValue({fieldId:'custrecord_salle',value:lines[i]['afn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_seller_skus',value:lines[i].sku})
      // 				s.setValue({fieldId:'custrecord_amzon_fnsku',value:lines[i].fnsku})
      // 				s.setValue({fieldId:'custrecord_amzon_asin',value:lines[i].asin})
      // 				s.setValue({fieldId:'custrecord_mfn_listing_extsts',value:lines[i]['mfn-listing-exists']})
      // 				s.setValue({fieldId:'custrecord_mfn_fulfillable_quantity',value:lines[i]['mfn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_listing_exists',value:lines[i]['afn-listing-exists']})
      // 				s.setValue({fieldId:'custrecord_afn_warehouse_quantity',value:lines[i]['afn-warehouse-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_fulfillable_quantity',value:lines[i]['afn-fulfillable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_unsellable_quantity',value:lines[i]['afn-unsellable-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_reserved_quantity',value:lines[i]['afn-reserved-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_total_quantity',value:lines[i]['afn-total-quantity']})
      // 				s.setValue({fieldId:'custrecord_per_unit_volume',value:lines[i]['per-unit-volume']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_working_quantity',value:lines[i]['afn-inbound-working-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_shipped_quantity',value:lines[i]['afn-inbound-shipped-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_inbound_recei_quantity',value:lines[i]['afn-inbound-receiving-quantity']})
      // 				s.setValue({fieldId:'custrecord_afn_reserved_future_supply',value:lines[i]['afn-reserved-future-supply']})
      // 				s.setValue({fieldId:'custrecord_afn_future_supply_buyable',value:lines[i]['afn-future-supply-buyable']})
      // 				s.setValue({fieldId:'custrecord_your_price',value:lines[i]['your-price']})
      // 				s.setValue({fieldId:'custrecord_amazon_condition',value:lines[i].condition})
      // 				var ss = s.save()
      // 				log.debug("save():",ss)
      // 	            }
      //           	 }
      //          }
      //  }catch(e){
      // 	 log.error("getReport error",e)
      //  }

      var n = 0
      search.create({
        type: 'customrecord_unsalle_and_salle',
        filters: [
          {name: 'custrecord_seller_skus',operator: 'is',values: post_seller_sku},
          {name: 'custrecord_relaive',operator: 'is',values: acc_id}
        ],
        columns: [
          {name: 'custrecord_unsalles'},
          {name: 'custrecord_salle'}
        ]
      }).run().each(function (e) {
        n = e.id
        var un = e.getValue(e.columns[0])
        var i = e.getValue(e.columns[1])
        log.debug('un::', un)
        log.debug('i::', i)
        if (un == undefined || un == '') un = 0
        if (i == undefined || i == '' || i == 0) i = 1
        quantity = {'i': i,'un': un}
        return true
      })
      log.debug('查看是否存在数量 n', n)
      if (n) return quantity
      else return '2'
    }

    function listInventoryReport (account, post_seller_sku, report_type) {
      log.debug('account', account)
      try {
        var report_range = 3
        var report_start_date = Number(report_range) <= 3 ? moment.utc().subtract(1, ['', 'days', 'weeks', 'months'][report_range]).startOf('day').toISOString() : moment.utc().subtract(Number(report_range) - 2, 'days').startOf('day').toISOString()
        var feedid = ''
        feedid = core.amazon.requestReport(account, report_type, {
          'StartDate': report_start_date,
          'EndDate': moment.utc().subtract(1, 'days').endOf('day').toISOString(),
          'MarketplaceIdList.Id.1': account.marketplace
        })
        var is = /^\d+$/.test(feedid)
        return is
      } catch (e) {
        log.error('APP ERROR', e)
      }
    }
    function getSubmitList (feedId, auth, rec_id) {
      log.error('检查参数typeof(feedId)', '---' + typeof (feedId))
      var param = {}
      param['FeedSubmissionId'] = feedId
      var response; // auth, action, version, params, resource, body,newrec_id)
      response = mwsRequestMaker(auth, 'GetFeedSubmissionResult', '2009-01-01', param , '/Feeds/2009-01-01/', '', rec_id)
      log.error('检查是否成功 response', '' + response)
      return response
    }
    function praseFeedResponseXML (xmlData) {
      log.error('Sumfeed  xmlData：', '' + xmlData)
      var data
      if (xmlData == '2') { data = 2 }else {
        //     	  var xmlData = "<?xml version=\"1.0\"?>\n<SubmitFeedResponse xmlns=\"http://mws.amazonaws.com/doc/2009-01-01/\"><SubmitFeedResult><FeedSubmissionInfo><FeedSubmissionId>64998018137</FeedSubmissionId><FeedType>_POST_FLAT_FILE_FBA_CREATE_REMOVAL_</FeedType><SubmittedDate>2019-08-29T06:05:27+00:00</SubmittedDate><FeedProcessingStatus>_SUBMITTED_</FeedProcessingStatus></FeedSubmissionInfo></SubmitFeedResult><ResponseMetadata><RequestId>fbeb2e25-09c5-4d35-9189-a594ee24a636</RequestId></ResponseMetadata></SubmitFeedResponse>"
        //     	  var xmlData = '<?xml version="1.0"?><CreateFulfillmentOrderResponse xmlns="http://mws.amazonaws.com/FulfillmentOutboundShipment/2010-10-01/"><ResponseMetadata><RequestId>d95be26c-16cf-4bbc-ab58-dce89fd4ac53</RequestId></ResponseMetadata></CreateFulfillmentOrderResponse>'
        var xmlDataDispose = xmlData.replace('xmlns', 'aaa')
        var xmlDocument = xml.Parser.fromString({ text: xmlDataDispose })
        log.error('aaa xmlDocument', '' + xmlDocument)
        var bookNode = xml.XPath.select({  node: xmlDocument, xpath: '//FeedSubmissionId'})
        var feedId = bookNode[0].textContent
        //           赋值给装箱单号
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
    //    		    访问网络访问  获取数据  看ＡＰＩ文档 ？？？
    // var response = core1.mwsRequestMaker(auth, 'CreateFulfillmentOrder', '2010-10-01', param, 
    // '/FulfillmentOutboundShipment/2010-10-01/','',record1)
    function mwsRequestMaker (auth, action, version, params, resource, body, newrec_id) {
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
        //   var record1 = record.create({type: 'customrecord_hofan_remove_response',isDynamic: true})
        //   record1.setValue({
        //     fieldId: 'custrecord_hf_response_message',
        //     value: 'MWS Request Builder ERR:\r\n\r\nSeller ID: ' + auth.seller_id + '\r\n\r\nAction:' + action + '\r\n\r\nError Details: \r\n\r\n' + response.body
        //   })
        //   record1.setValue({fieldId: 'custrecord_relative_audit',value: newrec_id})
        //   var s = record1.save()
        //   log.debug('mess reposne', s)
        //   return 'Feed Submission Result is not ready for Feed, 提交操作还未完成，请稍后再试'
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

    // =================================getcreateOrder=============================================   
    /**
     * 
     * @param {*} Array 
     */
    function BulkTriggerWorkflowConsent (Array) {
      // 批量触发工作流, 同意
      log.debug('批量触发工作流', '同意')
      var add = 0
      var length = Array.length
      log.debug('length', length)
      for (var i = 0; i < length; i++) {
        var reid = Array[i]
        add++
        log.debug('reid', reid)

        // 直接触发审批通过按钮
        try {
          workflow.trigger({
            recordType: 'customrecord_removeorder_audit',
            recordId: reid,
            workflowId: 'customworkflow_hf_remove_order_wf',
            actionId: 'workflowaction_audit_agree_reord', // 触发审批通过按钮
          })
        } catch(e) {
          log.debug('触发工作流出错', e)
        }
      }
      log.debug('add', add)
      return add
    }

    /**
     * 
     * @param {*} Array 
     */
    function BulkTriggerWorkflowRejection (Array) {

      // 批量触发工作流, 拒绝
      log.debug('批量触发工作流', '拒绝')
      var add = 0
      var length = Array.length
      log.debug('length', length)
      for (var i = 0; i < length; i++) {
        var reid = Array[i]
        add++
        log.debug('reid', reid)

        // 直接触发审批拒绝按钮
        try {
          workflow.trigger({
            recordType: 'customrecord_removeorder_audit',
            recordId: reid,
            workflowId: 'customworkflow_hf_remove_order_wf',
            actionId: 'workflowaction_audit_refuse', // 触发审批拒绝按钮
          })
        } catch(e) {
          log.debug('触发工作流出错', e)
        }
      }
      log.debug('add', add)
      return add
    }
    // =================end===getcreateOrder==============================================================================

    /**
     * Function called upon sending a DELETE request to the RESTlet.
     *
     * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doDelete (requestParams) {
    }

    return {
      'get': doGet,
      put: doPut,
      post: doPost,
      'delete': doDelete
    }
  })
