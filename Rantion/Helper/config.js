define(['N/runtime'], function(runtime) {

    // 获取当前账号 用于验证 dev/sandbox/prod 环境
    var accountId = runtime.accountId;

    // 管理员角色
    var managerRoleId;
    // 供应商角色
    var vendorRoleId;
    // 国家简码对应表 中国id
    var countryCodeChinaID;

    // sandbox
    if (accountId == '6188472_SB1') {
        managerRoleId = 3;
        vendorRoleId = 16;
        countryCodeChinaID = 88;
    }
    // 正式环境
    if (accountId == 6188472) {
        vendorRoleId = 16;
    }

    return {
        managerRoleId: managerRoleId,
        vendorRoleId: vendorRoleId,
        countryCodeChinaID: countryCodeChinaID
    }
});
