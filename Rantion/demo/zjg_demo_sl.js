/*
 * @version: 1.0
 * @Author: ZJG
 * @Date: 2020-05-07 10:11:07
 * @LastEditTime: 2020-05-07 10:23:28
 * @FilePath: \Rantion_sandbox\Rantion\demo\zjg_demo_sl.js
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([], function() {

    function onRequest(context) {
        var response = context.response;
        var request = context.request;
        // var date = new Date();
        var date = '2010-04-28'
        var week = weekofday(date);
        log.debug('week',week);
        response.writeLine("week=" + week);
        
    }
    function weekofday(data) {//判断某一日属于这一年的第几周
        var dt = new Date(data)
        log.debug('dt',dt);
        var y = dt.getFullYear();
        log.debug('y',y);
        var start = "1/1/" + y;
        log.debug('start',start);
        start = new Date(start);
        log.debug('start_1',start);
        starts = start.valueOf();
        log.debug('starts',starts);
        startweek = start.getDay();
        log.debug('startweek',startweek);
        dtweek = dt.getDay();
        log.debug('dtweek',dtweek);
        var days = Math.round((dt.valueOf() - start.valueOf()) / (24 * 60 * 60 * 1000)) - (7 - startweek) - dt.getDay() - 1 ;
        log.debug('days',days);
        days = Math.floor(days / 7);
        log.debug('days_1',days);
        return (days + 2);
    }

    return {
        onRequest: onRequest
    }
});
