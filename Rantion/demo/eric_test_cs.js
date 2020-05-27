/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['../Helper/CryptoJS.min', 'N/search', 'N/log', 'N/record', 'N/currentRecord', 'N/http', 'N/url', 'N/ui/dialog'], function (cryptoJS, search, log, record, currentRecord, http, url, dialog) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

        console.log('record_type:' + scriptContext.currentRecord.type);
        console.log('record_type:' + scriptContext.currentRecord.id);
        eric_record = record.load({
            type: scriptContext.currentRecord.type,
            id: scriptContext.currentRecord.id
        });
        var jour = record.create({ type: 'journalentry', isDynamic: true });
        // jour.setValue({ fieldId: 'memo', value: '测试备注' });
        // jour.setValue({ fieldId: 'subsidiary', value: '2' });
        // jour.setValue({ fieldId: 'currency', value: 'USD' });
        // jour.setValue({ fieldId: 'custbody_pr_store', value: 'custbody_pr_store' });
        // jour.setValue({ fieldId: 'custbody_jour_orderid', value: 'custbody_jour_orderid' });
        // jour.setValue({ fieldId: 'custbody_curr_voucher', value: '测试凭证' });

        // jour.setValue({ fieldId: 'trandate', value: new Date() });
        // jour.save();
        var page = 100;
        search.create({
            type: "journalentry",
            columns: [
                { name: "memo" }
            ]
        }).run().each(function (e) {
            console.log('journalentry:' + JSON.stringify(e));
            if (page == 0) {
                return false;
            }
            var journalentryItem = record.load({
                type: "journalentry",
                id: e.id
            });
            console.log("journalentryItem: " + JSON.stringify(journalentryItem));
            console.log("line: " + JSON.stringify(journalentryItem.getSublist({ sublistId: "line" })));
            // journalentryItem.setSublistValue({ sublistId: 'line', fieldId: 'memo', value: "测试备注", line: 0 })
            // journalentryItem.save();
            page--;
            return true;
        })




        console.log(JSON.stringify(eric_record));
        console.log('end-test');

    }

    function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
        console.log('customizeGlImpact:');
        var bookId = book.getId();
        if (!book.isPrimary()) {
            var bookRec = nlapiLoadRecord('accountingbook', bookId);
        }
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        return true;
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
    }
});