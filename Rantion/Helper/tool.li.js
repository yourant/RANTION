/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-15 10:09:56
 * @LastEditTime   : 2020-07-15 20:42:25
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\Helper\tool.li.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/search', 'N/record', 'N/log'], function (search, record, log) {




    /**
     * 获取所有的库位和箱号
     * @param {Array} detailList 
     */
    function getAllBinBox(detailList) {
        // add 获取所有库位和箱号
        var allArr = [];
        for (var i_d = 0, i_dLen = detailList.length; i_d < i_dLen; i_d++) {
            var it = detailList[i_d].detailRecordList;
            for (var j_d = 0, j_dLen = it.length; j_d < j_dLen; j_d++) {
                allArr.push(it[j_d]);
            }
        }
        log.debug('allArr', allArr);

        return allArr || false;

    }

    /**
     * 判断库存或者箱号
     * @param {Array} storageList 
     * @returns {Array || Boolean} a_arr(库位/箱号 数组) || false
     */
    function judgmentBinBox(action, storageList) {
        var itemObj = SummaryBinBox(storageList);

        var boxObj = itemObj.BoxObj,
            binObj = itemObj.BinObj;

        log.debug('itemObj', itemObj);
        var BoxObjKey = Object.keys(boxObj);
        log.debug('箱号的值', BoxObjKey);
        var BinObjKey = Object.keys(binObj);
        log.debug('库位的值', BinObjKey);

        var binType = "customlist_location_bin",
            boxType = "customlist_case_number",
            a_arr = [];

        if (BoxObjKey && BoxObjKey.length > 0) {
            for (var i = 0, iLen = BoxObjKey.length; i < iLen; i++) { // 箱号动态
                var s_a = searchLocationBin(boxType, BoxObjKey[i]);
                if (!s_a) {
                    if (action == "create") {
                        var boxId = createLocationBin(boxType, BoxObjKey[i]);
                        log.debug('创建箱号 boxId', boxId);
                    } else {
                        a_arr.push("箱号" + BoxObjKey[i]);
                    }
                }
            }
        }

        if (BinObjKey && BinObjKey.length > 0) {
            for (var i = 0, iLen = BinObjKey.length; i < iLen; i++) { // 库位固定
                var s_a = searchLocationBin(binType, BinObjKey[i]);
                if (!s_a) {
                    a_arr.push("库位：" + BinObjKey[i]);
                }
            }
        }

        return a_arr || false;
    }



    /**
     * 处理出库货品数组, 根据 库位 和 箱号 进行分组
     * @param {Array} itemList 
     * @returns {Object} itemObj{BoxObj(箱号对象), BinObj(库位对象)}  || false
     */
    function SummaryBinBox(itemList) {

        var BinArr = [],
            BoxArr = [],
            sBinBox = [];

        itemList.forEach(function (item) {
            var type = item.type;
            if (type == 2) { // 未装箱, 从库位出
                BinArr.push(item)
            } else { // 已装箱, 从箱号出
                BoxArr.push(item)
            }
        });

        var BinObj = {},
            sunBinArr1 = [];
        // 同库位合并
        for (var i_bin = 0, binLen = BinArr.length; i_bin < binLen; i_bin++) {

            var sunBinArr = [];
            var bin_temp = BinArr[i_bin];

            log.audit('bin_temp', bin_temp);
            sunBinArr.push(bin_temp);
            for (var j_bin = i_bin + 1; j_bin < binLen; j_bin++) {

                var j_bin_temp = BinArr[j_bin];
                log.audit('bin_temp.positionCode == j_bin_temp.positionCode', bin_temp.positionCode == j_bin_temp.positionCode);
                if (bin_temp.positionCode == j_bin_temp.positionCode) {

                    sunBinArr.push(j_bin_temp);
                    log.audit('sunBinArr', sunBinArr);
                }
            }
            BinObj[bin_temp.positionCode] = sunBinArr;

            log.audit('sunBinArr', sunBinArr)
        }

        var BoxObj = {},
            sunBoxArr1 = [];
        // 同箱号合并
        for (var i_box = 0, boxLen = BoxArr.length; i_box < boxLen; i_box++) {
            var box_temp = BoxArr[i_box];
            var sunBoxArr = [];
            sunBoxArr.push(box_temp);
            for (var j_box = i_box + 1; j_box < binLen; j_box++) {

                var j_box_temp = BoxArr[j_box];
                if (box_temp.barcode == j_box_temp.barcode) {
                    sunBoxArr.push(j_box_temp);
                }
            }
            BoxObj[box_temp.barcode] = sunBoxArr;
        }

        var itemObj = {
            BoxObj: BoxObj,
            BinObj: BinObj
        }

        return itemObj || false;

    }

    /**
     * 搜索库存对应的列表, 通过库存(箱号)名称, 获取库位ID
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function searchLocationBin(listType, BinName) {

        var BinId;
        search.create({
            type: listType,
            filters: [{
                    name: 'name',
                    operator: 'is',
                    values: BinName
                },
                {
                    name: 'isinactive',
                    operator: 'is',
                    values: false
                }, // 排除已经非活动的记录
            ]
        }).run().each(function (rec) {
            BinId = rec.id
        });

        return BinId || false;
    }

    /**
     * 创建对应的列表记录
     * @param {String} listType  列表类型
     * @param {String} BinName  库位名称 || 箱号
     * @returns {Number || Boolean} BinId - 库位(箱号)对应的内部ID  || false
     */
    function createLocationBin(listType, BinName) {

        var BinId;

        var bin = record.create({
            type: listType
        });

        bin.setValue({
            fieldId: 'name',
            value: BinName
        });

        BinId = bin.save();

        log.debug('BinId', BinId);

        return BinId || false;
    }


    /**
     * SO单生成 ITEM_FULFILLMENT
     * @param {*} id 
     * @param {*} shipment_number 
     * @param {*} bill_id 
     * @param {*} itemLNQt 
     */
    function createItemFulfillment(id, quantity, itemId, location) {
        var f = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.ITEM_FULFILLMENT,
            fromId: Number(id)
        });
        f.setValue({
            fieldId: 'shipstatus',
            value: 'C'
        });


        return f.save() || false;
    }

    /**
     * SO单生成INVOICE
     * @param {*} id 
     * @param {*} shipment_number 
     */
    function createInvoice(id) {
        var inv = record.transform({
            fromType: record.Type.SALES_ORDER,
            toType: record.Type.INVOICE,
            fromId: Number(id)
        });
        return inv.save() || false;

    }



    return {
        SummaryBinBox: SummaryBinBox,
        searchLocationBin: searchLocationBin,
        createLocationBin: createLocationBin,
        judgmentBinBox: judgmentBinBox,
        getAllBinBox: getAllBinBox
    }
});