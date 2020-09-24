'''
Author         : Li
Version        : 1.0
Date           : 2020-07-07 21:43:50
LastEditTime   : 2020-09-22 17:12:37
LastEditors    : Li
Description    :
FilePath       : \test.li.py
可以输入预定的版权声明、个性签名、空行等
'''
def success(msg):
    print (msg)

def debug(msg):
    print (msg)

def error(msg):
    print (msg)

def warning(msg):
    print (msg)

def other(msg):
    print (msg)

def notify_result(num, msg):
    numbers = {
        0 : success,
        1 : debug,
        2 : warning,
        3 : error
    }

    method = numbers.get(num, other)
    if method:
        method(msg)

if __name__ == "__main__":
    notify_result(0, "success")
    notify_result(1, "debug")
    notify_result(2, "warning")
    notify_result(3, "error")
    notify_result(4, "other")