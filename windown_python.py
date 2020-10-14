'''
Author         : Li
Version        : 1.0
Date           : 2020-07-07 21:43:50
LastEditTime   : 2020-09-26 23:44:10
LastEditors    : Li
Description    : windown 下查看对应进程是否已经启动
FilePath       : \windown_python.py
可以输入预定的版权声明、个性签名、空行等
'''

# coding: utf-8
import os
import psutil
import time

filetext = "pid.log"

def write_pid():
    pid = os.getpid()
    print("write_pid",pid)
    fp = open(filetext,'w')
    fp.write(str(pid))
    fp.close()

def read_pid():
    if os.path.exists(filetext):
        fp = open(filetext,'r')
        pid = fp.read()
        fp.close()
        return pid
    else:
        return False

def write_log(log_content):
    time_now = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
    log_content = time_now+"---->"+log_content+os.linesep
    fp = open('recognition.log','a+')
    fp.write(log_content)
    fp.close()

def run():

    pid = read_pid()
    print("pid", pid)
    if pid:
        pid = int(pid)
        running_pid = psutil.pids()
        # print("running_pid",running_pid)
        if pid in running_pid:
            log_content =  "process is running..."
            write_log(log_content)
            print(log_content)
        else:
            write_pid()
            time.sleep(20)
    else:
        write_pid()
        time.sleep(20)

if __name__ == "__main__":
    while 1:
        run()
        time.sleep(20)