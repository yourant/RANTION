/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/search', 'N/http', 'N/record'], function(search, http, record) {

    function _get(context) {
        
    }

    /**
     * 查询渠道商，渠道服务
     * @param {*} context 
     */
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
                'contact': result.getValue('custrecord_lc_contact_details'),
                'children': []
            });
            return true;
        });
        var filters = [];
        if (context.business_type) {
            var type;
            if (context.business_type == 'toC') {
                type = '1';
            }
            if (context.business_type == 'toB') {
                type = '2';
            }
            if (type) {
                filters.push({ name: 'custrecord_ls_business_type', operator: 'anyof', values: type });
            }
        }
        search.create({
            type: 'customrecord_logistics_service',
            filters: filters,
            columns: [
                'internalid', 'name', 'custrecord_ls_logistics_company', 
                'custrecord_ls_bubble_count', 'custrecord_ls_location', 'custrecord_ls_business_type',
                'custrecord_ls_logistics_group', 'custrecord_ls_average_aging_days', 
                'custrecord_ls_logistics_classification', 'custrecord_ls_logistics_state'
            ]
        }).run().each(function (result) {
            var comid = result.getValue('custrecord_ls_logistics_company');
            for (var index = 0; index < company.length; index++) {
                if (comid == company[index].id) {
                    company[index].children.push({
                        'id': result.getValue('internalid'),
                        'name': result.getValue('name'),
                        'bubble_count': result.getValue('custrecord_ls_bubble_count'),
                        'location': result.getValue('custrecord_ls_location'),
                        'business_type': result.getValue('custrecord_ls_business_type'),
                        'group': result.getValue('custrecord_ls_logistics_group'),
                        'days': result.getValue('custrecord_ls_average_aging_days'),
                        'classification': result.getValue('custrecord_ls_logistics_classification'),
                        'state': result.getValue('custrecord_lc_logistics_state')
                    });
                    break;
                }
            }
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
