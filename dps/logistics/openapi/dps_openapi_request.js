var openapi_domain = 'http://openapi.ck1info.com'
var clientId = "ZTBlNjFhYWEtMWIxMi00OTc5LWJlMjctMzY4NmQwMGE4NWEx"
//出口易物流接口对接
var openApi = {
    http: undefined,
    search: undefined,
    record: undefined,
    accessToken: undefined,
    init: function (http, search, record) {
        this.http = http
        this.search = search
        this.record = record
        this.GetAccessToken()
    },
    url: {
        auth: openapi_domain + '/oauth2/token',//授权信息
        create: openapi_domain + '/v1/directExpressOrders',//创建直发订单
        list: openapi_domain + '/v1/directExpressOrders',//获取订单列表
        label: openapi_domain + '/v1/directExpressOrders/label',//获取订单包裹标签
        cancel: openapi_domain + '/v1/directExpressOrders/{packageId}/cancel?idType={idType}',//取消订单
        info: openapi_domain + '/v1/directExpressOrders/{packageId}/status',//获取订单明细
        createsku: openapi_domain + '/v1/merchantSkus',//创建SKU
        getsku: openapi_domain + '/v1/merchantSkus/label',//获取SKU标签
        inbundorder: openapi_domain + '/v1.1/inboundOrders',//创建入库单
        trackings: openapi_domain + '/v1/trackings/{trackingNumber}',//创建入库单
        inventories: openapi_domain + '/v1/inventories?Skus={Skus}&WarehouseId={WarehouseId}',//创建入库单
        warehouses: openapi_domain + '/v1/warehouses',//查询海外仓库列表
    },
    //获取授权AccessToken
    GetAccessToken: function () {
        var access = undefined
        var check = true
        var reqparam = {}
        var id = undefined
        this.search.create({
            type: 'customrecord_dps_openapi_record',
            filters: [
                { name: 'custrecord_dps_openapi_clientid', operator: 'is', values: clientId },
            ],
            columns: [
                { name: 'custrecord_dps_openapi_refreshtoken' },
                { name: 'custrecord_dps_openapi_clientsecret' },
                { name: 'custrecord_dps_openapi_redirecturi' },
                { name: 'custrecord_dps_openapi_accesstoken' },
                { name: 'custrecord_dps_openapi_accessexpiretime' },
            ]
        }).run().each(function (rec) {
            var accessToken = rec.getValue(rec.columns[3])
            var expireTime = rec.getValue(rec.columns[4])
            //判断accessToken是否存在
            if (!accessToken) check = false
            id = rec.id
            if (check) {
                //判断expireTime 过期时间是否存在
                if (!expireTime) {
                    check = false
                } else {
                    //判断expireTime 过期时间相比当前时间是否小于一天
                    var now = new Date()
                    if ((now.getTime() / 1000) > (expireTime - 60 * 60 * 24)) {
                        check = false
                    }
                }
            }
            //AccessToken快过期或者不存在，需要重新请求
            if (!check) {
                reqparam =
                    "?client_id=" + clientId +
                    "&client_secret=" + rec.getValue(rec.columns[1]) +
                    "&redirect_uri=" + rec.getValue(rec.columns[2]) +
                    "&grant_type=refresh_token" +
                    "&refresh_token=" + rec.getValue(rec.columns[0])
            } else {
                access = accessToken
            }
            return false;
        });

        //判断accessToken不存在或者快过期时，重新发起请求获取AccessToken
        if (!check) {
            var response = this.POST(openApi.url.auth + reqparam, {})
            var body = JSON.parse(response.body)
            // log.audit('body', body);
            if (body && id) {
                var now = new Date()
                var newExpireTime = now.getTime() / 1000 + body.AccessTokenExpiresIn * 60
                //更新AccessToken与过期时间
                this.record.submitFields({
                    type: 'customrecord_dps_openapi_record',
                    id: id,
                    values: {
                        custrecord_dps_openapi_accesstoken: body.AccessToken,
                        custrecord_dps_openapi_accessexpiretime: parseInt(newExpireTime)
                    }
                });
                this.accessToken = body.AccessToken
            }
        } else {
            this.accessToken = access
        }
        // log.audit('access', this.accessToken);
    },
    //创建直发订单 如果packageId存在则视为【修改】操作
    CreateOrders: function (rec) {
        //生成请求参数
        var result = this.GetCreateParam(rec)
        log.audit('result', result);
        if (result.code == 200) {
            var reqparam = result.data
            log.audit('token', this.accessToken);
            var response = this.POST(openApi.url.create, reqparam, this.accessToken)
            log.audit('response', response)
            //请求成功
            if (response.code == 201) {
                return Result.success({})
            }
            //请求失败 需要进行相应的保存处理 TODO
            else {
                var errorMsg = this.OpenApiCode[response.code]
                if (!errorMsg) {
                    var body = JSON.parse(response.body)
                    errorMsg = body.Errors[0].Message
                }
                if (!errorMsg) errorMsg = "未知错误"
                log.error('errorInfo', errorMsg)
                return Result.error(errorMsg)
            }
        }
        return result;
    },
    // 获取订单列表信息
    // FromDate	string	时间格式: 2015-11-04T15:00:00Z	必须	开始时间	2015-11-04T15:00:00Z
    // ToDate	string	时间格式: 2015-11-04T15:00:00Z	必须	结束时间,时间跨度不能大于60天	2015-11-05T15:00:00Z
    // PageSize	integer	范围: 1 ~ 200		页面大小	10
    // PageIndex	integer	范围: 1 ~ 200		页码	1
    // TypeOfSearchDate	TypeOfDate	None.		搜索的时间类型,默认是创建时间	CreateDate:创建时间 ShippedDate:发运时间
    // HandleStatus	DirectExpressOrderStatus	None.		订单处理状态	Shipped  
    // Initial	初始状态
    // Submitted	已提审
    // Examined	已审核
    // Shipped	已发
    // WaitingForWeightConfirm	核重待确认
    // WeightConfirm	核重已确认
    // Return	退货
    // Cancel	取消
    GetList: function (FromDate, ToDate, PageSize, PageIndex, TypeOfSearchDate, HandleStatus) {
        if (!FromDate || !ToDate) {
            return Result.error("创建时间与结束时间不能为空")
        }
        var reqparam = "?FromDate=" + FromDate + "&ToDate=" + ToDate
        if (PageSize && PageIndex) reqparam += "&PageSize=" + PageSize + "&PageIndex=" + PageIndex
        if (TypeOfSearchDate) reqparam += "&TypeOfSearchDate=" + TypeOfSearchDate
        if (HandleStatus) reqparam += "&HandleStatus=" + HandleStatus
        var response = this.GET(openApi.url.list + reqparam, this.accessToken)
        log.audit('response', response);
        //请求成功
        if (response.code == 200) {
            return Result.success(JSON.parse(response.body))
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (response.body) {
                var body = JSON.parse(response.body)
                errorMsg += ":" + body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    /**
     * 获取直发包裹标签接口
     * 
     * @param {*} PackageIds 直发包裹Id列表  多个id用逗号‘,’隔开  必须
     * @param {*} PrintFormat 打印格式  ClassicA4--经典A4纸    ClassicLabel--经典标签纸 必须
     * @param {*} PrintContent 必须
     *            打印内容
     *            1.Address--只打印地址
     *            2.AddressCostoms--同一张打印地址与报关单
     *            3.AddressCostomsSplit--分开打印地址与报关单
     *            4.AddressRemark--打印地址与配货清单（只支持ClassicLabel），包裹的remark有多个以|分隔的值才会打印配货清单
     *            5.AddressCustomsRemarkSplit--打印地址、报关单与配货清单（只支持ClassicLabel），包裹的remark有多个以|分隔的值才会打印配货清单打印内容
     * @param {*} CustomPrintOptions 
     *            Custom区域的内容选项  多个用逗号','隔开
     *            1.RefNo--指定包含包裹号(RefNo)
     *            2.Sku--指定包含Sku信息
     *            3.CustomsTitleEn--指定包含英文品名信息
     *            4.CustomsTitleCn--指定包含中文品名信息
     *            5.Custom--指定包含自定义信息(Custom)
     * @param {*} IdType 直发包裹Id的参数类型 PackageId--客户自定义订单号  Ck1PackageId--出口易处理号
     */
    GetLabels: function (PackageIds, PrintFormat, PrintContent, CustomPrintOptions, IdType) {
        if (!PackageIds || !PrintFormat || !PrintContent) {
            return Result.error("缺少请求参数")
        }
        var reqparam = {
            PackageIds: PackageIds.split(','),
            PrintFormat: PrintFormat,
            PrintContent: PrintContent
        }
        if (CustomPrintOptions) reqparam.CustomPrintOptions = CustomPrintOptions.split(',')
        if (IdType) reqparam.IdType = IdType
        log.audit('reqparam', reqparam);
        var response = this.POST(openApi.url.label, reqparam, this.accessToken)
        log.audit('response', response);
        //请求成功
        if (response.code == 200) {
            return Result.success(JSON.parse(response.body))
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (response.body) {
                var body = JSON.parse(response.body)
                errorMsg += ":" + body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    //获取订单明细
    GetInfo: function (packageId) {
        if (!packageId) {
            return Result.error("缺少请求参数")
        }
        var url = openApi.url.info
        url = url.replace("{packageId}", packageId)
        var response = this.GET(url, this.accessToken)
        //请求成功
        if (response.code == 200) {
            return Result.success(JSON.parse(response.body))
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (response.body) {
                var body = JSON.parse(response.body)
                errorMsg += ":" + body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    /**
     * 取消订单
     * 
     * @param {*} packageId 直发包裹Id 必须
     * @param {*} idType 直发包裹Id的参数类型 PackageId--客户自定义订单号  Ck1PackageId--出口易处理号
     */
    Cancel: function (packageId, idType) {
        if (!packageId || !idType) {
            return Result.error("缺少请求参数")
        }
        var url = openApi.url.cancel
        url = url.replace("{packageId}", packageId)
        url = url.replace("{idType}", idType)
        var response = this.GET(url, this.accessToken)
        //请求成功
        if (response.code == 200) {
            return Result.success({})
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (response.body) {
                var body = JSON.parse(response.body)
                errorMsg += ":" + body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    //创建SKU
    CreateSKU: function (rec) {
        var reqParam = {}
        for (var key in OpenApiSkuDict) {
            var dict = OpenApiSkuDict[key]
            var key_ns = dict.key_ns
            //获取对应NS系统中的记录的值
            if (key_ns) {
                // var value = dict.example
                var value = rec.getValue(key_ns)
                if (!value && dict.require) {
                    return Result.error("获取参数失败，原因：" + dict.help)
                }
                reqParam[key] = value ? value : ''
            }
        }
        if (reqparam) {
            var response = this.POST(openApi.url.createsku, reqparam, this.accessToken)
            log.audit('response', response)
            //请求成功
            if (response.code == 201) {
                return Result.success({})
            }
            //请求失败 需要进行相应的保存处理 TODO
            else {
                var errorMsg = this.OpenApiCode[response.code]
                if (!errorMsg) {
                    var body = JSON.parse(response.body)
                    errorMsg = body.Errors[0].Message
                }
                if (!errorMsg) errorMsg = "未知错误"
                log.error('errorInfo', errorMsg)
                return Result.error(errorMsg)
            }
        }
    },
    //获取SKU标签
    /**
     * 
     * @param {*} option 
     *            WarehouseId	仓库代号 必须
     *            Sku	sku名称 必须
     *            Quantity	数量 必须
     *            PrintFormat	打印格式 必须
     *            IsMade	是否带产地
     */
    GetSKULabel: function (option) {
        if (!option) return Result.error("请传入参数")
        var reqparam = "?"
        for (var key in option) {
            reqparam += key + "=" + option[key] + "&"
        }
        reqParam = reqParam.substring(0, reqParam.length - 1)
        if (reqparam) {
            var response = this.GET(openApi.url.getsku + reqParam, this.accessToken)
            //请求成功
            if (response.code == 200) {
                return Result.success(response.body)
            }
            //请求失败 需要进行相应的保存处理 TODO
            else {
                var errorMsg = this.OpenApiCode[response.code]
                if (!errorMsg) {
                    var body = JSON.parse(response.body)
                    errorMsg = body.Errors[0].Message
                }
                if (!errorMsg) errorMsg = "未知错误"
                log.error('errorInfo', errorMsg)
                return Result.error(errorMsg)
            }
        }
    },
    //创建入库单
    CreateInbund: function (rec) {
        var reqParam = {}
        for (var key in OpenApiInboundDict) {
            var dict = OpenApiInboundDict[key]
            var key_ns = dict.key_ns
            if (key == 'Skus') {
                var skusArray = new Array()
                //后期这里要加入循环 ----开始
                var skusParam = {}
                for (skusKey in dict) {
                    var skusInfo = dict[skusKey]
                    var key_ns = skusInfo.key_ns
                    //获取对应NS系统中的记录的值
                    if (key_ns) {
                        // var value = skusInfo.example
                        var value = rec.getValue(key_ns)
                        if (!value && skusInfo.require) {
                            return Result.error("获取参数失败，原因：" + dict.help)
                        }
                        skusParam[skusKey] = value ? value : ''
                    }
                }
                skusArray.push(skusParam)
                //后期这里要加入循环 ----结束
                reqParam[key] = skusArray
            } else {
                //获取对应NS系统中的记录的值
                if (key_ns) {
                    // var value = dict.example
                    var value = rec.getValue(key_ns)
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    reqParam[key] = value ? value : ''
                }
            }

        }
        if (reqparam) {
            var response = this.POST(openApi.url.inbundorder, reqparam, this.accessToken)
            log.audit('response', response)
            //请求成功
            if (response.code == 201) {
                return Result.success({})
            }
            //请求失败 需要进行相应的保存处理 TODO
            else {
                var errorMsg = this.OpenApiCode[response.code]
                if (!errorMsg) {
                    var body = JSON.parse(response.body)
                    errorMsg = body.Errors[0].Message
                }
                if (!errorMsg) errorMsg = "未知错误"
                log.error('errorInfo', errorMsg)
                return Result.error(errorMsg)
            }
        }
    },
    /**
     * 查询Sku在某个仓库的库存情况 
     * 
     * @param {*} Skus 商家SKU,sku间用英文逗号隔开，最多30个  bag-y001,bag-y002
     * @param {*} WarehouseId 仓库Id  US
     */
    GetInventories: function (Skus, WarehouseId) {
        if (!Skus || !WarehouseId) return Result.error("请求参数不全")
        var url = url.replace("{Skus}", Skus)
        var url = url.replace("{WarehouseId}", WarehouseId)
        var response = this.GET(url, this.accessToken)
        if (response.code == 200) {
            return Result.success(response.body)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (!errorMsg) {
                var body = JSON.parse(response.body)
                errorMsg = body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    /**
     * 获取包裹轨迹
     * 
     * @param {*} trackingNumber 跟踪号或处理号
     * @param {*} lang 默认是中文轨迹"zh"，英文轨迹"en"
     */
    GetTrackings: function (trackingNumber, lang) {
        if (!trackingNumber) return Result.error("参数不全")
        var url = openApi.url.trackings
        url = url.replace("{trackingNumber}", trackingNumber)
        if (lang) url += "?lang=" + lang
        var response = this.GET(url, this.accessToken)
        if (response.code == 200) {
            return Result.success(response.body)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (!errorMsg) {
                var body = JSON.parse(response.body)
                errorMsg = body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    /**
     * 查询海外仓库列表
     */
    GetWarehouses: function () {
        var response = this.GET(openApi.url.warehouses, this.accessToken)
        if (response.code == 200) {
            return Result.success(response.body)
        }
        //请求失败 需要进行相应的保存处理 TODO
        else {
            var errorMsg = this.OpenApiCode[response.code]
            if (!errorMsg) {
                var body = JSON.parse(response.body)
                errorMsg = body.Errors[0].Message
            }
            if (!errorMsg) errorMsg = "未知错误"
            log.error('errorInfo', errorMsg)
            return Result.error(errorMsg)
        }
    },
    //创建运单的方法
    GetCreateParam: function (rec) {
        var reqParam = { Location: "GZ" }
        for (var key in OpenApiDict) {
            var dict = OpenApiDict[key]
            //发件人与收件人的取值
            if (key == "Package") {
                var packageParam = {}
                for (var packageKey in dict) {
                    var packageInfo = dict[packageKey]
                    //遍历收货地址
                    if (packageKey == "ShipToAddress") {
                        var shipParam = {}
                        for (shipKey in packageInfo) {
                            var shipInfo = packageInfo[shipKey]
                            var key_ns = shipInfo.key_ns
                            //获取对应NS系统中的记录的值
                            if (key_ns) {
                                // var value = shipInfo.example
                                var value = openApi.getRecValue(rec, shipInfo)
                                if (!value && shipInfo.require) {
                                    return Result.error("获取参数失败，原因：" + shipInfo.help)
                                }
                                shipParam[shipKey] = value ? value : ''
                            }
                        }
                        packageParam[packageKey] = shipParam
                    }
                    //SKU列表数据获取 目前还是样例  后期需要循环遍历SKU列表 再循环输出
                    else if (packageKey == "Skus") {
                        var skusArray = new Array()
                        //后期这里要加入循环 ----开始
                        var subKey = "recmachcustrecord_dps_ship_small_links"
                        var line = rec.getLineCount({ sublistId: subKey })
                        var itemIdArray = new Array()
                        var itemNum = {}
                        for (var i = 0; i < line; i++) {
                            var itemId = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_ship_small_item_item', line: i })
                            if (itemId) {
                                itemIdArray.push(itemId)
                                //数量获取
                                itemNum[itemId] = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_ship_small_item_quantity', line: i })
                            }
                        }
                        if (itemIdArray.length > 0) {
                            var columns = new Array()
                            for (var thirdKey in packageInfo) {
                                var thirdInfo = packageInfo[thirdKey]
                                var key_ns = thirdInfo.key_ns
                                if (key_ns && thirdInfo.itemType == 'item')
                                    columns.push({ name: key_ns })
                            }
                            log.audit('columns', columns);
                            var errorMsg = ""
                            this.search.create({
                                type: 'item',
                                filters: [
                                    { name: 'internalId', operator: 'anyof', values: itemIdArray },
                                ],
                                columns: columns
                            }).run().each(function (skurec) {
                                var thirdValue = {}
                                for (var thirdKey in packageInfo) {
                                    var thirdInfo = packageInfo[thirdKey]
                                    var key_ns = thirdInfo.key_ns
                                    if (key_ns) {
                                        var value = ""
                                        if (thirdKey == "DeclareValue") {
                                            value = openApi.getRecValue(rec, thirdInfo)
                                        } else if (thirdKey == "Quantity") {
                                            value = itemNum[skurec.id]
                                        } else {
                                            value = openApi.getRecValue(skurec, thirdInfo)
                                        }
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
                                skusArray.push(thirdValue)
                                return true;
                            });
                            if (errorMsg) return Result.error(errorMsg)
                        }
                        //后期这里要加入循环 ----结束
                        packageParam[packageKey] = skusArray
                    }
                    //获取标签
                    else if (packageKey == "LabelData") {
                        // var labelsArray = new Array()
                        // //后期这里要加入循环 ----开始
                        // var labelsParam = {}
                        // for (labelsKey in packageInfo) {
                        //     var labelsInfo = packageInfo[labelsKey]
                        //     var key_ns = labelsInfo.key_ns
                        //     //获取对应NS系统中的记录的值
                        //     if (key_ns) {
                        //         // var value = labelsInfo.example
                        //         var value = openApi.getRecValue(rec, labelsInfo)
                        //         if (!value && labelsInfo.require) {
                        //             return Result.error("获取参数失败，原因：" + labelsInfo.help)
                        //         }
                        //         labelsParam[labelsKey] = value ? value : ''
                        //     }
                        // }
                        // labelsArray.push(labelsParam)
                        // //后期这里要加入循环 ----结束
                        // packageParam[packageKey] = {
                        //     Items: labelsArray
                        // }
                    } else {
                        var key_ns = packageInfo.key_ns
                        //获取对应NS系统中的记录的值
                        if (key_ns) {
                            // var value = packageInfo.example
                            var value = ""
                            if (packageKey == "Weight") {
                                value = this.caculateWeight(rec)
                            } else {
                                value = this.getRecValue(rec, packageInfo)
                            }
                            if (!value && packageInfo.require) {
                                return Result.error("获取参数失败，原因：" + packageInfo.help)
                            }
                            packageParam[packageKey] = value ? value : ''
                        }
                    }
                }
                reqParam[key] = packageParam
            }
            else {
                var key_ns = dict.key_ns
                //获取对应NS系统中的记录的值
                if (key_ns) {
                    // var value = dict.example
                    var value = this.getRecValue(rec, dict)
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    if (key != 'SubmitLater') reqParam[key] = value ? value : ''
                }
            }
        }
        //结束位置
        return Result.success(reqParam)
    },
    caculateWeight: function (rec) {
        var subKey = "recmachcustrecord_dps_ship_small_links"
        var line = rec.getLineCount({ sublistId: subKey })
        var itemIdArray = new Array()
        var itemNum = {}
        for (var i = 0; i < line; i++) {
            var itemId = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_ship_small_item_item', line: i })
            itemIdArray.push(itemId)
            //数量获取
            itemNum[itemId] = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_ship_small_item_quantity', line: i })
        }
        var allWeight = 0
        if (itemIdArray.length > 0) {
            this.search.create({
                type: 'item',
                filters: [
                    { name: 'internalId', operator: 'anyof', values: itemIdArray },
                ],
                columns: [{ name: 'custitem_dps_heavy2' }]
            }).run().each(function (skurec) {
                var weight = skurec.getValue("custitem_dps_heavy2")
                var num = itemNum[skurec.id]
                if (num) allWeight += Number(weight) * Number(num)
                return true;
            });
        }
        return allWeight
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
                    return false;
                });
            }
            if (value && dict.format) {
                value = dict.format[value]
            }
        }
        return value
    },
    POST: function (url, reqParam, token) {
        return this.http.post({
            url: url,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json',
                "Authorization": 'Bearer ' + token
            },
            body: JSON.stringify(reqParam)
        })
    },
    GET: function (url, token) {
        return this.http.get({
            url: url,
            headers: {
                'Content-Type': 'application/json;charset=utf-8',
                'Accept': 'application/json',
                "Authorization": 'Bearer ' + token
            }
        })
    },
    OpenApiCode: {
        201: '提交成功',
        200: '订单已存在, 忽略当前提交的订单',
        400: '提交的数据有误，请检查',
        404: '订单不存在'
    }
}

var OpenApiDict = {
    Location: { key_ns: "", help: "处理点 如不填则使用商家默认", example: "GZ", require: false, getType: "value" },
    //直发包裹信息
    Package: {
        PackageId: { key_ns: "custrecord_dps_ship_order_number", help: "包裹Id(第三方系统自定义Id，客户+包裹Id 具有唯一性)", example: "SMT23015236489", require: true, getType: "value" },
        ServiceCode: { key_ns: "custrecord_dps_ship_small_channelservice", help: "发货服务代码", example: "CUE", require: true, getType: "value", parseType: "customrecord_logistics_service", parseId: "custrecord_ls_service_code" },
        //收货地址，联系人
        ShipToAddress: {
            Country: { key_ns: "custrecord_dps_recipient_country", help: "国家", example: "US", require: true, getType: "value", parseType: "customrecord_country_code", parseId: "custrecord_cc_country_code" },
            Province: { key_ns: "custrecord_dps_s_state", help: "省/州", example: "Florida", require: true, getType: "value" },
            City: { key_ns: "custrecord_dps_recipient_city", help: "城市", example: "Coral Springs", require: true, getType: "value" },
            Street1: { key_ns: "custrecord_dps_street1", help: "街道1", example: "9110 NW 21st street", require: true, getType: "value" },
            Street2: { key_ns: "", help: "街道2", example: "", require: false, getType: "value" },
            Postcode: { key_ns: "custrecord_dps_recipien_code", help: "邮编", example: "45429", require: true, getType: "value" },
            Contact: { key_ns: "custrecord_dps_ship_small_recipient", help: "联系人", example: "David Mcaffee", require: true, getType: "value" },
            Phone: { key_ns: "custrecord_dps_ship_small_phone", help: "电话", example: "937-689-8216", require: false, getType: "value" },
            Email: { key_ns: "", help: "邮箱", example: "23541566@gmail.com", require: false, getType: "value" },
            TaxId: { key_ns: "", help: "收件人税号 巴西税号：自然人税号称为CPF码，格式为CPF:000.000.000.00；法人税号称为CNPJ码，格式为CNPJ:00.000.000/0000-00", example: "", require: false, getType: "value" },
        },
        Weight: { key_ns: "weight", help: "重量(g) [取值是向上取整的]", example: "600", require: true, getType: "value" },
        Length: { key_ns: "", help: "长(cm)", example: "25", require: false, getType: "value" },
        Width: { key_ns: "", help: "宽(cm)", example: "10", require: false, getType: "value" },
        Height: { key_ns: "", help: "高(cm)", example: "20", require: false, getType: "value" },
        //SKU列表
        Skus: {
            Sku: { key_ns: "", help: "商家SKU", example: "bag-y001", require: false, getType: "value", itemType: "item" },
            Quantity: { key_ns: "custrecord_dps_ship_small_item_quantity", help: "数量", example: "1", require: true, getType: "value" },
            Weight: { key_ns: "custitem_dps_heavy2", help: "单件重量(g)[取值是向上取整的]", example: "600", require: true, getType: "value", itemType: "item" },
            DeclareValue: { key_ns: "custrecord_dps_declared_value", help: "单件申报价值(USD)", example: "5", require: true, getType: "value" },
            DeclareNameEn: { key_ns: "custitem_dps_skuenglish", help: "英文申报名称", example: "bag", require: true, getType: "value", itemType: "item" },
            DeclareNameCn: { key_ns: "custitem_dps_skuchiense", help: "中文申报名称", example: "小梦书包", require: false, getType: "value", itemType: "item" },
            ProductName: { key_ns: "", help: "商品名称", example: "小梦书包", require: false, getType: "value", itemType: "item" },
            Price: { key_ns: "", help: "商品单价", example: "5", require: false, getType: "value", itemType: "item" },
        },
        SellPrice: { key_ns: "", help: "售价", example: "20", require: false, getType: "value" },
        SellPriceCurrency: { key_ns: "", help: "售价货币", example: "CNY", require: false, getType: "value" },
        SalesPlatform: { key_ns: "", help: "销售平台", example: "Ebay", require: false, getType: "value" },
        OtherSalesPlatform: { key_ns: "", help: "其他销售平台", example: "Ebay", require: false, getType: "value" },
        ImportTrackingNumber: { key_ns: "", help: "导入的跟踪号，如果服务允许导入跟踪号时有效", example: "STN201234486", require: false, getType: "value" },
        Custom: { key_ns: "", help: "客户自定义，最长200个字符，可以用于打印在地址标签Custom区域", example: "bag-red", require: false, getType: "value" },
        Remark: { key_ns: "", help: "备注；可用于打印配货清单，有多个以|分隔的值才会打印配货清单", example: "remark", require: false, getType: "value" },
        //标签数据列表
        LabelData: {
            Key: { key_ns: "", help: "数据键", example: "AreaName", require: false, getType: "value" },
            Value: { key_ns: "", help: "数据值", example: "A0001", require: false, getType: "value" },
        }
    },
    Remark: { key_ns: "", help: "备注", example: "remark", require: false, getType: "value" },
    SubmitLater: { key_ns: "", help: "", example: false, require: false }
}

var OpenApiSkuDict = {
    Sku: { key_ns: "", help: "商家SKU", example: "bag-y001", require: true },
    CustomStorageNo: { key_ns: "", help: "自定义库存编码", example: "Y09UIY987985", require: true },
    ProductName: { key_ns: "", help: "产品名称", example: "bag", require: true },
    ProductDescription: { key_ns: "", help: "产品描述", example: "Sample description", require: true },
    Weight: { key_ns: "", help: "重量(g)", example: "600", require: true },
    Length: { key_ns: "", help: "长（cm）", example: "25", require: true },
    Width: { key_ns: "", help: "宽（cm）", example: "10", require: true },
    Height: { key_ns: "", help: "高（cm）", example: "20", require: true },
    DeclareName: { key_ns: "", help: "申报名称", example: "bag", require: true },
    DeclareValue: { key_ns: "", help: "申报价值(USD)", example: "5", require: true },
    ProductFlag: { key_ns: "", help: "产品类型", example: "Simple", require: false },
    ProductAmountWarn: { key_ns: "", help: "库存警报", example: "0", require: false },
    ProductCategory: { key_ns: "", help: "产品品类", example: "bag", require: false },
    ProductRemark: { key_ns: "", help: "产品备注", example: "书包", require: false },
}

var OpenApiInboundDict = {
    ShipmentId: { key_ns: "", help: "商家入库单Id", example: "STOL201603300001", require: true },
    VatNo: { key_ns: "", help: "销售VAT", example: "", require: true },
    Location: { key_ns: "", help: "处理点;如不填则使用商家默认处理点", example: "GZ", require: true },
    WarehouseId: { key_ns: "", help: "仓库Id", example: "US", require: true },
    ShippingType: { key_ns: "", help: "发货方式", example: "DHL", require: true },
    ContainerCount: { key_ns: "", help: "箱数", example: "1", require: true },
    Skus: {
        Sku: { key_ns: "", help: "商家SKU", example: "bag-r001", require: true },
        Quantity: { key_ns: "", help: "数量", example: "1", require: true },
        HsCode: { key_ns: "", help: "hs编码", example: "8483900090", require: true },
    },
    Remark: { key_ns: "", help: "备注", example: "测试入库订单", require: true }
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