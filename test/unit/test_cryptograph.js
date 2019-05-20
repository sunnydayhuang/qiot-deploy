process.env.NODE_ENV = 'test';

var assert = require('assert');
var crypto = require('crypto');
var cryptograph = require('../../lib/cryptograph');

describe('encrypt text with aes 256', function() {
    it('should be able to decrypt', function(done) {
        crypto.randomBytes(16, function(err, buffer) {
            var text = buffer.toString('hex');
            crypto.randomBytes(16, function(err, buffer) {
                var password = buffer.toString('hex');
                var encryptData = cryptograph.aesEncrypt(text, password);
                var decryptData = cryptograph.aesDecrypt(encryptData, password);
                assert.equal(text, decryptData, 'decryptData should equal to the original text');
                done();
            });
        });
    });
});