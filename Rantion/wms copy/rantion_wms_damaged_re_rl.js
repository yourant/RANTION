/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define([], function() {

    function _get(context) {
        
    }

    function _post(context) {
        var retjson = {};
        retjson.code = 0;
        retjson.data = {};
        retjson.msg = 'string';
        return JSON.stringify(retjson);
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
