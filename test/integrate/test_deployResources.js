process.env.NODE_ENV = 'test'
if (typeof process.env.KONG_URI === 'undefined') {
    process.env.KONG_URI = '172.17.28.252:8080/qiotapp';
}

var assert = require('assert');
var request = require('supertest');
var Q = require('q');

var app = require('../../server.js');
var appAPI = require('../../lib/qiotMgt/app');
var certAPI = require('../../lib/qiotMgt/cert');
var errorCode = require('../../lib/qiotError/errorCode');
var errorBodyChecker = require('../utils/errorBodyChecker');
var thingAPI = require('../../lib/qiotMgt/thing');
var userAPI = require('../../lib/qiotMgt/user');

var appid;
var thingId;
var latestActiveCertId;
var version = 'v1';
var accessKey = 'accessKey';
var qiotLoginName = 'admin';
var qiotLoginPwd = '1234qwer';
var hostname = '172.17.28.252';
var username = 'admin';
var password = '1234qwer';
var HOST_IP = `http://${process.env.KONG_URI}`;
var recoverAfterTest = true;

describe('POST /api/:thingid/resources', function() {
    this.timeout(20000);

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
                if (!thingId) {
                    done(new Error('thingId can not be empty'));
                } else {
                    return thingAPI.createResource(HOST_IP, version, accessKey, thingId, 'temp');
                }
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
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        }
    });

    describe('Deploy mqtt resources', function() {
        it('should respond 200 with json', function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'protocol': 'mqtt',
                'resourceinfoFolderPath': `/share/Public/qiot-integrate-test/deploySampleFunc/mqtt/bundle/res`
            };
            request(app)
                .post(`/api/${thingId}/resources`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                        'res body should contain resourceinfo');
                    assert.equal(typeof res.body.result.certificates, 'undefined',
                        'res body should not contain certificates for non mqtts protocol');
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

    describe('Deploy http resources', function() {
        it('should respond 200 with json', function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'protocol': 'http',
                'resourceinfoFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/http/bundle/res'
            };
            request(app)
                .post(`/api/${thingId}/resources`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                        'res body should contain resourceinfo');
                    assert.equal(typeof res.body.result.certificates, 'undefined',
                        'res body should not contain certificates for non mqtts protocol');
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

    describe('Deploy https resources', function() {
        it('should respond 200 with json', function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'protocol': 'https',
                'resourceinfoFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/https/bundle/res'
            };
            request(app)
                .post(`/api/${thingId}/resources`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                        'res body should contain resourceinfo');
                    assert.equal(typeof res.body.result.certificates, 'undefined',
                        'res body should not contain certificates for non mqtts protocol');
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

    describe('Deploy coap resources', function() {
        it('should respond 200 with json', function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'protocol': 'coap',
                'resourceinfoFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/coap/bundle/res'
            };
            request(app)
                .post(`/api/${thingId}/resources`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send(requestBody)
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                        'res body should contain resourceinfo');
                    assert.equal(typeof res.body.result.certificates, 'undefined',
                        'res body should not contain certificates for non mqtts protocol');
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

    describe('Deploy mqtts resources', function() {
        before(function(done) {
            certAPI.create(HOST_IP, version, accessKey, thingId)
                .then(resp => {
                    latestActiveCertId = resp.result.id;
                    done();
                })
                .catch(err => {
                    done(err);
                });
        });

        describe('Deploy resources with existing certificate', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'protocol': 'mqtts',
                    'resourceinfoFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/mqtts/bundle/res',
                    'certFolderPath': `/home/${username}/bundle/ssl/`,
                    'autoGenerateCert': 'false'
                };
                request(app)
                    .post(`/api/${thingId}/resources`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                            'res body should contain resourceinfo');
                        assert.notEqual(typeof res.body.result.certificates, 'undefined',
                            'res body should contain certificates for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.location, 'undefined',
                            'res body should contain certificate location for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.caCert, 'undefined',
                            'res body should contain caCert for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.clientCert, 'undefined',
                            'res body should contain clientCert for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.privateCert, 'undefined',
                            'res body should contain privateCert for mqtts protocol');
                        var certId = res.body.result.certificates.id;
                        assert.notEqual(typeof certId, 'undefined',
                            'res body should contain certificateId for mqtts protocol');
                        assert.equal(certId, latestActiveCertId,
                            `mismatched certId, expected: ${latestActiveCertId}, actual: ${certId}`);
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

        describe('Deploy resources with new certificate', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'protocol': 'mqtts',
                    'resourceinfoFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/mqtts/bundle/res',
                    'certFolderPath': '/share/Public/qiot-integrate-test/deploySampleFunc/mqtts/bundle/ssl',
                    'autoGenerateCert': 'true'
                };
                request(app)
                    .post(`/api/${thingId}/resources`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.resourceinfo, 'undefined',
                            'res body should contain resourceinfo');
                        assert.notEqual(typeof res.body.result.certificates, 'undefined',
                            'res body should contain certificates for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.location, 'undefined',
                            'res body should contain certificate location for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.caCert, 'undefined',
                            'res body should contain caCert for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.clientCert, 'undefined',
                            'res body should contain clientCert for mqtts protocol');
                        assert.notEqual(typeof res.body.result.certificates.privateCert, 'undefined',
                            'res body should contain privateCert for mqtts protocol');
                        var certId = res.body.result.certificates.id;
                        assert.notEqual(typeof certId, 'undefined',
                            'res body should contain certificateId for mqtts protocol');
                        assert.notEqual(certId, latestActiveCertId, 'certId should not equal to existing certId');
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

    describe('Deploy resources w/o request body', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            var requestBody = {};
            request(app)
                .post(`/api/${thingId}/resources`)
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

    describe('Deploy cert file w/ bad password', function() {
        it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': 'badpassword',
                'protocol': 'mqtt',
                'resourceinfoFolderPath': `/home/${username}/bundle/res/mqtt`
            };
            request(app)
                .post(`/api/${thingId}/resources`)
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

    describe('Deploy cert file w/ bad hostname', function() {
        it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
            this.timeout(60000);
            var requestBody = {
                'hostname': 'badhostname',
                'username': username,
                'password': password,
                'protocol': 'mqtt',
                'resourceinfoFolderPath': `/home/${username}/bundle/res/mqtt`
            };
            request(app)
                .post(`/api/${thingId}/resources`)
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

    describe('Deploy resources w/ invalid protocol', function() {
        it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
            var requestBody = {
                'hostname': hostname,
                'username': username,
                'password': password,
                'protocol': 'invalid',
                'resourceinfoFolderPath': `/home/${username}/bundle/res/invalid`
            };
            request(app)
                .post(`/api/${thingId}/resources`)
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
