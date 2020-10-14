/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-21 20:05:15
 * @LastEditTime   : 2020-09-25 11:56:28
 * @LastEditors    : Li
 * @Description    : 删除记录 RL
 * @FilePath       : \dps.li.del.record.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/log'], function(record, search, log) {

    function _post(context) {

        try {

            var action = context.action;


            log.debug("action", action);
            if (action == "getrecorddate") {

                var _a_start = new Date();
                var limit = 1;

                var delArr = [];

                search.create({
                    type: "creditmemo",
                    filters: [
                        { name: "mainline", operator: "is", values: true },
                        { name: "datecreated", operator: "onorafter", values: ["2020-9-23"] }
                    ]
                }).run().each(function(rec) {

                    log.debug("rec", rec.id);
                    delArr.push(rec.id);

                    return --limit > 0;
                });
                log.debug('数据长度', delArr.length);

                var _b_end = new Date();

                var return_str = "总共耗时 " + (_b_end.getTime() - _a_start.getTime()) / 1000 + " S"
                log.audit("总共耗时 / s", (_b_end.getTime() - _a_start.getTime()) / 1000);

                return delArr

            } else if (action == "deleterecorddate") {

                record.delete({
                    type: 'creditmemo',
                    id: context.value
                });

                return "删除成功： " + context.value
            }


        } catch (error) {
            log.error("出错了", error);
        }
    }

    return {
        post: _post,
    }
});