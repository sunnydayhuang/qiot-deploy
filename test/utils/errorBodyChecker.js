var assert = require('assert');

module.exports.check = function(res, errorCode) {
    assert.equal(res.statusCode, errorCode.status,
        `Mismatched staus code, expected: ${errorCode.status}, actual: ${res.statusCode}`);
    assert.equal(Array.isArray(res.body.error), true, 'error should be in array form');
    assert.equal(res.body.error.length > 0, true, 'error arrary should not be empty');
    assert.notEqual(typeof res.body.error[0].message, 'undefined', 'error arrary should contain message');
    assert.notEqual(typeof res.body.error[0].code, 'undefined', 'error code should not be empty');
    assert.equal(res.body.error[0].code, errorCode.code,
        `Mismatched error code, expected: ${errorCode.code}, actual: ${res.body.error[0].code}`);
}
