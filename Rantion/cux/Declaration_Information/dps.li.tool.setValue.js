/*
 * @Author         : Li
 * @Date           : 2020-05-26 10:25:55
 * @LastEditTime   : 2020-06-03 15:26:05
 * @LastEditors    : Li
 * @Description    :  用于渲染表格
 * @FilePath       : \Rantion\cux\Declaration_Information\dps.li.tool.setValue.js
 * @可以输入预定的版权声明、个性签名、空行等
 */

define(['N/file', 'N/search', 'N/record', 'N/log', './handlebars-v4.1.1',
    'N/render', 'N/format', 'N/xml', 'N/encode'
], function (file, search, record, log, Handlebars, render, format, xml, encode) {



    function setModuleXMLValue(INV, xmlID) {

        log.debug('setModuleXMLValue INV: ' + INV, xmlID);
        var seaT1 = new Date().getTime()
      // 创建一个对象，用于赋值
      var printData = new Object();
      printData = setInvValue(INV, xmlID, printData);
      printData = setBoxValue(INV, xmlID, printData);
      printData = setDeclarationValue(INV, xmlID, printData);
      printData = setContractValue(INV, xmlID, printData);
      printData = setElemValue(INV, xmlID, printData);

      printData = setUSValue(INV, xmlID, printData);
      log.audit( "搜索这些耗时1: " ,new Date().getTime() - seaT1)

      // 获取模板内容,写全路径或者内部ID
      var model = file.load({
          id: xmlID
      }).getContents();

      var seaT2 = new Date().getTime()
      // 处理数据
      var template = Handlebars.compile(model);
      var xml_1 = template(printData);
      log.audit( "搜索这些耗时2: " ,new Date().getTime() - seaT2)

      var seaT3 = new Date().getTime();
      var nowDate = new Date().toISOString();
      var fileObj = file.create({
          name: "报关资料-" + INV + '-' + nowDate + ".xls",
          fileType: file.Type.EXCEL,
          contents: encode.convert({
              string: xml_1,
              inputEncoding: encode.Encoding.UTF_8,
              outputEncoding: encode.Encoding.BASE_64
          }),
          encoding: file.Encoding.UTF8,
          isOnline: true
      });
      log.audit( "搜索这些耗时3: " ,new Date().getTime() - seaT3)
      return fileObj || false;
    }

    /**
     * 设置发票相关的字段值
     * @param {*} INV   发票的ID
     * @param {*} xmlID 发票模本ID
     */
    function setInvValue(INV, xmlID, printData) {

        var itemInfo = [],
            limit = 3999;
        var inv_number, contract, date, shipping_port, inv_to, destination;
        //搜索报关资料记录
        search.create({
            type: 'customrecord_dps_customs_invoice',
            filters: [{
                name: 'custrecord_dps_cus_inv_information',
                operator: 'anyof',
                values: INV
            }],
            columns: [
                'custrecord_dps_cus_inv_number', // 发票号
                'custrecord_dps_cus_inv_contract', // 合同号
                'custrecord_dps_cus_inv_date', // 日期
                'custrecord_dps_cus_inv_shipping_port', // 装运口岸
                'custrecord_dps_cus_inv_to', // TO
                'custrecord_dps_cus_inv_destination', // 目的地

                {
                    name: 'custrecord_dps_customs_invoice_item_name',
                    join: 'custrecord_dps_c_i_item_link' // 品名
                },
                {
                    name: 'custrecord_dps_customs_invoice_item_qty',
                    join: 'custrecord_dps_c_i_item_link' // 数量
                },
                {
                    name: 'custrecord_dps_c_i_until',
                    join: 'custrecord_dps_c_i_item_link' // 单位
                },
                {
                    name: 'custrecord_dps_customs_invoice_item_pric',
                    join: 'custrecord_dps_c_i_item_link' // 单价
                },
                {
                    name: 'custrecord_dps_customs_inv_item_amount',
                    join: 'custrecord_dps_c_i_item_link' // 金额
                },

            ]
        }).run().each(function (rec) {

            inv_number = rec.getValue('custrecord_dps_cus_inv_number');
            contract = rec.getValue('custrecord_dps_cus_inv_contract');
            date = rec.getValue('custrecord_dps_cus_inv_date');
            shipping_port = rec.getValue('custrecord_dps_cus_inv_shipping_port');
            inv_to = rec.getValue('custrecord_dps_cus_inv_to');
            destination = rec.getValue('custrecord_dps_cus_inv_destination');

            var it = {
                name: rec.getValue({
                    name: 'custrecord_dps_customs_invoice_item_name',
                    join: 'custrecord_dps_c_i_item_link' // 品名
                }),
                qty: rec.getValue({
                    name: 'custrecord_dps_customs_invoice_item_qty',
                    join: 'custrecord_dps_c_i_item_link' // 数量
                }),
                until: rec.getValue({
                    name: 'custrecord_dps_c_i_until',
                    join: 'custrecord_dps_c_i_item_link' // 单位
                }),
                price: rec.getValue({
                    name: 'custrecord_dps_customs_invoice_item_pric',
                    join: 'custrecord_dps_c_i_item_link' // 单价
                }),
                amount: rec.getValue({
                    name: 'custrecord_dps_customs_inv_item_amount',
                    join: 'custrecord_dps_c_i_item_link' // 金额
                })
            }
            itemInfo.push(it);

            return --limit > 0;
        });


        printData["invNO"] = inv_number;
        printData["cont"] = contract;
        printData["date"] = date;
        printData['port'] = shipping_port;
        printData['decstion'] = destination;

        for (var i = 0, len = itemInfo.length; i < len; i++) {
            var temp = itemInfo[i];

            var itemName = 'name' + Number(i + 1);
            var qty = 'qty' + Number(i + 1);
            var price = 'price' + Number(i + 1);
            var totalAmount = 'totalAmount' + Number(i + 1);

            var until = 'until' + Number(i + 1);

            printData[itemName] = temp.name;
            printData[qty] = temp.qty;
            printData[until] = temp.until;
            printData[price] = temp.price;
            printData[totalAmount] = temp.amount;
        }

        log.audit('printData', printData);

        return printData || false;

    }

    /**
     * 设置装箱单的相关值
     * @param {*} BOX 
     * @param {*} xmlID 
     */
    function setBoxValue(BOX, xmlID, printData) {

        var itemInfo = [],
            limit = 3999,
            add = 1;

        search.create({
            type: 'customrecord_dps_packing_documents',
            filters: [{
                name: 'custrecord_dps_p_declaration_informa',
                operator: 'anyof',
                values: BOX
            }],
            columns: [
                'custrecord_dps_pack_docu_inv_no', // 发票号码
                'custrecord_dps_pack_docu_contract_number', // 合同编号
                'custrecord_dps_pack_docu_date', // 日期
                {
                    name: 'custrecord_dps_pack_docu_item_name',
                    join: 'custrecord_dps_z_b_l_links'
                }, // 品名
                {
                    name: 'custrecord_dps_pack_docum_item_qty',
                    join: 'custrecord_dps_z_b_l_links'
                }, // 数量
                {
                    name: 'custrecord_dps_pack_docu_item_box_qty',
                    join: 'custrecord_dps_z_b_l_links'
                }, // 箱数
                {
                    name: 'custrecord_dps_pack_docu_item_gross_eig',
                    join: 'custrecord_dps_z_b_l_links'
                }, // 毛重
                {
                    name: 'custrecord_dps_pack_cu_item_net_weight',
                    join: 'custrecord_dps_z_b_l_links'
                }, // 净重
            ]
        }).run().each(function (rec) {

            printData["InvNO"] = rec.getValue('custrecord_dps_pack_docu_inv_no');
            printData["conNO"] = rec.getValue('custrecord_dps_pack_docu_contract_number');
            printData["Date"] = rec.getValue('custrecord_dps_pack_docu_date');

            var itemName = 'itemName' + Number(add),
                Qty = 'Qty' + Number(add),
                boxQty = 'boxQty' + Number(add),
                GW = 'GW' + Number(add),
                box = 'box' + Number(add);

            printData[itemName] = rec.getValue({
                name: 'custrecord_dps_pack_docu_item_name',
                join: 'custrecord_dps_z_b_l_links'
            });
            printData[Qty] = rec.getValue({
                name: 'custrecord_dps_pack_docum_item_qty',
                join: 'custrecord_dps_z_b_l_links'
            });
            printData[boxQty] = rec.getValue({
                name: 'custrecord_dps_pack_docu_item_box_qty',
                join: 'custrecord_dps_z_b_l_links'
            });
            printData[GW] = rec.getValue({
                name: 'custrecord_dps_pack_docu_item_gross_eig',
                join: 'custrecord_dps_z_b_l_links'
            });

            ++add;

            return --limit > 0;
        });

        for (var i = 0, len = itemInfo.length; i < len; i++) {

            var temp = itemInfo[i];
            var itemName = 'itemName' + Number(i + 1);
            var Qty = 'Qty' + Number(i + 1);
            var boxQty = 'boxQty' + Number(i + 1);
            var GW = 'GW' + Number(i + 1);
            var box = 'box' + Number(i + 1);

            printData[itemName] = temp.name;
            printData[Qty] = temp.qty;
            printData[boxQty] = temp.boxQty;
            printData[GW] = temp.gross;

        }

        return printData || false;

    }


    /**
     * 设置报关单的值
     * @param {*} BOX 
     * @param {*} xmlID 
     * TODO
     */
    function setDeclarationValue(inv, xmlID, printData) {

        var itemInfo = [],
            limit = 3999;

        var inv_no, contract_number, docu_date;

        var add = 1;

        search.create({
            type: 'customrecord_dps_customs_declaration',
            filters: [{
                name: 'custrecord_dps_cu_decl_infomation_link',
                operator: 'anyof',
                values: inv
            }],
            columns: [
                'custrecord_dps_cu_decl_pre_entry_number', // 预录编码
                'custrecord_dps_cu_decl_customs_code', // 10位海关编码
                'custrecord_dps_cu_decl_customs_number', // 海关编码
                'custrecord_dps_cu_decl_domestic_shipper', // 境内发件人
                'custrecord_dps_cu_decl_departure', // 出境关别
                'custrecord_dps_cu_decl_export_date', // 出口日期
                'custrecord_dps_cu_decl_filing_date', //申报日期
                'custrecord_dps_cu_decl_case_number', // 备案号
                'custrecord_dps_cu_decl_overseas_consigne', // 境外收货人
                'custrecord_dps_cu_decl_transport_method', //运输方式
                'custrecord_dps_cu_decl_vehicle_voyage', // 运输工具名称及航次号
                'custrecord_dps_cu_decl_consignment_note', // 提运单号
                'custrecord_dps_cu_decl_production_sales', // 生产销售单位
                'custrecord_dps_cu_decl_permit_number', //许可证号
                'custrecord_dps_cu_decl_contract_agreemen', //合同协议号
                'custrecord_dps_cu_decl_trading_country', //贸易国(地区)
                'custrecord_dps_cu_decl_shipping_country', //运抵国(地区)
                'custrecord_dps_cu_decl_finger_port', //指运港
                'custrecord_dps_cu_decl_departure_port', // 离境口岸
                'custrecord_dps_cu_decl_number', //件数
                'custrecord_dps_cu_decl_gross_weight', //毛重（千克）
                'custrecord_dps_cu_decl_net_weight', //净重（千克）

                {
                    name: 'custrecord_dps_customs_declara_item_num',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 商品编号
                {
                    name: 'custrecord_dps_customs_decl_item_name',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 品名
                {
                    name: 'custrecord_dps_customs_decl_item_qty',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 数量
                {
                    name: 'custrecord_dps_custom_decl_item_un_price',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 单价
                {
                    name: 'custrecord_dps_custo_decl_total_amount',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 总价
                {
                    name: 'custrecord_dps_cust_decl_item_dom_source',
                    join: 'custrecord_dps_customs_decla_item_link'
                }, // 货源地

            ]
        }).run().each(function (rec) {

            printData['PreNumber'] = rec.getValue('custrecord_dps_cu_decl_pre_entry_number'); // 预录入编号
            printData['CustomsCode'] = rec.getValue('custrecord_dps_cu_decl_customs_code'); // 10位海关编码
            printData['cusCode'] = rec.getValue('custrecord_dps_cu_decl_customs_number'); // 海关编码
            printData['Exit'] = rec.getValue('custrecord_dps_cu_decl_departure'); // 出境关别
            printData['send'] = rec.getValue('custrecord_dps_cu_decl_domestic_shipper'); // 境内发件人
            printData['get'] = rec.getValue('custrecord_dps_cu_decl_overseas_consigne'); // 境外收货人
            printData['contra'] = rec.getValue('custrecord_dps_cu_decl_contract_agreemen'); // 合同协议号
            printData['transport'] = rec.getValue('custrecord_dps_cu_decl_transport_method'); // 运输方式
            printData['DeparturePort'] = rec.getValue('custrecord_dps_cu_decl_departure_port'); // 离境口岸

            printData['PermitNumber'] = rec.getValue('custrecord_dps_cu_decl_permit_number'); // 许可证号
            printData['outDate'] = rec.getValue('custrecord_dps_cu_decl_export_date'); // 出口日期
            printData['transportM'] = rec.getValue('custrecord_dps_cu_decl_vehicle_voyage'); // 运输工具名称及航次号
            printData['date'] = rec.getValue('custrecord_dps_cu_decl_filing_date'); // 申报日期
            printData['ConNoteNumber'] = rec.getValue('custrecord_dps_cu_decl_consignment_note'); // 提运单号
            printData['caseNumber'] = rec.getValue('custrecord_dps_cu_decl_case_number'); // 备案号
            printData['f_cou'] = rec.getValue('custrecord_dps_cu_decl_trading_country'); // 贸易国
            printData['t_cou'] = rec.getValue('custrecord_dps_cu_decl_shipping_country'); // 运抵国
            printData['Fport'] = rec.getValue('custrecord_dps_cu_decl_finger_port'); // 指运港口
            printData['totalN'] = rec.getValue('custrecord_dps_cu_decl_number'); // 件数
            printData['t_gross'] = rec.getValue('custrecord_dps_cu_decl_gross_weight'); // 毛重
            printData['net'] = rec.getValue('custrecord_dps_cu_decl_net_weight'); // 净重


            // 货品信息

            var No = 'No' + Number(add),
                itemNO = 'itemNO' + Number(add),
                itemName = 'itemName' + Number(add),
                Qty = 'Qty' + Number(add),
                price = 'price' + Number(add),
                total = 'total' + Number(add),
                sourecAdd = 'sourecAdd' + Number(add),
                USD = 'USD' + Number(add),
                china = 'china' + Number(add),
                f_cou = 'f_cou' + Number(add),
                Taxes = 'Taxes1' + Number(add);


            printData[USD] = "美元"; // 项号
            printData[china] = "中国"; // 项号
            printData[Taxes] = "照章征税"; // 项号
            printData[f_cou] = rec.getValue('custrecord_dps_cu_decl_trading_country'); // 项号


            printData[No] = add; // 项号
            printData[itemNO] = rec.getValue({
                name: 'custrecord_dps_customs_declara_item_num',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 商品编号
            printData[itemName] = rec.getValue({
                name: 'custrecord_dps_customs_decl_item_name',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 品名
            printData[Qty] = rec.getValue({
                name: 'custrecord_dps_customs_decl_item_qty',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 数量
            printData[price] = rec.getValue({
                name: 'custrecord_dps_custom_decl_item_un_price',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 单价
            printData[total] = rec.getValue({
                name: 'custrecord_dps_custo_decl_total_amount',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 总价
            printData[sourecAdd] = rec.getValue({
                name: 'custrecord_dps_cust_decl_item_dom_source',
                join: 'custrecord_dps_customs_decla_item_link'
            }); // 境内货源地

            ++add;


            return --limit > 0;
        });

        return printData || false;

    }


    /**
     * 设置合同的值
     * @param {*} con 
     * @param {*} xmlID 
     */
    function setContractValue(con, xmlID, printData) {

        var itemInfo = [],
            limit = 3999,
            add = 1;

        search.create({
            type: 'customrecord_dps_customs_contract',
            filters: [{
                name: 'custrecord_dps_c_c_information',
                operator: 'anyof',
                values: con
            }],
            columns: [
                'custrecord_dps_c_c_seller', // 卖方
                'custrecord_dps_c_c_buyer', //卖方
                'custrecord_dps_c_c_contract_no', // 合同编号
                'custrecord_dps_c_c_date', // 日期
                'custrecord_dps_c_c_consignee_code', // 收货人代码
                'custrecord_dps_c_c_shipto', // SHIPTO
                'custrecord_dps_c_c_transport_method', // 运输方式
                'custrecord_dps_c_c_arrival_port', // 到货口岸

                {
                    name: 'custrecord_dps_c_c_i_item_name',
                    join: 'custrecord_dps_c_c_li_links'
                }, // 名称及其规格
                {
                    name: 'custrecord_dps_c_c_item_qty',
                    join: 'custrecord_dps_c_c_li_links'
                }, // 数量
                {
                    name: 'custrecord_dps_c_c_item_util_price',
                    join: 'custrecord_dps_c_c_li_links'
                }, // 单价
                {
                    name: 'custrecord_dps_c_c_item_amount',
                    join: 'custrecord_dps_c_c_li_links'
                }, // 金额
            ]
        }).run().each(function (rec) {
            var se = rec.getText('custrecord_dps_c_c_seller');
            var s = se.split(':');

            printData['seller'] = s[s.length - 1];
            printData['buyers'] = rec.getValue('custrecord_dps_c_c_buyer');

            printData['con'] = rec.getValue('custrecord_dps_c_c_contract_no');
            printData['date'] = rec.getValue('custrecord_dps_c_c_date');
            printData['transport'] = rec.getValue('custrecord_dps_c_c_transport_method');

            printData['Aport'] = rec.getValue('custrecord_dps_c_c_arrival_port');
            printData['shipTo'] = rec.getValue('custrecord_dps_c_c_shipto');
            printData['Code'] = rec.getValue('custrecord_dps_c_c_consignee_code');

            var name = 'name' + Number(add),
                qty = 'qty' + Number(add),
                price = 'price' + Number(add),
                amount = 'amount' + Number(add);

            printData[name] = rec.getValue({
                name: 'custrecord_dps_c_c_i_item_name',
                join: 'custrecord_dps_c_c_li_links'
            });
            printData[qty] = rec.getValue({
                name: 'custrecord_dps_c_c_item_qty',
                join: 'custrecord_dps_c_c_li_links'
            });
            printData[price] = rec.getValue({
                name: 'custrecord_dps_c_c_item_util_price',
                join: 'custrecord_dps_c_c_li_links'
            });
            printData[amount] = rec.getValue({
                name: 'custrecord_dps_c_c_item_amount',
                join: 'custrecord_dps_c_c_li_links'
            });

            return -limit > 0;

        });

        return printData || false;

    }


    /**
     * 设置申报要素的值
     * @param {*} inv 
     * @param {*} xmlID 
     */
    function setElemValue(inv, xmlID, printData) {
        var itemInfo = [],
            limit = 3999,
            add = 1;

        var inv_number;


        search.create({
            type: 'customrecord_dps_elements_declaration',
            filters: [{
                name: 'custrecord_dps_elem_dedecl_information',
                operator: 'anyof',
                values: inv
            }],
            columns: [
                'custrecord_dps_elem_dedecl_name', // 品名
                'custrecord_dps_elem_dedecl_cust_hs_code', // 海关HS编码
                'custrecord_dps_elem_dedecl_total_number', // 总个数
                'custrecord_dps_elem_dedecl_brand', // 品牌
                'custrecord_dps_elem_dedecl_model', // 型号
                'custrecord_dps_elem_dedecl_brand_type', // 品牌类型
                'custrecord_dps_elem_dedecl_other_reporti', // 其他申报要素
                {
                    name: 'custrecord_dps_cus_inv_number',
                    join: 'custrecord_dps_elem_dedecl_inv_link'
                }, // 发票号
            ]
        }).run().each(function (rec) {

            inv_number = rec.getValue({
                name: 'custrecord_dps_cus_inv_number',
                join: 'custrecord_dps_elem_dedecl_inv_link'
            });

            var NO = 'NO' + Number(add),
                itemName = 'itemName' + Number(add),
                conHS = 'conHS' + Number(add),
                totalQty = 'totalQty' + Number(add),
                brand = 'brand' + Number(add),
                otherEle = 'otherEle' + Number(add),
                NotE = 'NotE' + Number(add),
                OEM = 'OEM' + Number(add),
                nothing = 'nothing' + Number(add);



            printData[NO] = add;
            printData[itemName] = rec.getValue('custrecord_dps_elem_dedecl_name');
            printData[conHS] = rec.getValue('custrecord_dps_elem_dedecl_cust_hs_code');
            printData[totalQty] = rec.getValue('custrecord_dps_elem_dedecl_total_number');
            printData[brand] = rec.getValue('custrecord_dps_elem_dedecl_brand');
            printData[otherEle] = add;

            printData[NotE] = "不享惠";
            printData[OEM] = "境外贴牌";
            printData[nothing] = "无";
            ++add;
            return --limit > 0;
        });

        return printData || false;

    }



    /**
     * 设置US开票资料的相关值
     * @param {*} BOX 
     * @param {*} xmlID 
     * TODO
     */
    function setUSValue(inv, xmlID, printData) {

        var limit = 3999,
            add = 1;

        search.create({
            type: 'customrecord_dps_us_billing_information',
            filters: [{
                name: 'custrecord_dps_us_b_i_informa',
                operator: 'anyof',
                values: inv
            }],
            columns: [

                'custrecord_dps_us_b_i_transfer_batch_num', // 调拨批次号
                'custrecord_dps_us_b_i_vendor', // 供应商
                'custrecord_dps_us_b_i_item_name', // 货物名称
                'custrecord_dps_us_b_i_sku', // SKU
                'custrecord_dps_us_b_i_unit', // 单位
                'custrecord_dps_us_b_i_qty', // 数量
                'custrecord_dps_us_b_i_unit_price', // 单价

                'custrecord_dps_us_b_i_amount', // 金额
                'custrecord_dps_us_b_i_tax_rate', // 税率
                'custrecord_dps_us_b_i_tax', // 税额
                'custrecord_dps_us_b_i_unit_price_includ', // 含税单价
                'custrecord_dps_us_b_i_tax_included_amoun', // 含税金额
                'custrecord_dps_us_b_i_usd_unit_price', // 美金单价

                'custrecord_dps_us_b_i_quantity_unit', // 单位内数量
                'custrecord_dps_us_b_i_total_qty', // 总个数
                'custrecord_dps_us_b_i_customs_code', // 海关编码
                'custrecord_dps_us_b_i_place_supply', // 货源地
                'custrecord_dps_us_b_i_box_quantity', // 箱数

                'custrecord_dps_us_b_i_gross_weight', // 毛重
                'custrecord_dps_us_b_i_net_weight', // 净重
                'custrecord_dps_us_b_i_elements_declarati', // 申报要素
                'custrecord_dps_us_b_i_buyer', // 采购员

                'custrecord_dps_us_b_i_brand_name', // 品牌名
                'custrecord_dps_us_b_i_remarks', // 备注
                'custrecord_dps_us_b_i_supplier_name', // 供应商名称

            ]
        }).run().each(function (rec) {


            var vendor = 'vendor' + Number(add),
                itemname = 'itemname' + Number(add),
                sku = 'sku' + Number(add),
                util = 'util' + Number(add),
                qty = 'qty' + Number(add),
                price = 'price' + Number(add),
                amount = 'amount' + Number(add),
                tax = 'tax' + Number(add),
                taxamount = 'taxamount' + Number(add),
                taxprice = 'taxprice' + Number(add),
                taxTotal = 'taxTotal' + Number(add),
                USD = 'USD' + Number(add),
                total = 'total' + Number(add),
                CustomsCode = 'CustomsCode' + Number(add),
                pordu = 'pordu' + Number(add),
                boxQty = 'boxQty' + Number(add),
                gros = 'gros' + Number(add),
                net = 'net' + Number(add),
                elem = 'elem' + Number(add),
                empl = 'empl' + Number(add),
                brand = 'brand' + Number(add),
                mark = 'mark' + Number(add),
                vendorName = 'vendorName' + Number(add);


            printData[vendor] = rec.getValue('custrecord_dps_us_b_i_vendor');
            printData[itemname] = rec.getValue('custrecord_dps_us_b_i_item_name');
            printData[sku] = rec.getValue('custrecord_dps_us_b_i_sku');
            printData[util] = rec.getValue('custrecord_dps_us_b_i_unit');
            printData[qty] = rec.getValue('custrecord_dps_us_b_i_qty');

            printData[price] = rec.getValue('custrecord_dps_us_b_i_unit_price');
            printData[amount] = rec.getValue('custrecord_dps_us_b_i_amount');
            printData[tax] = rec.getValue('custrecord_dps_us_b_i_tax_rate');
            printData[taxamount] = rec.getValue('custrecord_dps_us_b_i_tax');

            printData[taxprice] = rec.getValue('custrecord_dps_us_b_i_unit_price_includ');
            printData[taxTotal] = rec.getValue('custrecord_dps_us_b_i_tax_included_amoun');
            printData[USD] = rec.getValue('custrecord_dps_us_b_i_usd_unit_price');

            printData[total] = rec.getValue('custrecord_dps_us_b_i_total_qty');
            printData[CustomsCode] = rec.getValue('custrecord_dps_us_b_i_customs_code');

            printData[pordu] = rec.getValue('custrecord_dps_us_b_i_place_supply');
            printData[boxQty] = rec.getValue('custrecord_dps_us_b_i_box_quantity');
            printData[gros] = rec.getValue('custrecord_dps_us_b_i_gross_weight');
            printData[net] = rec.getValue('custrecord_dps_us_b_i_net_weight');
            printData[elem] = rec.getValue('custrecord_dps_us_b_i_elements_declarati');

            printData[empl] = rec.getText('custrecord_dps_us_b_i_buyer');
            printData[brand] = rec.getValue('custrecord_dps_us_b_i_brand_name');
            printData[mark] = rec.getValue('custrecord_dps_us_b_i_remarks');
            printData[vendorName] = rec.getText('custrecord_dps_us_b_i_supplier_name');


            ++add;
            return --limit > 0;
        });


        return printData;

    }


    return {
        setModuleXMLValue: setModuleXMLValue
    }
});