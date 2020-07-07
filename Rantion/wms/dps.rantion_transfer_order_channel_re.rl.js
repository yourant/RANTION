/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-06 10:30:12
 * @LastEditTime   : 2020-07-06 10:47:39
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\wms\dps.rantion_transfer_order_channel_re.rl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/log', 'N/record'], function (search, log, record) {



    function _post(context) {


        var aono = context.aono;



    }



    /**
     * 搜索调拨单的发运记录,返回对应的 发运记录ID || false
     * @param {*} aono 
     */
    function searchTraOrder(aono) {

        var tranId;
        search.create({
            type: "customrecord_dps_shipping_record",
            filters: [{
                name: 'custrecord_dps_shipping_rec_order_num',
                operator: "anyof",
                values: aono
            }]
        }).run().each(function (re) {
            tranId = re.id;
        });

        return tranId || false;
    }


    return {
        post: _post
    }
});