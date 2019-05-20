var Q = require('q');
var request = require('request');
var QiotError = require('../qiotError');
var errorCode = require('../qiotError/errorCode');

var RQUEST_TIMEOUT = 20000;

exports.requestGet = function(url, accessKey, action) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Access-Token': accessKey
        },
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    request.get(options, function(error, response, body) {
        var ret = {};
        if (error) {
            ret = new QiotError(error, `${action} failed: ${error.message}`, errorCode.CONN_ERROR);
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, `${action} failed: connection timeout`, errorCode.CONN_TIMEOUT);
            }
            deferred.reject(ret);
        } else {
            try {
                if (response.statusCode >= 400) {
                    ret = new QiotError(new Error(`${action} failed: ${JSON.stringify(body)}`), null, response.statusCode);
                    deferred.reject(ret);
                } else if (typeof body === 'string' && response.headers['content-type'] === 'application/json') {
                    body = JSON.parse(body);
                }
                if (body.error) {
                    ret = new QiotError(new Error(body.error[0].message), null, body.error[0].code);
                    deferred.reject(ret);
                } else {
                    deferred.resolve(body);
                }
            } catch (ex) {
                ret = new QiotError(ex, `${action} failed: ${ex.message}`, errorCode.CONN_ERROR);
                deferred.reject(ret);
            }
        }
    });
    return deferred.promise;
};

exports.requestPost = function(url, accessKey, action, jsonBody) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Access-Token': accessKey
        },
        json: jsonBody,
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    request.post(options, function(error, response, body) {
        var ret = {};
        if (error) {
            ret = new QiotError(error, `${action} failed: ${error.message}`, errorCode.CONN_ERROR);
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, `${action} failed: connection timeout`, errorCode.CONN_TIMEOUT);
            }
            deferred.reject(ret);
        } else {
            try {
                if (response.statusCode >= 400) {
                    ret = new QiotError(new Error(`${action} failed: ${JSON.stringify(body)}`), null, response.statusCode);
                    deferred.reject(ret);
                } else if (typeof body === 'string' && response.headers['content-type'] === 'application/json') {
                    body = JSON.parse(body);
                }
                if (body.error) {
                    ret = new QiotError(new Error(body.error[0].message), null, body.error[0].code);
                    deferred.reject(ret);
                } else {
                    deferred.resolve(body);
                }
            } catch (ex) {
                ret = new QiotError(ex, `${action} failed: ${ex.message}`, errorCode.CONN_ERROR);
                deferred.reject(ret);
            }
            deferred.resolve(body);
        }
    });
    return deferred.promise;
};

exports.requestPostWithoutKey = function(url, action, jsonBody) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        json: jsonBody,
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    request.post(options, function(error, response, body) {
        var ret = {};
        if (error) {
            ret = new QiotError(error, `${action} failed: ${error.message}`, errorCode.CONN_ERROR);
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, `${action} failed: connection timeout`, errorCode.CONN_TIMEOUT);
            }
            deferred.reject(ret);
        } else {
            try {
                if (response.statusCode >= 400) {
                    ret = new QiotError(new Error(`${action} failed: ${JSON.stringify(body)}`), null, response.statusCode);
                    deferred.reject(ret);
                } else if (typeof body === 'string' && response.headers['content-type'] === 'application/json') {
                    body = JSON.parse(body);
                }
                if (body.error) {
                    ret = new QiotError(new Error(body.error[0].message), null, body.error[0].code);
                    deferred.reject(ret);
                } else {
                    deferred.resolve(body);
                }
            } catch (ex) {
                ret = new QiotError(ex, `${action} failed: ${ex.message}`, errorCode.CONN_ERROR);
                deferred.reject(ret);
            }
            deferred.resolve(body);
        }
    });
    return deferred.promise;
};

exports.requestDelete = function(url, accessKey, action, jsonBody) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Access-Token': accessKey
        },
        json: jsonBody,
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    request.delete(options, function(error, response, body) {
        var ret = {};
        if (error) {
            ret = new QiotError(error, `${action} failed: ${error.message}`, errorCode.CONN_ERROR);
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, `${action} failed: connection timeout`, errorCode.CONN_TIMEOUT);
            }
            deferred.reject(ret);
        } else {
            try {
                if (response.statusCode >= 400) {
                    ret = new QiotError(new Error(`${action} failed: ${JSON.stringify(body)}`), null, response.statusCode);
                    deferred.reject(ret);
                } else if (typeof body === 'string' && response.headers['content-type'] === 'application/json') {
                    body = JSON.parse(body);
                }
                if (body.error) {
                    ret = new QiotError(new Error(body.error[0].message), null, body.error[0].code);
                    deferred.reject(ret);
                } else {
                    deferred.resolve(body);
                }
            } catch (ex) {
                ret = new QiotError(ex, `${action} failed: ${ex.message}`, errorCode.CONN_ERROR);
                deferred.reject(ret);
            }
            deferred.resolve(body);
        }
    });
    return deferred.promise;
};

exports.requestPatch = function(url, accessKey, action, jsonBody) {
    var deferred = Q.defer();
    var options = {
        url: url,
        headers: {
            'Content-Type': 'application/json',
            'Access-Token': accessKey
        },
        json: jsonBody,
        rejectUnauthorized: false,
        timeout: RQUEST_TIMEOUT
    };
    request.patch(options, function(error, response, body) {
        var ret = {};
        if (error) {
            ret = new QiotError(error, `${action} failed: ${error.message}`, errorCode.CONN_ERROR);
            if (error.code === 'ETIMEDOUT') {
                // connection timeout
                ret = new QiotError(error, `${action} failed: connection timeout`, errorCode.CONN_TIMEOUT);
            }
            deferred.reject(ret);
        } else {
            try {
                if (response.statusCode >= 400) {
                    ret = new QiotError(new Error(`${action} failed: ${JSON.stringify(body)}`), null, response.statusCode);
                    deferred.reject(ret);
                } else if (typeof body === 'string' && response.headers['content-type'] === 'application/json') {
                    body = JSON.parse(body);
                }
                if (body.error) {
                    ret = new QiotError(new Error(body.error[0].message), null, body.error[0].code);
                    deferred.reject(ret);
                } else {
                    deferred.resolve(body);
                }
            } catch (ex) {
                ret = new QiotError(ex, `${action} failed: ${ex.message}`, errorCode.CONN_ERROR);
                deferred.reject(ret);
            }
            deferred.resolve(body);
        }
    });
    return deferred.promise;
};
