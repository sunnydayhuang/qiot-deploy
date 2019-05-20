var Client = require('ssh2').Client;
var DFHelper = require('node-df').Helper;
var exec = require('child_process').exec;
var path = require('path');
var Q = require('q');
var rimraf = require('rimraf');
var uuidv4 = require('uuid/v4');
var _ = require('lodash');

var certAPI = require('../lib/qiotMgt/cert');
var connector = require('../lib/connector');
var cryptograph = require('../lib/cryptograph');
var deviceConnectAPI = require('../lib/qiotMgt/deviceConnect');
var errorCode = require('../lib/qiotError/errorCode');
var errorResponse = require('../lib/qiotError/errorResponse');
var fsExt = require('../lib/fsExt');
var logFactory = require('../lib/logFactory');
var QiotError = require('../lib/qiotError');
var remoteFs = require('../lib/remoteFs');
var thingAPI = require('../lib/qiotMgt/thing');
var logger = logFactory.getLogger(path.basename(__filename));
var deployCount = 0;
var HOST_IP = `http://${process.env.KONG_URI}`;
var API_VERSION = 'v1';
var NAS_ROOT_CA_PATH = path.resolve(__dirname, '..', 'ssl/certs/myrootca.crt');
var rmDir = Q.denodeify(rimraf);

var sampleCodeType = {
    'arduino': { 'name': 'python-arduino', 'path': '/python/arduino-yun' },
    'raspberry pi': { 'name': 'nodejs-raspberry', 'path': '/nodejs/raspberrypi' },
    'intel edison': { 'name': 'nodejs-edison', 'path': '/nodejs/intel-edison' },
    'linkit smart 7688 duo': { 'name': 'python-linkit', 'path': '/python/mtk-linkit-7688-duo' },
    'default': { 'name': 'python-arduino', 'path': '/python/arduino-yun' }
};

// For backward compatibility, this old method will exist until the front-end transfer to new API.
module.exports.originalDeploy = function(req, res) {
    logger.info('receive POST /api/deploy request, reqBody:', JSON.stringify(req.body, logFactory.hideLogMessage));
    var accessKey = req.headers['access-token'];
    res.setHeader('Access-Token', accessKey);
    // default value of remote deploy folder
    req.body.folderPath = `/home/${req.body.username}/bundle`;

    Q.resolve(true)
        .then(resp => {
            return deploySampleFunction(req.body, accessKey, req.body.thingId);
        })
        .then(resp => {
            res.status(200).json(resp);
            gc();
        })
        .catch(err => {
            logger.error('deploy code to device error: %s, stack: %s', err.message, JSON.stringify(err.stack));
            errorResponse.json(res, err, errorCode.DEVICE_DEPLOY_CODE_ERROR);
            gc();
        });
};
module.exports.getSampleCodeType = function(req, res) {
    var thingtype = String(req.query.thingType).toLowerCase();
    var defaultType = searchDefaultSampleCodeType(thingtype);
    var list = sampleCodeTypeArray();
    var resp = {
        'result': {
            'SampleCodeType': list,
            'default': defaultType
        }
    }
    res.statusCode = 200;
    res.json(resp);
};

