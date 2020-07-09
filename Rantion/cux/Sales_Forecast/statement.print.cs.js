/**!
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * @scriptNAME  RSF 预测工作台
 * @scriptID    customscript_rsf_forcast_workbench_cs
 * @deploymentID    customdeploy_rsf_forcast_workbench_cs
 */
define(["require", "exports", 'N/currentRecord', 'N/url'], function (require, exports, currentRecord, url) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.pageInit = function (ctx) {
        window.onbeforeunload = function (e) {
            return null;
        };
    };
    exports.fieldChanged = function (ctx) {
        if (ctx.fieldId == 'custpage_inlucde_zero_balances') {
            window.location.href = window.location.href.replace(/\&?custpage_inlucde_zero_balances=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_only_open') {
            window.location.href = window.location.href.replace(/\&?custpage_only_open=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_consolidated') {
            window.location.href = window.location.href.replace(/\&?custpage_consolidated=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_if_email') {
            window.location.href = window.location.href.replace(/\&?custpage_if_email=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_if_fax') {
            window.location.href = window.location.href.replace(/\&?custpage_if_fax=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_if_unsubscribe') {
            window.location.href = window.location.href.replace(/\&?custpage_if_unsubscribe=[T|F]?/g, '') + "&" + ctx.fieldId + "=" + (ctx.currentRecord.getValue("" + ctx.fieldId) == true ? 'T' : 'F');
        }
        else if (ctx.fieldId == 'custpage_store') {
            window.location.href = window.location.href.replace(/\&?custpage_store=\d*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_department') {
            window.location.href = window.location.href.replace(/\&?custpage_department=\d*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_site') {
            window.location.href = window.location.href.replace(/\&?custpage_site=\d*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_item') {
            window.location.href = window.location.href.replace(/\&?custpage_item=\d*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_from') {
            window.location.href = window.location.href.replace(/\&?custpage_from=\w*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_restrict') {
            window.location.href = window.location.href.replace(/\&?custpage_restrict=\w*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_email') {
            window.location.href = window.location.href.replace(/\&?custpage_email=\w*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_fax') {
            window.location.href = window.location.href.replace(/\&?custpage_fax=\w*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getValue("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_dt_to') {
            window.location.href = window.location.href.replace(/\&?custpage_dt_to=[\d\/]*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getText("" + ctx.fieldId);
        }
        else if (ctx.fieldId == 'custpage_dt_from') {
            window.location.href = window.location.href.replace(/\&?custpage_dt_from=[\d\/]*/g, '') + "&" + ctx.fieldId + "=" + ctx.currentRecord.getText("" + ctx.fieldId);
        }
    };
    exports.postSourcing = function (ctx) {
    };
    exports.sublistChanged = function (ctx) {
    };
    exports.lineInit = function (ctx) {
    };
    exports.validateField = function (ctx) {
        return true;
    };
    exports.validateLine = function (ctx) {
        return true;
    };
    exports.validateInsert = function (ctx) {
        return true;
    };
    exports.validateDelete = function (ctx) {
        return true;
    };
    exports.saveRecord = function (ctx) {
        return true;
    };
    exports.ExportSalesForecast = function () {
        var sublistId = 'custpage_sb_02';
        var curr = currentRecord.get();
        var len = curr.getLineCount({ sublistId: sublistId });
        var fils = new Array();
        console.log(len);
        if (len > 0) {
            for (var i = 0; i < len; i++) {
                fils.push({
                    "acc": curr.getSublistValue({ sublistId: sublistId, fieldId: 'store_id', line: i }),
                    "sku": curr.getSublistValue({ sublistId: sublistId, fieldId: 'sku_id', line: i })
                })
            }
            var need_fils = [];
            var po_no = [];
            if (fils.length > 0) {
                for (var i = 0; i < fils.length; i++) {
                    if (po_no.indexOf(fils[i]['acc'] + fils[i]['sku']) === -1) {
                        need_fils.push({
                            "acc": fils[i].acc,
                            "sku": fils[i].sku
                        });
                        po_no.push(fils[i]['acc'] + fils[i]['sku']);
                    }
                }
            }
            var link = url.resolveScript({
                scriptId: 'customscript_rsf_export_sl',
                deploymentId: 'customdeploy_rsf_export_sl',
                params: {
                    fils: JSON.stringify(need_fils)
                },
                returnExternalUrl: true
            });
            window.open(link);
        } else {
            alert("无数据")
        }
    }
});
