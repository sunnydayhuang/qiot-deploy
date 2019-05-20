process.env.NODE_ENV = 'test';
if (typeof process.env.KONG_URI === 'undefined') {
    process.env.KONG_URI = '172.17.28.252:8080/qiotapp';
}

var assert = require('assert');
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('supertest');
var Q = require('q');

var app = require('../../server.js');
var appAPI = require('../../lib/qiotMgt/app');
var errorCode = require('../../lib/qiotError/errorCode');
var errorBodyChecker = require('../utils/errorBodyChecker');
var fsExt = require('../../lib/fsExt');
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
var downaload45MBFileUrl = 'http://172.17.28.147:8080/share.cgi?ssid=0Yligq4&fid=0Yligq4&filename=45MB.zip&openfolder=forcedownload&ep=';
var downaload60MBFileUrl = 'http://172.17.28.147:8080/share.cgi?ssid=0TpQygx&fid=0TpQygx&filename=63MB.zip&openfolder=forcedownload&ep=';
var base64EncodedLargeFile;
var recoverAfterTest = true;

describe('Deploy new function', function() {
    describe('PUT /api/:thingId/functions/:functionId', function() {
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

        describe('Deploy function', function() {
            it('should respond 200 with json', function(done) {
                var functionName = 'functionDeploy';
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'functionName': functionName,
                    'zipFile': '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'
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
                        assert.notEqual(typeof res.body.result.cachedCodePath, 'undefined',
                            'res body should contain cachedCodePath');
                        assert.notEqual(typeof res.body.result.downloadUrl, 'undefined',
                            'res body should contain downloadUrl');
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

        describe('Deploy new function again', function() {
            it('should respond 200 with json', function(done) {
                var functionName = 'functionDeploy';
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'functionName': functionName,
                    'zipFile': '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'
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
                        assert.notEqual(typeof res.body.result.cachedCodePath, 'undefined',
                            'res body should contain cachedCodePath');
                        assert.notEqual(typeof res.body.result.downloadUrl, 'undefined',
                            'res body should contain downloadUrl');
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

        describe('Deploy function w/ 45MB zip file', function() {
            before(function(done) {
                fsExt.downloadFile(downaload45MBFileUrl, '/tmp/45MB.zip')
                    .then(resp => {
                        // read file and transfer to base64 encoded
                        fs.readFile('/tmp/45MB.zip', function(err, data) {
                            if (err) {
                                done(err);
                            } else {
                                base64EncodedLargeFile = data.toString('base64');
                                done();
                            }
                        });
                    })
            });

            it('should respond 200 with json', function(done) {
                var functionName = '45MBfunctionDeploy';
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'functionName': functionName,
                    'zipFile': base64EncodedLargeFile
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
                        assert.notEqual(typeof res.body.result.cachedCodePath, 'undefined',
                            'res body should contain cachedCodePath');
                        assert.notEqual(typeof res.body.result.downloadUrl, 'undefined',
                            'res body should contain downloadUrl');
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

        describe('Deploy function w/ 60MB zip file', function() {
            before(function(done) {
                fsExt.downloadFile(downaload60MBFileUrl, '/tmp/60MB.zip')
                    .then(resp => {
                        // read file and transfer to base64 encoded
                        fs.readFile('/tmp/60MB.zip', function(err, data) {
                            if (err) {
                                done(err);
                            } else {
                                base64EncodedLargeFile = data.toString('base64');
                                done();
                            }
                        });
                    })
            });

            it('should respond 413 Request entity too large', function(done) {
                var functionName = '60MBfunctionDeploy';
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'functionName': functionName,
                    'zipFile': base64EncodedLargeFile
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(413)
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

        describe('Deploy function w/o requestBody', function() {
            it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
                var requestBody = {};
                var functionId = 'invalidTest';
                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
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

        describe('Deploy function w/ bad password', function() {
            it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
                var functionName = new Date().toISOString().replace(/T|Z|:|\.|-/g, '');
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': 'badpassword',
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'zipFile': 'zipFile',
                    'functionName': functionName
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
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

        describe('Deploy function w/ non-base64 zipFile string', function() {
            it(`should respond ${errorCode.DEVICE_DEPLOY_CODE_ERROR.status} with json`, function(done) {
                var functionName = new Date().toISOString().replace(/T|Z|:|\.|-/g, '');
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'zipFile': 'zipFile',
                    'functionName': functionName
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.DEVICE_DEPLOY_CODE_ERROR);
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

        describe('Deploy function w/ bad zipFile string', function() {
            it(`should respond ${errorCode.DEVICE_DEPLOY_CODE_ERROR.status} with json`, function(done) {
                var functionName = new Date().toISOString().replace(/T|Z|:|\.|-/g, '');
                var functionId = functionName;
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/deployCustomFunc',
                    'zipFile': 'MTIz',
                    'functionName': functionName
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.DEVICE_DEPLOY_CODE_ERROR);
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
});

describe('Re-deploy function', function() {
    describe('PUT /api/:thingId/function/:functionId', function() {
        this.timeout(40000);
        var functionName = new Date().toISOString().replace(/T|Z|:|\.|-/g, '');
        var functionId = functionName;
        var cachedCodePath;

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
                    // create & deploy function
                    request(app)
                        .put(`/api/${thingId}/functions/${functionId}`)
                        .set('Content-Type', 'application/json')
                        .set('Access-Token', accessKey)
                        .send({
                            'hostname': hostname,
                            'username': username,
                            'password': password,
                            'folderPath': '/tmp/qiot-integrate-test/re-deployCustomFunc/init',
                            'zipFile': 'UEsDBBQAAAAIADeI10qEWJDgrQAAACYBAAAMAAAAcGFja2FnZS5qc29uXdCxDoIwEAbgnae4dGAyDRBdWNXB2ZWYNOUMl0hb2kpMDO9uW0CM6/df/2v7zgCYEj2yGthA2rNdlBGtI60ilrzgxawtOmnJ+CVZ0aBqUUlCFzQWBpVamDhzK3i1ng/cCysWLvn+q4P3SSt+CLMBp6V6PP21z8F8jZ91Hl1qQNlpaNjZWm1rUBpiAM6gpDth2zDIc8AXeSi3NeLpO223Fz1IonLpRy7XI8um7ANQSwMEFAAAAAgAN4jXSutCH2oyAgAAEAUAAAcAAABtcXR0LmpzjVPLbtswELzrKwa+WHJs0Tn0YiOXopcADYIkvhVFQUt0zJYPmaSSGob/pd/SL+tSD1dxErQ8SLvk7uzODskmkwQTAKut9PBcV0qgsKVAKbSF46a0GqbWa+HwxFUt4IUpESzuru0KD7UMAp/jZ73Hzd1qhcrZYAurWlwndrV0QgsTFu3ObAZTaUjjA1cKXVhtqKzWVG8BE+vrXQj5d0/HLEmeuMNO2oCrHjAd50zJNYu742yZJB2TBxHqiqCMEUWQ1sBW8dfiRJjB0RWMeG5w0/jJ+87zyCNbnoV/s1WX9Xcvd4KX98Lb2hVNS0545jpfmo0lBtaMp6Aj7xVrOt3Upq3/KMJ9M+BrE1ItzRSa/8xwSNAMLtTO4IaHbb5R1rq0MVtF0oyophSNGSgRF7jMMlxEe5kcB8MgqUoe+Bt65TGAmARSBnaDd3qPUYdWIyDP894c9ZF+tMCXfjeuw9A5TzutU74sCWAUhK5G09dRwVayiAFRIBa20jx6xkviyfi6iIu9k3pe9HjyvjbWsbkRAymtScedS4L1IqVxfL0mXgSSSjh6COkpgA5//0qSvg5jWN1+ul1gb2uab61KkrJSvBAdy/hQuNmjHwBkGYGxsU6fi3RCHfRZ1Wsl/fbj/rpMu7m9vEnzKT7Ms2z5oifr0CViPajdzPe/en8tgCglXRD2gtQq4r1JBUr+EHSilH0mkGHNt8g1QOk/qr5HvNF7isv5fE7eMY5iUKMz01dPm+L+AFBLAQIfABQAAAAIADeI10qEWJDgrQAAACYBAAAMACQAAAAAAAAAIAAAAAAAAABwYWNrYWdlLmpzb24KACAAAAAAAAEAGACAD9ZX/+vSAYAP1lf/69IBbfK4vP/r0gFQSwECHwAUAAAACAA3iNdK60IfajICAAAQBQAABwAkAAAAAAAAACAAAADXAAAAbXF0dC5qcwoAIAAAAAAAAQAYAIAP1lf/69IBgA/WV//r0gE/zLi8/+vSAVBLBQYAAAAAAgACALcAAAAuAwAAAAA=',
                            'functionName': functionName
                        })
                        .expect(200)
                        .expect('Content-Type', /json/)
                        .end(function(err, res) {
                            if (err) {
                                throw err;
                            }
                            cachedCodePath = res.body.cachedCodePath;
                            done();
                        });
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

        describe('Re-deploy existing function', function() {
            it('should respond 200 with json', function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/re-deployCustomFunc/redploy',
                    'functionName': functionName,
                    'cachedCodePath': cachedCodePath
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .expect(function(res) {
                        assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                        assert.notEqual(typeof res.body.result.codepath, 'undefined', 'res body should contain codepath');
                        assert.notEqual(typeof res.body.result.cachedCodePath, 'undefined',
                            'res body should contain cachedCodePath');
                        assert.notEqual(typeof res.body.result.downloadUrl, 'undefined',
                            'res body should contain downloadUrl');
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

        describe('Re-deploy function w/ bad cachedCodePath', function() {
            it(`should respond ${errorCode.FUNCTION_NOT_FOUND.status} with json`, function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/re-deployCustomFunc/redploy',
                    'functionName': functionName,
                    'cachedCodePath': '/tmp/test'
                };

                request(app)
                    .put(`/api/${thingId}/functions/notExistFunc`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.FUNCTION_NOT_FOUND);
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

        describe('Re-deploy non-exist function', function() {
            it(`should respond ${errorCode.FUNCTION_NOT_FOUND.status} with json`, function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': password,
                    'folderPath': '/tmp/qiot-integrate-test/re-deployCustomFunc/redploy',
                    'functionName': functionName
                };

                request(app)
                    .put(`/api/${thingId}/functions/notExistFunc`)
                    .set('Content-Type', 'application/json')
                    .set('Access-Token', accessKey)
                    .send(requestBody)
                    .expect(function(res) {
                        errorBodyChecker.check(res, errorCode.FUNCTION_NOT_FOUND);
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

        describe('Re-deploy function w/o requestBody', function() {
            it(`should respond ${errorCode.INVALID_BODY.status} with json`, function(done) {
                var requestBody = {};
                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
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

        describe('Re-deploy function w/ bad password', function() {
            it(`should respond ${errorCode.DEVICE_ERROR.status} with json`, function(done) {
                var requestBody = {
                    'hostname': hostname,
                    'username': username,
                    'password': 'badpassword',
                    'folderPath': '/tmp/qiot-integrate-test/re-deployCustomFunc/redploy',
                    'functionName': functionName
                };

                request(app)
                    .put(`/api/${thingId}/functions/${functionId}`)
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
    });
});