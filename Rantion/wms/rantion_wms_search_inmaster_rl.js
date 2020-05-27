/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define([ 'N/search', 'N/http', 'N/record' ], function(search, http, record) {

    function _get(context) {
        var token, retdata;
        var message = {};
        var code = 0;
        search.create({
            type: 'customrecord_wms_token',
            filters: [{ name: 'internalid', operator: 'anyof', values: 1 }],
            columns: [ 'custrecord_wtr_token' ]
        }).run().each(function (result) {
            token = result.getValue('custrecord_wtr_token');
        });
        if (token) {
            var id = context.inMasterId;
            var url = 'http://47.107.254.110:18082/rantion-wms/inMaster/' + id;
            var response = http.get({
                url : url,
                headers : headerInfo
            });
            log.debug('response', JSON.stringify(response));
            retdata = JSON.stringify(response);
        } else {
            code = 1;
            retdata = '{\'msg\' : \'WMS token失效，请稍后再试\'}';
        }
        message.code = code;
        message.data = retdata;
        return message;
    }

    function _post(context) {
        
    }

    function _put(context) {
        
    }

    function _delete(context) {
        
    }

    return {
        get: _get,
        post: _post,
        put: _put,
        delete: _delete
    }
});
