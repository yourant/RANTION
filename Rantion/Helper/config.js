define(['N/runtime'], function(runtime) {

    // 获取当前账号 用于验证 dev/sandbox/prod 环境
    var accountId = runtime.accountId;
    // 环境URL
    var service_url;

    // 管理员角色
    var managerRoleId;
    // 供应商角色
    var vendorRoleId;
    // 国家简码对应表 中国id
    var countryCodeChinaID;
    // WMS接口URL
    var WMS_Debugging_URL;
    // 获取订单联系人
    var order_GJ_URL;
    // 交货单
    var invoice_record_id;

    // 库存调整订单类型---盘盈
    var panying_transfer_type;
    // 库存调整订单类型---盘亏
    var deficit_transfer_type;
    // 公账采购订单模板
    var po_report_public_file_id;
    // 私账采购订单模板
    var po_report_private_file_id;

    // sandbox
    if (accountId == '6188472_SB1') {
        managerRoleId = 3;
        vendorRoleId = 16;
        countryCodeChinaID = 88;
        WMS_Debugging_URL = 'http://47.107.254.110:18082/rantion-wms';
        order_GJ_URL = 'http://47.107.254.110:18082';
        panying_transfer_type = 32;
        deficit_transfer_type = 33;
        invoice_record_id = 185;
        po_report_public_file_id = 10980;
        po_report_private_file_id = 11584;
        service_url = 'https://6188472-sb1.app.netsuite.com';
    }
    // 正式环境
    if (accountId == 6188472) {
        managerRoleId = 3;
        vendorRoleId = 16;
        countryCodeChinaID = 88;
        WMS_Debugging_URL = 'http://wms.rantion-admin.com/rantion-wms';
        order_GJ_URL = 'http://wms.rantion-admin.com';
        panying_transfer_type = 32;
        deficit_transfer_type = 33;
        invoice_record_id = 185;
        po_report_public_file_id = 10980;
        po_report_private_file_id = 11584;
        service_url = 'https://6188472.app.netsuite.com';
    }

    return {
        managerRoleId: managerRoleId,
        vendorRoleId: vendorRoleId,
        countryCodeChinaID: countryCodeChinaID,
        WMS_Debugging_URL: WMS_Debugging_URL,
        panying_transfer_type: panying_transfer_type,
        deficit_transfer_type: deficit_transfer_type,
        invoice_record_id: invoice_record_id,
        order_GJ_URL: order_GJ_URL,
        po_report_public_file_id: po_report_public_file_id,
        po_report_private_file_id: po_report_private_file_id,
        service_url: service_url
    }
});
