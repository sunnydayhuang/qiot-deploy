var Q = require('q');

module.exports.stopContainers = function(docker, containers) {
    var task = [];
    containers.forEach(function(name) {
        task.push(stop(docker, name));
    });
    return Q.all(task);
};

module.exports.startContainers = function(docker, containers) {
    var task = [];
    containers.forEach(function(name) {
        task.push(start(docker, name));
    });
    return Q.all(task);
};

function start (docker, name) {
    return Q.promise(function(resolve, reject, notify) {
        var container = docker.getContainer(name);
        container.start(function (err, data) {
            if (err && err.statusCode === 304) {
                // 304: container already stopped
                resolve(true);
            } else if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

function stop (docker, name) {
    return Q.promise(function(resolve, reject, notify) {
        var container = docker.getContainer(name);
        container.stop(function (err, data) {
            if (err && err.statusCode === 304) {
                // 304: container already stopped
                resolve(true);
            } else if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}
