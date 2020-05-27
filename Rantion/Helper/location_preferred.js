define(['N/search'], function(search) {

    /**
     * 根据店铺及发货仓库优选表，匹配符合需求的仓库
     * @param {*} accountId 店铺ID
     */
    function locationPreferred(accountId) {
        var ship_location = [];
        var ship_loca_id;
        search.create({
            type: 'customrecord_location_preferred',
            filters: [{ name: 'custrecord_lp_account', operator: 'anyof', values: accountId }],
            columns: [
                { name: 'custrecord_lpd_ship_locaton', join: 'custrecord_lpd_location_preferred_link' },
                { name: 'custrecord_lpd_priority', join: 'custrecord_lpd_location_preferred_link', sort: 'ASC' }
            ]
        }).run().each(function (result) {
            ship_location.push(result.getValue({ name: 'custrecord_lpd_ship_locaton', join: 'custrecord_lpd_location_preferred_link' }));
            return true;
        });
        for (var index = 0; index < ship_location.length; index++) {
            var sukks = [];
            search.create({
                type: 'item',
                filters: [
                    { name: 'internalid', operator: 'anyof', values: SKUs },
                    { name: 'inventorylocation', operator: 'anyof', values: ship_location[index] },
                    { name: 'locationquantityavailable', operator: 'greaterthan', values: ['0']}
                ]
            }).run().each(function (result) {
                sukks.push(true);
                return true;
            });
            if (sukks.length = ship_location.length) {
                ship_loca_id = ship_location[index];
                break;
            }
        }
        return ship_loca_id;
    }

    return {
        locationPreferred: locationPreferred
    }
});
