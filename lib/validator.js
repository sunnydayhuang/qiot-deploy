var Joi = require('joi');
var _ = require('lodash');

var QiotError = require('./qiotError');
var errorCode = require('./qiotError/errorCode');

module.exports.validate = function (schema) {
    return function (req, res, next) {
        // var body = _.extend({}, req.body);
        var body = req.body;

        Joi.validate(body, schema, {abortEarly: false}, function (err, schemaResult) {
            if (err) {
                var errMessages = [];
                err.details.forEach(function (d) {
                    errMessages.push(d.message);
                });
                var message = `validation on request body failed: ${errMessages.join(',')}`;
                var qError = new QiotError(err, message.replace(/"/g, '\''), errorCode.INVALID_BODY);
                return res.status(400).send(qError.toJson());
            }

            req.schema = schemaResult;
            return next();
        });
    }
};
