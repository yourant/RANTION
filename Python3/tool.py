'''
Author         : Li
Version        : 1.0
Date           : 2020-09-22 16:58:34
LastEditTime   : 2020-09-22 19:19:47
LastEditors    : Li
Description    :
FilePath       : \Python3\tool.py
可以输入预定的版权声明、个性签名、空行等
'''

import oauth2 as oauth
import time


def tool(type_url):
    url = ''

    if type_url == "task":
        # 触发脚本
        url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=578&deploy=1"
    elif type_url == "getorder":
        # 转换销售订单
        url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=370&deploy=1"
    elif type_url == "transformorder":
        # 拉取销售订单
        url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=327&deploy=1"
    elif type_url == "report":
        # 拉取报告
        url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=588&deploy=1"
    else:
        # 删除记录数据
        url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=589&deploy=1"

    token = oauth.Token(key="8fb97dc1bb1297658a87bb88497a39665c05790e4ae7e297d0072d624b23428b",
                        secret="295345f7f36bcba3eb3658a8648cf3e70b5c1da4b5999208b5e53e3545b90db3")
    consumer = oauth.Consumer(key="82872acfebd26d19c55bd7bc5ddcd5f340af9be8c5b319ab2ace5b2a2dd710d8",
                              secret="e2bb72e3b39d3d5b5b5973f21dca3254e4fc60de74487e2084fb400d415aaa61")

    http_method = "POST"
    realm = "6188472"

    params = {
        'oauth_version': "1.0",
        'oauth_nonce': oauth.generate_nonce(),
        'oauth_timestamp': str(int(time.time())),
        'oauth_token': token.key,
        'oauth_consumer_key': consumer.key
    }

    req = oauth.Request(method=http_method, url=url, parameters=params)
    signature_method = oauth.SignatureMethod_HMAC_SHA1()
    req.sign_request(signature_method, consumer, token)
    header = req.to_header(realm)
    headery = header['Authorization'].encode('ascii', 'ignore')
    headerx = {"Authorization": headery, "Content-Type": "application/json"}

    re = {
        "headerx": headerx,
        "url": url
    }

    return re
