/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search','N/record','./Helper/Moment.min','N/format','N/runtime','./Helper/interfunction.min'],
  function(search,record,moment,format,runtime,interfun) {
    const MissingReportType = 5 //Missing report 财务报告  orders
    const account = 122   //应收账款 
    const account_Tax = 1026   //6601.30.01 销售费用 : 平台销售税 : Amazon
    // const Promotionitem = 54   //主营业务
    const ItemPrice = {    
      "Principal":""  ,   //ItemPricePrincipal
      "Tax":1026  ,   //ItemPrice TAX
    }  
    // const PromotionShipping = 2203   //PromotionShipping 科目 
    const financeMapping ={
        "Principal" : "custrecord_principal_currency_amount",
        "Tax" :"custrecord_tax_currency_amount",
        "Commission" :"custrecord_commission",
        "FBAPerOrderFulfillmentFee" :"custrecord_fba_perorder_fulfil_feeamount",
        "FBAPerUnitFulfillmentFee" :"custrecord_fba_perunit_fulfil_feeamount",
        "FBAWeightBasedFee" :"custrecord_fba_weight_based_fee_amount",
        "FixedClosingFee" :"custrecord_fixed_closing_fee_amount",
        "VariableClosingFee" :"custrecord_variable_closing_fee_amount",
        "GetPaidFasterFee":"custrecord_amazon_getpaidfasterfee",
        "GiftwrapChargeback" :"custrecord_giftwrap_charge_back_fee_amou",
        "GiftWrap" :"custrecord_giftwrap_currency_amount",
        "GiftWrapTax" :"custrecord_giftwraptax_currency_amount",
        "SalesTaxCollectionFee" :"custrecord_sales_tax_collection_fee_amou",
        "Shipping" :"custrecord_shippingcharge_curr_amount",
        "ShippingTax":"custrecord_shippingtax_currency_amount",
        "ShippingHB" :"custrecord_shippinghb_fee_amount",
        "ShippingChargeback" :"custrecord_shipping_charge_back_fee_amou",
        "MarketplaceFacilitatorTax-Shipping" :"custrecord_marketplace_factaxship_amount",
        "MarketplaceFacilitatorTax-Principal" :"custrecord_marketplace_factaxprin_amount",
        "MarketplaceFacilitatorTax-Other" :"custrecord_marketplace_factaxother_acoun",
        "Principal-promotion":"custrecord_amazon_promotion_itemdiscount",
        "Shipping-promotion":"custrecord_amazon_promotion_shipping",
        "RefundCommission" :"custrecord_refundcommission",
        "ExportCharge" :"custrecord_finace_exportcharge",
        "LowValueGoodsTax-Principal" :"custrecord_lowvaluegoodstax_principal",
        "LowValueGoodsTax-Shipping" :"custrecord_lowvaluegoodstax_shipping",
        "RestockingFee" :"custrecord_amazon_restockingfee",
        "Promotionitem":"custrecord_amazon_promotion_itemdiscount",//1341
        "PromotionShipping":"custrecord_amazon_promotion_shipping",//2203
        // "PromotionMetaDataDefinitionValue" :"custrecord_prom_meta_data_def_val"
    }
    const fieldsMapping =[
      "Commission" ,
      "FBAPerOrderFulfillmentFee",
      "FBAPerUnitFulfillmentFee",
      "FBAWeightBasedFee",
      "FixedClosingFee",
      "VariableClosingFee",
      "GetPaidFasterFee",
      "GiftwrapChargeback",
      "GiftWrap",
      "GiftWrapTax",
      "Tax",
      "SalesTaxCollectionFee",
      "Shipping",
      "ShippingTax",
      "ShippingHB",
      "ShippingChargeback",
      "MarketplaceFacilitatorTax-Shipping",
      "MarketplaceFacilitatorTax-Principal",
      "MarketplaceFacilitatorTax-Other",
    //   "PromotionMetaDataDefinitionValue",
      "Promotionitem",
      "PromotionShipping",
      "ExportCharge",
      "RestockingFee",
      "LowValueGoodsTax-Principal",
      "LowValueGoodsTax-Shipping",
      "RefundCommission"
    ]
    const martk_corr={   //科目配置表的报告类型字段
      "EU":2,
      "JP":2,
      "UK":2,
      "IT":2,
      "ES":2,
      "DE":2,
      "FR":2,
      "US":1,
      "CA":1,
      "MX":1,
      "AU":1,
      "SG":1
    } 
    const finType = "Order"
    const JP_currency = 8
    const income_fin=363    //应收账款-暂估	 1122.05	
    const income_settle=361    //应收账款-待结算  1122.03
    const Fincome_Plat=412	    //预收账款-平台	 2203.03 
    const income_Refund=471    //主营业务收入-退款	 6001.06

    const sd= [
'111-0023113-3623411',
'111-0068150-3801843',
'111-0082314-1855460',
'111-0198520-7079469',
'111-0242791-4352279',
'111-0415291-7943436',
'111-0752553-2935446',
'111-0827739-4138619',
'111-0879999-3573030',
'111-0912409-0825832',
'111-0939785-4484266',
'111-0967251-9794601',
'111-1102724-2520224',
'111-1115229-8746629',
'111-1289892-2265039',
'111-1358696-3958648',
'111-1457698-5325830',
'111-1616168-7485820',
'111-1761098-8840233',
'111-1931797-5958622',
'111-1949424-1549834',
'111-2015028-4989024',
'111-2155985-3029024',
'111-2238916-9285013',
'111-2385181-6937056',
'111-2399928-1285055',
'111-2556231-8778614',
'111-2595417-1257047',
'111-2657294-2651431',
'111-2883112-6736209',
'111-2915634-3525044',
'111-2932539-8442652',
'111-3048687-3216247',
'111-3266689-8336268',
'111-3284940-8556209',
'111-3305172-1543454',
'111-3414662-5861847',
'111-3506911-5598626',
'111-3572056-5101006',
'111-3679083-3552252',
'111-3755449-2352233',
'111-3906982-8896241',
'111-3920574-5910636',
'111-3953600-6778622',
'111-4137961-6181837',
'111-4228257-2918645',
'111-4300682-8881050',
'111-4317236-7727425',
'111-4407830-8328244',
'111-4430297-2661003',
'111-4440607-9596234',
'111-4568555-9689058',
'111-4748273-1952206',
'111-5046907-2659441',
'111-5103741-9553003',
'111-5136574-8105043',
'111-5464420-9765058',
'111-5515192-4637821',
'111-5536270-0229049',
'111-5594532-1297034',
'111-5720184-7230601',
'111-5867458-2413058',
'111-5961210-8035431',
'111-5969448-8825029',
'111-6137006-5321845',
'111-6248682-7571402',
'111-6448733-0027455',
'111-6463515-3426613',
'111-6480987-0501062',
'111-6745995-7792246',
'111-6857326-7506608',
'111-6908931-7770629',
'111-6934303-8451427',
'111-6985565-4037861',
'111-6997845-6740253',
'111-7011020-2892203',
'111-7014142-1561042',
'111-7031347-2659418',
'111-7202636-6665055',
'111-7230560-9480255',
'111-7350276-3159453',
'111-7406729-2692231',
'111-7407713-8137834',
'111-7422868-3545012',
'111-7884178-8017010',
'111-8013968-7426615',
'111-8252805-3909022',
'111-8497483-8301059',
'111-8946615-9902638',
'111-9221193-4154663',
'111-9272968-0595450',
'111-9362023-2052246',
'111-9364694-5598641',
'111-9470234-5421008',
'111-9479374-8533805',
'111-9499856-5710667',
'111-9521721-4954653',
'111-9538429-2164261',
'111-9609828-4277024',
'111-9637609-7269813',
'111-9733636-2332257',
'112-0097457-3020220',
'112-0100909-0997025',
'112-0159314-6968202',
'112-0386781-2699444',
'112-0400223-8905061',
'112-0506314-5240208',
'112-0639782-9773015',
'112-0654910-9909862',
'112-0685794-6469841',
'112-0719908-6045827',
'112-0846564-1992256',
'112-0998436-8552251',
'112-1006282-2396206',
'112-1046390-4344217',
'112-1051231-5497022',
'112-1081947-6464257',
'112-1090675-7002606',
'112-1114995-9798652',
'112-1231371-9699431',
'112-1372450-8665033',
'112-1380741-4762633',
'112-1424664-8278659',
'112-1616967-3121808',
'112-1633497-3036238',
'112-1680015-8523407',
'112-1825713-2483464',
'112-1828677-3395431',
'112-1839251-3546632',
'112-1893989-0070663',
'112-1968716-9191417',
'112-2052084-4873864',
'112-2066504-8440226',
'112-2103554-7135437',
'112-2141531-2864226',
'112-2323849-8864244',
'112-2337812-6457048',
'112-2486054-2632253',
'112-2530815-3629061',
'112-2670943-2182623',
'112-2731742-3441050',
'112-2749639-7035448',
'112-2840938-1481816',
'112-2843502-8507450',
'112-2873208-7820265',
'112-2904285-8609865',
'112-2919099-0691453',
'112-2925124-8733856',
'112-3072388-3833055',
'112-3190695-9442664',
'112-3218215-5034641',
'112-3237974-8883434',
'112-3329863-2292240',
'112-3332831-1871469',
'112-3345368-3825812',
'112-3369695-6721009',
'112-3501749-3275435',
'112-3507825-0540234',
'112-3533769-0025842',
'112-3559208-9142645',
'112-3580246-1007430',
'112-3614434-5357842',
'112-3683310-8249011',
'112-3704250-5780231',
'112-3751608-9187409',
'112-3796044-9667467',
'112-3856092-7402644',
'112-3896864-5062656',
'112-3904691-1960220',
'112-4255567-8293030',
'112-4411290-2649855',
'112-4481738-5238610',
'112-4516630-0973023',
'112-4607472-7355454',
'112-4678914-7815408',
'112-4702566-3513017',
'112-4712859-2276258',
'112-4758838-8570613',
'112-4790166-4747429',
'112-4927140-2624264',
'112-5070087-2823433',
'112-5127729-0448266',
'112-5193664-5917814',
'112-5320352-1481022',
'112-5366653-4383453',
'112-5390660-9137818',
'112-5404719-9617837',
'112-5520342-0168267',
'112-5677918-9161029',
'112-5878962-0950601',
'112-6047332-4412206',
'112-6058726-4525014',
'112-6060320-6733061',
'112-6273326-3350642',
'112-6324901-9160232',
'112-6346449-4525054',
'112-6547570-6534607',
'112-6592380-9166604',
'112-6715373-8913845',
'112-6734817-0165839',
'112-6853030-3198611',
'112-6868214-4453040',
'112-6967793-4917843',
'112-7033338-2427417',
'112-7117836-2616204',
'112-7287755-5240244',
'112-7405162-4876240',
'112-7425380-7669014',
'112-7805023-8261843',
'112-8443791-3433000',
'112-8455037-8214642',
'112-8482510-4853818',
'112-8578788-9491465',
'112-8623806-3280211',
'112-8772439-6648200',
'112-8833419-0824250',
'112-8844412-7808236',
'112-8904110-4170639',
'112-9016431-0846608',
'112-9029576-9941023',
'112-9198010-3851453',
'112-9222319-9353013',
'112-9253281-6154603',
'112-9256394-2424211',
'112-9332493-4559455',
'112-9657179-2172202',
'112-9678749-3498610',
'112-9759633-6176243',
'112-9781593-9066635',
'112-9810517-1278652',
'113-0003132-0341873',
'113-0028353-1665852',
'113-0069557-6695427',
'113-0143708-8173050',
'113-0150231-4488247',
'113-0284157-2365065',
'113-0306237-2126600',
'113-0306445-5531427',
'113-0336425-3446616',
'113-0360599-4387408',
'113-0476253-2208259',
'113-0707510-8376218',
'113-0724310-9775456',
'113-0817420-2122653',
'113-0824373-4590665',
'113-0932589-7386642',
'113-1090076-7344249',
'113-1210523-4757848',
'113-1215558-6749044',
'113-1354821-9061001',
'113-1468151-3705827',
'113-1551012-3980224',
'113-1583985-0092220',
'113-1650493-3902662',
'113-1699985-8239418',
'113-1732051-9091463',
'113-1775395-1338610',
'113-1883875-8943428',
'113-1943365-4708264',
'113-1970683-8753809',
'113-1990009-3421835',
'113-2064241-1186667',
'113-2161687-1025029',
'113-2236947-4845804',
'113-2338460-4498663',
'113-2356637-5105842',
'113-2404437-5789033',
'113-2487343-8706622',
'113-2498652-2463458',
'113-2689364-1291443',
'113-2698813-7053045',
'113-2764076-7903420',
'113-2817418-9201841',
'113-3361645-5902600',
'113-3397715-2949858',
'113-3456049-9840242',
'113-3543735-1435441',
'113-3587651-3257819',
'113-3590481-1203409',
'113-3621805-6473809',
'113-3694623-2410615',
'113-3726602-0142622',
'113-3862377-0487403',
'113-3912546-8729861',
'113-4078292-2925018',
'113-4161296-6225068',
'113-4262733-5788213',
'113-4279021-9079433',
'113-4290494-3273823',
'113-4296733-0940258',
'113-4338130-2971406',
'113-4368652-9928245',
'113-4390436-3069012',
'113-4804368-5293841',
'113-4829562-3101843',
'113-5018938-2589845',
'113-5092611-3057018',
'113-5130324-8541853',
'113-5154129-0981008',
'113-5178335-4275451',
'113-5266112-9594607',
'113-5313966-2743442',
'113-5349561-2767404',
'113-5421112-9580215',
'113-5471462-9997847',
'113-5472194-2833051',
'113-5494019-3648239',
'113-5584694-6733034',
'113-5668783-6158664',
'113-5725538-1362626',
'113-5897843-7287403',
'113-6034309-0600228',
'113-6122838-8430613',
'113-6163795-9389069',
'113-6239900-8098628',
'113-6339698-5104269',
'113-6459169-8171458',
'113-6491119-3335428',
'113-6657433-7698609',
'113-6841646-4695423',
'113-6944067-1377030',
'113-6963073-8562633',
'113-6985421-5733802',
'113-7158770-2669844',
'113-7164482-3411408',
'113-7242137-5269812',
'113-7308689-3601037',
'113-7312394-7483435',
'113-7354384-3007420',
'113-7513117-8859462',
'113-7705461-2933830',
'113-7730421-1289008',
'113-7839219-8753830',
'113-7889209-7269819',
'113-7943703-8829856',
'113-8256569-2084200',
'113-8274450-1413816',
'113-8314377-1928204',
'113-8443199-0330629',
'113-8485966-0889846',
'113-8666173-9043412',
'113-8676595-4308211',
'113-8781157-2601051',
'113-8891019-7791445',
'113-8922221-2589832',
'113-8962382-6574640',
'113-9051312-1209054',
'113-9169401-4393069',
'113-9317342-3023425',
'113-9411061-3122644',
'113-9466435-9884256',
'113-9598075-0840231',
'113-9612036-8961854',
'113-9657793-8266607',
'113-9688563-3225046',
'113-9735629-5872257',
'113-9792513-3305849',
'113-9828424-7005803',
'113-9885524-0744221',
'113-9933236-7973049',
'114-0078726-9115432',
'114-0079792-3985073',
'114-0289979-7155431',
'114-0458996-6653006',
'114-0597232-0185810',
'114-0632114-8512215',
'114-0658980-3901830',
'114-0910053-2099421',
'114-0939232-9172226',
'114-1157729-1713818',
'114-1468350-8072229',
'114-1662563-6125844',
'114-1681994-9688266',
'114-1789586-5582659',
'114-1873287-7063425',
'114-1874624-1280241',
'114-2021885-0366668',
'114-2241404-0438610',
'114-2296410-9673052',
'114-2348479-0059429',
'114-2693396-1654636',
'114-2743666-8958632',
'114-2815166-9306600',
'114-2830170-9943422',
'114-2839489-1094630',
'114-2950845-6690600',
'114-3068981-1787411',
'114-3402618-7354639',
'114-3451223-3073827',
'114-3486129-5796257',
'114-3490240-5009818',
'114-3574090-4557860',
'114-3624359-7240220',
'114-3735107-7873053',
'114-3776245-2718619',
'114-3873077-2061856',
'114-3908975-8005820',
'114-3942884-7754613',
'114-4140304-2646611',
'114-4169035-7829053',
'114-4175208-4325829',
'114-4271319-6565852',
'114-4411709-5185811',
'114-4749128-4327415',
'114-4947806-0613846',
'114-5116321-9224241',
'114-5244709-0289843',
'114-5272476-0073853',
'114-5314774-6169015',
'114-5497135-8365832',
'114-5504977-5879440',
'114-5582356-1236266',
'114-5779192-3351461',
'114-5852193-4897817',
'114-5886732-3744216',
'114-6201523-4421815',
'114-6288807-7219412',
'114-6322409-6089868',
'114-6324683-3354611',
'114-6403642-0947455',
'114-6485549-5041063',
'114-6564206-8099467',
'114-6568440-6719453',
'114-6955669-5755456',
'114-6976521-6601039',
'114-7043497-2569838',
'114-7302063-4404208',
'114-7350641-6822630',
'114-7417835-7667463',
'114-7480887-6211409',
'114-7531984-2663432',
'114-7663509-1324220',
'114-7773176-6679416',
'114-7866480-1524218',
'114-7901920-1813812',
'114-8108929-9056225',
'114-8288934-4516224',
'114-8367372-4278661',
'114-8390277-9968253',
'114-8461884-8872206',
'114-8698610-9467421',
'114-8841458-7689864',
'114-8899301-4129858',
'114-9439848-8357018',
'114-9599444-7061027',
'114-9645031-2533827',
'114-9726643-4170604',
'114-9889214-6990648'
    ]
    function getInputData() {
          var limit =1,orders = [],ors = [];
         var oid = runtime.getCurrentScript().getParameter({ name: 'custscript_fin_oid' }); //订单号
         var fils = [];
         fils.push(  {name:'custrecord_is_generate_voucher',operator:'isnot',values:'T'});
         if(oid)
         fils.push(  {name:'custrecord_l_amazon_order_id',operator:'is',values:oid});
         fils.push(  {name:'custrecord_financetype',operator:'is',values:'orders'});
        search.create({ 
          type:'customrecord_amazon_listfinancialevents',
            filters:fils,
            columns:[
          {name:"custrecord_aio_seller_id",join:"custrecord_fin_to_amazon_account"},
          {name:"custrecord_aio_enabled_sites",join:"custrecord_fin_to_amazon_account"}//站点
        ]
        }).run().each(function(e){
          orders.push({
          rec_id:e.id,
          seller_id:e.getValue(e.columns[0]),
          enabled_sites:e.getText(e.columns[1]),
          });
         return --limit >0;
        })
        log.audit("待冲销总数",orders.length);
        return orders;
    }

    function map(context) {
      var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
      var date =  format.parse({
        value: (moment(new Date().getTime()).format(dateFormat)),
        type: format.Type.DATE
	  });
    var obj = JSON.parse(context.value);
	  var fin_id = obj.rec_id, enabled_sites = obj.enabled_sites.split(" ")[1];
      var order_id,postdate,entity,so_id,subsidiary,pr_store,currency;
      var ship_recid,shipment_date, fee_line,fil_channel,merchant_order_id;
	    try{
	      var rec_finance = record.load({type:"customrecord_amazon_listfinancialevents",id:fin_id});
        order_id = rec_finance.getValue('custrecord_l_amazon_order_id');
        pr_store = rec_finance.getValue('custrecord_fin_to_amazon_account');
        // postdate = rec_finance.getValue('custrecord_posteddate_txt') //去财务报告的发布日期
        postdate = rec_finance.getText('custrecord_posteddate'); //去财务报告的发布日期
        merchant_order_id  = rec_finance.getValue('custrecord_seller_order_id');  
        if(!order_id){
          order_id = rec_finance.getValue('custrecord_seller_order_id');
        }
          
        
        var fils = [],sku = rec_finance.getValue('custrecord_sellersku') ,qty = rec_finance.getValue('custrecord_quantityshipped');
        fils.push({ name: 'custrecord_amazon_order_id', operator: 'is', values:order_id });
        sku?fils.push( { name: 'custrecord_sku', operator: 'is', values:sku}):"";
        qty?fils.push( { name: 'custrecord_quantity_shipped', operator: 'is', values:qty}):"";
		    //搜索发货报告的发货时间在此时间或者之前的，然后按时间倒叙，取最近的一个
          // postdate = interfun.getFormatedDate("", "", endDate).date
          fils.push({ name: 'custrecord_shipment_date', operator: 'ON', values:postdate});
        
        log.debug("fils:"+postdate,JSON.stringify(fils));
        search.create({
	        type:  "customrecord_amazon_sales_report",
	        filters: fils,
	        columns:[
	          {name:'custrecord_shipment_date',sort:"DESC"},
	          {name:'custrecord_shipment_date_text'},
	        ]
	      }).run().each(function (rec) {
          ship_recid = rec.id;
          shipment_date = rec.getValue("custrecord_shipment_date_text");
        })
        log.debug("postdate："+postdate,",shipment_date:"+shipment_date);
        var flss = [],acc_search=interfun.getSearchAccount(obj.seller_id);
        log.debug("查询的店铺acc_search:",acc_search);
          //搜索销售订单获取客户
     
        var so_obj = interfun.SearchSO(order_id,merchant_order_id,acc_search);
        so_id = so_obj.so_id;
        pr_store = so_obj.acc;
        acc_text = so_obj.acc_text;
        entity = so_obj.entity;
        subsidiary = so_obj.subsidiary;
        currency = so_obj.currency;
        fil_channel = so_obj.fulfill_channel;
        orderid = so_obj.otherrefnum;

	      log.audit("fil_channel",fil_channel);
	      //TODO 判断订单状态，如果已经全额收款或者已关闭，则不再生成日记账
	      //如果该财务报告生成过凭证，先删除掉
        if(so_id ){
          search.create({
            type:'journalentry',
            filters:[
                {name:'mainline',operator:'is',values:true},
                {name:'custbody_relative_finanace_report',operator:'anyof',values:fin_id},
            ],columns:[{name:"memomain"}]
          }).run().each(function(e){
            try{
            if(e.getValue("memomain") == "01"){
                var de =  record.delete({type:'journalentry',id:e.id})
                log.debug("删除成功  ",de)
            }
            }catch(e){
                log.debug("delete error",e)
              // err.push(e.message);
            }
            return true;
          }) 
        //开始生成日记账凭证

	      var fv=[];
	      var jour = record.create({type:'journalentry',isDynamic:true});
        jour.setText({fieldId: 'trandate', text:postdate});
        jour.setValue({fieldId:'memo',value:"01"});
        jour.setValue({fieldId:'subsidiary',value:subsidiary});
        jour.setValue({fieldId:'custbody_order_locaiton',value:pr_store});
        jour.setValue({fieldId:'custbody_jour_orderid',value:order_id});
        jour.setValue({fieldId:'custbody_curr_voucher',value:"预估凭证"})	;
        jour.setValue({fieldId:'custbody_rel_salesorder',value:so_id}) ; //关联销售订单
        jour.setValue({fieldId:'currency',value: currency });
        jour.setValue({fieldId:'custbody_jour_type',value: "orders" }); //记录凭证类型 orders / refunds
	      log.debug("order_id",order_id);
	      var dr=0,cr=0,num=0;
	      
        var item_name,incomeaccount;
        // if(financetype == "orders")
          item_name="Sl-"
        // else if(financetype == "refunds") item_name="RE-"
        var FBM_amount = 0  //记录FBM的货品价格和税
	     fieldsMapping.map(function(field){
	         if(field == "LowValueGoodsTax-Principal" || field == "LowValueGoodsTax-Shipping" ){
	             //歸為Tax科目 2268
	             if(Number(rec_finance.getValue(financeMapping[field]))){
	                 jour.selectNewLine({sublistId:'line'})
	                 jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:account_Tax})   
	                //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})  
                   dr += Number(rec_finance.getValue(financeMapping[field])) 
                   //借费用，贷应收。费用为负数，放贷方会自动变成借方  
                   //如果是日本，取整
                   if(currency == JP_currency )  fee_line =  Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
                   else   fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
	                 jour.setCurrentSublistValue({ sublistId:'line',fieldId:"credit", value: fee_line }) //贷 
                   jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
	                 jour.commitLine({sublistId:'line'})
	             }  
	         }else if(Number(rec_finance.getValue(financeMapping[field]))){
	          // if(field == "Promotionitem")   incomeaccount  =Promotionitem
	          // else if(field == "PromotionShipping")   incomeaccount  =PromotionShipping
            // else 
            log.debug("enabled_sites: "+enabled_sites,martk_corr[enabled_sites])
	         search.create({
               type:'customrecord_order_account_corr',
               filters:[
                 {name:'custrecordamazon_transaction_type',operator:'is',values:finType},
                 {name:'custrecordamazon_amount_description',operator:'is',values:field},
                 {name:'custrecord_amazon_report_type',operator:'is',values:martk_corr[enabled_sites]},
                ],
	             columns:[{name:'custrecord_account_type'}]
	         }).run().each(function(iem){
	             incomeaccount = iem.getValue(iem.columns[0]);
           })
	         if(incomeaccount){
	             jour.selectNewLine({sublistId:'line'})
	             jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:incomeaccount})   
	            //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})  
               dr += Number(rec_finance.getValue(financeMapping[field])) 
               if(currency == JP_currency )  fee_line =  Number(rec_finance.getValue(financeMapping[field])).toFixed(0)
               else   fee_line = Number(rec_finance.getValue(financeMapping[field])).toFixed(2)
               jour.setCurrentSublistValue({ sublistId:'line',fieldId:"credit", value: fee_line}) //贷
               jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
	             jour.commitLine({sublistId:'line'})
	          }
	         }
	      })
	      fv.push(fin_id)
	           jour.setValue({fieldId:'custbody_relative_finanace_report',value:fv});
             log.debug("贷项总额："+dr.toFixed(2))
             if(!Number(dr)){
              log.debug("贷项总额为零，Resovle 返回",Number(dr))
              rec_finance.setValue({ fieldId: 'custrecord_is_generate_voucher', value: 'T' }) //预估计入已处理 
              rec_finance.save({ ignoreMandatoryFields: true });
              return 
            }
	           jour.selectNewLine({sublistId:'line'})
	           jour.setCurrentSublistValue({sublistId:'line',fieldId:'account',value:income_fin})  // 122 应收账款
            //  jour.setCurrentSublistValue({sublistId:'line',fieldId:'memo',value:"预 "+order_id})   
             if(currency == JP_currency )  dr = Number(dr).toFixed(0)
             else   dr = Number(dr).toFixed(2)
	           jour.setCurrentSublistValue({ sublistId:'line',fieldId:"debit", value:dr }) //借
             jour.setCurrentSublistValue({sublistId:'line',fieldId:"entity",value:entity})  //客户
             jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "custcol_document_type", value: "预估" })
	           jour.commitLine({sublistId:'line'})
	           
	          // jour.setValue({fieldId:'custbody_relative_inoice',value:rec_id}) //与发票无关
	           var jo =  jour.save({ignoreMandatoryFields:true}); 
	           log.debug("success",jo)
	           rec_finance.setValue({fieldId:'custrecord_is_generate_voucher',value:'T'}) //预估计入已处理 
             rec_finance.save({ignoreMandatoryFields:true});
             if(ship_recid)
               //发货报告 已入凭证标记
               record.submitFields({
                type: "customrecord_amazon_sales_report",
                id: ship_recid,
                values: {
                    custrecord_is_check_invoucher:true
                }
              })
            }else{
              log.debug("0000找不到销售订单",order_id)
              // rec_finance.setValue({fieldId:'custrecord_is_generate_voucher',value:'R'}) //不处理,没有对应的销售订单就不生产预估
              // rec_finance.save({ignoreMandatoryFields:true});
            }
	      }catch(e){
           log.error(" error:",e);
        } 
        log.debug("000 耗时：", new Date().getTime() - startT)
    }
    function reduce(context) {
        
    }

    function summarize(summary) {
         log.debug("处理完成")
    }


    
    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});