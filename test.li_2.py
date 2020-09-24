'''
Author         : Li
Version        : 1.0
Date           : 2020-08-31 19:42:02
LastEditTime   : 2020-09-22 15:58:53
LastEditors    : Li
Description    :
FilePath       : \test.li_2.py
可以输入预定的版权声明、个性签名、空行等
'''
import oauth2 as oauth
import json
import requests
import time

url = "https://6188472-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=370&deploy=1"
token = oauth.Token(key="cd8f7903fb0e2d9224fda7a68c39c26d86310dc09fb85e90fe8ecf5ff86ab811",
                    secret="379b6704c4d0eec3f3bcfa082dd14293f4e6c614edfd9001d4caf264724295b0")
consumer = oauth.Consumer(key="c34556c92ffaeaa510299d0e93ae1e7b02c9466c2a54d64c42d2edb7a2f5dd7b",
                          secret="bf17239de1da417f83db7afd6948767f83c27a5e5585e97be0bc061096a91b82")

http_method = "POST"
realm = "6188472_SB1"

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
print(header['Authorization'])
headery = header['Authorization'].encode('ascii', 'ignore')
headerx = {"Authorization": headery, "Content-Type": "application/json"}
print(headerx)
payload = {"operation": "moveFile", "id": "1450"}
conn = requests.post(url, data=json.dumps(payload), headers=headerx)
print("\n\nResult: " + conn.text)
print("\n\n\n")
print(conn.headers)
