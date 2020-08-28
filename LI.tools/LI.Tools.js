/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-16 16:01:14
 * @LastEditTime   : 2020-08-28 20:58:22
 * @LastEditors    : Li
 * @Description    : 练习
 * @FilePath       : \LI.tools\LI.Tools.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/record', 'N/search', 'N/log', 'N/url'], function(record, search, log, url) {



    // 获取订单对应的库存
    {
        /**
         * 搜索单据的货品、地点、子公司
         * @param {String} recType
         * @param {number} recId
         * @returns {Object} {subsidiary: subs,itemArr: itemArr,location: loca,totalQty: totalQty};
         */
        function searchToLocationItem(recType, recId) {

            log.debug('recId: ' + recId, "recType: " + recType);
            var limit = 3999,
                itemArr = [],
                totalQty = 0,
                loca, subs;
            search.create({
                type: recType,
                filters: [{
                        name: "internalid",
                        operator: 'anyof',
                        values: [recId]
                    },
                    {
                        name: "mainline",
                        operator: 'is',
                        values: false
                    },
                    {
                        name: "taxline",
                        operator: 'is',
                        values: false
                    }
                ],
                columns: [
                    "item",
                    "quantity"
                ]
            }).run().each(function(rec) {
                var it = rec.getValue('item')
                if (itemArr.indexOf(it) == -1) {
                    itemArr.push(rec.getValue('item'));
                    totalQty += Math.abs(Number(rec.getValue('quantity')))
                }
                return --limit > 0;
            });


            search.create({
                type: recType,
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: recId
                    },
                    {
                        name: 'mainline',
                        operator: 'is',
                        values: true
                    }
                ],
                columns: [
                    "location", "subsidiary"
                ]
            }).run().each(function(r) {
                subs = r.getValue('subsidiary');
                loca = r.getValue('location');
            })

            var it = {
                subsidiary: subs,
                itemArr: itemArr,
                location: loca,
                totalQty: totalQty
            };

            return it || false;

        }


        /**
         * 搜索货品对应的所有地点,限制于子公司
         * @param {String} sub 子公司
         * @param {number} loca 一级地点
         * @param {Array} locaArr 货品地点数组
         * @returns {Array} loArr 货品对应的地点数组
         */
        function searchSecLoca(sub, loca, locaArr) {
            var loArr = [],
                limit = 3999

            log.debug('sub: ' + sub + " loca: " + loca, "locaArr  typeof  " + typeof(locaArr) + "    " + locaArr)
            search.create({
                type: "location",
                filters: [{
                        name: 'custrecord_dps_parent_location',
                        operator: 'anyof',
                        values: [loca]
                    }, // 父级地点
                    {
                        name: "subsidiary",
                        operator: 'anyof',
                        values: [sub]
                    }, // 子公司
                    {
                        name: 'internalid',
                        operator: 'anyof',
                        values: locaArr
                    }, // 地点
                ]
            }).run().each(function(rec) {

                // log.debug('locaArr.indexOf(rec.id) ', locaArr.indexOf(rec.id))
                if (locaArr.indexOf(rec.id) > -1) {
                    log.debug('地点的内部ID', rec.id)
                    loArr.push(rec.id);
                }
                return --limit > 0;
            });
            return loArr || false;
        }


        /**
         * 搜索对应的地点 并返回
         * @param {Array} secArr  地点数组
         * @param {Array} loca 一级地点
         * @returns {Array} thrArr 地点数组
         */
        function searchThrLoca(secArr, loca) {
            var limit = 3999,
                thrArr = secArr;

            log.debug('thrArr', thrArr);
            log.debug('secArr', secArr);
            search.create({
                type: 'location',
                filters: [{
                    name: 'custrecord_dps_parent_location',
                    operator: 'anyof',
                    values: secArr
                }]
            }).run().each(function(rec) {
                thrArr.push(rec.id);
                return --limit > 0;
            });

            thrArr.push(loca);
            return thrArr || false;

        }

        /**
         * 搜索对应货品、地点的库存量与延交订单量
         * @param {Array} itemArr 货品数组
         * @param {Array} LocaArr 地点数组
         * @returns {Object} { totalQty (库存总量): totalQty, backOrderQty(延交订单总量): backOrderQty }
         */
        function searchItemQty(itemArr, LocaArr) {


            log.debug('itemArr length: ' + itemArr.length, "LocaArr length: " + LocaArr.length)
            var limit = 3999,
                locationquantityonhand,
                backOrderQty = 0,
                totalQty = 0,
                loca;
            search.create({
                type: 'item',
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: itemArr
                    },
                    {
                        name: 'inventorylocation',
                        operator: 'anyof',
                        values: LocaArr
                    }
                ],
                columns: [
                    "locationquantityonhand", // 库存量 Location On Hand
                    "inventorylocation", // 库存地点    Inventory Location
                    "locationquantitybackordered", // 延交订单 LOCATION BACK ORDERED
                ]
            }).run().each(function(rec) {

                log.debug('locationquantityonhand: ' + rec.getValue('locationquantityonhand'), "loca: " + rec.getValue('inventorylocation'))
                totalQty += Number(rec.getValue('locationquantityonhand'));
                backOrderQty += Number(rec.getValue('locationquantitybackordered'));
                return --limit > 0;
            });

            var it = {
                totalQty: totalQty,
                backOrderQty: backOrderQty
            }

            return it || false;
        }



        /**
         * 搜索货品对应的地点
         * @param {Array} itemArr 货品数组
         * @param {Number} sub 子公司ID
         * @returns {Array} locaArr 地点数组
         */
        function searchItemLocation(itemArr, sub) {

            var limit = 3999,
                locaArr = [];
            search.create({
                type: 'item',
                filters: [{
                        name: 'internalid',
                        operator: 'anyof',
                        values: itemArr
                    },
                    {
                        name: 'subsidiary',
                        join: 'inventorylocation',
                        operator: 'anyof',
                        values: sub
                    }
                ],
                columns: [
                    "inventorylocation"
                ]
            }).run().each(function(rec) {
                locaArr.push(rec.getValue('inventorylocation'));
                return --limit > 0;
            });

            return locaArr || false;

        }



        /**
         * 判断库存是否充足
         * @param {String} recType
         * @param {Number} recId
         * @returns{Boolean} flag
         */
        function judgmentItemInventory(recType, recId) {

            var flag = false;

            // 获取单据对应的货品,子公司,地点,总数量
            var a = searchToLocationItem(recType, recId);
            log.debug('一级地点 a', a);

            //  获取货品对应的地点
            var al = searchItemLocation(a.itemArr, a.subsidiary);
            log.debug("al", al);

            // 搜索货品地点的库存
            var bl = searchSecLoca(a.subsidiary, a.location, al)
            log.debug('bl length' + bl.length, bl);
            var cl, fl

            if (bl && bl.length > 0) { // 存在库位, 则进行箱的搜索
                // 搜索库存对应的箱
                cl = searchThrLoca(bl, a.location)
                log.debug('cl length: ' + cl.length, cl);
            } else { // 不存在库存, 直接获取一级地点
                cl = [a.location]
            }
            // 搜索货品对应的库存数量和延交订单数量
            var dl = searchItemQty(a.itemArr, cl);
            var fl = dl.totalQty - dl.backOrderQty - a.totalQty;
            log.debug('fl', fl);
            if (fl >= 0) {
                log.debug('库存充足', "可以发货");
                flag = true;
            } else {
                log.debug('库存不足', "无法发货");
                flag = false;
            }
            log.debug('dl', dl);

            return flag;
        }
    }

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
        }).run().each(function(rec) {
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
            }).run().each(function(rec) {


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



const date1 = new Date('2020-08-01');
const date2 = new Date(new Date());
const diffTime = Math.abs(date2 - date1);
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
console.log(diffTime + " milliseconds");
console.log(diffDays + " days");



const _MS_PER_DAY = 1000 * 60 * 60 * 24;

// a and b are javascript Date objects
function dateDiffInDays(a, b) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// test it
const a = new Date('2020-08-01'),
    b = new Date(new Date()),
    difference = dateDiffInDays(a, b);

console.log(difference)