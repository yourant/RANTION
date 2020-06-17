/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define([
    "N/encode",
    "../../douples_amazon/Helper/handlebars-v4.1.1",
    "N/file",
  ], function (encode, Handlebars,file,) {
    
    function onRequest(context) {
      var response = context.response;
      var request = context.request;
      var St = new Date().getTime();
      var params = request.parameters; //参数
      log.debug("lineComObj:", params.lineComObj);
      var model = file.load({
        //写全路径
        id: "SuiteScripts/Rantion/cux/Requirements_Planning/store_demand_model.xml"
      }).getContents();
      var template = Handlebars.compile(model);
      var xml = template(JSON.parse(params.lineComObj));
      var fileObj = file.create({
        name: "需求计划.xls",
        fileType: file.Type.EXCEL,
        contents:
          encode.convert({
            string:xml,
            inputEncoding: encode.Encoding.UTF_8,
            outputEncoding: encode.Encoding.BASE_64,
          }),
        encoding: file.Encoding.UTF8,
        isOnline: true,
      });
      response.writeFile({ file: fileObj, isInline: true });
      log.debug("耗时：", new Date().getTime() - St);
    }
  
    return {
      onRequest: onRequest,
    };
  });
  