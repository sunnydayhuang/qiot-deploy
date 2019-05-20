var log4js = require('log4js');
var path = require('path');

var configPath = path.resolve(__dirname, '..', 'config', 'log4js.json');
try {
    log4js.configure(configPath);
} catch (ex) {
    console.error('load log4js config failed:', ex.message);
    log4js.configure({
        'appenders': {
            'stdout': {
                'type': 'stdout',
                'layout': {
                    'type': 'basic'
                }
            }
        },
        'categories': {
            'default': {
                'appenders': ['stdout'],
                'level': 'DEBUG'
            }
        }
    });
}

module.exports = {
    express: log4js.connectLogger(log4js.getLogger('http'), {
        level: log4js.levels.INFO,
        format: ":req[host] :remote-addr \":user-agent\" \":method :url HTTP/:http-version\" \":referrer\" :response-time :status :content-length"
    }),
    replaceConsole: function() {
        var logger = log4js.getLogger('console');
        console.log = logger.info.bind(logger);
        console.error = logger.error.bind(logger);
    },
    useTest: function() {
        var configPath = path.resolve(__dirname, '..', 'config', 'test-log4js.json');
        log4js.configure(configPath);
    },
    getLogger: function(category) {
        if (process.env.NODE_ENV === 'test') {
            module.exports.useTest();
        }
        return log4js.getLogger(category);
    },
    hideLogMessage: function(key, value) {
        // filtering out private properties
        if (key === 'password' || key === 'zipFile') {
            return undefined;
        }
        return value;
    }
};