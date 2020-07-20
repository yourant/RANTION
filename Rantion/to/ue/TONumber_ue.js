/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
define(['N/search', 'N/record'], function (search, record) {

    function beforeLoad(context) {
        // var newRec = context.newRecord;
        // try{
        //     var type = context.type;
        //     log.debug(" beforeLoad context.type",context.type);
        //     if (type == "create") {
        //         var trandate = newRec.getValue('tranid');
        //         log.debug(" beforeLoad tranid",trandate);
        //         var T_loca = newRec.getText('custbody_actual_target_warehouse');
        //         log.debug("beforeLoad T_loca",T_loca);
        //         country = T_loca.split(".")[1];
        //         trandate =  JSON.stringify(trandate).split("T")[0].replace(/[-"]/g,"").substring(0,6);
        //         var pn = "TO"+country+trandate;
        //         var number = 0;
        //         search.create({
        //             type:"transferorder",
        //             filters:[
        //                 {name:"tranid",operator:"contains",values:pn}
        //             ],columns:[{name:"tranid",sort:"DESC"}]
        //         }).run().each(function(e){
        //             number = e.getValue(e.columns[0]);
        //             number = number.substring(number.length - 4);
        //         })
        //         log.debug("beforeLoad number",number);
        //         pn = pn+"000"+(Number(number)+1); 
        //         log.debug("beforeLoad pn",pn);
        //         newRec.setValue({fieldId:"tranid",value:pn});
        //         // TO + country + 日期 6 位  + 4 流水号
        //      }
        // }catch(e){
        //        log.error("error ",e);
        // }
    }


    function beforeSubmit(context) {
        var newRec = context.newRecord;
        try{
            var type = context.type;
            log.debug("context.type",context.type);
            if (type == "create") {
                var trandate = newRec.getValue('trandate'),country;
                log.debug(" beforeSubmit trandate",trandate);
                var T_loca = newRec.getValue('custbody_actual_target_warehouse');
                search.create({
                    type:"location",
                    filters:[
                        {name:"internalidnumber",operator:"equalto",values:T_loca}
                    ],columns:[{name:"custrecord_cc_country_code",join:"custrecord_aio_country_sender"}]
                }).run().each(function(e){
                    country = e.getValue(e.columns[0]);
                });
                // country = T_loca.split(".")[1];
                log.debug("guojia：",country)
                if(country){
                    trandate =  JSON.stringify(trandate).split("T")[0].replace(/[-"]/g,"").substring(0,6);
                    var pn = "TO"+country+trandate;
                    var number = 0;
                    search.create({
                        type:"transferorder",
                        filters:[
                            {name:"tranid",operator:"contains",values:pn}
                        ],columns:[{name:"tranid",sort:"DESC"}]
                    }).run().each(function(e){
                        number = e.getValue(e.columns[0]);
                        number = number.substring(number.length - 4);
                    });
                    pn = pn+"000"+(Number(number)+1); 
                    log.debug("beforeSubmit pn",pn);
                    log.debug("beforeSubmit 设置之前的tranid ",newRec.getValue("tranid"));
                    newRec.setValue({fieldId:"tranid",value:pn});
                
                    // TO + country + 日期 6 位  + 4 流水号
                    log.debug("beforeSubmit 设置之后的anid ",newRec.getValue("tranid"));
                }
               
         }
        }catch(e){
               log.error("error ",e);
        }
    }


    /**
     * 设置订单编号
     * @param {} context 
     */
    function afterSubmit(context) {
      
      
    }



   

 

  

    return {
        beforeLoad: beforeLoad,
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    }
});