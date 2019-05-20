var exec = require('child_process').exec;
var fs = require('fs');
var http = require('http');
var mkdirp = require('mkdirp');
var Q = require('q');
var request = require('request');

var errorCode = require('../qiotError/errorCode');
var QiotError = require('../qiotError');

var RQUEST_TIMEOUT = 40000;

module.exports.removeDir = function(path) {
    return Q.promise(function(resolve, reject, notify) {
        exec(`rm -rf ${path}`, function(error, stdout, stderr) {
            if (error) {
                reject(error);
            } else if (stderr) {
                reject(stderr);
            } else {
                resolve(true);
            }
        })
    })
};

module.exports.removeDirs = function(paths, throwable) {
    if (!Array.isArray(paths) && typeof paths !== 'object') {
        return Q.reject(new Error('path should be an array or object'));
    } else if (!Array.isArray(paths) && typeof paths === 'object') {
        var pathArray = [];
        for (var key in paths) {
            pathArray.push(paths[key]);
        }
        paths = pathArray;
    }
    var task = [];
    paths.forEach(path => {
        task.push(exports.removeDir(path));
    })
    return Q.all(task)
        .then(resp => {
            return true;
        })
        .catch(err => {
            if (throwable) {
                throw err;
            }
            return false;
        });
};

module.exports.moveDir = function(path, destination) {
    var deferred = Q.defer();
    mkdirp(destination, function(err) {
        if (err) {
            deferred.reject(err);
        }
        exec(`mv ${path}/* ${destination}`, function(error, stdout, stderr) {
            if (error) {
                deferred.reject(error);
            } else if (stderr) {
                deferred.reject(stderr);
            } else {
                deferred.resolve(true);
            }
        })
    });
    return deferred.promise;
};

module.exports.rsyncDir = function(path, destination) {
    var deferred = Q.defer();
    mkdirp(destination, function(err) {
        if (err) {
            deferred.reject(err);
        }
        exec(`/usr/bin/rsync -av --delete ${path}/ ${destination}`, function(error, stdout, stderr) {
            if (error) {
                deferred.reject(error);
            } else if (stderr) {
                deferred.reject(stderr);
            } else {
                deferred.resolve(true);
            }
        })
    });
    return deferred.promise;
};

module.exports.copyFile = function(source, destination, throwable) {
    return Q.promise(function(resolve, reject, notify) {
        exec(`cp ${source} ${destination}`, function(error, stdout, stderr) {
            if (error || stderr) {
                if (throwable) {
                    reject(error || stderr);
                } else {
                    resolve(false);
                }
            } else {
                resolve(true);
            }
        })
    });
};

module.exports.chmod = function(path, mode, throwable) {
    var cmd = `chmod ${mode} ${path}`;
    return Q.promise(function(resolve, reject, notify) {
        exec(cmd, function(error, stdout, stderr) {
            if (error || stderr) {
                if (throwable) {
                    reject(error || stderr);
                } else {
                    resolve(false);
                }
            } else {
                resolve(true);
            }
        });
    });
}

module.exports.downloadUrlToFs = function(urls, path, accessKey, deferred) {
    var qdeferred = deferred || Q.defer();
    var url = urls.shift();
    var ret = {};
    Q.Promise(function(resolve, reject, notify) {
        mkdirp(path, function(err) {
            if (err) {
                ret = new QiotError(err, `Can't create local directory at ${path}: ${err.code}`,
                    errorCode.DOWNLOAD_CERT_ERROR);
                reject(ret);
            }
            resolve(true);
        });
    }).then(resp => {
        return Q.Promise(function(resolve, reject, notify) {
            var options = {
                headers: {
                    'Content-Type': 'text/plain; charset=UTF-8',
                    'Access-Token': accessKey
                },
                rejectUnauthorized: false,
                timeout: RQUEST_TIMEOUT
            };

            request.get(url, options, function(error, response, body) {
                if (error && error.code === 'ETIMEDOUT') {
                    ret = new QiotError(error, 'Download files error: request connection timeouts',
                        errorCode.CONN_TIMEOUT);
                    reject(ret);
                } else if (error) {
                    ret = new QiotError(error, `Download files error: ${error.code}`,
                        errorCode.DOWNLOAD_CERT_ERROR);
                    reject(ret);
                } else {
                    resolve(body);
                }
            });
        });
    }).then(
        function(resp) {
            var filename = url.split('/');
            var filepath = `${path}/${filename[filename.length - 1]}`;
            if (typeof resp === 'undefined') {
                ret = new QiotError(new Error('Write files error: empty files responsed'), null,
                    errorCode.WRITE_ERROR);
                qdeferred.reject(ret);
            }
            fs.writeFile(filepath, Buffer.from(resp, 'utf8'), function(err) {
                if (err) {
                    ret = new QiotError(err, `Write files error: On WriteFile ${err.message}`,
                        errorCode.WRITE_ERROR);
                    qdeferred.reject(ret);
                }
                if (urls.length > 0) {
                    exports.downloadUrlToFs(urls, path, accessKey, qdeferred);
                } else {
                    ret = {
                        'result': {
                            'status': 'OK'
                        }
                    };
                    qdeferred.resolve(ret);
                }
            });
        },
        function (err) {
            qdeferred.reject(err);
        }
    );
    return qdeferred.promise;
};

module.exports.downloadFile = function(url, dest) {
    var deferred = Q.defer();
    var file = fs.createWriteStream(dest);
    http.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(); // close() is async, call cb after close completes.
            deferred.resolve(true);
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        deferred.reject(err);
    });
    return deferred.promise;
};

module.exports.writeJsonFile = function(content, folderPath, fileName) {
    var deferred = Q.defer();
    mkdirp(folderPath, function(err) {
        if (err) {
            var ret = new QiotError(err, `create directory ${folderPath} error: ${err.message}`,
                errorCode.WRITE_ERROR);
            deferred.reject(ret);
        }
        if (typeof content === 'object') {
            content = JSON.stringify(content);
        }
        fs.writeFile(`${folderPath}/${fileName}`, content, function(err, data) {
            var ret;
            if (err) {
                ret = new QiotError(err, `write json file exception: ${err.message}`,
                    errorCode.WRITE_ERROR);
                deferred.reject(ret);
            } else {
                ret = {
                    'result': {
                        'status': 'OK',
                        'method': 'write json file'
                    }
                };
                deferred.resolve(ret);
            }
        });
    });
    return deferred.promise;
}

module.exports.writeBufferToFile = function(buffer, folderPath, fileName) {
    var deferred = Q.defer();
    mkdirp(folderPath, function(err) {
        if (err) {
            var ret = new QiotError(err, `create directory ${folderPath} error: ${err.message}`,
                errorCode.WRITE_ERROR);
            deferred.reject(ret);
        }
        fs.writeFile(`${folderPath}/${fileName}`, buffer, function(err, data) {
            var ret;
            if (err) {
                ret = new QiotError(err, `write file exception: ${err.message}`,
                    errorCode.WRITE_ERROR);
                deferred.reject(ret);
            } else {
                deferred.resolve(true);
            }
        });
    });
    return deferred.promise;
}
