var templateAPI = require('./template');
var _ = require('lodash');

exports.create = function(endpoint, version, accessKey, appid, name, thingtype) {
    var action = 'create thing';
    var url = `${endpoint}/${version}/things/`;
    var thingTypeId;
    if (thingtype === 'Raspberry Pi') {
        thingTypeId = '583ff407d2bb340006354cd8';
    } else if (thingtype === 'Intel Edison') {
        thingTypeId = '586b3ccfd5636e0007cc257a';
    } else {
        thingTypeId = '58182b5cfe5c6234200d1125';
    }
    var requestBody = {
        'description': '',
        'thingname': name,
        'thingtypeattributes': {
            'attributes': {},
            'thingtypeid': thingTypeId
        },
        'thingattributes': {},
        'type': 'QIoTSupported',
        'iotappid': appid
    };
    return templateAPI.requestPost(url, accessKey, action, requestBody);
};

exports.createWithNoType = function(endpoint, version, accessKey, appid, name) {
    var action = 'create thing';
    var url = `${endpoint}/${version}/things/`;
    var requestBody = {
        'description': '',
        'thingname': name,
        'thingtypeattributes': {
            'attributes': {},
            'thingtypeid': ''
        },
        'thingattributes': {},
        'type': 'Custom',
        'iotappid': appid
    };
    return templateAPI.requestPost(url, accessKey, action, requestBody);
};

exports.createResource = function(endpoint, version, accessKey, thingId, name) {
    var action = 'create thing resource';
    var url = `${endpoint}/${version}/things/resources/${thingId}/`;
    var resourceType = '582ebc5e67ad91000645dec2';
    var requestBody = {
        'description': '',
        'resourcetype': resourceType,
        'datatype': 'Float',
        'minvalue': '',
        'maxvalue': '',
        'default_value': '',
        'unit': '°C',
        'resourcename': name,
        'resourceid': name
    };
    return templateAPI.requestPost(url, accessKey, action, requestBody);
};

exports.getThingDetail = function(endpoint, version, accessKey, thingId) {
    var action = 'get thing detail';
    var url = `${endpoint}/${version}/things/${thingId}/`;
    return templateAPI.requestGet(url, accessKey, action);
};

exports.getThingTypeDetail = function(endpoint, version, accessKey, thingTypeId) {
    var action = 'get thingType detail';
    var url = `${endpoint}/${version}/thingstype/${thingTypeId}/`;
    return templateAPI.requestGet(url, accessKey, action);
};

exports.getThingTypeName = function(endpoint, version, accessKey, thingId) {
    return exports.getThingDetail(endpoint, version, accessKey, thingId)
        .then((response) => {
            if (!_.has(response.result, 'thingtypeattributes.thingtype')) {
                return 'None';
            }
            var thingTypeId = response.result.thingtypeattributes.thingtype;
            return exports.getThingTypeDetail(endpoint, version, accessKey, thingTypeId);
        })
        .then((resp) => {
            if (resp === 'None') {
                return resp;
            }
            if (!_.has(resp.result, 'thingtypename')) {
                throw new Error('thingtypename not found in the returned body');
            }
            return resp.result.thingtypename;
        })
        .catch((err) => {
            err.message = `get thingType name failed: ${err.message}`;
            throw err;
        })
}

exports.getSortedActiveCerts = function(endpoint, version, accessKey, thingId) {
    // sort by created_on filed in descending order
    var activeCerts = [];
    return exports.getThingDetail(endpoint, version, accessKey, thingId)
        .then(resp => {
            if (_.has(resp, 'result.certificates')) {
                var certificates = resp.result.certificates;
                activeCerts = certificates
                    .filter(cert => cert.is_active && !cert.is_revoked)
                    .sort(function(a, b) {
                        return new Date(b.created_on) - new Date(a.created_on);
                    });
            }
            return activeCerts;
        })
};

exports.remove = function(endpoint, version, accessKey, thingId) {
    var action = 'remove thing';
    var url = `${endpoint}/${version}/things/multidelete/`;
    var requestBody = [ thingId ];
    return templateAPI.requestDelete(url, accessKey, action, requestBody);
};

exports.updateConnectionInfo = function(endpoint, version, accessKey, thingId, connectionInfo) {
    var action = 'update thing connectionInfo';
    var url = `${endpoint}/${version}/things/${thingId}`;
    var requestBody = {
        'thingconnectioninfo': connectionInfo,
        'connection_status': true
    };
    return templateAPI.requestPatch(url, accessKey, action, requestBody);
};
