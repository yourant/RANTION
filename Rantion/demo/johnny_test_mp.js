/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(["N/search", "N/record", "N/http", 'N/url', 'N/https', '../Helper/logistics_cost_calculation.js', '../Helper/location_preferred.js', '../../douples_amazon/Helper/Moment.min.js', 'N/format', 'N/runtime'], 
function (search, record, http, url, https, costCal, loactionPre, moment, format, runtime) {

    function getInputData() {
        var sss = [];
        search.create({
            type: 'customrecord_dps_juge_po',
            // filters: [
            //     { name: 'custrecord_juge_wrong', operator: 'is', values: false }
            // ],
            columns: [
                'custrecord_juge_po', 'custrecord_juge_time', 'custrecord_juge_product', 'custrecord_juge_quantiy', 'custrecord_juge_location',
                'custrecord_juge_sho', 'custrecord_juge_wrong'
            ]
        }).run().each(function (rec) {
            var s = rec.getValue('custrecord_juge_sho');
            var v = rec.getValue('custrecord_juge_wrong');
            // if (s && !v) {
                sss.push(rec);
            // }
            return true;
        });
        return sss;
    }

    function map(context) {
        var juge = JSON.parse(context.value);
        log.debug('juge', juge.getValue('custrecord_juge_po') + ' _ ' + juge.getValue('custrecord_juge_sho'));
    }

    function reduce(context) {
        
    }

    function summarize(summary) {
        
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
