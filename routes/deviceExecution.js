var path = require('path');
var errorCode = require('../lib/qiotError/errorCode');
var logFactory = require('../lib/logFactory');
var QiotError = require('../lib/qiotError');
var errorResponse = require('../lib/qiotError/errorResponse');
var remoteFs = require('../lib/remoteFs');
var remoteCommand = require('../lib/remoteCommand');
var Q = require('q');
var logger = logFactory.getLogger(path.basename(__filename));
var uuidv4 = require('uuid/v4');
var cryptograph = require('../lib/cryptograph');
var fsExt = require('../lib/fsExt/fsExt')

module.exports.execute = function(req, res) {
    var thingid = req.params.thingid;
    var command = req.body.command;
    var hostname = req.body.hostname;
    var username = req.body.username;
    var uid = uuidv4();
    var remotePath = path.resolve(`/home/${username}/bundle`);
    var commandPath = path.join(remotePath, `command_${thingid}`);
    var password;
    try {
        password = cryptograph.aesDecrypt(req.body.password, thingid);
    } catch (err) {
        password = req.body.password;
    }
    var stdoutPath;
    var stderrPath;
    if (req.body.stdout) {
        stdoutPath = `${commandPath}/stdout_${uid}.log`;
    } else {
        stdoutPath = '/dev/null';
    }
    if (req.body.stderr) {
        stderrPath = `${commandPath}/stderr_${uid}.log`;
    } else {
        stderrPath = '/dev/null';
    }
    var executeCommandShName = `command_${uid}.sh`;
    var basepath = path.resolve('.');
    var commandAgentPath = path.join(basepath, 'command');
    // var filePath;
    Q.resolve(true)
        .then(resp => {
            return fsExt.writeBufferToFile(command, commandAgentPath, executeCommandShName)
        })
        .then(resp => {
            return remoteFs.createDir(hostname, username, password, commandPath)
        })
        .then(resp => {
            return remoteFs.syncFiles(hostname, username, password, `${commandAgentPath}/${executeCommandShName}`, commandPath);
        })
        .then(resp => {
            return remoteFs.syncFiles(hostname, username, password, `${commandAgentPath}/commandAgent.sh`, commandPath);
        })
        .then(resp => {
            var cmd = `chmod a+x  ${commandPath}/${executeCommandShName} && cd ${commandPath} && sh commandAgent.sh ${uid} ${stderrPath} ${stdoutPath} &`;
            return remoteCommand.executeCommandBySShPass(hostname, username, password, cmd);
        })
        .then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error('execute command fail'), null, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            }
            var ret = {
                'result': {
                    'status': 'success execute',
                    'uid': uid
                }
            };
            res.statusCode = 200;
            res.json(ret);
            fsExt.removeDir(`${commandAgentPath}/${executeCommandShName}`);
        })
        .catch(err => {
            logger.error('device execute command fail: %s', err.message);
            var err_message = String(err.message);
            if (err_message.search('client-authentication') == -1 && err_message.search('client-socket') == -1 &&
                err_message.search('Permission denied, please try again.') == -1 && err_message.search('Name or service not known') == -1) {
                errorResponse.json(res, err, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            } else {
                errorResponse.json(res, err, errorCode.DEVICE_ERROR);
            }
            fsExt.removeDir(`${commandAgentPath}/${executeCommandShName}`);
        });
};
module.exports.getStderr = function(req, res) {
    var uid = req.params.uid;
    var thingid = req.params.thingid;
    var hostname = req.body.hostname;
    var username = req.body.username;
    var password;
    try {
        password = cryptograph.aesDecrypt(req.body.password, thingid);
    } catch (err) {
        password = req.body.password;
    }
    var remotePath = path.resolve(`/home/${username}/bundle`);
    var commandPath = path.join(remotePath, `command_${thingid}`);
    Q.resolve(true)
        .then(resp => {
            var cmd = `cat ${commandPath}/stderr_${uid}.log`;
            return remoteCommand.executeCommandBySSh2(hostname, username, password, cmd);
        })
        .then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error(`get stderr_${uid}.log content fail`), null, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            }
            resp = String(resp).split(`./command_${uid}.sh`).join(`${commandPath}/command_${uid}.sh`);
            var ret = {
                'result': {
                    'content': resp
                }
            };
            res.json(ret);
        })
        .catch(err => {
            logger.error('get stderr fail: %s', err.message);
            if (String(err.message).search('No such file or directory') !== -1) {
                errorResponse.json(res, new QiotError(err, err.message,
                    errorCode.LOG_FILE_NOT_FOUND), errorCode.LOG_FILE_NOT_FOUND);
            } else {
                errorResponse.json(res, err, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            }
        });
};
module.exports.getStdout = function(req, res) {
    var uid = req.params.uid;
    var thingid = req.params.thingid;
    var hostname = req.body.hostname;
    var username = req.body.username;
    var password;
    try {
        password = cryptograph.aesDecrypt(req.body.password, thingid);
    } catch (err) {
        password = req.body.password;
    }
    var remotePath = path.resolve(`/home/${username}/bundle`);
    var commandPath = path.join(remotePath, `command_${thingid}`);
    Q.resolve(true)
        .then(resp => {
            var cmd = `cat ${commandPath}/stdout_${uid}.log`;
            return remoteCommand.executeCommandBySSh2(hostname, username, password, cmd);
        })
        .then(resp => {
            if (typeof resp === 'undefined') {
                throw new QiotError(new Error(`get stdout_${uid}.log`), null, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            }
            resp = String(resp).split(`./command_${uid}.sh`).join(`${commandPath}/command_${uid}.sh`);
            var ret = {
                'result': {
                    'content': resp
                }
            };
            res.json(ret);
        })
        .catch(err => {
            logger.error('get stdout fail: %s', err.message);
            if (String(err.message).search('No such file or directory') !== -1) {
                errorResponse.json(res, new QiotError(err, err.message,
                    errorCode.LOG_FILE_NOT_FOUND), errorCode.LOG_FILE_NOT_FOUND);
            } else {
                errorResponse.json(res, err, errorCode.DEVICE_EXECUTE_COMMAND_ERROR);
            }
        });
};
