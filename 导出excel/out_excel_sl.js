/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(
		[ "require", "exports", "N/search", "N/record", "N/log",
				"N/ui/serverWidget","N/file",'N/encode'],

		function(require, exports, search, record, log, ui,file,encode) {

			/**
			 * Definition of the Suitelet script trigger point.
			 * 
			 * @param {Object}
			 *            context
			 * @param {ServerRequest}
			 *            context.request - Encapsulation of the incoming
			 *            request
			 * @param {ServerResponse}
			 *            context.response - Encapsulation of the Suitelet
			 *            response
			 * @Since 2015.2
			 */
			function onRequest(context) {
				var request = context.request;
				var method = request.method;
				var params = request.parameters;
				var form = ui.createForm({
					title : '物料清单查询'
				});
				form.addFieldGroup({
					id : 'custpage_filter',
					label : '查询条件'
				});
				var bomField = form.addField({
					id : 'custpage_bom',
					type : ui.FieldType.SELECT,
					source : 'bom',
					label : '物料单',
					container : 'custpage_filter'
				});
				var bomDateField = form.addField({
					id : 'custpage_bom_date',
					type : ui.FieldType.DATE,
					source : 'bom',
					label : '有效日期',
					container : 'custpage_filter'
				});
				var bomData = form.addField({
					id : 'custpage_bom_version',
					type : ui.FieldType.SELECT,
					label : '版本',
					container : 'custpage_filter'
				});
				form.clientScriptModulePath = '/SuiteScripts/Jzou/cux/outexcel/out_excel_cs.js';
				form.addButton({
					id : 'custpage_issue_po',
					label : '查询',
					functionName : 'findData("' + context + '")'
				});
				form.addButton({
					id : 'custpage_issue_status',
					label : '导出excel',
					functionName : 'outExcel("' + context + '")'
				});
				var sb = form.addSublist({
					id : 'custpage_details',
					type : ui.SublistType.LIST,
					label : '自定义',
					tab : 'custpage_po'
				});
				sb.addField({
					id : 'name',
					type : ui.FieldType.TEXT,
					label : '组件名称'
				});
				sb.addField({
					id : 'level',
					type : ui.FieldType.TEXT,
					label : '等级'
				});
				sb.addField({
					id : 'component_out',
					type : ui.FieldType.TEXT,
					label : '组件产出'
				});
				sb.addField({
					id : 'component_num',
					type : ui.FieldType.TEXT,
					label : '每组装品的 BOM 数量'
				});
				sb.addField({
					id : 'instructions',
					type : ui.FieldType.TEXT,
					label : '说明'
				});
				if (params.bom && params.bomVs && params.bomDate) {
					log.debug("params----->", params);
					bomField.defaultValue = params.bom;
					bomDateField.defaultValue =params.bomDate;
					bomData.defaultValue = params.bomVs ;
					var resultData2 = [];
					var number = 1;
					var mySearch = search
							.create({
								type : 'bomrevision',
								columns : [ {
									name : "item",
									join : "component"
								},{
									name : "componentyield",
									join : "component"//组件产出 
								},{
									name : "bombasequantity",
									join : "component"//每组装品的 BOM 数量 
								} ,{
									name : "description",
									join : "component"//描述
								}],
								filters : [
										[['effectiveenddate',search.Operator.NOTAFTER,params.bomDate ],
												'or',
										['effectiveenddate',search.Operator.ISEMPTY,null ] ],
										'and',
										[ [ 'billofmaterials',search.Operator.IS, params.bom ] ],'and',[['name',search.Operator.IS,params.bomVs]] ]
							});
					mySearch.run().each(function(result) {
						var json = {};
						var item = result.getValue({
							name : "item",
							join : "component"
						});
						var itemName = result.getText({
							name : "item",
							join : "component"
						});
						var componentyield = result.getValue({
							name : "componentyield",
							join : "component"
						});
						var bombasequantity = result.getValue({
							name : "bombasequantity",
							join : "component"
						});
						var description = result.getValue({
							name : "description",
							join : "component"
						});
						var level = 1;						
						json.number = number.toFixed(0);
						number = number+1;
						json.itemName = itemName;
						json.level = level;	
						json.componentyield=componentyield;
						json.bombasequantity=bombasequantity;
						json.description=description;
						resultData2.push(json);
						getData2(itemName,level,resultData2,params,json.number,'');
						return true;
					});
					for (var i = 0; i < resultData2.length; i++) {
						sb.setSublistValue({
							id : 'name',
							value : resultData2[i].itemName,
							line :i
						});
						sb.setSublistValue({
							id : 'level',
							value : resultData2[i].number,
							line : i
						});
						sb.setSublistValue({
							id : 'component_out',
							value : resultData2[i].componentyield,
							line :i
						});
						sb.setSublistValue({
							id : 'component_num',
							value : resultData2[i].bombasequantity,
							line :i
						});
						sb.setSublistValue({
							id : 'instructions',
							value : resultData2[i].description ? resultData2[i].description :" ",
							line :i
						});
					};										
					log.debug("resultData----->", resultData2);
				}			
				function getData2(itemName,level,resultData2,params,number,kongGe) {
					level =level +1;
					var number2 = 1;
					kongGe =kongGe+ "&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp";
					var mySearch = search.create({
						type : 'item',
						filters : [ {
							name : 'name',
							operator : 'is',
							values : itemName
						} ],
						columns : [ {
							join : "assemblyItemBillOfMaterials",
							name : "billofmaterials"
						} ]
					});
					mySearch.run().each(function(result) {
						var json = {}
						var billofmaterials = result.getValue({
							join : "assemblyItemBillOfMaterials",
							name : "billofmaterials"
						});
						var mySearch2 = search
						.create({
							type : 'bomrevision',
							filters : [
									[['effectiveenddate',search.Operator.NOTAFTER,params.bomDate ],
											'or',['effectiveenddate',search.Operator.ISEMPTY,null ] ],
									'and',
									[ ['billofmaterials',search.Operator.IS,billofmaterials ] ] ],
							columns : [ {
								name : "item",
								join : "component"
							},{
								name : "componentyield",
								join : "component"//组件产出 
							} ,{
								name : "bombasequantity",
								join : "component"//每组装品的 BOM 数量 
							},{
								name : "description",
								join : "component"//描述
							}]
						});
						mySearch2.run().each(
								function(result2) {
									var json = {};
									var itemName = result2.getText({
										name : "item",
										join : "component"
									});
									var componentyield2 = result2.getValue({
										name : "componentyield",
										join : "component"
									});
									var bombasequantity2 = result2.getValue({
										name : "bombasequantity",
										join : "component"
									});
									var description2 = result2.getValue({
										name : "description",
										join : "component"
									});
									json.number = number +"."+number2;
									number2 = number2+1;							
									json.itemName =kongGe+ itemName;
									json.level = level;
									json.componentyield=componentyield2;
									json.bombasequantity=bombasequantity2;
									json.description=description2;
									resultData2.push(json);
									getData2(itemName,level,resultData2,params,json.number,kongGe);								
									return true;
								});
						return true;
					});
				}			
				context.response.writePage({
					pageObject : form
				});
				return true;
			}
			return {
				onRequest : onRequest
			};

		});
