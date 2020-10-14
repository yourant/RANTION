//服务器地址
var jetstar_domain = 'http://jetstar.nextsls.com/api/v4/shipment/'
var accessToken = "5e8459643aff9771de60a3665e8459644340d4931"
//捷仕物流接口对接
var jetstarApi = {
    http: undefined,
    search: undefined,
    init: function (http, search) {
        this.http = http
        this.search = search
    },
    url: {
        create: jetstar_domain + 'create',//创建运单
        getLabels: jetstar_domain + 'get_labels',//标签获取 
        getServices: jetstar_domain + 'get_services',//服务类型获取 
        void: jetstar_domain + 'void',//void
        tracking: jetstar_domain + 'tracking',//查询路由信息
        info: jetstar_domain + 'info'//获取运单详情
    },
    Create: function (rec, type) {
        //生成请求参数
        var result = this.GetCreateParam(rec, type)
        if (result.code == 200) {
            var reqparam = result.data
            log.audit('Data', reqparam);
            //测试用例
            // var reqparam = { "validation": { "access_token": "5e8459643aff9771de60a3665e8459644340d4931" }, "shipment": { "service": "113", "store_id": "", "client_reference": "", "parcel_count": 2, "export_scc": 0, "import_scc": 0, "attrs": [], "vat_number": "", "to_address": { "name": "hugh", "company": "wahahallc", "tel": "1818181811", "mobile": "", "address_1": "2580CORPORATEPLACE", "address_2": "SUITE#F107", "address_3": "", "city": "MONTEREYPARK", "state": "CA", "state_code": "CA", "country": "US", "postcode": "91754", "email": "" }, "from_address": { "name": "hugh", "company": "wahahallc", "tel": "1818181811", "mobile": "", "address_1": "2580CORPORATEPLACE", "address_2": "SUITE#F107", "address_3": "", "city": "MONTEREYPARK", "state": "CA", "state_code": "CA", "country": "US", "postcode": "91754", "email": "" }, "parcels": [{ "number": "1", "client_weight": "2", "client_length": "3", "client_width": "4", "client_height": "5", "declarations": [{ "sku": "testsku", "name_zh": "zhongwenming", "name_en": "yingwenming", "unit_value": 11, "qty": 1, "material": "glass", "usage": "play", "brand": "brand", "model": "", "sale_price": 0, "sale_url": "", "asin": "", "fnsku": "fnsku", "weight": 0, "size": "", "photo_url": "", "hscode": 1234567890, "duty_rate": 0, "photos": "", "is_battery": 0 }] }, { "number": "2", "client_weight": "2", "client_length": "3", "client_width": "4", "client_height": "5", "declarations": [{ "sku": "testsku21", "name_zh": "zhongwenming", "name_en": "yingwenming", "unit_value": 11, "qty": 1, "material": "glass", "usage": "play", "brand": "brand", "model": "", "sale_price": 0, "sale_url": "", "asin": "", "fnsku": "fnsku", "weight": 0, "size": "", "photo_url": "", "hscode": 1234567890, "duty_rate": 0, "photos": "", "is_battery": 0 }, { "sku": "testsku22", "name_zh": "zhongwenming", "name_en": "yingwenming", "unit_value": 11, "qty": 1, "material": "glass", "usage": "play", "brand": "brand", "model": "", "sale_price": 0, "sale_url": "", "asin": "", "fnsku": "fnsku", "weight": 0, "size": "", "photo_url": "", "hscode": 1234567890, "duty_rate": 0, "photos": "", "is_battery": 0 }] }], "remark": "" } }
            var response = this.POST(jetstarApi.url.create, reqparam)
            log.audit('response', response)
            if (response.code == 200) {
                var body = JSON.parse(response.body)
                //请求成功后 会返回该运单的编号shipment_id
                if (body.status == 1) {
                    var shipment_id = body.data.shipment.shipment_id
                    log.audit('shipment_id', shipment_id)
                    return Result.success({ shipment_id: shipment_id })
                }
                //请求失败 需要进行相应的保存处理 TODO
                else {
                    log.error('errorInfo', body.info)
                    return Result.error(body.info)
                }
            } else {
                return Result.error('未知异常或系统繁忙')
            }

        } else {
            return Result.error('生成请求数据失败：' + result.msg)
        }
    },
    //取消订单
    Void: function (shipment_id, client_reference) {
        if (!shipment_id && !client_reference) {
            return Result.error('运单号与客户订单号不能同时为空')
        }
        if (!shipment_id) shipment_id = ""
        if (!client_reference) client_reference = ""
        var reqparam = {
            validation: {
                access_token: accessToken
            },
            shipment: {
                shipment_id: shipment_id,
                client_reference: client_reference
            }
        }
        var response = this.POST(jetstarApi.url.void, reqparam)
        var body = JSON.parse(response.body)
        if (body.status == 1) {
            return Result.success(body.data)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            log.error('errorInfo', body.info)
            return Result.error(body.info)
        }
    },
    //获取标签
    GetLabels: function (shipment_id, client_reference) {
        if (!shipment_id && !client_reference) {
            return Result.error('运单号与客户订单号不能同时为空')
        }
        if (!shipment_id) shipment_id = ""
        if (!client_reference) client_reference = ""
        var reqparam = {
            validation: {
                access_token: accessToken
            },
            shipment: {
                shipment_id: shipment_id,
                client_reference: client_reference
            }
        }
        var response = this.POST(jetstarApi.url.getLabels, reqparam)
        var body = JSON.parse(response.body)
        if (body.status == 1) {
            return Result.success(body.data)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            log.error('errorInfo', body.info)
            return Result.error(body.info)
        }
    },
    //服务类型获取
    GetServices: function () {
        var reqparam = {
            validation: {
                access_token: accessToken
            },
            services: {
                type: "all", //服务类型。必填。有效值：all 所有服务；b2b B2B 大货服务；b2c B2C 小包服务；ex 大货快递；
            }
        }
        var response = this.POST(jetstarApi.url.getServices, reqparam)
        var body = JSON.parse(response.body)
        if (body.status == 1) {
            return Result.success(body.data)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            log.error('errorInfo', body.info)
            return Result.error(body.info)
        }
    },
    //查询路由信息
    GetTracking: function (shipment_id, client_reference, language) {
        if (!shipment_id && !client_reference) {
            return Result.error('运单号与客户订单号不能同时为空')
        }
        if (!shipment_id) shipment_id = ""
        if (!client_reference) client_reference = ""
        if (!language) language = "zh"
        var reqparam = {
            validation: {
                access_token: accessToken
            },
            shipment: {
                shipment_id: shipment_id,
                client_reference: client_reference,
                language: language
            }
        }
        var response = this.POST(jetstarApi.url.tracking, reqparam)
        var body = JSON.parse(response.body)
        if (body.status == 1) {
            return Result.success(body.data)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            log.error('errorInfo', body.info)
            return Result.error(body.info)
        }
    },
    //获取运单信息
    GetInfo: function (shipment_id, client_reference) {
        if (!shipment_id && !client_reference) {
            return Result.error('运单号与客户订单号不能同时为空')
        }
        if (!shipment_id) shipment_id = ""
        if (!client_reference) client_reference = ""
        var reqparam = {
            validation: {
                access_token: accessToken
            },
            shipment: {
                shipment_id: shipment_id,
                client_reference: client_reference
            }
        }
        var response = this.POST(jetstarApi.url.info, reqparam)
        var body = JSON.parse(response.body)
        if (body.status == 1) {
            return Result.success(body.data)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            log.error('errorInfo', body.info)
            return Result.error(body.info)
        }
    },
    //创建运单的方法
    GetCreateParam: function (rec, type) {
        var reqParam = {}
        var JetStarDict = JetStarSmallDict
        if (type == "big") JetStarDict = JetStarBigDict
        for (var key in JetStarDict) {
            var dict = JetStarDict[key]
            //发件人与收件人的取值
            if (key == "to_address") {
                var secondValue = {}
                for (var secondKey in dict) {
                    var secondInfo = dict[secondKey]
                    var key_ns = secondInfo.key_ns
                    if (key_ns) {
                        var value = jetstarApi.getRecValue(rec, secondInfo)
                        if (!value && secondInfo.require) {
                            return Result.error("获取参数失败，原因：" + secondInfo.help)
                        }
                        secondValue[secondKey] = value ? value : ''
                    }
                }
                reqParam[key] = secondValue
            }
            else if (key == "from_address") {
                var locationKey = "custrecord_dps_ship_samll_location"
                if (type == "big") locationKey = "custrecord_dps_shipping_rec_location"
                var fromLocationId = rec.getValue(locationKey)
                if (fromLocationId) {
                    this.search.create({
                        type: 'location',
                        filters: [
                            { name: 'internalId', operator: 'is', values: fromLocationId },
                        ],
                        columns: [
                            { name: 'custrecord_aio_sender_name' },
                            { name: 'custrecord_aio_contact_information' },
                            { name: 'custrecord_aio_sender_address' },
                            { name: 'custrecord_aio_sender_city' },
                            { name: 'custrecord_aio_country_sender' },
                            { name: 'custrecord_aio_sender_address_code' }
                        ]
                    }).run().each(function (fromrec) {
                        if (fromrec.getValue(fromrec.columns[0])
                            && fromrec.getValue(fromrec.columns[1])
                            && fromrec.getValue(fromrec.columns[2])
                            && fromrec.getValue(fromrec.columns[3])
                            && fromrec.getValue(fromrec.columns[4])
                            && fromrec.getValue(fromrec.columns[5])) {
                            var secondValue = {}
                            for (var fromKey in dict) {
                                var secondInfo = dict[fromKey]
                                var key_ns = secondInfo.key_ns
                                if (key_ns) {
                                    var value = jetstarApi.getRecValue(fromrec, secondInfo)
                                    if (!value && secondInfo.require) {
                                        return Result.error("获取参数失败，原因：" + secondInfo.help)
                                    }
                                    secondValue[fromKey] = value ? value : ''
                                }
                            }
                            reqParam[key] = secondValue

                        }
                        return false;
                    });
                }
            }
            //箱子取值
            else if (key == "parcels") {
                if (type == "small") {
                    var secondValue = {}
                    var secondArray = new Array()
                    for (var secondKey in dict) {
                        var secondInfo = dict[secondKey]
                        //货品详情取值
                        if (secondKey == "declarations") {
                            var subKey = "recmachcustrecord_dps_ship_small_links"
                            var subItemKey = "custrecord_dps_ship_small_item_item"
                            var line = rec.getLineCount({ sublistId: subKey })
                            var itemIdArray = new Array()
                            for (var i = 0; i < line; i++) {
                                var itemId = rec.getSublistValue({ sublistId: subKey, fieldId: subItemKey, line: i })
                                if (itemId) itemIdArray.push(itemId)
                            }
                            if (itemIdArray.length > 0) {
                                var columns = new Array()
                                for (var thirdKey in secondInfo) {
                                    var thirdInfo = secondInfo[thirdKey]
                                    var key_ns = thirdInfo.key_ns
                                    if (key_ns)
                                        columns.push({ name: key_ns })
                                }
                                var thirdInfoArray = new Array()
                                var errorMsg = ""
                                this.search.create({
                                    type: 'item',
                                    filters: [
                                        { name: 'internalId', operator: 'anyof', values: itemIdArray },
                                    ],
                                    columns: columns
                                }).run().each(function (skurec) {
                                    var thirdValue = {}
                                    for (var thirdKey in secondInfo) {
                                        var thirdInfo = secondInfo[thirdKey]
                                        var key_ns = thirdInfo.key_ns
                                        if (key_ns) {
                                            var value = jetstarApi.getRecValue(skurec, thirdInfo)
                                            if (!value && thirdInfo.require) {
                                                errorMsg = "获取参数失败，原因：" + thirdInfo.help
                                                return false
                                            }
                                            if (thirdKey == 'weight') {
                                                value = Number(value) / 1000
                                            }
                                            thirdValue[thirdKey] = value ? value : ''
                                        }
                                    }
                                    thirdInfoArray.push(thirdValue)
                                    return true;
                                });
                                if (errorMsg) return Result.error(errorMsg)
                                secondValue[secondKey] = thirdInfoArray
                            }
                        }
                        //货品基础信息查询
                        else {
                            var key_ns = secondInfo.key_ns
                            if (key_ns) {
                                var value = jetstarApi.getRecValue(rec, secondInfo)
                                if (!value && secondInfo.require) {
                                    return Result.error("获取参数失败，原因：" + secondInfo.help)
                                }
                                secondValue[secondKey] = value ? value : ''
                            }
                        }

                    }
                    secondArray.push(secondValue)
                    reqParam[key] = secondArray
                }
                //大货的情况 取的是装箱信息
                else {
                    var secondArray = new Array()
                    var subKey = "recmachcustrecord_dps_ship_box_fa_record_link"
                    var subItemKey = "custrecord_dps_ship_box_item"
                    var line = rec.getLineCount({ sublistId: subKey })
                    for (var subLine = 0; subLine < line; subLine++) {
                        var secondValue = {}
                        for (var secondKey in dict) {
                            var secondInfo = dict[secondKey]
                            //货品详情取值
                            if (secondKey == "declarations") {
                                var itemId = rec.getSublistValue({ sublistId: subKey, fieldId: subItemKey, line: subLine })
                                if (!itemId) {
                                    return Result.error("获取参数失败，原因：第" + (subLine + 1) + "行货品未填写")
                                }
                                var columns = new Array()
                                for (var thirdKey in secondInfo) {
                                    var thirdInfo = secondInfo[thirdKey]
                                    var key_ns = thirdInfo.key_ns
                                    if (key_ns)
                                        columns.push({ name: key_ns })
                                }
                                var thirdInfoArray = new Array()
                                var errorMsg = ""
                                this.search.create({
                                    type: 'item',
                                    filters: [
                                        { name: 'internalId', operator: 'is', values: itemId },
                                    ],
                                    columns: columns
                                }).run().each(function (skurec) {
                                    var thirdValue = {}
                                    for (var thirdKey in secondInfo) {
                                        var thirdInfo = secondInfo[thirdKey]
                                        var key_ns = thirdInfo.key_ns
                                        if (key_ns) {
                                            var value = jetstarApi.getRecValue(skurec, thirdInfo)
                                            if (!value && thirdInfo.require) {
                                                errorMsg = "获取参数失败，原因：" + thirdInfo.help
                                                return false
                                            }
                                            if (thirdKey == 'weight') {
                                                value = Number(value) / 1000
                                            }
                                            thirdValue[thirdKey] = value ? value : ''
                                        }
                                    }
                                    thirdInfoArray.push(thirdValue)
                                    return true;
                                });
                                if (errorMsg) return Result.error(errorMsg)
                                secondValue[secondKey] = thirdInfoArray
                            }
                            //货品基础信息查询
                            else {
                                var key_ns = secondInfo.key_ns
                                if (key_ns) {
                                    var value = rec.getSublistValue({ sublistId: subKey, fieldId: key_ns, line: subLine })
                                    if (!value && secondInfo.require) {
                                        return Result.error("获取参数失败，原因：" + secondInfo.help)
                                    }
                                    secondValue[secondKey] = value ? value : ''
                                }
                            }

                        }
                        secondArray.push(secondValue)
                    }
                    reqParam[key] = secondArray
                }

            }
            else {
                var key_ns = dict.key_ns
                //获取对应NS系统中的记录的值
                if (key_ns) {
                    var value = jetstarApi.getRecValue(rec, dict)
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    reqParam[key] = value ? value : ''
                }
            }
        }
        var result = {
            validation: {
                access_token: accessToken
            },
            shipment: reqParam
        }
        //结束位置
        return Result.success(result)
    },
    getRecValue: function (rec, dict) {
        var key_ns = dict.key_ns
        var getType = dict.getType
        var value = ""
        //获取对应NS系统中的记录的值
        if (key_ns) {
            if (getType == 'text') {
                value = rec.getText(key_ns)
            } else {
                value = rec.getValue(key_ns)
            }
            if (value && dict.parseType) {
                this.search.create({
                    type: dict.parseType,
                    filters: [
                        { name: 'internalId', operator: 'is', values: value },
                    ],
                    columns: [
                        { name: dict.parseId }
                    ]
                }).run().each(function (parseRec) {
                    value = parseRec.getValue(dict.parseId)
                    return true;
                });
            }
            if (value && dict.format) {
                value = dict.format[value]
            }
        }
        return value
    },
    POST: function (url, reqParam) {
        return this.http.post({
            url: url,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            },
            body: JSON.stringify(reqParam)
        })
    }
}


