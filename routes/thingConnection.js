var path = require('path');
var Q = require('q');

var connector = require('../lib/connector');
var cryptograph = require('../lib/cryptograph');
var errorCode = require('../lib/qiotError/errorCode');
var errorResponse = require('../lib/qiotError/errorResponse');
var logFactory = require('../lib/logFactory');
var thingAPI = require('../lib/qiotMgt/thing');
var QiotError = require('../lib/qiotError');

var logger = logFactory.getLogger(path.basename(__filename));
var HOST_IP = `http://${process.env.KONG_URI}`;
var API_VERSION = 'v1';

module.exports.connect = function(req, res) {
    logger.info('receive POST /api/connect request, reqBody:', JSON.stringify(req.body, logFactory.hideLogMessage));
    var accessKey = req.headers['access-token'];
    res.setHeader('Access-Token', accessKey);
    var body = req.body;
    connector.testConnectSSH(body.hostname, body.username, body.password)
        .then(function(success) {
            logger.info('testConnectSSH has succeeded, ret:', JSON.stringify(success));
            res.statusCode = 200;
            res.json(success);
        }, function(error) {
            logger.error('testConnectSSH failed, error: %s, stack: %s', error.message, JSON.stringify(error.stack));
            res.statusCode = 200;
            if (error instanceof QiotError) {
                res.json(error.toJson());
            } else {
                res.json({
                    error: [{
                        message: `connect to device by SSH error: ${error.message}`,
                        'code': errorCode.DEVICE_ERROR.code
                    }]
                });
            }
        });
};

module.exports.connectByIdThing = function(req, res) {
    var thingid = req.params.thingid;
    logger.info(`receive POST /api/${thingid}/connect request, reqBody:`, JSON.stringify(req.body, logFactory.hideLogMessage));
    var accessKey = req.headers['access-token'];
    res.setHeader('Access-Token', accessKey);
    var body = req.body;
    var password = '';
    try {
        password = cryptograph.aesDecrypt(body.password, thingid);
    } catch (err) {
        password = body.password;
    }
    connector.testConnectSSH(body.hostname, body.username, password)
        .then(function(success) {
            logger.info('testConnectSSH has succeeded, ret:', JSON.stringify(success));
            res.statusCode = 200;
            res.json(success);
        }, function(error) {
            logger.error('testConnectSSH failed, error: %s, stack: %s', error.message, JSON.stringify(error.stack));
            errorResponse.json(res, error, errorCode.DEVICE_ERROR);
        });
};

module.exports.saveConnectionInfo = function(req, res) {
    var thingid = req.params.thingid;
    logger.info(`receive POST /api/${thingid}/connectionInfo request, reqBody:`,
        JSON.stringify(req.body, logFactory.hideLogMessage));
    var accessKey = req.headers['access-token'];
    res.setHeader('Access-Token', accessKey);
    var body = req.body;
    Q.resolve(true)
        .then(resp => {
            var password = body.password;
            try {
                // use the uploaded password if it can be decrypted
                cryptograph.aesDecrypt(password, thingid);
            } catch (ex) {
                password = cryptograph.aesEncrypt(password, thingid);
            }
            return thingAPI.updateConnectionInfo(HOST_IP, API_VERSION, accessKey, thingid, {
                'hostname': body.hostname,
                'username': body.username,
                'password': password
            });
        })
        .then(function(resp) {
            logger.info('updateConnectionInfo has succeeded, ret:', JSON.stringify(resp));
            res.statusCode = 200;
            res.json({
                'result': {
                    'status': 'updated'
                }
            });
        }, function(error) {
            logger.error('updateConnectionInfo failed, error: %s, stack: %s', error.message, JSON.stringify(error.stack));
            errorResponse.json(res, error, errorCode.UPDATE_CONN_INFO_ERROR);
        });
};
