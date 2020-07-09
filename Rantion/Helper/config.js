define(['N/runtime'], function(runtime) {

    // 获取当前账号 用于验证 dev/sandbox/prod 环境
    var accountId = runtime.accountId;

    // 管理员角色
    var managerRoleId;
    // 供应商角色
    var vendorRoleId;
    // 国家简码对应表 中国id
    var countryCodeChinaID;
    // WMS接口URL
    var WMS_Debugging_URL;
    // 交货单
    var invoice_record_id;

    // 库存调整订单类型---盘盈
    var panying_transfer_type;
    // 库存调整订单类型---盘亏
    var deficit_transfer_type;

    // sandbox
    if (accountId == '6188472_SB1') {
        managerRoleId = 3;
        vendorRoleId = 16;
        countryCodeChinaID = 88;
        WMS_Debugging_URL = 'http://47.107.254.110:18082/rantion-wms';
        panying_transfer_type = 32;
        deficit_transfer_type = 33;
        invoice_record_id = 185;
    }
    // 正式环境
    if (accountId == 6188472) {
        managerRoleId = 3;
        vendorRoleId = 16;
        countryCodeChinaID = 88;
        WMS_Debugging_URL = 'http://47.107.254.110:18082/rantion-wms';
        panying_transfer_type = 32;
        deficit_transfer_type = 33;
        invoice_record_id = 185;
    }

    return {
        managerRoleId: managerRoleId,
        vendorRoleId: vendorRoleId,
        countryCodeChinaID: countryCodeChinaID,
        WMS_Debugging_URL: WMS_Debugging_URL,
        panying_transfer_type: panying_transfer_type,
        deficit_transfer_type: deficit_transfer_type,
        invoice_record_id: invoice_record_id
    }
});
