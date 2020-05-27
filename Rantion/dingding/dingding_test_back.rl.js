/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log'], function(log) {

    function _get(context) {

    }

    function _post(context) {
        log.debug(context);
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