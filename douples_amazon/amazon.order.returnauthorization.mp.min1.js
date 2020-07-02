/*!
 * Douples NetSuite Bunlde
 * Copyright (C) 2019  Shenzhen Douples TechnoIogy Co.,Ltd.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * @desc �Զ���������ѷ�˻���Ȩ������
 * @search DPS | WF | Pending Fulfillment Orders 135
 * @name DPS | MP | Amazon Order Fulfill
 * @id _aio_mp_fulfill
 * ��������ѷ�˻����жϣ��˻����������и��ֶ���  DETAILED-DISPOSITION    
 * ���ֶ���  SELLABLE��ʱ��˵���˻���Ʒ���ۣ�����FBA�֣�������벻��Ʒ�֡�
 */
define(["./Helper/interfunction.min","N/runtime","N/format","./Helper/Moment.min","require", "exports", "./Helper/core.min", "N/log", "N/search", "N/record", "./Helper/fields.min"],
 function (interfun,runtime,format,moment,require, exports, core, log, search, record,fiedls) {
    Object.defineProperty(exports, "__esModule", { value: true });
  
    
    exports.getInputData = function () {
        var returns = [], payments = [], limit = 100, limit_payments = 0;
        var count = 0;
        var idCount = 0;
        search.create({
            type: 'customrecord_aio_amazon_customer_return',
            filters: [
            //   { name: 'internalidnumber', operator: 'greaterthanorequalto', values:12000 },
            //   { name: 'internalidnumber', operator: 'lessthanorequalto', values:15999 },
            //   { name: 'internalidnumber', operator: 'equalto', values:12535 },
              { name: 'custrecord_aio_b2c_return_aio_account', operator: 'anyof', values: "1" },
              { name: 'custrecord_aio_b2c_return_return_date', operator: 'onorafter', values: "1/5/2020" },
              { name: 'custrecord_aio_b2c_return_authorization', operator: 'is', values: "F" },
              { name: 'custrecord_aio_b2c_return_aio_account', operator: 'noneof', values: "@NONE@" },
            //   { name: 'custrecord_aio_b2c_return_order_id', operator: 'is', values: "402-1770403-8701963" }
            ],
            columns: [
            	// { name: 'custrecord_aio_b2c_return_order_id',sort:"DESC" },
            	{ name: 'custrecord_aio_b2c_return_aio_account' },  
            	{ name: 'custrecord_aio_b2_creturn_sku' },
            	{ name: 'custrecord_aio_b2c_return_return_date' },
            	{ name: 'custrecord_aio_b2c_return_status' },
            	{ name: 'custrecord_amazon_returndate_text' },
            	{ name: 'custrecord_aio_b2c_return_quantity' },
            	{ name: 'custrecord_aio_b2c_return_lcn' },
                { name: 'custrecord_aio_b2c_return_order_id' },
                { name: 'internalid' },
                { name: "custrecord_aio_seller_id",join:'custrecord_aio_b2c_return_aio_account' },
                { name: "custrecord_aio_b2c_return_detailed_disp" },
            ]
        }).run().each(function (rec) {
            returns.push({                                                                                                      
                recid: rec.id,
                status:rec.getValue('custrecord_aio_b2c_return_status'),
                acc:rec.getValue('custrecord_aio_b2c_return_aio_account'),
                order_id: rec.getValue('custrecord_aio_b2c_return_order_id'),
                creturn_sku: rec.getValue('custrecord_aio_b2_creturn_sku'),
                creturn_qty: rec.getValue('custrecord_aio_b2c_return_quantity'),
                creturn_lcn: rec.getValue('custrecord_aio_b2c_return_lcn'),
                return_date: rec.getValue('custrecord_amazon_returndate_text'),
                seller_id: rec.getValue(rec.columns[9]),
                detial_desc: rec.getValue("custrecord_aio_b2c_return_detailed_disp")  //�������ֶ��ж��Ƿ����
            });
            return --limit;
         })
        log.audit('\u83b7\u53d6\u0072\u0065\u0074\u0075\u0072\u006e\u0073\u8ba2\u5355\u603b\u6570', returns.length);
        
        return returns;

        
    };
    exports.map = function (ctx) {
        var scriptObj = runtime.getCurrentScript();
        var stDt = new Date().getTime()       
            var obj =  JSON.parse( ctx.value)
                var oid = obj.order_id,
                p_store = obj.acc,
                status = obj.status,
                rtn_id = obj.recid,
                re_sku= obj.creturn_sku,
                re_qty = obj.creturn_qty,
                re_lcn = obj.creturn_lcn,
                detial_desc = obj.detial_desc,
                return_date_txt=obj.return_date;
                log.debug("rtn_id:",rtn_id)
                log.debug("�����ţ�"+oid)
                var transactionType = "returns",err=[]
                var return_author
                var location,  fba_location ,fba_return_location,fulfill_id ;
                try{
                  var  acc_search=interfun.getSearchAccount(obj.seller_id)
                    //ȥ�أ�����Ƿ�����ͬ���˻���,����״̬
                  var skuid = interfun.getskuId(re_sku,p_store)
                  return_date = interfun.getFormatedDate("", "", return_date_txt).date
                    var res =DeduplicationRa(rtn_id)
                    log.debug("skuid:"+skuid,res)
                    if(!res){
                        var so_id = 0, ordstatus;
                     
                        search.create({
                            type:  record.Type.SALES_ORDER,
                            filters: [
                                { name: 'poastext', operator: 'is', values: oid },
                                // { name: "status", operator: "noneof",values: ["SalesOrd:C", "SalesOrd:H"]},
                                { name: 'custbody_aio_account', operator:"anyof", values:acc_search },
                                { name: 'mainline', operator: 'is', values: true } 
                            ],columns:[
                                {name:"custbody_aio_account"},
                                {name:"status"},
                              ]
                        }).run().each(function (rec) {
                            log.audit("rec:",rec)
                            so_id = rec.id;
                            p_store = rec.getValue("custbody_aio_account")
                            ordstatus = rec.getValue("status")
                        });
                        //����ҵõ����۶���
                        if(so_id) 
                        search.create({
                            type:"itemfulfillment",
                            filters:[
                              ["mainline","is",false],"and",
                              ["item","anyof",skuid],"and",
                              ["createdfrom","anyof",so_id]
                            ],
                            columns:["serialnumbers"]
                        }).run().each(function(e){
                            fulfill_id = e.getValue(e.columns[0])
                        })
                        if(fulfill_id){
                            log.debug("�ҵ���Ӧ�����۶���"+so_id,"ordstatus: "+ordstatus)
                            var so = record.load({ type: record.Type.SALES_ORDER, id: so_id });
                            log.audit('returnauthorization', {
                                so: so.getValue('tranid'),
                                id: rtn_id,
                                location: so.getValue('location'),
                                so_id: so_id
                            });
                            var r;
                            r = record.transform({ 
                                fromType: record.Type.SALES_ORDER,
                                toType: record.Type.RETURN_AUTHORIZATION,
                                fromId: Number(so_id)
                            });

                            var fils = [
                                [ "internalidnumber","equalto", so.getValue("custbody_aio_account")]
                            ]
                            search.create({
                                type:"customrecord_aio_account",
                                filters:fils,
                                columns:["custrecord_aio_fba_return_loaction","custrecord_aio_fbaorder_location"]
                            }).run().each(function(e){
                                fba_return_location = 3043  //FBA����Ʒ��
                                fba_location = e.getValue(e.columns[1])
                            })

                            if(detial_desc == "SELLABLE")    
                            location = fba_location
                            else 
                            location = fba_return_location
                          
                            log.audit('return_date'+return_date_txt,location)
                            r.setText({fieldId:"trandate",text:return_date})
                            r.setValue({fieldId:'orderstatus',value:'B'})//��׼
                            r.setValue({fieldId:'location',value:location})//
                            r.setValue({fieldId:'custbody_order_locaiton',value:p_store})//
                            r.setValue({fieldId:"custbody_origin_customer_return_order",value:rtn_id}) //�������˻�����
                            r.setValue({fieldId:"custbody_amazon_ra_date_text",value:return_date_txt})  //�˻�ʱ��
                            r.setValue({fieldId:"custbody_ra_license_plate_number",value:re_lcn}) //�˻����
                            r.setValue({fieldId:"custbody_aio_marketplaceid",value:1})   //������ѷ
                            var lc = r.getLineCount({ sublistId: 'item' });
                            var  arry = []
                            var n;
                            for (var ln = 0; ln < lc; ln++) {
                                var itemid =  r.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln });
                                var itemtype = r.getSublistValue({ sublistId:'item', fieldId:'itemtype',line:ln})
                                log.debug("itemtype"+itemtype,"itemid��"+itemid)
                                if(itemtype =='OthCharge'|| !itemid) continue
                                    log.audit('sku��'+re_sku,"re_qty��"+re_qty)

                                    if(n ) {//nΪtrue�������Ѿ��˻��������оͲ����˻���һ���˻�����һ��ֻ��һ����
                                        if (ln ==  n && itemtype == "OthCharge")
                                        continue
                                        else{
                                            arry.push(ln)
                                            continue
                                        }
                                    }else if(skuid == itemid){
                                        n=ln+1
                                        
                                        r.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: re_qty, line: ln });
                                        r.setSublistValue({ sublistId: 'item', fieldId: 'location', value: location, line: ln });
                                       continue
                                    }
                                    if(!n){
                                        arry.push(ln)
                                        var ditemtype = r.getSublistValue({ sublistId:'item', fieldId:'itemtype',line:ln+1})
                                        if(ditemtype == "OthCharge")
                                        arry.push(ln+1)
                                    }
                                    
                            } 
                            var del =0
                            log.debug("������ȡ���˻� arrys :",JSON.stringify(arry))
                            arry.map(function(lin){
                                r.removeLine({
                                    sublistId: 'item',
                                    line: lin-del,
                                    ignoreRecalc: true
                                    });
                                    del++
                            })   
                             return_author = r.save();
                            log.debug("�˻��������ɹ�",return_author)
                        }else{
                          //�Ҳ������۶����� create 
                          log.debug("�Ҳ������۶��� �ķ��� "+oid)
                         var cre_rs = createAuthoration(rtn_id,re_lcn,p_store,skuid,return_date,return_date_txt,oid,re_qty,status)
                         return_author = cre_rs.Art_id
                         fba_location = cre_rs.fba_location
                        if(!return_author)
                            return;
                        }
                        //�����ɹ�֮����ջ�Ʒ��Ȼ��close
                            var return_receipt = record.transform({
                                fromType: record.Type.RETURN_AUTHORIZATION,
                                toType: 'itemreceipt',
                                fromId: Number(return_author)
                            });
                            return_receipt.setText({fieldId:"trandate",text:return_date})
                            var lc = return_receipt.getLineCount({ sublistId: 'item' });
                            for (var ln = 0; ln < lc; ln++) {
                                var itemid = return_receipt.getSublistValue({sublistId:'item',fieldId:'item',line:ln})
                                var itemtype = return_receipt.getSublistValue({sublistId:'item',fieldId:'itemtype',line:ln})
                                log.debug(itemtype)
                                if(itemtype =='OthCharge'|| !itemid) continue   //�������ͻ�Ʒ���ý���
                                var  qty = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'quantity',  line: ln });
                                log.debug(itemtype ,"qty "+qty)
                            }
                            var receipt_save = return_receipt.save();
                            log.debug(receipt_save,typeof(receipt_save)+"=====\u6536\u8d27\u6210\u529f","\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355")
                            //\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355

                        //�ر��˻���Ȩ��
                        var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: return_author });
                        var LineCount = return_author_load.getLineCount({ sublistId:'item' });
                        for(var i=0; i<LineCount; i++){
                            return_author_load.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            });
                        }
                        var return_author_load_id = return_author_load.save();
                        log.debug("�ر��˻���Ȩ��",return_author_load_id);
                        record.submitFields({
                            type:"customrecord_aio_amazon_customer_return",
                            id:rtn_id,
                            values: {
                                custrecord_aio_b2c_return_authorization: "T"
                            }
                        })
                        log.debug("OK")
                    }else if( res.status =="pendingReceipt"){
                        log.debug("������ظ���res.status:"+res.status);
                        //�����ɹ�֮����ܻ�Ʒ��Ȼ��close
                        var return_receipt = record.transform({
                            fromType: record.Type.RETURN_AUTHORIZATION,
                            toType: 'itemreceipt',
                            fromId: Number(res.art_id)
                        });
                       log.debug("���̣�"+ res.pr_store) 
                        var fils = [
                            [ "internalidnumber","equalto", res.pr_store]
                        ]
                        search.create({
                            type:"customrecord_aio_account",
                            filters:fils,
                            columns:["custrecord_aio_fbaorder_location"]
                        }).run().each(function(e){
                            fba_location = e.getValue(e.columns[0])
                        })
                        return_receipt.setText({fieldId:"trandate",text:return_date})
                        var lc = return_receipt.getLineCount({ sublistId: 'item' });
                        for (var ln = 0; ln < lc; ln++) {
                            var itemid = return_receipt.getSublistValue({sublistId:'item',fieldId:'item',line:ln})
                            var itemtype = return_receipt.getSublistValue({sublistId:'item',fieldId:'itemtype',line:ln})
                            return_receipt.setSublistValue({ sublistId: 'item', fieldId: 'location',value:res.location, line: ln });
                            log.debug(itemtype)
                            if(itemtype =='OthCharge'|| !itemid) continue   //�������ͻ�Ʒ���ý���
                            var  qty = return_receipt.getSublistValue({ sublistId: 'item', fieldId: 'quantity',  line: ln });
                            log.debug(itemtype ,"qty "+qty)
                        }
                        var receipt_save = return_receipt.save();
                        log.debug(receipt_save,typeof(receipt_save)+"=====\u6536\u8d27\u6210\u529f","\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355")
                        //\u751f\u6210\u8d37\u9879\u901a\u77e5\u5355
                    //�ر��˻���Ȩ��
                    var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: Number(res.art_id) });
                    var LineCount = return_author_load.getLineCount({ sublistId:'item' });
                    for(var i=0; i<LineCount; i++){
                        return_author_load.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'isclosed',
                            line: i,
                            value: true
                        });
                    }
                    var return_author_load_id = return_author_load.save();
                    log.debug("�ر��˻���Ȩ��",return_author_load_id);
                    record.submitFields({
                        type:"customrecord_aio_amazon_customer_return",
                        id:rtn_id,
                        values: {
                            custrecord_aio_b2c_return_authorization: "T"
                        }
                    })
                    log.debug("OK")
                    }else if( res.status=="pendingRefund") {
                        var return_author_load = record.load({ type: record.Type.RETURN_AUTHORIZATION, id: Number(res.art_id) });
                        var LineCount = return_author_load.getLineCount({ sublistId:'item' });
                        for(var i=0; i<LineCount; i++){
                            return_author_load.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'isclosed',
                                line: i,
                                value: true
                            });
                        }
                        var return_author_load_id = return_author_load.save();
                        log.debug("�ر��˻���Ȩ��",return_author_load_id);
                        record.submitFields({
                            type:"customrecord_aio_amazon_customer_return",
                            id:rtn_id,
                            values: {
                                custrecord_aio_b2c_return_authorization: "T"
                            }
                        })
                    }else if( res.status=="closed"){
                          //�����˻������Ѿ����ɹ��˻����ˣ����ΪT
                        record.submitFields({
                            type:"customrecord_aio_amazon_customer_return",
                            id:rtn_id,
                            values: {
                                custrecord_aio_b2c_return_authorization: "T"
                            }
                        })
                    }
                }catch(e){
                    log.error("error!",e)
                    err.push(e)
                }
                if (err.length > 0) {
                    var dateFormat = runtime.getCurrentUser().getPreference('DATEFORMAT');
                    var date = format.parse({
                        value: (moment(new Date().getTime()).format(dateFormat)),
                        type: format.Type.DATE
                    });;
                    var moId = createSOTRMissingOrder(transactionType, oid, JSON.stringify(err), date,acc);
                    log.error("���ִ����Ѵ���missingorder" + moId);
                }else{ 
                    //����missing orderΪ�ѽ��
                    makeresovle(transactionType, oid,acc)
                }
            // }
            log.debug("��ʱ��",new Date().getTime() - stDt)
        log.audit("����ʣ�����: ", scriptObj.getRemainingUsage());

    };
 
    /**
     * ����ʱ���ַ�������ʽ��ʱ��Ϊ����ʱ��ʱ��
     * @param {*} str 
     */
    function getFormatedDate(str) {
        var strs = str.substring(0,10)
        var ins = strs.split(".")[0].length
        var s_d 
        if(ins<4){
            s_d = strs.split(".")[2]+"/"+strs.split(".")[1]+"/"+strs.split(".")[0]+" "+str.substring(11,19)
        }
        else{
            s_d =str.substring(0,19)
        }
        s_d = format.format({
            value: moment.utc(s_d).toDate(),
            type: format.Type.DATE,
            timezone: format.Timezone.AMERICA_LOS_ANGELES  //ͳһתΪ����ʱ��
          });
        return s_d
      }

    /**
        * makeresovle missingorder
        * @param {*} type 
        * @param {*} orderid 
        * @param {*} acc 
        */
       function makeresovle(type, orderid, acc) {
        var fils = []
        type?fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}):""
        orderid?fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}):""
        acc?fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}):""
        search.create({
          type: 'customrecord_dps_transform_mo',
          filters:fils
        }).run().each(function (rec) {
          record.submitFields({
            type: 'customrecord_dps_transform_mo',
            id: rec.id,
            values: {
              custrecord_tr_missing_order_resolved: true
            },
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true
            }
          })
          log.debug("make Resovle " + rec.id, type + " : " + orderid)
          return true
        })
      }
        /**
          * ���ɵ���ʧ�ܼ�¼
          * @param {*} type 
          * @param {*} account_id 
          * @param {*} order_id 
          * @param {*} so_id 
          * @param {*} reason 
          * @param {*} date 
          */
         function createSOTRMissingOrder(type, orderid, reason, date, acc) {
            var mo;
            var fils = []
            type?fils.push({ name: 'custrecord_tr_missing_order_type', operator: 'is',values: type}):""
            orderid?fils.push({ name: 'custrecord_missing_orderid_txt', operator: 'is',values: orderid}):""
            acc?fils.push({ name: 'custrecord_tracking_missing_acoount', operator: 'is',values: acc}):""
            var mo;
            search.create({
              type: 'customrecord_dps_transform_mo',
              filters: fils
            }).run().each(function (rec) {
              mo = record.load({
                type: 'customrecord_dps_transform_mo',
                id: rec.id
              });
              return false;
            });
            if (!mo) {
              mo = record.create({
                type: 'customrecord_dps_transform_mo',
                isDynamic: true,
              });
            }
            type?
            mo.setValue({
              fieldId: 'custrecord_tr_missing_order_type',
              value: type
            }):""; //����
            acc?
            mo.setValue({
              fieldId: 'custrecord_tracking_missing_acoount',
              value: acc
            }):"";
            orderid?
            mo.setValue({
              fieldId: 'custrecord_missing_orderid_txt',
              value: orderid
            }):"";
            mo.setValue({
              fieldId: 'custrecord_tr_missing_order_reason',
              value: reason
            });
            mo.setValue({
              fieldId: 'custrecord_tr_missing_order_date',
              value: date
            });
            mo.setValue({
              fieldId: 'custrecord_tr_missing_order_resolved',
              value: false
            });
            mo.setValue({
              fieldId: 'custrecord_tr_missing_order_resolving',
              value: false
            });
            return mo.save();
          };
        /**
         * ȥ��
         * @param {*} rt 
         * @param {*} pl_num 
         * @param {*} orid 
         * @param {*} retsku 
         * @param {*} rtn_id 
         * @param {*} acc 
         */
        function DeduplicationRa(rtn_id){
            var  rs =false
            search.create({
                type: record.Type.RETURN_AUTHORIZATION,
                filters: [
                    {name: "custbody_origin_customer_return_order",operator: "anyof",values:rtn_id},
                ],columns:[
                    {name:"status"},
                    {name:"custbody_aio_account"},
                    {name:"location"},
                ]
            }).run().each(function (rec) {
                log.debug("�ҵ��ظ����� "+rec.id,"״̬"+rec.getValue("status"))
                rs = {
                 status:rec.getValue("status"),
                 art_id:rec.id,
                 pr_store:rec.getValue("custbody_aio_account"),
                 location:rec.getValue("location"),
                }
            });
            return rs
        }
       

        /**
         * �����˻���Ȩ����������Ҫ���ֶ�
         * @param {*} rtn_id 
         * @param {*} re_lcn 
         * @param {*} retacc 
         * @param {*} retsku 
         * @param {*} retdate 
         * @param {*} retdate_txt 
         * @param {*} order_id 
         * @param {*} retqty 
         */
        function createAuthoration(rtn_id,re_lcn,retacc,skuid,retdate,retdate_txt,order_id,retqty,status){
            var account =  getAcc(retacc),loc,cid,
            tax_item  = account.info.tax_item,
            fba_location  = account.extra_info.fbaorder_location,
            fba_return_location  = account.fba_return_loaction,
            salesorder_if_taxed = account.preference.salesorder_if_taxed,
            country = account.country;
            log.debug("tax_item:"+tax_item,"country:"+country)
            log.debug("salesorder_if_taxed: "+salesorder_if_taxed)
            var rt_amount = 0 
            var rt_tax = 0 
            log.debug("rt_amount:"+rt_amount,rt_tax)
            cid = account.customer;
            log.debug("cid:"+cid,"loc :"+loc)
            var rt = record.create({type:record.Type.RETURN_AUTHORIZATION,isDynamic:true})  
            rt.setValue({fieldId:'entity',value:cid})
            if(status == "Repackaged Successfully")    
            loc = fba_location
            else 
            loc = 3043

            rt.setValue({fieldId:'location',value:loc})//\u6279\u51c6
            rt.setValue({fieldId:'otherrefnum',value:order_id})
            rt.setText({fieldId:"trandate",text:retdate})
            rt.setValue({fieldId:'orderstatus',value:'B'})//��׼
            rt.setValue({fieldId:'custbody_aio_account',value:retacc})
            rt.setValue({fieldId:'custbody_order_locaiton',value:retacc})
            rt.setValue({fieldId:'custbody_aio_is_aio_order',value:true})
            rt.setValue({fieldId:'custbody_origin_customer_return_order',value:rtn_id})
            rt.setValue({fieldId:"custbody_amazon_ra_date_text",value:retdate_txt})
            rt.setValue({fieldId:"custbody_ra_license_plate_number",value:re_lcn})
            rt.setValue({fieldId:"custbody_aio_marketplaceid",value:1})
            log.debug("skuid:"+skuid,"orderid : "+order_id)
            rt.selectNewLine({sublistId: 'item' });
            rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'item', value: skuid});
            rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'location', value: loc});
            rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'quantity', value: retqty});
            rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'rate', value: rt_amount});
            rt.setCurrentSublistValue({sublistId: 'item',fieldId: 'amount', value: rt_amount * retqty});
           
            /** ���ö�����˰ */
            if (salesorder_if_taxed && tax_item && rt_tax) {
                rt.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: tax_item
                });
                // if (country !="US"&& country !="CA") {
                //     rt.setCurrentSublistValue({
                //         sublistId: 'item',
                //         fieldId: 'tax1amt',
                //         value: rt_tax ? rt_tax : 0
                //     });
                // }
            } else {
                rt.setCurrentSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    value: tax_item ? tax_item : 6
                });
            }
            try{
                rt.commitLine({sublistId: 'item'});
            }catch (err) { 
                log.error("commitLine error",err)
            }
           log.debug("���ӻ�Ʒ�ɹ�")
        var Art_id = rt.save({
            ignoreMandatoryFields: true
        });
        log.debug('���ɳɹ�', Art_id);
        return {
            Art_id:Art_id,
            fba_location:fba_location
            } 
        }
        
        
        function getAcc(acc){
            var t = fiedls.account, tsite = fiedls.amazon_global_sites, tdev = fiedls.amazon_dev_accounts;
            var accounts = {},fin=[];
            search.create({
                type: t._name,
                filters: [
                    { name: "internalidnumber", operator: "equalto", values: acc },
                    { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 1 /* amazon */ },
                    { name: 'custrecord_aio_seller_id', operator: 'isnotempty' },
                    /*{ name: 'custrecord_aio_mws_auth_token', operator: 'isnotempty' },*/
                    { name: 'custrecord_aio_dev_account', operator: 'noneof', values: '@NONE@' },
                    { name: 'isinactive', operator: 'is', values: false },
                 
                ], columns: [
                    /** * ���� * @index 0 */
                    { name: 'name' },
                    /** * �˻�API��Ϣ * @index 1 */
                    { name: t.seller_id },
                    { name: t.mws_auth_token },
                    { name: tsite.amazon_marketplace_id, join: t.enabled_sites },
                    { name: tsite.amazon_mws_endpoint, join: t.enabled_sites },
                    { name: tdev.aws_access_key_id, join: t.dev_account },
                    { name: tdev.secret_key_guid, join: t.dev_account },
                    /** * �˻�������Ϣ * @index 7 * */
                    { name: 'name' },
                    { name: t.currency },
                    { name: 'custrecord_aio_if_salesorder' },
                    { name: 'custrecord_aio_salesorder_type' },
                    { name: 'custrecord_aio_salesorder_form' },
                    { name: 'custrecord_aio_salesorder_location' },
                    { name: 'custrecord_aio_salesorder_start_date' },
                    /** * FBA��Ϣ * @index 14 */
                    { name: 'custrecord_aio_if_fbaorder' },
                    { name: 'custrecord_aio_fbaorder_type' },
                    { name: 'custrecord_aio_fbaorder_form' },
                    { name: 'custrecord_aio_fbaorder_location' },
                    { name: 'custrecord_aio_fbaorder_start_date' },
                    /**@index 19 */
                    { name: 'custrecord_aio_if_only_paid_orders' },
                    { name: 'custrecord_aio_salesorder_if_taxed' },
                    { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                    { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                    { name: 'custrecord_aio_if_zero_price' },
                    { name: 'custrecord_aio_if_check_customer_email' },
                    { name: 'custrecord_aio_if_check_customer_addr' },
                    { name: 'custrecord_aio_if_including_fees' },
                    { name: 'custrecord_aio_if_payment_as_tran_date' },
                    /** * ������Ϣ * @index 28 */
                    { name: 'custrecord_aio_dept' },
                    { name: 'custrecord_aio_salesorder_payment_method' },
                    { name: 'custrecord_aio_discount_item' },
                    { name: 'custrecord_aio_tax_item' },
                    { name: tsite.amazon_currency, join: t.enabled_sites },
                    /** * ��˾��Ϣ * @index 33 */
                    core.utils.checkIfSubsidiaryEnabled() ? { name: 'custrecord_aio_subsidiary' } : { name: 'formulanumeric', formula: '0' },
                    /** * ����ץȡ��Ϣ * @index 34 */
                    { name: 'custrecord_aio_if_handle_removal_report' },
                    { name: 'custrecord_aio_if_handle_custrtn_report' },
                    /** * Preferences * @index 36 */
                    { name: 'custrecord_aio_if_only_paid_orders' },
                    { name: 'custrecord_aio_salesorder_if_taxed' },
                    { name: 'custrecord_aio_salesorder_tax_rate_ipt' },
                    { name: 'custrecord_aio_salesorder_tax_auto_calc' },
                    { name: 'custrecord_aio_if_zero_price' },
                    { name: 'custrecord_aio_if_check_customer_email' },
                    { name: 'custrecord_aio_if_check_customer_addr' },
                    { name: 'custrecord_aio_if_payment_as_tran_date' },
                    /** * ����չ�ķ�������棬�������Ҫ��1�1�77 * @index 44 */
                    { name: 'custrecord_aio_if_handle_inv_report' },
                    { name: 'custrecord_aio_to_default_from_location' },
                    { name: 'custrecord_aio_shipping_item' },
                    { name: 'custrecord_aio_to_form' },
                    /** @index 48 */
                    { name: fiedls.account.if_post_order_fulfillment },
                    { name: fiedls.account.post_order_if_search },
                    { name: fiedls.account.if_handle_sett_report },
                    /** ��������ѷ����Կ�Ƿ������ @index 51 */
                    { name: 'custrecord_aio_amazon_marketplace', join:"custrecord_aio_enabled_sites" },
                    { name: 'custrecord_aio_customer'},
                    { name: 'custrecord_aio_fba_return_loaction'},
        
                ]
            }).run().each(function (rec) {
                accounts = {
                    id: rec.id,
                    country:rec.getValue(rec.columns[51]),
                    customer:rec.getValue(rec.columns[52]),
                    fba_return_loaction:rec.getValue(rec.columns[53]),
                    auth_meta: {
                        seller_id: rec.getValue(rec.columns[1]),
                        auth_token: rec.getValue(rec.columns[2]),
                        access_id: rec.getValue(rec.columns[5]),
                        sec_key: rec.getValue(rec.columns[6]),
                        end_point: rec.getValue(rec.columns[4]),
                    },
                    info: {
                        name: rec.getValue(rec.columns[7]),
                        currency: rec.getValue(rec.columns[8]),
                        if_salesorder: rec.getValue(rec.columns[9]),
                        salesorder_type: rec.getValue(rec.columns[10]),
                        salesorder_form: rec.getValue(rec.columns[11]),
                        salesorder_location: rec.getValue(rec.columns[12]),
                        salesorder_start_date: rec.getValue(rec.columns[13]),
                        dept: rec.getValue(rec.columns[28]),
                        salesorder_payment_method: rec.getValue(rec.columns[29]),
                        discount_item: rec.getValue(rec.columns[30]),
                        shipping_cost_item: rec.getValue(rec.columns[46]),
                        tax_item: rec.getValue(rec.columns[31]),
                        site_currency: rec.getValue(rec.columns[32]),
                        subsidiary: Number(rec.getValue(rec.columns[33])),
                        enable_tracking_upload: rec.getValue(rec.columns[48]),
                        enabled_tracking_upload_search: rec.getValue(rec.columns[49]),
                    },
                    extra_info: {
                        if_fbaorder: rec.getValue(rec.columns[14]),
                        fbaorder_type: rec.getValue(rec.columns[15]),
                        fbaorder_form: rec.getValue(rec.columns[16]),
                        fbaorder_location: rec.getValue(rec.columns[17]),
                        fbaorder_start_date: rec.getValue(rec.columns[18]),
                        if_including_fees: rec.getValue(rec.columns[26]),
                        if_handle_custrtn_report: rec.getValue(rec.columns[35]),
                        if_handle_removal_report: rec.getValue(rec.columns[34]),
                        if_handle_inventory_report: rec.getValue(rec.columns[44]),
                        if_handle_settlement_report: rec.getValue(rec.columns[50]),
                        to_default_from_location: rec.getValue(rec.columns[45]),
                        aio_to_default_form: rec.getValue(rec.columns[47]),
                    },
                    marketplace: rec.getValue(rec.columns[3]),
                    preference: {
                        if_only_paid_orders: rec.getValue(rec.columns[36]),
                        salesorder_if_taxed: rec.getValue(rec.columns[37]),
                        salesorder_tax_rate_ipt: rec.getValue(rec.columns[38]),
                        salesorder_tax_auto_calc: rec.getValue(rec.columns[39]),
                        if_zero_price: rec.getValue(rec.columns[40]),
                        if_check_customer_email: rec.getValue(rec.columns[41]),
                        if_check_customer_addr: rec.getValue(rec.columns[42]),
                        if_payment_as_tran_date: rec.getValue(rec.columns[43]),
                    }
                };
            })
              return accounts
        }
      /**
       * ����sku��Ӧ����Ʒ
       * @param {*} retsku 
       * @param {*} retacc 
       */   
    function Getskuid(retsku,retacc){
            try{
                var skuid;
                log.debug("amazon msku:",retsku.trim())
                search.create({
                    type: 'item',
                    filters: [{name: 'custitem_seller_sku',operator: search.Operator.IS,values: retsku.trim()}],
                    columns: [
                        { name: 'internalId'},
                    ]
                }).run().each(function (rec) {
                    log.debug("amazon msku:",rec.id)
                    skuid = Number(rec.id);
                });
                if(!skuid){
                    log.debug("��itemid msku:",retsku.trim())
                search.create({
                    type: 'item',
                    filters: [{name: 'itemid',operator: search.Operator.IS,values: retsku.trim()}],
                    columns: [
                        { name: 'internalId'},
                    ]
                }).run().each(function(rec){
                    skuid = Number(rec.id);
                });
              }
                if(!skuid){
                    log.debug("itemIdΪ�գ���ɵ�SKU", skuid);
                    search.create({
                        type: 'item',
                        filters: [{name: 'custitem_old_code',operator: search.Operator.IS,values: retsku.trim()}],
                        columns: [
                            { name: 'internalId'},
                        ]
                    }).run().each(function (rec) {
                        skuid = Number(rec.id);
                    });
                }
                if(!skuid){
                log.debug("itemIdΪ�գ����Ӧ��", skuid);
                search.create({
                   type: 'customrecord_sku_correspondence',
                   filters: [
                       {name: 'custrecord_sku_c_product_id',operator: search.Operator.IS,values:retsku.trim()},
                     ],
                   columns: [
                       { name: 'custrecord_sku_c_sku'},
                   ]
               }).run().each(function (rec) {
                skuid = Number(rec.getValue("custrecord_sku_c_sku"))
               });
               }
               if(!skuid){
                log.debug("�Ҳ���sku���Ѽ�¼���� "+retsku,retacc)
                   var sku_notes,counts=0
                   search.create({
                       type:'customrecord_no_sku_record',
                       filters:[
                          {name:'custrecord_not_on_sku',operator:'is',values:retsku.trim()},
                          {name:'custrecord_account',operator:'anyof',values:[retacc]}
                       ],columns:[
                           {name:'custrecord_total_orders'}
                       ]
                    }).run().each(function(e){
                        counts = e.getValue("custrecord_total_orders")
                        sku_notes = record.load({type:'customrecord_no_sku_record',id:e.id})
                    })
                    if(!sku_notes){
                        sku_notes = record.create({type:"customrecord_no_sku_record"})
                    }
                        sku_notes.setValue({fieldId:'custrecord_not_on_sku',value:retsku.trim()})
                        sku_notes.setValue({fieldId:'custrecord_orderno',value:"Amazon"})
                        sku_notes.setValue({fieldId:'custrecord_account',value:retacc})
                        sku_notes.setValue({fieldId:'custrecord_total_orders',value:Number(counts)+1})
                        sku_notes.save();
                      
               }
              }catch(er){
                log.error("search skuid error :::",er)
              }
              return skuid
        }
    exports.summarize = core.utils.summarize;
});