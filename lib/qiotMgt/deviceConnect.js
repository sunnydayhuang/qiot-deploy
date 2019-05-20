var templateAPI = require('./template');

exports.getConnection = function(endpoint, version, accessKey, thingId, protocol, certificateid) {
    var action = `get ${protocol} connection`;
    var url = `${endpoint}/${version}/things/${thingId}/${protocol}connect/`;
    if (protocol === 'mqtts') {
        if (!certificateid) {
            throw new Error('certificateid not defined');
        }
        url = `${endpoint}/${version}/things/certificates/${certificateid}/`;
    }
    return templateAPI.requestGet(url, accessKey, action);
};
