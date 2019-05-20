var Docker = require('dockerode');
var fs = require('fs');
var path = require('path');
var Q = require('q');
var spawn = require('child_process').spawn;

var container = require('../lib/container');
var fsExt = require('../lib/fsExt');
var logFactory = require('../lib/logFactory');
var zipper = require('../lib/zipper');

var logger = logFactory.getLogger(path.basename(__filename));
var qiotDeployRootPath = '/usr/local/lib/node_modules/qiot-deploy';
var uploadedFileLocation = path.resolve(qiotDeployRootPath, 'upload', 'qiot.zip');
var exportedBackupPath = path.resolve(qiotDeployRootPath, 'qiot.zip');
var containers = ['qiot-node-red', 'qiot-ponte', 'qiot-parse', 'qiot-dmm', 'qiot-redis', 'qiot-kong', 'qiot-mongo'];
var socket = process.env.DOCKER_SOCKET || '/var/run/system-docker.sock';
var docker = new Docker({ socketPath: socket });
var tempFolder = path.resolve(qiotDeployRootPath, 'temp');
var QPKG_PATH = process.env.QPKG_PATH;
var qiotDataFolder = {
    'iot': QPKG_PATH + '/iot',
    'qiot-node-red': QPKG_PATH + '/qiot-node-red'
};

var backupTask = null;
var restoreTask = null;
var backupError = null;
var restoreError = null;

module.exports.restore = function(req, res) {
    logger.info('recieve POST restore');
    var ret = {};
    if (backupTask || restoreTask) {
        ret = {
            'error': [{
                'message': 'backup/restore process is in progress'
            }]
        };
        return res.status(400).json(ret);
    }
    if (fs.existsSync(`${qiotDeployRootPath}/restorefinish`)) {
        fs.unlinkSync(`${qiotDeployRootPath}/restorefinish`);
    }
    restoreError = null;

    if (!fs.existsSync(uploadedFileLocation)) {
        ret = {
            'error': [{
                'message': 'uploaded backup zip file not found'
            }]
        };
        return res.status(400).send(ret);
    }
    zipper.resetUnzipProgress(true);

    restoreTask = spawn('node', [`${qiotDeployRootPath}/restore.js`]);
    restoreTask.on('close', code => {
        if (code) {
            code = code.toString().replace(/\n/g, '');
        }
        if (restoreTask != null && !restoreTask.killed) {
            restoreTask = null;
        }
        logger.info(`restoreTask ended, code: ${code}`);
    });

    restoreTask.stdout.on('data', (data) => {
        data = data.toString().replace(/\n/g, '');
        logger.info(`restoreTask stdout: ${data}`);
    });

    restoreTask.stderr.on('data', (error) => {
        error = error.toString().replace(/\n/g, '');
        logger.error(`restoreTask stderr: ${error}`);
        var pattern = /^node\[[0-9].*\]: pthread_create.*$/;
        if (!pattern.test(error)) {
            restoreError = error.toString().replace(/\n/g, '');
        }
    });

    res.status(200).send({
        'result': {
            'status': 'restore process initiated'
        }
    });
};

module.exports.backup = function(req, res) {
    logger.info('recieve POST backup');
    if (backupTask || restoreTask) {
        var ret = {
            'error': [{
                'message': 'backup/restore process is in progress'
            }]
        };
        return res.status(400).json(ret);
    }
    backupError = null;
    if (fs.existsSync(`${qiotDeployRootPath}/backupfinish`)) {
        fs.unlinkSync(`${qiotDeployRootPath}/backupfinish`);
    }
    zipper.resetZipProgress(true);

    backupTask = spawn('node', [`${qiotDeployRootPath}/backup.js`]);
    backupTask.on('close', code => {
        if (code) {
            code = code.toString().replace(/\n/g, '');
        }
        if (backupTask != null && !backupTask.killed) {
            backupTask = null;
        }
        logger.info(`backupTask ended, code: ${code}`);
    });

    backupTask.stdout.on('data', (data) => {
        data = data.toString().replace(/\n/g, '');
        logger.info(`backupTask stdout: ${data}`);
    });

    backupTask.stderr.on('data', (error) => {
        error = error.toString().replace(/\n/g, '');
        logger.error(`backupTask stderr: ${error}`);
        var pattern = /^node\[[0-9].*\]: pthread_create.*$/;
        if (!pattern.test(error)) {
            backupError = error.toString().replace(/\n/g, '');
        }
    });

    res.status(200).send({
        'result': {
            'status': 'backup process initiated'
        }
    });
};

module.exports.stopBackup = function(req, res) {
    logger.info('recieve POST stopbackup');
    if (!backupTask) {
        var ret = {
            'error': [{
                'message': 'backup process is finished or not initiated'
            }]
        };
        return res.status(400).json(ret);
    }
    if (fs.existsSync(`${qiotDeployRootPath}/backupfinish`)) {
        fs.unlinkSync(`${qiotDeployRootPath}/backupfinish`);
    }
    if (fs.existsSync(exportedBackupPath)) {
        fs.unlinkSync(exportedBackupPath);
    }
    try {
        if (backupTask) {
            backupTask.kill('SIGTERM');
        }
        zipper.resetZipProgress(true);
    } catch (err) {
        logger.error('abort backup task error: ' + err.message);
    }

    Q.delay(1000)
        .then(resp => {
            logger.info('start containers:', JSON.stringify(containers));
            return container.startContainers(docker, containers);
        })
        .then(resp => {
            backupTask = null;
            res.status(200).send({
                'result': {
                    'status': 'backup process terminated'
                }
            });
        })
        .catch(err => {
            backupTask = null;
            res.status(400).send({
                'error': [{
                    'message': 'start container error: ' + err.message
                }]
            });
        })
};

