/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-07-20 21:02:30
 * @LastEditTime   : 2020-07-27 19:23:42
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Rantion\to\ue\TONumber_ue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {

    }


    function beforeSubmit(context) {
        var newRec = context.newRecord;
        try {
            var type = context.type;
            log.debug("context.type", context.type);
            if (type == "create") {
                var trandate = newRec.getValue('trandate'),
                    country;
                log.debug(" beforeSubmit trandate", trandate);
                var T_loca = newRec.getValue('custbody_actual_target_warehouse');
                search.create({
                    type: "location",
                    filters: [{
                        name: "internalidnumber",
                        operator: "equalto",
                        values: T_loca
                    }],
                    columns: [{
                        name: "custrecord_cc_country_code",
                        join: "custrecord_aio_country_sender"
                    }]
                }).run().each(function (e) {
                    country = e.getValue(e.columns[0]);
                });
                // country = T_loca.split(".")[1];
                log.debug("guojia：", country)
                if (country) {
                    trandate = JSON.stringify(trandate).split("T")[0].replace(/[-"]/g, "").substring(2, 8); // 获取年月日
                    var pn = "TO" + country + trandate;

                    var serial_number = 0;
                    search.create({
                        type: 'customrecord_dps_transferorder_tranid',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: 1
                        }],
                        columns: [
                            "name"
                        ]
                    }).run().each(function (r) {
                        serial_number = r.getValue('name')
                    });

                    var a_num = Number(serial_number);
                    var str;

                    if (a_num >= 10 && a_num < 100) {
                        str = "00" + (a_num + 1);
                    } else if (a_num >= 100 && a_num < 1000) {
                        str = "0" + (a_num + 1);
                    } else if (a_num >= 1000) {
                        str = '' + a_num;
                    } else {
                        str = "000" + (a_num + 1);
                    }

                    log.debug('str', str);
                    pn = pn + str;
                    log.debug("beforeSubmit pn", pn);
                    log.debug("beforeSubmit 设置之前的tranid ", newRec.getValue("tranid"));
                    newRec.setValue({
                        fieldId: "tranid",
                        value: pn
                    });

                    // 更新流水号
                    record.submitFields({
                        type: 'customrecord_dps_transferorder_tranid',
                        id: 1,
                        values: {
                            name: Number(str),
                            custrecord_dps_to_serial_number: Number(str),
                            custrecord_dps_to_serial_no_updatedate: new Date().toISOString()
                        }
                    });

                    // TO + country + 日期 6 位  + 4 流水号
                    log.debug("beforeSubmit 设置之后的anid ", newRec.getValue("tranid"));
                }
            }
        } catch (e) {
            log.error("error ", e);
        }
    }


    /**
     * 设置订单编号
     * @param {} context 
     */
    function afterSubmit(context) {


    }









    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});