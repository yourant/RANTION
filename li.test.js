function sub(context) {

    var af_rec = context;

    var rec_status = af_rec.getValue('custrecord_dps_shipping_rec_status');
    var shipId = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

    log.audit('rec_status', rec_status);

    var tranor_type = af_rec.getValue('custrecord_dps_ship_record_tranor_type');
    log.debug('tranor_type', tranor_type);

    var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');
    var type = 10;

    var tra_order_link = af_rec.getValue('custrecord_dps_trans_order_link');

    if ((tranor_type == 2 || tranor_type == 3) && rec_status == 3) { // 调拨单类型   2 自营仓调拨 3 跨仓调拨
        wms(af_rec);
    }

    if (rec_status == 9 && (tranor_type == 1 || tranor_type == 3)) { // 发运记录的状态为 9	未发运，等待获取Shipment 时, 可能是FBA调拨, 也可能是 跨仓调拨
        type = 20;

        // 创建入库装运计划     createInboundShipmentPlan

        var rec_account = af_rec.getValue('custrecord_dps_shipping_rec_account');

        var SellerSKU;

        if (rec_account) { // 若存在店铺
            var lim2 = 3999,
                limit = 3999;
            var ship_to_country_code = "",
                address_id = {},
                label_prep_preference = "SELLER_LABEL",
                items = [],
                sub_id = 'recmachcustrecord_dps_shipping_record_parentrec';

            var fulItemArr = [],
                itemObj = {},
                FItemA = [],
                fLim = 3999
            // 先获取发运记录对应的所有货品信息
            search.create({
                type: af_rec.type,
                filters: [{
                    name: 'internalid',
                    operator: 'anyof',
                    values: af_rec.id
                }],
                columns: [{
                        name: "custrecord_dps_shipping_record_item",
                        join: "custrecord_dps_shipping_record_parentrec"
                    },
                    {
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    },
                    {
                        name: 'custrecord_cc_country_code',
                        join: 'custrecord_dps_recipient_country_dh'
                    }
                ]
            }).run().each(function (rec) {

                itemObj[rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                })] = Number(rec.getValue({
                    name: "custrecord_dps_ship_record_item_quantity",
                    join: "custrecord_dps_shipping_record_parentrec"
                }))
                var it = {
                    neItem: rec.getValue({
                        name: "custrecord_dps_shipping_record_item",
                        join: "custrecord_dps_shipping_record_parentrec"
                    }),
                    Qty: Number(rec.getValue({
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    }))
                }

                FItemA.push(rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                }));

                fulItemArr.push(it);

                var nsItem = rec.getValue({
                    name: "custrecord_dps_shipping_record_item",
                    join: "custrecord_dps_shipping_record_parentrec"
                });

                var info = {
                    nsItem: nsItem,
                    SellerSKU: SellerSKU,
                    ASIN: '',
                    Condition: '',
                    Quantity: Number(rec.getValue({
                        name: "custrecord_dps_ship_record_item_quantity",
                        join: "custrecord_dps_shipping_record_parentrec"
                    })),
                    QuantityInCase: '',
                }
                items.push(info);

                return --limit > 0;
            });


            var amItem = [];
            search.create({
                type: 'customrecord_aio_amazon_seller_sku',
                filters: [{
                        name: 'custrecord_ass_sku',
                        operator: 'anyof',
                        values: FItemA
                    },
                    {
                        name: 'custrecord_ass_account',
                        operator: 'anyof',
                        values: rec_account
                    }
                ],
                columns: [
                    'name', "custrecord_ass_sku"
                ]
            }).run().each(function (rec) {
                var nsItem = rec.getValue('custrecord_ass_sku');

                if (itemObj[nsItem]) {

                    var it = {
                        nsItem: nsItem,
                        SellerSKU: rec.getValue('name'),
                        ASIN: '',
                        Condition: '',
                        Quantity: Number(itemObj[nsItem]),
                        QuantityInCase: '',
                    }
                    amItem.push(it);
                }
                return --lim2 > 0;
            });

            log.debug('items', items);

            if (SellerSKU) {
                var shipping_rec_location = af_rec.getValue('custrecord_dps_shipping_rec_location');

                if (shipping_rec_location) {

                    search.create({
                        type: 'location',
                        filters: [{
                            name: 'internalid',
                            operator: 'anyof',
                            values: shipping_rec_location
                        }],
                        columns: [
                            'custrecord_aio_country_sender', // 国家
                            'custrecord_aio_sender_state', // 州
                            'custrecord_aio_sender_city', // 城市
                            // 'custrecord_aio_country_sender', // 地址2
                            'custrecord_aio_sender_address', // 地址1
                            'custrecord_aio_sender_name', // 发件人
                            'custrecord_aio_sender_address_code', // 邮编

                            {
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_aio_country_sender'
                            }

                        ]
                    }).run().each(function (rec) {
                        address_id = {
                            Name: rec.getValue('custrecord_aio_sender_name'),
                            AddressLine1: rec.getValue('custrecord_aio_sender_address'),
                            AddressLine2: '', //其他街道地址信息（ 如果需要）。 否,
                            City: rec.getText('custrecord_aio_sender_city'),
                            DistrictOrCounty: '', //  区或县。 否,
                            StateOrProvinceCode: rec.getValue('custrecord_aio_sender_state'),
                            CountryCode: rec.getValue({
                                name: 'custrecord_cc_country_code',
                                join: 'custrecord_aio_country_sender'
                            }),
                            PostalCode: rec.getValue('custrecord_aio_sender_address_code'),
                        };

                    });
                }

                // if (rec_account) {
                var shipping_rec_shipmentsid = af_rec.getValue('custrecord_dps_shipping_rec_shipmentsid');

                var DestinationFulfillmentCenterId = af_rec.getValue('custrecord_dps_shipping_rec_destinationf');
                log.debug('shipping_rec_shipmentsid', shipping_rec_shipmentsid);

                var reItem = [],
                    recordID = af_rec.id,
                    upresp;

                var str = '';

                if (!shipping_rec_shipmentsid) {
                    try {

                        log.debug('申请shipmentID', '申请shipmentID');
                        // 创建入库计划, 获取 shipment

                        log.error('createInboundShipmentPlan items', items);
                        ship_to_country_code = '';

                        var response = core.amazon.createInboundShipmentPlan(rec_account, address_id, ship_to_country_code, label_prep_preference, items);
                        var rep;
                        try {
                            rep = JSON.parse(response);
                        } catch (error) {
                            rep = response;
                        }


                        if (util.isArray(response)) {
                            log.debug('createInboundShipmentPlan response', response);
                            log.debug('rep', rep);

                            var shipmentid1 = rep[0].ShipmentId;
                            shipping_rec_shipmentsid = shipmentid1;
                            DestinationFulfillmentCenterId = rep[0].DestinationFulfillmentCenterId;
                            reItem = rep[0].Items;

                            var ShipToAddress = rep[0].ShipToAddress;

                            log.debug('ShipToAddress', JSON.stringify(ShipToAddress));
                            var Name = ShipToAddress.Name,
                                AddressLine1 = ShipToAddress.AddressLine1,
                                AddressLine2 = ShipToAddress.AddressLine2,
                                City = ShipToAddress.City,
                                DistrictOrCounty = ShipToAddress.DistrictOrCounty,
                                StateOrProvinceCode = ShipToAddress.StateOrProvinceCode,

                                CountryCode = ShipToAddress.CountryCode,
                                PostalCode = ShipToAddress.PostalCode;

                            var cityId, countryId;
                            if (City) {

                                search.create({
                                    type: 'customrecord_dps_port',
                                    filters: [{
                                        name: 'name',
                                        operator: 'is',
                                        values: City
                                    }]
                                }).run().each(function (rec) {
                                    cityId = rec.id;
                                });

                                if (!cityId) {
                                    var newCi = record.create({
                                        type: 'customrecord_dps_port'
                                    });

                                    newCi.setValue({
                                        fieldId: 'name',
                                        value: City
                                    });

                                    cityId = newCi.save();
                                }
                            }

                            if (CountryCode) {
                                search.create({
                                    type: 'customrecord_country_code',
                                    filters: [{
                                        name: 'custrecord_cc_country_code',
                                        operator: 'is',
                                        values: CountryCode
                                    }]
                                }).run().each(function (rec) {
                                    countryId = rec.id;
                                });

                                if (!countryId) {
                                    var newCode = record.create({
                                        type: 'customrecord_country_code'
                                    });

                                    newCode.setValue({
                                        fieldId: 'name',
                                        value: CountryCode
                                    });

                                    newCode.setValue({
                                        fieldId: 'custrecord_cc_country_code',
                                        value: CountryCode
                                    });

                                    countryId = newCode.save();

                                    log.debug('countryId', countryId);
                                }
                            }


                            // "ShipToAddress": {
                            //     "id": "",
                            //     "Name": "LGB3",
                            //     "AddressLine1": "4950 Goodman Way",
                            //     "AddressLine2": "",
                            //     "City": "Eastvale",
                            //     "DistrictOrCounty": "",
                            //     "StateOrProvinceCode": "CA",
                            //     "CountryCode": "US",
                            //     "PostalCode": "91752-5087"
                            // }

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: recordID,
                                values: {
                                    custrecord_dps_shipping_rec_country_regi: CountryCode,
                                    custrecord_dps_ship_small_recipient_dh: Name, // 收件人
                                    custrecord_dps_street2_dh: AddressLine2, // 收件人地址2
                                    custrecord_dps_street1_dh: AddressLine1, // 收件地址1
                                    custrecord_dps_state_dh: StateOrProvinceCode, // 收件州
                                    custrecord_dps_recipient_city_dh: cityId, // 收件城市
                                    custrecord_dps_recipien_code_dh: PostalCode, // 收件邮编
                                    custrecord_dps_recipient_country_dh: countryId, // 收件国家

                                    custrecord_dps_shipping_rec_status: 15,
                                    custrecord_dps_ful_shipmentid_array: JSON.stringify(rep),
                                    custrecord_dps_shipping_rec_shipmentsid: shipmentid1,
                                    custrecord_dps_shipping_rec_destinationf: DestinationFulfillmentCenterId
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });


                            var response1 = core.amazon.createInboundShipment(rec_account, address_id, shipmentid1, shipmentid1, DestinationFulfillmentCenterId, 'WORKING', '', label_prep_preference, reItem);

                            if (util.isObject(response1)) {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 11,
                                        custrecord_dps_shipment_info: JSON.stringify(response1)
                                    }
                                });
                            } else {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 16,
                                        custrecord_dps_shipment_info: '创建入库件成功'
                                    }
                                });
                            }

                            log.debug('response1', response1);

                            try {

                                upresp = core.amazon.updateInboundShipment(rec_account, address_id, shipping_rec_shipmentsid, 'WORKING', label_prep_preference, DestinationFulfillmentCenterId, items);

                                log.debug('upresp', upresp);

                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 10,
                                        custrecord_dps_shipment_info: '更新入库件成功'
                                    }
                                });
                            } catch (error) {
                                var id = record.submitFields({
                                    type: 'customrecord_dps_shipping_record',
                                    id: af_rec.id,
                                    values: {
                                        custrecord_dps_shipping_rec_status: 11,
                                        custrecord_dps_shipment_info: JSON.stringify(error)
                                    }
                                });
                            }
                        } else {
                            log.audit('不属于数组', rep);

                            var id = record.submitFields({
                                type: 'customrecord_dps_shipping_record',
                                id: af_rec.id,
                                values: {
                                    custrecord_dps_shipping_rec_status: 11,
                                    custrecord_dps_shipment_info: JSON.stringify(rep)
                                }
                            });
                        }


                    } catch (error) {

                        log.error('创建入库计划,获取shipment失败了', error);

                        var id = record.submitFields({
                            type: 'customrecord_dps_shipping_record',
                            id: af_rec.id,
                            values: {
                                custrecord_dps_shipping_rec_status: 11,
                                custrecord_dps_shipment_info: JSON.stringify(error)
                            }
                        });

                    }

                    try {
                        // 计算预估运费

                    } catch (error) {

                    }

                    try {
                        if (upresp) {


                            // 推送 WMS
                            wms(af_rec);
                        }
                    } catch (error) {
                        log.error('推送 WMS 失败', error);
                    }

                }

            } else {

                var id = record.submitFields({
                    type: 'customrecord_dps_shipping_record',
                    id: af_rec.id,
                    values: {
                        custrecord_dps_shipping_rec_status: 11,
                        custrecord_dps_shipment_info: "找不到对应关系,请检查对应关系"
                    }
                });

            }

        } else {
            var id = record.submitFields({
                type: af_rec.type,
                id: af_rec.id,
                values: {
                    custrecord_dps_shipping_rec_status: 11,
                    custrecord_dps_shipment_info: '店铺为空'
                }
            });
        }



    }

    if (rec_status == 5 && (tranor_type == 1 || tranor_type == 3) && shipId) { // 渠道商为龙舟, 存在shipmentId, 直接推送 WMS
        wms(af_rec);
    }

}



