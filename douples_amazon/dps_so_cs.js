/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'],
    /**
     * @param {search} search
     */
    function (search, record) {

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
            return true
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
            var curr = scriptContext.currentRecord;
            //如果更改字段是参数 
            if (scriptContext.fieldId == "entity") {
                var entity = curr.getValue('entity'),
                    loca, acc;
                search.create({
                    type: "customrecord_aio_account",
                    filters: [
                        "custrecord_aio_customer", "anyof", entity
                    ],
                    columns: ["custrecord_aio_fbaorder_location"]
                }).run().each(function (e) {
                    acc = e.id
                    loca = e.getValue(e.columns[0])
                })
                console.log("location:", loca)
                if (acc)
                    curr.setValue({
                        fieldId: "custbody_sotck_account",
                        value: acc
                    })
                if (loca)
                    curr.setValue({
                        fieldId: "location",
                        value: Number(loca)
                    })
            }
            return true
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
            return true
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
            return true
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
            return true
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

            // console.log('scriptContext.fieldId', scriptContext.fieldId);
            if (scriptContext.fieldId == "item") { // 根据选择的店铺和货品获取对应的 SellerSKU

                var CurRec = scriptContext.currentRecord;

                var account = CurRec.getValue('custbody_sotck_account'); // 店铺
                var itemId = CurRec.getCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                });

                var sku;
                if (itemId && account) {
                    sku = searchSKU(itemId, account);
                }
                if (sku) {
                    CurRec.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_aio_amazon_msku',
                        value: sku,
                        ignoreFieldChange: true
                    });
                }
            }



            return true;
        }


        /**
         * 根据店铺和货品的对应关系获取 SellerSKU
         * @param {*} itemId 
         * @param {*} account 
         */
        function searchSKU(itemId, account) {
            var SellerSku;
            search.create({
                type: "customrecord_aio_amazon_seller_sku",
                filters: [{
                        name: 'custrecord_ass_sku',
                        operator: 'anyof',
                        values: [itemId]
                    },
                    {
                        name: 'custrecord_ass_account',
                        operator: 'anyof',
                        values: account
                    }
                ],
                columns: [
                    "name"
                ]
            }).run().each(function (rec) {
                SellerSku = rec.getValue('name');
            });

            return SellerSku || false;
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
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            lineInit: lineInit,
            validateField: validateField,
            validateLine: validateLine,
            validateInsert: validateInsert,
            validateDelete: validateDelete,
            saveRecord: saveRecord,
        };

    });