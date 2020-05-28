/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(["N/search", "N/http", "N/record"], function (search, http, record) {
  function _get(context) {}

  function _post(context) {
    var retjson = {};
    var nowPage = Number(context.page ? context.page : 1); // 查询页
    var pageSize = Number(context.pageSize ? context.pageSize : 100); // 每页数量
    var sku = context.sku;
    // var warehouseCode = context.warehouseCode;
    var locations = {};
    var locationids = [];
    var filters = [];
    filters.push({ name: "type", operator: "anyof", values: ["InvtPart"] });
    filters.push({
      name: "custrecord_wms_location_type",
      join: "inventorylocation",
      operator: "anyof",
      values: ["2", "3"],
    });
    if (sku) {
      filters.push({ name: "itemid", operator: "is", values: sku });
    }
    // if (warehouseCode) {
    //   filters.push({
    //     name: "custrecord_dps_wms_location",
    //     join: "inventorylocation",
    //     operator: "is",
    //     values: warehouseCode,
    //   });
    // }
    var mySearch = search.create({
      type: "inventoryitem",
      filters: filters,
      columns: [
        "itemid",
        "custitem_dps_ctype",
        "custitem_dps_skuchiense",
        "locationquantityonhand",
        "locationquantitycommitted",
        "locationquantityavailable",
        "custitem_dps_picture",
        { name: "custrecord_dps_wms_location", join: "inventorylocation" },
        { name: "custrecord_dps_wms_location_name", join: "inventorylocation" },
      ],
    });
    var pageData = mySearch.runPaged({
      pageSize: pageSize,
    });
    var totalCount = pageData.count; // 总数
    var pageCount = pageData.pageRanges.length; // 页数
    pageData
      .fetch({
        index: Number(nowPage - 1),
      })
      .data.forEach(function (result) {
        var itemid = result.getValue("itemid");
        var loc = result.getValue({
          name: "custrecord_dps_wms_location",
          join: "inventorylocation",
        });
        var key = itemid + "_" + loc;
        var numonhand = Number(result.getValue("locationquantityonhand"));
        var numcommitted = Number(result.getValue("locationquantitycommitted"));
        var numavailable = Number(result.getValue("locationquantityavailable"));
        var location = locations[key];
        if (location) {
          location.numonhand = location.numonhand + numonhand;
          location.numcommitted = location.numcommitted + numcommitted;
          location.numavailable = location.numavailable + numavailable;
        } else {
          var json = {};
          json.item = itemid;
          json.item_type = result.getValue("custitem_dps_ctype");
          json.item_name = result.getValue(
            "custitem_dcustitem_dps_skuchienseps_ctype"
          );
          json.item_picture = result.getValue("custitem_dps_picture");
          json.code = result.getValue({
            name: "custrecord_dps_wms_location",
            join: "inventorylocation",
          });
          json.name = result.getValue({
            name: "custrecord_dps_wms_location_name",
            join: "inventorylocation",
          });
          json.numonhand = numonhand;
          // json.numcommitted = numcommitted;
          // json.numavailable = numavailable;
          locations[key] = json;
          locationids.push(key);
        }
        return true;
      });
    var skus = [];
    for (var index = 0; index < locationids.length; index++) {
      var json = {};
      var j = locations[locationids[index]];
      json.warehouseName = j.name; // 仓库名称 TODO
      json.warehouseCode = j.code; // 仓库编码 TODO
      json.sku = j.item; // SKU
      json.productImageUrl = j.item_picture; // 图片
      json.productTitle = j.item_name; // 产品名称
      json.qty = j.numonhand; // 库内总库存
      json.useQty = ""; // 可用库存
      json.lendQty = ""; // 借调中库存
      json.lockQty = ""; // 预留库存
      json.transferQty = ""; // 中转库存
      json.inQty = ""; //调入中库存
      json.outQty = ""; // 调出中库存
      json.tradeCompanyName = ""; // 交易主体
      json.tradeCompanyCode = "";
      json.productType = j.item_type; // 货品类型
      // json.quantity_committed = j.numcommitted;
      // json.quantity_available = j.numavailable;
      skus.push(json);
    }
    retjson.code = 0;
    retjson.data = skus;
    retjson.msg = "查询成功";
    retjson.totalCount = totalCount;
    retjson.pageCount = pageCount;
    retjson.nowPage = nowPage;
    retjson.pageSize = pageSize;
    return JSON.stringify(retjson);
  }

  function _put(context) {}

  function _delete(context) {}

  return {
    get: _get,
    post: _post,
    put: _put,
    delete: _delete,
  };
});
