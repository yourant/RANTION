/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function getInputData() {
        var company = [];
        search.create({
            type: 'customrecord_wms_token',
            columns: [
                'internalid', 'custrecord_wtr_user_name', 'custrecord_wtr_password',
                'custrecord_wtr_wms_gettoken_url', 'custrecord_wtr_token'
            ]
        }).run().each(function(result) {
            company.push({
                'internalid': result.getValue('internalid'),
                'username': result.getValue('custrecord_wtr_user_name'),
                'password': result.getValue('custrecord_wtr_password'),
                'url': result.getValue('custrecord_wtr_wms_gettoken_url')
            });
            return true;
        });
        log.debug('company', JSON.stringify(company));
        return company;
    }

    function map(context) {
        var company = JSON.parse(context.value);
        var url = company.url;
        var Authorization = 'Basic bnMtc2VydmVyOm5zLXNlcnZlci10ZXN0';
        var headerInfo = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "Authorization": Authorization
        };
        var response = http.post({
            url: url,
            headers: headerInfo,
            body: ["grant_type=client_credentials"].join('&')
        });
        log.debug('response', JSON.stringify(response));
        if (response.code == 200) {
            var res = JSON.parse(response.body);
            record.submitFields({
                type: 'customrecord_wms_token',
                id: company.internalid,
                values: {
                    'custrecord_wtr_token': res.access_token
                }
            });
        }
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