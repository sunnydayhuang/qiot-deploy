var Joi = require('joi');

module.exports.sampleCodeType = ['python-arduino', 'nodejs-raspberry', 'nodejs-edison', 'python-linkit'];

module.exports.connect = {
    deviceConnect: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        thingId: Joi.string().optional()
    }),
    saveConnectionInfo: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required()
    })
};

module.exports.sampleCode = {
    originalDeploy: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        thingId: Joi.string().required(),
        thingname: Joi.string().optional(),
        sdk: Joi.string().optional(),
        mqttType: Joi.string().optional(),
        thingType: Joi.string().optional()
    }),
    deploy: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        folderPath: Joi.string().required(),
        protocol: Joi.string().required().valid('mqtt', 'mqtts', 'http', 'https', 'coap'),
        sampleCodeType: Joi.string().required().valid(exports.sampleCodeType)
    })
};

module.exports.userCode = {
    createFunction: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        folderPath: Joi.string().required(),
        functionName: Joi.string().required().regex(/^[a-zA-Z0-9-_]{1,64}$/),
        zipFile: Joi.string().optional(),
        cachedCodePath: Joi.string().optional()
    })
};

module.exports.resource = {
    createResources: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        protocol: Joi.string().required().valid('mqtt', 'mqtts', 'http', 'https', 'coap'),
        resourceinfoFolderPath: Joi.string().required(),
        certFolderPath: Joi.string()
            .when('protocol', { is: 'mqtts', then: Joi.required() }),
        autoGenerateCert: Joi.boolean()
            .when('protocol', { is: 'mqtts', then: Joi.required() })
    })
};
module.exports.execution = {
    execute: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required(),
        command: Joi.string().required(),
        stderr: Joi.boolean().required(),
        stdout: Joi.boolean().required()
    }),
    getData: Joi.object().keys({
        hostname: Joi.string().required(),
        username: Joi.string().required(),
        password: Joi.string().required()
    })
};
