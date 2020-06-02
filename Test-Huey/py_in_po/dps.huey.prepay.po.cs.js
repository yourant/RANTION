/**
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 */
define(['N/log',
    'N/currentRecord',
    'N/https',
    'N/url',
    'N/ui/dialog',
    'N/record',
    'N/search'
], function(log, currentRecord, https, url, dialog, record, search) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        console.log(scriptContext.currentRecord.Type);
        B();
    }

    function B() {
        var data = '工商银行[4011]CNY,银行存款-工商银行[4011]CNY,1002.01;' +
            '工商银行[3748]USD,银行存款-工商银行[3748]USD,1002.02;' +
            '广发银行[0170]CNY,银行存款-广发银行[0170]CNY,1002.03;' +
            '广发银行[0350]CNY,银行存款-广发银行[0350]CNY,1002.04;' +
            '广发银行[0620]USD,银行存款-广发银行[0620]USD,1002.05;' +
            '招商银行[0701]CNY,银行存款-招商银行[0701]CNY,1002.06;' +
            '招商银行[2902]USD,银行存款-招商银行[2902]USD,1002.07;' +
            '汇丰银行[3011]CNY,银行存款-汇丰银行[3011]CNY,1002.08;' +
            '农业银行[5659]CNY,银行存款-农业银行[5659]CNY,1002.09;' +
            '华夏银行[1277]CNY,银行存款-华夏银行[1277]CNY,1002.10;' +
            '中信银行[4200]HKD,银行存款-中信银行[4200]HKD,1002.11;' +
            '中信银行[4201]USD,银行存款-中信银行[4201]USD,1002.12;' +
            '中信银行[4202]JPY,银行存款-中信银行[4202]JPY,1002.13;' +
            '中信银行[4205]GBP,银行存款-中信银行[4205]GBP,1002.14;' +
            '中信银行[4206]AUD,银行存款-中信银行[4206]AUD,1002.15;' +
            '中信银行[4209]CAD,银行存款-中信银行[4209]CAD,1002.16;' +
            '中信银行[4210]SGD,银行存款-中信银行[4210]SGD,1002.17;' +
            '中信银行[4218]CNY,银行存款-中信银行[4218]CNY,1002.18;' +
            '中信银行[4228]EUR,银行存款-中信银行[4228]EUR,1002.19;' +
            '兴业银行[1077]USD,银行存款-兴业银行[1077]USD,1002.20;' +
            '兴业银行[8997]CNY,银行存款-兴业银行[8997]CNY,1002.21;' +
            '袁奕宏中信银行[0156]CNY,银行存款-袁奕宏中信银行[0156]CNY,1002.22;' +
            '黄科农业银行[3579]CNY,银行存款-黄科农业银行[3579]CNY,1002.23;' +
            '黄姗中信银行[1906]CNY,银行存款-黄姗中信银行[1906]CNY,1002.24;' +
            '袁奕宏招行[8588]CNY,银行存款-袁奕宏招行[8588]CNY,1002.25;' +
            '何海峰招行银行[8166]CNY,银行存款-何海峰招行银行[8166]CNY,1002.26;' +
            '罗铭深中国银行[4769]CNY,银行存款-罗铭深中国银行[4769]CNY,1002.27;' +
            '黄技中国银行[7748]CNY,银行存款-黄技中国银行[7748]CNY,1002.28;' +
            '罗铭深农村商业银行[8250]CNY,银行存款-罗铭深农村商业银行[8250]CNY,1002.29;' +
            '温毅明农村商业银行[1593]CNY,银行存款-温毅明农村商业银行[1593]CNY,1002.30;' +
            '罗铭深华夏银行[7380]CNY,银行存款-罗铭深华夏银行[7380]CNY,1002.31;' +
            '温毅明广发银行[0079]CNY,银行存款-温毅明广发银行[0079]CNY,1002.32;' +
            '何海峰广发银行[8677]CNY,银行存款-何海峰广发银行[8677]CNY,1002.33;' +
            '陈华秋广发银行[7873]CNY,银行存款-陈华秋广发银行[7873]CNY,1002.34;' +
            '建设银行[1338]CNY,银行存款-蓝驰汇创建设银行[1338]CNY,1002.35;' +
            '广发银行[0173]CNY,银行存款-蓝驰汇创广发银行[0173]CNY,1002.36;' +
            '广发银行[0353]USD,银行存款-蓝驰汇创广发银行[0353]USD,1002.37;' +
            '广发银行[0566]CNY,银行存款-蓝图创拓广发银行[0566]CNY,1002.38;' +
            'Paypal-[gzrantion@163.com]USD,其他货币资金-Paypal-[gzrantion@163.com]USD,1012.01.01;' +
            'Paypal-[gzrantion@163.com]CAD,其他货币资金-Paypal-[gzrantion@163.com]CAD,1012.01.02;' +
            'Paypal-[gzrantion@163.com]EUR,其他货币资金-Paypal-[gzrantion@163.com]EUR,1012.01.03;' +
            'Paypal-[gzrantion@163.com]GBP,其他货币资金-Paypal-[gzrantion@163.com]GBP,1012.01.04;' +
            'Paypal-[gzrantion@163.com]AUD,其他货币资金-Paypal-[gzrantion@163.com]AUD,1012.01.05;' +
            'Paypal-[gzrantion@163.com]JPY,其他货币资金-Paypal-[gzrantion@163.com]JPY,1012.01.06;' +
            'Payoneer-[maylinxie@rantion.com]USD,其他货币资金-Payoneer-[maylinxie@rantion.com]USD,1012.02.01;' +
            'Payoneer-[maylinxie@rantion.com]CAD,其他货币资金-Payoneer-[maylinxie@rantion.com]CAD,1012.02.02;' +
            'Payoneer-[maylinxie@rantion.com]EUR,其他货币资金-Payoneer-[maylinxie@rantion.com]EUR,1012.02.03;' +
            'Payoneer-[maylinxie@rantion.com]GBP,其他货币资金-Payoneer-[maylinxie@rantion.com]GBP,1012.02.04;' +
            'Payoneer-[maylinxie@rantion.com]AUD,其他货币资金-Payoneer-[maylinxie@rantion.com]AUD,1012.02.05;' +
            'Payoneer-[maylinxie@rantion.com]JPY,其他货币资金-Payoneer-[maylinxie@rantion.com]JPY,1012.02.06;' +
            '连连支付-[2130]USD,其他货币资金-连连支付-[2130]USD,1012.03.01;' +
            '连连支付-[2130]CAD,其他货币资金-连连支付-[2130]CAD,1012.03.02;' +
            '连连支付-[2130]EUR,其他货币资金-连连支付-[2130]EUR,1012.03.03;' +
            '连连支付-[2130]JPY,其他货币资金-连连支付-[2130]JPY,1012.03.04;' +
            '连连支付-[2130]AUD,其他货币资金-连连支付-[2130]AUD,1012.03.05;' +
            '连连支付-[2130]GBP,其他货币资金-连连支付-[2130]GBP,1012.03.06;' +
            '连连支付-[2130]CNY,其他货币资金-连连支付-[2130]CNY,1012.03.07;' +
            '连连支付-[2130]IDR,其他货币资金-连连支付-[2130]IDR,1012.03.08;' +
            '连连支付-[2130]SGD,其他货币资金-连连支付-[2130]SGD,1012.03.09;' +
            '支付宝-[何海峰hai88300@163.com]CNY,其他货币资金-支付宝-[何海峰hai88300@163.com]CNY,1012.05.01;' +
            '支付宝-[2338749479@qq.com]CNY,其他货币资金-支付宝-[2338749479@qq.com]CNY,1012.05.02;' +
            '支付宝-[fu@rantion.com]CNY,其他货币资金-支付宝-[fu@rantion.com]CNY,1012.05.03;' +
            'Pingpong-[1417]USD,其他货币资金-Pingpong-[1417]USD,1012.08.01;' +
            'Pingpong-[1417]CAD,其他货币资金-Pingpong-[1417]CAD,1012.08.02;' +
            'Pingpong-[1417]EUR,其他货币资金-Pingpong-[1417]EUR,1012.08.03;' +
            'Pingpong-[1417]JPY,其他货币资金-Pingpong-[1417]JPY,1012.08.04;' +
            'Pingpong-[1417]AUD,其他货币资金-Pingpong-[1417]AUD,1012.08.05;' +
            'Pingpong-[1417]GBP,其他货币资金-Pingpong-[1417]GBP,1012.08.06;' +
            'Pingpong-[1417]CNY,其他货币资金-Pingpong-[1417]CNY,1012.08.07;' +
            '苏宁支付-[3254]CNY,其他货币资金-苏宁支付-[3254]CNY,1012.10.01;' +
            '汇付天下-[10220010387]CNY,其他货币资金-汇付天下-[10220010387]CNY,1012.12.01;' +
            '支付宝-陈华秋[xizhilang108@126.com]CNY,其他货币资金-支付宝-陈华秋[xizhilang108@126.com]CNY,1012.05.04;' +
            'hossen建设银行[5804],其他应收款-单位-往来,1221.02.02;' +
            'hoseen花旗银行[1029]USD,其他应收款-单位-往来,1221.02.02;' +
            'hoseen花旗银行[1002]HKD,其他应收款-单位-往来,1221.02.02;' +
            '招商银行[0566]CNY,银行存款-蓝图创拓广发银行[0566]CNY,1002.38';

        data_array = data.split(';');

        data_array.forEach(function(item, i) {
            var item_array = item.split(',');
            var account = '';
            console.log(item_array[2]);
            search.create({
                type: 'account',
                filters: [{
                    name: 'acctnumber',
                    operator: 'EQUALTO',
                    values: Number(item_array[2])
                }],
            }).run().each(function(res) {
                account = res.id;
                console.log(res);
            });

            if (isNaN(account))
                return;

            var new_record = record.create({
                type: 'customrecord_dps_bank_type'
            });

            new_record.setValue({
                fieldId: 'custrecord_dps_bank_type',
                value: item_array[0]
            })
            var id = new_record.save();
            console.log(item_array[0] + ' :' + id);

        });





    }


    function A() {
        var data =
            '办公费用,办公费,销售费用-办公费,6601.01;' +
            '办公费用,通讯费,销售费用-通讯费,6601.12;' +
            '办公费用,修理费,销售费用-修理费,6601.13;' +
            '办公费用,物料消耗,销售费用-物料消耗,6601.14;' +
            '办公费用,装修费,销售费用-装修费,6601.17;' +
            '办公费用,培训费,销售费用-培训费,6601.18;' +
            '办公费用,软件数据服务费,销售费用-软件数据服务费,6601.45;' +
            '办公费用,办公费,管理费用-办公费,6602.01;' +
            '办公费用,通讯费,管理费用-通讯费,6602.1;' +
            '办公费用,修理费,管理费用-修理费,6602.11;' +
            '办公费用,物料消耗,管理费用-物料消耗,6602.12;' +
            '办公费用,招聘费,管理费用-招聘费,6602.17;' +
            '办公费用,培训费,管理费用-培训费,6602.18;' +
            '办公费用,装修费,管理费用-装修费,6602.19;' +
            '办公费用,软件数据服务费,管理费用-软件数据服务费,6602.27;' +
            '办公费用,会议费,管理费用-会议费,6602.31;' +
            '办公费用,固定资产,固定资产-办公设备,1601.01;' +
            '办公费用,固定资产,固定资产-运输设备,1601.02;' +
            '办公费用,固定资产,固定资产-机械设备,1601.03;' +
            '办公费用,固定资产,固定资产-后勤设备,1601.04;' +
            '办公费用,低值易耗品,管理费用-低值易耗品,6602.29;' +
            '办公费用,低值易耗品,销售费用-低值易耗品,6601.39;' +
            '租金水电管理费,办公租金水电费,销售费用-办公租金水电费,6601.38;' +
            '差旅费,差旅费,销售费用-差旅费,6601.08;' +
            '差旅费,市内交通费,销售费用-市内交通费,6601.19;' +
            '差旅费,差旅费,管理费用-差旅费,6602.06;' +
            '差旅费,市内交通费,管理费用-市内交通费,6602.2;' +
            '产品开发费,材料配件,销售费用-材料配件,6601.2;' +
            '产品开发费,产品开发费,研发支出-直接投入费用,5301.02;' +
            '产品开发费,产品开发费,研发支出-设计费用,5301.05;' +
            '产品开发费,产品开发费,研发支出-委外开发费用,5301.07;' +
            '产品开发费,产品开发费,研发支出-其他费用,5301.08;' +
            '产品开发费,产品开发费,销售费用-样品费,6601.21;' +
            '车辆费,车辆费,销售费用-车辆费,6601.48;' +
            '车辆费,车辆费,管理费用-车辆费,6602.15;' +
            '快递物流费,物流费,销售费用-物流费,6601.04;' +
            '快递物流费,物流费,销售费用-物流费-Amazon,6601.04.01;' +
            '快递物流费,物流费,销售费用-物流费-调拨,6601.04.02;' +
            '快递物流费,快递费,销售费用-快递费,6601.05;' +
            '快递物流费,采购运费,销售费用-采购运费,6601.42;' +
            '快递物流费,快递费,管理费用-快递费,6602.04;' +
            '其他费用,其他,销售费用-其他费用-Amazon,6601.43.01;' +
            '其他费用,其他,销售费用-其他,6601.99;' +
            '其他费用,其他,管理费用-其他,6602.99;' +
            '人员费用,社保费,销售费用-社保费,6601.09;' +
            '人员费用,福利费,销售费用-福利费,6601.1;' +
            '人员费用,住房公积金,销售费用-住房公积金,6601.11;' +
            '人员费用,社保费,管理费用-社保费,6602.07;' +
            '人员费用,福利费,管理费用-福利费,6602.08;' +
            '人员费用,住房公积金,管理费用-住房公积金 ,6602.09;' +
            '人员费用,劳务费,管理费用-劳务费,6602.25;' +
            '人员费用,薪酬,应付职工薪酬-基本工资,2211.01;' +
            '人员费用,薪酬,应付职工薪酬-绩效工资,2211.02;' +
            '人员费用,社保费,应付职工薪酬-养老保险,2211.03;' +
            '人员费用,社保费,应付职工薪酬-工伤保险,2211.04;' +
            '人员费用,社保费,应付职工薪酬-失业保险,2211.05;' +
            '人员费用,社保费,应付职工薪酬-医疗保险,2211.06;' +
            '人员费用,社保费,应付职工薪酬-重大疾病医疗补助,2211.07;' +
            '人员费用,社保费,应付职工薪酬-生育保险,2211.08;' +
            '人员费用,住房公积金,应付职工薪酬-公积金,2211.09;' +
            '人员费用,福利费,应付职工薪酬-职工福利,2211.1;' +
            '税费,VAT费用,销售费用-VAT费用,6601.16;' +
            '税费,税金及附加,管理费用-残保金,6602.16;' +
            '推广费,推广费,销售费用-推广费,6601.07;' +
            '推广费,推广费,销售费用-推广费-Amazon,6601.07.01;' +
            '推广费,推广费,销售费用-推广费-其他,6601.07.05;' +
            '推广费,推广费,销售费用-推广费-京东,6601.07.03;' +
            '推广费,推广费,销售费用-推广费-微信公众号,6601.07.04;' +
            '业务招待费,业务招待费,管理费用-业务招待费,6602.05;' +
            '业务招待费,业务招待费,销售费用-业务招待费,6601.06;' +
            '业务招待费,业务招待费,销售费用-业务招待费,6601.06;' +
            '业务招待费,业务招待费,管理费用-业务招待费,6602.05;' +
            '中介费,商标代理费,销售费用-商标代理费,6601.4;' +
            '中介费,VAT代理费,销售费用-VAT代理费,6601.41;' +
            '中介费,其他中介费,销售费用-代理服务费,6601.44;' +
            '中介费,审计咨询费,管理费用-审计咨询费,6602.28;' +
            '中介费,专利代理费,管理费用-专利代理费,6602.3;' +
            '中介费,其他中介费,管理费用-中介代理费,6602.32;' +
            '租金水电管理费,办公租金水电费,销售费用-办公租金水电费,6601.38;' +
            '租金水电管理费,办公租金水电费,管理费用-办公租金水电费,6602.22;' +
            '租金水电管理费,仓储租金水电费,管理费用-仓储租金水电费,6602.23;' +
            '其他费用,仓储服务费,销售费用-其他,6601.99;' +
            '其他费用,借款本息,财务费用-利息费用,6603.01;' +
            '税费,企业所得税,所得税费用-当期所得,6801.01;' +
            '税费,增值税,应交税费-应交增值税,2221.01';
        var data_array = data.split(';')

        data_array.forEach(function(item) {
            var item_array = item.split(',');
            var customlist_dps_fee_type_1 = '';

            //获取费用报销一级类型
            search.create({
                type: 'customlist_dps_fee_type_1',
                filters: [{
                    name: 'name',
                    operator: 'is',
                    values: item_array[0]
                }],
            }).run().each(function(res) {
                customlist_dps_fee_type_1 = res.id;
            });


            if (customlist_dps_fee_type_1 == '') {
                var new_type1 = record.create({
                    type: 'customlist_dps_fee_type_1'
                });
                new_type1.setValue({
                    fieldId: 'name',
                    value: item_array[0]
                })
                customlist_dps_fee_type_1 = new_type1.save();
            }


            var new_fee_type = record.create({
                type: 'customrecord_dps_fee_type'
            });
            new_fee_type.setValue({
                fieldId: 'custrecord_dps_fee_type_1',
                value: customlist_dps_fee_type_1
            })
            new_fee_type.setValue({
                fieldId: 'custrecord_dps_fee_type_name',
                value: item_array[1]
            })


        });
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {
        return true;
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        return true;
    }


    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        lineInit: lineInit,
        validateDelete: validateDelete,
        validateInsert: validateInsert,
        validateLine: validateLine,
        sublistChanged: sublistChanged
    }
});