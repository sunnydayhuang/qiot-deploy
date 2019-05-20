var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var express = require('express');
var fs = require('fs');
var methodOverride = require('method-override');
var path = require('path');

var ApiSchema = require('./lib/apiSchema');
var errorCode = require('./lib/qiotError/errorCode');
var logFactory = require('./lib/logFactory');
var QiotError = require('./lib/qiotError');
var systemAdmin = require('./routes/systemAdmin');
var thingConnection = require('./routes/thingConnection');
var resourceDeploy = require('./routes/resourceDeploy');
var sampleCodeDeploy = require('./routes/sampleCodeDeploy');
var userCodeDeploy = require('./routes/userCodeDeploy');
var deviceExecution = require('./routes/deviceExecution');
var Validator = require('./lib/validator');

var app = express();
var logger = logFactory.getLogger(path.basename(__filename));
var socket = process.env.DOCKER_SOCKET || '/var/run/system-docker.sock';
var QPKG_PATH = process.env.QPKG_PATH || './';
var initialError = null;

if (process.env.NODE_ENV !== 'test') {
    // logger setting in non-test mode
    logFactory.replaceConsole();
    app.use(logFactory.express);
}

if (!fs.existsSync(socket) || !fs.statSync(socket).isSocket()) {
    initialError = new QiotError(new Error('docker socket file not found'), null, errorCode.INITIALIZE_ERROR);
    console.error('Are you sure the docker is running?');
}

// set body size limit to 50 * 1.6 MB
// because base64 encoding will make actual size larger
app.use(bodyParser.urlencoded({ limit: '80mb', extended: true }));
app.use(bodyParser.json({ limit: '80mb' }));

app.use(methodOverride());

// ## CORS middleware
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT');
        res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Origin, Origin, X-Requested-With, Campaigns-Type, Accept, Content-Type, Access-Token');
        res.send(200);
    } else {
        next();
    }
};
app.use(allowCrossDomain);

exec('chmod 755 ./bin/sshpass', function(error, stdout, stderr) {
    if (error) {
        initialError = new QiotError(error, null, errorCode.INITIALIZE_ERROR);
        console.error(error);
    }
});

app.get('/api/checkhealth', function(req, res) {
    logger.info('recieve GET checkhealth');
    if (initialError) {
        return res.status(initialError.status).json(initialError.toJson());
    }
    return res.status(200).json({
        'result': 'running'
    });
});

// Setting router
var router = express.Router();

// System Admin (Backup/Restore) APIs
router.route('/backup').post(systemAdmin.backup);
router.route('/restore').post(systemAdmin.restore);
router.route('/stopbackup').post(systemAdmin.stopBackup);
router.route('/stoprestore').post(systemAdmin.stopRestore);
router.route('/backupstat').get(systemAdmin.getBackupStat);
router.route('/restorestat').get(systemAdmin.getRestoreStat);
router.route('/backupprogress').get(systemAdmin.getBackupProgress);
router.route('/restoreprogress').get(systemAdmin.getRestoreProgress);
router.route('/runningtask').get(systemAdmin.getRunningTask);
router.route('/backupfile').get(systemAdmin.getBackupFile);
router.route('/backupfile').post(systemAdmin.postBackupFile);

// Thing Connection
router.route('/connect').post(Validator.validate(ApiSchema.connect.deviceConnect),
    thingConnection.connect);
router.route('/:thingid/connect').post(Validator.validate(ApiSchema.connect.deviceConnect),
    thingConnection.connectByIdThing);
router.route('/:thingid/connectionInfo').post(Validator.validate(ApiSchema.connect.saveConnectionInfo),
    thingConnection.saveConnectionInfo);

// Code Deploy (Sample Code)
router.route('/deploy').post(Validator.validate(ApiSchema.sampleCode.originalDeploy),
    sampleCodeDeploy.originalDeploy);
router.route('/:thingid/sampleCode').post(Validator.validate(ApiSchema.sampleCode.deploy),
    sampleCodeDeploy.deploySampleCode);
router.route('/sampleCodeType').get(sampleCodeDeploy.getSampleCodeType);

// Code Deploy (User Code)
router.route('/:thingid/functions/:functionId').put(Validator.validate(ApiSchema.userCode.createFunction),
    userCodeDeploy.createFunction);

// Resource Deploy
router.route('/:thingid/resources').post(Validator.validate(ApiSchema.resource.createResources),
    resourceDeploy.createResources);

// Device Run Command
router.route('/:thingid/execution').post(Validator.validate(ApiSchema.execution.execute), deviceExecution.execute);
router.route('/:thingid/:uid/stderr').post(Validator.validate(ApiSchema.execution.getData), deviceExecution.getStderr);
router.route('/:thingid/:uid/stdout').post(Validator.validate(ApiSchema.execution.getData), deviceExecution.getStdout);

app.use('/api', router);

// Static media middleware for function file download
app.use('/api/media', express.static(path.resolve(QPKG_PATH, 'iot', 'functions')));

// Launch server
var server = app.listen(3000);
console.log(`server start, log folder: ${path.resolve(__dirname, 'log')}`);

var gracefulShutdown = function() {
    console.log('Received kill signal, shutting down gracefully.');
    server.close(function() {
        console.log('Closed out remaining connections.');
        process.exit();
    });

    // force close connection after few secs
    setTimeout(function() {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit();
    }, 5 * 1000);
};

// listen for TERM signal
process.on('SIGTERM', gracefulShutdown);

// listen for INT signal such as Ctrl-C
process.on('SIGINT', gracefulShutdown);

module.exports = app;