/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['N/file', 'N/search'], function (file, search) {

    function onRequest(context) {
        var id = context.request.parameters.id
        var img
        if (id) {
            search.create({
                type: 'customrecord_dps_shipping_small_record',
                filters: [
                    { name: 'internalId', operator: 'is', values: id },
                ],
                columns: [
                    { name: 'custrecord_dps_fulfill_record_xh_img' }
                ]
            }).run().each(function (rec) {
                img = rec.getValue('custrecord_dps_fulfill_record_xh_img')
                return false;
            });
            if (img) {
                var fileObj = file.create({
                    name: 'test.png',
                    fileType: file.Type.PNGIMAGE,
                    contents: img,
                    description: 'This is a plain text file.',
                    encoding: file.Encoding.UTF8,
                    isOnline: true
                });
                context.response.writeFile({
                    file: fileObj,
                    isInline: true
                })
            }
        }
    }

    return {
        onRequest: onRequest
    }
});