module.exports.stopRestore = function(req, res) {
    logger.info('recieve POST stoprestore');
    if (!restoreTask) {
        var ret = {
            'error': [{
                'message': 'restore process is finished or not initiated'
            }]
        };
        return res.status(400).json(ret);
    }
    if (fs.existsSync(`${qiotDeployRootPath}/restorefinish`)) {
        fs.unlinkSync(`${qiotDeployRootPath}/restorefinish`);
    }
    try {
        if (restoreTask) {
            restoreTask.kill('SIGTERM');
        }
        zipper.resetUnzipProgress(true);
    } catch (err) {
        logger.error('abort restore task error: ' + err.message);
    }

    var recoverData;
    if (fs.existsSync(tempFolder)) {
        logger.info('stop containers:', JSON.stringify(containers));
        recoverData = container.stopContainers(docker, containers)
            .then(resp => {
                logger.info('remove qiot data');
                return fsExt.removeDirs(qiotDataFolder);
            })
            .then(resp => {
                logger.info('recover qiot data from temp');
                return fsExt.moveDir(tempFolder, QPKG_PATH);
            });
    } else {
        recoverData = Q.delay(1000);
    }

    recoverData
        .then(resp => {
            logger.info('start containers:', JSON.stringify(containers));
            return container.startContainers(docker, containers);
        })
        .then(resp => {
            restoreTask = null;
            res.status(200).send({
                'result': {
                    'status': 'restore process terminated'
                }
            });
        })
        .catch(err => {
            restoreTask = null;
            res.status(200).send({
                'error': [{
                    'message': 'start container error: ' + err.message
                }]
            });
        })
};

module.exports.getBackupStat = function(req, res) {
    logger.info('recieve GET backupstat');
    var ret = {};
    if (fs.existsSync(`${qiotDeployRootPath}/backupfinish`)) {
        ret = {
            'result': {
                'status': 'backup status is finished'
            }
        };
        fs.unlinkSync(`${qiotDeployRootPath}/backupfinish`);
        ret = {
            'result': {
                'status': 'backup status is finished'
            }
        };
        res.status(200).json(ret);
    } else {
        ret = {
            'error': [{
                'message': 'backup status is not finished'
            }]
        };
        res.status(400).json(ret);
    }
};

module.exports.getRestoreStat = function(req, res) {
    logger.info('recieve GET restorestat');
    var ret = {};
    if (fs.existsSync(`${qiotDeployRootPath}/restorefinish`)) {
        ret = {
            'result': {
                'status': 'restore status is finished'
            }
        };
        fs.unlinkSync(`${qiotDeployRootPath}/restorefinish`);
        ret = {
            'result': {
                'status': 'restore status is finished'
            }
        };
        res.status(200).json(ret);
    } else {
        ret = {
            'error': [{
                'message': 'restore status is not finished'
            }]
        };
        res.status(400).json(ret);
    }
};

module.exports.getBackupProgress = function(req, res) {
    logger.info('recieve GET backupprogress');
    var ret = {
        'result': {
            'progress': zipper.getZipProgress(true)
        }
    };
    if (backupError) {
        ret = {
            'error': [{
                'message': backupError
            }]
        };
        res.status(400).json(ret);
    } else {
        res.status(200).json(ret);
    }
};

module.exports.getRestoreProgress = function(req, res) {
    logger.info('recieve GET restoreprogress');
    var ret = {
        'result': {
            'progress': zipper.getUnzipProgress(true)
        }
    };
    if (restoreError) {
        ret = {
            'error': [{
                'message': restoreError
            }]
        };
        res.status(400).json(ret);
    } else {
        res.status(200).json(ret);
    }
};

module.exports.getRunningTask = function(req, res) {
    logger.info('recieve GET runningtask');
    if (backupTask != null) {
        res.status(200).json({ 'result': 'backup task is running' });
    } else if (restoreTask != null) {
        res.status(200).json({ 'result': 'restore task is running' });
    } else {
        res.status(400).json({
            'error': [{
                'message': 'backup/restore task is not running'
            }]
        });
    }
};

module.exports.getBackupFile = function(req, res) {
    logger.info('recieve GET backupfile request');
    if (fs.existsSync(exportedBackupPath)) {
        logger.info('start to download backup file: qiot.zip');
        var stat = fs.statSync(exportedBackupPath);
        res.attachment(exportedBackupPath);
        res.writeHeader(200, { 'Content-Length': stat.size });
        var fReadStream = fs.createReadStream(exportedBackupPath);
        fReadStream.pipe(res);
    } else {
        var ret = {
            'error': [{
                'message': 'backup status is not finished'
            }]
        };
        res.status(400).json(ret);
    }
};

module.exports.postBackupFile = function(req, res) {
    logger.info('recieve POST backupfile request');
    if (req.headers['content-length'] === '0') {
        var ret = {
            'error': [{
                'message': 'payload can not be empty'
            }]
        };
        return res.status(400).json(ret);
    }

    var writeStream = fs.createWriteStream('./upload/qiot.zip');
    req.pipe(writeStream);
    req.on('end', function() {
        logger.info('uploadbackupfile finish');
        var ret = {
            'result': {
                'status': 'uploaded'
            }
        };
        res.status(200).json(ret);
    });

    writeStream.on('error', function(err) {
        var ret = {
            'error': [{
                'message': 'upload file error: ' + err.message
            }]
        };
        res.status(400).json(ret);
    });
};
