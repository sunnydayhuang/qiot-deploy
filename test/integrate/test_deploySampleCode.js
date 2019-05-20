process.env.NODE_ENV = 'test';
if (typeof process.env.KONG_URI === 'undefined') {
    process.env.KONG_URI = '172.17.28.252:8080/qiotapp';
}

var assert = require('assert');
var exec = require('child_process').exec;
var request = require('supertest');
var Q = require('q');

var app = require('../../server.js');

var apiSchema = require('../../lib/apiSchema');
var appAPI = require('../../lib/qiotMgt/app');
var errorCode = require('../../lib/qiotError/errorCode');
var errorBodyChecker = require('../utils/errorBodyChecker');
var thingAPI = require('../../lib/qiotMgt/thing');
var userAPI = require('../../lib/qiotMgt/user');

var appid;
var thingId;
var notypeThingId;
var version = 'v1';
var accessKey = 'accessKey';
var qiotLoginName = 'admin';
var qiotLoginPwd = '1234qwer';
var hostname = '172.17.28.252';
var username = 'admin';
var password = '1234qwer';
var HOST_IP = `http://${process.env.KONG_URI}`;
var recoverAfterTest = true;

describe('POST /api/:thingId/sampleCode', function() {
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
                    return Q.promise(function(resolve, reject, notify) {
                        exec(`rm -rf ./functions/${thingId}`, function(error, stdout, stderr) {
                            if (error) {
                                reject(error);
                            }
                            resolve(stdout);
                        });
                    });
                })
                .then((resp) => {
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        }
    });

    describe('Deploy sample code by sampleCodeType', function() {
        var sampleCodeTypeList = apiSchema.sampleCodeType;
        for (var i = 0; i < sampleCodeTypeList.length; i++) {
            var type = sampleCodeTypeList[i];
            describe(`Deploy w/ ${type}`, function() {
                sampleCodeTypeTest(type);
            });
        }
    });

    function sampleCodeTypeTest(type) {
        it('should respond 200 with json', function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'folderPath': `/share/Public/qiot-integrate-test/deploySampleFunc/${type}`,
                'protocol': 'mqtts',
                'sampleCodeType': type
            };

            request(app)
                .post(`/api/${thingId}/sampleCode`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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
    }

    describe('Deploy sample code by connection protocol', function() {
        describe('Deploy w/ mqtts connection', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/mqtts',
                    'protocol': 'mqtts',
                    'sampleCodeType': 'python-arduino'
                };

                request(app)
                    .post(`/api/${thingId}/sampleCode`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

        describe('Deploy w/ mqtt connection', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/mqtt',
                    'protocol': 'mqtt',
                    'sampleCodeType': 'python-arduino'
                };

                request(app)
                    .post(`/api/${thingId}/sampleCode`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

        describe('Deploy w/ https connection', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/https',
                    'protocol': 'https',
                    'sampleCodeType': 'python-arduino'
                };

                request(app)
                    .post(`/api/${thingId}/sampleCode`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

        describe('Deploy w/ http connection', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/http',
                    'protocol': 'http',
                    'sampleCodeType': 'python-arduino'
                };

                request(app)
                    .post(`/api/${thingId}/sampleCode`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

        describe('Deploy w/ coap connection', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/coap',
                    'protocol': 'coap',
                    'sampleCodeType': 'python-arduino'
                };

                request(app)
                    .post(`/api/${thingId}/sampleCode`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

    describe('Deploy sample code w/ invalid protocol', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/coap',
                'protocol': 'nonexistprotocol',
                'sampleCodeType': 'python-arduino'
            };

            request(app)
                .post(`/api/${thingId}/sampleCode`)
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

    describe('Deploy sample-sdk function w/ invalid sampleCodeType', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/coap',
                'protocol': 'mqtt',
                'sampleCodeType': 'nonexisttype'
            };

            request(app)
                .post(`/api/${thingId}/sampleCode`)
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

    describe('Deploy sample-sdk function w/ bad password', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': 'badpassword',
                'folderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/coap',
                'protocol': 'mqtt',
                'sampleCodeType': 'python-arduino'
            };

            request(app)
                .post(`/api/${thingId}/sampleCode`)
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

    describe('Deploy sample-sdk function w/o requestBody', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            request(app)
                .post(`/api/${thingId}/sampleCode`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
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

describe('POST /api/deploy', function() {
    this.timeout(60000);
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
                return thingAPI.createWithNoType(HOST_IP, version, accessKey, appid,
                    'integratetest' + new Date().toISOString().replace(/T|Z|:|\.|-/g, ''));
            })
            .then((resp) => {
                notypeThingId = resp.result.thingId;
                return thingAPI.createResource(HOST_IP, version, accessKey, notypeThingId, 'temp');
            })
            .then((resp) => {
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
            // remove app and thing
            appAPI.remove(HOST_IP, version, accessKey, appid)
                .then((resp) => {
                    return thingAPI.remove(HOST_IP, version, accessKey, thingId);
                })
                .then((resp) => {
                    return thingAPI.remove(HOST_IP, version, accessKey, notypeThingId);
                })
                .then((resp) => {
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        }
    });

    describe('Deploy sample-sdk function', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(60000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'thingId': thingId
            };

            request(app)
                .post('/api/deploy')
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

    describe('Deploy sample-sdk function for "No type" thing', function() {
        it('should respond 200 with json', function(done) {
            this.timeout(60000);
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'thingId': notypeThingId
            };

            request(app)
                .post('/api/deploy')
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
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

    describe('Deploy sample-sdk function w/o requestBody', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            request(app)
                .post('/api/deploy')
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
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