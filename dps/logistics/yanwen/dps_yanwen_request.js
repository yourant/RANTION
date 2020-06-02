// 测试环境
var yanwen_domain = 'http://47.96.220.163:802'
var yanwen_token = "D6140AA383FD8515B09028C586493DDB"
var yanwen_userid = "100000"
// 正式环境
// var yanwen_domain = 'HTTP://ONLINE.YW56.COM.CN/SERVICE'
// var yanwen_token = ""
// var yanwen_userid = ""
var changeSever = 'http://47.75.154.81/getLabels'
//出口易物流接口对接
var yanwenApi = {
    http: undefined,
    xml: undefined,
    file: undefined,
    search: undefined,
    init: function (http, xml, file, search) {
        this.xml = xml
        this.http = http
        this.file = file
        this.search = search
    },
    url: {
        channel: yanwen_domain + '/service/Users/' + yanwen_userid + '/GetChannels',//获取发货渠道
        onlinechannel: yanwen_domain + '/service/Users/' + yanwen_userid + '/GetOnlineChannels',//获取线上发货渠道
        create: yanwen_domain + '/service/Users/' + yanwen_userid + '/Expresses',//创建运单
        list: yanwen_domain + '/service/Users/' + yanwen_userid + '/Expresses',//查询接口
        onlinedata: yanwen_domain + '/service/Users/' + yanwen_userid + '/OnlineData',//获取线上数据
        singlelabel: yanwen_domain + '/service/Users/' + yanwen_userid + '/Expresses/{EPCODE}/{LabelSize}Label',//生成单个标签
        multilabel: yanwen_domain + '/service/Users/' + yanwen_userid + '/Expresses/{LabelSize}Label',//生成多个标签
        changestatus: yanwen_domain + '/service/Users/' + yanwen_userid + '/Expresses/ChangeStatus/',//调整订单状态
        countries: yanwen_domain + '/service/Users/' + yanwen_userid + '/channels/{ChannelId}/countries',//调整订单状态
    },
    //获取发货渠道
    GetChannels: function () {
        var response = this.GET(yanwenApi.url.channel)
        if (response.code == 200) {
            var channelTypeArray = new Array()
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            res.getElementsByTagName({
                tagName: 'ChannelType'
            }).map(function (node) {
                channelTypeArray.push({
                    Id: node.getElementsByTagName({ tagName: 'Id' })[0].textContent,
                    Name: node.getElementsByTagName({ tagName: 'Name' })[0].textContent,
                    Status: node.getElementsByTagName({ tagName: 'Status' })[0].textContent
                })
                return true
            })
            return Result.success(channelTypeArray)
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    //新建快件信息
    Create: function (rec, now) {
        //测试数据
        // var reqParam = '<ExpressType><Epcode></Epcode><Userid>100000</Userid><Channel>481</Channel><UserOrderNumber>555541</UserOrderNumber><SendDate>2020-05-14T00:00:00</SendDate><Receiver><Userid>100000</Userid><Name>tang</Name><Phone>1236548</Phone><Mobile>802</Mobile><Email>jpcn@mpc.com.br</Email><Company></Company><Country>美国</Country><Postcode>253400</Postcode><State>FL</State><City>City</City><Address1>Stringcontent1</Address1><Address2>Stringcontent2</Address2></Receiver><Sender>	<TaxNumber>Stringcontent</TaxNumber></Sender><Memo></Memo><Quantity>1</Quantity><GoodsName><Userid>100000</Userid><NameCh>stringcontent</NameCh><NameEn>Stringcontent</NameEn><Weight>213</Weight><DeclaredValue>125</DeclaredValue><DeclaredCurrency>USD</DeclaredCurrency><HsCode>HsCode1234567289</HsCode></GoodsName></ExpressType>'
        var reqParam = this.CreateParam(rec, now)
        log.audit('reqParam', reqParam);
        if (reqParam.code == 200) {
            var response = this.POST(yanwenApi.url.create, reqParam.data)
        } else {
            return reqParam
        }
        if (response.code == 200) {
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            var Node
            res.getElementsByTagName({
                tagName: 'Response'
            }).map(function (node) {
                Node = node
                return false
            })
            var SuccessResult = Node.getElementsByTagName({ tagName: 'Success' })[0].textContent
            if (SuccessResult == "true") {
                return Result.success({
                    //燕文的单号
                    Epcode: Node.getElementsByTagName({ tagName: 'Epcode' })[0].textContent,
                    YanwenNumber: Node.getElementsByTagName({ tagName: 'YanwenNumber' })[0].YanwenNumber
                })
            } else {
                return Result.error(Node.getElementsByTagName({ tagName: 'ReasonMessage' })[0].textContent)
            }

        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 查询运单
     * 
     * @param {*} Start	开始时间	必填  日期格式 yyyy-MM-dd 
     * @param {*} End	结束时间    必填  日期格式 yyyy-MM-dd 
     * @param {*} Page	页码数
     * @param {*} Code	运单号
     * @param {*} Receiver	收货人姓名
     * @param {*} Channel	发货方式
     * @param {*} IsStatus	快件状态。支持的值：1（代表正常），0（代表已删除）。
     * @param {*} 
     */
    SearchOrder: function (Start, End, Page, Code, Receiver, Channel, IsStatus) {
        if (!Start || !End) {
            return Result.error('开始时间与结束时间不能为空')
        }
        var url = yanwenApi.url.list + "?Start=" + Start + "&End=" + End
        if (Page) url += "&Page=" + Page
        if (Code) url += "&Code=" + Page
        if (Receiver) url += "&Receiver=" + Page
        if (Channel) url += "&Channel=" + Page
        if (IsStatus) url += "&IsStatus=" + Page
        var response = this.GET(url)
        if (response.code == 200) {
            var orderArray = new Array()
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            res.getElementsByTagName({
                tagName: 'ExpressType'
            }).map(function (node) {
                var resultParam = {}
                for (var key in YanWenDict) {
                    var dict = YanWenDict[key]
                    if (key == 'Receiver' || key == "GoodsName" || key == "Sender") {
                        if (node.getElementsByTagName({ tagName: key }).length > 0) {
                            //目前只取第一个
                            var secondNode = node.getElementsByTagName({ tagName: key })[0]
                            var secondParam = {}
                            for (sencondKey in dict) {
                                secondParam[sencondKey] = secondNode.getElementsByTagName({ tagName: sencondKey }).length ? secondNode.getElementsByTagName({ tagName: sencondKey })[0].textContent : ''
                            }
                            resultParam[key] = secondParam
                        }
                    } else {
                        resultParam[key] = node.getElementsByTagName({ tagName: key }).length ? node.getElementsByTagName({ tagName: key })[0].textContent : ''
                    }
                }
                if (resultParam) orderArray.push(resultParam)
                return true
            })
            return Result.success(orderArray)
        } else {
            return Result.error("请求失败，未知异常")
        }

    },
    /**
     * 获取线上数据信息
     * @param {*} rec 
     */
    GetOnlineData: function (rec) {
        //测试数据
        // var reqParam = '<OnlineDataType><Epcode>test201606160001</Epcode><Userid>100000</Userid><ChannelType>速卖通中邮-平邮-北京仓</ChannelType><Country>俄罗斯</Country><Postcode>123456</Postcode><SendDate>2016-06-16T00:00:00</SendDate><GoodNames><OnlineCustomDataType><NameCh>test20160107002</NameCh><NameEn>eN</NameEn><DeclaredValue>1</DeclaredValue><DeclaredCurrency>USD</DeclaredCurrency></OnlineCustomDataType><OnlineCustomDataType><NameCh>test20160107002</NameCh><NameEn>eN</NameEn><DeclaredValue>1</DeclaredValue><DeclaredCurrency>USD</DeclaredCurrency></OnlineCustomDataType></GoodNames></OnlineDataType>'
        var reqParam = this.CreateOnlineParam(rec)
        var response = this.POST(yanwenApi.url.onlinedata, reqParam)
        if (response.code == 200) {
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            var Node
            res.getElementsByTagName({
                tagName: 'Response'
            }).map(function (node) {
                Node = node
                return false
            })
            var SuccessResult = Node.getElementsByTagName({ tagName: 'Success' })[0].textContent
            if (SuccessResult == "true") {
                var resultValue = {}
                var backKey = ['Userid', 'WaybillNumber', 'RegionId', 'RegionCh', 'Postcode', 'ChannelId', 'ChannelName', 'PlanDate', 'CreateDate']
                for (var i in backKey) {
                    resultValue[backKey[i]] = res.getElementsByTagName({ tagName: backKey[i] }).length > 0
                        ? res.getElementsByTagName({ tagName: backKey[i] })[0].textContent : ''
                }
                return Result.success(resultValue)
            } else {
                return Result.error(Node.getElementsByTagName({ tagName: 'ReasonMessage' })[0].textContent)
            }

        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 生成单个标签
     * 
     * @param {*} EpcCode 燕文单号
     * @param {*} LabelSize A4L, A4LI, A4LC, A4LCI, A6L, A6LI, A6LC, A6LCI, A10x10L, A10x10LI,A10x10LC, A10x10LCI。(注：L为运单，C为报关签条，I为拣货单。)
     */
    CreateSingleLabel: function (EpcCode, LabelSize) {
        var url = yanwenApi.url.singlelabel
        url = url.replace("{EPCODE}", EpcCode)
        url = url.replace("{LabelSize}", LabelSize)
        var response = this.GET(changeSever + "?url=" + url + "&token=" + yanwen_token)
        if (response.code == 200) {
            return Result.success(response.body)
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 生成多个标签
     * 
     * @param {*} EpcCode 燕文单号 单号用逗号','隔开
     * @param {*} LabelSize A4L, A4LI, A4LC, A4LCI, A6L, A6LI, A6LC, A6LCI, A10x10L, A10x10LI,A10x10LC, A10x10LCI。(注：L为运单，C为报关签条，I为拣货单。)
     */
    CreateMultiLabel: function (EpcCodes, LabelSize) {
        var url = yanwenApi.url.multilabel
        url = url.replace("{LabelSize}", LabelSize)
        var response = this.GET(changeSever + "?url=" + url + "&token=" + yanwen_token + "&param=<string>" + EpcCodes + "</string>")
        log.audit('response', response);
        if (response.code == 200) {
            return Result.success(response.body)
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 修改快件状态
     * 
     * @param {*} Status 快件状态。支持的值为：1 正常；0 删除。
     * @param {*} EpcCodes 燕文单号 单号用逗号','隔开 最多不要超过100个
     */
    ChangeStatus: function (Status, EpcCodes) {
        var url = yanwenApi.url.changestatus + Status
        var response = this.POST(url, "<string>" + EpcCodes + "</string>")
        if (response.code == 200) {
            var res = this.xml.Parser.fromString({
                text: response.body
            })
            if (res.getElementsByTagName({ tagName: "Success" }).length > 0) {
                if (res.getElementsByTagName({ tagName: "Success" })[0].textContent == 'true') {
                    return Result.success()
                } else {
                    return Result.error("调整失败")
                }
            } else {
                return Result.error("解析结果出错")
            }
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 根据渠道号获取它能到达的国家
     * 
     * @param {*} channel 渠道号
     */
    GetCountries: function (channel) {
        if (!channel) return Result.error("请传入渠道号")
        var url = yanwenApi.url.countries
        var response = this.GET(url.replace('{ChannelId}', channel))
        if (response.code == 200) {
            var countryArray = new Array()
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            res.getElementsByTagName({
                tagName: 'CountryType'
            }).map(function (node) {
                countryArray.push({
                    Id: node.getElementsByTagName({ tagName: 'Id' })[0].textContent,
                    RegionCh: node.getElementsByTagName({ tagName: 'RegionCh' })[0].textContent,
                    RegionEn: node.getElementsByTagName({ tagName: 'RegionEn' })[0].textContent,
                    RegionCode: node.getElementsByTagName({ tagName: 'RegionCode' })[0].textContent
                })
                return true
            })
            return Result.success(countryArray)
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 获取线上发货渠道
     */
    GetOnlineChannel: function () {
        var response = this.GET(yanwenApi.url.onlinechannel)
        if (response.code == 200) {
            var channelTypeArray = new Array()
            //转换结果xml
            var res = this.xml.Parser.fromString({
                text: response.body
            });
            res.getElementsByTagName({
                tagName: 'ChannelType'
            }).map(function (node) {
                channelTypeArray.push({
                    Id: node.getElementsByTagName({ tagName: 'Id' })[0].textContent,
                    Name: node.getElementsByTagName({ tagName: 'Name' })[0].textContent,
                    Status: node.getElementsByTagName({ tagName: 'Status' })[0].textContent
                })
                return true
            })
            return Result.success(channelTypeArray)
        } else {
            return Result.error("请求失败，未知异常")
        }
    },
    CreateParam: function (rec, now) {
        var reqParamXml = this.xml.Parser.fromString({
            text: '<ExpressType></ExpressType>'
        })
        var ExpressTypeElem = reqParamXml.getElementsByTagName({ tagName: 'ExpressType' })[0]
        //添加客户号
        var userIdElement = reqParamXml.createElement('Userid')
        var UserIdValue = reqParamXml.createTextNode(yanwen_userid)
        userIdElement.appendChild(UserIdValue)
        ExpressTypeElem.appendChild({
            newChild: userIdElement
        })
        for (var key in YanWenDict) {
            var dict = YanWenDict[key]
            //获取收件人信息
            if (key == 'Receiver') {
                var receiverElement = reqParamXml.createElement(key)
                //添加客户号
                var userIdElement = reqParamXml.createElement('Userid')
                var UserIdValue = reqParamXml.createTextNode(yanwen_userid)
                userIdElement.appendChild(UserIdValue)
                receiverElement.appendChild({
                    newChild: userIdElement
                })
                for (var receiverKey in dict) {
                    var receiverDict = dict[receiverKey]
                    var key_ns = receiverDict.key_ns
                    if (key_ns) {
                        var value = yanwenApi.getRecValue(rec, receiverDict)
                        if (!value && receiverDict.require) {
                            return Result.error("获取参数失败，原因：" + receiverDict.help)
                        }
                        //新增一个头部节点
                        var element = reqParamXml.createElement(receiverKey)
                        var elementValue = reqParamXml.createTextNode(value)
                        element.appendChild(elementValue)
                        receiverElement.appendChild({
                            newChild: element
                        })
                    }
                }
                ExpressTypeElem.appendChild({
                    newChild: receiverElement
                })
            }
            else if (key == "GoodsName") {
                var goodsElement = reqParamXml.createElement(key)
                //添加客户号
                var userIdElement = reqParamXml.createElement('Userid')
                var UserIdValue = reqParamXml.createTextNode(yanwen_userid)
                userIdElement.appendChild(UserIdValue)
                goodsElement.appendChild({
                    newChild: userIdElement
                })
                var itemIdArray = new Array()
                var itemNum = {}
                var subKey = "recmachcustrecord_dps_ship_small_links"
                var line = rec.getLineCount({ sublistId: subKey })
                for (var i = 0; i < line; i++) {
                    var itemId = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_ship_small_item_item', line: i })
                    itemIdArray.push(itemId)
                    //数量获取
                    itemNum[itemId] = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_shipment_item_quantity', line: i })
                }
                if (itemIdArray.length > 0) {
                    var allWeight = yanwenApi.caculateWeight(rec)
                    var columns = new Array()
                    //获取所有货品的ID
                    for (var goodsKey in dict) {
                        var goodsInfo = dict[goodsKey]
                        var key_ns = goodsInfo.key_ns
                        if (key_ns && goodsInfo.itemType == 'item')
                            columns.push({ name: key_ns })
                    }
                    log.audit('columns', columns);
                    var errorMsg = ""
                    var index = 0
                    var moreGoods = new Array()
                    this.search.create({
                        type: 'item',
                        filters: [
                            { name: 'internalId', operator: 'anyof', values: itemIdArray },
                        ],
                        columns: columns
                    }).run().each(function (skurec) {
                        if (index == 0) {
                            for (var goodsKey in dict) {
                                var goodsDict = dict[goodsKey]
                                var key_ns = goodsDict.key_ns
                                if (key_ns) {
                                    var value = ""
                                    if (goodsKey == "DeclaredValue" || goodsKey == "DeclaredCurrency") {
                                        value = yanwenApi.getRecValue(rec, goodsDict)
                                    } else if (goodsKey == "Weight") {
                                        value = allWeight
                                    } else {
                                        value = yanwenApi.getRecValue(skurec, goodsDict)
                                    }
                                    if (!value && goodsDict.require) {
                                        errorMsg = "获取参数失败，原因：" + goodsDict.help
                                        return false
                                    }
                                    //新增一个头部节点
                                    var element = reqParamXml.createElement(goodsKey)
                                    var elementValue = reqParamXml.createTextNode(String(value))
                                    element.appendChild(elementValue)
                                    goodsElement.appendChild({
                                        newChild: element
                                    })
                                }
                            }
                            index++
                        } else {
                            var name = skurec.getValue("custitem_dps_skuenglish")
                            if (name)
                                moreGoods.push(name)
                        }
                        return true;
                    });
                    if (errorMsg) return Result.error(errorMsg)
                    if (moreGoods.length > 0) {
                        var element = reqParamXml.createElement("MoreGoodsName")
                        var elementValue = reqParamXml.createTextNode(moreGoods.join(","))
                        element.appendChild(elementValue)
                        goodsElement.appendChild({
                            newChild: element
                        })
                    }
                }
                ExpressTypeElem.appendChild({
                    newChild: goodsElement
                })
            }
            else if (key == "Sender") {
                var senderElement = reqParamXml.createElement(key)
                for (var senderKey in dict) {
                    var senderDict = dict[senderKey]
                    var key_ns = senderDict.key_ns
                    if (key_ns) {
                        var value = yanwenApi.getRecValue(rec, senderDict)
                        if (!value && senderDict.require) {
                            return Result.error("获取参数失败，原因：" + senderDict.help)
                        }
                        //新增一个头部节点
                        var element = reqParamXml.createElement(senderKey)
                        var elementValue = reqParamXml.createTextNode(value)
                        element.appendChild(elementValue)
                        senderElement.appendChild({
                            newChild: element
                        })
                    }
                }
                ExpressTypeElem.appendChild({
                    newChild: senderElement
                })
            } else {
                var key_ns = dict.key_ns
                if (key_ns) {
                    var value = ""
                    if (key == 'Quantity') {
                        value = this.getQuantity(rec) + ""
                    }
                    else if (key == 'SendDate') {
                        value = now
                    }
                    else {
                        value = yanwenApi.getRecValue(rec, dict)
                    }
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    log.audit('dicthelp', dict.help);
                    //新增一个头部节点
                    var element = reqParamXml.createElement(key)
                    var elementValue = reqParamXml.createTextNode(value)
                    element.appendChild(elementValue)
                    ExpressTypeElem.appendChild({
                        newChild: element
                    })
                }
            }
        }
        var xmlString = this.xml.Parser.toString({
            document: reqParamXml
        })
        xmlString = xmlString.replace("\n", "")
        xmlString = xmlString.replace('<?xml version="1.0" encoding="UTF-8"?>', "")
        return Result.success(xmlString)
    },
    getQuantity: function (rec) {
        var subKey = "recmachcustrecord_dps_ship_small_links"
        var line = rec.getLineCount({ sublistId: subKey })
        var allCount = 0
        for (var i = 0; i < line; i++) {
            var num = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_shipment_item_quantity', line: i })
            if (num) allCount += Number(num)
        }
        return allCount
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
            itemNum[itemId] = rec.getSublistValue({ sublistId: subKey, fieldId: 'custrecord_dps_shipment_item_quantity', line: i })
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
    CreateOnlineParam: function (rec) {
        var reqParamXml = this.xml.Parser.fromString({
            text: '<ExpressType><GoodNames></GoodNames></ExpressType>'
        })
        var ExpressTypeElem = reqParamXml.getElementsByTagName({ tagName: 'ExpressType' })[0]
        var GoodsElem = reqParamXml.getElementsByTagName({ tagName: 'GoodNames' })[0]
        for (var key in onlineDataDict) {
            var dict = onlineDataDict[key]
            //获取收件人信息
            if (key == 'GoodNames') {
                //会有多个的情况 需要在外层再加一层for循环
                var OnlineCustomDataTypeElem = reqParamXml.createElement("OnlineCustomDataType")
                for (var goodsKey in dict) {
                    var goodsDict = dict[goodsKey]
                    var key_ns = goodsDict.key_ns
                    if (key_ns) {
                        var value = rec.getValue(key_ns)
                        if (!value && goodsDict.require) {
                            return Result.error("获取参数失败，原因：" + goodsDict.help)
                        }
                        //新增一个头部节点
                        var element = reqParamXml.createElement(goodsKey)
                        var elementValue = reqParamXml.createTextNode(value)
                        element.appendChild(elementValue)
                        OnlineCustomDataTypeElem.appendChild({
                            newChild: element
                        })
                    }
                }
                GoodsElem.appendChild({
                    newChild: OnlineCustomDataTypeElem
                })
            } else {
                var key_ns = dict.key_ns
                if (key_ns) {
                    var value = rec.getValue(key_ns)
                    if (!value && dict.require) {
                        return Result.error("获取参数失败，原因：" + dict.help)
                    }
                    //新增一个头部节点
                    var element = reqParamXml.createElement(key)
                    var elementValue = reqParamXml.createTextNode(value)
                    element.appendChild(elementValue)
                    ExpressTypeElem.appendChild({
                        newChild: element
                    })
                }
            }
        }
    },
    POST: function (url, reqParam) {
        return this.http.post({
            url: url,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Accept': 'application/xml',
                "Authorization": 'basic ' + yanwen_token
            },
            body: reqParam
        })
    },
    GET: function (url) {
        return this.http.get({
            url: url,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Accept': 'application/xml',
                "Authorization": 'basic ' + yanwen_token
            }
        })
    }
}

var YanWenDict = {
    Epcode: { key_ns: "", help: "运单号", require: false, getType: "value" },
    Userid: { key_ns: "", help: "客户号", require: true, getType: "value" },
    Channel: { key_ns: "custrecord_dps_ship_small_channelservice", help: "发货方式", require: true, getType: "value", parseType: "customrecord_logistics_service", parseId: "custrecord_ls_service_code" },
    UserOrderNumber: { key_ns: "custrecord_dps_ship_platform_order_numbe", help: "客户订单号", require: false, getType: "value" },
    SendDate: { key_ns: "custrecord_dps_ship_small_shipping_date", help: "发货日期", require: true, getType: "value", changeType: "date" },
    Quantity: { key_ns: "Quantity", help: "货品总数量", require: true, getType: "value" },
    PackageNo: { key_ns: "", help: "包裹号", require: false, getType: "value" },
    Insure: { key_ns: "", help: "是否需要保险", require: false, getType: "value" },
    Memo: { key_ns: "", help: "备注。会出现在拣货单上", require: false, getType: "value" },
    MerchantCsName: { key_ns: "", help: "店铺名称， 燕特快不含电，国家为巴西时 此属性必填", require: false, getType: "value" },
    MRP: { key_ns: "", help: "申报建议零售价", require: false, getType: "value" },
    ExpiryDate: { key_ns: "", help: "产品使用到期日", require: false, getType: "value" },
    Receiver: {
        Userid: { key_ns: "", help: "客户号", require: true, getType: "value" },
        Name: { key_ns: "custrecord_dps_ship_small_recipient", help: "收货人-姓名", require: true, getType: "value" },
        Phone: { key_ns: "custrecord_dps_ship_small_phone", help: " 收货人-座机，手机。美国专线至少填一项", require: false, getType: "value" },
        Mobile: { key_ns: "", help: " 收货人-座机，手机。美国专线至少填一项", require: false, getType: "value" },
        Email: { key_ns: "", help: "收货人-邮箱", require: false, getType: "value" },
        Company: { key_ns: "", help: "收货人-公司", require: false, getType: "value" },
        Country: { key_ns: "custrecord_dps_recipient_country", help: "收货人-国家", require: false, getType: "value" },
        Postcode: { key_ns: "custrecord_dps_recipien_code", help: "收货人-邮编", require: true, getType: "value" },
        State: { key_ns: "custrecord_dps_s_state", help: "收货人-州", require: true, getType: "value" },
        City: { key_ns: "custrecord_dps_recipient_city", help: "收货人-城市", require: true, getType: "value" },
        Address1: { key_ns: "custrecord_dps_street1", help: "收货人-地址1", require: true, getType: "value" },
        Address2: { key_ns: "", help: "收货人-地址2", require: false, getType: "value" },
        NationalId: { key_ns: "", help: "护照ID，税号。（国家为巴西时 此属性必填）", require: false }
    },
    GoodsName: {
        Userid: { key_ns: "", help: "客户号", require: true, getType: "value" },
        NameCh: { key_ns: "custitem_dps_skuchiense", help: "商品中文品名", require: true, getType: "value", itemType: "item" },
        NameEn: { key_ns: "custitem_dps_skuenglish", help: "商品英文品名", require: true, getType: "value", itemType: "item" },
        Weight: { key_ns: "custitem_dps_heavy2", help: "包裹总重量（单位是：克；不能有小数）", require: true, getType: "value", itemType: "item" },
        DeclaredValue: { key_ns: "custrecord_dps_declared_value", help: "申报总价值", require: true, getType: "value" },
        DeclaredCurrency: { key_ns: "custrecord_dps_declare_currency", help: "申报币种。支持的值：USD,EUR,GBP,CNY,AUD。", require: false, getType: "text" },
        MoreGoodsName: { key_ns: "", help: "多品名. 会出现在拣货单上", require: false, getType: "value" },
        HsCode: { key_ns: "", help: "商品海关编码,香港FedEx经济必填。", require: false, getType: "value" },
        ProductBrand: { key_ns: "", help: "产品品牌，中俄SPSR专线此项必填", require: false, getType: "value" },
        ProductSize: { key_ns: "", help: "产品尺寸，中俄SPSR专线此项必填", require: false, getType: "value" },
        ProductColor: { key_ns: "", help: "产品颜色，中俄SPSR专线此项必填", require: false, getType: "value" },
        ProductMaterial: { key_ns: "", help: "产品材质，中俄SPSR专线此项必填", require: false }
    },
    Sender: {
        TaxNumber: { key_ns: "", help: "寄件人税号（VOEC No）", require: false, require: false }
    }
}


//线上数据接口
var onlineDataDict = {
    Epcode: { key_ns: "", help: "运单号", require: true },
    Userid: { key_ns: "", help: "客户号", require: true },
    ChannelType: { key_ns: "", help: "发货方式。(支持的值：EUB线上-北京仓 , WISH邮-挂号-北京仓 , 速卖通中邮-平邮-北京仓 , WISH邮-挂号-南京仓 , WISH邮-平邮-北京仓 , WISH邮-平邮-南京仓 , 速卖通中邮-挂号-北京仓)", require: true },
    Country: { key_ns: "", help: "国家", require: true },
    SendDate: { key_ns: "", help: "发货日期", require: true },
    Postcode: { key_ns: "", help: "邮编 ", require: true },
    GoodNames: {
        NameCh: { key_ns: "", help: "中文品名。以下渠道必填：WISH邮-挂号-北京仓，速卖通中邮-平邮-北京仓，WISH邮-平邮-北京仓，速卖通中邮-挂号-北京仓 ", require: true },
        NameEn: { key_ns: "", help: "英文品名 。以下渠道必填：WISH邮-挂号-北京仓，速卖通中邮-平邮-北京仓，WISH邮-平邮-北京仓，速卖通中邮-挂号-北京仓", require: true },
        DeclaredValue: { key_ns: "", help: "申报价值。以下渠道必填：WISH邮-挂号-北京仓，速卖通中邮-平邮-北京仓，WISH邮-平邮-北京仓，速卖通中邮-挂号-北京仓", require: true },
        DeclaredCurrency: { key_ns: "", help: "币种。以下渠道必填：WISH邮-挂号-北京仓，速卖通中邮-平邮-北京仓，WISH邮-平邮-北京仓，速卖通中邮-挂号-北京仓", require: true }
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