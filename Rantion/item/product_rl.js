/**
 * @NApiVersion 2.x
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['./product.js', '../common/request_record'],

    function (product, requestRecord) {

        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        function doPost(requestDto) {
            var responseDto = {};
            try {
                var requestBody = requestDto.requestBody;
                var productDto = product.productHandle(requestBody);
                product.saveProduct(productDto);
                for (var index = 0; index < requestBody.productSkuList.length; index++) {
                    var skuInfo = requestBody.productSkuList[index];
                    var skuDto = product.productSkuHandle(skuInfo);
                    product.saveProductSku(skuDto);
                }
                responseDto.code = 0;
                requestRecord.saveRequestRecord(requestDto.requestId, JSON.stringify(requestBody), JSON.stringify(responseDto), 1, "product");
            } catch (error) {
                responseDto.code = 1;
                responseDto.msg = error;
                requestRecord.saveRequestRecord(requestDto.requestId, JSON.stringify(requestBody), JSON.stringify(responseDto), 2, "product");
            }
            return JSON.stringify(responseDto);
        }

        return {
            post: doPost
        };

    });
