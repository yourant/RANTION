/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-16 16:01:14
 * @LastEditTime   : 2020-06-18 20:02:57
 * @LastEditors    : Li
 * @Description    : 练习
 * @FilePath       : \LI.tools\LI.Tools.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/record', 'N/search', 'N/log', 'N/url'], function (record, search, log, url) {



    /**
     * 获取记录的url, 处理变成新建记录的URL
     * @param {*} recType 
     */
    function toRecord(recType) {
        var output = url.resolveRecord({
            recordType: recType,
            recordId: 6,
            isEditMode: true
        });

        var a = output.split("&id=");
        var url = a[0];

        return url || false;
    }

    function searchCurrencyExchangeRates(recCurrency) {

        var exchangerate;

        search.create({
            type: 'currency',
            filters: [{
                name: "symbol",
                operator: "startswith",
                values: recCurrency,
            }],
            columns: [
                "exchangerate"
            ]
        }).run().each(function (rec) {
            exchangerate = rec.getValue('exchangerate')
        });

        log.debug('searchCurrencyExchangeRates exchangerate', exchangerate);

        return exchangerate || false;

    }

    var Transaction = {

        /**
         * 获取当前订单的延交订单的货品数量, 若存在延交订单数量大于 0, 返回 true; 否则返回 false;
         * @param {String} recType 
         * @param {String} recId 
         * @returns {Boolean} true || false
         */
        qtyBackOrdered: function qtyBackOrdered(recType, recId) {
            var flag = true;
            var backOrder = 0;

            var recObj = record.load({
                type: recType,
                id: recId
            });
            var numLines = recObj.getLineCount({
                sublistId: 'item'
            });

            for (var i = 0; i < numLines; i++) {

                var backQty = recObj.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantitybackordered',
                    line: i
                });
                backOrder += Number(backQty);
            }
            log.debug('backOrder', backOrder);
            if (backOrder > 0) {
                // 延交订单数量大于 0
                flag = false;
            }
            return flag;
        }
    };

    var Record = {

        /**
         * 返回一个加载的记录对象
         * @param {string} recType 
         * @param {string} recId 
         */
        loadRecord: function loadRecord(recType, recId) {
            return record.load({
                type: recType,
                id: recId
            })
        },

        /**
         * 返回对应子列表的行数
         * @param {Object} recObj 
         * @param {String} recSubId 
         */
        getLineCount: function getLineCount(recObj, recSubId) {
            return recObj.getLineCount({
                sublistId: recSubId
            });
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recSubId 
         * @param {String} recField 
         * @param {String} recValue 
         * @param {String} recLine 
         */
        setSublistValue: function setSublistValue(recObj, recSubId, recField, recValue, recLine) {
            recObj.setSublistValue({
                sublistId: recSubId,
                fieldId: recField,
                value: recValue,
                line: recLine
            });
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recSubId 
         * @param {String} recField 
         * @param {String} recText 
         * @param {String} recLine 
         */
        setSublistText: function setSublistText(recObj, recSubId, recField, recText, recLine) {
            recObj.setSublistText({
                sublistId: recSubId,
                fieldId: recField,
                text: recText,
                line: recLine
            });
        },
        /**
         * 
         * @param {Object} recObj 
         * @param {String} recSubId 
         * @param {String} recField 
         */
        getSublistValue: function getSublistValue(recObj, recSubId, recField, recLine) {
            return recObj.getSublistValue({
                sublistId: recSubId,
                fieldId: recField,
                line: recLine
            })
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recSubId 
         * @param {String} recField 
         * @param {String} recLine 
         */
        getSublistText: function getSublistText(recObj, recSubId, recField, recLine) {
            return recObj.getSublistText({
                sublistId: recSubId,
                fieldId: recField,
                line: recLine
            });
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recField 
         */
        getValue: function getValue(recObj, recField) {
            return recObj.getValue({
                name: recField
            });
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recField 
         */
        getText: function getText(recObj, recField) {
            return recObj.getText({
                name: recField
            });
        },
        /**
         * 
         * @param {Object} recObj 
         * @param {String} recField 
         */
        setValue: function getValue(recObj, recField, recValue, recLine) {
            recObj.setValue({
                fieldId: recField,
                value: recValue,
                line: recLine
            });
        },

        /**
         * 
         * @param {Object} recObj 
         * @param {String} recField 
         */
        setText: function setText(recObj, recField, recValue, recLine) {
            recObj.setText({
                fieldId: recField,
                value: recValue,
                line: recLine
            });
        },
    };


    var Search = {

        searchType: function searchType(recType, recFilter, recColumn, recLimit) {

            search.create({
                type: recType,
                filters: recFilter,
                columns: recColumn
            }).run().each(function (rec) {


                return --recLimit > 0;
            });
        }
    }




    return {
        Transaction: Transaction,
        Record: Record,
        Search: Search
    }
});