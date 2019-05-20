var child_process = require('child_process');
var Client = require('ssh2').Client;
var fs = require('fs');
var Q = require('q');

var sshPass = './bin/sshpass';
var scpErrorMsgPattern = /scp:\s(.+)/;

exports.syncFiles = function(hostname, username, password, source, destination) {
    var cmd;
    return lstat(source)
        .then(resp => {
            var isDirectory = resp.isDirectory();
            var sourcePath = (isDirectory) ? `${source}/*` : source;
            cmd = `${sshPass} -p ${password} scp -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ` +
                `-r ${sourcePath} ${username}@${hostname}:${destination}`;
            return exec(cmd);
        })
        .then(resp => {
            return {
                'status': 'File sync succeed',
                'destination': destination
            };
        })
        .catch(err => {
            var message;
            if (err.killed) {
                message = 'Execution timeout';
            } else if (err.code !== 0 && err.message && err.message.match(scpErrorMsgPattern)) {
                message = err.message.match(scpErrorMsgPattern)[1];
            } else {
                message = err.message.replace(cmd, '');
            }
            throw new Error(message);
        });
};

exports.createDir = function(hostname, username, password, folderPath) {
    var deferred = Q.defer();
    var conn = new Client();
    conn.on('ready', function() {
        conn.exec(`mkdir -p ${folderPath}`, function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
                if (code === 0) {
                    deferred.resolve({
                        'status': 'Directory created'
                    });
                }
                conn.end();
            }).on('data', function(data) {
            }).stderr.on('data', function(data) {
                deferred.reject(new Error(data.toString()));
                conn.end();
            });
        });
    }).on('error', function(err) {
        deferred.reject(new Error(err.level));
    }).connect({
        host: hostname,
        username: username,
        password: password,
        port: 22
    });
    return deferred.promise;
};

exports.createFile = function(hostname, username, password, folderPath, filename, content) {
    if (folderPath && folderPath !== '/') {
        folderPath = folderPath.replace(/\/+$/g, '');
    }
    if (typeof content === 'object') {
        content = JSON.stringify(content);
    }
    return exports.createDir(hostname, username, password, folderPath)
        .then((resp) => {
            return createFileBySSH(hostname, username, password, `${folderPath}/${filename}`, content);
        })
        .then((resp) => {
            return { 'filePath': `${folderPath}/${filename}` };
        })
        .catch((err) => {
            throw err;
        })
};

var createFileBySSH = function(hostname, username, password, path, content) {
    var deferred = Q.defer();
    var conn = new Client();
    conn.on('ready', function() {
        conn.exec(`echo '${content}' > ${path}`, function(err, stream) {
            if (err) throw err;
            stream.on('close', function(code, signal) {
                if (code === 0) {
                    deferred.resolve(true);
                }
                conn.end();
            }).on('data', function(data) {
            }).stderr.on('data', function(data) {
                deferred.reject(new Error(data.toString()));
                conn.end();
            });
        });
    }).on('error', function(err) {
        deferred.reject(new Error(err.level));
    }).connect({
        host: hostname,
        username: username,
        password: password,
        port: 22
    });
    return deferred.promise;
};

var lstat = function(source) {
    return Q.promise(function(resolve, reject, notify) {
        fs.lstat(source, function(err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
};

var exec = function(cmd) {
    return Q.promise(function(resolve, reject, notify) {
        child_process.exec(cmd, function(error, stdout, stderr) {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        })
    });
};
