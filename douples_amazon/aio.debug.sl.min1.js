/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(["require", "exports", "N/config", "N/search", "./Helper/core.min", "N/ui/serverWidget"], function (require, exports, config, search, core, ui) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onRequest = function (ctx) {
        var form = ui.createForm({ title: 'Integration Detail', hideNavBar: false });
        var sb = form.addSublist({ id: 'custpage_details', label: 'NetSuite Settings', type: ui.SublistType.STATICLIST });
        sb.addField({ id: 'name', label: 'Config', type: ui.FieldType.TEXT });
        sb.addField({ id: 'value', label: 'Var', type: ui.FieldType.TEXT });
        var ln = 0;
        // �1�7�1�7�0�4�1�7�1�7�0�4
        var company_info = config.load({ type: config.Type.COMPANY_INFORMATION });
        var company_label = { companyname: 'Company Name', timezone: 'Time Zone', companyid: 'Account ID' };
        Object.keys(company_label).map(function (k) {
            sb.setSublistValue({ id: 'name', value: company_label[k], line: ln });
            sb.setSublistValue({ id: 'value', value: company_info.getValue({ fieldId: k }), line: ln });
            ln++;
        });
        // General Preferences
        var general_preferences = config.load({ type: config.Type.COMPANY_PREFERENCES });
        var general_preferences_labels = { DATEFORMAT: 'Date Format', LONGDATEFORMAT: 'Long Date Format', TIMEFORMAT: 'Time Format' };
        Object.keys(general_preferences_labels).map(function (k) {
            sb.setSublistValue({ id: 'name', value: general_preferences_labels[k], line: ln });
            sb.setSublistValue({ id: 'value', value: general_preferences.getValue({ fieldId: k }), line: ln });
            ln++;
        });
        var user_preferences = config.load({ type: config.Type.USER_PREFERENCES }), user_preferences_label = { TIMEZONE: 'Time Zone', LANGUAGE: 'User Language' };
        Object.keys(user_preferences_label).map(function (k) {
            sb.setSublistValue({ id: 'name', value: user_preferences_label[k], line: ln });
            sb.setSublistValue({ id: 'value', value: user_preferences.getValue({ fieldId: k }), line: ln });
            ln++;
        });
        var sb1 = form.addSublist({ id: 'custpage_deployments', label: 'Deployed Scripts', type: ui.SublistType.STATICLIST });
        sb1.addField({ id: 'name', label: 'Name', type: ui.FieldType.TEXT });
        sb1.addField({ id: 'type', label: 'Type', type: ui.FieldType.TEXT });
        sb1.addField({ id: 'status', label: 'Status', type: ui.FieldType.TEXT });
        var sb1ln = 0;
        search.create({
            type: 'scriptdeployment', filters: [
                { name: 'name', join: 'script', operator: search.Operator.STARTSWITH, values: 'DPS' },
                { name: 'scripttype', join: 'script', operator: search.Operator.ANYOF, values: ['MAPREDUCE', 'USEREVENT'] },
            ], columns: [
                { name: 'name', join: 'script' },
                { name: 'scripttype' },
                { name: 'status' }
            ]
        }).run().each(function (rec) {
            sb1.setSublistValue({ id: 'name', value: rec.getValue(rec.columns[0]), line: sb1ln });
            sb1.setSublistValue({ id: 'type', value: rec.getValue(rec.columns[1]), line: sb1ln });
            sb1.setSublistValue({ id: 'status', value: rec.getValue(rec.columns[2]), line: sb1ln });
            sb1ln++;
            return true;
        });
        var sb2 = form.addSublist({ id: 'custpage_account', label: 'Deployed Accounts', type: ui.SublistType.STATICLIST });
        sb2.addField({ id: 'name', label: 'Name', type: ui.FieldType.TEXT });
        sb2.addField({ id: 'marketplace', label: 'Marketplace', type: ui.FieldType.TEXT });
        sb2.addField({ id: 'currency', label: 'Currency', type: ui.FieldType.TEXT });
        sb2.addField({ id: 'dept', label: 'Dept.', type: ui.FieldType.TEXT });
        sb2.addField({ id: 'subsidiary', label: 'Subsidiary.', type: ui.FieldType.TEXT });
        sb2.addField({ id: 'order', label: 'Pull Order', type: ui.FieldType.CHECKBOX }).updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
        sb2.addField({ id: 'fbaorder', label: 'Pull FBA Order', type: ui.FieldType.CHECKBOX }).updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
        sb2.addField({ id: 'tracking', label: 'Tracking', type: ui.FieldType.CHECKBOX }).updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
        sb2.addField({ id: 'fees', label: 'Fees', type: ui.FieldType.CHECKBOX }).updateDisplayType({ displayType: ui.FieldDisplayType.DISABLED });
        var sb2ln = 0;
        search.create({
            type: core.ns.account._name, filters: [], columns: [
                { name: 'name' },
                { name: core.ns.account.marketplace },
                { name: core.ns.account.if_salesorder },
                { name: core.ns.account.if_fbaorder },
                { name: core.ns.account.eb_enable_tracking_upload },
                { name: core.ns.account.if_including_fees },
                { name: core.ns.account.currency },
                { name: core.ns.account.dept },
                { name: 'custrecord_aio_subsidiary' },
            ]
        }).run().each(function (rec) {
            sb2.setSublistValue({ id: 'name', value: rec.getValue(rec.columns[0]) || '-', line: sb2ln });
            sb2.setSublistValue({ id: 'marketplace', value: rec.getText(rec.columns[1]) || '-', line: sb2ln });
            sb2.setSublistValue({ id: 'currency', value: rec.getText(rec.columns[6]) || '-', line: sb2ln });
            sb2.setSublistValue({ id: 'dept', value: rec.getText(rec.columns[7]) || '-', line: sb2ln });
            sb2.setSublistValue({ id: 'subsidiary', value: rec.getText(rec.columns[8]) || '-', line: sb2ln });
            sb2.setSublistValue({ id: 'order', value: rec.getValue(rec.columns[2]) ? 'T' : 'F', line: sb2ln });
            sb2.setSublistValue({ id: 'fbaorder', value: rec.getValue(rec.columns[3]) ? 'T' : 'F', line: sb2ln });
            sb2.setSublistValue({ id: 'tracking', value: rec.getValue(rec.columns[4]) ? 'T' : 'F', line: sb2ln });
            sb2.setSublistValue({ id: 'fees', value: rec.getValue(rec.columns[5]) ? 'T' : 'F', line: sb2ln });
            sb2ln++;
            return true;
        });
        ctx.response.writePage(form);
    };
});
