/**!
 * @NApiVersion 2.x
 * @NModuleScope SameAccount
 *
 * @desc 函数库
 */
define(["require", "exports", "N/email", "N/https", "N/cache", "N/error", "N/xml", "N/record", "N/search", "N/runtime", "N/crypto", "N/encode"], function (require, exports, email, https, cache, error, xml, record, search, runtime, crypto, encode) {
    Object.defineProperty(exports, "__esModule", { value: true });
    /** 全局函数 */
    exports.bundle_authorization_checking = function () {
        var if_account_valid = cache.getCache({ name: "nsbs.global.env", scope: cache.Scope.PUBLIC }).get({
            key: 'if_account_can_use_the_bundle', loader: function (ctx) {
                var validation = JSON.parse(https.get({
                    url: "https://service-i77e98j0-1254042598.gz.apigw.tencentcs.com/release/abc?account=" + runtime.accountId,
                }).body);
                if (validation.errno) {
                    exports.handleErrorAndSendNotification(error.create({ name: "\u8F6F\u4EF6\u5305\u6388\u6743\u9519\u8BEF", message: "" + validation.error }), 'bundle_user_validation');
                    throw "NSBS\u7535\u5B50\u5546\u52A1\u5957\u4EF6\u5305: \u8F6F\u4EF6\u5305\u6388\u6743\u9519\u8BEF\u3002<br /><br />" + validation.error;
                }
                return 'YES';
            }, ttl: 60 * 60 * 24
        });
        if (if_account_valid == 'YES') {
            return true;
        }
    };
    exports.summarization = function (summary) {
        if (summary.inputSummary.error) {
            exports.handleErrorAndSendNotification(error.create({ name: 'NSBS Map/Reduce Summarize', message: summary.inputSummary.error }), 'INPUT');
        }
        exports.handleErrorInStage('MAP', summary.mapSummary);
        exports.handleErrorInStage('REDUCE', summary.reduceSummary);
        /* email.send({ author: -5, recipients: ['johnny.zhou@sunoan.com'], subject: `${runtime.accountId} DONE Notification ${runtime.getCurrentScript().id}`.toUpperCase(), body: 'DONE!' }) */
    };
    exports.handleErrorInStage = function (stage, summary) {
        var messages = [];
        summary.errors.iterator().each(function (key, value) {
            messages.push("Failure to handle stage (" + stage + ") for key " + key + " details as: " + value);
            return true;
        });
        if (messages.length > 0) {
            exports.handleErrorAndSendNotification(error.create({
                name: '_MAP_REDUCE_BACKGROUND_FAILED_',
                message: messages.join('\r\n\r\n')
            }), stage);
        }
    };
    exports.handleErrorAndSendNotification = function (e, stage) {
        https.post({
            url: 'https://open.feishu.cn/open-apis/bot/hook/7085f8b6ca444a6695b770f7969d1a36',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: "\u8D26\u53F7: " + runtime.accountId + " \r\n\r\n \u9519\u8BEF\u540D\u79F0: " + e.name + " \r\n\r\n \u8BE6\u60C5: \r\n\r\n " + e.message
            })
        });
        email.send({
            author: -5,
            recipients: ['zhouguo@douples.com'],
            subject: (stage + " " + runtime.getCurrentScript().id + "<" + runtime.getCurrentScript().deploymentId + "> " + runtime.accountId).toUpperCase(),
            body: "ACCOUNT: " + runtime.accountId + " \r\n\r\n NAME: " + e.name + " \r\n\r\n MESSAGES: \r\n\r\n " + e.message
        });
    };
    exports.load_or_create_record_by_field = function (type, field, value) {
        var r;
        search.create({
            type: "" + type,
            filters: [
                { name: "" + field, operator: search.Operator.IS, values: value }
            ]
        }).run().each(function (rec) {
            r = record.load({ type: "" + type, id: rec.id, isDynamic: true });
            return false;
        });
        if (!r) {
            r = record.create({ type: "" + type, isDynamic: true });
            r.setValue({ fieldId: "" + field, value: value });
        }
        ;
        return r;
    };
    exports.uniq = function (array) {
        var temp = {}, r = [], len = array.length;
        for (var i = 0; i < len; i++) {
            var val = array[i], type = typeof val;
            if (!temp[val]) {
                temp[val] = [type];
                r.push(val);
            }
            else if (temp[val].indexOf(type) < 0) {
                temp[val].push(type);
                r.push(val);
            }
        }
        return r;
    };
    exports.reversexml = function (el) {
        var string = "< " + el.tagName + " > ";
        if (el.firstChild && el.firstChild.nodeType == xml.NodeType.TEXT_NODE) {
            string += el.textContent;
        }
        else if (el.nodeType == xml.NodeType.ELEMENT_NODE) {
            exports.uniq(el.childNodes.map(function (node) { return node.nodeName; })).map(function (tag) {
                el.getElementsByTagName({ tagName: tag }).map(function (el) { return string += exports.reversexml(el); });
            });
        }
        string += "< /" + el.tagName + ">";
        return string;
    };
    exports.getTextContentSafe = function (res, tag) {
        return res.getElementsByTagName({ tagName: tag }).length ? res.getElementsByTagName({ tagName: tag })[0].textContent : '';
    };
    exports.checkIfSubsidiaryEnabled = function () {
        try {
            search.lookupFields({ type: search.Type.EMPLOYEE, id: '-5', columns: ['subsidiary'] }).subsidiary;
            return true;
        }
        catch (error) {
            return false;
        }
    };
    exports.md5 = function (body) {
        var md5 = crypto.createHash({ algorithm: crypto.HashAlg.MD5 });
        md5.update({ input: body, inputEncoding: encode.Encoding.UTF_8 });
        return md5.digest({ outputEncoding: encode.Encoding.HEX });
    };
    exports.getBundlePath = function () {
        return runtime.accountId == '2135494' ? 'SuiteScript/jouz.dps.netsuite' : '/.bundle/296003';
    };
});