{
    requestId: '13131',
    requestBody:{
        "deliveryTime": "2020-07-14 20:07:44",
        "abno": "AB200601000002",
        "aono": "585591",
        "containerNo": "123",
        "boxQty": 1,
        "volume": 1000.00,
        "weight": 321.00,
        "storageList": [{
                "sku": "101030",
                "type": 2,
                "barcode": "101030",
                "positionCode": "HD2A2306",
                "qty": 50
            },
            {
                "sku": "101030",
                "type": 1,
                "barcode": "DPSLI02",
                "positionCode": "HD2A2306",
                "qty": 50
            }
        ],
        "delivery": true
    }
}




<!DOCTYPE html>  
<html>  
<head lang="en">  
    <meta charset="UTF-8">  
    <title>html 表格导出道</title>  
    <script language="JavaScript" type="text/javascript">  
        //第一种方法  
        function method1(tableid) {  
  
            var curTbl = document.getElementById(tableid);  
            var oXL = new ActiveXObject("Excel.Application");  
            var oWB = oXL.Workbooks.Add();  
            var oSheet = oWB.ActiveSheet;  
            var sel = document.body.createTextRange();  
            sel.moveToElementText(curTbl);  
            sel.select();  
            sel.execCommand("Copy");  
            oSheet.Paste();  
            oXL.Visible = true;  
  
        }  
        //第二种方法  
        function method2(tableid)  
        {  
  
            var curTbl = document.getElementById(tableid);  
            var oXL = new ActiveXObject("Excel.Application");  
            var oWB = oXL.Workbooks.Add();  
            var oSheet = oWB.ActiveSheet;  
            var Lenr = curTbl.rows.length;  
            for (i = 0; i < Lenr; i++)  
            {        var Lenc = curTbl.rows(i).cells.length;  
                for (j = 0; j < Lenc; j++)  
                {  
                    oSheet.Cells(i + 1, j + 1).value = curTbl.rows(i).cells(j).innerText;  
  
                }  
  
            }  
            oXL.Visible = true;  
        }  
        //第三种方法  
        function getXlsFromTbl(inTblId, inWindow){  
  
            try {  
                var allStr = "";  
                var curStr = "";  
                if (inTblId != null && inTblId != "" && inTblId != "null") {  
  
                    curStr = getTblData(inTblId, inWindow);  
  
                }  
                if (curStr != null) {  
                    allStr += curStr;  
                }  
  
                else {  
  
                    alert("你要导出的表不存在");  
                    return;  
                }  
                var fileName = getExcelFileName();  
                doFileExport(fileName, allStr);  
  
            }  
  
            catch(e) {  
  
                alert("导出发生异常:" + e.name + "->" + e.description + "!");  
  
            }  
  
        }  
  
        function getTblData(inTbl, inWindow) {  
  
            var rows = 0;  
            var tblDocument = document;  
            if (!!inWindow && inWindow != "") {  
  
                if (!document.all(inWindow)) {  
                    return null;  
                }  
  
                else {  
                    tblDocument = eval(inWindow).document;  
                }  
  
            }  
  
            var curTbl = tblDocument.getElementById(inTbl);  
            var outStr = "";  
            if (curTbl != null) {  
                for (var j = 0; j < curTbl.rows.length; j++) {  
                    for (var i = 0; i < curTbl.rows[j].cells.length; i++) {  
  
                        if (i == 0 && rows > 0) {  
                            outStr += " t";  
                            rows -= 1;  
                        }  
  
                        outStr += curTbl.rows[j].cells[i].innerText + "t";  
                        if (curTbl.rows[j].cells[i].colSpan > 1) {  
                            for (var k = 0; k < curTbl.rows[j].cells[i].colSpan - 1; k++) {  
                                outStr += " t";  
                            }  
                        }  
                        if (i == 0) {  
                            if (rows == 0 && curTbl.rows[j].cells[i].rowSpan > 1) {  
                                rows = curTbl.rows[j].cells[i].rowSpan - 1;  
                            }  
                        }  
                    }  
                    outStr += "rn";  
                }  
            }  
  
            else {  
                outStr = null;  
                alert(inTbl + "不存在 !");  
            }  
            return outStr;  
        }  
  
        function getExcelFileName() {  
            var d = new Date();  
            var curYear = d.getYear();  
            var curMonth = "" + (d.getMonth() + 1);  
            var curDate = "" + d.getDate();  
            var curHour = "" + d.getHours();  
            var curMinute = "" + d.getMinutes();  
            var curSecond = "" + d.getSeconds();  
            if (curMonth.length == 1) {  
                curMonth = "0" + curMonth;  
            }  
  
            if (curDate.length == 1) {  
                curDate = "0" + curDate;  
            }  
  
            if (curHour.length == 1) {  
                curHour = "0" + curHour;  
            }  
  
            if (curMinute.length == 1) {  
                curMinute = "0" + curMinute;  
            }  
  
            if (curSecond.length == 1) {  
                curSecond = "0" + curSecond;  
            }  
            var fileName = "table" + "_" + curYear + curMonth + curDate + "_"  
                    + curHour + curMinute + curSecond + ".csv";  
            return fileName;  
  
        }  
  
        function doFileExport(inName, inStr) {  
            var xlsWin = null;  
            if (!!document.all("glbHideFrm")) {  
                xlsWin = glbHideFrm;  
            }  
            else {  
                var width = 6;  
                var height = 4;  
                var openPara = "left=" + (window.screen.width / 2 - width / 2)  
                        + ",top=" + (window.screen.height / 2 - height / 2)  
                        + ",scrollbars=no,width=" + width + ",height=" + height;  
                xlsWin = window.open("", "_blank", openPara);  
            }  
            xlsWin.document.write(inStr);  
            xlsWin.document.close();  
            xlsWin.document.execCommand('Saveas', true, inName);  
            xlsWin.close();  
  
        }  
  
        //第四种  
        function method4(tableid){  
  
            var curTbl = document.getElementById(tableid);  
            var oXL;  
            try{  
                oXL = new ActiveXObject("Excel.Application"); //创建AX对象excel  
            }catch(e){  
                alert("无法启动Excel!\n\n如果您确信您的电脑中已经安装了Excel，"+"那么请调整IE的安全级别。\n\n具体操作：\n\n"+"工具 → Internet选项 → 安全 → 自定义级别 → 对没有标记为安全的ActiveX进行初始化和脚本运行 → 启用");  
                return false;  
            }  
            var oWB = oXL.Workbooks.Add(); //获取workbook对象  
            var oSheet = oWB.ActiveSheet;//激活当前sheet  
            var sel = document.body.createTextRange();  
            sel.moveToElementText(curTbl); //把表格中的内容移到TextRange中  
            sel.select(); //全选TextRange中内容  
            sel.execCommand("Copy");//复制TextRange中内容  
            oSheet.Paste();//粘贴到活动的EXCEL中  
            oXL.Visible = true; //设置excel可见属性  
            var fname = oXL.Application.GetSaveAsFilename("将table导出到excel.xls", "Excel Spreadsheets (*.xls), *.xls");  
            oWB.SaveAs(fname);  
            oWB.Close();  
            oXL.Quit();  
        }  
  
  
        //第五种方法  
        var idTmr;  
        function  getExplorer() {  
            var explorer = window.navigator.userAgent ;  
            //ie  
            if (explorer.indexOf("MSIE") >= 0) {  
                return 'ie';  
            }  
            //firefox  
            else if (explorer.indexOf("Firefox") >= 0) {  
                return 'Firefox';  
            }  
            //Chrome  
            else if(explorer.indexOf("Chrome") >= 0){  
                return 'Chrome';  
            }  
            //Opera  
            else if(explorer.indexOf("Opera") >= 0){  
                return 'Opera';  
            }  
            //Safari  
            else if(explorer.indexOf("Safari") >= 0){  
                return 'Safari';  
            }  
        }  
        function method5(tableid) {  
			console.log('getExplorer()',getExplorer())
            if(getExplorer()=='ie')  
            {  console.log('getExplorer()',getExplorer())
                var curTbl = document.getElementById(tableid);  
                var oXL = new ActiveXObject("Excel.Application");  
                var oWB = oXL.Workbooks.Add();  
                var xlsheet = oWB.Worksheets(1);  
                var sel = document.body.createTextRange();  
                sel.moveToElementText(curTbl);  
                sel.select();  
                sel.execCommand("Copy");  
                xlsheet.Paste();  
                oXL.Visible = true;  
  
                try {  
                    var fname = oXL.Application.GetSaveAsFilename("Excel.xls", "Excel Spreadsheets (*.xls), *.xls");  
                } catch (e) {  
                    print("Nested catch caught " + e);  
                } finally {  
                    oWB.SaveAs(fname);  
                    oWB.Close(savechanges = false);  
                    oXL.Quit();  
                    oXL = null;  
                    idTmr = window.setInterval("Cleanup();", 1);  
                }  
  
            }  
            else  
            {  console.log('tableid',tableid)
                tableToExcel(tableid)  
            }  
        }  
        function Cleanup() {  
            window.clearInterval(idTmr);  
            CollectGarbage();  
        }  
        var tableToExcel = (function() {  
            var uri = 'data:application/vnd.ms-excel;base64,',  
                    template = '<html><head><meta charset="UTF-8"></head><body><table>{table}</table></body></html>',  
                    base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) },  
                    format = function(s, c) {  
                        return s.replace(/{(\w+)}/g,  
                                function(m, p) { return c[p]; }) }  
            return function(table, name) {  
                if (!table.nodeType) table = document.getElementById(table)  
                var ctx = {worksheet: name || 'Worksheet', table: table.innerHTML}  
                window.location.href = uri + base64(format(template, ctx))  
            }  
        })()  
  
    </script>  
