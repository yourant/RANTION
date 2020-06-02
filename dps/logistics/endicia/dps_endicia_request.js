//测试环境账号
var username = "2553512"
var password = "TheSkyeIsGreene11"
var requesterID = "lxxx"
//正式环境账号
// var username = 1181310
// var password = jetstar is express
// var requesterID = LJSE

var endiciaDomain = "http://elstestserver2.endicia.com"
var endiciaApi = {
    http: undefined,
    xml: undefined,
    init: function (http, xml, search) {
        this.xml = xml
        this.http = http
        this.search = search
    },
    url: {
        label: endiciaDomain + '/LabelService/EwsLabelService.asmx',//创建标签
    },
    //购买运费
    /**
     * 
     * @param {*} RequestID 请求ID 响应的时候会返回该ID
     * @param {*} Amount 运费金额  测试时最大余额为500
     */
    BuyPostage: function (RequestID, Amount) {
        var reqParamXml = '<?xml version="1.0" encoding="utf-8" ?>' +
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '    <soap:Body>' +
            '        <BuyPostage xmlns="www.envmgr.com/LabelService">' +
            '            <RecreditRequest>' +
            '                <RequesterID>' + requesterID + '</RequesterID>' +
            '                <RequestID>' + RequestID + '</RequestID>' +
            '                <CertifiedIntermediary>' +
            '                    <AccountID>' + username + '</AccountID>' +
            '                    <PassPhrase>' + password + '</PassPhrase>' +
            '                </CertifiedIntermediary>' +
            '                <RecreditAmount>' + Amount + '</RecreditAmount>' +
            '            </RecreditRequest>' +
            '        </BuyPostage>' +
            '    </soap:Body>' +
            '</soap:Envelope>';
        var response = this.POST(endiciaApi.url.label, reqParamXml, 'www.envmgr.com/LabelService/BuyPostage')
        if (response.code == 200) {
            var result = this.xml.Parser.fromString({
                text: response.body
            })
            if (result.getElementsByTagName({ tagName: 'Status' }).length > 0) {
                var Status = result.getElementsByTagName({ tagName: 'Status' })[0].textContent
                if (errorCode[Status]) {
                    return Result.error(errorCode[Status].title + ": " + errorCode[Status].info)
                }
                return Result.success()
            } else {
                return Result.error("无法解析返回结果")
            }
        } else {
            log.audit('response', response);
            return Result.error("请求失败，未知异常")
        }
    },
    //查看单个运费 费率
    CalculatePostageRate: function (option) {
        var reqString = '<?xml version="1.0" encoding="utf-8" ?>' +
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '    <soap:Body>' +
            '        <CalculatePostageRate xmlns="www.envmgr.com/LabelService">' +
            '            <PostageRateRequest>' +
            '                <RequesterID>' + requesterID + '</RequesterID>' +
            '                <CertifiedIntermediary>' +
            '                    <AccountID>' + username + '</AccountID>' +
            '                    <PassPhrase>' + password + '</PassPhrase>' +
            '                </CertifiedIntermediary>' +
            // '                <MailClass>Priority</MailClass>' +
            // '                <WeightOz>32</WeightOz>' +
            // '                <MailpieceShape>Parcel</MailpieceShape>' +
            // '                <FromPostalCode>90245</FromPostalCode>' +
            // '                <ToPostalCode>90247</ToPostalCode>' +
            '            </PostageRateRequest>' +
            '        </CalculatePostageRate>' +
            '    </soap:Body>' +
            '</soap:Envelope>';
        var reqParamXml = this.xml.Parser.fromString({
            text: reqString
        });
        var bodyNode = reqParamXml.getElementsByTagName({ tagName: 'PostageRateRequest' })[0]
        //遍历字典 获取请求参数中的数据 并生成相应的xml数据 详细描述参照下面的PostageRateDict
        for (var key in PostageRateDict) {
            if (option && option[key]) {
                var newNode = reqParamXml.createElement(key)
                var nodeValue = reqParamXml.createTextNode(option[key])
                newNode.appendChild(nodeValue)
                newNode.setAttribute({
                    name: 'xmlns',
                    value: 'www.envmgr.com/LabelService'
                });
                bodyNode.appendChild({
                    newChild: newNode
                })
            }
        }
        var xmlString = this.xml.Parser.toString({
            document: reqParamXml
        })
        //测试用例
        // xmlString = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetPostageLabel xmlns="www.envmgr.com/LabelService"><LabelRequest><MailClass>Priority</MailClass><WeightOz>16</WeightOz><RequesterID>lxxx</RequesterID><AccountID>2553512</AccountID><PassPhrase>TheSkyeIsGreene11</PassPhrase><PartnerCustomerID>100</PartnerCustomerID><PartnerTransactionID>200</PartnerTransactionID><ToName>Jane Doe</ToName><ToAddress1>278 Castro Street</ToAddress1><ToCity>Mountain View</ToCity><ToState>CA</ToState><ToPostalCode>94041</ToPostalCode><FromCompany>Endicia, Inc.</FromCompany><FromName>John Doe</FromName><ReturnAddress1>1990 Grand Ave</ReturnAddress1><FromCity>El Segundo</FromCity><FromState>CA</FromState><FromPostalCode>90245</FromPostalCode></LabelRequest></GetPostageLabel></soap:Body></soap:Envelope>'
        var response = this.POST(endiciaApi.url.label, xmlString, 'www.envmgr.com/LabelService/CalculatePostageRate')
        if (response.code == 200) {
            // TODO TODO TODO
            var result = this.xml.Parser.fromString({
                text: response.body
            })
            if (result.getElementsByTagName({ tagName: 'PostageRateResponse' }).length > 0) {
                var PostageRateResponse = result.getElementsByTagName({ tagName: 'PostageRateResponse' })[0]
                var Status = PostageRateResponse.getElementsByTagName({ tagName: 'Status' })[0].textContent
                // 请求成功
                if (Status == '0') {
                    var successArray = new Array()
                    if (PostageRateResponse.getElementsByTagName({ tagName: 'Postage' }).length > 0) {
                        PostageRateResponse.getElementsByTagName({ tagName: 'Postage' }).map(function (node) {
                            successArray.push({
                                MailService: node.getElementsByTagName({ tagName: 'MailService' })[0].textContent,
                                Rate: node.getElementsByTagName({ tagName: 'Rate' })[0].textContent
                            })
                        })
                    }
                    return Result.success(successArray)
                }
                //请求失败
                else {
                    log.audit('response.body', response.body);
                    return Result.error(errorCode[Status].title + ": " + errorCode[Status].info)
                }
            } else {
                return Result.error("无法解析返回结果")
            }
        } else {
            log.audit('response', response);
            return Result.error("请求失败，未知异常")
        }

    },
    //创建标签
    GetPostageLabel: function (rec) {
        var reqParamXml = this.CreateHeader()
        var bodyNode = reqParamXml.getElementsByTagName({ tagName: 'soap:Body' })[0]
        var GetPostageLabelNode = reqParamXml.createElement("GetPostageLabel")
        GetPostageLabelNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        bodyNode.appendChild(GetPostageLabelNode)
        var requestBodyNode = reqParamXml.createElement("LabelRequest")
        requestBodyNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        var requesterNode = reqParamXml.createElement('RequesterID'), requesterValue = reqParamXml.createTextNode(requesterID)
        requesterNode.appendChild(requesterValue)
        requestBodyNode.appendChild({
            newChild: requesterNode
        })
        requesterNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        var accountIdNode = reqParamXml.createElement('AccountID'), accountIdValue = reqParamXml.createTextNode(username)
        accountIdNode.appendChild(accountIdValue)
        requestBodyNode.appendChild({
            newChild: accountIdNode
        })
        accountIdNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        var passPhraseNode = reqParamXml.createElement('PassPhrase'), passPhraseValue = reqParamXml.createTextNode(password)
        passPhraseNode.appendChild(passPhraseValue)
        requestBodyNode.appendChild({
            newChild: passPhraseNode
        })
        passPhraseNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        var MailClassNode = reqParamXml.createElement('MailClass'), MailClassValue = reqParamXml.createTextNode("Priority")
        MailClassNode.appendChild(MailClassValue)
        requestBodyNode.appendChild({
            newChild: MailClassNode
        })
        MailClassNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        var WeightOzNode = reqParamXml.createElement('WeightOz'), WeightOzValue = reqParamXml.createTextNode(String(this.caculateWeight(rec)))
        WeightOzNode.appendChild(WeightOzValue)
        requestBodyNode.appendChild({
            newChild: WeightOzNode
        })
        WeightOzNode.setAttribute({
            name: 'xmlns',
            value: 'www.envmgr.com/LabelService'
        });
        //遍历字典 获取请求参数中的数据 并生成相应的xml数据
        for (var key in endiciaLabelDict) {
            var dict = endiciaLabelDict[key]
            var key_ns = dict.key_ns
            if (key_ns) {
                var value = this.getRecValue(rec, dict, key);
                if (value) {
                    var newNode = reqParamXml.createElement(key)
                    newNode.setAttribute({
                        name: 'xmlns',
                        value: 'www.envmgr.com/LabelService'
                    });
                    var nodeValue = reqParamXml.createTextNode(value)
                    newNode.appendChild(nodeValue)
                    requestBodyNode.appendChild({
                        newChild: newNode
                    })
                }
            }
        }
        GetPostageLabelNode.appendChild(requestBodyNode)
        //测试用例
        // hasOption = true
        var xmlString = this.xml.Parser.toString({
            document: reqParamXml
        })
        log.audit('xmlString', xmlString);
        //测试用例
        // xmlString = '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetPostageLabel xmlns="www.envmgr.com/LabelService"><LabelRequest><MailClass>Priority</MailClass><WeightOz>16</WeightOz><RequesterID>lxxx</RequesterID><AccountID>2553512</AccountID><PassPhrase>TheSkyeIsGreene11</PassPhrase><PartnerCustomerID>100</PartnerCustomerID><PartnerTransactionID>200</PartnerTransactionID><ToName>Jane Doe</ToName><ToAddress1>278 Castro Street</ToAddress1><ToCity>Mountain View</ToCity><ToState>CA</ToState><ToPostalCode>94041</ToPostalCode><FromCompany>Endicia, Inc.</FromCompany><FromName>John Doe</FromName><ReturnAddress1>1990 Grand Ave</ReturnAddress1><FromCity>El Segundo</FromCity><FromState>CA</FromState><FromPostalCode>90245</FromPostalCode></LabelRequest></GetPostageLabel></soap:Body></soap:Envelope>'
        var response = this.POST(endiciaApi.url.label, xmlString, 'www.envmgr.com/LabelService/GetPostageLabel')
        if (response.code == 200) {
            log.audit('response.body', response.body);
            var result = this.xml.Parser.fromString({
                text: response.body
            })
            if (result.getElementsByTagName({ tagName: 'Status' }).length > 0) {
                var Status = result.getElementsByTagName({ tagName: 'Status' })[0].textContent
                if (errorCode[Status]) {
                    var ErrorMessage = errorCode[Status].info
                    if (result.getElementsByTagName({ tagName: 'Status' }).length > 0) {
                        ErrorMessage = result.getElementsByTagName({ tagName: 'ErrorMessage' })[0].textContent
                    }
                    return Result.error(errorCode[Status].title + ": " + ErrorMessage)
                }
                var resultData = {}
                if (result.getElementsByTagName({ tagName: 'Base64LabelImage' }).length > 0) {
                    resultData.Base64LabelImage = result.getElementsByTagName({ tagName: 'Base64LabelImage' })[0].textContent
                }
                if (result.getElementsByTagName({ tagName: 'PIC' }).length > 0) {
                    resultData.PIC = result.getElementsByTagName({ tagName: 'PIC' })[0].textContent
                }
                if (result.getElementsByTagName({ tagName: 'TrackingNumber' }).length > 0) {
                    resultData.TrackingNumber = result.getElementsByTagName({ tagName: 'TrackingNumber' })[0].textContent
                }
                return Result.success(resultData)
            } else {
                return Result.error("无法解析返回结果")
            }
        } else {
            log.audit('response', response);
            return Result.error("请求失败，未知异常")
        }
    },
    /**
     * 取消标签
     * 
     * @param {*} RequestID 请求ID 响应的时候会返回该ID
     * @param {*} PicNumbers 请求的跟踪号码 多个用逗号隔开
     */
    RefundLabel: function (RequestID, PicNumbers) {
        if (!RequestID) RequestID = ''
        var refundXml = '<?xml version="1.0" encoding="utf-8" ?>' +
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '    <soap:Body>' +
            '        <GetRefund xmlns="www.envmgr.com/LabelService">' +
            '            <RefundRequest>' +
            '                <RequesterID>' + requesterID + '</RequesterID>' +
            '                <RequestID>' + RequestID + '</RequestID>' +
            '                <CertifiedIntermediary>' +
            '                    <AccountID>' + username + '</AccountID>' +
            '                    <PassPhrase>' + password + '</PassPhrase>' +
            '                </CertifiedIntermediary>' +
            '                <PicNumbers>';

        if (PicNumbers) {
            var PicNumberArray = PicNumbers.split(',')
            for (var i in PicNumberArray) {
                refundXml += '<PicNumber>' + PicNumberArray[i] + '</PicNumber>'
            }
            refundXml += '                </PicNumbers>' +
                '            </RefundRequest>' +
                '        </GetRefund>' +
                '    </soap:Body>' +
                '</soap:Envelope>';
            //发送请求数据
            var response = this.POST(endiciaApi.url.label, refundXml, 'www.envmgr.com/LabelService/GetRefund')
            if (response.code == 200) {
                var resultArray = new Array()
                var result = this.xml.Parser.fromString({
                    text: response.body
                })
                if (result.getElementsByTagName({ tagName: 'Refund' }).length > 0) {
                    result.getElementsByTagName({
                        tagName: 'Refund'
                    }).map(function (node) {
                        resultArray.push({
                            PicNumber: node.getAttribute({ name: 'PicNumber' }),
                            IsSuccess: node.getElementsByTagName({ tagName: 'RefundStatus' })[0].textContent == 'Approved' ? true : false,
                            Message: node.getElementsByTagName({ tagName: 'RefundStatusMessage' })[0].textContent
                        })
                        return true
                    })
                    return Result.success(resultArray)
                } else {
                    return Result.error("无法解析返回结果")
                }
            } else {
                log.audit('response', response);
                return Result.error("请求失败，未知异常")
            }
        } else {
            return Result.error('跟踪号码不能位空')
        }
    },
    //追踪包裹
    /**
     * 
     * @param {*} requestID 请求ID 响应的时候会返回该ID
     * @param {*} PackageStatus CURRENT or COMPLETE  当前状态或完整状态
     * @param {*} PicNumber 请求的跟踪号码 多个用逗号隔开
     */
    StatusRequest: function (requestID, PackageStatus, PicNumber) {
        if (!requestID || !PackageStatus || !PicNumber) {
            return Result.error("缺少必要参数")
        }
        var reqParamXml = '<?xml version="1.0" encoding="utf-8"?>' +
            '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            '    xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
            '    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '    <soap:Body>' +
            '        <StatusRequest xmlns="www.envmgr.com/LabelService">' +
            '            <PackageStatusRequest>' +
            '                <RequesterID>' + requesterID + '</RequesterID>' +
            '                <RequestID>' + requestID + '</RequestID>' +
            '                <CertifiedIntermediary>' +
            '                    <AccountID>' + username + '</AccountID>' +
            '                    <PassPhrase>' + password + '</PassPhrase>' +
            '                </CertifiedIntermediary>' +
            '                <RequestOptions PackageStatus="' + PackageStatus + '" />' +
            '                <PicNumbers>' +
            '                    <PicNumber>' + PicNumber + '</PicNumber>' +
            '                </PicNumbers>' +
            '            </PackageStatusRequest>' +
            '        </StatusRequest>' +
            '    </soap:Body>' +
            '</soap:Envelope>'
        var response = this.POST(endiciaApi.url.label, reqParamXml, 'www.envmgr.com/LabelService/StatusRequest')
        if (response.code == 200) {
            var resultArray = new Array()
            var result = this.xml.Parser.fromString({
                text: response.body
            })
            if (result.getElementsByTagName({ tagName: 'Status' }).length > 0) {
                var Status = result.getElementsByTagName({ tagName: 'Status' })[0].textContent
                if (errorCode[Status]) {
                    return Result.error(errorCode[Status].title + ": " + errorCode[Status].info)
                }
                var PackageStatusNode = result.getElementsByTagName({
                    tagName: 'PackageStatus'
                })[0]
                PackageStatusNode.getElementsByTagName({
                    tagName: 'StatusResponse'
                }).map(function (node) {
                    var statusParam = {
                        PicNumber: node.getElementsByTagName({ tagName: 'PicNumber' })[0].textContent,
                        PieceId: node.getElementsByTagName({ tagName: 'PieceId' })[0].textContent,
                        TransactionID: node.getElementsByTagName({ tagName: 'TransactionID' })[0].textContent
                    }
                    var PackageStatusEventListArray = new Array()
                    node.getElementsByTagName({
                        tagName: 'PackageStatusEventList'
                    }).map(function (node1) {
                        PackageStatusEventListArray.push({
                            StatusCode: node1.getElementsByTagName({ tagName: 'StatusCode' })[0].textContent,
                            StatusDescription: node1.getElementsByTagName({ tagName: 'StatusDescription' })[0].textContent,
                            EventDateTime: node1.getElementsByTagName({ tagName: 'EventDateTime' })[0].textContent,
                            TrackingSummary: node1.getElementsByTagName({ tagName: 'TrackingSummary' })[0].textContent
                        })
                    })
                    statusParam.PackageStatusEventList = PackageStatusEventListArray
                    resultArray.push(statusParam)
                    return true
                })
                return Result.success(resultArray)
            } else {
                return Result.error("无法解析返回结果")
            }
        } else {
            log.audit('response', response);
            return Result.error("请求失败，未知异常")
        }
    },
    CreateHeader: function () {
        var headerxml = '<?xml version="1.0" encoding="utf-8"?>' +
            '<soap:Envelope ' +
            'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
            'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
            'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">' +
            '<soap:Body>' +
            '</soap:Body>' +
            '</soap:Envelope>';
        var res = this.xml.Parser.fromString({
            text: headerxml
        });
        return res
    },
    getRecValue: function (rec, dict, key) {
        var key_ns = dict.key_ns
        var value = ""
        //获取对应NS系统中的记录的值
        if (key_ns) {
            if (key == 'ToCity' || key == 'ToState') {
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
                    if (key == 'FromCity') {
                        value = parseRec.getText(dict.parseId)
                    }
                    else {
                        value = parseRec.getValue(dict.parseId)
                    }
                    return true;
                });
                if (key == 'FromCompany') {
                    this.search.create({
                        type: 'customrecord_country_code',
                        filters: [
                            { name: 'internalId', operator: 'is', values: value },
                        ],
                        columns: [
                            { name: 'custrecord_cc_country_code' }
                        ]
                    }).run().each(function (parseRec) {
                        value = parseRec.getValue('custrecord_cc_country_code')
                        return true;
                    });
                }
            }
        }
        return value
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
        log.audit('allweight', allWeight);
        return allWeight
    },
    POST: function (url, reqParam, action) {
        return this.http.post({
            url: url,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': action
            },
            body: reqParam
        })
    },
    GET: function (url, action) {
        return this.http.get({
            url: url,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': action
            }
        })
    }
}