module.exports.deploySampleCode = function(req, res) {
    var thingid = req.params.thingid;
    logger.info(`receive POST /api/${thingid}/sampleCode request, reqBody:`, JSON.stringify(req.body, logFactory.hideLogMessage));

    var body = Object.assign({}, req.body);
    var accessKey = req.headers['access-token'];
    var functionName = '';
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
                `thing:${thingid}, functionName:${functionName}`);
            return deploySampleFunction(body, accessKey, thingid, functionName);
        }).then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error('deploy sample code to device error'), null, errorCode.DEVICE_DEPLOY_CODE_ERROR);
            }
            res.statusCode = 200;
            res.json(resp);
        })
        .catch(err => {
            logger.error('deploy sample code to device error: %s, stack: %s', err.message, JSON.stringify(err.stack));
            errorResponse.json(res, err, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

var testConnection = function(hostname, username, password, conn) {
    var deferred = Q.defer();
    var ret = {};
    conn.on('ready', function() {
        ret.result = { 'status': 'connected' };
        logger.debug('sshClient ready, ret:', JSON.stringify(ret));
        deferred.resolve(ret);
    }).on('error', function(err) {
        logger.debug('testConnection failed, err:', err.message);
        ret = new QiotError(err, err.level, errorCode.DEVICE_ERROR);
        deferred.reject(ret);
    }).connect({
        host: hostname,
        username: username,
        password: password,
        port: 22
    });
    return deferred.promise;
};

var deploySampleFunction = function(params, accessKey, thingId, functionName) {
    var paths = {};
    var nowstep = 'setSampleCodeType';
    var certificateId;
    deployCount++;
    var deployFolder = (functionName) ? `${params.folderPath}/${functionName}` : params.folderPath;
    if (typeof params.protocol === 'undefined') {
        params.protocol = 'mqtts';
    }

    return Q.resolve(true)
        .then(resp => {
            var sampleCodeType;
            if (_.has(params, 'sampleCodeType')) {
                sampleCodeType = params.sampleCodeType;
                return deployConnect(accessKey, params.hostname, params.username,
                    params.password, thingId, sampleCodeType);
            }
            return thingAPI.getThingTypeName(HOST_IP, API_VERSION, accessKey, thingId)
                .then(resp => {
                    logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                        deployCount, nowstep, thingId, params.hostname);
                    var thingTypeName = resp;
                    var sampleCodeType = 'python-arduino'; // default value
                    if (thingTypeName === 'Raspberry Pi') {
                        sampleCodeType = 'nodejs-raspberry';
                    } else if (thingTypeName === 'Intel Edison') {
                        sampleCodeType = 'nodejs-edison';
                    } else if (thingTypeName === 'LinkIt Smart 7688 Duo') {
                        sampleCodeType = 'python-linkit';
                    }
                    nowstep = 'buildPath';
                    return deployConnect(accessKey, params.hostname, params.username,
                        params.password, thingId, sampleCodeType);
                });
        })
        .then(resp => {
            paths = resp['result'];
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            nowstep = 'getSdk';
            return getSdk(thingId, paths);
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            if (params.protocol === 'https') {
                nowstep = 'generateHTTPSCertificate';
                return fsExt.copyFile(NAS_ROOT_CA_PATH, `${paths.sslPath}/mycert.pem`, false)
                    .then(success => {
                        if (!success) {
                            logger.error('Root ca-cert file not found in NAS');
                        }
                        return true;
                    });
            }
            return false;
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s, resp: %s',
                deployCount, nowstep, thingId, params.hostname, resp);
            if (params.protocol === 'mqtts') {
                nowstep = 'generateMQTTSCertificate';
                return thingAPI.getSortedActiveCerts(HOST_IP, API_VERSION, accessKey, thingId)
                    .then((certs) => {
                        if (certs.length === 0) {
                            nowstep = 'generateCert';
                            // can not find active cert, create new one
                            return generateCertificates(accessKey, thingId);
                        }
                        nowstep = 'getExistingCert';
                        return certs[0].id;
                    });
            }
            return false
        })
        .then(certId => {
            // download certificate
            if (certId) {
                certificateId = certId;
                logger.info('step: %s, thingId: %s, certificateId: %s', nowstep, thingId, certId);
                nowstep = 'downloadCert';
                return downloadCertificates(params, accessKey, certId, paths.sslPath);
            }
            return false;
        })
        .then(resp => {
            nowstep = `get${params.protocol}Connection`;
            return deviceConnectAPI.getConnection(HOST_IP, API_VERSION, accessKey, thingId, params.protocol, certificateId)
                .then(resp => {
                    return JSON.stringify(resp.result);
                });
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            nowstep = 'writeResourceinfo';
            return fsExt.writeJsonFile(resp, paths.resPath, 'resourceinfo.json');
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            nowstep = 'mesureNeedMemory';
            paths.sdkDir = path.resolve(paths.codePath + paths.dirPath, 'examples');
            return mesureNeedMemory(paths.sdkDir);
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            nowstep = 'sshToDevice';
            var requiredSize = resp.result.requiredSize;
            return sshToDevice(params.hostname, params.username, params.password, requiredSize, deployFolder);
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            nowstep = 'scpExample';
            return scpExample(params.hostname, params.username, params.password, paths.sdkDir, deployFolder);
        })
        .then(resp => {
            logger.info('deployCount: %s, step: %s, thingId: %s, hostname: %s',
                deployCount, nowstep, thingId, params.hostname);
            logger.info('deploy sample code has succeeded, hostname: %s, response: %s',
                params.hostname, JSON.stringify(resp));
            removeDir(paths.deployTempPath);
            return resp;
        })
        .catch(err => {
            logger.error('deployCount: %s, step: %s, thingId: %s, hostname: %s, error: %s',
                deployCount, nowstep, thingId, params.hostname, err.message);
            removeDir(paths.deployTempPath);
            if (err instanceof QiotError) {
                throw err;
            }
            throw new QiotError(err, null, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

var gc = function() {
    if (global.gc) {
        global.gc();
    }
};

var generateCertificates = function(accessKey, thingId) {
    return certAPI.createByQueue(HOST_IP, API_VERSION, accessKey, thingId)
        .then((resp) => {
            if (!_.has(resp, 'result.id')) {
                throw new QiotError(new Error('certificateid not found in creatCert API',
                    null, errorCode.CERT_ERROR));
            }
            return resp.result.id;
        });
};

var downloadCertificates = function(params, accessKey, certificateId, destination) {
    var validCertificateType = ['clientCert', 'caCert', 'privateCert'];
    var fileNamePattern = /[0-9A-Za-z_-]+.pem/g;
    return Q.resolve(true)
        .then(resp => {
            return certAPI.get(HOST_IP, API_VERSION, accessKey, certificateId)
        })
        .then(resp => {
            logger.info('step: %s, certificateId: %s, hostname: %s',
                'get certificate', certificateId, params.hostname);
            var files = [];
            for (var i = 0; i < validCertificateType.length; i++) {
                if (!_.has(resp, `result.${validCertificateType[i]}`)) {
                    var message = 'certificate url not found in response body';
                    logger.error('step: %s, certificateId: %s, hostname: %s, error: %s',
                        'get certificate url', certificateId, params.hostname, message);
                    throw new Error(message);
                }
                var certLocation = resp.result[validCertificateType[i]];
                if (!certLocation.match(fileNamePattern)) {
                    throw new Error(`${validCertificateType[i]} url location should end with pem`);
                }
                files.push(`${HOST_IP}${certLocation}`);
            }
            return fsExt.downloadUrlToFs(files, destination, accessKey);
        }).then(resp => {
            if (!_.has(resp, 'result.status')) {
                logger.error('download certificates with invalid response:', JSON.stringify(resp));
                throw new QiotError(new Error('download certificate files failed'), null,
                    errorCode.DOWNLOAD_CERT_ERROR);
            }
            return resp;
        }).catch(err => {
            throw err;
        })
};

var deployConnect = function(accessKey, hostname, username, password, thingId, deviceInfo) {
    logger.debug('start deploy, hostname: %s, username: %s', hostname, username);
    var deferred = Q.defer();
    var ret = {};
    if (!(accessKey && hostname && username && password && thingId)) {
        ret.error = [{ 'message': 'body data incorrect' }];
        deferred.reject(ret);
    }
    var basepath = path.resolve('.');
    var deployTempPath = path.join(basepath, uuidv4());
    var localPath = path.join(deployTempPath, thingId);
    var codePath = path.join(localPath, 'qnap-qiot-sdks');
    var dirPath = arrangeCodePath(deviceInfo);
    var sourcePath = `${dirPath}/examples`;
    var localCodePath = codePath + sourcePath;
    var sslPath = path.join(localCodePath, 'ssl');
    var resPath = path.join(localCodePath, 'res');
    ret.result = {
        'basepath': basepath,
        'deployTempPath': deployTempPath,
        'localPath': localPath,
        'codePath': codePath,
        'dirPath': dirPath,
        'sourcePath': sourcePath,
        'localCodePath': localCodePath,
        'sslPath': sslPath,
        'resPath': resPath
    }
    deferred.resolve(ret);
    return deferred.promise;
};

var arrangeCodePath = function(deviceInfos) {
    var infos;
    var device;
    // 'python-arduino' / 'nodejs-raspberry' / 'nodejs-edison'
    if (deviceInfos) {
        infos = deviceInfos.split('-');
    } else {
        infos = ['nodejs', 'edison'];
    }
    switch (infos[1]) {
        case 'edison':
            device = 'intel-edison';
            break;
        case 'raspberry':
            device = 'raspberrypi';
            break;
        case 'arduino':
            device = 'arduino-yun';
            break;
        case 'linkit':
            device = 'mtk-linkit-7688-duo';
            break;
        default:
            device = 'intel-edison';
    }
    var codePath = `/${infos[0]}/device/${device}`;
    return codePath;
};

var getSdk = function(thingId, paths) {
    var deferred = Q.defer();
    var basepath = paths.basepath || path.resolve('.');
    var localPath = paths.localPath || path.join(basepath, thingId, uuidv4());
    var parentSampleCodePath = path.join(basepath, 'qnap-qiot-sdks');
    var ret = {};
    var cmd = `rm -rf ${localPath} && mkdir -p ${localPath} && cp -r ${parentSampleCodePath} ${localPath}`;
    logger.debug(`generate temp sdk, thingId: ${thingId}, cmd: ${cmd}`);
    exec(cmd, function(error, stdout, stderr) {
        if (error) {
            logger.error('get sdk fail, err: %s, stack: %s', error.message, JSON.stringify(error.stack));
            deferred.reject(error);
        } else {
            ret.result = {
                'status': 'OK',
                'method': 'get sdk'
            };
            deferred.resolve(ret);
        }
    });
    return deferred.promise;
};

var mesureNeedMemory = function(sdkDir) {
    var deferred = Q.defer();
    var cmd = `du -sk ${sdkDir}`;
    var ret = {};
    exec(cmd, function(error, stdout, stderr) {
        if (error) {
            ret = new QiotError(error, `mesure need memory error: ${error.message}`,
                errorCode.MEMORY_ERROR);
            deferred.reject(ret);
        } else if (stderr) {
            ret = new QiotError(new Error(`mesure need memory error: ${stderr}`), null,
                errorCode.MEMORY_ERROR);
            deferred.reject(ret);
        } else if (stdout) {
            var size = stdout.split('\t');
            var requiredSize = parseInt(size[0]);
            ret = {
                'result': {
                    'requiredSize': requiredSize
                }
            };
            deferred.resolve(ret);
        } else {
            ret = new QiotError(new Error('mesure need memory error: stdout is empty'), null,
                errorCode.MEMORY_ERROR);
            deferred.reject(ret);
        }
    });
    return deferred.promise;
};

var sshToDevice = function(hostname, username, password, databytes, destination) {
    logger.debug('ssh to device, hostname: %s, username: %s', hostname, username);
    var deferred = Q.defer();
    var ret = {};
    var conn = new Client();
    testConnection(hostname, username, password, conn).then(
        function(val) {
            conn.exec(`mkdir -p ${destination}`, function(err, stream) {
                if (err) {
                    ret = new QiotError(err, `create directory ${destination} failed: ${err.message}`,
                        errorCode.DEVICE_ERROR);
                    conn.close();
                    deferred.reject(ret);
                } else {
                    stream.on('close', function(code, signal) {
                        // check memory space
                        conn.exec(`df -k ${destination}`, function(err, stream) {
                            if (err) {
                                ret = new QiotError(err, `connect to device error: ${err.message}`,
                                    errorCode.DEVICE_ERROR);
                                deferred.reject(ret);
                            } else {
                                stream.on('data', function(data) {
                                    try {
                                        var stdout = data.toString();
                                        var options = {
                                            file: destination
                                        };
                                        var response = DFHelper.parse(stdout, options);
                                        var available = response[0].available;
                                        logger.debug('need: %s, available: %s', databytes, available);
                                        if (available < databytes) {
                                            // meomory space not enough
                                            ret = new QiotError(err,
                                                `connect to device error: check memory space failed - need ${databytes} KB`,
                                                errorCode.DEVICE_MEMORY_ERROR);
                                            deferred.reject(ret);
                                        } else {
                                            ret = {
                                                'result': {
                                                    'codepath': destination
                                                }
                                            };
                                            deferred.resolve(ret);
                                        }
                                    } catch (e) {
                                        ret = new QiotError(err, `connect to device error: ${e.message}`,
                                            errorCode.DEVICE_ERROR);
                                        deferred.reject(ret);
                                    }
                                }).on('close', function(code, signal) {
                                    conn.end();
                                });
                            }
                        })
                    }).on('data', function(data) {
                        logger.info('STDOUT:', JSON.stringify(data));
                    }).stderr.on('data', function(data) {
                        ret = new QiotError(err, `connect to device error: ${data}`, errorCode.DEVICE_ERROR);
                        deferred.reject(ret);
                    });
                }
            });
        },
        function(err) {
            ret = new QiotError(err, null, errorCode.DEVICE_ERROR);
            deferred.reject(ret);
        }
    );
    return deferred.promise;
};

var scpExample = function(hostname, username, password, sdkDir, destination) {
    return remoteFs.syncFiles(hostname, username, password, sdkDir, destination)
        .then(resp => {
            return {
                'result': {
                    'codepath': path.normalize(resp.destination)
                }
            };
        })
        .catch(err => {
            throw new QiotError(err, `scp to device  : ${err.message}`, errorCode.DEVICE_DEPLOY_CODE_ERROR);
        });
};

var removeDir = function(path, throwable) {
    return rmDir(path)
        .catch(err => {
            logger.error(`removeDir err: ${err}`);
            if (throwable) {
                throw err;
            }
        });
};
var sampleCodeTypeArray = function() {
    var typeArray = [];
    Object.keys(sampleCodeType).forEach(function(key) {
        typeArray.push(sampleCodeType[key]['name']);
    })
    typeArray = _.uniq(typeArray);
    return typeArray;
}

var searchDefaultSampleCodeType = function(type) {
    var defaultType = '';
    Object.keys(sampleCodeType).forEach(function(key) {
        if (key === type) {
            defaultType = sampleCodeType[key]['name'];
        }
    });
    if (defaultType === '') {
        return sampleCodeType['default']['name'];
    } else {
        return defaultType;
    }
}
