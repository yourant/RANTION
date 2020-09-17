/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-13 17:05:25
 * @LastEditTime   : 2020-09-07 14:39:34
 * @LastEditors    : Li
 * @Description    :
 * @FilePath       : \li.test.js
 * @可以输入预定的版权声明、个性签名、空行等
 */


/**
 * 处理 JP/AU 的时区问题
 * @param {*} dateText  text格式的时间
 * @param {*} accountName  店铺名称
 */
function dealWithDate(dateText, accountName) {

    var temp_time = new Date(dateText).toISOString()
    if (accountName.indexOf(".JP") > -1) {

        var time_jp_add = 9
        var temp_z_jp_add = new Date(new Date(temp_time).getTime() + time_jp_add * 60 * 60 * 1000).toISOString();
        var re_tiem_jp = temp_z_jp_add.replace(".000Z", "+09:00");
        return re_tiem_jp;
    } else if (accountName.indexOf(".AU") > -1) {
        var time_au_add = 10;
        var temp_z_au_add = new Date(new Date(temp_time).getTime() + time_au_add * 60 * 60 * 1000).toISOString();
        var re_tiem_au = temp_z_au_add.replace(".000Z", "+10:00");
        return re_tiem_au;
    } else {
        return dateText;
    }
}