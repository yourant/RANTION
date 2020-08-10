/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/log', 'N/search', 'N/record', 'N/encode',
  '../Helper/CryptoJS.min', '../Helper/Moment.min', 'N/https', 'N/xml',
  'N/crypto'],

  function (log, search, record, encode, cryptoJS, moment, https, xml, crypto) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function getInputData () {
      var orders = [],limit = 100
      search.create({
        type: 'customrecord_removeorder_audit',
        filters: [
          {name: 'custrecord_checkresulte_ornot',operator: 'is',values: false}
        ]
      }).run().each(function (e) {
        orders.push(e.id)
        return --limit > 0
      })

      log.audit('orders', orders)
      return orders
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map (context) {
      var tranId, multiOrder,accId, param = {}
      var receiverName
      var receiverMobile
      var receiverCountry
      var receiverProvince
      var receiverCity
      var postalCode
      var addr1
      var addr2
      var res_audit = record.load({type: 'customrecord_removeorder_audit',id: context.value})
      try {
        search.create({
          type: 'customrecord_removeorder_audit',
          filters: [
            {name: 'internalid',operator: 'is',values: context.value}
          ],
          columns: [
            {name: 'custrecord_hf_remove_type'},
            {name: 'custrecord_store_name_reord'},
            {name: 'custrecord_hf_recivename'},
            {name: 'custrecord_hf_remove_country'},
            {name: 'custrecord_hf_remove_provience'},
            {name: 'custrecord_hf_remove_zip'},
            {name: 'custrecord_hf_remove_phone'},
            {name: 'custrecord_hf_address'},
            {name: 'custrecord_hf_city'},
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
          addr2 = e.getValue('custrecord_hf_address')
          tranId = 'po' + e.getValue('custrecord_store_name_reord') + '-' + context.value
          log.debug('tranId:' + tranId)
          return false
        })
        log.debug('1')
        var num = 1
        var removeList = []
        search.create({
          type: 'customrecord_remove_product',
          filters: [
            {name: 'custrecord_hf_remove_relative_audit',operator: 'is',values: context.value}
          ],
          columns: [
            {name: 'custrecord_hf_remove_sku'},
            {name: 'custrecord_remove_quantity'}
          ]
        }).run().each(function (e) {
          planQty = e.getValue('custrecord_remove_quantity')
          sellerSku = e.getValue('custrecord_hf_remove_sku')
          log.debug('数量和SKU ：' + planQty, sellerSku)
          //        Items.SellerFulfillmentOrderItemId   BIC00037BSUS 
          //        SKU  就这个可以
          //        sellerSku = 'TMQ00012BSFBA'
          // param['Items.member.' + num + '.SellerSKU'] = sellerSku // sellerSku
          // +num      sellerSku+num 出问题了  orderNo
          // param['Items.member.' + num + '.SellerFulfillmentOrderItemId'] = sellerSku + num
          // param['Items.member.' + num + '.Quantity'] = planQty
          //          param['Items.member.'+num+'.PerUnitDeclaredValue.CurrencyCode']  = 'USD'
          //          param['Items.member.'+num+'.PerUnitDeclaredValue.Value']  = 30; 
          removeList.push({
            availableQuantity: planQty,
            unavailableQuantity: 0,
            sellerSku: sellerSku
          })
          num++
          return true
        })
        log.audit('商品信息获取成功', removeList)
        /*  
        * 获取multiOrder
        * 判断是否为气质订单 2    库存移除1
        * 收取客户信息，removedata
        * 收取货品信息  removelist
        * 
 	    * */
        // 	店铺Id   获取店铺
        log.audit('multiOrder', multiOrder)

        //   1指定地址弃置  2 没有地址  直接放弃  
        if (multiOrder) {
          // 	客户：项目
          // 发货单号
          //  配送订单日期，格式为 ISO 8601。
          //	配送发货日期      saleseffectivedate
          // var isoDate = moment(new Date(+new Date() + 8 * 3600 * 1000)).toISOString(true)
          // log.debug('isoDate', isoDate)
          // param['DisplayableOrderDateTime'] = isoDate; // moment(so.getValue(trandate)).toDate()
          // // 在面向买家的材料（如出库货件装箱单）中出现的订单详情文本。happynewyear
          // param['DisplayableOrderComment'] = 'happynewyear'
          // // TODO: 指定配送订单应立即配送还是暂缓配送:Ship - 立即配送。   Hold - 暂缓配送。
          // param['FulfillmentAction'] = 'Ship'
          // /**配送订单的配送方式:
          //  * Standard - 标准配送方式。
          //  * Expedited - 加急配送方式。
          //  * Priority - 优先配送方式。
          //  * ScheduledDelivery - 预约送货上门配送方式。预约送货上门仅适用于日本 (JP)。
          //  */
          // param['ShippingSpeedCategory'] = 'Standard'
          // //  配送地址
          // param['DestinationAddress.Name'] = receiverName
          // param['DestinationAddress.Line1'] = addr1
          // param['DestinationAddress.Line2'] = addr2
          // param['DestinationAddress.CountryCode'] = receiverCountry
          // param['DestinationAddress.StateOrProvinceCode'] = receiverProvince
          // param['DestinationAddress.City'] = receiverCity
          // param['DestinationAddress.PostalCode'] = postalCode
          // param['DestinationAddress.PhoneNumber'] = receiverMobile
          // log.audit('param', param)
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
          log.audit('removeData:', removeData)
          try {
            var auth = getAuthByAccountId(accId)
            log.audit('Amazon_auth', auth)
          } catch(e) {
            log.error('error', e)
          }
          return
          if (auth) {
            var feedResponse
            //        得到提交结果  	
            var submitFeedMessage
            var feedId
            //       提交数据r
            feedResponse_re = getFeedSubmissionId(auth, removeData, removeList)
            feedResponse = praseFeedResponseXML(feedResponse_re)

            if (feedResponse_re == '2') {  log.audit('2', '接口请求错误') }else {
              log.audit('feedResponse', JSON.stringify(feedResponse))
              var ord_0 = record.create({ type: 'customrecord_aio_amazon_feed', isDynamic: true })
              ord_0.setValue({ fieldId: 'custrecord_hf_remove_id', value: context.value })
              ord_0.setValue({ fieldId: 'custrecord_aio_feed_submission_id', value: feedResponse.feedId })
              ord_0.setValue({ fieldId: 'custrecord_aio_submitted_date', value: feedResponse.submittedDate })
              ord_0.setValue({ fieldId: 'custrecord_aio_feed_processing_status', value: feedResponse.feedProcessingStatus })
              ord_0.setValue({ fieldId: 'custrecord_aio_feed_type', value: feedResponse.feedType })
              ord_0.setValue({ fieldId: 'custrecord_aio_order_id', value: tranId })
              ord_0.setValue({ fieldId: 'custrecord_aio_feed_account', value: accId })
              var or = ord_0.save()
              res_audit.setValue({fieldId: 'custrecord_is_processing_success',value: true})
              res_audit.save()
              log.debug('save()', or)
            }
          }
        } // endif multiOrder

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
        log.error('body :', JSON.stringify(body))
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
      //	多渠道订单类型  1 多渠道发货  2指定地址弃置   3 没有地址  直接放弃
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
         * 
           availableQuantity:availableQuantity,
           unavailableQuantity:unavailableQuantity,
           sellerSku:sellerSku
         */
        var listRemoceList = []
        for (var i = 0; i < removeList.length; i++) {
          listRemoceList[i] = [removeList[i].sellerSku, removeList[i].availableQuantity, removeList[i].unavailableQuantity].join('\t')
        }
        //       var line22 = ['TMQ00012BSFBA','1','1'].join('\t')
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
          // 	  var xmlData = "<?xml version=\"1.0\"?>\n<SubmitFeedResponse xmlns=\"http://mws.amazonaws.com/doc/2009-01-01/\"><SubmitFeedResult><FeedSubmissionInfo><FeedSubmissionId>64998018137</FeedSubmissionId><FeedType>_POST_FLAT_FILE_FBA_CREATE_REMOVAL_</FeedType><SubmittedDate>2019-08-29T06:05:27+00:00</SubmittedDate><FeedProcessingStatus>_SUBMITTED_</FeedProcessingStatus></FeedSubmissionInfo></SubmitFeedResult><ResponseMetadata><RequestId>fbeb2e25-09c5-4d35-9189-a594ee24a636</RequestId></ResponseMetadata></SubmitFeedResponse>"
          // 	  var xmlData = '<?xml version="1.0"?><CreateFulfillmentOrderResponse xmlns="http://mws.amazonaws.com/FulfillmentOutboundShipment/2010-10-01/"><ResponseMetadata><RequestId>d95be26c-16cf-4bbc-ab58-dce89fd4ac53</RequestId></ResponseMetadata></CreateFulfillmentOrderResponse>'
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
      //		    访问网络访问  获取数据  看ＡＰＩ文档 ？？？
      // var response = core1.mwsRequestMaker(auth, 'CreateFulfillmentOrder', '2010-10-01', param, 
      // '/FulfillmentOutboundShipment/2010-10-01/','',record1)
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
            record1.setValue({fieldId: 'custrecord_relative_audit',value: context.value})
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

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce (context) {
    }

    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize (summary) {
    }

    return {
      getInputData: getInputData,
      map: map,
      reduce: reduce,
      summarize: summarize
    }
  })
