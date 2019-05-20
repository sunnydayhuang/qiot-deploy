var templateAPI = require('./template');

exports.create = function(endpoint, version, accessKey, name) {
    var action = 'create application';
    var url = `${endpoint}/${version}/iotapp/`;
    var requestBody = {
        'appname': name,
        'description': '',
        'rulesdata': {
            'ruleName': name,
            'freeboardName': name
        }
    };
    return templateAPI.requestPost(url, accessKey, action, requestBody);
};

exports.remove = function(endpoint, version, accessKey, appid) {
    var action = 'remove application';
    var url = `${endpoint}/${version}/iotapp/multidelete/`;
    var requestBody = [ appid ];
    return templateAPI.requestDelete(url, accessKey, action, requestBody);
};
