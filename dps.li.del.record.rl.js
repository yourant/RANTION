/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-09-21 20:05:15
 * @LastEditTime   : 2020-09-22 16:23:02
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

            var _a_start = new Date();
            var limit = 1000;

            var delArr = [];

            search.create({
                type: 'customrecord_amazon_fulfill_invtory_rep',
                filters: [{
                        name: "custrecord_invful_snapshot_date_txt",
                        operator: "startswith",
                        values: ["2020-07-"]
                    },
                    {
                        name: "created",
                        operator: "onorbefore",
                        values: ["2020-9-20 11:59 pm"]
                    }
                ]
            }).run().each(function(rec) {

                log.debug("rec  id", rec.id);

                record.delete({
                    type: 'customrecord_amazon_fulfill_invtory_rep',
                    id: rec.id
                });
                delArr.push(rec.id);

                return --limit > 0;

            });

            log.debug('数据长度', delArr.length);

            var _b_end = new Date();

            var return_str = "总共耗时 " + (_b_end.getTime() - _a_start.getTime()) / 1000 + " S"
            log.audit("总共耗时 / s", (_b_end.getTime() - _a_start.getTime()) / 1000);

            return return_str
        } catch (error) {
            log.error("出错了", error);
        }
    }

    return {
        get: _post,
        post: _post,
    }
});