var JetStarSmallDict = {
    service: { key_ns: "custrecord_dps_ship_small_channelservice", help: "服务类型代码，通过get_service 可以查看。必填", getType: "value", require: true, parseType: "customrecord_logistics_service", parseId: "custrecord_ls_service_code" },
    store_id: { key_ns: "", help: "店铺名称，默认为空", require: false, getType: "text" },//custrecord_dps_ship_small_account 先不传
    client_reference: { key_ns: "custrecord_dps_ship_order_number", help: "客户订单号", require: false, getType: "value" },
    parcel_count: { key_ns: "custrecord_dps_ship_small_total_number", help: "箱子总数。必填", require: true, getType: "value" },
    export_scc: { key_ns: "custrecord_dps_separate", help: "是否单独报关，0 否，1 是", require: false, getType: "text", format: { "是": "1", "否": "0" } },
    vat_number: { key_ns: "", help: "vat 号", require: false, getType: "value" },
    remark: { key_ns: "", help: "备注", require: false, getType: "value" },
    //收件人地址。必填
    to_address: {
        name: { key_ns: "custrecord_dps_ship_small_recipient", help: "收件人姓名，必填", require: false, getType: "value" },
        company: { key_ns: "", require: false, getType: "value" },
        tel: { key_ns: "custrecord_dps_ship_small_phone", help: "收件人联系方式，必填", require: true, getType: "value" },
        mobile: { key_ns: "", help: "", require: false, getType: "value" },
        address_1: { key_ns: "custrecord_dps_street1", help: "收件人地址，必填", require: true, getType: "value" },
        address_2: { key_ns: "", help: "", require: false, getType: "value" },
        address_3: { key_ns: "", help: "", require: false, getType: "value" },
        city: { key_ns: "custrecord_dps_recipient_city", help: "收件人城市，必填", require: true, getType: "text" },
        state: { key_ns: "", help: "", require: false, getType: "value" },
        state_code: { key_ns: "", help: "", require: false, getType: "value" },
        country: { key_ns: "custrecord_dps_recipient_country", help: "收件人国家，必填", require: true, getType: "value", parseType: "customrecord_country_code", parseId: "custrecord_cc_country_code" },
        postcode: { key_ns: "custrecord_dps_recipien_code", help: "收件人地址编码，必填", require: true, getType: "value" },
        email: { key_ns: "", help: "", require: false }
    },
    //发件人地址。。选填，如果填了，下面必填项要填上
    from_address: {
        name: { key_ns: "custrecord_aio_sender_name", help: "发件人姓名，必填", require: false, getType: "value" },
        company: { key_ns: "", require: false, getType: "value" },
        tel: { key_ns: "custrecord_aio_contact_information", help: "发件人联系方式，必填", require: true, getType: "value" },
        mobile: { key_ns: "", help: "", require: false, getType: "value" },
        address_1: { key_ns: "custrecord_aio_sender_address", help: "发件人地址，必填", require: true, getType: "value" },
        address_2: { key_ns: "", help: "", require: false, getType: "value" },
        address_3: { key_ns: "", help: "", require: false, getType: "value" },
        city: { key_ns: "custrecord_aio_sender_city", help: "发件人城市，必填", require: true, getType: "text" },
        state: { key_ns: "", help: "", require: false, getType: "value" },
        state_code: { key_ns: "", help: "", require: false, getType: "value" },
        country: { key_ns: "custrecord_aio_country_sender", help: "发件人国家，必填", require: true, getType: "value", parseType: "customrecord_country_code", parseId: "custrecord_cc_country_code" },
        postcode: { key_ns: "custrecord_aio_sender_address_code", help: "发件人地址编码，必填", require: true, getType: "value" },
        email: { key_ns: "", help: "", require: false }
    },
    //箱子明细 含有多个值
    parcels: {
        number: { key_ns: "custrecord_dps_carton_no", help: "箱号。按 1，2，3...顺序递增。有 FBA 箱号可以填写 FBA 箱号。必填", require: false, getType: "value" },
        client_weight: { key_ns: "custrecord_dps_ship_small_ship_weight", help: "重量", require: false, getType: "value" },
        client_length: { key_ns: "custrecord_dps_length", help: "长度", require: false, getType: "value" },
        client_width: { key_ns: "custrecord_dps_width", help: "宽度", require: false, getType: "value" },
        client_height: { key_ns: "custrecord_dps_highly", help: "高度", require: false, getType: "value" },
        declarations: {
            sku: { key_ns: "itemid", help: "", require: false, getType: "value" },
            name_zh: { key_ns: "custitem_dps_skuchiense", help: "中文名称，必填", require: true, getType: "value" },
            name_en: { key_ns: "custitem_dps_skuenglish", help: "英文名称，必填", require: true, getType: "value" },
            unit_value: { key_ns: "cost", help: "申报单价", require: true, getType: "value" },
            qty: { key_ns: "", help: "申报数量", require: false, getType: "value" },
            material: { key_ns: "custitem_dps_nature", help: "材质", require: false, getType: "value" },
            usage: { key_ns: "custitem_dps_use", help: "用途", require: false, getType: "value" },
            brand: { key_ns: "custitem_dps_brand", help: "品牌名称", require: false, getType: "value" },
            model: { key_ns: "", help: "型号", require: false, getType: "value" },
            sale_price: { key_ns: "", help: "销售价格", require: false, getType: "value" },
            sale_url: { key_ns: "", help: "销售链接", require: false, getType: "value" },
            asin: { key_ns: "", help: "", require: false, getType: "value" },
            fnsku: { key_ns: "", help: "", require: false, getType: "value" },
            weight: { key_ns: "custitem_dps_heavy2", help: "单个产品重量", require: false, getType: "value" },
            size: { key_ns: "", help: "尺寸，格式：10* 10 * 10", require: false, getType: "value" },
            photo_url: { key_ns: "custitem_dps_picture", help: "图片链接", require: false, getType: "value" },
            hscode: { key_ns: "custitem_dps_hscode1", help: "海关编码", require: false, getType: "value" },//临时用
            duty_rate: { key_ns: "", help: "", require: false, getType: "value" },
            photos: { key_ns: "", help: "", require: false, getType: "value" },
            is_battery: { key_ns: "", help: "产品是否带电，默认为 0。1 为是，0 为否", format: { "是": "1", "否": "0" }, defaultValue: '0', require: false, getType: "value" },
        }
    }
}

