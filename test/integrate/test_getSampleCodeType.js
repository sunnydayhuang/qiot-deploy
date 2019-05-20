process.env.NODE_ENV = 'test';
if (typeof process.env.KONG_URI === 'undefined') {
    process.env.KONG_URI = '172.17.28.252:8080/qiotapp';
}

var assert = require('assert');
var request = require('supertest');
var app = require('../../server.js');
var accessKey = 'accessKey';
describe('GET /v1/deploy/sampleCodeType?thingType', function() {
    this.timeout(40000);
    describe('arduino', function() {
        it('If thingType = arduino,should return default sample code type = python-arduino', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'arduino' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-arduino', 'default type should be "python-arduino"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
        it('If thingType = Arduino,should return default sample code type = python-arduino', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'Arduino' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-arduino', 'default type should be "python-arduino"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
    });
    describe('Raspberry Pi', function() {
        it('If thingType = Raspberry Pi, should return default sample code type = nodejs-raspberry', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'Raspberry Pi' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'nodejs-raspberry', 'default type should be "nodejs-raspberry"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
        it('If thingType = raspberry pi, should return default sample code type = nodejs-raspberry', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'raspberry pi' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'nodejs-raspberry', 'default type should be "nodejs-raspberry"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
    });
    describe('Intel Edison', function() {
        it('If thingType = Intel Edison,should return default sample code type = nodejs-edison', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'Intel Edison' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'nodejs-edison', 'default type should be "nodejs-edison"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
        it('If thingType = intel edison,should return default sample code type = nodejs-edison', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'intel edison' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'nodejs-edison', 'default type should be "nodejs-edison"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
    });
    describe('LinkIt Smart 7688 Duo', function() {
        it('If thingType = LinkIt Smart 7688 Duo, should return default sample code type = python-linkit', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'LinkIt Smart 7688 Duo' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-linkit', 'default type should be "python-linkit"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
        it('If thingType = linkIt smart 7688 Duo,should return default sample code type = python-linkit', function(done) {
            request(app)
                .get('/api/sampleCodeType')
                .query({ thingType: 'linkIt smart 7688 Duo' })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-linkit', 'default type should be "python-linkit"');
                })
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        done();
                    }
                });
        })
    });
    describe('If without thingType ', function() {
        it('default type should be "python-arduino"', function(done) {
            request(app)
                .get(`/api/sampleCodeType`)
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-arduino', 'default type should be "python-arduino"');
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
    describe('If thingType = randomvalue ', function() {
        it('default type should be "python-arduino"', function(done) {
            request(app)
                .get(`/api/sampleCodeType`)
                .query({ thingType: Math.random() })
                .set('Content-Type', 'application/json')
                .set('Access-Token', accessKey)
                .send()
                .expect(200)
                .expect('Content-Type', /json/)
                .expect(function(res) {
                    assert.notEqual(typeof res.body.result, 'undefined', 'res body should contain result');
                    assert.notEqual(typeof res.body.result.SampleCodeType, 'undefined', 'res body should contain SampleCodeType');
                    assert.notEqual(typeof res.body.result.default, 'undefined', 'res body should contain default');
                    assert.equal(res.body.result.default, 'python-arduino', 'default type should be "python-arduino"');
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