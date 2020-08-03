var shopifyApi = {
    init: function (https, search) {
        this.https = https
        this.search = search
    },
    //获取店铺信息
    getAccountList: function () {
        var list = [];
        this.search.create({
            type: 'customrecord_aio_account',
            filters: [
                { name: 'custrecord_aio_marketplace', operator: 'anyof', values: 27 /* shopify */ },
                { name: 'isinactive', operator: 'is', values: false }
            ],
            columns: [
                /** @Index 0 * */
                { name: 'custrecord_aio_client_key', join: 'custrecord_shopify_account_dev'},
                { name: 'custrecord_aio_client_secret', join: 'custrecord_shopify_account_dev'},
                { name: 'custrecord_aio_shopurl', join: 'custrecord_shopify_account_dev'},
                { name: 'custrecord_aio_marketplace' },
                { name: 'custrecord_aio_customer' },
                { name: 'salesrep', join: 'custrecord_aio_customer'},
                { name: 'custentity_dps_department', join: 'custrecord_aio_customer'},
                { name: 'custrecord_aio_subsidiary'}
            ]
        }).run().each(function (rec) {
            list.push({
                id: rec.id,
                auth_meta: {
                    client_key: rec.getValue(rec.columns[0]),
                    client_secret: rec.getValue(rec.columns[1]),
                    shopUrl: rec.getValue(rec.columns[2]),
                    marketplace: rec.getValue(rec.columns[3]),
                    customer: rec.getValue(rec.columns[4]),
                    salesrep_id: rec.getValue(rec.columns[5]),
                    department_id: rec.getValue(rec.columns[6]),
                    subsidiary_id: rec.getValue(rec.columns[7]),
                },
            });
            return true;
        });
        return list;
    },
    //获取订单信息
    connectHttpGetResponse: function (account, start_date, end_date, page_info, orders) {
        var client_key = account.auth_meta.client_key,
            client_secret = account.auth_meta.client_secret,
            shopUrl = account.auth_meta.shopUrl,
            api_version = '2019-07';
        var status = 'any';//拉取的订单状态
        var url = 'https://' + client_key + ':' + client_secret + '@' + shopUrl + '/admin/api/' + api_version + '/orders.json';
        
        if(!page_info){
            var params = {
                "status": status,
                "updated_at_min": start_date,
                "updated_at_max": end_date
            }
        }else{
            var params = {
                "page_info": page_info
            } 
        }
        var httpsUrls = sendUrl(url, params);
        var orderResult = this.https.get({
            url: httpsUrls
        });
        if(orders){
            var orders_arr = JSON.parse(orderResult.body).orders;
            if(orders_arr.length > 0){
                for(var i = 0; i < orders_arr.length; i++){
                    orders.push(orders_arr[i]); 
                }
            }
        }else{
            orders = JSON.parse(orderResult.body).orders;
        }
        if(orderResult.headers.Link){
            var start = orderResult.headers.Link.lastIndexOf('rel=\"');
            var end = orderResult.headers.Link.lastIndexOf('\"');
            var rel = orderResult.headers.Link.substring(start+5,end);
            if(orderResult.headers.Link && rel == 'next'){
                var start = orderResult.headers.Link.lastIndexOf('info=');
                var end = orderResult.headers.Link.lastIndexOf('>');
                this.connectHttpGetResponse(account, start_date, end_date, orderResult.headers.Link.substring(start+5,end),orders);
            }
        }
        
        return orders;
    }
}

//拼接参数
function sendUrl(url, params) {
    var str = '';
    for (var i in params) {
        if (params[i]) {
            str += i + '=' + params[i] + '&'
        }
    }
    var result = url + '?' + str;
    return result;
}