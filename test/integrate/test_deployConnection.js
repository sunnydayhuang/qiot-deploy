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
var version = 'v1';
var accessKey = 'accessKey';
var qiotLoginName = 'admin';
var qiotLoginPwd = '1234qwer';
var hostname = '172.17.28.252';
var username = 'admin';
var password = '1234qwer';
var HOST_IP = `http://${process.env.KONG_URI}`;
var recoverAfterTest = true;

describe('POST /api/:thingId/connect', function() {
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
                    }, 3000);
                });
            })
            .then((resp) => {
                appid = resp.result.id;
                return Q.promise(function(resolve, reject, notify) {
                    setTimeout(function() {
                        resolve(thingAPI.create(HOST_IP, version, accessKey, appid,
                            'integratetest' + new Date().toISOString().replace(/T|Z|:|\.|-/g, '')));
                    }, 3000);
                });
            })
            .then((resp) => {
                thingId = resp.result.thingId;
                done();
            })
            .catch((err) => {
                done(err);
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

    describe('Connect to remote device with thingId by SSH', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(10000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/${thingId}/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/ bad password', function() {
        it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
            this.timeout(20000);
            var requestBody = {
                'hostname': 'badhostname',
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/${thingId}/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    errorBodyChecker.check(res, errorCode.DEVICE_ERROR);
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/ bad hostname', function() {
        it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
            this.timeout(20000);
            var requestBody = {
                'hostname': 'badhostname',
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/${thingId}/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    errorBodyChecker.check(res, errorCode.DEVICE_ERROR);
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/o requestBody', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            this.timeout(10000);
            var requestBody = {};
            request(app)
                .post(`/api/${thingId}/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    errorBodyChecker.check(res, errorCode.INVALID_BODY);
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });
});

// connect API with older version
describe('POST /api/connect', function() {
    describe('Connect to remote device by SSH', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(10000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/ bad password', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(10000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/ bad hostname', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(10000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Connect to remote device w/o requestBody', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            this.timeout(10000);
            var requestBody = {};
            request(app)
                .post(`/api/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    errorBodyChecker.check(res, errorCode.INVALID_BODY);
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });
});

describe('POST /api/:thingId/connectionInfo', function() {
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
                    }, 3000);
                });
            })
            .then((resp) => {
                appid = resp.result.id;
                return Q.promise(function(resolve, reject, notify) {
                    setTimeout(function() {
                        resolve(thingAPI.create(HOST_IP, version, accessKey, appid,
                            'integratetest' + new Date().toISOString().replace(/T|Z|:|\.|-/g, '')));
                    }, 3000);
                });
            })
            .then((resp) => {
                thingId = resp.result.thingId;
                done();
            })
            .catch((err) => {
                done(err);
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

    describe('update connectionInfo', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(10000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password
            };
            request(app)
                .post(`/api/${thingId}/connectionInfo`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.status, 'undefined', 'res body should contain status');
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });

    describe('Update connectionInfo w/o requestBody', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            this.timeout(10000);
            var requestBody = {};
            request(app)
                .post(`/api/connect`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    errorBodyChecker.check(res, errorCode.INVALID_BODY);
                })
                .end(function(err, res) {
                    if (err) {
                        if (res.body) {
                            err.message = `${err.message}, responseBody: ${JSON.stringify(res.body)}`;
                        }
                        done(err);
                    } else {
                        done();
                    }
                });
        });
    });
});