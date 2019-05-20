var container = require('./lib/container');
var Docker = require('dockerode');
var fs = require('fs');
var path = require('path');
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
var exportedBackupPath = path.resolve(qiotDeployRootPath, 'qiot.zip');

console.log('stop containers:', containers);
container.stopContainers(docker, containers)
    .then(resp => {
        console.log('zip qiot data to', exportedBackupPath);
        return zipper.zip(qiotDataFolder, exportedBackupPath);
    })
    .then(resp => {
        console.log(resp);
        console.log('start containers:', containers);
        return container.startContainers(docker, containers);
    })
    .then(resp => {
        console.log('create backupfinish file');
        fs.closeSync(fs.openSync(`${qiotDeployRootPath}/backupfinish`, 'w'));
        var ret = {
            'result': {
                'status': 'backup is finished'
            }
        };
        console.log(ret);
    })
    .catch(err => {
        console.error(err.message);
        if (fs.existsSync(exportedBackupPath)) {
            fs.unlinkSync(exportedBackupPath);
        }
        container.startContainers(docker, containers);
    })
