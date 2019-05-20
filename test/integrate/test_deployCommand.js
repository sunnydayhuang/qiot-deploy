process.env.NODE_ENV = 'test';
if (typeof process.env.KONG_URI === 'undefined') {
    process.env.KONG_URI = '172.17.28.252:8080/qiotapp';
}

var assert = require('assert');
var request = require('supertest');
var Q = require('q');

var app = require('../../server.js');
var appAPI = require('../../lib/qiotMgt/app');
var errorCode = require('../../lib/qiotError/errorCode');
var errorBodyChecker = require('../utils/errorBodyChecker');
var thingAPI = require('../../lib/qiotMgt/thing');
var userAPI = require('../../lib/qiotMgt/user');

var appid;
var thingId;
var uid;
var version = 'v1';
var accessKey = 'accessKey';
var qiotLoginName = 'admin';
var qiotLoginPwd = '1234qwer';
var hostname = '172.17.28.252';
var username = 'admin';
var password = '1234qwer';
var HOST_IP = `http://${process.env.KONG_URI}`;
var recoverAfterTest = true;

describe('Device command execution', function() {
    this.timeout(40000);
    before(function(done) {
        // login first and create app, thing
        userAPI.login(HOST_IP, version, qiotLoginName, Buffer.from(qiotLoginPwd).toString('base64'))
            .then((resp) => {
                accessKey = resp.result.access_token;
                return Q.promise(function(resolve, reject, notify) {
                    setTimeout(function() {
                        resolve(appAPI.create(HOST_IP, version, accessKey,
                            'integrate-test-' + new Date().toISOString().replace(/T|Z|:|\.|-/g, '')));
                    }, 10000);
                });
            })
            .then((resp) => {
                appid = resp.result.id;
                return Q.promise(function(resolve, reject, notify) {
                    setTimeout(function() {
                        resolve(thingAPI.create(HOST_IP, version, accessKey, appid,
                            'integratetest' + new Date().toISOString().replace(/T|Z|:|\.|-/g, '')));
                    }, 5000);
                });
            })
            .then((resp) => {
                thingId = resp.result.thingId;
                return thingAPI.createResource(HOST_IP, version, accessKey, thingId, 'temp');
            })
            .then((resp) => {
                done();
            })
            .catch((err) => {
                done(err);
            });
    });
    // exe command
    describe('POST /v1/deploy/{thingId}/execution', function() {
        describe('Upload command and execute by SSHPASS', function() {
            it('should respond 200 with json', function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'command': 'abcderg\ncd /home/admin/bundle\nnode mqtt.js',
                    'stdout': true,
                    'stderr': true
                };
                request(app)
                    .post(`/api/${thingId}/execution`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.status, 'undefined', 'res body should contain status');
                        assert.notEqual(typeof res.body.result.uid, 'undefined', 'res body should contain uid');
                        assert.equal(res.body.result.status, 'success execute', 'res body status should be "success execute"');
                        uid = res.body.result.uid;
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Upload command and execute by SSHPASS  w/ bad hostname', function() {
            it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': 'badhostname',
                    'username': username,
                    'password': password,
                    'command': 'abcderg\ncd /home/admin/bundle\nnode mqtt.js',
                    'stdout': true,
                    'stderr': true
                };
                request(app)
                    .post(`/api/${thingId}/execution`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.DEVICE_ERROR);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Upload command and execute by SSHPASS w/o requestBody', function() {
            it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {};
                request(app)
                    .post(`/api/${thingId}/execution`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.INVALID_BODY);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
    });
    // get stderr
    describe('POST /v1/deploy/{thingId}/{uid}/stderr', function() {
        describe('Get stderr content ', function() {
            it('should respond 200 with json', function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${uid}/stderr`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.content, 'undefined', 'res body should contain status');
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stderr content w/ bad hostname', function() {
            it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': 'badhostname',
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${uid}/stderr`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.DEVICE_ERROR);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stderr content w/o requestBody', function() {
            it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {};
                request(app)
                    .post(`/api/${thingId}/${uid}/stderr`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.INVALID_BODY);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stderr content invalid uid', function() {
            it(`should respond ${errorCode.LOG_FILE_NOT_FOUND.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${Math.random()}/stderr`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.LOG_FILE_NOT_FOUND);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stderr content invalid thingid', function() {
            it(`should respond ${errorCode.LOG_FILE_NOT_FOUND.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${Math.random()}/${uid}/stderr`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.LOG_FILE_NOT_FOUND);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
    });
    // get stdout
    describe('POST /v1/deploy/{thingId}/{uid}/stdout', function() {
        describe('Get stdout content ', function() {
            it('should respond 200 with json', function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${uid}/stdout`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.content, 'undefined', 'res body should contain status');
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });

        describe('Get stdout content w/ bad hostname', function() {
            it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': 'badhostname',
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${uid}/stdout`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.DEVICE_ERROR);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stdout content w/o requestBody', function() {
            it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {};
                request(app)
                    .post(`/api/${thingId}/${uid}/stdout`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.INVALID_BODY);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stdout content invalid uid', function() {
            it(`should respond ${errorCode.LOG_FILE_NOT_FOUND.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${thingId}/${Math.random()}/stdout`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.LOG_FILE_NOT_FOUND);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
        describe('Get stdout content invalid thingid', function() {
            it(`should respond ${errorCode.LOG_FILE_NOT_FOUND.status} with json`, function(done) {
                this.timeout(60000);
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password
                };
                request(app)
                    .post(`/api/${Math.random()}/${uid}/stdout`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.LOG_FILE_NOT_FOUND);
                    })
                    .end(function(err, res) {
                        if (err) {
                            done(err);
                        } else {
                            done();
                        }
                    });
            });
        });
    });
    after(function(done) {
        if (!appid || !recoverAfterTest) {
            done();
        } else {
            // remove app, thing and created function
            appAPI.remove(HOST_IP, version, accessKey, appid)
                .then((resp) => {
                    return thingAPI.remove(HOST_IP, version, accessKey, thingId);
                })
                .then((resp) => {
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        }
    });
});