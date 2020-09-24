'''
Author         : Li
Version        : 1.0
Date           : 2020-07-08 20:39:43
LastEditTime   : 2020-09-22 17:12:11
LastEditors    : Li
Description    :
FilePath       : \li.py
可以输入预定的版权声明、个性签名、空行等
'''
#!/usr/bin/python
# -*- coding: UTF-8 -*-

import time
import pymysql

# 格式化成2016-03-20 11:45:39形式
print (time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))

# 格式化成Sat Mar 28 22:24:24 2016形式
print (time.strftime("%a %b %d %H:%M:%S %Y", time.localtime()))

# 将格式字符串转换为时间戳
a = "Sat Mar 28 22:24:24 2016"
print(time.mktime(time.strptime(a, "%a %b %d %H:%M:%S %Y")))

print("定时查询任务状态",time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()))



# 打开数据库连接
db = pymysql.connect("localhost","root","LICLin20","li" )

# 使用 cursor() 方法创建一个游标对象 cursor
cursor = db.cursor()

# try:
#     cursor.execute("INSERT INTO li.LI_PYTHON_TEST (ID, NAME) VALUES (2,'python 操作1')")
#     # 提交到数据库执行
#     db.commit()
# except Exception as ex:
#     print("出现如下异常%s"%ex)
#     # 如果发生错误则回滚
#     db.rollback()

# 使用 execute()  方法执行 SQL 查询
cursor.execute("SELECT * FROM LI_PYTHON_TEST")

# 使用 fetchone() 方法获取单条数据.
# data = cursor.fetchone()


result_2 = cursor.fetchall()  # 多条数据结果集

for res in result_2:
    print ("Data : %s %s" % res)
    print (res[0][0],res[1])
# print ("Database version : %s %s" % data)
# print ("Database version :  ",result_2)
print("python 处理成功")

# 关闭数据库连接
db.close()



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