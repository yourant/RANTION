/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/url'], function(url) {

    function pageInit(context) {
        
    }

    function saveRecord(context) {
        return true;
    }

    function validateField(context) {
        return true;
    }

    function fieldChanged(context) {
        
    }

    function postSourcing(context) {
        
    }

    function lineInit(context) {
        
    }

    function validateDelete(context) {
        return true;
    }

    function validateInsert(context) {
        return true;
    }

    function validateLine(context) {
        return true;
    }

    function sublistChanged(context) {
        
    }

    function report_po(po_id, subsidiary) {
        var action;
        if (subsidiary == 5) {
            action = 'private';
        } else {
            action = 'public';
        }
        var reportSuitelet = url.resolveScript({
            scriptId: 'customscript_dps_po_report_public_sl',
            deploymentId: 'customdeploy_dps_po_report_public_sl',
            params: {
                action: action,
                id: po_id
            }
        });
        window.open(reportSuitelet, '_self');
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged,
        report_po: report_po
    }
});
