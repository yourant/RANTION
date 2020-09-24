/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['N/record', 'N/log', 'N/search'], function (record, log, search) {

    function _get(context) {

    }

    function _post(context) {
        var result = {};
        try {
            search.create({
                type: 'vendorprepayment',
                filters: [
                    { name: 'internalid', operator: 'is', values: context.id },
                    { name: 'mainline', operator: 'is', values: false }
                ],
                columns: [{ name: 'custrecord_dps_advance_charge_time', join: 'custbody_custom_bill' },
                    'trandate']
            }).run().each(function (rs) {
                result.data = { date: rs.getValue({ name: 'custrecord_dps_advance_charge_time', join: 'custbody_custom_bill' }), trandate: rs.getValue('trandate') }
                record.submitFields({
                    type: 'vendorprepayment',
                    id: context.id,
                    values: {
                        trandate: rs.getValue({ name: 'custrecord_dps_advance_charge_time', join: 'custbody_custom_bill' })
                    }
                })
            });
        } catch (e) {
            log.debug('e', e);
            result.code = 'error';
            result.msg = e.message;
        }
        return result;
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
