'''
@Author         : Li
@Version        : 1.0
@Date           : 2020-07-07 21:43:50
@LastEditTime   : 2020-07-09 19:12:07
@LastEditors    : Li
@Description    :
@FilePath       : \test.li.py
@可以输入预定的版权声明、个性签名、空行等
'''

#!/usr/bin/python3

import threading
import time
import requests
import json

exitFlag = 0


acc = [1, 2, 3, 4, 5, 6, 7, 8]


class myThread (threading.Thread):
    def __init__(self, threadID, name, counter):
        threading.Thread.__init__(self)
        self.threadID = threadID
        self.name = name
        self.counter = counter

    def run(self):
        print("开始线程：" + self.name)
        print_time(self.name, self.counter, 1)
        print("退出线程：" + self.name)


def print_time(threadName, delay, counter):
    link = "https://6188472-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=327&deploy=1"

    while counter:

        for i in acc:

            start = time.time()

            headers1 = {
                'Authorization': "NLAuth nlauth_account=6188472_SB1,nlauth_email=licanlin@douples.com,nlauth_signature=@LiCanLin1907,nlauth_role=3",
                'Content-Type': "application/json"
            }
            params1 = {'op': 'pullorder', "acc": i, "last_updated_after": "2020-06-01T00:00:00.000Z",
                       "last_updated_before": "2020-06-30T23:59:59.999Z"}
    # req_list = [grequests.get(url=link, params=params1, headers=headers1)

            print(params1)

            # url = "https://6188472-sb1.extforms.netsuite.com/app/site/hosting/scriptlet.nl?script=307&deploy=1&compid=6188472_SB1&h=489b4ff9955d7b8d5cfa"
            # r = requests.get(url)
            # a = requests.get(url=link, params=params1, headers=headers1)
            # print(threadName, a.text)

            if exitFlag:
                threadName.exit()
            time.sleep(delay)
            print("%s: %s: " % (threadName, time.ctime(time.time())), counter)

        counter -= 1


# 创建新线程
thread1 = myThread(1, "Thread-1", 1)
thread2 = myThread(2, "Thread-2", 2)

# 开启新线程
thread1.start()
thread2.start()
thread1.join()
thread2.join()
print("退出主线程")
