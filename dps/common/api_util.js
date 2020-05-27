var parseUtil = {
    /**
     * 2019年11月21日 下午2点32分 作者:宋志成
     * @param {*} search search模块参数
     * @param {*} type 需要通过SUNLIKE编号查找对应的NS的内部标识的数据
     * @param {*} value 参数值，如果type类型我在这里面没有写对应代码则返回原数据回去
     */
    parse2Id: function (search, type, value) {
        //判断value是否为空，如果为空则返回value回去,或者类型也没有传的话都返回原value回去
        if (value == null || value == undefined || value == '' || !type) return value
        //开始处理不同type对应的操作
        switch (type) {
            //客户【customer】的情况
            case "customer":
                value = this.searchId(search, type, value, "custentity_customernum")
                break
            //员工【employee】的情况
            case "employee":
                value = this.searchId(search, type, value, "custentity_dps_sunlike_id")
                break
            //供应商【vendor】的情况
            case "vendor":
                value = this.searchId(search, type, value, "custentity_supplynum")
                break
            //子公司【subsidiary】的情况
            case "subsidiary":
                value = this.searchId(search, type, value, "custrecord_dps_company_number")
                break
            //部门【department】的情况
            case "department":
                value = this.searchId(search, type, value, "custrecord_dps_department_id")
                break
            //地点【location】的情况
            case "location":
                value = this.searchId(search, type, value, "custrecordlocation_code")
                break
            //货币【currency】的情况
            case "currency":
                value = this.searchId(search, type, value, "symbol")
                break
            //科目【account】的情况
            case "account":
                value = this.searchId(search, type, value, "acctnumber")
                break
            //中国现金流量表【chinacash】的情况
            case "chinacash":
                value = this.searchId(search, "customrecord_cseg_cn_cfi", value, "name")
                break
            //货品【item】的情况
            case "item":
                value = this.searchId(search, type, value, "itemid")
                break
            //库存调整【inventoryadjustment】的情况
            case "inventoryadjustment":
                value = this.searchId(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //采购单【purchaseorder】的情况
            case "purchaseorder":
                value = this.searchId(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //供应商贷记【vendorcredit】的情况
            case "vendorcredit":
                value = this.searchId(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //账单【vendorbill】的情况
            case "vendorbill":
                value = this.searchId(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //项目【project】的情况
            case "customrecord_cseg_project":
                value = this.searchId(search, type, value, "name")
                break
            default:
                break
        }
        return value
    },
    //封装的公共搜索内部标识的方法
    searchId: function (search, type, value, filtername) {
        search.create({
            type: type,
            filters: [
                { name: filtername, operator: 'is', values: value },
            ]
        }).run().each(function (rec) {
            value = rec.id
            return false
        })
        return value
    },
    //封装的公共搜索数据的方法
    searchValue: function (search, type, value, column) {
        search.create({
            type: type,
            filters: [
                { name: "internalId", operator: 'is', values: value },
            ],
            columns: [{ name: column }]
        }).run().each(function (rec) {
            value = rec.getValue(column)
            return false
        })
        return value
    },
    parse2Value: function (search, type, value) {
        //判断value是否为空，如果为空则返回value回去,或者类型也没有传的话都返回原value回去
        if (value == null || value == undefined || value == '' || !type) return value
        //开始处理不同type对应的操作
        switch (type) {
            //客户【customer】的情况
            case "customer":
                value = this.searchValue(search, type, value, "custentity_customernum")
                break
            //员工【employee】的情况
            case "employee":
                value = this.searchValue(search, type, value, "custentity_dps_sunlike_id")
                break
            //供应商【vendor】的情况
            case "vendor":
                value = this.searchValue(search, type, value, "entityid")
                break
            //子公司【subsidiary】的情况
            case "subsidiary":
                value = this.searchValue(search, type, value, "custrecord_dps_company_number")
                break
            //部门【department】的情况
            case "department":
                value = this.searchValue(search, type, value, "custrecord_dps_department_id")
                break
            //地点【location】的情况
            case "location":
                value = this.searchValue(search, type, value, "custrecordlocation_code")
                break
            //货币【currency】的情况
            case "currency":
                value = this.searchValue(search, type, value, "symbol")
                break
            //科目【account】的情况
            case "account":
                value = this.searchValue(search, type, value, "number")
                break
            //中国现金流量表【chinacash】的情况
            case "chinacash":
                value = this.searchValue(search, "customrecord_cseg_cn_cfi", value, "name")
                break
            //货品【item】的情况
            case "item":
                value = this.searchValue(search, type, value, "itemid")
                break
            //库存调整【inventoryadjustment】的情况
            case "inventoryadjustment":
                value = this.searchValue(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //采购单【purchaseorder】的情况
            case "purchaseorder":
                value = this.searchValue(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //供应商贷记【vendorcredit】的情况
            case "vendorcredit":
                value = this.searchValue(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //账单【vendorbill】的情况
            case "vendorbill":
                value = this.searchValue(search, type, value, "custbody_dps_sunlike_tran_id")
                break
            //单据类型【customrecord_dps_bill_type】的情况
            case "customrecord_dps_bill_type":
                value = this.searchValue(search, type, value, "custrecord_dps_bil_sunlike_id")
                break
            //BOM代号【customrecord_dps_bom_relation】的情况
            case "customrecord_dps_bom_relation":
                value = this.searchValue(search, type, value, "custrecord_dps_bom_code")
                break
            //包装方式【customrecord_item_pack_custom】的情况
            case "customrecord_item_pack_custom":
                value = this.searchValue(search, type, value, "custrecord_dps_package")
                break
            default:
                break
        }
        return value
    }
}