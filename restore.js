var Docker = require('dockerode');
var fs = require('fs');
var mv = require('mv');
var path = require('path');
var Q = require('q');
var rimraf = require('rimraf');

var container = require('./lib/container');
var fsExt = require('./lib/fsExt');
var zipper = require('./lib/zipper');

var QPKG_PATH = process.env.QPKG_PATH;
var socket = process.env.DOCKER_SOCKET || '/var/run/system-docker.sock';
var stats = fs.statSync(socket);
if (!stats.isSocket()) {
    throw new Error('Are you sure the docker is running?');
}
var docker = new Docker({ socketPath: socket });
var containers = ['qiot-node-red', 'qiot-ponte', 'qiot-parse', 'qiot-dmm', 'qiot-redis', 'qiot-kong', 'qiot-mongo'];
var qiotDataFolder = {
    // 'iot': QPKG_PATH + '/iot',
    'apache-conf': QPKG_PATH + '/iot/apache-conf',
    'apache2': QPKG_PATH + '/iot/apache2',
    'cert': QPKG_PATH + '/iot/cert',
    'db': QPKG_PATH + '/iot/db',
    'kong': QPKG_PATH + '/iot/kong',
    'qrule': QPKG_PATH + '/iot/qrule',
    'redis': QPKG_PATH + '/iot/qrule',
    // 'qiot-node-red': QPKG_PATH + '/qiot-node-red'
    'config': QPKG_PATH + '/qiot-node-red/config'
};
var qiotDeployRootPath = '/usr/local/lib/node_modules/qiot-deploy';
var uploadedFileLocation = path.resolve(qiotDeployRootPath, 'upload', 'qiot.zip');
var tempFolder = path.resolve(qiotDeployRootPath, 'temp');
var rmDir = Q.denodeify(rimraf);
var moveDir = Q.denodeify(mv);

zipper.validateZipFormat(uploadedFileLocation)
    .then(resp => {
        if (fs.existsSync(tempFolder)) {
            console.log('remove temp folder');
            return rmDir(tempFolder);
        } else {
            return Q.resolve(true);
        }
    })
    .then(resp => {
        console.log('stop containers:', containers);
        return container.stopContainers(docker, containers);
    })
    .then(resp => {
        var task = [];
        console.log('move qiot data to temp folder');
        for (name in qiotDataFolder) {
            task.push(moveDir(qiotDataFolder[name], `${tempFolder}/${name}`, {mkdirp: true}));
        }
        return Q.all(task)
            .catch(err => {
                console.log('move qiot data to temp error:', err.message);
                return Q.resolve(true);  // skip move error
            });
    })
    .then(resp => {
        console.log(`unzip file from ${uploadedFileLocation} to ${QPKG_PATH}/iot`);
        return zipper.unzip(uploadedFileLocation, `${QPKG_PATH}/iot`);
    })
    .then(resp => {
        console.log(`move /iot/config to ${QPKG_PATH}/qiot-node-red/config`);
        rmDir(`${QPKG_PATH}/qiot-node-red/config`);
        // return fsExt.chmod(`${QPKG_PATH}/iot/initscript/*.sh`, 'a+x', true);
        return moveDir(`${QPKG_PATH}/iot/config`, `${QPKG_PATH}/qiot-node-red/config`, {mkdirp: true});
    })
    .then(resp => {
        console.log('start containers:', containers);
        return container.startContainers(docker, containers);
    })
    .then(resp => {
        console.log('create restorefinish file');
        fs.closeSync(fs.openSync(`${qiotDeployRootPath}/restorefinish`, 'w'));
        if (fs.existsSync(uploadedFileLocation)) {
            // remove uploaded backup file
            fs.unlinkSync(uploadedFileLocation);
        }
        rmDir(tempFolder);
        var ret = {
            'result': {
                'status': 'restore is finished'
            }
        };
        console.log(ret);
    })
    .catch(err => {
        console.error('restore failed:', err.message);
        // revert restore process
        var recoverFolder;
        if (fs.existsSync(tempFolder)) {
            recoverFolder = moveDir(tempFolder, QPKG_PATH, {clobber: false});
        } else {
            recoverFolder = Q.resolve(true);
        }
        recoverFolder
            .then(resp => {
                return container.startContainers(docker, containers);
            })
            .catch(err => {
                console.error('revert restore failed:', err.message);
            })
    })