var JetStarBigDict = {
    service: { key_ns: "custrecord_dps_shipping_r_channelservice", help: "服务类型代码，通过get_service 可以查看。必填", getType: "value", require: true, parseType: "customrecord_logistics_service", parseId: "custrecord_ls_service_code" },
    store_id: { key_ns: "", help: "店铺名称，默认为空", require: false, getType: "text" },//custrecord_dps_ship_small_account 先不传
    client_reference: { key_ns: "custrecord_dps_ship_platform_order_dh", help: "客户订单号", require: false, getType: "value" },
    parcel_count: { key_ns: "custrecord_dps_total_number", help: "箱子总数。必填", require: true, getType: "value" },
    export_scc: { key_ns: "", help: "是否单独报关，0 否，1 是", require: false, getType: "text", format: { "是": "1", "否": "0" } },
    vat_number: { key_ns: "", help: "vat 号", require: false, getType: "value" },
    remark: { key_ns: "", help: "备注", require: false, getType: "value" },
    //收件人地址。必填
    to_address: {
        name: { key_ns: "custrecord_dps_ship_small_recipient_dh", help: "收件人姓名，必填", require: false, getType: "value" },
        company: { key_ns: "", require: false, getType: "value" },
        tel: { key_ns: "custrecord_dps_contact_phone", help: "收件人联系方式，必填", require: true, getType: "value" },
        mobile: { key_ns: "", help: "", require: false, getType: "value" },
        address_1: { key_ns: "custrecord_dps_street1_dh", help: "收件人地址，必填", require: true, getType: "value" },
        address_2: { key_ns: "", help: "", require: false, getType: "value" },
        address_3: { key_ns: "", help: "", require: false, getType: "value" },
        city: { key_ns: "custrecord_dps_recipient_city_dh", help: "收件人城市，必填", require: true, getType: "text" },
        state: { key_ns: "", help: "", require: false, getType: "value" },
        state_code: { key_ns: "", help: "", require: false, getType: "value" },
        country: { key_ns: "custrecord_dps_recipient_country_dh", help: "收件人国家，必填", require: true, getType: "value", parseType: "customrecord_country_code", parseId: "custrecord_cc_country_code" },
        postcode: { key_ns: "custrecord_dps_recipien_code_dh", help: "收件人地址编码，必填", require: true, getType: "value" },
        email: { key_ns: "", help: "", require: false }
    },
    //发件人地址。。选填，如果填了，下面必填项要填上
    from_address: {
        name: { key_ns: "custrecord_aio_sender_name", help: "发件人姓名，必填", require: false, getType: "value" },
        company: { key_ns: "", require: false, getType: "value" },
        tel: { key_ns: "custrecord_aio_contact_information", help: "发件人联系方式，必填", require: true, getType: "value" },
        mobile: { key_ns: "", help: "", require: false, getType: "value" },
        address_1: { key_ns: "custrecord_aio_sender_address", help: "发件人地址，必填", require: true, getType: "value" },
        address_2: { key_ns: "", help: "", require: false, getType: "value" },
        address_3: { key_ns: "", help: "", require: false, getType: "value" },
        city: { key_ns: "custrecord_aio_sender_city", help: "发件人城市，必填", require: true, getType: "text" },
        state: { key_ns: "", help: "", require: false, getType: "value" },
        state_code: { key_ns: "", help: "", require: false, getType: "value" },
        country: { key_ns: "custrecord_aio_country_sender", help: "发件人国家，必填", require: true, getType: "value", parseType: "customrecord_country_code", parseId: "custrecord_cc_country_code" },
        postcode: { key_ns: "custrecord_aio_sender_address_code", help: "发件人地址编码，必填", require: true, getType: "value" },
        email: { key_ns: "", help: "", require: false }
    },
    //箱子明细 含有多个值
    parcels: {
        number: { key_ns: "custrecord_dps_ship_box_box_number", help: "箱号。按 1，2，3...顺序递增。有 FBA 箱号可以填写 FBA 箱号。必填", require: true, getType: "value" },
        client_weight: { key_ns: "custrecord_dps_ship_box_weight", help: "重量", require: false, getType: "value" },
        client_length: { key_ns: "custrecord_dps_ful_rec_box_length", help: "长度", require: false, getType: "value" },
        client_width: { key_ns: "custrecord_dps_ful_rec_big_box_width", help: "宽度", require: false, getType: "value" },
        client_height: { key_ns: "custrecord_dps_ful_rec_big_box_hight", help: "高度", require: false, getType: "value" },
        declarations: {
            sku: { key_ns: "itemid", help: "", require: false, getType: "value" },
            name_zh: { key_ns: "custitem_dps_skuchiense", help: "中文名称，必填", require: true, getType: "value" },
            name_en: { key_ns: "custitem_dps_skuenglish", help: "英文名称，必填", require: true, getType: "value" },
            unit_value: { key_ns: "cost", help: "申报单价", require: true, getType: "value" },
            qty: { key_ns: "", help: "申报数量", require: false, getType: "value" },
            material: { key_ns: "custitem_dps_nature", help: "材质", require: false, getType: "value" },
            usage: { key_ns: "custitem_dps_use", help: "用途", require: false, getType: "value" },
            brand: { key_ns: "custitem_dps_brand", help: "品牌名称", require: false, getType: "value" },
            model: { key_ns: "", help: "型号", require: false, getType: "value" },
            sale_price: { key_ns: "", help: "销售价格", require: false, getType: "value" },
            sale_url: { key_ns: "", help: "销售链接", require: false, getType: "value" },
            asin: { key_ns: "", help: "", require: false, getType: "value" },
            fnsku: { key_ns: "", help: "", require: false, getType: "value" },
            weight: { key_ns: "custitem_dps_heavy2", help: "单个产品重量", require: false, getType: "value" },
            size: { key_ns: "", help: "尺寸，格式：10* 10 * 10", require: false, getType: "value" },
            photo_url: { key_ns: "custitem_dps_picture", help: "图片链接", require: false, getType: "value" },
            hscode: { key_ns: "custitem_dps_hscode1", help: "海关编码", require: false, getType: "value" },//临时用
            duty_rate: { key_ns: "", help: "", require: false, getType: "value" },
            photos: { key_ns: "", help: "", require: false, getType: "value" },
            is_battery: { key_ns: "", help: "产品是否带电，默认为 0。1 为是，0 为否", format: { "是": "1", "否": "0" }, defaultValue: '0', require: false, getType: "value" },
        }
    }
}

//接口范围参数
var Result = {

    successCode: 200,

    successMsg: '请求成功',

    errorCode: 500,

    errorMsg: '请求失败',

    success: function (data) {
        if (!data) data = ""
        return {
            code: Result.successCode,
            msg: Result.successMsg,
            data: data
        }
    },

    error: function (msg) {
        var errorMsg = Result.errorMsg
        if (msg) {
            errorMsg = msg
        }
        return {
            code: Result.errorCode,
            msg: errorMsg
        }
    }
}