/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define([], function () {

    function beforeLoad(context) {

    }

    function beforeSubmit(context) {

    }

    // params：{
    //     auditTime (string): 审核时间 ,
    //     auditor (string): 审核人 ,
    //     barcode (string): 条码 装箱条码/SKU ,
    //     createBy (string): 创建人 ,
    //     createTime (string): 创建时间 ,
    //     fono (string): 报损单号 ,
    //     num (integer): 数量 ,
    //     positionCode (string): 库位编号 ,
    //     sku (string): sku ,
    //     type (integer): 类型 1:已装箱 2:未装箱 ,
    //     warehouseCode (string): 仓库编号 ,
    //     warehouseName (string): 仓库名称
    //     }
    function afterSubmit(context) {

    }

    var Dict = {
        auditTime: { key_ns: '', help: '审核时间' },
        auditor: { key_ns: '', help: '审核人' },
        barcode: { key_ns: '', help: '条码 装箱条码/SKU' },
        createBy: { key_ns: '', help: '创建人' },
        createTime: { key_ns: '', help: '创建时间' },
        fono: { key_ns: '', help: '报损单号' },
        num: { key_ns: '', help: '数量' },
        positionCode: { key_ns: '', help: '库位编号' },
        sku: { key_ns: '', help: 'sku' },
        type: { key_ns: '', help: '类型 1:已装箱 2:未装箱' },
        warehouseCode: { key_ns: '', help: '仓库编号' },
        warehouseName: { key_ns: '', help: '仓库名称' }
    }

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});
