var QiotError = require('./qiotError');

module.exports.json = function(res, err, errCode) {
    if (err instanceof QiotError) {
        res.statusCode = err.status;
        return res.json(err.toJson());
    } else {
        res.statusCode = errCode.status;
        return res.json({
            'error': [{
                'message': err.message,
                'code': errCode.code
            }]
        });
    }
};
