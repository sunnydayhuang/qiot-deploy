var path = require('path');
var Q = require('q');
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
var remoteFs = require('../lib/remoteFs');
var templateAPI = require('../lib/qiotMgt/template');
var thingAPI = require('../lib/qiotMgt/thing');
var QiotError = require('../lib/qiotError');

var logger = logFactory.getLogger(path.basename(__filename));
var HOST_IP = `http://${process.env.KONG_URI}`;
var API_VERSION = 'v1'; // TODO: refactor this to config
var localTempResourceFolder = path.resolve(__dirname, '..', 'tempResource');

module.exports.createResources = function(req, res) {
    var thingId = req.params.thingid;
    var body = Object.assign({}, req.body);
    logger.info(`receive POST /api/${thingId}/resourceinfo request, reqBody:`,
        JSON.stringify(req.body, logFactory.hideLogMessage));

    var accessKey = req.headers['access-token'];
    var ret = { 'result': {} };
    var nowstep = '';
    Q.resolve(true)
        .then(resp => {
            try {
                body.password = cryptograph.aesDecrypt(body.password, thingId);
            } catch (ex) {
                logger.warn('decrypt password failed, use plaintext as password instead');
            }
            nowstep = 'testConnection';
            logger.info('step: %s, thingId: %s, hostname: %s', nowstep, thingId, body.hostname);
            return connector.testConnectSSH(body.hostname, body.username, body.password);
        })
        .then(resp => {
            // certificate handling if protocol was mqtts
            if (body.protocol === 'mqtts' &&
                (body.autoGenerateCert === true || body.autoGenerateCert === 'true')) {
                nowstep = 'generateCert';
                logger.info('step: %s, thingId: %s', nowstep, thingId);
                return generateCertificates(accessKey, thingId);
            } else if (body.protocol === 'mqtts') {
                nowstep = 'getExistingCert';
                logger.info('step: %s, thingId: %s', nowstep, thingId);
                return thingAPI.getSortedActiveCerts(HOST_IP, API_VERSION, accessKey, thingId)
                    .then((certs) => {
                        if (certs.length === 0) {
                            nowstep = 'generateCert';
                            logger.info('step: %s, thingId: %s', nowstep, thingId);
                            // can not find active cert, create new one instead
                            return generateCertificates(accessKey, thingId);
                        }
                        return certs[0].id;
                    });
            }
            return false;
        })
        .then(certId => {
            if (certId) {
                nowstep = 'deployCert';
                logger.info('step: %s, thingId: %s, certificateId: %s', nowstep, thingId, certId);
                return deployCertificates(body, accessKey, certId);
            }
            return false;
        })
        .then(resp => {
            if (resp) {
                logger.info('step: %s, thingId: %s, hostname: %s, resp: %s',
                    nowstep, thingId, body.hostname, JSON.stringify(resp));
                ret.result.certificates = resp;
                ret.result.certificates.location = body.certFolderPath;
            }
            nowstep = 'getResourceinfo';
            logger.info('step: %s, thingId: %s, protocol: %s, certId: %s', nowstep, thingId, body.protocol, resp.id);
            return deviceConnectAPI.getConnection(HOST_IP, API_VERSION, accessKey, thingId,
                body.protocol, resp.id);
        })
        .then(resp => {
            nowstep = 'deployResourceinfo';
            logger.info('step: %s, thingId: %s, hostname: %s, protocol: %s',
                nowstep, thingId, body.hostname, body.protocol);
            var resourceInfo = JSON.stringify(resp.result);
            return deployResourceinfo(body, accessKey, thingId, resourceInfo);
        })
        .then(resp => {
            logger.info('step: %s, thingId: %s, hostname: %s, protocol: %s, resp: %s',
                nowstep, thingId, body.hostname, body.protocol, JSON.stringify(resp));
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error('write resourceinfo to thing with no response'), null, errorCode.WRITE_ERROR);
            }
            ret.result.resourceinfo = resp.filePath;
            res.statusCode = 200;
            res.json(ret);
        })
        .catch(err => {
            errorResponse.json(res, err, errorCode.DEVICE_DEPLOY_RESOURCE_ERROR);
        });
};

