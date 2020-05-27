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
 */
define(["require", "exports", "./Helper/core.min", "N/log", "N/search", "N/record"], function (require, exports, core, log, search, record) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getInputData = function () {
        var orders = [], limit = 500;
        search.create({
            type: 'customrecord_aio_amazon_customer_return',
            filters: [
              { name: 'custrecord_aio_b2c_return_authorization', operator: 'is', values: false } 
            ],
            columns: [
            	{ name: 'custrecord_aio_b2_creturn_sku' },
            	{ name: 'custrecord_aio_b2c_return_order_id' }
            ]
        }).run().each(function (rec) {
        	 orders.push({
        		 id:rec.id,
        		 sku: rec.getValue('custrecord_aio_b2_creturn_sku'),
        		 order_id: rec.getValue('custrecord_aio_b2c_return_order_id')
        	 });
             return --limit > 0;
        });
        log.audit('��ȡ��������', orders.length);
        log.audit('��ȡ����', orders);
        return orders;
    };
    exports.map = function (ctx) {
        var obj = JSON.parse(ctx.value);
        log.audit('obj',obj)
    	var oid = obj.order_id, rtn_id = obj.id, sku = obj.sku;
    	
    	var so_id;
    	search.create({
            type: 'salesorder',
            filters: [
              { name: 'poastext', operator: 'is', values: oid },
              { name: 'mainline', operator: 'is', values: true } 
            ],
            columns: [
            	{ name: 'otherrefnum' }
            ]
        }).run().each(function (rec) {
        	 so_id = rec.id;
        	 return false;
        });
    	if(so_id){
    		var so = record.load({ type: record.Type.SALES_ORDER, id: so_id });
            log.audit('returnauthorization', {
                so: so.getValue('tranid'),
                location: so.getValue('location'),
                so_id: so_id
            });
            var r;
            try{
            	r = record.transform({
                    fromType: record.Type.SALES_ORDER,
                    toType: record.Type.RETURN_AUTHORIZATION,
                    fromId: Number(so_id)
                });
            }catch(err){
            	log.audit('returnauthorization transform err', err);
            }
            log.audit('returnauthorization r', r);
            var lc = r.getLineCount({ sublistId: 'item' });
            for (var ln = 0; ln < lc; ln++) {
                var line = so.findSublistLineWithValue({ sublistId: 'item', fieldId: 'item', value: r.getSublistValue({ sublistId: 'item', fieldId: 'item', line: ln }) });
                r.setSublistValue({ sublistId: 'item', fieldId: 'quantity', value: so.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: line }), line: ln });
            }
            try{
                var r_id = r.save();
                log.debug('���۶���ת�˻���Ȩ�ɹ�',r_id)
            	var cr = record.load({ type: 'customrecord_aio_amazon_customer_return', id: rtn_id });
            	cr.setValue('custrecord_aio_b2c_return_authorization',true);
                var cr_id = cr.save();
                log.debug('����˻�����ɹ�',cr_id)
            }catch(err){
            	log.audit('returnauthorization err', err);
            }
        }
        else{
            log.audit('��Ӧ�Ķ������Ҳ������۶���',oid)
        }

    };
    exports.summarize = core.utils.summarize;
});
