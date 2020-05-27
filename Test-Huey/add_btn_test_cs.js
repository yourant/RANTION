/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/record', 'N/currentRecord', 'N/log'], function(record, currentRecord, log) {

    function pageInit(context) {

    }

    function saveRecord(context) {

    }

    function validateField(context) {

    }

    function fieldChanged(context) {

    }

    function postSourcing(context) {

    }

    function lineInit(context) {

    }

    function validateDelete(context) {

    }

    function validateInsert(context) {

    }

    function validateLine(context) {

    }

    function sublistChanged(context) {

    }

    function my_test_btn() {
        var objRecord = currentRecord.get();

        //获取来源采购订单单号
        var create_from_id = objRecord.getValue({
            fieldId: 'createdfrom'
        });
        console.log('createdfrom:' + create_from_id);

        console.log('type:' + objRecord.type);
        var load_record = record.load({ id: objRecord.id, type: objRecord.type });


        //打印sublist数据
        /*
        var columnList = load_record.getSublistFields({ sublistId: 'item' });
        var sublistObj = load_record.getSublist({ sublistId: 'item' });
        for (var j = 0; j < columnList.length; j++) {
            var columnId = columnList[j];
            var columnObj = sublistObj.getColumn({ fieldId: columnId });

            var value = load_record.getSublistValue({
                sublistId: 'item',
                fieldId: columnId,
                line: 0
            });
            console.log('--' + columnObj.id + ' ' + columnObj.label + ' ' + value);
        }
        */

        //复制原采购订单
        var new_record = record.copy({
            type: 'purchaseorder',
            id: create_from_id
        });

        //获取订单子项个数
        var new_record_count = new_record.getLineCount({ sublistId: 'item' });
        console.log('new_record_count:' + new_record_count);

        //修改子项单价
        for (var i = 0; i < new_record_count; i++) {
            new_record.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: i,
                value: 0
            });

            //修改子项数量
            var quantity = load_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i
            });

            new_record.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: i,
                value: quantity
            });
        }

        //修改复制采购订单状态
        new_record.setValue({
            fieldId: 'orderstatus',
            value: 'A',
        });

        /*
        /设置复制采购订单来源单号
        new_record.setValue({
            fieldId: 'createdfrom',
            value: Number(objRecord.id),
        });
        */

        console.log(1);
        //设置采购订单创建来源
        new_record.setValue({
            fieldId: 'createdfrom',
            value: Number(create_from_id),
        });

        console.log(2);
        //设置自定义字段中“类型”的值为“换货”
        new_record.setValue({
            fieldId: 'custbody_dps_type',
            value: 1, //存放对应的值
        });
        console.log(3);

        try {
            //new_record.save();
        } catch (error) {
            log.debug('error', error);
        }

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
        my_test_btn: my_test_btn

    }
});