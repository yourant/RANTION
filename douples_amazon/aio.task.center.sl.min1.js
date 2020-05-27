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
define(["require", "exports", "N/search", "N/task", "N/ui/serverWidget"], function (require, exports, search, task, ui) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onRequest = function (ctx) {
        var form = ui.createForm({ title: 'MP�ű���������', hideNavBar: true }), _a = (ctx.request.parameters['custpage_script_id'] || '').split('|'), current_script_id = _a[0], current_deployment_id = _a[1];
        var fg = form.addFieldGroup({ id: "fg1", label: "Map/Reduce" });
        var sid = form.addField({ id: 'custpage_script_id', type: 'select', label: 'Script ID', container: 'fg1' });
        if (current_script_id && current_deployment_id) {
            var link = form.addField({ id: 'custpage_script_link', type: ui.FieldType.URL, label: 'Link', container: 'fg1' });
            link.updateDisplayType({ displayType: ui.FieldDisplayType.INLINE });
            link.linkText = 'Status';
            link.defaultValue = '/app/common/scripting/mapreducescriptstatus.nl?whence=';
        }
        search.create({
            type: 'scriptdeployment',
            filters: [
                { name: 'name', join: 'script', operator: 'startswith', values: 'DPS' },
                { name: 'scripttype', join: 'script', operator: 'anyof', values: 'MAPREDUCE' }
            ],
            columns: [
                { name: 'scriptid' },
                { name: 'title' },
                { name: 'scriptid', join: 'script' },
                { name: 'name', join: 'script' }
            ]
        }).run().each(function (rec) {
            sid.addSelectOption({
                value: rec.getValue(rec.columns[2]) + "|" + rec.getValue(rec.columns[0]),
                text: rec.getValue(rec.columns[1]) + "::" + rec.getValue(rec.columns[0]),
                isSelected: rec.getValue(rec.columns[2]) + "|" + rec.getValue(rec.columns[0]) == ctx.request.parameters['custpage_script_id']
            });
            return true;
        });
        form.addSubmitButton({
            label: '������'
        });
        if (ctx.request.method == 'POST') {
            var _b = ctx.request.parameters['custpage_script_id'].split('|'), script_id = _b[0], deployment_id = _b[1], mrTask = task.create({ taskType: task.TaskType.MAP_REDUCE });
            mrTask.scriptId = script_id.toLowerCase();
            mrTask.deploymentId = deployment_id;
            mrTask.submit();
        }
        ctx.response.writePage(form);
    };
});