var endiciaLabelDict = {
    // MailClass: { key_ns: '', help: '计算所有适用的指定邮件类别（国内或国际）的费率。', valueType: 'PriorityExpress,First,LibraryMail,MediaMail,ParcelSelect,RetailGround,Priority,PriorityMailExpressInternational,FirstClassMailInternational,FirstClassPackageInternationalService,PriorityMailInternational' },
    WeightOz: { key_ns: '', help: '包装重量，以盎司为单位。', valueType: '重量' },
    PartnerCustomerID: { key_ns: 'custrecord_dps_ship_platform_order_numbe', help: '', valueType: '' },
    PartnerTransactionID: { key_ns: 'custrecord_dps_ship_platform_order_numbe', help: '', valueType: '' },
    ToName: { key_ns: 'custrecord_dps_ship_small_recipient', help: '优先邮件快递和国际邮件的收件人名称：ToName或ToCompany必须包含一个值。', valueType: '字符串（47个字符）' },
    ToAddress1: { key_ns: 'custrecord_dps_street1', help: '收件人的第一个收货地址行', valueType: '字符串（47个字符）' },
    ToCity: { key_ns: 'custrecord_dps_recipient_city', help: '收件人所在的城市对于国内邮件，允许的字符为：AZ az连字符句号空间', valueType: '字符串（50个字符）' },
    ToState: { key_ns: 'custrecord_dps_s_state', help: '收件人所在的州或省。如果ValidateAddress是FALSE国内邮件，则此元素必须包含有效的2个字符的状态码。国内邮件是必需的，国际邮件是可选的。', valueType: '字符串（2或25个字符）' },
    ToPostalCode: { key_ns: 'custrecord_dps_recipien_code', help: '收件人的邮政编码。', valueType: '字符串 (5个或15个字符）' },
    FromCompany: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人所在的国家。对于美国地址，此值应留空。', valueType: '字符串（50个字符）', parseType: 'location', parseId: 'custrecord_aio_country_sender' },
    FromName: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人姓名。FromName或FromCompany必须包含一个值。对于海关表格，此元素必须至少包含两个词。', valueType: '字符串（47个字符）', parseType: 'location', parseId: 'custrecord_aio_sender_name' },
    ReturnAddress1: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人的第一个收货地址行', valueType: '字符串（47个字符）', parseType: 'location', parseId: 'custrecord_aio_sender_address' },
    FromCity: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人所在城市允许的字符：AZ，az，连字符，句号，空格', valueType: '字符串（50个字符）', parseType: 'location', parseId: 'custrecord_aio_sender_city' },
    FromState: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人所在的州或省。如果ValidateAddress为FALSE，则此元素必须包含有效的两个字符的状态代码。', valueType: '字符串（25个字符）', parseType: 'location', parseId: 'custrecord_aio_sender_state' },
    FromPostalCode: { key_ns: 'custrecord_dps_ship_samll_location', help: '发件人的邮政编码。格式仅是ZIP5或美国地址的ZIP + 4。', valueType: '字符串（10个字符', parseType: 'location', parseId: 'custrecord_aio_sender_address_code' },
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

var PostageRateDict = {
    MailClass: { help: '计算所有适用的指定邮件类别（国内或国际）的费率。', valueType: 'PriorityExpress,First,LibraryMail,MediaMail,ParcelSelect,RetailGround,Priority,PriorityMailExpressInternational,FirstClassMailInternational,FirstClassPackageInternationalService,PriorityMailInternational' },
    WeightOz: { help: '包装重量，以盎司为单位。', valueType: '重量' },
    MailpieceShape: { help: '邮件形状', valueType: 'Card or Letter or Flat or Parcel or LargeParcel or IrregularParcel or FlatRateEnvelope or FlatRateLegalEnvelope or FlatRatePaddedEnvelope or FlatRateGiftCardEnvelope or FlatRateWindowEnvelope or FlatRateCardboardEnvelope or SmallFlatRateEnvelope or SmallFlatRateBox or MediumFlatRateBox or LargeFlatRateBox or DVDFlatRateBox or LargeVideoFlatRateBox or RegionalRateBoxA or RegionalRateBoxB or LargeFlatRateBoardGameBox or HalfTrayBox or FullTrayBox or EMMTrayBox or FlatTubTrayBox' },
    FromPostalCode: { help: '发件人的邮政编码。格式为ZIP5。', valueType: '5个字符' },
    ToPostalCode: { help: '收件人的邮政编码。对于国内邮件，格式为ZIP5（必填）。对于国际邮件（可选），最多15位数字。', valueType: '15个字符' },
}

var errorCode = {
    101: { title: "GenericError", info: "{Error Message}" },
    162: { title: "Error generating XML data", info: "Error generating XML data. Object reference not set to an instance of an object. Error encountered (Log ID: 22305)" },
    102: { title: "InternalEndiciaError", info: "Internal Endicia Error: {Error Message}" },
    307: { title: "InvalidOriginZipCode", info: "Invalid origin ZIP Code." },
    308: { title: "InvalidDestinationZipCode", info: "Invalid destination ZIP Code." },
    404: { title: "MailClassNotSupported", info: "Mail class not supported ({Mail Class})." },
    405: { title: "InvalidMailClass", info: "Invalid mail class ({Mail Class})." },
    406: { title: "MailpieceWeightMustBePositive", info: "Mailpiece weight must be greater than zero." },
    407: { title: "MailpieceWeightExceedsMaximum", info: "Weight ({Weight} ounces) exceeds maximum allowed for Mail Service ({Weight} ounces)." },
    409: { title: "InvalidMailpieceValue", info: "{Description} value is invalid." },
    410: { title: "MailpieceValueMustBePositive", info: "{Description} value must be greater than $0.00." },
    411: { title: "MailpieceValueExceedsMaximum", info: "Mailpiece value exceeds the {Amount} maximum allowed for {Insurance Type}." },
    412: { title: "MailpieceShapeNotSupported", info: "Mailpiece shape not supported ({Mailpiece Shape})." },
    413: { title: "InvalidMailpieceShape", info: "Invalid mailpiece shape ({Mailpiece Shape})." },
    414: { title: "ServiceLevelNotSupported", info: "Service Level not supported ({Service Level})." },
    415: { title: "InvalidServiceLevel", info: "Invalid Service Level ({Service Level})." },
    416: { title: "SortTypeNotSupported", info: "Sort Type not supported ({Sort Type})." },
    417: { title: "InvalidSortType", info: "Invalid Sort Type ({Sort Type})." },
    418: { title: "PricingNotOffered", info: "{Pricing} pricing is not offered for {Mail Service}." },
    420: { title: "MailServiceNotAvailableToCountry", info: "{Mail Service} is not available to {Country Name}." },
    421: { title: "InvalidCountry", info: "{Country} is not a valid country." },
    422: { title: "OnlinePostageNotAllowed", info: "Online postage is not allowed for {Mail Service} to {Country Name}." },
    423: { title: "LimitedMailServiceToCountry", info: "{Mail Service} to {Country Name} is limited to {allowed mail service(s)}." },
    430: { title: "MailpieceDimensionsMustBePositive", info: "Mailpiece length, width, and height must be greater than zero." },
    431: { title: "MailpieceDimensionsRequired", info: "Mailpiece dimensions are required for {Mail Class}." },
    434: { title: "LengthPlusGirthExceedsMaximum", info: "Mailpiece length plus girth of {Dimension}' exceeds maximum of { Dimension }' allowed by Mail Service." },
    436: { title: "InvalidEntryFacility", info: "Invalid Entry Facility ({Entry Facility})." },
    437: { title: "EntryFacilityDoesNotServiceDesination", info: "Entry Facility {Entry Facility} does not service destination ZIP code {ZIP code}." },
    440: { title: "DeliveryConfirmationNotAvailable", info: "Delivery Confirmation is not available for {Description}." },
    441: { title: "SignatureConfirmationNotAvailable", info: "Signature Confirmation is not available for {Description}." },
    448: { title: "InsuranceNotAvailableToCountry", info: "{Insurance Type} is not available to {Country Name}." },
    449: { title: "ExtraServiceNotAvailable", info: "{Extra Service} is not available for this mailpiece." },
    501: { title: "NoCubicPostageCalculator", info: "Cubic postage calculator is not available for {Mail Class} {Pricing} pricing." },
    502: { title: "CubicPricingNotOffered", info: "Cubic pricing is not offered for {Mail Class} {Pricing} pricing." },
    503: { title: "MailpieceCubicVolumeMustBePositive", info: "Mailpiece cubic volume must be greater than zero." },
    504: { title: "MailpieceCubicVolumeExceedsMaximum", info: "Cubic volume ({Volume} cu. ft.) exceeds maximum of {Volume} cu. ft. allowed for mail service." },
    1001: { title: "MissingOrInvalidXMLElement", info: "Missing or invalid data element: {Element Name}" },
    1002: { title: "ElementNotAllowed", info: "Element not allowed: {Element Name}" },
    1011: { title: "InvalidTrackingNumber", info: "Service Type Code in Tracking Number must match Services requested for the package." },
    1020: { title: "InvalidRecreditAmount", info: "RecreditAmount must be greater than zero and less than $100,000." },
    1050: { title: "NoCustomsItems", info: "Customs Info does not contain any customs items." },
    1051: { title: "InvalidCustomsItemData", info: "{Element Name} must be a positive numeric value {Amount} or less." },
    1052: { title: "TotalCustomsValueMustBePositive", info: "Total customs value must be a positive numeric value 99999.99 or less." },
    1053: { title: "ContentsWeightExceedsPackageWeight", info: "Total package weight must be equal to or greater than the sum of the item weights." },
    1054: { title: "ExceedsItemLimitForCustomsForm", info: "{Form Type} is limited to only {n} items." },
    1055: { title: "ExceedsValueLimitForCustomsForm", info: "Total customs value cannot exceed {Amount} for mailpiece using Customs Form {Form Type}." },
    1059: { title: "InvalidMailClassForOD", info: "{Mail Class} is not a valid MailClass for open and distribute service." },
    1061: { title: "NoServicesAllowedForOD", info: "No extra services are allowed with Open and Distribute service" },
    1062: { title: "IncorrectWeightForOD", info: "Enclosed mail cannot be placed directly in sacks and should be placed in tray(s), if package weight is less than 5lbs" },
    1064: { title: "ConflictingServices", info: "Conflicting services requested." },
    1066: { title: "SelectedServicesDoNotApply", info: "Selected services {Service 1, Service 2,…} do not apply." },
    1067: { title: "SignatureRequired", info: "Signature cannot be waived for Express Mail shipments when Adult Signature, COD, USPS insurance, or Hold For Pickup has been selected." },
    1101: { title: "AccountNotAuthorizedForLabel", info: "Account #{Account Number} is not authorized for the requested label type." },
    1103: { title: "MailpieceShapeNotSupportedForLiveAnimals", info: "USPS-provided packaging is not allowed when shipping live animals." },
    1109: { title: "", info: "Endicia Pay-On-Use Returns service is not available for this USPS service combination." },
    1501: { title: "ExceedsLimitForAddressLines", info: "Address lines exceed maximum allowed." },
    1505: { title: "MailClassNotAllowedForLabel", info: "{Mail Class} is not allowed for label." },
    2010: { title: "InvalidAccountStatus", info: "Account #{Account Number} has an invalid status. Please contact the Endicia Label Server Support Team." },
    2011: { title: "AccountNeedsPassPhraseReset", info: "Account #{Account Number} requires a Pass Phrase reset." },
    2012: { title: "AccountSuspendedBadLogins", info: "Account #{Account Number} has been suspended due to multiple login attempts with an incorrect Pass Phrase. Please contact Endicia customer support at (650) 321-2640 x130 or LabelServer@endicia.com." },
    2013: { title: "AccountSuspendedForCause", info: "Account #{Account Number} has been suspended. Please contact Endicia customer support at (650) 321-2640 x130 or LabelServer@endicia.com." },
    2014: { title: "AccountPendingClose", info: "Account #{Account Number} is scheduled to be closed. Please contact Endicia customer support at (650) 321-2640 x130 or LabelServer@endicia.com." },
    2015: { title: "AccountIsClosed", info: "Account #{Account Number} is closed. Please contact Endicia customer support at (650) 321-2640 x130 or LabelServer@endicia.com." },
    2020: { title: "AccountNotQualifiedForMailClass", info: "Account #{Account Number} is not qualified for {Mail Class}." },
    2021: { title: "AccountNotQualifiedForFeature", info: "Account #{Account Number} is not qualified for {Feature Description}." },
    3005: { title: "NameOrCompanyRequired", info: "{Sender’s" },
    3010: { title: "InsuredValueExceedsEndiciaMaximum", info: "Insured value exceeds the $10,000 maximum allowed by Endicia." },
    3011: { title: "InsuredValueMustBePositive", info: "Insured value must be greater than $0.00." },
    3020: { title: "FailedValidatingShipFromAddress", info: "Unable to validate Ship From address." },
    3021: { title: "FailedValidatingShipToAddress", info: "Unable to validate Ship To address." },
    3023: { title: "ExpressMailNotAvailableToDestination", info: "Express Mail Service is not available to the destination address." },
    3024: { title: "ServiceNotAvailableToDestination", info: "One or more services are not available to the destination address." },
    3025: { title: "CustomsFormNotAllowedForMailpiece", info: "Customs Form is not allowed for mailpiece." },
    3027: { title: "ConsolidatorslabelsNotAllowed", info: "Requested Consolidator Label is invalid." },
    4001: { title: "InvalidFieldInDialAZipResponse", info: "The {Field Name} field in Dial-A-ZIP response is invalid." },
    11001: { title: "FailedRetrievingPICNumber", info: "Unable to retrieve PIC number: {Description}" },
    11002: { title: "PICNumberServiceError", info: "Error returned from PIC Number Service." },
    11003: { title: "InvalidPICNumberReceived", info: "Invalid PIC number received: {Number}" },
    11101: { title: "FailedRetrievingExpressMailNumber", info: "Unable to retrieve Express Mail number: {Description}" },
    11102: { title: "ExpressMailAPIError", info: "Error returned from Express Mail API: {Description}" },
    11110: { title: "FailedRetrievingEMCommitments", info: "Unable to retrieve Express Mail Service Commitments: {Description}" },
    11111: { title: "NotEligibleForSundayHolidayDelivery", info: "Mailpiece not eligible for Express Mail Sunday/Holiday Delivery Service." },
    11112: { title: "ServiceCommitmentsNotFound", info: "There were no Express Mail Service Commitments for the mailpiece." },
    11113: { title: "ServiceCommitmentNotOnSundayHoliday", info: "Express Mail Sunday/Holiday Delivery Service not allowed: Service Commitment does not fall on a Sunday or a Holiday." },
    11114: { title: "CannotMeetServiceCommitmentCutOffTime", info: "Ship time is past the latest cut-off time to meet Express Mail Service Commitment." },
    11115: { title: "NoSundayHolidayDeliveryToDestination", info: "Express Mail Sunday/Holiday Delivery Service is not available to ZIP Code {Zip Code}." },
    11204: { title: "FailedRetrievingConfirmCode", info: "Unable to retrieve IMb confirmation code: {Description}" },
    11301: { title: "FailedRetrievingLabelNumber", info: "Unable to retrieve {Mail Class/Extra Service} number: {Description}" },
    11302: { title: "LabelNumberServiceError", info: "Error returned from Label Number Service: {Description}" },
    11303: { title: "NoLabelNumberReceived", info: "Label Number Service did not return a label number." },
    11304: { title: "InvalidLabelNumberReceived", info: "Invalid label number received from Label Number Service: {Label Number}" },
    11401: { title: "FailedRetrievingBarcodeNumber", info: "Unable to retrieve {Description} barcode number." },
    11402: { title: "InternationalLabelAPIError", info: "Error returned from International Label API: {Description}" },
    11403: { title: "CustomsFormsAPIError", info: "Error returned from Customs Forms API: {Description}" },
    11451: { title: "FailedRetrievingAccountInformation", info: "Unable to retrieve information for account #{Account Number}: {Description}" },
    11452: { title: "AccountInformationServiceError", info: "Error returned from Account Information Service for account #{Account Number}: {Description}" },
    11453: { title: "InvalidValueinAccountInformation", info: "Invalid {Value Name} value received for account #{Account Number}." },
    11501: { title: "FailedValidatingAddress", info: "Unable to validate address: {Description}" },
    11502: { title: "NonDeliverableAddress", info: "The address is not a deliverable location according to the US Postal Service." },
    11503: { title: "UnknownDialAZipReturnCode", info: "Dial-A-ZIP Server ({Server Name}) has returned an unknown return code of {value}." },
    11611: { title: "DialAZipInvalidZipCode", info: "Dial-A-ZIP error: Invalid ZIP Code" },
    11612: { title: "DialAZipInvalidStateCode", info: "Dial-A-ZIP error: Invalid state code." },
    11613: { title: "DialAZipInvalidCity", info: "Dial-A-ZIP error: Invalid city." },
    11621: { title: "DialAZipAddressNotFound", info: "Dial-A-ZIP error: Address not found." },
    11622: { title: "DialAZipMultipleMatchesTooAmbiguious", info: "Dial-A-ZIP error: Address is too ambiguous." },
    11803: { title: "DHLSortCodeLookupError", info: "Failed to retrieve DHL Sort code: {DHL sortcode API error message}." },
    12001: { title: "PurchaseTooSmall", info: "Buy transaction must be greater than $10.00." },
    12002: { title: "IndiciumValueZero", info: "Indicium value is zero." },
    12003: { title: "VpoTransactionFailed", info: "VPO transaction failed ({Status Codes}): {Description}" },
    12004: { title: "VpoAdminCallFailed", info: "VPO Admin Transaction failed ({Status Codes}): {Description}" },
    12100: { title: "UnknownPostageTransactionError", info: "The Postage Transaction has returned an unknown error." },
    12101: { title: "AccountNotFound", info: "The Certified Intermediary’s account number is invalid." },
    12103: { title: "InactiveAccount", info: "The Certified Intermediary’s account is not active." },
    12104: { title: "InsufficientFunds1", info: "The Certified Intermediary’s account does not have enough postage balance to support this transaction." },
    12115: { title: "IndiciumMaxExceeded", info: "The indicium postage requested exceeds the account’s limit" },
    12116: { title: "InvalidCreditCard", info: "Invalid credit card on account." },
    12117: { title: "InvalidCCExpiration", info: "The account credit card’s expiration date has passed" },
    12118: { title: "InvalidPurchaseAmountLow", info: "The purchase amount is too low." },
    12119: { title: "InvalidPurchaseAmountHigh", info: "The purchase amount exceeds the account’s purchase limit." },
    12120: { title: "CreditCardFailed", info: "The credit card transaction failed." },
    12121: { title: "PurchaseUpdateFailed", info: "The update to the account with the credit card information failed." },
    12124: { title: "DatabaseFailure", info: "General database error" },
    12125: { title: "InvalidRequest", info: "The XML Request type is not recognized" },
    12128: { title: "InvalidCCDeclined", info: "The credit card purchase was declined by the customer’s bank." },
    12129: { title: "InvalidCCReferred", info: "The credit card purchase was “referred” by the customer’s bank. Contact the bank." },
    12130: { title: "Unavailable", info: "The Postage Server is unavailable." },
    12131: { title: "InvalidCCAddress", info: "The address on the credit card is invalid." },
    12132: { title: "CCUnavailable", info: "The credit card processing is unavailable." },
    12133: { title: "Locked", info: "The account is locked (possibly in use)." },
    12134: { title: "AccountHoldFailed", info: "The request to hold the account for a transaction failed." },
    12135: { title: "InternetAccessFailure", info: "Internet access/communication failure." },
    12136: { title: "AccountIsBusy", info: "Account is busy." },
    12144: { title: "InvalidPartnerCustomerId", info: "PartnerCustomerID is missing or Invalid." },
    12201: { title: "XmlParseError", info: "The XML request cannot be parsed for all required elements. The description provides details on the problem item." },
    12500: { title: "KeyMacCheckFailed", info: "The key on the account has been tampered with and no transactions are allowed." },
    12502: { title: "NegativeDollarIndiciumRequest", info: "Indicium requests must be positive." },
    12503: { title: "InsufficientFunds2", info: "There is not enough money in the account to produce the indicium." },
    12505: { title: "AccountMacFailed", info: "The account information has been tampered with and no transactions are allowed." },
    12507: { title: "IncorrectPassPhrase", info: "The Certified Intermediary’s Pass Phrase is incorrect." },
    12508: { title: "IncorrectEmail", info: "The email provided is incorrect." },
    12509: { title: "IncorrectChallengeAnswer", info: "The challenge answer provided is incorrect." },
    12514: { title: "ReplayDetected", info: "The system has detected a duplicate request for postage." },
    12515: { title: "AccountMacCheckFailed", info: "The account information has been tampered with and no transactions are allowed." },
    12525: { title: "AccountSuspended", info: "The account has been suspended and no transactions are allowed." },
    12669: { title: "PassPhraseReused", info: "The new Pass Phrase cannot match up to the four previously used Pass Phrases." },
    13001: { title: "ConfirmReceiptFailed", info: "Internal Error: Confirm Receipt transaction failed for label number {0}." },
    16000: { title: "PackagePickupAPIError", info: "Package Pickup API error: {0}" },
    16001: { title: "FailedCancelingPackagePickup", info: "Failed Canceling Package Pickup: {0}" },
    16002: { title: "InvalidPackagePickupConfirmation", info: "The package pickup with confirmation number {0} does not exist or has been cancelled." },
    22000: { title: "InvalidDHLGMProduct", info: "Invalid DHLGM International product specified in the MailClass element." },
    22001: { title: "DestinationCountryNotAllowed", info: "Destination country is not allowed for specified product." },
    22002: { title: "MaximumWeightExceeded", info: "Maximum weight exceeded for specified product." },
    22003: { title: "DimensionsNotSpecified", info: "Dimensions not specified in the MailpieceDimensions data element." },
    22004: { title: "MaximumLengthExceeded", info: "Maximum length exceeded for specified product" },
    22005: { title: "LengthNotSpecified", info: "Length not specified in the MailpieceDimensions data element." },
    22006: { title: "HeightNotSpecified", info: "Height not specified in the MailpieceDimensions data element." },
    22007: { title: "WidthNotSpecified", info: "Width not specified in the MailpieceDimensions data element." },
    22008: { title: "WeightNotSpecified", info: "Weight not specified in the WeightOz data element." },
    22009: { title: "MaximumCombinedDimensionsExceeded", info: "Maximum combined dimensions exceeded for specified product." },
    22010: { title: "DestinationCountryNotSpecified", info: "Destination country not specified in the ToCountryCode data element." },
    22011: { title: "InvalidAccount", info: "Account credentials not specified." },
    22012: { title: "AccountNotEnabledForDHLGM", info: "Account not enabled for DHLGM International." },
    22014: { title: "MaximumCommodityValueForCountryExceeded", info: "Maximum commodity value exceeded for destination country." },
    22015: { title: "ElementMissing", info: "Missing data element: {0}" },
    22016: { title: "InvalidShipDate", info: "Invalid data specified in ShipDate element" },
    22017: { title: "InvalidWeight", info: "WeightOz data element cannot be zero." },
    22018: { title: "InvalidCustomsData", info: "Invalid data specified in the CustomsInfo element, or CustomsInfo not allowed for product." },
    22019: { title: "CustomsItemsLimitExceeded", info: "Too many customs items specified." },
    22020: { title: "NoCustomsItemsSpecified", info: "No customs items specified." },
    22021: { title: "InvalidCustomsItem", info: "Invalid customs item. Item description: {0}" },
    22022: { title: "CustomsWeightExceedsPackageWeight", info: "The combined weight of the customs items cannot exceed the value in the WeightOz data element." },
    22023: { title: "DestinationCountryCodeNotFound", info: "Could not find country information for specified country code: {0}" },
    22024: { title: "StateMissing", info: "ToState is required for destination country {0}" },
    22025: { title: "PostalCodeMissing", info: "Postal Code is required for destination country {0}" },
    22026: { title: "PhoneRequiredForParcelDirect", info: "ToPhone is required when using GlobalMail Parcel Direct" },
    22027: { title: "PhoneNumberTooLong", info: "Phone Number for destination country {0} cannot exceed {1}" },
    22028: { title: "HSTariffNumberRequired", info: "HS Tariff Number is required for each customs item for destination country {0}" },
    22029: { title: "ItemCodeTooLong", info: "The item code for customs element with description {0} is too long. The limit is 20 characters" },
    22030: { title: "DescriptionTooLong", info: "The customs item description is limited to 50 characters. The following description is too long {0}" },
    22031: { title: "InvalidState", info: "The specified state {1} is invalid for specified country {0}" },
    22032: { title: "AccountNotAuthorizedForService", info: "Account not authorized for requested service: {0}" },
    22033: { title: "ErrorGeneratingLabel", info: "There was an error when generating the label" },
    60002: { title: "InternalLabelServiceError", info: "Internal Endicia Label Server Web Service Error: {Error Message}" },
    60003: { title: "InvalidSoapRequestFormat", info: "The format of the SOAP request is invalid." },
    60105: { title: "FailedCreatingPostageLabel", info: "Failed to create postage label." },
    60106: { title: "FailedCreatingCustomsForm", info: "Failed to create customs form." },
    60107: { title: "StampLabelNotAllowedForWebMethod", info: "A label of type Stamp cannot be created with this web method." },
    60108: { title: "StampRequestNotProcessed", info: "Stamp request not processed (account not charged)." },
    60109: { title: "StampRequestNotPrinted", info: "Stamp request not printed. Account charged but postage not printable." },
    60110: { title: "LabelNotAllowedForOfficialMail", info: "Label is not allowed for official mail." },
    60111: { title: "ClientNotAuthorizedForWebMethod", info: "Client is not authorized to invoke this web method." },
    60112: { title: "FailedCreatingSCANForm", info: "Failed to create SCAN form." },
    60113: { title: "NoShipmentsAddedToSCANForm", info: "No shipments were added to the SCAN form." },
    60115: { title: "FailedCreatingPackagePickup", info: "Failed to create the package pickup: {0}" },
    60116: { title: "NotEnoughShipmentsForPickup", info: "Not enough shipments for package pickup." },
    60118: { title: "TransactionsDateSpanTooLarge", info: "Transactions date span cannot be greater than 7 days." },
    60119: { title: "FailedRetrievingTransactions", info: "Failed retrieving transactions. {0}" },
    60120: { title: "FailedRetrievingPackageStatus", info: "Failed to retrieve Package Status." },
    60121: { title: "FailedReadingInsuranceRate", info: "Failed to read insurance rate: {0}" },
    60200: { title: "SCANFormNotFound", info: "SCAN form could not be found." },
    60201: { title: "AccountNotQualifiedForPricing", info: "Account #{Account Number} is not qualified for {Mail Class} {Pricing} pricing." },
    60202: { title: "AccountNotAuthorizedForWebMethod", info: "Account #{0} is not authorized to invoke this Web method." },
    60501: { title: "NoPostageRatesCalculated", info: "No postage rates calculated." },
    60502: { title: "FailedCalculatingPostageRates", info: "Error calculating postage rates for one or more mail classes: {0}" },
    60505: { title: "FailedToCreateAccount", info: "Failed to create account. {0}" },
    60506: { title: "ContractIdNotValid", info: "One or more Contract ID(s) are invalid." },
    60507: { title: "PartnerNotAllowedForZeroPostageStamps", info: "Partner - {0} is not allowed to print Zero Postage Stamps." },
    60508: { title: "AccountNotQualifiedForELS", info: "This account is not qualified to access Endicia Label Server. Please contact Endicia customer support at (650) 321 2640 x130 or labelserver@endicia.com." },
    60510: { title: "NoMailPiecesToManifest", info: "" },
    60511: { title: "ValidationCompareDifference", info: "" },
    60512: { title: "PhysicalAddressNotFound", info: "Physical Address Does Not Exist." },
    60513: { title: "MailingAddressNotFound", info: "Mailing Address Does Not Exist." },
    60514: { title: "CreditCardAddressNotFound", info: "Credit Card Address Does Not Exist." },
    60515: { title: "ContractTypeAlreadyExistsForAccount", info: "" },
    60519: { title: "EPRCustomFormLabelNotAllowed", info: "Endicia Pay-on-Use Return labels are not available for this address" },
    61001: { title: "MissingKeyInWebConfig", info: "Missing {0} key in web.config file." },
    61002: { title: "InvalidWebConfigValue", info: "Invalid value for {0} key in web.config file: {1}" },
    61003: { title: "MissingConnectionStringSettings", info: "Missing connection string settings for {0} in web.config file." },
    61103: { title: "InvalidColumnInTable", info: "Invalid column {0} in {1} table at row #{2}." },
    61106: { title: "CountryCodeDoesNotExist", info: "The specified country code does not exist: {0}." },
    61110: { title: "InvalidRestrictionCodeArgument", info: "Restriction Code cannot be null or empty." },
    61111: { title: "InvalidRestrictionCodesArgument", info: "Restriction Codes cannot be null or empty." },
    61112: { title: "InvalidRestrictionCodesValue", info: "Restriction Codes is not valid: {0}" },
    61113: { title: "RestrictionCodeDoesNotExist", info: "The specified restriction code does not exist: {0}." },
    61501: { title: "InvalidAccountID", info: "Account ID {0} is invalid." },
    61502: { title: "WeightExceedsUspsMaximum", info: "Weight must be 70 pounds (1120 ounces) or less." },
    61503: { title: "WeightExceedsLimitForMailService", info: "Weight is limited to {0} ounces or less for selected mail service." },
    61510: { title: "InvalidLabelDate", info: "Label date {0} is invalid." },
    61511: { title: "LabelDateOutOfRange", info: "Ship date must be within the next {0} days." },
    61520: { title: "DeclaredValueMustBePositive", info: "Declared Value must be greater than $0.00." },
    61521: { title: "DeclaredValueExceedsMaximum", info: "Declared value exceeds the {0} maximum allowed for {1}." },
    61530: { title: "NameOrCompanyNameRequired", info: "{0}'s name or company name is required." },
    61531: { title: "NoDeliveryAddressLines", info: "{0}'s address must contain at least one delivery address line." },
    61550: { title: "NoCustomsInfo", info: "Customs Info is required for an international mailpiece." },
    61552: { title: "CustomsItemsExceedLimit", info: "Customs Info cannot contain more than {0} customs items." },
    61554: { title: "InvalidCustomsItemQuantity", info: "{0} must be a positive numeric value 999999999 or less." },
    61555: { title: "InvalidCustomsItemWeight", info: "{0} must be a positive numeric value 1120 or less." },
    61556: { title: "InvalidCustomsItemValue", info: "{0} must be a positive numeric value 99999.99 or less." },
    61557: { title: "TotalCustomsValueExceedsLimit", info: "Total customs value cannot exceed {0} for {1}." },
    61559: { title: "InvalidNumberCounterMax", info: "Number Counter Max must be greater than 0." },
    61560: { title: "InvalidNumberCounter", info: "{0} doesn't exist." },
    61601: { title: "WeightExceedsLimitForMailServiceCountry", info: "Weight is limited to {0} ounces or less for selected mail service to destination country (Country Code: {1})." },
    61602: { title: "WeightExceedsLimitForContainer", info: "Weight is limited to {0} ounces or less for {1}." },
    61604: { title: "OnlinePostageNotAllowedToCountry", info: "Online postage is not allowed for selected mail service to destination country (Country Code: {0})." },
    61701: { title: "InvalidAccountIDConfirm", info: "Wrong Account ID" },
    61703: { title: "InvalidMailType", info: "Wrong mail type" },
    61704: { title: "InvalidFromZipCode", info: "Wrong sender ZIPCode" },
    61705: { title: "InvalidToZipCode", info: "Wrong addressee ZIPCode" },
    61706: { title: "InvalidWeight", info: "Weight not authorized" },
    61801: { title: "LabelNumberRequestNotValidated", info: "{0} has not been validated." },
    61802: { title: "LabelNumberServiceIsBusy", info: "The Label Number Service is busy." },
    61803: { title: "FailedOpeningDatabaseConnection1", info: "Failed opening database connection." },
    61804: { title: "FailedOpeningDatabaseConnection2", info: "Failed opening database connection ({0})." },
    61805: { title: "InvalidMailerID", info: "Invalid mailer ID: {0}." },
    61820: { title: "DatabaseOperationTimedOut", info: "Database operation timed out in {0}." },
    61821: { title: "DatabaseError", info: "A database error has occured in {0} ({1})." },
    61901: { title: "InvalidIdentity", info: "Invalid services selected for the transaction: {0}." },
    61902: { title: "MailClassNotSupportedForServiceType", info: "Mail Class ({0}) cannot be used with Service Type of {1}." },
    61903: { title: "InvalidInputForCheckDigit", info: "Number {0} is not valid for calculating check digit." },
    61904: { title: "FailedBuildingLabelNumber", info: "Failed building label number for identity {0} in {1}." },
    61905: { title: "FailedCalculatingCheckDigit", info: "Failed calculating check digit for Sequential Package ID {0}." },
    61906: { title: "FailedUpdatingLabelNumberTable", info: "Failed updating {0} for label number {1} in {2}." },
    61907: { title: "FailedInsertingCustomsDeclarationRecord", info: "Failed adding record to Customs Declaration table for label number {0} in {1}." },
    61908: { title: "FailedInsertingCustomsItemRecord", info: "Failed adding record to Customs Items table for Customs Declaration ID {0}, Item Number {1} in {2}." },
    61909: { title: "FailedInsertingCustomsUploadRecord", info: "Failed adding record to Customs Upload table for Customs Declaration ID {0} in {1}." },
    61910: { title: "InvalidContentsType", info: "Invalid contents type: {0}" },
    61911: { title: "MaxExtraServiceCodeCountExceeded", info: "The number of extra service codes exceeds what system can support." },
    61912: { title: "FailedInsertingChannelType", info: "Failed inserting channel type {0}." },
    63008: { title: "InvalidCreditCardCountryCode", info: "Invalid credit card country code" },
    63009: { title: "InvalidCCPaymentInfo", info: "Unable to verify payment information." },
    63010: { title: "UnableToVerifyCCPaymentInfo", info: "Invalid payment information. Please check and try again." }
}