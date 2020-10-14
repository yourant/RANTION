'''
Author         : Li
Version        : 1.0
Date           : 2020-09-21 10:41:49
LastEditTime   : 2020-09-26 23:57:21
LastEditors    : Li
Description    : 获取报告数据, 并保存
FilePath       : \report_linux.py
可以输入预定的版权声明、个性签名、空行等
'''

# -*- coding: UTF-8 -*-
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time
import requests
import json
import threading
import os
import re
import litool as litool


pool = ThreadPoolExecutor(24)


def execCmd():
    programIsRunningCmd = "ps -ef|grep python3\ report_linux|grep -v grep"
    r = os.popen(programIsRunningCmd)
    text = r.read()
    r.close()
    return text


def createreportdate(value):
    temp_value = json.loads(value)
    print("开始处理报告数据")
    obj = litool.tool("report")

    params = {'action': 'create_report_date', "value": temp_value}
    r1 = requests.post(obj["url"], data=json.dumps(
        params), headers=obj["headerx"])
    print(r1.text, "\n")
    print("结束时间", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))


def getreportdate(acc, reporttype):
    print("开始获取报告数据数据")

    obj = litool.tool("report")

    params = {'action': 'get_report_date', "acc": acc,
              "reporttype": reporttype, "group": 1}
    r1 = requests.post(obj["url"], data=json.dumps(
        params), headers=obj["headerx"])
    new_lis = r1.text

    json_obj = json.loads(new_lis)
    accLength = len(json_obj)
    print("数据长度", accLength)

    for iac in json_obj:
        pool.submit(createreportdate, iac)


def write_log(log_content):
    time_now = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    log_content = time_now+"---->"+log_content+os.linesep
    fp = open('recognition.log', 'a+')
    fp.write(log_content)
    fp.close()


if __name__ == "__main__":
    programIsRunningCmdAns = execCmd()  # 调用函数执行指令，并返回指令查询出的信息
    print("programIsRunningCmdAns", programIsRunningCmdAns)
    ansLine = programIsRunningCmdAns.split('\n')  # 将查出的信息用换行符 '\b'分开
    # 判断如果返回行数>2则说明python脚本程序已经在运行，打印提示信息结束程序，否则运行脚本代码doSomething()
    print("ansLine", ansLine)
    if len(ansLine) > 2:
        print("linux_python have been Running")
        log_content = "process is running..."
        write_log(log_content)
        print(log_content)
    else:
        print("开始时间", time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))
        getreportdate(1, 8)
        log_content = "开始执行拉取数据..."
        write_log(log_content)
        print(log_content)
