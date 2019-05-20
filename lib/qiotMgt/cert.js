var Q = require('q');
var _ = require('lodash');

var errorCode = require('../qiotError/errorCode');
var QiotError = require('../qiotError');
var requestQueue = require('../requestQueue');
var templateAPI = require('./template');

var RQUEST_TIMEOUT = 40000;

exports.create = function(endpoint, version, accessKey, thingId) {
    var action = 'create cert';
    var url = `${endpoint}/${version}/certificates/create/${thingId}/`;
    return templateAPI.requestGet(url, accessKey, action);
};

exports.get = function(endpoint, version, accessKey, certificateid) {
    var action = 'get cert';
    var url = `${endpoint}/${version}/things/certificates/${certificateid}/`;
    return templateAPI.requestGet(url, accessKey, action);
};

exports.createByQueue = function(endpoint, version, accessKey, thingId) {
    var url = `${endpoint}/${version}/certificates/create/${thingId}/`;
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Access-Token': accessKey
        },
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    var ret = {};
    requestQueue.push(url, options, function(error, response, body) {
        if (error) {
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, 'generateQIoTCertificate exception: request connection timeouts',
                    errorCode.CONN_TIMEOUT);
            } else {
                ret = new QiotError(error, `generateQIoTCertificate exception: request error ${error.code}`,
                    errorCode.CERT_ERROR);
            }
            deferred.reject(ret);
        } else {
            var respJson;
            try {
                respJson = JSON.parse(body);
            } catch (e) {
                ret = new QiotError(e, `generateQIoTCertificate exception: ${e.message}`,
                    errorCode.CERT_ERROR);
                deferred.reject(ret);
            }
            if (respJson.error) {
                ret = new QiotError(new Error(`generateQIoTCertificate error: ${respJson.error[0].message}`), null,
                    respJson.error[0].code);
                deferred.reject(ret);
            } else {
                deferred.resolve(respJson);
            }
        }
    });
    return deferred.promise;
};
