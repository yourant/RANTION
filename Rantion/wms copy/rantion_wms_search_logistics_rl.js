/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    function _post(context) {
        var company = [];
        var retjson = {};
        search.create({
            type: 'customrecord_logistics_company',
            columns: [
                'internalid', 'name', 'custrecord_lc_face_sheet_claim', 
                'custrecord_lc_logistics_state', 'custrecord_lc_contact_details'
            ]
        }).run().each(function (result) {
            company.push({
                'id': result.getValue('internalid'),
                'name': result.getValue('name'),
                'face_sheet': result.getValue('custrecord_lc_face_sheet_claim'),
                'state': result.getValue('custrecord_lc_logistics_state'),
                'contact': result.getValue('custrecord_lc_contact_details')
            });
            return true;
        });
        retjson.code = 0;
        retjson.data = company;
        retjson.msg = '查询成功';
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
