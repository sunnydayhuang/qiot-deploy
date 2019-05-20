var Q = require('q');
var path = require('path');
var QiotError = require('../qiotError');
var logFactory = require('../logFactory');
var logger = logFactory.getLogger(path.basename(__filename));
var errorCode = require('../qiotError/errorCode');
var sshPass = './bin/sshpass';
var process = require('child_process');
var Client = require('ssh2').Client;

// connect device and execute command by sshpass
exports.executeCommandBySShPass = function(hostname, username, password, cmd) {
    cmd = `${sshPass} -p ${password} ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ` +
        `-t  ${username}@${hostname} "${cmd}"`;
    logger.debug('executeCommandBySShPass command:' + cmd);
    var deferred = Q.defer();
    exec(cmd)
        .then(resp => {
            logger.debug('execute device command by sshpass success:' + resp);
            deferred.resolve(resp);
        })
        .catch(err => {
            logger.debug('execute device command error by sshpass:' + err.message);
            deferred.reject(err);
        });
    return deferred.promise;
};

// connect device and execute by ssh2 module
exports.executeCommandBySSh2 = function(hostname, username, password, cmd) {
    logger.debug('ssh to device, hostname: %s, username: %s', hostname, username);
    var deferred = Q.defer();
    var ret = {};
    var conn = new Client();
    var stdout = '';
    var stderr = '';
    testConnection(hostname, username, password, conn).then(
        function(val) {
            logger.debug(`executeCommandBySSh2 command:${cmd}`);
            conn.exec(cmd, function(err, stream) {
                if (err) {
                    ret = new QiotError(err, err.message,
                        errorCode.DEVICE_ERROR);
                    conn.close();
                    deferred.reject(ret);
                } else {
                    stream.on('close', function(code, signal) {
                        conn.end();
                        if (stdout !== '') {
                            deferred.resolve(stdout);
                        } else if (stderr !== '') {
                            logger.debug(`executeCommandBySSh2 command result :${stderr}`);
                            ret = new QiotError(err, stderr, errorCode.DEVICE_ERROR);
                            deferred.reject(ret);
                        } else {
                            deferred.resolve(` `);
                        }
                    }).on('data', function(data) {
                        stdout = stdout + data.toString('utf8');
                    }).stderr.on('data', function(data) {
                        stderr = stderr + data.toString('utf8');
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
var exec = function(cmd, option) {
    var deferred = Q.defer();
    process.exec(cmd, option, function(error, stdout, stderr) {
        if (error) {
            logger.debug(`exec ${cmd} error=> ${error}`);
            deferred.reject(error);
        } else {
            logger.debug(`exec ${cmd} stdout=> ${stdout}`);
            logger.debug(`exec ${cmd} stderr=> ${stderr}`);
            deferred.resolve(stdout);
        }
    });
    return deferred.promise;
};
var testConnection = function(hostname, username, password, conn) {
    var deferred = Q.defer();
    var ret = {};
    conn.on('ready', function() {
        ret.result = {};
        ret.status = 'connected';
        logger.debug('sshClient ready, ret:', JSON.stringify(ret));
        deferred.resolve(ret);
    }).on('error', function(err) {
        logger.debug('testConnection failed, err:%s', err.message);
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
