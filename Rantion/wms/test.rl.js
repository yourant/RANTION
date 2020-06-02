/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search'], function(log, record, search) {

    function _get(context) {

    }

    function _post(context) {

        var id;
        search.create({
            type: "item"
        }).run().each(function(e) {
            log.error(e);
            id = e.id;
        })
        log.error(id);
        record.load({
            id: id,
            type: "item"
        });

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