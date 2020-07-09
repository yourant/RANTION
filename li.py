'''
@Author         : Li
@Version        : 1.0
@Date           : 2020-07-08 20:39:43
@LastEditTime   : 2020-07-09 19:03:49
@LastEditors    : Li
@Description    :
@FilePath       : \li.py
@可以输入预定的版权声明、个性签名、空行等
'''

import grequests
import time
url = "https://6188472-sb1.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=307&deploy=1&compid=6188472_SB1&h=489b4ff9955d7b8d5cfa"

link = "https://6188472-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=327&deploy=1"
count = 5
while count:

    start = time.time()

    headers1 = {
        'Authorization': "NLAuth nlauth_account=6188472_SB1,nlauth_email=licanlin@douples.com,nlauth_signature=@LiCanLin1907,nlauth_role=3",
        'Content-Type': "application/json"
    }
    params1 = {'op': 'pullorder', "acc": 164, "last_updated_after": "2020-06-01T00:00:00.000Z",
              "last_updated_before": "2020-06-30T23:59:59.999Z"}
    req_list = [grequests.get(url=link, params=params1, headers=headers1)
                ]
# req_list = [grequests.post(
#     url, data={"Id": "li"}, headers=headers1) for i in range(10)]
    res_list = grequests.map(req_list, size=50)
    print(res_list)
    print(time.time()-start)
    count = count-1
    print(count)


"""
def func():
    email = "lujianpeng@douples.com";
    account = "6188472_SB1";
    signature = "";
    headers = {
        "Authorization": "NLAuth nlauth_account=" + account + ", nlauth_email=" + email + ", nlauth_signature= " + signature + ", nlauth_role=3",
        "Content-Type": "application/json"};
    link = "https://6188472-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=327&deploy=1";
    # r1 = requests.get(url='http://dict.baidu.com/s', params={'wd': 'python'})
    r1 = requests.get(url=link, params={'op': 'pullorder', "acc": 164,
                                        "last_updated_after": "2020-06-01T00:00:00.000Z", "last_updated_before": "2020-06-30T23:59:59.999Z"}, headers=headers);
    print(r1.text);
    timer = threading.Timer(5, func);
    timer.start();
"""
