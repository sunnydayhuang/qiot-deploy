var AdmZip = require('adm-zip');
var archiver = require('archiver');
var async = require('async');
var Cache = require('node-shared-cache').Cache;
var DecompressZip = require('decompress-zip');
var fs = require('fs');
var Q = require('q');

var progressCache = new Cache('progress', 524288);
var zipProgress = -1;
var unzipProgress = -1;

module.exports.zip = function(sources, destination) {
    return Q.resolve(true)
        .then(resp => {
            var paths = [];
            for (var key in sources) {
                paths.push(sources[key]);
            }
            return getDirectoriesTotalSize(paths);
        })
        .then(resp => {
            return archive(sources, destination, resp);
        })
        .catch(err => {
            throw err;
        });
};

module.exports.getZipProgress = function(cache) {
    var progress = zipProgress;
    if (cache) {
        progress = progressCache.zipProgress || -1;
    }
    if (progress > 100) {
        progress = 100;
    }
    return progress;
};

module.exports.resetZipProgress = function(cache) {
    zipProgress = -1;
    if (cache) {
        progressCache.zipProgress = -1;
    }
};

module.exports.validateZipFormat = function(zipFilePath) {
    try {
        // validate the zip format
        var zip = new AdmZip(zipFilePath);
        zip.getEntries();
        return Q.resolve(true);
    } catch (ex) {
        return Q.reject(new Error(`Invalid zip format: ${ex}`));
    }
}

module.exports.unzip = function(zipFilePath, destination) {
    return Q.promise(function(resolve, reject, notify) {
        var unzipper = new DecompressZip(zipFilePath);
        unzipper.on('error', function (err) {
            reject(err);
        });

        unzipper.on('extract', function (log) {
            resolve(true);
        });

        unzipper.on('progress', function (fileIndex, fileCount) {
            unzipProgress = 100 - ((fileCount - (fileIndex + 1)) / fileCount) * 100;
            unzipProgress = Math.round(unzipProgress);
            progressCache.unzipProgress = unzipProgress;
        });
        unzipper.extract({
            path: destination
        });
    });
};

module.exports.getUnzipProgress = function(cache) {
    var progress = unzipProgress;
    if (cache) {
        progress = progressCache.unzipProgress || -1;
    }
    if (progress > 100) {
        progress = 100;
    }
    return progress;
};

module.exports.resetUnzipProgress = function(cache) {
    unzipProgress = -1;
    if (cache) {
        progressCache.unzipProgress = -1;
    }
};

function archive (sources, destination, totalSize) {
    return Q.promise(function(resolve, reject, notify) {
        var archive = archiver('zip');
        var output = fs.createWriteStream(destination);

        archive.on('error', function(err) {
            reject(err);
        });

        archive.on('end', function() {
            zipProgress = 100;
            progressCache.zipProgress = zipProgress;
            var bytes = archive.pointer();
            resolve(`Archive finish, wrote ${bytes} bytes, destination: ${destination}`);
        });

        archive.on('progress', function(progress) {
            zipProgress = 100 - ((totalSize - progress.fs.processedBytes) / totalSize) * 100;
            zipProgress = Math.round(zipProgress);
            progressCache.zipProgress = zipProgress;
        });

        archive.pipe(output);

        for (var name in sources) {
            archive.directory(sources[name], name);
        }
        archive.finalize();
    });
}

function getDirectoriesTotalSize (paths) {
    var task = [];
    var totalSize = 0;
    for (var i = 0; i < paths.length; i++) {
        var getDirSizeTask = Q.promise(function(resolve, reject, notify) {
            directorySize(paths[i], function(err, totalSize) {
                if (err) {
                    reject(err);
                } else {
                    resolve(totalSize);
                }
            })
        });
        task.push(getDirSizeTask);
    }
    return Q.all(task)
        .then(results => {
            results.forEach(result => {
                totalSize = totalSize + result;
            })
            return totalSize;
        })
        .catch(err => {
            throw err;
        });
}

function directorySize (path, cb, size) {
    if (size === undefined) {
        size = 0;
    }

    fs.stat(path, function(err, stat) {
        if (err) {
            cb(err);
            return;
        }

        size += stat.size;

        if (!stat.isDirectory()) {
            cb(null, size);
            return;
        }

        fs.readdir(path, function(err, paths) {
            if (err) {
                cb(err);
                return;
            }

            async.map(paths.map(function(p) { return path + '/' + p }), directorySize, function(err, sizes) {
                size += sizes.reduce(function(a, b) { return a + b }, 0);
                cb(err, size);
            })
        });
    });
}
