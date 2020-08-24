/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'], function (search, record) {

    /**
     * Function called upon sending a POST request to the RESTlet.
     *
     * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
     * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
     * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
     * @since 2015.2
     */
    function doPost(requestDto) {
        var name = requestDto.name;
        var responseDto = {};
        // try {
        var filters = [];
        var responseData = [];
        filters.push({ name: 'entityid', operator: 'contains', values: name });
        search.create({
            type: 'vendor',
            filters: filters,
            columns: [
                'entityid'
            ]
        }).run().each(function (result) {
            responseData.push({
                name: result.getValue("entityid")
            });
            return true;
        });
        responseDto.data = responseData;
        responseDto.code = 0;
        // } catch (error) {
        //     responseDto.code = 1;
        //     responseDto.msg = error;
        //     responseDto.param = requestDto;
        // }
        return JSON.stringify(responseDto);
    }

    return {
        post: doPost
    };

});
