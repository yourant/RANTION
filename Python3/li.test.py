'''
Author         : Li
Version        : 1.0
Date           : 2020-09-21 10:41:49
LastEditTime   : 2020-09-23 22:46:19
LastEditors    : Li
Description    :
FilePath       : \Python3\li.test.py
可以输入预定的版权声明、个性签名、空行等
'''

# -*- coding: UTF-8 -*-
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time
import requests
import json
import threading
import tool


pool = ThreadPoolExecutor(24)

accArr = [1, 3, 5, 12, 14, 16, 17, 19, 21, 23, 24, 31, 33, 35, 40, 41, 43,
          48, 49, 54, 56, 57, 67, 69, 72, 77, 78, 83, 86, 91, 92, 97, 102, 104, 106,
          111, 113, 115, 117, 118, 120, 122, 127, 129, 134, 136, 138, 143, 145, 148,
          149, 154, 156, 158, 163, 164, 166, 171, 172, 174, 179, 184, 186, 187, 189,
          194, 196, 201, 203, 204, 206, 211, 213, 218, 220, 221, 222, 227, 237, 313,
          314, 315, 321, 323, 324, 341, 415, 618
          ]


def createreportdate(value):
    obj = tool.tool("report")
    temp_value = json.loads(value)
    print("开始处理报告数据")

    params = {'action': 'create_report_date', "value": temp_value}
    r1 = requests.post(obj["url"], data=json.dumps(
        params), headers=obj["headerx"])
    print(r1.text, "\n")


def getreportdate(acc, reporttype):
    print("开始获取报告数据数据")
    obj = tool.tool("report")
    print("url", obj["url"])
    print("headerx", obj["headerx"])

    params = {'action': 'get_report_date',
              "acc": acc, "reporttype": reporttype}
    r1 = requests.post(obj["url"], data=json.dumps(
        params), headers=obj["headerx"])
    new_lis = r1.text

    json_obj = json.loads(new_lis)
    accLength = len(json_obj)
    print("数据长度", accLength)

    for iac in json_obj:
        pool.submit(createreportdate, iac)


if __name__ == "__main__":

    getreportdate(1, 19)
