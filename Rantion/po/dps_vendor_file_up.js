/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@author Doris
 *@description 供应商文件上传
 */
define(["N/ui/serverWidget","N/runtime","N/record"], function (serverWidget,runtime,record) {

    var language= runtime.getCurrentUser().getPreference({name:'LANGUAGE'});

    function onRequest(context) {

        var request = context.request;
        var response = context.response;

        var method = request.method;
        log.debug('method', method);

        if (method == 'GET') {
            var form = serverWidget.createForm(language=='zh_CN'?'供应商文件上传':'vendor file upload');

            //==========查询条件begin=================================================================================
            form.addField({
                id: 'custpage_file',
                type: serverWidget.FieldType.FILE,
                label: language=='zh_CN'?'文件':'file'
            });

            form.addSubmitButton({
                label: language=='zh_CN'?'提交':'Submit'
            });

            response.writePage(form);
        } else {

            var userId = runtime.getCurrentUser().id;
            log.debug('userId', userId);
            var file1 = context.request.files['custpage_file'];
				log.debug('file1', file1);
            return;
            if(file1){

                file1.folder = 408; //folder internal ID
                var id1 = file1.save();

                record.attach({
                    record: {
                        type: 'file',
                        id: id1
                    },
                    to: {
                        type: 'vendor',
                        id: userId
                    }
                });    

                var form = serverWidget.createForm({
                    title:  language=='zh_CN'?'文件上传成功!':'file uploaded success'
                });
            }else{
                var form = serverWidget.createForm({
                    title: language=='zh_CN'?'请先选择文件!':'please choose your file'
                });
            }
           
            response.writePage(form);
        }
    }

    return {
        onRequest: onRequest
    }
});