'''
Author         : Li
Version        : 1.0
Date           : 2020-09-26 16:56:32
LastEditTime   : 2020-09-26 23:51:43
LastEditors    : Li
Description    :
FilePath       : \linux_python.py
可以输入预定的版权声明、个性签名、空行等
'''

import os
import re
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import requests
import json
import threading

# execute command, and return the infomation. 执行命令并返回命令输出信息

pool = ThreadPoolExecutor(5)

test_arr = [1,2,3,4,5,6,7,8,9,0]

def execute_cmd(cmd):
    r = os.popen(cmd)
    text = r.read()
    r.close()
    return text


def do_something():
    while 1:
        print("start Running")
        time.sleep(30)
        for iac in test_arr:
            pool.submit(print_data, iac)



def print_data(data):
    print("data",data)
    time.sleep(30)


if __name__ == '__main__':
    # ps -ef是linux查看进程信息指令，|是管道符号导向到grep去查找特定的进程,最后一个|是导向grep过滤掉grep进程：因为grep查看程序名也是进程，会混到查询信息里
    programIsRunningCmd = "ps -ef|grep python3\ linux_python|grep -v grep"
    programIsRunningCmdAns = execute_cmd(
        programIsRunningCmd)  # 调用函数执行指令，并返回指令查询出的信息

    print("programIsRunningCmdAns",programIsRunningCmdAns)
    ansLine = programIsRunningCmdAns.split('\n')  # 将查出的信息用换行符‘\b’分开
    # 判断如果返回行数>2则说明python脚本程序已经在运行，打印提示信息结束程序，否则运行脚本代码doSomething()
    print("ansLine",ansLine)
    if len(ansLine) > 2:
        print("linux_python have been Running")
    else:
        do_something()
