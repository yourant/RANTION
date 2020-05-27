var jetstarApi = {
    http: undefined,
    init: function (http) {
        this.http = http
    },
    domain: 'http://jetstar.nextsls.com/api/v4/shipment/',
    url: {
        create: this.domain + 'create',//创建运单
        getLabels: this.domain + 'get_labels',//标签获取 
        getServices: this.domain + 'get_services',//服务类型获取 
        void: this.domain + 'void',//void
        tracking: this.domain + 'tracking',//查询路由信息
        info: this.domain + 'info'//获取运单详情
    },
    Create: function (rec) {
        //生成请求参数
        var result = this.GetCreateParam(rec)
        var response = http.post({
            url: this.url.create,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json'
            },
            body: JSON.stringify(result)
        })
        log.audit('response', response.body)
        var body = JSON.parse(response.body)
        return body;
    },
    GetCreateParam: function (rec) {
        var reqParam = {}
        for (var key in createDict) {
            var dict = createDict[key]
            //发件人与收件人的取值
            if (key == "to_address" || key == "from_address") {
                var secondValue = {}
                for (var secondKey in dict) {
                    var secondInfo = dict[secondKey]
                    var key_ns = secondInfo.key_ns
                    if (key_ns) {
                        var value = rec.getValue(key_ns)
                        if (!value && secondInfo.require) {
                            return Result.error("获取参数失败，原因：" + secondInfo.help)
                        }
                        secondValue[secondKey] = value ? value : ''
                    }
                }
                reqParam[key] = secondValue
            }
            //箱子取值
            else if (key == "parcels") {
                var secondValue = {}
                for (var secondKey in dict) {
                    var secondInfo = dict[secondKey]
                    //货品详情取值
                    if (secondKey == "declarations") {
                        var thirdValue = {}
                        for (var thirdKey in secondInfo) {
                            var thirdInfo = secondInfo[thirdKey]
                            var key_ns = thirdInfo.key_ns
                            if (key_ns) {
                                var value = "TEST"
                                // var value = rec.getValue(key_ns)
                                if (!value && thirdInfo.require) {
                                    return Result.error("获取参数失败，原因：" + thirdInfo.help)
                                }
                                thirdValue[thirdKey] = value ? value : ''
                            }
                        }
                        secondValue[secondKey] = thirdValue
                    }
                    //货品基础信息查询
                    else {
                        var key_ns = dict.key_ns
                        if (key_ns) {
                            var value = "TEST"
                            // var value = rec.getValue(key_ns)
                            if (!value && dict.require) {
                                return Result.error("获取参数失败，原因：" + dict.help)
                            }
                            secondValue[secondKey] = value ? value : ''
                        }
                    }

                }
                reqParam[key] = secondValue
            }
            else {
                var key_ns = dict.key_ns
                //获取对应NS系统中的记录的值
                if (key_ns) {
                    var value = "TEST"
                    // var value = rec.getValue(key_ns)
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    reqParam[key] = value ? value : ''
                }
            }
        }
        //结束位置
        return Result.success(reqParam)
    }
}

var createDict = {
    service: { key_ns: "", help: "服务类型代码，通过get_service 可以查看。必填", require: true },
    store_id: { key_ns: "", help: "店铺名称，默认为空", require: false },
    client_reference: { key_ns: "", help: "客户订单号", require: false },
    parcel_count: { key_ns: "", help: "箱子总数。必填", require: true },
    export_scc: { key_ns: "", help: "是否单独报关，0 否，1 是", require: false },
    vat_number: { key_ns: "", help: "vat 号", require: false },
    remark: { key_ns: "", help: "备注", require: false },
    //收件人地址。必填
    to_address: {
        name: { key_ns: "", help: "收件人姓名，必填", require: false },
        company: { key_ns: "", require: false },
        tel: { key_ns: "", help: "收件人联系方式，必填", require: true },
        mobile: { key_ns: "", help: "", require: false },
        address_1: { key_ns: "", help: "收件人地址，必填", require: true },
        address_2: { key_ns: "", help: "", require: false },
        address_3: { key_ns: "", help: "", require: false },
        city: { key_ns: "", help: "收件人城市，必填", require: true },
        state: { key_ns: "", help: "", require: false },
        state_code: { key_ns: "", help: "", require: false },
        country: { key_ns: "", help: "收件人国家，必填", require: true },
        postcode: { key_ns: "", help: "收件人地址编码，必填", require: true },
        email: { key_ns: "", help: "", require: false }
    },
    //发件人地址。。选填，如果填了，下面必填项要填上
    from_address: {
        name: { key_ns: "", help: "发件人姓名，必填", require: false },
        company: { key_ns: "", require: false },
        tel: { key_ns: "", help: "发件人联系方式，必填", require: true },
        mobile: { key_ns: "", help: "", require: false },
        address_1: { key_ns: "", help: "发件人地址，必填", require: true },
        address_2: { key_ns: "", help: "", require: false },
        address_3: { key_ns: "", help: "", require: false },
        city: { key_ns: "", help: "发件人城市，必填", require: true },
        state: { key_ns: "", help: "", require: false },
        state_code: { key_ns: "", help: "", require: false },
        country: { key_ns: "", help: "发件人国家，必填", require: true },
        postcode: { key_ns: "", help: "发件人地址编码，必填", require: true },
        email: { key_ns: "", help: "", require: false }
    },
    //箱子明细 含有多个值
    parcels: {
        number: { key_ns: "", help: "箱号。按 1，2，3...顺序递增。有 FBA 箱号可以填写 FBA 箱号。必填", require: false },
        client_weight: { key_ns: "", help: "重量", require: false },
        client_length: { key_ns: "", help: "长度", require: false },
        client_width: { key_ns: "", help: "宽度", require: false },
        client_height: { key_ns: "", help: "高度", require: false },
        declarations: {
            sku: { key_ns: "", help: "", require: false },
            name_zh: { key_ns: "", help: "中文名称，必填", require: true },
            name_en: { key_ns: "", help: "英文名称，必填", require: true },
            unit_value: { key_ns: "", help: "申报单价", require: false },
            qty: { key_ns: "", help: "申报数量", require: false },
            material: { key_ns: "", help: "材质", require: false },
            usage: { key_ns: "", help: "用途", require: false },
            brand: { key_ns: "", help: "品牌名称", require: false },
            model: { key_ns: "", help: "型号", require: false },
            sale_price: { key_ns: "", help: "销售价格", require: false },
            sale_url: { key_ns: "", help: "销售链接", require: false },
            asin: { key_ns: "", help: "", require: false },
            fnsku: { key_ns: "", help: "", require: false },
            weight: { key_ns: "", help: "单个产品重量", require: false },
            size: { key_ns: "", help: "尺寸，格式：10* 10 * 10", require: false },
            photo_url: { key_ns: "", help: "图片链接", require: false },
            hscode: { key_ns: "", help: "海关编码", require: false },
            duty_rate: { key_ns: "", help: "", require: false },
            photos: { key_ns: "", help: "", require: false },
            is_battery: { key_ns: "", help: "产品是否带电，默认为 0。1 为是，0 为否", defaultValue: '0', require: false },
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
            msg: Result.successMsg
            , data: data
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