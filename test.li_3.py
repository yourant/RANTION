'''
Author         : Li
Version        : 1.0
Date           : 2020-09-21 10:41:49
LastEditTime   : 2020-09-25 21:19:09
LastEditors    : Li
Description    :
FilePath       : \test.li_3.py
可以输入预定的版权声明、个性签名、空行等
'''

# -*- coding: UTF-8 -*-
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time
import requests
import json
import threading
import oauth2 as oauth


pool = ThreadPoolExecutor(24)


url = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=588&deploy=1"

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


def createreportdate(value):
    temp_value = json.loads(value)
    print("开始处理报告数据")

    params = {'action': 'create_report_date', "value": temp_value}
    r1 = requests.post(url, data=json.dumps(params), headers=headerx)
    print(r1.text, "\n")
    print("结束时间", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))


def getreportdate(acc, reporttype):
    print("开始获取报告数据数据")

    params = {'action': 'get_report_date',
              "acc": acc, "reporttype": reporttype, "group": 1}
    r1 = requests.post(url, data=json.dumps(params), headers=headerx)
    new_lis = r1.text

    json_obj = json.loads(new_lis)
    accLength = len(json_obj)
    print("数据长度", accLength)

    for iac in json_obj:
        pool.submit(createreportdate, iac)


if __name__ == "__main__":
    print("开始时间", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
    getreportdate(1, 16)
