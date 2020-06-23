/**!
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 *
 * @apply message
 * @scriptNAME
 * @scriptID    customscript_rsf_optional_email_ue
 * @deploymentID    customdeploy_rsf_optional_email_ue
 */
define(["require", "exports", "N/search", "N/record", "N/log"], function (require, exports, search, record, log) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.afterSubmit = function (ctx) {
        var rec = ctx.newRecord;
        if (ctx.type == ctx.UserEventType.CREATE) {
            if (rec.getValue('recipient')) {
                try {
                    search.create({
                        type: search.Type.CUSTOMER,
                        filters: [
                            { name: 'internalid', operator: search.Operator.ANYOF, values: rec.getValue('recipient') }
                        ],
                        columns: [
                            { name: 'custentity_nsbs_optional_email' },
                        ]
                    }).run().each(function (r) {
                        if (r.getValue('custentity_nsbs_optional_email')) {
                            // rec.setValue({ fieldId: 'cc', value: r.getValue('custentity_nsbs_optional_email') });
                            var fs = [];
                            for (var line = 0; line < rec.getLineCount({ sublistId: 'mediaitem' }); line++) {
                                fs.push(rec.getSublistValue({ sublistId: 'mediaitem', fieldId: 'mediaitem', line: line }));
                            }
                            var m_1 = record.create({ type: record.Type.MESSAGE, isDynamic: true });
                            m_1.setValue({ fieldId: 'author', value: rec.getValue('author') });
                            m_1.setValue({ fieldId: 'emailed', value: true });
                            m_1.setValue({ fieldId: 'recipientemail', value: r.getValue('custentity_nsbs_optional_email') });
                            m_1.setValue({ fieldId: 'subject', value: rec.getValue('subject') || '~~~' });
                            m_1.setValue({ fieldId: 'message', value: rec.getValue('message') || '~~~' });
                            fs.map(function (f) {
                                m_1.selectNewLine({ sublistId: 'mediaitem' });
                                m_1.setCurrentSublistValue({ sublistId: 'mediaitem', fieldId: 'mediaitem', value: f });
                                m_1.commitLine({ sublistId: 'mediaitem' });
                            });
                            m_1.save();
                            log.emergency('m', m_1);
                            // email.send({
                            //     author: Number(rec.getValue('author')),
                            //     recipients: [<string>r.getValue('custentity_nsbs_optional_email')],
                            //     subject: <string>rec.getValue('subject'),
                            //     body: <string>rec.getValue('message'),
                            //     attachments: fs,
                            // });
                        }
                        return false;
                    });
                }
                catch (error) {
                    log.emergency('err', error);
                }
            }
        }
    };
});
