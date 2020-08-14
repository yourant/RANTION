/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-08-13 14:06:27
 * @LastEditTime   : 2020-08-13 14:12:06
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\fulfillment.record\dps.delete.ful.box.info.sl.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/search', 'N/record', 'N/log', 'N/runtime'], function(search, record, log, runtime) {

    function onRequest(context) {
        
        var userObj = runtime.getCurrentUser();

        if(userObj.role == 3){
            
        }

        
    }

    return {
        onRequest: onRequest
    }
});