var deployResourceinfo = function(params, accessKey, thingId, resourceInfo) {
    var tempDeployFolder = path.resolve(localTempResourceFolder, uuidv4());
    var nowStep = '';
    var filename = 'resourceinfo.json';
    return Q.resolve(true)
        .then(resp => {
            nowStep = 'writeResourceinfo';
            logger.info('step: %s, thingId: %s, local: %s', nowStep, thingId, tempDeployFolder);
            return fsExt.writeBufferToFile(resourceInfo, tempDeployFolder, filename);
        }).then(resp => {
            nowStep = 'createRemoteDir';
            logger.info('step: %s, thingId: %s, hostname: %s, destination: %s',
                nowStep, thingId, params.hostname, params.resourceinfoFolderPath);
            return remoteFs.createDir(params.hostname, params.username, params.password, params.resourceinfoFolderPath);
        }).then(resp => {
            nowStep = 'syncResourceinfo';
            logger.info('step: %s, thingId: %s, hostname: %s, source: %s, destination: %s',
                nowStep, thingId, params.hostname, tempDeployFolder, params.resourceinfoFolderPath);
            return remoteFs.syncFiles(params.hostname, params.username, params.password, tempDeployFolder, params.resourceinfoFolderPath);
        }).then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error('write resourceinfo to thing with no response'), null, errorCode.WRITE_ERROR);
            }
            fsExt.removeDir(tempDeployFolder);
            return { 'filePath': path.join(params.resourceinfoFolderPath, filename) };
        });
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

var deployCertificates = function(params, accessKey, certificateId) {
    var validCertificateType = ['clientCert', 'caCert', 'privateCert'];
    var certFileNames = [];
    var fileNamePattern = /[0-9A-Za-z_-]+.pem/g;
    var ret = { 'id': certificateId };
    var tempDeployFolder = path.resolve(localTempResourceFolder, uuidv4());
    var nowStep = '';
    return Q.resolve(true)
        .then(resp => {
            nowStep = 'getCertificateUrl';
            logger.info('step: %s, certificateId: %s', nowStep, certificateId);
            return certAPI.get(HOST_IP, API_VERSION, accessKey, certificateId)
        })
        .then(resp => {
            nowStep = 'downloadCertificate';
            logger.info('step: %s, certificateId: %s, urls: %s', nowStep, certificateId, JSON.stringify(resp));
            var downloadRequests = [];
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
                certFileNames[i] = certLocation.match(fileNamePattern)[0];
                downloadRequests.push(templateAPI.requestGet(`${HOST_IP}${certLocation}`,
                    accessKey, `get ${validCertificateType[i]} content`));
            }
            return Q.all(downloadRequests);
        }).then(results => {
            nowStep = 'writeCertFile';
            logger.info('step: %s, certificateId: %s, destination: %s', nowStep, certificateId, tempDeployFolder);
            var fileSavers = [];
            for (var i = 0; i < results.length; i++) {
                fileSavers.push(fsExt.writeBufferToFile(results[i], tempDeployFolder, certFileNames[i]));
            }
            return Q.all(fileSavers);
        }).then(resp => {
            nowStep = 'createRemoteDir';
            logger.info('step: %s, certificateId: %s, hostname: %s, dir: %s',
                nowStep, certificateId, params.hostname, params.certFolderPath);
            return remoteFs.createDir(params.hostname, params.username, params.password, params.certFolderPath);
        }).then(resp => {
            nowStep = 'syncCert';
            logger.info('step: %s, certificateId: %s, hostname: %s, source: %s, destination: %s',
                nowStep, certificateId, params.hostname, tempDeployFolder, params.certFolderPath);
            return remoteFs.syncFiles(params.hostname, params.username, params.password, tempDeployFolder, params.certFolderPath);
        }).then(resp => {
            for (var i = 0; i < validCertificateType.length; i++) {
                ret[validCertificateType[i]] = path.join(params.certFolderPath, certFileNames[i]);
            }
            fsExt.removeDir(tempDeployFolder);
            return ret;
        }).catch(err => {
            throw err;
        })
};