</head>  
<body>  
  
<div >  
    <button type="button" onclick="method1('tableExcel')">导出Excel方法一</button>  
    <button type="button" onclick="method2('tableExcel')">导出Excel方法二</button>  
    <button type="button" onclick="getXlsFromTbl('tableExcel','myDiv')">导出Excel方法三</button>  
    <button type="button" onclick="method4('tableExcel')">导出Excel方法四</button>  
    <button type="button" onclick="method5('tableExcel')">导出Excel方法五</button>  
</div>  
<div id="myDiv">  
<table id="tableExcel" width="100%" border="1" cellspacing="0" cellpadding="0">  
    <tr>  
        <td colspan="5" align="center">html 表格导出道Excel</td>  
    </tr>  
    <tr>  
        <td>列标题1</td>  
        <td>列标题2</td>  
        <td>类标题3</td>  
        <td>列标题4</td>  
        <td>列标题5</td>  
    </tr>  
    <tr>  
        <td>aaa</td>  
        <td>bbb</td>  
        <td>ccc</td>  
        <td>ddd</td>  
        <td>eee</td>  
    </tr>  
    <tr>  
        <td>AAA</td>  
        <td>BBB</td>  
        <td>CCC</td>  
        <td>DDD</td>  
        <td>EEE</td>  
    </tr>  
    <tr>  
        <td>FFF</td>  
        <td>GGG</td>  
        <td>HHH</td>  
        <td>III</td>  
        <td>JJJ</td>  
    </tr>  
</table>  
</div>  
</body>  
</html>  