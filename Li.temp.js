/*
 * @Author         : Li
 * @Version        : 1.0
 * @Date           : 2020-06-19 19:48:19
 * @LastEditTime   : 2020-06-19 20:03:08
 * @LastEditors    : Li
 * @Description    : 
 * @FilePath       : \Li.temp.js
 * @可以输入预定的版权声明、个性签名、空行等
 */


function forvpmd(id) {
    var vpmhRec = record.load({
        type: 'customrecord_vemdor_price_manage_h',
        id: id
    });

    var supplier = vpmhRec.getValue('custrecord_vpmh_supplier');
    var subsidiary = vpmhRec.getValue('custrecord_vpmh_subsidiary');
    var status = vpmhRec.getValue('custrecord_vmph_check_status');
    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');

    log.debug('status', status);

    var newSublistCount = vpmhRec.getLineCount({
        sublistId: 'recmachcustrecord_vpmd_link'
    });
    log.debug("newSublistCount", newSublistCount);

    // 当前记录的货品货品组
    var itemArr = [];

    // 循环当前的货品行
    for (var index = 0; index < newSublistCount; index++) {
        // 获取当前行的货品
        var newPartNo = vpmhRec.getSublistValue({
            sublistId: 'recmachcustrecord_vpmd_link',
            fieldId: 'custrecord_vpmd_part_no',
            line: index
        });
        // 获取当前行的数量
        var newQuantity = vpmhRec.getSublistValue({
            sublistId: 'recmachcustrecord_vpmd_link',
            fieldId: 'custrecord_vmpd_quantity',
            line: index
        });
        // 获取当前行的货币
        var newCurrency = vpmhRec.getSublistValue({
            sublistId: 'recmachcustrecord_vpmd_link',
            fieldId: 'custrecord_vmpd_currency',
            line: index
        });

        // 获取当前行的生效日期
        var newEffectiveDateStr = vpmhRec.getSublistValue({
            sublistId: 'recmachcustrecord_vpmd_link',
            fieldId: 'custrecord_vmpd_effective_date',
            line: index
        });
        // 获取当前行的失效日期
        var newExpirationDateStr = vpmhRec.getSublistValue({
            sublistId: 'recmachcustrecord_vpmd_link',
            fieldId: 'custrecord_vmpd_expiration_date',
            line: index
        });

        var newEffDate = format.parse({
            value: newEffectiveDateStr,
            type: format.Type.DATE
        });
        var newExpDate = format.parse({
            value: newExpirationDateStr,
            type: format.Type.DATE
        });

        // 每一行, 只与下一行货品相同的进行比较与操作
        for (var j = index + 1; j < newSublistCount; j++) {
            // 获取当前行的货品
            var jnewPartNo = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vpmd_part_no',
                line: j
            });
            // 获取当前行的数量
            var jnewQuantity = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_quantity',
                line: j
            });
            // 获取当前行的货币
            var jnewCurrency = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_currency',
                line: j
            });

            // 获取当前行的生效日期
            var jnewEffectiveDateStr = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_effective_date',
                line: j
            });
            // 获取当前行的实现日期
            var jnewExpirationDateStr = vpmhRec.getSublistValue({
                sublistId: 'recmachcustrecord_vpmd_link',
                fieldId: 'custrecord_vmpd_expiration_date',
                line: j
            });

            var jnewEffDate = format.parse({
                value: jnewEffectiveDateStr,
                type: format.Type.DATE
            });
            var jnewExpDate = format.parse({
                value: jnewExpirationDateStr,
                type: format.Type.DATE
            });
            if (jnewPartNo == newPartNo && jnewQuantity == newQuantity && jnewCurrency == newCurrency && (jnewEffDate - newEffDate) > 0) {

                var newExpirationDateStr = vpmhRec.setSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_expiration_date',
                    line: index,
                    value: format.parse({
                        value: getNextDate(jnewEffDate, -1, dateFormat),
                        type: format.Type.DATE
                    })
                });

                break;
            }
            if (jnewPartNo == newPartNo && jnewQuantity == newQuantity && jnewCurrency == newCurrency && (jnewEffDate - newEffDate) < 0) {

                var newExpirationDateStr = vpmhRec.setSublistValue({
                    sublistId: 'recmachcustrecord_vpmd_link',
                    fieldId: 'custrecord_vmpd_expiration_date',
                    line: j,
                    value: format.parse({
                        value: getNextDate(newEffDate, -1, dateFormat),
                        type: format.Type.DATE
                    })
                });
                break;
            }
        }

    }
    return true;
}