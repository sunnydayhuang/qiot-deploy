var fs = require('fs');
var path = require('path');
var Q = require('q');
var rimraf = require('rimraf');
var uuidv4 = require('uuid/v4');
var _ = require('lodash');

var connector = require('../lib/connector');
var cryptograph = require('../lib/cryptograph');
var errorCode = require('../lib/qiotError/errorCode');
var errorResponse = require('../lib/qiotError/errorResponse');
var fsExt = require('../lib/fsExt');
var logFactory = require('../lib/logFactory');
var QiotError = require('../lib/qiotError');
var remoteFs = require('../lib/remoteFs');
var unzipper = require('../lib/unzipper');

var API_VERSION = 'v1'; // TODO: refactor this to config
var logger = logFactory.getLogger(path.basename(__filename));
var QPKG_PATH = process.env.QPKG_PATH || './';
var LOCAL_FUNC_PATH = path.resolve(QPKG_PATH, 'iot', 'functions');
var rmDir = Q.denodeify(rimraf);

module.exports.createFunction = function(req, res) {
    var thingid = req.params.thingid;
    var functionId = req.params.functionId;
    logger.info(`receive PUT /api/${thingid}/functions/${functionId} request, reqBody:`,
        JSON.stringify(req.body, logFactory.hideLogMessage));
    var body = Object.assign({}, req.body);

    // check functionId format
    var pattern = /^[a-zA-Z0-9-_]{1,64}$/;
    if (!pattern.test(functionId)) {
        return res.status(400).end();
    }

    Q.resolve(true)
        .then(resp => {
            try {
                body.password = cryptograph.aesDecrypt(body.password, thingid);
            } catch (ex) {
                logger.warn('decrypt password failed, use plaintext as password instead');
            }
            return connector.testConnectSSH(body.hostname, body.username, body.password);
        })
        .then(resp => {
            logger.info('test connection has succeeded, ' +
                    `thing:${thingid}, functionId:${functionId}`);
            if (_.has(body, 'zipFile')) {
                logger.info(`deploy new code, thingId:${thingid}, functionId:${functionId}`);
                return deployUserFunction(body, thingid, functionId);
            }
            logger.info(`re-deploy code, thingId:${thingid}, functionId:${functionId}`);
            return deployExistingUserFunction(body, thingid, functionId);
        }).then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error('deploy code to device error'), null, errorCode.DEVICE_DEPLOY_CODE_ERROR);
            }
            res.statusCode = 200;
            res.json(resp);
        })
        .catch(err => {
            logger.error('deploy code to device error: %s, stack: %s', err.message, JSON.stringify(err.stack));
            errorResponse.json(res, err, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

var deployUserFunction = function(params, thingid, functionId) {
    var zipFile = params.zipFile;
    var hostname = params.hostname;
    var username = params.username;
    var password = params.password;
    var folderPath = params.folderPath;
    var functionName = params.functionName;
    var tempFuncFolder = `${LOCAL_FUNC_PATH}/${thingid}/${functionId}/${uuidv4()}`;
    var tempFuncCodeFolder = `${tempFuncFolder}/code`;
    var localFuncFolder = `${LOCAL_FUNC_PATH}/${thingid}/${functionId}`;
    var localFuncCodeFolder = `${localFuncFolder}/code`;
    var decodedZipFileBuffer = Buffer.from(zipFile, 'base64');
    return Q.resolve(true)
        .then(resp => {
            return unzipper.unzip(decodedZipFileBuffer, tempFuncCodeFolder);
        })
        .then(resp => {
            logger.info(`unzip to ${tempFuncCodeFolder}, thing:${thingid}, functionId:${functionId}, resp:${resp}`);
            return fsExt.writeBufferToFile(decodedZipFileBuffer, localFuncFolder, `code.zip`);
        })
        .then(resp => {
            logger.info(`write zipFile to ${localFuncFolder}, thing:${thingid}, functionId:${functionId}, resp:${resp}`);
            return remoteFs.createDir(hostname, username, password, `${folderPath}/${functionName}`);
        })
        .then(resp => {
            logger.info(`create remote directory ${hostname}:${folderPath}/${functionName}, resp:${resp}`);
            return remoteFs.syncFiles(hostname, username, password,
                tempFuncCodeFolder, `${folderPath}/${functionName}`);
        })
        .then(resp => {
            logger.info(`sync to remote directory ${hostname}:${folderPath}, ` +
                    `thing:${thingid}, functionId:${functionId}, resp:${resp}`);
            return fsExt.rsyncDir(tempFuncCodeFolder, localFuncCodeFolder);
        })
        .then(resp => {
            logger.info(`move temp code folder ${tempFuncCodeFolder} to ${localFuncCodeFolder}, resp: ${resp}`);
            return fsExt.removeDir(tempFuncFolder);
        })
        .then(resp => {
            logger.info(`remove temp folder ${tempFuncFolder}, resp: ${resp}`);
            return {
                'result': {
                    'codepath': path.normalize(`${folderPath}/${functionName}`),
                    'cachedCodePath': localFuncCodeFolder,
                    'downloadUrl': `/${API_VERSION}/deploy/media/${thingid}/${functionId}/code.zip`
                }
            };
        })
        .catch(err => {
            if (localFuncFolder) {
                removeDir(localFuncFolder);
            }
            throw new QiotError(err, null, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

var deployExistingUserFunction = function(params, thingid, functionId) {
    var hostname = params.hostname;
    var username = params.username;
    var password = params.password;
    var folderPath = params.folderPath;
    var functionName = params.functionName;
    var localFuncCodeFolder = params.cachedCodePath;
    var cachedCodePathPattern = /\/code[/]*$/
    if (_.isEmpty(localFuncCodeFolder)) {
        localFuncCodeFolder = `${LOCAL_FUNC_PATH}/${thingid}/${functionId}/code`;
    }

    if (!cachedCodePathPattern.test(localFuncCodeFolder)) {
        throw new QiotError(new Error('function not found'), null, errorCode.FUNCTION_NOT_FOUND);
    }

    return Q.promise(function(resolve, reject, notify) {
        fs.access(localFuncCodeFolder, err => {
            if (err) {
                reject(new QiotError(err, 'function not found', errorCode.FUNCTION_NOT_FOUND));
            }
            resolve(true);
        })
    })
        .then(resp => {
            return remoteFs.createDir(hostname, username, password, `${folderPath}/${functionName}`);
        })
        .then(resp => {
            logger.info(`create remote directory ${hostname}:${folderPath}/${functionName}, ` +
            `thing:${thingid}, functionName:${functionName}`);
            return remoteFs.syncFiles(hostname, username, password,
                localFuncCodeFolder, `${folderPath}/${functionName}`);
        })
        .then(resp => {
            logger.info(`sync existing function to remote directory ${hostname}:${folderPath}, ` +
                `thing:${thingid}, functionName:${functionName}, localFuncCodeFolder: ${localFuncCodeFolder}`);
            return {
                'result': {
                    'codepath': path.normalize(`${folderPath}/${functionName}`),
                    'cachedCodePath': localFuncCodeFolder,
                    'downloadUrl': `/${API_VERSION}/deploy/media/${thingid}/${functionId}/code.zip`
                }
            };
        }).catch(err => {
            if (err instanceof QiotError) {
                throw err;
            }
            throw new QiotError(err, null, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

// Refactor this to uitility
var removeDir = function(path, throwable) {
    return rmDir(path)
        .catch(err => {
            logger.error(`removeDir err: ${err}`);
            if (throwable) {
                throw err;
            }
        });
};
