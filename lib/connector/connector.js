var Q = require('q');
var Client = require('ssh2').Client;

var errorCode = require('../qiotError/errorCode');
var QiotError = require('../qiotError');

module.exports.testConnectSSH = function(hostname, username, password) {
    var conn = new Client();
    var deferred = Q.defer();
    conn.on('ready', function() {
        conn.end();
        deferred.resolve({ 'status': 'connected' });
    }).on('error', function(err) {
        conn.end();
        deferred.reject(new QiotError(err, err.level, errorCode.DEVICE_ERROR));
    }).connect({
        host: hostname,
        username: username,
        password: password,
        port: 22
    });
    return deferred.promise;
};
