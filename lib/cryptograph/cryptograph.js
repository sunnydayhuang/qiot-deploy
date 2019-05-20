var crypto = require('crypto');

module.exports.aesEncrypt = function(text, password) {
    var cryptkey = crypto.createHash('sha256').update(password).digest();
    var encipher = crypto.createCipheriv('aes-256-cbc', cryptkey, '39cd5f7b63ed1ff8');
    var encryptdata = encipher.update(text, 'utf8', 'binary');
    encryptdata += encipher.final('binary');
    var encodeEncryptdata = Buffer.from(encryptdata, 'binary').toString('base64');
    return encodeEncryptdata;
}

module.exports.aesDecrypt = function(encryptData, password) {
    encryptData = Buffer.from(encryptData, 'base64').toString('binary');
    var cryptkey = crypto.createHash('sha256').update(password).digest();
    var decipher = crypto.createDecipheriv('aes-256-cbc', cryptkey, '39cd5f7b63ed1ff8');
    var decoded = decipher.update(encryptData, 'binary', 'utf8');
    decoded += decipher.final('utf8');
    return decoded;
}
