/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(['./jetstar/dps_logistics_request.js',
    './openapi/dps_openapi_request.js',
    './yanwen/dps_yanwen_request.js',
    './endicia/dps_endicia_request.js',
    './common/Moment.min', 'N/http', 'N/record', 'N/search', 'N/file', "N/xml"],
    function (jetstar, openapi, yanwen, endicia, Moment, http, record, search, file, xml, redirect, serverWidget) {

        function onRequest(context) {
            var sear = search.load({
                id: 'customsearch184'
            })
            log.audit('filters',sear.filters);
            log.audit('columns',sear.columns);
            return
            // search.create({
            //     type: 'purchaseorder',
            //     filters: [
            //         { name: "mainline", operator: "is", values: ["F"] },
            //         { name: "taxline", operator: "is", values: ["F"] },
            //         { name: "item", operator: "noneof", values: ["@NONE@"] },
            //         { name: "type", operator: "anyof", values: ["PurchOrd"] },
            //         { name: "custbody_dps_type", operator: "anyof", values: ["2"] },
            //         { name: "subsidiary", operator: "is", values: ['5'] },
            //         { name: "item", operator: "anyof", values: ['39165'] }
            //     ],
            //     columns: [
            //         { name: "datecreated", label: "日期", type: "date", sort: "DESC" },//0
            //         { name: "subsidiary", label: "子公司", type: "select" },//1
            //         { name: "custbody_dps_type", label: "采购订单类型", type: "select" },//2
            //         { name: "line", label: "行Id", type: "integer" },//3
            //         { name: "item", label: "货品名称", type: "select" },//4
            //         { name: "quantity", label: "采购数量", type: "float" },//5
            //         { name: "custcoltransferable_quantity", label: "可调拨数量", type: "float" },//6
            //         { name: "custcol_transferred_quantity", label: "已调拨数量", type: "float" },//7
            //         { name: "custcol_realted_transfer_detail", label: "关联调拨单号", type: "select" }//8
            //     ]
            // }).run().each(function (rec) {
            //     context.response.write(rec.id)
            //     return true
            // });
            // 捷士测试
            // jetstarApi.init(http)
            // var reqParam = jetstarApi.Create(rec)
            // context.response.write(JSON.stringify(reqParam))
            //log.audit('response', response.body)
            //出口易测试
            // openApi.init(http, search, record)
            // var reqParam = openApi.CreateOrders()
            //获取出口易列表
            // var list = openApi.GetList(Moment().day(-7).toSimpleISOString(), Moment().toSimpleISOString())
            //取消出口易订单
            // var reqParam = openApi.Cancel('SMT2301554378', 'PackageId')
            //获取出口易标签
            // var reqParam = openApi.GetLabels("SMT23015236489", 'ClassicLabel', "AddressCustomsRemarkSplit", "Sku,Custom", 'PackageId')
            // if (reqParam.code == "200") {
            //     //切到页面上显示标签
            //     var fileObj = file.create({
            //         name: 'label.pdf',
            //         fileType: file.Type.PDF,
            //         contents: reqParam.data.Label,
            //         description: 'This is a plain text file.',
            //         encoding: file.Encoding.UTF8,
            //         isOnline: true
            //     });
            //     context.response.writeFile({
            //         file: fileObj,
            //         isInline: true
            //     })
            //     // 保存文件 folder表示文件柜里面的文件夹的id
            //     // fileObj.folder = 1022;
            //     // var fileId = fileObj.save();
            //     // context.response.write(fileId + "")
            // } else {
            //     context.response.write(reqParam.msg)
            // }
            // var reqParam = openApi.GetInfo('SMT23015236489')
            // yanwenApi.init(http, xml, file)
            //创建运单
            // var param = yanwenApi.Create()
            //获取发货渠道
            // var param = yanwenApi.GetChannels()
            // context.response.write(JSON.stringify(param))
            //获取线上发货渠道
            // var param = yanwenApi.GetOnlineChannel()
            // 获取快件列表
            // var param = yanwenApi.SearchOrder('2020-01-14','2020-05-14',1)
            // 生成标签
            // var param = yanwenApi.CreateSingleLabel('UF051110478YP', 'A10x10L')
            // 生成多个标签
            // var param = yanwenApi.CreateMultiLabel('UF051110478YP,UF691254349YP', 'A10x10L')
            // var fileObj = file.create({
            //     name: 'yanwenlabel.pdf',
            //     fileType: file.Type.PDF,
            //     contents: param.data,
            //     description: 'This is a plain text file.',
            //     encoding: file.Encoding.UTF8,
            //     isOnline: true
            // });
            // context.response.writeFile({
            //     file: fileObj,
            //     isInline: true
            // })
            // 修改状态
            // var param = yanwenApi.ChangeStatus(0, 'YE890157575CN')
            // 获取渠道所能到达的国家
            // var param = yanwenApi.GetCountries('485')
            // context.response.write(JSON.stringify(param))
            // var fileObj = file.create({
            //     name: 'yanwenlabel.pdf',
            //     fileType: file.Type.PLAINTEXT,
            //     contents: param.data,
            //     description: 'This is a plain text file.',
            //     encoding: file.Encoding.UTF8,
            //     isOnline: true
            // });
            // fileObj.folder = 1022;
            // var fileId = fileObj.save();
            // context.response.writeFile({
            //     file: fileObj,
            //     isInline: true
            // })
            // var param = yanwenApi.Create()
            endiciaApi.init(http, xml, search)
            //生成标签
            // var param = endiciaApi.GetPostageLabel()
            // var fileObj = file.create({
            //     name: 'test.png',
            //     fileType: file.Type.PNGIMAGE,
            //     contents: param.data,
            //     description: 'This is a plain text file.',
            //     encoding: file.Encoding.UTF8,
            //     isOnline: true
            // });
            // context.response.writeFile({
            //     file: fileObj,
            //     isInline: true
            // })
            //取消标签
            // var param = endiciaApi.RefundLabel('S000045454','CJ501214385US')
            // context.response.write(JSON.stringify(param))
            // 购买运费
            var orderId = Math.random() * 1000000 + 100000
            var param = endiciaApi.BuyPostage(orderId.toFixed(0), 100)
            context.response.write(JSON.stringify(param))
            // var param = endiciaApi.CalculatePostageRate({
            //     MailClass: 'Priority',
            //     WeightOz: '32',
            //     MailpieceShape: 'Parcel',
            //     FromPostalCode: '90245',
            //     ToPostalCode: '90247',
            // })
            //追踪包裹
            // var param = endiciaApi.StatusRequest('3247S86713213','CURRENT','00040000999999999999')
            // context.response.write(JSON.stringify(param))
        }

        return {
            onRequest: onRequest
        }
    });
