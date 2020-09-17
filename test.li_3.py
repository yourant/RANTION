'''
Author         : Li
Version        : 1.0
Date           : 2020-07-07 21:43:50
LastEditTime   : 2020-08-31 19:56:22
LastEditors    : Li
Description    :
FilePath       : \test.li copy 2.py
可以输入预定的版权声明、个性签名、空行等
'''
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time
import requests
import json
import threading


def task(arg1, arg2):
    print(arg1, arg2)
    time.sleep(1)


# pool = ProcessPoolExecutor(10)
pool = ThreadPoolExecutor(4)  # 线程数


def Getorders(acc):

    email = "licanlin@douples.com"
    account = "6188472"
    # account = "6188472_SB1"
    signature = "@LiCanLin1907"
    headers = {
        "Authorization": "NLAuth nlauth_account=" + account + ", nlauth_email=" + email + ", nlauth_signature= " + signature + ", nlauth_role=3",
        "Content-Type": "application/json"}
    link = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=472&deploy=1"
    r1 = requests.get(url=link, params={'op': 'create_fin_DealData', "objs": acc,
                                        "last_updated_after": "2020-05-31T00:00:00.000Z", "last_updated_before": "2020-07-30T00:00:00.000Z"}, headers=headers)
    print(r1.text)


def GetAcc(acc_group):

    print('开始处理数据',"开始处理数据")
    email = "licanlin@douples.com"
    account = "6188472"
    # account = "6188472_SB1"
    signature = "@LiCanLin1907"
    headers = {
        "Authorization": "NLAuth nlauth_account=" + account + ", nlauth_email=" + email + ", nlauth_signature= " + signature + ", nlauth_role=3",
        "Content-Type": "application/json"}
    link = "https://6188472.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=472&deploy=1"
    r1 = requests.get(url=link, params={'op': 'create_fin_getData', "acc": acc_group, "bj": "F",
                                        "last_updated_after": "2020-05-31T00:00:00.000Z", "last_updated_before": "2020-07-30T00:00:00.000Z"}, headers=headers)
    new_lis = r1.text
    # new_lis = new_lis.split(",")
    # print(new_lis)
    json_obj = json.loads(new_lis)
    for iac in json_obj:
        # Getorders(json.dumps(iac))
        try:
            pool.submit(Getorders,  json.dumps(iac))
        except ZeroDivisionError as err:
            print('Handling run-time error:', err)


class Person(object):

    def __init__(self):
        print("init")

    def speak(self):
        GetAcc(5)


if __name__ == "__main__":
    # p = Person()
    # while True:
    #     timer = threading.Timer(18, p.speak)
    #     timer.start()
    #     timer.join()
    # num = 0
    # while True:
    #     num = num+1
    #     print("执行第"+str(num) + "次")
    #     GetAcc("")
    #     time.sleep(8010)
    GetAcc(102)


# 19          GONEX.US      14741 条
# 102        MAGICFLY.US   28091 条
# 31       KEEDOX.US                 12871   条
# 21       DONNERDIRECT.US           39252  条
