function QiotError (error, message, qiotErrCode) {
    message = message || error.message || qiotErrCode.message || 'unknown error';
    var code = qiotErrCode.code || error.code;
    var status = qiotErrCode.status || 500;
    this.message = message;
    this.code = code;
    this.stack = {};
    if (error) {
        this.stack = error.stack;
    }
    this.status = status;
}

QiotError.prototype = new Error();
QiotError.prototype.name = 'QiotError';
QiotError.prototype.constructor = QiotError;
QiotError.prototype.toJson = function() {
    return {
        'error': [{
            'message': this.message,
            'code': this.code
        }]
    };
};

module.exports = QiotError;
