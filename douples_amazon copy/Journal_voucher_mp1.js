/*
 * @Date           : 2020-03-23 17:58:37
 * @LastEditors    : Li
 * @LastEditTime   : 2020-04-15 15:51:26
 * @Description    : 
 * @FilePath       : \Bundle 322723\Journal_voucher_mp.js
 * @Author         : Li
 * @可以输入预定的版权声明、个性签名、空行等
 */
/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@description 根据结算报告的费用项, 进行冲销
 */
define(['N/search', 'N/record', './Moment.min', 'N/format', 'N/runtime'],
	function (search, record, moment, format, runtime) {
		//查找结算报告，进行冲销
		function getInputData() {
			var limit = 10, orders = []
			search.create({
				type: "customrecord_aio_amazon_settlement",
				filters: [
					{ name: "custrecord_settle_is_generate_voucher", operator: 'is', values: false },
					{ name: "custrecord_aio_sett_tran_type", operator: 'startswith', values: 'Order' },
					{ name: "custrecord_aio_sett_amount_type", operator: 'isnot', values: "ItemPrice" }
				],
				columns: [
					{ name: 'custrecord_aio_sett_order_id', summary: "GROUP" }
				]
			}).run().each(function (e) {
				orders.push(e.getValue(e.columns[0]))

				return --limit > 0
			})
			log.audit("待冲销总数", orders.length)
			return orders;
		}

		function map(context) {
			//    	var test = '345567,43'
			//    		log.debug('cccc',test.replace(',','.'))
			//    	return;
			var err = [];
			var so_id;
			try {
				log.debug("context.value：", context.value)
				var settlmentid, trandate;
				var depositdate;
				var CR = 0;
				var DR = 0;
				var cache_id = context.value
				var orderid = context.value
				if (!orderid) return;//如果没有亚马逊订单号直接返回
				var entity, orderstatus, subsidiary, currency, pr_store, settlement_ids = [];
				//搜索销售订单获取客户
				search.create({
					type: record.Type.SALES_ORDER,
					filters: [
						{ name: 'poastext', operator: 'is', values: orderid },
						{ name: 'mainline', operator: 'is', values: true }
					],
					columns: [
						{ name: 'entity' },
						{ name: 'statusref' },
						{ name: 'subsidiary' },
						{ name: 'custbody_pr_store' },
						{ name: 'currency' },
					]
				}).run().each(function (rec) {
					so_id = rec.id;
					entity = rec.getValue('entity');
					orderstatus = rec.getValue('statusref');
					subsidiary = rec.getValue('subsidiary');
					pr_store = rec.getValue('custbody_pr_store');
					currency = rec.getValue('currency');
					return false;
				});
				log.audit("entity", entity)
				if (!so_id) return;

				log.audit("orderstatus", orderstatus)
				//TODO 判断订单状态，如果已经全额收款或者已关闭，则不再生成日记账
				//结算报告是多条数据对应一个日记账，不能清除
				// search.create({
				//   type:'journalentry',
				//   filters:[
				//       {name:'mainline',operator:'is',values:true},
				//       {name:'custbody_jour_orderid',operator:'is',values:orderid},
				//   ],columns:[{name:"memomain"}]
				// }).run().each(function(e){
				//   try{
				//   if(e.getValue("memomain") == "02"|| e.getValue("memomain") == "03"){
				//     var de =  record.delete({type:'journalentry',id:e.id})
				//     log.debug("删除成功  ",de)
				//   }
				//   }catch(e){
				//     log.debug("delete error",e)
				//   }
				//  return true
				// })

				var jour = record.create({ type: 'journalentry', isDynamic: true })
				jour.setValue({ fieldId: 'memo', value: "02" })
				jour.setValue({ fieldId: 'subsidiary', value: subsidiary })
				jour.setValue({ fieldId: 'currency', value: currency })
				jour.setValue({ fieldId: 'custbody_pr_store', value: pr_store })
				jour.setValue({ fieldId: 'custbody_jour_orderid', value: orderid })
				jour.setValue({ fieldId: 'custbody_curr_voucher', value: "冲减凭证" })
				log.debug("orderid", orderid)

				search.create({
					type: "customrecord_aio_amazon_settlement",
					filters: [
						//  {name:"custrecord_settle_is_generate_voucher",operator:'is',values:false},
						{ name: "custrecord_aio_sett_order_id", operator: 'is', values: orderid },
						// {name:"custrecord_settle_checked_2",operator:'is',values:true},
						{ name: "custrecord_aio_sett_tran_type", operator: 'isnot', values: "Refund" },
						//  {name:"custrecord_aio_sett_amount_type",operator:'isnot',values:"ItemPrice"},
						// {name:"custrecord_aio_sett_amount_desc",operator:'isnot',values:"Principal"},
						// {name:"custrecord_settlement_start",operator:'isnotempty'},
					],
					columns: [
						{ name: 'custrecord_aio_sett_tran_type' },
						{ name: 'custrecord_aio_sett_amount_type' },
						{ name: 'custrecord_aio_sett_amount_desc' },
						{ name: 'custrecord_aio_sett_amount' },
						{ name: 'custrecord_aio_sett_id' },
						{ name: 'custrecord_aio_sett_order_id' },
						{ name: 'custrecord_aio_sett_deposit_date' },
					]
				}).run().each(function (rec) {
					settlement_ids.push(rec.id)
					depositdate = rec.getValue('custrecord_aio_sett_deposit_date')
					log.debug("rec depositdate:" + typeof (depositdate), depositdate)
					var Tranction_type = rec.getValue('custrecord_aio_sett_tran_type');
					var Amount_type = rec.getValue('custrecord_aio_sett_amount_type');
					var Amount_desc = rec.getValue('custrecord_aio_sett_amount_desc');
					var ettlmentid = rec.getValue('custrecord_aio_sett_id');
					var amount = rec.getValue('custrecord_aio_sett_amount');
					if (amount.indexOf(',') != -1) {
						amount = amount.replace(',', '.')
					}

					if (((Amount_desc == "Tax" || Amount_desc == "Principal") && Tranction_type == "Order" && Amount_type == "ItemPrice")) {
						log.debug("该金额不计入日记账")
					} else if (Number(amount) != 0) {
						log.debug("该金额需要计入日记账")
						log.debug("amount：" + amount, Tranction_type + "," + Amount_type + "," + Amount_desc)
						var customrecord_itemid;

						// TODO  未配置对应的关系, 科目 暂先 固定某一科目
						search.create({
							type: 'customrecord_cost_type_vs_cost_item',
							filters: [
								{ name: 'custrecord_amazon_amount_type', operator: 'is', values: Amount_type },
								{ name: 'custrecord_amazon_amount_description', operator: 'is', values: Amount_desc },
								{ name: 'custrecord_amazon_transaction_type', operator: 'is', values: Tranction_type }
							],
							columns: [
								{ name: 'custrecord_allowance_item' }
							]
						}).run().each(function (e) {
							customrecord_itemid = e.getValue(e.columns[0])
						});

						// TODO 固定货品
						customrecord_itemid = 2465;
						log.debug("customrecord_itemid", customrecord_itemid);
						if (customrecord_itemid) {
							search.create({
								type: 'item',
								filters: [
									{ name: 'internalid', operator: 'is', values: customrecord_itemid },
								],
								columns: [
									{ name: 'incomeaccount' }
								]
							}).run().each(function (e) {
								incomeaccount = e.getValue(e.columns[0])
							})
							DR -= Number(amount)
							log.debug('DR累计', DR)
							jour.selectNewLine({ sublistId: 'line' })
							jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: incomeaccount })
							jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "结 " + orderid })
							jour.setCurrentSublistValue({
								sublistId: 'line',
								fieldId: "debit",
								value: 0 - Number(amount)
							}) //借
							jour.commitLine({ sublistId: 'line' })
							//  record.submitFields({
							//     type: "customrecord_aio_amazon_settlement",
							//     id: rec.id,
							//     values: {
							//       custrecord_settle_checked:true
							//     }
							// })
						} else {
							log.debug("未找到对应科目货品", customrecord_itemid)
						}
					}
					return true
				})
				log.debug('查出的DR', DR)
				if (DR != 0) {
					var relative_finance, jo1_id, jo3_id;
					var ins
					search.create({
						type: "journalentry", filters: [
							{ name: "custbody_jour_orderid", operator: 'is', values: orderid },
							{ name: "memomain", operator: 'is', values: '01' }
						],
						columns: [
							{ name: "internalid", summary: "GROUP" }
						]
					}).run().each(function (jo) {
						jo1_id = jo.getValue(jo.columns[0])
						log.debug('查出的01类凭证', DR)
						var re_jou = record.load({ type: "journalentry", id: jo1_id })
						relative_finance = re_jou.getValue("custbody_relative_finanace_report")
						trandate = re_jou.getValue("trandate");
						log.debug("trandate:" + typeof (trandate) + "-," + trandate, JSON.stringify(trandate))
						// trandate = re_jou.getValue("trandate").replace(/[\u4e00-\u9fa5]/g,'/');
						var len = re_jou.getLineCount({ sublistId: "line" })
						for (var le = 0; le < len; le++) {
							var acc = re_jou.getSublistValue({ sublistId: 'line', fieldId: 'account', line: le })
							var memo = re_jou.getSublistValue({ sublistId: 'line', fieldId: 'memo', line: le })
							log.debug("找到第一步的日记账:" + jo1_id, memo)
							if (acc != 122 && memo.indexOf("物") == -1) {
								var dam = re_jou.getSublistValue({ sublistId: 'line', fieldId: 'debit', line: le })
								var cam = re_jou.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: le })
								jour.selectNewLine({ sublistId: 'line' })
								jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: acc })
								jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: "预 " + orderid })
								if (dam) jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: dam }) //贷
								else jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: cam }) //借
								jour.commitLine({ sublistId: 'line' })
							} else {
								if (Number(re_jou.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: le }))) {
									CR += Number(re_jou.getSublistValue({ sublistId: 'line', fieldId: 'credit', line: le }))
								} else {
									CR -= Number(re_jou.getSublistValue({ sublistId: 'line', fieldId: 'debit', line: le }))
								}
							}
						}
						return true;
					})
					log.debug("total:DR-CR", DR + "-" + CR)
					var s = DR - CR
					log.debug("差额:", s.toFixed(2))
					//  122 	应收账款-集团外公司  1341 主营业务收入-集团外公司
					if (Number(s.toFixed(2))) {
						jour.selectNewLine({ sublistId: 'line' })
						jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 122 })
						jour.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: orderid })
						jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: s.toFixed(2) }) //贷
						jour.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
						jour.commitLine({ sublistId: 'line' })
					}

					jour.setValue({ fieldId: 'trandate', value: moment.utc(getFormatedDate(depositdate)).toDate() })
					// jour.setValue({fieldId:'custbody_amazon_settlementid',value:settlmentid})
					jour.setValue({ fieldId: 'custbody_relative_finanace_report', value: relative_finance })
					//  jour.setValue({fieldId:'custbody_relative_inoice',value:cache_id})

					var jo_2 = jour.save();
					log.debug("depositdate:" + typeof (depositdate), depositdate)
					depositdate = depositdate.substring(0, depositdate.length - 4)
					log.debug("第二步 success:" + jo_2, trandate)
					if (jo_2) {
						try {

							var acc = pr_store, account;
							var jour_3 = record.create({ type: 'journalentry', isDynamic: true })
							jour_3.setValue({ fieldId: 'subsidiary', value: subsidiary })
							jour_3.setValue({ fieldId: 'currency', value: currency })
							jour_3.setValue({ fieldId: 'trandate', value: moment.utc(getFormatedDate(depositdate)).toDate() })
							// jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
							jour_3.setValue({ fieldId: 'custbody_relative_finanace_report', value: relative_finance })
							jour_3.setValue({ fieldId: 'memo', value: "03" })
							jour_3.setValue({ fieldId: 'custbody_pr_store', value: acc })
							jour_3.setValue({ fieldId: 'custbody_jour_orderid', value: orderid })
							jour_3.setValue({ fieldId: 'custbody_curr_voucher', value: "收款凭证" })
							search.create({
								type: 'customrecord_aio_account',
								filters: [{ name: 'internalid', operator: 'is', values: acc }],
								columns: [{ name: 'custrecord_customer_payment_account' }]
							}).run().each(function (e) {
								account = e.getValue(e.columns[0])
							})

							// TODO 店铺的银行科目 未配置, 暂先固定   125  未存资金
							account = 125
							DR = Number(DR).toFixed(2)
							log.debug('subsidiary', subsidiary)
							log.debug('account', account)
							if (DR > 0) {

								jour_3.selectNewLine({ sublistId: 'line' })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: account })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: orderid })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: DR }) //贷
								jour_3.commitLine({ sublistId: 'line' })
								jour_3.selectNewLine({ sublistId: 'line' })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 122 })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: orderid })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: DR }) //借
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
								jour_3.commitLine({ sublistId: 'line' })
							} else if (DR < 0) {
								jour_3.selectNewLine({ sublistId: 'line' })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: account })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: orderid })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "debit", value: DR })  //借
								jour_3.commitLine({ sublistId: 'line' })
								jour_3.selectNewLine({ sublistId: 'line' })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: 122 })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: orderid })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "credit", value: DR })
								jour_3.setCurrentSublistValue({ sublistId: 'line', fieldId: "entity", value: entity }) //客户
								jour_3.commitLine({ sublistId: 'line' })

							}
							// jour_3.setValue({fieldId:'custbody_amazon_settlementid',value:settlmentid})
							// jour_3.setValue({fieldId:'custbody_relative_inoice',value:cache_id})
							//   jour_3.setValue({fieldId:'trandate',value:moment.utc(trandate).toDate()})
							jo3_id = jour_3.save();
							log.debug("第三步 success", jo3_id)
						} catch (error) {
							log.error("生成日记账 error", error)
							record.delete({ type: 'journalentry', id: jo_2 })

							return;
						}
					}

					log.debug("生成日记账 success", ins)
					for (var index = 0; index < settlement_ids.length; index++) {
						record.submitFields({
							type: "customrecord_aio_amazon_settlement",
							id: settlement_ids[index],
							values: {
								custrecord_settle_is_generate_voucher: true
							}
						})

					}

					if (jo3_id) {
						record.submitFields({
							type: "journalentry",
							id: jo1_id,
							values: {
								custbody_estimate_s: jo1_id,
								custbody_blot_s: jo_2,
								custbody_coll_s: jo3_id,
							}
						})
						record.submitFields({
							type: "journalentry",
							id: jo_2,
							values: {
								custbody_estimate_s: jo1_id,
								custbody_blot_s: jo_2,
								custbody_coll_s: jo3_id,
							}
						})
						record.submitFields({
							type: "journalentry",
							id: jo3_id,
							values: {
								custbody_estimate_s: jo1_id,
								custbody_blot_s: jo_2,
								custbody_coll_s: jo3_id,
							}
						})
					} else {
						record.submitFields({
							type: "journalentry",
							id: jo1_id,
							values: {
								custbody_estimate_s: jo1_id,
								custbody_blot_s: jo_2,
							}
						})
						record.submitFields({
							type: "journalentry",
							id: jo_2,
							values: {
								custbody_estimate_s: jo1_id,
								custbody_blot_s: jo_2,
							}
						})
					}

					//搜索该订单未接发票
					var status = ["CustInvc:A"]
					search.create({
						type: 'invoice',
						filters: [{
							name: 'mainline',
							operator: 'is',
							values: true
						},
						{
							name: 'status',
							operator: 'anyof',
							values: status
						},
						{
							name: "poastext",
							operator: "is",
							values: orderid
						}
						],
						columns: [{
							name: "internalid",
							// sort: 'DESC'
							sort: 'ASC'
						}]
					}).run().each(function (e) {
						invoic_tr(e.id, depositdate)
						return true
					})

					// context.write({
					//   key:"1",value:{"invoicesId":ins,"depositdate":depositdate,"jo1":jo1_id,"jo2":jo_2,"jo3":jo3_id}
					// })
				}
			} catch (e) {
				log.error("eerroor:", e);
				err.push(e.message);
			}

			//创建missorder
			if (err.length > 0) {

				var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
				var date = format.parse({
					value: (moment(new Date().getTime()).format(dateFormat)),
					type: format.Type.DATE
				});;

				var moId = createSOTRMissingOrder('journalvoucher', so_id, JSON.stringify(err), date);
				log.debug("出现错误，已创建missingorder" + moId);
			}
			else {
				var sub_mo_id = createSOTRMissingOrder(type, orderid, reason, date, true)
				log.debug('已处理完成转换出错的单据', sub_mo_id);
			}
		}

		function reduce(context) {
			// try{

			//   var v = context.values
			//   v.map(function(Inid){
			//     Inid= JSON.parse(Inid)
			//     log.debug("Inid:"+typeof(Inid),JSON.stringify(Inid))
			//     var acc,account,approv;
			//     search.create({
			//       type:'invoice',
			//       filters:[
			//         {name:'internalid',operator:'is',values:Inid.invoicesId},
			//         {name:"mainline",operator:'is',values:true}
			//       ],
			//       columns:[{name:'custbody_pr_store'},{name:"approvalstatus"}]
			//     }).run().each(function(e){
			//       acc = e.getValue(e.columns[0])
			//       approv = e.getValue(e.columns[1])
			//     })

			//     var jo1 = Inid.jo1
			//     var jo2 = Inid.jo2
			//     var jo3 = Inid.jo3
			//     if(approv == 1)
			//     record.submitFields({
			//       type: 'invoice',
			//       id:Inid.invoicesId,
			//       values: {
			//           approvalstatus: 2
			//       }})
			//     search.create({
			//         type:'customrecord_aio_account',
			//         filters:[{name:'internalid',operator:'is',values:acc}],
			//         columns:[{name:'custrecord_customer_payment_account'}]
			//     }).run().each(function(e){
			//         account = e.getValue(e.columns[0])
			//     })
			//     account=1275
			//     log.debug("account客户付款科目",account)
			//     var pmt = record.transform({
			//         fromType: record.Type.INVOICE,
			//         toType: record.Type.CUSTOMER_PAYMENT,
			//         fromId: Number(Inid.invoicesId)
			//     });
			//     pmt.setValue({ fieldId: 'trandate', value:moment.utc( Inid.depositdate).toDate() });
			//     pmt.setValue({ fieldId: 'account', value: account });
			//     var save_id =  pmt.save({
			//     ignoreMandatoryFields:true
			//     });
			//     record.submitFields({
			//       type:"journalentry",
			//       id:jo1,
			//       values: {
			//         custbody_payment: save_id,
			//       }
			//     })
			//     record.submitFields({
			//       type:"journalentry",
			//       id:jo2,
			//       values: {
			//         custbody_payment: save_id,
			//       }
			//     })
			//     record.submitFields({
			//       type:"journalentry",
			//       id:jo3,
			//       values: {
			//         custbody_payment: save_id,
			//       }
			//     })
			//     log.audit("客户付款成功:",save_id)
			//   })
			// }catch(e){
			//   log.error("eerroor:",e)
			// }
		}

		function summarize(summary) {

		}

		/**
		 * 生成单据失败记录, 或者标记已处理完成的记录
		 * @param {*} type 
		 * @param {*} account_id 
		 * @param {*} order_id 
		 * @param {*} so_id 
		 * @param {*} reason 
		 * @param {*} date 
		 * @param {*} Sign 
		 */
		function createSOTRMissingOrder(type, orderid, reason, date, Sign) {
			var mo, mo_id, mo_rec_id
			search.create({
				type: 'customrecord_dps_transform_mo',
				filters: [
					{ name: 'custrecord_tr_missing_order_type', operator: 'is', values: type },
					{ name: 'custrecord_tr_missing_order_id', operator: 'is', values: orderid }
				]
			}).run().each(function (rec) {
				mo_rec_id = rec.id
				mo = record.load({
					type: 'customrecord_dps_transform_mo',
					id: rec.id
				});
				return false;
			});

			// 若记录存在, 且 Sign 为 true, 对记录进行标记
			if (Sign && mo) {
				mo_id = record.submitFields({
					type: "customrecord_dps_transform_mo",
					id: mo_rec_id,
					values: {
						custrecord_tr_missing_order_resolving: Sign,
						custrecord_tr_missing_order_resolved: Sign,
						custrecord_tr_missing_order_date: date
					}
				})

			}
			else {
				// 若不存在, 则直接创建新的记录
				if (!mo) {
					mo = record.create({ type: 'customrecord_dps_transform_mo', isDynamic: true, });
				}

				mo.setValue({ fieldId: 'custrecord_tr_missing_order_type', value: type }); //类型

				mo.setValue({ fieldId: 'custrecord_tr_missing_order_id', value: orderid });
				mo.setValue({ fieldId: 'custrecord_tr_missing_order_reason', value: reason });
				mo.setValue({ fieldId: 'custrecord_tr_missing_order_date', value: date });
				mo.setValue({ fieldId: 'custrecord_tr_missing_order_resolved', value: false });
				mo.setValue({ fieldId: 'custrecord_tr_missing_order_resolving', value: false });

				mo_id = mo.save()
			}
			return mo_id;
		};
		/**
		 * 
		 * @param {*} dateStr 01.01.2020 23:34:01 UTC 或者 2020-01-01 23:34:01 UTC
		 * 返回2020-01-01T23:34:01
		 */
		function getFormatedDate(dateStr) {
			var dateTime;
			var time = dateStr.split(" ")[1];
			var date = dateStr.split(" ")[0];
			if (dateStr.indexOf('.') != -1) {
				var yyyy = date.split(".")[2];
				var mm = date.split(".")[1];
				var dd = date.split(".")[0];
				dateTime = yyyy + "-" + mm + "-" + dd + "T" + time
			} else {
				dateTime = date + "T" + time
			}
			return dateTime
		}

		function invoic_tr(cache_id, depositdate) {
			var inv = record.load({
				type: record.Type.INVOICE,
				id: cache_id
			});
			var orderid = inv.getValue("otherrefnum"), settleid, record_id
			log.audit('INVOICE', {
				orderid: orderid,
				inv: inv.getValue('tranid'),
				location: inv.getValue('location'),
				approvalstatus: inv.getValue('approvalstatus')
			});

			var coount_id = inv.getValue('custbody_pr_store')
			if (inv.getValue('approvalstatus') == 1)
				record.submitFields({
					type: 'invoice',
					id: cache_id,
					values: {
						approvalstatus: 2
					}
				})

			// search.create({
			//     type:"customrecord_aio_amazon_settlement",
			//     filters:[
			//         {name:"custrecord_aio_sett_order_id",operator:'is',values:orderid},
			//         {name:"custrecord_settle_checked_2",operator:'is',values:true},

			//         // 付款
			//         {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:"Order"},

			//         // 退款
			//         // {name:"custrecord_aio_sett_tran_type",operator:'startswith',values:"Refund"},

			//         // {name:"custrecord_aio_sett_amount_type",operator:'isnot',values:"ItemPrice"},
			//         // {name:"custrecord_aio_sett_amount_desc",operator:'isnot',values:"Principal"},
			//        // {name:"custrecord_settlement_start",operator:'isnotempty'},
			//     ],
			//     columns:[
			//         {name:'custrecord_aio_sett_tran_type'},
			//         {name:'custrecord_aio_sett_amount_type'},
			//         {name:'custrecord_aio_sett_amount_desc'},
			//         {name:'custrecord_aio_sett_amount'},
			//         {name:'custrecord_aio_sett_id'},
			//         {name:'custrecord_aio_sett_order_id'},
			//         {name:'custrecord_aio_sett_deposit_date'},
			//     ]
			//  }).run().each(function (rec) {
			//     record_id = rec.id;
			//      settleid = rec.getValue('custrecord_aio_sett_id')
			//      depositdate = rec.getValue('custrecord_aio_sett_deposit_date')
			//  })

			var save_id

			{
				var acc = inv.getValue('custbody_pr_store'),
					account;
				search.create({
					type: 'customrecord_aio_account',
					filters: [{
						name: 'internalid',
						operator: 'is',
						values: acc
					}],
					columns: [{
						name: 'custrecord_customer_payment_account'
					}]
				}).run().each(function (e) {
					account = e.getValue(e.columns[0])
				})

				// account = 1275
				log.debug("account客户付款科目", account)
				var pmt = record.transform({
					fromType: record.Type.INVOICE,
					toType: record.Type.CUSTOMER_PAYMENT,
					fromId: Number(cache_id)
				});
				log.debug("depositdate", depositdate)

				pmt.setValue({
					fieldId: 'trandate',
					value: moment.utc(getFormatedDate(depositdate)).toDate()
				});
				pmt.setValue({
					fieldId: 'account',
					value: account
				});
				//  pmt.setValue({
				//      fieldId: 'custbody_amazon_settlementid',
				//      value: settleid
				//  });
				save_id = pmt.save({
					ignoreMandatoryFields: true
				});
				log.audit("客户付款成功:", save_id)
				search.create({
					type: "journalentry",
					filters: [{
						name: 'mainline',
						operator: 'is',
						values: true
					},
					{
						name: 'custbody_jour_orderid',
						operator: 'is',
						values: orderid
					},
					{
						name: 'custbody_curr_voucher',
						operator: 'is',
						values: "预估凭证"
					},
					]
				}).run().each(function (e) {
					record.submitFields({
						type: "journalentry",
						id: e.id,
						values: {
							custbody_payment: save_id,
						}
					})
				})
				search.create({
					type: "journalentry",
					filters: [{
						name: 'mainline',
						operator: 'is',
						values: true
					},
					{
						name: 'custbody_jour_orderid',
						operator: 'is',
						values: orderid
					},
					{
						name: 'custbody_curr_voucher',
						operator: 'is',
						values: "冲减凭证"
					},
					]
				}).run().each(function (e) {
					record.submitFields({
						type: "journalentry",
						id: e.id,
						values: {
							custbody_payment: save_id,
						}
					})
				})
				search.create({
					type: "journalentry",
					filters: [{
						name: 'mainline',
						operator: 'is',
						values: true
					},
					{
						name: 'custbody_jour_orderid',
						operator: 'is',
						values: orderid
					},
					{
						name: 'custbody_curr_voucher',
						operator: 'is',
						values: "收款凭证"
					},
					]
				}).run().each(function (e) {
					record.submitFields({
						type: "journalentry",
						id: e.id,
						values: {
							custbody_payment: save_id,
						}
					})
				})

			}

			return save_id
		}

		return {
			getInputData: getInputData,
			map: map,
			reduce: reduce,
			summarize: summarize
		}
	});