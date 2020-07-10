define(['N/search', 'N/record'], function (search, record) {

    function findRequestRecord(request_code, request_status, request_type) {
        var rs = false;
        var filters = [];
        filters.push({ name: 'custrecord_request_code', operator: 'is', values: request_code });
        if (request_status != null) {
            filters.push({ name: 'custrecord_request_status', operator: 'equalto', values: request_status });
        }
        if (request_type != null) {
            filters.push({ name: 'custrecord_request_type', operator: 'is', values: request_type });
        }
        search.create({
            type: 'customrecord_request_record',
            filters: filters,
            columns: [
                'custrecord_request_code',
                'custrecord_request_content',
                'custrecord_response_content',
                'custrecord_request_status',
                'custrecord_request_type'
            ]
        }).run().each(function (result) {
            rs = {
                custrecordRequestCode: result.getValue('custrecord_request_code'),
                custrecordRequestContent: result.getValue('custrecord_request_content'),
                custrecordResponseContent: result.getValue('custrecord_response_content'),
                custrecordRequestStatus: result.getValue('custrecord_request_status'),
                custrecordRequestType: result.getValue('custrecord_request_type')
            }
            return true;
        });
        return rs;
    }

    function saveRequestRecord(request_code, request_content, response_content, request_status, request_type) {
        var rs = findRequestRecord(request_code, 1, request_type);
        if (!rs) {
            var rec = record.create({
                type: 'customrecord_request_record'
            })
            rec.setValue({
                fieldId: 'custrecord_request_content',
                value: request_content
            });
            rec.setValue({
                fieldId: 'custrecord_response_content',
                value: response_content
            });
            rec.setValue({
                fieldId: 'custrecord_request_status',
                value: request_status
            });
            rec.setValue({
                fieldId: 'custrecord_request_code',
                value: request_code
            });
            rec.setValue({
                fieldId: 'custrecord_request_type',
                value: request_type
            });
            return rec.save();
        }
        return false;
    }


    return {
        findRequestRecord: findRequestRecord,
        saveRequestRecord: saveRequestRecord
    }

});