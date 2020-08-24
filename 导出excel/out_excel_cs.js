/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/https', 'N/record', 'N/search', 'N/log', 'N/url',
				'N/currentRecord', 'N/ui/dialog' ],

		function(https, record, search, log, url, currentRecord, dialog) {

			/**
			 * Function to be executed after page is initialized.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.mode - The mode in which the record is
			 *            being accessed (create, copy, or edit)
			 * 
			 * @since 2015.2
			 */
			function pageInit(scriptContext) {
				var itemRecord = currentRecord.get();
				var bom = itemRecord.getValue("custpage_bom");
				if(bom){
					findData(scriptContext);
				}				
			}
			function findData(scriptContext) {
				var itemRecord = currentRecord.get();
				var bom = itemRecord.getValue("custpage_bom");
				var bomVs = itemRecord.getValue("custpage_bom_version");
				var bomDate = itemRecord.getValue("custpage_bom_date");
				if (!bomDate) {
					dialog.alert({
						title : '提示',
						message : '日期不能为空'
					});
					return false;
				}
				var d = new Date(String(bomDate));
				bomDate = d.getFullYear() + '年' + (d.getMonth() + 1) + '月'
						+ d.getDate() + '日';
				if (!bom) {
					dialog.alert({
						title : '提示',
						message : '物料单不能为空'
					});
					return false;
				}
			
				if (bom && bomVs && bomDate) {
					var url = '/app/site/hosting/scriptlet.nl?script=106&deploy=1'
							+ '&bom='
							+ bom
							+ '&bomVs='
							+ bomVs
							+ '&bomDate='
							+ bomDate;
					window.location.href = url;
				}

			}

			function outExcel(scriptContext) {
				var itemRecord = currentRecord.get();
				var numLines = itemRecord.getLineCount({
						sublistId : 'custpage_details'
					})
				if (numLines > 0) {
					var resultjson = {};
					var excelData = [];
					for (var i = 0; i < numLines; i++) {
						var json = {};
						var name = itemRecord.getSublistValue({
							sublistId : 'custpage_details',
							fieldId : 'name',
							line : i
						});
						var level = itemRecord.getSublistValue({
							sublistId : 'custpage_details',
							fieldId : 'level',
							line : i
						});
						var componentOut = itemRecord.getSublistValue({
							sublistId : 'custpage_details',
							fieldId : 'component_out',
							line : i
						});
						var num = itemRecord.getSublistValue({
							sublistId : 'custpage_details',
							fieldId : 'component_num',
							line : i
						});
						var instructions = itemRecord.getSublistValue({
							sublistId : 'custpage_details',
							fieldId : 'instructions',
							line : i
						});
						json.name = name.replace(/&nbsp/ig,"");
						json.level = level;
						json.componentOut = componentOut;
						json.num = num;
						json.instructions = instructions;			
						excelData.push(json);						
					}
					resultjson.line = excelData;			
				var output = url.resolveScript({
	                scriptId: 'customscript_out_excel2_sl',
	                deploymentId: 'customdeploy_out_excel2_sl',
	                returnExternalUrl: false,
	                params: {
	                	excelData: JSON.stringify(resultjson)
	                }
	            })
	            window.open(output);
				} else {
					dialog.alert({
						title : '提示',
						message : '无导出数据'
					});
					return false;
				}
			}
			/**
			 * Function to be executed when field is changed.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
			 * @param {string}
			 *            scriptContext.fieldId - Field name
			 * @param {number}
			 *            scriptContext.lineNum - Line number. Will be undefined
			 *            if not a sublist or matrix field
			 * @param {number}
			 *            scriptContext.columnNum - Line number. Will be
			 *            undefined if not a matrix field
			 * 
			 * @since 2015.2
			 */
			function fieldChanged(scriptContext) {
				if (scriptContext.fieldId == "custpage_bom") {
					var itemRecord = currentRecord.get();
					var bom = itemRecord.getValue("custpage_bom");
					var bomData = itemRecord.getField({
						fieldId : 'custpage_bom_version'
					});
					bomData.removeSelectOption({
						value : null,
					});
					var filters = [ {
						name : 'billofmaterials',
						operator : 'is',
						values : bom
					} ]
					var mySearch = search.create({
						type : 'bomrevision',
						filters : filters,
						columns : [ 'name' ]
					});
					mySearch.run().each(function(result) {
						log.debug("name---》", result.getValue('name'));
						bomData.insertSelectOption({
							value : result.getValue('name'),
							text : result.getValue('name')
						});
						return true;
					});

				}
			}

			/**
			 * Function to be executed when field is slaved.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
			 * @param {string}
			 *            scriptContext.fieldId - Field name
			 * 
			 * @since 2015.2
			 */
			function postSourcing(scriptContext) {

			}

			/**
			 * Function to be executed after sublist is inserted, removed, or
			 * edited.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
			 * 
			 * @since 2015.2
			 */
			function sublistChanged(scriptContext) {

			}

			/**
			 * Function to be executed after line is selected.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
			 * 
			 * @since 2015.2
			 */
			function lineInit(scriptContext) {

			}

			/**
			 * Validation function to be executed when field is changed.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
			 * @param {string}
			 *            scriptContext.fieldId - Field name
			 * @param {number}
			 *            scriptContext.lineNum - Line number. Will be undefined
			 *            if not a sublist or matrix field
			 * @param {number}
			 *            scriptContext.columnNum - Line number. Will be
			 *            undefined if not a matrix field
			 * 
			 * @returns {boolean} Return true if field is valid
			 * 
			 * @since 2015.2
			 */
			function validateField(scriptContext) {
				return true;
			}

			/**
			 * Validation function to be executed when sublist line is
			 * committed.
			 * 
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
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
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
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
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @param {string}
			 *            scriptContext.sublistId - Sublist name
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
			 * @param {Object}
			 *            scriptContext
			 * @param {Record}
			 *            scriptContext.currentRecord - Current form record
			 * @returns {boolean} Return true if record is valid
			 * 
			 * @since 2015.2
			 */
			function saveRecord(scriptContext) {
				return true;
			}

			return {
				pageInit : pageInit,
				findData : findData,
				outExcel : outExcel,
				fieldChanged : fieldChanged,
				postSourcing : postSourcing,
				sublistChanged : sublistChanged,
				lineInit : lineInit,
				validateField : validateField,
				validateLine : validateLine,
				validateInsert : validateInsert,
				validateDelete : validateDelete,
				saveRecord : saveRecord
			};

		});
